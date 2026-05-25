import { useStore } from '../store/useStore';

describe('useStore - Zustand State Management', () => {
  beforeEach(() => {
    // Reset state manually before each test since it's a singleton store
    useStore.setState({ shelves: [] });
  });

  it('should add a new shelf successfully', () => {
    const { addShelf } = useStore.getState();
    
    addShelf('Quantum Mechanics');
    
    const { shelves } = useStore.getState();
    expect(shelves).toHaveLength(1);
    expect(shelves[0].name).toBe('Quantum Mechanics');
    expect(shelves[0].articles).toEqual([]);
    expect(shelves[0].id).toBeDefined();
  });

  it('should remove a shelf successfully', () => {
    const { addShelf, removeShelf } = useStore.getState();
    
    addShelf('Shelf to delete');
    const createdShelf = useStore.getState().shelves[0];
    
    removeShelf(createdShelf.id);
    
    const { shelves } = useStore.getState();
    expect(shelves).toHaveLength(0);
  });

  it('should add an article to a specific shelf', () => {
    const { addShelf, addArticleToShelf } = useStore.getState();
    
    addShelf('Astrophysics');
    const shelf = useStore.getState().shelves[0];
    
    const newArticle = {
      id: '12345',
      title: 'Black Holes Study',
      source: 'arxiv',
      pubDate: '2026',
      abstract: 'An abstract detailing stellar-mass black holes.'
    };
    
    addArticleToShelf(shelf.id, newArticle);
    
    const updatedShelf = useStore.getState().shelves[0];
    expect(updatedShelf.articles).toHaveLength(1);
    expect(updatedShelf.articles[0]).toEqual(newArticle);
  });

  it('should prevent duplicate articles in the same shelf', () => {
    const { addShelf, addArticleToShelf } = useStore.getState();
    
    addShelf('Astrophysics');
    const shelf = useStore.getState().shelves[0];
    
    const newArticle = {
      id: '12345',
      title: 'Black Holes Study',
      source: 'arxiv',
      pubDate: '2026',
      abstract: 'An abstract detailing stellar-mass black holes.'
    };
    
    // Add twice
    addArticleToShelf(shelf.id, newArticle);
    addArticleToShelf(shelf.id, newArticle);
    
    const updatedShelf = useStore.getState().shelves[0];
    expect(updatedShelf.articles).toHaveLength(1);
  });

  it('should remove an article from a specific shelf', () => {
    const { addShelf, addArticleToShelf, removeArticleFromShelf } = useStore.getState();
    
    addShelf('Astrophysics');
    const shelf = useStore.getState().shelves[0];
    
    const newArticle = {
      id: '12345',
      title: 'Black Holes Study',
      source: 'arxiv',
      pubDate: '2026'
    };
    
    addArticleToShelf(shelf.id, newArticle);
    removeArticleFromShelf(shelf.id, '12345');
    
    const updatedShelf = useStore.getState().shelves[0];
    expect(updatedShelf.articles).toHaveLength(0);
  });
});
