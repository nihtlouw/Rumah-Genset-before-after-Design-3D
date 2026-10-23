import { cn } from '../utils/cn';

/** Panduan singkat: membantu pengguna baru memahami isi & cara pakai halaman. */
export function QuickGuide({ onClose }: { onClose: () => void }) {
  return (
    <section className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">👋 Panduan singkat (30 detik)</h2>
          <p className="text-xs text-slate-600">
            Halaman ini membandingkan kondisi <b>BEFORE</b> (existing) dengan rencana <b>AFTER</b>.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md border border-blue-300 bg-white px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-100"
        >
          Mengerti, sembunyikan
        </button>
      </div>

      <ol className="grid gap-2 text-[13px] text-slate-700 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['1', 'Pilih varian', 'Tombol BEFORE / AFTER di kanan atas. “Bandingkan” menampilkan keduanya berdampingan.'],
          ['2', 'Cek denah & tampak', 'Tab “Konsep & Denah 2D”. Tarik (drag) tiang atau genset di denah untuk memindahkan posisinya.'],
          ['3', 'Lihat model 3D', 'Tab “Model 3D”. Pilih sudut pandang (POV), lalu drag = putar, scroll = zoom, klik kanan = geser.'],
          ['4', 'Ubah ukuran', 'Panel Editor di kanan: ubah dimensi, material, pintu, pagar. Semua perubahan tersimpan otomatis di browser.'],
        ].map(([n, title, text]) => (
          <li key={n} className="flex gap-2 rounded-xl bg-white/90 p-2.5 ring-1 ring-blue-100">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
              {n}
            </span>
            <span>
              <span className="block text-[12px] font-semibold text-slate-900">{title}</span>
              <span className="text-[12px] leading-snug text-slate-600">{text}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-3 rounded-xl bg-white/80 p-2.5 ring-1 ring-blue-100">
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">Arti warna & garis</p>
        <Legend compact />
      </div>
    </section>
  );
}

const ITEMS = [
  { swatch: 'bg-[#1f5fa8]', label: 'Biru', desc: 'rangka/tiang existing' },
  { swatch: 'bg-[#a8adb5]', label: 'Abu-abu', desc: 'elemen baru / beton' },
  { swatch: 'bg-amber-500', label: 'Kuning', desc: 'elemen rencana (genset baru, perluasan)' },
  { swatch: 'bg-emerald-600', label: 'Hijau', desc: 'genset existing' },
  { swatch: 'bg-[#8b949e]', label: 'Atap', desc: 'spandek — pelana (utama) & datar (perluasan)' },
];

export function Legend({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-1.5', compact ? 'text-[11px]' : 'text-xs')}>
      {ITEMS.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5 text-slate-600">
          <span className={cn('inline-block h-3 w-3 rounded-sm ring-1 ring-black/10', it.swatch)} />
          <b className="font-semibold text-slate-800">{it.label}</b>
          <span>{it.desc}</span>
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5 text-slate-600">
        <svg width="26" height="8" viewBox="0 0 26 8" aria-hidden>
          <line x1="0" y1="4" x2="26" y2="4" stroke="#f59e0b" strokeWidth="2" strokeDasharray="5 3" />
        </svg>
        <b className="font-semibold text-slate-800">Garis putus-putus</b>
        <span>posisi lama (dinding/pagar yang dibongkar)</span>
      </span>
    </div>
  );
}
