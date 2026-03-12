import subprocess
from pathlib import Path


AUDIO_CODEC_MAP: dict[str, list[str]] = {
    "mp3":  ["-c:a", "libmp3lame", "-q:a", "2"],
    "wav":  ["-c:a", "pcm_s16le"],
    "aac":  ["-c:a", "aac", "-b:a", "192k"],
    "flac": ["-c:a", "flac"],
    "ogg":  ["-c:a", "libvorbis", "-q:a", "4"],
    "m4a":  ["-c:a", "aac", "-b:a", "192k"],
    "wma":  ["-c:a", "wmav2"],
    "opus": ["-c:a", "libopus", "-b:a", "128k"],
    "aiff": ["-c:a", "pcm_s16be"],
}


def convert(input_path: str, output_path: str) -> bool:
    """Convert audio using ffmpeg subprocess call.

    Returns True on success, raises on failure.
    """
    dst_ext = Path(output_path).suffix.lstrip(".").lower()
    codec_args = AUDIO_CODEC_MAP.get(dst_ext, ["-c:a", "copy"])

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
        timeout=1800,
    )

    if result.returncode != 0:
        raise RuntimeError(
            f"ffmpeg failed (exit {result.returncode}):\n{result.stderr[-2000:]}"
        )

    return True
