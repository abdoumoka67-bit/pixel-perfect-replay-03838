import type { SupabaseClient } from "@supabase/supabase-js";

export const PRODUCT_BUCKET = "product-images";
export const RECEIPT_BUCKET = "receipts";

/** Turn stored file paths into viewable links (absolute URLs pass through). */
export async function resolveImageUrls(
  client: SupabaseClient,
  paths: (string | null | undefined)[],
  bucket = PRODUCT_BUCKET,
  expiresIn = 60 * 60 * 24 * 7,
): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  const toSign: string[] = [];
  for (const p of paths) {
    if (!p) continue;
    if (/^https?:\/\//.test(p)) map[p] = p;
    else if (!toSign.includes(p)) toSign.push(p);
  }
  if (toSign.length) {
    const { data } = await client.storage.from(bucket).createSignedUrls(toSign, expiresIn);
    for (const item of data ?? []) {
      if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
    }
  }
  return map;
}

export function fileExt(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;
  return file.type.split("/")[1] ?? "jpg";
}
