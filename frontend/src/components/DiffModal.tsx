import React, { useState } from 'react';
import { PerceptualImage } from '../types';
import { X, Sliders, Layers, BarChart2 } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xl max-w-4xl w-full p-6 space-y-5 text-sm text-[#172033]">
        {/* Modal Header */}
        <div className="border-b border-[#E2E8F0] pb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#172033] tracking-tight">
              Visual Difference Inspection • {candidateImage.badge}
            </h2>
            <div className="text-xs text-[#64748B] mt-0.5">
              Reference: <strong className="text-[#172033]">{referenceImage.filename}</strong> ↔ Match: <strong className="text-[#172033]">{candidateImage.filename}</strong>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#64748B] hover:text-[#172033] hover:bg-[#F1F5F9] rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* View Mode Switcher */}
        <div className="flex flex-wrap gap-2 border-b border-[#E2E8F0] pb-4">
          <button
            type="button"
            onClick={() => setViewMode('SIDE_BY_SIDE')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              viewMode === 'SIDE_BY_SIDE'
                ? 'bg-[#5B5CE2] text-white shadow-xs'
                : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#172033]'
            }`}
          >
            Side-by-Side Comparison
          </button>
          <button
            type="button"
            onClick={() => setViewMode('OVERLAY_DIFFERENCE')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              viewMode === 'OVERLAY_DIFFERENCE'
                ? 'bg-[#5B5CE2] text-white shadow-xs'
                : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#172033]'
            }`}
          >
            Blended Overlay Difference
          </button>
          <button
            type="button"
            onClick={() => setViewMode('HISTOGRAM')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              viewMode === 'HISTOGRAM'
                ? 'bg-[#5B5CE2] text-white shadow-xs'
                : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#172033]'
            }`}
          >
            pHash Metric Details
          </button>
        </div>

        {/* Canvas Area */}
        <div className="border border-[#E2E8F0] bg-[#F8FAFC] rounded-xl p-4 min-h-[300px] flex items-center justify-center">
          {viewMode === 'SIDE_BY_SIDE' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              {/* Reference */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 space-y-2 shadow-xs">
                <div className="flex justify-between items-center text-xs border-b border-[#E2E8F0] pb-2">
                  <span className="font-semibold text-[#172033]">Reference Image • {referenceImage.dimensions}</span>
                  <span className="text-[#15803D] bg-[#DCFCE7] px-2 py-0.5 rounded-full font-semibold">100% Base</span>
                </div>
                <div className="relative aspect-video bg-[#0F172A]/5 rounded-lg overflow-hidden flex items-center justify-center border border-[#E2E8F0]">
                  <img
                    src={referenceImage.imgUrl}
                    alt={referenceImage.altText}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                <div className="text-xs text-[#64748B] font-mono truncate">
                  pHash: {referenceImage.pHash}
                </div>
              </div>

              {/* Candidate */}
              <div className="bg-white border-2 border-[#5B5CE2]/40 rounded-xl p-3.5 space-y-2 shadow-xs">
                <div className="flex justify-between items-center text-xs border-b border-[#E2E8F0] pb-2">
                  <span className="font-semibold text-[#172033]">Match Candidate • {candidateImage.dimensions}</span>
                  <span className="text-[#5B5CE2] bg-[#EEF2FF] px-2 py-0.5 rounded-full font-semibold">{candidateImage.similarity} match</span>
                </div>
                <div className="relative aspect-video bg-[#0F172A]/5 rounded-lg overflow-hidden flex items-center justify-center border border-[#E2E8F0]">
                  <img
                    src={candidateImage.imgUrl}
                    alt={candidateImage.altText}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                <div className="text-xs text-[#64748B] font-mono truncate">
                  pHash: {candidateImage.pHash}
                </div>
              </div>
            </div>
          )}

          {viewMode === 'OVERLAY_DIFFERENCE' && (
            <div className="w-full space-y-4">
              <div className="text-xs text-[#64748B] flex justify-between items-center">
                <span>Slide to blend between reference and candidate:</span>
                <span className="font-semibold text-[#172033]">Blend: {sliderPosition}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={sliderPosition}
                onChange={(e) => setSliderPosition(Number(e.target.value))}
                className="w-full accent-[#5B5CE2] cursor-pointer h-2 bg-[#E2E8F0] rounded-lg"
              />
              <div className="relative aspect-video max-h-[340px] mx-auto w-full bg-slate-900 border border-[#E2E8F0] rounded-xl overflow-hidden shadow-xs">
                <img
                  src={referenceImage.imgUrl}
                  alt="Reference baseline"
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ opacity: (100 - sliderPosition) / 100 }}
                />
                <img
                  src={candidateImage.imgUrl}
                  alt="Candidate match"
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ opacity: sliderPosition / 100 }}
                />
              </div>
            </div>
          )}

          {viewMode === 'HISTOGRAM' && (
            <div className="w-full space-y-3 bg-white p-4 rounded-xl border border-[#E2E8F0]">
              <div className="text-sm font-semibold text-[#172033] border-b border-[#E2E8F0] pb-2">
                64-Bit Discrete Cosine Transform (DCT) Metrics
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0]">
                  <span className="text-[#64748B] block">Hamming Bit Distance:</span>
                  <span className="font-bold text-[#172033] text-sm">{candidateImage.hammingDistance}</span>
                </div>
                <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0]">
                  <span className="text-[#64748B] block">Calculated Similarity:</span>
                  <span className="font-bold text-[#15803D] text-sm">{candidateImage.similarity}</span>
                </div>
                <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0]">
                  <span className="text-[#64748B] block">Hamming Tolerance:</span>
                  <span className="font-bold text-[#5B5CE2] text-sm">&le; 8 bits</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="border-t border-[#E2E8F0] pt-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-xs text-[#64748B]">
            Manual review confirmation: check that image is not an intentionally cropped or variant photo.
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-[#334155] rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => onStageCandidate(candidateImage.id)}
              className={`flex-1 sm:flex-initial px-5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-xs ${
                isStaged
                  ? 'bg-[#15803D] text-white'
                  : 'bg-[#5B5CE2] hover:bg-[#4849C7] text-white'
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
