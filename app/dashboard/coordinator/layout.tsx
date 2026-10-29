import React from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/pages";
import { CoordinatorNav } from "./_components/coordinator-nav";
import { ShieldCheck } from "lucide-react";

export default async function CoordinatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (user && user.role !== "coordinator" && user.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#111111] pb-16">
      <header className="border-b-[3px] border-[#111111] bg-[#FFF9E6]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#FFD60A] border-[2px] border-[#111111] text-xs font-black tracking-wide uppercase shadow-[2px_2px_0px_0px_#111111]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#111111]" />
                Coordinator Control Center
              </div>
              <h1 className="mt-2 text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
                Utilix Lab & Resource Management
              </h1>
              <p className="mt-1 text-sm text-[#4A4A4A] font-medium">
                Fair access monitoring, inventory controls, availability scheduling, and student safety certifications.
              </p>
            </div>
            {user && (
              <div className="self-start sm:self-center px-3 py-1.5 rounded-xl border-[2px] border-[#111111] bg-white text-xs font-bold shadow-[2px_2px_0px_0px_#111111]">
                Signed in as <span className="font-black text-[#111111]">{user.displayName || user.email}</span> ({user.role})
              </div>
            )}
          </div>
          <div className="mt-4 pt-2 border-t-[2px] border-[#111111]/15">
            <CoordinatorNav />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {children}
      </main>
    </div>
  );
}
