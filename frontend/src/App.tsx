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
  INITIAL_METADATA_FILES,
  INITIAL_CLEANUP_CANDIDATES,
  INITIAL_RECOVERY_LOG,
} from './mockData';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [files, setFiles] = useState<MetadataFileItem[]>(INITIAL_METADATA_FILES);
  const [candidates, setCandidates] = useState<CleanupCandidateRecord[]>(INITIAL_CLEANUP_CANDIDATES);
  const [recoveryLog, setRecoveryLog] = useState<RecoveryLogItem[]>(INITIAL_RECOVERY_LOG);
  const [stagedImageCandidateIds, setStagedImageCandidateIds] = useState<string[]>(['img-c2']);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  // Execute safe cleanup in Cleanup screen
  const handleExecuteSafeCleanup = (selectedRecords: CleanupCandidateRecord[]) => {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newHistoryItems: RecoveryLogItem[] = selectedRecords.map((r, i) => {
      const filename = r.targetPath.split('\\').pop() || r.targetPath;
      return {
        id: `rc-${Date.now()}-${i}`,
        dispatchId: `#RC-${Math.floor(9000 + Math.random() * 999)}`,
        filename,
        sizeFormatted: r.recoverableFormatted,
        originPath: r.targetPath,
        status: 'RECOVERABLE (OS RECYCLE BIN)',
        location: 'OS RECYCLE BIN',
        timestamp,
        isRestored: false,
      };
    });

    setRecoveryLog((prev) => [...newHistoryItems, ...prev]);

    // Unselect the migrated candidates and update reasons
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
  const handleRestoreItem = (id: string) => {
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
      <main className="w-full flex-1 pt-24 pb-12 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto flex flex-col">
        {activeTab === 'home' && (
          <HomeScreen
            onNavigate={navigateTo}
            onScanCompleted={() => {
              showToast('INODE DISK TRAVERSAL COMPLETE: 12,482 FILES CATALOGED');
            }}
          />
        )}

        {activeTab === 'storage' && (
          <StorageScreen onNavigate={navigateTo} onShowNotice={showToast} />
        )}

        {activeTab === 'duplicates' && (
          <DuplicatesScreen
            onNavigate={navigateTo}
            onStageDuplicates={handleStageDuplicates}
          />
        )}

        {activeTab === 'images' && (
          <ImagesScreen
            onNavigate={navigateTo}
            onStageImageCandidate={handleStageImageCandidate}
            stagedCandidateIds={stagedImageCandidateIds}
            onShowNotice={showToast}
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
          />
        )}
      </main>
    </div>
  );
}
