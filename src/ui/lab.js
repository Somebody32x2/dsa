import { h } from './dom.js';
import { Player } from './player.js';
import { segmented, toggle } from './figure.js';
import { treeTypes, treeType } from '../trees/registry.js';

/**
 * An interactive tree: type keys, insert/remove, and step through what the tree does.
 * Used by the playground and inline "try it" figures.
 */
export function lab(host, { type = 'avl', keys = [], style = 'rotations', pickType = false, view = {}, height = 360 } = {}) {
  let kind = treeType(type);
  let opts = { style };
  let tree = build(kind, opts, keys);
  const viewOpts = { showHeights: false, showBalance: true, showInorder: false, ...view };

  const root = h('div', { class: 'lab' });
  const input = h('input', {
    class: 'key-input',
    type: 'text',
    inputmode: 'numeric',
    placeholder: 'key, e.g. 54',
    'aria-label': 'Key or keys',
    onkeydown: (e) => {
      if (e.key === 'Enter') run('insert');
    },
  });
  const msg = h('div', { class: 'lab-msg', 'aria-live': 'polite' });
  const history = h('ol', { class: 'lab-history' });

  const form = h(
    'div',
    { class: 'lab-form' },
    input,
    h('button', { class: 'btn small', text: 'Insert', onclick: () => run('insert') }),
    h('button', { class: 'btn small ghost', text: 'Remove', onclick: () => run('remove') }),
    h('button', { class: 'btn small ghost', text: 'Random', onclick: () => randomInsert() }),
    keys.length > 0 && h('button', { class: 'btn small ghost', text: 'Reset', title: 'Back to the starting tree', onclick: () => reset(keys) }),
    h('button', { class: 'btn small ghost', text: 'Clear', title: 'Empty the tree', onclick: () => reset([]) }),
  );

  const tools = h('div', { class: 'lab-tools' });
  const styleSeg = () =>
    kind.options.style &&
    segmented(
      [
        { value: 'rotations', label: 'As rotations' },
        { value: 'trinode', label: 'As one restructure' },
      ],
      opts.style,
      (v) => {
        opts.style = v;
        tree.style = v;
      },
      { label: 'How to show a restructure' },
    );
  const viewToggle = (label, key) =>
    toggle(label, viewOpts[key], (v) => {
      viewOpts[key] = v;
      player.view.setOption(key, v);
    });
  const renderTools = () => {
    tools.replaceChildren(
      pickType &&
        h(
          'select',
          {
            class: 'select',
            'aria-label': 'Tree type',
            onchange: (e) => {
              kind = treeType(e.target.value);
              reset(preorder(tree.root));
            },
          },
          treeTypes.map((t) => h('option', { value: t.id, selected: t.id === kind.id, text: t.name })),
        ),
      styleSeg(),
      h('span', { class: 'spacer' }),
      viewToggle('Heights', 'showHeights'),
      viewToggle('Balance', 'showBalance'),
      viewToggle('Inorder', 'showInorder'),
    );
  };
  const preorder = (n, out = []) => {
    if (n) out.push(n.key), preorder(n.left, out), preorder(n.right, out);
    return out;
  };

  root.append(tools, form, msg);
  const player = new Player(root, { view: { height, ...viewOpts }, interval: 1500 });
  root.append(h('div', { class: 'lab-history-wrap' }, h('div', { class: 'eyebrow', text: 'History' }), history));
  host.append(root);
  renderTools();
  showStatic(keys.length ? `Starting tree. Type a key and press Insert, or Remove one.` : 'Empty tree. Insert a key to begin.');

  function build(k, o, list) {
    const t = k.create(o);
    for (const key of list) t.insert(key);
    return t;
  }

  function showStatic(caption) {
    player.load([{ tree: tree.snapshot(), caption }]);
  }

  function parse() {
    const keys = input.value
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    if (!keys.length || keys.some((k) => !Number.isInteger(k) || k < -999 || k > 999)) {
      msg.textContent = 'Enter whole numbers between -999 and 999, separated by spaces.';
      return null;
    }
    msg.textContent = '';
    return keys;
  }

  function run(op) {
    const keys = parse();
    if (!keys) return;
    input.value = '';
    if (keys.length === 1) {
      const frames = tree[op](keys[0]);
      log(op, keys[0]);
      player.load(frames);
      player.play();
    } else {
      for (const k of keys) {
        tree[op](k);
        log(op, k);
      }
      showStatic(`${op === 'insert' ? 'Inserted' : 'Removed'} ${keys.join(', ')}. See the history below for each restructure.`);
    }
    input.focus();
  }

  function randomInsert() {
    const present = new Set(tree.keys());
    if (present.size >= 40) {
      msg.textContent = 'The tree is full enough to read; remove some keys first.';
      return;
    }
    let k;
    do k = 1 + Math.floor(Math.random() * 99);
    while (present.has(k));
    input.value = String(k);
    run('insert');
  }

  function log(op, key) {
    const r = tree.restructures ?? [];
    const what = r.length
      ? r.map((s) => `${s.kase} restructure at z=${s.z} (y=${s.y}, x=${s.x}) \u2192 b=${s.b}`).join('; ')
      : 'no restructure';
    history.prepend(h('li', {}, h('span', { class: 'mono', text: `${op} ${key}` }), h('span', { class: 'muted', text: what })));
    while (history.children.length > 12) history.lastChild.remove();
  }

  function reset(keys) {
    tree = build(kind, opts, keys);
    history.replaceChildren();
    renderTools();
    showStatic(keys.length ? `Rebuilt as ${kind.name}.` : 'Empty tree. Insert a key to begin.');
  }

  return { get tree() { return tree; }, player, reset };
}
