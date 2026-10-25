import React, { useState } from 'react';
import { NavTab, PerceptualCluster, PerceptualImage } from '../types';
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
  const clusters = propClusters ?? [];
  const [selectedClusterId, setSelectedClusterId] = useState<string>(clusters[0]?.id || 'group-1');
  const [activeDiffImage, setActiveDiffImage] = useState<PerceptualImage | null>(null);

  const activeCluster =
    clusters.find((c) => c.id === selectedClusterId) ||
    clusters[0];

  const referenceImage =
    activeCluster?.images?.find((img) => img.isReference) || activeCluster?.images?.[0];

  const totalImageGroups = clusters.length;
  const totalSimilarImages = clusters.reduce((acc, c) => acc + (c.images ? c.images.length : c.matchCount), 0);
  const handleExportManifest = () => {
    if (!activeCluster) return;
    const manifest = {
      algorithm: 'DCT_PHASH_64BIT',
      hammingThreshold: 8,
      cluster: activeCluster.id,
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
      onShowNotice('Similar-image group exported as JSON.');
    }
  };

  return (
    <div className="w-full bg-[#080808] text-[#f5f5f5] font-sans flex flex-col gap-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#303030] pb-5">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Similar Images
            </h1>
            <span className="text-xs bg-white text-black font-semibold px-2 py-0.5 rounded-[2px] uppercase">
              Perceptual Hash
            </span>
          </div>
          <p className="text-base text-[#b8b8b8] max-w-2xl">
            Detect visually similar photos, resized copies, and photo burst sequences using perceptual hashing (pHash) and Hamming distance correlation.
          </p>
        </div>
        <div className="flex flex-col md:items-end gap-1 text-sm bg-[#141414] border border-[#303030] p-3 rounded-[2px]">
          <div className="text-white font-mono font-medium">
            DCT_PHASH_64BIT &bull; Threshold &le; 8 bits
          </div>
          <div className="text-xs text-[#858585]">
            Images matching within 8 bits are clustered for side-by-side review.
          </div>
        </div>
      </div>

      {/* SUMMARY STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border border-[#303030] bg-[#141414] p-4 rounded-[2px] flex flex-col gap-1">
          <span className="text-xs text-[#858585] uppercase tracking-wider font-semibold">Image Groups</span>
          <span className="text-2xl md:text-3xl font-bold font-mono text-white">{totalImageGroups}</span>
          <span className="text-xs text-[#b8b8b8]">Detected visual clusters</span>
        </div>
        <div className="border border-[#303030] bg-[#141414] p-4 rounded-[2px] flex flex-col gap-1">
          <span className="text-xs text-[#858585] uppercase tracking-wider font-semibold">Similar Images</span>
          <span className="text-2xl md:text-3xl font-bold font-mono text-white">{totalSimilarImages}</span>
          <span className="text-xs text-[#b8b8b8]">Total candidate matches</span>
        </div>
        <div className="border border-[#303030] bg-[#141414] p-4 rounded-[2px] flex flex-col gap-1">
          <span className="text-xs text-[#858585] uppercase tracking-wider font-semibold">Tolerance</span>
          <span className="text-2xl md:text-3xl font-bold font-mono text-white">&le; 8 bits</span>
          <span className="text-xs text-[#b8b8b8]">Hamming bit distance</span>
        </div>
        <div className="border border-[#303030] bg-[#141414] p-4 rounded-[2px] flex flex-col gap-1">
          <span className="text-xs text-[#858585] uppercase tracking-wider font-semibold">Safety Rule</span>
          <span className="text-base md:text-lg font-bold text-[#e5ad55] pt-1">Manual Audit</span>
          <span className="text-xs text-[#858585]">No automatic deletions</span>
        </div>
      </div>

      {/* GROUP SELECTOR TABS & CONTENT */}
      {clusters.length === 0 ? (
        <div className="w-full min-h-[350px] border border-[#303030] bg-[#141414] p-10 rounded-[2px] flex flex-col items-center justify-center gap-4 text-center">
          <div className="text-xl font-bold text-white tracking-tight">
            No Similar-Image Groups Found
          </div>
          <div className="text-base text-[#b8b8b8] max-w-lg leading-relaxed">
            No similar image groups were found for this scan. Similar-image detection may have been unchecked, or no supported images matched the 8-bit difference threshold.
          </div>
          <button
            type="button"
            onClick={() => onNavigate('storage')}
            className="mt-2 px-6 py-2.5 border border-white bg-white text-black font-semibold text-sm hover:bg-neutral-200 cursor-pointer rounded-[2px] transition-all"
          >
            Explore Storage Dashboard &rarr;
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2.5">
            <div className="text-xs text-[#858585] uppercase tracking-wider font-semibold">
              Select Image Cluster to Review:
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {clusters.map((cluster) => {
                const isSelected = cluster.id === selectedClusterId;
                return (
                  <button
                    key={cluster.id}
                    type="button"
                    onClick={() => setSelectedClusterId(cluster.id)}
                    className={`px-4 py-2 text-sm font-medium border rounded-[2px] cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-white text-black border-white font-semibold'
                        : 'bg-[#141414] text-[#b8b8b8] border-[#303030] hover:border-white hover:text-white'
                    }`}
                  >
                    {cluster.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* FORENSIC COMPARISON IMAGE GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {activeCluster?.images?.map((img) => {
              const isStaged = stagedCandidateIds.includes(img.id);
              const isRef = img.isReference;

              return (
                <div
                  key={img.id}
                  className={`flex flex-col border rounded-[2px] bg-[#141414] overflow-hidden ${
                    isRef ? 'border-white' : 'border-[#303030]'
                  }`}
                >
                  {/* FRAME HEADER BAR */}
                  <div className="h-10 bg-[#1b1b1b] px-3.5 flex items-center justify-between border-b border-[#303030] text-sm">
                    <span className={`font-semibold ${isRef ? 'text-white' : 'text-[#b8b8b8]'}`}>
                      {img.sectorLabel}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs font-semibold uppercase rounded-[2px] border ${
                        isRef
                          ? 'bg-white text-black border-white'
                          : 'bg-[#242424] text-[#f5f5f5] border-[#454545]'
                      }`}
                    >
                      {img.badge}
                    </span>
                  </div>

                  {/* SENSOR FRAME PREVIEW CONTAINER */}
                  <div className="relative w-full aspect-video bg-black border-b border-[#303030] flex flex-col justify-between p-3 overflow-hidden group">
                    <img
                      className={`absolute inset-0 w-full h-full object-cover filter contrast-110 ${
                        isRef ? 'opacity-80' : 'opacity-65'
                      }`}
                      src={img.imgUrl}
                      alt={img.altText}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />

                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />

                    <div className="relative z-10 flex justify-between text-xs text-white font-mono font-semibold">
                      <span>{img.overlayType}</span>
                      <span className="text-[#b8b8b8]">{img.pHash}</span>
                    </div>

                    <div className="relative z-10 flex justify-between text-xs text-[#b8b8b8] font-mono border-t border-[#303030]/60 pt-1">
                      <span>Check: OK</span>
                      <span className="text-white font-semibold">
                        {isRef ? 'Reference Image' : 'Match Candidate'}
                      </span>
                    </div>
                  </div>

                  {/* METADATA BLOCK */}
                  <div className="p-4 flex flex-col gap-2.5 text-sm">
                    <div className="flex flex-col border-b border-[#303030] pb-2">
                      <span className="text-xs text-[#858585] uppercase font-semibold">Filename</span>
                      <span className="font-semibold text-white text-base truncate font-mono mt-0.5" title={img.filename}>
                        {img.filename}
                      </span>
                    </div>

                    <div className="flex justify-between border-b border-[#303030] pb-1.5 text-sm">
                      <span className="text-[#858585]">Dimensions</span>
                      <span className="text-white font-mono font-medium">{img.dimensions}</span>
                    </div>

                    <div className="flex justify-between border-b border-[#303030] pb-1.5 text-sm">
                      <span className="text-[#858585]">Hamming Distance</span>
                      <span className="text-white font-mono font-medium">{img.hammingDistance}</span>
                    </div>

                    <div className="flex justify-between border-b border-[#303030] pb-1.5 text-sm">
                      <span className="text-[#858585]">Visual Similarity</span>
                      <span className="text-white font-semibold">{img.similarity}</span>
                    </div>

                    <div className="flex flex-col pt-1">
                      <span className="text-xs text-[#858585] uppercase font-semibold">Folder Path</span>
                      <span
                        className="text-xs text-[#b8b8b8] font-mono truncate mt-0.5"
                        title={img.path}
                      >
                        {img.path}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-3 mt-auto">
                      {isRef ? (
                        <button
                          type="button"
                          onClick={() => setActiveDiffImage(img)}
                          className="w-full py-2 border border-[#454545] text-sm text-[#b8b8b8] hover:text-white hover:bg-[#1b1b1b] hover:border-white rounded-[2px] cursor-pointer transition-colors font-medium"
                        >
                          Inspect Reference Details
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => onStageImageCandidate(img.id)}
                            className={`flex-1 py-2 text-sm rounded-[2px] cursor-pointer transition-colors font-semibold ${
                              isStaged
                                ? 'bg-[#57B887] text-black border border-[#57B887]'
                                : 'border border-white bg-white text-black hover:bg-neutral-200'
                            }`}
                          >
                            {isStaged ? 'Queued for Review' : 'Queue for Review'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveDiffImage(img)}
                            className="px-3.5 py-2 border border-[#454545] text-sm text-[#b8b8b8] hover:text-white hover:border-white rounded-[2px] cursor-pointer transition-colors font-medium"
                            title="Side-by-side comparison"
                          >
                            Diff
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

      {/* SAFETY NOTICE AND EXPORT BAR */}
      <div className="w-full border border-[#303030] p-5 bg-[#141414] rounded-[2px] flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white text-base">
            Safety Precaution:
          </span>
          <span className="text-xs bg-[#e5ad55]/20 text-[#e5ad55] border border-[#e5ad55]/30 px-2 py-0.5 rounded-[2px] font-semibold">
            Zero Auto-Delete
          </span>
        </div>
        <p className="text-sm text-[#b8b8b8] leading-relaxed">
          Perceptual similarity (pHash) does not prove identical content. Burst photos, cropped shots, or color-graded versions are often intentionally saved. Automated deletion is strictly prevented; manual review is required before taking any action.
        </p>
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#303030] text-sm text-[#858585]">
          <span>Review matched candidates carefully before queueing for cleanup.</span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleExportManifest}
              disabled={!activeCluster}
              className="text-white font-medium hover:underline cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Export Cluster (JSON)
            </button>
            <button
              type="button"
              onClick={() => onNavigate('cleanup')}
              className="text-black font-semibold bg-white border border-white px-4 py-2 rounded-[2px] hover:bg-neutral-200 cursor-pointer transition-colors text-sm"
            >
              Go to Cleanup Queue &rarr;
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
