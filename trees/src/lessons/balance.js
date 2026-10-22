import { h, p } from '../ui/dom.js';
import { Player } from '../ui/player.js';
import { TreeView } from '../core/view.js';
import { figure, callout, toggle } from '../ui/figure.js';
import { checkpoint } from '../ui/quiz.js';
import { avl, bst, still, paint, ids, section, identifyFrame, tag } from './kit.js';

const TEXTBOOK = [44, 17, 78, 32, 50, 88, 48, 62];

function breakFrames() {
  const t = avl(TEXTBOOK);
  const start = still(t, 'An AVL tree. Every balance factor is \u22121, 0 or +1. Now insert 54.', { view: { showBalance: true } });
  const frames = t.insert(54);
  const k = frames.indexOf(identifyFrame(frames));
  const shown = frames.slice(0, k + 1).map((f) => ({ ...f, view: { showBalance: true } }));
  const last = shown[k];
  shown[k] = {
    ...last,
    tags: {},
    roles: Object.fromEntries(Object.entries(last.roles).filter(([, r]) => r === 'z')),
    badge: '',
    caption: `<b>78</b> now has balance +2: its left side is two levels taller than its right. The tree is no longer an AVL tree. Notice where the damage is: only nodes on the path from 54 back up to the root changed height, so only they can become unbalanced. The first such node on the way up is called ${tag('z')}.`,
  };
  return [start, ...shown];
}

const quiz = [
  {
    type: 'pick',
    id: 'balance.violators',
    prompt: 'Click <b>every</b> node that violates the AVL height-balance property. (Turn on balance factors only if you get stuck.)',
    build: () => {
      const t = bst([50, 30, 80, 20, 40, 10, 5]);
      return { frame: still(t), answer: ids(t, [50, 30, 20]), after: still(t, '', { view: { showBalance: true, showHeights: true } }) };
    },
    explain: '20 has a left subtree of height 2 and an empty right subtree (+2). 30: heights 3 and 1 (+2). 50: heights 4 and 1 (+3). 10 is fine: 1 vs 0.',
  },
  {
    type: 'mcq',
    id: 'balance.which',
    prompt: 'After inserting a new leaf into an AVL tree, which nodes can possibly become unbalanced?',
    choices: ['Any node in the tree', 'Only the new node\u2019s parent', 'Only ancestors of the new node (nodes on its path to the root)', 'Only the root'],
    answer: 2,
    explain: 'A node\u2019s height depends only on its own subtree. The new leaf is only in the subtrees of its ancestors, so only their heights (and balance factors) can change.',
  },
  {
    type: 'mcq',
    id: 'balance.factor',
    prompt: 'A node\u2019s left subtree has height 3 and its right subtree is empty. What is its balance factor, and is it allowed in an AVL tree?',
    choices: ['+3, not allowed', '+2, not allowed', '\u22123, allowed', '+3, allowed if it is the root'],
    answer: 0,
    explain: 'Balance = h(left) \u2212 h(right) = 3 \u2212 0 = +3. AVL allows only \u22121, 0 and +1 at every node, root included.',
  },
];

export default {
  id: 'balance',
  title: 'Height and balance',
  group: 'Balance',
  blurb: 'The one rule an AVL tree keeps, and what an insertion does to it.',
  quiz,
  render(root) {
    root.append(
      p('An <b>AVL tree</b> is a binary search tree with one extra rule, the <b>height-balance property</b>: for every node, the heights of its two children differ by at most 1.'),
      p('It helps to put a number on each node, its <b>balance factor</b>: <code>balance(v) = height(v.left) \u2212 height(v.right)</code>. An AVL tree is a BST in which every balance factor is \u22121, 0 or +1. A positive balance means left-heavy; negative means right-heavy.'),
    );

    const t = avl(TEXTBOOK);
    const stage = h('div', { class: 'stage' });
    const view = new TreeView(stage, { height: 300, showHeights: true, showBalance: true });
    const f1 = figure(
      {
        title: 'An AVL tree with heights and balance factors',
        tools: [toggle('Heights', true, (v) => view.setOption('showHeights', v)), toggle('Balance', true, (v) => view.setOption('showBalance', v))],
        note: 'Upper right of a node: its balance factor. Lower right: its height. Check a few by hand: 78 has a left child of height 2 and a right child of height 1, so +1.',
      },
      stage,
    );
    root.append(f1);
    view.show(still(t));

    root.append(
      callout(
        'note',
        'Why this rule keeps trees short',
        'Let N(h) be the fewest nodes an AVL tree of height h can have. Its root has one subtree of height h\u22121 and, at worst, one of height h\u22122, so N(h) = 1 + N(h\u22121) + N(h\u22122). That grows like the Fibonacci numbers, at least doubling every two levels, so N(h) > 2<sup>h/2\u22121</sup> and h < 2 log\u2082 n + 2. Height is O(log n), so search is O(log n).',
      ),
    );

    root.append(section('How an insertion breaks it'));
    root.append(p('Insert a key the ordinary BST way and some heights grow by one. If a node was already leaning one way (balance \u00b11) and the new node lands on its heavy side, it becomes \u00b12.'));
    const f2 = figure({ title: 'Inserting 54 into an AVL tree' });
    root.append(f2);
    new Player(f2.querySelector('.fig-body'), { frames: breakFrames(), view: { height: 340 } });

    root.append(
      callout(
        'key',
        'What to remember',
        'Balance only breaks along the path from the changed spot to the root, and it breaks by exactly 2. The next two chapters are about the local surgery that fixes a \u00b12 node: rotations, packaged as <b>restructure(x)</b>.',
      ),
    );
    root.append(checkpoint(quiz));
  },
};
