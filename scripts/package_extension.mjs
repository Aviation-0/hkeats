// scripts/package_extension.mjs
// Packages the Chrome extension into a clean, POSIX-compliant ZIP (forward-slash paths) for the Chrome Web Store

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT_DIR = process.cwd();
const EXTENSION_DIR = path.join(ROOT_DIR, 'extension');
const OUTPUT_ZIP = path.join(ROOT_DIR, 'eatsafe-hk-extension.zip');

// Standard CRC-32 implementation for PKZIP headers
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildPosixZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const { posixName, data } of entries) {
    if (posixName.includes('\\')) {
      throw new Error(`Invalid backslash in ZIP entry name: ${posixName}`);
    }
    const nameBuf = Buffer.from(posixName, 'utf8');
    const uncompressedSize = data.length;
    const crc = crc32(data);
    const deflated = zlib.deflateRawSync(data, { level: 9 });
    const useDeflate = deflated.length < uncompressedSize;
    const payload = useDeflate ? deflated : data;
    const method = useDeflate ? 8 : 0;

    // Local file header (30 bytes + filename)
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // Local file header signature
    localHeader.writeUInt16LE(20, 4);         // Version needed to extract (2.0)
    localHeader.writeUInt16LE(0x0800, 6);     // General purpose bit flag (UTF-8 filename)
    localHeader.writeUInt16LE(method, 8);     // Compression method (8 = deflate, 0 = store)
    localHeader.writeUInt16LE(0, 10);         // Last mod file time
    localHeader.writeUInt16LE(0x5421, 12);    // Last mod file date
    localHeader.writeUInt32LE(crc, 14);       // CRC-32
    localHeader.writeUInt32LE(payload.length, 18); // Compressed size
    localHeader.writeUInt32LE(uncompressedSize, 22); // Uncompressed size
    localHeader.writeUInt16LE(nameBuf.length, 26); // File name length
    localHeader.writeUInt16LE(0, 28);         // Extra field length

    localParts.push(localHeader, nameBuf, payload);

    // Central directory file header (46 bytes + filename)
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0); // Central file header signature
    centralHeader.writeUInt16LE(0x0314, 4);     // Version made by (UNIX / 2.0)
    centralHeader.writeUInt16LE(20, 6);         // Version needed to extract
    centralHeader.writeUInt16LE(0x0800, 8);     // UTF-8 flag
    centralHeader.writeUInt16LE(method, 10);    // Compression method
    centralHeader.writeUInt16LE(0, 12);         // File time
    centralHeader.writeUInt16LE(0x5421, 14);    // File date
    centralHeader.writeUInt32LE(crc, 16);       // CRC-32
    centralHeader.writeUInt32LE(payload.length, 20); // Compressed size
    centralHeader.writeUInt32LE(uncompressedSize, 24); // Uncompressed size
    centralHeader.writeUInt16LE(nameBuf.length, 28); // File name length
    centralHeader.writeUInt16LE(0, 30);         // Extra field length
    centralHeader.writeUInt16LE(0, 32);         // File comment length
    centralHeader.writeUInt16LE(0, 34);         // Disk number start
    centralHeader.writeUInt16LE(0, 36);         // Internal file attributes
    centralHeader.writeUInt32LE(((0o100644 << 16) >>> 0), 38); // External file attributes (-rw-r--r--)
    centralHeader.writeUInt32LE(offset, 42);    // Relative offset of local header

    centralParts.push(centralHeader, nameBuf);
    offset += localHeader.length + nameBuf.length + payload.length;
  }

  const centralDirBuf = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);            // End of central dir signature
  eocd.writeUInt16LE(0, 4);                     // Number of this disk
  eocd.writeUInt16LE(0, 6);                     // Disk where central directory starts
  eocd.writeUInt16LE(entries.length, 8);        // Total entries on this disk
  eocd.writeUInt16LE(entries.length, 10);       // Total entries in central directory
  eocd.writeUInt32LE(centralDirBuf.length, 12); // Size of central directory
  eocd.writeUInt32LE(offset, 16);               // Offset of start of central directory
  eocd.writeUInt16LE(0, 20);                    // Comment length

  return Buffer.concat([...localParts, centralDirBuf, eocd]);
}

function listZipCentralDirectoryEntries(zipBuf) {
  const names = [];
  // Find End of Central Directory (0x06054b50)
  let eocdPos = -1;
  for (let i = zipBuf.length - 22; i >= 0; i--) {
    if (zipBuf.readUInt32LE(i) === 0x06054b50) {
      eocdPos = i;
      break;
    }
  }
  if (eocdPos === -1) throw new Error('EOCD not found in ZIP');
  const count = zipBuf.readUInt16LE(eocdPos + 10);
  let pos = zipBuf.readUInt32LE(eocdPos + 16);

  for (let i = 0; i < count; i++) {
    if (zipBuf.readUInt32LE(pos) !== 0x02014b50) {
      throw new Error(`Invalid central directory header at ${pos}`);
    }
    const nameLen = zipBuf.readUInt16LE(pos + 28);
    const extraLen = zipBuf.readUInt16LE(pos + 30);
    const commentLen = zipBuf.readUInt16LE(pos + 32);
    const name = zipBuf.subarray(pos + 46, pos + 46 + nameLen).toString('utf8');
    names.push(name);
    pos += 46 + nameLen + extraLen + commentLen;
  }
  return names;
}

console.log('📦 [EatSafe HK] Verifying extension assets before packaging...');

// 1. Verify manifest
const manifestPath = path.join(EXTENSION_DIR, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error('❌ Missing manifest.json in extension directory!');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (manifest.description.length > 132) {
  console.error(`❌ manifest.json description exceeds 132 characters (${manifest.description.length})!`);
  process.exit(1);
}
console.log(`✅ Manifest V3 validated: ${manifest.name} v${manifest.version} (description: ${manifest.description.length}/132 chars)`);

// 2. Verify mandatory files (always using POSIX forward slashes)
const requiredFiles = [
  'manifest.json',
  'content.js',
  'content.css',
  'popup.html',
  'popup.js',
  'popup.css',
  'service-worker.js',
  'icons/icon-16.png',
  'icons/icon-32.png',
  'icons/icon-48.png',
  'icons/icon-128.png',
];

const entries = [];
for (const posixName of requiredFiles) {
  const fullPath = path.join(EXTENSION_DIR, ...posixName.split('/'));
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Missing required file: ${posixName}`);
    process.exit(1);
  }
  entries.push({
    posixName,
    data: fs.readFileSync(fullPath),
  });
}
console.log('✅ All 11 required extension files and icons are present.');

// 3. Build POSIX-compliant ZIP archive
console.log('🗜️ Building production ZIP archive with POSIX forward-slash paths...');
const zipBuffer = buildPosixZip(entries);
fs.writeFileSync(OUTPUT_ZIP, zipBuffer);

// 4. Verify ZIP Central Directory entries have zero backslashes
const zipEntryNames = listZipCentralDirectoryEntries(fs.readFileSync(OUTPUT_ZIP));
for (const entryName of zipEntryNames) {
  if (entryName.includes('\\')) {
    console.error(`❌ ZIP entry contains Windows backslash separator: ${entryName}`);
    process.exit(1);
  }
}
console.log(`✅ Verified ${zipEntryNames.length} ZIP entries (POSIX paths):`, zipEntryNames.join(', '));
console.log(`🎉 [EatSafe HK] Successfully created ${OUTPUT_ZIP} (${(zipBuffer.length / 1024).toFixed(1)} KB)`);
