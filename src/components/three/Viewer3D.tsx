import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sky, ContactShadows } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Vector3 } from 'three';
import type { Design, POV, ViewOptions } from '../../types';
import { derive } from '../../lib/geometry';
import { Building, Context } from './Building';

export interface PovRequest {
  pov: POV;
  n: number;
}

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
  className = '',
}: {
  design: Design;
  options: ViewOptions;
  request: PovRequest;
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

  return (
    <div ref={wrapRef} className={`relative overflow-hidden bg-sky-100 ${className}`}>
      <button
        type="button"
        onClick={toggleFull}
        title={full ? 'Keluar dari layar penuh' : 'Tampilkan model 3D dalam layar penuh'}
        className="absolute right-3 top-3 z-10 rounded-md border border-slate-300 bg-white/90 px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-sm backdrop-blur hover:bg-white"
      >
        {full ? '✕ Keluar layar penuh' : '⛶ Layar penuh'}
      </button>
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
    </div>
  );
}
