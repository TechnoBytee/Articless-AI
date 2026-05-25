import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import axios from 'axios';
import { Send, ChevronLeft, Loader2, Save, BookOpen, Quote, Sparkles, Languages, ChevronDown, ChevronUp } from 'lucide-react';

export const AIWriter = () => {
  const { shelfId } = useParams<{ shelfId: string }>();
  const navigate = useNavigate();
  const { shelves } = useStore();

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // State
  const [selectedShelfId, setSelectedShelfId] = useState<string>(shelfId || (shelves[0]?.id || ''));
  const [editorContent, setEditorContent] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiActionLoading, setAiActionLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Kaydedildi');
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<any>(null);
  const saveTimeoutRef = useRef<any>(null);

  const activeShelf = shelves.find(s => s.id === selectedShelfId);

  // Set initial assistant message when activeShelf changes
  useEffect(() => {
    if (activeShelf) {
      setMessages([
        { 
          role: 'model', 
          text: `Merhaba! Ben akademik asistanınızım. "${activeShelf.name}" rafındaki makaleleri kullanarak akademik dokümanınızı yazmanıza yardımcı olabilirim. Bana makaleler hakkında sorular sorabilir, taslağınızı geliştirmemi isteyebilirsiniz.` 
        }
      ]);
    }
  }, [selectedShelfId]);

  // Load draft on selectedShelfId change
  useEffect(() => {
    if (!selectedShelfId) return;
    const loadDraft = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/ai-writer/drafts/${selectedShelfId}`);
        if (res.data && res.data.content) {
          setEditorContent(res.data.content);
        } else {
          setEditorContent('');
        }
      } catch (err) {
        console.log("No previous draft found or failed to load:", err);
        setEditorContent('');
      }
    };
    loadDraft();
  }, [selectedShelfId, API_URL]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle saving
  const handleSave = async (contentToSave: string) => {
    if (!selectedShelfId || !activeShelf) return;
    setSaveStatus('Kaydediyor...');
    try {
      await axios.post(`${API_URL}/api/ai-writer/drafts`, {
        id: selectedShelfId,
        shelf_id: selectedShelfId,
        title: activeShelf.name,
        content: contentToSave
      });
      setSaveStatus('Kaydedildi');
    } catch (err) {
      console.error("Save failed:", err);
      setSaveStatus('Kaydetme hatası');
    }
  };

  // Debounced auto-save on content change
  const handleEditorChange = (content: string) => {
    setEditorContent(content);
    setSaveStatus('Değişiklikler var...');
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      handleSave(content);
    }, 1500);
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const parseAIResponse = (text: string) => {
    const editRegex = /<edit\s+action="([^"]+)"\s+(?:target="([^"]+)"\s*)?>([\s\S]*?)<\/edit>/g;
    
    let newEditorContent = editorContent;
    let hasEdits = false;

    const cleanText = text.replace(editRegex, (fullMatch, action, target, content) => {
      hasEdits = true;
      if (action === "replace" && target) {
        newEditorContent = newEditorContent.replace(target, `<span class="agent-edit-highlight">${content}</span>`);
      } else if (action === "append") {
        newEditorContent += `<br/><br/><span class="agent-edit-highlight">${content}</span>`;
      }
      return ""; 
    });

    if (hasEdits) {
       setEditorContent(newEditorContent);
       // Trigger auto-save manually
       if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
       saveTimeoutRef.current = setTimeout(() => handleSave(newEditorContent), 1000);
    }

    return cleanText.trim();
  };

  const handleSend = async () => {
    if (!input.trim() || loading || !activeShelf) return;

    const userMessage = { role: 'user' as const, text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
        let filteredMessages = messages;
        if (filteredMessages.length > 0 && filteredMessages[0].role === 'model') {
            filteredMessages = filteredMessages.slice(1);
        }

        const payloadMessages = filteredMessages.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }));

        const contextString = activeShelf.articles.map((a, i) => 
          `[Makale ${i+1}]\nBaşlık: ${a.title}\nKaynak: ${a.source}\nYazar(lar): ${(a.authors || []).join(', ')}\nÖzet/Abstract: ${a.abstract || 'Özet bulunamadı.'}`
        ).join('\n\n');

        // Sadece arka planda AI'ye giden mesaj (kullanıcı görmez)
        payloadMessages.push({
            role: 'user',
            parts: [{ text: userMessage.text + `\n\n(SYSTEM: Aşağıdaki makaleleri ve editör içeriğini baz al.\nMakaleler:\n${contextString}\n\nMevcut Editör İçeriği:\n${editorContent})` }]
        });

        const res = await axios.post(`${API_URL}/api/ai-writer/chat`, { messages: payloadMessages });
        
        const cleanReply = parseAIResponse(res.data.reply);
        
        if (cleanReply) {
            setMessages(prev => [...prev, { role: 'model', text: cleanReply }]);
        }
    } catch (error) {
        console.error("Chat error", error);
        setMessages(prev => [...prev, { role: 'model', text: 'Üzgünüm, cevap oluşturulurken bir hata oluştu.' }]);
    } finally {
        setLoading(false);
    }
  };

  const insertIntoEditor = (text: string) => {
    const quill = quillRef.current?.getEditor();
    if (quill) {
      const range = quill.getSelection();
      const position = range ? range.index : quill.getLength();
      quill.insertText(position, `\n${text}\n`);
    }
  };

  // AI text helper functions (expand and change to academic tone)
  const handleModifyText = async (action: 'expand' | 'academic') => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;
    const range = quill.getSelection();
    if (!range || range.length === 0) {
      alert("Lütfen önce editörden bir metin seçin.");
      return;
    }
    const selectedText = quill.getText(range.index, range.length);
    setAiActionLoading(true);
    try {
      const prompt = action === 'expand' 
        ? `Aşağıdaki akademik metni, bilimsel argümanları zenginleştirerek ve akademik bir üslupla genişlet ve detaylandır. Sadece genişletilmiş metnin kendisini döndür, başında/sonunda açıklama veya tırnak işareti olmasın:\n\n${selectedText}`
        : `Aşağıdaki metni profesyonel akademik dile (academic tone) çevir. Bilimsel terimleri doğru kullan ve akademik yazım standartlarına sadık kal. Sadece çevrilmiş metnin kendisini döndür, başında/sonunda açıklama veya tırnak işareti olmasın:\n\n${selectedText}`;
      
      const res = await axios.post(`${API_URL}/api/ai-writer/chat`, {
        messages: [{ role: 'user', parts: [{ text: prompt }] }]
      });
      
      const newText = res.data.reply || '';
      quill.deleteText(range.index, range.length);
      quill.insertText(range.index, newText);
    } catch (err) {
      console.error(err);
      alert("Metin düzenlenirken bir hata oluştu.");
    } finally {
      setAiActionLoading(false);
    }
  };

  // Citation Helpers (APA & Harvard style)
  const insertReference = (article: any, style: 'APA' | 'Harvard') => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    // Get primary authors' last names
    const authors = article.authors || [];
    let citationName = 'Anonim';
    
    const getLastName = (fullName: string) => {
      const cleaned = fullName.replace(/\([^)]*\)/g, '').trim();
      const parts = cleaned.split(' ');
      return parts[parts.length - 1] || fullName;
    };

    if (authors.length > 0) {
      const firstAuthor = getLastName(authors[0]);
      if (authors.length === 1) {
        citationName = firstAuthor;
      } else if (authors.length === 2) {
        const secondAuthor = getLastName(authors[1]);
        citationName = style === 'APA' ? `${firstAuthor} & ${secondAuthor}` : `${firstAuthor} & ${secondAuthor}`;
      } else {
        citationName = `${firstAuthor} et al.`;
      }
    }

    const year = article.pubDate ? article.pubDate.split('-')[0].split(' ')[0] : 'n.d.';
    const citation = style === 'APA' ? ` (${citationName}, ${year})` : ` (${citationName} ${year})`;
    
    // 1. Insert in-text citation at cursor position
    const range = quill.getSelection();
    const position = range ? range.index : quill.getLength();
    quill.insertText(position, citation);

    // 2. Format bibliographic entry
    const formattedAuthors = authors.map((auth: string) => {
      const cleaned = auth.replace(/\([^)]*\)/g, '').trim();
      const parts = cleaned.split(' ');
      const lastName = parts.pop() || '';
      const initials = parts.map(p => p[0] ? `${p[0].toUpperCase()}.` : '').join(' ');
      return initials ? `${lastName}, ${initials}` : lastName;
    });

    let bibEntry = '';
    const tempAuthors = [...formattedAuthors];
    let authorList = tempAuthors.join(', ');
    if (tempAuthors.length > 1) {
      const last = tempAuthors.pop();
      authorList = `${tempAuthors.join(', ')} & ${last}`;
    }

    if (style === 'APA') {
      bibEntry = `${authorList || 'Anonim'} (${year}). ${article.title}. <i>${article.source}</i>. PMID: ${article.id}.`;
    } else { // Harvard
      bibEntry = `${authorList || 'Anonim'} ${year}, '${article.title}', <i>${article.source}</i>, PMID: ${article.id}.`;
    }

    // 3. Append to references section or create one if not already there
    const text = quill.getText();
    const hasBib = text.includes(article.id);
    
    if (!hasBib) {
      const refHeaderIndex = text.toLowerCase().indexOf('kaynakça');
      if (refHeaderIndex !== -1) {
        quill.clipboard.dangerouslyPasteHTML(quill.getLength(), `<p>${bibEntry}</p>`);
      } else {
        quill.clipboard.dangerouslyPasteHTML(quill.getLength(), `<p><strong>Kaynakça</strong></p><p>${bibEntry}</p>`);
      }
    }
  };

  if (shelves.length === 0) {
    return (
      <div className="p-20 text-center flex flex-col items-center justify-center bg-white/5 rounded-3xl border border-white/10 max-w-2xl mx-auto my-10">
        <BookOpen className="w-12 h-12 text-purple-400 mb-4" />
        <h3 className="text-xl font-bold mb-2">Kütüphaneniz Boş</h3>
        <p className="text-white/60 mb-6 text-sm">
          Yapay zeka yazarını kullanmak için öncelikle bir raf oluşturup içine arama sonuçlarından akademik makaleler eklemelisiniz.
        </p>
        <button onClick={() => navigate('/')} className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-all">
          Makale Ara
        </button>
      </div>
    );
  }

  return (
    <div className="h-[88vh] flex flex-col -mt-6">
      {/* Top Header Row */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
        <div className="flex items-center">
          <button onClick={() => navigate('/library')} className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm">
            <ChevronLeft className="w-5 h-5" /> Kütüphaneye Dön
          </button>
          <div className="h-5 w-[1px] bg-white/20 mx-4"></div>
          <div className="flex items-center gap-2">
            <span className="text-xs opacity-60">Aktif Raf:</span>
            <select 
              value={selectedShelfId} 
              onChange={(e) => setSelectedShelfId(e.target.value)}
              className="bg-white/5 border border-white/15 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-purple-500/50 text-white font-semibold cursor-pointer"
            >
              {shelves.map(s => (
                <option key={s.id} value={s.id} className="bg-[#15151e] text-white">
                  {s.name} ({s.articles.length} Makale)
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs opacity-50 bg-white/5 px-2 py-1 rounded border border-white/5">{saveStatus}</span>
          <button 
            onClick={() => handleSave(editorContent)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-sm font-semibold transition-all shadow-lg shadow-blue-900/20"
          >
            <Save className="w-4 h-4" /> Kaydet
          </button>
        </div>
      </div>

      {/* Main 3-Column Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden">
        
        {/* Column 1: Library & References Panel */}
        <div className="w-full lg:w-[28%] bg-[#12121a]/90 backdrop-blur-md rounded-2xl border border-white/10 flex flex-col overflow-hidden shadow-xl">
          <div className="p-4 border-b border-white/10 bg-white/5 font-bold flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-purple-400" />
            <span>Referans Havuzu</span>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar">
            {!activeShelf || activeShelf.articles.length === 0 ? (
              <div className="text-center py-12 text-white/40 text-xs">
                Bu rafta makale bulunmuyor. Arama sayfasından makale ekleyebilirsiniz.
              </div>
            ) : (
              activeShelf.articles.map(article => {
                const isExpanded = expandedArticleId === article.id;
                return (
                  <div 
                    key={article.id} 
                    className={`border rounded-xl transition-all overflow-hidden ${
                      isExpanded 
                        ? 'border-purple-500/40 bg-purple-500/5 shadow-md shadow-purple-500/5' 
                        : 'border-white/5 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    {/* Header/Title Toggle */}
                    <div 
                      onClick={() => setExpandedArticleId(isExpanded ? null : article.id)}
                      className="p-3 cursor-pointer flex justify-between items-start gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-xs text-white/90 leading-snug line-clamp-2">{article.title}</h4>
                        <div className="text-[10px] text-white/40 mt-1 truncate">
                          {article.source} • {article.pubDate?.split(' ')[0]}
                        </div>
                      </div>
                      <button className="text-white/40 hover:text-white mt-0.5">
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Details Accordion Content */}
                    {isExpanded && (
                      <div className="px-3 pb-3 pt-1 border-t border-white/5 text-[11px] space-y-2.5">
                        {article.authors && article.authors.length > 0 && (
                          <div>
                            <span className="opacity-40 block font-medium">Yazarlar:</span>
                            <span className="text-white/80">{article.authors.join(', ')}</span>
                          </div>
                        )}
                        <div>
                          <span className="opacity-40 block font-medium">Özet / Abstract:</span>
                          <p className="text-white/70 max-h-36 overflow-y-auto leading-relaxed custom-scrollbar bg-black/20 p-2 rounded border border-white/5 select-text">
                            {article.abstract || 'Özet bulunamadı.'}
                          </p>
                        </div>
                        <div className="flex gap-1.5 pt-1">
                          <button
                            onClick={() => insertReference(article, 'APA')}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-purple-600/30 text-purple-300 hover:bg-purple-600/50 hover:text-white rounded-lg transition-all font-semibold border border-purple-500/20"
                            title="APA formatında kaynakça ekle"
                          >
                            <Quote className="w-3 h-3" /> APA Ekle
                          </button>
                          <button
                            onClick={() => insertReference(article, 'Harvard')}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-blue-600/30 text-blue-300 hover:bg-blue-600/50 hover:text-white rounded-lg transition-all font-semibold border border-blue-500/20"
                            title="Harvard formatında kaynakça ekle"
                          >
                            <Quote className="w-3 h-3" /> Harvard Ekle
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Column 2: Rich Text Editor Panel */}
        <div className="flex-[1.5] bg-[#e5e7eb] rounded-2xl overflow-hidden flex flex-col border border-white/10 shadow-inner relative text-black">
          {/* Editor Header Toolbar */}
          <div className="p-3 bg-white border-b border-gray-300 flex justify-between items-center flex-wrap gap-2 text-gray-800 shadow-sm z-10">
            <span className="font-semibold text-sm">Doküman Editörü</span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleModifyText('expand')}
                disabled={aiActionLoading}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-purple-100 text-purple-700 hover:bg-purple-200 text-xs font-semibold border border-purple-200 disabled:opacity-50 transition-all cursor-pointer"
                title="Seçili metni akademik olarak genişlet"
              >
                {aiActionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>Genişlet</span>
              </button>
              <button 
                onClick={() => handleModifyText('academic')}
                disabled={aiActionLoading}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 text-xs font-semibold border border-emerald-200 disabled:opacity-50 transition-all cursor-pointer"
                title="Seçili metni akademik dile çevir"
              >
                {aiActionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Languages className="w-3.5 h-3.5" />}
                <span>Akademik Dile Çevir</span>
              </button>
            </div>
          </div>
          
          <div className="flex-1 h-full overflow-y-auto relative bg-[#f3f4f6] flex justify-center py-8 custom-scrollbar">
            <div className="editor-a4-paper">
              <ReactQuill 
                ref={quillRef}
                theme="snow" 
                value={editorContent} 
                onChange={handleEditorChange} 
                className="h-full border-none"
                placeholder="Makalenizi buraya yazın veya sağ taraftaki asistana bir şeyler yazdırıp editöre eklemesini isteyin..."
              />
            </div>
          </div>
        </div>

        {/* Column 3: AI Chat Assistant Panel */}
        <div className="w-full lg:w-[28%] bg-[#1a1a24] rounded-2xl border border-white/10 flex flex-col overflow-hidden shadow-lg">
          <div className="p-4 border-b border-white/10 font-bold bg-white/5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span>Akademik Asistan</span>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] p-3 rounded-2xl text-xs leading-relaxed flex flex-col ${
                    msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-white/10 text-gray-100 rounded-bl-none border border-white/5'
                }`}>
                  <div>{msg.text}</div>
                  {msg.role === 'model' && idx > 0 && (
                    <button 
                      onClick={() => insertIntoEditor(msg.text)}
                      className="mt-2 self-start text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold border border-blue-500/20 px-1.5 py-0.5 rounded bg-blue-900/10 hover:bg-blue-900/20 transition-all"
                    >
                      Editöre Ekle
                    </button>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/10 p-3 rounded-2xl rounded-bl-none text-white/50 flex items-center gap-2 text-xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Yazıyor...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-white/10 bg-black/20 flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Yapay zekaya bir şey sorun..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500/50 resize-none h-10 max-h-32 text-white"
              rows={1}
            />
            <button 
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 rounded-xl transition-colors flex items-center justify-center text-white"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
