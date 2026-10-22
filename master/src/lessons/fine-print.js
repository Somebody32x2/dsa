import { h, p } from '../../../shared/ui/dom.js';
import { figure, segmented, callout } from '../../../shared/ui/figure.js';
import { checkpoint } from '../../../shared/ui/quiz.js';
import { Q, analyze, walkthrough, answerChoices, recurrenceHtml, levels, generate, rng, parseNum, fCoreHtml, qstr } from '../model/master.js';

const D = (a, b, p, k = 0, c = 1, lower = null) => ({ form: 'divide', a, b, f: { c, p, k, exp: null, lower } });
const section = (html) => h('h2', { class: 'reveal', html });
const m = (html) => `<span class="m">${html}</span>`;
const W = 'n<sup>log<sub>b</sub> a</sup>';

/** A generated non-example whose recurrence contains `needle` (the generator owns these problems). */
function other(needle) {
  for (let s = 1; s < 5000; s++) {
    const pr = generate(rng(s), { cases: ['none'] });
    if (pr.form === 'other' && pr.html.includes(needle)) return pr;
  }
  throw new Error(`no generated problem matches ${needle}`);
}

const GAP = D(2, 2, Q(1), -1);
const SMALL_A = D(0.5, 2, Q(1));
const VAR_A = other('nT(n/2) + n');
const SUBTRACT = other('T(n \u2212 1) + n');
const NEGATIVE = other('\u2212 n<sup>2</sup> log n');
const DRESSED = D(4, 2, Q(2), 0, 3, '+ n');
const REG_EXAMPLES = [D(2, 2, Q(2)), D(3, 2, Q(2)), D(7, 2, Q(3)), D(3, 4, Q(1), 1)];

function nonExamples() {
  const rows = [
    ['a < 1', SMALL_A],
    ['a is not a constant', VAR_A],
    ['not n/b', SUBTRACT],
    ['negative f(n)', NEGATIVE],
    ['between the cases', GAP],
  ];
  return h('div', { class: 'table-wrap reveal' }, h('table', { html: `
    <thead><tr><th>Problem</th><th>Recurrence</th><th>Why the theorem does not apply</th></tr></thead>
    <tbody>${rows.map(([name, pr]) => `<tr><td class="nowrap"><span class="tg tg-none">${name}</span></td><td class="nowrap">${m(recurrenceHtml(pr))}</td><td>${analyze(pr).reason}</td></tr>`).join('')}</tbody>` }));
}

const fmt = (x) => (Number.isInteger(x) ? String(x) : x.toFixed(2));

function gapTable() {
  const depth = 6;
  const rows = levels(GAP, depth);
  const n = rows[0].size;
  const sum = rows.reduce((s, r) => s + r.total, 0);
  return figure(
    {
      title: `${m(recurrenceHtml(GAP))} with n = 2<sup>${depth}</sup> = ${n}`,
      note: `Per-level work from the recursion tree (log base 2, constants dropped). Level i costs n / log(n/2<sup>i</sup>) = n / (${depth} \u2212 i): n/${depth}, n/${depth - 1}, \u2026, n/1. The total is about n(1 + 1/2 + \u2026 + 1/log n) plus n for the leaves, and that harmonic sum is about ln log n.`,
    },
    h('div', { class: 'table-wrap' }, h('table', { html: `
      <thead><tr><th>Level</th><th>Nodes</th><th>Size</th><th>Cost per node</th><th>Level total</th></tr></thead>
      <tbody>${rows.map((r) => `<tr><td>${r.leaf ? 'leaves' : r.level}</td><td>${r.nodes}</td><td>${r.size}</td><td>${fmt(r.each)}</td><td>${fmt(r.total)}${r.leaf ? '' : ` = ${n}/${fmt(n / r.total)}`}</td></tr>`).join('')}
        <tr><td colspan="4"><b>Sum</b></td><td><b>${fmt(sum)}</b></td></tr></tbody>` })),
  );
}

function regularityFigure() {
  let i = 0;
  const out = h('div', { class: 'reg-out' });
  const show = () => {
    const pr = REG_EXAMPLES[i];
    const r = analyze(pr);
    out.innerHTML = `
      <div class="formula small">${recurrenceHtml(pr)}</div>
      <ol class="steps">
        <li><b>Watershed.</b> log<sub>${pr.b}</sub> ${pr.a} ${r.e.q ? `= ${qstr(r.e.q)}` : `\u2248 ${r.e.value.toFixed(3)}`}, so ${m(W)} = ${m(r.watershed)}, and f(n) = ${m(fCoreHtml(pr.f))} is larger by n<sup>${r.epsShort}</sup> or more.</li>
        <li><b>Regularity.</b> ${r.reg.workHtml}.</li>
        <li><b>Result.</b> c = ${r.reg.cHtml} < 1, so case 3 applies: T(n) is ${r.answer.html}.</li>
      </ol>`;
  };
  const fig = figure(
    {
      title: 'The regularity check, computed',
      tools: [segmented(REG_EXAMPLES.map((pr, j) => ({ value: j, label: recurrenceHtml(pr).replace('T(n) = ', '') })), i, (v) => ((i = v), show()), { label: 'Recurrence' })],
      note: 'In every case-3 recurrence with f(n) = n<sup>p</sup> log<sup>k</sup> n and k \u2265 0, c comes out as a/b<sup>p</sup>, and it is below 1 for the same reason the case is case 3.',
    },
    out,
  );
  show();
  return fig;
}

const trap = (id, pr, seed, lead) => {
  const ch = answerChoices(pr, rng(seed));
  return {
    type: 'mcq',
    id,
    prompt: `${lead}Solve ${m(recurrenceHtml(pr))} with the master theorem.`,
    choices: ch.choices,
    answer: ch.answer,
    explain: () => {
      const r = analyze(pr);
      return r.applies ? walkthrough(pr).map((s) => s.explain).join(' ') : `${r.reason} So the answer is: the master theorem does not apply.`;
    },
  };
};

const REG_Q = D(3, 2, Q(2));

const quiz = [
  trap('fine-print.gap', GAP, 7, ''),
  trap('fine-print.var-a', VAR_A, 7, ''),
  {
    type: 'input',
    id: 'fine-print.reg-c',
    prompt: `${m(recurrenceHtml(REG_Q))} is case 3. Write a f(n/b) as c \u00b7 f(n). What is c?`,
    placeholder: 'c',
    accept: (t) => {
      const x = parseNum(t);
      return x != null && Math.abs(x - analyze(REG_Q).reg.ratio) < 1e-9;
    },
    explain: () => {
      const r = analyze(REG_Q);
      return `${r.reg.workHtml}. So c = ${r.reg.cHtml}, which is < 1: each level costs at most ${r.reg.cHtml} of the level above it, and T(n) is ${r.answer.html}.`;
    },
  },
  trap('fine-print.dressed', DRESSED, 3, 'Constants and lower-order terms included. '),
];

export default {
  id: 'fine-print',
  title: 'The fine print',
  group: 'The theorem',
  blurb: 'When the theorem does not apply, why regularity holds for polynomial f, and which details (constants, lower-order terms, floors) you can ignore.',
  quiz,
  render(root) {
    root.append(
      p(`The theorem only speaks about recurrences of the form ${m('T(n) = aT(n/b) + f(n)')} with constants ${m('a \u2265 1')} and ${m('b > 1')}, and only when f(n) falls into one of the three cases. Exams like to test exactly the edges. Check these before you compute anything.`),
    );

    root.append(section('When it does not apply'));
    root.append(nonExamples());
    root.append(
      p(`The first four fail the <b>form</b>. ${m('a < 1')} means less than one subproblem per call; ${m('a = n')} changes from level to level, so there is no single watershed ${m(W)}; ${m('T(n \u2212 1)')} shrinks the input by subtracting, so the tree has n levels instead of ${m('log<sub>b</sub> n')}; and a negative f(n) is not a cost. Unequal splits such as ${m('T(n) = T(n/3) + T(2n/3) + n')} are not of the form either (there is no single b), so they also need a recursion tree.`),
    );

    root.append(section('The gap between the cases'));
    root.append(
      p(`The last row has the right form, and still no case fits. With ${m('a = b = 2')} the watershed is n, and ${m('f(n) = n / log n')} is smaller than n, but only by a log. Case 1 needs a polynomial gap (${m('n<sup>\u03b5</sup>')}), and case 2 needs ${m('log<sup>k</sup> n')} with ${m('k \u2265 0')}; here it is ${m('k = \u22121')}. The cases do not cover every f(n): there are gaps between them, and ${m(`${W} / log n`)} lives in one.`),
      gapTable(),
      p(`So the recursion tree gives ${m('T(n) = \u0398(n log log n)')} for ${m('2T(n/2) + n / log n')}: more than case 1\u2019s \u0398(n), less than case 2\u2019s \u0398(n log n). Neither answer from the theorem is right, which is why the correct exam answer is <b>the master theorem does not apply</b>.`),
    );
    root.append(
      callout('warn', 'Smaller is not enough', `\u201cf(n) is smaller than ${W}\u201d is not case 1. It has to be smaller by a factor ${m('n<sup>\u03b5</sup>')}. The same holds on the other side: ${m('n log n')} is larger than n, but not polynomially, so ${m('2T(n/2) + n log n')} is case 2 (k = 1), not case 3.`),
    );

    root.append(section('Regularity: why you rarely have to worry'));
    root.append(
      p(`For the functions you meet in practice, ${m('f(n) = n<sup>p</sup> log<sup>k</sup> n')} with ${m('p > log<sub>b</sub> a')} and ${m('k \u2265 0')}, the regularity condition always holds. The computation is one line:`),
      h('div', { class: 'formula small', html: 'a f(n/b) = a (n/b)<sup>p</sup> log<sup>k</sup>(n/b) \u2264 (a / b<sup>p</sup>) \u00b7 n<sup>p</sup> log<sup>k</sup> n = (a / b<sup>p</sup>) \u00b7 f(n)' }),
      p(`using ${m('log(n/b) \u2264 log n')}. So ${m('c = a / b<sup>p</sup>')}. And ${m('p > log<sub>b</sub> a')} is the same statement as ${m('b<sup>p</sup> > a')}, so ${m('c < 1')} automatically. Being in case 3 already gives you regularity; still write the line out on an exam, because the theorem asks for it.`),
      regularityFigure(),
    );
    root.append(
      callout('note', 'When regularity fails', `It takes an f(n) that oscillates. A classic example is ${m('T(n) = T(n/2) + n(2 \u2212 cos n)')}: f(n) is \u03a9(n<sup>0 + 1</sup>), but f(n/2) can be close to 3n/2 while f(n) is close to n, so no c < 1 works and case 3 cannot be used.`),
    );

    root.append(section('What you may ignore'));
    root.append(
      p(`<b>Constants and lower-order terms in f(n).</b> The cases are stated with O, \u0398 and \u03a9, so only the growth of f(n) matters. In ${m(recurrenceHtml(DRESSED))}, f(n) is \u0398(${fCoreHtml(DRESSED.f)}), the same as the watershed ${m(analyze(DRESSED).watershed)}: case 2 with k = 0, so T(n) is ${analyze(DRESSED).answer.html}. The 3 and the + n change nothing. In case 3 the answer \u0398(f(n)) is also just the growth: ${m('2T(n/2) + 5n<sup>2</sup> + n')} is \u0398(n<sup>2</sup>).`),
      p(`<b>Floors and ceilings.</b> Real algorithms split into ${m('\u230an/2\u230b')} and ${m('\u2308n/2\u2309')}. The theorem still holds for ${m('T(n) = aT(\u230an/b\u230b) + f(n)')} or ${m('aT(\u2308n/b\u2309) + f(n)')}, so merge sort\u2019s ${m('T(n) = T(\u230an/2\u230b) + T(\u2308n/2\u2309) + n')} is treated as ${m('2T(n/2) + n')}: \u0398(n log n).`),
      p(`<b>The base case.</b> T(1) (or any constant base case) only scales the leaf cost by a constant, so it never changes the \u0398 answer.`),
    );

    root.append(checkpoint(quiz, { title: 'Checkpoint' }));
  },
};
