import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEXTBOOK, fromKeys, isHeap, height, insert, removeMin, keysOf, parent, left, right, heapFrame } from '../src/model/heap.js';

/** Deterministic PRNG so failures reproduce. */
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

test('index arithmetic: children of i have parent i', () => {
  for (let i = 0; i < 100; i++) {
    assert.equal(parent(left(i)), i);
    assert.equal(parent(right(i)), i);
  }
});

test('height of a complete binary tree is floor(log2 n)', () => {
  // Levels 0..h-1 are full (2^h - 1 nodes) and level h has 1..2^h nodes.
  for (let n = 1; n <= 1100; n++) {
    const h = height(n);
    assert.ok(2 ** h <= n && n < 2 ** (h + 1), `n=${n}`);
  }
  assert.equal(height(1000), 9);
});

test('textbook heap: insert 2 climbs to the root, removeMin sinks 13 to index 10', () => {
  const h0 = fromKeys(TEXTBOOK);
  assert.ok(isHeap(h0));
  const ins = insert(h0, 2);
  assert.deepEqual(ins.moved, [20, 6, 4]);
  assert.equal(ins.heap[0].key, 2);
  assert.ok(isHeap(ins.heap));
  assert.deepEqual(keysOf(h0), TEXTBOOK, 'insert does not mutate its input');

  const rem = removeMin(h0);
  assert.equal(rem.min, 4);
  assert.deepEqual(rem.moved, [5, 9, 12]);
  assert.equal(rem.heap.findIndex((e) => e.key === 13), 10);
  assert.ok(isHeap(rem.heap));
});

test('random inserts and removeMins keep heap order and return keys in sorted order', () => {
  for (let s = 1; s <= 200; s++) {
    const r = rng(s);
    let heap = [];
    const all = [];
    for (let k = 0; k < 40; k++) {
      const key = Math.floor(r() * 50);
      const res = insert(heap, key);
      heap = res.heap;
      all.push(key);
      assert.ok(isHeap(heap));
      assert.ok(res.swaps <= height(heap.length));
    }
    const out = [];
    while (heap.length) {
      const res = removeMin(heap);
      out.push(res.min);
      heap = res.heap;
      assert.ok(isHeap(heap));
      assert.ok(res.swaps <= height(heap.length));
    }
    assert.deepEqual(out, all.sort((a, b) => a - b));
  }
});

test('frames keep ids stable and edges keyed by slot', () => {
  const h0 = fromKeys(TEXTBOOK);
  const { frames, heap } = insert(h0, 2);
  const ids = (f) => new Set(f.items.map((it) => it.id));
  const last = ids(frames.at(-1));
  for (const e of heap) assert.ok(last.has(`t${e.id}`) && last.has(`a${e.id}`));
  for (const f of frames.slice(1)) assert.deepEqual(f.links.map((l) => l.id), heap.slice(1).map((_, i) => `e${i + 1}`));
  // An element's tree node sits on the anchor of its slot k, and its array box is the k-th box.
  const f = heapFrame(heap);
  const at = (id) => f.items.find((it) => it.id === id);
  const boxes = heap.map((e) => at(`a${e.id}`).x);
  heap.forEach((e, k) => {
    assert.deepEqual([at(`t${e.id}`).x, at(`t${e.id}`).y], [at(`s${k}`).x, at(`s${k}`).y]);
    assert.equal(at(`n${k}`).text, String(k));
    if (k > 0) assert.ok(boxes[k] > boxes[k - 1]);
  });
});
