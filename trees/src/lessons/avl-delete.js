import { h, p } from '../ui/dom.js';
import { Player } from '../ui/player.js';
import { figure, callout, segmented } from '../ui/figure.js';
import { checkpoint } from '../ui/quiz.js';
import { lab } from '../ui/lab.js';
import { avl, still, idOf, identifyFrame } from './kit.js';

const PRESETS = {
  book: { keys: [44, 17, 62, 32, 50, 78, 48, 54, 88], remove: 32, label: 'Textbook: remove 32 (tie)' },
  double: { keys: [50, 30, 70, 40], remove: 70, label: 'Double rotation: remove 70' },
  cascade: { keys: [25, 85, 40, 75, 65, 15, 70, 95, 20, 45, 50, 35], remove: 70, label: 'Two restructures: remove 70' },
};

function presetFrames(name) {
  const { keys, remove } = PRESETS[name];
  const t = avl(keys);
  const start = still(t, `Start: an AVL tree. Remove <b>${remove}</b>.`, { view: { showBalance: true } });
  return [start, ...t.remove(remove)];
}

const quiz = [
  {
    type: 'pick',
    id: 'del.xyz',
    prompt: 'We removed <b>80</b>, which was 70\u2019s right child. Click <b>z</b>, then <b>y</b>, then <b>x</b>.',
    ordered: true,
    labels: ['z', 'y', 'x'],
    view: { height: 300 },
    build: () => {
      const t = avl([50, 30, 70, 20, 40, 80, 35]);
      const f = identifyFrame(t.remove(80));
      return { frame: { tree: f.tree, roles: { [idOf(t, 70)]: 'path' } }, answer: [f.meta.z, f.meta.y, f.meta.x], after: { tree: f.tree, view: { showBalance: true } } };
    },
    explain: 'Walk up from 70 (balance 0, fine) to 50: left height 3, right height 1, so z = 50. y is z\u2019s <em>taller</em> child, 30, on the opposite side from the deletion. x is y\u2019s taller child: 40 (height 2) beats 20 (height 1). Left-right: b = 40.',
  },
  {
    type: 'mcq',
    id: 'del.tie',
    prompt: 'During a deletion, y\u2019s two children have the <b>same</b> height. Which one is x?',
    choices: ['The left child, always', 'The child on the same side as y (y is a left child \u2192 pick y.left)', 'The child on the opposite side from y', 'Either; it makes no difference'],
    answer: 1,
    explain: 'Picking the same side makes x, y, z a straight line, so a single rotation works and the result is balanced. Picking the other side would give a zig-zag whose double rotation can leave a node unbalanced.',
  },
  {
    type: 'mcq',
    id: 'del.side',
    prompt: 'In a deletion, which side of z is y on?',
    choices: ['The side where the node was removed', 'The side away from the removed node (the taller side)', 'Always z\u2019s left', 'Always z\u2019s right'],
    answer: 1,
    explain: 'Removing a node made one side of z shorter. y is z\u2019s taller child, so it is on the other side. This is the biggest difference from insertion, where y is on the side that grew.',
  },
  {
    type: 'mcq',
    id: 'del.count',
    prompt: 'At most how many restructures can one AVL <b>deletion</b> need?',
    choices: ['1', '2', 'O(log n): possibly one per level on the way up', 'O(n)'],
    answer: 2,
    explain: 'A restructure after a deletion can leave its subtree one level shorter than before, which can unbalance an ancestor. So you keep walking up, and may restructure at several levels: at most one per level, O(log n) in total.',
  },
];

export default {
  id: 'avl-delete',
  title: 'AVL deletion',
  group: 'AVL trees',
  blurb: 'Same restructure, two twists: y is on the other side, and the fix can cascade.',
  quiz,
  render(root) {
    root.append(p('Deletion uses the same restructure(x). What changes is how you pick x, y and z, and when you stop.'));
    root.append(
      h('ol', { class: 'steps reveal', html: `
        <li><b>Remove</b> the key as in a plain BST. If its node has two children, copy in its inorder successor and remove the successor\u2019s node instead.</li>
        <li><b>Walk up</b> from the parent of the node that was physically removed, updating heights.</li>
        <li>At the first node with balance \u00b12: that is <b>z</b>. <b>y</b> is z\u2019s taller child, which is on the side <em>away</em> from the deletion. <b>x</b> is y\u2019s taller child; <b>if they tie, take the child on the same side as y</b>.</li>
        <li>Call <b>restructure(x)</b>, then <b>keep walking up</b> from b. More restructures may be needed.</li>` }),
    );

    let player;
    const host = h('div');
    root.append(
      figure(
        {
          title: 'Deletion walkthroughs',
          wide: true,
          tools: [
            segmented(
              Object.entries(PRESETS).map(([value, v]) => ({ value, label: v.label })),
              'book',
              (v) => player.load(presetFrames(v)),
              { label: 'Example' },
            ),
          ],
        },
        host,
      ),
    );
    player = new Player(host, { frames: presetFrames('book'), view: { height: 380 } });

    root.append(
      callout(
        'warn',
        'The tie rule',
        'After an insertion, y\u2019s children can never tie. After a deletion they can, as in the textbook example: 62\u2019s children 50 and 78 both have height 2. Choosing x = 78, on the same side as y, gives a straight line and a single left rotation, which is always balanced. Choosing 50 would give a zig-zag. Here its double rotation happens to work out, but in general it hands c a subtree from x that can be two levels shorter than its other subtree, so the rule always takes the straight line.',
      ),
      callout(
        'key',
        'Why deletions can cascade',
        'An insertion\u2019s restructure restores the old height. A deletion\u2019s restructure may produce a subtree one level <em>shorter</em> than before the deletion, which can unbalance a node further up. That is why deletion keeps walking after a restructure, and can do up to O(log n) of them.',
      ),
    );

    root.append(h('h2', { class: 'reveal', text: 'Your turn' }));
    root.append(p('Remove keys from this tree. Good ones to try: 70 (two restructures), then 15 (right-right), then 35 (no restructure) and 20 (right-right again). The history list shows each restructure.'));
    const host2 = h('div');
    root.append(figure({ title: 'AVL deletion lab', wide: true }, host2));
    lab(host2, { type: 'avl', keys: PRESETS.cascade.keys, height: 400 });

    root.append(checkpoint(quiz));
  },
};
