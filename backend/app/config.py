import os
from pathlib import Path
from pydantic import BaseModel

# Load .env BEFORE AppConfig is built. Without this, os.getenv() never sees the
# values in backend/.env, so GEMINI_API_KEY was always empty and the app silently
# served canned demo content instead of analysing the uploaded notes.
try:
    from dotenv import load_dotenv
    _backend_dir = Path(__file__).resolve().parent.parent
    load_dotenv(_backend_dir / ".env")
    load_dotenv(_backend_dir.parent / ".env")
except ImportError:  # python-dotenv missing: fall back to a tiny manual parser
    for _f in (Path(__file__).resolve().parent.parent / ".env", Path(__file__).resolve().parent.parent.parent / ".env"):
        if _f.exists():
            for _line in _f.read_text(encoding="utf-8").splitlines():
                _line = _line.strip()
                if _line and not _line.startswith("#") and "=" in _line:
                    _k, _v = _line.split("=", 1)
                    os.environ.setdefault(_k.strip(), _v.strip().strip('"').strip("'"))

class AppConfig(BaseModel):
    APP_NAME: str = "Knowlix AI Backend"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # Gemini API & Gemma 4 Configuration
    # Verified Gemma 4 Model Identifier via Gemini API: "gemma-4-31b-it"
    # Alternative supported MoE variant: "gemma-4-26b-a4b-it"
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMMA_MODEL_NAME: str = os.getenv("GEMMA_MODEL_NAME", "gemma-4-31b-it")
    # Comma-separated open Gemma models tried in order if the primary one returns 5xx / 404
    GEMMA_FALLBACK_MODELS: str = os.getenv("GEMMA_FALLBACK_MODELS", "gemma-4-26b-a4b-it")
    GEMMA_MODEL_LICENSE: str = "Gemma Open License / Apache 2.0 (Open-weight model served via Google Gemini API)"
    GEMMA_API_BASE_URL: str = os.getenv("GEMMA_API_BASE_URL", "https://generativelanguage.googleapis.com/v1beta")
    
    # Legacy / Provider Compatibility Settings
    VISION_MODEL_PROVIDER: str = os.getenv("VISION_MODEL_PROVIDER", "gemini_gemma")
    VISION_MODEL_NAME: str = os.getenv("VISION_MODEL_NAME", "gemma-4-31b-it")
    VISION_MODEL_LICENSE: str = "Gemma Open License / Apache 2.0"
    
    # Local runtime endpoints (optional fallback)
    OLLAMA_HOST: str = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")
    LOCAL_VLLM_HOST: str = os.getenv("LOCAL_VLLM_HOST", "http://127.0.0.1:8000/v1")
    HUGGINGFACE_API_KEY: str = os.getenv("HUGGINGFACE_API_KEY", "")
    
    # Security & Authentication
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "knowlix-super-secure-production-hmac-secret-key-2026")
    JWT_ALGORITHM: str = "HS256"
    TOKEN_EXPIRE_HOURS: int = int(os.getenv("TOKEN_EXPIRE_HOURS", "72"))
    
    # Upload limits
    MAX_FILE_SIZE_MB: int = int(os.getenv("MAX_FILE_SIZE_MB", "15"))
    MAX_DOCUMENT_SIZE_MB: int = int(os.getenv("MAX_DOCUMENT_SIZE_MB", "25"))
    MAX_PDF_PAGES: int = int(os.getenv("MAX_PDF_PAGES", "30"))
    ALLOWED_IMAGE_TYPES: list[str] = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
    ALLOWED_DOCUMENT_TYPES: list[str] = ["application/pdf"]
    ALLOWED_ALL_TYPES: list[str] = ["image/jpeg", "image/png", "image/webp", "image/jpg", "application/pdf"]
    
    # Database
    DATABASE_PATH: str = os.getenv("DATABASE_PATH", "./data/knowlix.db")

config = AppConfig()
