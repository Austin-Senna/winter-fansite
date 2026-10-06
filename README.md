# aespa fansite

Fan-made, Winter first. One page per era with photos, videos, music and story.

- `npm run dev` runs the site. `npm run build && npm run check:dist` builds and verifies every page exists.
- `npm run content` turns `media/raw/manifest.json` plus curator decisions into `src/content/eras/_generated/*.json` and resized images in `public/media`. Run it locally after fetching or curating, then commit the result.
- `node tools/curator/server.mjs` opens the curator at http://127.0.0.1:4747. See `tools/curator/README.md`.
- Media fetch and quality control live in `media/tools/`. See `media/raw/REPORT.md`.
- Deploys to GitHub Pages from `main` through `.github/workflows/pages.yml`. Pages must be enabled with the source set to GitHub Actions, and on a free plan the repository must be public.

Spec: `docs/superpowers/specs/2026-10-05-winter-fansite-design.md`. Plan: `docs/superpowers/plans/`.
