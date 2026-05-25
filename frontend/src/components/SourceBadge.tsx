export const SOURCE_NAMES = ['pubmed', 'semantic-scholar', 'openalex', 'arxiv', 'dergipark', 'tr-dizin', 'yoktez'] as const;
export type SourceType = typeof SOURCE_NAMES[number];

interface SourceBadgeProps {
  source: SourceType;
  size?: 'sm' | 'md';
}

const SOURCE_CONFIG: Record<SourceType, { label: string; color: string }> = {
  'pubmed': { label: 'PubMed', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  'semantic-scholar': { label: 'Semantic Scholar', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  'openalex': { label: 'OpenAlex', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  'arxiv': { label: 'arXiv', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  'dergipark': { label: 'DergiPark', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  'tr-dizin': { label: 'TR Dizin', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  'yoktez': { label: 'YOK Tez', color: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
};

const SIZE_CLASSES = { sm: 'text-[10px] px-1.5 py-0.5', md: 'text-xs px-2 py-1' };

export const SourceBadge = ({ source, size = 'sm' }: SourceBadgeProps) => {
  const config = SOURCE_CONFIG[source];
  if (!config) return null;
  return (
    <span className={`inline-block rounded-full border font-medium ${config.color} ${SIZE_CLASSES[size]}`}>
      {config.label}
    </span>
  );
};
