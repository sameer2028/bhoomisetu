"""
comparator.py

Compares AI-extracted document fields against the official cadastral
parcel record and produces mismatch records shaped like the
`ai_mismatches` database table.

Comparison rules
────────────────
  survey_number, district   → EXACT match  (case-insensitive)
  area_acres                → numeric,  tolerance ±0.01 acres
  village, owner_name       → FUZZY match  (RapidFuzz ratio)

Every mismatch is phrased as a factual discrepancy — the AI never
declares fraud or assigns legal blame.
"""

from rapidfuzz import fuzz

AREA_TOLERANCE = 0.01          # acres
FUZZY_MATCH_THRESHOLD = 80     # 0-100; below this = mismatch


# ── Public API ───────────────────────────────────────────────────────


def compare_fields(extracted: dict, official: dict) -> list[dict]:
    """
    Compare extracted document fields against an official parcel record.
    Returns a list of mismatch dicts (one per mismatched field).
    Fields that match are simply omitted.
    """
    mismatches = []

    mismatches += _compare_exact(extracted, official, "survey_number")
    mismatches += _compare_exact(extracted, official, "district")
    mismatches += _compare_area(extracted, official)
    mismatches += _compare_fuzzy(extracted, official, "village")
    mismatches += _compare_fuzzy(extracted, official, "owner_name")

    return mismatches


# ── Internal helpers ─────────────────────────────────────────────────


def _norm(value) -> str:
    """Normalise a value to a comparable lowercase string."""
    if value is None:
        return ""
    return str(value).strip().lower()


def _compare_exact(extracted: dict, official: dict, field: str) -> list[dict]:
    ext_val = extracted.get(field)
    off_val = official.get(field)

    if ext_val is None and off_val is None:
        return []

    if ext_val is None:
        return [_mismatch(
            field,
            official_value=str(off_val),
            extracted_value="NOT FOUND",
            difference="Missing in document",
            severity="HIGH",
            explanation=(
                f"The official {field.replace('_', ' ')} is '{off_val}', "
                f"but no matching value could be extracted from the document."
            ),
        )]

    if off_val is None:
        return [_mismatch(
            field,
            official_value="NOT RECORDED",
            extracted_value=str(ext_val),
            difference="Missing in official record",
            severity="MEDIUM",
            explanation=(
                f"The document contains {field.replace('_', ' ')} '{ext_val}', "
                f"but it is missing from the official cadastral record."
            ),
        )]

    if _norm(ext_val) != _norm(off_val):
        return [_mismatch(
            field,
            official_value=str(off_val),
            extracted_value=str(ext_val),
            difference=f"'{off_val}' vs '{ext_val}'",
            severity="HIGH",
            explanation=(
                f"The {field.replace('_', ' ')} in the document "
                f"('{ext_val}') does not match the officially "
                f"recorded value ('{off_val}')."
            ),
        )]

    return []


def _compare_area(extracted: dict, official: dict) -> list[dict]:
    ext_val = extracted.get("area_acres")
    off_val = official.get("area_acres")

    if ext_val is None and off_val is None:
        return []

    if ext_val is None:
        return [_mismatch(
            "area_acres",
            official_value=f"{off_val} acres",
            extracted_value="NOT FOUND",
            difference="Missing in document",
            severity="HIGH",
            explanation=(
                f"The official area is {off_val} acres, but the area "
                f"could not be found in the document."
            ),
        )]

    if off_val is None:
        return [_mismatch(
            "area_acres",
            official_value="NOT RECORDED",
            extracted_value=f"{ext_val} acres",
            difference="Missing in official record",
            severity="MEDIUM",
            explanation=(
                f"The document contains an area of {ext_val} acres, "
                f"but it is missing from the official cadastral record."
            ),
        )]

    try:
        ext_f = float(ext_val)
        off_f = float(off_val)
    except (TypeError, ValueError):
        return []

    diff = round(abs(ext_f - off_f), 2)

    if diff > AREA_TOLERANCE:
        severity = "HIGH" if diff >= 0.2 else "MEDIUM"
        direction = "less than" if ext_f < off_f else "more than"
        return [_mismatch(
            "area_acres",
            official_value=f"{off_val} acres",
            extracted_value=f"{ext_val} acres",
            difference=f"{diff} acres",
            severity=severity,
            explanation=(
                f"The documented area is {direction} the officially "
                f"recorded cadastral area by {diff} acres."
            ),
        )]

    return []


def _compare_fuzzy(extracted: dict, official: dict, field: str) -> list[dict]:
    ext_val = extracted.get(field)
    off_val = official.get(field)

    if ext_val is None and off_val is None:
        return []

    if ext_val is None:
        return [_mismatch(
            field,
            official_value=str(off_val),
            extracted_value="NOT FOUND",
            difference="Missing in document",
            severity="HIGH",
            explanation=(
                f"The official {field.replace('_', ' ')} is '{off_val}', "
                f"but no matching value could be extracted from the document."
            ),
        )]

    if off_val is None:
        return [_mismatch(
            field,
            official_value="NOT RECORDED",
            extracted_value=str(ext_val),
            difference="Missing in official record",
            severity="MEDIUM",
            explanation=(
                f"The document contains {field.replace('_', ' ')} '{ext_val}', "
                f"but it is missing from the official cadastral record."
            ),
        )]

    similarity = fuzz.ratio(_norm(ext_val), _norm(off_val))

    if similarity < FUZZY_MATCH_THRESHOLD:
        severity = "HIGH" if similarity < 70 else "MEDIUM"
        return [_mismatch(
            field,
            official_value=str(off_val),
            extracted_value=str(ext_val),
            difference=f"{100 - similarity:.0f}% dissimilar",
            severity=severity,
            explanation=(
                f"The {field.replace('_', ' ')} in the document "
                f"('{ext_val}') differs from the officially recorded "
                f"value ('{off_val}') — similarity {similarity}%. "
                f"This may be a spelling variation or transcription "
                f"error requiring human verification."
            ),
        )]

    return []


# ── Mismatch record builder ─────────────────────────────────────────


def _mismatch(
    field_name: str,
    *,
    official_value: str,
    extracted_value: str,
    difference: str,
    severity: str,
    explanation: str,
) -> dict:
    return {
        "field_name": field_name,
        "official_value": official_value,
        "extracted_value": extracted_value,
        "difference": difference,
        "severity": severity,
        "explanation": explanation,
        "status": "DETECTED",
    }