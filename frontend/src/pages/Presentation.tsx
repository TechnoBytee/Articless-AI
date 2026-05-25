import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Loader2, Plus, Image as ImageIcon, Type, Trash2, ChevronLeft, ChevronRight, Send, Download, X } from 'lucide-react';
import pptxgen from 'pptxgenjs';
import { useTheme } from '../App';

interface SlideElementStyle {
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: string;
  fontWeight?: string;
  textAlign?: string;
  color?: string;
}

interface SlideElement {
  id: string;
  type: 'text' | 'image';
  content: string;
  style: SlideElementStyle;
}

interface Slide {
  id: string;
  elements: SlideElement[];
}

// Custom Rnd component using native pointer/mouse events to manage drag & resize.
// This completely avoids any third-party dependencies and runs smoothly.
interface RndProps {
  children: React.ReactNode;
  size: { width: number; height: number };
  position: { x: number; y: number };
  onDragStop: (e: any, data: { x: number; y: number }) => void;
  onResizeStop: (e: any, direction: string, ref: any, delta: any, position: { x: number; y: number }) => void;
  bounds: string;
  className?: string;
  onClick?: () => void;
  scale?: number;
}

const Rnd = ({ children, size, position, onDragStop, onResizeStop, className, onClick, scale = 1 }: RndProps) => {
  const ref = useRef<HTMLDivElement>(null);
  
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Don't drag if user is typing in textarea
    if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.tagName === 'BUTTON') {
      return;
    }
    
    e.preventDefault();
    if (onClick) onClick();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = position.x;
    const initialY = position.y;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = (moveEvent.clientX - startX) / scale;
      const deltaY = (moveEvent.clientY - startY) / scale;
      
      let nextX = initialX + deltaX;
      let nextY = initialY + deltaY;
      
      // Clamp values inside 960x540 canvas boundaries
      if (nextX < 0) nextX = 0;
      if (nextY < 0) nextY = 0;
      if (nextX + size.width > 960) nextX = 960 - size.width;
      if (nextY + size.height > 540) nextY = 540 - size.height;
      
      onDragStop(moveEvent, { x: nextX, y: nextY });
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  const handleResizeMouseDown = (e: React.MouseEvent, direction: string) => {
    e.stopPropagation();
    e.preventDefault();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const initialWidth = size.width;
    const initialHeight = size.height;
    const initialX = position.x;
    const initialY = position.y;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = (moveEvent.clientX - startX) / scale;
      const deltaY = (moveEvent.clientY - startY) / scale;
      
      let newWidth = initialWidth;
      let newHeight = initialHeight;
      
      if (direction.includes('e')) {
        newWidth = Math.max(50, initialWidth + deltaX);
        if (initialX + newWidth > 960) newWidth = 960 - initialX;
      }
      if (direction.includes('s')) {
        newHeight = Math.max(30, initialHeight + deltaY);
        if (initialY + newHeight > 540) newHeight = 540 - initialY;
      }
      
      const customRef = {
        offsetWidth: newWidth,
        offsetHeight: newHeight
      };
      
      onResizeStop(moveEvent, direction, customRef, {}, { x: initialX, y: initialY });
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
      }}
      className={`group ${className}`}
      onMouseDown={handleMouseDown}
    >
      {children}
      
      {/* Resize Handle (bottom-right) */}
      <div
        className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize bg-blue-500/50 hover:bg-blue-500 rounded-tl opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
      />
    </div>
  );
};

// Image addition Modal with validation and upload support
const ImageModal = ({ isOpen, onClose, onAddImage }: { isOpen: boolean; onClose: () => void; onAddImage: (url: string) => void }) => {
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  if (!isOpen) return null;

  const isValidImageUrl = (url: string) => {
    try {
      if (url.startsWith('/') || url.startsWith('data:image/')) return true;
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (e) {
      return false;
    }
  };

  const handleSubmitUrl = () => {
    if (!imageUrl.trim()) {
      setError('Lütfen bir URL girin.');
      return;
    }
    if (!isValidImageUrl(imageUrl)) {
      setError('Geçersiz görsel URL formatı veya uzantısı (Desteklenenler: png, jpg, jpeg, gif, webp, svg).');
      return;
    }
    onAddImage(imageUrl);
    setImageUrl('');
    setError('');
    onClose();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !validExtensions.includes(fileExt)) {
      setError('Geçersiz dosya uzantısı. Desteklenenler: png, jpg, jpeg, gif, webp, svg.');
      return;
    }

    setUploading(true);
    setError('');

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target?.result as string;
      try {
        const res = await axios.post(`${API_URL}/api/upload`, {
          fileName: file.name,
          fileData: base64Data
        });
        // Build correct absolute URL pointing to the backend
        onAddImage(`${API_URL}${res.data.url}`);
        onClose();
      } catch (err: any) {
        console.error(err);
        setError('Görsel yüklenemedi: ' + (err.response?.data?.error || err.message));
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#1a1a24] border border-white/10 p-6 rounded-2xl w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white">
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-xl font-bold mb-4">Görsel Ekle</h3>
        
        {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

        <div className="space-y-4">
          <div>
            <label className="text-xs opacity-70 block mb-1">Görsel URL Adresi</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.png"
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500/50"
              />
              <button 
                onClick={handleSubmitUrl}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold transition-all"
              >
                Ekle
              </button>
            </div>
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink mx-4 text-xs opacity-40">veya</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          <div>
            <label className="text-xs opacity-70 block mb-1">Cihazınızdan Görsel Yükleyin</label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept="image/*"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full py-3 bg-white/5 border border-dashed border-white/20 hover:border-white/40 rounded-lg text-sm opacity-80 hover:opacity-100 flex items-center justify-center gap-2 transition-all"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  Yükleniyor...
                </>
              ) : (
                'Görsel Seç ve Yükle'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Presentation = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const title = searchParams.get('title') || 'Makale Sunumu';
  const source = searchParams.get('source') || 'pubmed';
  const navigate = useNavigate();
  const { theme } = useTheme();

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Editor State
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [articleContext, setArticleContext] = useState<string>('');

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const parentWidth = width - 32;
        const parentHeight = height - 32;
        const scaleX = parentWidth / 960;
        const scaleY = parentHeight / 540;
        setScale(Math.min(scaleX, scaleY, 1));
      }
    });
    if (canvasContainerRef.current) observer.observe(canvasContainerRef.current);
    return () => observer.disconnect();
  }, []);

  // Chat State
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([
    { role: 'model', text: 'Merhaba! Ben sunum asistanınız. Slaytlara eklemek istediğiniz içerikleri bana yazabilirsiniz. Slayt ekleyebilir, metin/görsel nesneleri düzenleyebilirim. Örneğin: "Bir slayt daha ekle" veya "Mevcut slayda başlık ekle".' }
  ]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initial Load - Fetch abstract and AI generate initial slides
  useEffect(() => {
    if (!id) return;

    const generateInitial = async () => {
      setLoadingInitial(true);
      try {
        try {
          const articleRes = await axios.get(`${API_URL}/api/article/${id}?source=${source}`);
          if (articleRes.data) {
            setArticleContext(articleRes.data.abstract || articleRes.data.content || JSON.stringify(articleRes.data));
          }
        } catch (e) { console.warn('Could not fetch article context', e); }

        const res = await axios.post(`${API_URL}/api/article/${id}/presentation?source=${source}`);
        const initialSlidesData = res.data.slides || [];
        
        // Convert plain text to interactive elements with pixel positions (ratio 960x540)
        const initialSlides: Slide[] = initialSlidesData.map((s: any, idx: number) => ({
          id: `slide-${idx}`,
          elements: [
            {
              id: `el-${Date.now()}-${idx}`,
              type: 'text',
              content: s.text,
              style: { 
                x: 80, 
                y: 120, 
                width: 800, 
                height: 300, 
                fontSize: '24px', 
                fontWeight: '500', 
                textAlign: 'center', 
                color: '#ffffff' 
              }
            }
          ]
        }));
        
        // Add title slide at the beginning
        initialSlides.unshift({
          id: 'slide-title',
          elements: [
            {
              id: `el-title`,
              type: 'text',
              content: title,
              style: { 
                x: 80, 
                y: 180, 
                width: 800, 
                height: 180, 
                fontSize: '36px', 
                fontWeight: 'bold', 
                textAlign: 'center', 
                color: '#ffffff' 
              }
            }
          ]
        });

        setSlides(initialSlides);
      } catch (err: any) {
        console.error(err);
        setSlides([{ 
          id: 's1', 
          elements: [{ 
            id: 'e1', 
            type: 'text', 
            content: 'İçerik yüklenemedi. AI asistanı kullanarak yeni slaytlar oluşturabilirsiniz.', 
            style: { x: 80, y: 180, width: 800, height: 180, fontSize: '24px', color: '#ffffff', textAlign: 'center' } 
          }] 
        }]);
      } finally {
        setLoadingInitial(false);
      }
    };

    generateInitial();
  }, [id, title, source, API_URL]);

  const currentSlide = slides[currentSlideIndex];

  // --- Element Modification Handlers ---
  const updateElementStyle = (slideId: string, elementId: string, newStyle: Partial<SlideElementStyle>) => {
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
      style: { x: 330, y: 220, width: 300, height: 100, fontSize: '24px', color: '#ffffff', textAlign: 'center' }
    };
    setSlides(prev => prev.map((s, idx) => idx === currentSlideIndex ? { ...s, elements: [...s.elements, newEl] } : s));
    setSelectedElementId(newEl.id);
  };

  const handleAddImage = (url: string) => {
    if (!currentSlide) return;
    const newEl: SlideElement = {
      id: `el-${Date.now()}`,
      type: 'image',
      content: url,
      style: { x: 330, y: 170, width: 300, height: 200 }
    };
    setSlides(prev => prev.map((s, idx) => idx === currentSlideIndex ? { ...s, elements: [...s.elements, newEl] } : s));
    setSelectedElementId(newEl.id);
  };

  const deleteElement = () => {
    if (!selectedElementId || !currentSlide) return;
    setSlides(prev => prev.map((s, idx) => idx === currentSlideIndex ? { ...s, elements: s.elements.filter(e => e.id !== selectedElementId) } : s));
    setSelectedElementId(null);
  };

  const deleteSlide = (indexToDelete: number) => {
    if (slides.length <= 1) {
      alert("En az bir slayt bulunmalıdır.");
      return;
    }
    const newSlides = slides.filter((_, idx) => idx !== indexToDelete);
    setSlides(newSlides);
    
    if (currentSlideIndex >= newSlides.length) {
      setCurrentSlideIndex(newSlides.length - 1);
    }
    setSelectedElementId(null);
  };

  const addNewSlide = () => {
    const newSlideId = `slide-${Date.now()}`;
    setSlides(prev => [...prev, { id: newSlideId, elements: [] }]);
    setCurrentSlideIndex(slides.length);
  };

  // Helper for Theme Mapping in PPTX Generation
  const getThemeColors = (themeName: string) => {
    switch (themeName) {
      case 'saturn':
        return { bg: 'FAEDCD', text: '4A3B32' };
      case 'moon':
        return { bg: '121212', text: 'E9ECEF' };
      case 'venus':
        return { bg: '2B1516', text: 'FFE5E5' };
      case 'space':
      default:
        return { bg: '0B090A', text: 'FFFFFF' };
    }
  };

  // --- Export PPTX with exact coordinates & theme mapping ---
  const exportPPTX = () => {
    const pres = new pptxgen();
    pres.author = 'Articless AI';
    pres.layout = 'LAYOUT_16x9';

    const colors = getThemeColors(theme);

    slides.forEach((s) => {
      let sl = pres.addSlide();
      sl.background = { color: colors.bg };
      
      s.elements.forEach(e => {
        // Pixel coordinates (960x540) converted to inches (10 x 5.625 inches)
        const leftInch = (e.style.x / 960) * 10;
        const topInch = (e.style.y / 540) * 5.625;
        const widthInch = (e.style.width / 960) * 10;
        const heightInch = (e.style.height / 540) * 5.625;
        
        if (e.type === 'text') {
           const fontSzPx = parseInt(e.style.fontSize || '24') || 24;
           const fontSz = Math.round(fontSzPx * 0.75);
           sl.addText(e.content, { 
             x: leftInch, 
             y: topInch, 
             w: widthInch, 
             h: heightInch, 
             fontSize: fontSz, 
             color: colors.text,
             align: e.style.textAlign as any || 'center',
             valign: 'middle'
           });
        } else if (e.type === 'image') {
           sl.addImage({ 
             path: e.content, 
             x: leftInch, 
             y: topInch, 
             w: widthInch, 
             h: heightInch 
           });
        }
      });
    });

    const cleanId = decodeURIComponent(id || '').replace(/[^a-zA-Z0-9_-]/g, '_');
    pres.writeFile({ fileName: `Articless_${cleanId}.pptx` });
  };

  // --- UI Parser & Action Executor ---
  const executeUICommand = async (cmd: any) => {
    switch (cmd.action) {
      case 'SEARCH_IMAGE':
        try {
          const res = await axios.get(`${API_URL}/api/image-search?q=${encodeURIComponent(cmd.query)}`);
          if (res.data && res.data.images && res.data.images.length > 0) {
            const firstImage = res.data.images[0];
            handleAddImage(firstImage.url || firstImage.link || firstImage);
          }
        } catch (err) {
          console.error("Görsel arama hatası:", err);
        }
        break;
      case 'ADD_SLIDE':
        addNewSlide();
        break;
      case 'ADD_ELEMENT':
        if (cmd.type === 'text') {
          const newEl: SlideElement = {
            id: `el-${Date.now()}`,
            type: 'text',
            content: cmd.content || 'Yeni Metin',
            style: {
              x: cmd.style?.x ?? 100,
              y: cmd.style?.y ?? 100,
              width: cmd.style?.width ?? 300,
              height: cmd.style?.height ?? 100,
              fontSize: cmd.style?.fontSize ?? '24px',
              fontWeight: cmd.style?.fontWeight ?? '500',
              textAlign: cmd.style?.textAlign ?? 'center',
              color: cmd.style?.color ?? '#ffffff'
            }
          };
          setSlides(prev => prev.map((s, idx) => idx === currentSlideIndex ? { ...s, elements: [...s.elements, newEl] } : s));
          setSelectedElementId(newEl.id);
        } else if (cmd.type === 'image') {
          const newEl: SlideElement = {
            id: `el-${Date.now()}`,
            type: 'image',
            content: cmd.content || '',
            style: {
              x: cmd.style?.x ?? 100,
              y: cmd.style?.y ?? 100,
              width: cmd.style?.width ?? 300,
              height: cmd.style?.height ?? 200
            }
          };
          setSlides(prev => prev.map((s, idx) => idx === currentSlideIndex ? { ...s, elements: [...s.elements, newEl] } : s));
          setSelectedElementId(newEl.id);
        }
        break;
      case 'UPDATE_ELEMENT':
        if (cmd.elementId) {
          setSlides(prev => prev.map(s => {
            return {
              ...s,
              elements: s.elements.map(e => {
                if (e.id === cmd.elementId) {
                  return {
                    ...e,
                    content: cmd.content !== undefined ? cmd.content : e.content,
                    style: { ...e.style, ...(cmd.style || {}) }
                  };
                }
                return e;
              })
            };
          }));
        }
        break;
      case 'DELETE_ELEMENT':
        if (cmd.elementId) {
          setSlides(prev => prev.map(s => ({
            ...s,
            elements: s.elements.filter(e => e.id !== cmd.elementId)
          })));
        }
        break;
      default:
        console.warn('Unknown UI command:', cmd);
    }
  };

  const parseAIResponse = async (text: string) => {
    const commandRegex = /<command>([\s\S]*?)<\/command>/;
    const match = text.match(commandRegex);
    
    let cleanText = text.replace(commandRegex, '').trim();
    
    if (match && match[1]) {
      try {
        const cmd = JSON.parse(match[1].trim());
        await executeUICommand(cmd);
      } catch (e) {
        console.error("Komut parse hatasi", e);
      }
    }
    
    return cleanText;
  };

  const handleSend = async () => {
    if (!input.trim() || chatLoading) return;

    const userMsg = { role: 'user' as const, text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setChatLoading(true);

    try {
        const filteredMessages = messages.length > 0 && messages[0].role === 'model'
          ? messages.slice(1)
          : messages;
        const payloadMessages = filteredMessages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
        payloadMessages.push({ role: 'user', parts: [{ text: userMsg.text }] });

        const res = await axios.post(`${API_URL}/api/presentation/chat`, { 
          messages: payloadMessages,
          articleContext,
          currentSlide: currentSlide ? currentSlide.elements : []
        });
        const replyText = res.data.reply || '';
        const cleanText = await parseAIResponse(replyText);
        setMessages(prev => [...prev, { role: 'model', text: cleanText }]);
    } catch (error) {
        setMessages(prev => [...prev, { role: 'model', text: 'Üzgünüm, yanıt alınırken bir hata oluştu.' }]);
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
      <ImageModal 
        isOpen={isImageModalOpen} 
        onClose={() => setIsImageModalOpen(false)} 
        onAddImage={handleAddImage} 
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" /> Geri
          </button>
          <h2 className="text-xl font-bold ml-4">Sunum Editörü: {title}</h2>
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
              <button onClick={() => setIsImageModalOpen(true)} className="flex items-center gap-1 px-3 py-1.5 hover:bg-white/10 rounded-lg text-sm transition-all"><ImageIcon className="w-4 h-4"/> Görsel</button>
              
              <div className="w-[1px] h-6 bg-white/20 mx-2"></div>
              
              {selectedElementId && (
                <>
                  {currentSlide.elements.find(e => e.id === selectedElementId)?.type === 'text' && (
                    <input 
                      type="number" 
                      value={parseInt(currentSlide.elements.find(e => e.id === selectedElementId)?.style.fontSize || '24') || 24}
                      onChange={(e) => updateElementStyle(currentSlide.id, selectedElementId, { fontSize: `${e.target.value}px` })}
                      className="w-16 bg-black/40 border border-white/20 rounded px-2 py-1 text-sm text-white"
                      title="Yazı Boyutu"
                    />
                  )}
                  <div className="flex gap-1">
                    <button onClick={() => {
                      const el = currentSlide.elements.find(e => e.id === selectedElementId);
                      if (el) updateElementStyle(currentSlide.id, selectedElementId, { y: Math.max(0, el.style.y - 10) });
                    }} className="px-2 bg-white/10 hover:bg-white/20 rounded" title="Yukarı Taşı">↑</button>
                    <button onClick={() => {
                      const el = currentSlide.elements.find(e => e.id === selectedElementId);
                      if (el) updateElementStyle(currentSlide.id, selectedElementId, { y: Math.min(540 - el.style.height, el.style.y + 10) });
                    }} className="px-2 bg-white/10 hover:bg-white/20 rounded" title="Aşağı Taşı">↓</button>
                    <button onClick={() => {
                      const el = currentSlide.elements.find(e => e.id === selectedElementId);
                      if (el) updateElementStyle(currentSlide.id, selectedElementId, { x: Math.max(0, el.style.x - 10) });
                    }} className="px-2 bg-white/10 hover:bg-white/20 rounded" title="Sola Taşı">←</button>
                    <button onClick={() => {
                      const el = currentSlide.elements.find(e => e.id === selectedElementId);
                      if (el) updateElementStyle(currentSlide.id, selectedElementId, { x: Math.min(960 - el.style.width, el.style.x + 10) });
                    }} className="px-2 bg-white/10 hover:bg-white/20 rounded" title="Sağa Taşı">→</button>
                  </div>
                  <button onClick={deleteElement} className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg" title="Seçileni Sil"><Trash2 className="w-4 h-4"/></button>
                </>
              )}
            </div>
            
            <div className="text-sm opacity-50 px-4">Slayt {currentSlideIndex + 1} / {slides.length}</div>
          </div>

          {/* Canvas container with scaled centering to display perfectly inside editor */}
          <div ref={canvasContainerRef} className="flex-1 bg-black/40 border border-white/10 rounded-2xl relative overflow-hidden flex items-center justify-center p-4">
            <div 
              style={{ 
                width: '960px', 
                height: '540px',
                transform: `scale(${scale})`,
                transformOrigin: 'center center'
              }}
              className="bg-gradient-to-br from-[#1a1a24] to-[#0f0f15] border border-white/15 rounded-xl relative overflow-hidden shadow-2xl flex-shrink-0"
            >
              {currentSlide?.elements.map(el => (
                <Rnd 
                  key={el.id}
                  scale={scale}
                  size={{ width: el.style.width, height: el.style.height }}
                  position={{ x: el.style.x, y: el.style.y }}
                  onDragStop={(e, data) => {
                    updateElementStyle(currentSlide.id, el.id, { x: data.x, y: data.y });
                  }}
                  onResizeStop={(e, direction, ref, delta, position) => {
                    updateElementStyle(currentSlide.id, el.id, {
                      width: ref.offsetWidth,
                      height: ref.offsetHeight,
                      x: position.x,
                      y: position.y
                    });
                  }}
                  bounds="parent"
                  className={`border ${selectedElementId === el.id ? 'border-blue-500 bg-white/5 shadow-md' : 'border-transparent hover:border-white/10'} rounded`}
                  onClick={() => setSelectedElementId(el.id)}
                >
                  {el.type === 'text' ? (
                    <textarea
                      value={el.content}
                      onChange={(e) => updateElementContent(currentSlide.id, el.id, e.target.value)}
                      className="bg-transparent border-none outline-none resize-none overflow-hidden w-full h-full text-center"
                      style={{ fontSize: el.style.fontSize, color: el.style.color, fontWeight: el.style.fontWeight }}
                    />
                  ) : (
                    <img 
                      src={el.content || 'https://via.placeholder.com/300x200?text=Gorsel+Bulunamadi'} 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=Gorsel+Bulunamadi';
                      }}
                      alt="slide visual" 
                      className="w-full h-full object-contain pointer-events-none" 
                    />
                  )}
                </Rnd>
              ))}
            </div>
          </div>

          {/* Bottom Thumbnails */}
          <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
            {slides.map((s, idx) => (
              <div 
                key={s.id}
                onClick={() => { setCurrentSlideIndex(idx); setSelectedElementId(null); }}
                className={`flex-shrink-0 w-32 h-20 rounded-lg border-2 cursor-pointer transition-all ${idx === currentSlideIndex ? 'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'border-white/10 hover:border-white/30'} bg-[#1a1a24] relative group`}
              >
                <div className="absolute inset-0 flex items-center justify-center text-xs opacity-50">Slayt {idx + 1}</div>
                {slides.length > 1 && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Bu slaytı silmek istediğinize emin misiniz?")) {
                        deleteSlide(idx);
                      }
                    }}
                    className="absolute top-1 right-1 p-1 bg-red-950/80 border border-red-500/30 rounded text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-800 hover:text-white"
                    title="Slaytı Sil"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
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
