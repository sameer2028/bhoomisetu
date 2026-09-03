"""
main.py

FastAPI endpoints for the AI service, matching the /api/ai
routes defined in the architecture doc. Wires together:
  ocr.py -> extractor.py -> comparator.py -> risk.py
using data_adapter.py as the single point of contact with data
(real DB for parcels/projects, mock files for documents until
Phase 7 lands).
"""

from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from app.data_adapter import (
    get_db_connection,
    get_parcel,
    get_document,
    get_project_risk_inputs,
    save_risk_score,
    save_mismatches,
)
from app.ocr import extract_text
from app.extractor import extract_fields, extract_fields_with_confidence
from app.comparator import compare_fields
from app.risk import calculate_risk_score

load_dotenv()

app = FastAPI(
    title="National Land Acquisition AI Microservice",
    description="OCR, Document Field Extraction, Cadastral Discrepancy Comparison, and Project Risk Scoring",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Request/response shapes ----------


class CompareRequest(BaseModel):
    document_filename: str  # mock document filename, e.g. "doc_002_area_mismatch.png"
    parcel_id: str  # real parcel UUID from the database
    document_id: str | None = None  # optional real document UUID, if known


class RiskScoreResponse(BaseModel):
    score: float
    risk_level: str
    factors: dict
    model_version: str = "v1.2-weighted"


class ProcessDocumentRequest(BaseModel):
    file_path: str
    official_parcel: dict | None = None

# ---------- Health / status ----------


@app.get("/")
@app.head("/")
def read_root():
    return {"message": "NLA AI Service is running", "service": "National Land Acquisition AI Microservice"}


@app.get("/health")
@app.head("/health")
@app.get("/api/health")
@app.head("/api/health")
def health_check():
    try:
        conn = get_db_connection()
        conn.close()
        return {"status": "healthy", "database": "connected"}
    except Exception:
        return {"status": "unhealthy", "database": "disconnected"}


@app.get("/api/ai/status")
@app.head("/api/ai/status")
def ai_status():
    return {"service": "NLA AI Service", "status": "operational", "capabilities": ["OCR", "Field_Extraction", "Cadastral_Comparison", "Risk_Scoring"]}


# ---------- Feature 1: Document extraction ----------


@app.post("/api/ai/extract")
def extract_document(document_filename: str):
    """
    Runs OCR + field extraction on a document.
    document_filename refers to a file in data/sample_docs/ for now.
    """
    try:
        file_path = get_document(document_filename)
        raw_text = extract_text(file_path)
        fields = extract_fields(raw_text)
        return {
            "document_filename": document_filename,
            "raw_text": raw_text,
            "extracted_fields": fields,
        }
    except FileNotFoundError:
        raise HTTPException(
            status_code=404, detail=f"Document not found: {document_filename}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {e}")


# ---------- Feature 1: Comparison / mismatch detection ----------


@app.post("/api/ai/compare")
def compare_document(request: CompareRequest):
    try:
        file_path = get_document(request.document_filename)
        raw_text = extract_text(file_path)
        extracted = extract_fields(raw_text)
    except FileNotFoundError:
        raise HTTPException(
            status_code=404, detail=f"Document not found: {request.document_filename}"
        )

    official_parcel = get_parcel(request.parcel_id)
    if official_parcel is None:
        raise HTTPException(
            status_code=404, detail=f"Parcel not found: {request.parcel_id}"
        )

    mismatches = compare_fields(extracted, official_parcel)

    saved = save_mismatches(
        mismatches=mismatches,
        parcel_id=request.parcel_id,
        document_id=request.document_id,
    )

    return {
        "document_filename": request.document_filename,
        "parcel_id": request.parcel_id,
        "extracted_fields": extracted,
        "mismatches": mismatches,
        "verified": len(mismatches) == 0,
        "saved_records": saved,
    }


@app.post("/api/ai/process-document")
def api_process_document(req: ProcessDocumentRequest):
    """
    Full End-to-End pipeline: OCR -> Structured Extraction -> Comparison against official record.
    """
    file_path = Path(req.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {req.file_path}")

    try:
        raw_text = extract_text(file_path)
        extracted = extract_fields_with_confidence(raw_text)
        mismatches = []
        if req.official_parcel:
            mismatches = compare_fields(extracted["fields"], req.official_parcel)

        return {
            "success": True,
            "raw_text": raw_text,
            "extracted_fields": extracted["fields"],
            "missing_fields": extracted["missing_fields"],
            "fully_extracted": extracted["fully_extracted"],
            "has_mismatches": len(mismatches) > 0,
            "mismatch_count": len(mismatches),
            "mismatches": mismatches,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Document processing failed: {str(e)}")


# ---------- Feature 2: Risk scoring ----------


@app.post("/api/ai/risk-score/{project_id}")
def get_risk_score(project_id: str):
    try:
        risk_inputs = get_project_risk_inputs(project_id)
        result = calculate_risk_score(risk_inputs)

        saved = save_risk_score(
            project_id=project_id,
            score=result["score"],
            risk_level=result["risk_level"],
            factors=result["factors"],
        )

        return {
            "project_id": project_id,
            **result,
            "saved_record_id": saved["id"],
            "calculated_at": saved["calculated_at"].isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Risk calculation failed: {e}")


# ---------- Feature 3: Calculate risk with direct parameters ----------


@app.post("/api/ai/calculate-risk", response_model=RiskScoreResponse)
def api_calculate_risk(
    overdue_cases_count: int = 0,
    total_assessed_comp: float = 0.0,
    total_paid_comp: float = 0.0,
    delayed_rr_count: int = 0,
    open_mismatches_count: int = 0,
):
    """
    Computes weighted 4-factor risk score for a project.
    """
    score, risk_level, factors = calculate_risk_score(
        overdue_cases_count=overdue_cases_count,
        total_assessed_comp=total_assessed_comp,
        total_paid_comp=total_paid_comp,
        delayed_rr_count=delayed_rr_count,
        open_mismatches_count=open_mismatches_count,
    )
    return {
        "score": score,
        "risk_level": risk_level,
        "factors": factors,
        "model_version": "v1.2-weighted",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
