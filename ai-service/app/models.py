from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class ExtractTextRequest(BaseModel):
    file_path: str = Field(..., description="Absolute or relative path to the PDF/image document")


class ExtractTextResponse(BaseModel):
    success: bool
    raw_text: str
    file_path: str


class ExtractedFields(BaseModel):
    survey_number: Optional[str] = None
    area_acres: Optional[float] = None
    village: Optional[str] = None
    owner_name: Optional[str] = None
    district: Optional[str] = None


class CompareRequest(BaseModel):
    extracted_fields: Dict[str, Any]
    official_parcel: Dict[str, Any]


class MismatchRecord(BaseModel):
    field_name: str
    official_value: str
    extracted_value: str
    difference: str
    severity: str
    explanation: str
    status: str = "DETECTED"


class CompareResponse(BaseModel):
    success: bool
    has_mismatches: bool
    mismatch_count: int
    mismatches: List[Dict[str, Any]]
    extracted_fields: Dict[str, Any]
    official_parcel: Dict[str, Any]


class ProcessDocumentRequest(BaseModel):
    file_path: str
    official_parcel: Optional[Dict[str, Any]] = None


class RiskFactor(BaseModel):
    score: float
    max: float
    count: Optional[int] = None
    label: str


class RiskScoreResponse(BaseModel):
    score: float
    risk_level: str
    factors: Dict[str, Any]
    model_version: str = "v1.2-weighted"
