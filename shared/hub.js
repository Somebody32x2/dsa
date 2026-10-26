import { h, icon } from './ui/dom.js';
import { observeReveals } from './shell.js';
import { topics, REPO } from './topics.js';

/** Count of correctly answered checkpoint questions saved by a compartment. */
function solved(storage) {
  try {
    return Object.values(JSON.parse(localStorage.getItem(`${storage}.progress.v1`)) ?? {}).filter((v) => v === true).length;
  } catch {
    return 0;
  }
}

const main = h('main', { class: 'main', id: 'main' },
  h('article', { class: 'page home' },
    // The DSA hub lives at samuelshuster.com/education/dsa/; one level up is the education homepage.
    h('a', { class: 'up-link hub-up', href: '../', html: `${icon.arrow}<span>Education</span>` }),
    h('section', { class: 'hero' },
      h('div', { class: 'eyebrow', text: 'Data structures \u00b7 Algorithms' }),
      h('h1', { html: 'DSA, <em>seen</em>.' }),
      h('p', {
        class: 'lede',
        text: 'Interactive lessons for data structures and algorithms. Each topic has figures you can step through, checkpoints after every idea, and practice that explains the answer when you get one wrong.',
      }),
    ),
    h('h2', { class: 'reveal', text: 'Topics' }),
    h('div', { class: 'topic-grid' },
      topics.map((t, i) => {
        const n = solved(t.storage);
        return h('a', { class: 'topic-card reveal', href: t.href, style: `--i:${i}` },
          h('div', { class: 'topic-art', html: t.art }),
          h('h3', { text: t.title }),
          h('p', { text: t.blurb }),
          h('ul', { class: 'topic-list' }, t.chapters.map((c) => h('li', { text: c }))),
          h('div', { class: 'topic-foot' },
            h('span', { text: n > 0 ? `${n} checkpoint question${n === 1 ? '' : 's'} solved` : `${t.chapters.length} chapter${t.chapters.length === 1 ? '' : 's'}` }),
            h('span', { class: 'go', html: `Open ${icon.arrow}` }),
          ),
        );
      }),
    ),
    h('p', { class: 'muted hub-foot' }, h('a', { class: 'link', href: REPO, text: 'Source on GitHub' })),
  ),
);

document.body.classList.add('hub-body');
document.getElementById('app').append(main);
observeReveals(main);
