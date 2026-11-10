import fs from 'fs';
import zlib from 'zlib';

function createPNG(width, height, drawFn) {
  const stride = width * 4;
  const rawData = Buffer.alloc((stride + 1) * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (stride + 1);
    rawData[rowOffset] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawFn(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (-(crc & 1) & 0xedb88320);
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type);
    const crcBuf = Buffer.alloc(4);
    const combined = Buffer.concat([typeBuf, data]);
    crcBuf.writeUInt32BE(crc32(combined), 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// PollPe Exact: Royal Purple #7848f4 badge with white P emblem and gold coin accent on #f7f8fc
function drawIcon(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Background: Clean Lilac-White #f7f8fc
  let r = 247, g = 248, b = 252, a = 255;

  const mainRadius = w * 0.38;

  // PollPe Purple Badge (#8e52f5 to #602ce8)
  if (dist <= mainRadius) {
    const t = (dx + dy + mainRadius) / (2 * mainRadius);
    r = Math.round(142 * (1 - t) + 96 * t);
    g = Math.round(82 * (1 - t) + 44 * t);
    b = Math.round(245 * (1 - t) + 232 * t);

    // Stylized white P emblem
    const nx = dx / w;
    const ny = dy / w;

    // Stem: x around -0.10, y between -0.15 and 0.16
    if (nx >= -0.13 && nx <= -0.06 && ny >= -0.16 && ny <= 0.16) {
      r = 255; g = 255; b = 255;
    }
    // Loop of P
    const loopDx = nx - 0.02;
    const loopDy = ny - (-0.03);
    const loopDist = Math.sqrt(loopDx * loopDx + loopDy * loopDy);
    if (loopDist >= 0.08 && loopDist <= 0.14 && nx >= -0.08) {
      r = 255; g = 255; b = 255;
    }
    if (loopDist < 0.05) {
      // center hole retains purple
    }
  }

  // Golden Coin Badge on bottom-right corner
  const coinDx = x - w * 0.74;
  const coinDy = y - h * 0.74;
  const coinDist = Math.sqrt(coinDx * coinDx + coinDy * coinDy);
  const coinRadius = w * 0.16;

  if (coinDist <= coinRadius + 3) {
    // White outline
    r = 255; g = 255; b = 255;
  }
  if (coinDist <= coinRadius) {
    // Gold gradient (#ffe44d to #df9a00)
    const ct = (coinDx + coinDy + coinRadius) / (2 * coinRadius);
    r = Math.round(255 * (1 - ct) + 223 * ct);
    g = Math.round(228 * (1 - ct) + 154 * ct);
    b = Math.round(77 * (1 - ct) + 0 * ct);
  }

  return [r, g, b, a];
}

fs.writeFileSync('public/pwa-192x192.png', createPNG(192, 192, drawIcon));
fs.writeFileSync('public/pwa-512x512.png', createPNG(512, 512, drawIcon));
fs.writeFileSync('public/pwa-maskable-512x512.png', createPNG(512, 512, drawIcon));
fs.writeFileSync('public/apple-touch-icon.png', createPNG(180, 180, drawIcon));
fs.writeFileSync('public/favicon.ico', createPNG(48, 48, drawIcon));

console.log('Regenerated icons matching PollPe exact purple and gold badge!');
