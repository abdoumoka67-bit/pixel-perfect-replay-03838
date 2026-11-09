import { translate } from "@/lib/i18n";
import { useUiLanguage } from "@/lib/ui-i18n";

const DELIVERY_LOGOS = [
  "/logos/delivery-01.png",
  "/logos/delivery-02.png",
  "/logos/delivery-03.png",
  "/logos/delivery-06.png",
  "/logos/delivery-07.png",
  "/logos/delivery-08.png",
];

export function DeliveryLogosMarquee() {
  const language = useUiLanguage();

  return (
    <section className="mx-auto w-full max-w-3xl pb-16">
      <div className="mb-8 px-5 text-center">
        <span className="inline-flex rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground">
          {translate(language, "landing.delivery.badge")}
        </span>
        <h2 className="mt-4 text-balance text-2xl font-medium sm:text-3xl">
          {translate(language, "landing.delivery.title")}
        </h2>
      </div>
      {DELIVERY_LOGOS.length > 0 && (
        <div
          className="delivery-logos-mask relative left-1/2 w-screen -translate-x-1/2 overflow-hidden"
          dir="ltr"
        >
          <div className="delivery-logos-track flex w-max py-1" dir="ltr">
            {[0, 1].map((setIndex) => (
              <div
                key={setIndex}
                className="delivery-logos-set flex shrink-0 gap-4"
                aria-hidden="true"
                dir="ltr"
              >
                {DELIVERY_LOGOS.map((src, index) => (
                  <div
                    key={`${src}-${index}`}
                    className="flex h-[88px] w-[120px] shrink-0 items-center justify-center rounded-2xl border border-border bg-card p-4"
                  >
                    <img src={src} alt="" className="h-12 w-full object-contain" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
