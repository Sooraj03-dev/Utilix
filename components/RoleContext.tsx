"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Role, AuthenticatedUser, DemoUser, AppNotification } from "./types";
import { useAuth } from "@/lib/auth/context";
import { isMockAuthEnabled } from "@/lib/auth/config";

export const DEMO_USERS: Record<Role, DemoUser> = {
  student: {
    uid: "usr_student_01",
    id: "usr_student_01",
    displayName: "Aarav Sharma",
    name: "Aarav Sharma",
    email: "aarav.sharma@campus.edu",
    role: "student",
    department: "Mechatronics & Robotics",
    departmentId: "dept_eng",
    departmentName: "Mechatronics & Robotics",
    yearOrDesignation: "Year 4 (Senior)",
    year: 4,
    credits: 8,
    creditBalance: 8,
    maxCredits: 10,
    monthlyCredits: 10,
    freeSessionsLeft: 2,
    freeSessionsUsed: 0,
    assignedResourceIds: [],
    trainingVerified: true,
    reliability: 96,
    activeRequestsCount: 2,
    trustScore: 96,
    unreadNotificationCount: 1,
    source: "mock",
    isDemo: true,
  },
  coordinator: {
    uid: "usr_coord_01",
    id: "usr_coord_01",
    displayName: "Dr. Sarah Lin",
    name: "Dr. Sarah Lin",
    email: "sarah.lin@campus.edu",
    role: "coordinator",
    department: "Design Lab & Makerspace",
    departmentId: "dept_design",
    departmentName: "Design Lab & Makerspace",
    yearOrDesignation: "Facility Lead",
    credits: 50,
    creditBalance: 50,
    maxCredits: 50,
    monthlyCredits: 50,
    freeSessionsLeft: 99,
    freeSessionsUsed: 0,
    assignedResourceIds: ["resource-arduino-kit-a"],
    trainingVerified: true,
    reliability: 100,
    activeRequestsCount: 5,
    trustScore: 100,
    unreadNotificationCount: 0,
    source: "mock",
    isDemo: true,
  },
  admin: {
    uid: "usr_admin_01",
    id: "usr_admin_01",
    displayName: "Marcus Vance",
    name: "Marcus Vance",
    email: "marcus.vance@campus.edu",
    role: "admin",
    department: "Campus Operations & Resource Oversight",
    departmentId: "dept_ops",
    departmentName: "Campus Operations & Resource Oversight",
    yearOrDesignation: "Dean of Facilities",
    credits: 999,
    creditBalance: 999,
    maxCredits: 999,
    monthlyCredits: 999,
    freeSessionsLeft: 999,
    freeSessionsUsed: 0,
    assignedResourceIds: [],
    trainingVerified: true,
    reliability: 100,
    activeRequestsCount: 0,
    trustScore: 100,
    unreadNotificationCount: 0,
    source: "mock",
    isDemo: true,
  },
};

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: "notif_1",
    title: "Slot Confirmed: Prusa XL 3D Printer",
    message: "Your reservation was approved under Cross-Disciplinary Project Priority.",
    timestamp: "10 mins ago",
    read: false,
    type: "success",
    actionUrl: "/rules",
  },
  {
    id: "notif_2",
    title: "Monthly Credits Active",
    message: "Monthly credits available according to active campus policy.",
    timestamp: "2 hours ago",
    read: false,
    type: "info",
  },
  {
    id: "notif_3",
    title: "Waitlist Update",
    message: "You moved up in the reservation queue. Have your training certification ready.",
    timestamp: "Yesterday",
    read: true,
    type: "warning",
  },
];

export interface RoleContextType {
  role: Role;
  user: AuthenticatedUser;
  loading: boolean;
  notifications: AppNotification[];
  unreadCount: number;
  setRole: (role: Role) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  refreshUser: () => Promise<void>;
  useCredit: (amount: number) => boolean;
  refundCredit: (amount: number) => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const { user: authUser, loading: authLoading } = useAuth();
  const [role, setRoleState] = useState<Role>("student");
  const [user, setUser] = useState<AuthenticatedUser>(() => {
    if (authUser) {
      return {
        uid: authUser.uid,
        id: authUser.uid,
        displayName: authUser.displayName,
        name: authUser.displayName,
        email: authUser.email,
        photoURL: authUser.photoURL,
        avatarUrl: authUser.photoURL,
        role: authUser.role as Role,
        creditBalance: 10,
        credits: 10,
        monthlyCredits: 10,
        maxCredits: 10,
        freeSessionsLeft: 2,
        freeSessionsUsed: 0,
        departmentId: "dept_eng",
        departmentName: "Campus",
        department: "Campus",
        year: 1,
        yearOrDesignation: "Student",
        assignedResourceIds: authUser.assignedResourceIds ?? [],
        trainingVerified: authUser.trainingVerified ?? false,
        reliability: 100,
        trustScore: 100,
        activeRequestsCount: 0,
        unreadNotificationCount: 0,
        source: authUser.source,
        isDemo: authUser.source === "mock",
      };
    }
    return DEMO_USERS.student;
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [unreadCount, setUnreadCount] = useState<number>(1);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        const me = json?.user;
        if (me && me.uid) {
          const resolvedUser: AuthenticatedUser = {
            uid: me.uid,
            id: me.uid,
            displayName: me.displayName || "Utilix User",
            name: me.displayName || "Utilix User",
            email: me.email || "",
            photoURL: me.photoURL || undefined,
            avatarUrl: me.photoURL || undefined,
            role: (me.role as Role) || "student",
            creditBalance: me.credit_balance ?? 0,
            credits: me.credit_balance ?? 0,
            monthlyCredits: me.monthly_credits ?? 10,
            maxCredits: me.monthly_credits ?? 10,
            freeSessionsLeft: me.free_sessions_left ?? 0,
            freeSessionsUsed: me.free_sessions_used ?? 0,
            departmentId: me.department_id || "dept_eng",
            departmentName: me.department_id === "dept_eng" ? "Mechatronics & Robotics" : me.department_id,
            department: me.department_id === "dept_eng" ? "Mechatronics & Robotics" : me.department_id,
            year: me.year ?? 1,
            academicYear: me.year ?? 1,
            semester: me.semester ?? 1,
            studentId: me.studentId || me.student_id,
            usn: me.studentId || me.student_id,
            phoneNumber: me.phoneNumber || me.phone_number,
            campus: me.campus || "Main Campus",
            profileCompleted: me.profileCompleted ?? me.profile_completed,
            accountStatus: me.accountStatus || me.account_status || "active",
            yearOrDesignation: me.studentId ? `${me.studentId} • Year ${me.year || 1}` : `Year ${me.year || 1}`,
            assignedResourceIds: me.assignedResourceIds ?? [],
            trainingVerified: me.trainingVerified ?? false,
            reliability: me.reliability ?? 100,
            trustScore: me.reliability ?? 100,
            activeRequestsCount: me.active_booking_count ?? 0,
            unreadNotificationCount: me.unread_notification_count ?? 0,
            source: me.source || "firebase",
            isDemo: me.isDemo === true,
          };
          setUser(resolvedUser);
          setRoleState((me.role as Role) || "student");
          setUnreadCount(me.unread_notification_count ?? 0);
          setLoading(false);
          return;
        }
      }
    } catch {
      // ignore network errors
    } finally {
      setLoading(false);
    }
  }, []);

  // Synchronize on mount and whenever auth state transitions
  useEffect(() => {
    let isSubscribed = true;

    if (authUser) {
      setUser((prev) => ({
        ...prev,
        uid: authUser.uid,
        id: authUser.uid,
        displayName: authUser.displayName,
        name: authUser.displayName,
        email: authUser.email,
        photoURL: authUser.photoURL,
        avatarUrl: authUser.photoURL,
        role: authUser.role as Role,
        source: authUser.source,
        isDemo: authUser.source === "mock",
      }));
      setRoleState(authUser.role as Role);

      void refreshUser();
    } else if (!authLoading) {
      if (!isMockAuthEnabled()) {
        setUser({
          uid: "",
          id: "",
          displayName: "Guest",
          name: "Guest",
          email: "",
          role: "student",
          creditBalance: 0,
          credits: 0,
          monthlyCredits: 0,
          maxCredits: 0,
          freeSessionsLeft: 0,
          freeSessionsUsed: 0,
          departmentId: "",
          department: "",
          yearOrDesignation: "",
          assignedResourceIds: [],
          trainingVerified: false,
          reliability: 100,
          trustScore: 100,
          activeRequestsCount: 0,
          unreadNotificationCount: 0,
          source: "firebase",
          isDemo: false,
        });
      }
      setLoading(false);
    }

    return () => {
      isSubscribed = false;
    };
  }, [authUser, authLoading, refreshUser]);

  const setRole = (newRole: Role) => {
    setRoleState(newRole);
    if (user.isDemo) {
      setUser(DEMO_USERS[newRole]);
    }
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const useCredit = (amount: number): boolean => {
    if (user.creditBalance >= amount) {
      setUser((prev) => ({
        ...prev,
        credits: prev.credits - amount,
        creditBalance: prev.creditBalance - amount,
      }));
      return true;
    }
    return false;
  };

  const refundCredit = (amount: number) => {
    setUser((prev) => ({
      ...prev,
      credits: Math.min(prev.maxCredits, prev.credits + amount),
      creditBalance: Math.min(prev.monthlyCredits, prev.creditBalance + amount),
    }));
  };

  return (
    <RoleContext.Provider
      value={{
        role,
        user,
        loading,
        notifications,
        unreadCount,
        setRole,
        markAsRead,
        markAllAsRead,
        refreshUser,
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
