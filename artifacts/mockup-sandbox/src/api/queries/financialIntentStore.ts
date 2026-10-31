/**
 * Durable, Session-Scoped Financial Intent Store (D02, D06, D07, D17, D18)
 *
 * Requirements:
 * 1. Preserves in-flight and timed-out financial intents across F5/page reload within the active tab.
 * 2. Scoped strictly to (companyId, actorId, scope, operationId) so no intent can be hijacked or
 *    replayed across different user sessions or company contexts.
 * 3. Never stores sensitive credentials, authorization tokens, or raw file payloads in persistent storage;
 *    only records safe verification metadata (hashes, names, amounts, references, IDs).
 * 4. Unifies intent lookup across distinct component trees (e.g. AccCash vs CompanyDashboard) so
 *    a single consistent intent is maintained without silent duplicate key generation.
 * 5. Cleansed automatically upon logout, company switch, or financial cache purge via roleAccess.
 */

import { type FinancialIntent, createFinancialIntent } from "../idempotencyIntent.ts";

const STORAGE_PREFIX = "asab_financial_intent:";

// Memory store acts as the primary cache and fallback for non-browser environments (e.g. Node.js unit tests)
const memoryStore = new Map<string, FinancialIntent<any>>();

function buildStoreKey(scope: string, id: string, actorId?: string, companyId?: string): string {
  const safeCompany = companyId?.trim() || "default_company";
  const safeActor = actorId?.trim() || "anonymous_actor";
  return `${STORAGE_PREFIX}${safeCompany}:${safeActor}:${scope}:${id}`;
}

function getSessionStorage(): Storage | null {
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      return window.sessionStorage;
    }
  } catch {
    // Access denied in restricted iframes or non-DOM environments
  }
  return null;
}

interface StoredIntentEnvelope<T> {
  idempotencyKey: string;
  actorId?: string;
  companyId?: string;
  scope: string;
  id: string;
  payload: T;
  status: "idle" | "in_flight" | "timed_out" | "resolved" | "conflict";
  attemptCount: number;
  savedAt: number;
}

export function getUnconfirmedIntent<T>(
  scope: string,
  id: string,
  actorId?: string,
  companyId?: string,
): FinancialIntent<T> | null {
  const key = buildStoreKey(scope, id, actorId, companyId);

  // 1. Check memory cache first
  const cached = memoryStore.get(key);
  if (cached) {
    if (actorId && cached.actorId && cached.actorId !== actorId) {
      memoryStore.delete(key);
      return null;
    }
    return cached as FinancialIntent<T>;
  }

  // 2. Check sessionStorage for reload recovery (F5)
  const storage = getSessionStorage();
  if (storage) {
    try {
      const raw = storage.getItem(key);
      if (raw) {
        const envelope: StoredIntentEnvelope<T> = JSON.parse(raw);
        // Verify session and actor boundaries
        if (actorId && envelope.actorId && envelope.actorId !== actorId) {
          storage.removeItem(key);
          return null;
        }
        if (companyId && envelope.companyId && envelope.companyId !== companyId) {
          storage.removeItem(key);
          return null;
        }

        // Only restore unconfirmed intents (in_flight or timed_out)
        if (envelope.status === "resolved") {
          storage.removeItem(key);
          return null;
        }

        // Reconstruct full FinancialIntent
        const restored: FinancialIntent<T> = {
          idempotencyKey: envelope.idempotencyKey,
          actorId: envelope.actorId,
          payload: envelope.payload,
          serializedPayload: JSON.stringify(envelope.payload),
          status: envelope.status === "in_flight" ? "timed_out" : envelope.status, // in-flight recovered from reload is timed_out until reconciled
          attemptCount: Math.max(1, envelope.attemptCount),
        };

        memoryStore.set(key, restored);
        return restored;
      }
    } catch {
      // Corrupted storage entry, remove safely
      try {
        storage.removeItem(key);
      } catch {}
    }
  }

  return null;
}

export function setUnconfirmedIntent<T>(
  scope: string,
  id: string,
  intent: FinancialIntent<T>,
  actorId?: string,
  companyId?: string,
): void {
  const key = buildStoreKey(scope, id, actorId ?? intent.actorId, companyId);
  memoryStore.set(key, intent);

  const storage = getSessionStorage();
  if (storage) {
    try {
      const envelope: StoredIntentEnvelope<T> = {
        idempotencyKey: intent.idempotencyKey,
        actorId: actorId ?? intent.actorId,
        companyId,
        scope,
        id,
        payload: intent.payload,
        status: intent.status,
        attemptCount: intent.attemptCount,
        savedAt: Date.now(),
      };
      storage.setItem(key, JSON.stringify(envelope));
    } catch {
      // Ignore quota errors gracefully
    }
  }
}

export function removeUnconfirmedIntent(
  scope: string,
  id: string,
  actorId?: string,
  companyId?: string,
): void {
  const key = buildStoreKey(scope, id, actorId, companyId);
  memoryStore.delete(key);

  const storage = getSessionStorage();
  if (storage) {
    try {
      storage.removeItem(key);
    } catch {}
  }
}

/**
 * Purges all recorded financial intents from both memory and sessionStorage.
 * Invoked during logout, role changes, or company context switching to enforce
 * strict tenant and financial isolation (D18).
 */
export function clearAllFinancialIntents(): void {
  memoryStore.clear();

  const storage = getSessionStorage();
  if (storage) {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (k && k.startsWith(STORAGE_PREFIX)) {
          keysToRemove.push(k);
        }
      }
      for (const k of keysToRemove) {
        storage.removeItem(k);
      }
    } catch {}
  }
}
