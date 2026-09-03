"""
comparator.py

Compares extracted document fields against the official parcel
record and produces mismatch records shaped exactly like the real
`ai_mismatches` database table:
  field_name, official_value, extracted_value, difference,
  severity, explanation, status

Comparison rules (per the architecture doc):
- survey_number, district -> EXACT match
- area_acres              -> numeric, tolerance ±0.01 acres
- village, owner_name     -> FUZZY match (OCR/spelling variation expected)

AI never declares fraud or legal guilt — every mismatch is phrased
as a factual discrepancy for a human officer to review.
"""

from rapidfuzz import fuzz

AREA_TOLERANCE = 0.01  # acres
FUZZY_MATCH_THRESHOLD = 85  # 0-100 similarity score; below this = mismatch


def compare_fields(extracted: dict, official: dict) -> list[dict]:
    """
    Compares extracted document fields against an official parcel
    record. Returns a list of mismatch dicts — one per field that
    doesn't match. Fields that match are simply omitted (no record).
    """
    mismatches = []

    mismatches += _compare_exact(extracted, official, "survey_number")
    mismatches += _compare_exact(extracted, official, "district")
    mismatches += _compare_area(extracted, official)
    mismatches += _compare_fuzzy(extracted, official, "village")
    mismatches += _compare_fuzzy(extracted, official, "owner_name")

    return mismatches


def _compare_exact(extracted: dict, official: dict, field: str) -> list[dict]:
    ext_val = extracted.get(field)
    off_val = official.get(field)

    if ext_val is None or off_val is None:
        return []  # can't compare if either side is missing

    if str(ext_val).strip().lower() != str(off_val).strip().lower():
        return [{
            "field_name": field,
            "official_value": str(off_val),
            "extracted_value": str(ext_val),
            "difference": f"'{off_val}' vs '{ext_val}'",
            "severity": "HIGH",
            "explanation": (
                f"The {field.replace('_', ' ')} in the document "
                f"('{ext_val}') does not match the officially "
                f"recorded value ('{off_val}')."
            ),
            "status": "DETECTED",
        }]
    return []


def _compare_area(extracted: dict, official: dict) -> list[dict]:
    ext_val = extracted.get("area_acres")
    off_val = official.get("area_acres")

    if ext_val is None or off_val is None:
        return []

    try:
        ext_val = float(ext_val)
        off_val = float(off_val)
    except (TypeError, ValueError):
        return []

    diff = round(abs(ext_val - off_val), 2)

    if diff > AREA_TOLERANCE:
        severity = "HIGH" if diff >= 0.2 else "MEDIUM"
        direction = "less than" if ext_val < off_val else "more than"
        return [{
            "field_name": "area_acres",
            "official_value": f"{off_val} acres",
            "extracted_value": f"{ext_val} acres",
            "difference": f"{diff} acres",
            "severity": severity,
            "explanation": (
                f"The documented area is {direction} the officially "
                f"recorded cadastral area by {diff} acres."
            ),
            "status": "DETECTED",
        }]
    return []


def _compare_fuzzy(extracted: dict, official: dict, field: str) -> list[dict]:
    ext_val = extracted.get(field)
    off_val = official.get(field)

    if ext_val is None or off_val is None:
        return []

    similarity = fuzz.ratio(str(ext_val).strip().lower(), str(off_val).strip().lower())

    if similarity < FUZZY_MATCH_THRESHOLD:
        severity = "HIGH" if (similarity < 85 or field == "owner_name") else "MEDIUM"
        return [{
            "field_name": field,
            "official_value": str(off_val),
            "extracted_value": str(ext_val),
            "difference": f"{100 - similarity:.0f}% dissimilar",
            "severity": severity,
            "explanation": (
                f"The {field.replace('_', ' ')} in the document "
                f"('{ext_val}') differs from the officially recorded "
                f"value ('{off_val}') and may be a spelling variation "
                f"or transcription error requiring verification."
            ),
            "status": "DETECTED",
        }]
    return []