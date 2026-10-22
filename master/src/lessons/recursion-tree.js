import { h, p } from '../../../shared/ui/dom.js';
import { Player } from '../../../shared/ui/player.js';
import { figure, segmented, callout } from '../../../shared/ui/figure.js';
import { checkpoint } from '../../../shared/ui/quiz.js';
import { Q, logInfo, levels, parseNum, recurrenceHtml } from '../model/master.js';
import { treeFrames, levelCost, leafCount } from '../model/frames.js';

const section = (title) => h('h2', { class: 'reveal', html: title });
const poly = (a, b, p, d = 1) => ({ form: 'divide', a, b, f: { c: 1, p: Q(p, d), k: 0, exp: null, lower: null } });
const near = (x, y, tol = 0.01) => x != null && Math.abs(x - y) <= tol;
const lb = (x) => `log<sub>b</sub> ${x}`;
const sup = (s) => `<sup>${s}</sup>`;

const TREES = [
  { id: 'tie', pr: poly(2, 2, 1) },
  { id: 'leaves', pr: poly(4, 2, 1) },
  { id: 'root', pr: poly(2, 2, 2) },
];
const rhs = (pr) => recurrenceHtml(pr).replace('T(n) = ', '');

function treeFigure() {
  let cur = TREES[0];
  let player;
  const host = h('div');
  // Phones get the compact tree (no cost-formula column) so boxes stay legible; captions carry the costs.
  const frames = () => treeFrames(cur.pr, { depth: 3, compact: matchMedia('(max-width: 640px)').matches });
  const fig = figure(
    {
      title: 'Unrolling T(n) = aT(n/b) + f(n)',
      wide: true,
      tools: [segmented(TREES.map((t) => ({ value: t.id, label: rhs(t.pr) })), cur.id, (v) => ((cur = TREES.find((t) => t.id === v)), player.load(frames())), { label: 'Recurrence' })],
      note: 'Each box is one call, labelled with its input size. Right of each level: what the level costs in total, then a bar with that total for n = 8 (bars are drawn to scale within one recurrence). When a level has too many calls to draw, the middle ones are replaced by \u2026 and the count.',
    },
    host,
  );
  player = new Player(host, { frames: frames(), view: { height: 380 }, interval: 2600 });
  return fig;
}

/* The four algorithms of the previous chapter, read as recursion trees. */
const ALGOS = [
  { name: 'Binary search', pr: poly(1, 2, 0) },
  { name: 'Merge sort', pr: poly(2, 2, 1) },
  { name: 'Karatsuba', pr: poly(3, 2, 1) },
  { name: 'Strassen', pr: poly(7, 2, 2) },
];

function algoTable() {
  const rows = ALGOS.map(({ name, pr }) => {
    const e = logInfo(pr.a, pr.b);
    const approx = e.q ? '' : ` \u2248 n${sup(e.value.toFixed(3))}`;
    return `<tr><td><b>${name}</b></td><td class="m">${recurrenceHtml(pr)}</td><td class="m">${pr.a}${sup('i')} calls of size n/${pr.b}${sup('i')}</td><td class="m">log<sub>${pr.b}</sub> n</td><td class="m">${leafCount(pr)}${approx}</td></tr>`;
  });
  return h('div', { class: 'table-wrap reveal' }, h('table', { html: `<thead><tr><th>Algorithm</th><th>Recurrence</th><th>Level i</th><th>Depth</th><th>Leaves n<sup>log<sub>b</sub> a</sup></th></tr></thead><tbody>${rows.join('')}</tbody>` }));
}

/* ---------- checkpoint ---------- */

const QL = poly(9, 3, 1); // leaves n^2
const QD = poly(3, 4, 1); // depth log_4 n
const QC = poly(2, 2, 2); // level 2 costs n^2/4
const QN = poly(3, 2, 1); // level 3: 27 nodes of size n/8

const quiz = [
  {
    type: 'input',
    id: 'recursion-tree.leaves',
    prompt: `The recursion tree of ${recurrenceHtml(QL)} has n${sup('x')} leaves. What is x?`,
    placeholder: 'x = ?',
    accept: (t) => near(parseNum(String(t).replace('\u00b2', '2').replace(/^\s*n\s*\^?\s*/i, '').replace(/[(){}]/g, '')), logInfo(QL.a, QL.b).value),
    explain: `The number of leaves is n${sup(lb('a'))} = n${sup(`log<sub>${QL.b}</sub> ${QL.a}`)} = <b>${leafCount(QL)}</b>, because ${QL.b}${sup(logInfo(QL.a, QL.b).html)} = ${QL.a}. Check with n = 27: the tree has log<sub>3</sub> 27 = 3 levels of splitting, so ${QL.a}${sup(3)} = ${QL.a ** 3} leaves, and 27${sup(2)} = ${27 ** 2}. The f(n) = n part plays no role in counting leaves.`,
  },
  {
    type: 'mcq',
    id: 'recursion-tree.depth',
    prompt: `How many levels of splitting does the recursion tree of ${recurrenceHtml(QD)} have before the subproblems reach size 1?`,
    choices: ['log<sub>3</sub> n', 'log<sub>4</sub> n', 'n/4', 'log<sub>2</sub> n'],
    answer: 1,
    explain: `The sizes go n, n/4, n/4${sup(2)}, \u2026, n/4${sup('i')}, and n/4${sup('i')} = 1 when i = log<sub>4</sub> n. The depth depends only on b = ${QD.b}, how fast the size shrinks. a = ${QD.a} decides how many nodes each level has, not how many levels there are.`,
  },
  {
    type: 'input',
    id: 'recursion-tree.level2',
    prompt: `In the recursion tree of ${recurrenceHtml(QC)}, level 2 costs c\u00b7n${sup(2)} in total. What is c?`,
    placeholder: 'c = ?',
    accept: (t) => near(parseNum(t), levels(QC, 3)[2].total / 8 ** 2, 1e-6),
    explain: `Level 2 has ${QC.a}${sup(2)} = ${QC.a ** 2} calls of size n/${QC.b ** 2}, so it costs <b>${levelCost(QC, 2)}</b>: c = 1/4. Each level costs half the one above (n${sup(2)}, n${sup(2)}/2, n${sup(2)}/4, \u2026), so the root does the most work.`,
  },
  {
    type: 'mcq',
    id: 'recursion-tree.nodes',
    prompt: `What is on level 3 of the recursion tree of ${recurrenceHtml(QN)}?`,
    choices: ['8 calls of size n/27', '9 calls of size n/8', '27 calls of size n/8', '27 calls of size n/6'],
    answer: 2,
    explain: `Every call makes ${QN.a} calls, so level 3 has ${QN.a}${sup(3)} = ${levels(QN, 3)[3].nodes} of them. Every call halves the size, so they have size n/${QN.b}${sup(3)} = n/${QN.b ** 3}. The level costs ${levelCost(QN, 3)}. (Sizes shrink by b per level, multiplied: n/2/2/2, not n/(2+2+2).)`,
  },
];

export default {
  id: 'recursion-tree',
  title: 'The recursion tree',
  group: 'Intuition',
  blurb: 'Unroll the recurrence into a tree: level i costs a^i f(n/b^i), and there are n^(log_b a) leaves.',
  quiz,
  render(root) {
    root.append(
      p('Run a divide-and-conquer algorithm on an input of size n and record every call. The first call (the root) makes a calls on inputs of size n/b, each of those makes a calls on inputs of size n/b<sup>2</sup>, and so on until the inputs have size 1. That picture is the <b>recursion tree</b>. T(n) is the total work of all its nodes, where each node does f of its own size.'),
      p('Step through it. Each step adds one level and writes down what that level costs in total.'),
    );
    root.append(treeFigure());

    root.append(section('Counting level by level'));
    root.append(
      h('ol', { class: 'steps reveal', html: `
        <li><b>Level 0</b> is the root: one call of size n, costing f(n).</li>
        <li><b>Level i</b> has a<sup>i</sup> nodes, because every node has a children. Each has size n/b<sup>i</sup>, because every step divides the size by b. So level i costs <b>a<sup>i</sup> f(n/b<sup>i</sup>)</b>.</li>
        <li><b>The depth</b>: the size n/b<sup>i</sup> reaches 1 when i = <b>log<sub>b</sub> n</b>. The levels are 0, 1, \u2026, log<sub>b</sub> n.</li>
        <li><b>The leaves</b> are the a<sup>log<sub>b</sub> n</sup> calls on level log<sub>b</sub> n. Each costs T(1), a constant.</li>` }),
    );
    root.append(
      p('a<sup>log<sub>b</sub> n</sup> is an awkward expression, with n in the exponent. It can be rewritten with n in the base, which is easier to compare with f(n):'),
      h('div', { class: 'formula', html: `a${sup(lb('n'))} = (b${sup(lb('a'))})${sup(lb('n'))} = b${sup(`${lb('a')} \u00b7 ${lb('n')}`)} = (b${sup(lb('n'))})${sup(lb('a'))} = n${sup(lb('a'))}` }),
      h('ol', { class: 'steps reveal', html: `
        <li>Write a as a power of b: a = b<sup>log<sub>b</sub> a</sup> (that is what log<sub>b</sub> a means).</li>
        <li>A power of a power multiplies the exponents, and multiplication does not care about order: log<sub>b</sub> a \u00b7 log<sub>b</sub> n = log<sub>b</sub> n \u00b7 log<sub>b</sub> a.</li>
        <li>Group the other way and use b<sup>log<sub>b</sub> n</sup> = n.</li>` }),
      p(`For example, 8T(n/2) + \u2026 with n = 16: the tree has log<sub>2</sub> 16 = 4 levels of splitting, so 8<sup>4</sup> = ${8 ** 4} leaves, and indeed n<sup>log<sub>2</sub> 8</sup> = 16<sup>3</sup> = ${16 ** 3}.`),
    );
    root.append(
      callout('key', 'n^(log_b a) is the number of leaves', `The recursion tree has <b>n<sup>log<sub>b</sub> a</sup></b> leaves. This is the quantity every case of the master theorem compares f(n) against: f(n) is the work at the root, n<sup>log<sub>b</sub> a</sup> the work at the leaves.`),
    );
    root.append(
      p('Adding up all the levels gives T(n) exactly, as a sum:'),
      h('div', { class: 'formula', html: `T(n) = \u03a3<sub>i = 0</sub><sup>log<sub>b</sub> n \u2212 1</sup> a<sup>i</sup> f(n/b<sup>i</sup>) + \u0398(n<sup>log<sub>b</sub> a</sup>)` }),
      p('The first part is the work of the internal levels, the second the leaves. The master theorem is a shortcut for this sum: it tells you which of its terms dominate.'),
    );

    root.append(section('The four algorithms as trees'));
    root.append(p('The same counting for the algorithms from the previous chapter. All four have b = 2, so all four trees have depth log<sub>2</sub> n; they differ in how fast they branch.'));
    root.append(algoTable());
    root.append(
      callout('warn', 'The tree does not have n leaves', 'It has n<sup>log<sub>b</sub> a</sup>, which equals n only when a = b (merge sort). Binary search\u2019s tree is a single path with one leaf; Strassen\u2019s has n<sup>log<sub>2</sub> 7</sup> \u2248 n<sup>2.807</sup>, far more than n.'),
    );

    root.append(checkpoint(quiz));
  },
};
