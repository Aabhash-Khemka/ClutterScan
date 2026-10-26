import React, { useState } from 'react';
import { StorageCategoryMetric, formatBytes } from '../../utils/visualDataUtils';

interface StorageOrbHeroProps {
  totalBytes: number;
  totalFiles: number;
  duplicateBytes: number;
  duplicateCount: number;
  categories: StorageCategoryMetric[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  onStartScan?: () => void;
  targetPath?: string;
}

export const StorageOrbHero: React.FC<StorageOrbHeroProps> = ({
  totalBytes,
  totalFiles,
  duplicateBytes,
  duplicateCount,
  categories,
  selectedCategory,
  onSelectCategory,
  onStartScan,
  targetPath,
}) => {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  const displaySavings = duplicateBytes;
  const duplicatePercentage = totalBytes > 0 ? ((duplicateBytes / totalBytes) * 100).toFixed(1) : '0';

  // SVG dimensions for clean geometric ring
  const size = 320;
  const center = size / 2;
  const radius = 120;
  const strokeWidth = 14;

  let cumulativeAngle = -90; // Start at 12 o'clock

  const arcs = categories.map((cat) => {
    const angle = (cat.percentage / 100) * 360;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + Math.max(0.5, angle);
    cumulativeAngle = endAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;
    const path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;

    return {
      cat,
      path,
      angle,
    };
  });

  const activeCategoryData = categories.find((c) => c.category === (hoveredCategory || selectedCategory));

  return (
    <div className="w-full bg-[#141414] border border-[#303030] p-6 sm:p-8 flex flex-col gap-6">
      {/* Top Bar Context */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3 pb-5 border-b border-[#303030]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] uppercase font-mono font-bold tracking-wider text-[#858585]">
              Storage Telemetry
            </span>
            <span className="text-xs text-[#454545]">•</span>
            <span className="text-xs text-[#858585] font-mono">Forensic Index</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
            Storage Composition &amp; Waste Analysis
          </h2>
          <p className="text-xs md:text-sm text-[#b8b8b8] mt-0.5">
            {targetPath
              ? `Calculated from scanned volume: ${targetPath}`
              : 'Interactive breakdown of indexed files, volume weight, and redundant duplicate storage.'}
          </p>
        </div>

        {onStartScan && (
          <button
            type="button"
            onClick={onStartScan}
            className="px-4 py-2 border border-white bg-white text-black font-semibold text-xs uppercase tracking-wider transition-all hover:bg-neutral-200 cursor-pointer self-start md:self-auto"
          >
            Run New Scan
          </button>
        )}
      </div>

      {/* Main Layout: Precision Gauge Left + High-Readability Metrics Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left: Clean Geometric Radial Ring */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center">
          <div className="relative w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] flex items-center justify-center">
            <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
              {/* Background Base Ring */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="#222222"
                strokeWidth={strokeWidth}
              />

              {/* Data Arc Segments */}
              {totalBytes > 0 &&
                arcs.map(({ cat, path }) => {
                  const isHovered = hoveredCategory === cat.category;
                  const isSelected = selectedCategory === cat.category;
                  const isDimmed = (hoveredCategory || selectedCategory) && !isHovered && !isSelected;

                  return (
                    <path
                      key={cat.category}
                      d={path}
                      fill="none"
                      stroke={cat.color}
                      strokeWidth={isSelected || isHovered ? strokeWidth + 3 : strokeWidth}
                      strokeLinecap="butt"
                      opacity={isDimmed ? 0.25 : 1}
                      className="cursor-pointer transition-all duration-150"
                      onMouseEnter={() => setHoveredCategory(cat.category)}
                      onMouseLeave={() => setHoveredCategory(null)}
                      onClick={() => onSelectCategory(isSelected ? null : cat.category)}
                    />
                  );
                })}
            </svg>

            {/* Precision Center Readout */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 select-none pointer-events-none">
              {activeCategoryData ? (
                <>
                  <span
                    className="text-[11px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 mb-1"
                    style={{ backgroundColor: `${activeCategoryData.color}20`, color: activeCategoryData.color }}
                  >
                    {activeCategoryData.name}
                  </span>
                  <div className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-mono">
                    {activeCategoryData.formattedSize}
                  </div>
                  <div className="text-xs text-[#858585] font-mono mt-1">
                    {activeCategoryData.fileCount.toLocaleString()} files ({activeCategoryData.percentage.toFixed(1)}%)
                  </div>
                </>
              ) : (
                <>
                  <span className="text-[11px] uppercase font-mono tracking-wider text-[#858585]">
                    Analyzed Volume
                  </span>
                  <div className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-mono mt-1">
                    {formatBytes(totalBytes)}
                  </div>
                  <div className="text-xs text-[#57b887] font-mono font-medium mt-1">
                    {totalFiles.toLocaleString()} files cataloged
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="text-xs text-[#858585] font-mono mt-2 text-center">
            Select an arc segment to filter category
          </div>
        </div>

        {/* Right: Sharp Professional Telemetry & Distribution Badges */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Top 2 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-[#303030] bg-[#1b1b1b] p-4 flex flex-col justify-between">
              <span className="text-xs text-[#858585] uppercase tracking-wider font-medium">
                Cataloged Files
              </span>
              <div className="text-3xl font-bold font-mono text-white mt-1">
                {totalFiles.toLocaleString()}
              </div>
              <span className="text-xs text-[#858585] mt-1">Indexed file inodes</span>
            </div>

            <div className="border border-[#303030] bg-[#1b1b1b] p-4 flex flex-col justify-between">
              <span className="text-xs text-[#f06464] uppercase tracking-wider font-medium">
                Redundant Duplicate Waste
              </span>
              <div className="text-3xl font-bold font-mono text-[#f06464] mt-1">
                {formatBytes(displaySavings)}
              </div>
              <span className="text-xs text-[#858585] mt-1">
                {duplicateCount} duplicate copies ({duplicatePercentage}% disk waste)
              </span>
            </div>
          </div>

          {/* Clean Category Breakdown Strip */}
          <div className="border border-[#303030] bg-[#1b1b1b] p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center text-xs">
              <span className="uppercase font-medium text-[#858585] tracking-wider">
                Distribution by Media Type ({categories.length})
              </span>
              {selectedCategory && (
                <button
                  type="button"
                  onClick={() => onSelectCategory(null)}
                  className="text-white hover:underline cursor-pointer font-mono text-xs"
                >
                  [Clear Filter]
                </button>
              )}
            </div>

            {/* Category Filter Chips */}
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.category;
                const isHovered = hoveredCategory === cat.category;

                return (
                  <button
                    key={cat.category}
                    type="button"
                    onMouseEnter={() => setHoveredCategory(cat.category)}
                    onMouseLeave={() => setHoveredCategory(null)}
                    onClick={() => onSelectCategory(isSelected ? null : cat.category)}
                    className={`px-3 py-1.5 border text-xs font-medium cursor-pointer transition-colors flex items-center gap-2 ${
                      isSelected
                        ? 'border-white bg-white text-black'
                        : isHovered
                        ? 'bg-[#262626] text-white border-[#454545]'
                        : 'bg-[#141414] text-[#b8b8b8] border-[#303030] hover:border-[#454545]'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span>{cat.name}</span>
                    <span className={`font-mono text-[11px] ${isSelected ? 'text-black font-bold' : 'text-[#858585]'}`}>
                      {cat.formattedSize}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Safety Notice Banner */}
          <div className="border border-[#303030] bg-[#141414] p-3.5 flex items-center justify-between text-xs text-[#b8b8b8]">
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-[#57b887]/20 border border-[#57b887]/40 text-[#57b887]">
                SAFEGUARD
              </span>
              <span>All deduplication preserves 1 master original copy. Waste is fully recoverable.</span>
            </div>
            <span className="font-mono text-[#858585] hidden sm:block">READ-ONLY AUDIT</span>
          </div>
        </div>
      </div>
    </div>
  );
};
