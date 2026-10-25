import React, { useState, useMemo } from 'react';
import { NavTab, MetadataFileItem } from '../types';
import {
  FileText,
  Clock,
  Trash2,
  HardDrive,
  CheckSquare,
  Square,
  ArrowRight,
  Filter,
  Check,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface FilesScreenProps {
  onNavigate: (tab: NavTab) => void;
  files: MetadataFileItem[];
  onToggleStageFile: (fileId: string) => void;
  onBulkStageFiles: (fileIds: string[], stage: boolean) => void;
}

export const FilesScreen: React.FC<FilesScreenProps> = ({
  onNavigate,
  files,
  onToggleStageFile,
  onBulkStageFiles,
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'OLD' | 'TEMPORARY'>('ALL');

  const filteredFiles = useMemo(() => {
    if (filterType === 'OLD') {
      return files.filter((file) => file.reason.includes('TIMESTAMP'));
    }
    if (filterType === 'TEMPORARY') {
      return files.filter((file) =>
        file.type === 'TMP'
        || file.type === 'CACHE'
        || file.type === 'EPHEMERAL'
        || file.reason.includes('TEMPORARY')
        || file.reason.includes('EXTENSION_MATCH')
      );
    }
    return files;
  }, [files, filterType]);

  const stagedFiles = useMemo(() => files.filter((f) => f.isStaged), [files]);

  const stagedBytesTotal = useMemo(
    () => stagedFiles.reduce((acc, curr) => acc + curr.bytes, 0),
    [stagedFiles]
  );

  const formattedStagedSize = useMemo(() => {
    if (stagedBytesTotal >= 1024 * 1024 * 1024) {
      return (stagedBytesTotal / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }
    return (stagedBytesTotal / (1024 * 1024)).toFixed(1) + ' MB';
  }, [stagedBytesTotal]);

  const oldCount = useMemo(
    () => files.filter((file) => file.reason.includes('TIMESTAMP')).length,
    [files]
  );

  const tempCount = useMemo(
    () => files.filter((file) =>
      file.type === 'TMP'
      || file.type === 'CACHE'
      || file.type === 'EPHEMERAL'
      || file.reason.includes('TEMPORARY')
      || file.reason.includes('EXTENSION_MATCH')
    ).length,
    [files]
  );

  const totalCandidateCount = files.length;

  const totalPotentialRecoveryBytes = useMemo(
    () => files.reduce((acc, f) => acc + (f.bytes || 0), 0),
    [files]
  );

  const formattedPotentialRecovery = useMemo(() => {
    if (totalPotentialRecoveryBytes >= 1024 * 1024 * 1024) {
      return (totalPotentialRecoveryBytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }
    if (totalPotentialRecoveryBytes >= 1024 * 1024) {
      return (totalPotentialRecoveryBytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
    if (totalPotentialRecoveryBytes >= 1024) {
      return (totalPotentialRecoveryBytes / 1024).toFixed(1) + ' KB';
    }
    return totalPotentialRecoveryBytes + ' B';
  }, [totalPotentialRecoveryBytes]);

  const allFilteredStaged = filteredFiles.length > 0 && filteredFiles.every((f) => f.isStaged);

  const handleBulkToggle = () => {
    const ids = filteredFiles.map((f) => f.id);
    onBulkStageFiles(ids, !allFilteredStaged);
  };

  return (
    <div className="w-full flex flex-col gap-6 text-[#172033] pb-12">
      {/* HEADER SECTION */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-[#172033] tracking-tight">
              File Review
            </h1>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#EEF2FF] text-[#5B5CE2] border border-[#C7D2FE]">
              Metadata Rules
            </span>
          </div>
          <p className="text-sm md:text-base text-[#64748B]">
            Automated recommendations for older files, unused logs, and temporary caches based on timestamp analysis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('cleanup')}
            className="px-4 py-2 bg-[#5B5CE2] hover:bg-[#4849C7] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>Go to Cleanup Queue ({stagedFiles.length})</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </section>

      {/* SUMMARY METRICS CARDS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
          <div className="text-xs font-medium uppercase tracking-wider text-[#64748B]">Older Files (&gt;180 Days)</div>
          <div className="text-2xl lg:text-3xl font-bold text-[#172033] mt-1.5">{oldCount}</div>
          <div className="text-xs text-[#94A3B8] mt-1">Untouched since 6+ months</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
          <div className="text-xs font-medium uppercase tracking-wider text-[#64748B]">Temporary Files</div>
          <div className="text-2xl lg:text-3xl font-bold text-[#172033] mt-1.5">{tempCount}</div>
          <div className="text-xs text-[#94A3B8] mt-1">.tmp, .log and cache files</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
          <div className="text-xs font-medium uppercase tracking-wider text-[#64748B]">Total Candidates</div>
          <div className="text-2xl lg:text-3xl font-bold text-[#5B5CE2] mt-1.5">{totalCandidateCount}</div>
          <div className="text-xs text-[#94A3B8] mt-1">Flagged for user review</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
          <div className="text-xs font-medium uppercase tracking-wider text-[#64748B]">Potential Space Savings</div>
          <div className="text-2xl lg:text-3xl font-bold text-[#15803D] mt-1.5">{formattedPotentialRecovery}</div>
          <div className="text-xs text-[#94A3B8] mt-1">If all candidates cleared</div>
        </div>
      </section>

      {/* FILTER & ACTIONS BAR */}
      <section className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#F1F5F9] p-1 rounded-lg border border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                filterType === 'ALL'
                  ? 'bg-white text-[#172033] shadow-xs font-semibold'
                  : 'text-[#64748B] hover:text-[#172033]'
              }`}
            >
              All Candidates ({totalCandidateCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('OLD')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                filterType === 'OLD'
                  ? 'bg-white text-[#172033] shadow-xs font-semibold'
                  : 'text-[#64748B] hover:text-[#172033]'
              }`}
            >
              Old Files ({oldCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('TEMPORARY')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                filterType === 'TEMPORARY'
                  ? 'bg-white text-[#172033] shadow-xs font-semibold'
                  : 'text-[#64748B] hover:text-[#172033]'
              }`}
            >
              Temporary ({tempCount})
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleBulkToggle}
          className="px-3.5 py-2 border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-[#334155] text-xs font-semibold rounded-lg cursor-pointer flex items-center gap-2 transition-colors shadow-xs"
        >
          {allFilteredStaged ? (
            <CheckSquare size={16} className="text-[#5B5CE2]" />
          ) : (
            <Square size={16} className="text-[#94A3B8]" />
          )}
          <span>{allFilteredStaged ? 'Unstage All in View' : 'Stage All in View'}</span>
        </button>
      </section>

      {/* FILE TABLE CARD */}
      <section className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs text-[#64748B] uppercase font-semibold">
                <th
                  className="py-3 px-4 w-12 text-center select-none cursor-pointer"
                  onClick={handleBulkToggle}
                >
                  {allFilteredStaged ? (
                    <CheckSquare size={16} className="text-[#5B5CE2] mx-auto" />
                  ) : (
                    <Square size={16} className="text-[#CBD5E1] mx-auto" />
                  )}
                </th>
                <th className="py-3 px-4">File Name & Path</th>
                <th className="py-3 px-4 whitespace-nowrap">Last Accessed</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Size</th>
                <th className="py-3 px-4">Recommendation Rule</th>
                <th className="py-3 px-4 text-right">Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] text-sm">
              {filteredFiles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#64748B] text-sm">
                    No files match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredFiles.map((file) => {
                  const isStaged = file.isStaged;

                  return (
                    <tr
                      key={file.id}
                      className={`transition-colors ${
                        isStaged ? 'bg-[#EEF2FF]/40' : 'hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <td
                        className="py-3.5 px-4 text-center cursor-pointer select-none"
                        onClick={() => onToggleStageFile(file.id)}
                      >
                        {isStaged ? (
                          <CheckSquare size={18} className="text-[#5B5CE2] mx-auto" />
                        ) : (
                          <Square size={18} className="text-[#CBD5E1] mx-auto" />
                        )}
                      </td>
                      <td className="py-3.5 px-4 max-w-sm">
                        <div className="flex flex-col">
                          <span className="font-medium text-sm text-[#172033] truncate" title={file.path}>
                            {file.path.split(/[\\/]/).pop()}
                          </span>
                          <span className="text-xs text-[#64748B] truncate mt-0.5" title={file.path}>
                            {file.path}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-[#64748B]">
                        {file.inodeAge}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs px-2 py-0.5 rounded-md font-mono bg-[#F1F5F9] text-[#64748B]">
                          {file.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-xs text-[#172033] whitespace-nowrap">
                        {file.size}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#64748B]">
                        {file.reason}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onToggleStageFile(file.id)}
                          className={`text-xs font-medium px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                            isStaged
                              ? 'bg-[#5B5CE2] text-white shadow-xs'
                              : 'border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-[#334155]'
                          }`}
                        >
                          {isStaged ? 'Staged' : 'Stage'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* BOTTOM STAGING BAR */}
      <section className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="text-sm font-bold text-[#172033]">
            Staged for Cleanup: {stagedFiles.length} Files ({formattedStagedSize})
          </div>
          <div className="text-xs text-[#64748B] mt-0.5">
            Staged items are reviewed before deletion in the Cleanup Queue. No files are moved yet.
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('cleanup')}
          className="px-5 py-2.5 bg-[#5B5CE2] hover:bg-[#4849C7] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-2"
        >
          <span>Proceed to Cleanup Queue</span>
          <ArrowRight size={14} />
        </button>
      </section>
    </div>
  );
};
