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
    <div className="w-full bg-[#000000] text-white font-mono text-xs flex flex-col gap-6">
      {/* SUB-HEADER / TARGET IDENTIFIER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-[#303030] pb-4 gap-3">
        <div className="flex flex-col gap-1">
          <div className="text-base md:text-xl font-bold text-white tracking-widest uppercase">
            [METADATA_ANALYSIS_TARGETS]
          </div>
          <div className="text-[11px] text-[#858585] uppercase tracking-wider">
            AGE / TEMPORARY FILE RULE HEURISTICS // STAT_INODE INSPECTION
          </div>
        </div>
        <div className="text-[11px] text-[#858585] border border-[#484848] px-3 py-1 uppercase tracking-widest bg-black">
          FILTER_PROTOCOL: ACCESS_TIMESTAMP + REGEX_FILENAME_PATTERNS
        </div>
      </div>

      {/* SUMMARY METRICS STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-[#303030] bg-[#0b0b0b]">
        <div className="p-4 border-b sm:border-b-0 border-r-0 sm:border-r border-[#303030] flex flex-col gap-1">
          <span className="text-[11px] text-[#858585] uppercase tracking-widest">
            OLDER FILES (&gt;180D MODIFIED)
          </span>
          <span className="text-xl md:text-2xl font-bold text-white tracking-widest">{oldCount}</span>
        </div>
        <div className="p-4 border-b sm:border-b-0 lg:border-r border-[#303030] flex flex-col gap-1">
          <span className="text-[11px] text-[#858585] uppercase tracking-widest">
            TEMPORARY FILES (.TMP/.LOG)
          </span>
          <span className="text-xl md:text-2xl font-bold text-white tracking-widest">{tempCount}</span>
        </div>
        <div className="p-4 border-b sm:border-b-0 border-r-0 sm:border-r border-[#303030] flex flex-col gap-1">
          <span className="text-[11px] text-[#858585] uppercase tracking-widest">
            TOTAL CANDIDATES
          </span>
          <span className="text-xl md:text-2xl font-bold text-white tracking-widest">{totalCandidateCount}</span>
        </div>
        <div className="p-4 flex flex-col gap-1">
          <span className="text-[11px] text-[#858585] uppercase tracking-widest">
            POTENTIAL RECOVERY
          </span>
          <span className="text-xl md:text-2xl font-bold text-white tracking-widest">{formattedPotentialRecovery}</span>
        </div>
      </div>

      {/* FILTER BAR & BULK DISPATCH */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilterType('ALL')}
            className={`uppercase font-bold text-xs px-4 py-2 border transition-none cursor-pointer ${
              filterType === 'ALL'
                ? 'border-white bg-white text-black'
                : 'border-[#303030] bg-black text-[#b0b0b0] hover:border-[#484848] hover:text-white'
            }`}
          >
            [ ALL ({totalCandidateCount}) ]
          </button>
          <button
            type="button"
            onClick={() => setFilterType('OLD')}
            className={`uppercase font-bold text-xs px-4 py-2 border transition-none cursor-pointer ${
              filterType === 'OLD'
                ? 'border-white bg-white text-black'
                : 'border-[#303030] bg-black text-[#b0b0b0] hover:border-[#484848] hover:text-white'
            }`}
          >
            [ OLD ({oldCount}) ]
          </button>
          <button
            type="button"
            onClick={() => setFilterType('TEMPORARY')}
            className={`uppercase font-bold text-xs px-4 py-2 border transition-none cursor-pointer ${
              filterType === 'TEMPORARY'
                ? 'border-white bg-white text-black'
                : 'border-[#303030] bg-black text-[#b0b0b0] hover:border-[#484848] hover:text-white'
            }`}
          >
            [ TEMPORARY ({tempCount}) ]
          </button>
        </div>

        <div>
          <button
            type="button"
            onClick={handleBulkToggle}
            className="w-full sm:w-auto uppercase font-bold text-xs px-4 py-2 border border-[#484848] bg-black text-white hover:bg-white hover:text-black transition-none cursor-pointer"
          >
            {allFilteredStaged ? '[ UNSTAGE ALL CANDIDATES ]' : '[ BULK SELECT CANDIDATES ]'}
          </button>
        </div>
      </div>

      {/* FORENSIC TABLE */}
      <div className="w-full border border-[#303030] bg-black overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-[#303030] text-[11px] text-[#858585] uppercase bg-[#0b0b0b]">
              <th
                className="py-2.5 px-4 w-12 text-center select-none cursor-pointer"
                onClick={handleBulkToggle}
              >
                {allFilteredStaged ? '[✓]' : '[ ]'}
              </th>
              <th className="py-2.5 px-4 tracking-wider">FILE PATH</th>
              <th className="py-2.5 px-4 tracking-wider whitespace-nowrap">INODE AGE</th>
              <th className="py-2.5 px-4 tracking-wider">TYPE</th>
              <th className="py-2.5 px-4 tracking-wider text-right">SIZE</th>
              <th className="py-2.5 px-4 tracking-wider">CLASSIFICATION REASON</th>
              <th className="py-2.5 px-4 tracking-wider text-right">STAGE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#303030] text-xs">
            {filteredFiles.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[#858585] uppercase">
                  ZERO CANDIDATE INODES MATCH CURRENT FILTER PROTOCOL // DISK CLEAN
                </td>
              </tr>
            ) : (
              filteredFiles.map((file) => (
              <tr
                key={file.id}
                className="transition-none hover:bg-[#111111] group"
              >
                <td
                  className="py-3 px-4 text-center cursor-pointer select-none"
                  onClick={() => onToggleStageFile(file.id)}
                >
                  <span
                    className={`font-bold ${
                      file.isStaged ? 'text-white' : 'text-[#858585]'
                    }`}
                  >
                    {file.isStaged ? '[✓]' : '[ ]'}
                  </span>
                </td>
                <td className="py-3 px-4 text-white font-mono break-all max-w-sm">
                  {file.path}
                </td>
                <td className="py-3 px-4 text-[#b0b0b0] whitespace-nowrap">
                  {file.inodeAge}
                </td>
                <td className="py-3 px-4 text-white font-bold">{file.type}</td>
                <td className="py-3 px-4 text-right text-white font-bold whitespace-nowrap">
                  {file.size}
                </td>
                <td className="py-3 px-4 text-[#b0b0b0]">{file.reason}</td>
                <td className="py-3 px-4 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => onToggleStageFile(file.id)}
                    className={`text-[10px] font-bold px-2 py-0.5 border uppercase transition-none cursor-pointer ${
                      file.isStaged
                        ? 'border-white bg-white text-black'
                        : 'border-[#484848] bg-black text-[#b0b0b0] hover:border-white hover:text-white'
                    }`}
                  >
                    {file.isStaged ? '[ QUEUED ]' : '[ STAGE ]'}
                  </button>
                </td>
              </tr>
            ))
            )}
          </tbody>
        </table>
      </div>

      {/* BOTTOM TELEMETRY / STAGING STATUS */}
      <div className="border border-[#303030] bg-[#0b0b0b] p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <div className="text-xs font-bold text-white tracking-widest uppercase">
            [STAGING_TELEMETRY]
          </div>
          <div className="text-sm font-bold text-white tracking-wider">
            STAGED FOR CANDIDATE QUEUE: {stagedFiles.length} FILES ({formattedStagedSize})
          </div>
          <div className="text-[11px] text-[#858585] uppercase tracking-wider">
            NOTICE: NO MUTATION PERFORMED ON DISK. CANDIDATES FORWARDED TO [EXECUTION_QUEUE].
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={() => onNavigate('cleanup')}
            className="w-full md:w-auto text-center font-bold text-xs px-6 py-2.5 border border-white bg-white text-black uppercase hover:bg-neutral-200 transition-none cursor-pointer"
          >
            FORWARD TO CLEANUP &gt;&gt;
          </button>
        </div>
      </div>
    </div>
  );
};
