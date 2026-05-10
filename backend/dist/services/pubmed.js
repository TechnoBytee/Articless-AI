"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getArticleAbstract = exports.searchArticles = void 0;
const axios_1 = __importDefault(require("axios"));
const PUBMED_API_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const searchArticles = async (query, limit = 10) => {
    try {
        // 1. Search for IDs
        const searchRes = await axios_1.default.get(`${PUBMED_API_BASE}/esearch.fcgi`, {
            params: {
                db: 'pubmed',
                term: query,
                retmode: 'json',
                retmax: limit,
            },
        });
        const ids = searchRes.data.esearchresult.idlist;
        if (!ids || ids.length === 0)
            return [];
        // 2. Fetch summaries for those IDs
        const summaryRes = await axios_1.default.get(`${PUBMED_API_BASE}/esummary.fcgi`, {
            params: {
                db: 'pubmed',
                id: ids.join(','),
                retmode: 'json',
            },
        });
        const articles = [];
        const result = summaryRes.data.result;
        for (const id of ids) {
            if (result[id]) {
                const item = result[id];
                articles.push({
                    id,
                    title: item.title,
                    source: item.source,
                    pubDate: item.pubdate,
                    authors: item.authors ? item.authors.map((a) => a.name) : [],
                });
            }
        }
        return articles;
    }
    catch (error) {
        console.error('PubMed search error:', error);
        throw new Error('Failed to search PubMed articles.');
    }
};
exports.searchArticles = searchArticles;
const getArticleAbstract = async (id) => {
    try {
        const fetchRes = await axios_1.default.get(`${PUBMED_API_BASE}/efetch.fcgi`, {
            params: {
                db: 'pubmed',
                id: id,
                retmode: 'text',
                rettype: 'abstract',
            },
        });
        return fetchRes.data;
    }
    catch (error) {
        console.error(`PubMed fetch error for ID ${id}:`, error);
        throw new Error('Failed to fetch article abstract.');
    }
};
exports.getArticleAbstract = getArticleAbstract;
