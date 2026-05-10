import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

export const summarizeArticle = async (text: string): Promise<string> => {
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
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || '';
  } catch (error) {
    console.error('Gemini summarization error:', error);
    throw new Error('Failed to summarize article with Gemini.');
  }
};

export const generatePresentation = async (text: string): Promise<string[]> => {
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
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    let resultText = response.text || '[]';
    // Remove potential markdown wrappers
    if (resultText.startsWith('\`\`\`json')) {
      resultText = resultText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
    } else if (resultText.startsWith('\`\`\`')) {
      resultText = resultText.replace(/\`\`\`/g, '').trim();
    }

    const slides: string[] = JSON.parse(resultText);
    return slides;
  } catch (error) {
    console.error('Gemini presentation generation error:', error);
    throw new Error('Failed to generate presentation slides with Gemini.');
  }
};

export const generateWriterChat = async (rolePrompt: string, messages: { role: string, parts: { text: string }[] }[]): Promise<string> => {
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY is not configured in .env file.');
  }
  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      systemInstruction: rolePrompt,
      contents: messages,
    });
    return response.text || '';
  } catch (error) {
    console.error('Gemini chat error:', error);
    throw new Error('Failed to generate chat response.');
  }
};
