import { createFileRoute, Link } from "@tanstack/react-router";
import { Banknote, Box, FileSpreadsheet, MapPin, Phone, Truck } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { getPublicPlans } from "@/lib/storefront.functions";
import { PlanCards } from "@/components/PlanCards";

export const Route = createFileRoute("/")({
  loader: () => getPublicPlans(),
  head: () => ({
    meta: [
      { title: "oranix — صفحة طلب لمنتجك وطلباتك مرتبة في مكان واحد" },
      {
        name: "description",
        content:
          "للتجار في الجزائر: أنشئ متجرك، أضف منتجك، وانشر الرابط. طلبات الدفع عند الاستلام من 58 ولاية تصلك مباشرة في لوحتك. 7 أيام مجاناً.",
      },
      { property: "og:title", content: "oranix — صفحة طلب لمنتجك وطلباتك مرتبة في مكان واحد" },
      {
        property: "og:description",
        content: "أنشئ متجرك، أضف منتجك، وانشر الرابط. الطلبات تصلك مباشرة في لوحتك.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const FEATURES = [
  { icon: Box, title: "صفحة لكل منتج", text: "أضف الاسم والسعر والصور، وتحصل على رابط جاهز للنشر في إنستغرام وتيك توك." },
  { icon: MapPin, title: "58 ولاية", text: "فورم طلب بالولاية والبلدية، ومصاريف توصيل تحددها أنت لكل ولاية." },
  { icon: Phone, title: "أرقام صحيحة", text: "نقبل فقط أرقام 05 و06 و07، لتقلّ الطلبات الوهمية." },
  { icon: Banknote, title: "سجل التأكيد", text: "سجّل كل محاولة اتصال بالزبون وتابع عدد المحاولات لكل طلب." },
  { icon: Truck, title: "Yalidine", text: "أرسل الطلب المؤكد بنقرة واحدة واحصل على رقم التتبع." },
  { icon: FileSpreadsheet, title: "تصدير Excel", text: "صدّر الطلبات لطباعة البوالص بسهولة." },
];

function Home() {
  const plans = Route.useLoaderData();
  return (
    <div className="min-h-screen bg-card">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5">
        <Logo />
        <Button asChild variant="outline">
          <Link to="/auth">تسجيل الدخول</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-3xl px-5 pb-16 pt-12 text-center sm:pt-20">
        <span className="inline-flex rounded-full border border-brand/40 bg-brand-soft px-4 py-1.5 text-sm font-medium text-brand">
          الدفع عند الاستلام · كل الولايات
        </span>
        <h1 className="mt-7 text-[1.7rem] font-medium leading-[1.5] sm:text-5xl sm:leading-[1.35]">
          صفحة طلب لمنتجك، وطلباتك
          <br />
          مرتبة في مكان واحد.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
          للتجار في الجزائر، أنشئ متجرك، أضف منتجك، وانشر الرابط. الطلبات تصلك مباشرة في لوحتك.
        </p>
        <div className="mx-auto mt-9 flex max-w-md flex-col gap-3">
          <Button asChild size="xl" className="w-full">
            <Link to="/auth" search={{ mode: "signup" }}>ابدأ التجربة المجانية</Link>
          </Button>
          <p className="rounded-full bg-secondary px-4 py-3 text-muted-foreground">7 أيام مجاناً، بدون بطاقة دفع</p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-16">
        <ul className="divide-y">
          {FEATURES.map((f) => (
            <li key={f.title} className="py-8">
              <span className="flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand">
                <f.icon className="size-6" />
              </span>
              <h2 className="mt-5 text-2xl font-medium">{f.title}</h2>
              <p className="mt-2 text-lg leading-8 text-muted-foreground">{f.text}</p>
            </li>
          ))}
        </ul>
      </section>

      {plans.length > 0 && (
        <section className="border-t bg-background">
          <div className="mx-auto max-w-3xl px-5 py-16">
            <h2 className="text-center text-3xl font-medium">الأسعار</h2>
            <p className="mt-2 text-center text-muted-foreground">ابدأ بـ 7 أيام مجاناً، ثم اختر المدة المناسبة لك.</p>
            <div className="mt-8">
              <PlanCards
                plans={plans}
                action={(p) => (
                  <Button asChild size="xl" variant={p.tier === "pro" ? "outline" : "default"} className={p.tier === "pro" ? "w-full border-transparent text-foreground" : "w-full"}>
                    <Link to="/auth" search={{ mode: "signup" }}>ابدأ التجربة المجانية</Link>
                  </Button>
                )}
              />
            </div>
          </div>
        </section>
      )}

      <footer className="border-t">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-8 text-sm text-muted-foreground">
          <Logo />
          <p>© {new Date().getFullYear()} oranix</p>
        </div>
      </footer>
    </div>
  );
}
