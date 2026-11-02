import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { getPublicPlans } from "@/lib/storefront.functions";
import { PlanCards } from "@/components/PlanCards";
import { cn } from "@/lib/utils";

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
  { title: "صفحة لكل منتج", text: "أضف الاسم والسعر والصور، وتحصل على رابط جاهز للنشر في إنستغرام وتيك توك." },
  { title: "58 ولاية", text: "فورم طلب بالولاية والبلدية، ومصاريف توصيل تحددها أنت لكل ولاية." },
  { title: "أرقام صحيحة", text: "نقبل فقط أرقام 05 و06 و07، لتقلّ الطلبات الوهمية." },
  { title: "سجل التأكيد", text: "سجّل كل محاولة اتصال بالزبون وتابع عدد المحاولات لكل طلب." },
  { title: "Yalidine", text: "أرسل الطلب المؤكد بنقرة واحدة واحصل على رقم التتبع." },
  { title: "تصدير Excel", text: "صدّر الطلبات لطباعة البوالص بسهولة." },
];

function FeaturesAccordion() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <ul className="space-y-3">
      {FEATURES.map((f, i) => {
        const isOpen = open === i;
        const id = `feature-${i}`;
        return (
          <li
            key={f.title}
            className={cn(
              "rounded-3xl border transition-colors duration-300",
              isOpen ? "border-border bg-card shadow-card" : "border-transparent bg-secondary",
            )}
          >
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={id}
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center gap-4 px-5 py-5 text-start sm:px-6"
            >
              <span className="w-7 shrink-0 text-sm text-muted-foreground num">{String(i + 1).padStart(2, "0")}</span>
              <span className="flex-1 text-lg font-medium sm:text-xl">{f.title}</span>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <ChevronDown className={cn("size-4 transition-transform duration-300", isOpen && "rotate-180")} />
              </span>
            </button>
            <div
              id={id}
              className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-out",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-6 ps-16 text-base leading-8 text-muted-foreground sm:px-6 sm:ps-[4.25rem]">{f.text}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

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
        <h1 className="mt-7 text-balance text-[1.75rem] font-medium leading-[1.45] sm:text-5xl sm:leading-[1.3]">
          <span className="text-muted-foreground">صفحة طلب لمنتجك،</span>{" "}
          <span className="text-foreground">وطلباتك مرتبة في مكان واحد.</span>
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
        <div className="mb-8 text-center">
          <span className="inline-flex rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground">المميزات</span>
          <h2 className="mt-4 text-balance text-2xl font-medium sm:text-3xl">
            <span className="text-muted-foreground">كل ما تحتاجه</span> لبيع منتجك بالدفع عند الاستلام
          </h2>
        </div>
        <FeaturesAccordion />
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
