/**
 * Inorder-column layout: every node gets its own column, left to right in inorder.
 * Because of this, a rotation only ever moves nodes up or down, never sideways.
 */
export const COL = { node: 50, subtree: 66, empty: 46 };
export const LEVEL = 70;
export const R = 19;
export const triHeight = (h) => 26 + 16 * h;

export function layout(root) {
  const items = new Map();
  const edges = [];
  let cursor = 0;
  let maxY = 0;

  const walk = (n, depth, parent) => {
    if (!n) return 0;
    const hl = walk(n.left, depth + 1, n);
    const x = cursor + COL[n.kind] / 2;
    cursor += COL[n.kind];
    const y = depth * LEVEL - (n.kind === 'node' ? 0 : 12);
    const item = { id: n.id, node: n, x, y, depth, parent: parent?.id ?? null };
    items.set(n.id, item);
    const hr = walk(n.right, depth + 1, n);

    item.h = n.kind === 'node' ? 1 + Math.max(hl, hr) : n.kind === 'subtree' ? n.height : 0;
    item.bal = n.kind === 'node' ? hl - hr : null;
    item.bottom = y + (n.kind === 'node' ? R : n.kind === 'subtree' ? triHeight(n.height) : 26);
    maxY = Math.max(maxY, item.bottom);
    if (parent) edges.push({ key: `${parent.id}>${n.id}`, from: parent.id, to: n.id });
    return item.h;
  };

  walk(root, 0, null);
  return { items, edges, width: cursor, maxY };
}
