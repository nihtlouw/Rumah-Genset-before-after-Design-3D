import { useMemo, type ReactNode } from 'react';
import * as THREE from 'three';
import { Edges, Html, Line } from '@react-three/drei';

export type V3 = [number, number, number];

export const ACCENT = '#c6f75c';
export const STEEL_NEW = '#31545a';
export const STEEL_OLD = '#3c7691';
export const AMBER = '#f2a65a';
export const STEEL_LIGHT = '#7ec8d8';

/* ------------------------------------------------------------------ */
/* Tekstur prosedural (canvas) — bikin render terasa "material"       */
/* ------------------------------------------------------------------ */
type TexKind = 'roof' | 'concrete' | 'panel' | 'plywood' | 'brick';

const cache = new Map<TexKind, THREE.Texture>();

function makeCanvas(w: number, h: number) {
  if (typeof document === 'undefined') return { canvas: null, ctx: null };
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return { canvas, ctx: canvas.getContext('2d') };
}

export function getTexture(kind: TexKind): THREE.Texture | null {
  const hit = cache.get(kind);
  if (hit) return hit;

  const { canvas, ctx } = makeCanvas(128, 128);
  if (!canvas || !ctx) return null;

  if (kind === 'roof') {
    // spandek: profil gelombang + garis sambungan
    ctx.fillStyle = '#98a2a0';
    ctx.fillRect(0, 0, 128, 128);
    for (let x = 0; x < 128; x += 16) {
      const grad = ctx.createLinearGradient(x, 0, x + 16, 0);
      grad.addColorStop(0, 'rgba(255,255,255,0.22)');
      grad.addColorStop(0.45, 'rgba(120,132,130,0.10)');
      grad.addColorStop(0.6, 'rgba(30,42,42,0.32)');
      grad.addColorStop(1, 'rgba(255,255,255,0.14)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, 0, 16, 128);
    }
    for (let y = 0; y < 128; y += 32) {
      ctx.fillStyle = 'rgba(28,38,38,0.22)';
      ctx.fillRect(0, y, 128, 1.2);
    }
  } else if (kind === 'concrete') {
    ctx.fillStyle = '#93958a';
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 1400; i += 1) {
      const light = Math.random() > 0.5;
      ctx.fillStyle = `rgba(${light ? '255,255,255' : '28,32,26'},${Math.random() * 0.09})`;
      ctx.fillRect(Math.random() * 128, Math.random() * 128, 1.6, 1.6);
    }
    // nat / sambungan plat
    ctx.strokeStyle = 'rgba(40,48,42,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 64);
    ctx.lineTo(128, 64);
    ctx.moveTo(64, 0);
    ctx.lineTo(64, 128);
    ctx.stroke();
  } else if (kind === 'panel') {
    // dinding panel seng: garis horizontal tiap 16px
    ctx.fillStyle = '#b3b7b2';
    ctx.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 16) {
      const grad = ctx.createLinearGradient(0, y, 0, y + 16);
      grad.addColorStop(0, 'rgba(255,255,255,0.28)');
      grad.addColorStop(0.7, 'rgba(140,148,142,0.06)');
      grad.addColorStop(1, 'rgba(38,48,44,0.28)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, y, 128, 16);
    }
  } else if (kind === 'plywood') {
    ctx.fillStyle = '#b58a5b';
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 70; i += 1) {
      ctx.strokeStyle = `rgba(${Math.random() > 0.5 ? '255,236,205' : '96,66,38'},${Math.random() * 0.14})`;
      ctx.lineWidth = Math.random() * 1.4;
      ctx.beginPath();
      const y = Math.random() * 128;
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(40, y + 4, 86, y - 4, 128, y + 1);
      ctx.stroke();
    }
  } else {
    // bata ringan: blok 32×16
    ctx.fillStyle = '#d7d2c7';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = 'rgba(120,116,104,0.35)';
    ctx.lineWidth = 1;
    for (let row = 0; row < 8; row += 1) {
      const y = row * 16;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(128, y);
      ctx.stroke();
      const offset = row % 2 === 0 ? 0 : 16;
      for (let x = offset; x <= 128; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 16);
        ctx.stroke();
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  cache.set(kind, texture);
  return texture;
}

export function useTexture(kind: TexKind, repeat: [number, number] = [1, 1]) {
  return useMemo(() => {
    const texture = getTexture(kind);
    if (!texture) return null;
    const clone = texture.clone();
    clone.needsUpdate = true;
    clone.wrapS = THREE.RepeatWrapping;
    clone.wrapT = THREE.RepeatWrapping;
    clone.repeat.set(repeat[0], repeat[1]);
    return clone;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, repeat[0], repeat[1]]);
}

/* ------------------------------------------------------------------ */
/* Balok berorientasi titik A → B (rangka baja)                       */
/* ------------------------------------------------------------------ */
export function Beam({
  a,
  b,
  size = 0.07,
  color = STEEL_NEW,
  metalness = 0.55,
  roughness = 0.42,
  highlight = false,
}: {
  a: V3;
  b: V3;
  size?: number;
  color?: string;
  metalness?: number;
  roughness?: number;
  highlight?: boolean;
}) {
  const { position, quaternion, length } = useMemo(() => {
    const start = new THREE.Vector3(...a);
    const end = new THREE.Vector3(...b);
    const dir = new THREE.Vector3().subVectors(end, start);
    const len = dir.length();
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return { position: start.clone().add(end).multiplyScalar(0.5), quaternion: quat, length: Math.max(len, 0.001) };
  }, [a[0], a[1], a[2], b[0], b[1], b[2]]);

  return (
    <mesh position={position} quaternion={quaternion} castShadow receiveShadow>
      <boxGeometry args={[size, length, size]} />
      <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
      {highlight ? <Edges color={ACCENT} threshold={30} /> : null}
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* Label pill di ruang 3D                                             */
/* ------------------------------------------------------------------ */
export function SceneLabel({
  position,
  title,
  subtitle,
  tone = ACCENT,
  distanceFactor = 11,
}: {
  position: V3;
  title: string;
  subtitle?: string;
  tone?: string;
  distanceFactor?: number;
}) {
  return (
    <Html center position={position} distanceFactor={distanceFactor} zIndexRange={[6, 0]} style={{ pointerEvents: 'none' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          whiteSpace: 'nowrap',
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          background: 'rgba(8,14,15,0.9)',
          border: '1px solid rgba(255,255,255,0.13)',
          borderRadius: 999,
          padding: '3px 8px',
          color: '#e7efe2',
          fontSize: 9,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          boxShadow: '0 6px 20px -10px rgba(0,0,0,0.9)',
        }}
      >
        <span style={{ width: 5, height: 5, borderRadius: 99, background: tone }} />
        {title}
        {subtitle ? <span style={{ color: 'rgba(231,239,226,0.45)' }}>{subtitle}</span> : null}
      </div>
    </Html>
  );
}

/* ------------------------------------------------------------------ */
/* Garis ukur 3D + label                                              */
/* ------------------------------------------------------------------ */
export function Measure({
  a,
  b,
  label,
  color = ACCENT,
  labelOffset = 0,
  opacity = 0.9,
}: {
  a: V3;
  b: V3;
  label: string;
  color?: string;
  labelOffset?: number;
  opacity?: number;
}) {
  const mid: V3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + labelOffset, (a[2] + b[2]) / 2];
  return (
    <group>
      <Line points={[a, b]} color={color} lineWidth={1} dashed dashSize={0.11} gapSize={0.07} transparent opacity={opacity} />
      <Html center position={mid} distanceFactor={10} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
        <div
          style={{
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: 10,
            lineHeight: 1,
            whiteSpace: 'nowrap',
            color: '#eef7da',
            background: 'rgba(8,14,15,0.88)',
            border: `1px solid ${color}55`,
            borderRadius: 4,
            padding: '3px 6px',
            letterSpacing: '0.03em',
            boxShadow: '0 2px 10px rgba(0,0,0,0.45)',
          }}
        >
          {label}
        </div>
      </Html>
    </group>
  );
}

export function DimensionTicks({ a, b, color = ACCENT }: { a: V3; b: V3; color?: string }) {
  const vertical = Math.abs(a[1] - b[1]) > Math.abs(a[0] - b[0]) + Math.abs(a[2] - b[2]);
  const size = 0.1;
  const tick = (point: V3): V3[] =>
    vertical
      ? [
          [point[0] - size, point[1], point[2]],
          [point[0] + size, point[1], point[2]],
        ]
      : [
          [point[0], point[1], point[2] - size],
          [point[0], point[1], point[2] + size],
        ];
  return (
    <group>
      <Line points={tick(a)} color={color} lineWidth={1} transparent opacity={0.62} />
      <Line points={tick(b)} color={color} lineWidth={1} transparent opacity={0.62} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Panel louver (ventilasi silang)                                    */
/* ------------------------------------------------------------------ */
export function LouverPanel({
  width,
  height,
  position,
  rotation = 0,
  color = '#5b6a63',
}: {
  width: number;
  height: number;
  position: V3;
  rotation?: number;
  color?: string;
}) {
  const slats = Math.max(4, Math.round(height / 0.16));
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh>
        <boxGeometry args={[width, height, 0.035]} />
        <meshStandardMaterial color="#2f3d39" roughness={0.8} />
      </mesh>
      {Array.from({ length: slats }).map((_, index) => {
        const y = -height / 2 + ((index + 0.5) * height) / slats;
        return (
          <mesh key={index} position={[0, y, 0.032]} rotation={[0.42, 0, 0]} castShadow>
            <boxGeometry args={[width - 0.03, Math.min(0.06, height / slats - 0.02), 0.1]} />
            <meshStandardMaterial color={color} metalness={0.35} roughness={0.55} />
          </mesh>
        );
      })}
      {[-1, 1].map((edge) => (
        <mesh key={edge} position={[(edge * width) / 2, 0, 0]}>
          <boxGeometry args={[0.045, height + 0.05, 0.075]} />
          <meshStandardMaterial color="#26332f" roughness={0.65} metalness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Drum / jerigen & meja material (properti servis)                   */
/* ------------------------------------------------------------------ */
export function Drum({ position, color, label }: { position: V3; color: string; label?: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.44, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.28, 0.28, 0.88, 20]} />
        <meshStandardMaterial color={color} roughness={0.55} metalness={0.2} />
      </mesh>
      {[0.22, 0.66].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <torusGeometry args={[0.283, 0.012, 6, 20]} />
          <meshStandardMaterial color="#1b2422" roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 0.885, 0]}>
        <cylinderGeometry args={[0.26, 0.26, 0.01, 20]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {label ? <SceneLabel position={[0, 1.16, 0]} title={label} distanceFactor={10} /> : null}
    </group>
  );
}

export function MaterialsBench({ position }: { position: V3 }) {
  return (
    <group position={position}>
      {[0, 0.06, 0.12, 0.18].map((y, index) => (
        <mesh key={y} position={[index * 0.02 - 0.03, y, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.4, 0.045, 0.66]} />
          <meshStandardMaterial color={index % 2 === 0 ? '#a67a4d' : '#b58a5b'} roughness={0.85} />
        </mesh>
      ))}
      <mesh position={[0.32, 0.3, 0]} castShadow>
        <boxGeometry args={[0.6, 0.26, 0.5]} />
        <meshStandardMaterial color="#c4bba3" roughness={0.9} />
      </mesh>
      <mesh position={[-0.6, 0.1, 0.1]} castShadow>
        <boxGeometry args={[0.55, 0.18, 0.46]} />
        <meshStandardMaterial color="#aeb3a2" roughness={0.9} />
      </mesh>
      <mesh position={[0.1, 0.02, 0]} receiveShadow>
        <boxGeometry args={[1.6, 0.02, 0.78]} />
        <meshStandardMaterial color="#3c4a44" roughness={0.85} />
      </mesh>
    </group>
  );
}

/** Silhouette lingkungan jauh (pebisnis sekitar) — halus, tidak mengganggu. */
export function Surroundings({ position, tone = '#16211f' }: { position: V3; tone?: string }): ReactNode {
  return (
    <group position={position}>
      <mesh position={[0, 3.4, 0]} receiveShadow>
        <boxGeometry args={[10, 6.8, 6]} />
        <meshStandardMaterial color={tone} roughness={0.95} />
      </mesh>
      <mesh position={[0, 6.85, 0]}>
        <boxGeometry args={[10.2, 0.12, 6.2]} />
        <meshStandardMaterial color="#1d2926" roughness={0.9} />
      </mesh>
    </group>
  );
}
