import os
from fastapi import FastAPI
from dotenv import load_dotenv
from app.data_adapter import get_parcel_by_survey_number, get_db_connection

load_dotenv()

app = FastAPI(title="NLA AI Service", version="1.0.0")


@app.get("/")
def read_root():
    """Health check endpoint."""
    return {"message": "NLA AI Service is running"}


@app.get("/health")
def health_check():
    """Check database connectivity."""
    try:
        conn = get_db_connection()
        conn.close()
        return {"status": "healthy", "database": "connected"}
    except Exception:
        return {"status": "unhealthy", "database": "disconnected"}


@app.get("/api/ai/status")
def ai_status():
    """AI Service status."""
    return {"service": "NLA AI Service", "status": "operational"}


# Document processing endpoints (Phase 8) — stubs, built out Day 3+
@app.post("/api/ai/process-document")
def process_document(file_path: str):
    return {"message": "Document processing endpoint", "file_path": file_path}


@app.post("/api/ai/extract-text")
def extract_text(document_id: str):
    return {"message": "Text extraction endpoint", "document_id": document_id}


@app.get("/api/ai/analysis/{document_id}")
def get_analysis(document_id: str):
    return {"message": "Analysis retrieval endpoint", "document_id": document_id}


@app.get("/test-db")
def test_db_connection():
    parcel = get_parcel_by_survey_number("123/2")
    return {"parcel": parcel}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)