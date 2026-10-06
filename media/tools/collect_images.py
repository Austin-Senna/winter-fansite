#!/usr/bin/env python3
"""Collect era images from Pinterest (gallery-dl), Wikimedia Commons (API) and aespa-official.jp.

Usage: python3 -I collect_images.py <eras.json> <raw_dir> <work_dir> <stage> [slug ...]
  stage: pinterest | commons | official
Writes <work_dir>/images/<stage>-<slug>.json (list of image entries, file paths relative to raw_dir).
"""
import glob
import json
import os
import re
import ssl
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date

import certifi

HERE = os.path.dirname(os.path.abspath(__file__))
GDL = os.path.join(HERE, ".venv", "bin", "gallery-dl")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36"
COMMONS_UA = "winter-fansite-collector/0.1 (personal fansite; austinsenna@gmail.com)"
PIN_RANGE = "1-40"
BYTE_CAP = 600 * 1024 * 1024
SSL_CTX = ssl.create_default_context(cafile=certifi.where())


def http_get(url: str,
    ua: str = UA,
    timeout: int = 60,
) -> bytes:
    """GET a URL and return the body."""
    req = urllib.request.Request(url, headers={"User-Agent": ua})
    with urllib.request.urlopen(req, timeout=timeout, context=SSL_CTX) as r:
        return r.read()


def tree_bytes(path: str) -> int:
    """Total bytes under a directory."""
    total = 0
    for root, _, files in os.walk(path):
        for f in files:
            total += os.path.getsize(os.path.join(root, f))
    return total


def rel(path: str,
    raw_dir: str,
) -> str:
    """Path relative to raw_dir."""
    return os.path.relpath(path, raw_dir)


# ---------------------------------------------------------------- pinterest
def pinterest(era: dict,
    raw_dir: str,
) -> tuple[list, list]:
    """Run gallery-dl on each Pinterest search for this era; return (entries, errors)."""
    out_dir = os.path.join(raw_dir, era["slug"], "pinterest")
    os.makedirs(out_dir, exist_ok=True)
    errors = []
    for q in era["pinterestQueries"]:
        url = "https://www.pinterest.com/search/pins/?q=" + urllib.parse.quote(q)
        cmd = [GDL, "--range", PIN_RANGE, "--write-metadata", "--no-mtime",
               "-o", "extractor.pinterest.videos=false",
               "-D", out_dir, "-f", "{id}.{extension}", url]
        try:
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=900)
        except subprocess.TimeoutExpired:
            errors.append(f"timeout: {q}")
            continue
        if res.returncode not in (0, 4, 8, 16, 32):  # gallery-dl: 0 ok, others partial
            errors.append(f"rc={res.returncode}: {q}: {res.stderr.strip()[-300:]}")
        elif res.stderr.strip():
            errors.append(f"stderr: {q}: {res.stderr.strip()[-300:]}")
    entries = []
    for meta_path in sorted(glob.glob(os.path.join(out_dir, "*.json"))):
        try:
            with open(meta_path) as f:
                m = json.load(f)
        except Exception:
            continue
        img_path = meta_path[:-5]
        if not os.path.exists(img_path):
            continue
        orig = (m.get("images") or {}).get("orig") or {}
        pinner = (m.get("pinner") or {}).get("username")
        entries.append({
            "file": rel(img_path, raw_dir),
            "sourceUrl": orig.get("url") or m.get("url"),
            "pageUrl": f"https://www.pinterest.com/pin/{m.get('id')}/",
            "source": "pinterest",
            "width": orig.get("width"),
            "height": orig.get("height"),
            "credit": f"pinterest:{pinner}" if pinner else None,
            "originLink": m.get("link") or None,
            "title": (m.get("grid_title") or m.get("title") or "").strip() or None,
        })
    return entries, errors


# ------------------------------------------------------------------ commons
def commons_api(params: dict) -> dict:
    """Call the Commons API."""
    params = dict(params, format="json", formatversion="2")
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
    return json.loads(http_get(url, ua=COMMONS_UA))


def commons_titles() -> set:
    """Collect candidate File: titles for Winter."""
    titles = set()
    r = commons_api({"action": "query", "list": "search", "srsearch": "Winter aespa",
                     "srnamespace": "6", "srlimit": "100"})
    titles.update(x["title"] for x in r["query"]["search"])
    r = commons_api({"action": "query", "list": "search", "srsearch": "윈터 aespa",
                     "srnamespace": "6", "srlimit": "100"})
    titles.update(x["title"] for x in r["query"]["search"])
    for y in range(2020, 2027):
        r = commons_api({"action": "query", "list": "categorymembers", "cmtype": "file",
                         "cmtitle": f"Category:Winter (singer) in {y}", "cmlimit": "200"})
        titles.update(x["title"] for x in r.get("query", {}).get("categorymembers", []))
    return titles


def commons_info(titles: list) -> list:
    """Fetch imageinfo for a batch of titles."""
    out = []
    for i in range(0, len(titles), 40):
        batch = titles[i:i + 40]
        r = commons_api({"action": "query", "prop": "imageinfo", "titles": "|".join(batch),
                         "iiprop": "url|size|mime|extmetadata", "iiurlwidth": "2000"})
        for page in r["query"]["pages"]:
            ii = (page.get("imageinfo") or [None])[0]
            if ii:
                out.append((page, ii))
    return out


DATE_RE = re.compile(r"(\d{4})-(\d{2})-(\d{2})")
YYMMDD_RE = re.compile(r"\b(2[0-6])(\d{2})(\d{2})\b")
YYYYMMDD_RE = re.compile(r"\b(20[2][0-6])[.\-]?(\d{2})[.\-]?(\d{2})\b")


def guess_date(title: str,
    ii: dict,
) -> date | None:
    """Guess capture date from extmetadata or filename."""
    em = ii.get("extmetadata") or {}
    for key in ("DateTimeOriginal", "DateTime"):
        v = (em.get(key) or {}).get("value") or ""
        m = DATE_RE.search(v)
        if m:
            try:
                return date(int(m[1]), int(m[2]), int(m[3]))
            except ValueError:
                pass
    m = YYYYMMDD_RE.search(title)
    if m:
        try:
            return date(int(m[1]), int(m[2]), int(m[3]))
        except ValueError:
            pass
    m = YYMMDD_RE.search(title)
    if m:
        try:
            return date(2000 + int(m[1]), int(m[2]), int(m[3]))
        except ValueError:
            pass
    return None


def era_for_date(d: date | None,
    eras: list,
) -> str:
    """Map a date to the group era active at that time."""
    group = sorted((e for e in eras if not e.get("solo")), key=lambda e: e["releaseDate"])
    if d is None:
        return group[-1]["slug"]
    slug = group[0]["slug"]
    for e in group:
        if date.fromisoformat(e["releaseDate"]) <= d:
            slug = e["slug"]
    return slug


def strip_html(s: str) -> str:
    """Remove tags."""
    return re.sub(r"<[^>]+>", "", s or "").strip()


def commons(eras: list,
    raw_dir: str,
) -> tuple[dict, list]:
    """Download Commons photos of Winter, bucketed by era. Returns ({slug: entries}, errors)."""
    errors = []
    titles = sorted(commons_titles())
    by_era = {}
    for page, ii in commons_info(titles):
        title = page["title"]
        tl = title.lower()
        if "signature" in tl or "sign (" in tl or "logo" in tl:
            continue
        if not ("winter" in tl or "윈터" in title):
            continue
        if ii.get("mime", "").split("/")[0] != "image" or ii.get("mime") == "image/svg+xml":
            continue
        d = guess_date(title, ii)
        slug = era_for_date(d, eras)
        em = ii.get("extmetadata") or {}
        url = ii.get("thumburl") or ii["url"]
        mime = ii.get("mime", "")
        ext = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp",
               "image/gif": ".gif"}.get(mime) or os.path.splitext(urllib.parse.urlparse(ii["url"]).path)[1].lower() or ".jpg"
        out_dir = os.path.join(raw_dir, slug, "commons")
        os.makedirs(out_dir, exist_ok=True)
        dest = os.path.join(out_dir, f"{page['pageid']}{ext}")
        if not os.path.exists(dest):
            data = None
            for attempt in range(4):
                try:
                    data = http_get(url, ua=COMMONS_UA)
                    break
                except urllib.error.HTTPError as ex:
                    if ex.code == 429:
                        time.sleep(10 * (attempt + 1))
                        continue
                    errors.append(f"{title}: {ex}")
                    break
                except Exception as ex:
                    errors.append(f"{title}: {ex}")
                    break
            if data is None:
                if not any(title in e for e in errors):
                    errors.append(f"{title}: gave up after 429s")
                continue
            with open(dest, "wb") as f:
                f.write(data)
            time.sleep(2.0)
        w, h = ii.get("thumbwidth") or ii.get("width"), ii.get("thumbheight") or ii.get("height")
        by_era.setdefault(slug, []).append({
            "file": rel(dest, raw_dir),
            "sourceUrl": url,
            "pageUrl": ii.get("descriptionurl"),
            "source": "commons",
            "width": w,
            "height": h,
            "license": strip_html((em.get("LicenseShortName") or {}).get("value")),
            "licenseUrl": strip_html((em.get("LicenseUrl") or {}).get("value")) or None,
            "credit": strip_html((em.get("Artist") or {}).get("value")) or None,
            "title": title,
            "capturedDate": d.isoformat() if d else None,
        })
    return by_era, errors


# ----------------------------------------------------------------- official
JP_SLUGS = {
    "black-mamba": ["black-mamba"], "forever": ["forever"], "next-level": ["next-level"],
    "savage": ["savage"], "dreams-come-true": ["dreams-come-true"],
    "girls": ["girls", "lifes-too-short-en"], "my-world": ["myworld", "wtmw"],
    "better-things": ["betterthings"], "drama": ["drama"], "armageddon": ["armageddon"],
    "whiplash": ["whiplash"], "dirty-work": ["dirtywork"], "rich-man": ["richman"],
    "attitude": ["attitude"], "lemonade": ["lemonade"], "kiss-n-tell": ["kissntell"],
}
IMG_RE = re.compile(r'(?:src|href|content)="(https?://aespa-official\.jp/[^"]+?\.(?:jpg|jpeg|png|webp))"')


def official(era: dict,
    raw_dir: str,
) -> tuple[list, list]:
    """Pull release artwork from aespa-official.jp discography pages."""
    entries, errors = [], []
    pages = [f"https://aespa-official.jp/discography/{s}/" for s in JP_SLUGS.get(era["slug"], [])]
    if era.get("solo"):
        pages = ["https://aespa-official.jp/profile/winter/", "https://aespa-official.jp/"]
    out_dir = os.path.join(raw_dir, era["slug"], "official")
    seen = set()
    for page_url in pages:
        try:
            html = http_get(page_url).decode("utf-8", "replace")
        except Exception as ex:
            errors.append(f"{page_url}: {ex}")
            continue
        for u in IMG_RE.findall(html):
            if u in seen:
                continue
            seen.add(u)
            if "/themes/" in u and not (era.get("solo") and "prof/winter" in u):
                continue  # theme chrome: logos, footers, icons
            if "/uploads/" not in u and "prof/winter" not in u:
                continue
            if era.get("solo") and "prof/winter" not in u and "winter" not in u.lower():
                continue
            os.makedirs(out_dir, exist_ok=True)
            name = os.path.basename(urllib.parse.urlparse(u).path)
            dest = os.path.join(out_dir, name)
            try:
                data = http_get(u)
                with open(dest, "wb") as f:
                    f.write(data)
            except Exception as ex:
                errors.append(f"{u}: {ex}")
                continue
            entries.append({
                "file": rel(dest, raw_dir),
                "sourceUrl": u,
                "pageUrl": page_url,
                "source": "official",
                "width": None,
                "height": None,
                "credit": "SM Entertainment / aespa-official.jp",
                "title": f"{era['title']} release artwork (aespa-official.jp)",
            })
    return entries, errors


def main() -> None:
    """Entry point."""
    eras_path, raw_dir, work_dir, stage = sys.argv[1:5]
    only = set(sys.argv[5:])
    with open(eras_path) as f:
        eras = json.load(f)["eras"]
    out_dir = os.path.join(work_dir, "images")
    os.makedirs(out_dir, exist_ok=True)
    if stage == "commons":
        by_era, errors = commons(eras, raw_dir)
        for slug, entries in by_era.items():
            with open(os.path.join(out_dir, f"commons-{slug}.json"), "w") as f:
                json.dump({"entries": entries, "errors": []}, f, ensure_ascii=False, indent=1)
        with open(os.path.join(out_dir, "commons-errors.json"), "w") as f:
            json.dump(errors, f, indent=1)
        print(f"commons: {sum(len(v) for v in by_era.values())} files, {len(errors)} errors",
              file=sys.stderr)
        return
    for era in eras:
        if only and era["slug"] not in only:
            continue
        if tree_bytes(raw_dir) > BYTE_CAP:
            print("byte cap reached, stopping", file=sys.stderr)
            break
        print(f"== {stage} {era['slug']}", file=sys.stderr)
        fn = pinterest if stage == "pinterest" else official
        entries, errors = fn(era, raw_dir)
        with open(os.path.join(out_dir, f"{stage}-{era['slug']}.json"), "w") as f:
            json.dump({"entries": entries, "errors": errors}, f, ensure_ascii=False, indent=1)
        print(f"  {len(entries)} entries, {len(errors)} errors", file=sys.stderr)
        for e in errors:
            print("   !", e[:200], file=sys.stderr)


if __name__ == "__main__":
    main()
