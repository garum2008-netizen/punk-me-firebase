"""Solid PNG cards. No portraits and no third-party image library."""

from __future__ import annotations

import struct
import zlib
from pathlib import Path


def solid_png(width: int, height: int, rgb: tuple[int, int, int]) -> bytes:
    if width < 1 or height < 1:
        raise ValueError("png size")
    red, green, blue = rgb

    def chunk(tag: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)

    row = b"\x00" + bytes((red, green, blue)) * width
    header = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", zlib.compress(row * height, 9))
        + chunk(b"IEND", b"")
    )


def write_brand_card(path: Path, rgb: tuple[int, int, int] = (11, 37, 69)) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(solid_png(640, 360, rgb))
    return path
