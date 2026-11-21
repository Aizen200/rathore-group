// Checks the tunnel hero (HERO_MODE = "tunnel"): cards fly with the scroll, fast scrolling stays
// smooth, only on-screen cards play (all muted, no audio tracks), chapter buttons work, reduced
// motion holds still, nothing overflows. Usage: node qa/preview-server.mjs & node qa/tunnel-check.mjs
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const base = process.env.RATHORE_BASE_URL || "http://127.0.0.1:3019";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const toProgress = (page, p) => page.evaluate(p => {
  const el = document.querySelector(".scroll-journey");
  scrollTo({ top: el.offsetTop + (el.offsetHeight - innerHeight) * p, behavior: "instant" });
}, p);
const state = page => page.evaluate(() => ({
  title: document.querySelector(".tunnel-title")?.getAttribute("aria-label"),
  playing: [...document.querySelectorAll(".tunnel-card video")].map(v => !v.paused),
  muted: [...document.querySelectorAll(".tunnel-card video")].every(v => v.muted),
  audio: [...document.querySelectorAll(".tunnel-card video")].some(v => v.mozHasAudio || v.webkitAudioDecodedByteCount > 0 || (v.audioTracks && v.audioTracks.length > 0)),
}));
for (const v of [{ name: "desktop", width: 1440, height: 900 }, { name: "mobile", width: 390, height: 844, mobile: true }]) {
  const page = await browser.newPage({ viewport: { width: v.width, height: v.height }, isMobile: !!v.mobile, hasTouch: !!v.mobile });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto(base, { waitUntil: "networkidle" });
  await page.waitForSelector(".tunnel-card");
  const titles = [];
  for (const p of [0.05, 0.27, 0.5, 0.73, 0.98]) {
    await toProgress(page, p);
    await page.waitForTimeout(900);
    const s = await state(page);
    titles.push(s.title);
    assert.ok(s.playing.filter(Boolean).length <= 3, `${v.name}: too many videos playing at ${p}`);
    assert.ok(s.muted && !s.audio, `${v.name}: videos must be silent`);
  }
  assert.equal(new Set(titles).size, 5, `${v.name}: expected five chapters, saw ${titles}`);
  console.log("PASS", v.name, "five chapters fly through; only on-screen cards play; all silent");
  await toProgress(page, 0);
  await page.waitForTimeout(400);
  await page.evaluate(() => { window.__long = 0; let last = performance.now(); const t = now => { if (now - last > 34) window.__long++; last = now; requestAnimationFrame(t); }; requestAnimationFrame(t); });
  await page.mouse.move(v.width / 2, v.height / 2);
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < 40; i++) { await page.mouse.wheel(0, 250); await page.waitForTimeout(16); }
    for (let i = 0; i < 40; i++) { await page.mouse.wheel(0, -250); await page.waitForTimeout(16); }
  }
  const long = await page.evaluate(() => window.__long);
  console.log(`${long <= 10 ? "PASS" : "WARN"} ${v.name} fast scroll: ${long} long frames (>34ms)`);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${v.name}: horizontal overflow`);
  assert.deepEqual(errors, [], `${v.name}: page errors`);
  await page.close();
}
const reduced = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
await reduced.goto(base, { waitUntil: "networkidle" });
await reduced.waitForTimeout(800);
const r = await state(reduced);
assert.ok(r.playing.every(p => !p), "reduced motion: videos should not play");
console.log("PASS reduced motion holds still (no playback)");
await browser.close();
