#!/usr/bin/env python3
"""Collect era images per member from Pinterest (gallery-dl), Wikimedia Commons (API) and aespa-official.jp.

Usage: .venv/bin/python3 -I collect_images.py --member <slug|all> <eras.json> <raw_dir> <work_dir> <stage> [era-slug ...]
  stage: pinterest | commons | official | index
    pinterest: run the per-member search queries, then index sidecars
    commons:   CC-licensed photos of the member from Wikimedia Commons, bucketed by capture date
    official:  release artwork from aespa-official.jp (member=group; winter-solo -> winter)
    index:     re-scan existing Pinterest sidecars on disk and rewrite the work files (no network)
Files land in <raw_dir>/<era>/<member>/<stage>/; work files are <work_dir>/images/<stage>-<era>-<member>.json
(list of image entries with paths relative to raw_dir, plus the `slug` and `member`).
Budget: MEMBER_BYTE_CAP per member (all eras), ERA_BYTE_CAP per era+member; Pinterest 429/403 trigger
backoff; eras still blocked after retries are recorded in <work_dir>/pinterest-blocks-<member>.json
and retried once at the end of the run.
"""
import argparse
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
COMMONS_UA = "winter-fansite-collector/0.2 (personal fansite; austinsenna@gmail.com)"
PIN_RANGE = "1-120"
MEMBER_BYTE_CAP = 500 * 1024 * 1024      # per member, all eras, all sources
ERA_BYTE_CAP = 32 * 1024 * 1024          # per era+member, keeps the budget spread across eras
BLOCK_RE = re.compile(r"(429|403|too many requests|rate limit|captcha|blocked|access denied)", re.I)
BLOCK_BACKOFF = (90, 180, 360)           # seconds between retries of a blocked query
SSL_CTX = ssl.create_default_context(cafile=certifi.where())
MEMBER_ORDER = ["karina", "giselle", "winter", "ningning", "group"]


def http_get(url: str,
    ua: str = UA,
    timeout: int = 60,
) -> bytes:
    """GET a URL and return the body."""
    req = urllib.request.Request(url, headers={"User-Agent": ua})
    with urllib.request.urlopen(req, timeout=timeout, context=SSL_CTX) as r:
        return r.read()


def tree_bytes(path: str) -> int:
    """Total bytes under a directory (0 if missing)."""
    total = 0
    for root, _, files in os.walk(path):
        for f in files:
            try:
                total += os.path.getsize(os.path.join(root, f))
            except OSError:
                pass
    return total


def member_bytes(raw_dir: str,
    member: str,
) -> int:
    """Bytes stored for one member across all eras."""
    return sum(tree_bytes(p) for p in glob.glob(os.path.join(raw_dir, "*", member)))


def rel(path: str,
    raw_dir: str,
) -> str:
    """Path relative to raw_dir."""
    return os.path.relpath(path, raw_dir)


def log(msg: str) -> None:
    """Timestamped stderr line."""
    print(time.strftime("%H:%M:%S"), msg, file=sys.stderr, flush=True)


def write_work(work_dir: str,
    stage: str,
    slug: str,
    member: str,
    entries: list,
    errors: list,
    extra: dict | None = None,
) -> None:
    """Write one work file."""
    out_dir = os.path.join(work_dir, "images")
    os.makedirs(out_dir, exist_ok=True)
    data = {"slug": slug, "member": member, "stage": stage, "entries": entries, "errors": errors}
    if extra:
        data.update(extra)
    with open(os.path.join(out_dir, f"{stage}-{slug}-{member}.json"), "w") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)


# ---------------------------------------------------------------- pinterest
def pinterest_queries(cfg: dict,
    era: dict,
    member: str,
) -> list:
    """Build the Pinterest query list for one era+member."""
    if era.get("members") and member not in era["members"]:
        return []
    queries = list((era.get("memberPinterestQueries") or {}).get(member, []))
    if not era.get("members"):  # eras restricted to specific members use only their explicit queries
        kind = "group" if member == "group" else "member"
        name = cfg["members"][member]["name"]
        same_year = [e for e in cfg["eras"] if not e.get("members") and e["year"] == era["year"]]
        first_of_year = same_year and same_year[0]["slug"] == era["slug"]
        for t in cfg["pinterestQueryTemplates"][kind]:
            if "{year}" in t and not first_of_year:
                continue  # the year-wide query is run once per year, on that year's first era
            queries.append(t.format(member=name, title=era["shortTitle"], year=era["year"]))
    seen, out = set(), []
    for q in queries:
        k = q.lower().strip()
        if k not in seen:
            seen.add(k)
            out.append(q)
    return out


def index_pinterest(out_dir: str,
    raw_dir: str,
    member: str,
) -> list:
    """Build entries from the gallery-dl sidecars in out_dir."""
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
        board = (m.get("board") or {}).get("name")
        entries.append({
            "file": rel(img_path, raw_dir),
            "member": member,
            "sourceUrl": orig.get("url") or m.get("url"),
            "pageUrl": f"https://www.pinterest.com/pin/{m.get('id')}/",
            "pinId": str(m.get("id")),
            "source": "pinterest",
            "width": orig.get("width") or m.get("width"),
            "height": orig.get("height") or m.get("height"),
            "credit": f"pinterest:{pinner}" if pinner else None,
            "originLink": m.get("link") or None,
            "title": (m.get("grid_title") or m.get("title") or "").strip() or None,
            "description": (m.get("description") or "").strip() or None,
            "board": (board or "").strip() or None,
            "altText": (m.get("auto_alt_text") or m.get("seo_alt_text") or "").strip() or None,
            "pinnedAt": m.get("created_at") or None,
        })
    return entries


def run_gdl(query: str,
    out_dir: str,
    archive: str,
) -> tuple[str, str]:
    """Run one gallery-dl Pinterest search. Returns (status, detail) with status ok|partial|blocked|error|timeout."""
    url = "https://www.pinterest.com/search/pins/?q=" + urllib.parse.quote(query)
    cmd = [GDL, "--range", PIN_RANGE, "--write-metadata", "--no-mtime",
           "--download-archive", archive,
           "--sleep-request", "1.0-2.5", "--sleep", "0.3-0.8", "--sleep-429", "60",
           "--retries", "3",
           "-o", "extractor.pinterest.videos=false",
           "--filter", "extension in ('jpg', 'jpeg', 'png', 'webp')",
           "-D", out_dir, "-f", "{id}.{extension}", url]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=1500)
    except subprocess.TimeoutExpired:
        return "timeout", query
    err = res.stderr.strip()
    tail = err[-400:]
    if BLOCK_RE.search(err) and res.returncode != 0:
        return "blocked", f"rc={res.returncode}: {tail}"
    if res.returncode == 0:
        return "ok", tail
    # gallery-dl exit codes: 4 http error, 8 not found, 16 ..., 64 no extractor; 403 on a single
    # original file is common and not a block when the run otherwise completed
    if BLOCK_RE.search(err) and err.count("403") <= 3 and "429" not in err:
        return "partial", f"rc={res.returncode}: {tail}"
    if BLOCK_RE.search(err):
        return "blocked", f"rc={res.returncode}: {tail}"
    return "error", f"rc={res.returncode}: {tail}"


def pinterest(cfg: dict,
    era: dict,
    member: str,
    raw_dir: str,
    work_dir: str,
    blocks: list,
) -> tuple[list, list, dict]:
    """Run every Pinterest query for era+member with budget and block handling."""
    out_dir = os.path.join(raw_dir, era["slug"], member, "pinterest")
    archive = os.path.join(work_dir, f"pinterest-archive-{member}.sqlite3")
    errors, stats = [], {"queries": [], "blocked": 0, "newFiles": 0}
    queries = pinterest_queries(cfg, era, member)
    if not queries:
        return [], [], stats
    os.makedirs(out_dir, exist_ok=True)
    for q in queries:
        era_size = tree_bytes(os.path.join(raw_dir, era["slug"], member))
        if era_size > ERA_BYTE_CAP:
            log(f"  era cap {era_size >> 20} MB reached for {era['slug']}/{member}; skipping remaining queries")
            stats["eraCapHit"] = True
            break
        if member_bytes(raw_dir, member) > MEMBER_BYTE_CAP:
            stats["memberCapHit"] = True
            break
        before = len(glob.glob(os.path.join(out_dir, "*.json")))
        status, detail = "", ""
        for attempt, backoff in enumerate((0,) + BLOCK_BACKOFF):
            if backoff:
                log(f"  blocked on '{q}', backing off {backoff}s (attempt {attempt})")
                time.sleep(backoff)
            status, detail = run_gdl(q, out_dir, archive)
            if status != "blocked":
                break
        after = len(glob.glob(os.path.join(out_dir, "*.json")))
        stats["queries"].append({"q": q, "status": status, "new": after - before})
        stats["newFiles"] += after - before
        if status == "blocked":
            stats["blocked"] += 1
            blocks.append({"era": era["slug"], "member": member, "query": q, "detail": detail,
                           "at": time.strftime("%Y-%m-%dT%H:%M:%S")})
            errors.append(f"blocked: {q}: {detail}")
            log(f"  still blocked on '{q}', moving on")
            break  # do not hammer the same endpoint; later eras continue, this one is retried at the end
        if status in ("error", "timeout", "partial"):
            errors.append(f"{status}: {q}: {detail}")
        elif detail:
            errors.append(f"stderr: {q}: {detail}")
        log(f"  '{q}': {status}, +{after - before} files")
        time.sleep(2.0)
    return index_pinterest(out_dir, raw_dir, member), errors, stats


# ------------------------------------------------------------------ commons
def commons_api(params: dict) -> dict:
    """Call the Commons API with 429 backoff."""
    params = dict(params, format="json", formatversion="2")
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
    for attempt in range(4):
        try:
            return json.loads(http_get(url, ua=COMMONS_UA))
        except urllib.error.HTTPError as ex:
            if ex.code == 429 and attempt < 3:
                time.sleep(10 * (attempt + 1))
                continue
            raise
    return {}


COMMONS_CATEGORY = {
    "karina": "Karina (singer)", "giselle": "Giselle (singer)", "winter": "Winter (singer)",
    "ningning": "Ningning", "group": "Aespa",
}


def commons_titles(cfg: dict,
    member: str,
) -> set:
    """Collect candidate File: titles for a member."""
    m = cfg["members"][member]
    titles = set()
    searches = [f"{m['name']} aespa", f"{m['korean']} aespa"] if member != "group" else ["aespa group", "에스파"]
    for s in searches:
        r = commons_api({"action": "query", "list": "search", "srsearch": s,
                         "srnamespace": "6", "srlimit": "100"})
        titles.update(x["title"] for x in r.get("query", {}).get("search", []))
        time.sleep(1.0)
    cat = COMMONS_CATEGORY[member]
    for y in range(2020, 2027):
        r = commons_api({"action": "query", "list": "categorymembers", "cmtype": "file",
                         "cmtitle": f"Category:{cat} in {y}", "cmlimit": "200"})
        titles.update(x["title"] for x in r.get("query", {}).get("categorymembers", []))
        time.sleep(1.0)
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
        time.sleep(1.0)
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
    for rx, century in ((YYYYMMDD_RE, 0), (YYMMDD_RE, 2000)):
        m = rx.search(title)
        if m:
            try:
                return date(century + int(m[1]), int(m[2]), int(m[3]))
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


def title_names_member(cfg: dict,
    title: str,
    member: str,
) -> bool:
    """True if a Commons title names this member (group: names aespa)."""
    tl = title.lower()
    return any(a.lower() in tl for a in cfg["members"][member]["aliases"])


def commons(cfg: dict,
    eras: list,
    member: str,
    raw_dir: str,
) -> tuple[dict, list]:
    """Download Commons photos of a member, bucketed by era. Returns ({slug: entries}, errors)."""
    errors = []
    titles = sorted(commons_titles(cfg, member))
    by_era = {}
    others = [m for m in cfg["members"] if m not in (member, "group")]
    for page, ii in commons_info(titles):
        title = page["title"]
        tl = title.lower()
        if "signature" in tl or "sign (" in tl or "logo" in tl:
            continue
        if not title_names_member(cfg, title, member):
            continue
        if member != "group" and sum(title_names_member(cfg, title, o) for o in others) >= 1 \
                and not title_names_member(cfg, title, member):
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
        out_dir = os.path.join(raw_dir, slug, member, "commons")
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
            "member": member,
            "sourceUrl": url,
            "pageUrl": ii.get("descriptionurl"),
            "source": "commons",
            "width": w,
            "height": h,
            "license": strip_html((em.get("LicenseShortName") or {}).get("value")),
            "licenseUrl": strip_html((em.get("LicenseUrl") or {}).get("value")) or None,
            "credit": strip_html((em.get("Artist") or {}).get("value")) or None,
            "title": title,
            "description": strip_html((em.get("ImageDescription") or {}).get("value")) or None,
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
) -> tuple[str, list, list]:
    """Pull release artwork from aespa-official.jp. Returns (member, entries, errors)."""
    entries, errors = [], []
    member = "winter" if era.get("solo") else "group"
    pages = [f"https://aespa-official.jp/discography/{s}/" for s in JP_SLUGS.get(era["slug"], [])]
    if era.get("solo"):
        pages = ["https://aespa-official.jp/profile/winter/", "https://aespa-official.jp/"]
    out_dir = os.path.join(raw_dir, era["slug"], member, "official")
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
            if not os.path.exists(dest):
                try:
                    data = http_get(u)
                    with open(dest, "wb") as f:
                        f.write(data)
                except Exception as ex:
                    errors.append(f"{u}: {ex}")
                    continue
            entries.append({
                "file": rel(dest, raw_dir),
                "member": member,
                "sourceUrl": u,
                "pageUrl": page_url,
                "source": "official",
                "width": None,
                "height": None,
                "credit": "SM Entertainment / aespa-official.jp",
                "title": f"{era['title']} release artwork (aespa-official.jp)",
            })
    return member, entries, errors


# --------------------------------------------------------------------- main
def parse_args() -> argparse.Namespace:
    """CLI."""
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--member", default="all", help="member slug or 'all'")
    ap.add_argument("eras")
    ap.add_argument("raw_dir")
    ap.add_argument("work_dir")
    ap.add_argument("stage", choices=["pinterest", "commons", "official", "index"])
    ap.add_argument("slugs", nargs="*", help="restrict to these era slugs")
    return ap.parse_args()


def main() -> None:
    """Entry point."""
    a = parse_args()
    with open(a.eras) as f:
        cfg = json.load(f)
    eras = cfg["eras"]
    members = MEMBER_ORDER if a.member == "all" else [a.member]
    for m in members:
        if m not in cfg["members"]:
            sys.exit(f"unknown member {m}; known: {', '.join(cfg['members'])}")
    only = set(a.slugs)
    eras = [e for e in eras if not only or e["slug"] in only]
    os.makedirs(a.work_dir, exist_ok=True)

    if a.stage == "official":
        for era in eras:
            log(f"== official {era['slug']}")
            member, entries, errors = official(era, a.raw_dir)
            write_work(a.work_dir, "official", era["slug"], member, entries, errors)
            log(f"  {len(entries)} entries, {len(errors)} errors")
        return

    for member in members:
        if a.stage == "commons":
            log(f"== commons {member}")
            by_era, errors = commons(cfg, cfg["eras"], member, a.raw_dir)
            for slug, entries in by_era.items():
                write_work(a.work_dir, "commons", slug, member, entries, [])
            with open(os.path.join(a.work_dir, "images", f"commons-errors-{member}.json"), "w") as f:
                json.dump(errors, f, indent=1)
            log(f"  {sum(len(v) for v in by_era.values())} files, {len(errors)} errors")
            continue
        if a.stage == "index":
            for era in eras:
                out_dir = os.path.join(a.raw_dir, era["slug"], member, "pinterest")
                if not os.path.isdir(out_dir):
                    continue
                entries = index_pinterest(out_dir, a.raw_dir, member)
                write_work(a.work_dir, "pinterest", era["slug"], member, entries, [])
                log(f"index {era['slug']}/{member}: {len(entries)} entries")
            continue
        # pinterest
        blocks_path = os.path.join(a.work_dir, f"pinterest-blocks-{member}.json")
        blocks = []
        pending = list(eras)
        for pass_no in (1, 2):
            retry = []
            for era in pending:
                if member_bytes(a.raw_dir, member) > MEMBER_BYTE_CAP:
                    log(f"member cap {MEMBER_BYTE_CAP >> 20} MB reached for {member}; stopping")
                    pending = []
                    break
                if not pinterest_queries(cfg, era, member):
                    continue
                log(f"== pinterest {era['slug']} / {member} (pass {pass_no})")
                before = len(blocks)
                entries, errors, stats = pinterest(cfg, era, member, a.raw_dir, a.work_dir, blocks)
                write_work(a.work_dir, "pinterest", era["slug"], member, entries, errors, {"stats": stats})
                log(f"  {len(entries)} entries on disk, {len(errors)} errors, {stats['newFiles']} new")
                for e in errors:
                    log("   ! " + e[:200].replace("\n", " "))
                if len(blocks) > before:
                    retry.append(era)
                with open(blocks_path, "w") as f:
                    json.dump(blocks, f, ensure_ascii=False, indent=1)
            if not retry or not pending:
                break
            log(f"{len(retry)} blocked eras; sleeping 300 s before retry pass")
            time.sleep(300)
            pending = retry
        log(f"done {member}: {member_bytes(a.raw_dir, member) >> 20} MB on disk, {len(blocks)} blocked queries")


if __name__ == "__main__":
    main()
