from typing import List, Optional
import os
from dotenv import load_dotenv

# Load environment variables from ai-service/.env or root .env
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", ".env.local"))
load_dotenv()

class Settings:
    AI_SERVICE_SECRET: str = os.getenv("AI_SERVICE_SECRET", "change-me")
    AI_API_KEY: str = os.getenv("AI_API_KEY", "")
    AI_MODEL: str = os.getenv("AI_MODEL", "gemini-1.5-flash")
    AI_TIMEOUT_MS: int = int(os.getenv("AI_TIMEOUT_MS", "6000"))
    AI_MAX_RETRIES: int = int(os.getenv("AI_MAX_RETRIES", "1"))
    CORS_ORIGINS: List[str] = [
        origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if origin.strip()
    ]
    DEFAULT_TIEBREAK_SEED: str = os.getenv("DEFAULT_TIEBREAK_SEED", "utilix")

settings = Settings()
