import test from 'node:test';
import assert from 'node:assert/strict';
import { ERAS, nextEra, MAIN_ERAS } from '../src/data/eras.ts';
import { MEMBERS } from '../src/data/members.ts';

const SLUGS = ['black-mamba','forever','next-level','savage','dreams-come-true','girls','my-world','better-things','drama','armageddon','whiplash','dirty-work','rich-man','attitude','lemonade','kiss-n-tell','winter-solo'];
const HEX = /^#[0-9A-F]{6}$/i;
const SPOTIFY = /^[0-9A-Za-z]{22}$/;

test('eras cover every fetched slug in release order', () => {
  assert.deepEqual(ERAS.map(e => e.slug), SLUGS);
  for (let i = 1; i < ERAS.length - 1; i++) assert.ok(ERAS[i-1].releaseDate <= ERAS[i].releaseDate, ERAS[i].slug);
});
test('every era has complete theme, spotify, story', () => {
  for (const e of ERAS) {
    for (const k of ['a','b','glow','ink']) assert.match(e.theme[k], HEX, `${e.slug} ${k}`);
    assert.ok([0,1,2,3].includes(e.theme.mode), e.slug);
    if (e.spotify.album) assert.match(e.spotify.album, SPOTIFY, e.slug);
    for (const t of e.spotify.tracks ?? []) assert.match(t.id, SPOTIFY, e.slug);
    assert.ok(e.spotify.album || e.spotify.tracks?.length, `${e.slug} has no spotify`);
    assert.ok(e.story.text.length >= 2 && e.story.sources.length >= 1, `${e.slug} story`);
    assert.ok(e.kicker.length > 0 && e.kicker.length < 80, e.slug);
    assert.ok(!/—/.test(e.kicker + e.story.text.join('')), `${e.slug} em dash`);
  }
});
test('nextEra follows the main era chain and wraps', () => {
  assert.equal(nextEra('black-mamba').slug, 'next-level');
  assert.equal(nextEra('forever').slug, 'next-level');
  assert.equal(nextEra('kiss-n-tell').slug, 'black-mamba');
  assert.equal(nextEra('winter-solo').slug, 'black-mamba');
});
test('main eras are the mini albums, albums and full promotion singles', () => {
  assert.deepEqual(MAIN_ERAS().map(e => e.slug), ['black-mamba','next-level','savage','girls','my-world','drama','armageddon','whiplash','dirty-work','rich-man','lemonade','kiss-n-tell']);
  for (const e of ERAS) assert.ok(['era','release'].includes(e.tier), e.slug);
});
test('members are the four with lore roles and sources', () => {
  assert.deepEqual(MEMBERS.map(m => m.slug), ['karina','giselle','winter','ningning']);
  for (const m of MEMBERS) { assert.ok(m.loreRole && m.sources.length >= 1 && m.solo.length >= 1, m.slug); }
});
test('every member has a complete page theme', () => {
  for (const m of MEMBERS) {
    for (const k of ['a','b','glow','ink']) assert.match(m.theme[k], HEX, `${m.slug} ${k}`);
    assert.ok([0,1,2,3].includes(m.theme.mode), m.slug);
  }
  assert.notEqual(MEMBERS[0].theme.a, MEMBERS[3].theme.a, 'members do not share a palette');
});
