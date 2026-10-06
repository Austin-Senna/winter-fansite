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
test('kept item missing from the manifest still renders from its own fields', () => {
  const cur = { images: [ { file: 'gone', state: 'keep', order: 0, member: 'winter', source: 'pinterest', sourceUrl: 'https://i.pinimg.com/gone.jpg', pageUrl: 'https://pinterest.com/pin/9', credit: 'pinterest:z', width: 1200, height: 1600 } ] };
  const out = selectImages([], cur, { member: 'winter' });
  assert.equal(out.length, 1); assert.equal(out[0].kind, 'remote'); assert.equal(out[0].remote, 'https://i.pinimg.com/gone.jpg'); assert.equal(out[0].credit, 'pinterest:z');
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
