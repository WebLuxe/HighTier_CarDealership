import { initLayout } from '../lib/layout.js';

initLayout();

/* WebLuxe Cars' own "About Us" video (youtube.com/watch?v=${DEALER.aboutVideo}, from their first website). The player is only made when
   the button is pressed, and closing removes it, which stops the sound. */
const box = document.querySelector('[data-about-box]');
if (box) {
  const frame = box.querySelector('[data-about-frame]');
  document.querySelector('[data-about-open]')?.addEventListener('click', () => {
    const f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/${DEALER.aboutVideo}?autoplay=1&rel=0&playsinline=1';
    f.title = 'WebLuxe Cars, About Us';
    f.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
    f.allowFullscreen = true;
    frame.replaceChildren(f);
    box.showModal();
  });
  box.querySelector('[data-about-close]').addEventListener('click', () => box.close());
  box.addEventListener('click', (e) => { if (e.target === box) box.close(); });
  box.addEventListener('close', () => frame.replaceChildren());
}
