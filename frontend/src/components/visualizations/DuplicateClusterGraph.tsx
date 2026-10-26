import React, { useState, useMemo } from 'react';
import { HashGroup } from '../../types';
import { VisualFileNode, formatBytes } from '../../utils/visualDataUtils';

interface DuplicateClusterGraphProps {
  hashGroups: HashGroup[];
  onSelectFile?: (file: VisualFileNode) => void;
  onNavigateToDuplicates?: () => void;
  selectedFileId?: string;
}

export const DuplicateClusterGraph: React.FC<DuplicateClusterGraphProps> = ({
  hashGroups,
  onSelectFile,
  onNavigateToDuplicates,
}) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<{
    file: VisualFileNode;
    isOriginal: boolean;
    groupSavings: number;
    x: number;
    y: number;
  } | null>(null);

  // Parse duplicate groups
  const processedGroups = useMemo(() => {
    return hashGroups
      .map((g, idx) => {
        const fileList = g.files || [];
        const fileCount = fileList.length;
        const totalSize = (g.sizeBytes || 0) * fileCount;
        const potentialSavings = (g.sizeBytes || 0) * Math.max(0, fileCount - 1);

        const directories = new Set(
          fileList.map((f) => {
            const parts = (f.path || '').replace(/\\/g, '/').split('/');
            parts.pop();
            return parts.join('/');
          })
        );

        return {
          id: g.id || `group-${idx}`,
          hash: g.hash,
          fileSize: g.sizeBytes || 0,
          formattedSize: g.fileSize || formatBytes(g.sizeBytes || 0),
          fileCount,
          totalSize,
          formattedTotalSize: formatBytes(totalSize),
          potentialSavings,
          formattedSavings: formatBytes(potentialSavings),
          spansMultiDir: directories.size > 1,
          directoryCount: directories.size,
          files: fileList.map((f, fIdx) => {
            const ext = (f.name.split('.').pop() || '').toLowerCase();
            return {
              id: `${g.id}-${fIdx}`,
              name: f.name,
              path: f.path,
              bytes: g.sizeBytes || 0,
              formattedSize: g.fileSize || formatBytes(g.sizeBytes || 0),
              extension: ext,
              category: 'Other' as const,
              isDuplicate: true,
              duplicateGroupId: g.id,
              duplicateCount: fileCount,
              directory: f.path.substring(0, f.path.lastIndexOf(/[/\\]/.test(f.path) ? (f.path.includes('/') ? '/' : '\\') : '')),
              depth: 1,
              isOriginal: fIdx === 0,
            };
          }),
        };
      })
      .filter((g) => g.fileCount > 1)
      .sort((a, b) => b.potentialSavings - a.potentialSavings);
  }, [hashGroups]);

  const activeGroup = useMemo(() => {
    if (!selectedGroupId && processedGroups.length > 0) {
      return processedGroups[0];
    }
    return processedGroups.find((g) => g.id === selectedGroupId) || processedGroups[0] || null;
  }, [selectedGroupId, processedGroups]);

  const totalRedundantWaste = useMemo(() => {
    return processedGroups.reduce((acc, g) => acc + g.potentialSavings, 0);
  }, [processedGroups]);

  if (hashGroups.length === 0 || processedGroups.length === 0) {
    return (
      <div className="w-full bg-[#141414] border border-[#303030] p-10 text-center text-[#858585] font-mono text-sm">
        No duplicate file clusters identified in this scan.
      </div>
    );
  }

  const svgWidth = 500;
  const svgHeight = 360;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2;
  const orbitRadius = 120;

  return (
    <div className="w-full bg-[#141414] border border-[#303030] flex flex-col text-[#f5f5f5]">
      {/* Top Header */}
      <div className="p-5 border-b border-[#303030] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="text-[11px] uppercase font-mono font-bold tracking-wider text-[#858585] mb-1">
            Redundant Clone Sets
          </div>
          <h3 className="text-xl font-bold tracking-tight text-white">
            Duplicate Constellations ({processedGroups.length})
          </h3>
          <p className="text-xs text-[#b8b8b8] mt-0.5">
            Total recoverable redundancy: <span className="text-[#f06464] font-mono font-bold">{formatBytes(totalRedundantWaste)}</span>
          </p>
        </div>

        {onNavigateToDuplicates && (
          <button
            type="button"
            onClick={onNavigateToDuplicates}
            className="px-3.5 py-1.5 border border-[#454545] bg-[#1b1b1b] text-xs text-white hover:border-white font-mono uppercase transition-all cursor-pointer"
          >
            Manage in Duplicates →
          </button>
        )}
      </div>

      {/* Main Split Grid: Explorer List Left / Constellation Graph Right */}
      <div className="grid grid-cols-1 md:grid-cols-12 min-h-[400px]">
        {/* Left: Clusters Ranked by Waste */}
        <div className="md:col-span-5 border-b md:border-b-0 md:border-r border-[#303030] bg-[#101010] flex flex-col max-h-[460px]">
          <div className="p-3 border-b border-[#303030] text-[11px] font-mono font-bold text-[#858585] uppercase tracking-wider flex justify-between">
            <span>Ranked by Waste</span>
            <span>{processedGroups.length} Groups</span>
          </div>

          <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {processedGroups.map((group) => {
              const isSelected = activeGroup?.id === group.id;
              const primaryFile = group.files[0];

              return (
                <div
                  key={group.id}
                  onClick={() => setSelectedGroupId(group.id)}
                  className={`p-2.5 border cursor-pointer select-none transition-colors ${
                    isSelected
                      ? 'bg-white text-black border-white'
                      : 'bg-[#141414] text-[#f5f5f5] border-[#262626] hover:border-[#454545]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold truncate font-mono" title={primaryFile?.name}>
                      {primaryFile?.name || 'Duplicate'}
                    </span>
                    <span
                      className={`text-[11px] font-mono font-bold shrink-0 ${
                        isSelected ? 'text-black' : 'text-[#f06464]'
                      }`}
                    >
                      -{group.formattedSavings}
                    </span>
                  </div>

                  <div
                    className={`flex items-center justify-between text-[11px] font-mono ${
                      isSelected ? 'text-neutral-700' : 'text-[#858585]'
                    }`}
                  >
                    <span>{group.fileCount} copies</span>
                    <span>{group.formattedSize} ea</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Clean SVG Cluster Diagram */}
        <div className="md:col-span-7 p-6 flex flex-col items-center justify-center relative bg-[#0c0c0c]">
          {activeGroup ? (
            <>
              <svg width={svgWidth} height={svgHeight} className="overflow-visible select-none">
                {/* Orbital Guide Circle */}
                <circle
                  cx={centerX}
                  cy={centerY}
                  r={orbitRadius}
                  fill="none"
                  stroke="#262626"
                  strokeWidth="1"
                  strokeDasharray="2 4"
                />

                {/* Central Hub */}
                <circle
                  cx={centerX}
                  cy={centerY}
                  r={44}
                  fill="#1a1a1a"
                  stroke="#454545"
                  strokeWidth="1"
                />
                <text
                  x={centerX}
                  y={centerY - 6}
                  textAnchor="middle"
                  fill="#f06464"
                  fontSize="12"
                  fontFamily="var(--dp-font-mono), monospace"
                  fontWeight="bold"
                >
                  -{activeGroup.formattedSavings}
                </text>
                <text
                  x={centerX}
                  y={centerY + 12}
                  textAnchor="middle"
                  fill="#858585"
                  fontSize="10"
                  fontFamily="var(--dp-font-mono), monospace"
                >
                  {activeGroup.fileCount} Copies
                </text>

                {/* Satellite Copies */}
                {activeGroup.files.map((file, idx) => {
                  const angle = (idx / activeGroup.files.length) * 2 * Math.PI - Math.PI / 2;
                  const nodeX = centerX + orbitRadius * Math.cos(angle);
                  const nodeY = centerY + orbitRadius * Math.sin(angle);
                  const isOriginal = idx === 0;

                  return (
                    <g key={file.id}>
                      {/* Connecting Line */}
                      <line
                        x1={centerX}
                        y1={centerY}
                        x2={nodeX}
                        y2={nodeY}
                        stroke={isOriginal ? '#57b887' : '#454545'}
                        strokeWidth="1"
                        strokeDasharray={isOriginal ? 'none' : '2 3'}
                      />

                      {/* Interactive Satellite Node */}
                      <circle
                        cx={nodeX}
                        cy={nodeY}
                        r={12}
                        fill={isOriginal ? '#57b887' : '#1e1e1e'}
                        stroke={isOriginal ? '#57b887' : '#f06464'}
                        strokeWidth="1.5"
                        className="cursor-pointer"
                        onMouseEnter={() => {
                          setHoveredNode({
                            file: {
                              ...file,
                              formattedSize: activeGroup.formattedSize,
                              category: 'Other',
                            },
                            isOriginal,
                            groupSavings: activeGroup.potentialSavings,
                            x: nodeX,
                            y: nodeY,
                          });
                        }}
                        onMouseLeave={() => setHoveredNode(null)}
                        onClick={() => {
                          if (onSelectFile) {
                            onSelectFile({
                              ...file,
                              formattedSize: activeGroup.formattedSize,
                              category: 'Other',
                            });
                          }
                        }}
                      />

                      <text
                        x={nodeX}
                        y={nodeY + 3.5}
                        textAnchor="middle"
                        fill={isOriginal ? '#000000' : '#ffffff'}
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="var(--dp-font-mono), monospace"
                        pointerEvents="none"
                      >
                        {isOriginal ? '★' : `${idx}`}
                      </text>

                      {/* Node Label */}
                      <text
                        x={nodeX}
                        y={nodeY + (nodeY > centerY ? 24 : -18)}
                        textAnchor="middle"
                        fill={isOriginal ? '#57b887' : '#858585'}
                        fontSize="10"
                        fontFamily="var(--dp-font-mono), monospace"
                        fontWeight={isOriginal ? 'bold' : 'normal'}
                      >
                        {isOriginal ? 'Keep (Original)' : `Copy #${idx}`}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Tooltip HUD */}
              {hoveredNode && (
                <div className="absolute bottom-3 left-3 right-3 border border-[#454545] bg-[#141414] p-3 text-xs font-mono shadow-md">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] uppercase font-bold px-1.5 py-0.5 ${
                        hoveredNode.isOriginal
                          ? 'bg-[#57b887]/20 text-[#57b887]'
                          : 'bg-[#f06464]/20 text-[#f06464]'
                      }`}
                    >
                      {hoveredNode.isOriginal ? 'Master Original' : 'Redundant Copy'}
                    </span>
                    <span className="text-white font-bold truncate">{hoveredNode.file.name}</span>
                  </div>
                  <div className="text-[#858585] text-[10px] truncate" title={hoveredNode.file.path}>
                    {hoveredNode.file.path}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-xs text-[#858585] font-mono">Select a cluster on the left to inspect</div>
          )}
        </div>
      </div>
    </div>
  );
};
