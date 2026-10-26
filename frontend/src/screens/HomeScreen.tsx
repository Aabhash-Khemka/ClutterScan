import React, { useState, useEffect, useMemo } from 'react';
import { NavTab, TreeNode, HashGroup, MetadataFileItem } from '../types';
import { api, SystemVolumeData, SystemFolderData } from '../services/api';
import { extractVisualFiles, VisualFileNode, formatBytes, computeCategoryMetrics } from '../utils/visualDataUtils';
import { StorageOrbHero } from '../components/visualizations/StorageOrbHero';
import { StorageTreemap } from '../components/visualizations/StorageTreemap';
import { FileUniverseMap } from '../components/visualizations/FileUniverseMap';
import { DuplicateClusterGraph } from '../components/visualizations/DuplicateClusterGraph';
import { StorageAnalyticsLab } from '../components/visualizations/StorageAnalyticsLab';
import { FileInspectionPanel } from '../components/visualizations/FileInspectionPanel';

interface HomeScreenProps {
  onNavigate: (tab: NavTab) => void;
  onScanCompleted: (scanId?: string, totalFiles?: number) => void;
  treeData?: TreeNode[];
  hashGroups?: HashGroup[];
  files?: MetadataFileItem[];
  scanId?: string | null;
  onStageCandidate?: (groupIds: string[]) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigate,
  onScanCompleted,
  treeData = [],
  hashGroups = [],
  files: initialFiles = [],
  scanId,
  onStageCandidate,
}) => {
  const [activeVisualizer, setActiveVisualizer] = useState<'orb' | 'treemap' | 'universe' | 'duplicates' | 'lab'>('orb');
  const [selectedFileForInspection, setSelectedFileForInspection] = useState<VisualFileNode | null>(null);

  // Derive visual file nodes deterministically from scan tree
  const visualFiles = useMemo(() => {
    return extractVisualFiles(treeData, hashGroups);
  }, [treeData, hashGroups]);

  const totalScannedBytes = useMemo(() => {
    return visualFiles.reduce((acc, f) => acc + f.bytes, 0);
  }, [visualFiles]);

  const duplicateWasteBytes = useMemo(() => {
    return hashGroups.reduce((acc, g) => {
      const copies = g.files ? g.files.length : 0;
      if (copies > 1) {
        return acc + (g.sizeBytes || 0) * (copies - 1);
      }
      return acc;
    }, 0);
  }, [hashGroups]);

  const duplicateFileCount = useMemo(() => {
    return hashGroups.reduce((acc, g) => {
      const copies = g.files ? g.files.length : 0;
      return acc + (copies > 1 ? copies - 1 : 0);
    }, 0);
  }, [hashGroups]);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedVolume, setSelectedVolume] = useState<'PRIMARY' | 'EXTERNAL' | 'CUSTOM'>('PRIMARY');
  const [volumes, setVolumes] = useState<SystemVolumeData[]>([]);
  const [folders, setFolders] = useState<SystemFolderData[]>([]);
  const [targetPath, setTargetPath] = useState<string>('');
  const [pipelineOptions, setPipelineOptions] = useState({
    exactDupes: true,
    similarImages: true,
    oldFiles: true,
    tempFiles: true,
    storageAnalytics: true,
  });

  const [scanStatus, setScanStatus] = useState<'READY' | 'SCANNING' | 'COMPLETE'>('READY');
  const [workersPercent, setWorkersPercent] = useState<number>(0);
  const [inodesPercent, setInodesPercent] = useState<number>(0);
  const [discoveredFiles, setDiscoveredFiles] = useState<number>(0);
  const [discoveredFormattedSize, setDiscoveredFormattedSize] = useState<string>('0 B');
  const [statusMessage, setStatusMessage] = useState<string>('Ready to scan.');

  // Detect local system volumes and accessible user folders on mount
  useEffect(() => {
    Promise.all([
      api.getSystemVolumes(),
      api.getSystemFolders(),
    ])
      .then(([vols, flds]) => {
        if (vols && vols.length > 0) {
          setVolumes(vols);
        }
        if (flds && flds.length > 0) {
          setFolders(flds);
          setTargetPath(flds[0].path);
          setSelectedVolume('CUSTOM');
        } else if (vols && vols.length > 0) {
          setTargetPath(vols[0].path);
        }
      })
      .catch((err) => {
        console.warn('System initialization error:', err);
      });
  }, []);

  const toggleOption = (key: keyof typeof pipelineOptions) => {
    setPipelineOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleExecuteScan = async () => {
    if (scanStatus === 'SCANNING') return;
    const cleanPath = targetPath.trim();
    if (!cleanPath) {
      setStatusMessage('ERROR: TARGET PATH CANNOT BE EMPTY.');
      return;
    }

    setScanStatus('SCANNING');
    setWorkersPercent(10);
    setInodesPercent(5);
    setDiscoveredFiles(0);
    setStatusMessage('Starting your scan…');

    try {
      const startResult = await api.startScan(cleanPath, pipelineOptions);
      const scanId = startResult.scanId;

      // Poll scan progress
      const pollInterval = setInterval(async () => {
        try {
          const status = await api.getScanStatus(scanId);
          setWorkersPercent(status.progress);
          setInodesPercent(status.progress);
          setDiscoveredFiles(status.totalFiles);
          if (status.formattedSize) {
            setDiscoveredFormattedSize(status.formattedSize);
          }
          setStatusMessage(
            status.status === 'FAILED'
              ? status.message || 'The scan could not be completed.'
              : status.status === 'COMPLETED'
                ? `Scan complete. ${status.totalFiles.toLocaleString()} files found.`
                : 'Scanning your files…'
          );

          if (status.status === 'COMPLETED') {
            clearInterval(pollInterval);
            setScanStatus('COMPLETE');
            setWorkersPercent(100);
            setInodesPercent(100);
            setDiscoveredFiles(status.totalFiles);
            setDiscoveredFormattedSize(status.formattedSize);
            setStatusMessage(`Scan complete. ${status.totalFiles.toLocaleString()} files found.`);
            onScanCompleted(scanId, status.totalFiles);
          } else if (status.status === 'FAILED') {
            clearInterval(pollInterval);
            setScanStatus('READY');
            setStatusMessage(`Scan error: ${status.message}`);
          }
        } catch (pollErr: any) {
          console.warn('Poll error:', pollErr);
        }
      }, 350);
    } catch (err: any) {
      setScanStatus('READY');
      setStatusMessage(`Scan error: ${err.message || 'Could not start the scan.'}`);
    }
  };

  const renderBlocks = (percentage: number) => {
    const totalBlocks = 24;
    const filled = Math.round((percentage / 100) * totalBlocks);
    const empty = Math.max(0, totalBlocks - filled);
    return '█'.repeat(filled) + '░'.repeat(empty);
  };

  return (
    <div className="w-full flex flex-col gap-8 text-[#f5f5f5]">
      {/* SECTION HEADER */}
      <section className="border-b border-[#303030] pb-5 flex flex-col md:flex-row justify-between items-start md:items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-[#f5f5f5] tracking-tight flex items-center gap-2.5">
              <span>ClutterScan Visual Intelligence</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#625BEE] inline-block shadow-[0_0_10px_#625BEE]"></span>
            </h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#625BEE] to-[#925CFF] text-white">
              V2.0 PRO
            </span>
          </div>
          <p className="text-sm md:text-base text-[#b8b8b8]">
            Interactive forensic file analytics, live storage constellation, and redundant space discovery.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-[#20C5E8] uppercase tracking-wider font-mono border border-[#20C5E8]/30 px-3 py-1.5 bg-[#20C5E8]/10 rounded-md">
            ● {visualFiles.length.toLocaleString()} Indexed Files ({formatBytes(totalScannedBytes)})
          </div>
        </div>
      </section>

      {/* VISUAL INTELLIGENCE COMMAND CENTRE SWITCHER */}
      <div className="w-full flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8E9AA8]">
              Visual Intelligence Mode:
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-[#0d0f17] p-1.5 rounded-xl border border-white/10 shadow-lg overflow-x-auto">
            {[
              { id: 'orb', label: 'Orbital Core', icon: '✦' },
              { id: 'treemap', label: 'Storage Treemap', icon: '▤' },
              { id: 'universe', label: 'File Universe Map', icon: '🌌' },
              { id: 'duplicates', label: 'Duplicate Constellation', icon: '⚡' },
              { id: 'lab', label: 'Analytics Lab', icon: '📊' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveVisualizer(tab.id as any)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeVisualizer === tab.id
                    ? 'bg-gradient-to-r from-[#625BEE] to-[#925CFF] text-white shadow-[0_4px_14px_rgba(98,91,238,0.4)]'
                    : 'text-[#8E9AA8] hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ACTIVE VISUALIZATION CANVAS */}
        <div className="w-full">
          {activeVisualizer === 'orb' && (
            <StorageOrbHero
              totalBytes={totalScannedBytes}
              totalFiles={visualFiles.length}
              duplicateBytes={duplicateWasteBytes}
              duplicateCount={duplicateFileCount}
              categories={computeCategoryMetrics(visualFiles)}
              selectedCategory={selectedCategory}
              onSelectCategory={(cat) => {
                setSelectedCategory(cat);
                if (cat) setActiveVisualizer('universe');
              }}
              onStartScan={handleExecuteScan}
              targetPath={targetPath}
            />
          )}

          {activeVisualizer === 'treemap' && (
            <StorageTreemap
              treeData={treeData}
              onSelectFile={(path) => {
                const found = visualFiles.find((f) => f.path === path);
                if (found) setSelectedFileForInspection(found);
              }}
            />
          )}

          {activeVisualizer === 'universe' && (
            <FileUniverseMap
              files={visualFiles}
              selectedCategory={selectedCategory}
              onSelectFile={(f) => setSelectedFileForInspection(f)}
            />
          )}

          {activeVisualizer === 'duplicates' && (
            <DuplicateClusterGraph
              hashGroups={hashGroups}
              onSelectFile={(f) => setSelectedFileForInspection(f)}
              onNavigateToDuplicates={() => onNavigate('duplicates')}
            />
          )}

          {activeVisualizer === 'lab' && (
            <StorageAnalyticsLab
              files={visualFiles}
              hashGroups={hashGroups}
              totalScannedBytes={totalScannedBytes}
            />
          )}
        </div>
      </div>

      {/* FLOATING FILE INSPECTION PANEL */}
      <FileInspectionPanel
        file={selectedFileForInspection}
        onClose={() => setSelectedFileForInspection(null)}
        onSelectDuplicateGroup={(groupId) => {
          onNavigate('duplicates');
        }}
        onStageForCleanup={(path) => {
          if (onStageCandidate) {
            onStageCandidate([path]);
          }
        }}
      />

      {/* SAFETY PROTOCOL BANNER */}
      <div className="border border-[#303030] p-4 bg-[#141414] rounded-[2px] flex flex-col md:flex-row md:items-center justify-between text-sm gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 bg-[#57b887]/20 border border-[#57b887]/40 text-[#57b887]">
            SAFE MODE
          </span>
          <span className="text-[#b8b8b8]">
            Scanning is strictly read-only. No files are ever moved or deleted without your explicit confirmation.
          </span>
        </div>
        <div className="text-xs text-[#858585] font-mono">
          Confirmed cleanup routes to Trash or Local Vault
        </div>
      </div>

      {/* 1. SELECT SCAN TARGET VOLUME */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-[#f5f5f5] tracking-tight">
            1. Select scan target
          </h2>
          <p className="text-sm text-[#b8b8b8] mt-0.5">
            Choose a drive or pick a specific user folder to analyze.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* PRIMARY VOLUME */}
          <button
            type="button"
            aria-pressed={selectedVolume === 'PRIMARY'}
            onClick={() => {
              setSelectedVolume('PRIMARY');
              if (volumes[0]) {
                setTargetPath(volumes[0].path);
              } else if (folders[0]) {
                setTargetPath(folders[0].path);
              }
            }}
            className={`w-full text-left border p-6 cursor-pointer select-none transition-all rounded-[2px] glow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${
              selectedVolume === 'PRIMARY'
                ? 'bg-white text-black border-white shadow-md'
                : 'bg-[#141414] text-[#f5f5f5] border-[#303030] hover:border-[#454545] hover:bg-[#1b1b1b]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={`text-xs uppercase font-semibold tracking-wider ${
                  selectedVolume === 'PRIMARY' ? 'text-black' : 'text-[#858585]'
                }`}
              >
                System Drive
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-[1px] uppercase font-mono font-bold ${
                  selectedVolume === 'PRIMARY' ? 'bg-black text-white' : 'bg-[#222222] text-[#858585]'
                }`}
              >
                NVMe/SSD
              </span>
            </div>
            <div className="text-xl md:text-2xl font-bold tracking-tight mb-1">
              {volumes[0]?.name || 'Local Disk'}
            </div>
            <div className="text-3xl md:text-4xl font-bold font-mono mb-3">
              {volumes[0]?.path || 'C:\\'}
            </div>

            {/* Capacity meter */}
            <div
              className={`w-full h-1.5 rounded-full overflow-hidden mb-2.5 ${
                selectedVolume === 'PRIMARY' ? 'bg-neutral-300' : 'bg-[#222222]'
              }`}
            >
              <div
                className={`h-full transition-all duration-500 ${
                  selectedVolume === 'PRIMARY' ? 'bg-black' : 'bg-[#57b887]'
                }`}
                style={{ width: `${volumes[0]?.percentUsed || 45}%` }}
              />
            </div>

            <div
              className={`text-sm ${
                selectedVolume === 'PRIMARY' ? 'text-neutral-800' : 'text-[#b8b8b8]'
              }`}
            >
              {volumes[0]
                ? `${volumes[0].formattedFree} free (${volumes[0].percentUsed}% used)`
                : 'Primary storage volume'}
            </div>
          </button>

          {/* EXTERNAL VOLUME */}
          <button
            type="button"
            aria-pressed={selectedVolume === 'EXTERNAL'}
            disabled={volumes.length < 2}
            onClick={() => {
              setSelectedVolume('EXTERNAL');
              if (volumes[1]) {
                setTargetPath(volumes[1].path);
              }
            }}
            className={`w-full text-left border p-6 select-none transition-all rounded-[2px] glow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${
              selectedVolume === 'EXTERNAL'
                ? 'bg-white text-black border-white shadow-md'
                : 'bg-[#141414] text-[#f5f5f5] border-[#303030] hover:border-[#454545] hover:bg-[#1b1b1b]'
            } ${
              volumes.length < 2 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={`text-xs uppercase font-semibold tracking-wider ${
                  selectedVolume === 'EXTERNAL' ? 'text-black' : 'text-[#858585]'
                }`}
              >
                Secondary Drive
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-[1px] uppercase font-mono font-bold ${
                  selectedVolume === 'EXTERNAL' ? 'bg-black text-white' : 'bg-[#222222] text-[#858585]'
                }`}
              >
                EXT/DISK
              </span>
            </div>
            <div className="text-xl md:text-2xl font-bold tracking-tight mb-1">
              {volumes.length > 1 ? volumes[1].name : 'No Secondary Drive'}
            </div>
            <div className="text-2xl md:text-3xl font-bold font-mono mb-3 truncate">
              {volumes.length > 1 ? volumes[1].path : '—'}
            </div>

            {/* Capacity meter */}
            {volumes.length > 1 && (
              <div
                className={`w-full h-1.5 rounded-full overflow-hidden mb-2.5 ${
                  selectedVolume === 'EXTERNAL' ? 'bg-neutral-300' : 'bg-[#222222]'
                }`}
              >
                <div
                  className={`h-full transition-all duration-500 ${
                    selectedVolume === 'EXTERNAL' ? 'bg-black' : 'bg-[#57b887]'
                  }`}
                  style={{ width: `${volumes[1]?.percentUsed || 30}%` }}
                />
              </div>
            )}

            <div
              className={`text-sm ${
                selectedVolume === 'EXTERNAL' ? 'text-neutral-800' : 'text-[#b8b8b8]'
              }`}
            >
              {volumes.length > 1
                ? `${volumes[1].formattedFree} free (${volumes[1].percentUsed}% used)`
                : 'Connect an external or backup drive'}
            </div>
          </button>

          {/* TARGET DIRECTORY / PRESET */}
          <button
            type="button"
            aria-pressed={selectedVolume === 'CUSTOM'}
            onClick={() => {
              setSelectedVolume('CUSTOM');
              if (folders.length > 0) {
                setTargetPath(folders[0].path);
              }
            }}
            className={`w-full text-left border p-6 cursor-pointer select-none transition-all rounded-[2px] glow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${
              selectedVolume === 'CUSTOM'
                ? 'bg-white text-black border-white shadow-md'
                : 'bg-[#141414] text-[#f5f5f5] border-[#303030] hover:border-[#454545] hover:bg-[#1b1b1b]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={`text-xs uppercase font-semibold tracking-wider ${
                  selectedVolume === 'CUSTOM' ? 'text-black' : 'text-[#858585]'
                }`}
              >
                Specific Folder
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-[1px] uppercase font-mono font-bold ${
                  selectedVolume === 'CUSTOM' ? 'bg-black text-white' : 'bg-[#222222] text-[#858585]'
                }`}
              >
                USER PRESET
              </span>
            </div>
            <div className="text-xl md:text-2xl font-bold tracking-tight mb-1">
              User Directory
            </div>
            <div className="text-2xl md:text-3xl font-bold font-mono mb-3 truncate">
              {folders.length > 0 ? folders[0].name : 'Custom Path'}
            </div>
            <div
              className={`text-sm ${
                selectedVolume === 'CUSTOM' ? 'text-neutral-800' : 'text-[#b8b8b8]'
              }`}
            >
              {folders.length > 0
                ? `${folders.length} accessible user folders ready`
                : 'Choose custom directory path below'}
            </div>
          </button>
        </div>
      </div>

      {/* TARGET PATH SPECIFICATION */}
      <div className="border border-[#303030] p-6 bg-[#141414] rounded-[2px] space-y-4">
        <div>
          <label htmlFor="scan-target-path" className="text-lg font-bold text-[#f5f5f5] tracking-tight block">
            2. Directory path to scan
          </label>
          <p className="text-sm text-[#b8b8b8] mt-1">
            Enter or paste any path on your computer. Subdirectories will be recursively inspected.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            id="scan-target-path"
            type="text"
            value={targetPath}
            onChange={(e) => {
              setTargetPath(e.target.value);
              setSelectedVolume('CUSTOM');
            }}
            aria-label="Folder or drive path to scan"
            className="bg-[#080808] border border-[#303030] px-4 py-3 text-base text-[#f5f5f5] font-mono flex-1 rounded-[2px] focus:border-white focus:outline-none"
            placeholder="e.g. C:\Users\Username\Downloads"
          />
          <button
            type="button"
            disabled={folders.length === 0}
            onClick={() => {
              if (folders.length > 0) {
                const currentIndex = folders.findIndex((f) => f.path.toLowerCase() === targetPath.toLowerCase());
                const nextFolder = folders[(currentIndex + 1) % folders.length];
                setTargetPath(nextFolder.path);
              }
            }}
            className="px-4 py-3 border border-[#303030] bg-[#1b1b1b] text-sm text-[#b8b8b8] hover:text-white hover:border-[#454545] transition-colors cursor-pointer whitespace-nowrap rounded-[2px] disabled:opacity-50"
          >
            Switch suggested folder
          </button>
          <button
            type="button"
            onClick={handleExecuteScan}
            disabled={scanStatus === 'SCANNING'}
            className="px-8 py-3 border border-white bg-white text-black font-semibold text-base uppercase tracking-wider transition-all hover:bg-neutral-200 cursor-pointer whitespace-nowrap rounded-[2px] disabled:opacity-50"
          >
            {scanStatus === 'SCANNING' ? 'Scanning…' : 'Start Scan'}
          </button>
        </div>
        {statusMessage && (
          <div className="text-xs text-[#b8b8b8] tracking-wide font-mono pt-1">
            &gt; {statusMessage}
          </div>
        )}
      </div>

      {/* ANALYSIS ALGORITHMS PIPELINE */}
      <div className="border border-[#303030] p-6 bg-[#141414] rounded-[2px]">
        <div className="mb-5">
          <h2 className="text-lg md:text-xl font-bold text-[#f5f5f5] tracking-tight">
            3. Detection categories
          </h2>
          <p className="text-sm text-[#b8b8b8] mt-0.5">
            Select the forensic analysis rules to run during this scan.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            type="button"
            aria-pressed={pipelineOptions.exactDupes}
            onClick={() => toggleOption('exactDupes')}
            className={`flex items-start gap-3 p-3.5 border transition-all text-left cursor-pointer rounded-[2px] glow-card ${
              pipelineOptions.exactDupes
                ? 'bg-[#1b1b1b] border-white text-white shadow-xs'
                : 'bg-[#101010] border-[#303030] text-[#858585] hover:border-[#484848]'
            }`}
          >
            <span className="font-mono text-base font-bold text-[#57b887]">
              {pipelineOptions.exactDupes ? '[✓]' : '[ ]'}
            </span>
            <div>
              <div className="text-base font-medium text-[#f5f5f5]">
                Exact copies
              </div>
              <div className="text-xs text-[#b8b8b8] mt-0.5">
                Cryptographic SHA-256 byte-by-byte match.
              </div>
            </div>
          </button>

          <button
            type="button"
            aria-pressed={pipelineOptions.similarImages}
            onClick={() => toggleOption('similarImages')}
            className={`flex items-start gap-3 p-3.5 border transition-all text-left cursor-pointer rounded-[2px] glow-card ${
              pipelineOptions.similarImages
                ? 'bg-[#1b1b1b] border-white text-white shadow-xs'
                : 'bg-[#101010] border-[#303030] text-[#858585] hover:border-[#484848]'
            }`}
          >
            <span className="font-mono text-base font-bold text-[#57b887]">
              {pipelineOptions.similarImages ? '[✓]' : '[ ]'}
            </span>
            <div>
              <div className="text-base font-medium text-[#f5f5f5]">
                Similar images
              </div>
              <div className="text-xs text-[#b8b8b8] mt-0.5">
                Perceptual pHash clustering for photos.
              </div>
            </div>
          </button>

          <button
            type="button"
            aria-pressed={pipelineOptions.oldFiles}
            onClick={() => toggleOption('oldFiles')}
            className={`flex items-start gap-3 p-3.5 border transition-all text-left cursor-pointer rounded-[2px] glow-card ${
              pipelineOptions.oldFiles
                ? 'bg-[#1b1b1b] border-white text-white shadow-xs'
                : 'bg-[#101010] border-[#303030] text-[#858585] hover:border-[#484848]'
            }`}
          >
            <span className="font-mono text-base font-bold text-[#57b887]">
              {pipelineOptions.oldFiles ? '[✓]' : '[ ]'}
            </span>
            <div>
              <div className="text-base font-medium text-[#f5f5f5]">
                Older files
              </div>
              <div className="text-xs text-[#b8b8b8] mt-0.5">
                Inactive files unmodified for &gt;180 days.
              </div>
            </div>
          </button>

          <button
            type="button"
            aria-pressed={pipelineOptions.tempFiles}
            onClick={() => toggleOption('tempFiles')}
            className={`flex items-start gap-3 p-3.5 border transition-all text-left cursor-pointer rounded-[2px] glow-card ${
              pipelineOptions.tempFiles
                ? 'bg-[#1b1b1b] border-white text-white shadow-xs'
                : 'bg-[#101010] border-[#303030] text-[#858585] hover:border-[#484848]'
            }`}
          >
            <span className="font-mono text-base font-bold text-[#57b887]">
              {pipelineOptions.tempFiles ? '[✓]' : '[ ]'}
            </span>
            <div>
              <div className="text-base font-medium text-[#f5f5f5]">
                Temporary files
              </div>
              <div className="text-xs text-[#b8b8b8] mt-0.5">
                Caches, crash dumps, and build artifacts.
              </div>
            </div>
          </button>

          <button
            type="button"
            aria-pressed={pipelineOptions.storageAnalytics}
            onClick={() => toggleOption('storageAnalytics')}
            className={`flex items-start gap-3 p-3.5 border transition-all text-left cursor-pointer rounded-[2px] glow-card ${
              pipelineOptions.storageAnalytics
                ? 'bg-[#1b1b1b] border-white text-white shadow-xs'
                : 'bg-[#101010] border-[#303030] text-[#858585] hover:border-[#484848]'
            }`}
          >
            <span className="font-mono text-base font-bold text-[#57b887]">
              {pipelineOptions.storageAnalytics ? '[✓]' : '[ ]'}
            </span>
            <div>
              <div className="text-base font-medium text-[#f5f5f5]">
                Storage overview
              </div>
              <div className="text-xs text-[#b8b8b8] mt-0.5">
                Deep folder sizing &amp; directory tree.
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* DIAGNOSTIC STATE TELEMETRY */}
      <div className="border border-[#303030] p-6 bg-[#141414] rounded-[2px] space-y-4">
        <div className="text-lg font-bold text-[#f5f5f5] tracking-tight">
          Scan status
        </div>

        {scanStatus === 'READY' && (
          <div className="space-y-1.5 py-2">
            <div className="text-base font-medium text-[#f5f5f5]">System ready</div>
            <div className="text-sm text-[#b8b8b8]">
              Target path confirmed above. Click "Start Scan" to run the pipeline.
            </div>
          </div>
        )}

        {scanStatus === 'SCANNING' && (
          <div className="space-y-5">
            <div className="text-base font-semibold text-white flex items-center justify-between">
              <span className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#57b887] inline-block animate-ping"></span>
                <span>Forensic scan in progress…</span>
              </span>
              <span className="border border-[#57b887] px-2.5 py-0.5 bg-[#57b887]/20 text-[#57b887] font-bold text-xs flex items-center gap-1.5 glow-accent">
                <span className="w-1.5 h-1.5 rounded-full bg-[#57b887] animate-pulse"></span>
                ACTIVE PIPELINE
              </span>
            </div>

            {/* Visual Animated Progress Meters */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-[#858585] uppercase">
                <span>Directory traversal</span>
                <span className="font-mono text-white font-bold">{workersPercent}%</span>
              </div>
              <div className="w-full h-2 bg-[#222222] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-neutral-400 via-white to-neutral-200 transition-all duration-300"
                  style={{ width: `${workersPercent}%` }}
                />
              </div>
              <div className="text-[#858585] text-xs font-mono">{renderBlocks(workersPercent)}</div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-[#858585] uppercase">
                <span>Cryptographic SHA-256 Hashing</span>
                <span className="font-mono text-white font-bold">{inodesPercent}%</span>
              </div>
              <div className="w-full h-2 bg-[#222222] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#2e7d52] via-[#57b887] to-[#7be0aa] transition-all duration-300"
                  style={{ width: `${inodesPercent}%` }}
                />
              </div>
              <div className="text-[#858585] text-xs font-mono">{renderBlocks(inodesPercent)}</div>
            </div>

            <div className="pt-3 border-t border-[#303030] flex justify-between items-center text-sm">
              <span className="text-[#b8b8b8]">Files indexed so far:</span>
              <span className="text-2xl font-bold font-mono text-white">
                {discoveredFiles.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {scanStatus === 'COMPLETE' && (
          <div className="space-y-5">
            <div className="text-base font-bold text-[#f5f5f5] flex items-center justify-between">
              <span>Scan complete</span>
              <span className="text-xs border border-[#57b887] px-2.5 py-0.5 bg-[#57b887]/20 text-[#57b887] font-bold">
                COMPLETED
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#303030]">
              <div className="border border-[#303030] p-4 bg-[#1b1b1b] rounded-[2px]">
                <span className="text-xs text-[#858585] block uppercase font-medium">
                  Files scanned
                </span>
                <span className="text-3xl font-bold font-mono text-white mt-1 block">
                  {discoveredFiles.toLocaleString()}
                </span>
              </div>
              <div className="border border-[#303030] p-4 bg-[#1b1b1b] rounded-[2px]">
                <span className="text-xs text-[#858585] block uppercase font-medium">
                  Space analyzed
                </span>
                <span className="text-3xl font-bold font-mono text-white mt-1 block">
                  {discoveredFormattedSize}
                </span>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onNavigate('storage')}
                className="px-5 py-2.5 border border-white bg-white text-black font-semibold text-sm uppercase tracking-wider transition-all hover:bg-neutral-200 cursor-pointer rounded-[2px]"
              >
                Browse storage
              </button>
              <button
                type="button"
                onClick={() => onNavigate('duplicates')}
                className="px-5 py-2.5 border border-[#454545] bg-[#1b1b1b] text-sm text-[#f5f5f5] hover:border-white uppercase transition-all cursor-pointer rounded-[2px]"
              >
                Review duplicate files
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
