import { h, p } from '../ui/dom.js';
import { Player } from '../ui/player.js';
import { TreeView } from '../core/view.js';
import { figure, callout, segmented } from '../ui/figure.js';
import { checkpoint } from '../ui/quiz.js';
import { avl, still, idOf, section, caseFrames, identifyFrame, tag, CASES } from './kit.js';

const QUIZ_TREE = [50, 30, 70, 20, 40, 60, 80, 35, 45];

function caseFigure() {
  let kase = 'LR';
  let style = 'rotations';
  let player;
  const host = h('div');
  const reload = () => player.load(caseFrames(kase, style));
  const fig = figure(
    {
      title: 'restructure(x), one case at a time',
      wide: true,
      tools: [
        segmented(
          ['LL', 'LR', 'RR', 'RL'].map((k) => ({ value: k, label: k })),
          kase,
          (v) => ((kase = v), reload()),
          { label: 'Case' },
        ),
        segmented(
          [
            { value: 'rotations', label: 'As rotations' },
            { value: 'trinode', label: 'One step' },
          ],
          style,
          (v) => ((style = v), reload()),
          { label: 'Show as' },
        ),
      ],
      note: 'Triangles are whole subtrees; the label inside is the height (h or h\u22121). Next to each node: balance factor (top) and height (bottom). Try every case in both modes, and watch the inorder strip.',
    },
    host,
  );
  player = new Player(host, { frames: caseFrames(kase, style), view: { height: 420 }, interval: 2600 });
  return fig;
}

function compareGrid() {
  const grid = h('div', { class: 'case-grid' });
  const cells = ['LL', 'RR', 'LR', 'RL'].map((k) => {
    const stage = h('div', { class: 'stage mini' });
    const cell = h(
      'div',
      { class: 'case-cell' },
      h('div', { class: 'case-label' }, h('b', { text: k }), h('span', { text: CASES[k].double ? 'double rotation, b = x' : 'single rotation, b = y' })),
      stage,
    );
    const view = new TreeView(stage, { height: 250, minHeight: 180, duration: 900 });
    const frames = caseFrames(k, 'trinode', { inorder: false }).map((f) => ({ ...f, view: {} }));
    return { cell, view, before: frames[1], after: frames[frames.length - 1] };
  });
  grid.append(...cells.map((c) => c.cell));
  cells.forEach((c) => c.view.show(c.before, { animate: false }));

  let after = false;
  const button = h('button', {
    class: 'btn small',
    text: 'Restructure all four',
    onclick: () => {
      after = !after;
      cells.forEach((c) => c.view.show(after ? c.after : c.before));
      button.textContent = after ? 'Back to the four shapes' : 'Restructure all four';
    },
  });
  return figure(
    {
      title: 'Four shapes, one answer',
      wide: true,
      tools: [button],
      note: 'Every case ends in the same tree: b on top, a and c as its children, T1 to T4 hanging in order. The only thing that differs is which of x, y, z gets to be b.',
    },
    grid,
  );
}

function textbookFigure() {
  let style = 'rotations';
  let player;
  const host = h('div');
  const make = () => {
    const t = avl([44, 17, 78, 32, 50, 88, 48, 62], { style });
    const frames = t.insert(54);
    return frames.slice(frames.indexOf(identifyFrame(frames)) - 1);
  };
  const fig = figure(
    {
      title: 'On real keys: inserting 54',
      tools: [
        segmented(
          [
            { value: 'rotations', label: 'As rotations' },
            { value: 'trinode', label: 'One step' },
          ],
          style,
          (v) => ((style = v), player.load(make())),
          { label: 'Show as' },
        ),
      ],
      note: 'Empty subtrees appear as dashed boxes while they are being moved, so you can still see where T1 to T4 go.',
    },
    host,
  );
  player = new Player(host, { frames: make(), view: { height: 380 } });
  return fig;
}

const quiz = [
  {
    type: 'mcq',
    id: 'rs.b',
    prompt: 'y is the <b>left</b> child of z, and x is the <b>right</b> child of y. Which node becomes b, the root of the restructured subtree?',
    choices: ['z', 'y', 'x', 'Whichever has the smallest key'],
    answer: 2,
    explain: 'In inorder this shape reads y, x, z (y < x < z), so a = y, b = x, c = z. Zig-zag shapes always put x in the middle, which is why they need two rotations: x has to climb two levels.',
  },
  {
    type: 'pick',
    id: 'rs.xyz',
    prompt: 'We just inserted <b>42</b> (green) into this AVL tree. Click <b>z</b>, then <b>y</b>, then <b>x</b>. Balance factors are shown.',
    ordered: true,
    labels: ['z', 'y', 'x'],
    view: { showBalance: true, height: 300 },
    build: () => {
      const t = avl(QUIZ_TREE);
      const f = identifyFrame(t.insert(42));
      return { frame: { tree: f.tree, roles: { [idOf(t, 42)]: 'new' } }, answer: [f.meta.z, f.meta.y, f.meta.x] };
    },
    explain: 'Walk up from 42: 45 is +1 (fine), 40 is \u22121 (fine), and 30 is \u22122, the first unbalanced node, so z = 30. (50 is +2 as well, but it is further up. z is always the <em>first</em> one, and fixing it also fixes 50, because 30\u2019s subtree gets its old height back.) y = 40 is z\u2019s taller child and x = 45 is y\u2019s taller child; both lie on the path to 42. Right-right case: one left rotation at 30.',
  },
  {
    type: 'mcq',
    id: 'rs.rl',
    prompt: 'Which rotations perform the <b>right-left</b> (RL) restructure?',
    choices: ['One left rotation at z', 'Left rotation at y, then right rotation at z', 'Right rotation at y, then left rotation at z', 'Right rotation at z, then left rotation at y'],
    answer: 2,
    explain: 'y is z\u2019s right child and x is y\u2019s left child. First a right rotation at y lifts x above y, which straightens the zig-zag into a right-right line. Then a left rotation at z lifts x to the top.',
  },
  {
    type: 'mcq',
    id: 'rs.t2',
    prompt: 'After restructure(x), what is the parent of T2?',
    choices: ['a', 'b', 'c', 'It depends on the case'],
    answer: 0,
    explain: 'The result has one fixed shape in every case: b(a(T1, T2), c(T3, T4)). T2 is always a\u2019s right subtree.',
  },
  {
    type: 'pick',
    id: 'rs.pickb',
    prompt: 'Same starting tree, but this time we inserted <b>33</b>. Click the node that will end up on top of the restructured subtree (b).',
    view: { showBalance: true, height: 300 },
    build: () => {
      const t = avl(QUIZ_TREE);
      const frames = t.insert(33);
      const f = identifyFrame(frames);
      return {
        frame: { tree: f.tree, roles: { [idOf(t, 33)]: 'new' } },
        answer: [f.meta.b],
        after: { ...frames[frames.length - 1], roles: {} },
      };
    },
    explain: 'z = 30 (balance \u22122), y = 40 (z\u2019s right child), x = 35 (y\u2019s left child). That zig-zag is the right-left case, so b = x = 35. Inorder 30 < 35 < 40, so 35 is the middle key. After the restructure (shown), 35 sits above 30 and 40.',
  },
];

export default {
  id: 'restructure',
  title: 'Trinode restructure',
  group: 'Balance',
  blurb: 'restructure(x): the single operation behind every AVL fix. Four cases, one result.',
  quiz,
  render(root) {
    root.append(
      p('When an update leaves some node with balance \u00b12, an AVL tree repairs it with one operation, <b>restructure(x)</b>, also called a <b>trinode restructuring</b>. It works on three nodes and the four subtrees hanging off them. First you name the three nodes by their family relationship, then you rename them by their key order.'),
    );
    root.append(
      h('div', { class: 'cast reveal' },
        h('div', { class: 'cast-col' },
          h('div', { class: 'eyebrow', text: 'By family: x, y, z' }),
          h('dl', { html: `
            <dt>${tag('z')}</dt><dd>the first unbalanced node you meet walking up from the change</dd>
            <dt>${tag('y')}</dt><dd>z's child with the greater height</dd>
            <dt>${tag('x')}</dt><dd>y's child with the greater height (a grandchild of z)</dd>` })),
        h('div', { class: 'cast-col' },
          h('div', { class: 'eyebrow', text: 'By inorder: a, b, c and T1\u2013T4' }),
          h('dl', { html: `
            <dt>${tag('a')} ${tag('b')} ${tag('c')}</dt><dd>x, y, z sorted by key: a is the smallest, b the middle, c the largest</dd>
            <dt>${tag('T1')}\u2013${tag('T4')}</dt><dd>the four subtrees of x, y, z that are not rooted at x, y or z, listed left to right</dd>` })),
      ),
    );
    root.append(
      p('Then the rule is always the same: <b>b goes on top, a becomes its left child and c its right child, T1 and T2 hang under a, and T3 and T4 hang under c.</b> It is the most balanced way to arrange three nodes and four subtrees while keeping their left-to-right order.'),
    );

    root.append(caseFigure());

    root.append(section('Four shapes, one answer'));
    root.append(p('x, y and z can be arranged in four ways, named by the path from z down to x: left-left, left-right, right-right, right-left. They look different, but they all end in the same place.'));
    root.append(compareGrid());

    root.append(section('Single or double rotation?'));
    root.append(
      p('If you do the restructure with rotations, the shape tells you how many. The goal is to get b to the top. In a <b>straight line</b> (LL, RR), b = y, which is already one level below z: one rotation does it. In a <b>zig-zag</b> (LR, RL), b = x, which is two levels below z: it needs two rotations, first at y (which turns the zig-zag into a straight line), then at z.'),
    );
    root.append(
      h('div', { class: 'table-wrap reveal' }, h('table', { html: `
        <thead><tr><th>Case</th><th>Shape</th><th>a, b, c</th><th>Rotations</th></tr></thead>
        <tbody>
          <tr><td><b>LL</b> left-left</td><td>y = z.left, x = y.left</td><td>x, y, z</td><td>single: right rotation at z</td></tr>
          <tr><td><b>RR</b> right-right</td><td>y = z.right, x = y.right</td><td>z, y, x</td><td>single: left rotation at z</td></tr>
          <tr><td><b>LR</b> left-right</td><td>y = z.left, x = y.right</td><td>y, x, z</td><td>double: left rotation at y, then right rotation at z</td></tr>
          <tr><td><b>RL</b> right-left</td><td>y = z.right, x = y.left</td><td>z, x, y</td><td>double: right rotation at y, then left rotation at z</td></tr>
        </tbody>` })),
    );
    root.append(
      callout('key', 'A double rotation is not a new operation', 'It is two single rotations, both lifting x: first above y, then above z. In the textbook\u2019s words, rotate(x) twice. A single rotation is rotate(y) once. Either way the result is exactly what restructure(x) builds in one step.'),
    );

    root.append(section('The algorithm'));
    root.append(
      h('pre', { class: 'code reveal', html: `<span class="kw">Algorithm</span> restructure(x):
  <span class="cm">Input: a node x of a binary search tree with parent y and grandparent z</span>
  <span class="cm">Output: the tree after a trinode restructuring involving x, y, z</span>

  1. Let (a, b, c) be a left-to-right (inorder) listing of x, y, z, and let
     (T1, T2, T3, T4) be a left-to-right listing of the four subtrees of
     x, y, z that are not rooted at x, y, or z.
  2. Replace the subtree rooted at z with a new subtree rooted at b.
  3. Let a be the left child of b, and let T1, T2 be the left and right
     subtrees of a.
  4. Let c be the right child of b, and let T3, T4 be the left and right
     subtrees of c.
  5. Recompute the heights of a, c, then b.` }),
    );
    root.append(
      p('Why does this balance everything? After an insertion that made z \u00b12, the subtrees have heights h or h\u22121, as in the figure. a ends up with T1, T2 (heights within one of each other), c with T3, T4, so a and c are balanced at height h+1, and b sits on two subtrees of height h+1. The result has height h+2, exactly z\u2019s height before the insertion.'),
    );

    root.append(section('On real keys'));
    root.append(p('Here is the same thing in a real AVL tree. Inserting 54 makes 78 unbalanced; 50 is its taller child and 62 is 50\u2019s taller child. 50 is a left child and 62 is a right child: left-right, so b = 62.'));
    root.append(textbookFigure());

    root.append(checkpoint(quiz));
  },
};
