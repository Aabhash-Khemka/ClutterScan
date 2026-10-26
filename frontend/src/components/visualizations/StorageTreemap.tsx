import React, { useMemo, useState } from 'react';
import * as d3 from 'd3';
import { TreeNode } from '../../types';
import { formatBytes, CATEGORY_COLORS, detectCategory } from '../../utils/visualDataUtils';
import { ZoomIn, ZoomOut, RotateCcw, Folder, Layers, Maximize2, Filter } from 'lucide-react';

interface StorageTreemapProps {
  treeData: TreeNode[];
  onSelectFile?: (filePath: string) => void;
}

interface TreemapItem {
  name: string;
  path: string;
  size: number;
  isDir: boolean;
  category?: string;
  isDuplicate?: boolean;
  children?: TreemapItem[];
}

export const StorageTreemap: React.FC<StorageTreemapProps> = ({ treeData, onSelectFile }) => {
  const [currentNodePath, setCurrentNodePath] = useState<string>('');
  const [colorMode, setColorMode] = useState<'CATEGORY' | 'DEPTH'>('CATEGORY');
  const [minSizeMB, setMinSizeMB] = useState<number>(0);
  const [selectedLeaf, setSelectedLeaf] = useState<any>(null);

  // Convert TreeNode hierarchy into d3 Treemap format
  const hierarchyData: TreemapItem | null = useMemo(() => {
    if (!treeData || treeData.length === 0) return null;

    function convert(node: TreeNode): TreemapItem {
      const isDir = !!node.isDir;
      const path = node.path || node.name;

      if (isDir && node.children && node.children.length > 0) {
        return {
          name: node.name,
          path,
          size: node.bytes || 0,
          isDir: true,
          children: node.children.map(convert),
        };
      } else {
        return {
          name: node.name,
          path,
          size: node.bytes || 1,
          isDir: false,
          category: detectCategory(node.name),
        };
      }
    }

    return {
      name: 'Root Storage',
      path: 'Root',
      size: 0,
      isDir: true,
      children: treeData.map(convert),
    };
  }, [treeData]);

  // Compute D3 Treemap layout
  const treemapLayout = useMemo(() => {
    if (!hierarchyData) return null;

    const width = 1100;
    const height = 520;

    const root = d3
      .hierarchy<TreemapItem>(hierarchyData)
      .sum((d) => (d.isDir ? 0 : d.size))
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Optional zoom into current path
    let targetRoot = root;
    if (currentNodePath) {
      const found = root.descendants().find((d) => d.data.path === currentNodePath);
      if (found && found.children) {
        targetRoot = found as d3.HierarchyNode<TreemapItem>;
      }
    }

    const treemap = d3
      .treemap<TreemapItem>()
      .size([width, height])
      .paddingTop(22)
      .paddingInner(3)
      .paddingOuter(4)
      .round(true);

    treemap(targetRoot);
    return { targetRoot, width, height };
  }, [hierarchyData, currentNodePath]);

  // Generate breadcrumbs for current directory zoom
  const breadcrumbs = useMemo(() => {
    if (!currentNodePath) return [{ name: 'Root Storage', path: '' }];
    const parts = currentNodePath.split(/[\/\\]/).filter(Boolean);
    const crumbs = [{ name: 'Root', path: '' }];
    let acc = '';
    parts.forEach((p) => {
      acc = acc ? `${acc}/${p}` : p;
      crumbs.push({ name: p, path: acc });
    });
    return crumbs;
  }, [currentNodePath]);

  if (!treemapLayout || !hierarchyData) {
    return (
      <div className="w-full bg-[#0d0f17] border border-[#1e2438] rounded-2xl p-10 text-center text-[#8899b5]">
        No storage tree data available. Run a scan to generate the visual treemap.
      </div>
    );
  }

  const leaves = treemapLayout.targetRoot.leaves().filter((d: any) => {
    if (minSizeMB === 0) return true;
    return (d.value || 0) >= minSizeMB * 1024 * 1024;
  });

  return (
    <div className="w-full bg-[#0d0f17] border border-[#1e2438] rounded-2xl p-6 sm:p-7 shadow-2xl flex flex-col gap-4 text-white font-sans">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-[#1e2438] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#20C5E8]/20 border border-[#20C5E8]/50 text-[#20C5E8] flex items-center gap-1.5">
              <Layers size={13} /> Zoomable Storage Treemap
            </span>
            <span className="text-xs text-[#68758B]">• Proportional Area Sizing</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
            Hierarchical Storage Map
          </h3>
          <p className="text-xs sm:text-sm text-[#8899b5]">
            Rectangles represent files or directories scaled by size. Click any directory block to zoom in.
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Color Switcher */}
          <div className="bg-[#181d2c] border border-[#20273c] p-1 rounded-lg flex items-center text-xs">
            <button
              type="button"
              onClick={() => setColorMode('CATEGORY')}
              className={`px-3 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                colorMode === 'CATEGORY' ? 'bg-[#625BEE] text-white' : 'text-[#8899b5] hover:text-white'
              }`}
            >
              By File Category
            </button>
            <button
              type="button"
              onClick={() => setColorMode('DEPTH')}
              className={`px-3 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                colorMode === 'DEPTH' ? 'bg-[#625BEE] text-white' : 'text-[#8899b5] hover:text-white'
              }`}
            >
              By Depth Level
            </button>
          </div>

          {/* Reset Zoom */}
          {currentNodePath && (
            <button
              type="button"
              onClick={() => setCurrentNodePath('')}
              className="px-3 py-1.5 bg-[#1e2438] hover:bg-[#28324e] text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer text-[#20C5E8] transition-colors"
            >
              <RotateCcw size={13} /> Reset View
            </button>
          )}
        </div>
      </div>

      {/* Breadcrumb Trail */}
      <div className="flex items-center gap-2 text-xs overflow-x-auto no-scrollbar py-1">
        <span className="text-[#68758B] uppercase font-semibold tracking-wider">Location:</span>
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={crumb.path}>
            {idx > 0 && <span className="text-[#434f6e]">/</span>}
            <button
              type="button"
              onClick={() => setCurrentNodePath(crumb.path)}
              className={`hover:underline cursor-pointer font-medium ${
                idx === breadcrumbs.length - 1 ? 'text-[#20C5E8] font-bold' : 'text-[#8899b5]'
              }`}
            >
              {crumb.name}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Interactive Treemap Canvas Viewport */}
      <div className="relative w-full overflow-hidden rounded-xl border border-[#1e2438] bg-[#080a10]">
        <svg
          viewBox={`0 0 ${treemapLayout.width} ${treemapLayout.height}`}
          className="w-full h-auto select-none"
        >
          {/* Render Directory Groups Header Rectangles */}
          {treemapLayout.targetRoot.children?.map((child: any) => (
            <g key={child.data.path || child.data.name}>
              <rect
                x={child.x0}
                y={child.y0}
                width={Math.max(0, child.x1 - child.x0)}
                height={Math.max(0, child.y1 - child.y0)}
                fill="none"
                stroke="#1e2438"
                strokeWidth={1.5}
              />
              <text
                x={child.x0 + 6}
                y={child.y0 + 15}
                fill="#8899b5"
                fontSize="11"
                fontWeight="600"
                className="cursor-pointer hover:fill-white font-sans truncate"
                onClick={() => child.data.isDir && setCurrentNodePath(child.data.path)}
              >
                📁 {child.data.name} ({formatBytes(child.value || 0)})
              </text>
            </g>
          ))}

          {/* Render File Leaves */}
          {leaves.map((leaf: any) => {
            const w = Math.max(0, leaf.x1 - leaf.x0);
            const h = Math.max(0, leaf.y1 - leaf.y0);
            if (w < 4 || h < 4) return null;

            const category = leaf.data.category || 'Other';
            const baseColor =
              colorMode === 'CATEGORY'
                ? (CATEGORY_COLORS as any)[category] || '#625BEE'
                : d3.interpolateCool(leaf.depth / 6);

            const isSelected = selectedLeaf?.data?.path === leaf.data.path;

            return (
              <g
                key={leaf.data.path}
                className="cursor-pointer transition-transform group"
                onClick={() => {
                  setSelectedLeaf(leaf);
                  if (onSelectFile) onSelectFile(leaf.data.path);
                }}
              >
                <rect
                  x={leaf.x0}
                  y={leaf.y0}
                  width={w}
                  height={h}
                  fill={baseColor}
                  fillOpacity={isSelected ? 0.95 : 0.75}
                  stroke={isSelected ? '#FFFFFF' : '#0d0f17'}
                  strokeWidth={isSelected ? 2.5 : 1}
                  rx={2}
                  className="hover:fill-opacity-100 transition-all duration-150"
                />

                {w > 48 && h > 24 && (
                  <>
                    <text
                      x={leaf.x0 + 5}
                      y={leaf.y0 + 14}
                      fill="#FFFFFF"
                      fontSize={w > 90 ? '11' : '10'}
                      fontWeight="bold"
                      className="pointer-events-none truncate font-sans"
                    >
                      {leaf.data.name.length > w / 7 ? `${leaf.data.name.slice(0, Math.floor(w / 8))}…` : leaf.data.name}
                    </text>
                    {h > 36 && (
                      <text
                        x={leaf.x0 + 5}
                        y={leaf.y0 + 28}
                        fill="#E2E8F0"
                        fontSize="9"
                        fontFamily="monospace"
                        className="pointer-events-none opacity-80"
                      >
                        {formatBytes(leaf.value)}
                      </text>
                    )}
                  </>
                )}
              </g>
            );
          })}
        </svg>

        {/* Selected Leaf Detail Floating HUD */}
        {selectedLeaf && (
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-md bg-[#0f1320]/95 backdrop-blur-md border border-[#2b3552] rounded-xl p-3.5 shadow-2xl flex items-center justify-between gap-3 text-xs">
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-white text-sm truncate">{selectedLeaf.data.name}</span>
              <span className="text-[#20C5E8] font-mono">{formatBytes(selectedLeaf.value)}</span>
              <span className="text-[#8899b5] truncate text-[11px] mt-0.5" title={selectedLeaf.data.path}>
                {selectedLeaf.data.path}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedLeaf(null)}
              className="text-[#68758B] hover:text-white px-2 py-1 cursor-pointer font-bold shrink-0"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-[#68758B]">
        <span>Showing {leaves.length} proportional leaf nodes</span>
        <span>Click any rectangle to inspect file attributes</span>
      </div>
    </div>
  );
};
