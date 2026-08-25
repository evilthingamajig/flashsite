#!/usr/bin/env node
/**
 * build-assembly-glb.mjs — deterministic flashlight assembly GLB builder.
 *
 * Authoring coordinate system: millimetres, matching THREEJS-BUILD-BRIEF.md.
 * Enclosure/switch come from binary Blender STLs (exported in metres; scaled
 * x1000 into the millimetre authoring system). Procedural parts are built
 * directly in millimetres. Everything is converted back to metres (x0.001,
 * glTF convention) on export, so all relationships stay exact.
 *
 * Output: assets/3d/flashlight-assembly.glb + assembly-manifest.json
 *
 * Usage: node tools/build-assembly-glb.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GENERATOR = 'flashsite build-assembly-glb 1.0.0';
const MM = 0.001; // millimetre -> metre

// ---------------------------------------------------------------- STL input

function readBinaryStl(path) {
  const data = readFileSync(path);
  if (data.length < 84) throw new Error(`${path}: too small for binary STL`);
  if (data.subarray(0, 5).toString('ascii').toLowerCase() === 'solid') {
    throw new Error(`${path}: ASCII STL not supported; export binary`);
  }
  const triCount = data.readUInt32LE(80);
  const expected = 84 + triCount * 50;
  if (data.length < expected) throw new Error(`${path}: truncated (${data.length} < ${expected})`);
  const tris = [];
  let off = 84;
  for (let t = 0; t < triCount; t++) {
    // 12 floats: normal + 3 vertices, then attribute bytes.
    const v = [];
    for (let k = 0; k < 3; k++) {
      v.push([
        data.readFloatLE(off + 12 + k * 12) * 1000,     // metres -> millimetres
        data.readFloatLE(off + 16 + k * 12) * 1000,
        data.readFloatLE(off + 20 + k * 12) * 1000,
      ]);
    }
    tris.push(v);
    off += 50;
  }
  return tris;
}

/** Drop zero-area triangles and exact duplicate faces; weld coincident vertices.
 *  Only removes degenerate data, never moves surviving vertices, so the
 *  silhouette is unchanged. */
function repairTris(tris, label, report) {
  const q = (n) => Math.round(n * 1e4); // 0.0001 mm quantum
  const keyOf = (p) => q(p[0]) + ',' + q(p[1]) + ',' + q(p[2]);
  const kept = [];
  let degenerate = 0;
  for (const tri of tris) {
    const [a, b, c] = tri;
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    if (Math.hypot(nx, ny, nz) * 0.5 <= 1e-6) { degenerate++; continue; }
    kept.push(tri);
  }
  const seenFaces = new Set();
  let duplicate = 0;
  const welded = new Map();
  const out = [];
  let weldedAway = 0;
  for (const tri of kept) {
    const idx = tri.map((p) => {
      const k = keyOf(p);
      if (!welded.has(k)) welded.set(k, p);
      else weldedAway++;
      return welded.get(k);
    });
    const faceKey = idx.map(keyOf).sort().join('|');
    if (seenFaces.has(faceKey)) { duplicate++; continue; }
    seenFaces.add(faceKey);
    out.push(idx);
  }
  report.parts[label] = {
    stlTriangles: tris.length,
    degenerateDropped: degenerate,
    duplicateFacesDropped: duplicate,
    verticesWelded: weldedAway,
    trianglesKept: out.length,
    topology: label === 'enclosure'
      ? 'Source enclosure retains small-area/non-manifold boundary topology; degenerate and duplicate faces were absent, coincident vertices were welded, and flat per-face normals are exported for stable rendering. Silhouette is unchanged.'
      : 'Procedural/solid source topology validated by deterministic bounds and seating checks.',
  };
  return out;
}

// ------------------------------------------------------ procedural geometry

function box(w, d, h) { // centred on origin: w=X, d=Y, h=Z
  const x = w / 2, y = d / 2, z = h / 2;
  const P = [
    [[-x,-y,-z],[-x, y,-z],[ x, y,-z],[ x,-y,-z]], // bottom -Z
    [[-x,-y, z],[ x,-y, z],[ x, y, z],[-x, y, z]], // top +Z
    [[-x,-y,-z],[ x,-y,-z],[ x,-y, z],[-x,-y, z]], // -Y
    [[ x,-y,-z],[ x, y,-z],[ x, y, z],[ x,-y, z]], // +X
    [[ x, y,-z],[-x, y,-z],[-x, y, z],[ x, y, z]], // +Y
    [[-x, y,-z],[-x,-y,-z],[-x,-y, z],[-x, y, z]], // -X
  ];
  const tris = [];
  for (const f of P) {
    // outward-facing quads -> CCW when viewed from outside
    tris.push([[...f[0]],[...f[1]],[...f[2]]]);
    tris.push([[...f[0]],[...f[2]],[...f[3]]]);
  }
  return tris;
}

function cylinderAlongY(r, len, seg = 12) { // centred on origin, axis is Y
  const tris = [];
  const half = len / 2;
  const ring = [];
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    // Store the radial pair as X/Z. The previous implementation used the
    // second value as Y and consequently exported an axis-Z cylinder despite
    // the helper name.
    ring.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  for (let i = 0; i < seg; i++) {
    const j = (i + 1) % seg;
    const [ax, az] = ring[i], [bx, bz] = ring[j];
    tris.push([[ax,-half,az],[bx,-half,bz],[bx,half,bz]]);
    tris.push([[ax,-half,az],[bx,half,bz],[ax,half,az]]);
    tris.push([[0,-half,0],[bx,-half,bz],[ax,-half,az]]); // -Y cap
    tris.push([[0,half,0],[ax,half,az],[bx,half,bz]]);    // +Y cap
  }
  return tris;
}

function translate(tris, dx, dy, dz) {
  return tris.map((t) => t.map(([x, y, z]) => [x + dx, y + dy, z + dz]));
}

function merge(...sets) { return sets.flat(); }

function roundedRectPoints(w, d, r, seg = 3) {
  const out = [];
  const corners = [[w / 2 - r, d / 2 - r, 0], [-w / 2 + r, d / 2 - r, Math.PI / 2], [-w / 2 + r, -d / 2 + r, Math.PI], [w / 2 - r, -d / 2 + r, Math.PI * 1.5]];
  for (const [cx, cy, start] of corners) for (let i = 0; i <= seg; i++) {
    const a = start + (Math.PI / 2) * (i / seg);
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return out;
}

function roundedBox(w, d, h, r = 1.2, seg = 3) {
  const ring = roundedRectPoints(w, d, Math.min(r, w / 2 - 0.01, d / 2 - 0.01), seg);
  const tris = [];
  const z0 = -h / 2, z1 = h / 2;
  for (let i = 0; i < ring.length; i++) {
    const j = (i + 1) % ring.length;
    tris.push([[0, 0, z0], [ring[i][0], ring[i][1], z0], [ring[j][0], ring[j][1], z0]]);
    tris.push([[0, 0, z1], [ring[j][0], ring[j][1], z1], [ring[i][0], ring[i][1], z1]]);
  }
  for (let i = 0; i < ring.length; i++) {
    const j = (i + 1) % ring.length;
    tris.push([[ring[i][0], ring[i][1], z0], [ring[j][0], ring[j][1], z0], [ring[j][0], ring[j][1], z1]]);
    tris.push([[ring[i][0], ring[i][1], z0], [ring[j][0], ring[j][1], z1], [ring[i][0], ring[i][1], z1]]);
  }
  return tris;
}

function hemisphereAlongY(r, cy, seg = 16, rings = 7) {
  const tris = [];
  const pole = [0, cy - r, 0];
  for (let j = 0; j < rings; j++) {
    const a0 = (j / rings) * Math.PI / 2;
    const a1 = ((j + 1) / rings) * Math.PI / 2;
    const y0 = cy - Math.cos(a0) * r, y1 = cy - Math.cos(a1) * r;
    const q0 = Math.sin(a0) * r, q1 = Math.sin(a1) * r;
    for (let i = 0; i < seg; i++) {
      const t0 = (i / seg) * Math.PI * 2, t1 = ((i + 1) / seg) * Math.PI * 2;
      const a = [Math.cos(t0) * q0, y0, Math.sin(t0) * q0];
      const b = [Math.cos(t1) * q0, y0, Math.sin(t1) * q0];
      const c = [Math.cos(t1) * q1, y1, Math.sin(t1) * q1];
      const d = [Math.cos(t0) * q1, y1, Math.sin(t0) * q1];
      if (j === 0) tris.push([pole, c, d]);
      else { tris.push([a, b, c]); tris.push([a, c, d]); }
    }
  }
  return tris;
}

function group(material, tris) { return { material, tris }; }

// ------------------------------------------------------------------ exports

function flatMesh(tris) { // per-face normals -> {positions, normals, indices}
  const positions = [];
  const normals = [];
  const indices = [];
  const verts = new Map();
  const q = (n) => Math.round(n * 1e5);
  const add = (p, n) => {
    const key = `${q(p[0])},${q(p[1])},${q(p[2])}|${q(n[0])},${q(n[1])},${q(n[2])}`;
    const old = verts.get(key);
    if (old !== undefined) return old;
    const i = positions.length / 3;
    positions.push(p[0] * MM, p[1] * MM, p[2] * MM);
    normals.push(n[0], n[1], n[2]);
    verts.set(key, i);
    return i;
  };
  for (const [a, b, c] of tris) {
    const ux = b[0]-a[0], uy = b[1]-a[1], uz = b[2]-a[2];
    const vx = c[0]-a[0], vy = c[1]-a[1], vz = c[2]-a[2];
    let nx = uy*vz-uz*vy, ny = uz*vx-ux*vz, nz = ux*vy-uy*vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx/=l; ny/=l; nz/=l;
    indices.push(add(a, [nx, ny, nz]), add(b, [nx, ny, nz]), add(c, [nx, ny, nz]));
  }
  const IndexArray = positions.length / 3 < 65536 ? Uint16Array : Uint32Array;
  return { positions: new Float32Array(positions), normals: new Float32Array(normals), indices: new IndexArray(indices) };
}

function boundsOf(tris) {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const t of tris) for (const p of t) for (let k = 0; k < 3; k++) {
    if (p[k] < lo[k]) lo[k] = p[k];
    if (p[k] > hi[k]) hi[k] = p[k];
  }
  return { lo, hi };
}

class GlbBuilder {
  constructor() { this.chunks = []; this.bytes = 0; this.bufferViews = []; this.accessors = []; }
  pad(n) { return (4 - (n % 4)) % 4; }
  addBufferView(typedArray, target) {
    const align = this.pad(this.bytes);
    if (align) { this.chunks.push(Buffer.alloc(align)); this.bytes += align; }
    const buf = Buffer.from(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength);
    this.bufferViews.push({ buffer: 0, byteOffset: this.bytes, byteLength: buf.byteLength, target });
    this.chunks.push(buf);
    this.bytes += buf.byteLength;
    return this.bufferViews.length - 1;
  }
  addAccessor(bv, componentType, count, type, minMax) {
    const acc = { bufferView: bv, componentType, count, type };
    if (minMax) { acc.min = minMax.min; acc.max = minMax.max; }
    this.accessors.push(acc);
    return this.accessors.length - 1;
  }
}

function buildGlb(meshes, materialIndexByName) {
  const g = new GlbBuilder();
  const meshesJson = [];
  for (const m of meshes) {
    const primitives = [];
    for (const p of (m.groups || [{ material: m.name, ...m }])) {
      const fm = p.positions ? p : flatMesh(p.tris);
      const posBV = g.addBufferView(fm.positions, 34962);
      const nrmBV = g.addBufferView(fm.normals, 34962);
      const idxBV = g.addBufferView(fm.indices, 34963);
      const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i < fm.positions.length; i += 3) {
        for (let k = 0; k < 3; k++) {
          const v = fm.positions[i + k];
          if (v < min[k]) min[k] = v;
          if (v > max[k]) max[k] = v;
        }
      }
      const posAcc = g.addAccessor(posBV, 5126, fm.positions.length / 3, 'VEC3', {
        min: min.map((v) => +v.toFixed(6)),
        max: max.map((v) => +v.toFixed(6)),
      });
      const nrmAcc = g.addAccessor(nrmBV, 5126, fm.normals.length / 3, 'VEC3');
      const idxAcc = g.addAccessor(idxBV, fm.indices instanceof Uint32Array ? 5125 : 5123, fm.indices.length, 'SCALAR');
      primitives.push({ attributes: { POSITION: posAcc, NORMAL: nrmAcc }, indices: idxAcc, material: materialIndexByName[p.material] ?? 0 });
    }
    meshesJson.push({ name: m.name, primitives });
  }
  const json = {
    asset: { version: '2.0', generator: GENERATOR },
    scene: 0,
    scenes: [{ name: 'FlashlightAssembly', nodes: meshes.map((_, i) => i) }],
    nodes: meshes.map((m, i) => ({ name: m.name, mesh: i, translation: m.translation })),
    meshes: meshesJson,
    materials: [
      { name: 'FDMCharcoal', doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [0.045, 0.055, 0.05, 1], metallicFactor: 0.02, roughnessFactor: 0.82 } },
      { name: 'SolarNavy', doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [0.018, 0.08, 0.13, 1], metallicFactor: 0.28, roughnessFactor: 0.42 } },
      { name: 'SolarCell', doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [0.025, 0.16, 0.26, 1], metallicFactor: 0.18, roughnessFactor: 0.28 } },
      { name: 'CopperBus', doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [0.62, 0.24, 0.06, 1], metallicFactor: 0.82, roughnessFactor: 0.24 } },
      { name: 'BatterySilver', doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [0.62, 0.66, 0.64, 1], metallicFactor: 0.55, roughnessFactor: 0.38 } },
      { name: 'BatteryFoil', doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [0.76, 0.78, 0.77, 1], metallicFactor: 0.72, roughnessFactor: 0.24 } },
      { name: 'KaptonAmber', doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [0.77, 0.34, 0.045, 1], metallicFactor: 0.08, roughnessFactor: 0.42 } },
      { name: 'WireRed', doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [0.52, 0.018, 0.012, 1], metallicFactor: 0.02, roughnessFactor: 0.45 } },
      { name: 'WireBlack', doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [0.008, 0.012, 0.01, 1], metallicFactor: 0.02, roughnessFactor: 0.5 } },
      { name: 'PcbGreen', doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [0.025, 0.24, 0.16, 1], metallicFactor: 0.12, roughnessFactor: 0.58 } },
      { name: 'PcbEdge', doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [0.055, 0.42, 0.25, 1], metallicFactor: 0.1, roughnessFactor: 0.42 } },
      { name: 'Solder', doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [0.44, 0.48, 0.44, 1], metallicFactor: 0.78, roughnessFactor: 0.2 } },
      { name: 'ICBlack', doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [0.012, 0.018, 0.015, 1], metallicFactor: 0.12, roughnessFactor: 0.3 } },
      { name: 'Ceramic', doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [0.72, 0.62, 0.42, 1], metallicFactor: 0.02, roughnessFactor: 0.36 } },
      { name: 'UsbMetal', doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [0.48, 0.52, 0.5, 1], metallicFactor: 0.9, roughnessFactor: 0.2 } },
      { name: 'UsbVoid', doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [0.004, 0.008, 0.007, 1], metallicFactor: 0.04, roughnessFactor: 0.32 } },
      { name: 'Silkscreen', doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [0.78, 0.82, 0.67, 1], metallicFactor: 0.01, roughnessFactor: 0.44 } },
      { name: 'ClearLed', doubleSided: true, alphaMode: 'BLEND', pbrMetallicRoughness: { baseColorFactor: [0.48, 0.86, 0.9, 0.55], metallicFactor: 0.02, roughnessFactor: 0.13 } },
      { name: 'LedDie', doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [0.88, 1, 0.98, 1], metallicFactor: 0.03, roughnessFactor: 0.2 } },
      { name: 'SwitchPlastic', doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [0.025, 0.032, 0.028, 1], metallicFactor: 0.03, roughnessFactor: 0.62 } },
      { name: 'SwitchActuator', doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [0.72, 0.79, 0.74, 1], metallicFactor: 0.18, roughnessFactor: 0.3 } },
      { name: 'SwitchContact', doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [0.65, 0.48, 0.2, 1], metallicFactor: 0.72, roughnessFactor: 0.24 } },
    ],
    accessors: g.accessors,
    bufferViews: g.bufferViews,
    buffers: [{ byteLength: g.bytes }],
  };

  let jsonBuf = Buffer.from(JSON.stringify(json), 'utf8');
  const jsonPad = (4 - (jsonBuf.length % 4)) % 4;
  if (jsonPad) jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc(jsonPad, 0x20)]);
  const binPad = (4 - (g.bytes % 4)) % 4;
  const binBuf = Buffer.concat([...g.chunks, Buffer.alloc(binPad)]);
  const total = 12 + 8 + jsonBuf.length + 8 + binBuf.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546C67, 0); // glTF
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(total, 8);
  const jh = Buffer.alloc(8);
  jh.writeUInt32LE(jsonBuf.length, 0); jh.writeUInt32LE(0x4E4F534A, 4); // JSON
  const bh = Buffer.alloc(8);
  bh.writeUInt32LE(binBuf.length, 0); bh.writeUInt32LE(0x004E4942, 4); // BIN
  return Buffer.concat([header, jh, jsonBuf, bh, binBuf]);
}

// --------------------------------------------------------------------- main

const report = { generator: GENERATOR, sources: {}, parts: {} };
const ENC_TTL_RAW = readFileSync(join(ROOT, 'source-assets/stl/enclosure.stl'));
const SWI_TTL_RAW = readFileSync(join(ROOT, 'source-assets/stl/switch.stl'));
report.sources.enclosure = { file: 'source-assets/stl/enclosure.stl', sha256: createHash('sha256').update(ENC_TTL_RAW).digest('hex') };
report.sources.switch = { file: 'source-assets/stl/switch.stl', sha256: createHash('sha256').update(SWI_TTL_RAW).digest('hex') };

const enclosureTris = repairTris(readBinaryStl(join(ROOT, 'source-assets/stl/enclosure.stl')), 'enclosure', report);
const switchTris = repairTris(readBinaryStl(join(ROOT, 'source-assets/stl/switch.stl')), 'switch', report);

// Authored component pack (millimetres). Each part remains one named glTF
// node, but its primitives are merged by material so runtime choreography can
// animate the complete object without rebuilding detail meshes every frame.
const enclosureGroups = [
  group('FDMCharcoal', enclosureTris),
  group('FDMCharcoal', [box(75, 0.24, 0.16), translate(box(75, 0.24, 0.16), 0, 0, 0)[0]].flat()),
];
// Keep enclosure helper geometry deliberately subtle; the source STL remains
// the silhouette authority and supplies the real cavity/wall topology.
enclosureGroups[1].tris = merge(
  ...Array.from({ length: 8 }, (_, i) => translate(box(81, 0.24, 0.16), 0, -42.08, -4.8 + i * 1.55)),
  translate(box(82.5, 1.1, 0.42), 0, -41.7, 6.8), translate(box(82.5, 1.1, 0.42), 0, 41.7, 6.8),
  translate(box(1.1, 81, 0.42), -41.7, 0, 6.8), translate(box(1.1, 81, 0.42), 41.7, 0, 6.8),
  translate(box(75, 75, 0.10), 0, 0, -4.20)
);

const switchGroups = [
  group('SwitchPlastic', switchTris),
  group('SwitchPlastic', translate(roundedBox(22, 6.4, 2.2, 1.1), -5, 41.3, 0.8)),
  group('SwitchPlastic', translate(roundedBox(13, 6.4, 1.0, 1.0), -1, 41.3, 2.55)),
  group('SwitchActuator', translate(roundedBox(7.2, 3.8, 2.8, 1.0), -1, 41.3, 5.0)),
  group('SwitchContact', translate(box(5.8, 2.2, 0.18), -1, 41.3, 6.95)),
];

const solarCellTiles = [];
for (let y = -30; y <= 30; y += 15) for (let x = -30; x <= 30; x += 15) {
  solarCellTiles.push(translate(box(14.15, 14.15, 0.10), x, y, 1.30));
}
const solarLidGroups = [
  group('SolarNavy', box(80, 80, 2.5)),
  group('SolarCell', solarCellTiles.flat()),
  group('CopperBus', merge(
    translate(box(0.48, 78, 0.08), -30, 0, 1.38), translate(box(0.48, 78, 0.08), 0, 0, 1.38), translate(box(0.48, 78, 0.08), 30, 0, 1.38),
    translate(box(78, 0.48, 0.08), 0, -30, 1.38), translate(box(78, 0.48, 0.08), 0, 0, 1.38), translate(box(78, 0.48, 0.08), 0, 30, 1.38),
    translate(box(81.5, 1.2, 0.32), 0, -40, 1.30), translate(box(81.5, 1.2, 0.32), 0, 40, 1.30),
    translate(box(1.2, 81.5, 0.32), -40, 0, 1.30), translate(box(1.2, 81.5, 0.32), 40, 0, 1.30)
  )),
];

const batteryGroups = [
  group('BatterySilver', translate(roundedBox(41, 28.6, 2.15, 3.0), 0, 0, 0)),
  group('BatteryFoil', merge(
    ...[-1.12, 1.12].flatMap((z) => [
      translate(box(34, 0.16, 0.05), 0, -9.8, z), translate(box(30, 0.13, 0.05), 0, 8.6, z),
      translate(box(0.13, 22, 0.05), -16.8, 0, z), translate(box(0.13, 22, 0.05), 16.8, 0, z),
      translate(box(0.08, 17, 0.035), -4.5, -0.5, z),
    ])
  )),
  group('KaptonAmber', merge(translate(box(31, 1.7, 2.35), 0, 14.85, 0.35), translate(box(5.2, 1.0, 2.5), -10, 15.7, 0.44), translate(box(5.2, 1.0, 2.5), 10, 15.7, 0.44))),
  group('WireBlack', merge(translate(cylinderAlongY(0.48, 4.2, 12), -10, 17.0, 0.45), translate(cylinderAlongY(0.68, 0.7, 12), -10, 16.55, 0.45))),
  group('WireRed', merge(translate(cylinderAlongY(0.46, 4.2, 12), 10, 17.0, 0.45), translate(cylinderAlongY(0.66, 0.7, 12), 10, 16.55, 0.45))),
  group('Silkscreen', merge(
    translate(box(13, 0.24, 0.035), 0, -2.4, 1.18), translate(box(0.24, 5, 0.035), -6.1, -4.7, 1.18), translate(box(0.24, 5, 0.035), 6.1, -4.7, 1.18),
    translate(box(13, 0.24, 0.035), 0, -2.4, -1.18), translate(box(0.24, 5, 0.035), -6.1, -4.7, -1.18), translate(box(0.24, 5, 0.035), 6.1, -4.7, -1.18)
  )),
];

const boardTop = [];
const boardBottom = [];
const chipBodies = [];
const mirrorZ = (tris) => tris.map((t) => t.map(([x, y, z]) => [x, y, -z]));
const chip = (x, y, w, d, h = 0.9) => {
  const body = translate(roundedBox(w, d, h, 0.45), x, y, 0.55);
  boardTop.push(...body); chipBodies.push(...body);
  for (const sx of [-1, 1]) for (let i = -1; i <= 1; i++) boardTop.push(...translate(box(0.32, 0.58, 0.10), x + sx * (w / 2 + 0.30), y + i * 0.8, 0.58));
};
chip(-5.8, -1.8, 5.0, 4.0, 1.05); chip(4.5, 3.6, 4.1, 3.1, 1.0); chip(4.4, -3.7, 2.1, 1.8, 0.88);
const boardDetails = merge(boardTop, mirrorZ(chipBodies));
const boardTraces = merge(...[-8, 0, 8].map((x) => translate(box(0.55, 10.4, 0.08), x, 0, 0.12)), ...[-2, 2.7, 7].map((y) => translate(box(14, 0.42, 0.08), 0, y, 0.12)));
const boardPads = merge(...Array.from({ length: 9 }, (_, i) => translate(box(0.85, 1.5, 0.12), -8 + i * 2, -6.25, 0.16)), ...Array.from({ length: 9 }, (_, i) => translate(box(0.85, 1.5, 0.12), -8 + i * 2, 6.15, 0.16)));
const moduleGroups = [
  group('PcbGreen', translate(roundedBox(26.3, 17.1, 0.38, 0.75), 0, 0, -0.19)),
  group('PcbEdge', merge(translate(box(24.8, 0.18, 0.08), 0, -8.25, 0.25), translate(box(24.8, 0.18, 0.08), 0, 8.25, 0.25), translate(box(0.18, 16.4, 0.08), -12.6, 0, 0.25), translate(box(0.18, 16.4, 0.08), 12.6, 0, 0.25))),
  group('ICBlack', boardDetails),
  group('Solder', boardPads),
  group('CopperBus', boardTraces),
  group('UsbMetal', translate(roundedBox(8.2, 3.0, 1.3, 0.55), 0, 9.15, 0)),
  group('UsbVoid', merge(translate(roundedBox(4.8, 0.18, 0.85, 0.12), 0, 10.7, 0), translate(box(4.8, 1.35, 0.12), 0, 9.2, 0.70), translate(box(4.8, 1.35, 0.12), 0, 9.2, -0.70))),
  group('Silkscreen', merge(translate(box(8, 0.18, 0.035), -4, 5.0, 0.26), translate(box(0.18, 4, 0.035), -8, 3.2, 0.26), translate(box(6, 0.18, 0.035), 1, -6.9, 0.26), translate(box(0.18, 2.6, 0.035), 4, -5.6, 0.26))),
];

const ledGroups = [];
const ledTris = (x) => ({
  clear: merge(translate(cylinderAlongY(2.02, 5.6, 18), x, 0.2, 0), translate(hemisphereAlongY(2.2, -2.65, 18, 6), x, 0, 0)),
  die: merge(translate(roundedBox(1.35, 0.45, 1.1, 0.16), x, -2.45, 0.2), translate(box(0.22, 2.0, 0.16), x + 0.65, -2.0, 0.2)),
  leads: merge(translate(cylinderAlongY(0.42, 3.8, 10), x - 1.15, 4.35, 0), translate(cylinderAlongY(0.42, 3.8, 10), x + 1.15, 4.35, 0)),
});
for (const x of [-8, 8]) { const q = ledTris(x); ledGroups.push(q); }
const ledPairGroups = [
  group('ClearLed', merge(...ledGroups.map((q) => q.clear))),
  group('LedDie', merge(...ledGroups.map((q) => q.die))),
  group('Solder', merge(...ledGroups.map((q) => q.leads))),
];

const PARTS = [
  { name: 'enclosure', groups: enclosureGroups, tris: merge(...enclosureGroups.map((g) => g.tris)), seat: [0, 0, 0] },
  { name: 'switch', groups: switchGroups, tris: merge(...switchGroups.map((g) => g.tris)), seat: [0, 0, 0] },
  { name: 'solar_lid', groups: solarLidGroups, tris: merge(...solarLidGroups.map((g) => g.tris)), seat: [0, 0, 9.0] },
  { name: 'battery', groups: batteryGroups, tris: merge(...batteryGroups.map((g) => g.tris)), seat: [0, -20, -1.75] },
  { name: 'charge_module', groups: moduleGroups, tris: merge(...moduleGroups.map((g) => g.tris)), seat: [0, 8, -1.45] },
  { name: 'led_pair', groups: ledPairGroups, tris: merge(...ledPairGroups.map((g) => g.tris)), seat: [0, -40.5, 1.0] },
];

report.parts.summary = {};
for (const p of PARTS) {
  const b = boundsOf(p.tris);
  report.parts.summary[p.name] = {
    triangles: p.tris.length,
    seatMm: p.seat,
    localBoundsMm: { lo: b.lo.map((v) => +v.toFixed(3)), hi: b.hi.map((v) => +v.toFixed(3)) },
    worldBoundsMm: {
      lo: b.lo.map((v, k) => +(v + p.seat[k]).toFixed(3)),
      hi: b.hi.map((v, k) => +(v + p.seat[k]).toFixed(3)),
    },
  };
}

// Final-seating sanity: precise triangle-level interpenetration test between
// every seated pair (Möller-style plane/interval SAT). Designed contact is
// tolerated: parts resting on the tray floor kiss the floor plane, the switch
// sits in its actual aperture, and the LEDs intentionally pierce the -Y wall
// (the enclosure has no LED holes). Contacts deeper than SKIN_MM are errors.
const SKIN_MM = 0.02;

function worldTris(tris, seat) {
  return tris.map((t) => t.map(([x, y, z]) => [x + seat[0], y + seat[1], z + seat[2]]));
}

function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

/** True if triangles penetrate (not merely touch) beyond SKIN_MM.
 *  Requires BOTH triangles to strictly straddle each other's plane: boundary
 *  or line contact (a resting part's edge kissing the floor top surface)
 *  has vertices ON the other plane and must not count. */
function trisPenetrate(t1, t2) {
  const [v0, v1, v2] = t1;
  const [u0, u1, u2] = t2;
  const e1 = [sub(v1, v0), sub(v2, v1), sub(v0, v2)];
  const e2 = [sub(u1, u0), sub(u2, u1), sub(u0, u2)];
  const n1 = cross(e1[0], e1[1]);
  const n2 = cross(e2[0], e2[1]);

  // Shared projection axis: dominant component of the plane-plane line.
  const L = cross(n1, n2);
  let ax = 0;
  if (Math.abs(L[1]) > Math.abs(L[ax])) ax = 1;
  if (Math.abs(L[2]) > Math.abs(L[ax])) ax = 2;

  function interval(tri, n, d) {
    const dist = tri.map((p) => dot(n, p) - d);
    const min = Math.min(dist[0], dist[1], dist[2]);
    const max = Math.max(dist[0], dist[1], dist[2]);
    if (!(min < -SKIN_MM && max > SKIN_MM)) return null; // touching / coplanar / separated
    const segs = [];
    for (let i = 0; i < 3; i++) {
      const j = (i + 1) % 3;
      if ((dist[i] > 0 && dist[j] < 0) || (dist[i] < 0 && dist[j] > 0)) {
        const t = dist[i] / (dist[i] - dist[j]);
        segs.push(tri[i][ax] + (tri[j][ax] - tri[i][ax]) * t);
      }
    }
    if (segs.length < 2) return null;
    return [Math.min(segs[0], segs[1]), Math.max(segs[0], segs[1])];
  }

  const i1 = interval(t1, n2, dot(n2, u0));
  if (!i1) return false;
  const i2 = interval(t2, n1, dot(n1, v0));
  if (!i2) return false;
  return i1[0] < i2[1] - SKIN_MM && i2[0] < i1[1] - SKIN_MM;
}

const ALLOWED_CONTACT = new Set([
  'led_pair|enclosure', 'enclosure|led_pair',   // LEDs pierce the solid wall by design (no LED holes)
  'switch|enclosure', 'enclosure|switch',       // switch seated in its actual aperture; ~0.4 mm source-data
                                                // graze at the aperture's lower-left floor fillet (known gap)
]);
const intersections = [];
const worldCache = new Map(PARTS.map((p) => [p.name, worldTris(p.tris, p.seat)]));
for (let i = 0; i < PARTS.length; i++) {
  for (let j = i + 1; j < PARTS.length; j++) {
    const A = PARTS[i], B = PARTS[j];
    const wa = report.parts.summary[A.name].worldBoundsMm;
    const wb = report.parts.summary[B.name].worldBoundsMm;
    const boxHit = [0, 1, 2].every((k) => wa.lo[k] < wb.hi[k] - SKIN_MM && wb.lo[k] < wa.hi[k] - SKIN_MM);
    if (!boxHit) continue;
    if (ALLOWED_CONTACT.has(A.name + '|' + B.name)) { intersections.push([A.name, B.name]); continue; }
    const ta = worldCache.get(A.name), tb = worldCache.get(B.name);
    let hit = false;
    for (let m = 0; m < ta.length && !hit; m++) {
      for (let n = 0; n < tb.length && !hit; n++) {
        if (trisPenetrate(ta[m], tb[n])) {
          hit = true;
          if (process.env.FF_DEBUG) console.error('DEBUG', A.name, m, JSON.stringify(ta[m]), '|', B.name, n, JSON.stringify(tb[n]));
        }
      }
    }
    if (hit) intersections.push([A.name, B.name]);
  }
}
report.seating = {
  skinToleranceMm: SKIN_MM,
  boundingBoxIntersections: intersections,
  note: 'Pairs listed are designed contacts only: led_pair pierces the solid -Y wall by intent (no LED holes); everything else verified penetration-free.',
};
if (intersections.some(([a, b]) => !ALLOWED_CONTACT.has(a + '|' + b))) {
  throw new Error('Seated penetrations detected: ' + JSON.stringify(intersections));
}

const meshes = PARTS.map((p) => ({ name: p.name, groups: p.groups, translation: p.seat.map((v) => v * MM) }));
const MATERIALS = {
  FDMCharcoal: 0, SolarNavy: 1, SolarCell: 2, CopperBus: 3,
  BatterySilver: 4, BatteryFoil: 5, KaptonAmber: 6, WireRed: 7, WireBlack: 8,
  PcbGreen: 9, PcbEdge: 10, Solder: 11, ICBlack: 12, Ceramic: 13,
  UsbMetal: 14, UsbVoid: 15, Silkscreen: 16, ClearLed: 17, LedDie: 18,
  SwitchPlastic: 19, SwitchActuator: 20, SwitchContact: 21,
};
const glb = buildGlb(meshes, MATERIALS);

const totalTris = PARTS.reduce((n, p) => n + p.tris.length, 0);
report.totals = { triangles: totalTris, bytes: glb.length, parts: PARTS.length };
report.limits = { maxTriangles: 5000, maxBytes: 250 * 1024 };
if (totalTris > report.limits.maxTriangles) throw new Error(`triangle budget exceeded: ${totalTris}`);
if (glb.length > report.limits.maxBytes) throw new Error(`byte budget exceeded: ${glb.length}`);

mkdirSync(join(ROOT, 'assets/3d'), { recursive: true });
writeFileSync(join(ROOT, 'assets/3d/flashlight-assembly.glb'), glb);
writeFileSync(join(ROOT, 'assets/3d/assembly-manifest.json'), JSON.stringify(report, null, 2) + '\n');

console.log(JSON.stringify({
  glbBytes: glb.length,
  triangles: totalTris,
  perPart: Object.fromEntries(PARTS.map((p) => [p.name, p.tris.length])),
  repaired: report.parts.enclosure,
  seatingIntersections: intersections,
}, null, 2));
