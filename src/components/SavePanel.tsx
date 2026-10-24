import { useEffect, useRef, useState } from 'react';
import {
  Check,
  Clock3,
  Copy,
  Download,
  HardDriveDownload,
  History,
  PencilLine,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { DesignsApi, DesignVersion } from '../hooks/useDesigns';
import { derive, m2 } from '../lib/geometry';
import { DataPill, GhostButton, SectionHead, SolidButton } from './ui';
import { cn } from '../utils/cn';

const timeOf = (value: number) =>
  new Date(value).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

const dateOf = (value: number) =>
  new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

function relative(value: number) {
  const diff = Date.now() - value;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} hari lalu`;
  return dateOf(value);
}

/* ------------------------------------------------------------------ */
/* Status penyimpanan (dipakai di header & panel)                      */
/* ------------------------------------------------------------------ */
export function SaveStatus({ api, compact = false }: { api: DesignsApi; compact?: boolean }) {
  if (api.dirty) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber/30 bg-amber/[0.08] px-2.5 py-1.5 font-mono-tech text-[9px] uppercase tracking-[0.08em] text-amber">
        <span className="h-1 w-1 rounded-full bg-amber" />
        {compact ? 'belum disimpan' : 'Ada perubahan — belum disimpan ke versi'}
      </span>
    );
  }
  if (api.activeVersion) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-lime/30 bg-lime/[0.08] px-2.5 py-1.5 font-mono-tech text-[9px] uppercase tracking-[0.08em] text-lime">
        <Check size={10} />
        {compact ? 'tersimpan' : `Tersimpan · ${api.activeVersion.name}`}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1.5 font-mono-tech text-[9px] uppercase tracking-[0.08em] text-mist">
      <HardDriveDownload size={10} />
      {api.savedAt ? `draf tersimpan ${timeOf(api.savedAt)}` : 'draf tersimpan'}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Tombol simpan (dipakai di header hero)                              */
/* ------------------------------------------------------------------ */
export function SaveControls({ api }: { api: DesignsApi }) {
  const save = () => api.saveVersion(undefined, api.activeVersionId);

  return (
    <div className="flex items-center gap-2">
      <SaveStatus api={api} compact />
      <SolidButton onClick={save} icon={<Save size={12} />} title="Simpan perubahan ke versi (Ctrl/Cmd + S)">
        {api.activeVersion ? 'Perbarui' : 'Simpan'}
      </SolidButton>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Panel riwayat versi                                                 */
/* ------------------------------------------------------------------ */
function VersionCard({
  version,
  api,
  onRename,
}: {
  version: DesignVersion;
  api: DesignsApi;
  onRename: (id: string, name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(version.name);
  const active = api.activeVersionId === version.id;
  const g = derive(version.designs.after);

  useEffect(() => setName(version.name), [version.name]);

  const commit = () => {
    onRename(version.id, name);
    setEditing(false);
  };

  const download = () => {
    const blob = new Blob([JSON.stringify({ name: version.name, designs: version.designs }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `rumah-genset-${version.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1200);
  };

  return (
    <div
      className={cn(
        'rise-in rounded-xl border p-3.5 transition',
        active ? 'border-lime/30 bg-lime/[0.045]' : 'border-white/10 bg-[#0d1517] hover:border-white/20',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') commit();
                  if (event.key === 'Escape') setEditing(false);
                }}
                className="min-w-0 flex-1 rounded-md border border-lime/40 bg-black/40 px-2 py-1 text-[12px] text-white outline-none"
              />
              <button type="button" onClick={commit} className="rounded-md p-1 text-lime hover:bg-white/10">
                <Check size={12} />
              </button>
              <button type="button" onClick={() => setEditing(false)} className="rounded-md p-1 text-mist-2 hover:bg-white/10">
                <X size={12} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className={cn('truncate text-[13px] font-medium', active ? 'text-[#eef5e9]' : 'text-[#dfe7da]')}>{version.name}</p>
              {active && <DataPill tone="lime">aktif</DataPill>}
            </div>
          )}
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono-tech text-[9px] uppercase tracking-[0.08em] text-mist-2">
            <Clock3 size={9} /> {relative(version.updatedAt)}
            <span className="h-0.5 w-0.5 rounded-full bg-mist-2" />
            {g.totalWidth} × {g.depth} cm
            <span className="h-0.5 w-0.5 rounded-full bg-mist-2" />
            {m2(g.floorArea)}
          </p>
          <p className="mt-1 font-mono-tech text-[9px] text-mist-2">
            after {version.designs.after.gensets.length} genset · {version.designs.after.columns.length} tiang · disimpan{' '}
            {dateOf(version.updatedAt)} {timeOf(version.updatedAt)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            title="Ganti nama"
            onClick={() => setEditing(true)}
            className="rounded-md p-1.5 text-mist-2 transition hover:bg-white/10 hover:text-white"
          >
            <PencilLine size={12} />
          </button>
          <button
            type="button"
            title="Duplikat versi"
            onClick={() => api.duplicateVersion(version.id)}
            className="rounded-md p-1.5 text-mist-2 transition hover:bg-white/10 hover:text-white"
          >
            <Copy size={12} />
          </button>
          <button
            type="button"
            title="Unduh versi ini (JSON)"
            onClick={download}
            className="rounded-md p-1.5 text-mist-2 transition hover:bg-white/10 hover:text-white"
          >
            <Download size={12} />
          </button>
          <button
            type="button"
            title="Hapus versi"
            onClick={() => {
              if (confirm(`Hapus versi “${version.name}”? Tindakan ini tidak bisa dibatalkan.`)) api.deleteVersion(version.id);
            }}
            className="rounded-md p-1.5 text-mist-2 transition hover:bg-rust/10 hover:text-rust"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => api.applyVersion(version.id)}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.03] px-2.5 py-1.5 font-mono-tech text-[9px] uppercase tracking-[0.08em] text-mist transition hover:border-lime/40 hover:text-lime"
        >
          <History size={10} /> Muat versi
        </button>
        <button
          type="button"
          onClick={() => api.saveVersion(version.name, version.id)}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.03] px-2.5 py-1.5 font-mono-tech text-[9px] uppercase tracking-[0.08em] text-mist transition hover:border-lime/40 hover:text-lime"
          title="Timpa versi ini dengan desain yang sedang terbuka"
        >
          <Save size={10} /> Perbarui isi
        </button>
      </div>
    </div>
  );
}

export function VersionsSection({ api }: { api: DesignsApi }) {
  const [name, setName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const saveAsNew = () => {
    api.saveVersion(name.trim() || undefined);
    setName('');
  };

  const importFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        api.importProject(String(reader.result));
      } catch (error) {
        alert('File tidak valid: ' + (error as Error).message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <section id="riwayat" className="section-anchor border-t border-white/[0.07] py-14 sm:py-16 lg:py-20">
      <SectionHead
        index="03"
        kicker="Simpan & riwayat · tersimpan di browser"
        title={
          <>
            Setiap perubahan ukuran
            <span className="block text-mist">bisa disimpan jadi versi.</span>
          </>
        }
        description="Draf tersimpan otomatis setiap kali Anda mengubah angka. Simpan sebagai versi untuk memberi nama, kembali ke kondisi sebelumnya, atau mengunduh cadangan JSON. Semua data disimpan di browser ini (localStorage)."
        action={
          <>
            <SaveStatus api={api} />
            <GhostButton onClick={() => inputRef.current?.focus()} icon={<Save size={11} />}>
              Simpan versi
            </GhostButton>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        {/* form simpan */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-white/10 bg-[#0d1517] p-4">
            <p className="font-mono-tech text-[8px] uppercase tracking-[0.12em] text-mist-2">Simpan sebagai versi baru</p>
            <div className="mt-2 flex items-center gap-2">
              <input
                ref={inputRef}
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && saveAsNew()}
                placeholder={`Versi ${api.versions.length + 1} — mis. “Rencana A”`}
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-2.5 py-2 text-[11px] text-white outline-none transition placeholder:text-mist-2/70 focus:border-lime/60 focus:ring-1 focus:ring-lime/20"
              />
              <SolidButton onClick={saveAsNew} icon={<Save size={12} />}>
                Simpan
              </SolidButton>
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-mist-2">
              Menyimpan snapshot <span className="text-[#dfe7dd]">BEFORE + AFTER</span> saat ini. Nama boleh dikosongkan —
              sistem memberi nama otomatis.
            </p>

            <div className="mt-3 border-t border-white/[0.07] pt-3">
              <p className="font-mono-tech text-[8px] uppercase tracking-[0.12em] text-mist-2">Perbarui versi aktif</p>
              {api.activeVersion ? (
                <button
                  type="button"
                  onClick={() => api.saveVersion(undefined, api.activeVersionId)}
                  className={cn(
                    'mt-2 flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition',
                    api.dirty
                      ? 'border-amber/30 bg-amber/[0.07] hover:border-amber/50'
                      : 'border-white/10 bg-black/20 hover:border-white/20',
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[11px] font-medium text-[#e6ede2]">{api.activeVersion.name}</span>
                    <span className="block font-mono-tech text-[9px] uppercase tracking-[0.08em] text-mist-2">
                      {api.dirty ? 'ada perubahan — klik untuk menyimpan' : `tersimpan ${timeOf(api.activeVersion.updatedAt)}`}
                    </span>
                  </span>
                  <Save size={13} className={api.dirty ? 'text-amber' : 'text-lime'} />
                </button>
              ) : (
                <p className="mt-2 rounded-lg border border-white/[0.07] bg-black/20 px-3 py-2 text-[10px] leading-relaxed text-mist-2">
                  Belum ada versi aktif. Draf saat ini tetap tersimpan otomatis
                  {api.savedAt ? ` (${timeOf(api.savedAt)})` : ''}.
                </p>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  const blob = new Blob([api.exportProject()], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const anchor = document.createElement('a');
                  anchor.href = url;
                  anchor.download = 'rumah-genset-project.json';
                  anchor.click();
                  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-white/12 bg-white/[0.03] px-2.5 py-2 font-mono-tech text-[9px] uppercase tracking-[0.08em] text-mist transition hover:border-lime/40 hover:text-lime"
              >
                <Download size={10} /> Ekspor semua
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-white/12 bg-white/[0.03] px-2.5 py-2 font-mono-tech text-[9px] uppercase tracking-[0.08em] text-mist transition hover:border-lime/40 hover:text-lime"
              >
                <Upload size={10} /> Impor
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(event) => event.target.files?.[0] && importFile(event.target.files[0])}
              />
            </div>
          </div>

          {/* status & tips */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0b1214] p-4">
            <div className="flex items-center justify-between">
              <p className="font-mono-tech text-[8px] uppercase tracking-[0.12em] text-mist-2">Cara kerja penyimpanan</p>
              <HardDriveDownload size={12} className="text-mist-2" />
            </div>
            <ul className="mt-2 space-y-2 text-[10px] leading-relaxed text-mist">
              <li className="flex gap-2">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-lime" />
                <span>
                  <b className="text-[#dfe7dd]">Autosave draf</b> — setiap perubahan angka disimpan ±0,4 detik setelahnya
                  {api.savedAt ? ` (terakhir ${timeOf(api.savedAt)})` : ''}.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-lime" />
                <span>
                  <b className="text-[#dfe7dd]">Versi</b> — snapshot bernama yang bisa dimuat kembali kapan saja.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-lime" />
                <span>
                  <b className="text-[#dfe7dd]">Ctrl/Cmd + S</b> — simpan cepat ke versi aktif (atau buat versi baru).
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-amber" />
                <span>Data tersimpan di browser ini saja. Ekspor JSON untuk cadangan / pindah perangkat.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* daftar versi */}
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono-tech text-[9px] uppercase tracking-[0.12em] text-mist-2">
              {api.versions.length} versi tersimpan
            </p>
            <div className="flex items-center gap-1.5">
              <DataPill tone="steel">{api.designs.after.gensets.length} genset · after</DataPill>
              <DataPill>{api.versions.filter((version) => version.id === api.activeVersionId).length ? 'aktif' : 'draf'}</DataPill>
            </div>
          </div>

          {api.versions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-[#0b1214] px-5 py-10 text-center">
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-mist">
                <History size={16} />
              </span>
              <p className="mt-3 text-[12px] font-medium text-[#dfe7da]">Belum ada versi tersimpan</p>
              <p className="mx-auto mt-1 max-w-sm text-[10px] leading-relaxed text-mist-2">
                Ubah ukuran di panel editor, lalu tekan <b className="text-lime">Simpan</b> di kanan atas untuk membuat versi
                pertama. Draf Anda sekarang sudah tersimpan otomatis.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {api.versions.map((version) => (
                <VersionCard key={version.id} version={version} api={api} onRename={api.renameVersion} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
