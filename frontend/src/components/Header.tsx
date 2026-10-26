import React from 'react';
import {
  Clock3,
  Copy,
  FileText,
  HardDrive,
  Home,
  Image,
  ShieldCheck,
  FolderTree,
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
    { key: 'organize', label: 'Smart organize', description: 'Categorize & tidy', icon: FolderTree },
    { key: 'cleanup', label: 'Cleanup', description: 'Confirm selections', icon: ShieldCheck, badgeCount: stagedFilesCount },
    { key: 'history', label: 'History', description: 'Past scans & restores', icon: Clock3 },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#101010] border-b border-[#303030]">
      <div className="flex flex-col">
        {/* Top Diagnostic Title Bar */}
        <div className="h-12 px-4 sm:px-6 md:px-8 flex items-center justify-between border-b border-[#303030] bg-[#0c0c0c]">
          <div className="flex items-center gap-3">
            <span className="font-bold text-sm sm:text-base text-[#f5f5f5] tracking-wide">
              ClutterScan <span className="text-[#858585] font-normal mx-1">/</span> <span className="text-[#b8b8b8] font-normal text-xs sm:text-sm">Local Storage Cleanup</span>
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold text-[#57b887] border border-[#303030] px-2.5 py-1 bg-[#141414] tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#57b887] inline-block animate-pulse"></span>
              READY
            </span>
            <div className="hidden sm:flex border border-[#303030] bg-[#141414] items-center justify-center px-2.5 py-1 text-xs text-[#b8b8b8] select-none font-mono">
              LOCAL ONLY
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <nav aria-label="Main navigation" className="min-h-14 px-2 sm:px-4 md:px-6 flex items-center overflow-x-auto no-scrollbar select-none bg-[#101010]">
          <div className="flex items-center gap-1 w-full justify-start xl:justify-between">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onSelectTab(tab.key)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`min-h-[46px] px-2.5 sm:px-3 py-1.5 transition-all whitespace-nowrap cursor-pointer rounded-[2px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white flex flex-col items-start justify-center gap-0.5 shrink-0 ${
                    isActive
                      ? 'bg-white text-black font-semibold shadow-sm'
                      : 'text-[#b8b8b8] hover:text-[#f5f5f5] hover:bg-[#1b1b1b]'
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-[13px] sm:text-[14px] leading-tight font-medium">
                    <Icon size={14} aria-hidden="true" className={isActive ? 'text-black' : 'text-[#b8b8b8]'} />
                    <span>{tab.label}</span>
                    {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                      <span
                        className={`text-[11px] px-1.5 py-0.2 rounded font-bold ${
                          isActive
                            ? 'bg-black text-white'
                            : 'bg-[#c90000] text-white'
                        }`}
                      >
                        {tab.badgeCount}
                      </span>
                    )}
                  </span>
                  <span className={`text-[11px] pl-5 font-normal hidden lg:block ${
                    isActive ? 'text-[#333333]' : 'text-[#858585]'
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
