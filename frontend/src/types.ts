export type NavTab = 'home' | 'storage' | 'duplicates' | 'images' | 'files' | 'cleanup' | 'history';

export interface TreeNode {
  id: string;
  name: string;
  size: string;
  bytes: number;
  isDir: boolean;
  isOpen?: boolean;
  tag?: string;
  children?: TreeNode[];
}

export interface DuplicateFile {
  id: string;
  name: string;
  path: string;
  resolution: string;
  size: string;
  bytes: number;
  isPreferred: boolean;
  status: string;
  statusDesc: string;
  rationale: string;
}

export interface HashGroup {
  id: string;
  sectorName: string;
  hash: string;
  shortHash: string;
  matchCount: number;
  sizeFormatted: string;
  files: DuplicateFile[];
  algorithmicRule: {
    reason: string;
    safetyRule: string;
    stagingAction: string;
  };
  hexSample: string[];
}

export interface PerceptualImage {
  id: string;
  sectorLabel: string;
  badge: string;
  isReference: boolean;
  filename: string;
  dimensions: string;
  hammingDistance: number;
  similarity: string;
  path: string;
  pHash: string;
  overlayType: string;
  overlayDetail: string;
  imgUrl: string;
  altText: string;
}

export interface PerceptualCluster {
  id: string;
  label: string;
  matchCount: number;
  images: PerceptualImage[];
}

export interface MetadataFileItem {
  id: string;
  path: string;
  inodeAge: string;
  type: string;
  size: string;
  bytes: number;
  reason: string;
  isStaged: boolean;
}

export interface CleanupCandidateRecord {
  id: string;
  rank: string;
  impactScore: number;
  targetPath: string;
  reasons: string[];
  recoverableFormatted: string;
  bytes: number;
  isSelected: boolean;
}

export interface RecoveryLogItem {
  id: string;
  dispatchId: string;
  filename: string;
  sizeFormatted: string;
  originPath: string;
  status: string;
  location: string;
  timestamp: string;
  isRestored: boolean;
}

export interface SnapshotDeltaItem {
  directory: string;
  delta: string;
  direction: 'EXPANDED' | 'CONTRACTED';
  isPositive: boolean;
}

export interface HistoricalScanEntry {
  date: string;
  rootTarget: string;
  inodes: string;
  total: string;
  status: string;
}
