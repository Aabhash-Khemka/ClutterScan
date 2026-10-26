import React, { useState, useMemo } from 'react';
import { HashGroup } from '../../types';
import { VisualFileNode, formatBytes, CATEGORY_COLORS } from '../../utils/visualDataUtils';

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
  selectedFileId,
}) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [minSavingsFilter, setMinSavingsFilter] = useState<number>(0);
  const [hoveredNode, setHoveredNode] = useState<{
    file: VisualFileNode;
    isOriginal: boolean;
    groupSavings: number;
    x: number;
    y: number;
  } | null>(null);

  // Parse and prioritize duplicate groups
  const processedGroups = useMemo(() => {
    return hashGroups
      .map((g, idx) => {
        const fileList = g.files || [];
        const fileCount = fileList.length;
        const totalSize = (g.sizeBytes || 0) * fileCount;
        // Wasted space = (count - 1) * single file size
        const potentialSavings = (g.sizeBytes || 0) * Math.max(0, fileCount - 1);

        // Check if group spans multiple directories
        const directories = new Set(
          fileList.map((f) => {
            const parts = (f.path || '').replace(/\\/g, '/').split('/');
            parts.pop();
            return parts.join('/');
          })
        );
        const spansMultiDir = directories.size > 1;

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
          spansMultiDir,
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
              category: 'Other' as const, // will be rendered cleanly
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
      .filter((g) => g.fileCount > 1 && g.potentialSavings >= minSavingsFilter)
      .sort((a, b) => b.potentialSavings - a.potentialSavings);
  }, [hashGroups, minSavingsFilter]);

  const activeGroup = useMemo(() => {
    if (!selectedGroupId && processedGroups.length > 0) {
      return processedGroups[0];
    }
    return processedGroups.find((g) => g.id === selectedGroupId) || processedGroups[0] || null;
  }, [selectedGroupId, processedGroups]);

  // Aggregate metrics
  const totalRedundantWaste = useMemo(() => {
    return processedGroups.reduce((acc, g) => acc + g.potentialSavings, 0);
  }, [processedGroups]);

  if (hashGroups.length === 0 || processedGroups.length === 0) {
    return (
      <div
        style={{
          background: '#0d0f17',
          borderRadius: 16,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '48px 32px',
          textAlign: 'center',
          color: '#8E9AA8',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 380,
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(98, 91, 238, 0.25) 0%, rgba(13, 15, 23, 0) 70%)',
            border: '1px solid rgba(98, 91, 238, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#625BEE" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f5f7fc', margin: '0 0 8px 0' }}>
          No Duplicate Clusters Detected
        </h3>
        <p style={{ maxWidth: 440, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
          Your scan found no identical duplicates matching the current threshold. When duplicate files exist,
          this interactive cluster graph visualises redundant file constellations and multi-directory sprawl.
        </p>
      </div>
    );
  }

  // Visual layout constants for active group orbital rendering
  const svgWidth = 560;
  const svgHeight = 400;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2;
  const orbitRadius = 135;

  return (
    <div
      style={{
        background: '#0d0f17',
        borderRadius: 20,
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          background: 'rgba(255, 255, 255, 0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #FF6B6B 0%, #925CFF 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(255, 107, 107, 0.35)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2">
              <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1" />
              <rect x="8" y="4" width="14" height="14" rx="2" />
            </svg>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f5f7fc', letterSpacing: '-0.02em' }}>
                Duplicate Cluster Constellation
              </h3>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#FF6B6B',
                  background: 'rgba(255, 107, 107, 0.15)',
                  padding: '2px 8px',
                  borderRadius: 12,
                }}
              >
                {processedGroups.length} Clusters
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: '#8E9AA8' }}>
              Identified {formatBytes(totalRedundantWaste)} redundant storage across clone sets
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {onNavigateToDuplicates && (
            <button
              onClick={onNavigateToDuplicates}
              style={{
                background: 'linear-gradient(135deg, #625BEE 0%, #925CFF 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '7px 14px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 4px 12px rgba(98, 91, 238, 0.3)',
                transition: 'all 0.15s ease',
              }}
            >
              <span>Manage in Duplicates</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Main Graph Content Area: Split View */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 340px) 1fr',
          minHeight: 460,
        }}
      >
        {/* Left Side: Duplicate Clusters Explorer List */}
        <div
          style={{
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 520,
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: '#8E9AA8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Clone Clusters Ranked by Waste
            </span>
            <span style={{ fontSize: 11, color: '#20C5E8', fontWeight: 600 }}>
              Top {processedGroups.length}
            </span>
          </div>

          <div style={{ overflowY: 'auto', flex: 1, padding: 8 }}>
            {processedGroups.map((group) => {
              const isSelected = activeGroup?.id === group.id;
              const primaryFile = group.files[0];

              return (
                <div
                  key={group.id}
                  onClick={() => setSelectedGroupId(group.id)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    marginBottom: 6,
                    cursor: 'pointer',
                    background: isSelected
                      ? 'linear-gradient(135deg, rgba(98, 91, 238, 0.25) 0%, rgba(146, 92, 255, 0.15) 100%)'
                      : 'rgba(255, 255, 255, 0.03)',
                    border: isSelected
                      ? '1px solid rgba(146, 92, 255, 0.5)'
                      : '1px solid rgba(255, 255, 255, 0.04)',
                    transition: 'all 0.18s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: isSelected ? '#fff' : '#E5E9F2',
                        maxWidth: 180,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={primaryFile?.name}
                    >
                      {primaryFile?.name || 'Duplicate Item'}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#FF6B6B',
                        background: 'rgba(255, 107, 107, 0.12)',
                        padding: '1px 6px',
                        borderRadius: 6,
                      }}
                    >
                      -{group.formattedSavings}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: '#8E9AA8' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{group.fileCount} copies</span>
                      <span>•</span>
                      <span>{group.formattedSize} each</span>
                    </span>
                    {group.spansMultiDir && (
                      <span
                        style={{
                          fontSize: 10,
                          color: '#20C5E8',
                          background: 'rgba(32, 197, 232, 0.12)',
                          padding: '1px 5px',
                          borderRadius: 4,
                        }}
                      >
                        {group.directoryCount} folders
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Orbital Constellation Graphic for Selected Group */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            overflow: 'hidden',
          }}
        >
          {activeGroup ? (
            <>
              {/* Constellation SVG Diagram */}
              <svg width={svgWidth} height={svgHeight} style={{ overflow: 'visible' }}>
                <defs>
                  {/* Gradients */}
                  <radialGradient id="centerOrbGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#925CFF" stopOpacity="0.8" />
                    <stop offset="60%" stopColor="#625BEE" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#625BEE" stopOpacity="0" />
                  </radialGradient>
                  <linearGradient id="linkLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#625BEE" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#FF6B6B" stopOpacity="0.8" />
                  </linearGradient>
                </defs>

                {/* Ambient Orbital Rings */}
                <circle
                  cx={centerX}
                  cy={centerY}
                  r={orbitRadius}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth="1.5"
                  strokeDasharray="4 6"
                />
                <circle
                  cx={centerX}
                  cy={centerY}
                  r={orbitRadius * 0.55}
                  fill="none"
                  stroke="rgba(146, 92, 255, 0.12)"
                  strokeWidth="1"
                />

                {/* Center Core: Group Master Summary */}
                <circle cx={centerX} cy={centerY} r={58} fill="url(#centerOrbGlow)" />
                <circle
                  cx={centerX}
                  cy={centerY}
                  r={46}
                  fill="#131724"
                  stroke="#925CFF"
                  strokeWidth="2"
                  filter="drop-shadow(0 0 12px rgba(146, 92, 255, 0.5))"
                />
                <text
                  x={centerX}
                  y={centerY - 10}
                  textAnchor="middle"
                  fill="#FF6B6B"
                  fontSize="13"
                  fontWeight="800"
                >
                  -{activeGroup.formattedSavings}
                </text>
                <text
                  x={centerX}
                  y={centerY + 8}
                  textAnchor="middle"
                  fill="#f5f7fc"
                  fontSize="11"
                  fontWeight="600"
                >
                  {activeGroup.fileCount} Copies
                </text>
                <text
                  x={centerX}
                  y={centerY + 22}
                  textAnchor="middle"
                  fill="#8E9AA8"
                  fontSize="9.5"
                >
                  {activeGroup.formattedSize} ea
                </text>

                {/* Constellation Satellites (Copies) */}
                {activeGroup.files.map((file, idx) => {
                  const angle = (idx / activeGroup.files.length) * 2 * Math.PI - Math.PI / 2;
                  const nodeX = centerX + orbitRadius * Math.cos(angle);
                  const nodeY = centerY + orbitRadius * Math.sin(angle);
                  const isOriginal = idx === 0;

                  return (
                    <g key={file.id}>
                      {/* Connecting beam to central cluster core */}
                      <line
                        x1={centerX}
                        y1={centerY}
                        x2={nodeX}
                        y2={nodeY}
                        stroke={isOriginal ? 'rgba(32, 197, 232, 0.6)' : 'rgba(255, 107, 107, 0.45)'}
                        strokeWidth={isOriginal ? 2 : 1.5}
                        strokeDasharray={isOriginal ? 'none' : '3 3'}
                      />

                      {/* Node Halo */}
                      <circle
                        cx={nodeX}
                        cy={nodeY}
                        r={22}
                        fill={isOriginal ? 'rgba(32, 197, 232, 0.15)' : 'rgba(255, 107, 107, 0.15)'}
                      />

                      {/* Interactive Satellite Node */}
                      <circle
                        cx={nodeX}
                        cy={nodeY}
                        r={15}
                        fill={isOriginal ? '#19B99A' : '#FF6B6B'}
                        stroke="#fff"
                        strokeWidth="2"
                        style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
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

                      {/* Inner Icon or Rank Badge */}
                      <text
                        x={nodeX}
                        y={nodeY + 4}
                        textAnchor="middle"
                        fill="#fff"
                        fontSize="10"
                        fontWeight="700"
                        pointerEvents="none"
                      >
                        {isOriginal ? '★' : `#${idx + 1}`}
                      </text>

                      {/* Node Label */}
                      <text
                        x={nodeX}
                        y={nodeY + (nodeY > centerY ? 28 : -22)}
                        textAnchor="middle"
                        fill={isOriginal ? '#20C5E8' : '#E5E9F2'}
                        fontSize="10.5"
                        fontWeight={isOriginal ? '700' : '500'}
                      >
                        {isOriginal ? 'Original to Keep' : `Redundant Copy ${idx}`}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Cluster Detail Overlay at Bottom */}
              <div
                style={{
                  marginTop: 12,
                  background: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: 12,
                  padding: '10px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  width: '90%',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <span style={{ fontSize: 11, color: '#8E9AA8' }}>Cluster Hash: </span>
                  <code style={{ fontSize: 11, color: '#925CFF', fontFamily: 'monospace' }}>
                    {activeGroup.hash ? activeGroup.hash.substring(0, 16) + '...' : 'Identical Content'}
                  </code>
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
                  <span style={{ color: '#19B99A', fontWeight: 600 }}>★ 1 Retained Copy</span>
                  <span style={{ color: '#FF6B6B', fontWeight: 600 }}>
                    ✕ {activeGroup.fileCount - 1} Redundant Copies
                  </span>
                </div>
              </div>

              {/* Tooltip Popup on Node Hover */}
              {hoveredNode && (
                <div
                  style={{
                    position: 'absolute',
                    top: Math.max(10, hoveredNode.y - 80),
                    left: Math.min(svgWidth - 220, Math.max(20, hoveredNode.x - 100)),
                    background: '#172033',
                    border: hoveredNode.isOriginal
                      ? '1px solid #19B99A'
                      : '1px solid #FF6B6B',
                    borderRadius: 8,
                    padding: '8px 12px',
                    pointerEvents: 'none',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
                    zIndex: 20,
                    maxWidth: 240,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: hoveredNode.isOriginal ? '#19B99A' : '#FF6B6B',
                      marginBottom: 3,
                    }}
                  >
                    {hoveredNode.isOriginal ? '★ Primary Original (Safe)' : '✕ Duplicate Copy (Waste)'}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#fff',
                      wordBreak: 'break-all',
                      marginBottom: 4,
                    }}
                  >
                    {hoveredNode.file.name}
                  </div>
                  <div style={{ fontSize: 10, color: '#8E9AA8', wordBreak: 'break-all' }}>
                    {hoveredNode.file.path}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ color: '#8E9AA8', fontSize: 13 }}>Select a cluster to view its constellation</div>
          )}
        </div>
      </div>
    </div>
  );
};
