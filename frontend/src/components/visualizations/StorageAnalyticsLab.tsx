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

  // Efficiency percentage (100% - duplicate waste %)
  const duplicatePercentage = totalScannedBytes > 0 ? (totalDuplicateWaste / totalScannedBytes) * 100 : 0;
  const storageHealthScore = Math.max(0, Math.min(100, Math.round(100 - duplicatePercentage)));

  // Size distribution buckets (<1MB, 1-10MB, 10-50MB, 50-250MB, 250MB+)
  const sizeBuckets = useMemo(() => {
    const buckets = [
      { label: '< 1 MB', min: 0, max: 1024 * 1024, count: 0, bytes: 0, color: '#20C5E8' },
      { label: '1 - 10 MB', min: 1024 * 1024, max: 10 * 1024 * 1024, count: 0, bytes: 0, color: '#625BEE' },
      { label: '10 - 50 MB', min: 10 * 1024 * 1024, max: 50 * 1024 * 1024, count: 0, bytes: 0, color: '#925CFF' },
      { label: '50 - 250 MB', min: 50 * 1024 * 1024, max: 250 * 1024 * 1024, count: 0, bytes: 0, color: '#F5B942' },
      { label: '> 250 MB', min: 250 * 1024 * 1024, max: Infinity, count: 0, bytes: 0, color: '#FF6B6B' },
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
      shareOfTotal: totalScannedBytes > 0 ? (b.bytes / totalScannedBytes) * 100 : 0,
    }));
  }, [files, totalScannedBytes]);

  // Pareto distribution: Sort top 20 largest files and calculate cumulative %
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
    <div
      style={{
        background: '#0d0f17',
        borderRadius: 20,
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Header & Tabs */}
      <div
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          background: 'rgba(255, 255, 255, 0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #19B99A 0%, #20C5E8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(25, 185, 154, 0.35)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2">
              <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
              <path d="M22 12A10 10 0 0 0 12 2v10z" />
            </svg>
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f5f7fc' }}>
              Storage Analytics & Optimization Lab
            </h3>
            <p style={{ margin: 0, fontSize: 12, color: '#8E9AA8' }}>
              Deep statistical telemetry on file footprint, size buckets, and cumulative Pareto curve
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 10,
            padding: 3,
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {[
            { id: 'distribution', label: 'Size Buckets' },
            { id: 'pareto', label: 'Pareto 80/20' },
            { id: 'waterfall', label: 'Savings Waterfall' },
            { id: 'categories', label: 'Category Matrix' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                background: activeTab === tab.id ? 'linear-gradient(135deg, #625BEE 0%, #925CFF 100%)' : 'transparent',
                color: activeTab === tab.id ? '#fff' : '#8E9AA8',
                border: 'none',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Analytics Content */}
      <div style={{ padding: 24 }}>
        {/* Tab A: Size Distribution Histogram */}
        {activeTab === 'distribution' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: 14, color: '#f5f7fc' }}>File Size Spectrum</h4>
                <p style={{ margin: 0, fontSize: 12, color: '#8E9AA8' }}>
                  Distribution of file counts and allocated storage across byte volume tiers
                </p>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  background: 'rgba(255, 255, 255, 0.03)',
                  padding: '6px 14px',
                  borderRadius: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: '#625BEE' }} />
                  <span style={{ fontSize: 11, color: '#8E9AA8' }}>File Count</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: '#20C5E8' }} />
                  <span style={{ fontSize: 11, color: '#8E9AA8' }}>Storage Volume</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, height: 260 }}>
              {sizeBuckets.map((bucket, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: 12,
                    padding: 12,
                    border: '1px solid rgba(255, 255, 255, 0.04)',
                    position: 'relative',
                  }}
                >
                  {/* Bars Container */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-end',
                      gap: 8,
                      height: 160,
                      justifyContent: 'center',
                      marginBottom: 12,
                    }}
                  >
                    {/* Count Bar */}
                    <div
                      style={{
                        width: 28,
                        height: `${Math.max(4, bucket.countPercent)}%`,
                        background: 'linear-gradient(180deg, #925CFF 0%, #625BEE 100%)',
                        borderRadius: '6px 6px 0 0',
                        position: 'relative',
                        transition: 'height 0.4s ease',
                      }}
                      title={`${bucket.count} files`}
                    />
                    {/* Size Bar */}
                    <div
                      style={{
                        width: 28,
                        height: `${Math.max(4, bucket.bytesPercent)}%`,
                        background: 'linear-gradient(180deg, #20C5E8 0%, #19B99A 100%)',
                        borderRadius: '6px 6px 0 0',
                        position: 'relative',
                        transition: 'height 0.4s ease',
                      }}
                      title={formatBytes(bucket.bytes)}
                    />
                  </div>

                  {/* Bucket Footer Labels */}
                  <div style={{ textAlign: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#f5f7fc' }}>{bucket.label}</div>
                    <div style={{ fontSize: 11, color: '#8E9AA8', marginTop: 2 }}>{bucket.count} files</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#20C5E8', marginTop: 1 }}>
                      {formatBytes(bucket.bytes)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab B: Pareto Cumulative Storage Chart */}
        {activeTab === 'pareto' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ margin: '0 0 4px 0', fontSize: 14, color: '#f5f7fc' }}>
                Pareto Principle (80/20 Rule)
              </h4>
              <p style={{ margin: 0, fontSize: 12, color: '#8E9AA8' }}>
                Discovers if a concentrated minority of large files occupy the vast majority of disk capacity
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
              {paretoData.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.04)',
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#8E9AA8', width: 22 }}>#{idx + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#f5f7fc',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#8E9AA8' }}>{item.category}</div>
                  </div>

                  <div style={{ textAlign: 'right', width: 80 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#20C5E8' }}>{item.formattedSize}</div>
                  </div>

                  {/* Cumulative Progress Bar */}
                  <div style={{ width: 140 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#8E9AA8', marginBottom: 3 }}>
                      <span>Cumulative</span>
                      <span style={{ color: item.cumulativePercent > 80 ? '#FF6B6B' : '#925CFF', fontWeight: 700 }}>
                        {item.cumulativePercent}%
                      </span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255, 255, 255, 0.08)', borderRadius: 3, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${item.cumulativePercent}%`,
                          background:
                            item.cumulativePercent > 80
                              ? 'linear-gradient(90deg, #925CFF, #FF6B6B)'
                              : 'linear-gradient(90deg, #625BEE, #925CFF)',
                          borderRadius: 3,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab C: Waterfall Savings Chart */}
        {activeTab === 'waterfall' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 4px 0', fontSize: 14, color: '#f5f7fc' }}>
                Duplicate Storage Recovery Waterfall
              </h4>
              <p style={{ margin: 0, fontSize: 12, color: '#8E9AA8' }}>
                Step-by-step breakdown of scanned storage vs retained originals vs recoverable redundant copies
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, alignItems: 'stretch' }}>
              {/* Step 1: Total Scanned Storage */}
              <div
                style={{
                  background: 'rgba(98, 91, 238, 0.08)',
                  border: '1px solid rgba(98, 91, 238, 0.3)',
                  borderRadius: 14,
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#625BEE', textTransform: 'uppercase' }}>
                    1. Scanned Footprint
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#f5f7fc', margin: '8px 0' }}>
                    {formatBytes(totalScannedBytes)}
                  </div>
                  <p style={{ fontSize: 12, color: '#8E9AA8', margin: 0 }}>
                    Total volume of files analyzed across the selected root directory.
                  </p>
                </div>
                <div style={{ marginTop: 24, padding: '8px 12px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: 8 }}>
                  <span style={{ fontSize: 11, color: '#8E9AA8' }}>Files Evaluated: </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{files.length}</span>
                </div>
              </div>

              {/* Step 2: Retained Originals */}
              <div
                style={{
                  background: 'rgba(32, 197, 232, 0.08)',
                  border: '1px solid rgba(32, 197, 232, 0.3)',
                  borderRadius: 14,
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#20C5E8', textTransform: 'uppercase' }}>
                    2. Retained Unique Data
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#f5f7fc', margin: '8px 0' }}>
                    {formatBytes(Math.max(0, totalScannedBytes - totalDuplicateWaste))}
                  </div>
                  <p style={{ fontSize: 12, color: '#8E9AA8', margin: 0 }}>
                    Preserved unique originals and non-duplicate files kept untouched.
                  </p>
                </div>
                <div style={{ marginTop: 24, padding: '8px 12px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: 8 }}>
                  <span style={{ fontSize: 11, color: '#8E9AA8' }}>Safeguard Ratio: </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#19B99A' }}>
                    {totalScannedBytes > 0 ? (((totalScannedBytes - totalDuplicateWaste) / totalScannedBytes) * 100).toFixed(1) : 100}%
                  </span>
                </div>
              </div>

              {/* Step 3: Recoverable Redundant Waste */}
              <div
                style={{
                  background: 'rgba(255, 107, 107, 0.08)',
                  border: '1px solid rgba(255, 107, 107, 0.3)',
                  borderRadius: 14,
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#FF6B6B', textTransform: 'uppercase' }}>
                    3. Estimated Recoverable Waste
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#FF6B6B', margin: '8px 0' }}>
                    -{formatBytes(totalDuplicateWaste)}
                  </div>
                  <p style={{ fontSize: 12, color: '#8E9AA8', margin: 0 }}>
                    Redundant copies identified by identical content checksum matching.
                  </p>
                </div>
                <div style={{ marginTop: 24, padding: '8px 12px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: 8 }}>
                  <span style={{ fontSize: 11, color: '#8E9AA8' }}>Potential Gain: </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#FF6B6B' }}>
                    {totalScannedBytes > 0 ? ((totalDuplicateWaste / totalScannedBytes) * 100).toFixed(1) : 0}% of disk
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab D: Category Matrix */}
        {activeTab === 'categories' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ margin: '0 0 4px 0', fontSize: 14, color: '#f5f7fc' }}>File Type Composition Matrix</h4>
              <p style={{ margin: 0, fontSize: 12, color: '#8E9AA8' }}>
                Interactive breakdown of storage weight and item volumes by digital media classification
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {categoryMetrics.map((cat) => (
                <div
                  key={cat.category}
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid rgba(255, 255, 255, 0.06)`,
                    borderLeft: `4px solid ${cat.color}`,
                    borderRadius: 10,
                    padding: 14,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#f5f7fc' }}>{cat.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: cat.color }}>
                      {cat.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
                    {cat.formattedSize}
                  </div>
                  <div style={{ fontSize: 11, color: '#8E9AA8' }}>{cat.fileCount} files</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Telemetry Health Bar */}
      <div
        style={{
          padding: '12px 24px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(0, 0, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: storageHealthScore > 80 ? '#19B99A' : storageHealthScore > 60 ? '#F5B942' : '#FF6B6B',
              boxShadow: `0 0 8px ${storageHealthScore > 80 ? '#19B99A' : '#FF6B6B'}`,
            }}
          />
          <span style={{ fontSize: 12, color: '#8E9AA8' }}>
            Storage Efficiency Rating:{' '}
            <strong style={{ color: '#f5f7fc' }}>{storageHealthScore}/100</strong>
          </span>
        </div>
        <span style={{ fontSize: 11, color: '#8E9AA8' }}>
          Real-time deterministic calculations based on latest scan index
        </span>
      </div>
    </div>
  );
};
