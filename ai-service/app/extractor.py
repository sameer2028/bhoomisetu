"""
extractor.py

Takes raw OCR text (from ocr.py) and pulls out structured fields:
survey_number, area_acres, village, owner_name, district.

Uses regex patterns matched against the "Label: Value" format your
documents use. Area is converted to a float so Day 4's comparison
logic can do numeric tolerance checks on it.
"""

import re


# Each pattern looks for "Label" followed by a colon (allowing for
# minor OCR noise like extra spaces) and captures everything after
# it up to the end of the line.
FIELD_PATTERNS = {
    "survey_number": r"Survey\s*No[:\s]+([^\n]+)",
    "area_acres": r"Area[:\s]+([\d.]+)\s*acres?",
    "village": r"Village[:\s]+([^\n]+)",
    "owner_name": r"Owner[:\s]+([^\n]+)",
    "district": r"District[:\s]+([^\n]+)",
}


def extract_fields(raw_text: str) -> dict:
    """
    Parses raw OCR text and returns a dictionary of structured fields.
    Any field that couldn't be found is set to None, rather than
    raising an error — a partially-readable document should still
    return whatever it could extract.
    """
    result = {}

    for field_name, pattern in FIELD_PATTERNS.items():
        match = re.search(pattern, raw_text, re.IGNORECASE)
        if match:
            value = match.group(1).strip()
            result[field_name] = value
        else:
            result[field_name] = None

    # Convert area to a real number for numeric comparison later.
    # Kept as a separate step so a failed conversion doesn't break
    # extraction of the other fields.
    if result["area_acres"] is not None:
        try:
            result["area_acres"] = float(result["area_acres"])
        except ValueError:
            result["area_acres"] = None

    return result


def extract_fields_with_confidence(raw_text: str) -> dict:
    """
    Same as extract_fields(), but also reports which fields were
    successfully found vs missing — useful for surfacing to the
    officer if a document was only partially readable.
    """
    fields = extract_fields(raw_text)
    missing = [k for k, v in fields.items() if v is None]

    return {
        "fields": fields,
        "missing_fields": missing,
        "fully_extracted": len(missing) == 0,
    }