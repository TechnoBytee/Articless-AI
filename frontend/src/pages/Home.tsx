import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon } from 'lucide-react';
import { Trending } from '../components/Trending';
import { motion } from 'framer-motion';

export const Home = () => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">
          Bilimin <span className="opacity-80">Sınırlarını</span> Keşfet
        </h1>
        <p className="text-lg md:text-xl opacity-80 max-w-2xl mx-auto mb-12">
          PubMed üzerindeki akademik makaleleri arayın, saniyeler içinde yapay zeka ile özetleyin ve gezegen temalı profesyonel sunumlara dönüştürün.
        </p>

        <form onSubmit={handleSearch} className="w-full max-w-3xl relative">
          <div className="relative flex items-center">
            <SearchIcon className="absolute left-4 w-6 h-6 opacity-50" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Araştırmak istediğiniz konuyu yazın (örn: CRISPR, Mars Colonization)..."
              className="w-full pl-14 pr-32 py-4 rounded-full bg-white/10 border border-white/20 focus:outline-none focus:border-white/50 focus:bg-white/15 transition-all text-lg backdrop-blur-md"
            />
            <button
              type="submit"
              className="absolute right-2 top-2 bottom-2 px-6 rounded-full bg-white text-black font-semibold hover:bg-opacity-90 transition-all"
            >
              Araştır
            </button>
          </div>
        </form>

        <Trending />
      </motion.div>
    </div>
  );
};
