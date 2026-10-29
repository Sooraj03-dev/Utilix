"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Search,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Clock,
  Award,
  Trash2,
  User,
  Filter,
} from "lucide-react";
import {
  Input,
  Button,
  Badge,
  EmptyState,
} from "@/components";
import type {
  TrainingRequest,
  TrainingCertification,
  User as UserEntity,
} from "@/lib/types";
import {
  certifyStudentAction,
  revokeTrainingAction,
} from "../actions";

interface TrainingManagerProps {
  requests: TrainingRequest[];
  certifications: TrainingCertification[];
  users: Record<string, UserEntity>;
  currentUserRole: string;
}

export function TrainingManager({
  requests,
  certifications,
  users,
  currentUserRole,
}: TrainingManagerProps) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"requests" | "certifications">("requests");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const pendingRequests = useMemo(() => {
    return requests.filter((r) => r.status === "pending");
  }, [requests]);

  const activeCertifications = useMemo(() => {
    return certifications.filter((c) => !c.revoked_at);
  }, [certifications]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    if (!searchQuery.trim()) return pendingRequests;
    const q = searchQuery.toLowerCase();
    return pendingRequests.filter((r) => {
      const u = users[r.user_id];
      const name = u?.name?.toLowerCase() || "";
      const email = u?.email?.toLowerCase() || "";
      const type = r.training_type.toLowerCase();
      return name.includes(q) || email.includes(q) || type.includes(q) || r.user_id.toLowerCase().includes(q);
    });
  }, [pendingRequests, searchQuery, users]);

  // Filtered certifications
  const filteredCertifications = useMemo(() => {
    if (!searchQuery.trim()) return activeCertifications;
    const q = searchQuery.toLowerCase();
    return activeCertifications.filter((c) => {
      const u = users[c.user_id];
      const name = u?.name?.toLowerCase() || "";
      const email = u?.email?.toLowerCase() || "";
      const type = c.training_type.toLowerCase();
      return name.includes(q) || email.includes(q) || type.includes(q) || c.user_id.toLowerCase().includes(q);
    });
  }, [activeCertifications, searchQuery, users]);

  const handleCertify = async (userId: string, trainingType: string, requestId?: string) => {
    setLoadingActionId(`certify-${userId}-${trainingType}`);
    setMessage(null);

    try {
      const res = await certifyStudentAction(userId, trainingType, requestId);
      if (!res.success) {
        setMessage({ text: res.error || "Failed to certify student.", type: "error" });
      } else {
        setMessage({ text: `Student successfully certified for "${trainingType}".`, type: "success" });
        router.refresh();
      }
    } catch (err: unknown) {
      setMessage({ text: err instanceof Error ? err.message : "Error certifying student.", type: "error" });
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleRevoke = async (userId: string, trainingType: string) => {
    if (!confirm(`Are you sure you want to revoke the "${trainingType}" certification for student ${userId}?`)) {
      return;
    }

    setLoadingActionId(`revoke-${userId}-${trainingType}`);
    setMessage(null);

    try {
      const res = await revokeTrainingAction(userId, trainingType);
      if (!res.success) {
        setMessage({ text: res.error || "Failed to revoke certification.", type: "error" });
      } else {
        setMessage({ text: `Certification for "${trainingType}" revoked.`, type: "success" });
        router.refresh();
      }
    } catch (err: unknown) {
      setMessage({ text: err instanceof Error ? err.message : "Error revoking certification.", type: "error" });
    } finally {
      setLoadingActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast alert banner */}
      {message && (
        <div
          className={`p-4 rounded-xl border-[2.5px] border-[#111111] text-sm font-bold flex items-start gap-3 ${
            message.type === "success"
              ? "bg-[#DCFCE7] text-[#166534]"
              : "bg-[#FEE2E2] text-[#EF4444]"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Tabs and search bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Tab buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("requests")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-[2.5px] border-[#111111] font-bold text-sm min-h-[44px] transition-all ${
              activeTab === "requests"
                ? "bg-[#FFD60A] text-[#111111] shadow-[3px_3px_0px_0px_#111111]"
                : "bg-white text-[#4A4A4A] hover:bg-[#FFF9E6]"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Pending Requests</span>
            <span className="px-2 py-0.5 rounded-full bg-white text-[#111111] text-xs font-black border border-[#111111]">
              {pendingRequests.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("certifications")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-[2.5px] border-[#111111] font-bold text-sm min-h-[44px] transition-all ${
              activeTab === "certifications"
                ? "bg-[#FFD60A] text-[#111111] shadow-[3px_3px_0px_0px_#111111]"
                : "bg-white text-[#4A4A4A] hover:bg-[#FFF9E6]"
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Certified Students</span>
            <span className="px-2 py-0.5 rounded-full bg-white text-[#111111] text-xs font-black border border-[#111111]">
              {activeCertifications.length}
            </span>
          </button>
        </div>

        {/* Search input */}
        <div className="sm:w-80">
          <Input
            placeholder="Search by student, email, or badge..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-[#4A4A4A]" />}
          />
        </div>
      </div>

      {/* Tab 1: Pending Training Requests */}
      {activeTab === "requests" && (
        <div className="space-y-4">
          {filteredRequests.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="No Pending Training Requests"
              description={
                searchQuery
                  ? "No pending training requests match your search query."
                  : "All student training requests for your managed resources have been reviewed."
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRequests.map((req) => {
                const user = users[req.user_id];
                const actionKey = `certify-${req.user_id}-${req.training_type}`;
                const isCertifying = loadingActionId === actionKey;

                return (
                  <div
                    key={req.id}
                    className="p-5 rounded-2xl border-[3px] border-[#111111] bg-white shadow-[4px_4px_0px_0px_#111111] flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-black text-base text-[#111111]">
                            {user?.name || req.user_id}
                          </h4>
                          <p className="text-xs text-[#4A4A4A] font-bold mt-0.5">
                            {user?.email || "No email on file"}
                            {user?.department_id && ` • ${user.department_id}`}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md border-[1.5px] border-[#111111] bg-[#FFF9E6] text-[#111111] text-xs font-bold">
                          <Clock className="w-3 h-3" />
                          Pending
                        </span>
                      </div>

                      <div className="mt-4 p-3 rounded-xl border-[2px] border-[#111111]/20 bg-[#FAF8F5] space-y-1">
                        <div className="text-xs font-bold text-[#4A4A4A] uppercase tracking-wider">
                          Requested Certification
                        </div>
                        <div className="text-sm font-black text-[#111111] flex items-center gap-1.5">
                          <GraduationCap className="w-4 h-4 text-[#111111]" />
                          <span>{req.training_type}</span>
                        </div>
                        <div className="text-xs text-[#4A4A4A]">
                          Requested: {req.created_at.slice(0, 10)}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button
                        variant="primary"
                        size="sm"
                        isLoading={isCertifying}
                        onClick={() => handleCertify(req.user_id, req.training_type, req.id)}
                        leftIcon={<ShieldCheck className="w-4 h-4" />}
                        className="min-h-[44px]"
                      >
                        Grant & Certify
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Certified Students */}
      {activeTab === "certifications" && (
        <div className="space-y-4">
          {filteredCertifications.length === 0 ? (
            <EmptyState
              icon={Award}
              title="No Certifications Found"
              description={
                searchQuery
                  ? "No certifications match your search query."
                  : "No students currently hold active certifications for these training modules."
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCertifications.map((cert) => {
                const user = users[cert.user_id];
                const actionKey = `revoke-${cert.user_id}-${cert.training_type}`;
                const isRevoking = loadingActionId === actionKey;

                return (
                  <div
                    key={cert.id}
                    className="p-5 rounded-2xl border-[3px] border-[#111111] bg-white shadow-[4px_4px_0px_0px_#111111] flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-black text-base text-[#111111]">
                            {user?.name || cert.user_id}
                          </h4>
                          <p className="text-xs text-[#4A4A4A] font-bold mt-0.5">
                            {user?.email || "No email on file"}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md border-[1.5px] border-[#111111] bg-[#DCFCE7] text-[#166534] text-xs font-black">
                          <CheckCircle className="w-3 h-3" />
                          Certified
                        </span>
                      </div>

                      <div className="mt-4 p-3 rounded-xl border-[2px] border-[#111111]/20 bg-[#FFF9E6] space-y-1">
                        <div className="text-xs font-bold text-[#4A4A4A] uppercase tracking-wider">
                          Badge / Prerequisite
                        </div>
                        <div className="text-sm font-black text-[#111111] flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-[#111111]" />
                          <span>{cert.training_type}</span>
                        </div>
                        <div className="text-xs text-[#4A4A4A]">
                          Certified on: {cert.certified_at?.slice(0, 10)}
                        </div>
                      </div>
                    </div>

                    {/* Revoke button (Admin only) */}
                    {currentUserRole === "admin" && (
                      <div className="pt-2 border-t-[1.5px] border-[#111111]/10 flex justify-end">
                        <Button
                          variant="destructive"
                          size="sm"
                          isLoading={isRevoking}
                          onClick={() => handleRevoke(cert.user_id, cert.training_type)}
                          leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                          className="min-h-[44px]"
                        >
                          Revoke Certification
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

