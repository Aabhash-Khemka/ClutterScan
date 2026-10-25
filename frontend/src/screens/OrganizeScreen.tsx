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
    <div className="w-full bg-[#080808] text-[#f5f5f5] font-sans flex flex-col gap-6">
      {/* Title Header */}
      <div className="border-b border-[#303030] pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Smart Organize
            </h1>
            <span className="text-xs bg-white text-black font-semibold px-2 py-0.5 rounded-[2px] uppercase">
              Folder Tidying
            </span>
          </div>
          <p className="text-base text-[#b8b8b8] max-w-2xl">
            Automatically classify loose files into structured category subfolders by extension and academic or project keywords. Preview proposed moves before applying them, with 1-click lossless undo.
          </p>
        </div>
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="flex items-center gap-2 border border-[#303030] bg-[#141414] hover:border-white px-4 py-2.5 text-sm text-white font-semibold rounded-[2px] transition-colors cursor-pointer self-start md:self-auto"
        >
          <Settings2 className="w-4 h-4" />
          <span>{showConfig ? 'Hide Rules' : 'Category Rules'}</span>
        </button>
      </div>

      {/* Rules Config Panel */}
      {showConfig && (
        <div className="border border-[#303030] bg-[#141414] p-5 rounded-[2px] flex flex-col gap-3 text-sm">
          <div className="font-bold text-white text-base">Custom Classification Keywords (Comma Separated)</div>
          <div className="flex flex-col sm:flex-row gap-5">
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-xs text-[#858585] uppercase font-semibold">College &amp; Academic Keywords</label>
              <input
                type="text"
                value={collegeKeywords}
                onChange={(e) => setCollegeKeywords(e.target.value)}
                className="bg-[#080808] border border-[#303030] p-3 text-sm text-white rounded-[2px] focus:border-white outline-none font-mono"
              />
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-xs text-[#858585] uppercase font-semibold">Project &amp; Code Keywords</label>
              <input
                type="text"
                value={projectKeywords}
                onChange={(e) => setProjectKeywords(e.target.value)}
                className="bg-[#080808] border border-[#303030] p-3 text-sm text-white rounded-[2px] focus:border-white outline-none font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* Target Folder Input & Scan Action */}
      <div className="border border-[#303030] bg-[#141414] p-5 rounded-[2px] flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Folder className="w-5 h-5 absolute left-3.5 top-3.5 text-[#858585]" />
          <input
            type="text"
            value={folderPath}
            onChange={(e) => setFolderPath(e.target.value)}
            placeholder="Enter target directory path (e.g. C:\Users\Username\Downloads)..."
            className="w-full bg-[#080808] border border-[#303030] pl-11 pr-4 py-3 text-sm text-white placeholder:text-[#606060] rounded-[2px] focus:border-white outline-none font-mono"
          />
        </div>
        <button
          onClick={handleScan}
          disabled={loading || !folderPath.trim()}
          className="w-full sm:w-auto border border-white bg-white text-black hover:bg-neutral-200 disabled:opacity-50 px-7 py-3 text-sm font-semibold rounded-[2px] transition-colors cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <Play className="w-4 h-4 fill-black" />
          <span>{loading ? 'Analyzing Files...' : 'Generate Plan'}</span>
        </button>
      </div>

      {/* Plan Preview & Execution Section */}
      {plan && (
        <div className="flex flex-col gap-4">
          {/* Plan Summary Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="border border-[#303030] bg-[#141414] p-4 rounded-[2px] flex flex-col gap-1">
              <span className="text-xs text-[#858585] uppercase tracking-wider font-semibold">Total Loose Files</span>
              <span className="text-2xl md:text-3xl font-bold font-mono text-white">{moves.length}</span>
              <span className="text-xs text-[#b8b8b8]">Files found in directory</span>
            </div>
            <div className="border border-[#303030] bg-[#141414] p-4 rounded-[2px] flex flex-col gap-1">
              <span className="text-xs text-[#858585] uppercase tracking-wider font-semibold">Ready to Move</span>
              <span className="text-2xl md:text-3xl font-bold font-mono text-white">{readyCount}</span>
              <span className="text-xs text-[#b8b8b8]">Safe, no naming collisions</span>
            </div>
            <div className="border border-[#303030] bg-[#141414] p-4 rounded-[2px] flex flex-col gap-1">
              <span className="text-xs text-[#858585] uppercase tracking-wider font-semibold">Conflicts (Blocked)</span>
              <span className="text-2xl md:text-3xl font-bold font-mono text-[#e5ad55]">{conflictCount}</span>
              <span className="text-xs text-[#858585]">Existing destination file</span>
            </div>
            <div className="border border-[#303030] bg-[#141414] p-4 rounded-[2px] flex flex-col gap-1">
              <span className="text-xs text-[#858585] uppercase tracking-wider font-semibold">Excluded</span>
              <span className="text-2xl md:text-3xl font-bold font-mono text-[#858585]">{skippedCount}</span>
              <span className="text-xs text-[#858585]">Skipped by operator</span>
            </div>
          </div>

          {/* Action Execution Banner */}
          <div className="border border-[#303030] bg-[#141414] p-5 rounded-[2px] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="font-bold text-white text-base">
                Review &amp; Apply Proposed Moves
              </div>
              <div className="text-sm text-[#b8b8b8] mt-1">
                No files are moved until you click execute. You can override target folders below or skip individual files.
              </div>
            </div>
            <button
              onClick={handleExecute}
              disabled={executing || readyCount === 0}
              className="w-full sm:w-auto border border-white bg-white text-black hover:bg-neutral-200 disabled:opacity-50 px-7 py-3 text-sm font-semibold rounded-[2px] transition-colors cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <CheckCircle2 className="w-4 h-4 text-black" />
              <span>{executing ? 'Organizing Files...' : `Execute Move (${readyCount} Files)`}</span>
            </button>
          </div>

          {/* Execution Result Notice */}
          {executeResult && (
            <div className="border border-[#303030] bg-[#0b0b0b] p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-white font-bold text-xs uppercase">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Operation Complete: {executeResult.totalMoved} files moved successfully</span>
              </div>
              {executeResult.operationId && (
                <div className="text-[11px] text-[#858585] flex items-center gap-3">
                  <span>Operation ID: {executeResult.operationId}</span>
                  <button
                    onClick={() => handleUndo(executeResult.operationId)}
                    disabled={undoingId === executeResult.operationId}
                    className="border border-[#404040] hover:border-white px-2 py-0.5 text-white hover:bg-white hover:text-black uppercase text-[10px] cursor-pointer"
                  >
                    {undoingId === executeResult.operationId ? 'Undoing...' : 'Undo Move Now'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Filters & Moves Table */}
          <div className="border border-[#303030] bg-[#141414] rounded-[2px] flex flex-col">
            {/* Filter controls */}
            <div className="p-4 border-b border-[#303030] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
                <button
                  onClick={() => setSelectedCategory('ALL')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-[2px] border transition-colors cursor-pointer ${
                    selectedCategory === 'ALL'
                      ? 'border-white bg-white text-black'
                      : 'border-[#303030] text-[#b8b8b8] hover:text-white'
                  }`}
                >
                  All ({moves.length})
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-[2px] border transition-colors cursor-pointer whitespace-nowrap ${
                      selectedCategory === cat
                        ? 'border-white bg-white text-black'
                        : 'border-[#303030] text-[#b8b8b8] hover:text-white'
                    }`}
                  >
                    {cat} ({moves.filter((m) => m.category === cat).length})
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#858585]" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Filter by filename..."
                  className="w-full bg-[#080808] border border-[#303030] pl-9 pr-3 py-2 text-sm text-white placeholder:text-[#606060] rounded-[2px] focus:border-white outline-none font-mono"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="sticky top-0 bg-[#1b1b1b] border-b border-[#303030] text-xs text-[#858585] uppercase font-semibold">
                  <tr>
                    <th className="p-3.5">Filename &amp; Location</th>
                    <th className="p-3.5">Target Subfolder</th>
                    <th className="p-3.5">Classification Rule</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#303030]">
                  {filteredMoves.map((m) => (
                    <tr key={m.id} className="hover:bg-[#1b1b1b] transition-colors">
                      <td className="p-3.5">
                        <div className="font-semibold text-white font-mono text-sm truncate max-w-sm">{m.filename}</div>
                        <div className="text-xs text-[#858585] font-mono truncate max-w-sm mt-0.5">{m.sourcePath}</div>
                      </td>
                      <td className="p-3.5">
                        <select
                          value={m.category}
                          onChange={(e) => handleCategoryOverride(m.id, e.target.value)}
                          className="bg-[#080808] border border-[#303030] px-3 py-1.5 text-sm text-white rounded-[2px] focus:border-white outline-none cursor-pointer"
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
                      <td className="p-3.5 text-xs text-[#b8b8b8]">{m.ruleReason}</td>
                      <td className="p-3.5">
                        {m.status === 'ready' && (
                          <span className="text-xs font-semibold text-white border border-[#454545] px-2.5 py-1 rounded-[2px] bg-[#242424]">
                            Ready
                          </span>
                        )}
                        {m.status === 'conflict' && (
                          <span className="text-xs font-semibold text-[#e5ad55] border border-[#e5ad55]/40 px-2.5 py-1 rounded-[2px] bg-[#e5ad55]/10" title={m.conflictNote}>
                            Name Collision
                          </span>
                        )}
                        {m.status === 'skipped' && (
                          <span className="text-xs font-semibold text-[#858585] border border-[#303030] px-2.5 py-1 rounded-[2px] bg-[#080808]">
                            Excluded
                          </span>
                        )}
                        {m.status === 'moved' && (
                          <span className="text-xs font-semibold text-[#57B887] border border-[#57B887]/40 px-2.5 py-1 rounded-[2px] bg-[#57B887]/10">
                            Moved ✓
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => handleSkipToggle(m.id)}
                          className="border border-[#454545] hover:border-white px-3 py-1 text-xs text-white hover:bg-white hover:text-black rounded-[2px] font-semibold transition-colors cursor-pointer"
                        >
                          {m.status === 'skipped' ? 'Include' : 'Skip'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredMoves.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-[#858585] text-sm">
                        No files matching current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* History & Undo Section */}
      <div className="border border-[#303030] bg-[#141414] p-5 rounded-[2px] flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#303030] pb-3 text-sm">
          <span className="font-bold text-white text-base">
            Smart Organize Execution &amp; Lossless Undo Journal
          </span>
          <span className="text-[#858585] text-xs font-mono">
            {history.length} Operations Audited
          </span>
        </div>

        {history.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#858585]">
            No previous organize operations recorded yet.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {history.map((op) => (
              <div
                key={op.id}
                className="border border-[#303030] bg-[#080808] p-4 rounded-[2px] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="font-semibold text-white font-mono text-sm">{op.sourceFolder}</span>
                    <span className="text-xs text-[#858585] font-mono">&bull; {op.createdAt}</span>
                  </div>
                  <div className="text-xs text-[#858585]">
                    Status: <span className="text-white font-semibold">{op.status}</span> | Moved: <span className="text-white font-mono font-medium">{op.totalMoved}</span> | Skipped: <span className="text-white font-mono font-medium">{op.totalSkipped}</span>
                  </div>
                </div>

                <div>
                  {op.undoStatus === 'eligible' && op.status === 'completed' && (
                    <button
                      onClick={() => handleUndo(op.id)}
                      disabled={undoingId === op.id}
                      className="border border-white hover:bg-neutral-200 text-black bg-white px-4 py-2 text-xs font-semibold rounded-[2px] transition-colors cursor-pointer flex items-center gap-2"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{undoingId === op.id ? 'Restoring files...' : 'Lossless Undo Move'}</span>
                    </button>
                  )}
                  {op.undoStatus === 'undone' && (
                    <span className="text-xs text-[#57B887] border border-[#57B887]/40 px-3 py-1.5 bg-[#57B887]/10 rounded-[2px] font-semibold">
                      ✓ Undone Successfully
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
