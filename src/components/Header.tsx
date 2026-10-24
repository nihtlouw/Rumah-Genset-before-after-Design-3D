import { useState } from 'react';
import { Box, History, Menu, X } from 'lucide-react';
import type { DesignsApi } from '../hooks/useDesigns';
import type { Variant } from '../types';
import { cn } from '../utils/cn';
import { LogoMark, ModeSwitch } from './ui';
import { SaveControls } from './SavePanel';

const NAV = [
  { href: '#ringkasan', label: 'Ringkasan' },
  { href: '#denah', label: 'Denah 2D' },
  { href: '#model', label: 'Model 3D' },
  { href: '#banding', label: 'Before–After' },
  { href: '#data', label: 'Data' },
  { href: '#riwayat', label: 'Riwayat' },
];

export default function Header({
  mode,
  onMode,
  api,
}: {
  mode: Variant;
  onMode: (mode: Variant) => void;
  api: DesignsApi;
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="no-print sticky top-0 z-50 border-b border-white/[0.07] bg-[#070c0d]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
        <a href="#ringkasan" className="flex min-w-0 items-center gap-2.5">
          <LogoMark />
          <span className="min-w-0">
            <span className="block truncate font-display text-[13px] font-semibold leading-none tracking-[0.08em] text-[#f0f4ec]">
              RUMAH GENSET
            </span>
            <span className="mt-1 flex items-center gap-1.5 font-mono-tech text-[8px] uppercase leading-none tracking-[0.2em] text-mist-2">
              design studio <span className="h-0.5 w-0.5 rounded-full bg-lime" /> gedung g
            </span>
          </span>
        </a>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-full px-2.5 py-2 font-mono-tech text-[10px] uppercase tracking-[0.08em] text-mist transition hover:bg-white/[0.05] hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <ModeSwitch mode={mode} onChange={onMode} compact />
          </div>
          <div className="hidden sm:block">
            <SaveControls api={api} />
          </div>
          <a
            href="#riwayat"
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/10 px-2.5 font-mono-tech text-[9px] uppercase tracking-[0.08em] text-mist transition hover:border-lime/40 hover:text-lime sm:hidden"
            title="Riwayat versi"
          >
            <History size={12} />
          </a>
          <button
            type="button"
            aria-label={open ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-mist transition hover:border-lime/40 hover:text-lime lg:hidden"
          >
            {open ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {/* menu mobile */}
      <div
        className={cn(
          'overflow-hidden border-t border-white/[0.06] bg-[#0a1012] transition-[max-height,opacity] duration-300 lg:hidden',
          open ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <div className="mx-auto flex max-w-[1440px] flex-col px-4 py-3 sm:px-6">
          <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-white/[0.07] bg-black/25 px-2.5 py-2">
            <span className="font-mono-tech text-[8px] uppercase tracking-[0.12em] text-mist-2">Skenario</span>
            <ModeSwitch mode={mode} onChange={onMode} compact />
          </div>
          <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-white/[0.07] bg-black/25 px-2.5 py-2">
            <span className="font-mono-tech text-[8px] uppercase tracking-[0.12em] text-mist-2">Penyimpanan</span>
            <SaveControls api={api} />
          </div>
          {NAV.map((item, index) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between border-b border-white/[0.06] py-3 font-mono-tech text-[10px] uppercase tracking-[0.1em] text-mist last:border-b-0 hover:text-lime"
            >
              <span>{item.label}</span>
              <span className="text-mist-2">0{index + 1}</span>
            </a>
          ))}
          <a
            href="#model"
            onClick={() => setOpen(false)}
            className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-full bg-lime px-3.5 py-2.5 font-mono-tech text-[9px] font-semibold uppercase tracking-[0.08em] text-ink"
          >
            <Box size={12} /> Buka model 3D
          </a>
        </div>
      </div>
    </header>
  );
}
