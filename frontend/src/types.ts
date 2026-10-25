export type NavTab = 'home' | 'storage' | 'duplicates' | 'images' | 'files' | 'cleanup' | 'history' | 'organize';

export interface PlannedMove {
  id: string;
  filename: string;
  sourcePath: string;
  destPath: string;
  category: string;
  ruleReason: string;
  sizeBytes: number;
  status: 'ready' | 'conflict' | 'skipped' | 'moved' | 'failed';
  conflictNote?: string;
  userOverride?: boolean;
}

export interface OrganizePlan {
  id: string;
  sourceFolder: string;
  moves: PlannedMove[];
  summary: {
    totalFiles: number;
    totalBytes: number;
    categoryCounts: Record<string, number>;
    conflictCount: number;
  };
}

export interface OrganizeOperation {
  id: string;
  createdAt: string;
  sourceFolder: string;
  status: string;
  totalPlanned: number;
  totalMoved: number;
  totalSkipped: number;
  totalFailed: number;
  undoStatus: string;
  files?: PlannedMove[];
}

export interface TreeNode {
  id: string;
  name: string;
  path?: string;
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
  impactScore?: number;
  targetPath: string;
  reasons: string[];
  recoverableFormatted: string;
  bytes: number;
  isSelected: boolean;
  scoreBreakdown?: RecommendationScoreFactor[];
  scoreBeforeClamp?: number;
  selectionThreshold?: number;
}

export interface RecommendationScoreFactor {
  key: string;
  label: string;
  points: number;
  explanation: string;
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

export interface CleanupExecutionSummary {
  movedCount: number;
  failedCount: number;
}

export interface SnapshotDeltaItem {
  directory: string;
  delta: string;
  direction: 'EXPANDED' | 'CONTRACTED';
  isPositive: boolean;
}

export interface HistoricalScanEntry {
  id?: string;
  scanId?: string;
  date: string;
  rootTarget: string;
  inodes: string;
  total: string;
  status: string;
}
