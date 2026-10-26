import React, { useState, useMemo } from 'react';
import { NavTab, MetadataFileItem } from '../types';

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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const pageSize = 50;

  const filteredFiles = useMemo(() => {
    let result = files;
    if (filterType === 'OLD') {
      result = result.filter((file) => file.reason.includes('TIMESTAMP'));
    } else if (filterType === 'TEMPORARY') {
      result = result.filter((file) =>
        file.type === 'TMP'
        || file.type === 'CACHE'
        || file.type === 'EPHEMERAL'
        || file.reason.includes('TEMPORARY')
        || file.reason.includes('EXTENSION_MATCH')
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((f) => f.path.toLowerCase().includes(q) || f.name.toLowerCase().includes(q) || f.reason.toLowerCase().includes(q));
    }
    return result;
  }, [files, filterType, searchQuery]);

  // Reset page when filter changes
  React.useEffect(() => {
    setPage(1);
  }, [filterType, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredFiles.length / pageSize));
  const paginatedFiles = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredFiles.slice(start, start + pageSize);
  }, [filteredFiles, page]);

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
    <div className="w-full text-[#f5f5f5] flex flex-col gap-8">
      {/* SUB-HEADER / TARGET IDENTIFIER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-[#303030] pb-5 gap-3">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl md:text-3xl font-bold text-[#f5f5f5] tracking-tight">
            File Review
          </h1>
          <p className="text-sm md:text-base text-[#b8b8b8]">
            Heuristic analysis of old files, temporary caches, and review recommendations based on timestamp metadata.
          </p>
        </div>
        <div className="text-xs text-[#858585] border border-[#303030] px-3 py-1 uppercase tracking-wider bg-[#141414] rounded-[2px] font-mono">
          STAT_INODE // ACCESS_TIMESTAMP
        </div>
      </div>

      {/* SUMMARY METRICS STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 border border-[#303030] bg-[#141414] rounded-[2px] flex flex-col gap-1">
          <span className="text-xs text-[#858585] uppercase font-medium">
            Older Files (&gt;180 Days)
          </span>
          <span className="text-2xl md:text-3xl font-bold font-mono text-white mt-1">{oldCount}</span>
        </div>
        <div className="p-5 border border-[#303030] bg-[#141414] rounded-[2px] flex flex-col gap-1">
          <span className="text-xs text-[#858585] uppercase font-medium">
            Temporary Files (.tmp/.log)
          </span>
          <span className="text-2xl md:text-3xl font-bold font-mono text-white mt-1">{tempCount}</span>
        </div>
        <div className="p-5 border border-[#303030] bg-[#141414] rounded-[2px] flex flex-col gap-1">
          <span className="text-xs text-[#858585] uppercase font-medium">
            Total Candidates
          </span>
          <span className="text-2xl md:text-3xl font-bold font-mono text-white mt-1">{totalCandidateCount}</span>
        </div>
        <div className="p-5 border border-[#303030] bg-[#141414] rounded-[2px] flex flex-col gap-1">
          <span className="text-xs text-[#858585] uppercase font-medium">
            Potential Recovery
          </span>
          <span className="text-2xl md:text-3xl font-bold font-mono text-[#57b887] mt-1">{formattedPotentialRecovery}</span>
        </div>
      </div>

      {/* FILTER BAR & BULK DISPATCH */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-[#141414] p-4 border border-[#303030] rounded-[2px]">
        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilterType('ALL')}
            className={`font-semibold text-xs uppercase px-4 py-2 border transition-all cursor-pointer rounded-[2px] ${
              filterType === 'ALL'
                ? 'border-white bg-white text-black'
                : 'border-[#303030] bg-[#1b1b1b] text-[#b8b8b8] hover:border-[#454545] hover:text-white'
            }`}
          >
            All ({totalCandidateCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('OLD')}
            className={`font-semibold text-xs uppercase px-4 py-2 border transition-all cursor-pointer rounded-[2px] ${
              filterType === 'OLD'
                ? 'border-white bg-white text-black'
                : 'border-[#303030] bg-[#1b1b1b] text-[#b8b8b8] hover:border-[#454545] hover:text-white'
            }`}
          >
            Old Files ({oldCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('TEMPORARY')}
            className={`font-semibold text-xs uppercase px-4 py-2 border transition-all cursor-pointer rounded-[2px] ${
              filterType === 'TEMPORARY'
                ? 'border-white bg-white text-black'
                : 'border-[#303030] bg-[#1b1b1b] text-[#b8b8b8] hover:border-[#454545] hover:text-white'
            }`}
          >
            Temporary Files ({tempCount})
          </button>

          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search path, name, or reason..."
            className="bg-[#0b0b0b] border border-[#303030] text-white text-xs px-3 py-2 rounded-[2px] w-48 sm:w-64 placeholder:text-[#858585] focus:border-white focus:outline-none font-mono"
          />
        </div>

        <div>
          <button
            type="button"
            onClick={handleBulkToggle}
            className="w-full sm:w-auto font-semibold text-xs px-4 py-2 border border-[#454545] bg-[#1b1b1b] text-[#f5f5f5] hover:border-white transition-all cursor-pointer rounded-[2px]"
          >
            {allFilteredStaged ? 'Unstage All Candidates' : 'Bulk Select Candidates'}
          </button>
        </div>
      </div>

      {/* FORENSIC TABLE */}
      <div className="w-full border border-[#303030] bg-[#141414] rounded-[2px] overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-[#303030] text-xs text-[#858585] uppercase bg-[#101010]">
              <th
                className="py-3 px-4 w-12 text-center select-none cursor-pointer"
                onClick={handleBulkToggle}
              >
                {allFilteredStaged ? '[✓]' : '[ ]'}
              </th>
              <th className="py-3 px-4 font-semibold">File Path</th>
              <th className="py-3 px-4 font-semibold whitespace-nowrap">Age</th>
              <th className="py-3 px-4 font-semibold">Type</th>
              <th className="py-3 px-4 font-semibold text-right">Size</th>
              <th className="py-3 px-4 font-semibold">Rule Reason</th>
              <th className="py-3 px-4 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#222222] text-sm">
            {filteredFiles.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[#858585] text-sm">
                  No files match current filter criteria.
                </td>
              </tr>
            ) : (
              paginatedFiles.map((file) => (
              <tr
                key={file.id}
                className="transition-colors hover:bg-[#1b1b1b] group"
              >
                <td
                  className="py-3 px-4 text-center cursor-pointer select-none"
                  onClick={() => onToggleStageFile(file.id)}
                >
                  <span
                    className={`font-bold font-mono ${
                      file.isStaged ? 'text-white' : 'text-[#858585]'
                    }`}
                  >
                    {file.isStaged ? '[✓]' : '[ ]'}
                  </span>
                </td>
                <td className="py-3 px-4 text-[#f5f5f5] font-mono text-xs md:text-sm break-all max-w-sm">
                  {file.path}
                </td>
                <td className="py-3 px-4 text-[#b8b8b8] whitespace-nowrap text-xs font-mono">
                  {file.inodeAge}
                </td>
                <td className="py-3 px-4 text-white font-mono text-xs">{file.type}</td>
                <td className="py-3 px-4 text-right text-white font-semibold font-mono whitespace-nowrap">
                  {file.size}
                </td>
                <td className="py-3 px-4 text-[#b8b8b8] text-xs">{file.reason}</td>
                <td className="py-3 px-4 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => onToggleStageFile(file.id)}
                    className={`text-xs font-semibold px-3 py-1 border transition-all cursor-pointer rounded-[2px] ${
                      file.isStaged
                        ? 'border-white bg-white text-black'
                        : 'border-[#454545] bg-[#101010] text-[#b8b8b8] hover:border-white hover:text-white'
                    }`}
                  >
                    {file.isStaged ? 'Queued' : 'Stage'}
                  </button>
                </td>
              </tr>
            ))
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION CONTROLS */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between py-2 border-t border-[#303030] text-xs font-mono">
          <div className="text-[#858585]">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredFiles.length)} of {filteredFiles.length} files
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 border border-[#303030] bg-[#141414] text-white disabled:opacity-30 disabled:cursor-not-allowed hover:border-white transition-colors"
            >
              Prev
            </button>
            <span className="text-white px-2">Page {page} of {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1 border border-[#303030] bg-[#141414] text-white disabled:opacity-30 disabled:cursor-not-allowed hover:border-white transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* BOTTOM TELEMETRY / STAGING STATUS */}
      <div className="border border-[#303030] bg-[#141414] p-5 rounded-[2px] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <div className="text-base font-bold text-white tracking-tight">
            Staged for Cleanup: {stagedFiles.length} Files ({formattedStagedSize})
          </div>
          <div className="text-xs text-[#858585]">
            Staged items are forwarded to the Cleanup review queue. No files are moved yet.
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={() => onNavigate('cleanup')}
            className="w-full md:w-auto text-center font-semibold text-sm px-6 py-2.5 border border-white bg-white text-black uppercase hover:bg-neutral-200 transition-all cursor-pointer rounded-[2px]"
          >
            Forward to Cleanup Queue →
          </button>
        </div>
      </div>
    </div>
  );
};
