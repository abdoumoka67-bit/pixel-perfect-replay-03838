import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Menu, MessageCircle, X, Home } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { whatsappLink } from "@/lib/commerce";
import type { PublicStore } from "@/lib/storefront.functions";
import { initPixels } from "@/lib/pixels";

export function StoreChrome({ store, children }: { store: PublicStore; children: ReactNode }) {
  const [bar, setBar] = useState(true);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    initPixels(store);
  }, [store]);
  return (
    <div className="min-h-screen bg-card">
      {bar && (
        <div className="relative bg-primary px-10 py-2.5 text-center text-sm text-primary-foreground">
          مرحبا بك في متجرنا
          <button onClick={() => setBar(false)} className="absolute end-3 top-1/2 -translate-y-1/2 p-1 opacity-80" aria-label="إغلاق">
            <X className="size-4" />
          </button>
        </div>
      )}
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-4 py-3.5">
          <div className="flex items-center gap-1">
            {store.whatsapp && (
              <a
                href={whatsappLink(store.whatsapp, `السلام عليكم، عندي سؤال عن منتجات ${store.name}`)}
                target="_blank"
                rel="noreferrer"
                className="rounded-full p-2 hover:bg-secondary"
                aria-label="واتساب"
              >
                <MessageCircle className="size-[22px]" strokeWidth={1.6} />
              </a>
            )}
          </div>
          <Link to="/m/$store" params={{ store: store.slug }} className="flex items-center gap-2">
            {store.logo && <img src={store.logo} alt="" className="size-8 rounded-full object-cover" />}
            <span className="text-xl font-normal">{store.name}</span>
          </Link>
          <div className="flex justify-end">
            <button onClick={() => setOpen(true)} className="rounded-full p-2 hover:bg-secondary" aria-label="القائمة">
              <Menu className="size-6" strokeWidth={1.6} />
            </button>
          </div>
        </div>
      </header>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[80vw] max-w-sm bg-background">
          <SheetTitle className="text-start font-normal">{store.name}</SheetTitle>
          <nav className="mt-6 space-y-1">
            <Link
              to="/m/$store"
              params={{ store: store.slug }}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3.5 shadow-card"
            >
              <Home className="size-5" strokeWidth={1.6} /> كل المنتجات
            </Link>
            {store.whatsapp && (
              <a
                href={whatsappLink(store.whatsapp, `السلام عليكم، عندي سؤال عن منتجات ${store.name}`)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-foreground/80"
              >
                <MessageCircle className="size-5" strokeWidth={1.6} /> تواصل معنا عبر واتساب
              </a>
            )}
          </nav>
        </SheetContent>
      </Sheet>

      {children}

      <footer className="border-t bg-background py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} {store.name} - جميع الحقوق محفوظة
      </footer>
    </div>
  );
}

const FAQ = [
  {
    q: "شحال ثمن التوصيل لولايتي؟",
    a: "التوصيل يختلف حسب الولاية (للبيت أو للمكتب). سعر التوصيل يبان لك مباشرة كي تختار ولايتك في نموذج الطلب.",
  },
  {
    q: "كيفاش نخلّص؟",
    a: "الدفع عند الاستلام، تخلّص نقداً كي يوصلك الطرد.",
  },
  {
    q: "وقتاش يوصلني الطلب؟",
    a: "بعد ما نتصلو بيك ونأكدو الطلب، نبعثوه مع شركة التوصيل. المدة تختلف حسب الولاية.",
  },
  {
    q: "كيفاش نتأكد بلي الطلب تسجل؟",
    a: "تظهر لك صفحة تأكيد فيها رقم الطلب، ومن بعد نتصلو بيك في الهاتف باش نأكدو معاك.",
  },
];

export function StoreFaq() {
  return (
    <section className="mx-auto max-w-3xl px-5 py-12">
      <h2 className="mb-4 text-2xl font-bold sm:text-3xl">أسئلة شائعة</h2>
      <Accordion type="single" collapsible defaultValue="0">
        {FAQ.map((f, i) => (
          <AccordionItem key={f.q} value={String(i)}>
            <AccordionTrigger className="py-5 text-start text-lg font-normal hover:no-underline">{f.q}</AccordionTrigger>
            <AccordionContent className="text-base leading-8 text-muted-foreground">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
