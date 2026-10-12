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
    <div className="w-full bg-[#0e0e0e] text-white font-mono text-xs flex flex-col gap-6">
      {/* HEADER / SECTOR META */}
      <div className="w-full border-b border-[#1f1f1f] pb-4 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-base md:text-xl font-bold text-white tracking-widest uppercase">
              [SNAPSHOT_DELTAS]
            </span>
            <span className="text-[#8e9192]">::</span>
            <span className="text-[#c4c7c8] tracking-wider uppercase">
              Saved scans
            </span>
          </div>
          <div className="text-xs text-[#8e9192] tracking-wider uppercase">
            Disk usage at scan time, folder-size changes, and recoverable cleanup history
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-[11px]">
          <span className="text-[#8e9192] uppercase">SCAN COMPARISON:</span>
          <span className="text-white font-bold uppercase border border-white px-2 py-0.5">
            {scans.length > 1 ? '[LATEST TWO READY]' : '[NEEDS SECOND SCAN]'}
          </span>
        </div>
      </div>

      {/* SNAPSHOT COMPARISON */}
      <div className="w-full border border-[#1f1f1f] bg-black p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-3 uppercase">
          <div className="flex items-center gap-1.5">
            <span className="text-[#8e9192]">PREVIOUS SNAPSHOT:</span>
            <span className="text-white border border-[#1f1f1f] px-2 py-1 cursor-default">
              [ {baselineScan ? baselineScan.date : 'NO PREVIOUS SNAPSHOT'} ]
            </span>
          </div>
          <span className="text-[#8e9192]">--&gt;</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[#8e9192]">LATEST SNAPSHOT:</span>
            <span className="bg-white text-black font-bold px-2 py-1 cursor-default">
              [ {currentScan ? currentScan.date : 'CURRENT SCAN'} ]
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-[#8e9192]">SNAPSHOT COUNT:</span>
          <span className="text-white font-bold">{scans.length} RECORDED</span>
        </div>
      </div>

      {/* TELEMETRY STAT BOXES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Box 1 */}
        <div className="border border-[#1f1f1f] bg-black p-4 flex flex-col justify-between h-36">
          <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-2 text-[11px]">
            <span className="text-[#8e9192] uppercase">[SECTOR_A :: BASELINE]</span>
            <span className="text-[#8e9192]">{baselineScan ? baselineScan.date : 'N/A'}</span>
          </div>
          <div className="flex flex-col gap-1 my-auto">
            <div className="text-[10px] text-[#8e9192] uppercase tracking-widest">
              USED STORAGE:
            </div>
            <div className="text-2xl md:text-3xl font-bold text-white tracking-tight tabular-nums">
              {baselineScan ? baselineScan.total : 'No prior scan'}
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-[#1f1f1f] pt-2 text-[11px]">
            <span className="text-[#8e9192] uppercase">RECORDED INODES:</span>
            <span className="text-white font-bold">{baselineScan ? baselineScan.inodes : '—'}</span>
          </div>
        </div>

        {/* Box 2 */}
        <div className="border border-[#1f1f1f] bg-black p-4 flex flex-col justify-between h-36">
          <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-2 text-[11px]">
            <span className="text-[#8e9192] uppercase">[LATEST SCAN]</span>
            <span className="text-white font-bold">{currentScan ? currentScan.date : 'N/A'}</span>
          </div>
          <div className="flex flex-col gap-1 my-auto">
            <div className="text-[10px] text-[#8e9192] uppercase tracking-widest">
              USED STORAGE:
            </div>
            <div className="text-2xl md:text-3xl font-bold text-white tracking-tight tabular-nums">
              {currentScan ? currentScan.total : 'No scans yet'}
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-[#1f1f1f] pt-2 text-[11px]">
            <span className="text-[#8e9192] uppercase">CURRENT INODES:</span>
            <span className="text-white font-bold">{currentScan ? currentScan.inodes : '—'}</span>
          </div>
        </div>

        {/* Box 3: Highlighted Delta */}
        <div className="border border-white bg-black p-4 flex flex-col justify-between h-36">
          <div className="flex items-center justify-between border-b border-[#444748] pb-2 text-[11px]">
            <span className="text-white uppercase font-bold">[LARGEST_DIRECTORY_CHANGE]</span>
            <span className="text-white bg-[#1f1f1f] px-1.5 py-0.5 font-bold">
              {deltas.length > 0 ? `${deltas.length} DIRECTORY DELTAS` : 'NO DELTAS'}
            </span>
          </div>
          <div className="flex flex-col gap-1 my-auto">
            <div className="text-[10px] text-[#8e9192] uppercase tracking-widest">
              DIRECTORY CHANGE:
            </div>
            <div className="text-2xl md:text-3xl font-bold text-white tracking-tight tabular-nums">
              {deltas.length > 0
                ? deltas[0].delta
                : scans.length > 1
                  ? 'No directory changes'
                  : 'Awaiting second scan'}
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-[#444748] pt-2 text-[11px]">
            <span className="text-[#8e9192] uppercase">
              {deltas.length > 0 ? deltas[0].directory : 'COMPARISON:'}
            </span>
            <span className="text-white font-bold">
              {deltas.length > 0
                ? (deltas[0].isPositive ? 'EXPANSION' : 'CONTRACTION')
                : scans.length > 1
                  ? 'NO SIZE CHANGE IN LATEST COMPARISON'
                  : 'NOT YET AVAILABLE'}
            </span>
          </div>
        </div>
      </div>

      {/* DIRECTORY CHANGES AND SCAN HISTORY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* DIRECTORY DELTAS */}
        <div className="lg:col-span-5 border border-[#1f1f1f] bg-black p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-2 text-xs">
            <span className="font-bold text-white tracking-wider uppercase">
              [DIRECTORY_GROWTH_ANALYSIS]
            </span>
            <span className="text-[#8e9192] text-[11px]">DIFF // INODES</span>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs uppercase border-collapse">
              <thead>
                <tr className="border-b border-[#1f1f1f] text-[#8e9192] text-[11px]">
                  <th className="py-2 pr-2 font-normal">DIRECTORY</th>
                  <th className="py-2 px-2 font-normal text-right">DELTA</th>
                  <th className="py-2 pl-2 font-normal text-right">DIRECTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f1f1f] font-mono">
                {deltas.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-[#8e9192] uppercase text-[11px]">
                      INSUFFICIENT SNAPSHOTS // REQUIRES 2+ SCANS FOR DELTA ANALYSIS
                    </td>
                  </tr>
                ) : (
                  deltas.map((item, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-white hover:text-black transition-none cursor-default group"
                    >
                      <td className="py-2.5 pr-2 font-bold">{item.directory}</td>
                      <td className="py-2.5 px-2 text-right font-bold text-white group-hover:text-black tabular-nums">
                        {item.delta}
                      </td>
                      <td
                        className={`py-2.5 pl-2 text-right font-bold group-hover:text-black ${
                          item.isPositive ? 'text-white' : 'text-[#8e9192]'
                        }`}
                      >
                        [ {item.direction} ]
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-[#1f1f1f] pt-2 text-[10px] text-[#8e9192] flex justify-between mt-auto">
            <span>Scan snapshots are stored locally.</span>
            <span>Directory deltas compare the two latest completed scans.</span>
          </div>
        </div>

        {/* SCAN HISTORY LOG */}
        <div className="lg:col-span-7 border border-[#1f1f1f] bg-black p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-2 text-xs">
            <span className="font-bold text-white tracking-wider uppercase">
              [HISTORICAL_SCAN_INDEX]
            </span>
            <span className="text-[#8e9192] text-[11px]">RECORDED SESSIONS: {scans.length.toString().padStart(2, '0')}</span>
          </div>

          <label className="sr-only" htmlFor="history-search">Search scan history</label>
          <input
            id="history-search"
            type="search"
            value={scanSearch}
            onChange={(event) => setScanSearch(event.target.value)}
            placeholder="Search by folder or date…"
            className="w-full sm:max-w-sm bg-[#0e0e0e] border border-[#444748] px-3 py-2 text-xs text-white placeholder:text-[#8e9192] focus:border-white focus:outline-none"
          />

          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs uppercase border-collapse">
              <thead>
                <tr className="border-b border-[#1f1f1f] text-[#8e9192] text-[11px]">
                  <th className="py-2 pr-2 font-normal">DATE</th>
                  <th className="py-2 px-2 font-normal">ROOT TARGET</th>
                  <th className="py-2 px-2 font-normal text-right">INODES</th>
                  <th className="py-2 px-2 font-normal text-right">DISK USED</th>
                  <th className="py-2 pl-2 font-normal text-right">STATUS</th>
                  <th className="py-2 pl-2 font-normal text-right">RESULTS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f1f1f]">
                {scans.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-[#8e9192] uppercase text-[11px]">
                      NO HISTORICAL SCAN SESSIONS // EXECUTE A SCAN ON HOME SCREEN
                    </td>
                  </tr>
                ) : (
                  visibleScans.map((scan, idx) => (
                    <tr key={scan.id ?? `${scan.date}-${scan.rootTarget}-${idx}`} className="hover:bg-[#131313] transition-colors">
                      <td className="py-3 pr-2 text-white font-bold">{scan.date}</td>
                      <td className="py-3 px-2 text-[#c4c7c8] truncate max-w-[140px]">
                        {scan.rootTarget}
                      </td>
                      <td className="py-3 px-2 text-right text-white tabular-nums">{scan.inodes}</td>
                      <td className="py-3 px-2 text-right text-white font-bold tabular-nums">
                        {scan.total}
                      </td>
                      <td className="py-3 pl-2 text-right text-white font-bold whitespace-nowrap">
                        {scan.status}
                      </td>
                      <td className="py-3 pl-2 text-right">
                        {scan.scanId && (
                          <button
                            type="button"
                            onClick={() => onOpenScan(scan.scanId!)}
                            className="min-h-9 border border-[#444748] px-2 text-white hover:border-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
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
              <div className="py-5 text-center text-[#8e9192]" role="status">
                No saved scans match this search.
              </div>
            )}
          </div>

          <div className="mt-auto border-t border-[#1f1f1f] pt-2 flex items-center justify-between text-[11px] text-[#8e9192]">
            <span>CATALOG_PERSISTENCE: SQLITE_LOCAL_DB</span>
            <button
              type="button"
              onClick={handleExportHistorical}
              className="text-white hover:bg-white hover:text-black px-2 py-0.5 transition-none border border-[#1f1f1f] cursor-pointer"
            >
              [EXPORT_HISTORICAL_MANIFEST]
            </button>
          </div>
        </div>
      </div>

      {/* RECOVERY HISTORY */}
      <div className="w-full border border-[#444748] bg-black p-4 md:p-5 flex flex-col gap-4">
        {/* HEADER & LOSSLESS POLICY NOTICE */}
        <div className="border-b border-[#1f1f1f] pb-3 flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <div className="text-xs md:text-sm font-bold text-white tracking-widest uppercase">
              Cleanup recovery history
            </div>
            <div className="text-[11px] text-[#8e9192] mt-0.5">
              Restore vault items here. Items in system Trash must be restored through your operating system.
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-[#8e9192]">RECORDED ACTIONS:</span>
            <span className="border border-[#444748] px-2 py-0.5 text-white font-bold">
              {recoveryLog.length}
            </span>
          </div>
        </div>

        {/* RECOVERY ENTRIES */}
        {recoveryLog.length === 0 ? (
          <div className="border border-[#1f1f1f] bg-black p-6 text-center text-[#8e9192] uppercase text-xs">
            ZERO RECOVERY AUDIT ENTRIES // NO CLEANUP EXECUTED YET
          </div>
        ) : (
        <div className="flex flex-col gap-2">
          {recoveryLog.map((item) => (
            <div
              key={item.id}
              className={`border p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-none ${
                item.isRestored
                  ? 'border-[#1f1f1f] bg-[#131313]'
                  : 'border-[#1f1f1f] bg-black hover:border-white'
              }`}
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-bold uppercase text-xs ${
                      item.isRestored ? 'text-[#8e9192]' : 'text-white'
                    }`}
                  >
                    {item.filename}
                  </span>
                  <span className="text-[#8e9192] text-[11px]">//</span>
                  <span className="text-[#c4c7c8] text-[11px] font-bold">
                    {item.sizeFormatted}
                  </span>
                </div>

                <div className="text-[11px] text-[#8e9192] truncate max-w-xl">
                  ORIGIN: <span className="text-[#c4c7c8]">{item.originPath}</span>
                </div>

                <div
                  className={`text-[11px] ${
                    item.isRestored ? 'text-[#8e9192]' : 'text-white font-bold'
                  }`}
                >
                  STATUS: [ {item.status} ]
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] text-[#8e9192] hidden lg:inline">
                  DISPATCH_ID: {item.dispatchId}
                </span>

                {item.isRestored ? (
                  <span className="text-[11px] uppercase px-4 py-2 border border-[#444748] text-[#8e9192] cursor-default bg-[#0e0e0e]">
                    [ RESTORED ✓ ]
                  </span>
                ) : item.status.startsWith('FAILED') ? (
                  <span className="text-[11px] uppercase px-4 py-2 border border-[#444748] text-[#8e9192] bg-[#0e0e0e]">
                    Not moved
                  </span>
                ) : item.location === 'OS RECYCLE BIN' ? (
                  <span className="text-[11px] px-3 py-2 border border-[#444748] text-[#c4c7c8]">
                    Restore through system Trash
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onRestoreItem(item.id)}
                    className="text-[11px] uppercase px-4 py-2 border border-white text-white hover:bg-white hover:text-black transition-none cursor-pointer font-bold"
                  >
                    Restore from vault
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        )}

        {/* AUDIT FOOTER LOG LINE */}
        <div className="border-t border-[#1f1f1f] pt-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[10px] text-[#8e9192] uppercase">
          <div>Restore behavior depends on the recorded destination above.</div>
          <div className="text-[#c4c7c8] font-bold">Recovery actions are recorded locally.</div>
        </div>
      </div>
    </div>
  );
};
