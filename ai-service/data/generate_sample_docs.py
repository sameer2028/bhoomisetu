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

def render_document(filename, title, fields, note=""):
    """Render a simple typed 'survey report' style document as an image."""
    W, H = 900, 650
    img = Image.new("RGB", (W, H), color=(250, 248, 240))
    draw = ImageDraw.Draw(img)

    try:
        font_title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 28)
        font_body = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", 22)
        font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf", 16)
    except Exception:
        font_title = font_body = font_small = ImageFont.load_default()

    # Header
    draw.rectangle([(30, 30), (W - 30, 100)], outline=(80, 80, 80), width=2)
    draw.text((50, 45), "LAND SURVEY REPORT", font=font_title, fill=(20, 20, 20))

    draw.text((50, 120), title, font=font_body, fill=(40, 40, 40))
    draw.line([(50, 155), (W - 50, 155)], fill=(150, 150, 150), width=1)

    y = 190
    for label, value in fields.items():
        draw.text((60, y), f"{label}:", font=font_body, fill=(30, 30, 30))
        draw.text((320, y), str(value), font=font_body, fill=(10, 10, 10))
        y += 50

    if note:
        draw.text((50, H - 60), note, font=font_small, fill=(120, 120, 120))

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
