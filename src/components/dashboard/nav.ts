import {
  BarChart3,
  CreditCard,
  History,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingBag,
  Truck,
  Plug,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { DashboardArea } from "@/lib/commerce";

export type NavItem = {
  to:
    | "/dashboard"
    | "/dashboard/orders"
    | "/dashboard/products"
    | "/dashboard/analytics"
    | "/dashboard/activity"
    | "/dashboard/team"
    | "/dashboard/billing"
    | "/dashboard/delivery"
    | "/dashboard/yalidine"
    | "/dashboard/settings";
  label: string;
  icon: LucideIcon;
  area: DashboardArea;
};

export const MAIN_NAV: NavItem[] = [
  { to: "/dashboard", label: "نظرة عامة", icon: LayoutDashboard, area: "overview" },
  { to: "/dashboard/orders", label: "إدارة الطلبات", icon: ShoppingBag, area: "orders" },
  { to: "/dashboard/products", label: "المنتجات", icon: Package, area: "products" },
  { to: "/dashboard/analytics", label: "الإحصائيات", icon: BarChart3, area: "analytics" },
  { to: "/dashboard/activity", label: "سجل الأنشطة", icon: History, area: "activity" },
];

export const SETTINGS_NAV: NavItem[] = [
  { to: "/dashboard/team", label: "فريق العمل", icon: Users, area: "team" },
  { to: "/dashboard/billing", label: "الدفع والاشتراك", icon: CreditCard, area: "billing" },
  { to: "/dashboard/delivery", label: "أسعار التوصيل", icon: Truck, area: "delivery" },
  { to: "/dashboard/yalidine", label: "ربط Yalidine", icon: Plug, area: "yalidine" },
  { to: "/dashboard/settings", label: "إعدادات المتجر", icon: Settings, area: "settings" },
];
