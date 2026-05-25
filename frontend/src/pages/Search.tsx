import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FileText, ArrowRight, Loader2, Plus, X, Globe, Clock, Trash2 } from 'lucide-react';
import { SourceFilter } from '../components/SourceFilter';
import { SourceBadge } from '../components/SourceBadge';
import type { SourceType } from '../components/SourceBadge';
import { useStore } from '../store/useStore';

interface Article {
  id: string;
  title: string;
  source: string;
  pubDate: string;
  authors: string[];
}

const ShelfModal = ({ article, onClose }: { article: Article, onClose: () => void }) => {
  const { shelves, addShelf, addArticleToShelf, removeShelf, removeArticleFromShelf } = useStore();
  const [newShelfName, setNewShelfName] = useState('');
  const [loadingAbstract, setLoadingAbstract] = useState(false);
  const [expandedShelfId, setExpandedShelfId] = useState<string | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const handleAdd = async (shelfId: string) => {
    setLoadingAbstract(true);
    let abstract = '';
    try {
      const res = await axios.post(`${API_URL}/api/article/${article.id}/process?source=${article.source}`);
      abstract = res.data.originalAbstract || '';
    } catch (err) {
      console.error("Failed to fetch abstract:", err);
    }
    
    addArticleToShelf(shelfId, {
      id: article.id,
      title: article.title,
      source: article.source,
      pubDate: article.pubDate,
      abstract: abstract,
      authors: article.authors
    });
    setLoadingAbstract(false);
    onClose();
  };

  const handleCreate = () => {
    if (newShelfName.trim()) {
      addShelf(newShelfName);
      setNewShelfName('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1a1a24] border border-white/10 p-6 rounded-2xl w-full max-w-sm relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white">
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-xl font-bold mb-4">Rafa Ekle</h3>
        <p className="text-sm opacity-70 mb-4 line-clamp-1">{article.title}</p>
        
        {loadingAbstract ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-2">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="text-sm opacity-70 text-center text-xs">Makale ozeti aliniyor...</span>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
            {shelves.length === 0 && <p className="text-sm opacity-50 text-center py-2">Henuz rafiniz yok.</p>}
            {shelves.map(shelf => (
              <div key={shelf.id} className="border border-white/5 rounded-lg overflow-hidden bg-white/5">
                <div className="flex items-center justify-between p-2 hover:bg-white/10 transition-all">
                  <button
                    onClick={() => handleAdd(shelf.id)}
                    className="flex-1 text-left px-2 py-1 text-sm font-semibold"
                  >
                    {shelf.name} <span className="text-xs opacity-50 font-normal">({shelf.articles.length} makale)</span>
                  </button>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setExpandedShelfId(expandedShelfId === shelf.id ? null : shelf.id)}
                      className="p-1 hover:bg-white/15 rounded text-xs opacity-60 hover:opacity-100"
                      title="Makaleleri Göster"
                    >
                      {expandedShelfId === shelf.id ? 'Gizle' : 'Göster'}
                    </button>
                    <button 
                      onClick={() => removeShelf(shelf.id)}
                      className="p-1 hover:bg-red-500/20 rounded text-red-400"
                      title="Rafı Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {expandedShelfId === shelf.id && (
                  <div className="bg-black/20 p-2 border-t border-white/5 space-y-1 text-xs">
                    {shelf.articles.length === 0 ? (
                      <div className="text-white/40 p-1">Bu raf boş.</div>
                    ) : (
                      shelf.articles.map(a => (
                        <div key={a.id} className="flex items-center justify-between gap-2 p-1 hover:bg-white/5 rounded">
                          <span className="truncate flex-1" title={a.title}>{a.title}</span>
                          <button 
                            onClick={() => removeArticleFromShelf(shelf.id, a.id)}
                            className="text-red-400/70 hover:text-red-400 p-0.5 hover:bg-white/10 rounded"
                            title="Raftan Kaldır"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 border-t border-white/10 pt-4">
          <input
            type="text"
            placeholder="Yeni raf adı..."
            value={newShelfName}
            onChange={(e) => setNewShelfName(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/30"
          />
          <button onClick={handleCreate} className="px-3 py-2 bg-white/10 rounded-lg hover:bg-white/20">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const Search = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const isFetching = useRef(false);
  const offsetRef = useRef(0);
  const navigate = useNavigate();
  const [selectedArticleForShelf, setSelectedArticleForShelf] = useState<Article | null>(null);
  const [selectedSources, setSelectedSources] = useState<SourceType[]>(['pubmed', 'semantic-scholar', 'openalex', 'arxiv', 'dergipark', 'tr-dizin', 'yoktez']);
  const [sourceStats, setSourceStats] = useState<any[]>([]);
  const [elapsed, setElapsed] = useState(0);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    if (!query) return;

    const controller = new AbortController();

    const fetchArticles = async () => {
      setLoading(true);
      setError('');
      setOffset(0);
      offsetRef.current = 0;
      try {
        const res = await axios.get(`${API_URL}/api/search?q=${encodeURIComponent(query)}&offset=0&sources=${selectedSources.join(',')}`, {
          signal: controller.signal
        });
        const data = res.data;
        const fetchedArticles = data.articles || data || [];
        setArticles(Array.isArray(fetchedArticles) ? fetchedArticles : []);
        if (fetchedArticles.length < 10) setHasMore(false);
        else setHasMore(true);
      } catch (err: any) {
        if (axios.isCancel(err)) {
          console.log('Request canceled');
        } else {
          setError('Makaleler aranirken bir hata olustu. (Lutfen biraz bekleyip tekrar deneyin)');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();

    return () => {
      controller.abort();
    };
  }, [query, selectedSources]);

  const loadMore = async () => {
    if (!query || loadingMore || isFetching.current) return;
    isFetching.current = true;
    setLoadingMore(true);
    const nextOffset = offsetRef.current + 10;
    try {
      const res = await axios.get(`${API_URL}/api/search?q=${encodeURIComponent(query)}&offset=${nextOffset}&sources=${selectedSources.join(',')}`);
      const data = res.data;
      const moreArticles = data.articles || data || [];
      setArticles(prev => [...prev, ...(Array.isArray(moreArticles) ? moreArticles : [])]);
      setOffset(nextOffset);
      offsetRef.current = nextOffset;
      if (moreArticles.length < 10) setHasMore(false);
    } catch (err: any) {
        console.error(err);
    } finally {
      setLoadingMore(false);
      isFetching.current = false;
    }
  };

  return (
    <div>
      {selectedArticleForShelf && (
        <ShelfModal 
          article={selectedArticleForShelf} 
          onClose={() => setSelectedArticleForShelf(null)} 
        />
      )}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <SourceFilter selectedSources={selectedSources} onChange={setSelectedSources} />
        {elapsed > 0 && (
          <span className="text-xs opacity-50 flex items-center gap-1">
            <Clock className="w-3 h-3" /> {elapsed}ms
          </span>
        )}
      </div>
      <h2 className="text-3xl font-bold mb-8">
        "<span className="opacity-80">{query}</span>" için sonuçlar
      </h2>

      {loading && (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin opacity-50" />
        </div>
      )}

      {error && <div className="text-red-400 bg-red-900/20 p-4 rounded-lg">{error}</div>}

      {!loading && !error && articles.length === 0 && (
        <p className="opacity-70">Sonuç bulunamadı.</p>
      )}

      <div className="grid gap-4">
        {articles.map((article, idx) => (
          <div
            key={`${article.id}-${idx}`}
            className="p-6 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
          >
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-2 line-clamp-2">{article.title}</h3>
              <p className="text-sm opacity-60 mb-2 flex items-center gap-2">
                <SourceBadge source={article.source} /> {article.pubDate.split(' ')[0]}
              </p>
              <div className="flex items-center gap-2 text-xs opacity-50">
                <FileText className="w-4 h-4" />
                <span>ID: {article.id}</span>
                {article.authors.length > 0 && <span>• {article.authors.slice(0, 3).join(', ')}{article.authors.length > 3 ? ' et al.' : ''}</span>}
              </div>
            </div>
            <div className="flex gap-2">
               <button
                 onClick={() => setSelectedArticleForShelf(article)}
                 className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all whitespace-nowrap"
                 title="Rafa Ekle"
               >
                 <Plus className="w-4 h-4" /> Rafa Ekle
               </button>
               <button
                 onClick={() => navigate(`/presentation/${encodeURIComponent(encodeURIComponent(article.id))}?title=${encodeURIComponent(article.title)}&source=${article.source}`)}
                 className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all whitespace-nowrap"
               >
                 Özetle & Sun <ArrowRight className="w-4 h-4" />
               </button>
            </div>
          </div>
        ))}
      </div>

      {!loading && articles.length > 0 && hasMore && (
          <div className="mt-8 flex justify-center">
              <button 
                  onClick={loadMore}
                  disabled={loadingMore || isFetching.current}
                  className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all font-semibold flex items-center gap-2"
              >
                  {loadingMore ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Daha Fazla Yükle'}
              </button>
          </div>
      )}
    </div>
  );
};
