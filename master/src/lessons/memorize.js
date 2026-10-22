import { h, p } from '../../../shared/ui/dom.js';
import { figure, segmented, callout } from '../../../shared/ui/figure.js';
import { checkpoint } from '../../../shared/ui/quiz.js';
import { Q, analyze, answerChoices, recurrenceHtml, logInfo, qstr, qval, rng, shuffle, parseNum } from '../model/master.js';

const D = (a, b, p, k = 0) => ({ form: 'divide', a, b, f: { c: 1, p, k, exp: null, lower: null } });
const section = (html) => h('h2', { class: 'reveal', html });
const m = (html) => `<span class="m">${html}</span>`;
const W = 'n<sup>log<sub>b</sub> a</sup>';
const tg = (kind, text) => `<span class="tg tg-${kind}">${text}</span>`;

/* ---------- cloze drill ---------- */

/** Normalize typed math: case, spaces, brackets, carets and underscores do not matter. */
const norm = (t) =>
  String(t)
    .toLowerCase()
    .replace(/[\s_(){}^*]/g, '')
    .replace(/[\u2212\u2013]/g, '-')
    .replace(/<=|=<|\\le(q)?/g, '\u2264')
    .replace(/>=|=>|\\ge(q)?/g, '\u2265');

/**
 * Every blank in the statement: show (the textbook's text), accept (normalized answers),
 * hint (why it is that), wrong (targeted hints for typical wrong answers, keyed by normalized text).
 */
const BLANKS = {
  'hdr-a1': { where: 'the setup line', show: '1', accept: ['1'], hint: 'a \u2265 1: at least one recursive call, otherwise the tree has no branches to count.' },
  'hdr-b1': { where: 'the setup line', show: '1', accept: ['1'], hint: 'b > 1: each subproblem must be a constant factor smaller than n, or the recursion never reaches size 1 in log<sub>b</sub> n levels.' },
  'c1-O': {
    where: 'case 1', show: 'O', accept: ['o', 'bigo'],
    hint: 'Case 1 is an upper bound: f(n) is at most a polynomially smaller function, so big-O.',
    wrong: { '\u03b8': '\u0398 would force f(n) to be exactly that size. Case 1 only needs f(n) to be at most that big.', '\u03c9': '\u03a9 is case 3 (f(n) large). Case 1 is the small side, so O.', omega: '\u03a9 is case 3 (f(n) large). Case 1 is the small side, so O.', theta: '\u0398 would force f(n) to be exactly that size. Case 1 only needs f(n) to be at most that big.' },
  },
  'c1-sign': { where: 'case 1', show: '\u2212', accept: ['-', 'minus'], hint: 'Minus: in case 1 f(n) sits below the watershed, so the exponent is log<sub>b</sub> a \u2212 \u03b5.', wrong: { '+': 'Plus is case 3. Case 1 is the case where f(n) is smaller.' } },
  'c1-eps': { where: 'case 1', show: '\u03b5', accept: ['\u03b5', 'e', 'eps', 'epsilon'], hint: 'The exponent is log<sub>b</sub> a \u2212 \u03b5: smaller by a polynomial factor n<sup>\u03b5</sup>.', wrong: { k: 'k belongs to case 2 (log factors). Case 1 is about a polynomial gap n<sup>\u03b5</sup>.', 1: 'Not 1: the statement names the gap \u03b5 ("for some constant \u03b5 > 0"); \u03b5 = 1 is only one possible value.' } },
  'c1-0': { where: 'case 1', show: '0', accept: ['0'], hint: '\u03b5 > 0: any positive constant works, however small. \u03b5 = 0 would be no gap at all (that is case 2).', wrong: { 1: '\u03b5 can be any positive constant, such as 0.1. It is \u03b5 > 0, not \u03b5 > 1.' } },
  'c1-ans': { where: 'case 1', show: 'n<sup>log<sub>b</sub> a</sup>', accept: ['nlogba'], hint: 'The leaves win, and there are n<sup>log<sub>b</sub> a</sup> of them.', wrong: { fn: '\u0398(f(n)) is case 3 (the root wins). In case 1 the leaves win: n<sup>log<sub>b</sub> a</sup>.', f: '\u0398(f(n)) is case 3 (the root wins). In case 1 the leaves win: n<sup>log<sub>b</sub> a</sup>.', nlogab: 'That is log<sub>a</sub> b, upside down. The exponent is log<sub>b</sub> a (base b, the shrink factor).' } },
  'c2-T': {
    where: 'case 2', show: '\u0398', accept: ['\u03b8', 'theta', 'bigtheta'],
    hint: 'Case 2 is a tie, so f(n) must be exactly that size: \u0398.',
    wrong: { o: 'O would allow f(n) to be much smaller, which is case 1 territory. The tie needs \u0398.', '\u03c9': '\u03a9 would allow f(n) to be much larger. The tie needs \u0398.', omega: '\u03a9 would allow f(n) to be much larger. The tie needs \u0398.' },
  },
  'c2-k': { where: 'case 2', show: 'k', accept: ['k'], hint: 'f(n) may carry log<sup>k</sup> n on top of the watershed.', wrong: { 'k+1': 'k + 1 is in the answer. f(n) has log<sup>k</sup> n; T(n) gets log<sup>k+1</sup> n.' } },
  'c2-0': { where: 'case 2', show: '0', accept: ['0'], hint: 'k \u2265 0: no logs (k = 0) is the plain tie. Negative k (dividing by logs) is not covered.', wrong: { 1: 'k = 0 is allowed and is the most common case (merge sort). So k \u2265 0.' } },
  'c2-ans': { where: 'case 2', show: 'k+1', accept: ['k+1', '1+k'], hint: 'Every level costs about f(n) and there are about log n levels: one extra log, so log<sup>k+1</sup> n.', wrong: { k: 'That forgets the extra log. log n levels each costing f(n) give log<sup>k+1</sup> n.' } },
  'c3-W': {
    where: 'case 3', show: '\u03a9', accept: ['\u03c9', 'omega', 'bigomega'],
    hint: 'Case 3 is a lower bound: f(n) is at least a polynomially larger function, so big-\u03a9.',
    wrong: { o: 'O is case 1. Case 3 says f(n) is at least that big: \u03a9.', bigo: 'O is case 1. Case 3 says f(n) is at least that big: \u03a9.', '\u03b8': '\u0398 is case 2. Case 3 only needs a lower bound: \u03a9.', theta: '\u0398 is case 2. Case 3 only needs a lower bound: \u03a9.' },
  },
  'c3-sign': { where: 'case 3', show: '+', accept: ['+', 'plus'], hint: 'Plus: f(n) sits above the watershed by n<sup>\u03b5</sup>.', wrong: { '-': 'Minus is case 1. Case 3 is the case where f(n) is larger.' } },
  'c3-a': { where: 'case 3', show: 'a', accept: ['a'], hint: 'a f(n/b) is the whole level below the root: a children, each costing f(n/b).', wrong: { '': 'Something goes in front: the a children together cost a f(n/b).' } },
  'c3-b': { where: 'case 3', show: 'b', accept: ['b'], hint: 'Each child has size n/b.', wrong: { a: 'The size of a child is n/b; a is the number of children.' } },
  'c3-rel': { where: 'case 3', show: '\u2264', accept: ['\u2264', 'leq', 'le'], hint: 'The level below costs at most a fraction c of this level: \u2264.', wrong: { '\u2265': 'The other way round: the level below must be cheaper, so a f(n/b) \u2264 c f(n).', '<': 'The book writes \u2264 (at most c times).' } },
  'c3-c': { where: 'case 3', show: '<', accept: ['<', 'lessthan'], hint: 'c < 1 strictly: the level costs must shrink geometrically. c = 1 would mean every level costs the same (a tie).', wrong: { '\u2264': 'c = 1 is not allowed: with c = 1 the levels need not shrink at all. Strictly c < 1.', '>': 'c > 1 would mean the levels grow toward the leaves. The condition needs c < 1.' } },
  'c3-ans': { where: 'case 3', show: 'f(n)', accept: ['fn', 'f'], hint: 'The root wins, and the root costs f(n).', wrong: { nlogba: 'n<sup>log<sub>b</sub> a</sup> is case 1 (the leaves win). In case 3 the root wins: \u0398(f(n)).' } },
};

const B = (id) => ({ blank: id });
const LINES = [
  { key: 'setup', label: null, parts: ['T(n) = aT(n/b) + f(n), constants a \u2265 ', B('hdr-a1'), ' and b > ', B('hdr-b1'), '.'] },
  { key: 'case 1', label: tg('case1', 'case 1'), parts: ['if f(n) is ', B('c1-O'), '(n<sup>log<sub>b</sub> a ', B('c1-sign'), ' ', B('c1-eps'), '</sup>) for some constant \u03b5 > ', B('c1-0'), ', then T(n) is \u0398(', B('c1-ans'), ').'] },
  { key: 'case 2', label: tg('case2', 'case 2'), parts: ['if f(n) is ', B('c2-T'), '(n<sup>log<sub>b</sub> a</sup> log<sup>', B('c2-k'), '</sup> n) for a fixed nonnegative integer k \u2265 ', B('c2-0'), ', then T(n) is \u0398(n<sup>log<sub>b</sub> a</sup> log<sup>', B('c2-ans'), '</sup> n).'] },
  { key: 'case 3', label: tg('case3', 'case 3'), parts: ['if f(n) is ', B('c3-W'), '(n<sup>log<sub>b</sub> a ', B('c3-sign'), ' \u03b5</sup>) for some constant \u03b5 > 0, and if ', B('c3-a'), ' f(n/', B('c3-b'), ') ', B('c3-rel'), ' c f(n) (for some constant c ', B('c3-c'), ' 1, large n), then T(n) is \u0398(', B('c3-ans'), ').'] },
];

const lineHtml = (line, blanks = new Set()) =>
  line.parts.map((x) => (typeof x === 'string' ? x : blanks.has(x.blank) ? `<input class="key-input cloze-blank" data-blank="${x.blank}" aria-label="blank" autocomplete="off" spellcheck="false">` : BLANKS[x.blank].show)).join('');

const SYMBOLS = ['\u0398', '\u03a9', 'O', '\u03b5', '\u2212', '+', '\u2264', '<', '\u2265'];

function clozeDrill() {
  let mode = 'few';
  let blanks = new Set();
  let rounds = 0;
  let perfect = 0;
  let lastFocus = null;
  const text = h('div', { class: 'cloze' });
  const msg = h('div', { class: 'drill-msg', 'aria-live': 'polite' });
  const score = h('span', { class: 'drill-score' });
  const actions = h('div', { class: 'cloze-actions' });
  const palette = h('div', { class: 'cloze-palette' },
    h('span', { class: 'muted', text: 'Insert:' }),
    SYMBOLS.map((s) => h('button', {
      class: 'btn ghost small',
      text: s,
      onmousedown: (e) => e.preventDefault(),
      onclick: () => insert(s),
    })),
  );

  function insert(s) {
    const el = lastFocus && lastFocus.isConnected ? lastFocus : text.querySelector('input:not([disabled]), textarea');
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    el.value = el.value.slice(0, start) + s + el.value.slice(end);
    el.focus();
    el.setSelectionRange(start + s.length, start + s.length);
    el.classList.remove('ok', 'bad');
  }

  const setScore = () => (score.textContent = rounds ? `${perfect} / ${rounds} rounds perfect` : '');

  function newRound() {
    msg.className = 'drill-msg';
    msg.textContent = '';
    if (mode === 'recall') return recallRound();
    const ids = Object.keys(BLANKS);
    blanks = new Set(mode === 'all' ? ids : shuffle(ids).slice(0, 5));
    text.replaceChildren(...LINES.map((line) => h('div', { class: 'cloze-line' }, line.label && h('span', { class: 'cloze-label', html: line.label }), h('span', { class: 'cloze-text', html: lineHtml(line, blanks) }))));
    const inputs = [...text.querySelectorAll('input.cloze-blank')];
    inputs.forEach((el, i) => {
      el.addEventListener('focus', () => (lastFocus = el));
      el.addEventListener('input', () => el.classList.remove('ok', 'bad'));
      el.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        if (i + 1 < inputs.length && !inputs[i + 1].disabled) inputs[i + 1].focus();
        else check();
      });
    });
    actions.replaceChildren(
      h('button', { class: 'btn small', text: 'Check', onclick: check }),
      h('button', { class: 'btn ghost small', text: 'Show answers', onclick: reveal }),
      h('button', { class: 'btn ghost small', text: 'New blanks', onclick: newRound }),
      h('span', { class: 'spacer' }),
      score,
    );
    msg.textContent = `${blanks.size} blank${blanks.size === 1 ? '' : 's'}. Type the missing piece (use the buttons for symbols), then press Enter or Check.`;
  }

  function check() {
    const inputs = [...text.querySelectorAll('input.cloze-blank')];
    if (!inputs.length || inputs.every((el) => el.disabled)) return;
    const misses = [];
    for (const el of inputs) {
      const b = BLANKS[el.dataset.blank];
      const typed = norm(el.value);
      const ok = b.accept.includes(typed);
      el.classList.toggle('ok', ok);
      el.classList.toggle('bad', !ok);
      if (!ok) misses.push({ b, raw: el.value.trim(), tip: b.wrong?.[typed] ?? b.hint });
    }
    if (!misses.length) {
      rounds++;
      perfect++;
      setScore();
      msg.className = 'drill-msg ok';
      msg.innerHTML = `All ${inputs.length} correct. Press <b>New blanks</b> for another round.`;
      inputs.forEach((el) => (el.disabled = true));
      return;
    }
    msg.className = 'drill-msg bad';
    msg.innerHTML = `${inputs.length - misses.length} of ${inputs.length} correct. Fix the red blanks and check again, or show the answers.<ul class="cloze-misses">${misses
      .map(({ b, raw, tip }) => `<li><b>${b.where}</b>, ${raw ? `you wrote \u201c${escape(raw)}\u201d` : 'left empty'}: ${tip}</li>`)
      .join('')}</ul>`;
  }

  function reveal() {
    const inputs = [...text.querySelectorAll('input.cloze-blank')];
    if (!inputs.length || inputs.every((el) => el.disabled)) return;
    const wrong = inputs.filter((el) => !BLANKS[el.dataset.blank].accept.includes(norm(el.value)));
    rounds++;
    setScore();
    for (const el of inputs) {
      const b = BLANKS[el.dataset.blank];
      const ok = b.accept.includes(norm(el.value));
      const fix = h('span', { class: `cloze-fix ${ok ? 'ok' : 'bad'}`, html: b.show });
      el.replaceWith(fix);
    }
    msg.className = wrong.length ? 'drill-msg bad' : 'drill-msg ok';
    msg.innerHTML = wrong.length
      ? `The red pieces are the ones you missed: ${wrong.length} of ${inputs.length}. Read the line once more, then press <b>New blanks</b>.`
      : `All ${inputs.length} were right. Press <b>New blanks</b> for another round.`;
  }

  function recallRound() {
    const blocks = LINES.filter((l) => l.key !== 'setup').map((line) => {
      const area = h('textarea', { class: 'text-input recall-input', rows: 2, placeholder: `Write ${line.key} from memory`, spellcheck: 'false' });
      area.addEventListener('focus', () => (lastFocus = area));
      const answer = h('div', { class: 'recall-answer' });
      const grade = h('div', { class: 'cloze-actions' });
      const pieces = line.parts.filter((x) => typeof x !== 'string').map((x) => `<span class="m">${BLANKS[x.blank].show}</span>`).join(', ');
      const btn = h('button', {
        class: 'btn ghost small',
        text: 'Reveal',
        onclick: () => {
          btn.disabled = true;
          answer.innerHTML = `<div class="recall-text">${lineHtml(line)}</div><div class="muted">Check your version for each of: ${pieces}.</div>`;
          const done = (good) => {
            rounds++;
            if (good) perfect++;
            setScore();
            grade.replaceChildren(h('span', { class: good ? 'drill-msg ok' : 'drill-msg bad', text: good ? 'Marked as known.' : 'Marked for review: try it again in New round.' }));
          };
          grade.replaceChildren(
            h('button', { class: 'btn small', text: 'I had all of it', onclick: () => done(true) }),
            h('button', { class: 'btn ghost small', text: 'I missed something', onclick: () => done(false) }),
          );
        },
      });
      return h('div', { class: 'recall-block' }, h('div', { class: 'cloze-label', html: line.label }), area, h('div', { class: 'cloze-actions' }, btn), answer, grade);
    });
    text.replaceChildren(h('div', { class: 'cloze-line' }, h('span', { class: 'cloze-text', html: lineHtml(LINES[0]) })), ...blocks);
    actions.replaceChildren(h('button', { class: 'btn ghost small', text: 'New round', onclick: newRound }), h('span', { class: 'spacer' }), score);
    msg.textContent = 'Write each case in full, including its conditions and its answer. Then reveal the textbook version and grade yourself honestly.';
  }

  const fig = figure(
    {
      title: 'Fill in the theorem',
      wide: true,
      tools: [
        segmented(
          [
            { value: 'few', label: 'Few blanks' },
            { value: 'all', label: 'All blanks' },
            { value: 'recall', label: 'Whole case from memory' },
          ],
          mode,
          (v) => ((mode = v), newRound()),
          { label: 'Difficulty' },
        ),
      ],
      note: 'Typing is forgiving: spaces, brackets, ^ and _ are ignored, so n^(log_b a), "theta", "omega", "&lt;=" and "-" all count.',
    },
    text,
    palette,
    actions,
    msg,
  );
  newRound();
  return fig;
}

const escape = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/* ---------- shortcut table ---------- */

const FAMOUS = [
  ['Binary search', D(1, 2, Q(0))],
  ['Merge sort', D(2, 2, Q(1))],
  ['Karatsuba', D(3, 2, Q(1))],
  ['Strassen', D(7, 2, Q(2))],
  ['Plain matrix multiply', D(8, 2, Q(2))],
  ['Root-heavy', D(2, 2, Q(2))],
];

const cmpSign = (a, bp) => (Math.abs(a - bp) < 1e-9 ? '=' : a < bp ? '<' : '>');
const caseTag = (c) => (c ? tg(`case${c}`, `case ${c}`) : tg('none', 'none'));

function bpHtml(pr) {
  const ps = qstr(pr.f.p);
  return `${pr.b}<sup>${ps}</sup> = ${+(pr.b ** (pr.f.p.n / pr.f.p.d)).toFixed(3)}`;
}

function shortcutRow(name, pr) {
  const r = analyze(pr);
  const bp = pr.b ** (pr.f.p.n / pr.f.p.d);
  return `<tr><td>${name}</td><td class="nowrap">${m(recurrenceHtml(pr))}</td><td class="nowrap">${m(`${pr.a} ${cmpSign(pr.a, bp)} ${bpHtml(pr)}`)}</td><td>${caseTag(r.case)}</td><td class="nowrap">${r.answer.html}</td></tr>`;
}

function shortcutTry() {
  const a = h('input', { class: 'key-input short', value: '3', 'aria-label': 'a' });
  const b = h('input', { class: 'key-input short', value: '2', 'aria-label': 'b' });
  const pIn = h('input', { class: 'key-input short', value: '1', 'aria-label': 'p' });
  const out = h('div', { class: 'drill-msg', 'aria-live': 'polite' });
  const run = () => {
    const av = parseNum(a.value);
    const bv = parseNum(b.value);
    const pm = pIn.value.trim().match(/^(\d+)(?:\s*\/\s*(\d+))?$/);
    if (av == null || !(av > 0) || !Number.isInteger(bv) || bv < 2 || !pm || Number(pm[2] ?? 1) === 0) {
      out.className = 'drill-msg bad';
      out.textContent = 'Use a number a > 0, an integer b \u2265 2, and p as a whole number or a fraction such as 3/2.';
      return;
    }
    const pr = D(av, bv, Q(Number(pm[1]), Number(pm[2] ?? 1)));
    const r = analyze(pr);
    const bp = bv ** qval(pr.f.p);
    out.className = 'drill-msg';
    if (!r.applies) {
      out.innerHTML = `${m(recurrenceHtml(pr))}: ${r.reason}`;
      return;
    }
    const s = cmpSign(av, bp);
    const who = s === '>' ? 'more children than shrinkage: the leaves win' : s === '=' ? 'they balance: a tie' : 'the shrinkage beats the branching: the root wins';
    out.innerHTML = `${m(recurrenceHtml(pr))}: a = ${av} ${s} b<sup>p</sup> = ${bpHtml(pr)}, ${who}. ${caseTag(r.case)} T(n) is ${r.answer.html}.`;
  };
  [a, b, pIn].forEach((el) => el.addEventListener('input', run));
  run();
  return h('div', {},
    h('div', { class: 'input-row shortcut-form' }, h('span', { html: 'T(n) = ' }), a, h('span', { text: 'T(n /' }), b, h('span', { html: ') + n^' }), pIn),
    out);
}

function shortcutFigure() {
  return figure(
    {
      title: `Shortcut for f(n) = n<sup>p</sup>: compare a with b<sup>p</sup>`,
      wide: true,
      note: 'Every row is computed by the same analysis the practice drills use. Try your own a, b and p in the line under the table.',
    },
    h('div', { class: 'table-wrap' }, h('table', { html: `
      <thead><tr><th>Example</th><th>Recurrence</th><th>a vs b<sup>p</sup></th><th>Case</th><th>T(n) is</th></tr></thead>
      <tbody>${FAMOUS.map(([name, pr]) => shortcutRow(name, pr)).join('')}</tbody>` })),
    shortcutTry(),
  );
}

/* ---------- quiz ---------- */

const SHORT_Q = D(7, 2, Q(2));
const shortCh = answerChoices(SHORT_Q, rng(11));

const quiz = [
  {
    type: 'mcq',
    id: 'memorize.case2-out',
    prompt: `Case 2: f(n) is \u0398(${W} log<sup>k</sup> n) for a fixed nonnegative integer k \u2265 0. Then T(n) is`,
    choices: [`\u0398(${W} log<sup>k</sup> n)`, `\u0398(${W} log<sup>k+1</sup> n)`, '\u0398(f(n))', `\u0398(${W})`],
    answer: 1,
    explain: `log<sup>k</sup> n in, log<sup>k+1</sup> n out. Each of the about log n levels costs about f(n), so the total is f(n) \u00b7 log n = ${W} log<sup>k+1</sup> n. \u0398(f(n)) is case 3 and \u0398(${W}) is case 1.`,
  },
  {
    type: 'mcq',
    id: 'memorize.regularity',
    prompt: 'Which is the regularity condition of case 3, as the textbook states it?',
    choices: [
      'a f(n/b) \u2264 c f(n) for some constant c < 1, large n',
      'f(n/b) \u2264 c f(n) for some constant c < 1, large n',
      'a f(n/b) \u2265 c f(n) for some constant c > 1, large n',
      'a f(n/b) \u2264 c f(n) for some constant c \u2264 1, large n',
    ],
    answer: 0,
    explain: 'a f(n/b) is the whole level below the root (a children of size n/b), so the a must be there. The level below must cost at most a fraction c of the root, with c strictly below 1: c = 1 would allow every level to cost the same, and then the root would not dominate.',
  },
  {
    type: 'mcq',
    id: 'memorize.shortcut',
    prompt: `Use the shortcut (compare a with b<sup>p</sup>) to solve ${m(recurrenceHtml(SHORT_Q))}.`,
    choices: shortCh.choices,
    answer: shortCh.answer,
    explain: () => {
      const r = analyze(SHORT_Q);
      return `a = 7 and b<sup>p</sup> = 2<sup>2</sup> = 4, so a > b<sup>p</sup>: case ${r.case}, the leaves win. T(n) is ${r.answer.html} (log<sub>2</sub> 7 \u2248 ${logInfo(7, 2).value.toFixed(3)}), not \u0398(n<sup>2</sup>). Careful with the direction: log<sub>7</sub> 2 is the upside-down log.`;
    },
  },
];

export default {
  id: 'memorize',
  title: 'Memorize it',
  group: 'The theorem',
  blurb: 'A one-line mnemonic, a fill-in-the-blanks drill of the exact statement, and the a versus b^p shortcut.',
  quiz,
  render(root) {
    root.append(
      p('On an exam you need the statement word for word: the O, \u0398 and \u03a9, the signs on \u03b5, the k \u2265 0, the regularity condition and the three answers. Learn it in three layers: the one-line idea, then the exact text, then the shortcut for the common case.'),
    );

    root.append(section('The one-line version'));
    root.append(
      h('div', { class: 'mnemonic reveal', html: `Compare ${m('f(n)')} with ${m(W)}.<br>${tg('case1', 'Smaller')}: leaves win. ${tg('case2', 'Equal (up to log<sup>k</sup>)')}: add a log. ${tg('case3', 'Bigger (and regular)')}: f wins.` }),
      p(`Each phrase unpacks into one case. <b>Smaller</b> means smaller by a polynomial factor ${m('n<sup>\u03b5</sup>')}, and the answer is the number of leaves, ${m(`\u0398(${W})`)}. <b>Equal</b> means the same polynomial, with ${m('log<sup>k</sup> n')} (k \u2265 0) allowed on top, and you add one log. <b>Bigger</b> means bigger by ${m('n<sup>\u03b5</sup>')} with the regularity condition, and the answer is ${m('\u0398(f(n))')}.`),
    );
    root.append(
      callout('key', 'Two symmetries carry the statement', `Cases 1 and 3 are mirror images: O and \u2212\u03b5 below the watershed, \u03a9 and +\u03b5 above it. Case 3 adds the one asymmetric piece, ${m('a f(n/b) \u2264 c f(n)')} with ${m('c < 1')}. Case 2 sits in the middle with \u0398 and the only change in the answer is k \u2192 k + 1.`),
    );

    root.append(section('The exact text'));
    root.append(
      p('Fill in the blanks until you get them right without thinking. <b>Few blanks</b> picks five pieces at random; <b>All blanks</b> blanks every piece; <b>Whole case from memory</b> asks you to write each case in full, then shows the book\u2019s text so you can grade yourself.'),
      clozeDrill(),
    );

    root.append(section('The shortcut for f(n) = n<sup>p</sup>'));
    root.append(
      p(`Most exam recurrences have ${m('f(n) = n<sup>p</sup>')}. Then comparing ${m('n<sup>p</sup>')} with ${m(W)} is comparing ${m('p')} with ${m('log<sub>b</sub> a')}, which is the same as comparing ${m('b<sup>p</sup>')} with ${m('a')}. No logarithms needed:`),
      h('div', { class: 'table-wrap reveal' }, h('table', { html: `
        <thead><tr><th>Compare</th><th>Means</th><th>Case</th><th>T(n) is</th></tr></thead>
        <tbody>
          <tr><td>${m('a > b<sup>p</sup>')}</td><td>more children than the size shrinks: the leaves win</td><td>${tg('case1', 'case 1')}</td><td>\u0398(${W})</td></tr>
          <tr><td>${m('a = b<sup>p</sup>')}</td><td>branching and shrinking cancel: every level costs n<sup>p</sup></td><td>${tg('case2', 'case 2')}</td><td>\u0398(n<sup>p</sup> log n)</td></tr>
          <tr><td>${m('a < b<sup>p</sup>')}</td><td>the size shrinks faster than the tree branches: the root wins</td><td>${tg('case3', 'case 3')}</td><td>\u0398(n<sup>p</sup>)</td></tr>
        </tbody>` })),
      p(`In the last row regularity is automatic, because c = a/b<sup>p</sup> < 1 is exactly ${m('a < b<sup>p</sup>')}. With an extra ${m('log<sup>k</sup> n')} in f(n) the same comparison picks the case, and the answer keeps or gains the logs: case 2 gives ${m('n<sup>p</sup> log<sup>k+1</sup> n')}, case 3 gives ${m('n<sup>p</sup> log<sup>k</sup> n')}.`),
      shortcutFigure(),
    );

    root.append(checkpoint(quiz, { title: 'Checkpoint' }));
  },
};
