import type { RoleKey } from "../api/types";

type Identity = { roles?: unknown } | null | undefined;

const knownRoles: readonly RoleKey[] = [
  "admin", "company-admin", "head", "accountant", "branch", "procurement", "supplier",
];
export const prototypeRoles: readonly RoleKey[] = [
  "admin", "head", "accountant", "branch", "procurement", "supplier",
];
export const companyRoles: readonly RoleKey[] = [
  "company-admin", "head", "accountant", "branch", "procurement",
];

function stringIds(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(id => typeof id === "string" && id.length > 0);
}

/** Only /auth/me role assignments grant a Dashboard role. */
export function grantedRoleKeys(identity: Identity): RoleKey[] {
  if (!identity || !Array.isArray(identity.roles)) return [];
  const granted = new Set<RoleKey>();
  for (const value of identity.roles) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const grant = value as Record<string, unknown>;
    if (!knownRoles.includes(grant.key as RoleKey)
      || !["all", "brand", "restaurant", "branch"].includes(grant.scope as string)
      || !stringIds(grant.brandIds) || !stringIds(grant.restaurantIds)
      || !stringIds(grant.branchIds) || !stringIds(grant.moduleKeys)) continue;
    if (grant.scope !== "all"
      && grant.brandIds.length + grant.restaurantIds.length + grant.branchIds.length === 0) continue;
    granted.add(grant.key as RoleKey);
  }
  return [...granted];
}

export function hasRoleGrant(identity: Identity, ...roles: RoleKey[]): boolean {
  const granted = grantedRoleKeys(identity);
  return roles.some(role => granted.includes(role));
}

export function chooseGrantedRole(
  identity: Identity,
  supported: readonly RoleKey[],
  requested?: unknown,
): RoleKey | null {
  const granted = grantedRoleKeys(identity);
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
  const role = grantedRoleKeys(identity)[0];
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
