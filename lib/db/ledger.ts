// Utilix — credit ledger database helpers (server-only)
// Owner: A
// THE ONLY WAY CREDITS CHANGE: users.credit_balance is updated strictly through this module.
import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import { creditLedgerCol, usersCol } from "./collections";
import { docToEntity, nowISO, nowTimestamp } from "./converters";
import { InsufficientCreditsError } from "./errors";
import { getActivePolicy } from "./policy";
import type {
  CreditLedgerEntry,
  CreditReason,
  Policy,
} from "@/lib/types";
import type {
  DocumentReference,
  Transaction,
} from "firebase-admin/firestore";

export interface CreditState {
  userRef: DocumentReference;
  ledgerRef: DocumentReference;
  userExists: boolean;
  currentBalance: number;
  existingEntry: CreditLedgerEntry | null;
}

export interface ApplyCreditParams {
  userId: string;
  delta: number;
  reason: CreditReason;
  bookingId?: string | null;
  idempotencyKey: string;
}

/**
 * Phase 1: Reads user and ledger state inside a Firestore transaction.
 * All transaction reads MUST happen before any transaction writes.
 */
export async function readCreditState(
  tx: Transaction,
  userId: string,
  idempotencyKey: string
): Promise<CreditState> {
  const userRef = usersCol().doc(userId);
  const ledgerRef = creditLedgerCol().doc(idempotencyKey);

  const [userSnap, ledgerSnap] = await Promise.all([
    tx.get(userRef),
    tx.get(ledgerRef),
  ]);

  if (!userSnap.exists) {
    throw new Error(`User "${userId}" not found`);
  }

  const existingEntry = ledgerSnap.exists
    ? docToEntity<CreditLedgerEntry>(ledgerSnap.id, ledgerSnap.data())
    : null;

  const currentBalance = (userSnap.data()?.credit_balance as number) ?? 0;

  return {
    userRef,
    ledgerRef,
    userExists: true,
    currentBalance,
    existingEntry,
  };
}

/**
 * Phase 2: Writes ledger entry and atomically updates user's credit_balance.
 * If the idempotencyKey was already recorded, this is a strict no-op returning the existing entry.
 * If balance would fall below 0, throws InsufficientCreditsError.
 */
export function writeCredit(
  tx: Transaction,
  state: CreditState,
  params: ApplyCreditParams
): CreditLedgerEntry {
  // Idempotency check: if already processed, return existing entry without mutations
  if (state.existingEntry) {
    return state.existingEntry;
  }

  const newBalance = state.currentBalance + params.delta;
  if (newBalance < 0) {
    throw new InsufficientCreditsError(
      params.userId,
      state.currentBalance,
      params.delta
    );
  }

  const nowTs = nowTimestamp();
  const now = nowISO();

  const firestoreData = {
    user_id: params.userId,
    delta: params.delta,
    reason: params.reason,
    booking_id: params.bookingId ?? null,
    balance_after: newBalance,
    idempotency_key: params.idempotencyKey,
    created_at: nowTs,
  };

  tx.set(state.ledgerRef, firestoreData);
  tx.update(state.userRef, { credit_balance: newBalance });

  return {
    id: params.idempotencyKey,
    user_id: params.userId,
    delta: params.delta,
    reason: params.reason,
    booking_id: params.bookingId ?? null,
    balance_after: newBalance,
    idempotency_key: params.idempotencyKey,
    created_at: now,
  };
}

export interface ApplyCreditOptions extends ApplyCreditParams {
  tx?: Transaction;
}

/**
 * High-level atomic credit mutation helper.
 * If `tx` is provided, runs within that transaction; otherwise initiates a new one.
 */
export async function applyCredit(
  options: ApplyCreditOptions
): Promise<CreditLedgerEntry> {
  if (options.tx) {
    const state = await readCreditState(
      options.tx,
      options.userId,
      options.idempotencyKey
    );
    return writeCredit(options.tx, state, options);
  }

  return await adminDb.runTransaction(async (tx) => {
    const state = await readCreditState(
      tx,
      options.userId,
      options.idempotencyKey
    );
    return writeCredit(tx, state, options);
  });
}

/**
 * Grants monthly credits to a user according to the active or supplied policy.
 * Idempotent per user per calendar month: key = `grant_${userId}_${YYYY-MM}`.
 */
export async function grantMonthlyCredits(
  userId: string,
  policy?: Policy,
  targetDate: Date = new Date()
): Promise<CreditLedgerEntry> {
  const pol = policy ?? (await getActivePolicy());
  const y = targetDate.getUTCFullYear();
  const m = String(targetDate.getUTCMonth() + 1).padStart(2, "0");
  const monthKey = `${y}-${m}`;
  const idempotencyKey = `grant_${userId}_${monthKey}`;

  return await applyCredit({
    userId,
    delta: pol.monthly_credits,
    reason: "monthly_grant",
    bookingId: null,
    idempotencyKey,
  });
}

export interface ReconcileResult {
  recordedBalance: number;
  calculatedBalance: number;
  deltaCount: number;
  matched: boolean;
}

/**
 * Recomputes a user's credit balance by summing all rows in credit_ledger.
 * Compares against users.credit_balance and reports any mismatch.
 */
export async function reconcileBalance(userId: string): Promise<ReconcileResult> {
  const userSnap = await usersCol().doc(userId).get();
  if (!userSnap.exists) {
    throw new Error(`User "${userId}" not found`);
  }

  const recordedBalance = (userSnap.data()?.credit_balance as number) ?? 0;

  const ledgerSnap = await creditLedgerCol()
    .where("user_id", "==", userId)
    .get();

  let calculatedBalance = 0;
  for (const doc of ledgerSnap.docs) {
    const delta = (doc.data()?.delta as number) ?? 0;
    calculatedBalance += delta;
  }

  return {
    recordedBalance,
    calculatedBalance,
    deltaCount: ledgerSnap.docs.length,
    matched: recordedBalance === calculatedBalance,
  };
}
