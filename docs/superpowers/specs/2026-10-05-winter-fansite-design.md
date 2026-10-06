# aespa fansite (Winter first): design spec

Date: 2026-10-05
Status: draft for Austin's review. Demo of the visual system lives at `demo/index.html` (serve the repo root over HTTP so it can read `media/raw/manifest.json`).
Revised 2026-10-06 after Austin's feedback: all four members, storyline per era, Spotify per era, member subtabs.
Research: `docs/research/aespa-winter-brief.md`, `docs/research/ui-tech-brief.md`.

## 1. What we are building

A personal aespa fansite, Winter first. The site is organized by **era**: one page per aespa comeback plus a page per member for solo work. Each era page carries its own color world, display-type treatment, and shader mood, inside a shared shell with heavy, deliberate motion in the aespa register: liquid chrome, glitch, holographic, portal. Inside an era, member-specific sections (photocards, fancams) switch between Karina, Giselle, Winter and Ningning with subtabs. Each era also tells the album's story: the lore beat, the MV narrative, the stated concept.

### What Austin said
- Started as a Winter fansite; widened to all four members so each album's storyline can be told, with member subtabs on photocards and similar sections.
- "Crazy animations", aespa-like UI.
- Content is photos and videos, divided by era, one page per era.
- Media will be Pinterest images or videos embedded, or downloaded and committed.
- Popular songs or the whole album per era via Spotify embed.
- Background playback of the era's songs through YouTube, if workable.
- A weekly recap that pulls new media (needs scheduled fetching; deferred).
- Wants a spec and a demo of the spec before the full build.
- Wants a simple local UI to judge fetched images: keep or reject, and set order.
- Copy must be plain and factual. No filler, no slogans, no decorative phrasing.

### Assumptions (correct these)
- Personal project, single author, no login, no comments, no backend.
- Desktop-first spectacle, but every page must work on a phone with motion scaled down.
- English copy. Korean used only for names and lore terms.
- Eras through October 2026 (Black Mamba to LEMONADE / KISS N TELL). New eras get added by adding a folder.
- Success looks like: you open an era page and it feels like that era's MV, the photos are the ones you chose in the order you chose, and it runs at 60fps on your Mac.

## 2. Information architecture

```
/                     Home: the Portal. Era timeline 2020 -> 2026, enter any era.
/era/<slug>/          Era page (template, ~17 instances).
/member/<slug>/       Per member: profile, lore role, solo work. Winter first; others follow.
/story/               The SMCU storyline in order, Black Mamba to Girls, then the post-lore concepts.
/about/               Credits, sources, takedown contact, "fan-made, not affiliated".
```

Era slugs: black-mamba, forever, next-level, savage, dreams-come-true, girls, my-world, better-things, drama, armageddon (incl. Supernova), parallel-line, whiplash, dirty-work, rich-man, aexis-line, wda, lemonade, kiss-n-tell. The media fetch may merge or drop thin ones; the spec does not require all to ship at launch.

### Era page template (top to bottom)
1. **Hero.** Full-bleed shader background in the era palette. Era title in the era-skinned display face, revealed with a scramble/decode effect. Release date, type (single/EP/album), and Winter's look that era (hair color, one-line styling note) in a monospace HUD strip.
2. **Watch.** The official MV as the LCP-safe poster with click-to-load player. Below it a horizontal, pinned, scroll-scrubbed rail of the top videos ranked by YouTube view count, split into official (MV, performance, dance practice) and fancams.
3. **Photocards.** Member subtabs (Karina, Giselle, Winter, Ningning, plus Group) above a masonry grid of curated photos as holographic photocards. Tilt and foil sheen on hover. Click opens a lightbox with a shared-element morph. Tag chips (teaser, stage, behind, fan-taken) reflow with FLIP. Tab choice persists across eras within the session.
4. **Listen.** The release on Spotify as an album embed (full tracklist, 30-second previews for logged-out listeners, full tracks when logged in). Title track and most-streamed tracks called out above it.
5. **Story.** The album's storyline in three to five factual sentences: lore beat where one exists, MV narrative, the concept SM stated. From MY WORLD on, the section says plainly that explicit lore stopped and describes the concept instead. Sources listed under the text.
6. **Next era.** Oversized link to the following era. Clicking triggers the portal wipe into the next era's palette.

The Watch rail's fancam group also follows the photocard member tab.

### Era soundtrack (phase 3)
Austin's idea: play the era's songs in the background while browsing.
- Built on the YouTube IFrame Player API with a per-era playlist from the curated manifest (title track first, then b-sides and Winter's solo tracks where relevant).
- The player lives in the fixed HUD as a small visible card (cover, title, play/pause, next). YouTube's terms require the player to be visible at 200 by 200 pixels or more, so it is never hidden or shrunk below that.
- Sound starts only after the first click on play, because browsers block autoplay with audio. State (playing, position) survives route changes through the persisted shell.
- Switching eras cross-fades the shader and, if the player is on, queues the new era's title track without stopping playback mid-song.

### Home (the Portal)
- Shader background in the base palette (near-black, chrome, ice-blue).
- Giant "WINTER" chrome headline with the æ ligature mark.
- A horizontal timeline strip: one swatch per era, pinned and scrubbed by scroll. Each swatch shows the era title, date, and one hero photo. Hovering a swatch pushes its palette into the shader; clicking enters the era with the portal wipe.

## 3. Visual system

### Base tokens
| Token | Value | Use |
|---|---|---|
| --bg | #0B0B10 | page background, dark default |
| --ink | #F3EFE6 | ivory text (Winter's fan color) |
| --chrome-hi / --chrome-lo | #DDE2EA / #6E7480 | chrome gradient endpoints |
| --ice | #A9D6FF | Winter's æ accent, focus rings, HUD rules |
| --violet | #6A3FC9 | lore accent |
| --acid | #B6FF3B | lore accent |

Neon accents stay under 10 percent of the surface. Chrome and ivory carry the page.

### Era token sets
Each era overrides four tokens: `--era-a` (dominant), `--era-b` (secondary), `--era-glow` (shader highlight), `--era-type` (display treatment: chrome, matte, mono, candy, grunge). Starting values from research:

| Era | --era-a | --era-b | --era-glow | --era-type |
|---|---|---|---|---|
| Black Mamba | #0A1E3F | #A9D6FF | #FFFFFF | chrome |
| Next Level | #C9A86A | #1C6E73 | #DDE2EA | chrome |
| Savage | #3B0F6B | #B6FF3B | #C9CED6 | chrome |
| Girls | #FF2BD6 | #22E1FF | #FFFFFF | chrome |
| MY WORLD | #FF3D7F | #FFE066 | #7CC6FF | candy |
| Drama | #B3121B | #0B0B10 | #D4AF37 | matte |
| Armageddon | #2A1250 | #FF6A1A | #8A8F99 | matte |
| Whiplash | #000000 | #FFFFFF | #C9CED6 | mono |
| Dirty Work | #8C4A2F | #3A3F44 | #E8E2D6 | grunge |
| Rich Man | #DCE9F2 | #E0A33A | #1A1A1E | matte |
| LEMONADE | #F7E85A | #F6A9D8 | #A8F0D1 | candy |
| KISS N TELL | #F6B8D8 | #2B2B3A | #FFFFFF | candy |

### Typography
- Display: **Saira Condensed** (800/900), uppercase, tight tracking, chrome gradient fill. Fallback Exo 2.
- Editorial: **Cormorant Garamond** italic for era subtitles and quotes, echoing SM's serif-against-techno mix.
- Body and HUD: **Inter** for body, **JetBrains Mono** for timestamps, counts, and bracketed HUD labels.
- The æ ligature is set in Cormorant as a brand glyph.

### Copy
Plain, factual, short. Headings are nouns (Watch, Photocards, Listen, Story). Section intros are one sentence or none. No slogans, no mood lines, no words that exist only to sound atmospheric. Facts carry the tone; the shader carries the mood.

### Motion vocabulary (named, reused everywhere)
| Name | What | Where | Budget |
|---|---|---|---|
| SYNK-in | mask-reveal of split lines sliding up, 40ms stagger | every headline on enter | GSAP SplitText |
| Decode | scramble-to-text with HUD glyph set | era title, HUD labels | GSAP ScrambleText, 0.8s |
| Glitch cut | 220ms RGB-split + row-slice on the shader and the hero | section change, card hover start | shader uniform + CSS |
| Portal wipe | radial noise mask crossfading old to new era palette | route change, timeline click | shader two-palette mix, 900ms |
| Sheen | specular highlight sweeping across chrome text | hover, on-enter once | CSS background-position |
| Holo tilt | 3D tilt + rainbow foil + scanline, color-dodge | photocards | CSS, hovered card only |
| Pulse | scroll progress rendered as a "SYNK rate" bar | fixed HUD | CSS scroll-timeline, JS fallback |

Reduced motion: shader renders a still frame, SYNK-in and Decode become instant, Glitch cut and Portal wipe become a 200ms crossfade, Holo tilt becomes a static foil, Lenis is off.

## 4. Technical approach

### Options considered
1. **Vite + vanilla TS single page app.** Simplest canvas ownership. Loses a build-time image pipeline and typed content as the gallery grows past a few hundred files.
2. **Astro + vanilla TS islands.** Recommended. Near-zero shipped JS outside the canvas and motion code, built-in AVIF/WebP image service, typed content collections for the per-era manifests, View Transitions router with `transition:persist` so one WebGL context survives navigation and the Portal wipe is possible.
3. **Next.js.** Heaviest, React not needed, App Router remounting fights a long-lived GL context, image optimization quota on free hosting.

### Stack (pinned at scaffold time)
- Astro 7, TypeScript, Vite 8 underneath.
- GSAP 3.15 with SplitText, ScrambleText, ScrollTrigger, Flip (all free).
- Lenis 1.3 for smoothed scroll on desktop, native on touch.
- OGL 1.0 for the single fullscreen shader quad (WebGL2). WebGPU not required; if a 3D chrome logo is wanted later, add three/webgpu for that one island.
- lite-youtube-embed for players.
- Hosting: **GitHub Pages** (decided 2026-10-06), deployed by a GitHub Actions workflow on push to main. Pages caps the site at 1 GB and about 100 GB per month of bandwidth, so the site holds a curated, resized set of self-hosted images and embeds the rest. Budget: under 400 MB of committed media. The repo is private until the first era pages are ready, then public, since Pages on a free plan requires a public repo.

### Shader design (one quad, two passes)
- Pass A: domain-warped FBM (3 octaves desktop, 2 mobile) shaped into a liquid-chrome height field; normals lit by a two-color gradient "matcap" built from `--era-a`, `--era-b`, `--era-glow`; thin-film iridescence ramp keyed to view angle; pointer flow map (ping-pong FBO at 1/4 res, decays per frame) warps UVs.
- Pass B: post. RGB split, scanline, row jitter, all gated by `uGlitch` (0 to 1). Portal wipe is `mix(paletteOld, paletteNew, smoothstep(radialSDF + noise, uPortal))`.
- Guardrails: DPR min(dpr, 1.5), 1.0 on `pointer: coarse`; init on intersection; RAF stops on hidden tab; fallback to a looping WebM of the shader plus CSS gradients when WebGL2 is missing.

## 5. Content pipeline

```
media/raw/<era>/            fetched, untrusted, gitignored (images, yt-thumbs, manifest.json)
        |
   tools/curator/           local web UI (Node, no deps): keep / reject / reorder / tag
        |
src/content/eras/<slug>.json   curated, ordered, committed. The only thing pages read.
        |
   Astro content collection + <Image> at build -> /era/<slug>/
```

### Curated manifest shape (`src/content/eras/<slug>.json`)
```json
{
  "slug": "whiplash", "title": "Whiplash", "releaseDate": "2024-10-21", "type": "EP",
  "spotify": { "album": "22charId", "titleTrack": "22charId" },
  "story": { "text": ["...", "..."], "sources": ["https://..."] },
  "videos": [ { "ytId": "...", "title": "...", "channel": "SMTOWN", "kind": "mv", "views": 123, "member": null } ],
  "images": [
    { "src": "media/whiplash/0001.jpg", "alt": "...", "member": "winter", "tags": ["teaser"], "credit": "SM Entertainment", "sourceUrl": "..." },
    { "embed": "https://www.pinterest.com/pin/...", "alt": "...", "member": "karina", "tags": ["fan"], "credit": "@handle" }
  ]
}
```
`member` is one of karina, giselle, winter, ningning, or group. The fetch script takes a member flag; the first run fetched Winter only (17 eras, 331 videos, 674 images, 375 MB, see `media/raw/REPORT.md`).
An image is either `src` (self-hosted, lives in `public/media/<era>/`) or `embed` (rendered via the official embed script). The gallery component accepts both, so switching policy later is a data edit.

### Embed vs self-host policy
- Self-host: official SM teaser and concept photos, Wikimedia Commons CC photos, YouTube thumbnails as posters, and the curated top picks per era and member (resized to 1600 px long edge, AVIF with JPEG fallback, roughly 40 per era per member).
- Embed: Pinterest pins, Instagram, TikTok, and any fan-taken photo beyond the curated set or where the photographer forbids reposting. Embeds cost nothing against the Pages size cap.
- `/about/` carries credits and a takedown email. Honor requests within a day.

## 6. Curator tool (`tools/curator/`)

Built 2026-10-06. A local dev tool, not shipped with the site. `node tools/curator/server.mjs` serves the UI at `http://127.0.0.1:4747`, the raw media read-only, on-demand thumbnails (cached in `media/thumbs/`), and the curation API.

- UI: eras on the left, member tabs and a Photos/Videos switch at the top, filter chips (all, unreviewed, kept, rejected, flagged), the grid in the middle with the fetch's quality-control flags on each card, and the kept list in order on the right with drag reorder.
- Keyboard: `K` keep, `X` reject, `U` unreview, `1-4` tag (teaser, stage, behind, fan), `M` cycle member assignment, `E` move to another era, arrows move, `Space` full size, `S` save. The selection stays in place after a decision; the unreviewed filter removes decided cards so reviewing flows.
- Writes `src/content/eras/<slug>.json` (autosave) holding every decision with state, order, tags, member, credit and source URLs, plus `media/raw/<slug>/rejected.txt` so a re-fetch skips rejected pins. A move writes both eras' files.
- "Export kept" resizes kept photos to 1600 px JPEG into `public/media/<era>/<member>/NNN.jpg`, records `src` on each item and reports the `public/media` total against the 400 MB budget. AVIF comes from the site build, not the curator.
- The site build reads only `src/content/eras/*.json`; the raw pool and curator are never deployed.

## 7. Performance and accessibility
- Largest Contentful Paint is the era title or MV poster, never the canvas.
- No layout reads in scroll or pointermove handlers; everything flows through the GSAP ticker.
- Fixed aspect boxes for every embed to avoid layout shift.
- Keyboard: all cards and timeline swatches are real links or buttons; custom cursor never hides focus rings.
- `prefers-reduced-motion` honored as listed in section 3.
- Budget: initial JS under 150KB gzip on an era page, including GSAP plugins and OGL. Shader compile under 100ms on an M-series Mac.

## 8. Phases
0. **Spec + demo** (this document, `demo/index.html`). Review gate.
0b. **Fetch the other members.** Re-run the fetch with member flags for Karina, Giselle, Ningning, and group shots. Same pipeline, new folders.
1. **Scaffold + curator.** Astro project, tokens, fonts, shader island, era page template fed by one real curated manifest. Curator tool working end to end on the fetched media. Review gate: one era page live locally with real photos.
2. **All eras + home.** Curate every era, build the Portal home and timeline, Winter solo page, about page.
3. **Motion polish + soundtrack.** Portal wipe across routes, lightbox morph, Flip filtering, magnetic buttons and cursor on desktop, era soundtrack player.
4. **Deploy.** GitHub Actions workflow to Pages, repo flipped public, custom domain if wanted, Lighthouse pass.

Fluid cursor trail and a 3D glTF logo are explicitly deferred to after phase 4.

## 9. Out of scope
- Accounts, comments, likes, or any backend.
- Self-hosting video. Videos are YouTube embeds only.
- Scraping behind logins. The fetch uses only public endpoints.
- Korean localization.

## 10. Deferred: weekly recap

Austin's idea: a "this week" page that pulls new Winter media and history (TikTok, X, YouTube) and surfaces it on the site.

Sketch, no server required:
- A GitHub Actions cron (Monday 09:00 KST) runs `tools/fetch/recap.mjs`, which queries sources for items newer than the last run, writes `src/content/recaps/<iso-week>.json`, commits, and triggers the static rebuild.
- The recap page renders the week as a dated feed in the current era's palette, with the same video and photocard components as era pages. Older weeks stay as an archive.
- Sources that actually work without paid APIs: YouTube search and channel feeds via yt-dlp; aespa's official TikTok profile via yt-dlp; Instagram and Weverse only as manual links. X's API is paid and heavily rate-limited, so X items would be pasted into a weekly inbox file rather than fetched.
- Items land in the curator inbox first. Nothing is published without a keep decision, which keeps the embed policy intact.

Not in phases 0 to 4. Revisit after the era pages are live.

## 11. Decisions for Austin
1. **Stack: Astro (recommended) vs vanilla Vite.** Astro costs one layer of indirection around the canvas and buys the image pipeline and typed manifests. If you'd rather own every line, Vite is fine and the shader and motion code is identical.
2. **Hosting.** Decided: GitHub Pages with a curated self-hosted set and embeds for the rest. Public repo once era pages exist.
3. **Embed policy.** Decided: self-host official assets and the curated picks, embed the rest.
4. **Era granularity.** Separate pages for thin eras (Forever, Dreams Come True, Better Things, ATTITUDE) or fold them into the nearest big era as a section. Recommendation: fold until the media exists to justify a page.
5. **Member scope order.** Build Winter end to end first and add the other three once the pipeline is proven, or fetch all four before building any era page. Recommendation: Winter first, since the fetch for the others takes about fifteen minutes and can run while phase 1 is underway.
6. **Spotify vs YouTube for audio.** Spotify embeds give tracklists and full playback for logged-in listeners but cannot run in the background across pages. The YouTube player can. Recommendation: Spotify in the Listen section, YouTube for the persistent player, both driven from the same manifest.
