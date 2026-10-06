# aespa fansite: Astro site, phases 1, 2 and 4 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static Astro site with one themed page per aespa era (17), a portal home with an era timeline, member and about pages, built from curated or auto-selected media, deployable to GitHub Pages.

**Architecture:** Astro 7 static output. A local Node script turns `media/raw/manifest.json` plus any curator decisions in `src/content/eras/*.json` into committed content: per-era JSON in a content collection and resized local copies of self-hostable images in `public/media`. Pages render from the collection and from hand-written era/member data modules. One persistent WebGL2 canvas (ported from `demo/index.html`) re-themes per page; GSAP and Lenis drive motion; Pinterest images are hotlinked with credit, never re-hosted.

**Tech Stack:** Astro 7.x, TypeScript strict, GSAP 3.15 (SplitText, ScrambleText, ScrollTrigger), Lenis 1.3, lite-youtube-embed, sharp (Astro image service), node:test, macOS `sips` for the content script. Deploy: GitHub Actions to Pages.

**Spec:** `docs/superpowers/specs/2026-10-05-winter-fansite-design.md`

## Global Constraints

- Hosting is GitHub Pages: committed media under `public/media` stays under 400 MB; videos are YouTube embeds only.
- Self-host only official artwork, Wikimedia Commons CC photos and curator-kept images with an `src`. Every Pinterest image renders from its `sourceUrl` with a credit link to `pageUrl`.
- Copy is plain and factual: headings are nouns (Watch, Photocards, Listen, Story), intros one sentence or none, no slogans.
- Base palette tokens: `--bg #0B0B10`, `--ink #F3EFE6`, `--chrome-hi #DDE2EA`, `--chrome-lo #6E7480`, `--ice #A9D6FF`, `--violet #6A3FC9`, `--acid #B6FF3B`. Neon under 10 percent of surface.
- Type: Saira Condensed 800/900 display, Cormorant Garamond italic editorial, Inter body, JetBrains Mono HUD.
- `prefers-reduced-motion`: shader renders a still frame, text reveals are instant, Lenis off, holo tilt static.
- LCP is the era title or MV poster, never the canvas. No layout reads in scroll or pointermove handlers. Fixed aspect boxes on embeds.
- Initial JS on an era page under 150 KB gzip including GSAP plugins.
- Fan-sourced facts are labeled as such in copy. Only lore terms from the research brief are used.
- Keep imports at the top of files. Commit after each task with the attribution line `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Review Focus

1. An era with no curation file and no images for a member must render the Photocards section with that member's tab showing "No photos yet", not an empty grid or a crash. Pinned in Task 3 (`selectImages` returns `[]`) and Task 8.
2. A Pinterest image whose CDN URL has gone dead must not leave a broken image box: the card hides itself on `error`. Pinned in Task 8.
3. A browser without WebGL2 must show the CSS gradient fallback and every page must remain readable. Pinned in Task 5.
4. `prefers-reduced-motion` must still show the era title and HUD strip immediately (no empty title waiting on a scramble). Pinned in Task 6.
5. A curation file whose kept image has been deleted from `media/raw` must fail the content build with the file path named, not produce a page with a missing image. Pinned in Task 3.

---

### Task 1: Astro scaffold, tokens, base layout, Pages workflow

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `.nvmrc`
- Create: `src/styles/tokens.css`, `src/styles/global.css`
- Create: `src/layouts/Base.astro`
- Create: `src/pages/index.astro` (placeholder, replaced in Task 10)
- Create: `.github/workflows/pages.yml`
- Create: `scripts/check-dist.mjs`
- Modify: `.gitignore` (add `node_modules/`, `dist/`, `.astro/`)

**Interfaces:**
- Produces: `Base.astro` with props `{ title: string; description: string; theme?: EraTheme }` and a named slot `hud` plus default slot. `EraTheme` is defined in Task 2; until then Base accepts `theme?: { a: string; b: string; glow: string; ink: string; mode: 0|1|2|3 }` inline and Task 2 replaces it with the import.
- Produces: `npm run build` producing `dist/`, `npm run check:dist` asserting pages exist.

- [ ] **Step 1: Write package.json and config**

```json
{
  "name": "aespa-fansite",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "content": "node scripts/build-content.mjs",
    "test": "node --test tests/",
    "check:dist": "node scripts/check-dist.mjs"
  },
  "dependencies": {
    "astro": "^7.3.5",
    "gsap": "^3.15.0",
    "lenis": "^1.3.26",
    "lite-youtube-embed": "^0.3.3",
    "sharp": "^0.34.0"
  },
  "devDependencies": {
    "typescript": "^5.9.0"
  }
}
```

`astro.config.mjs`:
```js
import { defineConfig } from 'astro/config';

const repo = 'winter-fansite';
const isPages = process.env.GITHUB_ACTIONS === 'true' && !process.env.CUSTOM_DOMAIN;

export default defineConfig({
  site: process.env.SITE_URL || 'https://austin-senna.github.io',
  base: isPages ? `/${repo}` : '/',
  output: 'static',
  trailingSlash: 'always',
  image: { domains: ['i.pinimg.com', 'i.ytimg.com', 'upload.wikimedia.org'] },
  build: { inlineStylesheets: 'auto' },
});
```

`tsconfig.json`:
```json
{ "extends": "astro/tsconfigs/strict", "compilerOptions": { "strictNullChecks": true, "baseUrl": ".", "paths": { "@/*": ["src/*"] } }, "include": [".astro/types.d.ts", "src/**/*", "scripts/**/*", "tests/**/*"], "exclude": ["dist"] }
```

`.nvmrc`: `24`

- [ ] **Step 2: Install**

Run: `npm install`
Expected: `node_modules/astro/package.json` exists with version 7.x. If 7.3.5 is unavailable, `npm view astro version` and use the latest 7.

- [ ] **Step 3: Tokens and global CSS**

`src/styles/tokens.css`:
```css
:root{
  --bg:#0B0B10; --ink:#F3EFE6;
  --ink-dim:color-mix(in oklab,var(--ink) 62%,transparent);
  --chrome-hi:#DDE2EA; --chrome-lo:#6E7480; --ice:#A9D6FF; --violet:#6A3FC9; --acid:#B6FF3B;
  --era-a:#0A1E3F; --era-b:#A9D6FF; --era-glow:#FFFFFF;
  --surface:color-mix(in oklab,var(--ink) 7%,transparent);
  --line:color-mix(in oklab,var(--ink) 18%,transparent);
  --display:"Saira Condensed",system-ui,sans-serif;
  --serif:"Cormorant Garamond",Georgia,serif;
  --sans:"Inter",system-ui,sans-serif;
  --mono:"JetBrains Mono",ui-monospace,monospace;
  --gutter:clamp(16px,4vw,56px);
}
```

`src/styles/global.css`:
```css
@import './tokens.css';
*{box-sizing:border-box}
html,body{margin:0;background:var(--bg);color:var(--ink)}
body{font-family:var(--sans);font-size:16px;line-height:1.5;overflow-x:hidden;-webkit-font-smoothing:antialiased}
a{color:inherit}
::selection{background:var(--era-b);color:var(--bg)}
:focus-visible{outline:2px solid var(--ice);outline-offset:4px}
main{position:relative;z-index:1}
.sec{padding:clamp(56px,10vh,120px) var(--gutter) 0}
.sec h2{font-family:var(--display);font-weight:800;text-transform:uppercase;letter-spacing:.02em;font-size:clamp(28px,4vw,56px);line-height:1;margin:0 0 .35em}
.sec .lede{font-family:var(--serif);font-style:italic;font-size:clamp(20px,2vw,28px);margin:0;max-width:40ch;color:var(--ink-dim)}
.chrome{background:linear-gradient(170deg,var(--chrome-hi) 0%,#fff 18%,var(--chrome-lo) 42%,var(--chrome-hi) 60%,var(--chrome-lo) 100%);background-size:200% 200%;-webkit-background-clip:text;background-clip:text;color:transparent}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
```

- [ ] **Step 4: Base layout**

`src/layouts/Base.astro`:
```astro
---
import '@/styles/global.css';
interface Theme { a: string; b: string; glow: string; ink: string; mode: 0 | 1 | 2 | 3 }
interface Props { title: string; description: string; theme?: Theme }
const { title, description, theme } = Astro.props;
const t = theme ?? { a: '#0A1E3F', b: '#A9D6FF', glow: '#FFFFFF', ink: '#F3EFE6', mode: 0 };
const base = import.meta.env.BASE_URL;
---
<!doctype html>
<html lang="en" data-mode={t.mode} style={`--era-a:${t.a};--era-b:${t.b};--era-glow:${t.glow};--ink:${t.ink}`}>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title}</title>
  <meta name="description" content={description} />
  <link rel="icon" href={`${base}favicon.svg`} type="image/svg+xml" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Saira+Condensed:wght@800;900&family=Cormorant+Garamond:ital,wght@1,400;1,500&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet" />
</head>
<body>
  <slot name="hud" />
  <main id="top"><slot /></main>
</body>
</html>
```

`public/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#0B0B10"/><text x="32" y="46" font-family="Georgia,serif" font-style="italic" font-size="40" text-anchor="middle" fill="#F3EFE6">æ</text></svg>
```

Placeholder `src/pages/index.astro`:
```astro
---
import Base from '@/layouts/Base.astro';
---
<Base title="aespa" description="Fan-made aespa site, Winter first.">
  <section class="sec"><h1 class="chrome" style="font-family:var(--display);font-size:20vw;line-height:.86;text-transform:uppercase;margin:0">aespa</h1></section>
</Base>
```

- [ ] **Step 5: Dist check script (the test for this task)**

`scripts/check-dist.mjs`:
```js
import fs from 'node:fs';
import path from 'node:path';
const dist = path.resolve('dist');
const required = (process.argv.slice(2).length ? process.argv.slice(2) : ['index.html']);
let fail = false;
for (const rel of required) {
  const p = path.join(dist, rel);
  if (!fs.existsSync(p)) { console.error('missing', rel); fail = true; continue; }
  const html = fs.readFileSync(p, 'utf8');
  if (!/<title>[^<]+<\/title>/.test(html)) { console.error('no title', rel); fail = true; }
}
if (fail) process.exit(1);
console.log('dist ok:', required.length, 'pages');
```

- [ ] **Step 6: Run build and check**

Run: `npm run build && npm run check:dist`
Expected: `dist ok: 1 pages`

- [ ] **Step 7: Pages workflow**

`.github/workflows/pages.yml`:
```yaml
name: Deploy to GitHub Pages
on:
  push: { branches: [main] }
  workflow_dispatch:
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: true }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24, cache: npm }
      - run: npm ci
      - run: npm run build
      - run: npm run check:dist
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: ${{ steps.deployment.outputs.page_url }} }
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 8: Gitignore and commit**

Append to `.gitignore`: `node_modules/`, `dist/`, `.astro/` (node_modules and dist already present; add `.astro/`).

```bash
git add package.json package-lock.json astro.config.mjs tsconfig.json .nvmrc src public scripts .github .gitignore
git commit -m "Scaffold Astro site with tokens, base layout and Pages workflow

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Era and member data modules

**Files:**
- Create: `src/data/eras.ts`, `src/data/members.ts`, `src/data/types.ts`
- Test: `tests/data.test.mjs`

**Interfaces:**
- Produces:
```ts
export type Mode = 0 | 1 | 2 | 3; // chrome, matte, mono, candy
export interface EraTheme { a: string; b: string; glow: string; ink: string; mode: Mode }
export interface Era {
  slug: string; title: string; shortTitle: string; releaseDate: string; year: string; type: string;
  kicker: string; concept: string; theme: EraTheme;
  spotify: { album?: string; tracks?: { id: string; title: string }[] };
  story: { text: string[]; sources: { label: string; url: string }[]; loreStatus: 'season-1' | 'season-2' | 'none' };
  membersEra: boolean; // false for winter-solo
}
export const ERAS: Era[]; export function eraBySlug(slug: string): Era | undefined; export function nextEra(slug: string): Era;
export interface Member { slug: 'karina'|'giselle'|'winter'|'ningning'; name: string; hangul: string; born: string; birthplace: string; position: string; loreRole: string; loreNote: string; fanSourced: { symbol: string; color: string; animal: string }; solo: { title: string; date: string; note: string; spotifyTrack?: string }[]; moments: string[]; sources: { label: string; url: string }[] }
export const MEMBERS: Member[]; export function memberBySlug(slug: string): Member | undefined;
```

- [ ] **Step 1: Write the failing test**

`tests/data.test.mjs`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { ERAS, nextEra } from '../src/data/eras.ts';
import { MEMBERS } from '../src/data/members.ts';

const SLUGS = ['black-mamba','forever','next-level','savage','dreams-come-true','girls','my-world','better-things','drama','armageddon','whiplash','dirty-work','rich-man','attitude','lemonade','kiss-n-tell','winter-solo'];
const HEX = /^#[0-9A-F]{6}$/i;
const SPOTIFY = /^[0-9A-Za-z]{22}$/;

test('eras cover every fetched slug in release order', () => {
  assert.deepEqual(ERAS.map(e => e.slug), SLUGS);
  for (let i = 1; i < ERAS.length - 1; i++) assert.ok(ERAS[i-1].releaseDate <= ERAS[i].releaseDate, ERAS[i].slug);
});
test('every era has complete theme, spotify, story', () => {
  for (const e of ERAS) {
    for (const k of ['a','b','glow','ink']) assert.match(e.theme[k], HEX, `${e.slug} ${k}`);
    assert.ok([0,1,2,3].includes(e.theme.mode), e.slug);
    if (e.spotify.album) assert.match(e.spotify.album, SPOTIFY, e.slug);
    for (const t of e.spotify.tracks ?? []) assert.match(t.id, SPOTIFY, e.slug);
    assert.ok(e.spotify.album || e.spotify.tracks?.length, `${e.slug} has no spotify`);
    assert.ok(e.story.text.length >= 2 && e.story.sources.length >= 1, `${e.slug} story`);
    assert.ok(e.kicker.length > 0 && e.kicker.length < 80, e.slug);
    assert.ok(!/—/.test(e.kicker + e.story.text.join('')), `${e.slug} em dash`);
  }
});
test('nextEra wraps', () => {
  assert.equal(nextEra('black-mamba').slug, 'forever');
  assert.equal(nextEra('winter-solo').slug, 'black-mamba');
});
test('members are the four with lore roles and sources', () => {
  assert.deepEqual(MEMBERS.map(m => m.slug), ['karina','giselle','winter','ningning']);
  for (const m of MEMBERS) { assert.ok(m.loreRole && m.sources.length >= 1 && m.solo.length >= 1, m.slug); }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test tests/data.test.mjs`
Expected: FAIL, cannot find module `src/data/eras.ts`.

Note: Node 24 strips types natively; if the flag errors as unknown, drop it (it is on by default). Update `package.json` `test` script to `node --test tests/` and confirm `.ts` imports resolve; if not, add `--experimental-strip-types`.

- [ ] **Step 3: Write types and eras**

`src/data/types.ts`: the interfaces from the Interfaces block above, exported.

`src/data/eras.ts` (values from `docs/research/aespa-winter-brief.md` and `docs/research/members-storyline-spotify.md`):
```ts
import type { Era } from './types';

const src = (label: string, url: string) => ({ label, url });

export const ERAS: Era[] = [
  { slug: 'black-mamba', title: 'Black Mamba', shortTitle: 'Black Mamba', releaseDate: '2020-11-17', year: '2020', type: 'debut single',
    kicker: 'Debut. Four members, four æ, one villain.', concept: 'hyperreal æ arena',
    theme: { a: '#0A1E3F', b: '#A9D6FF', glow: '#FFFFFF', ink: '#F3EFE6', mode: 0 },
    spotify: { album: '3syEYrKIsgxaZMB5t1dVG7', tracks: [{ id: '1t2qYCAjUAoGfeFeoBlK51', title: 'Black Mamba' }] },
    story: { loreStatus: 'season-1', text: [
      'aespa debuted on November 17, 2020. The members meet their æ, digital counterparts generated from their data, through an app called SYNK.',
      'The Black Mamba, a shape-shifting entity in KWANGYA, interferes with the connection. The MV ends on a glitching, distorted figure: æ-Karina has been corrupted and the SYNK is severed.',
      'SM later released the ten-minute film "ep1. Black Mamba", which assigns each member a role in the story.' ],
      sources: [src('Wikipedia, Black Mamba (song)', 'https://en.wikipedia.org/wiki/Black_Mamba_(song)'), src('Good Morning America on ep1. Black Mamba', 'https://www.goodmorningamerica.com/culture/story/what-to-know-about-aespa-the-latest-kpop-girl-group-taking-the-world-by-storm-86215881')] },
    membersEra: true },
  { slug: 'forever', title: 'Forever', shortTitle: 'Forever', releaseDate: '2021-02-05', year: '2021', type: 'digital single',
    kicker: 'A remake of a 2000 SM winter ballad.', concept: 'soft white and blue',
    theme: { a: '#E8EEF5', b: '#9EC1E8', glow: '#FFFFFF', ink: '#1A1A1E', mode: 3 },
    spotify: { album: '3CExk4WgPxe0lOwoOhuMWj', tracks: [{ id: '26YNVqHuwAPeBVfDscTPds', title: 'Forever' }] },
    story: { loreStatus: 'none', text: [
      'Forever (약속) is a remake of Yoo Young-jin\'s 2000 SM winter song, released as a digital single on February 5, 2021.',
      'It sits outside the SMCU storyline. The video is a soft, pale interlude between Black Mamba and Next Level.' ],
      sources: [src('Wikipedia, aespa discography', 'https://en.wikipedia.org/wiki/Aespa_discography')] },
    membersEra: true },
  { slug: 'next-level', title: 'Next Level', shortTitle: 'Next Level', releaseDate: '2021-05-17', year: '2021', type: 'digital single',
    kicker: 'The road into KWANGYA.', concept: 'desert highway, Y2K cyber',
    theme: { a: '#C9A86A', b: '#1C6E73', glow: '#DDE2EA', ink: '#F3EFE6', mode: 0 },
    spotify: { album: '2CzbrboOLzeRoaaH1N5K0N', tracks: [{ id: '2zrhoHlFKxFTRF5aMyxMoQ', title: 'Next Level' }] },
    story: { loreStatus: 'season-1', text: [
      'SM called Next Level a sequel to Black Mamba, set after the connection to the æ was cut off. The members travel into the wilderness of KWANGYA to find the Black Mamba.',
      'The song remakes A$ton Wyld\'s track from Hobbs & Shaw. Lee Soo-man directed the performance and camera work.' ],
      sources: [src('Wikipedia, Next Level (aespa song)', 'https://en.wikipedia.org/wiki/Next_Level_(Aespa_song)')] },
    membersEra: true },
  { slug: 'savage', title: 'Savage', shortTitle: 'Savage', releaseDate: '2021-10-05', year: '2021', type: '1st mini album',
    kicker: 'First mini album. nævis opens the Port of Soul.', concept: 'liquid chrome, the P.O.S opens',
    theme: { a: '#3B0F6B', b: '#B6FF3B', glow: '#C9CED6', ink: '#F3EFE6', mode: 0 },
    spotify: { album: '3vyyDkvYWC36DwgZCYd3Wu', tracks: [{ id: '3dbLT62Cvs46Ju7a8gpr36', title: 'Savage' }] },
    story: { loreStatus: 'season-1', text: [
      'aespa enters KWANGYA with the help of nævis and faces the Black Mamba directly. The physical album versions were named P.O.S, Synk Dive and Hallucination Quest after the lore devices.',
      'Inside KWANGYA the members face hallucinations induced by the Black Mamba, and nævis makes sacrifices to guide them.',
      'The wormhole-shaped album case won the iF Design Award 2022 for packaging UX. Scanning the CD opened the P.O.S in AR.' ],
      sources: [src('Wikipedia, Savage (aespa EP)', 'https://en.wikipedia.org/wiki/Savage_(Aespa_EP)'), src('Korea JoongAng Daily, iF Design Award', 'https://www.koreajoongangdaily.com/entertainment/aespa-wins-user-experience-category-at-if-design-award/11260551')] },
    membersEra: true },
  { slug: 'dreams-come-true', title: 'Dreams Come True', shortTitle: 'Dreams', releaseDate: '2021-12-20', year: '2021', type: 'SM STATION single',
    kicker: 'A 1998 S.E.S. song, remade.', concept: 'retro 90s, gold on navy',
    theme: { a: '#1B1F3B', b: '#C9A24A', glow: '#F2E6C8', ink: '#F3EFE6', mode: 1 },
    spotify: { album: '4Jzx0XAORPKQ3v7EaL8Ful', tracks: [{ id: '6rVCUwfnuYTAsX4P9fIdIu', title: 'Dreams Come True' }] },
    story: { loreStatus: 'none', text: [
      'A remake of S.E.S.\'s 1998 song, released through SM STATION on December 20, 2021.',
      'No lore. The video plays the 1990s SM look straight: retro sets, soft focus, gold against navy.' ],
      sources: [src('Wikipedia, aespa discography', 'https://en.wikipedia.org/wiki/Aespa_discography')] },
    membersEra: true },
  { slug: 'girls', title: 'Girls', shortTitle: 'Girls', releaseDate: '2022-07-08', year: '2022', type: '2nd mini album',
    kicker: 'Second mini album. The Season 1 battle.', concept: 'glitch, digital landscapes, combat',
    theme: { a: '#FF2BD6', b: '#22E1FF', glow: '#FFFFFF', ink: '#F3EFE6', mode: 0 },
    spotify: { album: '4w1dbvUy1crv0knXQvcSeY', tracks: [{ id: '2WTHLEVjfefbGoW7F3dXIg', title: 'Girls' }, { id: '396FqjKmViUZ92Wmm4rx3i', title: 'Illusion' }] },
    story: { loreStatus: 'season-1', text: [
      'Girls closes Season 1 of the SM Culture Universe. The lyrics follow aespa and æ-aespa continuing their journey with nævis, and the MV stages the battle against the Black Mamba at full scale.',
      'Illusion, the pre-release, and the English single Life\'s Too Short are not lore tracks.' ],
      sources: [src('Bandwagon, Girls release', 'https://bandwagon.asia/articles/aespa-release-second-mini-album-girls-music-video-sm-entertainment-2022-smcu-listen'), src('Wikipedia, Girls (aespa EP)', 'https://en.wikipedia.org/wiki/Girls_(Aespa_EP)')] },
    membersEra: true },
  { slug: 'my-world', title: 'MY WORLD', shortTitle: 'MY WORLD', releaseDate: '2023-05-08', year: '2023', type: '3rd mini album',
    kicker: 'Third mini album. Spicy. The lore goes quiet.', concept: 'Y2K campus, cherry red, candy',
    theme: { a: '#FF3D7F', b: '#FFE066', glow: '#7CC6FF', ink: '#1A1A1E', mode: 3 },
    spotify: { album: '69xF8jTd0c4Zoo7DT3Rwrn', tracks: [{ id: '1ULdASrNy5rurl1TZfFaMP', title: 'Spicy' }, { id: '3q5qpprtugUIEPExuI7tRD', title: 'Welcome To MY World' }] },
    story: { loreStatus: 'season-2', text: [
      'SM framed MY WORLD as Season 2: the members travel from KWANGYA to the real world. Karina described it as going from warriors in a virtual world to looking like their peers.',
      'The pre-release Welcome To MY World invites nævis into the real world, after which an anomaly keeps occurring. That track is the only one that carries story.',
      'Spicy itself is a high-teen confidence anthem. Explicit lore stops here; from this point the concepts are theme-driven.' ],
      sources: [src('Korea Times, Welcome to MY World', 'https://www.koreatimes.co.kr/amp/entertainment/k-pop/20230509/welcome-to-my-world-aespa-invites-people-to-real-world'), src('Wikipedia, My World (aespa EP)', 'https://en.wikipedia.org/wiki/My_World_(Aespa_EP)')] },
    membersEra: true },
  { slug: 'better-things', title: 'Better Things', shortTitle: 'Better Things', releaseDate: '2023-08-18', year: '2023', type: 'English single',
    kicker: 'An English summer single.', concept: 'summer, yellow and sky',
    theme: { a: '#F4D35E', b: '#74B3CE', glow: '#FFFFFF', ink: '#1A1A1E', mode: 3 },
    spotify: { album: '1SHLOv0DDdRecK60z86Lth', tracks: [{ id: '6zZWoHlF2zNSLUNLvx4GUl', title: 'Better Things' }] },
    story: { loreStatus: 'none', text: [
      'Better Things is an English-language single released on August 18, 2023, ahead of the group\'s first US promotions.',
      'No lore. A bright, summer-toned video.' ],
      sources: [src('Wikipedia, aespa discography', 'https://en.wikipedia.org/wiki/Aespa_discography')] },
    membersEra: true },
  { slug: 'drama', title: 'Drama', shortTitle: 'Drama', releaseDate: '2023-11-10', year: '2023', type: '4th mini album',
    kicker: 'Fourth mini album. Red car, antlers, no lore.', concept: 'femme fatale cinema',
    theme: { a: '#B3121B', b: '#0B0B10', glow: '#D4AF37', ink: '#F3EFE6', mode: 1 },
    spotify: { album: '5NMtxQJy4wq3mpo3ERVnLs', tracks: [{ id: '5XWlyfo0kZ8LF7VSyfS4Ew', title: 'Drama' }] },
    story: { loreStatus: 'season-2', text: [
      'SM\'s teaser text has the members breaking out of the trauma left by Season 1\'s SYNK OUT and Hallucination Quest and the anomalies of Season 2, writing their stories in their own way. That is the only lore framing.',
      'The concept is cinema: gritty urban sets, a red car, deer antlers, and a femme fatale read that reviewers compared to Kill Bill. The lyric line is "every story begins with you".' ],
      sources: [src('Wikipedia, Drama (aespa EP)', 'https://en.wikipedia.org/wiki/Drama_(Aespa_EP)'), src('Hallyucon review', 'https://www.hallyucon.co.uk/post/aespa-drama-album-review')] },
    membersEra: true },
  { slug: 'armageddon', title: 'Armageddon', shortTitle: 'Armageddon', releaseDate: '2024-05-27', year: '2024', type: '1st full album',
    kicker: 'First full album. Supernova first, then Armageddon.', concept: 'industrial sci-fi, cosmic violet',
    theme: { a: '#2A1250', b: '#FF6A1A', glow: '#8A8F99', ink: '#F3EFE6', mode: 1 },
    spotify: { album: '4SboBpuYojDm02qS4iFeJC', tracks: [{ id: '5lKnZbdGCBViitE1Ce5TZh', title: 'Supernova' }, { id: '4b2fMv44GAYpsDSK4ihbsI', title: 'Armageddon' }] },
    story: { loreStatus: 'season-2', text: [
      'SM described the album as carrying the second season of the worldview, expanding into a multiverse beyond the real and digital worlds, under the slogan "I define myself".',
      'Supernova treats the stellar explosion as a door to another dimension and heralds the start of Season 2. Armageddon positions aespa as the predator. No named lore entity appears in either single.',
      'Spotify lists two full copies of this album; the one used here is the one whose tracks appear in aespa\'s top tracks.' ],
      sources: [src('Wikipedia, Armageddon (aespa album)', 'https://en.wikipedia.org/wiki/Armageddon_(Aespa_album)'), src('Seoulbeats on Supernova', 'https://seoulbeats.com/2024/05/supernova-is-campy-chaotic-and-peak-aespa/')] },
    membersEra: true },
  { slug: 'whiplash', title: 'Whiplash', shortTitle: 'Whiplash', releaseDate: '2024-10-21', year: '2024', type: '5th mini album',
    kicker: 'Fifth mini album. Runway, two sets, one palette.', concept: 'futuristic runway',
    theme: { a: '#000000', b: '#FFFFFF', glow: '#C9CED6', ink: '#F3EFE6', mode: 2 },
    spotify: { album: '7J41hCLBI2kEwL6RVSxfNx', tracks: [{ id: '3coRPMnFg2dJcPu5RMloa9', title: 'Whiplash' }] },
    story: { loreStatus: 'none', text: [
      'An EDM track with fast bass and house beats about moving forward on your own standards. No SMCU references.',
      'Directed by MELTMIRROR: two sets, a limited palette, chrome accessories, conceptual nails and glitch cut-ins timed to the beat. Preceded by the four solo tracks on SYNK : PARALLEL LINE.' ],
      sources: [src('Wikipedia, Whiplash (aespa EP)', 'https://en.wikipedia.org/wiki/Whiplash_(Aespa_EP)'), src('UCSD Guardian review', 'https://ucsdguardian.org/2024/11/09/aespa-shines-with-edgy-versatility-in-whiplash/')] },
    membersEra: true },
  { slug: 'dirty-work', title: 'Dirty Work', shortTitle: 'Dirty Work', releaseDate: '2025-06-27', year: '2025', type: '1st single album',
    kicker: 'First single album. Steel mill, mud, white uniforms.', concept: 'industrial grunge',
    theme: { a: '#8C4A2F', b: '#3A3F44', glow: '#E8E2D6', ink: '#F3EFE6', mode: 1 },
    spotify: { album: '3L7i2VqeznnAqX5BG6gm3H', tracks: [{ id: '4qtdab2DABnEokwupCl8lG', title: 'Dirty Work' }, { id: '6kBtuFVssWq2rORvq2ssXS', title: 'Dirty Work (feat. Flo Milli)' }] },
    story: { loreStatus: 'none', text: [
      'The MV was shot at a Hyundai Steel mill in Dangjin; the performance video was shot on iPhone 16 Pro with Apple. Teasers melted jewelry into the title logo.',
      'Karina pitched it as continuing aespa\'s metallic sound. Versions: Korean, featuring Flo Milli, English, instrumental. No lore.' ],
      sources: [src('Wikipedia, Dirty Work (aespa song)', 'https://en.wikipedia.org/wiki/Dirty_Work_(Aespa_song)')] },
    membersEra: true },
  { slug: 'rich-man', title: 'Rich Man', shortTitle: 'Rich Man', releaseDate: '2025-09-05', year: '2025', type: '6th mini album',
    kicker: 'Sixth mini album. A rock band in a cold-storage warehouse.', concept: 'rock band, ice and amber',
    theme: { a: '#DCE9F2', b: '#E0A33A', glow: '#1A1A1E', ink: '#1A1A1E', mode: 1 },
    spotify: { album: '3rUhGAdzBVzicwTPAVQjXu', tracks: [{ id: '2lzb0dgTFAfrHfzlZA9Hxw', title: 'Rich Man' }] },
    story: { loreStatus: 'none', text: [
      'Karina described Rich Man as a dance song with a rough guitar sound about self-confidence and self-love. "Rich" is framed as inner strength, not money.',
      'The trailer "I am a Rich Man" was directed by Yi Ok-seop with actor Koo Kyo-hwan in a freezing cold-storage warehouse with a bowling lane. To The Girls closes the album as a message to fans.' ],
      sources: [src('Wikipedia, Rich Man (EP)', 'https://en.wikipedia.org/wiki/Rich_Man_(EP)'), src('Dork, aespa on Rich Man', 'https://readdork.com/track/aespa-aespa-on-rich-man')] },
    membersEra: true },
  { slug: 'attitude', title: 'ATTITUDE', shortTitle: 'Attitude', releaseDate: '2026-03-06', year: '2026', type: 'Japanese digital single',
    kicker: 'Japanese single. The Kill Blue anime opening.', concept: 'anime blue, night',
    theme: { a: '#0E1B2A', b: '#4FB3FF', glow: '#FFFFFF', ink: '#F3EFE6', mode: 0 },
    spotify: { album: '39wwc39ALeKhi3LP1xerOw', tracks: [{ id: '6QIY4JAyzPH6UuFsyndaPs', title: 'ATTITUDE' }] },
    story: { loreStatus: 'none', text: [
      'ATTITUDE is the opening theme for the anime Kill Blue, released March 6, 2026, about nothing stopping you from being yourself.',
      'There is no SMTOWN music video; the anime opening carries the song. No lore.' ],
      sources: [src('Bandwagon, ATTITUDE', 'https://www.bandwagon.asia/articles/aespa-exude-attitude-for-kill-blue-anime-theme-song-listen')] },
    membersEra: true },
  { slug: 'lemonade', title: 'LEMONADE', shortTitle: 'Lemonade', releaseDate: '2026-05-29', year: '2026', type: '2nd full album',
    kicker: 'Second full album. WDA first, then Lemonade.', concept: 'glossy parallel world, candy',
    theme: { a: '#F7E85A', b: '#F6A9D8', glow: '#A8F0D1', ink: '#1A1A1E', mode: 3 },
    spotify: { album: '1GjT1mri5wvJAYZ3rnZamk', tracks: [{ id: '6vjt2smGK75oc9r2OGFfgp', title: 'LEMONADE' }, { id: '6QkyFjUMmncXzu6oSWKwHQ', title: 'WDA (Whole Different Animal) feat. G-DRAGON' }] },
    story: { loreStatus: 'season-2', text: [
      'WDA, the pre-release with G-DRAGON, returns to the worldview visually: a world where digital and physical blur, entities resembling aespa yet separate from them create conflict, and the group breaks through a fracture named Complaexity. That name became the 2026-27 tour.',
      'LEMONADE itself is a "when life gives you lemons" EDM track about turning hardship into opportunity: retro candy colors, mod silhouettes, lace boots. Features from Ty Dolla $ign and Becky G. Number nine on the Billboard 200.' ],
      sources: [src('Wikipedia, WDA', 'https://en.wikipedia.org/wiki/WDA_(Whole_Different_Animal)'), src('Wikipedia, Lemonade (aespa album)', 'https://en.wikipedia.org/wiki/Lemonade_(Aespa_album)'), src('Vogue Singapore on the styling', 'https://vogue.sg/aespa-lemonade-fashion/')] },
    membersEra: true },
  { slug: 'kiss-n-tell', title: 'KISS N TELL', shortTitle: 'Kiss n Tell', releaseDate: '2026-07-24', year: '2026', type: '1st Japanese mini album',
    kicker: 'First Japanese mini album. Pink, sweet, house-rooted.', concept: 'retro-futuristic pink',
    theme: { a: '#F6B8D8', b: '#2B2B3A', glow: '#FFFFFF', ink: '#1A1A1E', mode: 3 },
    spotify: { album: '5pwhf4kv2qX10i6k2uJsFp', tracks: [{ id: '3Fse9qXqMNey4TL5mLy8IF', title: 'KISS N TELL' }] },
    story: { loreStatus: 'none', text: [
      'The first Japanese mini album swaps the futuristic image for pink, sweet styling over a house-rooted dance-pop lead. Number one on Oricon.',
      'No lore.' ],
      sources: [src('Complex on KISS N TELL', 'https://www.complex.com/music/a/alex-ocho/aespa-kiss-n-tell-japanese-mini-album'), src('Oricon', 'https://www.oricon.co.jp/news/2460510/full/')] },
    membersEra: true },
  { slug: 'winter-solo', title: 'Winter', shortTitle: 'Winter solo', releaseDate: '2022-05-22', year: '2022-2026', type: 'solo, OST and collaborations',
    kicker: 'Spark, BLUE, Speed of Summer, Saddle Up, and the OSTs.', concept: 'ivory and ice',
    theme: { a: '#F3EFE6', b: '#A9D6FF', glow: '#FFFFFF', ink: '#1A1A1E', mode: 3 },
    spotify: { tracks: [
      { id: '2xoA126GEgFhrYzRaTH7E4', title: 'Spark (2024)' }, { id: '58awxGcVt7bQ9bahX7yWxt', title: 'BLUE (2025)' },
      { id: '3Aljxc4MlI98oUcPJrBwUD', title: 'Speed of Summer (2026)' }, { id: '7G8Ycb0hYdQ7cgjVvZ9fAL', title: 'Saddle Up (2026)' },
      { id: '2h81piRbzIJmjpxR4qnM2o', title: 'Serenade, with Karina (2026)' } ] },
    story: { loreStatus: 'none', text: [
      'Winter\'s solo catalog runs from the OST duet Once Again with Ningning in 2022 through Spark on SYNK : PARALLEL LINE (2024), BLUE on SYNK : aeXIS LINE (2025), the Dingo single Speed of Summer (August 2026) and Saddle Up on SYNK : COMPLæXITY (September 2026).',
      'Spark and BLUE are co-written. Speed of Summer is credited to a separate Spotify artist, WINTER, and was mastered at Abbey Road. No full solo album as of October 2026.' ],
      sources: [src('Wikipedia, Winter (singer)', 'https://en.wikipedia.org/wiki/Winter_(singer)'), src('Bandwagon on SYNK : COMPLæXITY solos', 'https://www.bandwagon.asia/articles/aespa-release-solo-tracks-from-synk-compl-xity-world-tour-listen')] },
    membersEra: false },
];

export function eraBySlug(slug: string): Era | undefined { return ERAS.find(e => e.slug === slug); }
export function nextEra(slug: string): Era { const i = ERAS.findIndex(e => e.slug === slug); return ERAS[(i + 1) % ERAS.length]; }
```

- [ ] **Step 4: Write members**

`src/data/members.ts` (from `docs/research/members-storyline-spotify.md` section B; powers beyond the role title are fan-sourced and labeled):
```ts
import type { Member } from './types';
const src = (label: string, url: string) => ({ label, url });
export const MEMBERS: Member[] = [
  { slug: 'karina', name: 'Karina', hangul: '카리나', born: '2000-04-11', birthplace: 'Suwon', position: 'leader, dancer, rapper, vocalist',
    loreRole: 'Rocket Puncher', loreNote: 'In the Black Mamba MV, æ-Karina is the avatar the Black Mamba corrupts, cutting the SYNK.',
    fanSourced: { symbol: 'heart', color: 'blue', animal: 'whale' },
    solo: [ { title: 'Up', date: '2024-10-09', note: 'SYNK : PARALLEL LINE. First solo top ten on Circle Digital.', spotifyTrack: '5sjnkOfTLCLNfkkchI2re2' }, { title: 'GOOD STUFF', date: '2025-11-17', note: 'SYNK : aeXIS LINE, co-written.', spotifyTrack: '19iJj3pCMwGxrA6pltPat3' }, { title: '16 Bit', date: '2026-09-14', note: 'SYNK : COMPLæXITY.', spotifyTrack: '5XwL05UFnI8UwaxMl2UzlC' }, { title: 'Serenade, with Winter', date: '2026-08-09', note: 'SYNK : aeXIS LINE sub-unit single.', spotifyTrack: '2h81piRbzIJmjpxR4qnM2o' } ],
    moments: ['Opening theme stage at the 2024 MAMA Awards in Osaka.', 'Nike global ambassador from July 2025, the first Korean celebrity in the role.', 'Member of SM supergroup Got the Beat.'],
    sources: [src('Wikipedia, Karina', 'https://en.wikipedia.org/wiki/Karina_(South_Korean_singer)'), src('Good Morning America on the lore roles', 'https://www.goodmorningamerica.com/culture/story/what-to-know-about-aespa-the-latest-kpop-girl-group-taking-the-world-by-storm-86215881')] },
  { slug: 'giselle', name: 'Giselle', hangul: '지젤', born: '2000-10-30', birthplace: 'Seoul, raised in Tokyo', position: 'rapper, vocalist',
    loreRole: 'Xenoglossy', loreNote: 'The ability to understand unlearned languages. First member shown in ep1. Black Mamba.',
    fanSourced: { symbol: 'crescent moon', color: 'black', animal: 'unicorn' },
    solo: [ { title: 'Dopamine', date: '2024-10-09', note: 'SYNK : PARALLEL LINE. Introspective R&B.', spotifyTrack: '6pIuPm3u7QgUFAX1V0D9wY' }, { title: 'Tornado', date: '2025-11-17', note: 'SYNK : aeXIS LINE. Tropical dance.', spotifyTrack: '09mT11oYwaa8geGu4UHpzL' }, { title: 'BYEB4HELLO', date: '2026-09-14', note: 'SYNK : COMPLæXITY.', spotifyTrack: '1fKmAGbPcYIA9lZXC73lwK' }, { title: 'Lollipop, with Ningning', date: '2026-08-09', note: 'SYNK : aeXIS LINE sub-unit single, co-written.', spotifyTrack: '1j2fdmjSCJZkfCLFKZTOpd' } ],
    moments: ['The "don\'t you know I\'m a savage" intro.', 'Loewe ambassador from 2024.', 'Trained only eleven months before debut.'],
    sources: [src('Wikipedia, Giselle', 'https://en.wikipedia.org/wiki/Giselle_(singer)')] },
  { slug: 'winter', name: 'Winter', hangul: '윈터', born: '2001-01-01', birthplace: 'Busan', position: 'vocalist, dancer',
    loreRole: 'Armamenter', loreNote: 'The one skilled in weaponry. æ-Winter wore silver-white hair in the ice-blue arena of the debut MV.',
    fanSourced: { symbol: 'star', color: 'ivory', animal: 'Siberian husky' },
    solo: [ { title: 'Spark', date: '2024-10-09', note: 'SYNK : PARALLEL LINE, co-written. Ethereal EDM.', spotifyTrack: '2xoA126GEgFhrYzRaTH7E4' }, { title: 'BLUE', date: '2025-11-17', note: 'SYNK : aeXIS LINE, co-written pop-rock.', spotifyTrack: '58awxGcVt7bQ9bahX7yWxt' }, { title: 'Speed of Summer', date: '2026-08-27', note: 'Dingo single, alternative punk rock, mastered at Abbey Road.', spotifyTrack: '3Aljxc4MlI98oUcPJrBwUD' }, { title: 'Saddle Up', date: '2026-09-14', note: 'SYNK : COMPLæXITY.', spotifyTrack: '7G8Ycb0hYdQ7cgjVvZ9fAL' }, { title: 'Serenade, with Karina', date: '2026-08-09', note: 'SYNK : aeXIS LINE sub-unit single.', spotifyTrack: '2h81piRbzIJmjpxR4qnM2o' }, { title: 'Once Again, with Ningning', date: '2022-05-22', note: 'Our Blues OST.' }, { title: 'With You', date: '2023-12-08', note: 'My Demon OST.' }, { title: 'Voyage', date: '2023-11-19', note: 'Castaway Diva OST.' } ],
    moments: ['Got the Beat "Step Back" fancam reached ten million views in 25 days.', 'Opened SYNK : Hyper Line (2023) with an electric guitar solo.', 'Best Popular Solo Female at the 2026 KM Chart Awards.'],
    sources: [src('Wikipedia, Winter (singer)', 'https://en.wikipedia.org/wiki/Winter_(singer)'), src('PAPER cover story', 'https://www.papermag.com/aespa-winter-cover')] },
  { slug: 'ningning', name: 'Ningning', hangul: '닝닝', born: '2002-10-23', birthplace: 'Harbin', position: 'vocalist, dancer, maknae',
    loreRole: 'e.D Hacker', loreNote: 'The hacker. Her powers vary across fan sources, so only the role title is stated here.',
    fanSourced: { symbol: 'butterfly', color: 'purple', animal: 'tiger' },
    solo: [ { title: 'Bored!', date: '2024-10-09', note: 'SYNK : PARALLEL LINE. R&B dance.', spotifyTrack: '44qlcokPO2RjD8791ohJFR' }, { title: 'Ketchup And Lemonade', date: '2025-11-17', note: 'SYNK : aeXIS LINE. Soft R&B.', spotifyTrack: '1D1cBWh7IJ5DqOIYqCtqZa' }, { title: 'I Love You But I Gotta Let You Go', date: '2026-09-14', note: 'SYNK : COMPLæXITY.', spotifyTrack: '4VHu6TXzapvQG6tURPVRXj' }, { title: 'Lollipop, with Giselle', date: '2026-08-09', note: 'SYNK : aeXIS LINE sub-unit single.', spotifyTrack: '1j2fdmjSCJZkfCLFKZTOpd' } ],
    moments: ['Coachella 2022 high notes went viral.', 'Versace (2024) and Gucci (2026) global ambassador.', 'Revealed as the third member on October 28, 2020.'],
    sources: [src('Wikipedia, Ningning', 'https://en.wikipedia.org/wiki/Ningning')] },
];
export function memberBySlug(slug: string): Member | undefined { return MEMBERS.find(m => m.slug === slug); }
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: 4 passing.

- [ ] **Step 6: Commit**

```bash
git add src/data tests/data.test.mjs package.json
git commit -m "Add era and member data modules with tests

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Content selection library and build-content script

**Files:**
- Create: `scripts/lib/select.mjs`, `scripts/build-content.mjs`
- Test: `tests/select.test.mjs`

**Interfaces:**
- Produces (pure, tested):
```js
// scripts/lib/select.mjs
export const MEMBERS = ['karina','giselle','winter','ningning','group'];
export function selectImages(manifestImages, curation, { member, limit = 24 })
//   -> Array<{ file, member, kind: 'local'|'remote', src?: string, remote?: string, pageUrl, credit, width, height, tags, license? }>
//   kept items from curation first in curation order; if curation has any 'keep' for this member, only kept items are returned;
//   otherwise auto-select: exclude qc flags small/dupe/blurry/member-mismatch/era-mismatch, exclude rejected, order official > commons > pinterest then by width desc, cut at limit.
//   kind: 'local' for official and commons (and for kept items with src), 'remote' for pinterest (remote = sourceUrl).
export function selectVideos(manifestVideos, curation, { limit = 12 })
//   -> Array<{ ytId, title, channel, kind, views, member }>: kept first in order, else mv first then by views desc; fancams kept only when member set.
export function eraContent(eraManifest, curation, opts) -> { slug, videos, images: { [member]: Image[] } }
```
- Produces (script): `npm run content` writes `src/content/eras/_generated/<slug>.json` and copies local images into `public/media/<slug>/<member>/<name>.jpg` at 1600 px via sips, and fails with the missing path if a kept file is absent.

- [ ] **Step 1: Write the failing tests**

`tests/select.test.mjs`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { selectImages, selectVideos } from '../scripts/lib/select.mjs';

const img = (o) => ({ file: 'e/winter/pinterest/1.jpg', member: 'winter', source: 'pinterest', sourceUrl: 'https://i.pinimg.com/x.jpg', pageUrl: 'https://pinterest.com/pin/1', credit: 'pinterest:a', width: 1600, height: 2000, qc: { flags: [] }, ...o });

test('auto-select excludes qc-failed and rejected, orders official > commons > pinterest > width', () => {
  const imgs = [
    img({ file: 'p-small', width: 600, qc: { flags: ['small'] } }),
    img({ file: 'p-dupe', qc: { flags: ['dupe'] } }),
    img({ file: 'p-wide', width: 3000 }),
    img({ file: 'p-narrow', width: 1200 }),
    img({ file: 'c1', source: 'commons', license: 'CC BY 4.0', credit: 'Someone' }),
    img({ file: 'o1', source: 'official', member: 'group' }),
    img({ file: 'p-rej' }),
  ];
  const out = selectImages(imgs, { images: [{ file: 'p-rej', state: 'reject' }] }, { member: 'winter' });
  assert.deepEqual(out.map(i => i.file), ['c1', 'p-wide', 'p-narrow']);
  assert.equal(out[0].kind, 'local'); assert.equal(out[1].kind, 'remote'); assert.equal(out[1].remote, 'https://i.pinimg.com/x.jpg');
});
test('group member gets official artwork', () => {
  const out = selectImages([img({ file: 'o1', source: 'official', member: 'group' })], null, { member: 'group' });
  assert.deepEqual(out.map(i => i.file), ['o1']);
});
test('curation keeps override auto-selection and carry order, tags and src', () => {
  const imgs = [img({ file: 'a' }), img({ file: 'b', width: 4000 }), img({ file: 'c' })];
  const cur = { images: [ { file: 'c', state: 'keep', order: 0, tags: ['stage'], member: 'winter', src: 'media/e/winter/001.jpg' }, { file: 'a', state: 'keep', order: 1, member: 'winter' } ] };
  const out = selectImages(imgs, cur, { member: 'winter' });
  assert.deepEqual(out.map(i => i.file), ['c', 'a']);
  assert.deepEqual(out[0].tags, ['stage']); assert.equal(out[0].kind, 'local'); assert.equal(out[0].src, 'media/e/winter/001.jpg');
  assert.equal(out[1].kind, 'remote');
});
test('limit applies to auto-selection only', () => {
  const imgs = Array.from({ length: 30 }, (_, i) => img({ file: 'f' + i, width: 1000 + i }));
  assert.equal(selectImages(imgs, null, { member: 'winter', limit: 5 }).length, 5);
});
test('empty when member has nothing', () => {
  assert.deepEqual(selectImages([img({})], null, { member: 'karina' }), []);
});
test('videos: mv first then views, fancams need member, curation order wins', () => {
  const vids = [
    { id: 'f', title: 'fancam', channel: 'x', viewCount: 9e6, kind: 'fancam', member: 'winter' },
    { id: 'p', title: 'perf', channel: 'y', viewCount: 5e6, kind: 'performance', member: null },
    { id: 'm', title: 'mv', channel: 'SMTOWN', viewCount: 1e6, kind: 'mv', member: null },
    { id: 'f2', title: 'fancam nobody', channel: 'x', viewCount: 9e6, kind: 'fancam', member: null },
  ];
  assert.deepEqual(selectVideos(vids, null, {}).map(v => v.ytId), ['m', 'f', 'p']);
  assert.deepEqual(selectVideos(vids, { videos: [{ id: 'p', state: 'keep', order: 0 }, { id: 'm', state: 'keep', order: 1 }] }, {}).map(v => v.ytId), ['p', 'm']);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/select.test.mjs`
Expected: FAIL, cannot find `scripts/lib/select.mjs`.

- [ ] **Step 3: Implement select.mjs**

```js
export const MEMBERS = ['karina', 'giselle', 'winter', 'ningning', 'group'];
const EXCLUDE = new Set(['small', 'dupe', 'blurry', 'member-mismatch', 'era-mismatch']);
const SOURCE_RANK = { official: 0, commons: 1, pinterest: 2, other: 3 };

function shape(i, extra = {}) {
  const local = i.source === 'official' || i.source === 'commons' || !!extra.src;
  return {
    file: i.file, member: extra.member || i.member || 'group',
    kind: local ? 'local' : 'remote',
    ...(local ? { src: extra.src } : { remote: i.sourceUrl }),
    pageUrl: i.pageUrl ?? null, credit: i.credit ?? null, width: i.width ?? null, height: i.height ?? null,
    tags: extra.tags ?? [], ...(i.license ? { license: i.license, licenseUrl: i.licenseUrl ?? null } : {}),
  };
}

export function selectImages(manifestImages, curation, { member, limit = 24 }) {
  const byFile = new Map(manifestImages.map(i => [i.file, i]));
  const decisions = curation?.images ?? [];
  const kept = decisions.filter(d => d.state === 'keep' && (d.member || byFile.get(d.file)?.member || 'group') === member)
    .sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9));
  if (kept.length) return kept.map(d => shape(byFile.get(d.file) ?? d.src ?? { file: d.file, source: d.source, sourceUrl: d.sourceUrl, pageUrl: d.pageUrl, credit: d.credit, width: d.width, height: d.height }, d));
  const rejected = new Set(decisions.filter(d => d.state === 'reject').map(d => d.file));
  return manifestImages
    .filter(i => i.file && (i.member || 'group') === member && !rejected.has(i.file) && !(i.qc?.flags ?? []).some(f => EXCLUDE.has(f)))
    .sort((a, b) => (SOURCE_RANK[a.source] ?? 3) - (SOURCE_RANK[b.source] ?? 3) || (b.width ?? 0) - (a.width ?? 0))
    .slice(0, limit)
    .map(i => shape(i));
}

export function selectVideos(manifestVideos, curation, { limit = 12 }) {
  const byId = new Map(manifestVideos.map(v => [v.id, v]));
  const kept = (curation?.videos ?? []).filter(d => d.state === 'keep').sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9));
  const toOut = v => ({ ytId: v.id, title: v.title, channel: v.channel, kind: v.kind, views: v.viewCount ?? 0, member: v.member ?? null });
  if (kept.length) return kept.map(d => byId.get(d.id)).filter(Boolean).map(toOut);
  const rejected = new Set((curation?.videos ?? []).filter(d => d.state === 'reject').map(d => d.id));
  return manifestVideos
    .filter(v => !rejected.has(v.id) && (v.kind !== 'fancam' || v.member))
    .sort((a, b) => (a.kind === 'mv' ? 0 : 1) - (b.kind === 'mv' ? 0 : 1) || (b.viewCount ?? 0) - (a.viewCount ?? 0))
    .slice(0, limit).map(toOut);
}

export function eraContent(eraManifest, curation, opts = {}) {
  const images = {};
  for (const m of MEMBERS) images[m] = selectImages(eraManifest.images ?? [], curation, { member: m, limit: opts.limit });
  return { slug: eraManifest.slug, videos: selectVideos(eraManifest.videos ?? [], curation, {}), images };
}
```

- [ ] **Step 4: Run tests**

Run: `node --test tests/select.test.mjs`
Expected: 6 passing. If the "curation keeps" test fails on `src` for item `c`, confirm `shape` receives `extra.src` (it does via `d`).

- [ ] **Step 5: Write build-content.mjs**

```js
#!/usr/bin/env node
// Local step: raw manifest + curator decisions -> committed content and local media.
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { eraContent, MEMBERS } from './lib/select.mjs';

const exec = promisify(execFile);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const RAW = path.join(ROOT, 'media', 'raw');
const CURATED = path.join(ROOT, 'src', 'content', 'eras');
const OUT = path.join(CURATED, '_generated');
const PUBLIC = path.join(ROOT, 'public', 'media');
const BUDGET = 400 * 1024 * 1024;

async function readJson(p) { return JSON.parse(await fs.readFile(p, 'utf8')); }
async function curationFor(slug) { const p = path.join(CURATED, slug + '.json'); return existsSync(p) ? readJson(p) : null; }

async function localize(slug, img, idx) {
  if (img.src) { // curator already exported
    if (!existsSync(path.join(ROOT, 'public', img.src))) throw new Error(`kept image missing on disk: public/${img.src} (from ${img.file})`);
    return img.src;
  }
  const srcPath = path.join(RAW, img.file);
  if (!existsSync(srcPath)) throw new Error(`image missing on disk: media/raw/${img.file}`);
  const dir = path.join(PUBLIC, slug, img.member);
  await fs.mkdir(dir, { recursive: true });
  const name = `${img.member}-${String(idx + 1).padStart(3, '0')}.jpg`;
  const out = path.join(dir, name);
  if (!existsSync(out)) await exec('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '85', '-Z', '1600', srcPath, '--out', out]);
  return path.posix.join('media', slug, img.member, name);
}

async function dirSize(d) { let t = 0; if (!existsSync(d)) return 0; for (const e of await fs.readdir(d, { withFileTypes: true })) { const p = path.join(d, e.name); t += e.isDirectory() ? await dirSize(p) : (await fs.stat(p)).size; } return t; }

const manifest = await readJson(path.join(RAW, 'manifest.json'));
await fs.mkdir(OUT, { recursive: true });
let totalImages = 0;
for (const era of manifest.eras) {
  const content = eraContent(era, await curationFor(era.slug), { limit: 24 });
  for (const m of MEMBERS) {
    for (const [i, img] of content.images[m].entries()) {
      if (img.kind === 'local') img.src = await localize(era.slug, img, i);
      delete img.file; // raw paths never ship
      totalImages++;
    }
  }
  content.title = era.title; content.releaseDate = era.releaseDate; content.generatedAt = new Date().toISOString();
  await fs.writeFile(path.join(OUT, era.slug + '.json'), JSON.stringify(content, null, 2) + '\n');
}
const size = await dirSize(PUBLIC);
console.log(`content: ${manifest.eras.length} eras, ${totalImages} images, public/media ${(size / 1e6).toFixed(1)} MB`);
if (size > BUDGET) { console.error(`public/media exceeds the 400 MB budget`); process.exit(1); }
```

- [ ] **Step 6: Run the script**

Run: `npm run content`
Expected: a line like `content: 17 eras, N images, public/media M MB` with M under 400. Inspect: `ls src/content/eras/_generated | wc -l` is 17; `ls public/media/black-mamba/group` has the artwork.

- [ ] **Step 7: Commit**

```bash
git add scripts tests/select.test.mjs src/content/eras/_generated public/media
git commit -m "Add content selection library and build-content script

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Content collection schema

**Files:**
- Create: `src/content.config.ts`
- Test: `npm run build` type-checks the collection (Astro validates every JSON against the zod schema)

**Interfaces:**
- Produces: collection `eras` with entries keyed by slug and data `{ slug, title, releaseDate, videos: Video[], images: Record<Member, Image[]> }`, used by Tasks 6 to 11 via `getCollection('eras')` and `getEntry('eras', slug)`.

- [ ] **Step 1: Write the schema**

```ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const image = z.object({
  member: z.enum(['karina', 'giselle', 'winter', 'ningning', 'group']),
  kind: z.enum(['local', 'remote']),
  src: z.string().optional(),
  remote: z.string().url().optional(),
  pageUrl: z.string().url().nullable(),
  credit: z.string().nullable(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  tags: z.array(z.string()),
  license: z.string().optional(),
  licenseUrl: z.string().nullable().optional(),
}).refine(i => (i.kind === 'local' ? !!i.src : !!i.remote), { message: 'local needs src, remote needs remote' });

const video = z.object({
  ytId: z.string().regex(/^[\w-]{11}$/), title: z.string(), channel: z.string().nullable(),
  kind: z.enum(['mv', 'performance', 'fancam', 'other']), views: z.number(), member: z.string().nullable(),
});

const eras = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/eras/_generated' }),
  schema: z.object({
    slug: z.string(), title: z.string(), releaseDate: z.string(), generatedAt: z.string(),
    videos: z.array(video),
    images: z.object({ karina: z.array(image), giselle: z.array(image), winter: z.array(image), ningning: z.array(image), group: z.array(image) }),
  }),
});

export const collections = { eras };
```

- [ ] **Step 2: Build to validate**

Run: `npm run build`
Expected: build succeeds; `.astro/collections` synced. A schema error names the era file and field; fix the generator, not the schema, unless the schema is wrong.

- [ ] **Step 3: Commit**

```bash
git add src/content.config.ts
git commit -m "Define eras content collection schema

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Shader canvas island and HUD

**Files:**
- Create: `src/scripts/shader.ts`, `src/components/ShaderCanvas.astro`, `src/components/Hud.astro`
- Modify: `src/layouts/Base.astro` (render ShaderCanvas and Hud, add `<ClientRouter />`)
- Test: build + manual check in the browser (WebGL and `?nogl=1` fallback); `tests/shader-source.test.mjs` asserts the GLSL compiles against a reference list of uniforms (string check, keeps the port honest).

**Interfaces:**
- Produces `src/scripts/shader.ts`:
```ts
export interface Palette { a: string; b: string; glow: string; mode: 0|1|2|3 }
export function mountShader(canvas: HTMLCanvasElement, initial: Palette, opts: { reduced: boolean; coarse: boolean }): { setPalette(p: Palette, animate?: boolean): void; glitch(amount: number, ms: number): void; destroy(): void } | null
```
Returns `null` when WebGL2 is unavailable; caller adds `no-webgl` to `<html>`.

- [ ] **Step 1: Source test**

`tests/shader-source.test.mjs`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../src/scripts/shader.ts', import.meta.url), 'utf8');
test('shader declares the uniforms the runtime sets', () => {
  for (const u of ['uRes','uTime','uMouse','uMouseV','uOct','uA0','uB0','uG0','uA1','uB1','uG1','uMode0','uMode1','uPortal','uTex','uGlitch']) assert.ok(src.includes(u), u);
  assert.ok(src.includes('#version 300 es'));
});
```
Run: `node --test tests/shader-source.test.mjs` → FAIL (file missing).

- [ ] **Step 2: Port the shader**

`src/scripts/shader.ts`: copy the `VS`, `SCENE` and `POST` GLSL strings verbatim from `demo/index.html` (the `const VS = ...`, `const SCENE = ...`, `const POST = ...` blocks, currently at the tuned values: `p=uv*1.05`, normals `*.55`, grain `.018`). Then:

```ts
export interface Palette { a: string; b: string; glow: string; mode: 0 | 1 | 2 | 3 }
const hex = (h: string): [number, number, number] => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };

export function mountShader(canvas: HTMLCanvasElement, initial: Palette, opts: { reduced: boolean; coarse: boolean }) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  const dpr = Math.min(window.devicePixelRatio || 1, opts.coarse ? 1 : 1.5);
  const OCT = opts.coarse ? 2 : 4;
  const compile = (type: number, s: string) => { const sh = gl.createShader(type)!; gl.shaderSource(sh, s); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) || 'shader'); return sh; };
  const program = (fs: string) => { const p = gl.createProgram()!; gl.attachShader(p, compile(gl.VERTEX_SHADER, VS)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link'); return p; };
  const progScene = program(SCENE), progPost = program(POST);
  const loc = (p: WebGLProgram, names: string[]) => Object.fromEntries(names.map(n => [n, gl.getUniformLocation(p, n)]));
  const locS = loc(progScene, ['uRes','uTime','uMouse','uMouseV','uOct','uA0','uB0','uG0','uA1','uB1','uG1','uMode0','uMode1','uPortal']);
  const locP = loc(progPost, ['uTex','uRes','uGlitch','uTime']);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
  for (const p of [progScene, progPost]) { const a = gl.getAttribLocation(p, 'p'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0); }
  const tex = gl.createTexture()!, fbo = gl.createFramebuffer()!;
  let W = 0, H = 0, running = false, raf = 0;
  const u = { glitch: 0, portal: 0, mouseV: 0 };
  const mouse = { x: innerWidth / 2, y: innerHeight / 2, tx: innerWidth / 2, ty: innerHeight / 2 };
  let pal0 = initial, pal1 = initial;
  const t0 = performance.now();

  function resize() {
    W = Math.floor(innerWidth * dpr); H = Math.floor(innerHeight * dpr); canvas.width = W; canvas.height = H;
    gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (opts.reduced) frame();
  }
  function frame() {
    const t = (performance.now() - t0) / 1000;
    mouse.x += (mouse.tx - mouse.x) * .08; mouse.y += (mouse.ty - mouse.y) * .08; u.mouseV *= .94;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.viewport(0, 0, W, H); gl.useProgram(progScene);
    gl.uniform2f(locS.uRes, W, H); gl.uniform1f(locS.uTime, opts.reduced ? 12 : t);
    gl.uniform2f(locS.uMouse, mouse.x * dpr, (innerHeight - mouse.y) * dpr); gl.uniform1f(locS.uMouseV, u.mouseV); gl.uniform1f(locS.uOct, OCT);
    gl.uniform3fv(locS.uA0, hex(pal0.a)); gl.uniform3fv(locS.uB0, hex(pal0.b)); gl.uniform3fv(locS.uG0, hex(pal0.glow)); gl.uniform1f(locS.uMode0, pal0.mode);
    gl.uniform3fv(locS.uA1, hex(pal1.a)); gl.uniform3fv(locS.uB1, hex(pal1.b)); gl.uniform3fv(locS.uG1, hex(pal1.glow)); gl.uniform1f(locS.uMode1, pal1.mode);
    gl.uniform1f(locS.uPortal, u.portal); gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H); gl.useProgram(progPost);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(locP.uTex, 0);
    gl.uniform2f(locP.uRes, W, H); gl.uniform1f(locP.uGlitch, u.glitch); gl.uniform1f(locP.uTime, t); gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function loop() { if (!running) return; frame(); raf = requestAnimationFrame(loop); }
  function start() { if (running || opts.reduced) return; running = true; raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  const onMove = (ev: PointerEvent) => { const dx = ev.clientX - mouse.tx, dy = ev.clientY - mouse.ty; mouse.tx = ev.clientX; mouse.ty = ev.clientY; u.mouseV = Math.min(1, u.mouseV + Math.hypot(dx, dy) / 60); };
  const onVis = () => document.hidden ? stop() : start();
  addEventListener('resize', resize); addEventListener('pointermove', onMove, { passive: true }); document.addEventListener('visibilitychange', onVis);
  resize(); start(); if (opts.reduced) frame();

  // tween helper without GSAP so the shader module stays dependency-free
  function tween(key: 'glitch' | 'portal', to: number, ms: number, ease: (x: number) => number, done?: () => void) {
    const from = u[key], s = performance.now();
    const step = () => { const k = Math.min(1, (performance.now() - s) / ms); u[key] = from + (to - from) * ease(k); if (opts.reduced) frame(); if (k < 1) requestAnimationFrame(step); else done?.(); };
    requestAnimationFrame(step);
  }
  const inOut = (x: number) => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  return {
    setPalette(p: Palette, animate = true) {
      if (!animate || opts.reduced) { pal0 = pal1 = p; u.portal = 0; if (opts.reduced) frame(); return; }
      pal1 = p; tween('portal', 1, 1000, inOut, () => { pal0 = p; u.portal = 0; });
    },
    glitch(amount: number, ms: number) { tween('glitch', amount, ms * .35, x => x * x, () => tween('glitch', 0, ms * .65, x => 1 - (1 - x) * (1 - x))); },
    destroy() { stop(); removeEventListener('resize', resize); removeEventListener('pointermove', onMove); document.removeEventListener('visibilitychange', onVis); },
  };
}
```

- [ ] **Step 3: ShaderCanvas component**

`src/components/ShaderCanvas.astro`:
```astro
<canvas id="gl" aria-hidden="true" transition:persist transition:name="gl"></canvas>
<div id="gl-fallback" aria-hidden="true"></div>
<style is:global>
  #gl{position:fixed;inset:0;width:100%;height:100%;z-index:0;display:block}
  #gl-fallback{position:fixed;inset:0;z-index:0;display:none;background:radial-gradient(120% 90% at 20% 30%,var(--era-b) 0%,transparent 55%),radial-gradient(90% 90% at 80% 80%,var(--era-glow) 0%,transparent 50%),var(--era-a)}
  .no-webgl #gl{display:none}.no-webgl #gl-fallback{display:block}
</style>
<script>
  import { mountShader, type Palette } from '@/scripts/shader';
  declare global { interface Window { __shader?: ReturnType<typeof mountShader> } }
  function paletteFromHtml(): Palette {
    const cs = getComputedStyle(document.documentElement);
    return { a: cs.getPropertyValue('--era-a').trim(), b: cs.getPropertyValue('--era-b').trim(), glow: cs.getPropertyValue('--era-glow').trim(), mode: Number(document.documentElement.dataset.mode || 0) as Palette['mode'] };
  }
  function boot() {
    const canvas = document.getElementById('gl') as HTMLCanvasElement | null;
    if (!canvas) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = matchMedia('(pointer: coarse)').matches;
    if (new URLSearchParams(location.search).has('nogl')) { document.documentElement.classList.add('no-webgl'); return; }
    if (!window.__shader) { window.__shader = mountShader(canvas, paletteFromHtml(), { reduced, coarse }); if (!window.__shader) document.documentElement.classList.add('no-webgl'); }
    else { window.__shader.glitch(1, 450); window.__shader.setPalette(paletteFromHtml(), true); }
  }
  document.addEventListener('astro:page-load', boot);
</script>
```

- [ ] **Step 4: HUD component**

`src/components/Hud.astro`:
```astro
---
import { ERAS } from '@/data/eras';
interface Props { current?: string }
const { current } = Astro.props;
const base = import.meta.env.BASE_URL;
---
<div class="hud">
  <a class="mark" href={base} aria-label="aespa, home"><span class="ae">æ</span><span class="who">aespa</span></a>
  <nav class="eras" aria-label="Eras">
    {ERAS.filter(e => e.membersEra).map(e => (
      <a href={`${base}era/${e.slug}/`} aria-current={e.slug === current ? 'page' : undefined} aria-label={`${e.title}, ${e.year}`} style={`--a:${e.theme.a};--b:${e.theme.b}`}>
        <span class="sw"></span><span class="yr">{e.year}</span>
      </a>
    ))}
  </nav>
  <div class="synk" aria-hidden="true"><div class="bar"><i id="synkbar"></i></div><span class="pct" id="synkpct">synk 000</span></div>
</div>
<style>
  .hud{position:fixed;inset:0;z-index:5;pointer-events:none;font-family:var(--mono);font-size:11px;letter-spacing:.02em;color:var(--ink-dim)}
  .hud > *{pointer-events:auto}
  .mark{position:absolute;top:18px;left:var(--gutter);display:flex;align-items:baseline;gap:10px;text-decoration:none;color:var(--ink)}
  .mark .ae{font-family:var(--serif);font-style:italic;font-size:30px;line-height:1}
  .mark .who{font-family:var(--display);font-weight:800;font-size:14px;letter-spacing:.18em;text-transform:uppercase}
  .eras{position:absolute;top:20px;right:var(--gutter);display:flex;gap:6px;align-items:center;max-width:60vw;flex-wrap:wrap;justify-content:flex-end}
  .eras a{display:grid;gap:5px;justify-items:center;text-decoration:none;color:inherit}
  .eras .sw{width:26px;height:9px;border-radius:2px;background:linear-gradient(90deg,var(--a),var(--b));box-shadow:inset 0 0 0 1px rgba(255,255,255,.18);transition:transform .25s}
  .eras a:hover .sw,.eras a[aria-current] .sw{transform:scaleY(1.9)}
  .eras .yr{opacity:0;transition:opacity .2s}
  .eras a[aria-current] .yr,.eras a:hover .yr{opacity:1}
  .synk{position:absolute;right:calc(var(--gutter) - 6px);top:50%;transform:translateY(-50%);display:grid;gap:8px;justify-items:center}
  .synk .bar{width:2px;height:160px;background:var(--line);position:relative;overflow:hidden}
  .synk .bar i{position:absolute;inset:0;background:var(--ice);transform-origin:top;transform:scaleY(var(--p,0))}
  .synk .pct{writing-mode:vertical-rl}
  @media (max-width:720px){.eras{display:none}.synk{display:none}}
</style>
```

- [ ] **Step 5: Wire into Base**

In `Base.astro`: import `ClientRouter` from `astro:transitions`, `ShaderCanvas`, `Hud`; add `<ClientRouter />` in `<head>`; replace `<slot name="hud" />` with `<ShaderCanvas /><Hud current={current} />` where `current?: string` is a new prop. Replace the inline `Theme` interface with `import type { EraTheme } from '@/data/types'`.

- [ ] **Step 6: Build and check in a browser**

Run: `npm run build && npm run preview` and open `http://localhost:4321/`: shader visible, HUD swatches present. Open `/?nogl=1`: gradient fallback, text readable. Run `node --test tests/shader-source.test.mjs`: PASS.

- [ ] **Step 7: Commit**

```bash
git add src tests/shader-source.test.mjs
git commit -m "Add persistent shader canvas island and HUD

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Era page: hero, HUD strip, next-era link, motion

**Files:**
- Create: `src/pages/era/[slug].astro`, `src/components/EraHero.astro`, `src/components/NextEra.astro`, `src/scripts/motion.ts`
- Test: `npm run build && npm run check:dist era/black-mamba/index.html era/lemonade/index.html era/winter-solo/index.html`; reduced-motion check in browser via DevTools emulation.

**Interfaces:**
- Produces `src/scripts/motion.ts`: `export function initMotion(): void` idempotent per page (called on `astro:page-load`), which: registers GSAP plugins, starts Lenis (not on coarse or reduced), runs the hero intro (ScrambleText on `[data-decode]`, SplitText mask reveal on `[data-synk]`), binds the scroll progress to `#synkbar`/`#synkpct`, binds `.rail` pinning (Task 7) and `.card` tilt (Task 8) when present.
- Produces `EraHero.astro` props `{ era: Era }`; `NextEra.astro` props `{ era: Era }`.

- [ ] **Step 1: EraHero and NextEra**

`src/components/EraHero.astro`:
```astro
---
import type { Era } from '@/data/types';
const { era } = Astro.props as { era: Era };
---
<section class="hero" aria-labelledby="title">
  <p class="kicker" data-synk>{era.kicker}</p>
  <h1 id="title" class="chrome" data-decode>{era.title}</h1>
  <div class="strip">
    <div data-synk>released<b>{era.releaseDate.replaceAll('-', '.')}</b></div>
    <div data-synk>format<b>{era.type}</b></div>
    <div data-synk>concept<b>{era.concept}</b></div>
  </div>
</section>
<style>
  .hero{min-height:100svh;display:grid;align-content:end;padding:0 var(--gutter) clamp(24px,5vh,56px)}
  .kicker{font-family:var(--serif);font-style:italic;font-size:clamp(22px,2.6vw,36px);line-height:1.1;margin:0 0 .4em;max-width:28ch;text-shadow:0 1px 18px color-mix(in oklab,var(--era-a) 70%,transparent)}
  h1{margin:0;font-family:var(--display);font-weight:900;text-transform:uppercase;letter-spacing:-.02em;font-size:clamp(64px,15vw,240px);line-height:.86;filter:drop-shadow(0 2px 0 rgba(0,0,0,.25))}
  .strip{display:grid;grid-template-columns:repeat(3,auto) 1fr;gap:clamp(16px,4vw,64px);margin-top:clamp(20px,3vh,36px);padding-top:14px;border-top:1px solid var(--line);font-family:var(--mono);font-size:12px;color:var(--ink-dim)}
  .strip b{display:block;font-weight:400;color:var(--ink);margin-top:2px}
  @media (max-width:720px){.strip{grid-template-columns:1fr 1fr}}
</style>
```

`src/components/NextEra.astro`:
```astro
---
import type { Era } from '@/data/types';
const { era } = Astro.props as { era: Era };
const base = import.meta.env.BASE_URL;
---
<section class="next">
  <span class="lbl">Next era</span>
  <a class="chrome" href={`${base}era/${era.slug}/`}>{era.title}</a>
</section>
<style>
  .next{padding:clamp(80px,16vh,200px) var(--gutter) clamp(40px,8vh,96px);display:grid;gap:8px}
  .lbl{font-family:var(--serif);font-style:italic;font-size:clamp(20px,2vw,28px);color:var(--ink-dim)}
  a{font-family:var(--display);font-weight:900;text-transform:uppercase;letter-spacing:-.02em;font-size:clamp(56px,12vw,200px);line-height:.9;text-decoration:none;display:inline-block;transition:letter-spacing .4s}
  a:hover{letter-spacing:.01em}
</style>
```

- [ ] **Step 2: motion.ts**

```ts
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin);
const CHARS = '01æÆ∆SYNK<>/|';
let lenis: Lenis | null = null;

export function initMotion() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;
  ScrollTrigger.getAll().forEach(t => t.kill());
  if (!lenis && !reduced && !coarse) {
    lenis = new Lenis({ autoRaf: false, lerp: .09 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis!.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
  }
  lenis?.scrollTo(0, { immediate: true });
  progress(); hero(reduced); rail(reduced); tilt(reduced || coarse); tabs();
  ScrollTrigger.refresh();
}
function progress() {
  const bar = document.getElementById('synkbar'), pct = document.getElementById('synkpct');
  if (!bar || !pct) return;
  ScrollTrigger.create({ trigger: 'main', start: 'top top', end: 'bottom bottom', onUpdate: s => { bar.style.setProperty('--p', s.progress.toFixed(3)); pct.textContent = 'synk ' + String(Math.round(s.progress * 100)).padStart(3, '0'); } });
}
function hero(reduced: boolean) {
  const title = document.querySelector<HTMLElement>('[data-decode]');
  const lines = Array.from(document.querySelectorAll<HTMLElement>('[data-synk]'));
  if (reduced || !title) return;
  const text = title.textContent || ''; title.textContent = '';
  const splits = lines.map(el => SplitText.create(el, { type: 'lines', mask: 'lines' }));
  gsap.set(splits.flatMap(s => s.lines), { yPercent: 110 });
  gsap.timeline({ delay: .15 })
    .to(title, { duration: 1.0, scrambleText: { text, chars: CHARS, speed: .4, revealDelay: .25 } })
    .to(splits.flatMap(s => s.lines), { yPercent: 0, duration: .8, ease: 'power3.out', stagger: .05 }, '-=.6')
    .add(() => splits.forEach(s => s.revert()));
}
function rail(reduced: boolean) {
  const rail = document.querySelector<HTMLElement>('.rail'), track = document.querySelector<HTMLElement>('.rail .track');
  if (!rail || !track) return;
  gsap.to(track, { x: () => -(track.scrollWidth - innerWidth), ease: 'none', scrollTrigger: { trigger: rail, pin: true, scrub: reduced ? false : .8, end: () => '+=' + (track.scrollWidth - innerWidth), invalidateOnRefresh: true } });
}
function tilt(off: boolean) {
  if (off) return;
  document.querySelectorAll<HTMLElement>('.card').forEach(card => {
    card.addEventListener('pointerenter', () => card.classList.add('active'));
    card.addEventListener('pointermove', ev => { const r = card.getBoundingClientRect(); const px = (ev.clientX - r.left) / r.width, py = (ev.clientY - r.top) / r.height;
      card.style.setProperty('--mx', (px * 100).toFixed(1) + '%'); card.style.setProperty('--my', (py * 100).toFixed(1) + '%'); card.style.setProperty('--ry', ((px - .5) * 22).toFixed(2) + 'deg'); card.style.setProperty('--rx', ((.5 - py) * 22).toFixed(2) + 'deg'); }, { passive: true });
    card.addEventListener('pointerleave', () => { card.classList.remove('active'); for (const v of ['--rx', '--ry']) card.style.setProperty(v, '0deg'); for (const v of ['--mx', '--my']) card.style.setProperty(v, '50%'); });
  });
}
function tabs() {
  document.querySelectorAll<HTMLElement>('[data-tabs]').forEach(root => {
    const buttons = root.querySelectorAll<HTMLButtonElement>('[role=tab]');
    const panels = root.querySelectorAll<HTMLElement>('[role=tabpanel]');
    const key = root.dataset.tabs!;
    const select = (id: string) => { buttons.forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === id))); panels.forEach(p => p.hidden = p.dataset.panel !== id); try { sessionStorage.setItem('tab:' + key, id); } catch {} ScrollTrigger.refresh(); };
    buttons.forEach(b => b.addEventListener('click', () => select(b.dataset.tab!)));
    let initial = buttons[0]?.dataset.tab; try { initial = sessionStorage.getItem('tab:' + key) || initial; } catch {}
    if (initial && Array.from(buttons).some(b => b.dataset.tab === initial)) select(initial);
  });
}
```

- [ ] **Step 3: Era page**

`src/pages/era/[slug].astro`:
```astro
---
import Base from '@/layouts/Base.astro';
import EraHero from '@/components/EraHero.astro';
import NextEra from '@/components/NextEra.astro';
import { ERAS, nextEra } from '@/data/eras';
import { getEntry } from 'astro:content';
export function getStaticPaths() { return ERAS.map(e => ({ params: { slug: e.slug }, props: { era: e } })); }
const { era } = Astro.props;
const content = await getEntry('eras', era.slug);
---
<Base title={`${era.title}, aespa`} description={`${era.title}, ${era.type}, ${era.releaseDate}. ${era.concept}.`} theme={era.theme} current={era.slug}>
  <EraHero era={era} />
  <NextEra era={nextEra(era.slug)} />
</Base>
<script>
  import { initMotion } from '@/scripts/motion';
  document.addEventListener('astro:page-load', initMotion);
</script>
```

- [ ] **Step 4: Build, check, look**

Run: `npm run build && npm run check:dist era/black-mamba/index.html era/lemonade/index.html era/winter-solo/index.html`
Expected: `dist ok: 3 pages`. Preview `/era/whiplash/`: monochrome shader, title decodes, HUD strip reveals, swatch strip marks Whiplash. Emulate reduced motion in DevTools and reload: title and strip visible at once, shader still.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "Add era pages with hero, HUD strip, next-era link and motion

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Watch rail

**Files:**
- Create: `src/components/WatchRail.astro`
- Modify: `src/pages/era/[slug].astro` (insert after hero)
- Test: build check; preview the rail pins and scrubs; the MV poster is a real `<img>` (LCP candidate) and the player loads only on click.

**Interfaces:**
- Consumes `content.data.videos: Video[]` from Task 4.
- Produces `WatchRail.astro` props `{ videos: Video[]; memberTab?: boolean }`.

- [ ] **Step 1: Component**

```astro
---
import 'lite-youtube-embed/src/lite-yt-embed.css';
interface Video { ytId: string; title: string; channel: string | null; kind: string; views: number; member: string | null }
const { videos } = Astro.props as { videos: Video[] };
const fmt = (n: number) => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M views' : n >= 1e3 ? Math.round(n / 1e3) + 'K views' : n + ' views';
const mv = videos.find(v => v.kind === 'mv');
const rest = videos.filter(v => v !== mv);
---
{videos.length > 0 && (
<>
<section class="sec" aria-labelledby="watch-h">
  <h2 id="watch-h">Watch</h2>
  <p class="lede">MV, stages, fancams. Ranked by views.</p>
</section>
<section class="rail" aria-label="Videos">
  <div class="track">
    {mv && <div class="vid mv"><lite-youtube videoid={mv.ytId} playlabel={`Play ${mv.title}`} style={`background-image:url(https://i.ytimg.com/vi/${mv.ytId}/hqdefault.jpg)`}></lite-youtube><div class="cap"><span>{mv.title}</span><small>{mv.channel} · {fmt(mv.views)}</small></div></div>}
    {rest.map(v => <div class="vid" data-member={v.member ?? 'group'}><lite-youtube videoid={v.ytId} playlabel={`Play ${v.title}`} style={`background-image:url(https://i.ytimg.com/vi/${v.ytId}/hqdefault.jpg)`}></lite-youtube><div class="cap"><span>{v.title}</span><small>{v.channel} · {fmt(v.views)}</small></div></div>)}
  </div>
</section>
</>
)}
<style>
  .rail{height:100svh;display:grid;align-content:center;overflow:hidden}
  .track{display:flex;gap:clamp(12px,1.6vw,24px);padding:0 var(--gutter);width:max-content;will-change:transform}
  .vid{position:relative;flex:0 0 auto;width:clamp(260px,34vw,520px);border-radius:4px;overflow:hidden;background:var(--surface);box-shadow:0 30px 60px -30px rgba(0,0,0,.6),inset 0 0 0 1px var(--line)}
  .vid.mv{width:clamp(300px,46vw,720px)}
  .vid lite-youtube{max-width:none;aspect-ratio:16/9}
  .cap{display:flex;justify-content:space-between;gap:12px;align-items:baseline;padding:10px 12px;font-size:13px}
  .cap small{font-family:var(--mono);font-size:11px;color:var(--ink-dim);white-space:nowrap}
  .cap span{overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
</style>
<script>
  import 'lite-youtube-embed';
</script>
```

Note the dot separator in captions is a middle dot inside a `<small>` data line, which the spec allows for HUD-style metadata; keep it out of prose.

- [ ] **Step 2: Insert into the era page** after `<EraHero />`: `<WatchRail videos={content?.data.videos ?? []} />`.

- [ ] **Step 3: Build and preview**: the rail pins while scrolling horizontally; clicking a poster loads the iframe. Run `npm run build && npm run check:dist era/savage/index.html`.

- [ ] **Step 4: Commit**

```bash
git add src
git commit -m "Add pinned Watch rail with click-to-load YouTube embeds

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Photocards with member tabs and lightbox

**Files:**
- Create: `src/components/Photocards.astro`, `src/components/Photocard.astro`
- Modify: `src/pages/era/[slug].astro`
- Test: build check; preview `/era/black-mamba/`: tabs switch, Winter has cards, Karina shows "No photos yet" until the all-member content exists; a remote card with a dead URL hides (simulate by editing one `remote` to `https://i.pinimg.com/originals/dead.jpg` in `_generated`, previewing, then reverting with `npm run content`).

**Interfaces:**
- Consumes `content.data.images` (Record<member, Image[]>).
- Produces `Photocards.astro` props `{ images: Record<string, Image[]>; eraSlug: string }`.

- [ ] **Step 1: Photocard**

`src/components/Photocard.astro`:
```astro
---
import { Image } from 'astro:assets';
interface Img { member: string; kind: 'local' | 'remote'; src?: string; remote?: string; pageUrl: string | null; credit: string | null; width: number | null; height: number | null; tags: string[]; license?: string }
const { img, index, era } = Astro.props as { img: Img; index: number; era: string };
const base = import.meta.env.BASE_URL;
const w = img.width ?? 3, h = img.height ?? 4;
const alt = `${img.member === 'group' ? 'aespa' : img.member}, ${era}${img.tags.length ? ', ' + img.tags.join(', ') : ''}`;
---
<figure class="card" style={`--ar:${w}/${h}`} tabindex="0" data-full={img.kind === 'local' ? base + img.src : img.remote}>
  {img.kind === 'local'
    ? <img src={base + img.src} alt={alt} width={w} height={h} loading={index < 3 ? 'eager' : 'lazy'} decoding="async" />
    : <img src={img.remote} alt={alt} width={w} height={h} loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.closest('.card').remove()" />}
  <div class="shine"></div><div class="glare"></div>
  <figcaption class="cap">
    <span>{String(index + 1).padStart(3, '0')}</span>
    {img.pageUrl ? <a href={img.pageUrl} target="_blank" rel="noopener">{img.credit ?? 'source'}</a> : <span>{img.credit ?? ''}{img.license ? `, ${img.license}` : ''}</span>}
  </figcaption>
</figure>
<style>
  .card{break-inside:avoid;margin:0 0 clamp(12px,1.6vw,24px);position:relative;border-radius:6px;overflow:hidden;background:var(--surface);transform:perspective(900px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg));transition:transform .5s cubic-bezier(.2,.8,.2,1),box-shadow .5s;box-shadow:0 20px 50px -24px rgba(0,0,0,.7),inset 0 0 0 1px var(--line);transform-style:preserve-3d;cursor:zoom-in}
  .card.active{transition:transform .08s linear;z-index:2}
  .card img{display:block;width:100%;height:auto;aspect-ratio:var(--ar);object-fit:cover;background:#000}
  .shine,.glare{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .4s}
  .shine{mix-blend-mode:color-dodge;background:repeating-linear-gradient(110deg,#ff4d4d 0%,#ffd84d 6%,#5dff9a 12%,#4dd2ff 18%,#b24dff 24%,#ff4d4d 30%),repeating-linear-gradient(90deg,rgba(255,255,255,.18) 0 1px,transparent 1px 3px);background-size:300% 300%,100% 100%;background-position:var(--mx,50%) var(--my,50%),0 0;filter:brightness(.55) contrast(1.6) saturate(1.1)}
  .glare{background:radial-gradient(farthest-corner circle at var(--mx,50%) var(--my,50%),rgba(255,255,255,.5) 0%,rgba(255,255,255,.08) 30%,rgba(0,0,0,.35) 100%);mix-blend-mode:overlay}
  .card.active .shine{opacity:.55}.card.active .glare{opacity:1}
  .cap{position:absolute;left:0;right:0;bottom:0;margin:0;padding:10px 14px;font-family:var(--mono);font-size:11px;color:rgba(255,255,255,.75);background:linear-gradient(transparent,rgba(0,0,0,.5));display:flex;justify-content:space-between;gap:8px}
  .cap a{color:inherit;text-decoration:none;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
  @media (prefers-reduced-motion:reduce){.card,.card.active{transition:none;transform:none}}
</style>
```

(The `Image` import stays unused for now; remove it to keep the build clean. Astro's `<Image>` for local files is adopted in the phase 3 plan once a sizes strategy is chosen; plain `<img>` with width/height already avoids layout shift.)

- [ ] **Step 2: Photocards with tabs and lightbox**

`src/components/Photocards.astro`:
```astro
---
import Photocard from './Photocard.astro';
const MEMBERS = [['karina','Karina'],['giselle','Giselle'],['winter','Winter'],['ningning','Ningning'],['group','Group']] as const;
const { images, eraSlug } = Astro.props as { images: Record<string, any[]>; eraSlug: string };
const first = MEMBERS.find(([m]) => images[m]?.length)?.[0] ?? 'winter';
---
<section class="sec" aria-labelledby="gal-h">
  <h2 id="gal-h">Photocards</h2>
</section>
<div class="wrap" data-tabs={`photocards`}>
  <div class="tabs" role="tablist" aria-label="Member">
    {MEMBERS.map(([m, label]) => <button role="tab" data-tab={m} aria-selected={m === first ? 'true' : 'false'}>{label}<small>{images[m]?.length ?? 0}</small></button>)}
  </div>
  {MEMBERS.map(([m, label]) => (
    <div role="tabpanel" data-panel={m} hidden={m !== first}>
      {images[m]?.length
        ? <div class="gallery">{images[m].map((img, i) => <Photocard img={img} index={i} era={eraSlug} />)}</div>
        : <p class="empty">No {label === 'Group' ? 'group' : label} photos yet for this era.</p>}
    </div>
  ))}
</div>
<dialog id="lightbox" aria-label="Full size photo"><img alt="" /><form method="dialog"><button aria-label="Close">×</button></form></dialog>
<style>
  .wrap{padding:0 var(--gutter)}
  .tabs{display:flex;gap:clamp(14px,2vw,28px);margin:0 0 18px;border-bottom:1px solid var(--line);overflow-x:auto}
  .tabs button{appearance:none;border:0;background:transparent;padding:10px 0 12px;cursor:pointer;font-family:var(--display);font-weight:800;font-size:14px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-dim);position:relative;transition:color .2s;display:flex;gap:6px;align-items:baseline;white-space:nowrap}
  .tabs button small{font-family:var(--mono);font-size:10px;letter-spacing:0}
  .tabs button:hover,.tabs button[aria-selected="true"]{color:var(--ink)}
  .tabs button::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:2px;background:var(--era-b);transform:scaleX(0);transform-origin:left;transition:transform .35s cubic-bezier(.2,.8,.2,1)}
  .tabs button[aria-selected="true"]::after{transform:scaleX(1)}
  .gallery{columns:3;column-gap:clamp(12px,1.6vw,24px)}
  @media (max-width:900px){.gallery{columns:2}} @media (max-width:560px){.gallery{columns:1}}
  .empty{font-family:var(--serif);font-style:italic;font-size:clamp(20px,2vw,28px);color:var(--ink-dim);margin:24px 0 0}
  dialog{background:transparent;border:0;padding:0;max-width:96vw;max-height:94vh}
  dialog::backdrop{background:rgba(0,0,0,.92)}
  dialog img{max-width:96vw;max-height:92vh;object-fit:contain;display:block}
  dialog button{position:fixed;top:16px;right:16px;font-size:28px;background:transparent;border:0;color:#fff;cursor:pointer}
</style>
<script>
  function bind() {
    const dlg = document.getElementById('lightbox') as HTMLDialogElement | null; if (!dlg) return;
    const img = dlg.querySelector('img')!;
    document.querySelectorAll<HTMLElement>('.card').forEach(c => {
      const open = () => { img.src = c.dataset.full || ''; img.alt = c.querySelector('img')?.alt || ''; dlg.showModal(); };
      c.addEventListener('click', open);
      c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  }
  document.addEventListener('astro:page-load', bind);
</script>
```

- [ ] **Step 3: Insert into the era page** after the rail: `<Photocards images={content?.data.images ?? { karina: [], giselle: [], winter: [], ningning: [], group: [] }} eraSlug={era.slug} />`.

- [ ] **Step 4: Build and verify** including the dead-URL check described in the Test line. Run `npm run build && npm run check:dist era/black-mamba/index.html`.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "Add Photocards with member tabs, holo tilt and lightbox

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Listen and Story sections

**Files:**
- Create: `src/components/Listen.astro`, `src/components/Story.astro`
- Modify: `src/pages/era/[slug].astro`
- Test: build check; preview `/era/winter-solo/` shows five track embeds; `/era/drama/` shows the album embed; story text and sources render with the lore status line.

- [ ] **Step 1: Listen**

```astro
---
import type { Era } from '@/data/types';
const { era } = Astro.props as { era: Era };
const allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
---
<section class="sec" aria-labelledby="listen-h">
  <h2 id="listen-h">Listen</h2>
  <p class="lede">{era.spotify.album ? 'The full release on Spotify.' : 'The tracks on Spotify.'}</p>
</section>
<div class="listen">
  {era.spotify.album
    ? <iframe src={`https://open.spotify.com/embed/album/${era.spotify.album}?utm_source=generator&theme=0`} loading="lazy" allow={allow} title={`${era.title} on Spotify`} height="352"></iframe>
    : era.spotify.tracks?.map(t => <iframe src={`https://open.spotify.com/embed/track/${t.id}?utm_source=generator&theme=0`} loading="lazy" allow={allow} title={`${t.title} on Spotify`} height="152"></iframe>)}
</div>
<style>
  .listen{padding:clamp(28px,4vh,48px) var(--gutter) 0;display:grid;gap:12px;grid-template-columns:minmax(0,720px)}
  iframe{width:100%;border:0;border-radius:12px;background:var(--surface)}
</style>
```

- [ ] **Step 2: Story**

```astro
---
import type { Era } from '@/data/types';
const { era } = Astro.props as { era: Era };
const status = { 'season-1': 'SM Culture Universe, Season 1.', 'season-2': 'Season 2 label. Explicit lore is sparse from here on.', 'none': 'No SMCU lore in this release.' }[era.story.loreStatus];
---
<section class="notes" aria-labelledby="story-h">
  <div>
    <h2 id="story-h">Story</h2>
    <p class="status">{status}</p>
    {era.story.text.map(p => <p>{p}</p>)}
    <p class="src">Sources: {era.story.sources.map((s, i) => <><a href={s.url} target="_blank" rel="noopener">{s.label}</a>{i < era.story.sources.length - 1 ? '; ' : ''}</>)}</p>
  </div>
</section>
<style>
  .notes{padding:clamp(56px,10vh,120px) var(--gutter) 0;display:grid;grid-template-columns:minmax(0,56ch) 1fr;gap:var(--gutter)}
  h2{font-family:var(--display);font-weight:800;text-transform:uppercase;letter-spacing:.02em;font-size:clamp(28px,4vw,56px);line-height:1;margin:0 0 .3em}
  .status{font-family:var(--mono);font-size:12px;color:var(--ink-dim);margin:0 0 1.2em}
  p{margin:0 0 1em;font-size:clamp(16px,1.3vw,19px)}
  .src{font-family:var(--mono);font-size:11px;color:var(--ink-dim)} .src a{color:inherit}
  @media (max-width:720px){.notes{grid-template-columns:1fr}}
</style>
```

- [ ] **Step 3: Insert** after Photocards: `<Listen era={era} /><Story era={era} />`.

- [ ] **Step 4: Build and verify** `npm run build && npm run check:dist era/winter-solo/index.html era/drama/index.html`.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "Add Listen (Spotify) and Story sections to era pages

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: Home portal with era timeline

**Files:**
- Modify: `src/pages/index.astro` (replace placeholder)
- Create: `src/components/Timeline.astro`
- Test: `npm run build && npm run check:dist index.html`; preview: pinned horizontal timeline, hovering a swatch pushes its palette into the shader, clicking enters the era.

**Interfaces:**
- Consumes `ERAS`, `getCollection('eras')` for one hero image per era (first group image, else first winter image).
- Produces `Timeline.astro` props `{ items: { era: Era; image?: { kind: 'local'|'remote'; src?: string; remote?: string } }[] }`.

- [ ] **Step 1: Timeline**

```astro
---
import type { Era } from '@/data/types';
const { items } = Astro.props as { items: { era: Era; image?: { kind: 'local' | 'remote'; src?: string; remote?: string } }[] };
const base = import.meta.env.BASE_URL;
---
<section class="rail" aria-label="Eras in order">
  <div class="track">
    {items.map(({ era, image }) => (
      <a class="era" href={`${base}era/${era.slug}/`} data-a={era.theme.a} data-b={era.theme.b} data-glow={era.theme.glow} data-mode={era.theme.mode} style={`--a:${era.theme.a};--b:${era.theme.b}`}>
        <span class="swatch"></span>
        <span class="frame">{image ? <img src={image.kind === 'local' ? base + image.src : image.remote} alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()" /> : null}</span>
        <span class="meta"><b>{era.title}</b><small>{era.releaseDate.replaceAll('-', '.')} · {era.type}</small></span>
      </a>
    ))}
  </div>
</section>
<style>
  .rail{height:100svh;display:grid;align-content:center;overflow:hidden}
  .track{display:flex;gap:clamp(14px,2vw,32px);padding:0 var(--gutter);width:max-content;align-items:end;will-change:transform}
  .era{flex:0 0 auto;width:clamp(200px,22vw,320px);text-decoration:none;color:inherit;display:grid;gap:10px}
  .swatch{height:8px;border-radius:2px;background:linear-gradient(90deg,var(--a),var(--b));box-shadow:inset 0 0 0 1px rgba(255,255,255,.18)}
  .frame{display:block;aspect-ratio:3/4;border-radius:6px;overflow:hidden;background:var(--surface);box-shadow:inset 0 0 0 1px var(--line)}
  .frame img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .6s cubic-bezier(.2,.8,.2,1)}
  .era:hover .frame img{transform:scale(1.04)}
  .meta{display:grid;gap:2px} .meta b{font-family:var(--display);font-weight:800;text-transform:uppercase;font-size:20px;letter-spacing:.02em} .meta small{font-family:var(--mono);font-size:11px;color:var(--ink-dim)}
</style>
<script>
  function bind() {
    document.querySelectorAll<HTMLElement>('.era[data-a]').forEach(el => el.addEventListener('pointerenter', () => {
      window.__shader?.setPalette({ a: el.dataset.a!, b: el.dataset.b!, glow: el.dataset.glow!, mode: Number(el.dataset.mode) as 0|1|2|3 }, true);
    }));
  }
  document.addEventListener('astro:page-load', bind);
</script>
```

- [ ] **Step 2: Home page**

```astro
---
import Base from '@/layouts/Base.astro';
import Timeline from '@/components/Timeline.astro';
import { ERAS } from '@/data/eras';
import { getCollection } from 'astro:content';
const entries = await getCollection('eras');
const items = ERAS.filter(e => e.membersEra).map(era => { const c = entries.find(x => x.data.slug === era.slug)?.data; const image = c?.images.group[0] ?? c?.images.winter[0]; return { era, image }; });
---
<Base title="aespa, by era" description="Fan-made aespa site, Winter first. Every era with its photos, videos, music and story." current={undefined}>
  <section class="hero">
    <h1 class="chrome" data-decode>aespa</h1>
    <p class="kicker" data-synk>Seventeen releases, 2020 to 2026. Pick an era.</p>
  </section>
  <Timeline items={items} />
  <section class="sec"><p class="lede">Fan-made. Not affiliated with SM Entertainment. <a href={`${import.meta.env.BASE_URL}about/`}>Credits and sources</a>.</p></section>
</Base>
<style>
  .hero{min-height:70svh;display:grid;align-content:end;padding:0 var(--gutter) clamp(24px,5vh,56px)}
  h1{margin:0;font-family:var(--display);font-weight:900;text-transform:uppercase;letter-spacing:-.02em;font-size:clamp(96px,24vw,360px);line-height:.86}
  .kicker{font-family:var(--serif);font-style:italic;font-size:clamp(22px,2.6vw,36px);margin:.3em 0 0;color:var(--ink-dim)}
</style>
<script>
  import { initMotion } from '@/scripts/motion';
  document.addEventListener('astro:page-load', initMotion);
</script>
```

- [ ] **Step 3: Build and preview** `npm run build && npm run check:dist index.html era/black-mamba/index.html`.

- [ ] **Step 4: Commit**

```bash
git add src
git commit -m "Add home portal with pinned era timeline

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11: Member pages and about page

**Files:**
- Create: `src/pages/member/[slug].astro`, `src/pages/about.astro`
- Modify: `src/components/Hud.astro` (add member links under the mark on wide screens: four small text links)
- Test: `npm run build && npm run check:dist member/winter/index.html member/karina/index.html about/index.html`.

- [ ] **Step 1: Member page**

```astro
---
import Base from '@/layouts/Base.astro';
import Listen from '@/components/Listen.astro';
import Photocards from '@/components/Photocards.astro';
import { MEMBERS } from '@/data/members';
import { ERAS, eraBySlug } from '@/data/eras';
import { getCollection } from 'astro:content';
export function getStaticPaths() { return MEMBERS.map(m => ({ params: { slug: m.slug }, props: { member: m } })); }
const { member } = Astro.props;
const entries = await getCollection('eras');
const latest = entries.filter(e => e.data.images[member.slug].length).sort((a, b) => b.data.releaseDate.localeCompare(a.data.releaseDate))[0];
const soloEra = member.slug === 'winter' ? eraBySlug('winter-solo')! : undefined;
const theme = soloEra?.theme ?? { a: '#0B0B10', b: '#A9D6FF', glow: '#FFFFFF', ink: '#F3EFE6', mode: 0 as const };
const trackEra = soloEra ?? { ...ERAS[0], title: member.name, spotify: { tracks: member.solo.filter(s => s.spotifyTrack).map(s => ({ id: s.spotifyTrack!, title: s.title })) } };
const base = import.meta.env.BASE_URL;
---
<Base title={`${member.name}, aespa`} description={`${member.name} (${member.hangul}), ${member.position}. ${member.loreRole}.`} theme={theme}>
  <section class="hero">
    <p class="kicker" data-synk>{member.hangul}. {member.position}.</p>
    <h1 class="chrome" data-decode>{member.name}</h1>
    <div class="strip">
      <div data-synk>born<b>{member.born.replaceAll('-', '.')}, {member.birthplace}</b></div>
      <div data-synk>lore role<b>{member.loreRole}</b></div>
      <div data-synk>fan-sourced<b>{member.fanSourced.symbol}, {member.fanSourced.color}, {member.fanSourced.animal}</b></div>
    </div>
  </section>
  <section class="notes"><div><h2>Role</h2><p>{member.loreNote}</p><h2>Solo</h2>
    <ul class="solo">{member.solo.map(s => <li><b>{s.title}</b><small>{s.date}</small><span>{s.note}</span></li>)}</ul>
    <h2>Moments</h2><ul class="solo">{member.moments.map(m => <li><span>{m}</span></li>)}</ul>
    <p class="src">Sources: {member.sources.map((s, i) => <><a href={s.url} target="_blank" rel="noopener">{s.label}</a>{i < member.sources.length - 1 ? '; ' : ''}</>)}</p>
  </div></section>
  <Listen era={trackEra} />
  {latest && <><section class="sec"><p class="lede">Latest photos: <a href={`${base}era/${latest.data.slug}/`}>{latest.data.title}</a>.</p></section><Photocards images={{ karina: [], giselle: [], winter: [], ningning: [], group: [], [member.slug]: latest.data.images[member.slug].slice(0, 9) }} eraSlug={latest.data.slug} /></>}
</Base>
<style>
  .hero{min-height:80svh;display:grid;align-content:end;padding:0 var(--gutter) clamp(24px,5vh,56px)}
  .kicker{font-family:var(--serif);font-style:italic;font-size:clamp(22px,2.6vw,36px);margin:0 0 .4em;color:var(--ink-dim)}
  h1{margin:0;font-family:var(--display);font-weight:900;text-transform:uppercase;letter-spacing:-.02em;font-size:clamp(72px,18vw,260px);line-height:.86}
  .strip{display:grid;grid-template-columns:repeat(3,auto) 1fr;gap:clamp(16px,4vw,64px);margin-top:clamp(20px,3vh,36px);padding-top:14px;border-top:1px solid var(--line);font-family:var(--mono);font-size:12px;color:var(--ink-dim)}
  .strip b{display:block;font-weight:400;color:var(--ink);margin-top:2px}
  .notes{padding:clamp(56px,10vh,120px) var(--gutter) 0;max-width:64ch}
  .notes h2{font-family:var(--display);font-weight:800;text-transform:uppercase;font-size:clamp(24px,3vw,40px);line-height:1;margin:1.2em 0 .4em}
  .solo{list-style:none;padding:0;margin:0;display:grid;gap:10px}
  .solo li{display:grid;grid-template-columns:auto auto;gap:4px 12px;align-items:baseline;border-top:1px solid var(--line);padding-top:8px}
  .solo b{font-weight:500} .solo small{font-family:var(--mono);color:var(--ink-dim)} .solo span{grid-column:1/-1;color:var(--ink-dim)}
  .src{font-family:var(--mono);font-size:11px;color:var(--ink-dim)} .src a{color:inherit}
  @media (max-width:720px){.strip{grid-template-columns:1fr}}
</style>
<script>
  import { initMotion } from '@/scripts/motion';
  document.addEventListener('astro:page-load', initMotion);
</script>
```

- [ ] **Step 2: About page**

```astro
---
import Base from '@/layouts/Base.astro';
import { getCollection } from 'astro:content';
const entries = await getCollection('eras');
const commons = entries.flatMap(e => Object.values(e.data.images).flat()).filter(i => i.license).map(i => `${i.credit ?? 'unknown'}, ${i.license}`);
const uniq = [...new Set(commons)].sort();
---
<Base title="About, aespa fan site" description="Fan-made aespa site. Credits, sources, licenses and how to request a takedown.">
  <section class="notes"><div>
    <h1>About</h1>
    <p>A fan-made site about aespa, Winter first. Not affiliated with SM Entertainment or the members.</p>
    <h2>Media</h2>
    <p>Official release artwork comes from aespa's official sites and belongs to SM Entertainment. Photos from Wikimedia Commons are used under their Creative Commons licenses, listed below. Fan photos from Pinterest are shown from their original hosts with a link to the pin; nothing from Pinterest is copied here. Videos are YouTube embeds. Music is embedded from Spotify.</p>
    <p>If you own a photo shown here and want it removed or credited differently, open an issue on the GitHub repository and it will be handled within a day.</p>
    <h2>Commons credits</h2>
    <ul>{uniq.map(c => <li>{c}</li>)}</ul>
    <h2>Facts</h2>
    <p>Dates and release details follow Wikipedia and SM press coverage. Lore terms follow SM's published material. Representative colors, symbols and animals are fan-sourced and labeled as such wherever they appear.</p>
  </div></section>
</Base>
<style>
  .notes{padding:clamp(80px,14vh,160px) var(--gutter) 80px;max-width:64ch}
  h1,h2{font-family:var(--display);font-weight:800;text-transform:uppercase;line-height:1} h1{font-size:clamp(48px,8vw,120px);margin:0 0 .3em} h2{font-size:clamp(22px,3vw,36px);margin:1.4em 0 .4em}
  ul{font-family:var(--mono);font-size:12px;color:var(--ink-dim);padding-left:1.2em}
</style>
```

- [ ] **Step 3: HUD member links.** In `Hud.astro` add under `.mark`:
```astro
<nav class="members" aria-label="Members">{['karina','giselle','winter','ningning'].map(m => <a href={`${base}member/${m}/`}>{m}</a>)}</nav>
```
with style `.members{position:absolute;top:56px;left:var(--gutter);display:flex;gap:12px}.members a{text-decoration:none;color:var(--ink-dim);text-transform:uppercase;letter-spacing:.1em;font-size:10px}.members a:hover{color:var(--ink)}@media (max-width:720px){.members{display:none}}`.

- [ ] **Step 4: Build and verify** `npm run build && npm run check:dist member/winter/index.html member/karina/index.html about/index.html index.html`.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "Add member pages and about page with credits and takedown route

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 12: Full-site verification and deploy readiness

**Files:**
- Modify: `scripts/check-dist.mjs` (default list becomes every era, every member, home, about)
- Modify: `README.md` at repo root (create): how to fetch, curate, build content, run, deploy
- Test: `npm test && npm run build && npm run check:dist`; bundle size check; Playwright screenshots of home, one dark era, one light era, phone width.

- [ ] **Step 1: Default page list in check-dist**

Replace the `required` line with:
```js
import { ERAS } from '../src/data/eras.ts';
import { MEMBERS } from '../src/data/members.ts';
const defaults = ['index.html', 'about/index.html', ...ERAS.map(e => `era/${e.slug}/index.html`), ...MEMBERS.map(m => `member/${m.slug}/index.html`)];
const required = process.argv.slice(2).length ? process.argv.slice(2) : defaults;
```
Run `npm run build && npm run check:dist` → `dist ok: 23 pages`.

- [ ] **Step 2: JS budget**

Run: `find dist/_astro -name '*.js' -exec sh -c 'gzip -c "$1" | wc -c | xargs printf "%s %s\n" "$1"' _ {} \; | sort -k2 -n | tail -5` and sum the scripts referenced by `dist/era/black-mamba/index.html`. Expected under 150 KB gzip total. If over, confirm GSAP plugins are tree-shaken (import from `gsap/ScrollTrigger` etc., not `gsap/all`).

- [ ] **Step 3: Screenshots** with the Playwright MCP at 1440×900 and 390×844 of `/`, `/era/whiplash/`, `/era/lemonade/`, `/member/winter/`. Fix anything broken before continuing.

- [ ] **Step 4: README**

```markdown
# aespa fansite

Fan-made, Winter first. One page per era with photos, videos, music and story.

- `npm run dev` runs the site. `npm run build && npm run check:dist` builds and verifies every page exists.
- `npm run content` turns `media/raw/manifest.json` plus curator decisions into `src/content/eras/_generated/*.json` and resized images in `public/media`. Run it locally after fetching or curating, then commit the result.
- `node tools/curator/server.mjs` opens the curator at http://127.0.0.1:4747. See `tools/curator/README.md`.
- Media fetch and quality control live in `media/tools/`. See `media/raw/REPORT.md`.
- Deploys to GitHub Pages from `main` through `.github/workflows/pages.yml`. Pages must be enabled with the source set to GitHub Actions, and on a free plan the repository must be public.

Spec: `docs/superpowers/specs/2026-10-05-winter-fansite-design.md`. Plan: `docs/superpowers/plans/`.
```

- [ ] **Step 5: Commit and push**

```bash
git add scripts README.md
git commit -m "Verify every page builds; add README

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

- [ ] **Step 6: Report deploy state.** The workflow runs on push but Pages cannot activate on a private repo without GitHub Pro. Do not change repository visibility; report the state and the one command that enables Pages once the repo is public: `gh api -X POST repos/Austin-Senna/winter-fansite/pages -f build_type=workflow`.

---

## Self-review notes

- Spec coverage: IA (Tasks 6, 10, 11), visual system tokens and type (1), motion vocabulary subset for phases 1-2 (SYNK-in, Decode, Glitch cut on route change, Sheen class, Holo tilt, Pulse; Portal wipe across routes lands via `setPalette(animate)` on `astro:page-load`), content pipeline (3, 4), embed policy (3, 8, 11), curator integration (3 reads `src/content/eras/<slug>.json`), Pages (1, 12), copy rule (all components), reduced motion (5, 6, 8). Deferred to the phase 3 plan: lightbox shared-element morph, Flip filtering, magnetic buttons and cursor, YouTube background player, `<Image>` with sizes, weekly recap.
- Type consistency: `Era`, `EraTheme`, `Member` defined in Task 2 and imported by name in 5, 6, 9, 10, 11; `Image` and `Video` shapes defined in Task 3 and mirrored by the zod schema in Task 4; `window.__shader` declared in Task 5 and used in Task 10.
- Review Focus items each have a home: 1 (Task 3 test "empty when member has nothing", Task 8 empty state), 2 (Task 8 `onerror`), 3 (Task 5 `?nogl=1`), 4 (Task 6 reduced-motion early return before clearing the title), 5 (Task 3 `localize` throws with the path).
