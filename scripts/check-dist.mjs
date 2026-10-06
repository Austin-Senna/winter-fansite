import fs from 'node:fs';
import path from 'node:path';
import { ERAS } from '../src/data/eras.ts';
import { MEMBERS } from '../src/data/members.ts';
const dist = path.resolve('dist');
const defaults = ['index.html', 'about/index.html', ...ERAS.map(e => `era/${e.slug}/index.html`), ...MEMBERS.map(m => `member/${m.slug}/index.html`)];
const required = process.argv.slice(2).length ? process.argv.slice(2) : defaults;
let fail = false;
for (const rel of required) {
  const p = path.join(dist, rel);
  if (!fs.existsSync(p)) { console.error('missing', rel); fail = true; continue; }
  const html = fs.readFileSync(p, 'utf8');
  if (!/<title>[^<]+<\/title>/.test(html)) { console.error('no title', rel); fail = true; }
}
if (fail) process.exit(1);
console.log('dist ok:', required.length, 'pages');
