"""
data_adapter.py

Single point of contact between the AI service and its data sources.
- get_parcel() reads REAL data from the live Postgres/Neon database.
- get_document() reads MOCK local files, since real document uploads
  don't exist yet (Phase 7 in progress).

When Phase 7 lands, only get_document() needs to change.
"""

import os
import json
from pathlib import Path
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Path to your local mock documents folder
MOCK_DOCS_DIR = Path(__file__).parent.parent / "data" / "sample_docs"
MOCK_DOCS_INDEX = Path(__file__).parent.parent / "data" / "mock_parcels.json"


def get_db_connection():
    """Open a new connection to the real Postgres database."""
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not set. Check ai-service/.env")
    return psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)


def get_parcel(parcel_id: str) -> dict | None:
    """
    Fetch a real parcel record from the live database by its ID.
    Returns None if no matching parcel is found.
    """
    query = "SELECT * FROM parcels WHERE id = %s;"
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(query, (parcel_id,))
            row = cur.fetchone()
            return dict(row) if row else None
    finally:
        conn.close()


def get_parcel_by_survey_number(survey_number: str) -> dict | None:
    """
    Fetch a real parcel record by survey number instead of UUID —
    often easier to work with when testing manually.
    """
    query = "SELECT * FROM parcels WHERE survey_number = %s;"
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(query, (survey_number,))
            row = cur.fetchone()
            return dict(row) if row else None
    finally:
        conn.close()


def get_document(document_filename: str) -> Path:
    """
    MOCKED: returns the file path to a local sample document.
    Replace this with a real file-storage lookup once Phase 7
    document uploads exist (e.g. reading from backend/uploads/).
    """
    doc_path = MOCK_DOCS_DIR / document_filename
    if not doc_path.exists():
        raise FileNotFoundError(f"Mock document not found: {doc_path}")
    return doc_path


def list_mock_documents() -> list[str]:
    """Helper: list all mock documents currently available for testing."""
    if not MOCK_DOCS_DIR.exists():
        return []
    return [f.name for f in MOCK_DOCS_DIR.iterdir() if f.is_file()]