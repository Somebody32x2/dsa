import { layout, R, triHeight } from './layout.js';
import { fmtBalance } from './tree.js';

const NS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.append(e);
  return e;
};
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const relHeight = (h, base) => {
  const d = h - base;
  return d === 0 ? 'h' : d > 0 ? `h+${d}` : `h\u2212${-d}`;
};

/**
 * Renders frames ({ tree, roles, tags, text, view }) as SVG. Nodes are keyed by id, so moving
 * from one frame to the next animates every node from its old position to its new one.
 * Links that did not exist in the previous frame flash briefly, so you can see exactly
 * which pointers a rotation changed.
 */
export class TreeView {
  constructor(host, opts = {}) {
    this.opts = {
      height: 320,
      showHeights: false,
      showBalance: false,
      showInorder: false,
      heightBase: null, // set to a number to show heights relative to it (h, h+1, ...)
      duration: 700,
      minWidth: 340,
      minHeight: 190,
      onPick: null,
      ...opts,
    };
    this.svg = svg('svg', { class: 'tree', role: 'img' });
    this.svg.style.height = `${this.opts.height}px`;
    this.gEdges = svg('g', { class: 'edges' }, this.svg);
    this.gStrip = svg('g', { class: 'strip' }, this.svg);
    this.gNodes = svg('g', { class: 'nodes' }, this.svg);
    this.nodes = new Map();
    this.edges = new Map();
    this.stripY = null;
    this.vb = null;
    this.frame = null;
    this.drawn = false;
    host.append(this.svg);

    if (this.opts.onPick) {
      this.svg.classList.add('pickable');
      this.svg.addEventListener('click', (e) => {
        const g = e.target.closest('[data-id]');
        if (g) this.opts.onPick(g.dataset.id);
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
    const L = layout(frame.tree);
    const dur = animate && this.drawn && !reducedMotion() ? o.duration : 0;

    const start = new Map();
    const end = new Map();
    for (const [id, it] of L.items) {
      let rec = this.nodes.get(id);
      if (!rec) {
        rec = this.createNode(it.node);
        this.nodes.set(id, rec);
        const p = it.parent && this.nodes.get(it.parent);
        rec.x = p?.x ?? it.x;
        rec.y = p?.y ?? it.y;
        if (this.drawn) fadeIn(rec.g);
      }
      start.set(id, { x: rec.x, y: rec.y });
      end.set(id, { x: it.x, y: it.y });
      this.updateNode(rec, it, frame, o);
    }
    for (const [id, rec] of this.nodes) {
      if (!L.items.has(id)) {
        this.nodes.delete(id);
        fadeOut(rec.g);
        if (rec.strip) fadeOut(rec.strip);
      }
    }

    const live = new Set();
    for (const e of L.edges) {
      live.add(e.key);
      if (!this.edges.has(e.key)) {
        const line = svg('line', { class: 'edge' }, this.gEdges);
        // Placeholders are drawing aids, not real pointers, so their links do not flash.
        if (this.drawn && L.items.get(e.to).node.kind !== 'empty') line.classList.add('edge-new');
        this.edges.set(e.key, { line, from: e.from, to: e.to });
      }
    }
    for (const [k, r] of this.edges) {
      if (!live.has(k)) {
        this.edges.delete(k);
        fadeOut(r.line);
      }
    }

    // inorder strip
    const stripTo = L.maxY + 44;
    const stripFrom = this.stripY ?? stripTo;
    for (const [id, rec] of this.nodes) {
      if (o.showInorder && !rec.strip) {
        rec.strip = svg('text', { class: `strip-label kind-${rec.kind}` }, this.gStrip);
      }
      if (!o.showInorder && rec.strip) {
        rec.strip.remove();
        rec.strip = null;
      }
      if (rec.strip) rec.strip.textContent = rec.display;
    }
    this.gStrip.classList.toggle('on', o.showInorder);

    // viewBox
    const pad = 26;
    let x0 = -pad;
    let w = L.width + pad * 2;
    let y0 = -48;
    let h = (o.showInorder ? stripTo + 14 : L.maxY) + pad - y0;
    if (o.showInorder) {
      x0 -= 58;
      w += 58;
    }
    // Never zoom in past MAX_SCALE, so small trees keep the same node size as big ones.
    const MAX_SCALE = 1.1;
    const minW = Math.max(o.minWidth, (this.svg.clientWidth || 0) / MAX_SCALE);
    const minH = Math.max(o.minHeight, o.height / MAX_SCALE);
    if (w < minW) {
      x0 -= (minW - w) / 2;
      w = minW;
    }
    if (h < minH) {
      y0 -= (minH - h) / 2;
      h = minH;
    }
    const vbTo = [x0, y0, w, h];
    const vbFrom = this.vb ?? vbTo;
    if (!this.stripCaption) {
      this.stripCaption = svg('text', { class: 'strip-caption', 'text-anchor': 'end' }, this.gStrip);
      this.stripCaption.textContent = 'inorder';
    }

    cancelAnimationFrame(this.raf);
    const t0 = performance.now();
    const tick = (now) => {
      const t = dur ? Math.min(1, (now - t0) / dur) : 1;
      const k = ease(t);
      for (const [id, rec] of this.nodes) {
        const s = start.get(id);
        const e = end.get(id);
        rec.x = lerp(s.x, e.x, k);
        rec.y = lerp(s.y, e.y, k);
        rec.g.setAttribute('transform', `translate(${rec.x.toFixed(2)},${rec.y.toFixed(2)})`);
      }
      for (const r of this.edges.values()) {
        const a = this.nodes.get(r.from);
        const b = this.nodes.get(r.to);
        if (!a || !b) continue;
        r.line.setAttribute('x1', a.x);
        r.line.setAttribute('y1', a.y);
        r.line.setAttribute('x2', b.x);
        r.line.setAttribute('y2', b.y);
      }
      this.stripY = lerp(stripFrom, stripTo, k);
      for (const rec of this.nodes.values()) {
        if (!rec.strip) continue;
        rec.strip.setAttribute('x', rec.x);
        rec.strip.setAttribute('y', this.stripY);
      }
      this.stripCaption.setAttribute('x', -40);
      this.stripCaption.setAttribute('y', this.stripY);
      this.vb = vbFrom.map((v, i) => lerp(v, vbTo[i], k));
      this.svg.setAttribute('viewBox', this.vb.map((v) => v.toFixed(1)).join(' '));
      if (t < 1) this.raf = requestAnimationFrame(tick);
    };
    tick(t0);
    this.drawn = true;
  }

  createNode(n) {
    const g = svg('g', { 'data-id': n.id }, this.gNodes);
    const rec = { g, kind: n.kind, x: 0, y: 0 };
    if (n.kind === 'node') {
      rec.shape = svg('circle', { r: R, class: 'disc' }, g);
      rec.text = svg('text', { class: 'key', y: 0.5 }, g);
    } else if (n.kind === 'subtree') {
      rec.shape = svg('path', { class: 'tri' }, g);
      rec.text = svg('text', { class: 'tri-label' }, g);
      rec.note = svg('text', { class: 'tri-note' }, g);
    } else {
      rec.shape = svg('rect', { class: 'empty-box', x: -17, y: 0, width: 34, height: 26, rx: 5 }, g);
      rec.text = svg('text', { class: 'empty-label', y: 13.5 }, g);
    }
    rec.tags = svg('g', { class: 'tags' }, g);
    rec.bal = svg('text', { class: 'bal', x: R + 5, y: -R + 6 }, g);
    rec.hgt = svg('text', { class: 'hgt', x: R + 5, y: R - 1 }, g);
    return rec;
  }

  updateNode(rec, it, frame, o) {
    const n = it.node;
    const role = frame.roles?.[n.id];
    const tlabel = n.kind !== 'node' && /^T\d$/.test(n.label ?? '') ? ` t-${n.label.toLowerCase()}` : '';
    rec.g.setAttribute('class', `nd kind-${n.kind}${role ? ` role-${role}` : ''}${tlabel}`);
    rec.display = String(frame.text?.[n.id] ?? n.key ?? n.label ?? '');
    rec.text.textContent = rec.display;

    if (n.kind === 'subtree') {
      const th = triHeight(n.height);
      const hw = 27;
      rec.shape.setAttribute('d', `M0 0 L${hw} ${th} L${-hw} ${th} Z`);
      rec.text.setAttribute('y', th - 22);
      rec.note.setAttribute('y', th - 9);
      rec.note.textContent = o.heightBase != null ? relHeight(n.height, o.heightBase) : '';
    }

    rec.tags.replaceChildren();
    const tags = frame.tags?.[n.id] ?? [];
    const widths = tags.map((t) => 10 + 7 * t.length);
    let x = -(widths.reduce((s, w) => s + w, 0) + 3 * (tags.length - 1)) / 2;
    const ty = n.kind === 'node' ? -R - 22 : -22;
    tags.forEach((t, i) => {
      const pg = svg('g', { class: `pill tg-${t.toLowerCase()}`, transform: `translate(${x},${ty})` }, rec.tags);
      svg('rect', { width: widths[i], height: 16, rx: 8 }, pg);
      svg('text', { x: widths[i] / 2, y: 8.5 }, pg).textContent = t;
      x += widths[i] + 3;
    });

    const isNode = n.kind === 'node';
    rec.bal.textContent = isNode && o.showBalance ? fmtBalance(it.bal) : '';
    rec.bal.classList.toggle('bad', Math.abs(it.bal ?? 0) > 1);
    rec.hgt.textContent =
      isNode && o.showHeights ? (o.heightBase != null ? relHeight(it.h, o.heightBase) : `h${it.h}`) : '';
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
