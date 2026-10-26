import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import config
from app.database import init_db
from app.routes.api import router as api_router
from app.routes.auth_routes import router as auth_router
from app.routes.explore_notes import router as explore_router
from app.routes.admin_notes import router as admin_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("knowlix.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Knowlix AI SQLite storage...")
    init_db()
    logger.info(f"Knowlix AI backend running with model provider: {config.VISION_MODEL_PROVIDER}")
    yield
    logger.info("Knowlix AI backend shutting down.")

app = FastAPI(
    title=config.APP_NAME,
    version=config.APP_VERSION,
    description="Open-source AI-powered personalized learning platform backend transforming photos of notes into interactive revision packs.",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits localhost Vite frontend & preview ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router)
app.include_router(auth_router)
app.include_router(explore_router)
app.include_router(admin_router)

@app.get("/")
async def root():
    return {
        "name": "Knowlix AI API",
        "tagline": "Learn Smarter. Remember Longer.",
        "version": config.APP_VERSION,
        "docs_url": "/docs",
        "health_url": "/api/health"
    }

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": f"An internal processing error occurred: {str(exc)}"}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
