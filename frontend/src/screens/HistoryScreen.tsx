import React, { useMemo, useState } from 'react';
import { NavTab, RecoveryLogItem, HistoricalScanEntry, SnapshotDeltaItem } from '../types';

interface HistoryScreenProps {
  onNavigate: (tab: NavTab) => void;
  onOpenScan: (scanId: string) => void;
  recoveryLog: RecoveryLogItem[];
  onRestoreItem: (id: string) => void;
  onShowNotice?: (msg: string) => void;
  historicalScans?: HistoricalScanEntry[];
  snapshotDeltas?: SnapshotDeltaItem[];
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  onNavigate,
  onOpenScan,
  recoveryLog,
  onRestoreItem,
  onShowNotice,
  historicalScans: propScans,
  snapshotDeltas: propDeltas,
}) => {
  const scans = propScans ?? [];
  const deltas = propDeltas ?? [];

  const baselineScan = scans.length > 1 ? scans[1] : undefined;
  const currentScan = scans[0];
  const [scanSearch, setScanSearch] = useState('');
  const visibleScans = useMemo(() => {
    const query = scanSearch.trim().toLowerCase();
    return scans.filter((scan) => (
      !query || `${scan.date} ${scan.rootTarget} ${scan.status}`.toLowerCase().includes(query)
    ));
  }, [scans, scanSearch]);

  const handleExportHistorical = () => {
    const data = {
      reportType: 'ClutterScan local history export',
      exportTimestamp: new Date().toISOString(),
      historicalScans: scans,
      snapshotDeltas: deltas,
      recoveryEntries: recoveryLog,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clutterscan_historical_manifest.json';
    a.click();
    URL.revokeObjectURL(url);
    if (onShowNotice) {
      onShowNotice('HISTORICAL MANIFEST EXPORTED');
    }
  };

  return (
    <div className="w-full bg-[#080808] text-[#f5f5f5] font-sans flex flex-col gap-6">
      {/* HEADER SECTION */}
      <div className="w-full border-b border-[#303030] pb-5 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Scan &amp; Recovery History
            </h1>
            <span className="text-xs bg-white text-black font-semibold px-2 py-0.5 rounded-[2px] uppercase">
              Local Audit Log
            </span>
          </div>
          <p className="text-base text-[#b8b8b8] max-w-2xl">
            Compare disk storage changes across scan snapshots, inspect directory growth deltas, and restore previously cleaned files from the vault.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#141414] border border-[#303030] px-4 py-2.5 rounded-[2px] text-sm">
          <span className="text-[#858585]">Comparison State:</span>
          <span className="text-white font-semibold">
            {scans.length > 1 ? 'Two Snapshots Compared' : 'Awaiting Second Scan'}
          </span>
        </div>
      </div>

      {/* METRICS & DELTA TELEMETRY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Box 1: Baseline */}
        <div className="border border-[#303030] bg-[#141414] p-5 rounded-[2px] flex flex-col justify-between h-40">
          <div className="flex items-center justify-between border-b border-[#303030] pb-2 text-xs">
            <span className="text-[#858585] uppercase font-semibold">Baseline Snapshot</span>
            <span className="text-[#b8b8b8] font-mono">{baselineScan ? baselineScan.date : 'None'}</span>
          </div>
          <div className="flex flex-col gap-1 my-auto">
            <div className="text-xs text-[#858585] uppercase tracking-wider font-semibold">
              Recorded Storage:
            </div>
            <div className="text-2xl md:text-3xl font-bold text-white tracking-tight font-mono">
              {baselineScan ? baselineScan.total : 'No prior scan'}
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-[#303030] pt-2 text-xs">
            <span className="text-[#858585]">Total Files Scanned:</span>
            <span className="text-white font-mono font-semibold">{baselineScan ? baselineScan.inodes : '—'}</span>
          </div>
        </div>

        {/* Box 2: Latest */}
        <div className="border border-[#303030] bg-[#141414] p-5 rounded-[2px] flex flex-col justify-between h-40">
          <div className="flex items-center justify-between border-b border-[#303030] pb-2 text-xs">
            <span className="text-[#858585] uppercase font-semibold">Latest Snapshot</span>
            <span className="text-white font-mono font-medium">{currentScan ? currentScan.date : 'None'}</span>
          </div>
          <div className="flex flex-col gap-1 my-auto">
            <div className="text-xs text-[#858585] uppercase tracking-wider font-semibold">
              Current Storage:
            </div>
            <div className="text-2xl md:text-3xl font-bold text-white tracking-tight font-mono">
              {currentScan ? currentScan.total : 'No scans yet'}
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-[#303030] pt-2 text-xs">
            <span className="text-[#858585]">Total Files Scanned:</span>
            <span className="text-white font-mono font-semibold">{currentScan ? currentScan.inodes : '—'}</span>
          </div>
        </div>

        {/* Box 3: Largest Directory Delta */}
        <div className="border border-[#454545] bg-[#1b1b1b] p-5 rounded-[2px] flex flex-col justify-between h-40">
          <div className="flex items-center justify-between border-b border-[#303030] pb-2 text-xs">
            <span className="text-white uppercase font-semibold">Largest Directory Change</span>
            <span className="text-xs bg-[#242424] text-white border border-[#454545] px-2 py-0.5 rounded-[2px] font-mono">
              {deltas.length > 0 ? `${deltas.length} tracked` : '0 changes'}
            </span>
          </div>
          <div className="flex flex-col gap-1 my-auto">
            <div className="text-xs text-[#858585] uppercase tracking-wider font-semibold">
              Net Change:
            </div>
            <div className="text-2xl md:text-3xl font-bold text-white tracking-tight font-mono">
              {deltas.length > 0
                ? deltas[0].delta
                : scans.length > 1
                  ? 'No directory changes'
                  : 'Awaiting second scan'}
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-[#303030] pt-2 text-xs">
            <span className="text-[#858585] truncate max-w-[180px]">
              {deltas.length > 0 ? deltas[0].directory : 'Directory Comparison'}
            </span>
            <span className="text-white font-semibold">
              {deltas.length > 0
                ? (deltas[0].isPositive ? '↑ Expansion' : '↓ Contraction')
                : 'Identical'}
            </span>
          </div>
        </div>
      </div>

      {/* DIRECTORY CHANGES AND SCAN HISTORY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* DIRECTORY DELTAS */}
        <div className="lg:col-span-5 border border-[#303030] bg-[#141414] p-5 rounded-[2px] flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-[#303030] pb-3">
            <span className="font-bold text-white text-base">
              Directory Growth Analysis
            </span>
            <span className="text-[#858585] text-xs font-mono">Two-scan Delta</span>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#303030] text-[#858585] text-xs uppercase font-semibold">
                  <th className="py-2.5 pr-2">Directory</th>
                  <th className="py-2.5 px-2 text-right">Delta</th>
                  <th className="py-2.5 pl-2 text-right">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#303030]">
                {deltas.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-[#858585] text-sm">
                      Requires 2 or more saved scans to calculate directory growth deltas.
                    </td>
                  </tr>
                ) : (
                  deltas.map((item, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-[#1b1b1b] transition-colors"
                    >
                      <td className="py-3 pr-2 font-mono font-medium text-white">{item.directory}</td>
                      <td className="py-3 px-2 text-right font-mono font-bold text-white">
                        {item.delta}
                      </td>
                      <td
                        className={`py-3 pl-2 text-right font-semibold text-xs ${
                          item.isPositive ? 'text-[#e5ad55]' : 'text-[#57B887]'
                        }`}
                      >
                        {item.direction}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-[#303030] pt-2 text-xs text-[#858585] flex justify-between mt-auto">
            <span>Deltas compare the two latest scans.</span>
            <span>Stored in local database.</span>
          </div>
        </div>

        {/* SCAN HISTORY LOG */}
        <div className="lg:col-span-7 border border-[#303030] bg-[#141414] p-5 rounded-[2px] flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-[#303030] pb-3">
            <span className="font-bold text-white text-base">
              Historical Scan Index
            </span>
            <span className="text-[#858585] text-xs font-mono">{scans.length} Recorded Sessions</span>
          </div>

          <label className="sr-only" htmlFor="history-search">Search scan history</label>
          <input
            id="history-search"
            type="search"
            value={scanSearch}
            onChange={(event) => setScanSearch(event.target.value)}
            placeholder="Search by target folder or date..."
            className="w-full sm:max-w-sm bg-[#080808] border border-[#303030] px-3.5 py-2 text-sm text-white placeholder:text-[#858585] rounded-[2px] focus:border-white focus:outline-none font-mono"
          />

          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#303030] text-[#858585] text-xs uppercase font-semibold">
                  <th className="py-2.5 pr-2">Date</th>
                  <th className="py-2.5 px-2">Folder Target</th>
                  <th className="py-2.5 px-2 text-right">Files</th>
                  <th className="py-2.5 px-2 text-right">Storage</th>
                  <th className="py-2.5 pl-2 text-right">Status</th>
                  <th className="py-2.5 pl-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#303030]">
                {scans.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#858585] text-sm">
                      No historical scans recorded yet. Run a scan from the Home screen.
                    </td>
                  </tr>
                ) : (
                  visibleScans.map((scan, idx) => (
                    <tr key={scan.id ?? `${scan.date}-${scan.rootTarget}-${idx}`} className="hover:bg-[#1b1b1b] transition-colors">
                      <td className="py-3 pr-2 text-white font-mono text-xs">{scan.date}</td>
                      <td className="py-3 px-2 text-[#b8b8b8] font-mono text-xs truncate max-w-[160px]" title={scan.rootTarget}>
                        {scan.rootTarget}
                      </td>
                      <td className="py-3 px-2 text-right font-mono text-white text-xs">{scan.inodes}</td>
                      <td className="py-3 px-2 text-right text-white font-bold font-mono text-sm">
                        {scan.total}
                      </td>
                      <td className="py-3 pl-2 text-right whitespace-nowrap">
                        <span className="text-xs px-2 py-0.5 rounded-[2px] bg-[#242424] text-white border border-[#454545] font-semibold">
                          {scan.status}
                        </span>
                      </td>
                      <td className="py-3 pl-2 text-right">
                        {scan.scanId && (
                          <button
                            type="button"
                            onClick={() => onOpenScan(scan.scanId!)}
                            className="px-3 py-1.5 border border-white text-white hover:bg-white hover:text-black rounded-[2px] text-xs font-semibold cursor-pointer transition-colors"
                          >
                            Open
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {scans.length > 0 && visibleScans.length === 0 && (
              <div className="py-6 text-center text-[#858585] text-sm" role="status">
                No saved scans match this search.
              </div>
            )}
          </div>

          <div className="mt-auto border-t border-[#303030] pt-2 flex items-center justify-between text-xs text-[#858585]">
            <span>Catalog stored in local SQLite database.</span>
            <button
              type="button"
              onClick={handleExportHistorical}
              className="text-white hover:underline cursor-pointer font-medium"
            >
              Export Historical Manifest (JSON)
            </button>
          </div>
        </div>
      </div>

      {/* RECOVERY HISTORY */}
      <div className="w-full border border-[#303030] bg-[#141414] p-5 rounded-[2px] flex flex-col gap-4">
        {/* HEADER */}
        <div className="border-b border-[#303030] pb-3 flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <div className="text-base font-bold text-white tracking-tight">
              Cleanup Recovery Journal
            </div>
            <div className="text-xs text-[#858585] mt-0.5">
              Restore vault items directly. Items sent to Windows Recycle Bin must be restored through the desktop Recycle Bin.
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#858585]">Recorded Actions:</span>
            <span className="border border-[#454545] bg-[#1b1b1b] px-2 py-0.5 text-white font-mono font-semibold rounded-[2px]">
              {recoveryLog.length}
            </span>
          </div>
        </div>

        {/* RECOVERY ENTRIES */}
        {recoveryLog.length === 0 ? (
          <div className="border border-[#303030] bg-[#080808] p-8 text-center text-[#858585] text-sm rounded-[2px]">
            No cleanup operations recorded yet. Cleaned files will appear here with restoration options.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {recoveryLog.map((item) => (
              <div
                key={item.id}
                className={`border rounded-[2px] p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${
                  item.isRestored
                    ? 'border-[#303030] bg-[#080808]/50'
                    : 'border-[#303030] bg-[#080808] hover:border-[#454545]'
                }`}
              >
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`font-semibold font-mono text-base ${
                        item.isRestored ? 'text-[#858585]' : 'text-white'
                      }`}
                    >
                      {item.filename}
                    </span>
                    <span className="text-[#454545]">&bull;</span>
                    <span className="text-[#b8b8b8] text-sm font-mono font-bold">
                      {item.sizeFormatted}
                    </span>
                  </div>

                  <div className="text-xs text-[#858585] truncate max-w-xl font-mono">
                    Original Path: <span className="text-[#b8b8b8]">{item.originPath}</span>
                  </div>

                  <div className="text-xs">
                    <span className="text-[#858585]">Status: </span>
                    <span
                      className={`font-semibold ${
                        item.isRestored ? 'text-[#57B887]' : 'text-white'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {item.isRestored ? (
                    <span className="text-xs px-4 py-2 border border-[#303030] text-[#57B887] font-semibold rounded-[2px] bg-[#141414]">
                      ✓ Restored
                    </span>
                  ) : item.status.startsWith('FAILED') ? (
                    <span className="text-xs px-4 py-2 border border-[#303030] text-[#858585] bg-[#141414] rounded-[2px]">
                      Not Moved
                    </span>
                  ) : item.location === 'OS RECYCLE BIN' ? (
                    <span className="text-xs px-3.5 py-2 border border-[#303030] text-[#b8b8b8] rounded-[2px] bg-[#141414]">
                      Restore from Windows Recycle Bin
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onRestoreItem(item.id)}
                      className="text-xs font-semibold px-4 py-2 border border-white text-black bg-white hover:bg-neutral-200 rounded-[2px] cursor-pointer transition-colors"
                    >
                      Restore from Vault
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-[#303030] pt-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-[#858585]">
          <div>Restoration procedures depend on the recorded destination.</div>
          <div className="text-[#b8b8b8]">All operations are audited and persisted locally.</div>
        </div>
      </div>
    </div>
  );
};
