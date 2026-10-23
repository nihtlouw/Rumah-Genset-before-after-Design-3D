import { Html, Line } from '@react-three/drei';

type V3 = [number, number, number];

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

interface Dim3Props {
  a: V3;
  b: V3;
  label: string;
  offset?: V3;
  color?: string;
  tone?: 'main' | 'sub' | 'new' | 'door';
}

const TONE: Record<string, string> = {
  main: 'bg-slate-900 text-white border-slate-900',
  sub: 'bg-white/95 text-slate-700 border-slate-300',
  new: 'bg-amber-400 text-amber-950 border-amber-500',
  door: 'bg-orange-100 text-orange-900 border-orange-300',
};

const LINE_COLOR: Record<string, string> = {
  main: '#0f172a',
  sub: '#475569',
  new: '#b45309',
  door: '#9a3412',
};

/** 3D architectural dimension line with HTML label */
export function Dim3({ a, b, label, offset = [0, 0, 0], color, tone = 'main' }: Dim3Props) {
  const pa = add(a, offset);
  const pb = add(b, offset);
  const mid: V3 = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2, (pa[2] + pb[2]) / 2];
  const c = color ?? LINE_COLOR[tone];
  const hasOffset = offset.some((v) => v !== 0);
  const len = Math.hypot(pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]);
  if (len < 0.005) return null;
  return (
    <group>
      <Line points={[pa, pb]} color={c} lineWidth={1.6} />
      {hasOffset && (
        <>
          <Line points={[a, pa]} color={c} lineWidth={0.8} dashed dashSize={0.06} gapSize={0.04} transparent opacity={0.7} />
          <Line points={[b, pb]} color={c} lineWidth={0.8} dashed dashSize={0.06} gapSize={0.04} transparent opacity={0.7} />
        </>
      )}
      <mesh position={pa}>
        <sphereGeometry args={[0.03, 10, 10]} />
        <meshBasicMaterial color={c} />
      </mesh>
      <mesh position={pb}>
        <sphereGeometry args={[0.03, 10, 10]} />
        <meshBasicMaterial color={c} />
      </mesh>
      <Html position={mid} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
        <div className={`px-1.5 py-0.5 rounded border text-[11px] font-mono font-semibold whitespace-nowrap shadow-sm ${TONE[tone]}`}>
          {label}
        </div>
      </Html>
    </group>
  );
}

export function Label3({
  position,
  text,
  tone = 'dark',
  small = false,
}: {
  position: V3;
  text: string;
  tone?: 'dark' | 'light' | 'new' | 'green' | 'blue';
  small?: boolean;
}) {
  const cls = {
    dark: 'bg-slate-900/90 text-white',
    light: 'bg-white/95 text-slate-800 border border-slate-200',
    new: 'bg-red-600 text-white',
    green: 'bg-emerald-600 text-white',
    blue: 'bg-blue-600 text-white',
  }[tone];
  return (
    <Html position={position} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
      <div className={`${small ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'} rounded-md font-semibold whitespace-nowrap shadow ${cls}`}>
        {text}
      </div>
    </Html>
  );
}
