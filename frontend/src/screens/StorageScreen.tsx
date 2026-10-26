import React, { useState, useEffect } from 'react';
import { TreeNode, NavTab } from '../types';

interface StorageScreenProps {
  onNavigate: (tab: NavTab) => void;
  onShowNotice?: (msg: string) => void;
  treeData?: TreeNode[];
}

export const StorageScreen: React.FC<StorageScreenProps> = ({
  onNavigate,
  onShowNotice,
  treeData: initialTreeData,
}) => {
  const [treeData, setTreeData] = useState<TreeNode[]>(initialTreeData ?? []);
  const [isAllExpanded, setIsAllExpanded] = useState<boolean>(false);

  useEffect(() => {
    if (initialTreeData && initialTreeData.length > 0) {
      setTreeData(initialTreeData);
    }
  }, [initialTreeData]);

  // Toggle single node
  const toggleNodeById = (nodeId: string) => {
    const updateNodes = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.map((node) => {
        if (node.id === nodeId) {
          return { ...node, isOpen: !node.isOpen };
        }
        if (node.children) {
          return { ...node, children: updateNodes(node.children) };
        }
        return node;
      });
    };
    setTreeData(updateNodes(treeData));
  };

  // Expand / collapse all
  const toggleAll = () => {
    const nextState = !isAllExpanded;
    setIsAllExpanded(nextState);

    const updateAllNodes = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.map((node) => ({
        ...node,
        isOpen: node.isDir ? nextState : node.isOpen,
        children: node.children ? updateAllNodes(node.children) : undefined,
      }));
    };
    setTreeData(updateAllNodes(treeData));
  };

  const handleExportJson = () => {
    if (treeData.length === 0) return;
    const jsonString = JSON.stringify(treeData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clutterscan_structure.json';
    a.click();
    URL.revokeObjectURL(url);
    if (onShowNotice) {
      onShowNotice('Filesystem structure exported as JSON.');
    }
  };

  // Compute real statistics from treeData
  const countNodes = (nodes: TreeNode[]): { fileCount: number; dirCount: number; maxDepth: number } => {
    let fileCount = 0;
    let dirCount = 0;
    let maxDepth = 1;

    const traverse = (list: TreeNode[], depth: number) => {
      if (depth > maxDepth) maxDepth = depth;
      for (const n of list) {
        if (n.isDir) {
          dirCount++;
          if (n.children && n.children.length > 0) traverse(n.children, depth + 1);
        } else {
          fileCount++;
        }
      }
    };

    traverse(nodes, 1);
    return { fileCount, dirCount, maxDepth };
  };

  const { fileCount, dirCount, maxDepth } = countNodes(treeData);
  const rootNode = treeData[0];
  const rootSizeDisplay = rootNode ? rootNode.size : '—';
  const rootPathDisplay = rootNode ? rootNode.path : 'No scan loaded';

  // Recursive tree flattening for terminal view
  interface FlattenedTreeItem {
    id: string;
    name: string;
    path: string;
    size: string;
    isDir: boolean;
    isOpen: boolean;
    prefix: string;
    isRoot: boolean;
    tag?: string;
  }

  const flattenTree = (nodes: TreeNode[], depth = 0, prefix = ''): FlattenedTreeItem[] => {
    const items: FlattenedTreeItem[] = [];
    nodes.forEach((node, idx) => {
      const isLast = idx === nodes.length - 1;
      const connector = depth === 0 ? '' : (isLast ? '└── ' : '├── ');
      const itemPrefix = depth === 0 ? '' : `${prefix}${connector}`;

      items.push({
        id: node.id,
        name: node.name,
        path: node.path ?? node.name,
        size: node.size,
        isDir: !!node.isDir,
        isOpen: !!node.isOpen,
        prefix: itemPrefix,
        isRoot: depth === 0,
        tag: node.tag,
      });

      if (node.isDir && node.isOpen && node.children && node.children.length > 0) {
        const nextPrefix = depth === 0 ? '' : `${prefix}${isLast ? '    ' : '│   '}`;
        items.push(...flattenTree(node.children, depth + 1, nextPrefix));
      }
    });
    return items;
  };

  const flattenedTree = React.useMemo(() => {
    return flattenTree(treeData);
  }, [treeData]);

  return (
    <div className="w-full flex flex-col gap-8 text-[#f5f5f5]">
      {/* Section header */}
      <section className="border-b border-[#303030] pb-5 flex flex-col md:flex-row justify-between items-start md:items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl md:text-3xl font-bold text-[#f5f5f5] tracking-tight">
            Storage Overview
          </h1>
          <p className="text-sm md:text-base text-[#b8b8b8]">
            Interactive folder tree and recursive size distribution for <span className="text-[#f5f5f5] font-mono font-semibold">{rootPathDisplay}</span>
          </p>
        </div>
      </section>

      {/* Summary metrics */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CELL 01: TOTAL SCANNED */}
        <div className="border border-[#303030] bg-[#141414] p-5 rounded-[2px] flex flex-col justify-between h-36">
          <div className="text-xs uppercase font-medium text-[#858585] tracking-wider">
            Total Size
          </div>
          <div className="text-3xl md:text-4xl font-bold text-white font-mono tracking-tight tabular-nums my-auto">
            {rootSizeDisplay}
          </div>
          <div className="text-xs text-[#b8b8b8] border-t border-[#303030] pt-2">
            Storage analyzed
          </div>
        </div>

        {/* CELL 02: FILES PROCESSED */}
        <div className="border border-[#303030] bg-[#141414] p-5 rounded-[2px] flex flex-col justify-between h-36">
          <div className="text-xs uppercase font-medium text-[#858585] tracking-wider">
            Files Processed
          </div>
          <div className="text-3xl md:text-4xl font-bold text-white font-mono tracking-tight tabular-nums my-auto">
            {rootNode ? fileCount.toLocaleString() : '—'}
          </div>
          <div className="text-xs text-[#b8b8b8] border-t border-[#303030] pt-2">
            Individual files counted
          </div>
        </div>

        {/* CELL 03: DIRECTORIES */}
        <div className="border border-[#303030] bg-[#141414] p-5 rounded-[2px] flex flex-col justify-between h-36">
          <div className="text-xs uppercase font-medium text-[#858585] tracking-wider">
            Directories
          </div>
          <div className="text-3xl md:text-4xl font-bold text-white font-mono tracking-tight tabular-nums my-auto">
            {rootNode ? dirCount.toLocaleString() : '—'}
          </div>
          <div className="text-xs text-[#b8b8b8] border-t border-[#303030] pt-2">
            Folders traversed
          </div>
        </div>

        {/* CELL 04: TREE DEPTH */}
        <div className="border border-[#303030] bg-[#141414] p-5 rounded-[2px] flex flex-col justify-between h-36">
          <div className="text-xs uppercase font-medium text-[#858585] tracking-wider">
            Folder Depth
          </div>
          <div className="text-3xl md:text-4xl font-bold text-white font-mono tracking-tight tabular-nums my-auto">
            {rootNode ? maxDepth.toLocaleString() : '—'}
          </div>
          <div className="text-xs text-[#b8b8b8] border-t border-[#303030] pt-2">
            Levels of nesting
          </div>
        </div>
      </section>

      {/* MIDDLE SECTION: RECURSIVE DIRECTORY AGGREGATION TREE */}
      <section className="border border-[#303030] bg-[#141414] p-6 rounded-[2px] flex flex-col">
        {/* TREE HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 mb-4 border-b border-[#303030] gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[#f5f5f5] font-semibold text-base md:text-lg">
              Filesystem Tree
            </span>
            <span className="text-[#858585] text-sm">
              — Expand folders to explore contents
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-[#858585] font-mono">Depth: {maxDepth}</span>
            <button
              type="button"
              onClick={toggleAll}
              className="text-[#f5f5f5] hover:bg-white hover:text-black px-3.5 py-1.5 border border-[#454545] transition-all cursor-pointer rounded-[2px] font-medium"
            >
              {isAllExpanded ? 'Collapse All' : 'Expand All'}
            </button>
          </div>
        </div>

        {/* ASCII / TEXT TREE INTERACTION BUFFER */}
        <div className="text-sm md:text-base leading-relaxed overflow-x-auto text-[#f5f5f5] select-none font-mono max-h-[520px]">
          {flattenedTree.length === 0 && (
            <div className="py-12 text-center text-[#858585] text-base">
              No scan results are loaded. Run a scan on the Scan page to explore folder structure.
            </div>
          )}
          {flattenedTree.map((item, index) => {
            const lineNum = (index + 1).toString().padStart(3, '0');
            if (item.isRoot) {
              return (
                <div key={item.id} className="text-white font-bold flex items-center py-2 border-b border-[#303030]">
                  <span className="w-16 text-[#858585]">{lineNum}:</span>
                  <span className="text-white text-base">{item.name}</span>
                  <span className="ml-auto text-white font-semibold text-sm pr-4 tabular-nums">{item.size}</span>
                  <span className="text-[#858585] text-xs uppercase px-2 py-0.5 border border-[#303030] bg-[#1b1b1b]">{item.tag || 'ROOT'}</span>
                </div>
              );
            }

            return (
              <div
                key={item.id}
                onClick={() => item.isDir && toggleNodeById(item.id)}
                className={`flex items-center py-1.5 px-1 rounded transition-colors ${
                  item.isDir ? 'cursor-pointer hover:bg-[#242424]' : 'hover:bg-[#1b1b1b]'
                }`}
              >
                <span className="w-16 text-[#858585] font-mono text-xs">{lineNum}:</span>
                <span className="truncate font-sans font-medium">{item.prefix}{item.name}</span>
                <span className="ml-auto font-mono text-xs md:text-sm tabular-nums text-[#b8b8b8] pr-4">{item.size}</span>
                {item.isDir ? (
                  <span className="text-xs border border-[#454545] px-2 py-0.5 rounded text-[#b8b8b8] font-mono">
                    {item.isOpen ? '− Collapse' : '+ Expand'}
                  </span>
                ) : (
                  <span className="w-20 text-right text-[#858585] text-xs font-mono">
                    {item.tag || 'FILE'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* BOTTOM STATUS SECTION: SCAN_METADATA DOSSIER */}
      <section className="border border-[#303030] bg-[#141414] p-6 rounded-[2px]">
        <div className="text-base font-semibold text-[#f5f5f5] mb-4 pb-2 border-b border-[#303030] flex items-center justify-between">
          <span>Scan Metadata</span>
          <span className="text-xs text-[#858585]">Recorded session details</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
          {/* META 01 */}
          <div className="flex flex-col gap-1 border-l border-[#303030] pl-4">
            <span className="text-[#858585] text-xs uppercase font-medium">Root Folder</span>
            <span className="text-[#f5f5f5] font-mono text-xs md:text-sm font-semibold break-all">{rootPathDisplay}</span>
          </div>
          {/* META 02 */}
          <div className="flex flex-col gap-1 border-l border-[#303030] pl-4">
            <span className="text-[#858585] text-xs uppercase font-medium">Total Files</span>
            <span className="text-[#f5f5f5] text-xl font-bold font-mono">{fileCount.toLocaleString()}</span>
          </div>
          {/* META 03 */}
          <div className="flex flex-col gap-1 border-l border-[#303030] pl-4">
            <span className="text-[#858585] text-xs uppercase font-medium">Directories</span>
            <span className="text-[#f5f5f5] text-xl font-bold font-mono">{dirCount.toLocaleString()}</span>
          </div>
          {/* META 04 */}
          <div className="flex flex-col gap-1 border-l border-[#303030] pl-4">
            <span className="text-[#858585] text-xs uppercase font-medium">Status</span>
            <span className="text-[#57b887] font-semibold text-sm">{rootNode ? 'Results Loaded' : 'No scan loaded'}</span>
          </div>
        </div>
      </section>

      {/* FOOTER ACTIONS */}
      <section className="pt-2 flex flex-wrap gap-4 justify-between items-center text-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExportJson}
            disabled={!rootNode}
            className="bg-[#141414] text-[#b8b8b8] hover:bg-white hover:text-black border border-[#454545] px-5 py-2.5 transition-all text-sm font-medium cursor-pointer rounded-[2px] disabled:opacity-50"
          >
            Export Structure (JSON)
          </button>
          <button
            type="button"
            onClick={() => onNavigate('duplicates')}
            className="bg-white text-black font-semibold border border-white px-6 py-2.5 transition-all text-sm hover:bg-neutral-200 cursor-pointer rounded-[2px]"
          >
            Review Duplicate Files →
          </button>
        </div>
      </section>
    </div>
  );
};
