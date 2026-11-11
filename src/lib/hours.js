import { DEALER } from '../dealer.js';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const toMin = (t) => { const [h, m] = t.split(':'); return +h * 60 + +m; };
export const fmtTime = (t) => { const [h, m] = t.split(':'); const H = +h; return `${H % 12 || 12}${m !== '00' ? ':' + m : ''}${H < 12 ? 'am' : 'pm'}`; };

function nowInMauritius() {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: DEALER.timeZone, weekday: 'long', hour: '2-digit', minute: '2-digit', hour12: false })
    .formatToParts(new Date()).reduce((o, x) => ((o[x.type] = x.value), o), {});
  return { day: DAYS.indexOf(p.weekday), mins: (+p.hour % 24) * 60 + +p.minute };
}

export function openStatus() {
  const { day, mins } = nowInMauritius();
  const h = DEALER.hours[day];
  if (h && mins >= toMin(h[0]) && mins < toMin(h[1])) return { open: true, text: `Open now, until ${fmtTime(h[1])}`, today: day };
  let d = day;
  for (let i = 0; i < 8; i++) {
    const hh = DEALER.hours[d];
    if (hh && (i > 0 || mins < toMin(hh[0]))) {
      const when = i === 0 ? 'today' : i === 1 ? 'tomorrow' : DAYS[d];
      return { open: false, text: `Closed now. Opens ${when} at ${fmtTime(hh[0])}`, today: day };
    }
    d = (d + 1) % 7;
  }
  return { open: false, text: 'Closed', today: day };
}

export function renderStatus(el) {
  if (!el) return;
  const s = openStatus();
  el.textContent = s.text;
  el.classList.toggle('is-open', s.open);
}

/**
 * Saturday deals: while the showroom is open on a Saturday, the time left until closing; otherwise the
 * time until the next Saturday opening. Mauritius keeps UTC+4 all year, so the maths uses that offset.
 */
export function saturdayDeals(now = Date.now()) {
  const h = DEALER.hours[6];
  const OFFSET = 4 * 3600e3;
  const mu = new Date(now + OFFSET); // read with getUTC*: Mauritius wall-clock time
  const dayStart = Date.UTC(mu.getUTCFullYear(), mu.getUTCMonth(), mu.getUTCDate()) - OFFSET;
  const at = (dayOffset, t) => dayStart + dayOffset * 864e5 + toMin(t) * 6e4;
  const daysToSat = (6 - mu.getUTCDay() + 7) % 7;
  if (daysToSat === 0 && now >= at(0, h[0]) && now < at(0, h[1])) return { on: true, ms: at(0, h[1]) - now };
  const open = daysToSat === 0 && now < at(0, h[0]) ? at(0, h[0]) : at(daysToSat || 7, h[0]);
  return { on: false, ms: open - now };
}
