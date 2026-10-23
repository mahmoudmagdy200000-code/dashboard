import type { RoleKey } from "../../api/types";

/** Display capability only; Backend must enforce grants and tenant/branch scope. */
export function hasCompanySharedApi(role?: string | null): boolean {
  return ["company-admin", "head", "accountant", "branch", "procurement"].includes(role ?? "");
}

/** Navigate only to an existing visible menu page, never to a server-provided URL. */
export function sharedSearchPage(
  role: RoleKey | undefined,
  result: { type: string; moduleKey?: string },
  pages: readonly string[],
): string | null {
  if (!hasCompanySharedApi(role)) return null;
  let page: string | undefined;
  if ((role === "head" || role === "accountant") && result.type === "ops"
    && ["sales", "expenses", "purchases", "inventory", "waste", "assets", "shifts", "employees", "cash"].includes(result.moduleKey ?? "")) {
    page = `${role === "head" ? "head" : "acc"}-${result.moduleKey}`;
  } else {
    const routes: Record<string, Record<string, string>> = {
      "company-admin": { branches: "ca-branches", users: "ca-users" },
      procurement: { suppliers: "proc-suppliers", items: "proc-items" },
      branch: { suppliers: "branch-suppliers", items: "branch-items" },
    };
    page = role ? routes[role]?.[result.type] : undefined;
  }
  return page && pages.includes(page) ? page : null;
}

export function sharedNotificationPage(link: unknown, pages: readonly string[]): string | null {
  if (typeof link !== "string") return null;
  const match = /^(?:#?\/)?([a-z]+-[a-z-]+)$/.exec(link);
  return match && pages.includes(match[1]) ? match[1] : null;
}
