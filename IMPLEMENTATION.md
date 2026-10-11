# ClutterScan Implementation

## Overview

ClutterScan is a local disk analysis and cleanup application. Its React frontend
communicates with a FastAPI backend, which scans a selected directory, analyzes
its files, stores scan results in SQLite, and exposes findings for review.

The application is designed around a review-before-cleanup workflow: analysis
identifies candidates, while cleanup requires an explicit confirmation request.

## Components

### Frontend

The frontend is a React 19 and TypeScript single-page application built with
Vite and Tailwind CSS. `frontend/src/App.tsx` provides the main navigation, and
the screens in `frontend/src/screens/` present scan setup, storage, duplicate
and similar-image findings, file candidates, cleanup, and history.

API calls are centralized in `frontend/src/services/api.ts`. During local
development, Vite proxies `/api` requests to the backend at
`http://127.0.0.1:8000`.

### Backend

The FastAPI application is initialized in `backend/app/main.py`. It registers
the API routers under the configured API prefix, initializes the SQLite
database, configures CORS, and provides a health endpoint.

The backend separates HTTP routes from analysis and persistence logic:

- `app/api/routes/` validates and serves scan, system, findings, cleanup, and
  history requests.
- `app/services/` implements filesystem scanning, duplicate and image
  similarity detection, file analysis, recommendations, snapshots, and
  reversible cleanup.
- `app/database/` contains the SQLite schema, connection helpers, and
  repositories.
- `app/models/` and `app/schemas/` define domain objects and API payloads.

## Scan and analysis flow

1. The frontend requests available volumes and suggested user folders, then
   submits a target path and analysis options.
2. The scan route trims and checks the target path before creating a scan ID.
   It starts the pipeline on a background thread and returns the ID so the UI
   can poll for progress.
3. The pipeline traverses the directory tree, collects files and directories,
   and aggregates directory sizes.
4. Enabled analysis steps identify exact duplicates and similar images. The
   backend also identifies old and temporary files and calculates ranked
   cleanup recommendations.
5. Scan metadata, files, findings, recommendations, and storage snapshots are
   persisted in SQLite. The API provides routes to retrieve the status, tree,
   findings, and history.

## Cleanup and recovery

Cleanup candidates are previewed before execution. The confirmation endpoint
revalidates each target: it must still exist, be a regular file, and, when
provided, match the analyzed file size. The backend attempts to move approved
files to the operating system's Recycle Bin/Trash; if that is unavailable or
fails, it uses the local recovery vault. Results are recorded in SQLite.

Files moved to the recovery vault can be restored through the recovery API.
Files moved to the operating system's Recycle Bin must be restored using the
operating system's recycle-bin tools.

## Main API routes

The API is mounted under `/api` by default.

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Report service health and version |
| `GET` | `/api/system/volumes` | List accessible storage volumes |
| `GET` | `/api/system/folders` | List existing suggested scan folders |
| `POST` | `/api/scan` | Start analysis for a target path |
| `GET` | `/api/scan/{scan_id}` | Read scan status and progress |
| `GET` | `/api/scan/{scan_id}/tree` | Read the analyzed directory tree |
| `GET` | `/api/duplicates/{scan_id}` | Read exact duplicate groups |
| `GET` | `/api/similar-images/{scan_id}` | Read similar-image clusters |
| `GET` | `/api/files/{scan_id}` | Read file-analysis results |
| `GET` | `/api/recommendations/{scan_id}` | Read ranked recommendations |
| `POST` | `/api/cleanup/preview` | Validate cleanup candidates |
| `POST` | `/api/cleanup/confirm` | Execute user-confirmed cleanup |
| `GET` | `/api/history` | Read scan and snapshot history |
| `GET` | `/api/recovery` | Read cleanup and recovery records |
| `POST` | `/api/recovery/{id}/restore` | Restore a vault-managed file |

Interactive API documentation is available at `/docs` while the backend is
running.

## Development

From the repository root, install backend dependencies and start the API:

```powershell
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

In a second terminal, start the frontend:

```powershell
cd frontend
npm install
npm run dev
```

The frontend is served at `http://localhost:3000`. The backend API is served
at `http://127.0.0.1:8000`.

Run backend tests from `backend/`:

```powershell
python -m pytest tests/ -v
```

Run frontend type checking and a production build from `frontend/`:

```powershell
npm run lint
npm run build
```

The checked-in SQLite database is application data and may change while the
backend runs. Avoid committing local scan or cleanup records unintentionally.
