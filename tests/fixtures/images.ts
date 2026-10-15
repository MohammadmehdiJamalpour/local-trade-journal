import { deflateSync, crc32 } from "node:zlib";
import { createHash } from "node:crypto";
/** Deterministic true-color PNGs: 132 × 128 random RGB ≈ 50 KiB each. */
export function syntheticImage(index: number) {
  const width = 132,
    height = 128,
    pixels = Buffer.alloc((width * 3 + 1) * height);
  let random = index + 4421;
  for (let row = 0; row < height; row++)
    for (let column = 1; column <= width * 3; column++) {
      random ^= random << 13;
      random ^= random >>> 17;
      random ^= random << 5;
      pixels[row * (width * 3 + 1) + column] = random & 255;
    }
  const chunk = (type: string, data: Buffer) => {
    const name = Buffer.from(type),
      length = Buffer.alloc(4),
      checksum = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
    return Buffer.concat([length, name, data, checksum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  const bytes = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(pixels)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return {
    id: "img-stress-" + index,
    name: "synthetic-" + index + ".png",
    width,
    height,
    size: bytes.length,
    type: "image/png",
    hash: createHash("sha256").update(bytes).digest("hex"),
    base64: bytes.toString("base64"),
  };
}
