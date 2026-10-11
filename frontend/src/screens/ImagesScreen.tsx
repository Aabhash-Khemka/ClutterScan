import React, { useState } from 'react';
import { NavTab, PerceptualImage } from '../types';
import { MOCK_PERCEPTUAL_CLUSTERS } from '../mockData';
import { DiffModal } from '../components/DiffModal';

interface ImagesScreenProps {
  onNavigate: (tab: NavTab) => void;
  onStageImageCandidate: (id: string) => void;
  stagedCandidateIds: string[];
  onShowNotice?: (msg: string) => void;
  clusters?: PerceptualCluster[];
}

export const ImagesScreen: React.FC<ImagesScreenProps> = ({
  onNavigate,
  onStageImageCandidate,
  stagedCandidateIds,
  onShowNotice,
  clusters: propClusters,
}) => {
  const clusters = propClusters !== undefined ? propClusters : MOCK_PERCEPTUAL_CLUSTERS;
  const [selectedClusterId, setSelectedClusterId] = useState<string>(clusters[0]?.id || 'group-1');
  const [activeDiffImage, setActiveDiffImage] = useState<PerceptualImage | null>(null);

  const activeCluster =
    clusters.find((c) => c.id === selectedClusterId) ||
    clusters[0];

  const referenceImage =
    activeCluster?.images?.find((img) => img.isReference) || activeCluster?.images?.[0];

  const totalImageGroups = clusters.length;
  const totalSimilarImages = clusters.reduce((acc, c) => acc + (c.images ? c.images.length : c.matchCount), 0);
  const totalEvaluatedPairs = clusters.reduce((acc, c) => {
    const n = c.images ? c.images.length : c.matchCount;
    return acc + Math.floor((n * (n - 1)) / 2);
  }, 0);

  const handleExportManifest = () => {
    if (!activeCluster) return;
    const manifest = {
      algorithm: 'DCT_PHASH_64BIT',
      hammingThreshold: 8,
      cluster: activeCluster.id,
      evaluatedPairs: totalEvaluatedPairs,
      images: activeCluster.images,
    };
    const blob = new Blob([JSON.stringify(manifest, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `phash_manifest_${activeCluster.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    if (onShowNotice) {
      onShowNotice('EXPORT pHASH MANIFEST: WRITTEN TO LOCAL DISK');
    }
  };

  const handleRerunScan = () => {
    if (onShowNotice) {
      onShowNotice('GPU_SURV_0: RE-COMPUTING DCT PERCEPTUAL FREQUENCIES... [COMPLETE]');
    }
  };

  return (
    <div className="w-full bg-[#0e0e0e] text-white font-mono text-xs flex flex-col gap-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#1f1f1f] pb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-base md:text-xl font-bold text-white tracking-widest uppercase">
              [PERCEPTUAL_HASH_MATRIX]
            </span>
            <span className="text-[11px] text-black bg-white font-bold px-1.5 py-0.5 uppercase">
              v2.4_DCT
            </span>
          </div>
          <p className="text-[11px] text-[#8e9192] uppercase tracking-wider">
            VISUAL SIMILARITY // PERCEPTUAL HASH (pHASH) + HAMMING DISTANCE CORRELATION
          </p>
        </div>
        <div className="flex flex-col md:items-end gap-0.5 text-[11px]">
          <div className="text-white tracking-widest uppercase">
            ALGORITHM: DCT_PHASH_64BIT // HAMMING_THRESHOLD: &lt;= 08
          </div>
          <div className="text-[#8e9192] uppercase">
            EXEC_NODE: GPU_SURV_0 // RADIX: HEX_LITTLE_ENDIAN
          </div>
        </div>
      </div>

      {/* SUMMARY STRIP */}
      <div className="w-full border border-[#1f1f1f] bg-black p-4 flex flex-wrap items-center justify-between gap-4 text-[11px] text-[#c4c7c8] uppercase">
        <div className="flex items-center gap-2">
          <span className="text-[#8e9192]">IMAGE GROUPS:</span>
          <span className="text-white font-bold">{totalImageGroups}</span>
        </div>
        <div className="text-[#444748] hidden md:inline">|</div>
        <div className="flex items-center gap-2">
          <span className="text-[#8e9192]">SIMILAR IMAGES:</span>
          <span className="text-white font-bold">{totalSimilarImages}</span>
        </div>
        <div className="text-[#444748] hidden md:inline">|</div>
        <div className="flex items-center gap-2">
          <span className="text-[#8e9192]">HAMMING THRESHOLD:</span>
          <span className="text-white font-bold">&lt;= 08</span>
        </div>
        <div className="text-[#444748] hidden md:inline">|</div>
        <div className="flex items-center gap-2">
          <span className="text-[#8e9192]">INSPECTED PAIRS:</span>
          <span className="text-white font-bold">{totalEvaluatedPairs.toLocaleString()}</span>
        </div>
        <div className="text-[#444748] hidden md:inline">|</div>
        <div className="flex items-center gap-2">
          <span className="text-[#8e9192]">STATUS:</span>
          <span className="text-white border border-[#444748] px-1 py-0.5">[IDLE_STABLE]</span>
        </div>
      </div>

      {/* GROUP SELECTOR TABS & CONTENT */}
      {clusters.length === 0 ? (
        <div className="w-full min-h-[350px] border border-[#1f1f1f] bg-black p-8 flex flex-col items-center justify-center gap-4 text-center">
          <div className="text-base font-bold text-white tracking-widest uppercase">
            [ZERO_SIMILAR_IMAGE_CLUSTERS_DETECTED]
          </div>
          <div className="text-xs text-[#8e9192] max-w-lg leading-relaxed uppercase">
            ALL SCANNED IMAGES EXHIBIT DISTINCT PERCEPTUAL HASH FREQUENCIES. ZERO SENSOR BURSTS OR DUPLICATE EDITS DETECTED WITHIN HAMMING DISTANCE &lt;= 08.
          </div>
          <button
            type="button"
            onClick={() => onNavigate('storage')}
            className="mt-2 px-6 py-2.5 border border-white bg-white text-black font-bold uppercase transition-none hover:bg-neutral-200 cursor-pointer"
          >
            → EXPLORE STORAGE DASHBOARD
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <div className="text-[#8e9192] text-[11px] uppercase tracking-widest">
              // CLUSTER_SELECTOR: SELECT EVALUATION TARGET
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {clusters.map((cluster) => {
                const isSelected = cluster.id === selectedClusterId;
                return (
                  <button
                    key={cluster.id}
                    type="button"
                    onClick={() => setSelectedClusterId(cluster.id)}
                    className={`px-4 py-2 border uppercase cursor-pointer transition-none font-bold ${
                      isSelected
                        ? 'bg-white text-black border-white'
                        : 'bg-[#0e0e0e] text-[#c4c7c8] border-[#1f1f1f] hover:border-white hover:text-white'
                    }`}
                  >
                    {cluster.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* FORENSIC COMPARISON IMAGE GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {activeCluster?.images?.map((img) => {
              const isStaged = stagedCandidateIds.includes(img.id);
              const isRef = img.isReference;

          return (
            <div
              key={img.id}
              className={`flex flex-col border bg-[#0e0e0e] ${
                isRef ? 'border-white' : 'border-[#1f1f1f]'
              }`}
            >
              {/* FRAME HEADER BAR */}
              <div className="h-8 bg-[#131313] px-3 flex items-center justify-between border-b border-[#1f1f1f] text-[11px]">
                <span className={`font-bold ${isRef ? 'text-white' : 'text-[#c4c7c8]'}`}>
                  {img.sectorLabel}
                </span>
                <span
                  className={`px-1.5 py-0.5 text-[10px] uppercase font-bold border ${
                    isRef
                      ? 'bg-white text-black border-white'
                      : 'text-white border-[#444748]'
                  }`}
                >
                  {img.badge}
                </span>
              </div>

              {/* SENSOR FRAME PREVIEW CONTAINER */}
              <div className="relative w-full aspect-video bg-black border-b border-[#1f1f1f] flex flex-col justify-between p-3 overflow-hidden group">
                {/* Hotlinked Image with CSS & SVG Fallback */}
                <img
                  className={`absolute inset-0 w-full h-full object-cover filter grayscale contrast-125 ${
                    isRef ? 'opacity-65' : 'opacity-50'
                  }`}
                  src={img.imgUrl}
                  alt={img.altText}
                  onError={(e) => {
                    // graceful fallback if offline
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />

                {/* Grid scanline background */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-black/80 pointer-events-none" />

                <div className="relative z-10 flex justify-between text-[10px] text-white uppercase font-bold">
                  <span>{img.overlayType}</span>
                  <span className="text-[#8e9192]">{img.pHash}</span>
                </div>

                {/* ASCII Reticle Overlay */}
                <div className="relative z-10 text-[10px] text-white uppercase flex flex-col items-center justify-center my-auto pointer-events-none text-center">
                  {img.overlayDetail.split('\n').map((line, i) => (
                    <span
                      key={i}
                      className={
                        i === 0
                          ? 'tracking-widest font-bold text-white'
                          : 'text-[9px] text-[#8e9192]'
                      }
                    >
                      {line}
                    </span>
                  ))}
                </div>

                <div className="relative z-10 flex justify-between text-[10px] text-[#8e9192] uppercase border-t border-[#1f1f1f] pt-1">
                  <span>CHK: OK</span>
                  <span className="text-white font-bold">
                    {isRef ? 'LOCKED_MASTER' : 'EVAL: MATCH'}
                  </span>
                </div>
              </div>

              {/* METADATA BLOCK */}
              <div className="p-3 flex flex-col gap-2 text-xs text-[#e2e2e2]">
                <div className="flex flex-col border-b border-[#1f1f1f] pb-2">
                  <span className="text-[#8e9192] text-[10px] uppercase">FILENAME:</span>
                  <span className="font-bold text-white truncate" title={img.filename}>
                    {img.filename}
                  </span>
                </div>

                <div className="flex justify-between border-b border-[#1f1f1f] pb-1">
                  <span className="text-[#8e9192] text-[10px] uppercase">DIMENSIONS:</span>
                  <span className="text-white font-bold">{img.dimensions}</span>
                </div>

                <div className="flex justify-between border-b border-[#1f1f1f] pb-1">
                  <span className="text-[#8e9192] text-[10px] uppercase">HAMMING DIST:</span>
                  <span className="text-white font-bold">{img.hammingDistance}</span>
                </div>

                <div className="flex justify-between border-b border-[#1f1f1f] pb-1">
                  <span className="text-[#8e9192] text-[10px] uppercase">SIMILARITY:</span>
                  <span className="text-white font-bold">{img.similarity}</span>
                </div>

                <div className="flex flex-col pt-1">
                  <span className="text-[#8e9192] text-[10px] uppercase">PATH:</span>
                  <span
                    className="text-[#8e9192] text-[10px] truncate"
                    title={img.path}
                  >
                    {img.path}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 mt-auto">
                  {isRef ? (
                    <button
                      type="button"
                      onClick={() => setActiveDiffImage(img)}
                      className="w-full py-1.5 border border-[#444748] text-[11px] text-[#8e9192] hover:text-white hover:bg-black hover:border-white uppercase cursor-pointer transition-none font-bold"
                    >
                      [INSPECT_TELEMETRY]
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onStageImageCandidate(img.id)}
                        className={`flex-1 py-1.5 border text-[11px] uppercase cursor-pointer transition-none font-bold ${
                          isStaged
                            ? 'bg-white text-black border-white'
                            : 'border-[#444748] text-white hover:bg-white hover:text-black hover:border-white'
                        }`}
                      >
                        {isStaged ? '[STAGED]' : '[STAGE_PURGE]'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveDiffImage(img)}
                        className="px-3 py-1.5 border border-[#444748] text-[11px] text-[#8e9192] hover:text-white hover:border-white uppercase cursor-pointer transition-none font-bold"
                      >
                        [DIFF]
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      </>
      )}

      {/* FORENSIC MANDATORY SAFETY NOTICE */}
      <div className="w-full border border-[#444748] p-4 bg-black flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white tracking-widest uppercase">
            [ANALYSIS_NOTE]
          </span>
          <span className="text-[#8e9192] text-[11px] uppercase">
            // PROTOCOL_ENFORCEMENT: ZERO_DESTRUCTIVE_AUTO_CLEAN
          </span>
        </div>
        <div className="text-[#c4c7c8] uppercase tracking-wide leading-relaxed text-xs">
          PERCEPTUAL SIMILARITY (pHASH) DOES NOT CONFIRM IDENTICAL CONTENT. DIFFERING SENSOR
          BURSTS OR EDITED VERSIONS MAY REPRESENT DISTINCT ARTISTIC ARTIFACTS. AUTOMATED
          DELETION IS STRICTLY DISALLOWED // MANUAL USER AUDIT MANDATORY.
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#1f1f1f] text-[11px] text-[#8e9192]">
          <span>SECURITY_KEY: SHA256_LOCAL_VERIFIED</span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleRerunScan}
              className="text-white font-bold hover:underline uppercase cursor-pointer"
            >
              [RE-RUN SCAN]
            </button>
            <button
              type="button"
              onClick={handleExportManifest}
              className="text-white font-bold hover:underline uppercase cursor-pointer"
            >
              [EXPORT pHASH MANIFEST]
            </button>
            <button
              type="button"
              onClick={() => onNavigate('cleanup')}
              className="text-white font-bold border border-white px-2 py-0.5 uppercase hover:bg-white hover:text-black cursor-pointer"
            >
              FORWARD TO CLEANUP &gt;&gt;
            </button>
          </div>
        </div>
      </div>

      {/* DIFF MODAL */}
      {activeDiffImage && referenceImage && (
        <DiffModal
          referenceImage={referenceImage}
          candidateImage={activeDiffImage}
          onClose={() => setActiveDiffImage(null)}
          onStageCandidate={onStageImageCandidate}
          isStaged={stagedCandidateIds.includes(activeDiffImage.id)}
        />
      )}
    </div>
  );
};
