import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Query

from app.models import (
    CommunityNoteDetail, NoteModerateRequest, AssignFolderRequest,
    FolderCreateRequest, FolderUpdateRequest, FolderResponse
)
from app.auth import require_admin
from app.database import (
    list_admin_notes, get_community_note_by_id, moderate_community_note,
    assign_note_folder, delete_community_note,
    create_folder, update_folder, delete_folder, get_folder, list_folders
)

logger = logging.getLogger("knowlix.admin_notes")
router = APIRouter(prefix="/api/admin", tags=["Administrator Moderation & Management"])

@router.get("/notes", response_model=List[CommunityNoteDetail])
async def get_admin_notes_queue(
    status: Optional[str] = Query("all", description="Filter by status: pending, published, rejected, all"),
    admin_user: dict = Depends(require_admin)
):
    """
    Moderation queue: Retrieve study notes submitted by students and admins.
    Requires administrator role.
    """
    notes = list_admin_notes(status_filter=status)
    return [CommunityNoteDetail(**n) for n in notes]

@router.post("/notes/{note_id}/moderate", response_model=CommunityNoteDetail)
async def moderate_note(
    note_id: str,
    payload: NoteModerateRequest,
    admin_user: dict = Depends(require_admin)
):
    """
    Approve, publish, reject, or unpublish a study note.
    Requires administrator role.
    """
    existing = get_community_note_by_id(note_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Study note not found.")

    if payload.action not in ["approve", "reject", "publish", "unpublish"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid moderation action '{payload.action}'. Allowed: approve, reject, publish, unpublish."
        )

    updated = moderate_community_note(
        note_id=note_id,
        action=payload.action,
        reviewed_by=admin_user["id"],
        rejection_reason=payload.rejection_reason,
        folder_id=payload.folder_id
    )
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to update note moderation status.")

    return CommunityNoteDetail(**updated)

@router.post("/notes/{note_id}/assign-folder", response_model=CommunityNoteDetail)
async def assign_folder_endpoint(
    note_id: str,
    payload: AssignFolderRequest,
    admin_user: dict = Depends(require_admin)
):
    """
    Assign a study note to an educational category folder.
    Requires administrator role.
    """
    existing = get_community_note_by_id(note_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Study note not found.")

    if payload.folder_id:
        folder = get_folder(payload.folder_id)
        if not folder:
            raise HTTPException(status_code=404, detail="Target folder does not exist.")

    assign_note_folder(note_id, payload.folder_id)
    updated = get_community_note_by_id(note_id)
    return CommunityNoteDetail(**updated)

@router.delete("/notes/{note_id}")
async def delete_note_endpoint(
    note_id: str,
    admin_user: dict = Depends(require_admin)
):
    """
    Permanently delete a study note.
    Requires administrator role.
    """
    existing = get_community_note_by_id(note_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Study note not found.")

    delete_community_note(note_id)
    return {"status": "success", "message": f"Note '{existing['title']}' deleted successfully."}

# -------------------------------------------------------------
# Folder Management Endpoints
# -------------------------------------------------------------
@router.post("/folders", response_model=FolderResponse)
async def create_folder_endpoint(
    payload: FolderCreateRequest,
    admin_user: dict = Depends(require_admin)
):
    """
    Create a new educational folder for organizing notes.
    Requires administrator role.
    """
    if not payload.name or not payload.name.strip():
        raise HTTPException(status_code=400, detail="Folder name is required.")

    folder = create_folder(
        name=payload.name,
        description=payload.description or "",
        color=payload.color or "indigo",
        created_by=admin_user["id"]
    )
    return FolderResponse(**folder)

@router.put("/folders/{folder_id}", response_model=FolderResponse)
async def update_folder_endpoint(
    folder_id: str,
    payload: FolderUpdateRequest,
    admin_user: dict = Depends(require_admin)
):
    """
    Update folder title, description, or color.
    Requires administrator role.
    """
    existing = get_folder(folder_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Folder not found.")

    updated = update_folder(
        folder_id=folder_id,
        name=payload.name,
        description=payload.description,
        color=payload.color
    )
    return FolderResponse(**updated)

@router.delete("/folders/{folder_id}")
async def delete_folder_endpoint(
    folder_id: str,
    force: bool = Query(False, description="Set true to force delete even if folder has notes"),
    admin_user: dict = Depends(require_admin)
):
    """
    Delete a folder. If the folder contains notes, deletion is blocked unless force=true
    (which safely unlinks the notes without deleting them).
    Requires administrator role.
    """
    existing = get_folder(folder_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Folder not found.")

    success = delete_folder(folder_id, force=force)
    if not success:
        raise HTTPException(
            status_code=409,
            detail=f"Folder '{existing['name']}' contains {existing.get('notes_count', 0)} note(s). Reassign them first or specify force=true."
        )

    return {"status": "success", "message": f"Folder '{existing['name']}' deleted successfully."}
