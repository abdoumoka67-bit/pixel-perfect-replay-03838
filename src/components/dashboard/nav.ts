import {
  BarChart3,
  CreditCard,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingBag,
  Truck,
  Plug,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  to:
    | "/dashboard"
    | "/dashboard/orders"
    | "/dashboard/products"
    | "/dashboard/analytics"
    | "/dashboard/billing"
    | "/dashboard/delivery"
    | "/dashboard/yalidine"
    | "/dashboard/settings";
  label: string;
  icon: LucideIcon;
};

export const MAIN_NAV: NavItem[] = [
  { to: "/dashboard", label: "نظرة عامة", icon: LayoutDashboard },
  { to: "/dashboard/orders", label: "إدارة الطلبات", icon: ShoppingBag },
  { to: "/dashboard/products", label: "المنتجات", icon: Package },
  { to: "/dashboard/analytics", label: "الإحصائيات", icon: BarChart3 },
];

export const SETTINGS_NAV: NavItem[] = [
  { to: "/dashboard/billing", label: "الدفع والاشتراك", icon: CreditCard },
  { to: "/dashboard/delivery", label: "أسعار التوصيل", icon: Truck },
  { to: "/dashboard/yalidine", label: "ربط Yalidine", icon: Plug },
  { to: "/dashboard/settings", label: "إعدادات المتجر", icon: Settings },
];
