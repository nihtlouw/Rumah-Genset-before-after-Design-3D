# Rumah Genset — Desain 2D & 3D Interaktif (Before / After)

Aplikasi web interaktif untuk membandingkan desain **Rumah Genset BEFORE (existing)** dan
**AFTER (rencana)** — lengkap dengan denah 2D, tampak & potongan, serta model 3D yang bisa diputar.

## 🌐 Akses online (GitHub Pages)

**https://nihtlouw.github.io/Rumah-Genset-before-after-Design-3D/**

Cara kerjanya: GitHub Pages repo ini memakai mode **“Deploy from a branch → main /”**, sehingga
yang disajikan adalah `index.html` di root. File itu **hasil build siap-saji** (satu file, JS & CSS
inline) yang di-generate dari `dev.html` + `src/`.

- Setiap push ke `main`, workflow **“Deploy to GitHub Pages”** menjalankan `npm run build:pages`
  lalu meng-commit ulang `index.html` bila ada perubahan (commit `chore(pages): rebuild index.html`).
- Kalau `index.html` belum berubah setelah menunggu ±1 menit, buka **Actions → Deploy to GitHub Pages
  → Run workflow** untuk memicu manual, lalu refresh dengan `Ctrl+Shift+R`.
- (Opsional) Jika ingin memakai pipeline Actions penuh: **Settings → Pages → Source: GitHub Actions**.
  Workflow sudah menyiapkan job deploy untuk itu.

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
npm run dev            # http://localhost:5173/dev.html  (entry sumber)
npm run build          # hasil single-file: dist/dev.html
npm run build:pages    # build + regenerate index.html di root (yang dipakai GitHub Pages)
npm run preview
```

> Catatan struktur: file entry Vite adalah **`dev.html`**, sedangkan **`index.html` di root adalah
> hasil build** — jangan diedit manual, karena akan ditimpa setiap `npm run build:pages`.

### Build untuk domain sendiri

Secara default `base` diset ke `/Rumah-Genset-before-after-Design-3D/`. Aset di-inline, tapi untuk
root domain bisa dengan:

```bash
VITE_BASE=/ npm run build:pages
```

## 🚀 Deployment

Workflow: [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml)

| Job | Fungsi |
| --- | --- |
| `publish-html` | build + commit `index.html` ke `main` (dipakai mode “deploy from branch”) |
| `build` / `deploy` | build artifact + deploy via Actions (dipakai bila Source = GitHub Actions) |

Karena `vite-plugin-singlefile` dipakai, hasil build berupa satu file HTML sehingga tidak ada
masalah path aset di subfolder GitHub Pages.
