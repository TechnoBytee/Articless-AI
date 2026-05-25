import { BaseSource, SearchResult } from './base';
import axios from 'axios';

export class TRDizinSource extends BaseSource {
  name = 'tr-dizin';

  async search(query: string, limit: number = 10, offset: number = 0): Promise<SearchResult[]> {
    try {
      const page = Math.floor(offset / limit) + 1;
      const response = await axios.get(`https://search.trdizin.gov.tr/api/defaultSearch/publication/`, {
        params: { 
          q: query, 
          order: 'relevance-DESC', 
          page, 
          limit: Math.min(limit, 50) 
        },
        headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        timeout: 15000,
      });

      const results: SearchResult[] = [];
      const items = response.data?.data?.results || [];

      for (const item of items) {
        if (item.id && item.name) {
          results.push({
            id: item.id.toString(),
            title: item.name,
            source: 'tr-dizin',
            pubDate: item.publication_year?.toString() || '',
            authors: item.authors?.map((a: any) => a.name) || [],
            url: `https://search.trdizin.gov.tr/tr/yayin/detay/${item.id}`,
          });
        }
      }

      return results;
    } catch (err) {
      console.warn("TR Dizin API search failed. Returning empty...", err);
      return [];
    }
  }

  async getAbstract(id: string): Promise<string> {
    try {
      // Let's try to get abstract from the detail page or API
      const response = await axios.get(`https://search.trdizin.gov.tr/api/publication/detail/${id}`, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        timeout: 15000,
      });
      
      const data = response.data?.data;
      if (data && data.abstracts && data.abstracts.length > 0) {
        // Try to get Turkish abstract first, else the first available
        const trAbstract = data.abstracts.find((a: any) => a.language === 'TUR' || a.language === 'TR');
        if (trAbstract) return trAbstract.content;
        return data.abstracts[0].content;
      }
      
      return '';
    } catch (err) {
      console.warn(`TR Dizin Abstract API failed for ID ${id}.`, err);
      return '';
    }
  }
}
