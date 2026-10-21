import { h, icon } from './ui/dom.js';
import { Player } from './ui/player.js';
import { figure } from './ui/figure.js';
import { progress } from './ui/progress.js';
import { chapters } from './lessons/index.js';
import { caseFrames, tag } from './lessons/kit.js';

const app = document.getElementById('app');
const nav = h('nav', { class: 'nav', 'aria-label': 'Chapters' });
const main = h('main', { class: 'main', id: 'main' });
const menuBtn = h('button', {
  class: 'icon-btn menu-btn',
  'aria-label': 'Chapters',
  html: icon.menu,
  onclick: () => document.body.classList.toggle('nav-open'),
});
const sidebar = h(
  'aside',
  { class: 'sidebar' },
  h('a', { class: 'brand', href: '#/' }, h('span', { class: 'brand-mark', html: logo() }), h('span', { text: 'Tree Rotations' })),
  nav,
  h(
    'div',
    { class: 'side-foot' },
    h('button', {
      class: 'link',
      text: 'Reset quiz progress',
      onclick: () => {
        if (confirm('Clear all saved quiz answers?')) progress.reset();
      },
    }),
    h('a', { class: 'link', href: 'https://github.com/Somebody32x2/tree-rotations', text: 'Source on GitHub' }),
  ),
);
app.append(h('header', { class: 'topbar' }, menuBtn, h('a', { class: 'brand', href: '#/' }, 'Tree Rotations')), sidebar, main);

function logo() {
  return '<svg viewBox="0 0 24 24"><path d="M12 5 6.5 12M12 5l5.5 7M6.5 12 4 19M6.5 12 9 19" /><circle cx="12" cy="5" r="2.6" /><circle cx="6.5" cy="12" r="2.6" /><circle cx="17.5" cy="12" r="2.6" class="accent" /></svg>';
}

function quizIds(ch) {
  return ch.quiz.map((q) => q.id);
}

function renderNav(current) {
  const groups = [];
  for (const ch of chapters) {
    let g = groups.find((x) => x.name === ch.group);
    if (!g) groups.push((g = { name: ch.group, items: [] }));
    g.items.push(ch);
  }
  nav.replaceChildren(
    h('a', { class: `nav-item${current === 'home' ? ' on' : ''}`, href: '#/' }, h('span', { class: 'nav-num', text: '' }), h('span', { text: 'Overview' })),
    ...groups.map((g) =>
      h(
        'div',
        { class: 'nav-group' },
        h('div', { class: 'nav-label', text: g.name }),
        g.items.map((ch) => {
          const ids = quizIds(ch);
          const got = progress.correct(ids);
          const n = chapters.indexOf(ch) + 1;
          return h(
            'a',
            { class: `nav-item${current === ch.id ? ' on' : ''}`, href: `#/${ch.id}` },
            h('span', { class: 'nav-num', text: String(n).padStart(2, '0') }),
            h('span', { class: 'nav-title', text: ch.title }),
            ids.length
              ? h('span', {
                  class: `nav-prog${got === ids.length ? ' full' : ''}`,
                  title: `${got} of ${ids.length} checkpoint questions correct`,
                  html: got === ids.length ? icon.check : `${got}/${ids.length}`,
                })
              : null,
          );
        }),
      ),
    ),
  );
}

function renderHome() {
  document.title = 'Tree Rotations: AVL trees, visually';
  const hero = h(
    'section',
    { class: 'hero' },
    h('div', { class: 'eyebrow', text: 'Binary trees \u00b7 AVL trees \u00b7 trinode restructuring' }),
    h('h1', { html: 'Rotations, <em>seen</em>.' }),
    h('p', {
      class: 'lede',
      html: `An interactive course on balanced binary search trees. You will learn what <b>restructure(x)</b> does, why there are four cases (left-left, left-right, right-right, right-left), and why they all end in the same picture, with checkpoints along the way.`,
    }),
    h('div', { class: 'hero-actions' }, h('a', { class: 'btn', href: `#/${chapters[0].id}`, html: `Start with chapter 1 ${icon.arrow}` }), h('a', { class: 'btn ghost', href: '#/restructure', text: 'Jump to restructure(x)' })),
  );
  const demo = h('div');
  const fig = figure({ title: 'A left-right restructure, as two rotations', wide: true }, demo);
  const legend = h('div', { class: 'legend reveal' },
    legendItem(`${tag('z')} ${tag('y')} ${tag('x')}`, 'z is the unbalanced node, y its taller child, x y\u2019s taller child'),
    legendItem(`${tag('a')} ${tag('b')} ${tag('c')}`, 'the same three nodes, renamed by key order (inorder)'),
    legendItem(`${tag('T1')} ${tag('T2')} ${tag('T3')} ${tag('T4')}`, 'the four subtrees hanging below them, left to right'),
    legendItem('<span class="legend-line"></span>', 'a link that just changed: one rotation changes exactly three'),
  );

  const grid = h(
    'div',
    { class: 'chapter-grid' },
    chapters.map((ch, i) => {
      const ids = quizIds(ch);
      const got = progress.correct(ids);
      return h(
        'a',
        { class: 'chapter-card reveal', href: `#/${ch.id}`, style: `--i:${i}` },
        h('div', { class: 'card-top' }, h('span', { class: 'card-num', text: String(i + 1).padStart(2, '0') }), h('span', { class: 'tg-group', text: ch.group })),
        h('h3', { text: ch.title }),
        h('p', { text: ch.blurb }),
        ids.length ? h('div', { class: 'card-prog' }, h('span', { style: `width:${(100 * got) / ids.length}%` })) : null,
      );
    }),
  );

  main.replaceChildren(
    h('article', { class: 'page home' }, hero, fig, legend, h('h2', { class: 'reveal', text: 'Chapters' }), grid),
  );
  new Player(demo, { frames: caseFrames('LR', 'rotations'), view: { height: 400 }, loop: true, autoplay: true, interval: 3200 });
}

function legendItem(sym, text) {
  return h('div', { class: 'legend-item' }, h('div', { class: 'legend-sym', html: sym }), h('div', { class: 'legend-text', html: text }));
}

function renderChapter(ch) {
  const i = chapters.indexOf(ch);
  document.title = `${ch.title} \u00b7 Tree Rotations`;
  const article = h('article', { class: 'page' });
  article.append(
    h('header', { class: 'page-head' },
      h('div', { class: 'eyebrow', text: `Chapter ${i + 1} \u00b7 ${ch.group}` }),
      h('h1', { text: ch.title }),
      h('p', { class: 'lede', text: ch.blurb }),
    ),
  );
  main.replaceChildren(article);
  ch.render(article);
  const prev = chapters[i - 1];
  const next = chapters[i + 1];
  article.append(
    h('nav', { class: 'pager' },
      prev ? h('a', { class: 'pager-link', href: `#/${prev.id}` }, h('span', { class: 'eyebrow', text: 'Previous' }), h('span', { text: prev.title })) : h('span'),
      next ? h('a', { class: 'pager-link next', href: `#/${next.id}` }, h('span', { class: 'eyebrow', text: 'Next' }), h('span', { text: next.title })) : h('span'),
    ),
  );
}

const observer = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        observer.unobserve(e.target);
      }
    }
  },
  { rootMargin: '0px 0px -8% 0px' },
);

function route() {
  const id = location.hash.replace(/^#\/?/, '');
  const ch = chapters.find((c) => c.id === id);
  document.body.classList.remove('nav-open');
  if (ch) renderChapter(ch);
  else renderHome();
  renderNav(ch ? ch.id : 'home');
  window.scrollTo(0, 0);
  main.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}

addEventListener('hashchange', route);
addEventListener('progress', () => renderNav(chapters.find((c) => location.hash === `#/${c.id}`)?.id ?? 'home'));
route();
