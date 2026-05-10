"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const database_1 = require("./database");
const pubmed_1 = require("./services/pubmed");
const gemini_1 = require("./services/gemini");
const tts_1 = require("./services/tts");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Serve audio files statically
app.use('/audio', express_1.default.static(path_1.default.join(__dirname, '../../data/audio')));
// --- API Endpoints ---
// 1. Get Trending Searches
app.get('/api/trends', (req, res) => {
    try {
        const trends = (0, database_1.getTrendingSearches)(10);
        res.json(trends);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch trends' });
    }
});
// 2. Search PubMed Articles
app.get('/api/search', async (req, res) => {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
        res.status(400).json({ error: 'Query parameter "q" is required' });
        return;
    }
    try {
        // Add to trending
        (0, database_1.addSearchQuery)(q);
        const articles = await (0, pubmed_1.searchArticles)(q, 10);
        res.json(articles);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to search articles' });
    }
});
// 3. Process Article (Fetch, Summarize, TTS)
app.post('/api/article/:id/process', async (req, res) => {
    const { id } = req.params;
    try {
        // a. Fetch abstract
        const abstract = await (0, pubmed_1.getArticleAbstract)(id);
        if (!abstract || abstract.trim().length === 0) {
            res.status(404).json({ error: 'No abstract available for this article.' });
            return;
        }
        // b. Summarize with Gemini
        const summary = await (0, gemini_1.summarizeArticle)(abstract);
        // c. Generate TTS Audio
        const audioFilename = await (0, tts_1.generateAudio)(summary);
        const audioUrl = `/audio/${audioFilename}`;
        res.json({
            originalAbstract: abstract,
            summary,
            audioUrl
        });
    }
    catch (error) {
        console.error('Process error:', error);
        res.status(500).json({ error: error.message || 'Failed to process article' });
    }
});
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
