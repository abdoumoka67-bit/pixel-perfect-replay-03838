import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Package, Truck, Banknote } from "lucide-react";
import { getStorefront } from "@/lib/storefront.functions";
import { LogoMark } from "@/components/brand/Logo";
import { formatDZD } from "@/lib/commerce";

export const Route = createFileRoute("/m/$store/")({
  loader: async ({ params }) => {
    const data = await getStorefront({ data: { slug: params.store } });
    if (!data.store) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    if (!loaderData?.store) return { meta: [{ title: "المتجر غير موجود" }, { name: "robots", content: "noindex" }] };
    const title = `${loaderData.store.name} — تسوق والدفع عند الاستلام`;
    const description = `تصفح منتجات ${loaderData.store.name} واطلب مع الدفع عند الاستلام والتوصيل إلى 58 ولاية.`;
    const image = loaderData.products[0]?.images[0];
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(image ? [{ property: "og:image", content: image }, { name: "twitter:image", content: image }] : []),
      ],
    };
  },
  notFoundComponent: () => (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 px-6 text-center">
      <h1 className="text-2xl font-bold">المتجر غير موجود</h1>
      <p className="text-muted-foreground">تأكد من الرابط وحاول مجدداً.</p>
    </div>
  ),
  component: Storefront,
});

function Storefront() {
  const { store, products } = Route.useLoaderData();
  if (!store) return null;
  return (
    <div className="min-h-screen">
      <header className="bg-sidebar text-sidebar-foreground">
        <div className="mx-auto max-w-6xl px-4 py-10 text-center">
          {store.logo ? (
            <img src={store.logo} alt={store.name} className="mx-auto size-16 rounded-2xl object-cover" />
          ) : (
            <LogoMark className="mx-auto size-14" />
          )}
          <h1 className="mt-4 text-3xl font-bold">{store.name}</h1>
          <div className="mt-3 flex justify-center gap-4 text-sm text-sidebar-muted">
            <span className="inline-flex items-center gap-1.5"><Banknote className="size-4 text-sidebar-primary" /> الدفع عند الاستلام</span>
            <span className="inline-flex items-center gap-1.5"><Truck className="size-4 text-sidebar-primary" /> 58 ولاية</span>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        {!store.accepting_orders && (
          <p className="mb-6 rounded-2xl bg-warning-soft p-4 text-center text-sm text-warning">المتجر متوقف مؤقتاً عن استقبال الطلبات.</p>
        )}
        {products.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            <Package className="mx-auto mb-3 size-10" /> لا توجد منتجات حالياً.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <Link
                key={p.id}
                to="/m/$store/p/$product"
                params={{ store: store.slug, product: p.slug }}
                className="group overflow-hidden rounded-2xl bg-card shadow-card transition-shadow hover:shadow-float"
              >
                <div className="aspect-square overflow-hidden bg-muted">
                  {p.images[0] ? (
                    <img src={p.images[0]} alt={p.name} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                  ) : (
                    <div className="flex size-full items-center justify-center text-muted-foreground"><Package /></div>
                  )}
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-semibold">{p.name}</p>
                  <p className="mt-1 font-display font-bold text-brand num">{formatDZD(p.price)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <footer className="py-8 text-center text-xs text-muted-foreground">
        <Link to="/" className="hover:text-brand">مدعوم بواسطة oranix</Link>
      </footer>
    </div>
  );
}
