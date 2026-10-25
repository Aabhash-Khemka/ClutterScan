import React from 'react';
import { CleanupCandidateRecord } from '../types';
import { ShieldCheck, AlertTriangle, X } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cleanup-confirm-title"
        className="bg-white border border-[#E2E8F0] p-6 max-w-lg w-full space-y-5 text-sm text-[#172033] rounded-2xl shadow-xl"
      >
        <div className="flex items-start justify-between pb-2">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] text-[#5B5CE2] flex items-center justify-center shrink-0">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 id="cleanup-confirm-title" className="text-lg font-bold text-[#172033] tracking-tight">
                Confirm Safe Cleanup
              </h2>
              <div className="text-xs text-[#64748B] mt-0.5">
                Verify files and recovery destination before relocation.
              </div>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 text-[#64748B] hover:text-[#172033] hover:bg-[#F1F5F9] rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2 text-sm leading-relaxed text-[#64748B]">
          <p className="font-semibold text-[#172033]">
            Selected files will be relocated safely to the Windows Recycle Bin or ClutterScan local recovery vault.
          </p>
          <p className="text-xs">
            Files moved to Recycle Bin can be restored through Windows. Files in the recovery vault can be restored anytime from the History tab.
          </p>
        </div>

        {/* Transaction Manifest */}
        <div className="border border-[#E2E8F0] bg-[#F8FAFC] p-4 rounded-xl space-y-2 text-xs">
          <div className="flex justify-between border-b border-[#E2E8F0] pb-2">
            <span className="text-[#64748B] font-medium">Action:</span>
            <span className="text-[#172033] font-semibold">Safe Move to Recovery Storage</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#64748B]">Files to Relocate:</span>
            <span className="text-[#172033] font-bold">{selectedCandidates.length} Files</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#64748B]">Reclaimable Storage:</span>
            <span className="text-[#15803D] font-bold">{totalFormatted}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#64748B]">Destination:</span>
            <span className="text-[#172033] font-medium">Windows Recycle Bin / Local Vault</span>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 border border-[#FCA5A5] bg-[#FEF2F2] text-[#DC2626] text-xs rounded-lg" role="alert">
            {errorMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
          <button
            type="button"
            disabled={isProcessing}
            onClick={onCancel}
            className="px-4 py-2 border border-[#CBD5E1] text-[#334155] bg-white hover:bg-[#F8FAFC] rounded-lg font-medium text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={onConfirm}
            className="px-5 py-2 bg-[#5B5CE2] hover:bg-[#4849C7] text-white font-semibold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            {isProcessing ? 'Moving Files...' : `Confirm Move (${selectedCandidates.length} Files)`}
          </button>
        </div>
      </div>
    </div>
  );
};
