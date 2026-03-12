import os
import re
import uuid
from pathlib import Path
from typing import Optional

import aiofiles
from fastapi import BackgroundTasks, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from converters import (
    convert_archive,
    convert_audio,
    convert_document,
    convert_ebook,
    convert_image,
    convert_spreadsheet,
    convert_video,
)
from detection import FileDetector
from jobs.conversion_worker import JobStatus, create_job, get_job, list_jobs, run_conversion, update_job_output_path

# ---------------------------------------------------------------------------
# Directory setup
# ---------------------------------------------------------------------------
UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", "/tmp/anyfile/uploads"))
CONVERTED_DIR = Path(os.environ.get("CONVERTED_DIR", "/tmp/anyfile/converted"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
CONVERTED_DIR.mkdir(parents=True, exist_ok=True)

MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024  # 2 GB

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = FastAPI(title="AnyFile API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

detector = FileDetector()

# In-memory file registry: {file_id: metadata_dict}
_files: dict[str, dict] = {}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _safe_filename(name: str) -> str:
    """Return a sanitised version of the filename (no path components)."""
    name = Path(name).name  # strip any directory parts
    # Keep only safe characters
    name = re.sub(r"[^\w.\- ]", "_", name)
    return name or "upload"


def _converter_for_category(category: str):
    mapping = {
        "image": convert_image,
        "video": convert_video,
        "audio": convert_audio,
        "document": convert_document,
        "spreadsheet": convert_spreadsheet,
        "archive": convert_archive,
        "ebook": convert_ebook,
    }
    return mapping.get(category)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a file and detect its type."""
    original_name = _safe_filename(file.filename or "upload")
    suffix = Path(original_name).suffix  # e.g. ".png"
    file_id = str(uuid.uuid4())

    dest_path = UPLOAD_DIR / f"{file_id}{suffix}"

    # Stream to disk
    size = 0
    async with aiofiles.open(dest_path, "wb") as out:
        while chunk := await file.read(1024 * 1024):  # 1 MB chunks
            size += len(chunk)
            if size > MAX_UPLOAD_BYTES:
                await out.close()
                dest_path.unlink(missing_ok=True)
                raise HTTPException(status_code=413, detail="File too large (max 2 GB).")
            await out.write(chunk)

    # Detect metadata
    try:
        meta = detector.detect(str(dest_path))
    except Exception as exc:
        dest_path.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail=f"Could not analyse file: {exc}")

    entry = {
        "file_id": file_id,
        "filename": original_name,
        "stored_path": str(dest_path),
        "size": meta["size"],
        "mime_type": meta["mime_type"],
        "category": meta["category"],
        "format": meta["format"],
    }
    _files[file_id] = entry

    return {k: v for k, v in entry.items() if k != "stored_path"}


@app.get("/files")
def list_files():
    """Return all uploaded files."""
    return [
        {k: v for k, v in entry.items() if k != "stored_path"}
        for entry in _files.values()
    ]


@app.get("/files/{file_id}")
def get_file(file_id: str):
    """Return metadata for a specific uploaded file."""
    entry = _files.get(file_id)
    if not entry:
        raise HTTPException(status_code=404, detail="File not found.")
    return {k: v for k, v in entry.items() if k != "stored_path"}


@app.delete("/files/{file_id}")
def delete_file(file_id: str):
    """Delete an uploaded file."""
    entry = _files.pop(file_id, None)
    if not entry:
        raise HTTPException(status_code=404, detail="File not found.")
    Path(entry["stored_path"]).unlink(missing_ok=True)
    return {"detail": "File deleted."}


@app.get("/formats/{file_id}")
def get_formats(file_id: str):
    """Return valid conversion formats for a given file."""
    entry = _files.get(file_id)
    if not entry:
        raise HTTPException(status_code=404, detail="File not found.")
    formats = detector.get_valid_output_formats(entry["category"], entry["format"])
    return {"file_id": file_id, "formats": formats}


@app.post("/convert")
async def start_conversion(payload: dict, background_tasks: BackgroundTasks):
    """Start a background conversion job.

    Body: {"file_id": str, "target_format": str}
    """
    file_id: Optional[str] = payload.get("file_id")
    target_format: Optional[str] = payload.get("target_format")

    if not file_id or not target_format:
        raise HTTPException(status_code=400, detail="file_id and target_format are required.")

    entry = _files.get(file_id)
    if not entry:
        raise HTTPException(status_code=404, detail="File not found.")

    target_format = target_format.lower().lstrip(".")

    valid_formats = detector.get_valid_output_formats(entry["category"], entry["format"])
    if target_format not in valid_formats:
        raise HTTPException(
            status_code=400,
            detail=f"'{target_format}' is not a valid target format. Choose from: {valid_formats}",
        )

    converter = _converter_for_category(entry["category"])
    if converter is None:
        raise HTTPException(status_code=422, detail=f"No converter for category '{entry['category']}'.")

    # Build output path
    job_id = create_job(file_id, entry["stored_path"], "", target_format)
    output_path = CONVERTED_DIR / f"{job_id}.{target_format}"
    update_job_output_path(job_id, str(output_path))

    background_tasks.add_task(
        run_conversion,
        job_id,
        entry["stored_path"],
        str(output_path),
        converter,
    )

    return {"job_id": job_id, "status": JobStatus.QUEUED}


@app.get("/jobs/{job_id}")
def get_job_status(job_id: str):
    """Get the status of a conversion job."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    return {
        "job_id": job["job_id"],
        "status": job["status"],
        "error": job.get("error"),
        "output_filename": job.get("output_filename"),
        "target_format": job.get("target_format"),
        "created_at": job.get("created_at"),
        "updated_at": job.get("updated_at"),
    }


@app.get("/jobs")
def list_all_jobs():
    """List all conversion jobs."""
    return [
        {
            "job_id": j["job_id"],
            "file_id": j["file_id"],
            "status": j["status"],
            "target_format": j.get("target_format"),
            "output_filename": j.get("output_filename"),
            "error": j.get("error"),
        }
        for j in list_jobs()
    ]


@app.get("/download/{job_id}")
def download_file(job_id: str):
    """Download the converted file for a completed job."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    if job["status"] != JobStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail=f"Job is not completed yet (status: {job['status']}).",
        )

    output_path = Path(job["output_path"])

    # Security: ensure the path is within CONVERTED_DIR
    try:
        output_path.resolve().relative_to(CONVERTED_DIR.resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied.")

    if not output_path.exists():
        raise HTTPException(status_code=404, detail="Converted file not found on disk.")

    target_format = job.get("target_format", "bin")
    download_name = job.get("output_filename") or f"converted.{target_format}"

    return FileResponse(
        path=str(output_path),
        filename=download_name,
        media_type="application/octet-stream",
    )


@app.get("/health")
def health():
    return {"status": "ok"}
