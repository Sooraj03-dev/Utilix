"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Role, DemoUser, AppNotification } from "./types";

export const DEMO_USERS: Record<Role, DemoUser> = {
  student: {
    id: "usr_student_01",
    name: "Aarav Sharma",
    email: "aarav.sharma@campus.edu",
    role: "student",
    department: "Mechatronics & Robotics",
    yearOrDesignation: "Year 4 (Senior)",
    credits: 8,
    maxCredits: 10,
    activeRequestsCount: 2,
    trustScore: 96,
    isDemo: true,
  },
  coordinator: {
    id: "usr_coord_01",
    name: "Dr. Sarah Lin",
    email: "sarah.lin@campus.edu",
    role: "coordinator",
    department: "Design Lab & Makerspace",
    yearOrDesignation: "Facility Lead",
    credits: 50,
    maxCredits: 50,
    activeRequestsCount: 5,
    trustScore: 100,
    isDemo: true,
  },
  admin: {
    id: "usr_admin_01",
    name: "Marcus Vance",
    email: "marcus.vance@campus.edu",
    role: "admin",
    department: "Campus Operations & Resource Oversight",
    yearOrDesignation: "Dean of Facilities",
    credits: 999,
    maxCredits: 999,
    activeRequestsCount: 0,
    trustScore: 100,
    isDemo: true,
  },
};

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: "notif_1",
    title: "Slot Confirmed: Prusa XL 3D Printer",
    message: "Your reservation for Oct 30, 2:00 PM - 5:00 PM was approved under Cross-Disciplinary Project Priority.",
    timestamp: "10 mins ago",
    read: false,
    type: "success",
    actionUrl: "/rules",
  },
  {
    id: "notif_2",
    title: "Monthly Credits Active",
    message: "10 monthly credits available. 2 weekly free off-peak sessions remaining.",
    timestamp: "2 hours ago",
    read: false,
    type: "info",
  },
  {
    id: "notif_3",
    title: "Waitlist Update: Sony FX3 Cinema Kit",
    message: "You moved to #1 on the queue for Saturday morning. Have your training certification ready.",
    timestamp: "Yesterday",
    read: true,
    type: "warning",
  },
];

interface RoleContextType {
  role: Role;
  user: DemoUser;
  notifications: AppNotification[];
  unreadCount: number;
  setRole: (role: Role) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  useCredit: (amount: number) => boolean;
  refundCredit: (amount: number) => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>("student");
  const [user, setUser] = useState<DemoUser>(DEMO_USERS.student);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);

  useEffect(() => {
    // Sync active user state when role switches
    setUser(DEMO_USERS[role]);
  }, [role]);

  const setRole = (newRole: Role) => {
    setRoleState(newRole);
    setUser(DEMO_USERS[newRole]);
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const useCredit = (amount: number): boolean => {
    if (user.credits >= amount) {
      setUser((prev) => ({ ...prev, credits: prev.credits - amount }));
      return true;
    }
    return false;
  };

  const refundCredit = (amount: number) => {
    setUser((prev) => ({
      ...prev,
      credits: Math.min(prev.maxCredits, prev.credits + amount),
    }));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <RoleContext.Provider
      value={{
        role,
        user,
        notifications,
        unreadCount,
        setRole,
        markAsRead,
        markAllAsRead,
        useCredit,
        refundCredit,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}
