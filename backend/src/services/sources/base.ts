export interface SearchResult {
  id: string;
  title: string;
  source: string;
  pubDate: string;
  authors: string[];
  url: string;
}

export abstract class BaseSource {
  abstract name: string;
  abstract search(query: string, limit: number, offset: number): Promise<SearchResult[]>;
  abstract getAbstract(id: string): Promise<string>;
}
