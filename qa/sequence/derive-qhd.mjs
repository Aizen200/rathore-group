// Derives the 2560×1440 scrub frames from the 4K retina frames (same footage, no new source).
// Usage: node qa/sequence/derive-qhd.mjs [quality=72]
import { mkdir, readdir } from "node:fs/promises";
import { cpus } from "node:os";
import path from "node:path";
import sharp from "sharp";
const quality = Number(process.argv[2] || 72);
const from = path.resolve("public/film-hq/retina");
const to = path.resolve("public/film-hq/qhd");
await mkdir(to, { recursive: true });
const names = (await readdir(from)).filter(n => /^\d{3}\.webp$/.test(n)).sort();
sharp.concurrency(1);
let done = 0;
const queue = [...names];
await Promise.all(Array.from({ length: Math.max(2, cpus().length - 2) }, async () => {
  while (queue.length) {
    const name = queue.shift();
    await sharp(path.join(from, name))
      .resize(2560, 1440, { kernel: "lanczos3" })
      .removeAlpha()
      .webp({ quality, effort: 6, smartSubsample: true })
      .toFile(path.join(to, name));
    if (++done % 45 === 0) console.log(`${done}/${names.length}`);
  }
}));
console.log(`qhd: ${names.length} frames at 2560×1440, q${quality}`);
