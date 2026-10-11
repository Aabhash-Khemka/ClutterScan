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

  async getLatestScan(): Promise<ScanStatusData> {
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
};
