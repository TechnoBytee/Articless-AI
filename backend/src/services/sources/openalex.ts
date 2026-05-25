import axios from 'axios';
import { BaseSource, SearchResult } from './base';

const API_BASE = 'https://api.openalex.org/works';

function decodeInvertedIndex(invertedIndex: Record<string, number[]>): string {
  if (!invertedIndex) return '';

  const words: { pos: number; word: string }[] = [];

  for (const [token, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      words.push({ pos, word: token });
    }
  }

  words.sort((a, b) => a.pos - b.pos);
  return words.map((w) => w.word).join(' ');
}

export class OpenAlexSource extends BaseSource {
  name = 'openalex';

  async search(query: string, limit: number, offset: number): Promise<SearchResult[]> {
    const res = await axios.get(API_BASE, {
      params: {
        search: query,
        'per-page': limit,
        page: Math.floor(offset / limit) + 1,
      },
      timeout: 15000,
    });

    const data = res.data;
    if (!data || !Array.isArray(data.results)) return [];

    return data.results.map((work: any) => ({
      id: work.id ?? '',
      title: work.title ?? '',
      source: 'openalex',
      pubDate: work.publication_date ?? work.publication_year?.toString() ?? '',
      authors: (work.authorships ?? []).map((a: any) => a.author?.display_name ?? ''),
      url: work.doi ? `https://doi.org/${work.doi}` : work.id ?? '',
    }));
  }

  async getAbstract(id: string): Promise<string> {
    const res = await axios.get(id, { params: { mailto: '' }, timeout: 15000 });

    const invertedIndex = res.data?.abstract_inverted_index;
    if (!invertedIndex) return '';

    return decodeInvertedIndex(invertedIndex);
  }
}
