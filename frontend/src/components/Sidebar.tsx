import React from 'react';
import {
  LayoutDashboard,
  Search,
  Copy,
  FolderTree,
  Image,
  FileCheck2,
  Trash2,
  History,
  ShieldCheck,
  HardDrive,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { NavTab } from '../types';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  stagedFilesCount: number;
}

interface NavItem {
  key: NavTab;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  stagedFilesCount,
}) => {
  const primaryNav: NavItem[] = [
    { key: 'home', label: 'Overview & Scan', icon: LayoutDashboard },
    { key: 'duplicates', label: 'Duplicate Files', icon: Copy },
    { key: 'storage', label: 'Storage Breakdown', icon: HardDrive },
    { key: 'organize', label: 'Smart Organizer', icon: FolderTree },
  ];

  const secondaryNav: NavItem[] = [
    { key: 'images', label: 'Similar Images', icon: Image },
    { key: 'files', label: 'File Review', icon: FileCheck2 },
    { key: 'cleanup', label: 'Cleanup Queue', icon: Trash2, badge: stagedFilesCount },
    { key: 'history', label: 'Scan & Restore History', icon: History },
  ];

  return (
    <aside className="w-64 bg-white border-r border-[#E2E8F0] flex flex-col justify-between shrink-0 select-none min-h-screen">
      <div>
        {/* Brand Logo Header */}
        <div className="h-16 px-6 flex items-center gap-3 border-b border-[#E2E8F0]">
          <div className="w-9 h-9 rounded-lg bg-[#5B5CE2] flex items-center justify-center text-white shadow-sm shadow-[#5B5CE2]/20">
            <ShieldCheck size={20} strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-bold text-base tracking-tight text-[#172033] leading-none">
              ClutterScan
            </div>
            <div className="text-[11px] font-medium text-[#64748B] mt-0.5">
              File & Storage Manager
            </div>
          </div>
        </div>

        {/* Primary Navigation */}
        <div className="p-4 space-y-6">
          <div>
            <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-[#94A3B8] uppercase">
              Main Menu
            </div>
            <nav className="space-y-1">
              {primaryNav.map((item) => {
                const isActive = activeTab === item.key;
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onSelectTab(item.key)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer text-left ${
                      isActive
                        ? 'bg-[#EEF2FF] text-[#5B5CE2] font-semibold'
                        : 'text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        size={18}
                        className={isActive ? 'text-[#5B5CE2]' : 'text-[#94A3B8]'}
                      />
                      <span>{item.label}</span>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Deep Triage & Management */}
          <div>
            <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-[#94A3B8] uppercase">
              File Management
            </div>
            <nav className="space-y-1">
              {secondaryNav.map((item) => {
                const isActive = activeTab === item.key;
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onSelectTab(item.key)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer text-left ${
                      isActive
                        ? 'bg-[#EEF2FF] text-[#5B5CE2] font-semibold'
                        : 'text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        size={18}
                        className={isActive ? 'text-[#5B5CE2]' : 'text-[#94A3B8]'}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#DC2626] text-white">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Safety & Local Mode Badge */}
      <div className="p-4 border-t border-[#E2E8F0] m-4 bg-[#F8FAFC] rounded-xl border">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#172033]">
          <span className="w-2 h-2 rounded-full bg-[#15803D]"></span>
          <span>100% Offline &amp; Private</span>
        </div>
        <p className="text-[12px] text-[#64748B] mt-1 leading-normal">
          Zero telemetry. All scanning and file operations occur exclusively on your local machine.
        </p>
      </div>
    </aside>
  );
};
