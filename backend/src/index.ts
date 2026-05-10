import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { getTrendingSearches, addSearchQuery } from './database';
import { searchArticles, getArticleAbstract } from './services/pubmed';
import { summarizeArticle, generatePresentation, generateWriterChat } from './services/gemini';
import { generateAudio } from './services/tts';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serve audio files statically
app.use('/audio', express.static(path.join(__dirname, '../../data/audio')));

// --- API Endpoints ---

// 1. Get Trending Searches
app.get('/api/trends', (req, res) => {
  try {
    const trends = getTrendingSearches(10);
    res.json(trends);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

// 2. Search PubMed Articles
app.get('/api/search', async (req, res) => {
  const { q, offset } = req.query;
  if (!q || typeof q !== 'string') {
    res.status(400).json({ error: 'Query parameter "q" is required' });
    return;
  }

  const parsedOffset = offset ? parseInt(offset as string, 10) : 0;

  try {
    // Add to trending safely
    try {
      addSearchQuery(q);
    } catch (dbError) {
      console.error('Failed to add search query to trends:', dbError);
    }

    const articles = await searchArticles(q, 10, parsedOffset);
    res.json(articles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search articles' });
  }
});

// 3. Process Article (Fetch, Summarize, TTS for quick listen)
app.post('/api/article/:id/process', async (req, res) => {
  const { id } = req.params;
  try {
    const abstract = await getArticleAbstract(id);
    if (!abstract || abstract.trim().length === 0) {
       res.status(404).json({ error: 'No abstract available for this article.' });
       return;
    }

    const summary = await summarizeArticle(abstract);
    const audioFilename = await generateAudio(summary);
    const audioUrl = `/audio/${audioFilename}`;

    res.json({
      originalAbstract: abstract,
      summary,
      audioUrl
    });
  } catch (error: any) {
    console.error('Process error:', error);
    res.status(500).json({ error: error.message || 'Failed to process article' });
  }
});

// 4. Generate Presentation
app.post('/api/article/:id/presentation', async (req, res) => {
  const { id } = req.params;
  try {
    const abstract = await getArticleAbstract(id);
    if (!abstract || abstract.trim().length === 0) {
       res.status(404).json({ error: 'No abstract available for this article.' });
       return;
    }

    const slideTexts = await generatePresentation(abstract);
    
    // Generate audio for each slide in parallel
    const slides = await Promise.all(slideTexts.map(async (text) => {
      const audioFilename = await generateAudio(text);
      return {
        text,
        audioUrl: `/audio/${audioFilename}`
      };
    }));

    res.json({
      originalAbstract: abstract,
      slides
    });
  } catch (error: any) {
    console.error('Presentation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate presentation' });
  }
});

// 5. AI Writer Chat Endpoint
app.post('/api/ai-writer/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'Messages array is required' });
      return;
    }

    const rolePath = path.join(__dirname, '../../data/ai_writer_role.txt');
    let rolePrompt = 'Sen akademik bir asistansın.';
    if (fs.existsSync(rolePath)) {
      rolePrompt = fs.readFileSync(rolePath, 'utf-8');
    }

    const reply = await generateWriterChat(rolePrompt, messages);
    res.json({ reply });
  } catch (error: any) {
    console.error('AI Writer Chat error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate response' });
  }
});

// 6. Presentation AI Assistant
app.post('/api/presentation/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'Messages array is required' });
      return;
    }

    const rolePrompt = `Sen profesyonel bir sunum tasarımcısı ve yapay zeka asistanısın. 
Kullanıcıya akademik makalelerden görsel ve etkili sunumlar hazırlamasında yardımcı olacaksın.
Slayt başlıkları, madde işaretli metinler ve görsel fikirleri önerebilirsin.
Yanıtlarını markdown kullanarak net ve yapılandırılmış şekilde ver.`;

    const reply = await generateWriterChat(rolePrompt, messages);
    res.json({ reply });
  } catch (error: any) {
    console.error('Presentation Chat error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate response' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
