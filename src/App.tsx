import { useEffect, useState } from 'react';
import type { POV, Variant, ViewOptions } from './types';
import { useDesigns } from './hooks/useDesigns';
import { FloorPlan } from './components/plan/FloorPlan';
import { FrontElevation, BackElevation, LeftElevation, RightElevation, CrossSection } from './components/plan/Elevations';
import { Viewer3D, type PovRequest } from './components/three/Viewer3D';
import { Editor } from './components/Editor';
import { ConceptNotes, QuantityTable } from './components/ConceptNotes';
import { QuickGuide, Legend } from './components/Guide';
import { DesignChecks } from './components/DesignChecks';
import { derive, m2 } from './lib/geometry';
import { cn } from './utils/cn';

type Tab = '2d' | '3d';

const POVS: { id: POV; label: string; icon: string; hint: string }[] = [
  { id: 'iso', label: 'Isometrik', icon: '◈', hint: 'Tampak 3D dari depan–kanan–atas' },
  { id: 'front', label: 'Depan', icon: '▣', hint: 'Sisi pintu masuk' },
  { id: 'right', label: 'Kanan', icon: '▶', hint: 'Sisi kanan bangunan' },
  { id: 'back', label: 'Belakang', icon: '▤', hint: 'Sisi belakang bangunan' },
  { id: 'left', label: 'Kiri (pagar)', icon: '◀', hint: 'Sisi perluasan / bekas jalur pagar' },
  { id: 'top', label: 'Atas', icon: '▲', hint: 'Denah atap dilihat dari atas' },
  { id: 'isoBack', label: 'Iso Belakang', icon: '◇', hint: 'Tampak 3D dari belakang–kiri–atas' },
  { id: 'interior', label: 'Interior', icon: '⌂', hint: 'Berdiri di dalam ruang, dekat pintu' },
];

const DEFAULT_OPTS: ViewOptions = {
  showDimensions: true,
  showLabels: true,
  showRoof: true,
  transparentWalls: false,
  showContext: true,
  autoRotate: false,
};

export default function App() {
  const api = useDesigns();
  const { designs } = api;
  const [tab, setTab] = useState<Tab>('2d');
  const [variant, setVariant] = useState<Variant>('after');
  const [compare, setCompare] = useState(false);
  const [showEditor, setShowEditor] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showDetailDims, setShowDetailDims] = useState(true);
  const [showConcept, setShowConcept] = useState(true);
  const [pov, setPov] = useState<PovRequest>({ pov: 'iso', n: 0 });
  const [opts, setOpts] = useState<ViewOptions>(DEFAULT_OPTS);
  const [showGuide, setShowGuide] = useState(true);

  const design = designs[variant];
  const g = derive(design);
  const goPov = (p: POV) => setPov((r) => ({ pov: p, n: r.n + 1 }));
  const toggleOpt = (k: keyof ViewOptions) => setOpts((o) => ({ ...o, [k]: !o[k] }));

  const variantsToShow: Variant[] = compare ? ['before', 'after'] : [variant];

  // pindah tab → kembali ke atas supaya pengguna tidak "nyasar" di tengah halaman
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [tab]);

  // pintasan keyboard: 1/2 = tab, B/A = varian, V = bandingkan
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === '1') setTab('2d');
      else if (k === '2') setTab('3d');
      else if (k === 'b') {
        setVariant('before');
        setCompare(false);
      } else if (k === 'a') {
        setVariant('after');
        setCompare(false);
      } else if (k === 'v') setCompare((c) => !c);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* ---------------- HEADER ---------------- */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
          <div className="mr-auto">
            <h1 className="text-base font-bold leading-tight tracking-tight sm:text-lg">
              Rumah Genset <span className="text-slate-400">—</span> Desain 2D & 3D Interaktif
            </h1>
            <p className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500">
              <span>Before → After • lengkap dengan ukuran, POV semua sisi, dan dapat diedit</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700">
                ✓ tersimpan otomatis
                {api.savedAt && (
                  <span className="font-normal text-emerald-600/80">
                    {new Date(api.savedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </span>
            </p>
          </div>

          {/* tabs */}
          <div className="flex rounded-lg bg-slate-100 p-1 text-sm">
            {(
              [
                ['2d', '1. Konsep & Denah 2D'],
                ['3d', '2. Model 3D'],
              ] as [Tab, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn('rounded-md px-3 py-1.5 font-medium transition', tab === id ? 'bg-white text-slate-900 shadow' : 'text-slate-600 hover:text-slate-900')}
              >
                {label}
              </button>
            ))}
          </div>

          {/* variant */}
          <div className="flex rounded-lg bg-slate-100 p-1 text-sm">
            <button
              type="button"
              onClick={() => {
                setVariant('before');
                setCompare(false);
              }}
              className={cn('rounded-md px-3 py-1.5 font-semibold transition', !compare && variant === 'before' ? 'bg-slate-800 text-white shadow' : 'text-slate-600 hover:text-slate-900')}
            >
              BEFORE
            </button>
            <button
              type="button"
              onClick={() => {
                setVariant('after');
                setCompare(false);
              }}
              className={cn('rounded-md px-3 py-1.5 font-semibold transition', !compare && variant === 'after' ? 'bg-amber-500 text-white shadow' : 'text-slate-600 hover:text-slate-900')}
            >
              AFTER
            </button>
            <button
              type="button"
              onClick={() => setCompare((c) => !c)}
              className={cn('rounded-md px-3 py-1.5 font-semibold transition', compare ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:text-slate-900')}
            >
              Bandingkan
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowEditor((s) => !s)}
            className={cn('rounded-lg border px-3 py-1.5 text-sm font-medium transition', showEditor ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50')}
            title="Buka/tutup panel pengaturan ukuran"
          >
            ✎ Editor
          </button>
          <button
            type="button"
            onClick={() => setShowGuide((s) => !s)}
            className={cn('rounded-lg border px-3 py-1.5 text-sm font-medium transition', showGuide ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50')}
            title="Panduan singkat pemakaian & arti warna"
          >
            ? Panduan
          </button>
        </div>
      </header>

      {/* ---------------- BODY ---------------- */}
      <div className="mx-auto flex max-w-[1800px] flex-col gap-4 p-4 lg:flex-row">
        <main className="min-w-0 flex-1 space-y-4">
          {showGuide && <QuickGuide onClose={() => setShowGuide(false)} />}
          {compare && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-[12px] text-blue-900">
              <b>Mode banding aktif.</b> Klik BEFORE/AFTER di panel Editor kanan untuk memilih varian yang mau diedit.
              Pintasan: <kbd className="rounded bg-white px-1">1</kbd>/<kbd className="rounded bg-white px-1">2</kbd> ganti tab,{' '}
              <kbd className="rounded bg-white px-1">B</kbd>/<kbd className="rounded bg-white px-1">A</kbd> ganti varian,{' '}
              <kbd className="rounded bg-white px-1">V</kbd> bandingkan.
            </div>
          )}
          {tab === '2d' ? (
            <>
              {/* concept */}
              <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <button type="button" onClick={() => setShowConcept((s) => !s)} className="flex w-full items-center justify-between text-left">
                  <div>
                    <h2 className="text-base font-bold">Pemahaman Survey Lapangan</h2>
                    <p className="text-xs text-slate-500">Interpretasi 4 sketsa (denah before, denah after, tampak, catatan tiang) & 5 foto lapangan</p>
                  </div>
                  <span className="text-xs text-slate-500">{showConcept ? 'Sembunyikan ▲' : 'Tampilkan ▼'}</span>
                </button>
                {showConcept && (
                  <div className="mt-3">
                    <ConceptNotes />
                  </div>
                )}
              </section>

              {/* design checks */}
              <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <div className="mb-3">
                  <h2 className="text-base font-bold">Pemeriksaan Desain Otomatis</h2>
                  <p className="text-xs text-slate-500">
                    Diperiksa setiap kali ukuran diubah: pintu keluar dinding, genset bertumpuk/keluar batas, ruang bebas ke atap,
                    dan tinggi atap datar perluasan.
                  </p>
                </div>
                <div className={cn('grid gap-3', compare && 'xl:grid-cols-2')}>
                  {variantsToShow.map((v) => (
                    <DesignChecks key={v} design={designs[v]} variant={v} />
                  ))}
                </div>
              </section>

              {/* floor plans */}
              <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold">Denah {compare ? 'Before vs After' : design.title}</h2>
                    <p className="text-xs text-slate-500">
                      Satuan cm • Luas {m2(g.floorArea)} • Tarik (drag) tiang / genset untuk memindahkan posisi • klik elemen untuk memilih di editor
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    <input type="checkbox" checked={showDetailDims} onChange={(e) => setShowDetailDims(e.target.checked)} className="accent-blue-600" />
                    Dimensi detail (jarak bebas genset)
                  </label>
                </div>
                <div className={cn('grid gap-4', compare && 'xl:grid-cols-2')}>
                  {variantsToShow.map((v) => (
                    <div key={v} className="rounded-xl border border-slate-200 p-2">
                      <div className="mb-1 flex items-center gap-2 px-1">
                        <span className={cn('rounded px-2 py-0.5 text-[11px] font-bold text-white', v === 'before' ? 'bg-slate-800' : 'bg-amber-500')}>{v.toUpperCase()}</span>
                        <span className="text-xs font-medium text-slate-600">{designs[v].title}</span>
                      </div>
                      <FloorPlan
                        design={designs[v]}
                        onChange={(d) => api.update(v, () => d)}
                        selectedId={selectedId}
                        onSelect={(id) => {
                          setSelectedId(id);
                          if (id && compare) setVariant(v);
                        }}
                        showDetailDims={showDetailDims}
                        compact={compare}
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* elevations */}
              <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <h2 className="text-base font-bold">Tampak & Potongan</h2>
                <p className="mb-3 text-xs text-slate-500">Tampak 4 sisi (depan sesuai sketsa pelana + lean-to, belakang, kiri sisi pagar, kanan) dan potongan melintang dengan tinggi genset & pondasi.</p>
                <div className="space-y-4">
                  {variantsToShow.map((v) => (
                    <div key={v} className="space-y-3">
                      {compare && (
                        <span className={cn('inline-block rounded px-2 py-0.5 text-[11px] font-bold text-white', v === 'before' ? 'bg-slate-800' : 'bg-amber-500')}>{v.toUpperCase()}</span>
                      )}
                      <div className="grid gap-3 xl:grid-cols-2">
                        <FrontElevation design={designs[v]} />
                        <BackElevation design={designs[v]} />
                        <LeftElevation design={designs[v]} />
                        <RightElevation design={designs[v]} />
                      </div>
                      <CrossSection design={designs[v]} />
                    </div>
                  ))}
                </div>
              </section>

              {/* quantities */}
              <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <h2 className="mb-3 text-base font-bold">Rekap Ukuran Before vs After</h2>
                <QuantityTable before={designs.before} after={designs.after} />
              </section>
            </>
          ) : (
            <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
              {/* 3D toolbar */}
              <div className="border-b border-slate-200 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-slate-500">Sudut pandang</span>
                  <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-0.5">
                    {POVS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        title={p.hint}
                        onClick={() => goPov(p.id)}
                        className={cn(
                          'shrink-0 rounded-md border px-2.5 py-1 text-xs font-medium transition',
                          pov.pov === p.id ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
                        )}
                      >
                        <span className="mr-1 opacity-70">{p.icon}</span>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Tampilan</span>
                  {(
                    [
                      ['showDimensions', 'Ukuran', 'Tampilkan garis ukur 3D'],
                      ['showLabels', 'Label', 'Nama tiang, genset, dan tinggi atap'],
                      ['showRoof', 'Atap', 'Sembunyikan atap untuk melihat rangka di dalam'],
                      ['transparentWalls', 'Dinding transparan', 'Lihat posisi genset di balik dinding'],
                      ['showContext', 'Lingkungan', 'Gedung & taman sekitar sebagai konteks'],
                      ['autoRotate', 'Putar otomatis', 'Kamera berputar pelan'],
                    ] as [keyof ViewOptions, string, string][]
                  ).map(([k, label, hint]) => (
                    <button
                      key={k}
                      type="button"
                      title={hint}
                      onClick={() => toggleOpt(k)}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-[11px] font-medium transition',
                        opts[k] ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50',
                      )}
                    >
                      {opts[k] ? '✓ ' : ''}
                      {label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setOpts(DEFAULT_OPTS);
                      goPov('iso');
                    }}
                    className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                    title="Kembalikan semua pengaturan tampilan 3D ke awal"
                  >
                    ↺ Atur ulang tampilan
                  </button>
                </div>
              </div>
              <div className="border-b border-slate-200 bg-slate-50/70 px-3 py-1.5">
                <Legend compact />
              </div>

              <div className={cn('grid', compare && 'lg:grid-cols-2')}>
                {variantsToShow.map((v) => {
                  const dg = derive(designs[v]);
                  return (
                    <div key={v} className="relative h-[62vh] min-h-[420px] lg:h-[calc(100vh-190px)]">
                      <Viewer3D design={designs[v]} options={opts} request={pov} className="h-full w-full" />
                      <div className="pointer-events-none absolute left-3 top-3 z-10 space-y-1">
                        <span className={cn('inline-block rounded px-2 py-0.5 text-[11px] font-bold text-white shadow', v === 'before' ? 'bg-slate-800' : 'bg-amber-500')}>{v.toUpperCase()}</span>
                        <div className="rounded-lg bg-white/90 px-2.5 py-1.5 text-[11px] text-slate-700 shadow backdrop-blur">
                          <div className="font-semibold">{designs[v].title}</div>
                          <div className="font-mono">
                            {dg.totalWidth} × {dg.depth} cm • T. dinding {dg.wallH} • Bubungan {dg.ridgeH}
                          </div>
                          {dg.canopy && (
                            <div className="font-mono text-amber-700">
                              Atap perluasan: datar {Math.round(dg.canopy.y)} cm
                            </div>
                          )}
                          <div className="font-mono">
                            Luas {m2(dg.floorArea)} • {designs[v].columns.length} tiang • {designs[v].gensets.length} genset
                          </div>
                        </div>
                      </div>
                      <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-md bg-slate-900/80 px-2 py-1 text-[10px] leading-snug text-white">
                        Drag = putar • Scroll/pinch = zoom • Klik kanan = geser • Ubah ukuran lewat panel Editor
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* notes */}
              <div className="grid gap-3 border-t border-slate-200 p-3 md:grid-cols-2">
                {variantsToShow.map((v) => (
                  <div key={v} className="rounded-lg bg-slate-50 p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <span className={cn('rounded px-2 py-0.5 text-[10px] font-bold text-white', v === 'before' ? 'bg-slate-800' : 'bg-amber-500')}>{v.toUpperCase()}</span>
                      <span className="text-xs font-semibold text-slate-700">Catatan desain</span>
                    </div>
                    <ul className="list-disc space-y-0.5 pl-4 text-[12px] text-slate-600">
                      {designs[v].notes.filter(Boolean).map((n, i) => (
                        <li key={i}>{n}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>

        {/* ---------------- EDITOR SIDEBAR ---------------- */}
        {showEditor && (
          <aside className="w-full shrink-0 lg:sticky lg:top-[64px] lg:w-[370px] lg:self-start">
            <div className="max-h-[calc(100vh-80px)] overflow-y-auto rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
              {compare && (
                <div className="mb-2 flex rounded-lg bg-slate-100 p-1 text-xs">
                  {(['before', 'after'] as Variant[]).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setVariant(v)}
                      className={cn('flex-1 rounded-md px-2 py-1 font-semibold', variant === v ? (v === 'before' ? 'bg-slate-800 text-white' : 'bg-amber-500 text-white') : 'text-slate-600')}
                    >
                      Edit {v.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
              <Editor variant={variant} design={design} api={api} selectedId={selectedId} onSelect={setSelectedId} />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
