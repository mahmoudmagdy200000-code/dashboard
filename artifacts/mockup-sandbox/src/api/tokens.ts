const KEY = "asab.tokens";

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

export function getTokens(): Tokens | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Tokens) : null;
  } catch {
    return null;
  }
}

export function getTokenState(): TokenState {
  return {
    tokens: getTokens(),
    sessionId,
    revision,
    isProvisional: provisionalSessionId !== null && provisionalSessionId === sessionId,
  };
}

export function hasProvisionalTokens(): boolean {
  return provisionalSessionId !== null && provisionalSessionId === sessionId;
}

export function setTokens(t: Tokens): void {
  localStorage.setItem(KEY, JSON.stringify(t));
  sessionId++;
  revision++;
  provisionalSessionId = null;
}

/** Store credentials provisionally during login while /auth/me hydration is pending. */
export function setProvisionalTokens(t: Tokens): number {
  localStorage.setItem(KEY, JSON.stringify(t));
  sessionId++;
  revision++;
  provisionalSessionId = sessionId;
  return sessionId;
}

/** Confirm provisional credentials once /auth/me verifies user identity for this session. */
export function confirmSessionTokens(expectedSessionId: number): boolean {
  if (provisionalSessionId === expectedSessionId) {
    provisionalSessionId = null;
    return true;
  }
  return false;
}

/** Clear provisional credentials if still unconfirmed and not superseded by a newer session. */
export function clearProvisionalTokens(): boolean {
  if (provisionalSessionId !== null && sessionId === provisionalSessionId) {
    localStorage.removeItem(KEY);
    sessionId++;
    revision++;
    provisionalSessionId = null;
    return true;
  }
  return false;
}

export function clearTokens(): void {
  localStorage.removeItem(KEY);
  sessionId++;
  revision++;
  provisionalSessionId = null;
}

/** Rotate tokens only if the session and token pair still match the request's snapshot. */
export function rotateTokensIfCurrent(expected: TokenState, next: Tokens): boolean {
  if (expected.sessionId !== sessionId || expected.revision !== revision || !getTokens()) return false;
  localStorage.setItem(KEY, JSON.stringify(next));
  revision++;
  return true;
}

/** Clear a session only if no login or refresh has replaced its token state. */
export function clearTokensIfCurrent(expected: TokenState): boolean {
  if (expected.sessionId !== sessionId || expected.revision !== revision || !getTokens()) return false;
  localStorage.removeItem(KEY);
  sessionId++;
  revision++;
  if (provisionalSessionId === expected.sessionId) {
    provisionalSessionId = null;
  }
  return true;
}

/** Clear during logout if its session is still active, even if that same session refreshed. */
export function clearSessionTokensIfCurrent(expectedSessionId: number): boolean {
  if (expectedSessionId !== sessionId || !getTokens()) return false;
  localStorage.removeItem(KEY);
  sessionId++;
  revision++;
  if (provisionalSessionId === expectedSessionId) {
    provisionalSessionId = null;
  }
  return true;
}
