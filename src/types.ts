export type WallMaterial = 'spandek' | 'triplek' | 'bata';
export type WallSide = 'front' | 'back' | 'left' | 'right';
export type Variant = 'before' | 'after';

export interface ColumnDef {
  id: string;
  label: string;
  /** center x (cm) measured from far-left of total footprint (incl. extension) */
  x: number;
  /** center z (cm) measured from back wall (0) to front wall (depth) */
  z: number;
  size: number;
  isNew?: boolean;
}

export interface GensetDef {
  id: string;
  label: string;
  /** left edge x (cm) */
  x: number;
  /** back edge z (cm) */
  z: number;
  /** width along x (cm) */
  w: number;
  /** depth along z (cm) */
  d: number;
  /** height (cm) */
  h: number;
  /** foundation height (cm); 0 = tanpa pondasi */
  foundationH: number;
  color: string;
  isNew?: boolean;
}

export interface DoorDef {
  wall: WallSide;
  /** offset (cm) of the door's start edge from the wall's start (left for front/back, back for left/right) */
  offset: number;
  width: number;
  height: number;
}

export interface FenceDef {
  visible: boolean;
  /** gap (cm) between the left wall and the fence */
  gap: number;
  height: number;
}

export interface ExtensionDef {
  enabled: boolean;
  /** width of extension added to the LEFT (cm) */
  width: number;
  wallHeight: number;
  material: WallMaterial;
}

export interface Design {
  id: Variant;
  title: string;
  /** main building width (x, cm) */
  width: number;
  /** main building depth (z, cm) */
  depth: number;
  wallHeight: number;
  /** ridge rise above wall height (cm) */
  roofRise: number;
  overhang: number;
  wallMaterial: WallMaterial;
  extension: ExtensionDef;
  columns: ColumnDef[];
  gensets: GensetDef[];
  door: DoorDef;
  fence: FenceDef;
  notes: string[];
}

export type POV =
  | 'iso'
  | 'front'
  | 'back'
  | 'left'
  | 'right'
  | 'top'
  | 'interior'
  | 'isoBack';

export interface ViewOptions {
  showDimensions: boolean;
  showLabels: boolean;
  showRoof: boolean;
  transparentWalls: boolean;
  showContext: boolean;
  autoRotate: boolean;
}
