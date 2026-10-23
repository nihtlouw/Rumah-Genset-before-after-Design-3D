import type { Design } from '../../types';
import { derive } from '../../lib/geometry';
import { MATERIAL_COLOR } from '../../data/defaults';
import { Dim, HatchDefs } from './Dim';

const fs = 16;
const Y = (h: number) => -h;

function Frame({
  title,
  subtitle,
  vb,
  children,
}: {
  title: string;
  subtitle?: string;
  vb: { x: number; y: number; w: number; h: number };
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-4 py-2 border-b border-slate-100 flex items-baseline justify-between gap-2">
        <h4 className="font-semibold text-slate-800 text-sm">{title}</h4>
        {subtitle && <span className="text-xs text-slate-500 text-right">{subtitle}</span>}
      </div>
      <svg viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} className="w-full h-auto" style={{ aspectRatio: `${vb.w} / ${vb.h}` }}>
        <HatchDefs />
        {children}
      </svg>
    </div>
  );
}

function Ground({ x0, x1 }: { x0: number; x1: number }) {
  return (
    <g>
      <line x1={x0} y1={0} x2={x1} y2={0} stroke="#0f172a" strokeWidth={3} />
      <rect x={x0} y={0} width={x1 - x0} height={30} fill="url(#hatchLight)" />
    </g>
  );
}

/** horizontal dimension that always keeps positive offset = below (sorts x) */
function HDim(p: { xa: number; xb: number; y: number; offset: number; label: string; fontSize?: number; color?: string; dashed?: boolean }) {
  const x1 = Math.min(p.xa, p.xb);
  const x2 = Math.max(p.xa, p.xb);
  return <Dim x1={x1} y1={p.y} x2={x2} y2={p.y} offset={p.offset} label={p.label} fontSize={p.fontSize} color={p.color} dashed={p.dashed} />;
}

function Truss({ x0, x1, wallH, ridgeH, overhang, eaveH, thick = 10 }: { x0: number; x1: number; wallH: number; ridgeH: number; overhang: number; eaveH: number; thick?: number }) {
  const cx = (x0 + x1) / 2;
  return (
    <g>
      <polyline points={`${x0 - overhang},${Y(eaveH)} ${cx},${Y(ridgeH)} ${x1 + overhang},${Y(eaveH)}`} fill="none" stroke="#334155" strokeWidth={thick} strokeLinejoin="miter" />
      <polyline points={`${x0 - overhang},${Y(eaveH)} ${cx},${Y(ridgeH)} ${x1 + overhang},${Y(eaveH)}`} fill="none" stroke="#94a3b8" strokeWidth={thick - 5} strokeLinejoin="miter" />
      <line x1={x0} y1={Y(wallH)} x2={x1} y2={Y(wallH)} stroke="#1d4ed8" strokeWidth={6} />
      <line x1={cx} y1={Y(wallH)} x2={cx} y2={Y(ridgeH - 8)} stroke="#1d4ed8" strokeWidth={4} />
      {[0.25, 0.75].map((t) => {
        const x = x0 + (x1 - x0) * t;
        const yTop = wallH + (ridgeH - wallH) * (1 - Math.abs(t - 0.5) * 2) - 6;
        return (
          <g key={t}>
            <line x1={x} y1={Y(wallH)} x2={x} y2={Y(yTop)} stroke="#1d4ed8" strokeWidth={3} />
            <line x1={x} y1={Y(wallH)} x2={cx} y2={Y(ridgeH - 8)} stroke="#1d4ed8" strokeWidth={2} />
          </g>
        );
      })}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* FACADE (depan / belakang)                                           */
/* ------------------------------------------------------------------ */
function FacadeElevation({ design, view }: { design: Design; view: 'front' | 'back' }) {
  const g = derive(design);
  const d = design;
  const W = g.totalWidth;
  const mir = view === 'back';
  const M = (x: number) => (mir ? W - x : x);
  const R = (x: number, w: number) => (mir ? W - x - w : x);
  const sgn = mir ? -1 : 1; // side for vertical dims: right (front) / left (back)
  const dimX = mir ? 0 : W;
  const gap = d.fence.visible ? d.fence.gap : 0;
  const fenceX = M(-gap);
  const padFence = Math.max(200, gap + 170);
  const padL = mir ? 230 : padFence;
  const padR = mir ? padFence + 20 : 230;
  const vb = { x: -padL, y: Y(g.ridgeH + 110), w: W + padL + padR, h: g.ridgeH + 110 + 120 };
  const faceCols = d.columns.filter((c) => (view === 'front' ? c.z > g.depth - 100 : c.z < 100));
  const mainColor = MATERIAL_COLOR[d.wallMaterial];
  const extColor = MATERIAL_COLOR[d.extension.material];
  const extH = Math.min(d.extension.wallHeight, d.wallHeight);
  const mainX = R(g.mainX0, d.width);
  const door = d.door;
  const hasDoor = door.wall === view;
  const doorX = R(door.offset, door.width);

  return (
    <Frame title={view === 'front' ? 'TAMPAK DEPAN' : 'TAMPAK BELAKANG'} subtitle={`${d.title}${mir ? ' • (perluasan tampak di kanan)' : ''}`} vb={vb}>
      <rect x={mainX} y={Y(g.wallH)} width={d.width} height={g.wallH} fill={mainColor} stroke="#0f172a" strokeWidth={2} />
      {Array.from({ length: Math.floor(d.width / 90) }, (_, i) => (
        <line key={i} x1={mainX + (i + 1) * 90} y1={Y(g.wallH)} x2={mainX + (i + 1) * 90} y2={0} stroke="#0f172a" strokeWidth={0.6} opacity={0.35} />
      ))}
      {d.extension.enabled && g.leanTo && (
        <g>
          <rect x={R(0, g.ext)} y={Y(extH)} width={g.ext} height={extH} fill={extColor} stroke="#b91c1c" strokeWidth={2} />
          <rect x={R(0, g.ext)} y={Y(extH)} width={g.ext} height={extH} fill="url(#hatchNew)" opacity={0.18} />
          <line x1={M(g.leanTo.xLow)} y1={Y(g.leanTo.yLow)} x2={M(g.leanTo.xHigh)} y2={Y(g.leanTo.yHigh)} stroke="#334155" strokeWidth={9} />
          <line x1={M(g.leanTo.xLow)} y1={Y(g.leanTo.yLow)} x2={M(g.leanTo.xHigh)} y2={Y(g.leanTo.yHigh)} stroke="#94a3b8" strokeWidth={4} />
          <text x={M(g.ext / 2)} y={Y(extH / 2)} fontSize={fs - 4} fill="#7f1d1d" textAnchor="middle" fontWeight={700} transform={`rotate(-90 ${M(g.ext / 2)} ${Y(extH / 2)})`}>
            PERLUASAN {g.ext} cm
          </text>
        </g>
      )}
      {faceCols.map((c) => {
        const h = c.x < g.ext && d.extension.enabled ? extH : g.wallH;
        return <rect key={c.id} x={R(c.x - c.size / 2, c.size)} y={Y(h)} width={c.size} height={h} fill={c.isNew ? '#9ca3af' : '#1d4ed8'} stroke="#0f172a" strokeWidth={1} />;
      })}
      <Truss x0={mainX} x1={mainX + d.width} wallH={g.wallH} ridgeH={g.ridgeH} overhang={d.overhang} eaveH={g.eaveH} />
      {hasDoor && (
        <g>
          <rect x={doorX} y={Y(door.height)} width={door.width} height={door.height} fill="#7c4a2d" stroke="#0f172a" strokeWidth={1.5} />
          <circle cx={doorX + (mir ? 14 : door.width - 14)} cy={Y(door.height / 2)} r={3} fill="#fbbf24" />
          <text x={doorX + door.width / 2} y={Y(door.height + 10)} fontSize={fs - 5} textAnchor="middle" fill="#7c2d12" fontWeight={700}>
            PINTU
          </text>
        </g>
      )}
      {d.fence.visible && (
        <g>
          <rect x={fenceX - 4} y={Y(d.fence.height)} width={8} height={d.fence.height} fill="#334155" />
          <text x={fenceX} y={Y(d.fence.height + 10)} fontSize={fs - 5} textAnchor="middle" fill="#334155">
            PAGAR
          </text>
        </g>
      )}
      <Ground x0={vb.x + 20} x1={vb.x + vb.w - 20} />

      {/* dims */}
      <HDim xa={0} xb={W} y={0} offset={72} label={`${W} cm`} fontSize={fs} />
      {d.extension.enabled && (
        <>
          <HDim xa={M(0)} xb={M(g.ext)} y={0} offset={42} label={`${g.ext}`} fontSize={fs - 3} color="#b45309" />
          <HDim xa={M(g.ext)} xb={M(W)} y={0} offset={42} label={`${d.width}`} fontSize={fs - 3} />
        </>
      )}
      {hasDoor && <HDim xa={doorX} xb={doorX + door.width} y={0} offset={16} label={`${door.width}`} fontSize={fs - 5} color="#7c2d12" />}
      <Dim x1={dimX} y1={0} x2={dimX} y2={Y(g.wallH)} offset={sgn * 60} label={`${g.wallH}`} fontSize={fs - 2} />
      <Dim x1={dimX} y1={0} x2={dimX} y2={Y(g.ridgeH)} offset={sgn * 150} label={`${g.ridgeH}`} fontSize={fs - 2} />
      <Dim x1={M(g.mainX1 + d.overhang)} y1={Y(g.eaveH)} x2={M(g.mainX1 + d.overhang)} y2={Y(g.ridgeH)} offset={sgn * (100 - d.overhang)} label={`${Math.round(g.ridgeH - g.eaveH)}`} fontSize={fs - 5} color="#475569" />
      <HDim xa={M(g.mainX1)} xb={M(g.mainX1 + d.overhang)} y={Y(g.eaveH)} offset={-65} label={`${d.overhang}`} fontSize={fs - 5} color="#475569" />
      {hasDoor && <Dim x1={doorX + door.width} y1={0} x2={doorX + door.width} y2={Y(door.height)} offset={25} label={`${door.height}`} fontSize={fs - 5} color="#7c2d12" />}
      {d.extension.enabled && <Dim x1={M(0)} y1={0} x2={M(0)} y2={Y(extH)} offset={-sgn * (gap + 50)} label={`${extH}`} fontSize={fs - 3} color="#b45309" />}
      {d.fence.visible && gap > 0 && <HDim xa={fenceX} xb={M(0)} y={0} offset={42} label={`${gap}`} fontSize={fs - 4} color="#334155" />}
      <text x={mainX + d.width / 2} y={Y(g.ridgeH + 60)} fontSize={fs - 3} textAnchor="middle" fill="#475569">
        Atap pelana, kemiringan ±{g.pitchDeg.toFixed(0)}° • rangka baja biru • penutup spandek
      </text>
      <text x={-padL + 30} y={-12} fontSize={fs - 4} fill="#64748b">
        {mir ? 'KANAN' : 'KIRI'}
      </text>
      <text x={W + padR - 30} y={-12} fontSize={fs - 4} fill="#64748b" textAnchor="end">
        {mir ? 'KIRI' : 'KANAN'}
      </text>
    </Frame>
  );
}

export function FrontElevation({ design }: { design: Design }) {
  return <FacadeElevation design={design} view="front" />;
}
export function BackElevation({ design }: { design: Design }) {
  return <FacadeElevation design={design} view="back" />;
}

/* ------------------------------------------------------------------ */
/* SIDE (kiri / kanan)                                                 */
/* ------------------------------------------------------------------ */
function SideElevation({ design, view }: { design: Design; view: 'left' | 'right' }) {
  const g = derive(design);
  const d = design;
  const D = g.depth;
  const mir = view === 'right'; // dari kanan: depan tampak di kiri gambar
  const M = (z: number) => (mir ? D - z : z);
  const R = (z: number, w: number) => (mir ? D - z - w : z);
  const vb = { x: -200, y: Y(g.ridgeH + 90), w: D + 420, h: g.ridgeH + 90 + 110 };
  const isExtSide = view === 'left' && d.extension.enabled;
  const wallH = isExtSide ? Math.min(d.extension.wallHeight, d.wallHeight) : g.wallH;
  const color = isExtSide ? MATERIAL_COLOR[d.extension.material] : MATERIAL_COLOR[d.wallMaterial];
  const cols = d.columns.filter((c) => (view === 'left' ? c.x < 100 : c.x > g.totalWidth - 100));
  const showFence = view === 'left' && d.fence.visible;
  const door = d.door;
  const hasDoor = door.wall === view;
  const roofX = Math.min(M(g.roofZ0), M(g.roofZ1));

  return (
    <Frame
      title={view === 'left' ? 'TAMPAK SAMPING KIRI (sisi pagar)' : 'TAMPAK SAMPING KANAN'}
      subtitle={mir ? 'kiri = depan, kanan = belakang' : 'kiri = belakang, kanan = depan'}
      vb={vb}
    >
      <rect x={roofX} y={Y(g.ridgeH)} width={g.roofZ1 - g.roofZ0} height={g.ridgeH - g.eaveH} fill="#cbd5e1" stroke="#334155" strokeWidth={2} />
      <rect x={roofX} y={Y(g.ridgeH)} width={g.roofZ1 - g.roofZ0} height={g.ridgeH - g.eaveH} fill="url(#roofHatch)" opacity={0.6} />
      <line x1={roofX} y1={Y(g.ridgeH)} x2={roofX + (g.roofZ1 - g.roofZ0)} y2={Y(g.ridgeH)} stroke="#0f172a" strokeWidth={4} />
      <rect x={0} y={Y(wallH)} width={D} height={wallH} fill={color} stroke={isExtSide ? '#b91c1c' : '#0f172a'} strokeWidth={2} />
      {Array.from({ length: Math.floor(D / 90) }, (_, i) => (
        <line key={i} x1={(i + 1) * 90} y1={Y(wallH)} x2={(i + 1) * 90} y2={0} stroke="#0f172a" strokeWidth={0.6} opacity={0.35} />
      ))}
      {cols.map((c) => (
        <rect key={c.id} x={R(c.z - c.size / 2, c.size)} y={Y(wallH)} width={c.size} height={wallH} fill={c.isNew ? '#9ca3af' : '#1d4ed8'} stroke="#0f172a" />
      ))}
      {isExtSide && g.leanTo && (
        <g>
          <rect x={roofX} y={Y(g.leanTo.yHigh)} width={g.roofZ1 - g.roofZ0} height={g.leanTo.yHigh - g.leanTo.yLow} fill="#cbd5e1" stroke="#334155" strokeWidth={2} />
          <rect x={roofX} y={Y(g.leanTo.yHigh)} width={g.roofZ1 - g.roofZ0} height={g.leanTo.yHigh - g.leanTo.yLow} fill="url(#roofHatch)" opacity={0.6} />
          <text x={D / 2} y={Y((g.leanTo.yHigh + g.leanTo.yLow) / 2 - 5)} fontSize={fs - 5} textAnchor="middle" fill="#1e293b" fontWeight={700}>
            ATAP MIRING PERLUASAN
          </text>
        </g>
      )}
      {hasDoor && <rect x={R(door.offset, door.width)} y={Y(door.height)} width={door.width} height={door.height} fill="#7c4a2d" stroke="#0f172a" />}
      {showFence && (
        <g opacity={0.75}>
          <rect x={0} y={Y(d.fence.height)} width={D} height={d.fence.height} fill="url(#hatchLight)" stroke="#334155" strokeWidth={1.5} />
          {Array.from({ length: Math.floor(D / 150) + 1 }, (_, i) => (
            <rect key={i} x={Math.min(i * 150, D - 6)} y={Y(d.fence.height)} width={6} height={d.fence.height} fill="#334155" />
          ))}
          <text x={D / 2} y={Y(d.fence.height - 20)} fontSize={fs - 4} textAnchor="middle" fill="#0f172a" fontWeight={700}>
            PAGAR BRC (di depan dinding)
          </text>
        </g>
      )}
      <Ground x0={vb.x + 20} x1={vb.x + vb.w - 20} />
      <HDim xa={0} xb={D} y={0} offset={60} label={`${D} cm`} fontSize={fs} />
      <HDim xa={roofX} xb={roofX + (g.roofZ1 - g.roofZ0)} y={0} offset={95} label={`${g.roofZ1 - g.roofZ0} (atap + tritisan)`} fontSize={fs - 4} color="#475569" />
      <Dim x1={D} y1={0} x2={D} y2={Y(wallH)} offset={70} label={`${wallH}`} fontSize={fs - 2} />
      <Dim x1={D} y1={0} x2={D} y2={Y(g.ridgeH)} offset={140} label={`${g.ridgeH}`} fontSize={fs - 2} />
      {showFence && <Dim x1={0} y1={0} x2={0} y2={Y(d.fence.height)} offset={-70} label={`${d.fence.height} (pagar)`} fontSize={fs - 4} color="#334155" />}
      <text x={-20} y={-10} fontSize={fs - 4} fill="#64748b" textAnchor="end">
        {mir ? 'DEPAN' : 'BELAKANG'}
      </text>
      <text x={D + 20} y={-10} fontSize={fs - 4} fill="#64748b">
        {mir ? 'BELAKANG' : 'DEPAN'}
      </text>
    </Frame>
  );
}

export function LeftElevation({ design }: { design: Design }) {
  return <SideElevation design={design} view="left" />;
}
export function RightElevation({ design }: { design: Design }) {
  return <SideElevation design={design} view="right" />;
}

/* ------------------------------------------------------------------ */
/* CROSS SECTION                                                       */
/* ------------------------------------------------------------------ */
export function CrossSection({ design }: { design: Design }) {
  const g = derive(design);
  const d = design;
  const gap = d.fence.visible ? d.fence.gap : 0;
  const fenceX = -gap;
  const padL = Math.max(200, gap + 140);
  const vb = { x: -padL, y: Y(g.ridgeH + 90), w: g.totalWidth + padL + 230, h: g.ridgeH + 90 + 130 };
  const midCols = d.columns.filter((c) => Math.abs(c.z - g.depth / 2) < 120);
  const extH = Math.min(d.extension.wallHeight, d.wallHeight);
  return (
    <Frame title="POTONGAN MELINTANG A-A" subtitle="dipotong di tengah bangunan, dilihat ke arah belakang" vb={vb}>
      <rect x={0} y={0} width={g.totalWidth} height={12} fill="url(#concrete)" stroke="#0f172a" strokeWidth={1} />
      <rect x={-4} y={Y(d.extension.enabled ? extH : g.wallH)} width={8} height={d.extension.enabled ? extH : g.wallH} fill={d.extension.enabled ? '#dc2626' : '#1e293b'} />
      <rect x={g.totalWidth - 4} y={Y(g.wallH)} width={8} height={g.wallH} fill="#1e293b" />
      {d.extension.enabled && <line x1={g.mainX0} y1={0} x2={g.mainX0} y2={Y(g.wallH)} stroke="#f59e0b" strokeWidth={2} strokeDasharray="10 6" />}
      {midCols.map((c) => (
        <g key={c.id}>
          <rect x={c.x - c.size / 2} y={Y(c.x < g.ext ? extH : g.wallH)} width={c.size} height={c.x < g.ext ? extH : g.wallH} fill={c.isNew ? '#9ca3af' : '#1d4ed8'} stroke="#0f172a" />
          <text x={c.x} y={Y(-28)} fontSize={fs - 5} textAnchor="middle" fill={c.isNew ? '#b91c1c' : '#0f172a'} fontWeight={700}>
            {c.label}
          </text>
        </g>
      ))}
      <Truss x0={g.mainX0} x1={g.mainX1} wallH={g.wallH} ridgeH={g.ridgeH} overhang={d.overhang} eaveH={g.eaveH} />
      {g.leanTo && (
        <>
          <line x1={g.leanTo.xLow} y1={Y(g.leanTo.yLow)} x2={g.leanTo.xHigh} y2={Y(g.leanTo.yHigh)} stroke="#334155" strokeWidth={9} />
          <line x1={g.leanTo.xLow} y1={Y(g.leanTo.yLow)} x2={g.leanTo.xHigh} y2={Y(g.leanTo.yHigh)} stroke="#94a3b8" strokeWidth={4} />
        </>
      )}
      {d.gensets.map((gs) => (
        <g key={gs.id}>
          {gs.foundationH > 0 && <rect x={gs.x - 10} y={Y(gs.foundationH)} width={gs.w + 20} height={gs.foundationH} fill="url(#concrete)" stroke="#334155" strokeWidth={1.5} />}
          <rect x={gs.x} y={Y(gs.foundationH + gs.h)} width={gs.w} height={gs.h} fill={gs.color} fillOpacity={0.5} stroke="#0f172a" strokeWidth={1.5} />
          {Array.from({ length: 4 }, (_, i) => (
            <line key={i} x1={gs.x + 10} y1={Y(gs.foundationH + gs.h * (0.3 + i * 0.12))} x2={gs.x + gs.w - 10} y2={Y(gs.foundationH + gs.h * (0.3 + i * 0.12))} stroke="#0f172a" strokeWidth={0.8} opacity={0.5} />
          ))}
          <text x={gs.x + gs.w / 2} y={Y(gs.foundationH + gs.h + 12)} fontSize={fs - 5} textAnchor="middle" fontWeight={700} fill="#0f172a">
            {gs.label}
          </text>
          <Dim x1={gs.x + gs.w} y1={Y(gs.foundationH)} x2={gs.x + gs.w} y2={Y(gs.foundationH + gs.h)} offset={26} label={`${gs.h}`} fontSize={fs - 5} color="#1d4ed8" />
          {gs.foundationH > 0 && <Dim x1={gs.x + gs.w + 10} y1={0} x2={gs.x + gs.w + 10} y2={Y(gs.foundationH)} offset={52} label={`pondasi ${gs.foundationH}`} fontSize={fs - 5} color="#334155" />}
          <HDim xa={gs.x} xb={gs.x + gs.w} y={Y(gs.foundationH + gs.h)} offset={-38} label={`${gs.w}`} fontSize={fs - 5} color="#1d4ed8" />
        </g>
      ))}
      {(() => {
        const sorted = [...d.gensets].sort((a, b) => a.x - b.x);
        const parts: { x1: number; x2: number }[] = [];
        let cur = 0;
        sorted.forEach((gs) => {
          if (gs.x - cur > 1) parts.push({ x1: cur, x2: gs.x });
          cur = gs.x + gs.w;
        });
        if (g.totalWidth - cur > 1) parts.push({ x1: cur, x2: g.totalWidth });
        return parts.map((p, i) => <HDim key={i} xa={p.x1} xb={p.x2} y={0} offset={-28} label={`${Math.round(p.x2 - p.x1)}`} fontSize={fs - 5} color="#64748b" dashed />);
      })()}
      {d.fence.visible && <rect x={fenceX - 4} y={Y(d.fence.height)} width={8} height={d.fence.height} fill="#334155" />}
      <Ground x0={vb.x + 20} x1={vb.x + vb.w - 20} />
      <HDim xa={0} xb={g.totalWidth} y={0} offset={78} label={`${g.totalWidth} cm`} fontSize={fs} />
      {d.extension.enabled && <HDim xa={0} xb={g.ext} y={0} offset={50} label={`${g.ext}`} fontSize={fs - 4} color="#b45309" />}
      <Dim x1={g.totalWidth} y1={0} x2={g.totalWidth} y2={Y(g.wallH)} offset={70} label={`${g.wallH}`} fontSize={fs - 2} />
      <Dim x1={g.totalWidth} y1={0} x2={g.totalWidth} y2={Y(g.ridgeH)} offset={140} label={`${g.ridgeH}`} fontSize={fs - 2} />
      {d.extension.enabled && <Dim x1={0} y1={0} x2={0} y2={Y(extH)} offset={-(gap + 50)} label={`${extH}`} fontSize={fs - 3} color="#b45309" />}
      {d.extension.enabled && g.leanTo && (
        <Dim x1={-10} y1={Y(g.leanTo.yLow)} x2={-10} y2={Y(g.leanTo.yHigh)} offset={-(gap + 100)} label={`${Math.round(g.leanTo.yHigh - g.leanTo.yLow)} (beda tinggi atap)`} fontSize={fs - 5} color="#475569" />
      )}
    </Frame>
  );
}
