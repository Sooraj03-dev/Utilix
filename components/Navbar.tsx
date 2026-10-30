"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Menu,
  X,
  UserCheck,
  Check,
  ChevronDown,
  Sparkles,
  BookOpen,
  Calendar,
  ShieldCheck,
  Settings,
  Clock,
  CheckCircle2,
  Layers,
  LogOut,
} from "lucide-react";
import { cn } from "./utils";
import { useRole } from "./RoleContext";
import { useAuth } from "@/lib/auth/context";
import { CreditPill } from "./CreditPill";
import { Avatar } from "./Avatar";
import { UtilixLogo } from "./UtilixLogo";
import { Role } from "./types";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const { role, user, notifications, unreadCount, setRole, markAllAsRead, markAsRead } =
    useRole();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Role-specific navigation links
  const getNavLinks = () => {
    switch (role) {
      case "coordinator":
        return [
          { label: "Resource Hub", href: "/dashboard/coordinator#resources", icon: Layers },
          { label: "Review Queue", href: "/dashboard/coordinator#queue", icon: Clock },
          { label: "Fair Rules", href: "/rules", icon: BookOpen },
        ];
      case "admin":
        return [
          { label: "All Resources", href: "/dashboard/admin#resources", icon: Layers },
          { label: "Fair Quotas", href: "/dashboard/admin#quotas", icon: ShieldCheck },
          { label: "System Audit", href: "/dashboard/admin#audit", icon: Settings },
          { label: "Fair Rules", href: "/rules", icon: BookOpen },
        ];
      case "student":
      default:
        return [
          { label: "Resources", href: "/dashboard#resources", icon: Layers },
          { label: "My Requests", href: "/dashboard#requests", icon: Calendar },
          { label: "Fair Rules", href: "/rules", icon: BookOpen },
        ];
    }
  };

  const navLinks = getNavLinks();
  const homeHref =
    role === "admin"
      ? "/dashboard/admin"
      : role === "coordinator"
      ? "/dashboard/coordinator"
      : "/dashboard";

  const roleLabels: Record<Role, { title: string; subtitle: string; color: string }> = {
    student: {
      title: "Student View",
      subtitle: `${user.name} • ${user.credits} Credits`,
      color: "bg-[#22C55E]",
    },
    coordinator: {
      title: "Coordinator View",
      subtitle: `${user.name} • Lab Oversight`,
      color: "bg-[#38BDF8]",
    },
    admin: {
      title: "Admin View",
      subtitle: `${user.name} • Campus Oversight`,
      color: "bg-[#C084FC]",
    },
  };

  if (pathname === "/") {
    return null;
  }

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b-[3.5px] border-[#111111] bg-[#FFF8E7] shadow-[0px_4px_0px_0px_#111111]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Left: Official Utilix Combination Mark (Design 3) */}
            <div className="flex items-center gap-6 lg:gap-8">
              <Link
                href={homeHref}
                className="flex items-center group focus:outline-none focus:ring-2 focus:ring-black rounded-2xl p-1"
                aria-label="Utilix Home"
              >
                <UtilixLogo variant="horizontal" size="md" showTagline={true} />
              </Link>

              {/* Desktop Navigation Links */}
              <nav className="hidden md:flex items-center gap-2" aria-label="Main Navigation">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.label}
                      href={link.href}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-2xl text-xs sm:text-sm font-black transition-all min-h-[44px] border-[2.5px]",
                        isActive
                          ? "bg-[#FFD60A] text-[#111111] border-[#111111] shadow-[3px_3px_0px_#111]"
                          : "bg-transparent text-[#111111] border-transparent hover:bg-[#FFFEF2] hover:border-[#111111] hover:shadow-[2px_2px_0px_#111]"
                      )}
                    >
                      <Icon className="w-4 h-4 stroke-[2.5]" />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Right: Credits, Notifications, Profile / Role Switcher */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Credits Pill */}
              <div className="hidden sm:block">
                <CreditPill />
              </div>

              {/* Notification Bell + Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setNotificationsOpen(!notificationsOpen);
                    setRoleDropdownOpen(false);
                  }}
                  className="relative p-2.5 bg-[#FFFEF2] hover:bg-[#FFD60A] text-[#111111] rounded-2xl border-[2.5px] border-[#111111] shadow-[3px_3px_0px_#111] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none transition min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-black"
                  aria-label={`Notifications, ${unreadCount} unread`}
                >
                  <Bell className="w-5 h-5 stroke-[2.5]" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 rounded-full bg-[#EF4444] border-[1.5px] border-[#111111] items-center justify-center text-[9px] font-black text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Popover Dropdown */}
                {notificationsOpen && (
                  <div className="absolute right-0 top-full mt-3 w-80 sm:w-96 bg-[#FFF8E7] rounded-3xl border-[3.5px] border-[#111111] shadow-[6px_6px_0px_0px_#111111] p-4 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="flex items-center justify-between pb-3 border-b-[2.5px] border-[#111111]">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-[#111111]">Utilix Alerts</span>
                        {unreadCount > 0 && (
                          <span className="text-[10px] bg-[#EF4444] text-white border-[1.5px] border-[#111111] px-2 py-0.5 rounded-full font-black">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={markAllAsRead}
                          className="text-xs text-[#111111] hover:underline font-black"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    <div className="mt-2 divide-y-[2px] divide-[#111111]/20 max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center text-xs text-[#111111]/60 font-bold">
                          No recent notifications
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => markAsRead(notif.id)}
                            className={cn(
                              "py-3 px-2 rounded-2xl transition cursor-pointer flex items-start gap-3 hover:bg-[#FFFEF2]",
                              !notif.read && "bg-[#FFD60A]/20"
                            )}
                          >
                            <div className="mt-0.5 flex-shrink-0">
                              {notif.type === "success" && (
                                <CheckCircle2 className="w-4 h-4 text-[#22C55E] stroke-[3]" />
                              )}
                              {notif.type === "warning" && (
                                <Clock className="w-4 h-4 text-[#F59E0B] stroke-[3]" />
                              )}
                              {notif.type === "info" && (
                                <Sparkles className="w-4 h-4 text-[#38BDF8] stroke-[3]" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-black text-[#111111] leading-snug">
                                {notif.title}
                              </p>
                              <p className="text-xs text-[#111111]/80 mt-0.5 font-medium line-clamp-2">
                                {notif.message}
                              </p>
                              <span className="text-[10px] text-[#111111]/60 font-bold mt-1 block">
                                {notif.timestamp}
                              </span>
                            </div>
                            {!notif.read && (
                              <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] border-[1px] border-[#111111] flex-shrink-0 mt-1.5" />
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    <div className="pt-3 border-t-[2.5px] border-[#111111] text-center">
                      <Link
                        href="/rules"
                        onClick={() => setNotificationsOpen(false)}
                        className="text-xs font-black text-[#111111] hover:underline"
                      >
                        View 8 Fair Allocation Rules →
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Menu with Demo Role Switcher */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setRoleDropdownOpen(!roleDropdownOpen);
                    setNotificationsOpen(false);
                  }}
                  className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-2 rounded-2xl bg-[#FFFEF2] hover:bg-[#FFD60A] text-[#111111] border-[2.5px] border-[#111111] shadow-[3px_3px_0px_#111] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none transition min-h-[44px] focus:outline-none focus:ring-2 focus:ring-black"
                  aria-label="User role and account menu"
                >
                  <Avatar name={user.name} src={user.photoURL} role={role} size="sm" />
                  <div className="hidden lg:flex flex-col text-left">
                    <span className="text-xs font-black text-[#111111] leading-tight">
                      {user.name}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#111111]/70">
                      {role} {user.isDemo ? "demo" : ""}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-[#111111] stroke-[3] hidden sm:block" />
                </button>

                {/* Role Switcher Menu */}
                {roleDropdownOpen && (
                  <div className="absolute right-0 top-full mt-3 w-72 bg-[#FFF8E7] rounded-3xl border-[3.5px] border-[#111111] shadow-[6px_6px_0px_0px_#111111] p-4 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-2 border-b-[2.5px] border-[#111111] mb-2 bg-[#FFFEF2] rounded-2xl">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#111111]/70 block">
                        {user.isDemo ? "Active Utilix Persona" : "Verified Account"}
                      </span>
                      <div className="flex items-center gap-2.5 mt-2">
                        <Avatar name={user.name} src={user.photoURL} role={role} size="md" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-[#111111] truncate">{user.name}</p>
                          <p className="text-[11px] font-medium text-[#111111]/80 truncate">{user.department}</p>
                          <p className="text-[10px] text-[#111111] font-mono font-bold mt-0.5 truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    {user.isDemo && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#111111]/70 px-2 block mb-1">
                          Switch Role View
                        </span>
                        {(["student", "coordinator", "admin"] as Role[]).map((r) => {
                          const item = roleLabels[r];
                          const isSelected = role === r;
                          return (
                            <button
                              key={r}
                              type="button"
                              onClick={() => {
                                setRole(r);
                                setRoleDropdownOpen(false);
                              }}
                              className={cn(
                                "w-full text-left p-2.5 rounded-2xl border-[2px] transition flex items-center justify-between min-h-[44px]",
                                isSelected
                                  ? "bg-[#FFD60A] text-[#111111] border-[#111111] shadow-[2.5px_2.5px_0px_#111] font-black"
                                  : "bg-[#FFFEF2] border-[#111111]/40 hover:border-[#111111] hover:bg-yellow-100/50 text-[#111111]"
                              )}
                            >
                              <div>
                                <p className="text-xs font-black capitalize flex items-center gap-1.5">
                                  {r}
                                  {isSelected && (
                                    <span className="text-[9px] bg-black text-[#FFD60A] px-1.5 py-0.2 rounded font-mono font-bold">
                                      Current
                                    </span>
                                  )}
                                </p>
                                <p className="text-[11px] font-medium text-[#111111]/70">{item.subtitle}</p>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-[#111111] stroke-[3]" />}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="pt-3 mt-3 border-t-[2.5px] border-[#111111] flex flex-col gap-1 text-xs px-1">
                      <Link
                        href={homeHref}
                        onClick={() => setRoleDropdownOpen(false)}
                        className="p-2 rounded-xl text-[#111111] font-black hover:bg-yellow-100/60 flex items-center gap-2 transition"
                      >
                        <UserCheck className="w-4 h-4 stroke-[2.5]" />
                        <span>Go to Dashboard</span>
                      </Link>
                      <button
                        type="button"
                        onClick={async () => {
                          setRoleDropdownOpen(false);
                          await logout();
                          router.push("/login");
                        }}
                        className="w-full text-left p-2 rounded-xl text-xs font-black text-[#DC2626] hover:bg-rose-50 flex items-center gap-2 transition"
                      >
                        <LogOut className="w-4 h-4 stroke-[2.5]" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Hamburger Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2.5 bg-[#FFFEF2] text-[#111111] rounded-2xl border-[2.5px] border-[#111111] shadow-[3px_3px_0px_#111] active:translate-x-[1.5px] active:translate-y-[1.5px] transition min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-black"
                aria-expanded={mobileMenuOpen}
                aria-label="Toggle navigation drawer"
              >
                {mobileMenuOpen ? <X className="w-6 h-6 stroke-[3]" /> : <Menu className="w-6 h-6 stroke-[3]" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Drawer Navigation (Neo-Brutalist sheet) */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t-[3.5px] border-[#111111] bg-[#FFF8E7] px-4 pt-4 pb-6 space-y-4 shadow-[0px_6px_0px_0px_#111111] animate-in slide-in-from-top-4 duration-150">
            {/* Mobile Credit & Persona pill */}
            <div className="p-3.5 bg-[#FFFEF2] rounded-2xl border-[2.5px] border-[#111111] shadow-[3px_3px_0px_#111] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Avatar name={user.name} role={role} size="sm" />
                <div>
                  <p className="text-xs font-black text-[#111111]">{user.name}</p>
                  <p className="text-[11px] font-bold text-[#111111]/70 capitalize">{role} role</p>
                </div>
              </div>
              <CreditPill />
            </div>

            {/* Links */}
            <div className="space-y-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-black text-[#111111] bg-[#FFFEF2] border-[2.5px] border-[#111111] shadow-[2.5px_2.5px_0px_#111] active:translate-x-1 active:translate-y-1 min-h-[44px]"
                  >
                    <Icon className="w-5 h-5 stroke-[2.5]" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Quick Role Switch in Mobile Drawer */}
            <div className="pt-3 border-t-[2.5px] border-[#111111] space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-[#111111] block">
                Quick Role Switch (Demo)
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(["student", "coordinator", "admin"] as Role[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setRole(r);
                      setMobileMenuOpen(false);
                    }}
                    className={cn(
                      "py-2.5 px-2 rounded-2xl text-xs font-black capitalize border-[2.5px] border-[#111111] text-center min-h-[44px] transition-all",
                      role === r
                        ? "bg-[#FFD60A] text-[#111111] shadow-[3px_3px_0px_#111]"
                        : "bg-[#FFFEF2] text-[#111111] shadow-[1.5px_1.5px_0px_#111] hover:bg-yellow-100/50"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
