"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  Settings,
  LogOut,
  FilePlus,
  CreditCard,
  ClipboardList,
  BarChart3,
  ChevronRight,
  Bell,
  Menu,
  X,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Search,
  LifeBuoy,
  Building2,
} from "lucide-react";
import { cn } from "@/utils";
import { useUiStore } from "@/hooks/useUiStore";

// ==========================================
// NAVIGATION STRUCTURE
// ==========================================
interface NavItem {
  name: string;
  href: string;
  icon: any;
  description: string;
  exact?: boolean;
  highlight?: boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Overview",
    items: [
      {
        name: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        description: "Business overview & KPIs",
        exact: true,
      },
    ],
  },
  {
    label: "Billing",
    items: [
      {
        name: "Invoices",
        href: "/invoices",
        icon: FileText,
        description: "View and manage invoices",
      },
      {
        name: "New Invoice",
        href: "/invoices/new",
        icon: FilePlus,
        description: "Create a new invoice",
        highlight: true,
      },
      {
        name: "Quotations",
        href: "/quotations",
        icon: ClipboardList,
        description: "Create and send estimates",
      },
    ],
  },
  {
    label: "Management",
    items: [
      {
        name: "Clients",
        href: "/clients",
        icon: Users,
        description: "Client directory & contacts",
      },
      {
        name: "Inventory",
        href: "/products",
        icon: Package,
        description: "Product catalog & pricing",
      },
      {
        name: "Payments",
        href: "/payments",
        icon: CreditCard,
        description: "Record incoming payments",
      },
    ],
  },
  {
    label: "Procurement",
    items: [
      {
        name: "Vendors",
        href: "/vendors",
        icon: Building2,
        description: "Supplier directory & contacts",
      },
      {
        name: "Purchases",
        href: "/purchases",
        icon: FilePlus,
        description: "Track inward inventory & tax",
      },
    ],
  },
  {
    label: "Analytics",
    items: [
      {
        name: "Reports",
        href: "/reports",
        icon: BarChart3,
        description: "Revenue & GST summaries",
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        name: "Settings",
        href: "/settings",
        icon: Settings,
        description: "Company info & preferences",
      },
      {
        name: "Support",
        href: "/support",
        icon: LifeBuoy,
        description: "Professional help & guides",
      },
    ],
  },
];

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useUiStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const pathname = usePathname();

  // Handle mobile menu auto-close on navigate
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-screen bg-[#F0F2F5] overflow-hidden text-slate-900 font-sans selection:bg-primary-500 selection:text-white">
      {/* ── Sidebar (Desktop) ── */}
      <motion.aside
        initial={false}
        animate={{ 
          width: sidebarOpen ? "var(--sidebar-width)" : "var(--sidebar-collapsed-width)",
        }}
        transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        className="hidden lg:flex flex-col z-50 p-4 relative shrink-0"
      >
        <div className="clay-card h-full flex flex-col overflow-hidden border-0">
          <SidebarContent isCollapsed={!sidebarOpen} pathname={pathname} />
        </div>

        {/* Toggle Button */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-1 top-24 w-8 h-8 clay-card flex items-center justify-center text-slate-400 shadow-xl hover:text-primary-600 transition-all z-50 hover:scale-110 active:scale-90"
        >
          {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRightIcon size={16} />}
        </button>
      </motion.aside>

      {/* ── Mobile Menu (Overlay) ── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-60 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Mobile Sidebar ── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 bottom-0 left-0 w-(--sidebar-width) p-4 z-70 lg:hidden"
          >
            <div className="clay-card h-full flex flex-col overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 relative">
                    <Image src="/Logo.png" alt="ESSAR" fill className="object-contain" />
                  </div>
                  <span className="font-extrabold tracking-tighter text-xl italic text-primary-600 uppercase"> ESSAR</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="w-8 h-8 clay-inner flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 custom-scrollbar">
                <SidebarContent pathname={pathname} isMobile />
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Header
          onMenuClick={() => setIsMobileMenuOpen(true)}
        />
        <main className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-4 scroll-smooth">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.99 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  pathname,
  isCollapsed = false,
  isMobile = false
}: {
  pathname: string;
  isCollapsed?: boolean;
  isMobile?: boolean;
}) {
  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className="flex-1 flex flex-col py-6 overflow-hidden">
      {!isMobile && !isCollapsed && (
        <div className="px-6 mb-8 flex items-center gap-3">
          <div className="min-w-0">
            <p className="font-black text-slate-900 text-xl leading-none tracking-tight">ESSAR</p>
            <p className="text-[9px] font-bold text-primary-500 uppercase tracking-[0.2em] mt-1.5 opacity-80">Enterprise ERP</p>
          </div>
        </div>
      )}

      {!isMobile && isCollapsed && (
        <div className="flex justify-center mb-8">
          <div className="w-8 h-8 relative opacity-80">
            <Image src="/Logo.png" alt="ESSAR" fill className="object-contain" />
          </div>
        </div>
      )}

      <nav className="flex-1 px-3 space-y-6 overflow-y-auto custom-scrollbar pb-6">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            {!isCollapsed && (
              <p className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.15em] px-3 mb-3 opacity-60">
                {section.label}
              </p>
            )}
            {isCollapsed && (
              <div className="h-px bg-slate-100 mx-2 my-4" />
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = isActive(item.href, item.exact);
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={cn(
                        "group flex items-center gap-3 rounded-xl transition-all duration-300",
                        active
                          ? "bg-primary-600 text-white shadow-lg shadow-primary-600/20 py-2.5"
                          : "text-slate-500 hover:bg-slate-50 hover:text-primary-600 py-2.5",
                        isCollapsed ? "justify-center px-0" : "px-3"
                      )}
                      title={isCollapsed ? item.name : ""}
                    >
                      <item.icon
                        className={cn(
                          "h-5 w-5 shrink-0 transition-transform group-hover:scale-110",
                          active ? "text-white" : "text-slate-400 group-hover:text-primary-500"
                        )}
                      />
                      {!isCollapsed && <span className="flex-1 truncate text-sm font-semibold tracking-tight">{item.name}</span>}
                      {!isCollapsed && active && <ChevronRightIcon size={14} className="opacity-40" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="px-3 pt-4 mt-auto shrink-0 space-y-3">
        {!isCollapsed ? (
          <div className="clay-inner p-3 flex items-center gap-3 border border-white/40">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-xs font-black shadow-sm text-primary-600 border border-slate-50 shrink-0">EA</div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate leading-none">ESSAR Admin</p>
              <p className="text-[9px] font-semibold text-slate-400 truncate mt-1.5 uppercase tracking-wider">v4.2.0 Pro</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-xs font-black shadow-sm text-primary-600 border border-slate-50">EA</div>
          </div>
        )}

        <form action="/api/auth/logout" method="POST">
          <button className={cn(
            "w-full flex items-center gap-3 rounded-xl py-2.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all duration-300 group",
            isCollapsed ? "justify-center px-0" : "px-3"
          )}>
            <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
            {!isCollapsed && <span className="text-xs font-bold uppercase tracking-wider">Logout</span>}
          </button>
        </form>
      </div>
    </div>
  );
}

function Header({
  onMenuClick
}: {
  onMenuClick: () => void;
}) {
  const pathname = usePathname();

  const getPageInfo = () => {
    const paths = pathname.split('/').filter(Boolean);
    if (paths.length === 0) return { title: "Dashboard", subtitle: "Overview" };

    for (const section of NAV_SECTIONS) {
      const item = section.items.find(i => i.href === pathname);
      if (item) return { title: item.name, subtitle: section.label };
    }

    if (pathname.includes('/invoices/')) return { title: "Invoicing", subtitle: "Billing" };
    if (pathname.includes('/quotations/')) return { title: "Estimates", subtitle: "Billing" };
    if (pathname.includes('/clients/')) return { title: "Corporate", subtitle: "Management" };

    return { title: "Enterprise", subtitle: "ESSAR ERP" };
  };

  const { title, subtitle } = getPageInfo();

  return (
    <header className="h-(--header-height) shrink-0 flex items-center justify-between px-8 bg-white/40 backdrop-blur-2xl sticky top-0 z-40 transition-all border-b border-white/20">
      <div className="flex items-center gap-6">
        <button
          onClick={onMenuClick}
          className="lg:hidden w-10 h-10 clay-btn bg-white/80 flex items-center justify-center text-slate-500 hover:text-primary-600 transition-all"
        >
          <Menu size={20} />
        </button>

        <div className="flex flex-col">
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] opacity-70">
            <span>{subtitle}</span>
            <ChevronRight size={10} className="opacity-30" />
          </div>
          <h1 className="text-xl font-black text-slate-900 leading-tight tracking-tight font-display">{title}</h1>
        </div>
      </div>

      <div className="flex items-center gap-4 md:gap-8">
        <div className="hidden md:flex items-center gap-3 clay-inner px-4 py-2 w-72 transition-all focus-within:ring-4 focus-within:ring-primary-500/10 focus-within:bg-white group">
          <Search size={16} className="text-slate-300 group-focus-within:text-primary-500 transition-colors" />
          <input
            placeholder="Search dashboard..."
            className="bg-transparent border-none text-sm focus:ring-0 placeholder:text-slate-300 w-full font-semibold text-slate-600"
          />
        </div>

        <div className="flex items-center gap-3">
          <button className="w-11 h-11 clay-btn bg-white/80 flex items-center justify-center text-slate-400 hover:text-primary-600 transition-all relative group">
            <Bell size={18} />
            <span className="absolute top-3.5 right-3.5 w-2 h-2 bg-primary-500 rounded-full border-2 border-white group-hover:scale-125 transition-all" />
          </button>

          <Link href="/settings" className="w-11 h-11 clay-btn bg-white/80 flex items-center justify-center text-slate-400 hover:text-primary-600 transition-all overflow-hidden group">
            <Settings size={18} className="group-hover:rotate-90 transition-transform duration-500" />
          </Link>
        </div>
      </div>
    </header>
  );
}


