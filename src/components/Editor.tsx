import { useState } from 'react';
import type { Design, Variant, WallMaterial, WallSide } from '../types';
import type { DesignsApi } from '../hooks/useDesigns';
import { MATERIAL_LABEL } from '../data/defaults';
import { derive } from '../lib/geometry';

function NumField({
  label,
  value,
  onChange,
  min = 0,
  max = 5000,
  step = 5,
  unit = 'cm',
  className = '',
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-0.5 ${className}`}>
      <span className="text-[11px] uppercase tracking-wide text-slate-500">{label}</span>
      <span className="flex items-center rounded-md border border-slate-300 bg-white focus-within:ring-2 focus-within:ring-blue-500">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (!Number.isNaN(v)) onChange(v);
          }}
          className="w-full min-w-0 bg-transparent px-2 py-1.5 text-sm font-mono text-slate-900 outline-none"
        />
        <span className="pr-2 text-[11px] text-slate-400">{unit}</span>
      </span>
    </label>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-wide text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
    >
      <span>{label}</span>
      <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${checked ? 'bg-blue-600' : 'bg-slate-300'}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </span>
    </button>
  );
}

function Section({ title, badge, children, defaultOpen = true }: { title: string; badge?: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-3 py-2 text-left">
        <span className="text-sm font-semibold text-slate-800">{title}</span>
        <span className="flex items-center gap-2">
          {badge && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{badge}</span>}
          <svg className={`h-4 w-4 text-slate-500 transition ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </span>
      </button>
      {open && <div className="space-y-2 border-t border-slate-200 p-3">{children}</div>}
    </div>
  );
}

const MATERIALS: { value: WallMaterial; label: string }[] = (['spandek', 'triplek', 'bata'] as WallMaterial[]).map((m) => ({ value: m, label: MATERIAL_LABEL[m] }));
const WALLS: { value: WallSide; label: string }[] = [
  { value: 'front', label: 'Depan' },
  { value: 'back', label: 'Belakang' },
  { value: 'left', label: 'Kiri' },
  { value: 'right', label: 'Kanan' },
];

export function Editor({
  variant,
  design,
  api,
  selectedId,
  onSelect,
}: {
  variant: Variant;
  design: Design;
  api: DesignsApi;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const g = derive(design);
  const set = (p: Partial<Design>) => api.patch(variant, p);
  const upd = (fn: (d: Design) => Design) => api.update(variant, fn);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(api.designs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rumah-genset-desain.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        api.importJson(String(reader.result));
      } catch (e) {
        alert('File tidak valid: ' + (e as Error).message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">Editor — {variant === 'before' ? 'BEFORE' : 'AFTER'}</h3>
        <div className="flex gap-1">
          <button type="button" onClick={() => api.reset(variant)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50" title="Kembalikan ke data survey">
            Reset
          </button>
          <button type="button" onClick={exportJson} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50">
            Export
          </button>
          <label className="cursor-pointer rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50">
            Import
            <input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
          </label>
        </div>
      </div>

      <label className="flex flex-col gap-0.5">
        <span className="text-[11px] uppercase tracking-wide text-slate-500">Judul</span>
        <input value={design.title} onChange={(e) => set({ title: e.target.value })} className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500" />
      </label>

      <Section title="Bangunan Utama" badge={`${g.totalWidth} × ${g.depth} cm`}>
        <div className="grid grid-cols-2 gap-2">
          <NumField label="Lebar utama" value={design.width} onChange={(v) => set({ width: Math.max(100, v) })} />
          <NumField label="Panjang" value={design.depth} onChange={(v) => set({ depth: Math.max(100, v) })} />
          <NumField label="Tinggi dinding" value={design.wallHeight} onChange={(v) => set({ wallHeight: Math.max(150, v) })} />
          <NumField label="Tinggi naik atap" value={design.roofRise} onChange={(v) => set({ roofRise: Math.max(20, v) })} />
          <NumField label="Tritisan (overhang)" value={design.overhang} onChange={(v) => set({ overhang: Math.max(0, v) })} />
          <SelectField label="Material dinding" value={design.wallMaterial} options={MATERIALS} onChange={(v) => set({ wallMaterial: v })} />
        </div>
        <p className="text-[11px] text-slate-500">
          Kemiringan atap ≈ {g.pitchDeg.toFixed(1)}° • Tinggi bubungan {g.ridgeH} cm • Tinggi tritisan {Math.round(g.eaveH)} cm
        </p>
      </Section>

      <Section title="Perluasan (Ekstensi Sisi Kiri)" badge={design.extension.enabled ? `+${design.extension.width} cm` : 'nonaktif'}>
        <Toggle label="Aktifkan perluasan ke area pagar" checked={design.extension.enabled} onChange={(v) => api.setExtensionEnabled(variant, v)} />
        <div className="grid grid-cols-2 gap-2">
          <NumField label="Lebar perluasan" value={design.extension.width} onChange={(v) => api.setExtensionWidth(variant, Math.max(30, v))} />
          <NumField label="Tinggi dinding ekst." value={design.extension.wallHeight} onChange={(v) => set({ extension: { ...design.extension, wallHeight: Math.max(150, v) } })} />
          <SelectField label="Material dinding ekst." value={design.extension.material} options={MATERIALS} onChange={(v) => set({ extension: { ...design.extension, material: v } })} />
        </div>
      </Section>

      <Section title="Tiang / Kolom" badge={`${design.columns.length} bh`}>
        <div className="space-y-1.5">
          <div className="grid grid-cols-[1fr_64px_64px_52px_24px] gap-1 text-[10px] uppercase tracking-wide text-slate-500">
            <span>Label</span>
            <span>X</span>
            <span>Z</span>
            <span>Ukuran</span>
            <span />
          </div>
          {design.columns.map((c) => (
            <div
              key={c.id}
              className={`grid grid-cols-[1fr_64px_64px_52px_24px] items-center gap-1 rounded-md p-1 ${selectedId === c.id ? 'bg-blue-50 ring-1 ring-blue-300' : ''}`}
              onClick={() => onSelect(c.id)}
            >
              <input
                value={c.label}
                onChange={(e) => upd((d) => ({ ...d, columns: d.columns.map((x) => (x.id === c.id ? { ...x, label: e.target.value } : x)) }))}
                className={`min-w-0 rounded border border-slate-200 px-1.5 py-1 text-xs ${c.isNew ? 'text-red-700 font-semibold' : 'text-slate-800'}`}
              />
              <input type="number" step={5} value={c.x} onChange={(e) => upd((d) => ({ ...d, columns: d.columns.map((x) => (x.id === c.id ? { ...x, x: Number(e.target.value) } : x)) }))} className="rounded border border-slate-200 px-1 py-1 text-xs font-mono" />
              <input type="number" step={5} value={c.z} onChange={(e) => upd((d) => ({ ...d, columns: d.columns.map((x) => (x.id === c.id ? { ...x, z: Number(e.target.value) } : x)) }))} className="rounded border border-slate-200 px-1 py-1 text-xs font-mono" />
              <input type="number" step={5} value={c.size} onChange={(e) => upd((d) => ({ ...d, columns: d.columns.map((x) => (x.id === c.id ? { ...x, size: Math.max(10, Number(e.target.value)) } : x)) }))} className="rounded border border-slate-200 px-1 py-1 text-xs font-mono" />
              <button type="button" title="Hapus" onClick={() => upd((d) => ({ ...d, columns: d.columns.filter((x) => x.id !== c.id) }))} className="text-slate-400 hover:text-red-600">
                ×
              </button>
            </div>
          ))}
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() =>
                upd((d) => ({
                  ...d,
                  columns: [...d.columns, { id: 'k' + Date.now(), label: `K${d.columns.length + 1}`, x: Math.round(g.totalWidth / 2), z: Math.round(g.depth / 2), size: 30, isNew: true }],
                }))
              }
              className="rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white hover:bg-slate-700"
            >
              + Tambah tiang baru
            </button>
            <span className="self-center text-[10px] text-slate-500">X/Z = titik as tiang (cm) dari sudut kiri-belakang. Bisa juga di-drag pada denah.</span>
          </div>
        </div>
      </Section>

      <Section title="Genset" badge={`${design.gensets.length} unit`}>
        <div className="space-y-2">
          {design.gensets.map((gs) => (
            <div key={gs.id} className={`space-y-1.5 rounded-md border p-2 ${selectedId === gs.id ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'}`} onClick={() => onSelect(gs.id)}>
              <div className="flex items-center gap-2">
                <input type="color" value={gs.color} onChange={(e) => upd((d) => ({ ...d, gensets: d.gensets.map((x) => (x.id === gs.id ? { ...x, color: e.target.value } : x)) }))} className="h-7 w-8 cursor-pointer rounded border border-slate-200" />
                <input value={gs.label} onChange={(e) => upd((d) => ({ ...d, gensets: d.gensets.map((x) => (x.id === gs.id ? { ...x, label: e.target.value } : x)) }))} className="min-w-0 flex-1 rounded border border-slate-200 px-1.5 py-1 text-xs font-semibold" />
                <button type="button" onClick={() => upd((d) => ({ ...d, gensets: d.gensets.filter((x) => x.id !== gs.id) }))} className="text-slate-400 hover:text-red-600">
                  ×
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <NumField label="X (kiri)" value={gs.x} onChange={(v) => upd((d) => ({ ...d, gensets: d.gensets.map((x) => (x.id === gs.id ? { ...x, x: v } : x)) }))} />
                <NumField label="Z (belakang)" value={gs.z} onChange={(v) => upd((d) => ({ ...d, gensets: d.gensets.map((x) => (x.id === gs.id ? { ...x, z: v } : x)) }))} />
                <NumField label="Pondasi" value={gs.foundationH} onChange={(v) => upd((d) => ({ ...d, gensets: d.gensets.map((x) => (x.id === gs.id ? { ...x, foundationH: Math.max(0, v) } : x)) }))} />
                <NumField label="Lebar (X)" value={gs.w} onChange={(v) => upd((d) => ({ ...d, gensets: d.gensets.map((x) => (x.id === gs.id ? { ...x, w: Math.max(20, v) } : x)) }))} />
                <NumField label="Panjang (Z)" value={gs.d} onChange={(v) => upd((d) => ({ ...d, gensets: d.gensets.map((x) => (x.id === gs.id ? { ...x, d: Math.max(20, v) } : x)) }))} />
                <NumField label="Tinggi" value={gs.h} onChange={(v) => upd((d) => ({ ...d, gensets: d.gensets.map((x) => (x.id === gs.id ? { ...x, h: Math.max(20, v) } : x)) }))} />
              </div>
              <p className="text-[10px] text-slate-500">
                Jarak ke dinding: kiri {gs.x} • kanan {g.totalWidth - gs.x - gs.w} • belakang {gs.z} • depan {g.depth - gs.z - gs.d} cm
              </p>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              upd((d) => ({
                ...d,
                gensets: [...d.gensets, { id: 'g' + Date.now(), label: 'Genset Tambahan', x: 50, z: 100, w: 120, d: 300, h: 180, foundationH: 30, color: '#f59e0b', isNew: true }],
              }))
            }
            className="rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white hover:bg-slate-700"
          >
            + Tambah genset
          </button>
        </div>
      </Section>

      <Section title="Pintu" badge={`${design.door.width} × ${design.door.height}`}>
        <div className="grid grid-cols-2 gap-2">
          <SelectField label="Dinding" value={design.door.wall} options={WALLS} onChange={(v) => set({ door: { ...design.door, wall: v } })} />
          <NumField label="Posisi (offset)" value={design.door.offset} onChange={(v) => set({ door: { ...design.door, offset: Math.max(0, v) } })} />
          <NumField label="Lebar" value={design.door.width} onChange={(v) => set({ door: { ...design.door, width: Math.max(60, v) } })} />
          <NumField label="Tinggi" value={design.door.height} onChange={(v) => set({ door: { ...design.door, height: Math.max(150, v) } })} />
        </div>
      </Section>

      <Section title="Pagar" badge={design.fence.visible ? `jarak ${design.fence.gap} cm` : 'disembunyikan'}>
        <Toggle label="Tampilkan pagar" checked={design.fence.visible} onChange={(v) => set({ fence: { ...design.fence, visible: v } })} />
        <div className="grid grid-cols-2 gap-2">
          <NumField label="Jarak dari dinding kiri" value={design.fence.gap} onChange={(v) => set({ fence: { ...design.fence, gap: Math.max(0, v) } })} />
          <NumField label="Tinggi pagar" value={design.fence.height} onChange={(v) => set({ fence: { ...design.fence, height: Math.max(50, v) } })} />
        </div>
      </Section>

      <Section title="Catatan Desain" defaultOpen={false}>
        <textarea
          value={design.notes.join('\n')}
          onChange={(e) => set({ notes: e.target.value.split('\n') })}
          rows={5}
          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </Section>
    </div>
  );
}
