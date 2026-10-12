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
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-[#0e0e0e] border border-white max-w-4xl w-full p-4 sm:p-6 space-y-4 font-mono text-xs text-white">
        {/* Modal Header */}
        <div className="border-b border-[#1f1f1f] pb-3 flex items-start justify-between">
          <div>
            <div className="text-sm font-bold tracking-widest uppercase text-white">
              [DIFF_INSPECTION_BUFFER] :: {candidateImage.badge}
            </div>
            <div className="text-[11px] text-[#8e9192] uppercase mt-0.5">
              REFERENCE: {referenceImage.filename} ↔ CANDIDATE: {candidateImage.filename}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-xs px-2.5 py-1 border border-[#444748] text-[#c4c7c8] hover:text-white hover:border-white transition-none"
          >
            [ ESC / CLOSE ]
          </button>
        </div>

        {/* View Mode Switcher */}
        <div className="flex flex-wrap gap-2 border-b border-[#1f1f1f] pb-3">
          <button
            type="button"
            onClick={() => setViewMode('SIDE_BY_SIDE')}
            className={`px-3 py-1.5 uppercase font-bold text-[11px] border transition-none cursor-pointer ${
              viewMode === 'SIDE_BY_SIDE'
                ? 'bg-white text-black border-white'
                : 'bg-black text-[#c4c7c8] border-[#444748] hover:text-white'
            }`}
          >
            [ SIDE-BY-SIDE SPLIT ]
          </button>
          <button
            type="button"
            onClick={() => setViewMode('OVERLAY_DIFFERENCE')}
            className={`px-3 py-1.5 uppercase font-bold text-[11px] border transition-none cursor-pointer ${
              viewMode === 'OVERLAY_DIFFERENCE'
                ? 'bg-white text-black border-white'
                : 'bg-black text-[#c4c7c8] border-[#444748] hover:text-white'
            }`}
          >
            [ BLENDED OVERLAY ]
          </button>
          <button
            type="button"
            onClick={() => setViewMode('HISTOGRAM')}
            className={`px-3 py-1.5 uppercase font-bold text-[11px] border transition-none cursor-pointer ${
              viewMode === 'HISTOGRAM'
                ? 'bg-white text-black border-white'
                : 'bg-black text-[#c4c7c8] border-[#444748] hover:text-white'
            }`}
          >
            [ HASH DETAILS ]
          </button>
        </div>

        {/* Visual Inspection Canvas Area */}
        <div className="border border-[#1f1f1f] bg-black p-3 min-h-[280px] flex items-center justify-center">
          {viewMode === 'SIDE_BY_SIDE' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              {/* Reference */}
              <div className="border border-[#444748] p-2 space-y-2">
                <div className="flex justify-between text-[11px] border-b border-[#1f1f1f] pb-1 text-[#8e9192]">
                  <span>[MASTER] {referenceImage.dimensions}</span>
                  <span className="text-white font-bold">100% BASE</span>
                </div>
                <div className="relative aspect-video bg-[#131313] overflow-hidden flex items-center justify-center">
                  <img
                    src={referenceImage.imgUrl}
                    alt={referenceImage.altText}
                    className="w-full h-full object-cover grayscale contrast-125 opacity-75"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-[#8e9192] text-[10px]">
                    + RAW SENSOR GRID +
                  </div>
                </div>
                <div className="text-[10px] text-[#c4c7c8] truncate">
                  pHASH: {referenceImage.pHash}
                </div>
              </div>

              {/* Candidate */}
              <div className="border border-white p-2 space-y-2">
                <div className="flex justify-between text-[11px] border-b border-[#1f1f1f] pb-1 text-[#8e9192]">
                  <span>[CANDIDATE] {candidateImage.dimensions}</span>
                  <span className="text-white font-bold">{candidateImage.similarity}</span>
                </div>
                <div className="relative aspect-video bg-[#131313] overflow-hidden flex items-center justify-center">
                  <img
                    src={candidateImage.imgUrl}
                    alt={candidateImage.altText}
                    className="w-full h-full object-cover grayscale contrast-125 opacity-75"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-white text-[10px] font-bold">
                    :: {candidateImage.badge} MATRIX ::
                  </div>
                </div>
                <div className="text-[10px] text-[#c4c7c8] truncate">
                  pHASH: {candidateImage.pHash}
                </div>
              </div>
            </div>
          )}

          {viewMode === 'OVERLAY_DIFFERENCE' && (
            <div className="w-full space-y-3">
              <div className="text-[11px] text-[#8e9192] flex justify-between">
                <span>Adjust the image overlay</span>
                <span className="text-white font-bold">CANDIDATE OPACITY: {sliderPosition}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={sliderPosition}
                onChange={(e) => setSliderPosition(Number(e.target.value))}
                className="w-full accent-white cursor-pointer"
              />
              <div className="relative aspect-video max-h-[320px] mx-auto w-full bg-[#131313] border border-[#444748] overflow-hidden">
                <img
                  src={referenceImage.imgUrl}
                  alt="Reference baseline"
                  className="absolute inset-0 w-full h-full object-cover grayscale contrast-150"
                  style={{ opacity: (100 - sliderPosition) / 100 }}
                />
                <img
                  src={candidateImage.imgUrl}
                  alt="Candidate derivative"
                  className="absolute inset-0 w-full h-full object-cover grayscale contrast-125 mix-blend-difference"
                  style={{ opacity: sliderPosition / 100 }}
                />
                <div className="absolute bottom-2 left-2 bg-black/80 px-2 py-0.5 border border-white text-[10px]">
                  pHash distance: {candidateImage.hammingDistance} of 64 bits
                </div>
              </div>
            </div>
          )}

          {viewMode === 'HISTOGRAM' && (
            <div className="w-full space-y-3 font-mono text-[11px]">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border border-[#1f1f1f] p-3 bg-[#131313]">
                <div>
                  <span className="text-[#8e9192] block">DISCRETE COSINE:</span>
                  <span className="text-white font-bold">64-BIT DCT</span>
                </div>
                <div>
                  <span className="text-[#8e9192] block">HAMMING DELTA:</span>
                  <span className="text-white font-bold">{candidateImage.hammingDistance} BITS</span>
                </div>
                <div>
                  <span className="text-[#8e9192] block">HASH SIMILARITY:</span>
                  <span className="text-white font-bold">{candidateImage.similarity}</span>
                </div>
                <div>
                  <span className="text-[#8e9192] block">CLASSIFICATION:</span>
                  <span className="text-white font-bold">VISUALLY SIMILAR</span>
                </div>
              </div>
              <div className="border border-[#1f1f1f] p-3 bg-[#131313] space-y-1">
                <div className="text-[#8e9192]">PERCEPTUAL HASH VALUES:</div>
                <div className="text-[#c4c7c8] break-all">Reference: {referenceImage.pHash}</div>
                <div className="text-white font-bold break-all">Candidate: {candidateImage.pHash}</div>
                <div className="text-[#8e9192] pt-2">Similarity is calculated as (64 − bit differences) ÷ 64. It is not a probability or an image-content verification.</div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2 border-t border-[#1f1f1f]">
          <div className="text-[11px] text-[#8e9192]">
            Similarity is based on perceptual hashes, not pixel-by-pixel identity.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 border border-[#444748] text-[#c4c7c8] hover:text-white transition-none uppercase"
            >
              [ CLOSE ]
            </button>
            <button
              type="button"
              onClick={() => {
                onStageCandidate(candidateImage.id);
                onClose();
              }}
              className="px-4 py-1.5 border border-white bg-white text-black font-bold uppercase transition-none hover:bg-neutral-200"
            >
              {isStaged ? 'Remove review mark' : 'Mark for review'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
