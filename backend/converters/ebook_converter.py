import shutil
import subprocess
from pathlib import Path


SUPPORTED_FORMATS = {"epub", "mobi", "azw3", "fb2", "lit", "lrf", "pdb", "pdf"}


def convert(input_path: str, output_path: str) -> bool:
    """Convert ebook formats using Calibre's ebook-convert CLI.

    Returns True on success, raises on failure.
    """
    src_ext = Path(input_path).suffix.lstrip(".").lower()
    dst_ext = Path(output_path).suffix.lstrip(".").lower()

    if src_ext not in SUPPORTED_FORMATS:
        raise ValueError(f"Unsupported input ebook format: {src_ext}")
    if dst_ext not in SUPPORTED_FORMATS:
        raise ValueError(f"Unsupported output ebook format: {dst_ext}")

    ebook_convert = shutil.which("ebook-convert")
    if ebook_convert is None:
        raise RuntimeError(
            "Calibre's ebook-convert is not installed. "
            "Install Calibre: https://calibre-ebook.com/download"
        )

    result = subprocess.run(
        [ebook_convert, input_path, output_path],
        capture_output=True,
        text=True,
        timeout=300,
    )

    if result.returncode != 0:
        raise RuntimeError(
            f"ebook-convert failed (exit {result.returncode}):\n{result.stderr[-2000:]}"
        )

    return True
