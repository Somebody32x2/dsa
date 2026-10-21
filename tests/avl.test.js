import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AVLTree } from '../src/trees/avl.js';
import { Node } from '../src/core/node.js';

function check(tree) {
  const walk = (n, lo, hi, parent) => {
    if (!n) return 0;
    assert.equal(n.kind, 'node', 'no placeholder may survive a restructure');
    assert.equal(n.parent, parent, `parent pointer of ${n.key}`);
    assert.ok(n.key > lo && n.key < hi, `BST order at ${n.key}`);
    const l = walk(n.left, lo, n.key, n);
    const r = walk(n.right, n.key, hi, n);
    assert.ok(Math.abs(l - r) <= 1, `AVL balance at ${n.key}`);
    assert.equal(n.height, 1 + Math.max(l, r), `stored height of ${n.key}`);
    return n.height;
  };
  walk(tree.root, -Infinity, Infinity, null);
}

function rng(seed) {
  return () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
}

test('random inserts and removes keep the tree a valid AVL tree', () => {
  for (const style of ['rotations', 'trinode']) {
    const rand = rng(style === 'trinode' ? 7 : 42);
    const t = new AVLTree({ style });
    const present = new Set();
    for (let i = 0; i < 1500; i++) {
      const k = Math.floor(rand() * 120);
      if (rand() < 0.6) {
        t.insert(k);
        present.add(k);
        assert.ok(t.restructures.length <= 1, 'an insertion needs at most one restructure');
      } else {
        t.remove(k);
        present.delete(k);
      }
      check(t);
      assert.deepEqual(t.keys(), [...present].sort((a, b) => a - b));
    }
  }
});

function abstractCase(kase) {
  const t = new AVLTree();
  const N = () => new Node(null);
  const S = (i) => new Node(null, { kind: 'subtree', label: `T${i}`, height: 2 });
  const [x, y, z] = [N(), N(), N()];
  const T = [S(1), S(2), S(3), S(4)];
  t.root = z;
  const ys = kase[0] === 'L' ? 'left' : 'right';
  const xs = kase[1] === 'L' ? 'left' : 'right';
  t.link(z, ys, y);
  t.link(y, xs, x);
  // Fill the four empty slots left to right, so T1..T4 come out in inorder.
  const inorderSlots = [];
  const visit = (n) => {
    if (n.left) visit(n.left);
    else inorderSlots.push([n, 'left']);
    if (n.right) visit(n.right);
    else inorderSlots.push([n, 'right']);
  };
  visit(z);
  inorderSlots.forEach(([n, side], i) => t.link(n, side, T[i]));
  return { t, x, y, z, T };
}

const shape = (n) => (n ? (n.kind === 'subtree' ? n.label : `(${shape(n.left)} ${n.id} ${shape(n.right)})`) : '.');

test('restructure(x) gives the same tree as the single/double rotations, for all four cases', () => {
  for (const kase of ['LL', 'LR', 'RR', 'RL']) {
    const one = abstractCase(kase);
    const info = one.t.trinode(one.x);
    assert.equal(info.kase, kase);
    const b1 = one.t.restructure(one.x);

    const two = abstractCase(kase);
    const b2 = two.t.restructureByRotations(two.x);

    const ids1 = new Map([[one.x.id, 'x'], [one.y.id, 'y'], [one.z.id, 'z']]);
    const ids2 = new Map([[two.x.id, 'x'], [two.y.id, 'y'], [two.z.id, 'z']]);
    const norm = (s, ids) => s.replace(/n\d+/g, (m) => ids.get(m));
    assert.equal(norm(shape(one.t.root), ids1), norm(shape(two.t.root), ids2), kase);
    // b on top, T1..T4 in order under a and c
    assert.equal(norm(shape(one.t.root), ids1).replace(/[xyz]/g, '*'), '((T1 * T2) * (T3 * T4))');
    assert.equal(ids1.get(b1.id), kase === 'LL' || kase === 'RR' ? 'y' : 'x');
    assert.equal(ids2.get(b2.id), ids1.get(b1.id));
  }
});

test('textbook insertion: inserting 54 is a left-right case with z=78, y=50, x=62', () => {
  const t = AVLTree.from([44, 17, 78, 32, 50, 88, 48, 62]);
  t.insert(54);
  assert.deepEqual(t.restructures, [{ z: 78, y: 50, x: 62, kase: 'LR', b: 62 }]);
  check(t);
});

test('textbook deletion: removing 32 ties at y, so x is on the same side as y (single rotation)', () => {
  const t = AVLTree.from([44, 17, 62, 32, 50, 78, 48, 54, 88]);
  t.remove(32);
  assert.deepEqual(t.restructures, [{ z: 44, y: 62, x: 78, kase: 'RR', b: 62 }]);
  check(t);
});

test('a deletion can trigger restructures at more than one level', () => {
  const t = AVLTree.from([25, 85, 40, 75, 65, 15, 70, 95, 20, 45, 50, 35]);
  t.remove(70);
  assert.deepEqual(t.restructures, [
    { z: 75, y: 85, x: 95, kase: 'RR', b: 85 },
    { z: 65, y: 40, x: 20, kase: 'LL', b: 40 },
  ]);
  check(t);
});
