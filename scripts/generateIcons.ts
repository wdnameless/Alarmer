import { createCanvas } from 'canvas';
import fs from 'node:fs';
import path from 'node:path';

function generateIcon(size: number) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Center & Radius
  const center = size / 2;
  const radius = size * 0.42;

  // Clear
  ctx.clearRect(0, 0, size, size);

  // Background circle
  ctx.fillStyle = '#121418';
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.fill();

  // Outer Neon Ring
  ctx.lineWidth = size * 0.08;
  ctx.strokeStyle = '#00e676';
  ctx.shadowColor = '#00e676';
  ctx.shadowBlur = size * 0.12;
  ctx.beginPath();
  ctx.arc(center, center, radius - ctx.lineWidth / 2, -Math.PI / 2, Math.PI * 0.9);
  ctx.stroke();

  // Reset shadow
  ctx.shadowBlur = 0;

  // Inner dot / pulse
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(center, center, size * 0.1, 0, Math.PI * 2);
  ctx.fill();

  // Neon pointer knob
  const knobAngle = Math.PI * 0.9;
  const knobX = center + (radius - ctx.lineWidth / 2) * Math.cos(knobAngle);
  const knobY = center + (radius - ctx.lineWidth / 2) * Math.sin(knobAngle);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(knobX, knobY, ctx.lineWidth * 0.7, 0, Math.PI * 2);
  ctx.fill();

  return canvas.toBuffer('image/png');
}

const iconsDir = path.resolve('src-tauri/icons');
const sizes = [32, 128, 256, 512];

for (const s of sizes) {
  const buf = generateIcon(s);
  if (s === 32) {
    fs.writeFileSync(path.join(iconsDir, '32x32.png'), buf);
  } else if (s === 128) {
    fs.writeFileSync(path.join(iconsDir, '128x128.png'), buf);
    fs.writeFileSync(path.join(iconsDir, '128x128@2x.png'), generateIcon(256));
  }
  if (s === 512) {
    fs.writeFileSync(path.join(iconsDir, 'icon.png'), buf);
  }
}
console.log('Icons generated successfully!');
