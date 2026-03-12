import os
import shutil
import subprocess
from pathlib import Path


# Formats that pandoc handles well
PANDOC_FORMATS = {"md", "markdown", "html", "htm", "txt", "rst", "latex", "tex", "rtf", "docx", "odt", "org", "xml", "json", "yaml", "yml", "log", "ini", "cfg"}

# Formats that prefer LibreOffice
LIBREOFFICE_FORMATS = {"doc", "docx", "odt", "ppt", "pptx", "odp", "pdf"}


def _pandoc_format(ext: str) -> str:
    mapping = {
        "md": "markdown",
        "markdown": "markdown",
        "html": "html",
        "htm": "html",
        "txt": "plain",
        "rtf": "rtf",
        "docx": "docx",
        "odt": "odt",
        "rst": "rst",
        "latex": "latex",
        "tex": "latex",
        "pdf": "pdf",
        "org": "org",
        "xml": "html",
        "json": "plain",
        "yaml": "plain",
        "yml": "plain",
        "log": "plain",
        "ini": "plain",
        "cfg": "plain",
    }
    return mapping.get(ext, ext)


def _convert_with_pandoc(input_path: str, output_path: str, src_ext: str, dst_ext: str) -> bool:
    src_fmt = _pandoc_format(src_ext)
    dst_fmt = _pandoc_format(dst_ext)

    cmd = [
        "pandoc",
        input_path,
        "-f", src_fmt,
        "-t", dst_fmt,
        "-o", output_path,
        "--standalone",
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if result.returncode != 0:
        raise RuntimeError(f"pandoc failed:\n{result.stderr[-2000:]}")
    return True


def _convert_with_libreoffice(input_path: str, output_path: str, dst_ext: str) -> bool:
    output_dir = str(Path(output_path).parent)

    # LibreOffice uses its own output naming; we rename after
    lo_fmt_map = {
        "pdf": "pdf",
        "docx": "docx",
        "odt": "odt",
        "txt": "txt",
        "html": "html",
        "rtf": "rtf",
    }
    lo_fmt = lo_fmt_map.get(dst_ext, dst_ext)

    cmd = [
        "libreoffice",
        "--headless",
        "--convert-to", lo_fmt,
        "--outdir", output_dir,
        input_path,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    if result.returncode != 0:
        raise RuntimeError(f"libreoffice failed:\n{result.stderr[-2000:]}")

    # LibreOffice names the output based on the input filename
    src_stem = Path(input_path).stem
    lo_output = Path(output_dir) / f"{src_stem}.{lo_fmt}"

    if lo_output.exists() and str(lo_output) != output_path:
        shutil.move(str(lo_output), output_path)
    elif not Path(output_path).exists():
        raise RuntimeError(f"LibreOffice did not produce output file at {lo_output}")

    return True


def convert(input_path: str, output_path: str) -> bool:
    """Convert documents using pandoc or LibreOffice.

    Returns True on success, raises on failure.
    """
    src_ext = Path(input_path).suffix.lstrip(".").lower()
    dst_ext = Path(output_path).suffix.lstrip(".").lower()

    # Prefer pandoc for text-based conversions
    if src_ext in PANDOC_FORMATS and dst_ext in PANDOC_FORMATS:
        if shutil.which("pandoc"):
            try:
                return _convert_with_pandoc(input_path, output_path, src_ext, dst_ext)
            except RuntimeError:
                pass  # fall through to LibreOffice

    # Use LibreOffice for office formats or as fallback
    if shutil.which("libreoffice"):
        return _convert_with_libreoffice(input_path, output_path, dst_ext)

    raise RuntimeError(
        "No document converter available. Install pandoc and/or LibreOffice."
    )
