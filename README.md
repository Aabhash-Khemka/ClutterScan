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
├── backend/              # Backend API and server (Express / Node.js)
│   ├── controllers/      # Request handlers
│   ├── models/           # Data schemas and models
│   ├── routes/           # API routes definition
│   ├── services/         # Core business logic
│   ├── middleware/       # Custom Express middleware
│   ├── utils/            # Backend helper utilities
│   ├── config/           # Database and environment configurations
│   ├── server.js         # Entry point for backend server
│   └── package.json      # Backend package configuration
│
├── algorithm/            # AI / ML pipeline for clutter analysis
│   ├── preprocessing/    # Image and sensor data preprocessing
│   ├── detection/        # Object and clutter detection algorithms
│   ├── classification/   # Clutter categorization and tagging
│   ├── resolution/       # Recommendation and resolution logic
│   └── README.md         # Algorithm documentation
│
├── docs/                 # Documentation and design specifications
│   ├── architecture/     # System architecture and diagrams
│   ├── use-cases/        # Functional specifications and use cases
│   └── reports/          # Analysis and performance reports
│
├── .gitignore            # Git ignore definitions
├── README.md             # Project overview
└── LICENSE               # License information
```

## Getting Started

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Starts the forensic frontend at `http://localhost:3000`.

### Backend
```bash
cd backend
npm install
npm start
```
