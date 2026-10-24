# Rumah Genset — Desain 2D & 3D Interaktif (Before / After)

Aplikasi web interaktif untuk membandingkan desain **Rumah Genset BEFORE (existing)** dan
**AFTER (rencana)** — lengkap dengan denah 2D, tampak & potongan, serta model 3D yang bisa diputar.

## 🌐 Akses online (GitHub Pages)

**https://nihtlouw.github.io/Rumah-Genset-before-after-Design-3D/**

Cara kerjanya: GitHub Pages repo ini disajikan dari `index.html` di root (`main`), **dan** bisa juga
dari artifact GitHub Actions. Keduanya harus berisi `index.html`, karena itu `npm run build:pages`
menulis hasil build siap-saji (satu file, JS & CSS inline) ke **dua tempat**:

| Lokasi | Dipakai oleh |
| --- | --- |
| `index.html` (root repo) | mode “Deploy from a branch → main /” |
| `dist/index.html` | artifact job `deploy-pages` (mode “Source: GitHub Actions”) |

> Kalau salah satu tidak punya `index.html`, situs akan menampilkan **“404 — File not found”**
> (ini yang terjadi saat artifact hanya berisi `dev.html`).

- Setiap push ke `main`, workflow **“Deploy to GitHub Pages”** menjalankan `npm run build:pages`
  lalu meng-commit ulang `index.html` bila ada perubahan (commit `chore(pages): rebuild index.html`).
- Kalau `index.html` belum berubah setelah menunggu ±1 menit, buka **Actions → Deploy to GitHub Pages
  → Run workflow** untuk memicu manual, lalu refresh dengan `Ctrl+Shift+R`.
- (Opsional) Jika ingin memakai pipeline Actions penuh: **Settings → Pages → Source: GitHub Actions**.
  Workflow sudah menyiapkan job deploy untuk itu.

## ✨ Isi aplikasi

Halaman tunggal dengan enam bagian bernomor (nav di header bisa diklik):

| # | Bagian | Isi |
| --- | --- | --- |
| 00 | Ringkasan | axonometri skematik, statistik footprint/luas/atap datar, alur survey → 2D → 3D |
| 01 | Denah & tampak | denah terukur (drag tiang/genset), toggle dimensi detail, mode bandingkan, detail elemen terpilih, cek desain otomatis, catatan lapangan, 4 tampak + potongan A-A |
| 02 | Model 3D | 8 POV (ISO, depan, belakang, kiri, kanan, atas, iso-belakang, interior), toggle layer (ukuran, label, atap, dinding transparan, lingkungan, putar otomatis), layar penuh |
| 03 | Simpan & riwayat | status draf, simpan versi baru, perbarui versi aktif, daftar versi (muat, ganti nama, duplikat, unduh, hapus), ekspor/impor JSON |
| 04 | Before–After | dua denah berdampingan + tabel perubahan utama |
| 05 | Data & ukuran | rekap angka before/after, tabel kuantitas, catatan konsep & asumsi |

Panel **editor ukuran** menempel di samping model 3D: bangunan utama, perluasan + atap datar,
genset, tiang, pintu, pagar, catatan, dan aksi data.

### 💾 Menyimpan perubahan ukuran

- **Autosave draf** — setiap perubahan angka (termasuk drag tiang/genset di denah) langsung
  disimpan ke `localStorage` setelah ±350 ms, jadi tetap ada setelah reload.
- **Versi bernama** — tombol **Simpan** di header / `Ctrl`/`Cmd + S` menyimpan snapshot
  `BEFORE + AFTER`; jika ada versi aktif, tombol berubah menjadi **Perbarui**.
- Versi aktif tetap diingat setelah reload, dan bisa dimuat, diganti nama, diduplikat, atau dihapus
  di bagian **Riwayat**.
- **Ekspor / impor JSON** untuk cadangan atau pindah browser. Kunci penyimpanan:
  `rumah-genset.draft.v3`, `rumah-genset.versions.v3`, `rumah-genset.activeVersion.v3`.

### ⌨️ Pintasan

`B` before · `A` after · `V` bandingkan · `1`–`6` lompat antar bagian · `Ctrl`/`Cmd + S` simpan versi.

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
| `build` / `deploy` | `build:pages` → artifact `dist/` (berisi `index.html`) → deploy via Actions |

Karena `vite-plugin-singlefile` dipakai, hasil build berupa satu file HTML sehingga tidak ada
masalah path aset di subfolder GitHub Pages.
