import { CARS } from '../data.js';
import { dealerJsonLd, breadcrumbJsonLd } from './templates.js';

const n = CARS.length;

/** Unique title + description per page (keyed by file path relative to the site root). */
export const META = {
  'index.html': {
    path: '',
    title: 'WebLuxe Cars | Used cars in Phoenix, Mauritius. Buy, sell or exchange',
    desc: `${n} used cars for sale at 24 Royal Road, Phoenix. Buy, sell or exchange your car, with leasing through Sample Leasing Co. New stock every week.`,
    jsonld: () => [dealerJsonLd()],
  },
  'inventory.html': {
    path: 'inventory.html',
    title: `Catalogue: used cars for sale in Mauritius, ${n} in stock | WebLuxe Cars`,
    desc: `All ${n} cars at WebLuxe Cars in Phoenix, with real photos and prices in rupees. Filter by body type, price, year, fuel and gearbox.`,
    jsonld: () => [breadcrumbJsonLd([['Home', ''], ['Catalogue', 'inventory.html']])],
  },
  'compare.html': {
    path: 'compare.html',
    title: 'Compare cars side by side | WebLuxe Cars',
    desc: 'Put up to three WebLuxe Cars cars side by side: price, monthly payment, year, engine, gearbox and more.',
    jsonld: () => [breadcrumbJsonLd([['Home', ''], ['Catalogue', 'inventory.html'], ['Compare', 'compare.html']])],
  },
  'sell.html': {
    path: 'sell.html',
    title: 'Sell your car in Mauritius | WebLuxe Cars',
    desc: 'Tell us about your car in three short steps for a rough guide price, then an offer from WebLuxe Cars. Sell it outright or put it towards one of our cars.',
    jsonld: () => [breadcrumbJsonLd([['Home', ''], ['Sell', 'sell.html']])],
  },
  'finance.html': {
    path: 'finance.html',
    title: 'Car leasing calculator in rupees | WebLuxe Cars',
    desc: 'Work out a monthly payment for any car in stock and ask WebLuxe Cars about leasing through Sample Leasing Co.',
    jsonld: () => [breadcrumbJsonLd([['Home', ''], ['Leasing', 'finance.html']])],
  },
  'contact.html': {
    path: 'contact.html',
    title: 'Visit WebLuxe Cars in Phoenix | Opening hours and directions',
    desc: 'WebLuxe Cars, 24 Royal Road, Phoenix. Phone, WhatsApp, email and directions.',
    jsonld: () => [dealerJsonLd(), breadcrumbJsonLd([['Home', ''], ['Visit us', 'contact.html']])],
  },
  'privacy.html': {
    path: 'privacy.html',
    title: 'Privacy policy | WebLuxe Cars',
    desc: 'What WebLuxe Cars collects through this website, why, how long we keep it and your rights under the Mauritius Data Protection Act 2017.',
    jsonld: () => [],
  },
  'terms.html': {
    path: 'terms.html',
    title: 'Terms of sale and website terms | WebLuxe Cars',
    desc: 'The terms that apply when you use the WebLuxe Cars website or buy from us.',
    jsonld: () => [],
  },
  '404.html': {
    path: '404.html',
    title: 'Page not found | WebLuxe Cars',
    desc: 'This page does not exist. Browse the cars in stock at WebLuxe Cars instead.',
    jsonld: () => [],
  },
  'car.html': {
    path: 'inventory.html',
    title: 'Car details | WebLuxe Cars',
    desc: 'Opening the car you asked for.',
    jsonld: () => [],
  },
};
