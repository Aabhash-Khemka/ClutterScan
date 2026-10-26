import React, { useState, useMemo } from 'react';
import { NavTab, HashGroup, DuplicateFile } from '../types';
import { api } from '../services/api';
import {
  Folder,
  Trash2,
  FileCheck,
  Shield,
  Layers,
  ChevronDown,
  ChevronRight,
  CheckSquare,
  Square,
  MinusSquare,
  Search,
  Filter,
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
  onStageDuplicates,
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

  // View mode: 'folder' (Folder-scoped view with bulk folder selection) or 'group' (Cryptographic SHA-256 group dossier)
  const [viewMode, setViewMode] = useState<'folder' | 'group'>('folder');

  // Selected duplicate file paths for deletion
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());

  // Search and filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'IMAGE' | 'DOC' | 'ARCHIVE'>('ALL');
  const [folderPage, setFolderPage] = useState<number>(1);
  const folderPageSize = 30;

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
  // Retained copy is either explicit file.isPreferred or the first file in the group
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

  React.useEffect(() => {
    setFolderPage(1);
  }, [searchQuery, filterMode]);

  const totalFolderPages = Math.max(1, Math.ceil(filteredFolderGroups.length / folderPageSize));
  const paginatedFolderGroups = useMemo(() => {
    const start = (folderPage - 1) * folderPageSize;
    return filteredFolderGroups.slice(start, start + folderPageSize);
  }, [filteredFolderGroups, folderPage]);

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

  // Selected files count (only count eligible duplicate files)
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
    // Retained copy is protected from selection
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

      // Clean up local groups
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

      // Clear deleted files from selection
      setSelectedPaths((prev) => {
        const next = new Set(prev);
        successfullyDeleted.forEach((p) => next.delete(p));
        return next;
      });

      setIsConfirmOpen(false);

      const msg =
        failedCount > 0
          ? `Bulk deletion completed: ${deletedCount} files moved to recovery, ${failedCount} files failed.`
          : `Successfully deleted ${deletedCount} duplicate file${deletedCount === 1 ? '' : 's'}. Moved to recovery.`;

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

  // Individual deletion
  const handleSingleDelete = async (filePath: string) => {
    if (retainedPathSet.has(filePath)) return;
    setSelectedPaths(new Set([filePath]));
    setTargetContext(filePath);
    setIsConfirmOpen(true);
  };

  // Current group for group dossier view
  const currentGroup: HashGroup | undefined =
    groups.find((g) => g.id === selectedGroupId) || groups[0];
  const preferredFile = currentGroup?.files.find((f) => f.isPreferred) || currentGroup?.files[0];
  const candidateFile =
    currentGroup?.files.find((f) => !f.isPreferred) || currentGroup?.files[1] || currentGroup?.files[0];

  return (
    <div className="w-full flex flex-col gap-6 text-[#f5f5f5] pb-12">
      {/* A. HEADER */}
      <section className="w-full border-b border-[#303030] pb-5 flex flex-col md:flex-row justify-between items-start md:items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-[#f5f5f5] tracking-tight">
              Duplicate Files
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-[2px] bg-[#1b1b1b] border border-[#454545] text-[#b8b8b8]">
              SHA-256 MATCHES
            </span>
          </div>
          <p className="text-sm md:text-base text-[#b8b8b8]">
            Review identical copies grouped by folder or cryptographic hash. Original files are protected automatically.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-white font-semibold border border-[#303030] px-3 py-1.5 bg-[#141414] rounded-[2px] flex items-center gap-2">
            <Shield size={14} className="text-[#57b887]" />
            <span>ORIGINAL COPY PROTECTED</span>
          </span>
        </div>
      </section>

      {/* SUMMARY METRICS STRIP */}
      <section className="w-full bg-[#141414] border border-[#303030] rounded-[2px] p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-sm">
          <div className="flex flex-col gap-1">
            <span className="text-[#858585] text-xs uppercase font-medium">Duplicate Groups</span>
            <span className="text-white font-bold text-2xl md:text-3xl font-mono tabular-nums">{groups.length}</span>
          </div>
          <div className="flex flex-col gap-1 border-l border-[#303030] pl-6">
            <span className="text-[#858585] text-xs uppercase font-medium">Total Files</span>
            <span className="text-white font-bold text-2xl md:text-3xl font-mono tabular-nums">{totalDuplicateFiles}</span>
          </div>
          <div className="flex flex-col gap-1 border-l border-[#303030] pl-6">
            <span className="text-[#858585] text-xs uppercase font-medium">Redundant Copies</span>
            <span className="text-white font-bold text-2xl md:text-3xl font-mono tabular-nums">{totalEligibleFilesCount}</span>
          </div>
          <div className="flex flex-col gap-1 border-l border-[#303030] pl-6">
            <span className="text-[#858585] text-xs uppercase font-medium">Reclaimable Space</span>
            <span className="text-[#57b887] font-bold text-2xl md:text-3xl font-mono tabular-nums">{formatBytes(potentialRecoveryBytes)}</span>
          </div>
        </div>
      </section>

      {/* SUCCESS BANNER */}
      {deletionSuccessNotice && (
        <div className="w-full bg-[#141414] border border-[#57b887] rounded-[2px] p-4 text-sm text-white flex items-center justify-between">
          <span className="font-medium flex items-center gap-2 text-[#57b887]">
            <span>✓</span> {deletionSuccessNotice}
          </span>
          <button
            type="button"
            onClick={() => setDeletionSuccessNotice(null)}
            className="text-[#858585] hover:text-white cursor-pointer uppercase text-xs"
          >
            [Dismiss]
          </button>
        </div>
      )}

      {/* B. ACTION AREA & CONTROLS */}
      <section className="w-full bg-[#141414] border border-[#303030] rounded-[2px] p-4 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
        {/* Search & Filter */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[240px] flex-1 sm:flex-initial">
            <Search size={15} className="absolute left-3.5 top-3 text-[#858585]" />
            <input
              type="search"
              aria-label="Search duplicate files or folders"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search filename or path..."
              className="w-full bg-[#080808] border border-[#303030] pl-10 pr-3 py-2 text-sm text-[#f5f5f5] placeholder:text-[#858585] focus:border-white focus:outline-none rounded-[2px]"
            />
          </div>

          <div className="flex items-center border border-[#303030] rounded-[2px] overflow-hidden">
            {(['ALL', 'IMAGE', 'DOC', 'ARCHIVE'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setFilterMode(mode)}
                className={`px-3.5 py-2 text-xs font-semibold uppercase transition-all cursor-pointer ${
                  filterMode === mode
                    ? 'bg-white text-black'
                    : 'bg-[#141414] text-[#b8b8b8] hover:text-white hover:bg-[#1b1b1b]'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Toggle View Mode */}
          <div className="flex items-center border border-[#303030] rounded-[2px] overflow-hidden ml-auto">
            <button
              type="button"
              onClick={() => setViewMode('folder')}
              className={`px-4 py-2 text-xs font-semibold uppercase transition-all cursor-pointer flex items-center gap-2 ${
                viewMode === 'folder'
                  ? 'bg-white text-black'
                  : 'bg-[#141414] text-[#b8b8b8] hover:text-white hover:bg-[#1b1b1b]'
              }`}
            >
              <Folder size={14} /> Folder View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('group')}
              className={`px-4 py-2 text-xs font-semibold uppercase transition-all cursor-pointer flex items-center gap-2 ${
                viewMode === 'group'
                  ? 'bg-white text-black'
                  : 'bg-[#141414] text-[#b8b8b8] hover:text-white hover:bg-[#1b1b1b]'
              }`}
            >
              <Layers size={14} /> Hash Groups
            </button>
          </div>
        </div>

        {/* Global Bulk Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-[#303030]">
          <button
            type="button"
            onClick={handleSelectAllInView}
            className="px-4 py-2 border border-[#454545] bg-[#1b1b1b] text-[#f5f5f5] hover:border-white text-xs font-semibold uppercase cursor-pointer flex items-center gap-2 rounded-[2px]"
          >
            {selectedCount > 0 && selectedCount === totalEligibleFilesCount ? (
              <CheckSquare size={15} className="text-white" />
            ) : selectedCount > 0 ? (
              <MinusSquare size={15} className="text-white" />
            ) : (
              <Square size={15} />
            )}
            <span>Select All Duplicates</span>
          </button>

          <div className="text-sm text-[#b8b8b8]">
            <span className="text-white font-bold font-mono">{selectedCount}</span> of {totalEligibleFilesCount} selected ({formatBytes(selectedBytes)})
          </div>

          <button
            type="button"
            disabled={selectedCount === 0 || isDeleting}
            onClick={() => handleTriggerBulkDelete()}
            className="px-6 py-2.5 bg-[#c90000] text-white font-semibold text-sm uppercase tracking-wider transition-all hover:bg-[#a00000] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 rounded-[2px]"
          >
            <Trash2 size={15} />
            <span>Delete Selected ({selectedCount})</span>
          </button>
        </div>
      </section>

      {/* ZERO DUPLICATES STATE */}
      {groups.length === 0 ? (
        <div className="w-full min-h-[400px] border-b border-[#303030] bg-[#0b0b0b] p-8 flex flex-col items-center justify-center gap-4 text-center">
          <div className="text-base font-bold text-white tracking-widest uppercase">
            [ZERO_DUPLICATES_DETECTED]
          </div>
          <div className="text-xs text-[#858585] max-w-lg leading-relaxed uppercase">
            All scanned files exhibit unique cryptographic hashes. No redundant file copies require cleanup.
          </div>
          <button
            type="button"
            onClick={() => onNavigate('storage')}
            className="mt-2 px-6 py-2.5 border border-white bg-white text-black font-bold uppercase transition-none hover:bg-neutral-200 cursor-pointer"
          >
            → RETURN TO STORAGE
          </button>
        </div>
      ) : viewMode === 'folder' ? (
        /* C. FOLDER GROUPS VIEW */
        <div className="w-full flex flex-col divide-y divide-[#303030]">
          {filteredFolderGroups.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#858585]">
              No duplicate files match your search and filter criteria.
            </div>
          ) : (
            paginatedFolderGroups.map((fg) => {
              const eligiblePaths = fg.eligibleFiles.map((f) => f.path);
              const selectedInFolder = eligiblePaths.filter((p) => selectedEligiblePaths.has(p));
              const isAllSelected = eligiblePaths.length > 0 && selectedInFolder.length === eligiblePaths.length;
              const isPartiallySelected = selectedInFolder.length > 0 && !isAllSelected;
              const isExpanded = expandedFolders[fg.folderPath] !== false; // expanded by default

              return (
                <section
                  key={fg.folderPath}
                  className="w-full bg-[#000000] flex flex-col transition-colors"
                >
                  {/* FOLDER GROUP HEADER & SELECTION BAR */}
                  <div className="w-full bg-[#0b0b0b] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-l-2 border-white">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Folder-level Select All Checkbox */}
                      <button
                        type="button"
                        aria-label={`Select all ${eligiblePaths.length} duplicates in folder ${fg.folderName}`}
                        onClick={() => handleToggleFolder(fg)}
                        disabled={eligiblePaths.length === 0}
                        className="p-1 text-white hover:text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                      >
                        {isAllSelected ? (
                          <CheckSquare size={16} className="text-white" />
                        ) : isPartiallySelected ? (
                          <MinusSquare size={16} className="text-white" />
                        ) : (
                          <Square size={16} className="text-[#858585]" />
                        )}
                      </button>

                      {/* Expand / Collapse Toggle */}
                      <button
                        type="button"
                        onClick={() => toggleFolderExpanded(fg.folderPath)}
                        className="flex items-center gap-2 text-left cursor-pointer group truncate"
                      >
                        {isExpanded ? (
                          <ChevronDown size={14} className="text-[#858585] group-hover:text-white shrink-0" />
                        ) : (
                          <ChevronRight size={14} className="text-[#858585] group-hover:text-white shrink-0" />
                        )}
                        <Folder size={14} className="text-white shrink-0" />
                        <div className="flex flex-col truncate">
                          <span className="font-bold text-xs text-white uppercase tracking-wider group-hover:underline truncate">
                            {fg.folderName}/
                          </span>
                          <span className="text-[11px] text-[#858585] truncate font-mono" title={fg.folderPath}>
                            {fg.folderPath}
                          </span>
                        </div>
                      </button>
                    </div>

                    {/* Folder Metrics & Bulk Action */}
                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center text-xs">
                      <span className="text-[#858585] text-[11px]">
                        <span className="text-white font-bold">{selectedInFolder.length}</span> / {eligiblePaths.length} selected
                      </span>

                      <button
                        type="button"
                        disabled={selectedInFolder.length === 0 || isDeleting}
                        onClick={() => handleTriggerBulkDelete(`Folder ${fg.folderName} (${selectedInFolder.length} files)`)}
                        className="px-3 py-1 border border-[#c90000] bg-transparent text-[#ffffff] hover:bg-[#c90000] text-[11px] font-bold uppercase transition-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <Trash2 size={11} /> Delete selected ({selectedInFolder.length})
                      </button>
                    </div>
                  </div>

                  {/* D. FILE ROWS IN THIS FOLDER */}
                  {isExpanded && (
                    <div className="w-full flex flex-col divide-y divide-[#181818]">
                      {fg.files.map((file) => {
                        const isRetained = retainedPathSet.has(file.path);
                        const isSelected = selectedEligiblePaths.has(file.path);

                        return (
                          <div
                            key={file.id}
                            className={`w-full px-4 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs transition-colors ${
                              isRetained
                                ? 'bg-[#000000]'
                                : isSelected
                                ? 'bg-[#181818] border-l-2 border-white'
                                : 'bg-[#050505] hover:bg-[#0e0e0e]'
                            }`}
                          >
                            {/* Checkbox + Name + Path */}
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {/* Selection checkbox */}
                              {isRetained ? (
                                <span
                                  title="Original copy preserved (Protected)"
                                  className="p-1 cursor-default text-[#858585]"
                                >
                                  <FileCheck size={15} className="text-white" />
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  aria-label={`Select ${file.name} for deletion`}
                                  onClick={() => handleToggleSingleFile(file.path)}
                                  className="p-1 text-white hover:text-white cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                                >
                                  {isSelected ? (
                                    <CheckSquare size={15} className="text-white" />
                                  ) : (
                                    <Square size={15} className="text-[#858585]" />
                                  )}
                                </button>
                              )}

                              {/* File Identity */}
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`font-semibold text-[15px] sm:text-base truncate ${
                                      isRetained ? 'text-[#f5f5f5]' : isSelected ? 'text-white' : 'text-[#f5f5f5]'
                                    }`}
                                    title={file.name}
                                  >
                                    {file.name}
                                  </span>
                                  {isRetained && (
                                    <span className="text-xs px-2 py-0.5 bg-white text-black font-semibold uppercase tracking-wider rounded-[2px]">
                                      Original (Keep)
                                    </span>
                                  )}
                                  {!isRetained && (
                                    <span className="text-xs px-2 py-0.5 border border-[#454545] text-[#b8b8b8] uppercase font-mono rounded-[2px]">
                                      Duplicate
                                    </span>
                                  )}
                                </div>
                                <span
                                  className="text-xs md:text-sm text-[#858585] truncate font-mono mt-0.5"
                                  title={file.path}
                                >
                                  {file.path}
                                </span>
                              </div>
                            </div>

                            {/* Metadata & Actions */}
                            <div className="flex items-center gap-4 shrink-0 pl-7 md:pl-0">
                              <span className="text-sm font-semibold font-mono text-white tabular-nums whitespace-nowrap">
                                {file.size}
                              </span>

                              {file.resolution && file.resolution !== 'N/A' && (
                                <span className="text-xs text-[#b8b8b8] whitespace-nowrap font-mono">
                                  {file.resolution}
                                </span>
                              )}

                              <span className="text-xs text-[#858585] border border-[#303030] px-2 py-0.5 rounded-[2px] whitespace-nowrap font-mono">
                                {file.groupSector}
                              </span>

                              {/* Individual Action */}
                              {isRetained ? (
                                <span className="text-[11px] text-[#858585] uppercase px-2 py-1">
                                  Protected
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleSingleDelete(file.path)}
                                  className="text-[11px] text-[#c90000] hover:text-white hover:bg-[#c90000] border border-[#c90000] px-2 py-1 uppercase font-bold transition-none cursor-pointer"
                                  title="Delete this individual duplicate copy"
                                >
                                  Delete copy
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })
          )}
          {totalFolderPages > 1 && (
            <div className="flex items-center justify-between p-4 bg-[#0b0b0b] text-xs font-mono border-t border-[#303030]">
              <span className="text-[#858585]">
                Showing folder batch {(folderPage - 1) * folderPageSize + 1}–{Math.min(folderPage * folderPageSize, filteredFolderGroups.length)} of {filteredFolderGroups.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={folderPage <= 1}
                  onClick={() => setFolderPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 border border-[#303030] bg-[#141414] text-white disabled:opacity-30 disabled:cursor-not-allowed hover:border-white transition-colors"
                >
                  Prev
                </button>
                <span className="text-white px-2">Page {folderPage} of {totalFolderPages}</span>
                <button
                  type="button"
                  disabled={folderPage >= totalFolderPages}
                  onClick={() => setFolderPage((p) => Math.min(totalFolderPages, p + 1))}
                  className="px-3 py-1 border border-[#303030] bg-[#141414] text-white disabled:opacity-30 disabled:cursor-not-allowed hover:border-white transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* HASH DOSSIER SPLIT VIEW (Preserved from original implementation) */
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 min-h-[600px] border-b border-[#303030]">
          {/* LEFT COLUMN: HASH GROUPS SELECTOR */}
          <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-[#303030] p-4 flex flex-col gap-4 bg-[#0b0b0b]">
            <div className="flex items-center justify-between pb-2 border-b border-[#303030] text-xs font-bold text-white tracking-widest">
              <span>[HASH_GROUPS]</span>
              <span className="text-[#858585]">SECTORS: 001 - {groups.length.toString().padStart(3, '0')}</span>
            </div>

            <div className="flex flex-col gap-3">
              {groups.map((group) => {
                const isSelected = group.id === selectedGroupId;
                return (
                  <div
                    key={group.id}
                    onClick={() => setSelectedGroupId(group.id)}
                    className={`w-full p-4 border transition-none cursor-pointer flex flex-col gap-2 ${
                      isSelected
                        ? 'bg-white text-black border-white'
                        : 'bg-[#000000] text-white border-[#303030] hover:border-[#484848]'
                    }`}
                  >
                    <div className="flex justify-between items-center text-xs font-bold tracking-widest">
                      <span>HASH GROUP #{group.id}</span>
                      <span
                        className={`px-1.5 py-0.5 text-[10px] uppercase font-bold border ${
                          isSelected
                            ? 'bg-black text-white border-black'
                            : 'border-[#484848] text-[#b0b0b0]'
                        }`}
                      >
                        {isSelected ? '[ACTIVE]' : '[STANDBY]'}
                      </span>
                    </div>

                    <div
                      className={`text-xs font-mono break-all ${
                        isSelected ? 'text-black font-bold' : 'text-[#b0b0b0]'
                      }`}
                    >
                      SHA-256: {group.shortHash}
                    </div>

                    <div
                      className={`grid grid-cols-2 gap-2 pt-1 text-[11px] uppercase border-t ${
                        isSelected ? 'border-neutral-300 text-black' : 'border-[#303030] text-[#858585]'
                      }`}
                    >
                      <div>MATCHES: {group.matchCount} FILES</div>
                      <div className="text-right font-bold">SIZE: {group.sizeFormatted}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: FORENSIC DOSSIER & RESOLUTION */}
          <div className="lg:col-span-8 p-4 lg:p-6 flex flex-col gap-6 bg-[#000000]">
            {currentGroup && (
              <>
                <div className="flex flex-col gap-2 border border-[#303030] p-4 bg-[#0b0b0b]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#303030] pb-2 gap-2">
                    <span className="text-white font-bold text-sm uppercase tracking-wider">
                      [GROUP_ANALYSIS :: {currentGroup.sectorName}]
                    </span>
                    <span className="text-white text-[10px] uppercase border border-white px-2 py-0.5">
                      IDENTICAL SHA-256
                    </span>
                  </div>

                  <div className="text-[11px] text-[#b0b0b0] pt-1 break-all">
                    <span className="text-[#858585]">SHA-256: </span>
                    {currentGroup.hash}
                  </div>

                  <div className="pt-2 flex flex-col gap-1.5">
                    <div className="text-[#858585] text-[10px] uppercase tracking-wider">
                      Files sharing this digest:
                    </div>
                    {currentGroup.files.map((file, idx) => (
                      <div
                        key={file.id}
                        className={`flex items-center justify-between border-l pl-3 py-1.5 bg-[#000000] text-xs ${
                          retainedPathSet.has(file.path)
                            ? 'border-white text-white font-bold'
                            : 'border-[#484848] text-[#b0b0b0]'
                        }`}
                      >
                        <span className="truncate max-w-xl">
                          {idx + 1}. {file.path}
                        </span>
                        <div className="flex items-center gap-2 pl-2">
                          <span className="text-[11px] text-[#858585] whitespace-nowrap">
                            ({file.size})
                          </span>
                          {retainedPathSet.has(file.path) && (
                            <span className="text-[9px] bg-white text-black px-1 font-bold">
                              ORIGINAL
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Retained copy vs matching copy rationale */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {preferredFile && (
                    <div className="border border-white bg-[#0b0b0b] p-4 flex flex-col justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start border-b border-[#303030] pb-2">
                          <span className="text-xs font-bold text-white tracking-widest uppercase">
                            Original (Retained)
                          </span>
                          <span className="bg-white text-black text-[10px] px-1.5 py-0.5 uppercase font-bold">
                            PROTECTED
                          </span>
                        </div>
                        <div className="text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-[#858585]">STATUS:</span>
                            <span className="text-white font-bold">{preferredFile.status}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#858585]">DIMENSIONS:</span>
                            <span className="text-white font-bold">{preferredFile.resolution}</span>
                          </div>
                          <div className="pt-1">
                            <span className="text-[#858585] block mb-0.5 text-[10px]">PATH:</span>
                            <span className="text-white break-all block bg-[#000000] p-1.5 border border-[#303030] text-[11px]">
                              {preferredFile.path}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {candidateFile && (
                    <div className="border border-[#484848] bg-[#0b0b0b] p-4 flex flex-col justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start border-b border-[#303030] pb-2">
                          <span className="text-xs font-bold text-[#b0b0b0] tracking-widest uppercase">
                            Duplicate copy
                          </span>
                          <span className="border border-[#484848] text-[#b0b0b0] text-[10px] px-1.5 py-0.5 uppercase">
                            CANDIDATE
                          </span>
                        </div>
                        <div className="text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-[#858585]">STATUS:</span>
                            <span className="text-white font-bold">{candidateFile.status}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#858585]">DIMENSIONS:</span>
                            <span className="text-white font-bold">{candidateFile.resolution}</span>
                          </div>
                          <div className="pt-1">
                            <span className="text-[#858585] block mb-0.5 text-[10px]">PATH:</span>
                            <span className="text-[#b0b0b0] break-all block bg-[#000000] p-1.5 border border-[#303030] text-[11px]">
                              {candidateFile.path}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Hex Stream View */}
                {currentGroup.hexSample && currentGroup.hexSample.length > 0 && (
                  <div className="border border-[#303030] p-4 bg-[#0b0b0b] space-y-2">
                    <div className="flex justify-between items-center text-[#858585] text-[11px] border-b border-[#303030] pb-2 uppercase">
                      <span>HEX_STREAM_INSPECTION :: BYTE_RANGE [0x0000 - 0x003F]</span>
                      <span>ENCODING: RAW_LITTLE_ENDIAN</span>
                    </div>
                    <div className="text-xs text-[#b0b0b0] overflow-x-auto whitespace-pre leading-relaxed select-all font-mono">
                      {currentGroup.hexSample.map((line, idx) => (
                        <div key={idx}>{line}</div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {isConfirmOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-duplicate-deletion-title"
            className="border-2 border-white bg-[#0b0b0b] p-6 max-w-lg w-full space-y-5 font-mono text-xs text-white"
          >
            <div className="border-b border-[#303030] pb-3 flex justify-between items-start">
              <div>
                <div id="confirm-duplicate-deletion-title" className="text-sm font-bold text-white uppercase tracking-widest">
                  [CONFIRM_BULK_DUPLICATE_DELETION]
                </div>
                <div className="text-[11px] text-[#858585] mt-0.5 uppercase">
                  Scope: {targetContext}
                </div>
              </div>
            </div>

            <div className="space-y-3 leading-relaxed text-xs">
              <p className="font-bold text-white">
                You are about to delete <span className="text-[#c90000] underline">{selectedCount} eligible duplicate file{selectedCount === 1 ? '' : 's'}</span> ({formatBytes(selectedBytes)}).
              </p>
              <div className="border border-[#303030] bg-[#000000] p-3 space-y-1.5 text-[11px] text-[#b0b0b0]">
                <div className="flex items-center gap-1.5 text-white font-bold">
                  <Shield size={13} className="text-white" /> Retained copy protection active:
                </div>
                <div>
                  At least one original copy of each duplicate group is protected and will NOT be deleted.
                </div>
                <div className="text-[#858585] pt-1">
                  Reversibility: Files are moved to OS Recycle Bin when supported; otherwise stored in ClutterScan local recovery vault.
                </div>
              </div>
            </div>

            {deletionError && (
              <div className="p-3 border border-[#c90000] bg-[#1a0000] text-white text-xs" role="alert">
                {deletionError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t border-[#303030]">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsConfirmOpen(false)}
                className="px-4 py-2 border border-[#484848] text-[#b0b0b0] hover:text-white transition-none uppercase cursor-pointer"
              >
                [ CANCEL ]
              </button>
              <button
                type="button"
                disabled={isDeleting || selectedCount === 0}
                onClick={() => { void handleExecuteDeletion(); }}
                className="px-6 py-2 border border-[#c90000] bg-[#c90000] text-white font-bold uppercase transition-none hover:bg-[#a00000] cursor-pointer disabled:opacity-40"
              >
                {isDeleting ? 'DELETING FILES...' : `DELETE ${selectedCount} FILES`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
