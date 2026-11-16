"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, ArrowRight } from "lucide-react";
import sequence from "@/data/sequence-manifest.json";

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
type LoadState = "ready" | "loading" | "error";
type Frame = ImageBitmap | HTMLImageElement;
const frameWidth = (f: Frame) => (f instanceof HTMLImageElement ? f.naturalWidth : f.width);
const frameHeight = (f: Frame) => (f instanceof HTMLImageElement ? f.naturalHeight : f.height);
function release(f: Frame) {
  if (f instanceof HTMLImageElement) f.removeAttribute("src");
  else f.close();
}

/** Native scroll drives a lightweight preview; settled views resolve to full quality. */
export default function ScrollJourney() {
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const jump = useRef<(progress: number) => void>(() => {});
  const [chapter, setChapter] = useState(0);
  const activeChapter = useRef(0);
  const retry = useRef<() => void>(() => {});
  const [loadState, setLoadState] = useState<LoadState>("ready");

  useEffect(() => {
    const root = section.current;
    const element = canvas.current;
    if (!root || !element) return;
    const context = element.getContext("2d", { alpha: false });
    if (!context) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = matchMedia("(max-width: 700px)").matches;
    const retina = !mobile && matchMedia("(min-resolution: 1.5dppx), (min-width: 1921px)").matches;
    const variant = mobile ? "mobile" : retina ? "retina" : "desktop";
    // Scrubbing always uses the lighter set; 4K frames only replace a settled view.
    const scrubVariant = mobile ? "mobile" : "desktop";
    const hqVariant = retina && sequence.retina.count === sequence.desktop.count ? "retina" : null;
    const count = sequence[scrubVariant].count;
    const previewSpec = sequence.preview[mobile ? "mobile" : "desktop"];
    const previewImage = new Image();
    let preview: Frame = previewImage;
    previewImage.decoding = "async";
    previewImage.fetchPriority = "high";
    let previewReady = false;
    let fullQuality = false;
    // Decoded frames kept around the playhead (≈8MB each), evicted by distance.
    const limit = mobile ? 14 : 24;
    const concurrency = mobile ? 3 : 5;
    const ahead = mobile ? 10 : 16;
    const behind = mobile ? 4 : 6;
    const cache = new Map<number, Frame>();
    const hqCache = new Map<number, Frame>();
    const pending = new Map<number, () => void>();
    const attempts = new Map<number, number>();
    let hqPending: (() => void) | null = null;
    let statusTimer: ReturnType<typeof setTimeout> | undefined;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    let queue: number[] = [];
    let wanted = 0;
    let direction = 1;
    let lastDrawn = -1;
    let drawnHq = false;
    let frameRequest = 0;
    let destroyed = false;
    let boxWidth = 0,
      boxHeight = 0;
    // Canvas backing sizes: scrubbing only needs the 1080p frame's real resolution; the larger
    // retina size is used just for the settled 4K frame. Fewer pixels = cheaper every frame.
    let scrubSize = { width: 0, height: 0 };
    let hqSize = { width: 0, height: 0 };
    // Displayed progress eases toward the scroll position so the film glides frame by frame
    // instead of jumping several frames per wheel tick and stopping dead.
    let shown = -1;
    let lastTime = 0;
    root.dataset.sequenceVariant = variant;
    root.dataset.frameCount = String(count);

    function status(value: LoadState) {
      if (root!.dataset.loadState === value) return;
      root!.dataset.loadState = value;
      setLoadState(value);
    }
    function waitForFrame() {
      clearTimeout(statusTimer);
      statusTimer = setTimeout(() => {
        if (!previewReady && wanted !== lastDrawn) status("loading");
      }, 450);
    }
    function paint(image: Frame, index: number, quality: "preview" | "full", x = 0, y = 0, width = frameWidth(image), height = frameHeight(image)) {
      if (!context || !element) return;
      const target = quality === "full" && !(image instanceof HTMLImageElement) ? image : scrubSize;
      setCanvas(target.width, target.height);
      const scale = Math.max(element.width / width, element.height / height);
      context.drawImage(
        image,
        x, y, width, height,
        (element.width - width * scale) / 2,
        (element.height - height * scale) / 2,
        width * scale,
        height * scale,
      );
      lastDrawn = index;
      fullQuality = quality === "full";
      drawnHq = false;
      if (root!.dataset.frameQuality !== quality) root!.dataset.frameQuality = quality;
      if (fullQuality && index === wanted) {
        clearTimeout(statusTimer);
        status("ready");
      }
      const p = index / (count - 1);
      const next =
        p < 0.21 ? 0 : p < 0.445 ? 1 : p < 0.685 ? 2 : p < 0.925 ? 3 : 4;
      if (next !== activeChapter.current) {
        activeChapter.current = next;
        setChapter(next);
      }
      element.dataset.frame = String(index);
      if (element.style.opacity !== "1") element.style.opacity = "1";
    }
    function setCanvas(width: number, height: number) {
      if (!element || !context || !width || (element.width === width && element.height === height)) return;
      element.width = width;
      element.height = height;
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
    }
    function draw(index: number) {
      const hq = hqCache.get(index);
      if (hq) {
        paint(hq, index, "full");
        drawnHq = true;
        return;
      }
      const image = cache.get(index);
      if (image) paint(image, index, "full");
    }
    function drawPreview(index: number) {
      if (!previewReady) return;
      const sample = Math.round(index * (previewSpec.count - 1) / (count - 1));
      paint(preview, Math.round(sample * (count - 1) / (previewSpec.count - 1)), "preview",
        (sample % previewSpec.columns) * previewSpec.width,
        Math.floor(sample / previewSpec.columns) * previewSpec.height,
        previewSpec.width, previewSpec.height);
    }
    /** Best available picture for the playhead: exact frame, a near neighbour, then the sprite. */
    function render(index: number) {
      if (cache.has(index) || hqCache.has(index)) {
        if (index !== lastDrawn || !fullQuality || (hqCache.has(index) && !drawnHq)) draw(index);
        return;
      }
      for (let d = 1; d <= 2; d++) {
        const near = cache.has(index - d * direction) ? index - d * direction : cache.has(index + d * direction) ? index + d * direction : -1;
        if (near >= 0) {
          // A neighbour stands in for the missing frame; it never counts as the full-quality view.
          if (near !== lastDrawn) paint(cache.get(near)!, near, "full");
          root!.dataset.frameQuality = "preview";
          fullQuality = false;
          return;
        }
      }
      if (index !== lastDrawn || fullQuality === false) drawPreview(index);
    }
    function evict() {
      while (cache.size > limit) {
        let farthest = -1;
        let distance = -1;
        for (const key of cache.keys()) {
          const d = Math.abs(key - wanted);
          if (key !== lastDrawn && d > distance) {
            distance = d;
            farthest = key;
          }
        }
        if (farthest < 0) break;
        release(cache.get(farthest)!);
        cache.delete(farthest);
      }
    }
    function frameUrl(set: string, index: number, attempt = 1) {
      return `${sequence.basePath}/${set}/${String(index).padStart(3, "0")}.webp?v=${sequence.version}${attempt > 1 ? `&retry=${attempt}` : ""}`;
    }
    /**
     * Frames are fetched as Blobs and decoded with createImageBitmap, which Chrome runs on a
     * background thread, already cropped and resized to the canvas. Drawing the bitmap is then a
     * straight copy. Drawing an <img> instead makes Chrome decode the WebP again into its GPU
     * cache on the main thread for every new frame, which is what made scrolling stutter.
     * If fetch is blocked (e.g. a CSP without connect-src), fall back to plain <img> loading.
     */
    let fetchBlocked = typeof createImageBitmap !== "function";
    function load(src: string, size: { width: number; height: number }, target: { width: number; height: number }, priority: "high" | "low", done: (image: Frame | null) => void) {
      let settled = false;
      let abortImage = () => {};
      const controller = new AbortController();
      const timer = setTimeout(() => finish(null), 10000);
      function finish(frame: Frame | null) {
        if (settled) {
          if (frame) release(frame);
          return;
        }
        settled = true;
        clearTimeout(timer);
        done(frame);
      }
      function viaImage() {
        const image = new Image();
        image.decoding = "async";
        image.fetchPriority = priority;
        image.src = src;
        image.decode().then(
          () => finish(image.naturalWidth > 0 ? image : null),
          () => finish(image.complete && image.naturalWidth > 0 ? image : null),
        );
        abortImage = () => image.removeAttribute("src");
      }
      if (fetchBlocked || !target.width) viaImage();
      else {
        const { width: iw, height: ih } = size;
        const scale = Math.max(target.width / iw, target.height / ih);
        const sw = Math.min(iw, Math.round(target.width / scale));
        const sh = Math.min(ih, Math.round(target.height / scale));
        const options = { resizeWidth: target.width, resizeHeight: target.height, resizeQuality: "high" as const };
        fetch(src, { signal: controller.signal, priority } as RequestInit)
          .then(
            response => {
              if (!response.ok) return finish(null);
              return response.blob()
                .then(blob => createImageBitmap(blob, Math.round((iw - sw) / 2), Math.round((ih - sh) / 2), sw, sh, options))
                .then(finish, () => finish(null));
            },
            error => {
              if (settled || (error as Error).name === "AbortError") return;
              // Network policy refused the connection: use the image pipeline from now on.
              fetchBlocked = true;
              viaImage();
            },
          );
      }
      return () => {
        settled = true;
        clearTimeout(timer);
        controller.abort();
        abortImage();
      };
    }
    function pump() {
      if (destroyed) return;
      while (pending.size < concurrency && queue.length) {
        const index = queue.shift()!;
        if (cache.has(index) || pending.has(index)) continue;
        if ((attempts.get(index) || 0) >= 2) {
          if (index === wanted && !fullQuality) {
            clearTimeout(statusTimer);
            status("error");
          }
          continue;
        }
        const attempt = (attempts.get(index) || 0) + 1;
        attempts.set(index, attempt);
        const abort = load(frameUrl(scrubVariant, index, attempt), sequence[scrubVariant], scrubSize, index === wanted ? "high" : "low", image => {
          if (destroyed || pending.get(index) !== cancel) return;
          pending.delete(index);
          if (image) {
            cache.set(index, image);
            attempts.delete(index);
            evict();
            if (index === wanted || (!fullQuality && Math.abs(index - wanted) <= 2)) render(wanted);
          } else if (index === wanted) {
            if (attempt < 2) queue.unshift(index);
            else {
              clearTimeout(statusTimer);
              status("error");
            }
          }
          pump();
        });
        const cancel = () => {
          abort();
          attempts.set(index, attempt - 1);
        };
        pending.set(index, cancel);
      }
    }
    function loadHq(index: number) {
      // One 4K download at a time, never cancelled mid-flight (they are ~1MB each).
      if (!hqVariant || hqCache.has(index) || hqPending || destroyed) return;
      const abort = load(frameUrl(hqVariant, index), sequence[hqVariant], hqSize, "low", image => {
        hqPending = null;
        if (destroyed) return;
        if (!image) return;
        hqCache.set(index, image);
        for (const key of hqCache.keys()) {
          if (hqCache.size <= 3) break;
          if (key !== index) {
            release(hqCache.get(key)!);
            hqCache.delete(key);
          }
        }
        if (index === wanted) draw(index);
        else scheduleHq();
      });
      hqPending = abort;
    }
    function request(index: number) {
      const changed = wanted !== index;
      if (changed) direction = index > wanted ? 1 : -1;
      wanted = index;
      root!.dataset.requestedFrame = String(index);
      if (changed) {
        clearTimeout(statusTimer);
        status("ready");
      }
      render(index);
      // Drop downloads that fell out of the window around the playhead.
      for (const [n, cancel] of pending) {
        if (n - index > ahead + 4 || index - n > ahead + 4) {
          pending.delete(n);
          cancel();
        }
      }
      // Current frame first, then frames in the direction of travel, then a few behind.
      const next: number[] = [index];
      for (let d = 1; d <= ahead; d++) next.push(index + d * direction);
      for (let d = 1; d <= behind; d++) next.push(index - d * direction);
      queue = next.filter(n => n >= 0 && n < count && !cache.has(n) && !pending.has(n));
      if (!cache.has(index) && changed) waitForFrame();
      pump();
      scheduleHq();
    }
    function scheduleHq() {
      if (!hqVariant) return;
      clearTimeout(settleTimer);
      const index = wanted;
      settleTimer = setTimeout(() => {
        if (wanted === index) loadHq(index);
      }, 300);
    }
    retry.current = () => {
      attempts.delete(wanted);
      status("loading");
      waitForFrame();
      request(wanted);
    };
    function update(now = performance.now()) {
      frameRequest = 0;
      if (destroyed || !root) return;
      const rect = root.getBoundingClientRect();
      const distance = Math.max(1, root.offsetHeight - innerHeight);
      const progress = reduced
        ? 0
        : Math.max(0, Math.min(1, -rect.top / distance));
      root.style.setProperty("--journey-progress", String(progress));
      const visible = rect.bottom > 0 && rect.top < innerHeight;
      if (shown < 0 || reduced || !visible) shown = progress;
      else {
        // Frame-rate independent ease-out (~120ms time constant).
        const dt = Math.min(64, now - lastTime || 16);
        shown += (progress - shown) * (1 - Math.exp(-dt / 120));
        if (Math.abs(progress - shown) * (count - 1) < 0.08) shown = progress;
      }
      lastTime = now;
      if (visible) request(Math.round(shown * (count - 1)));
      if (shown !== progress) frameRequest = requestAnimationFrame(update);
    }
    function scroll() {
      if (!frameRequest) frameRequest = requestAnimationFrame(update);
    }
    function resize() {
      if (!element) return;
      const rect = element.getBoundingClientRect();
      if (rect.width === boxWidth && rect.height === boxHeight) return;
      boxWidth = rect.width;
      boxHeight = rect.height;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      // Never allocate more canvas pixels than the source frame can actually fill.
      const fit = (src: { width: number; height: number }) => {
        const density = Math.min(dpr, Math.max(1, 1 / Math.max(rect.width / src.width, rect.height / src.height)));
        return { width: Math.round(rect.width * density), height: Math.round(rect.height * density) };
      };
      scrubSize = fit(sequence[scrubVariant]);
      hqSize = hqVariant ? fit(sequence[hqVariant]) : scrubSize;
      setCanvas(scrubSize.width, scrubSize.height);
      if (lastDrawn >= 0) {
        lastDrawn = -1;
        render(wanted);
      }
      // Cached bitmaps were cut for the old canvas size; rebuild them at the new one.
      for (const frame of cache.values()) release(frame);
      for (const frame of hqCache.values()) release(frame);
      cache.clear();
      hqCache.clear();
      if (wanted !== lastDrawn || !fullQuality) lastDrawn = -1;
      scroll();
    }
    jump.current = (progress) => {
      if (reduced) {
        const next = stops.indexOf(progress);
        setChapter(Math.max(0, next));
        request(Math.round(progress * (count - 1)));
        return;
      }
      const top = root.getBoundingClientRect().top + scrollY;
      window.scrollTo({
        top: top + (root.offsetHeight - innerHeight) * progress,
        behavior: "smooth",
      });
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    addEventListener("scroll", scroll, { passive: true });
    addEventListener("resize", resize, { passive: true });
    previewImage.onload = () => {
      if (destroyed) return;
      const ready = (frame: Frame) => {
        if (destroyed) return release(frame);
        preview = frame;
        previewReady = true;
        if (!fullQuality || wanted !== lastDrawn) drawPreview(wanted);
      };
      // Decode the sprite sheet once so scrubbing it never triggers another decode.
      if (typeof createImageBitmap === "function") createImageBitmap(previewImage).then(ready, () => ready(previewImage));
      else ready(previewImage);
    };
    if (!reduced) previewImage.src = `${previewSpec.src}?v=${sequence.version}`;
    resize();
    update();
    return () => {
      destroyed = true;
      cancelAnimationFrame(frameRequest);
      observer.disconnect();
      removeEventListener("scroll", scroll);
      removeEventListener("resize", resize);
      clearTimeout(statusTimer);
      clearTimeout(settleTimer);
      hqPending?.();
      for (const frame of hqCache.values()) release(frame);
      for (const frame of cache.values()) release(frame);
      hqCache.clear();
      previewImage.onload = null;
      previewImage.removeAttribute("src");
      if (preview !== previewImage) release(preview);
      for (const cancel of pending.values()) cancel();
      pending.clear();
      cache.clear();
      retry.current = () => {};
    };
  }, []);

  const current = chapters[chapter];
  return (
    <section
      id="home"
      className="scroll-journey"
      ref={section}
      aria-label="Rathore Group infrastructure journey"
    >
      <div className="journey-sticky">
        <picture className="journey-poster">
          <source
            media="(max-width: 700px)"
            srcSet={`${sequence.basePath}/mobile/000.webp?v=${sequence.version}`}
          />
          <source
            media="(min-resolution: 1.5dppx), (min-width: 1921px)"
            srcSet={`${sequence.basePath}/retina/000.webp?v=${sequence.version}`}
          />
          <img
            src={`${sequence.basePath}/desktop/000.webp?v=${sequence.version}`}
            alt="Real aerial footage of a river bridge and city skyline; illustrative infrastructure footage"
            width="1920"
            height="1080"
            fetchPriority="high"
          />
        </picture>
        <canvas ref={canvas} className="journey-canvas" aria-hidden="true" />
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
        <div className={`journey-copy journey-copy-${current.position}`} key={chapter}>
          <span className="journey-eyebrow">
            <i />
            {current.eyebrow}
          </span>
          <h1>
            <span>{current.first}</span>
            <span>{current.second}</span>
          </h1>
          <div className="journey-description">
            <p>{current.text}</p>
            {chapter === 0 ? (
              <Link href="#projects" className="journey-link">
                Explore our work <ArrowUpRight size={20} />
              </Link>
            ) : chapter === 4 ? (
              <Link href="#at-a-glance" className="journey-link">
                Discover Rathore Group <ArrowRight size={20} />
              </Link>
            ) : (
              <span className="journey-chapter-count">0{chapter} / 04</span>
            )}
          </div>
        </div>
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
            ILLUSTRATIVE INFRASTRUCTURE FOOTAGE
          </span>
        </div>
        <div className="journey-progress">
          <span />
        </div>
      </div>
    </section>
  );
}
