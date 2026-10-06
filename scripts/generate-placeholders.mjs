/**
 * Generates abstract, art-directed placeholder imagery for the demo case studies.
 * Output goes to src/assets/projects/<slug>/*.jpg (processed later by astro:assets)
 * and a few public/ assets (OG image, favicon, apple touch icon).
 *
 * Replace the generated files with real photography keeping the same file names
 * (or update the paths in src/content/projects/*.md).
 *
 *   pnpm placeholders
 */
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = (...p) => join(root, ...p);

/* ---------- helpers ---------- */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const grain = (w, h, o = 0.16, seed = 4) => `
  <filter id="grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="${seed}" stitchTiles="stitch"/>
    <feColorMatrix type="saturate" values="0"/>
  </filter>
  <rect width="${w}" height="${h}" filter="url(#grain)" opacity="${o}"/>`;

const blur = (id, sd) => `<filter id="${id}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${sd}"/></filter>`;

const vignette = (w, h, a = 0.55) => `
  <radialGradient id="vig" cx="50%" cy="48%" r="75%">
    <stop offset="55%" stop-color="#000" stop-opacity="0"/>
    <stop offset="100%" stop-color="#000" stop-opacity="${a}"/>
  </radialGradient>
  <rect width="${w}" height="${h}" fill="url(#vig)"/>`;

const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;

/* ---------- art directions ---------- */

/** Cosmetic still life: bottles on a warm, moody set. */
function cosmetic(v, w, h) {
  const R = rng(10 + v);
  const palettes = [
    ['#3a2a22', '#0b0908', '#e9d8c4', '#c9a27e'],
    ['#2b2d2a', '#090a09', '#d7e0d0', '#9bb29a'],
    ['#33231f', '#0a0807', '#f1d9cf', '#d49a8a'],
    ['#26262b', '#09090a', '#dfe3ea', '#8e98ad'],
  ];
  const [bg1, bg2, glass, tint] = palettes[v % palettes.length];
  const floorY = h * 0.72;
  const bottle = (cx, base, bw, bh, cap = 0.18, id) => {
    const x = cx - bw / 2;
    const top = base - bh;
    return `
    <g>
      <ellipse cx="${cx}" cy="${base + 6}" rx="${bw * 0.75}" ry="${bw * 0.1}" fill="#000" opacity=".55" filter="url(#b20)"/>
      <rect x="${x}" y="${top + bh * cap}" width="${bw}" height="${bh * (1 - cap)}" rx="${bw * 0.14}" fill="url(#g${id})"/>
      <rect x="${x + bw * 0.1}" y="${top + bh * cap + bh * 0.08}" width="${bw * 0.08}" height="${bh * (1 - cap) * 0.78}" rx="${bw * 0.04}" fill="#fff" opacity=".35"/>
      <rect x="${x + bw * 0.2}" y="${top + bh * 0.52}" width="${bw * 0.6}" height="${bh * 0.2}" rx="3" fill="${glass}" opacity=".9"/>
      <rect x="${x + bw * 0.28}" y="${top + bh * 0.58}" width="${bw * 0.44}" height="3" fill="#09090a" opacity=".7"/>
      <rect x="${x + bw * 0.28}" y="${top + bh * 0.64}" width="${bw * 0.3}" height="3" fill="#09090a" opacity=".45"/>
      <rect x="${cx - bw * 0.3}" y="${top}" width="${bw * 0.6}" height="${bh * cap + 6}" rx="${bw * 0.08}" fill="url(#cap)"/>
      <g transform="translate(0 ${base * 2 + 12}) scale(1 -1)" opacity=".16"><rect x="${x}" y="${top + bh * cap}" width="${bw}" height="${bh * (1 - cap)}" rx="${bw * 0.14}" fill="url(#g${id})"/></g>
    </g>`;
  };
  const gradFor = (id) => `<linearGradient id="g${id}" x1="0" x2="1"><stop offset="0" stop-color="${tint}" stop-opacity=".95"/><stop offset=".45" stop-color="${glass}" stop-opacity=".9"/><stop offset="1" stop-color="${tint}" stop-opacity=".75"/></linearGradient>`;
  let items;
  if (v === 0) {
    items = bottle(w * 0.42, floorY, w * 0.13, h * 0.5, 0.2, 1) + bottle(w * 0.58, floorY + 20, w * 0.17, h * 0.26, 0.28, 2);
  } else if (v === 1) {
    items = bottle(w * 0.36, floorY, w * 0.1, h * 0.42, 0.22, 1) + bottle(w * 0.5, floorY + 10, w * 0.1, h * 0.52, 0.22, 2) + bottle(w * 0.64, floorY, w * 0.1, h * 0.34, 0.22, 3);
  } else if (v === 2) {
    items = `<circle cx="${w * 0.5}" cy="${h * 0.5}" r="${h * 0.3}" fill="url(#orb)"/><circle cx="${w * 0.5}" cy="${h * 0.5}" r="${h * 0.3}" fill="none" stroke="${glass}" stroke-opacity=".35" stroke-width="2"/>` + bottle(w * 0.5, floorY + 30, w * 0.2, h * 0.2, 0.3, 1);
  } else {
    items = bottle(w * 0.5, floorY, w * 0.15, h * 0.58, 0.18, 1) +
      Array.from({ length: 9 }, () => `<circle cx="${w * (0.2 + R() * 0.6)}" cy="${h * (0.2 + R() * 0.5)}" r="${4 + R() * 14}" fill="#c2ff1f" opacity="${0.15 + R() * 0.5}" filter="url(#b2)"/>`).join('');
  }
  return svg(w, h, `
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="80%"><stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></radialGradient>
    <linearGradient id="floor" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".1"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></linearGradient>
    <linearGradient id="cap" x1="0" x2="1"><stop offset="0" stop-color="#2a2a2c"/><stop offset=".4" stop-color="#6b6b6f"/><stop offset="1" stop-color="#1a1a1c"/></linearGradient>
    <radialGradient id="orb" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="${glass}" stop-opacity=".9"/><stop offset=".6" stop-color="${tint}" stop-opacity=".5"/><stop offset="1" stop-color="${bg2}" stop-opacity=".9"/></radialGradient>
    <radialGradient id="spot" cx="50%" cy="20%" r="60%"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    ${[1, 2, 3].map(gradFor).join('')}
    ${blur('b20', 14)}${blur('b2', 3)}
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <rect y="${floorY}" width="${w}" height="${h - floorY}" fill="url(#floor)"/>
  <rect y="${floorY}" width="${w}" height="1.5" fill="#fff" opacity=".12"/>
  <rect width="${w}" height="${h}" fill="url(#spot)"/>
  ${items}
  ${vignette(w, h, 0.6)}${grain(w, h, 0.14, 3 + v)}`);
}

/** Hospitality: arches, dusk, sea. */
function hospitality(v, w, h) {
  const pal = [
    { sky: ['#f6d3a8', '#e8835f', '#4a2f48'], sun: '#fff1d0', arch: '#2a1b26', glow: '#ffd89a' },
    { sky: ['#fbe9d4', '#f2b8a0', '#a46a7c'], sun: '#fffaf0', arch: '#3b2631', glow: '#fff0d0' },
    { sky: ['#0d1b2a', '#1b3a4b', '#3a506b'], sun: '#e0fbfc', arch: '#05090f', glow: '#98c1d9' },
    { sky: ['#ffe9c7', '#f0a868', '#8d4f3c'], sun: '#fff', arch: '#1e1315', glow: '#ffd7a0' },
  ][v % 4];
  const seaY = h * 0.62;
  const arches = [];
  const n = v % 2 === 0 ? 3 : 2;
  const aw = w * (n === 3 ? 0.17 : 0.22);
  const gap = w * 0.04;
  const total = n * aw + (n - 1) * gap;
  for (let i = 0; i < n; i++) {
    const x = w / 2 - total / 2 + i * (aw + gap);
    const top = h * (0.2 + (i === 1 && n === 3 ? -0.04 : 0.02));
    arches.push(`<path d="M${x} ${h * 0.94} V${top + aw / 2} A${aw / 2} ${aw / 2} 0 0 1 ${x + aw} ${top + aw / 2} V${h * 0.94} Z" fill="${pal.arch}"/>
    <path d="M${x + 14} ${h * 0.94 - 14} V${top + aw / 2 + 4} A${aw / 2 - 14} ${aw / 2 - 14} 0 0 1 ${x + aw - 14} ${top + aw / 2 + 4} V${h * 0.94 - 14} Z" fill="url(#sky)"/>`);
  }
  const lines = Array.from({ length: 14 }, (_, i) => {
    const y = seaY + 10 + i * i * 2.1;
    return `<rect x="${w * 0.1 + i * 3}" y="${y}" width="${w * 0.8 - i * 6}" height="${1 + i * 0.25}" fill="${pal.glow}" opacity="${0.5 - i * 0.025}"/>`;
  }).join('');
  return svg(w, h, `
  <defs>
    <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${pal.sky[0]}"/><stop offset=".55" stop-color="${pal.sky[1]}"/><stop offset="1" stop-color="${pal.sky[2]}"/></linearGradient>
    <radialGradient id="sun" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${pal.sun}"/><stop offset=".5" stop-color="${pal.sun}" stop-opacity=".75"/><stop offset="1" stop-color="${pal.sun}" stop-opacity="0"/></radialGradient>
    <linearGradient id="sea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${pal.sky[2]}" stop-opacity=".95"/><stop offset="1" stop-color="#000" stop-opacity=".8"/></linearGradient>
    ${blur('b30', 30)}
  </defs>
  <rect width="${w}" height="${h}" fill="url(#sky)"/>
  <circle cx="${w * (0.5 + (v - 1.5) * 0.06)}" cy="${seaY - h * 0.06}" r="${h * 0.34}" fill="url(#sun)" filter="url(#b30)"/>
  <circle cx="${w * (0.5 + (v - 1.5) * 0.06)}" cy="${seaY - h * 0.06}" r="${h * 0.075}" fill="${pal.sun}"/>
  <rect y="${seaY}" width="${w}" height="${h - seaY}" fill="url(#sea)"/>
  ${lines}
  ${arches.join('')}
  <rect y="${h * 0.94}" width="${w}" height="${h * 0.06}" fill="${pal.arch}"/>
  ${vignette(w, h, 0.4)}${grain(w, h, 0.16, 20 + v)}`);
}

/** Live event: beams, crowd silhouettes. */
function event(v, w, h) {
  const R = rng(300 + v);
  const beams = Array.from({ length: 5 + (v % 2) }, (_, i) => {
    const x0 = w * (0.12 + (i / 5) * 0.76) + (R() - 0.5) * 60;
    const spread = 80 + R() * 160;
    const x1 = x0 + (R() - 0.5) * w * 0.7;
    const col = i % 3 === 0 ? '#c2ff1f' : i % 3 === 1 ? '#f5f2eb' : '#8aa4ff';
    return `<polygon points="${x0 - 6},0 ${x0 + 6},0 ${x1 + spread},${h * 0.8} ${x1 - spread},${h * 0.8}" fill="${col}" opacity="${0.16 + R() * 0.18}" filter="url(#b8)"/>`;
  }).join('');
  const crowd = Array.from({ length: 60 }, (_, i) => {
    const x = (i / 59) * (w + 100) - 50 + (R() - 0.5) * 30;
    const row = i % 3;
    const y = h * (0.88 + row * 0.03) + R() * 20;
    const r = 34 + R() * 22 + row * 6;
    const rim = R() > 0.7 ? `<circle cx="${x}" cy="${y - r * 0.25}" r="${r}" fill="none" stroke="#c2ff1f" stroke-opacity=".5" stroke-width="2"/>` : '';
    return `<g><circle cx="${x}" cy="${y - r * 0.25}" r="${r}" fill="#050506"/>${rim}<rect x="${x - r * 1.3}" y="${y + r * 0.5}" width="${r * 2.6}" height="${h}" fill="#050506"/></g>`;
  }).join('');
  const hands = v % 2 === 0
    ? Array.from({ length: 6 }, () => `<rect x="${w * (0.1 + R() * 0.8)}" y="${h * (0.7 + R() * 0.1)}" width="10" height="${60 + R() * 70}" rx="5" fill="#050506" transform="rotate(${(R() - 0.5) * 40} 0 0)"/>`).join('')
    : '';
  return svg(w, h, `
  <defs>
    <linearGradient id="bg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#0c0c14"/><stop offset="1" stop-color="#050506"/></linearGradient>
    <radialGradient id="haze" cx="50%" cy="70%" r="60%"><stop offset="0" stop-color="#c2ff1f" stop-opacity=".28"/><stop offset="1" stop-color="#c2ff1f" stop-opacity="0"/></radialGradient>
    ${blur('b8', 14)}${blur('b40', 40)}
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <rect y="${h * 0.12}" width="${w}" height="6" fill="#f5f2eb" opacity=".25"/>
  ${Array.from({ length: 9 }, (_, i) => `<circle cx="${w * (0.06 + i * 0.111)}" cy="${h * 0.12 + 3}" r="9" fill="#f5f2eb" opacity=".9"/>`).join('')}
  ${beams}
  <ellipse cx="${w / 2}" cy="${h * 0.8}" rx="${w * 0.5}" ry="${h * 0.22}" fill="url(#haze)" filter="url(#b40)"/>
  ${hands}${crowd}
  ${grain(w, h, 0.2, 40 + v)}${vignette(w, h, 0.5)}`);
}

/** Ecommerce still life: paper set, geometric objects, long shadows. */
function stillLife(v, w, h) {
  const bgs = ['#e4dfd3', '#d9d3c6', '#ece8de', '#1b1b1e'];
  const dark = v === 3;
  const bg = bgs[v % 4];
  const ink = dark ? '#f5f2eb' : '#17171a';
  const floorY = h * 0.66;
  const sh = (pts) => `<polygon points="${pts}" fill="#000" opacity="${dark ? 0.7 : 0.28}" filter="url(#b18)"/>`;
  const sphere = (cx, cy, r, c1, c2) => `${sh(`${cx - r * 0.6},${cy + r} ${cx + r * 2.4},${cy + r + 8} ${cx + r * 2.2},${cy + r - 18} ${cx + r * 0.2},${cy + r - 30}`)}<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#s${c1.slice(1)}${c2.slice(1)})"/>`;
  const sphDef = (c1, c2) => `<radialGradient id="s${c1.slice(1)}${c2.slice(1)}" cx="34%" cy="30%" r="80%"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient>`;
  const cyl = (cx, y, cw, ch, c1, c2) => `${sh(`${cx - cw / 2},${y} ${cx + cw * 2.2},${y + 6} ${cx + cw * 2},${y - 22} ${cx + cw / 2},${y - 22}`)}
    <rect x="${cx - cw / 2}" y="${y - ch}" width="${cw}" height="${ch}" fill="url(#cy${c1.slice(1)})"/>
    <ellipse cx="${cx}" cy="${y - ch}" rx="${cw / 2}" ry="${cw * 0.11}" fill="${c2}"/>
    <ellipse cx="${cx}" cy="${y}" rx="${cw / 2}" ry="${cw * 0.11}" fill="${c1}" opacity=".9"/>`;
  const cyDef = (c1, c2) => `<linearGradient id="cy${c1.slice(1)}" x1="0" x2="1"><stop offset="0" stop-color="${c2}"/><stop offset=".35" stop-color="${c1}"/><stop offset="1" stop-color="${c2}" stop-opacity=".65"/></linearGradient>`;
  const block = (x, y, bw, bh, c1, c2) => `${sh(`${x},${y} ${x + bw * 2},${y + 10} ${x + bw * 1.8},${y - 20} ${x + bw},${y - 24}`)}
    <rect x="${x}" y="${y - bh}" width="${bw}" height="${bh}" fill="${c1}"/><rect x="${x + bw}" y="${y - bh + 24}" width="${bw * 0.22}" height="${bh - 24}" fill="${c2}"/><polygon points="${x},${y - bh} ${x + bw},${y - bh} ${x + bw * 1.22},${y - bh + 24} ${x + bw * 0.22},${y - bh + 24}" fill="#fff" opacity=".45"/>`;
  const acid = '#c2ff1f';
  let objs;
  if (v === 0) objs = cyl(w * 0.32, floorY + 30, w * 0.14, h * 0.34, '#17171a', '#3a3a3e') + sphere(w * 0.55, floorY - h * 0.02, h * 0.15, '#fff', '#b7b1a2') + block(w * 0.66, floorY + 40, w * 0.1, h * 0.2, acid, '#9ccc12');
  else if (v === 1) objs = block(w * 0.28, floorY + 40, w * 0.16, h * 0.4, '#f5f2eb', '#cfc9b9') + sphere(w * 0.6, floorY + 10, h * 0.1, acid, '#8ab310') + cyl(w * 0.74, floorY + 24, w * 0.08, h * 0.16, '#17171a', '#3a3a3e');
  else if (v === 2) objs = sphere(w * 0.5, floorY - h * 0.1, h * 0.22, '#fff', '#a9a392') + cyl(w * 0.24, floorY + 30, w * 0.1, h * 0.22, acid, '#9ccc12') + block(w * 0.7, floorY + 40, w * 0.1, h * 0.28, '#17171a', '#3a3a3e');
  else objs = sphere(w * 0.34, floorY, h * 0.13, '#f5f2eb', '#7d786b') + cyl(w * 0.54, floorY + 26, w * 0.12, h * 0.3, acid, '#8ab310') + block(w * 0.68, floorY + 40, w * 0.12, h * 0.18, '#3a3a3e', '#1f1f23');
  return svg(w, h, `
  <defs>
    <linearGradient id="wall" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${bg}"/><stop offset="1" stop-color="${dark ? '#0d0d0f' : '#cfc9bb'}"/></linearGradient>
    <linearGradient id="fl" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${dark ? '#1f1f23' : '#f2eee4'}"/><stop offset="1" stop-color="${dark ? '#09090a' : '#d5cfc0'}"/></linearGradient>
    ${sphDef('#fff', '#b7b1a2')}${sphDef('#fff', '#a9a392')}${sphDef(acid, '#8ab310')}${sphDef('#f5f2eb', '#7d786b')}
    ${cyDef('#17171a', '#3a3a3e')}${cyDef(acid, '#9ccc12')}
    ${blur('b18', 16)}
  </defs>
  <rect width="${w}" height="${h}" fill="url(#wall)"/>
  <rect y="${floorY}" width="${w}" height="${h - floorY}" fill="url(#fl)"/>
  <rect y="${floorY}" width="${w}" height="1" fill="${ink}" opacity=".12"/>
  ${objs}
  ${vignette(w, h, dark ? 0.55 : 0.2)}${grain(w, h, 0.12, 60 + v)}`);
}

/** Configurator UI: window schematic with dimension lines. */
function configurator(v, w, h) {
  const frame = ['#c2ff1f', '#f5f2eb', '#9e9b94', '#c2ff1f'][v % 4];
  const cx = w * 0.4, cy = h * 0.5;
  const fw = w * (0.3 + (v % 2) * 0.05), fh = h * 0.56;
  const x = cx - fw / 2, y = cy - fh / 2;
  const cols = v % 2 === 0 ? 2 : 3;
  const mull = Array.from({ length: cols - 1 }, (_, i) => `<rect x="${x + (fw / cols) * (i + 1) - 4}" y="${y}" width="8" height="${fh}" fill="${frame}" opacity=".9"/>`).join('');
  const swatches = ['#c2ff1f', '#f5f2eb', '#9e9b94', '#38383b', '#d6a35a', '#5a7d9a'].map((c, i) => `<circle cx="${w * 0.7 + i * 54}" cy="${h * 0.34}" r="20" fill="${c}" ${i === v % 6 ? 'stroke="#c2ff1f" stroke-width="3"' : 'stroke="#38383b" stroke-width="2"'}/>${i === v % 6 ? `<circle cx="${w * 0.7 + i * 54}" cy="${h * 0.34}" r="28" fill="none" stroke="#c2ff1f" stroke-width="2"/>` : ''}`).join('');
  const font = 'Helvetica, Arial, sans-serif';
  return svg(w, h, `
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#17171a"/><stop offset="1" stop-color="#09090a"/></linearGradient>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0V48" fill="none" stroke="#38383b" stroke-width="1" opacity=".55"/></pattern>
    <linearGradient id="glass" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#9ad7ff" stop-opacity=".3"/><stop offset="1" stop-color="#9ad7ff" stop-opacity=".05"/></linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <rect width="${w}" height="${h}" fill="url(#grid)"/>
  <rect x="${x}" y="${y}" width="${fw}" height="${fh}" fill="url(#glass)"/>
  <rect x="${x}" y="${y}" width="${fw}" height="${fh}" fill="none" stroke="${frame}" stroke-width="14"/>
  ${mull}
  <polygon points="${x + 24},${y + 24} ${x + fw * 0.35},${y + 24} ${x + 24},${y + fh * 0.4}" fill="#fff" opacity=".1"/>
  <g stroke="#9e9b94" stroke-width="2" fill="none" font-family="${font}" font-size="26" fill-opacity="1">
    <path d="M${x} ${y + fh + 54} H${x + fw}M${x} ${y + fh + 40}V${y + fh + 68}M${x + fw} ${y + fh + 40}V${y + fh + 68}"/>
    <path d="M${x - 54} ${y} V${y + fh}M${x - 68} ${y}H${x - 40}M${x - 68} ${y + fh}H${x - 40}"/>
    <text x="${cx}" y="${y + fh + 100}" fill="#f5f2eb" stroke="none" text-anchor="middle">${1000 + v * 240} mm</text>
    <text x="${x - 90}" y="${cy}" fill="#f5f2eb" stroke="none" text-anchor="middle" transform="rotate(-90 ${x - 90} ${cy})">${1800 + v * 120} mm</text>
  </g>
  <g>
    <rect x="${w * 0.66}" y="${h * 0.18}" width="${w * 0.28}" height="${h * 0.64}" rx="26" fill="#17171a" stroke="#38383b" stroke-width="2"/>
    <text x="${w * 0.7}" y="${h * 0.26}" fill="#9e9b94" font-family="${font}" font-size="22" letter-spacing="4">FINITURA</text>
    ${swatches}
    <text x="${w * 0.7}" y="${h * 0.46}" fill="#9e9b94" font-family="${font}" font-size="22" letter-spacing="4">APERTURA</text>
    ${['Battente', 'Scorrevole', 'Vasistas'].map((t, i) => `<rect x="${w * 0.7}" y="${h * (0.5 + i * 0.075)}" width="${w * 0.2}" height="${h * 0.055}" rx="${h * 0.0275}" fill="${i === v % 3 ? '#c2ff1f' : 'none'}" stroke="${i === v % 3 ? '#c2ff1f' : '#38383b'}" stroke-width="2"/><text x="${w * 0.7 + 28}" y="${h * (0.5 + i * 0.075) + h * 0.037}" fill="${i === v % 3 ? '#09090a' : '#f5f2eb'}" font-family="${font}" font-size="24">${t}</text>`).join('')}
    <rect x="${w * 0.7}" y="${h * 0.74}" width="${w * 0.2}" height="${h * 0.06}" rx="${h * 0.03}" fill="#f5f2eb"/>
    <text x="${w * 0.7 + 28}" y="${h * 0.74 + h * 0.04}" fill="#09090a" font-family="${font}" font-size="26" font-weight="700">Richiedi preventivo</text>
  </g>
  ${grain(w, h, 0.1, 80 + v)}`);
}

/** CRM / dashboard: sidebar, kanban, chart. */
function crm(v, w, h) {
  const R = rng(500 + v);
  const font = 'Helvetica, Arial, sans-serif';
  const pts = Array.from({ length: 12 }, (_, i) => [w * 0.34 + (i / 11) * w * 0.58, h * (0.38 - (i / 11) * 0.12 * (1 + v * 0.2) + (R() - 0.5) * 0.08)]);
  const line = pts.map((p) => p.join(',')).join(' ');
  const area = `${w * 0.34},${h * 0.5} ${line} ${w * 0.92},${h * 0.5}`;
  const kanban = [0, 1, 2].map((c) => {
    const cx = w * 0.34 + c * w * 0.2;
    const cards = Array.from({ length: 3 - (c === 2 ? 1 : 0) }, (_, k) => {
      const cy = h * 0.6 + k * h * 0.12;
      return `<rect x="${cx}" y="${cy}" width="${w * 0.18}" height="${h * 0.1}" rx="14" fill="#1f1f23" stroke="#38383b" stroke-width="2"/><rect x="${cx + 18}" y="${cy + 20}" width="${w * 0.1 + R() * 40}" height="10" rx="5" fill="#f5f2eb" opacity=".8"/><rect x="${cx + 18}" y="${cy + 44}" width="${w * 0.06}" height="8" rx="4" fill="#9e9b94" opacity=".7"/><circle cx="${cx + w * 0.18 - 28}" cy="${cy + h * 0.05}" r="12" fill="${['#c2ff1f', '#f5f2eb', '#9e9b94'][(c + k + v) % 3]}"/>`;
    }).join('');
    return `<text x="${cx}" y="${h * 0.575}" fill="#9e9b94" font-family="${font}" font-size="20" letter-spacing="3">${['LEAD', 'TRATTATIVA', 'CHIUSO'][c]}</text>${cards}`;
  }).join('');
  return svg(w, h, `
  <defs>
    <linearGradient id="bg" x1="0" x2="1"><stop offset="0" stop-color="#101012"/><stop offset="1" stop-color="#09090a"/></linearGradient>
    <linearGradient id="ar" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#c2ff1f" stop-opacity=".35"/><stop offset="1" stop-color="#c2ff1f" stop-opacity="0"/></linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <rect x="${w * 0.04}" y="${h * 0.08}" width="${w * 0.22}" height="${h * 0.84}" rx="24" fill="#17171a" stroke="#38383b" stroke-width="2"/>
  <circle cx="${w * 0.075}" cy="${h * 0.14}" r="14" fill="#c2ff1f"/>
  ${Array.from({ length: 6 }, (_, i) => `<rect x="${w * 0.06}" y="${h * (0.24 + i * 0.09)}" width="${w * 0.18 - (i % 3) * 30}" height="${h * 0.05}" rx="${h * 0.025}" fill="${i === v % 6 ? '#c2ff1f' : '#1f1f23'}" ${i === v % 6 ? '' : 'stroke="#38383b" stroke-width="2"'}/>`).join('')}
  <rect x="${w * 0.3}" y="${h * 0.08}" width="${w * 0.64}" height="${h * 0.42}" rx="24" fill="#131315" stroke="#38383b" stroke-width="2"/>
  <text x="${w * 0.34}" y="${h * 0.15}" fill="#9e9b94" font-family="${font}" font-size="20" letter-spacing="3">RICAVI / 12 MESI</text>
  <text x="${w * 0.34}" y="${h * 0.22}" fill="#f5f2eb" font-family="${font}" font-size="52" font-weight="700">[XX]%</text>
  <polygon points="${area}" fill="url(#ar)"/>
  <polyline points="${line}" fill="none" stroke="#c2ff1f" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>
  ${pts.slice(-1).map(([px, py]) => `<circle cx="${px}" cy="${py}" r="11" fill="#09090a" stroke="#c2ff1f" stroke-width="5"/>`).join('')}
  ${kanban}
  ${grain(w, h, 0.1, 90 + v)}`);
}

const ARTS = { cosmetic, hospitality, event, stillLife, configurator, crm };

/* ---------- manifest ---------- */
const projects = [
  { slug: 'nuvola-lab-skincare', art: 'cosmetic', count: 4 },
  { slug: 'casa-marea-social', art: 'hospitality', count: 4 },
  { slug: 'festival-linea-live', art: 'event', count: 4 },
  { slug: 'forma-atelier-ecommerce', art: 'stillLife', count: 4 },
  { slug: 'tessera-configuratore', art: 'configurator', count: 4 },
  { slug: 'rotta-crm-logistica', art: 'crm', count: 4 },
];

async function render(markup, file, q = 80) {
  mkdirSync(dirname(file), { recursive: true });
  await sharp(Buffer.from(markup)).jpeg({ quality: q, mozjpeg: true }).toFile(file);
}

for (const p of projects) {
  const art = ARTS[p.art];
  await render(art(0, 2000, 1500), out('src/assets/projects', p.slug, 'cover.jpg'), 82);
  for (let i = 1; i <= p.count - 1; i++) {
    const wide = i % 2 === 1;
    await render(art(i, wide ? 1800 : 1200, wide ? 1200 : 1500), out('src/assets/projects', p.slug, `gallery-0${i}.jpg`), 80);
  }
  await render(art(2, 1600, 900), out('src/assets/projects', p.slug, 'poster.jpg'), 78);
  console.log('✓', p.slug);
}

/* ---------- OG image, favicon, touch icon ---------- */
const font = 'Helvetica, Arial, sans-serif';
const og = svg(1200, 630, `
  <rect width="1200" height="630" fill="#09090A"/>
  <rect x="40" y="40" width="1120" height="550" fill="none" stroke="#38383B" stroke-width="2"/>
  <text x="80" y="110" fill="#9E9B94" font-family="${font}" font-size="22" letter-spacing="6">CREATIVE + DIGITAL STUDIO</text>
  <text x="80" y="300" fill="#F5F2EB" font-family="${font}" font-size="132" font-weight="700" letter-spacing="-4">CREIAMO</text>
  <text x="80" y="430" fill="#F5F2EB" font-family="${font}" font-size="132" font-weight="700" letter-spacing="-4">COSE CHE</text>
  <text x="80" y="548" fill="#C2FF1F" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="120">guardare.</text>
  <circle cx="1060" cy="140" r="22" fill="#C2FF1F"/>
  <text x="1120" y="570" text-anchor="end" fill="#9E9B94" font-family="${font}" font-size="22" letter-spacing="3">[NOME AGENZIA]</text>
  ${grain(1200, 630, 0.1, 7)}`);
await sharp(Buffer.from(og)).jpeg({ quality: 86 }).toFile(out('public/og-default.jpg'));

const fav = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#09090A"/><circle cx="32" cy="32" r="14" fill="#C2FF1F"/><circle cx="32" cy="32" r="5" fill="#09090A"/></svg>`;
writeFileSync(out('public/favicon.svg'), fav);
await sharp(Buffer.from(fav)).resize(180, 180).png().toFile(out('public/apple-touch-icon.png'));
await sharp(Buffer.from(fav)).resize(512, 512).png().toFile(out('public/icon-512.png'));
console.log('✓ og / favicon / icons');
