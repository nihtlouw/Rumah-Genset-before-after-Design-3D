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
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d1517]">
      <div className="flex items-baseline justify-between gap-2 border-b border-white/[0.08] px-4 py-2.5">
        <h4 className="font-mono-tech text-[9px] uppercase tracking-[0.14em] text-[#dfe7dd]">{title}</h4>
        {subtitle && <span className="text-right font-mono-tech text-[8.5px] uppercase tracking-[0.06em] text-mist-2">{subtitle}</span>}
      </div>
      <div className="bg-paper text-paperink">
        <svg viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} className="h-auto w-full" style={{ aspectRatio: `${vb.w} / ${vb.h}` }}>
          <HatchDefs />
          <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill="#ecece2" />
          {children}
        </svg>
      </div>
    </div>
  );
}

function Ground({ x0, x1 }: { x0: number; x1: number }) {
  return (
    <g>
      <line x1={x0} y1={0} x2={x1} y2={0} stroke="#202a27" strokeWidth={3} />
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
      <polyline points={`${x0 - overhang},${Y(eaveH)} ${cx},${Y(ridgeH)} ${x1 + overhang},${Y(eaveH)}`} fill="none" stroke="#3c4a44" strokeWidth={thick} strokeLinejoin="miter" />
      <polyline points={`${x0 - overhang},${Y(eaveH)} ${cx},${Y(ridgeH)} ${x1 + overhang},${Y(eaveH)}`} fill="none" stroke="#8b9385" strokeWidth={thick - 5} strokeLinejoin="miter" />
      <line x1={x0} y1={Y(wallH)} x2={x1} y2={Y(wallH)} stroke="#2f6f80" strokeWidth={6} />
      <line x1={cx} y1={Y(wallH)} x2={cx} y2={Y(ridgeH - 8)} stroke="#2f6f80" strokeWidth={4} />
      {[0.25, 0.75].map((t) => {
        const x = x0 + (x1 - x0) * t;
        const yTop = wallH + (ridgeH - wallH) * (1 - Math.abs(t - 0.5) * 2) - 6;
        return (
          <g key={t}>
            <line x1={x} y1={Y(wallH)} x2={x} y2={Y(yTop)} stroke="#2f6f80" strokeWidth={3} />
            <line x1={x} y1={Y(wallH)} x2={cx} y2={Y(ridgeH - 8)} stroke="#2f6f80" strokeWidth={2} />
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
  const extH = g.canopy ? g.canopy.wallH : d.wallHeight;
  const mainX = R(g.mainX0, d.width);
  const door = d.door;
  const hasDoor = door.wall === view;
  const doorX = R(door.offset, door.width);

  return (
    <Frame title={view === 'front' ? 'TAMPAK DEPAN' : 'TAMPAK BELAKANG'} subtitle={`${d.title}${mir ? ' • (perluasan tampak di kanan)' : ''}`} vb={vb}>
      <rect x={mainX} y={Y(g.wallH)} width={d.width} height={g.wallH} fill={mainColor} stroke="#202a27" strokeWidth={2} />
      {Array.from({ length: Math.floor(d.width / 90) }, (_, i) => (
        <line key={i} x1={mainX + (i + 1) * 90} y1={Y(g.wallH)} x2={mainX + (i + 1) * 90} y2={0} stroke="#202a27" strokeWidth={0.6} opacity={0.35} />
      ))}
      {d.extension.enabled && g.canopy && (
        <g>
          <rect x={R(0, g.ext)} y={Y(extH)} width={g.ext} height={extH} fill={extColor} stroke="#a8612b" strokeWidth={2} />
          <rect x={R(0, g.ext)} y={Y(extH)} width={g.ext} height={extH} fill="url(#hatchNew)" opacity={0.18} />
          <text x={M(g.ext / 2)} y={Y(extH / 2)} fontSize={fs - 4} fill="#8a4b1f" textAnchor="middle" fontWeight={700} transform={`rotate(-90 ${M(g.ext / 2)} ${Y(extH / 2)})`}>
            PERLUASAN {g.ext} cm
          </text>
          {/* ATAP DATAR: pita horizontal rata, menempel ke dinding utama */}
          <rect
            x={Math.min(M(g.canopy.x0), M(g.canopy.x1))}
            y={Y(g.canopy.y)}
            width={g.canopy.len}
            height={14}
            fill="#c8cbbd"
            stroke="#3c4a44"
            strokeWidth={2.5}
          />
          <rect
            x={Math.min(M(g.canopy.x0), M(g.canopy.x1))}
            y={Y(g.canopy.y)}
            width={g.canopy.len}
            height={14}
            fill="url(#roofHatch)"
            opacity={0.6}
          />
          <text
            x={M((g.canopy.x0 + g.canopy.x1) / 2)}
            y={Y(g.canopy.y) + 14 + fs - 4}
            fontSize={fs - 6}
            fill="#26312b"
            textAnchor="middle"
            fontWeight={700}
            stroke="#ecece2"
            strokeWidth={3}
            paintOrder="stroke"
          >
            ATAP DATAR
          </text>
        </g>
      )}
      {faceCols.map((c) => {
        const h = c.x < g.ext && d.extension.enabled ? extH : g.wallH;
        return <rect key={c.id} x={R(c.x - c.size / 2, c.size)} y={Y(h)} width={c.size} height={h} fill={c.isNew ? '#a8612b' : '#2f6f80'} stroke="#202a27" strokeWidth={1} />;
      })}
      <Truss x0={mainX} x1={mainX + d.width} wallH={g.wallH} ridgeH={g.ridgeH} overhang={d.overhang} eaveH={g.eaveH} />
      {hasDoor && (
        <g>
          <rect x={doorX} y={Y(door.height)} width={door.width} height={door.height} fill="#8a5a33" stroke="#202a27" strokeWidth={1.5} />
          <circle cx={doorX + (mir ? 14 : door.width - 14)} cy={Y(door.height / 2)} r={3} fill="#8a4b1f" />
          <text x={doorX + door.width / 2} y={Y(door.height + 10)} fontSize={fs - 5} textAnchor="middle" fill="#8a4b1f" fontWeight={700}>
            PINTU
          </text>
        </g>
      )}
      {d.fence.visible && (
        <g>
          <rect x={fenceX - 4} y={Y(d.fence.height)} width={8} height={d.fence.height} fill="#3c4a44" />
          <text x={fenceX} y={Y(d.fence.height + 10)} fontSize={fs - 5} textAnchor="middle" fill="#3c4a44">
            PAGAR
          </text>
        </g>
      )}
      <Ground x0={vb.x + 20} x1={vb.x + vb.w - 20} />

      {/* dims */}
      <HDim xa={0} xb={W} y={0} offset={72} label={`${W} cm`} fontSize={fs} />
      {d.extension.enabled && (
        <>
          <HDim xa={M(0)} xb={M(g.ext)} y={0} offset={42} label={`${g.ext}`} fontSize={fs - 3} color="#a8612b" />
          <HDim xa={M(g.ext)} xb={M(W)} y={0} offset={42} label={`${d.width}`} fontSize={fs - 3} />
        </>
      )}
      {hasDoor && <HDim xa={doorX} xb={doorX + door.width} y={0} offset={16} label={`${door.width}`} fontSize={fs - 5} color="#8a4b1f" />}
      <Dim x1={dimX} y1={0} x2={dimX} y2={Y(g.wallH)} offset={sgn * 60} label={`${g.wallH}`} fontSize={fs - 2} />
      <Dim x1={dimX} y1={0} x2={dimX} y2={Y(g.ridgeH)} offset={sgn * 150} label={`${g.ridgeH}`} fontSize={fs - 2} />
      <Dim x1={M(g.mainX1 + d.overhang)} y1={Y(g.eaveH)} x2={M(g.mainX1 + d.overhang)} y2={Y(g.ridgeH)} offset={sgn * (100 - d.overhang)} label={`${Math.round(g.ridgeH - g.eaveH)}`} fontSize={fs - 5} color="#5d6a61" />
      <HDim xa={M(g.mainX1)} xb={M(g.mainX1 + d.overhang)} y={Y(g.eaveH)} offset={-65} label={`${d.overhang}`} fontSize={fs - 5} color="#5d6a61" />
      {hasDoor && <Dim x1={doorX + door.width} y1={0} x2={doorX + door.width} y2={Y(door.height)} offset={25} label={`${door.height}`} fontSize={fs - 5} color="#8a4b1f" />}
      {d.extension.enabled && <Dim x1={M(0)} y1={0} x2={M(0)} y2={Y(extH)} offset={-sgn * (gap + 50)} label={`${Math.round(extH)}`} fontSize={fs - 3} color="#a8612b" />}
      {g.canopy && (
        <HDim
          xa={M(g.canopy.x0)}
          xb={M(g.canopy.x1)}
          y={Y(g.canopy.y)}
          offset={-38}
          label={`tritisan ${Math.round(g.canopy.len - g.ext)}`}
          fontSize={fs - 5}
          color="#a8612b"
        />
      )}
      {d.fence.visible && gap > 0 && <HDim xa={fenceX} xb={M(0)} y={0} offset={42} label={`${gap}`} fontSize={fs - 4} color="#3c4a44" />}
      <text x={mainX + d.width / 2} y={Y(g.ridgeH + 60)} fontSize={fs - 3} textAnchor="middle" fill="#5d6a61">
        Atap pelana, kemiringan ±{g.pitchDeg.toFixed(0)}° • rangka baja biru • penutup spandek
      </text>
      <text x={-padL + 30} y={-12} fontSize={fs - 4} fill="#778074">
        {mir ? 'KANAN' : 'KIRI'}
      </text>
      <text x={W + padR - 30} y={-12} fontSize={fs - 4} fill="#778074" textAnchor="end">
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
  const wallH = isExtSide && g.canopy ? g.canopy.wallH : g.wallH;
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
      {!isExtSide && (
        <>
          <rect x={roofX} y={Y(g.ridgeH)} width={g.roofZ1 - g.roofZ0} height={g.ridgeH - g.eaveH} fill="#c8cbbd" stroke="#3c4a44" strokeWidth={2} />
          <rect x={roofX} y={Y(g.ridgeH)} width={g.roofZ1 - g.roofZ0} height={g.ridgeH - g.eaveH} fill="url(#roofHatch)" opacity={0.6} />
          <line x1={roofX} y1={Y(g.ridgeH)} x2={roofX + (g.roofZ1 - g.roofZ0)} y2={Y(g.ridgeH)} stroke="#202a27" strokeWidth={4} />
        </>
      )}
      <rect x={0} y={Y(wallH)} width={D} height={wallH} fill={color} stroke={isExtSide ? '#a8612b' : '#202a27'} strokeWidth={2} />
      {Array.from({ length: Math.floor(D / 90) }, (_, i) => (
        <line key={i} x1={(i + 1) * 90} y1={Y(wallH)} x2={(i + 1) * 90} y2={0} stroke="#202a27" strokeWidth={0.6} opacity={0.35} />
      ))}
      {cols.map((c) => (
        <rect key={c.id} x={R(c.z - c.size / 2, c.size)} y={Y(wallH)} width={c.size} height={wallH} fill={c.isNew ? '#a8612b' : '#2f6f80'} stroke="#202a27" />
      ))}
      {isExtSide && g.canopy && (
        <g>
          {/* tepi atap pelana existing (di belakang) dibuat tipis */}
          <rect x={roofX} y={Y(g.ridgeH)} width={g.roofZ1 - g.roofZ0} height={g.ridgeH - g.eaveH} fill="#d9dbcc" stroke="#8b9385" strokeWidth={1.5} strokeDasharray="10 6" />
          {/* ATAP DATAR perluasan: pita rata, paling dekat dengan pengamat */}
          <rect x={roofX} y={Y(g.canopy.y)} width={g.roofZ1 - g.roofZ0} height={16} fill="#c8cbbd" stroke="#3c4a44" strokeWidth={2.5} />
          <rect x={roofX} y={Y(g.canopy.y)} width={g.roofZ1 - g.roofZ0} height={16} fill="url(#roofHatch)" opacity={0.6} />
          <text
            x={D / 2}
            y={Y(g.canopy.y) - 10}
            fontSize={fs - 4}
            textAnchor="middle"
            fill="#202a27"
            fontWeight={700}
            stroke="#ecece2"
            strokeWidth={3.5}
            paintOrder="stroke"
          >
            ATAP DATAR PERLUASAN {Math.round(g.canopy.y)} cm
          </text>
        </g>
      )}
      {hasDoor && <rect x={R(door.offset, door.width)} y={Y(door.height)} width={door.width} height={door.height} fill="#8a5a33" stroke="#202a27" />}
      {showFence && (
        <g opacity={0.75}>
          <rect x={0} y={Y(d.fence.height)} width={D} height={d.fence.height} fill="url(#hatchLight)" stroke="#3c4a44" strokeWidth={1.5} />
          {Array.from({ length: Math.floor(D / 150) + 1 }, (_, i) => (
            <rect key={i} x={Math.min(i * 150, D - 6)} y={Y(d.fence.height)} width={6} height={d.fence.height} fill="#3c4a44" />
          ))}
          <text x={D / 2} y={Y(d.fence.height - 20)} fontSize={fs - 4} textAnchor="middle" fill="#202a27" fontWeight={700}>
            PAGAR BRC (di depan dinding)
          </text>
        </g>
      )}
      <Ground x0={vb.x + 20} x1={vb.x + vb.w - 20} />
      <HDim xa={0} xb={D} y={0} offset={60} label={`${D} cm`} fontSize={fs} />
      <HDim xa={roofX} xb={roofX + (g.roofZ1 - g.roofZ0)} y={0} offset={95} label={`${g.roofZ1 - g.roofZ0} (atap + tritisan)`} fontSize={fs - 4} color="#5d6a61" />
      <Dim x1={D} y1={0} x2={D} y2={Y(wallH)} offset={70} label={`${Math.round(wallH)}`} fontSize={fs - 2} />
      <Dim x1={D} y1={0} x2={D} y2={Y(g.ridgeH)} offset={140} label={`${g.ridgeH}`} fontSize={fs - 2} />
      {isExtSide && g.canopy && (
        <Dim x1={roofX} y1={Y(g.canopy.y)} x2={roofX} y2={Y(g.ridgeH)} offset={-70} label={`beda ${Math.round(g.ridgeH - g.canopy.y)}`} fontSize={fs - 5} color="#778074" />
      )}
      {showFence && <Dim x1={0} y1={0} x2={0} y2={Y(d.fence.height)} offset={-70} label={`${d.fence.height} (pagar)`} fontSize={fs - 4} color="#3c4a44" />}
      <text x={-20} y={-10} fontSize={fs - 4} fill="#778074" textAnchor="end">
        {mir ? 'DEPAN' : 'BELAKANG'}
      </text>
      <text x={D + 20} y={-10} fontSize={fs - 4} fill="#778074">
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
  const extH = g.canopy ? g.canopy.wallH : d.wallHeight;
  return (
    <Frame title="POTONGAN MELINTANG A-A" subtitle="dipotong di tengah bangunan, dilihat ke arah belakang" vb={vb}>
      <rect x={0} y={0} width={g.totalWidth} height={12} fill="url(#concrete)" stroke="#202a27" strokeWidth={1} />
      <rect x={-4} y={Y(d.extension.enabled ? extH : g.wallH)} width={8} height={d.extension.enabled ? extH : g.wallH} fill={d.extension.enabled ? '#a8612b' : '#26312b'} />
      <rect x={g.totalWidth - 4} y={Y(g.wallH)} width={8} height={g.wallH} fill="#26312b" />
      {d.extension.enabled && <line x1={g.mainX0} y1={0} x2={g.mainX0} y2={Y(g.wallH)} stroke="#a8612b" strokeWidth={2} strokeDasharray="10 6" />}
      {midCols.map((c) => (
        <g key={c.id}>
          <rect x={c.x - c.size / 2} y={Y(c.x < g.ext ? extH : g.wallH)} width={c.size} height={c.x < g.ext ? extH : g.wallH} fill={c.isNew ? '#a8612b' : '#2f6f80'} stroke="#202a27" />
          <text x={c.x} y={Y(-28)} fontSize={fs - 5} textAnchor="middle" fill={c.isNew ? '#a8612b' : '#202a27'} fontWeight={700}>
            {c.label}
          </text>
        </g>
      ))}
      <Truss x0={g.mainX0} x1={g.mainX1} wallH={g.wallH} ridgeH={g.ridgeH} overhang={d.overhang} eaveH={g.eaveH} />
      {g.canopy && (
        <g>
          {/* atap datar perluasan: garis rata */}
          <line x1={g.canopy.x0} y1={Y(g.canopy.y)} x2={g.canopy.x1} y2={Y(g.canopy.y)} stroke="#3c4a44" strokeWidth={10} strokeLinecap="butt" />
          <line x1={g.canopy.x0} y1={Y(g.canopy.y)} x2={g.canopy.x1} y2={Y(g.canopy.y)} stroke="#8b9385" strokeWidth={4} strokeLinecap="butt" />
          {/* talang tepi */}
          <rect x={g.canopy.x0} y={Y(g.canopy.y)} width={7} height={22} fill="#5d6a61" />
          <text
            x={(g.canopy.x0 + g.canopy.x1) / 2}
            y={Y(g.canopy.y * 0.55)}
            fontSize={fs - 6}
            textAnchor="middle"
            fill="#202a27"
            fontWeight={700}
            letterSpacing={1}
            transform={`rotate(-90 ${(g.canopy.x0 + g.canopy.x1) / 2} ${Y(g.canopy.y * 0.55)})`}
          >
            ATAP DATAR PERLUASAN
          </text>
        </g>
      )}
      {d.gensets.map((gs) => (
        <g key={gs.id}>
          {gs.foundationH > 0 && <rect x={gs.x - 10} y={Y(gs.foundationH)} width={gs.w + 20} height={gs.foundationH} fill="url(#concrete)" stroke="#3c4a44" strokeWidth={1.5} />}
          <rect x={gs.x} y={Y(gs.foundationH + gs.h)} width={gs.w} height={gs.h} fill={gs.color} fillOpacity={0.5} stroke="#202a27" strokeWidth={1.5} />
          {Array.from({ length: 4 }, (_, i) => (
            <line key={i} x1={gs.x + 10} y1={Y(gs.foundationH + gs.h * (0.3 + i * 0.12))} x2={gs.x + gs.w - 10} y2={Y(gs.foundationH + gs.h * (0.3 + i * 0.12))} stroke="#202a27" strokeWidth={0.8} opacity={0.5} />
          ))}
          <text
            x={gs.x + gs.w / 2}
            y={Y(gs.foundationH + gs.h - 18)}
            fontSize={fs - 5}
            textAnchor="middle"
            fontWeight={700}
            fill="#202a27"
            stroke="#ecece2"
            strokeWidth={3}
            paintOrder="stroke"
          >
            {gs.label}
          </text>
          <Dim x1={gs.x + gs.w} y1={Y(gs.foundationH)} x2={gs.x + gs.w} y2={Y(gs.foundationH + gs.h)} offset={26} label={`${gs.h}`} fontSize={fs - 5} color="#2f6f80" />
          {gs.foundationH > 0 && (
            <text x={gs.x + gs.w / 2} y={Y(gs.foundationH / 2) + 4} fontSize={fs - 6} textAnchor="middle" fontWeight={700} fill="#3c4a44">
              pondasi {gs.foundationH} cm
            </text>
          )}
          <HDim xa={gs.x} xb={gs.x + gs.w} y={Y(gs.foundationH + gs.h)} offset={-12} label={`${gs.w}`} fontSize={fs - 5} color="#2f6f80" />
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
        return parts.map((p, i) => <HDim key={i} xa={p.x1} xb={p.x2} y={0} offset={-28} label={`${Math.round(p.x2 - p.x1)}`} fontSize={fs - 5} color="#778074" dashed />);
      })()}
      {d.fence.visible && <rect x={fenceX - 4} y={Y(d.fence.height)} width={8} height={d.fence.height} fill="#3c4a44" />}
      <Ground x0={vb.x + 20} x1={vb.x + vb.w - 20} />
      <HDim xa={0} xb={g.totalWidth} y={0} offset={78} label={`${g.totalWidth} cm`} fontSize={fs} />
      {d.extension.enabled && <HDim xa={0} xb={g.ext} y={0} offset={50} label={`${g.ext}`} fontSize={fs - 4} color="#a8612b" />}
      <Dim x1={g.totalWidth} y1={0} x2={g.totalWidth} y2={Y(g.wallH)} offset={70} label={`${g.wallH}`} fontSize={fs - 2} />
      <Dim x1={g.totalWidth} y1={0} x2={g.totalWidth} y2={Y(g.ridgeH)} offset={140} label={`${g.ridgeH}`} fontSize={fs - 2} />
      {d.extension.enabled && <Dim x1={0} y1={0} x2={0} y2={Y(extH)} offset={-(gap + 50)} label={`${extH}`} fontSize={fs - 3} color="#a8612b" />}
      {d.extension.enabled && g.canopy && (
        <Dim x1={g.canopy.x0} y1={0} x2={g.canopy.x0} y2={Y(g.canopy.y)} offset={-(gap + 100)} label={`atap datar ${Math.round(g.canopy.y)}`} fontSize={fs - 5} color="#5d6a61" />
      )}
    </Frame>
  );
}
