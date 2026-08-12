"""PostgreSQL + TimescaleDB connection manager."""
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.common.config import settings

# Async engine for PostgreSQL
async_engine = create_async_engine(
    settings.POSTGRESQL_URL.replace("postgresql://", "postgresql+asyncpg://"),
    echo=False,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

# Session factory
AsyncSessionLocal = sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Sync engine for migrations (if needed)
sync_engine = create_engine(
    settings.POSTGRESQL_URL,
    echo=False,
    pool_pre_ping=True,
)


async def get_postgres_session() -> AsyncSession:
    """Get async PostgreSQL session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
