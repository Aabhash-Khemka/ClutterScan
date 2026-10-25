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
    <div className="w-full flex flex-col gap-6 font-mono text-xs text-white">
      {/* SECTION HEADER */}
      <section className="border-b border-[#303030] pb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-2">
        <div className="flex flex-col gap-1">
          <div className="text-sm md:text-base font-bold text-white tracking-widest uppercase flex items-center gap-2">
            <span>Start a scan</span>
            <span className="text-white font-bold">■</span>
          </div>
          <div className="text-[11px] text-[#858585] uppercase tracking-wider">
            Choose a drive or folder to find large files, duplicates, and cleanup suggestions.
          </div>
        </div>
        <div className="text-[11px] text-[#858585] uppercase tracking-widest font-mono">
          YOUR FILES STAY ON THIS DEVICE
        </div>
      </section>

      {/* SAFETY PROTOCOL BANNER */}
      <div className="border border-[#303030] p-3 bg-[#0b0b0b] flex flex-col md:flex-row md:items-center justify-between text-xs gap-3">
        <div className="flex items-center gap-2">
          <span className="text-white font-bold tracking-wider">YOUR FILES ARE SAFE:</span>
          <span className="text-[#b0b0b0] tracking-wider">
            Scanning only finds files. Nothing is removed unless you review and confirm it.
          </span>
        </div>
        <div className="text-[11px] text-[#858585] font-mono tracking-wider">
          Confirmed cleanup goes to Trash or the recovery vault.
        </div>
      </div>

      {/* 1. SELECT SCAN TARGET VOLUME */}
      <div className="space-y-3">
        <div>
          <div className="text-xs text-white uppercase tracking-widest font-bold">
            1. Choose a drive or folder
          </div>
          <p className="text-[11px] text-[#858585] mt-1">
            Pick a location to analyze. You can scan a whole drive or just one folder.
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
            className={`w-full text-left border p-6 cursor-pointer select-none transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
              selectedVolume === 'PRIMARY'
                ? 'bg-white text-black border-white'
                : 'bg-[#0b0b0b] text-white border-[#303030] hover:border-[#484848]'
            }`}
          >
            <div
              className={`text-xs tracking-widest uppercase mb-3 ${
                selectedVolume === 'PRIMARY' ? 'text-black font-bold' : 'text-[#858585]'
              }`}
            >
              System drive
            </div>
            <div className="text-lg md:text-xl font-bold tracking-tight mb-1">
              {volumes[0]?.name || 'SYSTEM DRIVE'}
            </div>
            <div className="text-3xl font-bold mb-4">{volumes[0]?.path || 'C:\\'}</div>
            <div
              className={`text-[11px] tracking-wider ${
                selectedVolume === 'PRIMARY' ? 'text-black font-bold' : 'text-[#858585]'
              }`}
            >
              {volumes[0]
                ? `${volumes[0].formattedFree} free · ${volumes[0].percentUsed}% used`
                : 'Default scan location'}
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
            className={`w-full text-left border p-6 select-none transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
              selectedVolume === 'EXTERNAL'
                ? 'bg-white text-black border-white'
                : 'bg-[#0b0b0b] text-white border-[#303030] hover:border-[#484848]'
            } ${
              volumes.length < 2 ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
            }`}
          >
            <div
              className={`text-xs tracking-widest uppercase mb-3 ${
                selectedVolume === 'EXTERNAL' ? 'text-black font-bold' : 'text-[#858585]'
              }`}
            >
              Other drive
            </div>
            <div className="text-lg md:text-xl font-bold tracking-tight mb-1">
              {volumes.length > 1 ? volumes[1].name : 'No other drive found'}
            </div>
            <div className="text-2xl font-bold mb-4">
              {volumes.length > 1 ? volumes[1].path : 'Connect another drive'}
            </div>
            <div
              className={`text-[11px] tracking-wider ${
                selectedVolume === 'EXTERNAL' ? 'text-black font-bold' : 'text-[#858585]'
              }`}
            >
              {volumes.length > 1
                ? `${volumes[1].formattedFree} free · ${volumes[1].percentUsed}% used`
                : 'This option is unavailable until a drive is connected.'}
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
            className={`w-full text-left border p-6 cursor-pointer select-none transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
              selectedVolume === 'CUSTOM'
                ? 'bg-white text-black border-white'
                : 'bg-[#0b0b0b] text-white border-[#303030] hover:border-[#484848]'
            }`}
          >
            <div
              className={`text-xs tracking-widest uppercase mb-3 ${
                selectedVolume === 'CUSTOM' ? 'text-black font-bold' : 'text-[#858585]'
              }`}
            >
              Suggested folder
            </div>
            <div className="text-lg md:text-xl font-bold tracking-tight mb-1">
              Choose a folder
            </div>
            <div className="text-2xl font-bold mb-4 truncate">
              {folders.length > 0 ? folders[0].name : 'Enter a path below'}
            </div>
            <div
              className={`text-[11px] tracking-wider ${
                selectedVolume === 'CUSTOM' ? 'text-black font-bold' : 'text-[#858585]'
              }`}
            >
              {folders.length > 0
                ? `${folders.length} suggested folders · click to select`
                : 'Type or paste a folder path below.'}
            </div>
          </button>
        </div>
      </div>

      {/* TARGET PATH SPECIFICATION */}
      <div className="border border-[#303030] p-5 bg-[#0b0b0b] space-y-4">
        <div>
          <label htmlFor="scan-target-path" className="text-xs text-white uppercase tracking-widest font-bold">
            2. Confirm the folder to scan
          </label>
          <p className="text-[11px] text-[#858585] mt-1">
            You can edit this path or paste another folder location.
          </p>
        </div>
        <div className="flex flex-col md:flex-row gap-3">
          <input
            id="scan-target-path"
            type="text"
            value={targetPath}
            onChange={(e) => {
              setTargetPath(e.target.value);
              setSelectedVolume('CUSTOM');
            }}
            aria-label="Folder or drive path to scan"
            className="bg-black border border-[#303030] px-4 py-2.5 text-xs md:text-sm text-white flex-1 focus:border-white focus:outline-none"
            placeholder="For example: C:\\Users\\You\\Documents"
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
            className="px-4 py-2.5 border border-[#303030] text-[#b0b0b0] hover:text-white hover:border-[#484848] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Use next suggested folder
          </button>
          <button
            type="button"
            onClick={handleExecuteScan}
            disabled={scanStatus === 'SCANNING'}
            className="px-6 py-2.5 border border-white bg-white text-black font-bold uppercase tracking-wider transition-none hover:bg-neutral-200 cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {scanStatus === 'SCANNING'
              ? 'Scanning…'
              : 'Start scan'}
          </button>
        </div>
        {statusMessage && (
          <div className="text-[11px] text-[#b0b0b0] tracking-wider font-mono">
            &gt; {statusMessage}
          </div>
        )}
      </div>

      {/* ANALYSIS ALGORITHMS PIPELINE */}
      <div className="border border-[#303030] p-5 bg-[#0b0b0b]">
        <div className="mb-4">
          <h2 className="text-xs text-white uppercase tracking-widest font-bold">
            3. Choose what to look for
          </h2>
          <p className="text-[11px] text-[#858585] mt-1">
            All options are on by default. Select an option to turn it off.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6">
          <button
            type="button"
            aria-pressed={pipelineOptions.exactDupes}
            onClick={() => toggleOption('exactDupes')}
            className="w-full flex items-start gap-3 text-left cursor-pointer select-none group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <span className="font-bold text-white group-hover:text-neutral-300">
              {pipelineOptions.exactDupes ? '[✓]' : '[ ]'}
            </span>
            <div>
              <div className="text-xs text-white uppercase font-bold tracking-wider">
                Exact copies
              </div>
              <div className="text-[10px] text-[#858585]">
                Find files with identical contents.
              </div>
            </div>
          </button>

          <button
            type="button"
            aria-pressed={pipelineOptions.similarImages}
            onClick={() => toggleOption('similarImages')}
            className="w-full flex items-start gap-3 text-left cursor-pointer select-none group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <span className="font-bold text-white group-hover:text-neutral-300">
              {pipelineOptions.similarImages ? '[✓]' : '[ ]'}
            </span>
            <div>
              <div className="text-xs text-white uppercase font-bold tracking-wider">
                Similar images
              </div>
              <div className="text-[10px] text-[#858585]">
                Find photos that look alike, even if edited.
              </div>
            </div>
          </button>

          <button
            type="button"
            aria-pressed={pipelineOptions.oldFiles}
            onClick={() => toggleOption('oldFiles')}
            className="w-full flex items-start gap-3 text-left cursor-pointer select-none group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <span className="font-bold text-white group-hover:text-neutral-300">
              {pipelineOptions.oldFiles ? '[✓]' : '[ ]'}
            </span>
            <div>
              <div className="text-xs text-white uppercase font-bold tracking-wider">
                Older files
              </div>
              <div className="text-[10px] text-[#858585]">
                Modified more than 180 days ago.
              </div>
            </div>
          </button>

          <button
            type="button"
            aria-pressed={pipelineOptions.tempFiles}
            onClick={() => toggleOption('tempFiles')}
            className="w-full flex items-start gap-3 text-left cursor-pointer select-none group focus-visible:outline-extra focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <span className="font-bold text-white group-hover:text-neutral-300">
              {pipelineOptions.tempFiles ? '[✓]' : '[ ]'}
            </span>
            <div>
              <div className="text-xs text-white uppercase font-bold tracking-wider">
                Temporary files
              </div>
              <div className="text-[10px] text-[#858585]">
                Find common temporary and cache files.
              </div>
            </div>
          </button>

          <button
            type="button"
            aria-pressed={pipelineOptions.storageAnalytics}
            onClick={() => toggleOption('storageAnalytics')}
            className="w-full flex items-start gap-3 text-left cursor-pointer select-none group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <span className="font-bold text-white group-hover:text-neutral-300">
              {pipelineOptions.storageAnalytics ? '[✓]' : '[ ]'}
            </span>
            <div>
              <div className="text-xs text-white uppercase font-bold tracking-wider">
                Storage overview
              </div>
              <div className="text-[10px] text-[#858585]">
                See how much space folders use.
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* DIAGNOSTIC STATE TELEMETRY */}
      <div className="border border-[#303030] p-6 bg-[#0b0b0b] space-y-4">
        <div className="text-xs text-white uppercase tracking-widest font-bold">
          Scan progress
        </div>

        {scanStatus === 'READY' && (
          <div className="space-y-2 text-xs md:text-sm">
            <div className="text-white font-bold tracking-wider">Ready when you are</div>
            <div className="text-[#858585]">
              Select a location above and start a scan to see results.
            </div>
          </div>
        )}

        {scanStatus === 'SCANNING' && (
          <div className="space-y-4">
            <div className="text-white font-bold tracking-widest text-sm flex items-center justify-between">
              <span>Scanning your files…</span>
              <span className="border border-white px-2 py-0.5 bg-white text-black font-bold text-[10px]">
                IN PROGRESS
              </span>
            </div>

            <div>
              <div className="text-[11px] text-[#858585] uppercase mb-1">Scan progress</div>
              <div className="text-white tracking-widest text-xs md:text-sm break-all font-mono">
                {renderBlocks(workersPercent)} [{workersPercent}%]
              </div>
            </div>

            <div>
              <div className="text-[11px] text-[#858585] uppercase mb-1">
                Files checked
              </div>
              <div className="text-white tracking-widest text-xs md:text-sm break-all font-mono">
                {renderBlocks(inodesPercent)} [{inodesPercent}%]
              </div>
            </div>

            <div className="pt-2 border-t border-[#303030] text-xs flex justify-between">
              <span className="text-[#858585]">Files found:</span>
              <span className="text-white font-bold">
                {discoveredFiles.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {scanStatus === 'COMPLETE' && (
          <div className="space-y-4">
            <div className="text-white font-bold text-sm tracking-wider flex items-center justify-between">
              <span>Scan complete</span>
              <span className="text-xs border border-white px-2 py-0.5 bg-white text-black font-bold">
                DONE
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#303030] text-xs">
              <div>
                <span className="text-[#858585] text-[10px] block uppercase">
                  FILES FOUND
                </span>
                <span className="text-white text-xl font-bold font-mono">
                  {discoveredFiles.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[#858585] text-[10px] block uppercase">
                  SPACE ANALYZED
                </span>
                <span className="text-white text-xl font-bold font-mono">
                  {discoveredFormattedSize}
                </span>
              </div>
            </div>

            <div className="pt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onNavigate('storage')}
                className="px-4 py-2 border border-white bg-white text-black font-bold uppercase transition-none hover:bg-neutral-200 cursor-pointer"
              >
                View storage
              </button>
              <button
                type="button"
                onClick={() => onNavigate('duplicates')}
                className="px-4 py-2 border border-[#484848] bg-[#0b0b0b] text-[#b0b0b0] hover:text-white hover:border-white uppercase transition-none cursor-pointer"
              >
                Review exact copies
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
