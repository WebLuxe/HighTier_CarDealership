// Draws the body-type side views. Everything is in the same scale (1 m = 40 units), so a van really is bigger than a
// hatchback. Each outline is a polygon whose corners are rounded by their own radius: [x, y, radius]. Cars face right.
import { writeFileSync } from 'node:fs';

const f = (n) => +n.toFixed(1);
function rounded(pts, closed = true) {
  const n = pts.length; let d = '';
  const at = (i) => pts[(i + n) % n];
  for (let i = 0; i < n; i++) {
    const [x, y, r = 0] = at(i), [ax, ay] = at(i - 1), [bx, by] = at(i + 1);
    const la = Math.hypot(ax - x, ay - y), lb = Math.hypot(bx - x, by - y);
    const q = Math.min(r, la / 2, lb / 2);
    const p1 = [x + (ax - x) / la * q, y + (ay - y) / la * q], p2 = [x + (bx - x) / lb * q, y + (by - y) / lb * q];
    d += `${i ? 'L' : 'M'}${f(p1[0])} ${f(p1[1])}`;
    if (q > 0) d += `Q${f(x)} ${f(y)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + (closed ? 'Z' : '');
}
// the body: upper outline from the rear sill, over the roof, to the front sill; the underside runs back through the arches
function body(top, wheels, r, sill) {
  const R = r + 3.2;
  let d = rounded(top, false);
  const [rear, front] = wheels;
  const hit = (cx) => Math.sqrt(Math.max(0, R * R - (sill - 76 + (92 - r - (sill)) + 0) ** 0)) && R;
  const cy = 92 - r;
  const dx = (R * R - (cy - sill) ** 2) ** 0.5;
  d += `L${f(front + dx)} ${sill}A${R} ${R} 0 0 0 ${f(front - dx)} ${sill}L${f(rear + dx)} ${sill}A${R} ${R} 0 0 0 ${f(rear - dx)} ${sill}Z`;
  return d;
}
const wheel = (cx, r) => {
  const c = 92 - r, rim = r * 0.68; let sp = '';
  for (let i = 0; i < 5; i++) {
    const a = (i * 72 - 90) * Math.PI / 180, b = a + 0.2, e = a - 0.2, w = rim * 0.94;
    sp += `M${f(cx + Math.cos(b) * 2.1)} ${f(c + Math.sin(b) * 2.1)}L${f(cx + Math.cos(a + 0.09) * w)} ${f(c + Math.sin(a + 0.09) * w)}L${f(cx + Math.cos(a - 0.09) * w)} ${f(c + Math.sin(a - 0.09) * w)}L${f(cx + Math.cos(e) * 2.1)} ${f(c + Math.sin(e) * 2.1)}Z`;
  }
  return { cx, c, r, rim, sp };
};

const CARS = {
  Hatchback: { wheels: [46, 144], r: 14.5, sill: 80,
    top: [[17, 80, 2], [14, 70, 3], [16, 53, 5], [28, 37, 7], [38, 33, 18], [84, 32, 34], [104, 35, 7], [134, 53, 12], [166, 59, 18], [175, 67, 6], [173, 80, 2]],
    glass: [[[34, 52, 2], [39, 38, 4], [62, 36, 2], [62, 52, 2]], [[66, 36, 2], [90, 36, 4], [101, 38, 3], [120, 52, 3], [66, 52, 2]]],
    lines: 'M64 37V76M101 54L104 76', handle: [[70, 58], [92, 58]], head: [[158, 61, 2], [171, 63, 2], [172, 66, 1], [162, 66, 2]], tail: [[16, 55, 1], [24, 54, 1], [22, 61, 1], [15, 61, 1]] },
  Sedan: { wheels: [50, 160], r: 14.5, sill: 81,
    top: [[17, 81, 2], [14, 69, 3], [15, 57, 3], [21, 52, 5], [50, 50, 10], [78, 36, 12], [100, 33, 30], [122, 34, 7], [154, 52, 12], [192, 58, 20], [201, 67, 6], [199, 81, 2]],
    glass: [[[56, 50, 2], [80, 38, 4], [98, 36, 2], [98, 52, 2]], [[102, 36, 2], [122, 37, 3], [142, 52, 3], [102, 52, 2]]],
    lines: 'M100 37V77M144 54L146 77', handle: [[78, 58], [118, 58]], head: [[182, 60, 2], [197, 63, 2], [198, 66, 1], [186, 66, 2]], tail: [[15, 56, 1], [27, 54, 1], [26, 60, 1], [15, 61, 1]] },
  SUV: { wheels: [52, 170], r: 17, sill: 76,
    top: [[19, 76, 2], [14, 62, 4], [15, 46, 5], [24, 29, 8], [40, 24, 26], [108, 22, 26], [124, 24, 7], [150, 43, 12], [190, 47, 14], [205, 54, 8], [208, 67, 5], [205, 76, 2]],
    glass: [[[26, 45, 2], [33, 31, 4], [56, 28, 2], [56, 44, 2]], [[60, 28, 2], [92, 26, 2], [92, 43, 2], [60, 44, 2]], [[96, 26, 2], [115, 25, 4], [124, 28, 3], [139, 42, 3], [96, 43, 2]]],
    lines: 'M58 28V72M94 27V72M141 44L146 72', handle: [[66, 51], [102, 50]], head: [[186, 49, 2], [202, 54, 2], [203, 57, 1], [192, 56, 2]], tail: [[14, 47, 1], [24, 47, 1], [21, 55, 1], [14, 55, 1]], rail: 'M44 21.5C70 19 92 19 110 19.5' },
  MPV: { wheels: [50, 158], r: 15, sill: 80,
    top: [[17, 80, 2], [13, 66, 4], [15, 43, 6], [23, 28, 8], [36, 25, 26], [100, 25, 26], [116, 28, 8], [150, 49, 12], [182, 55, 16], [196, 64, 7], [196, 72, 4], [194, 80, 2]],
    glass: [[[23, 46, 2], [30, 30, 4], [52, 29, 2], [52, 46, 2]], [[56, 29, 2], [80, 29, 2], [80, 46, 2], [56, 46, 2]], [[84, 29, 2], [102, 29, 4], [114, 32, 3], [131, 47, 3], [84, 47, 2]]],
    lines: 'M54 29V75M82 29V75M133 49L136 75', handle: [[60, 54], [90, 54]], head: [[176, 57, 2], [192, 62, 2], [193, 65, 1], [182, 65, 2]], tail: [[14, 47, 1], [23, 47, 1], [20, 56, 1], [14, 56, 1]] },
  Pickup: { wheels: [54, 184], r: 17, sill: 76,
    top: [[17, 76, 2], [13, 62, 3], [14, 45, 2], [84, 45, 2], [86, 26, 5], [92, 21, 8], [132, 21, 24], [146, 24, 7], [170, 43, 12], [212, 47, 14], [226, 56, 8], [227, 67, 5], [224, 76, 2]],
    glass: [[[92, 25, 3], [112, 25, 2], [112, 45, 2], [90, 45, 3]], [[116, 25, 2], [136, 25, 4], [145, 28, 3], [159, 45, 3], [116, 45, 2]]],
    lines: 'M114 25V72M161 47L164 72M84 45V70', handle: [[94, 51], [122, 51]], head: [[210, 49, 2], [223, 54, 2], [224, 58, 1], [214, 58, 2]], tail: [[13, 48, 1], [21, 48, 1], [20, 57, 1], [14, 57, 1]] },
  Van: { wheels: [50, 182], r: 15, sill: 78,
    top: [[17, 78, 2], [14, 60, 4], [15, 24, 6], [22, 14, 8], [36, 12, 26], [150, 13, 26], [166, 16, 10], [194, 42, 12], [212, 50, 12], [222, 62, 6], [222, 72, 4], [220, 78, 2]],
    glass: [[[126, 18, 3], [156, 18, 4], [166, 21, 3], [186, 44, 3], [126, 44, 3]]],
    lines: 'M122 17V73M186 46L190 73M60 17V73M60 44H122', handle: [[108, 50], [132, 50]], head: [[204, 52, 2], [218, 59, 2], [219, 62, 1], [208, 62, 2]], tail: [[14, 44, 1], [20, 44, 1], [19, 58, 1], [14, 58, 1]] },
  Coupe: { wheels: [50, 156], r: 14.5, sill: 81,
    top: [[17, 81, 2], [14, 69, 3], [15, 57, 3], [22, 52, 5], [40, 50, 10], [74, 38, 14], [100, 36, 30], [120, 39, 7], [152, 54, 12], [190, 60, 20], [199, 68, 6], [197, 81, 2]],
    glass: [[[52, 50, 2], [76, 40, 4], [92, 39, 2], [92, 52, 2]], [[96, 39, 2], [118, 42, 3], [136, 52, 3], [96, 52, 2]]],
    lines: 'M94 39V77M138 54L141 77', handle: [[104, 58], [124, 58]], head: [[180, 62, 2], [195, 65, 2], [196, 68, 1], [184, 68, 2]], tail: [[15, 56, 1], [27, 54, 1], [26, 60, 1], [15, 61, 1]] },
  Convertible: { wheels: [50, 156], r: 14.5, sill: 81,
    top: [[17, 81, 2], [14, 69, 3], [15, 57, 3], [22, 53, 5], [66, 51, 6], [98, 51, 3], [120, 39, 3], [124, 39, 3], [152, 54, 12], [190, 60, 20], [199, 68, 6], [197, 81, 2]],
    glass: [[[105, 51, 2], [121, 42, 2], [136, 52, 2]]],
    lines: 'M100 53V77M138 54L141 77', handle: [[108, 58], [124, 58]], head: [[180, 62, 2], [195, 65, 2], [196, 68, 1], [184, 68, 2]], tail: [[15, 56, 1], [27, 54, 1], [26, 60, 1], [15, 61, 1]] },
};

// a soft line along the waist, from the top of the tail lamp to the back of the headlamp
function shoulder(c) {
  const [x0, y0] = c.tail[1], [x1, y1] = c.head[0];
  return `M${x0 + 2} ${y0 + 1}C${f(x0 + (x1 - x0) * 0.35)} ${f(y0 - 1)} ${f(x0 + (x1 - x0) * 0.7)} ${f(y1 - 2)} ${x1 - 4} ${y1 + 1}`;
}
const data = {};
for (const [k, c] of Object.entries(CARS)) {
  data[k] = {
    b: body(c.top, c.wheels, c.r, c.sill),
    u: rounded(c.top.slice(1, -1), false),
    s: shoulder(c),
    g: c.glass.map((p) => rounded(p)).join(''),
    l: c.lines, h: rounded(c.head), t: rounded(c.tail),
    d: c.handle.map(([x, y]) => `M${x} ${y}h7`).join(''),
    w: c.wheels.map((x) => { const w = wheel(x, c.r); return [w.cx, w.c, w.r, f(w.rim), w.sp]; }),
    ...(c.rail ? { r: c.rail } : {}),
  };
}
writeFileSync(process.argv[2], `const SHAPES = ${JSON.stringify(data)};\n`);
console.log('bytes', JSON.stringify(data).length);
