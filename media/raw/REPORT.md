# aespa media collection report (all members)

Status: FETCH COMPLETE for all members. The five per-member Pinterest collectors, the video
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
  `--range 1-60` per query (120 was tried first, then 30; the controller settled on 60 with a 120 MB per era+member cap and 1.5 GB per member so every era gets all five queries) with `--write-metadata` sidecars, gallery-dl `--download-archive` per member
  (cross-era pin dedupe), pacing (`--sleep-request 1-2.5`, `--sleep 0.3-0.8`, `--sleep-429 60`), block
  detection (429/403/captcha in stderr -> backoff 90/180/360 s, then the era is skipped and retried once at the
  end after 300 s; blocks logged to `work/pinterest-blocks-<member>.json`). Budget: 1.5 GB per member total,
  120 MB per era+member so the budget spreads over all 17 eras instead of exhausting on the first ones (in
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

Filled 2026-10-06 from `report_stats.py` after the collectors exited at 01:03 local; finisher (verify, qc, build_manifest) completed 05:19 UTC.

| era | member | fetched | manifest | small | dupe | blurry | member-mm | era-mm | unverified | pins/queries blocked | MB |
|---|---|---|---|---|---|---|---|---|---|---|---|
| black-mamba | karina | 326 | 120 | 73 | 110 | 4 | 11 | 22 | 105 | 5 q, 0 blocked | 79 |
| black-mamba | giselle | 315 | 120 | 71 | 66 | 2 | 7 | 16 | 81 | 5 q, 0 blocked | 82 |
| black-mamba | winter | 281 | 120 | 48 | 82 | 2 | 5 | 10 | 75 | 5 q, 0 blocked | 73 |
| black-mamba | ningning | 325 | 120 | 68 | 119 | 1 | 33 | 16 | 95 | 5 q, 0 blocked | 93 |
| black-mamba | group | 335 | 120 | 76 | 117 | 0 | 15 | 18 | 50 | 5 q, 0 blocked | 115 |
| forever | karina | 251 | 120 | 39 | 35 | 0 | 1 | 8 | 86 | 5 q, 0 blocked | 65 |
| forever | giselle | 261 | 120 | 40 | 38 | 3 | 1 | 22 | 75 | 5 q, 0 blocked | 82 |
| forever | winter | 332 | 120 | 78 | 85 | 4 | 2 | 3 | 99 | 6 q, 0 blocked | 78 |
| forever | ningning | 232 | 120 | 42 | 39 | 4 | 4 | 22 | 72 | 5 q, 0 blocked | 50 |
| forever | group | 230 | 120 | 53 | 66 | 0 | 15 | 6 | 30 | 5 q, 0 blocked | 47 |
| next-level | karina | 138 | 71 | 21 | 48 | 0 | 1 | 4 | 23 | 4 q, 0 blocked | 27 |
| next-level | giselle | 163 | 103 | 18 | 50 | 1 | 7 | 8 | 43 | 4 q, 0 blocked | 50 |
| next-level | winter | 148 | 77 | 32 | 46 | 0 | 7 | 1 | 39 | 4 q, 0 blocked | 32 |
| next-level | ningning | 134 | 66 | 29 | 47 | 0 | 9 | 4 | 41 | 4 q, 0 blocked | 39 |
| next-level | group | 176 | 76 | 32 | 86 | 2 | 8 | 5 | 16 | 4 q, 0 blocked | 48 |
| savage | karina | 160 | 74 | 26 | 65 | 1 | 3 | 9 | 36 | 4 q, 0 blocked | 50 |
| savage | giselle | 129 | 69 | 28 | 39 | 1 | 4 | 9 | 27 | 4 q, 0 blocked | 35 |
| savage | winter | 171 | 77 | 31 | 70 | 5 | 3 | 14 | 41 | 4 q, 0 blocked | 45 |
| savage | ningning | 153 | 81 | 23 | 56 | 0 | 18 | 6 | 38 | 4 q, 0 blocked | 37 |
| savage | group | 199 | 87 | 31 | 91 | 3 | 15 | 3 | 21 | 4 q, 0 blocked | 54 |
| dreams-come-true | karina | 131 | 51 | 25 | 63 | 0 | 12 | 1 | 44 | 4 q, 0 blocked | 35 |
| dreams-come-true | giselle | 123 | 67 | 19 | 39 | 1 | 16 | 0 | 34 | 4 q, 0 blocked | 36 |
| dreams-come-true | winter | 153 | 63 | 39 | 58 | 1 | 5 | 1 | 46 | 4 q, 0 blocked | 43 |
| dreams-come-true | ningning | 117 | 46 | 15 | 60 | 0 | 22 | 0 | 34 | 4 q, 0 blocked | 43 |
| dreams-come-true | group | 152 | 72 | 23 | 61 | 0 | 12 | 1 | 18 | 4 q, 0 blocked | 48 |
| girls | karina | 184 | 120 | 25 | 30 | 0 | 0 | 12 | 40 | 5 q, 0 blocked | 55 |
| girls | giselle | 152 | 110 | 25 | 22 | 5 | 0 | 19 | 37 | 5 q, 0 blocked | 49 |
| girls | winter | 282 | 120 | 44 | 59 | 1 | 0 | 15 | 77 | 7 q, 0 blocked | 82 |
| girls | ningning | 165 | 108 | 31 | 28 | 1 | 1 | 18 | 33 | 5 q, 0 blocked | 51 |
| girls | group | 155 | 106 | 31 | 23 | 4 | 3 | 18 | 18 | 5 q, 0 blocked | 65 |
| my-world | karina | 218 | 120 | 24 | 55 | 1 | 1 | 7 | 67 | 5 q, 0 blocked | 59 |
| my-world | giselle | 195 | 120 | 36 | 32 | 2 | 0 | 11 | 44 | 5 q, 0 blocked | 47 |
| my-world | winter | 255 | 120 | 33 | 49 | 2 | 0 | 5 | 78 | 6 q, 0 blocked | 69 |
| my-world | ningning | 218 | 120 | 37 | 62 | 0 | 1 | 7 | 58 | 5 q, 0 blocked | 67 |
| my-world | group | 214 | 120 | 26 | 54 | 0 | 9 | 12 | 31 | 5 q, 0 blocked | 75 |
| better-things | karina | 146 | 91 | 27 | 36 | 1 | 2 | 5 | 42 | 4 q, 0 blocked | 47 |
| better-things | giselle | 138 | 95 | 32 | 20 | 0 | 1 | 0 | 38 | 4 q, 0 blocked | 44 |
| better-things | winter | 151 | 72 | 31 | 58 | 0 | 0 | 2 | 33 | 4 q, 0 blocked | 73 |
| better-things | ningning | 144 | 74 | 36 | 43 | 1 | 5 | 3 | 40 | 4 q, 0 blocked | 39 |
| better-things | group | 179 | 107 | 33 | 53 | 1 | 8 | 0 | 25 | 4 q, 0 blocked | 68 |
| drama | karina | 202 | 112 | 28 | 72 | 6 | 0 | 5 | 38 | 4 q, 0 blocked | 120 |
| drama | giselle | 133 | 95 | 24 | 16 | 4 | 1 | 7 | 16 | 4 q, 0 blocked | 55 |
| drama | winter | 215 | 120 | 30 | 66 | 8 | 0 | 4 | 29 | 5 q, 0 blocked | 89 |
| drama | ningning | 158 | 99 | 23 | 39 | 7 | 0 | 5 | 34 | 4 q, 0 blocked | 56 |
| drama | group | 221 | 120 | 25 | 61 | 1 | 18 | 6 | 15 | 4 q, 0 blocked | 127 |
| armageddon | karina | 187 | 120 | 26 | 39 | 4 | 0 | 2 | 37 | 5 q, 0 blocked | 65 |
| armageddon | giselle | 161 | 120 | 14 | 15 | 4 | 0 | 5 | 23 | 5 q, 0 blocked | 62 |
| armageddon | winter | 235 | 120 | 24 | 35 | 4 | 0 | 1 | 31 | 6 q, 0 blocked | 97 |
| armageddon | ningning | 177 | 120 | 21 | 37 | 9 | 0 | 4 | 19 | 5 q, 0 blocked | 86 |
| armageddon | group | 220 | 120 | 31 | 42 | 2 | 9 | 4 | 21 | 5 q, 0 blocked | 112 |
| whiplash | karina | 155 | 104 | 20 | 32 | 1 | 1 | 0 | 29 | 4 q, 0 blocked | 95 |
| whiplash | giselle | 129 | 95 | 11 | 24 | 0 | 1 | 1 | 22 | 4 q, 0 blocked | 65 |
| whiplash | winter | 169 | 114 | 22 | 39 | 1 | 2 | 2 | 13 | 4 q, 0 blocked | 64 |
| whiplash | ningning | 154 | 112 | 19 | 25 | 1 | 7 | 0 | 16 | 4 q, 0 blocked | 92 |
| whiplash | group | 89 | 71 | 6 | 13 | 2 | 3 | 0 | 2 | 1 q, 0 blocked | 129 |
| dirty-work | karina | 202 | 120 | 14 | 62 | 0 | 13 | 0 | 16 | 5 q, 0 blocked | 113 |
| dirty-work | giselle | 158 | 120 | 15 | 22 | 2 | 10 | 1 | 18 | 4 q, 0 blocked | 131 |
| dirty-work | winter | 193 | 105 | 27 | 71 | 4 | 10 | 0 | 22 | 5 q, 0 blocked | 115 |
| dirty-work | ningning | 176 | 101 | 18 | 58 | 2 | 19 | 2 | 21 | 5 q, 0 blocked | 102 |
| dirty-work | group | 188 | 120 | 16 | 53 | 0 | 3 | 0 | 9 | 4 q, 0 blocked | 126 |
| rich-man | karina | 171 | 120 | 21 | 23 | 5 | 7 | 1 | 22 | 4 q, 0 blocked | 75 |
| rich-man | giselle | 172 | 120 | 19 | 17 | 4 | 7 | 1 | 15 | 4 q, 0 blocked | 95 |
| rich-man | winter | 205 | 120 | 30 | 43 | 4 | 6 | 0 | 14 | 4 q, 0 blocked | 107 |
| rich-man | ningning | 186 | 120 | 21 | 49 | 1 | 21 | 0 | 17 | 4 q, 0 blocked | 93 |
| rich-man | group | 66 | 58 | 1 | 7 | 0 | 0 | 0 | 0 | 0 q, 0 blocked | 237 |
| attitude | karina | 103 | 84 | 8 | 12 | 0 | 0 | 4 | 30 | 5 q, 0 blocked | 22 |
| attitude | giselle | 103 | 81 | 16 | 7 | 3 | 0 | 15 | 31 | 5 q, 0 blocked | 38 |
| attitude | winter | 151 | 118 | 15 | 19 | 3 | 0 | 5 | 43 | 6 q, 0 blocked | 46 |
| attitude | ningning | 105 | 72 | 23 | 12 | 3 | 0 | 9 | 18 | 5 q, 0 blocked | 31 |
| attitude | group | 179 | 118 | 29 | 35 | 1 | 17 | 20 | 38 | 5 q, 0 blocked | 71 |
| lemonade | karina | 135 | 87 | 11 | 41 | 0 | 2 | 2 | 32 | 4 q, 0 blocked | 86 |
| lemonade | giselle | 135 | 98 | 21 | 20 | 0 | 5 | 0 | 20 | 4 q, 0 blocked | 102 |
| lemonade | winter | 164 | 102 | 15 | 51 | 0 | 2 | 0 | 27 | 4 q, 0 blocked | 98 |
| lemonade | ningning | 141 | 89 | 17 | 41 | 2 | 15 | 0 | 30 | 4 q, 0 blocked | 109 |
| lemonade | group | 176 | 104 | 12 | 63 | 1 | 5 | 0 | 11 | 4 q, 0 blocked | 140 |
| kiss-n-tell | karina | 133 | 76 | 26 | 37 | 0 | 0 | 1 | 28 | 4 q, 0 blocked | 84 |
| kiss-n-tell | giselle | 129 | 93 | 23 | 19 | 1 | 2 | 7 | 27 | 4 q, 0 blocked | 70 |
| kiss-n-tell | winter | 153 | 92 | 24 | 40 | 2 | 2 | 4 | 28 | 4 q, 0 blocked | 59 |
| kiss-n-tell | ningning | 130 | 81 | 23 | 32 | 2 | 2 | 0 | 26 | 4 q, 0 blocked | 92 |
| kiss-n-tell | group | 161 | 111 | 19 | 39 | 1 | 16 | 4 | 20 | 4 q, 0 blocked | 82 |
| winter-solo | winter | 241 | 120 | 23 | 58 | 4 | 1 | 22 | 75 | 6 q, 0 blocked | 71 |

| member | fetched | manifest | MB | blocked queries |
|---|---|---|---|---|
| karina | 2842 | 1590 | 1077 | 0 |
| giselle | 2596 | 1626 | 1042 | 0 |
| winter | 3499 | 1780 | 1242 | 0 |
| ningning | 2715 | 1529 | 1079 | 0 |
| group | 2940 | 1630 | 1545 | 0 |
| total | 14592 | 8155 | 5985 | |

flags over fetched files: {'small': 2262, 'dupe': 3746, 'blurry': 153, 'member-mismatch': 474, 'era-mismatch': 487, 'unverified': 2913, 'undecodable': 0}
videos: 770, by member {None: 191, 'winter': 169, 'karina': 150, 'ningning': 135, 'giselle': 125}, yt-thumbs 102 MB
raw total: 6094 MB
pinterest blocked queries: 0

