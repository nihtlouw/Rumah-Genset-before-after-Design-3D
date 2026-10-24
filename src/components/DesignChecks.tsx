import { ShieldCheck } from 'lucide-react';
import { derive } from '../lib/geometry';
import type { Design } from '../types';
import { CheckLine } from './ui';
import { cn } from '../utils/cn';

type Level = 'error' | 'warn' | 'ok';

export interface CheckItem {
  level: Level;
  text: string;
}

/**
 * Pemeriksaan otomatis sederhana terhadap desain yang sedang dibuka.
 * Tujuannya supaya pengguna langsung tahu kalau ada ukuran yang tidak masuk akal
 * (pintu keluar dinding, genset menembus atap, dll) tanpa harus menghitung manual.
 */
export function checkDesign(d: Design): CheckItem[] {
  const g = derive(d);
  const items: CheckItem[] = [];

  // ---------------- pintu ----------------
  const wallLen = d.door.wall === 'front' || d.door.wall === 'back' ? g.totalWidth : g.depth;
  const doorEnd = d.door.offset + d.door.width;
  if (doorEnd > wallLen + 0.5) {
    items.push({
      level: 'error',
      text: `Pintu melewati batas dinding: ujung pintu ${Math.round(doorEnd)} cm, panjang dinding ${wallLen} cm. Geser posisi pintu atau kurangi lebarnya.`,
    });
  }
  const doorWallH =
    d.door.wall === 'left'
      ? g.canopy
        ? g.canopy.wallH
        : g.wallH
      : g.canopy && d.door.offset < g.ext
        ? Math.min(g.canopy.wallH, g.wallH)
        : g.wallH;
  if (d.door.height > doorWallH - 10) {
    items.push({
      level: 'warn',
      text: `Tinggi pintu ${d.door.height} cm hampir menyentuh balok atas (dinding ${Math.round(doorWallH)} cm). Sisakan minimal 10–20 cm untuk kusen.`,
    });
  }

  // ---------------- tiang ----------------
  d.columns.forEach((c) => {
    if (
      c.x - c.size / 2 < -0.5 ||
      c.x + c.size / 2 > g.totalWidth + 0.5 ||
      c.z - c.size / 2 < -0.5 ||
      c.z + c.size / 2 > g.depth + 0.5
    ) {
      items.push({ level: 'warn', text: `Tiang ${c.label} berada di luar denah bangunan (${c.x}, ${c.z}).` });
    }
  });

  // ---------------- genset ----------------
  d.gensets.forEach((gs) => {
    if (gs.x < -0.5 || gs.x + gs.w > g.totalWidth + 0.5 || gs.z < -0.5 || gs.z + gs.d > g.depth + 0.5) {
      items.push({
        level: 'error',
        text: `${gs.label} keluar dari batas bangunan (${gs.x}–${gs.x + gs.w} cm × ${gs.z}–${gs.z + gs.d} cm).`,
      });
    }

    const top = gs.foundationH + gs.h;
    const cx = gs.x + gs.w / 2;
    let roofTop: number | null = null;
    if (g.canopy && cx < g.ext) roofTop = g.canopy.y;
    else if (cx >= g.mainX0 && cx <= g.mainX1)
      roofTop = g.ridgeH - Math.abs(cx - (g.mainX0 + g.mainX1) / 2) * Math.tan(g.pitch);

    if (roofTop !== null) {
      const clearance = roofTop - top;
      if (clearance < 0) {
        items.push({
          level: 'error',
          text: `${gs.label} menembus atap: tinggi total ${top} cm (termasuk pondasi) sedangkan atap di atasnya ${Math.round(roofTop)} cm.`,
        });
      } else if (clearance < 10) {
        items.push({
          level: 'warn',
          text: `${gs.label} hanya punya ruang bebas ${Math.round(clearance)} cm ke atap — terlalu mepet. Turunkan tinggi genset atau pondasinya.`,
        });
      } else if (clearance < 30) {
        items.push({
          level: 'ok',
          text: `${gs.label}: ruang bebas ${Math.round(clearance)} cm ke atap (total tinggi ${top} cm vs atap ${Math.round(roofTop)} cm). Pastikan tinggi genset final tidak melebihi angka ini.`,
        });
      }
    }
  });

  // genset saling bertumpuk
  for (let i = 0; i < d.gensets.length; i += 1) {
    for (let j = i + 1; j < d.gensets.length; j += 1) {
      const a = d.gensets[i];
      const b = d.gensets[j];
      const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const overlapZ = Math.min(a.z + a.d, b.z + b.d) - Math.max(a.z, b.z);
      if (overlapX > 1 && overlapZ > 1) {
        items.push({
          level: 'error',
          text: `${a.label} dan ${b.label} saling bertumpuk (${Math.round(overlapX)} × ${Math.round(overlapZ)} cm).`,
        });
      }
    }
  }

  // ---------------- atap datar perluasan ----------------
  if (g.canopy) {
    if (g.canopy.capped) {
      items.push({
        level: 'warn',
        text: `Tinggi dinding perluasan dibatasi otomatis menjadi ${Math.round(g.canopy.y)} cm (permintaan ${d.extension.wallHeight} cm) agar atap datar tidak menembus tritisan atap pelana.`,
      });
    }
    if (!g.canopy.capped) {
      items.push({
        level: 'ok',
        text: `Atap perluasan dipasang DATAR di ${Math.round(g.canopy.y)} cm, masih ${Math.round(g.eaveH - g.canopy.y)} cm di bawah tritisan atap pelana (±${Math.round(g.eaveH)} cm) — tidak menembus atap utama.`,
      });
    }
  }

  if (!d.fence.visible) {
    items.push({ level: 'ok', text: 'Pagar disembunyikan dari model (hanya tampilan, tidak mengubah ukuran).' });
  }

  if (!items.some((i) => i.level !== 'ok')) {
    items.unshift({ level: 'ok', text: 'Semua ukuran konsisten — tidak ada elemen yang keluar batas atau bertumpuk.' });
  }

  return items;
}

export function DesignChecks({ design, variant }: { design: Design; variant: string }) {
  const items = checkDesign(design);
  const errors = items.filter((i) => i.level === 'error').length;
  const warns = items.filter((i) => i.level === 'warn').length;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1517] p-4">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.07] pb-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded border border-white/10 bg-white/[0.03] text-mist">
          <ShieldCheck size={11} />
        </span>
        <p className="text-[11px] font-medium text-[#dfe7da]">Pemeriksaan desain</p>
        <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono-tech text-[8px] uppercase tracking-[0.08em] text-mist-2">
          {variant}
        </span>
        <span
          className={cn(
            'ml-auto rounded-full border px-2 py-0.5 font-mono-tech text-[8px] uppercase tracking-[0.08em]',
            errors ? 'border-rust/30 bg-rust/10 text-rust' : 'border-white/10 text-mist-2',
          )}
        >
          {errors} error
        </span>
        <span
          className={cn(
            'rounded-full border px-2 py-0.5 font-mono-tech text-[8px] uppercase tracking-[0.08em]',
            warns ? 'border-amber/30 bg-amber/10 text-amber' : 'border-white/10 text-mist-2',
          )}
        >
          {warns} perhatian
        </span>
      </div>
      <div className="pt-1">
        {items.map((item, index) => (
          <CheckLine key={index} state={item.level}>
            {item.text}
          </CheckLine>
        ))}
      </div>
    </div>
  );
}
