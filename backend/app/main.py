from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.exceptions import ClutterScanException
from app.database.database import init_db
from app.api.routes import (
    scan_routes,
    duplicate_routes,
    similar_routes,
    file_routes,
    recommendation_routes,
    cleanup_routes,
    history_routes,
    system_routes,
)

# Ensure database is initialized
init_db()

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield
    # Shutdown logic if any

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Intelligent Local Disk Analysis and Cleanup System API",
    lifespan=lifespan,
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
@app.exception_handler(ClutterScanException)
async def clutters_can_exception_handler(request: Request, exc: ClutterScanException):
    return JSONResponse(
        status_code=400,
        content={"error": exc.__class__.__name__, "detail": str(exc)},
    )

# Include routers under /api prefix
app.include_router(scan_routes.router, prefix=settings.API_PREFIX)
app.include_router(duplicate_routes.router, prefix=settings.API_PREFIX)
app.include_router(similar_routes.router, prefix=settings.API_PREFIX)
app.include_router(file_routes.router, prefix=settings.API_PREFIX)
app.include_router(recommendation_routes.router, prefix=settings.API_PREFIX)
app.include_router(cleanup_routes.router, prefix=settings.API_PREFIX)
app.include_router(history_routes.router, prefix=settings.API_PREFIX)
app.include_router(system_routes.router, prefix=settings.API_PREFIX)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.VERSION,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
