import test from "node:test";
import assert from "node:assert/strict";
import {
  parsePlansResponse,
  parseSubscriptionResponse,
  parseLookupsResponse,
  parseUsersResponse,
  parseInvitationsResponse,
  safeArray,
  ContractMismatchError,
} from "./responseContracts.ts";

test("DB-R01: safeArray unwraps array from bare array, { data: array }, or throws on mismatch", () => {
  assert.deepEqual(safeArray([1, 2, 3], "test"), [1, 2, 3]);
  assert.deepEqual(safeArray({ data: [1, 2, 3] }, "test"), [1, 2, 3]);
  assert.deepEqual(safeArray(null, "test"), []);
  assert.deepEqual(safeArray(undefined, "test"), []);

  assert.throws(
    () => safeArray({ invalid: true }, "test"),
    (err: any) => err instanceof ContractMismatchError,
    "Non-array object without data array must throw ContractMismatchError",
  );
  assert.throws(
    () => safeArray(123, "test"),
    (err: any) => err instanceof ContractMismatchError,
    "Primitive must throw ContractMismatchError",
  );
});

test("DB-R01: parsePlansResponse handles nested { data: [...] } and bare array with contract fields", () => {
  const backendPayload = {
    data: [
      {
        id: "plan-1",
        code: "professional",
        nameAr: "المحترف",
        nameEn: "Professional",
        priceMonthlyHalalas: 150000,
        priceAnnualHalalas: 1500000,
        annualDiscountPct: 17,
        features: [
          { labelAr: "دعم فني 24/7", labelEn: "24/7 Support", isHighlighted: true },
          { labelAr: "فروع غير محدودة", labelEn: "Unlimited Branches", isHighlighted: false },
        ],
        maxBranches: 10,
        maxUsers: 25,
        storageGb: 50,
        isCurrent: true,
      },
      {
        id: "plan-2",
        name: "Enterprise Custom",
        priceMonthlyHalalas: null,
        priceAnnualHalalas: null,
        features: ["Custom SLA", "Dedicated Manager"],
        isCurrent: false,
      },
    ],
  };

  const plans = parsePlansResponse(backendPayload);
  assert.equal(plans.length, 2);

  const p1 = plans[0];
  assert.equal(p1.id, "plan-1");
  assert.equal(p1.code, "professional");
  assert.equal(p1.nameAr, "المحترف");
  assert.equal(p1.nameEn, "Professional");
  assert.equal(p1.name, "المحترف");
  assert.equal(p1.priceMonthlyHalalas, 150000);
  assert.equal(p1.priceAnnualHalalas, 1500000);
  assert.equal(p1.isCurrent, true);
  assert.equal(p1.features?.length, 2);

  const p2 = plans[1];
  assert.equal(p2.id, "plan-2");
  assert.equal(p2.name, "Enterprise Custom");
  assert.equal(p2.priceMonthlyHalalas, null);
  assert.equal(p2.isCurrent, false);
});

test("DB-R01: parseSubscriptionResponse handles nested backend format and flat format", () => {
  const nestedBackendPayload = {
    subscription: {
      id: "sub-123",
      companyId: "comp-456",
      planId: "plan-1",
      status: "active",
      billingCycle: "annual",
      currentPeriodStart: "2026-01-01T00:00:00Z",
      currentPeriodEnd: "2027-01-01T00:00:00Z",
      trialEndsAt: null,
      daysRemaining: 67,
      autoRenew: true,
      contractNumber: "CTR-2026-001",
    },
    plan: {
      id: "plan-1",
      code: "professional",
      nameAr: "المحترف",
      nameEn: "Professional",
    },
    usage: {
      branches: { used: 3, max: 10 },
      users: { used: 8, max: 25 },
      storage: { used: 12, max: 50 },
    },
    nextInvoice: {
      issueDate: "2027-01-01T00:00:00Z",
      amountHalalas: 1500000,
      currency: "SAR",
    },
  };

  const normalized = parseSubscriptionResponse(nestedBackendPayload);
  assert.ok(normalized);
  assert.equal(normalized.id, "sub-123");
  assert.equal(normalized.companyId, "comp-456");
  assert.equal(normalized.status, "active");
  assert.equal(normalized.billingCycle, "annual");
  assert.equal(normalized.currentPeriodEnd, "2027-01-01T00:00:00Z");
  assert.equal(normalized.daysRemaining, 67);
  assert.equal(normalized.planName, "المحترف");
  assert.equal(normalized.planCode, "professional");
  assert.equal(normalized.usage?.branches?.used, 3);
  assert.equal(normalized.usage?.branches?.max, 10);
  assert.equal(normalized.nextInvoice?.amountHalalas, 1500000);

  // Flat format
  const flatPayload = {
    id: "sub-999",
    companyId: "comp-456",
    planId: "plan-basic",
    planName: "Basic",
    status: "active",
    billingCycle: "monthly",
    currentPeriodEnd: "2026-11-01T00:00:00Z",
  };
  const flatNormalized = parseSubscriptionResponse(flatPayload);
  assert.ok(flatNormalized);
  assert.equal(flatNormalized.id, "sub-999");
  assert.equal(flatNormalized.planName, "Basic");
  assert.equal(flatNormalized.billingCycle, "monthly");
});

test("DB-R01: parseLookupsResponse unwraps and normalizes brand/branch lookup contracts", () => {
  const brandsPayload = {
    data: [
      { id: "b1", name: "Al Baik", abbr: "AB", color: "#E11D48" },
      { id: "b2", name: "Herfy", abbr: "HF", color: "#2563EB" },
    ],
  };

  const lookups = parseLookupsResponse(brandsPayload, "brands");
  assert.equal(lookups.length, 2);
  assert.equal(lookups[0].id, "b1");
  assert.equal(lookups[0].name, "Al Baik");
  assert.equal((lookups[0] as any).color, "#E11D48");

  const branchesPayload = [
    { id: "br1", name: "Olaya Branch", restaurantId: "r1" },
    { id: "br2", name: "Tahlia Branch", restaurantId: "r1" },
  ];
  const branchLookups = parseLookupsResponse(branchesPayload, "branches");
  assert.equal(branchLookups.length, 2);
  assert.equal(branchLookups[0].id, "br1");
  assert.equal(branchLookups[0].name, "Olaya Branch");
});

test("DB-R01: parseUsersResponse and parseInvitationsResponse unwrap data safely", () => {
  const usersPayload = {
    data: [
      { id: "u1", name: "Ahmed", email: "ahmed@example.com", roleKey: "accountant", status: "active" },
    ],
  };
  const users = parseUsersResponse(usersPayload);
  assert.equal(users.length, 1);
  assert.equal(users[0].name, "Ahmed");

  const invitesPayload = {
    data: [
      { id: "inv1", email: "new@example.com", roleKey: "branch", status: "pending", createdAt: "2026-10-25" },
    ],
  };
  const invites = parseInvitationsResponse(invitesPayload);
  assert.equal(invites.length, 1);
  assert.equal(invites[0].email, "new@example.com");
});
