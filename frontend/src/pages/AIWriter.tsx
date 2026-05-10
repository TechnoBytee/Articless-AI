import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import axios from 'axios';
import { Send, ChevronLeft, Loader2 } from 'lucide-react';

export const AIWriter = () => {
  const { shelfId } = useParams<{ shelfId: string }>();
  const navigate = useNavigate();
  const { shelves } = useStore();
  const shelf = shelves.find(s => s.id === shelfId);

  const [editorContent, setEditorContent] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([
    { role: 'model', text: `Merhaba, ben akademik asistanınızım. "${shelf?.name}" rafındaki makaleleri kullanarak size nasıl yardımcı olabilirim?` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!shelf) {
    return <div className="p-20 text-center">Raf bulunamadı.</div>;
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user' as const, text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
        // Gemini API requires conversation to start with a 'user' message
        let filteredMessages = messages;
        if (filteredMessages.length > 0 && filteredMessages[0].role === 'model') {
            filteredMessages = filteredMessages.slice(1);
        }

        const payloadMessages = filteredMessages.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }));
        // Add the new user message to payload
        payloadMessages.push({
            role: 'user',
            parts: [{ text: userMessage.text + `\n\n(Bağlam - Makale İsimleri: ${shelf.articles.map(a=>a.title).join(', ')})` }]
        });

        const res = await axios.post('http://localhost:5000/api/ai-writer/chat', { messages: payloadMessages });
        
        setMessages(prev => [...prev, { role: 'model', text: res.data.reply }]);
    } catch (error) {
        console.error("Chat error", error);
        setMessages(prev => [...prev, { role: 'model', text: 'Üzgünüm, cevap oluşturulurken bir hata oluştu.' }]);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="h-[85vh] flex flex-col -mt-4">
      <div className="flex items-center mb-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" /> Kütüphaneye Dön
        </button>
        <h2 className="text-xl font-bold ml-4">AI Yazar: {shelf.name}</h2>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
        {/* Left Panel: Rich Text Editor */}
        <div className="flex-[2] bg-white rounded-2xl overflow-hidden flex flex-col border border-white/10 shadow-lg text-black">
          <div className="p-3 bg-gray-100 border-b font-semibold text-gray-700">Doküman Editörü</div>
          <ReactQuill 
            theme="snow" 
            value={editorContent} 
            onChange={setEditorContent} 
            className="flex-1 h-full pb-10"
            placeholder="Makalenizi buraya yazın veya yapay zekadan gelen metinleri buraya kopyalayın..."
          />
        </div>

        {/* Right Panel: AI Chat */}
        <div className="flex-1 bg-[#1a1a24] rounded-2xl border border-white/10 flex flex-col overflow-hidden shadow-lg">
          <div className="p-4 border-b border-white/10 font-bold bg-white/5">
            Akademik Asistan
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
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/10 p-3 rounded-2xl rounded-bl-none text-white/50 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Yazıyor...
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
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500/50 resize-none h-10 max-h-32"
              rows={1}
            />
            <button 
              onClick={handleSend}
              disabled={loading || !input.trim()}
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
