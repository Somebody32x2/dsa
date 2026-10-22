import { h, p, icon } from '../ui/dom.js';
import { TreeView } from '../core/view.js';
import { layout } from '../core/layout.js';
import { Player } from '../ui/player.js';
import { figure, segmented, toggle } from '../ui/figure.js';
import { avl, identifyFrame, tag, CASES } from './kit.js';
import { fmtBalance } from '../core/tree.js';

const rnd = (n) => Math.floor(Math.random() * n);

/** A random AVL tree plus one insert/remove that needs a restructure. */
function makeDrill(op) {
  for (let attempt = 0; attempt < 400; attempt++) {
    const keys = [];
    const size = 6 + rnd(7);
    while (keys.length < size) {
      const k = 1 + rnd(99);
      if (!keys.includes(k)) keys.push(k);
    }
    const base = avl(keys);
    const candidates =
      op === 'insert'
        ? Array.from({ length: 12 }, () => 1 + rnd(99)).filter((k) => !keys.includes(k))
        : base.keys().filter((k) => {
            const n = base.find(k);
            return !(n.left && n.right);
          });
    for (const k of candidates.sort(() => Math.random() - 0.5)) {
      const t = avl(keys);
      const origin = op === 'insert' ? null : t.find(k).parent?.id;
      const frames = t[op](k);
      const f = identifyFrame(frames);
      if (!f) continue;
      return { op, k, frames, f, origin: op === 'insert' ? t.find(k).id : origin };
    }
  }
  return null;
}

function analyse(tree) {
  const L = layout(tree);
  const parent = new Map();
  for (const it of L.items.values()) parent.set(it.id, it.parent);
  return { L, parent };
}

function drillCard(stats, onScore) {
  let op = 'insert';
  const card = h('div', { class: 'drill' });
  const prompt = h('div', { class: 'drill-prompt' });
  const stage = h('div', { class: 'stage' });
  const msg = h('div', { class: 'drill-msg', 'aria-live': 'polite' });
  const choices = h('div', { class: 'drill-choices' });
  const foot = h('div', { class: 'drill-foot' });
  let showBal = false;
  let d, A, step, picks, mistakes, view;


  const tools = h(
    'div',
    { class: 'drill-tools' },
    segmented(
      [
        { value: 'insert', label: 'Insertions' },
        { value: 'remove', label: 'Deletions' },
      ],
      op,
      (v) => ((op = v), next()),
      { label: 'Drill type' },
    ),
    h('span', { class: 'spacer' }),
    toggle('Show balance factors (hint)', false, (v) => {
      showBal = v;
      view.setOption('showBalance', v);
    }),
  );
  card.append(tools, prompt, stage, choices, msg, foot);

  const STEPS = ['z', 'y', 'x', 'case', 'b', 'watch'];

  function frame() {
    const roles = { [d.origin]: d.op === 'insert' ? 'new' : 'path' };
    const tags = {};
    ['z', 'y', 'x'].forEach((r, i) => {
      if (picks[i]) {
        roles[picks[i]] = r;
        tags[picks[i]] = [r];
      }
    });
    return { tree: d.f.tree, roles, tags };
  }

  function next() {
    stage.replaceChildren();
    view = new TreeView(stage, { height: 330, showBalance: showBal, onPick: (id) => onPick(id) });
    d = makeDrill(op);
    A = analyse(d.f.tree);
    step = 0;
    picks = [];
    mistakes = 0;
    foot.replaceChildren();
    choices.replaceChildren();
    msg.textContent = '';
    msg.className = 'drill-msg';
    view.show(frame(), { animate: false });
    ask();
  }

  function ask() {
    const what =
      d.op === 'insert'
        ? `We inserted <b>${d.k}</b> (green) with an ordinary BST insert.`
        : `We removed <b>${d.k}</b> with an ordinary BST delete. Its parent is outlined.`;
    const s = STEPS[step];
    const q = {
      z: `${what} Click ${tag('z')}: the first unbalanced node walking up from there.`,
      y: `Good. Now click ${tag('y')}: z\u2019s taller child.`,
      x: `Now click ${tag('x')}: y\u2019s taller child${d.op === 'remove' ? ' (on a tie, the one on the same side as y)' : ''}.`,
      case: 'Which case is this?',
      b: `Click the node that becomes ${tag('b')}, the new top of this subtree.`,
      watch: '',
    }[s];
    prompt.innerHTML = q;
    choices.replaceChildren();
    if (s === 'case') {
      choices.append(
        ...['LL', 'LR', 'RR', 'RL'].map((k) =>
          h('button', {
            class: 'btn ghost small',
            html: `<b>${k}</b> ${CASES[k].name}`,
            onclick: () => {
              if (k === d.f.meta.kase) {
                good(`Yes: ${CASES[k].name}, so ${CASES[k].rotations}.`);
                advance();
              } else bad(caseHint());
            },
          }),
        ),
      );
    }
    if (s === 'watch') finish();
  }

  function caseHint() {
    const { kase } = d.f.meta;
    return `Look at the path z \u2192 y \u2192 x: y is z\u2019s ${kase[0] === 'L' ? 'left' : 'right'} child, and x is y\u2019s ${kase[1] === 'L' ? 'left' : 'right'} child.`;
  }

  function good(text) {
    msg.className = 'drill-msg ok';
    msg.innerHTML = text;
  }

  function bad(text) {
    mistakes++;
    msg.className = 'drill-msg bad';
    msg.innerHTML = text;
  }

  function advance() {
    step++;
    view.show(frame(), { animate: false });
    ask();
  }

  function onPick(id) {
    const s = STEPS[step];
    const it = A.L.items.get(id);
    if (!it || it.node.kind !== 'node') return;
    const key = it.node.key;
    const bal = fmtBalance(it.bal);
    const { z, y, x, b } = d.f.meta;
    if (s === 'z') {
      if (id === z) return good(`Right: ${key} has balance ${bal}.`), picks.push(id), advance();
      const onPath = (() => {
        for (let n = d.origin; n; n = A.parent.get(n)) if (n === id) return true;
        return false;
      })();
      if (!onPath) return bad(`${key} is not on the path from the change up to the root, so its balance cannot have changed.`);
      if (Math.abs(it.bal) <= 1) return bad(`${key} has balance ${bal}: still balanced. Keep walking ${A.L.items.get(z).depth < it.depth ? 'up' : 'down'}.`);
      return bad(`${key} is unbalanced too (${bal}), but it is not the <em>first</em> one you meet walking up. Look lower.`);
    }
    if (s === 'y') {
      if (id === y) return good(`Right: ${key} is z\u2019s taller child.`), picks.push(id), advance();
      if (A.parent.get(id) !== z) return bad('y is always a child of z.');
      return bad(`${key} is z\u2019s shorter child. Compare the heights of z\u2019s two subtrees.`);
    }
    if (s === 'x') {
      if (id === x) return good(`Right: ${key} is y\u2019s taller child.`), picks.push(id), advance();
      if (A.parent.get(id) !== y) return bad('x is always a child of y (a grandchild of z).');
      const tie = d.op === 'remove' && A.L.items.get(x).h === it.h;
      return bad(tie ? 'y\u2019s children tie in height. On a tie, pick the child on the same side as y, so x, y, z form a straight line.' : `${key} is y\u2019s shorter child.`);
    }
    if (s === 'b') {
      if (id === b) return good(`Right: ${key} is the middle key of x, y, z.`), advance();
      if (![x, y, z].includes(id)) return bad('b is one of x, y, z.');
      return bad('Sort x, y, z by key: b is the middle one.');
    }
  }

  function finish() {
    const perfect = mistakes === 0;
    stats.done++;
    if (perfect) stats.perfect++;
    onScore();
    prompt.innerHTML = perfect ? 'Perfect run. Now watch it happen:' : `Done, with ${mistakes} slip${mistakes > 1 ? 's' : ''}. Watch it happen:`;
    const k = d.frames.indexOf(d.f);
    const watch = h('div');
    stage.replaceChildren(watch);
    const player = new Player(watch, { frames: d.frames.slice(k), view: { height: 330 }, interval: 1900 });
    player.play();
    foot.append(
      h('button', {
        class: 'btn',
        html: `Next drill ${icon.arrow}`,
        onclick: () => {
          next();
        },
      }),
    );
  }

  next();
  return card;
}

export default {
  id: 'practice',
  title: 'Restructure drills',
  group: 'Practice',
  blurb: 'Endless random trees. Find z, y, x, name the case, predict b, then watch it run.',
  quiz: [],
  render(root) {
    root.append(
      p('Each drill is a random AVL tree that was just knocked out of balance by one insertion or deletion. Work through it the way you would on an exam: find z, then y, then x, name the case, and say which node ends up on top. Wrong clicks get a specific hint.'),
    );
    const stats = { done: 0, perfect: 0 };
    const score = h('span', { class: 'drill-score' });
    const update = () => (score.textContent = `${stats.perfect} perfect / ${stats.done} done`);
    update();
    root.append(figure({ title: 'Drill', wide: true, tools: [score] }, drillCard(stats, update)));
  },
};
