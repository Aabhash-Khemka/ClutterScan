import React, { useState, useMemo } from 'react';
import { NavTab, CleanupCandidateRecord } from '../types';
import { CleanupModal } from '../components/CleanupModal';
import type { CleanupExecutionSummary } from '../types';

type CandidateFilter = 'ALL' | 'DUPLICATES' | 'TEMPORARY' | 'OLDER' | 'LARGE';

const filterMatches = (candidate: CleanupCandidateRecord, filter: CandidateFilter) => {
  if (filter === 'ALL') return true;
  const reasons = candidate.reasons.join(' ').toUpperCase();
  if (filter === 'DUPLICATES') return reasons.includes('EXACT_DUPLICATE');
  if (filter === 'TEMPORARY') {
    return reasons.includes('TEMPORARY_ARTIFACT')
      || reasons.includes('EXTENSION_MATCH')
      || reasons.includes('TEMPORARY_DIRECTORY')
      || reasons.includes('TEMPORARY_FILENAME');
  }
  if (filter === 'OLDER') return reasons.includes('UNRESOLVED_INODE_AGE');
  return reasons.includes('STORAGE_IMPACT');
};

const readableReason = (reason: string) => {
  if (reason === 'EXACT_DUPLICATE') return 'An identical file was found elsewhere.';
  if (reason === 'LOWER_RESOLUTION') return 'Another exact image copy has a higher resolution.';
  if (reason === 'TEMPORARY_ARTIFACT') return 'The file matches a temporary-file rule.';
  if (reason === 'HIGH_STORAGE_IMPACT') return 'The file is at least 100 MB.';
  if (reason === 'MODERATE_STORAGE_IMPACT') return 'The file is at least 10 MB.';
  if (reason === 'RECENTLY_MODIFIED') return 'Recent modification activity lowered its priority.';
  const ageMatch = reason.match(/^UNRESOLVED_INODE_AGE\s*>\s*(\d+)D$/i);
  if (ageMatch) return `The file's recorded modification time is ${ageMatch[1]} days old.`;
  return reason.replaceAll('_', ' ').toLowerCase();
};

interface CleanupScreenProps {
  onNavigate: (tab: NavTab) => void;
  candidates: CleanupCandidateRecord[];
  onToggleCandidate: (id: string) => void;
  onSelectCandidates: (candidateIds: string[], select: boolean) => void;
  onExecuteSafeCleanup: (
    selectedRecords: CleanupCandidateRecord[]
  ) => Promise<CleanupExecutionSummary>;
}

export const CleanupScreen: React.FC<CleanupScreenProps> = ({
  onNavigate,
  candidates,
  onToggleCandidate,
  onSelectCandidates,
  onExecuteSafeCleanup,
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [executionFeedback, setExecutionFeedback] = useState<boolean>(false);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionSummary, setExecutionSummary] = useState<CleanupExecutionSummary | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [candidateFilter, setCandidateFilter] = useState<CandidateFilter>('ALL');

  const selectedCandidates = useMemo(
    () => candidates.filter((c) => c.isSelected),
    [candidates]
  );

  const totalBytesSelected = useMemo(
    () => selectedCandidates.reduce((acc, curr) => acc + curr.bytes, 0),
    [selectedCandidates]
  );

  const formattedSelectedSize = useMemo(() => {
    if (totalBytesSelected === 0) return '0 B';
    if (totalBytesSelected >= 1024 * 1024 * 1024) {
      return (totalBytesSelected / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }
    return (totalBytesSelected / (1024 * 1024)).toFixed(1) + ' MB';
  }, [totalBytesSelected]);

  const filteredCandidates = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return candidates.filter((candidate) =>
      filterMatches(candidate, candidateFilter)
      && (!query || `${candidate.targetPath} ${candidate.reasons.join(' ')}`.toLowerCase().includes(query))
    );
  }, [candidates, candidateFilter, searchQuery]);

  const handleConfirmMigration = async () => {
    setIsExecuting(true);
    setExecutionError(null);
    setExecutionFeedback(false);
    try {
      const result = await onExecuteSafeCleanup(selectedCandidates);
      setExecutionSummary(result);
      setExecutionFeedback(true);
      setShowConfirmModal(false);
    } catch (error: unknown) {
      setExecutionError(
        error instanceof Error
          ? error.message
          : 'Cleanup could not be completed. Your files were not moved.'
      );
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExportReport = () => {
    const report = {
      reportType: 'ClutterScan cleanup review',
      exportedAt: new Date().toISOString(),
      explanation: 'Impact scores rank review priority; they are not confidence or accuracy estimates. Paths and evidence come from this scan.',
      candidateCount: candidates.length,
      candidates: candidates.map((candidate) => ({
        path: candidate.targetPath,
        bytes: candidate.bytes,
        impactScore: candidate.impactScore ?? null,
        selectionThreshold: candidate.selectionThreshold ?? null,
        selectedForReview: candidate.isSelected,
        evidence: candidate.reasons,
        scoreBreakdown: candidate.scoreBreakdown ?? [],
      })),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'clutterscan-cleanup-review.json';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <div className="w-full bg-[#080808] text-[#f5f5f5] font-sans flex flex-col gap-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#303030] pb-5 gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Cleanup Queue
            </h1>
            <span className="text-xs bg-white text-black font-semibold px-2 py-0.5 rounded-[2px] uppercase">
              Operator Approval Required
            </span>
          </div>
          <p className="text-base text-[#b8b8b8] max-w-2xl">
            Review files flagged for safe relocation to the Recycle Bin or local recovery vault. No files will be moved without your explicit confirmation.
          </p>
        </div>
        <div className="flex flex-col md:items-end gap-1 text-sm bg-[#141414] border border-[#303030] p-3 rounded-[2px]">
          <div className="text-white font-medium">
            Safe Staging &bull; Zero Direct Deletion
          </div>
          <div className="text-xs text-[#858585]">
            Moved files remain restorable via System Trash or History vault.
          </div>
        </div>
      </div>

      {/* METRICS SUMMARY BAR */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border border-[#303030] bg-[#141414] p-4 rounded-[2px] flex flex-col gap-1">
          <span className="text-xs text-[#858585] uppercase tracking-wider font-semibold">Recommended Items</span>
          <span className="text-2xl md:text-3xl font-bold font-mono text-white">{candidates.length}</span>
          <span className="text-xs text-[#b8b8b8]">Detected cleanup targets</span>
        </div>
        <div className="border border-[#303030] bg-[#141414] p-4 rounded-[2px] flex flex-col gap-1">
          <span className="text-xs text-[#858585] uppercase tracking-wider font-semibold">Selected For Move</span>
          <span className="text-2xl md:text-3xl font-bold font-mono text-white">{selectedCandidates.length}</span>
          <span className="text-xs text-[#b8b8b8]">Marked for relocation</span>
        </div>
        <div className="border border-[#303030] bg-[#141414] p-4 rounded-[2px] flex flex-col gap-1">
          <span className="text-xs text-[#858585] uppercase tracking-wider font-semibold">Reclaimable Storage</span>
          <span className="text-2xl md:text-3xl font-bold font-mono text-white">{formattedSelectedSize}</span>
          <span className="text-xs text-[#b8b8b8]">Storage space to free</span>
        </div>
        <div className="border border-[#303030] bg-[#141414] p-4 rounded-[2px] flex flex-col gap-1">
          <span className="text-xs text-[#858585] uppercase tracking-wider font-semibold">Destination</span>
          <span className="text-base md:text-lg font-bold text-white pt-1">Recycle Bin / Vault</span>
          <span className="text-xs text-[#858585]">Protected restore paths</span>
        </div>
      </div>

      {/* SEARCH AND FILTER TOOLBAR */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#303030] pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <label className="sr-only" htmlFor="candidate-search">Search cleanup suggestions</label>
            <input
              id="candidate-search"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search file paths or reasons..."
              className="min-w-0 sm:w-80 bg-[#141414] border border-[#303030] px-3.5 py-2.5 text-sm text-white placeholder:text-[#858585] rounded-[2px] focus:border-white focus:outline-none font-mono"
            />
            <label className="sr-only" htmlFor="candidate-filter">Filter suggestions</label>
            <select
              id="candidate-filter"
              value={candidateFilter}
              onChange={(event) => setCandidateFilter(event.target.value as CandidateFilter)}
              className="bg-[#141414] border border-[#303030] px-3.5 py-2.5 text-sm text-white rounded-[2px] focus:border-white focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="DUPLICATES">Exact Duplicates</option>
              <option value="TEMPORARY">Temporary / Cache Files</option>
              <option value="OLDER">Older Inactive Files</option>
              <option value="LARGE">Large Files (&gt; 10 MB)</option>
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-[#858585] font-mono">{filteredCandidates.length} of {candidates.length} items</span>
            <button
              type="button"
              onClick={() => onSelectCandidates(filteredCandidates.map((candidate) => candidate.id), true)}
              className="text-white font-semibold hover:underline cursor-pointer"
            >
              Select All
            </button>
            <span className="text-[#454545]">&bull;</span>
            <button
              type="button"
              onClick={() => onSelectCandidates(filteredCandidates.map((candidate) => candidate.id), false)}
              className="text-[#858585] hover:text-white cursor-pointer"
            >
              Clear All
            </button>
            <span className="text-[#454545]">&bull;</span>
            <button
              type="button"
              onClick={handleExportReport}
              disabled={candidates.length === 0}
              className="border border-[#303030] bg-[#141414] px-3.5 py-2 text-sm text-white hover:border-white rounded-[2px] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Export cleanup list as a JSON report"
            >
              Export Report
            </button>
          </div>
        </div>

        {candidates.length === 0 ? (
          <div className="w-full min-h-[300px] border border-[#303030] bg-[#141414] p-10 rounded-[2px] flex flex-col items-center justify-center gap-3 text-center">
            <div className="text-xl font-bold text-white tracking-tight">
              No Cleanup Suggestions Available
            </div>
            <div className="text-base text-[#b8b8b8] max-w-lg leading-relaxed">
              No files are currently queued for cleanup. You can stage duplicates, large files, or temporary artifacts from the Storage, Duplicates, or Files tabs.
            </div>
            <button
              type="button"
              onClick={() => onNavigate('storage')}
              className="mt-2 px-6 py-2.5 border border-white bg-white text-black font-semibold text-sm hover:bg-neutral-200 cursor-pointer rounded-[2px] transition-all"
            >
              Return to Storage Dashboard &rarr;
            </button>
          </div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredCandidates.map((card) => {
            const isSelected = card.isSelected;
            return (
              <article
                key={card.id}
                className={`border rounded-[2px] p-5 bg-[#141414] flex flex-col justify-between gap-4 transition-colors ${
                  isSelected ? 'border-white' : 'border-[#303030] hover:border-[#454545]'
                }`}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-[#303030] pb-2.5">
                    <span
                      className={`font-semibold uppercase text-xs tracking-wider ${
                        isSelected ? 'text-white' : 'text-[#b8b8b8]'
                      }`}
                    >
                      {card.rank === 'MANUALLY_SELECTED' ? 'Manually Queued' : card.rank}
                    </span>
                    <div className="flex items-center gap-3">
                      {typeof card.impactScore === 'number' && (
                        <span className="text-xs font-mono text-[#b8b8b8]">
                          Priority {card.impactScore}/100
                        </span>
                      )}
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        aria-label={`${isSelected ? 'Remove' : 'Add'} ${card.targetPath} ${isSelected ? 'from' : 'to'} cleanup review`}
                        onClick={() => onToggleCandidate(card.id)}
                        className={`min-h-9 border px-4 text-xs font-semibold uppercase rounded-[2px] cursor-pointer transition-colors ${
                          isSelected
                            ? 'border-white bg-white text-black'
                            : 'border-[#454545] text-white hover:border-white'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Select'}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="text-xs text-[#858585] uppercase font-semibold">Target File</div>
                    <div
                      className={`text-sm break-all bg-[#080808] p-3 border rounded-[2px] font-mono ${
                        isSelected ? 'border-white/50 text-white font-medium' : 'border-[#303030] text-[#b8b8b8]'
                      }`}
                    >
                      {card.targetPath}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="text-xs text-[#858585] uppercase font-semibold">Evidence &amp; Reasons</div>
                    <div className="flex flex-wrap gap-2">
                      {card.reasons.map((r, i) => (
                        <span
                          key={i}
                          className="border border-[#454545] bg-[#1b1b1b] px-2.5 py-1 text-xs text-[#f5f5f5] rounded-[2px]"
                        >
                          {readableReason(r)}
                        </span>
                      ))}
                    </div>

                    {typeof card.impactScore === 'number' && (
                      <div className="space-y-1.5 pt-1" aria-label={`Impact priority score ${card.impactScore} out of 100`}>
                        <div className="flex justify-between text-xs text-[#858585]">
                          <span>Review Priority Ranking</span>
                          <span className="font-mono text-white font-medium">{card.impactScore} / 100</span>
                        </div>
                        <div
                          role="meter"
                          aria-label="Review priority"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={card.impactScore}
                          className="h-2 border border-[#303030] bg-[#080808] rounded-[1px] overflow-hidden"
                        >
                          <div
                            className="h-full bg-white transition-[width] duration-200"
                            style={{ width: `${Math.max(0, Math.min(100, card.impactScore))}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <details className="border-t border-[#303030] pt-3">
                      <summary className="cursor-pointer text-xs font-semibold text-white hover:text-[#b8b8b8]">
                        Why was this file suggested?
                      </summary>
                      <div className="mt-3 space-y-3 text-xs">
                        {card.scoreBreakdown && card.scoreBreakdown.length > 0 ? (
                          <>
                            <div className="space-y-2">
                              {card.scoreBreakdown.map((factor) => (
                                <div key={factor.key} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1">
                                  <span className="text-white font-medium">{factor.label}</span>
                                  <span className={`font-mono ${factor.points < 0 ? 'text-[#e5ad55]' : 'text-white'}`}>
                                    {factor.points > 0 ? '+' : ''}{factor.points}
                                  </span>
                                  <span className="text-[#858585]">{factor.explanation}</span>
                                </div>
                              ))}
                            </div>
                            <p className="border-t border-[#303030] pt-2 text-[#858585]">
                              Files with priority &ge; {card.selectionThreshold ?? 60} are pre-selected for review. Always verify you don't need the file before moving.
                            </p>
                          </>
                        ) : (
                          <p className="text-[#858585]">
                            {card.rank === 'MANUALLY_SELECTED'
                              ? 'You selected this file manually from another screen.'
                              : 'Standard priority score applied.'}
                          </p>
                        )}
                      </div>
                    </details>
                  </div>
                </div>

                <div
                  className={`flex items-center justify-between pt-3 border-t text-sm ${
                    isSelected ? 'border-[#454545]' : 'border-[#303030]'
                  }`}
                >
                  <div className="text-xs text-[#858585]">
                    Size: <span className="text-white font-mono font-bold text-sm ml-1">{card.recoverableFormatted}</span>
                  </div>
                  <div
                    className={`text-xs font-semibold uppercase ${
                      isSelected ? 'text-[#57B887]' : 'text-[#858585]'
                    }`}
                  >
                    {isSelected ? '✓ Marked for Cleanup' : 'Unselected'}
                  </div>
                </div>
              </article>
            );
          })}
          {filteredCandidates.length === 0 && (
            <div className="border border-[#303030] bg-[#141414] p-8 text-center text-sm text-[#858585] rounded-[2px]" role="status">
              No suggestions match this search or filter. Try clearing the search or choosing “All Categories.”
            </div>
          )}
        </div>
        )}
      </div>

      {/* ACTION / AUTHORIZATION BLOCK */}
      <div className="border border-[#303030] p-6 bg-[#141414] rounded-[2px] flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#303030] pb-3 gap-2">
          <div className="text-base font-bold text-white tracking-tight">
            Cleanup Execution Confirmation
          </div>
          <div className="text-xs text-white border border-white px-2.5 py-1 rounded-[2px] font-semibold uppercase">
            Explicit User Authorization Required
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
          <div className="flex flex-col gap-1 border-l-2 border-white pl-4">
            <span className="text-xs text-[#858585] uppercase font-semibold">
              Selected For Move:
            </span>
            <span className="text-white font-bold text-xl font-mono">
              {selectedCandidates.length} Files &bull; {formattedSelectedSize}
            </span>
            <span className="text-xs text-[#858585]">
              Files remain intact on disk until you explicitly confirm the action.
            </span>
          </div>

          <div className="flex flex-col gap-1 border-l-2 border-[#454545] pl-4">
            <span className="text-xs text-[#858585] uppercase font-semibold">Safety Routing Target:</span>
            <span className="text-white font-bold text-base">
              System Recycle Bin (or encrypted local recovery vault if Bin unavailable)
            </span>
            <span className="text-xs text-[#858585]">
              Can be restored through Windows Recycle Bin or ClutterScan History.
            </span>
          </div>
        </div>

        <div className="pt-4 flex flex-col items-stretch sm:items-start gap-2 border-t border-[#303030]">
          <button
            type="button"
            disabled={selectedCandidates.length === 0 || isExecuting}
            onClick={() => {
              setExecutionError(null);
              setShowConfirmModal(true);
            }}
            className="bg-white text-black font-bold text-base px-8 py-3 rounded-[2px] hover:bg-neutral-200 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Review &amp; Confirm Safe Move ({selectedCandidates.length} Items)
          </button>
          <span className="text-xs text-[#858585]">
            Selected files are safely relocated, never permanently destroyed without recovery access.
          </span>
        </div>

        {/* EXECUTION FEEDBACK BOX */}
        {executionFeedback && (
          <div
            className={`border p-5 bg-[#141414] rounded-[2px] flex flex-col gap-2 text-sm text-white ${
              (executionSummary?.movedCount ?? 0) > 0 ? 'border-[#57B887]' : 'border-[#e5ad55]'
            }`}
            role="status"
          >
            <div
              className={`flex items-center justify-between font-bold text-base ${
                (executionSummary?.movedCount ?? 0) > 0 ? 'text-[#57B887]' : 'text-[#e5ad55]'
              }`}
            >
              <span>
                {(executionSummary?.movedCount ?? 0) > 0
                  ? '✓ Cleanup Completed'
                  : '⚠ Files Could Not Be Moved'}
              </span>
            </div>
            <div className="text-[#b8b8b8] leading-relaxed text-sm">
              {(executionSummary?.movedCount ?? 0) > 0 ? (
                <>
                  {executionSummary?.movedCount} files moved safely to recovery storage (Windows Recycle Bin / Local Vault).
                  {(executionSummary?.failedCount ?? 0) > 0 &&
                    ` ${executionSummary?.failedCount} files could not be accessed or were already moved.`}
                </>
              ) : (
                <>
                  {executionSummary?.failedCount ?? 0} files could not be moved because they no longer exist at their original paths on disk (e.g. if already organized, moved, or deleted). Please run a fresh scan on the Scan tab to refresh the file paths.
                </>
              )}
            </div>
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('history')}
                className="px-5 py-2 border border-white bg-white text-black font-semibold text-sm rounded-[2px] hover:bg-neutral-200 cursor-pointer"
              >
                View History &amp; Recovery Journal &rarr;
              </button>
              {(executionSummary?.movedCount ?? 0) === 0 && (
                <button
                  type="button"
                  onClick={() => onNavigate('home')}
                  className="px-5 py-2 border border-[#454545] text-white hover:border-white text-sm font-semibold rounded-[2px] cursor-pointer"
                >
                  Run Fresh Scan &rarr;
                </button>
              )}
            </div>
          </div>
        )}
        {executionError && (
          <div className="border border-[#F06464] bg-[#141414] p-4 text-sm text-[#F06464] rounded-[2px]" role="alert">
            Cleanup could not be completed: {executionError}
          </div>
        )}
      </div>

      {/* CONFIRMATION MODAL */}
      {showConfirmModal && (
        <CleanupModal
          selectedCandidates={selectedCandidates}
          totalFormatted={formattedSelectedSize}
          onCancel={() => setShowConfirmModal(false)}
          onConfirm={() => { void handleConfirmMigration(); }}
          isProcessing={isExecuting}
          errorMessage={executionError}
        />
      )}
    </div>
  );
};
