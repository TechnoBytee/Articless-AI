import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

// Force load dotenv relative to this module directory
const loadEnv = () => {
  dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
};

loadEnv();

export const parseFlexibleJSON = (text: string): any => {
  let cleaned = text.trim();
  
  // Remove markdown code fences if they wrap the response
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }
  cleaned = cleaned.trim();

  // Try parsing directly
  try {
    return JSON.parse(cleaned);
  } catch (e) {}

  // Remove potential trailing commas in arrays/objects
  try {
    const withoutTrailingCommas = cleaned.replace(/,\s*([\]}])/g, '$1');
    return JSON.parse(withoutTrailingCommas);
  } catch (e) {}

  // Try extracting array using safe indexOf / lastIndexOf
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    try {
      const arrayText = cleaned.substring(firstBracket, lastBracket + 1);
      const cleanArray = arrayText.replace(/,\s*([\]}])/g, '$1');
      return JSON.parse(cleanArray);
    } catch (err) {}
  }

  // Try extracting object using safe indexOf / lastIndexOf
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      const objectText = cleaned.substring(firstBrace, lastBrace + 1);
      const cleanObj = objectText.replace(/,\s*([\]}])/g, '$1');
      return JSON.parse(cleanObj);
    } catch (err) {}
  }

  throw new Error('Failed to parse JSON content: ' + text);
};

const generateContentWithTimeout = async (
  ai: GoogleGenAI,
  model: string,
  contents: any,
  config?: any
): Promise<any> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    return await (ai.models.generateContent as any)(
      {
        model,
        contents,
        ...(config ? { config } : {}),
      },
      { signal: controller.signal }
    );
  } finally {
    clearTimeout(timeoutId);
  }
};

const getApiKey = (): string => {
  loadEnv();
  return process.env.GEMINI_API_KEY || '';
};

export const summarizeArticle = async (text: string): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY is not configured in .env file.');
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
Lütfen aşağıdaki bilimsel makale özetini okuyun ve herkesin anlayabileceği, ilgi çekici bir şekilde özetleyin. 
Özet, bir sunumda slaytlar halinde gösterilebileceği için paragrafları kısa tutun ve ana hatlarıyla açıklayın.

Makale Özeti:
${text}
`;

  try {
    const response = await generateContentWithTimeout(ai, 'gemini-2.5-flash', prompt);
    return response.text || '';
  } catch (error) {
    console.error('Gemini summarization error:', error);
    throw new Error('Failed to summarize article with Gemini.');
  }
};

export const generatePresentation = async (text: string): Promise<string[]> => {
  const apiKey = getApiKey();
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY is not configured in .env file.');
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
Lütfen aşağıdaki bilimsel makale özetini okuyun ve bir sunum için slayt metinleri oluşturun.
Slaytlar akademik ve ilgi çekici olmalı, okuyucunun anlayabileceği bir dilde yazılmalıdır.
Her bir slayt için ortalama 2-3 cümle kullanın.
Yanıtınızı **SADECE** geçerli bir JSON array (dizi) formatında, her eleman bir slayt metni (string) olacak şekilde döndürün. Örneğin:
["Slayt 1 metni...", "Slayt 2 metni..."]
Hiçbir ek açıklama, markdown işareti (\`\`\`json vb.) kullanmayın, SADECE JSON formatını döndürün.

Makale Özeti:
${text}
`;

  try {
    const response = await generateContentWithTimeout(ai, 'gemini-2.5-flash', prompt);
    let resultText = response.text || '[]';
    const slides: string[] = parseFlexibleJSON(resultText);
    return slides;
  } catch (error) {
    console.error('Gemini presentation generation error:', error);
    throw new Error('Failed to generate presentation slides with Gemini.');
  }
};

export const generateWriterChat = async (rolePrompt: string, messages: { role: string, parts: { text: string }[] }[]): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY is not configured in .env file.');
  }
  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await generateContentWithTimeout(ai, 'gemini-2.5-flash', messages, { systemInstruction: rolePrompt });
    return response.text || '';
  } catch (error) {
    console.error('Gemini chat error:', error);
    throw new Error('Failed to generate chat response.');
  }
};

export const generateMockArticles = async (query: string, limit: number, source: 'tr-dizin' | 'yoktez'): Promise<any[]> => {
  const apiKey = getApiKey();
  if (!apiKey || apiKey === 'your_gemini_api_key_here' || !apiKey) {
    return getStaticMockArticles(query, limit, source);
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Kullanıcı "${query}" kelimesini arattı. Lütfen bu arama sorgusuyla son derece uyumlu, gerçekçi ve akademik formatta Türkçe ${limit} adet ${source === 'tr-dizin' ? 'TR Dizin makale' : 'YÖK tez'} kaydı üret.
Yanıtı SADECE geçerli bir JSON array formatında döndür, hiçbir markdown işareti (\`\`\`json veya \`\`\`) veya ek açıklama içermesin.
Her nesnenin şu alanları olmalı:
- id: Rastgele veya gerçekçi benzersiz bir sayısal string (örn: "249817" veya "10564239")
- title: Akademik, sorguyla son derece uyumlu bir başlık
- source: "${source}"
- pubDate: Son 10 yıla ait gerçekçi bir yıl (örn: "2023", "2021")
- authors: Yazar isimlerini içeren bir dizi (örn: ["Prof. Dr. Ahmet Yılmaz", "Doç. Dr. Elif Kaya"])
- url: ${source === 'tr-dizin' ? 'DOI linki veya boş string' : 'Ulusal Tez Merkezi tezDetay linki (örn: https://tez.yok.gov.tr/UlusalTezMerkezi/tezDetay.jsp?id=<id>)'}
`;

  try {
    const response = await generateContentWithTimeout(ai, 'gemini-2.5-flash', prompt);
    let resultText = response.text || '[]';
    const articles = parseFlexibleJSON(resultText);
    return Array.isArray(articles) ? articles : [];
  } catch (error) {
    console.error('Gemini mock generation error:', error);
    return getStaticMockArticles(query, limit, source);
  }
};

export const generateMockAbstract = async (id: string, title: string, source: 'tr-dizin' | 'yoktez'): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey || apiKey === 'your_gemini_api_key_here' || !apiKey) {
    return `Bu ${source === 'tr-dizin' ? 'makale' : 'tez'} için özet bulunamadı. (ID: ${id})`;
  }
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Lütfen başlığı "${title}" olan ${source === 'tr-dizin' ? 'TR Dizin makalesi' : 'YÖK tezi'} için akademik, Türkçe, yaklaşık 150-200 kelimelik gerçekçi bir makale özeti (abstract) yaz. Yanıt olarak sadece özeti döndür, başka hiçbir şey yazma.`;
  try {
    const response = await generateContentWithTimeout(ai, 'gemini-2.5-flash', prompt);
    return response.text?.trim() || '';
  } catch (error) {
    console.error('Gemini mock abstract generation error:', error);
    return `Bu ${source === 'tr-dizin' ? 'makale' : 'tez'} için özet oluşturulamadı.`;
  }
};

const getStaticMockArticles = (query: string, limit: number, source: 'tr-dizin' | 'yoktez') => {
  const list = [];
  for (let i = 1; i <= limit; i++) {
    list.push({
      id: `${source === 'tr-dizin' ? 'trd' : 'yok'}_${Math.floor(Math.random() * 900000) + 100000}`,
      title: `"${query}" Üzerine Akademik Bir Araştırma - Bölüm ${i}`,
      source,
      pubDate: (2020 + (i % 6)).toString(),
      authors: [`Dr. Test Yazar ${i}`],
      url: source === 'yoktez' ? `https://tez.yok.gov.tr/UlusalTezMerkezi/tezDetay.jsp?id=${i}` : ''
    });
  }
  return list;
};
