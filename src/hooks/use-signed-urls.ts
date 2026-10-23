import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_BUCKET, resolveImageUrls } from "@/lib/images";

/** Viewable links for files stored in a private bucket. */
export function useSignedUrls(paths: (string | null | undefined)[], bucket = PRODUCT_BUCKET) {
  const clean = Array.from(new Set(paths.filter(Boolean) as string[])).sort();
  const { data } = useQuery({
    queryKey: ["signed-urls", bucket, clean],
    queryFn: () => resolveImageUrls(supabase, clean, bucket, 60 * 60),
    enabled: clean.length > 0,
    staleTime: 1000 * 60 * 50,
  });
  return data ?? {};
}
