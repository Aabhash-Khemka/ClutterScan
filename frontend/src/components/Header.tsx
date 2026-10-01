import React from 'react';
import { NavTab } from '../types';

interface HeaderProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  stagedFilesCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  stagedFilesCount,
}) => {
  const tabs: { key: NavTab; label: string; badgeCount?: number }[] = [
    { key: 'home', label: 'HOME' },
    { key: 'storage', label: 'STORAGE' },
    { key: 'duplicates', label: 'DUPLICATES' },
    { key: 'images', label: 'IMAGES' },
    { key: 'files', label: 'FILES' },
    { key: 'cleanup', label: 'CLEANUP', badgeCount: stagedFilesCount },
    { key: 'history', label: 'HISTORY' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0e0e0e] border-b border-[#1f1f1f]">
      <div className="flex flex-col">
        {/* Top Diagnostic Title Bar */}
        <div className="h-11 px-4 sm:px-6 md:px-8 flex items-center justify-between border-b border-[#1f1f1f]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs sm:text-sm text-white tracking-widest uppercase">
              CLUTTERSCAN ■ LOCAL DISK FORENSIC &amp; CLEANUP SYSTEM
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-white tracking-widest uppercase border border-[#444748] px-2 py-0.5 bg-[#0e0e0e]">
              [SYSTEM: ONLINE]
            </span>
            <div className="w-6 h-6 border border-[#444748] bg-[#0e0e0e] flex items-center justify-center text-[10px] font-bold text-white select-none">
              ROOT
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <nav className="h-9 px-4 sm:px-6 md:px-8 flex items-center overflow-x-auto select-none border-b border-[#1f1f1f]">
          <div className="flex items-center border-l border-[#1f1f1f]">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onSelectTab(tab.key)}
                  className={`border-r border-[#1f1f1f] text-xs font-bold px-4 py-2 uppercase tracking-wider transition-none whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-white text-black'
                      : 'bg-[#0e0e0e] text-[#c4c7c8] hover:text-white hover:bg-[#1b1b1b]'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                    <span
                      className={`text-[9px] px-1 py-0.2 border ${
                        isActive
                          ? 'border-black text-black font-extrabold'
                          : 'border-white text-white font-bold'
                      }`}
                    >
                      {tab.badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </header>
  );
};
