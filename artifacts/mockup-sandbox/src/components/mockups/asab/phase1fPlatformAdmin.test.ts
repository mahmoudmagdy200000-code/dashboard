import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const norm = (s: string) => s.replace(/\r\n/g, "\n");

test("Phase 1F ADM-F04: AddUserModal updates admin users only on server success", () => {
  const code = norm(readFileSync(new URL("./ASABPrototype.tsx", import.meta.url), "utf8"));
  assert.ok(
    code.includes("createAdminUserMut.mutate(body, {") &&
    code.includes("setAdminUsers(prev => [...prev, created ? { ...u, ...created } : u]);") &&
    code.includes("setModal(null);"),
    "createAdminUserMut must update state and close modal only on success callback"
  );
});

test("Phase 1F ADM-F05: Edit permissions button in user row navigates to admin-permissions", () => {
  const code = norm(readFileSync(new URL("./_pages/admin/AdminUsers.tsx", import.meta.url), "utf8"));
  assert.ok(
    code.includes('navigate?.("admin-permissions")'),
    "Edit permissions button must navigate to admin-permissions"
  );
});

test("Phase 1F ADM-F06: deleteUser removes user from list only after server confirms deletion", () => {
  const code = norm(readFileSync(new URL("./_pages/admin/AdminUsers.tsx", import.meta.url), "utf8"));
  assert.ok(
    code.includes("deleteUserMut.mutate(target.id, {") &&
    code.includes("setUsers((prev: AdminUserData[]) => prev.filter(u => u.email !== email));"),
    "deleteUser must guard deletion with onSuccess callback"
  );
});

test("Phase 1F ADM-F07: syncAssignments handles rollback on error", () => {
  const code = norm(readFileSync(new URL("./_pages/admin/AdminUsers.tsx", import.meta.url), "utf8"));
  assert.ok(
    code.includes("assignMut.mutate({ accId, headId, restaurants }, {") &&
    code.includes("if (prevAccs) setDistAccs(prevAccs);"),
    "syncAssignments must support rollback on error"
  );
});

test("Phase 1F ADM-F10: BRANDS renders flat API arrays without blanking out", () => {
  const code = norm(readFileSync(new URL("./_pages/admin/AdminRestaurants.tsx", import.meta.url), "utf8"));
  assert.ok(
    code.includes("Array.isArray(b.restaurants) ? b.restaurants : []"),
    "BRANDS mapping must support flat brands without requiring initial restaurant array"
  );
});

test("Phase 1F ADM-F12: Default brand selection syncs with first accessible brand", () => {
  const code = norm(readFileSync(new URL("./_pages/admin/AdminRestaurants.tsx", import.meta.url), "utf8"));
  assert.ok(
    code.includes("setExpandedBrand(BRANDS[0].id)"),
    "expandedBrand must sync with first accessible brand"
  );
});

test("Phase 1F ADM-F13: admin-branch-requests is active in sidebar navigation", () => {
  const code = norm(readFileSync(new URL("./ASABPrototype.tsx", import.meta.url), "utf8"));
  assert.ok(
    code.includes('{ id: "admin-branch-requests", label: "طلبات الفروع", icon: <Building2 size={16} /> }'),
    "admin-branch-requests must be uncommented and visible in sidebar"
  );
});

test("Phase 1F ADM-F14: Subscription renewal does not use hardcoded expiry and updates from response", () => {
  const code = norm(readFileSync(new URL("./_pages/admin/AdminSubscriptions.tsx", import.meta.url), "utf8"));
  assert.ok(
    !code.includes('expires: "14 مارس 2027"'),
    "renew must not use hardcoded expiry date"
  );
  assert.ok(
    code.includes("renewMut.mutate({ id }, {"),
    "renew must mutate with success callback"
  );
});

test("Phase 1F ADM-F15: Auto-reminder toggle supports rollback on mutation failure", () => {
  const code = norm(readFileSync(new URL("./_pages/admin/AdminSubscriptions.tsx", import.meta.url), "utf8"));
  assert.ok(
    code.includes("setAutoReminders(p => ({ ...p, [sub.id]: prev }));"),
    "reminder toggle must roll back on error"
  );
});

test("Phase 1F ADM-F16: Subscription card action buttons bind onSuspendSub and onActivateSub", () => {
  const code = norm(readFileSync(new URL("./_pages/admin/AdminSubscriptions.tsx", import.meta.url), "utf8"));
  assert.ok(
    code.includes("onSuspendSub(sub.id)") && code.includes("onActivateSub(sub.id)"),
    "Subscription cards must provide suspend and activate buttons"
  );
});

test("Phase 1F ADM-F17: Company subscription lifecycle updates only on confirmed server response", () => {
  const code = norm(readFileSync(new URL("./_pages/admin/AdminCompanies.tsx", import.meta.url), "utf8"));
  assert.ok(
    code.includes("suspendMut.mutate(id, {") &&
    code.includes("activateMut.mutate(id, {") &&
    code.includes("upgradeMut.mutate({ id, plan: plan"),
    "Company actions must update state inside onSuccess callback"
  );
});

test("Phase 1F ADM-F18 & ADM-F19: Revenue and catalog prices carry SUB-01 catalog disclaimers", () => {
  const companies = norm(readFileSync(new URL("./_pages/admin/AdminCompanies.tsx", import.meta.url), "utf8"));
  const packages = norm(readFileSync(new URL("./_pages/admin/AdminPackages.tsx", import.meta.url), "utf8"));
  assert.ok(
    companies.includes("SUB-01"),
    "AdminCompanies must indicate SUB-01 catalog estimation"
  );
  assert.ok(
    packages.includes("SUB-01"),
    "AdminPackages must indicate SUB-01 catalog reference pricing"
  );
});

test("Phase 1F ADM-F20 & ADM-F21: Permissions matrix reset restores state and save sets saved on success", () => {
  const code = norm(readFileSync(new URL("./_pages/admin/AdminPermissions.tsx", import.meta.url), "utf8"));
  assert.ok(
    code.includes("JSON.parse(JSON.stringify(orig))"),
    "resetAll must restore matrix from server copy"
  );
  assert.ok(
    code.includes("updatePermsMut.mutate(matrix as any, {") &&
    code.includes("setSaved(true);"),
    "saveChanges must update saved flag only in onSuccess"
  );
});

test("Phase 1F ADM-F24: Reports preview does not fabricate financial amounts when API rows missing", () => {
  const code = norm(readFileSync(new URL("./_pages/admin/AdminReports.tsx", import.meta.url), "utf8"));
  assert.ok(
    !code.includes("previewRows[activeReport] || previewRows[\"pl\"]"),
    "Reports preview must not fall back to fabricated previewRows"
  );
});

test("Phase 1F ADM-F27: Activity log date filter compares normalized Date objects", () => {
  const code = norm(readFileSync(new URL("./_pages/admin/AdminAudit.tsx", import.meta.url), "utf8"));
  assert.ok(
    code.includes("d.toDateString() === now.toDateString()"),
    "Activity log filter must compare real Date string against today/yesterday"
  );
});

test("Phase 1F ADM-F29 & ADM-F30: ERP export requires confirmation and indicates file export", () => {
  const code = norm(readFileSync(new URL("./_pages/admin/AdminERP.tsx", import.meta.url), "utf8"));
  assert.ok(
    code.includes("window.confirm") && code.includes("INTG-01"),
    "ERP export must confirm action and cite INTG-01 file export"
  );
});

test("Phase 1F ADM-F31 & ADM-F32: Settings includes security preference notice", () => {
  const code = norm(readFileSync(new URL("./_pages/admin/AdminSettings.tsx", import.meta.url), "utf8"));
  assert.ok(
    code.includes("PERM-00"),
    "System Settings must carry PERM-00 security notice"
  );
});

test("Phase 1F ADM-F34 & ADM-F35: Modals and tables use dynamic dir and dialog accessibility", () => {
  const prototype = norm(readFileSync(new URL("./ASABPrototype.tsx", import.meta.url), "utf8"));
  const subscriptions = norm(readFileSync(new URL("./_pages/admin/AdminSubscriptions.tsx", import.meta.url), "utf8"));
  const reports = norm(readFileSync(new URL("./_pages/admin/AdminReports.tsx", import.meta.url), "utf8"));
  const packages = norm(readFileSync(new URL("./_pages/admin/AdminPackages.tsx", import.meta.url), "utf8"));

  assert.ok(prototype.includes('role="dialog"') && prototype.includes('aria-modal="true"'), "Prototype modal has dialog semantics");
  assert.ok(subscriptions.includes('role="dialog"') && subscriptions.includes('dir={dir}'), "Subscriptions modal has dialog semantics and dir={dir}");
  assert.ok(reports.includes('table className="w-full" dir={dir}'), "Reports tables use dir={dir}");
  assert.ok(packages.includes('table className="w-full" dir={dir}'), "Packages table uses dir={dir}");
});
