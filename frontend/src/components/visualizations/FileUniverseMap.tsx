import React, { useMemo, useState, useRef, useEffect } from 'react';
import { VisualFileNode, CATEGORY_COLORS, formatBytes } from '../../utils/visualDataUtils';

interface FileUniverseMapProps {
  files: VisualFileNode[];
  onSelectFile?: (file: VisualFileNode) => void;
  selectedCategory: string | null;
}

export const FileUniverseMap: React.FC<FileUniverseMapProps> = ({
  files,
  onSelectFile,
  selectedCategory,
}) => {
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'DUPLICATES_ONLY' | 'LARGE_ONLY'>('ALL');
  const [hoveredNode, setHoveredNode] = useState<VisualFileNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Filter candidate nodes
  const displayNodes = useMemo(() => {
    let result = files;

    if (selectedCategory) {
      result = result.filter((f) => f.category === selectedCategory);
    }

    if (activeFilter === 'DUPLICATES_ONLY') {
      result = result.filter((f) => f.isDuplicate);
    } else if (activeFilter === 'LARGE_ONLY') {
      result = result.filter((f) => f.bytes >= 5 * 1024 * 1024); // >= 5MB
    }

    // Cap to 350 nodes for crisp, uncluttered rendering
    return result.slice(0, 350);
  }, [files, selectedCategory, activeFilter]);

  // Deterministic 2D coordinate projection based on file attributes
  const mappedParticles = useMemo(() => {
    const canvasWidth = 900;
    const canvasHeight = 440;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const maxRadius = Math.min(centerX, centerY) - 36;

    const maxBytes = Math.max(1, ...files.map((f) => f.bytes));

    return displayNodes.map((f, i) => {
      const normSize = Math.log10(Math.max(10, f.bytes)) / Math.log10(Math.max(100, maxBytes));

      let hash = 0;
      const str = f.path || f.name;
      for (let c = 0; c < str.length; c++) {
        hash = (hash << 5) - hash + str.charCodeAt(c);
        hash |= 0;
      }
      const normHash = Math.abs(hash % 1000) / 1000;

      const spiralAngle = i * 2.39996 + normHash * 0.4;
      const distFromCenter = 30 + Math.sqrt((i + 1) / Math.max(1, displayNodes.length)) * maxRadius;

      const x = centerX + distFromCenter * Math.cos(spiralAngle);
      const y = centerY + (distFromCenter * 0.65) * Math.sin(spiralAngle);

      const radius = Math.max(2.5, Math.min(8, 2.5 + normSize * 6));

      return {
        ...f,
        x,
        y,
        radius,
      };
    });
  }, [displayNodes, files]);

  // Canvas drawing loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Subtle background concentric coordinate rings
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 1;
    [70, 130, 185].forEach((r) => {
      ctx.beginPath();
      ctx.ellipse(canvas.width / 2, canvas.height / 2, r, r * 0.65, 0, 0, 2 * Math.PI);
      ctx.stroke();
    });

    // Draw connecting lines between duplicates
    const dupClusters = new Map<string, typeof mappedParticles>();
    mappedParticles.forEach((p) => {
      if (p.isDuplicate && p.duplicateGroupId) {
        const group = dupClusters.get(p.duplicateGroupId) || [];
        group.push(p);
        dupClusters.set(p.duplicateGroupId, group);
      }
    });

    ctx.strokeStyle = '#f06464';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);

    dupClusters.forEach((cluster) => {
      if (cluster.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(cluster[0].x!, cluster[0].y!);
        for (let i = 1; i < cluster.length; i++) {
          ctx.lineTo(cluster[i].x!, cluster[i].y!);
        }
        ctx.stroke();
      }
    });
    ctx.setLineDash([]); // Reset dash

    // Draw Particles
    mappedParticles.forEach((p) => {
      const isHovered = hoveredNode?.id === p.id;
      const color = CATEGORY_COLORS[p.category] || '#f5f5f5';

      if (isHovered) {
        ctx.beginPath();
        ctx.arc(p.x!, p.y!, p.radius! + 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(p.x!, p.y!, p.radius!, 0, 2 * Math.PI);
      ctx.fillStyle = isHovered ? '#000000' : p.isDuplicate ? '#f06464' : color;
      ctx.fill();
      ctx.strokeStyle = isHovered ? '#ffffff' : '#141414';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }, [mappedParticles, hoveredNode]);

  // Handle canvas mouse move
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const mouseY = ((e.clientY - rect.top) / rect.height) * canvas.height;

    let closest: VisualFileNode | null = null;
    let minDistance = 14;

    for (const p of mappedParticles) {
      const dist = Math.hypot(p.x! - mouseX, p.y! - mouseY);
      if (dist < minDistance) {
        minDistance = dist;
        closest = p;
      }
    }

    setHoveredNode(closest);
  };

  const handleCanvasClick = () => {
    if (hoveredNode && onSelectFile) {
      onSelectFile(hoveredNode);
    }
  };

  return (
    <div className="w-full bg-[#141414] border border-[#303030] p-6 flex flex-col gap-4 text-[#f5f5f5] relative">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-[#303030]">
        <div>
          <div className="text-[11px] uppercase font-mono font-bold tracking-wider text-[#858585] mb-1">
            Particle Galaxy Distribution
          </div>
          <h3 className="text-xl font-bold tracking-tight text-white">
            File Universe Map
          </h3>
          <p className="text-xs text-[#b8b8b8] mt-0.5">
            Files projected by size and directory clustering. Red dashed links identify clone constellations.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-1.5 font-mono text-xs">
          {[
            { id: 'ALL', label: 'All Files' },
            { id: 'DUPLICATES_ONLY', label: 'Duplicates' },
            { id: 'LARGE_ONLY', label: '> 5 MB' },
          ].map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={() => setActiveFilter(btn.id as any)}
              className={`px-3 py-1.5 border uppercase transition-colors cursor-pointer ${
                activeFilter === btn.id
                  ? 'border-white bg-white text-black font-bold'
                  : 'border-[#303030] bg-[#1b1b1b] text-[#858585] hover:text-white hover:border-[#454545]'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Canvas Viewport */}
      <div className="relative w-full aspect-[16/8] max-h-[420px] bg-[#0c0c0c] border border-[#303030] cursor-crosshair flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={900}
          height={440}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredNode(null)}
          onClick={handleCanvasClick}
          className="w-full h-full object-contain"
        />

        {/* Precision Node Detail Tooltip */}
        {hoveredNode && (
          <div className="absolute top-3 right-3 border border-[#454545] bg-[#141414] p-3 max-w-sm pointer-events-none text-xs font-mono shadow-md">
            <div className="text-white font-bold truncate mb-1">{hoveredNode.name}</div>
            <div className="flex items-center gap-2 text-[11px] text-[#858585] mb-1">
              <span>{hoveredNode.category}</span>
              <span>•</span>
              <span className="text-[#57b887] font-bold">{hoveredNode.formattedSize}</span>
            </div>
            {hoveredNode.isDuplicate && (
              <div className="text-[#f06464] font-bold text-[10px] uppercase">
                [Duplicate Item — {hoveredNode.duplicateCount} Copies]
              </div>
            )}
            <div className="text-[10px] text-[#858585] truncate mt-1" title={hoveredNode.path}>
              {hoveredNode.path}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs font-mono text-[#858585]">
        <span>Rendered: {displayNodes.length} particle nodes</span>
        <span>Click node to inspect details</span>
      </div>
    </div>
  );
};
