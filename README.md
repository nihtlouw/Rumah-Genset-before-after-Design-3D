# Rumah Genset — Desain 2D & 3D Interaktif (Before / After)

Aplikasi web interaktif untuk membandingkan desain **Rumah Genset BEFORE (existing)** dan
**AFTER (rencana)** — lengkap dengan denah 2D, tampak & potongan, serta model 3D yang bisa diputar.

## 🌐 Akses online

Aplikasi ini otomatis di-deploy ke GitHub Pages setiap kali ada push ke branch `main`:

**https://nihtlouw.github.io/Rumah-Genset-before-after-Design-3D/**

> Catatan: kalau halaman masih kosong/tidak berubah, buka tab **Actions** di repo, pastikan
> workflow **“Deploy to GitHub Pages”** berstatus hijau, lalu refresh dengan `Ctrl+Shift+R`.
> Pengaturan Pages: **Settings → Pages → Source: GitHub Actions**.

## ✨ Isi aplikasi

- **Tab 1 — Konsep & Denah 2D**: catatan survey, denah (bisa drag tiang/genset), tampak 4 sisi, potongan A-A, rekap ukuran before vs after.
- **Tab 2 — Model 3D**: 8 sudut pandang, opsi tampilan (ukuran, label, atap, dinding transparan, lingkungan, putar otomatis), mode layar penuh.
- **Editor (panel kanan)**: ubah dimensi bangunan, perluasan sisi kiri + atap datar, tiang, genset, pintu, pagar, dan catatan. Perubahan tersimpan otomatis di browser.
- **Pemeriksaan desain otomatis**: memperingatkan bila pintu keluar dinding, genset bertumpuk/keluar batas, atau ruang bebas ke atap kurang.
- **Pintasan keyboard**: `1`/`2` ganti tab, `B`/`A` pilih varian, `V` mode bandingkan.

## 🔑 Poin desain penting (AFTER)

- Pagar digeser, strip 150 cm masuk ke bangunan → lebar total **720 × 710 cm**.
- **Atap perluasan sisi kiri DATAR** (±265 cm), menempel ke dinding utama di bawah tritisan atap pelana (±275 cm).
- Genset baru 200 × 500 × 220 cm di atas pondasi 30 cm; genset existing 120 × 450 × 180 cm tetap.

## 🛠️ Menjalankan lokal

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # hasil single-file di dist/index.html
npm run preview
```

### Build untuk domain sendiri

Secara default `base` diset ke `/Rumah-Genset-before-after-Design-3D/` (GitHub Pages project site).
Untuk root domain, build dengan:

```bash
VITE_BASE=/ npm run build
```

## 🚀 Deployment

Workflow: [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml)

1. Push ke `main` (atau jalankan manual dari tab Actions → *Run workflow*).
2. Workflow melakukan `npm ci` → `npm run build` → upload `dist` → deploy ke Pages.
3. URL hasil deploy tampil di halaman run dan di **Settings → Pages**.

Karena `vite-plugin-singlefile` dipakai, hasil build berupa satu `dist/index.html`
(JS & CSS inline) sehingga tidak ada masalah path aset di subfolder.
