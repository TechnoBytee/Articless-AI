import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { 
  getTrendingSearches, 
  addSearchQuery, 
  saveDraft, 
  getDraftById, 
  deleteDraft, 
  getDraftsByShelfId 
} from './database';
import { summarizeArticle, generatePresentation, generateWriterChat } from './services/gemini';
import { searchAllImages } from './services/image-search';
import { generateAudio } from './services/tts';
import rateLimit from 'express-rate-limit';
import { createDefaultOrchestrator, Orchestrator } from './services/orchestrator';
import { Cache } from './services/cache';
import { BaseSource } from './services/sources/base';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

// Setup CORS whitelist
const whitelist = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5173', 'http://localhost:5000', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('CORS Policy: Bu adresten erisime izin verilmiyor.'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Çok fazla istek gönderildi. Lütfen bir dakika sonra tekrar deneyin.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', apiLimiter);

const orchestrator = createDefaultOrchestrator();
const cache = new Cache(5 * 60 * 1000);

const audioDir = path.join(__dirname, '../../data/audio');
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}
const uploadDir = path.join(__dirname, '../../data/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve audio files statically
app.use('/audio', express.static(audioDir));
app.use('/uploads', express.static(uploadDir));

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
  const { q, offset, sources: sourcesParam, sortBy, sortOrder } = req.query;
  if (!q || typeof q !== 'string') {
    res.status(400).json({ error: 'Query parameter "q" is required' });
    return;
  }

  let parsedOffset = offset ? parseInt(offset as string, 10) : 0;
  if (isNaN(parsedOffset) || parsedOffset < 0) {
    parsedOffset = 0;
  }

  let selectedSources = ['pubmed', 'semantic-scholar', 'openalex', 'arxiv', 'dergipark', 'tr-dizin', 'yoktez'];
  if (sourcesParam && typeof sourcesParam === 'string') {
    const parsed = sourcesParam.split(',').filter(s =>
      ['pubmed','semantic-scholar','openalex','arxiv','dergipark','tr-dizin','yoktez'].includes(s)
    );
    if (parsed.length > 0) selectedSources = parsed;
  }

  try {
    try { addSearchQuery(q); } catch (dbError) { console.error('Trends error:', dbError); }

    const cacheKey = `search:${q.toLowerCase().trim()}|${selectedSources.sort().join(',')}|${parsedOffset}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      res.json({ articles: cached.articles, totalCount: cached.totalCount, sourceStats: cached.sourceStats, elapsed: cached.elapsed, cached: true });
      return;
    }

    const sourceMap: Record<string, BaseSource> = {};
    for (const [key, val] of orchestrator.sources.entries()) {
      sourceMap[key] = val;
    }
    const sourceInstances = selectedSources
      .map(type => sourceMap[type])
      .filter(Boolean);
    const allArticles = await orchestrator.searchAll(
      sourceInstances.length > 0 ? sourceInstances : Array.from(orchestrator.sources.values()),
      q, 10, parsedOffset
    );

    const result = { articles: allArticles, totalCount: allArticles.length };
    cache.set(cacheKey, result);

    res.json({ articles: result.articles, totalCount: result.totalCount, cached: false });
  } catch (error) {
    res.status(500).json({ error: 'Failed to search articles' });
  }
});

// 3. Process Article (Fetch, Summarize, TTS for quick listen - Dinamik Kaynak Yonlendirmeli)
app.post('/api/article/:id/process', async (req, res) => {
  const { id } = req.params;
  const sourceName = (req.query.source as string || 'pubmed').toLowerCase();

  try {
    const sourceInstance = orchestrator.sources.get(sourceName);
    if (!sourceInstance) {
      res.status(400).json({ error: `Gecersiz veya desteklenmeyen kaynak: ${sourceName}` });
      return;
    }

    const abstract = await sourceInstance.getAbstract(id);
    if (!abstract || abstract.trim().length === 0) {
       res.status(404).json({ error: 'Bu makale icin ozet bulunamadi.' });
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
  const sourceName = (req.query.source as string || 'pubmed').toLowerCase();

  try {
    const sourceInstance = orchestrator.sources.get(sourceName);
    if (!sourceInstance) {
      res.status(400).json({ error: `Gecersiz veya desteklenmeyen kaynak: ${sourceName}` });
      return;
    }

    const abstract = await sourceInstance.getAbstract(id);
    if (!abstract || abstract.trim().length === 0) {
       res.status(404).json({ error: 'Bu makale icin ozet bulunamadi.' });
       return;
    }

    const slideTexts = await generatePresentation(abstract);
    
    // Generate audio for each slide in parallel using Promise.allSettled
    const slidePromises = slideTexts.map(async (text) => {
      const audioFilename = await generateAudio(text);
      return { text, audioUrl: `/audio/${audioFilename}` };
    });

    const results = await Promise.allSettled(slidePromises);
    const slides = results.map((r, idx) => {
      if (r.status === 'fulfilled') {
        return r.value;
      } else {
        console.error(`Slayt ${idx} seslendirilemedi (Text: "${slideTexts[idx]}"):`, r.reason);
        return { text: slideTexts[idx], audioUrl: null };
      }
    });

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

5. Element Silme:
{"action": "DELETE_ELEMENT", "elementId": "mevcut_id"}

Kullanıcıya ne yaptığını açıklayan doğal bir dille yanıt ver ve ardından komut bloğunu ekle.`;

    const reply = await generateWriterChat(rolePrompt, messages);
    res.json({ reply });
  } catch (error: any) {
    console.error('Presentation Chat error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate response' });
  }
});

// --- AI Writer Draft Endpoints ---

// Create/Update Draft
app.post('/api/ai-writer/drafts', (req, res) => {
  const { id, shelf_id, title, content } = req.body;
  if (!id || !shelf_id || !title) {
    res.status(400).json({ error: 'id, shelf_id ve title zorunludur.' });
    return;
  }
  try {
    saveDraft({ id, shelf_id, title, content });
    res.json({ success: true, message: 'Taslak basariyla kaydedildi.' });
  } catch (error: any) {
    console.error('Save draft error:', error);
    res.status(500).json({ error: 'Taslak kaydedilemedi: ' + error.message });
  }
});

// List Drafts by Shelf ID
app.get('/api/ai-writer/drafts', (req, res) => {
  const { shelf_id } = req.query;
  if (!shelf_id || typeof shelf_id !== 'string') {
    res.status(400).json({ error: 'shelf_id parametresi zorunludur.' });
    return;
  }
  try {
    const drafts = getDraftsByShelfId(shelf_id);
    res.json(drafts);
  } catch (error: any) {
    console.error('Get drafts error:', error);
    res.status(500).json({ error: 'Taslaklar getirilemedi: ' + error.message });
  }
});

// Get Draft Detail by ID
app.get('/api/ai-writer/drafts/:id', (req, res) => {
  try {
    const draft = getDraftById(req.params.id);
    if (!draft) {
      res.status(404).json({ error: 'Taslak bulunamadi.' });
      return;
    }
    res.json(draft);
  } catch (error: any) {
    console.error('Get draft detail error:', error);
    res.status(500).json({ error: 'Veri getirme hatasi: ' + error.message });
  }
});

// Delete Draft
app.delete('/api/ai-writer/drafts/:id', (req, res) => {
  try {
    deleteDraft(req.params.id);
    res.json({ success: true, message: 'Taslak silindi.' });
  } catch (error: any) {
    console.error('Delete draft error:', error);
    res.status(500).json({ error: 'Taslak silinemedi: ' + error.message });
  }
});

// --- Image Upload Endpoint (Base64 JSON Upload) ---
app.post('/api/upload', (req, res) => {
  const { fileName, fileData } = req.body;
  if (!fileName || !fileData) {
    res.status(400).json({ error: 'fileName ve fileData (base64) zorunludur.' });
    return;
  }

  try {
    const matches = fileData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      res.status(400).json({ error: 'Gecersiz base64 veri formati.' });
      return;
    }

    const mimeType = matches[1];
    if (!mimeType.startsWith('image/')) {
      res.status(400).json({ error: 'Sadece resim yüklemelerine izin verilmektedir.' });
      return;
    }

    const mimeToExt: Record<string, string> = {
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg'
    };

    const fileExt = mimeToExt[mimeType];
    if (!fileExt) {
      res.status(400).json({ error: 'Desteklenmeyen resim formati. Sadece png, jpg, jpeg, gif, webp, svg yukleyebilirsiniz.' });
      return;
    }

    const buffer = Buffer.from(matches[2], 'base64');
    // Limit to 5MB (5 * 1024 * 1024 bytes)
    if (buffer.length > 5 * 1024 * 1024) {
      res.status(400).json({ error: 'Dosya boyutu 5MB sınırı asamaz.' });
      return;
    }

    const uniqueName = `${crypto.randomUUID()}${fileExt}`;
    const targetPath = path.join(uploadDir, uniqueName);

    fs.writeFileSync(targetPath, buffer);

    res.json({
      url: `/uploads/${uniqueName}`
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Dosya yuklenemedi: ' + error.message });
  }
});

// 7. Image Search API
app.get('/api/image-search', async (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      res.status(400).json({ error: 'Search query (q) is required' });
      return;
    }
    const images = await searchAllImages(query);
    res.json({ images });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to search images: ' + error.message });
  }
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

export { app };

