import type { RoleKey } from "../api/types";
import type { QueryClient } from "@tanstack/react-query";
import { SUPPLIER_PORTAL_ENABLED } from "../featureFlags.ts";
import { clearAllFinancialIntents } from "../api/queries/financialIntentStore.ts";

type Identity = { roles?: unknown; id?: unknown; companyId?: unknown } | null | undefined;

const knownRoles: readonly RoleKey[] = [
  "admin", "company-admin", "head", "accountant", "branch", "procurement", "supplier",
];
export const prototypeRoles: readonly RoleKey[] = [
  "admin", "head", "accountant", "branch", "procurement", "supplier",
];
export const companyRoles: readonly RoleKey[] = [
  "company-admin", "head", "accountant", "branch", "procurement",
];

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const moduleKey = /^[a-z][a-z0-9_-]*$/;

function validStrings(value: unknown, pattern: RegExp): value is string[] {
  return Array.isArray(value) && value.every(id => typeof id === "string"
    && id === id.trim() && pattern.test(id)) && new Set(value).size === value.length;
}

function validGrant(grant: Record<string, unknown>): grant is Record<string, unknown> & {key:RoleKey} {
  if (!knownRoles.includes(grant.key as RoleKey)
    || !["all", "brand", "restaurant", "branch"].includes(grant.scope as string)
    || !validStrings(grant.brandIds,uuid) || !validStrings(grant.restaurantIds,uuid)
    || !validStrings(grant.branchIds,uuid) || !validStrings(grant.moduleKeys,moduleKey)) return false;
  if (grant.key === "accountant" && !(
    (grant.scope === "brand" && grant.brandIds.length > 0)
    || (grant.scope === "restaurant" && grant.restaurantIds.length > 0))) return false;
  // Single-branch grants require 1 branchId and allow at most 1 parent brandId and 1 parent restaurantId.
  if (grant.key === "branch" && (grant.scope !== "branch" || grant.branchIds.length !== 1
    || grant.brandIds.length > 1 || grant.restaurantIds.length > 1)) return false;
  if (grant.key === "admin" && (grant.scope !== "all" || grant.brandIds.length
    || grant.restaurantIds.length || grant.branchIds.length)) return false;
  // TenantBranchResolver ORs all populated hierarchy arrays, regardless of the scope label.
  return grant.scope === "all" || grant.brandIds.length + grant.restaurantIds.length + grant.branchIds.length > 0;
}

/** Only /auth/me role assignments grant a Dashboard role. */
export function grantedRoleKeys(identity: Identity): RoleKey[] {
  if (!identity || !Array.isArray(identity.roles)) return [];
  const granted = new Set<RoleKey>();
  const repeated = new Set<RoleKey>();
  const seen = new Set<RoleKey>();
  let malformed = false;
  for (const value of identity.roles) {
    if (!value || typeof value !== "object" || Array.isArray(value)) { malformed = true; continue; }
    const grant = value as Record<string, unknown>;
    if (!knownRoles.includes(grant.key as RoleKey)) { malformed = true; continue; }
    const key = grant.key as RoleKey;
    if (seen.has(key)) repeated.add(key);
    seen.add(key);
    if (validGrant(grant)) granted.add(key);
    else malformed = true;
  }
  // ResolveTenant uses the first assignment; any repeated key makes that context ambiguous.
  return repeated.size || malformed ? [] : [...granted];
}

/** Include scope and ordering: the first Backend assignment determines tenant context. */
export function financialAccessFingerprint(identity: Identity): string {
  return JSON.stringify([identity?.id ?? null, identity?.companyId ?? null, identity?.roles ?? null]);
}

const accessGenerations = new WeakMap<QueryClient, number>();
const directRequests = new WeakMap<QueryClient, Set<AbortController>>();

export function financialAccessGeneration(queryClient: QueryClient): number {
  return accessGenerations.get(queryClient) ?? 0;
}

/** Direct api.get calls are outside React Query cancellation. */
export function registerFinancialRequest(queryClient: QueryClient) {
  const controller = new AbortController();
  let requests = directRequests.get(queryClient);
  if (!requests) { requests = new Set(); directRequests.set(queryClient,requests); }
  requests.add(controller);
  const release = () => requests.delete(controller);
  return {
    generation:financialAccessGeneration(queryClient),
    signal:controller.signal,
    abort:() => { controller.abort(); release(); },
    release,
  };
}

/** Begin isolation synchronously, before any cancellation can yield to a late response. */
export function invalidateFinancialAccess(queryClient: QueryClient): void {
  accessGenerations.set(queryClient,financialAccessGeneration(queryClient)+1);
  for (const request of directRequests.get(queryClient) ?? []) request.abort();
  directRequests.get(queryClient)?.clear();
}

const sensitivePrefixes: readonly (readonly string[])[] = [
  ["operations"], ["shifts"], ["asset-drafts"], ["accountant"], ["head"],
  ["platform", "accountant"], ["platform", "operations"], ["platform", "head"],
  ["platform", "admin"], ["platform", "erp"], ["platform", "reports"], ["erp"], ["sales"],
  ["expense-invoices"], ["expenses"], ["assets"], ["cash-custody"],
  ["employees"], ["inventory"], ["waste"], ["purchases"], ["pipeline"], ["billing"],
  ["branch"], ["platform", "branch"],
  ["procurement"], ["platform", "procurement"], ["purchase-orders"],
  ["platform", "supplier"],
  ["search"], ["notifications"], ["support"], ["lookups"], ["suppliers"],
  ["company-admin"], ["company-users"], ["company-invitations"],
  ["company-brands"], ["company-modules"], ["company-settings"], ["subscription"],
  ["reports"], ["audit-logs"], ["attachments"], ["reminders"], ["platform", "reminders"],
  ["company"], ["modules"], ["exceptions"], ["exports"],
];

let activeFinancialSession: { actorId: string | null; companyId: string | null } | null = null;

export function setActiveFinancialSession(actorId: string | null, companyId: string | null): void {
  activeFinancialSession = actorId ? { actorId, companyId: companyId ?? null } : null;
}

export function getActiveFinancialSession(): { actorId: string | null; companyId: string | null } | null {
  return activeFinancialSession;
}

export function isFinancialSessionActive(
  queryClient: QueryClient,
  startGeneration: number,
  expectedActorId?: string | null,
  expectedCompanyId?: string | null,
): boolean {
  if (financialAccessGeneration(queryClient) !== startGeneration) {
    return false;
  }
  if (!activeFinancialSession) {
    return false;
  }
  if (expectedActorId && activeFinancialSession.actorId !== expectedActorId) {
    return false;
  }
  if (expectedCompanyId && activeFinancialSession.companyId !== expectedCompanyId) {
    return false;
  }
  return true;
}

/** Cancel before removal so a prior role's late response cannot restore financial cache. */
export async function purgeFinancialQueries(
  queryClient: QueryClient,
  isCurrent: () => boolean = () => true,
): Promise<boolean> {
  invalidateFinancialAccess(queryClient);
  clearAllFinancialIntents();
  setActiveFinancialSession(null, null);
  const predicate = (query: {queryKey: readonly unknown[]}) => sensitivePrefixes.some(prefix =>
    prefix.every((part,index) => query.queryKey[index] === part));
  await queryClient.cancelQueries({predicate});
  if (!isCurrent()) return false;
  queryClient.removeQueries({predicate});
  return true;
}

/** Clear the retired tenant/session client after cancellation; callers publish a fresh client. */
export async function clearRetiredQueryClient(
  queryClient: QueryClient,
  isCurrent: () => boolean = () => true,
): Promise<boolean> {
  invalidateFinancialAccess(queryClient);
  clearAllFinancialIntents();
  setActiveFinancialSession(null, null);
  await queryClient.cancelQueries();
  if (!isCurrent()) return false;
  queryClient.clear();
  return true;
}

export function hasRoleGrant(identity: Identity, ...roles: RoleKey[]): boolean {
  const granted = grantedRoleKeys(identity);
  return roles.some(role => granted.includes(role));
}

export function chooseGrantedRole(
  identity: Identity,
  supported: readonly RoleKey[],
  requested?: unknown,
  supplierPortalEnabled = SUPPLIER_PORTAL_ENABLED,
): RoleKey | null {
  const granted = grantedRoleKeys(identity).filter(role => role !== "supplier" || supplierPortalEnabled);
  if (typeof requested === "string" && supported.includes(requested as RoleKey)
    && granted.includes(requested as RoleKey)) return requested as RoleKey;
  return granted.find(role => supported.includes(role)) ?? null;
}

export function canOpenDashboard(identity: Identity, slug: string): boolean {
  if (slug === "asab/ASABPrototype") return chooseGrantedRole(identity, prototypeRoles) !== null;
  if (slug === "asab/CompanyDashboard") return chooseGrantedRole(identity, companyRoles) !== null;
  return false;
}

export function preferredDashboard(identity: Identity): string | null {
  const role = grantedRoleKeys(identity).find(role => role !== "supplier" || SUPPLIER_PORTAL_ENABLED);
  if (!role) return null;
  return role === "admin" || role === "supplier" ? "asab/ASABPrototype" : "asab/CompanyDashboard";
}

export function pageForRole(role: RoleKey | null, page: string, fallback: string): string {
  if (!role) return fallback;
  const prefix: Record<RoleKey, string> = {
    admin: "admin-", "company-admin": "ca-", head: "head-", accountant: "acc-",
    branch: "branch-", procurement: "proc-", supplier: "sup-",
  };
  return page.startsWith(prefix[role]) ? page : fallback;
}

export function canRunAccountantOperations(identity: Identity, activeRole: RoleKey | null): boolean {
  return (activeRole === "accountant" || activeRole === "head") && hasRoleGrant(identity, activeRole);
}

export function canRunShiftHistory(identity: Identity, activeRole: RoleKey | null): boolean {
  return canRunAccountantOperations(identity, activeRole);
}

export function canRunShiftConfigs(identity: Identity, activeRole: RoleKey | null): boolean {
  return activeRole === "accountant" && hasRoleGrant(identity, "accountant");
}
