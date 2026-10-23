import { useCallback, useEffect, useState } from 'react';
import type { Design, Variant } from '../types';
import { DEFAULT_DESIGNS } from '../data/defaults';

const STORAGE_KEY = 'rumah-genset-designs-v1';

type Designs = Record<Variant, Design>;

function load(): Designs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_DESIGNS);
    const parsed = JSON.parse(raw) as Designs;
    if (!parsed.before || !parsed.after) return structuredClone(DEFAULT_DESIGNS);
    return parsed;
  } catch {
    return structuredClone(DEFAULT_DESIGNS);
  }
}

export function useDesigns() {
  const [designs, setDesigns] = useState<Designs>(() => load());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(designs));
    } catch {
      /* ignore */
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
    const parsed = JSON.parse(json) as Designs;
    if (!parsed.before || !parsed.after) throw new Error('Format tidak valid');
    setDesigns(parsed);
  }, []);

  return { designs, update, patch, setExtensionWidth, setExtensionEnabled, reset, importJson };
}

export type DesignsApi = ReturnType<typeof useDesigns>;
