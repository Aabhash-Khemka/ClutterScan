# ClutterScan Backend & Algorithm Engine

**An Intelligent Local Disk Analysis and Cleanup System**

FastAPI backend, algorithms, SQLite persistence, and REST APIs powering ClutterScan.

---

## 1. System Architecture

```text
USER (React/Tailwind Frontend)
 │
 │ REST API (FastAPI)
 ▼
FASTAPI BACKEND
 │
 ├── 1. Scanner (Recursive Traversal, Permission Validation)
 ├── 2. TreeBuilder (Algorithm 2 Post-Order Aggregate Sizing)
 ├── 3. DuplicateDetector (Algorithm 3 Size Filter + Chunked SHA-256)
 ├── 4. ResolutionDetector (Algorithm 4 Pixel Count Preference)
 ├── 5. SimilarImageDetector (Algorithm 5 64-bit DCT pHash + Hamming)
 ├── 6. FileAnalyzer (Algorithm 6 Old & Temporary File Detection)
 ├── 7. AnalyticsEngine (Category Breakdown, Top Largest Files)
 ├── 8. SnapshotManager (Algorithm 8 SQLite Storage Growth Deltas)
 ├── 9. RecommendationEngine (Algorithm 9 Weighted Multi-Signal Scoring)
 └── 10. CleanupManager (Algorithm 10 Safety Validation, Reversible Vault/Trash)
 │
 ├────────────────────────┬─────────────────────────┐
 ▼                        ▼                         ▼
Local Filesystem       SQLite Database       Recovery Vault / Trash
```

---

## 2. Algorithms Implemented

| Algorithm | Method / DSA | Module | Specification |
|:---|:---|:---|:---|
| **1. Recursive Scanning** | N-ary Tree, DFS, Error Resilience | `app.services.scanner.scanner` | Traverses directories, gathers metadata (`size`, `timestamps`, `extension`), catches permission errors without crashing. |
| **2. Size Aggregation** | Post-Order DFS Recursion | `app.services.scanner.tree_builder` | $S(\text{directory}) = \sum S(\text{child})$. Populates folder sizes for treemap. |
| **3. Exact Duplicates** | Size Map + 64KB Chunked SHA-256 | `app.services.detection.duplicate_detector` | Discards unique-size files first. Hashes candidate files in 64KB chunks ($O(C)$ memory). |
| **4. Resolution Preference** | Pillow Dimension Extraction | `app.services.detection.resolution_detector` | For duplicate image groups: $\text{pixels} = W \times H$. Highest pixel count is preferred; lower resolution is marked cleanup candidate. |
| **5. Similar Images** | 64-bit DCT pHash + Hamming Distance | `app.services.detection.similar_image_detector` | Perceptual hashing via ImageHash. Connected components grouped within threshold ($d \le 8$). Advisory only. |
| **6. Old & Temp Files** | Metadata Inode Heuristics | `app.services.analysis.file_analyzer` | Identifies files exceeding staleness threshold (e.g. 180 days) and runtime temp artifacts (`.tmp`, `.cache`, `Temp/`). |
| **7. SQLite Persistence** | SQLite3 Schema & Repositories | `app.database.database` | Persistent storage with indexed foreign keys for scans, files, groups, snapshots, and recovery events. |
| **8. Snapshots & Deltas** | Snapshot Comparison | `app.services.snapshot.snapshot_manager` | Stores storage stats after scan; computes directory-level growth/reduction ($\Delta S = \text{Current} - \text{Previous}$). |
| **9. Recommendation Engine** | Weighted Multi-Signal Scoring | `app.services.recommendation.recommendation_engine` | Evaluates duplicate, resolution, age, temp, and storage impact evidence. Clamped score $[0, 100]$. |
| **10. Safe Cleanup & Restore**| Pre-flight Check + Reversible Vault | `app.services.cleanup.cleanup_manager` | Requires explicit user confirmation; moves files to OS Recycle Bin or local recovery vault. Lossless restoration back to origin. |

---

## 3. REST API Reference

| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/health` | Health check endpoint |
| `GET` | `/api/system/volumes` | Enumerate local disk drives and capacities |
| `POST` | `/api/scan` | Initiate recursive scan and analysis pipeline |
| `GET` | `/api/scan/{scan_id}` | Query real-time status and progress percentage |
| `GET` | `/api/scan/{scan_id}/tree` | Get hierarchical N-ary tree for Storage screen |
| `GET` | `/api/duplicates/{scan_id}` | Get cryptographic SHA-256 duplicate groups |
| `GET` | `/api/duplicates/{scan_id}/{group_id}` | Get specific duplicate group details |
| `GET` | `/api/similar-images/{scan_id}` | Get perceptual image similarity clusters |
| `GET` | `/api/files/{scan_id}` | Get unified old and temporary file candidates |
| `GET` | `/api/files/{scan_id}/old` | Get stale files exceeding age threshold |
| `GET` | `/api/files/{scan_id}/temporary` | Get temporary scratch artifacts |
| `GET` | `/api/files/preview` | Preview local image file safely |
| `GET` | `/api/recommendations/{scan_id}` | Get ranked cleanup recommendations |
| `POST` | `/api/cleanup/preview` | Validate candidates prior to cleanup |
| `POST` | `/api/cleanup/confirm` | Execute safe migration to OS Recycle Bin / Vault |
| `GET` | `/api/history` | Get historical scan log and snapshot deltas |
| `GET` | `/api/recovery` | Get audit trail of quarantined files |
| `POST` | `/api/recovery/{id}/restore` | Reversibly restore quarantined file |

---

## 4. Running Tests

Run the full pytest suite:

```bash
cd backend
python -m pytest tests/ -v
```

All 13 test cases verify:
- Recursive directory scanning & error recovery
- Post-order directory size aggregation
- Size pre-filtering & chunked SHA-256 duplicate hashing
- Resolution-aware duplicate image selection (1920x1080 vs 1280x720)
- Perceptual image hashing & Hamming distance clustering
- Old and temporary file detection
- SQLite database persistence & snapshot deltas
- Weighted recommendation scoring & ranking
- Pre-flight safety validation & lossless restoration
- Full end-to-end REST API lifecycle

---

## 5. Starting the Backend Server

```bash
cd backend
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Interactive API documentation available at `http://127.0.0.1:8000/docs`.
