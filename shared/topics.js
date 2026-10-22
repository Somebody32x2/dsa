/**
 * The umbrella's compartments, in the order the homepage lists them.
 * Adding a compartment: make a folder with its own index.html (<html data-site="<storage>">),
 * mount it with shared/shell.js, then add an entry here.
 */
export const REPO = 'https://github.com/Somebody32x2/dsa';

export const topics = [
  {
    href: 'trees/',
    title: 'Trees & AVL rotations',
    blurb: 'Binary search trees, balance, single and double rotations, restructure(x), AVL insertion and deletion, and their running times.',
    chapters: ['BSTs', 'Height & balance', 'Rotations', 'restructure(x)', 'AVL insert', 'AVL delete', 'Running time', 'Drills', 'Playground'],
    storage: 'tree-rotations', // localStorage namespace of that compartment's quiz progress
    art: '<svg viewBox="0 0 120 80"><path d="M60 14 34 40M60 14l26 26M34 40 20 66M34 40l14 26" /><circle cx="60" cy="14" r="9" fill="var(--surface)" /><circle cx="34" cy="40" r="9" fill="var(--surface)" /><circle cx="86" cy="40" r="9" fill="var(--blue-bg)" /><circle cx="20" cy="66" r="9" fill="var(--surface)" /><circle cx="48" cy="66" r="9" fill="var(--surface)" /></svg>',
  },
  {
    href: 'master/',
    title: 'The master theorem',
    blurb: 'Solve divide-and-conquer recurrences T(n) = aT(n/b) + f(n): why the three cases work, how to remember them, and generated practice that walks you through mistakes.',
    chapters: ['Recurrences', 'Recursion trees', 'Who wins', 'The three cases', 'Fine print', 'Memorize', 'Practice', 'Walkthrough'],
    storage: 'master',
    art: '<svg viewBox="0 0 120 80"><rect x="10" y="10" width="100" height="10" rx="2" fill="var(--surface)" /><rect x="22" y="28" width="76" height="10" rx="2" fill="var(--surface)" /><rect x="34" y="46" width="52" height="10" rx="2" fill="var(--surface)" /><rect x="44" y="64" width="32" height="10" rx="2" fill="var(--yellow-bg)" /></svg>',
  },
];
