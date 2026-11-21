/**
 * Road cross-section hero: a highway built layer by layer as the visitor scrolls.
 *
 * Pure markup. ScrollJourney sets --l0 … --l4 (0 → 1, one per construction stage) on the hero,
 * and road-layers.css turns them into opacity/transform on each layer. Every layer is its own
 * <svg>, so the browser only moves finished pictures around (compositor work, no repainting),
 * which keeps scroll smooth on phones.
 *
 * All layers share one 1600 × 600 drawing space (road surface at y = 336, natural ground at
 * y = 500) and the scene box keeps that aspect ratio, so the layers always line up.
 * Thicknesses follow a typical flexible pavement; the drawing is illustrative, not to scale.
 */
const VB = "0 0 1600 600";

function Svg({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <svg className={`rl-layer ${className}`} viewBox={VB} aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

/** A layer label: one centred technical caption, name in white and spec in gold. */
function Label({ y, name, spec }: { y: number; name: string; spec: string }) {
  return (
    <text x="800" y={y + 6} textAnchor="middle" className="rl-label-name">
      {name}
      <tspan className="rl-label-spec">{"  ·  " + spec}</tspan>
    </text>
  );
}

const lights = [330, 610, 990, 1270];
const studs = Array.from({ length: 14 }, (_, i) => 300 + i * 76);
const pegs = [140, 272, 800, 1328, 1460];

export default function RoadLayers() {
  return (
    <div className="road-layers" aria-hidden="true">
      <div className="rl-grid" />
      <div className="rl-glow" />
      <div className="rl-scene">
        {/* Natural ground and a faint distant skyline: always there. */}
        <Svg className="rl-ground">
          <defs>
            <pattern id="rl-earth" width="26" height="26" patternUnits="userSpaceOnUse">
              <rect width="26" height="26" fill="#1b1611" />
              <circle cx="5" cy="7" r="1.6" fill="#3a2c1f" />
              <circle cx="18" cy="16" r="1.2" fill="#33271c" />
              <circle cx="11" cy="22" r="1" fill="#3f3022" />
            </pattern>
          </defs>
          <path
            d="M0 500 L0 470 L60 470 L60 430 L110 430 L110 452 L170 452 L170 410 L196 410 L196 460 L240 460 L240 488 L1360 488 L1360 456 L1410 456 L1410 418 L1446 418 L1446 446 L1500 446 L1500 424 L1540 424 L1540 470 L1600 470 L1600 500 Z"
            fill="#132235"
            opacity="0.7"
          />
          <rect x="0" y="500" width="1600" height="100" fill="url(#rl-earth)" />
          <rect x="0" y="499" width="1600" height="3" fill="#3b4a2c" />
          <path d="M0 540 H1600 M0 572 H1600" stroke="#2a2118" strokeWidth="2" strokeDasharray="2 10" />
        </Svg>

        {/* Stage 0 · the vision: blueprint outline of the finished road, survey pegs, dimensions. */}
        <Svg className="rl-blueprint">
          <g fill="none" stroke="#c5a55a" strokeWidth="2" strokeDasharray="8 7">
            <path d="M140 500 L200 440 L230 400 L255 362 L272 336 L1328 336 L1345 362 L1370 400 L1400 440 L1460 500" />
            <path d="M200 440 H1400 M230 400 H1370 M255 362 H1345" strokeOpacity="0.55" />
          </g>
          <g stroke="#c5a55a" strokeWidth="1.5" fill="none" opacity="0.8">
            <path d="M272 236 V318 M1328 236 V318 M272 245 H1328" />
            <path d="M1500 336 H1530 M1500 500 H1530 M1515 336 V500" />
          </g>
          <text x="800" y="232" className="rl-dim" textAnchor="middle">CARRIAGEWAY · 4 LANES</text>
          <text x="1492" y="424" textAnchor="end" className="rl-dim">PAVEMENT</text>
          {pegs.map(x => (
            <g key={x}>
              <rect x={x - 2} y="464" width="4" height="38" fill="#c5a55a" />
              <path d={`M${x + 2} 466 L${x + 26} 472 L${x + 2} 478 Z`} fill="#e0c37a" />
            </g>
          ))}
        </Svg>

        {/* Stage 1 · subgrade: compacted earth rises into the formation. */}
        <Svg className="rl-subgrade">
          <defs>
            <pattern id="rl-soil" width="22" height="22" patternUnits="userSpaceOnUse">
              <rect width="22" height="22" fill="#5b4330" />
              <circle cx="4" cy="5" r="1.8" fill="#735641" />
              <circle cx="15" cy="12" r="1.4" fill="#4a3627" />
              <circle cx="9" cy="18" r="1.2" fill="#7c5e46" />
            </pattern>
          </defs>
          <path d="M140 500 L1460 500 L1400 440 L200 440 Z" fill="url(#rl-soil)" />
          <path d="M200 440 H1400" stroke="#8a6a4e" strokeWidth="2" />
          <Label y={472} name="SUBGRADE" spec="COMPACTED EARTH · 500 MM" />
        </Svg>

        {/* Stage 2a · granular sub-base (GSB). */}
        <Svg className="rl-gsb">
          <defs>
            <pattern id="rl-gravel" width="34" height="34" patternUnits="userSpaceOnUse">
              <rect width="34" height="34" fill="#8c7a5e" />
              <circle cx="7" cy="8" r="5" fill="#a8946f" />
              <circle cx="22" cy="6" r="3.5" fill="#76664d" />
              <circle cx="27" cy="22" r="5.5" fill="#9d8a66" />
              <circle cx="11" cy="25" r="4" fill="#6f604a" />
            </pattern>
          </defs>
          <path d="M200 440 L1400 440 L1370 400 L230 400 Z" fill="url(#rl-gravel)" />
          <Label y={421} name="GRANULAR SUB-BASE" spec="GSB · 200 MM" />
        </Svg>

        {/* Stage 2b · wet mix macadam (WMM) base. */}
        <Svg className="rl-wmm">
          <defs>
            <pattern id="rl-macadam" width="18" height="18" patternUnits="userSpaceOnUse">
              <rect width="18" height="18" fill="#6c7175" />
              <circle cx="4" cy="4" r="2.6" fill="#868b8f" />
              <circle cx="13" cy="9" r="2" fill="#575b5f" />
              <circle cx="6" cy="14" r="2.2" fill="#7b8084" />
            </pattern>
          </defs>
          <path d="M230 400 L1370 400 L1345 362 L255 362 Z" fill="url(#rl-macadam)" />
          <Label y={382} name="WET MIX MACADAM" spec="WMM · 250 MM" />
        </Svg>

        {/* Stage 3 · bituminous courses, laid left to right behind the paver. */}
        <Svg className="rl-asphalt">
          <path d="M255 362 L1345 362 L1335 346 L265 346 Z" fill="#2b2f33" />
          <path d="M265 346 L1335 346 L1328 336 L272 336 Z" fill="#17191c" />
          <path d="M272 336 H1328" stroke="#3a3f44" strokeWidth="1.5" />
        </Svg>
        {/* Own layer so the caption never stretches with the asphalt; fades in once it is laid. */}
        <Svg className="rl-asphalt-label">
          <Label y={351} name="DBM + BITUMINOUS CONCRETE" spec="90 MM" />
        </Svg>
        <div className="rl-paver-track">
          <Svg className="rl-paver">
            {/* Paver silhouette whose screed sits on the leading edge of the fresh asphalt. */}
            <g transform="translate(255 0)">
              <rect x="-6" y="326" width="34" height="12" fill="#c5a55a" />
              <rect x="20" y="290" width="86" height="40" rx="4" fill="#e0b445" />
              <rect x="40" y="262" width="40" height="30" rx="3" fill="#2a2f35" stroke="#e0b445" strokeWidth="3" />
              <rect x="96" y="304" width="44" height="22" fill="#c99a2e" />
              <circle cx="44" cy="334" r="9" fill="#1b1d20" stroke="#5d6166" strokeWidth="3" />
              <circle cx="88" cy="334" r="9" fill="#1b1d20" stroke="#5d6166" strokeWidth="3" />
              <path d="M-4 330 Q-20 334 -36 333" stroke="#c5a55a" strokeWidth="2" strokeOpacity="0.5" fill="none" />
            </g>
          </Svg>
        </div>

        {/* Stage 4 · finishing: kerbs, crash barriers, lane studs, streetlights, traffic. */}
        <Svg className="rl-finish">
          <rect x="272" y="326" width="18" height="10" fill="#c9cdd1" />
          <rect x="1310" y="326" width="18" height="10" fill="#c9cdd1" />
          <rect x="786" y="324" width="28" height="12" fill="#c9cdd1" />
          <rect x="786" y="320" width="28" height="4" fill="#c5a55a" />
          <path d="M276 318 H1324" stroke="#9aa3ab" strokeWidth="3" strokeDasharray="1 0" opacity="0.35" />
          {studs.map(x => (
            <rect key={x} x={x} y="333" width="22" height="3" fill={x > 770 && x < 830 ? "#c5a55a" : "#f0eee7"} />
          ))}
        </Svg>
        <Svg className="rl-lights">
          {lights.map(x => (
            <g key={x}>
              <rect x={x - 3} y="196" width="6" height="140" fill="#8f979e" />
              <path d={`M${x} 198 Q${x} 186 ${x + 26} 186 H${x + 44}`} stroke="#8f979e" strokeWidth="5" fill="none" />
              <rect x={x + 38} y="182" width="22" height="7" rx="2" fill="#f4dc9a" />
            </g>
          ))}
        </Svg>
        <Svg className="rl-beams">
          <defs>
            <linearGradient id="rl-beam" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f4dc9a" stopOpacity="0.38" />
              <stop offset="1" stopColor="#f4dc9a" stopOpacity="0" />
            </linearGradient>
          </defs>
          {lights.map(x => (
            <path key={x} d={`M${x + 40} 189 L${x + 58} 189 L${x + 110} 336 L${x - 12} 336 Z`} fill="url(#rl-beam)" />
          ))}
        </Svg>
        <div className="rl-traffic">
          <Svg className="rl-cars rl-cars-east">
            <g>
              <rect x="0" y="312" width="74" height="18" rx="6" fill="#d8dde2" />
              <rect x="14" y="300" width="42" height="15" rx="5" fill="#aeb6be" />
              <circle cx="16" cy="331" r="6" fill="#111" />
              <circle cx="58" cy="331" r="6" fill="#111" />
              <rect x="70" y="316" width="6" height="5" fill="#fff4c8" />
            </g>
            <g transform="translate(-520 0)">
              <rect x="0" y="296" width="120" height="34" rx="4" fill="#c5a55a" />
              <rect x="120" y="306" width="32" height="24" rx="4" fill="#a8873f" />
              <circle cx="24" cy="331" r="7" fill="#111" />
              <circle cx="128" cy="331" r="7" fill="#111" />
            </g>
          </Svg>
          <Svg className="rl-cars rl-cars-west">
            <g>
              <rect x="0" y="314" width="70" height="17" rx="6" fill="#7d93ad" />
              <rect x="16" y="303" width="38" height="14" rx="5" fill="#5d728b" />
              <circle cx="14" cy="331" r="6" fill="#111" />
              <circle cx="56" cy="331" r="6" fill="#111" />
              <rect x="-4" y="318" width="6" height="5" fill="#ff8a6b" />
            </g>
          </Svg>
        </div>
      </div>
    </div>
  );
}
