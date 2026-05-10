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

  CREATE TABLE IF NOT EXISTS shelves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS shelf_articles (
    shelf_id INTEGER,
    article_id TEXT NOT NULL,
    title TEXT NOT NULL,
    source TEXT,
    pubDate TEXT,
    authors TEXT,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shelf_id) REFERENCES shelves(id) ON DELETE CASCADE,
    PRIMARY KEY (shelf_id, article_id)
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

// --- Shelves API ---

export const createShelf = (name: string) => {
  const stmt = db.prepare('INSERT INTO shelves (name) VALUES (?)');
  const info = stmt.run(name);
  return { id: info.lastInsertRowid, name };
};

export const getShelves = () => {
  return db.prepare('SELECT * FROM shelves ORDER BY created_at DESC').all();
};

export const addArticleToShelf = (shelf_id: number, article: any) => {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO shelf_articles (shelf_id, article_id, title, source, pubDate, authors) 
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    shelf_id, 
    article.id, 
    article.title, 
    article.source, 
    article.pubDate, 
    JSON.stringify(article.authors)
  );
};

export const getShelfArticles = (shelf_id: number) => {
  const items: any[] = db.prepare('SELECT * FROM shelf_articles WHERE shelf_id = ? ORDER BY added_at DESC').all(shelf_id);
  return items.map(item => ({
    ...item,
    authors: JSON.parse(item.authors || '[]')
  }));
};

export const deleteShelf = (shelf_id: number) => {
  db.prepare('DELETE FROM shelves WHERE id = ?').run(shelf_id);
  // Related articles will be deleted if ON DELETE CASCADE works, 
  // but better-sqlite3 requires PRAGMA foreign_keys = ON;
  db.prepare('DELETE FROM shelf_articles WHERE shelf_id = ?').run(shelf_id);
};

