"""
ocr.py

Extracts raw text from uploaded documents.
- Images (.png, .jpg, .jpeg) -> Tesseract OCR (pytesseract)
- Digital PDFs (.pdf) -> direct text extraction (pdfplumber), since
  OCR is unnecessary and less accurate for text that's already digital

This module only returns RAW TEXT. Turning that raw text into
structured fields (survey number, area, etc.) happens in extractor.py.
"""

from pathlib import Path
import pytesseract
from PIL import Image
import pdfplumber


SUPPORTED_IMAGE_TYPES = {".png", ".jpg", ".jpeg"}
SUPPORTED_PDF_TYPES = {".pdf"}


def extract_text(file_path: str | Path) -> str:
    """
    Main entry point. Detects file type and routes to the correct
    extraction method. Returns raw extracted text as a single string.
    """
    file_path = Path(file_path)

    if not file_path.exists():
        raise FileNotFoundError(f"Document not found: {file_path}")

    suffix = file_path.suffix.lower()

    if suffix in SUPPORTED_IMAGE_TYPES:
        return _extract_from_image(file_path)
    elif suffix in SUPPORTED_PDF_TYPES:
        return _extract_from_pdf(file_path)
    else:
        raise ValueError(f"Unsupported file type: {suffix}")


def _extract_from_image(file_path: Path) -> str:
    """Run OCR on a scanned image using Tesseract."""
    image = Image.open(file_path)
    text = pytesseract.image_to_string(image, config="--psm 6")
    return text.strip()


def _extract_from_pdf(file_path: Path) -> str:
    """
    Extract text from a digital PDF directly (no OCR needed).
    If the PDF has no extractable text (i.e. it's actually a scanned
    image saved as PDF), this will return an empty string — that
    case would need image-conversion + OCR, which is out of scope
    for the MVP.
    """
    text_parts = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    return "\n".join(text_parts).strip()
