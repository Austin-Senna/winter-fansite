# Technical research brief: Awwwards-style animated fansite (Oct 2026)

## 1. Technique inventory

### WebGL/GLSL shader backgrounds (liquid chrome, FBM noise, glitch, holo)
- Liquid metal = FBM/domain-warped noise driving normals, reflected into an environment (HDR equirect or a fake 2-color gradient matcap). Holographic = thin-film interference (cos(thickness * viewAngle) ramps or an iridescence LUT). Three's MeshPhysicalMaterial has iridescence built in.
- RGB-split glitch, scanlines, chromatic aberration: post-process on a fullscreen quad (sample R/G/B at offset UVs, sin(uv.y*N) scanline, random row jitter on stepped time).
- Ray-marched blobs: expensive (64+ steps/pixel). Render at half resolution to an FBO and upscale.
- Mouse-reactive distortion: pointer-velocity flow map FBO (ping-pong, decays each frame) into UV offsets.
- Libraries: Three.js r186 (0.186.1) with three/webgpu + TSL; or OGL 1.0.11 (~30KB) for one fullscreen plane. Raw WebGL2 is fine for a single quad.
- Perf: fullscreen fragment shader at DPR 2 on 1440p is ~15M fragments/frame. Cap DPR at 1.5-2, render heavy passes at 0.5x.
- Mobile: 1-2 octaves noise + glitch OK; no ray-marching. Cheaper variant on pointer: coarse.
- WebGPU in 2026: Baseline since Nov 2025 but Linux, Intel Macs, Firefox Android still partial (~87% incl. partials). Not safe to require. WebGPURenderer falls back to WebGL2 automatically. OGL is WebGL2 only, fine for this project.

### Image/video distortion on hover
- Curtains.js dormant (last push Apr 2025); successor gpu-curtains. OGL Plane + resize observer is ~100 lines. Displacement map mixed by GSAP-tweened uProgress; hover velocity drives RGB split. Pause offscreen via IntersectionObserver. On mobile trigger on scroll-into-view.

### Scroll-driven animation
- CSS animation-timeline: scroll()/view(): Chrome 115+, Safari 26+, ~87%; Firefox stable lacks it. Off main thread. Use for cheap parallax with @supports.
- GSAP ScrollTrigger 3.15 (free) for pins, scrubbed timelines, horizontal galleries.
- Lenis 1.3.26: lerps native scroll; sticky and scroll-timelines keep working. Hook lenis.on('scroll', ScrollTrigger.update), drive from gsap.ticker. Keep native touch momentum.

### Page/section transitions
- View Transitions same-document ~92%; cross-document (MPA) Chrome 126+, Safari 18.2+, Firefox partial. Astro <ClientRouter> wraps it.
- GSAP Flip (free): masonry filter reflow, card-to-detail morphs.
- Shader portal wipes: render old and new to two FBOs, mix with noise/radial SDF driven by uProgress. Requires a persistent GL context across routes (SPA-like shell, or Astro transition:persist).

### Text effects
- GSAP SplitText free since 3.13 (autoSplit, mask, aria handling). ScrambleTextPlugin free. Variable font axis tween via @property custom prop (headlines only). CSS marquee with duplicated track.

### 3D
- R3F 9.8.1, drei 10.7.9. Worth it for one hero object (glTF logo/light stick with iridescence + transmission). Not worth it for backgrounds; 2D fragment shader is 5-10x cheaper. Skip React for a static fansite.

### Cursor
- Fluid trails: webgl-fluid-enhanced 0.8 (wrap of PavelDoGreat sim). 6-8 fullscreen passes/frame, second GL context. Sim res 128-256, dye 512. Magnetic buttons via GSAP quickTo. Both off on touch.

### Holo card tilt
- simeydotme pokemon-cards-css: rotateX/Y from pointer, 110deg repeating rainbow gradient + 90deg scanline gradient, mix-blend-mode: color-dodge, filter brightness/contrast/saturate, background-position via CSS vars. Pure CSS. Keep will-change only on the hovered card.

### Masonry / filter / lightbox
- Native grid-lanes only Safari 26.4+. Use CSS columns (static) or JS masonry (filterable). Filter with GSAP Flip; lightbox via view-transition-name with GSAP fallback.

## 2. Stack recommendation

| | Vite + vanilla TS | Astro + islands | Next.js |
|---|---|---|---|
| Canvas-centric shell | best; one GL context survives nav | good with ClientRouter + transition:persist | poor; App Router remounts |
| Image pipeline | manual (vite-imagetools) | built-in Image/Picture, AVIF/WebP at build | needs Vercel loader, 1000/mo cap on Hobby |
| Scaling to hundreds of media items | hand-rolled JSON | Content Collections, type-checked | fine, heavier |
| Embeds | manual | component per embed, client:visible | same, more React weight |
| Static deploy | any | any | Vercel-centric |

Recommendation: Astro 7.3.5 + vanilla TS islands + GSAP 3.15 + Lenis + OGL (or three/webgpu if the 3D logo is wanted). Deploy to Cloudflare Workers static assets (Pages is maintenance mode); GitHub Pages caps at 1GB and 100GB/month soft. Keep videos out of git (R2 or YouTube embeds). Astro on Vite 8.3 (Rolldown).

## 3. Embedding
- Pinterest: official widget builder, pinit.js + data-pin-do="embedPin|embedBoard|embedUser". Board widget caps at 50 pins, fixed layout. For design control use API v5 and download at build time.
- YouTube: lite-youtube-embed (poster + click-to-load).
- TikTok: blockquote.tiktok-embed + embed.js, or oEmbed. Load in client:visible island.
- Instagram: raw blockquote.instagram-media + embed.js works; tokenless oEmbed claim (June 2026) rests on one secondary source, verify.
- Legal: embedding protected by the server test (Hunley v. Instagram, 9th Cir. 2023); re-hosting fan photos implicates reproduction rights and many K-pop fansite photographers forbid re-upload. Embed by default, re-host only official SM press assets or with permission, honor takedowns.

## 4. Performance and accessibility guardrails
- prefers-reduced-motion: static shader frame, gsap.matchMedia gating, disable Lenis, instant text.
- DPR: min(devicePixelRatio, 2); 1.5 for post-processed scenes; 1 on pointer: coarse.
- One shared GL context; half-res FBOs for heavy passes; EXT_disjoint_timer_query_webgl2 in dev to scale octaves down above ~12ms.
- Lazy init renderer on IntersectionObserver (rootMargin 200px); stop RAF when hidden / visibilitychange.
- Fallbacks: test webgl2 and navigator.gpu; fall back to looping AVIF/WebM of the shader + CSS gradients.
- CWV: canvas is not an LCP candidate; make the headline or poster the LCP; never do layout reads in scroll/pointermove; reserve embed dimensions.
- A11y: SplitText handles aria; custom cursors must not hide focus rings; real DOM behind the canvas.

## 5. Reference sites
- Igloo Inc (SOTY 2024): particle fluid sim, in-shader chromatic aberration and SDF text glitch; Three.js + Svelte + GSAP.
- Lusion v3 (SOTY 2023): seamless scene transitions, benchmark for portal handoffs.
- Mat Voyce: kinetic typography via GSAP + WebGL, transform/opacity-only discipline.
- Album Atlas (HM Apr 2026): music discovery WebGL, artist-to-album transitions.
- 24/7 Artists (SOTD Apr 2025): scroll storytelling with depth parallax.
- Paul Kalkbrenner (SOTD Sep 2026): two-color music-artist site that wins on transitions without heavy WebGL.
- poke-holo.simey.me: the holo photocard technique.
- No K-pop artist web property won Awwwards/FWA in 2025-26.

## 6. Versions (Oct 2026)
- GSAP 3.15.0, all plugins free incl. commercial (Webflow acquisition; free since 3.13, Apr 30 2025). gsap-trial deprecated.
- Three.js 0.186.1; WebGPURenderer recommended since r182. Lenis 1.3.26; OGL 1.0.11; Astro 7.3.5; Vite 8.3.2; R3F 9.8.1; drei 10.7.9.

## Recommended technique set (ranked by payoff per cost)
1. Holo photocard tilt gallery (CSS).
2. GSAP SplitText + ScrambleText headline reveals.
3. Lenis + ScrollTrigger pinned storytelling with horizontal era timeline.
4. Single fullscreen OGL background shader: FBM liquid chrome + iridescence ramp + mouse flow-map, DPR-capped, reduced-motion still frame.
5. RGB-split/scanline glitch post-pass on the same quad, on section change and hover.
6. View Transitions lightbox + Flip-animated masonry filtering.
7. Magnetic buttons + custom cursor (desktop only).
8. Shader portal wipe between routes (transition:persist canvas, two-FBO mix).
9. 3D chrome logo/light stick glTF, lazy-loaded.
10. Fluid cursor trail: highest wow, highest cost, desktop only, add last.
