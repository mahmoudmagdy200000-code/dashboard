import { ReactNode, useState } from "react";
import { AsabLogo } from "../../../AsabLogo";
import {
  LayoutDashboard, FileText, ShoppingCart, Package, Building2,
  Clock, Users, Wallet, BarChart3, Settings, Bell, ChevronDown,
  LogOut, Menu, X, TrendingUp, AlertTriangle, CheckCircle2,
  ChevronsRight, Home, Truck, ArrowLeftRight
} from "lucide-react";

type UserRole = "accountant" | "head-accountant" | "admin" | "branch-manager" | "procurement" | "supplier";

interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
  badge?: number;
  children?: { id: string; label: string }[];
}

function getNavItems(role: UserRole): NavItem[] {
  if (role === "branch-manager") {
    return [
      { id: "overview", label: "نظرة عامة", icon: <LayoutDashboard size={18} /> },
      { id: "employees", label: "الموظفون", icon: <Users size={18} /> },
      { id: "items", label: "الأصناف", icon: <Package size={18} /> },
      { id: "suppliers", label: "الموردون", icon: <Truck size={18} /> },
      { id: "settings", label: "إعدادات الفرع", icon: <Settings size={18} /> },
    ];
  }
  if (role === "procurement") {
    return [
      { id: "overview", label: "الرئيسية", icon: <LayoutDashboard size={18} /> },
      { id: "orders", label: "الطلبات", icon: <ShoppingCart size={18} />, badge: 45 },
      { id: "items", label: "الأصناف", icon: <Package size={18} /> },
      { id: "suppliers", label: "الموردون", icon: <Truck size={18} /> },
      { id: "reports", label: "التقارير", icon: <BarChart3 size={18} /> },
    ];
  }
  if (role === "supplier") {
    return [
      { id: "overview", label: "الرئيسية", icon: <LayoutDashboard size={18} /> },
      { id: "orders", label: "الطلبات", icon: <ShoppingCart size={18} />, badge: 8 },
      { id: "items", label: "أصنافي", icon: <Package size={18} /> },
      { id: "prices", label: "الأسعار", icon: <TrendingUp size={18} /> },
      { id: "reports", label: "تقاريري", icon: <BarChart3 size={18} /> },
    ];
  }

  const baseItems: NavItem[] = [
    { id: "dashboard", label: "لوحة التحكم", icon: <LayoutDashboard size={18} /> },
    { id: "sales", label: "المبيعات", icon: <TrendingUp size={18} />, badge: role === "accountant" ? 14 : 0 },
    { id: "expenses", label: "المصروفات", icon: <Wallet size={18} />, badge: role === "accountant" ? 22 : 0 },
    { id: "purchases", label: "المشتريات", icon: <ShoppingCart size={18} /> },
    { id: "inventory", label: "المخزون", icon: <Package size={18} /> },
    { id: "fixed-assets", label: "الأصول الثابتة", icon: <Building2 size={18} /> },
    { id: "shifts", label: "إدارة الشفتات", icon: <Clock size={18} /> },
    { id: "employees", label: "كشف حساب الموظفين", icon: <Users size={18} /> },
    { id: "cash", label: "إدارة العهد النقدية", icon: <ArrowLeftRight size={18} /> },
  ];

  if (role === "head-accountant" || role === "admin") {
    baseItems.push({ id: "accountants", label: "المحاسبون", icon: <Users size={18} /> });
    baseItems.push({ id: "reports-manager", label: "مدير التقارير", icon: <BarChart3 size={18} /> });
  }

  if (role === "admin") {
    baseItems.push({ id: "erp-export", label: "تصدير ERP", icon: <ChevronsRight size={18} /> });
    baseItems.push({ id: "permissions", label: "الصلاحيات", icon: <Settings size={18} /> });
  }

  return baseItems;
}

function getRoleName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    "accountant": "محاسب",
    "head-accountant": "رئيس الحسابات",
    "admin": "أدمن النظام",
    "branch-manager": "مدير الفرع",
    "procurement": "مدير المشتريات",
    "supplier": "مورد"
  };
  return names[role];
}

function getRoleColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    "accountant": "bg-blue-100 text-blue-700",
    "head-accountant": "bg-amber-100 text-amber-700",
    "admin": "bg-red-100 text-red-700",
    "branch-manager": "bg-green-100 text-green-700",
    "procurement": "bg-purple-100 text-purple-700",
    "supplier": "bg-cyan-100 text-cyan-700"
  };
  return colors[role];
}

interface AppLayoutProps {
  children: ReactNode;
  role: UserRole;
  userName: string;
  activeSection?: string;
  notificationsCount?: number;
  branchName?: string;
}

export function AppLayout({
  children,
  role,
  userName,
  activeSection = "dashboard",
  notificationsCount = 0,
  branchName
}: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navItems = getNavItems(role);

  return (
    <div className="asab-root flex h-screen overflow-hidden bg-[#F8F7FF]">
      {/* Sidebar */}
      <aside
        className={`flex flex-col transition-all duration-300 ${sidebarCollapsed ? "w-[64px]" : "w-[240px]"}`}
        style={{ background: "var(--asab-sidebar)", flexShrink: 0 }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
          <AsabLogo variant="sidebar" showWordmark={!sidebarCollapsed} />
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="mr-auto text-white/40 hover:text-white transition-colors"
          >
            {sidebarCollapsed ? <Menu size={16} /> : <X size={16} />}
          </button>
        </div>

        {/* Role Badge */}
        {!sidebarCollapsed && (
          <div className="px-4 py-3 border-b border-white/10">
            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold ${getRoleColor(role)}`}>
              <span>{getRoleName(role)}</span>
            </div>
            {branchName && <div className="text-white/50 text-[11px] mt-1">{branchName}</div>}
          </div>
        )}

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition-all text-right ${
                activeSection === item.id
                  ? "bg-white/15 text-white"
                  : "text-white/60 hover:bg-white/8 hover:text-white/90"
              }`}
            >
              <span className={`flex-shrink-0 ${activeSection === item.id ? "text-[#00D9FF]" : ""}`}>
                {item.icon}
              </span>
              {!sidebarCollapsed && (
                <>
                  <span className="text-sm font-medium flex-1 text-right">{item.label}</span>
                  {item.badge ? (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                      {item.badge}
                    </span>
                  ) : null}
                </>
              )}
              {sidebarCollapsed && item.badge ? (
                <span className="absolute right-2 top-1 bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-cyan-400 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">{userName[0]}</span>
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">{userName}</div>
                <div className="text-white/40 text-[11px] truncate">{getRoleName(role)}</div>
              </div>
            )}
            {!sidebarCollapsed && (
              <button className="text-white/40 hover:text-white transition-colors">
                <LogOut size={14} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-4 flex-shrink-0">
          <div className="flex-1">
            <h1 className="text-gray-800 font-bold text-lg">
              {navItems.find(i => i.id === activeSection)?.label ?? "لوحة التحكم"}
            </h1>
            {branchName && <p className="text-gray-400 text-xs">{branchName}</p>}
          </div>
          <div className="flex items-center gap-3">
            {/* Date filter */}
            <select className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 bg-gray-50 cursor-pointer">
              <option>هذا الشهر</option>
              <option>هذا الأسبوع</option>
              <option>اليوم</option>
              <option>مخصص</option>
            </select>
            {/* Notifications */}
            <button className="relative w-9 h-9 flex items-center justify-center rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors">
              <Bell size={18} />
              {notificationsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {notificationsCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
