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
