import { useState } from 'react';
import type { POV, Variant, ViewOptions } from './types';
import { useDesigns } from './hooks/useDesigns';
import { FloorPlan } from './components/plan/FloorPlan';
import { FrontElevation, BackElevation, LeftElevation, RightElevation, CrossSection } from './components/plan/Elevations';
import { Viewer3D, type PovRequest } from './components/three/Viewer3D';
import { Editor } from './components/Editor';
import { ConceptNotes, QuantityTable } from './components/ConceptNotes';
import { derive, m2 } from './lib/geometry';
import { cn } from './utils/cn';

type Tab = '2d' | '3d';

const POVS: { id: POV; label: string; icon: string }[] = [
  { id: 'iso', label: 'Isometrik', icon: '◈' },
  { id: 'front', label: 'Depan', icon: '▣' },
  { id: 'right', label: 'Kanan', icon: '▶' },
  { id: 'back', label: 'Belakang', icon: '▤' },
  { id: 'left', label: 'Kiri', icon: '◀' },
  { id: 'top', label: 'Atas', icon: '▲' },
  { id: 'isoBack', label: 'Iso Belakang', icon: '◇' },
  { id: 'interior', label: 'Interior', icon: '⌂' },
];

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
  const [opts, setOpts] = useState<ViewOptions>({
    showDimensions: true,
    showLabels: true,
    showRoof: true,
    transparentWalls: false,
    showContext: true,
    autoRotate: false,
  });

  const design = designs[variant];
  const g = derive(design);
  const goPov = (p: POV) => setPov((r) => ({ pov: p, n: r.n + 1 }));
  const toggleOpt = (k: keyof ViewOptions) => setOpts((o) => ({ ...o, [k]: !o[k] }));

  const variantsToShow: Variant[] = compare ? ['before', 'after'] : [variant];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* ---------------- HEADER ---------------- */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
          <div className="mr-auto">
            <h1 className="text-base font-bold leading-tight tracking-tight sm:text-lg">
              Rumah Genset <span className="text-slate-400">—</span> Desain 2D & 3D Interaktif
            </h1>
            <p className="text-[11px] text-slate-500">Before → After • lengkap dengan ukuran, POV semua sisi, dan dapat diedit</p>
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
          >
            ✎ Editor
          </button>
        </div>
      </header>

      {/* ---------------- BODY ---------------- */}
      <div className="mx-auto flex max-w-[1800px] flex-col gap-4 p-4 lg:flex-row">
        <main className="min-w-0 flex-1 space-y-4">
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
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2">
                <span className="mr-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">POV</span>
                {POVS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => goPov(p.id)}
                    className={cn(
                      'rounded-md border px-2.5 py-1 text-xs font-medium transition',
                      pov.pov === p.id ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
                    )}
                  >
                    <span className="mr-1 opacity-70">{p.icon}</span>
                    {p.label}
                  </button>
                ))}
                <span className="mx-2 hidden h-5 w-px bg-slate-200 sm:block" />
                {(
                  [
                    ['showDimensions', 'Ukuran'],
                    ['showLabels', 'Label'],
                    ['showRoof', 'Atap'],
                    ['transparentWalls', 'Dinding transparan'],
                    ['showContext', 'Lingkungan'],
                    ['autoRotate', 'Putar otomatis'],
                  ] as [keyof ViewOptions, string][]
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
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
                          <div className="font-mono">
                            Luas {m2(dg.floorArea)} • {designs[v].columns.length} tiang • {designs[v].gensets.length} genset
                          </div>
                        </div>
                      </div>
                      <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-md bg-slate-900/80 px-2 py-1 text-[10px] text-white">
                        Drag = putar • Scroll = zoom • Klik kanan/drag dua jari = geser
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
