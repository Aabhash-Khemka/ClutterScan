import React, { useState, useMemo } from 'react';
import { VisualFileNode, formatBytes, computeCategoryMetrics } from '../../utils/visualDataUtils';
import { HashGroup } from '../../types';

interface StorageAnalyticsLabProps {
  files: VisualFileNode[];
  hashGroups: HashGroup[];
  totalScannedBytes: number;
}

export const StorageAnalyticsLab: React.FC<StorageAnalyticsLabProps> = ({
  files,
  hashGroups,
  totalScannedBytes,
}) => {
  const [activeTab, setActiveTab] = useState<'distribution' | 'pareto' | 'waterfall' | 'categories'>('distribution');

  // Category Metrics
  const categoryMetrics = useMemo(() => computeCategoryMetrics(files), [files]);

  // Total Duplicate Waste
  const totalDuplicateWaste = useMemo(() => {
    return hashGroups.reduce((acc, g) => {
      const copies = g.files ? g.files.length : 0;
      if (copies > 1) {
        return acc + (g.sizeBytes || 0) * (copies - 1);
      }
      return acc;
    }, 0);
  }, [hashGroups]);

  const duplicatePercentage = totalScannedBytes > 0 ? (totalDuplicateWaste / totalScannedBytes) * 100 : 0;
  const storageHealthScore = Math.max(0, Math.min(100, Math.round(100 - duplicatePercentage)));

  // Size distribution buckets (<1MB, 1-10MB, 10-50MB, 50-250MB, 250MB+)
  const sizeBuckets = useMemo(() => {
    const buckets = [
      { label: '< 1 MB', min: 0, max: 1024 * 1024, count: 0, bytes: 0 },
      { label: '1 - 10 MB', min: 1024 * 1024, max: 10 * 1024 * 1024, count: 0, bytes: 0 },
      { label: '10 - 50 MB', min: 10 * 1024 * 1024, max: 50 * 1024 * 1024, count: 0, bytes: 0 },
      { label: '50 - 250 MB', min: 50 * 1024 * 1024, max: 250 * 1024 * 1024, count: 0, bytes: 0 },
      { label: '> 250 MB', min: 250 * 1024 * 1024, max: Infinity, count: 0, bytes: 0 },
    ];

    files.forEach((f) => {
      for (const b of buckets) {
        if (f.bytes >= b.min && f.bytes < b.max) {
          b.count += 1;
          b.bytes += f.bytes;
          break;
        }
      }
    });

    const maxCount = Math.max(1, ...buckets.map((b) => b.count));
    const maxBytes = Math.max(1, ...buckets.map((b) => b.bytes));

    return buckets.map((b) => ({
      ...b,
      countPercent: (b.count / maxCount) * 100,
      bytesPercent: (b.bytes / maxBytes) * 100,
    }));
  }, [files]);

  // Pareto distribution: Top 15 largest files and cumulative %
  const paretoData = useMemo(() => {
    const sorted = [...files].sort((a, b) => b.bytes - a.bytes).slice(0, 15);
    let cumulative = 0;
    return sorted.map((f) => {
      cumulative += f.bytes;
      const cumulativePercent = totalScannedBytes > 0 ? (cumulative / totalScannedBytes) * 100 : 0;
      return {
        name: f.name,
        bytes: f.bytes,
        formattedSize: f.formattedSize,
        category: f.category,
        cumulativePercent: Math.min(100, Math.round(cumulativePercent)),
      };
    });
  }, [files, totalScannedBytes]);

  return (
    <div className="w-full bg-[#141414] border border-[#303030] flex flex-col text-[#f5f5f5]">
      {/* Top Header & Tabs */}
      <div className="p-5 border-b border-[#303030] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="text-[11px] uppercase font-mono font-bold tracking-wider text-[#858585] mb-1">
            Forensic Telemetry
          </div>
          <h3 className="text-xl font-bold tracking-tight text-white">
            Storage Analytics Lab
          </h3>
          <p className="text-xs text-[#b8b8b8] mt-0.5">
            Statistical distribution, Pareto 80/20 ratio, and recoverable waste breakdown.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-[#101010] p-1 border border-[#303030]">
          {[
            { id: 'distribution', label: 'Size Tiers' },
            { id: 'pareto', label: 'Pareto 80/20' },
            { id: 'waterfall', label: 'Waterfall' },
            { id: 'categories', label: 'Media Breakdown' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-mono uppercase transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white text-black font-bold'
                  : 'text-[#858585] hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6">
        {/* Tab A: Size Distribution Histogram */}
        {activeTab === 'distribution' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className="text-base font-bold text-white">File Volume Spectrum</h4>
                <p className="text-xs text-[#858585] font-mono mt-0.5">
                  Comparison between file counts and actual byte consumption per volume tier
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono text-[#858585]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-white" />
                  <span>File Inodes</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-[#57b887]" />
                  <span>Disk Storage</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 h-64">
              {sizeBuckets.map((bucket, i) => (
                <div
                  key={i}
                  className="border border-[#262626] bg-[#101010] p-3 flex flex-col justify-end"
                >
                  <div className="flex items-end justify-center gap-2 h-36 mb-3">
                    {/* Count Bar */}
                    <div
                      className="w-5 bg-white transition-all duration-300"
                      style={{ height: `${Math.max(4, bucket.countPercent)}%` }}
                      title={`${bucket.count} files`}
                    />
                    {/* Size Bar */}
                    <div
                      className="w-5 bg-[#57b887] transition-all duration-300"
                      style={{ height: `${Math.max(4, bucket.bytesPercent)}%` }}
                      title={formatBytes(bucket.bytes)}
                    />
                  </div>

                  <div className="border-t border-[#262626] pt-2 text-center font-mono">
                    <div className="text-xs font-bold text-white">{bucket.label}</div>
                    <div className="text-[11px] text-[#858585] mt-0.5">{bucket.count} items</div>
                    <div className="text-[11px] text-[#57b887] font-semibold mt-0.5">
                      {formatBytes(bucket.bytes)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab B: Pareto 80/20 Distribution */}
        {activeTab === 'pareto' && (
          <div>
            <div className="mb-4">
              <h4 className="text-base font-bold text-white">Pareto Principle (Largest File Footprint)</h4>
              <p className="text-xs text-[#858585] font-mono mt-0.5">
                Top individual files accounting for cumulative storage footprint
              </p>
            </div>

            <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
              {paretoData.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-2 border border-[#262626] bg-[#101010] text-xs font-mono"
                >
                  <span className="text-[#858585] w-6 text-right">#{idx + 1}</span>
                  <div className="flex-1 truncate">
                    <span className="text-white font-medium truncate block">{item.name}</span>
                    <span className="text-[#858585] text-[10px]">{item.category}</span>
                  </div>

                  <span className="text-[#57b887] font-bold w-24 text-right">
                    {item.formattedSize}
                  </span>

                  <div className="w-32 flex items-center gap-2">
                    <div className="flex-1 h-2 bg-[#222222] overflow-hidden">
                      <div
                        className="h-full bg-white"
                        style={{ width: `${item.cumulativePercent}%` }}
                      />
                    </div>
                    <span className="text-[#858585] text-[10px] w-8 text-right">
                      {item.cumulativePercent}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab C: Waterfall Savings Breakdown */}
        {activeTab === 'waterfall' && (
          <div>
            <div className="mb-5">
              <h4 className="text-base font-bold text-white">Storage Deduplication Waterfall</h4>
              <p className="text-xs text-[#858585] font-mono mt-0.5">
                Deterministic calculation of scanned space, retained originals, and recoverable duplicates
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-[#303030] bg-[#1b1b1b] p-5 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-[#858585]">
                    1. Scanned Footprint
                  </span>
                  <div className="text-3xl font-bold font-mono text-white mt-2">
                    {formatBytes(totalScannedBytes)}
                  </div>
                  <p className="text-xs text-[#858585] mt-2">
                    Total volume of files indexed across target volume.
                  </p>
                </div>
                <div className="border-t border-[#303030] pt-2 text-xs font-mono text-[#858585] mt-4">
                  Files Evaluated: <span className="text-white font-bold">{files.length}</span>
                </div>
              </div>

              <div className="border border-[#303030] bg-[#1b1b1b] p-5 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-[#57b887]">
                    2. Retained Unique Data
                  </span>
                  <div className="text-3xl font-bold font-mono text-white mt-2">
                    {formatBytes(Math.max(0, totalScannedBytes - totalDuplicateWaste))}
                  </div>
                  <p className="text-xs text-[#858585] mt-2">
                    Preserved master originals and unique documents.
                  </p>
                </div>
                <div className="border-t border-[#303030] pt-2 text-xs font-mono text-[#858585] mt-4">
                  Safeguard Ratio:{' '}
                  <span className="text-[#57b887] font-bold">
                    {totalScannedBytes > 0
                      ? (((totalScannedBytes - totalDuplicateWaste) / totalScannedBytes) * 100).toFixed(1)
                      : 100}
                    %
                  </span>
                </div>
              </div>

              <div className="border border-[#303030] bg-[#1b1b1b] p-5 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-[#f06464]">
                    3. Recoverable Redundant Waste
                  </span>
                  <div className="text-3xl font-bold font-mono text-[#f06464] mt-2">
                    -{formatBytes(totalDuplicateWaste)}
                  </div>
                  <p className="text-xs text-[#858585] mt-2">
                    Identical checksum clones eligible for safe reclaim.
                  </p>
                </div>
                <div className="border-t border-[#303030] pt-2 text-xs font-mono text-[#858585] mt-4">
                  Reclaim Potential:{' '}
                  <span className="text-[#f06464] font-bold">
                    {totalScannedBytes > 0 ? ((totalDuplicateWaste / totalScannedBytes) * 100).toFixed(1) : 0}% of disk
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab D: Media Category Breakdown */}
        {activeTab === 'categories' && (
          <div>
            <div className="mb-4">
              <h4 className="text-base font-bold text-white">Media Type Classification</h4>
              <p className="text-xs text-[#858585] font-mono mt-0.5">
                Storage distribution grouped by recognized file extension patterns
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {categoryMetrics.map((cat) => (
                <div
                  key={cat.category}
                  className="border border-[#262626] bg-[#101010] p-4 flex flex-col justify-between"
                  style={{ borderLeft: `3px solid ${cat.color}` }}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-white">{cat.name}</span>
                    <span className="text-xs font-mono text-[#858585]">{cat.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-white mt-1">
                    {cat.formattedSize}
                  </div>
                  <div className="text-xs font-mono text-[#858585] mt-2">
                    {cat.fileCount.toLocaleString()} files
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Health Bar */}
      <div className="p-3 border-t border-[#303030] bg-[#101010] flex items-center justify-between text-xs font-mono text-[#858585]">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 inline-block rounded-full"
            style={{
              backgroundColor:
                storageHealthScore > 85 ? '#57b887' : storageHealthScore > 65 ? '#e5ad55' : '#f06464',
            }}
          />
          <span>Storage Efficiency Score: <strong className="text-white">{storageHealthScore}/100</strong></span>
        </div>
        <span className="hidden sm:inline">Calculated from SHA-256 Checksums</span>
      </div>
    </div>
  );
};
