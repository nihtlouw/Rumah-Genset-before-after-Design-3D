import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Vector3 } from 'three';
import { Compass, Eye, Info, Layers3, Maximize2, Minimize2, RotateCw, Ruler, Tag, X } from 'lucide-react';
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

const TARGET_Y = (design: Design) => (design.wallHeight / 100) * 0.36;

function computePose(pov: POV, design: Design, aspect = 1.6): { position: Vector3; target: Vector3 } {
  const g = derive(design);
  const W = g.totalWidth / 100;
  const D = g.depth / 100;
  const Hh = g.ridgeH / 100;
  const dist = (Math.max(W, D, Hh) * 1.16 + 3.6) * (aspect < 1.05 ? 1.34 : 1);
  const height = Math.max(g.ridgeH, 380) / 100;
  const target = new Vector3(0, Math.min(1.7, TARGET_Y(design)), 0);
  const ox = g.totalWidth / 2;
  const oz = g.depth / 2;
  const X = (x: number) => (x - ox) / 100;
  const Z = (z: number) => (z - oz) / 100;

  switch (pov) {
    case 'iso':
      return { position: new Vector3(dist * 0.74, height * 1.42, dist * 0.92), target };
    case 'isoBack':
      return { position: new Vector3(-dist * 0.74, height * 1.42, -dist * 0.92), target };
    case 'front':
      return { position: new Vector3(0.01, height * 0.62, dist * 1.18), target };
    case 'back':
      return { position: new Vector3(-0.01, height * 0.62, -dist * 1.18), target };
    case 'left':
      return { position: new Vector3(-dist * 1.18, height * 0.6, 0.01), target };
    case 'right':
      return { position: new Vector3(dist * 1.18, height * 0.6, -0.01), target };
    case 'top':
      return { position: new Vector3(0.02, dist * 1.4, 0.9), target: new Vector3(0, 0.2, 0) };
    case 'interior': {
      const dr = design.door;
      let pos: Vector3;
      if (dr.wall === 'front') pos = new Vector3(X(dr.offset + dr.width / 2), 1.62, Z(design.depth) - 0.62);
      else if (dr.wall === 'back') pos = new Vector3(X(dr.offset + dr.width / 2), 1.62, Z(0) + 0.62);
      else if (dr.wall === 'left') pos = new Vector3(X(0) + 0.62, 1.62, Z(dr.offset + dr.width / 2));
      else pos = new Vector3(X(g.totalWidth) - 0.62, 1.62, Z(dr.offset + dr.width / 2));
      const dir = new Vector3(0, 1.32, 0).sub(pos).normalize();
      return { position: pos, target: pos.clone().add(dir.multiplyScalar(2.4)) };
    }
    default:
      return { position: new Vector3(dist * 0.74, height * 1.42, dist * 0.92), target };
  }
}

function CameraRig({ request, design, autoRotate }: { request: PovRequest; design: Design; autoRotate: boolean }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const goal = useRef<{ position: Vector3; target: Vector3 } | null>(null);
  const { camera, size } = useThree();
  const lastN = useRef(-1);
  const aspect = size.width / Math.max(size.height, 1);

  const pose = useMemo(() => computePose(request.pov, design, aspect), [request.pov, design, aspect]);

  useEffect(() => {
    if (request.n !== lastN.current) {
      lastN.current = request.n;
      goal.current = pose;
    }
  }, [pose, request.n]);

  useEffect(() => {
    camera.position.copy(pose.position);
    if (controls.current) {
      controls.current.target.copy(pose.target);
      controls.current.update();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, dt) => {
    const next = goal.current;
    const ctl = controls.current;
    if (!next || !ctl) return;
    const k = 1 - Math.pow(0.0018, Math.min(dt, 0.08));
    camera.position.lerp(next.position, k);
    ctl.target.lerp(next.target, k);
    ctl.update();
    if (camera.position.distanceTo(next.position) < 0.02 && ctl.target.distanceTo(next.target) < 0.02) {
      camera.position.copy(next.position);
      ctl.target.copy(next.target);
      goal.current = null;
    }
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.075}
      minDistance={0.6}
      maxDistance={42}
      minPolarAngle={0.06}
      maxPolarAngle={Math.PI / 2.04}
      autoRotate={autoRotate}
      autoRotateSpeed={0.62}
      target={[0, Math.min(1.7, TARGET_Y(design)), 0]}
      onStart={() => {
        goal.current = null;
      }}
    />
  );
}

/** Kompas di overlay HTML; jarum mengikuti azimuth kamera. */
function CompassSync({ needleRef }: { needleRef: React.RefObject<HTMLDivElement | null> }) {
  useFrame(({ camera }) => {
    if (!needleRef.current) return;
    const azimuth = Math.atan2(camera.position.x, camera.position.z);
    needleRef.current.style.transform = `rotate(${azimuth}rad)`;
  });
  return null;
}

function StudioLights() {
  return (
    <>
      <hemisphereLight args={['#d9f0f4', '#141c1a', 0.82]} />
      <ambientLight intensity={0.32} />
      <directionalLight
        position={[8.5, 12.5, 7.5]}
        intensity={2.35}
        color="#fff4dd"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-camera-near={0.5}
        shadow-camera-far={48}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-9, 6.5, -7]} intensity={0.85} color="#9ed9e4" />
      <directionalLight position={[0, 4, 11]} intensity={0.34} color="#e8f0db" />
      <spotLight position={[-6.5, 9, 8.5]} angle={0.8} penumbra={1} intensity={12} color="#e8f2da" distance={26} />
    </>
  );
}

export interface ViewerSelection {
  title: string;
  meta: string;
  dims?: { label: string; value: string }[];
}

export function Viewer3D({
  design,
  options,
  request,
  mode,
  onPov,
  onToggle,
  onReset,
  selectedId,
  onSelect,
  selection,
  className = '',
  extraToolbar,
}: {
  design: Design;
  options: ViewOptions;
  request: PovRequest;
  mode: Variant;
  onPov?: (pov: POV) => void;
  onToggle?: (key: keyof ViewOptions) => void;
  onReset?: () => void;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  selection?: ViewerSelection | null;
  className?: string;
  extraToolbar?: ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const needleRef = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);
  const [ready, setReady] = useState(false);

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
  const g = derive(design);

  const toggles: { key: keyof ViewOptions; label: string; icon: ReactNode }[] = [
    { key: 'showDimensions', label: 'Ukuran', icon: <Ruler size={11} /> },
    { key: 'showLabels', label: 'Label', icon: <Tag size={11} /> },
    { key: 'showRoof', label: options.showRoof ? 'Atap tertutup' : 'Atap dibuka', icon: <Layers3 size={11} /> },
    { key: 'transparentWalls', label: 'Dinding transparan', icon: <Eye size={11} /> },
    { key: 'showContext', label: 'Lingkungan', icon: <Layers3 size={11} /> },
  ];

  return (
    <div
      ref={wrapRef}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b1214] shadow-[0_30px_80px_-55px_rgba(0,0,0,1)]',
        full && 'flex h-screen w-screen flex-col rounded-none border-0 bg-ink',
        className,
      )}
    >
      {/* ---------------- CHROME ATAS ---------------- */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.07] px-3.5 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-md border border-lime/25 bg-lime/10 text-lime">
            <Compass size={12} />
          </span>
          <div>
            <p className="font-mono-tech text-[8px] uppercase tracking-[0.16em] text-mist-2">interactive model</p>
            <p className="text-[11.5px] font-medium text-[#dfe7de]">
              {mode === 'before' ? 'Eksisting / Before' : 'Usulan / After'} · skala 1:1
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onPov?.('iso')}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1.5 font-mono-tech text-[8px] uppercase tracking-[0.08em] text-mist transition hover:border-lime/40 hover:text-lime"
          >
            <Compass size={10} /> reset view
          </button>
          <button
            type="button"
            onClick={() => onToggle?.('autoRotate')}
            aria-pressed={options.autoRotate}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 font-mono-tech text-[8px] uppercase tracking-[0.08em] transition',
              options.autoRotate
                ? 'border-steel/50 bg-steel/10 text-steel'
                : 'border-white/10 bg-white/[0.03] text-mist hover:text-white',
            )}
          >
            <RotateCw size={10} className={options.autoRotate ? 'animate-spin' : ''} /> auto
          </button>
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

      {/* ---------------- STRIP POV ---------------- */}
      <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto border-b border-white/[0.07] px-3 py-2">
        <span className="mr-1 hidden shrink-0 font-mono-tech text-[8px] uppercase tracking-[0.14em] text-mist-2 sm:inline">
          POV
        </span>
        {POV_LIST.map((item, index) => (
          <button
            key={item.id}
            type="button"
            title={item.hint}
            aria-pressed={request.pov === item.id}
            onClick={() => onPov?.(item.id)}
            className={cn(
              'shrink-0 rounded-full border px-2.5 py-1.5 font-mono-tech text-[8.5px] uppercase tracking-[0.07em] transition',
              request.pov === item.id
                ? 'border-lime/60 bg-lime/[0.13] text-lime'
                : 'border-transparent text-mist-2 hover:border-white/10 hover:bg-white/[0.04] hover:text-white',
            )}
          >
            <span className="mr-1.5 opacity-45">{String(index + 1).padStart(2, '0')}</span>
            {item.short}
          </button>
        ))}
        <span className="ml-auto hidden shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-2 py-1 font-mono-tech text-[8px] uppercase tracking-[0.06em] text-mist-2 sm:inline-flex">
          <Eye size={9} /> drag orbit · scroll zoom
        </span>
      </div>

      {/* ---------------- KANVAS ---------------- */}
      <div
        className={cn(
          'relative w-full bg-[radial-gradient(ellipse_at_55%_18%,#1b2b2b_0%,#0d1618_46%,#080e10_100%)]',
          full ? 'min-h-0 flex-1' : 'h-[380px] sm:h-[470px] xl:h-[540px]',
        )}
      >
        <Canvas
          shadows
          dpr={[1, 1.8]}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          camera={{ position: [9, 7, 10], fov: 38, near: 0.1, far: 140 }}
          onCreated={() => setReady(true)}
          onPointerMissed={() => onSelect?.(null)}
        >
          <Suspense fallback={null}>
            <StudioLights />
            <CameraRig request={request} design={design} autoRotate={options.autoRotate} />
            <CompassSync needleRef={needleRef} />
            <Context design={design} show={options.showContext} />
            <Building design={design} options={options} selectedId={selectedId ?? null} onSelect={onSelect} />
          </Suspense>
        </Canvas>

        {!ready && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0b1315]">
            <div className="flex items-center gap-2.5 font-mono-tech text-[9px] uppercase tracking-[0.14em] text-mist">
              <span className="h-3 w-3 animate-spin rounded-full border border-lime/30 border-t-lime" />
              menyiapkan model 3d
            </div>
          </div>
        )}

        {/* badge kiri atas */}
        <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
          <span className="rounded-md border border-white/10 bg-black/45 px-2 py-1 font-mono-tech text-[8px] uppercase tracking-[0.1em] text-mist backdrop-blur">
            {mode === 'before' ? 'existing' : 'proposed'} · 3d
          </span>
          <span className="rounded-md border border-lime/25 bg-lime/[0.09] px-2 py-1 font-mono-tech text-[8px] uppercase tracking-[0.1em] text-lime backdrop-blur">
            pov {activePov.short}
          </span>
        </div>

        {/* kompas */}
        <div className="pointer-events-none absolute right-3 top-3 flex flex-col items-center gap-1">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/40 backdrop-blur">
            <div ref={needleRef} className="absolute inset-0">
              <svg viewBox="0 0 44 44" className="h-full w-full">
                <path d="M22 6 L26 22 L22 19 L18 22 Z" fill="#c6f75c" />
                <path d="M22 38 L18 22 L22 25 L26 22 Z" fill="#93a3a3" opacity="0.5" />
              </svg>
            </div>
            <span className="absolute -top-1 font-mono-tech text-[7px] text-mist-2">N</span>
          </div>
          <span className="font-mono-tech text-[7.5px] uppercase tracking-[0.1em] text-mist-2">orientasi</span>
        </div>

        {/* skala */}
        <div className="pointer-events-none absolute bottom-3 left-3 flex flex-col gap-1">
          <span className="rounded-md border border-white/10 bg-black/45 px-2 py-1 font-mono-tech text-[8px] uppercase tracking-[0.08em] text-mist-2 backdrop-blur">
            {g.totalWidth} × {g.depth} cm · ridge {g.ridgeH}
          </span>
          <span className="hidden rounded-md border border-white/10 bg-black/45 px-2 py-1 font-mono-tech text-[8px] uppercase tracking-[0.06em] text-mist-2 backdrop-blur sm:inline">
            render skematik · bukan gambar kerja
          </span>
        </div>

        {/* kartu elemen terpilih */}
        {selection ? (
          <div className="absolute bottom-3 right-3 z-20 w-[236px] max-w-[calc(100%-24px)] rounded-xl border border-lime/25 bg-[#0a1314]/95 p-3 shadow-2xl backdrop-blur-md">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-mono-tech text-[7.5px] uppercase tracking-[0.14em] text-lime">elemen terpilih</p>
                <p className="mt-1 truncate text-[12px] font-medium leading-tight text-[#eaf0e5]">{selection.title}</p>
                <p className="mt-0.5 font-mono-tech text-[8.5px] leading-relaxed text-mist-2">{selection.meta}</p>
              </div>
              <button
                type="button"
                aria-label="Tutup detail"
                onClick={() => onSelect?.(null)}
                className="rounded-full p-1 text-mist-2 transition hover:bg-white/10 hover:text-white"
              >
                <X size={11} />
              </button>
            </div>
            {selection.dims?.length ? (
              <div className="mt-2 space-y-1 border-t border-white/[0.08] pt-2">
                {selection.dims.slice(0, 4).map((dim) => (
                  <div key={dim.label} className="flex items-baseline justify-between gap-2">
                    <span className="text-[9px] text-mist-2">{dim.label}</span>
                    <span className="font-mono-tech text-[9px] text-[#dce6d8]">{dim.value}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="pointer-events-none absolute bottom-3 right-3 hidden items-center gap-1.5 rounded-md border border-white/10 bg-black/40 px-2 py-1 font-mono-tech text-[8px] uppercase tracking-[0.06em] text-mist-2 backdrop-blur sm:flex">
            <Info size={9} /> klik elemen untuk ukuran
          </div>
        )}
      </div>

      {/* ---------------- FOOTER TOGGLE ---------------- */}
      <div className="flex flex-wrap items-center gap-1.5 border-t border-white/[0.07] px-3 py-2.5">
        {toggles.map((toggle) => (
          <button
            key={toggle.key}
            type="button"
            aria-pressed={options[toggle.key]}
            onClick={() => onToggle?.(toggle.key)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 font-mono-tech text-[8.5px] uppercase tracking-[0.06em] transition',
              options[toggle.key]
                ? 'border-lime/30 bg-lime/[0.08] text-lime'
                : 'border-white/10 bg-white/[0.02] text-mist-2 hover:text-white',
            )}
          >
            {toggle.icon}
            {toggle.label}
          </button>
        ))}
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="rounded-full border border-white/10 px-2.5 py-1.5 font-mono-tech text-[8.5px] uppercase tracking-[0.06em] text-mist-2 transition hover:border-lime/40 hover:text-lime"
          >
            ↺ reset tampilan
          </button>
        )}
        <span className="ml-auto hidden font-mono-tech text-[8px] uppercase tracking-[0.06em] text-mist-2 lg:inline">
          {design.gensets.length} zona genset · eave {design.wallHeight} · ridge +{design.roofRise}
        </span>
        {extraToolbar ? <div className="w-full">{extraToolbar}</div> : null}
      </div>
    </div>
  );
}
