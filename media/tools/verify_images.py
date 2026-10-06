#!/usr/bin/env python3
"""Verify every downloaded file is a real image >= MIN_EDGE px; delete the rest.

Usage: .venv/bin/python3 -I verify_images.py <raw_dir> <work_dir>
Writes <work_dir>/verify.json: {relpath: {width, height, bytes, format}} for kept files,
and <work_dir>/verify-deleted.json for removed files with the reason.
"""
import json
import os
import subprocess
import sys

from PIL import Image

MIN_EDGE = 300
IMAGE_DIRS = ("pinterest", "commons", "official", "yt-thumbs")


def file_says_image(path: str) -> bool:
    """Use the `file` command as an independent check."""
    out = subprocess.run(["file", "-b", "--mime-type", path], capture_output=True, text=True).stdout
    return out.strip().startswith("image/")


def main() -> None:
    """Entry point."""
    raw_dir, work_dir = sys.argv[1:3]
    kept, deleted = {}, {}
    for slug in sorted(os.listdir(raw_dir)):
        era_dir = os.path.join(raw_dir, slug)
        if not os.path.isdir(era_dir):
            continue
        for sub in IMAGE_DIRS:
            d = os.path.join(era_dir, sub)
            if not os.path.isdir(d):
                continue
            for name in sorted(os.listdir(d)):
                path = os.path.join(d, name)
                relp = os.path.relpath(path, raw_dir)
                if name.endswith(".json"):
                    continue  # gallery-dl metadata sidecar, kept for provenance
                reason = None
                if not file_says_image(path):
                    reason = "not an image per file(1)"
                else:
                    try:
                        with Image.open(path) as im:
                            im.verify()
                        with Image.open(path) as im:
                            w, h = im.size
                            fmt = im.format
                    except Exception as ex:
                        reason = f"PIL cannot decode: {ex}"
                    else:
                        if max(w, h) < MIN_EDGE:
                            reason = f"too small: {w}x{h}"
                if reason:
                    deleted[relp] = reason
                    os.remove(path)
                    side = path + ".json"
                    if os.path.exists(side):
                        os.remove(side)
                    continue
                kept[relp] = {"width": w, "height": h, "bytes": os.path.getsize(path), "format": fmt}
    with open(os.path.join(work_dir, "verify.json"), "w") as f:
        json.dump(kept, f, indent=1)
    with open(os.path.join(work_dir, "verify-deleted.json"), "w") as f:
        json.dump(deleted, f, indent=1)
    print(f"kept {len(kept)}, deleted {len(deleted)}", file=sys.stderr)
    for k, v in deleted.items():
        print(f"  - {k}: {v}", file=sys.stderr)


if __name__ == "__main__":
    main()
