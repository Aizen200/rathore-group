"use client";
/**
 * Scroll-driven 3D construction for the hero: open ground → rebar & foundations → steel frame
 * rising floor by floor → slabs → curtain-wall glass closing in (with welding sparks) → finished
 * tower. The camera flies one continuous path, including a pass *through* the open floors.
 *
 * Realism comes from image-based lighting and a photographed sky (Poly Haven "Goegap Road",
 * CC0: dry scrubland under a low golden sun) projected onto the ground, photo-scanned PBR textures (Poly Haven, CC0), real steel
 * I-section profiles, soft sun shadows and ACES filmic tone mapping. Vignette and film grain are
 * a CSS overlay (free to composite); a full post-processing stack was measured at 7–14 fps on a
 * retina MacBook, so it isn't used. Assets live in /public/construction (~5 MB).
 *
 * Everything is a pure function of scroll progress (eased), so scrolling back un-builds it.
 * Repeated parts are InstancedMeshes, shadows re-render only when something moved, and the
 * scene only renders while the hero is on screen.
 */
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, useTexture } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { GroundedSkybox } from "three/examples/jsm/objects/GroundedSkybox.js";

const ASSETS = "/construction";

// ---------- building layout ----------
const BAYS_X = 5;
const BAYS_Z = 3;
const BAY = 6;
const FLOORS = 16;
const STOREY = 3.6;
const HALF_X = (BAYS_X * BAY) / 2; // 15
const HALF_Z = (BAYS_Z * BAY) / 2; // 9
const xs = Array.from({ length: BAYS_X + 1 }, (_, i) => -HALF_X + i * BAY);
const zs = Array.from({ length: BAYS_Z + 1 }, (_, i) => -HALF_Z + i * BAY);

// ---------- timeline (fractions of scroll progress) ----------
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (t: number) => t * t * (3 - 2 * t);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const span = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const FRAME_START = 0.16, FRAME_SPAN = 0.3; // steel columns + beams, bottom up
const SLAB_START = 0.27, SLAB_SPAN = 0.27;
const GLASS_START = 0.5, GLASS_SPAN = 0.3;
const floorWindow = (start: number, total: number, k: number, len = 0.07) => {
  const a = start + (k / FLOORS) * total;
  return [a, a + len] as const;
};

// ---------- camera path ----------
const SHOTS: { p: number; pos: [number, number, number]; look: [number, number, number] }[] = [
  { p: 0.0, pos: [0, 2.2, 66], look: [0, 3.5, 0] }, // low over open ground
  { p: 0.12, pos: [7, 4.5, 46], look: [0, 5, 0] },
  { p: 0.27, pos: [26, 15, 34], look: [0, 15, 0] }, // rising beside the frame
  { p: 0.4, pos: [19, 27, 0.2], look: [-20, 26.5, 0] }, // entering the open floors
  { p: 0.5, pos: [-21, 27.2, 0.2], look: [-60, 27, 0] }, // flying through, out the far side
  { p: 0.62, pos: [-42, 31, 30], look: [0, 27, 0] }, // circling as the glass closes
  { p: 0.8, pos: [-34, 50, 58], look: [0, 34, 0] },
  { p: 1.0, pos: [46, 72, 118], look: [0, 30, 0] }, // wide reveal
];
const posCurve = new THREE.CatmullRomCurve3(SHOTS.map(s => new THREE.Vector3(...s.pos)), false, "centripetal");
const lookCurve = new THREE.CatmullRomCurve3(SHOTS.map(s => new THREE.Vector3(...s.look)), false, "centripetal");
function curveParam(p: number) {
  for (let i = 0; i < SHOTS.length - 1; i++) {
    const a = SHOTS[i].p, b = SHOTS[i + 1].p;
    if (p <= b) return (i + ease(span(p, a, b))) / (SHOTS.length - 1);
  }
  return 1;
}

// The low sun sits behind the opening shot, so the rocky hills and the building are lit gold
// (tested: shooting into the sun washes the scene out). Sun direction measured from the photo's
// brightest point (7° up), raised a little so shadows stay a sensible length.
const SKY_ROTATION = 0;
const SUN_DIR = new THREE.Vector3(0.801, 0.24, 0.586).applyAxisAngle(new THREE.Vector3(0, 1, 0), SKY_ROTATION).normalize();

// ---------- shared helpers ----------
const dummy = new THREE.Object3D();
const HIDDEN = 1e-4;
function place(mesh: THREE.InstancedMesh, i: number, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, ry = 0, rz = 0) {
  dummy.position.set(x, y, z);
  dummy.rotation.set(0, ry, rz);
  // Anything with a collapsed axis is fully hidden (zero scale), not drawn as a flat sliver.
  if (sx <= HIDDEN || sy <= HIDDEN || sz <= HIDDEN) dummy.scale.set(0, 0, 0);
  else dummy.scale.set(sx, sy, sz);
  dummy.updateMatrix();
  mesh.setMatrixAt(i, dummy.matrix);
}
function canvasTexture(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void, color = true) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d")!, size);
  const t = new THREE.CanvasTexture(c);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const softDot = () =>
  canvasTexture(64, (g, s) => {
    const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    r.addColorStop(0, "rgba(255,255,255,1)");
    r.addColorStop(0.4, "rgba(255,255,255,0.45)");
    r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, s, s);
  });
// Lattice for the crane mast/jib: alpha-tested so it reads as open steelwork.
const lattice = () =>
  canvasTexture(
    128,
    (g, s) => {
      g.fillStyle = "#000";
      g.fillRect(0, 0, s, s);
      g.strokeStyle = "#fff";
      g.lineWidth = 10;
      g.strokeRect(0, 0, s, s);
      g.lineWidth = 6;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(s, s);
      g.moveTo(s, 0);
      g.lineTo(0, s);
      g.stroke();
    },
    false,
  );
// Soft radial fade so the excavated site patch blends into the photographed ground.
const radialFade = () =>
  canvasTexture(
    256,
    (g, s) => {
      const r = g.createRadialGradient(s / 2, s / 2, s * 0.18, s / 2, s / 2, s / 2);
      r.addColorStop(0, "#fff");
      r.addColorStop(1, "#000");
      g.fillStyle = r;
      g.fillRect(0, 0, s, s);
    },
    false,
  );

/** Steel I/H section, extruded along +Z, centred on the origin. */
function iSection(depth: number, flange: number, length: number, tf = 0.045, tw = 0.03) {
  const s = new THREE.Shape();
  const h = depth / 2, b = flange / 2, w = tw / 2;
  s.moveTo(-b, -h);
  s.lineTo(b, -h);
  s.lineTo(b, -h + tf);
  s.lineTo(w, -h + tf);
  s.lineTo(w, h - tf);
  s.lineTo(b, h - tf);
  s.lineTo(b, h);
  s.lineTo(-b, h);
  s.lineTo(-b, h - tf);
  s.lineTo(-w, h - tf);
  s.lineTo(-w, -h + tf);
  s.lineTo(-b, -h + tf);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: length, bevelEnabled: false });
  g.translate(0, 0, -length / 2);
  g.computeVertexNormals();
  return g;
}

// ---------- photographed sky projected onto the ground ----------
function SkyBackdrop() {
  const scene = useThree(s => s.scene);
  const map = useTexture(`${ASSETS}/sky.webp`);
  useEffect(() => {
    map.mapping = THREE.EquirectangularReflectionMapping;
    map.colorSpace = THREE.SRGBColorSpace;
    const height = 18, radius = 900;
    const skybox = new GroundedSkybox(map, height, radius);
    skybox.position.y = height - 0.01;
    skybox.rotation.y = SKY_ROTATION;
    (skybox.material as THREE.MeshBasicMaterial).fog = false;
    scene.add(skybox);
    return () => {
      scene.remove(skybox);
      skybox.geometry.dispose();
      (skybox.material as THREE.Material).dispose();
    };
  }, [map, scene]);
  return null;
}

function pbr<T extends Record<string, THREE.Texture>>(maps: T, repeat: [number, number]) {
  for (const [key, t] of Object.entries(maps)) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repeat);
    t.anisotropy = 8;
    t.colorSpace = key === "map" ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  }
  return maps;
}

// ---------- the construction ----------
function Construction({ progress, mobile, reduced }: { progress: MutableRefObject<number>; mobile: boolean; reduced: boolean }) {
  const { camera, size } = useThree();
  const gl = useThree(s => s.gl);
  const shown = useRef(-1);
  const drawn = useRef(-1);

  const steelMaps = useTexture({ map: `${ASSETS}/metal_plate_diff.webp`, normalMap: `${ASSETS}/metal_plate_nor_gl.webp`, roughnessMap: `${ASSETS}/metal_plate_rough.webp` });
  const concreteMaps = useTexture({ map: `${ASSETS}/concrete_floor_worn_001_diff.webp`, normalMap: `${ASSETS}/concrete_floor_worn_001_nor_gl.webp`, roughnessMap: `${ASSETS}/concrete_floor_worn_001_rough.webp` });
  const soilMaps = useTexture({ map: `${ASSETS}/brown_mud_dry_diff.webp`, normalMap: `${ASSETS}/brown_mud_dry_nor_gl.webp`, roughnessMap: `${ASSETS}/brown_mud_dry_rough.webp` });

  const geo = useMemo(() => {
    const column = iSection(0.42, 0.4, 1, 0.05, 0.035);
    column.rotateX(-Math.PI / 2); // extrude axis → +Y
    column.translate(0, 0.5, 0); // base at y = 0 so it grows upward
    const beamX = iSection(0.45, 0.22, BAY - 0.4);
    beamX.rotateY(Math.PI / 2); // along X
    const beamZ = iSection(0.45, 0.22, BAY - 0.4); // along Z
    const slab = new THREE.BoxGeometry(BAYS_X * BAY + 0.8, 0.26, BAYS_Z * BAY + 0.8);
    const glassH = STOREY - 0.22;
    const glass = new THREE.BoxGeometry(BAY - 0.14, glassH, 0.06).translate(0, glassH / 2 + 0.06, 0);
    // Aluminium mullion grid around each panel (one vertical + one horizontal transom per bay).
    const mullionV = new THREE.BoxGeometry(0.12, STOREY, 0.16).translate(-BAY / 2, STOREY / 2, 0);
    const transom = new THREE.BoxGeometry(BAY, 0.14, 0.16).translate(0, 0.07, 0);
    const mullion = mergeBoxes([mullionV, transom]);
    const rebar = new THREE.CylinderGeometry(0.04, 0.04, 1, 5).translate(0, 0.5, 0);
    const box = new THREE.BoxGeometry(1, 1, 1);
    const mast = new THREE.BoxGeometry(1.6, 1, 1.6).translate(0, 0.5, 0);
    return { column, beamX, beamZ, slab, glass, mullion, rebar, box, mast };
  }, []);

  const mat = useMemo(() => {
    pbr(steelMaps, [1, 2]);
    pbr(concreteMaps, [3, 2]);
    pbr(soilMaps, [17, 15]);
    const latticeTex = lattice();
    latticeTex.wrapS = latticeTex.wrapT = THREE.RepeatWrapping;
    return {
      // Primed structural steel: dark grey with the plate texture's wear and roughness.
      steel: new THREE.MeshStandardMaterial({ ...steelMaps, color: "#7a7f84", metalness: 0.85, roughness: 0.6, normalScale: new THREE.Vector2(0.6, 0.6) }),
      concrete: new THREE.MeshStandardMaterial({ ...concreteMaps, color: "#d8d2c8", roughness: 1 }),
      // Tinted curtain-wall glass: near-mirror so it reflects the photographed sky. (A clearcoat
      // MeshPhysicalMaterial looked similar but more than halved the frame rate.)
      glass: new THREE.MeshStandardMaterial({ color: "#3f5361", metalness: 0.92, roughness: 0.05, envMapIntensity: 1.45 }),
      mullion: new THREE.MeshStandardMaterial({ color: "#9aa0a6", metalness: 0.9, roughness: 0.35 }),
      rebar: new THREE.MeshStandardMaterial({ color: "#6e3b22", metalness: 0.6, roughness: 0.75 }),
      crane: new THREE.MeshStandardMaterial({ color: "#e0a91f", metalness: 0.4, roughness: 0.55, alphaMap: latticeTex, alphaTest: 0.5, side: THREE.DoubleSide }),
      craneSolid: new THREE.MeshStandardMaterial({ color: "#d9a323", metalness: 0.35, roughness: 0.55 }),
      soil: new THREE.MeshStandardMaterial({ ...soilMaps, color: "#c9a27c", roughness: 1, transparent: true, alphaMap: radialFade(), depthWrite: false }),
      pile: new THREE.MeshStandardMaterial({ ...concreteMaps, color: "#b8b0a4", roughness: 0.95 }),
      shadowCatcher: new THREE.ShadowMaterial({ opacity: 0.42 }),
    };
  }, [steelMaps, concreteMaps, soilMaps]);

  const nodes = xs.length * zs.length;
  const glassPerFloor = 2 * BAYS_X + 2 * BAYS_Z;
  const columns = useRef<THREE.InstancedMesh>(null);
  const beams = useRef<THREE.InstancedMesh>(null);
  const beamsZ = useRef<THREE.InstancedMesh>(null);
  const slabs = useRef<THREE.InstancedMesh>(null);
  const glass = useRef<THREE.InstancedMesh>(null);
  const mullions = useRef<THREE.InstancedMesh>(null);
  const rebars = useRef<THREE.InstancedMesh>(null);
  const foundation = useRef<THREE.Mesh>(null);
  const crane = useRef<THREE.Group>(null);
  const mast = useRef<THREE.Mesh>(null);
  const jib = useRef<THREE.Group>(null);
  const cable = useRef<THREE.Mesh>(null);
  const sparks = useRef<THREE.Points>(null);

  // Site clutter (material stacks, site cabins) for scale; static.
  const piles = useMemo(() => {
    const rnd = mulberry(7);
    return Array.from({ length: 26 }, () => {
      const side = rnd() < 0.5 ? -1 : 1;
      return { x: side * (22 + rnd() * 20), z: -20 + rnd() * 45, w: 1.5 + rnd() * 3, h: 0.5 + rnd() * 1.4, d: 1 + rnd() * 2.5, r: rnd() * Math.PI };
    });
  }, []);
  const pilesRef = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const m = pilesRef.current;
    if (!m) return;
    piles.forEach((b, i) => place(m, i, b.x, b.h / 2, b.z, b.w, b.h, b.d, b.r));
    m.instanceMatrix.needsUpdate = true;
  }, [piles]);

  // Particles
  const dotTexture = useMemo(() => softDot(), []);
  const dustCount = mobile ? 500 : 1400;
  const dustSeed = useMemo(() => {
    const rnd = mulberry(3);
    const base = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      base[i * 3] = -90 + rnd() * 180;
      base[i * 3 + 1] = rnd() * rnd() * 34;
      base[i * 3 + 2] = -70 + rnd() * 160;
    }
    return base;
  }, [dustCount]);
  // Dust drifts in the vertex shader (no per-frame JavaScript or buffer uploads).
  const dustMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uOpacity: { value: 0.35 },
          uSize: { value: (mobile ? 1.4 : 1.1) * 300 },
          uMap: { value: dotTexture },
          uColor: { value: new THREE.Color("#e8c39a") },
        },
        vertexShader: `uniform float uTime, uSize; attribute float aSeed;
          void main(){
            vec3 p = position;
            p.x = mod(p.x + uTime * (1.2 + mod(aSeed, 7.0) * 0.15) + 90.0, 180.0) - 90.0;
            p.y += sin(uTime * 0.4 + aSeed) * 0.6;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_PointSize = uSize / -mv.z;
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: `uniform sampler2D uMap; uniform vec3 uColor; uniform float uOpacity;
          void main(){ vec4 t = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(uColor, t.a * uOpacity); }`,
      }),
    [dotTexture, mobile],
  );
  const dustSeeds = useMemo(() => Float32Array.from({ length: dustCount }, (_, i) => i), [dustCount]);
  const sparkCount = mobile ? 90 : 180;
  const sparkSeed = useMemo(() => {
    const rnd = mulberry(11);
    return Array.from({ length: sparkCount }, () => ({ o: rnd(), a: rnd() * Math.PI * 2, v: 1.5 + rnd() * 3, side: Math.floor(rnd() * 4), t: rnd() }));
  }, [sparkCount]);
  const sparkPositions = useMemo(() => new Float32Array(sparkCount * 3), [sparkCount]);

  const scene = useThree(s => s.scene);
  useEffect(() => {
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
    // Compile every shader now (behind the preloader) instead of mid-scroll when, say, the
    // glass first appears, which would stall a frame.
    gl.compile(scene, camera);
  }, [gl, scene, camera]);
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = size.width / size.height < 1 ? 64 : 40;
    cam.near = 0.5;
    cam.far = 2400;
    cam.updateProjectionMatrix();
  }, [camera, size]);

  const lookAt = useMemo(() => new THREE.Vector3(), []);
  const weldLevel = useRef(-1);
  useFrame((state, delta) => {
    const target = progress.current;
    if (shown.current < 0 || reduced) shown.current = target;
    else {
      shown.current += (target - shown.current) * (1 - Math.exp(-Math.min(delta, 0.064) / 0.12));
      if (Math.abs(target - shown.current) < 0.0004) shown.current = target;
    }
    const p = shown.current;
    const time = reduced ? 0 : state.clock.elapsedTime;

    const u = curveParam(p);
    posCurve.getPoint(u, state.camera.position);
    lookCurve.getPoint(u, lookAt);
    state.camera.lookAt(lookAt);

    if (Math.abs(p - drawn.current) > 1e-5) {
      drawn.current = p;
      updateStructure(p);
      // Static scene between scroll moves: re-render the shadow map only when something changed.
      state.gl.shadowMap.needsUpdate = true;
    }
    updateParticles(p, time);
  });

  function updateStructure(p: number) {
    const col = columns.current, bx = beams.current, bz = beamsZ.current, sl = slabs.current, gls = glass.current, mu = mullions.current, rb = rebars.current;
    if (!col || !bx || !bz || !sl || !gls || !mu || !rb) return;
    const f = easeOut(span(p, 0.05, 0.13));
    if (foundation.current) {
      foundation.current.scale.set(1, Math.max(f, HIDDEN), 1);
      foundation.current.visible = f > 0;
    }
    // Starter bars: a cluster of 4 per column node, rising out of the footings.
    const r = easeOut(span(p, 0.08, 0.2));
    let n = 0;
    for (const x of xs) for (const z of zs) for (const [ox, oz] of [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]]) place(rb, n++, x + ox, 0.3, z + oz, 1, 4.4 * r, 1);
    rb.instanceMatrix.needsUpdate = true;

    let ci = 0, bi = 0, bzi = 0, gi = 0, mi = 0;
    let topFrame = 0;
    let weldFloor = -1;
    for (let k = 0; k < FLOORS; k++) {
      const [a, b] = floorWindow(FRAME_START, FRAME_SPAN, k, 0.075);
      const t = span(p, a, b);
      const rise = easeOut(clamp01(t / 0.55));
      const fly = easeOut(clamp01((t - 0.4) / 0.6));
      const base = 0.3 + k * STOREY;
      if (rise > 0) topFrame = base + STOREY * rise;
      for (const x of xs) for (const z of zs) place(col, ci++, x, base, z, 1, STOREY * rise, 1);
      const yTop = base + STOREY - 0.23;
      const drop = (1 - fly) * 9;
      const tilt = (1 - fly) * 0.35;
      const vis = fly > 0 ? 1 : 0;
      for (let i = 0; i < BAYS_X; i++) for (const z of zs) place(bx, bi++, xs[i] + BAY / 2, yTop + drop, z, vis, vis, vis, 0, tilt);
      for (const x of xs) for (let j = 0; j < BAYS_Z; j++) place(bz, bzi++, x, yTop + drop, zs[j] + BAY / 2, vis, vis, vis, tilt);
      const [sa, sb] = floorWindow(SLAB_START, SLAB_SPAN, k, 0.06);
      const s = easeOut(span(p, sa, sb));
      place(sl, k, 0, base + STOREY - 0.13, 0, s, s > 0 ? 1 : HIDDEN, s);
      const [ga, gb] = floorWindow(GLASS_START, GLASS_SPAN, k, 0.06);
      const g = easeOut(span(p, ga, gb));
      if (g > 0 && g < 1) weldFloor = k;
      const lift = (1 - g) * -2.2;
      const gv = g > 0 ? 1 : 0;
      const panel = (x: number, z: number, ry: number) => {
        place(gls, gi++, x, base + lift, z, gv, g, gv, ry);
        place(mu, mi++, x, base + lift, z, gv, g, gv, ry);
      };
      for (let i = 0; i < BAYS_X; i++) {
        panel(xs[i] + BAY / 2, HALF_Z + 0.42, 0);
        panel(xs[i] + BAY / 2, -HALF_Z - 0.42, Math.PI);
      }
      for (let j = 0; j < BAYS_Z; j++) {
        panel(HALF_X + 0.42, zs[j] + BAY / 2, Math.PI / 2);
        panel(-HALF_X - 0.42, zs[j] + BAY / 2, -Math.PI / 2);
      }
    }
    for (const m of [col, bx, bz, sl, gls, mu]) m.instanceMatrix.needsUpdate = true;
    weldLevel.current = weldFloor < 0 ? -1 : 0.3 + weldFloor * STOREY + STOREY * 0.9;

    const mastH = Math.max(14, topFrame + 9);
    const remove = ease(span(p, 0.84, 0.95));
    if (mast.current) {
      mast.current.scale.set(1, mastH, 1);
      const tex = (mast.current.material as THREE.MeshStandardMaterial).alphaMap;
      if (tex) tex.repeat.set(1, mastH / 1.6);
    }
    if (jib.current) {
      jib.current.position.y = mastH;
      jib.current.rotation.y = 0.9 + p * 3.4;
    }
    if (cable.current) {
      const len = Math.max(2, mastH - Math.max(topFrame, 6) - 1);
      cable.current.scale.set(1, len, 1);
      cable.current.position.y = -len / 2;
    }
    if (crane.current) {
      crane.current.position.y = -remove * (mastH + 12);
      crane.current.visible = remove < 1;
    }
  }

  function updateParticles(p: number, time: number) {
    dustMaterial.uniforms.uTime.value = time;
    dustMaterial.uniforms.uOpacity.value = 0.35 - 0.25 * span(p, 0.1, 0.9);
    const s = sparks.current;
    if (!s) return;
    const level = weldLevel.current;
    (s.material as THREE.PointsMaterial).opacity = level < 0 ? 0 : 1;
    if (level < 0) return;
    const arr = sparkPositions;
    sparkSeed.forEach((sp, i) => {
      const age = (time * 1.4 + sp.t) % 1;
      const along = ((sp.o + Math.floor(time * 1.4 + sp.t) * 0.37) % 1) * 2 - 1;
      let x = 0, z = 0;
      if (sp.side === 0) { x = along * HALF_X; z = HALF_Z + 0.6; }
      else if (sp.side === 1) { x = along * HALF_X; z = -HALF_Z - 0.6; }
      else if (sp.side === 2) { x = HALF_X + 0.6; z = along * HALF_Z; }
      else { x = -HALF_X - 0.6; z = along * HALF_Z; }
      const out = sp.v * age;
      arr[i * 3] = x + Math.cos(sp.a) * out * (sp.side >= 2 ? 1.6 : 0.6);
      arr[i * 3 + 1] = level + sp.v * 0.8 * age - 9.8 * age * age;
      arr[i * 3 + 2] = z + Math.sin(sp.a) * out * (sp.side < 2 ? 1.6 : 0.6);
    });
    (s.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  const shadows = !mobile;
  return (
    <>
      <SkyBackdrop />
      {/* Light and reflections come from the same photographed sky (local file, no CDN). */}
      <Environment files={`${ASSETS}/sky.hdr`} environmentIntensity={0.9} environmentRotation={[0, SKY_ROTATION, 0]} />
      <fog attach="fog" args={["#cdb08c", 180, 1100]} />
      <directionalLight
        position={[SUN_DIR.x * 180, SUN_DIR.y * 180, SUN_DIR.z * 180]}
        intensity={3.2}
        color="#ffc08a"
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={70}
        shadow-camera-bottom={-40}
        shadow-camera-near={20}
        shadow-camera-far={420}
        shadow-radius={4}
        shadow-blurSamples={8}
        shadow-bias={-0.0003}
        shadow-normalBias={0.04}
      />

      {/* Shadows fall on the photographed ground; a textured site patch blends into it. */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]} receiveShadow material={mat.shadowCatcher}>
        <planeGeometry args={[600, 600]} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.03, 2]} receiveShadow material={mat.soil}>
        <planeGeometry args={[220, 190]} />
      </mesh>
      <instancedMesh ref={pilesRef} args={[geo.box, mat.pile, piles.length]} castShadow receiveShadow />

      <mesh ref={foundation} castShadow receiveShadow material={mat.concrete} visible={false}>
        <boxGeometry args={[BAYS_X * BAY + 4, 0.6, BAYS_Z * BAY + 4]} />
      </mesh>
      <instancedMesh ref={rebars} args={[geo.rebar, mat.rebar, nodes * 4]} castShadow />

      <instancedMesh ref={columns} args={[geo.column, mat.steel, nodes * FLOORS]} castShadow receiveShadow />
      <instancedMesh ref={beams} args={[geo.beamX, mat.steel, BAYS_X * zs.length * FLOORS]} castShadow receiveShadow />
      <instancedMesh ref={beamsZ} args={[geo.beamZ, mat.steel, BAYS_Z * xs.length * FLOORS]} castShadow receiveShadow />
      <instancedMesh ref={slabs} args={[geo.slab, mat.concrete, FLOORS]} castShadow receiveShadow />
      <instancedMesh ref={glass} args={[geo.glass, mat.glass, glassPerFloor * FLOORS]} castShadow />
      <instancedMesh ref={mullions} args={[geo.mullion, mat.mullion, glassPerFloor * FLOORS]} castShadow />

      {/* Tower crane: open lattice mast and jib */}
      <group ref={crane} position={[-26, 0, 8]}>
        <mesh ref={mast} geometry={geo.mast} material={mat.crane} castShadow />
        <group ref={jib}>
          <mesh position={[11, 0.45, 0]} material={mat.crane} castShadow>
            <boxGeometry args={[30, 1, 1]} />
          </mesh>
          <mesh position={[-6, 0.4, 0]} material={mat.concrete} castShadow>
            <boxGeometry args={[5, 1.8, 2.2]} />
          </mesh>
          <mesh position={[1.4, 0.9, 0]} material={mat.craneSolid} castShadow>
            <boxGeometry args={[1.8, 1.6, 1.6]} />
          </mesh>
          <mesh position={[0, 3.2, 0]} material={mat.crane}>
            <boxGeometry args={[1, 5, 1]} />
          </mesh>
          <group position={[22, 0, 0]}>
            <mesh ref={cable} material={mat.steel}>
              <boxGeometry args={[0.06, 1, 0.06]} />
            </mesh>
          </group>
        </group>
      </group>

      <points frustumCulled={false} material={dustMaterial}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[dustSeed, 3]} />
          <bufferAttribute attach="attributes-aSeed" args={[dustSeeds, 1]} />
        </bufferGeometry>
      </points>
      <points ref={sparks} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[sparkPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial map={dotTexture} color="#ffb347" size={0.5} sizeAttenuation transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
    </>
  );
}

/** Merges simple indexed geometries (boxes) into one. */
function mergeBoxes(parts: THREE.BufferGeometry[]) {
  const positions: number[] = [], normals: number[] = [], uvs: number[] = [], index: number[] = [];
  let offset = 0;
  for (const g of parts) {
    const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      normals.push(nor.getX(i), nor.getY(i), nor.getZ(i));
      uvs.push(uv.getX(i), uv.getY(i));
    }
    const idx = g.index!;
    for (let i = 0; i < idx.count; i++) index.push(idx.getX(i) + offset);
    offset += pos.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  out.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  out.setIndex(index);
  return out;
}

function mulberry(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function ConstructionScene({ progress, active }: { progress: MutableRefObject<number>; active: boolean }) {
  const { mobile, reduced } = useMemo(() => {
    if (typeof window === "undefined") return { mobile: false, reduced: false };
    return {
      mobile: matchMedia("(max-width: 700px)").matches,
      reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
    };
  }, []);
  return (
    <Canvas
      className="journey-3d"
      frameloop={active ? "always" : "never"}
      // Fixed 1.5× density: measured GPU cost is ~1.8 ms/frame on a retina MacBook (60 fps needs
      // 16.7 ms), so there is ample headroom. An adaptive monitor misread macOS Low Power Mode's
      // 30 fps cap as slowness and dropped to a blurrier 1×.
      dpr={[1, 1.5]}
      shadows={!mobile} /* PCF + blur radius: soft edges without PCF-soft's per-pixel cost */
      camera={{ position: [0, 2.2, 66], fov: 40 }}
      gl={{ antialias: true, powerPreference: "high-performance", stencil: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      aria-hidden="true"
    >
      <Suspense fallback={null}>
        <Construction progress={progress} mobile={mobile} reduced={reduced} />
      </Suspense>
    </Canvas>
  );
}
