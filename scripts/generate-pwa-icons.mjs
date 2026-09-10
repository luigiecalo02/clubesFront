import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const header = Buffer.from(type)
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([header, data])))
  return Buffer.concat([length, header, data, crc])
}

function png(size, paint) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1)
    raw[row] = 0
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a = 255] = paint(x, y, size)
      const i = row + 1 + x * 4
      raw[i] = r
      raw[i + 1] = g
      raw[i + 2] = b
      raw[i + 3] = a
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function iconPaint(x, y, size) {
  const nx = x / (size - 1)
  const ny = y / (size - 1)
  const dx = nx - 0.5
  const dy = ny - 0.5
  const dist = Math.hypot(dx, dy)

  if (dist > 0.48) return [7, 20, 39, 255]
  if (dist > 0.44) return [240, 193, 75, 255]

  const inTriangle =
    ny > 0.22 &&
    ny < 0.78 &&
    Math.abs(dx) < (ny - 0.2) * 0.72

  if (inTriangle) {
    const border =
      ny < 0.28 ||
      ny > 0.74 ||
      Math.abs(dx) > (ny - 0.2) * 0.72 - 0.035
    if (border) return [200, 16, 46, 255]
    if (Math.abs(dx) < 0.035 && ny > 0.3 && ny < 0.72) return [29, 78, 216, 255]
    return [255, 248, 231, 255]
  }

  return [7, 20, 39, 255]
}

for (const size of [64, 180, 192, 512]) {
  const name =
    size === 180 ? 'apple-touch-icon.png' : `pwa-${size}x${size}.png`
  writeFileSync(join(outDir, name), png(size, iconPaint))
}

writeFileSync(join(outDir, 'pwa-512x512-maskable.png'), png(512, iconPaint))
console.log('Iconos PWA generados en public/')
