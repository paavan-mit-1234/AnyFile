import asyncio
import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Optional


class JobStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


# In-memory job store: {job_id: dict}
_jobs: dict[str, dict] = {}
_lock = asyncio.Lock()


def create_job(file_id: str, input_path: str, output_path: str, target_format: str) -> str:
    """Create a new conversion job and return its job_id."""
    job_id = str(uuid.uuid4())
    _jobs[job_id] = {
        "job_id": job_id,
        "file_id": file_id,
        "status": JobStatus.QUEUED,
        "input_path": input_path,
        "output_path": output_path,
        "target_format": target_format,
        "error": None,
        "output_filename": None,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }
    return job_id


def get_job(job_id: str) -> Optional[dict]:
    """Retrieve job metadata by job_id."""
    return _jobs.get(job_id)


def update_job_output_path(job_id: str, output_path: str) -> None:
    """Set the output_path for a job after it is created."""
    if job_id in _jobs:
        _jobs[job_id]["output_path"] = output_path


def list_jobs() -> list[dict]:
    return list(_jobs.values())


async def run_conversion(
    job_id: str,
    input_path: str,
    output_path: str,
    converter_func: Callable[[str, str], bool],
) -> None:
    """Execute a conversion job asynchronously in a thread pool."""
    async with _lock:
        if job_id not in _jobs:
            return
        _jobs[job_id]["status"] = JobStatus.PROCESSING
        _jobs[job_id]["updated_at"] = datetime.utcnow().isoformat()

    try:
        loop = asyncio.get_event_loop()
        # Run blocking conversion in thread pool to avoid blocking the event loop
        await loop.run_in_executor(None, converter_func, input_path, output_path)

        import os
        from pathlib import Path

        output_filename = Path(output_path).name

        async with _lock:
            _jobs[job_id]["status"] = JobStatus.COMPLETED
            _jobs[job_id]["output_filename"] = output_filename
            _jobs[job_id]["updated_at"] = datetime.utcnow().isoformat()

    except Exception as exc:
        async with _lock:
            _jobs[job_id]["status"] = JobStatus.FAILED
            _jobs[job_id]["error"] = str(exc)
            _jobs[job_id]["updated_at"] = datetime.utcnow().isoformat()
