import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { CheckCircle2, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDZD } from "@/lib/commerce";

export const Route = createFileRoute("/m/$store/thank-you")({
  validateSearch: z.object({
    n: z.number().optional(),
    t: z.number().optional(),
    p: z.string().optional(),
  }),
  head: () => ({
    meta: [
      { title: "تم تسجيل طلبك بنجاح" },
      { name: "description", content: "شكراً لك! سنتصل بك قريباً لتأكيد طلبك." },
      { property: "og:title", content: "تم تسجيل طلبك بنجاح" },
      { property: "og:description", content: "شكراً لك! سنتصل بك قريباً لتأكيد طلبك." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ThankYou,
});

function ThankYou() {
  const { n, t, p } = Route.useSearch();
  const { store } = Route.useParams();
  return (
    <div className="flex min-h-screen items-center justify-center bg-hero px-5 py-10">
      <div className="w-full max-w-md rounded-3xl bg-card p-8 text-center shadow-float">
        <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-success-soft text-success">
          <CheckCircle2 className="size-11" />
        </div>
        <h1 className="mt-5 text-2xl font-medium">شكراً لك! تم تسجيل طلبك</h1>
        <p className="mt-2 text-muted-foreground">سنتصل بك هاتفياً خلال ساعات لتأكيد الطلب. يرجى إبقاء هاتفك قريباً منك.</p>
        {(n || t) && (
          <div className="mt-6 space-y-2 rounded-2xl bg-muted/70 p-4 text-sm">
            {n ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">رقم الطلب</span>
                <span className="font-medium num">ORX-{n}</span>
              </div>
            ) : null}
            {p && (
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">المنتج</span>
                <span className="truncate font-medium">{p}</span>
              </div>
            )}
            {t ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">المبلغ عند الاستلام</span>
                <span className="font-medium text-brand num">{formatDZD(t)}</span>
              </div>
            ) : null}
          </div>
        )}
        <p className="mt-5 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <PhoneCall className="size-4 text-brand" /> الدفع نقداً عند استلام الطرد
        </p>
        <Button asChild variant="outline" className="mt-6 w-full">
          <Link to="/m/$store" params={{ store }}>
            تصفح منتجات أخرى
          </Link>
        </Button>
      </div>
    </div>
  );
}
