"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowDown, ArrowUpRight, ArrowRight } from "lucide-react";
import sequence from "@/data/sequence-manifest.json";

/**
 * Which hero to show: "construction" = the scroll-driven 3D build (ConstructionScene);
 * "film" = the scroll-scrubbed footage frame player below (currently the construction build-up
 * video). Flip this to switch between them.
 */
const HERO_MODE = "film" as "construction" | "film";
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
  const buildProgress = useRef(0);
  const [sceneActive, setSceneActive] = useState(true);

  // 3D construction hero: scroll position drives the build; the scene eases it internally.
  useEffect(() => {
    if (HERO_MODE !== "construction") return;
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
      const nowVisible = rect.bottom > 0 && rect.top < innerHeight;
      if (nowVisible !== visible) setSceneActive((visible = nowVisible));
      if (!reduced) {
        const next = progress < 0.21 ? 0 : progress < 0.445 ? 1 : progress < 0.685 ? 2 : progress < 0.925 ? 3 : 4;
        if (next !== activeChapter.current) setChapter((activeChapter.current = next));
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

  useEffect(() => {
    if (HERO_MODE !== "film") return;
    const root = section.current;
    const element = canvas.current;
    if (!root || !element) return;
    const context = element.getContext("2d", { alpha: false });
    if (!context) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = matchMedia("(max-width: 700px)").matches;
    const retina = !mobile && matchMedia("(min-resolution: 1.5dppx), (min-width: 1921px)").matches;
    const variant = mobile ? "mobile" : retina ? "retina" : "desktop";
    // Speed-aware resolution, like a video player. Fast scrolling plays the light 1080p frames
    // (preloaded, quick to decode; motion hides fine detail). On retina screens, slow scrolling
    // upgrades each frame to 1440p and the resting frame cross-fades to 4K. A single resolution
    // can't do both: 1080p alone looks soft when moving slowly, 1440p/4K can't decode fast enough
    // for a quick flick.
    const retinaFrames = retina && sequence.retina.count === sequence.desktop.count;
    const scrubVariant: "mobile" | "desktop" = mobile ? "mobile" : "desktop";
    const detailVariant: "qhd" | null = retinaFrames && sequence.qhd.count === sequence.desktop.count ? "qhd" : null;
    const hqVariant: "retina" | null = retinaFrames ? "retina" : null;
    const count = sequence[mobile ? "mobile" : "desktop"].count;
    const previewSpec = sequence.preview[mobile ? "mobile" : "desktop"];
    const previewImage = new Image();
    let preview: Frame = previewImage;
    previewImage.decoding = "async";
    previewImage.fetchPriority = "high";
    let previewReady = false;
    let fullQuality = false;
    // Decoded frames kept around the playhead, evicted by distance
    // (≈7MB each at 1080p); a few 1440p detail frames (≈13MB) sit around the playhead.
    const limit = mobile ? 14 : 24;
    const concurrency = mobile ? 3 : 5;
    const ahead = mobile ? 10 : 16;
    const behind = mobile ? 4 : 6;
    const cache = new Map<number, Frame>();
    const detailCache = new Map<number, Frame>();
    const detailPending = new Map<number, () => void>();
    let drawnDetail = false;
    // Playhead speed in frames per screen refresh (smoothed); decides when to add detail.
    let speed = 0;
    let lastFrame = -1;
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
    let sharpOnScreen = false;
    let frameRequest = 0;
    let destroyed = false;
    let boxWidth = 0,
      boxHeight = 0;
    // Canvas backing sizes: scrubbing only needs the 1080p frame's real resolution; the larger
    // retina size is used just for the settled 4K frame. Fewer pixels = cheaper every frame.
    let scrubSize = { width: 0, height: 0 };
    // Canvas size while moving: the 1440p frame's native size on retina, so detail frames draw
    // 1:1 and 1080p frames are scaled up by the GPU without reallocating the canvas.
    let movingSize = { width: 0, height: 0 };
    let hqSize = { width: 0, height: 0 };
    // Displayed progress eases toward the scroll position so the film glides frame by frame
    // instead of jumping several frames per wheel tick and stopping dead.
    let shown = -1;
    let lastTime = 0;
    root.dataset.sequenceVariant = variant;
    root.dataset.scrubVariant = scrubVariant;
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
      const target = quality === "full" && !(image instanceof HTMLImageElement) && frameWidth(image) > movingSize.width ? image : movingSize;
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
      sharpOnScreen = fullQuality;
      drawnHq = false;
      drawnDetail = false;
      if (root!.dataset.frameQuality !== quality) root!.dataset.frameQuality = quality;
      root!.dataset.frameSource = image === preview ? "sprite" : String(frameWidth(image));
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
    let fadeFrame = 0;
    /** Cross-fades the settled 4K frame over the scrub frame so detail settles in, not pops. */
    function fadeInHq(index: number) {
      const hq = hqCache.get(index);
      const base = detailCache.get(index) ?? cache.get(index);
      cancelAnimationFrame(fadeFrame);
      if (!hq || !base || reduced || !context || !element || lastDrawn !== index) return draw(index);
      const start = performance.now();
      const step = (now: number) => {
        if (destroyed) return;
        if (wanted !== index || lastDrawn !== index) return; // scrolling resumed: abandon the fade
        const t = Math.min(1, (now - start) / 260);
        setCanvas(hq.width, hq.height);
        context.globalAlpha = 1;
        context.drawImage(base, 0, 0, element.width, element.height);
        context.globalAlpha = t * t * (3 - 2 * t);
        context.drawImage(hq, 0, 0, element.width, element.height);
        context.globalAlpha = 1;
        if (t < 1) fadeFrame = requestAnimationFrame(step);
        else draw(index);
      };
      fadeFrame = requestAnimationFrame(step);
    }
    function draw(index: number) {
      const hq = hqCache.get(index);
      if (hq) {
        paint(hq, index, "full");
        drawnHq = true;
        return;
      }
      const detail = detailCache.get(index);
      if (detail) {
        paint(detail, index, "full");
        drawnDetail = true;
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
      if (cache.has(index) || hqCache.has(index) || detailCache.has(index)) {
        if (index !== lastDrawn || !fullQuality || (hqCache.has(index) && !drawnHq) || (detailCache.has(index) && !drawnDetail && !drawnHq)) draw(index);
        return;
      }
      // Fast scrolling outruns decoding: play forward through the decoded frame closest to the
      // target (between what's on screen and where the scroll is), so the film keeps moving
      // and stays sharp, trailing briefly instead of freezing or dropping to the sprite.
      if (sharpOnScreen && lastDrawn >= 0 && lastDrawn !== index) {
        const step = index > lastDrawn ? 1 : -1;
        for (let i = index - step; i !== lastDrawn; i -= step) {
          if (cache.has(i)) {
            paint(cache.get(i)!, i, "full");
            root!.dataset.frameQuality = "preview";
            fullQuality = false;
            return;
          }
        }
      }
      // A sharp frame a few steps away looks far better than the low-res sprite.
      for (let d = 1; d <= 4; d++) {
        const near = cache.has(index - d * direction) ? index - d * direction : cache.has(index + d * direction) ? index + d * direction : -1;
        if (near >= 0) {
          // A neighbour stands in for the missing frame; it never counts as the full-quality view.
          if (near !== lastDrawn) paint(cache.get(near)!, near, "full");
          root!.dataset.frameQuality = "preview";
          fullQuality = false;
          return;
        }
      }
      // Holding a sharp frame a few steps back beats swapping to the low-res sprite.
      // When the exact frame is already in memory it decodes in ~20ms, so keep the sharp frame
      // up for that instant rather than flashing the blurry sprite, however fast the scroll.
      // Only a frame that hasn't downloaded yet (slow network, far jump) falls back to the sprite.
      const inMemory = blobs.has(frameUrl(scrubVariant, index));
      if (sharpOnScreen && (inMemory || Math.abs(lastDrawn - index) <= 16)) {
        root!.dataset.frameQuality = "preview";
        fullQuality = false;
        return;
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
    // Compressed frames kept in memory (26MB at 1080p, 41MB at 1440p, 15MB on phones) so a
    // fast scroll only has to decode, never wait on the network.
    const blobs = new Map<string, Blob>();
    function load(src: string, key: string | null, size: { width: number; height: number }, target: { width: number; height: number }, priority: "high" | "low", done: (image: Frame | null, decodeMs?: number) => void) {
      let settled = false;
      let abortImage = () => {};
      const controller = new AbortController();
      const timer = setTimeout(() => finish(null), 10000);
      function finish(frame: Frame | null, decodeMs?: number) {
        if (settled) {
          if (frame) release(frame);
          return;
        }
        settled = true;
        clearTimeout(timer);
        done(frame, decodeMs);
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
        // When the canvas matches the cropped frame (the usual case) skip resampling entirely:
        // resizing a 4K frame costs ~30ms extra and stretching 1080p up costs ~145ms.
        const options: ImageBitmapOptions = Math.abs(sw - target.width) <= 2 && Math.abs(sh - target.height) <= 2
          ? {}
          : { resizeWidth: target.width, resizeHeight: target.height, resizeQuality: "medium" };
        const decode = (blob: Blob) => {
          const started = performance.now();
          return createImageBitmap(blob, Math.round((iw - sw) / 2), Math.round((ih - sh) / 2), sw, sh, options)
            .then(frame => finish(frame, performance.now() - started), () => finish(null));
        };
        const stored = key ? blobs.get(key) : undefined;
        if (stored) decode(stored);
        else fetch(src, { signal: controller.signal, priority } as RequestInit)
          .then(
            response => {
              if (!response.ok) return finish(null);
              return response.blob().then(blob => {
                if (key) blobs.set(key, blob);
                return decode(blob);
              }, () => finish(null));
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
    let preloadTimer: ReturnType<typeof setTimeout> | undefined;
    let preloading = 0;
    let preloadSet = "";
    const preloadAborts = new Set<AbortController>();
    function preloadAllowed() {
      const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
      return !reduced && !fetchBlocked && !connection?.saveData && !/(^|-)2g$|^3g$/.test(connection?.effectiveType || "");
    }
    /** Fetches the rest of the scrub set in the background, nearest the playhead first. */
    function preload() {
      if (destroyed || !preloadAllowed()) return;
      // Never compete with frames needed on screen right now: wait until loading goes idle.
      if (pending.size > 0 || speed > 0) {
        clearTimeout(preloadTimer);
        preloadTimer = setTimeout(preload, 250);
        return;
      }
      if (preloadSet !== scrubVariant) {
        preloadSet = scrubVariant;
        for (const controller of preloadAborts) controller.abort();
        preloadAborts.clear();
        preloading = 0;
      }
      const missing: number[] = [];
      // Frames that already failed are left to the on-screen loader and its retry limit.
      for (let i = 0; i < count; i++) if (!blobs.has(frameUrl(scrubVariant, i)) && !attempts.has(i)) missing.push(i);
      missing.sort((a, b) => Math.abs(a - wanted) - Math.abs(b - wanted));
      while (preloading < (mobile ? 2 : 3) && missing.length) {
        const index = missing.shift()!;
        const key = frameUrl(scrubVariant, index);
        if ([...pending.keys()].includes(index)) continue;
        const set = scrubVariant;
        const controller = new AbortController();
        preloadAborts.add(controller);
        preloading++;
        fetch(key, { signal: controller.signal, priority: "low" } as RequestInit)
          .then(response => (response.ok ? response.blob() : null))
          .then(blob => {
            if (set !== scrubVariant) return;
            if (blob) {
              blobs.set(key, blob);
              root!.dataset.preloaded = String(blobs.size);
            } else attempts.set(index, (attempts.get(index) || 0) + 1);
          }, (error: Error) => {
            if (error.name === "AbortError" || set !== scrubVariant) return;
            fetchBlocked = true; // connection refused (e.g. CSP): stop preloading
          })
          .finally(() => {
            preloadAborts.delete(controller);
            if (set !== preloadSet) return;
            preloading--;
            clearTimeout(preloadTimer);
            preloadTimer = setTimeout(preload, 0);
          });
      }
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
        const abort = load(frameUrl(scrubVariant, index, attempt), frameUrl(scrubVariant, index), sequence[scrubVariant], scrubSize, index === wanted ? "high" : "low", image => {
          if (destroyed || pending.get(index) !== cancel) return;
          pending.delete(index);
          if (image) {
            cache.set(index, image);
            attempts.delete(index);
            evict();
            if (index === wanted || (!fullQuality && Math.abs(index - wanted) <= 4)) render(wanted);
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
    /** Upgrades the playhead frame to 1440p while scrolling slowly (two decodes at a time). */
    function loadDetail(index: number) {
      if (!detailVariant || index < 0 || index >= count || detailCache.has(index) || detailPending.has(index) || detailPending.size >= 2 || destroyed) return;
      const key = frameUrl(detailVariant, index);
      const abort = load(key, key, sequence[detailVariant], movingSize, "low", image => {
        detailPending.delete(index);
        if (destroyed || !image) return;
        detailCache.set(index, image);
        while (detailCache.size > 6) {
          let farthest = -1;
          for (const n of detailCache.keys()) if (n !== lastDrawn && (farthest < 0 || Math.abs(n - wanted) > Math.abs(farthest - wanted))) farthest = n;
          if (farthest < 0) break;
          release(detailCache.get(farthest)!);
          detailCache.delete(farthest);
        }
        if (index === wanted && lastDrawn === index && !drawnHq) draw(index);
      });
      detailPending.set(index, abort);
    }
    function loadHq(index: number) {
      // One 4K download at a time, never cancelled mid-flight (they are ~1MB each).
      if (!hqVariant || hqCache.has(index) || hqPending || destroyed) return;
      const abort = load(frameUrl(hqVariant, index), null, sequence[hqVariant], hqSize, "low", image => {
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
        if (index === wanted) fadeInHq(index);
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
        const rel = (n - index) * direction; // positive = ahead in the direction of travel
        if (rel > ahead * 4 + 4 || rel < -(ahead + 4)) {
          pending.delete(n);
          cancel();
        }
      }
      // Current frame first, then frames in the direction of travel, then a few behind. At very
      // high speed decode every 2nd-4th frame ahead: more sharp frames ready along the path, and
      // skipped in-betweens are invisible at that speed.
      const stride = speed > 3 ? Math.min(4, Math.round(speed / 2)) : 1;
      const next: number[] = [index];
      for (let d = 1; d <= ahead; d++) next.push(index + d * stride * direction);
      for (let d = 1; d <= behind; d++) next.push(index - d * direction);
      queue = next.filter(n => n >= 0 && n < count && !cache.has(n) && !pending.has(n));
      if (!cache.has(index) && changed) waitForFrame();
      pump();
      if (detailVariant) {
        for (const [n, cancel] of detailPending) {
          if (Math.abs(n - index) > 2) {
            detailPending.delete(n);
            cancel();
          }
        }
        // Slow enough for the eye to see detail: fetch the 1440p version of this frame and the next.
        if (speed < 0.6) {
          loadDetail(index);
          loadDetail(index + direction);
        }
      }
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
      const frame = shown * (count - 1);
      speed = lastFrame < 0 ? 0 : speed * 0.6 + Math.abs(frame - lastFrame) * 0.4;
      lastFrame = frame;
      if (shown === progress) speed = 0;
      if (visible) request(Math.round(frame));
      if (shown !== progress) frameRequest = requestAnimationFrame(update);
    }
    function scroll() {
      if (!frameRequest) frameRequest = requestAnimationFrame(update);
    }
    function fit(src: { width: number; height: number }) {
      // Never allocate more canvas pixels than the source frame can actually fill.
      const dpr = Math.min(devicePixelRatio || 1, 2);
      // Use the frame's native density when it is close to the screen's, so frames are drawn
      // 1:1 without resampling and the GPU does the final (cheap, crisp) scale on screen.
      const native = 1 / Math.max(boxWidth / src.width, boxHeight / src.height);
      const density = native <= dpr * 1.25 ? Math.max(1, native) : Math.max(1, dpr);
      return { width: Math.round(boxWidth * density), height: Math.round(boxHeight * density) };
    }
    function resize() {
      if (!element) return;
      const rect = element.getBoundingClientRect();
      if (rect.width === boxWidth && rect.height === boxHeight) return;
      boxWidth = rect.width;
      boxHeight = rect.height;
      scrubSize = fit(sequence[scrubVariant]);
      movingSize = detailVariant ? fit(sequence[detailVariant]) : scrubSize;
      hqSize = hqVariant ? fit(sequence[hqVariant]) : movingSize;
      setCanvas(movingSize.width, movingSize.height);
      if (lastDrawn >= 0) {
        lastDrawn = -1;
        render(wanted);
      }
      // Cached bitmaps were cut for the old canvas size; rebuild them at the new one.
      for (const frame of cache.values()) release(frame);
      for (const frame of hqCache.values()) release(frame);
      for (const frame of detailCache.values()) release(frame);
      for (const cancel of detailPending.values()) cancel();
      cache.clear();
      hqCache.clear();
      detailCache.clear();
      detailPending.clear();
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
    preloadTimer = setTimeout(preload, 1500);
    return () => {
      destroyed = true;
      cancelAnimationFrame(frameRequest);
      cancelAnimationFrame(fadeFrame);
      clearTimeout(preloadTimer);
      for (const controller of preloadAborts) controller.abort();
      blobs.clear();
      observer.disconnect();
      removeEventListener("scroll", scroll);
      removeEventListener("resize", resize);
      clearTimeout(statusTimer);
      clearTimeout(settleTimer);
      hqPending?.();
      for (const frame of hqCache.values()) release(frame);
      for (const frame of cache.values()) release(frame);
      for (const frame of detailCache.values()) release(frame);
      for (const cancel of detailPending.values()) cancel();
      hqCache.clear();
      detailCache.clear();
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
        {HERO_MODE === "construction" ? (
          <ConstructionScene progress={buildProgress} active={sceneActive} />
        ) : (
        <>
        <picture className="journey-poster">
          <source
            media="(max-width: 700px)"
            srcSet={`${sequence.basePath}/mobile/000.webp?v=${sequence.version}`}
          />
          {sequence.retina.count > 0 && (
            <source
              media="(min-resolution: 1.5dppx), (min-width: 1921px)"
              srcSet={`${sequence.basePath}/retina/000.webp?v=${sequence.version}`}
            />
          )}
          <img
            src={`${sequence.basePath}/desktop/000.webp?v=${sequence.version}`}
            alt="A highway being built, from earthworks and rolling to asphalt paving, ending as a lit expressway at night; illustrative road construction footage"
            width="1920"
            height="1080"
            fetchPriority="high"
          />
        </picture>
        <canvas ref={canvas} className="journey-canvas" aria-hidden="true" />
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
