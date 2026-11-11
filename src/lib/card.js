import { store } from './store.js';
import { toast, bump, nameForTransition, syncStoreUI, P } from './layout.js';

let wired = false;
/** One delegated listener for save / compare buttons and the photo morph, on every page. */
export function wireCardActions({ onChange } = {}) {
  if (wired) return;
  wired = true;
  document.addEventListener('click', (e) => {
    const s = e.target.closest('[data-save]');
    if (s) {
      e.preventDefault();
      const on = store.toggleSaved(s.dataset.save);
      syncStoreUI();
      bump('[data-saved-link]');
      toast(on ? 'Saved.' : 'No longer saved.', on ? { href: `${P}inventory.html?saved=1`, label: 'See saved cars' } : null);
      onChange?.('saved');
      return;
    }
    const cmp = e.target.closest('[data-compare]');
    if (cmp) {
      e.preventDefault();
      const r = store.toggleCompare(cmp.dataset.compare);
      if (r === 'full') { toast('You can compare up to 3 cars. Remove one first.', { href: `${P}compare.html`, label: 'Open compare' }); return; }
      syncStoreUI();
      bump('[data-compare-link]');
      const n = store.compare().length;
      toast(r === 'added' ? `Added to compare (${n} of 3).` : 'Removed from compare.', n > 1 ? { href: `${P}compare.html`, label: `Compare ${n}` } : null);
      onChange?.('compare');
      return;
    }
    const link = e.target.closest('.car a[href]');
    if (link) {
      const card = link.closest('.car');
      nameForTransition(card.querySelector('[data-car-img]'), card.dataset.id);
    }
  });
}
