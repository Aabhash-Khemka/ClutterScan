import React, { useState } from 'react';
import { StorageCategoryMetric, formatBytes } from '../../utils/visualDataUtils';
import { HardDrive, Files, Layers, ShieldCheck, Sparkles, PieChart } from 'lucide-react';

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

  // SVG dimensions
  const size = 380;
  const center = size / 2;
  const outerRadius = 145;
  const strokeWidth = 14;

  // Compute SVG circular arc segments for storage composition
  let cumulativeAngle = -90; // Start from 12 o'clock

  const arcs = categories.map((cat) => {
    const angle = (cat.percentage / 100) * 360;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle = endAngle;

    // Helper to calculate arc path coordinates
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = center + outerRadius * Math.cos(startRad);
    const y1 = center + outerRadius * Math.sin(startRad);
    const x2 = center + outerRadius * Math.cos(endRad);
    const y2 = center + outerRadius * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;
    const path = `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2}`;

    return {
      cat,
      path,
      startAngle,
      endAngle,
      angle,
    };
  });

  const activeCategoryData = categories.find((c) => c.category === (hoveredCategory || selectedCategory));

  return (
    <div className="w-full bg-[#0d0f17] border border-[#1e2438] rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-white font-sans">
      {/* Ambient background glows */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-[#625BEE]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-[#20C5E8]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#925CFF]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Banner Context */}
      <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#1e2438] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wider uppercase bg-[#625BEE]/20 border border-[#625BEE]/50 text-[#8e85ff] flex items-center gap-1.5">
              <Sparkles size={12} className="text-[#20C5E8]" />
              Visual Storage Intelligence
            </span>
            <span className="text-xs text-[#68758B]">• SHA-256 Deep Inspection</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
            Dynamic Storage Matrix
          </h2>
          <p className="text-sm text-[#8899b5] max-w-xl mt-0.5">
            {targetPath
              ? `Real-time orbital breakdown for ${targetPath}`
              : 'Interactive planetary visualization of scanned files, category distributions, and reclaimable space.'}
          </p>
        </div>

        {/* Action Button */}
        {onStartScan && (
          <button
            type="button"
            onClick={onStartScan}
            className="px-5 py-2.5 bg-gradient-to-r from-[#625BEE] to-[#925CFF] hover:from-[#5149e8] hover:to-[#8145ff] text-white text-xs font-semibold uppercase tracking-wider rounded-xl shadow-lg shadow-[#625BEE]/30 transition-all cursor-pointer flex items-center gap-2 self-start md:self-auto shrink-0"
          >
            <HardDrive size={15} />
            <span>Launch New Scan</span>
          </button>
        )}
      </div>

      {/* Main Grid: Orb Visualization on Left / Deep Telemetry & Category Orbiters on Right */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mt-6">
        {/* LEFT COLUMN: THE CENTRAL ANIMATED ORB */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center relative">
          <div className="relative w-[340px] h-[340px] sm:w-[380px] sm:h-[380px] flex items-center justify-center">
            {/* SVG Interactive Multi-ring Orb */}
            <svg
              viewBox={`0 0 ${size} ${size}`}
              className="w-full h-full transform transition-transform duration-700"
            >
              <defs>
                {/* Central Orb Gradients */}
                <radialGradient id="orbGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#625BEE" stopOpacity="0.45" />
                  <stop offset="60%" stopColor="#925CFF" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#0d0f17" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="orbitRing" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#20C5E8" stopOpacity="0.6" />
                  <stop offset="50%" stopColor="#625BEE" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#925CFF" stopOpacity="0.6" />
                </linearGradient>
              </defs>

              {/* Background ambient ring */}
              <circle
                cx={center}
                cy={center}
                r={outerRadius}
                fill="none"
                stroke="#181d2e"
                strokeWidth={strokeWidth}
              />

              {/* Glowing core sphere */}
              <circle
                cx={center}
                cy={center}
                r={outerRadius - 28}
                fill="url(#orbGlow)"
                className="animate-pulse-subtle"
              />

              {/* Subtle orbital dashed lines */}
              <circle
                cx={center}
                cy={center}
                r={outerRadius + 18}
                fill="none"
                stroke="#2a334d"
                strokeWidth={1}
                strokeDasharray="4 6"
                className="opacity-40 animate-radar"
                style={{ transformOrigin: `${center}px ${center}px` }}
              />

              {/* Storage Composition Arcs */}
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
                      strokeWidth={isSelected || isHovered ? strokeWidth + 4 : strokeWidth}
                      strokeLinecap="round"
                      opacity={isDimmed ? 0.3 : 1}
                      className="cursor-pointer transition-all duration-300 hover:opacity-100"
                      onMouseEnter={() => setHoveredCategory(cat.category)}
                      onMouseLeave={() => setHoveredCategory(null)}
                      onClick={() => onSelectCategory(isSelected ? null : cat.category)}
                    />
                  );
                })}
            </svg>

            {/* Central Holographic Core Metrics */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 pointer-events-none select-none">
              {activeCategoryData ? (
                <>
                  <span
                    className="text-xs uppercase font-extrabold tracking-widest px-2.5 py-0.5 rounded-full mb-1"
                    style={{ backgroundColor: `${activeCategoryData.color}25`, color: activeCategoryData.color }}
                  >
                    {activeCategoryData.name} Files
                  </span>
                  <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-mono">
                    {activeCategoryData.formattedSize}
                  </div>
                  <div className="text-xs text-[#8899b5] mt-1">
                    {activeCategoryData.fileCount.toLocaleString()} items ({activeCategoryData.percentage.toFixed(1)}%)
                  </div>
                </>
              ) : (
                <>
                  <span className="text-[11px] uppercase font-bold tracking-widest text-[#8899b5]">
                    Analyzed Storage
                  </span>
                  <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-mono mt-1">
                    {formatBytes(totalBytes)}
                  </div>
                  <div className="text-xs text-[#20C5E8] font-semibold mt-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#20C5E8] inline-block animate-pulse" />
                    <span>{totalFiles.toLocaleString()} files indexed</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="text-xs text-[#68758B] mt-2 text-center">
            Click any colored arc segment to isolate category files
          </div>
        </div>

        {/* RIGHT COLUMN: REFINED TELEMETRY CARDS & CATEGORY DISTRIBUTION */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          {/* Quick Metrics Cluster */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="bg-[#131722] border border-[#20273c] hover:border-[#625BEE]/60 transition-all rounded-xl p-4 flex flex-col justify-between">
              <span className="text-xs text-[#8899b5] uppercase font-semibold flex items-center gap-1.5">
                <Files size={14} className="text-[#20C5E8]" />
                Files Scanned
              </span>
              <div className="text-2xl font-bold font-mono text-white mt-1.5">
                {totalFiles.toLocaleString()}
              </div>
              <span className="text-[11px] text-[#68758B] mt-1">Total physical inodes</span>
            </div>

            <div className="bg-[#131722] border border-[#20273c] hover:border-[#FF6B6B]/60 transition-all rounded-xl p-4 flex flex-col justify-between">
              <span className="text-xs text-[#FF6B6B] uppercase font-semibold flex items-center gap-1.5">
                <Layers size={14} className="text-[#FF6B6B]" />
                Duplicate Storage
              </span>
              <div className="text-2xl font-bold font-mono text-[#FF6B6B] mt-1.5">
                {formatBytes(displaySavings)}
              </div>
              <span className="text-[11px] text-[#8899b5] mt-1">
                {duplicateCount} copies ({duplicatePercentage}% redundant)
              </span>
            </div>
          </div>

          {/* Interactive Category Orbiters Strip */}
          <div className="bg-[#131722] border border-[#20273c] rounded-xl p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-xs uppercase font-bold tracking-wider text-[#8899b5] flex items-center gap-1.5">
                <PieChart size={14} className="text-[#925CFF]" />
                Category Distribution ({categories.length})
              </span>
              {selectedCategory && (
                <button
                  type="button"
                  onClick={() => onSelectCategory(null)}
                  className="text-[#20C5E8] hover:underline cursor-pointer font-semibold"
                >
                  Clear filter [X]
                </button>
              )}
            </div>

            {/* Orbiters Chips */}
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
                    className={`px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all flex items-center gap-2 ${
                      isSelected
                        ? 'border-white bg-white text-black shadow-md'
                        : isHovered
                        ? 'bg-[#1e2438] text-white border-[#3a4668]'
                        : 'bg-[#181d2c] text-[#b8c4db] border-[#22293e] hover:border-[#3a4668]'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span>{cat.name}</span>
                    <span className={`font-mono text-[11px] ${isSelected ? 'text-black' : 'text-[#8899b5]'}`}>
                      {cat.formattedSize}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Safety & Storage Savings Guarantee Bar */}
          <div className="bg-gradient-to-r from-[#131722] to-[#181e2e] border border-[#20273c] rounded-xl p-4 flex items-center justify-between text-xs text-[#8899b5]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#19B99A]/20 border border-[#19B99A]/40 text-[#19B99A] flex items-center justify-center shrink-0">
                <ShieldCheck size={18} />
              </div>
              <div>
                <span className="text-white font-bold block text-sm">Protected Restoration Guarantee</span>
                <span>Original copies preserved automatically. Recoverable anytime.</span>
              </div>
            </div>
            <span className="text-[#19B99A] font-bold font-mono text-sm hidden sm:block">
              100% REVERSIBLE
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
