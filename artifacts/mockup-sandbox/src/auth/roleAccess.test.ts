import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MutationObserver, QueryClient, QueryClientProvider, QueryObserver, useQueryClient } from "@tanstack/react-query";
import { getHeadReviewPolicy, headLegacyBulkIds, runHeadFinalApproval } from "../components/mockups/asab/headReviewGuards.ts";
import { getSalesActionPolicy } from "../components/mockups/asab/salesActionGuards.ts";
import {
  canOpenDashboard, canRunAccountantOperations, canRunShiftConfigs, canRunShiftHistory,
  chooseGrantedRole, companyRoles, grantedRoleKeys, hasRoleGrant, pageForRole,
  preferredDashboard, prototypeRoles, purgeFinancialQueries, financialAccessFingerprint,
  financialAccessGeneration, registerFinancialRequest, clearRetiredQueryClient,
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

function actualRefreshHarness(fetchMe:()=>Promise<unknown>) {
  const source=ts.createSourceFile("AuthContext.tsx",
    readFileSync(new URL("./AuthContext.tsx",import.meta.url),"utf8"),
    ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let callback:ts.ArrowFunction|undefined;
  const walk=(node:ts.Node)=>{
    if(ts.isVariableDeclaration(node)&&node.name.getText(source)==="refreshMe"
      &&node.initializer&&ts.isCallExpression(node.initializer)&&ts.isArrowFunction(node.initializer.arguments[0]))
      callback=node.initializer.arguments[0];
    ts.forEachChild(node,walk);
  };
  walk(source);assert.ok(callback);
  const compiled=ts.transpileModule(`const refreshMe = ${callback.getText(source)};`,{
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None},
  }).outputText;
  const refreshRequest={current:0};
  const sessionEpoch={current:0};
  const writes:unknown[]=[];
  const transitions:boolean[]=[];
  const refreshMe=new Function("fetchMe","refreshRequest","sessionEpoch","applyFreshUser","setFinancialTransition",
    compiled+"\nreturn refreshMe;")(
      fetchMe,refreshRequest,sessionEpoch,
      async(value:unknown,isCurrent:()=>boolean)=>{if(isCurrent()) writes.push(value);},
      (value:boolean)=>transitions.push(value),
    ) as ()=>Promise<void>;
  return {refreshMe,refreshRequest,sessionEpoch,writes,transitions};
}

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
    {...grant("branch","branch",[branchA]),brandIds:[brandA]},
    {...grant("branch","branch",[branchA]),restaurantIds:[restaurantA]},
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

test("financial and shared cache cancellation preserves auth queries and ignores late responses", async () => {
  const client = new QueryClient({defaultOptions:{queries:{retry:false}}});
  let finish!: (value:string)=>void;
  const pending = new Promise<string>(resolve => {finish = resolve;});
  const observer = new QueryObserver(client,{queryKey:["operations",{page:1}],queryFn:()=>pending});
  const unsubscribe = observer.subscribe(()=>{});
  client.setQueryData(["shifts","history"],{secret:"shift"});
  client.setQueryData(["asset-drafts"],{secret:"draft"});
  client.setQueryData(["platform","accountant","operations"],{secret:"platform"});
  client.setQueryData(["platform","admin","overview"],{secret:"admin"});
  client.setQueryData(["notifications",{}],{privateNotification:true});
  client.setQueryData(["auth","me"],{safe:true});
  const inFlight = observer.refetch();
  await purgeFinancialQueries(client);
  finish("late financial data");
  await inFlight;
  assert.equal(client.getQueryData(["operations",{page:1}]),undefined);
  assert.equal(client.getQueryData(["shifts","history"]),undefined);
  assert.equal(client.getQueryData(["asset-drafts"]),undefined);
  assert.equal(client.getQueryData(["platform","accountant","operations"]),undefined);
  assert.equal(client.getQueryData(["platform","admin","overview"]),undefined);
  assert.equal(client.getQueryData(["notifications",{}]),undefined);
  assert.deepEqual(client.getQueryData(["auth","me"]),{safe:true});
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

test("tenant client rotation isolates mounted QueryClientProvider from late query and mutation responses", async () => {
  const defaults={queries:{retry:false,gcTime:0},mutations:{retry:false,gcTime:0}};
  const oldClient = new QueryClient({defaultOptions:defaults});
  let resolveMutation!: (value:unknown)=>void;
  let resolveQuery!: (value:unknown)=>void;
  const mutationResult = new Promise(resolve=>{resolveMutation=resolve;});
  const queryResult = new Promise(resolve=>{resolveQuery=resolve;});
  const mutation = new MutationObserver(oldClient,{
    mutationFn:()=>mutationResult,
    onSuccess:data=>oldClient.setQueryData(["company","settings"],data),
  });
  const observer = new QueryObserver(oldClient,{queryKey:["company","subscription"],queryFn:()=>queryResult});
  const unsubscribe=observer.subscribe(()=>{});
  const oldMutation=mutation.mutate();
  oldClient.setQueryData(["company","settings"],{company:"A"});
  const retired=clearRetiredQueryClient(oldClient);
  const newClient=new QueryClient({defaultOptions:defaults});
  newClient.setQueryData(["company","settings"],{company:"B"});
  newClient.setQueryData(["company","subscription"],{company:"B"});
  const activeClient=()=>{
    function Probe(){return React.createElement("span",null,useQueryClient()===newClient?"client-B":"wrong-client");}
    return renderToStaticMarkup(React.createElement(QueryClientProvider,{client:newClient,key:"company-B"},React.createElement(Probe)));
  };
  assert.match(activeClient(),/client-B/);
  await retired;
  resolveMutation({company:"A",source:"late mutation"});
  resolveQuery({company:"A",source:"late query ignores cancellation"});
  await oldMutation;
  await Promise.resolve();
  assert.deepEqual(newClient.getQueryData(["company","settings"]),{company:"B"});
  assert.deepEqual(newClient.getQueryData(["company","subscription"]),{company:"B"});
  assert.deepEqual(oldClient.getQueryData(["company","settings"]),{company:"A",source:"late mutation"});
  assert.match(activeClient(),/client-B/);
  unsubscribe();mutation.reset();oldClient.clear();newClient.clear();
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
    [{id:"bulk-op",moduleKey:"purchases",status:"approved"},"bulk"] as const,
    [{id:"return-op",moduleKey:"shifts",status:"approved",reportReview:{phase:"head_review"}},"return"] as const,
  ]) {
    const {actions,client,mutations,requests}=mountHeadActions(operation,run==="return");
    const action=run==="bulk"
      ? actions.bulkFinalApprove([operation.id])
      : actions.rejectModalProps.onSubmit({reason:"RETURN"});
    assert.equal(requests.length,1,run);
    await purgeFinancialQueries(client);
    requests[0].resolve({data:operation});
    await action.catch(() => {});
    assert.deepEqual(mutations,[],run);
    assert.equal(client.getQueryData(["operations",operation.id]),undefined,run);
    client.clear();
  }

  // EXP-06: expenses are explicitly blocked from head bulk approval
  {
    const expenseOp = { id: "expense-blocked-op", moduleKey: "expenses", status: "approved" };
    const { actions, client, mutations, requests } = mountHeadActions(expenseOp);
    await actions.bulkFinalApprove([expenseOp.id]);
    assert.equal(requests.length, 0, "EXP-06: bulk final approval of expenses must emit zero requests");
    assert.deepEqual(mutations, [], "EXP-06: bulk final approval of expenses must emit zero mutations");
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

  const prototypeRaw = readFileSync(new URL("../components/mockups/asab/ASABPrototype.tsx", import.meta.url), "utf8");
  assert.match(prototypeRaw, /import\s*\{[^}]*HeadShiftHistory[^}]*\}\s*from\s*["']\.\/_pages\/head\/HeadShiftHistory["']/);

  for (const [name, filePath] of [
    ["CompanyDashboard.tsx", "../components/mockups/asab/CompanyDashboard.tsx"],
    ["HeadShiftHistory.tsx", "../components/mockups/asab/_pages/head/HeadShiftHistory.tsx"],
  ] as const) {
    const source = ts.createSourceFile(name,
      readFileSync(new URL(filePath, import.meta.url), "utf8"),
      ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const declaration = source.statements.find(node =>
      ts.isFunctionDeclaration(node) && node.name?.text === "HeadShiftHistory");
    assert.ok(declaration, name);
    const declText = declaration.getText(source).replace(/^export\s+/, "");
    const compiled = ts.transpileModule(declText, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None, jsx: ts.JsxEmit.React },
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
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "applyFreshUser"
      && node.initializer && ts.isCallExpression(node.initializer)
      && ts.isArrowFunction(node.initializer.arguments[0])) callback = node.initializer.arguments[0];
    ts.forEachChild(node,walk);
  };
  walk(source);
  assert.ok(callback);
  const compiled = ts.transpileModule(`const applyFreshUser = ${callback.getText(source)};`,{
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None},
  }).outputText;
  const events:string[] = [];
  const previous = accountant;
  const narrowed = identity([grant("accountant","brand",[branchA])]);
  const applyFreshUser = new Function("financialAccessFingerprint","userRef","flushSync",
    "setFinancialTransition","resetQueryClient","purgeFinancialQueries","queryClientRef","setUser",
    compiled + "\nreturn applyFreshUser;",
  )(financialAccessFingerprint,{current:previous},(fn:()=>void)=>fn(),
    (value:boolean)=>events.push(`blocked:${value}`),async()=>{events.push("rotate");return true;},
    async()=>{events.push("purge");return true;},{current:{}},
    (value:unknown)=>events.push(`user:${financialAccessFingerprint(value as typeof accountant)}`),
  ) as (next:typeof narrowed,isCurrent:()=>boolean)=>Promise<boolean>;
  assert.equal(await applyFreshUser(narrowed,()=>true),true);
  assert.deepEqual(events,["blocked:true","purge",
    `user:${financialAccessFingerprint(narrowed)}`]);
});

test("AuthContext rotates the whole client for a company change and keeps targeted purge for role changes", async () => {
  const source=ts.createSourceFile("AuthContext.tsx",readFileSync(new URL("./AuthContext.tsx",import.meta.url),"utf8"),
    ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let callback:ts.ArrowFunction|undefined;
  const walk=(node:ts.Node)=>{
    if(ts.isVariableDeclaration(node)&&node.name.getText(source)==="applyFreshUser"
      &&node.initializer&&ts.isCallExpression(node.initializer)&&ts.isArrowFunction(node.initializer.arguments[0]))
      callback=node.initializer.arguments[0];
    ts.forEachChild(node,walk);
  };walk(source);assert.ok(callback);
  const compiled=ts.transpileModule(`const applyFreshUser = ${callback.getText(source)};`,{
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None},
  }).outputText;
  const make=(previous:typeof accountant)=>{
    let client=new QueryClient({defaultOptions:{queries:{gcTime:0},mutations:{gcTime:0}}});
    client.setQueryData(["company","settings"],{company:previous.companyId??"company-A"});
    const userRef={current:previous};const transitions:boolean[]=[];const calls:string[]=[];
    const apply=new Function("financialAccessFingerprint","userRef","flushSync","setFinancialTransition",
      "resetQueryClient","purgeFinancialQueries","queryClientRef","setUser",
      compiled+"\nreturn applyFreshUser;")(
        financialAccessFingerprint,userRef,(fn:()=>void)=>fn(),(value:boolean)=>transitions.push(value),
        async(isCurrent:()=>boolean)=>{calls.push("clear");const cleared=await clearRetiredQueryClient(client,isCurrent);if(cleared)client=new QueryClient({defaultOptions:{queries:{gcTime:0},mutations:{gcTime:0}}});return cleared;},
        async(_client:QueryClient,isCurrent:()=>boolean)=>{calls.push("purge");return isCurrent();},
        {get current(){return client;}},(value:unknown)=>calls.push(`user:${financialAccessFingerprint(value as typeof accountant)}`),
      ) as (value:typeof accountant,isCurrent:()=>boolean)=>Promise<boolean>;
    return {apply,calls,transitions,getClient:()=>client};
  };
  const companyA={...accountant,companyId:"company-A"};
  const companyB={...accountant,companyId:"company-B"};
  const tenant=make(companyA);
  const oldClient=tenant.getClient();
  assert.equal(await tenant.apply(companyB,()=>true),true);
  assert.deepEqual(tenant.calls.slice(0,1),["clear"]);
  assert.equal(oldClient.getQueryCache().getAll().length,0);
  const narrowed={...identity([grant("accountant","brand",[branchA])]),companyId:"company-A"} as typeof accountant;
  const roleChange=make(companyA);
  assert.equal(await roleChange.apply(narrowed,()=>true),true);
  assert.deepEqual(roleChange.calls,["purge",`user:${financialAccessFingerprint(narrowed)}`]);
});

test("newer /auth/me response wins when overlapping refreshes resolve out of order", async () => {
  const source = ts.createSourceFile("AuthContext.tsx",
    readFileSync(new URL("./AuthContext.tsx",import.meta.url),"utf8"),
    ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let callback:ts.ArrowFunction|undefined;
  const walk=(node:ts.Node)=>{
    if(ts.isVariableDeclaration(node)&&node.name.getText(source)==="refreshMe"
      &&node.initializer&&ts.isCallExpression(node.initializer)&&ts.isArrowFunction(node.initializer.arguments[0]))
      callback=node.initializer.arguments[0];
    ts.forEachChild(node,walk);
  };
  walk(source); assert.ok(callback);
  const compiled=ts.transpileModule(`const refreshMe = ${callback.getText(source)};`,{
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None},
  }).outputText;
  const first=identity([grant("accountant","brand",[brandA])]);
  const second={...identity([grant("accountant","brand",[restaurantA])]),companyId:"company-b"};
  const resolvers:Array<(user:typeof first)=>void>=[];
  const writes:unknown[]=[];
  const refreshRequest={current:0};
  const sessionEpoch={current:0};
  const refreshMe=new Function("fetchMe","refreshRequest","sessionEpoch","applyFreshUser","setFinancialTransition",
    compiled+"\nreturn refreshMe;")(
      ()=>new Promise(resolve=>resolvers.push(resolve)),refreshRequest,sessionEpoch,
      async(value:unknown,isCurrent:()=>boolean)=>{if(isCurrent()) writes.push(value);},
      ()=>{},
    ) as ()=>Promise<void>;
  const older=refreshMe();
  const newer=refreshMe();
  resolvers[1](second); await newer;
  resolvers[0](first); await older;
  assert.equal(writes.at(-1),second);
});

test("an obsolete refresh rejection cannot replace the latest user or transition state", async () => {
  const resolvers:Array<{resolve:(value:unknown)=>void;reject:(error:Error)=>void}>=[];
  const harness=actualRefreshHarness(()=>new Promise((resolve,reject)=>resolvers.push({resolve,reject})));
  const older=harness.refreshMe();
  const newer=harness.refreshMe();
  const current=identity([grant("accountant","restaurant",[restaurantA])]);
  resolvers[1].resolve(current);await newer;
  resolvers[0].reject(new Error("late old failure"));
  await assert.doesNotReject(older);
  assert.deepEqual(harness.writes,[current]);
  assert.deepEqual(harness.transitions,[false]);
});

test("logout, forced logout and login session boundaries invalidate pending refresh responses", async () => {
  const source=ts.createSourceFile("AuthContext.tsx",readFileSync(new URL("./AuthContext.tsx",import.meta.url),"utf8"),
    ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const declaration=source.statements.flatMap(node=>{
    const found:ts.VariableDeclaration[]=[];
    const walk=(child:ts.Node)=>{if(ts.isVariableDeclaration(child)&&child.name.getText(source)==="invalidateSessionRequests") found.push(child);ts.forEachChild(child,walk);};
    walk(node);return found;
  })[0];
  const initializer=declaration?.initializer;
  const invalidator=initializer&&ts.isCallExpression(initializer)&&ts.isArrowFunction(initializer.arguments[0])
    ? initializer.arguments[0]
    : initializer&&ts.isArrowFunction(initializer)?initializer:undefined;
  assert.ok(invalidator);
  const compiled=ts.transpileModule(`const invalidateSessionRequests = ${invalidator.getText(source)};`,{
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None},
  }).outputText;
  for(const caller of ["logout","forced logout","login","loginWith2fa"]) {
    const body=caller==="forced logout"
      ? source.getText(source).slice(source.getText(source).indexOf('window.addEventListener("asab:auth:logout"'))
      : (()=>{
        let result="";
        const walk=(node:ts.Node)=>{
          if(ts.isVariableDeclaration(node)&&node.name.getText(source)===caller&&node.initializer) result=node.initializer.getText(source);
          ts.forEachChild(node,walk);
        };walk(source);return result;
      })();
    assert.match(body,/invalidateSessionRequests\(/,caller);
  }
  const requests:Array<{resolve:(value:unknown)=>void}>=[];
  const harness=actualRefreshHarness(()=>new Promise(resolve=>requests.push({resolve})));
  const pending=harness.refreshMe();
  const beforeSession=harness.sessionEpoch.current;
  const beforeRequest=harness.refreshRequest.current;
  // Exercise the same invalidator used by logout, forced logout and both login paths.
  const activeInvalidator=new Function("sessionEpoch","refreshRequest",compiled+"\nreturn invalidateSessionRequests;")(
    harness.sessionEpoch,harness.refreshRequest,
  ) as ()=>void;
  activeInvalidator();
  assert.equal(harness.sessionEpoch.current,beforeSession+1);
  assert.equal(harness.refreshRequest.current,beforeRequest+1);
  requests[0].resolve(accountant);await pending;
  assert.deepEqual(harness.writes,[]);
  assert.deepEqual(harness.transitions,[]);
});

test("bootstrap /auth/me response is discarded after a later session boundary", async () => {
  const source=ts.createSourceFile("AuthContext.tsx",readFileSync(new URL("./AuthContext.tsx",import.meta.url),"utf8"),
    ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let bootstrap:ts.FunctionDeclaration|undefined;
  const walk=(node:ts.Node)=>{if(ts.isFunctionDeclaration(node)&&node.name?.text==="bootstrap")bootstrap=node;ts.forEachChild(node,walk);};
  walk(source);assert.ok(bootstrap);
  const compiled=ts.transpileModule(bootstrap.getText(source),{
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None},
  }).outputText;
  const sessionEpoch={current:0};const refreshRequest={current:0};
  let resolveFetch!:(value:unknown)=>void;const writes:string[]=[];
  const run=new Function("sessionEpoch","refreshRequest","getTokens","fetchMe","userRef","setUser","clearTokens","setInitializing","cancelled",
    compiled+"\nreturn bootstrap;")(
      sessionEpoch,refreshRequest,()=>({accessToken:"old-session"}),()=>new Promise(resolve=>{resolveFetch=resolve;}),
      {current:null},()=>writes.push("user"),()=>writes.push("clear-token"),()=>writes.push("initialized"),false,
  ) as ()=>Promise<void>;
  const pending=run();
  sessionEpoch.current++;refreshRequest.current++;
  resolveFetch(accountant);await pending;
  assert.deepEqual(writes,[]);
});
