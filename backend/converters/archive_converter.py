import os
import shutil
import subprocess
import tarfile
import tempfile
import zipfile
from pathlib import Path


def _extract_to_dir(input_path: str, extract_dir: str, src_ext: str) -> None:
    """Extract archive to a temporary directory."""
    if src_ext == "zip":
        with zipfile.ZipFile(input_path, "r") as zf:
            zf.extractall(extract_dir)
    elif src_ext in ("tar",):
        with tarfile.open(input_path, "r:") as tf:
            tf.extractall(extract_dir)
    elif src_ext == "gz":
        with tarfile.open(input_path, "r:gz") as tf:
            tf.extractall(extract_dir)
    elif src_ext == "bz2":
        with tarfile.open(input_path, "r:bz2") as tf:
            tf.extractall(extract_dir)
    elif src_ext in ("7z", "rar", "xz"):
        if not shutil.which("7z"):
            raise RuntimeError("7z command not found. Install p7zip-full.")
        result = subprocess.run(
            ["7z", "x", input_path, f"-o{extract_dir}", "-y"],
            capture_output=True,
            text=True,
            timeout=300,
        )
        if result.returncode != 0:
            raise RuntimeError(f"7z extraction failed:\n{result.stderr}")
    else:
        raise ValueError(f"Unsupported archive format for extraction: {src_ext}")


def _pack_dir(extract_dir: str, output_path: str, dst_ext: str) -> None:
    """Pack directory contents into the output archive."""
    if dst_ext == "zip":
        with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
            for root, _dirs, files in os.walk(extract_dir):
                for fname in files:
                    full = os.path.join(root, fname)
                    arcname = os.path.relpath(full, extract_dir)
                    zf.write(full, arcname)
    elif dst_ext == "tar":
        with tarfile.open(output_path, "w:") as tf:
            tf.add(extract_dir, arcname="")
    elif dst_ext == "gz":
        with tarfile.open(output_path, "w:gz") as tf:
            tf.add(extract_dir, arcname="")
    elif dst_ext == "bz2":
        with tarfile.open(output_path, "w:bz2") as tf:
            tf.add(extract_dir, arcname="")
    elif dst_ext == "7z":
        if not shutil.which("7z"):
            raise RuntimeError("7z command not found. Install p7zip-full.")
        result = subprocess.run(
            ["7z", "a", output_path, f"{extract_dir}/*", "-y"],
            capture_output=True,
            text=True,
            timeout=300,
        )
        if result.returncode != 0:
            raise RuntimeError(f"7z packing failed:\n{result.stderr}")
    else:
        raise ValueError(f"Unsupported output archive format: {dst_ext}")


def convert(input_path: str, output_path: str) -> bool:
    """Convert archive format by extracting then repacking.

    Returns True on success, raises on failure.
    """
    src_ext = Path(input_path).suffix.lstrip(".").lower()
    dst_ext = Path(output_path).suffix.lstrip(".").lower()

    with tempfile.TemporaryDirectory() as tmp_dir:
        _extract_to_dir(input_path, tmp_dir, src_ext)
        _pack_dir(tmp_dir, output_path, dst_ext)

    return True
