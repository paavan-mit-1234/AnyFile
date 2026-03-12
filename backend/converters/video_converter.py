import subprocess
from pathlib import Path


# Codec settings per output format
VIDEO_CODEC_MAP: dict[str, list[str]] = {
    "mp4":  ["-c:v", "libx264", "-c:a", "aac", "-movflags", "+faststart"],
    "mkv":  ["-c:v", "libx264", "-c:a", "aac"],
    "webm": ["-c:v", "libvpx-vp9", "-c:a", "libopus"],
    "avi":  ["-c:v", "mpeg4", "-c:a", "mp3"],
    "mov":  ["-c:v", "libx264", "-c:a", "aac"],
    "flv":  ["-c:v", "libx264", "-c:a", "aac"],
    "mpeg": ["-c:v", "mpeg2video", "-c:a", "mp2"],
    "mpg":  ["-c:v", "mpeg2video", "-c:a", "mp2"],
    "wmv":  ["-c:v", "wmv2", "-c:a", "wmav2"],
    "m4v":  ["-c:v", "libx264", "-c:a", "aac"],
    "ogv":  ["-c:v", "libtheora", "-c:a", "libvorbis"],
    "3gp":  ["-c:v", "h263", "-c:a", "aac"],
}


def convert(input_path: str, output_path: str) -> bool:
    """Convert video using ffmpeg subprocess call.

    Returns True on success, raises on failure.
    """
    dst_ext = Path(output_path).suffix.lstrip(".").lower()
    codec_args = VIDEO_CODEC_MAP.get(dst_ext, ["-c:v", "libx264", "-c:a", "aac"])

    cmd = [
        "ffmpeg", "-y",
        "-i", input_path,
        *codec_args,
        output_path,
    ]

    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=3600,  # 1 hour max
    )

    if result.returncode != 0:
        raise RuntimeError(
            f"ffmpeg failed (exit {result.returncode}):\n{result.stderr[-2000:]}"
        )

    return True
