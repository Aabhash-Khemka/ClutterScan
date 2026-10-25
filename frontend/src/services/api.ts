import {
  TreeNode,
  HashGroup,
  PerceptualCluster,
  MetadataFileItem,
  CleanupCandidateRecord,
  RecoveryLogItem,
  HistoricalScanEntry,
  SnapshotDeltaItem,
} from '../types';

const API_BASE = '/api';

export interface ScanStatusData {
  scanId: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'READY';
  progress: number;
  totalFiles: number;
  totalDirectories: number;
  totalSize: number;
  formattedSize: string;
  errorCount: number;
  errors: Array<{ path: string; error: string }>;
  message: string;
}

export type LatestScanData = Partial<ScanStatusData> & { scanId: string | null };

export interface SystemVolumeData {
  path: string;
  name: string;
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  formattedTotal: string;
  formattedUsed: string;
  formattedFree: string;
  percentUsed: number;
}

export interface SystemFolderData {
  name: string;
  path: string;
  exists: boolean;
}

export interface HistoryData {
  historicalScans: HistoricalScanEntry[];
  snapshotDeltas: SnapshotDeltaItem[];
  recoveryEntries: RecoveryLogItem[];
}

export const api = {
  async getSystemVolumes(): Promise<SystemVolumeData[]> {
    try {
      const res = await fetch(`${API_BASE}/system/volumes`);
      if (!res.ok) throw new Error('Failed to fetch system volumes');
      return await res.json();
    } catch (err) {
      console.warn('API getSystemVolumes fallback:', err);
      return [];
    }
  },

  async getSystemFolders(): Promise<SystemFolderData[]> {
    try {
      const res = await fetch(`${API_BASE}/system/folders`);
      if (!res.ok) throw new Error('Failed to fetch system folders');
      return await res.json();
    } catch (err) {
      console.warn('API getSystemFolders fallback:', err);
      return [];
    }
  },

  async getLatestScan(): Promise<LatestScanData> {
    const res = await fetch(`${API_BASE}/scan/latest`);
    if (!res.ok) throw new Error('Failed to fetch latest scan');
    return await res.json();
  },

  async startScan(
    targetPath: string,
    options: Record<string, boolean>
  ): Promise<{ scanId: string; status: string; message: string }> {
    const res = await fetch(`${API_BASE}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_path: targetPath, options }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ detail: 'Scan initiation failed' }));
      throw new Error(errData.detail || 'Scan initiation failed');
    }
    return await res.json();
  },

  async getScanStatus(scanId: string): Promise<ScanStatusData> {
    const res = await fetch(`${API_BASE}/scan/${scanId}`);
    if (!res.ok) throw new Error('Failed to fetch scan status');
    return await res.json();
  },

  async getFilesystemTree(scanId: string): Promise<TreeNode[]> {
    const res = await fetch(`${API_BASE}/scan/${scanId}/tree`);
    if (!res.ok) throw new Error('Failed to fetch tree');
    return await res.json();
  },

  async getDuplicates(scanId: string): Promise<HashGroup[]> {
    const res = await fetch(`${API_BASE}/duplicates/${scanId}`);
    if (!res.ok) throw new Error('Failed to fetch duplicates');
    return await res.json();
  },

  async bulkDeleteDuplicates(
    filePaths: string[],
    scanId?: string | null,
    preferTrash = true
  ): Promise<{ success: boolean; deletedCount: number; failedCount: number; results: RecoveryLogItem[] }> {
    const res = await fetch(`${API_BASE}/duplicates/bulk-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scanId: scanId || null,
        filePaths,
        preferTrash,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Bulk deletion failed' }));
      throw new Error(err.detail || 'Bulk deletion failed');
    }
    return await res.json();
  },

  async getSimilarImages(scanId: string): Promise<PerceptualCluster[]> {
    const res = await fetch(`${API_BASE}/similar-images/${scanId}`);
    if (!res.ok) throw new Error('Failed to fetch similar images');
    return await res.json();
  },

  async getFiles(scanId: string): Promise<MetadataFileItem[]> {
    const res = await fetch(`${API_BASE}/files/${scanId}`);
    if (!res.ok) throw new Error('Failed to fetch metadata files');
    return await res.json();
  },

  async getRecommendations(scanId: string): Promise<CleanupCandidateRecord[]> {
    const res = await fetch(`${API_BASE}/recommendations/${scanId}`);
    if (!res.ok) throw new Error('Failed to fetch recommendations');
    return await res.json();
  },

  async confirmCleanup(
    candidates: CleanupCandidateRecord[],
    preferTrash = true
  ): Promise<{ success: boolean; results: RecoveryLogItem[] }> {
    const res = await fetch(`${API_BASE}/cleanup/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidates: candidates.map((c) => ({
          id: c.id,
          targetPath: c.targetPath,
          bytes: c.bytes,
          reasons: c.reasons,
        })),
        preferTrash,
      }),
    });
    if (!res.ok) throw new Error('Safe cleanup execution failed');
    return await res.json();
  },

  async getHistory(): Promise<HistoryData> {
    const res = await fetch(`${API_BASE}/history`);
    if (!res.ok) throw new Error('Failed to fetch history');
    return await res.json();
  },

  async restoreFile(fileId: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/recovery/${fileId}/restore`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Restore failed' }));
      throw new Error(err.detail || 'Restore failed');
    }
    return await res.json();
  },

  async scanOrganize(
    sourcePath: string,
    collegeKeywords?: string[],
    projectKeywords?: string[]
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/organize/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourcePath,
        collegeKeywords: collegeKeywords || [],
        projectKeywords: projectKeywords || [],
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Organize scan failed' }));
      throw new Error(err.detail || 'Organize scan failed');
    }
    return await res.json();
  },

  async executeOrganize(sourcePath: string, moves: any[]): Promise<any> {
    const res = await fetch(`${API_BASE}/organize/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourcePath, moves }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Execution failed' }));
      throw new Error(err.detail || 'Execution failed');
    }
    return await res.json();
  },

  async undoOrganize(operationId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/organize/undo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operationId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Undo failed' }));
      const msg = typeof err.detail === 'string' ? err.detail : (typeof err.message === 'string' ? err.message : JSON.stringify(err.detail || err));
      throw new Error(msg || 'Undo failed');
    }
    return await res.json();
  },

  async getOrganizeHistory(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/organize/history`);
    if (!res.ok) throw new Error('Failed to fetch organize history');
    return await res.json();
  },
};

