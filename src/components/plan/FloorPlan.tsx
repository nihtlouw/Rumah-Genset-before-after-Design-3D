import { useRef, useState } from 'react';
import type { Design } from '../../types';
import { derive, clamp, snap } from '../../lib/geometry';
import { Dim, HatchDefs } from './Dim';

interface Props {
  design: Design;
  onChange?: (d: Design) => void;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  showDetailDims?: boolean;
  compact?: boolean;
}

type DragState =
  | { kind: 'column'; id: string; dx: number; dz: number }
  | { kind: 'genset'; id: string; dx: number; dz: number }
  | null;

export function FloorPlan({
  design,
  onChange,
  selectedId,
  onSelect,
  showDetailDims = true,
  compact = false,
}: Props) {
  const g = derive(design);
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<DragState>(null);
  const editable = !!onChange;

  const fenceX = design.fence.visible ? -design.fence.gap : 0;
  const padL = Math.max(260, -fenceX + 200);
  const padR = 230;
  const padT = 190;
  const padB = compact ? 170 : 260;
  const vb = {
    x: -padL,
    y: -padT,
    w: g.totalWidth + padL + padR,
    h: g.depth + padT + padB,
  };

  const WALL_T = 8;
  const fs = 17;

  const toSvg = (e: React.PointerEvent) => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const loc = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: loc.x, z: loc.y };
  };

  const startDrag = (e: React.PointerEvent, kind: 'column' | 'genset', id: string) => {
    if (!editable) return;
    e.stopPropagation();
    const p = toSvg(e);
    if (kind === 'column') {
      const c = design.columns.find((c) => c.id === id)!;
      setDrag({ kind, id, dx: p.x - c.x, dz: p.z - c.z });
    } else {
      const gs = design.gensets.find((c) => c.id === id)!;
      setDrag({ kind, id, dx: p.x - gs.x, dz: p.z - gs.z });
    }
    onSelect?.(id);
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    svgRef.current?.setPointerCapture(e.pointerId);
  };

  const onMove = (e: React.PointerEvent) => {
    if (!drag || !onChange) return;
    const p = toSvg(e);
    if (drag.kind === 'column') {
      onChange({
        ...design,
        columns: design.columns.map((c) =>
          c.id === drag.id
            ? {
                ...c,
                x: clamp(snap(p.x - drag.dx), c.size / 2, g.totalWidth - c.size / 2),
                z: clamp(snap(p.z - drag.dz), c.size / 2, g.depth - c.size / 2),
              }
            : c,
        ),
      });
    } else {
      onChange({
        ...design,
        gensets: design.gensets.map((gs) =>
          gs.id === drag.id
            ? {
                ...gs,
                x: clamp(snap(p.x - drag.dx), 0, g.totalWidth - gs.w),
                z: clamp(snap(p.z - drag.dz), 0, g.depth - gs.d),
              }
            : gs,
        ),
      });
    }
  };

  const endDrag = () => setDrag(null);

  const door = design.door;
  // door geometry in plan
  const doorRect = (() => {
    const t = WALL_T;
    switch (door.wall) {
      case 'front':
        return { x: door.offset, y: g.depth - t / 2, w: door.width, h: t, hingeX: door.offset, hingeY: g.depth, dir: 'front' as const };
      case 'back':
        return { x: door.offset, y: -t / 2, w: door.width, h: t, hingeX: door.offset, hingeY: 0, dir: 'back' as const };
      case 'left':
        return { x: -t / 2, y: door.offset, w: t, h: door.width, hingeX: 0, hingeY: door.offset, dir: 'left' as const };
      default:
        return { x: g.totalWidth - t / 2, y: door.offset, w: t, h: door.width, hingeX: g.totalWidth, hingeY: door.offset, dir: 'right' as const };
    }
  })();

  const backCols = [...design.columns].filter((c) => c.z < 100).sort((a, b) => a.x - b.x);
  const frontCols = [...design.columns].filter((c) => c.z > g.depth - 100).sort((a, b) => a.x - b.x);
  const leftCols = [...design.columns].filter((c) => c.x < 100).sort((a, b) => a.z - b.z);
  const rightCols = [...design.columns].filter((c) => c.x > g.totalWidth - 100).sort((a, b) => a.z - b.z);

  const isAfter = design.extension.enabled;

  return (
    <svg
      ref={svgRef}
      viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
      className="w-full h-auto select-none touch-none bg-white rounded-xl"
      style={{ aspectRatio: `${vb.w} / ${vb.h}` }}
      onPointerMove={onMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      onPointerDown={() => onSelect?.(null)}
    >
      <HatchDefs />
      {/* grid */}
      <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill="url(#grid50)" />

      {/* site context: taman & gedung */}
      <rect x={vb.x} y={vb.y} width={padL + fenceX} height={vb.h} fill="#ecfdf5" opacity={0.6} />
      <text x={vb.x + 20} y={g.depth / 2} fontSize={fs} fill="#059669" transform={`rotate(-90 ${vb.x + 20} ${g.depth / 2})`} textAnchor="middle" fontWeight={600}>
        TAMAN / AREA LUAR
      </text>

      {/* floor slab */}
      <rect x={0} y={0} width={g.totalWidth} height={g.depth} fill="#f8fafc" stroke="none" />

      {/* extension zone */}
      {isAfter && (
        <g>
          <rect x={0} y={0} width={g.ext} height={g.depth} fill="#fef9c3" opacity={0.8} />
          <rect x={0} y={0} width={g.ext} height={g.depth} fill="url(#hatchLight)" opacity={0.5} />
          <text
            x={g.ext / 2 - 8}
            y={g.depth / 2}
            fontSize={fs - 2}
            fill="#a16207"
            textAnchor="middle"
            fontWeight={700}
            transform={`rotate(-90 ${g.ext / 2 - 8} ${g.depth / 2})`}
          >
            AREA PERLUASAN {g.ext} cm
          </text>
          <text
            x={g.ext / 2 + 12}
            y={g.depth / 2}
            fontSize={fs - 5}
            fill="#a16207"
            textAnchor="middle"
            transform={`rotate(-90 ${g.ext / 2 + 12} ${g.depth / 2})`}
          >
            (bekas jalur pagar)
          </text>
          {/* old wall line */}
          <line x1={g.mainX0} y1={0} x2={g.mainX0} y2={g.depth} stroke="#f59e0b" strokeWidth={2} strokeDasharray="12 8" />
          <text x={g.mainX0 - 6} y={g.depth - 20} fontSize={fs - 5} fill="#b45309" transform={`rotate(-90 ${g.mainX0 - 6} ${g.depth - 20})`} textAnchor="start">
            dinding kiri lama (dibongkar)
          </text>
          {/* old fence */}
          <line x1={g.mainX0 - 150} y1={-20} x2={g.mainX0 - 150} y2={g.depth + 20} stroke="#64748b" strokeWidth={2} strokeDasharray="4 6" />
          <text x={g.mainX0 - 150 - 8} y={30} fontSize={fs - 4} fill="#64748b" transform={`rotate(-90 ${g.mainX0 - 150 - 8} ${30})`} textAnchor="end">
            posisi pagar lama
          </text>
        </g>
      )}

      {/* walls */}
      {g.walls.map((w) => {
        const isX = w.axis === 'x';
        const x = isX ? w.a0 : w.at - WALL_T / 2;
        const y = isX ? w.at - WALL_T / 2 : w.a0;
        const wd = isX ? w.a1 - w.a0 : WALL_T;
        const ht = isX ? WALL_T : w.a1 - w.a0;
        return (
          <rect
            key={w.id}
            x={x}
            y={y}
            width={wd}
            height={ht}
            fill={w.isNew ? '#dc2626' : '#1e293b'}
            opacity={w.isNew ? 0.85 : 1}
          />
        );
      })}

      {/* door */}
      <g>
        <rect x={doorRect.x} y={doorRect.y} width={doorRect.w} height={doorRect.h} fill="#fff" />
        {doorRect.dir === 'front' && (
          <>
            <path d={`M ${door.offset} ${g.depth} A ${door.width} ${door.width} 0 0 1 ${door.offset + door.width} ${g.depth + door.width}`} fill="none" stroke="#7c2d12" strokeWidth={1.2} strokeDasharray="4 3" />
            <line x1={door.offset} y1={g.depth} x2={door.offset} y2={g.depth + door.width} stroke="#7c2d12" strokeWidth={4} />
            <text x={door.offset + door.width / 2} y={g.depth + 26} fontSize={fs - 3} fill="#7c2d12" textAnchor="middle" fontWeight={700}>PINTU</text>
          </>
        )}
        {doorRect.dir === 'back' && (
          <>
            <path d={`M ${door.offset} 0 A ${door.width} ${door.width} 0 0 0 ${door.offset + door.width} ${-door.width}`} fill="none" stroke="#7c2d12" strokeWidth={1.2} strokeDasharray="4 3" />
            <line x1={door.offset} y1={0} x2={door.offset} y2={-door.width} stroke="#7c2d12" strokeWidth={4} />
            <text x={door.offset + door.width / 2} y={-14} fontSize={fs - 3} fill="#7c2d12" textAnchor="middle" fontWeight={700}>PINTU</text>
          </>
        )}
        {doorRect.dir === 'left' && (
          <>
            <path d={`M 0 ${door.offset} A ${door.width} ${door.width} 0 0 0 ${-door.width} ${door.offset + door.width}`} fill="none" stroke="#7c2d12" strokeWidth={1.2} strokeDasharray="4 3" />
            <line x1={0} y1={door.offset} x2={-door.width} y2={door.offset} stroke="#7c2d12" strokeWidth={4} />
          </>
        )}
        {doorRect.dir === 'right' && (
          <>
            <path d={`M ${g.totalWidth} ${door.offset} A ${door.width} ${door.width} 0 0 1 ${g.totalWidth + door.width} ${door.offset + door.width}`} fill="none" stroke="#7c2d12" strokeWidth={1.2} strokeDasharray="4 3" />
            <line x1={g.totalWidth} y1={door.offset} x2={g.totalWidth + door.width} y2={door.offset} stroke="#7c2d12" strokeWidth={4} />
          </>
        )}
      </g>

      {/* gensets */}
      {design.gensets.map((gs) => {
        const sel = selectedId === gs.id;
        return (
          <g
            key={gs.id}
            className={editable ? 'cursor-move' : ''}
            onPointerDown={(e) => startDrag(e, 'genset', gs.id)}
          >
            {gs.foundationH > 0 && (
              <rect
                x={gs.x - 10}
                y={gs.z - 10}
                width={gs.w + 20}
                height={gs.d + 20}
                fill="url(#concrete)"
                stroke="#475569"
                strokeWidth={1.5}
                strokeDasharray="6 4"
              />
            )}
            <rect
              x={gs.x}
              y={gs.z}
              width={gs.w}
              height={gs.d}
              fill={gs.color}
              fillOpacity={0.28}
              stroke={sel ? '#2563eb' : gs.color}
              strokeWidth={sel ? 5 : 3}
            />
            <line x1={gs.x} y1={gs.z} x2={gs.x + gs.w} y2={gs.z + gs.d} stroke={gs.color} strokeWidth={1} opacity={0.5} />
            <line x1={gs.x + gs.w} y1={gs.z} x2={gs.x} y2={gs.z + gs.d} stroke={gs.color} strokeWidth={1} opacity={0.5} />
            <text
              x={gs.x + gs.w / 2}
              y={gs.z + gs.d / 2}
              fontSize={fs}
              fontWeight={700}
              fill="#0f172a"
              textAnchor="middle"
              dominantBaseline="middle"
              transform={`rotate(-90 ${gs.x + gs.w / 2} ${gs.z + gs.d / 2})`}
            >
              {gs.label.toUpperCase()} {gs.w}×{gs.d}
              {gs.foundationH > 0 ? ` (pondasi ${gs.foundationH} cm)` : ' (tanpa pondasi)'}
            </text>
          </g>
        );
      })}

      {/* columns */}
      {design.columns.map((c) => {
        const sel = selectedId === c.id;
        return (
          <g
            key={c.id}
            className={editable ? 'cursor-move' : ''}
            onPointerDown={(e) => startDrag(e, 'column', c.id)}
          >
            <rect
              x={c.x - c.size / 2}
              y={c.z - c.size / 2}
              width={c.size}
              height={c.size}
              fill={c.isNew ? 'url(#hatchNew)' : 'url(#hatch)'}
              stroke={sel ? '#2563eb' : c.isNew ? '#b91c1c' : '#0f172a'}
              strokeWidth={sel ? 4 : 2}
            />
            <text
              x={c.x + (c.x < g.totalWidth / 2 ? c.size / 2 + 6 : -c.size / 2 - 6)}
              y={c.z + (c.z < g.depth / 2 ? c.size / 2 + 16 : -c.size / 2 - 8)}
              fontSize={fs - 4}
              fontWeight={700}
              fill={c.isNew ? '#b91c1c' : '#0f172a'}
              textAnchor={c.x < g.totalWidth / 2 ? 'start' : 'end'}
            >
              {c.label}
            </text>
          </g>
        );
      })}

      {/* fence */}
      {design.fence.visible && (
        <g>
          <polyline
            points={Array.from({ length: Math.ceil(g.depth / 20) + 1 }, (_, i) => {
              const z = Math.min(g.depth, i * 20);
              const x = fenceX + (i % 2 === 0 ? -8 : 8);
              return `${x},${z}`;
            }).join(' ')}
            fill="none"
            stroke="#334155"
            strokeWidth={2.5}
          />
          <line x1={fenceX} y1={0} x2={fenceX} y2={g.depth} stroke="#334155" strokeWidth={1} />
          <text x={fenceX - 20} y={g.depth / 2} fontSize={fs} fill="#334155" fontWeight={700} textAnchor="middle" transform={`rotate(-90 ${fenceX - 20} ${g.depth / 2})`}>
            PAGAR {isAfter ? '(sudah digeser)' : 'EXISTING'}
          </text>
        </g>
      )}

      {/* ---- DIMENSIONS ---- */}
      {/* total width (top) */}
      <Dim x1={0} y1={0} x2={g.totalWidth} y2={0} offset={-110} label={`${g.totalWidth} cm`} fontSize={fs + 2} />
      {isAfter && (
        <>
          <Dim x1={0} y1={0} x2={g.ext} y2={0} offset={-70} label={`${g.ext}`} fontSize={fs} color="#b45309" />
          <Dim x1={g.ext} y1={0} x2={g.totalWidth} y2={0} offset={-70} label={`${design.width}`} fontSize={fs} />
        </>
      )}
      {/* back column spacing */}
      {backCols.length >= 2 &&
        backCols.slice(1).map((c, i) => (
          <Dim
            key={c.id}
            x1={backCols[i].x}
            y1={0}
            x2={c.x}
            y2={0}
            offset={-38}
            label={`${Math.round(c.x - backCols[i].x)} (as-as)`}
            fontSize={fs - 3}
            color="#475569"
          />
        ))}
      {backCols.length >= 1 && g.totalWidth - backCols[backCols.length - 1].x > 60 && (
        <Dim
          x1={backCols[backCols.length - 1].x}
          y1={0}
          x2={g.totalWidth}
          y2={0}
          offset={-38}
          label={`${Math.round(g.totalWidth - backCols[backCols.length - 1].x)}`}
          fontSize={fs - 3}
          color="#475569"
        />
      )}

      {/* depth (right side) */}
      <Dim x1={g.totalWidth} y1={0} x2={g.totalWidth} y2={g.depth} offset={-120} label={`${g.depth} cm`} fontSize={fs + 2} />
      {rightCols.length >= 2 &&
        rightCols.slice(1).map((c, i) => (
          <Dim
            key={c.id}
            x1={g.totalWidth}
            y1={rightCols[i].z}
            x2={g.totalWidth}
            y2={c.z}
            offset={-60}
            label={`${Math.round(c.z - rightCols[i].z)}`}
            fontSize={fs - 3}
            color="#475569"
          />
        ))}

      {/* left side: fence gap & left column spacing */}
      {design.fence.visible && design.fence.gap > 0 && (
        <Dim x1={fenceX} y1={g.depth} x2={0} y2={g.depth} offset={-60} label={`${design.fence.gap}`} fontSize={fs} color="#334155" />
      )}
      {leftCols.length >= 2 &&
        leftCols.slice(1).map((c, i) => (
          <Dim
            key={c.id}
            x1={0}
            y1={leftCols[i].z}
            x2={0}
            y2={c.z}
            offset={(design.fence.visible ? design.fence.gap : 0) + 60}
            label={`${Math.round(c.z - leftCols[i].z)}`}
            fontSize={fs - 3}
            color="#475569"
          />
        ))}

      {/* front: door position */}
      {door.wall === 'front' && (
        <>
          <Dim x1={0} y1={g.depth} x2={door.offset} y2={g.depth} offset={125} label={`${door.offset}`} fontSize={fs - 2} color="#7c2d12" />
          <Dim x1={door.offset} y1={g.depth} x2={door.offset + door.width} y2={g.depth} offset={125} label={`${door.width}`} fontSize={fs - 2} color="#7c2d12" />
          <Dim x1={door.offset + door.width} y1={g.depth} x2={g.totalWidth} y2={g.depth} offset={125} label={`${g.totalWidth - door.offset - door.width}`} fontSize={fs - 2} color="#7c2d12" />
        </>
      )}
      {frontCols.length >= 2 && (
        <Dim x1={frontCols[0].x} y1={g.depth} x2={frontCols[frontCols.length - 1].x} y2={g.depth} offset={60} label={`${Math.round(frontCols[frontCols.length - 1].x - frontCols[0].x)} (as-as)`} fontSize={fs - 3} color="#475569" />
      )}

      {/* genset detail dims */}
      {showDetailDims &&
        design.gensets.map((gs) => (
          <g key={gs.id + '-dims'}>
            <Dim x1={gs.x} y1={gs.z} x2={gs.x + gs.w} y2={gs.z} offset={30} label={`${gs.w}`} fontSize={fs - 3} color="#1d4ed8" />
            <Dim x1={gs.x + gs.w} y1={gs.z} x2={gs.x + gs.w} y2={gs.z + gs.d} offset={-30} label={`${gs.d}`} fontSize={fs - 3} color="#1d4ed8" />
            {/* clearance to back & front */}
            <Dim x1={gs.x + gs.w / 2} y1={0} x2={gs.x + gs.w / 2} y2={gs.z} offset={0} label={`${gs.z}`} fontSize={fs - 4} color="#64748b" dashed />
            <Dim x1={gs.x + gs.w / 2} y1={gs.z + gs.d} x2={gs.x + gs.w / 2} y2={g.depth} offset={0} label={`${g.depth - gs.z - gs.d}`} fontSize={fs - 4} color="#64748b" dashed />
          </g>
        ))}
      {showDetailDims && (() => {
        // horizontal clearances between walls and gensets (sorted by x)
        const sorted = [...design.gensets].sort((a, b) => a.x - b.x);
        const zLine = Math.round(g.depth * 0.72);
        const parts: { x1: number; x2: number; label: string }[] = [];
        let cursor = 0;
        sorted.forEach((gs) => {
          if (gs.x - cursor > 1) parts.push({ x1: cursor, x2: gs.x, label: `${Math.round(gs.x - cursor)}` });
          cursor = gs.x + gs.w;
        });
        if (g.totalWidth - cursor > 1) parts.push({ x1: cursor, x2: g.totalWidth, label: `${Math.round(g.totalWidth - cursor)}` });
        return parts.map((p, i) => (
          <Dim key={i} x1={p.x1} y1={zLine} x2={p.x2} y2={zLine} offset={0} label={p.label} fontSize={fs - 4} color="#64748b" dashed />
        ));
      })()}

      {/* orientation labels */}
      <text x={g.totalWidth / 2} y={-150} fontSize={fs - 2} fill="#64748b" textAnchor="middle" letterSpacing={3}>SISI BELAKANG</text>
      <text x={g.totalWidth / 2} y={g.depth + 165} fontSize={fs - 2} fill="#64748b" textAnchor="middle" letterSpacing={3}>SISI DEPAN (AKSES PINTU)</text>
      <text x={g.totalWidth + 170} y={g.depth / 2} fontSize={fs - 2} fill="#64748b" textAnchor="middle" letterSpacing={3} transform={`rotate(90 ${g.totalWidth + 170} ${g.depth / 2})`}>SISI KANAN</text>

      {/* north arrow */}
      <g transform={`translate(${g.totalWidth + 150}, -120)`}>
        <circle r={28} fill="#fff" stroke="#0f172a" strokeWidth={1.5} />
        <path d="M 0 -22 L 8 8 L 0 2 L -8 8 Z" fill="#0f172a" />
        <text y={-34} fontSize={fs - 4} textAnchor="middle" fontWeight={700} fill="#0f172a">U (asumsi)</text>
      </g>

      {/* title block */}
      {!compact && (
        <g transform={`translate(${-padL + 20}, ${g.depth + 190})`}>
          <rect x={0} y={0} width={vb.w - 40} height={60} fill="#0f172a" rx={6} />
          <text x={16} y={25} fontSize={fs + 2} fill="#fff" fontWeight={700}>
            DENAH {design.title.toUpperCase()}
          </text>
          <text x={16} y={48} fontSize={fs - 3} fill="#cbd5e1">
            Satuan: cm • Luas lantai {(g.floorArea).toFixed(2)} m² • Tiang {design.columns.length} bh • Genset {design.gensets.length} unit • Skala menyesuaikan layar
          </text>
          <g transform={`translate(${vb.w - 460}, 14)`} fontSize={fs - 4} fill="#fff">
            <rect x={0} y={0} width={22} height={14} fill="url(#hatch)" stroke="#fff" strokeWidth={0.8} />
            <text x={28} y={12}>Tiang existing</text>
            <rect x={130} y={0} width={22} height={14} fill="url(#hatchNew)" stroke="#fff" strokeWidth={0.8} />
            <text x={158} y={12}>Tiang / dinding baru</text>
            <rect x={300} y={0} width={22} height={14} fill="#fef9c3" />
            <text x={328} y={12}>Area perluasan</text>
            <rect x={0} y={22} width={22} height={14} fill="url(#concrete)" stroke="#fff" strokeWidth={0.8} />
            <text x={28} y={34}>Pondasi genset 30 cm</text>
            <line x1={130} y1={29} x2={152} y2={29} stroke="#64748b" strokeWidth={2} strokeDasharray="4 3" />
            <text x={158} y={34}>Jarak bebas / dim bantu</text>
          </g>
        </g>
      )}
    </svg>
  );
}
