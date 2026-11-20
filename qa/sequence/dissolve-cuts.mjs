// Turns hard scene cuts in the hero frame sequence into short cross-dissolves, so scroll-scrubbing
// glides through a scene change instead of jumping between unrelated frames.
// Usage: node qa/sequence/dissolve-cuts.mjs <variant> <halfWindow> <cut> [<cut> ...]
//   e.g. node qa/sequence/dissolve-cuts.mjs desktop 6 42 72 108 143
// A cut index is the first frame of the new shot. Frames [cut-halfWindow, cut+halfWindow) are
// replaced by an eased blend of the last pre-cut frame (held) into the first post-cut frames.
import path from "node:path";
import sharp from "sharp";

const [variant, half, ...cutArgs] = process.argv.slice(2);
const k = Number(half);
const cuts = cutArgs.map(Number);
const dir = path.resolve("public/film-hq", variant);
const file = i => path.join(dir, `${String(i).padStart(3, "0")}.webp`);
const smooth = t => t * t * (3 - 2 * t);

// Read every frame a window touches from the untouched originals first.
const originals = new Map();
for (const c of cuts) for (let i = c - k - 1; i < c + k + 1; i++) {
  if (!originals.has(i)) originals.set(i, await sharp(file(i)).removeAlpha().raw().toBuffer({ resolveWithObject: true }));
}
for (const c of cuts) {
  for (let i = c - k; i < c + k; i++) {
    const a = originals.get(Math.min(i, c - 1)); // outgoing shot, held on its last frame
    const b = originals.get(Math.max(i, c)); // incoming shot
    const t = smooth((i - (c - k) + 0.5) / (2 * k));
    const out = Buffer.alloc(a.data.length);
    for (let p = 0; p < out.length; p++) out[p] = Math.round(a.data[p] * (1 - t) + b.data[p] * t);
    await sharp(out, { raw: a.info }).webp({ quality: 68, effort: 6, smartSubsample: true }).toFile(file(i) + ".tmp");
  }
}
// Swap in after all blends are written (so later windows never read a blended frame).
const { rename } = await import("node:fs/promises");
for (const c of cuts) for (let i = c - k; i < c + k; i++) await rename(file(i) + ".tmp", file(i));
console.log(`${variant}: dissolved ${cuts.length} cuts over ${2 * k} frames each (${cuts.join(", ")})`);
