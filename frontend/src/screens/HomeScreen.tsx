import React, { useState, useEffect } from 'react';
import { NavTab } from '../types';
import { api, SystemVolumeData, SystemFolderData } from '../services/api';

interface HomeScreenProps {
  onNavigate: (tab: NavTab) => void;
  onScanCompleted: (scanId?: string, totalFiles?: number) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigate,
  onScanCompleted,
}) => {
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
    <div className="w-full flex flex-col gap-8 font-sans">
      {/* HERO BANNER SECTION */}
      <section className="bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-8 md:p-10 shadow-sm relative overflow-hidden">
        <div className="max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EEF2FF] border border-[#E0E7FF] text-xs font-semibold text-[#5B5CE2] mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5B5CE2]"></span>
            Intelligent File &amp; Storage Management
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#172033] tracking-tight leading-tight">
            Your files, organised.
          </h1>
          <p className="text-base text-[#64748B] mt-2.5 leading-relaxed">
            Find duplicate files, review unnecessary clutter, and manage your storage with total confidence. Scanning is 100% offline and read-only.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleExecuteScan}
              disabled={scanStatus === 'SCANNING'}
              className="px-7 py-3 rounded-xl bg-[#5B5CE2] hover:bg-[#4849C7] text-white font-semibold text-sm transition-all shadow-sm shadow-[#5B5CE2]/25 cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              <span>{scanStatus === 'SCANNING' ? 'Analyzing Files...' : 'Scan Files Now'}</span>
              <span className="text-white/80">&rarr;</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('duplicates')}
              className="px-5 py-3 rounded-xl bg-white hover:bg-[#F8FAFC] text-[#172033] font-medium text-sm border border-[#E2E8F0] transition-colors cursor-pointer"
            >
              Review Duplicates
            </button>
          </div>
        </div>

        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-[#EEF2FF]/50 to-transparent pointer-events-none hidden md:block" />
      </section>

      {/* 1. SCAN LOCATION SELECTION */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#172033] tracking-tight">
              1. Choose Scan Location
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Select your system drive, an external disk, or choose a specific directory to inspect.
            </p>
          </div>
          <div className="text-xs text-[#64748B] font-medium hidden sm:block">
            {volumes.length} Drives Detected
          </div>
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
            className={`w-full text-left p-5 rounded-xl border transition-all cursor-pointer ${
              selectedVolume === 'PRIMARY'
                ? 'bg-white border-[#5B5CE2] ring-2 ring-[#5B5CE2]/20 shadow-sm'
                : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                System Drive
              </span>
              <span className={`w-3 h-3 rounded-full border flex items-center justify-center ${
                selectedVolume === 'PRIMARY' ? 'border-[#5B5CE2] bg-[#5B5CE2]' : 'border-[#CBD5E1]'
              }`}>
                {selectedVolume === 'PRIMARY' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              </span>
            </div>
            <div className="text-xl font-bold text-[#172033] tracking-tight">
              {volumes[0]?.name || 'Local Drive'}
            </div>
            <div className="text-sm font-mono text-[#64748B] mt-0.5 mb-3">
              {volumes[0]?.path || 'C:\\'}
            </div>
            <div className="text-xs text-[#64748B] pt-3 border-t border-[#E2E8F0]">
              {volumes[0]
                ? `${volumes[0].formattedFree} free of ${volumes[0].percentUsed}% used`
                : 'Primary storage volume'}
            </div>
          </button>

          {/* SECONDARY VOLUME */}
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
            className={`w-full text-left p-5 rounded-xl border transition-all ${
              selectedVolume === 'EXTERNAL'
                ? 'bg-white border-[#5B5CE2] ring-2 ring-[#5B5CE2]/20 shadow-sm'
                : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]'
            } ${volumes.length < 2 ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                Secondary Drive
              </span>
              <span className={`w-3 h-3 rounded-full border flex items-center justify-center ${
                selectedVolume === 'EXTERNAL' ? 'border-[#5B5CE2] bg-[#5B5CE2]' : 'border-[#CBD5E1]'
              }`}>
                {selectedVolume === 'EXTERNAL' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              </span>
            </div>
            <div className="text-xl font-bold text-[#172033] tracking-tight">
              {volumes.length > 1 ? volumes[1].name : 'No Secondary Drive'}
            </div>
            <div className="text-sm font-mono text-[#64748B] mt-0.5 mb-3 truncate">
              {volumes.length > 1 ? volumes[1].path : '—'}
            </div>
            <div className="text-xs text-[#64748B] pt-3 border-t border-[#E2E8F0]">
              {volumes.length > 1
                ? `${volumes[1].formattedFree} free`
                : 'External drives will appear here'}
            </div>
          </button>

          {/* USER SPECIFIC DIRECTORY */}
          <button
            type="button"
            aria-pressed={selectedVolume === 'CUSTOM'}
            onClick={() => {
              setSelectedVolume('CUSTOM');
              if (folders.length > 0) {
                setTargetPath(folders[0].path);
              }
            }}
            className={`w-full text-left p-5 rounded-xl border transition-all cursor-pointer ${
              selectedVolume === 'CUSTOM'
                ? 'bg-white border-[#5B5CE2] ring-2 ring-[#5B5CE2]/20 shadow-sm'
                : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                Specific Folder
              </span>
              <span className={`w-3 h-3 rounded-full border flex items-center justify-center ${
                selectedVolume === 'CUSTOM' ? 'border-[#5B5CE2] bg-[#5B5CE2]' : 'border-[#CBD5E1]'
              }`}>
                {selectedVolume === 'CUSTOM' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              </span>
            </div>
            <div className="text-xl font-bold text-[#172033] tracking-tight">
              User Folder
            </div>
            <div className="text-sm font-mono text-[#64748B] mt-0.5 mb-3 truncate">
              {folders.length > 0 ? folders[0].name : 'Custom Directory'}
            </div>
            <div className="text-xs text-[#64748B] pt-3 border-t border-[#E2E8F0]">
              {folders.length > 0 ? `${folders.length} accessible folders ready` : 'Custom target folder'}
            </div>
          </button>
        </div>
      </section>

      {/* 2. DIRECTORY PATH INPUT */}
      <section className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <label htmlFor="scan-target-path" className="text-base font-bold text-[#172033] block">
            2. Selected Folder Path
          </label>
          <p className="text-xs text-[#64748B] mt-0.5">
            Type or paste any local path. Subdirectories and folders will be analyzed recursively.
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
            placeholder="e.g. C:\Users\Username\Downloads"
            className="flex-1 bg-[#F8FAFC] border border-[#E2E8F0] px-4 py-3 text-sm text-[#172033] rounded-xl focus:outline-none focus:border-[#5B5CE2] focus:bg-white focus:ring-2 focus:ring-[#5B5CE2]/10 transition-all font-mono"
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
            className="px-4 py-3 bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:text-[#172033] rounded-xl transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
          >
            Switch Preset Folder
          </button>
          <button
            type="button"
            onClick={handleExecuteScan}
            disabled={scanStatus === 'SCANNING'}
            className="px-6 py-3 bg-[#5B5CE2] hover:bg-[#4849C7] text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer whitespace-nowrap shadow-sm shadow-[#5B5CE2]/20 disabled:opacity-50"
          >
            {scanStatus === 'SCANNING' ? 'Analyzing...' : 'Scan This Folder'}
          </button>
        </div>

        {statusMessage && (
          <div className="text-xs font-medium text-[#64748B] pt-1">
            Status: {statusMessage}
          </div>
        )}
      </section>

      {/* 3. DETECTION RULES */}
      <section className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-[#172033]">
            3. Detection Options
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Choose which analysis checks to run during this scan session.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <button
            type="button"
            aria-pressed={pipelineOptions.exactDupes}
            onClick={() => toggleOption('exactDupes')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
              pipelineOptions.exactDupes
                ? 'bg-[#EEF2FF]/60 border-[#5B5CE2]/40 text-[#172033]'
                : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]'
            }`}
          >
            <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border ${
              pipelineOptions.exactDupes ? 'bg-[#5B5CE2] border-[#5B5CE2] text-white' : 'border-[#CBD5E1] bg-white'
            }`}>
              {pipelineOptions.exactDupes && <span className="text-[10px] font-bold">✓</span>}
            </div>
            <div>
              <div className="text-sm font-semibold text-[#172033]">Exact Duplicates</div>
              <div className="text-xs text-[#64748B] mt-0.5">Byte-for-byte SHA-256 hash match.</div>
            </div>
          </button>

          <button
            type="button"
            aria-pressed={pipelineOptions.similarImages}
            onClick={() => toggleOption('similarImages')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
              pipelineOptions.similarImages
                ? 'bg-[#EEF2FF]/60 border-[#5B5CE2]/40 text-[#172033]'
                : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]'
            }`}
          >
            <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border ${
              pipelineOptions.similarImages ? 'bg-[#5B5CE2] border-[#5B5CE2] text-white' : 'border-[#CBD5E1] bg-white'
            }`}>
              {pipelineOptions.similarImages && <span className="text-[10px] font-bold">✓</span>}
            </div>
            <div>
              <div className="text-sm font-semibold text-[#172033]">Similar Photos</div>
              <div className="text-xs text-[#64748B] mt-0.5">Perceptual pHash clustering for images.</div>
            </div>
          </button>

          <button
            type="button"
            aria-pressed={pipelineOptions.oldFiles}
            onClick={() => toggleOption('oldFiles')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
              pipelineOptions.oldFiles
                ? 'bg-[#EEF2FF]/60 border-[#5B5CE2]/40 text-[#172033]'
                : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]'
            }`}
          >
            <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border ${
              pipelineOptions.oldFiles ? 'bg-[#5B5CE2] border-[#5B5CE2] text-white' : 'border-[#CBD5E1] bg-white'
            }`}>
              {pipelineOptions.oldFiles && <span className="text-[10px] font-bold">✓</span>}
            </div>
            <div>
              <div className="text-sm font-semibold text-[#172033]">Older Inactive Files</div>
              <div className="text-xs text-[#64748B] mt-0.5">Files unmodified for &gt; 180 days.</div>
            </div>
          </button>

          <button
            type="button"
            aria-pressed={pipelineOptions.tempFiles}
            onClick={() => toggleOption('tempFiles')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
              pipelineOptions.tempFiles
                ? 'bg-[#EEF2FF]/60 border-[#5B5CE2]/40 text-[#172033]'
                : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]'
            }`}
          >
            <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border ${
              pipelineOptions.tempFiles ? 'bg-[#5B5CE2] border-[#5B5CE2] text-white' : 'border-[#CBD5E1] bg-white'
            }`}>
              {pipelineOptions.tempFiles && <span className="text-[10px] font-bold">✓</span>}
            </div>
            <div>
              <div className="text-sm font-semibold text-[#172033]">Temporary Artifacts</div>
              <div className="text-xs text-[#64748B] mt-0.5">Caches, crash dumps, and build files.</div>
            </div>
          </button>

          <button
            type="button"
            aria-pressed={pipelineOptions.storageAnalytics}
            onClick={() => toggleOption('storageAnalytics')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
              pipelineOptions.storageAnalytics
                ? 'bg-[#EEF2FF]/60 border-[#5B5CE2]/40 text-[#172033]'
                : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]'
            }`}
          >
            <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border ${
              pipelineOptions.storageAnalytics ? 'bg-[#5B5CE2] border-[#5B5CE2] text-white' : 'border-[#CBD5E1] bg-white'
            }`}>
              {pipelineOptions.storageAnalytics && <span className="text-[10px] font-bold">✓</span>}
            </div>
            <div>
              <div className="text-sm font-semibold text-[#172033]">Directory Sizing Tree</div>
              <div className="text-xs text-[#64748B] mt-0.5">Compute storage space by folder.</div>
            </div>
          </button>
        </div>
      </section>

      {/* 4. SCAN STATUS & RESULTS SUMMARY */}
      <section className="bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
          <div>
            <h2 className="text-base font-bold text-[#172033]">
              Scan Status &amp; Metrics
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Current activity and detected file volume.
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            scanStatus === 'SCANNING'
              ? 'bg-[#EEF2FF] text-[#5B5CE2] animate-pulse'
              : scanStatus === 'COMPLETE'
                ? 'bg-[#F0FDF4] text-[#15803D]'
                : 'bg-[#F1F5F9] text-[#64748B]'
          }`}>
            {scanStatus === 'SCANNING' ? 'Scan In Progress' : scanStatus === 'COMPLETE' ? 'Completed' : 'Idle'}
          </span>
        </div>

        {scanStatus === 'SCANNING' && (
          <div className="space-y-4">
            <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#5B5CE2] h-full transition-all duration-300 rounded-full"
                style={{ width: `${Math.max(5, workersPercent)}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-xs text-[#64748B]">
              <span>Traversing directory tree...</span>
              <span className="font-semibold text-[#172033] font-mono">{workersPercent}%</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-5">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider block">
              Files Discovered
            </span>
            <span className="text-3xl font-bold font-mono text-[#172033] mt-1.5 block">
              {discoveredFiles.toLocaleString()}
            </span>
            <span className="text-xs text-[#64748B] mt-1 block">Cataloged file inodes</span>
          </div>

          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-5">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider block">
              Storage Analyzed
            </span>
            <span className="text-3xl font-bold font-mono text-[#172033] mt-1.5 block">
              {discoveredFormattedSize}
            </span>
            <span className="text-xs text-[#64748B] mt-1 block">Aggregated file size</span>
          </div>

          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-5">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider block">
              Safety Routing
            </span>
            <span className="text-lg font-bold text-[#15803D] mt-2 block">
              Recycle Bin / Vault
            </span>
            <span className="text-xs text-[#64748B] mt-1 block">Non-destructive relocation</span>
          </div>
        </div>

        {scanStatus === 'COMPLETE' && (
          <div className="pt-2 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onNavigate('duplicates')}
              className="px-6 py-2.5 rounded-xl bg-[#5B5CE2] hover:bg-[#4849C7] text-white text-sm font-semibold transition-colors cursor-pointer shadow-sm shadow-[#5B5CE2]/20"
            >
              Review Duplicate Files &rarr;
            </button>
            <button
              type="button"
              onClick={() => onNavigate('storage')}
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-sm font-medium text-[#172033] transition-colors cursor-pointer"
            >
              Explore Storage Tree
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
