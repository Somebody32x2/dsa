import { h, icon } from './ui/dom.js';
import { Player } from './ui/player.js';
import { figure } from './ui/figure.js';
import { progress } from './ui/progress.js';
import { REPO } from './topics.js';

/**
 * Mounts one compartment (topic site): sidebar with a link back to the umbrella homepage,
 * hash router (#/chapter-id), home page, chapter pages with a pager.
 *
 * site:     { title, eyebrow, heroTitle (HTML), heroLede (HTML), logo? (SVG markup), start? }
 * chapters: [{ id, title, group, blurb, quiz, render(root) }] in reading order
 * hero:     () => ({ title, frames, View?, view? }) | null   looping figure on the home page
 * legend:   [{ sym: HTML, text: HTML }]
 */
export function mountSite({ site, chapters, hero = null, legend = [] }) {
  const app = document.getElementById('app');
  const nav = h('nav', { class: 'nav', 'aria-label': 'Chapters' });
  const main = h('main', { class: 'main', id: 'main' });
  const brand = () => h('a', { class: 'brand', href: '#/' }, h('span', { class: 'brand-mark', html: site.logo ?? LOGO }), h('span', { text: site.title }));
  const upLink = () => h('a', { class: 'up-link', href: '../', html: `${icon.arrow}<span>All DSA topics</span>` });

  app.append(
    h('header', { class: 'topbar' },
      h('button', { class: 'icon-btn menu-btn', 'aria-label': 'Chapters', html: icon.menu, onclick: () => document.body.classList.toggle('nav-open') }),
      brand(),
      upLink(),
    ),
    h('aside', { class: 'sidebar' },
      upLink(),
      brand(),
      nav,
      h('div', { class: 'side-foot' },
        h('button', { class: 'link', text: 'Reset quiz progress', onclick: () => confirm('Clear all saved quiz answers?') && progress.reset() }),
        h('a', { class: 'link', href: REPO, text: 'Source on GitHub' }),
      ),
    ),
    main,
  );

  const quizIds = (ch) => (ch.quiz ?? []).map((q) => q.id);
  const num = (ch) => String(chapters.indexOf(ch) + 1).padStart(2, '0');

  function renderNav(current) {
    const groups = [];
    for (const ch of chapters) {
      let g = groups.find((x) => x.name === ch.group);
      if (!g) groups.push((g = { name: ch.group, items: [] }));
      g.items.push(ch);
    }
    nav.replaceChildren(
      h('a', { class: `nav-item${current === 'home' ? ' on' : ''}`, href: '#/' }, h('span', { class: 'nav-num' }), h('span', { text: 'Overview' })),
      ...groups.map((g) =>
        h('div', { class: 'nav-group' },
          g.name && h('div', { class: 'nav-label', text: g.name }),
          g.items.map((ch) => {
            const ids = quizIds(ch);
            const got = progress.correct(ids);
            return h('a', { class: `nav-item${current === ch.id ? ' on' : ''}`, href: `#/${ch.id}` },
              h('span', { class: 'nav-num', text: num(ch) }),
              h('span', { class: 'nav-title', text: ch.title }),
              ids.length > 0 &&
                h('span', {
                  class: `nav-prog${got === ids.length ? ' full' : ''}`,
                  title: `${got} of ${ids.length} checkpoint questions correct`,
                  html: got === ids.length ? icon.check : `${got}/${ids.length}`,
                }),
            );
          }),
        ),
      ),
    );
  }

  function renderHome() {
    document.title = `${site.title} \u00b7 DSA, visually`;
    const page = h('article', { class: 'page home' },
      h('section', { class: 'hero' },
        h('div', { class: 'eyebrow', text: site.eyebrow }),
        h('h1', { html: site.heroTitle }),
        h('p', { class: 'lede', html: site.heroLede }),
        h('div', { class: 'hero-actions' },
          h('a', { class: 'btn', href: `#/${chapters[0].id}`, html: `Start with chapter 1 ${icon.arrow}` }),
          site.start && h('a', { class: 'btn ghost', href: `#/${site.start.id}`, text: site.start.label }),
        ),
      ),
    );
    main.replaceChildren(page);

    if (hero) {
      const host = h('div');
      const { frames, title, View, view } = hero();
      page.append(figure({ title, wide: true }, host));
      new Player(host, { frames, View, view: { height: 380, ...view }, loop: true, autoplay: true, interval: 2800 });
    }
    if (legend.length) {
      page.append(
        h('div', { class: 'legend reveal' },
          legend.map((l) => h('div', { class: 'legend-item' }, h('div', { class: 'legend-sym', html: l.sym }), h('div', { class: 'legend-text', html: l.text }))),
        ),
      );
    }
    page.append(
      h('h2', { class: 'reveal', text: 'Chapters' }),
      h('div', { class: 'chapter-grid' },
        chapters.map((ch, i) => {
          const ids = quizIds(ch);
          const got = progress.correct(ids);
          return h('a', { class: 'chapter-card reveal', href: `#/${ch.id}`, style: `--i:${i % 6}` },
            h('div', { class: 'card-top' }, h('span', { class: 'card-num', text: num(ch) }), ch.group && h('span', { class: 'card-group', text: ch.group })),
            h('h3', { text: ch.title }),
            h('p', { text: ch.blurb }),
            ids.length > 0 && h('div', { class: 'card-prog' }, h('span', { style: `width:${(100 * got) / ids.length}%` })),
          );
        }),
      ),
    );
  }

  function renderChapter(ch) {
    const i = chapters.indexOf(ch);
    document.title = `${ch.title} \u00b7 ${site.title}`;
    const article = h('article', { class: 'page' },
      h('header', { class: 'page-head' },
        h('div', { class: 'eyebrow', text: `Chapter ${i + 1}${ch.group ? ` \u00b7 ${ch.group}` : ''}` }),
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
        next
          ? h('a', { class: 'pager-link next', href: `#/${next.id}` }, h('span', { class: 'eyebrow', text: 'Next' }), h('span', { text: next.title }))
          : h('a', { class: 'pager-link next', href: '../' }, h('span', { class: 'eyebrow', text: 'Done' }), h('span', { text: 'All DSA topics' })),
      ),
    );
  }

  const currentId = () => chapters.find((c) => location.hash === `#/${c.id}`)?.id ?? 'home';

  function route() {
    const ch = chapters.find((c) => location.hash === `#/${c.id}`);
    document.body.classList.remove('nav-open');
    if (ch) renderChapter(ch);
    else renderHome();
    renderNav(currentId());
    window.scrollTo(0, 0);
    observeReveals(main);
  }

  addEventListener('hashchange', route);
  addEventListener('progress', () => renderNav(currentId()));
  route();
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

/** Fade in every `.reveal` under root as it scrolls into view. */
export function observeReveals(root) {
  root.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}

const LOGO =
  '<svg viewBox="0 0 24 24"><path d="M12 5 6.5 12M12 5l5.5 7M6.5 12 4 19M6.5 12 9 19" /><circle cx="12" cy="5" r="2.6" /><circle cx="6.5" cy="12" r="2.6" /><circle cx="17.5" cy="12" r="2.6" class="accent" /></svg>';
