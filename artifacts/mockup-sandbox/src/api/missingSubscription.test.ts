import test from "node:test";
import assert from "node:assert/strict";
import {
  parseSubscriptionResponse,
  hasActiveSubscription,
  parsePlansResponse,
} from "./responseContracts.ts";

test("DB-R03 RED: parseSubscriptionResponse returns null for NOT_FOUND payload", () => {
  const notFoundPayload = {
    code: "NOT_FOUND",
    message: "No subscription for company",
    message_ar: "لا يوجد اشتراك للشركة",
    requestId: "req_R0MG7UIEQ2TFJ",
  };

  const result = parseSubscriptionResponse(notFoundPayload);
  assert.equal(result, null, "NOT_FOUND response must return null instead of fabricating an active plan");
});

test("DB-R03 RED: parseSubscriptionResponse returns null for empty or missing payloads", () => {
  assert.equal(parseSubscriptionResponse(null), null);
  assert.equal(parseSubscriptionResponse(undefined), null);
  assert.equal(parseSubscriptionResponse({}), null);
  assert.equal(parseSubscriptionResponse({ subscription: null }), null);
});

test("DB-R03 RED: parseSubscriptionResponse does not fabricate 'Professional' or 'active' when fields are missing", () => {
  const partial = {
    id: "sub-1",
    status: "trialing",
    // planName intentionally missing
  };
  const result = parseSubscriptionResponse(partial);
  assert.ok(result);
  assert.notEqual(result.planName, "Professional", "Must not fabricate 'Professional' if missing");
  assert.equal(result.status, "trialing");
});

test("DB-R03 RED: hasActiveSubscription returns false when subscription is null, empty, or cancelled", () => {
  assert.equal(hasActiveSubscription(null), false);
  assert.equal(hasActiveSubscription(undefined), false);
  assert.equal(hasActiveSubscription({}), false);
  assert.equal(hasActiveSubscription({ id: "", status: "active" }), false);
  assert.equal(hasActiveSubscription({ id: "sub-1", status: "cancelled" }), false);
  assert.equal(hasActiveSubscription({ id: "sub-1", status: "inactive" }), false);

  assert.equal(hasActiveSubscription({ id: "sub-1", status: "active", planName: "Starter" }), true);
  assert.equal(hasActiveSubscription({ id: "sub-1", status: "trialing", planName: "Pro" }), true);
});
