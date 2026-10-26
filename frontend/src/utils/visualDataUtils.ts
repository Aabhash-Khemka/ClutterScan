import { useMemo } from 'react';
import { TreeNode, HashGroup, MetadataFileItem } from '../types';

export interface VisualFileNode {
  id: string;
  name: string;
  path: string;
  bytes: number;
  formattedSize: string;
  extension: string;
  category: 'Image' | 'Video' | 'Document' | 'Audio' | 'Archive' | 'Code' | 'System' | 'Other';
  isDuplicate: boolean;
  duplicateGroupId?: string;
  duplicateCount?: number;
  directory: string;
  depth: number;
  // Normalized 2D coordinates for File Universe visualization
  x?: number;
  y?: number;
  radius?: number;
  color?: string;
}

export interface StorageCategoryMetric {
  name: string;
  category: VisualFileNode['category'];
  bytes: number;
  formattedSize: string;
  fileCount: number;
  percentage: number;
  color: string;
  iconName: string;
}

export const CATEGORY_COLORS: Record<VisualFileNode['category'], string> = {
  Image: '#57b887',     // Clean Emerald
  Video: '#e5ad55',     // Warm Ochre
  Document: '#f5f5f5',  // Pure Ink White
  Audio: '#858585',     // Muted Gray
  Archive: '#f06464',   // Coral Red
  Code: '#9ca3af',      // Crisp Slate
  System: '#454545',    // Deep Charcoal
  Other: '#606060',     // Subtle Neutral
};

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
}

export function detectCategory(filename: string): VisualFileNode['category'] {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'ico', 'heic', 'tiff'].includes(ext)) return 'Image';
  if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv', 'flv'].includes(ext)) return 'Video';
  if (['pdf', 'docx', 'doc', 'txt', 'md', 'xlsx', 'xls', 'pptx', 'csv', 'rtf'].includes(ext)) return 'Document';
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(ext)) return 'Audio';
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) return 'Archive';
  if (['js', 'ts', 'tsx', 'jsx', 'py', 'html', 'css', 'json', 'rs', 'go', 'cpp', 'c', 'java', 'sql', 'sh'].includes(ext)) return 'Code';
  if (['dll', 'sys', 'ini', 'log', 'tmp', 'bak', 'dat'].includes(ext)) return 'System';
  return 'Other';
}

/**
 * Extracts a flattened list of all files from TreeNode hierarchy and/or metadata files list,
 * merging duplicate status.
 */
export function extractVisualFiles(
  treeNodes: TreeNode[] = [],
  hashGroups: HashGroup[] = [],
  metadataFiles: MetadataFileItem[] = []
): VisualFileNode[] {
  const result: VisualFileNode[] = [];
  const duplicatePathMap = new Map<string, { groupId: string; count: number }>();
  const seenPaths = new Set<string>();

  hashGroups.forEach((g) => {
    (g.files || []).forEach((f) => {
      duplicatePathMap.set(f.path, { groupId: g.id, count: g.matchCount || g.files.length });
    });
  });

  function traverse(node: TreeNode, depth: number, currentDir: string) {
    if (node.isDir) {
      const nextDir = node.path || `${currentDir}/${node.name}`;
      if (node.children) {
        node.children.forEach((child) => traverse(child, depth + 1, nextDir));
      }
    } else {
      const fullPath = node.path || `${currentDir}/${node.name}`;
      if (seenPaths.has(fullPath)) return;
      seenPaths.add(fullPath);

      const category = detectCategory(node.name);
      const dupInfo = duplicatePathMap.get(fullPath);

      result.push({
        id: node.id || fullPath,
        name: node.name,
        path: fullPath,
        bytes: node.bytes || 0,
        formattedSize: node.size || formatBytes(node.bytes || 0),
        extension: (node.name.split('.').pop() || '').toLowerCase(),
        category,
        isDuplicate: !!dupInfo,
        duplicateGroupId: dupInfo?.groupId,
        duplicateCount: dupInfo?.count,
        directory: currentDir,
        depth,
        color: CATEGORY_COLORS[category],
      });
    }
  }

  if (Array.isArray(treeNodes) && treeNodes.length > 0) {
    treeNodes.forEach((root) => traverse(root, 0, root.name));
  }

  // If tree nodes didn't yield items or were not present, fallback/supplement with metadataFiles
  if (Array.isArray(metadataFiles)) {
    metadataFiles.forEach((mf) => {
      if (seenPaths.has(mf.path)) return;
      seenPaths.add(mf.path);

      const category = detectCategory(mf.name);
      const dupInfo = duplicatePathMap.get(mf.path);

      result.push({
        id: mf.id || mf.path,
        name: mf.name,
        path: mf.path,
        bytes: mf.bytes || 0,
        formattedSize: mf.size || formatBytes(mf.bytes || 0),
        extension: (mf.name.split('.').pop() || '').toLowerCase(),
        category,
        isDuplicate: !!dupInfo,
        duplicateGroupId: dupInfo?.groupId,
        duplicateCount: dupInfo?.count,
        directory: mf.path.substring(0, mf.path.lastIndexOf(/[/\\]/.test(mf.path) ? (mf.path.includes('/') ? '/' : '\\') : '')),
        depth: 1,
        color: CATEGORY_COLORS[category],
      });
    });
  }

  // Also include duplicate files from hashGroups if still not in result
  hashGroups.forEach((g) => {
    (g.files || []).forEach((f) => {
      if (seenPaths.has(f.path)) return;
      seenPaths.add(f.path);

      const category = detectCategory(f.name);
      result.push({
        id: `${g.id}-${f.path}`,
        name: f.name,
        path: f.path,
        bytes: g.sizeBytes || 0,
        formattedSize: g.fileSize || formatBytes(g.sizeBytes || 0),
        extension: (f.name.split('.').pop() || '').toLowerCase(),
        category,
        isDuplicate: true,
        duplicateGroupId: g.id,
        duplicateCount: g.files?.length || 2,
        directory: f.path.substring(0, f.path.lastIndexOf(/[/\\]/.test(f.path) ? (f.path.includes('/') ? '/' : '\\') : '')),
        depth: 1,
        color: CATEGORY_COLORS[category],
      });
    });
  });

  return result;
}

/**
 * Computes category breakdown metrics and storage proportions
 */
export function computeCategoryMetrics(files: VisualFileNode[]): StorageCategoryMetric[] {
  const map = new Map<VisualFileNode['category'], { bytes: number; count: number }>();
  let totalBytes = 0;

  files.forEach((f) => {
    totalBytes += f.bytes;
    const cur = map.get(f.category) || { bytes: 0, count: 0 };
    cur.bytes += f.bytes;
    cur.count += 1;
    map.set(f.category, cur);
  });

  const categories: VisualFileNode['category'][] = ['Image', 'Video', 'Document', 'Audio', 'Archive', 'Code', 'System', 'Other'];

  return categories
    .map((cat) => {
      const data = map.get(cat) || { bytes: 0, count: 0 };
      const percentage = totalBytes > 0 ? (data.bytes / totalBytes) * 100 : 0;
      return {
        name: cat,
        category: cat,
        bytes: data.bytes,
        formattedSize: formatBytes(data.bytes),
        fileCount: data.count,
        percentage,
        color: CATEGORY_COLORS[cat],
        iconName: cat.toLowerCase(),
      };
    })
    .filter((c) => c.fileCount > 0)
    .sort((a, b) => b.bytes - a.bytes);
}
