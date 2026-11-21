// Encodes the hero source video into the scroll-scrub videos the homepage plays.
// Usage: node qa/sequence/encode-video.mjs /absolute/path/to/video.mp4   (ffmpeg on PATH or FFMPEG=…)
//
// Every frame is a keyframe (-g 1, no B-frames), so the browser can jump straight to any frame
// with the hardware decoder (~6ms) as the scroll moves, instead of decoding from the previous
// keyframe. The audio track is dropped (-an): the hero never plays sound. Writes
// public/film-video/{desktop,mobile}.mp4, a first-frame poster for each, and
// src/data/hero-video.json (with a cache-busting version).
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const source = process.argv[2];
if (!source) throw Error("Usage: node qa/sequence/encode-video.mjs /absolute/path/to/video.mp4");
const ffmpeg = process.env.FFMPEG || "ffmpeg";
const outDir = path.resolve("public/film-video");
await mkdir(outDir, { recursive: true });

const run = args => {
  const result = spawnSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: ["ignore", "pipe", "inherit"], maxBuffer: 1 << 30 });
  if (result.status !== 0) throw Error(`ffmpeg failed: ${args.join(" ")}`);
  return result.stdout;
};

const variants = {
  desktop: { width: 1920, height: 1080, crf: 22, filter: "scale=1920:1080:flags=lanczos" },
  mobile: { width: 1080, height: 1920, crf: 25, filter: "crop=ih*9/16:ih,scale=1080:1920:flags=lanczos" },
};
const manifest = { fps: 24, frames: 0, version: "" };
const hash = createHash("sha256");
for (const [name, v] of Object.entries(variants)) {
  const file = path.join(outDir, `${name}.mp4`);
  run(["-i", source, "-an", "-vf", v.filter, "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p",
    "-preset", "slow", "-crf", String(v.crf), "-g", "1", "-keyint_min", "1", "-sc_threshold", "0", "-bf", "0",
    "-movflags", "+faststart", file]);
  // Count frames by decoding to raw grey pixels (also proves the file decodes end to end).
  const frames = run(["-i", file, "-vf", "scale=8:8", "-f", "rawvideo", "-pix_fmt", "gray", "pipe:1"]).length / 64;
  if (manifest.frames && frames !== manifest.frames) throw Error(`${name}: ${frames} frames, desktop had ${manifest.frames}`);
  manifest.frames = frames;
  const rgb = run(["-i", file, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1"]);
  await sharp(rgb, { raw: { width: v.width, height: v.height, channels: 3 } })
    .webp({ quality: 74, effort: 6 }).toFile(path.join(outDir, `poster-${name}.webp`));
  const bytes = await readFile(file);
  hash.update(bytes);
  manifest[name] = { src: `/film-video/${name}.mp4`, poster: `/film-video/poster-${name}.webp`, width: v.width, height: v.height };
  console.log(`${name}: ${frames} all-keyframe frames, ${(bytes.length / 2 ** 20).toFixed(1)} MiB, no audio`);
}
manifest.version = hash.digest("hex").slice(0, 12);
await writeFile(path.resolve("src/data/hero-video.json"), JSON.stringify(manifest, null, 2) + "\n");
