import { h } from './dom.js';

/** A bordered figure card: header (title + tools), body, optional note under it. */
export function figure({ title, tools = [], note, wide = false }, ...body) {
  return h(
    'figure',
    { class: `fig reveal${wide ? ' wide' : ''}` },
    (title || tools.length) && h('header', { class: 'fig-head' }, h('span', { class: 'fig-title', html: title ?? '' }), h('div', { class: 'tools' }, tools)),
    h('div', { class: 'fig-body' }, body),
    note && h('figcaption', { html: note }),
  );
}

/** Segmented control. options: [{ value, label }] */
export function segmented(options, value, onChange, { label } = {}) {
  const root = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': label });
  const buttons = options.map((o) =>
    h('button', {
      class: o.value === value ? 'on' : '',
      role: 'radio',
      'aria-checked': String(o.value === value),
      html: o.label,
      onclick: () => {
        buttons.forEach((b) => {
          b.classList.toggle('on', b === btn(o));
          b.setAttribute('aria-checked', String(b === btn(o)));
        });
        onChange(o.value);
      },
    }),
  );
  const btn = (o) => buttons[options.indexOf(o)];
  root.append(...buttons);
  return root;
}

/** Small on/off chip. */
export function toggle(label, value, onChange) {
  const b = h('button', {
    class: `chip${value ? ' on' : ''}`,
    'aria-pressed': String(value),
    text: label,
    onclick: () => {
      value = !value;
      b.classList.toggle('on', value);
      b.setAttribute('aria-pressed', String(value));
      onChange(value);
    },
  });
  return b;
}

/** Callout box: kind = 'key' | 'warn' | 'note' */
export function callout(kind, title, html) {
  return h('aside', { class: `callout ${kind} reveal` }, h('div', { class: 'callout-title', text: title }), h('div', { html }));
}
