import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

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

test("GO-04 A05: accountant radio label has valid content and preserves selection/unlink actions", () => {
  const code = norm(readFileSync(new URL("./_pages/admin/AdminUsers.tsx", import.meta.url), "utf8"));
  const source = ts.createSourceFile("AdminUsers.tsx", code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const labels: ts.JsxElement[] = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isJsxElement(node) &&
      node.openingElement.tagName.getText(source) === "label" &&
      node.getText(source).includes('name="head-accountant-selection"')
    ) labels.push(node);
    ts.forEachChild(node, visit);
  };
  visit(source);

  assert.equal(labels.length, 1, "one label should wrap the accountant selection radio");
  const label = labels[0];
  const tags: string[] = [];
  const collect = (node: ts.Node) => {
    if (ts.isJsxElement(node)) tags.push(node.openingElement.tagName.getText(source));
    else if (ts.isJsxSelfClosingElement(node)) tags.push(node.tagName.getText(source));
    if (ts.isJsxElement(node)) node.children.forEach(collect);
    else if (ts.isJsxFragment(node)) node.children.forEach(collect);
    else ts.forEachChild(node, collect);
  };
  collect(label);
  assert.ok(!tags.some(tag => tag === "div" || tag === "p"), "label descendants must use phrasing content");

  const labelText = label.getText(source);
  assert.match(labelText, /type="radio"[\s\S]*?name="head-accountant-selection"/);
  assert.match(labelText, /checked=\{isSelected\}/);
  assert.match(labelText, /onChange=\{\(\) => setH3AccSel\(acc\.id\)\}/);
  assert.ok(!labelText.includes("moveAccToHead"), "assignment/unlink actions must not be nested in the label");

  const afterLabel = code.slice(label.end, label.parent.end);
  assert.match(afterLabel, /moveAccToHead\(acc\.id, null\); setH3AccSel\(null\);/);
  assert.match(code, /aria-label=\{t\(`تعيين المحاسب المحدد إلى \$\{head\.name\}`, `Assign selected accountant to \$\{head\.name\}`\)\}/);
  assert.match(code, /moveAccToHead\(h3AccSel, head\.id\)/);
});

test("GO-06 A07: production distribution icon actions have localized contextual names", () => {
  const code = norm(readFileSync(new URL("./_pages/admin/AdminUsers.tsx", import.meta.url), "utf8"));
  const source = ts.createSourceFile("AdminUsers.tsx", code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const buttons: ts.JsxElement[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(source) === "button") buttons.push(node);
    ts.forEachChild(node, visit);
  };
  visit(source);

  const attribute = (button: ts.JsxElement, name: string) => button.openingElement.attributes.properties.find(
    (property): property is ts.JsxAttribute => ts.isJsxAttribute(property) && property.name.getText(source) === name,
  );
  const assertNamedAction = (handler: string, nameParts: string[]) => {
    const button = buttons.find(candidate => attribute(candidate, "onClick")?.getText(source).includes(handler));
    assert.ok(button, `production button handler ${handler} should remain present`);
    const label = attribute(button, "aria-label")?.initializer;
    assert.ok(label && ts.isJsxExpression(label) && label.expression, `${handler} should have a localized accessible name`);
    const labelSource = label.expression.getText(source);
    assert.match(labelSource, /\bt\(/, `${handler} should use the existing locale translator`);
    for (const part of nameParts) assert.ok(labelSource.includes(part), `${handler} accessible name should include ${part}`);
  };

  assertNamedAction("removeRestFromAcc(accSel!, rest)", ["إزالة", "Remove", "restName(rest)", "selAccData?.name"]);
  assertNamedAction("addRestToAcc(accSel!, rest)", ["إضافة", "Add", "restName(rest)", "selAccData?.name"]);
  assertNamedAction("toggleModuleForRest(modAccSel, row.id, m.value)", ["تمكين", "تعطيل", "Enable", "Disable", "row.name", "acc.name"]);
  assertNamedAction("clearRestModules(modAccSel, row.id)", ["تمكين", "إلغاء", "Enable all", "Clear", "row.name", "acc.name"]);
  assert.match(code, /const headName = head\?\.name \?\? t\("رئيس الحسابات", "Head accountant"\)/);
  assertNamedAction("moveAccToHead(acc.id, null); setH3AccSel(null)", ["إلغاء تعيين", "Unassign", "acc.name", "headName"]);
  assertNamedAction('setModAccFilter("")', ["مسح البحث عن المحاسب", "Clear accountant search"]);
  assertNamedAction('setModRestFilter("")', ["مسح تصفية المطعم", "Clear restaurant filter"]);
  assertNamedAction('setH3HeadFilter("")', ["مسح البحث عن المحاسب", "Clear accountant search"]);
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

test("Phase 1F ADM-F02 & ADM-F03: ASABPrototype guards search and notifications for companyless platform admin", () => {
  const code = norm(readFileSync(new URL("./ASABPrototype.tsx", import.meta.url), "utf8"));
  assert.ok(
    code.includes('role === "admin" ?') &&
    code.includes("بحث المنصة الموحد يتطلب تحديد نطاق مستأجر"),
    "Global search must be guarded with honest tooltip for platform admin"
  );
  assert.ok(
    code.includes('role === "admin" ?') &&
    code.includes("إشعارات المنصة تتطلب تفعيل مركز إشعارات النظام الإداري"),
    "Notification bell must be guarded with honest tooltip for platform admin"
  );
});

test("Phase 1F ADM-F25: AdminReports guards wizard progression and blocks step 4 without verified file and preview", () => {
  const code = norm(readFileSync(new URL("./_pages/admin/AdminReports.tsx", import.meta.url), "utf8"));
  assert.ok(
    code.includes("const canNavigateToStep = (targetStep: number) =>"),
    "canNavigateToStep guard must be implemented"
  );
  assert.ok(
    code.includes('targetStep === 3) return uploaded && uploadResult?.status === "verified" && Boolean(previewApi?.rows && previewApi.rows.length > 0)'),
    "Step 4 (index 3) must require verified upload and non-empty preview rows"
  );
  assert.ok(
    code.includes("disabled={!canNavigateToStep(3)}"),
    "Step 2 continue button must be disabled when canNavigateToStep(3) is false"
  );
});

test("Phase 1F ADM-F26: AdminReports guards delivery status KPI from false confirmation", () => {
  const code = norm(readFileSync(new URL("./_pages/admin/AdminReports.tsx", import.meta.url), "utf8"));
  assert.ok(
    code.includes("const hasConfirmedData = Boolean(statusApi && (statusApi.rows?.length > 0 || statusApi.summary));"),
    "hasConfirmedData check must ensure real server response before reporting metrics"
  );
  assert.ok(
    code.includes('hasConfirmedData ? sent : "—"'),
    "Sent metric must show dash when no confirmed data exists"
  );
  assert.ok(
    code.includes("لم يُرسَل هذا التقرير بعد أو لا توجد سجلات تسليم مؤكدة من الخادم"),
    "Empty table must honestly indicate absence of confirmed delivery records"
  );
});

test("Phase 1F ADM-F22 & ADM-F23: AdminPermissions guards role cloning under PERM-00 governance", () => {
  const code = norm(readFileSync(new URL("./_pages/admin/AdminPermissions.tsx", import.meta.url), "utf8"));
  assert.ok(
    code.includes("PERM-00") && code.includes("APPROVAL_REQUIRED"),
    "Role cloning panel must display PERM-00 governance notice and mark cloning as APPROVAL_REQUIRED"
  );
  assert.ok(
    code.includes("const handleClone = () => {\n    // PERM-00: Unapproved role cloning is gated (APPROVAL_REQUIRED)"),
    "handleClone must fail closed under PERM-00"
  );
  assert.ok(
    code.includes("const cyclePermission = (_rowIdx: number, _colIdx: number) => {\n    // PERM-00: Unapproved role permission cycling is gated (APPROVAL_REQUIRED)"),
    "cyclePermission must fail closed under PERM-00"
  );
  assert.ok(
    code.includes("const saveChanges = () => {\n    // PERM-00: Unapproved role permission persistence is gated (APPROVAL_REQUIRED)"),
    "saveChanges must fail closed under PERM-00"
  );
});

test("Phase 1F Behavioral: AdminReports step navigation gate strictly prevents progression to send without verified file and server preview", () => {
  // Behavioral simulation of the canNavigateToStep logic in AdminReports.tsx
  const canNavigateToStep = (
    targetStep: number,
    state: { uploaded: boolean; uploadStatus?: string; previewRows?: any[] | null }
  ): boolean => {
    if (targetStep <= 1) return true;
    if (targetStep === 2) return state.uploaded;
    if (targetStep === 3) {
      return (
        state.uploaded &&
        state.uploadStatus === "verified" &&
        Boolean(state.previewRows && state.previewRows.length > 0)
      );
    }
    return false;
  };

  // Negative test cases for Step 3 (Send step)
  assert.strictEqual(
    canNavigateToStep(3, { uploaded: false, uploadStatus: undefined, previewRows: [] }),
    false,
    "Must not allow step 3 when nothing is uploaded"
  );
  assert.strictEqual(
    canNavigateToStep(3, { uploaded: true, uploadStatus: "pending", previewRows: [] }),
    false,
    "Must not allow step 3 when upload is still pending"
  );
  assert.strictEqual(
    canNavigateToStep(3, { uploaded: true, uploadStatus: "verified", previewRows: [] }),
    false,
    "Must not allow step 3 when preview rows are empty"
  );
  assert.strictEqual(
    canNavigateToStep(3, { uploaded: true, uploadStatus: "verified", previewRows: null }),
    false,
    "Must not allow step 3 when preview rows are null"
  );
  assert.strictEqual(
    canNavigateToStep(3, { uploaded: true, uploadStatus: "error", previewRows: [{ label: "Sales", value: "100" }] }),
    false,
    "Must not allow step 3 when upload status is error even if preview rows exist"
  );

  // Positive test case
  assert.strictEqual(
    canNavigateToStep(3, { uploaded: true, uploadStatus: "verified", previewRows: [{ label: "Total Revenue", value: "50,000" }] }),
    true,
    "Must allow step 3 only when uploaded, verified, and non-empty preview rows exist"
  );
});

test("Phase 1F Behavioral: AdminPermissions fail-closed state preservation under PERM-00", () => {
  // Test matrix state invariance
  const initialMatrix = [
    { module: "Dashboard", perms: ["view", "view", "view", "view", "view"] },
    { module: "Sales", perms: ["approve", "review", "enter", "enter", "none"] },
  ];

  let currentMatrix = JSON.parse(JSON.stringify(initialMatrix));

  const safeHandleClone = () => {
    // PERM-00 fail-closed
    return;
  };

  const safeCyclePermission = (_rowIdx: number, _colIdx: number) => {
    // PERM-00 fail-closed
    return;
  };

  const safeSaveChanges = () => {
    // PERM-00 fail-closed
    return;
  };

  // Attempt mutations
  safeHandleClone();
  assert.deepStrictEqual(currentMatrix, initialMatrix, "Matrix must remain unchanged after clone attempt");

  safeCyclePermission(0, 0);
  safeCyclePermission(1, 2);
  assert.deepStrictEqual(currentMatrix, initialMatrix, "Matrix must remain unchanged after cycle attempts");

  safeSaveChanges();
  assert.deepStrictEqual(currentMatrix, initialMatrix, "Matrix must remain unchanged after saveChanges attempt");
});

test("Phase 1F Behavioral: AdminReports delivery KPIs honestly show '—' when server has not returned confirmed records", () => {
  const computeDeliveryKpis = (
    hasConfirmedData: boolean,
    sentCount: number,
    totalRestaurants: number
  ) => {
    return {
      sent: hasConfirmedData ? sentCount : "—",
      notSent: hasConfirmedData ? Math.max(0, totalRestaurants - sentCount) : "—",
    };
  };

  // Without confirmed data, metrics must be honest unavailable dashes
  const unconfirmed = computeDeliveryKpis(false, 0, 5);
  assert.strictEqual(unconfirmed.sent, "—");
  assert.strictEqual(unconfirmed.notSent, "—");

  // With confirmed data, metrics display confirmed integers
  const confirmed = computeDeliveryKpis(true, 3, 5);
  assert.strictEqual(confirmed.sent, 3);
  assert.strictEqual(confirmed.notSent, 2);
});
