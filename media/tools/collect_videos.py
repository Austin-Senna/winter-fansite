#!/usr/bin/env python3
"""Search YouTube per era via yt-dlp, rank by views, classify, download thumbnails.

Usage: python3 -I collect_videos.py <eras.json> <raw_dir> <work_dir> [slug ...]
Writes <work_dir>/videos/<slug>.json and thumbnails to <raw_dir>/<slug>/yt-thumbs/.
"""
import json
import os
import re
import ssl
import subprocess
import sys
import urllib.request

import certifi

HERE = os.path.dirname(os.path.abspath(__file__))
YTDLP = os.path.join(HERE, ".venv", "bin", "yt-dlp")
KEEP_PER_ERA = 20
SSL_CTX = ssl.create_default_context(cafile=certifi.where())
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36"

OFFICIAL_CHANNELS = {"SMTOWN", "aespa", "SMTOWN SUBS", "SMP FLOOR", "SMTOWN DANCE"}
# labels / rights-holders that upload official MVs for Winter's OSTs and collaborations
LABEL_CHANNELS = {"1theK (원더케이)", "Netflix K-Content", "BANG YEDAM OFFICIAL", "M:USB 뮤스비",
                  "냠냠엔터테인먼트 YAMYAM ENTERTAINMENT", "Warner Music Japan", "딩고 뮤직 / dingo music",
                  "Stone Music Entertainment", "Genie Music", "KAKAO ENTERTAINMENT", "DMM pictures",
                  "테레東アニメ", "テレ東アニメ"}
SOLO_RELEASE = re.compile(r"\((winter|윈터) solo\)|visualizer", re.I)
NOISE = re.compile(
    r"(reaction|react |lyrics|lyric|color coded|teaser|cover|tutorial|mirrored|"
    r"audio\b|8d |slowed|sped up|nightcore|karaoke|instrumental|tiktok|shorts|"
    r"ranking|ranked|explained|analysis|theory|roblox|mashup|remix|edit\b|edits\b|"
    r"nikke|fortnite|ai |ai cover|cover by|guitar|piano|drum)", re.I)
FANCAM = re.compile(r"(fancam|직캠|focus|포커스|cam\b|4k)", re.I)
PERF = re.compile(
    r"(dance practice|안무|choreography|performance video|performance stage|"
    r"stage|comeback stage|show|inkigayo|music bank|m countdown|mcountdown|"
    r"music core|the show|show champion|studio choom|dingo|it's live|relay dance|"
    r"live clip|live performance|concert|tour|synk|fact music|mma|mama|gda|"
    r"golden disc|kcon|the first take|killing voice|be original|엠카운트다운|"
    r"음악중심|인기가요|뮤직뱅크|최초 공개|comeback|camerawork|performance ver|"
    r"live ver|band ver|special stage|showcase)", re.I)
MV = re.compile(r"(\bmv\b|\bm/v\b|music video|official video)", re.I)
WINTER = re.compile(r"(winter|윈터|ウィンター|kim minjeong|minjeong|민정)", re.I)


def run_search(query: str,
    n: int,
) -> list:
    """Run one yt-dlp flat search and return parsed JSON lines."""
    cmd = [YTDLP, "--flat-playlist", "-j", "--no-warnings", f"ytsearch{n}:{query}"]
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=300).stdout
    except subprocess.TimeoutExpired:
        print(f"  timeout: {query}", file=sys.stderr)
        return []
    items = []
    for line in out.splitlines():
        line = line.strip()
        if not line.startswith("{"):
            continue
        try:
            items.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return items


def classify(item: dict,
    era: dict,
) -> str:
    """Return mv | performance | fancam | other."""
    title = item.get("title") or ""
    channel = item.get("channel") or item.get("uploader") or ""
    parts = {c.strip() for c in re.split(r"\s+and\s+|,", channel)}
    official = bool(parts & OFFICIAL_CHANNELS)
    label = bool(parts & LABEL_CHANNELS)
    behind = re.search(r"(behind|making|recording|teaser|trailer)", title, re.I)
    if (official or label) and (FANCAM.search(title) or re.search(r"(live tour|concert|stage)", title, re.I)):
        return "performance"
    if official and SOLO_RELEASE.search(title) and not behind:
        return "mv"
    if label and MV.search(title) and not behind:
        return "mv"
    if official and re.search(r"(performance ver|dance practice|camerawork|live)", title, re.I):
        return "performance"
    if official and MV.search(title):
        return "mv"
    if official and (PERF.search(title) or "camerawork" in title.lower()
                     or "stage" in title.lower() or "live" in title.lower()):
        return "performance"
    if FANCAM.search(title) and not official:
        return "fancam"
    if PERF.search(title):
        return "performance"
    if MV.search(title) and official:
        return "mv"
    return "other"


def about_aespa(item: dict,
    era: dict,
) -> bool:
    """Filter out results not about aespa / this era."""
    title = (item.get("title") or "")
    tl = title.lower()
    must = era.get("mustMatchAny")
    if must:
        if not any(m.lower() in tl for m in must):
            return False
    elif not ("aespa" in tl or "에스파" in title or "æspa" in tl):
        return False
    if NOISE.search(title):
        return False
    terms = [t.lower() for t in era.get("searchTerms", [])] + [era["title"].lower()]
    if not any(t in tl for t in terms):
        return False
    dur = item.get("duration") or 0
    if dur and dur < 60:
        return False
    if dur and dur > 60 * 60:
        return False
    return True


def fetch_thumb(vid: str,
    dest_dir: str,
) -> str | None:
    """Download maxresdefault, fall back to hqdefault. Returns local path or None."""
    os.makedirs(dest_dir, exist_ok=True)
    for variant in ("maxresdefault", "hqdefault"):
        url = f"https://i.ytimg.com/vi/{vid}/{variant}.jpg"
        dest = os.path.join(dest_dir, f"{vid}.jpg")
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=30, context=SSL_CTX) as r:
                data = r.read()
        except Exception:
            continue
        # hqdefault for missing maxres is a 120x90 grey placeholder (~1-2 KB)
        if len(data) < 4000:
            continue
        with open(dest, "wb") as f:
            f.write(data)
        return dest
    return None


def main() -> None:
    """Entry point."""
    args = [a for a in sys.argv[1:] if a != "--thumbs-only"]
    thumbs_only = "--thumbs-only" in sys.argv
    eras_path, raw_dir, work_dir = args[:3]
    only = set(args[3:])
    with open(eras_path) as f:
        eras = json.load(f)["eras"]
    os.makedirs(os.path.join(work_dir, "videos"), exist_ok=True)
    for era in eras:
        slug = era["slug"]
        if only and slug not in only:
            continue
        if thumbs_only:
            path = os.path.join(work_dir, "videos", f"{slug}.json")
            with open(path) as f:
                data = json.load(f)
            thumb_dir = os.path.join(raw_dir, slug, "yt-thumbs")
            for r in data["videos"]:
                r["kind"] = classify({"title": r["title"], "channel": r["channel"]}, era)
                if not r.get("thumbnail"):
                    p = fetch_thumb(r["id"], thumb_dir)
                    r["thumbnail"] = os.path.relpath(p, raw_dir) if p else None
            with open(path, "w") as f:
                json.dump(data, f, ensure_ascii=False, indent=1)
            print(f"{slug}: {sum(1 for r in data['videos'] if r['thumbnail'])}/{len(data['videos'])} thumbs",
                  file=sys.stderr)
            continue
        print(f"== {slug}", file=sys.stderr)
        seen = {}
        for q in era["videoQueries"]:
            n = q.get("n", 15)
            for item in run_search(q["q"], n):
                vid = item.get("id")
                if not vid or vid in seen:
                    continue
                if not about_aespa(item, era):
                    continue
                seen[vid] = item
        rows = []
        for vid, item in seen.items():
            rows.append({
                "id": vid,
                "title": item.get("title"),
                "channel": item.get("channel") or item.get("uploader"),
                "viewCount": item.get("view_count"),
                "uploadDate": item.get("upload_date"),
                "duration": item.get("duration"),
                "kind": classify(item, era),
                "winterFocus": bool(WINTER.search(item.get("title") or "")),
                "url": f"https://www.youtube.com/watch?v={vid}",
            })
        rows.sort(key=lambda r: (r["viewCount"] or 0), reverse=True)
        # keep official MV(s) regardless of rank, then top by views
        keep = [r for r in rows if r["kind"] == "mv"][:3]
        for r in rows:
            if len(keep) >= KEEP_PER_ERA:
                break
            if r not in keep:
                keep.append(r)
        keep.sort(key=lambda r: (r["viewCount"] or 0), reverse=True)
        thumb_dir = os.path.join(raw_dir, slug, "yt-thumbs")
        for r in keep:
            p = fetch_thumb(r["id"], thumb_dir)
            r["thumbnail"] = os.path.relpath(p, raw_dir) if p else None
        with open(os.path.join(work_dir, "videos", f"{slug}.json"), "w") as f:
            json.dump({"slug": slug, "candidates": len(rows), "videos": keep}, f,
                      ensure_ascii=False, indent=1)
        print(f"  {len(rows)} candidates -> kept {len(keep)}", file=sys.stderr)


if __name__ == "__main__":
    main()
