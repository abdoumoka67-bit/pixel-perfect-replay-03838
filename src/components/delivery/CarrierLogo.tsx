import { useState } from "react";
import { cn } from "@/lib/utils";
import andersonLogo from "@/assets/carriers/anderson.png";
import dhdLogo from "@/assets/carriers/dhd.png";
import ecomDeliveryLogo from "@/assets/carriers/ecom-delivery-v2.svg";
import economiquaLogo from "@/assets/carriers/economiqua.png";
import ecotrackLogo from "@/assets/carriers/ecotrack.png";
import elogistiaLogo from "@/assets/carriers/elogistia.svg";
import goupexLogo from "@/assets/carriers/goupex.png";
import hr48Logo from "@/assets/carriers/hr48.png";
import maystroLogo from "@/assets/carriers/maystro.svg";
import navexLogo from "@/assets/carriers/navex.png";
import noestLogo from "@/assets/carriers/noest.png";
import osenLogo from "@/assets/carriers/osen.png";
import privateLogo from "@/assets/carriers/private.svg";
import tslLogo from "@/assets/carriers/tsl.png";
import wecanLogo from "@/assets/carriers/wecan.svg";
import yalidineLogo from "@/assets/carriers/yalidine.png";
import zimouLogo from "@/assets/carriers/zimou.png";
import zrExpressLogo from "@/assets/carriers/zr-express.png";

/**
 * Official brand marks for the 19 supported Algerian delivery companies.
 *
 * Every file under `src/assets/carriers/` was taken from the carrier's own
 * website / portal (or its approved digital identity) and is bundled locally,
 * so the dashboard never depends on a third-party image host at runtime.
 * If a file cannot be rendered, the tile falls back to the company initials.
 */

type CarrierBrand = {
  name: string;
  initials: string;
  logo: string;
};

const BRANDS: Record<string, CarrierBrand> = {
  yalidine: { name: "Yalidine Express", initials: "YA", logo: yalidineLogo },
  "zr-express": { name: "ZR Express", initials: "ZR", logo: zrExpressLogo },
  maystro: { name: "Maystro Delivery", initials: "MA", logo: maystroLogo },
  tsl: { name: "TSL Express", initials: "TS", logo: tslLogo },
  dhd: { name: "DHD Express", initials: "DH", logo: dhdLogo },
  ecotrack: { name: "Ecotrack", initials: "EC", logo: ecotrackLogo },
  elogistia: { name: "Elogistia", initials: "EL", logo: elogistiaLogo },
  anderson: { name: "Anderson Delivery", initials: "AN", logo: andersonLogo },
  economiqua: { name: "Economiqua", initials: "EC", logo: economiquaLogo },
  navex: { name: "Navex Delivery", initials: "NA", logo: navexLogo },
  noest: { name: "NOEST", initials: "NO", logo: noestLogo },
  goupex: { name: "Goupex", initials: "GO", logo: goupexLogo },
  hr48: { name: "48HR Express", initials: "48", logo: hr48Logo },
  "hr48-2": { name: "48HR 2 Express", initials: "48", logo: hr48Logo },
  "ecom-delivery-v2": {
    name: "Ecom Delivery V2",
    initials: "EC",
    logo: ecomDeliveryLogo,
  },
  wecan: { name: "WeCan Services", initials: "WE", logo: wecanLogo },
  zimou: { name: "Zimou Express", initials: "ZI", logo: zimouLogo },
  osen: { name: "Osen Express", initials: "OS", logo: osenLogo },
  private: { name: "Private courier", initials: "PR", logo: privateLogo },
};

export function CarrierLogo({ id, className }: { id: string; className?: string }) {
  const brand = BRANDS[id];
  const [failedId, setFailedId] = useState<string | null>(null);
  const failed = failedId === id;

  return (
    <span
      className={cn(
        "size-12 rounded-xl border border-border bg-white dark:bg-zinc-900 p-2 flex items-center justify-center shrink-0 shadow-sm overflow-hidden",
        className,
      )}
    >
      {brand && !failed ? (
        <img
          src={brand.logo}
          alt={brand.name}
          loading="lazy"
          decoding="async"
          className="max-h-full max-w-full object-contain"
          onError={() => setFailedId(id)}
        />
      ) : (
        <span
          className="flex size-full items-center justify-center rounded-md bg-muted text-[11px] font-semibold tracking-wide text-muted-foreground"
          aria-hidden="true"
        >
          {brand?.initials ?? "??"}
        </span>
      )}
    </span>
  );
}
