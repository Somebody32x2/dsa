/**
 * h('div', { class: 'x', html: '<b>hi</b>', onclick: fn, dataset: {...} }, child, 'text', [more])
 */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children) {
    if (c == null || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

/** Paragraph from trusted HTML (lesson text). */
export const p = (html, cls) => h('p', { html, class: cls });

/** Inline tag for prose, matching figure pills: tag('lo') -> <span class="tg tg-lo">lo</span>. Style via .tg-<name>. */
export const tag = (t) => `<span class="tg tg-${String(t).toLowerCase()}">${t}</span>`;

export const icon = {
  prev: '<svg viewBox="0 0 16 16"><path d="M10 3 5 8l5 5" /></svg>',
  next: '<svg viewBox="0 0 16 16"><path d="m6 3 5 5-5 5" /></svg>',
  first: '<svg viewBox="0 0 16 16"><path d="M4 3v10M12 3 7 8l5 5" /></svg>',
  play: '<svg viewBox="0 0 16 16"><path class="fill" d="M5 3.5v9l7.5-4.5z" /></svg>',
  pause: '<svg viewBox="0 0 16 16"><path class="fill" d="M4.5 3.5h2.5v9H4.5zM9 3.5h2.5v9H9z" /></svg>',
  menu: '<svg viewBox="0 0 16 16"><path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" /></svg>',
  check: '<svg viewBox="0 0 16 16"><path d="m3.5 8.5 3 3 6-7" /></svg>',
  arrow: '<svg viewBox="0 0 16 16"><path d="M3 8h10M9 4l4 4-4 4" /></svg>',
};
