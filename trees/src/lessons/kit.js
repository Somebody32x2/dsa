import { Node } from '../core/node.js';
import { BinaryTree } from '../core/tree.js';
import { AVLTree, CASES, tag } from '../trees/avl.js';
import { h } from '../ui/dom.js';

export { tag, CASES };

export const avl = (keys, opts) => AVLTree.from(keys, opts);
export const bst = (keys) => BinaryTree.from(keys);
export const idOf = (tree, key) => tree.find(key).id;
export const ids = (tree, keys) => keys.map((k) => idOf(tree, k));
export const still = (tree, caption = '', extra = {}) => ({ tree: tree.snapshot(), caption, ...extra });
export const section = (title) => h('h2', { class: 'reveal', html: title });

/** Paint a set of keys with one role. */
export const paint = (tree, keys, role) => Object.fromEntries(keys.map((k) => [idOf(tree, k), role]));

/** The frame in which an AVL update identified z, y, x (null if the update needed no restructure). */
export function identifyFrame(frames) {
  return frames.find((f) => f.meta?.stage === 'identify') ?? null;
}

// ---- abstract trees with T1..T4 triangles ----------------------------------

const ABSTRACT_HEIGHTS = { LL: [2, 1, 2, 2], LR: [2, 2, 1, 2], RR: [2, 2, 1, 2], RL: [2, 1, 2, 2] };
export const ABSTRACT_VIEW = { showHeights: true, showBalance: true, heightBase: 2 };

/**
 * z, y, x with four triangle subtrees, as they look right after an insertion
 * made z unbalanced. Subtree heights are h or h-1 (h drawn as 2).
 */
export function abstractCase(kase) {
  const t = new AVLTree();
  const [x, y, z] = [new Node(null), new Node(null), new Node(null)];
  t.root = z;
  t.link(z, kase[0] === 'L' ? 'left' : 'right', y);
  t.link(y, kase[1] === 'L' ? 'left' : 'right', x);
  const T = ABSTRACT_HEIGHTS[kase].map((height, i) => new Node(null, { kind: 'subtree', label: `T${i + 1}`, height }));
  const slots = [];
  const visit = (n) => {
    if (n.left) visit(n.left);
    else slots.push([n, 'left']);
    if (n.right) visit(n.right);
    else slots.push([n, 'right']);
  };
  visit(z);
  slots.forEach(([n, side], i) => t.link(n, side, T[i]));
  [x, y, z].forEach((n) => t.updateHeight(n));
  return { t, x, y, z, T };
}

/** Step-by-step explanation of restructure(x) on the abstract tree for one case. */
export function caseFrames(kase, style = 'rotations', { inorder = true } = {}) {
  const { t, x, y, z } = abstractCase(kase);
  const info = CASES[kase];
  const { a, b, c } = t.trinode(x);
  const roles = { [z.id]: 'z', [y.id]: 'y', [x.id]: 'x' };
  const xyz = { [z.id]: 'z', [y.id]: 'y', [x.id]: 'x' };
  const abc = { [a.id]: 'a', [b.id]: 'b', [c.id]: 'c' };
  const tags = { [z.id]: ['z'], [y.id]: ['y'], [x.id]: ['x'] };
  const view = { ...ABSTRACT_VIEW, showInorder: inorder };
  const badge = `${kase} \u00b7 ${info.name}`;
  const F = (caption, text, tg = tags, extra = {}) => ({ tree: t.snapshot(), caption, text, roles, tags: tg, view, badge, ...extra });
  const ySide = kase[0] === 'L' ? 'left' : 'right';
  const xSide = kase[1] === 'L' ? 'left' : 'right';
  const bName = info.double ? 'x' : 'y';

  const frames = [
    F(
      `${tag('z')} is unbalanced: its ${ySide} side is two levels taller (balance ${kase[0] === 'L' ? '+2' : '\u22122'}). ${tag('y')} is z's taller child and ${tag('x')} is y's taller child. y is a <b>${ySide}</b> child and x is a <b>${xSide}</b> child: the <b>${info.name}</b> case.`,
      xyz,
      {},
    ),
    F(
      `Rename x, y, z by their left-to-right (inorder) position: ${tag('a')} is leftmost, ${tag('b')} is the middle, ${tag('c')} is rightmost. Here b = <b>${bName}</b>. The four subtrees, left to right, are T1 to T4. The strip at the bottom reads T1 a T2 b T3 c T4, and it will never change.`,
      abc,
    ),
  ];

  if (style === 'trinode') {
    t.restructure(x);
    frames.push(
      F(
        `restructure(x), all at once: ${tag('b')} moves into z's spot, ${tag('a')} becomes its left child and ${tag('c')} its right child. T1, T2 hang under a; T3, T4 under c. Nothing moved sideways: the inorder strip is identical.`,
        abc,
      ),
    );
  } else if (!info.double) {
    const dir = kase === 'LL' ? 'right' : 'left';
    const moved = kase === 'LL' ? 'T3' : 'T2';
    t.rotate(y);
    frames.push(
      F(
        `Straight line, so the middle node b = y is already between the other two. One <b>${dir} rotation at z</b> lifts y up and drops z down to the ${dir}. ${tag(moved)} was y's child; it switches to z, the only spot that keeps inorder intact.`,
        abc,
      ),
    );
  } else {
    const [d1, d2] = kase === 'LR' ? ['left', 'right'] : ['right', 'left'];
    const [m1, m2] = kase === 'LR' ? ['T2', 'T3'] : ['T3', 'T2'];
    t.rotate(x);
    frames.push(
      F(
        `Zig-zag, so b = x is at the bottom and must rise two levels. Rotation 1: a <b>${d1} rotation at y</b> lifts x above y, and ${tag(m1)} moves from x to y. Now z, x, y form a straight line: this is the ${d2 === 'right' ? 'left-left' : 'right-right'} shape.`,
        abc,
      ),
    );
    t.rotate(x);
    frames.push(
      F(
        `Rotation 2: a <b>${d2} rotation at z</b> lifts x above z, and ${tag(m2)} moves from x to z. Two single rotations = one double rotation.`,
        abc,
      ),
    );
  }
  frames.push(
    F(
      `Balanced. b is on top with a and c below it, and T1 to T4 hang left to right. Every balance factor is 0 or \u00b11, and the subtree's height is h+2, the same as z's height before the insertion.`,
      abc,
      tags,
    ),
  );
  return frames;
}

/** Two nodes and three triangles: a single rotation, in either direction. */
export function rotationFrames(dir) {
  const t = new BinaryTree();
  const a = new Node(null);
  const b = new Node(null);
  const T = [1, 2, 3].map((i) => new Node(null, { kind: 'subtree', label: `T${i}`, height: 2 }));
  if (dir === 'right') {
    t.root = b;
    t.link(b, 'left', a);
    t.link(b, 'right', T[2]);
    t.link(a, 'left', T[0]);
    t.link(a, 'right', T[1]);
  } else {
    t.root = a;
    t.link(a, 'left', T[0]);
    t.link(a, 'right', b);
    t.link(b, 'left', T[1]);
    t.link(b, 'right', T[2]);
  }
  t.updateHeight(dir === 'right' ? a : b);
  t.updateHeight(t.root);
  const text = { [a.id]: 'a', [b.id]: 'b' };
  const view = { showInorder: true };
  const top = dir === 'right' ? 'b' : 'a';
  const up = dir === 'right' ? 'a' : 'b';
  const frames = [
    {
      tree: t.snapshot(),
      text,
      view,
      roles: { [(dir === 'right' ? b : a).id]: 'visit' },
      caption: `Before. We will do a <b>${dir} rotation at ${top}</b>: ${top}'s ${dir === 'right' ? 'left' : 'right'} child ${up} comes up, and ${top} goes down to the ${dir}.`,
    },
  ];
  t.rotate(dir === 'right' ? a : b);
  frames.push({
    tree: t.snapshot(),
    text,
    view,
    roles: { [(dir === 'right' ? b : a).id]: 'visit' },
    caption: `After. ${up} is on top. ${tag('T2')} sits between a and b in inorder, so it is the one subtree that changes parent: from ${up} to ${top}. The highlighted links are the only pointers that changed. The inorder strip is untouched.`,
  });
  return frames;
}
