// node scripts/apply-client.mjs [client folder]      (default ../client)
// Puts a dealer into the Signature (3D) site: name, address, phones and hours from client.json, cars and photos from
// stock.json. It remembers what it wrote last time (.brand.json), so it can be run again for the next client.
import sharp from 'sharp';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const dir = resolve(process.argv[2] || (existsSync('client') ? 'client' : '../client'));
const C = JSON.parse(readFileSync(join(dir, 'client.json'), 'utf8'));
const S = JSON.parse(readFileSync(join(dir, 'stock.json'), 'utf8'));
const dial = String(C.dialCode || '230').replace(/\D/g, '');
const tel = (p) => 'tel:+' + dial + String(p).replace(/\D/g, '');
const address = `${C.street}, ${C.locality}, ${C.country}`;
const mapsQuery = C.mapsQuery || `${C.name} ${address}`;
const now = {
  legalName: C.legalName || C.name, name: C.name, street: C.street, locality: C.locality, email: C.email || '',
  phone0: C.phones[0], phone1: C.phones[1] || C.phones[0], wa: String(C.whatsapp).replace(/\D/g, ''),
  mapsEnc: encodeURIComponent(mapsQuery), leasing: C.finance?.partner && !/^our |^the /i.test(C.finance.partner) ? C.finance.partner : 'Sample Leasing Co',
};
const was = JSON.parse(readFileSync('.brand.json', 'utf8'));

// ---- words: swap the last dealer's details for this one's, longest first so nothing is half replaced
const pairs = ['legalName', 'name', 'mapsEnc', 'street', 'locality', 'email', 'phone0', 'phone1', 'wa', 'leasing'].map((k) => [was[k], now[k]]).filter(([a, b]) => a && b && a !== b && a.length >= 6); // never swap something as short as a single digit
const files = [];
const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(js|mjs|html|css|webmanifest)$/.test(f) && !/inventory\.json|apply-client|sync-inventory/.test(p)) files.push(p); } };
walk('src'); files.push(...readdirSync('.').filter((f) => f.endsWith('.html')), 'scripts/prerender.mjs', 'public/site.webmanifest');
let touched = 0;
for (const f of files) {
  const before = readFileSync(f, 'utf8');
  let s = before;
  for (const [a, b] of pairs) s = s.split(a).join(b);
  if (s !== before) { writeFileSync(f, s); touched++; }
}

// ---- the dealer's details
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
writeFileSync('src/dealer.js', `// Written by scripts/apply-client.mjs from the client folder. Change client.json, not this file.
export const DEALER = ${JSON.stringify({
    name: C.name, legalName: now.legalName, phone: C.phones[0], phoneHref: tel(C.phones[0]), phones: C.phones.map((p) => [p, tel(p)]),
    whatsapp: now.wa, tiktok: C.social?.tiktok || '', tiktokName: C.social?.tiktok ? '@' + C.social.tiktok.split('@').pop() : '', aboutVideo: C.aboutVideo || '',
    email: now.email, street: C.street, locality: C.locality, address, mapsQuery, timeZone: C.timeZone || 'Indian/Mauritius',
    position: { lat: Math.round((C.geo?.lat ?? -20.2) * 100) / 100, lon: Math.round((C.geo?.lon ?? 57.5) * 100) / 100 },
    hours: DAYS.map((d) => C.hours[d] || null), financeRate: C.finance?.rate ?? 7.5, leasing: now.leasing, demo: !!C.demo?.enabled,
    demoStudio: C.demo?.studio || '', demoTiers: C.demo?.enabled ? C.demo.tiers : null,
  }, null, 2)};
`);

// ---- the logo: the client's own file, or their initial on the site's red
const letter = C.name.trim()[0].toUpperCase();
const markSvg = (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 364 343"><rect x="20" y="10" width="324" height="324" rx="64" fill="#e0262f"/><rect x="38" y="28" width="288" height="288" rx="48" fill="none" stroke="#fff" stroke-width="8" opacity=".9"/><text x="182" y="252" text-anchor="middle" font-family="Arial Black, Arial, Helvetica, sans-serif" font-weight="900" font-size="230" fill="#fff">${letter}</text></svg>`;
mkdirSync('public/images/brand', { recursive: true });
if (C.logoFile && existsSync(join(dir, C.logoFile))) {
  await sharp(join(dir, C.logoFile)).resize(364, 343, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile('public/images/brand/mark.png');
  await sharp(join(dir, C.logoFile)).resize(182, 172, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile('public/images/brand/mark-sm.png');
} else {
  await sharp(Buffer.from(markSvg(364, 343))).png().toFile('public/images/brand/mark.png');
  await sharp(Buffer.from(markSvg(182, 172))).png().toFile('public/images/brand/mark-sm.png');
}
for (const [f, n] of [['public/apple-touch-icon.png', 180], ['public/icon-512.png', 512], ['public/favicon-32.png', 32]]) await sharp(Buffer.from(markSvg(364, 343))).resize(n, n, { fit: 'contain', background: '#101214' }).png().toFile(f);
writeFileSync('public/favicon.svg', markSvg(64, 60));

// ---- the cars and their photos, in the sizes the pages ask for
const slug = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const THUMBS = 'public/images/cars';
rmSync(THUMBS, { recursive: true, force: true });
const cars = [];
for (const c of S.cars.filter((x) => !['sold', 'hidden'].includes(x.status))) {
  const id = c.id || slug(`${c.year}-${c.make}-${c.model}`);
  mkdirSync(`${THUMBS}/${id}`, { recursive: true });
  const photos = [];
  for (let i = 0; i < (c.photos || []).length; i++) {
    const src = join(dir, 'photos', c.photos[i]);
    if (!existsSync(src)) continue;
    const n = photos.length;
    for (const w of n === 0 ? [480, 960, 1280] : [480, 1280]) {
      const out = sharp(src).rotate();
      if (w === 1280) await out.resize({ width: w, withoutEnlargement: true }).webp({ quality: 74 }).toFile(`${THUMBS}/${id}/${n}-${w}.webp`);
      else await out.resize({ width: w, height: Math.round(w * 0.66), fit: 'cover', position: 'attention' }).webp({ quality: w > 500 ? 70 : 66 }).toFile(`${THUMBS}/${id}/${n}-${w}.webp`);
    }
    photos.push(`images/cars/${id}/${n}-1280.webp`);
  }
  if (!photos.length) continue;
  cars.push({
    id, make: c.make, model: c.model, year: c.year, price: c.price, km: c.mileage ?? null, fuel: c.fuel || 'Petrol', gearbox: c.gearbox || 'Manual', body: c.body || 'Hatchback',
    engineCc: null, engine: c.engine || '', colour: c.colour || '', seats: c.seats ?? null, doors: c.doors ?? null,
    description: c.description?.en || '', options: (c.highlights?.en || []).join(', ') || null, deal: !!c.deal, added: new Date(c.added || S.updated).toISOString(),
    photos, thumbs: photos.map((_, i) => `images/cars/${id}/${i}-480.webp`),
  });
}
cars.sort((a, b) => b.added.localeCompare(a.added));
writeFileSync('src/inventory.json', JSON.stringify({ syncedAt: new Date(S.updated || Date.now()).toISOString(), source: 'client/stock.json', cars }, null, 1));
rmSync('public/images/share', { recursive: true, force: true });
rmSync('cars', { recursive: true, force: true });

writeFileSync('.brand.json', JSON.stringify(now, null, 2));
console.log(`${C.name}: ${cars.length} cars, ${touched} files reworded.`);
