import type { ReactNode } from 'react';
import type { Design, Variant } from '../../types';
import { derive } from '../../lib/geometry';
import { MATERIAL_LABEL } from '../../data/defaults';
import { FloorPlan } from './FloorPlan';
import { BackElevation, FrontElevation, LeftElevation, RightElevation } from './Elevations';

const WALL_NAMES = { front: 'depan', back: 'belakang', left: 'kiri', right: 'kanan' } as const;

function Sheet({ title, number, design, mode, children, notes }: {
  title: string; number: number; design: Design; mode: Variant; children: ReactNode; notes: ReactNode;
}) {
  return (
    <article className="print-sheet" aria-label={`Lembar ${number}: ${title}`}>
      <header className="print-sheet-header">
        <div>
          <div className="print-eyebrow">GAMBAR KONSEP · RUMAH GENSET · {mode === 'before' ? 'EXISTING / BEFORE' : 'RENCANA / AFTER'}</div>
          <h1>{title}</h1>
          <div>{design.title}</div>
        </div>
        <div className="print-sheet-number">{`A-0${number}`}<small>A4 · LANDSCAPE</small></div>
      </header>
      <div className="print-sheet-body">
        <div className="print-drawing">{children}</div>
        <aside className="print-notes">{notes}</aside>
      </div>
      <footer className="print-sheet-footer">
        <span>SATUAN: cm &nbsp; | &nbsp; SKALA: TIDAK TERSKALA</span>
        <span>GAMBAR KONSEP · LEMBAR {number} / 5</span>
      </footer>
    </article>
  );
}

/** Separate printable sheets share the active design with the interactive drawings. */
export function PrintPlan({ design, mode }: { design: Design; mode: Variant }) {
  const g = derive(design);
  const elevations = [
    { title: 'TAMPAK DEPAN', side: 'front' as const, drawing: <FrontElevation design={design} printView /> },
    { title: 'TAMPAK BELAKANG', side: 'back' as const, drawing: <BackElevation design={design} printView /> },
    { title: 'TAMPAK SAMPING KIRI', side: 'left' as const, drawing: <LeftElevation design={design} printView /> },
    { title: 'TAMPAK SAMPING KANAN', side: 'right' as const, drawing: <RightElevation design={design} printView /> },
  ];
  return (
    <div className="print-document">
      <Sheet title="DENAH" number={1} design={design} mode={mode} notes={
        <>
          <h2>DATA DENAH</h2>
          <dl>
            <div><dt>Lebar total</dt><dd>{g.totalWidth} cm</dd></div>
            <div><dt>Panjang</dt><dd>{g.depth} cm</dd></div>
            <div><dt>Luas lantai</dt><dd>{g.floorArea.toFixed(2)} m²</dd></div>
            <div><dt>Pintu</dt><dd>{WALL_NAMES[design.door.wall]}, {design.door.width} cm</dd></div>
            {design.extension.enabled && <div><dt>Perluasan</dt><dd>{g.ext} cm</dd></div>}
          </dl>
          <h2>KETERANGAN</h2>
          <ul>
            <li>Garis tebal: dinding; arsiran: tiang.</li>
            <li>Garis putus: posisi lama atau jarak bebas.</li>
            <li>Bidang berbintik: pondasi genset.</li>
            <li>As-as: jarak antar pusat tiang.</li>
            <li>U: arah utara asumsi, perlu verifikasi.</li>
          </ul>
          <h2>ACUAN UKURAN</h2>
          <p>Seluruh dimensi dalam cm. Posisi X dari sisi kiri terluar, Z dari sisi belakang.</p>
          <p><strong>Tidak untuk diukur dengan penggaris.</strong> Gunakan angka dimensi.</p>
          <p><strong>Konsep, bukan gambar kerja.</strong> Verifikasi ukuran, arah, struktur dan kondisi lapangan sebelum pelaksanaan.</p>
        </>
      }>
        <FloorPlan design={design} showDetailDims compact printView />
      </Sheet>
      {elevations.map(({ title, side, drawing }, index) => (
        <Sheet key={side} title={title} number={index + 2} design={design} mode={mode} notes={
          <>
            <h2>DATA TAMPAK</h2>
            <dl>
              <div><dt>{side === 'front' || side === 'back' ? 'Lebar total' : 'Panjang'}</dt><dd>{side === 'front' || side === 'back' ? g.totalWidth : g.depth} cm</dd></div>
              <div><dt>Tinggi dinding utama</dt><dd>{g.wallH} cm</dd></div>
              <div><dt>Tinggi bubungan</dt><dd>{g.ridgeH} cm</dd></div>
              {g.canopy && <div><dt>Tinggi perluasan</dt><dd>{Math.round(g.canopy.wallH)} cm</dd></div>}
              <div><dt>Pintu</dt><dd>{WALL_NAMES[design.door.wall]}</dd></div>
              {design.door.wall === side && <div><dt>Ukuran pintu (L × T)</dt><dd>{design.door.width} × {design.door.height} cm</dd></div>}
            </dl>
            <h2>KETERANGAN</h2>
            <p>Dinding utama: {MATERIAL_LABEL[design.wallMaterial]}.</p>
            {g.canopy && <p>Dinding perluasan: {MATERIAL_LABEL[design.extension.material]}; atap datar.</p>}
            {side === 'left' && design.fence.visible && <p>Pagar digambar di depan dinding dan dapat menutupi elemen di belakangnya.</p>}
            <h2>ACUAN UKURAN</h2>
            <p>Semua ukuran dalam cm. Tinggi diukur dari lantai pada gambar.</p>
            <p><strong>Tidak untuk diukur dengan penggaris.</strong> Gunakan angka dimensi.</p>
            <p><strong>Konsep, bukan gambar kerja.</strong> Verifikasi ukuran, struktur dan kondisi lapangan sebelum pelaksanaan.</p>
          </>
        }>{drawing}</Sheet>
      ))}
    </div>
  );
}
