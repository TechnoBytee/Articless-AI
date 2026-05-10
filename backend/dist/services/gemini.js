"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.summarizeArticle = void 0;
const genai_1 = require("@google/genai");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const apiKey = process.env.GEMINI_API_KEY;
const summarizeArticle = async (text) => {
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
        throw new Error('GEMINI_API_KEY is not configured in .env file.');
    }
    const ai = new genai_1.GoogleGenAI({ apiKey });
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
    }
    catch (error) {
        console.error('Gemini summarization error:', error);
        throw new Error('Failed to summarize article with Gemini.');
    }
};
exports.summarizeArticle = summarizeArticle;
