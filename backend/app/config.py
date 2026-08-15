import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # Default to local SQLite so the app runs with zero setup.
    # For production, set DATABASE_URL to a Postgres connection string, e.g.:
    # postgresql://user:password@host:5432/dbname
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./price_compare.db")

    JWT_SECRET: str = os.getenv("JWT_SECRET", "dev-secret-change-me-in-production")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

    CORS_ORIGINS: list[str] = os.getenv(
        "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")

    ENV: str = os.getenv("ENV", "development")


settings = Settings()
