// Pure business rules shared by the dashboard, the landing pages and tests.

/** Algerian mobile number: starts with 05, 06 or 07 and has exactly 10 digits. */
export function normalizeDzPhone(input: string): string {
  const asciiInput = input.replace(/[٠-٩۰-۹]/g, (digit) => {
    const code = digit.charCodeAt(0);
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  });
  const digits = asciiInput.replace(/\D/g, "");
  if (!digits) return "";

  let normalized = digits;
  if (normalized.startsWith("00213")) normalized = `0${normalized.slice(5)}`;
  else if (normalized.startsWith("213")) normalized = `0${normalized.slice(3)}`;

  if (normalized.length === 9 && /^[567]/.test(normalized)) {
    return `0${normalized}`;
  }

  return normalized;
}

export function isValidDzPhone(input: string): boolean {
  return /^0[567]\d{8}$/.test(normalizeDzPhone(input));
}

export type DeliveryType = "home" | "desk";

export type DeliveryRate = {
  wilaya_code: number;
  home_price: number | null;
  desk_price: number | null;
};

export type StoreDefaults = { default_home_price: number; default_desk_price: number };

/**
 * Shipping price for a wilaya. A custom rate row wins; `null` in that row means
 * the delivery type is not offered there. Without a row, the store defaults apply.
 */
export function shippingPrice(
  wilayaCode: number,
  type: DeliveryType,
  rates: DeliveryRate[],
  defaults: StoreDefaults,
): number | null {
  const row = rates.find((r) => r.wilaya_code === wilayaCode);
  if (row) return type === "home" ? row.home_price : row.desk_price;
  return type === "home" ? defaults.default_home_price : defaults.default_desk_price;
}

export function orderTotal(unitPrice: number, quantity: number, shipping: number): number {
  return unitPrice * quantity + shipping;
}

export const TRIAL_DAYS = 10;
export const GRACE_PERIOD_DAYS = 7;
export const EXPIRY_WARNING_DAYS = 2;

export type SubscriptionState = {
  endsAt: Date;
  isActive: boolean;
  isTrial: boolean;
  daysLeft: number;
  showWarning: boolean;
  isGracePeriod: boolean;
  graceEndsAt: Date | null;
};

const DAY = 24 * 60 * 60 * 1000;

/** Access lasts until the later of the trial end and the paid-until date. */
export function subscriptionState(
  store: { trial_ends_at: string; paid_until: string | null },
  now: Date = new Date(),
): SubscriptionState {
  const trial = new Date(store.trial_ends_at);
  const paid = store.paid_until ? new Date(store.paid_until) : null;
  const graceEndsAt = new Date(trial.getTime() + GRACE_PERIOD_DAYS * DAY);
  const isTrialActive = now.getTime() < trial.getTime();
  const isPaidActive = Boolean(paid && paid.getTime() > now.getTime());
  const isGracePeriod = now.getTime() > trial.getTime() && now.getTime() <= graceEndsAt.getTime() && (!paid || paid.getTime() <= now.getTime());

  const isActive = isTrialActive || isPaidActive;
  const endsAt = paid && paid > trial ? paid : trial;

  let daysLeft = 0;
  if (isTrialActive) {
    daysLeft = Math.max(0, Math.ceil((trial.getTime() - now.getTime()) / DAY));
  } else if (isPaidActive && paid) {
    daysLeft = Math.max(0, Math.ceil((paid.getTime() - now.getTime()) / DAY));
  } else if (isGracePeriod) {
    daysLeft = Math.max(0, Math.ceil((graceEndsAt.getTime() - now.getTime()) / DAY));
  }

  const showWarning = (isTrialActive && daysLeft <= EXPIRY_WARNING_DAYS) || (isGracePeriod && daysLeft <= EXPIRY_WARNING_DAYS);

  return {
    endsAt: isGracePeriod ? graceEndsAt : endsAt,
    isActive,
    isTrial: isTrialActive || (!paid || paid <= trial),
    daysLeft,
    showWarning,
    isGracePeriod,
    graceEndsAt: isGracePeriod ? graceEndsAt : null,
  };
}

export function formatDZD(value: number): string {
  return `${new Intl.NumberFormat("fr-DZ").format(value)} د.ج`;
}

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function isValidStoreSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(slug);
}

export function suggestedStoreSlug(storeName: string, email: string | null, userId: string): string {
  const candidates = [slugify(storeName), slugify(email?.split("@")[0] ?? "")];
  const existingCandidate = candidates.find((candidate) => isValidStoreSlug(candidate));
  if (existingCandidate) return existingCandidate;

  const userSuffix = userId.replace(/[^a-z0-9]/gi, "").slice(0, 8).toLowerCase() || "account";
  return `store-${userSuffix}`;
}

export function whatsappLink(phone: string, message: string): string {
  const digits = normalizeDzPhone(phone);
  const intl = digits.startsWith("0") ? `213${digits.slice(1)}` : digits;
  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
}

export const ORDER_STATUSES = [
  "new",
  "confirmed",
  "shipping",
  "delivered",
  "cancelled",
  "returned",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  new: "جديد",
  confirmed: "مؤكد",
  shipping: "قيد التوصيل",
  delivered: "تم التوصيل",
  cancelled: "ملغي",
  returned: "مرتجع",
};

export const STATUS_VARIANT: Record<
  OrderStatus,
  "info" | "warning" | "success" | "danger" | "neutral"
> = {
  new: "info",
  confirmed: "warning",
  shipping: "warning",
  delivered: "success",
  cancelled: "danger",
  returned: "neutral",
};

export const CALL_OUTCOMES = ["no_answer_1", "no_answer_2", "busy_callback", "confirmed"] as const;
export type CallOutcome = (typeof CALL_OUTCOMES)[number];
export const CALL_LABELS: Record<CallOutcome, string> = {
  no_answer_1: "لم يرد - محاولة 1",
  no_answer_2: "لم يرد - محاولة 2",
  busy_callback: "مشغول / أعاد الاتصال",
  confirmed: "تم التأكيد بنجاح",
};

const ORDER_ERRORS: Record<string, string> = {
  STORE_INACTIVE: "المتجر متوقف مؤقتاً عن استقبال الطلبات.",
  INVALID_PHONE: "رقم الهاتف غير صحيح. يجب أن يبدأ بـ 05 أو 06 أو 07 ويتكون من 10 أرقام.",
  INVALID_NAME: "يرجى كتابة الاسم واللقب.",
  INVALID_QUANTITY: "الكمية غير صحيحة.",
  INVALID_WILAYA: "يرجى اختيار الولاية.",
  INVALID_COMMUNE: "يرجى اختيار البلدية.",
  INVALID_SIZE: "يرجى اختيار المقاس.",
  INVALID_COLOR: "يرجى اختيار اللون.",
  DELIVERY_UNAVAILABLE: "نوع التوصيل هذا غير متوفر في ولايتك.",
  DUPLICATE_ORDER: "لقد سجلنا طلبك بالفعل. سنتصل بك قريباً.",
  PRODUCT_NOT_FOUND: "هذا المنتج غير متوفر حالياً.",
  OUT_OF_STOCK: "نفدت الكمية المتوفرة من هذا المنتج.",
  ORDER_LIMIT: "المتجر متوقف مؤقتاً عن استقبال الطلبات.",
  PRO_REQUIRED: "هذه الميزة متاحة في خطة Pro.",
  TEAM_LIMIT: "وصلت إلى الحد الأقصى: 5 مستخدمين معك.",
  MEMBER_IS_OWNER: "هذا بريدك أنت، أضف بريد عضو آخر.",
  INVALID_EMAIL: "البريد الإلكتروني غير صحيح.",
  INVALID_MEMBER: "هذا العضو غير موجود في فريقك.",
  INVALID_META_PIXEL: "رقم Meta Pixel غير صحيح (أرقام فقط).",
  INVALID_TIKTOK_PIXEL: "رقم TikTok Pixel غير صحيح (حروف لاتينية وأرقام).",
  READ_ONLY: "حسابك في وضع القراءة فقط. جدّد اشتراكك لمتابعة التعديل.",
  FORBIDDEN: "ليست لديك صلاحية لهذا الإجراء.",
};

export function friendlyError(message: string | undefined | null, fallback = "حدث خطأ، حاول مرة أخرى."): string {
  if (!message) return fallback;
  for (const [key, text] of Object.entries(ORDER_ERRORS)) {
    if (message.includes(key)) return text;
  }
  if (message.includes("INVALID_SLUG")) return "الرابط يجب أن يحتوي على حروف لاتينية صغيرة وأرقام وشرطات فقط.";
  if (message.includes("duplicate key") && message.includes("store_members")) return "هذا العضو مضاف مسبقاً.";
  if (message.includes("duplicate key") && message.includes("slug")) return "هذا الرابط مستعمل، اختر رابطاً آخر.";
  if (message.includes("row-level security")) return "حسابك في وضع القراءة فقط. جدّد اشتراكك لمتابعة التعديل.";
  return fallback;
}

// ---------- Plans: Start / Pro ----------

export type PlanTier = "start" | "pro";
export type StoreAccess = "owner" | "manager" | "agent";

/** Start plan: orders accepted per calendar month (Algiers time). Pro has no limit. */
export const START_MONTHLY_ORDER_LIMIT = 300;
/** Merchants on Start get a warning from this many orders in the month. */
export const ORDER_LIMIT_WARNING_AT = 250;
/** Pro: up to 5 users in total — the owner plus 4 team members. */
export const MAX_TEAM_USERS = 5;
export const MAX_TEAM_MEMBERS = MAX_TEAM_USERS - 1;

/**
 * Plan in force right now. Mirrors SQL `store_tier`: a paid period that runs past the
 * trial uses the paid plan; during the free trial every store gets Pro features.
 */
export function effectiveTier(
  store: { trial_ends_at: string; paid_until: string | null; plan_tier: string },
  now: Date = new Date(),
): PlanTier {
  const trial = new Date(store.trial_ends_at);
  const paid = store.paid_until ? new Date(store.paid_until) : null;
  const tier: PlanTier = store.plan_tier === "pro" ? "pro" : "start";
  if (paid && paid > now && paid > trial) return tier;
  if (trial > now) return "pro";
  return tier;
}

export function orderLimitState(tier: PlanTier, monthOrders: number) {
  if (tier === "pro") return { limit: null, used: monthOrders, remaining: null, nearLimit: false, reached: false };
  const limit = START_MONTHLY_ORDER_LIMIT;
  return {
    limit,
    used: monthOrders,
    remaining: Math.max(0, limit - monthOrders),
    nearLimit: monthOrders >= ORDER_LIMIT_WARNING_AT && monthOrders < limit,
    reached: monthOrders >= limit,
  };
}

export type DashboardArea =
  | "overview"
  | "orders"
  | "products"
  | "analytics"
  | "activity"
  | "team"
  | "billing"
  | "delivery"
  | "yalidine"
  | "settings";

/** Which dashboard pages each person can open. The database enforces the same rules. */
export const AREA_ACCESS: Record<DashboardArea, StoreAccess[]> = {
  overview: ["owner", "manager", "agent"],
  orders: ["owner", "manager", "agent"],
  products: ["owner", "manager"],
  analytics: ["owner", "manager"],
  activity: ["owner", "manager"],
  team: ["owner"],
  billing: ["owner"],
  delivery: ["owner"],
  yalidine: ["owner"],
  settings: ["owner"],
};

/** Pages that are part of Pro only. */
export const PRO_AREAS: DashboardArea[] = ["analytics", "activity", "team"];

export function canOpen(access: StoreAccess, area: DashboardArea): boolean {
  return AREA_ACCESS[area].includes(access);
}

export const MEMBER_ROLE_LABELS: Record<"manager" | "agent", string> = {
  manager: "مدير",
  agent: "عون تأكيد",
};

/** Dashboard page a URL belongs to (used to block pages a team member cannot open). */
export function areaForPath(path: string): DashboardArea {
  const seg = path.replace(/\/+$/, "").split("/")[2] ?? "";
  const map: Record<string, DashboardArea> = {
    orders: "orders",
    products: "products",
    analytics: "analytics",
    activity: "activity",
    team: "team",
    billing: "billing",
    delivery: "delivery",
    yalidine: "yalidine",
    settings: "settings",
  };
  return map[seg] ?? "overview";
}

export function getFeaturePlanBadge(area: string): "Start" | "Pro" {
  return PRO_AREAS.includes(area as DashboardArea) ? "Pro" : "Start";
}

// ---------- Ad pixels (Pro). Mirrors SQL `set_store_pixels`. ----------

export function cleanMetaPixelId(input: string): string {
  return input.replace(/\s/g, "");
}
export function cleanTiktokPixelId(input: string): string {
  return input.replace(/\s/g, "").toUpperCase();
}
/** Meta Pixel ID: 10 to 20 digits. Empty means "no pixel". */
export function isValidMetaPixelId(input: string): boolean {
  const v = cleanMetaPixelId(input);
  return v === "" || /^[0-9]{10,20}$/.test(v);
}
/** TikTok Pixel ID: 10 to 30 Latin letters/digits. Empty means "no pixel". */
export function isValidTiktokPixelId(input: string): boolean {
  const v = cleanTiktokPixelId(input);
  return v === "" || /^[A-Z0-9]{10,30}$/.test(v);
}

export const ACTIVITY_LABELS: Record<string, string> = {
  "order.status": "غيّر حالة طلب",
  "order.assigned": "أسند طلباً",
  "order.shipped": "أرسل طلباً للتوصيل",
  "order.notes": "عدّل ملاحظات طلب",
  "order.deleted": "حذف طلباً",
  "call.logged": "سجّل محاولة اتصال",
  "product.created": "أضاف منتجاً",
  "product.updated": "عدّل منتجاً",
  "product.deleted": "حذف منتجاً",
  "member.added": "أضاف عضواً للفريق",
  "member.role": "غيّر دور عضو",
  "member.removed": "أزال عضواً من الفريق",
  "store.pixels": "حدّث إعدادات البيكسل",
};

export const DEFAULT_ONBOARDING_INDUSTRIES = [
  "أزياء وملابس",
  "إلكترونيات وهواتف",
  "مستحضرات تجميل وعطور",
  "أثاث وديكور منزلي",
  "منتجات عامة / أخرى",
];

export const DEFAULT_PRODUCT_TYPES = [
  { value: "physical", label: "منتجات مادية (Tangible / COD)" },
  { value: "digital", label: "منتجات رقمية (Digital)" },
] as const;

export type ProductTypeValue = (typeof DEFAULT_PRODUCT_TYPES)[number]["value"];

export function isProductInGracePeriod(store: { trial_ends_at: string; paid_until: string | null }, now: Date = new Date()): boolean {
  const trial = new Date(store.trial_ends_at);
  const paid = store.paid_until ? new Date(store.paid_until) : null;
  const graceEndsAt = new Date(trial.getTime() + GRACE_PERIOD_DAYS * DAY);
  return now.getTime() > trial.getTime() && now.getTime() <= graceEndsAt.getTime() && (!paid || paid.getTime() <= now.getTime());
}

export function effectivePlanTier(
  store: { trial_ends_at: string; paid_until: string | null; plan_tier: string },
  now: Date = new Date(),
): PlanTier {
  return effectiveTier(store, now);
}
