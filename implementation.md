# ClutterScan Implementation

## Overview

ClutterScan is a local file-scanning and cleanup-review application. The React and
TypeScript frontend presents scan results and user controls; a FastAPI backend
scans the filesystem, applies detection and recommendation rules, and persists
results in SQLite. Files are not moved merely because they appear in a scan or
are selected for review. A cleanup move requires explicit confirmation.

## Architecture

```text
React + TypeScript + Vite
          │ HTTP / JSON
          ▼
FastAPI routes and scan pipeline
     ├── Local filesystem scanner
     ├── Duplicate and image analysis
     ├── File analysis and recommendations
     └── SQLite repositories and snapshots
          │
          └── Confirmed cleanup → OS Trash or local recovery vault
```

- **Frontend:** `frontend/src/App.tsx` coordinates screens and scan-result state.
  Screens under `frontend/src/screens/` cover scanning, storage, exact duplicates,
  similar images, file review, cleanup, and history. API requests are defined in
  `frontend/src/services/api.ts`, with shared response types in
  `frontend/src/types.ts`.
- **Backend:** `backend/app/main.py` initializes the FastAPI application and
  registers route modules from `backend/app/api/routes/`. Services under
  `backend/app/services/` implement scanning and analysis; repositories under
  `backend/app/database/repositories/` read and write persisted scan data.
- **Persistence:** SQLite schema is defined in
  `backend/app/database/schema.sql`. The default local database path is
  `backend/data/clutterscan.db`.

## Scan and analysis flow

1. The user selects a drive or folder and starts a scan.
2. The backend validates access and recursively scans directories, collecting
   file paths, sizes, timestamps, extensions, and visibility metadata. It records
   inaccessible paths as scan errors rather than stopping the whole traversal.
3. A tree-building pass calculates aggregate directory sizes.
4. Enabled analysis passes identify exact duplicates, visually similar images,
   older files, and temporary-file candidates.
5. The recommendation engine combines applicable evidence into review-priority
   scores and stores the results.
6. The UI lets the user inspect the scan, supporting evidence, and saved history.
   Cleanup remains a separate, explicitly confirmed action.

The scan API reports progress at analysis-stage boundaries, not as a precise
estimate of work completed. For example, 40% means filesystem traversal has
completed and duplicate analysis is underway; that stage can take longer for
large scans.

## Result evidence and scoring

### Exact duplicates

Files are first grouped by size. Files in groups with at least two members are
hashed with chunked SHA-256; equal digests establish byte-for-byte equality.
Size alone does not establish a duplicate.

For image duplicates, the displayed reference is selected by pixel dimensions.
For other files, a path/name heuristic applies penalties to paths containing
`Downloads`, `temp`, or `Desktop`, and names containing `(1)` or `copy`. The
reference is an algorithmic comparison aid—not a record of which copy the user
prefers to keep. Ties preserve scan order.

### Similar images

Supported images are analyzed with a 64-bit perceptual hash. The default
Hamming-distance threshold is 8; images within the threshold are grouped into
connected components. The displayed similarity is derived from the hash distance
and is not a confidence score, accuracy estimate, or guarantee that two images
are identical.

### Cleanup recommendations

`backend/app/services/recommendation/recommendation_engine.py` scores candidates
using recorded evidence:

| Evidence | Points |
|---|---:|
| Exact duplicate copy | 35 |
| Lower-resolution identical image copy | 20 additional |
| Temporary-file rule match | 20 |
| Modification time at least 180 days old | 15 |
| File at least 100 MB | 10 |
| File at least 10 MB but below 100 MB | 5 |
| Modified within the last 3 days | 15-point reduction |

The result is rounded and clamped to 0–100. Scores at or above 60 are selected
for review by default. They rank review priority; they are not confidence,
accuracy, or a probability that a file is safe to remove. Each persisted
recommendation includes its evidence breakdown and selection threshold. Older
records may have an empty breakdown if the factors cannot be reconstructed.

## User-facing result review

- The cleanup screen supports searching and filtering candidates by evidence,
  shows the score breakdown, and exports the actual candidates and evidence as
  JSON.
- The duplicate screen explains the exact-match evidence and the limitations of
  the selected reference copy.
- The similar-image screen presents hash-distance-derived comparisons and image
  details without claiming model confidence.
- The history screen displays saved scans, timestamps, whole-volume disk usage,
  folder-size comparisons, and cleanup recovery records. Historical scan results
  can be reopened from SQLite after the in-memory scan cache is gone.
- Empty states and unavailable or incomplete evidence are presented without
  inventing scan results or confidence values.

## Persistence and data safety

SQLite stores scan sessions, files, directories, duplicate groups, image groups,
recommendations, snapshots, and cleanup results. Database initialization applies
the schema and adds recommendation scoring columns to older databases when
needed.

The local SQLite database and recovery vault are runtime data, not source files.
The repository ignore rules exclude `backend/data/*.db`, SQLite database
sidecars, and `backend/data/recovery_vault/`; the database itself is not required
in a source checkout because the backend initializes it from the schema.

Before a cleanup move, the backend validates the requested candidates. Confirmed
files go to the operating-system Trash when available, otherwise to the local
recovery vault. Recovery records describe the destination; items in system Trash
must be restored through the operating system, while vault items can be restored
through ClutterScan history.

## Limitations

- A scan requires filesystem access. Permission failures are recorded and can
  leave the scan with incomplete coverage.
- Full-drive scans can take a long time, especially during duplicate hashing or
  perceptual comparison. Progress values represent pipeline stages rather than
  a time estimate.
- Similar-image matching is an approximate perceptual-hash comparison; it does
  not determine identity or user preference.
- Duplicate reference ranking and cleanup scores are deterministic heuristics.
  Users should inspect paths and evidence before confirming cleanup.
- Potentially recoverable bytes are estimates from candidate file sizes, not a
  promise of reclaimed disk capacity.
- Scan results and history are stored locally in SQLite and are available only
  where that database is present.

## Running locally

Start the backend from `backend/`:

```powershell
..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Start the frontend from `frontend/` in a separate terminal:

```powershell
npm run dev
```

The frontend is served at `http://127.0.0.1:3000`; its Vite development proxy
forwards `/api` requests to `http://127.0.0.1:8000`.

Run backend tests from `backend/`:

```powershell
..\.venv\Scripts\python.exe -m pytest tests/ -q
```

Run frontend type-checking and production build from `frontend/`:

```powershell
npm run lint
npm run build
```

## Validation performed

- Backend suite: 18 tests passed using an isolated SQLite database and recovery
  vault.
- Frontend TypeScript check (`npm run lint`) passed.
- Frontend production build (`npm run build`) passed.
- Local browser validation covered saved-scan history, reopening persisted scan
  results, cleanup evidence, and a narrow viewport.
