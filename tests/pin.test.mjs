import test from 'node:test';
import assert from 'node:assert/strict';
import { pinVariant, pinSrcset } from '../src/lib/pin.ts';

test('variant swaps the originals segment and forces a jpg extension', () => {
  assert.equal(pinVariant('https://i.pinimg.com/originals/90/64/00/abc.png', 736), 'https://i.pinimg.com/736x/90/64/00/abc.jpg');
  assert.equal(pinVariant('https://i.pinimg.com/originals/90/64/00/abc.jpg', 1200), 'https://i.pinimg.com/1200x/90/64/00/abc.jpg');
});
test('non-pinterest urls pass through unchanged', () => {
  assert.equal(pinVariant('https://upload.wikimedia.org/x.jpg', 736), 'https://upload.wikimedia.org/x.jpg');
});
test('srcset lists each width with its descriptor', () => {
  assert.equal(pinSrcset('https://i.pinimg.com/originals/a/b/c/d.png', [474, 736]), 'https://i.pinimg.com/474x/a/b/c/d.jpg 474w, https://i.pinimg.com/736x/a/b/c/d.jpg 736w');
});
