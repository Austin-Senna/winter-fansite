# Curator

Local tool for deciding which fetched images and videos the site uses, per era and member, and in what order. No dependencies beyond Node and macOS `sips`.

```sh
node tools/curator/server.mjs        # http://127.0.0.1:4747
```

Reads `media/raw/manifest.json`. Writes one file per era to `src/content/eras/<slug>.json` (autosaved about a second after each change) and `media/raw/<slug>/rejected.txt` so a re-fetch can skip rejected pins.

Layout: eras on the left, member tabs and Photos/Videos at the top, the grid in the middle, the kept list in order on the right (drag or use the arrows to reorder).

Keys: `K` keep, `X` reject, `U` unreview, `1` to `4` tag (teaser, stage, behind, fan), `M` cycle the member assignment, `E` move the image to another era, arrows move the selection, `Space` opens the full-size image or the video on YouTube, `S` saves now. Use the "unreviewed" filter to flow through a set: decided cards leave the view and the next one is selected.

Quality-control flags from the fetch (small, dupe, blurry, member-mismatch, era-mismatch) show on each card. Nothing is excluded automatically except in the manifest build.

"Export kept" resizes every kept photo of the current era to 1600 px on the long edge as JPEG into `public/media/<era>/<member>/NNN.jpg`, records the `src` on each kept item, and reports the size of `public/media` against the 400 MB budget. AVIF versions are produced later by the site build.

Thumbnails are generated on first view into `media/thumbs/` (gitignored).
