import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FileText, ArrowRight, Loader2, Plus, X } from 'lucide-react';
import { useStore } from '../store/useStore';

interface Article {
  id: string;
  title: string;
  source: string;
  pubDate: string;
  authors: string[];
}

const ShelfModal = ({ article, onClose }: { article: Article, onClose: () => void }) => {
  const { shelves, addShelf, addArticleToShelf } = useStore();
  const [newShelfName, setNewShelfName] = useState('');

  const handleAdd = (shelfId: string) => {
    addArticleToShelf(shelfId, {
      id: article.id,
      title: article.title,
      source: article.source,
      pubDate: article.pubDate
    });
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
        
        <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
          {shelves.length === 0 && <p className="text-sm opacity-50 text-center py-2">Henüz rafınız yok.</p>}
          {shelves.map(shelf => (
            <button
              key={shelf.id}
              onClick={() => handleAdd(shelf.id)}
              className="w-full text-left px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
            >
              {shelf.name} <span className="text-xs opacity-50 ml-2">({shelf.articles.length} makale)</span>
            </button>
          ))}
        </div>

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
  const navigate = useNavigate();
  const [selectedArticleForShelf, setSelectedArticleForShelf] = useState<Article | null>(null);

  useEffect(() => {
    if (!query) return;

    const controller = new AbortController();

    const fetchArticles = async () => {
      setLoading(true);
      setError('');
      setOffset(0);
      try {
        const res = await axios.get(`http://localhost:5000/api/search?q=${encodeURIComponent(query)}&offset=0`, {
          signal: controller.signal
        });
        setArticles(res.data);
        if (res.data.length < 10) setHasMore(false);
        else setHasMore(true);
      } catch (err: any) {
        if (axios.isCancel(err)) {
          console.log('Request canceled');
        } else {
          setError('Makaleler aranırken bir hata oluştu. (Lütfen biraz bekleyip tekrar deneyin)');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();

    return () => {
      controller.abort();
    };
  }, [query]);

  const loadMore = async () => {
    if (!query || loadingMore) return;
    const nextOffset = offset + 10;
    setLoadingMore(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/search?q=${encodeURIComponent(query)}&offset=${nextOffset}`);
      setArticles(prev => [...prev, ...res.data]);
      setOffset(nextOffset);
      if (res.data.length < 10) setHasMore(false);
    } catch (err: any) {
        console.error(err);
    } finally {
      setLoadingMore(false);
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
              <p className="text-sm opacity-60 mb-2">
                {article.source} • {article.pubDate.split(' ')[0]}
              </p>
              <div className="flex items-center gap-2 text-xs opacity-50">
                <FileText className="w-4 h-4" />
                <span>PMID: {article.id}</span>
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
                 onClick={() => navigate(`/presentation/${article.id}?title=${encodeURIComponent(article.title)}`)}
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
                  disabled={loadingMore}
                  className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all font-semibold flex items-center gap-2"
              >
                  {loadingMore ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Daha Fazla Yükle'}
              </button>
          </div>
      )}
    </div>
  );
};
