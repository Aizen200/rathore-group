import { clientLogos } from "@/data/company";

/** Two rows of client logos drifting in opposite directions, right below the hero. */
export default function ClientMarquee() {
  const half = Math.ceil(clientLogos.length / 2);
  const rows = [clientLogos.slice(0, half), clientLogos.slice(half)];
  return (
    <section className="client-marquee" aria-labelledby="client-marquee-title">
      <div className="client-marquee-head">
        <span className="client-marquee-eyebrow">Our clientele</span>
        <h2 id="client-marquee-title">
          Trusted by <strong>government bodies</strong>, municipal corporations and
          public enterprises across India
        </h2>
      </div>
      {rows.map((row, r) => (
        <div className={`cm-row${r ? " cm-row--reverse" : ""}`} key={r}>
          <ul className="cm-track">
            {[...row, ...row].map((c, i) => (
              <li key={`${c.slug}-${i}`} aria-hidden={i >= row.length || undefined}>
                <img
                  src={`/images/clients/profile/${c.slug}.webp`}
                  alt={i < row.length ? c.name : ""}
                  title={c.name}
                  decoding="async"
                  draggable={false}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
