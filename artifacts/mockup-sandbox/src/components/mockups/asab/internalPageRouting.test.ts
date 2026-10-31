import test from "node:test";
import assert from "node:assert/strict";
import {
  readInternalPageRoute,
  resolveInternalPage,
  buildInternalPageUrl,
  isValidPageSlug,
} from "./internalPageRouting.ts";

test("DB-R05: isValidPageSlug allows valid slugs and rejects sensitive or malicious inputs", () => {
  assert.equal(isValidPageSlug("ca-users"), true);
  assert.equal(isValidPageSlug("ca-dashboard"), true);
  assert.equal(isValidPageSlug("head-shifts"), true);
  assert.equal(isValidPageSlug("acc-dashboard"), true);
  assert.equal(isValidPageSlug("sup-new-orders"), true);

  // Reject malicious / sensitive / non-slug inputs
  assert.equal(isValidPageSlug(""), false);
  assert.equal(isValidPageSlug("   "), false);
  assert.equal(isValidPageSlug("ca-users?secret=123"), false);
  assert.equal(isValidPageSlug("token=eyJhbGciOi..."), false);
  assert.equal(isValidPageSlug("1000.50"), false); // financial numbers
  assert.equal(isValidPageSlug("<script>alert(1)</script>"), false);
  assert.equal(isValidPageSlug("ca/users"), false);
  assert.equal(isValidPageSlug("a".repeat(65)), false); // too long (>64)
});

test("DB-R05: readInternalPageRoute extracts page from search query and hash query", () => {
  // 1. From search query
  assert.equal(
    readInternalPageRoute({ search: "?page=ca-users", hash: "#/preview/asab/CompanyDashboard" }),
    "ca-users",
  );

  // 2. From search query with other params
  assert.equal(
    readInternalPageRoute({ search: "?foo=bar&page=ca-plans&baz=1", hash: "#/preview/asab/CompanyDashboard" }),
    "ca-plans",
  );

  // 3. From hash query when search is empty
  assert.equal(
    readInternalPageRoute({ search: "", hash: "#/preview/asab/CompanyDashboard?page=ca-branches" }),
    "ca-branches",
  );

  // 4. Returns null when absent or invalid
  assert.equal(
    readInternalPageRoute({ search: "", hash: "#/preview/asab/CompanyDashboard" }),
    null,
  );
  assert.equal(
    readInternalPageRoute({ search: "?page=invalid/page#hack", hash: "" }),
    null,
  );
});

test("DB-R05: resolveInternalPage preserves role guards and rejects mismatched pages", () => {
  // Mock role validator matching pageForRole behavior
  const mockPageForRole = (role: string | null, page: string, fallback: string): string => {
    if (!role) return fallback;
    const prefixes: Record<string, string> = {
      "company-admin": "ca-",
      head: "head-",
      accountant: "acc-",
    };
    const prefix = prefixes[role];
    return prefix && page.startsWith(prefix) ? page : fallback;
  };

  // Valid role page
  assert.equal(
    resolveInternalPage("company-admin", "ca-users", "ca-dashboard", mockPageForRole),
    "ca-users",
  );

  // Unauthorized page for role falls back to role default
  assert.equal(
    resolveInternalPage("company-admin", "head-shifts", "ca-dashboard", mockPageForRole),
    "ca-dashboard",
  );

  // Null candidate page falls back to default
  assert.equal(
    resolveInternalPage("head", null, "head-dashboard", mockPageForRole),
    "head-dashboard",
  );

  // Null role returns empty
  assert.equal(
    resolveInternalPage(null, "ca-users", "ca-dashboard", mockPageForRole),
    "",
  );
});

test("DB-R05: buildInternalPageUrl sets page query param and strips stale hash query", () => {
  const url1 = buildInternalPageUrl("ca-users", "http://localhost:5173/#/preview/asab/CompanyDashboard");
  assert.equal(url1, "http://localhost:5173/?page=ca-users#/preview/asab/CompanyDashboard");

  // Replaces existing search param
  const url2 = buildInternalPageUrl("ca-branches", "http://localhost:5173/?page=ca-users#/preview/asab/CompanyDashboard");
  assert.equal(url2, "http://localhost:5173/?page=ca-branches#/preview/asab/CompanyDashboard");

  // Strips stale hash query
  const url3 = buildInternalPageUrl("ca-plans", "http://localhost:5173/#/preview/asab/CompanyDashboard?page=old");
  assert.equal(url3, "http://localhost:5173/?page=ca-plans#/preview/asab/CompanyDashboard");
});
