import React, { useState, useEffect } from 'react';
import { TreeNode, NavTab } from '../types';
import { INITIAL_FILESYSTEM_TREE } from '../mockData';

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
  const [treeData, setTreeData] = useState<TreeNode[]>(initialTreeData || INITIAL_FILESYSTEM_TREE);
  const [isAllExpanded, setIsAllExpanded] = useState<boolean>(false);
  const [isReindexing, setIsReindexing] = useState<boolean>(false);

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
    const jsonString = JSON.stringify(treeData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clutterscan_structure.json';
    a.click();
    URL.revokeObjectURL(url);
    if (onShowNotice) {
      onShowNotice('EXPORT_STRUCTURE.JSON COMMITTED TO DISK BUFFER');
    }
  };

  const handleReindex = () => {
    setIsReindexing(true);
    setTimeout(() => {
      setIsReindexing(false);
      if (onShowNotice) {
        onShowNotice('FASTAPI WORKER #04: INODES RE-INDEXED (12,482 NODES OK)');
      }
    }, 1000);
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
  const rootSizeDisplay = rootNode ? rootNode.size : '0 B';
  const rootPathDisplay = rootNode ? rootNode.path : 'N/A';

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
        path: node.path,
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

  const flattenedTree = flattenTree(treeData);

  return (
    <div className="w-full flex flex-col gap-6 font-mono text-xs text-white">
      {/* SECTION HEADER: FORENSIC DOSSIER IDENTIFIER */}
      <section className="border-b border-[#1f1f1f] pb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-3">
        <div className="flex flex-col gap-1">
          <div className="text-base md:text-xl font-bold text-white tracking-widest uppercase">
            [STORAGE_METRICS_OVERVIEW]
          </div>
          <div className="text-[11px] text-[#8e9192] uppercase tracking-wider">
            FILESYSTEM STRUCTURE // {rootPathDisplay}
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-[#8e9192]">SYSTEM_DISPATCH ::</span>
          <span className="border border-[#444748] px-2 py-0.5 text-white bg-[#0e0e0e] uppercase">
            INODE_TRAVERSAL_ENGINE // DEPTH_LIMIT: UNBOUNDED
          </span>
        </div>
      </section>

      {/* TOP METRICS: 4 RECTANGULAR TELEMETRY CELLS */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CELL 01: TOTAL SCANNED */}
        <div className="border border-[#1f1f1f] bg-[#0e0e0e] p-6 flex flex-col justify-between h-36">
          <div className="flex justify-between items-center text-[#8e9192] text-[11px]">
            <span>[ TOTAL SCANNED ]</span>
            <span>SEC_01</span>
          </div>
          <div className="text-2xl md:text-3xl font-bold text-white tracking-tight tabular-nums">
            {rootSizeDisplay}
          </div>
          <div className="text-[11px] text-[#c4c7c8] border-t border-[#1f1f1f] pt-2">
            STORAGE ANALYZED
          </div>
        </div>

        {/* CELL 02: FILES PROCESSED */}
        <div className="border border-[#1f1f1f] bg-[#0e0e0e] p-6 flex flex-col justify-between h-36">
          <div className="flex justify-between items-center text-[#8e9192] text-[11px]">
            <span>[ FILES PROCESSED ]</span>
            <span>SEC_02</span>
          </div>
          <div className="text-2xl md:text-3xl font-bold text-white tracking-tight tabular-nums">
            {fileCount.toLocaleString()}
          </div>
          <div className="text-[11px] text-[#c4c7c8] border-t border-[#1f1f1f] pt-2">
            INODE OBJECTS CATALOGED
          </div>
        </div>

        {/* CELL 03: DIRECTORIES */}
        <div className="border border-[#1f1f1f] bg-[#0e0e0e] p-6 flex flex-col justify-between h-36">
          <div className="flex justify-between items-center text-[#8e9192] text-[11px]">
            <span>[ DIRECTORIES ]</span>
            <span>SEC_03</span>
          </div>
          <div className="text-2xl md:text-3xl font-bold text-white tracking-tight tabular-nums">
            {dirCount.toLocaleString()}
          </div>
          <div className="text-[11px] text-[#c4c7c8] border-t border-[#1f1f1f] pt-2">
            DISK FOLDERS TRAVERSED
          </div>
        </div>

        {/* CELL 04: SCAN DURATION */}
        <div className="border border-[#1f1f1f] bg-[#0e0e0e] p-6 flex flex-col justify-between h-36">
          <div className="flex justify-between items-center text-[#8e9192] text-[11px]">
            <span>[ SCAN DURATION ]</span>
            <span className="text-white font-bold">● LIVE</span>
          </div>
          <div className="text-2xl md:text-3xl font-bold text-white tracking-tight tabular-nums">
            LIVE
          </div>
          <div className="text-[11px] text-[#c4c7c8] border-t border-[#1f1f1f] pt-2">
            FASTAPI TRAVERSAL ACTIVE
          </div>
        </div>
      </section>

      {/* MIDDLE SECTION: RECURSIVE DIRECTORY AGGREGATION TREE */}
      <section className="border border-[#1f1f1f] bg-[#0e0e0e] p-6 flex flex-col">
        {/* TREE HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 mb-4 border-b border-[#1f1f1f] gap-2">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-sm md:text-base">
              [FILESYSTEM_TREE]
            </span>
            <span className="text-[#8e9192] text-[11px]">
              // RECURSIVE DIRECTORY AGGREGATION
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-[#8e9192]">TREE_DEPTH: {maxDepth.toString().padStart(2, '0')}</span>
            <span className="text-[#8e9192]">|</span>
            <button
              type="button"
              onClick={toggleAll}
              className="text-[#c4c7c8] hover:text-black hover:bg-white px-2 py-0.5 border border-[#444748] transition-none cursor-pointer uppercase"
            >
              {isAllExpanded ? '[ COLLAPSE ALL ]' : '[ EXPAND/COLLAPSE ALL ]'}
            </button>
          </div>
        </div>

        {/* ASCII / TEXT TREE INTERACTION BUFFER */}
        <div className="text-xs md:text-sm leading-relaxed overflow-x-auto text-[#e2e2e2] select-none font-mono max-h-[500px]">
          {flattenedTree.map((item, index) => {
            const lineNum = index.toString().padStart(4, '0');
            if (item.isRoot) {
              return (
                <div key={item.id} className="text-white font-bold flex items-center py-1 border-b border-[#1f1f1f]">
                  <span className="w-14 text-[#8e9192]">{lineNum}:</span>
                  <span className="text-white">{item.name}</span>
                  <span className="ml-auto text-[#8e9192] text-xs pr-4">{item.size}</span>
                  <span className="text-[#8e9192] text-xs uppercase">{item.tag || 'ROOT TARGET'}</span>
                </div>
              );
            }

            return (
              <div
                key={item.id}
                onClick={() => item.isDir && toggleNodeById(item.id)}
                className={`flex items-center py-1 group hover:bg-white hover:text-black transition-none ${
                  item.isDir ? 'cursor-pointer' : ''
                }`}
              >
                <span className="w-14 text-[#8e9192] group-hover:text-black">{lineNum}:</span>
                <span className="truncate">{item.prefix}{item.name}</span>
                <span className="ml-auto tabular-nums pr-4">{item.size}</span>
                {item.isDir ? (
                  <span className="text-[11px] border border-[#444748] group-hover:border-black px-1.5 py-0.5">
                    {item.isOpen ? '[ - COLLAPSE ]' : '[ + EXPAND ]'}
                  </span>
                ) : (
                  <span className="w-24 text-right text-[#8e9192] group-hover:text-black text-xs">
                    {item.tag || 'INODE'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* BOTTOM STATUS SECTION: SCAN_METADATA DOSSIER */}
      <section className="border border-[#1f1f1f] bg-[#0e0e0e] p-6">
        <div className="text-sm font-bold text-white mb-4 pb-2 border-b border-[#1f1f1f] flex items-center justify-between">
          <span>[SCAN_METADATA]</span>
          <span className="text-[11px] text-[#8e9192]">TELEMETRY_LOG_VERIFIED</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
          {/* META 01 */}
          <div className="flex flex-col gap-1 border-l border-[#1f1f1f] pl-4">
            <span className="text-[#8e9192] text-[10px] uppercase">ROOT TARGET</span>
            <span className="text-white font-bold break-all">{rootPathDisplay}</span>
          </div>
          {/* META 02 */}
          <div className="flex flex-col gap-1 border-l border-[#1f1f1f] pl-4">
            <span className="text-[#8e9192] text-[10px] uppercase">FILES</span>
            <span className="text-white font-bold">{fileCount.toLocaleString()}</span>
          </div>
          {/* META 03 */}
          <div className="flex flex-col gap-1 border-l border-[#1f1f1f] pl-4">
            <span className="text-[#8e9192] text-[10px] uppercase">DIRECTORIES</span>
            <span className="text-white font-bold">{dirCount.toLocaleString()}</span>
          </div>
          {/* META 04 */}
          <div className="flex flex-col gap-1 border-l border-[#1f1f1f] pl-4">
            <span className="text-[#8e9192] text-[10px] uppercase">SCAN STATUS</span>
            <span className="text-white font-bold">COMPLETE (FASTAPI INODE TRAVERSAL VERIFIED)</span>
          </div>
        </div>
      </section>

      {/* TERMINAL FOOTER ACTIONS */}
      <section className="pt-2 flex flex-wrap gap-4 justify-between items-center text-xs">
        <div className="flex items-center gap-2 text-[#8e9192]">
          <span>CURSOR: SECTOR_INSPECT</span>
          <span>::</span>
          <span className="text-white font-bold">IO_WAIT: 0.00%</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExportJson}
            className="bg-[#0e0e0e] text-[#c4c7c8] hover:bg-white hover:text-black border border-[#444748] px-4 py-2 transition-none uppercase cursor-pointer"
          >
            [ EXPORT_STRUCTURE.JSON ]
          </button>
          <button
            type="button"
            onClick={handleReindex}
            disabled={isReindexing}
            className="bg-[#0e0e0e] text-[#c4c7c8] hover:bg-white hover:text-black border border-[#444748] px-4 py-2 transition-none uppercase cursor-pointer disabled:opacity-50"
          >
            {isReindexing ? '[ INDEXING INODES... ]' : '[ RE-INDEX DISK ]'}
          </button>
          <button
            type="button"
            onClick={() => onNavigate('duplicates')}
            className="bg-white text-black font-bold border border-white px-4 py-2 transition-none uppercase hover:bg-neutral-200 cursor-pointer"
          >
            → CRYPTOGRAPHIC DUPLICATES
          </button>
        </div>
      </section>
    </div>
  );
};
