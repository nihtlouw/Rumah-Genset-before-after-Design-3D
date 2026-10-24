import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Download, Minus, PencilRuler, Plus, Trash2, Upload, X } from 'lucide-react';
import type { Design, Variant, WallMaterial, WallSide } from '../types';
import type { DesignsApi } from '../hooks/useDesigns';
import { MATERIAL_LABEL } from '../data/defaults';
import { derive } from '../lib/geometry';
import { NumberField, ResetButton, ToggleRow } from './ui';
import { cn } from '../utils/cn';

/* ------------------------------------------------------------------ */
/* Bagian akordeon                                                    */
/* ------------------------------------------------------------------ */
interface SectionMeta {
  id: string;
  index: string;
  title: string;
  summary: string;
  body: ReactNode;
}

function SectionShell({
  index,
  title,
  summary,
  open,
  onToggle,
  children,
  isLast,
}: {
  index: string;
  title: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  isLast?: boolean;
}) {
  return (
    <div className={cn('border-b border-white/[0.07]', isLast && 'border-b-0')}>
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className={cn(
            'group flex w-full items-center gap-2.5 px-3.5 py-3 text-left transition',
            open ? 'bg-lime/[0.05]' : 'hover:bg-white/[0.03]',
          )}
        >
          <span
            className={cn(
              'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border font-mono-tech text-[9px] transition',
              open ? 'border-lime/40 bg-lime/15 text-lime' : 'border-white/10 bg-white/[0.03] text-mist-2',
            )}
          >
            {index}
          </span>
          <span className="min-w-0 flex-1">
            <span className={cn('block truncate text-[11.5px] font-medium', open ? 'text-[#eef4e9]' : 'text-[#d3dcd0]')}>
              {title}
            </span>
            {!open && summary ? (
              <span className="mt-0.5 block truncate font-mono-tech text-[8.5px] uppercase tracking-[0.06em] text-mist-2">
                {summary}
              </span>
            ) : null}
          </span>
          {open && summary ? (
            <span className="hidden shrink-0 font-mono-tech text-[8.5px] uppercase tracking-[0.05em] text-mist-2 sm:block">
              {summary}
            </span>
          ) : null}
          <ChevronDown
            size={13}
            className={cn('shrink-0 transition-transform duration-200', open ? 'rotate-180 text-lime' : 'text-mist-2')}
          />
        </button>
      </h3>
      {open ? <div className="rise-in px-3.5 pb-3.5 pt-0.5">{children}</div> : null}
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 border-b border-white/[0.06] py-2.5">
      <span className="text-[11px] font-medium text-[#c5cfc8]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-[11px] text-white outline-none transition focus:border-lime/60 focus:ring-1 focus:ring-lime/20"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-[#10181a] text-white">
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

const ICON_INPUT =
  'rounded-md border border-white/10 bg-black/40 px-1.5 py-1 text-right font-mono-tech text-[10px] text-white outline-none transition focus:border-lime/60 focus:ring-1 focus:ring-lime/20';

const MATERIALS: { value: WallMaterial; label: string }[] = (['spandek', 'triplek', 'bata'] as WallMaterial[]).map((m) => ({
  value: m,
  label: MATERIAL_LABEL[m],
}));

const WALLS: { value: WallSide; label: string }[] = [
  { value: 'front', label: 'Depan' },
  { value: 'back', label: 'Belakang' },
  { value: 'left', label: 'Kiri' },
  { value: 'right', label: 'Kanan' },
];

const SECTION_KEYS = ['01', '02', '03', '04', '05', '06', '07', '08'] as const;

/* ------------------------------------------------------------------ */
export function Editor({
  variant,
  design,
  api,
  selectedId,
  onSelect,
  surface = 'panel',
  onClose,
}: {
  variant: Variant;
  design: Design;
  api: DesignsApi;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** 'panel' = kolom kanan, 'dock' = panel mengambang di layar penuh */
  surface?: 'panel' | 'dock';
  onClose?: () => void;
}) {
  const g = derive(design);
  const set = (p: Partial<Design>) => api.patch(variant, p);
  const upd = (fn: (d: Design) => Design) => api.update(variant, fn);
  const [activeGenset, setActiveGenset] = useState(design.gensets[0]?.id ?? '');
  const [openSection, setOpenSection] = useState<string>('01');
  const [allOpen, setAllOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const idPrefix = surface === 'dock' ? 'dock-' : 'panel-';

  useEffect(() => {
    if (!design.gensets.some((unit) => unit.id === activeGenset)) {
      setActiveGenset(design.gensets[0]?.id ?? '');
    }
  }, [design.gensets, activeGenset]);

  const genset = design.gensets.find((unit) => unit.id === activeGenset) ?? design.gensets[0];
  const patchGenset = (p: Partial<Design['gensets'][number]>) => {
    if (!genset) return;
    upd((d) => ({ ...d, gensets: d.gensets.map((unit) => (unit.id === genset.id ? { ...unit, ...p } : unit)) }));
  };

  const exportJson = () => {
    const blob = new Blob([api.exportProject()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'rumah-genset-desain.json';
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1200);
  };

  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        api.importProject(String(reader.result));
      } catch (error) {
        alert('File tidak valid: ' + (error as Error).message);
      }
    };
    reader.readAsText(file);
  };

  const isOpen = (key: string) => allOpen || openSection === key;
  const toggle = (key: string) => {
    if (allOpen) {
      setAllOpen(false);
      setOpenSection(key);
      return;
    }
    setOpenSection((current) => (current === key ? '' : key));
  };
  const go = (delta: number) => {
    const index = SECTION_KEYS.indexOf(openSection as (typeof SECTION_KEYS)[number]);
    const next = Math.min(SECTION_KEYS.length - 1, Math.max(0, (index < 0 ? 0 : index) + delta));
    setAllOpen(false);
    setOpenSection(SECTION_KEYS[next]);
  };
  const openIndex = SECTION_KEYS.indexOf(openSection as (typeof SECTION_KEYS)[number]);

  const sections: SectionMeta[] = [
    {
      id: '01',
      index: '01',
      title: 'Bangunan utama',
      summary: `${design.width} × ${design.depth} · h ${design.wallHeight}`,
      body: (
        <>
          <NumberField
            label="Lebar bangunan utama"
            value={design.width}
            min={200}
            max={1200}
            idPrefix={idPrefix}
            onChange={(v) => set({ width: v })}
          />
          <NumberField
            label="Panjang (kedalaman)"
            value={design.depth}
            min={200}
            max={1500}
            idPrefix={idPrefix}
            onChange={(v) => set({ depth: v })}
          />
          <NumberField
            label="Tinggi dinding / eave"
            value={design.wallHeight}
            min={150}
            max={600}
            idPrefix={idPrefix}
            onChange={(v) => set({ wallHeight: v })}
          />
          <NumberField
            label="Rise atap pelana"
            value={design.roofRise}
            min={20}
            max={400}
            idPrefix={idPrefix}
            onChange={(v) => set({ roofRise: v })}
            hint={`Ridge ≈ ${g.ridgeH} cm dari lantai · kemiringan ${g.pitchDeg.toFixed(1)}°`}
          />
          <NumberField
            label="Overstek / tritisan"
            value={design.overhang}
            min={0}
            max={200}
            idPrefix={idPrefix}
            onChange={(v) => set({ overhang: v })}
            hint={`Eave (tepi atap) ≈ ${Math.round(g.eaveH)} cm`}
          />
          <Select
            label="Material dinding utama"
            value={design.wallMaterial}
            options={MATERIALS}
            onChange={(v) => set({ wallMaterial: v as WallMaterial })}
          />
        </>
      ),
    },
    {
      id: '02',
      index: '02',
      title: 'Perluasan & atap datar',
      summary: design.extension.enabled
        ? `aktif ${design.extension.width} cm${g.canopy ? ` · datar ${Math.round(g.canopy.y)}` : ''}`
        : 'nonaktif',
      body: (
        <>
          <ToggleRow
            label="Perluasan sisi kiri"
            description="Bekas jalur pagar 150 cm masuk ke bangunan"
            checked={design.extension.enabled}
            onChange={(v) => api.setExtensionEnabled(variant, v)}
          />
          {design.extension.enabled ? (
            <>
              <NumberField
                label="Lebar perluasan"
                value={design.extension.width}
                min={30}
                max={600}
                idPrefix={idPrefix}
                onChange={(v) => api.setExtensionWidth(variant, v)}
              />
              <NumberField
                label="Tinggi dinding / atap datar"
                value={design.extension.wallHeight}
                min={150}
                max={Math.max(160, Math.round(g.eaveH) - 6)}
                step={5}
                idPrefix={idPrefix}
                onChange={(v) => set({ extension: { ...design.extension, wallHeight: v } })}
                hint={
                  g.canopy
                    ? `Atap perluasan DATAR · tinggi efektif ${Math.round(g.canopy.y)} cm (maks. ${
                        Math.round(g.eaveH) - 6
                      } cm di bawah tritisan).`
                    : undefined
                }
              />
              <Select
                label="Material dinding perluasan"
                value={design.extension.material}
                options={MATERIALS}
                onChange={(v) => set({ extension: { ...design.extension, material: v as WallMaterial } })}
              />
              {g.canopy?.capped && (
                <p className="mt-1.5 rounded-md border border-amber/25 bg-amber/[0.07] px-2.5 py-2 text-[10px] leading-snug text-amber">
                  Tinggi dibatasi otomatis ke {Math.round(g.canopy.y)} cm agar atap datar tidak menembus atap pelana.
                </p>
              )}
            </>
          ) : (
            <p className="py-2 text-[10px] leading-snug text-mist-2">
              Nonaktif — luas bangunan tetap {design.width} cm. Aktifkan untuk memasukkan area bekas jalur pagar.
            </p>
          )}
        </>
      ),
    },
    {
      id: '03',
      index: '03',
      title: 'Genset & pondasi',
      summary: `${design.gensets.length} unit${
        design.gensets.some((unit) => unit.isNew) ? ' · ada unit baru' : ''
      }`,
      body: (
        <>
          {design.gensets.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1 rounded-lg border border-white/10 bg-black/25 p-1">
              {design.gensets.map((unit) => (
                <button
                  key={unit.id}
                  type="button"
                  onClick={() => {
                    setActiveGenset(unit.id);
                    onSelect(unit.id);
                  }}
                  className={cn(
                    'flex-1 rounded-md px-2 py-1.5 font-mono-tech text-[9px] uppercase tracking-[0.06em] transition',
                    genset?.id === unit.id ? 'bg-lime text-ink' : 'text-mist-2 hover:text-white',
                  )}
                >
                  {unit.isNew ? 'Baru' : 'Existing'} · {unit.w}×{unit.d}
                </button>
              ))}
            </div>
          )}

          {genset ? (
            <>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="color"
                  value={genset.color}
                  onChange={(e) => patchGenset({ color: e.target.value })}
                  className="h-6 w-8 cursor-pointer rounded border border-white/10 bg-transparent"
                  aria-label="Warna genset"
                />
                <input
                  value={genset.label}
                  onChange={(e) => patchGenset({ label: e.target.value })}
                  className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/40 px-2 py-1 text-[11px] font-medium text-white outline-none focus:border-lime/60"
                  aria-label="Nama genset"
                />
                <button
                  type="button"
                  title="Hapus genset"
                  onClick={() => upd((d) => ({ ...d, gensets: d.gensets.filter((unit) => unit.id !== genset.id) }))}
                  className="rounded-md p-1 text-mist-2 transition hover:bg-white/10 hover:text-rust"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="mt-1">
                <NumberField
                  label="Panjang unit (X)"
                  value={genset.w}
                  min={40}
                  max={g.totalWidth}
                  step={5}
                  idPrefix={idPrefix}
                  onChange={(v) => patchGenset({ w: v })}
                />
                <NumberField
                  label="Lebar unit (Z)"
                  value={genset.d}
                  min={40}
                  max={g.depth}
                  step={5}
                  idPrefix={idPrefix}
                  onChange={(v) => patchGenset({ d: v })}
                />
                <NumberField
                  label="Tinggi unit"
                  value={genset.h}
                  min={40}
                  max={400}
                  step={5}
                  idPrefix={idPrefix}
                  onChange={(v) => patchGenset({ h: v })}
                />
                <NumberField
                  label="Tebal pondasi"
                  value={genset.foundationH}
                  min={0}
                  max={120}
                  step={5}
                  idPrefix={idPrefix}
                  onChange={(v) => patchGenset({ foundationH: v })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <NumberField
                    label="Posisi X"
                    value={genset.x}
                    min={0}
                    max={Math.max(0, g.totalWidth - genset.w)}
                    step={5}
                    compact
                    idPrefix={idPrefix}
                    onChange={(v) => patchGenset({ x: v })}
                  />
                  <NumberField
                    label="Posisi Z"
                    value={genset.z}
                    min={0}
                    max={Math.max(0, g.depth - genset.d)}
                    step={5}
                    compact
                    idPrefix={idPrefix}
                    onChange={(v) => patchGenset({ z: v })}
                  />
                </div>
                <p className="pb-1 text-[10px] leading-snug text-mist-2">
                  Jarak bebas · kiri {genset.x} · kanan {g.totalWidth - genset.x - genset.w} · belakang {genset.z} · depan{' '}
                  {g.depth - genset.z - genset.d} cm
                </p>
              </div>
            </>
          ) : null}

          <button
            type="button"
            onClick={() =>
              upd((d) => ({
                ...d,
                gensets: [
                  ...d.gensets,
                  {
                    id: 'g' + Date.now(),
                    label: 'Genset Tambahan',
                    x: 40,
                    z: 80,
                    w: 120,
                    d: 300,
                    h: 180,
                    foundationH: 30,
                    color: '#f2a65a',
                    isNew: true,
                  },
                ],
              }))
            }
            className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1.5 font-mono-tech text-[9px] uppercase tracking-[0.08em] text-mist transition hover:border-lime/40 hover:text-lime"
          >
            <Plus size={10} /> Tambah genset
          </button>
        </>
      ),
    },
    {
      id: '04',
      index: '04',
      title: 'Tiang',
      summary: `${design.columns.length} titik${design.columns.some((c) => c.isNew) ? ' · ada yang baru' : ''}`,
      body: (
        <div className="space-y-1">
          <div className="grid grid-cols-[1fr_52px_52px_46px_22px] items-center gap-1 font-mono-tech text-[8px] uppercase tracking-[0.06em] text-mist-2">
            <span>label</span>
            <span>x</span>
            <span>z</span>
            <span>size</span>
            <span />
          </div>
          {design.columns.map((column) => (
            <div
              key={column.id}
              onClick={() => onSelect(column.id)}
              className={cn(
                'grid grid-cols-[1fr_52px_52px_46px_22px] items-center gap-1 rounded-md px-1 py-1 transition',
                selectedId === column.id ? 'bg-lime/[0.08] ring-1 ring-lime/30' : 'hover:bg-white/[0.03]',
              )}
            >
              <input
                value={column.label}
                onChange={(e) =>
                  upd((d) => ({
                    ...d,
                    columns: d.columns.map((c) => (c.id === column.id ? { ...c, label: e.target.value } : c)),
                  }))
                }
                aria-label={`Label ${column.label}`}
                className={cn(
                  'min-w-0 rounded border border-white/10 bg-black/30 px-1.5 py-1 text-[10px] outline-none focus:border-lime/60',
                  column.isNew ? 'font-semibold text-amber' : 'text-[#dfe7dd]',
                )}
              />
              <input
                type="number"
                step={5}
                value={column.x}
                aria-label={`X ${column.label}`}
                onChange={(e) =>
                  upd((d) => ({
                    ...d,
                    columns: d.columns.map((c) => (c.id === column.id ? { ...c, x: Number(e.target.value) } : c)),
                  }))
                }
                className={ICON_INPUT}
              />
              <input
                type="number"
                step={5}
                value={column.z}
                aria-label={`Z ${column.label}`}
                onChange={(e) =>
                  upd((d) => ({
                    ...d,
                    columns: d.columns.map((c) => (c.id === column.id ? { ...c, z: Number(e.target.value) } : c)),
                  }))
                }
                className={ICON_INPUT}
              />
              <input
                type="number"
                step={5}
                value={column.size}
                aria-label={`Ukuran ${column.label}`}
                onChange={(e) =>
                  upd((d) => ({
                    ...d,
                    columns: d.columns.map((c) =>
                      c.id === column.id ? { ...c, size: Math.max(10, Number(e.target.value)) } : c,
                    ),
                  }))
                }
                className={ICON_INPUT}
              />
              <button
                type="button"
                title="Hapus tiang"
                onClick={() => upd((d) => ({ ...d, columns: d.columns.filter((c) => c.id !== column.id) }))}
                className="text-mist-2 transition hover:text-rust"
              >
                <Minus size={11} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              upd((d) => ({
                ...d,
                columns: [
                  ...d.columns,
                  {
                    id: 'k' + Date.now(),
                    label: `K${d.columns.length + 1}`,
                    x: Math.round(g.totalWidth / 2),
                    z: Math.round(g.depth / 2),
                    size: 30,
                    isNew: true,
                  },
                ],
              }))
            }
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1.5 font-mono-tech text-[9px] uppercase tracking-[0.08em] text-mist transition hover:border-lime/40 hover:text-lime"
          >
            <Plus size={10} /> Tambah tiang
          </button>
          <p className="text-[10px] leading-snug text-mist-2">
            X/Z = titik as tiang (cm) dari sudut kiri-belakang. Bisa juga digeser di denah.
          </p>
        </div>
      ),
    },
    {
      id: '05',
      index: '05',
      title: 'Pintu',
      summary: `${design.door.width} × ${design.door.height} · ${WALLS.find((w) => w.value === design.door.wall)?.label ?? ''}`,
      body: (
        <>
          <Select
            label="Dinding pintu"
            value={design.door.wall}
            options={WALLS}
            onChange={(v) => set({ door: { ...design.door, wall: v as WallSide } })}
          />
          <NumberField
            label="Lebar pintu"
            value={design.door.width}
            min={50}
            max={400}
            idPrefix={idPrefix}
            onChange={(v) => set({ door: { ...design.door, width: v } })}
          />
          <NumberField
            label="Tinggi pintu"
            value={design.door.height}
            min={120}
            max={400}
            idPrefix={idPrefix}
            onChange={(v) => set({ door: { ...design.door, height: v } })}
          />
          <NumberField
            label="Geser pintu (dari kiri)"
            value={design.door.offset}
            min={0}
            max={Math.max(
              0,
              (design.door.wall === 'front' || design.door.wall === 'back' ? g.totalWidth : g.depth) - design.door.width,
            )}
            idPrefix={idPrefix}
            onChange={(v) => set({ door: { ...design.door, offset: v } })}
            hint="Posisi diukur dari tepi kiri (untuk dinding depan/belakang) atau tepi belakang (dinding samping)."
          />
        </>
      ),
    },
    {
      id: '06',
      index: '06',
      title: 'Pagar',
      summary: design.fence.visible ? `tampil · jarak ${design.fence.gap} · t ${design.fence.height}` : 'disembunyikan',
      body: (
        <>
          <ToggleRow
            label="Tampilkan pagar"
            description="Hanya tampilan model, tidak mengubah ukuran"
            checked={design.fence.visible}
            onChange={(v) => set({ fence: { ...design.fence, visible: v } })}
          />
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Jarak ke dinding"
              value={design.fence.gap}
              min={0}
              max={600}
              idPrefix={idPrefix}
              onChange={(v) => set({ fence: { ...design.fence, gap: v } })}
            />
            <NumberField
              label="Tinggi pagar"
              value={design.fence.height}
              min={50}
              max={400}
              idPrefix={idPrefix}
              onChange={(v) => set({ fence: { ...design.fence, height: v } })}
            />
          </div>
        </>
      ),
    },
    {
      id: '07',
      index: '07',
      title: 'Catatan desain',
      summary: `${design.notes.length} poin`,
      body: (
        <>
          <textarea
            value={design.notes.join('\n')}
            onChange={(e) => set({ notes: e.target.value.split('\n') })}
            rows={6}
            aria-label="Catatan desain"
            className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-2.5 py-2 text-[11px] leading-relaxed text-[#dfe7dd] outline-none transition focus:border-lime/60 focus:ring-1 focus:ring-lime/20"
          />
          <p className="mt-1 text-[10px] text-mist-2">Satu baris = satu poin catatan yang tampil di bawah model 3D.</p>
        </>
      ),
    },
    {
      id: '08',
      index: '08',
      title: 'Data & reset',
      summary: `${api.versions.length} versi · ekspor · impor`,
      body: (
        <>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={exportJson}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-white/12 bg-white/[0.03] px-2.5 py-2 font-mono-tech text-[9px] uppercase tracking-[0.08em] text-mist transition hover:border-lime/40 hover:text-lime"
            >
              <Download size={10} /> Ekspor
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-white/12 bg-white/[0.03] px-2.5 py-2 font-mono-tech text-[9px] uppercase tracking-[0.08em] text-mist transition hover:border-lime/40 hover:text-lime"
            >
              <Upload size={10} /> Impor
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (confirm('Kembalikan BEFORE & AFTER ke data survey awal? Semua perubahan yang belum disimpan sebagai versi akan hilang.'))
                api.reset();
            }}
            className="mt-2 w-full rounded-full border border-white/10 px-2.5 py-2 font-mono-tech text-[9px] uppercase tracking-[0.08em] text-mist-2 transition hover:border-rust/40 hover:text-rust"
          >
            Reset semua varian
          </button>
          <p className="mt-2 text-[10px] leading-snug text-mist-2">
            Data tersimpan di browser ini. Gunakan ekspor JSON untuk cadangan atau pindah perangkat.
          </p>
        </>
      ),
    },
  ];

  const isDock = surface === 'dock';

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden border border-white/10 bg-[#0e1618]/95',
        isDock
          ? 'h-full max-h-full rounded-xl shadow-[0_30px_80px_-30px_rgba(0,0,0,1)] backdrop-blur-xl'
          : 'no-scrollbar max-h-[76vh] overflow-y-auto rounded-2xl xl:max-h-[calc(100vh-7rem)]',
      )}
    >
      {/* header panel */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.08] bg-[#0e1618]/95 px-3.5 py-2.5 backdrop-blur">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-lime/25 bg-lime/10 text-lime">
            <PencilRuler size={13} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-medium text-[#e5ece1]">Edit ukuran</p>
            <p className="truncate font-mono-tech text-[8px] uppercase tracking-[0.12em] text-mist-2">
              live · denah + 3d · autosave
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setAllOpen((value) => !value)}
            title={allOpen ? 'Tampilkan satu bagian saja' : 'Buka semua bagian'}
            className={cn(
              'rounded-full border px-2 py-1 font-mono-tech text-[8px] uppercase tracking-[0.06em] transition',
              allOpen
                ? 'border-lime/30 bg-lime/10 text-lime'
                : 'border-white/10 text-mist-2 hover:border-lime/40 hover:text-lime',
            )}
          >
            {allOpen ? 'fokus' : 'semua'}
          </button>
          <ResetButton
            onClick={() => {
              if (confirm(`Kembalikan desain ${variant.toUpperCase()} ke data survey awal?`)) api.reset(variant);
            }}
            label="Default"
          />
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Sembunyikan panel editor"
              className="rounded-full p-1.5 text-mist-2 transition hover:bg-white/10 hover:text-white"
            >
              <X size={13} />
            </button>
          ) : null}
        </div>
      </div>

      {/* ringkasan + navigasi bagian */}
      <div className="shrink-0 border-b border-white/[0.07] px-3.5 py-2.5">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-white/[0.07] bg-black/25 px-2.5 py-1.5">
            <span className="font-mono-tech text-[7.5px] uppercase tracking-[0.08em] text-mist-2">footprint</span>
            <p className="mt-0.5 font-mono-tech text-[10.5px] text-[#dfe7dd]">
              {g.totalWidth} × {g.depth} cm
            </p>
          </div>
          <div className="rounded-lg border border-white/[0.07] bg-black/25 px-2.5 py-1.5">
            <span className="font-mono-tech text-[7.5px] uppercase tracking-[0.08em] text-mist-2">luas lantai</span>
            <p className="mt-0.5 font-mono-tech text-[10.5px] text-[#dfe7dd]">{g.floorArea.toFixed(2)} m²</p>
          </div>
        </div>

        <div className="mt-2 flex gap-1 overflow-x-auto no-scrollbar">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              title={section.title}
              onClick={() => {
                setAllOpen(false);
                setOpenSection(section.id);
              }}
              className={cn(
                'shrink-0 rounded-md border px-1.5 py-1 font-mono-tech text-[8.5px] transition',
                !allOpen && openSection === section.id
                  ? 'border-lime/40 bg-lime/15 text-lime'
                  : 'border-white/10 bg-white/[0.02] text-mist-2 hover:border-white/25 hover:text-white',
              )}
            >
              {section.index}
            </button>
          ))}
          <span className="ml-auto shrink-0 self-center font-mono-tech text-[8px] uppercase tracking-[0.06em] text-mist-2">
            {allOpen ? 'semua terbuka' : `bagian ${openSection || '—'} / 08`}
          </span>
        </div>
      </div>

      {/* daftar bagian — hanya yang dipilih yang terbuka */}
      <div className={cn('min-h-0 flex-1 overflow-y-auto no-scrollbar', !isDock && 'contents')}>
        {sections.map((section, index) => (
          <SectionShell
            key={section.id}
            index={section.index}
            title={section.title}
            summary={section.summary}
            open={isOpen(section.id)}
            onToggle={() => toggle(section.id)}
            isLast={index === sections.length - 1}
          >
            {section.body}
          </SectionShell>
        ))}
      </div>

      {/* navigasi bagian sebelumnya / berikutnya */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-white/[0.08] bg-[#0a1214] px-3 py-2">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={allOpen || openIndex <= 0}
          className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 font-mono-tech text-[8px] uppercase tracking-[0.06em] text-mist-2 transition hover:border-lime/40 hover:text-lime disabled:opacity-35 disabled:hover:border-white/10 disabled:hover:text-mist-2"
        >
          <ChevronLeft size={10} /> sebelumnya
        </button>
        <span className="font-mono-tech text-[8px] uppercase tracking-[0.06em] text-mist-2">
          {allOpen ? '8 bagian' : `${openSection || '01'} / 08`}
        </span>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={allOpen || openIndex >= SECTION_KEYS.length - 1}
          className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 font-mono-tech text-[8px] uppercase tracking-[0.06em] text-mist-2 transition hover:border-lime/40 hover:text-lime disabled:opacity-35 disabled:hover:border-white/10 disabled:hover:text-mist-2"
        >
          berikutnya <ChevronRight size={10} />
        </button>
      </div>
    </div>
  );
}
