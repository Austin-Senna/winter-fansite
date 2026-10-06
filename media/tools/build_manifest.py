#!/usr/bin/env python3
"""Assemble raw/manifest.json from the per-stage work files.

Usage: python3 -I build_manifest.py <eras.json> <raw_dir> <work_dir>
"""
import glob
import json
import os
import sys
from datetime import datetime, timezone

SOURCE_ORDER = {"official": 0, "commons": 1, "pinterest": 2, "other": 3}
MAX_IMAGES_PER_ERA = 40


def load(path: str) -> dict | None:
    """Load JSON or None."""
    if not os.path.exists(path):
        return None
    with open(path) as f:
        return json.load(f)


def main() -> None:
    """Entry point."""
    eras_path, raw_dir, work_dir = sys.argv[1:4]
    eras = load(eras_path)["eras"]
    verify = load(os.path.join(work_dir, "verify.json")) or {}
    seen_pins = set()
    out_eras = []
    for era in eras:
        slug = era["slug"]
        vids = load(os.path.join(work_dir, "videos", f"{slug}.json")) or {"videos": []}
        videos = []
        for v in vids["videos"]:
            thumb = v.get("thumbnail")
            if thumb and thumb not in verify:
                thumb = None
            videos.append({
                "id": v["id"], "title": v["title"], "channel": v["channel"],
                "viewCount": v["viewCount"], "uploadDate": v.get("uploadDate"),
                "duration": v.get("duration"), "kind": v["kind"],
                "winterFocus": v.get("winterFocus", False),
                "url": v["url"], "thumbnail": thumb,
            })
        videos.sort(key=lambda r: (r["viewCount"] or 0), reverse=True)
        images = []
        for path in sorted(glob.glob(os.path.join(work_dir, "images", f"*-{slug}.json"))):
            data = load(path)
            for e in data.get("entries", []):
                f = e.get("file")
                if f and f not in verify:
                    continue  # deleted by verify step
                if e["source"] == "pinterest":
                    pin = e["pageUrl"]
                    if pin in seen_pins:
                        continue
                    seen_pins.add(pin)
                entry = {
                    "file": f,
                    "sourceUrl": e.get("sourceUrl"),
                    "pageUrl": e.get("pageUrl"),
                    "source": e["source"],
                    "width": verify.get(f, {}).get("width") if f else e.get("width"),
                    "height": verify.get(f, {}).get("height") if f else e.get("height"),
                    "bytes": verify.get(f, {}).get("bytes") if f else None,
                }
                for k in ("license", "licenseUrl", "credit", "title", "originLink", "capturedDate"):
                    if e.get(k):
                        entry[k] = e[k]
                images.append(entry)
        images.sort(key=lambda e: (SOURCE_ORDER.get(e["source"], 9),
                                   -max(e.get("width") or 0, e.get("height") or 0)))
        images = images[:MAX_IMAGES_PER_ERA]
        row = {
            "slug": slug, "title": era["title"], "releaseDate": era["releaseDate"],
            "videos": videos, "images": images,
        }
        if era.get("tracks"):
            row["tracks"] = era["tracks"]
        out_eras.append(row)
    manifest = {
        "generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "subject": "Winter (Kim Minjeong, aespa)",
        "notes": {
            "videos": "YouTube search via yt-dlp, ranked by view_count; thumbnails only, no video files.",
            "images": "official = aespa-official.jp release artwork; commons = Wikimedia Commons (see license/credit); "
                      "pinterest = pins from Pinterest search (fan uploads, copyright unverified, use for reference only).",
            "paths": "file paths are relative to this directory (raw/).",
        },
        "eras": out_eras,
    }
    with open(os.path.join(raw_dir, "manifest.json"), "w") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)
    for e in out_eras:
        kinds = {}
        for v in e["videos"]:
            kinds[v["kind"]] = kinds.get(v["kind"], 0) + 1
        srcs = {}
        for i in e["images"]:
            srcs[i["source"]] = srcs.get(i["source"], 0) + 1
        hi = sum(1 for i in e["images"] if max(i.get("width") or 0, i.get("height") or 0) >= 1000)
        print(f"{e['slug']:18} videos={len(e['videos']):2} {kinds}  images={len(e['images']):2} {srcs} hires={hi}")


if __name__ == "__main__":
    main()
