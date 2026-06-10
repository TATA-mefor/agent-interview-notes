#!/usr/bin/env python3
"""
OCR for scanned PDFs and images.
Usage: python ocr_pdf.py <pdf_path> [max_pages]

Strategy:
  1. PaddleOCR (Baidu) — best for Chinese, GPU-friendly
  2. Tesseract — widely available, needs chi_sim language pack
  3. EasyOCR — simple API, no separate install

Install:
  pip install paddlepaddle paddleocr   # PaddleOCR (recommended for Chinese)
  or
  pip install pytesseract              # + apt install tesseract-ocr-chi-sim
  or
  pip install easyocr                  # simplest, auto-downloads models

Outputs extracted text to stdout.
"""
import sys
import os
import tempfile


def ocr_with_paddleocr(filepath: str, max_pages: int = 50) -> str:
    """OCR using PaddleOCR — best Chinese accuracy."""
    from paddleocr import PaddleOCR

    ocr = PaddleOCR(lang='ch', use_angle_cls=True, show_log=False)
    result = ocr.predict(filepath)

    lines = []
    for page_result in result:
        if isinstance(page_result, dict):
            # Newer PaddleOCR returns dict
            rec_texts = page_result.get('rec_texts', [])
            for text in rec_texts:
                if text and text.strip():
                    lines.append(text.strip())
        elif isinstance(page_result, list):
            # Older PaddleOCR returns list of [bbox, (text, confidence)]
            for item in page_result:
                if len(item) >= 2:
                    text = item[1][0] if isinstance(item[1], (list, tuple)) else str(item[1])
                    if text and text.strip():
                        lines.append(text.strip())

    return '\n'.join(lines)


def ocr_with_tesseract(filepath: str, max_pages: int = 50) -> str:
    """OCR using Tesseract — widely available, needs chi_sim."""
    try:
        import pytesseract
    except ImportError:
        raise RuntimeError("pytesseract not installed. Run: pip install pytesseract")

    from PIL import Image
    import pypdf  # noqa

    # For PDFs, convert pages to images first
    if filepath.lower().endswith('.pdf'):
        try:
            from pdf2image import convert_from_path
        except ImportError:
            raise RuntimeError("pdf2image not installed. Run: pip install pdf2image")

        images = convert_from_path(filepath, first_page=1, last_page=max_pages)
        texts = []
        for i, img in enumerate(images):
            text = pytesseract.image_to_string(img, lang='chi_sim+eng')
            if text.strip():
                texts.append(text.strip())
        return '\n\n'.join(texts)
    else:
        # Single image
        img = Image.open(filepath)
        return pytesseract.image_to_string(img, lang='chi_sim+eng')


def ocr_with_easyocr(filepath: str, max_pages: int = 50) -> str:
    """OCR using EasyOCR — simple API, auto-downloads models, good Chinese."""
    import easyocr

    reader = easyocr.Reader(['ch_sim', 'en'], gpu=True)

    if filepath.lower().endswith('.pdf'):
        try:
            from pdf2image import convert_from_path
        except ImportError:
            raise RuntimeError("pdf2image not installed. Run: pip install pdf2image")

        images = convert_from_path(filepath, first_page=1, last_page=max_pages)
        all_texts = []
        for img in images:
            # Save to temp file for EasyOCR
            with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
                img.save(f.name)
                tmp_path = f.name
            try:
                results = reader.readtext(tmp_path)
                texts = [r[1] for r in results if r[1] and r[1].strip()]
                if texts:
                    all_texts.append('\n'.join(texts))
            finally:
                os.unlink(tmp_path)
        return '\n\n'.join(all_texts)
    else:
        results = reader.readtext(filepath)
        return '\n'.join([r[1] for r in results if r[1] and r[1].strip()])


def is_text_empty(text: str) -> bool:
    """Check if extracted text is effectively empty (scanned PDF)."""
    # Remove whitespace and common noise
    cleaned = text.replace('\n', '').replace(' ', '').strip()
    # Less than 10 meaningful characters = probably scanned
    return len(cleaned) < 10


def ocr_pdf(filepath: str, max_pages: int = 50) -> str:
    """
    Try OCR engines in priority order.
    Each engine is tried only if the previous one is not installed or fails.
    """
    engines = [
        ('paddleocr', ocr_with_paddleocr),
        ('easyocr', ocr_with_easyocr),
        ('tesseract', ocr_with_tesseract),
    ]

    errors = []
    for name, fn in engines:
        try:
            print(f"OCR_ENGINE: trying {name}...", file=sys.stderr)
            text = fn(filepath, max_pages)
            if text and not is_text_empty(text):
                print(f"OCR_ENGINE: {name} succeeded ({len(text)} chars)", file=sys.stderr)
                return text
            else:
                errors.append(f"{name}: returned empty text")
        except ImportError as e:
            errors.append(f"{name}: not installed ({e})")
        except Exception as e:
            errors.append(f"{name}: error - {e}")

    # All failed
    print(f"OCR_FAILED: {'; '.join(errors)}", file=sys.stderr)
    print(
        "安装任意一个即可:\n"
        "  pip install paddlepaddle paddleocr   (推荐，中文最好)\n"
        "  pip install easyocr                  (最简单)\n"
        "  pip install pytesseract pdf2image    (需单独装 Tesseract)",
        file=sys.stderr
    )
    sys.exit(1)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python ocr_pdf.py <pdf_or_image_path> [max_pages]", file=sys.stderr)
        sys.exit(1)

    filepath = sys.argv[1]
    max_pages = int(sys.argv[2]) if len(sys.argv) > 2 else 50

    if not os.path.exists(filepath):
        print(f"FILE_NOT_FOUND: {filepath}", file=sys.stderr)
        sys.exit(2)

    text = ocr_pdf(filepath, max_pages)
    sys.stdout.write(text)
