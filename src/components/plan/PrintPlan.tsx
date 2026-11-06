import type { Design, Variant } from '../../types';
import { derive } from '../../lib/geometry';
import { FloorPlan } from './FloorPlan';

/** A separate drawing sheet, so browser printing never includes the rest of the app. */
export function PrintPlan({ design, mode }: { design: Design; mode: Variant }) {
  const g = derive(design);
  const wallNames = { front: 'depan', back: 'belakang', left: 'kiri', right: 'kanan' };
  return (
    <article className="print-sheet" aria-label="Lembar cetak denah A4">
      <header className="print-sheet-header">
        <div>
          <div className="print-eyebrow">GAMBAR KONSEP · RUMAH GENSET</div>
          <h1>DENAH {mode === 'before' ? 'EXISTING / BEFORE' : 'RENCANA / AFTER'}</h1>
          <div>{design.title}</div>
        </div>
        <div className="print-sheet-number">{mode === 'before' ? 'A-01' : 'A-02'}<small>A4 · LANDSCAPE</small></div>
      </header>
      <div className="print-sheet-body">
        <div className="print-drawing">
          <FloorPlan design={design} showDetailDims compact printView />
        </div>
        <aside className="print-notes">
          <h2>DATA DENAH</h2>
          <dl>
            <div><dt>Lebar total</dt><dd>{g.totalWidth} cm</dd></div>
            <div><dt>Panjang</dt><dd>{g.depth} cm</dd></div>
            <div><dt>Luas lantai</dt><dd>{g.floorArea.toFixed(2)} m²</dd></div>
            <div><dt>Pintu</dt><dd>{wallNames[design.door.wall]}, {design.door.width} cm</dd></div>
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
          <p>Seluruh dimensi pada denah dalam cm. Posisi X dari sisi kiri terluar, Z dari sisi belakang.</p>
          <p>Gambar disesuaikan ke kertas; <strong>tidak untuk diukur dengan penggaris.</strong> Gunakan angka dimensi.</p>
          <p><strong>Konsep, bukan gambar kerja.</strong> Verifikasi ukuran, arah, struktur dan kondisi lapangan sebelum pelaksanaan.</p>
        </aside>
      </div>
      <footer className="print-sheet-footer">
        <span>SATUAN: cm &nbsp; | &nbsp; SKALA: TIDAK TERSKALA</span>
        <span>CETAK A4 LANDSCAPE · 1 LEMBAR</span>
      </footer>
    </article>
  );
}
