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
    <div className="w-full flex flex-col gap-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Title Header */}
      <div className="border border-[#303030] bg-[#0b0b0b] p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-white font-bold text-base tracking-wider uppercase">
            <FolderTree className="w-5 h-5 text-white" />
            <span>Smart Organize // File Categorization & Tidying</span>
          </div>
          <p className="text-xs text-[#858585] mt-1">
            Intelligently organize unorganized folders into structured subfolders by type and rules with safe pre-flight preview and 1-click undo.
          </p>
        </div>
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="flex items-center gap-2 border border-[#303030] bg-[#111111] hover:border-white px-3 py-1.5 text-xs text-white uppercase font-bold transition-none self-start md:self-auto cursor-pointer"
        >
          <Settings2 className="w-4 h-4" />
          <span>{showConfig ? 'Hide Rules' : 'Category Rules'}</span>
        </button>
      </div>

      {/* Rules Config Panel */}
      {showConfig && (
        <div className="border border-[#303030] bg-[#080808] p-4 flex flex-col gap-3 text-xs">
          <div className="font-bold text-white uppercase tracking-wider">Classification Keywords (Comma Separated)</div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-[11px] text-[#858585] uppercase">College / Academic Subject Keywords</label>
              <input
                type="text"
                value={collegeKeywords}
                onChange={(e) => setCollegeKeywords(e.target.value)}
                className="bg-[#000000] border border-[#303030] p-2 text-white focus:border-white outline-none"
              />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-[11px] text-[#858585] uppercase">Project / Code Keywords</label>
              <input
                type="text"
                value={projectKeywords}
                onChange={(e) => setProjectKeywords(e.target.value)}
                className="bg-[#000000] border border-[#303030] p-2 text-white focus:border-white outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Target Folder Input & Scan Action */}
      <div className="border border-[#303030] bg-[#0b0b0b] p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Folder className="w-4 h-4 absolute left-3 top-3 text-[#858585]" />
          <input
            type="text"
            value={folderPath}
            onChange={(e) => setFolderPath(e.target.value)}
            placeholder="Enter target directory path (e.g. C:\Users\Username\Downloads)..."
            className="w-full bg-[#000000] border border-[#303030] pl-10 pr-3 py-2 text-xs text-white placeholder:text-[#606060] focus:border-white outline-none"
          />
        </div>
        <button
          onClick={handleScan}
          disabled={loading || !folderPath.trim()}
          className="w-full sm:w-auto border border-white bg-white text-black hover:bg-neutral-200 disabled:opacity-50 px-6 py-2 text-xs uppercase font-bold transition-none cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <Play className="w-3.5 h-3.5 fill-black" />
          <span>{loading ? 'Analyzing...' : 'Generate Plan'}</span>
        </button>
      </div>

      {/* Plan Preview & Execution Section */}
      {plan && (
        <div className="flex flex-col gap-4">
          {/* Plan Summary Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="border border-[#303030] bg-[#0b0b0b] p-3 flex flex-col gap-1">
              <span className="text-[10px] text-[#858585] uppercase">Total Files</span>
              <span className="text-xl font-bold text-white">{moves.length}</span>
            </div>
            <div className="border border-[#303030] bg-[#0b0b0b] p-3 flex flex-col gap-1">
              <span className="text-[10px] text-[#858585] uppercase">Ready to Move</span>
              <span className="text-xl font-bold text-white">{readyCount}</span>
            </div>
            <div className="border border-[#303030] bg-[#0b0b0b] p-3 flex flex-col gap-1">
              <span className="text-[10px] text-[#858585] uppercase">Conflicts (Blocked)</span>
              <span className="text-xl font-bold text-amber-400">{conflictCount}</span>
            </div>
            <div className="border border-[#303030] bg-[#0b0b0b] p-3 flex flex-col gap-1">
              <span className="text-[10px] text-[#858585] uppercase">Skipped</span>
              <span className="text-xl font-bold text-[#858585]">{skippedCount}</span>
            </div>
          </div>

          {/* Action Execution Banner */}
          <div className="border border-white bg-[#111111] p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="font-bold text-white text-xs uppercase tracking-wider">
                Review & Confirm File Moves
              </div>
              <div className="text-[11px] text-[#b0b0b0] mt-0.5">
                No files are moved until you click execute. You can customize target folders below or skip individual items.
              </div>
            </div>
            <button
              onClick={handleExecute}
              disabled={executing || readyCount === 0}
              className="w-full sm:w-auto border border-white bg-white text-black hover:bg-neutral-200 disabled:opacity-50 px-6 py-2.5 text-xs uppercase font-bold transition-none cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <CheckCircle2 className="w-4 h-4 text-black" />
              <span>{executing ? 'Moving Files...' : `Execute Move (${readyCount} Files)`}</span>
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
          <div className="border border-[#303030] bg-[#0b0b0b] flex flex-col">
            {/* Filter controls */}
            <div className="p-3 border-b border-[#303030] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
                <button
                  onClick={() => setSelectedCategory('ALL')}
                  className={`px-2.5 py-1 text-xs uppercase font-bold border transition-none cursor-pointer ${
                    selectedCategory === 'ALL'
                      ? 'border-white bg-white text-black'
                      : 'border-[#303030] text-[#858585] hover:text-white'
                  }`}
                >
                  All ({moves.length})
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 text-xs uppercase font-bold border transition-none cursor-pointer whitespace-nowrap ${
                      selectedCategory === cat
                        ? 'border-white bg-white text-black'
                        : 'border-[#303030] text-[#858585] hover:text-white'
                    }`}
                  >
                    {cat} ({moves.filter((m) => m.category === cat).length})
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#858585]" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Filter files..."
                  className="w-full bg-[#000000] border border-[#303030] pl-8 pr-2.5 py-1 text-xs text-white placeholder:text-[#606060] focus:border-white outline-none"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-[#080808] border-b border-[#303030] text-[10px] text-[#858585] uppercase">
                  <tr>
                    <th className="p-3">File</th>
                    <th className="p-3">Proposed Folder</th>
                    <th className="p-3">Rule Reason</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f1f1f]">
                  {filteredMoves.map((m) => (
                    <tr key={m.id} className="hover:bg-[#111111] transition-none">
                      <td className="p-3">
                        <div className="font-bold text-white truncate max-w-xs">{m.filename}</div>
                        <div className="text-[10px] text-[#858585] truncate max-w-xs">{m.sourcePath}</div>
                      </td>
                      <td className="p-3">
                        <select
                          value={m.category}
                          onChange={(e) => handleCategoryOverride(m.id, e.target.value)}
                          className="bg-[#000000] border border-[#303030] px-2 py-1 text-xs text-white focus:border-white outline-none cursor-pointer"
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
                      <td className="p-3 text-[11px] text-[#858585]">{m.ruleReason}</td>
                      <td className="p-3">
                        {m.status === 'ready' && (
                          <span className="text-[10px] font-bold text-white border border-[#303030] px-2 py-0.5 bg-[#141414]">
                            READY
                          </span>
                        )}
                        {m.status === 'conflict' && (
                          <span className="text-[10px] font-bold text-amber-400 border border-amber-800/60 px-2 py-0.5 bg-amber-950/20" title={m.conflictNote}>
                            CONFLICT (NAME EXISTS)
                          </span>
                        )}
                        {m.status === 'skipped' && (
                          <span className="text-[10px] font-bold text-[#858585] border border-[#303030] px-2 py-0.5 bg-[#000000]">
                            SKIPPED
                          </span>
                        )}
                        {m.status === 'moved' && (
                          <span className="text-[10px] font-bold text-emerald-400 border border-emerald-800/60 px-2 py-0.5 bg-emerald-950/20">
                            MOVED ✓
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleSkipToggle(m.id)}
                          className="border border-[#303030] hover:border-white px-2 py-1 text-[10px] text-white hover:bg-white hover:text-black uppercase font-bold transition-none cursor-pointer"
                        >
                          {m.status === 'skipped' ? 'Include' : 'Skip'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredMoves.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-[#858585]">
                        No files matching filters
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
      <div className="border border-[#303030] bg-[#0b0b0b] p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#303030] pb-2 text-xs">
          <span className="font-bold text-white uppercase tracking-wider">
            Smart Organize History & Lossless Undo
          </span>
          <span className="text-[#858585] text-[11px]">
            {history.length} OPERATIONS RECORDED
          </span>
        </div>

        {history.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#858585] uppercase">
            No organize operations recorded yet
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {history.map((op) => (
              <div
                key={op.id}
                className="border border-[#303030] bg-[#000000] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs uppercase">{op.sourceFolder}</span>
                    <span className="text-[10px] text-[#858585]">// {op.createdAt}</span>
                  </div>
                  <div className="text-[11px] text-[#858585]">
                    Status: <span className="text-white font-bold uppercase">{op.status}</span> | Moved: {op.totalMoved} | Skipped: {op.totalSkipped}
                  </div>
                </div>

                <div>
                  {op.undoStatus === 'eligible' && op.status === 'completed' && (
                    <button
                      onClick={() => handleUndo(op.id)}
                      disabled={undoingId === op.id}
                      className="border border-white hover:bg-white hover:text-black text-white px-3 py-1 text-xs uppercase font-bold transition-none cursor-pointer flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{undoingId === op.id ? 'Restoring...' : 'Undo Move'}</span>
                    </button>
                  )}
                  {op.undoStatus === 'undone' && (
                    <span className="text-[11px] text-[#858585] border border-[#303030] px-3 py-1 bg-[#141414] uppercase">
                      Undone ✓
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
