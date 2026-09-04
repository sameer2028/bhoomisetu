import urllib.request, tempfile, os
from app.ocr import extract_text
from app.extractor import extract_fields_with_confidence

url = "https://res.cloudinary.com/ydcu4zhw/image/upload/v1788528830/nla_documents/gyttxtek5dlhzcmvermu.jpg"
tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg")
r = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(r) as resp:
    tmp.write(resp.read())
tmp.close()

print("=== RAW OCR TEXT ===")
raw = extract_text(tmp.name)
print(raw)
print()
print("=== EXTRACTED FIELDS ===")
result = extract_fields_with_confidence(raw)
for k, v in result["fields"].items():
    print(f"  {k}: {v}")
print(f"  missing: {result['missing_fields']}")
print(f"  fully_extracted: {result['fully_extracted']}")
os.unlink(tmp.name)
