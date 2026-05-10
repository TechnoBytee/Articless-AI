import { useTheme, type Theme } from '../App';
import { Moon, CircleDashed, Orbit, Rocket } from 'lucide-react';

export const ThemeSelector = () => {
  const { theme, setTheme } = useTheme();

  const themes: { id: Theme; icon: React.ReactNode; label: string }[] = [
    { id: 'space', icon: <Rocket className="w-4 h-4" />, label: 'Uzay' },
    { id: 'moon', icon: <Moon className="w-4 h-4" />, label: 'Ay' },
    { id: 'saturn', icon: <Orbit className="w-4 h-4" />, label: 'Satürn' },
    { id: 'venus', icon: <CircleDashed className="w-4 h-4" />, label: 'Venüs' },
  ];

  return (
    <div className="flex gap-2 items-center">
      <span className="text-sm opacity-60 mr-2">Tema:</span>
      {themes.map((t) => (
        <button
          key={t.id}
          onClick={() => setTheme(t.id)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
            theme === t.id ? 'bg-white/20 scale-105 shadow-lg border border-white/20' : 'hover:bg-white/10 opacity-70 hover:opacity-100'
          }`}
          title={t.label}
        >
          {t.icon}
          <span className="text-xs font-medium">{t.label}</span>
        </button>
      ))}
    </div>
  );
};
