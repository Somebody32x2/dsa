import { h, p } from '../ui/dom.js';
import { Player } from '../ui/player.js';
import { figure, callout } from '../ui/figure.js';
import { checkpoint } from '../ui/quiz.js';
import { bst, still, paint, ids, section } from './kit.js';

const KEYS = [50, 30, 70, 20, 40, 60, 80, 35];

function anatomy() {
  const t = bst(KEYS);
  const v = { showHeights: false };
  return [
    still(t, 'The <b>root</b> (50) is the one node with no parent. Every other node hangs below exactly one parent.', { roles: paint(t, [50], 'found'), view: v }),
    still(t, '30 is the <b>parent</b> of 20 and 40. They are its <b>left child</b> and <b>right child</b>, and siblings of each other. Each node has at most two children.', {
      roles: { ...paint(t, [30], 'visit'), ...paint(t, [20, 40], 'path') },
      view: v,
    }),
    still(t, 'A <b>leaf</b> has no children: 20, 35, 60 and 80. Every other node is an <b>internal</b> node.', { roles: paint(t, [20, 35, 60, 80], 'found'), view: v }),
    still(t, 'Every node is the root of its own <b>subtree</b>: itself plus all of its descendants. Highlighted: the subtree rooted at 30. 50, 30 and 40 are <b>ancestors</b> of 35.', {
      roles: { ...paint(t, [30, 20, 40, 35], 'path'), ...paint(t, [30], 'visit') },
      view: v,
    }),
    still(t, 'The <b>depth</b> of a node is the number of edges from the root down to it. 50 has depth 0, 30 has depth 1, 35 has depth 3.', {
      roles: paint(t, [35], 'visit'),
      view: v,
    }),
    still(
      t,
      'The <b>height</b> of a node counts the nodes on the longest path from it down to a leaf. This site counts a leaf as height 1 and an empty subtree as 0 (some books count a leaf as 0; differences of heights come out the same either way). The height of the tree is the height of its root: 4.',
      { roles: paint(t, [50, 30, 40, 35], 'path'), view: { showHeights: true } },
    ),
  ];
}

function inorderFrames() {
  const t = bst(KEYS);
  const order = t.inorder();
  const frames = [
    still(t, 'Inorder traversal: <code>inorder(v): inorder(v.left); visit v; inorder(v.right)</code>. Left subtree first, then the node, then the right subtree.', {
      view: { showInorder: true },
    }),
  ];
  order.forEach((n, i) => {
    const roles = {};
    order.slice(0, i).forEach((m) => (roles[m.id] = 'path'));
    roles[n.id] = 'visit';
    frames.push(
      still(t, `Visit <b>${n.key}</b>. So far: ${order.slice(0, i + 1).map((m) => m.key).join(', ')}.`, {
        roles,
        view: { showInorder: true },
      }),
    );
  });
  frames.push(
    still(t, 'Done: 20, 30, 35, 40, 50, 60, 70, 80. Look at the strip at the bottom: it is the same list, because every node is drawn in its own column, in inorder.', {
      roles: Object.fromEntries(order.map((n) => [n.id, 'path'])),
      view: { showInorder: true },
    }),
  );
  return frames;
}

const quiz = [
  {
    type: 'mcq',
    id: 'basics.inorder',
    prompt: 'A tree has root 8, whose left child is 4 and right child is 12. 4 has a left child 2 and a right child 6. What is the inorder listing?',
    choices: ['8, 4, 2, 6, 12', '2, 4, 6, 8, 12', '2, 6, 4, 12, 8', '8, 4, 12, 2, 6'],
    answer: 1,
    explain: 'Left subtree (2, 4, 6), then the root 8, then the right subtree (12). The other options are preorder, postorder and level order.',
  },
  {
    type: 'pick',
    id: 'basics.leaves',
    prompt: 'Click every <b>leaf</b> in this tree.',
    build: () => {
      const t = bst([40, 20, 60, 10, 30, 70, 25, 80]);
      return { frame: still(t), answer: ids(t, [10, 25, 80]) };
    },
    explain: 'Leaves have no children: 10, 25 and 80. 30 has a child (25), and 70 has a child (80).',
  },
  {
    type: 'mcq',
    id: 'basics.height',
    prompt: 'Using leaf = height 1, what is the height of a tree whose longest root-to-leaf path is 50 \u2192 30 \u2192 40 \u2192 35?',
    choices: ['3', '4', '5', 'Depends on the number of leaves'],
    answer: 1,
    explain: 'Height counts nodes on the longest downward path: 50, 30, 40, 35 is four nodes. (Counting edges instead would give 3; the convention just shifts every height by one.)',
  },
];

export default {
  id: 'basics',
  title: 'Binary trees',
  group: 'Foundations',
  blurb: 'The vocabulary everything else is built on, and one picture habit that will make rotations obvious later.',
  quiz,
  render(root) {
    root.append(
      p('A <b>binary tree</b> is a set of nodes where each node has at most two children, a <em>left</em> child and a <em>right</em> child, and every node except the root has exactly one parent. Step through the figure to name the parts.'),
    );
    const f1 = figure({ title: 'Anatomy of a binary tree', note: 'Use the arrow buttons, or click the figure and press the arrow keys.' });
    root.append(f1);
    new Player(f1.querySelector('.fig-body'), { frames: anatomy(), view: { height: 300 } });

    root.append(section('Inorder traversal'));
    root.append(
      p('There are several ways to visit every node. The one that matters for search trees is <b>inorder</b>: everything in the left subtree, then the node, then everything in the right subtree.'),
    );
    const f2 = figure({ title: 'Inorder, step by step' });
    root.append(f2);
    new Player(f2.querySelector('.fig-body'), { frames: inorderFrames(), view: { height: 330 }, interval: 900 });

    root.append(
      callout(
        'key',
        'The picture habit',
        'Every diagram on this site puts each node in its own column, left to right in inorder. So <b>reading a tree left to right is the inorder traversal</b>. When we get to rotations, watch the columns: nodes move up and down, never sideways. That is the whole reason rotations are safe.',
      ),
    );
    root.append(checkpoint(quiz));
  },
};
