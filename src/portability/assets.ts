import type { ImageAsset, ImageReference } from "../domain/types";
import { hashBytes } from "../persistence/repository";

export interface PortableAsset extends ImageReference {
  dataUrl: string;
}
export async function toStoredAsset(asset: PortableAsset): Promise<ImageAsset> {
  const match =
    /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/.exec(
      asset.dataUrl,
    );
  if (
    !match ||
    match[1] !== asset.type ||
    match[2].length % 4 ||
    asset.size > 2 * 1024 * 1024
  )
    throw new Error("قالب یا اندازهٔ تصویر نامعتبر است.");
  const bytes = Uint8Array.from(atob(match[2]), (char) => char.charCodeAt(0));
  if (bytes.length !== asset.size)
    throw new Error("اندازهٔ تصویر ناسازگار است.");
  const blob = new Blob([bytes], { type: asset.type });
  return {
    id: asset.id,
    name: asset.name,
    type: asset.type,
    size: asset.size,
    width: asset.width,
    height: asset.height,
    blob,
    hash: await hashBytes(blob),
  };
}
export async function toPortableAsset(
  asset: ImageAsset,
): Promise<PortableAsset> {
  if (
    asset.size !== asset.blob.size ||
    asset.hash !== (await hashBytes(asset.blob))
  )
    throw new Error("تصویر ذخیره‌شده آسیب دیده است؛ پشتیبان کامل ساخته نشد.");
  const bytes = new Uint8Array(await asset.blob.arrayBuffer());
  let body = "";
  for (let i = 0; i < bytes.length; i += 32768)
    body += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return {
    id: asset.id,
    name: asset.name,
    type: asset.type,
    size: asset.size,
    width: asset.width,
    height: asset.height,
    dataUrl: "data:" + asset.type + ";base64," + btoa(body),
  };
}
