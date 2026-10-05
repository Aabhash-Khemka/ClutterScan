-- ClutterScan SQLite Schema Definition

CREATE TABLE IF NOT EXISTS scan_sessions (
    id TEXT PRIMARY KEY,
    root_path TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT,
    status TEXT NOT NULL,
    total_files INTEGER DEFAULT 0,
    total_directories INTEGER DEFAULT 0,
    total_size INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    scan_options TEXT
);

CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    scan_id TEXT NOT NULL,
    path TEXT NOT NULL,
    name TEXT NOT NULL,
    extension TEXT,
    size INTEGER NOT NULL,
    created_at TEXT,
    modified_at TEXT,
    accessed_at TEXT,
    is_directory INTEGER DEFAULT 0,
    is_hidden INTEGER DEFAULT 0,
    content_hash TEXT,
    p_hash TEXT,
    width INTEGER,
    height INTEGER,
    is_old INTEGER DEFAULT 0,
    is_temp INTEGER DEFAULT 0,
    error TEXT,
    FOREIGN KEY (scan_id) REFERENCES scan_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS directories (
    id TEXT PRIMARY KEY,
    scan_id TEXT NOT NULL,
    path TEXT NOT NULL,
    aggregate_size INTEGER NOT NULL,
    file_count INTEGER DEFAULT 0,
    dir_count INTEGER DEFAULT 0,
    FOREIGN KEY (scan_id) REFERENCES scan_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS duplicate_groups (
    id TEXT PRIMARY KEY,
    scan_id TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    short_hash TEXT NOT NULL,
    sector_name TEXT NOT NULL,
    match_count INTEGER NOT NULL,
    total_size INTEGER NOT NULL,
    hex_sample TEXT,
    FOREIGN KEY (scan_id) REFERENCES scan_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS duplicate_files (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    scan_id TEXT NOT NULL,
    file_id TEXT,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    size INTEGER NOT NULL,
    resolution TEXT,
    is_preferred INTEGER DEFAULT 0,
    status TEXT NOT NULL,
    status_desc TEXT,
    rationale TEXT,
    FOREIGN KEY (group_id) REFERENCES duplicate_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (scan_id) REFERENCES scan_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS similar_image_groups (
    id TEXT PRIMARY KEY,
    scan_id TEXT NOT NULL,
    label TEXT NOT NULL,
    match_count INTEGER NOT NULL,
    FOREIGN KEY (scan_id) REFERENCES scan_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS similar_image_files (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    scan_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    path TEXT NOT NULL,
    dimensions TEXT,
    p_hash TEXT,
    hamming_distance INTEGER DEFAULT 0,
    similarity TEXT,
    is_reference INTEGER DEFAULT 0,
    badge TEXT,
    sector_label TEXT,
    overlay_type TEXT,
    overlay_detail TEXT,
    FOREIGN KEY (group_id) REFERENCES similar_image_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (scan_id) REFERENCES scan_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS snapshots (
    id TEXT PRIMARY KEY,
    scan_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    root_path TEXT NOT NULL,
    total_storage INTEGER NOT NULL,
    used_storage INTEGER NOT NULL,
    free_storage INTEGER NOT NULL,
    total_inodes INTEGER NOT NULL,
    FOREIGN KEY (scan_id) REFERENCES scan_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS directory_snapshots (
    id TEXT PRIMARY KEY,
    snapshot_id TEXT NOT NULL,
    directory_path TEXT NOT NULL,
    aggregate_size INTEGER NOT NULL,
    FOREIGN KEY (snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recommendations (
    id TEXT PRIMARY KEY,
    scan_id TEXT NOT NULL,
    rank_label TEXT NOT NULL,
    target_path TEXT NOT NULL,
    score INTEGER NOT NULL,
    reasons TEXT NOT NULL,
    recoverable_bytes INTEGER NOT NULL,
    is_selected INTEGER DEFAULT 0,
    FOREIGN KEY (scan_id) REFERENCES scan_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cleanup_results (
    id TEXT PRIMARY KEY,
    dispatch_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    origin_path TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    action TEXT NOT NULL,
    status TEXT NOT NULL,
    location TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    is_restored INTEGER DEFAULT 0,
    recovery_path TEXT,
    error TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_files_scan_id ON files(scan_id);
CREATE INDEX IF NOT EXISTS idx_files_size ON files(size);
CREATE INDEX IF NOT EXISTS idx_files_hash ON files(content_hash);
CREATE INDEX IF NOT EXISTS idx_files_path ON files(path);
CREATE INDEX IF NOT EXISTS idx_directories_scan_id ON directories(scan_id);
CREATE INDEX IF NOT EXISTS idx_duplicate_groups_scan_id ON duplicate_groups(scan_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_scan_id ON snapshots(scan_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_timestamp ON snapshots(timestamp);
CREATE INDEX IF NOT EXISTS idx_dir_snapshots_snapshot_id ON directory_snapshots(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_scan_id ON recommendations(scan_id);
CREATE INDEX IF NOT EXISTS idx_cleanup_dispatch ON cleanup_results(dispatch_id);
