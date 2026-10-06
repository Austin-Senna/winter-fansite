#!/usr/bin/env python3
"""Assemble raw/manifest.json from the per-stage work files.

Usage: .venv/bin/python3 -I build_manifest.py [--member <slug|all>] <eras.json> <raw_dir> <work_dir>
Every image and video carries a `member` (karina|giselle|winter|ningning|group, null for MV/performance
videos). Images carry `qc` ({verdict, flags, lapVar, dupeOf}) from <era>/<member>/qc.json; files whose qc
verdict is "exclude" (small, dupe, undecodable) or that verify_images.py deleted are left out. Pinterest
pins are deduped by pin id across every era and member (first era in config order wins, member order
karina, giselle, winter, ningning, group). Up to MAX_IMAGES_PER_MEMBER images per era+member.
--member restricts the manifest to one member (default all).
"""
import argparse
import glob
import json
import os
from datetime import datetime, timezone

SOURCE_ORDER = {"official": 0, "commons": 1, "pinterest": 2, "other": 3}
MAX_IMAGES_PER_MEMBER = 120
MEMBER_ORDER = ["karina", "giselle", "winter", "ningning", "group"]


def load(path: str):
    """Load JSON or None."""
    if not os.path.exists(path):
        return None
    with open(path) as f:
        return json.load(f)


def image_work(work_dir: str) -> dict:
    """{(slug, member): [entries]} from every stage work file."""
    out = {}
    for path in sorted(glob.glob(os.path.join(work_dir, "images", "*.json"))):
        data = load(path)
        if not isinstance(data, dict) or "entries" not in data or "slug" not in data:
            continue
        out.setdefault((data["slug"], data["member"]), []).extend(data["entries"])
    return out


def videos_for(work_dir: str,
    slug: str,
    verify: dict,
) -> list:
    """Merge base and per-member video files for one era; dedupe by id, sort by views."""
    merged = {}
    for path in sorted(glob.glob(os.path.join(work_dir, "videos", f"{slug}.json")) +
                       glob.glob(os.path.join(work_dir, "videos", f"{slug}.*.json"))):
        data = load(path) or {}
        for v in data.get("videos", []):
            if v["id"] in merged:
                continue
            thumb = v.get("thumbnail")
            if thumb and thumb not in verify:
                thumb = None
            merged[v["id"]] = {
                "id": v["id"], "title": v["title"], "channel": v["channel"],
                "viewCount": v["viewCount"], "uploadDate": v.get("uploadDate"),
                "duration": v.get("duration"), "kind": v["kind"],
                "member": v.get("member"),
                "membersNamed": v.get("membersNamed", []),
                "winterFocus": v.get("winterFocus", False),
                "url": v["url"], "thumbnail": thumb,
            }
    videos = list(merged.values())
    videos.sort(key=lambda r: (r["viewCount"] or 0), reverse=True)
    return videos


def images_for(entries: list,
    member: str,
    verify: dict,
    qc: dict,
    seen_pins: set,
) -> list:
    """Manifest image rows for one era+member."""
    images = []
    for e in entries:
        f = e.get("file")
        if not f or f not in verify:
            continue  # deleted by verify step
        q = qc.get(f)
        if q and q["verdict"] == "exclude":
            continue
        if e["source"] == "pinterest":
            pin = e.get("pinId") or e["pageUrl"]
            if pin in seen_pins:
                continue
            seen_pins.add(pin)
        entry = {
            "file": f,
            "member": member,
            "sourceUrl": e.get("sourceUrl"),
            "pageUrl": e.get("pageUrl"),
            "source": e["source"],
            "width": verify[f]["width"],
            "height": verify[f]["height"],
            "bytes": verify[f]["bytes"],
            "qc": {"verdict": q["verdict"], "flags": q["flags"], "lapVar": q.get("lapVar"),
                   "dupeOf": q.get("dupeOf")} if q else {"verdict": "unchecked", "flags": [], "lapVar": None,
                                                           "dupeOf": None},
        }
        for k in ("license", "licenseUrl", "credit", "title", "description", "board", "altText",
                  "originLink", "capturedDate", "pinnedAt"):
            if e.get(k):
                entry[k] = e[k]
        images.append(entry)
    images.sort(key=lambda e: (SOURCE_ORDER.get(e["source"], 9),
                               len(e["qc"]["flags"]),  # clean files ahead of flagged ones
                               -max(e["width"] or 0, e["height"] or 0)))
    return images[:MAX_IMAGES_PER_MEMBER]


def main() -> None:
    """Entry point."""
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--member", default="all")
    ap.add_argument("eras")
    ap.add_argument("raw_dir")
    ap.add_argument("work_dir")
    a = ap.parse_args()
    cfg = load(a.eras)
    eras = cfg["eras"]
    members = MEMBER_ORDER if a.member == "all" else [a.member]
    verify = load(os.path.join(a.work_dir, "verify.json")) or {}
    work = image_work(a.work_dir)
    seen_pins = set()
    out_eras = []
    stats = {}
    for era in eras:
        slug = era["slug"]
        videos = videos_for(a.work_dir, slug, verify)
        images = []
        per_member = {}
        for member in members:
            entries = work.get((slug, member))
            if not entries:
                continue
            qc = (load(os.path.join(a.raw_dir, slug, member, "qc.json")) or {}).get("files", {})
            rows = images_for(entries, member, verify, qc, seen_pins)
            images.extend(rows)
            flags = {}
            for r in rows:
                for fl in r["qc"]["flags"]:
                    flags[fl] = flags.get(fl, 0) + 1
            per_member[member] = {"images": len(rows), "flags": flags,
                                  "sources": {s: sum(1 for r in rows if r["source"] == s)
                                              for s in sorted({r["source"] for r in rows})}}
        row = {
            "slug": slug, "title": era["title"], "releaseDate": era["releaseDate"],
            "members": per_member, "videos": videos, "images": images,
        }
        if era.get("tracks"):
            row["tracks"] = era["tracks"]
        out_eras.append(row)
        stats[slug] = per_member
    manifest = {
        "generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "subject": "aespa (Karina, Giselle, Winter, Ningning) and group",
        "members": {m: {"name": v["name"], "korean": v.get("korean")} for m, v in cfg["members"].items()
                    if m in members},
        "notes": {
            "videos": "YouTube search via yt-dlp, ranked by view_count; thumbnails only, no video files. "
                      "member is set for fancam/other videos naming exactly one member, null for MV/performance.",
            "images": "official = aespa-official.jp release artwork (member=group); commons = Wikimedia Commons "
                      "(see license/credit); pinterest = pins from Pinterest search (fan uploads, copyright "
                      "unverified, use for reference only). qc.flags: blurry, member-mismatch, era-mismatch, "
                      "unverified are advisory; small, dupe and undecodable files are not listed.",
            "paths": "file paths are relative to this directory (raw/).",
        },
        "eras": out_eras,
    }
    with open(os.path.join(a.raw_dir, "manifest.json"), "w") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)
    for e in out_eras:
        kinds = {}
        for v in e["videos"]:
            kinds[v["kind"]] = kinds.get(v["kind"], 0) + 1
        by_m = {m: s["images"] for m, s in e["members"].items()}
        print(f"{e['slug']:18} videos={len(e['videos']):3} {kinds}  images={len(e['images']):3} {by_m}")


if __name__ == "__main__":
    main()
