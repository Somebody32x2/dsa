let counter = 0;

/**
 * A binary tree node.
 *
 * kind:
 *   'node'    a real key
 *   'subtree' an abstract subtree drawn as a triangle (T1..T4) with a fixed height
 *   'empty'   a placeholder for an empty subtree, shown only while a restructure is explained
 */
export class Node {
  constructor(key, { kind = 'node', label = null, height = 0 } = {}) {
    this.id = `n${++counter}`;
    this.key = key;
    this.kind = kind;
    this.label = label;
    this.height = kind === 'node' ? 1 : height;
    this.left = null;
    this.right = null;
    this.parent = null;
  }

  get name() {
    return this.key ?? this.label;
  }
}
