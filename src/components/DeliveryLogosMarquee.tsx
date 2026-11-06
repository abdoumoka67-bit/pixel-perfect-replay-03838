import { useMemo } from "react";

// Automatically import all image files in public/logos/
const logoModules = import.meta.glob<string>(
  "/public/logos/*.{png,jpg,jpeg,svg,webp,PNG,JPG,JPEG,SVG,WEBP}",
  { eager: true, query: "?url", import: "default" }
);

// Sort alphabetically by filename without hardcoding any company names
const LOGOS: string[] = Object.entries(logoModules)
  .sort(([pathA], [pathB]) => {
    const fileA = pathA.split("/").pop() ?? pathA;
    const fileB = pathB.split("/").pop() ?? pathB;
    return fileA.localeCompare(fileB);
  })
  .map(([, url]) => url);

export function DeliveryLogosMarquee() {
  const hasLogos = LOGOS.length > 0;
  // Duplicate the list twice for a seamless infinite loop from translateX(0) to translateX(-50%)
  const marqueeItems = useMemo(() => (hasLogos ? [...LOGOS, ...LOGOS] : []), [hasLogos]);

  return (
    <section className="mx-auto w-full max-w-full overflow-hidden px-4 pb-16 text-center sm:pb-20">
      {/* Header */}
      <div className="mx-auto mb-8 max-w-3xl px-5 text-center">
        <span className="inline-flex rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground shadow-xs">
          شركات التوصيل
        </span>
        <h2 className="mt-4 text-balance text-2xl font-medium sm:text-3xl text-foreground">
          نتكامل مع شركات التوصيل الموثوقة في الجزائر
        </h2>
      </div>

      {/* Marquee Track Container */}
      {!hasLogos ? (
        <div className="mx-auto max-w-md rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          ستُضاف شعارات شركات التوصيل تلقائياً بمجرد وضعها في المجلد public/logos/
        </div>
      ) : (
        <div
          dir="ltr"
          className="relative mx-auto w-full max-w-5xl overflow-hidden py-2 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)] [-webkit-mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]"
        >
          <div className="flex w-max items-center gap-4 animate-delivery-marquee hover:[animation-play-state:paused] active:[animation-play-state:paused] motion-reduce:animate-none">
            {marqueeItems.map((logoUrl, index) => (
              <div
                key={`${logoUrl}-${index}`}
                className="flex h-[72px] w-[120px] shrink-0 items-center justify-center rounded-[14px] border border-border bg-white p-2.5 shadow-xs"
              >
                <img
                  src={logoUrl}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  className="h-11 w-full max-h-11 max-w-[90px] object-contain select-none pointer-events-none"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

