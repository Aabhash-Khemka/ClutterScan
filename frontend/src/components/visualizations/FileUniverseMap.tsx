import React, { useMemo, useState, useRef } from 'react';
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
  const [searchQuery, setSearchQuery] = useState('');

  // Sizing dimensions for the SVG universe viewport
  const svgWidth = 900;
  const svgHeight = 440;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2;
  const maxRadius = Math.min(centerX, centerY) - 40;

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

    // Limit to 350 nodes for clean rendering
    return result.slice(0, 350);
  }, [files, selectedCategory, activeFilter, searchQuery]);

  // Deterministic 2D coordinate projection
  const mappedParticles = useMemo(() => {
    if (displayNodes.length === 0) return [];
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

      // Golden ratio spiral distribution
      const spiralAngle = i * 2.39996 + normHash * 0.4;
      const distFromCenter = 35 + Math.sqrt((i + 1) / Math.max(1, displayNodes.length)) * maxRadius;

      const x = Math.round(centerX + distFromCenter * Math.cos(spiralAngle));
      const y = Math.round(centerY + (distFromCenter * 0.65) * Math.sin(spiralAngle));

      const radius = Math.max(3, Math.min(9, Math.round(3 + normSize * 6)));

      return {
        ...f,
        x,
        y,
        radius,
      };
    });
  }, [displayNodes, files, centerX, centerY, maxRadius]);

  // Group duplicate clusters to draw connecting lines
  const duplicateLines = useMemo(() => {
    const dupMap = new Map<string, typeof mappedParticles>();
    mappedParticles.forEach((p) => {
      if (p.isDuplicate && p.duplicateGroupId) {
        const group = dupMap.get(p.duplicateGroupId) || [];
        group.push(p);
        dupMap.set(p.duplicateGroupId, group);
      }
    });

    const lines: { x1: number; y1: number; x2: number; y2: number; groupId: string }[] = [];
    dupMap.forEach((cluster, groupId) => {
      if (cluster.length >= 2) {
        for (let i = 0; i < cluster.length - 1; i++) {
          lines.push({
            x1: cluster[i].x!,
            y1: cluster[i].y!,
            x2: cluster[i + 1].x!,
            y2: cluster[i + 1].y!,
            groupId,
          });
        }
      }
    });
    return lines;
  }, [mappedParticles]);

  if (files.length === 0) {
    return (
      <div className="w-full bg-[#141414] border border-[#303030] p-10 text-center text-[#858585] font-mono text-sm">
        No files loaded. Run a scan to populate the particle galaxy.
      </div>
    );
  }

  return (
    <div className="w-full bg-[#141414] border border-[#303030] p-6 flex flex-col gap-4 text-[#f5f5f5] relative">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-[#303030]">
        <div>
          <div className="text-[11px] uppercase font-mono font-bold tracking-wider text-[#858585] mb-1">
            Particle Galaxy Distribution
          </div>
          <h3 className="text-xl font-bold tracking-tight text-white">
            File Universe Map ({files.length.toLocaleString()} files)
          </h3>
          <p className="text-xs text-[#b8b8b8] mt-0.5">
            Files projected by size and directory clustering. Red dashed lines link identical duplicates.
          </p>
        </div>

        {/* Filter Controls & Search */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <input
            type="text"
            placeholder="Filter by name…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-2.5 py-1.5 border border-[#303030] bg-[#101010] text-white text-xs outline-none focus:border-white w-36"
          />

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

      {/* SVG Viewport — 100% Guaranteed Crisp Vector Rendering */}
      <div className="relative w-full aspect-[16/8] max-h-[440px] bg-[#0c0c0c] border border-[#303030] overflow-hidden flex items-center justify-center">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full select-none"
        >
          {/* Concentric Guide Rings */}
          {[80, 140, 200].map((r) => (
            <ellipse
              key={r}
              cx={centerX}
              cy={centerY}
              rx={r}
              ry={r * 0.65}
              fill="none"
              stroke="#202020"
              strokeWidth="1"
            />
          ))}

          {/* Duplicate Connecting Lines */}
          {duplicateLines.map((line, idx) => (
            <line
              key={idx}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="#f06464"
              strokeWidth="1.2"
              strokeDasharray="3 3"
              strokeOpacity="0.8"
            />
          ))}

          {/* Interactive File Particles */}
          {mappedParticles.map((p) => {
            const isHovered = hoveredNode?.id === p.id;
            const color = p.isDuplicate ? '#f06464' : (CATEGORY_COLORS[p.category] || '#ffffff');

            return (
              <g
                key={p.id}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredNode(p)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => onSelectFile && onSelectFile(p)}
              >
                {/* Hit area */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={Math.max(12, p.radius + 6)}
                  fill="transparent"
                />

                {/* Hover ring */}
                {isHovered && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={p.radius + 4}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                )}

                {/* Main Particle */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? p.radius + 1 : p.radius}
                  fill={isHovered ? '#ffffff' : color}
                  stroke="#141414"
                  strokeWidth="1"
                  className="transition-all duration-100"
                />
              </g>
            );
          })}
        </svg>

        {/* Hovered Particle Metadata HUD */}
        {hoveredNode && (
          <div className="absolute top-3 right-3 border border-[#454545] bg-[#141414] p-3 max-w-sm pointer-events-none text-xs font-mono shadow-xl z-20">
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

      {/* Footer Status Bar */}
      <div className="flex items-center justify-between text-xs font-mono text-[#858585]">
        <span>Rendering {mappedParticles.length} nodes (of {files.length} indexed files)</span>
        <span>Click node to inspect metadata</span>
      </div>
    </div>
  );
};
