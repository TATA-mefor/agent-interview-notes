#!/usr/bin/env python3
"""
PDF text extractor using pypdf.
Usage: python extract_pdf_text.py <pdf_path> [max_pages]

Outputs extracted text to stdout.
Requires: pip install pypdf
"""
import sys
import os

def extract_text(filepath: str, max_pages: int = 100) -> str:
    try:
        from pypdf import PdfReader
    except ImportError:
        print("PYPDF_NOT_INSTALLED", file=sys.stderr)
        sys.exit(1)

    if not os.path.exists(filepath):
        print(f"PDF_FILE_NOT_FOUND: {filepath}", file=sys.stderr)
        sys.exit(2)

    try:
        reader = PdfReader(filepath)
    except Exception as e:
        print(f"PDF_OPEN_ERROR: {e}", file=sys.stderr)
        sys.exit(3)

    total_pages = len(reader.pages)
    limit = min(total_pages, max_pages)
    pages_text = []

    for i in range(limit):
        try:
            page = reader.pages[i]
            text = page.extract_text()
            if text and text.strip():
                # Clean up: fix broken lines (common in PDF extraction)
                lines = text.strip().split('\n')
                cleaned = []
                for line in lines:
                    line = line.strip()
                    if not line:
                        cleaned.append('')
                        continue
                    # Remove page numbers
                    if line.isdigit() and len(line) <= 3:
                        continue
                    cleaned.append(line)
                pages_text.append('\n'.join(cleaned))
        except Exception as e:
            # Skip pages that can't be extracted (images, etc.)
            print(f"PAGE_{i+1}_WARN: {e}", file=sys.stderr)
            continue

    text = '\n\n'.join(pages_text)

    if not text.strip():
        print("PDF_TEXT_EMPTY: No extractable text found", file=sys.stderr)
        sys.exit(4)

    if total_pages > limit:
        text += f'\n\n[注意: PDF 共 {total_pages} 页，仅提取了前 {limit} 页。]'

    return text


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python extract_pdf_text.py <pdf_path> [max_pages]", file=sys.stderr)
        sys.exit(1)

    filepath = sys.argv[1]
    max_pages = int(sys.argv[2]) if len(sys.argv) > 2 else 100

    text = extract_text(filepath, max_pages)
    sys.stdout.write(text)
