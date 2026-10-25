import React, { useMemo, useState } from 'react';
import { NavTab, RecoveryLogItem, HistoricalScanEntry, SnapshotDeltaItem } from '../types';
import {
  History,
  HardDrive,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  Search,
  Download,
  Calendar,
  CheckCircle2,
  FolderOpen,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

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
      onShowNotice('Historical scan manifest exported successfully.');
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 text-[#172033] pb-12">
      {/* HEADER SECTION */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-[#172033] tracking-tight">
              Scan &amp; Recovery History
            </h1>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#EEF2FF] text-[#5B5CE2] border border-[#C7D2FE]">
              Local Audit Journal
            </span>
          </div>
          <p className="text-sm md:text-base text-[#64748B]">
            Compare storage snapshots over time, monitor folder growth trends, and restore previously cleaned files from the recovery vault.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportHistorical}
          className="px-4 py-2 border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-[#334155] rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs self-start lg:self-auto"
        >
          <Download size={14} />
          <span>Export Manifest (JSON)</span>
        </button>
      </section>

      {/* SNAPSHOT METRIC CARDS */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Baseline */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2 text-xs">
            <span className="text-[#64748B] font-medium uppercase tracking-wider">Baseline Scan</span>
            <span className="text-[#94A3B8] font-mono">{baselineScan ? baselineScan.date : 'None'}</span>
          </div>
          <div className="my-3">
            <div className="text-xs text-[#64748B]">Recorded Storage:</div>
            <div className="text-2xl lg:text-3xl font-bold text-[#172033] mt-0.5">
              {baselineScan ? baselineScan.total : 'No prior scan'}
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-[#F1F5F9] pt-2 text-xs text-[#64748B]">
            <span>Total files indexed:</span>
            <span className="font-semibold text-[#172033]">{baselineScan ? baselineScan.inodes : '—'}</span>
          </div>
        </div>

        {/* Latest Scan */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2 text-xs">
            <span className="text-[#64748B] font-medium uppercase tracking-wider">Latest Scan</span>
            <span className="text-[#5B5CE2] font-semibold">{currentScan ? currentScan.date : 'None'}</span>
          </div>
          <div className="my-3">
            <div className="text-xs text-[#64748B]">Current Storage:</div>
            <div className="text-2xl lg:text-3xl font-bold text-[#5B5CE2] mt-0.5">
              {currentScan ? currentScan.total : 'No scans yet'}
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-[#F1F5F9] pt-2 text-xs text-[#64748B]">
            <span>Total files indexed:</span>
            <span className="font-semibold text-[#172033]">{currentScan ? currentScan.inodes : '—'}</span>
          </div>
        </div>

        {/* Largest Delta */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2 text-xs">
            <span className="text-[#64748B] font-medium uppercase tracking-wider">Primary Directory Trend</span>
            <span className="text-xs bg-[#EEF2FF] text-[#5B5CE2] px-2 py-0.5 rounded-full font-semibold">
              {deltas.length > 0 ? `${deltas.length} tracked` : '0 changes'}
            </span>
          </div>
          <div className="my-3">
            <div className="text-xs text-[#64748B]">Growth Delta:</div>
            <div className="text-2xl lg:text-3xl font-bold text-[#172033] mt-0.5">
              {deltas.length > 0
                ? deltas[0].delta
                : scans.length > 1
                  ? 'No directory changes'
                  : 'Awaiting second scan'}
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-[#F1F5F9] pt-2 text-xs">
            <span className="text-[#64748B] truncate max-w-[180px]">
              {deltas.length > 0 ? deltas[0].directory : 'Directory Comparison'}
            </span>
            <span className={`font-semibold ${deltas[0]?.isPositive ? 'text-[#B45309]' : 'text-[#15803D]'}`}>
              {deltas.length > 0
                ? (deltas[0].isPositive ? '↑ Growth' : '↓ Reduction')
                : 'Unchanged'}
            </span>
          </div>
        </div>
      </section>

      {/* TABLES SECTION: DIRECTORY DELTAS & SCAN INDEX */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Directory Delta Table */}
        <div className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div>
              <h3 className="font-bold text-sm text-[#172033]">
                Directory Growth Delta
              </h3>
              <span className="text-xs text-[#64748B]">Two-scan comparative delta</span>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-semibold">
                  <th className="py-2.5 px-3">Directory</th>
                  <th className="py-2.5 px-3 text-right">Delta</th>
                  <th className="py-2.5 px-3 text-right">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {deltas.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-[#64748B] text-xs">
                      Requires 2 or more saved scans to calculate folder growth deltas.
                    </td>
                  </tr>
                ) : (
                  deltas.map((item, idx) => (
                    <tr key={idx} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-3 font-medium text-[#172033]">{item.directory}</td>
                      <td className="py-3 px-3 text-right font-semibold text-[#172033]">
                        {item.delta}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className={`font-semibold text-xs ${item.isPositive ? 'text-[#B45309]' : 'text-[#15803D]'}`}>
                          {item.direction}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Saved Scan Sessions */}
        <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div>
              <h3 className="font-bold text-sm text-[#172033]">
                Historical Scan Index
              </h3>
              <span className="text-xs text-[#64748B]">{scans.length} Recorded Sessions</span>
            </div>
          </div>

          <div className="relative">
            <Search size={15} className="absolute left-3 top-2.5 text-[#94A3B8]" />
            <input
              type="search"
              value={scanSearch}
              onChange={(e) => setScanSearch(e.target.value)}
              placeholder="Filter scans by target folder or date..."
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] pl-9 pr-3.5 py-2 text-xs text-[#172033] placeholder:text-[#94A3B8] rounded-lg focus:border-[#5B5CE2] outline-none"
            />
          </div>

          <div className="w-full overflow-x-auto max-h-[300px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-semibold">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Folder Path</th>
                  <th className="py-2.5 px-3 text-right">Files</th>
                  <th className="py-2.5 px-3 text-right">Total Size</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {scans.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#64748B] text-xs">
                      No saved scans recorded yet.
                    </td>
                  </tr>
                ) : (
                  visibleScans.map((scan, idx) => (
                    <tr key={scan.id ?? `${scan.date}-${scan.rootTarget}-${idx}`} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-3 text-[#64748B] whitespace-nowrap">{scan.date}</td>
                      <td className="py-3 px-3 text-[#172033] font-medium truncate max-w-[180px]" title={scan.rootTarget}>
                        {scan.rootTarget}
                      </td>
                      <td className="py-3 px-3 text-right text-[#64748B]">{scan.inodes}</td>
                      <td className="py-3 px-3 text-right font-bold text-[#172033]">{scan.total}</td>
                      <td className="py-3 px-3 text-right">
                        {scan.scanId && (
                          <button
                            type="button"
                            onClick={() => onOpenScan(scan.scanId!)}
                            className="px-3 py-1 bg-[#EEF2FF] text-[#5B5CE2] hover:bg-[#5B5CE2] hover:text-white rounded-md text-xs font-semibold cursor-pointer transition-colors"
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
          </div>
        </div>
      </section>

      {/* RECOVERY JOURNAL */}
      <section className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E2E8F0] pb-3 gap-2">
          <div>
            <h3 className="font-bold text-sm text-[#172033]">
              Cleanup Recovery Journal &amp; Safe Restore
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              1-click restoration for vault-staged files. Files sent to Windows Recycle Bin can be restored through the desktop Recycle Bin.
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-[#F1F5F9] text-[#64748B] font-semibold self-start sm:self-auto">
            {recoveryLog.length} Actions Logged
          </span>
        </div>

        {recoveryLog.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#64748B]">
            No cleaned files recorded yet. Files moved during cleanup will appear here with restoration controls.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {recoveryLog.map((item) => (
              <div
                key={item.id}
                className={`border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${
                  item.isRestored
                    ? 'border-[#BBF7D0] bg-[#F0FDF4]'
                    : 'border-[#E2E8F0] bg-white hover:border-[#CBD5E1]'
                }`}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold text-sm ${item.isRestored ? 'text-[#166534]' : 'text-[#172033]'}`}>
                      {item.filename}
                    </span>
                    <span className="text-xs text-[#94A3B8]">•</span>
                    <span className="text-xs font-semibold text-[#64748B]">{item.sizeFormatted}</span>
                  </div>

                  <div className="text-xs text-[#64748B] truncate max-w-xl">
                    Origin: <span className="text-[#172033] font-mono">{item.originPath}</span>
                  </div>

                  <div className="text-xs">
                    <span className="text-[#64748B]">Status: </span>
                    <span className={`font-semibold ${item.isRestored ? 'text-[#15803D]' : 'text-[#172033]'}`}>
                      {item.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {item.isRestored ? (
                    <span className="text-xs px-3 py-1 bg-[#DCFCE7] text-[#15803D] font-semibold rounded-full flex items-center gap-1.5">
                      <CheckCircle2 size={14} /> Restored Successfully
                    </span>
                  ) : item.status.startsWith('FAILED') ? (
                    <span className="text-xs px-3 py-1 bg-[#FEF2F2] text-[#DC2626] rounded-md font-medium">
                      Not Moved
                    </span>
                  ) : item.location === 'OS RECYCLE BIN' ? (
                    <span className="text-xs px-3 py-1.5 bg-[#F1F5F9] text-[#64748B] rounded-lg font-medium">
                      Restore via Windows Recycle Bin
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onRestoreItem(item.id)}
                      className="text-xs font-semibold px-4 py-2 bg-[#5B5CE2] hover:bg-[#4849C7] text-white rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <RotateCcw size={13} />
                      <span>Restore to Original Folder</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
