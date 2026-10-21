import { h, icon } from './dom.js';
import { TreeView } from '../core/view.js';
import { progress } from './progress.js';

/**
 * Question shapes:
 *   { type: 'mcq',  id, prompt, choices: [html], answer: index, explain }
 *   { type: 'pick', id, prompt, build: () => ({ frame, answer: [nodeId], after? }), ordered, labels, view, explain }
 * For ordered picks, `labels` names each click in turn (e.g. ['z', 'y', 'x']).
 */
export function checkpoint(questions, { title = 'Checkpoint' } = {}) {
  const card = h('section', { class: 'quiz reveal' });
  const head = h('div', { class: 'quiz-head' });
  const body = h('div', { class: 'quiz-body' });
  const foot = h('div', { class: 'quiz-foot' });
  card.append(head, body, foot);

  let i = 0;
  let results = [];

  const header = () => {
    head.replaceChildren(
      h('span', { class: 'eyebrow', text: title }),
      h(
        'div',
        { class: 'quiz-dots' },
        questions.map((q, k) =>
          h('span', {
            class: `dot${k === i ? ' now' : ''}${results[k] === true ? ' ok' : results[k] === false ? ' bad' : ''}`,
            title: progress.data[q.id] === true ? 'Answered correctly before' : '',
          }),
        ),
      ),
      h('span', { class: 'quiz-count', text: i < questions.length ? `${i + 1} of ${questions.length}` : 'Done' }),
    );
  };

  const show = () => {
    header();
    foot.replaceChildren();
    body.replaceChildren();
    if (i >= questions.length) return summary();
    const q = questions[i];
    const done = (correct) => {
      results[i] = correct;
      progress.record(q.id, correct);
      header();
      foot.replaceChildren(
        h('button', {
          class: 'btn',
          html: `${i + 1 < questions.length ? 'Next question' : 'See results'} ${icon.arrow}`,
          onclick: () => {
            i++;
            show();
          },
        }),
      );
    };
    body.append(q.type === 'mcq' ? mcq(q, done) : pick(q, done));
  };

  const summary = () => {
    const score = results.filter(Boolean).length;
    const all = score === questions.length;
    body.append(
      h('div', { class: 'quiz-summary' },
        h('div', { class: 'score', text: `${score} / ${questions.length}` }),
        h('p', {
          text: all
            ? 'All correct. You have this one.'
            : 'Re-read the parts you missed, step through the figures again, then retake it. The questions are the same, so aim for a clean run.',
        }),
      ),
    );
    foot.append(
      h('button', {
        class: 'btn ghost',
        text: 'Retake',
        onclick: () => {
          i = 0;
          results = [];
          show();
        },
      }),
    );
  };

  show();
  return card;
}

function feedback(correct, explain) {
  return h(
    'div',
    { class: `feedback ${correct ? 'ok' : 'bad'}` },
    h('div', { class: 'verdict', text: correct ? 'Correct.' : 'Not quite.' }),
    explain && h('div', { html: explain }),
  );
}

function mcq(q, done) {
  const wrap = h('div', { class: 'q' }, h('div', { class: 'prompt', html: q.prompt }));
  const list = h('div', { class: 'choices' });
  let locked = false;
  const buttons = q.choices.map((c, k) =>
    h(
      'button',
      {
        class: 'choice',
        onclick: () => {
          if (locked) return;
          locked = true;
          const correct = k === q.answer;
          buttons.forEach((b, j) => {
            b.disabled = true;
            if (j === q.answer) b.classList.add('right');
            else if (j === k) b.classList.add('wrong');
          });
          wrap.append(feedback(correct, q.explain));
          done(correct);
        },
      },
      h('span', { class: 'letter', text: String.fromCharCode(65 + k) }),
      h('span', { html: c }),
    ),
  );
  list.append(...buttons);
  wrap.append(list);
  return wrap;
}

function pick(q, done) {
  const { frame, answer, after } = q.build();
  const wrap = h('div', { class: 'q' }, h('div', { class: 'prompt', html: q.prompt }));
  const stage = h('div', { class: 'stage pick-stage' });
  wrap.append(stage);
  let selected = [];
  let locked = false;

  const render = () => {
    const roles = { ...frame.roles };
    const tags = { ...frame.tags };
    selected.forEach((id, k) => {
      roles[id] = 'selected';
      if (q.ordered && q.labels) tags[id] = [q.labels[k]];
    });
    view.show({ ...frame, roles, tags }, { animate: false });
    check.disabled = q.ordered ? selected.length !== answer.length : selected.length === 0;
    hint.textContent =
      q.ordered && q.labels && selected.length < answer.length
        ? `Click ${q.labels[selected.length]}`
        : q.ordered || selected.length
          ? ''
          : 'Click nodes to select them';
  };

  const view = new TreeView(stage, {
    height: 260,
    ...q.view,
    onPick: (id) => {
      if (locked) return;
      if (selected.includes(id)) selected = selected.filter((s) => s !== id);
      else if (!q.ordered || selected.length < answer.length) selected = [...selected, id];
      render();
    },
  });

  const hint = h('span', { class: 'pick-hint' });
  const clear = h('button', { class: 'btn ghost small', text: 'Clear', onclick: () => ((selected = []), render()) });
  const check = h('button', {
    class: 'btn small',
    text: 'Check',
    onclick: () => {
      locked = true;
      const correct = q.ordered
        ? selected.length === answer.length && selected.every((id, k) => id === answer[k])
        : selected.length === answer.length && selected.every((id) => answer.includes(id));
      const roles = { ...(after ?? frame).roles };
      const tags = { ...(after ?? frame).tags };
      for (const id of answer) roles[id] = selected.includes(id) ? 'correct' : 'missed';
      for (const id of selected) if (!answer.includes(id)) roles[id] = 'wrong';
      if (q.ordered && q.labels) answer.forEach((id, k) => (tags[id] = [q.labels[k]]));
      view.show({ ...(after ?? frame), roles, tags }, { animate: false });
      actions.remove();
      wrap.append(feedback(correct, q.explain));
      done(correct);
    },
  });
  const actions = h('div', { class: 'pick-actions' }, hint, clear, check);
  wrap.append(actions);
  render();
  return wrap;
}
