import React from 'react';
import {
  Clock3,
  Copy,
  FileText,
  HardDrive,
  Home,
  Image,
  ShieldCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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
  const tabs: { key: NavTab; label: string; description: string; icon: LucideIcon; badgeCount?: number }[] = [
    { key: 'home', label: 'Scan', description: 'Choose a folder', icon: Home },
    { key: 'storage', label: 'Storage', description: 'Browse your files', icon: HardDrive },
    { key: 'duplicates', label: 'Duplicates', description: 'Find exact copies', icon: Copy },
    { key: 'images', label: 'Similar images', description: 'Compare photos', icon: Image },
    { key: 'files', label: 'File review', description: 'Review suggestions', icon: FileText },
    { key: 'cleanup', label: 'Cleanup', description: 'Confirm selections', icon: ShieldCheck, badgeCount: stagedFilesCount },
    { key: 'history', label: 'History', description: 'Past scans & restores', icon: Clock3 },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0e0e0e] border-b border-[#1f1f1f]">
      <div className="flex flex-col">
        {/* Top Diagnostic Title Bar */}
        <div className="h-11 px-4 sm:px-6 md:px-8 flex items-center justify-between border-b border-[#1f1f1f]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs sm:text-sm text-white tracking-widest uppercase">
              CLUTTERSCAN <span className="text-[#8e9192]">/</span> LOCAL FILE CLEANUP
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-white tracking-widest uppercase border border-[#444748] px-2 py-0.5 bg-[#0e0e0e]">
              READY TO SCAN
            </span>
            <div className="hidden sm:flex h-6 border border-[#444748] bg-[#0e0e0e] items-center justify-center px-2 text-[10px] font-bold text-white select-none">
              LOCAL ONLY
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <nav aria-label="Main navigation" className="min-h-14 px-4 sm:px-6 md:px-8 flex items-center overflow-x-auto select-none border-b border-[#1f1f1f]">
          <div className="flex items-center border-l border-[#1f1f1f]">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onSelectTab(tab.key)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`min-h-12 border-r border-[#1f1f1f] px-3 md:px-4 py-2 transition-colors whitespace-nowrap cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white flex flex-col items-start justify-center gap-0.5 ${
                    isActive
                      ? 'bg-white text-black'
                      : 'bg-[#0e0e0e] text-[#c4c7c8] hover:text-white hover:bg-[#1b1b1b]'
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider">
                    <Icon size={13} aria-hidden="true" />
                    <span>{tab.label}</span>
                    {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                      <span
                        className={`text-[9px] px-1 border ${
                          isActive
                            ? 'border-black text-black font-extrabold'
                            : 'border-white text-white font-bold'
                        }`}
                      >
                        {tab.badgeCount}
                      </span>
                    )}
                  </span>
                  <span className={`pl-[19px] text-[9px] normal-case tracking-normal ${
                    isActive ? 'text-[#404040]' : 'text-[#8e9192]'
                  }`}>
                    {tab.description}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </header>
  );
};
