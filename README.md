# Tree Rotations

Interactive lessons on binary trees, AVL trees, rotations and trinode restructuring,
`restructure(x)`, with animated figures, checkpoint quizzes, endless drills and a playground.

**Live site:** https://somebody32x2.github.io/tree-rotations/

Notation follows Goodrich & Tamassia: **z** is the first unbalanced node, **y** its taller child, **x** y's
taller child. **a, b, c** are x, y, z in inorder, and **T1 to T4** are the four subtrees hanging below
them, left to right. Heights count a leaf as 1 and an empty subtree as 0.

## Chapters

1. Binary trees: vocabulary, inorder traversal
2. Binary search trees: search, insert, why balance matters
3. Height and balance: the AVL property, balance factors
4. Rotations: left/right rotations, a click-to-rotate sandbox
5. Trinode restructure: the four cases (LL, LR, RR, RL), single vs double rotation, one-step restructure
6. AVL insertion: walkthroughs, including the textbook "insert 54" example
7. AVL deletion: the tie rule and cascading restructures
8. Restructure drills: random trees; find z, y, x, name the case, predict b
9. Playground: AVL vs plain BST on any input

## Run locally

No build step, no dependencies. ES modules need to be served over HTTP:

```sh
npm start        # serves on http://localhost:5173
npm test         # engine tests (node:test)
```

Any static server works (`python -m http.server`, etc.).

## Layout

```
src/core/      Node, BinaryTree (BST + rotations + frame recording), layout, SVG TreeView
src/trees/     AVLTree (restructure(x), rebalancing), registry of tree types
src/ui/        Player (step-through), quiz, figures, lab (interactive tree)
src/lessons/   one module per chapter; index.js sets the order
tests/         engine tests
```

Operations return **frames**: `{ tree, caption, roles, tags, text, view }`. `TreeView` animates
between frames by node id, using one column per node in inorder so rotations only move nodes
vertically, and flashes links that changed.

## Adding another tree type (red-black, splay, ...)

1. Subclass `BinaryTree` in `src/trees/` and override `afterInsert(node, rec)` / `afterRemove(parent, rec)`.
   Use `this.rotate(n)` and record frames with `rec.frame(caption, { roles, tags })`.
2. Add it to `src/trees/registry.js`; it appears in the playground's type picker.
3. For node colors (e.g. red/black), add a field to `snapshot()` and a matching class in `TreeView.updateNode`.
4. Write lessons in `src/lessons/` and list them in `src/lessons/index.js` under a new group.

## License

MIT
