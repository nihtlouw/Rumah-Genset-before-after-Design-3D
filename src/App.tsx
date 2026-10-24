import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUp,
  Box,
  Camera,
  ChevronRight,
  Download,
  Info,
  Layers,
  MousePointerClick,
  Printer,
  Ruler,
  Save,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import Header from './components/Header';
import { HeroAxon } from './components/HeroAxon';
import { FloorPlan } from './components/plan/FloorPlan';
import { BackElevation, CrossSection, FrontElevation, LeftElevation, RightElevation } from './components/plan/Elevations';
import { Viewer3D, type PovRequest } from './components/three/Viewer3D';
import { Editor } from './components/Editor';
import { ConceptNotes, QuantityTable } from './components/ConceptNotes';
import { Legend, QuickGuide } from './components/Guide';
import { DesignChecks } from './components/DesignChecks';
import { VersionsSection, SaveStatus } from './components/SavePanel';
import { DataPill, GhostButton, ModeSwitch, SectionHead, SolidButton, StatBlock } from './components/ui';
import { useDesigns, type DesignsApi } from './hooks/useDesigns';
import { derive, m2 } from './lib/geometry';
import { MATERIAL_LABEL } from './data/defaults';
import type { POV, Variant, ViewOptions } from './types';
import { cn } from './utils/cn';

const DEFAULT_OPTS: ViewOptions = {
  showDimensions: true,
  showLabels: true,
  showRoof: true,
  transparentWalls: false,
  showContext: true,
  autoRotate: false,
};

function ActionToast({ action }: { action: DesignsApi['lastAction'] }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!action) return;
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 3200);
    return () => window.clearTimeout(timer);
  }, [action?.at]);

  if (!action || !visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'no-print rise-in fixed bottom-4 right-4 z-[70] flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full border px-3.5 py-2.5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.95)] backdrop-blur-xl sm:bottom-6 sm:right-6',
        action.tone === 'warn'
          ? 'border-amber/35 bg-[#241a10]/95 text-amber'
          : 'border-lime/30 bg-[#101a13]/95 text-lime',
      )}
    >
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', action.tone === 'warn' ? 'bg-amber' : 'bg-lime')} />
      <span className="truncate font-mono-tech text-[9px] uppercase tracking-[0.06em]">{action.text}</span>
    </div>
  );
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function App() {
  const api = useDesigns();
  const { designs } = api;

  const [mode, setMode] = useState<Variant>('after');
  const [compare, setCompare] = useState(false);
  const [showDetailDims, setShowDetailDims] = useState(true);
  const [showGuide, setShowGuide] = useState(() => {
    try {
      return localStorage.getItem('rumah-genset.guide.dismissed') !== '1';
    } catch {
      return true;
    }
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pov, setPov] = useState<PovRequest>({ pov: 'iso', n: 0 });
  const [opts, setOpts] = useState<ViewOptions>(DEFAULT_OPTS);

  const design = designs[mode];
  const g = derive(design);
  const after = derive(designs.after);

  const selection = useMemo(() => {
    if (!selectedId) return null;
    const column = design.columns.find((item) => item.id === selectedId);
    if (column) {
      return {
        tone: column.isNew ? 'amber' : 'steel',
        kicker: column.isNew ? 'Tiang baru' : 'Tiang existing',
        label: column.label,
        meta: `as (${column.x}, ${column.z}) cm · ukuran ${column.size} × ${column.size} cm`,
        dims: [
          { label: 'Posisi X', value: `${column.x} cm` },
          { label: 'Posisi Z', value: `${column.z} cm` },
          { label: 'Penampang', value: `${column.size} × ${column.size} cm` },
          { label: 'Tinggi', value: `${column.x < g.ext ? Math.round(g.canopy?.wallH ?? g.wallH) : g.wallH} cm` },
        ],
      } as const;
    }
    const genset = design.gensets.find((item) => item.id === selectedId);
    if (genset) {
      return {
        tone: genset.isNew ? 'amber' : 'lime',
        kicker: genset.isNew ? 'Genset baru' : 'Genset existing',
        label: genset.label,
        meta: `${genset.w} × ${genset.d} × ${genset.h} cm · ${genset.foundationH > 0 ? `pondasi ${genset.foundationH} cm` : 'tanpa pondasi'}`,
        dims: [
          { label: 'Luas jejak', value: m2((genset.w * genset.d) / 10000) },
          { label: 'Jarak kiri', value: `${genset.x} cm` },
          { label: 'Jarak kanan', value: `${g.totalWidth - genset.x - genset.w} cm` },
          { label: 'Jarak depan', value: `${g.depth - genset.z - genset.d} cm` },
        ],
      } as const;
    }

    /* elemen semu: dipilih langsung dari model 3D */
    const pseudo: Record<string, { kicker: string; label: string; meta: string; dims: { label: string; value: string }[] }> = {
      roof: {
        kicker: 'Atap pelana',
        label: 'Atap utama',
        meta: `rangka baja · kemiringan ${g.pitchDeg.toFixed(1)}° · tritisan ${design.overhang} cm`,
        dims: [
          { label: 'Bubungan', value: `${g.ridgeH} cm` },
          { label: 'Eave', value: `${Math.round(g.eaveH)} cm` },
          { label: 'Bentang + tritisan', value: `${design.width + design.overhang * 2} cm` },
          { label: 'Luas atap', value: m2(g.roofArea) },
        ],
      },
      canopy: {
        kicker: 'Atap datar',
        label: 'Atap perluasan',
        meta: g.canopy ? `datar t ${Math.round(g.canopy.y)} cm · lebar ${Math.round(g.canopy.len)} cm` : 'tidak aktif',
        dims: [
          { label: 'Tinggi', value: `${Math.round(g.canopy?.y ?? 0)} cm` },
          { label: 'Lebar', value: `${Math.round(g.canopy?.len ?? 0)} cm` },
          { label: 'Luas', value: m2(g.canopy?.area ?? 0) },
          { label: 'Selisih ke eave', value: `${Math.round(g.eaveH - (g.canopy?.y ?? 0))} cm` },
        ],
      },
      walls: {
        kicker: 'Selubung',
        label: 'Dinding & ventilasi',
        meta: `${MATERIAL_LABEL[design.wallMaterial]} · ${design.extension.enabled ? `perluasan ${MATERIAL_LABEL[design.extension.material]}` : 'tanpa perluasan'}`,
        dims: [
          { label: 'Tinggi dinding', value: `${design.wallHeight} cm` },
          { label: 'Luas dinding', value: m2(g.wallArea) },
          { label: 'Panel', value: `${g.walls.length} bidang` },
          { label: 'Tinggi perluasan', value: `${Math.round(g.canopy?.wallH ?? g.wallH)} cm` },
        ],
      },
      door: {
        kicker: 'Akses',
        label: 'Pintu servis',
        meta: `dinding ${design.door.wall} · digeser ${design.door.offset} cm`,
        dims: [
          { label: 'Lebar', value: `${design.door.width} cm` },
          { label: 'Tinggi', value: `${design.door.height} cm` },
          { label: 'Posisi', value: `${design.door.offset} cm` },
          { label: 'Ambang', value: 'rata lantai' },
        ],
      },
      fence: {
        kicker: 'Batas',
        label: 'Pagar BRC',
        meta: design.fence.visible ? `sisi kiri · jarak ${design.fence.gap} cm` : 'disembunyikan',
        dims: [
          { label: 'Tinggi', value: `${design.fence.height} cm` },
          { label: 'Jarak ke dinding', value: `${design.fence.gap} cm` },
          { label: 'Panjang', value: `${design.depth} cm` },
          { label: 'Status', value: design.fence.visible ? 'tampil' : 'nonaktif' },
        ],
      },
      site: {
        kicker: 'Tapak',
        label: 'Lahan & slab',
        meta: `footprint ${g.totalWidth} × ${g.depth} cm`,
        dims: [
          { label: 'Luas lantai', value: m2(g.floorArea) },
          { label: 'Luas perluasan', value: m2(g.addedArea) },
          { label: 'Volume pondasi', value: `${g.foundationVolume.toFixed(2)} m³` },
          { label: 'Jumlah tiang', value: `${design.columns.length} bh` },
        ],
      },
    };
    const hit = pseudo[selectedId];
    if (hit) {
      return {
        tone: 'lime',
        kicker: hit.kicker,
        label: hit.label,
        meta: hit.meta,
        dims: hit.dims,
      } as const;
    }
    return null;
  }, [selectedId, design, g]);

  const selection3D = selection;

  const goPov = (next: POV) => setPov((request) => ({ pov: next, n: request.n + 1 }));
  const toggleOpt = (key: keyof ViewOptions) => setOpts((options) => ({ ...options, [key]: !options[key] }));

  const exportJson = () => {
    const blob = new Blob([api.exportProject()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'rumah-genset-project.json';
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1200);
  };

  /* pintasan keyboard: B/A skenario, V banding, S simpan, 1–6 navigasi */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        api.saveVersion(undefined, api.activeVersionId);
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === 'b') setMode('before');
      else if (key === 'a') setMode('after');
      else if (key === 'v') setCompare((value) => !value);
      else if (/^[1-6]$/.test(key)) {
        const ids = ['ringkasan', 'denah', 'model', 'riwayat', 'banding', 'data'];
        scrollToId(ids[Number(key) - 1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [api]);

  return (
    <div className="app-shell relative min-h-screen overflow-x-hidden bg-ink text-[#edf2ea]">
      <div className="relative z-[1]">
        <Header mode={mode} onMode={setMode} api={api} />

        <main className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
          {/* ================= 00 · RINGKASAN ================= */}
          <section id="ringkasan" className="section-anchor relative pb-12 pt-8 sm:pt-10 lg:pb-16">
            <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] tech-grid opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
            <div className="grid items-center gap-8 lg:grid-cols-[1.02fr_.98fr] lg:gap-12">
              <div>
                <div className="mb-5 flex flex-wrap items-center gap-2.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-lime/25 bg-lime/[0.06] px-2.5 py-1.5 font-mono-tech text-[9px] uppercase tracking-[0.12em] text-lime">
                    <span className="h-1 w-1 rounded-full bg-lime" />
                    survey → denah 2D → model 3D
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-mono-tech text-[9px] uppercase tracking-[0.1em] text-mist-2">
                    <Camera size={10} /> Gedung G · Jakarta
                  </span>
                </div>

                <h1 className="max-w-[660px] font-display text-[38px] font-medium leading-[0.99] tracking-[-0.045em] text-[#f4f7f0] sm:text-[48px] lg:text-[56px]">
                  Dari sketsa lapangan,
                  <span className="block text-mist">jadi rumah genset</span>
                  <span className="block text-lime">yang terukur.</span>
                </h1>

                <p className="mt-5 max-w-[500px] text-[13px] leading-relaxed text-mist sm:text-[13.5px]">
                  Dua skenario — <b className="text-[#dbe4d8]">Before</b> (existing) dan{' '}
                  <b className="text-[#dbe4d8]">After</b> (rencana) — dengan perluasan sisi kiri beratap{' '}
                  <b className="text-lime">datar</b>. Ubah ukuran di editor, lihat dampaknya langsung di denah dan model 3D,
                  lalu simpan sebagai versi.
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-2.5">
                  <SolidButton onClick={() => scrollToId('model')} icon={<Box size={13} />}>
                    Buka model 3D
                  </SolidButton>
                  <GhostButton onClick={() => scrollToId('denah')} icon={<Ruler size={12} />}>
                    Lihat denah 2D
                  </GhostButton>
                  <GhostButton onClick={() => scrollToId('riwayat')} icon={<Save size={12} />}>
                    Riwayat & simpan
                  </GhostButton>
                </div>

                <div className="mt-7 grid max-w-[560px] grid-cols-2 gap-x-4 gap-y-5 border-t border-white/[0.09] pt-5 sm:grid-cols-4 sm:gap-0">
                  <div className="border-white/10 sm:border-l sm:pl-4 sm:first:border-l-0 sm:first:pl-0">
                    <span className="label-xs text-mist-2">Footprint after</span>
                    <p className="mt-1.5 font-display text-[20px] leading-none tracking-[-0.03em] text-[#eef3e9]">
                      {after.totalWidth} <span className="text-mist-2">×</span> {after.depth}
                    </p>
                    <span className="mt-1 block font-mono-tech text-[9px] text-mist-2">cm</span>
                  </div>
                  <div className="border-white/10 sm:border-l sm:pl-4">
                    <span className="label-xs text-mist-2">Luas lantai</span>
                    <p className="mt-1.5 font-display text-[20px] leading-none tracking-[-0.03em] text-[#eef3e9]">
                      {m2(after.floorArea)}
                    </p>
                    <span className="mt-1 block font-mono-tech text-[9px] text-mist-2">
                      +{m2(after.floorArea - derive(designs.before).floorArea)}
                    </span>
                  </div>
                  <div className="border-white/10 sm:border-l sm:pl-4">
                    <span className="label-xs text-mist-2">Atap perluasan</span>
                    <p className="mt-1.5 font-display text-[20px] leading-none tracking-[-0.03em] text-[#eef3e9]">
                      {after.canopy ? Math.round(after.canopy.y) : '—'} <span className="text-[12px] text-mist-2">cm</span>
                    </p>
                    <span className="mt-1 block font-mono-tech text-[9px] text-mist-2">datar</span>
                  </div>
                  <div className="border-white/10 sm:border-l sm:pl-4">
                    <span className="label-xs text-mist-2">Zona genset</span>
                    <p className="mt-1.5 font-display text-[20px] leading-none tracking-[-0.03em] text-[#eef3e9]">
                      {String(designs.after.gensets.length).padStart(2, '0')}{' '}
                      <span className="text-[12px] text-mist-2">unit</span>
                    </p>
                    <span className="mt-1 block font-mono-tech text-[9px] text-mist-2">existing + baru</span>
                  </div>
                </div>
              </div>

              <div className="relative">
                <HeroAxon design={designs[mode]} />
                <div className="no-print absolute -bottom-4 left-3 hidden items-center gap-2 rounded-full border border-white/10 bg-[#0c1415]/95 px-3 py-2 font-mono-tech text-[9px] uppercase tracking-[0.08em] text-mist shadow-xl backdrop-blur sm:flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-lime" />
                  denah 2D → model 3D · live edit
                </div>
              </div>
            </div>

            <div className="no-print mt-11 grid overflow-hidden rounded-xl border border-white/[0.08] bg-[#0b1113]/60 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: <Camera size={13} />, title: 'Survey lapangan', note: '4 sisi terdokumentasi', state: 'done' },
                { icon: <Ruler size={13} />, title: 'Denah 2D', note: 'Ukuran & zonasi', state: 'done' },
                { icon: <Box size={13} />, title: 'Model 3D', note: '8 POV · label · ukuran', state: 'active' },
                { icon: <SlidersHorizontal size={13} />, title: 'Revisi & simpan', note: 'Before / after · versi', state: 'live' },
              ].map((step, index) => (
                <div
                  key={step.title}
                  className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3.5 last:border-b-0 sm:[&:nth-child(odd)]:border-r lg:border-b-0 lg:border-r lg:last:border-r-0"
                >
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                      step.state === 'active'
                        ? 'border-lime/30 bg-lime/10 text-lime'
                        : 'border-white/10 bg-white/[0.03] text-mist-2',
                    )}
                  >
                    {step.icon}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono-tech text-[9px] text-mist-2">0{index + 1}</span>
                      <span className="truncate text-[11px] font-medium text-[#dbe4d8]">{step.title}</span>
                    </div>
                    <p className="mt-0.5 truncate font-mono-tech text-[8px] uppercase tracking-[0.08em] text-mist-2">{step.note}</p>
                  </div>
                  <span
                    className={cn(
                      'ml-auto h-1.5 w-1.5 rounded-full',
                      step.state === 'live' ? 'bg-lime' : 'bg-white/15',
                    )}
                  />
                </div>
              ))}
            </div>
          </section>

          {showGuide && (
            <div className="no-print mb-10">
              <QuickGuide
                onClose={() => {
                  setShowGuide(false);
                  try {
                    localStorage.setItem('rumah-genset.guide.dismissed', '1');
                  } catch {
                    /* ignore */
                  }
                }}
              />
            </div>
          )}

          {/* ================= 01 · DENAH & TAMPAK ================= */}
          <section id="denah" className="section-anchor border-t border-white/[0.07] py-14 sm:py-16 lg:py-20">
            <SectionHead
              index="01"
              kicker="Konsep 2D · dasar sebelum 3D"
              title={
                <>
                  Denah lengkap,
                  <span className="block text-mist">ukuran yang bisa dibaca.</span>
                </>
              }
              description="Denah digambar dari sketsa survei: batas tapak, pagar, tiang, genset, pondasi, pintu, dan area perluasan. Klik elemen untuk melihat ukurannya, atau tarik tiang/genset untuk memindahkan posisinya."
              action={
                <>
                  <ModeSwitch mode={mode} onChange={setMode} />
                  <GhostButton onClick={() => setCompare((value) => !value)} active={compare} icon={<Layers size={11} />}>
                    Bandingkan
                  </GhostButton>
                  <GhostButton onClick={() => window.print()} icon={<Printer size={11} />}>
                    Cetak
                  </GhostButton>
                </>
              }
            />

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.58fr)_minmax(310px,.62fr)]">
              {/* gambar denah */}
              <div className={cn('min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#0d1517] shadow-[0_30px_80px_-55px_rgba(0,0,0,1)]', compare && 'xl:order-1')}>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded border border-white/10 bg-white/[0.04] text-mist">
                      <Ruler size={11} />
                    </span>
                    <div>
                      <p className="font-mono-tech text-[8px] uppercase tracking-[0.12em] text-mist-2">
                        Gambar denah · {mode === 'before' ? 'A-01' : 'A-02'}
                      </p>
                      <p className="text-[11px] font-medium text-[#dfe7db]">
                        {mode === 'before' ? 'Existing — kanopi terbuka' : 'Usulan — perluasan + atap datar'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <DataPill tone="steel">
                      {g.totalWidth} × {g.depth} cm
                    </DataPill>
                    <DataPill tone={design.extension.enabled ? 'lime' : 'amber'}>
                      {design.extension.enabled ? 'perluasan' : 'tanpa perluasan'}
                    </DataPill>
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono-tech text-[9px] uppercase tracking-[0.08em] text-mist transition hover:text-white">
                      <input
                        type="checkbox"
                        checked={showDetailDims}
                        onChange={(event) => setShowDetailDims(event.target.checked)}
                        className="h-3 w-3 accent-[#c6f75c]"
                      />
                      dimensi detail
                    </label>
                  </div>
                </div>

                <div className={cn('grid', compare && 'md:grid-cols-2')}>
                  {(compare ? (['before', 'after'] as Variant[]) : [mode]).map((variant) => (
                    <div key={variant} className={cn(compare && 'border-b border-white/[0.08] md:border-b-0 md:border-r md:last:border-r-0')}>
                      {compare && (
                        <div className="flex items-center gap-2 border-b border-white/[0.06] bg-black/20 px-3 py-1.5">
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 font-mono-tech text-[8px] uppercase tracking-[0.08em]',
                              variant === 'before' ? 'bg-paper text-paperink' : 'bg-lime text-ink',
                            )}
                          >
                            {variant}
                          </span>
                          <span className="truncate text-[10px] text-mist">{designs[variant].title}</span>
                        </div>
                      )}
                      <div className="bg-paper text-paperink">
                        <FloorPlan
                          design={designs[variant]}
                          onChange={(next) => api.update(variant, () => next)}
                          selectedId={selectedId}
                          onSelect={(id) => {
                            setSelectedId(id);
                            if (id && compare) setMode(variant);
                          }}
                          showDetailDims={showDetailDims && !compare}
                          compact={compare}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-start gap-2.5 border-t border-white/[0.08] bg-[#0b1315] px-4 py-3">
                  <Info size={12} className="mt-0.5 shrink-0 text-amber" />
                  <p className="text-[9.5px] leading-relaxed text-mist-2">
                    <span className="font-mono-tech text-[8px] uppercase tracking-[0.08em] text-amber">Catatan · </span>
                    Satuan cm. Tarik tiang atau genset di denah untuk memindahkan; klik untuk melihat detail. Perubahan langsung
                    tersimpan sebagai draf dan bisa disimpan menjadi versi.
                  </p>
                </div>
              </div>

              {/* kolom kanan denah */}
              <div className="flex min-w-0 flex-col gap-4">
                <DesignChecks design={design} variant={mode} />

                {/* elemen terpilih */}
                <div
                  className={cn(
                    'rounded-2xl border p-4 transition',
                    selection ? 'border-lime/25 bg-lime/[0.04]' : 'border-white/10 bg-[#0d1517]',
                  )}
                >
                  {selection ? (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-mono-tech text-[8px] uppercase tracking-[0.12em] text-lime">{selection.kicker}</p>
                          <h3 className="mt-1 truncate text-[13px] font-medium text-[#edf4e8]">{selection.label}</h3>
                          <p className="mt-0.5 font-mono-tech text-[9px] text-mist-2">{selection.meta}</p>
                        </div>
                        <button
                          type="button"
                          aria-label="Hapus pilihan"
                          onClick={() => setSelectedId(null)}
                          className="rounded-full p-1 text-mist-2 transition hover:bg-white/10 hover:text-white"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10">
                        {selection.dims.map((dim) => (
                          <div key={dim.label} className="bg-[#0d1517] p-2.5">
                            <span className="block font-mono-tech text-[7.5px] uppercase tracking-[0.08em] text-mist-2">
                              {dim.label}
                            </span>
                            <span className="mt-1 block font-mono-tech text-[9.5px] text-[#dfe8da]">{dim.value}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div>
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-mist">
                        <MousePointerClick size={14} />
                      </span>
                      <h3 className="mt-3 text-[12px] font-medium text-[#dfe7da]">Pilih elemen pada denah</h3>
                      <p className="mt-1 text-[10px] leading-relaxed text-mist">
                        Klik genset, tiang, atau pintu untuk melihat detail ukurannya di sini.
                      </p>
                    </div>
                  )}
                </div>

                {/* ringkasan ruang */}
                <div className="rounded-2xl border border-white/10 bg-[#0d1517] p-4">
                  <div className="flex items-center justify-between border-b border-white/[0.07] pb-2.5">
                    <div>
                      <p className="font-mono-tech text-[8px] uppercase tracking-[0.12em] text-mist-2">Zonasi & alur</p>
                      <p className="mt-0.5 text-[11.5px] font-medium text-[#e4ebe0]">Konsep ruang · {mode}</p>
                    </div>
                    <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono-tech text-[8px] uppercase tracking-[0.08em] text-mist-2">
                      {design.columns.length} tiang
                    </span>
                  </div>
                  <ul className="pt-1">
                    {[
                      { k: '01', t: 'Zona genset', v: `${design.gensets.length} unit`, n: design.gensets.map((unit) => `${unit.w}×${unit.d}`).join(' · ') },
                      { k: '02', t: 'Perluasan', v: design.extension.enabled ? `${g.ext} cm` : '—', n: design.extension.enabled ? `atap datar ${Math.round(g.canopy?.y ?? 0)} cm · ${MATERIAL_LABEL[design.extension.material]}` : 'Area pagar tetap di luar bangunan' },
                      { k: '03', t: 'Akses pintu', v: `${design.door.width} × ${design.door.height}`, n: `digeser ${design.door.offset} cm dari kiri · dinding ${design.door.wall}` },
                      { k: '04', t: 'Pagar', v: design.fence.visible ? `${design.fence.gap} cm` : 'nonaktif', n: design.fence.visible ? `tinggi ${design.fence.height} cm · sisi kiri` : 'disembunyikan dari model' },
                    ].map((row) => (
                      <li key={row.k} className="flex gap-2.5 border-b border-white/[0.06] py-2 last:border-b-0">
                        <span className="font-mono-tech text-[8px] text-mist-2">{row.k}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-[11px] font-medium text-[#dbe4d7]">{row.t}</span>
                            <span className="shrink-0 font-mono-tech text-[9px] text-[#c9d6c2]">{row.v}</span>
                          </div>
                          <p className="mt-0.5 text-[10px] leading-snug text-mist-2">{row.n}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* catatan lapangan */}
                <div className="rounded-2xl border border-white/10 bg-[#0d1517] p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-mono-tech text-[8px] uppercase tracking-[0.12em] text-mist-2">Catatan lapangan · {mode}</p>
                    <span className="font-mono-tech text-[8px] uppercase tracking-[0.08em] text-mist-2">
                      {design.notes.length} poin
                    </span>
                  </div>
                  {design.notes.length ? (
                    <ul className="space-y-1.5">
                      {design.notes.slice(0, 4).map((note, index) => (
                        <li key={index} className="flex gap-2">
                          <span className="mt-[3px] font-mono-tech text-[8px] text-lime/70">{String(index + 1).padStart(2, '0')}</span>
                          <span className="text-[10px] leading-relaxed text-mist">{note}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[10px] leading-relaxed text-mist-2">
                      Belum ada catatan. Tambahkan lewat panel editor bagian <span className="text-[#dfe7dd]">Catatan</span>.
                    </p>
                  )}
                  {design.notes.length > 4 && (
                    <p className="mt-1.5 font-mono-tech text-[8px] uppercase tracking-[0.08em] text-mist-2">
                      +{design.notes.length - 4} poin lainnya di bagian data
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* tampak & potongan */}
            <div className="mt-6">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="font-mono-tech text-[8px] uppercase tracking-[0.12em] text-mist-2">Tampak & potongan</p>
                  <h3 className="mt-1 text-[13px] font-medium text-[#e6ede2]">
                    Empat sisi + potongan melintang · {mode.toUpperCase()}
                  </h3>
                </div>
                <p className="max-w-sm text-[10px] leading-relaxed text-mist-2">
                  Tampak depan menampilkan atap pelana existing + atap datar perluasan. Semua ukuran mengikuti angka pada editor.
                </p>
              </div>
              <div className="grid gap-3 xl:grid-cols-2">
                <FrontElevation design={design} />
                <BackElevation design={design} />
                <LeftElevation design={design} />
                <RightElevation design={design} />
              </div>
              <div className="mt-3">
                <CrossSection design={design} />
              </div>
            </div>
          </section>

          {/* ================= 02 · MODEL 3D ================= */}
          <section id="model" className="section-anchor relative border-t border-white/[0.07] py-14 sm:py-16 lg:py-20">
            <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] tech-grid opacity-25 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
            <SectionHead
              index="02"
              kicker="Model 3D · interaktif & terukur"
              title={
                <>
                  Lihat semua sisi.
                  <span className="block text-mist">Ubah, lalu ukur lagi.</span>
                </>
              }
              description="Model tiga dimensi mengikuti denah dan angka yang sama. Pilih POV untuk melihat fasad depan, belakang, kiri, kanan, atas, atau isometrik — lalu ubah ukuran lewat panel editor di samping."
              action={
                <>
                  <ModeSwitch mode={mode} onChange={setMode} />
                  <GhostButton onClick={exportJson} icon={<Download size={11} />}>
                    Ekspor JSON
                  </GhostButton>
                  <SaveStatus api={api} />
                </>
              }
            />

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_344px]">
              <div className="flex min-w-0 flex-col gap-4">
                <Viewer3D
                  design={design}
                  options={opts}
                  request={pov}
                  mode={mode}
                  onPov={goPov}
                  onToggle={toggleOpt}
                  onReset={() => {
                    setOpts(DEFAULT_OPTS);
                    goPov('iso');
                  }}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  selection={
                    selection3D
                      ? { title: selection3D.label, meta: selection3D.meta, dims: selection3D.dims.map((dim) => ({ label: dim.label, value: dim.value })) }
                      : null
                  }
                  editorSlot={
                    <Editor
                      surface="dock"
                      variant={mode}
                      design={design}
                      api={api}
                      selectedId={selectedId}
                      onSelect={setSelectedId}
                    />
                  }
                />

                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { icon: <MaximizeIcon />, title: 'POV semua sisi', note: 'Delapan posisi kamera teranimasi: ISO, depan, belakang, kiri, kanan, atas, iso-belakang, dan interior.' },
                    { icon: <Ruler size={13} />, title: 'Ukuran nyata', note: 'Anotasi sentimeter mengikuti eave, ridge, pondasi, pintu, dan ruang bebas genset.' },
                    { icon: <Layers size={13} />, title: 'Before / after', note: 'Dua skenario terpisah. Setiap perubahan tersimpan sebagai draf dan bisa dijadikan versi.' },
                  ].map((item) => (
                    <div key={item.title} className="rounded-xl border border-white/10 bg-[#0d1517] p-3.5">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded border border-white/10 bg-white/[0.03] text-steel">
                          {item.icon}
                        </span>
                        <p className="text-[11px] font-medium text-[#dfe7da]">{item.title}</p>
                      </div>
                      <p className="mt-2 text-[10px] leading-relaxed text-mist-2">{item.note}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-white/[0.08] bg-[#0b1214] px-4 py-3">
                  <Legend />
                </div>
              </div>

              <div className="min-w-0 xl:sticky xl:top-20 xl:self-start">
                <Editor variant={mode} design={design} api={api} selectedId={selectedId} onSelect={setSelectedId} />
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-white/[0.08] bg-[#0d1517] px-3 py-2.5">
                  <Info size={11} className="mt-0.5 shrink-0 text-mist-2" />
                  <p className="text-[9.5px] leading-relaxed text-mist-2">
                    Denah 2D dan model 3D memakai sumber angka yang sama. Tekan{' '}
                    <span className="text-lime">Ctrl/Cmd + S</span> untuk menyimpan versi.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ================= 03 · SIMPAN & RIWAYAT ================= */}
          <VersionsSection api={api} />

          {/* ================= 04 · BEFORE – AFTER ================= */}
          <section id="banding" className="section-anchor border-t border-white/[0.07] py-14 sm:py-16 lg:py-20">
            <SectionHead
              index="04"
              kicker="Before / after · sinkron dengan model"
              title={
                <>
                  Satu tapak, dua keadaan.
                  <span className="block text-mist">Lihat apa yang berubah.</span>
                </>
              }
              description="Bandingkan denah eksisting dengan usulan berdampingan. Kedua denah mengikuti perubahan ukuran yang Anda buat di editor, sehingga perbandingan selalu terbaru."
              action={
                <>
                  <DataPill tone="lime">
                    <span className="h-1 w-1 rounded-full bg-lime" /> live comparison
                  </DataPill>
                  <GhostButton onClick={() => scrollToId('model')} icon={<ChevronRight size={11} />}>
                    Lihat 3D
                  </GhostButton>
                </>
              }
            />

            <div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                {(['before', 'after'] as Variant[]).map((variant) => {
                  const dg = derive(designs[variant]);
                  return (
                    <div key={variant} className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#0d1517]">
                      <div className="flex items-center justify-between gap-2 border-b border-white/[0.08] px-3 py-2.5">
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 font-mono-tech text-[8px] uppercase tracking-[0.1em]',
                            variant === 'before' ? 'bg-paper text-paperink' : 'bg-lime text-ink',
                          )}
                        >
                          {variant}
                        </span>
                        <span className="font-mono-tech text-[9px] text-mist-2">
                          {dg.totalWidth} × {dg.depth} cm
                        </span>
                      </div>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setMode(variant)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') setMode(variant);
                        }}
                        className="block w-full cursor-pointer bg-paper text-left"
                      >
                        <FloorPlan design={designs[variant]} compact selectedId={null} onSelect={() => undefined} showDetailDims={false} />
                      </div>
                      <div className="flex items-center justify-between gap-2 border-t border-white/[0.08] px-3 py-2">
                        <span className="font-mono-tech text-[9px] text-mist-2">{m2(dg.floorArea)} · {designs[variant].gensets.length} genset</span>
                        <button
                          type="button"
                          onClick={() => setMode(variant)}
                          className="font-mono-tech text-[8px] uppercase tracking-[0.08em] text-lime hover:underline"
                        >
                          buka skenario
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="min-w-0 rounded-2xl border border-white/10 bg-[#0d1517] p-4">
                <p className="font-mono-tech text-[8px] uppercase tracking-[0.12em] text-mist-2">Perubahan utama</p>
                <div className="mt-2 space-y-2.5">
                  {[
                    {
                      label: 'Footprint',
                      from: `${derive(designs.before).totalWidth} × ${derive(designs.before).depth}`,
                      to: `${derive(designs.after).totalWidth} × ${derive(designs.after).depth}`,
                      unit: 'cm',
                    },
                    {
                      label: 'Luas lantai',
                      from: m2(derive(designs.before).floorArea),
                      to: m2(derive(designs.after).floorArea),
                      unit: '',
                    },
                    {
                      label: 'Zona genset',
                      from: `${designs.before.gensets.length}`,
                      to: `${designs.after.gensets.length}`,
                      unit: 'unit',
                    },
                    {
                      label: 'Atap perluasan',
                      from: '—',
                      to: derive(designs.after).canopy ? `datar ${Math.round(derive(designs.after).canopy!.y)}` : '—',
                      unit: 'cm',
                    },
                    {
                      label: 'Jarak pagar',
                      from: `${designs.before.fence.gap}`,
                      to: `${designs.after.fence.gap}`,
                      unit: 'cm',
                    },
                  ].map((row) => (
                    <div key={row.label} className="flex items-baseline justify-between gap-2 border-b border-white/[0.06] pb-2 last:border-b-0 last:pb-0">
                      <span className="text-[10.5px] text-mist">{row.label}</span>
                      <span className="flex items-baseline gap-1.5 font-mono-tech text-[10px]">
                        <span className="text-mist-2 line-through decoration-white/20">{row.from}</span>
                        <span className="text-mist-2">→</span>
                        <span className="text-[#e6eee0]">{row.to}</span>
                        {row.unit ? <span className="text-[8px] uppercase text-mist-2">{row.unit}</span> : null}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-lg border border-white/[0.07] bg-black/25 px-3 py-2">
                  <p className="font-mono-tech text-[8px] uppercase tracking-[0.1em] text-mist-2">catatan</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-mist">
                    Perluasan 150 cm mengubah lebar total menjadi 720 cm. Atap perluasan dibuat <span className="text-lime">datar</span>{' '}
                    agar tetap di bawah tritisan atap pelana existing.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ================= 05 · DATA & UKURAN ================= */}
          <section id="data" className="section-anchor border-t border-white/[0.07] py-14 sm:py-16 lg:py-20">
            <SectionHead
              index="05"
              kicker="Data & ukuran · rekap before–after"
              title={
                <>
                  Angka yang bisa
                  <span className="block text-mist">dibawa ke lapangan.</span>
                </>
              }
              description="Rekap ukuran, luas, dan volume dari kedua skenario, plus catatan pembacaan sketsa survei. Semua nilai dihitung ulang otomatis saat Anda mengubah ukuran."
              action={
                <>
                  <GhostButton onClick={exportJson} icon={<Download size={11} />}>
                    Unduh data
                  </GhostButton>
                  <GhostButton onClick={() => window.print()} icon={<Printer size={11} />}>
                    Cetak
                  </GhostButton>
                </>
              }
            />

            <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
              <div className="flex min-w-0 flex-col gap-3">
                <div className="grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-[#0d1517] p-4 sm:grid-cols-4">
                  <StatBlock label="Lebar total" value={String(after.totalWidth)} unit="cm" accent note={`before ${derive(designs.before).totalWidth} cm`} />
                  <StatBlock label="Panjang" value={String(after.depth)} unit="cm" />
                  <StatBlock label="Luas lantai" value={m2(after.floorArea)} />
                  <StatBlock label="Bubungan" value={String(after.ridgeH)} unit="cm" note={`eave ${Math.round(after.eaveH)} cm`} />
                </div>
                <QuantityTable before={designs.before} after={designs.after} />
              </div>
              <div className="min-w-0">
                <ConceptNotes />
              </div>
            </div>
          </section>

          {/* ================= CTA ================= */}
          <section className="no-print pb-16">
            <div className="relative overflow-hidden rounded-2xl border border-lime/25 bg-lime px-5 py-6 text-ink sm:px-8 sm:py-7">
              <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full border border-ink/10" />
              <div className="pointer-events-none absolute -bottom-24 right-24 h-48 w-48 rounded-full border border-ink/10" />
              <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-center">
                <div>
                  <p className="font-mono-tech text-[9px] uppercase tracking-[0.16em] text-ink/55">Langkah berikutnya</p>
                  <h2 className="mt-2 max-w-xl font-display text-[24px] font-medium leading-tight tracking-[-0.03em] sm:text-[28px]">
                    Sudah lihat semua sisinya? Simpan versi desainnya.
                  </h2>
                  <p className="mt-2 max-w-lg text-[12px] leading-relaxed text-ink/65">
                    Setiap perubahan ukuran tersimpan otomatis sebagai draf. Simpan sebagai versi bernama untuk kembali ke kondisi
                    ini kapan saja, atau unduh JSON untuk koordinasi.
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      api.saveVersion(undefined, api.activeVersionId);
                      scrollToId('riwayat');
                    }}
                    className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 font-mono-tech text-[9px] uppercase tracking-[0.08em] text-[#eef5e9] transition hover:bg-[#152220]"
                  >
                    <Save size={11} /> Simpan versi
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToId('riwayat')}
                    className="inline-flex items-center gap-2 rounded-full border border-ink/25 px-4 py-2.5 font-mono-tech text-[9px] uppercase tracking-[0.08em] text-ink transition hover:bg-ink/10"
                  >
                    <Layers size={11} /> Lihat riwayat
                  </button>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* ================= FOOTER ================= */}
        <footer className="border-t border-white/[0.08] bg-[#080e0f]">
          <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-10">
            <div className="grid gap-8 md:grid-cols-[1.4fr_.8fr_.8fr]">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-9 w-9 items-center justify-center rounded-[10px] border border-lime/25 bg-lime/10">
                    <svg viewBox="0 0 24 24" className="h-5 w-5 text-lime" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M3 11.2 12 4l9 7.2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M5.5 10v9.5h13V10" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M9 13.5h6" strokeLinecap="round" />
                    </svg>
                  </span>
                  <div>
                    <p className="font-display text-[13px] font-semibold tracking-[0.08em] text-[#eef4e7]">RUMAH GENSET</p>
                    <p className="mt-0.5 font-mono-tech text-[8px] uppercase tracking-[0.18em] text-mist-2">
                      design studio · gedung g
                    </p>
                  </div>
                </div>
                <p className="mt-4 max-w-sm text-[11px] leading-relaxed text-mist">
                  Konsep desain berbasis survei lapangan: denah 2D terukur, model 3D interaktif, skenario before–after, dan
                  penyimpanan versi desain di browser.
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <DataPill tone="lime">2 skenario</DataPill>
                  <DataPill tone="steel">8 POV</DataPill>
                  <DataPill>ukuran cm</DataPill>
                </div>
              </div>
              <div>
                <p className="font-mono-tech text-[8px] uppercase tracking-[0.14em] text-mist-2">Navigasi</p>
                <div className="mt-3 grid grid-cols-2 gap-y-2">
                  {[
                    { href: '#ringkasan', label: 'Ringkasan' },
                    { href: '#denah', label: 'Denah 2D' },
                    { href: '#model', label: 'Model 3D' },
                    { href: '#riwayat', label: 'Riwayat versi' },
                    { href: '#banding', label: 'Before–After' },
                    { href: '#data', label: 'Data & ukuran' },
                  ].map((item) => (
                    <a key={item.href} href={item.href} className="text-[10px] text-mist transition hover:text-lime">
                      {item.label}
                    </a>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-mono-tech text-[8px] uppercase tracking-[0.14em] text-mist-2">Sumber data</p>
                <div className="mt-3 space-y-2">
                  <p className="flex items-center gap-1.5 text-[10px] text-mist">
                    <Camera size={10} className="text-mist-2" /> 4 foto sisi lapangan
                  </p>
                  <p className="flex items-center gap-1.5 text-[10px] text-mist">
                    <Layers size={10} className="text-mist-2" /> 2 sketsa denah before / after
                  </p>
                  <p className="flex items-center gap-1.5 text-[10px] text-mist">
                    <Info size={10} className="text-mist-2" /> verifikasi dimensi di lapangan
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1.5 font-mono-tech text-[8px] uppercase tracking-[0.08em] text-mist-2 transition hover:border-lime/40 hover:text-lime"
                >
                  <ArrowUp size={10} /> kembali ke atas
                </button>
              </div>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.07] pt-4">
              <p className="font-mono-tech text-[8px] uppercase tracking-[0.08em] text-mist-2">
                © 2026 Rumah Genset Studio · konsep v2
              </p>
              <p className="font-mono-tech text-[8px] uppercase tracking-[0.08em] text-mist-2">
                gambar skematik — bukan pengganti gambar kerja / perhitungan struktur
              </p>
            </div>
          </div>
        </footer>
        <ActionToast action={api.lastAction} />
      </div>
    </div>
  );
}

function MaximizeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[13px] w-[13px]" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 9V4h5M20 15v5h-5M15 4h5v5M9 20H4v-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
