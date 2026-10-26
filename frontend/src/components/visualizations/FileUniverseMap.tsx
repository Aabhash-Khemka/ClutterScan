import React, { useMemo, useState, useRef, useEffect } from 'react';
import { VisualFileNode, CATEGORY_COLORS, formatBytes } from '../../utils/visualDataUtils';
import { Orbit, Sparkles, Filter, Eye, Maximize2, RotateCcw, ShieldCheck } from 'lucide-react';

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
  const [searchQuery, setSearchQuery] = useState('');
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

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((f) => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q));
    }

    // Limit to 450 rendered particles for 60fps canvas smoothness
    return result.slice(0, 450);
  }, [files, selectedCategory, activeFilter, searchQuery]);

  // Deterministic 2D Galaxy coordinate projection based on file attributes
  const mappedParticles = useMemo(() => {
    const width = 900;
    const height = 480;
    const centerX = width / 2;
    const centerY = height / 2;

    const maxBytes = Math.max(...files.map((f) => f.bytes), 1);

    return displayNodes.map((f, idx) => {
      // Use string hash for deterministic angle and cluster distribution
      let hash = 0;
      for (let i = 0; i < f.path.length; i++) {
        hash = (hash << 5) - hash + f.path.charCodeAt(i);
        hash |= 0;
      }

      // Spiral arms distribution (3-arm galaxy)
      const armIndex = Math.abs(hash) % 3;
      const baseArmAngle = (armIndex * 2 * Math.PI) / 3;

      // Radial distance from center based on file depth and size
      const normSize = Math.log10(Math.max(f.bytes, 1024)) / Math.log10(Math.max(maxBytes, 1024));
      const distFromCenter = 35 + (1 - normSize) * 190 + (Math.abs(hash % 45));

      const spiralAngle = baseArmAngle + (distFromCenter * 0.015) + ((Math.abs(hash % 30) - 15) * 0.01);

      const x = centerX + distFromCenter * Math.cos(spiralAngle);
      const y = centerY + (distFromCenter * 0.65) * Math.sin(spiralAngle);

      // Particle radius (2px to 9px)
      const radius = Math.max(2.5, Math.min(10, 2.5 + normSize * 7.5));

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

    // Draw galaxy background orbital rings
    ctx.strokeStyle = '#1a2034';
    ctx.lineWidth = 1;
    [60, 120, 180, 220].forEach((r) => {
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

    ctx.strokeStyle = 'rgba(255, 107, 107, 0.28)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);

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
      const color = CATEGORY_COLORS[p.category] || '#625BEE';

      // Outer glow for large or hovered files
      if (isHovered || p.isDuplicate) {
        ctx.beginPath();
        ctx.arc(p.x!, p.y!, p.radius! + (isHovered ? 6 : 3), 0, 2 * Math.PI);
        ctx.fillStyle = p.isDuplicate ? 'rgba(255, 107, 107, 0.35)' : `${color}40`;
        ctx.fill();
      }

      // Main Particle
      ctx.beginPath();
      ctx.arc(p.x!, p.y!, p.radius!, 0, 2 * Math.PI);
      ctx.fillStyle = isHovered ? '#FFFFFF' : color;
      ctx.fill();
      ctx.strokeStyle = '#0d0f17';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }, [mappedParticles, hoveredNode]);

  // Handle canvas mouse move for interactive node detection
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const mouseY = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // Detect closest particle within threshold
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
    <div className="w-full bg-[#0d0f17] border border-[#1e2438] rounded-2xl p-6 sm:p-7 shadow-2xl flex flex-col gap-4 text-white font-sans relative">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-[#1e2438] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#925CFF]/20 border border-[#925CFF]/50 text-[#b58eff] flex items-center gap-1.5">
              <Orbit size={13} className="text-[#20C5E8]" /> File Universe Particle Map
            </span>
            <span className="text-xs text-[#68758B]">• 2D Deterministic Spiral Projection</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
            File Universe Explorer
          </h3>
          <p className="text-xs sm:text-sm text-[#8899b5]">
            Each particle represents a scanned file. Position reflects directory clusters, node radius reflects file weight, and red lines link duplicate copies.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
              activeFilter === 'ALL' ? 'bg-[#625BEE] text-white' : 'bg-[#181d2c] text-[#8899b5] hover:text-white'
            }`}
          >
            All Files
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('DUPLICATES_ONLY')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
              activeFilter === 'DUPLICATES_ONLY'
                ? 'bg-[#FF6B6B] text-white'
                : 'bg-[#181d2c] text-[#8899b5] hover:text-[#FF6B6B]'
            }`}
          >
            Duplicates Only
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('LARGE_ONLY')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
              activeFilter === 'LARGE_ONLY' ? 'bg-[#20C5E8] text-black font-bold' : 'bg-[#181d2c] text-[#8899b5] hover:text-white'
            }`}
          >
            Large (&gt; 5 MB)
          </button>
        </div>
      </div>

      {/* Interactive Universe Canvas */}
      <div className="relative w-full aspect-[16/9] max-h-[460px] bg-[#07090f] border border-[#1e2438] rounded-xl overflow-hidden cursor-crosshair flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={900}
          height={480}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredNode(null)}
          onClick={handleCanvasClick}
          className="w-full h-full object-contain"
        />

        {/* Hovered Particle Inspector Tooltip HUD */}
        {hoveredNode && (
          <div className="absolute top-4 right-4 bg-[#0f1320]/95 backdrop-blur-md border border-[#2b3552] rounded-xl p-3.5 shadow-2xl max-w-sm pointer-events-none text-xs">
            <div className="flex items-center justify-between gap-2 border-b border-[#1e2438] pb-1.5">
              <span
                className="font-bold uppercase tracking-wider text-[11px]"
                style={{ color: CATEGORY_COLORS[hoveredNode.category] }}
              >
                {hoveredNode.category}
              </span>
              <span className="font-mono text-white font-bold">{hoveredNode.formattedSize}</span>
            </div>
            <div className="font-bold text-white text-sm truncate mt-1.5">{hoveredNode.name}</div>
            <div className="text-[#8899b5] text-[11px] truncate font-mono mt-0.5">{hoveredNode.path}</div>
            {hoveredNode.isDuplicate && (
              <div className="mt-2 text-[#FF6B6B] font-semibold text-[11px] flex items-center gap-1.5 bg-[#FF6B6B]/10 px-2 py-0.5 rounded-md border border-[#FF6B6B]/30">
                <span>⚠ Redundant Duplicate File ({hoveredNode.duplicateCount} copies)</span>
              </div>
            )}
          </div>
        )}

        {/* Legend Overlay at bottom left */}
        <div className="absolute bottom-3 left-3 bg-[#0d0f17]/90 backdrop-blur-xs border border-[#1e2438] px-3 py-2 rounded-lg flex items-center gap-3 text-[11px] text-[#8899b5]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#20C5E8]" /> Image
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#925CFF]" /> Video
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#625BEE]" /> Doc
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#19B99A]" /> Code
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF6B6B]" /> Duplicate
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-[#68758B]">
        <span>Rendering {mappedParticles.length} projected nodes</span>
        <span>Click any node to open file details</span>
      </div>
    </div>
  );
};
