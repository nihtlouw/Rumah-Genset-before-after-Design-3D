import { useCallback, useEffect, useState } from 'react';
import type { Design, Variant } from '../types';
import { DEFAULT_DESIGNS } from '../data/defaults';

/**
 * v2 = atap perluasan diubah dari miring (lean-to) menjadi DATAR.
 * Key dinaikkan supaya pengguna yang pernah membuka versi lama langsung
 * melihat desain datar yang benar (data lama tetap dimigrasikan bentuknya).
 */
const STORAGE_KEY = 'rumah-genset-designs-v2';
const LEGACY_KEYS = ['rumah-genset-designs-v1'];

type Designs = Record<Variant, Design>;

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Gabungkan data tersimpan dengan default supaya field baru tidak hilang / undefined. */
function normalize(raw: unknown): Designs | null {
  if (!raw || typeof raw !== 'object') return null;
  const parsed = raw as Partial<Designs>;
  if (!parsed.before || !parsed.after) return null;

  const merge = (variant: Variant): Design => {
    const base = DEFAULT_DESIGNS[variant];
    const src = parsed[variant] as Partial<Design> | undefined;
    if (!src) return structuredClone(base);
    return {
      ...base,
      ...src,
      id: variant,
      extension: { ...base.extension, ...(src.extension ?? {}) },
      door: { ...base.door, ...(src.door ?? {}) },
      fence: { ...base.fence, ...(src.fence ?? {}) },
      columns: Array.isArray(src.columns) ? src.columns : base.columns,
      gensets: Array.isArray(src.gensets) ? src.gensets : base.gensets,
      notes: Array.isArray(src.notes) ? src.notes : base.notes,
    };
  };

  const designs = { before: merge('before'), after: merge('after') };
  // sanity check angka penting, kalau rusak pakai default
  if (![designs.after.width, designs.after.depth, designs.after.wallHeight].every(isNum)) {
    return structuredClone(DEFAULT_DESIGNS);
  }
  return designs;
}

function load(): Designs {
  try {
    for (const key of [STORAGE_KEY, ...LEGACY_KEYS]) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const normalized = normalize(JSON.parse(raw));
      if (normalized) return normalized;
    }
  } catch {
    /* data rusak → pakai default */
  }
  return structuredClone(DEFAULT_DESIGNS);
}

export function useDesigns() {
  const [designs, setDesigns] = useState<Designs>(() => load());
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(designs));
      setSavedAt(Date.now());
    } catch {
      /* storage penuh / private mode */
    }
  }, [designs]);

  const update = useCallback((variant: Variant, fn: (d: Design) => Design) => {
    setDesigns((prev) => ({ ...prev, [variant]: fn(prev[variant]) }));
  }, []);

  const patch = useCallback(
    (variant: Variant, p: Partial<Design>) => update(variant, (d) => ({ ...d, ...p })),
    [update],
  );

  /** change extension width while keeping main-building elements in place */
  const setExtensionWidth = useCallback(
    (variant: Variant, newWidth: number) => {
      update(variant, (d) => {
        const oldExt = d.extension.enabled ? d.extension.width : 0;
        const newExt = d.extension.enabled ? newWidth : 0;
        const delta = newExt - oldExt;
        if (delta === 0) return { ...d, extension: { ...d.extension, width: newWidth } };
        return {
          ...d,
          extension: { ...d.extension, width: newWidth },
          columns: d.columns.map((c) => (c.x >= oldExt ? { ...c, x: c.x + delta } : c)),
          gensets: d.gensets.map((g) => (g.x >= oldExt ? { ...g, x: g.x + delta } : g)),
          door:
            (d.door.wall === 'front' || d.door.wall === 'back') && d.door.offset >= oldExt
              ? { ...d.door, offset: d.door.offset + delta }
              : d.door,
        };
      });
    },
    [update],
  );

  const setExtensionEnabled = useCallback(
    (variant: Variant, enabled: boolean) => {
      update(variant, (d) => {
        if (d.extension.enabled === enabled) return d;
        const delta = enabled ? d.extension.width : -d.extension.width;
        return {
          ...d,
          extension: { ...d.extension, enabled },
          columns: d.columns.map((c) => ({ ...c, x: Math.max(0, c.x + delta) })),
          gensets: d.gensets.map((g) => ({ ...g, x: Math.max(0, g.x + delta) })),
          door:
            d.door.wall === 'front' || d.door.wall === 'back'
              ? { ...d.door, offset: Math.max(0, d.door.offset + delta) }
              : d.door,
        };
      });
    },
    [update],
  );

  const reset = useCallback((variant?: Variant) => {
    setDesigns((prev) =>
      variant
        ? { ...prev, [variant]: structuredClone(DEFAULT_DESIGNS[variant]) }
        : structuredClone(DEFAULT_DESIGNS),
    );
  }, []);

  const importJson = useCallback((json: string) => {
    const parsed = normalize(JSON.parse(json));
    if (!parsed) throw new Error('Format tidak valid — harus berisi data BEFORE dan AFTER.');
    setDesigns(parsed);
  }, []);

  return { designs, update, patch, setExtensionWidth, setExtensionEnabled, reset, importJson, savedAt };
}

export type DesignsApi = ReturnType<typeof useDesigns>;
