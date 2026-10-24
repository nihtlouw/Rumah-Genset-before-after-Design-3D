import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sky, ContactShadows } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Vector3 } from 'three';
import { Maximize2, Minimize2, Orbit, Move3d } from 'lucide-react';
import type { Design, POV, Variant, ViewOptions } from '../../types';
import { derive } from '../../lib/geometry';
import { cn } from '../../utils/cn';
import { Building, Context } from './Building';

export interface PovRequest {
  pov: POV;
  n: number;
}

export const POV_LIST: { id: POV; label: string; short: string; hint: string }[] = [
  { id: 'iso', label: 'Isometrik', short: 'ISO', hint: 'Tampak 3D dari depan–kanan–atas' },
  { id: 'front', label: 'Depan', short: 'DEPAN', hint: 'Sisi pintu masuk' },
  { id: 'back', label: 'Belakang', short: 'BELAKANG', hint: 'Sisi belakang bangunan' },
  { id: 'left', label: 'Kiri', short: 'KIRI', hint: 'Sisi perluasan / bekas jalur pagar' },
  { id: 'right', label: 'Kanan', short: 'KANAN', hint: 'Sisi kanan bangunan' },
  { id: 'top', label: 'Atas', short: 'ATAS', hint: 'Dilihat dari atas (atap)' },
  { id: 'isoBack', label: 'Iso belakang', short: 'ISO-B', hint: 'Tampak 3D dari belakang–kiri–atas' },
  { id: 'interior', label: 'Interior', short: 'INTERIOR', hint: 'Berdiri di dalam ruang, dekat pintu' },
];

function computePose(pov: POV, design: Design): { position: Vector3; target: Vector3 } {
  const g = derive(design);
  const W = g.totalWidth / 100;
  const D = g.depth / 100;
  const Hh = g.ridgeH / 100;
  const ox = g.totalWidth / 2;
  const oz = g.depth / 2;
  const X = (x: number) => (x - ox) / 100;
  const Z = (z: number) => (z - oz) / 100;
  const dist = Math.max(W, D, Hh);
  const c = new Vector3(0, Hh * 0.4, 0);
  switch (pov) {
    case 'iso':
      return { position: new Vector3(W * 0.9 + 4.5, Hh + 4, D * 0.9 + 4.5), target: c };
    case 'isoBack':
      return { position: new Vector3(-W * 0.9 - 4.5, Hh + 4, -D * 0.9 - 4.5), target: c };
    case 'front':
      return { position: new Vector3(0, Hh * 0.55, D / 2 + dist * 1.25 + 1), target: new Vector3(0, Hh * 0.45, 0) };
    case 'back':
      return { position: new Vector3(0, Hh * 0.55, -(D / 2 + dist * 1.25 + 1)), target: new Vector3(0, Hh * 0.45, 0) };
    case 'left':
      return { position: new Vector3(-(W / 2 + dist * 1.2 + 1), Hh * 0.55, 0), target: new Vector3(0, Hh * 0.45, 0) };
    case 'right':
      return { position: new Vector3(W / 2 + dist * 1.2 + 1, Hh * 0.55, 0), target: new Vector3(0, Hh * 0.45, 0) };
    case 'top':
      return { position: new Vector3(0, dist * 1.9 + 3, 0.02), target: new Vector3(0, 0, 0) };
    case 'interior': {
      const dr = design.door;
      let pos: Vector3;
      if (dr.wall === 'front') pos = new Vector3(X(dr.offset + dr.width / 2), 1.6, Z(design.depth) - 0.7);
      else if (dr.wall === 'back') pos = new Vector3(X(dr.offset + dr.width / 2), 1.6, Z(0) + 0.7);
      else if (dr.wall === 'left') pos = new Vector3(X(0) + 0.7, 1.6, Z(dr.offset + dr.width / 2));
      else pos = new Vector3(X(g.totalWidth) - 0.7, 1.6, Z(dr.offset + dr.width / 2));
      // target dekat kamera supaya drag = menoleh (look-around), bukan mengorbit jauh
      const dir = new Vector3(0, 1.3, 0).sub(pos).normalize();
      return { position: pos, target: pos.clone().add(dir.multiplyScalar(2.5)) };
    }
  }
}

function CameraRig({ request, design, autoRotate }: { request: PovRequest; design: Design; autoRotate: boolean }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const goal = useRef<{ position: Vector3; target: Vector3 } | null>(null);
  const { camera } = useThree();
  const lastN = useRef(-1);

  const pose = useMemo(() => computePose(request.pov, design), [request.pov, design]);

  useEffect(() => {
    if (request.n !== lastN.current) {
      lastN.current = request.n;
      goal.current = pose;
    }
  }, [pose, request.n]);

  // initial placement
  useEffect(() => {
    camera.position.copy(pose.position);
    if (controls.current) {
      controls.current.target.copy(pose.target);
      controls.current.update();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, dt) => {
    const gl = goal.current;
    const ctl = controls.current;
    if (!gl || !ctl) return;
    const k = 1 - Math.pow(0.0005, dt);
    camera.position.lerp(gl.position, k);
    ctl.target.lerp(gl.target, k);
    ctl.update();
    if (camera.position.distanceTo(gl.position) < 0.01 && ctl.target.distanceTo(gl.target) < 0.01) {
      camera.position.copy(gl.position);
      ctl.target.copy(gl.target);
      goal.current = null;
    }
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={0.4}
      maxDistance={80}
      maxPolarAngle={Math.PI / 2 - 0.01}
      autoRotate={autoRotate}
      autoRotateSpeed={0.8}
      onStart={() => {
        goal.current = null;
      }}
    />
  );
}

export function Viewer3D({
  design,
  options,
  request,
  mode,
  onPov,
  extraToolbar,
  className = '',
}: {
  design: Design;
  options: ViewOptions;
  request: PovRequest;
  mode: Variant;
  onPov?: (pov: POV) => void;
  extraToolbar?: ReactNode;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);

  useEffect(() => {
    const onChange = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen?.();
    else void wrapRef.current?.requestFullscreen?.();
  };

  const activePov = POV_LIST.find((item) => item.id === request.pov) ?? POV_LIST[0];

  return (
    <div
      ref={wrapRef}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/10 bg-[#0d1517] shadow-[0_30px_80px_-55px_rgba(0,0,0,1)]',
        full && 'flex h-screen w-screen flex-col justify-center rounded-none border-0',
        className,
      )}
    >
      {/* chrome atas */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded border border-white/10 bg-white/[0.04] text-lime">
            <Orbit size={12} />
          </span>
          <div>
            <p className="font-mono-tech text-[8px] uppercase tracking-[0.12em] text-mist-2">
              Model 3D · {mode === 'before' ? 'existing' : 'usulan'}
            </p>
            <p className="text-[11px] font-medium text-[#dfe7db]">
              {activePov.label}
              <span className="ml-1.5 font-mono-tech text-[9px] font-normal text-mist-2">/ {activePov.hint}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.02] px-2.5 py-1 font-mono-tech text-[8px] uppercase tracking-[0.08em] text-mist-2 sm:inline-flex">
            <Move3d size={10} /> drag orbit · scroll zoom
          </span>
          <button
            type="button"
            onClick={toggleFull}
            title={full ? 'Keluar dari layar penuh' : 'Tampilkan model 3D dalam layar penuh'}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1.5 font-mono-tech text-[8px] uppercase tracking-[0.08em] text-mist transition hover:border-lime/40 hover:text-lime"
          >
            {full ? <Minimize2 size={10} /> : <Maximize2 size={10} />}
            {full ? 'keluar' : 'layar penuh'}
          </button>
        </div>
      </div>

      {/* kanvas */}
      <div className={cn('relative', full ? 'min-h-0 flex-1' : 'h-[360px] sm:h-[460px] xl:h-[520px]')}>
        <Canvas
          shadows
          dpr={[1, 1.75]}
          camera={{ position: [12, 9, 12], fov: 45, near: 0.05, far: 600 }}
          gl={{ antialias: true, preserveDrawingBuffer: true }}
        >
          <Suspense fallback={null}>
            <Sky sunPosition={[40, 50, 20]} turbidity={6} rayleigh={1.2} distance={400} />
            <ambientLight intensity={0.7} />
            <hemisphereLight args={['#dbeafe', '#8a8f7a', 0.6]} />
            <directionalLight
              position={[14, 20, 10]}
              intensity={2.2}
              castShadow
              shadow-mapSize={[2048, 2048]}
              shadow-camera-left={-18}
              shadow-camera-right={18}
              shadow-camera-top={18}
              shadow-camera-bottom={-18}
              shadow-camera-near={1}
              shadow-camera-far={80}
              shadow-bias={-0.0004}
            />
            <Context design={design} show={options.showContext} />
            <Building design={design} options={options} />
            <ContactShadows position={[0, -0.1, 0]} opacity={0.35} scale={30} blur={2.2} far={6} />
            <CameraRig request={request} design={design} autoRotate={options.autoRotate} />
          </Suspense>
        </Canvas>

        {/* watermark skala */}
        <div className="pointer-events-none absolute bottom-2.5 left-3 rounded border border-black/10 bg-white/80 px-1.5 py-0.5 font-mono-tech text-[8px] uppercase tracking-[0.08em] text-[#3c4a44] backdrop-blur">
          {design.width} × {design.depth} cm · ridge {Math.round(derive(design).ridgeH)}
        </div>
      </div>

      {/* strip POV */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-t border-white/[0.08] bg-[#0b1214] px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span className="shrink-0 pr-1 font-mono-tech text-[8px] uppercase tracking-[0.1em] text-mist-2">POV</span>
        {POV_LIST.map((item) => (
          <button
            key={item.id}
            type="button"
            title={item.hint}
            onClick={() => onPov?.(item.id)}
            className={cn(
              'shrink-0 rounded-full border px-2.5 py-1.5 font-mono-tech text-[8.5px] uppercase tracking-[0.08em] transition',
              request.pov === item.id
                ? 'border-lime/40 bg-lime text-ink'
                : 'border-white/10 bg-white/[0.02] text-mist hover:border-white/25 hover:text-white',
            )}
          >
            {item.short}
          </button>
        ))}
      </div>

      {extraToolbar && (
        <div className="border-t border-white/[0.08] bg-[#0d1517] px-3 py-2.5">{extraToolbar}</div>
      )}
    </div>
  );
}
