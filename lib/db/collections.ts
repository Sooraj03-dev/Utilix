// Utilix — typed collection references and name constants (server-only)
// Owner: A
import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/types";
import type {
  CollectionReference,
  DocumentData,
} from "firebase-admin/firestore";

/** Typed getter for a top-level collection by its key in COLLECTIONS. */
function col(name: string): CollectionReference<DocumentData> {
  return adminDb.collection(name);
}

export const usersCol = () => col(COLLECTIONS.users);
export const departmentsCol = () => col(COLLECTIONS.departments);
export const resourcesCol = () => col(COLLECTIONS.resources);
export const availabilityWindowsCol = () => col(COLLECTIONS.availability_windows);
export const trainingCertsCol = () => col(COLLECTIONS.training_certifications);
export const trainingRequestsCol = () => col(COLLECTIONS.training_requests);
export const bookingsCol = () => col(COLLECTIONS.bookings);
export const bundlesCol = () => col(COLLECTIONS.bundles);
export const waitlistCol = () => col(COLLECTIONS.waitlist);
export const approvalsCol = () => col(COLLECTIONS.approvals);
export const checkoutsCol = () => col(COLLECTIONS.checkouts);
export const issueReportsCol = () => col(COLLECTIONS.issue_reports);
export const creditLedgerCol = () => col(COLLECTIONS.credit_ledger);
export const notificationsCol = () => col(COLLECTIONS.notifications);
export const policiesCol = () => col(COLLECTIONS.policies);
export const auditLogCol = () => col(COLLECTIONS.audit_log);
export const slotLocksCol = () => col(COLLECTIONS.slot_locks);
