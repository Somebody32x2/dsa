import { h, p } from '../../../shared/ui/dom.js';
import { figure, segmented, callout } from '../../../shared/ui/figure.js';
import { checkpoint } from '../../../shared/ui/quiz.js';
import { Q, analyze, recurrenceHtml, fHtml } from '../model/master.js';

const section = (title) => h('h2', { class: 'reveal', html: title });
const poly = (a, b, p, d = 1) => ({ form: 'divide', a, b, f: { c: 1, p: Q(p, d), k: 0, exp: null, lower: null } });

/* Inline tags for the three parts of a recurrence (code marks use the same colors). */
const A = '<span class="tg tg-part-a">a</span>';
const B = '<span class="tg tg-part-b">b</span>';
const F = '<span class="tg tg-part-f">f(n)</span>';
const kw = (s) => `<span class="kw">${s}</span>`;
const cm = (s) => `<span class="cm">${s}</span>`;
const mb = (s) => `<span class="mk-b">${s}</span>`;

/**
 * Each algorithm: its recurrence (a model problem) and its code, line by line.
 * A line is [mark, html]: mark 'a' = a recursive call (counts toward a), 'f' = work outside the calls.
 * mb(...) marks the argument that shows the subproblem size n/b.
 */
const ALGOS = [
  {
    id: 'bs',
    label: 'Binary search',
    pr: poly(1, 2, 0),
    lines: [
      ['', `${kw('Algorithm')} BinarySearch(A, x, lo, hi):`],
      ['', `  ${cm('Input: sorted A[lo..hi] of n elements')}`],
      ['f', `  ${kw('if')} lo > hi ${kw('then return')} \u201cnot found\u201d`],
      ['f', `  mid \u2190 \u230a(lo + hi) / 2\u230b`],
      ['f', `  ${kw('if')} x = A[mid] ${kw('then return')} mid`],
      ['', `  ${kw('if')} x < A[mid] ${kw('then')}`],
      ['a', `    ${kw('return')} BinarySearch(A, x, ${mb('lo, mid \u2212 1')})`],
      ['', `  ${kw('else')}`],
      ['a', `    ${kw('return')} BinarySearch(A, x, ${mb('mid + 1, hi')})`],
    ],
    parts: {
      a: '<b>a = 1.</b> Two calls are written, but every run takes only one branch: one recursive call per call.',
      b: '<b>b = 2.</b> The call searches lo..mid \u2212 1 or mid + 1..hi: at most half of the n elements.',
      f: '<b>f(n) = 1.</b> Computing mid and one or two comparisons: constant work, whatever n is.',
    },
  },
  {
    id: 'ms',
    label: 'Merge sort',
    pr: poly(2, 2, 1),
    lines: [
      ['', `${kw('Algorithm')} MergeSort(S):`],
      ['', `  ${cm('Input: a sequence S of n elements')}`],
      ['', `  ${kw('if')} n \u2264 1 ${kw('then return')} S`],
      ['f', `  divide S into S1 and S2, ${mb('n/2')} elements each`],
      ['a', `  S1 \u2190 MergeSort(S1)`],
      ['a', `  S2 \u2190 MergeSort(S2)`],
      ['', `  ${cm('merge: one pass over both halves')}`],
      ['f', `  ${kw('return')} merge(S1, S2)`],
    ],
    parts: {
      a: '<b>a = 2.</b> Both halves are sorted, so both calls run.',
      b: '<b>b = 2.</b> Each call gets half of the elements.',
      f: '<b>f(n) = n.</b> Dividing and merging touch each element a constant number of times: \u0398(n).',
    },
  },
  {
    id: 'ka',
    label: 'Karatsuba',
    pr: poly(3, 2, 1),
    lines: [
      ['', `${kw('Algorithm')} Karatsuba(x, y):`],
      ['', `  ${cm('Input: two n-digit integers x and y')}`],
      ['', `  ${kw('if')} n = 1 ${kw('then return')} x \u00b7 y`],
      ['', `  ${cm('x1, x0, y1, y0 have')} ${mb('n/2')} ${cm('digits each')}`],
      ['f', `  split x = x1\u00b710<sup>n/2</sup> + x0, y = y1\u00b710<sup>n/2</sup> + y0`],
      ['a', `  p \u2190 Karatsuba(x1, y1)`],
      ['a', `  q \u2190 Karatsuba(x0, y0)`],
      ['a', `  r \u2190 Karatsuba(x1 + x0, y1 + y0)`],
      ['f', `  ${kw('return')} p\u00b710<sup>n</sup> + (r \u2212 p \u2212 q)\u00b710<sup>n/2</sup> + q`],
    ],
    parts: {
      a: '<b>a = 3.</b> The schoolbook split needs four products (x1y1, x1y0, x0y1, x0y0); Karatsuba gets the middle two from one product r.',
      b: '<b>b = 2.</b> Each product is of numbers with n/2 digits. (x1 + x0 may have one extra digit; that does not change the answer.)',
      f: '<b>f(n) = n.</b> Splitting, adding, subtracting and shifting n-digit numbers: \u0398(n) digit operations.',
    },
  },
  {
    id: 'st',
    label: 'Strassen',
    pr: poly(7, 2, 2),
    lines: [
      ['', `${kw('Algorithm')} Strassen(A, B):`],
      ['', `  ${cm('Input: n \u00d7 n matrices, n a power of 2')}`],
      ['', `  ${kw('if')} n = 1 ${kw('then return')} A \u00b7 B`],
      ['f', `  split A, B into ${mb('(n/2) \u00d7 (n/2)')} blocks`],
      ['a', `  M1 \u2190 Strassen(A11 + A22, B11 + B22)`],
      ['a', `  M2 \u2190 Strassen(A21 + A22, B11)`],
      ['a', `  M3 \u2190 Strassen(A11, B12 \u2212 B22)`],
      ['a', `  M4 \u2190 Strassen(A22, B21 \u2212 B11)`],
      ['a', `  M5 \u2190 Strassen(A11 + A12, B22)`],
      ['a', `  M6 \u2190 Strassen(A21 \u2212 A11, B11 + B12)`],
      ['a', `  M7 \u2190 Strassen(A12 \u2212 A22, B21 + B22)`],
      ['f', `  C11 \u2190 M1 + M4 \u2212 M5 + M7`],
      ['f', `  C12 \u2190 M3 + M5`],
      ['f', `  C21 \u2190 M2 + M4`],
      ['f', `  C22 \u2190 M1 \u2212 M2 + M3 + M6`],
      ['', `  ${kw('return')} C`],
    ],
    parts: {
      a: '<b>a = 7.</b> Seven block products. Multiplying the blocks the schoolbook way would take eight.',
      b: '<b>b = 2.</b> Each block has dimension n/2. Here n is the side length, not the number of entries.',
      f: '<b>f(n) = n<sup>2</sup>.</b> 18 additions and subtractions of (n/2) \u00d7 (n/2) blocks: 18\u00b7n<sup>2</sup>/4 = \u0398(n<sup>2</sup>).',
    },
  },
];

function codeHtml(lines) {
  return lines.map(([mark, html]) => `<span class="ln${mark ? ` mk-${mark}` : ''}">${html || ' '}</span>`).join('');
}

function algoFigure() {
  let cur = ALGOS[1];
  const code = h('pre', { class: 'code rec-code' });
  const side = h('div', { class: 'rec-side' });
  const draw = () => {
    code.innerHTML = codeHtml(cur.lines);
    const res = analyze(cur.pr);
    side.replaceChildren(
      h('div', { class: 'eyebrow', text: 'Its recurrence' }),
      h('div', { class: 'formula small', html: recurrenceHtml(cur.pr) }),
      h('dl', { class: 'rec-parts', html: `<dt>${A}</dt><dd>${cur.parts.a}</dd><dt>${B}</dt><dd>${cur.parts.b}</dd><dt>${F}</dt><dd>${cur.parts.f}</dd>` }),
      h('p', { class: 'muted rec-later', html: `Solved later with the master theorem: T(n) is ${res.answer.html}.` }),
    );
  };
  draw();
  return figure(
    {
      title: 'Four algorithms, one shape',
      wide: true,
      tools: [segmented(ALGOS.map((x) => ({ value: x.id, label: x.label })), cur.id, (v) => ((cur = ALGOS.find((x) => x.id === v)), draw()), { label: 'Algorithm' })],
      note: `Shaded lines: ${A} lines are the recursive calls (count how many run per call), ${F} lines are the work done outside them. The underlined argument shows the subproblem size n/${B}.`,
    },
    h('div', { class: 'rec-split' }, code, side),
  );
}

/* ---------- checkpoint ---------- */

const Q1 = poly(2, 3, 1);
// The right recurrence sits at index 2 among the usual misreadings (a and b swapped, f dropped, one call, a = b).
const Q1_CHOICES = [poly(3, 2, 1), poly(2, 3, 0), Q1, poly(1, 3, 1), poly(3, 3, 1)];

const quiz = [
  {
    type: 'mcq',
    id: 'recurrences.read',
    prompt: `Which recurrence describes this algorithm?<pre class="code">${kw('Algorithm')} Mystery(A):
  ${cm('Input: an array A of n numbers')}
  ${kw('if')} n \u2264 1 ${kw('then return')} A[0]
  s \u2190 0
  ${kw('for')} i \u2190 0 ${kw('to')} n \u2212 1 ${kw('do')} s \u2190 s + A[i]
  ${kw('return')} s + Mystery(first n/3 of A) + Mystery(last n/3 of A)</pre>`,
    choices: Q1_CHOICES.map(recurrenceHtml),
    answer: Q1_CHOICES.indexOf(Q1),
    explain: `Two recursive calls run per call, so a = 2. Each gets a third of the array, so b = 3: a and b need not be equal (the middle third is simply never recursed on). The loop is the work outside the calls, n additions, so f(n) = ${fHtml(Q1.f)}. Together: ${recurrenceHtml(Q1)}.`,
  },
  {
    type: 'input',
    id: 'recurrences.a',
    prompt: `What is <b>a</b> in this algorithm\u2019s recurrence?<pre class="code">${kw('Algorithm')} Visit(P):
  ${cm('Input: a piece P of size n')}
  ${kw('if')} n \u2264 1 ${kw('then return')}
  ${kw('for')} j \u2190 1 ${kw('to')} 5 ${kw('do')}
      Visit(a piece of P of size n/4)
  print n</pre>`,
    placeholder: 'a = ?',
    answers: ['5', 'a=5', 'a = 5'],
    explain: 'The loop runs the recursive call 5 times, so a = 5 (one call in the code, five at run time). The size n/4 gives b = 4, and printing is constant work, f(n) = 1: T(n) = 5T(n/4) + 1. a counts calls that run, and it is unrelated to b.',
  },
  {
    type: 'mcq',
    id: 'recurrences.f',
    prompt: 'In merge sort\u2019s T(n) = 2T(n/2) + n, what does the term n count?',
    choices: [
      'The total work of the whole sort, all calls included',
      'The work one call does outside its two recursive calls: dividing the sequence and merging the halves',
      'The work done by the two recursive calls',
      'The number of recursive calls the sort makes',
    ],
    answer: 1,
    explain: 'f(n) is the cost of one call excluding its recursive calls. Those are already counted by 2T(n/2). The total work is T(n) itself, which the master theorem will solve as \u0398(n log n).',
  },
  {
    type: 'mcq',
    id: 'recurrences.strassen',
    prompt: 'Strassen\u2019s algorithm multiplies two n \u00d7 n matrices with 7 recursive products of (n/2) \u00d7 (n/2) blocks and 18 additions of (n/2) \u00d7 (n/2) blocks. What is f(n)?',
    choices: ['\u0398(n)', '18', '\u0398(n<sup>2</sup>)', '\u0398(n<sup>3</sup>)'],
    answer: 2,
    explain: 'One addition of two (n/2) \u00d7 (n/2) blocks touches (n/2)<sup>2</sup> = n<sup>2</sup>/4 entries, so 18 of them cost 18\u00b7n<sup>2</sup>/4 = \u0398(n<sup>2</sup>). 18 counts block operations, not work; n<sup>3</sup> is the cost of the schoolbook multiplication, which is what the recursion replaces. T(n) = 7T(n/2) + n<sup>2</sup>.',
  },
];

export default {
  id: 'recurrences',
  title: 'Divide-and-conquer recurrences',
  group: 'Intuition',
  blurb: 'Where T(n) = aT(n/b) + f(n) comes from: read a, b and f(n) straight off the code.',
  quiz,
  render(root) {
    root.append(
      p('A divide-and-conquer algorithm solves a problem of size n by splitting it into smaller problems of the same kind, solving those recursively, and combining the answers. If T(n) is its running time on an input of size n, the code tells you T(n) in terms of T on smaller inputs. That equation is a <b>recurrence</b>.'),
      p('The master theorem handles the most common shape, where every subproblem has the same size:'),
      h('div', { class: 'formula', html: `T(n) = ${A}T(n/${B}) + ${F}` }),
      h(
        'div',
        { class: 'defs-card reveal' },
        h('div', { class: 'defs-col' },
          h('div', { class: 'eyebrow', text: 'The three parts' }),
          h('dl', { html: `<dt>${A}</dt><dd>the number of recursive calls one call makes (that actually run)</dd><dt>${B}</dt><dd>the factor by which the input shrinks: each call gets size n/b</dd><dt>${F}</dt><dd>the work one call does outside its recursive calls: dividing the input and combining the results</dd>` })),
        h('div', { class: 'defs-col' },
          h('div', { class: 'eyebrow', text: 'The rules' }),
          h('dl', { html: `<dt>a \u2265 1</dt><dd>a constant: at least one call, and the same number on every level</dd><dt>b > 1</dt><dd>a constant: the input really shrinks</dd><dt>T(1)</dt><dd>a constant (the base case); floors and ceilings of n/b are ignored</dd>` })),
      ),
    );

    root.append(section('Reading a, b and f(n) off the code'));
    root.append(
      p(`Pick an algorithm. The shaded lines are where the parts come from: count the recursive calls that run for ${A}, look at the size of their argument for ${B}, and add up everything else one call does for ${F}. Only the growth of f(n) matters, so constant factors are dropped (merge sort\u2019s merge is about n steps; we write f(n) = n).`),
    );
    root.append(algoFigure());
    root.append(
      callout('key', 'Three questions per algorithm', `How many recursive calls run? That is ${A}. How big is each one? n/${B}. What else does one call do? ${F}. The recurrence never mentions the total work of the recursive calls; T(n/b) stands for that.`),
    );

    root.append(section('The usual mistakes'));
    root.append(
      h('ol', { class: 'steps', html: `
        <li><b>Counting written calls instead of running calls.</b> Binary search has two calls in its code, but only one runs: a = 1, not 2.</li>
        <li><b>Assuming a = b.</b> a counts calls and b measures their size. Merge sort happens to have a = b = 2; Karatsuba has a = 3, b = 2, and Strassen a = 7, b = 2.</li>
        <li><b>Counting operations instead of work in f(n).</b> Strassen does 18 additions, but each adds (n/2)<sup>2</sup> entries: f(n) = \u0398(n<sup>2</sup>), not 18.</li>
        <li><b>Putting the recursive work into f(n).</b> f(n) is only what happens outside the calls. Merge sort\u2019s f(n) is the merge, n, not n log n.</li>` }),
    );
    root.append(
      callout('note', 'Why the shape matters', 'Every call of the same algorithm splits the same way, so the work spreads out as a regular tree: a children per node, sizes shrinking by b per level. The next chapter draws that tree, and the master theorem is a statement about where in it the work ends up.'),
    );

    root.append(checkpoint(quiz));
  },
};
