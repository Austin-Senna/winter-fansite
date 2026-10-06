import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { outputName, pruneUnreferenced } from '../scripts/lib/media-files.mjs';

test('output name is stable per source file and changes when the source changes', () => {
  const a = outputName({ file: 'drama/winter/commons/1.jpg', member: 'winter' });
  assert.equal(a, outputName({ file: 'drama/winter/commons/1.jpg', member: 'winter' }));
  assert.match(a, /^winter-[0-9a-f]{10}\.jpg$/);
  assert.notEqual(a, outputName({ file: 'drama/winter/commons/2.jpg', member: 'winter' }));
});
test('prune removes files under an era directory that the generated content no longer references', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'media-'));
  const dir = path.join(root, 'drama', 'winter'); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'winter-keep.jpg'), 'x'); fs.writeFileSync(path.join(dir, 'winter-stale.jpg'), 'x');
  const removed = pruneUnreferenced(root, 'drama', new Set(['media/drama/winter/winter-keep.jpg']));
  assert.deepEqual(removed, ['drama/winter/winter-stale.jpg']);
  assert.ok(fs.existsSync(path.join(dir, 'winter-keep.jpg')));
  assert.ok(!fs.existsSync(path.join(dir, 'winter-stale.jpg')));
});
