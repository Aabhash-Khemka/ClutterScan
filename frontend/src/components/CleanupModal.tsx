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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-[2px] flex items-center justify-center p-4 font-sans" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cleanup-confirm-title"
        className="border border-[#454545] bg-[#141414] p-6 md:p-8 max-w-xl w-full space-y-6 text-sm text-[#f5f5f5] rounded-[2px] shadow-2xl"
      >
        <div className="border-b border-[#303030] pb-4 flex justify-between items-start">
          <div>
            <h2 id="cleanup-confirm-title" className="text-xl font-bold text-white tracking-tight">
              Confirm Cleanup Action
            </h2>
            <div className="text-xs text-[#858585] mt-1">
              Confirm the files and destination before proceeding.
            </div>
          </div>
        </div>

        <div className="space-y-2 text-sm leading-relaxed text-[#b8b8b8]">
          <p className="font-semibold text-white">
            Selected files will be relocated safely to the Windows Recycle Bin or to ClutterScan's encrypted local recovery vault.
          </p>
          <p>
            Files sent to the Recycle Bin can be restored through Windows. Vault items can be restored with 1-click in the History tab.
          </p>
        </div>

        {/* Transaction Manifest */}
        <div className="border border-[#303030] bg-[#080808] p-4 rounded-[2px] space-y-2.5 text-sm">
          <div className="flex justify-between border-b border-[#303030] pb-2 text-xs">
            <span className="text-[#858585] uppercase font-semibold">Action:</span>
            <span className="text-white font-semibold">Safe Move to Recovery Storage</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#858585]">Files to Relocate:</span>
            <span className="text-white font-bold font-mono">{selectedCandidates.length} Files</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#858585]">Storage to Reclaim:</span>
            <span className="text-white font-bold font-mono">{totalFormatted}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#858585]">Destination:</span>
            <span className="text-white">Windows Recycle Bin / Local Vault</span>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3.5 border border-[#F06464] bg-[#F06464]/10 text-[#F06464] text-sm rounded-[2px]" role="alert">
            {errorMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-3 border-t border-[#303030]">
          <button
            type="button"
            disabled={isProcessing}
            onClick={onCancel}
            className="px-5 py-2.5 border border-[#454545] text-[#b8b8b8] hover:text-white hover:border-white rounded-[2px] font-medium text-sm transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={onConfirm}
            className="px-6 py-2.5 border border-white bg-white text-black font-semibold text-sm rounded-[2px] hover:bg-neutral-200 transition-colors cursor-pointer"
          >
            {isProcessing ? 'Moving Files...' : `Confirm Move (${selectedCandidates.length} Files)`}
          </button>
        </div>
      </div>
    </div>
  );
};
