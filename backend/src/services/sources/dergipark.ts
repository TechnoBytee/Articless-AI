import { BaseSource, SearchResult } from './base';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class DergiParkSource extends BaseSource {
  name = 'dergipark';

  async search(query: string, limit: number = 10, offset: number = 0): Promise<SearchResult[]> {
    try {
      // Use scraping since the public JSON API seems deprecated
      const response = await axios.get(`https://dergipark.org.tr/tr/search`, {
        params: { q: query, section: 'articles' },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 15000,
      });

      const results: SearchResult[] = [];
      const $ = cheerio.load(response.data);

      $('.card.article-card').each((_, element) => {
        const titleEl = $(element).find('.card-title a');
        const title = titleEl.text().trim();
        const url = titleEl.attr('href') || '';
        
        let id = '';
        const idMatch = url.match(/pub\/.*\/(\d+)$/);
        if (idMatch) id = idMatch[1];
        
        const authors: string[] = [];
        $(element).find('.article-authors a').each((_, a) => {
           authors.push($(a).text().trim());
        });

        const pubDate = $(element).find('.article-meta').text().trim() || '';

        if (id && title) {
          results.push({
            id,
            title,
            source: 'dergipark',
            pubDate,
            authors,
            url
          });
        }
      });

      return results.slice(offset, offset + limit);
    } catch (err) {
      console.warn("Dergipark Scrape failed:", err);
      return [];
    }
  }

  async getAbstract(id: string): Promise<string> {
    try {
      // Need to find the article URL first or assume a pattern
      // Dergipark redirects short IDs: https://dergipark.org.tr/tr/download/article-file/ID or tr/pub/issue/ID
      // A common shortcut is https://dergipark.org.tr/tr/pub/@/issue/@/${id}
      // Or we can try to search for the ID to get the full URL, but typically the article page is at:
      // However, scraping by ID directly is tough without the journal slug.
      // Assuming we can get it via the ID if we just search for it:
      const searchRes = await axios.get(`https://dergipark.org.tr/tr/search`, {
        params: { q: id, section: 'articles' },
        timeout: 10000
      });
      const $search = cheerio.load(searchRes.data);
      const url = $search('.card.article-card .card-title a').first().attr('href');
      
      if (url) {
         const articleRes = await axios.get(url, { timeout: 10000 });
         const $ = cheerio.load(articleRes.data);
         const abstract = $('.article-abstract').first().text().trim();
         return abstract || '';
      }
      return '';
    } catch (err) {
      console.warn(`Dergipark Abstract Scrape failed for ID ${id}`, err);
      return '';
    }
  }
}

