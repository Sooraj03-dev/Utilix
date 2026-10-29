import React from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/pages";
import { ResourceForm } from "../_components/resource-form";
import { Plus } from "lucide-react";

export default async function NewResourcePage() {
  const user = await getSessionUser();
  if (user && user.role !== "coordinator" && user.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border-[2px] border-[#111111] bg-[#FFD60A] text-xs font-black uppercase shadow-[2px_2px_0px_0px_#111111]">
          <Plus className="w-3.5 h-3.5" />
          New Equipment / Lab Entry
        </div>
        <h2 className="mt-2 text-2xl font-black text-[#111111] tracking-tight">
          Register New Resource
        </h2>
        <p className="mt-1 text-sm text-[#4A4A4A] font-medium">
          Add hardware kits, media gear, or lab spaces to the campus sharing pool. You can configure availability windows immediately after creation.
        </p>
      </div>

      <ResourceForm isEdit={false} />
    </div>
  );
}

