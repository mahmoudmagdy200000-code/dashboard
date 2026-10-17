import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import axios, { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from "axios";
import ts from "typescript";
import { createServer } from "vite";

process.env.VITE_API_BASE_URL ??= "https://auth-session.test";
const storage = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value); },
    removeItem: (key: string) => { storage.delete(key); },
  },
});
if (!globalThis.window) Object.defineProperty(globalThis, "window", { configurable: true, value: new EventTarget() });
if (!globalThis.CustomEvent) Object.defineProperty(globalThis, "CustomEvent", { configurable: true, value: class<T> extends Event {
  detail: T;
  constructor(type: string, init?: CustomEventInit<T>) { super(type); this.detail = init?.detail as T; }
} });

const vite = await createServer({
  configFile: false,
  root: process.cwd(),
  appType: "custom",
  logLevel: "silent",
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, hmr: false },
});
const [{ api }, auth, tokens] = await Promise.all([
  vite.ssrLoadModule("/src/api/client.ts"),
  vite.ssrLoadModule("/src/api/auth.ts"),
  vite.ssrLoadModule("/src/api/tokens.ts"),
]);

function authContextCallback(name: "login" | "loginWith2fa" | "applyFreshUser") {
  const source = ts.createSourceFile("AuthContext.tsx",
    readFileSync(new URL("../auth/AuthContext.tsx", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback: ts.ArrowFunction | undefined;
  const walk = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name
      && node.initializer && ts.isCallExpression(node.initializer)
      && ts.isArrowFunction(node.initializer.arguments[0])) callback = node.initializer.arguments[0];
    ts.forEachChild(node, walk);
  };
  walk(source);
  assert.ok(callback, `AuthContext ${name} callback exists`);
  return ts.transpileModule(`(${callback.getText(source)})`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
}

function makeAuthContextCallbacks() {
  const sessionEpoch = { current: 0 };
  const refreshRequest = { current: 0 };
  const userRef: { current: unknown } = { current: null };
  const logoutPending = { current: null as Promise<void> | null };
  let uiUser: unknown = null;
  const setUser = (value: unknown) => { uiUser = value; userRef.current = value; };
  const setFinancialTransition = (_value: boolean) => {};
  const setLoggingIn = (_value: boolean) => {};
  const setInitializing = (_value: boolean) => {};
  const setDefaultPage = (_value: string | null) => {};
  const flushSync = (callback: () => void) => callback();
  const invalidateSessionRequests = () => { sessionEpoch.current++; refreshRequest.current++; };
  const resetQueryClient = async (_isCurrent: () => boolean) => true;
  const queryClientRef = { current: {} };
  const applyFreshUser = new Function("userRef", "setUser", "setFinancialTransition", "flushSync",
    "queryClientRef", "resetQueryClient", "financialAccessFingerprint", "purgeFinancialQueries",
    `return ${authContextCallback("applyFreshUser")};`)(
      userRef, setUser, setFinancialTransition, flushSync, queryClientRef, resetQueryClient,
      () => "same", async () => true,
    ) as (user: unknown, isCurrent: () => boolean, newSession?: boolean) => Promise<boolean>;
  const login = new Function("logoutPending", "invalidateSessionRequests", "sessionEpoch", "setLoggingIn",
    "setInitializing", "flushSync", "setFinancialTransition", "apiLogin", "isTwoFactorChallenge",
    "establishLoginSession", "applyFreshUser", "setDefaultPage",
    `return ${authContextCallback("login")};`)(
      logoutPending, invalidateSessionRequests, sessionEpoch, setLoggingIn, setInitializing, flushSync,
      setFinancialTransition, auth.login, auth.isTwoFactorChallenge, auth.establishLoginSession,
      applyFreshUser, setDefaultPage,
    ) as typeof auth.login;
  const loginWith2fa = new Function("logoutPending", "invalidateSessionRequests", "sessionEpoch", "setLoggingIn",
    "setInitializing", "flushSync", "setFinancialTransition", "apiLoginWithTwoFactor", "isTwoFactorChallenge",
    "establishLoginSession", "applyFreshUser", "setDefaultPage",
    `return ${authContextCallback("loginWith2fa")};`)(
      logoutPending, invalidateSessionRequests, sessionEpoch, setLoggingIn, setInitializing, flushSync,
      setFinancialTransition, auth.loginWithTwoFactor, auth.isTwoFactorChallenge, auth.establishLoginSession,
      applyFreshUser, setDefaultPage,
    ) as (twoFactorToken: string, code: string) => Promise<unknown>;
  return { login, loginWith2fa, invalidateSessionRequests, sessionEpoch, userRef, get uiUser() { return uiUser; } };
}

test.after(async () => {
  api.defaults.adapter = axios.defaults.adapter;
  await vite.close();
});

type TokenPair = { accessToken: string; refreshToken: string };
const pair = (name: string): TokenPair => ({ accessToken: `${name}-access`, refreshToken: `${name}-refresh` });

function response<T>(config: InternalAxiosRequestConfig, data: T, status = 200) {
  return { data, status, statusText: status === 200 ? "OK" : "Unauthorized", headers: {}, config };
}

function unauthorized(config: InternalAxiosRequestConfig) {
  return new AxiosError("unauthorized", "ERR_BAD_REQUEST", config, undefined,
    response(config, { error: { code: "UNAUTHORIZED", message: "Unauthorized", messageAr: "غير مصرح" } }, 401));
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function resetAdapters() {
  api.defaults.adapter = (async config => response(config, {})) as AxiosAdapter;
  axios.defaults.adapter = (async config => response(config, {})) as AxiosAdapter;
}

test("password login returns tokens without writing before its session controller accepts them", async () => {
  resetAdapters();
  tokens.setTokens(pair("existing"));
  let authorization: string | undefined;
  api.defaults.adapter = (async config => {
    authorization = config.headers.get("Authorization") as string | undefined;
    return response(config, {
      accessToken: "login-access", refreshToken: "login-refresh", user: { id: "user-login" }, defaultPage: null,
    });
  }) as AxiosAdapter;

  const result = await auth.login("a@example.test", "pw");
  assert.equal(result.accessToken, "login-access");
  assert.deepEqual(tokens.getTokens(), pair("existing"));
  assert.equal(authorization, undefined);
});

test("2FA login returns tokens without committing them ahead of its session controller", async () => {
  resetAdapters();
  tokens.setTokens(pair("existing"));
  api.defaults.adapter = (async config => response(config, {
    accessToken: "2fa-access", refreshToken: "2fa-refresh", user: { id: "user-2fa" }, defaultPage: null,
  })) as AxiosAdapter;

  const result = await auth.loginWithTwoFactor("challenge", "123456");
  assert.equal(result.accessToken, "2fa-access");
  assert.deepEqual(tokens.getTokens(), pair("existing"));
});

test("logout completion cannot clear a token pair committed by a newer session", async () => {
  resetAdapters();
  tokens.setTokens(pair("logout-session"));
  const logoutResponse = deferred<ReturnType<typeof response>>();
  api.defaults.adapter = (config => logoutResponse.promise.then(value => ({ ...value, config }))) as AxiosAdapter;

  const logout = auth.logout();
  await Promise.resolve();
  tokens.setTokens(pair("new-session"));
  logoutResponse.resolve(response({} as InternalAxiosRequestConfig, {}));
  await logout;

  assert.deepEqual(tokens.getTokens(), pair("new-session"));
});

test("logout request from A is not dispatched with B's Authorization header", async () => {
  resetAdapters();
  tokens.setTokens(pair("A"));
  let logoutRequests = 0;
  api.defaults.adapter = (async config => {
    if (config.url?.includes("/auth/logout")) logoutRequests++;
    return response(config, {});
  }) as AxiosAdapter;

  const logout = auth.logout();
  tokens.setTokens(pair("B"));
  await logout;

  assert.equal(logoutRequests, 0);
  assert.deepEqual(tokens.getTokens(), pair("B"));
});

test("logout clears its session after a same-session refresh but does not clear a replacement", async () => {
  resetAdapters();
  tokens.setTokens(pair("logout-session"));
  const logoutResponse = deferred<ReturnType<typeof response>>();
  api.defaults.adapter = (config => logoutResponse.promise.then(value => ({ ...value, config }))) as AxiosAdapter;

  const logout = auth.logout();
  await Promise.resolve();
  const snapshot = tokens.getTokenState();
  assert.equal(tokens.rotateTokensIfCurrent(snapshot, pair("logout-session-rotated")), true);
  logoutResponse.resolve(response({} as InternalAxiosRequestConfig, {}));
  await logout;

  assert.equal(tokens.getTokens(), null);
});

test("concurrent login and 2FA responses remain uncommitted until their controller accepts one", async () => {
  resetAdapters();
  tokens.setTokens(pair("existing"));
  const loginResponse = deferred<ReturnType<typeof response>>();
  const twoFactorResponse = deferred<ReturnType<typeof response>>();
  api.defaults.adapter = (config => config.data && String(config.data).includes("twoFactorToken")
    ? twoFactorResponse.promise.then(value => ({ ...value, config }))
    : loginResponse.promise.then(value => ({ ...value, config }))) as AxiosAdapter;

  const login = auth.login("a@example.test", "pw");
  const twoFactor = auth.loginWithTwoFactor("challenge", "123456");
  twoFactorResponse.resolve(response({} as InternalAxiosRequestConfig, {
    accessToken: "two-factor-access", refreshToken: "two-factor-refresh", user: { id: "user-2fa" }, defaultPage: null,
  }));
  loginResponse.resolve(response({} as InternalAxiosRequestConfig, {
    accessToken: "login-access", refreshToken: "login-refresh", user: { id: "user-login" }, defaultPage: null,
  }));

  await Promise.all([login, twoFactor]);
  assert.deepEqual(tokens.getTokens(), pair("existing"));
});

test("latest login wins: only B commits credentials and hydrates B identity", async () => {
  resetAdapters();
  tokens.clearTokens();
  const loginA = deferred<ReturnType<typeof response>>();
  const loginB = deferred<ReturnType<typeof response>>();
  const meRequests: Array<{ authorization: string | undefined; id: string }> = [];
  api.defaults.adapter = (async config => {
    if (config.url?.includes("/auth/login")) {
      const body = JSON.parse(String(config.data)) as { email: string };
      return (body.email === "B" ? loginB.promise : loginA.promise).then(value => ({ ...value, config }));
    }
    const authorization = config.headers.get("Authorization") as string | undefined;
    const id = authorization === "Bearer B-access" ? "user-B" : "user-A";
    meRequests.push({ authorization, id });
    return response(config, { id, companyId: null, roles: [], permissions: {} });
  }) as AxiosAdapter;

  let activeGeneration = 1;
  const generationA = activeGeneration;
  const requestA = auth.login("A", "pw");
  activeGeneration++;
  const generationB = activeGeneration;
  const requestB = auth.login("B", "pw");
  const isBCurrent = () => generationB === activeGeneration;
  const isACurrent = () => generationA === activeGeneration;

  loginB.resolve(response({} as InternalAxiosRequestConfig, {
    accessToken: "B-access", refreshToken: "B-refresh",
    user: { id: "user-B", companyId: null }, companyId: null, defaultPage: "asab/CompanyDashboard",
  }));
  const resultB = await requestB;
  const userB = await auth.establishLoginSession(resultB, isBCurrent);
  assert.equal(userB?.id, "user-B");

  loginA.resolve(response({} as InternalAxiosRequestConfig, {
    accessToken: "A-access", refreshToken: "A-refresh",
    user: { id: "user-A", companyId: null }, companyId: null, defaultPage: "asab/CompanyDashboard",
  }));
  const resultA = await requestA;
  const staleUserA = await auth.establishLoginSession(resultA, isACurrent);

  assert.equal(staleUserA, null);
  assert.deepEqual(tokens.getTokens(), pair("B"));
  assert.deepEqual(meRequests, [{ authorization: "Bearer B-access", id: "user-B" }]);
});

test("AuthContext login callback keeps both applied UI user and token on B when A resolves last", async () => {
  resetAdapters();
  tokens.clearTokens();
  const ctx = makeAuthContextCallbacks();
  const loginA = deferred<ReturnType<typeof response>>();
  const loginB = deferred<ReturnType<typeof response>>();
  const meRequests: string[] = [];
  api.defaults.adapter = (async config => {
    if (config.url?.includes("/auth/login")) {
      const body = JSON.parse(String(config.data)) as { email: string };
      return (body.email === "B" ? loginB.promise : loginA.promise).then(value => ({ ...value, config }));
    }
    const authorization = config.headers.get("Authorization") as string | undefined;
    const id = authorization === "Bearer B-access" ? "user-B" : "user-A";
    meRequests.push(id);
    return response(config, { id, companyId: null, roles: [], permissions: {} });
  }) as AxiosAdapter;

  const promiseA = ctx.login("A", "pw");
  const promiseB = ctx.login("B", "pw");
  loginB.resolve(response({} as InternalAxiosRequestConfig, {
    accessToken: "B-access", refreshToken: "B-refresh",
    user: { id: "user-B", companyId: null }, companyId: null, defaultPage: "asab/CompanyDashboard",
  }));
  await promiseB;
  loginA.resolve(response({} as InternalAxiosRequestConfig, {
    accessToken: "A-access", refreshToken: "A-refresh",
    user: { id: "user-A", companyId: null }, companyId: null, defaultPage: "asab/CompanyDashboard",
  }));
  await promiseA;

  assert.equal((ctx.uiUser as { id?: string } | null)?.id, "user-B");
  assert.equal((ctx.userRef.current as { id?: string } | null)?.id, "user-B");
  assert.deepEqual(tokens.getTokens(), pair("B"));
  assert.deepEqual(meRequests, ["user-B"]);
});

test("a late 2FA login cannot replace a newer password-login session", async () => {
  resetAdapters();
  tokens.clearTokens();
  const ctx = makeAuthContextCallbacks();
  const twoFactorResponse = deferred<ReturnType<typeof response>>();
  const passwordResponse = deferred<ReturnType<typeof response>>();
  const meRequests: string[] = [];
  api.defaults.adapter = (async config => {
    if (config.url?.includes("/auth/login")) {
      const body = JSON.parse(String(config.data)) as { twoFactorToken?: string };
      return (body.twoFactorToken ? twoFactorResponse.promise : passwordResponse.promise)
        .then(value => ({ ...value, config }));
    }
    const authorization = config.headers.get("Authorization") as string | undefined;
    const id = authorization === "Bearer B-access" ? "user-B" : "user-A";
    meRequests.push(id);
    return response(config, { id, companyId: null, roles: [], permissions: {} });
  }) as AxiosAdapter;

  const old2fa = ctx.loginWith2fa("challenge-A", "123456");
  const currentPassword = ctx.login("B", "pw");
  passwordResponse.resolve(response({} as InternalAxiosRequestConfig, {
    accessToken: "B-access", refreshToken: "B-refresh",
    user: { id: "user-B", companyId: null }, companyId: null, defaultPage: "asab/CompanyDashboard",
  }));
  await currentPassword;
  twoFactorResponse.resolve(response({} as InternalAxiosRequestConfig, {
    accessToken: "A-access", refreshToken: "A-refresh",
    user: { id: "user-A", companyId: null }, companyId: null, defaultPage: "asab/CompanyDashboard",
  }));
  await old2fa;

  assert.equal((ctx.uiUser as { id?: string } | null)?.id, "user-B");
  assert.deepEqual(tokens.getTokens(), pair("B"));
  assert.deepEqual(meRequests, ["user-B"]);
});

test("login response arriving after forced logout cannot restore tokens or request /auth/me", async () => {
  resetAdapters();
  tokens.clearTokens();
  const ctx = makeAuthContextCallbacks();
  const loginResponse = deferred<ReturnType<typeof response>>();
  let meCalls = 0;
  api.defaults.adapter = (async config => config.url?.includes("/auth/login")
    ? loginResponse.promise.then(value => ({ ...value, config }))
    : (meCalls++, response(config, { id: "user-A", companyId: null, roles: [], permissions: {} }))) as AxiosAdapter;

  const login = ctx.login("A", "pw");
  ctx.invalidateSessionRequests(); // same generation invalidation used by logout/forced logout
  loginResponse.resolve(response({} as InternalAxiosRequestConfig, {
    accessToken: "A-access", refreshToken: "A-refresh",
    user: { id: "user-A", companyId: null }, companyId: null, defaultPage: "asab/CompanyDashboard",
  }));
  await login;
  assert.equal(ctx.uiUser, null);
  assert.equal(ctx.userRef.current, null);
  assert.equal(tokens.getTokens(), null);
  assert.equal(meCalls, 0);
});

test("login token identity must match /auth/me before establishing the session", async () => {
  resetAdapters();
  tokens.clearTokens();
  api.defaults.adapter = (async config => response(config, { id: "different-user", companyId: null, roles: [], permissions: {} })) as AxiosAdapter;

  await assert.rejects(auth.establishLoginSession({
    accessToken: "A-access", refreshToken: "A-refresh",
    user: { id: "user-A", companyId: null }, companyId: null, defaultPage: "asab/CompanyDashboard",
  }, () => true), /does not match/);
  assert.equal(tokens.getTokens(), null);
});

test("late refresh success for session A cannot overwrite or retry as session B", async () => {
  resetAdapters();
  tokens.setTokens(pair("A"));
  const refreshStarted = deferred<void>();
  const refreshResponse = deferred<ReturnType<typeof response>>();
  const seen: Array<{ url?: string; authorization?: string }> = [];
  api.defaults.adapter = (async config => {
    seen.push({ url: config.url, authorization: config.headers.get("Authorization") as string | undefined });
    throw unauthorized(config);
  }) as AxiosAdapter;
  axios.defaults.adapter = (config => {
    refreshStarted.resolve();
    return refreshResponse.promise.then(value => ({ ...value, config }));
  }) as AxiosAdapter;

  const request = api.get("/protected");
  await refreshStarted.promise;
  tokens.setTokens(pair("B"));
  refreshResponse.resolve(response({} as InternalAxiosRequestConfig, pair("A-rotated")));
  await assert.rejects(request);

  assert.deepEqual(tokens.getTokens(), pair("B"));
  assert.equal(seen.length, 1);
  assert.equal(seen[0].authorization, "Bearer A-access");
});

test("obsolete refresh rejection cannot clear or force-logout a newer session", async () => {
  resetAdapters();
  tokens.setTokens(pair("A"));
  const refreshStarted = deferred<void>();
  const refreshResponse = deferred<ReturnType<typeof response>>();
  let forcedLogoutEvents = 0;
  const onLogout = () => { forcedLogoutEvents++; };
  window.addEventListener("asab:auth:logout", onLogout);
  api.defaults.adapter = (async config => { throw unauthorized(config); }) as AxiosAdapter;
  axios.defaults.adapter = (config => {
    refreshStarted.resolve();
    return refreshResponse.promise.then(value => ({ ...value, config }));
  }) as AxiosAdapter;

  const request = api.get("/protected");
  await refreshStarted.promise;
  tokens.setTokens(pair("B"));
  refreshResponse.reject(new Error("refresh A failed"));
  await assert.rejects(request);

  assert.deepEqual(tokens.getTokens(), pair("B"));
  assert.equal(forcedLogoutEvents, 0);
  window.removeEventListener("asab:auth:logout", onLogout);
});

test("normal same-session refresh rotates tokens and retries exactly once with the new Authorization header", async () => {
  resetAdapters();
  tokens.setTokens(pair("A"));
  let protectedCalls = 0;
  const authorization: Array<string | undefined> = [];
  api.defaults.adapter = (async config => {
    if (config.url?.includes("/protected")) {
      protectedCalls++;
      authorization.push(config.headers.get("Authorization") as string | undefined);
      if (protectedCalls === 1) throw unauthorized(config);
      return response(config, { ok: true });
    }
    return response(config, {});
  }) as AxiosAdapter;
  axios.defaults.adapter = (async config => response(config, pair("A-rotated"))) as AxiosAdapter;

  const result = await api.get("/protected");
  assert.deepEqual(result.data, { ok: true });
  assert.deepEqual(tokens.getTokens(), pair("A-rotated"));
  assert.deepEqual(authorization, ["Bearer A-access", "Bearer A-rotated-access"]);
  assert.equal(protectedCalls, 2);
});

test("concurrent same-session 401 responses share one refresh and retry once each", async () => {
  resetAdapters();
  tokens.setTokens(pair("A"));
  const secondInitialRequest = deferred<void>();
  const refreshResponse = deferred<ReturnType<typeof response>>();
  let protectedCalls = 0;
  let refreshCalls = 0;
  const headers: Array<string | undefined> = [];
  api.defaults.adapter = (async config => {
    protectedCalls++;
    headers.push(config.headers.get("Authorization") as string | undefined);
    if (protectedCalls <= 2) {
      if (protectedCalls === 2) secondInitialRequest.resolve();
      throw unauthorized(config);
    }
    return response(config, { ok: true });
  }) as AxiosAdapter;
  axios.defaults.adapter = (config => {
    refreshCalls++;
    return refreshResponse.promise.then(value => ({ ...value, config }));
  }) as AxiosAdapter;

  const requests = [api.get("/protected/one"), api.get("/protected/two")];
  await secondInitialRequest.promise;
  await new Promise(resolve => setTimeout(resolve, 0));
  refreshResponse.resolve(response({} as InternalAxiosRequestConfig, pair("A-rotated")));
  const results = await Promise.all(requests);

  assert.equal(results.length, 2);
  assert.equal(refreshCalls, 1);
  assert.equal(protectedCalls, 4);
  assert.equal(headers.filter(value => value === "Bearer A-access").length, 2);
  assert.equal(headers.filter(value => value === "Bearer A-rotated-access").length, 2);
  assert.deepEqual(tokens.getTokens(), pair("A-rotated"));
});

test("current-session refresh rejection clears only that session and broadcasts one forced logout", async () => {
  resetAdapters();
  tokens.setTokens(pair("A"));
  let forcedLogoutEvents = 0;
  const onLogout = () => { forcedLogoutEvents++; };
  window.addEventListener("asab:auth:logout", onLogout);
  api.defaults.adapter = (async config => { throw unauthorized(config); }) as AxiosAdapter;
  axios.defaults.adapter = (async config => { throw unauthorized(config); }) as AxiosAdapter;

  await assert.rejects(api.get("/protected"));
  assert.equal(tokens.getTokens(), null);
  assert.equal(forcedLogoutEvents, 1);
  window.removeEventListener("asab:auth:logout", onLogout);
});

test("an A request that receives 401 after B replaces the session is never retried as B", async () => {
  resetAdapters();
  tokens.setTokens(pair("A"));
  const firstResponse = deferred<never>();
  const requestStarted = deferred<InternalAxiosRequestConfig>();
  const seen: Array<string | undefined> = [];
  let refreshCalls = 0;
  api.defaults.adapter = (async config => {
    seen.push(config.headers.get("Authorization") as string | undefined);
    requestStarted.resolve(config);
    return firstResponse.promise;
  }) as AxiosAdapter;
  axios.defaults.adapter = (async config => {
    refreshCalls++;
    return response(config, pair("unexpected"));
  }) as AxiosAdapter;

  const request = api.get("/protected");
  const requestConfig = await requestStarted.promise;
  tokens.setTokens(pair("B"));
  firstResponse.reject(unauthorized(requestConfig));
  await assert.rejects(request);
  assert.equal(refreshCalls, 0);
  assert.equal(seen.length, 1);
});
