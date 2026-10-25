import React, { useState } from 'react';
import { PerceptualImage } from '../types';

interface DiffModalProps {
  referenceImage: PerceptualImage;
  candidateImage: PerceptualImage;
  onClose: () => void;
  onStageCandidate: (id: string) => void;
  isStaged: boolean;
}

export const DiffModal: React.FC<DiffModalProps> = ({
  referenceImage,
  candidateImage,
  onClose,
  onStageCandidate,
  isStaged,
}) => {
  const [viewMode, setViewMode] = useState<'SIDE_BY_SIDE' | 'OVERLAY_DIFFERENCE' | 'HISTOGRAM'>(
    'SIDE_BY_SIDE'
  );
  const [sliderPosition, setSliderPosition] = useState<number>(50);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-6 overflow-y-auto font-sans">
      <div className="bg-[#141414] border border-[#454545] rounded-[2px] shadow-2xl max-w-4xl w-full p-5 sm:p-7 space-y-5 text-sm text-[#f5f5f5]">
        {/* Modal Header */}
        <div className="border-b border-[#303030] pb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">
              Visual Difference Inspection &bull; {candidateImage.badge}
            </h2>
            <div className="text-xs text-[#858585] mt-1 font-mono">
              Reference: {referenceImage.filename} &harr; Match: {candidateImage.filename}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 border border-[#303030] text-[#b8b8b8] hover:text-white hover:border-white rounded-[2px] transition-colors cursor-pointer"
          >
            Close &times;
          </button>
        </div>

        {/* View Mode Switcher */}
        <div className="flex flex-wrap gap-2 border-b border-[#303030] pb-4">
          <button
            type="button"
            onClick={() => setViewMode('SIDE_BY_SIDE')}
            className={`px-4 py-2 font-medium text-xs rounded-[2px] border transition-colors cursor-pointer ${
              viewMode === 'SIDE_BY_SIDE'
                ? 'bg-white text-black border-white font-semibold'
                : 'bg-[#080808] text-[#b8b8b8] border-[#303030] hover:text-white'
            }`}
          >
            Side-by-Side Comparison
          </button>
          <button
            type="button"
            onClick={() => setViewMode('OVERLAY_DIFFERENCE')}
            className={`px-4 py-2 font-medium text-xs rounded-[2px] border transition-colors cursor-pointer ${
              viewMode === 'OVERLAY_DIFFERENCE'
                ? 'bg-white text-black border-white font-semibold'
                : 'bg-[#080808] text-[#b8b8b8] border-[#303030] hover:text-white'
            }`}
          >
            Blended Overlay Difference
          </button>
          <button
            type="button"
            onClick={() => setViewMode('HISTOGRAM')}
            className={`px-4 py-2 font-medium text-xs rounded-[2px] border transition-colors cursor-pointer ${
              viewMode === 'HISTOGRAM'
                ? 'bg-white text-black border-white font-semibold'
                : 'bg-[#080808] text-[#b8b8b8] border-[#303030] hover:text-white'
            }`}
          >
            pHash Metric Details
          </button>
        </div>

        {/* Visual Inspection Canvas Area */}
        <div className="border border-[#303030] bg-[#080808] rounded-[2px] p-4 min-h-[300px] flex items-center justify-center">
          {viewMode === 'SIDE_BY_SIDE' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
              {/* Reference */}
              <div className="border border-[#303030] rounded-[2px] p-3 space-y-2 bg-[#141414]">
                <div className="flex justify-between text-xs border-b border-[#303030] pb-2 text-[#858585]">
                  <span className="font-semibold text-white">Reference Image &bull; {referenceImage.dimensions}</span>
                  <span className="text-[#57B887] font-semibold">100% Base</span>
                </div>
                <div className="relative aspect-video bg-[#000000] rounded-[2px] overflow-hidden flex items-center justify-center border border-[#303030]">
                  <img
                    src={referenceImage.imgUrl}
                    alt={referenceImage.altText}
                    className="w-full h-full object-cover filter contrast-110"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                <div className="text-xs text-[#858585] font-mono truncate">
                  pHash: <span className="text-[#b8b8b8]">{referenceImage.pHash}</span>
                </div>
              </div>

              {/* Candidate */}
              <div className="border border-white/60 rounded-[2px] p-3 space-y-2 bg-[#141414]">
                <div className="flex justify-between text-xs border-b border-[#303030] pb-2 text-[#858585]">
                  <span className="font-semibold text-white">Match Candidate &bull; {candidateImage.dimensions}</span>
                  <span className="text-[#e5ad55] font-semibold">{candidateImage.similarity} match</span>
                </div>
                <div className="relative aspect-video bg-[#000000] rounded-[2px] overflow-hidden flex items-center justify-center border border-[#303030]">
                  <img
                    src={candidateImage.imgUrl}
                    alt={candidateImage.altText}
                    className="w-full h-full object-cover filter contrast-110"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                <div className="text-xs text-[#858585] font-mono truncate">
                  pHash: <span className="text-[#b8b8b8]">{candidateImage.pHash}</span>
                </div>
              </div>
            </div>
          )}

          {viewMode === 'OVERLAY_DIFFERENCE' && (
            <div className="w-full space-y-4">
              <div className="text-xs text-[#858585] flex justify-between items-center">
                <span>Slide to adjust image blending:</span>
                <span className="text-white font-mono font-semibold">Opacity: {sliderPosition}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={sliderPosition}
                onChange={(e) => setSliderPosition(Number(e.target.value))}
                className="w-full accent-white cursor-pointer h-2 bg-[#242424] rounded-lg"
              />
              <div className="relative aspect-video max-h-[340px] mx-auto w-full bg-black border border-[#303030] rounded-[2px] overflow-hidden">
                <img
                  src={referenceImage.imgUrl}
                  alt="Reference baseline"
                  className="absolute inset-0 w-full h-full object-cover filter contrast-125"
                  style={{ opacity: (100 - sliderPosition) / 100 }}
                />
                <img
                  src={candidateImage.imgUrl}
                  alt="Candidate derivative"
                  className="absolute inset-0 w-full h-full object-cover filter contrast-125 mix-blend-difference"
                  style={{ opacity: sliderPosition / 100 }}
                />
                <div className="absolute bottom-3 left-3 bg-black/80 px-2.5 py-1 border border-[#454545] rounded-[2px] text-xs font-mono text-white">
                  Hamming Distance: {candidateImage.hammingDistance} of 64 bits
                </div>
              </div>
            </div>
          )}

          {viewMode === 'HISTOGRAM' && (
            <div className="w-full space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border border-[#303030] p-4 bg-[#141414] rounded-[2px]">
                <div>
                  <span className="text-[#858585] block">ALGORITHM:</span>
                  <span className="text-white font-bold text-sm">64-BIT DCT</span>
                </div>
                <div>
                  <span className="text-[#858585] block">HAMMING DELTA:</span>
                  <span className="text-white font-bold text-sm">{candidateImage.hammingDistance} BITS</span>
                </div>
                <div>
                  <span className="text-[#858585] block">SIMILARITY:</span>
                  <span className="text-white font-bold text-sm">{candidateImage.similarity}</span>
                </div>
                <div>
                  <span className="text-[#858585] block">SAFETY:</span>
                  <span className="text-[#e5ad55] font-bold text-sm">MANUAL AUDIT</span>
                </div>
              </div>
              <div className="border border-[#303030] p-4 bg-[#141414] rounded-[2px] space-y-2 text-xs">
                <div className="text-[#858585] font-semibold uppercase">Perceptual Hash Values</div>
                <div className="text-[#b8b8b8] break-all font-mono">Reference: {referenceImage.pHash}</div>
                <div className="text-white font-bold break-all font-mono">Candidate: {candidateImage.pHash}</div>
                <div className="text-[#858585] pt-2 text-xs">
                  Similarity metric is calculated as (64 &minus; bit differences) &divide; 64. It ranks visual closeness, not byte-for-byte identity.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-[#303030]">
          <div className="text-xs text-[#858585]">
            Visual similarity based on DCT perceptual hashes. No automated deletion.
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#454545] text-[#b8b8b8] hover:text-white rounded-[2px] text-xs font-medium transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onStageCandidate(candidateImage.id);
                onClose();
              }}
              className={`px-5 py-2 rounded-[2px] text-xs font-semibold cursor-pointer transition-colors ${
                isStaged
                  ? 'border border-[#57B887] bg-[#57B887] text-black'
                  : 'border border-white bg-white text-black hover:bg-neutral-200'
              }`}
            >
              {isStaged ? 'Queued for Review' : 'Queue for Review'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
