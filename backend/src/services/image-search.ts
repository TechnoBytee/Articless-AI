import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ImageResult {
  url: string;
  source: string;
  title?: string;
}

// 1. Google Images (Scraping Fallback)
async function searchGoogleImages(query: string): Promise<ImageResult[]> {
  try {
    const response = await axios.get(`https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
      },
      timeout: 5000
    });
    
    const $ = cheerio.load(response.data);
    const images: ImageResult[] = [];
    
    // Google image results are often hidden in scripts, but some img tags might be accessible
    $('img').each((_, el) => {
      const src = $(el).attr('src');
      const dataSrc = $(el).attr('data-src');
      const url = dataSrc || src;
      
      if (url && url.startsWith('http') && !url.includes('googlelogo')) {
        images.push({ url, source: 'google' });
      }
    });
    
    return images.slice(0, 5);
  } catch (error) {
    console.warn('Google Images search failed:', error);
    return [];
  }
}

// 2. Wikipedia Images
async function searchWikipediaImages(query: string): Promise<ImageResult[]> {
  try {
    const response = await axios.get(`https://en.wikipedia.org/w/api.php`, {
      params: {
        action: 'query',
        format: 'json',
        prop: 'pageimages',
        generator: 'search',
        gsrsearch: query,
        pithumbsize: 800
      },
      timeout: 5000
    });

    const pages = response.data?.query?.pages;
    if (!pages) return [];

    const images: ImageResult[] = [];
    Object.values(pages).forEach((page: any) => {
      if (page.thumbnail && page.thumbnail.source) {
        images.push({
          url: page.thumbnail.source,
          title: page.title,
          source: 'wikipedia'
        });
      }
    });
    
    return images.slice(0, 5);
  } catch (error) {
    console.warn('Wikipedia search failed:', error);
    return [];
  }
}

// 3. Pexels API
async function searchPexels(query: string): Promise<ImageResult[]> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return [];

  try {
    const response = await axios.get(`https://api.pexels.com/v1/search`, {
      params: { query, per_page: 5 },
      headers: { Authorization: apiKey },
      timeout: 5000
    });

    return (response.data.photos || []).map((p: any) => ({
      url: p.src.medium || p.src.large,
      source: 'pexels'
    }));
  } catch (error) {
    console.warn('Pexels search failed:', error);
    return [];
  }
}

export async function searchAllImages(query: string): Promise<ImageResult[]> {
  const [google, wiki, pexels] = await Promise.all([
    searchGoogleImages(query),
    searchWikipediaImages(query),
    searchPexels(query)
  ]);

  return [...pexels, ...wiki, ...google];
}
