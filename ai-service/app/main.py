import os
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.ocr import extract_text
from app.extractor import extract_fields_with_confidence, extract_fields
from app.comparator import compare_fields
from app.risk import calculate_risk_score
from app.models import (
    ExtractTextRequest,
    ExtractTextResponse,
    CompareRequest,
    CompareResponse,
    ProcessDocumentRequest,
    RiskScoreResponse,
)

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


@app.get("/")
def read_root():
    return {
        "service": "National Land Acquisition AI Microservice",
        "status": "operational",
        "version": "1.0.0",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "NLA AI Service"}


@app.get("/api/ai/status")
def ai_status():
    return {
        "service": "NLA AI Service",
        "status": "operational",
        "capabilities": ["OCR", "Field_Extraction", "Cadastral_Comparison", "Risk_Scoring"],
    }


@app.post("/api/ai/extract-text", response_model=ExtractTextResponse)
def api_extract_text(req: ExtractTextRequest):
    """
    Extract raw text from PDF or Image document via OCR / PDF extraction.
    """
    file_path = Path(req.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {req.file_path}")

    try:
        raw_text = extract_text(file_path)
        return ExtractTextResponse(
            success=True,
            raw_text=raw_text,
            file_path=str(file_path),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text extraction failed: {str(e)}")


@app.post("/api/ai/extract-fields")
def api_extract_fields(req: ExtractTextRequest):
    """
    Runs OCR and structured field extraction on a document.
    """
    file_path = Path(req.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {req.file_path}")

    try:
        raw_text = extract_text(file_path)
        extracted = extract_fields_with_confidence(raw_text)
        return {
            "success": True,
            "raw_text": raw_text,
            "extracted_fields": extracted["fields"],
            "missing_fields": extracted["missing_fields"],
            "fully_extracted": extracted["fully_extracted"],
            "file_path": str(file_path),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Field extraction failed: {str(e)}")


@app.post("/api/ai/compare", response_model=CompareResponse)
def api_compare(req: CompareRequest):
    """
    Compares extracted document fields against official cadastral parcel record.
    """
    try:
        mismatches = compare_fields(req.extracted_fields, req.official_parcel)
        return CompareResponse(
            success=True,
            has_mismatches=len(mismatches) > 0,
            mismatch_count=len(mismatches),
            mismatches=mismatches,
            extracted_fields=req.extracted_fields,
            official_parcel=req.official_parcel,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")


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
    return RiskScoreResponse(
        score=score,
        risk_level=risk_level,
        factors=factors,
        model_version="v1.2-weighted",
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)