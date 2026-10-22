import { mountSite } from '../../shared/shell.js';
import { chapters, hero, legend } from './lessons/index.js';

mountSite({
  site: {
    title: 'Master Theorem',
    eyebrow: 'Recurrences \u00b7 Recursion trees \u00b7 Divide and conquer',
    heroTitle: 'The master theorem, <em>seen</em>.',
    heroLede:
      'Solve recurrences of the form <span class="m">T(n) = aT(n/b) + f(n)</span> on sight. See why the three cases exist by watching where a recursion tree does its work, learn the statement well enough to write it from memory, then practice on generated problems that walk you through every mistake.',
    logo: '<svg viewBox="0 0 24 24"><rect x="3" y="3.5" width="18" height="4" rx="1" /><rect x="6" y="10" width="12" height="4" rx="1" /><rect x="9" y="16.5" width="6" height="4" rx="1" class="accent" /></svg>',
  },
  chapters,
  hero,
  legend,
});
