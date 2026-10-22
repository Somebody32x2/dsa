/** Namespace = <html data-site="..."> of the page, so every compartment keeps its own quiz progress. */
const KEY = `${document.documentElement.dataset.site ?? 'dsa'}.progress.v1`;

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? {};
  } catch {
    return {};
  }
}

/** Per-question results in localStorage: { [questionId]: true | false }. Correct is never downgraded. */
export const progress = {
  data: load(),

  record(id, correct) {
    if (this.data[id] === true) return;
    this.data[id] = correct;
    localStorage.setItem(KEY, JSON.stringify(this.data));
    dispatchEvent(new CustomEvent('progress'));
  },

  correct(ids) {
    return ids.filter((id) => this.data[id] === true).length;
  },

  reset() {
    this.data = {};
    localStorage.removeItem(KEY);
    dispatchEvent(new CustomEvent('progress'));
  },
};
