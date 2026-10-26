import base64
import json
import logging
from typing import Optional, List
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, Header

from app.models import (
    CommunityNoteSummary, CommunityNoteDetail,
    ExploreNotesResponse, FolderResponse
)
from app.config import config
from app.auth import get_current_user_optional, get_current_user
from app.database import (
    list_public_explore_notes, get_community_note_by_id,
    create_community_note, list_student_notes, list_folders,
    increment_note_metric
)

logger = logging.getLogger("knowlix.explore_notes")
router = APIRouter(prefix="/api/explore", tags=["Explore Notes & Community"])

@router.get("/notes", response_model=ExploreNotesResponse)
async def get_explore_notes(
    category: Optional[str] = None,
    folder_id: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "newest",
    page: int = 1,
    limit: int = 20
):
    """
    Public explore notes endpoint for approved, published study materials.
    Accessible to logged-out visitors and authenticated students.
    """
    data = list_public_explore_notes(
        category=category,
        folder_id=folder_id,
        search=search,
        sort_by=sort_by,
        page=page,
        limit=limit
    )
    raw_folders = list_folders()
    folders = [FolderResponse(**f) for f in raw_folders]

    notes = [CommunityNoteSummary(**n) for n in data["notes"]]

    return ExploreNotesResponse(
        notes=notes,
        total_count=data["total_count"],
        page=data["page"],
        limit=data["limit"],
        categories=data["categories"],
        folders=folders
    )

@router.get("/folders", response_model=List[FolderResponse])
async def get_folders():
    """Retrieve all public study note folders with published resource counts."""
    raw_folders = list_folders()
    return [FolderResponse(**f) for f in raw_folders]

@router.get("/categories", response_model=List[str])
async def get_categories():
    """Retrieve distinct subject categories with published study materials."""
    data = list_public_explore_notes(limit=1)
    return data.get("categories", [])

@router.get("/notes/{note_id}", response_model=CommunityNoteDetail)
async def get_note_detail(
    note_id: str,
    user: Optional[dict] = Depends(get_current_user_optional)
):
    """
    Retrieve details for a single note.
    - Visitors and students can view any 'published' note.
    - Students can view their own note in any state (e.g. pending, rejected).
    - Administrators can view any note in any state.
    """
    note = get_community_note_by_id(note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Study note not found.")

    is_author = user and user.get("id") == note.get("author_id")
    is_admin = user and user.get("role") == "admin"
    is_published = note.get("status") == "published"

    if not is_published and not is_author and not is_admin:
        raise HTTPException(
            status_code=403,
            detail="This note is currently pending review by an administrator and is not yet publicly visible."
        )

    # Increment view metric for published notes
    if is_published:
        increment_note_metric(note_id, "views")

    return CommunityNoteDetail(**note)

@router.post("/notes/contribute", response_model=CommunityNoteDetail)
async def contribute_note(
    file: UploadFile = File(...),
    title: str = Form(...),
    subject: str = Form(...),
    category: str = Form(...),
    description: Optional[str] = Form(""),
    tags: Optional[str] = Form("[]"),
    folder_id: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Allows authenticated students and administrators to contribute educational notes.
    - If user is admin: status is immediately set to 'published'.
    - If user is student: status is set to 'pending' awaiting moderation review.
    - Validates file type, size, and header signature.
    """
    if not title or not title.strip():
        raise HTTPException(status_code=400, detail="Note title is required.")
    if not subject or not subject.strip():
        raise HTTPException(status_code=400, detail="Subject is required.")
    if not category or not category.strip():
        raise HTTPException(status_code=400, detail="Category is required.")

    filename = file.filename or "notes.pdf"
    lower_filename = filename.lower()
    content_type = file.content_type or ""
    is_pdf = lower_filename.endswith(".pdf") or content_type == "application/pdf"
    is_image = (
        content_type in config.ALLOWED_IMAGE_TYPES
        or lower_filename.endswith((".png", ".jpg", ".jpeg", ".webp"))
    )

    if not is_pdf and not is_image:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{content_type}'. Please upload a PDF document or a JPG, PNG, or WEBP image."
        )

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    max_bytes = (config.MAX_DOCUMENT_SIZE_MB if is_pdf else config.MAX_FILE_SIZE_MB) * 1024 * 1024
    if len(file_bytes) > max_bytes:
        max_mb = config.MAX_DOCUMENT_SIZE_MB if is_pdf else config.MAX_FILE_SIZE_MB
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum allowable size of {max_mb}MB."
        )

    # Validate header signature
    if is_pdf and not file_bytes.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=400,
            detail="Invalid PDF document: Header signature does not match PDF specification (%PDF-)."
        )

    # Parse tags
    try:
        tags_list = json.loads(tags) if tags else []
        if not isinstance(tags_list, list):
            tags_list = [str(tags)]
    except Exception:
        tags_list = [t.strip() for t in tags.split(",") if t.strip()]

    # Generate preview and base64 storage
    b64_file = base64.b64encode(file_bytes).decode("utf-8")
    preview_image = None
    extracted_summary = description.strip() if description else f"Study resource on {subject}: {title}."

    if is_image:
        mime = content_type if content_type in config.ALLOWED_IMAGE_TYPES else "image/jpeg"
        preview_image = f"data:{mime};base64,{b64_file}"
    elif is_pdf:
        try:
            from app.services.document.pdf_extractor import pdf_extractor
            pdf_data = await pdf_extractor.process_pdf(file_bytes=file_bytes, filename=filename, page_range="1")
            preview_image = pdf_data.get("preview_image")
            if pdf_data.get("extracted_text"):
                extracted_summary = pdf_data["extracted_text"][:300].strip() + "..."
        except Exception as e:
            logger.warning(f"PDF preview rendering during note contribution failed: {e}")

    is_admin = current_user.get("role") == "admin"

    note = create_community_note(
        title=title,
        subject=subject,
        category=category,
        file_name=filename,
        file_type="application/pdf" if is_pdf else (content_type or "image/jpeg"),
        file_size=len(file_bytes),
        author_id=current_user["id"],
        author_name=current_user["name"],
        description=description,
        tags=tags_list,
        file_data=b64_file,
        preview_image=preview_image,
        extracted_summary=extracted_summary,
        folder_id=folder_id if folder_id and folder_id.strip() else None,
        is_admin=is_admin
    )

    return CommunityNoteDetail(**note)

@router.get("/my-notes", response_model=List[CommunityNoteSummary])
async def get_my_submitted_notes(current_user: dict = Depends(get_current_user)):
    """
    Retrieve all notes contributed by the authenticated student along with their review status.
    """
    raw_notes = list_student_notes(current_user["id"])
    return [CommunityNoteSummary(**n) for n in raw_notes]

@router.post("/notes/{note_id}/download")
async def record_download(
    note_id: str,
    user: Optional[dict] = Depends(get_current_user_optional)
):
    """
    Increments download count and returns file payload for authorized users.
    """
    note = get_community_note_by_id(note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found.")

    is_author = user and user.get("id") == note.get("author_id")
    is_admin = user and user.get("role") == "admin"
    is_published = note.get("status") == "published"

    if not is_published and not is_author and not is_admin:
        raise HTTPException(status_code=403, detail="Unpublished notes cannot be downloaded.")

    increment_note_metric(note_id, "downloads")
    return {
        "status": "success",
        "file_name": note["file_name"],
        "file_type": note["file_type"],
        "file_size": note["file_size"],
        "file_data": note.get("file_data")
    }
