/**
 * Shared configuration for the 19 supported Algerian delivery companies.
 *
 * Each carrier belongs to a category that decides which credentials the
 * connection dialog asks for and which step-by-step guide it shows. Keeping
 * this here lets both the delivery page and the order details sheet agree on
 * carrier ids, names and categories without importing a route module.
 */

export type CarrierCategory =
  "yalidine" | "ecotrack" | "zr-express" | "ecom-delivery-v2" | "maystro" | "generic" | "private";

export type CarrierFieldKey = "api_id" | "api_token" | "courier_name" | "phone";

export type CarrierForm = Record<CarrierFieldKey, string>;

export type CarrierField = {
  key: CarrierFieldKey;
  label: string;
  placeholder: string;
  type?: "text" | "password";
  inputMode?: "text" | "tel" | "numeric";
};

export type CarrierCategoryConfig = {
  fields: CarrierField[];
  steps: string[];
  note?: string;
  testable?: boolean;
};

export type DeliveryCarrier = {
  id: string;
  name: string;
  note: string;
  category: CarrierCategory;
};

export const EMPTY_CARRIER_FORM: CarrierForm = {
  api_id: "",
  api_token: "",
  courier_name: "",
  phone: "",
};

export const DELIVERY_CARRIERS: DeliveryCarrier[] = [
  {
    id: "yalidine",
    name: "Yalidine Express",
    note: "إرسال تلقائي للطلبات عبر API Yalidine",
    category: "yalidine",
  },
  {
    id: "zr-express",
    name: "ZR Express",
    note: "يشمل Stopdesk في جميع الولايات",
    category: "zr-express",
  },
  { id: "maystro", name: "Maystro Delivery", note: "توصيل سريع ناجم/عنابة", category: "maystro" },
  {
    id: "tsl",
    name: "TSL Express",
    note: "شبكة مكاتب واسعة في الوسط والشرق",
    category: "ecotrack",
  },
  { id: "dhd", name: "DHD Express", note: "متخصص في المنازل", category: "ecotrack" },
  { id: "ecotrack", name: "Ecotrack", note: "منصة تتبع مركزية", category: "ecotrack" },
  { id: "elogistia", name: "Elogistia", note: "حلول لوجستية للتجار", category: "generic" },
  { id: "anderson", name: "Anderson", note: "شبكة بلدية", category: "ecotrack" },
  { id: "economiqua", name: "Economiqua", note: "أثمنة اقتصادية", category: "ecotrack" },
  { id: "navex", name: "Navex Delivery", note: "تغطية وطنية", category: "ecotrack" },
  { id: "noest", name: "NOEST", note: "استرجاع سريع للطلبات المرفوضة", category: "ecotrack" },
  { id: "goupex", name: "Goupex", note: "توصيل جماعي بالحمولة", category: "ecotrack" },
  { id: "hr48", name: "48HR Express", note: "ضمان 48 ساعة", category: "ecotrack" },
  { id: "hr48-2", name: "48HR 2 Express", note: "خط الدعم الثاني", category: "ecotrack" },
  {
    id: "ecom-delivery-v2",
    name: "Ecom Delivery V2",
    note: "الإصدار الجديد",
    category: "ecom-delivery-v2",
  },
  { id: "wecan", name: "WeCan Services", note: "خدمة متخصصة في DIR", category: "generic" },
  { id: "zimou", name: "Zimou Express", note: "أثمنة تنافسية", category: "generic" },
  { id: "osen", name: "Osen Express", note: "شبكة مكاتب بالغرب", category: "generic" },
  {
    id: "private",
    name: "ساعي خاص (Private Courier)",
    note: "مناوب خاص — بدون API، سجل بياناته للأرشفة",
    category: "private",
  },
];

const CARRIERS_BY_ID = new Map(DELIVERY_CARRIERS.map((carrier) => [carrier.id, carrier]));

export function carrierById(id: string): DeliveryCarrier | undefined {
  return CARRIERS_BY_ID.get(id);
}

export function carrierCategory(id: string): CarrierCategory {
  return CARRIERS_BY_ID.get(id)?.category ?? "generic";
}

export const CARRIER_CATEGORY_CONFIG: Record<CarrierCategory, CarrierCategoryConfig> = {
  yalidine: {
    testable: true,
    fields: [
      { key: "api_id", label: "API ID", placeholder: "مثال: 12345" },
      {
        key: "api_token",
        label: "API Token",
        placeholder: "مثال: eyJhbGciOi...",
        type: "password",
      },
    ],
    steps: [
      "افتح حسابك في منصة التجار: pro.yalidine.app.",
      "من القائمة الجانبية، ادخل إلى الربط البرمجي (Paramètres ⬅️ Développeur / API).",
      "ستجد خانتي API ID و API Token، انسخهما والصقهما هنا.",
    ],
  },
  ecotrack: {
    fields: [
      {
        key: "api_token",
        label: "API Token / Clé API",
        placeholder: "مثال: eyJhbGciOi...",
        type: "password",
      },
    ],
    steps: [
      "ادخل إلى لوحة تحكم حسابك لدى الشركة.",
      "توجه إلى الإعدادات (Paramètres) ثم الربط البرمجي (API / Clés API).",
      "اضغط على زر توليد رمز جديد (Générer un Token).",
      "اضغط نسخ (Copier) والصقه في الخانة أعلاه.",
    ],
  },
  "zr-express": {
    fields: [
      {
        key: "api_token",
        label: "API Token",
        placeholder: "مثال: eyJhbGciOi...",
        type: "password",
      },
    ],
    steps: [
      "ادخل إلى بوابة التجار في موقع ZR Express (Espace Client).",
      "من القائمة أو خيارات الحساب الشخصي (Profil)، اختر Clé API.",
      "انسخ رمز الـ Token السري الخاص بك وضعه هنا.",
    ],
  },
  "ecom-delivery-v2": {
    fields: [
      {
        key: "api_token",
        label: "API Token",
        placeholder: "مثال: eyJhbGciOi...",
        type: "password",
      },
    ],
    steps: [
      "سجّل الدخول إلى لوحة تحكم Ecom Delivery.",
      "من القائمة الجانبية ادخل إلى Mon Profil ⬅️ Intégration API.",
      "انسخ رمز الـ Jeton API (Token) والصقه هنا لتفعيل المزامنة التلقائية.",
    ],
  },
  maystro: {
    fields: [
      {
        key: "api_token",
        label: "API Token",
        placeholder: "مثال: eyJhbGciOi...",
        type: "password",
      },
    ],
    steps: [
      "افتح لوحة التحكم الخاصة بك في Maystro Delivery.",
      "ادخل إلى Paramètres du compte ⬅️ Clés API.",
      "انسخ الـ Token والصقه هنا واضغط حفظ.",
    ],
  },
  generic: {
    fields: [
      {
        key: "api_token",
        label: "API Token",
        placeholder: "مثال: eyJhbGciOi...",
        type: "password",
      },
    ],
    steps: ["انسخ رمز الربط (Token / Clé API) من إعدادات حسابك في لوحة تحكم الشركة والصقه هنا."],
  },
  private: {
    fields: [
      {
        key: "courier_name",
        label: "اسم الساعي (Courier Name)",
        placeholder: "اسم السائق أو شركة التوصيل",
      },
      {
        key: "phone",
        label: "رقم الهاتف (Phone Number)",
        placeholder: "مثال: 0550123456",
        inputMode: "tel",
      },
    ],
    steps: [],
    note: "لا يحتاج إلى API أو إنترنت. أدخل اسم السائق ورقم هاتفه لتتمكن من إسناد الشحنات إليه مباشرة وطباعة قائمة التوصيل اليدوية.",
  },
};
