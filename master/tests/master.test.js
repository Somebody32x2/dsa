import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Q, analyze, answerChoices, generate, rng, walkthrough, logInfo, parseNum, solveExact, answerAt } from '../src/model/master.js';

const strip = (s) => s.replace(/<[^>]+>/g, '');
const P = (a, b, p, k = 0, extra = {}) => ({ form: 'divide', a, b, f: { c: 1, p, k, exp: null, lower: null, ...extra } });

test('textbook recurrences get the textbook answers', () => {
  const cases = [
    [P(2, 2, Q(1)), 2, '\u0398(n log n)'], // merge sort
    [P(1, 2, Q(0)), 2, '\u0398(log n)'], // binary search
    [P(8, 2, Q(2)), 1, '\u0398(n3)'],
    [P(9, 3, Q(1)), 1, '\u0398(n2)'],
    [P(3, 2, Q(1)), 1, '\u0398(nlog2 3)'], // Karatsuba
    [P(7, 2, Q(2)), 1, '\u0398(nlog2 7)'], // Strassen
    [P(2, 2, Q(2)), 3, '\u0398(n2)'],
    [P(3, 4, Q(1), 1), 3, '\u0398(n log n)'], // CLRS 3T(n/4) + n lg n
    [P(2, 2, Q(1), 1), 2, '\u0398(n log2 n)'], // case 2 with k = 1
    [P(2, 4, Q(1, 2)), 2, '\u0398(\u221an log n)'],
    [P(4, 2, Q(5, 2)), 3, '\u0398(n5/2)'],
  ];
  for (const [pr, c, ans] of cases) {
    const res = analyze(pr);
    assert.equal(res.case, c, strip(ans));
    assert.equal(strip(res.answer.html), ans);
  }
});

test('the gaps and broken forms do not apply', () => {
  assert.equal(analyze(P(2, 2, Q(1), -1)).applies, false); // n / log n
  assert.equal(analyze(P(0.5, 2, Q(1))).applies, false);
  for (let s = 1; s < 200; s++) {
    const pr = generate(rng(s), { cases: ['none'] });
    assert.equal(analyze(pr).applies, false);
  }
});

test('regularity constant c = a / b^p is below 1 in case 3', () => {
  assert.equal(analyze(P(2, 2, Q(2))).reg.cHtml, '1/2');
  assert.equal(analyze(P(3, 4, Q(1), 1)).reg.cHtml, '3/4');
  for (let s = 1; s < 300; s++) {
    const res = analyze(generate(rng(s), { cases: [3] }));
    assert.equal(res.case, 3);
    assert.ok(res.reg.c < 1 && res.reg.c > 0);
  }
});

test('log_b a is exact when a is a rational power of b', () => {
  assert.deepEqual(logInfo(8, 4).q, Q(3, 2));
  assert.deepEqual(logInfo(1, 5).q, Q(0));
  assert.equal(logInfo(3, 2).q, null);
  assert.equal(parseNum('3/2'), 1.5);
  assert.ok(Math.abs(parseNum('log_2 3') - Math.log2(3)) < 1e-12);
  assert.ok(Math.abs(parseNum('lg 7') - Math.log2(7)) < 1e-12);
  assert.ok(Math.abs(parseNum('log2(3)') - Math.log2(3)) < 1e-12);
  assert.equal(parseNum('n'), null);
});

test('generated problems hit the requested case', () => {
  for (const c of [1, 2, 3]) {
    for (let s = 1; s < 300; s++) {
      const pr = generate(rng(s * 7 + c), { cases: [c] });
      assert.equal(analyze(pr).case, c, JSON.stringify(pr));
    }
  }
  for (let s = 1; s < 200; s++) {
    const pr = generate(rng(s), { cases: [1, 2, 3], fractions: false, logs: false });
    const e = logInfo(pr.a, pr.b);
    assert.ok(e.q && e.q.d === 1, 'integer log_b a without fractions');
    assert.equal(pr.f.k, 0);
  }
});

test('answers match the exact recurrence numerically', () => {
  // T(b^L) / answer(b^L) must level off: compare two depths.
  for (let s = 1; s < 400; s++) {
    const pr = generate(rng(s), { cases: [1, 2, 3], dressing: false });
    const res = analyze(pr);
    const L1 = Math.floor(Math.log(1e9) / Math.log(pr.b));
    const L2 = Math.floor(Math.log(1e18) / Math.log(pr.b));
    const r1 = solveExact(pr, L1) / answerAt(res, pr.b ** L1);
    const r2 = solveExact(pr, L2) / answerAt(res, pr.b ** L2);
    assert.ok(r2 / r1 < 2.2 && r1 / r2 < 2.2, `${JSON.stringify(pr)} ratio ${r1} -> ${r2}`);
  }
});

test('answer choices: one correct, all distinct, "does not apply" last', () => {
  for (let s = 1; s < 400; s++) {
    const pr = generate(rng(s));
    const { choices, keys, answer } = answerChoices(pr, rng(s + 1));
    assert.ok(choices.length >= 3, JSON.stringify(pr));
    assert.equal(new Set(keys).size, keys.length);
    assert.equal(keys.at(-1), 'none');
    assert.equal(keys[answer], analyze(pr).answer.key);
  }
});

test('walkthrough answers agree with the analysis', () => {
  for (let s = 1; s < 300; s++) {
    const pr = generate(rng(s));
    const res = analyze(pr);
    const steps = walkthrough(pr);
    assert.equal(steps.at(-1).id, 'answer');
    const cs = steps.find((x) => x.id === 'case');
    if (cs) assert.equal(cs.ask.answer, res.case ? res.case - 1 : 3);
    const read = steps.find((x) => x.id === 'read');
    if (read) {
      assert.ok(read.ask.fields[0].check(String(pr.a)));
      assert.ok(read.ask.fields[1].check(String(pr.b)));
      assert.ok(!read.ask.fields[1].check(String(pr.b + 1)));
    }
    const w = steps.find((x) => x.id === 'watershed');
    if (w) assert.ok(w.ask.fields[0].check(String(res.e.value.toFixed(3))));
    const reg = steps.find((x) => x.id === 'regularity');
    if (reg?.ask.type === 'input') assert.ok(reg.ask.fields[0].check(String(res.reg.ratio)));
  }
});
