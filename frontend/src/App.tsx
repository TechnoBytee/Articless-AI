import { useState, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Home as HomeIcon } from 'lucide-react';
import { Home } from './pages/Home';
import { Search } from './pages/Search';
import { Presentation } from './pages/Presentation';
import { Library } from './pages/Library';
import { AIWriter } from './pages/AIWriter';
import { ThemeSelector } from './components/ThemeSelector';
import { Rocket, Library as LibraryIcon } from 'lucide-react';

export type Theme = 'space' | 'saturn' | 'moon' | 'venus';

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

export const ThemeContext = createContext<ThemeContextType>({ theme: 'space', setTheme: () => {} });

export const useTheme = () => useContext(ThemeContext);

function App() {
  const [theme, setTheme] = useState<Theme>('space');

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <BrowserRouter>
        <div className={`min-h-screen transition-colors duration-500 theme-${theme} flex flex-col`}>
          <header className="p-4 flex justify-between items-center border-b border-opacity-20 border-white bg-black/10 backdrop-blur-sm">
            <Link to="/" className="flex items-center gap-2 text-2xl font-bold hover:opacity-80 transition-opacity">
              <Rocket className="w-8 h-8" />
              Articless AI
            </Link>
            <div className="flex items-center gap-6">
              <Link to="/" className="flex items-center gap-2 font-medium opacity-80 hover:opacity-100 transition-opacity">
                <HomeIcon className="w-5 h-5" /> Anasayfa
              </Link>
              <Link to="/library" className="flex items-center gap-2 font-medium opacity-80 hover:opacity-100 transition-opacity">
                <LibraryIcon className="w-5 h-5" /> Kütüphane
              </Link>
            </div>
          </header>
          
          <main className="p-4 md:p-8 max-w-7xl mx-auto flex-1 w-full">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<Search />} />
              <Route path="/presentation/:id" element={<Presentation />} />
              <Route path="/library" element={<Library />} />
              <Route path="/ai-writer/:shelfId" element={<AIWriter />} />
            </Routes>
          </main>
          
          <footer className="border-t border-opacity-20 border-white bg-black/10 backdrop-blur-sm p-4 mt-auto">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-sm opacity-60">
                © 2026 Articless AI - NASA Hackathon
              </div>
              <ThemeSelector />
            </div>
          </footer>
        </div>
      </BrowserRouter>
    </ThemeContext.Provider>
  );
}

export default App;
