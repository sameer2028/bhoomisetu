"""
extractor.py

Takes raw OCR text (from ocr.py) and pulls out structured fields:
survey_number, area_acres, village, owner_name, district.

Uses resilient regex patterns and normalization to handle punctuation,
accidental dots, and multi-line variations.
"""

import re


def clean_val(val: str | None) -> str | None:
    if not val:
        return None
    # Strip leading/trailing punctuation, dots, colons, underscores, dashes
    cleaned = re.sub(r"^[\s:.,;_\-#]+|[\s:.,;_\-#]+$", "", val)
    return cleaned.strip() if cleaned.strip() else None


def extract_fields(raw_text: str) -> dict:
    """
    Parses raw OCR text and returns a dictionary of structured fields.
    """
    result = {
        "survey_number": None,
        "area_acres": None,
        "village": None,
        "owner_name": None,
        "district": None,
    }

    if not raw_text:
        return result

    # 1. Survey Number
    survey_pats = [
        r"(?:Survey\s*No|Khasra\s*No|Survey|Khasra|Surve\s*y\s*No|S\.No|S\s*No)[\s:._#]+([0-9]+(?:\s*[\/\-]\s*[0-9]+[a-zA-Z]?)?)",
        r"\b([0-9]{1,4}\s*[\/]\s*[0-9]{1,3}[a-zA-Z]?)\b",
    ]
    for pat in survey_pats:
        m = re.search(pat, raw_text, re.IGNORECASE)
        if m:
            val = clean_val(m.group(1))
            if val:
                result["survey_number"] = val.replace(" ", "")
                break

    # 2. Area (Acres)
    area_pats = [
        r"(?:Area|Rakba|Land\s*Area|Acreage)[\s:._]+([0-9]+(?:\.[0-9]+)?)\s*(?:acres?|acre|ac|hectares?)?",
        r"([0-9]+\.[0-9]{1,3})\s*(?:acres?|acre|ac)\b",
    ]
    for pat in area_pats:
        m = re.search(pat, raw_text, re.IGNORECASE)
        if m:
            try:
                result["area_acres"] = float(m.group(1))
                break
            except (ValueError, TypeError):
                pass

    # 3. Village
    village_pats = [
        r"(?:Village|Vill|Mauza|Gram|Location)[\s:._]+([A-Za-z\s]+?)(?=\n|District|Owner|Area|Survey|$)",
        r"(?:Village|Vill)[\s:._]+([A-Za-z0-9\s]+)",
    ]
    for pat in village_pats:
        m = re.search(pat, raw_text, re.IGNORECASE)
        if m:
            val = clean_val(m.group(1))
            if val and len(val) >= 2:
                result["village"] = val
                break

    # 4. Owner Name
    owner_pats = [
        r"(?:Owner|Landowner|Khatedar|Name|Title|Proprietor)[\s:._]+([A-Za-z\s]+?)(?=\n|District|Village|Area|Survey|$)",
        r"(?:Owner|Landowner)[\s:._]+([A-Za-z\s]+)",
    ]
    for pat in owner_pats:
        m = re.search(pat, raw_text, re.IGNORECASE)
        if m:
            val = clean_val(m.group(1))
            if val and len(val) >= 2:
                result["owner_name"] = val
                break

    # 5. District
    district_pats = [
        r"(?:District|Dist)[\s:._]+([A-Za-z\s]+?)(?=\n|State|Village|Owner|Area|Survey|$)",
        r"(?:District|Dist)[\s:._]+([A-Za-z\s]+)",
    ]
    for pat in district_pats:
        m = re.search(pat, raw_text, re.IGNORECASE)
        if m:
            val = clean_val(m.group(1))
            if val and len(val) >= 2:
                result["district"] = val
                break

    return result


def extract_fields_with_confidence(raw_text: str) -> dict:
    fields = extract_fields(raw_text)
    missing = [k for k, v in fields.items() if v is None]

    return {
        "fields": fields,
        "missing_fields": missing,
        "fully_extracted": len(missing) == 0,
    }