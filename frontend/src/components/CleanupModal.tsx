import React, { useState } from 'react';
import { CleanupCandidateRecord } from '../types';

interface CleanupModalProps {
  selectedCandidates: CleanupCandidateRecord[];
  totalFormatted: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export const CleanupModal: React.FC<CleanupModalProps> = ({
  selectedCandidates,
  totalFormatted,
  onCancel,
  onConfirm,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [journalSigned, setJournalSigned] = useState(false);

  const handleExecute = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setJournalSigned(true);
      setTimeout(() => {
        setIsProcessing(false);
        onConfirm();
      }, 700);
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <div className="border border-white bg-[#0e0e0e] p-6 md:p-8 max-w-xl w-full space-y-6 font-mono text-xs text-white">
        <div className="border-b border-[#1f1f1f] pb-3 flex justify-between items-start">
          <div>
            <div className="text-sm font-bold text-white uppercase tracking-widest">
              [CONFIRMATION_REQUIRED]
            </div>
            <div className="text-[11px] text-[#8e9192] mt-0.5 uppercase">
              NON-DESTRUCTIVE RECOVERY TRANSACTION // MIGRATION STAGING
            </div>
          </div>
          <span className="border border-white text-white px-2 py-0.5 text-[10px] font-bold">
            0% DATA LOSS
          </span>
        </div>

        <div className="space-y-3 text-xs leading-relaxed">
          <p className="font-bold text-white">
            SELECTED TARGET INODES WILL BE MIGRATED EXCLUSIVELY TO SYSTEM RECYCLE BIN / FORENSIC QUARANTINE BUFFER.
          </p>
          <p className="text-[#c4c7c8]">
            DIRECT DISK UNLINKING / PERMANENT DELETION IS PROHIBITED BY FORENSIC HARD-LOCK [0x00_HARD_LOCK]. ALL ITEMS CAN BE RESTORED WITH ZERO CORRUPTION THROUGH THE HISTORY AUDIT JOURNAL.
          </p>
        </div>

        {/* Transaction Manifest */}
        <div className="border border-[#1f1f1f] bg-black p-3 space-y-2">
          <div className="flex justify-between border-b border-[#1f1f1f] pb-1 text-[#8e9192]">
            <span>OPERATION SPECIFICATION:</span>
            <span className="text-white font-bold">RECOVERY_ROUTE</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8e9192]">ITEMS TO RELOCATE:</span>
            <span className="text-white font-bold">{selectedCandidates.length} INODES</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8e9192]">FOOTPRINT TO RECLAIM:</span>
            <span className="text-white font-bold">{totalFormatted}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8e9192]">DESTINATION:</span>
            <span className="text-white">OS_RECYCLE_BIN_STAGE</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8e9192]">ROLLBACK JOURNAL:</span>
            <span className="text-white truncate max-w-xs">
              C:\ProgramData\ClutterScan\AuditLog.journal
            </span>
          </div>
        </div>

        {journalSigned && (
          <div className="p-2 border border-white bg-white text-black font-bold text-center">
            [TRANSACTION JOURNAL SIGNED: SHA256_ROLLBACK_SEAL_READY]
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            disabled={isProcessing}
            onClick={onCancel}
            className="px-4 py-2 border border-[#444748] text-[#c4c7c8] hover:text-white transition-none uppercase cursor-pointer"
          >
            [ CANCEL ]
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleExecute}
            className="px-6 py-2 border border-white bg-white text-black font-bold uppercase transition-none hover:bg-neutral-200 cursor-pointer"
          >
            {isProcessing ? 'COMMITTING MIGRATION...' : '[ CONFIRM & RELOCATE ]'}
          </button>
        </div>
      </div>
    </div>
  );
};
