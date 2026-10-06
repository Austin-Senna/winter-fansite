#!/usr/bin/env node
// Curator: local server for reviewing fetched media and writing curated era manifests.
// No dependencies. Run: node tools/curator/server.mjs [port]
import http from 'node:http';
import fs from 'node:fs/promises';
import { createReadStream, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..', '..');
const RAW = path.join(ROOT, 'media', 'raw');
const THUMBS = path.join(ROOT, 'media', 'thumbs');
const CURATED = path.join(ROOT, 'src', 'content', 'eras');
const PUBLIC_MEDIA = path.join(ROOT, 'public', 'media');
const PORT = Number(process.argv[2] || 4747);
const SLUG = /^[a-z0-9-]+$/;

const MIME = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.js': 'text/javascript' };

function safeJoin(base, rel) {
  const p = path.normalize(path.join(base, rel));
  if (!p.startsWith(base + path.sep) && p !== base) throw Object.assign(new Error('path escapes base'), { status: 400 });
  return p;
}
function send(res, status, body, type = 'application/json') {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}
async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks).toString('utf8');
}
async function streamFile(res, file) {
  const st = await fs.stat(file);
  res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'content-length': st.size, 'cache-control': 'public, max-age=3600' });
  createReadStream(file).pipe(res);
}

// Thumbnails via macOS sips, cached under media/thumbs mirroring the raw path.
const inflight = new Map();
async function thumb(rel) {
  const src = safeJoin(RAW, rel);
  const out = safeJoin(THUMBS, rel.replace(/\.[^.]+$/, '') + '.jpg');
  if (existsSync(out)) return out;
  if (inflight.has(out)) return inflight.get(out);
  const job = (async () => {
    await fs.mkdir(path.dirname(out), { recursive: true });
    await exec('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '80', '-Z', '520', src, '--out', out]);
    return out;
  })().finally(() => inflight.delete(out));
  inflight.set(out, job);
  return job;
}

async function readCuration(slug) {
  try { return JSON.parse(await fs.readFile(path.join(CURATED, slug + '.json'), 'utf8')); }
  catch (e) { if (e.code === 'ENOENT') return null; throw e; }
}
async function writeCuration(slug, data) {
  await fs.mkdir(CURATED, { recursive: true });
  data.updatedAt = new Date().toISOString();
  await fs.writeFile(path.join(CURATED, slug + '.json'), JSON.stringify(data, null, 2) + '\n');
  // Rejected list next to the raw era so a re-fetch can skip these pins.
  const rejected = (data.images || []).filter(i => i.state === 'reject').map(i => i.file);
  const eraDir = path.join(RAW, slug);
  if (existsSync(eraDir)) await fs.writeFile(path.join(eraDir, 'rejected.txt'), rejected.join('\n') + (rejected.length ? '\n' : ''));
  return data;
}

// Export kept images: resized JPEG copies under public/media/<era>/<member>/NNN.jpg.
async function exportEra(slug) {
  const cur = await readCuration(slug);
  if (!cur) throw Object.assign(new Error('no curation for ' + slug), { status: 404 });
  const kept = (cur.images || []).filter(i => i.state === 'keep' && i.file);
  const counters = {};
  let bytes = 0;
  for (const img of kept) {
    const member = img.member || 'group';
    counters[member] = (counters[member] || 0) + 1;
    const name = String(counters[member]).padStart(3, '0') + '.jpg';
    const outDir = path.join(PUBLIC_MEDIA, slug, member);
    await fs.mkdir(outDir, { recursive: true });
    const out = path.join(outDir, name);
    await exec('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '85', '-Z', '1600', safeJoin(RAW, img.file), '--out', out]);
    bytes += (await fs.stat(out)).size;
    img.src = path.posix.join('media', slug, member, name);
  }
  await writeCuration(slug, cur);
  let total = 0;
  async function walk(d) { for (const e of await fs.readdir(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) await walk(p); else total += (await fs.stat(p)).size; } }
  if (existsSync(PUBLIC_MEDIA)) await walk(PUBLIC_MEDIA);
  return { exported: kept.length, bytes, publicTotalBytes: total };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = decodeURIComponent(url.pathname);
  try {
    if (req.method === 'GET' && (p === '/' || p === '/index.html')) return await streamFile(res, path.join(here, 'index.html'));
    if (req.method === 'GET' && p === '/api/manifest') return await streamFile(res, path.join(RAW, 'manifest.json'));
    if (req.method === 'GET' && p === '/api/curations') {
      const out = {};
      if (existsSync(CURATED)) for (const f of await fs.readdir(CURATED)) if (f.endsWith('.json')) out[f.slice(0, -5)] = JSON.parse(await fs.readFile(path.join(CURATED, f), 'utf8'));
      return send(res, 200, out);
    }
    let m;
    if ((m = p.match(/^\/api\/curation\/([a-z0-9-]+)$/))) {
      if (req.method === 'GET') return send(res, 200, (await readCuration(m[1])) || { slug: m[1], images: [], videos: [] });
      if (req.method === 'PUT') { const data = JSON.parse(await readBody(req)); if (data.slug !== m[1]) throw Object.assign(new Error('slug mismatch'), { status: 400 }); return send(res, 200, await writeCuration(m[1], data)); }
    }
    if (req.method === 'POST' && (m = p.match(/^\/api\/export\/([a-z0-9-]+)$/))) return send(res, 200, await exportEra(m[1]));
    if (req.method === 'GET' && p.startsWith('/raw/')) return await streamFile(res, safeJoin(RAW, p.slice(5)));
    if (req.method === 'GET' && p.startsWith('/thumb/')) return await streamFile(res, await thumb(p.slice(7)));
    send(res, 404, { error: 'not found' });
  } catch (e) {
    if (e.code === 'ENOENT') return send(res, 404, { error: 'not found' });
    send(res, e.status || 500, { error: e.message });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`curator  http://127.0.0.1:${PORT}`);
  console.log(`raw      ${RAW}`);
  console.log(`curated  ${CURATED}`);
});
