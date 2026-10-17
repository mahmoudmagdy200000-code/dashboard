const KEY = "asab.tokens";
const REVOKED_KEY = "asab.session_revoked";

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export interface TokenState {
  tokens: Tokens | null;
  /** Changes when a login/logout replaces the authenticated session. */
  sessionId: number;
  /** Changes on every token write, including same-session refresh rotation. */
  revision: number;
  /** True when credentials have been stored provisionally and await identity confirmation. */
  isProvisional?: boolean;
}

let sessionId = 0;
let revision = 0;
let provisionalSessionId: number | null = null;
let inMemoryTokens: Tokens | null = null;
let isSessionActive = false;
let sessionInitialized = false;

function initSessionFromStorage(): void {
  if (sessionInitialized) return;
  sessionInitialized = true;

  try {
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(REVOKED_KEY) === "1") {
      inMemoryTokens = null;
      isSessionActive = false;
      return;
    }
  } catch {}

  try {
    if (typeof localStorage === "undefined") {
      inMemoryTokens = null;
      isSessionActive = false;
      return;
    }
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      inMemoryTokens = null;
      isSessionActive = false;
      return;
    }
    const parsed = JSON.parse(raw) as Partial<Tokens> & { revoked?: boolean };
    if (
      parsed &&
      typeof parsed.accessToken === "string" &&
      typeof parsed.refreshToken === "string" &&
      !parsed.revoked
    ) {
      inMemoryTokens = { accessToken: parsed.accessToken, refreshToken: parsed.refreshToken };
      isSessionActive = true;
    } else {
      inMemoryTokens = null;
      isSessionActive = false;
    }
  } catch {
    inMemoryTokens = null;
    isSessionActive = false;
  }
}

export function getTokens(): Tokens | null {
  if (!sessionInitialized) {
    initSessionFromStorage();
  }
  return isSessionActive ? inMemoryTokens : null;
}

export function getTokenState(): TokenState {
  return {
    tokens: getTokens(),
    sessionId,
    revision,
    isProvisional: isSessionActive && provisionalSessionId !== null && provisionalSessionId === sessionId,
  };
}

export function hasProvisionalTokens(): boolean {
  return isSessionActive && provisionalSessionId !== null && provisionalSessionId === sessionId;
}

export function setTokens(t: Tokens): void {
  inMemoryTokens = { accessToken: t.accessToken, refreshToken: t.refreshToken };
  isSessionActive = true;
  sessionInitialized = true;
  sessionId++;
  revision++;
  provisionalSessionId = null;
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(REVOKED_KEY);
    }
  } catch {}
  localStorage.setItem(KEY, JSON.stringify(t));
}

/** Store credentials provisionally during login while /auth/me hydration is pending. */
export function setProvisionalTokens(t: Tokens): number {
  inMemoryTokens = { accessToken: t.accessToken, refreshToken: t.refreshToken };
  isSessionActive = true;
  sessionInitialized = true;
  sessionId++;
  revision++;
  provisionalSessionId = sessionId;
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(REVOKED_KEY);
    }
  } catch {}
  localStorage.setItem(KEY, JSON.stringify(t));
  return sessionId;
}

/** Confirm provisional credentials once /auth/me and user publication complete for this session. */
export function confirmSessionTokens(expectedSessionId?: number): boolean {
  if (!isSessionActive || provisionalSessionId === null) return false;
  if (expectedSessionId !== undefined && provisionalSessionId !== expectedSessionId) {
    return false;
  }
  provisionalSessionId = null;
  return true;
}

function clearStorageWithFallback(): void {
  let removeError: unknown = null;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(KEY);
    }
  } catch (err) {
    removeError = err;
  }

  // Fallback 1: overwrite KEY with empty value if removeItem threw or failed
  if (removeError) {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(KEY, "");
      }
    } catch {}
  }

  // Fallback 2: record revocation marker in sessionStorage so page reload in this tab knows
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(REVOKED_KEY, "1");
    }
  } catch {}

  if (removeError) {
    throw removeError;
  }
}

/** Clear provisional credentials if still unconfirmed and not superseded by a newer session. */
export function clearProvisionalTokens(): boolean {
  if (isSessionActive && provisionalSessionId !== null && sessionId === provisionalSessionId) {
    try {
      clearStorageWithFallback();
    } finally {
      inMemoryTokens = null;
      isSessionActive = false;
      sessionInitialized = true;
      sessionId++;
      revision++;
      provisionalSessionId = null;
    }
    return true;
  }
  return false;
}

export function clearTokens(): void {
  try {
    clearStorageWithFallback();
  } finally {
    inMemoryTokens = null;
    isSessionActive = false;
    sessionInitialized = true;
    sessionId++;
    revision++;
    provisionalSessionId = null;
  }
}

/** Rotate tokens only if the session and token pair still match the request's snapshot. */
export function rotateTokensIfCurrent(expected: TokenState, next: Tokens): boolean {
  if (!isSessionActive || expected.sessionId !== sessionId || expected.revision !== revision || !inMemoryTokens) {
    return false;
  }
  inMemoryTokens = { accessToken: next.accessToken, refreshToken: next.refreshToken };
  revision++;
  localStorage.setItem(KEY, JSON.stringify(next));
  return true;
}

/** Clear a session only if no login or refresh has replaced its token state. */
export function clearTokensIfCurrent(expected: TokenState): boolean {
  if (!isSessionActive || expected.sessionId !== sessionId || expected.revision !== revision || !inMemoryTokens) {
    return false;
  }
  try {
    clearStorageWithFallback();
  } finally {
    inMemoryTokens = null;
    isSessionActive = false;
    sessionInitialized = true;
    sessionId++;
    revision++;
    if (provisionalSessionId === expected.sessionId) {
      provisionalSessionId = null;
    }
  }
  return true;
}

/** Clear during logout if its session is still active, even if that same session refreshed. */
export function clearSessionTokensIfCurrent(expectedSessionId: number): boolean {
  if (!isSessionActive || expectedSessionId !== sessionId || !inMemoryTokens) {
    return false;
  }
  try {
    clearStorageWithFallback();
  } finally {
    inMemoryTokens = null;
    isSessionActive = false;
    sessionInitialized = true;
    sessionId++;
    revision++;
    if (provisionalSessionId === expectedSessionId) {
      provisionalSessionId = null;
    }
  }
  return true;
}
