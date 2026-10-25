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
    <div className="w-full bg-[#000000] text-white font-mono text-xs flex flex-col gap-6">
      {/* SUB-NAV / BREADCRUMB METADATA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#303030] pb-3 gap-2 text-[11px] text-[#858585]">
        <div>DISPATCH // FORENSIC_TRIAGE_PIPELINE // STAGE_06</div>
        <div className="text-white font-bold">[SUBSYSTEM_VER: 4.19.0-CLR]</div>
      </div>

      {/* CORE INVIOLABLE SAFETY BANNER */}
      <div className="border border-white p-4 bg-black flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <span className="text-xs px-2 py-1 bg-white text-black font-bold tracking-widest uppercase">
            CORE RULE
          </span>
          <div className="text-sm sm:text-base font-bold text-white tracking-widest uppercase">
            A SUGGESTION IS NOT A DELETION
          </div>
        </div>
        <div className="text-[11px] text-[#b0b0b0] tracking-wider uppercase border border-[#484848] px-3 py-1">
          Scores rank review priority; inspect the evidence before confirming.
        </div>
      </div>

      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between border-b border-[#303030] pb-4 gap-4">
        <div className="flex flex-col gap-1">
          <div className="text-[11px] text-[#858585] uppercase tracking-widest">
            // ROUTING_DIRECTIVE_STAGING
          </div>
          <div className="text-lg md:text-2xl font-bold text-white tracking-widest uppercase">
            [EXECUTION_QUEUE]
          </div>
          <div className="text-xs text-[#b0b0b0] uppercase tracking-wider">
            USER AUDIT &amp; APPROVAL // SAFE RECOVERY ROUTING
          </div>
        </div>
        <div className="flex flex-col lg:items-end gap-1 text-[11px]">
          <div className="text-white tracking-widest uppercase font-bold">
            Nothing moves until you confirm.
          </div>
          <div className="text-[#858585] tracking-wider">
            System Trash when available; otherwise ClutterScan's local recovery vault.
          </div>
        </div>
      </div>

      {/* SUMMARY BAR */}
      <div className="border border-[#303030] p-4 bg-[#0b0b0b] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="flex flex-col gap-0.5 border-l border-[#303030] pl-3 sm:border-l-0 sm:pl-0">
          <span className="text-[#858585] text-[10px] uppercase">
            CANDIDATE RECOMMENDATIONS
          </span>
          <span className="text-white font-bold text-base md:text-lg">{candidates.length} RECORDS</span>
        </div>
        <div className="flex flex-col gap-0.5 border-l border-[#303030] pl-3">
          <span className="text-[#858585] text-[10px] uppercase">
            CURRENTLY SELECTED
          </span>
          <span className="text-white font-bold text-base md:text-lg">
            {selectedCandidates.length} FILES
          </span>
        </div>
        <div className="flex flex-col gap-0.5 border-l border-[#303030] pl-3">
          <span className="text-[#858585] text-[10px] uppercase">
            ESTIMATED RECOVERY
          </span>
          <span className="text-white font-bold text-base md:text-lg">
            {formattedSelectedSize}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 border-l border-[#303030] pl-3">
          <span className="text-[#858585] text-[10px] uppercase">DESTINATION</span>
          <span className="text-white font-bold text-sm md:text-base">
            SYSTEM TRASH / LOCAL VAULT
          </span>
        </div>
      </div>

      {/* FORENSIC CANDIDATE CARDS GRID */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#303030] pb-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <label className="sr-only" htmlFor="candidate-search">Search cleanup suggestions</label>
            <input
              id="candidate-search"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search paths or evidence…"
              className="min-w-0 sm:w-80 bg-black border border-[#484848] px-3 py-2 text-xs text-white placeholder:text-[#858585] focus:border-white focus:outline-none"
            />
            <label className="sr-only" htmlFor="candidate-filter">Filter suggestions</label>
            <select
              id="candidate-filter"
              value={candidateFilter}
              onChange={(event) => setCandidateFilter(event.target.value as CandidateFilter)}
              className="bg-black border border-[#484848] px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
            >
              <option value="ALL">All evidence</option>
              <option value="DUPLICATES">Exact duplicates</option>
              <option value="TEMPORARY">Temporary-file evidence</option>
              <option value="OLDER">Older files</option>
              <option value="LARGE">Storage impact</option>
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            <span className="text-[#858585]">{filteredCandidates.length} OF {candidates.length} SUGGESTIONS</span>
            <button
              type="button"
              onClick={() => onSelectCandidates(filteredCandidates.map((candidate) => candidate.id), true)}
              className="text-white font-bold hover:underline cursor-pointer"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={() => onSelectCandidates(filteredCandidates.map((candidate) => candidate.id), false)}
              className="text-[#858585] hover:text-white cursor-pointer"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={handleExportReport}
              disabled={candidates.length === 0}
              className="border border-[#484848] px-3 py-2 text-white hover:border-white disabled:opacity-40 disabled:cursor-not-allowed"
              title="The report includes file paths and scan evidence."
            >
              Export report
            </button>
          </div>
        </div>

        <p className="text-[11px] text-[#858585]">
          Impact scores are a 0–100 review-priority ranking, not confidence or accuracy. Selection never moves a file; only confirmation does.
        </p>

        {candidates.length === 0 ? (
          <div className="w-full min-h-[300px] border border-[#303030] bg-[#0b0b0b] p-8 flex flex-col items-center justify-center gap-3 text-center">
            <div className="text-base font-bold text-white tracking-widest uppercase">
              No cleanup suggestions yet
            </div>
            <div className="text-xs text-[#858585] max-w-lg leading-relaxed uppercase">
              A completed scan with cleanup evidence will show suggestions here. Run a scan or review another results section.
            </div>
            <button
              type="button"
              onClick={() => onNavigate('storage')}
              className="mt-2 px-6 py-2 border border-white bg-white text-black font-bold uppercase transition-none hover:bg-neutral-200 cursor-pointer"
            >
              → RETURN TO STORAGE
            </button>
          </div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredCandidates.map((card) => {
            const isSelected = card.isSelected;
            return (
              <article
                key={card.id}
                className={`border p-5 bg-black flex flex-col justify-between gap-4 transition-colors duration-150 ${
                  isSelected ? 'border-white' : 'border-[#1f1f1f] hover:border-[#444748]'
                }`}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-2">
                    <span
                      className={`font-bold tracking-widest uppercase text-xs ${
                        isSelected ? 'text-white' : 'text-[#c4c7c8]'
                      }`}
                    >
                      {card.rank === 'MANUALLY_SELECTED' ? 'MANUALLY SELECTED' : card.rank}
                    </span>
                    <div className="flex items-center gap-3">
                      {typeof card.impactScore === 'number' && (
                        <span className="text-[10px] tracking-wider text-[#c4c7c8]">
                          Priority {card.impactScore}/100
                        </span>
                      )}
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        aria-label={`${isSelected ? 'Remove' : 'Add'} ${card.targetPath} ${isSelected ? 'from' : 'to'} cleanup review`}
                        onClick={() => onToggleCandidate(card.id)}
                        className={`min-h-9 border px-3 text-[10px] uppercase font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                          isSelected ? 'border-white bg-white text-black' : 'border-[#444748] text-white hover:border-white'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Select'}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="text-[10px] text-[#8e9192] uppercase">TARGET PATH:</div>
                    <div
                      className={`text-xs break-all bg-[#131313] p-2 border border-[#1f1f1f] ${
                        isSelected ? 'text-white font-bold' : 'text-[#c4c7c8]'
                      }`}
                    >
                      {card.targetPath}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="text-[10px] text-[#8e9192] uppercase">REASONS:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {card.reasons.map((r, i) => (
                        <span
                          key={i}
                          className="border border-[#444748] px-1.5 py-0.5 text-[10px] text-[#e2e2e2] uppercase"
                        >
                          {readableReason(r)}
                        </span>
                      ))}
                    </div>

                    {typeof card.impactScore === 'number' && (
                      <div className="space-y-1.5" aria-label={`Impact priority score ${card.impactScore} out of 100`}>
                        <div className="flex justify-between text-[10px] text-[#8e9192]">
                          <span>REVIEW PRIORITY</span>
                          <span>{card.impactScore} / 100</span>
                        </div>
                        <div
                          role="meter"
                          aria-label="Review priority"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={card.impactScore}
                          className="h-2 border border-[#444748] bg-[#131313]"
                        >
                          <div
                            className="h-full bg-white transition-[width] duration-200"
                            style={{ width: `${Math.max(0, Math.min(100, card.impactScore))}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <details className="border-t border-[#1f1f1f] pt-3">
                      <summary className="cursor-pointer text-xs font-bold text-white hover:text-[#c4c7c8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
                        Why was this suggested?
                      </summary>
                      <div className="mt-3 space-y-3 text-[11px]">
                        {card.scoreBreakdown && card.scoreBreakdown.length > 0 ? (
                          <>
                            <div className="space-y-2">
                              {card.scoreBreakdown.map((factor) => (
                                <div key={factor.key} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1">
                                  <span className="text-white">{factor.label}</span>
                                  <span className={factor.points < 0 ? 'text-[#c4c7c8]' : 'text-white'}>
                                    {factor.points > 0 ? '+' : ''}{factor.points}
                                  </span>
                                  <span className="text-[#8e9192]">{factor.explanation}</span>
                                  <span className="sr-only">score contribution</span>
                                  <div
                                    role="meter"
                                    aria-label={`${factor.label} score contribution`}
                                    aria-valuemin={-100}
                                    aria-valuemax={100}
                                    aria-valuenow={factor.points}
                                    className="col-span-2 h-1.5 bg-[#1f1f1f]"
                                  >
                                    <div
                                      className={`h-full ${factor.points < 0 ? 'bg-[#8e9192]' : 'bg-white'}`}
                                      style={{ width: `${Math.min(100, Math.abs(factor.points))}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                            <p className="border-t border-[#1f1f1f] pt-2 text-[#c4c7c8]">
                              Calculation: {card.scoreBreakdown.map((factor) => factor.points).join(' + ')} = {card.scoreBeforeClamp ?? card.scoreBreakdown.reduce((sum, factor) => sum + factor.points, 0)}; clamped to 0–100 = {card.impactScore}.
                            </p>
                            <p className="text-[#8e9192]">
                              Scores at or above {card.selectionThreshold ?? 60} are selected by default. This ranks review priority; it is not a confidence estimate. Review the path and keep anything you still need.
                            </p>
                          </>
                        ) : (
                          <p className="text-[#8e9192]">
                            {card.rank === 'MANUALLY_SELECTED'
                              ? 'You selected this file manually. No algorithmic impact score was generated.'
                              : 'A detailed point breakdown was not recorded for this saved result. The listed evidence is available, but the score calculation cannot be reconstructed.'}
                          </p>
                        )}
                        <p className="text-[#c4c7c8]">
                          Next step: confirm that this is the file you want to move. Scanning and selection do not change files.
                        </p>
                      </div>
                    </details>
                  </div>
                </div>

                <div
                  className={`flex items-center justify-between pt-3 border-t text-xs ${
                    isSelected ? 'border-[#444748]' : 'border-[#1f1f1f]'
                  }`}
                >
                  <div className="text-[#8e9192] text-[11px] uppercase">
                    RECOVERABLE:{' '}
                    <span className="text-white font-bold">{card.recoverableFormatted}</span>
                  </div>
                  <div
                    className={`text-[11px] tracking-widest uppercase ${
                      isSelected ? 'text-white font-bold' : 'text-[#8e9192]'
                    }`}
                  >
                    {isSelected ? 'Selected for review' : 'Not selected'}
                  </div>
                </div>
              </article>
            );
          })}
          {filteredCandidates.length === 0 && (
            <div className="border border-[#1f1f1f] bg-black p-8 text-center text-sm text-[#8e9192]" role="status">
              No suggestions match this search and filter. Try clearing the search or choosing “All evidence.”
            </div>
          )}
        </div>
        )}
      </div>

      {/* ACTION / AUTHORIZATION BLOCK */}
      <div className="border border-[#484848] p-5 bg-black flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#303030] pb-3 gap-2">
          <div className="text-sm font-bold text-white tracking-widest uppercase">
            [CLEANUP_AUTHORIZATION]
          </div>
          <div className="text-[11px] text-white tracking-widest uppercase border border-white px-2 py-0.5">
            REQUIREMENT: EXPLICIT_OPERATOR_SIGN_OFF
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="flex flex-col gap-1 border-l-2 border-white pl-4">
            <span className="text-[#858585] uppercase text-[10px]">
              SELECTED FOR REVIEW:
            </span>
            <span className="text-white font-bold text-base md:text-lg">
              {selectedCandidates.length} FILES // {formattedSelectedSize}
            </span>
            <span className="text-[#858585] text-[11px] uppercase">
              Files remain on disk until you confirm the move.
            </span>
          </div>

          <div className="flex flex-col gap-1 border-l-2 border-[#484848] pl-4">
            <span className="text-[#858585] uppercase text-[10px]">OPERATION TARGET:</span>
            <span className="text-white font-bold text-base md:text-lg">
              System Trash, or local recovery vault if Trash is unavailable
            </span>
            <span className="text-[#858585] text-[11px] uppercase">
              Restore from system Trash or ClutterScan History, depending on destination.
            </span>
          </div>
        </div>

        <div className="pt-3 flex flex-col items-stretch sm:items-start gap-2 border-t border-[#303030]">
          <button
            type="button"
            disabled={selectedCandidates.length === 0 || isExecuting}
            onClick={() => {
              setExecutionError(null);
              setShowConfirmModal(true);
            }}
            className="bg-white text-black font-bold text-sm px-8 py-3.5 border border-white tracking-widest uppercase hover:bg-neutral-200 transition-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Review and confirm move
          </button>
          <span className="text-[10px] text-[#858585] uppercase tracking-wider">
            Selected files may move to system Trash or the local recovery vault.
          </span>
        </div>

        {/* EXECUTION FEEDBACK BOX */}
        {executionFeedback && (
          <div className="border border-white p-4 bg-[#0b0b0b] flex flex-col gap-2 text-xs text-white" role="status">
            <div className="flex items-center justify-between font-bold">
              <span className="tracking-widest uppercase">Cleanup request completed</span>
            </div>
            <div className="text-[#b0b0b0] uppercase leading-relaxed text-[11px]">
              {executionSummary?.movedCount ?? 0} files moved. {executionSummary?.failedCount ?? 0} files could not be moved and remain in place. Review the recovery history for item outcomes.
            </div>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => onNavigate('history')}
                className="px-4 py-1.5 border border-white bg-white text-black font-bold uppercase transition-none hover:bg-neutral-200 cursor-pointer"
              >
                → VIEW RESTORATION JOURNAL IN /HISTORY
              </button>
            </div>
          </div>
        )}
        {executionError && (
          <div className="border border-[#c90000] p-3 text-sm text-white" role="alert">
            Cleanup was not completed: {executionError}
          </div>
        )}
      </div>

      {/* SAFETY PROTOCOL VERIFICATION BOX */}
      <div className="border border-[#484848] p-5 bg-black flex flex-col gap-2 text-xs">
        <div className="font-bold text-white tracking-widest uppercase border-b border-[#303030] pb-2 flex items-center justify-between">
          <span>Before you confirm</span>
        </div>
        <div className="flex flex-col gap-1.5 text-[#b0b0b0] leading-relaxed pt-1 text-[11px]">
          <div>Review file paths and evidence. Your selection alone does not change files.</div>
          <div>Confirmed files go to system Trash when available, otherwise the local recovery vault.</div>
          <div>Files in system Trash must be restored through your operating system. Vault items can be restored from History.</div>
        </div>
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
