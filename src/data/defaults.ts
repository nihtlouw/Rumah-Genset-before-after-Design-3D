import type { Design } from '../types';

const COL = 30; // ukuran tiang asumsi 30x30 cm (sesuai arsiran sketsa)

/**
 * ROMAH GENSET (BEFORE) — interpretasi sketsa survey:
 *  - Bangunan existing 570 x 710 cm
 *  - 6 tiang pondasi: 3 di sisi kiri, 3 di sisi kanan
 *  - Jarak as tiang baris belakang = 450 cm, sehingga tiang kanan-belakang
 *    "masuk" ±120 cm dari dinding kanan (TIDAK SIMETRIS)
 *  - Genset existing 120 x 450 cm, tanpa pondasi, di sisi kanan
 *  - Pintu di dinding depan (tengah)
 *  - Pagar di sisi kiri, berjarak 150 cm dari dinding
 */
export const BEFORE: Design = {
  id: 'before',
  title: 'Rumah Genset — BEFORE (Existing)',
  width: 570,
  depth: 710,
  wallHeight: 300,
  roofRise: 140,
  overhang: 50,
  wallMaterial: 'spandek',
  extension: { enabled: false, width: 150, wallHeight: 240, material: 'triplek' },
  columns: [
    { id: 'k1', label: 'K1', x: COL / 2, z: COL / 2, size: COL },
    { id: 'k2', label: 'K2', x: COL / 2 + 450, z: COL / 2, size: COL },
    { id: 'k3', label: 'K3', x: COL / 2, z: 355, size: COL },
    { id: 'k4', label: 'K4', x: 570 - COL / 2, z: 355, size: COL },
    { id: 'k5', label: 'K5', x: COL / 2, z: 710 - COL / 2, size: COL },
    { id: 'k6', label: 'K6', x: 570 - COL / 2, z: 710 - COL / 2, size: COL },
  ],
  gensets: [
    {
      id: 'g-exist',
      label: 'Genset Existing',
      x: 340,
      z: 130,
      w: 120,
      d: 450,
      h: 180,
      foundationH: 0,
      color: '#4f9d3a',
    },
  ],
  door: { wall: 'front', offset: 240, width: 90, height: 210 },
  fence: { visible: true, gap: 150, height: 180 },
  notes: [
    'Struktur rangka baja (tiang & kuda-kuda) warna biru, atap pelana penutup spandek.',
    'Dinding panel seng/galvalum abu-abu, pintu besi tunggal di depan.',
    'Genset existing diletakkan langsung di lantai (tanpa pondasi).',
    'Pagar BRC di sisi kiri dengan jarak 150 cm dari dinding.',
  ],
};

/**
 * ROMAH GENSET (AFTER) — interpretasi sketsa survey:
 *  - Pagar sudah digeser; strip 150 cm dijadikan perluasan ruang
 *  - Lebar total 720 cm (150 + 570); 600 cm = 150 + 450 ke as tiang kanan-belakang
 *  - Genset BARU 200 x 500 cm di atas pondasi setinggi 30 cm,
 *    150 cm dari dinding kiri baru, sisa 100 cm di depan & belakang
 *  - Tiang BARU di tengah dinding kiri baru (jarak ±120 cm ke genset baru)
 *  - Tiang tengah kiri lama (K3) dihilangkan (bertabrakan dengan genset baru)
 *  - Genset existing tetap pada posisinya
 *  - Atap perluasan: miring satu sisi (lean-to) lebih rendah, dinding triplek
 */
export const AFTER: Design = {
  id: 'after',
  title: 'Rumah Genset — AFTER (Rencana)',
  width: 570,
  depth: 710,
  wallHeight: 300,
  roofRise: 140,
  overhang: 50,
  wallMaterial: 'spandek',
  extension: { enabled: true, width: 150, wallHeight: 240, material: 'triplek' },
  columns: [
    { id: 'k1', label: 'K1', x: 150 + COL / 2, z: COL / 2, size: COL },
    { id: 'k2', label: 'K2', x: 150 + COL / 2 + 450, z: COL / 2, size: COL },
    { id: 'k4', label: 'K4', x: 720 - COL / 2, z: 355, size: COL },
    { id: 'k5', label: 'K5', x: 150 + COL / 2, z: 710 - COL / 2, size: COL },
    { id: 'k6', label: 'K6', x: 720 - COL / 2, z: 710 - COL / 2, size: COL },
    { id: 'k7', label: 'K7 (Baru)', x: COL / 2, z: 355, size: COL, isNew: true },
  ],
  gensets: [
    {
      id: 'g-new',
      label: 'Genset Baru',
      x: 150,
      z: 105,
      w: 200,
      d: 500,
      h: 220,
      foundationH: 30,
      color: '#d9a400',
      isNew: true,
    },
    {
      id: 'g-exist',
      label: 'Genset Existing',
      x: 490,
      z: 130,
      w: 120,
      d: 450,
      h: 180,
      foundationH: 0,
      color: '#4f9d3a',
    },
  ],
  door: { wall: 'front', offset: 390, width: 90, height: 210 },
  fence: { visible: true, gap: 20, height: 180 },
  notes: [
    'Pagar digeser ke luar sehingga area 150 cm masuk ke dalam rumah genset.',
    'Perluasan diberi atap miring satu sisi (lean-to) di bawah tritisan atap pelana existing.',
    'Genset baru 200 x 500 cm di atas pondasi beton setinggi 30 cm.',
    'Tiang baru di dinding kiri perluasan; tiang tengah kiri lama dibongkar.',
    'Dinding perluasan: triplek (dapat diganti bata ringan / spandek).',
  ],
};

export const DEFAULT_DESIGNS: Record<'before' | 'after', Design> = {
  before: BEFORE,
  after: AFTER,
};

export const MATERIAL_LABEL: Record<string, string> = {
  spandek: 'Panel Seng / Spandek',
  triplek: 'Triplek',
  bata: 'Bata Ringan (Hebel)',
};

export const MATERIAL_COLOR: Record<string, string> = {
  spandek: '#9aa1a8',
  triplek: '#b8865a',
  bata: '#d9d4cb',
};
