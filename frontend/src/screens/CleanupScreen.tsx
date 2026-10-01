import React, { useState, useMemo } from 'react';
import { NavTab, CleanupCandidateRecord } from '../types';
import { CleanupModal } from '../components/CleanupModal';

interface CleanupScreenProps {
  onNavigate: (tab: NavTab) => void;
  candidates: CleanupCandidateRecord[];
  onToggleCandidate: (id: string) => void;
  onSelectAllCandidates: (selectAll: boolean) => void;
  onExecuteSafeCleanup: (selectedRecords: CleanupCandidateRecord[]) => void;
}

export const CleanupScreen: React.FC<CleanupScreenProps> = ({
  onNavigate,
  candidates,
  onToggleCandidate,
  onSelectAllCandidates,
  onExecuteSafeCleanup,
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [executionFeedback, setExecutionFeedback] = useState<boolean>(false);

  const selectedCandidates = useMemo(
    () => candidates.filter((c) => c.isSelected),
    [candidates]
  );

  const totalBytesSelected = useMemo(
    () => selectedCandidates.reduce((acc, curr) => acc + curr.bytes, 0),
    [selectedCandidates]
  );

  const formattedSelectedSize = useMemo(() => {
    if (totalBytesSelected >= 1024 * 1024 * 1024) {
      return (totalBytesSelected / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }
    return (totalBytesSelected / (1024 * 1024)).toFixed(1) + ' MB';
  }, [totalBytesSelected]);

  const handleConfirmMigration = () => {
    setShowConfirmModal(false);
    setExecutionFeedback(true);
    onExecuteSafeCleanup(selectedCandidates);
  };

  return (
    <div className="w-full bg-[#0e0e0e] text-white font-mono text-xs flex flex-col gap-6">
      {/* SUB-NAV / BREADCRUMB METADATA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1f1f1f] pb-3 gap-2 text-[11px] text-[#8e9192]">
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
            DETECTION ≠ RECOMMENDATION ≠ DELETION
          </div>
        </div>
        <div className="text-[11px] text-[#c4c7c8] tracking-wider uppercase border border-[#444748] px-3 py-1">
          BYPASS_PROTECTION: ACTIVE [0x00_HARD_LOCK]
        </div>
      </div>

      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between border-b border-[#1f1f1f] pb-4 gap-4">
        <div className="flex flex-col gap-1">
          <div className="text-[11px] text-[#8e9192] uppercase tracking-widest">
            // ROUTING_DIRECTIVE_STAGING
          </div>
          <div className="text-lg md:text-2xl font-bold text-white tracking-widest uppercase">
            [EXECUTION_QUEUE]
          </div>
          <div className="text-xs text-[#c4c7c8] uppercase tracking-wider">
            USER AUDIT &amp; APPROVAL // SAFE RECOVERY ROUTING
          </div>
        </div>
        <div className="flex flex-col lg:items-end gap-1 text-[11px]">
          <div className="text-white tracking-widest uppercase font-bold">
            SAFETY_ENFORCEMENT: ZERO_DIRECT_PURGE
          </div>
          <div className="text-[#8e9192] tracking-widest uppercase">
            OS_RECYCLE_BIN: MANDATORY [REVOKABLE]
          </div>
        </div>
      </div>

      {/* SUMMARY BAR */}
      <div className="border border-[#1f1f1f] p-4 bg-black grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="flex flex-col gap-0.5 border-l border-[#1f1f1f] pl-3 sm:border-l-0 sm:pl-0">
          <span className="text-[#8e9192] text-[10px] uppercase">
            CANDIDATE RECOMMENDATIONS
          </span>
          <span className="text-white font-bold text-base md:text-lg">24 RECORDS</span>
        </div>
        <div className="flex flex-col gap-0.5 border-l border-[#1f1f1f] pl-3">
          <span className="text-[#8e9192] text-[10px] uppercase">
            CURRENTLY SELECTED
          </span>
          <span className="text-white font-bold text-base md:text-lg">
            {selectedCandidates.length} FILES
          </span>
        </div>
        <div className="flex flex-col gap-0.5 border-l border-[#1f1f1f] pl-3">
          <span className="text-[#8e9192] text-[10px] uppercase">
            ESTIMATED RECOVERY
          </span>
          <span className="text-white font-bold text-base md:text-lg">
            {formattedSelectedSize}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 border-l border-[#1f1f1f] pl-3">
          <span className="text-[#8e9192] text-[10px] uppercase">DESTRUCTION RISK</span>
          <span className="text-white font-bold text-base md:text-lg">
            0.00% (REVERSIBLE)
          </span>
        </div>
      </div>

      {/* FORENSIC CANDIDATE CARDS GRID */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between text-[11px] text-[#8e9192] uppercase border-b border-[#1f1f1f] pb-2">
          <span>// RANKED_FORENSIC_CANDIDATES [METRIC: RECLAIMABLE_FOOTPRINT]</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onSelectAllCandidates(true)}
              className="text-white font-bold hover:underline cursor-pointer"
            >
              [SELECT_ALL]
            </button>
            <span>/</span>
            <button
              type="button"
              onClick={() => onSelectAllCandidates(false)}
              className="text-[#8e9192] hover:text-white cursor-pointer"
            >
              [DESELECT_ALL]
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {candidates.map((card) => {
            const isSelected = card.isSelected;
            return (
              <div
                key={card.id}
                onClick={() => onToggleCandidate(card.id)}
                className={`border p-5 bg-black flex flex-col justify-between gap-4 cursor-pointer transition-none select-none ${
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
                      [{card.rank}]
                    </span>
                    <span
                      className={`text-[10px] tracking-widest uppercase border px-2 py-0.5 ${
                        isSelected
                          ? 'border-white text-white font-bold'
                          : 'border-[#444748] text-[#8e9192]'
                      }`}
                    >
                      IMPACT_SCORE: {card.impactScore}
                    </span>
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
                          [{r}]
                        </span>
                      ))}
                    </div>
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
                    {isSelected
                      ? '[✓] SELECTED FOR RECOVERY ROUTING'
                      : '[ ] UNSELECTED'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ACTION / AUTHORIZATION BLOCK */}
      <div className="border border-[#444748] p-5 bg-black flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1f1f1f] pb-3 gap-2">
          <div className="text-sm font-bold text-white tracking-widest uppercase">
            [CLEANUP_AUTHORIZATION]
          </div>
          <div className="text-[11px] text-white tracking-widest uppercase border border-white px-2 py-0.5">
            REQUIREMENT: EXPLICIT_OPERATOR_SIGN_OFF
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="flex flex-col gap-1 border-l-2 border-white pl-4">
            <span className="text-[#8e9192] uppercase text-[10px]">
              STAGED RECOVERY BATCH:
            </span>
            <span className="text-white font-bold text-base md:text-lg">
              {selectedCandidates.length} FILES // {formattedSelectedSize}
            </span>
            <span className="text-[#8e9192] text-[11px] uppercase">
              INDEXED AND VALIDATED ACROSS 3 VOLUMES
            </span>
          </div>

          <div className="flex flex-col gap-1 border-l-2 border-[#444748] pl-4">
            <span className="text-[#8e9192] uppercase text-[10px]">OPERATION TARGET:</span>
            <span className="text-white font-bold text-base md:text-lg">
              SYSTEM RECYCLE BIN (MIGRATION ONLY)
            </span>
            <span className="text-[#8e9192] text-[11px] uppercase">
              RETAIN HARD LINKS UNTIL USER MANUAL PURGE
            </span>
          </div>
        </div>

        <div className="pt-3 flex flex-col items-stretch sm:items-start gap-2 border-t border-[#1f1f1f]">
          <button
            type="button"
            disabled={selectedCandidates.length === 0}
            onClick={() => setShowConfirmModal(true)}
            className="bg-white text-black font-bold text-sm px-8 py-3.5 border border-white tracking-widest uppercase hover:bg-neutral-200 transition-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            [ CONFIRM SAFE CLEANUP &amp; MIGRATE TO RECOVERY ]
          </button>
          <span className="text-[10px] text-[#8e9192] uppercase tracking-wider">
            COMMAND IDENTIFIER: 0xCLEANUP_MIGRATE_STAGE_EXECUTE
          </span>
        </div>

        {/* EXECUTION FEEDBACK BOX */}
        {executionFeedback && (
          <div className="border border-white p-4 bg-[#131313] flex flex-col gap-2 text-xs text-white">
            <div className="flex items-center justify-between font-bold">
              <span className="tracking-widest uppercase">[BATCH_ROUTED_SUCCESSFULLY]</span>
              <span className="text-[#8e9192]">TIME: +0.042s</span>
            </div>
            <div className="text-[#c4c7c8] uppercase leading-relaxed text-[11px]">
              MIGRATED TO OS_RECYCLE_BIN. ZERO INODES PERMANENTLY REMOVED. RESTORATION PATHWAYS
              CATALOGUED IN /HISTORY.
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
      </div>

      {/* SAFETY PROTOCOL VERIFICATION BOX */}
      <div className="border border-[#444748] p-5 bg-black flex flex-col gap-2 text-xs">
        <div className="font-bold text-white tracking-widest uppercase border-b border-[#1f1f1f] pb-2 flex items-center justify-between">
          <span>[SAFETY_PROTOCOL: ENFORCED]</span>
          <span className="text-[#8e9192]">INTEGRITY CHECK: PASSED</span>
        </div>
        <div className="flex flex-col gap-1.5 text-[#c4c7c8] tracking-wider uppercase leading-relaxed pt-1 text-[11px]">
          <div className="text-white font-bold">■ DETECTION ≠ RECOMMENDATION ≠ DELETION</div>
          <div>■ TARGET INODES WILL BE RELOCATED TO SYSTEM RECYCLE BIN OR FORENSIC QUARANTINE.</div>
          <div>■ NO PERMANENT DELETION IS AUTHORIZED OR CAPABLE OF BYPASSING USER CONFIRMATION.</div>
          <div className="text-[#8e9192]">
            ■ ATOMIC ROLLBACK RECEIPT ISSUED AT: C:\ProgramData\ClutterScan\AuditLog.journal
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      {showConfirmModal && (
        <CleanupModal
          selectedCandidates={selectedCandidates}
          totalFormatted={formattedSelectedSize}
          onCancel={() => setShowConfirmModal(false)}
          onConfirm={handleConfirmMigration}
        />
      )}
    </div>
  );
};
