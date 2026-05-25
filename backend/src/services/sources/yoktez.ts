import { BaseSource, SearchResult } from './base';
import axios from 'axios';
import { generateMockArticles, generateMockAbstract } from '../gemini';
import * as cheerio from 'cheerio';

export class LimitedMap<K, V> extends Map<K, V> {
  private limit: number;
  constructor(limit: number = 500) {
    super();
    this.limit = limit;
  }
  set(key: K, value: V): this {
    super.set(key, value);
    if (this.size > this.limit) {
      const firstKey = this.keys().next().value;
      if (firstKey !== undefined) {
        this.delete(firstKey);
      }
    }
    return this;
  }
}

export const titleCache = new LimitedMap<string, string>(500);

export class YOKTezSource extends BaseSource {
  name = 'yoktez';

  async search(query: string, limit: number = 10, offset: number = 0): Promise<SearchResult[]> {
    try {
      const response = await axios.post('https://tez.yok.gov.tr/UlusalTezMerkezi/tarama.jsp', 
        new URLSearchParams({
          'durum': '1',
          'aramaTerimi': query,
          'aramaTuru': '1'
        }), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: 15000
        }
      );

      const html = response.data;
      const results: SearchResult[] = [];

      const $ = cheerio.load(html);
      $('tr').each((_, row) => {
        const cols = $(row).find('td');
        if (cols.length >= 4) {
          const id = $(cols[0]).text().trim();
          const title = $(cols[1]).text().trim();
          const author = $(cols[2]).text().trim();
          const year = $(cols[3]).text().trim();
          
          if (id && title && /^\d+$/.test(id)) {
            results.push({
              id,
              title,
              source: 'yoktez',
              pubDate: year,
              authors: [author].filter(Boolean),
              url: `https://tez.yok.gov.tr/UlusalTezMerkezi/tezDetay.jsp?id=${id}`
            });
            titleCache.set(id, title);
          }
        }
      });

      if (results.length > 0) {
        return results.slice(offset, offset + limit);
      }
      return [];
    } catch (err) {
      console.warn("YOK Tez Scraping failed. Returning empty results...", err);
      return [];
    }
  }

  async getAbstract(id: string): Promise<string> {
    try {
      const response = await axios.get(`https://tez.yok.gov.tr/UlusalTezMerkezi/tezDetay.jsp`, {
        params: { id },
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        timeout: 15000
      });
      const html = response.data;
      const $ = cheerio.load(html);
      let abstractText = '';
      
      $('td').each((_, el) => {
        const text = $(el).text().trim();
        if (text.startsWith('Özet') || text.startsWith('Abstract')) {
          const val = $(el).next('td').text().trim();
          if (val) {
            abstractText = val;
            return false;
          }
        }
      });
      
      if (!abstractText) {
        const bodyText = $('body').text() || $.text();
        const match = bodyText.match(/Özet:([\s\S]*?)(?:Abstract:|$)/i) || bodyText.match(/Abstract:([\s\S]*?)(?:Özet:|$)/i);
        if (match && match[1]) {
          abstractText = match[1].trim();
        }
      }

      if (abstractText) {
        return abstractText;
      }
      return '';
    } catch (err) {
      console.warn(`YOK Tez Abstract Scraping failed for ID ${id}. Returning empty string...`, err);
      return '';
    }
  }
}