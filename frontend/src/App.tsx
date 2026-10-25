import React, { useState, useEffect } from 'react';
import { NavTab, MetadataFileItem, CleanupCandidateRecord, RecoveryLogItem } from './types';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { HomeScreen } from './screens/HomeScreen';
import { StorageScreen } from './screens/StorageScreen';
import { DuplicatesScreen } from './screens/DuplicatesScreen';
import { ImagesScreen } from './screens/ImagesScreen';
import { FilesScreen } from './screens/FilesScreen';
import { CleanupScreen } from './screens/CleanupScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { OrganizeScreen } from './screens/OrganizeScreen';

import {
  TreeNode,
  HashGroup,
  PerceptualCluster,
  HistoricalScanEntry,
  SnapshotDeltaItem,
  CleanupExecutionSummary,
} from './types';
import { api } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [files, setFiles] = useState<MetadataFileItem[]>([]);
  const [candidates, setCandidates] = useState<CleanupCandidateRecord[]>([]);
  const [recoveryLog, setRecoveryLog] = useState<RecoveryLogItem[]>([]);
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [hashGroups, setHashGroups] = useState<HashGroup[]>([]);
  const [perceptualClusters, setPerceptualClusters] = useState<PerceptualCluster[]>([]);
  const [historicalScans, setHistoricalScans] = useState<HistoricalScanEntry[]>([]);
  const [snapshotDeltas, setSnapshotDeltas] = useState<SnapshotDeltaItem[]>([]);
  const [stagedImageCandidateIds, setStagedImageCandidateIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentScanId, setCurrentScanId] = useState<string | null>(null);

  const loadScanData = async (scanId: string) => {
    setCurrentScanId(scanId);
    try {
      const [tree, dups, simImages, metadataFiles, recs, hist] = await Promise.all([
        api.getFilesystemTree(scanId).catch(() => []),
        api.getDuplicates(scanId).catch(() => []),
        api.getSimilarImages(scanId).catch(() => []),
        api.getFiles(scanId).catch(() => []),
        api.getRecommendations(scanId).catch(() => []),
        api.getHistory().catch(() => null),
      ]);

      if (Array.isArray(tree)) setTreeData(tree);
      if (Array.isArray(dups)) setHashGroups(dups);
      if (Array.isArray(simImages)) setPerceptualClusters(simImages);
      if (Array.isArray(metadataFiles)) setFiles(metadataFiles);
      if (Array.isArray(recs)) setCandidates(recs);
      if (hist) {
        if (Array.isArray(hist.historicalScans)) setHistoricalScans(hist.historicalScans);
        if (Array.isArray(hist.snapshotDeltas)) setSnapshotDeltas(hist.snapshotDeltas);
        if (Array.isArray(hist.recoveryEntries)) setRecoveryLog(hist.recoveryEntries);
      }
    } catch (err) {
      console.warn('Error loading scan artifacts:', err);
    }
  };

  // Load latest scan and history on mount
  useEffect(() => {
    api.getLatestScan()
      .then((scan) => {
        if (scan?.scanId) {
          loadScanData(scan.scanId);
        }
      })
      .catch(() => {});

    api.getHistory()
      .then((data) => {
        if (data.historicalScans) setHistoricalScans(data.historicalScans);
        if (data.snapshotDeltas) setSnapshotDeltas(data.snapshotDeltas);
        if (data.recoveryEntries) setRecoveryLog(data.recoveryEntries);
      })
      .catch(() => {});
  }, []);

  // Synchronize with URL hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (
        hash === 'home' ||
        hash === 'storage' ||
        hash === 'duplicates' ||
        hash === 'images' ||
        hash === 'files' ||
        hash === 'organize' ||
        hash === 'cleanup' ||
        hash === 'history'
      ) {
        setActiveTab(hash as NavTab);
      } else {
        setActiveTab('home');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (tab: NavTab) => {
    window.location.hash = tab;
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((cur) => (cur === message ? null : cur));
    }, 3500);
  };

  // Toggle stage for a file in Files tab
  const handleToggleStageFile = (fileId: string) => {
    setFiles((prev) =>
      prev.map((f) => {
        if (f.id === fileId) {
          const nextStaged = !f.isStaged;
          if (nextStaged) {
            setCandidates((cand) => {
              if (cand.some((c) => c.targetPath === f.path)) {
                return cand.map((c) =>
                  c.targetPath === f.path ? { ...c, isSelected: true } : c
                );
              }
              const newRecord: CleanupCandidateRecord = {
                id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                rank: 'MANUALLY_SELECTED',
                targetPath: f.path,
                reasons: [f.type, f.reason],
                recoverableFormatted: f.size,
                bytes: f.bytes,
                isSelected: true,
              };
              return [...cand, newRecord];
            });
          } else {
            setCandidates((cand) =>
              cand.map((c) =>
                c.targetPath === f.path ? { ...c, isSelected: false } : c
              )
            );
          }
          return { ...f, isStaged: nextStaged };
        }
        return f;
      })
    );
  };

  // Bulk stage files
  const handleBulkStageFiles = (fileIds: string[], stage: boolean) => {
    const selectedFiles = files.filter((file) => fileIds.includes(file.id));
    const selectedPaths = new Set(selectedFiles.map((file) => file.path));
    setFiles((prev) => prev.map((f) => (
      fileIds.includes(f.id) ? { ...f, isStaged: stage } : f
    )));
    setCandidates((current) => {
      const updated = current.map((candidate) => (
        selectedPaths.has(candidate.targetPath)
          ? { ...candidate, isSelected: stage }
          : candidate
      ));
      const knownPaths = new Set(updated.map((candidate) => candidate.targetPath));
      const manuallySelected = stage
        ? selectedFiles
            .filter((file) => !knownPaths.has(file.path))
            .map((file) => ({
              id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              rank: 'MANUALLY_SELECTED',
              targetPath: file.path,
              reasons: [file.type, file.reason],
              recoverableFormatted: file.size,
              bytes: file.bytes,
              isSelected: true,
            }))
        : [];
      return [...updated, ...manuallySelected];
    });
    showToast(
      stage
        ? `Added ${fileIds.length} files to cleanup queue`
        : `Removed ${fileIds.length} files from cleanup queue`
    );
  };

  // Stage duplicates from Duplicates screen
  const handleStageDuplicates = (paths: string[], selected: boolean) => {
    const duplicatePaths = new Set(paths);
    const stagedCount = candidates.filter((candidate) =>
      duplicatePaths.has(candidate.targetPath)
    ).length;
    setCandidates((current) =>
      current.map((candidate) => (
        duplicatePaths.has(candidate.targetPath)
          ? { ...candidate, isSelected: selected }
          : candidate
      ))
    );
    showToast(
      stagedCount > 0
        ? `${selected ? 'Selected' : 'Unselected'} ${stagedCount} files for cleanup review`
        : 'Duplicate files queued for review'
    );
    return stagedCount;
  };

  // Stage image candidate from Images screen
  const handleStageImageCandidate = (id: string) => {
    setStagedImageCandidateIds((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((item) => item !== id) : [...prev, id];
      showToast(
        exists
          ? 'Image removed from review queue.'
          : 'Image marked for review.'
      );
      return next;
    });
  };

  const handleToggleCandidate = (id: string) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isSelected: !c.isSelected } : c))
    );
  };

  const handleSelectCandidates = (candidateIds: string[], select: boolean) => {
    const selectedIds = new Set(candidateIds);
    setCandidates((prev) =>
      prev.map((candidate) => (
        selectedIds.has(candidate.id)
          ? { ...candidate, isSelected: select }
          : candidate
      ))
    );
  };

  const handleScanCompleted = async (scanId?: string, totalFiles?: number) => {
    if (scanId) {
      await loadScanData(scanId);
    }
    const countDisplay = totalFiles !== undefined ? totalFiles.toLocaleString() : '0';
    showToast(`Scan complete: ${countDisplay} files analyzed.`);
  };

  const handleOpenHistoricalScan = async (scanId: string) => {
    await loadScanData(scanId);
    navigateTo('cleanup');
    showToast('Loaded historical scan results.');
  };

  const handleExecuteSafeCleanup = async (
    selectedRecords: CleanupCandidateRecord[]
  ): Promise<CleanupExecutionSummary> => {
    try {
      const res = await api.confirmCleanup(selectedRecords);
      const results = res.results ?? [];
      setRecoveryLog((prev) => [...results, ...prev]);
      const movedPaths = new Set(
        results
          .filter((result) => !result.status.startsWith('FAILED'))
          .map((result) => result.originPath)
      );
      setCandidates((prev) =>
        prev.map((candidate) => (
          movedPaths.has(candidate.targetPath)
            ? { ...candidate, isSelected: false }
            : candidate
        ))
      );
      const movedCount = results.filter((result) => !result.status.startsWith('FAILED')).length;
      const failedCount = results.length - movedCount;
      showToast(
        failedCount > 0
          ? `Cleanup complete: ${movedCount} moved, ${failedCount} skipped.`
          : `Cleanup complete: ${movedCount} files safely moved to recovery.`
      );
      return { movedCount, failedCount };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Cleanup could not be completed.';
      showToast(`Error: ${message}`);
      throw err;
    }
  };

  const handleRestoreItem = async (id: string) => {
    try {
      const result = await api.restoreFile(id);
      const hist = await api.getHistory().catch(() => null);
      if (hist) {
        if (Array.isArray(hist.historicalScans)) setHistoricalScans(hist.historicalScans);
        if (Array.isArray(hist.snapshotDeltas)) setSnapshotDeltas(hist.snapshotDeltas);
        if (Array.isArray(hist.recoveryEntries)) setRecoveryLog(hist.recoveryEntries);
      }
      showToast(`Restore complete: File returned to original directory.`);
      console.info('[Restore]', result.message);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'The file could not be restored.';
      showToast(`Restore error: ${message}`);
    }
  };

  const totalStagedCount = candidates.filter((c) => c.isSelected).length;

  return (
    <div className="min-h-screen bg-[#F5F7FB] text-[#172033] flex flex-row font-sans">
      {/* LEFT SAAS SIDEBAR */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={navigateTo}
        stagedFilesCount={totalStagedCount}
      />

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* GLOBAL TOPBAR */}
        <Navbar
          activeTab={activeTab}
          currentScanId={currentScanId}
          onRefreshLatest={currentScanId ? () => loadScanData(currentScanId) : undefined}
        />

        {/* TOAST NOTIFICATION BANNER */}
        {toastMessage && (
          <div className="fixed top-20 right-6 z-50 bg-[#172033] text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in border border-[#334155]">
            <span className="w-2 h-2 rounded-full bg-[#5B5CE2]"></span>
            <span>{toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="ml-2 text-[#94A3B8] hover:text-white cursor-pointer"
            >
              &times;
            </button>
          </div>
        )}

        {/* PAGE CONTENT CONTAINER */}
        <main className="flex-1 p-6 sm:p-8 md:p-10 max-w-7xl w-full mx-auto">
          {activeTab === 'home' && (
            <HomeScreen
              onNavigate={navigateTo}
              onScanCompleted={handleScanCompleted}
            />
          )}

          {activeTab === 'storage' && (
            <StorageScreen
              onNavigate={navigateTo}
              onShowNotice={showToast}
              treeData={treeData}
            />
          )}

          {activeTab === 'duplicates' && (
            <DuplicatesScreen
              onNavigate={navigateTo}
              onStageDuplicates={handleStageDuplicates}
              hashGroups={hashGroups}
              scanId={currentScanId}
              onRefreshData={async () => {
                if (currentScanId) await loadScanData(currentScanId);
              }}
              onShowNotice={showToast}
            />
          )}

          {activeTab === 'images' && (
            <ImagesScreen
              onNavigate={navigateTo}
              onStageImageCandidate={handleStageImageCandidate}
              stagedCandidateIds={stagedImageCandidateIds}
              onShowNotice={showToast}
              clusters={perceptualClusters}
            />
          )}

          {activeTab === 'files' && (
            <FilesScreen
              onNavigate={navigateTo}
              files={files}
              onToggleStageFile={handleToggleStageFile}
              onBulkStageFiles={handleBulkStageFiles}
            />
          )}

          {activeTab === 'organize' && (
            <OrganizeScreen
              onShowNotice={showToast}
            />
          )}

          {activeTab === 'cleanup' && (
            <CleanupScreen
              onNavigate={navigateTo}
              candidates={candidates}
              onToggleCandidate={handleToggleCandidate}
              onSelectCandidates={handleSelectCandidates}
              onExecuteSafeCleanup={handleExecuteSafeCleanup}
            />
          )}

          {activeTab === 'history' && (
            <HistoryScreen
              onNavigate={navigateTo}
              onOpenScan={handleOpenHistoricalScan}
              recoveryLog={recoveryLog}
              onRestoreItem={handleRestoreItem}
              onShowNotice={showToast}
              historicalScans={historicalScans}
              snapshotDeltas={snapshotDeltas}
            />
          )}
        </main>
      </div>
    </div>
  );
}
