import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function createIconPng(size) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.writeUInt8(8, 8); // 8 bit
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type);
    const body = Buffer.concat([typeBuf, data]);
    const crc = Buffer.alloc(4);
    let c = 0xffffffff;
    const table = [];
    for (let n = 0; n < 256; n++) {
      let v = n;
      for (let k = 0; k < 8; k++) {
        v = (v & 1) ? (0xedb88320 ^ (v >>> 1)) : (v >>> 1);
      }
      table[n] = v;
    }
    for (let i = 0; i < body.length; i++) {
      c = table[(c ^ body[i]) & 0xff] ^ (c >>> 8);
    }
    crc.writeInt32BE(~c, 0);
    return Buffer.concat([len, body, crc]);
  }

  const ihdrChunk = makeChunk('IHDR', ihdr);

  const rowLen = 1 + size * 4;
  const rawData = Buffer.alloc(rowLen * size);

  const center = (size - 1) / 2;
  const radius = size * 0.44;

  for (let y = 0; y < size; y++) {
    const offset = y * rowLen;
    rawData[offset] = 0;
    for (let x = 0; x < size; x++) {
      const p = offset + 1 + x * 4;

      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius) {
        // Base FEHD Green #006837
        let r = 0;
        let g = 104;
        let b = 55;
        let a = 255;

        // Draw an inner white shield/check pattern
        const inCheck = (
          (Math.abs(dx + dy * 0.5) < size * 0.12 && dy > -size * 0.25 && dy < size * 0.25) ||
          (Math.abs(dx * 0.7 - dy * 0.7) < size * 0.1 && dx > -size * 0.3 && dx < size * 0.3 && dy > -size * 0.1)
        );

        if (inCheck) {
          r = 255;
          g = 255;
          b = 255;
        } else if (dist > radius - 1.5) {
          // Subtle golden border #ffcc00
          r = 255;
          g = 204;
          b = 0;
        }

        rawData[p] = r;
        rawData[p + 1] = g;
        rawData[p + 2] = b;
        rawData[p + 3] = a;
      } else {
        // Transparent
        rawData[p] = 0;
        rawData[p + 1] = 0;
        rawData[p + 2] = 0;
        rawData[p + 3] = 0;
      }
    }
  }

  const idatChunk = makeChunk('IDAT', zlib.deflateSync(rawData));
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const outDir = path.resolve('extension/icons');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

[16, 32, 48, 128].forEach((size) => {
  const buf = createIconPng(size);
  const dest = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(dest, buf);
  console.log(`✅ Generated ${dest} (${size}x${size}, ${buf.length} bytes)`);
});
