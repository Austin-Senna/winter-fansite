#!/usr/bin/env python3
"""Quality control for collected images. Runs after verify_images.py.

Usage: .venv/bin/python3 -I qc_images.py <eras.json> <raw_dir> <work_dir> [--calibrate N]
Reads <work_dir>/verify.json (dimensions) and the per-stage work files (metadata), computes
per-file flags and writes <raw_dir>/<era>/<member>/qc.json:
  {"generated": ..., "files": {relpath: {"verdict": "keep"|"exclude", "flags": [...],
                                          "lapVar": float, "phash": hex, "dupeOf": relpath|null,
                                          "metaText": str|null}}}
and <work_dir>/qc-summary.json with counts per flag per era+member.

Flags: small (long edge < MIN_LONG_EDGE), dupe (phash distance <= PHASH_MAX to a larger file,
checked across every era and member), blurry (Laplacian variance < BLUR_MIN on a 512 px grey copy),
member-mismatch (sidecar names a different member alone), era-mismatch (sidecar names another era's
title track and not this one), unverified (no usable metadata), undecodable.
Only small, dupe and undecodable are excluded; the rest stay in the manifest with the flag.
--calibrate N prints the N lowest Laplacian variances with paths instead of writing qc files.
"""
import json
import os
import re
import sys
from datetime import datetime, timezone

import imagehash
import numpy as np
from PIL import Image, ImageOps

MIN_LONG_EDGE = 1000
PHASH_MAX = 6
BLUR_MIN = 40.0          # calibrated on the 874-image Winter set: <40 are upscaled video stills, see REPORT.md
BLUR_EDGE = 512
EXCLUDE = {"small", "dupe", "undecodable"}
SOURCES = ("pinterest", "commons", "official")


def load(path: str):
    """Load JSON or None."""
    if not os.path.exists(path):
        return None
    with open(path) as f:
        return json.load(f)


def parse_rel(relp: str) -> tuple[str, str, str] | None:
    """<era>/<member>/<source>/<file> -> (era, member, source)."""
    parts = relp.split("/")
    if len(parts) == 4 and parts[2] in SOURCES:
        return parts[0], parts[1], parts[2]
    return None


def grey_512(im: Image.Image) -> np.ndarray:
    """Grayscale float array with long edge BLUR_EDGE."""
    im = ImageOps.exif_transpose(im).convert("L")
    w, h = im.size
    scale = BLUR_EDGE / max(w, h)
    if scale < 1:
        im = im.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    return np.asarray(im, dtype=np.float32)


def laplacian_var(a: np.ndarray) -> float:
    """Variance of the 4-neighbour Laplacian."""
    if a.shape[0] < 3 or a.shape[1] < 3:
        return 0.0
    c = a[1:-1, 1:-1]
    lap = 4 * c - a[:-2, 1:-1] - a[2:, 1:-1] - a[1:-1, :-2] - a[1:-1, 2:]
    return float(lap.var())


def analyze(path: str) -> tuple[int | None, float | None]:
    """(phash as int, laplacian variance) or (None, None) if undecodable."""
    try:
        with Image.open(path) as im:
            im.load()
            ph = imagehash.phash(im)
            lv = laplacian_var(grey_512(im))
    except Exception:
        return None, None
    return int(str(ph), 16), lv


def alias_regex(aliases: list) -> re.Pattern:
    """Word-ish boundary regex for a list of aliases (Latin aliases get \\b, CJK do not)."""
    parts = []
    for a in aliases:
        esc = re.escape(a)
        if re.search(r"[a-z]", a, re.I):
            parts.append(rf"(?<![a-z]){esc}(?![a-z])")
        else:
            parts.append(esc)
    return re.compile("|".join(parts), re.I)


def meta_text(entry: dict | None) -> str | None:
    """Join the metadata fields used for the checks."""
    if not entry:
        return None
    bits = [entry.get(k) for k in ("title", "description", "board")]
    bits = [b.strip() for b in bits if isinstance(b, str) and b.strip()]
    return " | ".join(bits) or None


def member_flags(text: str | None,
    member: str,
    source: str,
    member_rx: dict,
) -> list:
    """member-mismatch / unverified based on metadata text."""
    if source == "official":
        return []
    if not text:
        return ["unverified"]
    named = [m for m in member_rx if m != "group" and member_rx[m].search(text)]
    if member == "group":
        if member_rx["group"].search(text) or len(named) >= 2:
            return []
        if len(named) == 1:
            return ["member-mismatch"]
        return ["unverified"]
    if member in named:
        return []
    if len(named) == 1:
        return ["member-mismatch"]
    if named:  # two or more other members, none is ours: wrong subject
        return ["member-mismatch"]
    return ["unverified"]


def era_flags(text: str | None,
    slug: str,
    era_rx: dict,
    generic: set,
    cfg_eras: dict,
) -> list:
    """era-mismatch when another era's distinctive title track is named and ours is not."""
    if not text:
        return []
    own = era_rx[slug].search(text) if slug in era_rx else None
    if own:
        return []
    for other, rx in era_rx.items():
        if other == slug:
            continue
        for term in cfg_eras[other]["qcTerms"]:
            if term.lower() in generic:
                continue
            if alias_regex([term]).search(text):
                return ["era-mismatch"]
    return []


def main() -> None:
    """Entry point."""
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    eras_path, raw_dir, work_dir = args[:3]
    calibrate = 0
    if "--calibrate" in sys.argv:
        calibrate = int(sys.argv[sys.argv.index("--calibrate") + 1])
    cfg = load(eras_path)
    cfg_eras = {e["slug"]: e for e in cfg["eras"]}
    member_rx = {m: alias_regex(v["aliases"]) for m, v in cfg["members"].items()}
    era_rx = {s: alias_regex(e["qcTerms"]) for s, e in cfg_eras.items()}
    generic = {t.lower() for t in cfg.get("qcGenericTerms", [])}
    verify = load(os.path.join(work_dir, "verify.json")) or {}

    # metadata per file from the stage work files
    meta = {}
    img_work = os.path.join(work_dir, "images")
    for name in sorted(os.listdir(img_work)):
        data = load(os.path.join(img_work, name))
        if not isinstance(data, dict):
            continue
        for e in data.get("entries", []):
            if e.get("file"):
                meta[e["file"]] = e

    files = [p for p in sorted(verify) if parse_rel(p)]
    print(f"analyzing {len(files)} images", file=sys.stderr, flush=True)
    results = {}
    hashes, order = [], []
    for i, relp in enumerate(files):
        ph, lv = analyze(os.path.join(raw_dir, relp))
        results[relp] = {"phash": ph, "lapVar": lv}
        if ph is not None:
            hashes.append(ph)
            order.append(relp)
        if (i + 1) % 500 == 0:
            print(f"  {i + 1}/{len(files)}", file=sys.stderr, flush=True)

    if calibrate:
        ranked = sorted((r["lapVar"], p) for p, r in results.items() if r["lapVar"] is not None)
        vals = np.array([v for v, _ in ranked])
        for q in (1, 2, 5, 10, 25, 50, 75, 90):
            print(f"p{q:02d} = {np.percentile(vals, q):8.1f}")
        for v, p in ranked[:calibrate]:
            print(f"{v:8.1f}  {p}  {verify[p]['width']}x{verify[p]['height']}")
        return

    # global phash dedupe: keep the largest (by pixel count, then bytes)
    size_key = {p: (verify[p]["width"] * verify[p]["height"], verify[p]["bytes"]) for p in order}
    idx = sorted(range(len(order)), key=lambda i: size_key[order[i]], reverse=True)
    arr = np.array([hashes[i] for i in idx], dtype=np.uint64)
    dupe_of = {}
    for pos in range(len(idx)):
        me = order[idx[pos]]
        if me in dupe_of:
            continue
        rest = arr[pos + 1:]
        if rest.size == 0:
            break
        dist = np.bitwise_count(np.bitwise_xor(rest, arr[pos]))
        for off in np.nonzero(dist <= PHASH_MAX)[0]:
            other = order[idx[pos + 1 + int(off)]]
            if other not in dupe_of:
                dupe_of[other] = me

    per_dir, summary = {}, {}
    for relp in files:
        era, member, source = parse_rel(relp)
        r = results[relp]
        flags = []
        if r["phash"] is None:
            flags.append("undecodable")
        else:
            if max(verify[relp]["width"], verify[relp]["height"]) < MIN_LONG_EDGE:
                flags.append("small")
            if relp in dupe_of:
                flags.append("dupe")
            if r["lapVar"] is not None and r["lapVar"] < BLUR_MIN:
                flags.append("blurry")
        text = meta_text(meta.get(relp))
        flags += member_flags(text, member, source, member_rx)
        flags += era_flags(text, era, era_rx, generic, cfg_eras)
        verdict = "exclude" if EXCLUDE & set(flags) else "keep"
        per_dir.setdefault((era, member), {})[relp] = {
            "verdict": verdict, "flags": flags,
            "lapVar": round(r["lapVar"], 1) if r["lapVar"] is not None else None,
            "phash": f"{r['phash']:016x}" if r["phash"] is not None else None,
            "dupeOf": dupe_of.get(relp),
            "metaText": text,
        }
        s = summary.setdefault(era, {}).setdefault(member, {"total": 0, "keep": 0, "exclude": 0, "flags": {}})
        s["total"] += 1
        s[verdict] += 1
        for fl in flags:
            s["flags"][fl] = s["flags"].get(fl, 0) + 1

    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    for (era, member), entries in per_dir.items():
        out = os.path.join(raw_dir, era, member, "qc.json")
        with open(out, "w") as f:
            json.dump({"generated": now, "era": era, "member": member,
                       "thresholds": {"minLongEdge": MIN_LONG_EDGE, "phashMax": PHASH_MAX, "blurMin": BLUR_MIN},
                       "files": entries}, f, ensure_ascii=False, indent=1)
    with open(os.path.join(work_dir, "qc-summary.json"), "w") as f:
        json.dump(summary, f, indent=1)
    totals = {}
    for era in summary.values():
        for s in era.values():
            for fl, n in s["flags"].items():
                totals[fl] = totals.get(fl, 0) + n
    print(f"qc: {len(files)} files, flags {totals}", file=sys.stderr)


if __name__ == "__main__":
    main()
