import uuid
import os
from pathlib import Path
from flask import current_app
from werkzeug.utils import secure_filename
from backend.config import VINTED_UPLOAD_DIR, MAX_UPLOAD_BYTES

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def save_image(file_obj, folder: str) -> str:
    """Save an uploaded image file. Returns the generated filename."""
    content_type = file_obj.content_type or ""
    if content_type not in ALLOWED_TYPES:
        raise ValueError(f"Bestandstype niet toegestaan: {content_type}")

    original = secure_filename(file_obj.filename or "upload")
    ext = Path(original).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        ext = ".jpg"

    file_obj.seek(0, os.SEEK_END)
    size = file_obj.tell()
    file_obj.seek(0)
    if size > MAX_UPLOAD_BYTES:
        raise ValueError("Bestand is te groot (max 8 MB)")

    filename = f"{uuid.uuid4().hex}{ext}"
    dest_dir = VINTED_UPLOAD_DIR / folder
    dest_dir.mkdir(parents=True, exist_ok=True)
    file_obj.save(str(dest_dir / filename))
    return filename


def delete_image(folder: str, filename: str):
    path = VINTED_UPLOAD_DIR / folder / filename
    if path.exists():
        path.unlink()
