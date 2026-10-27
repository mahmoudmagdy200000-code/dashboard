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

  // Scrub legacy persistent localStorage tokens to prevent cross-tab or indefinite leakage
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(KEY);
    }
  } catch {}

  // Check if session was revoked in this tab
  try {
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(REVOKED_KEY) === "1") {
      inMemoryTokens = null;
      isSessionActive = false;
      return;
    }
  } catch {}

  // Tab-scoped session restoration: restore confirmed tokens from sessionStorage across refresh
  let storedJson: string | null = null;
  try {
    if (typeof sessionStorage !== "undefined") {
      storedJson = sessionStorage.getItem(KEY);
    }
  } catch {}

  if (storedJson) {
    try {
      const parsed = JSON.parse(storedJson);
      if (
        parsed &&
        typeof parsed === "object" &&
        typeof parsed.accessToken === "string" &&
        parsed.accessToken.trim() !== "" &&
        typeof parsed.refreshToken === "string" &&
        parsed.refreshToken.trim() !== "" &&
        !parsed.provisional
      ) {
        inMemoryTokens = {
          accessToken: parsed.accessToken,
          refreshToken: parsed.refreshToken,
        };
        isSessionActive = true;
        sessionId++;
        revision++;
        provisionalSessionId = null;
        return;
      }
    } catch {}
  }

  inMemoryTokens = null;
  isSessionActive = false;
}

/** Reset internal session state to simulate clean page reload or fresh module initialization. */
export function _resetSessionModuleForTesting(): void {
  sessionId = 0;
  revision = 0;
  provisionalSessionId = null;
  inMemoryTokens = null;
  isSessionActive = false;
  sessionInitialized = false;
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
      sessionStorage.setItem(KEY, JSON.stringify(t));
    }
  } catch {}
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(KEY);
    }
  } catch {}
}

/** Store credentials provisionally during login while /auth/me hydration is pending. */
export function setProvisionalTokens(t: Tokens): number {
  inMemoryTokens = { accessToken: t.accessToken, refreshToken: t.refreshToken };
  isSessionActive = true;
  sessionInitialized = true;
  sessionId++;
  revision++;
  provisionalSessionId = sessionId;
  // Provisional credentials exist in memory only; never commit them to storage until confirmed
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(REVOKED_KEY);
      sessionStorage.removeItem(KEY);
    }
  } catch {}
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(KEY);
    }
  } catch {}
  return sessionId;
}

/** Confirm provisional credentials once /auth/me and user publication complete for this session. */
export function confirmSessionTokens(expectedSessionId?: number): boolean {
  if (!isSessionActive || provisionalSessionId === null) return false;
  if (expectedSessionId !== undefined && provisionalSessionId !== expectedSessionId) {
    return false;
  }
  provisionalSessionId = null;
  if (inMemoryTokens) {
    try {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem(KEY, JSON.stringify(inMemoryTokens));
        sessionStorage.removeItem(REVOKED_KEY);
      }
    } catch {}
  }
  return true;
}

function clearStorageWithFallback(): void {
  let removeError: unknown = null;
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(KEY);
    }
  } catch (err) {
    removeError = err;
  }
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(KEY);
    }
  } catch (err) {
    removeError ??= err;
  }

  // Fallback 1: overwrite KEY with empty value if removeItem threw or failed
  if (removeError) {
    try {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem(KEY, "");
      }
    } catch {}
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
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(KEY, JSON.stringify(next));
    }
  } catch {}
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
