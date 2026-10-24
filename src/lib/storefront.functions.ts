import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { resolveImageUrls } from "./images";

function publicClient() {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

export type PublicStore = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  whatsapp: string | null;
  default_home_price: number;
  default_desk_price: number;
  accepting_orders: boolean;
};

export type PublicProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compare_at_price: number | null;
  images: string[];
  features: string[];
  sizes: string[];
  colors: string[];
};

async function loadStore(client: ReturnType<typeof publicClient>, slug: string) {
  const { data, error } = await client.rpc("get_public_store", { _slug: slug });
  if (error) {
    console.error("get_public_store failed", error);
    return null;
  }
  return data?.[0] ?? null;
}

export const getStorefront = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1).max(60) }).parse(d))
  .handler(async ({ data }) => {
    const client = publicClient();
    const s = await loadStore(client, data.slug);
    if (!s) return { store: null, products: [] as PublicProduct[] };
    const { data: products } = await client
      .from("products")
      .select("id,name,slug,description,price,compare_at_price,images,features,sizes,colors")
      .eq("store_id", s.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    const urls = await resolveImageUrls(client, [s.logo_url, ...(products ?? []).map((p) => p.images[0])]);
    const store: PublicStore = {
      id: s.id,
      name: s.name,
      slug: s.slug,
      logo: s.logo_url ? (urls[s.logo_url] ?? null) : null,
      whatsapp: s.whatsapp,
      default_home_price: s.default_home_price,
      default_desk_price: s.default_desk_price,
      accepting_orders: s.accepting_orders,
    };
    return {
      store,
      products: (products ?? []).map((p) => ({
        ...p,
        images: p.images[0] && urls[p.images[0]] ? [urls[p.images[0]]] : [],
      })) as PublicProduct[],
    };
  });

export const getProductPage = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ slug: z.string().min(1).max(60), product: z.string().min(1).max(90) }).parse(d),
  )
  .handler(async ({ data }) => {
    const client = publicClient();
    const s = await loadStore(client, data.slug);
    if (!s) return null;
    const { data: p } = await client
      .from("products")
      .select("id,name,slug,description,price,compare_at_price,images,features,sizes,colors")
      .eq("store_id", s.id)
      .eq("slug", data.product.toLowerCase())
      .eq("is_active", true)
      .maybeSingle();
    if (!p) return null;
    const { data: rates } = await client
      .from("delivery_rates")
      .select("wilaya_code,home_price,desk_price")
      .eq("store_id", s.id);
    const urls = await resolveImageUrls(client, [s.logo_url, ...p.images]);
    const store: PublicStore = {
      id: s.id,
      name: s.name,
      slug: s.slug,
      logo: s.logo_url ? (urls[s.logo_url] ?? null) : null,
      whatsapp: s.whatsapp,
      default_home_price: s.default_home_price,
      default_desk_price: s.default_desk_price,
      accepting_orders: s.accepting_orders,
    };
    const product: PublicProduct = { ...p, images: p.images.map((i) => urls[i]).filter((x): x is string => !!x) };
    return { store, product, rates: rates ?? [] };
  });

export const getPublicPlans = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicClient().from("plans").select("id,name,months,price").order("sort");
  if (error) {
    console.error("plans load failed", error);
    return [];
  }
  return data ?? [];
});
