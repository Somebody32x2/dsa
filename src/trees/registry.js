import { BinaryTree } from '../core/tree.js';
import { AVLTree } from './avl.js';

/**
 * Tree types available in the playground. To add a new balanced tree (red-black, splay, ...):
 * subclass BinaryTree, override afterInsert/afterRemove to record frames, and add an entry here.
 * `options` lists extra constructor options the playground can toggle.
 */
export const treeTypes = [
  {
    id: 'avl',
    name: 'AVL tree',
    create: (opts) => new AVLTree(opts),
    options: { style: ['rotations', 'trinode'] },
  },
  {
    id: 'bst',
    name: 'Plain BST (no balancing)',
    create: () => new BinaryTree(),
    options: {},
  },
];

export const treeType = (id) => treeTypes.find((t) => t.id === id) ?? treeTypes[0];
