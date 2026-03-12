import os
import mimetypes
from pathlib import Path
from typing import Optional

try:
    import magic
    MAGIC_AVAILABLE = True
except ImportError:
    MAGIC_AVAILABLE = False


CATEGORY_FORMATS = {
    "image": {
        "jpg", "jpeg", "png", "bmp", "webp", "gif", "tiff", "tif",
        "ico", "svg", "avif", "heic", "heif", "psd", "raw", "cr2", "nef", "arw",
    },
    "video": {
        "mp4", "mkv", "avi", "mov", "webm", "flv", "mpeg", "mpg",
        "wmv", "m4v", "3gp", "ogv", "ts", "vob", "rmvb",
    },
    "audio": {
        "mp3", "wav", "aac", "flac", "ogg", "m4a", "wma", "opus",
        "aiff", "au", "ra", "amr", "mid", "midi",
    },
    "document": {
        "pdf", "docx", "doc", "txt", "rtf", "md", "html", "htm",
        "odt", "pptx", "ppt", "odp",
        "rst", "tex", "latex", "org", "xml", "json", "yaml", "yml",
        "log", "ini", "cfg",
    },
    "spreadsheet": {"csv", "xlsx", "xls", "ods", "tsv"},
    "archive": {"zip", "tar", "gz", "bz2", "7z", "rar", "xz", "zst", "lz4", "br"},
    "ebook": {"epub", "mobi", "azw3", "fb2", "lit", "lrf", "pdb"},
}

# Build reverse lookup: extension -> category
EXT_TO_CATEGORY: dict[str, str] = {}
for _cat, _exts in CATEGORY_FORMATS.items():
    for _ext in _exts:
        EXT_TO_CATEGORY[_ext] = _cat


class FileDetector:
    """Detects file type, category, and extracts basic metadata."""

    def detect(self, file_path: str) -> dict:
        path = Path(file_path)
        ext = path.suffix.lstrip(".").lower()

        size = path.stat().st_size if path.exists() else 0

        mime_type = self._detect_mime(file_path, ext)
        category = self._detect_category(ext, mime_type)

        return {
            "filename": path.name,
            "size": size,
            "format": ext,
            "mime_type": mime_type,
            "category": category,
        }

    def _detect_mime(self, file_path: str, ext: str) -> str:
        if MAGIC_AVAILABLE:
            try:
                mime = magic.from_file(file_path, mime=True)
                if mime and mime != "application/octet-stream":
                    return mime
            except Exception:
                pass

        guessed, _ = mimetypes.guess_type(file_path)
        if guessed:
            return guessed

        return self._ext_to_mime(ext)

    def _ext_to_mime(self, ext: str) -> str:
        fallbacks = {
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "png": "image/png",
            "gif": "image/gif",
            "webp": "image/webp",
            "bmp": "image/bmp",
            "tiff": "image/tiff",
            "tif": "image/tiff",
            "svg": "image/svg+xml",
            "ico": "image/x-icon",
            "mp4": "video/mp4",
            "mkv": "video/x-matroska",
            "avi": "video/x-msvideo",
            "mov": "video/quicktime",
            "webm": "video/webm",
            "mp3": "audio/mpeg",
            "wav": "audio/wav",
            "flac": "audio/flac",
            "ogg": "audio/ogg",
            "aac": "audio/aac",
            "pdf": "application/pdf",
            "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "csv": "text/csv",
            "txt": "text/plain",
            "zip": "application/zip",
            "tar": "application/x-tar",
            "gz": "application/gzip",
            "epub": "application/epub+zip",
            "mobi": "application/x-mobipocket-ebook",
            "azw3": "application/vnd.amazon.ebook",
            "fb2": "application/x-fictionbook+xml",
            "rst": "text/x-rst",
            "tex": "application/x-tex",
            "latex": "application/x-latex",
            "org": "text/x-org",
            "xml": "application/xml",
            "json": "application/json",
            "yaml": "text/yaml",
            "yml": "text/yaml",
            "log": "text/plain",
            "ini": "text/plain",
            "cfg": "text/plain",
        }
        return fallbacks.get(ext, "application/octet-stream")

    def _detect_category(self, ext: str, mime_type: str) -> str:
        # Extension-based lookup first (most reliable)
        if ext in EXT_TO_CATEGORY:
            return EXT_TO_CATEGORY[ext]

        # Fall back to MIME-based detection
        if mime_type.startswith("image/"):
            return "image"
        if mime_type.startswith("video/"):
            return "video"
        if mime_type.startswith("audio/"):
            return "audio"
        if mime_type.startswith("text/"):
            return "document"
        if "zip" in mime_type or "tar" in mime_type or "compressed" in mime_type:
            return "archive"
        if "epub" in mime_type:
            return "ebook"

        return "unknown"

    def get_valid_output_formats(self, category: str, input_format: str) -> list[str]:
        """Return the list of formats this file can be converted to."""
        conversion_map: dict[str, list[str]] = {
            "image": ["jpg", "jpeg", "png", "bmp", "webp", "gif", "tiff", "ico"],
            "video": ["mp4", "mkv", "avi", "mov", "webm", "flv", "mpeg", "wmv", "m4v", "ogv"],
            "audio": ["mp3", "wav", "aac", "flac", "ogg", "m4a", "opus", "aiff"],
            "document": ["pdf", "docx", "txt", "html", "odt", "rtf", "md", "rst", "tex", "org"],
            "spreadsheet": ["csv", "xlsx", "xls", "ods", "tsv"],
            "archive": ["zip", "tar", "gz", "bz2", "7z"],
            "ebook": ["epub", "mobi", "pdf", "azw3"],
        }
        formats = conversion_map.get(category, [])
        # Exclude the current format from the list
        return [f for f in formats if f != input_format.lower()]
