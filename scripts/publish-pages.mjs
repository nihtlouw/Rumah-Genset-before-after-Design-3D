/**
 * Salin hasil build single-file menjadi index.html.
 *
 * Ditulis ke DUA tempat, karena GitHub Pages di repo ini bisa dilayani dari:
 *  1. branch `main` (mode "Deploy from a branch: main /")  -> index.html di root repo
 *  2. artifact GitHub Actions (job deploy-pages)            -> index.html di dalam dist/
 *
 * Kalau salah satu tidak punya index.html, situs akan menampilkan
 * "404 — File not found".
 *
 * Jalankan: npm run build:pages
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const src = path.join(root, 'dist', 'dev.html');
const targets = [path.join(root, 'index.html'), path.join(root, 'dist', 'index.html')];

if (!fs.existsSync(src)) {
  console.error('dist/dev.html tidak ditemukan — jalankan "vite build" dulu.');
  process.exit(1);
}

const banner = `<!--
  FILE HASIL BUILD — JANGAN DIEDIT LANGSUNG.
  Sumber ada di folder src/ dengan entry dev.html.
  Regenerate: npm run build:pages
-->\n`;

const html = banner + fs.readFileSync(src, 'utf8');

for (const target of targets) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, html);
  const kb = (fs.statSync(target).size / 1024).toFixed(0);
  console.log(`✓ ${path.relative(root, target)} (${kb} kB)`);
}
