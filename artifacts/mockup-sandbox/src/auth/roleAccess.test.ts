import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { getHeadReviewPolicy, headLegacyBulkIds, runHeadFinalApproval } from "../components/mockups/asab/headReviewGuards.ts";
import { getSalesActionPolicy } from "../components/mockups/asab/salesActionGuards.ts";
import {
  canOpenDashboard, canRunAccountantOperations, canRunShiftConfigs, canRunShiftHistory,
  chooseGrantedRole, companyRoles, grantedRoleKeys, hasRoleGrant, pageForRole,
  preferredDashboard, prototypeRoles, purgeFinancialQueries, financialAccessFingerprint,
  financialAccessGeneration, registerFinancialRequest,
} from "./roleAccess.ts";

const grant = (key:string, scope="all", ids:string[] = []) => ({
  key,scope,brandIds:scope==="brand"?ids:[],restaurantIds:scope==="restaurant"?ids:[],
  branchIds:scope==="branch"?ids:[],moduleKeys:[],
});
const identity = (roles:unknown[], role="accountant", defaultPage="asab/CompanyDashboard") =>
  ({id:"user-1",role,defaultPage,roles});
const brandA = "11111111-1111-4111-8111-111111111111";
const branchA = "22222222-2222-4222-8222-222222222222";
const restaurantA = "33333333-3333-4333-8333-333333333333";
const admin = identity([grant("admin")],"accountant");
const companyAdmin = identity([grant("company-admin")],"accountant");
const accountant = identity([grant("accountant","brand",[brandA])],"admin");
const head = identity([grant("head")],"admin");
const multi = identity([grant("admin"),grant("accountant","brand",[brandA])],"admin");

test("Backend scope rules accept valid hierarchy arrays and reject malformed grants", () => {
  assert.deepEqual(grantedRoleKeys(identity([{...grant("accountant","brand",[brandA]),
    restaurantIds:[restaurantA],branchIds:[branchA]}])),["accountant"]);
  assert.deepEqual(grantedRoleKeys(identity([grant("branch","branch",[branchA])])),["branch"]);
  assert.deepEqual(grantedRoleKeys(identity([grant("accountant","restaurant",[restaurantA])])),["accountant"]);
  assert.deepEqual(grantedRoleKeys(identity([{...grant("accountant","restaurant",[restaurantA]),
    brandIds:[brandA],branchIds:[branchA]}])),["accountant"]);
  assert.deepEqual(grantedRoleKeys(admin),["admin"]);
  for (const bad of [
    grant("accountant","branch",[branchA]), grant("branch","brand",[brandA]),
    grant("branch","branch",[]),grant("branch","branch",[branchA,restaurantA]),
    grant("accountant","restaurant",[]),
    {...grant("accountant","brand",[brandA]),brandIds:[" "]},
    {...grant("accountant","brand",[brandA]),brandIds:["not-a-uuid"]},
    {...grant("accountant","brand",[brandA]),brandIds:[brandA,brandA]},
    {...grant("head"),moduleKeys:[" "]},
    {...grant("head"),moduleKeys:["sales","sales"]},
    {...grant("head"),branchIds:"invalid"},
  ]) assert.deepEqual(grantedRoleKeys(identity([bad])),[]);
});

test("ambiguous repeated same-role assignments fail closed in either order", () => {
  for (const roles of [
    [grant("accountant","brand",[brandA]),grant("accountant","brand",[brandA])],
    [grant("accountant","brand",[brandA]),grant("accountant","brand",[branchA])],
  ]) {
    for (const ordered of [roles,[...roles].reverse()]) {
      const subject = identity(ordered);
      assert.deepEqual(grantedRoleKeys(subject),[]);
      assert.equal(canRunAccountantOperations(subject,"accountant"),false);
    }
  }
  assert.deepEqual(grantedRoleKeys(multi),["admin","accountant"]);
  assert.deepEqual(grantedRoleKeys(identity([grant("head"),grant("accountant","brand",[brandA]),
    grant("accountant","brand",[branchA])])),[]);
  assert.deepEqual(grantedRoleKeys(identity([{...grant("head"),moduleKeys:null},
    grant("accountant","brand",[brandA])])),[]);
  assert.deepEqual(grantedRoleKeys(identity([null,grant("accountant","brand",[brandA])])),[]);
  assert.deepEqual(grantedRoleKeys(identity([grant("brand-owner"),grant("accountant","brand",[brandA])])),[]);
  assert.deepEqual(grantedRoleKeys(identity([{...grant("accountant","brand",[brandA]),key:7}])),[]);
});

test("actual preview path parser recognizes empty and unknown hash/path URLs for denial", () => {
  const source = ts.createSourceFile("App.tsx",
    readFileSync(new URL("../App.tsx",import.meta.url),"utf8"),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const declaration = source.statements.find(node => ts.isFunctionDeclaration(node)
    && node.name?.text === "getPreviewPath");
  assert.ok(declaration);
  const compiled = ts.transpileModule(declaration.getText(source),{
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None},
  }).outputText;
  const window = {location:{hash:"",pathname:"/"}};
  const parse = new Function("window","getBasePath",compiled + "\nreturn getPreviewPath;")(
    window,()=>"",
  ) as ()=>string|null;
  for (const [hash,pathname,expected] of [
    ["#/preview/asab/ASABPrototype","/","asab/ASABPrototype"],
    ["#/preview/unknown","/","unknown"],
    ["#/preview/","/",""],
    ["#/preview","/",""],
    ["","/preview/unknown","unknown"],
    ["","/preview/",""],
    ["","/preview",""],
  ]) {
    window.location.hash = hash;
    window.location.pathname = pathname;
    assert.equal(parse(),expected);
  }
});

test("financial cache cancellation excludes unrelated queries and ignores late responses", async () => {
  const client = new QueryClient({defaultOptions:{queries:{retry:false}}});
  let finish!: (value:string)=>void;
  const pending = new Promise<string>(resolve => {finish = resolve;});
  const observer = new QueryObserver(client,{queryKey:["operations",{page:1}],queryFn:()=>pending});
  const unsubscribe = observer.subscribe(()=>{});
  client.setQueryData(["shifts","history"],{secret:"shift"});
  client.setQueryData(["asset-drafts"],{secret:"draft"});
  client.setQueryData(["platform","accountant","operations"],{secret:"platform"});
  client.setQueryData(["platform","admin","overview"],{secret:"admin"});
  client.setQueryData(["notifications",{}],{safe:true});
  const inFlight = observer.refetch();
  await purgeFinancialQueries(client);
  finish("late financial data");
  await inFlight;
  assert.equal(client.getQueryData(["operations",{page:1}]),undefined);
  assert.equal(client.getQueryData(["shifts","history"]),undefined);
  assert.equal(client.getQueryData(["asset-drafts"]),undefined);
  assert.equal(client.getQueryData(["platform","accountant","operations"]),undefined);
  assert.equal(client.getQueryData(["platform","admin","overview"]),undefined);
  assert.deepEqual(client.getQueryData(["notifications",{}]),{safe:true});
  unsubscribe();
  client.clear();
});

test("financial purge increments generation immediately and aborts registered direct requests", async () => {
  const client = new QueryClient();
  const before = financialAccessGeneration(client);
  const request = registerFinancialRequest(client);
  assert.equal(request.generation,before);
  const purging = purgeFinancialQueries(client);
  assert.equal(financialAccessGeneration(client),before+1);
  assert.equal(request.signal.aborted,true);
  await purging;
  request.release();
  client.clear();
});

test("actual loadFreshDetail discards a late direct response after access invalidation", async () => {
  const source = ts.createSourceFile("CompanyDashboard.tsx",
    readFileSync(new URL("../components/mockups/asab/CompanyDashboard.tsx",import.meta.url),"utf8"),
    ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let declaration:ts.VariableDeclaration|undefined;
  const walk = (node:ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "loadFreshDetail") declaration = node;
    ts.forEachChild(node,walk);
  };
  walk(source);
  assert.ok(declaration);
  const compiled = ts.transpileModule(`const ${declaration.getText(source)};`,{
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None},
  }).outputText;
  const client = new QueryClient({defaultOptions:{queries:{retry:false}}});
  const detailKey = ["operations","direct-op"];
  const observer = new QueryObserver(client,{queryKey:detailKey,
    queryFn:async()=>({id:"observer"}),enabled:false});
  const unsubscribe = observer.subscribe(()=>{});
  let resolveGet!: (value:{data:{id:string}})=>void;
  let requestSignal:AbortSignal|undefined;
  const api = {get:(_url:string,options?:{signal?:AbortSignal})=>{
    requestSignal = options?.signal;
    return new Promise<{data:{id:string}}>(resolve=>{resolveGet=resolve;});
  }};
  const context = () => ({generation:financialAccessGeneration(client),role:"head",fingerprint:"scope-a"});
  const valid = (snapshot:ReturnType<typeof context>) =>
    snapshot.generation === financialAccessGeneration(client) && snapshot.role === "head";
  const loader = new Function("api","queryClient","queryKeys","captureAccess","accessStillCurrent",
    "registerFinancialRequest","pendingDirect","FinancialAccessChangedError",compiled + "\nreturn loadFreshDetail;",
  )(api,client,{operation:(id:string)=>["operations",id]},context,valid,
    registerFinancialRequest,{current:new Set<()=>void>()},class FinancialAccessChangedError extends Error {},
  ) as (id:string)=>Promise<{id:string}>;
  const loading = loader("direct-op");
  await purgeFinancialQueries(client);
  resolveGet({data:{id:"direct-op"}}); // deliberately ignore abort, as a non-cancellable adapter could
  await assert.rejects(loading);
  assert.equal(requestSignal?.aborted,true);
  assert.equal(client.getQueryData(detailKey),undefined);
  unsubscribe();
  client.clear();
});

function mountHeadActions(operation:{id:string;moduleKey:string;status:string;reportReview?:unknown}, rejecting=false) {
  const source = ts.createSourceFile("CompanyDashboard.tsx",
    readFileSync(new URL("../components/mockups/asab/CompanyDashboard.tsx",import.meta.url),"utf8"),
    ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const declaration = source.statements.find(node => ts.isFunctionDeclaration(node)
    && node.name?.text === "useSharedOps");
  assert.ok(declaration);
  const compiled = ts.transpileModule(declaration.getText(source),{
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None},
  }).outputText;
  const client = new QueryClient({defaultOptions:{queries:{retry:false}}});
  const mutations:string[] = [];
  const requests:Array<{resolve:(value:{data:typeof operation})=>void;signal?:AbortSignal}> = [];
  const api = {get:(_url:string,options?:{signal?:AbortSignal})=>new Promise<{data:typeof operation}>(resolve=>{
    requests.push({resolve,signal:options?.signal});
  })};
  const mutation = (name:string)=>()=>({mutate:()=>mutations.push(name),
    mutateAsync:async()=>{mutations.push(name);}});
  let stateIndex=0;
  const state = (initial:unknown) => {
    const index=stateIndex++;
    return React.useState(index===2 && rejecting ? operation.id : initial);
  };
  const useSharedOps = new Function("useQueryClient","useQuery","queryKeys","api",
    "useApproveOperation","useRejectOperation","useFinalApprove","useBulkFinalApprove",
    "useBulkApprove","useRequestClarification","useRef","useState","useMemo","useLayoutEffect",
    "apiOpToCOp","BRANDS","useRejectionReasons","financialAccessGeneration",
    "registerFinancialRequest","FinancialAccessChangedError","getHeadReviewPolicy",
    "runHeadFinalApproval","headLegacyBulkIds","getSalesActionPolicy","toast","getErrorMessage",
    compiled + "\nreturn useSharedOps;",
  )(()=>client,()=>({data:{data:[operation]}}),
    {operations:()=>["operations","list"],operation:(id:string)=>["operations",id]},api,
    mutation("approve"),mutation("reject"),mutation("final"),mutation("bulk-final"),
    mutation("bulk"),mutation("clarify"),React.useRef,state,React.useMemo,
    (effect:()=>void)=>effect(),(op:unknown)=>op,{},()=>({data:[{key:"RETURN"}]}),
    financialAccessGeneration,registerFinancialRequest,class FinancialAccessChangedError extends Error {},
    getHeadReviewPolicy,runHeadFinalApproval,headLegacyBulkIds,getSalesActionPolicy,
    {error:()=>{}},()=>"error",
  ) as (role:string,fingerprint:string)=>{
    finalApprove:(id:string)=>Promise<void>;
    bulkFinalApprove:(ids:string[])=>Promise<void>;
    rejectModalProps:{onSubmit:(value:{reason:string})=>Promise<void>};
  };
  let actions!:ReturnType<typeof useSharedOps>;
  renderToStaticMarkup(React.createElement(()=>{
    actions=useSharedOps("head","scope-a");
    return null;
  }));
  return {actions,client,mutations,requests};
}

test("final approval does not mutate after a late detail response crosses access generation", async () => {
  const op={id:"final-op",moduleKey:"shifts",status:"approved",reportReview:{phase:"head_review"}};
  const {actions,client,mutations,requests}=mountHeadActions(op);
  const action=actions.finalApprove(op.id);
  assert.equal(requests.length,1);
  await purgeFinancialQueries(client);
  requests[0].resolve({data:op});
  await action;
  assert.equal(requests[0].signal?.aborted,true);
  assert.deepEqual(mutations,[]);
  assert.equal(client.getQueryData(["operations",op.id]),undefined);
  client.clear();
});

test("bulk final approval and head return stop before mutation after access invalidation", async () => {
  for (const [operation,run] of [
    [{id:"bulk-op",moduleKey:"expenses",status:"approved"},"bulk"] as const,
    [{id:"return-op",moduleKey:"shifts",status:"approved",reportReview:{phase:"head_review"}},"return"] as const,
  ]) {
    const {actions,client,mutations,requests}=mountHeadActions(operation,run==="return");
    const action=run==="bulk"
      ? actions.bulkFinalApprove([operation.id])
      : actions.rejectModalProps.onSubmit({reason:"RETURN"});
    assert.equal(requests.length,1,run);
    await purgeFinancialQueries(client);
    requests[0].resolve({data:operation});
    await action;
    assert.deepEqual(mutations,[],run);
    assert.equal(client.getQueryData(["operations",operation.id]),undefined,run);
    client.clear();
  }
});

test("scope fingerprints change on role order, grant narrowing and revocation", () => {
  assert.notEqual(financialAccessFingerprint(multi),financialAccessFingerprint(identity([...multi.roles].reverse())));
  assert.notEqual(financialAccessFingerprint(accountant),financialAccessFingerprint(identity([grant("accountant","brand",[branchA])])));
  assert.notEqual(financialAccessFingerprint(accountant),financialAccessFingerprint(identity([])));
  assert.notEqual(financialAccessFingerprint({...accountant,companyId:"company-a"}),
    financialAccessFingerprint({...accountant,companyId:"company-b"}));
});

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
  assert.deepEqual(grantedRoleKeys(identity([grant("head"),grant("head")])),[]);
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
  let financialTransition = false;
  const window = {location:{hash:"#/preview/asab/CompanyDashboard"},addEventListener:()=>{},removeEventListener:()=>{}};
  const PreviewRenderer = ({componentPath}:{componentPath:string}) => {
    requests.push(componentPath);
    return React.createElement("p",null,"mounted");
  };
  const App = new Function(
    "React","useAuth","useState","useRef","useEffect","ensureAuthStyles","getPreviewPath",
    "canOpenDashboard","readEntrySelection","preferredDashboard","chooseGrantedRole","financialAccessFingerprint",
    "prototypeRoles","companyRoles","window","SubscriptionExpiredBanner","PreviewRenderer","discoveredModules",
    compiled + "\nreturn App;",
  )(React,()=>({user:current,initializing:false,financialTransition,logout:async()=>{}}),
    React.useState,React.useRef,React.useEffect,()=>{},()=>path,
    canOpenDashboard,()=>null,preferredDashboard,chooseGrantedRole,financialAccessFingerprint,
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
  for (const unknown of ["asab/Other","other/Any","asab/CompanyDashboard/extra",""]) {
    path = unknown;
    assert.match(renderToStaticMarkup(React.createElement(App)),/ليس لديك صلاحية/);
    assert.deepEqual(requests,["asab/CompanyDashboard","asab/ASABPrototype"]);
  }
  path = "asab/CompanyDashboard";
  financialTransition = true;
  assert.doesNotMatch(renderToStaticMarkup(React.createElement(App)),/mounted/);
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
  const dialogs:string[] = [];
  let current = companyAdmin;
  const Shell = ({children}:{children:React.ReactNode})=>React.createElement("div",null,children);
  const CAssetDraftProvider = ({children}:{children:React.ReactNode})=>{
    requests.push("/company/me/asset-drafts");
    return React.createElement("div",null,children);
  };
  const CompanyDashboardInner = new Function(
    "React","useState","useEffect","useRef","useQueryClient","useAuth","useCLang","readEntrySelection",
    "chooseGrantedRole","companyRoles","grantedRoleKeys","pageForRole","DEFAULT_PAGE",
    "useSharedOps","financialAccessFingerprint","Shell","PageRouter","RejectModal","ClarifyModal","LiveChatWidget",
    "CAssetDraftProvider",compiled + "\nreturn CompanyDashboardInner;",
  )(React,React.useState,React.useEffect,React.useRef,()=>({}),
    ()=>({user:current,logout:async()=>{}}),()=>({t:(ar:string)=>ar}),()=>null,
    chooseGrantedRole,companyRoles,grantedRoleKeys,pageForRole,
    {"company-admin":"ca-dashboard",head:"head-dashboard",accountant:"acc-dashboard"},
    ()=>({ops:[],approve:()=>{},reject:()=>{},requestClarification:()=>{},finalApprove:()=>{},
      bulkApprove:()=>{},bulkFinalApprove:()=>{},actionsPending:false,shiftReviewPage:1,
      setShiftReviewPage:()=>{},rejectModalProps:{},clarifyModalProps:{}}),
    financialAccessFingerprint,Shell,({role}:{role:string})=>React.createElement("p",null,role),
    ()=>{dialogs.push("reject");return null;},
    ()=>{dialogs.push("clarify");return null;},()=>null,CAssetDraftProvider,
  ) as React.ComponentType;
  assert.match(renderToStaticMarkup(React.createElement(CompanyDashboardInner)),/company-admin/);
  assert.deepEqual(dialogs,[]);
  current = head;
  assert.match(renderToStaticMarkup(React.createElement(CompanyDashboardInner)),/head/);
  assert.deepEqual(dialogs,["reject","clarify"]);
  assert.deepEqual(requests,[]);
  current = accountant;
  assert.match(renderToStaticMarkup(React.createElement(CompanyDashboardInner)),/accountant/);
  assert.deepEqual(requests,["/company/me/asset-drafts"]);
});

test("actual CompanyDashboard operations hook suppresses cached financial rows and requests outside financial roles", async () => {
  const source = ts.createSourceFile("CompanyDashboard.tsx",
    readFileSync(new URL("../components/mockups/asab/CompanyDashboard.tsx",import.meta.url),"utf8"),
    ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const declaration = source.statements.find(node => ts.isFunctionDeclaration(node)
    && node.name?.text === "useSharedOps");
  assert.ok(declaration);
  const compiled = ts.transpileModule(declaration.getText(source),{
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None},
  }).outputText;
  const configs:Array<{enabled:boolean;queryKey:unknown[];queryFn:()=>Promise<unknown>}> = [];
  const requests:string[] = [];
  const mutation = ()=>({mutate:()=>{},mutateAsync:async()=>{}});
  const useSharedOps = new Function("useQueryClient","useQuery","queryKeys","api",
    "useApproveOperation","useRejectOperation","useFinalApprove","useBulkFinalApprove",
    "useBulkApprove","useRequestClarification","useRef","useState","useMemo","useLayoutEffect",
    "apiOpToCOp","BRANDS","useRejectionReasons",compiled + "\nreturn useSharedOps;",
  )(()=>({getQueryData:()=>undefined}),
    (config:{enabled:boolean;queryKey:unknown[];queryFn:()=>Promise<unknown>})=>{
      configs.push(config);
      return {data:{data:[{id:"secret-operation"}]}};
    },
    {operations:()=>["operations"],operation:()=>["operations","id"]},
    {get:async(url:string)=>{requests.push(url);return {data:{data:[]}};}},
    mutation,mutation,mutation,mutation,mutation,mutation,
    React.useRef,React.useState,React.useMemo,()=>{},(op:{id:string})=>op,{},()=>({data:[]}),
  ) as (role:string)=>{ops:Array<{id:string}>};
  const render = (role:string) => renderToStaticMarkup(React.createElement(() => {
    const {ops} = useSharedOps(role);
    return React.createElement("span",null,ops.map(op=>op.id).join(","));
  }));
  for (const role of ["admin","company-admin","branch","procurement"]) {
    assert.equal(render(role),"<span></span>");
    assert.equal(configs.at(-1)?.enabled,false);
  }
  for (const role of ["accountant","head"]) {
    assert.match(render(role),/secret-operation/);
    assert.equal(configs.at(-1)?.enabled,true);
    assert.equal(configs.at(-1)?.queryKey.at(-1),role);
    await configs.at(-1)!.queryFn();
  }
  assert.deepEqual(requests,["/operations","/operations"]);
});

test("CompanyDashboard role switch hides populated ops and purges cache before selecting the next role", async () => {
  const source = ts.createSourceFile("CompanyDashboard.tsx",
    readFileSync(new URL("../components/mockups/asab/CompanyDashboard.tsx",import.meta.url),"utf8"),
    ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const declaration = source.statements.find(node => ts.isFunctionDeclaration(node)
    && node.name?.text === "CompanyDashboardInner");
  assert.ok(declaration);
  const compiled = ts.transpileModule(declaration.getText(source),{
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None,jsx:ts.JsxEmit.React},
  }).outputText;
  const events:string[] = [];
  let selectRole!: (role:string)=>Promise<void>;
  const subject = identity([grant("head"),grant("accountant","brand",[brandA])]);
  let stateIndex = 0;
  const state = (initial:unknown) => {
    const index = stateIndex++;
    return [initial,(value:unknown)=>events.push(`state${index}:${String(value)}`)];
  };
  const Inner = new Function("React","useState","useEffect","useRef","useQueryClient",
    "useAuth","useCLang","readEntrySelection","chooseGrantedRole","companyRoles",
    "grantedRoleKeys","pageForRole","DEFAULT_PAGE","useSharedOps","financialAccessFingerprint","Shell",
    "PageRouter","RejectModal","ClarifyModal","LiveChatWidget","CAssetDraftProvider",
    "purgeFinancialQueries",compiled + "\nreturn CompanyDashboardInner;",
  )(React,state,()=>{},(value:unknown)=>({current:value}),()=>({}),
    ()=>({user:subject,logout:async()=>{}}),()=>({t:(ar:string)=>ar}),()=>null,
    chooseGrantedRole,companyRoles,grantedRoleKeys,pageForRole,
    {head:"head-dashboard",accountant:"acc-dashboard"},
    ()=>({ops:[{id:"sensitive-op",status:"approved"}],clearDialogs:()=>events.push("clear-dialogs"),
      approve:()=>{},reject:()=>{},requestClarification:()=>{},finalApprove:()=>{},
      bulkApprove:()=>{},bulkFinalApprove:()=>{},actionsPending:false,shiftReviewPage:1,
      setShiftReviewPage:()=>{},rejectModalProps:{},clarifyModalProps:{}}),
    financialAccessFingerprint,
    ({children,onSelectRole}:{children:React.ReactNode;onSelectRole:(role:string)=>Promise<void>})=>{
      selectRole = onSelectRole;
      return React.createElement("div",null,children);
    },
    ({ops}:{ops:Array<{id:string}>})=>React.createElement("span",null,ops.map(op=>op.id).join(",")),
    ()=>null,()=>null,()=>null,({children}:{children:React.ReactNode})=>children,
    async()=>{events.push("purge");},
  ) as React.ComponentType;
  assert.match(renderToStaticMarkup(React.createElement(Inner)),/sensitive-op/);
  await selectRole("accountant");
  assert.deepEqual(events,["state0:true","clear-dialogs","purge",
    "state1:accountant","state2:acc-dashboard","state0:false"]);
});

test("ASABPrototype role switch clears local financial ops before the new role mounts", async () => {
  const source = ts.createSourceFile("ASABPrototype.tsx",
    readFileSync(new URL("../components/mockups/asab/ASABPrototype.tsx",import.meta.url),"utf8"),
    ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const root = source.statements.find(node => ts.isFunctionDeclaration(node)
    && node.name?.text === "ASABPrototype");
  assert.ok(root);
  let login:ts.VariableDeclaration|undefined;
  const walk = (node:ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "login") login = node;
    ts.forEachChild(node,walk);
  };
  walk(root);
  assert.ok(login);
  const compiled = ts.transpileModule(`const ${login.getText(source)};`,{
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None},
  }).outputText;
  const events:string[] = [];
  const allowedRoles = ["accountant","head"];
  const switchLock = {current:false};
  const select = new Function("allowedRoles","switchLock","currentRole","setSwitchingRole",
    "purgeFinancialQueries","queryClient","setOps","ROLE_PROFILES","setAppState",
    "tagShiftHistory",compiled + "\nreturn login;",
  )(allowedRoles,switchLock,"accountant",(value:boolean)=>events.push(`switch:${value}`),
    async()=>events.push("purge"),{},(value:unknown)=>events.push(`ops:${JSON.stringify(value)}`),
    {head:{defaultPage:"head-dashboard"}},
    (value:{role:string})=>events.push(`role:${value.role}`),
    (page:string)=>events.push(`history:${page}`),
  ) as (role:string)=>Promise<void>;
  await select("admin");
  assert.deepEqual(events,[]);
  await select("head");
  assert.deepEqual(events,["switch:true","purge","ops:[]","role:head",
    "history:head-dashboard","switch:false"]);
});

test("AuthContext grant narrowing blocks rendering until financial cache is purged", async () => {
  const source = ts.createSourceFile("AuthContext.tsx",
    readFileSync(new URL("./AuthContext.tsx",import.meta.url),"utf8"),
    ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let callback:ts.ArrowFunction|undefined;
  const walk = (node:ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "refreshMe"
      && node.initializer && ts.isCallExpression(node.initializer)
      && ts.isArrowFunction(node.initializer.arguments[0])) callback = node.initializer.arguments[0];
    ts.forEachChild(node,walk);
  };
  walk(source);
  assert.ok(callback);
  const compiled = ts.transpileModule(`const refreshMe = ${callback.getText(source)};`,{
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None},
  }).outputText;
  const events:string[] = [];
  const previous = accountant;
  const narrowed = identity([grant("accountant","brand",[branchA])]);
  const refreshMe = new Function("fetchMe","financialAccessFingerprint","user",
    "setFinancialTransition","purgeFinancialQueries","queryClient","setUser",
    compiled + "\nreturn refreshMe;",
  )(async()=>narrowed,financialAccessFingerprint,previous,
    (value:boolean)=>events.push(`blocked:${value}`),async()=>events.push("purge"),{},
    (value:unknown)=>events.push(`user:${financialAccessFingerprint(value as typeof accountant)}`),
  ) as ()=>Promise<void>;
  await refreshMe();
  assert.deepEqual(events,["blocked:true","purge",
    `user:${financialAccessFingerprint(narrowed)}`,"blocked:false"]);
});
