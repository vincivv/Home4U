import logging

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.settings import APP_ENV, DATABASE_URL

logger = logging.getLogger(__name__)

logger.info(
    "Database backend configured as %s (env=%s)",
    DATABASE_URL.split(":", 1)[0],
    APP_ENV,
)

# Create engine
engine = create_engine(DATABASE_URL)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables (creates them if they don't exist)."""
    from app.models.database import Base

    logger.info("Running init_db — ensuring all tables exist …")
    Base.metadata.create_all(bind=engine)
    logger.info("init_db complete.")
