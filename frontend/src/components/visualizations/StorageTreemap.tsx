import React, { useMemo, useState } from 'react';
import * as d3 from 'd3';
import { TreeNode } from '../../types';
import { formatBytes, CATEGORY_COLORS, detectCategory } from '../../utils/visualDataUtils';

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

    const width = 1000;
    const height = 480;

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
      .paddingTop(24)
      .paddingInner(2)
      .paddingOuter(2)
      .round(true);

    treemap(targetRoot);
    return { targetRoot, width, height };
  }, [hierarchyData, currentNodePath]);

  // Generate breadcrumbs for current directory zoom
  const breadcrumbs = useMemo(() => {
    if (!currentNodePath) return [{ name: 'Root', path: '' }];
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
      <div className="w-full bg-[#141414] border border-[#303030] p-10 text-center text-[#858585] font-mono text-sm">
        No directory tree data loaded. Run a scan to inspect the storage treemap.
      </div>
    );
  }

  const leaves = treemapLayout.targetRoot.leaves();

  return (
    <div className="w-full bg-[#141414] border border-[#303030] p-6 flex flex-col gap-4 text-[#f5f5f5]">
      {/* Top Bar Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-[#303030]">
        <div>
          <div className="text-[11px] uppercase font-mono font-bold tracking-wider text-[#858585] mb-1">
            Hierarchical Treemap
          </div>
          <h3 className="text-xl font-bold tracking-tight text-white">
            Volume Treemap Allocation
          </h3>
          <p className="text-xs text-[#b8b8b8] mt-0.5">
            Rectangle area is proportional to file size. Click any directory border to drill down.
          </p>
        </div>

        {currentNodePath && (
          <button
            type="button"
            onClick={() => setCurrentNodePath('')}
            className="px-3 py-1.5 border border-[#454545] bg-[#1b1b1b] text-xs text-[#f5f5f5] hover:border-white font-mono uppercase transition-all cursor-pointer"
          >
            ← Reset Root View
          </button>
        )}
      </div>

      {/* Breadcrumb Trail */}
      <div className="flex items-center gap-1.5 text-xs font-mono overflow-x-auto py-1 text-[#858585]">
        <span className="uppercase text-[#858585]">Path:</span>
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={crumb.path}>
            {idx > 0 && <span className="text-[#454545]">/</span>}
            <button
              type="button"
              onClick={() => setCurrentNodePath(crumb.path)}
              className={`hover:text-white cursor-pointer ${
                idx === breadcrumbs.length - 1 ? 'text-white font-bold underline' : 'text-[#b8b8b8]'
              }`}
            >
              {crumb.name}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Clean Monochrome/Muted Treemap Canvas */}
      <div className="relative w-full overflow-hidden border border-[#303030] bg-[#0c0c0c]">
        <svg
          viewBox={`0 0 ${treemapLayout.width} ${treemapLayout.height}`}
          className="w-full h-auto select-none"
        >
          {/* Render Directory Headers */}
          {treemapLayout.targetRoot.children?.map((child: any) => (
            <g key={child.data.path || child.data.name}>
              <rect
                x={child.x0}
                y={child.y0}
                width={Math.max(0, child.x1 - child.x0)}
                height={Math.max(0, child.y1 - child.y0)}
                fill="#161616"
                stroke="#303030"
                strokeWidth={1}
              />
              <text
                x={child.x0 + 6}
                y={child.y0 + 16}
                fill="#858585"
                fontSize="11"
                fontFamily="var(--dp-font-mono), monospace"
                className="cursor-pointer hover:fill-white font-medium truncate"
                onClick={() => child.data.isDir && setCurrentNodePath(child.data.path)}
              >
                [{child.data.name}] — {formatBytes(child.value || 0)}
              </text>
            </g>
          ))}

          {/* Render File Rectangles */}
          {leaves.map((leaf: any) => {
            const w = Math.max(0, leaf.x1 - leaf.x0);
            const h = Math.max(0, leaf.y1 - leaf.y0);
            if (w < 3 || h < 3) return null;

            const category = leaf.data.category || 'Other';
            const catColor = (CATEGORY_COLORS as any)[category] || '#606060';
            const isSelected = selectedLeaf?.data?.path === leaf.data.path;

            return (
              <g
                key={leaf.data.path}
                className="cursor-pointer"
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
                  fill={isSelected ? '#ffffff' : '#1e1e1e'}
                  stroke={isSelected ? '#ffffff' : '#303030'}
                  strokeWidth={1}
                  className="transition-colors hover:fill-[#2e2e2e]"
                />

                {/* Subtle category color indicator bar on left edge */}
                {w > 12 && h > 12 && (
                  <rect
                    x={leaf.x0}
                    y={leaf.y0}
                    width={Math.min(3, w)}
                    height={h}
                    fill={catColor}
                  />
                )}

                {w > 40 && h > 20 && (
                  <text
                    x={leaf.x0 + 7}
                    y={leaf.y0 + 14}
                    fill={isSelected ? '#000000' : '#f5f5f5'}
                    fontSize="10"
                    fontFamily="var(--dp-font-mono), monospace"
                    className="pointer-events-none truncate font-medium"
                  >
                    {leaf.data.name.length > w / 7 ? `${leaf.data.name.slice(0, Math.floor(w / 8))}…` : leaf.data.name}
                  </text>
                )}

                {w > 60 && h > 34 && (
                  <text
                    x={leaf.x0 + 7}
                    y={leaf.y0 + 27}
                    fill={isSelected ? '#333333' : '#858585'}
                    fontSize="9"
                    fontFamily="var(--dp-font-mono), monospace"
                    className="pointer-events-none"
                  >
                    {formatBytes(leaf.value)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Selected Leaf Detail Footer HUD */}
        {selectedLeaf && (
          <div className="absolute bottom-2 left-2 right-2 border border-[#454545] bg-[#141414] p-3 flex items-center justify-between gap-3 text-xs font-mono">
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-white truncate">{selectedLeaf.data.name}</span>
              <span className="text-[#57b887]">{formatBytes(selectedLeaf.value)}</span>
              <span className="text-[#858585] truncate text-[11px]" title={selectedLeaf.data.path}>
                {selectedLeaf.data.path}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedLeaf(null)}
              className="text-[#858585] hover:text-white px-2 py-1 cursor-pointer font-bold shrink-0"
            >
              [X]
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs font-mono text-[#858585]">
        <span>Showing {leaves.length} proportional leaf files</span>
        <span>Click node to inspect metadata</span>
      </div>
    </div>
  );
};
