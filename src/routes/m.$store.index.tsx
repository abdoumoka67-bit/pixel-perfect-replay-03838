import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Package } from "lucide-react";
import { getStorefront } from "@/lib/storefront.functions";
import { StoreChrome, StoreFaq } from "@/components/store/StoreChrome";
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
      <h1 className="text-2xl font-medium">المتجر غير موجود</h1>
      <p className="text-muted-foreground">تأكد من الرابط وحاول مجدداً.</p>
    </div>
  ),
  component: Storefront,
});

function Storefront() {
  const { store, products } = Route.useLoaderData();
  if (!store) return null;
  return (
    <StoreChrome store={store}>
      <section className="bg-dark-hero px-6 py-20 text-center text-primary-foreground sm:py-28">
        <h1 className="text-[2rem] font-normal leading-tight sm:text-5xl">مرحباً بك في متجرنا</h1>
        <p className="mx-auto mt-5 max-w-md text-lg font-light leading-9 opacity-90 sm:text-xl">
          اكتشف أفضل المنتجات بأسعار رائعة مع خدمة التوصيل لجميع ولايات الجزائر
        </p>
        <a
          href="#products"
          className="mt-9 inline-flex h-14 items-center rounded-xl bg-primary px-12 text-lg font-normal text-primary-foreground shadow-float transition-opacity hover:opacity-90"
        >
          تسوق الآن
        </a>
      </section>

      <main id="products" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14">
        {!store.accepting_orders && (
          <p className="mb-6 rounded-2xl bg-warning-soft p-4 text-center text-sm text-warning">المتجر متوقف مؤقتاً عن استقبال الطلبات.</p>
        )}
        <h2 className="mb-6 px-1 text-2xl font-bold sm:text-3xl">منتجاتنا</h2>
        {products.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Package className="mx-auto mb-3 size-10" strokeWidth={1.4} /> لا توجد منتجات حالياً.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <Link
                key={p.id}
                to="/m/$store/p/$product"
                params={{ store: store.slug, product: p.slug }}
                className="group overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-float"
              >
                <div className="aspect-square overflow-hidden bg-muted">
                  {p.images[0] ? (
                    <img src={p.images[0]} alt={p.name} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                  ) : (
                    <div className="flex size-full items-center justify-center text-muted-foreground"><Package /></div>
                  )}
                </div>
                <div className="p-3">
                  <p className="truncate text-[15px]">{p.name}</p>
                  <p className="mt-1 font-medium num">{formatDZD(p.price)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <div className="border-t">
        <StoreFaq />
      </div>
    </StoreChrome>
  );
}
