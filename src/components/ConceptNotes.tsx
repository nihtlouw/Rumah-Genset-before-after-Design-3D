import type { Design } from '../types';
import { derive, m2, m3, fmt } from '../lib/geometry';

const FINDINGS = [
  {
    title: 'Sketsa Denah BEFORE',
    color: 'border-slate-300',
    items: [
      'Bangunan existing berukuran 570 × 710 cm (lebar × panjang).',
      '6 tiang pondasi: 3 di sisi kiri, 3 di sisi kanan. Jarak as tiang baris belakang hanya 450 cm → tiang kanan-belakang masuk ±120 cm dari dinding kanan (catatan "tidak simetris").',
      'Genset existing 120 × 450 cm, diletakkan langsung di lantai TANPA pondasi, di sisi kanan ruangan.',
      'Pintu berada di dinding depan (tengah). Pagar di sisi kiri berjarak 150 cm dari dinding.',
    ],
  },
  {
    title: 'Sketsa Denah AFTER',
    color: 'border-amber-300',
    items: [
      'Pagar sudah dipindah/digeser; strip 150 cm bekas jalur pagar dimasukkan ke dalam rumah genset → lebar total 720 cm (150 + 570), dimensi 600 cm = 150 + 450 ke as tiang kanan-belakang.',
      'Genset BARU 200 × 500 cm dipasang di atas pondasi beton setinggi 30 cm, berjarak 150 cm dari dinding kiri baru, menyisakan 100 cm di depan & belakang.',
      'Tiang BARU di tengah dinding kiri baru (jarak ±120 cm ke genset baru); tiang tengah kiri lama dibongkar karena bertabrakan dengan pondasi genset baru.',
      'Genset existing (tanpa pondasi) tetap pada posisinya, 450 cm panjang; pintu tetap di dinding depan pada jalur sirkulasi di antara kedua genset.',
    ],
  },
  {
    title: 'Sketsa Tampak & Perspektif',
    color: 'border-blue-300',
    items: [
      'Tampak depan existing: atap pelana (gable) dengan 2 tiang terlihat dan pintu di tengah; bubungan searah depan–belakang.',
      'Tampak depan rencana: atap pelana existing + atap miring satu sisi (lean-to) yang lebih rendah di sisi kiri untuk area perluasan.',
      'Perspektif: dinding penutup menggunakan TRIPLEK pada bagian perluasan; tiang & rangka tetap.',
    ],
  },
  {
    title: 'Foto Lapangan',
    color: 'border-emerald-300',
    items: [
      'Sisi kiri: pembesian kolom & terpal menandai area perluasan di jalur pagar lama; pagar/taman berada di sisi ini.',
      'Sisi belakang & kanan: struktur tiang/kuda-kuda baja biru, penutup atap spandek, genset hijau existing, gedung putih bertingkat di belakang.',
      'Sisi depan: dinding panel seng/galvalum abu-abu dengan pintu besi coklat di tengah; material bata ringan (hebel) tersedia untuk dinding perluasan.',
      'Tampak luar: gable terbuka di atas dinding depan (banner Kemendagri menutup dinding depan).',
    ],
  },
];

export function ConceptNotes() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {FINDINGS.map((f) => (
        <div key={f.title} className={`rounded-xl border-l-4 ${f.color} bg-white p-4 shadow-sm ring-1 ring-slate-200`}>
          <h4 className="mb-2 text-sm font-bold text-slate-900">{f.title}</h4>
          <ul className="space-y-1.5 text-[13px] leading-snug text-slate-700">
            {f.items.map((it, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                <span>{it}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className="rounded-xl bg-slate-900 p-4 text-slate-100 md:col-span-2">
        <h4 className="mb-1 text-sm font-bold">Asumsi yang dipakai (dapat diubah di Editor)</h4>
        <p className="text-[13px] leading-snug text-slate-300">
          Tinggi dinding 300 cm, tinggi naik atap 140 cm (bubungan ±440 cm, kemiringan ±26°), tritisan 50 cm, ukuran tiang 30 × 30 cm,
          tinggi genset existing 180 cm & genset baru 220 cm, pintu 90 × 210 cm, tinggi dinding perluasan 240 cm dengan atap miring satu sisi,
          tinggi pagar 180 cm. Orientasi: sisi depan = sisi pintu, sisi kiri = sisi pagar/taman.
        </p>
      </div>
    </div>
  );
}

export function QuantityTable({ before, after }: { before: Design; after: Design }) {
  const b = derive(before);
  const a = derive(after);
  const rows: { label: string; b: string; a: string; diff?: string }[] = [
    { label: 'Lebar total', b: `${b.totalWidth} cm`, a: `${a.totalWidth} cm`, diff: `${a.totalWidth - b.totalWidth >= 0 ? '+' : ''}${a.totalWidth - b.totalWidth} cm` },
    { label: 'Panjang', b: `${b.depth} cm`, a: `${a.depth} cm` },
    { label: 'Luas lantai', b: m2(b.floorArea), a: m2(a.floorArea), diff: `+${m2(a.floorArea - b.floorArea)}` },
    { label: 'Tinggi dinding / bubungan', b: `${b.wallH} / ${b.ridgeH} cm`, a: `${a.wallH} / ${a.ridgeH} cm` },
    { label: 'Luas atap (± termasuk tritisan)', b: m2(b.roofArea), a: m2(a.roofArea), diff: `+${m2(a.roofArea - b.roofArea)}` },
    { label: 'Luas dinding (netto bukaan)', b: m2(b.wallArea), a: m2(a.wallArea) },
    { label: 'Jumlah tiang', b: `${before.columns.length} bh`, a: `${after.columns.length} bh (${after.columns.filter((c) => c.isNew).length} baru)` },
    { label: 'Jumlah genset', b: `${before.gensets.length} unit`, a: `${after.gensets.length} unit` },
    {
      label: 'Dimensi genset',
      b: before.gensets.map((g) => `${g.w}×${g.d}×${g.h}`).join(', '),
      a: after.gensets.map((g) => `${g.w}×${g.d}×${g.h}`).join(', '),
    },
    { label: 'Volume pondasi genset (±)', b: m3(b.foundationVolume), a: m3(a.foundationVolume) },
    { label: 'Jarak pagar ke dinding kiri', b: `${before.fence.gap} cm`, a: `${after.fence.gap} cm` },
    { label: 'Pintu', b: `${before.door.width}×${before.door.height} cm`, a: `${after.door.width}×${after.door.height} cm` },
  ];
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-left text-[13px]">
        <thead className="bg-slate-100 text-[11px] uppercase tracking-wide text-slate-600">
          <tr>
            <th className="px-3 py-2">Item</th>
            <th className="px-3 py-2">Before</th>
            <th className="px-3 py-2">After</th>
            <th className="px-3 py-2">Selisih</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-t border-slate-100">
              <td className="px-3 py-1.5 font-medium text-slate-800">{r.label}</td>
              <td className="px-3 py-1.5 font-mono text-slate-700">{r.b}</td>
              <td className="px-3 py-1.5 font-mono text-slate-700">{r.a}</td>
              <td className="px-3 py-1.5 font-mono text-amber-700">{r.diff ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-3 py-2 text-[11px] text-slate-500">Luas perluasan: {m2(a.addedArea)} • kemiringan atap {fmt(a.pitchDeg, 1)}°</p>
    </div>
  );
}
