import { useEffect, useState } from "react";
import {
  BarChart3,
  Check,
  CheckCircle2,
  Clock3,
  CreditCard,
  History,
  LayoutDashboard,
  Package,
  Palette,
  Phone,
  Printer,
  Search,
  Settings,
  ShoppingBag,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Truck,
  Users,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { translate, type TranslationKey } from "@/lib/i18n";
import { useUiLanguage } from "@/lib/ui-i18n";

type DashboardTab = "orders" | "stats" | "delivery";
type OrderStatus = 0 | 1 | 2;

const MAIN_MENU: { label: string; icon: LucideIcon; tab?: DashboardTab }[] = [
  { label: "Vue d'ensemble", icon: LayoutDashboard },
  { label: "Commandes", icon: ShoppingBag, tab: "orders" },
  { label: "Produits", icon: Package },
  { label: "Design de la boutique", icon: Palette },
  { label: "Statistiques", icon: BarChart3, tab: "stats" },
  { label: "Historique d'activité", icon: History },
];

const SETTINGS_MENU: { label: string; icon: LucideIcon; tab?: DashboardTab }[] = [
  { label: "Équipe", icon: Users },
  { label: "Abonnement", icon: CreditCard },
  { label: "Tarifs livraison", icon: Truck, tab: "delivery" },
  { label: "Paramètres", icon: Settings },
];

const ORDERS = [
  {
    id: "#1048",
    customer: "Mohamed Amine",
    phone: "0554 •• •• 89",
    city: "Oran",
    wilaya: "31",
    product: "Sneakers Urban",
    amount: "4 800 DA",
  },
  {
    id: "#1047",
    customer: "Yacine Belhadj",
    phone: "0661 •• •• 24",
    city: "Sétif",
    wilaya: "19",
    product: "Sac en cuir élégant",
    amount: "6 200 DA",
  },
  {
    id: "#1046",
    customer: "Sara Benali",
    phone: "0770 •• •• 51",
    city: "Alger",
    wilaya: "16",
    product: "Montre connectée Ultra",
    amount: "9 500 DA",
  },
  {
    id: "#1045",
    customer: "Amine Kaci",
    phone: "0550 •• •• 73",
    city: "Constantine",
    wilaya: "25",
    product: "Écouteurs sans fil",
    amount: "3 900 DA",
  },
];

const STATUS_LABELS = ["En attente", "Confirmée ✓", "Expédiée · ZR Express"];

function OrdersScreen({ mobile, status }: { mobile: boolean; status: OrderStatus }) {
  return (
    <div className={mobile ? "space-y-2" : "space-y-2.5"}>
      {ORDERS.slice(0, mobile ? 3 : 4).map((order, index) => {
        const label = index === 0 ? STATUS_LABELS[status] : STATUS_LABELS[index === 1 ? 1 : 2];
        const tone =
          label === STATUS_LABELS[0]
            ? "border-amber-500/20 bg-amber-500/10 text-amber-700"
            : label === STATUS_LABELS[1]
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
              : "border-primary/20 bg-primary/10 text-primary";

        return (
          <div
            key={order.id}
            className={`rounded-xl border bg-card transition-all duration-500 ${
              mobile ? "p-2.5" : "p-3"
            } ${index === 0 ? "border-primary/20 shadow-2xs ring-1 ring-primary/10" : "border-border/70"}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-start gap-2.5">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-mono text-[10px] font-semibold text-primary">
                  {order.id.slice(1)}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-[11px] font-medium text-foreground sm:text-xs">
                    {order.customer}
                  </div>
                  <div className="mt-0.5 truncate text-[9px] text-muted-foreground sm:text-[10px]">
                    {order.city} ({order.wilaya}) · {order.product}
                  </div>
                  <div className="mt-0.5 font-mono text-[9px] text-muted-foreground" dir="ltr">
                    {order.phone}
                  </div>
                </div>
              </div>
              <div className="shrink-0 text-end">
                <div className="text-[10px] font-semibold text-foreground">{order.amount}</div>
                <span
                  className={`mt-1 inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-1.5 py-0.5 text-[8px] font-medium sm:px-2 sm:text-[9px] ${tone}`}
                >
                  {label === STATUS_LABELS[0] ? (
                    <Clock3 className="size-2.5" aria-hidden />
                  ) : label === STATUS_LABELS[1] ? (
                    <CheckCircle2 className="size-2.5" aria-hidden />
                  ) : (
                    <Truck className="size-2.5" aria-hidden />
                  )}
                  {label}
                </span>
              </div>
            </div>
            {mobile && index === 0 && (
              <div className="mt-2 flex gap-1.5 border-t border-border/60 pt-2">
                <button
                  type="button"
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-500/10 py-1.5 text-[9px] font-medium text-emerald-700"
                >
                  <Phone className="size-3" aria-hidden />
                  Appeler
                </button>
                <button
                  type="button"
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#171717] py-1.5 text-[9px] font-medium text-white"
                >
                  <Truck className="size-3" aria-hidden />
                  Expédier
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StatisticsScreen({ mobile }: { mobile: boolean }) {
  return (
    <div className={`grid gap-2 ${mobile ? "grid-cols-1" : "grid-cols-2"}`}>
      <div className="rounded-xl border border-border/70 bg-card p-3">
        <div className="text-[10px] text-muted-foreground">Revenu du jour</div>
        <div className="mt-1 text-base font-semibold text-foreground sm:text-xl">84 500 DA</div>
        <div className="mt-1 text-[9px] font-medium text-emerald-600">+12,8 % cette semaine</div>
      </div>
      <div className="rounded-xl border border-border/70 bg-card p-3">
        <div className="text-[10px] text-muted-foreground">Taux de confirmation</div>
        <div className="mt-1 text-base font-semibold text-foreground sm:text-xl">88 %</div>
        <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="w-[88%] rounded-full bg-emerald-500" />
        </div>
      </div>
      <div
        className={`rounded-xl border border-border/70 bg-card p-3 ${mobile ? "" : "col-span-2"}`}
      >
        <div className="mb-2 text-[10px] text-muted-foreground">Top Wilayas</div>
        <div className="flex flex-wrap gap-1.5">
          {["Oran", "Alger", "Sétif"].map((city, index) => (
            <span
              key={city}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[9px] font-medium text-foreground"
            >
              <span className="text-primary">{index + 1}.</span>
              {city}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function DeliveryScreen({ mobile }: { mobile: boolean }) {
  return (
    <div className="space-y-2">
      {[
        { name: "ZR Express", detail: "Livraison nationale", connected: true },
        { name: "Yalidine", detail: "58 wilayas couvertes", connected: false },
      ].map((carrier) => (
        <div
          key={carrier.name}
          className="flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-card p-2.5 sm:p-3"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Truck className="size-4 text-foreground" aria-hidden />
            </span>
            <div className="min-w-0">
              <div className="truncate text-[11px] font-semibold text-foreground">
                {carrier.name}
              </div>
              <div className="truncate text-[9px] text-muted-foreground">{carrier.detail}</div>
            </div>
          </div>
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[8px] font-medium ${
              carrier.connected
                ? "bg-emerald-500/10 text-emerald-700"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {carrier.connected && <Wifi className="size-2.5" aria-hidden />}
            {carrier.connected ? "Connecté" : "Connecter"}
          </span>
        </div>
      ))}
      <button
        type="button"
        className={`flex w-full items-center justify-center gap-2 rounded-xl bg-[#171717] px-3 font-medium text-white shadow-sm transition-colors hover:bg-[#262626] ${
          mobile ? "py-2.5 text-[10px]" : "py-3 text-xs"
        }`}
      >
        <Printer className="size-3.5" aria-hidden />
        Générer des bordereaux A6
      </button>
      <p className="text-center text-[9px] text-muted-foreground">
        Sélectionnez vos commandes et imprimez en un clic.
      </p>
    </div>
  );
}

function ScreenContent({
  tab,
  status,
  mobile,
}: {
  tab: DashboardTab;
  status: OrderStatus;
  mobile: boolean;
}) {
  if (tab === "stats") return <StatisticsScreen mobile={mobile} />;
  if (tab === "delivery") return <DeliveryScreen mobile={mobile} />;
  return <OrdersScreen mobile={mobile} status={status} />;
}

export function DashboardShowcase() {
  const language = useUiLanguage();
  const isRtl = language === "ar";
  const [tab, setTab] = useState<DashboardTab>("orders");
  const [orderStatus, setOrderStatus] = useState<OrderStatus>(0);
  const t = (key: TranslationKey) => translate(language, key);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTab((current) =>
        current === "orders" ? "stats" : current === "stats" ? "delivery" : "orders",
      );
    }, 4000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (tab !== "orders") {
      setOrderStatus(0);
      return;
    }

    const timer = window.setInterval(() => {
      setOrderStatus((current) => ((current + 1) % 3) as OrderStatus);
    }, 1400);
    return () => window.clearInterval(timer);
  }, [tab]);

  const activeTab = tab;

  return (
    <section className="overflow-hidden border-t bg-background py-16 sm:py-20">
      <div className="mx-auto w-full max-w-7xl px-5">
        <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-14" dir={isRtl ? "rtl" : "ltr"}>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card px-3.5 py-1 text-xs text-muted-foreground shadow-2xs">
            <Sparkles className="size-3 text-primary" aria-hidden />
            <span>{t("landing.dashboard.badge")}</span>
          </span>
          <h2 className="mt-4 text-balance text-2xl font-medium tracking-tight text-foreground sm:text-4xl">
            {t("landing.dashboard.title")}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {t("landing.dashboard.desc")}
          </p>
        </div>

        <div className="mx-auto max-w-6xl">
          <div className="hidden min-w-0 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl md:block">
            <div className="flex h-11 items-center justify-between border-b border-border/60 bg-muted/40 px-4">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-red-400/80" />
                <span className="size-2.5 rounded-full bg-amber-400/80" />
                <span className="size-2.5 rounded-full bg-emerald-400/80" />
                <span className="ms-3 hidden font-mono text-[10px] text-muted-foreground sm:inline">
                  oranix.store/dashboard
                </span>
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">● LIVE</span>
            </div>

            <div className="grid min-h-[530px] grid-cols-1 md:grid-cols-[210px_minmax(0,1fr)]">
              <aside className="hidden flex-col bg-[#111113] px-3 py-4 text-white md:flex">
                <div className="mb-5 h-6 px-2" aria-hidden />
                <div className="mb-2 px-2 text-[8px] font-semibold tracking-[0.16em] text-zinc-500">
                  MENU PRINCIPAL
                </div>
                <nav className="space-y-1">
                  {MAIN_MENU.map(({ label, icon: Icon, tab: itemTab }) => {
                    const selected = itemTab === activeTab;
                    return (
                      <div
                        key={label}
                        className={`flex min-h-8 items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-[10px] transition-colors ${
                          selected
                            ? "bg-white/10 font-medium text-white"
                            : "text-zinc-400 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <Icon className="size-3.5 shrink-0" aria-hidden />
                          <span className="truncate">{label}</span>
                        </span>
                        {itemTab === "orders" && (
                          <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[8px] text-emerald-400">
                            25
                          </span>
                        )}
                      </div>
                    );
                  })}
                </nav>

                <div className="mb-2 mt-6 px-2 text-[8px] font-semibold tracking-[0.16em] text-zinc-500">
                  PARAMÈTRES
                </div>
                <nav className="space-y-1">
                  {SETTINGS_MENU.map(({ label, icon: Icon, tab: itemTab }) => {
                    const selected = itemTab === activeTab;
                    return (
                      <div
                        key={label}
                        className={`flex min-h-8 items-center gap-2 rounded-lg px-2.5 py-1.5 text-[10px] ${
                          selected ? "bg-white/10 font-medium text-white" : "text-zinc-400"
                        }`}
                      >
                        <Icon className="size-3.5 shrink-0" aria-hidden />
                        <span className="truncate">{label}</span>
                      </div>
                    );
                  })}
                </nav>

                <div className="mt-auto rounded-xl border border-white/10 bg-white/5 p-2.5">
                  <div className="text-[9px] text-zinc-400">Revenu du jour</div>
                  <div className="mt-1 text-xs font-semibold">84 500 DA</div>
                </div>
              </aside>

              <main className="min-w-0 bg-[#F7F7F8] p-3 sm:p-5" dir="ltr">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-[#202124] sm:text-base">
                      {tab === "orders"
                        ? "Commandes récentes"
                        : tab === "stats"
                          ? "Statistiques"
                          : "Livraison"}
                    </h3>
                    <p className="mt-0.5 text-[9px] text-[#74777B] sm:text-[10px]">
                      {tab === "orders"
                        ? "Synchronisation en direct"
                        : tab === "stats"
                          ? "Performance de votre boutique"
                          : "Gérez vos transporteurs"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {tab === "orders" && (
                      <div className="hidden items-center gap-1 rounded-lg border border-[#E3E4E8] bg-white px-2 py-1 text-[9px] text-[#74777B] sm:flex">
                        <Search className="size-3" aria-hidden />
                        Recherche
                      </div>
                    )}
                    <div className="flex items-center gap-1 rounded-lg border border-[#E3E4E8] bg-white px-2 py-1 text-[9px] text-[#74777B]">
                      <SlidersHorizontal className="size-3" aria-hidden />
                      Filtrer
                    </div>
                  </div>
                </div>
                <div
                  key={tab}
                  className="animate-in fade-in slide-in-from-bottom-1 duration-500"
                  aria-live="polite"
                >
                  <ScreenContent tab={tab} status={orderStatus} mobile={false} />
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-[#E5E5E8] pt-3 text-[9px] text-[#74777B]">
                  <span>Affichage de 1 à 4 sur 25 commandes</span>
                  <span className="flex items-center gap-1">
                    Mis à jour à l’instant <Check className="size-3 text-emerald-600" aria-hidden />
                  </span>
                </div>
              </main>
            </div>
          </div>

          <div className="mx-auto w-[270px] max-w-full md:hidden">
            <div className="relative h-[590px] w-full rounded-[42px] border-[7px] border-[#1A1A1E] bg-[#1A1A1E] p-[5px] shadow-[0_28px_70px_-24px_rgba(0,0,0,0.65)] ring-1 ring-white/15">
              <div className="relative flex h-full flex-col overflow-hidden rounded-[34px] bg-[#F7F7F8]">
                <div className="relative flex h-[58px] shrink-0 items-center justify-between px-5 pt-1 font-mono text-[10px] font-semibold text-[#171719]">
                  <span>9:41</span>
                  <div className="absolute left-1/2 top-[9px] h-[25px] w-[88px] -translate-x-1/2 rounded-full bg-black" />
                  <span className="flex items-center gap-1.5">
                    <span className="text-[9px]">5G</span>
                    <span className="h-2.5 w-4 rounded-[3px] border border-[#171719] p-[1px]">
                      <span className="block h-full w-3/4 rounded-[1px] bg-emerald-600" />
                    </span>
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-[#E5E5E8] px-3 pb-3">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-[#202124]">
                      {tab === "orders"
                        ? "Mes commandes"
                        : tab === "stats"
                          ? "Statistiques"
                          : "Livraison"}
                    </div>
                    <div className="mt-0.5 text-[9px] text-[#74777B]">oranix.store</div>
                  </div>
                  <span className="flex size-7 items-center justify-center rounded-full bg-white text-[#45464A] shadow-sm">
                    <Smartphone className="size-3.5" aria-hidden />
                  </span>
                </div>

                <div
                  key={`${tab}-mobile`}
                  className="min-h-0 flex-1 overflow-y-auto px-2.5 py-3"
                  aria-live="polite"
                >
                  <ScreenContent tab={tab} status={orderStatus} mobile />
                </div>

                <div className="grid h-12 shrink-0 grid-cols-3 border-t border-[#E5E5E8] bg-white">
                  {[
                    { label: "Commandes", icon: ShoppingBag, active: tab === "orders" },
                    { label: "Stats", icon: BarChart3, active: tab === "stats" },
                    { label: "Livraison", icon: Truck, active: tab === "delivery" },
                  ].map(({ label, icon: Icon, active }) => (
                    <div
                      key={label}
                      className={`flex flex-col items-center justify-center gap-0.5 text-[8px] ${
                        active ? "font-semibold text-[#171719]" : "text-[#96979A]"
                      }`}
                    >
                      <Icon className="size-3.5" aria-hidden />
                      {label}
                    </div>
                  ))}
                </div>

                <div className="flex h-[18px] shrink-0 items-center justify-center bg-white">
                  <div className="h-1 w-[92px] rounded-full bg-[#171719]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
