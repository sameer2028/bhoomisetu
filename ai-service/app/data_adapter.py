"""
Generates sample "scanned" land record document images for testing
the OCR + mismatch detection pipeline.

Each document simulates a survey report an officer might upload.
Some intentionally MATCH the official parcel record, others
intentionally DIFFER (area mismatch, village misspelling, etc.)
so you have real test cases for Day 3-4 work.

IMPORTANT: Edit the `official_parcel` dict below to match a REAL
parcel row from your database (the one you tested with, survey
number "123/2") so your test documents are grounded in real data.
"""

from PIL import Image, ImageDraw, ImageFont
import os

OUTPUT_DIR = "sample_docs"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# --- EDIT THIS to match a real row from your `parcels` table ---
official_parcel = {
    "survey_number": "123/2",
    "area_acres": "1.25",
    "village": "Rampur",
    "owner_name": "Ram Kumar Singh",
    "district": "Lucknow",
}
# -----------------------------------------------------------------

# Font candidates across Mac, Windows, and Linux, tried in order.
# Using a real TTF at a real size is essential for OCR to work well —
# PIL's load_default() bitmap font is unusable for this purpose.
BOLD_FONT_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",       # Mac
    "/System/Library/Fonts/Helvetica.ttc",                       # Mac
    "C:\\Windows\\Fonts\\arialbd.ttf",                           # Windows
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",     # Linux
]
BODY_FONT_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/Courier New.ttf",       # Mac
    "/System/Library/Fonts/Menlo.ttc",                            # Mac
    "C:\\Windows\\Fonts\\consola.ttf",                           # Windows
    "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",      # Linux
]
SMALL_FONT_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/Arial Italic.ttf",      # Mac
    "/System/Library/Fonts/Helvetica.ttc",                        # Mac
    "C:\\Windows\\Fonts\\ariali.ttf",                            # Windows
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf",  # Linux
]


def _first_working_font(candidates, size):
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            continue
    # Last resort: PIL ships a real (non-bitmap) default in recent
    # versions that accepts a size argument. If that also fails,
    # we're truly out of options, but this should not happen.
    try:
        return ImageFont.load_default(size=size)
    except TypeError:
        return ImageFont.load_default()


def _load_fonts():
    font_title = _first_working_font(BOLD_FONT_CANDIDATES, 30)
    font_body = _first_working_font(BODY_FONT_CANDIDATES, 24)
    font_small = _first_working_font(SMALL_FONT_CANDIDATES, 17)
    return font_title, font_body, font_small


def render_document(filename, title, fields, note=""):
    """Render a simple typed 'survey report' style document as an image."""
    W, H = 1400, 1000  # higher resolution improves OCR accuracy significantly
    img = Image.new("RGB", (W, H), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    font_title, font_body, font_small = _load_fonts()

    # Header
    draw.rectangle([(50, 50), (W - 50, 160)], outline=(0, 0, 0), width=3)
    draw.text((80, 75), "LAND SURVEY REPORT", font=font_title, fill=(0, 0, 0))

    draw.text((80, 190), title, font=font_body, fill=(0, 0, 0))
    draw.line([(80, 245), (W - 80, 245)], fill=(0, 0, 0), width=2)

    y = 300
    for label, value in fields.items():
        draw.text((100, y), f"{label}:", font=font_body, fill=(0, 0, 0))
        draw.text((500, y), str(value), font=font_body, fill=(0, 0, 0))
        y += 80

    if note:
        draw.text((80, H - 90), note, font=font_small, fill=(90, 90, 90))

    path = os.path.join(OUTPUT_DIR, filename)
    img.save(path)
    print(f"Created {path}")


# 1. EXACT MATCH — clean document, everything agrees with official record
render_document(
    "doc_001_clean_match.png",
    "Survey conducted: 12-Jan-2026",
    {
        "Survey No": official_parcel["survey_number"],
        "Area": f"{official_parcel['area_acres']} acres",
        "Village": official_parcel["village"],
        "Owner": official_parcel["owner_name"],
        "District": official_parcel["district"],
    },
    note="Test case: should be marked VERIFIED (no mismatch)",
)

# 2. AREA MISMATCH — document says less area than official record
render_document(
    "doc_002_area_mismatch.png",
    "Survey conducted: 15-Jan-2026",
    {
        "Survey No": official_parcel["survey_number"],
        "Area": "1.05 acres",  # official is 1.25
        "Village": official_parcel["village"],
        "Owner": official_parcel["owner_name"],
        "District": official_parcel["district"],
    },
    note="Test case: AREA mismatch, 0.20 acres difference",
)

# 3. SURVEY NUMBER MISMATCH — typo/transcription error
render_document(
    "doc_003_survey_number_mismatch.png",
    "Survey conducted: 18-Jan-2026",
    {
        "Survey No": "123/3",  # official is 123/2
        "Area": f"{official_parcel['area_acres']} acres",
        "Village": official_parcel["village"],
        "Owner": official_parcel["owner_name"],
        "District": official_parcel["district"],
    },
    note="Test case: SURVEY NUMBER mismatch (exact-match field)",
)

# 4. VILLAGE NAME VARIATION — spelling variant, tests fuzzy matching
render_document(
    "doc_004_village_fuzzy_mismatch.png",
    "Survey conducted: 20-Jan-2026",
    {
        "Survey No": official_parcel["survey_number"],
        "Area": f"{official_parcel['area_acres']} acres",
        "Village": "Rampoor",  # official is "Rampur" - close but not exact
        "Owner": official_parcel["owner_name"],
        "District": official_parcel["district"],
    },
    note="Test case: VILLAGE spelling variant, tests fuzzy match tolerance",
)

# 5. OWNER NAME VARIATION — shortened/different name format
render_document(
    "doc_005_owner_name_mismatch.png",
    "Survey conducted: 22-Jan-2026",
    {
        "Survey No": official_parcel["survey_number"],
        "Area": f"{official_parcel['area_acres']} acres",
        "Village": official_parcel["village"],
        "Owner": "R. K. Singh",  # official is "Ram Kumar Singh"
        "District": official_parcel["district"],
    },
    note="Test case: OWNER NAME variation, tests fuzzy match tolerance",
)

# 6. MULTIPLE MISMATCHES — realistic worst-case document
render_document(
    "doc_006_multiple_mismatches.png",
    "Survey conducted: 25-Jan-2026",
    {
        "Survey No": official_parcel["survey_number"],
        "Area": "0.95 acres",  # official is 1.25
        "Village": "Rampoor",   # official is "Rampur"
        "Owner": official_parcel["owner_name"],
        "District": official_parcel["district"],
    },
    note="Test case: MULTIPLE mismatches (area + village) in one document",
)

print("\nDone. 6 sample documents created in ./sample_docs/")
print("Copy this whole folder into: ai-service/data/sample_docs/")