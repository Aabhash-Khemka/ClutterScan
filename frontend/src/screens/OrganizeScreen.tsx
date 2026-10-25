import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  FolderTree,
  Folder,
  ArrowRight,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Settings2,
  Play,
  Search,
  Filter,
  Layers,
  Sparkles,
  Check,
  ShieldCheck
} from 'lucide-react';

interface OrganizeScreenProps {
  currentPath?: string;
  onShowNotice?: (msg: string) => void;
}

export const OrganizeScreen: React.FC<OrganizeScreenProps> = ({
  currentPath = '',
  onShowNotice,
}) => {
  const [folderPath, setFolderPath] = useState(currentPath);
  const [collegeKeywords, setCollegeKeywords] = useState('assignment,lecture,syllabus,notes,exam,quiz,lab,cs101,math,physics');
  const [projectKeywords, setProjectKeywords] = useState('src,build,package,repo,git,readme,spec,docker,config');
  const [showConfig, setShowConfig] = useState(false);

  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [moves, setMoves] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchFilter, setSearchFilter] = useState('');

  const [executing, setExecuting] = useState(false);
  const [executeResult, setExecuteResult] = useState<any>(null);

  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [undoingId, setUndoingId] = useState<string | null>(null);

  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      const data = await api.getOrganizeHistory();
      setHistory(data || []);
    } catch {
      // ignore
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleScan = async () => {
    if (!folderPath.trim()) return;
    setLoading(true);
    setExecuteResult(null);
    try {
      const colArr = collegeKeywords.split(',').map((k) => k.trim()).filter(Boolean);
      const projArr = projectKeywords.split(',').map((k) => k.trim()).filter(Boolean);
      const res = await api.scanOrganize(folderPath.trim(), colArr, projArr);
      setPlan(res);
      setMoves(res.moves || []);
      if (onShowNotice) {
        onShowNotice(`Organize scan completed: ${res.moves?.length || 0} files planned.`);
      }
    } catch (err: any) {
      if (onShowNotice) {
        onShowNotice(`Scan error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!moves.length || !folderPath.trim()) return;
    const readyMoves = moves.filter((m) => m.status === 'ready');
    if (!readyMoves.length) {
      if (onShowNotice) onShowNotice('No valid files ready to move.');
      return;
    }
    setExecuting(true);
    try {
      const res = await api.executeOrganize(folderPath.trim(), moves);
      setExecuteResult(res);
      if (onShowNotice) {
        onShowNotice(`Organize complete: ${res.totalMoved} files moved.`);
      }
      loadHistory();
    } catch (err: any) {
      if (onShowNotice) {
        onShowNotice(`Execution failed: ${err.message}`);
      }
    } finally {
      setExecuting(false);
    }
  };

  const handleUndo = async (operationId: string) => {
    setUndoingId(operationId);
    try {
      const res = await api.undoOrganize(operationId);
      if (onShowNotice) {
        onShowNotice(`Undo complete: ${res.restored} files restored.`);
      }
      await loadHistory();
    } catch (err: any) {
      const errorMsg = err?.message || (typeof err === 'string' ? err : 'Operation failed');
      if (onShowNotice) {
        onShowNotice(`Undo failed: ${errorMsg}`);
      }
      await loadHistory();
    } finally {
      setUndoingId(null);
    }
  };

  const handleCategoryOverride = (moveId: string, newCategory: string) => {
    setMoves((prev) =>
      prev.map((m) => {
        if (m.id !== moveId) return m;
        const normalized = folderPath.replace(/\\/g, '/').replace(/\/$/, '');
        const newDest = `${normalized}/${newCategory}/${m.filename}`;
        return {
          ...m,
          category: newCategory,
          destPath: newDest,
          userOverride: true,
          status: 'ready',
          conflictNote: '',
        };
      })
    );
  };

  const handleSkipToggle = (moveId: string) => {
    setMoves((prev) =>
      prev.map((m) => {
        if (m.id !== moveId) return m;
        const newStatus = m.status === 'skipped' ? 'ready' : 'skipped';
        return { ...m, status: newStatus };
      })
    );
  };

  const categories = Array.from(new Set(moves.map((m) => m.category))).sort();

  const filteredMoves = moves.filter((m) => {
    if (selectedCategory !== 'ALL' && m.category !== selectedCategory) return false;
    if (searchFilter && !m.filename.toLowerCase().includes(searchFilter.toLowerCase())) return false;
    return true;
  });

  const readyCount = moves.filter((m) => m.status === 'ready').length;
  const conflictCount = moves.filter((m) => m.status === 'conflict').length;
  const skippedCount = moves.filter((m) => m.status === 'skipped').length;

  return (
    <div className="w-full flex flex-col gap-6 text-[#172033] pb-12">
      {/* HEADER SECTION */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-[#172033] tracking-tight">
              Smart File Organizer
            </h1>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#EEF2FF] text-[#5B5CE2] border border-[#C7D2FE]">
              Intelligent Classification
            </span>
          </div>
          <p className="text-sm md:text-base text-[#64748B]">
            Sort loose files into structured categories by file type, academic topics, or project keywords with instant 1-click lossless undo.
          </p>
        </div>

        <button
          onClick={() => setShowConfig(!showConfig)}
          className="flex items-center gap-2 border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] px-4 py-2 text-xs text-[#334155] font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
        >
          <Settings2 size={15} />
          <span>{showConfig ? 'Hide Rules' : 'Category Rules'}</span>
        </button>
      </section>

      {/* CLASSIFICATION RULES PANEL */}
      {showConfig && (
        <section className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs flex flex-col gap-4">
          <div className="text-sm font-semibold text-[#172033]">Custom Keyword Classification Rules</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#64748B] font-medium">Academic &amp; Coursework Keywords (comma separated)</label>
              <input
                type="text"
                value={collegeKeywords}
                onChange={(e) => setCollegeKeywords(e.target.value)}
                className="bg-[#F8FAFC] border border-[#E2E8F0] px-3.5 py-2 text-sm text-[#172033] rounded-lg focus:border-[#5B5CE2] focus:bg-white outline-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#64748B] font-medium">Project &amp; Code Keywords (comma separated)</label>
              <input
                type="text"
                value={projectKeywords}
                onChange={(e) => setProjectKeywords(e.target.value)}
                className="bg-[#F8FAFC] border border-[#E2E8F0] px-3.5 py-2 text-sm text-[#172033] rounded-lg focus:border-[#5B5CE2] focus:bg-white outline-none"
              />
            </div>
          </div>
        </section>
      )}

      {/* FOLDER INPUT & ACTION CARD */}
      <section className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Folder size={18} className="absolute left-3.5 top-3.5 text-[#94A3B8]" />
          <input
            type="text"
            value={folderPath}
            onChange={(e) => setFolderPath(e.target.value)}
            placeholder="Enter target directory path (e.g. C:\Users\Username\Downloads)..."
            className="w-full bg-[#F8FAFC] border border-[#E2E8F0] pl-10 pr-4 py-3 text-sm text-[#172033] placeholder:text-[#94A3B8] rounded-lg focus:border-[#5B5CE2] focus:bg-white outline-none"
          />
        </div>
        <button
          onClick={handleScan}
          disabled={loading || !folderPath.trim()}
          className="w-full sm:w-auto bg-[#5B5CE2] hover:bg-[#4849C7] disabled:opacity-50 text-white px-6 py-3 text-sm font-semibold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <Play size={16} fill="white" />
          <span>{loading ? 'Analyzing Files...' : 'Generate Plan'}</span>
        </button>
      </section>

      {/* PLAN PREVIEW & EXECUTION */}
      {plan && (
        <div className="flex flex-col gap-4">
          {/* Plan Metrics */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
              <div className="text-xs font-medium uppercase tracking-wider text-[#64748B]">Total Loose Files</div>
              <div className="text-2xl font-bold text-[#172033] mt-1">{moves.length}</div>
              <div className="text-xs text-[#94A3B8] mt-0.5">Discovered in folder</div>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
              <div className="text-xs font-medium uppercase tracking-wider text-[#64748B]">Ready to Move</div>
              <div className="text-2xl font-bold text-[#15803D] mt-1">{readyCount}</div>
              <div className="text-xs text-[#94A3B8] mt-0.5">Zero naming collisions</div>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
              <div className="text-xs font-medium uppercase tracking-wider text-[#64748B]">Collisions (Blocked)</div>
              <div className="text-2xl font-bold text-[#B45309] mt-1">{conflictCount}</div>
              <div className="text-xs text-[#94A3B8] mt-0.5">Dest. name conflicts</div>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
              <div className="text-xs font-medium uppercase tracking-wider text-[#64748B]">Excluded</div>
              <div className="text-2xl font-bold text-[#64748B] mt-1">{skippedCount}</div>
              <div className="text-xs text-[#94A3B8] mt-0.5">Skipped from move</div>
            </div>
          </section>

          {/* Action Execution Banner */}
          <section className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-sm text-[#172033]">
                Review Proposed Organization
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Files are moved safely only after execution. You can adjust categories or skip individual files.
              </p>
            </div>
            <button
              onClick={handleExecute}
              disabled={executing || readyCount === 0}
              className="w-full sm:w-auto bg-[#15803D] hover:bg-[#166534] disabled:opacity-40 text-white px-6 py-2.5 text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <CheckCircle2 size={16} />
              <span>{executing ? 'Organizing Files...' : `Apply Plan (${readyCount} Files)`}</span>
            </button>
          </section>

          {/* Execution Result */}
          {executeResult && (
            <div className="bg-[#F0FDF4] border border-[#86EFAC] rounded-xl p-4 text-xs text-[#166534] flex flex-col gap-2 shadow-xs">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 size={18} className="text-[#16A34A]" />
                <span>Organize Completed: {executeResult.totalMoved} files categorized successfully!</span>
              </div>
              {executeResult.operationId && (
                <div className="flex items-center gap-3 pt-1">
                  <span>Batch ID: {executeResult.operationId}</span>
                  <button
                    onClick={() => handleUndo(executeResult.operationId)}
                    disabled={undoingId === executeResult.operationId}
                    className="border border-[#15803D] bg-white text-[#15803D] hover:bg-[#15803D] hover:text-white px-2.5 py-1 text-xs font-semibold rounded-md cursor-pointer transition-colors"
                  >
                    {undoingId === executeResult.operationId ? 'Restoring files...' : 'Lossless Undo Now'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Moves Table Card */}
          <section className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden flex flex-col">
            {/* Filter controls */}
            <div className="bg-[#F8FAFC] p-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                <button
                  onClick={() => setSelectedCategory('ALL')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    selectedCategory === 'ALL'
                      ? 'bg-[#5B5CE2] text-white shadow-xs'
                      : 'bg-white text-[#64748B] hover:text-[#172033] border border-[#E2E8F0]'
                  }`}
                >
                  All ({moves.length})
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                      selectedCategory === cat
                        ? 'bg-[#5B5CE2] text-white shadow-xs'
                        : 'bg-white text-[#64748B] hover:text-[#172033] border border-[#E2E8F0]'
                    }`}
                  >
                    {cat} ({moves.filter((m) => m.category === cat).length})
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-72">
                <Search size={15} className="absolute left-3 top-2.5 text-[#94A3B8]" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Filter by filename..."
                  className="w-full bg-white border border-[#E2E8F0] pl-9 pr-3 py-2 text-xs text-[#172033] placeholder:text-[#94A3B8] rounded-lg focus:border-[#5B5CE2] outline-none"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">File Name &amp; Source</th>
                    <th className="py-3 px-4">Target Category</th>
                    <th className="py-3 px-4">Rule Reason</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Exclude / Include</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] text-sm">
                  {filteredMoves.map((m) => (
                    <tr key={m.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-4 max-w-sm">
                        <div className="font-medium text-sm text-[#172033] truncate">{m.filename}</div>
                        <div className="text-xs text-[#64748B] truncate mt-0.5" title={m.sourcePath}>{m.sourcePath}</div>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={m.category}
                          onChange={(e) => handleCategoryOverride(m.id, e.target.value)}
                          className="bg-white border border-[#CBD5E1] px-2.5 py-1 text-xs text-[#172033] rounded-lg focus:border-[#5B5CE2] outline-none cursor-pointer"
                        >
                          <option value="Documents">Documents</option>
                          <option value="Images">Images</option>
                          <option value="Videos">Videos</option>
                          <option value="Audio">Audio</option>
                          <option value="Archives">Archives</option>
                          <option value="Code">Code</option>
                          <option value="Installers">Installers</option>
                          <option value="College">College</option>
                          <option value="Unsorted">Unsorted</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-xs text-[#64748B]">{m.ruleReason}</td>
                      <td className="py-3 px-4">
                        {m.status === 'ready' && (
                          <span className="text-[11px] font-semibold text-[#15803D] bg-[#DCFCE7] px-2.5 py-1 rounded-full">
                            Ready
                          </span>
                        )}
                        {m.status === 'conflict' && (
                          <span className="text-[11px] font-semibold text-[#B45309] bg-[#FEF3C7] px-2.5 py-1 rounded-full" title={m.conflictNote}>
                            Name Collision
                          </span>
                        )}
                        {m.status === 'skipped' && (
                          <span className="text-[11px] font-semibold text-[#64748B] bg-[#F1F5F9] px-2.5 py-1 rounded-full">
                            Excluded
                          </span>
                        )}
                        {m.status === 'moved' && (
                          <span className="text-[11px] font-semibold text-[#15803D] bg-[#DCFCE7] px-2.5 py-1 rounded-full">
                            Moved ✓
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleSkipToggle(m.id)}
                          className="border border-[#CBD5E1] hover:bg-[#F8FAFC] px-3 py-1 text-xs text-[#334155] rounded-lg font-medium transition-colors cursor-pointer shadow-xs"
                        >
                          {m.status === 'skipped' ? 'Include' : 'Skip'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredMoves.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-[#64748B] text-sm">
                        No files matching current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* HISTORY & UNDO JOURNAL */}
      <section className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 text-sm">
          <div className="font-semibold text-[#172033]">
            Organization Journal &amp; Reversible Moves
          </div>
          <span className="text-[#64748B] text-xs">
            {history.length} Previous Operations Recorded
          </span>
        </div>

        {history.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#64748B]">
            No previous organize operations recorded.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {history.map((op) => (
              <div
                key={op.id}
                className="border border-[#E2E8F0] bg-[#F8FAFC] p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#172033] text-xs">{op.sourceFolder}</span>
                    <span className="text-xs text-[#94A3B8]">• {op.createdAt}</span>
                  </div>
                  <div className="text-xs text-[#64748B]">
                    Status: <strong className="text-[#172033] font-medium">{op.status}</strong> | Moved: <strong className="text-[#172033] font-medium">{op.totalMoved} files</strong> | Skipped: {op.totalSkipped}
                  </div>
                </div>

                <div>
                  {op.undoStatus === 'eligible' && op.status === 'completed' && (
                    <button
                      onClick={() => handleUndo(op.id)}
                      disabled={undoingId === op.id}
                      className="border border-[#5B5CE2] hover:bg-[#EEF2FF] text-[#5B5CE2] bg-white px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <RotateCcw size={14} />
                      <span>{undoingId === op.id ? 'Restoring files...' : 'Lossless Undo Move'}</span>
                    </button>
                  )}
                  {op.undoStatus === 'undone' && (
                    <span className="text-xs text-[#15803D] bg-[#DCFCE7] px-3 py-1 rounded-full font-semibold">
                      ✓ Undone Successfully
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
