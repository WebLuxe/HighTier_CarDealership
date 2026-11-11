import gsap from 'gsap';
import { initLayout, reduced, $, $$ } from '../lib/layout.js';
import { rise } from '../lib/fx.js';
import { wireCardActions } from '../lib/card.js';
import { store, COMPARE_MAX } from '../lib/store.js';
import { CARS, byId, rs, km, monthly, thumb, carName } from '../data.js';

initLayout();
wireCardActions();

// URL ids win over stored ones (shareable links)
const urlIds = (new URLSearchParams(location.search).get('ids') || '').split(',').filter((id) => byId(id));
if (urlIds.length) store.setCompare(urlIds);

const ROWS = [
  { k: 'Price', v: (c) => rs(c.price), n: (c) => c.price, best: 'min', bar: true },
  { k: 'Monthly, 20% down over 5 years', v: (c) => rs(monthly(c.price)), n: (c) => c.price, best: 'min' },
  { k: 'Year', v: (c) => c.year, n: (c) => c.year, best: 'max' },
  { k: 'Mileage', v: (c) => km(c.km), n: (c) => c.km ?? undefined, best: 'min' },
  { k: 'Engine', v: (c) => (c.engineCc ? `${c.engine} (${c.engineCc.toLocaleString('en-US')} cc)` : 'Ask us') },
  { k: 'Fuel', v: (c) => c.fuel },
  { k: 'Gearbox', v: (c) => c.gearbox },
  { k: 'Body', v: (c) => c.body },
  { k: 'Colour', v: (c) => c.colour || 'Ask us' },
  { k: 'Seats', v: (c) => c.seats || 'Ask us', n: (c) => c.seats ?? undefined, best: 'max' },
  { k: 'Doors', v: (c) => c.doors || 'Ask us' },
  { k: 'Photos', v: (c) => `${c.images.length}` },
];

const root = $('[data-compare-root]');
const diff = $('[data-diff]');

function render(animate) {
  const stored = store.compare();
  const cars = stored.map(byId).filter(Boolean);
  if (cars.length < stored.length) store.setCompare(cars.map((c) => c.id)); // a sold car does not hold a place
  history.replaceState(null, '', cars.length ? `?ids=${cars.map((c) => c.id).join(',')}` : location.pathname);
  if (!cars.length) {
    root.innerHTML = `<div class="empty"><p class="empty-title">Nothing to compare yet.</p>
      <p>Tap Compare on any car in the catalogue to add it here. You can compare up to three.</p>
      <a href="inventory.html" class="btn btn-primary">Open the catalogue</a></div>`;
    return;
  }
  const slots = [...cars, ...Array(COMPARE_MAX - cars.length).fill(null)];
  const options = CARS.filter((c) => !cars.includes(c)).map((c) => `<option value="${c.id}">${carName(c)}, ${rs(c.price)}</option>`).join('');
  const maxPrice = Math.max(...cars.map((c) => c.price));

  root.style.setProperty('--cols', COMPARE_MAX);
  root.innerHTML = `
    <div class="cmp-scroll"><div class="cmp" role="table" aria-label="Car comparison">
      <div class="cmp-row cmp-row--head" role="row">
        <div class="cmp-key" role="rowheader"></div>
        ${slots.map((c) => c ? `
          <div class="cmp-car" role="columnheader">
            <a href="cars/${c.id}.html" class="cmp-img" tabindex="-1" aria-hidden="true"><img src="${thumb(c, 0, 960)}" width="700" height="460" alt="" loading="lazy" decoding="async" /></a>
            <a href="cars/${c.id}.html" class="cmp-name">${carName(c)}</a>
            <p class="cmp-trim">${c.trim}</p>
            <button type="button" class="link cmp-remove" data-remove="${c.id}">Remove</button>
          </div>` : `
          <div class="cmp-car cmp-car--empty" role="columnheader">
            <label class="cmp-add"><span>Add a car</span>
              <select data-add><option value="">Choose from ${CARS.length - cars.length} cars</option>${options}</select></label>
          </div>`).join('')}
      </div>
      ${ROWS.map((r) => {
        const vals = cars.map((c) => r.v(c));
        const same = vals.every((v) => String(v) === String(vals[0]));
        let bestN = null;
        if (r.best && cars.filter((c) => r.n(c) != null).length > 1) {
          const ns = cars.map(r.n).filter((n) => n != null);
          bestN = r.best === 'min' ? Math.min(...ns) : Math.max(...ns);
          if (ns.every((n) => n === bestN)) bestN = null;
        }
        return `<div class="cmp-row ${same && cars.length > 1 ? 'is-same' : ''}" role="row">
          <div class="cmp-key" role="rowheader">${r.k}</div>
          ${slots.map((c) => c ? `<div class="cmp-val tabular-nums ${bestN !== null && r.n(c) === bestN ? 'is-best' : ''}" role="cell">
            ${r.v(c)}${r.bar ? `<span class="cmp-bar"><span style="--v:${c.price / maxPrice}"></span></span>` : ''}</div>` : '<div class="cmp-val" role="cell"></div>').join('')}
        </div>`;
      }).join('')}
      <div class="cmp-row cmp-row--cta" role="row">
        <div class="cmp-key" role="rowheader"></div>
        ${slots.map((c) => c ? `<div role="cell"><a href="cars/${c.id}.html" class="btn btn-primary btn-wide">See this car</a></div>` : '<div role="cell"></div>').join('')}
      </div>
    </div></div>`;
  root.classList.toggle('only-diff', diff.checked);
  if (animate) rise($$('.cmp-car'));
  requestAnimationFrame(() => $$('.cmp-bar > span').forEach((b) => b.classList.add('is-in')));
}

root.addEventListener('click', (e) => {
  const r = e.target.closest('[data-remove]');
  if (!r) return;
  if (r.dataset.going) return; // a second click must not put the car back
  r.dataset.going = '1';
  const col = r.closest('.cmp-car');
  const done = () => { store.toggleCompare(r.dataset.remove); render(false); };
  if (reduced) return done();
  gsap.to(col, { opacity: 0, y: -20, duration: 0.3, onComplete: done });
});
root.addEventListener('change', (e) => {
  const s = e.target.closest('[data-add]');
  if (s?.value) { store.toggleCompare(s.value); render(true); }
});
diff.addEventListener('change', () => root.classList.toggle('only-diff', diff.checked));

render(false); // the page's own entrance brings it in
