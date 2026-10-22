import { h, icon } from './dom.js';
import { Scene } from '../core/scene.js';

/**
 * Steps through frames with a view, a caption, a clickable scrubber and keyboard control
 * (Left/Right arrows, Space). `View` is any class with the Scene interface; default Scene.
 *
 *   new Player(host, { frames, view: { height: 360 }, View: TreeView, loop, autoplay, interval, fit })
 *
 * fit: 'union' (default) frames the union of all frames, so the camera holds still while you step and
 * only the things that change move. 'frame' refits every frame. Needs View.measureAll (Scene has it).
 */
export class Player {
  constructor(host, { frames = [], view = {}, View = Scene, loop = false, interval = 2200, autoplay = false, fit = 'union' } = {}) {
    this.loop = loop;
    this.interval = interval;
    this.timer = null;
    this.View = View;
    this.fit = fit;

    this.root = h('div', { class: 'player', tabindex: '0' });
    const stage = h('div', { class: 'stage' });
    this.badge = h('div', { class: 'badge' });
    stage.append(this.badge);
    this.view = new View(stage, view);

    this.caption = h('div', { class: 'caption', 'aria-live': 'polite' });
    this.scrub = h('div', { class: 'scrub' });
    this.count = h('span', { class: 'count' });
    const btn = (name, label, fn) =>
      h('button', { class: 'icon-btn', 'aria-label': label, title: label, html: icon[name], onclick: fn });
    this.bFirst = btn('first', 'Restart', () => this.go(0));
    this.bPrev = btn('prev', 'Previous step (Left arrow)', () => this.go(this.i - 1));
    this.bPlay = btn('play', 'Play (Space)', () => this.toggle());
    this.bNext = btn('next', 'Next step (Right arrow)', () => this.go(this.i + 1));
    const controls = h('div', { class: 'controls' }, this.bFirst, this.bPrev, this.bPlay, this.bNext, this.scrub, this.count);

    this.root.append(stage, this.caption, controls);
    this.root.addEventListener('keydown', (e) => {
      if (e.target.closest('input, select, textarea')) return;
      if (e.key === 'ArrowRight') this.go(this.i + 1);
      else if (e.key === 'ArrowLeft') this.go(this.i - 1);
      else if (e.key === ' ' && e.target === this.root) this.toggle();
      else return;
      e.preventDefault();
    });
    host.append(this.root);
    this.load(frames);
    if (autoplay) this.play();
  }

  load(frames, { start = 0, animate = true } = {}) {
    this.stop();
    this.frames = frames;
    if (this.fit === 'union' && this.View.measureAll && frames.length) this.view.opts.bounds = this.View.measureAll(frames);
    else if (this.view.opts) delete this.view.opts.bounds;
    this.scrub.replaceChildren(
      ...frames.map((_, i) => h('button', { class: 'tick', 'aria-label': `Step ${i + 1}`, onclick: () => this.go(i) })),
    );
    this.i = -1;
    if (frames.length) this.go(start, animate);
  }

  go(i, animate = true) {
    if (!this.frames.length) return;
    if (this.loop) i = (i + this.frames.length) % this.frames.length;
    i = Math.max(0, Math.min(this.frames.length - 1, i));
    if (i === this.i) return;
    this.i = i;
    const f = this.frames[i];
    this.view.show(f, { animate });
    this.caption.innerHTML = f.caption ?? '';
    this.badge.textContent = f.badge ?? '';
    this.badge.hidden = !f.badge;
    this.count.textContent = `${i + 1} / ${this.frames.length}`;
    [...this.scrub.children].forEach((t, k) => {
      t.classList.toggle('done', k < i);
      t.classList.toggle('now', k === i);
    });
    this.bPrev.disabled = !this.loop && i === 0;
    this.bNext.disabled = !this.loop && i === this.frames.length - 1;
    if (!this.loop && i === this.frames.length - 1) this.stop();
  }

  play() {
    if (!this.loop && this.i >= this.frames.length - 1) this.go(0);
    this.bPlay.innerHTML = icon.pause;
    this.bPlay.setAttribute('aria-label', 'Pause (Space)');
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (!this.root.isConnected) return this.stop();
      this.go(this.i + 1);
    }, this.interval);
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
    this.bPlay.innerHTML = icon.play;
    this.bPlay.setAttribute('aria-label', 'Play (Space)');
  }

  toggle() {
    if (this.timer) this.stop();
    else this.play();
  }
}
