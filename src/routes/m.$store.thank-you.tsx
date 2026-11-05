import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { CheckCircle2, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDZD } from "@/lib/commerce";
import { useDocumentLanguage } from "@/components/LanguageSwitcher";
import { tr } from "@/lib/ui-i18n";

export const Route = createFileRoute("/m/$store/thank-you")({
  validateSearch: z.object({
    n: z.number().optional(),
    t: z.number().optional(),
    p: z.string().optional(),
    l: z.enum(["ar", "fr", "en"]).optional(),
  }),
  head: ({ match }) => {
    const language = match.search.l ?? "en";
    const title = tr(language, "تم تسجيل طلبك بنجاح");
    const description = tr(language, "شكراً لك! سنتصل بك قريباً لتأكيد طلبك.");
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: ThankYou,
});

function ThankYou() {
  const { n, t, p, l } = Route.useSearch();
  const { store } = Route.useParams();
  const language = l ?? "en";
  useDocumentLanguage(language);
  const s = (text: string, vars?: Record<string, string | number>) => tr(language, text, vars);

  return (
    <div className="flex min-h-screen items-center justify-center bg-hero px-5 py-10">
      <div className="w-full max-w-md rounded-3xl bg-card p-8 text-center shadow-float">
        <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-success-soft text-success">
          <CheckCircle2 className="size-11" />
        </div>
        <h1 className="mt-5 text-2xl font-medium">{s("شكراً لك! تم تسجيل طلبك")}</h1>
        <p className="mt-2 text-muted-foreground">{s("سنتصل بك هاتفياً خلال ساعات لتأكيد الطلب. يرجى إبقاء هاتفك قريباً منك.")}</p>
        {(n || t) && (
          <div className="mt-6 space-y-2 rounded-2xl bg-muted/70 p-4 text-sm">
            {n ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{s("رقم الطلب")}</span>
                <span className="font-medium num">ORX-{n}</span>
              </div>
            ) : null}
            {p && (
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">{s("المنتج")}</span>
                <span className="truncate font-medium">{p}</span>
              </div>
            )}
            {t ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{s("المبلغ عند الاستلام")}</span>
                <span className="font-medium text-brand num">{formatDZD(t)}</span>
              </div>
            ) : null}
          </div>
        )}
        <p className="mt-5 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <PhoneCall className="size-4 text-brand" /> {s("الدفع نقداً عند استلام الطرد")}
        </p>
        <Button asChild variant="outline" className="mt-6 w-full">
          <Link to="/m/$store" params={{ store }}>
            {s("تصفح منتجات أخرى")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
