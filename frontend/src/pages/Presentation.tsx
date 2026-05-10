import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Loader2, Plus, Image as ImageIcon, Type, Trash2, ChevronLeft, ChevronRight, Send, Download } from 'lucide-react';
import pptxgen from 'pptxgenjs';

interface SlideElement {
  id: string;
  type: 'text' | 'image';
  content: string;
  style: React.CSSProperties;
}

interface Slide {
  id: string;
  elements: SlideElement[];
}

export const Presentation = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const title = searchParams.get('title') || 'Makale Sunumu';
  const navigate = useNavigate();

  // Editor State
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Chat State
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([
    { role: 'model', text: 'Merhaba! Ben sunum asistanınız. Slaytlara eklemek istediğiniz içerikleri bana yazabilirsiniz. Örneğin: "Bana bu makalenin giriş bölümü için bir slayt metni hazırla."' }
  ]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initial Load - We fetch abstract and let AI generate initial slides
  useEffect(() => {
    if (!id) return;

    const generateInitial = async () => {
      setLoadingInitial(true);
      try {
        const res = await axios.post(`http://localhost:5000/api/article/${id}/presentation`);
        const initialSlidesData = res.data.slides || [];
        
        // Convert plain text to interactive elements
        const initialSlides: Slide[] = initialSlidesData.map((s: any, idx: number) => ({
          id: `slide-${idx}`,
          elements: [
            {
              id: `el-${Date.now()}-${idx}`,
              type: 'text',
              content: s.text,
              style: { top: '30%', left: '10%', width: '80%', fontSize: '24px', fontWeight: '500', textAlign: 'center', color: '#ffffff' }
            }
          ]
        }));
        
        // Add a title slide
        initialSlides.unshift({
          id: 'slide-title',
          elements: [
            {
              id: `el-title`,
              type: 'text',
              content: title,
              style: { top: '40%', left: '10%', width: '80%', fontSize: '40px', fontWeight: 'bold', textAlign: 'center', color: '#ffffff' }
            }
          ]
        });

        setSlides(initialSlides);
      } catch (err: any) {
        console.error(err);
        setSlides([{ id: 's1', elements: [{ id: 'e1', type: 'text', content: 'İçerik yüklenemedi. AI asistanı kullanarak yeni slaytlar oluşturabilirsiniz.', style: { top: '40%', left: '10%', width: '80%', fontSize: '24px', color: '#ffffff' } }] }]);
      } finally {
        setLoadingInitial(false);
      }
    };

    generateInitial();
  }, [id, title]);

  const currentSlide = slides[currentSlideIndex];

  // --- Element Modification Handlers ---
  const updateElementStyle = (slideId: string, elementId: string, newStyle: React.CSSProperties) => {
    setSlides(prev => prev.map(s => {
      if (s.id !== slideId) return s;
      return {
        ...s,
        elements: s.elements.map(e => e.id === elementId ? { ...e, style: { ...e.style, ...newStyle } } : e)
      };
    }));
  };

  const updateElementContent = (slideId: string, elementId: string, newContent: string) => {
    setSlides(prev => prev.map(s => {
      if (s.id !== slideId) return s;
      return {
        ...s,
        elements: s.elements.map(e => e.id === elementId ? { ...e, content: newContent } : e)
      };
    }));
  };

  const addTextElement = () => {
    if (!currentSlide) return;
    const newEl: SlideElement = {
      id: `el-${Date.now()}`,
      type: 'text',
      content: 'Yeni Metin',
      style: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '24px', color: '#ffffff', width: 'auto' }
    };
    setSlides(prev => prev.map((s, idx) => idx === currentSlideIndex ? { ...s, elements: [...s.elements, newEl] } : s));
    setSelectedElementId(newEl.id);
  };

  const addImageElement = () => {
    if (!currentSlide) return;
    const url = prompt('Görsel URL adresini girin:');
    if (!url) return;
    const newEl: SlideElement = {
      id: `el-${Date.now()}`,
      type: 'image',
      content: url,
      style: { top: '10%', left: '10%', width: '300px' }
    };
    setSlides(prev => prev.map((s, idx) => idx === currentSlideIndex ? { ...s, elements: [...s.elements, newEl] } : s));
  };

  const deleteElement = () => {
    if (!selectedElementId || !currentSlide) return;
    setSlides(prev => prev.map((s, idx) => idx === currentSlideIndex ? { ...s, elements: s.elements.filter(e => e.id !== selectedElementId) } : s));
    setSelectedElementId(null);
  };

  const addNewSlide = () => {
    setSlides(prev => [...prev, { id: `slide-${Date.now()}`, elements: [] }]);
    setCurrentSlideIndex(slides.length);
  };

  // --- Export ---
  const exportPPTX = () => {
    const pres = new pptxgen();
    pres.author = 'Articless AI';
    
    slides.forEach((s) => {
      let sl = pres.addSlide();
      sl.background = { color: '1a1a24' };
      
      s.elements.forEach(e => {
        // Very basic pptx conversion calculation
        const top = parseFloat(e.style.top as string) || 0;
        const left = parseFloat(e.style.left as string) || 0;
        
        if (e.type === 'text') {
           sl.addText(e.content, { 
             x: `${left}%`, y: `${top}%`, w: '80%', 
             fontSize: parseInt(e.style.fontSize as string) || 24, 
             color: 'ffffff' 
           });
        } else if (e.type === 'image') {
           sl.addImage({ path: e.content, x: `${left}%`, y: `${top}%`, w: '40%' });
        }
      });
    });

    pres.writeFile({ fileName: `Articless_${id}.pptx` });
  };

  // --- Chat Handler ---
  const handleSend = async () => {
    if (!input.trim() || chatLoading) return;

    const userMsg = { role: 'user' as const, text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setChatLoading(true);

    try {
        let filteredMessages = messages;
        if (filteredMessages.length > 0 && filteredMessages[0].role === 'model') {
            filteredMessages = filteredMessages.slice(1);
        }
        const payloadMessages = filteredMessages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
        payloadMessages.push({ role: 'user', parts: [{ text: userMsg.text }] });

        const res = await axios.post('http://localhost:5000/api/presentation/chat', { messages: payloadMessages });
        setMessages(prev => [...prev, { role: 'model', text: res.data.reply }]);
    } catch (error) {
        setMessages(prev => [...prev, { role: 'model', text: 'Hata oluştu.' }]);
    } finally {
        setChatLoading(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-blue-400 mb-4" />
        <p className="text-xl animate-pulse">Profesyonel sunum editörü hazırlanıyor...</p>
      </div>
    );
  }

  return (
    <div className="h-[85vh] flex flex-col -mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" /> Geri
          </button>
          <h2 className="text-xl font-bold ml-4">Sunum Editörü</h2>
        </div>
        <button onClick={exportPPTX} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all text-sm font-medium">
          <Download className="w-4 h-4" /> PPTX İndir
        </button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
        
        {/* Left Panel: Canvas Editor */}
        <div className="flex-[2.5] flex flex-col gap-4 overflow-hidden">
          
          {/* Toolbar */}
          <div className="bg-white/5 border border-white/10 p-2 rounded-xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button onClick={addTextElement} className="flex items-center gap-1 px-3 py-1.5 hover:bg-white/10 rounded-lg text-sm transition-all"><Type className="w-4 h-4"/> Metin</button>
              <button onClick={addImageElement} className="flex items-center gap-1 px-3 py-1.5 hover:bg-white/10 rounded-lg text-sm transition-all"><ImageIcon className="w-4 h-4"/> Görsel</button>
              
              <div className="w-[1px] h-6 bg-white/20 mx-2"></div>
              
              {selectedElementId && (
                <>
                  <input 
                    type="number" 
                    placeholder="Boyut" 
                    className="w-16 bg-black/40 border border-white/20 rounded px-2 py-1 text-sm text-white"
                    onChange={(e) => updateElementStyle(currentSlide.id, selectedElementId, { fontSize: `${e.target.value}px` })}
                    title="Yazı Boyutu"
                  />
                  <div className="flex gap-1">
                    <button onClick={() => updateElementStyle(currentSlide.id, selectedElementId, { top: `${parseFloat(currentSlide.elements.find(e=>e.id===selectedElementId)?.style.top as string || '0') - 5}%` })} className="px-2 bg-white/10 hover:bg-white/20 rounded">↑</button>
                    <button onClick={() => updateElementStyle(currentSlide.id, selectedElementId, { top: `${parseFloat(currentSlide.elements.find(e=>e.id===selectedElementId)?.style.top as string || '0') + 5}%` })} className="px-2 bg-white/10 hover:bg-white/20 rounded">↓</button>
                    <button onClick={() => updateElementStyle(currentSlide.id, selectedElementId, { left: `${parseFloat(currentSlide.elements.find(e=>e.id===selectedElementId)?.style.left as string || '0') - 5}%` })} className="px-2 bg-white/10 hover:bg-white/20 rounded">←</button>
                    <button onClick={() => updateElementStyle(currentSlide.id, selectedElementId, { left: `${parseFloat(currentSlide.elements.find(e=>e.id===selectedElementId)?.style.left as string || '0') + 5}%` })} className="px-2 bg-white/10 hover:bg-white/20 rounded">→</button>
                  </div>
                  <button onClick={deleteElement} className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                </>
              )}
            </div>
            
            <div className="text-sm opacity-50 px-4">Slayt {currentSlideIndex + 1} / {slides.length}</div>
          </div>

          {/* Canvas */}
          <div className="flex-1 bg-gradient-to-br from-[#1a1a24] to-[#0f0f15] border border-white/10 rounded-2xl relative overflow-hidden shadow-2xl">
            {currentSlide?.elements.map(el => (
              <div 
                key={el.id}
                onClick={() => setSelectedElementId(el.id)}
                style={{ ...el.style, position: 'absolute' }}
                className={`cursor-pointer ${selectedElementId === el.id ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#1a1a24]' : 'hover:ring-1 ring-white/30'} transition-shadow`}
              >
                {el.type === 'text' ? (
                  <textarea
                    value={el.content}
                    onChange={(e) => updateElementContent(currentSlide.id, el.id, e.target.value)}
                    className="bg-transparent border-none outline-none resize-none overflow-hidden w-full text-center"
                    style={{ fontSize: el.style.fontSize, color: el.style.color, fontWeight: el.style.fontWeight }}
                    rows={el.content.split('\n').length || 1}
                  />
                ) : (
                  <img src={el.content} alt="slide visual" className="w-full h-full object-contain pointer-events-none" />
                )}
              </div>
            ))}
          </div>

          {/* Bottom Thumbnails */}
          <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
            {slides.map((s, idx) => (
              <div 
                key={s.id}
                onClick={() => { setCurrentSlideIndex(idx); setSelectedElementId(null); }}
                className={`flex-shrink-0 w-32 h-20 rounded-lg border-2 cursor-pointer transition-all ${idx === currentSlideIndex ? 'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'border-white/10 hover:border-white/30'} bg-[#1a1a24] relative`}
              >
                <div className="absolute inset-0 flex items-center justify-center text-xs opacity-50">Slayt {idx + 1}</div>
              </div>
            ))}
            <button 
              onClick={addNewSlide}
              className="flex-shrink-0 w-32 h-20 rounded-lg border-2 border-dashed border-white/20 hover:border-white/50 flex items-center justify-center text-white/50 hover:text-white transition-all cursor-pointer"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Right Panel: AI Chat */}
        <div className="flex-1 bg-[#1a1a24] rounded-2xl border border-white/10 flex flex-col overflow-hidden shadow-lg">
          <div className="p-4 border-b border-white/10 font-bold bg-white/5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span> Sunum Asistanı
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-white/10 text-gray-100 rounded-bl-none border border-white/5'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-white/10 p-3 rounded-2xl rounded-bl-none text-white/50 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> AI Düşünüyor...
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
              placeholder="Yeni slayt içeriği isteyin..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500/50 resize-none h-10 max-h-32"
              rows={1}
            />
            <button 
              onClick={handleSend}
              disabled={chatLoading || !input.trim()}
              className="px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 rounded-xl transition-colors flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
