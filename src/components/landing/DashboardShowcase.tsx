import { useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
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
import { revealClasses, useInView } from "@/hooks/use-in-view";

type DashboardTab = "orders" | "stats" | "delivery";
type OrderStage = 0 | 1 | 2 | 3 | 4;

type StageMeta = {
  label: string;
  short: string;
  tone: string;
  icon: LucideIcon;
};

/** The five-stage lifecycle every simulated order walks through. */
const ORDER_STAGES: readonly StageMeta[] = [
  {
    label: "En attente",
    short: "En attente",
    tone: "border-amber-500/20 bg-amber-500/10 text-amber-600",
    icon: Clock3,
  },
  {
    label: "Confirmée",
    short: "Confirmée",
    tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
    icon: CheckCircle2,
  },
  {
    label: "Prête à expédier",
    short: "Prête",
    tone: "border-blue-500/20 bg-blue-500/10 text-blue-600",
    icon: Package,
  },
  {
    label: "En livraison · ZR Express",
    short: "En livraison",
    tone: "border-violet-600/25 bg-violet-600/10 text-violet-700",
    icon: Truck,
  },
  {
    label: "Livrée · Encaissée",
    short: "Livrée",
    tone: "border-emerald-700/30 bg-emerald-700/10 text-emerald-800",
    icon: BadgeCheck,
  },
];

// Each row starts at a different point of the same cycle, so the board always
// shows a confirmed, a shipped and a delivered order side by side.
const STAGE_OFFSETS = [0, 3, 4, 1] as const;
/** One stage every 1.8s: fast enough to feel alive, slow enough to read. */
const STAGE_MS = 1800;
/** Give the orders tab a full lifecycle (5 stages) before the demo moves on. */
const TAB_MS = 12000;

const TRACKING_CODES: Record<string, string> = {
  "#1048": "ZR-849201",
  "#1047": "ZR-849188",
  "#1046": "ZR-849173",
  "#1045": "ZR-849160",
};

function stageFor(index: number, base: OrderStage): OrderStage {
  const offset = STAGE_OFFSETS[index] ?? 0;
  return ((base + offset) % ORDER_STAGES.length) as OrderStage;
}

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

function OrdersScreen({ mobile, baseStage }: { mobile: boolean; baseStage: OrderStage }) {
  return (
    <div className={mobile ? "space-y-2" : "space-y-2.5"}>
      {ORDERS.slice(0, mobile ? 3 : 4).map((order, index) => {
        // Every row is offset in the same cycle, so the board always shows a
        // pending, a shipped and a delivered order at the same moment.
        const stage = stageFor(index, baseStage);
        const meta = ORDER_STAGES[stage]!;
        const Icon = meta.icon;
        const tracking = TRACKING_CODES[order.id];
        const showTracking = stage >= 3 && tracking;

        return (
          <div
            // Remounting on each stage replays the pop/glow transition.
            key={`${order.id}-${stage}`}
            className={`order-stage-pop rounded-xl border bg-card transition-colors duration-500 ${
              mobile ? "p-2.5" : "p-3"
            } ${index === 0 ? "border-primary/20 shadow-2xs ring-1 ring-primary/10" : "border-border/70"}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-start gap-2.5">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-mono text-[10px] font-semibold text-primary">
                  {order.id.slice(1)}
                </span>
                <div className="min-w-0">
                  <div className="showcase-dash-order-customer truncate text-[11px] font-medium text-foreground sm:text-xs">
                    {order.customer}
                  </div>
                  <div className="showcase-dash-order-details mt-0.5 truncate text-[9px] text-muted-foreground sm:text-[10px]">
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
                  className={`showcase-dash-order-status mt-1 ms-auto flex w-fit items-center gap-1 whitespace-nowrap rounded-full border px-1.5 py-0.5 text-[8px] font-medium sm:px-2 sm:text-[9px] ${meta.tone}`}
                >
                  {stage === 0 ? (
                    <span className="relative flex size-1.5" aria-hidden>
                      <span className="absolute inline-flex size-full rounded-full bg-amber-500/70 motion-safe:animate-ping" />
                      <span className="relative inline-flex size-1.5 rounded-full bg-amber-500" />
                    </span>
                  ) : (
                    <Icon className="size-2.5" aria-hidden />
                  )}
                  {mobile ? meta.short : meta.label}
                </span>
                {/* Height is reserved so the tracking code never resizes the row. */}
                <div
                  className={`mt-1 h-[11px] font-mono text-[8px] leading-[11px] transition-colors duration-500 ${
                    showTracking
                      ? stage === 3
                        ? "text-violet-600"
                        : "text-emerald-700"
                      : "text-transparent"
                  }`}
                  dir="ltr"
                >
                  {showTracking && (
                    <span className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">
                      {tracking}
                    </span>
                  )}
                </div>
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
        <div className="showcase-dash-stat-value mt-1 text-base font-semibold text-foreground sm:text-xl">
          84 500 DA
        </div>
        <div className="mt-1 text-[9px] font-medium text-emerald-600">+12,8 % cette semaine</div>
      </div>
      <div className="rounded-xl border border-border/70 bg-card p-3">
        <div className="text-[10px] text-muted-foreground">Taux de confirmation</div>
        <div className="showcase-dash-stat-value mt-1 text-base font-semibold text-foreground sm:text-xl">
          88 %
        </div>
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

function DeliveryScreen({
  mobile,
  showcaseDash = false,
}: {
  mobile: boolean;
  showcaseDash?: boolean;
}) {
  return (
    <div className={`space-y-2 ${showcaseDash ? "showcase-dash-carriers" : ""}`}>
      {[
        { name: "ZR Express", detail: "Livraison nationale", connected: true },
        { name: "Yalidine", detail: "58 wilayas couvertes", connected: false },
      ].map((carrier) => (
        <div
          key={carrier.name}
          className={`flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-card p-2.5 sm:p-3 ${
            showcaseDash ? "showcase-dash-carrier-card" : ""
          }`}
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
        className={`flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 font-medium text-primary-foreground shadow-[0_2px_8px_-2px_rgba(16,24,40,0.4)] transition-colors hover:bg-primary-hover ${
          mobile ? "py-2.5 text-[10px]" : "py-3 text-xs"
        } ${showcaseDash ? "showcase-dash-generate" : ""}`}
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
  baseStage,
  mobile,
  showcaseDash = false,
}: {
  tab: DashboardTab;
  baseStage: OrderStage;
  mobile: boolean;
  showcaseDash?: boolean;
}) {
  if (tab === "stats") return <StatisticsScreen mobile={mobile} />;
  if (tab === "delivery") return <DeliveryScreen mobile={mobile} showcaseDash={showcaseDash} />;
  return <OrdersScreen mobile={mobile} baseStage={baseStage} />;
}

export function DashboardShowcase() {
  const language = useUiLanguage();
  const isRtl = language === "ar";
  const [tab, setTab] = useState<DashboardTab>("orders");
  const [baseStage, setBaseStage] = useState<OrderStage>(0);
  const [previewScale, setPreviewScale] = useState<number | null>(null);
  const [previewHeight, setPreviewHeight] = useState(140);
  const previewViewportRef = useRef<HTMLDivElement>(null);
  const previewCanvasRef = useRef<HTMLDivElement>(null);
  const t = (key: TranslationKey) => translate(language, key);
  // Pause the demo the moment it leaves the viewport, resume when it returns.
  const { ref, inView } = useInView<HTMLElement>();

  useEffect(() => {
    const viewport = previewViewportRef.current;
    const canvas = previewCanvasRef.current;
    if (!viewport || !canvas) return;

    const updateScale = () => {
      const canvasWidth = canvas.offsetWidth;
      if (!canvasWidth) return;
      const scale = Math.min(1, viewport.clientWidth / canvasWidth);
      const height = Math.ceil(canvas.offsetHeight * scale);
      setPreviewScale((current) =>
        current !== null && Math.abs(current - scale) < 0.001 ? current : scale,
      );
      setPreviewHeight((current) => (current === height ? current : height));
    };

    const observer = new ResizeObserver(updateScale);
    observer.observe(viewport);
    observer.observe(canvas);
    window.addEventListener("resize", updateScale);
    updateScale();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateScale);
    };
  }, []);

  useEffect(() => {
    if (!inView) return;
    const timer = window.setInterval(() => {
      setTab((current) =>
        current === "orders" ? "stats" : current === "stats" ? "delivery" : "orders",
      );
    }, TAB_MS);
    return () => window.clearInterval(timer);
  }, [inView]);

  // The lifecycle advances on its own clock, even while another tab is shown,
  // so an orders visit always lands on a fresh, already-moving stage.
  useEffect(() => {
    if (!inView) return;

    const timer = window.setInterval(() => {
      setBaseStage((current) => ((current + 1) % ORDER_STAGES.length) as OrderStage);
    }, STAGE_MS);
    return () => window.clearInterval(timer);
  }, [inView]);

  const activeTab = tab;
  const showcaseTabs: { label: string; icon: LucideIcon; tab: DashboardTab }[] = [
    { label: "Commandes", icon: ShoppingBag, tab: "orders" },
    { label: "Stats", icon: BarChart3, tab: "stats" },
    { label: "Livraison", icon: Truck, tab: "delivery" },
  ];

  return (
    <section
      ref={ref}
      className="showcase-dash-section overflow-hidden border-t bg-background py-16 sm:py-20"
    >
      <div className="showcase-dash-container mx-auto w-full max-w-7xl px-5">
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

        <div
          className={`${revealClasses(inView, "relative mx-auto max-w-6xl")} showcase-dash-panel`}
          lang="fr"
          dir="ltr"
        >
          <div
            ref={previewViewportRef}
            className="showcase-dash-scale-viewport"
            style={
              previewScale !== null && previewScale < 1
                ? { height: `${previewHeight}px` }
                : undefined
            }
          >
            <div
              ref={previewCanvasRef}
              className="showcase-dash-scale-canvas"
              style={
                previewScale !== null && previewScale < 1
                  ? { transform: `scale(${previewScale})` }
                  : undefined
              }
            >
              <div className="min-w-0 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl">
                <div className="flex h-11 items-center justify-between border-b border-border/60 bg-muted/40 px-4">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-red-400/80" />
                    <span className="size-2.5 rounded-full bg-amber-400/80" />
                    <span className="size-2.5 rounded-full bg-emerald-400/80" />
                    <span className="showcase-dash-url ms-3 hidden font-mono text-[10px] text-muted-foreground sm:inline">
                      oranix.store/dashboard
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground">● LIVE</span>
                </div>

                <div className="showcase-dash-grid grid min-h-[380px] grid-cols-1 sm:min-h-[440px] md:min-h-[530px] md:grid-cols-[210px_minmax(0,1fr)]">
                  <aside className="showcase-dash-sidebar hidden flex-col bg-[#111113] px-3 py-4 text-white md:flex">
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

                  <main className="showcase-dash-main min-w-0 bg-[#F7F7F8] p-3 sm:p-5" dir="ltr">
                    <div className="mb-4 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="showcase-dash-title truncate text-sm font-semibold text-[#202124] sm:text-base">
                          {tab === "orders"
                            ? "Commandes récentes"
                            : tab === "stats"
                              ? "Statistiques"
                              : "Livraison"}
                        </h3>
                        <p className="showcase-dash-subtitle mt-0.5 text-[9px] text-[#74777B] sm:text-[10px]">
                          {tab === "orders"
                            ? "Synchronisation en direct"
                            : tab === "stats"
                              ? "Performance de votre boutique"
                              : "Gérez vos transporteurs"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {tab === "orders" && (
                          <div className="showcase-dash-search hidden items-center gap-1 rounded-lg border border-[#E3E4E8] bg-white px-2 py-1 text-[9px] text-[#74777B] sm:flex">
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
                      className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-500"
                    >
                      <ScreenContent tab={tab} baseStage={baseStage} mobile={false} showcaseDash />
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-[#E5E5E8] pt-3 text-[9px] text-[#74777B]">
                      <span>Affichage de 1 à 4 sur 25 commandes</span>
                      <span className="flex items-center gap-1">
                        Mis à jour à l’instant{" "}
                        <Check className="size-3 text-emerald-600" aria-hidden />
                      </span>
                    </div>
                  </main>
                </div>

                <nav className="showcase-dash-bottom-tabs hidden" aria-label="Dashboard tabs">
                  {showcaseTabs.map(({ label, icon: Icon, tab: tabId }) => {
                    const active = tabId === activeTab;
                    return (
                      <button
                        key={tabId}
                        type="button"
                        className={`showcase-dash-tab ${active ? "showcase-dash-tab-active" : ""}`}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setTab(tabId)}
                      >
                        <Icon className="showcase-dash-tab-icon" aria-hidden />
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="showcase-dash-phone absolute right-2 top-1/2 z-20 w-[min(34vw,150px)] -translate-y-1/2 left-auto sm:right-4 sm:w-[190px] md:right-5 md:w-[220px] lg:right-6 lg:w-[240px] xl:w-[260px]">
                <div className="relative aspect-[270/590] w-full rounded-[30px] border-[5px] border-[#1A1A1E] bg-[#1A1A1E] p-[3px] shadow-[0_28px_70px_-24px_rgba(0,0,0,0.65)] ring-1 ring-white/15 sm:rounded-[36px] sm:border-[6px] sm:p-1 md:rounded-[42px] md:border-[7px] md:p-[5px]">
                  <div className="relative flex h-full flex-col overflow-hidden rounded-[24px] bg-[#F7F7F8] sm:rounded-[30px] md:rounded-[34px]">
                    <div className="relative flex h-9 shrink-0 items-center justify-between px-3 pt-1 font-mono text-[10px] font-semibold text-[#171719] sm:h-12 sm:px-4 md:h-[58px] md:px-5">
                      <span>9:41</span>
                      <div className="absolute left-1/2 top-2 h-4 w-[50px] -translate-x-1/2 rounded-full bg-black sm:top-[9px] sm:h-5 sm:w-[68px] md:h-[25px] md:w-[88px]" />
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
                      className="min-h-0 flex-1 overflow-y-auto px-2.5 py-3 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500"
                    >
                      <ScreenContent tab={tab} baseStage={baseStage} mobile />
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
        </div>
      </div>
    </section>
  );
}
