import { h, p } from '../../../shared/ui/dom.js';
import { Player } from '../../../shared/ui/player.js';
import { figure, segmented, callout } from '../../../shared/ui/figure.js';
import { Q, parseNum, recurrenceHtml } from '../model/master.js';
import { barFrames } from '../model/frames.js';
import { walkthroughCard } from '../ui/practice.js';

/** Field values as typed. `other` presets are not of the form aT(n/b) + f(n). */
const PRESETS = [
  { id: 'merge', label: 'Merge sort: 2T(n/2) + n', a: '2', b: '2', c: '1', p: '1', k: '0' },
  { id: 'binary', label: 'Binary search: T(n/2) + 1', a: '1', b: '2', c: '1', p: '0', k: '0' },
  { id: 'karatsuba', label: 'Karatsuba: 3T(n/2) + n', a: '3', b: '2', c: '1', p: '1', k: '0' },
  { id: 'strassen', label: 'Strassen: 7T(n/2) + n\u00b2', a: '7', b: '2', c: '1', p: '2', k: '0' },
  { id: 'clrs', label: '3T(n/4) + n log n', a: '3', b: '4', c: '1', p: '1', k: '1' },
  { id: 'gap', label: '2T(n/2) + n / log n', a: '2', b: '2', c: '1', p: '1', k: '-1' },
  { id: 'half', label: '(1/2)T(n/2) + n', a: '1/2', b: '2', c: '1', p: '1', k: '0' },
  {
    id: 'subtract',
    label: 'T(n \u2212 1) + n',
    other: {
      form: 'other',
      kind: 'subtract',
      html: 'T(n) = T(n \u2212 1) + n',
      why: 'The subproblem has size n \u2212 1, not n/b. Subtracting a constant does not shrink n by a constant factor, so there is no b > 1. (Unrolling gives \u0398(n<sup>2</sup>).)',
      decoys: [],
    },
  },
];

/** "3", "3/2", "1.5" -> Q, else null. */
function parseQ(text) {
  const t = text.trim();
  let m = t.match(/^(\d+)$/);
  if (m) return Q(Number(m[1]));
  m = t.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (m && Number(m[2]) > 0) return Q(Number(m[1]), Number(m[2]));
  m = t.match(/^(\d*)\.(\d{1,3})$/);
  if (m) return Q(Number(`${m[1] || '0'}${m[2]}`), 10 ** m[2].length);
  return null;
}

/** Field texts -> { pr } or { errors: { field: message } }. */
function readForm(v) {
  const errors = {};
  const a = parseNum(v.a);
  if (a == null || !(a > 0) || a > 1000 || /log|lg/i.test(v.a)) errors.a = 'a must be a positive number, like 2 or 1/2.';
  const b = Number(v.b.trim());
  if (!/^\d+$/.test(v.b.trim()) || b < 2 || b > 100) errors.b = 'b must be a whole number, at least 2.';
  const c = parseNum(v.c);
  if (c == null || !(c > 0) || /log|lg/i.test(v.c)) errors.c = 'The coefficient c must be a positive number.';
  const pq = parseQ(v.p);
  if (!pq || pq.n / pq.d > 10) errors.p = 'p must be a number from 0 to 10, like 2, 3/2 or 0.5.';
  const k = Number(v.k.trim());
  if (!/^-?\d+$/.test(v.k.trim()) || Math.abs(k) > 6) errors.k = 'k must be a whole number from \u22126 to 6 (negative puts the log in the denominator).';
  if (Object.keys(errors).length) return { errors };
  return { pr: { form: 'divide', a, b, f: { c, p: pq, k, exp: null, lower: null } } };
}

function solver(root) {
  let values = { ...PRESETS[0] };
  let preset = PRESETS[0].id;
  let mode = 'quiz';

  const inputs = {};
  const field = (name, label) =>
    (inputs[name] = h('input', {
      class: 'key-input',
      type: 'text',
      autocomplete: 'off',
      spellcheck: 'false',
      'aria-label': label,
      oninput: () => {
        values[name] = inputs[name].value;
        preset = 'custom';
        select.value = 'custom';
        update();
      },
    }));
  const form = h(
    'div',
    { class: 'solver-form' },
    'T(n) =',
    field('a', 'a, the number of subproblems'),
    'T(n /',
    field('b', 'b, the factor the size shrinks by'),
    ') +',
    field('c', 'c, the coefficient of f(n)'),
    '\u00b7 n',
    h('sup', {}, field('p', 'p, the exponent of n in f(n)')),
    '\u00b7 log',
    h('sup', {}, field('k', 'k, the power of log n in f(n)')),
    'n',
  );
  const msg = h('div', { class: 'solver-msg', 'aria-live': 'polite' });
  const note = h('div', { class: 'solver-note' });
  const shown = h('div', { class: 'formula' });
  const host = h('div');

  const select = h(
    'select',
    {
      class: 'select',
      'aria-label': 'Preset recurrence',
      onchange: () => {
        if (select.value === 'custom') return;
        const pre = PRESETS.find((x) => x.id === select.value);
        preset = pre.id;
        if (!pre.other) values = { ...pre };
        fill();
        update();
      },
    },
    PRESETS.map((x) => h('option', { value: x.id, text: x.label })),
    h('option', { value: 'custom', text: 'Custom (your input)' }),
  );
  const modes = segmented(
    [
      { value: 'quiz', label: 'Quiz me on each step' },
      { value: 'show', label: 'Just show the steps' },
    ],
    mode,
    (v) => ((mode = v), update()),
    { label: 'Walkthrough mode' },
  );

  root.append(
    figure(
      {
        title: 'Walk through any recurrence',
        tools: [select, modes],
        note: 'f(n) = c \u00b7 n<sup>p</sup> \u00b7 log<sup>k</sup> n. p can be a fraction such as 3/2; k can be negative (k = \u22121 is n<sup>p</sup> / log n). Constants such as c never change the \u0398 answer.',
      },
      form,
      note,
      msg,
      shown,
      host,
    ),
  );

  const barHost = h('div');
  const barFig = figure(
    {
      title: 'Where the work goes',
      note: 'One bar per level of the recursion tree for n = b<sup>4</sup>, plus the leaves (constants and lower-order terms dropped). The last step colors the levels that dominate.',
    },
    barHost,
  );
  root.append(barFig);
  const player = new Player(barHost, { frames: barFrames(readForm(values).pr, 4), view: { height: 230 } });

  function fill() {
    for (const k of Object.keys(inputs)) {
      inputs[k].value = values[k];
      inputs[k].classList.remove('bad');
    }
  }

  function update() {
    const pre = PRESETS.find((x) => x.id === preset);
    let pr;
    form.classList.toggle('off', !!pre?.other);
    if (pre?.other) {
      pr = pre.other;
      note.textContent = 'This recurrence is not of the form aT(n/b) + f(n), so there are no a, b and f(n) to fill in. Pick another preset to edit the fields again.';
      msg.textContent = '';
    } else {
      note.textContent = '';
      const r = readForm(values);
      for (const k of Object.keys(inputs)) inputs[k].classList.toggle('bad', !!r.errors?.[k]);
      if (r.errors) {
        msg.textContent = Object.values(r.errors).join(' ');
        return;
      }
      msg.textContent = '';
      pr = r.pr;
    }
    shown.innerHTML = recurrenceHtml(pr);
    host.replaceChildren(walkthroughCard(pr, { interactive: mode === 'quiz' }));
    // Bars only for a real divide-and-conquer tree (a >= 1).
    const bars = pr.form === 'divide' && pr.a >= 1;
    barFig.style.display = bars ? '' : 'none';
    if (bars) player.load(barFrames(pr, 4));
  }

  fill();
  update();
}

export default {
  id: 'walkthrough',
  title: 'Walk through any recurrence',
  group: 'Practice',
  blurb: 'Type in any T(n) = aT(n/b) + c n^p log^k n, or pick a classic, and get the full solution step by step, as a quiz or as a worked example.',
  quiz: [],
  render(root) {
    root.append(
      p(
        'Type a recurrence into the fields, or pick one of the classics from the menu. The solver runs the same procedure every time: read off a, b and f(n), compute log<sub>b</sub> a, compare f(n) with n<sup>log<sub>b</sub> a</sup>, pick the case, check regularity in case 3, and conclude. In <b>Quiz me on each step</b> mode it asks you each step before it explains it, so you find out exactly which decision you cannot make yet. <b>Just show the steps</b> turns it into a worked example.',
      ),
      callout(
        'note',
        'Try these on purpose',
        'Set a = 1/2 to see the a \u2265 1 rule reject a recurrence. Set k = \u22121 with p = log<sub>b</sub> a (for example a = 2, b = 2, p = 1) to land in the gap between case 1 and case 2. Pick T(n \u2212 1) + n to see a recurrence that is not of the form aT(n/b) + f(n) at all.',
      ),
    );
    solver(root);
  },
};
