import { Node } from './node.js';

export const heightOf = (n) => (n ? n.height : 0);
export const fmtBalance = (b) => (b > 0 ? `+${b}` : b < 0 ? `\u2212${-b}` : '0');

/** Collects animation frames: a snapshot of the tree plus what to highlight and say. */
export class Recorder {
  constructor(tree) {
    this.tree = tree;
    this.frames = [];
  }

  /** extra: { roles: {id: role}, tags: {id: [tag]}, text: {id: text}, view: {...}, meta, badge } */
  frame(caption, extra = {}) {
    this.frames.push({ tree: this.tree.snapshot(), caption, ...extra });
    return this;
  }
}

/**
 * Unbalanced binary search tree. Balanced trees subclass it and override
 * afterInsert / afterRemove, which run once the plain BST update is done.
 */
export class BinaryTree {
  static label = 'Binary search tree';

  constructor() {
    this.root = null;
  }

  static from(keys, opts) {
    const t = new this(opts);
    for (const k of keys) t.insert(k);
    return t;
  }

  // ---- structure -------------------------------------------------------

  updateHeight(n) {
    if (n && n.kind === 'node') n.height = 1 + Math.max(heightOf(n.left), heightOf(n.right));
  }

  refreshHeights(n) {
    for (; n; n = n.parent) this.updateHeight(n);
  }

  balanceOf(n) {
    return heightOf(n.left) - heightOf(n.right);
  }

  sideOf(n) {
    return n.parent.left === n ? 'left' : 'right';
  }

  link(parent, side, child) {
    if (parent) parent[side] = child;
    else this.root = child;
    if (child) child.parent = parent;
  }

  /** Put `child` where `old` hangs (under old's parent, or at the root). */
  replaceChild(old, child) {
    const p = old.parent;
    this.link(p, p ? this.sideOf(old) : null, child);
    old.parent = null;
  }

  /**
   * Rotate x above its parent. If x is a left child this is a right rotation
   * at the parent; if x is a right child, a left rotation at the parent.
   */
  rotate(x) {
    const y = x.parent;
    if (y.left === x) {
      this.link(y, 'left', x.right);
      this.replaceChild(y, x);
      this.link(x, 'right', y);
    } else {
      this.link(y, 'right', x.left);
      this.replaceChild(y, x);
      this.link(x, 'left', y);
    }
    this.updateHeight(y);
    this.updateHeight(x);
  }

  // ---- queries ---------------------------------------------------------

  find(key) {
    let n = this.root;
    while (n && n.key !== key) n = key < n.key ? n.left : n.right;
    return n;
  }

  inorder(n = this.root, out = []) {
    if (n) {
      this.inorder(n.left, out);
      out.push(n);
      this.inorder(n.right, out);
    }
    return out;
  }

  keys() {
    return this.inorder().filter((n) => n.kind === 'node').map((n) => n.key);
  }

  snapshot() {
    const s = (n) =>
      n && {
        id: n.id,
        key: n.key,
        kind: n.kind,
        label: n.label,
        height: n.height,
        left: s(n.left),
        right: s(n.right),
      };
    return s(this.root);
  }

  // ---- updates ---------------------------------------------------------

  insert(key, rec = new Recorder(this)) {
    const path = {};
    let parent = null;
    let side = null;
    let cur = this.root;
    while (cur) {
      if (key === cur.key) {
        rec.frame(`<b>${key}</b> is already in the tree. Keys are unique, so nothing changes.`, {
          roles: { ...path, [cur.id]: 'found' },
        });
        return rec.frames;
      }
      side = key < cur.key ? 'left' : 'right';
      rec.frame(
        `Insert <b>${key}</b>: compare with <b>${cur.key}</b>. ${side === 'left' ? 'Smaller, go left.' : 'Larger, go right.'}`,
        { roles: { ...path, [cur.id]: 'visit' } },
      );
      path[cur.id] = 'path';
      parent = cur;
      cur = cur[side];
    }
    const node = new Node(key);
    this.link(parent, side, node);
    rec.frame(
      parent
        ? `The ${side} spot under <b>${parent.key}</b> is empty, so <b>${key}</b> goes there as a new leaf.`
        : `The tree is empty, so <b>${key}</b> becomes the root.`,
      { roles: { ...path, [node.id]: 'new' } },
    );
    this.afterInsert(node, rec);
    return rec.frames;
  }

  remove(key, rec = new Recorder(this)) {
    const path = {};
    let cur = this.root;
    while (cur && cur.key !== key) {
      const side = key < cur.key ? 'left' : 'right';
      rec.frame(`Remove <b>${key}</b>: compare with <b>${cur.key}</b>, go ${side}.`, {
        roles: { ...path, [cur.id]: 'visit' },
      });
      path[cur.id] = 'path';
      cur = cur[side];
    }
    if (!cur) {
      rec.frame(`<b>${key}</b> is not in the tree. Nothing to remove.`, { roles: path });
      return rec.frames;
    }

    let target = cur;
    if (target.left && target.right) {
      let s = target.right;
      while (s.left) s = s.left;
      rec.frame(
        `<b>${key}</b> has two children. Its inorder successor <b>${s.key}</b> (the smallest key in its right subtree) will take its place.`,
        { roles: { [target.id]: 'remove', [s.id]: 'succ' } },
      );
      target.key = s.key;
      rec.frame(
        `Copy <b>${s.key}</b> up into ${key}'s node. Now delete the old <b>${s.key}</b> node, which has at most one child.`,
        { roles: { [target.id]: 'found', [s.id]: 'remove' } },
      );
      target = s;
    } else {
      rec.frame(
        `Found <b>${key}</b>. ${
          target.left || target.right ? 'It has one child, which moves up into its place.' : 'It is a leaf, so it is simply removed.'
        }`,
        { roles: { [target.id]: 'remove' } },
      );
    }

    const parent = target.parent;
    this.replaceChild(target, target.left ?? target.right);
    rec.frame(`<b>${target.key}</b>'s node is gone.`, { roles: parent ? { [parent.id]: 'visit' } : {} });
    this.afterRemove(parent, rec);
    return rec.frames;
  }

  afterInsert(node, _rec) {
    this.refreshHeights(node.parent);
  }

  afterRemove(parent, _rec) {
    this.refreshHeights(parent);
  }
}
