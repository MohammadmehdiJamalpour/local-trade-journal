import { z } from "zod";

export const JSON_LIMIT = 256 * 1024 * 1024;
export const CSV_LIMIT = 64 * 1024 * 1024;
export const RECORD_LIMIT = 100000;
const HEADER = {
  format: "edge-journal-encrypted",
  version: 1,
  cipher: "AES-256-GCM",
  kdf: "PBKDF2-SHA-256",
  iterations: 600000,
} as const;
const envelopeSchema = z
  .object({
    format: z.literal(HEADER.format),
    version: z.literal(1),
    cipher: z.literal(HEADER.cipher),
    kdf: z.literal(HEADER.kdf),
    iterations: z.literal(600000),
    salt: z.string().max(24),
    iv: z.string().max(16),
    ciphertext: z.string().max(JSON_LIMIT * 2),
  })
  .strict();
function bytesToBase64(bytes: Uint8Array): string {
  let result = "";
  for (let i = 0; i < bytes.length; i += 32768)
    result += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return btoa(result);
}
function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length % 4)
    throw new Error("دادهٔ رمزگذاری‌شده نامعتبر است.");
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}
const aad = () => new TextEncoder().encode(JSON.stringify(HEADER));
async function derive(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  usage: KeyUsage[],
) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: HEADER.iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    usage,
  );
}
export async function encryptBackup(
  text: string,
  password: string,
): Promise<string> {
  if (password.length < 12)
    throw new Error("رمز پشتیبان باید دست‌کم ۱۲ نویسه داشته باشد.");
  const data = new TextEncoder().encode(text);
  // Include base64 expansion and the authenticated envelope in the same file limit used on import.
  if (Math.ceil((data.length + 16) / 3) * 4 + 512 > JSON_LIMIT)
    throw new Error("حجم پشتیبان رمزدار بیش از ۲۵۶ مگابایت است.");
  const salt = crypto.getRandomValues(new Uint8Array(16)),
    iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await derive(password, salt, ["encrypt"]);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: aad(), tagLength: 128 },
    key,
    data,
  );
  return JSON.stringify({
    ...HEADER,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  });
}
export async function decryptBackup(
  raw: unknown,
  password: string,
): Promise<string> {
  const envelope = envelopeSchema.parse(raw),
    salt = fromBase64(envelope.salt),
    iv = fromBase64(envelope.iv),
    ciphertext = fromBase64(envelope.ciphertext);
  if (
    salt.length !== 16 ||
    iv.length !== 12 ||
    ciphertext.length < 16 ||
    ciphertext.length > JSON_LIMIT + 16
  )
    throw new Error("اندازهٔ دادهٔ رمزگذاری‌شده نامعتبر است.");
  try {
    const key = await derive(password, salt, ["decrypt"]);
    const result = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv, additionalData: aad(), tagLength: 128 },
      key,
      ciphertext,
    );
    return new TextDecoder("utf-8", { fatal: true }).decode(result);
  } catch {
    throw new Error(
      "رمز اشتباه است یا پشتیبان آسیب دیده است؛ ژورنال تغییر نکرد.",
    );
  }
}
export function validateFileSize(size: number, type: "json" | "csv") {
  if (
    !Number.isSafeInteger(size) ||
    size < 0 ||
    size > (type === "json" ? JSON_LIMIT : CSV_LIMIT)
  )
    throw new Error(
      type === "json"
        ? "حداکثر حجم JSON برابر ۲۵۶ مگابایت است."
        : "حداکثر حجم CSV برابر ۶۴ مگابایت است.",
    );
}
