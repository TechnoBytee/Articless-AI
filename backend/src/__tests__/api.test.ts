import request from 'supertest';
import { app } from '../index';
import * as db from '../database';
import * as gemini from '../services/gemini';
import * as tts from '../services/tts';
import { createDefaultOrchestrator } from '../services/orchestrator';

// Mock database methods
jest.mock('../database', () => ({
  getTrendingSearches: jest.fn(),
  addSearchQuery: jest.fn(),
  saveDraft: jest.fn(),
  getDraftById: jest.fn(),
  deleteDraft: jest.fn(),
  getDraftsByShelfId: jest.fn(),
}));

// Mock Gemini services
jest.mock('../services/gemini', () => ({
  summarizeArticle: jest.fn(),
  generatePresentation: jest.fn(),
  generateWriterChat: jest.fn(),
  generateMockArticles: jest.fn(),
  generateMockAbstract: jest.fn(),
}));

// Mock TTS service
jest.mock('../services/tts', () => ({
  generateAudio: jest.fn(),
}));

// Mock fs and path for uploads and roles
jest.mock('fs', () => {
  const originalFs = jest.requireActual('fs');
  return {
    ...originalFs,
    existsSync: jest.fn().mockImplementation((p) => {
      if (p.includes('ai_writer_role.txt')) return true;
      if (p.includes('audio') || p.includes('uploads')) return true;
      return originalFs.existsSync(p);
    }),
    readFileSync: jest.fn().mockImplementation((p, opt) => {
      if (p.includes('ai_writer_role.txt')) return 'Mocked system role instruction';
      return originalFs.readFileSync(p, opt);
    }),
    writeFileSync: jest.fn(),
  };
});

describe('Backend API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. GET /api/trends
  describe('GET /api/trends', () => {
    it('should return trending searches', async () => {
      const mockTrends = [{ query: 'AI', count: 5 }];
      (db.getTrendingSearches as jest.Mock).mockReturnValue(mockTrends);

      const res = await request(app).get('/api/trends');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockTrends);
      expect(db.getTrendingSearches).toHaveBeenCalledWith(10);
    });

    it('should return 500 when database fails', async () => {
      (db.getTrendingSearches as jest.Mock).mockImplementation(() => {
        throw new Error('DB Error');
      });

      const res = await request(app).get('/api/trends');
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Failed to fetch trends' });
    });
  });

  // 2. GET /api/search
  describe('GET /api/search', () => {
    it('should validate query parameter q', async () => {
      const res = await request(app).get('/api/search');
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Query parameter "q" is required' });
    });

    it('should search articles successfully', async () => {
      // Mock search results on orchestrator
      const mockArticles = [{ id: '1', title: 'Test PubMed Article', source: 'pubmed' }];
      // We will spy on orchestrator search or since we mock orchestrator sources indirectly, let's look at index.ts.
      // Index.ts uses createDefaultOrchestrator() which yields an orchestrator instance.
      // Let's mock the orchestrator.searchAll method.
      // But searchAll is inside Orchestrator. We can mock orchestrator.searchAll globally by mocking services/orchestrator
      // Wait, we can mock searchAll by mocking the class or prototype.
      const mockSearchAll = jest.spyOn(require('../services/orchestrator').Orchestrator.prototype, 'searchAll');
      mockSearchAll.mockResolvedValue(mockArticles);

      const res = await request(app).get('/api/search?q=test&sources=pubmed');

      expect(res.status).toBe(200);
      expect(res.body.articles).toEqual(mockArticles);
      expect(db.addSearchQuery).toHaveBeenCalledWith('test');
    });
  });

  // 3. POST /api/article/:id/process
  describe('POST /api/article/:id/process', () => {
    it('should process article dynamically based on source query param', async () => {
      // Mock source getAbstract
      const mockGetAbstract = jest.spyOn(require('../services/pubmed').PubMedSource.prototype, 'getAbstract');
      mockGetAbstract.mockResolvedValue('This is PubMed abstract');

      (gemini.summarizeArticle as jest.Mock).mockResolvedValue('Summarized abstract');
      (tts.generateAudio as jest.Mock).mockResolvedValue('audio_123.mp3');

      const res = await request(app).post('/api/article/123/process?source=pubmed');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        originalAbstract: 'This is PubMed abstract',
        summary: 'Summarized abstract',
        audioUrl: '/audio/audio_123.mp3',
      });
      expect(mockGetAbstract).toHaveBeenCalledWith('123');
    });

    it('should return 400 for unsupported sources', async () => {
      const res = await request(app).post('/api/article/123/process?source=invalid-source');
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Gecersiz veya desteklenmeyen kaynak');
    });
  });

  // 4. POST /api/article/:id/presentation
  describe('POST /api/article/:id/presentation', () => {
    it('should generate presentation and handle TTS failures gracefully with Promise.allSettled', async () => {
      const mockGetAbstract = jest.spyOn(require('../services/sources/arxiv').ArXivSource.prototype, 'getAbstract');
      mockGetAbstract.mockResolvedValue('This is arXiv abstract');

      (gemini.generatePresentation as jest.Mock).mockResolvedValue([
        'Slide 1 text content',
        'Slide 2 text content',
      ]);

      // Slayt 1 basarili, Slayt 2 basarisiz
      (tts.generateAudio as jest.Mock)
        .mockResolvedValueOnce('slide1.mp3')
        .mockRejectedValueOnce(new Error('TTS failure'));

      const res = await request(app).post('/api/article/arXiv-456/presentation?source=arxiv');

      expect(res.status).toBe(200);
      expect(res.body.originalAbstract).toBe('This is arXiv abstract');
      expect(res.body.slides).toEqual([
        { text: 'Slide 1 text content', audioUrl: '/audio/slide1.mp3' },
        { text: 'Slide 2 text content', audioUrl: null },
      ]);
    });
  });

  // 5. POST /api/ai-writer/chat
  describe('POST /api/ai-writer/chat', () => {
    it('should return response from Gemini chat with role prompt from file', async () => {
      (gemini.generateWriterChat as jest.Mock).mockResolvedValue('Mocked AI response text');

      const messages = [{ role: 'user', parts: [{ text: 'Hello' }] }];
      const res = await request(app)
        .post('/api/ai-writer/chat')
        .send({ messages });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ reply: 'Mocked AI response text' });
      expect(gemini.generateWriterChat).toHaveBeenCalledWith(
        'Mocked system role instruction',
        messages
      );
    });
  });

  // 6. POST /api/presentation/chat
  describe('POST /api/presentation/chat', () => {
    it('should return response with presentation instructions', async () => {
      (gemini.generateWriterChat as jest.Mock).mockResolvedValue('Response with <command>{"action": "ADD_SLIDE"}</command>');

      const messages = [{ role: 'user', parts: [{ text: 'Add slide' }] }];
      const res = await request(app)
        .post('/api/presentation/chat')
        .send({ messages });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ reply: 'Response with <command>{"action": "ADD_SLIDE"}</command>' });
    });
  });

  // 7. Draft CRUD Endpoints
  describe('Draft CRUD API', () => {
    it('should create or update a draft', async () => {
      const draftData = {
        id: 'draft-1',
        shelf_id: 'shelf-1',
        title: 'Draft Title',
        content: 'Draft content',
      };

      const res = await request(app)
        .post('/api/ai-writer/drafts')
        .send(draftData);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, message: 'Taslak basariyla kaydedildi.' });
      expect(db.saveDraft).toHaveBeenCalledWith(draftData);
    });

    it('should fetch drafts by shelf_id', async () => {
      const mockDrafts = [{ id: 'draft-1', shelf_id: 'shelf-1', title: 'Draft Title', content: 'Draft content' }];
      (db.getDraftsByShelfId as jest.Mock).mockReturnValue(mockDrafts);

      const res = await request(app).get('/api/ai-writer/drafts?shelf_id=shelf-1');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockDrafts);
      expect(db.getDraftsByShelfId).toHaveBeenCalledWith('shelf-1');
    });

    it('should fetch draft detail by id', async () => {
      const mockDraft = { id: 'draft-1', shelf_id: 'shelf-1', title: 'Draft Title', content: 'Draft content' };
      (db.getDraftById as jest.Mock).mockReturnValue(mockDraft);

      const res = await request(app).get('/api/ai-writer/drafts/draft-1');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockDraft);
      expect(db.getDraftById).toHaveBeenCalledWith('draft-1');
    });

    it('should delete a draft', async () => {
      const res = await request(app).delete('/api/ai-writer/drafts/draft-1');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, message: 'Taslak silindi.' });
      expect(db.deleteDraft).toHaveBeenCalledWith('draft-1');
    });
  });

  // 8. Base64 Upload Endpoint
  describe('POST /api/upload', () => {
    it('should save image and return its URL', async () => {
      const fileData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const res = await request(app)
        .post('/api/upload')
        .send({ fileName: 'test.png', fileData });

      expect(res.status).toBe(200);
      expect(res.body.url).toContain('/uploads/');
    });

    it('should prevent extension manipulation and use MIME-based extension', async () => {
      const fileData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const res = await request(app)
        .post('/api/upload')
        .send({ fileName: 'malicious.html', fileData });

      expect(res.status).toBe(200);
      expect(res.body.url).toContain('/uploads/');
      expect(res.body.url.endsWith('.png')).toBe(true);
    });

    it('should return 400 for invalid base64 format', async () => {
      const res = await request(app)
        .post('/api/upload')
        .send({ fileName: 'test.png', fileData: 'invalid_base64_data' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Gecersiz base64 veri formati.');
    });

    it('should block non-image MIME types', async () => {
      const fileData = 'data:text/html;base64,PGh0bWw+aGVsbG88L2h0bWw+';
      const res = await request(app)
        .post('/api/upload')
        .send({ fileName: 'hello.html', fileData });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Sadece resim yüklemelerine izin verilmektedir.');
    });

    it('should reject images larger than 5MB limit', async () => {
      const fileData = 'data:image/png;base64,' + 'A'.repeat(7 * 1024 * 1024);
      const res = await request(app)
        .post('/api/upload')
        .send({ fileName: 'huge.png', fileData });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Dosya boyutu 5MB sınırı asamaz.');
    });
  });

  // 9. Rate Limiter & Proxy Trust Tests
  describe('Express Proxy Trust Configuration', () => {
    it('should trust reverse proxy headers', () => {
      const trustProxy = app.get('trust proxy');
      expect([1, true, '1']).toContain(trustProxy);
    });
  });
});
