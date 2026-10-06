#!/usr/bin/env node
// Local step: raw manifest + curator decisions -> committed content and local media.
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { eraContent, MEMBERS } from './lib/select.mjs';
import { outputName, pruneUnreferenced } from './lib/media-files.mjs';
import sharp from 'sharp';

const exec = promisify(execFile);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const RAW = path.join(ROOT, 'media', 'raw');
const CURATED = path.join(ROOT, 'src', 'content', 'eras');
const OUT = path.join(CURATED, '_generated');
const PUBLIC = path.join(ROOT, 'public', 'media');
const BUDGET = 400 * 1024 * 1024;
const FEATURED = path.join(ROOT, 'docs', 'copy', 'featured.json'); // hand-picked hero photo per era and member

async function readJson(p) { return JSON.parse(await fs.readFile(p, 'utf8')); }
async function curationFor(slug) { const p = path.join(CURATED, slug + '.json'); return existsSync(p) ? readJson(p) : null; }

async function localize(slug, img) {
  if (img.src) { // curator already exported
    if (!existsSync(path.join(ROOT, 'public', img.src))) throw new Error(`kept image missing on disk: public/${img.src} (from ${img.file})`);
    return img.src;
  }
  const srcPath = path.join(RAW, img.file);
  if (!existsSync(srcPath)) throw new Error(`image missing on disk: media/raw/${img.file}`);
  const dir = path.join(PUBLIC, slug, img.member);
  await fs.mkdir(dir, { recursive: true });
  const name = outputName(img); // content-addressed: reordering never changes which pixels sit behind a credit
  const out = path.join(dir, name);
  if (!existsSync(out)) await exec('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '85', '-Z', '1600', srcPath, '--out', out]);
  return path.posix.join('media', slug, img.member, name);
}

// Responsive WebP copies of a local image, content-addressed next to the JPEG. Returns { variants: { w480, w960 } }.
async function variants(slug, img) {
  if (!img.src) return {};
  const jpeg = path.join(ROOT, 'public', img.src);
  const out = {};
  for (const w of [480, 960]) {
    const rel = img.src.replace(/\.jpg$/, `-${w}.webp`);
    const abs = path.join(ROOT, 'public', rel);
    if (!existsSync(abs)) await sharp(jpeg).resize({ width: w, withoutEnlargement: true }).webp({ quality: 78 }).toFile(abs);
    out['w' + w] = rel;
  }
  return { variants: out };
}

async function dirSize(d) {
  let t = 0; if (!existsSync(d)) return 0;
  for (const e of await fs.readdir(d, { withFileTypes: true })) { const p = path.join(d, e.name); t += e.isDirectory() ? await dirSize(p) : (await fs.stat(p)).size; }
  return t;
}

const manifest = await readJson(path.join(RAW, 'manifest.json'));
const featuredPicks = existsSync(FEATURED) ? await readJson(FEATURED) : {};
// Cover cards are 3:4. Prefer the hand pick when its own proportions are close; otherwise the best clean candidate that is.
const CARD = 3 / 4, TOL = 0.09;
const nearCard = i => i.width && i.height && Math.abs(i.width / i.height - CARD) <= TOL;
const QC_BAD = new Set(['small', 'dupe', 'blurry', 'member-mismatch', 'era-mismatch']);
const SRC_RANK = { official: 0, pinterest: 1, commons: 2 };
function rankCandidates(era, member) {
  const meta = i => [i.title, i.description, i.board, i.altText].map(x => String(x || '').toLowerCase()).join(' ');
  return era.images
    .filter(i => i.file && (i.member || 'group') === member && (i.width || 0) >= 1000 && !(i.qc?.flags || []).some(f => QC_BAD.has(f)))
    .sort((a, b) => (/(teaser|concept|photoshoot|promo|cover)/.test(meta(a)) ? 0 : 1) - (/(teaser|concept|photoshoot|promo|cover)/.test(meta(b)) ? 0 : 1) || (SRC_RANK[a.source] ?? 3) - (SRC_RANK[b.source] ?? 3) || (b.width * b.height) - (a.width * a.height));
}
// The hand pick wins whenever it is a portrait at all (a 3:4 card crops it gently, anchored near the face).
// Only a landscape or square pick is swapped for the best clean candidate that is already near 3:4.
const portraitish = i => i.width && i.height && i.width / i.height <= 0.95;
function pickForCard(era, member, pickFile) {
  const pick = pickFile ? era.images.find(i => i.file === pickFile) : null;
  if (pick && portraitish(pick)) return pick.file;
  const alt = rankCandidates(era, member).find(nearCard);
  return alt?.file ?? pick?.file ?? null;
}
function shapeFeatured(era, file) {
  const i = era.images.find(x => x.file === file);
  if (!i) return null;
  const local = i.source === 'official' || i.source === 'commons';
  return { member: i.member || 'group', kind: local ? 'local' : 'remote', ...(local ? {} : { remote: i.sourceUrl }), pageUrl: i.pageUrl ?? null, credit: i.credit ?? null, width: i.width ?? null, height: i.height ?? null, tags: [], ...(i.license ? { license: i.license, licenseUrl: i.licenseUrl ?? null } : {}), file };
}
await fs.mkdir(OUT, { recursive: true });
let totalImages = 0;
for (const era of manifest.eras) {
  const content = eraContent(era, await curationFor(era.slug), { limit: 24 });
  const referenced = new Set();
  for (const m of MEMBERS) {
    for (const img of content.images[m]) {
      if (img.kind === 'local') { img.src = await localize(era.slug, img); Object.assign(img, await variants(era.slug, img)); referenced.add(img.src); for (const v of Object.values(img.variants ?? {})) referenced.add(v); }
      delete img.file; // raw paths never ship
      totalImages++;
    }
  }
  content.featured = {};
  for (const m of MEMBERS) {
    const file = pickForCard(era, m, featuredPicks[era.slug]?.[m]);
    const f = file ? shapeFeatured(era, file) : null;
    if (f && f.kind === 'local') { f.src = await localize(era.slug, f); Object.assign(f, await variants(era.slug, f)); referenced.add(f.src); for (const v of Object.values(f.variants ?? {})) referenced.add(v); }
    if (f) delete f.file;
    content.featured[m] = f;
  }
  // Hero: a group photo near 3:4 if one exists, else the first member slot that is.
  content.featured.hero = content.featured.group ?? content.featured.winter ?? content.featured.karina ?? content.featured.giselle ?? content.featured.ningning ?? null;
  const pruned = pruneUnreferenced(PUBLIC, era.slug, referenced);
  if (pruned.length) console.log(`pruned ${pruned.length} unreferenced files under public/media/${era.slug}`);
  content.title = era.title; content.releaseDate = era.releaseDate; content.generatedAt = new Date().toISOString();
  await fs.writeFile(path.join(OUT, era.slug + '.json'), JSON.stringify(content, null, 2) + '\n');
}
const size = await dirSize(PUBLIC);
console.log(`content: ${manifest.eras.length} eras, ${totalImages} images, public/media ${(size / 1e6).toFixed(1)} MB`);
if (size > BUDGET) { console.error('public/media exceeds the 400 MB budget'); process.exit(1); }
