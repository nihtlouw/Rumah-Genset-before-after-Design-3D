import { useMemo } from 'react';
import { DoubleSide } from 'three';
import { Edges, Grid } from '@react-three/drei';
import type { Design, ViewOptions } from '../../types';
import { derive } from '../../lib/geometry';
import { MATERIAL_COLOR } from '../../data/defaults';
import {
  ACCENT,
  AMBER,
  Beam,
  DimensionTicks,
  Drum,
  LouverPanel,
  MaterialsBench,
  Measure,
  SceneLabel,
  STEEL_LIGHT,
  STEEL_NEW,
  STEEL_OLD,
  useTexture,
  type V3,
} from './studio';

export type SceneSelection = (id: string | null) => void;

const MATERIAL_TEXTURE = {
  spandek: 'panel',
  triplek: 'plywood',
  bata: 'brick',
} as const;

/* ------------------------------------------------------------------ */
/* Kuda-kuda baja (rafters + batang web)                              */
/* ------------------------------------------------------------------ */
function Truss({
  z,
  x0,
  x1,
  wallH,
  ridgeH,
  eaveH,
  eaveL,
  eaveR,
  steel,
}: {
  z: number;
  x0: number;
  x1: number;
  wallH: number;
  ridgeH: number;
  eaveH: number;
  eaveL: number;
  eaveR: number;
  steel: string;
}) {
  const cx = (x0 + x1) / 2;
  const halfL = (cx - eaveL) / 2;
  const halfR = (eaveR - cx) / 2;
  const midY = (wallH + ridgeH) / 2;
  return (
    <group>
      <Beam a={[cx, ridgeH, z]} b={[eaveL, eaveH, z]} size={0.075} color={steel} />
      <Beam a={[cx, ridgeH, z]} b={[eaveR, eaveH, z]} size={0.075} color={steel} />
      <Beam a={[x0, wallH, z]} b={[x1, wallH, z]} size={0.075} color={steel} />
      <Beam a={[cx, wallH, z]} b={[cx, ridgeH - 0.04, z]} size={0.055} color={steel} />
      <Beam a={[cx - halfL, midY, z]} b={[cx + halfR, midY, z]} size={0.045} color={steel} />
      <Beam a={[cx - halfL, wallH, z]} b={[cx - halfL, midY, z]} size={0.04} color={steel} />
      <Beam a={[cx + halfR, wallH, z]} b={[cx + halfR, midY, z]} size={0.04} color={steel} />
      <Beam a={[cx - halfL, midY, z]} b={[cx, ridgeH - 0.05, z]} size={0.035} color={steel} />
      <Beam a={[cx + halfR, midY, z]} b={[cx, ridgeH - 0.05, z]} size={0.035} color={steel} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Badan genset lengkap (pondasi, louver, panel kontrol, cerobong)     */
/* ------------------------------------------------------------------ */
function GensetUnit({
  unit,
  ridgeH,
  selected,
  onSelect,
  showLabels,
  X,
  Z,
}: {
  unit: Design['gensets'][number];
  ridgeH: number;
  selected: boolean;
  onSelect: SceneSelection;
  showLabels: boolean;
  X: (v: number) => number;
  Z: (v: number) => number;
}) {
  const w = unit.w / 100;
  const d = unit.d / 100;
  const h = unit.h / 100;
  const fh = unit.foundationH / 100;
  const cx = X(unit.x + unit.w / 2);
  const cz = Z(unit.z + unit.d / 2);
  const isNew = !!unit.isNew;
  const longAlongX = w >= d;
  const bodyColor = isNew ? '#4c5a52' : unit.color || '#4b7440';
  const bind = {
    onClick: (event: { stopPropagation: () => void }) => {
      event.stopPropagation();
      onSelect(unit.id);
    },
    onPointerOver: (event: { stopPropagation: () => void }) => {
      event.stopPropagation();
      document.body.style.cursor = 'pointer';
    },
    onPointerOut: () => {
      document.body.style.cursor = 'auto';
    },
  };

  const base = fh;
  const pipeBase = base + h + 0.03;
  const pipeTop = Math.max(ridgeH + 0.4, pipeBase + 0.8);

  return (
    <group position={[cx, 0, cz]}>
      <group {...bind}>
        {fh > 0 && (
          <mesh position={[0, fh / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[w + 0.2, fh, d + 0.2]} />
            <meshStandardMaterial color="#9a9b8c" roughness={0.92} />
            <Edges color={selected ? ACCENT : '#5f6a5c'} threshold={25} />
          </mesh>
        )}
        <mesh position={[0, base + h / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color={bodyColor} roughness={0.55} metalness={0.22} />
          <Edges color={selected ? ACCENT : '#16241f'} threshold={28} />
        </mesh>
        {/* tutup atas */}
        <mesh position={[0, base + h + 0.02, 0]} castShadow>
          <boxGeometry args={[w + 0.04, 0.04, d + 0.04]} />
          <meshStandardMaterial color={isNew ? '#2c3a34' : '#35502f'} roughness={0.6} metalness={0.3} />
        </mesh>
        {/* louver ventilasi */}
        {Array.from({ length: 5 }).map((_, index) => {
          const y = base + h * 0.24 + index * Math.min(0.075, (h * 0.42) / 5);
          return (
            <mesh
              key={`vent-${index}`}
              position={longAlongX ? [0, y, d / 2 + 0.006] : [w / 2 + 0.006, y, 0]}
              rotation={longAlongX ? [0, 0, 0] : [0, Math.PI / 2, 0]}
            >
              <boxGeometry args={[(longAlongX ? w : d) * 0.26, 0.022, 0.016]} />
              <meshStandardMaterial color="#15231f" roughness={0.8} />
            </mesh>
          );
        })}
        {/* panel kontrol */}
        <mesh position={longAlongX ? [w / 2 - 0.22, base + h * 0.62, d / 2 + 0.012] : [w / 2 + 0.012, base + h * 0.58, d / 2 - 0.22]}>
          <boxGeometry args={[0.26, 0.2, 0.02]} />
          <meshStandardMaterial color="#dce4cf" roughness={0.55} />
        </mesh>
        <mesh position={longAlongX ? [w / 2 - 0.29, base + h * 0.62, d / 2 + 0.024] : [w / 2 + 0.024, base + h * 0.58, d / 2 - 0.29]}>
          <boxGeometry args={[0.035, 0.035, 0.02]} />
          <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={1.4} />
        </mesh>
        {/* label pelat nama */}
        <mesh position={[-w * 0.26, base + h * 0.26, d / 2 + 0.012]}>
          <boxGeometry args={[Math.min(0.16, w * 0.18), 0.1, 0.012]} />
          <meshStandardMaterial color="#e6dbc9" roughness={0.85} />
        </mesh>
        {/* cerobong exhaust di atas atap */}
        <mesh position={[w * 0.28, (pipeBase + pipeTop) / 2, -d * 0.22]} castShadow>
          <cylinderGeometry args={[0.072, 0.072, pipeTop - pipeBase, 14]} />
          <meshStandardMaterial color="#77837d" metalness={0.75} roughness={0.32} />
        </mesh>
        <mesh position={[w * 0.28, pipeTop + 0.04, -d * 0.22]}>
          <cylinderGeometry args={[0.13, 0.09, 0.1, 14]} />
          <meshStandardMaterial color="#46534e" metalness={0.7} roughness={0.4} />
        </mesh>
        {/* pipa bahan bakar */}
        <mesh position={[-w * 0.32, base + 0.06, d / 2 + 0.02]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.018, 0.018, 0.3, 8]} />
          <meshStandardMaterial color="#7c8b84" metalness={0.6} roughness={0.45} />
        </mesh>
      </group>

      {showLabels && (
        <SceneLabel
          position={[0, base + h + 0.45, d / 2 + 0.05]}
          title={isNew ? 'Genset baru' : 'Existing'}
          subtitle={`${unit.w}×${unit.d}×${unit.h}`}
          tone={isNew ? ACCENT : STEEL_LIGHT}
        />
      )}
      {selected && (
        <mesh position={[0, base + h / 2, d / 2 + 0.09]}>
          <boxGeometry args={[w + 0.03, h + 0.03, 0.01]} />
          <meshBasicMaterial color={ACCENT} transparent opacity={0.14} />
        </mesh>
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* SCENE                                                              */
/* ------------------------------------------------------------------ */
export function Building({
  design,
  options,
  selectedId,
  onSelect,
}: {
  design: Design;
  options: ViewOptions;
  selectedId?: string | null;
  onSelect?: SceneSelection;
}) {
  const d = design;
  const g = derive(d);
  const X = (x: number) => (x - g.totalWidth / 2) / 100;
  const Z = (z: number) => (z - g.depth / 2) / 100;
  const H = (h: number) => h / 100;

  const pick = onSelect ?? (() => undefined);
  const isAfter = d.extension.enabled;
  const steel = isAfter ? STEEL_NEW : STEEL_OLD;

  const roofTex = useTexture('roof', [4, 10]);
  const concreteTex = useTexture('concrete', [6, 6]);
  const slabTex = useTexture('concrete', [4, 4]);

  const roofLen = (g.roofZ1 - g.roofZ0) / 100;
  const roofZc = (g.roofZ0 + g.roofZ1) / 2;
  const cxMain = (g.mainX0 + g.mainX1) / 2;
  const tan = Math.tan(g.pitch);
  const ridgeY = H(g.ridgeH);
  const eaveY = H(g.eaveH);
  const wallY = H(g.wallH);
  const canopyY = g.canopy ? H(g.canopy.y) : 0;
  const extW = H(g.ext);

  const trussZs = useMemo(() => {
    const count = Math.max(3, Math.round(d.depth / 180) + 1);
    return Array.from({ length: count }, (_, index) => (index * d.depth) / (count - 1));
  }, [d.depth]);

  const purlinOffsets = useMemo(() => {
    const list: number[] = [];
    for (let u = 55; u < g.halfSpan - 12; u += 95) list.push(u);
    list.push(g.halfSpan - 14);
    return list;
  }, [g.halfSpan]);

  const fenceX = -(d.fence.visible ? d.fence.gap : 0);
  const padX0 = Math.min(fenceX, 0) - 160;
  const padX1 = g.totalWidth + 160;
  const padZ0 = -190;
  const padZ1 = d.depth + 230;

  const bindId = (id: string) => ({
    onClick: (event: { stopPropagation: () => void }) => {
      event.stopPropagation();
      pick(id);
    },
    onPointerOver: (event: { stopPropagation: () => void }) => {
      event.stopPropagation();
      document.body.style.cursor = 'pointer';
    },
    onPointerOut: () => {
      document.body.style.cursor = 'auto';
    },
  });

  return (
    <group>
      {/* ---------------- GROUND / STUDIO ---------------- */}
      <Grid
        position={[0, -0.14, 0]}
        args={[48, 48]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#22312f"
        sectionSize={2.5}
        sectionThickness={0.9}
        sectionColor="#3a4c49"
        fadeDistance={26}
        fadeStrength={1.5}
        infiniteGrid
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.18, 0]} receiveShadow>
        <circleGeometry args={[26, 56]} />
        <meshStandardMaterial color="#0a1112" roughness={0.96} />
      </mesh>

      {/* pad beton kerja */}
      <group {...bindId('site')}>
        <mesh
          position={[X((padX0 + padX1) / 2), -0.1, Z((padZ0 + padZ1) / 2)]}
          receiveShadow
        >
          <boxGeometry args={[(padX1 - padX0) / 100, 0.16, (padZ1 - padZ0) / 100]} />
          <meshStandardMaterial map={concreteTex ?? undefined} color="#8e9288" roughness={0.94} />
          <Edges color="#4d5850" threshold={30} />
        </mesh>
      </group>

      {/* ---------------- LANTAI ---------------- */}
      <mesh position={[X(g.totalWidth / 2), -0.055, Z(d.depth / 2)]} receiveShadow>
        <boxGeometry args={[g.totalWidth / 100 + 0.06, 0.11, d.depth / 100 + 0.06]} />
        <meshStandardMaterial map={slabTex ?? undefined} color="#b6b7a7" roughness={0.9} />
        <Edges color="#6a7364" threshold={28} />
      </mesh>

      {/* marka lantai + area perluasan */}
      {isAfter && (
        <group>
          <mesh position={[X(g.ext / 2), 0.004, Z(d.depth / 2)]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[g.ext / 100, d.depth / 100]} />
            <meshStandardMaterial color="#d9d2b0" roughness={0.92} />
          </mesh>
          <mesh position={[X(cxMain), H(4), Z(d.depth - 32)]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[d.width / 100 - 0.5, 0.06]} />
            <meshStandardMaterial color={ACCENT} roughness={0.7} />
          </mesh>
          <mesh position={[X(g.mainX0), 0.006, Z(d.depth / 2)]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.03, d.depth / 100]} />
            <meshBasicMaterial color={AMBER} transparent opacity={0.55} />
          </mesh>
        </group>
      )}

      {/* ---------------- PAGAR BRC ---------------- */}
      {d.fence.visible && (
        <group {...bindId('fence')}>
          {Array.from({ length: Math.max(3, Math.round(d.depth / 150)) + 1 }).map((_, index) => {
            const z = (index * d.depth) / Math.max(3, Math.round(d.depth / 150));
            return (
              <group key={index}>
                <mesh position={[X(fenceX), H(d.fence.height / 2), Z(z)]} castShadow>
                  <boxGeometry args={[0.06, H(d.fence.height), 0.06]} />
                  <meshStandardMaterial color="#4a5a54" metalness={0.45} roughness={0.55} />
                </mesh>
                <mesh position={[X(fenceX), H(d.fence.height) + 0.02, Z(z)]}>
                  <cylinderGeometry args={[0.035, 0.035, 0.05, 8]} />
                  <meshStandardMaterial color="#5b6c65" metalness={0.5} roughness={0.5} />
                </mesh>
              </group>
            );
          })}
          {[0.97, 0.12].map((t) => (
            <Beam
              key={t}
              a={[X(fenceX), H(d.fence.height * t), Z(0)]}
              b={[X(fenceX), H(d.fence.height * t), Z(d.depth)]}
              size={0.04}
              color="#57675f"
              metalness={0.4}
              roughness={0.6}
            />
          ))}
          <mesh position={[X(fenceX), H(d.fence.height / 2), Z(d.depth / 2)]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry
              args={[d.depth / 100, H(d.fence.height), Math.max(6, Math.round(d.depth / 18)), Math.max(3, Math.round(d.fence.height / 18))]}
            />
            <meshBasicMaterial color="#7d8d84" wireframe transparent opacity={0.45} side={DoubleSide} />
          </mesh>
          {options.showLabels && (
            <SceneLabel
              position={[X(fenceX), H(d.fence.height) + 0.3, Z(d.depth * 0.72)]}
              title={isAfter ? 'Pagar digeser' : 'Pagar existing'}
              tone={isAfter ? ACCENT : STEEL_LIGHT}
            />
          )}
        </group>
      )}

      {/* ---------------- KOLOM ---------------- */}
      {d.columns.map((column) => {
        const height = isAfter && column.x < g.ext ? H(g.canopy?.wallH ?? g.wallH) : wallY;
        const selected = selectedId === column.id;
        return (
          <group key={column.id} position={[X(column.x), 0, Z(column.z)]} {...bindId(column.id)}>
            <mesh position={[0, 0.02, 0]} receiveShadow>
              <boxGeometry args={[column.size / 100 + 0.14, 0.04, column.size / 100 + 0.14]} />
              <meshStandardMaterial color="#4f5b55" metalness={0.5} roughness={0.5} />
            </mesh>
            <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[column.size / 100, height, column.size / 100]} />
              <meshStandardMaterial
                color={column.isNew ? '#3f5b58' : steel}
                metalness={column.isNew ? 0.3 : 0.55}
                roughness={column.isNew ? 0.6 : 0.4}
              />
              <Edges color={selected ? ACCENT : '#1d3033'} threshold={30} />
            </mesh>
            {options.showLabels && (column.isNew || selected) && (
              <SceneLabel
                position={[0, height + 0.22, 0]}
                title={column.label}
                subtitle={column.isNew ? 'baru' : undefined}
                tone={column.isNew ? AMBER : STEEL_LIGHT}
                distanceFactor={9}
              />
            )}
          </group>
        );
      })}

      {/* ---------------- DINDING ---------------- */}
      <group {...bindId('walls')}>
        {g.walls.map((wall) => (
          <WallPanel
            key={wall.id}
            wall={wall}
            X={X}
            Z={Z}
            H={H}
            totalWidth={g.totalWidth}
            isAfter={isAfter}
            transparent={options.transparentWalls}
          />
        ))}
      </group>

      {/* ---------------- BALOK KELILING ---------------- */}
      {[
        { from: [X(g.mainX0), wallY, Z(0)] as V3, to: [X(g.mainX1), wallY, Z(0)] as V3 },
        { from: [X(g.mainX0), wallY, Z(d.depth)] as V3, to: [X(g.mainX1), wallY, Z(d.depth)] as V3 },
        { from: [X(g.mainX0), wallY, Z(0)] as V3, to: [X(g.mainX0), wallY, Z(d.depth)] as V3 },
        { from: [X(g.mainX1), wallY, Z(0)] as V3, to: [X(g.mainX1), wallY, Z(d.depth)] as V3 },
      ].map((beam, index) => (
        <Beam key={`ring-${index}`} a={beam.from} b={beam.to} size={0.13} color={steel} />
      ))}

      {isAfter && g.canopy && (
        <group>
          <Beam a={[X(0), canopyY - 0.06, Z(0)]} b={[X(0), canopyY - 0.06, Z(d.depth)]} size={0.11} color="#5b6a62" />
          <Beam a={[X(0), canopyY - 0.06, Z(0)]} b={[X(g.mainX0), canopyY - 0.06, Z(0)]} size={0.1} color="#5b6a62" />
          <Beam a={[X(0), canopyY - 0.06, Z(d.depth)]} b={[X(g.mainX0), canopyY - 0.06, Z(d.depth)]} size={0.1} color="#5b6a62" />
        </group>
      )}

      {/* ---------------- KUDA-KUDA ---------------- */}
      {trussZs.map((z) => (
        <Truss
          key={`truss-${z}`}
          z={Z(z)}
          x0={X(g.mainX0)}
          x1={X(g.mainX1)}
          wallH={wallY}
          ridgeH={ridgeY - 0.06}
          eaveH={eaveY - 0.06}
          eaveL={X(g.mainX0 - d.overhang)}
          eaveR={X(g.mainX1 + d.overhang)}
          steel={steel}
        />
      ))}

      {/* gording */}
      {([-1, 1] as const).map((sign) =>
        purlinOffsets.map((u, index) => (
          <Beam
            key={`purlin-${sign}-${index}`}
            a={[X(cxMain + sign * u), H(g.ridgeH - u * tan - 7), Z(g.roofZ0)]}
            b={[X(cxMain + sign * u), H(g.ridgeH - u * tan - 7), Z(g.roofZ1)]}
            size={0.055}
            color={sign > 0 ? '#3b6a6d' : steel}
            metalness={0.5}
            roughness={0.5}
          />
        )),
      )}

      {/* ---------------- ATAP PELANA ---------------- */}
      {options.showRoof && (
        <group {...bindId('roof')}>
          {([-1, 1] as const).map((sign) => {
            const slope = g.slopeLen / 100;
            const centerX = X(cxMain + (sign * g.halfSpan) / 2);
            const centerY = H(g.ridgeH - (g.halfSpan / 2) * tan);
            const selected = selectedId === 'roof';
            return (
              <mesh
                key={`slope-${sign}`}
                position={[centerX, centerY, Z(roofZc)]}
                rotation={[0, 0, -sign * g.pitch]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[slope, 0.06, roofLen]} />
                <meshStandardMaterial
                  map={roofTex ?? undefined}
                  color={selected ? '#c3e0a9' : '#8d9894'}
                  metalness={0.5}
                  roughness={0.5}
                />
                {selected ? <Edges color={ACCENT} threshold={25} /> : null}
              </mesh>
            );
          })}
          {/* bubungan */}
          <mesh position={[X(cxMain), ridgeY + 0.01, Z(roofZc)]} castShadow>
            <boxGeometry args={[0.26, 0.09, roofLen + 0.03]} />
            <meshStandardMaterial color="#55625f" metalness={0.6} roughness={0.4} />
          </mesh>
          {/* lisplang eave kiri & kanan */}
          {([-1, 1] as const).map((sign) => (
            <mesh key={`fascia-${sign}`} position={[X(cxMain + (sign * (d.width / 2 + d.overhang))), eaveY - 0.06, Z(roofZc)]} castShadow>
              <boxGeometry args={[0.07, 0.17, roofLen]} />
              <meshStandardMaterial color="#495451" metalness={0.5} roughness={0.45} />
            </mesh>
          ))}
          {/* talang depan & belakang */}
          {[g.roofZ0, g.roofZ1].map((z, index) => (
            <mesh key={`gutter-${index}`} position={[X(cxMain), H(g.eaveH) - 0.09, Z(z)]} castShadow>
              <boxGeometry args={[d.width / 100 + 0.02, 0.07, 0.1]} />
              <meshStandardMaterial color="#5c6a66" metalness={0.55} roughness={0.4} />
            </mesh>
          ))}
          {options.showLabels && (
            <SceneLabel
              position={[X(cxMain), ridgeY + 0.55, Z(roofZc)]}
              title={isAfter ? 'Rumah genset · after' : 'Rumah genset · existing'}
              subtitle={isAfter ? 'atap pelana + datar' : 'atap pelana'}
              tone={ACCENT}
              distanceFactor={13}
            />
          )}
        </group>
      )}

      {/* ---------------- ATAP DATAR PERLUASAN ---------------- */}
      {g.canopy && (
        <group {...bindId('canopy')}>
          {options.showRoof && (
            <>
              <mesh position={[X((g.canopy.x0 + g.canopy.x1) / 2), canopyY, Z(roofZc)]} castShadow receiveShadow>
                <boxGeometry args={[g.canopy.len / 100, 0.055, roofLen]} />
                <meshStandardMaterial
                  map={roofTex ?? undefined}
                  color={selectedId === 'canopy' ? '#c3e0a9' : '#7f8b86'}
                  metalness={0.5}
                  roughness={0.55}
                />
                <Edges color={selectedId === 'canopy' ? ACCENT : '#3e4a45'} threshold={28} />
              </mesh>
              {/* talang tepi luar */}
              <mesh position={[X(g.canopy.x0), canopyY - 0.1, Z(roofZc)]} castShadow>
                <boxGeometry args={[0.1, 0.26, roofLen]} />
                <meshStandardMaterial color="#5b665f" metalness={0.55} roughness={0.4} />
              </mesh>
              {[g.roofZ0, g.roofZ1].map((z, index) => (
                <mesh key={`canopy-trim-${index}`} position={[X((g.canopy!.x0 + g.canopy!.x1) / 2), canopyY - 0.09, Z(z)]}>
                  <boxGeometry args={[g.canopy!.len / 100, 0.18, 0.07]} />
                  <meshStandardMaterial color="#5b665f" metalness={0.55} roughness={0.4} />
                </mesh>
              ))}
              {/* talang turun */}
              <mesh position={[X(g.canopy.x0 + 6), canopyY / 2, Z(g.roofZ1 - 6)]} castShadow>
                <cylinderGeometry args={[0.035, 0.035, canopyY, 10]} />
                <meshStandardMaterial color="#6f7c77" metalness={0.7} roughness={0.35} />
              </mesh>
            </>
          )}
          {/* rangka atap datar */}
          {trussZs.map((z) => (
            <group key={`flat-beam-${z}`}>
              <Beam
                a={[X(g.canopy!.x0 + 4), canopyY - 0.1, Z(z)]}
                b={[X(g.canopy!.x1), canopyY - 0.1, Z(z)]}
                size={0.075}
                color="#5f6f68"
              />
            </group>
          ))}
          {options.showLabels && (
            <SceneLabel
              position={[X((g.canopy.x0 + g.canopy.x1) / 2), canopyY + 0.34, Z(g.roofZ1 - 55)]}
              title="Atap datar perluasan"
              subtitle={`t ${Math.round(g.canopy.y)}`}
              tone={ACCENT}
              distanceFactor={12}
            />
          )}
        </group>
      )}

      {/* ---------------- PINTU ---------------- */}
      <group {...bindId('door')}>
        {(() => {
          const dr = d.door;
          const isFrontBack = dr.wall === 'front' || dr.wall === 'back';
          const center: V3 = isFrontBack
            ? [X(dr.offset + dr.width / 2), H(dr.height / 2), Z(dr.wall === 'front' ? d.depth + 2 : -2)]
            : [X(dr.wall === 'left' ? -2 : g.totalWidth + 2), H(dr.height / 2), Z(dr.offset + dr.width / 2)];
          const args: V3 = isFrontBack ? [dr.width / 100, dr.height / 100, 0.07] : [0.07, dr.height / 100, dr.width / 100];
          const selected = selectedId === 'door';
          return (
            <group>
              <mesh position={center} castShadow>
                <boxGeometry args={args} />
                <meshStandardMaterial color={selected ? '#8b9a72' : '#3f4c47'} roughness={0.62} metalness={0.28} />
                <Edges color={selected ? ACCENT : '#22302c'} threshold={30} />
              </mesh>
              <mesh position={[center[0], H(dr.height) + 0.035, center[2]]}>
                <boxGeometry
                  args={isFrontBack ? [dr.width / 100 + 0.12, 0.07, 0.09] : [0.09, 0.07, dr.width / 100 + 0.12]}
                />
                <meshStandardMaterial color="#303f3a" metalness={0.45} roughness={0.5} />
              </mesh>
              {[-1, 1].map((side) => (
                <mesh
                  key={side}
                  position={
                    isFrontBack
                      ? [center[0] + (side * (dr.width / 100 + 0.05)) / 2, H(dr.height / 2), center[2]]
                      : [center[0], H(dr.height / 2), center[2] + (side * (dr.width / 100 + 0.05)) / 2]
                  }
                >
                  <boxGeometry
                    args={isFrontBack ? [0.06, dr.height / 100 + 0.06, 0.09] : [0.09, dr.height / 100 + 0.06, 0.06]}
                  />
                  <meshStandardMaterial color="#303f3a" metalness={0.45} roughness={0.5} />
                </mesh>
              ))}
              <mesh
                position={
                  isFrontBack
                    ? [center[0] - dr.width / 200 + 0.06, H(dr.height * 0.48), center[2] + 0.03]
                    : [center[0] + 0.03, H(dr.height * 0.48), center[2] - dr.width / 200 + 0.06]
                }
              >
                <boxGeometry args={[0.03, 0.22, 0.04]} />
                <meshStandardMaterial color={ACCENT} metalness={0.5} roughness={0.3} />
              </mesh>
              {options.showLabels && (
                <SceneLabel
                  position={[center[0], H(dr.height) + 0.32, center[2]]}
                  title={`Akses ${dr.width}×${dr.height}`}
                  tone={AMBER}
                  distanceFactor={10}
                />
              )}
            </group>
          );
        })()}
      </group>

      {/* ---------------- GENSET ---------------- */}
      {d.gensets.map((unit) => (
        <GensetUnit
          key={unit.id}
          unit={unit}
          ridgeH={ridgeY}
          selected={selectedId === unit.id}
          onSelect={pick}
          showLabels={options.showLabels}
          X={X}
          Z={Z}
        />
      ))}

      {/* ---------------- PROPERTI SERVIS ---------------- */}
      <group>
        <Drum position={[X(72), 0, Z(d.depth - 96)]} color="#a8493e" label={options.showLabels ? 'drum oli' : undefined} />
        <Drum position={[X(72), 0, Z(d.depth - 176)]} color="#3c7f8b" />
        <MaterialsBench position={[X(g.totalWidth - 92), 0, Z(58)]} />
        <mesh position={[X(g.totalWidth - 48), 0.42, Z(d.depth - 42)]} castShadow>
          <cylinderGeometry args={[0.13, 0.15, 0.84, 14]} />
          <meshStandardMaterial color="#b83f33" roughness={0.5} />
        </mesh>
      </group>

      {/* ---------------- UKURAN 3D ---------------- */}
      {options.showDimensions && (
        <group>
          <Measure
            a={[X(0), 0.03, Z(d.depth) + 0.6]}
            b={[X(g.totalWidth), 0.03, Z(d.depth) + 0.6]}
            label={`${g.totalWidth} cm`}
          />
          <DimensionTicks a={[X(0), 0.03, Z(d.depth) + 0.6]} b={[X(g.totalWidth), 0.03, Z(d.depth) + 0.6]} />
          <Measure
            a={[X(g.totalWidth) + 0.6, 0.03, Z(0)]}
            b={[X(g.totalWidth) + 0.6, 0.03, Z(d.depth)]}
            label={`${d.depth} cm`}
          />
          <DimensionTicks a={[X(g.totalWidth) + 0.6, 0.03, Z(0)]} b={[X(g.totalWidth) + 0.6, 0.03, Z(d.depth)]} />

          <Measure
            a={[X(g.mainX1) + 0.32, 0, Z(d.depth) + 0.32]}
            b={[X(g.mainX1) + 0.32, wallY, Z(d.depth) + 0.32]}
            label={`eave ${d.wallHeight}`}
            color={STEEL_LIGHT}
          />
          <Measure
            a={[X(cxMain), wallY, Z(d.depth) + 0.42]}
            b={[X(cxMain), ridgeY, Z(d.depth) + 0.42]}
            label={`+${d.roofRise} atap`}
            color={STEEL_LIGHT}
          />
          <Measure
            a={[X(doorCenterOf(d, g)), H(d.door.height), Z(d.depth) + 0.55]}
            b={[X(doorCenterOf(d, g) + d.door.width), H(d.door.height), Z(d.depth) + 0.55]}
            label={`pintu ${d.door.width}`}
            color={AMBER}
          />
          {g.canopy && (
            <>
              <Measure
                a={[X(g.canopy.x0), 0, Z(d.depth) + 0.75]}
                b={[X(g.canopy.x0), canopyY, Z(d.depth) + 0.75]}
                label={`atap datar ${Math.round(g.canopy.y)}`}
                color={ACCENT}
              />
              <Measure
                a={[X(g.canopy.x0), canopyY + 0.02, Z(g.roofZ0) - 0.3]}
                b={[X(g.canopy.x1), canopyY + 0.02, Z(g.roofZ0) - 0.3]}
                label={`lebar ${Math.round(g.canopy.len)}`}
                color={ACCENT}
              />
            </>
          )}
          {d.extension.enabled && (
            <Measure
              a={[X(0), 0.05, Z(d.depth) + 0.28]}
              b={[X(g.ext), 0.05, Z(d.depth) + 0.28]}
              label={`${g.ext}`}
              color={ACCENT}
            />
          )}
          {d.gensets.map((unit) => (
            <group key={`measure-${unit.id}`}>
              <Measure
                a={[X(unit.x), H(unit.foundationH + unit.h) + 0.05, Z(unit.z)]}
                b={[X(unit.x + unit.w), H(unit.foundationH + unit.h) + 0.05, Z(unit.z)]}
                label={`${unit.w}`}
                color={unit.isNew ? AMBER : STEEL_LIGHT}
              />
              <Measure
                a={[X(unit.x + unit.w) + 0.12, H(unit.foundationH), Z(unit.z)]}
                b={[X(unit.x + unit.w) + 0.12, H(unit.foundationH + unit.h), Z(unit.z)]}
                label={`t ${unit.h}`}
                color={unit.isNew ? AMBER : STEEL_LIGHT}
              />
              {unit.foundationH > 0 && (
                <Measure
                  a={[X(unit.x + unit.w + 10) + 0.22, 0, Z(unit.z + unit.d + 10)]}
                  b={[X(unit.x + unit.w + 10) + 0.22, H(unit.foundationH), Z(unit.z + unit.d + 10)]}
                  label={`pondasi ${unit.foundationH}`}
                  color={AMBER}
                />
              )}
            </group>
          ))}
          {d.gensets.length > 1 &&
            (() => {
              const sorted = [...d.gensets].sort((a, b) => a.z - b.z);
              const gapStart = sorted[0].z + sorted[0].d;
              const gapEnd = sorted[1].z;
              if (gapEnd - gapStart < 2) return null;
              return (
                <Measure
                  a={[X(g.totalWidth) + 0.3, 0.35, Z(gapStart)]}
                  b={[X(g.totalWidth) + 0.3, 0.35, Z(gapEnd)]}
                  label={`clear ${Math.round(gapEnd - gapStart)}`}
                  color={AMBER}
                />
              );
            })()}
          <Measure
            a={[X(d.columns[0]?.x ?? 0) - 0.34, 0.04, Z((d.columns[0]?.z ?? 0) - 40)]}
            b={[X(d.columns[0]?.x ?? 0) + 0.1, 0.04, Z((d.columns[0]?.z ?? 0) - 40)]}
            label={`kolom ${d.columns[0]?.size ?? 30}×${d.columns[0]?.size ?? 30}`}
            color={STEEL_LIGHT}
          />
        </group>
      )}

      {extW > 0 && options.showLabels && (
        <SceneLabel
          position={[X(g.ext / 2), 0.32, Z(d.depth * 0.86)]}
          title={`Area perluasan ${g.ext} cm`}
          tone={ACCENT}
          distanceFactor={12}
        />
      )}

    </group>
  );
}

const doorCenterOf = (d: Design, g: ReturnType<typeof derive>) =>
  (d.door.wall === 'front' || d.door.wall === 'back' ? d.door.offset : g.totalWidth / 2) + 0;

/* ------------------------------------------------------------------ */
/* Panel dinding (material + louver ventilasi)                        */
/* ------------------------------------------------------------------ */
function WallPanel({
  wall,
  X,
  Z,
  H,
  totalWidth,
  isAfter,
  transparent,
}: {
  wall: ReturnType<typeof derive>['walls'][number];
  X: (v: number) => number;
  Z: (v: number) => number;
  H: (v: number) => number;
  totalWidth: number;
  isAfter: boolean;
  transparent: boolean;
}) {
  const len = (wall.a1 - wall.a0) / 100;
  const height = (wall.y1 - wall.y0) / 100;
  const isX = wall.axis === 'x';
  const color = MATERIAL_COLOR[wall.material] ?? '#b3b7b2';
  const texture = useTexture(MATERIAL_TEXTURE[wall.material], [
    Math.max(1, Math.round(len * 1.5)),
    Math.max(1, Math.round(height * 1.5)),
  ]);
  if (len <= 0.01 || height <= 0.01) return null;

  const position: V3 = isX
    ? [X((wall.a0 + wall.a1) / 2), H((wall.y0 + wall.y1) / 2), Z(wall.at)]
    : [X(wall.at), H((wall.y0 + wall.y1) / 2), Z((wall.a0 + wall.a1) / 2)];
  const args: V3 = isX ? [len, height, 0.07] : [0.07, height, len];
  const louverH = Math.min(0.5, height * 0.2);

  return (
    <group>
      <mesh position={position} castShadow={!transparent} receiveShadow>
        <boxGeometry args={args} />
        <meshStandardMaterial
          map={texture ?? undefined}
          color={texture ? '#d9dcd4' : color}
          metalness={wall.material === 'spandek' ? 0.45 : 0.05}
          roughness={wall.material === 'spandek' ? 0.42 : 0.85}
          transparent={transparent}
          opacity={transparent ? 0.26 : 1}
          side={transparent ? DoubleSide : undefined}
        />
        {!transparent ? <Edges color="#2a3835" threshold={32} /> : null}
      </mesh>
      {wall.axis === 'z' && wall.y1 - wall.y0 > 120 && !transparent && (
        <LouverPanel
          width={Math.min(len * 0.62, 2.2)}
          height={louverH}
          position={[
            position[0] + (wall.at > totalWidth / 2 ? 0.045 : -0.045),
            position[1] + height / 2 - louverH / 2 - 0.16,
            position[2],
          ]}
          rotation={Math.PI / 2}
          color={isAfter ? '#6d7c74' : '#708089'}
        />
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Lingkungan sekitar — silhouette halus                              */
/* ------------------------------------------------------------------ */
export function Context({ design, show }: { design: Design; show: boolean }) {
  const g = derive(design);
  const W = g.totalWidth / 100;
  const D = g.depth / 100;
  if (!show) return null;
  return (
    <group>
      {[
        { x: W * 0.75, z: -D / 2 - 9, w: 7, h: 5.4, d: 5 },
        { x: -W * 0.9, z: -D / 2 - 12, w: 5, h: 7.2, d: 4 },
        { x: W * 0.2, z: -D / 2 - 15, w: 9, h: 4.2, d: 5 },
      ].map((block, index) => (
        <group key={index} position={[block.x, 0, block.z]}>
          <mesh position={[0, block.h / 2, 0]} receiveShadow>
            <boxGeometry args={[block.w, block.h, block.d]} />
            <meshStandardMaterial color="#131d1c" roughness={0.95} />
          </mesh>
          <mesh position={[0, block.h + 0.03, 0]}>
            <boxGeometry args={[block.w + 0.1, 0.06, block.d + 0.1]} />
            <meshStandardMaterial color="#1b2725" roughness={0.9} />
          </mesh>
        </group>
      ))}
      {[
        [W / 2 + 3.4, D / 2 + 1.6],
        [-W / 2 - 3.2, D / 2 + 2.4],
      ].map(([x, z], index) => (
        <group key={`tree-${index}`} position={[x, 0, z]}>
          <mesh position={[0, 1.5, 0]} castShadow>
            <cylinderGeometry args={[0.09, 0.14, 3, 8]} />
            <meshStandardMaterial color="#3f3a2c" roughness={0.95} />
          </mesh>
          <mesh position={[0, 3.3, 0]} castShadow>
            <sphereGeometry args={[1.15, 12, 10]} />
            <meshStandardMaterial color="#2c4634" roughness={0.95} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
