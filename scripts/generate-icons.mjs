#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "..", "public", "icons");

const baseSvg = (size, bg, fg, padding) => {
  const radius = Math.round(size * 0.22);
  const stroke = Math.max(6, Math.round(size * 0.06));
  const pad = padding;
  const inner = size - pad * 2;
  // RSD symbol — currency stack: stylized "F" + bar
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="${bg}"/>
  <g transform="translate(${pad}, ${pad})">
    <circle cx="${inner / 2}" cy="${inner / 2}" r="${inner / 2 - stroke / 2}" fill="none" stroke="${fg}" stroke-width="${stroke}"/>
    <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle"
          font-family="-apple-system, system-ui, Arial, sans-serif"
          font-size="${Math.round(inner * 0.5)}" font-weight="800"
          fill="${fg}">₣</text>
  </g>
</svg>`;
};

async function render(size, padding, filename) {
  const svg = baseSvg(size, "#09090b", "#22c55e", padding);
  const out = resolve(outDir, filename);
  await sharp(Buffer.from(svg)).png().toFile(out);
  console.log(`wrote ${out}`);
}

await mkdir(outDir, { recursive: true });
await Promise.all([
  render(192, 18, "icon-192.png"),
  render(512, 48, "icon-512.png"),
  // maskable needs a larger safe zone (inner ~80%)
  render(512, 96, "icon-maskable-512.png"),
  render(180, 18, "apple-touch-icon.png"),
  render(32, 4, "favicon-32.png"),
]);
