/**
 * The site's signature number: digits on drums, like a car's odometer. Each digit is a strip of 0 to 9 that
 * rolls to its place (transform only). The value stays in the element's label for screen readers, and the
 * plain text is there until this runs, so nothing is lost without JavaScript.
 */
const STRIP = '<span>0</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span><span>9</span>';

export function odo(el, text) {
  text = String(text);
  el.setAttribute('aria-label', text);
  const shape = text.replace(/\d/g, '0');
  // a digit more or fewer: rebuild it, starting from zero so it still rolls
  if (el.dataset.odoShape !== shape) {
    el.dataset.odoShape = shape;
    el.classList.add('odo');
    el.innerHTML = [...text].map((ch) => (/\d/.test(ch)
      ? `<span class="odo-c" aria-hidden="true"><span class="odo-s" style="--v:0">${STRIP}</span></span>`
      : `<span class="odo-x" aria-hidden="true">${ch === ' ' ? '&nbsp;' : ch}</span>`)).join('');
    void el.offsetWidth;
  }
  const strips = el.querySelectorAll('.odo-s');
  [...text.replace(/\D/g, '')].forEach((d, k) => strips[k].style.setProperty('--v', d));
}
