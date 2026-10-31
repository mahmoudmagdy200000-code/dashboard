// @ts-nocheck
declare module "node:test" {
  const test: any;
  export default test;
}
declare module "node:assert/strict" {
  const assert: any;
  export default assert;
}
declare module "node:fs" {
  export const readFileSync: (path: string, encoding: string) => string;
}
declare module "node:path" {
  export const resolve: (...paths: string[]) => string;
}
declare module "node:url" {
  export const fileURLToPath: (url: URL | string) => string;
}

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { canRoleCreateBrandOrRestaurant } from "./companyAdminGuards.ts";

const dashboardPath = fileURLToPath(new URL("CompanyDashboard.tsx", import.meta.url));
const sourceText = readFileSync(dashboardPath, "utf8");
const sourceFile = ts.createSourceFile(
  "CompanyDashboard.tsx",
  sourceText,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
);

const companyAdminPath = fileURLToPath(new URL("../../../api/queries/companyAdmin.ts", import.meta.url));
const companyAdminText = readFileSync(companyAdminPath, "utf8");

// ─── Helper Functions & AST Analyzers ─────────────────────────────────────────

function getFunctionDeclaration(name: string): ts.FunctionDeclaration {
  let target: ts.FunctionDeclaration | undefined;
  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) {
      target = node;
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  if (!target) {
    throw new Error(`Function declaration '${name}' not found in CompanyDashboard.tsx`);
  }
  return target;
}

function transpileFunction(fnNode: ts.FunctionDeclaration): string {
  const code = fnNode.getText(sourceFile).replace(/^export\s+/, "");
  return ts.transpileModule(code, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
      module: ts.ModuleKind.None,
    },
  }).outputText;
}

const HOOK_NAMES = new Set([
  "useState",
  "useEffect",
  "useContext",
  "useReducer",
  "useCallback",
  "useMemo",
  "useRef",
  "useImperativeHandle",
  "useLayoutEffect",
  "useDebugValue",
  "useTransition",
  "useDeferredValue",
  "useId",
  "useSyncExternalStore",
  "useInsertionEffect",
]);

function isHookCall(node: ts.Node): boolean {
  if (ts.isCallExpression(node)) {
    const expr = node.expression;
    if (ts.isIdentifier(expr)) {
      return HOOK_NAMES.has(expr.text) || expr.text.startsWith("use");
    }
    if (ts.isPropertyAccessExpression(expr)) {
      return HOOK_NAMES.has(expr.name.text) || expr.name.text.startsWith("use");
    }
  }
  return false;
}

function analyzeComponentHookOrdering(fnNode: ts.FunctionDeclaration) {
  const hookCalls: { name: string; line: number; insideConditional: boolean }[] = [];
  const earlyReturns: { line: number; condition: string }[] = [];
  const hooksAfterEarlyReturn: { name: string; line: number }[] = [];

  const body = fnNode.body;
  if (!body) {
    return { hookCalls, earlyReturns, hooksAfterEarlyReturn };
  }

  function scan(node: ts.Node, insideConditional = false) {
    if (isHookCall(node)) {
      const call = node as ts.CallExpression;
      const expr = call.expression;
      const name = ts.isIdentifier(expr) ? expr.text : ts.isPropertyAccessExpression(expr) ? expr.name.text : "hook";
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      hookCalls.push({ name, line, insideConditional });

      if (earlyReturns.length > 0) {
        hooksAfterEarlyReturn.push({ name, line });
      }
    }

    if (ts.isIfStatement(node)) {
      const hasReturn = (stmt: ts.Statement): boolean => {
        if (ts.isReturnStatement(stmt)) return true;
        if (ts.isBlock(stmt)) {
          return stmt.statements.some(hasReturn);
        }
        return false;
      };

      if (hasReturn(node.thenStatement)) {
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
        const condText = node.expression.getText(sourceFile);
        earlyReturns.push({ line, condition: condText });
      }

      scan(node.expression, true);
      scan(node.thenStatement, true);
      if (node.elseStatement) {
        scan(node.elseStatement, true);
      }
      return;
    }

    ts.forEachChild(node, (n) => scan(n, insideConditional));
  }

  scan(body, false);

  return {
    hookCalls,
    earlyReturns,
    hooksAfterEarlyReturn,
  };
}

// ─── Persistent React Component Lifecycle Harness ─────────────────────────────
// Simulates React Fiber hook allocation and reconciliation across re-renders
// on a SINGLE persistent mounted component instance.

interface HookSlot {
  type: string;
  value: any;
  setter: (val: any) => void;
}

class MountedComponentLifecycle {
  private hooks: HookSlot[] = [];
  private renderIndex = 0;
  private currentHookPointer = 0;
  private componentFactory: (customUseState: any, queryState: any) => any;

  constructor(componentFactory: (customUseState: any, queryState: any) => any) {
    this.componentFactory = componentFactory;
  }

  // Hook dispatcher bound to this persistent component instance
  customUseState = <T>(initialState: T | (() => T)): [T, (val: T | ((prev: T) => T)) => void] => {
    const idx = this.currentHookPointer++;
    if (this.renderIndex === 1) {
      // Mount Phase: Allocate hook in Fiber node
      const resolvedValue = typeof initialState === "function" ? (initialState as any)() : initialState;
      const slot: HookSlot = {
        type: "useState",
        value: resolvedValue,
        setter: (newVal: any) => {
          slot.value = typeof newVal === "function" ? newVal(slot.value) : newVal;
        },
      };
      this.hooks[idx] = slot;
      return [slot.value, slot.setter];
    }

    // Reconciliation Phase:
    // React enforces exact hook count and order across renders.
    if (idx >= this.hooks.length) {
      throw new Error(
        `React hook ordering violation during reconciliation: Rendered more hooks than during the previous render! (previous: ${this.hooks.length}, attempted: ${idx + 1})`
      );
    }
    const slot = this.hooks[idx];
    if (slot.type !== "useState") {
      throw new Error(
        `React hook type mismatch during reconciliation at hook index ${idx}: expected ${slot.type}, got useState`
      );
    }
    return [slot.value, slot.setter];
  };

  // Execute a render cycle on the persistent instance
  render(queryState: any): { html: string; hookCount: number; renderCount: number } {
    this.renderIndex++;
    this.currentHookPointer = 0;

    const Component = this.componentFactory(this.customUseState, queryState);
    const html = renderToStaticMarkup(React.createElement(Component));

    // Verify reconciliation hook count invariant
    if (this.renderIndex > 1 && this.currentHookPointer !== this.hooks.length) {
      throw new Error(
        `React hook ordering violation during reconciliation: Rendered fewer hooks than during the previous render! (previous: ${this.hooks.length}, actual: ${this.currentHookPointer})`
      );
    }

    return {
      html,
      hookCount: this.hooks.length,
      renderCount: this.renderIndex,
    };
  }

  getHookCount(): number {
    return this.hooks.length;
  }

  getRenderCount(): number {
    return this.renderIndex;
  }
}

// Mock UI Primitives
const MockIcon = (props: any) => React.createElement("svg", props);
const MockBadge = ({ children, className }: any) => React.createElement("span", { className }, children);
const MockBtn = ({ children, onClick, disabled, variant }: any) =>
  React.createElement("button", { onClick, disabled, className: variant }, children);
const MockKpiCard = ({ label, value, sub }: any) =>
  React.createElement("div", { "data-kpi": label }, value, sub);

// ─── Tests ───────────────────────────────────────────────────────────────────

test("W1-B-HOOKS: CAUsers declares all hooks above early loading/error returns", () => {
  const fn = getFunctionDeclaration("CAUsers");
  const analysis = analyzeComponentHookOrdering(fn);

  assert.ok(analysis.hookCalls.length >= 8, `CAUsers should have at least 8 hooks, found ${analysis.hookCalls.length}`);
  assert.ok(analysis.earlyReturns.length >= 2, `CAUsers should have at least 2 early returns (loading & error)`);
  assert.equal(
    analysis.hooksAfterEarlyReturn.length,
    0,
    `CAUsers must have 0 hooks after early returns. Violations: ${JSON.stringify(analysis.hooksAfterEarlyReturn)}`
  );
});

test("W1-B-HOOKS: CABranches declares all hooks above early loading/error returns", () => {
  const fn = getFunctionDeclaration("CABranches");
  const analysis = analyzeComponentHookOrdering(fn);

  assert.ok(analysis.hookCalls.length >= 6, `CABranches should have at least 6 hooks, found ${analysis.hookCalls.length}`);
  assert.ok(analysis.earlyReturns.length >= 2, `CABranches should have at least 2 early returns (loading & error)`);
  assert.equal(
    analysis.hooksAfterEarlyReturn.length,
    0,
    `CABranches must have 0 hooks after early returns. Violations: ${JSON.stringify(analysis.hooksAfterEarlyReturn)}`
  );
});

test("W1-B-HOOKS: Component Lifecycle state transitions maintain constant hook order and count", () => {
  const fnUsers = getFunctionDeclaration("CAUsers");
  const analysisUsers = analyzeComponentHookOrdering(fnUsers);

  const hookSequence = analysisUsers.hookCalls.map(h => h.name);
  assert.ok(hookSequence.includes("useCLang"), "Must initialize language hook");
  assert.ok(hookSequence.includes("useCompanyUsers"), "Must initialize company users query");
  assert.ok(hookSequence.includes("useCompanyInvitations"), "Must initialize company invitations query");
  assert.ok(hookSequence.includes("useState"), "Must initialize controlled state hooks");

  const loadingPhaseHookCount = analysisUsers.hookCalls.filter(h => h.line < analysisUsers.earlyReturns[0].line).length;
  const totalHookCount = analysisUsers.hookCalls.length;
  assert.equal(
    loadingPhaseHookCount,
    totalHookCount,
    "All hooks must execute during the loading phase to prevent React hook order mismatch"
  );
});

test("W1-B-HOOKS: Persistent Component Lifecycle of CABranches across (Loading -> Error -> Retry -> Loaded + 10 Rerenders)", () => {
  const fnBranches = getFunctionDeclaration("CABranches");
  const js = transpileFunction(fnBranches);

  // Factory to create CABranches wired to custom hook dispatcher
  const createCABranches = (useStateImpl: any, queryBrandsState: any) => {
    return new Function(
      "React", "useState", "useCLang", "useCompanyBrands", "useCompanyUsers",
      "useCreateBranch", "useTransferBranchManager", "getErrorMessage", "validateBranchCreate",
      "fmt", "KpiCard", "Btn", "Badge",
      "RefreshCw", "AlertTriangle", "Plus", "X", "ArrowLeftRight", "ChevronDown",
      "Star", "Home", "Building2", "TrendingUp",
      `${js}\nreturn CABranches;`
    )(
      React,
      useStateImpl,
      () => ({ t: (ar: string, en?: string) => ar, dir: "rtl", lang: "ar" }),
      () => ({ ...queryBrandsState, refetch: () => {} }),
      () => ({ data: [] }),
      () => ({ mutate: () => {}, isPending: false }),
      () => ({ mutate: () => {}, isPending: false }),
      (err: any) => err?.message || "Failed to fetch branches",
      () => ({ valid: true }),
      (n: number) => String(n),
      MockKpiCard,
      MockBtn,
      MockBadge,
      MockIcon, MockIcon, MockIcon, MockIcon, MockIcon, MockIcon,
      MockIcon, MockIcon, MockIcon, MockIcon
    );
  };

  // Instantiate SINGLE persistent mounted component lifecycle
  const mounted = new MountedComponentLifecycle(createCABranches);

  // 1. Initial Mount in Loading State
  const r1 = mounted.render({ data: [], isLoading: true, isError: false, error: null });
  assert.match(r1.html, /جارٍ تحميل العلامات والفروع/, "Render 1: Loading state rendered");
  const initialHookCount = mounted.getHookCount();
  assert.ok(initialHookCount >= 5, `Initial hook allocation must be >= 5, got ${initialHookCount}`);

  // 2. Reconciliation Re-render in Error State on the SAME mounted instance
  const r2 = mounted.render({
    data: [],
    isLoading: false,
    isError: true,
    error: new Error("Backend connection lost"),
  });
  assert.match(r2.html, /فشل تحميل الفروع والعلامات/, "Render 2: Error alert rendered");
  assert.match(r2.html, /Backend connection lost/, "Render 2: Error message rendered");
  assert.equal(mounted.getHookCount(), initialHookCount, "Hook count must NOT drift between Loading and Error");

  // 3. Reconciliation Re-render in Retry State on the SAME mounted instance
  const r3 = mounted.render({ data: [], isLoading: true, isError: false, error: null });
  assert.match(r3.html, /جارٍ تحميل العلامات والفروع/, "Render 3: Retry loading rendered");
  assert.equal(mounted.getHookCount(), initialHookCount, "Hook count must NOT drift during Retry");

  // 4. Reconciliation Re-render in Loaded State on the SAME mounted instance
  const r4 = mounted.render({
    data: [
      {
        id: "b-01",
        name: "برجر العرب",
        abbr: "BA",
        color: "#7C3AED",
        restaurants: [
          {
            id: "r-01",
            name: "مطعم السليمانية",
            branches: [
              { id: "br-01", name: "فرع التحلية", city: "الرياض", mgr: "سعد الخالدي", salesM: 120000, target: 150000 },
            ],
          },
        ],
      },
    ],
    isLoading: false,
    isError: false,
    error: null,
  });
  assert.match(r4.html, /العلامات التجارية والفروع/, "Render 4: Loaded header rendered");
  assert.match(r4.html, /برجر العرب/, "Render 4: Brand name rendered");
  assert.match(r4.html, /1 مطاعم · 1 فروع/, "Render 4: Summary rendered");
  assert.match(r4.html, /إضافة فرع/, "Render 4: Add Branch preserved");
  assert.ok(!r4.html.includes("إضافة علامة"), "Render 4: No Add Brand");
  assert.ok(!r4.html.includes("إضافة مطعم"), "Render 4: No Add Restaurant");
  assert.equal(mounted.getHookCount(), initialHookCount, "Hook count must NOT drift between Loading and Loaded");

  // 5. 10 Consecutive Reconciliation Re-renders across alternating states on the SAME mounted instance
  for (let i = 0; i < 10; i++) {
    const state = i % 2 === 0
      ? { data: [], isLoading: true, isError: false, error: null }
      : { data: [{ id: `b-${i}`, name: `Brand ${i}`, restaurants: [] }], isLoading: false, isError: false, error: null };
    const rLoop = mounted.render(state);
    assert.ok(rLoop.html.length > 50, `Render ${i + 5}: Output must be valid`);
    assert.equal(mounted.getHookCount(), initialHookCount, `Render ${i + 5}: Hook count invariant maintained`);
  }

  assert.equal(mounted.getRenderCount(), 14, "All 14 renders must execute on the single persistent component instance");
});

test("W1-B-HOOKS: Persistent Component Lifecycle of CAUsers across (Loading -> Error -> Retry -> Loaded + 10 Rerenders)", () => {
  const fnUsers = getFunctionDeclaration("CAUsers");
  const js = transpileFunction(fnUsers);

  const createCAUsers = (useStateImpl: any, queryState: any) => {
    return new Function(
      "React", "useState", "useCLang", "useCompanyUsers", "useCompanyInvitations",
      "useCreateCompanyInvitation", "useResendCompanyInvitation", "useRevokeCompanyInvitation",
      "useToggleCompanyUserStatus", "useUpdateCompanyUser", "useLookup", "getErrorMessage",
      "ROLE_AR", "Btn", "Badge",
      "Search", "Send", "Users", "Lock", "Edit2", "Shield", "Mail", "Phone",
      "Check", "X", "RefreshCw", "AlertTriangle", "Plus",
      `${js}\nreturn CAUsers;`
    )(
      React,
      useStateImpl,
      () => ({ t: (ar: string, en?: string) => ar, dir: "rtl", lang: "ar" }),
      () => ({ ...queryState.users, refetch: () => {} }),
      () => ({ ...queryState.invites, refetch: () => {} }),
      () => ({ mutate: () => {}, isPending: false }),
      () => ({ mutate: () => {}, isPending: false }),
      () => ({ mutate: () => {}, isPending: false }),
      () => ({ mutate: () => {}, isPending: false }),
      () => ({ mutate: () => {}, isPending: false }),
      () => ({ data: [] }),
      (err: any) => err?.message || "Failed to fetch users",
      { "company-admin": "مدير الشركة", "head": "رئيس الحسابات", "accountant": "محاسب", "branch": "مدير فرع", "procurement": "مدير مشتريات" },
      MockBtn,
      MockBadge,
      MockIcon, MockIcon, MockIcon, MockIcon, MockIcon, MockIcon, MockIcon, MockIcon,
      MockIcon, MockIcon, MockIcon, MockIcon, MockIcon
    );
  };

  // Instantiate SINGLE persistent mounted component lifecycle
  const mounted = new MountedComponentLifecycle(createCAUsers);

  // 1. Initial Mount in Loading State
  const r1 = mounted.render({
    users: { data: [], isLoading: true, isError: false, error: null },
    invites: { data: [], isLoading: false, isError: false, error: null },
  });
  assert.match(r1.html, /جارٍ تحميل المستخدمين والدعوات/, "Render 1: Loading state rendered");
  const initialHookCount = mounted.getHookCount();
  assert.ok(initialHookCount >= 5, `Initial hook allocation must be >= 5, got ${initialHookCount}`);

  // 2. Reconciliation Re-render in Error State on the SAME mounted instance
  const r2 = mounted.render({
    users: { data: [], isLoading: false, isError: true, error: new Error("Unauthorized tenant access") },
    invites: { data: [], isLoading: false, isError: false, error: null },
  });
  assert.match(r2.html, /فشل تحميل قائمة المستخدمين/, "Render 2: Error alert rendered");
  assert.match(r2.html, /Unauthorized tenant access/, "Render 2: Error message rendered");
  assert.equal(mounted.getHookCount(), initialHookCount, "Hook count must NOT drift between Loading and Error");

  // 3. Reconciliation Re-render in Retry State on the SAME mounted instance
  const r3 = mounted.render({
    users: { data: [], isLoading: true, isError: false, error: null },
    invites: { data: [], isLoading: false, isError: false, error: null },
  });
  assert.match(r3.html, /جارٍ تحميل المستخدمين والدعوات/, "Render 3: Retry loading rendered");
  assert.equal(mounted.getHookCount(), initialHookCount, "Hook count must NOT drift during Retry");

  // 4. Reconciliation Re-render in Loaded State on the SAME mounted instance
  const r4 = mounted.render({
    users: {
      data: [
        { id: "u-01", name: "خالد المحاسب", roleKey: "accountant", roleLabel: "محاسب", branchName: "فرع العليا", email: "khaled@assab.com", status: "active", lastActiveAt: "2026-10-27" },
      ],
      isLoading: false,
      isError: false,
      error: null,
    },
    invites: {
      data: [
        { id: "inv-01", email: "invitee@assab.com", roleKey: "branch", status: "pending", expiresAt: "2026-11-01" },
      ],
      isLoading: false,
      isError: false,
      error: null,
    },
  });
  assert.match(r4.html, /إدارة المستخدمين/, "Render 4: Loaded header rendered");
  assert.match(r4.html, /خالد المحاسب/, "Render 4: User name rendered");
  assert.match(r4.html, /invitee@assab\.com/, "Render 4: Pending invitation rendered");
  assert.equal(mounted.getHookCount(), initialHookCount, "Hook count must NOT drift between Loading and Loaded");

  // 5. 10 Consecutive Reconciliation Re-renders across alternating states on the SAME mounted instance
  for (let i = 0; i < 10; i++) {
    const queryState = i % 2 === 0
      ? { users: { data: [], isLoading: true, isError: false, error: null }, invites: { data: [] } }
      : { users: { data: [{ id: `u-${i}`, name: `User ${i}`, roleKey: "accountant", status: "active" }], isLoading: false, isError: false, error: null }, invites: { data: [] } };
    const rLoop = mounted.render(queryState);
    assert.ok(rLoop.html.length > 50, `Render ${i + 5}: Output must be valid`);
    assert.equal(mounted.getHookCount(), initialHookCount, `Render ${i + 5}: Hook count invariant maintained`);
  }

  assert.equal(mounted.getRenderCount(), 14, "All 14 renders must execute on the single persistent component instance");
});

// ─── W1-C-BRAND-REST: Company Admin Brand & Restaurant Creation Prohibition ─────

test("W1-C-BRAND-REST: Role guard permits ONLY Platform Admin and forbids Company Admin", () => {
  assert.equal(canRoleCreateBrandOrRestaurant("admin"), true, "Platform Admin (admin) must be allowed");
  assert.equal(canRoleCreateBrandOrRestaurant("platform-admin"), true, "Platform Admin alias must be allowed");
  assert.equal(canRoleCreateBrandOrRestaurant("super-admin"), true, "Super Admin must be allowed");

  // Forbidden roles
  assert.equal(canRoleCreateBrandOrRestaurant("company-admin"), false, "Company Admin must be forbidden");
  assert.equal(canRoleCreateBrandOrRestaurant("head"), false, "Head Accountant must be forbidden");
  assert.equal(canRoleCreateBrandOrRestaurant("accountant"), false, "Accountant must be forbidden");
  assert.equal(canRoleCreateBrandOrRestaurant("branch"), false, "Branch Manager must be forbidden");
  assert.equal(canRoleCreateBrandOrRestaurant("procurement"), false, "Procurement Manager must be forbidden");
  assert.equal(canRoleCreateBrandOrRestaurant(""), false, "Empty role must be forbidden");
});

test("W1-C-BRAND-REST: CABranches UI contains NO Add Brand or Add Restaurant creation entry points", () => {
  const fn = getFunctionDeclaration("CABranches");
  const text = fn.getText(sourceFile);

  // Verify buttons are removed
  assert.ok(!text.includes("إضافة علامة"), "CABranches must not contain 'إضافة علامة' button");
  assert.ok(!text.includes("Add Brand"), "CABranches must not contain 'Add Brand' button");
  assert.ok(!text.includes("إضافة مطعم"), "CABranches must not contain 'إضافة مطعم' button");
  assert.ok(!text.includes("Add Restaurant"), "CABranches must not contain 'Add Restaurant' button");

  // Verify modal state is removed
  assert.ok(!text.includes("showAddBrand"), "CABranches must not contain showAddBrand modal state");
  assert.ok(!text.includes("showAddRestaurant"), "CABranches must not contain showAddRestaurant modal state");

  // Verify mutation hooks are removed from CABranches
  assert.ok(!text.includes("useCreateBrand"), "CABranches must not call useCreateBrand");
  assert.ok(!text.includes("useCreateRestaurant"), "CABranches must not call useCreateRestaurant");

  // Verify legitimate Branch request workflow is preserved
  assert.ok(text.includes("useCreateBranch"), "CABranches must preserve useCreateBranch");
  assert.ok(text.includes("إضافة فرع") || text.includes("Add Branch"), "CABranches must preserve Add Branch entry point");
  assert.ok(text.includes("useTransferBranchManager"), "CABranches must preserve manager transfer workflow");
});

test("W1-C-BRAND-REST: companyAdmin.ts contains NO active or dead Company Admin brand/restaurant creation hooks", () => {
  assert.ok(!companyAdminText.includes("export function useCreateBrand"), "companyAdmin.ts must not export useCreateBrand");
  assert.ok(!companyAdminText.includes("export function useCreateRestaurant"), "companyAdmin.ts must not export useCreateRestaurant");
});
