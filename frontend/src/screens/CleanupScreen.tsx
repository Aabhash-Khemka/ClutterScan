import React, { useState, useMemo } from 'react';
import { NavTab, CleanupCandidateRecord } from '../types';
import { CleanupModal } from '../components/CleanupModal';
import type { CleanupExecutionSummary } from '../types';
import {
  Trash2,
  ShieldCheck,
  Download,
  ArrowRight,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  Info
} from 'lucide-react';

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
  if (reason === 'EXACT_DUPLICATE') return 'Identical duplicate found elsewhere';
  if (reason === 'LOWER_RESOLUTION') return 'Lower resolution version of another image';
  if (reason === 'TEMPORARY_ARTIFACT') return 'Temporary build artifact or cache file';
  if (reason === 'HIGH_STORAGE_IMPACT') return 'Large storage impact (>= 100 MB)';
  if (reason === 'MODERATE_STORAGE_IMPACT') return 'Moderate storage impact (>= 10 MB)';
  if (reason === 'RECENTLY_MODIFIED') return 'Recently modified file';
  const ageMatch = reason.match(/^UNRESOLVED_INODE_AGE\s*>\s*(\d+)D$/i);
  if (ageMatch) return `Untouched for ${ageMatch[1]}+ days`;
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
    <div className="w-full flex flex-col gap-6 text-[#172033] pb-12">
      {/* HEADER SECTION */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-[#172033] tracking-tight">
              Cleanup Queue
            </h1>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#EEF2FF] text-[#5B5CE2] border border-[#C7D2FE]">
              Safe Staging
            </span>
          </div>
          <p className="text-sm md:text-base text-[#64748B]">
            Review files staged for safe relocation. No files will be moved without your explicit confirmation.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#F0FDF4] border border-[#BBF7D0] px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#15803D]">
          <ShieldCheck size={16} className="text-[#16A34A]" />
          <span>Zero Permanent Loss • 1-Click Recovery Vault</span>
        </div>
      </section>

      {/* METRICS SUMMARY CARDS */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
          <div className="text-xs font-medium uppercase tracking-wider text-[#64748B]">Suggested Items</div>
          <div className="text-2xl lg:text-3xl font-bold text-[#172033] mt-1.5">{candidates.length}</div>
          <div className="text-xs text-[#94A3B8] mt-1">Total candidate items</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
          <div className="text-xs font-medium uppercase tracking-wider text-[#64748B]">Selected For Move</div>
          <div className="text-2xl lg:text-3xl font-bold text-[#5B5CE2] mt-1.5">{selectedCandidates.length}</div>
          <div className="text-xs text-[#94A3B8] mt-1">Staged by operator</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
          <div className="text-xs font-medium uppercase tracking-wider text-[#64748B]">Reclaimable Storage</div>
          <div className="text-2xl lg:text-3xl font-bold text-[#15803D] mt-1.5">{formattedSelectedSize}</div>
          <div className="text-xs text-[#94A3B8] mt-1">Storage space to recover</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
          <div className="text-xs font-medium uppercase tracking-wider text-[#64748B]">Destination</div>
          <div className="text-xl lg:text-2xl font-bold text-[#172033] mt-1.5">Recycle Bin / Vault</div>
          <div className="text-xs text-[#94A3B8] mt-1">Lossless restore guaranteed</div>
        </div>
      </section>

      {/* SEARCH & FILTERS BAR */}
      <section className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1 sm:flex-initial">
            <Search size={15} className="absolute left-3.5 top-3 text-[#94A3B8]" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search file paths or reasons..."
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] pl-10 pr-3.5 py-2 text-xs text-[#172033] placeholder:text-[#94A3B8] rounded-lg focus:border-[#5B5CE2] focus:bg-white outline-none"
            />
          </div>

          <select
            value={candidateFilter}
            onChange={(e) => setCandidateFilter(e.target.value as CandidateFilter)}
            className="bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-2 text-xs text-[#172033] rounded-lg focus:border-[#5B5CE2] outline-none cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            <option value="DUPLICATES">Exact Duplicates</option>
            <option value="TEMPORARY">Temporary / Cache Files</option>
            <option value="OLDER">Older Inactive Files</option>
            <option value="LARGE">Large Files (&gt; 10 MB)</option>
          </select>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-[#64748B]">{filteredCandidates.length} of {candidates.length} items</span>
          <button
            type="button"
            onClick={() => onSelectCandidates(filteredCandidates.map((c) => c.id), true)}
            className="text-[#5B5CE2] font-semibold hover:underline cursor-pointer"
          >
            Select All
          </button>
          <span className="text-[#CBD5E1]">•</span>
          <button
            type="button"
            onClick={() => onSelectCandidates(filteredCandidates.map((c) => c.id), false)}
            className="text-[#64748B] hover:text-[#172033] cursor-pointer"
          >
            Clear All
          </button>
          <span className="text-[#CBD5E1]">•</span>
          <button
            type="button"
            onClick={handleExportReport}
            disabled={candidates.length === 0}
            className="border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-[#334155] px-3 py-1.5 rounded-lg font-medium cursor-pointer transition-colors shadow-xs"
          >
            Export JSON
          </button>
        </div>
      </section>

      {/* CANDIDATES GRID */}
      {candidates.length === 0 ? (
        <div className="w-full bg-white border border-[#E2E8F0] rounded-xl p-12 flex flex-col items-center justify-center text-center shadow-xs">
          <div className="w-14 h-14 bg-[#EEF2FF] text-[#5B5CE2] rounded-2xl flex items-center justify-center mb-4">
            <Trash2 size={28} />
          </div>
          <h2 className="text-xl font-bold text-[#172033] tracking-tight">
            Cleanup Queue is Empty
          </h2>
          <p className="text-sm text-[#64748B] max-w-md mt-1 mb-6">
            No items are queued for review. You can stage duplicates, old files, or temporary artifacts from their respective pages.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('duplicates')}
            className="px-5 py-2.5 bg-[#5B5CE2] hover:bg-[#4849C7] text-white text-sm font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            Review Duplicate Files
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredCandidates.map((card) => {
            const isSelected = card.isSelected;

            return (
              <article
                key={card.id}
                className={`bg-white border rounded-xl p-5 shadow-xs flex flex-col justify-between gap-4 transition-all ${
                  isSelected ? 'border-[#5B5CE2] ring-1 ring-[#5B5CE2]' : 'border-[#E2E8F0]'
                }`}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
                    <span className="font-semibold text-xs text-[#64748B] uppercase tracking-wider">
                      {card.rank === 'MANUALLY_SELECTED' ? 'Manually Queued' : card.rank}
                    </span>

                    <div className="flex items-center gap-3">
                      {typeof card.impactScore === 'number' && (
                        <span className="text-xs font-semibold text-[#5B5CE2]">
                          Priority {card.impactScore}/100
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => onToggleCandidate(card.id)}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg cursor-pointer transition-colors shadow-xs ${
                          isSelected
                            ? 'bg-[#5B5CE2] text-white'
                            : 'border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-[#334155]'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Select'}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-[#64748B] font-medium">Target File</span>
                    <div className="text-xs break-all bg-[#F8FAFC] p-2.5 border border-[#E2E8F0] rounded-lg text-[#172033]">
                      {card.targetPath}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs text-[#64748B] font-medium">Reasons &amp; Evidence</span>
                    <div className="flex flex-wrap gap-1.5">
                      {card.reasons.map((r, i) => (
                        <span
                          key={i}
                          className="bg-[#F1F5F9] border border-[#E2E8F0] px-2.5 py-1 text-xs text-[#475569] rounded-md font-medium"
                        >
                          {readableReason(r)}
                        </span>
                      ))}
                    </div>

                    {typeof card.impactScore === 'number' && (
                      <div className="space-y-1 pt-1.5">
                        <div className="flex justify-between text-[11px] text-[#64748B]">
                          <span>Priority Ranking</span>
                          <span className="font-semibold text-[#172033]">{card.impactScore} / 100</span>
                        </div>
                        <div className="h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#5B5CE2] rounded-full transition-all"
                            style={{ width: `${Math.max(0, Math.min(100, card.impactScore))}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#F1F5F9] text-xs">
                  <div className="text-[#64748B]">
                    Size: <strong className="text-[#172033] font-semibold ml-1">{card.recoverableFormatted}</strong>
                  </div>
                  <span
                    className={`font-semibold ${
                      isSelected ? 'text-[#15803D]' : 'text-[#94A3B8]'
                    }`}
                  >
                    {isSelected ? '✓ Marked for Safe Cleanup' : 'Unselected'}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* CONFIRMATION ACTION BOX */}
      <section className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E2E8F0] pb-3 gap-2">
          <div>
            <h3 className="text-base font-bold text-[#172033]">
              Execute Safe Cleanup Migration
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Files remain intact on disk until you authorize the relocation.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#DCFCE7] text-[#15803D] self-start sm:self-auto">
            Lossless Recovery Vault
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]">
            <span className="text-[#64748B] block font-medium mb-1">Selected For Move:</span>
            <span className="text-lg font-bold text-[#172033]">
              {selectedCandidates.length} Files • {formattedSelectedSize}
            </span>
          </div>

          <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]">
            <span className="text-[#64748B] block font-medium mb-1">Safety Recovery Route:</span>
            <span className="text-xs font-semibold text-[#172033] block">
              Windows Recycle Bin (or ClutterScan local recovery vault)
            </span>
            <span className="text-[#64748B] mt-0.5 block">
              Can be restored anytime in 1 click from the Scan History tab.
            </span>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            type="button"
            disabled={selectedCandidates.length === 0 || isExecuting}
            onClick={() => {
              setExecutionError(null);
              setShowConfirmModal(true);
            }}
            className="bg-[#5B5CE2] hover:bg-[#4849C7] text-white font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors cursor-pointer disabled:opacity-40 shadow-xs"
          >
            Review &amp; Confirm Safe Move ({selectedCandidates.length} Items)
          </button>
        </div>

        {/* FEEDBACK BANNER */}
        {executionFeedback && (
          <div className="bg-[#F0FDF4] border border-[#86EFAC] rounded-xl p-4 text-xs text-[#166534] flex flex-col gap-2 shadow-xs">
            <div className="flex items-center gap-2 font-bold text-sm">
              <CheckCircle2 size={18} className="text-[#16A34A]" />
              <span>Cleanup Completed Successfully!</span>
            </div>
            <p className="text-xs text-[#15803D]">
              {executionSummary?.movedCount ?? 0} files moved safely to recovery storage. {executionSummary?.failedCount ?? 0} files could not be accessed.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => onNavigate('history')}
                className="px-4 py-1.5 border border-[#15803D] bg-white text-[#15803D] font-semibold text-xs rounded-md hover:bg-[#15803D] hover:text-white transition-colors cursor-pointer"
              >
                View History &amp; Recovery Journal &rarr;
              </button>
            </div>
          </div>
        )}

        {executionError && (
          <div className="p-3 border border-[#FCA5A5] bg-[#FEF2F2] text-[#DC2626] rounded-lg text-xs" role="alert">
            {executionError}
          </div>
        )}
      </section>

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
