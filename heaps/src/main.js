import { mountSite } from '../../shared/shell.js';
import { chapters, hero, legend } from './lessons/index.js';

mountSite({
  site: {
    title: 'Heaps',
    eyebrow: 'Priority queues \u00b7 Complete binary trees \u00b7 Arrays',
    heroTitle: 'Heaps, <em>seen</em>.',
    heroLede:
      'The smallest key always on top, in a tree that fits in a plain array. Watch a new key climb with up-heap and the last key sink with down-heap, and see why neither takes more than log n swaps.',
    logo: '<svg viewBox="0 0 24 24"><path d="M12 5 6.5 12M12 5l5.5 7" /><circle cx="12" cy="5" r="2.6" class="accent" /><circle cx="6.5" cy="12" r="2.6" /><circle cx="17.5" cy="12" r="2.6" /><rect x="3" y="17.5" width="18" height="4" rx="1" /></svg>',
  },
  chapters,
  hero,
  legend,
});
