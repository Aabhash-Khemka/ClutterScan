# ClutterScan

ClutterScan is an intelligent clutter detection, classification, and resolution platform.

## Project Structure

```
ClutterScan/
│
├── frontend/             # Frontend forensic client (React 19 / TypeScript / Vite / Tailwind v4)
│   ├── src/
│   │   ├── components/   # Reusable UI elements (Header, DiffModal, CleanupModal)
│   │   ├── screens/      # Forensic views (Home, Storage, Duplicates, Images, Files, Cleanup, History)
│   │   ├── mockData.ts   # Forensic simulation dataset & records
│   │   ├── types.ts      # TypeScript interfaces and data models
│   │   ├── index.css     # Terminal forensic theme & Tailwind v4
│   │   ├── App.tsx       # Root React component & hash router
│   │   └── main.tsx      # Application entry point
│   ├── index.html        # Main HTML & Space Mono typography
│   ├── metadata.json     # Capability definitions
│   ├── tsconfig.json     # TypeScript compiler configuration
│   ├── vite.config.ts    # Vite build & alias configuration
│   ├── package.json      # Frontend dependencies & npm scripts
│   └── README.md         # Frontend guide and docs
│
├── backend/              # Python FastAPI Backend & Algorithm Engine
│   ├── app/
│   │   ├── main.py       # FastAPI application entry point
│   │   ├── api/routes/   # REST API routes (scan, duplicates, similar, files, cleanup, history)
│   │   ├── services/     # Scanning, Detection, Resolution, Analysis, Recommendation, Cleanup
│   │   ├── models/       # Domain data models
│   │   ├── database/     # SQLite schema and repositories
│   │   ├── schemas/      # Pydantic validation schemas
│   │   └── utils/        # Hashing, file utilities, image processing
│   ├── tests/            # Pytest unit & integration test suite (13 test modules)
│   ├── requirements.txt  # Python dependencies (FastAPI, Pillow, ImageHash, Send2Trash, etc.)
│   └── README.md         # Backend documentation
│
├── docs/                 # Documentation and specifications (SRS, UML diagrams, Algorithm Phase II)
│
├── .gitignore            # Git ignore definitions
├── README.md             # Project overview
└── LICENSE               # License information
```

## Getting Started

### 1. Backend (Python / FastAPI)
```bash
cd backend
pip install -r requirements.txt
python -m pytest tests/ -v
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation will be available at `http://127.0.0.1:8000/docs`.

### 2. Frontend (React / TypeScript / Vite)
```bash
cd frontend
npm install
npm run dev
```
Starts the forensic frontend at `http://localhost:5173`.
