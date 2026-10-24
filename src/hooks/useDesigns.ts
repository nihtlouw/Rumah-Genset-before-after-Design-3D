import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Design, Variant } from '../types';
import { DEFAULT_DESIGNS } from '../data/defaults';

/* ------------------------------------------------------------------ */
/* Penyimpanan                                                        */
/* ------------------------------------------------------------------ */
/**
 * v3 = penyimpanan draf otomatis + RIWAYAT VERSI tersimpan.
 *  - `DRAFT_KEY`    : kondisi kerja terakhir (autosave setiap perubahan)
 *  - `VERSIONS_KEY` : daftar versi yang disimpan pengguna (snapshot before+after)
 */
export const DRAFT_KEY = 'rumah-genset.draft.v3';
export const VERSIONS_KEY = 'rumah-genset.versions.v3';
const ACTIVE_KEY = 'rumah-genset.activeVersion.v3';
const LEGACY_KEYS = ['rumah-genset-designs-v2', 'rumah-genset-designs-v1'];

export type Designs = Record<Variant, Design>;

export interface DesignVersion {
  id: string;
  name: string;
  note?: string;
  createdAt: number;
  updatedAt: number;
  /** snapshot lengkap before + after */
  designs: Designs;
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

const clone = <T,>(value: T): T =>
  typeof structuredClone === 'function' ? structuredClone(value) : (JSON.parse(JSON.stringify(value)) as T);

/** Gabungkan data tersimpan dengan default supaya field baru tidak hilang / undefined. */
function normalize(raw: unknown): Designs | null {
  if (!raw || typeof raw !== 'object') return null;
  const parsed = raw as Partial<Designs>;
  if (!parsed.before || !parsed.after) return null;

  const merge = (variant: Variant): Design => {
    const base = DEFAULT_DESIGNS[variant];
    const src = parsed[variant] as Partial<Design> | undefined;
    if (!src) return clone(base);
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
  if (![designs.after.width, designs.after.depth, designs.after.wallHeight].every(isNum)) {
    return clone(DEFAULT_DESIGNS);
  }
  return designs;
}

function loadDraft(): Designs {
  try {
    for (const key of [DRAFT_KEY, ...LEGACY_KEYS]) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const normalized = normalize(JSON.parse(raw));
      if (normalized) return normalized;
    }
  } catch {
    /* data rusak → pakai default */
  }
  return clone(DEFAULT_DESIGNS);
}

function loadVersions(): DesignVersion[] {
  try {
    const raw = localStorage.getItem(VERSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is DesignVersion => !!item && typeof item.id === 'string' && !!item.designs)
      .map((item) => ({
        ...item,
        name: item.name || 'Tanpa nama',
        createdAt: item.createdAt ?? Date.now(),
        updatedAt: item.updatedAt ?? item.createdAt ?? Date.now(),
        designs: normalize(item.designs) ?? clone(DEFAULT_DESIGNS),
      }));
  } catch {
    return [];
  }
}

const serialize = (designs: Designs) => JSON.stringify(designs);
const newId = () => `v-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const stamp = () =>
  new Date().toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

/* ------------------------------------------------------------------ */
/* Hook                                                               */
/* ------------------------------------------------------------------ */
export function useDesigns() {
  const [designs, setDesigns] = useState<Designs>(() => loadDraft());
  const [versions, setVersions] = useState<DesignVersion[]>(() => loadVersions());
  const [activeVersionId, setActiveVersionId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(ACTIVE_KEY);
    } catch {
      return null;
    }
  });
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [lastAction, setLastAction] = useState<{ tone: 'ok' | 'warn'; text: string; at: number } | null>(null);

  const activeVersion = useMemo(
    () => versions.find((version) => version.id === activeVersionId) ?? null,
    [versions, activeVersionId],
  );

  const dirty = useMemo(
    () => (activeVersion ? serialize(activeVersion.designs) !== serialize(designs) : false),
    [activeVersion, designs],
  );

  /* --- autosave draf ---------------------------------------------------- */
  const designsRef = useRef(designs);
  designsRef.current = designs;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(designs));
        setSavedAt(Date.now());
      } catch {
        /* storage penuh / private mode */
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [designs]);

  /* --- versi aktif tetap tersimpan antar reload ------------------------- */
  useEffect(() => {
    try {
      if (activeVersionId) localStorage.setItem(ACTIVE_KEY, activeVersionId);
      else localStorage.removeItem(ACTIVE_KEY);
    } catch {
      /* ignore */
    }
  }, [activeVersionId]);

  // versi aktif yang sudah dihapus / data dibersihkan → lepaskan penanda
  useEffect(() => {
    if (activeVersionId && !versions.some((version) => version.id === activeVersionId)) {
      setActiveVersionId(null);
    }
  }, [activeVersionId, versions]);

  /* --- simpan daftar versi ---------------------------------------------- */
  useEffect(() => {
    try {
      localStorage.setItem(VERSIONS_KEY, JSON.stringify(versions));
    } catch {
      /* ignore */
    }
  }, [versions]);

  const notify = useCallback((text: string, tone: 'ok' | 'warn' = 'ok') => {
    setLastAction({ text, tone, at: Date.now() });
  }, []);

  /* --- editing ---------------------------------------------------------- */
  const update = useCallback((variant: Variant, fn: (d: Design) => Design) => {
    setDesigns((prev) => ({ ...prev, [variant]: fn(prev[variant]) }));
  }, []);

  const patch = useCallback(
    (variant: Variant, p: Partial<Design>) => update(variant, (d) => ({ ...d, ...p })),
    [update],
  );

  /** ubah lebar perluasan sambil menjaga posisi elemen bangunan utama */
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

  /* --- versi ------------------------------------------------------------ */
  const versionsRef = useRef(versions);
  versionsRef.current = versions;

  /**
   * Simpan snapshot desain saat ini sebagai versi.
   * - dengan `id`  → perbarui versi itu (seperti “Save” pada file)
   * - tanpa `id`   → buat versi baru (seperti “Save as…”)
   */
  const saveVersion = useCallback(
    (name?: string, id?: string | null) => {
      const trimmed = (name ?? '').trim();
      const snapshot = clone(designsRef.current);

      if (id) {
        const existing = versionsRef.current.find((version) => version.id === id);
        if (existing) {
          const updated: DesignVersion = {
            ...existing,
            name: trimmed || existing.name,
            updatedAt: Date.now(),
            designs: snapshot,
          };
          setVersions((prev) => prev.map((version) => (version.id === id ? updated : version)));
          setActiveVersionId(id);
          notify(`Versi “${updated.name}” diperbarui · ${stamp()}`);
          return updated;
        }
      }

      const created: DesignVersion = {
        id: newId(),
        name: trimmed || `Versi ${versionsRef.current.length + 1}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        designs: snapshot,
      };
      setVersions((prev) => [created, ...prev]);
      setActiveVersionId(created.id);
      notify(trimmed ? `Versi “${created.name}” tersimpan · ${stamp()}` : `Versi baru tersimpan · ${stamp()}`);
      return created;
    },
    [notify],
  );

  const applyVersion = useCallback(
    (id: string) => {
      const version = versions.find((item) => item.id === id);
      if (!version) return;
      setDesigns(clone(version.designs));
      setActiveVersionId(id);
      notify(`Memuat versi “${version.name}”`);
    },
    [versions, notify],
  );

  const deleteVersion = useCallback(
    (id: string) => {
      const version = versions.find((item) => item.id === id);
      setVersions((prev) => prev.filter((item) => item.id !== id));
      if (activeVersionId === id) setActiveVersionId(null);
      if (version) notify(`Versi “${version.name}” dihapus`, 'warn');
    },
    [versions, activeVersionId, notify],
  );

  const renameVersion = useCallback((id: string, name: string) => {
    setVersions((prev) =>
      prev.map((version) => (version.id === id ? { ...version, name: name.trim() || version.name } : version)),
    );
  }, []);

  const duplicateVersion = useCallback(
    (id: string) => {
      const version = versions.find((item) => item.id === id);
      if (!version) return;
      const copy: DesignVersion = {
        ...clone(version),
        id: newId(),
        name: `${version.name} (salinan)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setVersions((prev) => [copy, ...prev]);
      notify(`Duplikat “${version.name}” dibuat`);
    },
    [versions, notify],
  );

  /** buka versi + jadikan versi aktif tanpa mengganti draf (untuk "kembali ke versi ini") */
  const reset = useCallback(
    (variant?: Variant) => {
      setDesigns((prev) =>
        variant ? { ...prev, [variant]: clone(DEFAULT_DESIGNS[variant]) } : clone(DEFAULT_DESIGNS),
      );
      notify(variant ? `Desain ${variant.toUpperCase()} dikembalikan ke data survey` : 'Semua desain dikembalikan ke data survey', 'warn');
    },
    [notify],
  );

  /* --- ekspor / impor --------------------------------------------------- */
  const exportProject = useCallback(() => {
    return JSON.stringify(
      {
        project: 'Rumah Genset — Gedung G',
        unit: 'cm',
        exportedAt: new Date().toISOString(),
        activeVersionId,
        designs,
        versions,
      },
      null,
      2,
    );
  }, [activeVersionId, designs, versions]);

  const importProject = useCallback(
    (json: string) => {
      const parsed = JSON.parse(json) as {
        designs?: unknown;
        versions?: DesignVersion[];
        before?: unknown;
        after?: unknown;
      };
      // format baru: { designs, versions } — format lama: { before, after }
      const draft = normalize(parsed.designs ?? parsed);
      if (!draft) throw new Error('Format tidak valid — harus berisi data BEFORE dan AFTER.');
      setDesigns(draft);
      if (Array.isArray(parsed.versions)) {
        setVersions(
          parsed.versions
            .filter((item) => item && item.designs)
            .map((item) => ({
              ...item,
              id: item.id || newId(),
              name: item.name || 'Impor',
              createdAt: item.createdAt ?? Date.now(),
              updatedAt: item.updatedAt ?? Date.now(),
              designs: normalize(item.designs) ?? draft,
            })),
        );
      }
      setActiveVersionId(null);
      notify('Data berhasil diimpor');
    },
    [notify],
  );

  return {
    designs,
    versions,
    activeVersion,
    activeVersionId,
    dirty,
    savedAt,
    lastAction,
    update,
    patch,
    setExtensionWidth,
    setExtensionEnabled,
    saveVersion,
    applyVersion,
    deleteVersion,
    renameVersion,
    duplicateVersion,
    reset,
    exportProject,
    importProject,
  };
}

export type DesignsApi = ReturnType<typeof useDesigns>;
