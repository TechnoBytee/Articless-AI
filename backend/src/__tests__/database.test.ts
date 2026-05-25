import Database from 'better-sqlite3';
import { saveDraft, getDraftById, deleteDraft, getDraftsByShelfId, WriterDraft } from '../database';

// Mock better-sqlite3
jest.mock('better-sqlite3', () => {
  const mRun = jest.fn();
  const mGet = jest.fn();
  const mAll = jest.fn();
  const mPrepare = jest.fn().mockReturnValue({
    run: mRun,
    get: mGet,
    all: mAll,
  });
  const mExec = jest.fn();

  return jest.fn().mockImplementation(() => {
    return {
      prepare: mPrepare,
      exec: mExec,
    };
  });
});

describe('Database Drafts CRUD', () => {
  let mockDbInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    const MockedDatabase = require('better-sqlite3');
    mockDbInstance = new MockedDatabase();
  });

  it('should save or update a draft', () => {
    const draft: WriterDraft = {
      id: 'draft-123',
      shelf_id: 'shelf-456',
      title: 'Test Draft',
      content: 'Draft content here'
    };

    saveDraft(draft);

    expect(mockDbInstance.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO writer_drafts'));
    expect(mockDbInstance.prepare().run).toHaveBeenCalledWith(draft);
  });

  it('should get draft by id', () => {
    const mockDraft: WriterDraft = {
      id: 'draft-123',
      shelf_id: 'shelf-456',
      title: 'Test Draft',
      content: 'Draft content here'
    };
    mockDbInstance.prepare().get.mockReturnValueOnce(mockDraft);

    const result = getDraftById('draft-123');

    expect(mockDbInstance.prepare).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM writer_drafts WHERE id = ?'));
    expect(mockDbInstance.prepare().get).toHaveBeenCalledWith('draft-123');
    expect(result).toEqual(mockDraft);
  });

  it('should delete a draft', () => {
    deleteDraft('draft-123');

    expect(mockDbInstance.prepare).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM writer_drafts WHERE id = ?'));
    expect(mockDbInstance.prepare().run).toHaveBeenCalledWith('draft-123');
  });

  it('should get drafts by shelf_id', () => {
    const mockDrafts: WriterDraft[] = [
      { id: '1', shelf_id: 'shelf-456', title: 'Draft 1', content: '' },
      { id: '2', shelf_id: 'shelf-456', title: 'Draft 2', content: '' }
    ];
    mockDbInstance.prepare().all.mockReturnValueOnce(mockDrafts);

    const result = getDraftsByShelfId('shelf-456');

    expect(mockDbInstance.prepare).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM writer_drafts WHERE shelf_id = ?'));
    expect(mockDbInstance.prepare().all).toHaveBeenCalledWith('shelf-456');
    expect(result).toEqual(mockDrafts);
  });
});
