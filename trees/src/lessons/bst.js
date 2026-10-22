import { p } from '../ui/dom.js';
import { Player } from '../ui/player.js';
import { figure, callout } from '../ui/figure.js';
import { checkpoint } from '../ui/quiz.js';
import { BinaryTree } from '../core/tree.js';
import { bst, still, paint, idOf, section } from './kit.js';

function insertDemo() {
  const t = bst([50, 30, 70, 20, 40, 60, 80]);
  return [still(t, 'A binary search tree. We will insert 45.', { view: { showInorder: true } }), ...t.insert(45).map((f) => ({ ...f, view: { showInorder: true } }))];
}

function degenerate() {
  const t = new BinaryTree();
  const frames = [];
  for (const k of [10, 20, 30, 40, 50]) {
    t.insert(k);
    frames.push(still(t, `Insert ${k}. ${k === 10 ? 'Sorted input' : 'Each key is larger than everything so far, so it always goes right.'}`, { roles: paint(t, [k], 'new'), view: { showHeights: true } }));
  }
  frames.push(
    still(t, 'Five keys, height 5. This "tree" is a linked list: searching for 50 visits every node. Inserting n sorted keys gives height n, so search, insert and delete become O(n).', {
      roles: paint(t, [10, 20, 30, 40, 50], 'path'),
      view: { showHeights: true },
    }),
  );
  return frames;
}

const quiz = [
  {
    type: 'pick',
    id: 'bst.parent',
    prompt: 'Where does <b>65</b> go? Click the node that will become its parent.',
    build: () => {
      const t = bst([50, 30, 70, 20, 40, 60, 80]);
      return { frame: still(t), answer: [idOf(t, 60)] };
    },
    explain: '65 > 50, go right to 70. 65 < 70, go left to 60. 65 > 60, and 60 has no right child, so 65 becomes the right child of 60.',
  },
  {
    type: 'mcq',
    id: 'bst.sorted',
    prompt: 'Which traversal of a binary search tree lists its keys in sorted order?',
    choices: ['Preorder', 'Inorder', 'Postorder', 'Level order'],
    answer: 1,
    explain: 'Inorder visits the left subtree (all smaller keys), then the node, then the right subtree (all larger keys).',
  },
  {
    type: 'mcq',
    id: 'bst.worst',
    prompt: 'You insert the keys 1, 2, 3, ..., n in that order into a plain BST. What is its height?',
    choices: ['about log\u2082 n', 'about n / 2', 'n', 'It depends on n being even'],
    answer: 2,
    explain: 'Every key goes right of the previous one, so the tree is one long path of n nodes. This is exactly the case balanced trees exist to prevent.',
  },
];

export default {
  id: 'bst',
  title: 'Binary search trees',
  group: 'Foundations',
  blurb: 'Ordered keys make search fast, as long as the tree stays short.',
  quiz,
  render(root) {
    root.append(
      p('A <b>binary search tree</b> (BST) stores keys so that for every node <i>v</i>: all keys in v\u2019s left subtree are smaller than v, and all keys in its right subtree are larger. To find a key, start at the root and go left or right at each node; you only ever walk one path.'),
      p('Insertion is the same walk: search for the key, and when you fall off the tree, the new node goes in that empty spot as a leaf.'),
    );
    const f1 = figure({ title: 'Inserting 45', note: 'The strip at the bottom is the inorder listing. In a BST it is always sorted.' });
    root.append(f1);
    new Player(f1.querySelector('.fig-body'), { frames: insertDemo(), view: { height: 320 } });

    root.append(section('Why we need balance'));
    root.append(p('Every operation costs one walk from the root, so it takes time proportional to the tree\u2019s <b>height</b>. With a bad insertion order, the height can grow to n.'));
    const f2 = figure({ title: 'Inserting keys in sorted order' });
    root.append(f2);
    new Player(f2.querySelector('.fig-body'), { frames: degenerate(), view: { height: 380 } });

    root.append(
      callout(
        'key',
        'The fix',
        'A <b>balanced</b> search tree adds a rule that keeps the height O(log n), and repairs the tree after each insert or delete. AVL trees do the repair with <b>rotations</b>, which reshape the tree without breaking the BST order. Red-black trees use the same rotations with a different rule.',
      ),
    );
    root.append(checkpoint(quiz));
  },
};
