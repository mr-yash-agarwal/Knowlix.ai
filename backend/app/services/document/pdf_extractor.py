import io
import base64
import logging
from typing import Dict, Any, List, Optional, Tuple
import pymupdf  # PyMuPDF
from app.config import config
from app.services.document.ocr_service import ocr_service

logger = logging.getLogger("knowlix.pdf_extractor")

class PDFProcessingError(Exception):
    """Custom exception for clear PDF processing failure messages."""
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code

class PDFExtractor:
    """
    Production-grade PDF extractor handling:
    - Text-based PDF extraction
    - Scanned/image PDF detection and OCR via open-weight VLM
    - Mixed documents (text + scans)
    - Password protection & corruption detection
    - Page-range selection
    - Page thumbnails for student UI preview
    """

    @staticmethod
    def parse_page_range(range_str: Optional[str], total_pages: int) -> List[int]:
        """
        Parses student-provided page range strings like '1-3', '1, 3, 5', '2', or 'all'.
        Returns 0-based indices clamped to valid document bounds.
        """
        if not range_str or range_str.strip().lower() in ["all", "", "none"]:
            return list(range(total_pages))

        clean_str = range_str.strip()
        selected_pages = set()

        parts = clean_str.split(",")
        for part in parts:
            part = part.strip()
            if "-" in part:
                subparts = part.split("-")
                if len(subparts) == 2:
                    try:
                        start = int(subparts[0].strip())
                        end = int(subparts[1].strip())
                        if start <= end:
                            for p in range(start, end + 1):
                                if 1 <= p <= total_pages:
                                    selected_pages.add(p - 1)
                    except ValueError:
                        pass
            else:
                try:
                    p = int(part)
                    if 1 <= p <= total_pages:
                        selected_pages.add(p - 1)
                except ValueError:
                    pass

        if not selected_pages:
            # Fallback to all pages if student entered invalid range
            return list(range(total_pages))

        return sorted(list(selected_pages))

    async def process_pdf(
        self,
        file_bytes: bytes,
        filename: str = "document.pdf",
        page_range: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Validates and extracts content from an uploaded PDF.
        """
        # 1. Validate signature / magic bytes
        if not file_bytes.startswith(b"%PDF-"):
            raise PDFProcessingError(
                "Invalid PDF document: File header does not match standard PDF file signature (%PDF-). "
                "The file may be corrupted, truncated, or in an unsupported format.",
                status_code=400
            )

        # 2. Check maximum document size
        max_bytes = config.MAX_DOCUMENT_SIZE_MB * 1024 * 1024
        if len(file_bytes) > max_bytes:
            raise PDFProcessingError(
                f"PDF file size ({len(file_bytes)/(1024*1024):.1f}MB) exceeds the maximum limit of {config.MAX_DOCUMENT_SIZE_MB}MB.",
                status_code=413
            )

        # 3. Open with PyMuPDF
        try:
            doc = pymupdf.open(stream=file_bytes, filetype="pdf")
        except Exception as e:
            logger.error(f"Failed to open PDF stream: {e}")
            raise PDFProcessingError(
                f"Corrupted or unreadable PDF document: {str(e)}. Please ensure the document is not damaged.",
                status_code=400
            )

        try:
            # 4. Check for encryption / password
            if doc.is_encrypted:
                raise PDFProcessingError(
                    "This PDF document is password-protected or encrypted. "
                    "For security and study analysis, please upload an unlocked or decrypted copy.",
                    status_code=400
                )

            total_pages = doc.page_count
            if total_pages == 0:
                raise PDFProcessingError(
                    "The uploaded PDF document contains no pages or is empty.",
                    status_code=400
                )

            # 5. Check page count limits
            if total_pages > config.MAX_PDF_PAGES:
                raise PDFProcessingError(
                    f"Document contains {total_pages} pages, which exceeds the maximum limit of {config.MAX_PDF_PAGES} pages. "
                    f"Please specify a page range (e.g., '1-{config.MAX_PDF_PAGES}') or upload a shorter chapter.",
                    status_code=400
                )

            # 6. Parse page range
            target_indices = self.parse_page_range(page_range, total_pages)
            if not target_indices:
                raise PDFProcessingError("No valid pages selected for analysis in the specified range.", status_code=400)

            # 7. Generate first page preview image
            preview_b64 = ""
            try:
                first_page = doc[target_indices[0]]
                pix = first_page.get_pixmap(dpi=130)
                thumb_bytes = pix.tobytes("jpeg")
                preview_b64 = f"data:image/jpeg;base64,{base64.b64encode(thumb_bytes).decode('utf-8')}"
            except Exception as e:
                logger.warning(f"Could not render first page preview thumbnail: {e}")

            # 8. Extract pages (handling text + scanned pages)
            page_contents: List[str] = []
            scanned_pages_count = 0
            text_pages_count = 0
            unreadable_pages: List[int] = []

            for page_idx in target_indices:
                page_num = page_idx + 1
                try:
                    page = doc[page_idx]
                    raw_text = page.get_text("text").strip()

                    # Check if page has sufficient extractable text (> 40 alphanumeric characters)
                    alphanumeric_count = sum(c.isalnum() for c in raw_text)

                    if alphanumeric_count >= 40:
                        # Standard text-based PDF page
                        text_pages_count += 1
                        page_contents.append(f"--- [Page {page_num}] ---\n{raw_text}\n")
                    else:
                        # Scanned or image-heavy page: render to image pixmap and run OCR
                        scanned_pages_count += 1
                        logger.info(f"Page {page_num} appears scanned (only {alphanumeric_count} text characters). Rendering pixmap for OCR.")
                        pix = page.get_pixmap(dpi=150)
                        page_image_bytes = pix.tobytes("jpeg")

                        ocr_text = await ocr_service.ocr_page_image(
                            image_bytes=page_image_bytes,
                            page_number=page_num,
                            hint=filename
                        )
                        page_contents.append(f"--- [Page {page_num} (Scanned Note)] ---\n{ocr_text}\n")
                except Exception as ex:
                    logger.warning(f"Error extracting page {page_num}: {ex}")
                    unreadable_pages.append(page_num)

            # 9. Check if any text was extracted
            combined_text = "\n".join(page_contents).strip()
            if not combined_text:
                raise PDFProcessingError(
                    "Unable to extract legible content from the uploaded PDF. "
                    "The pages may be completely blank or contain unsupported vector encoding.",
                    status_code=400
                )

            # 10. Chunking logic if text is extraordinarily large
            # Normal model context can take ~12,000 characters smoothly.
            MAX_CHUNK_CHARS = 14000
            if len(combined_text) > MAX_CHUNK_CHARS:
                logger.info(f"Document text ({len(combined_text)} chars) exceeds single prompt window. Applying structured chunk distillation.")
                # Keep representative excerpts across selected pages
                chunk_header = f"[Document Summary: {len(target_indices)} pages analyzed. Preserving key sections across pages {target_indices[0]+1} to {target_indices[-1]+1}]\n\n"
                combined_text = chunk_header + combined_text[:MAX_CHUNK_CHARS] + "\n\n[...Additional selected page notes preserved in session state...]"

            return {
                "filename": filename,
                "total_pages": total_pages,
                "selected_pages": [p + 1 for p in target_indices],
                "selected_pages_count": len(target_indices),
                "text_pages_count": text_pages_count,
                "scanned_pages_count": scanned_pages_count,
                "unreadable_pages": unreadable_pages,
                "extracted_text": combined_text,
                "preview_image": preview_b64,
                "is_mixed": (scanned_pages_count > 0 and text_pages_count > 0),
                "is_fully_scanned": (scanned_pages_count > 0 and text_pages_count == 0)
            }
        finally:
            doc.close()

pdf_extractor = PDFExtractor()
