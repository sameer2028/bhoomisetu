"""
ocr.py

Extracts raw text from uploaded documents.
- Images (.png, .jpg, .jpeg) -> EasyOCR (deep learning, no system deps)
- Digital PDFs (.pdf)         -> pdfplumber direct text extraction
- Scanned PDFs (.pdf)         -> convert pages to images, then EasyOCR

EasyOCR is a pure-Python library that bundles its own ML models.
Unlike pytesseract it does NOT need Tesseract installed on the OS,
so it works identically on Windows, Linux, Mac, and in Docker/cloud
deployments without any extra setup.

This module only returns RAW TEXT.  Structured field extraction
happens in extractor.py.
"""

from pathlib import Path
from PIL import Image, ImageEnhance, ImageOps
import pdfplumber
import logging
import io

logger = logging.getLogger(__name__)

SUPPORTED_IMAGE_TYPES = {".png", ".jpg", ".jpeg", ".webp", ".tiff", ".bmp"}
SUPPORTED_PDF_TYPES = {".pdf"}

# ── Lazy-loaded EasyOCR reader (heavy model, load once) ────────────
_reader = None


def _get_reader():
    """Lazily initialise the EasyOCR reader (downloads models on first run)."""
    global _reader
    if _reader is None:
        import easyocr
        _reader = easyocr.Reader(
            ["en"],
            gpu=False,          # CPU-only; set True if CUDA is available
            verbose=False,
        )
        logger.info("EasyOCR reader initialised (English, CPU mode)")
    return _reader


# ── Public API ──────────────────────────────────────────────────────


def extract_text(file_path: str | Path) -> str:
    """
    Main entry point.  Detects file type, extracts text, and returns
    a single string of raw text.
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


# ── Image OCR ───────────────────────────────────────────────────────


def _preprocess_image(image: Image.Image) -> Image.Image:
    """
    Light preprocessing to improve OCR accuracy:
    - Auto-orient via EXIF
    - Convert to grayscale
    - Boost contrast
    - Auto-level (stretch histogram)
    """
    try:
        image = ImageOps.exif_transpose(image)
    except Exception:
        pass

    gray = image.convert("L")
    enhanced = ImageEnhance.Contrast(gray).enhance(1.8)
    auto = ImageOps.autocontrast(enhanced, cutoff=1)
    return auto


def _ocr_image(image: Image.Image) -> str:
    """Run EasyOCR on a PIL Image and return joined text."""
    reader = _get_reader()

    # EasyOCR accepts numpy arrays, file paths, or bytes
    # Convert PIL -> bytes so we don't need numpy as a dependency
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    buf.seek(0)

    results = reader.readtext(buf.getvalue(), detail=0, paragraph=True)
    return "\n".join(results).strip()


def _extract_from_image(file_path: Path) -> str:
    """
    Run EasyOCR on an image file with preprocessing.
    Performs two passes (original + preprocessed) and picks the
    longer / richer result.
    """
    image = Image.open(file_path)

    texts = []

    # Pass 1: original image (good for clean printed docs)
    try:
        t1 = _ocr_image(image)
        if t1:
            texts.append(t1)
    except Exception as exc:
        logger.warning("OCR pass 1 failed: %s", exc)

    # Pass 2: preprocessed (grayscale + contrast boost)
    try:
        processed = _preprocess_image(image)
        t2 = _ocr_image(processed)
        if t2:
            texts.append(t2)
    except Exception as exc:
        logger.warning("OCR pass 2 failed: %s", exc)

    if not texts:
        logger.warning("No text extracted from image: %s", file_path.name)
        return ""

    # Return the longest result (most content extracted)
    return max(texts, key=len)


# ── PDF text extraction ─────────────────────────────────────────────


def _extract_from_pdf(file_path: Path) -> str:
    """
    Extract text from a PDF.
    1. Try direct text extraction (for digital / text-layer PDFs).
    2. If the PDF yields little or no text (scanned document),
       fall back to converting each page to an image and running OCR.
    """
    text_parts = []

    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
    except Exception as exc:
        logger.warning("pdfplumber extraction failed: %s", exc)

    direct_text = "\n".join(text_parts).strip()

    # If we got meaningful text, use it
    if len(direct_text) > 30:
        return direct_text

    # Otherwise treat it as a scanned PDF -> OCR each page
    logger.info("PDF has little direct text; falling back to OCR")
    return _ocr_pdf_pages(file_path)


def _ocr_pdf_pages(file_path: Path) -> str:
    """Convert each PDF page to an image and run OCR."""
    ocr_parts = []

    try:
        with pdfplumber.open(file_path) as pdf:
            for i, page in enumerate(pdf.pages):
                img = page.to_image(resolution=300).original
                processed = _preprocess_image(img)
                page_text = _ocr_image(processed)
                if page_text:
                    ocr_parts.append(page_text)
                    logger.info("OCR page %d: extracted %d chars", i + 1, len(page_text))
    except Exception as exc:
        logger.warning("PDF page OCR failed: %s", exc)

    return "\n".join(ocr_parts).strip()
