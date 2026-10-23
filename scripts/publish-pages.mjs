/**
 * Salin hasil build single-file (dist/dev.html) menjadi index.html di root repo.
 *
 * Kenapa: GitHub Pages repo ini diset "Deploy from a branch" (main /), jadi yang
 * disajikan adalah index.html di root. Dengan menaruh hasil build di situ,
 * situs langsung berjalan tanpa perlu mengubah setting Pages sama sekali.
 *
 * Jalankan: npm run build:pages
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const src = path.join(root, 'dist', 'dev.html');
const out = path.join(root, 'index.html');

if (!fs.existsSync(src)) {
  console.error('dist/dev.html tidak ditemukan — jalankan "vite build" dulu.');
  process.exit(1);
}

const banner = `<!--
  FILE HASIL BUILD — JANGAN DIEDIT LANGSUNG.
  Sumber ada di folder src/ dengan entry dev.html.
  Regenerate: npm run build:pages
-->\n`;

const html = fs.readFileSync(src, 'utf8');
fs.writeFileSync(out, banner + html);

const kb = (fs.statSync(out).size / 1024).toFixed(0);
console.log(`✓ index.html (siap untuk GitHub Pages, ${kb} kB)`);
