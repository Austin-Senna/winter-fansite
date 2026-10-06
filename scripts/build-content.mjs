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

async function dirSize(d) {
  let t = 0; if (!existsSync(d)) return 0;
  for (const e of await fs.readdir(d, { withFileTypes: true })) { const p = path.join(d, e.name); t += e.isDirectory() ? await dirSize(p) : (await fs.stat(p)).size; }
  return t;
}

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
if (size > BUDGET) { console.error('public/media exceeds the 400 MB budget'); process.exit(1); }
