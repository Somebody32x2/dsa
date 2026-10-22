# DSA, visually

Interactive lessons on data structures and algorithms. Each topic is a self-contained compartment with
animated figures you can step through, checkpoint quizzes, and practice that explains mistakes.

**Live site:** https://samuelshuster.com/education/dsa/ (part of [samuelshuster.com/education](https://samuelshuster.com/education/))

| Compartment | Path | What it covers |
|---|---|---|
| Trees & AVL rotations | [`trees/`](trees/) | BSTs, height and balance, rotations, trinode restructure(x), AVL insertion and deletion, drills, playground |
| The master theorem | [`master/`](master/) | Divide-and-conquer recurrences, recursion trees, the three cases, memorization drills, generated practice with guided walkthroughs, a step-by-step solver |

## Run locally

No build step, no dependencies. ES modules need to be served over HTTP:

```sh
npm start        # http://localhost:5173 (the hub; compartments at /trees/ and /master/)
npm test         # model tests for every compartment (node:test, Node 22+)
```

## Deployment

Pushes to `main` deploy automatically. Coolify builds the `Dockerfile` (nginx serving the repo as is) and
serves it at `samuelshuster.com/education/dsa`; the proxy strips that prefix before requests reach nginx.
Every `index.html` adds the trailing slash itself (relative URLs need it), and `nginx.conf` serves folder
indexes without nginx's own slash redirect, which would lose the prefix. The hub's "Education" link goes
one level up, to the education homepage (a separate repo and Coolify app).

## Layout

```
index.html          umbrella homepage (shared/hub.js renders the topic cards)
styles.css          shared design system (tokens, shell, figures, quizzes, scene SVG)
shared/
  topics.js         compartment registry: title, blurb, chapter list, path; the hub reads it
  shell.js          mountSite({ site, chapters, hero, legend }): sidebar with "All DSA topics", router, home, pager
  hub.js            homepage renderer
  core/scene.js     keyed SVG renderer: items glide between frames by id
  ui/               dom helpers, Player (stepper), checkpoint quizzes, figures, progress store
trees/              Trees compartment (its own engine, TreeView and copy of the UI; predates shared/)
master/             Master theorem compartment
  src/model/        master.js (analysis, generator, walkthrough), frames.js (recursion-tree figures)
  src/lessons/      one file per chapter; index.js sets the order
  src/ui/           practice tool (generated questions + guided walkthrough)
  tests/            model tests
```

Each compartment's `index.html` sets `<html data-site="...">`, which namespaces its saved quiz progress.

## Adding a compartment

1. Create `<topic>/index.html` (copy `master/index.html`; change `data-site`, title, description).
2. `<topic>/src/main.js`: `mountSite({ site, chapters, hero, legend })` from `../../shared/shell.js`.
3. Put the topic's model in `<topic>/src/model/` (no DOM) with tests in `<topic>/tests/`, and chapters in `<topic>/src/lessons/`.
4. Add an entry to `shared/topics.js`; the homepage lists it.

## Notation

- Trees follow Goodrich & Tamassia: z is the first unbalanced node, y its taller child, x y's taller child;
  a, b, c are x, y, z in inorder; T1 to T4 are the subtrees left to right.
- The master theorem follows Proposition 13.1.22: T(n) = aT(n/b) + f(n), a ≥ 1, b > 1, with cases on
  n^(log_b a) − ε, n^(log_b a) log^k n (k ≥ 0), and n^(log_b a) + ε with the regularity condition a f(n/b) ≤ c f(n).

## License

MIT
