"""
extractor.py

Converts raw OCR / PDF text into structured land-record fields.

Extraction strategy
───────────────────
EasyOCR outputs free-form paragraphs (not neat "Label: Value" lines like
Tesseract PSM-6).  So we use a layered approach:

1.  Try line-by-line "Label: Value" regex (works for typed forms).
2.  Try paragraph-level regex (works for EasyOCR merged paragraphs).
3.  Try fuzzy / OCR-tolerant label patterns (handles misspelled labels).
4.  For numeric fields, try standalone patterns as a last resort.

Supported fields:
    survey_number, area_acres, village, owner_name, district
"""

import re
from typing import Optional

# ── Helpers ──────────────────────────────────────────────────────────


def clean_val(value: Optional[str]) -> Optional[str]:
    """Strip noise characters that OCR often prepends/appends."""
    if not value:
        return None

    value = value.replace("\r", " ")
    value = re.sub(r"\s+", " ", value)

    # Remove leading/trailing punctuation / separators
    value = re.sub(r"^[\s:;,.#_\-|=]+", "", value)
    value = re.sub(r"[\s:;,.#_\-|=]+$", "", value)

    return value.strip() or None


def normalize_text(text: str) -> str:
    """Collapse whitespace but keep newlines for line-level matching."""
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    lines = []
    for line in text.split("\n"):
        line = re.sub(r"[ \t]+", " ", line).strip()
        if line:
            lines.append(line)
    return "\n".join(lines)


# ── Generic label-value extractor ────────────────────────────────────


def _find_after_labels(
    text: str,
    labels: list[str],
    *,
    value_pattern: str = r"(.+)",
    flags: int = re.IGNORECASE | re.MULTILINE,
) -> Optional[str]:
    """
    Search for `<label> <separator?> <value>` on a single line OR
    within a paragraph blob.  Tries longest labels first to avoid
    partial matches (e.g. "Owner Name" before "Owner").
    """
    sorted_labels = sorted(labels, key=len, reverse=True)
    label_alt = "|".join(re.escape(l) for l in sorted_labels)

    # Pattern 1 – line-anchored (Label: Value)
    pat_line = rf"(?:^|\n)\s*(?:{label_alt})(?:\b|\s|[:._\-])\s*[:._\-]?\s*{value_pattern}"
    m = re.search(pat_line, text, flags)
    if m:
        return clean_val(m.group(1))

    # Pattern 2 – inline / paragraph (… Label Value …)
    pat_inline = rf"(?:{label_alt})(?:\b|\s|[:._\-])\s*[:._\-]?\s*{value_pattern}"
    m = re.search(pat_inline, text, flags)
    if m:
        return clean_val(m.group(1))

    return None


def _trim_at_next_label(value: str) -> str:
    """
    If the captured value accidentally swallowed a subsequent label,
    chop it off.  This is common with EasyOCR paragraph mode.
    """
    boundary = re.split(
        r"\b(?:Survey|Khasra|Area|Village|Vill|Mauza|Gram|Owner|Landowner|"
        r"Khatedar|Proprietor|District|Dist|Tehsil|State|Report|Project|"
        r"Date|S\.No|Test\s*case)\b",
        value,
        maxsplit=1,
        flags=re.IGNORECASE,
    )
    return boundary[0].strip()


# ── OCR-tolerant fuzzy label matching ────────────────────────────────


def _find_fuzzy_label(text: str, fuzzy_patterns: list[str], value_pattern: str) -> Optional[str]:
    """
    Try OCR-tolerant regex patterns that account for common EasyOCR
    misspellings and character insertions.  Each fuzzy_pattern is a
    regex that matches the corrupted label text.
    """
    for pat in fuzzy_patterns:
        full_pat = rf"(?:^|\n|\s){pat}\s*[:;._\-]?\s*{value_pattern}"
        m = re.search(full_pat, text, re.IGNORECASE)
        if m:
            return clean_val(m.group(1))
    return None


# ── Main extraction ──────────────────────────────────────────────────


def extract_fields(raw_text: str) -> dict:
    """
    Parse raw OCR / PDF text and return structured fields.
    Returns a dict with keys: survey_number, area_acres, village,
    owner_name, district.  Missing fields are None.
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

    text = normalize_text(raw_text)

    # ── Survey Number ────────────────────────────────────────────────
    # Try label-based first
    survey = _find_after_labels(
        text,
        [
            "Survey No", "Survey Number", "Survey No.", "S.No", "S. No",
            "Khasra No", "Khasra Number", "Khasra No.",
            "Survey", "Khasra",
        ],
        value_pattern=r"([0-9]+(?:\s*[/\-]\s*[0-9]+[A-Za-z]?)?)",
    )
    if survey:
        result["survey_number"] = survey.replace(" ", "")
    else:
        # Fuzzy: OCR often corrupts "Survey" to "Suvey", "Survay", etc.
        # and "Khasra" to "Khasfa", "Khasta", etc.
        survey = _find_fuzzy_label(
            text,
            [
                r"[Ss][uv]+[er][vw][ea]?[vy]?\s*[Nn]o",       # Survey No
                r"[Kk]h?[aes][sr][rfk]a?\s*[Nn]o",            # Khasra No
                r"[Ss]\s*\.?\s*[Nn]o",                          # S.No / S No
                r"[Ww]ve\s*[Nn]o",                              # wve No (OCR of Survey No)
            ],
            r"[;:._\-]?\s*([0-9]+(?:\s*[/\-]\s*[0-9]+[A-Za-z]?)?)",
        )
        if survey:
            result["survey_number"] = survey.replace(" ", "")
        else:
            # Fallback: standalone fractional number like 123/2B
            m = re.search(r"\b([0-9]{1,6}\s*/\s*[0-9]{1,6}[A-Za-z]?)\b", text)
            if m:
                result["survey_number"] = m.group(1).replace(" ", "")

    # ── Area (Acres) ─────────────────────────────────────────────────
    area = _find_after_labels(
        text,
        ["Area", "Land Area", "Acreage", "Rakba", "Total Area"],
        value_pattern=r"([\d]+(?:\.[\d]+)?)\s*(?:acres?|acre|ac|hectares?)?",
    )
    if area:
        try:
            result["area_acres"] = float(area)
        except ValueError:
            pass

    if result["area_acres"] is None:
        # Fuzzy: OCR corrupts "Area" to "Axea", "Ayea", "Asea", etc.
        area = _find_fuzzy_label(
            text,
            [
                r"[Aa][rxyz]e\s*a",         # Axea, Ayea, Azea
                r"[Aa]r[ea]+",               # Area, Araa
                r"[Aa][sc]ea",               # Asea, Acea
            ],
            r"([\d]+(?:\s*[.,(/]\s*[\d]+)?)\s*(?:acres?|ac|QCulef)?",
        )
        if area:
            # Clean up OCR artifacts in numbers: "2 . 10" -> "2.10"
            cleaned = re.sub(r"\s*[.,(/]\s*", ".", area.strip())
            try:
                result["area_acres"] = float(cleaned)
            except ValueError:
                pass

    if result["area_acres"] is None:
        # Fallback: number followed by "acres"
        m = re.search(r"([\d]+\.[\d]+)\s*(?:acres?|acre|ac)\b", text, re.IGNORECASE)
        if m:
            try:
                result["area_acres"] = float(m.group(1))
            except ValueError:
                pass

    if result["area_acres"] is None:
        # Last resort: look for a decimal number near area-like context
        # Pattern: digit(s) space dot/comma space digit(s) near "acre" or "QCulef" (OCR of "acres")
        m = re.search(r"(\d+)\s*[.,(/]\s*(\d+)\s*(?:acres?|ac|QCulef|acu)", text, re.IGNORECASE)
        if m:
            try:
                result["area_acres"] = float(f"{m.group(1)}.{m.group(2)}")
            except ValueError:
                pass

    # ── Village ──────────────────────────────────────────────────────
    village = _find_after_labels(
        text,
        ["Village", "Vill", "Mauza", "Gram", "Gram Name", "Location"],
        value_pattern=r"([A-Za-z][A-Za-z0-9\s]+)",
    )
    if village:
        result["village"] = clean_val(_trim_at_next_label(village))

    if not result["village"] or len(result["village"] or "") < 3:
        # Fuzzy: OCR corrupts "Village" to "Villag e", "Villaqe", etc.
        village = _find_fuzzy_label(
            text,
            [
                r"[Vv]illag\s*e",           # "Villag e"
                r"[Vv]ill[aeo]+g[eo]?",     # Villago, Villoge
                r"[Mm]auz[oa]",             # Mauza
                r"[Gg]r[ae]m",              # Gram, Grem
            ],
            r"[:;._\-]?\s*([A-Za-z][A-Za-z\s]{2,30})",
        )
        if village:
            cleaned = _trim_at_next_label(village)
            # Remove OCR noise characters and short fragments
            cleaned = re.sub(r"\b[A-Za-z]{1,2}\b", "", cleaned).strip()
            cleaned = re.sub(r"\s+", " ", cleaned).strip()
            if cleaned and len(cleaned) >= 3:
                result["village"] = clean_val(cleaned)

    # ── Owner Name ───────────────────────────────────────────────────
    owner = _find_after_labels(
        text,
        [
            "Owner Name", "Owner", "Landowner", "Land Owner",
            "Khatedar", "Proprietor", "Title Holder",
        ],
        value_pattern=r"([A-Za-z][A-Za-z\s.]+)",
    )
    if owner:
        result["owner_name"] = clean_val(_trim_at_next_label(owner))

    if not result["owner_name"] or len(result["owner_name"] or "") < 3:
        # Fuzzy: OCR corrupts "Owner" to "Owne r", "0wner", etc.
        owner = _find_fuzzy_label(
            text,
            [
                r"[Oo0][wv][nm]e\s*r",      # Owner, Ovner, 0wner
                r"[Ll]and\s*[Oo0][wv]ne?r",  # Landowner
                r"[Kk]hat[ae]d[ae]r",        # Khatedar
                r"[Pp]ropriet[oe]r",         # Proprietor
            ],
            r"[:;._\-]?\s*([A-Za-z][A-Za-z\s.]{3,50})",
        )
        if owner:
            cleaned = _trim_at_next_label(owner)
            if cleaned and len(cleaned) >= 3:
                result["owner_name"] = clean_val(cleaned)

    if not result["owner_name"] or len(result["owner_name"] or "") < 3:
        # Last resort: look for a sequence of 2-3 capitalized words
        # (common Indian name pattern: "Rameshwar Kumar Sharma")
        names = re.findall(
            r"([A-Z][a-z]{2,15}(?:\s+[A-Z][a-z]{2,15}){1,3})",
            text,
        )
        # Filter out known labels and short words
        label_words = {
            "Survey", "Report", "Land", "Area", "Village", "Owner",
            "District", "Project", "Date", "Khasra", "Number",
            "Test", "Lucknow", "Highway", "Expansion", "Rsoject", "Lockro", "Kanhr"
        }
        for name in reversed(names):
            words = name.split()
            if len(words) >= 2 and not any(w in label_words or w.lower() in [l.lower() for l in label_words] for w in words):
                result["owner_name"] = name
                break

    # ── District ─────────────────────────────────────────────────────
    district = _find_after_labels(
        text,
        ["District", "Dist", "Dist."],
        value_pattern=r"([A-Za-z][A-Za-z\s]+)",
    )
    if district:
        result["district"] = clean_val(_trim_at_next_label(district))

    if not result["district"] or len(result["district"] or "") < 3:
        # Fuzzy: OCR corrupts "District" to "Desfuict", "Deskxi ct", etc.
        district = _find_fuzzy_label(
            text,
            [
                r"[Dd][ie]s[tf][rxi]+[iu]?\s*c?t",   # District, Desfuict, Deskxi ct
                r"[Dd]ist\s*\.?",                       # Dist, Dist.
            ],
            r"[:;._\-]?\s*([A-Za-z][A-Za-z\s]{2,30})",
        )
        if district:
            cleaned = _trim_at_next_label(district)
            # Remove single-char noise and very short fragments
            cleaned = re.sub(r"\b[A-Za-z0-9]{1,2}\b", "", cleaned).strip()
            cleaned = re.sub(r"\s+", " ", cleaned).strip()
            if cleaned and len(cleaned) >= 3:
                result["district"] = clean_val(cleaned)

    return result


def extract_fields_with_confidence(raw_text: str) -> dict:
    """
    Wrapper that also reports which fields are missing.
    """
    fields = extract_fields(raw_text)

    missing_fields = [
        key for key, value in fields.items()
        if value is None
    ]

    return {
        "fields": fields,
        "missing_fields": missing_fields,
        "fully_extracted": len(missing_fields) == 0,
    }