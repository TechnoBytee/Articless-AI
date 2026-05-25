import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowRight, Trash2, Mic, Activity, PenTool } from 'lucide-react';
import { useState } from 'react';
import axios from 'axios';
import { GraphView } from '../components/GraphView';

export const Library = () => {
  const { shelves, removeShelf, removeArticleFromShelf } = useStore();
  const navigate = useNavigate();
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [activeGraphShelf, setActiveGraphShelf] = useState<any | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const handleQuickAudio = async (article: any) => {
    try {
      const res = await axios.post(`${API_URL}/api/article/${article.id}/process?source=${article.source}`);
      if (res.data.audioUrl) {
        setPlayingAudio(`${API_URL}${res.data.audioUrl}`);
      }
    } catch (err) {
      console.error('Ses oluşturulamadı', err);
      alert('Sesli özet oluşturulamadı.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <h2 className="text-3xl font-bold mb-8">Kütüphanem (Raflar)</h2>
      
      {playingAudio && (
        <audio autoPlay onEnded={() => setPlayingAudio(null)} src={playingAudio} className="hidden" />
      )}

      {activeGraphShelf && (
        <GraphView 
          shelfName={activeGraphShelf.name} 
          articles={activeGraphShelf.articles} 
          onClose={() => setActiveGraphShelf(null)} 
        />
      )}

      {shelves.length === 0 ? (
        <p className="opacity-70 text-center py-20">Henüz hiç raf oluşturmadınız. Arama sayfasından makale ekleyebilirsiniz.</p>
      ) : (
        <div className="space-y-12">
          {shelves.map(shelf => (
            <div key={shelf.id} className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 pb-4 border-b border-white/10 gap-4">
                <h3 className="text-2xl font-bold">{shelf.name} <span className="text-sm opacity-50 font-normal">({shelf.articles.length} makale)</span></h3>
                
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setActiveGraphShelf(shelf)}
                    className="flex items-center gap-2 px-3 py-2 bg-emerald-500/20 text-emerald-300 rounded-lg hover:bg-emerald-500/30 transition-all text-sm font-medium"
                  >
                    <Activity className="w-4 h-4" /> İlişkisel Grafik (3D/2D)
                  </button>
                  <button 
                    onClick={() => navigate(`/ai-writer/${shelf.id}`)}
                    className="flex items-center gap-2 px-3 py-2 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-all text-sm font-medium"
                  >
                    <PenTool className="w-4 h-4" /> AI Makale Yazarı
                  </button>
                  <button 
                    onClick={() => removeShelf(shelf.id)}
                    className="text-red-400 hover:text-red-300 flex items-center gap-2 text-sm transition-colors px-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {shelf.articles.length === 0 ? (
                <p className="opacity-50 text-sm">Bu raf boş.</p>
              ) : (
                <div className="grid gap-4">
                  {shelf.articles.map(article => (
                    <div key={article.id} className="flex flex-col md:flex-row justify-between md:items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex-1">
                        <h4 className="font-semibold line-clamp-1 mb-1">{article.title}</h4>
                        <div className="flex items-center gap-2 text-xs opacity-50">
                          <FileText className="w-3 h-3" />
                          <span>ID: {article.id}</span>
                          <span>• {article.source}</span>
                          <span>• {article.pubDate.split(' ')[0]}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleQuickAudio(article)}
                          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-all"
                        >
                          <Mic className="w-4 h-4" /> Hızlı Dinle
                        </button>
                        <button
                          onClick={() => navigate(`/presentation/${encodeURIComponent(encodeURIComponent(article.id))}?title=${encodeURIComponent(article.title)}&source=${article.source}`)}
                          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-white/10 hover:bg-white/20 transition-all"
                        >
                          Sunum <ArrowRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeArticleFromShelf(shelf.id, article.id)}
                          className="p-2 text-white/50 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
