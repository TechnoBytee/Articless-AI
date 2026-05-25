import { useState, useRef, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import ForceGraph3D from 'react-force-graph-3d';
import { X, Box, Circle } from 'lucide-react';

interface GraphViewProps {
  shelfName: string;
  articles: any[];
  onClose: () => void;
}

export const GraphView = ({ shelfName, articles, onClose }: GraphViewProps) => {
  const [is3D, setIs3D] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight
      });
    }
  }, [is3D]); // Recalculate if view changes

  // Generate nodes and links from articles
  const nodes: any[] = [{ id: 'shelf', name: shelfName, val: 10, color: '#3b82f6' }];
  const links: any[] = [];
  const authorsSet = new Set<string>();

  articles.forEach((article) => {
    nodes.push({ id: article.id, name: article.title, val: 5, color: '#a855f7' });
    links.push({ source: 'shelf', target: article.id });

    (article.authors || []).forEach((author: string) => {
      if (!authorsSet.has(author)) {
        authorsSet.add(author);
        nodes.push({ id: author, name: author, val: 3, color: '#10b981' });
      }
      links.push({ source: article.id, target: author });
    });
  });

  const graphData = { nodes, links };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4">
      <div className="bg-[#1a1a24] border border-white/10 rounded-2xl w-full h-full max-w-6xl max-h-[90vh] flex flex-col relative overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-white/10 bg-black/40 z-20">
          <h3 className="text-xl font-bold">İlişkisel Grafik: {shelfName}</h3>
          <div className="flex gap-4 items-center">
            <button 
              onClick={() => setIs3D(!is3D)}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-all text-sm"
            >
              {is3D ? <><Circle className="w-4 h-4"/> 2D Görünüm</> : <><Box className="w-4 h-4"/> 3D Görünüm</>}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all bg-red-500/20 text-red-400 hover:bg-red-500/40">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div ref={containerRef} className="flex-1 w-full bg-black relative overflow-hidden">
          <div className="absolute top-4 left-4 z-10 bg-black/60 p-4 rounded-lg border border-white/10 text-xs space-y-2 backdrop-blur-md">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Raf</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-500"></div> Makale</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Yazar</div>
          </div>
          {is3D ? (
            <ForceGraph3D
              width={dimensions.width}
              height={dimensions.height}
              graphData={graphData}
              nodeLabel="name"
              nodeAutoColorBy="color"
              nodeResolution={16}
            />
          ) : (
            <ForceGraph2D
              width={dimensions.width}
              height={dimensions.height}
              graphData={graphData}
              nodeColor={(n: any) => n.color}
              nodeRelSize={6}
              nodeCanvasObject={(node: any, ctx, globalScale) => {
                const label = node.name;
                const fontSize = 12 / globalScale;
                ctx.font = `${fontSize}px Sans-Serif`;
                const textWidth = ctx.measureText(label).width;
                const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

                ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2 - node.val - 2, bckgDimensions[0], bckgDimensions[1]);

                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#ffffff';
                ctx.fillText(label, node.x, node.y - node.val - 2);

                ctx.beginPath();
                ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI, false);
                ctx.fillStyle = node.color;
                ctx.fill();
              }}
              nodePointerAreaPaint={(node: any, color, ctx) => {
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.val + 2, 0, 2 * Math.PI, false);
                ctx.fill();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};