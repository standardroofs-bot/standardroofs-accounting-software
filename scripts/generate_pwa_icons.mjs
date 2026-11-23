import fs from "fs";
import path from "path";
import zlib from "zlib";

const ICONS_DIR = path.resolve("public/icons");
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

// 1. Generate Crisp Modern SVG App Icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e3a8a" />
      <stop offset="50%" stop-color="#2563eb" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
    <linearGradient id="roofGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
    <filter id="dropShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-opacity="0.35" />
    </filter>
  </defs>

  <!-- App Rounded Background -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)" />

  <!-- Inner Subtle Glow Ring -->
  <rect x="16" y="16" width="480" height="480" rx="96" fill="none" stroke="#ffffff" stroke-opacity="0.15" stroke-width="4" />

  <!-- Roof Peak Graphic (Standard Roofs Architecture) -->
  <g filter="url(#dropShadow)" transform="translate(0, 10)">
    <!-- Main Triangular Truss / Roof Silhouette -->
    <path d="M256 120 L400 240 L360 240 L256 155 L152 240 L112 240 Z" fill="url(#roofGrad)" />
    <path d="M256 180 L360 268 L330 268 L256 205 L182 268 L152 268 Z" fill="#ffffff" fill-opacity="0.9" />

    <!-- Building Pillar Bars -->
    <rect x="175" y="275" width="28" height="95" rx="6" fill="#ffffff" fill-opacity="0.95" />
    <rect x="242" y="275" width="28" height="95" rx="6" fill="#ffffff" fill-opacity="0.95" />
    <rect x="309" y="275" width="28" height="95" rx="6" fill="#ffffff" fill-opacity="0.95" />

    <!-- Foundation Platform -->
    <rect x="140" y="375" width="232" height="20" rx="6" fill="url(#roofGrad)" />
  </g>

  <!-- SR Monogram Badge -->
  <text x="256" y="445" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="34" font-weight="900" fill="#ffffff" letter-spacing="4" text-anchor="middle">
    STANDARD ROOFS
  </text>
  <text x="256" y="475" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="20" font-weight="700" fill="#93c5fd" letter-spacing="3" text-anchor="middle">
    HR &amp; WORKFORCE
  </text>
</svg>`;

fs.writeFileSync(path.join(ICONS_DIR, "icon.svg"), svgContent);
console.log("✓ Generated public/icons/icon.svg");

// 2. Pure Node.js Standard PNG Generator
function createPngBuffer(width, height, r, g, b) {
  // Compute CRC32 table
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[n] = c;
  }
  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, "ascii");
    const combined = Buffer.concat([typeBuf, data]);
    const crcVal = crc32(combined);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crcVal, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 2; // RGB truecolor
  ihdr[10] = 0; // Deflate
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Non-interlaced
  const ihdrChunk = makeChunk("IHDR", ihdr);

  // Scanlines (RGBA or RGB) with filter byte 0
  const scanlineLength = 1 + width * 3;
  const rawData = Buffer.alloc(height * scanlineLength);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 3;

      // Draw rounded blue gradient with golden roof accent
      const dx = x - width / 2;
      const dy = y - height / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Check if in golden roof triangle
      const normY = y / height;
      const normX = x / width;
      const isRoof = normY > 0.25 && normY < 0.5 && Math.abs(normX - 0.5) < (normY - 0.25);
      const isPillars = normY >= 0.5 && normY < 0.75 && (Math.abs(normX - 0.35) < 0.05 || Math.abs(normX - 0.5) < 0.05 || Math.abs(normX - 0.65) < 0.05);

      if (isRoof) {
        rawData[pixelOffset] = 251;     // R (Gold)
        rawData[pixelOffset + 1] = 191; // G
        rawData[pixelOffset + 2] = 36;  // B
      } else if (isPillars) {
        rawData[pixelOffset] = 255;     // R (White)
        rawData[pixelOffset + 1] = 255; // G
        rawData[pixelOffset + 2] = 255; // B
      } else {
        // Deep blue gradient background
        const grad = Math.min(1, y / height);
        rawData[pixelOffset] = Math.round(30 + grad * 10);      // R
        rawData[pixelOffset + 1] = Math.round(58 + grad * 40);  // G
        rawData[pixelOffset + 2] = Math.round(138 + grad * 80); // B
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk("IDAT", compressedData);
  const iendChunk = makeChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Generate standard PWA icons
const icon192 = createPngBuffer(192, 192, 37, 99, 235);
fs.writeFileSync(path.join(ICONS_DIR, "icon-192x192.png"), icon192);
console.log("✓ Generated public/icons/icon-192x192.png (192x192)");

const icon512 = createPngBuffer(512, 512, 37, 99, 235);
fs.writeFileSync(path.join(ICONS_DIR, "icon-512x512.png"), icon512);
console.log("✓ Generated public/icons/icon-512x512.png (512x512)");

const appleTouchIcon = createPngBuffer(180, 180, 37, 99, 235);
fs.writeFileSync(path.join(ICONS_DIR, "apple-touch-icon.png"), appleTouchIcon);
console.log("✓ Generated public/icons/apple-touch-icon.png (180x180)");
