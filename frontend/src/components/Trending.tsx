import { useEffect, useState } from 'react';
import axios from 'axios';
import { TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Trend {
  query: string;
  count: number;
}

export const Trending = () => {
  const [trends, setTrends] = useState<Trend[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/trends');
        setTrends(res.data);
      } catch (error) {
        console.error('Failed to fetch trends', error);
      }
    };
    fetchTrends();
  }, []);

  if (trends.length === 0) return null;

  return (
    <div className="mt-8 w-full overflow-hidden">
      <div className="flex items-center gap-2 mb-3 text-sm font-semibold opacity-80">
        <TrendingUp className="w-4 h-4" />
        <p>Popüler Aramalar (Trendler)</p>
      </div>
      <div className="flex overflow-x-auto gap-3 pb-4 scrollbar-hide">
        {trends.map((trend, i) => (
          <button
            key={i}
            onClick={() => navigate(`/search?q=${encodeURIComponent(trend.query)}`)}
            className="flex-shrink-0 px-4 py-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-colors whitespace-nowrap text-sm"
          >
            {trend.query}
          </button>
        ))}
      </div>
    </div>
  );
};
