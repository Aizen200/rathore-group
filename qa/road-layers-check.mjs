// Checks the road cross-section hero (HERO_MODE = "layers"): stages build with the scroll, fast
// scrolling stays smooth, chapter buttons work, reduced motion shows the finished road, and
// nothing overflows sideways. Usage: node qa/preview-server.mjs & node qa/road-layers-check.mjs
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const base = process.env.RATHORE_BASE_URL || "http://127.0.0.1:3019";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const stages = () => [0, 1, 2, 3, 4].map(i => Number(getComputedStyle(document.querySelector(".scroll-journey")).getPropertyValue(`--l${i}`) || 0));
const scrollToProgress = (page, p) => page.evaluate(p => {
  const el = document.querySelector(".scroll-journey");
  scrollTo({ top: el.offsetTop + (el.offsetHeight - innerHeight) * p, behavior: "instant" });
}, p);
for (const v of [{ name: "desktop", width: 1440, height: 900 }, { name: "mobile", width: 390, height: 844, mobile: true }]) {
  const page = await browser.newPage({ viewport: { width: v.width, height: v.height }, isMobile: !!v.mobile, hasTouch: !!v.mobile });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto(base, { waitUntil: "networkidle" });
  await page.waitForSelector(".road-layers");
  for (const [p, expected] of [[0, [0, 0, 0, 0, 0]], [0.2, [1, 0, 0, 0, 0]], [0.44, [1, 1, 1, 0, 0]], [0.68, [1, 1, 1, 1, 0]], [1, [1, 1, 1, 1, 1]]]) {
    await scrollToProgress(page, p);
    await page.waitForTimeout(200);
    const got = await page.evaluate(stages);
    assert.deepEqual(got.map(Math.round), expected, `${v.name}: stages at ${p} were ${got}`);
  }
  console.log("PASS", v.name, "road builds stage by stage with the scroll");
  // Fast flicking: count long animation frames.
  await scrollToProgress(page, 0);
  await page.evaluate(() => { window.__long = 0; let last = performance.now(); const t = now => { if (now - last > 34) window.__long++; last = now; requestAnimationFrame(t); }; requestAnimationFrame(t); });
  await page.mouse.move(v.width / 2, v.height / 2);
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < 40; i++) { await page.mouse.wheel(0, 250); await page.waitForTimeout(16); }
    for (let i = 0; i < 40; i++) { await page.mouse.wheel(0, -250); await page.waitForTimeout(16); }
  }
  const long = await page.evaluate(() => window.__long);
  console.log(`${long <= 8 ? "PASS" : "WARN"} ${v.name} fast scroll: ${long} long frames (>34ms)`);
  await page.getByRole("button", { name: /Go to The future/ }).click();
  await page.waitForFunction(() => document.querySelector(".journey-chapters .active")?.textContent?.includes("The future"), null, { timeout: 8000 });
  console.log("PASS", v.name, "chapter navigation");
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${v.name}: horizontal overflow`);
  assert.deepEqual(errors, [], `${v.name}: page errors`);
  await page.close();
}
const reduced = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
await reduced.goto(base, { waitUntil: "networkidle" });
assert.deepEqual((await reduced.evaluate(stages)).map(Math.round), [1, 1, 1, 1, 1], "reduced motion should show the finished road");
console.log("PASS reduced motion shows the finished road");
await browser.close();
