import { BaseSource, SearchResult } from './base';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';

const API_BASE = 'https://export.arxiv.org/api/query';

export class ArXivSource extends BaseSource {
  name = 'arxiv';

  async search(query: string, limit: number = 10, offset: number = 0): Promise<SearchResult[]> {
    const response = await axios.get(API_BASE, {
      params: {
        search_query: `all:${query}`,
        start: offset,
        max_results: Math.min(limit, 100),
      },
      timeout: 15000,
    });

    const parsed = await parseStringPromise(response.data, { explicitArray: false });
    const entries = parsed.feed.entry;
    const entryList = Array.isArray(entries) ? entries : (entries ? [entries] : []);

    return entryList.map((entry: any) => ({
      id: entry.id?.trim() || '',
      title: entry.title?.replace(/\s+/g, ' ').trim() || '',
      source: 'arxiv',
      pubDate: entry.published?.substring(0, 10) || '',
      authors: Array.isArray(entry.author)
        ? entry.author.map((a: any) => a.name)
        : entry.author ? [entry.author.name] : [],
      url: entry.id?.trim() || '',
    }));
  }

  async getAbstract(id: string): Promise<string> {
    try {
      const response = await axios.get(API_BASE, {
        params: { id_list: id.split('/').pop() },
        timeout: 15000,
      });
      const parsed = await parseStringPromise(response.data, { explicitArray: false });
      const entry = parsed.feed.entry;
      return entry?.summary?.replace(/\s+/g, ' ').trim() || '';
    } catch {
      return '';
    }
  }
}
