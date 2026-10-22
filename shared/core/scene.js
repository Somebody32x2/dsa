/**
 * Scene: a generic, keyed, animated SVG renderer. It is the visual engine for every lesson.
 *
 * You describe a moment as a FRAME of plain data; Scene draws it. Show another frame and every
 * item with the same id glides from its old position to its new one, new items fade in, removed
 * items fade out, and links that did not exist before flash briefly ("this pointer changed").
 *
 * frame = {
 *   items: [{ id, x, y, shape?, text?, sub?, r?, w?, h?, cls?, tags?, role? }],
 *   links: [{ from, to, id?, cls?, directed?, text?, bend? }],
 *   roles: { [id]: role },        // colors: see CSS .role-* (visit, path, new, found, remove, a, b, c, ...)
 *   tags:  { [id]: ['x', 'lo'] }, // small pills above an item; CSS .tg-<name> colors known tags
 *   caption, badge,               // used by Player
 *   view:  { ...option overrides for this frame },
 * }
 * shape: 'circle' (default, r=19) | 'rect' (w=44, h=36) | 'tri' (w=54, h=60; apex at x,y) | 'label' (text only)
 *
 * Any class with this same interface (constructor(host, opts), show(frame, {animate}), setOption)
 * can be passed to Player / quizzes as `View` (see kits/trees TreeView).
 */
const NS = 'http://www.w3.org/2000/svg';
let uid = 0;

const svg = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.append(e);
  return e;
};
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const DEFAULTS = { circle: { r: 19 }, rect: { w: 44, h: 36 }, tri: { w: 54, h: 60 }, label: {} };

/** Half-extents used for bounds and for trimming links to the shape's edge. */
function extent(it) {
  switch (it.shape) {
    case 'rect': return { left: it.w / 2, right: it.w / 2, top: it.h / 2, bottom: it.h / 2 };
    case 'tri': return { left: it.w / 2, right: it.w / 2, top: 0, bottom: it.h };
    case 'label': {
      const half = Math.max(8, String(it.text ?? '').length * 3.8);
      return { left: half, right: half, top: 9, bottom: 9 };
    }
    default: return { left: it.r, right: it.r, top: it.r, bottom: it.r };
  }
}

/** Distance from an item's anchor to its boundary along direction (dx, dy). */
function trim(it, dx, dy) {
  const len = Math.hypot(dx, dy) || 1;
  if (it.shape === 'circle') return it.r;
  if (it.shape === 'rect') {
    const tx = Math.abs(dx) > 1e-6 ? it.w / 2 / Math.abs(dx / len) : Infinity;
    const ty = Math.abs(dy) > 1e-6 ? it.h / 2 / Math.abs(dy / len) : Infinity;
    return Math.min(tx, ty);
  }
  if (it.shape === 'label') return 10;
  return 0;
}

export class Scene {
  constructor(host, opts = {}) {
    this.opts = {
      height: 320,
      duration: 700,
      minWidth: 320,
      minHeight: 180,
      maxScale: 1.1, // never zoom in more than this, so sparse frames keep normal item sizes
      pad: 28,
      onPick: null, // (id) => void; makes items clickable (quizzes, sandboxes)
      ...opts,
    };
    this.uid = ++uid;
    this.svg = svg('svg', { class: 'scene', role: 'img' });
    this.svg.style.height = `${this.opts.height}px`;
    const defs = svg('defs', {}, this.svg);
    const m = svg('marker', { id: `arrow-${this.uid}`, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
    svg('path', { d: 'M0 0 L10 5 L0 10 z', class: 'arrowhead' }, m);
    this.gLinks = svg('g', { class: 'links' }, this.svg);
    this.gItems = svg('g', { class: 'items' }, this.svg);
    this.items = new Map();
    this.links = new Map();
    this.vb = null;
    this.frame = null;
    this.drawn = false;
    host.append(this.svg);
    // Refit when the width changes: the stage may be built before it is attached (width 0),
    // and phones rotate. Only width matters; show() itself changes the height.
    this.cw = 0;
    new ResizeObserver(() => {
      const cw = this.svg.clientWidth;
      if (cw === this.cw) return;
      this.cw = cw;
      if (this.frame) this.show(this.frame, { animate: false });
    }).observe(this.svg);

    if (this.opts.onPick) {
      this.svg.classList.add('pickable');
      this.svg.addEventListener('click', (e) => {
        const g = e.target.closest('[data-id]');
        if (g && !g.classList.contains('nopick')) this.opts.onPick(g.dataset.id);
      });
    }
  }

  setOption(key, value) {
    this.opts[key] = value;
    if (this.frame) this.show(this.frame, { animate: false });
  }

  show(frame, { animate = true } = {}) {
    this.frame = frame;
    const o = { ...this.opts, ...frame.view };
    const dur = animate && this.drawn && !reducedMotion() ? o.duration : 0;
    const targets = new Map();
    for (const raw of frame.items ?? []) {
      const shape = raw.shape ?? 'circle';
      targets.set(raw.id, { ...DEFAULTS[shape], ...raw, shape });
    }

    const start = new Map();
    for (const [id, it] of targets) {
      let rec = this.items.get(id);
      if (!rec) {
        rec = this.createItem(it);
        this.items.set(id, rec);
        const from = it.enterFrom && this.items.get(it.enterFrom);
        rec.x = from?.x ?? it.x;
        rec.y = from?.y ?? it.y;
        if (this.drawn) fadeIn(rec.g);
      }
      rec.it = it;
      start.set(id, { x: rec.x, y: rec.y });
      this.updateItem(rec, it, frame);
    }
    for (const [id, rec] of this.items) {
      if (!targets.has(id)) {
        this.items.delete(id);
        fadeOut(rec.g);
      }
    }

    const live = new Set();
    for (const l of frame.links ?? []) {
      const key = l.id ?? `${l.from}>${l.to}`;
      live.add(key);
      let r = this.links.get(key);
      if (!r) {
        const g = svg('g', {}, this.gLinks);
        r = { g, path: svg('path', {}, g), label: svg('text', { class: 'link-text' }, g) };
        if (this.drawn && !l.quiet) g.classList.add('link-new');
        this.links.set(key, r);
      }
      r.l = l;
      const role = frame.roles?.[key];
      r.g.setAttribute('class', `link${l.cls ? ` ${l.cls}` : ''}${role ? ` role-${role}` : ''}${r.g.classList.contains('link-new') ? ' link-new' : ''}`);
      r.path.setAttribute('marker-end', l.directed ? `url(#arrow-${this.uid})` : '');
      r.label.textContent = l.text ?? '';
    }
    for (const [k, r] of this.links) {
      if (!live.has(k)) {
        this.links.delete(k);
        fadeOut(r.g);
      }
    }
    // viewBox: fit the frame (or the fixed `bounds`, which Player sets to the union of all its frames
    // so the camera stays still), never zooming in past maxScale.
    const [minX, minY, maxX, maxY] = o.bounds ?? Scene.measure(frame);
    let x0 = minX - o.pad;
    let y0 = minY - o.pad;
    let w = maxX - minX + 2 * o.pad;
    let h = maxY - minY + 2 * o.pad;
    const minW = Math.max(o.minWidth, (this.svg.clientWidth || 0) / o.maxScale);
    const minH = Math.max(o.minHeight, o.height / o.maxScale);
    if (w < minW) { x0 -= (minW - w) / 2; w = minW; }
    if (h < minH) { y0 -= (minH - h) / 2; h = minH; }
    const vbTo = [x0, y0, w, h];
    // Narrow screens: if width limits the scale, shrink the stage instead of leaving empty bands.
    const cw = this.svg.clientWidth;
    this.svg.style.height = `${cw && cw / w < o.height / h ? Math.max(120, Math.round((h * cw) / w)) : o.height}px`;
    const vbFrom = this.vb ?? vbTo;

    cancelAnimationFrame(this.raf);
    const t0 = performance.now();
    const tick = (now) => {
      const t = dur ? Math.min(1, (now - t0) / dur) : 1;
      const k = ease(t);
      for (const [id, rec] of this.items) {
        const s = start.get(id);
        rec.x = lerp(s.x, rec.it.x, k);
        rec.y = lerp(s.y, rec.it.y, k);
        rec.g.setAttribute('transform', `translate(${rec.x.toFixed(2)},${rec.y.toFixed(2)})`);
      }
      for (const r of this.links.values()) this.placeLink(r);
      this.vb = vbFrom.map((v, i) => lerp(v, vbTo[i], k));
      this.svg.setAttribute('viewBox', this.vb.map((v) => v.toFixed(1)).join(' '));
      if (t < 1) this.raf = requestAnimationFrame(tick);
    };
    tick(t0);
    this.drawn = true;
  }

  /** [minX, minY, maxX, maxY] of a frame's items, including room for tags and sub-labels. */
  static measure(frame) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const raw of frame.items ?? []) {
      const shape = raw.shape ?? 'circle';
      const it = { ...DEFAULTS[shape], ...raw, shape };
      const e = extent(it);
      const tagRoom = (frame.tags?.[it.id] ?? it.tags)?.length ? 24 : 0;
      minX = Math.min(minX, it.x - e.left);
      maxX = Math.max(maxX, it.x + e.right);
      minY = Math.min(minY, it.y - e.top - tagRoom);
      maxY = Math.max(maxY, it.y + e.bottom + (it.sub ? 16 : 0));
    }
    return minX === Infinity ? [0, 0, 1, 1] : [minX, minY, maxX, maxY];
  }

  /** Union of several frames' bounds (Player uses this to keep the camera still across steps). */
  static measureAll(frames) {
    const b = frames.map((f) => Scene.measure(f));
    return [Math.min(...b.map((x) => x[0])), Math.min(...b.map((x) => x[1])), Math.max(...b.map((x) => x[2])), Math.max(...b.map((x) => x[3]))];
  }

  placeLink(r) {
    const a = this.items.get(r.l.from);
    const b = this.items.get(r.l.to);
    if (!a || !b) return;
    const bend = r.l.bend ?? 0;
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const cx = mx + (-(b.y - a.y) / len) * bend;
    const cy = my + ((b.x - a.x) / len) * bend;
    const ta = trim(a.it, cx - a.x, cy - a.y);
    const tb = trim(b.it, cx - b.x, cy - b.y) + (r.l.directed ? 2 : 0);
    const la = Math.hypot(cx - a.x, cy - a.y) || 1;
    const lb = Math.hypot(cx - b.x, cy - b.y) || 1;
    const ax = a.x + ((cx - a.x) / la) * ta;
    const ay = a.y + ((cy - a.y) / la) * ta;
    const bx = b.x + ((cx - b.x) / lb) * tb;
    const by = b.y + ((cy - b.y) / lb) * tb;
    r.path.setAttribute('d', bend ? `M${ax} ${ay} Q${cx} ${cy} ${bx} ${by}` : `M${ax} ${ay} L${bx} ${by}`);
    r.label.setAttribute('x', 0.25 * ax + 0.5 * cx + 0.25 * bx);
    r.label.setAttribute('y', 0.25 * ay + 0.5 * cy + 0.25 * by);
  }

  createItem(it) {
    const g = svg('g', { 'data-id': it.id }, this.gItems);
    const rec = { g, x: 0, y: 0 };
    if (it.shape === 'circle') rec.shape = svg('circle', { class: 'disc' }, g);
    else if (it.shape === 'rect') rec.shape = svg('rect', { class: 'box' }, g);
    else if (it.shape === 'tri') rec.shape = svg('path', { class: 'tri' }, g);
    rec.text = svg('text', { class: it.shape === 'label' ? 'label' : 'key' }, g);
    rec.sub = svg('text', { class: 'sub' }, g);
    rec.tags = svg('g', { class: 'tags' }, g);
    return rec;
  }

  updateItem(rec, it, frame) {
    const role = frame.roles?.[it.id] ?? it.role;
    rec.g.setAttribute('class', `it shape-${it.shape}${it.cls ? ` ${it.cls}` : ''}${role ? ` role-${role}` : ''}${it.pick === false ? ' nopick' : ''}`);
    if (it.shape === 'circle') rec.shape.setAttribute('r', it.r);
    if (it.shape === 'rect') {
      rec.shape.setAttribute('x', -it.w / 2);
      rec.shape.setAttribute('y', -it.h / 2);
      rec.shape.setAttribute('width', it.w);
      rec.shape.setAttribute('height', it.h);
      rec.shape.setAttribute('rx', 6);
    }
    if (it.shape === 'tri') rec.shape.setAttribute('d', `M0 0 L${it.w / 2} ${it.h} L${-it.w / 2} ${it.h} Z`);
    rec.text.textContent = it.text ?? '';
    rec.text.setAttribute('y', it.shape === 'tri' ? it.h - 20 : 0.5);
    rec.sub.textContent = it.sub ?? '';
    const bottom = it.shape === 'circle' ? it.r : it.shape === 'rect' ? it.h / 2 : it.shape === 'tri' ? it.h : 8;
    rec.sub.setAttribute('y', bottom + 13);

    rec.tags.replaceChildren();
    const tags = frame.tags?.[it.id] ?? it.tags ?? [];
    const widths = tags.map((t) => 10 + 7 * String(t).length);
    let x = -(widths.reduce((s, w) => s + w, 0) + 3 * (tags.length - 1)) / 2;
    const top = it.shape === 'circle' ? -it.r : it.shape === 'rect' ? -it.h / 2 : it.shape === 'tri' ? 0 : -9;
    tags.forEach((t, i) => {
      const pg = svg('g', { class: `pill tg-${String(t).toLowerCase()}`, transform: `translate(${x},${top - 22})` }, rec.tags);
      svg('rect', { width: widths[i], height: 16, rx: 8 }, pg);
      svg('text', { x: widths[i] / 2, y: 8.5 }, pg).textContent = t;
      x += widths[i] + 3;
    });
  }
}

function fadeIn(el) {
  el.style.opacity = '0';
  requestAnimationFrame(() => requestAnimationFrame(() => (el.style.opacity = '')));
}

function fadeOut(el) {
  el.style.opacity = '0';
  el.style.pointerEvents = 'none';
  setTimeout(() => el.remove(), 450);
}
