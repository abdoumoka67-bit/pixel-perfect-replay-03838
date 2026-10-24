import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Banknote,
  BarChart3,
  Check,
  FileSpreadsheet,
  MapPin,
  PhoneCall,
  Rocket,
  Truck,
  Zap,
} from "lucide-react";
import heroImg from "@/assets/hero-oranix.jpg";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { getPublicPlans } from "@/lib/storefront.functions";
import { formatDZD } from "@/lib/commerce";

export const Route = createFileRoute("/")({
  loader: () => getPublicPlans(),
  head: () => ({
    meta: [
      { title: "oranix — متجرك الإلكتروني للدفع عند الاستلام في الجزائر" },
      {
        name: "description",
        content:
          "أنشئ متجرك وصفحات هبوط سريعة لإعلانات تيك توك وإنستغرام، استقبل طلبات الدفع عند الاستلام من 58 ولاية، وأرسلها إلى Yalidine. 7 أيام مجاناً.",
      },
      { property: "og:title", content: "oranix — متجرك للدفع عند الاستلام في الجزائر" },
      {
        property: "og:description",
        content: "صفحات هبوط سريعة، تأكيد هاتفي منظم، أسعار توصيل لـ 58 ولاية وربط مع Yalidine.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const FEATURES = [
  { icon: Zap, title: "صفحة هبوط لكل منتج", text: "صفحات خفيفة وسريعة التحميل مصممة للتحويل من إعلانات تيك توك وإنستغرام." },
  { icon: Banknote, title: "نموذج COD جزائري", text: "تحقق من رقم الهاتف، 58 ولاية و1541 بلدية، وحساب التوصيل فورياً." },
  { icon: PhoneCall, title: "سجل التأكيد الهاتفي", text: "سجّل كل محاولة اتصال وتابع عدد المحاولات حتى لا يضيع أي زبون." },
  { icon: Truck, title: "ربط Yalidine", text: "أرسل الطلب المؤكد بنقرة واحدة واحصل على رقم التتبع تلقائياً." },
  { icon: MapPin, title: "أسعار توصيل لكل ولاية", text: "سعر للمنزل وسعر للمكتب في كل ولاية، أو سعر افتراضي بنقرة." },
  { icon: FileSpreadsheet, title: "تصدير Excel", text: "صدّر الطلبات المحددة أو كلها لطباعة البوالص بسهولة." },
];

function Home() {
  const plans = Route.useLoaderData();
  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Logo />
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link to="/auth">تسجيل الدخول</Link>
            </Button>
            <Button asChild variant="default">
              <Link to="/auth" search={{ mode: "signup" }}>ابدأ مجاناً</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative bg-hero">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 lg:grid-cols-[1.05fr_1fr] lg:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 text-xs font-semibold text-brand shadow-card">
              <span className="size-1.5 rounded-full bg-brand" /> مصمم للسوق الجزائري
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.25] sm:text-5xl lg:text-[3.4rem]">
              بِع أكثر على إنستغرام وتيك توك
              <br />
              <span className="text-brand">بالدفع عند الاستلام.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-8 text-muted-foreground">
              متجر، صفحات هبوط سريعة، تأكيد هاتفي، وتوصيل لـ 58 ولاية — كل ما يحتاجه التاجر الجزائري في لوحة واحدة.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="brand" size="xl">
                <Link to="/auth" search={{ mode: "signup" }}>
                  أنشئ متجرك الآن <ArrowLeft />
                </Link>
              </Button>
              <Button asChild variant="outline" size="xl">
                <Link to="/auth">لدي حساب</Link>
              </Button>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {["7 أيام مجاناً", "بدون بطاقة دفع", "الدفع بـ CCP أو BaridiMob"].map((t) => (
                <li key={t} className="inline-flex items-center gap-1.5">
                  <Check className="size-4 text-success" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 -z-10 rotate-2 rounded-[2.5rem] bg-gradient-brand opacity-15" />
            <img
              src={heroImg}
              alt="هاتف يعرض تأكيد طلب على oranix بجانب طرد جاهز للتوصيل"
              width={1280}
              height={1024}
              className="w-full rounded-[2rem] object-cover shadow-float"
            />
            <div className="absolute -bottom-5 start-4 flex items-center gap-3 rounded-2xl bg-card p-3 pe-5 shadow-float sm:start-[-1.5rem]">
              <span className="flex size-10 items-center justify-center rounded-xl bg-success-soft text-success">
                <Check className="size-5" />
              </span>
              <div>
                <p className="text-xs text-muted-foreground">طلب جديد · وهران</p>
                <p className="font-display font-bold num">{formatDZD(4900)}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold sm:text-4xl">كل ما تحتاجه لبيع منتجاتك</h2>
          <p className="mt-3 text-muted-foreground">من أول إعلان إلى استلام الزبون للطرد.</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-3xl bg-card p-6 shadow-card">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                <f.icon className="size-5" />
              </span>
              <h3 className="mt-4 text-lg font-bold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-sidebar text-sidebar-foreground">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 lg:grid-cols-3">
          {[
            { icon: Rocket, n: "1", t: "أنشئ متجرك", d: "اختر اسم ورابط متجرك في أقل من دقيقة." },
            { icon: Zap, n: "2", t: "أضف منتجاتك", d: "صورة، سعر، مميزات — وصفحة الهبوط جاهزة للإعلان." },
            { icon: BarChart3, n: "3", t: "أكّد وأرسل", d: "اتصل بالزبون، سجّل المحاولة، وأرسل الطرد إلى Yalidine." },
          ].map((s) => (
            <div key={s.n}>
              <span className="font-display text-5xl font-bold text-sidebar-primary/80">{s.n}</span>
              <h3 className="mt-3 text-xl font-bold">{s.t}</h3>
              <p className="mt-2 text-sidebar-muted">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {plans.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-20">
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">أسعار بسيطة بالدينار</h2>
            <p className="mt-3 text-muted-foreground">ابدأ بـ 7 أيام مجاناً بكل الميزات، ثم اختر المدة المناسبة لك.</p>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {plans.map((p) => (
              <div
                key={p.id}
                className={
                  p.months === 12
                    ? "relative rounded-3xl bg-sidebar p-6 text-sidebar-foreground shadow-float"
                    : "rounded-3xl bg-card p-6 shadow-card"
                }
              >
                {p.months === 12 && (
                  <span className="absolute -top-3 start-6 rounded-full bg-gradient-brand px-3 py-0.5 text-xs font-semibold text-brand-foreground">
                    الأوفر
                  </span>
                )}
                <p className="font-semibold">{p.name}</p>
                <p className="mt-3 font-display text-3xl font-bold num">{formatDZD(p.price)}</p>
                <p className={p.months === 12 ? "text-sm text-sidebar-muted num" : "text-sm text-muted-foreground num"}>
                  {formatDZD(Math.round(p.price / p.months))} / شهر
                </p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button asChild variant="brand" size="xl">
              <Link to="/auth" search={{ mode: "signup" }}>
                جرّب مجاناً لمدة 7 أيام <ArrowLeft />
              </Link>
            </Button>
          </div>
        </section>
      )}

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-muted-foreground">
          <Logo />
          <p>© {new Date().getFullYear()} oranix — صُنع للتجار الجزائريين</p>
        </div>
      </footer>
    </div>
  );
}
