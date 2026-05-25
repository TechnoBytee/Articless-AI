import axios from 'axios';
import { BaseSource, SearchResult } from './base';

const API_BASE = 'https://api.semanticscholar.org/graph/v1/paper/search';

export class SemanticScholarSource extends BaseSource {
  name = 'semantic-scholar';

  async search(query: string, limit: number, offset: number): Promise<SearchResult[]> {
    const res = await axios.get(API_BASE, {
      params: { query, limit, offset },
      timeout: 15000,
    });

    const data = res.data;
    if (!data || !Array.isArray(data.data)) return [];

    return data.data.map((paper: any) => ({
      id: paper.paperId ?? '',
      title: paper.title ?? '',
      source: 'semantic-scholar',
      pubDate: paper.publicationDate ?? paper.year?.toString() ?? '',
      authors: (paper.authors ?? []).map((a: any) => a.name),
      url: paper.url ?? `https://www.semanticscholar.org/paper/${paper.paperId}`,
    }));
  }

  async getAbstract(id: string): Promise<string> {
    const res = await axios.get(`https://api.semanticscholar.org/graph/v1/paper/${id}`, {
      params: { fields: 'abstract' },
      timeout: 15000,
    });

    return res.data?.abstract ?? '';
  }
}
