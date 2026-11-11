import gsap from 'gsap';
import { initLayout, reduced, $, $$, scrollToEl, looksLikeSpam, validateFields, phoneOk, sendMessage } from '../lib/layout.js';
import { CARS, rs } from '../data.js';
import { esc } from '../lib/templates.js';

initLayout();

const f = $('[data-wizard]');
const steps = $$('[data-wstep]');
const NEXT = ['Next: condition', 'Next: contact details', 'Send on WhatsApp'];
let step = 0;
let files = [];

// Rough "new price" per make, used only for the guide figure (Rs)
const MAKE_BASE = {
  Toyota: 1.4e6, Nissan: 1.2e6, Honda: 1.3e6, Suzuki: 0.9e6, Hyundai: 1.2e6, Kia: 1.3e6, Mazda: 1.3e6, Mitsubishi: 1.3e6,
  Volkswagen: 1.4e6, Skoda: 1.5e6, Ford: 1.4e6, Peugeot: 1.2e6, Renault: 1.0e6, Jeep: 1.9e6, Isuzu: 1.5e6,
  BMW: 2.4e6, 'Mercedes-Benz': 2.6e6, Audi: 2.3e6, 'Land Rover': 3.2e6, Other: 1.1e6,
};
const makeSel = $('[data-make]');
makeSel.insertAdjacentHTML('beforeend', Object.keys(MAKE_BASE).map((m) => `<option>${m}</option>`).join(''));
makeSel.addEventListener('change', () => {
  const models = [...new Set(CARS.filter((c) => c.make === makeSel.value).map((c) => c.model))];
  $('[data-models]').innerHTML = models.map((m) => `<option value="${esc(m)}">`).join('');
});

/* ---------------------------------------------------------------- live rough guide */
const est = { v: 0, lo: 0, hi: 0 };
// a decimal point is read as one, and text with no digits counts as nothing
const kmValue = () => { const n = Math.round(parseFloat(String(f.km.value).replace(/[,\s]/g, ''))); return Number.isFinite(n) && n > 0 ? n : 0; };
function estimate() {
  const make = makeSel.value, year = +f.year.value, kms = kmValue();
  const now = new Date().getFullYear();
  if (!make || !year || year < 1970 || year > now + 1 || !kmValue()) return null;
  const why = [];
  const age = Math.max(0, now - year);
  let v = MAKE_BASE[make] * Math.pow(0.86, age);
  const kmFactor = gsap.utils.clamp(0.8, 1.08, 1 - ((kms - age * 15000) / 100000) * 0.12);
  v *= kmFactor;
  why.push(kmFactor >= 1 ? 'Mileage is below average for its age' : 'Mileage is above average for its age');
  const condition = new FormData(f).get('condition');
  const cond = { excellent: 1.08, good: 1, fair: 0.88, rough: 0.7 }[condition] ?? 1;
  v *= cond;
  if (step >= 1) why.push({ excellent: 'Excellent condition adds value', good: 'Good condition for its age', fair: 'Jobs due lower the price', rough: 'Repairs needed lower the price' }[condition]);
  if (files.length >= 3) why.push('Photos let us give a firmer offer');
  return { v: Math.max(50000, Math.round(v / 5000) * 5000), spread: files.length >= 3 ? 0.06 : 0.1, why };
}
function renderEstimate() {
  const e = estimate();
  if (!e) { gsap.killTweensOf(est); $('[data-estimate]').textContent = 'To follow'; $('[data-estimate-range]').textContent = ''; return; }
  gsap.to(est, {
    v: e.v, lo: e.v * (1 - e.spread), hi: e.v * (1 + e.spread), duration: reduced ? 0 : 0.8, ease: 'expo.out',
    onUpdate: () => {
      $('[data-estimate]').textContent = rs(est.v);
      $('[data-estimate-range]').textContent = `Likely between ${rs(Math.round(est.lo / 5000) * 5000)} and ${rs(Math.round(est.hi / 5000) * 5000)}`;
    },
  });
  const pct = gsap.utils.clamp(0.04, 0.96, Math.log10(e.v / 2e5) / Math.log10(2.5e7 / 2e5));
  $('[data-estimate-needle]').style.setProperty('--p', pct);
  $('[data-estimate-why]').innerHTML = e.why.map((w) => `<li>${w}</li>`).join('');
}
f.addEventListener('input', renderEstimate);
f.addEventListener('change', renderEstimate);

/* ---------------------------------------------------------------- steps */
function validate(i) {
  const now = new Date().getFullYear();
  if (i === 0) {
    const y = Number(f.year.value.trim());
    return validateFields([
      [f.make, f.make.value ? '' : 'Choose the make.'],
      [f.model, f.model.value.trim() ? '' : 'Add the model, for example Aqua.'],
      [f.year, !f.year.value ? 'Add the year.' : !Number.isInteger(y) || y < 1970 || y > now + 1 ? `Enter a year between 1970 and ${now + 1}.` : ''],
      [f.km, !f.km.value ? 'Add the mileage.' : !kmValue() ? 'Numbers only, for example 64000.' : ''],
    ]);
  }
  if (i === 2) {
    return validateFields([
      [f.name, f.name.value.trim() ? '' : 'Add your name.'],
      [f.phone, phoneOk(f.phone.value) ? '' : 'Add a mobile number, for example 5 123 4567.'],
    ]);
  }
  return null;
}
let moving = false;
function go(to) {
  if (moving) return; // a quick double-click must not skip a step
  moving = true;
  const from = step, dir = to > from ? 1 : -1;
  step = to;
  const show = () => {
    moving = false;
    steps.forEach((s, k) => (s.hidden = k !== step));
    if (!reduced) gsap.fromTo(steps[step], { opacity: 0, x: 32 * dir }, { opacity: 1, x: 0, duration: 0.5, ease: 'expo.out', clearProps: 'transform,opacity' });
    $('input:not([type=radio]):not([type=file]), select', steps[step])?.focus({ preventScroll: true });
  };
  if (reduced) show(); else gsap.to(steps[from], { opacity: 0, x: -32 * dir, duration: 0.2, onComplete: show });
  $$('[data-step-label]').forEach((li, k) => { li[k === step ? 'setAttribute' : 'removeAttribute']('aria-current', 'step'); li.classList.toggle('is-done', k < step); });
  $('[data-wizard-bar]').style.transform = `scaleX(${(step + 1) / steps.length})`;
  $('[data-back]').hidden = step === 0;
  $('[data-next]').textContent = NEXT[step];
  $('[data-error]').hidden = true;
  renderEstimate();
}
$('[data-wizard-bar]').style.transform = `scaleX(${1 / steps.length})`;
$('[data-back]').addEventListener('click', () => go(step - 1));
$$('[data-step-label]').forEach((li, k) => li.addEventListener('click', () => { if (k < step) go(k); }));

f.addEventListener('submit', (e) => {
  e.preventDefault();
  if (validate(step)) return;
  if (step < steps.length - 1) return go(step + 1);
  if (looksLikeSpam(f)) { const err = $('[data-error]'); err.hidden = false; err.textContent = 'That was very quick. Please try again in a moment.'; return; }
  finish();
});

function finish() {
  const fd = new FormData(f);
  const e = estimate();
  steps.forEach((s) => (s.hidden = true));
  $$('.wizard-nav, .wizard-steps, .wizard-bar, [data-error]').forEach((x) => (x.hidden = true));
  const done = $('[data-done]');
  done.hidden = false;
  const what = `${fd.get('year')} ${fd.get('make') === 'Other' ? '' : fd.get('make') + ' '}${fd.get('model')}`;
  const cond = fd.get('condition') === 'rough' ? 'needs work' : fd.get('condition');
  const text = `Hi WebLuxe Cars, I'd like to ${fd.get('contact') === 'exchange' ? 'exchange' : 'sell'} my ${what}.\nMileage: ${kmValue().toLocaleString('en-US')} km\nCondition: ${cond}\n${e ? `Website guide price: ${rs(e.v)}\n` : ''}Name: ${fd.get('name')}\nMobile: ${fd.get('phone')}${files.length ? `\nI'll send ${files.length} photo${files.length > 1 ? 's' : ''} in this chat.` : ''}`;
  const href = sendMessage(text);
  done.innerHTML = `
    <svg class="done-tick" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24"/><path d="m15 27 7 7 15-15"/></svg>
    <h2>Almost done: press send in WhatsApp.</h2>
    <p>The details of your ${esc(what)} are written for you there.${files.length ? ' Attach your photos in the same chat.' : ''} We reply with an offer in that chat.</p>
    <dl class="done-sum">
      <div><dt>Rough guide</dt><dd class="tabular-nums">${e ? rs(e.v) : 'To follow'}</dd></div>
      <div><dt>Mileage</dt><dd class="tabular-nums">${kmValue().toLocaleString('en-US')} km</dd></div>
      <div><dt>Condition</dt><dd>${esc(String(cond).replace(/^./, (x) => x.toUpperCase()))}</dd></div>
      <div><dt>You want to</dt><dd>${fd.get('contact') === 'exchange' ? 'Exchange' : 'Sell'}</dd></div>
    </dl>
    <div class="done-actions"><a href="${href}" class="btn btn-primary" target="_blank" rel="noopener">Open WhatsApp again</a><a href="inventory.html" class="btn btn-line">Browse our cars</a></div>`;
  if (!reduced) {
    gsap.from(done.children, { y: 16, opacity: 0, stagger: 0.06, duration: 0.7, ease: 'expo.out' });
    gsap.fromTo('.done-tick circle', { strokeDashoffset: 151 }, { strokeDashoffset: 0, duration: 0.8, ease: 'power2.out' });
    gsap.fromTo('.done-tick path', { strokeDashoffset: 40 }, { strokeDashoffset: 0, duration: 0.5, delay: 0.5, ease: 'power2.out' });
  }
  scrollToEl(done, -120);
}

/* ---------------------------------------------------------------- photos (optional) */
const drop = $('[data-drop]'), input = $('[data-files]'), previews = $('[data-previews]');
function showFiles() {
  previews.innerHTML = files.map((file, k) => `<li><img src="${URL.createObjectURL(file)}" width="88" height="88" alt="Your photo ${k + 1}" />
    <button type="button" data-rm="${k}" aria-label="Remove photo ${k + 1}"><span aria-hidden="true">×</span></button></li>`).join('');
  renderEstimate();
}
function addFiles(list) {
  const same = (a, b) => a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;
  const fresh = [...list].filter((x) => x.type.startsWith('image/') && !files.some((o) => same(o, x)));
  files = [...files, ...fresh].slice(0, 8);
  showFiles();
}
input.addEventListener('change', () => { addFiles(input.files); input.value = ''; }); // cleared so the same photo can be picked again
['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('is-over'); }));
['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, () => drop.classList.remove('is-over')));
drop.addEventListener('drop', (e) => { e.preventDefault(); addFiles(e.dataTransfer.files); });
previews.addEventListener('click', (e) => {
  const b = e.target.closest('[data-rm]');
  if (!b) return;
  files.splice(+b.dataset.rm, 1);
  showFiles();
});
