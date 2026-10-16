import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  canOpenDashboard, canRunAccountantOperations, canRunShiftConfigs, canRunShiftHistory,
  chooseGrantedRole, companyRoles, grantedRoleKeys, hasRoleGrant, pageForRole,
  preferredDashboard, prototypeRoles,
} from "./roleAccess.ts";

const grant = (key:string, scope="all", ids:string[] = []) => ({
  key,scope,brandIds:scope==="brand"?ids:[],restaurantIds:scope==="restaurant"?ids:[],
  branchIds:scope==="branch"?ids:[],moduleKeys:[],
});
const identity = (roles:unknown[], role="accountant", defaultPage="asab/CompanyDashboard") =>
  ({id:"user-1",role,defaultPage,roles});
const admin = identity([grant("admin")],"accountant");
const companyAdmin = identity([grant("company-admin")],"accountant");
const accountant = identity([grant("accountant","brand",["brand-a"])],"admin");
const head = identity([grant("head")],"admin");
const multi = identity([grant("admin"),grant("accountant","brand",["brand-a"])],"admin");

test("login landing, direct URL, refresh and Back/Forward decisions use /auth/me grants", () => {
  assert.equal(preferredDashboard(admin),"asab/ASABPrototype");
  assert.equal(preferredDashboard(companyAdmin),"asab/CompanyDashboard");
  assert.equal(preferredDashboard(accountant),"asab/CompanyDashboard");
  assert.equal(preferredDashboard(head),"asab/CompanyDashboard");
  assert.equal(canOpenDashboard(admin,"asab/CompanyDashboard"),false);
  assert.equal(canOpenDashboard(companyAdmin,"asab/ASABPrototype"),false);
  assert.equal(canOpenDashboard(accountant,"asab/CompanyDashboard"),true);
  assert.equal(canOpenDashboard(multi,"asab/CompanyDashboard"),true);
  assert.equal(canOpenDashboard(admin,"asab/UnknownDashboard"),false);
  for (const nextPage of ["acc-shifts","acc-sales","head-shifts"]) {
    assert.equal(pageForRole("admin",nextPage,"admin-overview"),"admin-overview",
      "a restored or internal page cannot cross the active role");
  }
  assert.equal(pageForRole("admin","admin-users","admin-overview"),"admin-users");
  assert.equal(pageForRole("head","head-shifts","head-dashboard"),"head-shifts");
});

test("pre-login role selection and internal role switching cannot invent grants", () => {
  assert.equal(chooseGrantedRole(admin,prototypeRoles,"accountant"),"admin");
  assert.equal(chooseGrantedRole(companyAdmin,companyRoles,"accountant"),"company-admin");
  assert.equal(chooseGrantedRole(head,companyRoles,"head"),"head");
  assert.equal(chooseGrantedRole(multi,prototypeRoles,"accountant"),"accountant");
  assert.equal(chooseGrantedRole(multi,prototypeRoles,"head"),"admin");
  assert.equal(chooseGrantedRole(multi,companyRoles,"accountant"),"accountant");
  assert.equal(chooseGrantedRole(multi,companyRoles,"company-admin"),"accountant");
  assert.equal(hasRoleGrant(admin,"accountant"),false);
  assert.equal(hasRoleGrant(multi,"accountant"),true);
});

test("missing or malformed grants fail closed even if legacy fields claim accountant", () => {
  for (const roles of [undefined,null,{},[],[{key:"accountant"}],
    [grant("accountant","brand",[])],[{...grant("accountant"),moduleKeys:null}],
    [{...grant("accountant"),scope:"unknown"}]]) {
    const subject = {role:"accountant",defaultPage:"asab/CompanyDashboard",roles};
    assert.deepEqual(grantedRoleKeys(subject),[]);
    assert.equal(canOpenDashboard(subject,"asab/CompanyDashboard"),false);
    assert.equal(canRunAccountantOperations(subject,"accountant"),false);
  }
  assert.deepEqual(grantedRoleKeys(identity([grant("head"),grant("head")])),["head"]);
});

test("role matrix permits history for head but configs only for accountant", () => {
  for (const subject of [admin,companyAdmin]) {
    assert.equal(canRunShiftHistory(subject,"accountant"),false);
    assert.equal(canRunShiftConfigs(subject,"accountant"),false);
    assert.equal(canRunAccountantOperations(subject,"accountant"),false);
  }
  assert.equal(canRunShiftHistory(head,"head"),true);
  assert.equal(canRunShiftConfigs(head,"head"),false);
  assert.equal(canRunShiftHistory(accountant,"accountant"),true);
  assert.equal(canRunShiftConfigs(accountant,"accountant"),true);
  assert.equal(canRunShiftHistory(multi,"admin"),false);
  assert.equal(canRunShiftHistory(multi,"accountant"),true);
});

const accountantSource = ts.createSourceFile("accountant.ts",
  readFileSync(new URL("../api/queries/platform/accountant.ts",import.meta.url),"utf8"),
  ts.ScriptTarget.Latest,true);
const queryHook = accountantSource.statements.find(node =>
  ts.isFunctionDeclaration(node) && node.name?.text === "useAccountantOperationsPlatform");
assert.ok(queryHook);
const compiledHook = ts.transpileModule(queryHook.getText(accountantSource),{
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None},
}).outputText;

test("actual platform operations hook emits zero unauthorized API requests", async () => {
  const requests:string[] = [];
  const hook = new Function("exports","useQuery","queryKeys","api",compiledHook +
    "\nreturn useAccountantOperationsPlatform;")(
    {},(config:unknown)=>config,{platformAccountantOperations:(filter:unknown)=>["accountant-operations",filter]},
    {get:async (url:string)=>{requests.push(url);return {data:[]};}},
  ) as (filter:unknown,options:{enabled:boolean})=>{enabled:boolean;queryFn:()=>Promise<unknown>};
  for (const [subject,role] of [[admin,"admin"],[companyAdmin,"company-admin"],[head,"head"],[accountant,"accountant"],[multi,"admin"],[multi,"accountant"]] as const) {
    const enabled = canRunAccountantOperations(subject,role);
    const query = hook({pageSize:100},{enabled});
    assert.equal(query.enabled,enabled);
    if (query.enabled) await query.queryFn();
  }
  assert.deepEqual(requests,["/accountant/operations","/accountant/operations","/accountant/operations"]);
});

test("isolated route and child-query mock blocks unauthorized mounts before requests", () => {
  const requests:string[] = [];
  const mount = (subject:ReturnType<typeof identity>, slug:string, role:"admin"|"accountant"|"head") => {
    if (!canOpenDashboard(subject,slug)) return;
    if (canRunShiftHistory(subject,role)) requests.push("/accountant/shifts/history");
    if (canRunShiftConfigs(subject,role)) requests.push("/company/me/shifts/configs");
  };
  mount(admin,"asab/CompanyDashboard","accountant");
  mount(companyAdmin,"asab/CompanyDashboard","accountant");
  mount(head,"asab/CompanyDashboard","head");
  mount(accountant,"asab/CompanyDashboard","accountant");
  assert.deepEqual(requests,[
    "/accountant/shifts/history",
    "/accountant/shifts/history","/company/me/shifts/configs",
  ]);
});

test("actual App route boundary blocks a dashboard mount before its mocked query runs", () => {
  const source = ts.createSourceFile("App.tsx",
    readFileSync(new URL("../App.tsx",import.meta.url),"utf8"),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const declaration = source.statements.find(node =>
    ts.isFunctionDeclaration(node) && node.name?.text === "App");
  assert.ok(declaration);
  const compiled = ts.transpileModule(declaration.getText(source),{
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None,jsx:ts.JsxEmit.React},
  }).outputText;
  const requests:string[] = [];
  let current = admin;
  let path = "asab/CompanyDashboard";
  const window = {location:{hash:"#/preview/asab/CompanyDashboard"},addEventListener:()=>{},removeEventListener:()=>{}};
  const PreviewRenderer = ({componentPath}:{componentPath:string}) => {
    requests.push(componentPath);
    return React.createElement("p",null,"mounted");
  };
  const App = new Function(
    "React","useAuth","useState","useRef","useEffect","ensureAuthStyles","getPreviewPath",
    "canOpenDashboard","readEntrySelection","preferredDashboard","chooseGrantedRole",
    "prototypeRoles","companyRoles","window","SubscriptionExpiredBanner","PreviewRenderer","discoveredModules",
    compiled + "\nreturn App;",
  )(React,()=>({user:current,initializing:false,logout:async()=>{}}),
    React.useState,React.useRef,React.useEffect,()=>{},()=>path,
    canOpenDashboard,()=>null,preferredDashboard,chooseGrantedRole,
    prototypeRoles,companyRoles,window,()=>null,PreviewRenderer,{}) as React.ComponentType;
  assert.match(renderToStaticMarkup(React.createElement(App)),/ليس لديك صلاحية/);
  assert.deepEqual(requests,[],"an admin-only direct URL mounts no accountant dashboard");
  current = companyAdmin;
  path = "asab/ASABPrototype";
  assert.match(renderToStaticMarkup(React.createElement(App)),/ليس لديك صلاحية/);
  assert.deepEqual(requests,[]);
  current = head;
  path = "asab/CompanyDashboard";
  assert.match(renderToStaticMarkup(React.createElement(App)),/mounted/);
  assert.deepEqual(requests,["asab/CompanyDashboard"]);
  current = multi;
  path = "asab/ASABPrototype";
  assert.match(renderToStaticMarkup(React.createElement(App)),/mounted/);
  assert.deepEqual(requests,["asab/CompanyDashboard","asab/ASABPrototype"]);
});

test("actual head history components render with History and assigned branches, never Configs", async () => {
  const queryCalls:unknown[] = [];
  const lookupQueries:Array<{queryFn:()=>Promise<unknown>}> = [];
  const branchRequests:string[] = [];
  for (const name of ["CompanyDashboard.tsx","ASABPrototype.tsx"]) {
    const source = ts.createSourceFile(name,
      readFileSync(new URL("../components/mockups/asab/" + name,import.meta.url),"utf8"),
      ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
    const declaration = source.statements.find(node =>
      ts.isFunctionDeclaration(node) && node.name?.text === "HeadShiftHistory");
    assert.ok(declaration,name);
    const compiled = ts.transpileModule(declaration.getText(source),{
      compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None,jsx:ts.JsxEmit.React},
    }).outputText;
    const HeadShiftHistory = new Function(
      "React","useState","useCLang","useLang","useShiftsHistory","historyPageTarget",
      "getShiftCountEvidence","getErrorMessage","isApiError","useQuery","api",
      compiled + "\nreturn HeadShiftHistory;",
    )(React,React.useState,()=>({t:(ar:string)=>ar,lang:"ar"}),()=>({t:(ar:string)=>ar}),
      (filter:unknown)=>{
        queryCalls.push(filter);
        return {isPending:false,isFetching:false,isError:false,
          data:{data:[{id:"FIN-01",branchName:"Branch A",cashierName:"Cashier",endedAt:"2026-10-15"}],
            meta:{page:1,pageSize:20,total:1,totalPages:1}}};
      },
      ()=>1,()=>({variance:{text:"-20.00"}}),()=>"",()=>false,
      (config:{queryFn:()=>Promise<unknown>})=>{
        lookupQueries.push(config);
        return {data:[{id:"branch-a",name:"Branch A"}]};
      },
      {get:async(url:string)=>{branchRequests.push(url);return {data:{data:[]}};}},
    ) as React.ComponentType;
    const html = renderToStaticMarkup(React.createElement(HeadShiftHistory));
    assert.match(html,/FIN-01|Branch A/);
    assert.match(html,/الصفحة/);
  }
  assert.deepEqual(queryCalls,[
    {dateFrom:"",dateTo:"",branchId:"",page:1,pageSize:20},
    {dateFrom:"",dateTo:"",branchId:"",page:1,pageSize:20},
  ]);
  await Promise.all(lookupQueries.map(query=>query.queryFn()));
  assert.deepEqual(branchRequests,["/lookups/branches","/lookups/branches"]);
});

test("actual CompanyDashboard component boundary does not mount accountant draft query for head or company admin", () => {
  const source = ts.createSourceFile("CompanyDashboard.tsx",
    readFileSync(new URL("../components/mockups/asab/CompanyDashboard.tsx",import.meta.url),"utf8"),
    ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const declaration = source.statements.find(node =>
    ts.isFunctionDeclaration(node) && node.name?.text === "CompanyDashboardInner");
  assert.ok(declaration);
  const compiled = ts.transpileModule(declaration.getText(source),{
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None,jsx:ts.JsxEmit.React},
  }).outputText;
  const requests:string[] = [];
  let current = companyAdmin;
  const Shell = ({children}:{children:React.ReactNode})=>React.createElement("div",null,children);
  const CAssetDraftProvider = ({children}:{children:React.ReactNode})=>{
    requests.push("/company/me/asset-drafts");
    return React.createElement("div",null,children);
  };
  const CompanyDashboardInner = new Function(
    "React","useState","useEffect","useAuth","useCLang","readEntrySelection",
    "chooseGrantedRole","companyRoles","grantedRoleKeys","pageForRole","DEFAULT_PAGE",
    "useSharedOps","Shell","PageRouter","RejectModal","ClarifyModal","LiveChatWidget",
    "CAssetDraftProvider",compiled + "\nreturn CompanyDashboardInner;",
  )(React,React.useState,React.useEffect,
    ()=>({user:current,logout:async()=>{}}),()=>({t:(ar:string)=>ar}),()=>null,
    chooseGrantedRole,companyRoles,grantedRoleKeys,pageForRole,
    {"company-admin":"ca-dashboard",head:"head-dashboard",accountant:"acc-dashboard"},
    ()=>({ops:[],approve:()=>{},reject:()=>{},requestClarification:()=>{},finalApprove:()=>{},
      bulkApprove:()=>{},bulkFinalApprove:()=>{},actionsPending:false,shiftReviewPage:1,
      setShiftReviewPage:()=>{},rejectModalProps:{},clarifyModalProps:{}}),
    Shell,({role}:{role:string})=>React.createElement("p",null,role),
    ()=>null,()=>null,()=>null,CAssetDraftProvider,
  ) as React.ComponentType;
  assert.match(renderToStaticMarkup(React.createElement(CompanyDashboardInner)),/company-admin/);
  current = head;
  assert.match(renderToStaticMarkup(React.createElement(CompanyDashboardInner)),/head/);
  assert.deepEqual(requests,[]);
  current = accountant;
  assert.match(renderToStaticMarkup(React.createElement(CompanyDashboardInner)),/accountant/);
  assert.deepEqual(requests,["/company/me/asset-drafts"]);
});
