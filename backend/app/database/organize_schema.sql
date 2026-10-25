-- Smart Organize tables (migration)
CREATE TABLE IF NOT EXISTS organize_operations (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    source_folder TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    total_planned INTEGER DEFAULT 0,
    total_moved INTEGER DEFAULT 0,
    total_skipped INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    undo_status TEXT DEFAULT 'eligible',
    notes TEXT
);
CREATE TABLE IF NOT EXISTS organize_files (
    id TEXT PRIMARY KEY,
    operation_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    source_path TEXT NOT NULL,
    dest_path TEXT NOT NULL,
    category TEXT NOT NULL,
    rule_reason TEXT NOT NULL,
    size_bytes INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'planned',
    error TEXT,
    dest_created INTEGER DEFAULT 0,
    FOREIGN KEY (operation_id) REFERENCES organize_operations(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_organize_files_op ON organize_files(operation_id);
