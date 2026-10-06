#!/usr/bin/env python3
"""One-time migration: move the Winter-only layout to the per-member layout.

<era>/pinterest -> <era>/winter/pinterest
<era>/commons   -> <era>/winter/commons
<era>/official  -> <era>/group/official   (winter-solo: <era>/winter/official)
Work files <work>/images/<stage>-<slug>.json are rewritten to <stage>-<slug>-<member>.json
with paths updated and `slug`/`member` recorded. Idempotent.

Usage: .venv/bin/python3 -I migrate_layout.py <eras.json> <raw_dir> <work_dir>
"""
import json
import os
import shutil
import sys


def move_dir(src: str,
    dst: str,
) -> int:
    """Move src into dst (merging if dst exists). Returns files moved."""
    if not os.path.isdir(src):
        return 0
    os.makedirs(dst, exist_ok=True)
    n = 0
    for name in os.listdir(src):
        s, d = os.path.join(src, name), os.path.join(dst, name)
        if os.path.exists(d):
            os.remove(s)
        else:
            shutil.move(s, d)
            n += 1
    os.rmdir(src)
    return n


def main() -> None:
    """Entry point."""
    eras_path, raw_dir, work_dir = sys.argv[1:4]
    with open(eras_path) as f:
        eras = json.load(f)["eras"]
    img_work = os.path.join(work_dir, "images")
    for era in eras:
        slug = era["slug"]
        era_dir = os.path.join(raw_dir, slug)
        if not os.path.isdir(era_dir):
            continue
        official_member = "winter" if era.get("solo") else "group"
        plan = {"pinterest": "winter", "commons": "winter", "official": official_member}
        for sub, member in plan.items():
            n = move_dir(os.path.join(era_dir, sub), os.path.join(era_dir, member, sub))
            old_work = os.path.join(img_work, f"{sub}-{slug}.json")
            new_work = os.path.join(img_work, f"{sub}-{slug}-{member}.json")
            if os.path.exists(old_work):
                with open(old_work) as f:
                    data = json.load(f)
                for e in data.get("entries", []):
                    if e.get("file", "").startswith(f"{slug}/{sub}/"):
                        e["file"] = f"{slug}/{member}/{sub}/" + e["file"][len(f"{slug}/{sub}/"):]
                data["slug"], data["member"] = slug, member
                with open(new_work, "w") as f:
                    json.dump(data, f, ensure_ascii=False, indent=1)
                os.remove(old_work)
            if n:
                print(f"{slug}/{sub} -> {slug}/{member}/{sub}: {n} files", file=sys.stderr)


if __name__ == "__main__":
    main()
