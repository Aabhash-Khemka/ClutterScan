import React from 'react';
import { NavTab } from '../types';
import { RefreshCw, Shield, Sparkles } from 'lucide-react';

interface NavbarProps {
  activeTab: NavTab;
  onRefreshLatest?: () => void;
  currentScanId?: string | null;
}

const tabTitles: Record<NavTab, { title: string; subtitle: string }> = {
  home: {
    title: 'Overview & Scan Files',
    subtitle: 'Analyze your local folders to detect duplicates and reclaim disk space.',
  },
  storage: {
    title: 'Storage Breakdown',
    subtitle: 'Visual tree of directories and disk space allocation.',
  },
  duplicates: {
    title: 'Duplicate Files',
    subtitle: 'Review identical duplicate groups with safe 1-click bulk selection.',
  },
  images: {
    title: 'Similar Photos & Images',
    subtitle: 'Identify photo bursts and resized images using perceptual hashing.',
  },
  files: {
    title: 'File Review',
    subtitle: 'Inspect large downloads, stale archives, and temporary artifacts.',
  },
  organize: {
    title: 'Smart Organizer',
    subtitle: 'Sort loose files into clean category folders with 1-click undo.',
  },
  cleanup: {
    title: 'Cleanup Queue',
    subtitle: 'Confirm files staged for safe relocation to Recycle Bin or recovery vault.',
  },
  history: {
    title: 'Scan & Restore History',
    subtitle: 'Audit logs of previous scans, growth deltas, and restored files.',
  },
};

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onRefreshLatest,
  currentScanId,
}) => {
  const current = tabTitles[activeTab] || tabTitles.home;

  return (
    <header className="h-16 bg-white border-b border-[#E2E8F0] px-6 md:px-8 flex items-center justify-between shrink-0">
      <div className="flex flex-col justify-center">
        <h1 className="text-lg md:text-xl font-bold text-[#172033] tracking-tight">
          {current.title}
        </h1>
        <p className="text-xs text-[#64748B] hidden sm:block">
          {current.subtitle}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {currentScanId && (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-[#EEF2FF] border border-[#E2E8F0] rounded-full text-xs font-medium text-[#5B5CE2]">
            <Sparkles size={13} />
            <span>Scan Active:</span>
            <span className="font-mono font-bold text-[#172033]">{currentScanId}</span>
          </div>
        )}

        {onRefreshLatest && (
          <button
            type="button"
            onClick={onRefreshLatest}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg transition-colors cursor-pointer"
            title="Refresh latest scan data"
          >
            <RefreshCw size={13} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        )}

        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F0FDF4] border border-[#DCFCE7] rounded-lg text-xs font-semibold text-[#15803D]">
          <Shield size={14} />
          <span>Safe Mode On</span>
        </div>
      </div>
    </header>
  );
};
