import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ShelfArticle {
  id: string;
  title: string;
  source: string;
  pubDate: string;
  abstract?: string;
  authors?: string[];
}

export interface Shelf {
  id: string;
  name: string;
  articles: ShelfArticle[];
}

interface StoreState {
  shelves: Shelf[];
  addShelf: (name: string) => void;
  removeShelf: (id: string) => void;
  addArticleToShelf: (shelfId: string, article: ShelfArticle) => void;
  removeArticleFromShelf: (shelfId: string, articleId: string) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      shelves: [],
      addShelf: (name) =>
        set((state) => ({
          shelves: [...state.shelves, { id: Date.now().toString(), name, articles: [] }],
        })),
      removeShelf: (id) =>
        set((state) => ({
          shelves: state.shelves.filter((shelf) => shelf.id !== id),
        })),
      addArticleToShelf: (shelfId, article) =>
        set((state) => ({
          shelves: state.shelves.map((shelf) => {
            if (shelf.id === shelfId) {
              // Check if already exists
              if (shelf.articles.some((a) => a.id === article.id)) return shelf;
              return { ...shelf, articles: [...shelf.articles, article] };
            }
            return shelf;
          }),
        })),
      removeArticleFromShelf: (shelfId, articleId) =>
        set((state) => ({
          shelves: state.shelves.map((shelf) => {
            if (shelf.id === shelfId) {
              return {
                ...shelf,
                articles: shelf.articles.filter((a) => a.id !== articleId),
              };
            }
            return shelf;
          }),
        })),
    }),
    {
      name: 'articless-shelves',
    }
  )
);
