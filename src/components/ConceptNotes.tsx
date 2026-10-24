import { Camera, Layers, Ruler } from 'lucide-react';
import type { Design } from '../types';
import { derive, m2, m3, fmt } from '../lib/geometry';

const FINDINGS = [
  {
    title: 'Sketsa Denah Before',
    icon: <Ruler size={12} />,
    tone: 'border-white/15',
    items: [
      'Bangunan existing berukuran 570 × 710 cm (lebar × panjang).',
      '6 tiang pondasi: 3 di sisi kiri, 3 di sisi kanan. Jarak as tiang baris belakang hanya 450 cm → tiang kanan-belakang masuk ±120 cm dari dinding kanan (catatan "tidak simetris").',
      'Genset existing 120 × 450 cm, diletakkan langsung di lantai TANPA pondasi, di sisi kanan ruangan.',
      'Pintu berada di dinding depan (tengah). Pagar di sisi kiri berjarak 150 cm dari dinding.',
    ],
  },
  {
    title: 'Sketsa Denah After',
    icon: <Layers size={12} />,
    tone: 'border-amber/40',
    items: [
      'Pagar sudah dipindah/digeser; strip 150 cm bekas jalur pagar dimasukkan ke dalam rumah genset → lebar total 720 cm (150 + 570).',
      'Genset BARU 200 × 500 cm dipasang di atas pondasi beton setinggi 30 cm, berjarak 150 cm dari dinding kiri baru, menyisakan 100 cm di depan & belakang.',
      'Tiang BARU di tengah dinding kiri baru (jarak ±120 cm ke genset baru); tiang tengah kiri lama dibongkar karena bertabrakan dengan pondasi genset baru.',
      'Genset existing (tanpa pondasi) tetap pada posisinya; pintu tetap di dinding depan pada jalur sirkulasi di antara kedua genset.',
    ],
  },
  {
    title: 'Sketsa Tampak & Perspektif',
    icon: <Camera size={12} />,
    tone: 'border-steel/40',
    items: [
      'Tampak depan existing: atap pelana (gable) dengan 2 tiang terlihat dan pintu di tengah; bubungan searah depan–belakang.',
      'Tampak depan rencana: atap pelana existing + atap DATAR (rata, sejajar lantai) di sisi kiri untuk area perluasan.',
      'Perspektif: dinding penutup menggunakan TRIPLEK pada bagian perluasan; tiang & rangka tetap.',
      'Revisi sketsa: atap tambahan di sisi kiri harus DATAR — menempel ke dinding utama di bawah tritisan, bukan miring.',
    ],
  },
  {
    title: 'Foto Lapangan',
    icon: <Camera size={12} />,
    tone: 'border-lime/40',
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
      {FINDINGS.map((finding) => (
        <div
          key={finding.title}
          className={`rounded-2xl border border-white/10 ${finding.tone} bg-[#0d1517] p-4`}
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded border border-white/10 bg-white/[0.03] text-mist">
              {finding.icon}
            </span>
            <h4 className="text-[11.5px] font-medium text-[#e4ebe0]">{finding.title}</h4>
          </div>
          <ul className="space-y-1.5">
            {finding.items.map((item, index) => (
              <li key={index} className="flex gap-2 text-[11px] leading-relaxed text-mist">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-mist-2" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="rounded-2xl border border-lime/25 bg-lime/[0.05] p-4 md:col-span-2">
        <h4 className="font-mono-tech text-[9px] uppercase tracking-[0.12em] text-lime">Asumsi yang dipakai (dapat diubah di editor)</h4>
        <p className="mt-1.5 text-[11px] leading-relaxed text-[#c8d3c2]">
          Tinggi dinding 300 cm, tinggi naik atap 140 cm (bubungan ±440 cm, kemiringan ±26°), tritisan 50 cm, ukuran tiang 30 × 30 cm,
          tinggi genset existing 180 cm & genset baru 220 cm (di atas pondasi 30 cm), pintu 90 × 210 cm, tinggi dinding perluasan 265 cm
          dengan atap DATAR yang menempel ke dinding utama, tinggi pagar 180 cm. Orientasi: sisi depan = sisi pintu, sisi kiri = sisi
          pagar/taman.
        </p>
      </div>
    </div>
  );
}

export function QuantityTable({ before, after }: { before: Design; after: Design }) {
  const b = derive(before);
  const a = derive(after);
  const rows: { label: string; b: string; a: string; diff?: string }[] = [
    {
      label: 'Lebar total',
      b: `${b.totalWidth} cm`,
      a: `${a.totalWidth} cm`,
      diff: `${a.totalWidth - b.totalWidth >= 0 ? '+' : ''}${a.totalWidth - b.totalWidth} cm`,
    },
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
    { label: 'Atap perluasan', b: '—', a: a.canopy ? `datar, t ${Math.round(a.canopy.y)} cm` : '—' },
    { label: 'Jarak pagar ke dinding kiri', b: `${before.fence.gap} cm`, a: `${after.fence.gap} cm` },
    { label: 'Pintu', b: `${before.door.width}×${before.door.height} cm`, a: `${after.door.width}×${after.door.height} cm` },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d1517]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left">
          <thead>
            <tr className="border-b border-white/[0.08] bg-black/25">
              <th className="px-3 py-2.5 font-mono-tech text-[8px] uppercase tracking-[0.12em] text-mist-2">Item</th>
              <th className="px-3 py-2.5 font-mono-tech text-[8px] uppercase tracking-[0.12em] text-mist-2">Before</th>
              <th className="px-3 py-2.5 font-mono-tech text-[8px] uppercase tracking-[0.12em] text-lime/80">After</th>
              <th className="px-3 py-2.5 font-mono-tech text-[8px] uppercase tracking-[0.12em] text-mist-2">Selisih</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-white/[0.05] last:border-b-0 hover:bg-white/[0.02]">
                <td className="px-3 py-2 text-[11px] font-medium text-[#dfe7da]">{row.label}</td>
                <td className="px-3 py-2 font-mono-tech text-[10.5px] text-mist">{row.b}</td>
                <td className="px-3 py-2 font-mono-tech text-[10.5px] text-[#e6eee0]">{row.a}</td>
                <td className="px-3 py-2 font-mono-tech text-[10.5px] text-amber">{row.diff ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-white/[0.08] bg-black/20 px-3 py-2 font-mono-tech text-[9px] uppercase tracking-[0.06em] text-mist-2">
        Luas perluasan: {m2(a.addedArea)} · kemiringan atap {fmt(a.pitchDeg, 1)}° · satuan cm
      </p>
    </div>
  );
}
