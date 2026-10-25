import React, { useState } from 'react';
import { NavTab, PerceptualCluster, PerceptualImage } from '../types';
import { DiffModal } from '../components/DiffModal';
import {
  Image,
  Layers,
  ShieldCheck,
  Download,
  ArrowRight,
  Eye,
  Sliders,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

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
      onShowNotice('Similar-image cluster exported as JSON.');
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 text-[#172033] pb-12">
      {/* HEADER SECTION */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-[#172033] tracking-tight">
              Similar Images
            </h1>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#EEF2FF] text-[#5B5CE2] border border-[#C7D2FE]">
              Perceptual Hashing (pHash)
            </span>
          </div>
          <p className="text-sm md:text-base text-[#64748B]">
            Identify visually similar photos, resized images, and camera burst sequences using DCT pHash and Hamming distance.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#F0FDF4] border border-[#BBF7D0] px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#15803D]">
          <ShieldCheck size={16} className="text-[#16A34A]" />
          <span>Manual review required • Zero auto-deletes</span>
        </div>
      </section>

      {/* SUMMARY STATS CARDS */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
          <div className="text-xs font-medium uppercase tracking-wider text-[#64748B]">Image Clusters</div>
          <div className="text-2xl lg:text-3xl font-bold text-[#172033] mt-1.5">{totalImageGroups}</div>
          <div className="text-xs text-[#94A3B8] mt-1">Detected visual groups</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
          <div className="text-xs font-medium uppercase tracking-wider text-[#64748B]">Similar Images</div>
          <div className="text-2xl lg:text-3xl font-bold text-[#172033] mt-1.5">{totalSimilarImages}</div>
          <div className="text-xs text-[#94A3B8] mt-1">Candidate photos matched</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
          <div className="text-xs font-medium uppercase tracking-wider text-[#64748B]">Bit Distance Threshold</div>
          <div className="text-2xl lg:text-3xl font-bold text-[#5B5CE2] mt-1.5">&le; 8 bits</div>
          <div className="text-xs text-[#94A3B8] mt-1">Hamming distance metric</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
          <div className="text-xs font-medium uppercase tracking-wider text-[#64748B]">Safety Safeguard</div>
          <div className="text-xl lg:text-2xl font-bold text-[#15803D] mt-1.5">Manual Review</div>
          <div className="text-xs text-[#94A3B8] mt-1">No automatic deletions</div>
        </div>
      </section>

      {/* CLUSTERS CONTENT */}
      {clusters.length === 0 ? (
        <div className="w-full bg-white border border-[#E2E8F0] rounded-xl p-12 flex flex-col items-center justify-center text-center shadow-xs">
          <div className="w-14 h-14 bg-[#EEF2FF] text-[#5B5CE2] rounded-2xl flex items-center justify-center mb-4">
            <Image size={28} />
          </div>
          <h2 className="text-xl font-bold text-[#172033] tracking-tight">
            No Similar-Image Clusters Found
          </h2>
          <p className="text-sm text-[#64748B] max-w-md mt-1 mb-6">
            No image clusters matched within the 8-bit perceptual hash difference threshold for this scan.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="px-5 py-2.5 bg-[#5B5CE2] hover:bg-[#4849C7] text-white text-sm font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            Configure & Run New Scan
          </button>
        </div>
      ) : (
        <>
          {/* Cluster Selection Tabs */}
          <section className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mr-2">
                Clusters:
              </span>
              {clusters.map((cluster) => {
                const isSelected = cluster.id === selectedClusterId;
                return (
                  <button
                    key={cluster.id}
                    type="button"
                    onClick={() => setSelectedClusterId(cluster.id)}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#5B5CE2] text-white shadow-xs'
                        : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#172033]'
                    }`}
                  >
                    {cluster.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleExportManifest}
              disabled={!activeCluster}
              className="px-3.5 py-1.5 border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-[#334155] text-xs font-semibold rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Download size={14} />
              <span>Export Cluster JSON</span>
            </button>
          </section>

          {/* Image Cards Grid */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {activeCluster?.images?.map((img) => {
              const isStaged = stagedCandidateIds.includes(img.id);
              const isRef = img.isReference;

              return (
                <div
                  key={img.id}
                  className={`bg-white border rounded-xl overflow-hidden shadow-xs flex flex-col transition-all ${
                    isRef ? 'border-[#5B5CE2] ring-1 ring-[#5B5CE2]' : 'border-[#E2E8F0]'
                  }`}
                >
                  {/* Card Header */}
                  <div className="px-4 py-2.5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#172033]">{img.sectorLabel}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        isRef
                          ? 'bg-[#DCFCE7] text-[#15803D]'
                          : 'bg-[#EEF2FF] text-[#5B5CE2]'
                      }`}
                    >
                      {img.badge}
                    </span>
                  </div>

                  {/* Image Canvas */}
                  <div className="relative aspect-video bg-slate-900 overflow-hidden flex items-center justify-center">
                    <img
                      className="w-full h-full object-cover"
                      src={img.imgUrl}
                      alt={img.altText}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded-md font-mono">
                      {img.pHash}
                    </div>
                  </div>

                  {/* Card Metadata */}
                  <div className="p-4 flex flex-col gap-2.5 text-xs flex-1">
                    <div>
                      <span className="text-[11px] text-[#64748B] uppercase font-semibold">Filename</span>
                      <div className="font-semibold text-sm text-[#172033] truncate mt-0.5" title={img.filename}>
                        {img.filename}
                      </div>
                    </div>

                    <div className="flex justify-between border-b border-[#F1F5F9] pb-1.5">
                      <span className="text-[#64748B]">Resolution</span>
                      <span className="font-medium text-[#172033]">{img.dimensions}</span>
                    </div>

                    <div className="flex justify-between border-b border-[#F1F5F9] pb-1.5">
                      <span className="text-[#64748B]">Hamming Dist.</span>
                      <span className="font-medium text-[#172033]">{img.hammingDistance}</span>
                    </div>

                    <div className="flex justify-between border-b border-[#F1F5F9] pb-1.5">
                      <span className="text-[#64748B]">Visual Match</span>
                      <span className="font-semibold text-[#5B5CE2]">{img.similarity}</span>
                    </div>

                    <div className="pt-1">
                      <span className="text-[11px] text-[#64748B] uppercase font-semibold">Location</span>
                      <div className="text-[11px] text-[#64748B] truncate mt-0.5" title={img.path}>
                        {img.path}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 mt-auto">
                      {isRef ? (
                        <button
                          type="button"
                          onClick={() => setActiveDiffImage(img)}
                          className="w-full py-2 border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-[#334155] rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-xs"
                        >
                          Inspect Reference
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => onStageImageCandidate(img.id)}
                            className={`flex-1 py-2 text-xs rounded-lg font-semibold cursor-pointer transition-colors shadow-xs ${
                              isStaged
                                ? 'bg-[#15803D] text-white'
                                : 'bg-[#5B5CE2] hover:bg-[#4849C7] text-white'
                            }`}
                          >
                            {isStaged ? 'Queued' : 'Queue Review'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveDiffImage(img)}
                            className="px-3 py-2 border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-[#334155] rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-xs"
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
          </section>
        </>
      )}

      {/* BOTTOM ACTION BAR */}
      <section className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="text-sm font-bold text-[#172033]">
            Perceptual Image Review Queue
          </div>
          <div className="text-xs text-[#64748B] mt-0.5">
            Queued images are transferred to the Cleanup Queue for final user confirmation before deletion.
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('cleanup')}
          className="px-5 py-2.5 bg-[#5B5CE2] hover:bg-[#4849C7] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-2"
        >
          <span>Open Cleanup Review</span>
          <ArrowRight size={14} />
        </button>
      </section>

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
