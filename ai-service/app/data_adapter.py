"""Database access helpers for the AI service.

These functions connect to PostgreSQL using the DATABASE_URL from the
project .env file and expose the data needed by the AI risk logic.
"""

import os

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()


def get_db_connection():
    """Return a PostgreSQL connection using the app's configured DATABASE_URL."""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set. Check ai-service/.env")
    return psycopg2.connect(database_url)


def get_parcel(parcel_id: str):
    """Fetch a parcel by its database ID."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT *
                FROM parcels
                WHERE id = %s
                LIMIT 1;
                """,
                (parcel_id,),
            )
            row = cur.fetchone()
            if row is None:
                return None
            columns = [desc[0] for desc in cur.description]
            return dict(zip(columns, row))
    finally:
        conn.close()


def get_parcel_by_survey_number(survey_number: str):
    """Fetch a parcel by survey number or return None if it does not exist."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT *
                FROM parcels
                WHERE survey_number = %s
                LIMIT 1;
                """,
                (survey_number,),
            )
            row = cur.fetchone()
            if row is None:
                return None
            columns = [desc[0] for desc in cur.description]
            return dict(zip(columns, row))
    finally:
        conn.close()


def get_document(filename: str) -> str:
    """Return the absolute path to a sample document for AI processing."""
    base_dir = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "data", "sample_docs")
    )
    file_path = os.path.join(base_dir, filename)
    if not os.path.exists(file_path):
        raise FileNotFoundError(filename)
    return file_path


def get_project_risk_inputs(project_id: str) -> dict:
    """
    Aggregates real data from the database into the shape
    risk.calculate_risk_score() expects:
        total_cases, overdue_cases,
        total_compensation_assessed, total_compensation_paid,
        unresolved_mismatches, total_mismatches,
        total_rr_activities, completed_rr_activities
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Cases + overdue count
            cur.execute(
                """
                SELECT COUNT(*) AS total,
                       COUNT(*) FILTER (WHERE is_overdue = true) AS overdue
                FROM acquisition_cases
                WHERE project_id = %s;
                """,
                (project_id,),
            )
            cases = cur.fetchone()

            # Compensation assessed vs paid, across all parcels in this project
            cur.execute(
                """
                SELECT COALESCE(SUM(c.amount_assessed), 0) AS assessed,
                       COALESCE(SUM(c.amount_paid), 0) AS paid
                FROM compensation c
                JOIN parcels p ON c.parcel_id = p.id
                WHERE p.project_id = %s;
                """,
                (project_id,),
            )
            compensation = cur.fetchone()

            # Mismatches — total and unresolved, across documents linked to this project
            cur.execute(
                """
                SELECT COUNT(*) AS total,
                       COUNT(*) FILTER (WHERE status = 'DETECTED') AS unresolved
                FROM ai_mismatches m
                JOIN documents d ON m.document_id = d.id
                WHERE d.project_id = %s;
                """,
                (project_id,),
            )
            mismatches = cur.fetchone()

            # R&R activities for families linked to this project
            cur.execute(
                """
                SELECT COUNT(*) AS total,
                       COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed
                FROM rr_activities r
                JOIN families f ON r.family_id = f.id
                WHERE f.project_id = %s;
                """,
                (project_id,),
            )
            rr = cur.fetchone()

            return {
                "total_cases": cases[0] or 0,
                "overdue_cases": cases[1] or 0,
                "total_compensation_assessed": float(compensation[0] or 0),
                "total_compensation_paid": float(compensation[1] or 0),
                "total_mismatches": mismatches[0] or 0,
                "unresolved_mismatches": mismatches[1] or 0,
                "total_rr_activities": rr[0] or 0,
                "completed_rr_activities": rr[1] or 0,
            }
    finally:
        conn.close()


def save_risk_score(
    project_id: str, score: float, risk_level: str, factors: dict
) -> dict:
    """
    Inserts a new risk score record into the real risk_scores table.
    Each call creates a NEW row (not an update) — this preserves
    history, letting you see how a project's risk changed over time
    via calculated_at.
    """
    query = """
        INSERT INTO risk_scores (project_id, score, risk_level, factors, model_version)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id, project_id, score, risk_level, factors, model_version, calculated_at;
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                query,
                (
                    project_id,
                    score,
                    risk_level,
                    psycopg2.extras.Json(factors),
                    "weighted-formula-v1",
                ),
            )
            row = cur.fetchone()
            conn.commit()
            if row is None:
                return None
            columns = [desc[0] for desc in cur.description]
            return dict(zip(columns, row))
    finally:
        conn.close()


def save_mismatches(
    mismatches: list[dict], parcel_id: str, document_id: str | None = None
) -> list[dict]:
    """
    Inserts detected mismatches into the real ai_mismatches table.
    document_id is optional and nullable — since real document uploads
    (Phase 7) may not be fully wired yet, you can pass None until a
    real document row exists to link against.
    """
    if not mismatches:
        return []

    query = """
        INSERT INTO ai_mismatches
            (document_id, parcel_id, field_name, official_value,
             extracted_value, difference, severity, explanation, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id, field_name, severity, detected_at;
    """
    conn = get_db_connection()
    saved_records = []
    try:
        with conn.cursor() as cur:
            for m in mismatches:
                cur.execute(
                    query,
                    (
                        document_id,
                        parcel_id,
                        m["field_name"],
                        m["official_value"],
                        m["extracted_value"],
                        m["difference"],
                        m["severity"],
                        m["explanation"],
                        m["status"],
                    ),
                )
                row = cur.fetchone()
                if row is not None:
                    columns = [desc[0] for desc in cur.description]
                    saved_records.append(dict(zip(columns, row)))
            conn.commit()
        return saved_records
    finally:
        conn.close()
