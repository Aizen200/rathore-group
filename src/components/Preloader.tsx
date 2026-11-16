"use client";
import { useEffect, useState } from "react";

const FOUNDED = 1994;
const HOLD_MS = 2600; // time the mark stays on screen before exiting
const EXIT_MS = 900; // must match the .preloader exit transition

export default function Preloader() {
  const [phase, setPhase] = useState<"in" | "out" | "done">("in");
  const years = new Date().getFullYear() - FOUNDED;
  const digits = String(years).split("");

  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.documentElement.classList.add("is-preloading");
    const hold = setTimeout(() => setPhase("out"), reduce ? 600 : HOLD_MS);
    const done = setTimeout(() => {
      setPhase("done");
      document.documentElement.classList.remove("is-preloading");
    }, (reduce ? 600 : HOLD_MS) + EXIT_MS);
    return () => {
      clearTimeout(hold);
      clearTimeout(done);
      document.documentElement.classList.remove("is-preloading");
    };
  }, []);

  if (phase === "done") return null;

  return (
    <div className={`preloader${phase === "out" ? " is-leaving" : ""}`} role="presentation" aria-hidden="true">
      <div className="preloader-mark">
        <span className="preloader-since">Since {FOUNDED}</span>

        <div className="preloader-figure">
          <img className="preloader-crest" src="/images/crest.webp" alt="" width="273" height="288" />
          <div className="preloader-digits">
            {digits.map((d, i) => (
              <span key={i} className={`preloader-digit d${i}`} style={{ animationDelay: `${0.45 + i * 0.18}s` }}>
                {d}
              </span>
            ))}
          </div>
          <span className="preloader-slash" />
        </div>

        <p className="preloader-tagline">
          <span>Where vision</span>
          <span>becomes legacy</span>
        </p>
      </div>
      <span className="preloader-progress" />
    </div>
  );
}
