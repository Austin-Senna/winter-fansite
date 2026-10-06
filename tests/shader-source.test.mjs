import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const path = new URL('../src/scripts/shader.ts', import.meta.url);
test('shader declares the uniforms the runtime sets', () => {
  const src = fs.readFileSync(path, 'utf8');
  for (const u of ['uRes','uTime','uMouse','uMouseV','uOct','uA0','uB0','uG0','uA1','uB1','uG1','uMode0','uMode1','uPortal','uTex','uGlitch']) assert.ok(src.includes(u), u);
  assert.ok(src.includes('#version 300 es'));
  assert.ok(src.includes('export function mountShader'));
});
