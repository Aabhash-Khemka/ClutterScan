import React, { useState, useEffect } from 'react';
import { TreeNode, NavTab } from '../types';
import {
  Folder,
  FolderOpen,
  FileText,
  Download,
  ArrowRight,
  Layers,
  HardDrive,
  ChevronRight,
  ChevronDown,
  Info
} from 'lucide-react';

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

  // Recursive tree flattening
  interface FlattenedTreeItem {
    id: string;
    name: string;
    path: string;
    size: string;
    isDir: boolean;
    isOpen: boolean;
    depth: number;
    tag?: string;
  }

  const flattenTree = (nodes: TreeNode[], depth = 0): FlattenedTreeItem[] => {
    const items: FlattenedTreeItem[] = [];
    nodes.forEach((node) => {
      items.push({
        id: node.id,
        name: node.name,
        path: node.path ?? node.name,
        size: node.size,
        isDir: !!node.isDir,
        isOpen: !!node.isOpen,
        depth,
        tag: node.tag,
      });

      if (node.isDir && node.isOpen && node.children && node.children.length > 0) {
        items.push(...flattenTree(node.children, depth + 1));
      }
    });
    return items;
  };

  const flattenedTree = flattenTree(treeData);

  return (
    <div className="w-full flex flex-col gap-6 text-[#172033] pb-12">
      {/* PAGE HEADER */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-[#172033] tracking-tight">
              Storage Breakdown
            </h1>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#EEF2FF] text-[#5B5CE2] border border-[#C7D2FE]">
              Tree Analysis
            </span>
          </div>
          <p className="text-sm md:text-base text-[#64748B]">
            Interactive directory hierarchy and recursive size distribution for{' '}
            <span className="text-[#172033] font-semibold">{rootPathDisplay}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportJson}
            disabled={!rootNode}
            className="px-3.5 py-2 border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-[#334155] text-xs font-semibold rounded-lg cursor-pointer flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
          >
            <Download size={14} />
            <span>Export JSON</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('duplicates')}
            className="px-4 py-2 bg-[#5B5CE2] hover:bg-[#4849C7] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>Review Duplicates</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </section>

      {/* SUMMARY METRICS CARDS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
          <div className="text-xs font-medium uppercase tracking-wider text-[#64748B]">Total Storage Analyzed</div>
          <div className="text-2xl lg:text-3xl font-bold text-[#172033] mt-1.5">{rootSizeDisplay}</div>
          <div className="text-xs text-[#94A3B8] mt-1">Aggregated folder weight</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
          <div className="text-xs font-medium uppercase tracking-wider text-[#64748B]">Files Processed</div>
          <div className="text-2xl lg:text-3xl font-bold text-[#172033] mt-1.5">
            {rootNode ? fileCount.toLocaleString() : '—'}
          </div>
          <div className="text-xs text-[#94A3B8] mt-1">Individual files indexed</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
          <div className="text-xs font-medium uppercase tracking-wider text-[#64748B]">Directories</div>
          <div className="text-2xl lg:text-3xl font-bold text-[#5B5CE2] mt-1.5">
            {rootNode ? dirCount.toLocaleString() : '—'}
          </div>
          <div className="text-xs text-[#94A3B8] mt-1">Folders traversed</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
          <div className="text-xs font-medium uppercase tracking-wider text-[#64748B]">Hierarchy Depth</div>
          <div className="text-2xl lg:text-3xl font-bold text-[#15803D] mt-1.5">
            {rootNode ? `${maxDepth} Levels` : '—'}
          </div>
          <div className="text-xs text-[#94A3B8] mt-1">Max subdirectory depth</div>
        </div>
      </section>

      {/* DIRECTORY TREE CARD */}
      <section className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden flex flex-col">
        {/* Tree Toolbar */}
        <div className="bg-[#F8FAFC] px-5 py-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2.5">
            <HardDrive size={18} className="text-[#5B5CE2]" />
            <div>
              <h2 className="text-sm font-semibold text-[#172033]">
                Filesystem Directory Map
              </h2>
              <span className="text-xs text-[#64748B]">
                Click any directory to expand or collapse subtrees
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#64748B]">
              Max depth: <strong className="text-[#172033]">{maxDepth}</strong>
            </span>
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs font-semibold px-3 py-1.5 bg-white border border-[#CBD5E1] hover:bg-[#F1F5F9] text-[#334155] rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              {isAllExpanded ? 'Collapse All' : 'Expand All'}
            </button>
          </div>
        </div>

        {/* Tree List Container */}
        <div className="divide-y divide-[#F1F5F9] max-h-[560px] overflow-y-auto">
          {flattenedTree.length === 0 ? (
            <div className="p-12 text-center text-sm text-[#64748B]">
              No scan results loaded. Run a scan from the Overview tab to view the folder structure.
            </div>
          ) : (
            flattenedTree.map((item) => {
              const paddingLeft = `${item.depth * 24 + 16}px`;

              return (
                <div
                  key={item.id}
                  onClick={() => item.isDir && toggleNodeById(item.id)}
                  style={{ paddingLeft }}
                  className={`py-3 pr-5 flex items-center justify-between text-sm transition-colors ${
                    item.isDir
                      ? 'cursor-pointer hover:bg-[#F8FAFC]'
                      : 'hover:bg-[#F8FAFC]/50 text-[#334155]'
                  } ${item.depth === 0 ? 'bg-[#EEF2FF]/30 font-semibold' : ''}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {item.isDir ? (
                      <span className="text-[#64748B]">
                        {item.isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </span>
                    ) : (
                      <span className="w-4" />
                    )}

                    <div className="shrink-0 text-[#5B5CE2]">
                      {item.isDir ? (
                        item.isOpen ? <FolderOpen size={18} className="text-[#5B5CE2]" /> : <Folder size={18} className="text-[#5B5CE2]" />
                      ) : (
                        <FileText size={16} className="text-[#94A3B8]" />
                      )}
                    </div>

                    <span className="truncate text-[#172033] font-medium" title={item.path}>
                      {item.name}
                    </span>

                    {item.depth === 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#EEF2FF] text-[#5B5CE2] font-semibold border border-[#C7D2FE]">
                        Root
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0 pl-4">
                    <span className="text-xs font-semibold text-[#172033] tabular-nums">
                      {item.size}
                    </span>
                    {item.isDir ? (
                      <span className="text-[11px] text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-md font-medium">
                        {item.isOpen ? 'Expanded' : 'Collapsed'}
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#94A3B8] font-mono">
                        {item.tag || 'FILE'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* METADATA SUMMARY CARD */}
      <section className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] mb-4">
          <div className="text-sm font-semibold text-[#172033]">Session Scan Properties</div>
          <span className="text-xs text-[#16A34A] font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#16A34A]" /> Ready for review
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0]">
            <span className="text-[#64748B] block font-medium mb-1">Target Directory</span>
            <span className="font-semibold text-[#172033] break-all">{rootPathDisplay}</span>
          </div>

          <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0]">
            <span className="text-[#64748B] block font-medium mb-1">Files Processed</span>
            <span className="font-semibold text-[#172033] text-sm">{fileCount.toLocaleString()} items</span>
          </div>

          <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0]">
            <span className="text-[#64748B] block font-medium mb-1">Subdirectories</span>
            <span className="font-semibold text-[#172033] text-sm">{dirCount.toLocaleString()} folders</span>
          </div>

          <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0]">
            <span className="text-[#64748B] block font-medium mb-1">Scan Status</span>
            <span className="font-semibold text-[#15803D] text-sm">Indexed & Verified</span>
          </div>
        </div>
      </section>
    </div>
  );
};
