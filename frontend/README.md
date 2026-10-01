# ClutterScan Frontend

> High-fidelity local disk forensic analysis, SHA-256 duplicate detection, perceptual hash image clustering, and safe reversible cleanup interface.

Built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS v4**, and **Lucide React**. Designed with a brutalist cybersecurity / forensic terminal aesthetic (`Space Mono`, scanline grid, zero border-radius).

---

## Features & Screens

1. **Forensic Overview (`HomeScreen`)**
   - High-level system telemetry: total volume capacity, analyzed sectors, clutter identified, and recoverable disk space.
   - Breakdown of identified waste categories: duplicate files, stale build caches, ghost installers, and temp logs.
   - System integrity score and forensic scan status indicators.
   - Fast action shortcuts for scanning, triage, and batch cleanup.

2. **Storage Allocation (`StorageScreen`)**
   - Interactive directory tree explorer with byte-level sizing and usage bars.
   - Quick filters by size threshold (> 1 GB, 100 MB–1 GB, < 100 MB) and system directories.
   - High-impact directory inspection to detect space hogs.

3. **SHA-256 Duplicate Detection (`DuplicatesScreen`)**
   - Cryptographic binary hash clustering identifying identical files across disparate paths.
   - Hex header sample preview and sector safety rules.
   - Side-by-side diff comparison modal (`DiffModal`) with file metadata, timestamp analysis, and byte comparisons.
   - Smart keeper selection (preserve oldest, preserve newest, or manual override).

4. **Perceptual Image Clustering (`ImagesScreen`)**
   - Perceptual hash (pHash) visual similarity detection for photos, screenshots, and graphics.
   - Hamming distance calculation and similarity percentages.
   - Multi-image cluster viewer with overlay badges (e.g., high-res original vs compressed variant).

5. **Deep File Explorer (`FilesScreen`)**
   - Fast forensic file search across discovered metadata records.
   - Inode age tracking, MIME-type classification, and size breakdown.
   - Multi-file staging directly to the cleanup quarantine queue.

6. **Staged Quarantine & Dry-Run Cleanup (`CleanupScreen`)**
   - Safety-first workflow: candidates are staged and scored by impact prior to deletion.
   - Simulation dry-run calculating projected space reclamation and potential system risk.
   - Batch purge confirmation modal (`CleanupModal`) with reversible restore points.

7. **Audit Log & Reversible Recovery (`HistoryScreen`)**
   - Complete historical trace of all quarantine dispatches, timestamps, and origin paths.
   - One-click file restoration allowing instantaneous rollback of any staged cleanup.
   - Historical scan snapshots and volume growth delta tracking.

---

## Tech Stack

- **Framework**: React 19 + Vite 8
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + Custom Cyberpunk / Terminal CSS
- **Icons**: Lucide React
- **Animations**: Motion
- **AI Integration**: Google Gemini API (`@google/genai`)

---

## Project Structure

```
frontend/
├── public/               # Static public assets
├── src/
│   ├── components/       # Core UI components
│   │   ├── Header.tsx        # Forensic status bar, tab navigation, volume meter
│   │   ├── DiffModal.tsx     # Side-by-side duplicate file comparison modal
│   │   └── CleanupModal.tsx  # Quarantine purge confirmation & dry-run modal
│   ├── screens/          # Application views
│   │   ├── HomeScreen.tsx        # System dashboard & forensic telemetry
│   │   ├── StorageScreen.tsx     # Directory tree & storage breakdown
│   │   ├── DuplicatesScreen.tsx  # SHA-256 duplicate clusters & diffs
│   │   ├── ImagesScreen.tsx      # Perceptual hash image clustering
│   │   ├── FilesScreen.tsx       # Metadata file explorer & staging
│   │   ├── CleanupScreen.tsx     # Quarantine staging & dry-run execution
│   │   └── HistoryScreen.tsx     # Audit trail & reversible recovery
│   ├── mockData.ts       # Mock forensic data, SHA-256 hashes & pHash images
│   ├── types.ts          # TypeScript interfaces and data models
│   ├── index.css         # Tailwind v4 imports and terminal theme rules
│   ├── App.tsx           # Hash router, toast notifications & state manager
│   └── main.tsx          # Application entry point
├── index.html            # Space Mono font and base layout
├── metadata.json         # Capability configuration
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript compiler configuration
└── vite.config.ts        # Vite + Tailwind v4 build config
```

---

## Getting Started

### Prerequisites

- **Node.js** (v18 or higher recommended; v22 supported)
- **npm** (v9 or higher)

### Installation

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. *(Optional)* Configure environment variables:
   Copy `.env.example` to `.env.local` if utilizing Gemini AI features:
   ```bash
   copy .env.example .env.local
   ```
   Add your Gemini API key:
   ```env
   GEMINI_API_KEY="your-gemini-api-key"
   ```

### Development Server

Start the local Vite development server:

```bash
npm run dev
```

The frontend will run on:
**`http://localhost:3000`**

### Available Scripts

- `npm run dev`: Starts the local development server at `http://localhost:3000` with host listening on `0.0.0.0`.
- `npm run build`: Compiles TypeScript and builds production-ready assets into `dist/`.
- `npm run preview`: Previews the production build locally.
- `npm run lint`: Runs `tsc --noEmit` to validate TypeScript types.
- `npm run clean`: Cleans build artifacts (`dist/`).
