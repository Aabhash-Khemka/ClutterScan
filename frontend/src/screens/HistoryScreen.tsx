import React from 'react';
import { NavTab, RecoveryLogItem } from '../types';
import { SNAPSHOT_DELTAS, HISTORICAL_SCANS } from '../mockData';

interface HistoryScreenProps {
  onNavigate: (tab: NavTab) => void;
  recoveryLog: RecoveryLogItem[];
  onRestoreItem: (id: string) => void;
  onShowNotice?: (msg: string) => void;
  historicalScans?: HistoricalScanEntry[];
  snapshotDeltas?: SnapshotDeltaItem[];
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  onNavigate,
  recoveryLog,
  onRestoreItem,
  onShowNotice,
  historicalScans: propScans,
  snapshotDeltas: propDeltas,
}) => {
  const scans = propScans && propScans.length > 0 ? propScans : HISTORICAL_SCANS;
  const deltas = propDeltas && propDeltas.length > 0 ? propDeltas : SNAPSHOT_DELTAS;

  const handleExportHistorical = () => {
    const data = {
      manifestType: 'INODE_MANIFEST_V3',
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
      onShowNotice('HISTORICAL MANIFEST EXPORTED // SQLITE SCHEMA SYNCED');
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
              SECTOR_LOG_07
            </span>
          </div>
          <div className="text-xs text-[#8e9192] tracking-wider uppercase">
            STORAGE HISTORY // SCAN-TO-SCAN INODE DELTA AUDIT
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-[11px]">
          <span className="text-[#8e9192] uppercase">SNAPSHOT_ENGINE:</span>
          <span className="text-white uppercase border border-[#444748] px-2 py-0.5">
            INODE_MANIFEST_V3
          </span>
          <span className="text-[#444748] hidden sm:inline">|</span>
          <span className="text-[#8e9192] uppercase">COMPARISON_STATUS:</span>
          <span className="text-white font-bold uppercase border border-white px-2 py-0.5">
            [RECONCILED]
          </span>
        </div>
      </div>

      {/* SNAPSHOT SELECTOR INTERFACE */}
      <div className="w-full border border-[#1f1f1f] bg-black p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-3 uppercase">
          <div className="flex items-center gap-1.5">
            <span className="text-[#8e9192]">BASELINE SNAPSHOT:</span>
            <span className="text-white border border-[#1f1f1f] px-2 py-1 cursor-pointer hover:border-[#444748]">
              [ 29 SEP 2026 // 11:42:01 UTC ]
            </span>
          </div>
          <span className="text-[#8e9192]">--&gt;</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[#8e9192]">COMPARISON TARGET:</span>
            <span className="bg-white text-black font-bold px-2 py-1 cursor-default">
              [ 01 OCT 2026 // 16:30:19 UTC ]
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-[#8e9192]">DELTA_INTERVAL:</span>
          <span className="text-white font-bold">+52H 48M 18S</span>
        </div>
      </div>

      {/* TELEMETRY STAT BOXES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Box 1 */}
        <div className="border border-[#1f1f1f] bg-black p-4 flex flex-col justify-between h-36">
          <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-2 text-[11px]">
            <span className="text-[#8e9192] uppercase">[SECTOR_A :: BASELINE]</span>
            <span className="text-[#8e9192]">29 SEP 2026</span>
          </div>
          <div className="flex flex-col gap-1 my-auto">
            <div className="text-[10px] text-[#8e9192] uppercase tracking-widest">
              USED STORAGE:
            </div>
            <div className="text-2xl md:text-3xl font-bold text-white tracking-tight tabular-nums">
              182.40 <span className="text-xs text-[#8e9192]">GB</span>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-[#1f1f1f] pt-2 text-[11px]">
            <span className="text-[#8e9192] uppercase">RECORDED INODES:</span>
            <span className="text-white font-bold">11,902</span>
          </div>
        </div>

        {/* Box 2 */}
        <div className="border border-[#1f1f1f] bg-black p-4 flex flex-col justify-between h-36">
          <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-2 text-[11px]">
            <span className="text-[#8e9192] uppercase">[SECTOR_B :: AUDITED]</span>
            <span className="text-white font-bold">01 OCT 2026</span>
          </div>
          <div className="flex flex-col gap-1 my-auto">
            <div className="text-[10px] text-[#8e9192] uppercase tracking-widest">
              USED STORAGE:
            </div>
            <div className="text-2xl md:text-3xl font-bold text-white tracking-tight tabular-nums">
              184.85 <span className="text-xs text-[#8e9192]">GB</span>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-[#1f1f1f] pt-2 text-[11px]">
            <span className="text-[#8e9192] uppercase">CURRENT INODES:</span>
            <span className="text-white font-bold">12,482</span>
          </div>
        </div>

        {/* Box 3: Highlighted Delta */}
        <div className="border border-white bg-black p-4 flex flex-col justify-between h-36">
          <div className="flex items-center justify-between border-b border-[#444748] pb-2 text-[11px]">
            <span className="text-white uppercase font-bold">[NET_STORAGE_DELTA]</span>
            <span className="text-white bg-[#1f1f1f] px-1.5 py-0.5 font-bold">
              +580 INODES
            </span>
          </div>
          <div className="flex flex-col gap-1 my-auto">
            <div className="text-[10px] text-[#8e9192] uppercase tracking-widest">
              VOLUME VARIATION:
            </div>
            <div className="text-2xl md:text-3xl font-bold text-white tracking-tight tabular-nums">
              + 2.45 <span className="text-xs text-[#8e9192]">GB</span>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-[#444748] pt-2 text-[11px]">
            <span className="text-[#8e9192] uppercase">TRAJECTORY:</span>
            <span className="text-white font-bold">EXPANSION (+1.34%)</span>
          </div>
        </div>
      </div>

      {/* MAIN TWO-COLUMN SYSTEM: DIRECTORY GROWTH + FORENSIC HISTORICAL LEDGER */}
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
                {deltas.map((item, idx) => (
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
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-[#1f1f1f] pt-2 text-[10px] text-[#8e9192] flex justify-between mt-auto">
            <span>ALLOCATION_MAP: EXT4/NTFS</span>
            <span>TREE_DEPTH: 4 LEVELS</span>
          </div>
        </div>

        {/* SCAN HISTORY LOG */}
        <div className="lg:col-span-7 border border-[#1f1f1f] bg-black p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-2 text-xs">
            <span className="font-bold text-white tracking-wider uppercase">
              [HISTORICAL_SCAN_INDEX]
            </span>
            <span className="text-[#8e9192] text-[11px]">REPOSITORIES: 03</span>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs uppercase border-collapse">
              <thead>
                <tr className="border-b border-[#1f1f1f] text-[#8e9192] text-[11px]">
                  <th className="py-2 pr-2 font-normal">DATE</th>
                  <th className="py-2 px-2 font-normal">ROOT TARGET</th>
                  <th className="py-2 px-2 font-normal text-right">INODES</th>
                  <th className="py-2 px-2 font-normal text-right">TOTAL</th>
                  <th className="py-2 pl-2 font-normal text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f1f1f]">
                {scans.map((scan, idx) => (
                  <tr key={idx} className="hover:bg-[#131313] transition-none">
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-auto border-t border-[#1f1f1f] pt-2 flex items-center justify-between text-[11px] text-[#8e9192]">
            <span>CATALOG_PERSISTENCE: SQLITE_IN_MEMORY</span>
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

      {/* REVERSIBLE RECOVERY SECTION */}
      <div className="w-full border border-[#444748] bg-black p-4 md:p-5 flex flex-col gap-4">
        {/* HEADER & LOSSLESS POLICY NOTICE */}
        <div className="border-b border-[#1f1f1f] pb-3 flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <div className="text-xs md:text-sm font-bold text-white tracking-widest uppercase">
              [RECOVERY_HISTORY // LOSSLESS RESTORATION INTERFACE]
            </div>
            <div className="text-[11px] text-[#8e9192] mt-0.5">
              PURGED INODES RESIDE IN OS RECYCLE BIN BUFFER. SYSTEM PERMITS INSTANT LOCAL UN-QUARANTINE WITHOUT INODE CORRUPTION.
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-[#8e9192]">POLICY:</span>
            <span className="border border-[#444748] px-2 py-0.5 text-white font-bold">
              ZERO_DESTRUCTIVE_OVERWRITE
            </span>
          </div>
        </div>

        {/* RECOVERY ENTRIES */}
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
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onRestoreItem(item.id);
                      if (onShowNotice) {
                        onShowNotice(`INODE UN-QUARANTINED: ${item.filename} RESTORED`);
                      }
                    }}
                    className="text-[11px] uppercase px-4 py-2 border border-white text-white hover:bg-white hover:text-black transition-none cursor-pointer font-bold"
                  >
                    [ RESTORE FILE ]
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* AUDIT FOOTER LOG LINE */}
        <div className="border-t border-[#1f1f1f] pt-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[10px] text-[#8e9192] uppercase">
          <div>RECYCLE_BIN_QUERY_LATENCY: 0.042ms // AUDIT LOG SIGNED SHA-256</div>
          <div className="text-[#c4c7c8] font-bold">[ALL RESTORE HOOKS NON-DESTRUCTIVE]</div>
        </div>
      </div>
    </div>
  );
};
