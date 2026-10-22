import { h, p } from '../../../shared/ui/dom.js';
import { Player } from '../../../shared/ui/player.js';
import { figure, segmented, callout } from '../../../shared/ui/figure.js';
import { checkpoint } from '../../../shared/ui/quiz.js';
import { Q, analyze, walkthrough, answerChoices, recurrenceHtml, rng, parseNum, CASES } from '../model/master.js';
import { barFrames } from '../model/frames.js';

const D = (a, b, p, k = 0) => ({ form: 'divide', a, b, f: { c: 1, p, k, exp: null, lower: null } });
const section = (html) => h('h2', { class: 'reveal', html });
const m = (html) => `<span class="m">${html}</span>`;
const W = 'n<sup>log<sub>b</sub> a</sup>';

/** Proposition 13.1.22, verbatim; the bracketed note on c is ours. */
export const STATEMENT = {
  setup: `T(n) = aT(n/b) + f(n), constants a \u2265 1 and b > 1.`,
  cases: [
    `if f(n) is O(n<sup>log<sub>b</sub> a \u2212 \u03b5</sup>) for some constant \u03b5 > 0, then T(n) is \u0398(${W}).`,
    `if f(n) is \u0398(${W} log<sup>k</sup> n) for a fixed nonnegative integer k \u2265 0, then T(n) is \u0398(${W} log<sup>k+1</sup> n).`,
    `if f(n) is \u03a9(n<sup>log<sub>b</sub> a + \u03b5</sup>) for some constant \u03b5 > 0, and if a f(n/b) \u2264 c f(n), then T(n) is \u0398(f(n)). <span class="muted">[c is a constant below 1; the inequality only has to hold for large n.]</span>`,
  ],
};

export function theoremCard() {
  return h('div', { class: 'theorem reveal' },
    h('div', { class: 'eyebrow', text: 'Proposition 13.1.22 (the master theorem)' }),
    h('div', { class: 'formula small', html: STATEMENT.setup }),
    h('ol', { class: 'theorem-cases' },
      STATEMENT.cases.map((html, i) => h('li', {}, h('span', { class: `tg tg-case${i + 1}`, text: `case ${i + 1}` }), h('span', { class: 'theorem-text', html })))),
  );
}

/** One worked example per case. */
const EXAMPLES = {
  1: D(8, 2, Q(2)),
  2: D(2, 2, Q(1), 1),
  3: D(2, 2, Q(2)),
};

function stepsHtml(pr) {
  return walkthrough(pr)
    .map((s) => `<li><b>${s.title}.</b> ${s.explain}</li>`)
    .join('');
}

function exampleFigure() {
  let kase = 1;
  let player;
  const host = h('div');
  const steps = h('ol', { class: 'steps' });
  const head = h('div', { class: 'formula small' });
  const load = () => {
    const pr = EXAMPLES[kase];
    head.innerHTML = recurrenceHtml(pr);
    steps.innerHTML = stepsHtml(pr);
    if (player) player.load(barFrames(pr, 4));
  };
  const fig = figure(
    {
      title: 'One worked example per case',
      wide: true,
      tools: [
        segmented([1, 2, 3].map((k) => ({ value: k, label: `Case ${k}` })), kase, (v) => ((kase = v), load()), { label: 'Example' }),
      ],
      note: 'Each bar is the total work of one level of the recursion tree (n = 2<sup>4</sup>, constants dropped). The last step colors the bars by the case. The steps below are the same ones the walkthrough drill asks you to do.',
    },
    head,
    host,
    steps,
  );
  load();
  player = new Player(host, { frames: barFrames(EXAMPLES[kase], 4), view: { height: 300 } });
  return fig;
}

/** Explanation from the model: compare, case, regularity steps (and the conclusion for case 3, whose case step omits it). */
const why = (pr) =>
  walkthrough(pr)
    .filter((s) => ['watershed', 'compare', 'case', 'regularity'].includes(s.id) || (s.id === 'answer' && analyze(pr).case === 3))
    .map((s) => s.explain)
    .join(' ');

const caseQuestion = (id, pr) => ({
  type: 'mcq',
  id,
  prompt: `Which case of Proposition 13.1.22 solves ${m(recurrenceHtml(pr))}?`,
  choices: CASES,
  answer: analyze(pr).case ? analyze(pr).case - 1 : 3,
  explain: () => why(pr),
});

const EPS_PR = D(4, 2, Q(1));
const K_PR = D(4, 2, Q(2), 1);
const kChoices = answerChoices(K_PR, rng(4));

const quiz = [
  caseQuestion('three-cases.nine-thirds', D(9, 3, Q(1))),
  {
    type: 'input',
    id: 'three-cases.eps',
    prompt: `${m(recurrenceHtml(EPS_PR))} is case 1. What is the <b>largest</b> \u03b5 for which f(n) is O(n<sup>log<sub>b</sub> a \u2212 \u03b5</sup>)?`,
    placeholder: '\u03b5',
    accept: (t) => {
      const x = parseNum(t);
      return x != null && Math.abs(x - analyze(EPS_PR).eps) < 1e-9;
    },
    explain: () => {
      const r = analyze(EPS_PR);
      return `log<sub>2</sub> 4 = 2, so the watershed is ${r.watershed}. f(n) = n = n<sup>2 \u2212 1</sup>, so \u03b5 = ${r.epsHtml} works and nothing larger does: n is not O(n<sup>2 \u2212 1.1</sup>) = O(n<sup>0.9</sup>). Any \u03b5 between 0 and ${r.epsHtml} also satisfies the condition; the theorem only needs one. ${r.answer.html.replace('\u0398', 'T(n) is \u0398')}.`;
    },
  },
  {
    type: 'mcq',
    id: 'three-cases.k',
    prompt: `Solve ${m(recurrenceHtml(K_PR))}.`,
    choices: kChoices.choices,
    answer: kChoices.answer,
    explain: () => `${why(K_PR)} The log<sup>k</sup> n in f(n) has k = ${analyze(K_PR).k}, and case 2 returns log<sup>k+1</sup> n: one log more than f(n) has, not the same number.`,
  },
  caseQuestion('three-cases.sqrt', D(2, 4, Q(1, 2))),
  caseQuestion('three-cases.root', D(3, 4, Q(1), 1)),
];

export default {
  id: 'three-cases',
  title: 'The three cases',
  group: 'The theorem',
  blurb: 'Proposition 13.1.22 word for word, what epsilon, k and the regularity condition mean, and one worked example per case.',
  quiz,
  render(root) {
    root.append(
      p(`The recursion tree showed three outcomes: the leaves do most of the work, every level does the same work, or the root does most of the work. The master theorem turns that picture into a test you can run on ${m('f(n)')} alone. This is the statement from the textbook, exactly as you should be able to write it:`),
      theoremCard(),
      p(`In all three cases you compare the same two functions: ${m('f(n)')}, the work at the root, and ${m(W)}, the number of leaves. (${m('a')} children per node, ${m('log<sub>b</sub> n')} levels, so ${m('a<sup>log<sub>b</sub> n</sup> = n<sup>log<sub>b</sub> a</sup>')} leaves.) Call ${m(W)} the <b>watershed</b>. The cases differ only in how ${m('f(n)')} compares with it.`),
    );

    root.append(
      h('div', { class: 'table-wrap reveal' }, h('table', { html: `
        <thead><tr><th>Case</th><th>How f(n) compares with the watershed</th><th>Which part of the tree wins</th><th>T(n) is</th></tr></thead>
        <tbody>
          <tr><td class="nowrap"><span class="tg tg-case1">case 1</span></td><td>polynomially smaller: at most ${m(`${W} / n<sup>\u03b5</sup>`)}</td><td>the leaves</td><td class="nowrap">${m(`\u0398(${W})`)}</td></tr>
          <tr><td class="nowrap"><span class="tg tg-case2">case 2</span></td><td>the same, up to a factor ${m('log<sup>k</sup> n')} with ${m('k \u2265 0')}</td><td>a tie: every level costs about the same</td><td class="nowrap">${m(`\u0398(${W} log<sup>k+1</sup> n)`)}</td></tr>
          <tr><td class="nowrap"><span class="tg tg-case3">case 3</span></td><td>polynomially larger: at least ${m(`${W} \u00b7 n<sup>\u03b5</sup>`)}, and regular</td><td>the root</td><td class="nowrap">${m('\u0398(f(n))')}</td></tr>
        </tbody>` })),
    );

    root.append(section('Case 1: what \u03b5 means'));
    root.append(
      p(`${m('f(n) is O(n<sup>log<sub>b</sub> a \u2212 \u03b5</sup>)')} says f(n) is smaller than the watershed by a factor of ${m('n<sup>\u03b5</sup>')}, for some fixed ${m('\u03b5 > 0')}. It does not matter how small \u03b5 is (0.01 is fine), but it has to be a power of n. That is what <b>polynomially smaller</b> means. A smaller log factor is not enough: ${m('n / log n')} is smaller than ${m('n')}, but ${m('log n')} grows slower than every ${m('n<sup>\u03b5</sup>')}, so ${m('n / log n')} is not ${m('O(n<sup>1 \u2212 \u03b5</sup>)')} for any \u03b5 > 0. That recurrence falls between the cases (see the next chapter).`),
      p(`With a polynomial gap, the level costs grow geometrically from the root down to the leaves, so the bottom level, the ${m(W)} leaves, decides the total: ${m(`T(n) is \u0398(${W})`)}. Example: ${m('T(n) = 8T(n/2) + n<sup>2</sup>')} has watershed ${m('n<sup>3</sup>')}, and ${m('n<sup>2</sup> = n<sup>3 \u2212 1</sup>')}, so \u03b5 = 1.`),
    );

    root.append(section('Case 2: what k means'));
    root.append(
      p(`Here ${m('f(n)')} has the same polynomial part as the watershed and possibly some extra logs: ${m(`f(n) is \u0398(${W} log<sup>k</sup> n)`)}. Then every level of the tree costs about the same, about ${m('f(n)')}, and there are about ${m('log<sub>b</sub> n')} levels. Multiplying by the number of levels adds one log: <b>log<sup>k</sup> n in, log<sup>k+1</sup> n out.</b>`),
      p(`${m('k = 0')} is the plain tie, the one you see most: ${m('f(n) = \u0398(' + W + ')')} gives ${m(`T(n) = \u0398(${W} log n)`)}. Merge sort, ${m('T(n) = 2T(n/2) + n')}, is this case: Θ(n log n). With ${m('k = 1')}, ${m('T(n) = 2T(n/2) + n log n')} is ${m('\u0398(n log<sup>2</sup> n)')}. The textbook requires k to be a nonnegative integer; a negative k (dividing by logs) is not covered.`),
    );

    root.append(section('Case 3: what regularity means'));
    root.append(
      p(`${m('f(n) is \u03a9(n<sup>log<sub>b</sub> a + \u03b5</sup>)')} is the mirror of case 1: f(n) is <b>polynomially larger</b> than the watershed, by at least a factor ${m('n<sup>\u03b5</sup>')}. Case 3 asks for one more thing, the <b>regularity condition</b> ${m('a f(n/b) \u2264 c f(n)')} for some constant ${m('c < 1')} and all large n.`),
      p(`Read it level by level: ${m('f(n)')} is the work at the root, and ${m('a f(n/b)')} is the total work of the level below it (a children, each doing f(n/b)). The condition says <b>the level below costs at most a constant fraction c of this level</b>. Then the level costs shrink geometrically as you go down, ${m('f(n), c f(n), c<sup>2</sup> f(n), \u2026')}, and their sum is at most ${m('f(n) / (1 \u2212 c)')}. The root wins: ${m('T(n) is \u0398(f(n))')}.`),
    );
    root.append(
      callout('key', 'One comparison decides everything', `Compare ${m('f(n)')} with ${m(W)}. <span class="tg tg-case1">smaller by n<sup>\u03b5</sup></span>: the leaves win, ${m(`\u0398(${W})`)}. <span class="tg tg-case2">equal up to log<sup>k</sup> n</span>: add one log. <span class="tg tg-case3">larger by n<sup>\u03b5</sup></span> and regular: the root wins, ${m('\u0398(f(n))')}.`),
    );

    root.append(section('Worked examples'));
    root.append(
      p('Each example below goes through the same steps: read off a, b and f(n), compute log<sub>b</sub> a, compare, pick the case, check regularity if it is case 3, and conclude. Switch between the cases and watch where the level costs pile up.'),
      exampleFigure(),
    );
    root.append(
      callout('warn', 'Classic mistakes', `Comparing f(n) with ${m('n<sup>log<sub>a</sub> b</sup>')} (the log upside down). Calling ${m('T(n) = 2T(n/2) + n log n')} case 3 because n log n is bigger than n: it is bigger only by a log, so it is case 2 with k = 1. Answering ${m(`\u0398(${W} log<sup>k</sup> n)`)} in case 2 and forgetting the extra log.`),
    );

    root.append(checkpoint(quiz, { title: 'Checkpoint' }));
  },
};
