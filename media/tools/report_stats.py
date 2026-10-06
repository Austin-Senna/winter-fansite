#!/usr/bin/env python3
"""Print the REPORT.md tables: per member x era image counts, flags, blocks, sizes.

Usage: .venv/bin/python3 -I report_stats.py <eras.json> <raw_dir> <work_dir>
"fetched" = image files on disk after verify (pinterest+commons+official), "manifest" = rows in
manifest.json, flags = qc flags over fetched files (dupe/small are excluded from the manifest).
"""
import glob
import json
import os
import sys

MEMBERS = ["karina", "giselle", "winter", "ningning", "group"]
FLAGS = ["small", "dupe", "blurry", "member-mismatch", "era-mismatch", "unverified", "undecodable"]


def load(path: str):
    """Load JSON or None."""
    if not os.path.exists(path):
        return None
    with open(path) as f:
        return json.load(f)


def tree_bytes(path: str) -> int:
    """Bytes under path."""
    return sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(path) for f in fs) if os.path.isdir(path) else 0


def main() -> None:
    """Entry point."""
    eras_path, raw_dir, work_dir = sys.argv[1:4]
    eras = load(eras_path)["eras"]
    manifest = load(os.path.join(raw_dir, "manifest.json"))
    qc = load(os.path.join(work_dir, "qc-summary.json")) or {}
    man_eras = {e["slug"]: e for e in manifest["eras"]}
    print("| era | member | fetched | manifest | small | dupe | blurry | member-mm | era-mm | unverified | pins/queries blocked | MB |")
    print("|---|---|---|---|---|---|---|---|---|---|---|---|")
    tot = {"fetched": 0, "manifest": 0, "mb": 0.0}
    tot_flags = {f: 0 for f in FLAGS}
    per_member = {m: {"fetched": 0, "manifest": 0, "mb": 0.0, "blocked": 0} for m in MEMBERS}
    for era in eras:
        slug = era["slug"]
        for m in MEMBERS:
            d = os.path.join(raw_dir, slug, m)
            if not os.path.isdir(d):
                continue
            s = qc.get(slug, {}).get(m, {"total": 0, "flags": {}})
            mm = man_eras[slug]["members"].get(m, {"images": 0})
            pw = load(os.path.join(work_dir, "images", f"pinterest-{slug}-{m}.json")) or {}
            st = pw.get("stats") or {}
            blocked = st.get("blocked", 0)
            nq = len(st.get("queries", []))
            mb = tree_bytes(d) / 1e6
            fl = s["flags"]
            print(f"| {slug} | {m} | {s['total']} | {mm['images']} | {fl.get('small', 0)} | {fl.get('dupe', 0)} | "
                  f"{fl.get('blurry', 0)} | {fl.get('member-mismatch', 0)} | {fl.get('era-mismatch', 0)} | "
                  f"{fl.get('unverified', 0)} | {nq} q, {blocked} blocked | {mb:.0f} |")
            tot["fetched"] += s["total"]
            tot["manifest"] += mm["images"]
            tot["mb"] += mb
            for f in FLAGS:
                tot_flags[f] += fl.get(f, 0)
            per_member[m]["fetched"] += s["total"]
            per_member[m]["manifest"] += mm["images"]
            per_member[m]["mb"] += mb
            per_member[m]["blocked"] += blocked
    print()
    print("| member | fetched | manifest | MB | blocked queries |")
    print("|---|---|---|---|---|")
    for m in MEMBERS:
        p = per_member[m]
        print(f"| {m} | {p['fetched']} | {p['manifest']} | {p['mb']:.0f} | {p['blocked']} |")
    print(f"| total | {tot['fetched']} | {tot['manifest']} | {tot['mb']:.0f} | |")
    print()
    print("flags over fetched files:", tot_flags)
    thumbs = sum(tree_bytes(p) for p in glob.glob(os.path.join(raw_dir, "*", "yt-thumbs")))
    nvid = sum(len(e["videos"]) for e in manifest["eras"])
    by_member = {}
    for e in manifest["eras"]:
        for v in e["videos"]:
            by_member[v["member"]] = by_member.get(v["member"], 0) + 1
    print(f"videos: {nvid}, by member {by_member}, yt-thumbs {thumbs / 1e6:.0f} MB")
    print(f"raw total: {tree_bytes(raw_dir) / 1e6:.0f} MB")
    blocks = []
    for p in glob.glob(os.path.join(work_dir, "pinterest-blocks-*.json")):
        blocks.extend(load(p) or [])
    print(f"pinterest blocked queries: {len(blocks)}")
    for b in blocks:
        print(f"  {b['at']} {b['member']}/{b['era']}: {b['query']}: {b['detail'][:160]}")


if __name__ == "__main__":
    main()
