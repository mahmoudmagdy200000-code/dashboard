import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { buildInvitationPayload, type CreateCompanyInvitationInput } from "./companyAdmin.js";

test("T007: buildInvitationPayload creates valid accountant payload requiring brandId", () => {
  const input: CreateCompanyInvitationInput = {
    email: "acc@example.com",
    name: "Accountant User",
    roleKey: "accountant",
    brandId: "brand-123",
  };
  const payload = buildInvitationPayload(input);
  assert.equal(payload.email, "acc@example.com");
  assert.equal(payload.name, "Accountant User");
  assert.equal(payload.roleKey, "accountant");
  assert.equal(payload.brandId, "brand-123");
  assert.equal(payload.branchId, undefined);
});

test("T007: buildInvitationPayload throws when brandId is missing for accountant", () => {
  const input: CreateCompanyInvitationInput = {
    email: "acc@example.com",
    roleKey: "accountant",
  };
  assert.throws(() => buildInvitationPayload(input), {
    message: "Brand selection is required for accountant role",
  });
});

test("T007: buildInvitationPayload creates branch payload requiring branchId and strictly omitting brandId", () => {
  const input: CreateCompanyInvitationInput = {
    email: "branch@example.com",
    name: "Branch Manager",
    roleKey: "branch",
    branchId: "branch-456",
    brandId: "forbidden-brand", // Must be stripped/omitted to protect roleAccess.ts:33
  };
  const payload = buildInvitationPayload(input);
  assert.equal(payload.email, "branch@example.com");
  assert.equal(payload.roleKey, "branch");
  assert.equal(payload.branchId, "branch-456");
  assert.equal(payload.brandId, undefined, "brandId must be undefined for branch manager");
  assert.equal("brandId" in payload, false, "brandId property must not exist in payload");
});

test("T007: buildInvitationPayload throws when branchId is missing for branch manager", () => {
  const input: CreateCompanyInvitationInput = {
    email: "branch@example.com",
    roleKey: "branch",
  };
  assert.throws(() => buildInvitationPayload(input), {
    message: "Branch selection is required for branch role",
  });
});

test("T007: buildInvitationPayload succeeds for company-admin and head without brand/branch", () => {
  const adminInput: CreateCompanyInvitationInput = {
    email: "admin@example.com",
    roleKey: "company-admin",
  };
  const adminPayload = buildInvitationPayload(adminInput);
  assert.equal(adminPayload.roleKey, "company-admin");
  assert.equal(adminPayload.brandId, undefined);
  assert.equal(adminPayload.branchId, undefined);

  const headInput: CreateCompanyInvitationInput = {
    email: "head@example.com",
    roleKey: "head",
  };
  const headPayload = buildInvitationPayload(headInput);
  assert.equal(headPayload.roleKey, "head");
});

test("T007: companyAdmin.ts AST confirms useCreateCompanyInvitation uses roleKey signature", () => {
  const filePath = new URL("./companyAdmin.ts", import.meta.url);
  const content = readFileSync(filePath, "utf8");
  const source = ts.createSourceFile("companyAdmin.ts", content, ts.ScriptTarget.Latest, true);

  const fnNode = source.statements.find(
    (s): s is ts.FunctionDeclaration => ts.isFunctionDeclaration(s) && s.name?.text === "useCreateCompanyInvitation",
  );
  assert.ok(fnNode, "useCreateCompanyInvitation function must exist in companyAdmin.ts");
  const text = fnNode.getText(source);
  assert.ok(text.includes("buildInvitationPayload"), "useCreateCompanyInvitation must use buildInvitationPayload");
  assert.ok(text.includes("/company/invitations"), "mutation must target /company/invitations");
});
