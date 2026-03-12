import os
from pathlib import Path

from PIL import Image


# Pillow format identifiers keyed by extension
FORMAT_MAP = {
    "jpg": "JPEG",
    "jpeg": "JPEG",
    "png": "PNG",
    "bmp": "BMP",
    "webp": "WEBP",
    "gif": "GIF",
    "tiff": "TIFF",
    "tif": "TIFF",
    "ico": "ICO",
}

SAVE_KWARGS: dict[str, dict] = {
    "JPEG": {"quality": 95},
    "WEBP": {"quality": 95},
}


def convert(input_path: str, output_path: str) -> bool:
    """Convert image from input_path to output_path using Pillow.

    Returns True on success, raises on failure.
    """
    src_ext = Path(input_path).suffix.lstrip(".").lower()
    dst_ext = Path(output_path).suffix.lstrip(".").lower()

    if src_ext == "svg":
        return _convert_svg(input_path, output_path, dst_ext)

    if dst_ext == "svg":
        raise ValueError("Conversion to SVG is not supported (SVG is a vector format).")

    dst_fmt = FORMAT_MAP.get(dst_ext)
    if dst_fmt is None:
        raise ValueError(f"Unsupported output image format: {dst_ext}")

    img = Image.open(input_path)

    # Convert RGBA/P to RGB for JPEG output (JPEG doesn't support alpha)
    if dst_fmt == "JPEG" and img.mode in ("RGBA", "P", "LA"):
        background = Image.new("RGB", img.size, (255, 255, 255))
        if img.mode == "P":
            img = img.convert("RGBA")
        if img.mode in ("RGBA", "LA"):
            background.paste(img, mask=img.split()[-1])
        else:
            background.paste(img)
        img = background
    elif dst_fmt not in ("JPEG",) and img.mode == "P":
        img = img.convert("RGBA")

    kwargs = SAVE_KWARGS.get(dst_fmt, {})
    img.save(output_path, format=dst_fmt, **kwargs)
    return True


def _convert_svg(input_path: str, output_path: str, dst_ext: str) -> bool:
    """Attempt SVG rasterisation via cairosvg."""
    try:
        import cairosvg  # type: ignore

        converters = {
            "png": cairosvg.svg2png,
            "pdf": cairosvg.svg2pdf,
        }
        fn = converters.get(dst_ext)
        if fn is None:
            raise ValueError(f"SVG can only be converted to png/pdf via cairosvg, not '{dst_ext}'.")
        with open(output_path, "wb") as f:
            f.write(fn(url=input_path))
        return True
    except ImportError:
        raise RuntimeError(
            "cairosvg is not installed. Cannot convert SVG files. "
            "Install it with: pip install cairosvg"
        )
