import { h, icon } from '../../../shared/ui/dom.js';
import {
  analyze,
  answerChoices,
  answerOf,
  fCoreHtml,
  generate,
  logInfo,
  qstr,
  recurrenceHtml,
  rng,
  walkthrough,
  DEFAULTS,
} from '../model/master.js';

/* ---------- small shared pieces ---------- */

/** 1 | 2 | 3 | 'none' for an analysis. */
export const caseOf = (res) => res.case ?? 'none';

/** Inline colored tag for a case key (blue / yellow / rust / red). */
export const caseTag = (key) =>
  key === 'none' ? '<span class="tg tg-none">does not apply</span>' : `<span class="tg tg-case${key}">case ${key}</span>`;

const W = '<span class="m">n<sup>log<sub>b</sub> a</sup></span>';

/** One sentence: why the answer is what it is (from analyze). */
export function whyLine(pr, res) {
  if (!res.applies) return res.reason;
  const f = `f(n) = \u0398(${fCoreHtml(pr.f)})`;
  const w = `${W} = ${res.watershed}`;
  const eps = res.eps == null ? res.epsHtml : `\u03b5 = ${res.epsHtml}`;
  if (res.case === 1) return `${f} is polynomially smaller than ${w} (${eps}), so the leaves dominate: T(n) is ${res.answer.html}.`;
  if (res.case === 2) {
    return `${f} matches ${w} up to log<sup>k</sup> n with k = ${res.k}, so each of the about log n levels costs the same. One more log: T(n) is ${res.answer.html}.`;
  }
  return `${f} is polynomially larger than ${w} (${eps}), and a f(n/b) \u2264 c f(n) with c = ${res.reg.cHtml}, so the root dominates: T(n) is ${res.answer.html}.`;
}

/**
 * What a wrong answer choice most likely assumed, in one sentence (null when nothing specific fits).
 * key: the chosen answer's key from answerChoices().
 */
export function diagnose(pr, res, key) {
  if (key === res.answer.key) return null;
  if (key === 'none') {
    return `The theorem does apply here: the recurrence has the form aT(n/b) + f(n) with a \u2265 1, and ${caseTag(res.case)} fits.`;
  }
  if (!res.applies) return 'The theorem gives no answer for this recurrence, so any \u0398 read off from it is a guess.';
  if (pr.form !== 'divide' || pr.f.exp) return null;
  const { a, b, f } = pr;
  const e = res.e;
  const is = (g) => answerOf(g).key === key;
  const pf = qstr(f.p);
  const pe = e.q ? qstr(e.q) : e.html;
  const vs = res.cmp < 0 ? 'polynomially smaller than' : res.cmp > 0 ? 'polynomially larger than' : 'equal, up to log factors, to';
  const fIs = `f(n) = \u0398(${fCoreHtml(f)}) is ${vs} ${res.watershed}`;
  // A flipped log can coincide with f(n) itself (4T(n/2) + \u221an); then "you took the case 3 answer" is the likelier mistake.
  if (a > 1 && a !== b && is({ p: logInfo(b, a), k: 0 }) && !is({ p: f.p, k: Math.max(f.k, 0) })) {
    return `That is n<sup>log<sub>${a}</sub> ${b}</sup>: the logarithm is flipped. The exponent is log<sub>b</sub> a = log<sub>${b}</sub> ${a} (base b, the shrink factor; a, the number of calls, inside).`;
  }
  if (res.case === 2 && is({ p: e, k: f.k })) {
    return f.k > 0
      ? `That is f(n) itself. Case 2 adds one more log: k = ${f.k} becomes k + 1 = ${f.k + 1}.`
      : `That drops the log n. In case 2 each of the about log n levels costs \u0398(f(n)), so the total is f(n) times log n.`;
  }
  if (res.case === 2 && key.split('|')[0] === answerOf({ p: e, k: 0 }).key.split('|')[0]) {
    return `The power of n is right, but the log is not: case 2 turns log<sup>k</sup> n with k = ${f.k} into log<sup>${f.k + 1}</sup> n.`;
  }
  if (is({ p: e, k: 0 })) return `That is ${W}, the case 1 answer. Case 1 needs f(n) polynomially smaller than ${W}, but ${fIs}.`;
  if (f.k >= 0 && is({ p: f.p, k: f.k })) return `That is \u0398(f(n)), the case 3 answer. Case 3 needs f(n) polynomially larger than ${W}, but ${fIs}.`;
  if (is({ p: f.p, k: Math.max(f.k, 0) + 1 }) || is({ p: e, k: 1 })) {
    return `That multiplies by log n, which is the case 2 rule. Case 2 needs matching exponents, but here ${pf} ${res.cmp < 0 ? '<' : '>'} ${pe}${e.q ? '' : ` \u2248 ${Math.round(e.value * 1000) / 1000}`}.`;
  }
  return null;
}

/* ---------- walkthrough card ---------- */

/**
 * The guided solution as a list of steps (walkthrough(pr) from the model).
 *   interactive: true  -> one step at a time; each step with a question must be answered (2 misses or
 *                         "Show me" reveal it). Missed steps stay marked red.
 *   interactive: false -> every step with its answer and explanation (read-only).
 *   focus: step id to highlight (read-only use), onDone({ missed: [step index] }) when the last step shows.
 *   autofocus: put the cursor in the first input of the first step too (later steps always get it).
 * The returned element has .pick(index) so a keyboard handler can answer the current multiple-choice step.
 */
export function walkthroughCard(pr, { interactive = true, focus = null, onDone = null, autofocus = false } = {}) {
  const steps = walkthrough(pr);
  const res = analyze(pr);
  const root = h('div', { class: `wt${interactive ? ' interactive' : ''}` });
  const list = h('ol', { class: 'wt-steps' });
  const summary = h('div', { class: 'wt-summary', 'aria-live': 'polite' });
  root.append(list, summary);
  const missed = [];
  let current = null;
  root.pick = (k) => current?.pick?.(k);

  const finish = () => {
    current = null;
    if (interactive) {
      summary.innerHTML = missed.length
        ? `Where it went wrong: ${missed.map((i) => `step ${i + 1} (${steps[i].title})`).join(', ')}. Those are the steps to rehearse.`
        : 'Every step right.';
    }
    onDone?.({ missed: [...missed] });
  };

  const show = (i) => {
    if (i >= steps.length) return finish();
    const li = step(steps[i], i, () => show(i + 1));
    list.append(li);
    if (interactive && i > 0) li.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  };

  function step(s, i, next) {
    const head = h('div', { class: 'wt-head' }, h('span', { class: 'wt-title', html: s.title }));
    const body = h('div', { class: 'wt-body' });
    const li = h('li', { class: `wt-step${s.id === focus ? ' focus' : ''}`, 'data-step': s.id }, head, body);
    if (s.id === focus) head.append(h('span', { class: 'tg', text: 'this step catches it' }));

    if (!s.ask) {
      // conclusion
      li.classList.add('final');
      body.append(h('div', { class: 'wt-answer', html: `${caseTag(caseOf(res))} ${s.explain}` }));
      if (interactive) setTimeout(next, 0);
      return li;
    }

    const explain = (verdict, cls) =>
      h('div', { class: `feedback ${cls}` }, verdict && h('div', { class: 'verdict', html: verdict }), h('div', { html: s.explain }));
    body.append(h('div', { class: 'wt-prompt', html: s.ask.prompt }));

    if (!interactive) {
      li.classList.add('shown');
      const ans = s.ask.type === 'mcq' ? `Answer: ${s.ask.choices[s.ask.answer]}` : null;
      body.append(explain(ans, 'shown'));
      return li;
    }

    li.classList.add('now');
    const msg = h('div', { class: 'wt-msg', 'aria-live': 'polite' });
    const actions = h('div', { class: 'wt-actions' });
    let misses = 0;
    let settled = false;
    const miss = () => {
      misses++;
      if (!missed.includes(i)) missed.push(i);
      li.classList.add('missed');
      if (!head.querySelector('.wt-mark')) head.append(h('span', { class: 'wt-mark', text: 'you missed this step' }));
    };
    const settle = (byLearner, reveal) => {
      if (settled) return;
      settled = true;
      current = null;
      li.classList.remove('now');
      if (!li.classList.contains('missed')) li.classList.add('ok');
      reveal?.();
      actions.remove();
      msg.remove();
      const verdict = byLearner ? (misses ? 'Right, on a later try.' : 'Correct.') : 'Here is this step:';
      body.append(explain(verdict, byLearner ? 'ok' : 'shown'));
      next();
    };
    const showMe = h('button', { class: 'btn ghost small', text: 'Show me', onclick: () => (miss(), giveUp()) });
    let giveUp;

    if (s.ask.type === 'mcq') {
      const { choices, answer } = s.ask;
      const buttons = choices.map((c, k) =>
        h('button', { class: 'choice', onclick: () => tryChoice(k) }, h('span', { class: 'letter', text: String(k + 1) }), h('span', { html: c })),
      );
      const lock = () => buttons.forEach((b, j) => ((b.disabled = true), j === answer && b.classList.add('right')));
      giveUp = () => settle(false, lock);
      const tryChoice = (k) => {
        if (settled || buttons[k].disabled) return;
        if (k === answer) return settle(true, lock);
        miss();
        buttons[k].classList.add('wrong');
        buttons[k].disabled = true;
        if (misses >= 2) return giveUp();
        msg.className = 'wt-msg bad';
        msg.textContent = 'Not quite. Try another option, or press Show me.';
      };
      current = { pick: (k) => k < buttons.length && tryChoice(k) };
      body.append(h('div', { class: 'choices' }, buttons));
      actions.append(showMe);
    } else {
      const fields = s.ask.fields.map((f) => {
        const input = h('input', {
          class: 'text-input',
          type: 'text',
          autocomplete: 'off',
          spellcheck: 'false',
          'aria-label': f.label.replace(/<[^>]+>/g, ''),
          onkeydown: (e) => e.key === 'Enter' && (e.preventDefault(), check()),
        });
        return { f, input, row: h('label', { class: 'wt-field' }, h('span', { class: 'm', html: `${f.label} =` }), input) };
      });
      const lock = () => fields.forEach(({ input }) => (input.disabled = true));
      giveUp = () => settle(false, lock);
      const check = () => {
        if (settled) return;
        if (fields.some(({ input }) => !input.value.trim())) {
          msg.className = 'wt-msg bad';
          msg.textContent = fields.length > 1 ? 'Fill in every box first.' : 'Type an answer first.';
          return;
        }
        const ok = fields.map(({ f, input }) => f.check(input.value));
        fields.forEach(({ input }, j) => {
          input.classList.toggle('ok', ok[j]);
          input.classList.toggle('bad', !ok[j]);
        });
        if (ok.every(Boolean)) return settle(true, lock);
        miss();
        if (misses >= 2) return giveUp();
        const wrong = fields.filter((_, j) => !ok[j]).map(({ f }) => f.label);
        msg.className = 'wt-msg bad';
        msg.innerHTML = `Not quite: ${wrong.join(' and ')} ${wrong.length > 1 ? 'are' : 'is'} off. Try again, or press Show me.`;
      };
      body.append(h('div', { class: 'wt-fields' }, fields.map((x) => x.row)));
      actions.append(h('button', { class: 'btn small', text: 'Check', onclick: check }), showMe);
      current = null;
      if (i > 0 || autofocus) setTimeout(() => fields[0].input.isConnected && fields[0].input.focus({ preventScroll: true }), 0);
    }
    body.append(actions, msg);
    return li;
  }

  if (interactive) show(0);
  else steps.forEach((s, i) => list.append(step(s, i, () => {})));
  return root;
}

/* ---------- the practice tool ---------- */

const STORE = 'master.practice.v1';
const CASE_KEYS = [1, 2, 3, 'none'];

function loadStats() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE));
    return { byCase: {}, best: 0, ...s };
  } catch {
    return { byCase: {}, best: 0 };
  }
}

const newSeed = () => 1 + Math.floor(Math.random() * 99999);

/**
 * Generated master-theorem problems in the quiz card style. A wrong answer starts the guided
 * walkthrough inline. Stats: streak and session score in memory, per-case accuracy in localStorage.
 */
export function practice({ title = 'Practice' } = {}) {
  const settings = { ...DEFAULTS, cases: [...DEFAULTS.cases] };
  const session = { attempted: 0, correct: 0, streak: 0 };
  const stats = loadStats();

  const card = h('section', { class: 'quiz practice reveal' });
  const count = h('span', { class: 'quiz-count' });
  const head = h('div', { class: 'quiz-head' }, h('span', { class: 'eyebrow', text: title }), h('span', { class: 'spacer' }), count);
  const body = h('div', { class: 'quiz-body' });
  const statsLine = h('div', { class: 'practice-stats', 'aria-live': 'polite' });
  const actions = h('div', { class: 'practice-actions' });
  const foot = h('div', { class: 'quiz-foot' }, statsLine, actions);

  let pr, res, choices, checkBtn;
  let phase = 'choose'; // choose | right | walk | done
  let selected = -1;
  let buttons = [];
  let wt = null;
  let primary = null; // action for Enter

  /* settings */
  const caseChips = CASE_KEYS.map((key) => {
    const b = h('button', {
      class: `chip case-${key} on`,
      'aria-pressed': 'true',
      text: key === 'none' ? 'Does not apply' : `Case ${key}`,
      onclick: () => {
        const on = settings.cases.includes(key);
        if (on && settings.cases.length === 1) return; // keep at least one case
        settings.cases = CASE_KEYS.filter((k) => (k === key ? !on : settings.cases.includes(k)));
        b.classList.toggle('on', !on);
        b.setAttribute('aria-pressed', String(!on));
        changed();
      },
    });
    return b;
  });
  const option = (label, prop) => {
    const b = h('button', {
      class: `chip${settings[prop] ? ' on' : ''}`,
      'aria-pressed': String(settings[prop]),
      text: label,
      onclick: () => {
        settings[prop] = !settings[prop];
        b.classList.toggle('on', settings[prop]);
        b.setAttribute('aria-pressed', String(settings[prop]));
        changed();
      },
    });
    return b;
  };
  const settingsRow = h(
    'div',
    { class: 'practice-settings' },
    h('div', { class: 'practice-group', role: 'group', 'aria-label': 'Cases to practice' }, caseChips),
    h(
      'div',
      { class: 'practice-group', role: 'group', 'aria-label': 'Problem features' },
      option('Fractional & irrational exponents', 'fractions'),
      option('Log factors', 'logs'),
      option('Coefficients & lower-order terms', 'dressing'),
    ),
  );
  // New settings take effect right away unless a problem is already answered (then on the next one).
  const changed = () => phase === 'choose' && fresh();

  card.append(head, settingsRow, body, foot);

  /* stats */
  const renderStats = () => {
    const per = CASE_KEYS.filter((k) => stats.byCase[k]?.[1] > 0).map((k) => {
      const [c, n] = stats.byCase[k];
      return `<span class="practice-case">${caseTag(k)} ${c}/${n}</span>`;
    });
    statsLine.innerHTML =
      `<span>Streak <b>${session.streak}</b>${stats.best > 0 ? ` (best ${stats.best})` : ''}</span>` +
      `<span>This session: <b>${session.correct}</b> of ${session.attempted} right</span>` +
      (per.length ? `<span class="practice-per" title="All-time accuracy per case">all time: ${per.join('')}</span>` : '');
  };
  const record = (correct) => {
    session.attempted++;
    if (correct) session.correct++;
    session.streak = correct ? session.streak + 1 : 0;
    stats.best = Math.max(stats.best, session.streak);
    const key = caseOf(res);
    const [c, n] = stats.byCase[key] ?? [0, 0];
    stats.byCase[key] = [c + (correct ? 1 : 0), n + 1];
    try {
      localStorage.setItem(STORE, JSON.stringify(stats));
    } catch {
      /* storage full or blocked: keep the session numbers only */
    }
    renderStats();
  };

  /* problems */
  function load(seed, force) {
    const opts = { ...settings, cases: force ? [force] : settings.cases };
    try {
      const r = rng(seed);
      pr = generate(r, opts);
      choices = answerChoices(pr, r);
    } catch {
      return load(newSeed(), force); // a seed that cannot satisfy the settings: take another
    }
    res = analyze(pr);
    phase = 'choose';
    selected = -1;
    wt = null;
    count.textContent = `Problem #${seed}${force ? ` \u00b7 similar (${force === 'none' ? 'does not apply' : `case ${force}`})` : ''}`;
    buttons = choices.choices.map((c, k) =>
      h('button', { class: 'choice', onclick: () => choose(k) }, h('span', { class: 'letter', text: String(k + 1) }), h('span', { html: c })),
    );
    checkBtn = h('button', { class: 'btn', html: `Check ${icon.check}`, disabled: true, onclick: () => check() });
    body.replaceChildren(
      h('div', { class: 'formula', html: recurrenceHtml(pr) }),
      h('div', { class: 'prompt', html: 'Solve it with the master theorem. T(n) is:' }),
      h('div', { class: 'choices' }, buttons),
    );
    actions.replaceChildren(checkBtn);
    primary = () => selected >= 0 && check();
  }
  const fresh = () => load(newSeed(), null);

  function choose(k) {
    if (phase !== 'choose' || k >= buttons.length) return;
    selected = k;
    buttons.forEach((b, j) => b.classList.toggle('selected', j === k));
    checkBtn.disabled = false;
  }

  function check() {
    if (phase !== 'choose' || selected < 0) return;
    const correct = selected === choices.answer;
    buttons.forEach((b, j) => {
      b.disabled = true;
      b.classList.remove('selected');
      if (j === choices.answer) b.classList.add('right');
      else if (j === selected) b.classList.add('wrong');
    });
    record(correct);
    const next = h('button', { class: 'btn', html: `Next problem ${icon.arrow}`, onclick: fresh });
    if (correct) {
      phase = 'right';
      body.append(
        h(
          'div',
          { class: 'feedback ok' },
          h('div', { class: 'verdict', text: 'Correct.' }),
          h('div', { html: `${caseTag(caseOf(res))} ${whyLine(pr, res)}` }),
        ),
      );
      let open = null;
      const solution = h('button', {
        class: 'btn ghost',
        text: 'Show the full solution',
        onclick: () => {
          if (open) {
            open.remove();
            open = null;
            solution.textContent = 'Show the full solution';
            return;
          }
          open = walkthroughCard(pr, { interactive: false });
          body.append(open);
          solution.textContent = 'Hide the solution';
        },
      });
      actions.replaceChildren(solution, next);
      primary = fresh;
      return;
    }
    phase = 'walk';
    const why = diagnose(pr, res, choices.keys[selected]);
    body.append(
      h(
        'div',
        { class: 'feedback bad' },
        h('div', { class: 'verdict', text: 'Not quite.' }),
        h('div', { html: `You picked ${choices.choices[selected]}.${why ? ` ${why}` : ''} Work through it one step at a time; each step checks one decision.` }),
      ),
    );
    const missedCase = caseOf(res);
    wt = walkthroughCard(pr, {
      interactive: true,
      autofocus: true,
      onDone: () => {
        phase = 'done';
        actions.replaceChildren(h('button', { class: 'btn ghost', text: 'Try a similar problem', onclick: () => load(newSeed(), missedCase) }), next);
        primary = fresh;
      },
    });
    body.append(wt);
    if (phase === 'walk') {
      actions.replaceChildren(h('button', { class: 'btn ghost', text: 'Skip to the next problem', onclick: fresh }));
      primary = null;
    }
  }

  /* keyboard: 1-9 picks a choice (or answers the current walkthrough question), Enter checks / goes on */
  const onKey = (e) => {
    if (!card.isConnected) return document.removeEventListener('keydown', onKey);
    if (e.altKey || e.ctrlKey || e.metaKey || e.target.closest?.('input, textarea, select')) return;
    const r = card.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    if (/^[1-9]$/.test(e.key)) {
      const k = Number(e.key) - 1;
      if (phase === 'choose') choose(k);
      else if (phase === 'walk') wt?.pick(k);
      else return;
      e.preventDefault();
    } else if (e.key === 'Enter') {
      const btn = e.target.closest?.('button, a');
      if (btn && !btn.classList.contains('choice')) return; // a focused button handles its own Enter
      if (!primary) return;
      e.preventDefault();
      primary();
    }
  };
  document.addEventListener('keydown', onKey);

  renderStats();
  fresh();
  return card;
}
