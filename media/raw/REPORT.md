# aespa media collection report (all members)

Status: PIPELINE GENERALIZED, FETCH IN PROGRESS. The five per-member Pinterest collectors, the video
collector and the Commons collector were launched as background processes at 00:15 local time and are
still running. verify -> qc -> build_manifest -> report tables must be run after they finish (commands below).
The previous Winter-only report is superseded; its findings (TLS/certifi, Commons 429 pacing, collaborative
channel names, era dates, Winter solo tracks) still hold.

## What changed in the pipeline (media/tools/)

- `eras.json`: new top-level `members` (slug, display name, Korean name, aliases incl. Japanese/Chinese),
  `pinterestQueryTemplates` (member: "aespa {member} {title}", "... teaser", "... stage", "... concept photo",
  "{member} aespa {year}"; group: 5 analogous queries), `videoQueryTemplates` ("aespa {title} {member} fancam",
  "{member} focus {title}"), `qcGenericTerms`. Per era: `shortTitle`, `year`, `qcTerms` (title tracks used by the
  era-mismatch check), `memberPinterestQueries` (the original Winter queries, kept as extras), and `members`
  (winter-solo is Winter-only). The `{year}` query runs once per year, on that year's first era.
- Layout: `raw/<era>/<member>/{pinterest,commons,official}/` plus `raw/<era>/yt-thumbs/`. `migrate_layout.py`
  moved the existing Winter files to `<era>/winter/`, release artwork to `<era>/group/official/`
  (winter-solo artwork stays under winter), and rewrote the work files to `images/<stage>-<era>-<member>.json`.
- `collect_images.py --member <slug|all>`: stages pinterest | commons | official | index. Pinterest runs
  `--range 1-120` per query with `--write-metadata` sidecars, gallery-dl `--download-archive` per member
  (cross-era pin dedupe), pacing (`--sleep-request 1-2.5`, `--sleep 0.3-0.8`, `--sleep-429 60`), block
  detection (429/403/captcha in stderr -> backoff 90/180/360 s, then the era is skipped and retried once at the
  end after 300 s; blocks logged to `work/pinterest-blocks-<member>.json`). Budget: 500 MB per member total,
  32 MB per era+member so the budget spreads over all 17 eras instead of exhausting on the first ones (in
  practice ~2 of the 5 queries run per era before the era cap). Commons is now per member
  (Category:<member> in <year> + name searches).
- `collect_videos.py --member <slug|all|base>`: base queries -> `work/videos/<era>.json`, member fancam
  queries -> `work/videos/<era>.<member>.json` (10 kept per member per era, preferring titles naming only
  that member). Every row has `member` (fancam/other naming exactly one member; null for MV/performance) and
  `membersNamed`.
- `verify_images.py`: recursive walk of the new layout; otherwise unchanged (deletes non-images, undecodable,
  < 300 px).
- `qc_images.py` (new, needs `imagehash` + numpy, installed in .venv): writes `raw/<era>/<member>/qc.json`
  and `work/qc-summary.json`. Flags: `small` (long edge < 1000), `dupe` (phash distance <= 6, global across
  eras and members, largest kept, `dupeOf` recorded), `blurry` (Laplacian variance on a 512 px grey copy
  < 40; calibrated on the 874 Winter images: p01 = 39, p05 = 110, p50 = 658; files at 12-36 were visually
  confirmed as upscaled video stills, a Commons portrait at 72 was fine), `member-mismatch` (sidecar
  title/description/board names another member alone, or for group a single member), `era-mismatch`
  (names another era's distinctive title track and not this era's; generic words like forever/girls/drama
  do not trigger), `unverified` (no metadata text). Only small/dupe/undecodable are excluded.
- `build_manifest.py --member`: merges base + member video files, `member` on every image and video,
  `qc` block on every image, pin-id dedupe across everything, `MAX_IMAGES_PER_MEMBER = 120` per era+member,
  per-era `members` summary (counts, flags, sources). Paths stay relative to raw/.
- `report_stats.py` (new): prints the member x era table, totals, sizes and blocked queries for this report.
- Initial QC on the existing Winter set (874 files): small 161, dupe 42, blurry 11, member-mismatch 2
  (Karina teaser photos in the Winter folder), era-mismatch 7 (e.g. Whiplash pins under Attitude), unverified 175.

## Run state and how to finish

Background processes (logs in `media/tools/work/`): `pinterest-{karina,giselle,winter,ningning,group}.log`,
`videos.log`, `commons.log`. Check with `pgrep -fl "collect_(images|videos)"`.

Then, from `media/tools/`:

```
.venv/bin/python3 -I verify_images.py ../raw work
.venv/bin/python3 -I qc_images.py eras.json ../raw work
.venv/bin/python3 -I build_manifest.py eras.json ../raw work
.venv/bin/python3 -I report_stats.py eras.json ../raw work   # paste the tables below
```

## Exact re-run commands (full pipeline)

```
cd media/tools
for m in karina giselle winter ningning group; do
  nohup .venv/bin/python3 -I collect_images.py --member $m eras.json ../raw work pinterest > work/pinterest-$m.log 2>&1 &
done
nohup .venv/bin/python3 -I collect_videos.py --member all eras.json ../raw work > work/videos.log 2>&1 &
nohup .venv/bin/python3 -I collect_images.py --member all eras.json ../raw work commons > work/commons.log 2>&1 &
.venv/bin/python3 -I collect_images.py eras.json ../raw work official          # artwork, already done, idempotent
# after the background jobs exit:
.venv/bin/python3 -I verify_images.py ../raw work
.venv/bin/python3 -I qc_images.py eras.json ../raw work
.venv/bin/python3 -I build_manifest.py eras.json ../raw work
.venv/bin/python3 -I report_stats.py eras.json ../raw work
```
`collect_images.py ... index` re-indexes Pinterest sidecars without network; `qc_images.py ... --calibrate 40`
prints the blur distribution.

## Per member x era table, Pinterest blocks, total size

TO FILL from `report_stats.py` once the collectors finish.
