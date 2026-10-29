import React from "react";
import { redirect } from "next/navigation";
import { Sliders, ShieldAlert } from "lucide-react";
import { getSessionUser } from "@/lib/auth/pages";
import { getActivePolicy, listPolicyVersions } from "@/lib/db";
import { PolicyEditor } from "./_components/policy-editor";

export default async function AdminPolicyPage() {
  const user = await getSessionUser();
  if (user && user.role !== "admin") {
    redirect("/dashboard");
  }

  const activePolicy = await getActivePolicy();
  const history = await listPolicyVersions();

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border-[2px] border-[#111111] bg-[#FFD60A] text-xs font-black uppercase shadow-[2px_2px_0px_0px_#111111]">
          <Sliders className="w-3.5 h-3.5" />
          Versioned Algorithmic Governance
        </div>
        <h2 className="mt-2 text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
          Fair Allocation Policies & Quotas
        </h2>
        <p className="mt-1 text-sm text-[#4A4A4A] font-medium">
          Configure monthly credit grants, weekly baseline quotas, multi-objective score weights, and peak slot restrictions.
        </p>
      </div>

      <PolicyEditor activePolicy={activePolicy} history={history} />
    </div>
  );
}
