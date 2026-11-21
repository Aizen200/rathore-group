"use client";
import geo from "@/data/india-states.json";

/** Region names used on the site that differ from the boundary dataset's state names. */
const GEO_NAME: Record<string, string> = {
  "Jammu & Kashmir": "Jammu and Kashmir",
  Daman: "Dadra and Nagar Haveli and Daman and Diu",
};
/** Regions whose marker should sit on a specific town rather than the state centroid. */
const POINT: Record<string, keyof typeof geo.points> = { Daman: "Daman" };

const [, , W, H] = geo.viewBox.split(" ").map(Number);
const HQ = geo.points.Mumbai;
const byName = new Map(geo.states.map((s) => [s.name, s]));

function locate(name: string): [number, number] {
  const point = POINT[name];
  if (point) return geo.points[point] as [number, number];
  const state = byName.get(GEO_NAME[name] ?? name);
  return (state?.c ?? HQ) as [number, number];
}

/** Gentle arc from the Mumbai head office, bowing away from the map's west coast. */
function arc([x, y]: [number, number]) {
  const [hx, hy] = HQ;
  const dx = x - hx;
  const dy = y - hy;
  const len = Math.hypot(dx, dy) || 1;
  const bow = Math.min(60, len * 0.28);
  const cx = (hx + x) / 2 + (dy / len) * bow;
  const cy = (hy + y) / 2 - (dx / len) * bow;
  return `M${hx} ${hy} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x} ${y}`;
}

export default function PresenceMap({
  regions,
  active,
  onSelect,
}: {
  regions: { name: string }[];
  active: number;
  onSelect: (index: number) => void;
}) {
  const indexByGeo = new Map(
    regions.map((r, i) => [GEO_NAME[r.name] ?? r.name, i]),
  );
  const activeGeo = GEO_NAME[regions[active].name] ?? regions[active].name;
  const pins = regions.map((r) => locate(r.name));
  const pct = ([x, y]: [number, number]) => ({
    left: `${(x / W) * 100}%`,
    top: `${(y / H) * 100}%`,
  });

  return (
    <div className="prs-map-wrap">
    <div className="prs-map">
      <svg
        className="prs-map-svg"
        viewBox={geo.viewBox}
        role="img"
        aria-label="Map of India highlighting the states and territories where Rathore Group has a documented presence"
      >
        <defs>
          <filter id="prs-lift" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="14" stdDeviation="14" floodColor="#020812" floodOpacity=".65" />
          </filter>
          <filter id="prs-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        <path className="prs-landmass" d={geo.outline} filter="url(#prs-lift)" />

        <g className="prs-states">
          {geo.states.map((s) => {
            const i = indexByGeo.get(s.name);
            const present = i !== undefined;
            const isActive = s.name === activeGeo;
            return (
              <path
                key={s.name}
                d={s.d}
                className={`prs-state${present ? " is-present" : ""}${isActive ? " is-active" : ""}`}
                onClick={present ? () => onSelect(i) : undefined}
              >
                <title>{s.name}</title>
              </path>
            );
          })}
        </g>

        {/* Glow under the selected state */}
        {byName.get(activeGeo) && (
          <path
            key={`glow-${activeGeo}`}
            className="prs-state-glow"
            d={byName.get(activeGeo)!.d}
            filter="url(#prs-glow)"
          />
        )}

        <path className="prs-coast" d={geo.outline} />

        <g className="prs-routes" aria-hidden="true">
          {pins.map((p, i) =>
            i === active ? null : (
              <path key={regions[i].name} d={arc(p)} pathLength={1} />
            ),
          )}
          <path
            key={`route-${active}`}
            className="is-active"
            d={arc(pins[active])}
            pathLength={1}
          />
        </g>

        <g className="prs-hq" transform={`translate(${HQ[0]} ${HQ[1]})`} aria-hidden="true">
          <circle r="14" className="prs-hq-pulse" />
          <rect x="-5" y="-5" width="10" height="10" transform="rotate(45)" />
        </g>
      </svg>

      <span className="prs-hq-label" style={pct(HQ as [number, number])} aria-hidden="true">
        Mumbai · HQ
      </span>

      {regions.map((r, i) => (
        <button
          key={r.name}
          type="button"
          className={`map-marker ${active === i ? "active" : ""}`}
          style={pct(pins[i])}
          onClick={() => onSelect(i)}
          aria-label={`Explore projects in ${r.name}`}
          aria-pressed={active === i}
        >
          <span />
          <i>{r.name}</i>
        </button>
      ))}
    </div>
    </div>
  );
}
