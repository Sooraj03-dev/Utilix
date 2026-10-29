// Utilix — Pure Audit Filter & Formatting Engine
// Owner: A
import type { AuditAction, AuditLogEntry } from "@/lib/types";

export interface AuditFilterCriteria {
  actor?: string;
  action?: AuditAction | string;
  entity_type?: string;
  entity_id?: string;
  date_from?: string;
  date_to?: string;
  cursor?: string;
  limit?: number;
}

export interface ActionDisplayMeta {
  label: string;
  category: "booking" | "resource" | "policy" | "credit" | "operations" | "security";
  description: string;
}

export const AUDIT_ACTION_MAP: Record<AuditAction, ActionDisplayMeta> = {
  booking_created: {
    label: "Booking Created",
    category: "booking",
    description: "New reservation request submitted",
  },
  booking_status_changed: {
    label: "Status Updated",
    category: "booking",
    description: "Booking lifecycle state transitioned",
  },
  booking_cancelled: {
    label: "Booking Cancelled",
    category: "booking",
    description: "Booking was cancelled by user or coordinator",
  },
  resource_created: {
    label: "Resource Created",
    category: "resource",
    description: "New equipment or space registered in catalog",
  },
  resource_updated: {
    label: "Resource Updated",
    category: "resource",
    description: "Equipment specifications or availability modified",
  },
  policy_created: {
    label: "Policy Activated",
    category: "policy",
    description: "New governance policy version created and activated",
  },
  policy_deactivated: {
    label: "Policy Deactivated",
    category: "policy",
    description: "Previous governance policy version retired",
  },
  credit_applied: {
    label: "Credits Deducted",
    category: "credit",
    description: "Account balance adjusted via credit ledger",
  },
  credit_reconciled: {
    label: "Credits Reconciled",
    category: "credit",
    description: "Account credits balanced or restored",
  },
  approval_decided: {
    label: "Coordinator Approval",
    category: "operations",
    description: "Restricted equipment request approved or rejected",
  },
  checkout: {
    label: "Equipment Checked Out",
    category: "operations",
    description: "Physical item released to user by lab manager",
  },
  return: {
    label: "Equipment Returned",
    category: "operations",
    description: "Physical item inspected and returned to inventory",
  },
  issue_reported: {
    label: "Issue Reported",
    category: "operations",
    description: "Damaged equipment or lab incident logged",
  },
  slot_locked: {
    label: "Slot Reserved",
    category: "booking",
    description: "Contended slot locked for allocation batch",
  },
  slot_released: {
    label: "Slot Released",
    category: "booking",
    description: "Slot lock cleared after allocation decision",
  },
};

export const ENTITY_TYPE_LABELS: Record<string, string> = {
  booking: "Booking",
  resource: "Resource",
  policy: "Policy Version",
  user: "User Account",
  slot: "Time Slot",
  approval: "Approval Request",
  checkout: "Equipment Checkout",
  issue: "Issue Report",
  credit: "Credit Transaction",
};

/**
 * Returns plain-language label and metadata for an audit action.
 */
export function formatAuditAction(action: string): ActionDisplayMeta {
  if (action in AUDIT_ACTION_MAP) {
    return AUDIT_ACTION_MAP[action as AuditAction];
  }
  // Fallback for custom or future actions
  const formatted = action
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
  return {
    label: formatted,
    category: "operations",
    description: `Action: ${formatted}`,
  };
}

/**
 * Returns human-readable label for an entity type.
 */
export function formatEntityType(entityType: string): string {
  const normalized = entityType.toLowerCase();
  return (
    ENTITY_TYPE_LABELS[normalized] ||
    entityType.charAt(0).toUpperCase() + entityType.slice(1)
  );
}

/**
 * Formats actor string for plain-language display.
 */
export function formatActor(actorId: string): { label: string; isSystem: boolean } {
  if (!actorId) return { label: "System Service", isSystem: true };
  const lower = actorId.toLowerCase();
  if (lower === "system" || lower === "service") {
    return { label: "Utilix Engine (System)", isSystem: true };
  }
  if (lower === "ai" || lower === "ai-service") {
    return { label: "Utilix AI Allocation Engine", isSystem: true };
  }
  if (lower === "scheduler" || lower === "cron") {
    return { label: "Automated Scheduler", isSystem: true };
  }
  return { label: actorId, isSystem: false };
}

/**
 * Parses and validates search query parameters into structured AuditFilterCriteria.
 */
export function buildAuditFilter(
  params: Record<string, string | string[] | undefined>
): AuditFilterCriteria {
  const getParam = (key: string): string | undefined => {
    const val = params[key];
    if (Array.isArray(val)) return val[0]?.trim() || undefined;
    if (typeof val === "string") return val.trim() || undefined;
    return undefined;
  };

  const actor = getParam("actor");
  const action = getParam("action");
  const entity_type = getParam("entity_type");
  const entity_id = getParam("entity_id");
  const date_from = getParam("date_from") || getParam("start_date");
  const date_to = getParam("date_to") || getParam("end_date");
  const cursor = getParam("cursor");
  const limitStr = getParam("limit");
  const limit = limitStr ? Math.min(100, Math.max(1, parseInt(limitStr, 10))) : 25;

  const criteria: AuditFilterCriteria = {
    limit: isNaN(limit) ? 25 : limit,
  };

  if (actor) criteria.actor = actor;
  if (action) criteria.action = action;
  if (entity_type) criteria.entity_type = entity_type;
  if (entity_id) criteria.entity_id = entity_id;
  if (date_from) criteria.date_from = date_from;
  if (date_to) criteria.date_to = date_to;
  if (cursor) criteria.cursor = cursor;

  return criteria;
}

/**
 * Checks if an audit log entry satisfies the filter criteria (pure filtering).
 */
export function matchesAuditFilter(
  entry: AuditLogEntry,
  criteria: AuditFilterCriteria
): boolean {
  if (criteria.actor) {
    const target = criteria.actor.toLowerCase();
    const actor = (entry.actor_id || "").toLowerCase();
    if (!actor.includes(target)) {
      return false;
    }
  }

  if (criteria.action) {
    if (entry.action !== criteria.action) {
      return false;
    }
  }

  if (criteria.entity_type) {
    if (entry.entity_type.toLowerCase() !== criteria.entity_type.toLowerCase()) {
      return false;
    }
  }

  if (criteria.entity_id) {
    if (entry.entity_id !== criteria.entity_id) {
      return false;
    }
  }

  if (criteria.date_from) {
    const fromTime = new Date(criteria.date_from).getTime();
    const entryTime = new Date(entry.created_at).getTime();
    if (!isNaN(fromTime) && !isNaN(entryTime) && entryTime < fromTime) {
      return false;
    }
  }

  if (criteria.date_to) {
    const toDate = new Date(criteria.date_to);
    // If only YYYY-MM-DD was provided, include through end of that day
    if (criteria.date_to.length <= 10) {
      toDate.setUTCHours(23, 59, 59, 999);
    }
    const toTime = toDate.getTime();
    const entryTime = new Date(entry.created_at).getTime();
    if (!isNaN(toTime) && !isNaN(entryTime) && entryTime > toTime) {
      return false;
    }
  }

  return true;
}

/**
 * Formats a score breakdown into human-readable metric items.
 */
export interface ScoreDisplayItem {
  key: string;
  label: string;
  value: string;
}

export function formatScoreBreakdown(
  scores: Record<string, unknown> | null | undefined
): ScoreDisplayItem[] {
  if (!scores || typeof scores !== "object") return [];

  const labels: Record<string, string> = {
    usage: "Usage Balance",
    waiting: "Wait Time",
    need: "Declared Need",
    diversity: "Diversity / Equity",
    urgency_factor: "Urgency Weight",
    wait_time: "Wait Time Weight",
    declared_need: "Declared Need Weight",
    total: "Total Score",
    totalScore: "Total Score",
    rank: "Rank Position",
  };

  const items: ScoreDisplayItem[] = [];

  for (const [k, v] of Object.entries(scores)) {
    if (v === null || v === undefined) continue;
    const label = labels[k] || k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    let valueStr = String(v);

    if (typeof v === "number") {
      if (k.toLowerCase().includes("score") || (v >= 0 && v <= 1 && !Number.isInteger(v))) {
        valueStr = `${Math.round(v * 100)}% (${v.toFixed(3)})`;
      } else {
        valueStr = String(Math.round(v * 100) / 100);
      }
    }

    items.push({
      key: k,
      label,
      value: valueStr,
    });
  }

  return items;
}
