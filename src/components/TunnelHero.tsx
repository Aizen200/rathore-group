"use client";

/**
 * Tunnel hero: the visitor flies down a wireframe tunnel and each chapter arrives as a video card
 * that grows out of the depth, passes the camera and gives way to the next one.
 *
 * Real CSS 3D: the stage has a perspective, cards and tunnel rings sit at a depth (translateZ),
 * and the scroll only moves them along Z. The browser composites everything (no repainting), and
 * cards placed off-axis drift outward naturally as they approach, just like a camera move.
 * Each card loops the matching two seconds of hero section 3 (muted, no audio track).
 */
import { useEffect, useRef, type MutableRefObject, type RefObject } from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowRight } from "lucide-react";

type Chapter = { label: string; eyebrow: string; first: string; second: string; text: string };

const N = 5;
/** Card i is in focus while f = p * SPAN - i + LEAD runs 0 → 1 (p = scroll progress 0 → 1). */
const SPAN = N - 0.6;
const LEAD = 0.3;
/** Scroll progress where each card sits mid-focus; the chapter buttons jump here. */
export const tunnelStops = Array.from({ length: N }, (_, i) => (i + 0.5 - LEAD) / SPAN);
const PERSPECTIVE = 1000;
/** Card depth (px) across its focus: far in the tunnel at f = 0, past the camera by f ≈ 1.1. */
const zAt = (f: number) => -1400 + f * 1700;
const RING_GAP = 300;
const RINGS = 20;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export default function TunnelHero({
  sectionRef,
  chapters,
  chapter,
  onChapter,
  jump,
  stops,
}: {
  sectionRef: RefObject<HTMLElement | null>;
  chapters: Chapter[];
  chapter: number;
  onChapter: (index: number) => void;
  jump: MutableRefObject<(progress: number) => void>;
  stops: number[];
}) {
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const gates = useRef<(HTMLDivElement | null)[]>([]);
  const videos = useRef<(HTMLVideoElement | null)[]>([]);
  const rings = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLSpanElement[]>([]);
  const progressRef = useRef(0);
  const reducedRef = useRef(false);

  useEffect(() => {
    const root = sectionRef.current;
    if (!root) return;
    const reduced = (reducedRef.current = matchMedia("(prefers-reduced-motion: reduce)").matches);
    let frame = 0;
    let shown = -1;
    let lastTime = 0;
    let current = -1;
    const playing = new Set<number>();

    function layout(p: number) {
      const mobile = innerWidth <= 700;
      const offset = innerWidth * (mobile ? 0.07 : 0.17);
      cards.current.forEach((card, i) => {
        if (!card) return;
        // The last card settles at its focus point instead of flying past the closing headline.
        const f = Math.min(p * SPAN - i + LEAD, i === N - 1 ? 0.5 : Infinity);
        const z = zAt(f);
        const side = i % 2 === 0 ? -1 : 1;
        const opacity = Math.min(clamp01((f + 1.55) / 0.4), clamp01((1.14 - f) / 0.14));
        const visible = opacity > 0.001;
        card.style.opacity = opacity.toFixed(3);
        card.style.visibility = visible ? "visible" : "hidden";
        card.style.transform = `translate3d(${(side * offset).toFixed(1)}px, ${(innerHeight * 0.035).toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${side * -7}deg)`;
        const gate = gates.current[i];
        if (gate) {
          gate.style.transform = `translate3d(0, 0, ${z.toFixed(1)}px)`;
          gate.style.opacity = (Math.min(clamp01((f + 1.2) / 0.5), clamp01((0.9 - f) / 0.3)) * 0.9).toFixed(3);
        }
        // Only cards on screen decode video.
        const video = videos.current[i];
        if (video && !reduced) {
          if (visible && !playing.has(i)) {
            playing.add(i);
            video.play().catch(() => {});
          } else if (!visible && playing.has(i)) {
            playing.delete(i);
            video.pause();
          }
        }
      });
      // The tunnel slides toward the camera; rings are identical, so wrapping by one gap is seamless.
      if (rings.current) rings.current.style.transform = `translate3d(0, 0, ${((p * SPAN * 900) % RING_GAP).toFixed(1)}px)`;
      const next = Math.max(0, Math.min(N - 1, Math.floor(p * SPAN + LEAD)));
      if (next !== current) {
        current = next;
        onChapter(next);
      }
    }

    function update(now = performance.now()) {
      frame = 0;
      const rect = root!.getBoundingClientRect();
      const progress = clamp01(-rect.top / Math.max(1, root!.offsetHeight - innerHeight));
      root!.style.setProperty("--journey-progress", String(progress));
      if (reduced) return;
      if (shown < 0) shown = progress;
      else {
        // A short glide (~70ms) turns stepped mouse-wheel ticks into a continuous flight.
        const dt = Math.min(64, now - lastTime || 16);
        shown += (progress - shown) * (1 - Math.exp(-dt / 70));
        if (Math.abs(progress - shown) < 0.0004) shown = progress;
      }
      lastTime = now;
      progressRef.current = shown;
      layout(shown);
      if (shown !== progress) frame = requestAnimationFrame(update);
    }
    const scroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    jump.current = progress => {
      const index = Math.max(0, stops.indexOf(progress));
      if (reduced) {
        layout(tunnelStops[index]);
        return;
      }
      const top = root.getBoundingClientRect().top + scrollY;
      scrollTo({ top: top + (root.offsetHeight - innerHeight) * tunnelStops[index], behavior: "smooth" });
    };

    if (reduced) layout(tunnelStops[0]);
    update();
    addEventListener("scroll", scroll, { passive: true });
    addEventListener("resize", scroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", scroll);
      removeEventListener("resize", scroll);
      videos.current.forEach(v => v?.pause());
    };
  }, [sectionRef, onChapter, jump, stops]);

  // Title fades up whenever the chapter changes.
  useEffect(() => {
    const spans = title.current;
    spans.forEach(s => s && (s.textContent = s.dataset.text || ""));
    if (reducedRef.current) return;
    const anims = spans.map((s, k) =>
      s?.animate(
        [{ opacity: 0, transform: "translateY(18px)" }, { opacity: 1, transform: "none" }],
        { duration: 700, delay: k * 90, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" },
      ),
    );
    return () => anims.forEach(a => a?.finish());
  }, [chapter]);

  const c = chapters[chapter];
  const side = chapter % 2 === 0 ? "right" : "left";
  return (
    <>
      <div className="tunnel-stage" aria-hidden="true">
        <div className="tunnel-world">
          <div className="tunnel-rings" ref={rings}>
            {Array.from({ length: RINGS }, (_, k) => (
              <div key={k} className="tunnel-ring" style={{ transform: `translate3d(0, 0, ${-k * RING_GAP}px)`, opacity: 1 - (k / RINGS) * 0.75 }} />
            ))}
          </div>
          <div className="tunnel-floor" />
          <div className="tunnel-ceiling" />
          <div className="tunnel-wall tunnel-wall-left" />
          <div className="tunnel-wall tunnel-wall-right" />
          {chapters.map((_, i) => (
            <div key={`gate-${i}`} className="tunnel-gate" ref={el => { gates.current[i] = el; }} />
          ))}
          {chapters.map((ch, i) => (
            <div key={ch.label} className="tunnel-card" ref={el => { cards.current[i] = el; }}>
              <video
                ref={el => { videos.current[i] = el; }}
                src={`/film-video/clips/chapter-${i + 1}.mp4`}
                poster={`/film-video/clips/chapter-${i + 1}.webp`}
                muted
                loop
                playsInline
                preload={i < 2 ? "auto" : "metadata"}
                disablePictureInPicture
                disableRemotePlayback
                tabIndex={-1}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="tunnel-label">
        <span>//</span> THE JOURNEY <em>0{N} STAGES</em>
      </div>
      <div className={`tunnel-copy tunnel-copy-${side}`} key={side}>
        <div className="tunnel-number" aria-hidden="true">0{chapter + 1}</div>
        {chapter === 0 ? <h1 className="tunnel-title" aria-label={`${c.first} ${c.second}`}>{titleLines(c, title)}</h1>
          : <h2 className="tunnel-title" aria-label={`${c.first} ${c.second}`}>{titleLines(c, title)}</h2>}
        <p className="tunnel-meta">
          {c.eyebrow}
          <span>/</span>
          {c.text}
        </p>
        {chapter === 0 ? (
          <Link href="#projects" className="tunnel-link">Explore our work <ArrowUpRight size={16} /></Link>
        ) : chapter === N - 1 ? (
          <Link href="#at-a-glance" className="tunnel-link">Discover Rathore Group <ArrowRight size={16} /></Link>
        ) : null}
      </div>
    </>
  );
}

function titleLines(c: Chapter, refs: MutableRefObject<HTMLSpanElement[]>) {
  return [c.first, c.second].map((line, k) => (
    <span
      key={`${k}-${line}`}
      aria-hidden="true"
      data-text={line}
      ref={el => { if (el) refs.current[k] = el; }}
    >
      {line}
    </span>
  ));
}
