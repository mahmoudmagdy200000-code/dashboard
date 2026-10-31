import type { Plan, Subscription, CompanyUser, CompanyInvitation } from "./queries/companyAdmin";
import type { LookupRow } from "./types";

export class ContractMismatchError extends Error {
  readonly received?: unknown;
  constructor(message: string, received?: unknown) {
    super(message);
    this.name = "ContractMismatchError";
    this.received = received;
  }
}

/**
 * Safely extracts an array from either a raw array or a list envelope { data: Array }.
 * Throws ContractMismatchError when the shape does not conform, rather than silently
 * returning mock data or masking an API failure.
 */
export function safeArray<T>(payload: unknown, context = "response"): T[] {
  if (payload === null || payload === undefined) {
    return [];
  }
  if (Array.isArray(payload)) {
    return payload as T[];
  }
  if (
    typeof payload === "object" &&
    payload !== null &&
    "data" in payload &&
    Array.isArray((payload as { data: unknown }).data)
  ) {
    return (payload as { data: T[] }).data;
  }
  throw new ContractMismatchError(
    `Contract mismatch in ${context}: expected array or { data: Array }, received ${typeof payload}`,
    payload,
  );
}

/**
 * Normalizes GET /plans response according to backend contract.
 * Backend emits { data: [ { id, code, nameAr, nameEn, features, isCurrent, ... } ] }.
 */
export function parsePlansResponse(payload: unknown): Plan[] {
  const rawList = safeArray<any>(payload, "GET /plans");
  return rawList.map((p) => {
    const nameAr = p.nameAr ?? p.name_ar;
    const nameEn = p.nameEn ?? p.name_en;
    const name = nameAr || p.name || nameEn || p.code || "";
    const rawFeatures = Array.isArray(p.features) ? p.features : [];
    const stringFeatures: string[] = rawFeatures.map((f: any) =>
      typeof f === "string" ? f : (f?.labelAr || f?.labelEn || "")
    ).filter(Boolean);
    return {
      id: String(p.id ?? p.code ?? ""),
      code: p.code ?? "",
      name,
      nameAr,
      nameEn,
      priceMonthlyHalalas: p.priceMonthlyHalalas ?? p.price_monthly ?? null,
      priceAnnualHalalas: p.priceAnnualHalalas ?? p.price_annual ?? null,
      annualDiscountPct: p.annualDiscountPct ?? p.annual_discount_pct,
      features: stringFeatures,
      featuresAr: Array.isArray(p.featuresAr) ? p.featuresAr : undefined,
      featureObjects: rawFeatures.every((f: any) => typeof f === "object" && f !== null) ? rawFeatures : undefined,
      maxBranches: p.maxBranches ?? p.max_branches ?? null,
      maxUsers: p.maxUsers ?? p.max_users ?? null,
      maxBrands: p.maxBrands ?? p.max_brands ?? null,
      storageGb: p.storageGb ?? p.storage_gb ?? null,
      isCurrent: Boolean(p.isCurrent ?? p.is_current),
    };
  });
}

/**
 * Normalizes GET /company/me/subscription response.
 * Backend emits { subscription: {...}, plan: {...}, usage: {...}, nextInvoice: {...} }
 * or a flat Subscription object.
 */
export function parseSubscriptionResponse(payload: unknown): (Subscription & Record<string, any>) | null {
  if (payload === null || payload === undefined) {
    return null;
  }
  if (typeof payload !== "object") {
    throw new ContractMismatchError("Expected object for subscription response", payload);
  }

  const obj = payload as Record<string, any>;

  // Handle explicit NOT_FOUND / error envelope payloads
  if (
    obj.code === "NOT_FOUND" ||
    obj.error === "NOT_FOUND" ||
    (typeof obj.message === "string" && obj.message.includes("No subscription"))
  ) {
    return null;
  }

  // Handle explicit null subscription
  if ("subscription" in obj && obj.subscription === null) {
    return null;
  }

  const isNested = Boolean(obj.subscription && typeof obj.subscription === "object");
  const s = isNested ? obj.subscription : obj;
  const p = isNested ? obj.plan : obj.plan;
  const u = isNested ? obj.usage : obj.usage;
  const inv = isNested ? obj.nextInvoice : obj.nextInvoice;

  // If there is no identifier and no plan, this is an empty payload, not an active subscription
  if (!s.id && !s.planId && !s.plan_id && !p?.id && !s.status) {
    return null;
  }

  const planName = p?.nameAr || p?.name || p?.nameEn || s.planName || "";

  return {
    ...s,
    id: String(s.id ?? ""),
    companyId: String(s.companyId ?? s.company_id ?? ""),
    planId: String(s.planId ?? s.plan_id ?? p?.id ?? ""),
    planCode: p?.code ?? s.planCode,
    planName,
    planNameAr: p?.nameAr,
    planNameEn: p?.nameEn,
    status: s.status ?? "unknown",
    billingCycle: s.billingCycle ?? s.billing_cycle ?? "annual",
    currentPeriodStart: s.currentPeriodStart ?? s.current_period_start,
    currentPeriodEnd: s.currentPeriodEnd ?? s.current_period_end ?? "",
    trialEndsAt: s.trialEndsAt ?? s.trial_ends_at,
    cancelAtPeriodEnd: Boolean(s.cancelAtPeriodEnd ?? s.cancel_at_period_end),
    cancelledAt: s.cancelledAt ?? s.cancelled_at,
    daysRemaining: s.daysRemaining ?? s.days_remaining,
    autoRenew: Boolean(s.autoRenew ?? s.auto_renew),
    contractNumber: s.contractNumber ?? s.contract_number,
    usage: u ?? s.usage ?? {},
    nextInvoice: inv ?? s.nextInvoice,
    // Preserve nested structures
    subscription: s,
    plan: p,
  };
}

/**
 * Checks whether the subscription payload represents a provisioned, active/trialing subscription.
 */
export function hasActiveSubscription(sub: unknown): boolean {
  if (!sub || typeof sub !== "object") return false;
  const s = sub as Record<string, any>;
  if (!s.id || s.id === "") return false;
  if (s.status === "cancelled" || s.status === "inactive" || s.status === "not_found") return false;
  if (s.status === "active" || s.status === "trialing") return true;
  return Boolean(s.planName || s.planId);
}

/**
 * Normalizes dropdown lookups from GET /company/me/lookups/:type or GET /lookups/:type.
 * Handles both { data: [...] } and bare array.
 */
export function parseLookupsResponse(payload: unknown, type = "lookup"): LookupRow[] {
  const rawList = safeArray<any>(payload, `lookups/${type}`);
  return rawList.map((row) => ({
    ...row,
    id: String(row.id ?? ""),
    name: String(row.name ?? row.nameAr ?? row.nameEn ?? row.id ?? ""),
    nameAr: row.nameAr,
    nameEn: row.nameEn,
    parentId: row.parentId ?? row.restaurantId ?? row.brandId ?? null,
  }));
}

/**
 * Normalizes GET /company/me/users response.
 */
export function parseUsersResponse(payload: unknown): CompanyUser[] {
  const rawList = safeArray<any>(payload, "GET /company/me/users");
  return rawList.map((u) => ({
    ...u,
    id: String(u.id ?? ""),
    name: String(u.name ?? ""),
    email: String(u.email ?? ""),
    roleKey: String(u.roleKey ?? u.role_key ?? u.role ?? ""),
    roleLabel: u.roleLabel ?? u.role_label,
    branchIds: Array.isArray(u.branchIds) ? u.branchIds : undefined,
    brandIds: Array.isArray(u.brandIds) ? u.brandIds : undefined,
    branchName: u.branchName ?? u.branch_name,
    status: u.status === "active" ? "active" : u.status === "invited" ? "invited" : "inactive",
    lastActiveAt: u.lastActiveAt ?? u.last_active_at,
  }));
}

/**
 * Normalizes GET /company/invitations response.
 */
export function parseInvitationsResponse(payload: unknown): CompanyInvitation[] {
  const rawList = safeArray<any>(payload, "GET /company/invitations");
  return rawList.map((inv) => ({
    ...inv,
    id: String(inv.id ?? ""),
    email: String(inv.email ?? ""),
    roleKey: String(inv.roleKey ?? inv.role_key ?? inv.role ?? ""),
    status: inv.status ?? "pending",
    createdAt: inv.createdAt ?? inv.created_at ?? "",
    expiresAt: inv.expiresAt ?? inv.expires_at,
  }));
}
