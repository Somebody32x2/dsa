import { h, p } from '../ui/dom.js';
import { Player } from '../ui/player.js';
import { TreeView } from '../core/view.js';
import { figure, callout, segmented, toggle } from '../ui/figure.js';
import { checkpoint } from '../ui/quiz.js';
import { bst, still, idOf, section, rotationFrames, tag } from './kit.js';

const SANDBOX = [50, 30, 70, 20, 40, 60, 80, 35, 45];

function sandbox() {
  let t = bst(SANDBOX);
  const caption = h('div', { class: 'caption', 'aria-live': 'polite' });
  const stage = h('div', { class: 'stage' });
  const say = (html) => (caption.innerHTML = html);
  const view = new TreeView(stage, {
    height: 340,
    showInorder: true,
    onPick: (id) => {
      const n = t.inorder().find((m) => m.id === id);
      if (!n.parent) {
        say(`<b>${n.key}</b> is the root; it has no parent to rotate above. Click one of its children instead.`);
        return;
      }
      const par = n.parent;
      const dir = par.left === n ? 'right' : 'left';
      const moved = dir === 'right' ? n.right : n.left;
      t.rotate(n);
      view.show(still(t, '', { roles: { [n.id]: 'visit', [par.id]: 'path' } }));
      say(
        `Rotated <b>${n.key}</b> above <b>${par.key}</b>: a <b>${dir} rotation at ${par.key}</b>. ${
          moved ? `<b>${moved.key}</b>'s subtree switched from ${n.key} to ${par.key}.` : `The subtree that switches parent was empty.`
        } Inorder is unchanged.`,
      );
    },
  });
  const reset = () => {
    t = bst(SANDBOX);
    view.show(still(t), { animate: false });
    say('Click any node (except the root) to rotate it above its parent.');
  };
  const fig = figure(
    {
      title: 'Rotation sandbox',
      tools: [toggle('Heights', false, (v) => view.setOption('showHeights', v)), h('button', { class: 'btn ghost small', text: 'Reset', onclick: reset })],
      note: 'Try to make 35 the root. Then try to make the tree as tall as possible, and as short as possible. The inorder strip never changes.',
    },
    stage,
    caption,
  );
  view.show(still(t));
  say('Click any node (except the root) to rotate it above its parent.');
  return fig;
}

const quiz = [
  {
    type: 'mcq',
    id: 'rot.where',
    prompt: 'Node 50 has left child 30, and 30 has right child 40. After a <b>right rotation at 50</b>, where is 40?',
    choices: ['Still the right child of 30', 'Left child of 50', 'Right child of 50', 'The new root'],
    answer: 1,
    explain: '30 comes up and 50 goes down to 30\u2019s right. 40 lies between 30 and 50 in inorder, so it must end up to the right of 30 and to the left of 50: the left child of 50.',
  },
  {
    type: 'pick',
    id: 'rot.newroot',
    prompt: 'We do a <b>left rotation at the root</b> of this tree. Click the node that becomes the new root.',
    build: () => {
      const t = bst([30, 20, 60, 50, 70, 40]);
      return { frame: still(t), answer: [idOf(t, 60)] };
    },
    explain: 'A left rotation at a node lifts its right child: 60 moves up, 30 moves down to its left, and 60\u2019s old left subtree (50, 40) becomes 30\u2019s right subtree.',
  },
  {
    type: 'mcq',
    id: 'rot.invariant',
    prompt: 'Which statement is true of <b>every</b> rotation?',
    choices: ['The height of the tree goes down by one', 'The inorder sequence of keys stays the same', 'The root of the whole tree changes', 'Exactly one node changes depth'],
    answer: 1,
    explain: 'A rotation only changes parent/child links among two nodes and three subtrees, and it keeps their left-to-right order. Heights can go up, down or stay the same; that is why we choose rotations carefully.',
  },
  {
    type: 'mcq',
    id: 'rot.pointers',
    prompt: 'Not counting parent pointers, how many child links change in a single rotation (assuming the rotated pair has a parent above it)?',
    choices: ['1', '2', '3', '4'],
    answer: 2,
    explain: 'For a right rotation at b with left child a: the link from b\u2019s parent now points to a, a.right now points to b, and b.left now points to T2. Three links; they are the ones that flash in the figures.',
  },
];

export default {
  id: 'rotations',
  title: 'Rotations',
  group: 'Balance',
  blurb: 'The single move every balanced tree is built from: swap a parent and child without breaking the order.',
  quiz,
  render(root) {
    root.append(
      p('A <b>rotation</b> takes a node and its child and swaps who is on top. The child moves up one level, the parent moves down one level, and exactly one subtree changes hands so that the BST order still holds.'),
      p('Below, a and b are nodes with a &lt; b, and T1, T2, T3 are whole subtrees (triangles), which ride along untouched. Their colors stay with them so you can track them.'),
    );

    let player;
    const host = h('div');
    const fig = figure(
      {
        title: 'A single rotation',
        tools: [
          segmented(
            [
              { value: 'right', label: 'Right rotation' },
              { value: 'left', label: 'Left rotation' },
            ],
            'right',
            (v) => player.load(rotationFrames(v)),
            { label: 'Direction' },
          ),
        ],
        note: 'Press play or step forward. The links that flash are the three pointers that changed.',
      },
      host,
    );
    root.append(fig);
    player = new Player(host, { frames: rotationFrames('right'), view: { height: 330 }, interval: 1800 });

    root.append(
      callout(
        'key',
        'Why it is safe',
        'In inorder, everything reads <b>T1 a T2 b T3</b> before and after. T1 is still left of a, T3 still right of b, and T2, the keys between a and b, simply moves to the one place that keeps it between them. Order preserved means it is still a valid BST.',
      ),
    );

    root.append(section('Names for the same move'));
    root.append(p('Books name rotations two ways: by the node that goes <em>down</em> and the direction it goes, or by the node that comes <em>up</em>. They describe the same operation:'));
    root.append(
      h('div', { class: 'table-wrap reveal' }, h('table', { html: `
        <thead><tr><th>Picture</th><th>"Rotation at the top node"</th><th>"Rotate the child up"</th></tr></thead>
        <tbody>
          <tr><td>b's <b>left</b> child a comes up</td><td><b>right rotation</b> at b (b goes down-right)</td><td>rotate(a) / rotate a over b</td></tr>
          <tr><td>a's <b>right</b> child b comes up</td><td><b>left rotation</b> at a (a goes down-left)</td><td>rotate(b) / rotate b over a</td></tr>
        </tbody>` })),
    );
    root.append(p(`In the restructure chapter, "right rotation at ${tag('z')}" and "rotate(${tag('y')})" will mean the same thing whenever y is z's left child.`));

    root.append(section('Try it on real keys'));
    root.append(sandbox());

    root.append(checkpoint(quiz));
  },
};
