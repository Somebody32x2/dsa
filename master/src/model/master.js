/**
 * Master theorem model (no DOM). Every figure, quiz answer and walkthrough in this compartment
 * comes from here.
 *
 * Notation (Proposition 13.1.22): T(n) = aT(n/b) + f(n), constants a >= 1, b > 1.
 *   1. f(n) is O(n^(log_b a - eps)), eps > 0                 -> T(n) is Theta(n^(log_b a))
 *   2. f(n) is Theta(n^(log_b a) log^k n), integer k >= 0     -> T(n) is Theta(n^(log_b a) log^(k+1) n)
 *   3. f(n) is Omega(n^(log_b a + eps)), eps > 0, and
 *      a f(n/b) <= c f(n) for some c < 1 (large n)          -> T(n) is Theta(f(n))
 *
 * Problem shapes:
 *   { form: 'divide', a, b, f }   a: number (> 0), b: integer >= 2
 *     f: { c, p: Q, k, exp, lower }   f(n) = c * n^p * log^k n (k may be negative), or c * exp^n when exp is set.
 *                                    `lower` is display-only HTML for a lower-order term ("+ n").
 *   { form: 'other', html, why, kind }   recurrences the theorem cannot solve (T(n-1), a = 2^n, negative f).
 */

/* ---------- rationals ---------- */

const gcd = (x, y) => (y === 0 ? Math.abs(x) : gcd(y, x % y));

/** Rational number { n, d } in lowest terms with d > 0. */
export function Q(n, d = 1) {
  if (d < 0) [n, d] = [-n, -d];
  const g = gcd(n, d) || 1;
  return { n: n / g, d: d / g };
}
export const qval = (q) => q.n / q.d;
export const qeq = (x, y) => x.n === y.n && x.d === y.d;
export const qsub = (x, y) => Q(x.n * y.d - y.n * x.d, x.d * y.d);
export const qstr = (q) => (q.d === 1 ? String(q.n) : `${q.n}/${q.d}`);

/* ---------- log_b a ---------- */

/** log_b a for positive integers: { q: Q | null (exact when a^den = b^num), value, html }. */
export function logInfo(a, b) {
  const value = Math.log(a) / Math.log(b);
  let q = null;
  if (Number.isInteger(a) && a >= 1) {
    for (let den = 1; den <= 12 && !q; den++) {
      const num = Math.round(value * den);
      if (num >= 0 && BigInt(a) ** BigInt(den) === BigInt(b) ** BigInt(num)) q = Q(num, den);
    }
  }
  return { q, value, html: q ? qstr(q) : `log<sub>${b}</sub> ${a}` };
}

/* ---------- formatting (HTML) ---------- */

const sup = (s) => `<sup>${s}</sup>`;

/** n^p as HTML; p is Q or { html } for an irrational exponent. */
export function powHtml(p) {
  if (p.html !== undefined && !p.q) return `n${sup(p.html)}`;
  const q = p.q ?? p;
  if (q.n === 0) return '';
  if (q.n === 1 && q.d === 1) return 'n';
  if (q.n === 1 && q.d === 2) return '\u221an';
  return `n${sup(qstr(q))}`;
}

export const logHtml = (k) => (k === 0 ? '' : Math.abs(k) === 1 ? 'log n' : `log${sup(Math.abs(k))} n`);

/** n^p log^k n as HTML ("1" when both are zero). p is Q or a logInfo. */
export function growthHtml(p, k) {
  const pw = powHtml(p);
  const up = [pw, k > 0 ? logHtml(k) : ''].filter(Boolean).join(' ');
  if (k < 0) return `${up || '1'} / ${logHtml(k)}`;
  return up || '1';
}

/** f(n) as written in the recurrence (coefficient and lower-order term included). */
export function fHtml(f) {
  if (f.exp) return `${f.c !== 1 ? f.c : ''}${f.exp}${sup('n')}`;
  const g = growthHtml(f.p, f.k);
  const body = f.c === 1 ? g : g === '1' ? String(f.c) : `${f.c}${g.startsWith('log') ? ' ' : ''}${g}`;
  return f.lower ? `${body} ${f.lower}` : body;
}

/** f(n) with constants and lower-order terms dropped. */
export const fCoreHtml = (f) => (f.exp ? `${f.exp}${sup('n')}` : growthHtml(f.p, f.k));

const coefHtml = (a) => (a === 1 ? '' : Number.isInteger(a) ? String(a) : `(${fracText(a)})`);
function fracText(x) {
  if (Number.isInteger(x)) return String(x);
  for (let d = 2; d <= 12; d++) if (Number.isInteger(x * d)) return `${x * d}/${d}`;
  return String(x);
}

export function recurrenceHtml(pr) {
  if (pr.form === 'other') return pr.html;
  return `T(n) = ${coefHtml(pr.a)}T(n/${pr.b}) + ${fHtml(pr.f)}`;
}

/* ---------- analysis ---------- */

/**
 * Solve a problem with Proposition 13.1.22.
 * Returns { applies, reason?, e, watershed, cmp, case, eps, reg, answer: { html, key } }.
 *   e: logInfo(a, b)   watershed: HTML for n^(log_b a)   cmp: -1 | 0 | 1 (f vs watershed, polynomially)
 *   reg (case 3): { c, cHtml, workHtml }   answer.key identifies the Theta class for comparing answer choices.
 */
export function analyze(pr) {
  if (pr.form === 'other') return { applies: false, reason: pr.why, case: null, answer: NONE };
  const { a, b, f } = pr;
  if (a < 1) {
    return {
      applies: false,
      case: null,
      reason: `The theorem needs a \u2265 1 (at least one recursive call). Here a = ${fracText(a)}.`,
      answer: NONE,
    };
  }
  const e = logInfo(a, b);
  const watershed = powHtml(e) || '1';
  const base = { applies: true, e, watershed };

  if (f.exp) {
    return {
      ...base,
      cmp: 1,
      case: 3,
      eps: null,
      epsHtml: 'any \u03b5 > 0 works: an exponential beats every polynomial',
      reg: {
        c: 0.5,
        cHtml: '1/2 (any c in (0, 1) works for large n)',
        workHtml: `a f(n/b) = ${a}\u00b7${f.exp}${sup(`n/${b}`)}, which is a vanishing fraction of ${f.exp}${sup('n')} as n grows`,
      },
      answer: answerOf({ exp: f.exp }),
    };
  }

  const pv = qval(f.p);
  const diff = e.q ? qval(qsub(f.p, e.q)) : pv - e.value; // f exponent minus watershed exponent
  const cmp = Math.abs(diff) < 1e-12 ? 0 : Math.sign(diff);

  if (cmp === 0) {
    if (f.k >= 0) {
      return { ...base, cmp, case: 2, k: f.k, answer: answerOf({ p: e, k: f.k + 1 }) };
    }
    return {
      ...base,
      cmp,
      case: null,
      applies: false,
      reason: `f(n) = ${fCoreHtml(f)} is smaller than ${watershed}, but only by a ${logHtml(f.k)} factor, not by a polynomial n${sup('\u03b5')}. Case 1 needs a polynomial gap, and case 2 needs k \u2265 0 (here k = ${f.k}). This recurrence falls in the gap between the cases.${f.k === -1 ? ` (A recursion tree shows the answer is \u0398(${growthHtml(e, 0) === '1' ? '' : `${growthHtml(e, 0)} `}log log n): level i costs about ${watershed} / log(n/b${sup('i')}), and those terms add up like a harmonic series.)` : ''}`,
      answer: NONE,
    };
  }

  // A polynomial gap: eps = |diff| works when the log factor pushes the right way, half of it otherwise.
  const gap = Math.abs(diff);
  const logHelps = (cmp < 0 && f.k <= 0) || (cmp > 0 && f.k >= 0);
  const eps = logHelps ? gap : gap / 2;
  // Irrational gaps: write the exact difference and a decimal rounded DOWN, so "f is O(n^(e - eps))" stays true.
  const epsShort = e.q ? qstr(epsQ(f.p, e.q, logHelps)) : floorDec(eps);
  const epsExact = cmp < 0 ? `${e.html} \u2212 ${qstr(f.p)}` : `${qstr(f.p)} \u2212 ${e.html}`;
  const epsHtml = e.q ? epsShort : `${logHelps ? epsExact : `(${epsExact})/2`} \u2248 ${epsShort}`;

  if (cmp < 0) return { ...base, cmp, case: 1, eps, epsHtml, epsShort, answer: answerOf({ p: e, k: 0 }) };

  const bp = b ** pv; // b^p > a because p > log_b a
  const ratio = a / bp;
  const exactBp = Math.abs(bp - Math.round(bp)) < 1e-9;
  const ratioHtml = exactBp ? qstr(Q(a, Math.round(bp))) : `${a}/${round(bp)} \u2248 ${round(ratio)}`;
  // a/b^p is the exact factor between consecutive levels for f = c n^p log^k n with k >= 0. A negative
  // log power or a lower-order term pushes a f(n/b) slightly above (a/b^p) f(n), so any c between
  // a/b^p and 1 works for large n; (1 + a/b^p)/2 is a concrete choice.
  const loose = f.k < 0 || Boolean(f.lower);
  const c = loose ? (1 + ratio) / 2 : ratio;
  const why = f.k < 0 ? '1/log(n/b) is slightly larger than 1/log n' : 'the lower-order term adds a little';
  const cHtml = loose ? `${round(c)} (a bit above ${ratioHtml}, because ${why})` : ratioHtml;
  const reg = { c, ratio, ratioHtml, cHtml, workHtml: workHtml(pr, loose ? round(c) : ratioHtml) };
  return { ...base, cmp, case: 3, eps, epsHtml, epsShort, reg, answer: answerOf({ p: f.p, k: f.k }) };
}

function epsQ(p, e, logHelps) {
  const g = qsub(p, e);
  const abs = Q(Math.abs(g.n), g.d);
  return logHelps ? abs : Q(abs.n, abs.d * 2);
}

/** x > 0 as a short decimal that is never larger than x and never 0. */
function floorDec(x) {
  for (let d = 3; d < 12; d++) {
    const v = Math.floor(x * 10 ** d) / 10 ** d;
    if (v > 0) return String(v);
  }
  return x.toExponential(2);
}

/** a f(n/b) written out for the regularity check (polynomial f), ending in "<= c f(n)". */
function workHtml({ a, b, f }, cShown) {
  const ps = qstr(f.p);
  const bp = ps === '1' ? `${b}` : `${b}${sup(ps)}`;
  const coef = f.c === 1 ? '' : `${f.c}`;
  const nb = `${coef}${ps === '1' ? `(n/${b})` : `(n/${b})${sup(ps)}`}`;
  const lgk = Math.abs(f.k) === 1 ? 'log' : `log${sup(Math.abs(f.k))}`;
  const withLog = (x, arg) => (f.k > 0 ? `${x} ${lgk}(${arg})` : f.k < 0 ? `${x} / ${lgk}(${arg})` : x);
  const lower = f.lower ? ' + (lower-order terms)' : '';
  const notes = [f.k > 0 && `log(n/${b}) \u2264 log n`, f.lower && 'the lower-order terms only matter for small n'].filter(Boolean);
  return `a f(n/b) = ${a}\u00b7${withLog(nb, `n/${b}`)}${lower} = (${a}/${bp})\u00b7${coef}${withLog(powHtml(f.p), `n/${b}`)}${lower} \u2264 ${cShown}\u00b7f(n) for large n${notes.length ? ` (${notes.join('; ')})` : ''}`;
}

const round = (x) => (Math.round(x * 1000) / 1000).toString();

/* ---------- answers ---------- */

export const NONE = { key: 'none', html: 'The master theorem does not apply' };

/** Theta class: { p: Q | logInfo, k } or { exp }. */
export function answerOf(g) {
  if (g.exp) return { key: `exp:${g.exp}`, core: `${g.exp}${sup('n')}`, html: `\u0398(${g.exp}${sup('n')})` };
  const pv = g.p.q ? qval(g.p.q) : g.p.value ?? qval(g.p);
  const core = growthHtml(g.p, g.k);
  return { key: `${pv.toFixed(9)}|${g.k}`, core, html: `\u0398(${core})` };
}

/**
 * Answer choices: the correct one plus plausible mistakes, and "does not apply" last.
 * Returns { choices: [html], answer: index, keys }.
 */
export function answerChoices(pr, rng = Math.random, n = 5) {
  const res = analyze(pr);
  const pool = [];
  const add = (ans) => ans && !pool.some((x) => x.key === ans.key) && ans.key !== 'none' && pool.push(ans);
  if (pr.form === 'divide' && pr.a >= 1) {
    const { a, b, f } = pr;
    const e = logInfo(a, b);
    add(res.answer);
    add(answerOf({ p: e, k: 0 })); // case 1 answer
    add(answerOf({ p: e, k: 1 })); // "add a log" (case 2, k = 0)
    if (!f.exp) {
      add(answerOf({ p: f.p, k: Math.max(f.k, 0) })); // f(n) (case 3), logs kept
      add(answerOf({ p: f.p, k: Math.max(f.k, 0) + 1 })); // f(n) log n
      if (f.k > 0) add(answerOf({ p: e, k: f.k })); // forgot the +1 in case 2
      if (a > 1) add(answerOf({ p: logInfo(b, a), k: 0 })); // flipped log_a b
    } else {
      add(answerOf({ exp: f.exp }));
    }
  } else {
    for (const g of pr.decoys ?? []) add(g);
    if (pr.form === 'divide') {
      // a < 1: plausible-looking answers, but never Θ(f(n)), which is the true solution here
      add(answerOf({ p: pr.f.p, k: 1 }));
      add(answerOf({ p: Q(0), k: 1 }));
      add(answerOf({ p: Q(0), k: 0 }));
    }
  }
  const correct = pool.find((x) => x.key === res.answer.key);
  const wrong = shuffle(pool.filter((x) => x !== correct), rng).slice(0, correct ? n - 2 : n - 1);
  const list = shuffle([...(correct ? [correct] : []), ...wrong], rng);
  list.push(NONE);
  return { choices: list.map((x) => x.html), keys: list.map((x) => x.key), answer: list.findIndex((x) => x.key === res.answer.key) };
}

/* ---------- walkthrough ---------- */

export const CASES = ['Case 1', 'Case 2', 'Case 3', 'Does not apply'];
export const COMPARE = [
  `f(n) is polynomially smaller (by a factor n${sup('\u03b5')})`,
  `f(n) matches it up to a log${sup('k')} n factor, k \u2265 0`,
  `f(n) is polynomially larger (by a factor n${sup('\u03b5')})`,
  'None of these: the gap is not polynomial',
];

/**
 * Guided solution, one step per decision. Each step: { id, title, ask?, explain }.
 *   ask: { type: 'mcq', prompt, choices, answer } | { type: 'input', prompt, fields: [{ label, check(text) }] }
 * Steps stop early when the theorem does not apply.
 */
export function walkthrough(pr) {
  const res = analyze(pr);
  const steps = [];
  if (pr.form === 'other') {
    steps.push({
      id: 'form',
      title: 'Check the form',
      ask: { type: 'mcq', prompt: 'Does this recurrence have the form aT(n/b) + f(n) with constants a \u2265 1, b > 1?', choices: ['Yes', 'No'], answer: 1 },
      explain: pr.why,
    });
    steps.push(conclude(res));
    return steps;
  }
  const { a, b, f } = pr;
  steps.push({
    id: 'read',
    title: 'Read off a, b and f(n)',
    ask: {
      type: 'input',
      prompt: `Match ${recurrenceHtml(pr)} against aT(n/b) + f(n).`,
      fields: [
        { label: 'a', check: (t) => near(parseNum(t), a) },
        { label: 'b', check: (t) => near(parseNum(t), b) },
      ],
    },
    explain: `a = ${fracText(a)} (subproblems per call), b = ${b} (each has size n/${b}), f(n) = ${fHtml(f)} (work outside the recursive calls).${f.c !== 1 || f.lower ? ` For \u0398 only the growth of f matters: f(n) = \u0398(${fCoreHtml(f)}).` : ''}`,
  });
  if (a < 1) {
    steps.push({
      id: 'form',
      title: 'Check the conditions',
      ask: { type: 'mcq', prompt: 'Does the theorem allow this value of a?', choices: ['Yes', 'No'], answer: 1 },
      explain: res.reason,
    });
    steps.push(conclude(res));
    return steps;
  }
  const e = res.e;
  steps.push({
    id: 'watershed',
    title: `Compute log<sub>b</sub> a`,
    ask: {
      type: 'input',
      prompt: `log<sub>${b}</sub> ${a} = ? (a fraction, a decimal, or log${'_'}b a)`,
      fields: [{ label: `log<sub>${b}</sub> ${a}`, check: (t) => near(parseNum(t), e.value, 0.02) }],
    },
    explain: e.q
      ? `log<sub>${b}</sub> ${a} = ${qstr(e.q)}, because ${b}${sup(qstr(e.q))} = ${a}. So compare f(n) against n${sup('log<sub>b</sub> a')} = ${res.watershed}.`
      : `${a} is not a power of ${b}, so log<sub>${b}</sub> ${a} \u2248 ${round(e.value)} (${b}${sup(Math.floor(e.value))} = ${b ** Math.floor(e.value)} < ${a} < ${b ** Math.ceil(e.value)} = ${b}${sup(Math.ceil(e.value))}). Keep it exact in the answer: n${sup(e.html)}.`,
  });
  const cmpIndex = res.applies ? res.cmp + 1 : 3;
  steps.push({
    id: 'compare',
    title: `Compare f(n) with ${res.watershed}`,
    ask: { type: 'mcq', prompt: `f(n) = \u0398(${fCoreHtml(f)}) against n${sup('log<sub>b</sub> a')} = ${res.watershed}:`, choices: COMPARE, answer: cmpIndex },
    explain: compareExplain(pr, res),
  });
  steps.push({
    id: 'case',
    title: 'Pick the case',
    ask: { type: 'mcq', prompt: 'Which case of the theorem applies?', choices: CASES, answer: res.case ? res.case - 1 : 3 },
    explain: caseExplain(res),
  });
  if (res.case === 3) {
    steps.push({
      id: 'regularity',
      title: 'Check the regularity condition',
      ask: f.exp
        ? { type: 'mcq', prompt: 'Is a f(n/b) \u2264 c f(n) for some constant c < 1, for large n?', choices: ['Yes', 'No'], answer: 0 }
        : {
            type: 'input',
            prompt: `Case 3 also needs a f(n/b) \u2264 c f(n) with c < 1. Write a f(n/b) as (constant) \u00b7 f(n). What is the constant a/b${sup('p')}?`,
            fields: [{ label: 'c', check: (t) => near(parseNum(t), res.reg.ratio, 0.01 * res.reg.ratio + 0.0005) }],
          },
      explain: `${res.reg.workHtml}. Since c = ${res.reg.cHtml} < 1, the condition holds: the work shrinks by a constant factor each level down, so the root's f(n) dominates.`,
    });
  }
  steps.push(conclude(res));
  return steps;
}

function conclude(res) {
  return {
    id: 'answer',
    title: 'Conclude',
    explain: res.applies
      ? `T(n) is <b>${res.answer.html}</b>.`
      : `<b>The master theorem does not apply.</b> Use a recursion tree or substitution instead.`,
  };
}

function compareExplain(pr, res) {
  const { f } = pr;
  const w = res.watershed;
  const fc = fCoreHtml(f);
  if (f.exp) return `${fc} grows faster than any polynomial, so it is polynomially larger than ${w}.`;
  if (!res.applies) return res.reason;
  const pe = res.e.q ? qstr(res.e.q) : res.e.html;
  const pf = qstr(f.p);
  if (res.cmp === 0) {
    return `The exponents match: n${sup(pf)} against n${sup(pe)}. What is left is log${sup(f.k)} n with k = ${f.k} \u2265 0${f.k === 0 ? ' (no log at all is k = 0)' : ''}.`;
  }
  const dir = res.cmp < 0 ? 'smaller' : 'larger';
  const factor = res.epsShort === '1' ? 'n' : `n${sup(res.epsShort)}`;
  return `Compare exponents: ${pf} ${res.cmp < 0 ? '<' : '>'} ${pe}${res.e.q ? '' : ` \u2248 ${round(res.e.value)}`}. f(n) is ${dir} by a factor of ${factor} or more${f.k !== 0 ? `; the ${logHtml(f.k)} factor cannot close a polynomial gap` : ''}.`;
}

function caseExplain(res) {
  if (!res.applies) return 'None of the three cases fits, so the theorem gives no answer.';
  if (res.case === 1) return `Case 1: f(n) is O(n${sup(`log<sub>b</sub> a \u2212 \u03b5`)}) with \u03b5 = ${res.epsHtml}. The leaves dominate: T(n) is \u0398(${res.watershed}).`;
  if (res.case === 2) return `Case 2 with k = ${res.k}: every level of the recursion tree costs about the same, and there are about log n levels, so multiply by one more log: ${res.answer.html}.`;
  return `Case 3: f(n) is \u03a9(n${sup(`log<sub>b</sub> a + \u03b5`)}) with \u03b5 = ${res.epsHtml ?? '1'}. The root dominates, provided the regularity condition holds.`;
}

/* ---------- input parsing ---------- */

const near = (x, y, tol = 1e-9) => x != null && Math.abs(x - y) <= tol;

/** "3", "1.5", "3/2", "log_2 3", "log2(3)", "lg 3" -> number, else null. */
export function parseNum(text) {
  const t = String(text).trim().toLowerCase().replace(/\s+/g, ' ');
  if (/^-?\d*\.?\d+$/.test(t)) return parseFloat(t);
  const fr = t.match(/^(-?\d+)\s*\/\s*(\d+)$/);
  if (fr) return Number(fr[1]) / Number(fr[2]);
  const lg = t.match(/^(?:log\s*_?\s*\(?\s*(\d+(?:\.\d+)?)\s*\)?|lg)\s*\(?\s*(\d+(?:\.\d+)?)\s*\)?$/);
  if (lg) return Math.log(Number(lg[2])) / Math.log(lg[1] ? Number(lg[1]) : 2);
  return null;
}

/* ---------- recursion tree numbers ---------- */

/** Numeric value of f at size m (log base 2; logs of sizes below 2 count as 1). */
export function fAt(f, m) {
  if (f.exp) return f.exp ** m;
  return m ** qval(f.p) * Math.max(1, Math.log2(m)) ** f.k;
}

/**
 * Per-level work for n = b^depth: [{ level, nodes, size, each, total }]; the last row is the leaves
 * (nodes = a^depth, each T(1) = 1). Constants and lower-order terms of f are dropped.
 */
export function levels(pr, depth) {
  const { a, b, f } = pr;
  const rows = [];
  for (let i = 0; i < depth; i++) {
    const size = b ** (depth - i);
    const nodes = a ** i;
    rows.push({ level: i, nodes, size, each: fAt(f, size), total: nodes * fAt(f, size), leaf: false });
  }
  rows.push({ level: depth, nodes: a ** depth, size: 1, each: 1, total: a ** depth, leaf: true });
  return rows;
}

/** Exact T(n) on powers of b with T(1) = 1, for checking answers numerically. */
export function solveExact(pr, depth) {
  let t = 1;
  for (let j = 1; j <= depth; j++) t = pr.a * t + fAt(pr.f, pr.b ** j);
  return t;
}

/** Numeric value of a Theta class at n. */
export function answerAt(res, n) {
  const k = Number(res.answer.key.split('|')[1]);
  const p = Number(res.answer.key.split('|')[0]);
  return n ** p * Math.max(1, Math.log2(n)) ** k;
}

/* ---------- generator ---------- */

/** Seeded RNG (mulberry32): same seed, same problem. */
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (r, xs) => xs[Math.floor(r() * xs.length)];
export function shuffle(xs, r = Math.random) {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const PAIRS_INT = [[1, 2], [2, 2], [4, 2], [8, 2], [16, 2], [1, 3], [3, 3], [9, 3], [27, 3], [4, 4], [16, 4], [64, 4], [8, 8], [64, 8], [9, 9], [81, 9], [5, 5], [25, 5], [7, 7], [49, 7], [6, 6]];
const PAIRS_FRAC = [[2, 4], [8, 4], [2, 8], [4, 8], [3, 9], [27, 9], [4, 16], [3, 2], [5, 2], [6, 2], [7, 2], [2, 3], [4, 3], [5, 4], [3, 4], [6, 4], [10, 3]];
const P_INT = [Q(0), Q(1), Q(2), Q(3), Q(4)];
const P_FRAC = [Q(1, 2), Q(3, 2), Q(5, 2), Q(1, 3), Q(2, 3)];

export const DEFAULTS = { cases: [1, 2, 3, 'none'], fractions: true, logs: true, dressing: true };

/** Problems the theorem cannot solve, with the reason and decoy answers. */
const OTHERS = [
  {
    kind: 'subtract',
    html: 'T(n) = T(n \u2212 1) + n',
    why: 'The subproblem has size n \u2212 1, not n/b. Subtracting a constant does not shrink n by a constant factor, so there is no b > 1. (Unrolling gives \u0398(n<sup>2</sup>).)',
    // Decoys are never the true solution: "does not apply" must be the only defensible choice.
    decoys: [{ p: Q(1), k: 1 }, { p: Q(1), k: 0 }, { p: Q(0), k: 1 }],
  },
  {
    kind: 'subtract',
    html: 'T(n) = 2T(n \u2212 1) + 1',
    why: 'The subproblem has size n \u2212 1, not n/b, so the theorem does not apply. (Unrolling gives \u0398(2<sup>n</sup>).)',
    decoys: [{ p: Q(1), k: 0 }, { p: Q(1), k: 1 }, { p: Q(0), k: 1 }],
  },
  {
    kind: 'variable-a',
    html: 'T(n) = 2<sup>n</sup>T(n/2) + n<sup>n</sup>',
    why: 'a = 2<sup>n</sup> is not a constant. The theorem needs the number of subproblems to be the same at every level.',
    decoys: [{ p: Q(1), k: 1 }, { exp: 2 }, { p: Q(2), k: 0 }],
  },
  {
    kind: 'variable-a',
    html: 'T(n) = nT(n/2) + n',
    why: 'a = n is not a constant, so there is no fixed log<sub>b</sub> a to compare against.',
    decoys: [{ p: Q(1), k: 1 }, { p: Q(2), k: 0 }, { p: Q(1), k: 0 }],
  },
  {
    kind: 'negative-f',
    html: 'T(n) = 64T(n/8) \u2212 n<sup>2</sup> log n',
    why: 'f(n) = \u2212n<sup>2</sup> log n is negative. f(n) is the cost of dividing and combining, which cannot be negative.',
    decoys: [{ p: Q(2), k: 1 }, { p: Q(2), k: 2 }, { p: Q(2), k: 0 }],
  },
];

/**
 * Generate a problem. opts: { cases: [1, 2, 3, 'none'], fractions, logs, dressing }.
 *   fractions: allow log_b a that is a fraction or irrational, and fractional exponents in f
 *   logs:      allow log^k n factors in f
 *   dressing:  allow coefficients and lower-order terms in f ("3n^2 + n")
 */
export function generate(r, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const want = pick(r, o.cases.length ? o.cases : DEFAULTS.cases);
  if (want === 'none') return generateNone(r, o);

  for (let tries = 0; tries < 200; tries++) {
    const [a, b] = pick(r, o.fractions && r() < 0.45 ? PAIRS_FRAC : PAIRS_INT);
    const e = logInfo(a, b);
    let p;
    let k = 0;
    if (want === 2) {
      if (!e.q) continue;
      p = e.q;
      k = o.logs && r() < 0.45 ? pick(r, [1, 1, 2]) : 0;
    } else {
      const ps = (o.fractions ? [...P_INT, ...P_FRAC] : P_INT).filter((q) => {
        const d = qval(q) - e.value;
        return want === 1 ? d < -1e-9 && d >= -2.5 : d > 1e-9 && d <= 2.5;
      });
      if (!ps.length) continue;
      p = pick(r, ps);
      k = o.logs && r() < 0.35 ? 1 : 0;
    }
    const f = { c: 1, p, k, exp: null, lower: null };
    if (o.dressing) dress(r, f);
    return { form: 'divide', a, b, f };
  }
  throw new Error(`could not generate case ${want}`);
}

function dress(r, f) {
  if (r() < 0.3) f.c = pick(r, [2, 3, 5]);
  const pv = qval(f.p);
  if (r() < 0.3 && f.k >= 0) {
    if (pv > 1) f.lower = pick(r, ['+ n', '+ n log n', '+ 1']);
    else if (pv > 0) f.lower = '+ 1';
  }
}

function generateNone(r, o) {
  const roll = r();
  if (roll < 0.45) {
    // gap: f = n^(log_b a) / log n
    const [a, b] = pick(r, PAIRS_INT.filter(([a]) => a > 1));
    return { form: 'divide', a, b, f: { c: 1, p: logInfo(a, b).q, k: -1, exp: null, lower: null } };
  }
  if (roll < 0.55) return { form: 'divide', a: 0.5, b: 2, f: { c: 1, p: Q(1), k: 0, exp: null, lower: null } };
  const other = pick(r, OTHERS);
  return { form: 'other', ...other, decoys: other.decoys.map(answerOf) };
}
