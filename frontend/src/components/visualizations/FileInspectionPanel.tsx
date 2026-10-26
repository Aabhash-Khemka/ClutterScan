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

  const categoryColor = CATEGORY_COLORS[file.category] || '#68758B';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        width: 380,
        background: '#131724',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: 16,
        boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(98, 91, 238, 0.2)',
        zIndex: 9999,
        overflow: 'hidden',
        animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {/* Header Banner */}
      <div
        style={{
          padding: '14px 18px',
          background: 'rgba(255, 255, 255, 0.03)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: categoryColor,
              boxShadow: `0 0 10px ${categoryColor}`,
            }}
          />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#f5f7fc', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            File Inspector
          </span>
          {file.isDuplicate && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#FF6B6B',
                background: 'rgba(255, 107, 107, 0.15)',
                padding: '2px 6px',
                borderRadius: 4,
              }}
            >
              DUPLICATE
            </span>
          )}
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#8E9AA8',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 6,
          }}
          title="Close Inspector"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Body Content */}
      <div style={{ padding: 18 }}>
        {/* File Name & Category Pill */}
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#fff',
              wordBreak: 'break-all',
              lineHeight: 1.4,
              marginBottom: 4,
            }}
          >
            {file.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#8E9AA8' }}>
            <span
              style={{
                background: `${categoryColor}20`,
                color: categoryColor,
                padding: '2px 8px',
                borderRadius: 6,
                fontWeight: 600,
              }}
            >
              {file.category}
            </span>
            <span>•</span>
            <span>.{file.extension || 'file'}</span>
          </div>
        </div>

        {/* Metadata Details Grid */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: 10,
            padding: '12px 14px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            marginBottom: 16,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 10, color: '#8E9AA8', textTransform: 'uppercase', marginBottom: 2 }}>Size</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#20C5E8' }}>{file.formattedSize}</div>
          </div>

          <div>
            <div style={{ fontSize: 10, color: '#8E9AA8', textTransform: 'uppercase', marginBottom: 2 }}>Exact Bytes</div>
            <div style={{ fontSize: 12, color: '#E5E9F2', fontFamily: 'monospace' }}>
              {file.bytes.toLocaleString()} B
            </div>
          </div>

          {file.duplicateCount && file.duplicateCount > 1 ? (
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ fontSize: 10, color: '#8E9AA8', textTransform: 'uppercase', marginBottom: 2 }}>
                Identical Redundancy
              </div>
              <div style={{ fontSize: 12, color: '#FF6B6B', fontWeight: 600 }}>
                {file.duplicateCount} identical copies located
              </div>
            </div>
          ) : null}
        </div>

        {/* Full File Path */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: '#8E9AA8', textTransform: 'uppercase', marginBottom: 4 }}>
            System Path
          </div>
          <div
            style={{
              fontSize: 11,
              color: '#CAD3E2',
              background: 'rgba(255, 255, 255, 0.03)',
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid rgba(255, 255, 255, 0.05)',
              wordBreak: 'break-all',
              maxHeight: 70,
              overflowY: 'auto',
              fontFamily: 'monospace',
            }}
          >
            {file.path}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          {file.isDuplicate && file.duplicateGroupId && onSelectDuplicateGroup && (
            <button
              onClick={() => onSelectDuplicateGroup(file.duplicateGroupId!)}
              style={{
                flex: 1,
                background: 'linear-gradient(135deg, #FF6B6B 0%, #925CFF 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '9px 12px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(255, 107, 107, 0.25)',
              }}
            >
              Inspect Group
            </button>
          )}

          {onStageForCleanup && (
            <button
              onClick={() => onStageForCleanup(file.path)}
              style={{
                flex: 1,
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#f5f7fc',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 8,
                padding: '9px 12px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Stage for Cleanup
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
