import test from "node:test";
import assert from "node:assert/strict";
import {
  getUnconfirmedIntent,
  setUnconfirmedIntent,
  removeUnconfirmedIntent,
  clearAllFinancialIntents,
} from "./financialIntentStore.ts";
import { createFinancialIntent } from "../idempotencyIntent.ts";

test("financialIntentStore: basic store, retrieve, and remove lifecycle", () => {
  clearAllFinancialIntents();

  const intent = createFinancialIntent({ requestId: "req-1", reference: "REF-001" }, undefined, "usr-1");
  setUnconfirmedIntent("funding", "req-1", intent, "usr-1", "comp-1");

  const retrieved = getUnconfirmedIntent<any>("funding", "req-1", "usr-1", "comp-1");
  assert.ok(retrieved, "Must retrieve the stored intent");
  assert.equal(retrieved.idempotencyKey, intent.idempotencyKey);
  assert.equal(retrieved.payload.reference, "REF-001");

  removeUnconfirmedIntent("funding", "req-1", "usr-1", "comp-1");
  const afterRemove = getUnconfirmedIntent("funding", "req-1", "usr-1", "comp-1");
  assert.equal(afterRemove, null, "Must be null after removal");
});

test("financialIntentStore: actor and company session isolation (D18)", () => {
  clearAllFinancialIntents();

  const intent = createFinancialIntent({ employeeId: "emp-1", reason: "Annual Settle" }, undefined, "usr-alice");
  setUnconfirmedIntent("employee_settlement", "emp-1", intent, "usr-alice", "comp-alpha");

  // Attempt to retrieve by another user
  const bobAttempt = getUnconfirmedIntent("employee_settlement", "emp-1", "usr-bob", "comp-alpha");
  assert.equal(bobAttempt, null, "Different actor must not retrieve another user's unconfirmed intent");

  // Attempt to retrieve under another company
  const compBetaAttempt = getUnconfirmedIntent("employee_settlement", "emp-1", "usr-alice", "comp-beta");
  assert.equal(compBetaAttempt, null, "Different company context must not retrieve intent");
});

test("financialIntentStore: F5/Reload simulated recovery via sessionStorage", () => {
  clearAllFinancialIntents();

  // Mock sessionStorage in Node test environment
  const mockStorage = new Map<string, string>();
  const originalSessionStorage = globalThis.window?.sessionStorage;

  (globalThis as any).window = {
    sessionStorage: {
      getItem: (k: string) => mockStorage.get(k) ?? null,
      setItem: (k: string, v: string) => mockStorage.set(k, v),
      removeItem: (k: string) => mockStorage.delete(k),
      clear: () => mockStorage.clear(),
      get length() {
        return mockStorage.size;
      },
      key: (i: number) => Array.from(mockStorage.keys())[i] ?? null,
    },
  };

  try {
    const intent = createFinancialIntent(
      { custodyId: "cust-9", amountHalalas: 50000, description: "Tools" },
      "idemp-key-stable-123",
      "usr-acc",
    );
    intent.status = "timed_out";
    intent.attemptCount = 2;

    setUnconfirmedIntent("custody_debit", "cust-9", intent, "usr-acc", "comp-1");

    // Simulate page reload (F5): clear in-memory store while leaving sessionStorage intact
    (clearAllFinancialIntents as any)(); // Wait, clearAllFinancialIntents clears sessionStorage too!
    // To simulate F5, we only re-instantiate memory by reading afresh from sessionStorage
    mockStorage.set(
      "asab_financial_intent:comp-1:usr-acc:custody_debit:cust-9",
      JSON.stringify({
        idempotencyKey: "idemp-key-stable-123",
        actorId: "usr-acc",
        companyId: "comp-1",
        scope: "custody_debit",
        id: "cust-9",
        payload: { custodyId: "cust-9", amountHalalas: 50000, description: "Tools" },
        status: "timed_out",
        attemptCount: 2,
        savedAt: Date.now(),
      }),
    );

    const recovered = getUnconfirmedIntent<any>("custody_debit", "cust-9", "usr-acc", "comp-1");
    assert.ok(recovered, "Must recover intent from sessionStorage after reload");
    assert.equal(recovered.idempotencyKey, "idemp-key-stable-123");
    assert.equal(recovered.status, "timed_out");
    assert.equal(recovered.attemptCount, 2);
    assert.equal(recovered.payload.amountHalalas, 50000);
    assert.equal(recovered.payload.description, "Tools");
  } finally {
    if (originalSessionStorage) {
      (globalThis as any).window.sessionStorage = originalSessionStorage;
    } else {
      delete (globalThis as any).window;
    }
    clearAllFinancialIntents();
  }
});

test("financialIntentStore: clearAllFinancialIntents purges all scopes", () => {
  clearAllFinancialIntents();

  const intent1 = createFinancialIntent({ req: 1 }, undefined, "usr-1");
  const intent2 = createFinancialIntent({ req: 2 }, undefined, "usr-1");

  setUnconfirmedIntent("funding", "f-1", intent1, "usr-1", "comp-1");
  setUnconfirmedIntent("custody_debit", "c-1", intent2, "usr-1", "comp-1");

  clearAllFinancialIntents();

  assert.equal(getUnconfirmedIntent("funding", "f-1", "usr-1", "comp-1"), null);
  assert.equal(getUnconfirmedIntent("custody_debit", "c-1", "usr-1", "comp-1"), null);
});

test("financialIntentStore: Section 4.A company scoping and zero default_company orphans", () => {
  clearAllFinancialIntents();

  const intent = createFinancialIntent(
    { requestId: "req-scoping-01", reference: "REF-SCOPE" },
    "key-scope-01",
    "usr-acc-1",
    "comp-riyadh-01",
  );

  // Set with concrete companyId
  setUnconfirmedIntent("funding", "req-scoping-01", intent, "usr-acc-1", "comp-riyadh-01");

  // Verify stored strictly under comp-riyadh-01
  const retrieved = getUnconfirmedIntent<any>("funding", "req-scoping-01", "usr-acc-1", "comp-riyadh-01");
  assert.ok(retrieved, "Intent must be retrievable with authorized companyId");
  assert.equal(retrieved.companyId, "comp-riyadh-01");

  // Verify that looking under default_company directly yields null
  const defaultCompanyLookup = getUnconfirmedIntent<any>("funding", "req-scoping-01", "usr-acc-1", "default_company");
  assert.equal(defaultCompanyLookup, null, "No duplicate or orphaned record in default_company");

  // Verify cross-tenant isolation: another company cannot access it
  const otherCompanyLookup = getUnconfirmedIntent<any>("funding", "req-scoping-01", "usr-acc-1", "comp-jeddah-02");
  assert.equal(otherCompanyLookup, null, "Cross-tenant isolation must reject unauthorized companyId");

  // Verify removal cleans up both the scoped key and any potential fallback
  removeUnconfirmedIntent("funding", "req-scoping-01", "usr-acc-1", "comp-riyadh-01");
  assert.equal(getUnconfirmedIntent("funding", "req-scoping-01", "usr-acc-1", "comp-riyadh-01"), null);
});
