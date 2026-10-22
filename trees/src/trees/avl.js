import { Node } from '../core/node.js';
import { BinaryTree, heightOf, fmtBalance } from '../core/tree.js';

/** The four shapes x, y, z can form. First letter: y's side under z. Second: x's side under y. */
export const CASES = {
  LL: { name: 'left-left', double: false, rotations: 'one right rotation at z' },
  RR: { name: 'right-right', double: false, rotations: 'one left rotation at z' },
  LR: { name: 'left-right', double: true, rotations: 'left rotation at y, then right rotation at z' },
  RL: { name: 'right-left', double: true, rotations: 'right rotation at y, then left rotation at z' },
};

export const tag = (t) => `<span class="tg tg-${t.toLowerCase()}">${t}</span>`;

export class AVLTree extends BinaryTree {
  static label = 'AVL tree';

  /** style: 'rotations' shows restructure as single/double rotations; 'trinode' shows it as one step. */
  constructor({ style = 'rotations' } = {}) {
    super();
    this.style = style;
    /** Restructures done by the last insert/remove: [{ z, y, x, kase, b }] (keys). */
    this.restructures = [];
  }

  tallerChild(n, tieSide) {
    const l = heightOf(n.left);
    const r = heightOf(n.right);
    if (l > r) return n.left;
    if (r > l) return n.right;
    return n[tieSide];
  }

  /** Name x, y, z by inorder as a, b, c and find T1..T4. */
  trinode(x) {
    const y = x.parent;
    const z = y.parent;
    const kase = (z.left === y ? 'L' : 'R') + (y.left === x ? 'L' : 'R');
    let a, b, c, T;
    switch (kase) {
      case 'LL': [a, b, c] = [x, y, z]; T = [x.left, x.right, y.right, z.right]; break;
      case 'LR': [a, b, c] = [y, x, z]; T = [y.left, x.left, x.right, z.right]; break;
      case 'RR': [a, b, c] = [z, y, x]; T = [z.left, y.left, x.left, x.right]; break;
      case 'RL': [a, b, c] = [z, x, y]; T = [z.left, x.left, x.right, y.right]; break;
    }
    return { x, y, z, a, b, c, T, kase };
  }

  /** restructure(x) as one step: b takes z's place, a and c under b, T1..T4 under a and c. Returns b. */
  restructure(x) {
    const { z, a, b, c, T } = this.trinode(x);
    this.replaceChild(z, b);
    this.link(a, 'left', T[0]);
    this.link(a, 'right', T[1]);
    this.link(c, 'left', T[2]);
    this.link(c, 'right', T[3]);
    this.link(b, 'left', a);
    this.link(b, 'right', c);
    this.updateHeight(a);
    this.updateHeight(c);
    this.updateHeight(b);
    return b;
  }

  /** The same restructure done as one or two rotations. Returns b. */
  restructureByRotations(x) {
    const { y, kase } = this.trinode(x);
    if (!CASES[kase].double) {
      this.rotate(y);
      return y;
    }
    this.rotate(x);
    this.rotate(x);
    return x;
  }

  insert(key, rec) {
    this.restructures = [];
    return super.insert(key, rec);
  }

  remove(key, rec) {
    this.restructures = [];
    return super.remove(key, rec);
  }

  afterInsert(node, rec) {
    for (let n = node.parent; n; n = n.parent) {
      this.updateHeight(n);
      const bf = this.balanceOf(n);
      if (Math.abs(bf) <= 1) {
        rec.frame(`Walk up toward the root: <b>${n.key}</b> has balance ${fmtBalance(bf)}. Still balanced.`, {
          roles: { [n.id]: 'visit' },
          view: { showBalance: true },
        });
        continue;
      }
      const y = this.tallerChild(n);
      const x = this.tallerChild(y);
      const b = this.rebalance(x, rec, 'insert');
      rec.frame(
        `Done. One restructure always fixes an insertion: b's subtree is exactly as tall as z's subtree was before the insert, so no ancestor's height changes.`,
        { roles: { [b.id]: 'found' }, view: { showBalance: true } },
      );
      return;
    }
    rec.frame('Reached the root and every node is balanced. No restructure needed.', { view: { showBalance: true } });
  }

  afterRemove(parent, rec) {
    for (let n = parent; n; n = n.parent) {
      this.updateHeight(n);
      const bf = this.balanceOf(n);
      if (Math.abs(bf) <= 1) {
        rec.frame(`Walk up toward the root: <b>${n.key}</b> has balance ${fmtBalance(bf)}. Still balanced.`, {
          roles: { [n.id]: 'visit' },
          view: { showBalance: true },
        });
        continue;
      }
      const y = this.tallerChild(n);
      const x = this.tallerChild(y, this.sideOf(y));
      n = this.rebalance(x, rec, 'remove');
      if (n.parent) {
        rec.frame(
          `This restructure may have made the subtree shorter, so after a deletion we keep walking up from <b>${n.key}</b>.`,
          { roles: { [n.id]: 'found' }, view: { showBalance: true } },
        );
      }
    }
    const k = this.restructures.length;
    rec.frame(
      k
        ? `Reached the root. All balanced after ${k} restructure${k > 1 ? 's' : ''}.`
        : 'Reached the root and every node is balanced. No restructure needed.',
      { view: { showBalance: true } },
    );
  }

  /** Explain and perform restructure(x), recording frames. Returns the new subtree root b. */
  rebalance(x, rec, op) {
    const y = x.parent;
    const z = y.parent;
    const first = this.trinode(x);
    const { kase } = first;
    const info = CASES[kase];
    const yz = first.kase[0] === 'L' ? 'left' : 'right';
    const xy = first.kase[1] === 'L' ? 'left' : 'right';
    const tie = op === 'remove' && heightOf(y.left) === heightOf(y.right);

    const xyzRoles = { [z.id]: 'z', [y.id]: 'y', [x.id]: 'x' };
    const xyzTags = { [z.id]: ['z'], [y.id]: ['y'], [x.id]: ['x'] };
    const why =
      op === 'insert'
        ? `${tag('y')} = <b>${y.key}</b> is z's taller child and ${tag('x')} = <b>${x.key}</b> is y's taller child. Both lie on the path down to the new node.`
        : `${tag('y')} = <b>${y.key}</b> is z's taller child, on the side away from the deletion. ${tag('x')} = <b>${x.key}</b> is y's taller child${
            tie ? ' (y\'s children tie, so pick the one on the same side as y: that keeps it a single rotation)' : ''
          }.`;
    rec.frame(
      `<b>${z.key}</b> has balance ${fmtBalance(this.balanceOf(z))}: unbalanced. It is ${tag('z')}, the first unbalanced node on the way up. ${why} y is a ${yz} child and x is a ${xy} child: the <b>${info.name}</b> case.`,
      {
        roles: xyzRoles,
        tags: xyzTags,
        view: { showBalance: true },
        badge: `${kase} case`,
        meta: { stage: 'identify', op, z: z.id, y: y.id, x: x.id, b: first.b.id, kase },
      },
    );

    // Placeholders make empty subtrees visible while T1..T4 are being moved around.
    const placeholders = [];
    for (const n of [x, y, z]) {
      for (const side of ['left', 'right']) {
        if (!n[side]) {
          const e = new Node(null, { kind: 'empty' });
          this.link(n, side, e);
          placeholders.push(e);
        }
      }
    }
    const t = this.trinode(x);
    t.T.forEach((s, i) => {
      if (s.kind === 'empty') s.label = `T${i + 1}`;
    });
    const tags = {
      [t.a.id]: [xyzTags[t.a.id][0], 'a'],
      [t.b.id]: [xyzTags[t.b.id][0], 'b'],
      [t.c.id]: [xyzTags[t.c.id][0], 'c'],
    };
    t.T.forEach((s, i) => {
      if (s.kind === 'node') tags[s.id] = [`T${i + 1}`];
    });
    const name = (s) => (s.kind === 'empty' ? 'empty' : `<b>${s.key}</b>`);
    rec.frame(
      `Name x, y, z by inorder: ${tag('a')} = <b>${t.a.key}</b>, ${tag('b')} = <b>${t.b.key}</b>, ${tag('c')} = <b>${t.c.key}</b>. The four subtrees hanging below them, left to right, are ${t.T.map((s, i) => `${tag(`T${i + 1}`)} (${name(s)})`).join(', ')}. Dashed boxes are empty subtrees.`,
      { roles: xyzRoles, tags, view: { showBalance: true }, badge: `${kase} case` },
    );

    if (this.style === 'trinode') {
      this.restructure(x);
      rec.frame(
        `restructure(x) in one step: ${tag('b')} <b>${t.b.key}</b> takes z's place, ${tag('a')} and ${tag('c')} become its children, and T1, T2 hang under a while T3, T4 hang under c. Left-to-right order never changes.`,
        { roles: xyzRoles, tags, view: { showBalance: true }, badge: `${kase} case` },
      );
    } else if (!info.double) {
      this.rotate(y);
      const dir = kase === 'LL' ? 'right' : 'left';
      const moved = kase === 'LL' ? 'T3' : 'T2';
      rec.frame(
        `x, y, z lie in a straight line, so ${tag('b')} = y is already in the middle. A single <b>${dir} rotation at z</b> lifts y to the top; ${tag(moved)} switches from y over to z.`,
        { roles: xyzRoles, tags, view: { showBalance: true }, badge: `${kase} · single rotation` },
      );
    } else {
      this.rotate(x);
      const d1 = kase === 'LR' ? 'left' : 'right';
      const d2 = kase === 'LR' ? 'right' : 'left';
      const m1 = kase === 'LR' ? 'T2' : 'T3';
      const m2 = kase === 'LR' ? 'T3' : 'T2';
      rec.frame(
        `x, y, z zig-zag, so ${tag('b')} = x sits at the bottom and has to rise two levels. Rotation 1: <b>${d1} rotation at y</b> lifts x above y (${tag(m1)} moves from x to y). Now z, x, y form a straight line.`,
        { roles: xyzRoles, tags, view: { showBalance: true }, badge: `${kase} · double rotation (1/2)` },
      );
      this.rotate(x);
      rec.frame(
        `Rotation 2: <b>${d2} rotation at z</b> lifts x above z (${tag(m2)} moves from x to z). x is now ${tag('b')}, the top of the subtree.`,
        { roles: xyzRoles, tags, view: { showBalance: true }, badge: `${kase} · double rotation (2/2)` },
      );
    }

    for (const e of placeholders) this.replaceChild(e, null);
    this.restructures.push({ z: z.key, y: y.key, x: x.key, kase, b: t.b.key });
    return t.b;
  }
}
