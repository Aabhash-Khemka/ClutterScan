import React, { useState } from 'react';
import { NavTab, HashGroup } from '../types';
import { MOCK_HASH_GROUPS } from '../mockData';

interface DuplicatesScreenProps {
  onNavigate: (tab: NavTab) => void;
  onStageDuplicates: (count: number) => void;
  hashGroups?: HashGroup[];
}

export const DuplicatesScreen: React.FC<DuplicatesScreenProps> = ({
  onNavigate,
  onStageDuplicates,
  hashGroups: propHashGroups,
}) => {
  const groups = propHashGroups && propHashGroups.length > 0 ? propHashGroups : MOCK_HASH_GROUPS;
  const [selectedGroupId, setSelectedGroupId] = useState<string>(groups[0]?.id || '001');
  const [isStaged, setIsStaged] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('STATUS: READY');

  const currentGroup: HashGroup =
    groups.find((g) => g.id === selectedGroupId) || groups[0];

  const handleToggleStage = () => {
    if (!isStaged) {
      setIsStaged(true);
      setStatusMessage('STATUS: 2 ITEMS COMMITTED TO STAGING BUFFER');
      onStageDuplicates(2);
    } else {
      setIsStaged(false);
      setStatusMessage('STATUS: STANDBY');
    }
  };

  const handleReverify = () => {
    setStatusMessage('VERIFYING BLOCKS...');
    setTimeout(() => {
      setStatusMessage('CHECKSUM MATCH 100%: ZERO DIVERGENCE');
    }, 400);
  };

  const preferredFile = currentGroup.files.find((f) => f.isPreferred) || currentGroup.files[0];
  const candidateFile = currentGroup.files.find((f) => !f.isPreferred) || currentGroup.files[1] || currentGroup.files[0];

  return (
    <div className="w-full flex flex-col font-mono text-xs text-white">
      {/* FORENSIC HEADER BANNER */}
      <div className="w-full bg-[#0e0e0e] border-b border-[#1f1f1f] p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-white font-bold text-sm md:text-base tracking-wider uppercase">
            [CRYPTOGRAPHIC_HASH_MATCHES]
          </span>
          <span className="text-[#8e9192]">::</span>
          <span className="text-[#c4c7c8] uppercase">
            EXACT CONTENT DUPLICATION // SHA-256 ANALYSIS
          </span>
        </div>
        <div className="text-[#8e9192] uppercase tracking-widest text-[11px] text-right">
          ALGORITHM: SIZE_FILTER_PRECHECK + SHA256_DIGEST_VERIFICATION
        </div>
      </div>

      {/* SUMMARY TELEMETRY STRIP */}
      <div className="w-full bg-[#0e0e0e] border-b border-[#1f1f1f] px-4 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] uppercase tracking-widest">
          <div className="flex items-center gap-1.5">
            <span className="text-[#8e9192]">DUPLICATE GROUPS:</span>
            <span className="text-white font-bold">42</span>
          </div>
          <div className="text-[#444748]">|</div>
          <div className="flex items-center gap-1.5">
            <span className="text-[#8e9192]">DUPLICATE FILES:</span>
            <span className="text-white font-bold">137</span>
          </div>
          <div className="text-[#444748]">|</div>
          <div className="flex items-center gap-1.5">
            <span className="text-[#8e9192]">POTENTIAL RECOVERY:</span>
            <span className="text-white font-bold">8.42 GB</span>
          </div>
          <div className="text-[#444748]">|</div>
          <div className="flex items-center gap-1.5">
            <span className="text-[#8e9192]">HASH COLLISION RISK:</span>
            <span className="text-white font-bold">0.0000%</span>
          </div>
        </div>
      </div>

      {/* MAIN FORENSIC 2-COLUMN SPLIT */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 min-h-[600px] border-b border-[#1f1f1f]">
        {/* LEFT COLUMN: HASH GROUPS SELECTOR (4 COLS) */}
        <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-[#1f1f1f] p-4 flex flex-col gap-4 bg-[#0e0e0e]">
          <div className="flex items-center justify-between pb-2 border-b border-[#1f1f1f] text-xs font-bold text-white tracking-widest">
            <span>[HASH_GROUPS]</span>
            <span className="text-[#8e9192]">SECTORS: 001 - 042</span>
          </div>

          <div className="flex flex-col gap-3">
            {groups.map((group) => {
              const isSelected = group.id === selectedGroupId;
              return (
                <div
                  key={group.id}
                  onClick={() => setSelectedGroupId(group.id)}
                  className={`w-full p-4 border transition-none cursor-pointer flex flex-col gap-2 ${
                    isSelected
                      ? 'bg-white text-black border-white'
                      : 'bg-[#0e0e0e] text-white border-[#1f1f1f] hover:border-[#444748]'
                  }`}
                >
                  <div className="flex justify-between items-center text-xs font-bold tracking-widest">
                    <span>HASH GROUP #{group.id}</span>
                    <span
                      className={`px-1.5 py-0.5 text-[10px] uppercase font-bold border ${
                        isSelected
                          ? 'bg-black text-white border-black'
                          : 'border-[#444748] text-[#c4c7c8]'
                      }`}
                    >
                      {isSelected ? '[ACTIVE]' : '[STANDBY]'}
                    </span>
                  </div>

                  <div
                    className={`text-xs font-mono break-all ${
                      isSelected ? 'text-black font-bold' : 'text-[#c4c7c8]'
                    }`}
                  >
                    SHA-256: {group.shortHash}
                  </div>

                  <div
                    className={`grid grid-cols-2 gap-2 pt-1 text-[11px] uppercase border-t ${
                      isSelected ? 'border-neutral-300 text-black' : 'border-[#1f1f1f] text-[#8e9192]'
                    }`}
                  >
                    <div>MATCHES: {group.matchCount} FILES</div>
                    <div className="text-right font-bold">SIZE: {group.sizeFormatted}</div>
                  </div>

                  <div className="pt-1">
                    <button
                      type="button"
                      className={`w-full text-center py-1 text-[11px] tracking-widest uppercase font-bold border transition-none cursor-pointer ${
                        isSelected
                          ? 'border-black bg-black text-white'
                          : 'border-[#444748] text-white hover:bg-white hover:text-black'
                      }`}
                    >
                      {isSelected ? '[ SELECTED / VIEWING ]' : '[ VIEW GROUP ]'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* HEX LOG SUMMARY FOOTER */}
          <div className="mt-auto pt-4 border-t border-[#1f1f1f] text-[10px] text-[#8e9192] flex flex-col gap-1">
            <div>CHECKSUM RUNTIME: SHA256_AVX2_OPTIMIZED</div>
            <div>TOTAL DIGEST POOL: 4,921 ARTIFACTS</div>
            <div className="text-white">SYSTEM STATUS: READY FOR BULK TRIAGE</div>
          </div>
        </div>

        {/* RIGHT COLUMN: FORENSIC DOSSIER & RESOLUTION (8 COLS) */}
        <div className="lg:col-span-8 p-4 lg:p-6 flex flex-col gap-6 bg-[#0e0e0e]">
          {/* DIGEST HEADER & RAW METRIC */}
          <div className="flex flex-col gap-2 border border-[#1f1f1f] p-4 bg-black">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1f1f1f] pb-2 gap-2">
              <span className="text-white font-bold text-sm uppercase tracking-wider">
                [GROUP_ANALYSIS :: {currentGroup.sectorName}]
              </span>
              <span className="text-white text-[10px] uppercase border border-white px-2 py-0.5">
                EXACT BYTEWISE MATCH: CONFIRMED
              </span>
            </div>

            <div className="text-[11px] text-[#c4c7c8] pt-1 break-all">
              <span className="text-[#8e9192]">SHA-256: </span>
              {currentGroup.hash}
            </div>

            {/* TELEMETRY FILE PATH LIST */}
            <div className="pt-2 flex flex-col gap-1.5">
              <div className="text-[#8e9192] text-[10px] uppercase tracking-wider">
                PATH INVENTORY (MATCH IDENTIFIER VERIFIED):
              </div>
              {currentGroup.files.map((file, idx) => (
                <div
                  key={file.id}
                  className={`flex items-center justify-between border-l pl-3 py-1 bg-[#0e0e0e] text-xs ${
                    file.isPreferred ? 'border-white text-white' : 'border-[#444748] text-[#c4c7c8]'
                  }`}
                >
                  <span className="truncate max-w-xl">
                    {idx + 1}. {file.path}
                  </span>
                  <span className="text-[11px] text-[#8e9192] whitespace-nowrap pl-2">
                    ({file.size})
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* RESOLUTION ANALYSIS WORKFLOW */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#1f1f1f] pb-2 gap-2">
              <span className="text-white font-bold text-sm uppercase tracking-wider">
                [RESOLUTION_ANALYSIS]
              </span>
              <span className="text-[#8e9192] text-[11px] uppercase tracking-widest">
                METADATA + DOWNSAMPLE RESOLUTION MATRIX
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* BOX 1: IMAGE A [PREFERRED] */}
              <div className="border border-white bg-black p-4 flex flex-col justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-start border-b border-[#1f1f1f] pb-2">
                    <span className="text-xs font-bold text-white tracking-widest uppercase">
                      IMAGE A [PREFERRED]
                    </span>
                    <span className="bg-white text-black text-[10px] px-1.5 py-0.5 uppercase font-bold">
                      [KEEP]
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#8e9192]">STATUS:</span>
                      <span className="text-white font-bold">{preferredFile.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8e9192]">DIMENSIONS:</span>
                      <span className="text-white font-bold">{preferredFile.resolution}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8e9192]">FILE SIZE:</span>
                      <span className="text-white">{preferredFile.size}</span>
                    </div>
                    <div className="pt-1">
                      <span className="text-[#8e9192] block mb-0.5 text-[10px]">PATH:</span>
                      <span className="text-[#e2e2e2] break-all block bg-[#131313] p-1.5 border border-[#1f1f1f] text-[11px]">
                        {preferredFile.path}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#1f1f1f] pt-2">
                  <span className="text-[#8e9192] text-[10px] block mb-0.5 uppercase">
                    RATIONALE:
                  </span>
                  <p className="text-white text-[11px] uppercase leading-relaxed">
                    {preferredFile.rationale}
                  </p>
                </div>
              </div>

              {/* BOX 2: IMAGE B [CLEANUP CANDIDATE] */}
              <div className="border border-[#444748] bg-black p-4 flex flex-col justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-start border-b border-[#1f1f1f] pb-2">
                    <span className="text-xs font-bold text-[#c4c7c8] tracking-widest uppercase">
                      IMAGE B [CANDIDATE]
                    </span>
                    <span className="border border-[#444748] text-[#c4c7c8] text-[10px] px-1.5 py-0.5 uppercase">
                      [STAGE]
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#8e9192]">STATUS:</span>
                      <span className="text-white font-bold">{candidateFile.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8e9192]">DIMENSIONS:</span>
                      <span className="text-white font-bold">{candidateFile.resolution}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8e9192]">FILE SIZE:</span>
                      <span className="text-white">{candidateFile.size}</span>
                    </div>
                    <div className="pt-1">
                      <span className="text-[#8e9192] block mb-0.5 text-[10px]">PATH:</span>
                      <span className="text-[#c4c7c8] break-all block bg-[#131313] p-1.5 border border-[#1f1f1f] text-[11px]">
                        {candidateFile.path}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#1f1f1f] pt-2">
                  <span className="text-[#8e9192] text-[10px] block mb-0.5 uppercase">
                    RATIONALE:
                  </span>
                  <p className="text-[#c4c7c8] text-[11px] uppercase leading-relaxed">
                    {candidateFile.rationale}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ALGORITHMIC DECISION RULE CONTAINER */}
          <div className="border border-[#1f1f1f] p-4 bg-black space-y-3">
            <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-2 text-xs font-bold text-white tracking-widest uppercase">
              <span>[ALGORITHMIC_DECISION_RULE]</span>
              <span className="text-[#8e9192] text-[11px]">AUTOMATED RESOLUTION PROTOCOL</span>
            </div>

            <div className="space-y-2 text-xs uppercase leading-relaxed">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-[#8e9192] text-[11px] sm:w-36 shrink-0">REASON:</span>
                <span className="text-white font-bold">{currentGroup.algorithmicRule.reason}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-[#8e9192] text-[11px] sm:w-36 shrink-0">SAFETY RULE:</span>
                <span className="text-white">{currentGroup.algorithmicRule.safetyRule}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-[#8e9192] text-[11px] sm:w-36 shrink-0">STAGING ACTION:</span>
                <span className="text-[#c4c7c8]">{currentGroup.algorithmicRule.stagingAction}</span>
              </div>
            </div>

            <div className="pt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleToggleStage}
                className={`px-4 py-2 font-bold tracking-wider uppercase transition-none cursor-pointer border ${
                  isStaged
                    ? 'border-white bg-white text-black'
                    : 'border-white bg-black text-white hover:bg-white hover:text-black'
                }`}
              >
                {isStaged ? '[DUPLICATES_QUEUED_IN_STAGING]' : '[STAGE_DUPLICATES_FOR_CLEANUP]'}
              </button>
              <button
                type="button"
                onClick={handleReverify}
                className="border border-[#444748] bg-black text-[#c4c7c8] px-4 py-2 font-bold tracking-wider uppercase hover:border-white hover:text-white transition-none cursor-pointer"
              >
                [REVERIFY_SHA256_BLOCKS]
              </button>
              <button
                type="button"
                onClick={() => onNavigate('cleanup')}
                className="border border-[#444748] bg-black text-[#c4c7c8] px-4 py-2 font-bold tracking-wider uppercase hover:border-white hover:text-white transition-none cursor-pointer"
              >
                → FORWARD TO CLEANUP
              </button>
              <span className="text-[#8e9192] text-[11px] tracking-widest uppercase">
                {statusMessage}
              </span>
            </div>
          </div>

          {/* FORENSIC METRIC MATRIX (HEX SAMPLE VIEW) */}
          <div className="border border-[#1f1f1f] p-4 bg-black space-y-2">
            <div className="flex justify-between items-center text-[#8e9192] text-[11px] border-b border-[#1f1f1f] pb-2 uppercase">
              <span>HEX_STREAM_INSPECTION :: BYTE_RANGE [0x0000 - 0x003F]</span>
              <span>ENCODING: RAW_LITTLE_ENDIAN</span>
            </div>
            <div className="text-xs text-[#c4c7c8] overflow-x-auto whitespace-pre leading-relaxed select-all font-mono">
              {currentGroup.hexSample.map((line, idx) => (
                <div key={idx}>{line}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
