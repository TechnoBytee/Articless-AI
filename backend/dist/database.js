"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTrendingSearches = exports.addSearchQuery = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Ensure data directory exists
const dataDir = path_1.default.join(__dirname, '../../data');
if (!fs_1.default.existsSync(dataDir)) {
    fs_1.default.mkdirSync(dataDir, { recursive: true });
}
const db = new better_sqlite3_1.default(path_1.default.join(dataDir, 'articless.db'));
// Initialize table
db.exec(`
  CREATE TABLE IF NOT EXISTS searches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);
const addSearchQuery = (query) => {
    const stmt = db.prepare('INSERT INTO searches (query) VALUES (?)');
    stmt.run(query);
};
exports.addSearchQuery = addSearchQuery;
const getTrendingSearches = (limit = 10) => {
    const stmt = db.prepare(`
    SELECT query, COUNT(*) as count 
    FROM searches 
    WHERE timestamp >= date('now', '-7 days')
    GROUP BY query 
    ORDER BY count DESC 
    LIMIT ?
  `);
    return stmt.all(limit);
};
exports.getTrendingSearches = getTrendingSearches;
