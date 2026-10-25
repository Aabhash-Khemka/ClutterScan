import React, { useState, useMemo } from 'react';
import { NavTab, HashGroup, DuplicateFile } from '../types';
import { api } from '../services/api';
import {
  Folder,
  Trash2,
  FileCheck,
  ShieldCheck,
  Layers,
  ChevronDown,
  ChevronRight,
  CheckSquare,
  Square,
  MinusSquare,
  Search,
  Filter,
  Check,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Info
} from 'lucide-react';

interface DuplicatesScreenProps {
  onNavigate: (tab: NavTab) => void;
  onStageDuplicates: (paths: string[], selected: boolean) => number;
  hashGroups?: HashGroup[];
  scanId?: string | null;
  onRefreshData?: () => Promise<void>;
  onShowNotice?: (msg: string) => void;
}

interface FolderGroupData {
  folderPath: string;
  folderName: string;
  files: (DuplicateFile & { groupId: string; groupSector: string })[];
  eligibleFiles: (DuplicateFile & { groupId: string; groupSector: string })[];
  retainedFiles: (DuplicateFile & { groupId: string; groupSector: string })[];
}

export const DuplicatesScreen: React.FC<DuplicatesScreenProps> = ({
  onNavigate,
  hashGroups: propHashGroups,
  scanId,
  onRefreshData,
  onShowNotice,
}) => {
  const [groups, setGroups] = useState<HashGroup[]>(propHashGroups ?? []);

  // Synchronize when propHashGroups changes
  React.useEffect(() => {
    if (propHashGroups) {
      setGroups(propHashGroups);
    }
  }, [propHashGroups]);

  // View mode: 'folder' or 'group'
  const [viewMode, setViewMode] = useState<'folder' | 'group'>('folder');

  // Selected duplicate file paths for deletion
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());

  // Search and filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'IMAGE' | 'DOC' | 'ARCHIVE'>('ALL');

  // Selected group in group dossier view
  const [selectedGroupId, setSelectedGroupId] = useState<string>(groups[0]?.id || '001');

  // Expanded folders in folder view
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  // Confirmation Modal State
  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);
  const [targetContext, setTargetContext] = useState<string>('Selected Folders');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deletionError, setDeletionError] = useState<string | null>(null);
  const [deletionSuccessNotice, setDeletionSuccessNotice] = useState<string | null>(null);

  // Group file analysis: identify canonical retained copy per duplicate hash group
  const retainedPathSet = useMemo(() => {
    const retained = new Set<string>();
    groups.forEach((g) => {
      if (g.files && g.files.length > 0) {
        const pref = g.files.find((f) => f.isPreferred) || g.files[0];
        retained.add(pref.path);
      }
    });
    return retained;
  }, [groups]);

  // Parse folder directory from file path
  const getFolderPath = (filePath: string): string => {
    const lastSlash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
    if (lastSlash === -1) return 'Root / Unknown Directory';
    return filePath.slice(0, lastSlash);
  };

  const getFolderName = (folderPath: string): string => {
    const lastSlash = Math.max(folderPath.lastIndexOf('/'), folderPath.lastIndexOf('\\'));
    if (lastSlash === -1) return folderPath;
    return folderPath.slice(lastSlash + 1) || folderPath;
  };

  // Group duplicate files by folder
  const folderGroups = useMemo((): FolderGroupData[] => {
    const map = new Map<string, (DuplicateFile & { groupId: string; groupSector: string })[]>();

    groups.forEach((g) => {
      (g.files || []).forEach((f) => {
        const folder = getFolderPath(f.path);
        if (!map.has(folder)) {
          map.set(folder, []);
        }
        map.get(folder)!.push({
          ...f,
          groupId: g.id,
          groupSector: g.sectorName,
        });
      });
    });

    const result: FolderGroupData[] = [];
    map.forEach((files, folderPath) => {
      const eligible = files.filter((f) => !retainedPathSet.has(f.path));
      const retained = files.filter((f) => retainedPathSet.has(f.path));
      result.push({
        folderPath,
        folderName: getFolderName(folderPath),
        files,
        eligibleFiles: eligible,
        retainedFiles: retained,
      });
    });

    // Sort folders by eligible duplicate count descending
    result.sort((a, b) => b.eligibleFiles.length - a.eligibleFiles.length);
    return result;
  }, [groups, retainedPathSet]);

  // Filtered folder groups
  const filteredFolderGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return folderGroups
      .map((fg) => {
        const matchingFiles = fg.files.filter((f) => {
          const matchQuery =
            !query ||
            f.name.toLowerCase().includes(query) ||
            f.path.toLowerCase().includes(query) ||
            fg.folderName.toLowerCase().includes(query);

          if (!matchQuery) return false;

          if (filterMode === 'IMAGE') {
            const ext = f.name.toLowerCase();
            return (
              ext.endsWith('.jpg') ||
              ext.endsWith('.jpeg') ||
              ext.endsWith('.png') ||
              ext.endsWith('.webp') ||
              ext.endsWith('.bmp') ||
              ext.endsWith('.gif')
            );
          }
          if (filterMode === 'DOC') {
            const ext = f.name.toLowerCase();
            return (
              ext.endsWith('.pdf') ||
              ext.endsWith('.doc') ||
              ext.endsWith('.docx') ||
              ext.endsWith('.txt') ||
              ext.endsWith('.json') ||
              ext.endsWith('.md')
            );
          }
          if (filterMode === 'ARCHIVE') {
            const ext = f.name.toLowerCase();
            return (
              ext.endsWith('.zip') ||
              ext.endsWith('.tar') ||
              ext.endsWith('.gz') ||
              ext.endsWith('.7z') ||
              ext.endsWith('.rar')
            );
          }
          return true;
        });

        const eligible = matchingFiles.filter((f) => !retainedPathSet.has(f.path));
        const retained = matchingFiles.filter((f) => retainedPathSet.has(f.path));

        return {
          ...fg,
          files: matchingFiles,
          eligibleFiles: eligible,
          retainedFiles: retained,
        };
      })
      .filter((fg) => fg.files.length > 0);
  }, [folderGroups, searchQuery, filterMode, retainedPathSet]);

  // Global calculations
  const totalDuplicateFiles = groups.reduce(
    (acc, g) => acc + (g.files ? g.files.length : g.matchCount),
    0
  );

  const totalEligibleFilesCount = useMemo(() => {
    let count = 0;
    groups.forEach((g) => {
      (g.files || []).forEach((f) => {
        if (!retainedPathSet.has(f.path)) count++;
      });
    });
    return count;
  }, [groups, retainedPathSet]);

  const potentialRecoveryBytes = useMemo(() => {
    return groups.reduce((acc, g) => {
      if (g.files && g.files.length > 1) {
        const pref = g.files.find((f) => f.isPreferred) || g.files[0];
        return (
          acc +
          g.files
            .filter((f) => f.path !== pref.path)
            .reduce((sum, f) => sum + (f.bytes || 0), 0)
        );
      }
      return acc;
    }, 0);
  }, [groups]);

  const formatBytes = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024)
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return bytes + ' B';
  };

  // Selected files count
  const selectedEligiblePaths = useMemo(() => {
    const valid = new Set<string>();
    selectedPaths.forEach((p) => {
      if (!retainedPathSet.has(p)) {
        valid.add(p);
      }
    });
    return valid;
  }, [selectedPaths, retainedPathSet]);

  const selectedCount = selectedEligiblePaths.size;

  const selectedBytes = useMemo(() => {
    let sum = 0;
    groups.forEach((g) => {
      (g.files || []).forEach((f) => {
        if (selectedEligiblePaths.has(f.path)) {
          sum += f.bytes || 0;
        }
      });
    });
    return sum;
  }, [groups, selectedEligiblePaths]);

  // Folder-level selection logic
  const handleToggleFolder = (folder: FolderGroupData) => {
    const eligiblePaths = folder.eligibleFiles.map((f) => f.path);
    if (eligiblePaths.length === 0) return;

    const allSelected = eligiblePaths.every((p) => selectedEligiblePaths.has(p));
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        eligiblePaths.forEach((p) => next.delete(p));
      } else {
        eligiblePaths.forEach((p) => next.add(p));
      }
      return next;
    });
  };

  const handleToggleSingleFile = (filePath: string) => {
    if (retainedPathSet.has(filePath)) return;

    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }
      return next;
    });
  };

  const handleSelectAllInView = () => {
    const allEligible: string[] = [];
    filteredFolderGroups.forEach((fg) => {
      fg.eligibleFiles.forEach((f) => allEligible.push(f.path));
    });

    const isAllSelected = allEligible.length > 0 && allEligible.every((p) => selectedEligiblePaths.has(p));
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (isAllSelected) {
        allEligible.forEach((p) => next.delete(p));
      } else {
        allEligible.forEach((p) => next.add(p));
      }
      return next;
    });
  };

  const toggleFolderExpanded = (folderPath: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderPath]: prev[folderPath] === undefined ? false : !prev[folderPath],
    }));
  };

  // Perform bulk deletion
  const handleTriggerBulkDelete = (contextLabel?: string) => {
    if (selectedCount === 0) return;
    setTargetContext(contextLabel || `${selectedCount} files across folders`);
    setDeletionError(null);
    setIsConfirmOpen(true);
  };

  const handleExecuteDeletion = async () => {
    if (selectedCount === 0) return;
    setIsDeleting(true);
    setDeletionError(null);

    const pathsToDelete = Array.from(selectedEligiblePaths);

    try {
      const response = await api.bulkDeleteDuplicates(pathsToDelete, scanId, true);
      const deletedCount = response.deletedCount;
      const failedCount = response.failedCount;

      const successfullyDeleted = new Set(
        response.results
          .filter((r) => !r.status.startsWith('FAILED'))
          .map((r) => r.originPath)
      );

      setGroups((prevGroups) => {
        return prevGroups
          .map((g) => {
            const remaining = g.files.filter((f) => !successfullyDeleted.has(f.path));
            return {
              ...g,
              files: remaining,
              matchCount: remaining.length,
              totalBytes: remaining.reduce((sum, f) => sum + (f.bytes || 0), 0),
            };
          })
          .filter((g) => g.files.length >= 2);
      });

      setSelectedPaths((prev) => {
        const next = new Set(prev);
        successfullyDeleted.forEach((p) => next.delete(p));
        return next;
      });

      setIsConfirmOpen(false);

      const msg =
        failedCount > 0
          ? `Bulk deletion completed: ${deletedCount} files moved to recovery vault, ${failedCount} files failed.`
          : `Successfully removed ${deletedCount} duplicate file${deletedCount === 1 ? '' : 's'}. Moved safely to recovery.`;

      setDeletionSuccessNotice(msg);
      if (onShowNotice) onShowNotice(msg);

      if (onRefreshData) {
        void onRefreshData();
      }
    } catch (err: any) {
      setDeletionError(err.message || 'Bulk deletion failed. Please check file permissions.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSingleDelete = async (filePath: string) => {
    if (retainedPathSet.has(filePath)) return;
    setSelectedPaths(new Set([filePath]));
    setTargetContext(filePath);
    setIsConfirmOpen(true);
  };

  const currentGroup: HashGroup | undefined =
    groups.find((g) => g.id === selectedGroupId) || groups[0];
  const preferredFile = currentGroup?.files.find((f) => f.isPreferred) || currentGroup?.files[0];
  const candidateFile =
    currentGroup?.files.find((f) => !f.isPreferred) || currentGroup?.files[1] || currentGroup?.files[0];

  return (
    <div className="w-full flex flex-col gap-6 text-[#172033] pb-12">
      {/* HEADER SECTION */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-[#172033] tracking-tight">
              Duplicate Files
            </h1>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#EEF2FF] text-[#5B5CE2] border border-[#C7D2FE]">
              SHA-256 Verified
            </span>
          </div>
          <p className="text-sm md:text-base text-[#64748B]">
            Review redundant copies grouped by location or cryptographic hash. Original files are safely preserved.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#F0FDF4] border border-[#BBF7D0] px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#15803D]">
          <ShieldCheck size={16} className="text-[#16A34A]" />
          <span>Original copy protected automatically</span>
        </div>
      </section>

      {/* SUMMARY METRICS CARDS */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
          <div className="text-xs font-medium uppercase tracking-wider text-[#64748B]">Duplicate Groups</div>
          <div className="text-2xl lg:text-3xl font-bold text-[#172033] mt-1.5">{groups.length}</div>
          <div className="text-xs text-[#94A3B8] mt-1">Identical hash clusters</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
          <div className="text-xs font-medium uppercase tracking-wider text-[#64748B]">Total Files</div>
          <div className="text-2xl lg:text-3xl font-bold text-[#172033] mt-1.5">{totalDuplicateFiles}</div>
          <div className="text-xs text-[#94A3B8] mt-1">Total matched across drives</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
          <div className="text-xs font-medium uppercase tracking-wider text-[#64748B]">Redundant Copies</div>
          <div className="text-2xl lg:text-3xl font-bold text-[#5B5CE2] mt-1.5">{totalEligibleFilesCount}</div>
          <div className="text-xs text-[#94A3B8] mt-1">Safe to remove without loss</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
          <div className="text-xs font-medium uppercase tracking-wider text-[#64748B]">Reclaimable Space</div>
          <div className="text-2xl lg:text-3xl font-bold text-[#15803D] mt-1.5">{formatBytes(potentialRecoveryBytes)}</div>
          <div className="text-xs text-[#94A3B8] mt-1">Potential space savings</div>
        </div>
      </section>

      {/* SUCCESS NOTIFICATION */}
      {deletionSuccessNotice && (
        <div className="w-full bg-[#F0FDF4] border border-[#86EFAC] rounded-xl p-4 text-sm text-[#166534] flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 font-medium">
            <Check size={18} className="text-[#16A34A] shrink-0" />
            <span>{deletionSuccessNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setDeletionSuccessNotice(null)}
            className="text-xs font-semibold text-[#15803D] hover:underline cursor-pointer ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* FILTER & BULK CONTROLS TOOLBAR */}
      <section className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
        {/* Search & Category Pills */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[240px] flex-1 sm:flex-initial">
            <Search size={16} className="absolute left-3.5 top-3 text-[#94A3B8]" />
            <input
              type="search"
              aria-label="Search duplicate files or folders"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search duplicates by name or path..."
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] pl-10 pr-3.5 py-2 text-sm text-[#172033] placeholder:text-[#94A3B8] focus:border-[#5B5CE2] focus:bg-white focus:outline-none rounded-lg transition-colors"
            />
          </div>

          <div className="flex items-center bg-[#F1F5F9] p-1 rounded-lg border border-[#E2E8F0]">
            {(['ALL', 'IMAGE', 'DOC', 'ARCHIVE'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setFilterMode(mode)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  filterMode === mode
                    ? 'bg-white text-[#172033] shadow-xs font-semibold'
                    : 'text-[#64748B] hover:text-[#172033]'
                }`}
              >
                {mode === 'ALL' ? 'All Files' : mode === 'IMAGE' ? 'Images' : mode === 'DOC' ? 'Documents' : 'Archives'}
              </button>
            ))}
          </div>

          {/* Toggle View Mode */}
          <div className="flex items-center bg-[#F1F5F9] p-1 rounded-lg border border-[#E2E8F0] ml-auto">
            <button
              type="button"
              onClick={() => setViewMode('folder')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'folder'
                  ? 'bg-white text-[#5B5CE2] shadow-xs font-semibold'
                  : 'text-[#64748B] hover:text-[#172033]'
              }`}
            >
              <Folder size={14} /> By Folder
            </button>
            <button
              type="button"
              onClick={() => setViewMode('group')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'group'
                  ? 'bg-white text-[#5B5CE2] shadow-xs font-semibold'
                  : 'text-[#64748B] hover:text-[#172033]'
              }`}
            >
              <Layers size={14} /> By Hash Group
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-[#E2E8F0]">
          <button
            type="button"
            onClick={handleSelectAllInView}
            className="px-3.5 py-2 border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-[#334155] text-xs font-semibold rounded-lg cursor-pointer flex items-center gap-2 transition-colors shadow-xs"
          >
            {selectedCount > 0 && selectedCount === totalEligibleFilesCount ? (
              <CheckSquare size={16} className="text-[#5B5CE2]" />
            ) : selectedCount > 0 ? (
              <MinusSquare size={16} className="text-[#5B5CE2]" />
            ) : (
              <Square size={16} className="text-[#94A3B8]" />
            )}
            <span>Select All Eligible</span>
          </button>

          <div className="text-xs text-[#64748B] px-2">
            <strong className="text-[#172033] font-semibold">{selectedCount}</strong> of {totalEligibleFilesCount} selected ({formatBytes(selectedBytes)})
          </div>

          <button
            type="button"
            disabled={selectedCount === 0 || isDeleting}
            onClick={() => handleTriggerBulkDelete()}
            className="px-4 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-medium text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-xs"
          >
            <Trash2 size={15} />
            <span>Delete Selected ({selectedCount})</span>
          </button>
        </div>
      </section>

      {/* ZERO DUPLICATES EMPTY STATE */}
      {groups.length === 0 ? (
        <div className="w-full bg-white border border-[#E2E8F0] rounded-xl p-12 flex flex-col items-center justify-center text-center shadow-xs">
          <div className="w-14 h-14 bg-[#EEF2FF] text-[#5B5CE2] rounded-2xl flex items-center justify-center mb-4">
            <ShieldCheck size={28} />
          </div>
          <h2 className="text-xl font-bold text-[#172033] tracking-tight">
            No Duplicate Files Found
          </h2>
          <p className="text-sm text-[#64748B] max-w-md mt-1 mb-6">
            All files in the scanned directories have unique cryptographic signatures. Your storage is clean and unfragmented.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="px-5 py-2.5 bg-[#5B5CE2] hover:bg-[#4849C7] text-white text-sm font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            Run Another Scan
          </button>
        </div>
      ) : viewMode === 'folder' ? (
        /* FOLDER ACCORDION VIEW */
        <div className="flex flex-col gap-4">
          {filteredFolderGroups.length === 0 ? (
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-8 text-center text-sm text-[#64748B]">
              No duplicate files match your search criteria.
            </div>
          ) : (
            filteredFolderGroups.map((fg) => {
              const eligiblePaths = fg.eligibleFiles.map((f) => f.path);
              const selectedInFolder = eligiblePaths.filter((p) => selectedEligiblePaths.has(p));
              const isAllSelected = eligiblePaths.length > 0 && selectedInFolder.length === eligiblePaths.length;
              const isPartiallySelected = selectedInFolder.length > 0 && !isAllSelected;
              const isExpanded = expandedFolders[fg.folderPath] !== false;

              return (
                <div
                  key={fg.folderPath}
                  className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden transition-all"
                >
                  {/* Folder Group Header Bar */}
                  <div className="bg-[#F8FAFC] px-4 py-3 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        aria-label={`Select all ${eligiblePaths.length} duplicates in folder ${fg.folderName}`}
                        onClick={() => handleToggleFolder(fg)}
                        disabled={eligiblePaths.length === 0}
                        className="text-[#64748B] hover:text-[#172033] cursor-pointer disabled:opacity-40"
                      >
                        {isAllSelected ? (
                          <CheckSquare size={18} className="text-[#5B5CE2]" />
                        ) : isPartiallySelected ? (
                          <MinusSquare size={18} className="text-[#5B5CE2]" />
                        ) : (
                          <Square size={18} className="text-[#CBD5E1]" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleFolderExpanded(fg.folderPath)}
                        className="flex items-center gap-2.5 text-left cursor-pointer group min-w-0"
                      >
                        {isExpanded ? (
                          <ChevronDown size={16} className="text-[#64748B] group-hover:text-[#172033] shrink-0" />
                        ) : (
                          <ChevronRight size={16} className="text-[#64748B] group-hover:text-[#172033] shrink-0" />
                        )}
                        <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] text-[#5B5CE2] flex items-center justify-center shrink-0">
                          <Folder size={16} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-sm text-[#172033] group-hover:text-[#5B5CE2] transition-colors truncate">
                            {fg.folderName}/
                          </span>
                          <span className="text-xs text-[#64748B] truncate font-normal" title={fg.folderPath}>
                            {fg.folderPath}
                          </span>
                        </div>
                      </button>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <span className="text-xs text-[#64748B]">
                        <strong className="text-[#172033] font-semibold">{selectedInFolder.length}</strong> / {eligiblePaths.length} selected
                      </span>

                      <button
                        type="button"
                        disabled={selectedInFolder.length === 0 || isDeleting}
                        onClick={() => handleTriggerBulkDelete(`Folder ${fg.folderName} (${selectedInFolder.length} files)`)}
                        className="px-3 py-1.5 border border-[#FCA5A5] bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] text-xs font-medium rounded-lg cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
                      >
                        <Trash2 size={13} />
                        <span>Delete {selectedInFolder.length}</span>
                      </button>
                    </div>
                  </div>

                  {/* File List Rows */}
                  {isExpanded && (
                    <div className="divide-y divide-[#F1F5F9]">
                      {fg.files.map((file) => {
                        const isRetained = retainedPathSet.has(file.path);
                        const isSelected = selectedEligiblePaths.has(file.path);

                        return (
                          <div
                            key={file.id}
                            className={`px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-sm transition-colors ${
                              isRetained
                                ? 'bg-white'
                                : isSelected
                                ? 'bg-[#EEF2FF]/40'
                                : 'bg-white hover:bg-[#F8FAFC]'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {isRetained ? (
                                <span
                                  title="Original copy preserved (Safe)"
                                  className="w-5 h-5 flex items-center justify-center text-[#16A34A]"
                                >
                                  <FileCheck size={18} />
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  aria-label={`Select ${file.name} for deletion`}
                                  onClick={() => handleToggleSingleFile(file.path)}
                                  className="text-[#64748B] hover:text-[#172033] cursor-pointer"
                                >
                                  {isSelected ? (
                                    <CheckSquare size={18} className="text-[#5B5CE2]" />
                                  ) : (
                                    <Square size={18} className="text-[#CBD5E1]" />
                                  )}
                                </button>
                              )}

                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="font-medium text-sm text-[#172033] truncate"
                                    title={file.name}
                                  >
                                    {file.name}
                                  </span>
                                  {isRetained ? (
                                    <span className="text-xs px-2 py-0.5 bg-[#DCFCE7] text-[#15803D] font-medium rounded-full">
                                      Original (Retained)
                                    </span>
                                  ) : (
                                    <span className="text-xs px-2 py-0.5 bg-[#F1F5F9] text-[#64748B] font-medium rounded-full">
                                      Duplicate
                                    </span>
                                  )}
                                </div>
                                <span
                                  className="text-xs text-[#64748B] truncate mt-0.5"
                                  title={file.path}
                                >
                                  {file.path}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3.5 shrink-0 pl-8 md:pl-0">
                              <span className="text-xs font-semibold text-[#172033] tabular-nums">
                                {file.size}
                              </span>

                              {file.resolution && file.resolution !== 'N/A' && (
                                <span className="text-xs text-[#64748B]">
                                  {file.resolution}
                                </span>
                              )}

                              <span className="text-xs text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-md font-mono">
                                {file.groupSector}
                              </span>

                              {isRetained ? (
                                <span className="text-xs text-[#16A34A] font-medium px-2 py-1">
                                  Protected
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleSingleDelete(file.path)}
                                  className="text-xs text-[#DC2626] hover:bg-[#FEF2F2] border border-[#FCA5A5] px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer"
                                  title="Remove this individual duplicate copy"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* HASH DOSSIER SPLIT VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Hash Group Selector */}
          <div className="lg:col-span-4 bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              <span>Hash Groups</span>
              <span>{groups.length} Total</span>
            </div>

            <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto pr-1">
              {groups.map((group) => {
                const isSelected = group.id === selectedGroupId;
                return (
                  <div
                    key={group.id}
                    onClick={() => setSelectedGroupId(group.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-[#EEF2FF] border-[#5B5CE2] text-[#172033]'
                        : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1] text-[#172033]'
                    }`}
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-sm">Group #{group.id}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          isSelected ? 'bg-[#5B5CE2] text-white' : 'bg-[#F1F5F9] text-[#64748B]'
                        }`}
                      >
                        {group.matchCount} copies
                      </span>
                    </div>

                    <div className="text-xs font-mono text-[#64748B] truncate">
                      SHA: {group.shortHash}
                    </div>

                    <div className="flex justify-between items-center text-xs text-[#64748B] pt-1 border-t border-[#E2E8F0]/60">
                      <span>{group.sectorName}</span>
                      <span className="font-semibold text-[#172033]">{group.sizeFormatted}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Forensic Dossier View */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            {currentGroup && (
              <>
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E2E8F0] gap-2">
                    <div>
                      <h3 className="text-base font-bold text-[#172033]">
                        {currentGroup.sectorName}
                      </h3>
                      <p className="text-xs text-[#64748B] mt-0.5 font-mono">
                        Full SHA-256: {currentGroup.hash}
                      </p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 bg-[#EEF2FF] text-[#5B5CE2] border border-[#C7D2FE] rounded-lg self-start sm:self-auto">
                      Identical Digest
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                      Files with this fingerprint ({currentGroup.files.length})
                    </span>
                    <div className="divide-y divide-[#F1F5F9] border border-[#E2E8F0] rounded-xl overflow-hidden">
                      {currentGroup.files.map((file, idx) => {
                        const isRetained = retainedPathSet.has(file.path);
                        return (
                          <div
                            key={file.id}
                            className={`p-3 flex items-center justify-between text-xs gap-3 ${
                              isRetained ? 'bg-[#F0FDF4]' : 'bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-xs text-[#94A3B8] font-mono shrink-0">{idx + 1}.</span>
                              <span className="text-xs text-[#172033] truncate font-medium" title={file.path}>
                                {file.path}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs font-semibold text-[#64748B]">{file.size}</span>
                              {isRetained && (
                                <span className="text-[11px] bg-[#DCFCE7] text-[#15803D] px-2 py-0.5 rounded-full font-semibold">
                                  Original
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Retained vs Duplicate Comparison Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {preferredFile && (
                    <div className="bg-white border-2 border-[#16A34A]/30 rounded-xl p-4 shadow-xs flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex justify-between items-center pb-2 border-b border-[#E2E8F0]">
                          <span className="text-xs font-bold uppercase tracking-wider text-[#15803D]">
                            Original (Preserved)
                          </span>
                          <span className="bg-[#DCFCE7] text-[#15803D] text-xs px-2 py-0.5 rounded-full font-semibold">
                            Protected
                          </span>
                        </div>
                        <div className="text-xs space-y-1.5 mt-3">
                          <div className="flex justify-between">
                            <span className="text-[#64748B]">Resolution:</span>
                            <span className="font-semibold text-[#172033]">{preferredFile.resolution}</span>
                          </div>
                          <div>
                            <span className="text-[#64748B] block text-[11px] mb-1">Path:</span>
                            <div className="p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs break-all text-[#172033]">
                              {preferredFile.path}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {candidateFile && (
                    <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex justify-between items-center pb-2 border-b border-[#E2E8F0]">
                          <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                            Candidate Copy
                          </span>
                          <span className="bg-[#FEF2F2] text-[#DC2626] text-xs px-2 py-0.5 rounded-full font-semibold">
                            Duplicate
                          </span>
                        </div>
                        <div className="text-xs space-y-1.5 mt-3">
                          <div className="flex justify-between">
                            <span className="text-[#64748B]">Resolution:</span>
                            <span className="font-semibold text-[#172033]">{candidateFile.resolution}</span>
                          </div>
                          <div>
                            <span className="text-[#64748B] block text-[11px] mb-1">Path:</span>
                            <div className="p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs break-all text-[#172033]">
                              {candidateFile.path}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {isConfirmOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-duplicate-deletion-title"
            className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xl p-6 max-w-lg w-full space-y-5 text-sm text-[#172033]"
          >
            <div className="flex items-start gap-3.5 pb-2">
              <div className="w-10 h-10 rounded-xl bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 id="confirm-duplicate-deletion-title" className="text-lg font-bold text-[#172033]">
                  Confirm Duplicate Deletion
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Scope: {targetContext}
                </p>
              </div>
            </div>

            <div className="space-y-3 leading-relaxed text-sm">
              <p>
                You are about to delete <strong className="text-[#DC2626]">{selectedCount} duplicate file{selectedCount === 1 ? '' : 's'}</strong> ({formatBytes(selectedBytes)}).
              </p>
              <div className="border border-[#BBF7D0] bg-[#F0FDF4] rounded-xl p-3.5 space-y-1.5 text-xs text-[#166534]">
                <div className="flex items-center gap-1.5 font-bold">
                  <ShieldCheck size={16} className="text-[#16A34A]" /> Safe Protection Guarantee
                </div>
                <div>
                  At least one original copy in each group is preserved and will NOT be touched.
                </div>
                <div className="text-[#15803D] pt-1">
                  Reversible: Files are safely moved to the local recovery vault and can be restored.
                </div>
              </div>
            </div>

            {deletionError && (
              <div className="p-3 border border-[#FCA5A5] bg-[#FEF2F2] text-[#DC2626] rounded-lg text-xs" role="alert">
                {deletionError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsConfirmOpen(false)}
                className="px-4 py-2 border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-[#334155] rounded-lg text-sm font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting || selectedCount === 0}
                onClick={() => { void handleExecuteDeletion(); }}
                className="px-5 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer disabled:opacity-40 shadow-xs"
              >
                {isDeleting ? 'Deleting Files...' : `Delete ${selectedCount} File${selectedCount === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
