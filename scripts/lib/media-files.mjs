// Content-addressed names for local media and pruning of files the generated content no longer references.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export function outputName(img) {
  const h = createHash('sha1').update(img.file).digest('hex').slice(0, 10);
  return `${img.member}-${h}.jpg`;
}

// Removes files under <publicRoot>/<slug> whose public path ('media/<slug>/...') is not in `referenced`. Returns the removed paths relative to publicRoot.
export function pruneUnreferenced(publicRoot, slug, referenced) {
  const eraDir = path.join(publicRoot, slug);
  if (!fs.existsSync(eraDir)) return [];
  const removed = [];
  const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else { const rel = path.relative(publicRoot, p); if (!referenced.has(path.posix.join('media', rel.split(path.sep).join('/')))) { fs.unlinkSync(p); removed.push(rel.split(path.sep).join('/')); } } } };
  walk(eraDir);
  return removed.sort();
}
