import axios from 'axios';

const PUBMED_API_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

export interface PubMedArticle {
  id: string;
  title: string;
  source: string;
  pubDate: string;
  authors: string[];
}

export const searchArticles = async (query: string, limit: number = 10, offset: number = 0): Promise<PubMedArticle[]> => {
  try {
    // 1. Search for IDs
    const searchRes = await axios.get(`${PUBMED_API_BASE}/esearch.fcgi`, {
      params: {
        db: 'pubmed',
        term: query,
        retmode: 'json',
        retmax: limit,
        retstart: offset,
      },
    });

    const ids = searchRes.data.esearchresult.idlist;
    if (!ids || ids.length === 0) return [];

    // 2. Fetch summaries for those IDs
    const summaryRes = await axios.get(`${PUBMED_API_BASE}/esummary.fcgi`, {
      params: {
        db: 'pubmed',
        id: ids.join(','),
        retmode: 'json',
      },
    });

    const articles: PubMedArticle[] = [];
    const result = summaryRes.data.result;

    for (const id of ids) {
      if (result[id]) {
        const item = result[id];
        articles.push({
          id,
          title: item.title,
          source: item.source,
          pubDate: item.pubdate,
          authors: item.authors ? item.authors.map((a: any) => a.name) : [],
        });
      }
    }

    return articles;
  } catch (error) {
    console.error('PubMed search error:', error);
    throw new Error('Failed to search PubMed articles.');
  }
};

export const getArticleAbstract = async (id: string): Promise<string> => {
  try {
    const fetchRes = await axios.get(`${PUBMED_API_BASE}/efetch.fcgi`, {
      params: {
        db: 'pubmed',
        id: id,
        retmode: 'text',
        rettype: 'abstract',
      },
    });
    return fetchRes.data;
  } catch (error) {
    console.error(`PubMed fetch error for ID ${id}:`, error);
    throw new Error('Failed to fetch article abstract.');
  }
};
