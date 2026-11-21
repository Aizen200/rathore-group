"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowDown, ArrowUpRight, ArrowRight } from "lucide-react";
import heroVideo from "@/data/hero-video.json";
import RoadLayers from "./RoadLayers";
import TunnelHero from "./TunnelHero";

/**
 * Which hero to show:
 * - "tunnel": a wireframe tunnel with chapter video cards flying out of its depth (TunnelHero);
 * - "layers": a road cross-section built layer by layer as you scroll (RoadLayers);
 * - "film": the scroll-scrubbed hero video (hero section 3, all-keyframe, no audio), with
 *   numbered "mission file" titles that decode from scrambled letters per chapter;
 * - "construction": the scroll-driven 3D build (ConstructionScene).
 * Flip this to switch between them.
 */
const HERO_MODE = "film" as "tunnel" | "layers" | "construction" | "film";
const ConstructionScene = dynamic(() => import("./ConstructionScene"), { ssr: false, loading: () => null });

const chapters = [
  {
    label: "The vision",
    eyebrow: "ENGINEERING INDIA. SINCE 1994.",
    first: "WHERE VISION",
    second: "BECOMES LEGACY.",
    text: "We build the infrastructure that moves a nation forward.",
    position: "start",
  },
  {
    label: "The connection",
    eyebrow: "01 / ROADS, BRIDGES & CONNECTIONS",
    first: "DISTANCE.",
    second: "REDEFINED.",
    text: "Connecting communities. Opening possibilities.",
    position: "start",
  },
  {
    label: "The purpose",
    eyebrow: "02 / ENGINEERING WITH PURPOSE",
    first: "BUILT WITH",
    second: "PURPOSE.",
    text: "Precision in every detail. People at the heart of every decision.",
    position: "end",
  },
  {
    label: "The future",
    eyebrow: "03 / QUALITY. SAFETY. RESPONSIBILITY.",
    first: "PROGRESS.",
    second: "WITH RESPONSIBILITY.",
    text: "Creating lasting value for communities and generations to come.",
    position: "start",
  },
  {
    label: "The legacy",
    eyebrow: "FOUR CAPABILITIES. ONE COMMITMENT.",
    first: "BUILDING A LEGACY.",
    second: "ENGINEERING THE FUTURE.",
    text: "Rathore Group / R & B Infra Project Limited",
    position: "center",
  },
];
const stops = [0, 0.245, 0.485, 0.735, 0.955];
/** Chapter i owns the stretch bounds[i]..bounds[i + 1] of the footage. */
const bounds = [0, 0.21, 0.445, 0.685, 0.925, 1];
/** Share of the hero a chapter's text takes to fade in or out (about a third of a screen). */
const FADE = 0.035;
const ease = (t: number) => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
};
/**
 * Scroll-linked chapter text: each chapter's copy fades and drifts with the footage position, so
 * the content rides along with the film instead of replaying a timed entrance that makes the hero
 * feel like it pauses. Only opacity and transforms change, so it stays on the compositor.
 */
function placeCopy(copies: (HTMLDivElement | null)[], p: number) {
  copies.forEach((el, i) => {
    if (!el) return;
    const a = bounds[i], b = bounds[i + 1];
    const fadeIn = i === 0 ? 1 : ease((p - a) / FADE);
    const fadeOut = i === chapters.length - 1 ? 1 : ease((b - p) / FADE);
    const opacity = Math.min(fadeIn, fadeOut);
    // Rises in from below, drifts gently upward while on screen, and leaves upward.
    const enter = (1 - fadeIn) - (1 - fadeOut);
    const drift = Math.max(-0.5, Math.min(0.5, (p - a) / (b - a) - 0.5));
    const o = opacity.toFixed(3), y = enter.toFixed(3), d = drift.toFixed(3);
    if (el.dataset.o !== o) { el.dataset.o = o; el.style.opacity = o; el.style.visibility = opacity > 0 ? "visible" : "hidden"; }
    if (el.dataset.y !== y) { el.dataset.y = y; el.style.setProperty("--copy-enter", y); }
    if (el.dataset.d !== d) { el.dataset.d = d; el.style.setProperty("--copy-drift", d); }
  });
}
/**
 * Road hero construction stages, as [start, end] scroll progress. Each stage builds inside its
 * chapter, finishing before that chapter's text hands over: subgrade, GSB, WMM, asphalt, finish.
 */
const stages: [number, number][] = [[0.04, 0.19], [0.23, 0.33], [0.34, 0.43], [0.47, 0.67], [0.7, 0.9]];
function placeRoad(root: HTMLElement, p: number) {
  stages.forEach(([a, b], i) => {
    const v = ease((p - a) / (b - a)).toFixed(3);
    if (root.dataset[`l${i}`] !== v) {
      root.dataset[`l${i}`] = v;
      root.style.setProperty(`--l${i}`, v);
    }
  });
}
const GLYPHS = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789#/=<>_";
/** Decodes each span's data-text from scrambled glyphs, left to right (~0.5s). Returns a cancel. */
function scramble(spans: (HTMLSpanElement | null)[]) {
  const finals = spans.map(el => el?.dataset.text || "");
  const start = performance.now();
  let raf = 0;
  const step = (now: number) => {
    const t = (now - start) / 520;
    spans.forEach((el, k) => {
      if (!el) return;
      const text = finals[k];
      let out = "";
      for (let c = 0; c < text.length; c++) {
        const reveal = (c / Math.max(1, text.length)) * 0.7 + k * 0.15;
        out += text[c] === " " || t >= reveal ? text[c] : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
    });
    if (t < 1.2) raf = requestAnimationFrame(step);
    else spans.forEach((el, k) => el && (el.textContent = finals[k]));
  };
  raf = requestAnimationFrame(step);
  return () => {
    cancelAnimationFrame(raf);
    spans.forEach((el, k) => el && (el.textContent = finals[k]));
  };
}
type LoadState = "ready" | "loading" | "error";

export default function ScrollJourney() {
  const section = useRef<HTMLElement>(null);
  const film = useRef<HTMLVideoElement>(null);
  const jump = useRef<(progress: number) => void>(() => {});
  const [chapter, setChapter] = useState(0);
  const copies = useRef<(HTMLDivElement | null)[]>([]);
  const titleSpans = useRef<(HTMLSpanElement | null)[][]>([]);
  const firstChapter = useRef(true);
  // Film hero: the incoming chapter's title decodes from scrambled letters (not on first load).
  useEffect(() => {
    if (HERO_MODE !== "film") return;
    if (firstChapter.current) {
      firstChapter.current = false;
      return;
    }
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    return scramble(titleSpans.current[chapter] || []);
  }, [chapter]);
  const activeChapter = useRef(0);
  const tunnelChapter = useCallback((index: number) => {
    activeChapter.current = index;
    setChapter(index);
  }, []);
  const retry = useRef<() => void>(() => {});
  const [loadState, setLoadState] = useState<LoadState>("ready");
  const buildProgress = useRef(0);
  const [sceneActive, setSceneActive] = useState(true);

  // 3D construction and road-layer heroes: the scroll position drives the build directly.
  useEffect(() => {
    if (HERO_MODE !== "construction" && HERO_MODE !== "layers") return;
    const root = section.current;
    if (!root) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let visible = true;
    const update = () => {
      frame = 0;
      const rect = root.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, -rect.top / Math.max(1, root.offsetHeight - innerHeight)));
      root.style.setProperty("--journey-progress", String(progress));
      // Reduced motion: show the finished tower as a still and let the chapter buttons change text.
      buildProgress.current = reduced ? 1 : progress;
      if (HERO_MODE === "layers") placeRoad(root, reduced ? 1 : progress);
      const nowVisible = rect.bottom > 0 && rect.top < innerHeight;
      if (nowVisible !== visible) setSceneActive((visible = nowVisible));
      if (!reduced) {
        const next = progress < 0.21 ? 0 : progress < 0.445 ? 1 : progress < 0.685 ? 2 : progress < 0.925 ? 3 : 4;
        if (next !== activeChapter.current) setChapter((activeChapter.current = next));
        placeCopy(copies.current, progress);
      }
    };
    const scroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    jump.current = progress => {
      if (reduced) {
        setChapter((activeChapter.current = Math.max(0, stops.indexOf(progress))));
        return;
      }
      const top = root.getBoundingClientRect().top + scrollY;
      scrollTo({ top: top + (root.offsetHeight - innerHeight) * progress, behavior: "smooth" });
    };
    update();
    addEventListener("scroll", scroll, { passive: true });
    addEventListener("resize", scroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", scroll);
      removeEventListener("resize", scroll);
    };
  }, []);

  // Film hero: the scroll position scrubs an all-keyframe video (qa/sequence/encode-video.mjs).
  // Every frame is a keyframe, so the browser's hardware decoder lands on any frame in a few
  // milliseconds; nothing is decoded in JavaScript, which is what made fast scrolling lag.
  useEffect(() => {
    if (HERO_MODE !== "film") return;
    const root = section.current;
    const video = film.current;
    if (!root || !video) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = matchMedia("(max-width: 700px)").matches;
    const source = heroVideo[mobile ? "mobile" : "desktop"];
    const count = heroVideo.frames;
    const fps = heroVideo.fps;
    let destroyed = false;
    let frameRequest = 0;
    let shown = -1;
    let lastTime = 0;
    let wanted = 0;
    // Latest frame asked for while a seek is still in flight (older targets are dropped).
    let pending: number | null = 0;
    let ready = false;
    root.dataset.frameCount = String(count);
    root.dataset.scrubVariant = mobile ? "mobile" : "desktop";

    function status(value: LoadState) {
      if (root!.dataset.loadState === value) return;
      root!.dataset.loadState = value;
      setLoadState(value);
    }
    function chapterAt(p: number) {
      const next = p < bounds[1] ? 0 : p < bounds[2] ? 1 : p < bounds[3] ? 2 : p < bounds[4] ? 3 : 4;
      if (next !== activeChapter.current) setChapter((activeChapter.current = next));
    }
    function landed() {
      const index = Math.max(0, Math.min(count - 1, Math.floor(video!.currentTime * fps)));
      video!.dataset.frame = String(index);
      root!.dataset.frameQuality = index === wanted ? "full" : "preview";
      if (video!.style.opacity !== "1") video!.style.opacity = "1";
    }
    /** Shows frame `index`; aim for the middle of the frame so rounding never lands a frame early. */
    function seek(index: number) {
      if (!ready || video!.seeking) {
        pending = index;
        return;
      }
      pending = null;
      const time = (index + 0.5) / fps;
      if (Math.abs(video!.currentTime - time) < 0.25 / fps) landed();
      else video!.currentTime = time;
    }
    const onSeeked = () => {
      landed();
      if (pending !== null) seek(pending);
    };
    const onReady = () => {
      if (ready) return;
      ready = true;
      status("ready");
      seek(pending ?? wanted);
    };
    const onError = () => status("error");
    // The video must never play on its own; the scroll is its only clock.
    const onPlay = () => video.pause();
    // iOS only buffers media after a user gesture: nudge it on the first touch.
    const onTouch = () => {
      if (!ready) video.play().then(() => video.pause(), () => {});
    };
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("loadeddata", onReady);
    video.addEventListener("error", onError);
    video.addEventListener("play", onPlay);
    addEventListener("touchstart", onTouch, { passive: true, once: true });

    function update(now = performance.now()) {
      frameRequest = 0;
      if (destroyed) return;
      const rect = root!.getBoundingClientRect();
      const distance = Math.max(1, root!.offsetHeight - innerHeight);
      const progress = reduced ? 0 : Math.max(0, Math.min(1, -rect.top / distance));
      root!.style.setProperty("--journey-progress", String(progress));
      const visible = rect.bottom > 0 && rect.top < innerHeight;
      if (shown < 0 || reduced || !visible) shown = progress;
      else {
        // Near-direct tracking: a very short (~40ms) ease only blends one mouse-wheel step into
        // the next, so the film follows the hand instead of gliding on after the scroll stops.
        const dt = Math.min(64, now - lastTime || 16);
        shown += (progress - shown) * (1 - Math.exp(-dt / 40));
        const maxLag = 2 / (count - 1);
        if (progress - shown > maxLag) shown = progress - maxLag;
        else if (shown - progress > maxLag) shown = progress + maxLag;
        if (Math.abs(progress - shown) * (count - 1) < 0.08) shown = progress;
      }
      lastTime = now;
      if (visible) {
        wanted = Math.round(shown * (count - 1));
        root!.dataset.requestedFrame = String(wanted);
        seek(wanted);
        if (!reduced) {
          placeCopy(copies.current, shown);
          chapterAt(shown);
        }
      }
      if (shown !== progress) frameRequest = requestAnimationFrame(update);
    }
    function scroll() {
      if (!frameRequest) frameRequest = requestAnimationFrame(update);
    }
    jump.current = progress => {
      if (reduced) {
        setChapter((activeChapter.current = Math.max(0, stops.indexOf(progress))));
        wanted = Math.round(progress * (count - 1));
        seek(wanted);
        return;
      }
      const top = root.getBoundingClientRect().top + scrollY;
      window.scrollTo({ top: top + (root.offsetHeight - innerHeight) * progress, behavior: "smooth" });
    };
    retry.current = () => {
      ready = false;
      status("ready");
      video.load();
    };
    addEventListener("scroll", scroll, { passive: true });
    addEventListener("resize", scroll, { passive: true });
    video.src = `${source.src}?v=${heroVideo.version}`;
    video.load();
    update();
    return () => {
      destroyed = true;
      cancelAnimationFrame(frameRequest);
      removeEventListener("scroll", scroll);
      removeEventListener("resize", scroll);
      removeEventListener("touchstart", onTouch);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("error", onError);
      video.removeEventListener("play", onPlay);
      video.removeAttribute("src");
      video.load();
      retry.current = () => {};
    };
  }, []);

  const current = chapters[chapter];
  return (
    <section
      id="home"
      className={`scroll-journey${HERO_MODE === "layers" ? " scroll-journey--layers" : HERO_MODE === "tunnel" ? " scroll-journey--tunnel" : " scroll-journey--files"}`}
      ref={section}
      aria-label="Rathore Group infrastructure journey"
    >
      <div className="journey-sticky">
        {HERO_MODE === "tunnel" ? (
          <TunnelHero sectionRef={section} chapters={chapters} chapter={chapter} onChapter={tunnelChapter} jump={jump} stops={stops} />
        ) : HERO_MODE === "layers" ? (
          <RoadLayers />
        ) : HERO_MODE === "construction" ? (
          <ConstructionScene progress={buildProgress} active={sceneActive} />
        ) : (
        <>
        <picture className="journey-poster">
          <source media="(max-width: 700px)" srcSet={`${heroVideo.mobile.poster}?v=${heroVideo.version}`} />
          <img
            src={`${heroVideo.desktop.poster}?v=${heroVideo.version}`}
            alt="A highway taking shape from surveyed earthworks through grading and asphalt paving at sunrise, ending as a busy lit expressway at dusk; illustrative road construction footage"
            width="1920"
            height="1080"
            fetchPriority="high"
          />
        </picture>
        <video
          ref={film}
          className="journey-canvas"
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
          tabIndex={-1}
          aria-hidden="true"
        />
        </>
        )}
        <div className="journey-shade" />
        {loadState !== "ready" && (
          <div className="journey-load-status" role="status" aria-live="polite">
            <span>{loadState === "error" ? "This scene could not load." : "Loading scene…"}</span>
            {loadState === "error" && <button onClick={() => retry.current()}>Retry</button>}
          </div>
        )}
        <div className="journey-topline">
          <span>R & B INFRA PROJECT LIMITED</span>
          <span>
            MUMBAI HEADQUARTERS <i />
          </span>
        </div>
        {HERO_MODE === "film" && chapters.map((c, i) => {
          const Title = i === 0 ? "h1" : "h2";
          const active = chapter === i;
          return (
            <div
              key={c.label}
              ref={el => { copies.current[i] = el; }}
              className={`journey-copy journey-files journey-files-${i % 2 ? "right" : "left"}${active ? " is-active" : ""}`}
              aria-hidden={!active}
              inert={!active}
            >
              <div className="journey-files-number" aria-hidden="true">0{i + 1}</div>
              <Title className="journey-title" aria-label={`${c.first} ${c.second}`}>
                {[c.first, c.second].map((line, k) => (
                  <span
                    key={k}
                    aria-hidden="true"
                    data-text={line}
                    ref={el => { (titleSpans.current[i] ||= [])[k] = el; }}
                  >
                    {line}
                  </span>
                ))}
              </Title>
              {i === 0 ? (
                <Link href="#projects" className="journey-files-link">Explore our work <ArrowUpRight size={16} /></Link>
              ) : i === chapters.length - 1 ? (
                <Link href="#at-a-glance" className="journey-files-link">Discover Rathore Group <ArrowRight size={16} /></Link>
              ) : null}
            </div>
          );
        })}
        {(HERO_MODE === "layers" || HERO_MODE === "construction") && chapters.map((c, i) => {
          const Title = i === 0 ? "h1" : "h2";
          const active = chapter === i;
          return (
            <div
              key={c.label}
              ref={el => { copies.current[i] = el; }}
              className={`journey-copy journey-copy-${c.position}${active ? " is-active" : ""}`}
              aria-hidden={!active}
              inert={!active}
            >
              <span className="journey-eyebrow">
                <i />
                {c.eyebrow}
              </span>
              <Title className="journey-title">
                <span>{c.first}</span>
                <span>{c.second}</span>
              </Title>
              <div className="journey-description">
                <p>{c.text}</p>
                {i === 0 ? (
                  <Link href="#projects" className="journey-link">
                    Explore our work <ArrowUpRight size={20} />
                  </Link>
                ) : i === chapters.length - 1 ? (
                  <Link href="#at-a-glance" className="journey-link">
                    Discover Rathore Group <ArrowRight size={20} />
                  </Link>
                ) : (
                  <span className="journey-chapter-count">0{i} / 04</span>
                )}
              </div>
            </div>
          );
        })}
        <nav className="journey-chapters" aria-label="Journey chapters">
          {chapters.map((c, i) => (
            <button
              key={c.label}
              className={chapter === i ? "active" : ""}
              aria-label={`${String(i + 1).padStart(2, "0")} — Go to ${c.label}`}
              aria-current={chapter === i ? "step" : undefined}
              onClick={() => jump.current(stops[i])}
            >
              <span>{String(i + 1).padStart(2, "0")}</span>
              <i />
              <span className="journey-chapter-name">{c.label}</span>
            </button>
          ))}
        </nav>
        <div className="journey-bottom">
          {chapter === chapters.length - 1 ? (
            <a
              className="journey-scroll"
              href="#at-a-glance"
              aria-label="Continue to company overview"
            >
              <span><ArrowDown size={17} /></span>
              THE JOURNEY CONTINUES
            </a>
          ) : (
            <button
              className="journey-scroll"
              onClick={() => jump.current(stops[chapter + 1])}
            >
              <span><ArrowDown size={17} /></span>
              SCROLL TO EXPLORE
            </button>
          )}
          <span className="journey-current">{current.label}</span>
          <span className="journey-visual-note">
            {HERO_MODE === "layers" ? "TYPICAL FLEXIBLE PAVEMENT · ILLUSTRATIVE" : "ILLUSTRATIVE INFRASTRUCTURE FOOTAGE"}
          </span>
        </div>
        <div className="journey-progress">
          <span />
        </div>
      </div>
    </section>
  );
}
