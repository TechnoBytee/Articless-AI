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

  CREATE TABLE IF NOT EXISTS writer_drafts (
    id TEXT PRIMARY KEY,
    shelf_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

export interface WriterDraft {
  id: string;
  shelf_id: string;
  title: string;
  content: string;
  created_at?: string;
  updated_at?: string;
}

export const saveDraft = (draft: WriterDraft) => {
  const stmt = db.prepare(`
    INSERT INTO writer_drafts (id, shelf_id, title, content, updated_at)
    VALUES (@id, @shelf_id, @title, @content, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      content = excluded.content,
      updated_at = CURRENT_TIMESTAMP
  `);
  stmt.run(draft);
};

export const getDraftById = (id: string): WriterDraft | undefined => {
  const stmt = db.prepare('SELECT * FROM writer_drafts WHERE id = ?');
  return stmt.get(id) as WriterDraft | undefined;
};

export const deleteDraft = (id: string) => {
  const stmt = db.prepare('DELETE FROM writer_drafts WHERE id = ?');
  stmt.run(id);
};

export const getDraftsByShelfId = (shelfId: string): WriterDraft[] => {
  const stmt = db.prepare('SELECT * FROM writer_drafts WHERE shelf_id = ? ORDER BY updated_at DESC');
  return stmt.all(shelfId) as WriterDraft[];
};
