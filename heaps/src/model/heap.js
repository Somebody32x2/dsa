/**
 * Min-heap model and frame builders (no DOM). Every figure and quiz answer in the Heaps compartment
 * comes from here.
 *
 * A heap is an array of elements { id, key }; index 0 is the root (Goodrich & Tamassia's level
 * numbering): parent(i) = floor((i - 1) / 2), left(i) = 2i + 1, right(i) = 2i + 2.
 * An element keeps its id while it moves, so its circle (tree) and box (array) glide between slots.
 *
 *   fromKeys(keys)                       heap with those keys in that array order (not reordered)
 *   isHeap(heap)                         heap-order property holds at every node
 *   height(n)                            height of a complete binary tree with n nodes: floor(log2 n)
 *   insert(heap, key, opts)              { heap, frames, swaps, moved }   up-heap, one frame per step
 *   removeMin(heap, opts)                { heap, frames, min, swaps, moved }  down-heap
 *   heapFrame(heap, opts)                one frame: tree on top, array below, index under every slot
 *   heroFrames()                         looping home figure (insert, then removeMin)
 *
 * opts: { slots } fixes the layout to that many array slots (keeps the camera still across operations),
 *       { array: false } draws only the tree (pick quizzes).
 * Item ids: tree node `t<id>`, array box `a<id>`, slot anchor `s<i>` (tree edges hang on fixed slot
 * anchors, so edges never move when keys swap), tree index label `n<i>`, array index label `i<i>`,
 * edge `e<i>` (from parent(i) to i).
 */

export const parent = (i) => Math.floor((i - 1) / 2);
export const left = (i) => 2 * i + 1;
export const right = (i) => 2 * i + 2;
export const height = (n) => (n <= 1 ? 0 : Math.floor(Math.log2(n)));

/** The textbook example: 13 keys, already a heap. */
export const TEXTBOOK = [4, 5, 6, 15, 9, 7, 20, 16, 25, 14, 12, 11, 13];

export function fromKeys(keys) {
  return keys.map((key, i) => ({ id: `e${i}`, key }));
}

export function isHeap(heap) {
  return heap.every((e, i) => i === 0 || heap[parent(i)].key <= e.key);
}

const freshId = (heap) => `e${heap.reduce((m, e) => Math.max(m, Number(e.id.slice(1)) + 1), 0)}`;
export const keysOf = (heap) => heap.map((e) => e.key);

/* ---------- layout ---------- */

const PITCH = 48; // array box pitch
const BOX = 42;
const LEVEL = 74; // tree level spacing

function layout(slots) {
  const levels = height(slots) + 1;
  const width = Math.max(slots * PITCH, 2 ** (levels - 1) * 50);
  const node = (i) => {
    const d = height(i + 1);
    const p = i - (2 ** d - 1);
    return { x: ((p + 0.5) * width) / 2 ** d, y: d * LEVEL };
  };
  const arrayY = (levels - 1) * LEVEL + 92;
  const cell = (i) => ({ x: (width - slots * PITCH) / 2 + PITCH / 2 + i * PITCH, y: arrayY });
  return { node, cell };
}

/**
 * One frame. roles / tags are keyed by ELEMENT id; they apply to the element's tree node and array box
 * (tags only on the tree node). Extra raw roles (e.g. edges `e<i>`) go in `rawRoles`.
 */
export function heapFrame(heap, { slots = heap.length, array = true, roles = {}, tags = {}, rawRoles = {}, caption, badge } = {}) {
  const L = layout(Math.max(slots, heap.length, 1));
  const items = [];
  const links = [];
  const R = { ...rawRoles };
  const T = {};
  heap.forEach((e, i) => {
    const { x, y } = L.node(i);
    items.push({ id: `s${i}`, x, y, shape: 'label', text: '', pick: false });
    // Index left of the node: edges leave downward and arrive from above, so the side stays clear.
    items.push({ id: `n${i}`, x: x - 30, y, shape: 'label', text: String(i), cls: 'index', pick: false });
    items.push({ id: `t${e.id}`, x, y, text: String(e.key) });
    if (i > 0) links.push({ from: `s${parent(i)}`, to: `s${i}`, id: `e${i}` });
    if (roles[e.id]) R[`t${e.id}`] = roles[e.id];
    if (tags[e.id]) T[`t${e.id}`] = tags[e.id];
    if (array) {
      const c = L.cell(i);
      items.push({ id: `a${e.id}`, ...c, shape: 'rect', w: BOX, h: 36, text: String(e.key) });
      if (roles[e.id]) R[`a${e.id}`] = roles[e.id];
    }
  });
  if (array) {
    for (let i = 0; i < Math.max(slots, heap.length); i++) {
      const c = L.cell(i);
      items.push({ id: `i${i}`, x: c.x, y: c.y + 32, shape: 'label', text: String(i), cls: 'index', pick: false });
    }
  }
  return { items, links, roles: R, tags: T, caption, badge };
}

/* ---------- operations ---------- */

const b = (k) => `<b>${k}</b>`;

/** Insert key; up-heap. Returns the new heap (input untouched), frames, the swap count and the keys that moved down. */
export function insert(heap0, key, { slots = heap0.length + 1, array = true } = {}) {
  const heap = heap0.slice();
  const el = { id: freshId(heap), key };
  const F = (h, o) => heapFrame(h, { slots, array, ...o });
  const frames = [F(heap, { caption: `Insert ${b(key)} into a heap of ${heap.length} key${heap.length === 1 ? '' : 's'}.` })];
  let i = heap.length;
  heap.push(el);
  frames.push(F(heap, {
    roles: { [el.id]: 'new' },
    tags: { [el.id]: ['new'] },
    caption: i === 0
      ? `The heap was empty: ${b(key)} becomes the root at index 0. Done.`
      : `Put ${b(key)} at index ${i}, the next free spot on the bottom level (left to right). That is the <b>only</b> place that keeps the tree complete. Heap order may now be broken between ${key} and its parent.`,
  }));
  const moved = [];
  while (i > 0) {
    const p = parent(i);
    const P = heap[p];
    if (key >= P.key) {
      frames.push(F(heap, {
        roles: { [el.id]: 'found', [P.id]: 'path' },
        caption: `Compare ${b(key)} with its parent ${b(P.key)} (index ${p}): ${key} \u2265 ${P.key}, so heap order holds. <b>Stop.</b> ${moved.length} swap${moved.length === 1 ? '' : 's'}.`,
      }));
      return { heap, frames, swaps: moved.length, moved };
    }
    frames.push(F(heap, {
      roles: { [el.id]: 'visit', [P.id]: 'path' },
      caption: `Compare ${b(key)} (index ${i}) with its parent ${b(P.key)} (index ${p}): ${key} &lt; ${P.key}, so heap order is broken here. <b>Swap them.</b>`,
    }));
    heap[p] = el;
    heap[i] = P;
    moved.push(P.key);
    frames.push(F(heap, {
      roles: { [el.id]: 'visit' },
      caption: `${b(key)} moves up to index ${p}, ${b(P.key)} moves down to index ${i}. ${left(i) < heap.length ? `${P.key} is fine there: every key below index ${i} was already below ${P.key}, so it is \u2265 ${P.key}.` : `Index ${i} has no children, so ${P.key} has nothing below it to check.`}`,
    }));
    i = p;
  }
  if (heap.length > 1) {
    frames.push(F(heap, {
      roles: { [el.id]: 'found' },
      caption: `${b(key)} reached the root: it is the new minimum. <b>Stop.</b> ${moved.length} swap${moved.length === 1 ? '' : 's'}, the height of the tree.`,
    }));
  }
  return { heap, frames, swaps: moved.length, moved };
}

/** removeMin; down-heap. Returns the new heap, frames, the removed key, the swap count and the keys that moved up. */
export function removeMin(heap0, { slots = heap0.length, array = true } = {}) {
  if (heap0.length === 0) throw new Error('removeMin on an empty heap');
  const heap = heap0.slice();
  const F = (h, o) => heapFrame(h, { slots, array, ...o });
  const root = heap[0];
  const frames = [F(heap, {
    roles: { [root.id]: 'remove' },
    tags: { [root.id]: ['min'] },
    caption: `removeMin: the smallest key is always at the root, so it returns ${b(root.key)}.`,
  })];
  const last = heap.pop();
  if (heap.length === 0) {
    frames.push(F(heap, { caption: `${b(root.key)} was the only key; the heap is now empty.` }));
    return { heap, frames, min: root.key, swaps: 0, moved: [] };
  }
  heap[0] = last;
  const n = heap.length;
  frames.push(F(heap, {
    roles: { [last.id]: 'visit' },
    caption: `Move the <b>last node</b>'s key ${b(last.key)} (index ${n}) to the root and delete the last node. The tree stays complete, but ${last.key} is probably too big for the root.`,
  }));
  const moved = [];
  let i = 0;
  for (;;) {
    const l = left(i);
    const r = right(i);
    if (l >= n) {
      frames.push(F(heap, {
        roles: { [last.id]: 'found' },
        caption: `${b(last.key)} is at a leaf (index ${i}): nothing below it. <b>Stop.</b> ${moved.length} swap${moved.length === 1 ? '' : 's'}.`,
      }));
      break;
    }
    const c = r < n && heap[r].key < heap[l].key ? r : l;
    const C = heap[c];
    const other = c === l ? (r < n ? heap[r] : null) : heap[l];
    const kids = other ? `Its children are ${b(heap[l].key)} and ${b(heap[r].key)}; the smaller is ${b(C.key)}.` : `Its only child is ${b(C.key)}.`;
    if (last.key <= C.key) {
      frames.push(F(heap, {
        roles: { [last.id]: 'found', [C.id]: 'path' },
        caption: `${kids} ${last.key} \u2264 ${C.key}, so heap order holds. <b>Stop.</b> ${moved.length} swap${moved.length === 1 ? '' : 's'}.`,
      }));
      break;
    }
    frames.push(F(heap, {
      roles: { [last.id]: 'visit', [C.id]: 'path' },
      caption: `${kids} ${last.key} &gt; ${C.key}: <b>swap with ${C.key}</b>.${other ? ` Always the smaller child: it becomes the parent of ${other.key} too, so it must be \u2264 ${other.key}.` : ''}`,
    }));
    heap[i] = C;
    heap[c] = last;
    moved.push(C.key);
    frames.push(F(heap, {
      roles: { [last.id]: 'visit' },
      caption: `${b(C.key)} moves up to index ${i}, ${b(last.key)} moves down to index ${c}.`,
    }));
    i = c;
  }
  return { heap, frames, min: root.key, swaps: moved.length, moved };
}

/** Home figure: the textbook heap, insert 2 (all the way up), then removeMin (all the way down). */
export function heroFrames() {
  const h0 = fromKeys(TEXTBOOK);
  const ins = insert(h0, 2, { slots: 14 });
  const rem = removeMin(ins.heap, { slots: 14 });
  return [...ins.frames, ...rem.frames];
}
