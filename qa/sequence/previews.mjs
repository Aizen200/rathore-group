// Builds the lightweight scrub preview sheets from the full-resolution hero frames.
// Node/sharp port of previews.py (same layout and sampling), for machines without Python.
// Usage: node qa/sequence/previews.mjs
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

await mkdir("public/film-preview", { recursive: true });
for (const [variant, total, samples, columns, width, height] of [
  ["desktop", 180, 48, 8, 480, 270],
  ["mobile", 120, 36, 6, 270, 480],
]) {
  const rows = Math.ceil(samples / columns);
  const tiles = [];
  for (let sample = 0; sample < samples; sample++) {
    const index = Math.round((sample * (total - 1)) / (samples - 1));
    const input = await sharp(path.join("public/film-hq", variant, `${String(index).padStart(3, "0")}.webp`))
      .removeAlpha()
      .resize(width, height, { kernel: "lanczos3" })
      .toBuffer();
    tiles.push({ input, left: (sample % columns) * width, top: Math.floor(sample / columns) * height });
  }
  const destination = path.join("public/film-preview", `${variant}.webp`);
  await sharp({ create: { width: columns * width, height: rows * height, channels: 3, background: "#0c192b" } })
    .composite(tiles)
    .webp({ quality: 72, effort: 6 })
    .toFile(destination);
  console.log(`${variant}: ${samples} preview frames, ${((await stat(destination)).size / 1024).toFixed(0)} KiB`);
}
