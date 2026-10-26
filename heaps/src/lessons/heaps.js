import { h, p } from '../../../shared/ui/dom.js';
import { Player } from '../../../shared/ui/player.js';
import { Scene } from '../../../shared/core/scene.js';
import { figure, segmented, callout } from '../../../shared/ui/figure.js';
import { checkpoint } from '../../../shared/ui/quiz.js';
import { TEXTBOOK, fromKeys, heapFrame, insert, removeMin, parent, left, right, height } from '../model/heap.js';

const section = (title) => h('h2', { class: 'reveal', html: title });
const H0 = fromKeys(TEXTBOOK);

/* ---------- figure: one heap, two views ---------- */

function indexFigure() {
  const n = H0.length;
  const say = h('div', { class: 'caption', 'aria-live': 'polite' });
  const stage = h('div', { class: 'stage' });
  const explain = (k) => {
    const kids = [left(k), right(k)].filter((c) => c < n);
    const par = k === 0 ? 'no parent (it is the root)' : `parent \u230a(${k} \u2212 1)/2\u230b = <b>${parent(k)}</b> (key ${H0[parent(k)].key})`;
    const ch = kids.length === 0
      ? `no children: 2\u00b7${k} + 1 = ${left(k)} is past the last index, ${n - 1}, so it is a leaf`
      : kids.map((c) => `${c === left(k) ? `left 2\u00b7${k} + 1` : `right 2\u00b7${k} + 2`} = <b>${c}</b> (key ${H0[c].key})`).join(', ');
    return `Key <b>${H0[k].key}</b> at index ${k}: ${par}; ${ch}.`;
  };
  const show = (k) => {
    const roles = {};
    if (k != null) {
      roles[H0[k].id] = 'visit';
      if (k > 0) roles[H0[parent(k)].id] = 'info';
      for (const c of [left(k), right(k)]) if (c < n) roles[H0[c].id] = 'path';
    }
    view.show(heapFrame(H0, { roles }));
    say.innerHTML = k == null ? 'Click any key, in the tree or in the array.' : explain(k);
  };
  const view = new Scene(stage, {
    height: 360,
    onPick: (id) => {
      const k = H0.findIndex((e) => `t${e.id}` === id || `a${e.id}` === id);
      if (k >= 0) show(k);
    },
  });
  show(null);
  return figure(
    { title: 'One heap, two views', wide: true, note: 'The small number beside each node and under each box is its array index. Dark: the key you clicked; blue: its parent; outlined: its children.' },
    stage,
    say,
  );
}

/* ---------- figures: insert and removeMin ---------- */

const INSERTS = [2, 8, 30];

function insertFigure() {
  let key = INSERTS[0];
  let player;
  const host = h('div');
  const frames = () => insert(H0, key).frames;
  const fig = figure(
    {
      title: 'insert: add at the last node, then up-heap',
      wide: true,
      tools: [segmented(INSERTS.map((k) => ({ value: k, label: `Insert ${k}` })), key, (v) => ((key = v), player.load(frames())), { label: 'Key to insert' })],
    },
    host,
  );
  player = new Player(host, { frames: frames(), view: { height: 400 } });
  return fig;
}

function removeFigure() {
  const host = h('div');
  const fig = figure({ title: 'removeMin: take the root, move the last node up, then down-heap', wide: true }, host);
  new Player(host, { frames: removeMin(H0).frames, view: { height: 400 } });
  return fig;
}

/* ---------- sandbox ---------- */

const CAP = 15;

function sandbox() {
  let heap = H0;
  const host = h('div');
  const msg = h('div', { class: 'lab-msg', 'aria-live': 'polite' });
  const input = h('input', {
    class: 'key-input',
    type: 'text',
    inputmode: 'numeric',
    placeholder: 'key, e.g. 3',
    'aria-label': 'Key to insert',
    onkeydown: (e) => e.key === 'Enter' && doInsert(),
  });
  const frame = (o) => heapFrame(heap, { slots: CAP, ...o });
  // Every frame uses the full 15-slot layout, so the camera holds still across operations.
  const player = new Player(host, { frames: [frame({ caption: 'Insert keys or call removeMin; each operation plays here step by step.' })], view: { height: 400 } });

  function doInsert() {
    const key = Number(input.value.trim());
    msg.textContent = '';
    if (input.value.trim() === '' || !Number.isInteger(key) || Math.abs(key) > 999) return void (msg.textContent = 'Type a whole number between \u2212999 and 999.');
    if (heap.length >= CAP) return void (msg.textContent = `This demo holds ${CAP} keys (4 full levels). Call removeMin first.`);
    const res = insert(heap, key, { slots: CAP });
    heap = res.heap;
    input.value = '';
    player.load(res.frames);
  }
  function doRemove() {
    msg.textContent = '';
    if (heap.length === 0) return void (msg.textContent = 'The heap is empty.');
    const res = removeMin(heap, { slots: CAP });
    heap = res.heap;
    player.load(res.frames);
  }
  function reset(keys) {
    heap = fromKeys(keys);
    msg.textContent = '';
    player.load([frame({ caption: keys.length ? 'Back to the 13-key heap.' : 'Empty heap. Insert some keys.' })]);
  }

  return figure(
    {
      title: 'Try it',
      wide: true,
      note: 'Try to predict where a key ends up before you press play. Insert a key smaller than the root, then call removeMin twice.',
    },
    h('div', { class: 'lab-form' },
      input,
      h('button', { class: 'btn small', text: 'Insert', onclick: doInsert }),
      h('button', { class: 'btn small ghost', text: 'removeMin', onclick: doRemove }),
      h('button', { class: 'btn small ghost', text: 'Reset', title: 'Back to the starting heap', onclick: () => reset(TEXTBOOK) }),
      h('button', { class: 'btn small ghost', text: 'Clear', title: 'Empty the heap', onclick: () => reset([]) }),
    ),
    msg,
    host,
  );
}

/* ---------- checkpoint ---------- */

const Q_HEAP = fromKeys([3, 8, 5, 12, 10, 9, 7, 15, 14, 11]);
const Q_INSERT = 6;
const treeIds = (heap, keys) => keys.map((k) => `t${heap.find((e) => e.key === k).id}`);
const list = (keys) => keys.map((k) => `<b>${k}</b>`).join(', ');

const qIns = insert(Q_HEAP, Q_INSERT, { array: false });
const qRem = removeMin(Q_HEAP, { array: false });
const QI = 5;
const maxIdx = TEXTBOOK.indexOf(Math.max(...TEXTBOOK));

const quiz = [
  {
    type: 'mcq',
    id: 'heaps.index',
    prompt: `With the root at index 0, which indices hold the children of index ${QI}, and which holds its parent?`,
    choices: [
      `children ${left(QI)} and ${right(QI)}; parent ${parent(QI)}`,
      `children ${2 * QI} and ${2 * QI + 1}; parent ${Math.floor(QI / 2)}`,
      `children ${QI + 1} and ${QI + 2}; parent ${QI - 1}`,
      `children ${left(QI)} and ${right(QI)}; parent ${(QI - 1) / 2 + 1}`,
    ],
    answer: 0,
    explain: `Left child 2\u00b7${QI} + 1 = <b>${left(QI)}</b>, right child 2\u00b7${QI} + 2 = <b>${right(QI)}</b>, parent \u230a(${QI} \u2212 1)/2\u230b = <b>${parent(QI)}</b>. Check backwards: \u230a(${left(QI)} \u2212 1)/2\u230b = ${parent(left(QI))}. The formulas 2i, 2i + 1 and \u230ai/2\u230b are the version for arrays that start at index 1.`,
  },
  {
    type: 'pick',
    id: 'heaps.upheap',
    prompt: `Insert <b>${Q_INSERT}</b> into this heap. Click every key that <b>moves down</b> a level during up-heap.`,
    build: () => ({ frame: heapFrame(Q_HEAP, { array: false }), answer: treeIds(Q_HEAP, qIns.moved), after: heapFrame(qIns.heap, { array: false, tags: { [qIns.heap.find((e) => e.key === Q_INSERT).id]: ['new'] } }) }),
    view: { height: 300 },
    explain: `${Q_INSERT} goes to index ${Q_HEAP.length}, the next free spot, under ${Q_HEAP[parent(Q_HEAP.length)].key}. Up-heap then swaps it with each parent that is larger: ${list(qIns.moved)} move down one level each. It stops under ${qIns.heap[parent(qIns.heap.findIndex((e) => e.key === Q_INSERT))].key}, which is smaller. Keys off that one path never move.`,
  },
  {
    type: 'pick',
    id: 'heaps.downheap',
    prompt: 'Call removeMin on this heap. Click every key that <b>moves up</b> a level during down-heap.',
    build: () => ({ frame: heapFrame(Q_HEAP, { array: false }), answer: treeIds(Q_HEAP, qRem.moved), after: heapFrame(qRem.heap, { array: false }) }),
    view: { height: 300 },
    explain: () => {
      const k = Q_HEAP.at(-1).key;
      const at = qRem.heap.findIndex((e) => e.key === k);
      return `The root ${qRem.min} is returned and the last node's key, ${k}, moves to the root. Down-heap swaps it with the <b>smaller</b> child while that child is smaller: ${list(qRem.moved)} move up one level. ${k} stops at index ${at}${left(at) >= qRem.heap.length ? ', a leaf' : ''}. A key that is the larger child (like ${Q_HEAP[1].key} at the first step) stays put.`;
    },
  },
  {
    type: 'input',
    id: 'heaps.swaps',
    prompt: 'A heap holds 1000 keys. At most how many swaps can a single insert make?',
    answers: [String(height(1000)), 'nine'],
    placeholder: 'swaps',
    explain: `Up-heap swaps at most once per level it climbs, so at most the height of the tree, \u230alog<sub>2</sub> 1000\u230b = <b>${height(1000)}</b>: levels 0 to 8 hold 2<sup>9</sup> \u2212 1 = 511 keys and the last 489 sit on level 9. That is why insert is O(log n).`,
  },
  {
    type: 'mcq',
    id: 'heaps.max',
    prompt: 'Where is the <b>largest</b> key in a min-heap with distinct keys?',
    choices: ['At the last node, index n \u2212 1', 'At one of the leaves, but which one depends on the keys', 'At the rightmost node of the bottom level', 'Anywhere: heap order says nothing about it'],
    answer: 1,
    explain: `Every node with a child has a child with a larger key, so the largest key cannot sit at a node with children: it is at a leaf (indices \u230an/2\u230b to n \u2212 1). Which leaf is not fixed. In the 13-key heap above, the largest key ${Math.max(...TEXTBOOK)} is at index ${maxIdx}, while the last node holds ${TEXTBOOK.at(-1)}. Finding the maximum takes a scan of about n/2 leaves.`,
  },
];

export default {
  id: 'heaps',
  title: 'Heaps',
  group: 'Priority queues',
  blurb: 'A complete binary tree with the smallest key on top, stored in a plain array: min in O(1), insert and removeMin in O(log n).',
  quiz,
  render(root) {
    root.append(
      p('A <b>priority queue</b> stores keys and always hands back the smallest one first. A sorted list makes removeMin fast but insert slow; an unsorted list does the opposite. A <b>heap</b> makes both O(log n) by keeping the keys only <em>partly</em> sorted: just enough to know where the smallest one is.'),
      p('A heap is a binary tree with two properties:'),
      h('ol', { class: 'steps reveal', html: `
        <li><b>Heap order</b>: every node's key is \u2265 its parent's key. So keys grow along every path down from the root, and the root holds the minimum. Siblings and cousins are in no particular order.</li>
        <li><b>Complete</b>: every level is full except possibly the last, which is filled from the left. The rightmost node of the last level is the <b>last node</b>.</li>` }),
      p('Completeness means the tree has no gaps, so it fits in an array: number the nodes level by level, left to right, and store node k at index k. No pointers are needed, because the index arithmetic finds the parent and children:'),
      h('div', { class: 'table-wrap reveal' }, h('table', { html: '<thead><tr><th>From index i</th><th>Index</th></tr></thead><tbody><tr><td>left child</td><td class="mono">2i + 1</td></tr><tr><td>right child</td><td class="mono">2i + 2</td></tr><tr><td>parent</td><td class="mono">\u230a(i \u2212 1) / 2\u230b</td></tr></tbody>' })),
      p('Some books put the root at index 1 instead; then the children are 2i and 2i + 1 and the parent is \u230ai/2\u230b. Same tree, every index shifted by one.'),
    );
    root.append(indexFigure());
    root.append(
      callout('key', 'Shape is fixed, keys move', `The shape of a heap depends only on n, the number of keys. Insert always adds the slot at index n, removeMin always deletes the slot at index n \u2212 1. Everything else is <b>keys swapping between fixed slots</b> along one root-to-leaf path. Watch the figures below: the edges and the array indices never move.`),
    );

    root.append(section('Insert and up-heap'));
    root.append(
      h('ol', { class: 'steps reveal', html: `
        <li><b>Add</b> the key at index n, the new last node. The tree stays complete.</li>
        <li><b>Up-heap</b>: while the key is smaller than its parent, swap the two. Stop when the parent is smaller or equal, or at the root.</li>` }),
      p('Only the new key\u2019s path to the root can be out of order, and every swap fixes one link of it. Try the three keys: one climbs to the root, one stops halfway, one never moves.'),
    );
    root.append(insertFigure());

    root.append(section('removeMin and down-heap'));
    root.append(
      h('ol', { class: 'steps reveal', html: `
        <li><b>Return</b> the root\u2019s key, the minimum.</li>
        <li><b>Move</b> the last node\u2019s key to the root and delete the last node. The tree stays complete.</li>
        <li><b>Down-heap</b>: while the key is larger than its smaller child, swap it with that child. Stop when both children are larger or equal, or at a leaf.</li>` }),
    );
    root.append(removeFigure());
    root.append(
      callout('warn', 'Swap with the smaller child', 'After the swap, the child you picked becomes the parent of its sibling. If you pick the larger child, the smaller one ends up below it and heap order breaks one level up. In the figure: 13 must swap with 5, not 6.'),
    );

    root.append(section('Running time'));
    root.append(
      p(`A complete binary tree with n nodes has height <b>\u230alog<sub>2</sub> n\u230b</b>: levels 0 to h \u2212 1 hold 2<sup>h</sup> \u2212 1 nodes, and level h holds between 1 and 2<sup>h</sup>. Up-heap and down-heap do at most one swap per level, a constant amount of work each. With the 13 keys above, h = ${height(13)}; with a million keys, h = ${height(1e6)}.`),
      h('div', { class: 'table-wrap reveal' }, h('table', { html: `<thead><tr><th>Operation</th><th>Time</th><th>Why</th></tr></thead><tbody>
        <tr><td><b>min</b></td><td class="mono">O(1)</td><td>it is at index 0</td></tr>
        <tr><td><b>insert</b></td><td class="mono">O(log n)</td><td>up-heap climbs at most h levels</td></tr>
        <tr><td><b>removeMin</b></td><td class="mono">O(log n)</td><td>down-heap sinks at most h levels</td></tr>
        <tr><td><b>size</b>, <b>isEmpty</b></td><td class="mono">O(1)</td><td>n is stored</td></tr>
      </tbody>` })),
      p('Inserting n keys and then calling removeMin n times returns them in sorted order in O(n log n) total: that is <b>heap sort</b>.'),
    );

    root.append(sandbox());
    root.append(checkpoint(quiz));
  },
};
