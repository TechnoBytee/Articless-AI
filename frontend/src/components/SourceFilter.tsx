import { useState } from 'react';
import { Filter } from 'lucide-react';
import type { SourceType } from './SourceBadge';

interface SourceOption {
  id: SourceType;
  label: string;
  description: string;
  color: string;
  category: 'international' | 'turkish';
}

const SOURCE_OPTIONS: SourceOption[] = [
  { id: 'pubmed', label: 'PubMed', description: 'ABD Ulusal Tip Kutuphanesi', color: 'bg-blue-500', category: 'international' },
  { id: 'semantic-scholar', label: 'Semantic Scholar', description: 'AI destekli akademik arama', color: 'bg-purple-500', category: 'international' },
  { id: 'openalex', label: 'OpenAlex', description: 'Acik akademik dizin', color: 'bg-emerald-500', category: 'international' },
  { id: 'arxiv', label: 'arXiv', description: 'On baski arsivi', color: 'bg-red-500', category: 'international' },
  { id: 'dergipark', label: 'DergiPark', description: 'Turkiye dergi portali', color: 'bg-amber-500', category: 'turkish' },
  { id: 'tr-dizin', label: 'TR Dizin', description: 'Turkiye akademik dizin', color: 'bg-orange-500', category: 'turkish' },
  { id: 'yoktez', label: 'YOK Tez', description: 'Ulusal Tez Merkezi', color: 'bg-teal-500', category: 'turkish' },
];

interface SourceFilterProps {
  selectedSources: SourceType[];
  onChange: (sources: SourceType[]) => void;
}

export const SourceFilter = ({ selectedSources, onChange }: SourceFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSource = (sourceId: SourceType) => {
    if (selectedSources.includes(sourceId)) {
      if (selectedSources.length === 1) return;
      onChange(selectedSources.filter(s => s !== sourceId));
    } else {
      onChange([...selectedSources, sourceId]);
    }
  };

  const internationalSources = SOURCE_OPTIONS.filter(s => s.category === 'international');
  const turkishSources = SOURCE_OPTIONS.filter(s => s.category === 'turkish');

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-sm border border-white/10"
      >
        <Filter className="w-4 h-4" />
        Kaynaklar ({selectedSources.length})
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-12 left-0 z-20 bg-[#1a1a24] border border-white/10 rounded-2xl p-5 w-72 shadow-2xl backdrop-blur-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Arama Kaynaklari</h3>
              <button onClick={() => onChange(SOURCE_OPTIONS.map(s => s.id))} className="text-xs text-blue-400 hover:text-blue-300">Tumunu Sec</button>
            </div>

            <div className="mb-3">
              <p className="text-xs uppercase tracking-wider opacity-50 mb-2">Uluslararasi</p>
              <div className="space-y-1">
                {internationalSources.map(src => (
                  <label key={src.id} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer">
                    <input type="checkbox" checked={selectedSources.includes(src.id)} onChange={() => toggleSource(src.id)} className="w-4 h-4 rounded accent-white" />
                    <div className={`w-2 h-2 rounded-full ${src.color}`} />
                    <div>
                      <p className="text-sm font-medium">{src.label}</p>
                      <p className="text-xs opacity-50">{src.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider opacity-50 mb-2">Turkiye</p>
              <div className="space-y-1">
                {turkishSources.map(src => (
                  <label key={src.id} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer">
                    <input type="checkbox" checked={selectedSources.includes(src.id)} onChange={() => toggleSource(src.id)} className="w-4 h-4 rounded accent-white" />
                    <div className={`w-2 h-2 rounded-full ${src.color}`} />
                    <div>
                      <p className="text-sm font-medium">{src.label}</p>
                      <p className="text-xs opacity-50">{src.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
