"""Test OCR pipeline on the local handwritten document image."""
import os
from app.ocr import extract_text
from app.extractor import extract_fields_with_confidence

# Test 1: Local handwritten image
local_img = "IMG_20260903_015446.jpg"
if os.path.exists(local_img):
    print("=" * 60)
    print("TEST 1: Handwritten document (local)")
    print("=" * 60)
    raw = extract_text(local_img)
    print("RAW OCR TEXT:")
    print(raw)
    print()
    result = extract_fields_with_confidence(raw)
    print("EXTRACTED FIELDS:")
    for k, v in result["fields"].items():
        print(f"  {k}: {v}")
    print(f"  missing: {result['missing_fields']}")
    print(f"  fully_extracted: {result['fully_extracted']}")
    print()

# Test 2: Generated sample doc (typed, clean)
sample_doc = os.path.join("data", "sample_docs", "doc_001_clean_match.png")
if os.path.exists(sample_doc):
    print("=" * 60)
    print("TEST 2: Typed document (generated sample)")
    print("=" * 60)
    raw = extract_text(sample_doc)
    print("RAW OCR TEXT:")
    print(raw)
    print()
    result = extract_fields_with_confidence(raw)
    print("EXTRACTED FIELDS:")
    for k, v in result["fields"].items():
        print(f"  {k}: {v}")
    print(f"  missing: {result['missing_fields']}")
    print(f"  fully_extracted: {result['fully_extracted']}")
    print()

# Test 3: Cloudinary URL (the one from test_ocr.py)
print("=" * 60)
print("TEST 3: Cloudinary URL document")
print("=" * 60)
import urllib.request, tempfile
url = "https://res.cloudinary.com/ydcu4zhw/image/upload/v1788528830/nla_documents/gyttxtek5dlhzcmvermu.jpg"
try:
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg")
    r = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(r, timeout=15) as resp:
        tmp.write(resp.read())
    tmp.close()
    raw = extract_text(tmp.name)
    print("RAW OCR TEXT:")
    print(raw)
    print()
    result = extract_fields_with_confidence(raw)
    print("EXTRACTED FIELDS:")
    for k, v in result["fields"].items():
        print(f"  {k}: {v}")
    print(f"  missing: {result['missing_fields']}")
    print(f"  fully_extracted: {result['fully_extracted']}")
    os.unlink(tmp.name)
except Exception as e:
    print(f"  Cloudinary test skipped/failed: {e}")

print()
print("ALL TESTS COMPLETE")
