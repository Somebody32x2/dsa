import { h, p } from '../ui/dom.js';
import { Player } from '../ui/player.js';
import { figure, callout, segmented } from '../ui/figure.js';
import { checkpoint } from '../ui/quiz.js';
import { lab } from '../ui/lab.js';
import { avl, still, idOf, section, identifyFrame } from './kit.js';

const PRESETS = {
  LL: { keys: [30, 20], insert: 10, label: 'LL: 30, 20, 10' },
  RR: { keys: [10, 20], insert: 30, label: 'RR: 10, 20, 30' },
  LR: { keys: [30, 10], insert: 20, label: 'LR: 30, 10, 20' },
  RL: { keys: [10, 30], insert: 20, label: 'RL: 10, 30, 20' },
  book: { keys: [44, 17, 78, 32, 50, 88, 48, 62], insert: 54, label: 'Textbook: insert 54' },
};

function presetFrames(name) {
  const { keys, insert } = PRESETS[name];
  const t = avl(keys);
  const start = still(t, `Start: ${keys.join(', ')} already inserted. Now insert <b>${insert}</b>.`, { view: { showBalance: true } });
  return [start, ...t.insert(insert)];
}

const quiz = [
  {
    type: 'pick',
    id: 'ins.xyz',
    prompt: 'We inserted <b>15</b> (green). Click <b>z</b>, then <b>y</b>, then <b>x</b>.',
    ordered: true,
    labels: ['z', 'y', 'x'],
    view: { height: 300 },
    build: () => {
      const t = avl([60, 30, 80, 20, 40, 70, 90, 10]);
      const frames = t.insert(15);
      const f = identifyFrame(frames);
      return {
        frame: { tree: f.tree, roles: { [idOf(t, 15)]: 'new' } },
        answer: [f.meta.z, f.meta.y, f.meta.x],
        after: { tree: f.tree, view: { showBalance: true } },
      };
    },
    explain: 'Walk up from 15: 10 has balance \u22121, fine. 20 has a left subtree of height 2 and no right subtree: +2, so z = 20. y = 10 (z\u2019s taller child), x = 15 (y\u2019s taller child, the new node itself). Left-right zig-zag: b = 15.',
  },
  {
    type: 'mcq',
    id: 'ins.count',
    prompt: 'At most how many restructure operations can a single AVL <b>insertion</b> trigger?',
    choices: ['1', '2', 'O(log n)', 'O(n)'],
    answer: 0,
    explain: 'The restructured subtree ends up with the same height z had before the insertion. Every ancestor above it sees no height change, so nothing else can be unbalanced.',
  },
  {
    type: 'mcq',
    id: 'ins.path',
    prompt: 'For an insertion, where are y and x?',
    choices: [
      'On the path from z down to the new node',
      'On the side of z away from the new node',
      'y is always the new node',
      'Anywhere in z\u2019s subtree',
    ],
    answer: 0,
    explain: 'The insertion is what made z\u2019s side taller, so z\u2019s taller child y and y\u2019s taller child x are the next two nodes on the way down to the new node. (x can be the new node itself.) Deletion is different, as the next chapter shows.',
  },
  {
    type: 'mcq',
    id: 'ins.walk',
    prompt: 'After inserting a leaf, which node do you start checking balance at?',
    choices: ['The root', 'The new leaf\u2019s parent, then upward', 'The new leaf\u2019s sibling', 'Every node in the tree'],
    answer: 1,
    explain: 'Only ancestors of the new leaf can change height, so you walk from its parent up toward the root, updating heights, and stop at the first node with balance \u00b12.',
  },
];

export default {
  id: 'avl-insert',
  title: 'AVL insertion',
  group: 'AVL trees',
  blurb: 'Insert like a BST, walk up, restructure once. Every step, on real keys.',
  quiz,
  render(root) {
    root.append(p('Inserting into an AVL tree is a BST insertion followed by a repair walk:'));
    root.append(
      h('ol', { class: 'steps reveal', html: `
        <li><b>Insert</b> the key as a new leaf, exactly as in a plain BST.</li>
        <li><b>Walk up</b> from the new node\u2019s parent toward the root, updating heights.</li>
        <li>Stop at the first node whose balance is \u00b12. That is <b>z</b>. Its taller child is <b>y</b>, and y\u2019s taller child is <b>x</b>. (They are the next two nodes on the path down to the new node.)</li>
        <li>Call <b>restructure(x)</b>. You are done: one restructure fixes the whole tree.</li>` }),
    );

    let player;
    const host = h('div');
    root.append(
      figure(
        {
          title: 'Insertion walkthroughs',
          wide: true,
          tools: [
            segmented(
              Object.entries(PRESETS).map(([value, v]) => ({ value, label: v.label })),
              'LL',
              (v) => player.load(presetFrames(v)),
              { label: 'Example' },
            ),
          ],
          note: 'The three-key examples are the smallest possible tree for each case: z, y, x with all four subtrees empty.',
        },
        host,
      ),
    );
    player = new Player(host, { frames: presetFrames('LL'), view: { height: 340 } });

    root.append(
      callout(
        'key',
        'Why one restructure is enough',
        'Before the insertion, z\u2019s subtree had height h+2. The insertion pushed it to h+3 and made z \u00b12. After restructure(x), b\u2019s subtree has height h+2 again. To everything above, it is as if nothing happened, so no ancestor can be unbalanced.',
      ),
    );

    root.append(section('Your turn'));
    root.append(p('This is the textbook tree. Insert keys and step through what happens. Good ones to try, each on a fresh tree (press Reset between them): 54 (left-right), 35 (right-right), 20 (right-left), 46 then 47. The history list names the case each time.'));
    const host2 = h('div');
    root.append(figure({ title: 'AVL insertion lab', wide: true }, host2));
    lab(host2, { type: 'avl', keys: [44, 17, 78, 32, 50, 88, 48, 62], height: 380 });

    root.append(checkpoint(quiz));
  },
};
