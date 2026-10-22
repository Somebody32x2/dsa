/**
 * Frame builders for recursion trees and level-cost bars (no DOM). Every number comes from
 * master.js: node counts and sizes from the recurrence, bar lengths from levels(), colors from analyze().
 *
 *   treeFrames(pr, { depth, maxNodes })               stepped recursion tree, one level per frame
 *   barFrames(pr, depth, { width, title, values, row })  the level-cost bars only (comparisons, sandboxes)
 *   heroFrames()                                      looping home figure: one recurrence per case
 *   levelCost(pr, i, html)                            level i's cost "a^i·f(n/b^i) = ..." (HTML or Unicode)
 *   leafCount(pr, html)                               n^(log_b a), the number of leaves
 *   recurrenceText(pr)                                the recurrence in Unicode (for figure labels)
 *   caseCaption(pr)                                   one sentence: which part of the tree wins, and the answer
 *
 * Figures use n = b^depth, so level `depth` is exactly the leaf level (subproblems of size 1).
 * Scene draws text with textContent, so figure labels use Unicode superscripts; captions use HTML.
 * Bar lengths are linear in the level's total, normalized by the largest level of that recurrence.
 */
import { analyze, levels, logInfo, qstr, qval, Q, recurrenceHtml } from './master.js';

/* ---------- notation: one formatter for HTML, one for plain Unicode ---------- */

const SUP = { 0: '\u2070', 1: '\u00b9', 2: '\u00b2', 3: '\u00b3', 4: '\u2074', 5: '\u2075', 6: '\u2076', 7: '\u2077', 8: '\u2078', 9: '\u2079', n: '\u207f', '-': '\u207b' };
const SUB = { 0: '\u2080', 1: '\u2081', 2: '\u2082', 3: '\u2083', 4: '\u2084', 5: '\u2085', 6: '\u2086', 7: '\u2087', 8: '\u2088', 9: '\u2089' };

const UNI = {
  sup: (s) => {
    const t = String(s);
    return [...t].every((c) => c in SUP) ? [...t].map((c) => SUP[c]).join('') : `^(${t})`;
  },
  sub: (s) => [...String(s)].map((c) => SUB[c] ?? c).join(''),
};
const HTML = { sup: (s) => `<sup>${s}</sup>`, sub: (s) => `<sub>${s}</sub>` };
const fmt = (html) => (html ? HTML : UNI);

/** x^q where x is 'n' or '(n/4)'; '' when q = 0. */
function pw(x, q, S) {
  if (q.n === 0) return '';
  if (q.n === 1 && q.d === 1) return x;
  if (q.n === 1 && q.d === 2) return `\u221a${x}`;
  return `${x}${S.sup(qstr(q))}`;
}

/** log^k of x ('n' -> 'log n', '(n/4)' -> 'log(n/4)'). */
function lg(x, k, S) {
  const head = `log${Math.abs(k) > 1 ? S.sup(Math.abs(k)) : ''}`;
  return x === 'n' ? `${head} n` : `${head}${x}`;
}

/** f evaluated at x, constants dropped (as levels() does). */
function term(x, f, S) {
  if (f.exp) return `${f.exp}${S.sup(x === 'n' ? 'n' : x.slice(1, -1))}`;
  const p = pw(x, f.p, S);
  if (f.k === 0) return p || '1';
  if (f.k > 0) return [p, lg(x, f.k, S)].filter(Boolean).join(' ');
  return `${p || '1'} / ${lg(x, f.k, S)}`;
}

/** n^(log_b a): the number of leaves. */
export function leafCount(pr, html = true) {
  const S = fmt(html);
  const e = logInfo(pr.a, pr.b);
  if (e.q) return pw('n', e.q, S) || '1';
  return `n${S.sup(`log${S.sub(pr.b)} ${pr.a}`)}`;
}

export function recurrenceText(pr) {
  const S = UNI;
  return `T(n) = ${pr.a === 1 ? '' : pr.a}T(n/${pr.b}) + ${term('n', pr.f, S)}`;
}

/** Level i's total cost: { lhs, rhs, approx } with rhs simplified (null when it would not be simpler). */
function costParts(pr, i, S) {
  const { a, b, f } = pr;
  if (i === 0) return { lhs: 'f(n)', rhs: term('n', f, S), approx: false };
  const m = a ** i;
  const x = `(n/${b ** i})`;
  const lhs = `${m === 1 ? '' : `${m}\u00b7`}${term(x, f, S)}`;
  if (f.exp) return { lhs, rhs: null, approx: false };
  // m (n/b^i)^p = (m / b^(p i)) n^p; logs keep their argument n/b^i.
  const T = [pw('n', f.p, S), f.k > 0 ? lg(x, f.k, S) : ''].filter(Boolean).join(' ') || '1';
  const Tfull = f.k < 0 ? `${T} / ${lg(x, f.k, S)}` : T;
  const den = b ** (qval(f.p) * i);
  const exact = Math.abs(den - Math.round(den)) < 1e-9;
  if (!exact) return { lhs, rhs: `${round2(m / den)}\u00b7${Tfull}`, approx: true };
  const c = Q(m, Math.round(den));
  let rhs;
  if (Tfull === '1') rhs = qstr(c);
  else if (c.n === 1 && c.d === 1) rhs = Tfull;
  else if (c.d === 1) rhs = `${c.n}${Tfull}`;
  else if (f.k === 0) rhs = `${c.n === 1 ? '' : c.n}${Tfull}/${c.d}`;
  else rhs = `(${qstr(c)})\u00b7${Tfull}`;
  return { lhs, rhs: rhs === lhs ? null : rhs, approx: false };
}

/** "a^i·f(n/b^i) = simplified", e.g. "4·(n/2)² = n²". */
export function levelCost(pr, i, html = true) {
  const { lhs, rhs, approx } = costParts(pr, i, fmt(html));
  return rhs ? `${lhs} ${approx ? '\u2248' : '='} ${rhs}` : lhs;
}

const round2 = (x) => String(Math.round(x * 100) / 100);

/** Numbers on figures: integers as is, otherwise one decimal; large values as m·10^e. */
export function fmtNum(x) {
  if (x >= 1e5) {
    const e = Math.floor(Math.log10(x));
    return `${(x / 10 ** e).toFixed(1)}\u00b710${UNI.sup(e)}`;
  }
  return Number.isInteger(x) ? String(x) : String(Math.round(x * 10) / 10);
}

const tg = (name, text) => `<span class="tg tg-${name}">${text}</span>`;

/** One sentence on where the work goes, naming the case and the answer. */
export function caseCaption(pr) {
  const res = analyze(pr);
  const { a, b, f } = pr;
  let ratio = '';
  if (!f.exp && f.k === 0) {
    const bp = b ** qval(f.p);
    const exact = Math.abs(bp - Math.round(bp)) < 1e-9;
    const r = exact ? qstr(Q(a, Math.round(bp))) : round2(a / bp);
    ratio = ` From one level to the next the cost is multiplied by a/b${HTML.sup('p')} = ${a}/${b}${qstr(f.p) === '1' ? '' : HTML.sup(qstr(f.p))} ${exact ? '=' : '\u2248'} ${r}.`;
  }
  if (!res.applies) return `${tg('none', 'does not apply')} ${res.reason}`;
  if (res.case === 1) return `The bars grow toward the leaves, so the ${leafCount(pr)} leaves outweigh everything above them.${ratio} ${tg('case1', 'case 1')}: T(n) is <b>${res.answer.html}</b>.`;
  if (res.case === 2) return `${f.k === 0 ? 'Every level costs the same' : 'Every level costs about the same (up to the log factor)'}, and there are about log n levels.${ratio} ${tg('case2', 'case 2')}: T(n) is <b>${res.answer.html}</b>.`;
  return `The bars shrink away from the root, so the root's f(n) dominates.${ratio} ${tg('case3', 'case 3')}: T(n) is <b>${res.answer.html}</b>.`;
}

/** Which rows are the dominant ones (colored on the last frame). */
function dominant(res, depth) {
  if (!res.applies) return { role: null, rows: [] };
  if (res.case === 1) return { role: 'case1', rows: [depth] };
  if (res.case === 2) return { role: 'case2', rows: Array.from({ length: depth + 1 }, (_, i) => i) };
  return { role: 'case3', rows: [0] };
}

/* ---------- layout helpers ---------- */

const CH = 3.6; // half the width of one 12px mono character
const leftAt = (x0, text, extra = {}) => ({ shape: 'label', x: x0 + String(text).length * CH, text, pick: false, ...extra });
const rightAt = (x1, text, extra = {}) => ({ shape: 'label', x: x1 - String(text).length * CH, text, pick: false, ...extra });
const BAR_H = 18;
const bar = (id, x0, y, w) => ({ id, shape: 'rect', cls: 'bar', x: x0 + w / 2, y, w, h: BAR_H, pick: false });

/** Which nodes of a level with `count` nodes get drawn: all, or the first and last few around an ellipsis. */
function rowPlan(count, maxNodes) {
  if (count <= maxNodes) return { slots: count, nodes: Array.from({ length: count }, (_, j) => ({ j, slot: j })), dots: null };
  const left = Math.floor((maxNodes - 1) / 2);
  const right = maxNodes - 1 - left;
  const nodes = [];
  for (let j = 0; j < left; j++) nodes.push({ j, slot: j });
  for (let t = 0; t < right; t++) nodes.push({ j: count - right + t, slot: left + 1 + t });
  return { slots: maxNodes, nodes, dots: left };
}

/* ---------- the recursion tree ---------- */

const SP = 46; // slot width
const LY = 74; // level spacing

/**
 * Stepped recursion tree for Player. Frame i (0..depth) adds level i; a last frame colors the
 * dominant part per analyze(pr).case. Node ids: `t<level>-<index>` (index = position among a^level nodes).
 */
export function treeFrames(pr, { depth = 3, maxNodes = 9, compact = false } = {}) {
  const { a, b } = pr;
  const res = analyze(pr);
  const rows = levels(pr, depth);
  const max = Math.max(...rows.map((r) => r.total));
  const N = b ** depth;
  const plans = rows.map((r) => rowPlan(Math.round(r.nodes), maxNodes));
  const W = Math.max(...plans.map((p) => p.slots)) * SP;
  const slotX = (plan, s) => ((s + 0.5) * W) / plan.slots - W / 2;
  const costs = rows.map((r, i) => (r.leaf ? `${fmtNum(r.nodes)} leaves = ${leafCount(pr, false)}` : levelCost(pr, i, false)));
  const CX = W / 2 + 30;
  // compact (phones): no cost-formula column; the captions still state each level's cost.
  const BX = compact ? CX : CX + Math.max(...costs.map((c) => c.length)) * 2 * CH + 22;
  const BW = compact ? 100 : 130;
  const VX = BX + BW + 12;

  const levelItems = (i) => {
    const r = rows[i];
    const plan = plans[i];
    const y = i * LY;
    const label = r.leaf ? 'leaves' : i === 0 ? 'n' : `n/${b ** i}`;
    const items = [rightAt(-W / 2 - 14, r.leaf ? 'leaves' : `level ${i}`, { id: `lv${i}`, y, cls: 'level-label' })];
    const links = [];
    const prev = plans[i - 1];
    for (const { j, slot } of plan.nodes) {
      items.push({ id: `t${i}-${j}`, shape: 'rect', x: slotX(plan, slot), y, w: 40, h: 28, text: r.leaf ? '1' : label, pick: false });
      if (i > 0) {
        const pj = Math.floor(j / a);
        if (prev.nodes.some((nd) => nd.j === pj)) links.push({ from: `t${i - 1}-${pj}`, to: `t${i}-${j}`, quiet: true });
      }
    }
    if (plan.dots !== null) items.push({ id: `dots${i}`, shape: 'label', x: slotX(plan, plan.dots), y, text: '\u2026', sub: `${fmtNum(r.nodes)} in all`, pick: false });
    if (!compact) items.push(leftAt(CX, costs[i], { id: `cost${i}`, y, cls: 'cost-label' }));
    items.push(bar(`bar${i}`, BX, y, Math.max(3, (BW * r.total) / max)));
    items.push(leftAt(VX, fmtNum(r.total), { id: `val${i}`, y, cls: 'level-label' }));
    return { items, links };
  };

  const frames = [];
  const acc = { items: [], links: [] };
  for (let i = 0; i <= depth; i++) {
    const { items, links } = levelItems(i);
    acc.items.push(...items);
    acc.links.push(...links);
    const r = rows[i];
    let caption;
    if (i === 0) {
      caption = `<b>Level 0</b>: the root is one call on the whole input, size n. Outside its recursive calls it does f(n) = ${term('n', pr.f, HTML)} work. (The figure uses n = ${N} = ${b}${HTML.sup(depth)}; the bar on the right is each level's total for that n.)`;
    } else if (!r.leaf) {
      caption = `<b>Level ${i}</b>: ${a}${HTML.sup(i)} = ${fmtNum(r.nodes)} call${r.nodes === 1 ? '' : 's'}, each on size n/${b}${HTML.sup(i)} = n/${b ** i} and each doing f(n/${b ** i}) work. Together: <b>${levelCost(pr, i)}</b> (${fmtNum(r.total)} for n = ${N}).`;
    } else {
      caption = `<b>Leaves</b>: after log<sub>${b}</sub> n = ${depth} levels the subproblems have size 1. There are a${HTML.sup(`log<sub>b</sub> n`)} = n${HTML.sup('log<sub>b</sub> a')} = <b>${leafCount(pr)}</b> of them (${fmtNum(r.nodes)} for n = ${N}), each costing T(1).`;
    }
    frames.push({ items: [...acc.items], links: [...acc.links], caption, badge: compact ? undefined : `n = ${N}` });
  }
  const dom = dominant(res, depth);
  const roles = {};
  for (const i of dom.rows) roles[`bar${i}`] = dom.role;
  if (dom.role === 'case1') for (const { j } of plans[depth].nodes) roles[`t${depth}-${j}`] = 'case1';
  if (dom.role === 'case3') roles['t0-0'] = 'case3';
  frames.push({ items: [...acc.items], links: [...acc.links], roles, caption: caseCaption(pr), badge: compact ? undefined : `n = ${N}` });
  return frames;
}

/* ---------- level-cost bars only ---------- */

const ROW = 30; // default row spacing of barFrames

/**
 * Bars only: one row per level plus the leaves. Frame i shows rows 0..i; the last frame colors the
 * dominant rows. Ids are the same for any recurrence with the same depth (bar0.., lv0.., val0.., title),
 * so frames of different recurrences can share one camera.
 */
export function barFrames(pr, depth = 4, { width = 220, title = false, values = true, row = ROW } = {}) {
  const rows = levels(pr, depth);
  const max = Math.max(...rows.map((r) => r.total));
  const res = analyze(pr);
  const N = pr.b ** depth;
  const LX = 52;
  const BX = LX + 12;
  const items = [];
  if (title) items.push({ id: 'title', shape: 'label', x: BX + width / 2, y: -38, text: recurrenceText(pr), cls: 'cost-label', pick: false });
  const frames = [];
  rows.forEach((r, i) => {
    const y = i * row;
    items.push(rightAt(LX, r.leaf ? 'leaves' : `level ${i}`, { id: `lv${i}`, y, cls: 'level-label' }));
    items.push(bar(`bar${i}`, BX, y, Math.max(3, (width * r.total) / max)));
    if (values) items.push(leftAt(BX + width + 10, fmtNum(r.total), { id: `val${i}`, y, cls: 'level-label' }));
    const caption = r.leaf
      ? `<b>Leaves</b>: ${leafCount(pr)} of them, ${fmtNum(r.nodes)} for n = ${N}.`
      : `<b>Level ${i}</b>: ${levelCost(pr, i)}${values ? ` = ${fmtNum(r.total)} for n = ${N}` : ''}.`;
    frames.push({ items: [...items], caption, badge: `n = ${N}` });
  });
  const dom = dominant(res, depth);
  const roles = Object.fromEntries(dom.rows.map((i) => [`bar${i}`, dom.role]));
  frames.push({ items: [...items], roles, caption: caseCaption(pr), badge: `n = ${N}` });
  return frames;
}

/* ---------- home figure ---------- */

const poly = (a, b, p) => ({ form: 'divide', a, b, f: { c: 1, p: Q(p), k: 0, exp: null, lower: null } });

/** Three recurrences, one per case, each filling in its level bars; same ids and positions throughout. */
export function heroFrames() {
  const shows = [
    { pr: poly(8, 2, 2), name: 'leaves win' },
    { pr: poly(2, 2, 1), name: 'every level ties' },
    { pr: poly(2, 2, 2), name: 'the root wins' },
  ];
  return shows.flatMap(({ pr, name }) =>
    barFrames(pr, 4, { width: 380, title: true, row: 44 }).map((fr, i, all) => ({
      ...fr,
      caption: i === all.length - 1 ? `${recurrenceHtml(pr)}: <b>${name}</b>. ${fr.caption}` : `${recurrenceHtml(pr)}. ${fr.caption}`,
    })),
  );
}
