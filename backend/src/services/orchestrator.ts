import { BaseSource, SearchResult } from './sources/base';
import { PubMedSource } from './pubmed';
import { SemanticScholarSource } from './sources/semantic-scholar';
import { OpenAlexSource } from './sources/openalex';
import { ArXivSource } from './sources/arxiv';
import { DergiParkSource } from './sources/dergipark';
import { TRDizinSource } from './sources/tr-dizin';
import { YOKTezSource } from './sources/yoktez';

export class Orchestrator {
  sources: Map<string, BaseSource> = new Map();

  constructor(sourceList: BaseSource[]) {
    for (const s of sourceList) {
      this.sources.set(s.name, s);
    }
  }

  async searchAll(
    sourceList: BaseSource[],
    query: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<SearchResult[]> {
    const results = await Promise.allSettled(
      sourceList.map((src) => src.search(query, limit, offset))
    );

    const allResults: SearchResult[] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled') {
        allResults.push(...result.value);
      } else {
        console.error(`[Orchestrator] Source "${sourceList[i].name}" failed:`, result.reason);
      }
    }

    return allResults;
  }
}

export function createDefaultOrchestrator(): Orchestrator {
  return new Orchestrator([
    new PubMedSource(),
    new SemanticScholarSource(),
    new OpenAlexSource(),
    new ArXivSource(),
    new DergiParkSource(),
    new TRDizinSource(),
    new YOKTezSource(),
  ]);
}
