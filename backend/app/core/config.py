from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "researchmind-api"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_VERSION: str = "v1"
    HOST: str = "0.0.0.0"
    PORT: int = 8001
    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/researchmind"
    LOG_LEVEL: str = "INFO"
    CORS_ORIGINS: List[str] = ["http://localhost", "http://127.0.0.1"]
    LLM_PROVIDER: str = "none"
    LLM_MODEL: str = ""
    # Search and AI Provider Settings
    EMBEDDING_PROVIDER: str = "bge"
    EMBEDDING_MODEL: str = "BAAI/bge-small-en-v1.5"
    EMBEDDING_DIMENSION: int = 384
    RERANKER_MODEL: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    VECTOR_DB_PROVIDER: str = "qdrant"
    VECTOR_DB_URL: str = ""  # If empty, uses local embedded storage
    QDRANT_STORAGE_PATH: str = "./data/qdrant_storage"
    QDRANT_COLLECTION_NAME: str = "research_papers"
    ENABLE_LIVE_ARXIV: bool = True
    NEO4J_URL: str = ""
    NEO4J_USERNAME: str = ""
    NEO4J_PASSWORD: str = ""
    FILE_UPLOAD_MAX_SIZE: str = "20MB"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
