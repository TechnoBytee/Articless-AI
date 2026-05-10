import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'articless.db'));

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS searches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export const addSearchQuery = (query: string) => {
  const stmt = db.prepare('INSERT INTO searches (query) VALUES (?)');
  stmt.run(query);
};

export const getTrendingSearches = (limit: number = 10) => {
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
