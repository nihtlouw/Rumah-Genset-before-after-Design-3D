import { useMemo } from 'react';
import { Quaternion, Vector3, DoubleSide } from 'three';
import { Line } from '@react-three/drei';
import type { Design, ViewOptions } from '../../types';
import { derive } from '../../lib/geometry';
import { MATERIAL_COLOR } from '../../data/defaults';
import { Dim3, Label3 } from './Dim3';

type V3 = [number, number, number];

const STEEL_BLUE = '#1f5fa8';
const CONCRETE = '#a8adb5';
const ROOF = '#8b949e';

/** Box oriented from point A to point B (for truss webs, rafters) */
function Bar({ from, to, size = 0.07, color = STEEL_BLUE }: { from: V3; to: V3; size?: number; color?: string }) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new Vector3(...from);
    const b = new Vector3(...to);
    const dir = b.clone().sub(a);
    const length = dir.length();
    const quaternion = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.clone().normalize());
    return { position: a.clone().add(b).multiplyScalar(0.5), quaternion, length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from.join(','), to.join(',')]);
  return (
    <mesh position={position} quaternion={quaternion} castShadow>
      <boxGeometry args={[size, length, size]} />
      <meshStandardMaterial color={color} metalness={0.5} roughness={0.5} />
    </mesh>
  );
}

export function Building({ design, options }: { design: Design; options: ViewOptions }) {
  const d = design;
  const g = derive(d);
  const ox = g.totalWidth / 2;
  const oz = g.depth / 2;
  const X = (x: number) => (x - ox) / 100;
  const Z = (z: number) => (z - oz) / 100;
  const H = (h: number) => h / 100;

  const extH = Math.min(d.extension.wallHeight, d.wallHeight);
  const cxMain = (g.mainX0 + g.mainX1) / 2;
  const roofLen = (g.roofZ1 - g.roofZ0) / 100;
  const roofZc = (g.roofZ0 + g.roofZ1) / 2;
  const tan = Math.tan(g.pitch);

  const wallOpacity = options.transparentWalls ? 0.3 : 1;

  // --- helpers for roof slope positions (cm) ---
  const slopeCenter = (s: -1 | 1, drop = 0): V3 => [
    X(cxMain + (s * g.halfSpan) / 2),
    H(g.ridgeH - (g.halfSpan / 2) * tan - drop),
    Z(roofZc),
  ];
  const roofYAt = (xcm: number) => g.ridgeH - Math.abs(xcm - cxMain) * tan;

  const trussZs = useMemo(() => {
    const n = Math.max(2, Math.round(d.depth / 240) + 1);
    return Array.from({ length: n }, (_, i) => (i * d.depth) / (n - 1));
  }, [d.depth]);

  const purlinOffsets = useMemo(() => {
    const arr: number[] = [];
    for (let u = 45; u < g.halfSpan - 10; u += 100) arr.push(u);
    arr.push(g.halfSpan - 12);
    return arr;
  }, [g.halfSpan]);

  const sortedGensets = [...d.gensets].sort((a, b) => a.x - b.x);
  const gaps: { x1: number; x2: number }[] = [];
  {
    let cur = 0;
    sortedGensets.forEach((gs) => {
      if (gs.x - cur > 1) gaps.push({ x1: cur, x2: gs.x });
      cur = gs.x + gs.w;
    });
    if (g.totalWidth - cur > 1) gaps.push({ x1: cur, x2: g.totalWidth });
  }
  const backCols = d.columns.filter((c) => c.z < 100).sort((a, b) => a.x - b.x);
  const fenceX = -d.fence.gap;

  return (
    <group>
      {/* ---------------- FLOOR SLAB ---------------- */}
      <mesh position={[X(ox), -0.06, Z(oz)]} receiveShadow>
        <boxGeometry args={[g.totalWidth / 100 + 0.1, 0.12, g.depth / 100 + 0.1]} />
        <meshStandardMaterial color="#c9ccd1" roughness={0.95} />
      </mesh>
      {d.extension.enabled && (
        <>
          <mesh position={[X(g.ext / 2), 0.002, Z(oz)]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[g.ext / 100, g.depth / 100]} />
            <meshStandardMaterial color="#e5d9a8" roughness={0.95} />
          </mesh>
          {/* bekas garis dinding kiri lama */}
          <Line
            points={[
              [X(g.mainX0), 0.015, Z(0)],
              [X(g.mainX0), 0.015, Z(d.depth)],
            ]}
            color="#d97706"
            lineWidth={2}
            dashed
            dashSize={0.25}
            gapSize={0.15}
          />
          {options.showLabels && <Label3 position={[X(g.mainX0), 0.35, Z(d.depth * 0.3)]} text="garis dinding kiri lama" tone="light" small />}
        </>
      )}

      {/* ---------------- COLUMNS ---------------- */}
      {d.columns.map((c) => {
        const h = c.x < g.ext && d.extension.enabled ? extH : d.wallHeight;
        return (
          <group key={c.id}>
            <mesh position={[X(c.x), H(h / 2), Z(c.z)]} castShadow receiveShadow>
              <boxGeometry args={[c.size / 100, H(h), c.size / 100]} />
              <meshStandardMaterial color={c.isNew ? CONCRETE : STEEL_BLUE} metalness={c.isNew ? 0 : 0.5} roughness={c.isNew ? 0.9 : 0.45} />
            </mesh>
            {/* base plate */}
            <mesh position={[X(c.x), 0.015, Z(c.z)]}>
              <boxGeometry args={[c.size / 100 + 0.1, 0.03, c.size / 100 + 0.1]} />
              <meshStandardMaterial color={c.isNew ? '#8b8f96' : '#163f70'} />
            </mesh>
            {options.showLabels && <Label3 position={[X(c.x), H(h) + 0.25, Z(c.z)]} text={c.label} tone={c.isNew ? 'new' : 'blue'} small />}
          </group>
        );
      })}

      {/* ---------------- WALLS ---------------- */}
      {g.walls.map((w) => {
        const len = (w.a1 - w.a0) / 100;
        const hgt = (w.y1 - w.y0) / 100;
        const yc = H((w.y0 + w.y1) / 2);
        const color = MATERIAL_COLOR[w.material];
        const isX = w.axis === 'x';
        const pos: V3 = isX ? [X((w.a0 + w.a1) / 2), yc, Z(w.at)] : [X(w.at), yc, Z((w.a0 + w.a1) / 2)];
        const args: V3 = isX ? [len, hgt, 0.06] : [0.06, hgt, len];
        return (
          <mesh key={w.id} position={pos} castShadow={!options.transparentWalls} receiveShadow>
            <boxGeometry args={args} />
            <meshStandardMaterial
              color={color}
              metalness={w.material === 'spandek' ? 0.45 : 0}
              roughness={w.material === 'spandek' ? 0.45 : 0.9}
              transparent={options.transparentWalls}
              opacity={wallOpacity}
              side={DoubleSide}
            />
          </mesh>
        );
      })}

      {/* ---------------- RING BEAMS (balok keliling) ---------------- */}
      {[
        { from: [X(g.mainX0), H(d.wallHeight), Z(0)] as V3, to: [X(g.mainX1), H(d.wallHeight), Z(0)] as V3 },
        { from: [X(g.mainX0), H(d.wallHeight), Z(d.depth)] as V3, to: [X(g.mainX1), H(d.wallHeight), Z(d.depth)] as V3 },
        { from: [X(g.mainX0), H(d.wallHeight), Z(0)] as V3, to: [X(g.mainX0), H(d.wallHeight), Z(d.depth)] as V3 },
        { from: [X(g.mainX1), H(d.wallHeight), Z(0)] as V3, to: [X(g.mainX1), H(d.wallHeight), Z(d.depth)] as V3 },
      ].map((b, i) => (
        <Bar key={i} from={b.from} to={b.to} size={0.14} />
      ))}
      {d.extension.enabled && (
        <>
          <Bar from={[X(0), H(extH), Z(0)]} to={[X(0), H(extH), Z(d.depth)]} size={0.12} color="#7c8089" />
          <Bar from={[X(0), H(extH), Z(0)]} to={[X(g.mainX0), H(extH), Z(0)]} size={0.1} color="#7c8089" />
          <Bar from={[X(0), H(extH), Z(d.depth)]} to={[X(g.mainX0), H(extH), Z(d.depth)]} size={0.1} color="#7c8089" />
        </>
      )}

      {/* ---------------- TRUSSES (kuda-kuda) ---------------- */}
      {trussZs.map((z, i) => {
        const zz = Z(z);
        const ridge: V3 = [X(cxMain), H(g.ridgeH - 8), zz];
        const eaveL: V3 = [X(g.mainX0 - d.overhang), H(g.eaveH - 8), zz];
        const eaveR: V3 = [X(g.mainX1 + d.overhang), H(g.eaveH - 8), zz];
        const chordL: V3 = [X(g.mainX0), H(d.wallHeight), zz];
        const chordR: V3 = [X(g.mainX1), H(d.wallHeight), zz];
        const q1x = g.mainX0 + d.width * 0.25;
        const q3x = g.mainX0 + d.width * 0.75;
        return (
          <group key={i}>
            <Bar from={ridge} to={eaveL} size={0.1} />
            <Bar from={ridge} to={eaveR} size={0.1} />
            <Bar from={chordL} to={chordR} size={0.1} />
            <Bar from={[X(cxMain), H(d.wallHeight), zz]} to={ridge} size={0.07} />
            <Bar from={[X(q1x), H(d.wallHeight), zz]} to={[X(q1x), H(roofYAt(q1x) - 8), zz]} size={0.06} />
            <Bar from={[X(q3x), H(d.wallHeight), zz]} to={[X(q3x), H(roofYAt(q3x) - 8), zz]} size={0.06} />
            <Bar from={[X(q1x), H(d.wallHeight), zz]} to={ridge} size={0.05} />
            <Bar from={[X(q3x), H(d.wallHeight), zz]} to={ridge} size={0.05} />
          </group>
        );
      })}

      {/* purlins (gording) */}
      {([-1, 1] as const).map((s) =>
        purlinOffsets.map((u, i) => (
          <Bar
            key={`${s}-${i}`}
            from={[X(cxMain + s * u), H(g.ridgeH - u * tan - 7), Z(g.roofZ0)]}
            to={[X(cxMain + s * u), H(g.ridgeH - u * tan - 7), Z(g.roofZ1)]}
            size={0.06}
            color="#2b6cb0"
          />
        )),
      )}

      {/* ---------------- ROOF SHEETS ---------------- */}
      {options.showRoof && (
        <group>
          {([-1, 1] as const).map((s) => (
            <mesh key={s} position={slopeCenter(s)} rotation={[0, 0, -s * g.pitch]} castShadow receiveShadow>
              <boxGeometry args={[g.slopeLen / 100, 0.035, roofLen]} />
              <meshStandardMaterial color={ROOF} metalness={0.55} roughness={0.4} side={DoubleSide} />
            </mesh>
          ))}
          {/* ridge cap */}
          <mesh position={[X(cxMain), H(g.ridgeH) + 0.02, Z(roofZc)]} castShadow>
            <boxGeometry args={[0.22, 0.06, roofLen]} />
            <meshStandardMaterial color="#6b7280" metalness={0.6} roughness={0.4} />
          </mesh>
          {/* sheet ribs */}
          {([-1, 1] as const).map((s) =>
            [0.2, 0.4, 0.6, 0.8].map((t) => (
              <mesh
                key={`${s}-${t}`}
                position={[X(cxMain + s * g.halfSpan * t), H(g.ridgeH - g.halfSpan * t * tan) + 0.03, Z(roofZc)]}
                rotation={[0, 0, -s * g.pitch]}
              >
                <boxGeometry args={[0.04, 0.03, roofLen]} />
                <meshStandardMaterial color="#737b85" metalness={0.6} roughness={0.4} />
              </mesh>
            )),
          )}
        </group>
      )}

      {/* ---------------- LEAN-TO (atap perluasan) ---------------- */}
      {g.leanTo && (
        <group>
          {options.showRoof && (
            <mesh
              position={[X((g.leanTo.xLow + g.leanTo.xHigh) / 2), H((g.leanTo.yLow + g.leanTo.yHigh) / 2), Z(roofZc)]}
              rotation={[0, 0, g.leanTo.angle]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[g.leanTo.len / 100, 0.035, roofLen]} />
              <meshStandardMaterial color={ROOF} metalness={0.55} roughness={0.4} side={DoubleSide} />
            </mesh>
          )}
          {trussZs.map((z, i) => (
            <Bar
              key={i}
              from={[X(g.leanTo!.xLow), H(g.leanTo!.yLow - 6), Z(z)]}
              to={[X(g.leanTo!.xHigh), H(g.leanTo!.yHigh - 6), Z(z)]}
              size={0.08}
              color="#7c8089"
            />
          ))}
          <Bar from={[X(g.leanTo.xHigh), H(g.leanTo.yHigh - 10), Z(g.roofZ0)]} to={[X(g.leanTo.xHigh), H(g.leanTo.yHigh - 10), Z(g.roofZ1)]} size={0.08} color="#7c8089" />
        </group>
      )}

      {/* ---------------- DOOR ---------------- */}
      {(() => {
        const dr = d.door;
        const t = 0.05;
        let pos: V3;
        let args: V3;
        if (dr.wall === 'front' || dr.wall === 'back') {
          pos = [X(dr.offset + dr.width / 2), H(dr.height / 2), Z(dr.wall === 'front' ? d.depth + 1 : -1)];
          args = [dr.width / 100, dr.height / 100, t];
        } else {
          pos = [X(dr.wall === 'left' ? -1 : g.totalWidth + 1), H(dr.height / 2), Z(dr.offset + dr.width / 2)];
          args = [t, dr.height / 100, dr.width / 100];
        }
        return (
          <group>
            <mesh position={pos} castShadow>
              <boxGeometry args={args} />
              <meshStandardMaterial color="#6b3f22" roughness={0.7} />
            </mesh>
            {/* frame */}
            <mesh position={[pos[0], H(dr.height) + 0.03, pos[2]]}>
              <boxGeometry args={dr.wall === 'front' || dr.wall === 'back' ? [dr.width / 100 + 0.1, 0.06, 0.08] : [0.08, 0.06, dr.width / 100 + 0.1]} />
              <meshStandardMaterial color="#3f3f46" />
            </mesh>
            {options.showLabels && <Label3 position={[pos[0], H(dr.height) + 0.35, pos[2]]} text={`PINTU ${dr.width}×${dr.height}`} tone="light" small />}
          </group>
        );
      })()}

      {/* ---------------- GENSETS ---------------- */}
      {d.gensets.map((gs) => {
        const cx = X(gs.x + gs.w / 2);
        const cz = Z(gs.z + gs.d / 2);
        const top = gs.foundationH + gs.h;
        return (
          <group key={gs.id}>
            {gs.foundationH > 0 && (
              <mesh position={[cx, H(gs.foundationH / 2), cz]} castShadow receiveShadow>
                <boxGeometry args={[(gs.w + 20) / 100, H(gs.foundationH), (gs.d + 20) / 100]} />
                <meshStandardMaterial color="#9ea3aa" roughness={1} />
              </mesh>
            )}
            <mesh position={[cx, H(gs.foundationH + gs.h / 2), cz]} castShadow receiveShadow>
              <boxGeometry args={[gs.w / 100, gs.h / 100, gs.d / 100]} />
              <meshStandardMaterial color={gs.color} metalness={0.25} roughness={0.55} />
            </mesh>
            {/* top cover */}
            <mesh position={[cx, H(top) + 0.03, cz]} castShadow>
              <boxGeometry args={[gs.w / 100 - 0.06, 0.06, gs.d / 100 - 0.06]} />
              <meshStandardMaterial color="#334155" metalness={0.3} roughness={0.6} />
            </mesh>
            {/* louvers along long sides */}
            {[-1, 1].map((s) =>
              [0.25, 0.5, 0.75].map((t) => (
                <mesh key={`${s}-${t}`} position={[cx + (s * gs.w) / 200 + s * 0.005, H(gs.foundationH + gs.h * 0.55), Z(gs.z + gs.d * t)]}>
                  <boxGeometry args={[0.02, gs.h / 100 * 0.45, Math.min(0.6, gs.d / 100 * 0.18)]} />
                  <meshStandardMaterial color="#1f2937" />
                </mesh>
              )),
            )}
            {/* exhaust pipe */}
            <mesh position={[cx, H(top) + (H(g.ridgeH + 60) - H(top)) / 2, Z(gs.z + gs.d * 0.15)]} castShadow>
              <cylinderGeometry args={[0.06, 0.06, H(g.ridgeH + 60) - H(top), 12]} />
              <meshStandardMaterial color="#52525b" metalness={0.7} roughness={0.4} />
            </mesh>
            <mesh position={[cx, H(g.ridgeH + 62), Z(gs.z + gs.d * 0.15)]}>
              <coneGeometry args={[0.14, 0.12, 12]} />
              <meshStandardMaterial color="#3f3f46" />
            </mesh>
            {options.showLabels && (
              <Label3
                position={[cx, H(top) + 0.7, cz]}
                text={`${gs.label} ${gs.w}×${gs.d}×${gs.h}${gs.foundationH ? ` • pondasi ${gs.foundationH}` : ' • tanpa pondasi'}`}
                tone={gs.isNew ? 'new' : 'green'}
              />
            )}
          </group>
        );
      })}

      {/* ---------------- FENCE ---------------- */}
      {d.fence.visible && (
        <group>
          {Array.from({ length: Math.floor(d.depth / 150) + 2 }, (_, i) => Math.min(i * 150, d.depth)).map((z, i) => (
            <mesh key={i} position={[X(fenceX), H(d.fence.height / 2), Z(z)]} castShadow>
              <boxGeometry args={[0.05, H(d.fence.height), 0.05]} />
              <meshStandardMaterial color="#374151" metalness={0.6} roughness={0.4} />
            </mesh>
          ))}
          {[0.25, 0.97].map((t) => (
            <Bar key={t} from={[X(fenceX), H(d.fence.height * t), Z(0)]} to={[X(fenceX), H(d.fence.height * t), Z(d.depth)]} size={0.03} color="#374151" />
          ))}
          <mesh position={[X(fenceX), H(d.fence.height / 2), Z(oz)]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[g.depth / 100, H(d.fence.height)]} />
            <meshStandardMaterial color="#1f2937" transparent opacity={0.12} side={DoubleSide} />
          </mesh>
          <mesh position={[X(fenceX), H(d.fence.height / 2), Z(oz)]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[g.depth / 100, H(d.fence.height), Math.max(4, Math.round(g.depth / 20)), Math.max(2, Math.round(d.fence.height / 20))]} />
            <meshBasicMaterial color="#334155" wireframe transparent opacity={0.7} side={DoubleSide} />
          </mesh>
          {options.showLabels && <Label3 position={[X(fenceX), H(d.fence.height) + 0.3, Z(oz)]} text={d.extension.enabled ? 'PAGAR (sudah digeser)' : 'PAGAR EXISTING'} tone="light" small />}
        </group>
      )}

      {/* ---------------- LABELS ---------------- */}
      {options.showLabels && d.extension.enabled && (
        <Label3 position={[X(g.ext / 2), 0.4, Z(d.depth * 0.82)]} text={`AREA PERLUASAN ${g.ext} cm`} tone="new" small />
      )}

      {/* ---------------- DIMENSIONS ---------------- */}
      {options.showDimensions && (
        <group>
          <Dim3 a={[X(0), 0.02, Z(d.depth)]} b={[X(g.totalWidth), 0.02, Z(d.depth)]} offset={[0, 0, 1.0]} label={`Lebar total ${g.totalWidth} cm`} />
          {d.extension.enabled && (
            <>
              <Dim3 a={[X(0), 0.02, Z(d.depth)]} b={[X(g.ext), 0.02, Z(d.depth)]} offset={[0, 0, 0.55]} label={`${g.ext}`} tone="new" />
              <Dim3 a={[X(g.ext), 0.02, Z(d.depth)]} b={[X(g.totalWidth), 0.02, Z(d.depth)]} offset={[0, 0, 0.55]} label={`${d.width}`} tone="sub" />
            </>
          )}
          <Dim3 a={[X(g.totalWidth), 0.02, Z(0)]} b={[X(g.totalWidth), 0.02, Z(d.depth)]} offset={[1.0, 0, 0]} label={`Panjang ${d.depth} cm`} />
          <Dim3 a={[X(g.totalWidth), 0, Z(d.depth)]} b={[X(g.totalWidth), H(d.wallHeight), Z(d.depth)]} offset={[0.5, 0, 0.5]} label={`Tinggi dinding ${d.wallHeight}`} />
          <Dim3 a={[X(cxMain), 0, Z(g.roofZ1)]} b={[X(cxMain), H(g.ridgeH), Z(g.roofZ1)]} offset={[0, 0, 0.7]} label={`Bubungan ${g.ridgeH}`} />
          <Dim3 a={[X(g.mainX1 + d.overhang), H(g.eaveH), Z(g.roofZ1)]} b={[X(g.mainX1 + d.overhang), H(g.ridgeH), Z(g.roofZ1)]} offset={[0.35, 0, 0.3]} label={`Naik ${Math.round(g.ridgeH - g.eaveH)} (${g.pitchDeg.toFixed(0)}°)`} tone="sub" />
          {backCols.length >= 2 && (
            <Dim3 a={[X(backCols[0].x), H(d.wallHeight), Z(0)]} b={[X(backCols[1].x), H(d.wallHeight), Z(0)]} offset={[0, 0.1, -0.7]} label={`As tiang ${Math.round(backCols[1].x - backCols[0].x)}`} tone="sub" />
          )}
          {backCols.length >= 2 && g.totalWidth - backCols[backCols.length - 1].x > 60 && (
            <Dim3
              a={[X(backCols[backCols.length - 1].x), H(d.wallHeight), Z(0)]}
              b={[X(g.totalWidth), H(d.wallHeight), Z(0)]}
              offset={[0, 0.1, -0.7]}
              label={`${Math.round(g.totalWidth - backCols[backCols.length - 1].x)} (tidak simetris)`}
              tone="sub"
            />
          )}
          {d.door.wall === 'front' && (
            <Dim3 a={[X(d.door.offset), H(d.door.height), Z(d.depth)]} b={[X(d.door.offset + d.door.width), H(d.door.height), Z(d.depth)]} offset={[0, 0.15, 0.12]} label={`Pintu ${d.door.width}`} tone="door" />
          )}
          {d.fence.visible && d.fence.gap > 0 && (
            <Dim3 a={[X(fenceX), 0.02, Z(d.depth)]} b={[X(0), 0.02, Z(d.depth)]} offset={[0, 0, 0.55]} label={`Pagar ${d.fence.gap}`} tone="sub" />
          )}
          {d.gensets.map((gs) => {
            const top = H(gs.foundationH + gs.h);
            return (
              <group key={gs.id}>
                <Dim3 a={[X(gs.x), top, Z(gs.z)]} b={[X(gs.x + gs.w), top, Z(gs.z)]} offset={[0, 0.3, 0]} label={`${gs.w}`} tone={gs.isNew ? 'new' : 'sub'} />
                <Dim3 a={[X(gs.x + gs.w), top, Z(gs.z)]} b={[X(gs.x + gs.w), top, Z(gs.z + gs.d)]} offset={[0, 0.3, 0]} label={`${gs.d}`} tone={gs.isNew ? 'new' : 'sub'} />
                <Dim3 a={[X(gs.x + gs.w), H(gs.foundationH), Z(gs.z + gs.d)]} b={[X(gs.x + gs.w), top, Z(gs.z + gs.d)]} offset={[0.12, 0, 0.12]} label={`t ${gs.h}`} tone="sub" />
                {gs.foundationH > 0 && (
                  <Dim3 a={[X(gs.x + gs.w + 10), 0, Z(gs.z + gs.d + 10)]} b={[X(gs.x + gs.w + 10), H(gs.foundationH), Z(gs.z + gs.d + 10)]} offset={[0.35, 0, 0.35]} label={`Pondasi ${gs.foundationH}`} tone="new" />
                )}
                <Dim3 a={[X(gs.x + gs.w / 2), 0.03, Z(0)]} b={[X(gs.x + gs.w / 2), 0.03, Z(gs.z)]} label={`${gs.z}`} tone="sub" />
                <Dim3 a={[X(gs.x + gs.w / 2), 0.03, Z(gs.z + gs.d)]} b={[X(gs.x + gs.w / 2), 0.03, Z(d.depth)]} label={`${d.depth - gs.z - gs.d}`} tone="sub" />
              </group>
            );
          })}
          {gaps.map((p, i) => (
            <Dim3 key={i} a={[X(p.x1), 0.03, Z(oz)]} b={[X(p.x2), 0.03, Z(oz)]} label={`${Math.round(p.x2 - p.x1)}`} tone="sub" />
          ))}
        </group>
      )}
    </group>
  );
}

/** Ground + surrounding context (gedung di belakang, taman di kiri) */
export function Context({ design, show }: { design: Design; show: boolean }) {
  const g = derive(design);
  const W = g.totalWidth / 100;
  const D = g.depth / 100;
  const fenceX = -(design.fence.visible ? design.fence.gap : 0) / 100 - W / 2;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#b9bec6" roughness={1} />
      </mesh>
      {/* paving in front */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.115, D / 2 + 4]} receiveShadow>
        <planeGeometry args={[W + 8, 8]} />
        <meshStandardMaterial color="#aeb3ba" roughness={1} />
      </mesh>
      {/* garden left of fence */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[fenceX - 10.05, -0.11, 0]} receiveShadow>
        <planeGeometry args={[20, D + 10]} />
        <meshStandardMaterial color="#7fae63" roughness={1} />
      </mesh>
      {show && (
        <group>
          {/* gedung di belakang */}
          <mesh position={[2, 7, -D / 2 - 18]} receiveShadow castShadow>
            <boxGeometry args={[36, 14, 7]} />
            <meshStandardMaterial color="#e8e9eb" roughness={0.9} />
          </mesh>
          {Array.from({ length: 3 }, (_, r) =>
            Array.from({ length: 10 }, (_, c) => (
              <mesh key={`${r}-${c}`} position={[-13 + c * 3.2, 3 + r * 3.5, -D / 2 - 14.45]}>
                <boxGeometry args={[1.6, 1.6, 0.05]} />
                <meshStandardMaterial color="#7a93a8" metalness={0.4} roughness={0.3} />
              </mesh>
            )),
          )}
          {/* palm-ish trees in garden (di luar garis pandang POV kiri) */}
          {[[-4.5, -D / 2 - 2.5], [-6, D / 2 + 2.5]].map(([dx, dz], i) => (
            <group key={i} position={[fenceX + dx, 0, dz]}>
              <mesh position={[0, 2.5, 0]} castShadow>
                <cylinderGeometry args={[0.12, 0.2, 5, 8]} />
                <meshStandardMaterial color="#7a5a3a" />
              </mesh>
              <mesh position={[0, 5.3, 0]} castShadow>
                <sphereGeometry args={[1.5, 10, 8]} />
                <meshStandardMaterial color="#4f8a3f" roughness={1} />
              </mesh>
            </group>
          ))}
        </group>
      )}
    </group>
  );
}
