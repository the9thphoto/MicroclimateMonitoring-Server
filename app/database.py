from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import DATABASE_URL


def _ensure_sqlite_directory(url: str) -> None:
    prefix = "sqlite:///"
    if not url.startswith(prefix):
        return
    database_path = url.removeprefix(prefix)
    if database_path == ":memory:":
        return
    Path(database_path).parent.mkdir(parents=True, exist_ok=True)


_ensure_sqlite_directory(DATABASE_URL)

engine_kwargs: dict = {"pool_pre_ping": True}
if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    with SessionLocal() as session:
        yield session
