import { Check, Compass, PencilRuler, Save, X } from 'lucide-react';

/* Panduan singkat — membantu pengguna baru memahami alur aplikasi. */
export function QuickGuide({ onClose }: { onClose: () => void }) {
  const steps = [
    {
      icon: <Compass size={13} />,
      title: 'Pilih skenario',
      text: 'Tombol Before / After di kanan atas. “Bandingkan” menampilkan keduanya berdampingan.',
    },
    {
      icon: <PencilRuler size={13} />,
      title: 'Baca denah & tampak',
      text: 'Denah bisa di-drag: tarik tiang atau genset untuk memindahkan posisinya.',
    },
    {
      icon: <Check size={13} />,
      title: 'Cek otomatis',
      text: 'Pemeriksaan menandai pintu keluar dinding, genset bertumpuk, atau ruang bebas kurang.',
    },
    {
      icon: <Save size={13} />,
      title: 'Simpan versi',
      text: 'Draf tersimpan otomatis. Tekan Simpan (Ctrl/Cmd + S) untuk membuat versi bernama.',
    },
  ];

  return (
    <div className="rounded-2xl border border-lime/20 bg-lime/[0.035] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-mono-tech text-[9px] uppercase tracking-[0.14em] text-lime">Panduan singkat · 30 detik</p>
          <p className="mt-1 text-[12px] leading-snug text-[#c8d3c2]">
            Halaman ini membandingkan kondisi <b className="text-[#eef5e9]">Before</b> (existing) dengan rencana{' '}
            <b className="text-[#eef5e9]">After</b>. Semua ukuran dalam cm dan bisa diubah.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-lime/25 bg-black/20 px-2.5 py-1.5 font-mono-tech text-[9px] uppercase tracking-[0.08em] text-lime transition hover:bg-lime/10"
        >
          <X size={10} /> tutup
        </button>
      </div>

      <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-2.5 rounded-xl border border-white/[0.07] bg-black/20 p-2.5">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-lime/25 bg-lime/10 text-lime">
              {step.icon}
            </span>
            <span className="min-w-0">
              <span className="flex items-baseline gap-1.5">
                <span className="font-mono-tech text-[8px] text-mist-2">0{index + 1}</span>
                <span className="text-[11px] font-medium text-[#e4ebe0]">{step.title}</span>
              </span>
              <span className="mt-0.5 block text-[10px] leading-snug text-mist">{step.text}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

const LEGEND = [
  { swatch: '#3c7691', label: 'Baja existing' },
  { swatch: '#a8adb5', label: 'Struktur baru / beton' },
  { swatch: '#c6f75c', label: 'Area perluasan' },
  { swatch: '#4b7440', label: 'Genset existing' },
  { swatch: '#d9a400', label: 'Genset baru' },
  { swatch: '#8b949e', label: 'Atap spandek' },
];

export function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      <span className="font-mono-tech text-[8px] uppercase tracking-[0.12em] text-mist-2">Legenda</span>
      {LEGEND.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5 text-[9px] text-mist">
          <span className="h-2 w-2 rounded-[2px]" style={{ background: item.swatch }} />
          {item.label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5 text-[9px] text-mist">
        <span className="h-px w-4 border-t border-dashed border-amber" />
        posisi lama (dibongkar)
      </span>
    </div>
  );
}
