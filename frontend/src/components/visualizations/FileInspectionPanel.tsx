import React from 'react';
import { VisualFileNode, formatBytes, CATEGORY_COLORS } from '../../utils/visualDataUtils';

interface FileInspectionPanelProps {
  file: VisualFileNode | null;
  onClose: () => void;
  onSelectDuplicateGroup?: (groupId: string) => void;
  onStageForCleanup?: (path: string) => void;
}

export const FileInspectionPanel: React.FC<FileInspectionPanelProps> = ({
  file,
  onClose,
  onSelectDuplicateGroup,
  onStageForCleanup,
}) => {
  if (!file) return null;

  const categoryColor = CATEGORY_COLORS[file.category] || '#606060';

  return (
    <div className="fixed bottom-6 right-6 w-96 bg-[#141414] border border-[#454545] shadow-2xl z-50 flex flex-col font-mono text-xs">
      {/* Header Banner */}
      <div className="p-3 bg-[#1b1b1b] border-b border-[#303030] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ backgroundColor: categoryColor }}
          />
          <span className="font-bold text-white uppercase tracking-wider text-[11px]">
            File Inspection
          </span>
          {file.isDuplicate && (
            <span className="text-[10px] font-bold px-1.5 py-0.2 bg-[#f06464]/20 text-[#f06464] border border-[#f06464]/40">
              DUPLICATE
            </span>
          )}
        </div>

        <button
          onClick={onClose}
          className="text-[#858585] hover:text-white cursor-pointer px-1 font-bold"
          title="Close Inspector"
        >
          [X]
        </button>
      </div>

      {/* Body Content */}
      <div className="p-4 space-y-3 text-[#f5f5f5]">
        {/* File Name */}
        <div>
          <div className="font-bold text-sm text-white break-all leading-tight">
            {file.name}
          </div>
          <div className="text-[11px] text-[#858585] mt-1 flex items-center gap-2">
            <span>{file.category}</span>
            <span>•</span>
            <span>.{file.extension || 'file'}</span>
          </div>
        </div>

        {/* Metadata Details Grid */}
        <div className="border border-[#262626] bg-[#0c0c0c] p-3 grid grid-cols-2 gap-2 text-xs">
          <div>
            <div className="text-[10px] uppercase text-[#858585]">Allocated Size</div>
            <div className="font-bold text-[#57b887] text-sm mt-0.5">{file.formattedSize}</div>
          </div>

          <div>
            <div className="text-[10px] uppercase text-[#858585]">Exact Inode Bytes</div>
            <div className="text-white mt-0.5">{file.bytes.toLocaleString()} B</div>
          </div>

          {file.duplicateCount && file.duplicateCount > 1 ? (
            <div className="col-span-2 border-t border-[#222222] pt-1.5 mt-1">
              <div className="text-[10px] uppercase text-[#f06464]">Redundancy Level</div>
              <div className="text-[#f06464] font-bold">
                {file.duplicateCount} duplicate copies located on disk
              </div>
            </div>
          ) : null}
        </div>

        {/* System Path */}
        <div>
          <div className="text-[10px] uppercase text-[#858585] mb-1">Filesystem Path</div>
          <div className="p-2 border border-[#262626] bg-[#0c0c0c] text-[10px] text-[#b8b8b8] break-all max-h-20 overflow-y-auto">
            {file.path}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex gap-2 pt-2 border-t border-[#262626]">
          {file.isDuplicate && file.duplicateGroupId && onSelectDuplicateGroup && (
            <button
              onClick={() => onSelectDuplicateGroup(file.duplicateGroupId!)}
              className="flex-1 py-2 border border-white bg-white text-black font-bold uppercase text-[11px] cursor-pointer hover:bg-neutral-200"
            >
              Inspect Group
            </button>
          )}

          {onStageForCleanup && (
            <button
              onClick={() => onStageForCleanup(file.path)}
              className="flex-1 py-2 border border-[#454545] bg-[#1b1b1b] text-white font-bold uppercase text-[11px] cursor-pointer hover:border-white"
            >
              Stage Cleanup
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
