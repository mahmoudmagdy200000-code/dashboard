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
  assert.deepEqual(grantedRoleKeys(identity([{...grant("branch","branch",[branchA]),
    brandIds:[brandA]}])),["branch"]);
  assert.deepEqual(grantedRoleKeys(identity([{...grant("branch","branch",[branchA]),
    restaurantIds:[restaurantA]}])),["branch"]);
  assert.deepEqual(grantedRoleKeys(identity([{...grant("branch","branch",[branchA]),
    brandIds:[brandA],restaurantIds:[restaurantA]}])),["branch"]);
  assert.deepEqual(grantedRoleKeys(identity([grant("accountant","restaurant",[restaurantA])])),["accountant"]);
  assert.deepEqual(grantedRoleKeys(identity([{...grant("accountant","restaurant",[restaurantA]),
    brandIds:[brandA],branchIds:[branchA]}])),["accountant"]);
  assert.deepEqual(grantedRoleKeys(admin),["admin"]);
  for (const bad of [
    grant("accountant","branch",[branchA]), grant("branch","brand",[brandA]),
    grant("branch","branch",[]),grant("branch","branch",[branchA,restaurantA]),
    {...grant("branch","branch",[branchA]),brandIds:[brandA,branchA]},
    {...grant("branch","branch",[branchA]),restaurantIds:[restaurantA,branchA]},
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

test("S1H-F06: role change cache isolation covers reports, audit-logs, attachments, platform/reminders, company, modules, exceptions, exports and preserves auth identity", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0, retry: false } } });

  const testNamespaces: Array<[readonly unknown[], unknown]> = [
    [["reports", "catalog"], { report: "secret" }],
    [["audit-logs", { filter: "recent" }], { log: "sensitive-audit" }],
    [["attachments", "att-42"], { file: "doc.pdf" }],
    [["reminders", "missing"], { count: 3 }],
    [["platform", "reminders", "rules"], { rule: "active" }],
    [["company", "subscription"], { plan: "enterprise" }],
    [["modules", "aggregation"], { modules: ["fin", "ops"] }],
    [["exceptions", { unresolved: true }], { err: "critical" }],
    [["exports", "job", "job-99"], { status: "ready" }],
  ];

  for (const [key, data] of testNamespaces) {
    client.setQueryData(key, data);
  }
  client.setQueryData(["auth", "me"], { id: "user-123", email: "user@example.com" });

  // Verify delayed in-flight responses across sensitive namespaces cannot restore purged cache
  let resolveDelayed!: (value: unknown) => void;
  const delayedPromise = new Promise(resolve => { resolveDelayed = resolve; });
  const inFlightQuery = client.fetchQuery({
    queryKey: ["reports", "pending-run"],
    queryFn: () => delayedPromise,
  });
  const inFlightHandled = inFlightQuery.catch(() => "cancelled");

  await purgeFinancialQueries(client);

  resolveDelayed({ report: "late-arriving-data" });
  await inFlightHandled;

  // Assert all sensitive namespaces were purged
  for (const [key] of testNamespaces) {
    assert.equal(client.getQueryData(key), undefined, `Query key ${JSON.stringify(key)} must be removed from cache`);
  }
  assert.equal(client.getQueryData(["reports", "pending-run"]), undefined, "Late arriving query response must not restore purged cache");

  // Assert auth identity query data is strictly preserved
  assert.deepEqual(client.getQueryData(["auth", "me"]), { id: "user-123", email: "user@example.com" });

  client.clear();
});

test("S1H-F06-EXT-A: delayed in-flight audit-logs response cannot restore purged cache; auth/me preserved", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0, retry: false } } });
  client.setQueryData(["audit-logs", { filter: "recent" }], { log: "pre-purge-sensitive" });
  client.setQueryData(["audit-logs", "summary"], { total: 42 });
  client.setQueryData(["auth", "me"], { id: "user-ext-a", email: "a@example.com" });

  let resolveAudit!: (value: unknown) => void;
  const auditPromise = new Promise(resolve => { resolveAudit = resolve; });
  const inFlight = client.fetchQuery({ queryKey: ["audit-logs", "live"], queryFn: () => auditPromise });
  const inFlightHandled = inFlight.catch(() => "cancelled");

  await purgeFinancialQueries(client);

  resolveAudit({ log: "late-audit-response" });
  await inFlightHandled;

  assert.equal(client.getQueryData(["audit-logs", { filter: "recent" }]), undefined, "audit-logs pre-purge cache must be cleared");
  assert.equal(client.getQueryData(["audit-logs", "summary"]), undefined, "audit-logs summary must be cleared");
  assert.equal(client.getQueryData(["audit-logs", "live"]), undefined, "audit-logs in-flight late response must not restore cache");
  assert.deepEqual(client.getQueryData(["auth", "me"]), { id: "user-ext-a", email: "a@example.com" });

  client.clear();
});

test("S1H-F06-EXT-B: delayed in-flight attachments response cannot restore purged cache; auth/me preserved", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0, retry: false } } });
  client.setQueryData(["attachments", "att-01"], { file: "sensitive.pdf" });
  client.setQueryData(["attachments", "list", { page: 1 }], { items: ["att-01"] });
  client.setQueryData(["auth", "me"], { id: "user-ext-b", email: "b@example.com" });

  let resolveAttach!: (value: unknown) => void;
  const attachPromise = new Promise(resolve => { resolveAttach = resolve; });
  const inFlight = client.fetchQuery({ queryKey: ["attachments", "pending-upload"], queryFn: () => attachPromise });
  const inFlightHandled = inFlight.catch(() => "cancelled");

  await purgeFinancialQueries(client);

  resolveAttach({ file: "late-upload-response.pdf" });
  await inFlightHandled;

  assert.equal(client.getQueryData(["attachments", "att-01"]), undefined, "attachments pre-purge cache must be cleared");
  assert.equal(client.getQueryData(["attachments", "list", { page: 1 }]), undefined, "attachments list must be cleared");
  assert.equal(client.getQueryData(["attachments", "pending-upload"]), undefined, "attachments in-flight late response must not restore cache");
  assert.deepEqual(client.getQueryData(["auth", "me"]), { id: "user-ext-b", email: "b@example.com" });

  client.clear();
});

test("GO-15 A01: LoginPage and ForgotPasswordPage bind programmatic labels to all inputs", () => {
  const loginSrc = readFileSync(new URL("./LoginPage.tsx", import.meta.url), "utf8");
  assert.match(loginSrc, /<label\s+htmlFor="login-email"/);
  assert.match(loginSrc, /<input\s+[^>]*id="login-email"/);
  assert.match(loginSrc, /<label\s+htmlFor="login-password"/);
  assert.match(loginSrc, /<input\s+[^>]*id="login-password"/);
  assert.match(loginSrc, /<label\s+htmlFor="login-two-factor-code"/);
  assert.match(loginSrc, /<input\s+[^>]*id="login-two-factor-code"/);

  const forgotSrc = readFileSync(new URL("./ForgotPasswordPage.tsx", import.meta.url), "utf8");
  assert.match(forgotSrc, /<label\s+htmlFor="forgot-password-email"/);
  assert.match(forgotSrc, /<input\s+[^>]*id="forgot-password-email"/);
  assert.match(forgotSrc, /<label\s+htmlFor="forgot-password-token"/);
  assert.match(forgotSrc, /<input\s+[^>]*id="forgot-password-token"/);
  assert.match(forgotSrc, /<label\s+htmlFor="forgot-password-new-password"/);
  assert.match(forgotSrc, /<input\s+[^>]*id="forgot-password-new-password"/);
});

test("GO-15 A02: LoginPage password reveal button is keyboard accessible with trailing positioning and non-colliding padding", () => {
  const loginSrc = readFileSync(new URL("./LoginPage.tsx", import.meta.url), "utf8");
  // type="button" and no tabIndex={-1}
  assert.match(loginSrc, /<button\s+[^>]*type="button"[^>]*onClick=\{\(\)\s*=>\s*setShowPassword/);
  assert.doesNotMatch(loginSrc, /setShowPassword[\s\S]*?tabIndex=\{-1\}/);
  // Trailing positioning (insetInlineEnd)
  assert.match(loginSrc, /insetInlineEnd:\s*8/);
  // Non-colliding padding matching lang
  assert.match(loginSrc, /paddingLeft:\s*lang\s*===\s*"ar"\s*\?\s*52\s*:\s*14/);
  assert.match(loginSrc, /paddingRight:\s*lang\s*===\s*"ar"\s*\?\s*14\s*:\s*52/);
  // Localized accessible name
  assert.match(loginSrc, /aria-label=\{showPassword\s*\?\s*t\("إخفاء كلمة المرور",\s*"Hide password"\)\s*:\s*t\("إظهار كلمة المرور",\s*"Show password"\)\}/);
});

const brandB = "44444444-4444-4444-8444-444444444444";
const restaurantB = "55555555-5555-4555-8555-555555555555";
const branchB = "66666666-6666-4666-8666-666666666666";
const companyUuidA = "77777777-7777-4777-8777-777777777777";
const companyUuidB = "88888888-8888-4888-8888-888888888888";

const harnessBranchGrant = {
  key: "branch",
  scope: "branch",
  brandIds: [brandA],
  restaurantIds: [restaurantA],
  branchIds: [branchA],
  moduleKeys: [],
};

const harnessBranchManager = {
  id: "99999999-9999-4999-8999-999999999999",
  name: "[HARNESS] Branch Manager",
  email: "assab-ui-qa-20261018.branch-manager@fixture.invalid",
  companyId: companyUuidA,
  defaultPage: "/company/me/branch/overview",
  roles: [harnessBranchGrant],
  permissions: {},
};

test("Branch Manager positive grants: accepts populated parent Brand/Restaurant IDs and valid single-branch shapes", () => {
  // 1. Exact live staging harness /auth/me payload (1 brandId, 1 restaurantId, 1 branchId)
  assert.deepEqual(grantedRoleKeys(harnessBranchManager), ["branch"]);
  assert.equal(hasRoleGrant(harnessBranchManager, "branch"), true);
  assert.equal(
    hasRoleGrant(harnessBranchManager, "admin", "company-admin", "head", "accountant", "procurement", "supplier"),
    false,
  );

  // 2. Company Admin invitation-acceptance shape (OnboardController: 1 brandId, 0 restaurantIds, 1 branchId)
  const invitedBranchManager = {
    ...harnessBranchManager,
    roles: [{ ...harnessBranchGrant, restaurantIds: [] }],
  };
  assert.deepEqual(grantedRoleKeys(invitedBranchManager), ["branch"]);

  // 3. Admin direct-creation shape (Admin\UserController: 0 brandIds, 0 restaurantIds, 1 branchId)
  const minimalBranchManager = {
    ...harnessBranchManager,
    roles: [{ ...harnessBranchGrant, brandIds: [], restaurantIds: [] }],
  };
  assert.deepEqual(grantedRoleKeys(minimalBranchManager), ["branch"]);

  // 4. Restaurant-linked single-branch shape with explicit valid moduleKeys
  const restaurantTaggedBranchManager = {
    ...harnessBranchManager,
    roles: [{ ...harnessBranchGrant, brandIds: [], moduleKeys: ["sales", "inventory"] }],
  };
  assert.deepEqual(grantedRoleKeys(restaurantTaggedBranchManager), ["branch"]);
});

test("Branch Manager negative grants: rejects zero/multiple branches, inconsistent multi-hierarchy, invalid UUIDs, duplicates, and unauthorized roles", () => {
  const invalidGrants: unknown[] = [
    // Zero branchIds (even when parent brandIds/restaurantIds are populated)
    { ...harnessBranchGrant, branchIds: [] },
    { ...harnessBranchGrant, brandIds: [], restaurantIds: [], branchIds: [] },
    // Multiple branchIds (unsupported by single-branch contract)
    { ...harnessBranchGrant, branchIds: [branchA, branchB] },
    { ...harnessBranchGrant, brandIds: [], restaurantIds: [], branchIds: [branchA, branchB] },
    // Wrong scope labels for branch role
    { ...harnessBranchGrant, scope: "all" },
    { ...harnessBranchGrant, scope: "brand" },
    { ...harnessBranchGrant, scope: "restaurant" },
    { ...harnessBranchGrant, scope: "tenant" },
    // Inconsistent multi-brand or multi-restaurant arrays on a single-branch grant (blocks TenantBranchResolver widening)
    { ...harnessBranchGrant, brandIds: [brandA, brandB] },
    { ...harnessBranchGrant, restaurantIds: [restaurantA, restaurantB] },
    // Invalid, whitespace-padded, or duplicate UUIDs in any hierarchy array
    { ...harnessBranchGrant, branchIds: ["not-a-uuid"] },
    { ...harnessBranchGrant, branchIds: [` ${branchA} `] },
    { ...harnessBranchGrant, brandIds: ["invalid-brand-uuid"] },
    { ...harnessBranchGrant, brandIds: [brandA, brandA] },
    { ...harnessBranchGrant, restaurantIds: ["invalid-restaurant-uuid"] },
    { ...harnessBranchGrant, restaurantIds: [restaurantA, restaurantA] },
    // Malformed payloads (missing arrays, null, non-array fields, invalid moduleKeys)
    { key: "branch", scope: "branch", branchIds: [branchA] },
    { ...harnessBranchGrant, brandIds: null },
    { ...harnessBranchGrant, restaurantIds: undefined },
    { ...harnessBranchGrant, branchIds: branchA },
    { ...harnessBranchGrant, moduleKeys: null },
    { ...harnessBranchGrant, moduleKeys: ["INVALID_UPPER"] },
    { ...harnessBranchGrant, moduleKeys: ["sales", "sales"] },
    // Unauthorized / unknown role keys
    { ...harnessBranchGrant, key: "cashier" },
    { ...harnessBranchGrant, key: "branch_manager" },
    { ...harnessBranchGrant, key: "brand-owner" },
    { ...harnessBranchGrant, key: "" },
  ];

  for (const badGrant of invalidGrants) {
    // Even if legacy top-level role claims "admin" or "branch", invalid /auth/me grants fail closed.
    const subject = { ...harnessBranchManager, role: "admin", roles: [badGrant] };
    assert.deepEqual(grantedRoleKeys(subject), []);
    assert.equal(canOpenDashboard(subject, "asab/CompanyDashboard"), false);
    assert.equal(canOpenDashboard(subject, "asab/ASABPrototype"), false);
    assert.equal(preferredDashboard(subject), null);
  }

  // Duplicate branch role assignments fail closed in either order
  for (const dupRoles of [
    [harnessBranchGrant, harnessBranchGrant],
    [harnessBranchGrant, { ...harnessBranchGrant, branchIds: [branchB] }],
    [harnessBranchGrant, { ...harnessBranchGrant, brandIds: [], restaurantIds: [] }],
  ]) {
    assert.deepEqual(grantedRoleKeys({ ...harnessBranchManager, roles: dupRoles }), []);
    assert.equal(canOpenDashboard({ ...harnessBranchManager, roles: dupRoles }, "asab/CompanyDashboard"), false);
  }

  // Pairing a valid branch grant alongside an unauthorized or malformed sibling grant also fails closed
  assert.deepEqual(
    grantedRoleKeys({ ...harnessBranchManager, roles: [harnessBranchGrant, { ...harnessBranchGrant, key: "cashier" }] }),
    [],
  );
  assert.deepEqual(
    grantedRoleKeys({ ...harnessBranchManager, roles: [harnessBranchGrant, null] }),
    [],
  );
});

test("Branch Manager routing, stale EntrySelection fallback, default landing on branch-overview, and Admin denial", () => {
  // Preferred dashboard and allowed surfaces
  assert.equal(preferredDashboard(harnessBranchManager), "asab/CompanyDashboard");
  assert.equal(canOpenDashboard(harnessBranchManager, "asab/CompanyDashboard"), true);
  assert.equal(canOpenDashboard(harnessBranchManager, "asab/ASABPrototype"), true);
  assert.equal(canOpenDashboard(harnessBranchManager, "asab/AdminDashboard"), false);

  // UI role selection cannot escalate Branch Manager to admin, company-admin, head, or accountant
  for (const escalated of ["admin", "company-admin", "head", "accountant", "procurement", "supplier"]) {
    assert.equal(chooseGrantedRole(harnessBranchManager, companyRoles, escalated), "branch");
    assert.equal(chooseGrantedRole(harnessBranchManager, prototypeRoles, escalated), "branch");
  }
  assert.equal(chooseGrantedRole(harnessBranchManager, ["admin"]), null);

  // Page router prefix isolation keeps Branch Manager on branch-overview and blocks admin/company-admin/finance pages
  assert.equal(pageForRole("branch", "branch-overview", "branch-overview"), "branch-overview");
  assert.equal(pageForRole("branch", "branch-shifts", "branch-overview"), "branch-shifts");
  for (const forbiddenPage of ["admin-overview", "admin-users", "ca-dashboard", "head-dashboard", "acc-dashboard", "acc-shifts", "/company/me/branch/overview"]) {
    assert.equal(pageForRole("branch", forbiddenPage, "branch-overview"), "branch-overview");
  }

  // Financial operation / shift config hooks remain strictly disabled for Branch Manager
  for (const active of ["branch", "accountant", "head", "admin"] as const) {
    assert.equal(canRunAccountantOperations(harnessBranchManager, active), false);
    assert.equal(canRunShiftHistory(harnessBranchManager, active), false);
    assert.equal(canRunShiftConfigs(harnessBranchManager, active), false);
  }

  // Tenant/hierarchy fingerprint isolation: changing companyId or any hierarchy ID changes the access fingerprint
  assert.notEqual(
    financialAccessFingerprint(harnessBranchManager),
    financialAccessFingerprint({ ...harnessBranchManager, companyId: companyUuidB }),
  );
  assert.notEqual(
    financialAccessFingerprint(harnessBranchManager),
    financialAccessFingerprint({
      ...harnessBranchManager,
      roles: [{ ...harnessBranchGrant, brandIds: [brandB] }],
    }),
  );
  assert.notEqual(
    financialAccessFingerprint(harnessBranchManager),
    financialAccessFingerprint({
      ...harnessBranchManager,
      roles: [{ ...harnessBranchGrant, branchIds: [branchB] }],
    }),
  );

  // Real App.tsx route boundary + post-login redirect effect with valid, null, and stale/incompatible EntrySelection
  const appSource = ts.createSourceFile("App.tsx",
    readFileSync(new URL("../App.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const appDecl = appSource.statements.find(node =>
    ts.isFunctionDeclaration(node) && node.name?.text === "App");
  assert.ok(appDecl);
  const compiledApp = ts.transpileModule(appDecl.getText(appSource), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None, jsx: ts.JsxEmit.React },
  }).outputText;

  let currentUser: unknown = harnessBranchManager;
  let storedSelection: { slug: string; role: string } | null = { slug: "asab/CompanyDashboard", role: "branch" };
  const mockWindow = {
    location: { hash: "#/", pathname: "/" },
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  const mountedPaths: string[] = [];
  const getPreviewPath = () => {
    const m = mockWindow.location.hash.match(/^#\/preview\/(.*)$/);
    return m ? m[1] : null;
  };
  const runAppPass = () => {
    const effects: Array<() => void> = [];
    const App = new Function(
      "React", "useAuth", "useState", "useRef", "useEffect", "ensureAuthStyles", "getPreviewPath",
      "canOpenDashboard", "readEntrySelection", "preferredDashboard", "chooseGrantedRole", "financialAccessFingerprint",
      "prototypeRoles", "companyRoles", "window", "SubscriptionExpiredBanner", "PreviewRenderer", "discoveredModules",
      "ASABLanding",
      compiledApp + "\nreturn App;",
    )(
      React,
      () => ({ user: currentUser, initializing: false, financialTransition: false, logout: async () => {} }),
      React.useState,
      React.useRef,
      (fn: () => void) => { effects.push(fn); },
      () => {},
      getPreviewPath,
      canOpenDashboard,
      () => storedSelection,
      preferredDashboard,
      chooseGrantedRole,
      financialAccessFingerprint,
      prototypeRoles,
      companyRoles,
      mockWindow,
      () => null,
      ({ componentPath }: { componentPath: string }) => {
        mountedPaths.push(componentPath);
        return React.createElement("div", null, `mounted:${componentPath}`);
      },
      {},
      () => React.createElement("div", null, "landing"),
    ) as React.ComponentType;
    const firstHtml = renderToStaticMarkup(React.createElement(App));
    for (const eff of effects) eff();
    const secondHtml = renderToStaticMarkup(React.createElement(App));
    return { firstHtml, secondHtml };
  };

  // Case A: Valid pre-login pick (CompanyDashboard + branch) redirects and mounts CompanyDashboard without denial alert
  mockWindow.location.hash = "#/";
  mountedPaths.length = 0;
  let pass = runAppPass();
  assert.equal(mockWindow.location.hash, "#/preview/asab/CompanyDashboard");
  assert.match(pass.secondHtml, /mounted:asab\/CompanyDashboard/);
  assert.doesNotMatch(pass.secondHtml, /ليس لديك صلاحية/);

  // Case B: Stale/incompatible pre-login pick attempting System Admin (ASABPrototype + admin) falls back to CompanyDashboard
  mockWindow.location.hash = "#/preview/asab/ASABPrototype";
  storedSelection = { slug: "asab/ASABPrototype", role: "admin" };
  mountedPaths.length = 0;
  pass = runAppPass();
  assert.equal(mockWindow.location.hash, "#/preview/asab/CompanyDashboard");
  assert.match(pass.secondHtml, /mounted:asab\/CompanyDashboard/);

  // Case C: Stale unknown dashboard slug falls back safely to CompanyDashboard
  mockWindow.location.hash = "#/";
  storedSelection = { slug: "asab/AdminOnlyDashboard", role: "admin" };
  pass = runAppPass();
  assert.equal(mockWindow.location.hash, "#/preview/asab/CompanyDashboard");

  // Case D: Unprivileged / malformed Branch Manager attempting to open Admin or Company Dashboard is denied
  currentUser = { ...harnessBranchManager, roles: [{ ...harnessBranchGrant, branchIds: [] }] };
  storedSelection = null;
  for (const targetHash of ["#/preview/asab/ASABPrototype", "#/preview/asab/CompanyDashboard"]) {
    mockWindow.location.hash = targetHash;
    mountedPaths.length = 0;
    pass = runAppPass();
    assert.match(pass.firstHtml, /ليس لديك صلاحية للوصول إلى هذه اللوحة/);
    assert.deepEqual(mountedPaths, []);
  }

  // Verify real CompanyDashboardInner + DEFAULT_PAGE + ASABPrototype ROLE_PROFILES land Branch Manager on branch-overview
  const cdRaw = readFileSync(new URL("../components/mockups/asab/CompanyDashboard.tsx", import.meta.url), "utf8");
  assert.match(cdRaw, /const\s+DEFAULT_PAGE[\s\S]*?branch:\s*"branch-overview"/);
  const protoRaw = readFileSync(new URL("../components/mockups/asab/ASABPrototype.tsx", import.meta.url), "utf8");
  assert.match(protoRaw, /branch:\s*\{[^}]*defaultPage:\s*"branch-overview"/);

  const cdSource = ts.createSourceFile("CompanyDashboard.tsx", cdRaw, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const innerDecl = cdSource.statements.find(node =>
    ts.isFunctionDeclaration(node) && node.name?.text === "CompanyDashboardInner");
  assert.ok(innerDecl);
  const compiledInner = ts.transpileModule(innerDecl.getText(cdSource), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None, jsx: ts.JsxEmit.React },
  }).outputText;

  let activeSel: { slug: string; role: string } | null = { slug: "asab/CompanyDashboard", role: "company-admin" };
  const renderedRoutes: Array<{ role: string; page: string }> = [];
  const draftMounts: number[] = [];
  const Inner = new Function(
    "React", "useState", "useEffect", "useRef", "useQueryClient", "useAuth", "useCLang", "readEntrySelection",
    "chooseGrantedRole", "companyRoles", "grantedRoleKeys", "pageForRole", "DEFAULT_PAGE",
    "useSharedOps", "financialAccessFingerprint", "Shell", "PageRouter", "RejectModal", "ClarifyModal", "LiveChatWidget",
    "CAssetDraftProvider",
    compiledInner + "\nreturn CompanyDashboardInner;",
  )(
    React, React.useState, React.useEffect, React.useRef, () => ({}),
    () => ({ user: harnessBranchManager, logout: async () => {} }),
    () => ({ t: (ar: string) => ar }),
    () => activeSel,
    chooseGrantedRole, companyRoles, grantedRoleKeys, pageForRole,
    {
      "company-admin": "ca-dashboard",
      head: "head-dashboard",
      accountant: "acc-dashboard",
      branch: "branch-overview",
      procurement: "proc-overview",
    },
    () => ({
      ops: [], approve: () => {}, reject: () => {}, requestClarification: () => {}, finalApprove: () => {},
      bulkApprove: () => {}, bulkFinalApprove: () => {}, actionsPending: false, shiftReviewPage: 1,
      setShiftReviewPage: () => {}, rejectModalProps: {}, clarifyModalProps: {}, clearDialogs: () => {},
    }),
    financialAccessFingerprint,
    ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
    ({ role, page }: { role: string; page: string }) => {
      renderedRoutes.push({ role, page });
      return React.createElement("span", null, `${role}:${page}`);
    },
    () => null, () => null, () => null,
    ({ children }: { children: React.ReactNode }) => {
      draftMounts.push(1);
      return React.createElement("div", null, children);
    },
  ) as React.ComponentType;

  // Even with a stale "company-admin" EntrySelection, Branch Manager lands on branch:branch-overview
  const htmlStale = renderToStaticMarkup(React.createElement(Inner));
  assert.match(htmlStale, /branch:branch-overview/);
  activeSel = { slug: "asab/CompanyDashboard", role: "branch" };
  const htmlExplicit = renderToStaticMarkup(React.createElement(Inner));
  assert.match(htmlExplicit, /branch:branch-overview/);
  assert.deepEqual(renderedRoutes, [
    { role: "branch", page: "branch-overview" },
    { role: "branch", page: "branch-overview" },
  ]);
  assert.deepEqual(draftMounts, []);
});

test("Non-regression matrix: Accountant, Head Accountant, Company Admin, Procurement, and System Admin authorization remain intact", () => {
  const procurementTenant = identity([grant("procurement", "brand", [brandA])]);
  const procurementPlatform = { ...identity([grant("procurement", "all")]), companyId: null };
  const headScoped = identity([grant("head", "brand", [brandA])]);
  const companyAdminAll = identity([grant("company-admin", "all")]);
  const accountantRest = identity([grant("accountant", "restaurant", [restaurantA])]);

  assert.deepEqual(grantedRoleKeys(admin), ["admin"]);
  assert.deepEqual(grantedRoleKeys(companyAdminAll), ["company-admin"]);
  assert.deepEqual(grantedRoleKeys(head), ["head"]);
  assert.deepEqual(grantedRoleKeys(headScoped), ["head"]);
  assert.deepEqual(grantedRoleKeys(accountant), ["accountant"]);
  assert.deepEqual(grantedRoleKeys(accountantRest), ["accountant"]);
  assert.deepEqual(grantedRoleKeys(procurementTenant), ["procurement"]);
  assert.deepEqual(grantedRoleKeys(procurementPlatform), ["procurement"]);

  // Preserved negative rules on other roles:
  // - System Admin cannot carry hierarchy IDs or non-"all" scope
  assert.deepEqual(grantedRoleKeys(identity([{ ...grant("admin", "all"), brandIds: [brandA] }])), []);
  assert.deepEqual(grantedRoleKeys(identity([grant("admin", "brand", [brandA])])), []);
  // - Accountant cannot use scope="all" or scope="branch" or empty brand/restaurant scope
  assert.deepEqual(grantedRoleKeys(identity([grant("accountant", "all")])), []);
  assert.deepEqual(grantedRoleKeys(identity([grant("accountant", "branch", [branchA])])), []);
  assert.deepEqual(grantedRoleKeys(identity([grant("accountant", "brand", [])])), []);
  // - Scoped non-"all" roles with zero IDs across all hierarchy arrays remain rejected
  assert.deepEqual(grantedRoleKeys(identity([grant("head", "brand", [])])), []);
  assert.deepEqual(grantedRoleKeys(identity([grant("company-admin", "brand", [])])), []);
  assert.deepEqual(grantedRoleKeys(identity([grant("procurement", "branch", [])])), []);

  // Dashboard surface boundaries remain intact for every existing role
  assert.equal(canOpenDashboard(admin, "asab/ASABPrototype"), true);
  assert.equal(canOpenDashboard(admin, "asab/CompanyDashboard"), false);
  assert.equal(preferredDashboard(admin), "asab/ASABPrototype");

  assert.equal(canOpenDashboard(companyAdminAll, "asab/CompanyDashboard"), true);
  assert.equal(canOpenDashboard(companyAdminAll, "asab/ASABPrototype"), false);
  assert.equal(preferredDashboard(companyAdminAll), "asab/CompanyDashboard");

  for (const subject of [head, headScoped, accountant, accountantRest, procurementTenant, procurementPlatform]) {
    assert.equal(canOpenDashboard(subject, "asab/CompanyDashboard"), true);
    assert.equal(canOpenDashboard(subject, "asab/ASABPrototype"), true);
    assert.equal(preferredDashboard(subject), "asab/CompanyDashboard");
  }
});
