import axios from 'axios';
import { searchArticles, getArticleAbstract } from '../services/pubmed';

// Mock axios entirely
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Suppress console.error during tests (noise from expected error scenarios)
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => {
  (console.error as jest.Mock).mockRestore();
});

// ---------------------------------------------------------------------------
// Helper to build a valid esummary result entry
// ---------------------------------------------------------------------------
function buildSummary(id: string, overrides: Record<string, unknown> = {}) {
  return {
    uid: id,
    title: 'Default Title',
    source: 'Default Source',
    pubdate: '2025 Jan 1',
    authors: [{ name: 'Doe J' }, { name: 'Smith A' }],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// searchArticles
// ---------------------------------------------------------------------------
describe('searchArticles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Successful scenario ────────────────────────────────────────────────
  it('returns a list of PubMedArticle objects on success', async () => {
    const ids = ['12345', '67890'];

    // Mock esearch response
    mockedAxios.get.mockResolvedValueOnce({
      data: { esearchresult: { idlist: ids } },
    });

    // Mock esummary response
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        result: {
          '12345': buildSummary('12345', {
            title: 'Cancer Research Breakthrough',
            source: 'Nature',
            pubdate: '2025 Mar 15',
            authors: [{ name: 'Lee K' }, { name: 'Park J' }],
          }),
          '67890': buildSummary('67890', {
            title: 'AI in Medicine',
            source: 'The Lancet',
            pubdate: '2025 Feb 10',
            authors: [{ name: 'Chen W' }],
          }),
        },
      },
    });

    const articles = await searchArticles('cancer', 10, 0);

    // Verify HTTP calls
    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    expect(mockedAxios.get).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('esearch.fcgi'),
      expect.objectContaining({
        params: expect.objectContaining({
          db: 'pubmed',
          term: 'cancer',
          retmode: 'json',
          retmax: 10,
          retstart: 0,
        }),
      }),
    );
    expect(mockedAxios.get).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('esummary.fcgi'),
      expect.objectContaining({
        params: expect.objectContaining({
          db: 'pubmed',
          id: '12345,67890',
          retmode: 'json',
        }),
      }),
    );

    // Verify returned data
    expect(articles).toHaveLength(2);
    expect(articles[0]).toEqual({
      id: '12345',
      title: 'Cancer Research Breakthrough',
      source: 'Nature',
      pubDate: '2025 Mar 15',
      authors: ['Lee K', 'Park J'],
    });
    expect(articles[1]).toEqual({
      id: '67890',
      title: 'AI in Medicine',
      source: 'The Lancet',
      pubDate: '2025 Feb 10',
      authors: ['Chen W'],
    });
  });

  // ── Empty result ──────────────────────────────────────────────────────
  it('returns an empty array when esearch returns no IDs', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { esearchresult: { idlist: [] } },
    });

    const articles = await searchArticles('nonexistent_topic_xyz');

    expect(articles).toEqual([]);
    // Only esearch should have been called – esummary is skipped
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
  });

  it('returns an empty array when esearchresult is missing', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { esearchresult: {} },
    });

    const articles = await searchArticles('missing_field');

    expect(articles).toEqual([]);
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
  });

  // ── Partial / missing fields in summary entries ───────────────────────
  it('gracefully handles summary entries with missing authors', async () => {
    const ids = ['999'];
    mockedAxios.get.mockResolvedValueOnce({
      data: { esearchresult: { idlist: ids } },
    });
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        result: {
          '999': buildSummary('999', {
            title: 'No Authors',
            source: 'Unknown',
            pubdate: '2024 Jun 1',
            authors: undefined,
          }),
        },
      },
    });

    const articles = await searchArticles('no-authors');
    expect(articles).toHaveLength(1);
    expect(articles[0].authors).toEqual([]);
  });

  // ── Error handling ────────────────────────────────────────────────────
  it('throws a meaningful error when the network fails on esearch', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

    await expect(searchArticles('cancer')).rejects.toThrow(
      'Failed to search PubMed articles.',
    );
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
  });

  it('throws a meaningful error when esummary fails', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { esearchresult: { idlist: ['123'] } },
    });
    mockedAxios.get.mockRejectedValueOnce(new Error('Summary timeout'));

    await expect(searchArticles('cancer')).rejects.toThrow(
      'Failed to search PubMed articles.',
    );
    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
  });

  // ── Edge cases ────────────────────────────────────────────────────────
  it('handles special characters in query', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { esearchresult: { idlist: [] } },
    });

    const articles = await searchArticles('HIV/AIDS & cancer (research)');
    expect(articles).toEqual([]);
    // Ensure the query is passed as-is (URL encoding handled by axios)
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        params: expect.objectContaining({
          term: 'HIV/AIDS & cancer (research)',
        }),
      }),
    );
  });

  it('applies default limit and offset when not provided', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { esearchresult: { idlist: [] } },
    });

    await searchArticles('test');
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        params: expect.objectContaining({ retmax: 10, retstart: 0 }),
      }),
    );
  });

  it('uses provided limit and offset parameters', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { esearchresult: { idlist: [] } },
    });

    await searchArticles('test', 25, 50);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        params: expect.objectContaining({ retmax: 25, retstart: 50 }),
      }),
    );
  });

  it('ignores summary entries whose ID is not in the result map', async () => {
    const ids = ['111', '222'];
    mockedAxios.get.mockResolvedValueOnce({
      data: { esearchresult: { idlist: ids } },
    });
    // Only '111' is present in result; '222' is missing
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        result: {
          '111': buildSummary('111', { title: 'Present Article' }),
        },
      },
    });

    const articles = await searchArticles('partial');
    expect(articles).toHaveLength(1);
    expect(articles[0].id).toBe('111');
  });
});

// ---------------------------------------------------------------------------
// getArticleAbstract
// ---------------------------------------------------------------------------
describe('getArticleAbstract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Successful scenario ───────────────────────────────────────────────
  it('returns the abstract text on success', async () => {
    const fakeAbstract =
      'This is a sample abstract. It contains important findings about the study.';

    mockedAxios.get.mockResolvedValueOnce({ data: fakeAbstract });

    const result = await getArticleAbstract('12345');

    expect(result).toBe(fakeAbstract);
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining('efetch.fcgi'),
      expect.objectContaining({
        params: {
          db: 'pubmed',
          id: '12345',
          retmode: 'text',
          rettype: 'abstract',
        },
      }),
    );
  });

  // ── Empty abstract ────────────────────────────────────────────────────
  it('returns an empty string when the API returns no content', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: '' });

    const result = await getArticleAbstract('99999');
    expect(result).toBe('');
  });

  // ── Error handling ────────────────────────────────────────────────────
  it('throws a meaningful error when the network fails', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Connection lost'));

    await expect(getArticleAbstract('12345')).rejects.toThrow(
      'Failed to fetch article abstract.',
    );
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
  });

  it('throws a meaningful error on HTTP 404', async () => {
    const httpError = new Error('Request failed with status code 404');
    (httpError as any).response = { status: 404 };
    mockedAxios.get.mockRejectedValueOnce(httpError);

    await expect(getArticleAbstract('invalid_id')).rejects.toThrow(
      'Failed to fetch article abstract.',
    );
  });

  // ── Edge case ─────────────────────────────────────────────────────────
  it('handles abstracts with special characters', async () => {
    const specialAbstract =
      'Abstract with special chars: <html> & "quotes" \'single\' and 100% accuracy.';
    mockedAxios.get.mockResolvedValueOnce({ data: specialAbstract });

    const result = await getArticleAbstract('555');
    expect(result).toBe(specialAbstract);
  });
});
