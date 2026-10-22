import { h, p } from '../ui/dom.js';
import { TreeView } from '../core/view.js';
import { figure, callout, segmented } from '../ui/figure.js';
import { checkpoint } from '../ui/quiz.js';
import { avl, bst, still, section } from './kit.js';

const SORTED = [1, 2, 3, 4, 5, 6, 7];

/** Fewest nodes an AVL tree of height h can have: N(0) = 0, N(1) = 1, N(h) = 1 + N(h-1) + N(h-2). */
function maxAvlHeight(n) {
  let [prev, cur, h] = [0, 1, 1];
  while (1 + cur + prev <= n) [prev, cur, h] = [cur, 1 + cur + prev, h + 1];
  return h;
}

const fmt = (n) => n.toLocaleString('en-US');

function heightTable() {
  const rows = [10, 100, 1000, 1e6, 1e9]
    .map((n) => `<tr><td>${fmt(n)}</td><td>${Math.ceil(Math.log2(n + 1))}</td><td>${maxAvlHeight(n)}</td><td>${fmt(n)}</td></tr>`)
    .join('');
  return h('div', { class: 'table-wrap reveal' }, h('table', { html: `
    <thead><tr><th>n keys</th><th>Shortest possible tree</th><th>Tallest AVL tree</th><th>Tallest plain BST</th></tr></thead>
    <tbody>${rows}</tbody>` }));
}

function costTable() {
  return h('div', { class: 'table-wrap reveal' }, h('table', { html: `
    <thead><tr><th>Operation</th><th>Plain BST (worst case)</th><th>AVL tree (worst case)</th><th>Why</th></tr></thead>
    <tbody>
      <tr><td>Update one node\u2019s height</td><td>O(1)</td><td>O(1)</td><td>1 + max of the two children\u2019s stored heights</td></tr>
      <tr><td>Single rotation</td><td>O(1)</td><td>O(1)</td><td>3 child links change, 2 heights are updated; the subtrees move as whole pointers</td></tr>
      <tr><td>restructure(x)</td><td>\u2014</td><td>O(1)</td><td>at most 2 rotations, or one trinode step: 7 links, 3 heights</td></tr>
      <tr><td>Search</td><td>O(n)</td><td>O(log n)</td><td>one root-to-leaf path, at most h nodes</td></tr>
      <tr><td>Insertion</td><td>O(n)</td><td>O(log n)</td><td>down the path, back up it, at most <b>one</b> restructure</td></tr>
      <tr><td>Deletion</td><td>O(n)</td><td>O(log n)</td><td>down the path (and to the successor), back up it, up to O(log n) restructures at O(1) each</td></tr>
      <tr><td>Build from n keys</td><td>O(n<sup>2</sup>)</td><td>O(n log n)</td><td>n insertions</td></tr>
    </tbody>` }));
}

function shapeFigure() {
  const trees = {
    bst: { tree: bst(SORTED), note: 'Plain BST: each new key is the largest so far, so it goes right every time. Height 7 = n; finding 7 visits every node.' },
    avl: { tree: avl(SORTED), note: 'AVL tree: the same seven inserts, with restructures along the way. Height 3; finding any key visits at most 3 nodes.' },
  };
  const stage = h('div', { class: 'stage' });
  const caption = h('figcaption');
  const view = new TreeView(stage, { height: 360, showHeights: true });
  const show = (k) => {
    view.show(still(trees[k].tree));
    caption.innerHTML = trees[k].note;
  };
  const fig = figure(
    {
      title: 'Keys 1 to 7, inserted in sorted order',
      tools: [segmented([{ value: 'bst', label: 'Plain BST' }, { value: 'avl', label: 'AVL tree' }], 'bst', show, { label: 'Tree' })],
    },
    stage,
  );
  fig.append(caption);
  show('bst');
  return fig;
}

const quiz = [
  {
    type: 'mcq',
    id: 'time.rotation',
    prompt: 'What is the running time of a single rotation in a tree with n nodes?',
    choices: ['O(1)', 'O(log n)', 'O(n)', 'It depends on the size of the subtrees being moved'],
    answer: 0,
    explain: 'A rotation changes three child links and recomputes two stored heights. The subtrees (T1, T2, T3) move by reassigning a pointer to their root; nothing inside them is visited. That work does not depend on n.',
  },
  {
    type: 'mcq',
    id: 'time.restructure',
    prompt: 'restructure(x) moves T1 to T4, which together can hold almost all n nodes. Why is it still O(1)?',
    choices: [
      'It is not; it is O(n)',
      'Each subtree is moved as one pointer to its root, and only a, b, c get new heights',
      'Because T1 to T4 always have height 1',
      'Because AVL trees have height O(log n)',
    ],
    answer: 1,
    explain: 'Moving a subtree means changing one link to its root. Heights inside T1 to T4 do not change, so only a, b and c are recomputed. At most 2 rotations, or one trinode step with 7 links: a constant amount of work.',
  },
  {
    type: 'mcq',
    id: 'time.insert',
    prompt: 'What is the worst-case running time of an AVL <b>insertion</b>?',
    choices: ['O(1)', 'O(log n)', 'O(log<sup>2</sup> n)', 'O(n)'],
    answer: 1,
    explain: 'Walking down to the insertion spot is O(h), walking back up updating heights is O(h), and at most one restructure costs O(1). With h = O(log n) the total is O(log n).',
  },
  {
    type: 'mcq',
    id: 'time.delete',
    prompt: 'An AVL deletion can need a restructure at every level. What is its worst-case running time?',
    choices: ['O(1)', 'O(log n)', 'O(log<sup>2</sup> n)', 'O(n)'],
    answer: 1,
    explain: 'There are at most O(log n) restructures, one per node on the path back up, and each is O(1). So they add O(log n), the same as the walk itself. Total: O(log n), not O(log<sup>2</sup> n).',
  },
  {
    type: 'mcq',
    id: 'time.heights',
    prompt: 'Suppose nodes do <b>not</b> store their height, and height(v) is computed recursively each time it is needed. What does one height computation cost?',
    choices: ['O(1)', 'O(log n)', 'O(size of v\u2019s subtree)', 'O(n<sup>2</sup>)'],
    answer: 2,
    explain: 'Recursing visits every node below v, so computing height at the root is O(n). Rotations and restructures are O(1) only because each node keeps its height and it is updated from the children\u2019s stored values.',
  },
  {
    type: 'mcq',
    id: 'time.build',
    prompt: 'You insert n keys in sorted order. What is the total time for a plain BST, and for an AVL tree?',
    choices: ['O(n) and O(n)', 'O(n log n) and O(n log n)', 'O(n<sup>2</sup>) and O(n log n)', 'O(n<sup>2</sup>) and O(n<sup>2</sup>)'],
    answer: 2,
    explain: 'In a plain BST the i-th sorted key walks down a chain of i \u2212 1 nodes: 1 + 2 + \u2026 + n is O(n<sup>2</sup>). An AVL tree keeps the height O(log n), so each insertion is O(log n) and n of them are O(n log n).',
  },
];

export default {
  id: 'running-time',
  title: 'Running time',
  group: 'AVL trees',
  blurb: 'Rotations and restructures are O(1); search, insertion and deletion are O(log n). Why.',
  quiz,
  render(root) {
    root.append(
      p('Every tree operation in this course walks along one path between the root and a leaf, doing a constant amount of work at each node. So its cost is O(h), where h is the height. The whole point of an AVL tree is to keep h small.'),
      costTable(),
      callout(
        'key',
        'The short version',
        'Rotation and restructure(x): <b>O(1)</b>. Search, insertion and deletion: <b>O(log n)</b>. An insertion does at most one restructure; a deletion may do one per level, O(log n) of them, and that is still O(log n) time.',
      ),
    );

    root.append(section('Height decides everything'));
    root.append(
      p('A plain BST can be as tall as n: insert keys in sorted order and you get a chain. An AVL tree is always shorter than 2 log\u2082 n + 2 (the bound from the Height and balance chapter), and the exact worst case, from N(h) = 1 + N(h\u22121) + N(h\u22122), is about 1.44 log\u2082 n. The table compares the tallest tree each can be with the shortest tree that could hold n keys at all.'),
      heightTable(),
      shapeFigure(),
    );

    root.append(section('Rotations and restructure(x): O(1)'));
    root.append(
      p('A rotation looks like it moves a lot of tree, but it only touches two nodes. For a right rotation at b with left child a: b\u2019s parent now points to a, a.right points to b, and b.left points to T2. Then b\u2019s height and a\u2019s height are recomputed from their children, in that order (b is now below a). Three links and two heights, no matter how large n or the subtrees are.'),
      p('restructure(x) is at most two rotations (single for left-left and right-right, double for left-right and right-left). Done as one trinode step, it relinks b into z\u2019s spot, a and c under b, and T1 to T4 under a and c: seven links, then the heights of a, c and b. Either way it is <b>O(1)</b>.'),
      callout(
        'warn',
        'O(1) needs stored heights',
        'The constant bound assumes each node stores its height, and a height is recomputed as 1 + max(height(left), height(right)) from the children\u2019s stored values. Computing height(v) by recursing through the subtree costs O(size of the subtree), O(n) at the root, and would make every rotation and every update O(n).',
      ),
    );

    root.append(section('Insertion: O(log n)'));
    root.append(
      h('ol', { class: 'steps reveal', html: `
        <li><b>Walk down</b> from the root to the empty spot where the key belongs: O(h) = O(log n).</li>
        <li><b>Attach</b> the new leaf: O(1).</li>
        <li><b>Walk up</b> toward the root, updating each height and checking each balance factor: O(1) per node, O(log n) in all.</li>
        <li>At most <b>one restructure</b>: O(1). b\u2019s subtree ends up as tall as z\u2019s was before the insert, so the walk can stop there.</li>` }),
      p('Total: O(log n) + O(1) + O(log n) + O(1) = <b>O(log n)</b>.'),
    );

    root.append(section('Deletion: O(log n)'));
    root.append(
      h('ol', { class: 'steps reveal', html: `
        <li><b>Walk down</b> to the key: O(log n). If its node has two children, keep going to the inorder successor (leftmost node of the right subtree): still on one downward path, O(log n).</li>
        <li><b>Unlink</b> the node, which has at most one child: O(1).</li>
        <li><b>Walk up</b> from its parent to the root, updating heights and checking balance: O(log n).</li>
        <li>Each restructure on the way up is O(1), and there is at most one per node on the path: O(log n) restructures, <b>O(log n)</b> time for all of them.</li>` }),
      p('Total: <b>O(log n)</b>. Several restructures make a deletion slower by a constant factor, not by an extra log.'),
      callout(
        'note',
        'Count versus time',
        'Two different questions get asked. How many restructures? Insertion: at most 1. Deletion: O(log n). How much time? Both: O(log n). The restructures in a deletion all sit on the path the walk already visits, so they never cost more than the walk.',
      ),
    );

    root.append(section('Space'));
    root.append(
      p('An AVL tree stores n nodes, each with a key, two child links, a parent link and a height: <b>O(n)</b> space. Insertion and deletion need only O(1) extra space when they walk up with parent links (a recursive version uses O(log n) stack, one frame per level).'),
    );

    root.append(checkpoint(quiz));
  },
};
