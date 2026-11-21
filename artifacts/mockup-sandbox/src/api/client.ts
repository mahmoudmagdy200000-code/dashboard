import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import { clearTokensIfCurrent, getTokenState, rotateTokensIfCurrent, type TokenState } from "./tokens";
import { ApiError, isErrorBody, type ApiErrorBody } from "./errors";

const BASE_RAW =
  (typeof import.meta !== "undefined" && import.meta?.env?.VITE_API_BASE_URL) ||
  "";
const BASE = BASE_RAW.replace(/\/$/, "");

if (!BASE && typeof window !== "undefined") {
  // eslint-disable-next-line no-console
  console.warn(
    "[api] VITE_API_BASE_URL is not set. Set it in .env (frontend root) before making API calls.",
  );
}

/** Public app-root URL (without /api/v1) — used by Echo for /broadcasting/auth. */
export const APP_BASE_URL = BASE;

/** Axios instance for all /api/v1/* calls. */
export const api: AxiosInstance = axios.create({
  baseURL: `${BASE}/api/v1`,
  headers: {
    Accept: "application/json",
    "Accept-Language": "ar",
    "Content-Type": "application/json",
  },
});

// ─── Request: attach bearer token + idempotency key for mutations ───────────
const SAFE_METHODS = new Set(["get", "head", "options"]);

/**
 * Generates an RFC 4122 v4 UUID for exact command identity and idempotency.
 * Backend commands requiring Idempotency-Key enforce UUID validation (Str::isUuid).
 */
export function generateCommandId(): string {
  const c = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function generateIdempotencyKey(): string {
  return generateCommandId();
}

api.interceptors.request.use((config) => {
  const state = getTokenState();
  const authConfig = config as RetriableConfig;
  if (authConfig.__authSessionId !== undefined && authConfig.__authSessionId !== state.sessionId) {
    throw new SessionChangedError();
  }
  authConfig.__authSessionId ??= state.sessionId;
  authConfig.__authRevision = state.revision;

  const url = config.url ?? "";
  const publicAuthRequest = url.includes("/auth/login") || url.includes("/auth/refresh");
  if (config.headers) {
    if (!publicAuthRequest && state.tokens?.accessToken) {
      config.headers.Authorization = `Bearer ${state.tokens.accessToken}`;
    } else {
      config.headers.delete("Authorization");
    }
  }

  // Auto-attach Idempotency-Key on mutations unless the caller already set one.
  const method = (config.method ?? "get").toLowerCase();
  if (!SAFE_METHODS.has(method) && config.headers) {
    if (!config.headers["Idempotency-Key"] && !config.headers["idempotency-key"]) {
      config.headers["Idempotency-Key"] = generateIdempotencyKey();
    }
  }
  return config;
});

/** Manually attach an Idempotency-Key (overrides the auto-generated one). */
export function withIdempotencyKey(key: string): { headers: { "Idempotency-Key": string } } {
  return { headers: { "Idempotency-Key": key } };
}

// ─── Response: 401 → refresh-once → retry; normalize errors ──────────────────
type RefreshResult = { accessToken: string; sessionId: number } | null;
const refreshes = new Map<string, Promise<RefreshResult>>();

async function performRefresh(expected: TokenState): Promise<RefreshResult> {
  const current = getTokenState();
  if (current.sessionId !== expected.sessionId || current.revision !== expected.revision || !current.tokens) {
    return current.sessionId === expected.sessionId && current.tokens
      ? { accessToken: current.tokens.accessToken, sessionId: current.sessionId }
      : null;
  }
  const t = expected.tokens;
  if (!t?.refreshToken) {
    let cleared = false;
    try {
      cleared = clearTokensIfCurrent(expected);
    } catch {
      // clearTokensIfCurrent clears memory in finally before rethrowing storage error.
      // If it threw, expected was the current active session and was cleared from memory.
      cleared = true;
    }
    if (cleared) {
      try {
        window.dispatchEvent(new CustomEvent("asab:auth:logout"));
      } catch {}
    }
    return null;
  }
  try {
    const res = await axios.post<{ accessToken: string; refreshToken: string }>(
      `${BASE}/api/v1/auth/refresh`,
      { refreshToken: t.refreshToken },
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      },
    );
    const rotated = {
      accessToken: res.data.accessToken,
      refreshToken: res.data.refreshToken,
    };
    if (rotateTokensIfCurrent(expected, rotated)) {
      return { accessToken: rotated.accessToken, sessionId: expected.sessionId };
    }
    const newer = getTokenState();
    return newer.sessionId === expected.sessionId && newer.tokens
      ? { accessToken: newer.tokens.accessToken, sessionId: newer.sessionId }
      : null;
  } catch {
    let cleared = false;
    try {
      cleared = clearTokensIfCurrent(expected);
    } catch {
      // clearTokensIfCurrent clears memory in finally before rethrowing storage error.
      // If it threw, expected was the current active session and was cleared from memory.
      cleared = true;
    }
    if (cleared) {
      // A stale refresh rejection must not log out a replacement session.
      try {
        window.dispatchEvent(new CustomEvent("asab:auth:logout"));
      } catch {}
    }
    return null;
  }
}

type RetriableConfig = InternalAxiosRequestConfig & {
  __retried?: boolean;
  __authSessionId?: number;
  __authRevision?: number;
};

class SessionChangedError extends Error {
  constructor() { super("Authentication session changed before request dispatch"); }
}

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError<unknown>) => {
    const cfg = err.config as RetriableConfig | undefined;
    const status = err.response?.status;
    let body = err.response?.data;
    const url = cfg?.url ?? "";

    if (
      status === 401 &&
      cfg &&
      !cfg.__retried &&
      !url.includes("/auth/refresh") &&
      !url.includes("/auth/login")
    ) {
      const originalSessionId = cfg.__authSessionId;
      const current = getTokenState();
      if (originalSessionId !== undefined && current.sessionId === originalSessionId && current.tokens) {
        let newToken: string | null = null;
        if (cfg.__authRevision !== undefined && current.revision !== cfg.__authRevision) {
          // Another request already rotated this same session's token pair.
          newToken = current.tokens.accessToken;
        } else {
          const expected = current;
          const key = `${expected.sessionId}:${expected.revision}`;
          let pending = refreshes.get(key);
          if (!pending) {
            pending = performRefresh(expected).finally(() => refreshes.delete(key));
            refreshes.set(key, pending);
          }
          const refreshed = await pending;
          const afterRefresh = getTokenState();
          if (refreshed?.sessionId === originalSessionId && afterRefresh.sessionId === originalSessionId) {
            newToken = afterRefresh.tokens?.accessToken ?? null;
          }
        }
        if (newToken && getTokenState().sessionId === originalSessionId) {
          cfg.__retried = true;
          if (cfg.headers) cfg.headers.Authorization = `Bearer ${newToken}`;
          return api(cfg);
        }
      }
    }

    // Axios returns non-2xx JSON as a Blob when the request was a download.
    // Decode it so a 403/500 is not falsely reported as a network outage.
    if (typeof Blob !== "undefined" && body instanceof Blob) {
      try {
        body = JSON.parse(await body.text()) as unknown;
      } catch {
        body = undefined;
      }
    }

    if (isErrorBody(body)) {
      throw new ApiError(body as ApiErrorBody, status ?? 0);
    }

    if (status !== undefined) {
      throw new ApiError({
        error: {
          code: `HTTP_${status}`,
          message: `Request failed with HTTP ${status}`,
          messageAr: `فشل طلب التنزيل أو البيانات (HTTP ${status})`,
        },
      }, status);
    }

    // No HTTP response — actual network failure.
    throw new ApiError(
      {
        error: {
          code: "NETWORK_ERROR",
          message: err.message,
          messageAr: "تعذر الاتصال بالخادم",
        },
      },
      status ?? 0,
    );
  },
);

/** List-envelope shape used by every list endpoint. */
export interface Page<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/** Download a file from an authenticated endpoint via blob + virtual click. */
export async function downloadBlob(
  url: string,
  filename: string,
  params?: object,
): Promise<void> {
  const res = await api.get(url, { params, responseType: "blob" });
  const blob = res.data as Blob;
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Let the browser begin consuming the blob before releasing its object URL.
  // Revoking synchronously can cancel the download in Chromium/Edge.
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
}
