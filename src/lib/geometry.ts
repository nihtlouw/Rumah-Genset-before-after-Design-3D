import type { Design, WallMaterial } from '../types';

export interface WallSegment {
  id: string;
  /** axis along which the wall runs */
  axis: 'x' | 'z';
  /** start / end along axis (cm) */
  a0: number;
  a1: number;
  /** fixed coordinate (cm) on the other axis */
  at: number;
  /** bottom & top heights (cm) */
  y0: number;
  y1: number;
  material: WallMaterial;
  isNew?: boolean;
}

export interface Derived {
  ext: number;
  totalWidth: number;
  depth: number;
  mainX0: number;
  mainX1: number;
  wallH: number;
  ridgeH: number;
  /** roof pitch angle in radians */
  pitch: number;
  pitchDeg: number;
  eaveH: number;
  /** horizontal half-extent of each roof slope incl. overhang */
  halfSpan: number;
  slopeLen: number;
  roofZ0: number;
  roofZ1: number;
  /**
   * Atap DATAR (flat roof) untuk perluasan sisi kiri.
   * Permukaan atap rata & sejajar lantai, menempel ke dinding utama
   * di bawah tritisan atap pelana (lihat sketsa).
   */
  canopy: null | {
    /** tepi luar atap (cm, termasuk tritisan) */
    x0: number;
    /** tepi dalam atap = dinding kiri bangunan utama */
    x1: number;
    /** tinggi permukaan atas atap (cm) */
    y: number;
    /** tinggi dinding perluasan (mengikuti tinggi atap datar) */
    wallH: number;
    /** lebar atap (cm) */
    len: number;
    /** true bila tinggi dinding perluasan dibatasi agar tidak menembus atap pelana */
    capped: boolean;
    /** luas atap datar (m2, termasuk tritisan) */
    area: number;
  };
  walls: WallSegment[];
  floorArea: number; // m2
  addedArea: number; // m2
  roofArea: number; // m2
  foundationVolume: number; // m3
  wallArea: number; // m2
}

export function derive(d: Design): Derived {
  const ext = d.extension.enabled ? d.extension.width : 0;
  const totalWidth = ext + d.width;
  const mainX0 = ext;
  const mainX1 = ext + d.width;
  const wallH = d.wallHeight;
  const ridgeH = wallH + d.roofRise;
  const pitch = Math.atan2(d.roofRise, d.width / 2);
  const halfSpan = d.width / 2 + d.overhang;
  const slopeLen = halfSpan / Math.cos(pitch);
  const eaveH = ridgeH - halfSpan * Math.tan(pitch);
  const roofZ0 = -d.overhang;
  const roofZ1 = d.depth + d.overhang;

  // ---- atap datar perluasan -------------------------------------------
  // Tinggi maksimum = sedikit di bawah tepi tritisan atap pelana supaya
  // atap datar tidak menembus bidang atap utama.
  const canopyYMax = eaveH - 6;
  const canopyY = Math.min(d.extension.enabled ? d.extension.wallHeight : wallH, canopyYMax);
  let canopy: Derived['canopy'] = null;
  if (d.extension.enabled) {
    const x0 = -d.overhang * 0.6;
    const x1 = mainX0;
    const len = x1 - x0;
    canopy = {
      x0,
      x1,
      y: canopyY,
      wallH: canopyY,
      len,
      capped: d.extension.wallHeight > canopyYMax + 0.5,
      area: (len * (roofZ1 - roofZ0)) / 10000,
    };
  }

  // ---- walls -----------------------------------------------------------
  const walls: WallSegment[] = [];
  const mainMat = d.wallMaterial;
  const extMat = d.extension.material;
  // tinggi dinding perluasan = tinggi atap datar (agar atap menumpu dinding)
  const extH = canopy ? canopy.wallH : wallH;

  const door = d.door;
  const pushWithDoor = (
    seg: Omit<WallSegment, 'id'>,
    idBase: string,
    doorOnThisWall: boolean,
  ) => {
    if (!doorOnThisWall) {
      walls.push({ ...seg, id: idBase });
      return;
    }
    const ds = door.offset;
    const de = door.offset + door.width;
    // pieces: before door, after door, above door
    if (ds > seg.a0) walls.push({ ...seg, id: idBase + '-a', a1: Math.min(ds, seg.a1) });
    if (de < seg.a1) walls.push({ ...seg, id: idBase + '-b', a0: Math.max(de, seg.a0) });
    const top = Math.min(door.height, seg.y1);
    if (top < seg.y1)
      walls.push({
        ...seg,
        id: idBase + '-top',
        a0: Math.max(ds, seg.a0),
        a1: Math.min(de, seg.a1),
        y0: top,
      });
  };

  const doorSpansExt = (wall: 'front' | 'back') =>
    door.wall === wall && d.extension.enabled && door.offset < ext;
  const doorSpansMain = (wall: 'front' | 'back') =>
    door.wall === wall && door.offset + door.width > ext;

  // back wall (z = 0)
  if (d.extension.enabled)
    pushWithDoor(
      { axis: 'x', a0: 0, a1: ext, at: 0, y0: 0, y1: extH, material: extMat, isNew: true },
      'back-ext',
      doorSpansExt('back'),
    );
  pushWithDoor(
    { axis: 'x', a0: mainX0, a1: mainX1, at: 0, y0: 0, y1: wallH, material: mainMat },
    'back-main',
    doorSpansMain('back'),
  );
  // front wall (z = depth)
  if (d.extension.enabled)
    pushWithDoor(
      { axis: 'x', a0: 0, a1: ext, at: d.depth, y0: 0, y1: extH, material: extMat, isNew: true },
      'front-ext',
      doorSpansExt('front'),
    );
  pushWithDoor(
    { axis: 'x', a0: mainX0, a1: mainX1, at: d.depth, y0: 0, y1: wallH, material: mainMat },
    'front-main',
    doorSpansMain('front'),
  );
  // left wall (x = 0)
  pushWithDoor(
    {
      axis: 'z',
      a0: 0,
      a1: d.depth,
      at: 0,
      y0: 0,
      y1: d.extension.enabled ? extH : wallH,
      material: d.extension.enabled ? extMat : mainMat,
      isNew: d.extension.enabled,
    },
    'left',
    door.wall === 'left',
  );
  // right wall (x = totalWidth)
  pushWithDoor(
    { axis: 'z', a0: 0, a1: d.depth, at: totalWidth, y0: 0, y1: wallH, material: mainMat },
    'right',
    door.wall === 'right',
  );

  // ---- quantities -------------------------------------------------------
  const floorArea = (totalWidth * d.depth) / 10000;
  const addedArea = (ext * d.depth) / 10000;
  const mainRoofArea = (2 * slopeLen * (roofZ1 - roofZ0)) / 10000;
  const canopyArea = canopy ? canopy.area : 0;
  const roofArea = mainRoofArea + canopyArea;
  const foundationVolume = d.gensets.reduce(
    (s, g) => s + (g.foundationH > 0 ? ((g.w + 20) * (g.d + 20) * g.foundationH) / 1e6 : 0),
    0,
  );
  const wallArea = walls.reduce((s, w) => s + ((w.a1 - w.a0) * (w.y1 - w.y0)) / 10000, 0);

  return {
    ext,
    totalWidth,
    depth: d.depth,
    mainX0,
    mainX1,
    wallH,
    ridgeH,
    pitch,
    pitchDeg: (pitch * 180) / Math.PI,
    eaveH,
    halfSpan,
    slopeLen,
    roofZ0,
    roofZ1,
    canopy,
    walls,
    floorArea,
    addedArea,
    roofArea,
    foundationVolume,
    wallArea,
  };
}

export const fmt = (n: number, digits = 0) =>
  n.toLocaleString('id-ID', { maximumFractionDigits: digits, minimumFractionDigits: digits });

export const cm = (n: number) => `${fmt(n)} cm`;
export const m2 = (n: number) => `${fmt(n, 2)} m²`;
export const m3 = (n: number) => `${fmt(n, 2)} m³`;

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const snap = (v: number, step = 5) => Math.round(v / step) * step;
