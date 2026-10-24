import { derive } from '../lib/geometry';
import type { Design } from '../types';

/**
 * Axonometri ringkas (SVG) untuk hero: massa bangunan utama dengan atap pelana
 * + atap DATAR pada perluasan sisi kiri. Digambar di atas "kertas" agar
 * senada dengan denah & tampak 2D.
 */
export function HeroAxon({ design }: { design: Design }) {
  const g = derive(design);
  const hasExt = !!g.canopy;

  // skala gambar
  const S = 300 / Math.max(g.totalWidth, 600);
  const depth = Math.min(96, (g.depth * S) / 2.4);
  const dx = depth * 0.62;
  const dy = -depth * 0.34;

  const groundY = 268;
  const baseX = 96;
  const mainW = design.width * S;
  const wallH = design.wallHeight * S;
  const extW = hasExt ? g.ext * S : 0;

  // titik acuan (kiri-atas dinding depan)
  const extTop = groundY - (g.canopy ? g.canopy.wallH * S : 0);
  const mainTop = groundY - wallH;
  const mainLeft = baseX + extW;
  const mainRight = mainLeft + mainW;
  const roofRise = design.roofRise * S;
  const ridgeY = mainTop - roofRise;
  const apexX = (mainLeft + mainRight) / 2;

  const p = (x: number, y: number) => `${x.toFixed(1)},${y.toFixed(1)}`;
  const back = (x: number, y: number) => p(x + dx, y + dy);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0d1517]">
      <div className="flex items-center justify-between border-b border-white/[0.07] px-3.5 py-2.5">
        <span className="font-mono-tech text-[8px] uppercase tracking-[0.14em] text-mist-2">axonometri skematik</span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-lime/25 bg-lime/[0.08] px-2 py-1 font-mono-tech text-[8px] uppercase tracking-[0.08em] text-lime">
          <span className="h-1 w-1 rounded-full bg-lime" />
          {hasExt ? 'atap pelana + datar' : 'atap pelana'}
        </span>
      </div>

      <div className="bg-paper text-paperink">
        <svg viewBox="0 0 420 320" className="h-auto w-full" role="img" aria-label="Axonometri rumah genset">
          <defs>
            <pattern id="axonGrid" patternUnits="userSpaceOnUse" width="20" height="20">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#202a27" strokeOpacity="0.09" strokeWidth="0.7" />
            </pattern>
            <linearGradient id="axonRoof" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#b9bcae" />
              <stop offset="100%" stopColor="#a7ab9d" />
            </linearGradient>
            <linearGradient id="axonWall" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#dcdccd" />
              <stop offset="100%" stopColor="#c9c9b8" />
            </linearGradient>
            <linearGradient id="axonExt" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#e6dfc4" />
              <stop offset="100%" stopColor="#d3cbaa" />
            </linearGradient>
          </defs>

          <rect x="0" y="0" width="420" height="320" fill="#ecece2" />
          <rect x="0" y="0" width="420" height="320" fill="url(#axonGrid)" />

          {/* tapak */}
          <polygon
            points={`${p(baseX - 26, groundY)} ${p(mainRight + 26, groundY)} ${back(mainRight + 26, groundY)} ${back(baseX - 26, groundY)}`}
            fill="#e2e2d3"
            stroke="#8b9385"
            strokeWidth="1"
          />

          {/* dinding perluasan (depan + samping) */}
          {hasExt && (
            <>
              <polygon
                points={`${p(baseX, extTop)} ${p(mainLeft, extTop)} ${p(mainLeft, groundY)} ${p(baseX, groundY)}`}
                fill="url(#axonExt)"
                stroke="#202a27"
                strokeWidth="1.2"
              />
              <polygon
                points={`${p(baseX, extTop)} ${back(baseX, extTop)} ${back(baseX, groundY)} ${p(baseX, groundY)}`}
                fill="#c3bb9b"
                stroke="#202a27"
                strokeWidth="1.2"
              />
              {/* atap datar: pita tipis, rata */}
              <polygon
                points={`${p(baseX - 8, extTop - 7)} ${p(mainLeft, extTop - 7)} ${back(mainLeft, extTop - 7)} ${back(baseX - 8, extTop - 7)}`}
                fill="url(#axonRoof)"
                stroke="#202a27"
                strokeWidth="1.4"
              />
              <polyline
                points={`${p(baseX - 8, extTop - 7)} ${p(baseX - 8, extTop + 5)} ${p(mainLeft, extTop + 5)}`}
                fill="none"
                stroke="#202a27"
                strokeWidth="1.2"
              />
              {/* label atap datar */}
              <line x1={baseX + extW * 0.2} y1={extTop - 7} x2={baseX - 6} y2={extTop - 62} stroke="#5d6a61" strokeWidth="0.9" strokeDasharray="3 3" />
              <rect x={baseX - 62} y={extTop - 84} width="112" height="22" rx="4" fill="#ecece2" stroke="#a8612b" strokeWidth="1" />
              <text x={baseX - 6} y={extTop - 69} textAnchor="middle" fontSize="9" fontFamily="JetBrains Mono, monospace" fill="#a8612b" fontWeight="600">
                ATAP DATAR {Math.round(g.canopy?.y ?? 0)}
              </text>
            </>
          )}

          {/* dinding utama */}
          <polygon
            points={`${p(mainLeft, mainTop)} ${p(mainRight, mainTop)} ${p(mainRight, groundY)} ${p(mainLeft, groundY)}`}
            fill="url(#axonWall)"
            stroke="#202a27"
            strokeWidth="1.3"
          />
          <polygon
            points={`${p(mainRight, mainTop)} ${back(mainRight, mainTop)} ${back(mainRight, groundY)} ${p(mainRight, groundY)}`}
            fill="#b9b9a8"
            stroke="#202a27"
            strokeWidth="1.3"
          />

          {/* pintu */}
          <rect
            x={apexX - 13}
            y={groundY - Math.min(44, wallH * 0.72)}
            width="26"
            height={Math.min(44, wallH * 0.72)}
            fill="#cbbfa6"
            stroke="#202a27"
            strokeWidth="1.1"
          />
          <circle cx={apexX + 8} cy={groundY - Math.min(44, wallH * 0.72) / 2} r="1.4" fill="#202a27" />

          {/* atap pelana */}
          <polygon
            points={`${p(apexX, ridgeY - 6)} ${p(mainLeft - 12, mainTop - 4)} ${back(mainLeft - 12, mainTop - 4)} ${back(apexX, ridgeY - 6)}`}
            fill="url(#axonRoof)"
            stroke="#202a27"
            strokeWidth="1.4"
          />
          <polygon
            points={`${p(apexX, ridgeY - 6)} ${p(mainRight + 12, mainTop - 4)} ${back(mainRight + 12, mainTop - 4)} ${back(apexX, ridgeY - 6)}`}
            fill="#c6c9ba"
            stroke="#202a27"
            strokeWidth="1.4"
          />
          {/* garis bubungan */}
          <line x1={apexX} y1={ridgeY - 6} x2={apexX + dx} y2={ridgeY - 6 + dy} stroke="#202a27" strokeWidth="1.6" />

          {/* label atap pelana */}
          <line x1={apexX + 26} y1={ridgeY - 2} x2={apexX + 66} y2={ridgeY - 44} stroke="#5d6a61" strokeWidth="0.9" strokeDasharray="3 3" />
          <rect x={apexX + 18} y={ridgeY - 66} width="104" height="22" rx="4" fill="#ecece2" stroke="#202a27" strokeWidth="1" />
          <text x={apexX + 70} y={ridgeY - 51} textAnchor="middle" fontSize="9" fontFamily="JetBrains Mono, monospace" fill="#202a27" fontWeight="600">
            ATAP PELANA
          </text>

          {/* dimensi lebar */}
          <line x1={baseX} y1={groundY + 24} x2={mainRight} y2={groundY + 24} stroke="#5d6a61" strokeWidth="0.9" />
          <line x1={baseX} y1={groundY + 19} x2={baseX} y2={groundY + 29} stroke="#5d6a61" strokeWidth="0.9" />
          <line x1={mainRight} y1={groundY + 19} x2={mainRight} y2={groundY + 29} stroke="#5d6a61" strokeWidth="0.9" />
          <text x={(baseX + mainRight) / 2} y={groundY + 40} textAnchor="middle" fontSize="9" fontFamily="JetBrains Mono, monospace" fill="#3c4a44">
            {g.totalWidth} cm
          </text>

          {/* dimensi tinggi atap datar */}
          {hasExt && (
            <>
              <line x1={baseX - 20} y1={groundY} x2={baseX - 20} y2={extTop} stroke="#a8612b" strokeWidth="0.9" />
              <line x1={baseX - 25} y1={groundY} x2={baseX - 15} y2={groundY} stroke="#a8612b" strokeWidth="0.9" />
              <line x1={baseX - 25} y1={extTop} x2={baseX - 15} y2={extTop} stroke="#a8612b" strokeWidth="0.9" />
              <text
                x={baseX - 26}
                y={(groundY + extTop) / 2}
                textAnchor="middle"
                fontSize="8.5"
                fontFamily="JetBrains Mono, monospace"
                fill="#a8612b"
                transform={`rotate(-90 ${baseX - 26} ${(groundY + extTop) / 2})`}
              >
                {Math.round(g.canopy?.y ?? 0)} cm
              </text>
            </>
          )}

          {/* keterangan */}
          <text x="14" y="22" fontSize="8.5" fontFamily="JetBrains Mono, monospace" fill="#778074">
            SKALA SKEMATIK · SATUAN CM
          </text>
          <text x="406" y="298" textAnchor="end" fontSize="8.5" fontFamily="JetBrains Mono, monospace" fill="#778074">
            {hasExt ? 'PLAN A — PERLUASAN + ATAP DATAR' : 'PLAN B — EXISTING'}
          </text>
        </svg>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.07] px-3.5 py-2.5">
        <span className="font-mono-tech text-[8px] uppercase tracking-[0.08em] text-mist-2">
          {hasExt ? `perluasan ${g.ext} cm · atap datar ${Math.round(g.canopy?.y ?? 0)} cm` : 'tanpa perluasan'}
        </span>
        <span className="font-mono-tech text-[8px] uppercase tracking-[0.08em] text-mist-2">
          ridge {g.ridgeH} · eave {Math.round(g.eaveH)}
        </span>
      </div>
    </div>
  );
}
