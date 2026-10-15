import { describe, expect, it } from "vitest";
import {
  decryptBackup,
  encryptBackup,
  validateFileSize,
  CSV_LIMIT,
  JSON_LIMIT,
} from "../../src/portability/crypto";
import { toPortableAsset, toStoredAsset } from "../../src/portability/assets";

describe("encrypted backups", () => {
  it("round trips Unicode with random nonces", async () => {
    const text = JSON.stringify({ note: "ژورنال من", images: ["test"] }),
      password = "correct horse battery";
    const first = await encryptBackup(text, password),
      second = await encryptBackup(text, password);
    expect(first).not.toBe(second);
    expect(await decryptBackup(JSON.parse(first), password)).toBe(text);
  });
  it("rejects short passwords, wrong passwords, tampering, and unknown parameters", async () => {
    await expect(encryptBackup("{}", "short")).rejects.toThrow();
    const encrypted = JSON.parse(
      await encryptBackup("{}", "correct horse battery"),
    );
    await expect(
      decryptBackup(encrypted, "incorrect password"),
    ).rejects.toThrow();
    await expect(
      decryptBackup({ ...encrypted, iterations: 1 }, "correct horse battery"),
    ).rejects.toThrow();
    await expect(
      decryptBackup({ ...encrypted, salt: "AAAA" }, "correct horse battery"),
    ).rejects.toThrow();
    const changed = {
      ...encrypted,
      ciphertext:
        (encrypted.ciphertext[0] === "A" ? "B" : "A") +
        encrypted.ciphertext.slice(1),
    };
    await expect(
      decryptBackup(changed, "correct horse battery"),
    ).rejects.toThrow();
  });
  it("enforces import sizes", () => {
    expect(() => validateFileSize(JSON_LIMIT, "json")).not.toThrow();
    expect(() => validateFileSize(CSV_LIMIT, "csv")).not.toThrow();
    for (const size of [-1, Infinity, 0.5, JSON_LIMIT + 1])
      expect(() => validateFileSize(size, "json")).toThrow();
    expect(() => validateFileSize(CSV_LIMIT + 1, "csv")).toThrow();
  });
  it("round trips binary image bytes and verifies declared metadata", async () => {
    const raw = {
      id: "img-test",
      name: "a.png",
      type: "image/png",
      size: 3,
      width: 1,
      height: 1,
      dataUrl: "data:image/png;base64,AQID",
    };
    const stored = await toStoredAsset(raw);
    expect(stored.blob).toBeInstanceOf(Blob);
    expect(stored.hash).toHaveLength(64);
    expect(await toPortableAsset(stored)).toEqual(raw);
    expect(stored).not.toHaveProperty("dataUrl");
    await expect(
      toPortableAsset({ ...stored, hash: "corrupted" }),
    ).rejects.toThrow("آسیب");
    await expect(toPortableAsset({ ...stored, size: 4 })).rejects.toThrow();
    await expect(toStoredAsset({ ...raw, size: 4 })).rejects.toThrow();
    await expect(
      toStoredAsset({ ...raw, type: "image/jpeg" }),
    ).rejects.toThrow();
  });
});
