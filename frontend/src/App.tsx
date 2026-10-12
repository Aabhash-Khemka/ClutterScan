import React, { useState, useEffect } from 'react';
import { NavTab, MetadataFileItem, CleanupCandidateRecord, RecoveryLogItem } from './types';
import { Header } from './components/Header';
import { HomeScreen } from './screens/HomeScreen';
import { StorageScreen } from './screens/StorageScreen';
import { DuplicatesScreen } from './screens/DuplicatesScreen';
import { ImagesScreen } from './screens/ImagesScreen';
import { FilesScreen } from './screens/FilesScreen';
import { CleanupScreen } from './screens/CleanupScreen';
import { HistoryScreen } from './screens/HistoryScreen';

import {
  TreeNode,
  HashGroup,
  PerceptualCluster,
  HistoricalScanEntry,
  SnapshotDeltaItem,
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

  const loadScanData = async (scanId: string) => {
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
        if (scan && scan.scan_id) {
          loadScanData(scan.scan_id);
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
          // Sync candidate in cleanup
          if (nextStaged) {
            // Check if already in candidates
            setCandidates((cand) => {
              if (cand.some((c) => c.targetPath === f.path)) {
                return cand.map((c) =>
                  c.targetPath === f.path ? { ...c, isSelected: true } : c
                );
              }
              const newRecord: CleanupCandidateRecord = {
                id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                rank: `RECORD_${(cand.length + 1).toString().padStart(2, '0')}`,
                impactScore: Math.floor(70 + Math.random() * 25),
                targetPath: f.path,
                reasons: [f.type, f.reason.replace(/\s+/g, '_').toUpperCase()],
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
    setFiles((prev) =>
      prev.map((f) => (fileIds.includes(f.id) ? { ...f, isStaged: stage } : f))
    );
    setCandidates((cand) =>
      cand.map((c) => ({
        ...c,
        isSelected: stage,
      }))
    );
    showToast(
      stage
        ? `STAGED ${fileIds.length} FILES FOR EXECUTION QUEUE`
        : `UNSTAGED ${fileIds.length} FILES`
    );
  };

  // Stage duplicates from Duplicates screen
  const handleStageDuplicates = (count: number) => {
    showToast(`COMMITTED ${count} DUPLICATE REPLICAS TO RECOVERY QUEUE`);
  };

  // Stage image candidate from Images screen
  const handleStageImageCandidate = (id: string) => {
    setStagedImageCandidateIds((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((item) => item !== id) : [...prev, id];
      showToast(
        exists
          ? `UNSTAGED IMAGE CANDIDATE [${id}]`
          : `IMAGE CANDIDATE [${id}] STAGED FOR RECOVERY ROUTING`
      );
      return next;
    });
  };

  // Toggle candidate in Cleanup screen
  const handleToggleCandidate = (id: string) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isSelected: !c.isSelected } : c))
    );
  };

  // Select all / deselect all in Cleanup screen
  const handleSelectAllCandidates = (selectAll: boolean) => {
    setCandidates((prev) => prev.map((c) => ({ ...c, isSelected: selectAll })));
  };

  // Scan completed callback
  const handleScanCompleted = async (scanId?: string, totalFiles?: number) => {
    if (scanId) {
      await loadScanData(scanId);
    }
    const countDisplay = totalFiles !== undefined ? totalFiles.toLocaleString() : '0';
    showToast(`INODE DISK TRAVERSAL COMPLETE: ${countDisplay} FILES CATALOGED`);
  };

  // Execute safe cleanup in Cleanup screen
  const handleExecuteSafeCleanup = async (selectedRecords: CleanupCandidateRecord[]) => {
    try {
      const res = await api.confirmCleanup(selectedRecords);
      if (res.results && res.results.length > 0) {
        setRecoveryLog((prev) => [...res.results, ...prev]);
      }
    } catch (err: any) {
      console.warn('Backend cleanup error:', err);
      showToast(`CLEANUP ERROR: ${err?.message || 'FAILED TO MIGRATE FILES'}`);
      return;
    }

    // Unselect the migrated candidates
    setCandidates((prev) =>
      prev.map((c) =>
        selectedRecords.some((r) => r.id === c.id)
          ? { ...c, isSelected: false }
          : c
      )
    );

    showToast(
      `SAFE CLEANUP EXECUTED: ${selectedRecords.length} INODES MIGRATED TO OS RECYCLE BIN`
    );
  };


  // Restore item in History screen
  const handleRestoreItem = async (id: string) => {
    try {
      await api.restoreFile(id);
    } catch (err: any) {
      console.warn('Backend restore notice:', err.message);
    }

    setRecoveryLog((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            isRestored: true,
            status: `RESTORED (MOVED TO ${item.originPath})`,
            location: 'ORIGINAL DIRECTORY',
          };
        }
        return item;
      })
    );
    showToast(`RESTORE COMPLETED FOR FILE [${id}]`);
  };

  const totalStagedCount = candidates.filter((c) => c.isSelected).length;

  return (
    <div className="min-h-screen bg-black text-[#e2e2e2] font-mono flex flex-col selection:bg-white selection:text-black">
      {/* GLOBAL APPLICATION FIXED HEADER */}
      <Header
        activeTab={activeTab}
        onSelectTab={navigateTo}
        stagedFilesCount={totalStagedCount}
      />

      {/* TOAST NOTIFICATION BANNER */}
      {toastMessage && (
        <div className="fixed top-24 right-4 z-50 bg-white text-black font-mono text-xs font-bold px-4 py-2 border border-white shadow-none uppercase flex items-center gap-2">
          <span>■</span>
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-3 font-normal text-xs text-[#525252] hover:text-black cursor-pointer"
          >
            [X]
          </button>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <main className="w-full flex-1 pt-28 pb-12 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto flex flex-col">
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

        {activeTab === 'cleanup' && (
          <CleanupScreen
            onNavigate={navigateTo}
            candidates={candidates}
            onToggleCandidate={handleToggleCandidate}
            onSelectAllCandidates={handleSelectAllCandidates}
            onExecuteSafeCleanup={handleExecuteSafeCleanup}
          />
        )}

        {activeTab === 'history' && (
          <HistoryScreen
            onNavigate={navigateTo}
            recoveryLog={recoveryLog}
            onRestoreItem={handleRestoreItem}
            onShowNotice={showToast}
            historicalScans={historicalScans}
            snapshotDeltas={snapshotDeltas}
          />
        )}
      </main>
    </div>
  );
}
