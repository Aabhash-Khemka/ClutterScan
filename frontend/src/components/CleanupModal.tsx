import React from 'react';
import { CleanupCandidateRecord } from '../types';

interface CleanupModalProps {
  selectedCandidates: CleanupCandidateRecord[];
  totalFormatted: string;
  onCancel: () => void;
  onConfirm: () => void;
  isProcessing: boolean;
  errorMessage: string | null;
}

export const CleanupModal: React.FC<CleanupModalProps> = ({
  selectedCandidates,
  totalFormatted,
  onCancel,
  onConfirm,
  isProcessing,
  errorMessage,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cleanup-confirm-title"
        className="border-2 border-white bg-[#0b0b0b] p-6 md:p-8 max-w-xl w-full space-y-6 font-mono text-xs text-white"
      >
        <div className="border-b border-[#303030] pb-3 flex justify-between items-start">
          <div>
            <div id="cleanup-confirm-title" className="text-sm font-bold text-white uppercase tracking-widest">
              [CONFIRMATION_REQUIRED]
            </div>
            <div className="text-[11px] text-[#858585] mt-0.5 uppercase">
              Confirm the files and destination before continuing
            </div>
          </div>
        </div>

        <div className="space-y-3 text-xs leading-relaxed">
          <p className="font-bold text-white">
            Selected files will be moved to system Trash when available, otherwise to ClutterScan's local recovery vault.
          </p>
          <p className="text-[#b0b0b0]">
            Files moved to system Trash must be restored using your operating system. Vault items can be restored from ClutterScan History.
          </p>
        </div>

        {/* Transaction Manifest */}
        <div className="border border-[#303030] bg-[#000000] p-3 space-y-2">
          <div className="flex justify-between border-b border-[#303030] pb-1 text-[#858585]">
            <span>OPERATION SPECIFICATION:</span>
            <span className="text-white font-bold">MOVE TO RECOVERY</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#858585]">ITEMS TO RELOCATE:</span>
            <span className="text-white font-bold">{selectedCandidates.length} INODES</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#858585]">FOOTPRINT TO RECLAIM:</span>
            <span className="text-white font-bold">{totalFormatted}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#858585]">DESTINATION:</span>
            <span className="text-white">SYSTEM TRASH / LOCAL VAULT</span>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 border border-[#c90000] text-white" role="alert">
            {errorMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            disabled={isProcessing}
            onClick={onCancel}
            className="px-4 py-2 border border-[#484848] text-[#b0b0b0] hover:text-white transition-none uppercase cursor-pointer"
          >
            [ CANCEL ]
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={onConfirm}
            className="px-6 py-2 border border-white bg-white text-black font-bold uppercase transition-none hover:bg-neutral-200 cursor-pointer"
          >
            {isProcessing ? 'MOVING FILES…' : '[ CONFIRM MOVE ]'}
          </button>
        </div>
      </div>
    </div>
  );
};
