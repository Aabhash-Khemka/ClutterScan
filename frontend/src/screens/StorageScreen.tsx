import React, { useState } from 'react';
import { TreeNode, NavTab } from '../types';
import { INITIAL_FILESYSTEM_TREE } from '../mockData';

interface StorageScreenProps {
  onNavigate: (tab: NavTab) => void;
  onShowNotice?: (msg: string) => void;
}

export const StorageScreen: React.FC<StorageScreenProps> = ({
  onNavigate,
  onShowNotice,
}) => {
  const [treeData, setTreeData] = useState<TreeNode[]>(INITIAL_FILESYSTEM_TREE);
  const [isAllExpanded, setIsAllExpanded] = useState<boolean>(false);
  const [isReindexing, setIsReindexing] = useState<boolean>(false);

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

  // Flattened rendering with precise line indices matching the screenshot:
  // 0000: C:\
  // 0001: ├── Users/
  // 0002: │   ├── Aabhash/
  // 0003: │   │   ├── Documents/
  // 0004: │   │   │   ├── Projects/
  // 0005: │   │   │   └── Archives/
  // 0006: │   │   ├── Downloads/
  // 0007: │   │   │   ├── Installers/
  // 0008: │   │   │   └── Torrents_Cache/
  // 0009: │   │   └── Pictures/
  // 0010: │   │       ├── Camera_RAW/
  // 0011: │   │       └── Screenshots/
  // 0012: │   └── Public/
  // 0013: ├── Program Files/
  // 0014: └── Windows/

  // Find specific node states for collapse/expand
  const rootNode = treeData[0];
  const usersNode = rootNode?.children?.find((c) => c.id === 'node-users');
  const operatorNode = usersNode?.children?.find((c) => c.id === 'node-operator');
  const docNode = operatorNode?.children?.find((c) => c.id === 'documents-group');
  const dlNode = operatorNode?.children?.find((c) => c.id === 'downloads-group');
  const picNode = operatorNode?.children?.find((c) => c.id === 'pictures-group');
  const publicNode = usersNode?.children?.find((c) => c.id === 'node-public');
  const progNode = rootNode?.children?.find((c) => c.id === 'node-progfiles');
  const winNode = rootNode?.children?.find((c) => c.id === 'node-windows');

  return (
    <div className="w-full flex flex-col gap-6 font-mono text-xs text-white">
      {/* SECTION HEADER: FORENSIC DOSSIER IDENTIFIER */}
      <section className="border-b border-[#1f1f1f] pb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-3">
        <div className="flex flex-col gap-1">
          <div className="text-base md:text-xl font-bold text-white tracking-widest uppercase">
            [STORAGE_METRICS_OVERVIEW]
          </div>
          <div className="text-[11px] text-[#8e9192] uppercase tracking-wider">
            FILESYSTEM STRUCTURE // SCAN SESSION #001
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
            184.42 GB
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
            12,482
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
            1,284
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
            04:28
          </div>
          <div className="text-[11px] text-[#c4c7c8] border-t border-[#1f1f1f] pt-2">
            FASTAPI BRIDGE LATENCY 12ms
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
            <span className="text-[#8e9192]">TREE_DEPTH: 04</span>
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
        <div className="text-xs md:text-sm leading-relaxed overflow-x-auto text-[#e2e2e2] select-none font-mono">
          {/* ROOT NODE */}
          <div className="text-white font-bold flex items-center py-1">
            <span className="w-14 text-[#8e9192]">0000:</span>
            <span className="text-white">C:\</span>
            <span className="ml-auto text-[#8e9192] text-xs">ROOT VOLUME</span>
          </div>
          <div className="text-[#8e9192] py-0.5">
            <span className="w-14 inline-block"></span>│
          </div>

          {/* USERS */}
          <div className="flex items-center py-1 group hover:bg-white hover:text-black transition-none">
            <span className="w-14 text-[#8e9192] group-hover:text-black">0001:</span>
            <span>├── Users/</span>
            <span className="ml-auto tabular-nums pr-4">72.4 GB</span>
          </div>
          <div className="text-[#8e9192] py-0.5">
            <span className="w-14 inline-block"></span>│&nbsp;&nbsp;&nbsp;│
          </div>

          {/* USERS/OPERATOR */}
          <div className="flex items-center py-1 group hover:bg-white hover:text-black transition-none">
            <span className="w-14 text-[#8e9192] group-hover:text-black">0002:</span>
            <span>│&nbsp;&nbsp;&nbsp;├── Operator/</span>
            <span className="ml-auto tabular-nums pr-4">58.2 GB</span>
          </div>
          <div className="text-[#8e9192] py-0.5">
            <span className="w-14 inline-block"></span>│&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;│
          </div>

          {/* DOCUMENTS SECTION (COLLAPSIBLE) */}
          <div
            onClick={() => toggleNodeById('documents-group')}
            className="flex items-center py-1 group hover:bg-white hover:text-black cursor-pointer transition-none"
          >
            <span className="w-14 text-[#8e9192] group-hover:text-black">0003:</span>
            <span>│&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;├── Documents/</span>
            <span className="ml-auto tabular-nums pr-4">12.4 GB</span>
            <span className="text-[11px] border border-[#444748] group-hover:border-black px-1.5 py-0.5">
              {docNode?.isOpen ? '[ - COLLAPSE ]' : '[ + EXPAND ]'}
            </span>
          </div>

          {docNode?.isOpen && (
            <div className="flex flex-col">
              <div className="flex items-center py-1 group hover:bg-white hover:text-black transition-none">
                <span className="w-14 text-[#8e9192] group-hover:text-black">0004:</span>
                <span>│&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;├── Projects/</span>
                <span className="ml-auto tabular-nums pr-4">8.1 GB</span>
                <span className="w-24 text-right text-[#8e9192] group-hover:text-black text-xs">
                  LEAF_NODE
                </span>
              </div>
              <div className="flex items-center py-1 group hover:bg-white hover:text-black transition-none">
                <span className="w-14 text-[#8e9192] group-hover:text-black">0005:</span>
                <span>│&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;└── Archives/</span>
                <span className="ml-auto tabular-nums pr-4">4.3 GB</span>
                <span className="w-24 text-right text-[#8e9192] group-hover:text-black text-xs">
                  ARCHIVED
                </span>
              </div>
            </div>
          )}

          {/* DOWNLOADS (EXPANDABLE) */}
          <div
            onClick={() => toggleNodeById('downloads-group')}
            className="flex items-center py-1 group hover:bg-white hover:text-black cursor-pointer transition-none"
          >
            <span className="w-14 text-[#8e9192] group-hover:text-black">0006:</span>
            <span>│&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;├── Downloads/</span>
            <span className="ml-auto tabular-nums pr-4">18.7 GB</span>
            <span className="text-[11px] border border-[#444748] group-hover:border-black px-1.5 py-0.5">
              {dlNode?.isOpen ? '[ - COLLAPSE ]' : '[ + EXPAND ]'}
            </span>
          </div>

          {dlNode?.isOpen && (
            <div className="flex flex-col">
              <div className="flex items-center py-1 group hover:bg-white hover:text-black transition-none">
                <span className="w-14 text-[#8e9192] group-hover:text-black">0007:</span>
                <span>│&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;├── Installers/</span>
                <span className="ml-auto tabular-nums pr-4">11.2 GB</span>
                <span className="w-24 text-right text-[#8e9192] group-hover:text-black text-xs">
                  BINARIES
                </span>
              </div>
              <div className="flex items-center py-1 group hover:bg-white hover:text-black transition-none">
                <span className="w-14 text-[#8e9192] group-hover:text-black">0008:</span>
                <span>│&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;└── Torrents_Cache/</span>
                <span className="ml-auto tabular-nums pr-4">7.5 GB</span>
                <span className="w-24 text-right text-[#8e9192] group-hover:text-black text-xs">
                  FLAGGED
                </span>
              </div>
            </div>
          )}

          {/* PICTURES (EXPANDABLE) */}
          <div
            onClick={() => toggleNodeById('pictures-group')}
            className="flex items-center py-1 group hover:bg-white hover:text-black cursor-pointer transition-none"
          >
            <span className="w-14 text-[#8e9192] group-hover:text-black">0009:</span>
            <span>│&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;└── Pictures/</span>
            <span className="ml-auto tabular-nums pr-4">27.1 GB</span>
            <span className="text-[11px] border border-[#444748] group-hover:border-black px-1.5 py-0.5">
              {picNode?.isOpen ? '[ - COLLAPSE ]' : '[ + EXPAND ]'}
            </span>
          </div>

          {picNode?.isOpen && (
            <div className="flex flex-col">
              <div className="flex items-center py-1 group hover:bg-white hover:text-black transition-none">
                <span className="w-14 text-[#8e9192] group-hover:text-black">0010:</span>
                <span>│&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── Camera_RAW/</span>
                <span className="ml-auto tabular-nums pr-4">19.4 GB</span>
                <span className="w-24 text-right text-[#8e9192] group-hover:text-black text-xs">
                  MEDIA
                </span>
              </div>
              <div className="flex items-center py-1 group hover:bg-white hover:text-black transition-none">
                <span className="w-14 text-[#8e9192] group-hover:text-black">0011:</span>
                <span>│&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── Screenshots/</span>
                <span className="ml-auto tabular-nums pr-4">7.7 GB</span>
                <span className="w-24 text-right text-[#8e9192] group-hover:text-black text-xs">
                  DUPLICATES
                </span>
              </div>
            </div>
          )}

          <div className="text-[#8e9192] py-0.5">
            <span className="w-14 inline-block"></span>│&nbsp;&nbsp;&nbsp;│
          </div>

          {/* USERS/PUBLIC */}
          <div className="flex items-center py-1 group hover:bg-white hover:text-black transition-none">
            <span className="w-14 text-[#8e9192] group-hover:text-black">0012:</span>
            <span>│&nbsp;&nbsp;&nbsp;└── Public/</span>
            <span className="ml-auto tabular-nums pr-4">2.1 GB</span>
            <span className="w-24 text-right text-[#8e9192] group-hover:text-black text-xs">
              SHARED
            </span>
          </div>
          <div className="text-[#8e9192] py-0.5">
            <span className="w-14 inline-block"></span>│
          </div>

          {/* PROGRAM FILES */}
          <div className="flex items-center py-1 group hover:bg-white hover:text-black transition-none">
            <span className="w-14 text-[#8e9192] group-hover:text-black">0013:</span>
            <span>├── Program Files/</span>
            <span className="ml-auto tabular-nums pr-4">41.3 GB</span>
            <span className="w-24 text-right text-[#8e9192] group-hover:text-black text-xs">
              SYS_PROTECTED
            </span>
          </div>
          <div className="text-[#8e9192] py-0.5">
            <span className="w-14 inline-block"></span>│
          </div>

          {/* WINDOWS */}
          <div className="flex items-center py-1 group hover:bg-white hover:text-black transition-none">
            <span className="w-14 text-[#8e9192] group-hover:text-black">0014:</span>
            <span>└── Windows/</span>
            <span className="ml-auto tabular-nums pr-4">28.9 GB</span>
            <span className="w-24 text-right text-[#8e9192] group-hover:text-black text-xs">
              NTFS_CORE
            </span>
          </div>
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
            <span className="text-white font-bold break-all">C:\Users\Operator\Documents</span>
          </div>
          {/* META 02 */}
          <div className="flex flex-col gap-1 border-l border-[#1f1f1f] pl-4">
            <span className="text-[#8e9192] text-[10px] uppercase">FILES</span>
            <span className="text-white font-bold">12,482</span>
          </div>
          {/* META 03 */}
          <div className="flex flex-col gap-1 border-l border-[#1f1f1f] pl-4">
            <span className="text-[#8e9192] text-[10px] uppercase">DIRECTORIES</span>
            <span className="text-white font-bold">1,284</span>
          </div>
          {/* META 04 */}
          <div className="flex flex-col gap-1 border-l border-[#1f1f1f] pl-4">
            <span className="text-[#8e9192] text-[10px] uppercase">SCAN STATUS</span>
            <span className="text-white font-bold">COMPLETE (FASTAPI WORKER #04 VERIFIED)</span>
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
