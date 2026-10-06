# Winter (aespa) media collection report

Generated: 2026-10-06T03:55:24+00:00
Root: `/Users/austinsenna/work/winter-fansite/media/raw/` (375M on disk, 331 videos, 674 manifest images across 17 eras)
Tools: `/Users/austinsenna/work/winter-fansite/media/tools/` (venv with yt-dlp 2026.08.19, gallery-dl 1.32.15, Pillow, certifi; ffmpeg present at /opt/homebrew/bin/ffmpeg but unused)

## What worked

- **YouTube (yt-dlp flat search)**: 3 to 11 searches per era (`... Winter fancam`, `... MV`, `... Winter focus`, plus per-track searches for the solo era). Results filtered to aespa-related titles, noise removed (reactions, lyric videos, teasers, covers, shorts), deduped, sorted by `view_count`, top 20 kept per era (official MVs always kept). Kind classification: `mv` (SMTOWN/aespa/label uploads), `performance` (dance practice, music shows, award shows, tour clips), `fancam`, `other`. Thumbnails downloaded for 331/331 videos (`maxresdefault.jpg`, fallback `hqdefault.jpg`) into `<era>/yt-thumbs/`. No video files downloaded.
- **Pinterest (gallery-dl, no login)**: search URLs worked without authentication. 40 pins per query, 1 to 2 queries per era, each with a `.json` sidecar (pin id, original URL, pinner, source link). Deduped across eras by pin id. Pinterest images are fan uploads: treat as reference material, copyright unverified.
- **Wikimedia Commons (API)**: 45 CC-licensed photos of Winter (CC BY 3.0 x16, CC BY 4.0 x12, CC BY-SA 2.0 x12, CC BY-SA 4.0 x4, CC BY 2.0 x1). Author, license and license URL recorded per image. Bucketed into eras by capture date (the era active on that date), so these are event/airport/press photos from the era window rather than concept photos. Downloaded at 2000px thumbnails to cap size.
- **Official (aespa-official.jp)**: one release-artwork image per release (2000x2000 webp) from the discography pages, plus Winter's profile image for the solo era. `aespa.smtown.com` does not resolve at all (connection failure, not a block). smtown.com redirects to smentertainment.com which has no per-era teaser galleries reachable without JS.

## What got blocked or needed workarounds

- **TLS on first run**: the python.org 3.14 framework build has no CA bundle, so urllib failed on every HTTPS fetch. Fixed by using `certifi` in both scripts (thumbnails and Commons/official were re-run; no data lost).
- **Commons 429 rate limit**: the first pass tripped "too many requests". Added 2 s pacing and 429 backoff; second pass completed with 0 errors.
- **Collaborative channel names**: yt-dlp now reports `"SMTOWN and aespa"` for co-uploaded MVs; exact-match on channel name missed every 2025-2026 MV. Classifier now splits on `and`/`,`.
- **Commons filenames**: thumbnail URLs carry a query string, which leaked into file extensions. Fixed by deriving the extension from MIME; files renamed in place.
- **Verification**: `file(1)` + Pillow decode + size check on all 1216 downloaded files; 1205 kept. Deleted 11: 8 Pinterest videos (.mp4 slipped through despite `videos=false`), 2 HEIC files Pillow cannot decode, 1 image under 300 px. Nothing else was rejected.
- **No official teaser/concept photo galleries** were collected: SM's teaser pages are not reachable server-side. For concept photos, the Pinterest set is the fallback; the manifest records `sourceUrl` and `pageUrl` so they can be re-fetched.
- **Attitude era**: only 11 qualifying videos. ATTITUDE is a Japanese anime tie-in single (Kill Blue opening) with no SMTOWN MV; the top result is the anime OP video (kind `other`). Pinterest gave 35 images.

## Eras verified / discovered

Dates verified against Wikipedia (aespa discography, Winter (singer)) and kprofiles:

- 2025: Dirty Work (2025-06-27, single album), Rich Man (2025-09-05, EP).
- **2026 (new, added as eras)**: ATTITUDE (2026-03-06, Japanese single, Kill Blue anime OP), **LEMONADE** (2026-05-29, 2nd full album, title track "Lemonade"; MV 86.9M views), KISS N TELL (2026-07-24, 1st Japanese mini album).
- Not added as an era (2024, Japanese): Hot Mess (2024-07-03). Artwork exists at aespa-official.jp/discography/hotmess/ if wanted.
- **Winter solo / OST / collabs** (all verified, listed in manifest `tracks`): Once Again w/ Ningning (2022-05-22, Our Blues OST), Floral Sense (Yesung feat. Winter, 2023-02-27), Win For You w/ Yim Siwan (2023-09-21), Nobody w/ Soyeon & Liz (2023-11-16), Voyage (2023-11-19, Castaway Diva OST), With You (2023-12-08, My Demon OST), Officially Cool w/ Bang Yedam (2024-04-02), Spark (2024-10-09), Hunjung Yeonsuh (2024-12-01, Lady Ok OST), On Such a Day (2025-04-19, Resident Playbook OST), BLUE (2025-11-17), Speed of Summer (2026-08-27, Dingo), Saddle Up (2026-09-14, SYNK: COMPLaeXITY special single).
- **"Sorry Not Sorry" does not exist** in any Winter discography source checked. Excluded.

## Counts per era

| era | release | videos | mv/perf/fancam/other | images (manifest) | official/commons/pinterest | >=1000px | image files on disk | MB |
|---|---|---|---|---|---|---|---|---|
| black-mamba | 2020-11-17 | 20 | 2/4/13/1 | 40 | 1/0/39 | 34 | 41 | 13 |
| forever | 2021-02-05 | 20 | 2/5/9/4 | 40 | 1/1/38 | 28 | 42 | 9 |
| next-level | 2021-05-17 | 20 | 2/4/13/1 | 40 | 1/0/39 | 29 | 41 | 8 |
| savage | 2021-10-05 | 20 | 2/6/12/0 | 40 | 1/2/37 | 27 | 43 | 13 |
| dreams-come-true | 2021-12-20 | 20 | 2/4/13/1 | 40 | 1/0/39 | 23 | 41 | 12 |
| girls | 2022-07-08 | 20 | 3/5/11/1 | 40 | 2/0/38 | 40 | 77 | 18 |
| my-world | 2023-05-08 | 20 | 3/3/14/0 | 40 | 2/1/37 | 40 | 81 | 25 |
| better-things | 2023-08-18 | 20 | 2/5/13/0 | 40 | 1/3/36 | 34 | 44 | 44 |
| drama | 2023-11-10 | 20 | 1/4/13/2 | 40 | 1/12/27 | 40 | 53 | 28 |
| armageddon | 2024-05-27 | 20 | 2/6/12/0 | 40 | 1/2/37 | 40 | 74 | 27 |
| whiplash | 2024-10-21 | 20 | 1/2/15/2 | 40 | 1/11/28 | 40 | 51 | 27 |
| dirty-work | 2025-06-27 | 20 | 2/4/13/1 | 40 | 1/0/39 | 30 | 41 | 32 |
| rich-man | 2025-09-05 | 20 | 2/3/12/3 | 40 | 1/11/28 | 39 | 52 | 30 |
| attitude | 2026-03-06 | 11 | 0/0/8/3 | 36 | 1/0/35 | 34 | 41 | 11 |
| lemonade | 2026-05-29 | 20 | 2/3/12/3 | 40 | 1/2/37 | 40 | 42 | 33 |
| kiss-n-tell | 2026-07-24 | 20 | 1/1/9/9 | 38 | 1/0/37 | 37 | 39 | 28 |
| winter-solo | 2022-05-22 | 20 | 8/3/7/2 | 40 | 1/0/39 | 40 | 71 | 25 |

Notes on the table: "images (manifest)" is capped at 40 per era (official first, then Commons, then Pinterest by resolution); "image files on disk" includes Pinterest extras beyond the cap and pins deduped into an earlier era. Those extras are valid, verified images but are not referenced by manifest.json; delete or raise `MAX_IMAGES_PER_ERA` in `build_manifest.py` as preferred. MB includes yt-thumbs and gallery-dl `.json` sidecars.

## Files

- `raw/manifest.json`: per-era `videos[]` (id, title, channel, viewCount, uploadDate, duration, kind, winterFocus, url, thumbnail) and `images[]` (file, sourceUrl, pageUrl, source, width, height, bytes, license/licenseUrl/credit/title where known). Paths are relative to `raw/`.
- `raw/<era>/yt-thumbs/<videoId>.jpg`, `raw/<era>/pinterest/<pinId>.<ext>` (+ `.json` sidecar), `raw/<era>/commons/<pageId>.<ext>`, `raw/<era>/official/<name>.webp`.
- `tools/eras.json` (era config and search queries), `tools/collect_videos.py`, `tools/collect_images.py`, `tools/verify_images.py`, `tools/build_manifest.py`, `tools/work/` (intermediate JSON and logs).

Re-run order: `collect_videos.py` -> `collect_images.py <stage>` -> `verify_images.py` -> `build_manifest.py`, all with `.venv/bin/python3 -I`.
