import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function norm(s: string): string {
  return s.replace(/\s+/g, " ");
}

test("Phase 1D 1D-BRM-001 & 1D-BRM-015: Branch settings updates manager field correctly", () => {
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  assert.ok(
    dash.includes("manager: manager.trim()") || dash.includes("manager:manager.trim()"),
    "BranchSettings save handler must send manager payload key expected by backend controller"
  );
  assert.ok(
    dash.includes("readOnlyFields.has(\"branchName\")"),
    "BranchSettings must keep admin-owned fields readOnly"
  );
});

test("Phase 1D 1D-BRM-002: Supplier request payload includes contactPhone and reason", () => {
  const branchMgrApi = norm(
    readFileSync(new URL("../../../api/queries/branchMgr.ts", import.meta.url), "utf8")
  );
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  assert.ok(
    branchMgrApi.includes("contactPhone?: string") && branchMgrApi.includes("reason?: string"),
    "useBranchRequestNewSupplier mutation type must accept contactPhone and reason"
  );
  assert.ok(
    dash.includes("contactPhone: reqForm.phone") || dash.includes("contactPhone:reqForm.phone"),
    "BranchSuppliers submit handler must supply contactPhone"
  );
  assert.ok(
    dash.includes("reason: reqForm.reason") || dash.includes("reason:reqForm.reason"),
    "BranchSuppliers submit handler must supply reason"
  );
});

test("Phase 1D 1D-BRM-003 & 1D-BRM-014: Purchase requests contract mapping and quantity validation", () => {
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  assert.ok(
    dash.includes('(r as any).item || r.itemName') || dash.includes('r.item || r.itemName'),
    "BranchRequests must map item name from both backend contracts"
  );
  assert.ok(
    dash.includes('(r as any).urgency || (r as any).priority') || dash.includes('r.urgency || r.priority'),
    "BranchRequests must map urgency/priority from both contracts"
  );
  assert.ok(
    dash.includes('q <= 0') || dash.includes('Number(reqForm.qty) <= 0'),
    "BranchRequests must reject zero or negative quantities"
  );
});

test("Phase 1D 1D-BRM-004, 1D-BRM-005 & 1D-BRM-013: Inventory item stock absence vs zero and count submission validation", () => {
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  assert.ok(
    dash.includes('rawQty != null ? Number(rawQty) : null') || dash.includes('rawQty != null'),
    "BranchItems must distinguish missing stock quantity from numerical zero"
  );
  assert.ok(
    dash.includes('item.qty != null ? item.qty : "—"') || dash.includes('item.qty != null ? item.qty : "—"'),
    "BranchItems must render dash for missing quantity instead of assuming zero"
  );
  assert.ok(
    dash.includes('counts.length === 0'),
    "submitInventory must guard against empty count submission"
  );
  assert.ok(
    dash.includes('يرجى إدخال كمية فعلية واحدة على الأقل قبل الإرسال') || dash.includes('Please enter at least one actual count'),
    "submitInventory must alert user on empty counts and NOT set invSubmitted without mutation"
  );
});

test("Phase 1D 1D-BRM-006, 1D-BRM-008 & 1D-BRM-024: Branch upload attachment inputs, validation and reset lifecycle", () => {
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  assert.ok(
    dash.includes('parseFloat(salesAmt)') && dash.includes('s <= 0'),
    "BranchUpload submit must parse and reject sales amount <= 0"
  );
  assert.ok(
    dash.includes('exp < 0') || dash.includes('parseFloat(expAmt) < 0'),
    "BranchUpload submit must reject negative expense amounts"
  );
  assert.ok(
    dash.includes('salesFileRef') && dash.includes('invFileRef'),
    "BranchUpload must wire real file input refs for sales and invoice attachments"
  );
  assert.ok(
    dash.includes('handleResetUpload'),
    "BranchUpload must provide complete reset lifecycle handler"
  );
  assert.ok(
    dash.includes('setSalesAmt("")') && dash.includes('setExpAmt("")') && dash.includes('setSalesFile(null)'),
    "handleResetUpload must reset financial inputs and attachments to clean state"
  );
});

test("Phase 1D 1D-BRM-009: Branch staff maps shift, status, and phone correctly", () => {
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  assert.ok(
    dash.includes('(s as any).shiftType || (s as any).shift') || dash.includes('s.shiftType || s.shift'),
    "BranchEmployees must map shift from shiftType or shift"
  );
  assert.ok(
    dash.includes('(s as any).status || (s.active ? "present" : "absent")') || dash.includes('s.status || (s.active ? "present" : "absent")'),
    "BranchEmployees must map status distinguishing attendance from active membership"
  );
  assert.ok(
    dash.includes('(s as any).phone || (s as any).contactPhone') || dash.includes('s.phone || s.contactPhone'),
    "BranchEmployees must map phone from phone or contactPhone"
  );
});

test("Phase 1D 1D-BRM-010: Sidebar navigation includes branch shifts and purchase requests", () => {
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  const displayConfig = norm(
    readFileSync(new URL("./_shared/displayConfig.ts", import.meta.url), "utf8")
  );
  assert.ok(
    dash.includes('"branch-shifts"') && dash.includes('"branch-requests"'),
    "Branch sidebar menu in CompanyDashboard must include branch-shifts and branch-requests"
  );
  assert.ok(
    displayConfig.includes('"branch-requests": "Purchase Requests"') && displayConfig.includes('"branch-shifts": "Branch Shifts"'),
    "displayConfig must define page titles for branch-requests and branch-shifts"
  );
});

test("Phase 1D 1D-BRM-011: Branch overview avoids hardcoded branch name and hardcoded +5.2% delta", () => {
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  assert.ok(
    !dash.includes('+5.2%'),
    "BranchOverview must not hardcode +5.2% trend delta"
  );
  assert.ok(
    !dash.includes('لوحة الفرع — فرع العليا'),
    "BranchOverview heading must not hardcode Al-Ulia branch heading"
  );
  assert.ok(
    dash.includes('todaySalesTrendPct') || dash.includes('branchName'),
    "BranchOverview must use API-derived trend or branch identity"
  );
});

test("Phase 1D 1D-COM-016: Responsive layout classes applied across branch screens", () => {
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  assert.ok(
    dash.includes('grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'),
    "BranchOverview KPI cards must use responsive grid breakpoints"
  );
  assert.ok(
    dash.includes('grid-cols-1 md:grid-cols-2'),
    "BranchUpload sections must use responsive grid breakpoints"
  );
  assert.ok(
    dash.includes('grid-cols-1 sm:grid-cols-3'),
    "BranchItems stock KPI cards must use responsive grid breakpoints"
  );
  assert.ok(
    dash.includes('overflow-x-auto'),
    "BranchItems table container must support horizontal scrolling on mobile"
  );
});

test("Phase 1D 1D-COM-017 & 1D-COM-018: Modal accessibility attributes and input labeling", () => {
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  assert.ok(
    dash.includes('role="dialog"'),
    "Modals must include role=dialog"
  );
  assert.ok(
    dash.includes('aria-modal="true"'),
    "Modals must include aria-modal=true"
  );
  assert.ok(
    dash.includes('aria-label='),
    "Modals and close buttons must have accessible aria-labels"
  );
  assert.ok(
    dash.includes('htmlFor="b-req-item"') || dash.includes('htmlFor="b-sup-name"'),
    "Branch form inputs must have associated labels via htmlFor"
  );
});

test("Phase 1D 1D-COM-023: Sensitive query prefixes clear branch cache upon role switch", () => {
  const roleAccess = norm(
    readFileSync(new URL("../../../auth/roleAccess.ts", import.meta.url), "utf8")
  );
  assert.ok(
    roleAccess.includes('["branch"]') || roleAccess.includes('["platform", "branch"]'),
    "roleAccess sensitivePrefixes must include branch query prefixes"
  );
});
