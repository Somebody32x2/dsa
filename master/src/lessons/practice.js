import { h, p } from '../../../shared/ui/dom.js';
import { checkpoint } from '../../../shared/ui/quiz.js';
import { Q, NONE, analyze, answerOf, recurrenceHtml, walkthrough } from '../model/master.js';
import { practice, walkthroughCard, whyLine } from '../ui/practice.js';

const poly = (a, b, p, k = 0) => ({ form: 'divide', a, b, f: { c: 1, p, k, exp: null, lower: null } });
const m = (pr) => `<span class="m">${recurrenceHtml(pr)}</span>`;

/** The classic slips, each with an example and the walkthrough step that catches it. */
const MISTAKES = [
  {
    name: 'Flipping log<sub>b</sub> a into log<sub>a</sub> b',
    pr: poly(8, 2, Q(2)),
    step: 'watershed',
    text: (pr) =>
      `The base of the log is b, the factor the size shrinks by; a, the number of calls, goes inside. For ${m(pr)}, log<sub>2</sub> 8 = 3, so the leaves cost n<sup>3</sup>. The flipped log<sub>8</sub> 2 = 1/3 would make n<sup>2</sup> look polynomially larger and send you to case 3 with the wrong answer \u0398(n<sup>2</sup>); the right answer is ${analyze(pr).answer.html}.`,
  },
  {
    name: 'Forgetting the +1 on k',
    pr: poly(2, 2, Q(1), 1),
    step: 'case',
    text: (pr) =>
      `Case 2 multiplies f(n) by one more log n, because each of the about log n levels costs \u0398(f(n)). For ${m(pr)}, f(n) = n log n is n<sup>log<sub>b</sub> a</sup> log<sup>k</sup> n with k = 1, so T(n) is ${analyze(pr).answer.html}, not \u0398(n log n).`,
  },
  {
    name: 'Calling a log factor polynomial',
    pr: poly(2, 2, Q(1), -1),
    step: 'compare',
    text: (pr) =>
      `log n grows slower than every n<sup>\u03b5</sup>, so a log factor alone never makes f(n) polynomially smaller or larger. For ${m(pr)}, f(n) = n / log n is below n only by a log: that is not case 1, and k = \u22121 is not case 2. The theorem does not apply.`,
  },
  {
    name: 'Skipping the regularity condition',
    pr: poly(3, 4, Q(1), 1),
    step: 'regularity',
    text: (pr) =>
      `Case 3 has a second condition: a f(n/b) \u2264 c f(n) for a constant c < 1, so the work shrinks by a constant factor on the way down. For ${m(pr)}, a f(n/b) = 3(n/4) log(n/4) \u2264 (3/4) n log n, so c = ${analyze(pr).reg.cHtml} works and T(n) is ${analyze(pr).answer.html}. For f(n) = n<sup>p</sup> log<sup>k</sup> n it always holds, but it is part of the theorem: state it, and for an f(n) that oscillates it can fail.`,
  },
];

function mistakeItem({ name, pr, step, text }) {
  const title = walkthrough(pr).find((s) => s.id === step).title;
  const label = `Show the step that catches it: <b>${title}</b>`;
  let card = null;
  const btn = h('button', {
    class: 'btn ghost small',
    html: label,
    'aria-expanded': 'false',
    onclick: () => {
      if (card) {
        card.remove();
        card = null;
        btn.innerHTML = label;
        btn.setAttribute('aria-expanded', 'false');
        return;
      }
      card = walkthroughCard(pr, { interactive: false, focus: step });
      li.append(card);
      btn.textContent = 'Hide the solution';
      btn.setAttribute('aria-expanded', 'true');
      card.querySelector('.focus')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    },
  });
  const li = h('li', {}, h('b', { html: name }), '. ', h('span', { html: text(pr) }), h('div', {}, btn));
  return li;
}

/* ---------- checkpoint (answers computed by the model) ---------- */

const mcqFrom = (id, pr, prompt, keys, explain) => {
  const res = analyze(pr);
  const answers = keys.map((g) => (g === NONE ? NONE : answerOf(g)));
  return { type: 'mcq', id, prompt, choices: answers.map((x) => x.html), answer: answers.findIndex((x) => x.key === res.answer.key), explain };
};

const flipPr = poly(9, 3, Q(1));
const plusPr = poly(4, 2, Q(2), 1);
const gapPr = poly(4, 2, Q(2), -1);
const flipChoices = ['\u221an', 'n<sup>3</sup>', 'n<sup>2</sup>', 'n'];

const quiz = [
  {
    type: 'mcq',
    id: 'practice.flip',
    prompt: `${m(flipPr)}. What is n<sup>log<sub>b</sub> a</sup>?`,
    choices: flipChoices,
    answer: flipChoices.indexOf(analyze(flipPr).watershed),
    explain: `a = 9 and b = 3, so log<sub>3</sub> 9 = 2 because 3<sup>2</sup> = 9: n<sup>log<sub>b</sub> a</sup> = ${analyze(flipPr).watershed}. \u221an is n<sup>log<sub>9</sub> 3</sup>, the flipped log. ${whyLine(flipPr, analyze(flipPr))}`,
  },
  mcqFrom(
    'practice.plus-one',
    plusPr,
    `Solve ${m(plusPr)}.`,
    [{ p: Q(2), k: 1 }, { p: Q(2), k: 2 }, { p: Q(2), k: 0 }, NONE],
    `log<sub>2</sub> 4 = 2, and f(n) = n<sup>2</sup> log n is n<sup>2</sup> log<sup>k</sup> n with k = 1: case 2. The answer has log<sup>k+1</sup> n = log<sup>2</sup> n, so T(n) is ${analyze(plusPr).answer.html}. \u0398(n<sup>2</sup> log n) forgets the +1.`,
  ),
  mcqFrom(
    'practice.log-gap',
    gapPr,
    `Solve ${m(gapPr)}.`,
    [{ p: Q(2), k: 0 }, { p: Q(2), k: 1 }, { p: Q(2), k: -1 }, NONE],
    `${analyze(gapPr).reason} \u0398(n<sup>2</sup>) would be case 1, which needs f(n) to be smaller by a polynomial factor n<sup>\u03b5</sup>; a log is not one.`,
  ),
  {
    type: 'mcq',
    id: 'practice.regularity',
    prompt: 'In which case of the theorem must you also check a f(n/b) \u2264 c f(n) for a constant c < 1?',
    choices: ['Case 1', 'Case 2', 'Case 3', 'All three'],
    answer: 2,
    explain:
      'Only case 3. There the answer is \u0398(f(n)), which is right only if the root really dominates: the work must shrink by a constant factor c < 1 from each level to the next. Cases 1 and 2 have no extra condition.',
  },
];

export default {
  id: 'practice',
  title: 'Practice',
  group: 'Practice',
  blurb: 'Generated problems for every case. A wrong answer starts a guided walkthrough that marks the step where your reasoning broke.',
  quiz,
  render(root) {
    root.append(
      p(
        'Every problem below is generated from a seed (the <b>Problem #</b> in the corner), with answer choices built from the real mistakes: the case 1 answer when it is case 3, a missing log, a flipped log<sub>b</sub> a. Pick an answer (keys <b>1</b> to <b>5</b>) and check it (<b>Enter</b>). A right answer gets the one-line reason; open the full solution if you guessed. A wrong answer starts a walkthrough of the same steps you would write on an exam: read off a and b, compute log<sub>b</sub> a, compare, pick the case, check regularity. Each step asks you first, and the steps you get wrong stay marked in red. Use the chips to drill only the cases you find hard, and turn on fractions, logs and coefficients once the plain problems are easy.',
      ),
      practice(),
      h('h2', { text: 'Four mistakes the walkthrough catches' }),
      p('Most wrong answers come from one of these. Each has its own step in the walkthrough; open it to see the step that would have caught it.'),
      h('ol', { class: 'steps mistakes' }, MISTAKES.map(mistakeItem)),
      checkpoint(quiz, { title: 'Checkpoint: the four mistakes' }),
    );
  },
};
