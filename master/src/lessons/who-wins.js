import { h, p } from '../../../shared/ui/dom.js';
import { Scene } from '../../../shared/core/scene.js';
import { figure, segmented, callout } from '../../../shared/ui/figure.js';
import { checkpoint } from '../../../shared/ui/quiz.js';
import { Q, qstr, qval, analyze, logInfo, parseNum, recurrenceHtml, answerChoices, rng } from '../model/master.js';
import { barFrames, caseCaption } from '../model/frames.js';

const section = (title) => h('h2', { class: 'reveal', html: title });
const poly = (a, b, p, d = 1) => ({ form: 'divide', a, b, f: { c: 1, p: Q(p, d), k: 0, exp: null, lower: null } });
const sup = (s) => `<sup>${s}</sup>`;
const DEPTH = 4;
const CASE_TAG = { 1: '<span class="tg tg-case1">case 1: leaves</span>', 2: '<span class="tg tg-case2">case 2: tie</span>', 3: '<span class="tg tg-case3">case 3: root</span>' };

/** b^p and r = a/b^p, exact when b^p is an integer. */
function ratio(pr) {
  const { a, b, f } = pr;
  const bp = b ** qval(f.p);
  const exact = Math.abs(bp - Math.round(bp)) < 1e-9;
  const bpHtml = qstr(f.p) === '1' ? `${b}` : `${b}${sup(qstr(f.p))}`;
  return {
    bpHtml,
    bp: exact ? String(Math.round(bp)) : `\u2248 ${(Math.round(bp * 100) / 100).toString()}`,
    r: exact ? qstr(Q(a, Math.round(bp))) : `\u2248 ${(Math.round((a / bp) * 100) / 100).toString()}`,
    exact,
  };
}

/* ---------- sandbox ---------- */

const PS = [Q(0), Q(1, 2), Q(1), Q(3, 2), Q(2), Q(3)];
const pLabel = (q) => (q.n === 0 ? '1' : q.n === 1 && q.d === 1 ? 'n' : q.n === 1 && q.d === 2 ? '\u221an' : `n${sup(qstr(q))}`);

function stepper(label, value, min, max, onChange) {
  const out = h('span', { class: 'ww-val mono', text: String(value) });
  const set = (v) => {
    value = Math.max(min, Math.min(max, v));
    out.textContent = String(value);
    dec.disabled = value <= min;
    inc.disabled = value >= max;
    onChange(value);
  };
  const dec = h('button', { class: 'btn ghost small', text: '\u2212', 'aria-label': `Decrease ${label}`, onclick: () => set(value - 1) });
  const inc = h('button', { class: 'btn ghost small', text: '+', 'aria-label': `Increase ${label}`, onclick: () => set(value + 1) });
  dec.disabled = value <= min;
  inc.disabled = value >= max;
  return h('span', { class: 'ww-step' }, h('span', { class: 'ww-label', html: label }), dec, out, inc);
}

function sandbox() {
  let a = 4;
  let b = 2;
  let p = Q(1);
  const stage = h('div', { class: 'stage' });
  const readout = h('dl', { class: 'ww-readout' });
  const say = h('div', { class: 'caption', 'aria-live': 'polite' });
  // One camera for every setting: all bar frames of this depth share ids and x positions.
  const samples = [poly(16, 2, 0), poly(1, 5, 3), poly(16, 5, 3), poly(1, 2, 0)].map((pr) => barFrames(pr, DEPTH, { width: 300 }).at(-1));
  const view = new Scene(stage, { height: 220, bounds: Scene.measureAll(samples) });

  const draw = (animate = true) => {
    const pr = { form: 'divide', a, b, f: { c: 1, p, k: 0, exp: null, lower: null } };
    const res = analyze(pr);
    const e = logInfo(a, b);
    const r = ratio(pr);
    const cmp = res.case === 1 ? '>' : res.case === 2 ? '=' : '<';
    view.show(barFrames(pr, DEPTH, { width: 300 }).at(-1), { animate });
    readout.innerHTML = `
      <dt>recurrence</dt><dd class="m">${recurrenceHtml(pr)}</dd>
      <dt>a vs b<sup>p</sup></dt><dd class="m">${a} ${cmp} ${r.bpHtml}${r.bpHtml === r.bp ? '' : ` = ${r.bp.replace('\u2248 ', '')}`}${r.exact ? '' : ' (approx.)'}</dd>
      <dt>r = a/b<sup>p</sup></dt><dd class="m">${r.r}</dd>
      <dt>p vs log<sub>b</sub> a</dt><dd class="m">${qstr(p)} ${cmp === '>' ? '<' : cmp === '<' ? '>' : '='} log<sub>${b}</sub> ${a} ${e.q ? `= ${qstr(e.q)}` : `\u2248 ${e.value.toFixed(3)}`}</dd>
      <dt>case</dt><dd>${CASE_TAG[res.case]}</dd>
      <dt>T(n)</dt><dd class="m"><b>${res.answer.html}</b></dd>`;
    say.innerHTML = caseCaption(pr);
  };

  const controls = h(
    'div',
    { class: 'ww-controls' },
    stepper('a', a, 1, 16, (v) => ((a = v), draw())),
    h('span', { class: 'ww-step' }, h('span', { class: 'ww-label', text: 'b' }), segmented([2, 3, 4, 5].map((v) => ({ value: v, label: String(v) })), b, (v) => ((b = v), draw()), { label: 'b' })),
    h('span', { class: 'ww-step' }, h('span', { class: 'ww-label', text: 'f(n)' }), segmented(PS.map((q) => ({ value: qstr(q), label: pLabel(q) })), qstr(p), (v) => ((p = PS.find((q) => qstr(q) === v)), draw()), { label: 'f(n)' })),
  );
  const fig = figure(
    {
      title: 'Sandbox: T(n) = aT(n/b) + n<sup>p</sup>',
      wide: true,
      note: `Bars: the total cost of each level for n = b${sup(DEPTH)}, to scale (the longest bar is the most expensive level). Try to make the bars shrink, stay level, and grow, and predict the case before you look at the readout. Then find a and b with a = b${sup('p')} for f(n) = \u221an.`,
    },
    controls,
    h('div', { class: 'ww-split' }, stage, readout),
    say,
  );
  draw(false);
  return fig;
}

/* ---------- three shapes side by side ---------- */

const SHAPES = [poly(4, 2, 1), poly(4, 2, 2), poly(4, 2, 3)];

function compareGrid() {
  const grid = h('div', { class: 'compare-grid three' });
  const cells = SHAPES.map((pr) => {
    const stage = h('div', { class: 'stage' });
    const res = analyze(pr);
    const r = ratio(pr);
    const word = res.case === 1 ? 'grows: leaves win' : res.case === 2 ? 'stays level: tie' : 'shrinks: root wins';
    grid.append(
      h('div', { class: 'compare-cell' },
        h('div', { class: 'compare-label' }, h('b', { html: recurrenceHtml(pr).replace('T(n) = ', '') }), h('span', { html: `r = 4/${r.bpHtml} = ${r.r}, ${word}` })),
        stage,
        h('div', { class: 'ww-answer', html: `${CASE_TAG[res.case]} <span class="m">${res.answer.html}</span>` })),
    );
    const frames = barFrames(pr, DEPTH, { width: 150, values: false });
    const view = new Scene(stage, { height: 170, minHeight: 140, minWidth: 220, bounds: Scene.measureAll(frames) });
    view.show(frames.at(-1), { animate: false });
    return { view, frames };
  });
  let timer = null;
  const button = h('button', {
    class: 'btn small',
    text: 'Fill in level by level',
    onclick: () => {
      clearInterval(timer);
      let i = 0;
      const tick = () => {
        cells.forEach((c) => c.view.show(c.frames[Math.min(i, c.frames.length - 1)]));
        if (++i >= cells[0].frames.length || !grid.isConnected) clearInterval(timer);
      };
      tick();
      timer = setInterval(tick, 550);
    },
  });
  return figure(
    {
      title: 'Same a and b, three values of p',
      wide: true,
      tools: [button],
      note: 'All three have a = 4 children per call and halve the size, so their trees are identical. Only f(n) changes, and with it the ratio r = a/b<sup>p</sup> between consecutive levels.',
    },
    grid,
  );
}

/* ---------- checkpoint ---------- */

const QS = poly(3, 3, 1);
const QR = poly(8, 2, 2);
const QW = poly(5, 4, 1);
const QA = poly(2, 4, 1, 2);
const QA_CHOICES = answerChoices(QA, rng(3));

const quiz = [
  {
    type: 'mcq',
    id: 'who-wins.shape',
    prompt: `In the recursion tree of ${recurrenceHtml(QS)}, what do the level costs do from the root down?`,
    choices: ['They grow toward the leaves', 'They stay equal', 'They shrink toward the leaves', 'It depends on n'],
    answer: { 1: 0, 2: 1, 3: 2 }[analyze(QS).case],
    explain: `a = ${QS.a} and b${sup('p')} = ${QS.b}${sup(1)} = ${QS.b}, so r = ${QS.a}/${QS.b} = 1: every level costs ${QS.a}${sup('i')}\u00b7(n/${QS.b}${sup('i')}) = n. With about log<sub>3</sub> n levels that is ${analyze(QS).answer.html} (${CASE_TAG[analyze(QS).case]}). The shape never depends on n; r is a constant.`,
  },
  {
    type: 'input',
    id: 'who-wins.ratio',
    prompt: `For ${recurrenceHtml(QR)}, each level costs r times the level above it. What is r?`,
    placeholder: 'r = ?',
    accept: (t) => {
      const x = parseNum(t);
      return x != null && Math.abs(x - QR.a / QR.b ** qval(QR.f.p)) < 1e-6;
    },
    explain: `r = a/b${sup('p')} = ${QR.a}/${QR.b}${sup(2)} = ${ratio(QR).r}. Level i costs ${QR.a}${sup('i')}(n/${QR.b}${sup('i')})${sup(2)} = ${ratio(QR).r}${sup('i')}n${sup(2)}: n${sup(2)}, 2n${sup(2)}, 4n${sup(2)}, \u2026 Since r > 1 the leaves win: ${analyze(QR).answer.html}. (A common slip is a/b = 4; the size shrinks by b, but f of the size shrinks by b${sup('p')}.)`,
  },
  {
    type: 'mcq',
    id: 'who-wins.dominant',
    prompt: `Which part of the recursion tree of ${recurrenceHtml(QW)} does most of the work?`,
    choices: ['The root (case 3)', 'All levels equally (case 2)', 'The leaves (case 1)'],
    answer: 3 - analyze(QW).case,
    explain: `a = ${QW.a} > b${sup('p')} = ${QW.b}${sup(1)} = ${QW.b}, so r = ${ratio(QW).r} > 1 and the levels grow toward the leaves. Equivalently, p = 1 < log<sub>4</sub> 5 \u2248 ${logInfo(QW.a, QW.b).value.toFixed(3)}. The leaves win: T(n) is ${analyze(QW).answer.html}. The growth is slow (only 1.25 per level), but any constant r > 1 makes the last level dominate.`,
  },
  {
    type: 'mcq',
    id: 'who-wins.sqrt',
    prompt: `Solve ${recurrenceHtml(QA)}.`,
    choices: QA_CHOICES.choices,
    answer: QA_CHOICES.answer,
    explain: `b${sup('p')} = 4${sup('1/2')} = 2 = a, so r = 1: a tie. Every level costs \u221an (level i: 2${sup('i')}\u00b7\u221a(n/4${sup('i')}) = 2${sup('i')}\u00b7\u221an/2${sup('i')}), and there are log<sub>4</sub> n levels, so T(n) is <b>${analyze(QA).answer.html}</b>. Check with the other form: log<sub>4</sub> 2 = 1/2 = p.`,
  },
];

export default {
  id: 'who-wins',
  title: 'Root, levels, or leaves',
  group: 'Intuition',
  blurb: 'For f(n) = n^p the level costs form a geometric series with ratio a/b^p. Compare a with b^p and you know the case.',
  quiz,
  render(root) {
    root.append(
      p('The recursion tree splits T(n) into levels: level i costs a<sup>i</sup> f(n/b<sup>i</sup>). Which levels matter most? Take the simplest kind of f, a power f(n) = n<sup>p</sup>, and the level cost simplifies:'),
      h('div', { class: 'formula', html: `a${sup('i')} (n/b${sup('i')})${sup('p')} = (a/b${sup('p')})${sup('i')} n${sup('p')} = r${sup('i')} n${sup('p')}, &nbsp; with r = a/b${sup('p')}` }),
      p('So going one level down multiplies the cost by the same constant r. A node has a children, which is a times more calls, but each child\u2019s input is b times smaller, which makes its f exactly b<sup>p</sup> times cheaper. The levels form a <b>geometric series</b>, and a geometric series has only three possible shapes.'),
    );
    root.append(
      h('div', { class: 'table-wrap reveal' }, h('table', { html: `
        <thead><tr><th>Ratio</th><th>Equivalently</th><th>Level costs</th><th>Who wins</th><th>T(n)</th></tr></thead>
        <tbody>
          <tr><td class="m">r < 1</td><td class="m">a < b<sup>p</sup>, p > log<sub>b</sub> a</td><td>shrink from the root down</td><td><span class="tg tg-case3">root</span> case 3</td><td class="m">\u0398(n<sup>p</sup>) = \u0398(f(n))</td></tr>
          <tr><td class="m">r = 1</td><td class="m">a = b<sup>p</sup>, p = log<sub>b</sub> a</td><td>all equal to n<sup>p</sup></td><td><span class="tg tg-case2">tie</span> case 2</td><td class="m">\u0398(n<sup>p</sup> log n)</td></tr>
          <tr><td class="m">r > 1</td><td class="m">a > b<sup>p</sup>, p < log<sub>b</sub> a</td><td>grow toward the leaves</td><td><span class="tg tg-case1">leaves</span> case 1</td><td class="m">\u0398(n<sup>log<sub>b</sub> a</sup>)</td></tr>
        </tbody>` })),
    );
    root.append(
      h('ol', { class: 'steps reveal', html: `
        <li><b>r < 1, the root wins.</b> n<sup>p</sup>(1 + r + r<sup>2</sup> + \u2026) is less than n<sup>p</sup>/(1 \u2212 r), a constant times the root\u2019s cost. So T(n) = \u0398(f(n)).</li>
        <li><b>r = 1, a tie.</b> Every level costs n<sup>p</sup>, and there are log<sub>b</sub> n + 1 levels. So T(n) = \u0398(n<sup>p</sup> log n). Here a = b<sup>p</sup> means p = log<sub>b</sub> a, so this is also \u0398(n<sup>log<sub>b</sub> a</sup> log n).</li>
        <li><b>r > 1, the leaves win.</b> The last level is the biggest, and the ones above it add up to at most a constant times it. The last level is the n<sup>log<sub>b</sub> a</sup> leaves, so T(n) = \u0398(n<sup>log<sub>b</sub> a</sup>).</li>` }),
    );
    root.append(
      callout('key', 'Compare a with b^p', `a is how many times more calls each level has; b<sup>p</sup> is how many times cheaper each call gets. <b>a > b<sup>p</sup></b>: ${'<span class="tg tg-case1">leaves</span>'}. <b>a = b<sup>p</sup></b>: ${'<span class="tg tg-case2">tie</span>'}. <b>a < b<sup>p</sup></b>: ${'<span class="tg tg-case3">root</span>'}. Taking log<sub>b</sub> of both sides gives the same test in the form the theorem uses: compare p with log<sub>b</sub> a.`),
    );

    root.append(section('Three shapes'));
    root.append(p('Here are the three shapes on the same tree. Press the button to watch the bars fill in from the root down.'));
    root.append(compareGrid());

    root.append(section('Try it'));
    root.append(p('Change a, b and f(n). The bars are the level totals from the model; the readout does the comparison both ways and names the case.'));
    root.append(sandbox());
    root.append(
      callout('note', 'Where this goes next', 'The master theorem says the same thing for every f(n), not only powers: compare f(n) with n<sup>log<sub>b</sub> a</sup>, the cost of the leaves. A log factor on f(n) at the tie (f(n) = n<sup>log<sub>b</sub> a</sup> log<sup>k</sup> n) keeps the levels almost equal and adds one more log to the answer. And case 3\u2019s extra condition, a f(n/b) \u2264 c f(n) with c < 1, says exactly that the level costs shrink by a constant factor; for f(n) = n<sup>p</sup> it holds with c = r. The <a href="#/three-cases">three cases</a> chapter states it all precisely.'),
    );

    root.append(checkpoint(quiz));
  },
};
