<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Merchant data is isolated by RLS via `owns_store()`; writes on products/orders/rates/call logs also require `store_is_active()` so expired accounts become read-only at the database level, not just in the UI.
- Public COD orders go only through the `place_order` SQL function (validates phone, recomputes prices, blocks inactive stores); never grant direct INSERT on `orders`.
- Subscription dates (`trial_ends_at`, `paid_until`) are not client-updatable; they change only through the trigger on store creation and the admin `approve_receipt` function.
- Storage buckets are private (workspace blocks public buckets); files are stored as paths and shown through signed URLs (`src/lib/images.ts`), generated server-side for public pages.
- Public storefront reads run in server functions with a publishable-key client (`src/lib/storefront.functions.ts`); dashboard reads use the browser Supabase client under RLS.
- Pure business rules (phone format, shipping price, trial/read-only state) live in `src/lib/commerce.ts` with tests; keep SQL and these helpers in sync.
- Wilaya/commune reference data is static in `src/data/` (communes JSON is lazy-loaded on landing pages).
- `vite.config.ts` pre-bundles deps from all route/component files (`optimizeDeps.entries`) so lazily loaded pages never trigger mid-session re-optimization, which breaks Safari with "Importing a module script failed".
- Dashboard store context comes from SQL `my_store_access` (owner or Pro team member); per-role page access lives in `AREA_ACCESS` (`src/lib/commerce.ts`) and is enforced by the dashboard layout guard plus RLS, so UI and database never disagree.
- Pro-only pages render `ProLock` instead of data; the matching SQL functions/policies also reject Start stores, so the lock is never the only protection.
- Storefront ad pixels load only from `src/lib/pixels.ts` (IDs re-validated before injection); pages call `trackPixel` for commerce events instead of touching `fbq`/`ttq` directly.
