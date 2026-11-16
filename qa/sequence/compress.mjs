// Re-encodes the hero film frames and scrub previews in place as smaller lossy WebP.
// Usage: node qa/sequence/compress.mjs [quality=70]
// Dimensions and format stay identical (validated by qa/sequence/validate.mjs, which also
// refreshes the cache-busting version in src/data/sequence-manifest.json on the next build).
import { readdir, rename, stat, unlink } from "node:fs/promises";
import { cpus } from "node:os";
import path from "node:path";
import sharp from "sharp";

const quality = Number(process.argv[2] || 70);
const files = [];
for (const variant of ["desktop", "retina", "mobile"]) {
  const folder = path.resolve("public/film-hq", variant);
  for (const name of (await readdir(folder)).filter(n => n.endsWith(".webp")).sort())
    files.push(path.join(folder, name));
}
files.push(path.resolve("public/film-preview/desktop.webp"), path.resolve("public/film-preview/mobile.webp"));

sharp.concurrency(1);
let before = 0, after = 0, done = 0, kept = 0;
async function compress(file) {
  const original = (await stat(file)).size;
  const temp = `${file}.tmp.webp`;
  await sharp(file)
    .removeAlpha()
    .webp({ quality, effort: 6, smartSubsample: true })
    .toFile(temp);
  const size = (await stat(temp)).size;
  before += original;
  if (size < original) {
    await rename(temp, file);
    after += size;
  } else {
    await unlink(temp);
    after += original;
    kept++;
  }
  if (++done % 40 === 0 || done === files.length)
    console.log(`${done}/${files.length}  ${(before / 2 ** 20).toFixed(1)} MiB → ${(after / 2 ** 20).toFixed(1)} MiB`);
}
const queue = [...files];
await Promise.all(Array.from({ length: Math.max(2, cpus().length - 2) }, async () => {
  while (queue.length) await compress(queue.shift());
}));
console.log(`Done at q${quality}: ${(before / 2 ** 20).toFixed(1)} MiB → ${(after / 2 ** 20).toFixed(1)} MiB (${kept} files already smaller, left as is)`);
