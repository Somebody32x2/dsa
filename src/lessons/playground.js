import { h, p } from '../ui/dom.js';
import { figure } from '../ui/figure.js';
import { lab } from '../ui/lab.js';

export default {
  id: 'playground',
  title: 'Playground',
  group: 'Practice',
  blurb: 'Any keys, any order. Compare a plain BST with an AVL tree on the same input.',
  quiz: [],
  render(root) {
    root.append(
      p('Type one key to watch it step by step, or several keys separated by spaces (like <code>10 20 30 40 50 60 70</code>) to build a tree at once. Switch the tree type to see the same keys as a plain BST: sorted input turns it into a list, while the AVL tree stays short.'),
    );
    const host = h('div');
    root.append(figure({ title: 'Tree playground', wide: true }, host));
    lab(host, { type: 'avl', keys: [50, 25, 75, 12, 37, 62, 87], pickType: true, height: 440 });
  },
};
