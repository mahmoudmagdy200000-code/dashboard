import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchMe,
  login as apiLogin,
  loginWithTwoFactor as apiLoginWithTwoFactor,
  isTwoFactorChallenge,
  logout as apiLogout,
  type LoginOrChallenge,
} from "../api/auth";
import { getTokens, clearTokens } from "../api/tokens";
import { clearEntrySelection } from "./entrySelection";
import { clearRetiredQueryClient, financialAccessFingerprint, hasRoleGrant, purgeFinancialQueries } from "./roleAccess";
import { createQueryClient } from "../lib/queryClient";
import { disconnectEcho, getEcho } from "../api/echo";
import { setProcurementPlatformScope } from "../api/queries/platform/procurement";
import type {
  AppNotification,
  LoginResponse,
  MeResponse,
  RoleKey,
} from "../api/types";

interface OperationStatusChangedEvent {
  operationId: string;
  from: string;
  to: string;
  by: { id: string; name: string };
}

interface NotificationNewEvent extends AppNotification {}

interface AuthContextValue {
  user: MeResponse | null;
  financialTransition: boolean;
  /** True while we're checking the bootstrap session (first /auth/me). */
  initializing: boolean;
  /** True while the login mutation is in-flight. */
  loggingIn: boolean;
  /** Backend-suggested landing page from the most recent login. Null after refresh-only sessions. */
  defaultPage: string | null;
  /**
   * Password login. Returns the raw response so the caller can detect a 2FA
   * step-up: `{ requires2fa: true, twoFactorToken }` (no session created yet).
   * Pass `opts.code` on the second attempt, or call `loginWith2fa`.
   */
  login: (
    email: string,
    password: string,
    opts?: { code?: string; rememberMe?: boolean },
  ) => Promise<LoginOrChallenge>;
  /** Step 2 of 2FA login — exchange the step-up token + OTP for a session. */
  loginWith2fa: (twoFactorToken: string, code: string) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  hasPermission: (key: string) => boolean;
  isRole: (...roles: RoleKey[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [financialTransition, setFinancialTransition] = useState(false);
  const [queryClient, setQueryClient] = useState(createQueryClient);
  const [queryClientEpoch, setQueryClientEpoch] = useState(0);
  const [initializing, setInitializing] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);
  const [defaultPage, setDefaultPage] = useState<string | null>(null);
  const queryClientRef = useRef(queryClient);
  queryClientRef.current = queryClient;
  const userRef = useRef(user);
  userRef.current = user;
  const sessionEpoch = useRef(0);
  const refreshRequest = useRef(0);
  const logoutPending = useRef<Promise<void> | null>(null);
  const invalidateSessionRequests = useCallback(() => {
    sessionEpoch.current++;
    refreshRequest.current++;
  }, []);

  const resetQueryClient = useCallback(async (isCurrent: () => boolean) => {
    const previous = queryClientRef.current;
    const cleared = await clearRetiredQueryClient(previous, isCurrent);
    if (!cleared || !isCurrent()) return false;
    const fresh = createQueryClient();
    queryClientRef.current = fresh;
    setQueryClient(fresh);
    setQueryClientEpoch(epoch => epoch + 1);
    return true;
  }, []);

  const applyFreshUser = useCallback(async (nextUser: MeResponse, isCurrent: () => boolean, newSession = false) => {
    const previousUser = userRef.current;
    if (previousUser && (newSession || previousUser.id !== nextUser.id || previousUser.companyId !== nextUser.companyId)) {
      flushSync(() => setFinancialTransition(true));
      if (!await resetQueryClient(isCurrent) || !isCurrent()) return false;
    } else if (previousUser && financialAccessFingerprint(previousUser) !== financialAccessFingerprint(nextUser)) {
      flushSync(() => setFinancialTransition(true));
      const purged = await purgeFinancialQueries(queryClientRef.current, isCurrent);
      if (!purged || !isCurrent()) return false;
    }
    if (!isCurrent()) return false;
    userRef.current = nextUser;
    setUser(nextUser);
    return true;
  }, [resetQueryClient]);

  // Bootstrap: if we have a stored token, try /auth/me.
  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      const bootstrapSession = sessionEpoch.current;
      const bootstrapRequest = ++refreshRequest.current;
      const t = getTokens();
      if (!t?.accessToken) {
        if (bootstrapSession === sessionEpoch.current && bootstrapRequest === refreshRequest.current)
          setInitializing(false);
        return;
      }
      try {
        const me = await fetchMe();
        if (!cancelled && bootstrapSession === sessionEpoch.current && bootstrapRequest === refreshRequest.current) {
          userRef.current = me;
          setUser(me);
        }
      } catch {
        // Token invalid / network. Clear and route to login.
        if (bootstrapSession === sessionEpoch.current && bootstrapRequest === refreshRequest.current) clearTokens();
      } finally {
        if (!cancelled && bootstrapSession === sessionEpoch.current && bootstrapRequest === refreshRequest.current)
          setInitializing(false);
      }
    }
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  // A procurement manager with no company is a platform account and must read
  // the cross-company surface; /company/me/procurement/* would 403 WRONG_TENANT.
  // Keep the procurement base path in sync with whoever is signed in.
  useEffect(() => {
    setProcurementPlatformScope(hasRoleGrant(user, "procurement") && !user?.companyId);
  }, [user]);

  // Listen for forced-logout signal from the axios 401 interceptor.
  useEffect(() => {
    const handler = () => {
      invalidateSessionRequests();
      userRef.current = null;
      setUser(null);
      setInitializing(false);
      setLoggingIn(false);
      setFinancialTransition(false);
      setDefaultPage(null);
      // Always purge stored tokens on forced sign-out — the no-refresh-token 401
      // path dispatches this event without performRefresh() having cleared them,
      // which would otherwise strand a stale access token in localStorage.
      clearTokens();
      // Drop the pre-login dashboard/role pick so the next login re-routes cleanly
      // (a stale selection would strand the next user in the wrong dashboard).
      clearEntrySelection();
      disconnectEcho();
      const previous = queryClientRef.current;
      void clearRetiredQueryClient(previous);
      const fresh = createQueryClient();
      queryClientRef.current = fresh;
      setQueryClient(fresh);
      setQueryClientEpoch(epoch => epoch + 1);
    };
    window.addEventListener("asab:auth:logout", handler);
    return () => window.removeEventListener("asab:auth:logout", handler);
  }, [invalidateSessionRequests]);

  // ─── Realtime subscriptions (Echo + Pusher) ────────────────────────────────
  // Skips silently when VITE_PUSHER_APP_KEY is not configured (getEcho returns null).
  useEffect(() => {
    if (!user) return;
    const echo = getEcho();
    if (!echo) return;

    const invalidateAllOps = () => {
      queryClient.invalidateQueries({ queryKey: ["operations"] });
      queryClient.invalidateQueries({ queryKey: ["accountant", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["head", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["platform"] });
    };

    // Personal notification channel — every role gets this.
    const userChannel = echo.private(`notifications.user.${user.id}`);
    userChannel.listen(".notification.new", (e: NotificationNewEvent) => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast(e.title, { description: e.body });
    });
    userChannel.listen(".invoice.created", () =>
      queryClient.invalidateQueries({ queryKey: ["billing"] }),
    );
    userChannel.listen(".invoice.paid", () =>
      queryClient.invalidateQueries({ queryKey: ["billing"] }),
    );
    userChannel.listen(".invoice.payment_failed", () =>
      queryClient.invalidateQueries({ queryKey: ["billing"] }),
    );
    userChannel.listen(".quota.warning", (e: { resource: string; used: number; max: number }) =>
      toast.warning(`${e.resource}: ${e.used}/${e.max}`),
    );
    userChannel.listen(".quota.exceeded", (e: { resource: string; used: number; max: number }) =>
      toast.error(`تم تجاوز الحد: ${e.resource} (${e.used}/${e.max})`),
    );
    userChannel.listen(".subscription.expiring", (e: { daysRemaining: number }) =>
      toast.warning(`اشتراك الشركة ينتهي خلال ${e.daysRemaining} يوم`),
    );
    userChannel.listen(".support.ticket_replied", () =>
      queryClient.invalidateQueries({ queryKey: ["support", "tickets"] }),
    );
    userChannel.listen(".erp.batch.completed", () =>
      queryClient.invalidateQueries({ queryKey: ["erp"] }),
    );

    // Company-wide operations channel (only for company-scoped users)
    if (user.companyId) {
      const companyChannel = echo.private(`operations.company.${user.companyId}`);
      companyChannel.listen(".operation.created", invalidateAllOps);
      companyChannel.listen(".operation.status_changed", (_e: OperationStatusChangedEvent) =>
        invalidateAllOps(),
      );
      // T10 §Realtime — a batch flipped to `exported`.
      companyChannel.listen(".erp.batch.completed", () => {
        queryClient.invalidateQueries({ queryKey: ["erp"] });
        queryClient.invalidateQueries({ queryKey: ["platform", "erp"] });
        queryClient.invalidateQueries({ queryKey: ["platform", "admin", "erp"] });
        invalidateAllOps();
      });
      companyChannel.listen(".approval.pending", () =>
        queryClient.invalidateQueries({ queryKey: ["accountant", "dashboard"] }),
      );
      companyChannel.listen(".subscription.updated", () =>
        queryClient.invalidateQueries({ queryKey: ["subscription"] }),
      );
      companyChannel.listen(".subscription.suspended", () => {
        queryClient.invalidateQueries({ queryKey: ["subscription"] });
        toast.error("تم تعليق الاشتراك");
      });
      companyChannel.listen(".module.changed", () =>
        queryClient.invalidateQueries({ queryKey: ["company-modules"] }),
      );
      companyChannel.listen(".branch.created", () =>
        queryClient.invalidateQueries({ queryKey: ["company-brands"] }),
      );
      companyChannel.listen(".branch.updated", () =>
        queryClient.invalidateQueries({ queryKey: ["company-brands"] }),
      );
      // Section 4 — new final-batch events on the company channel.
      companyChannel.listen(".brand.upload.progress", (e: { brandId: string; type: string; status: string; progressPct: number; parsedRows: number; failedRows: number }) => {
        queryClient.invalidateQueries({
          queryKey: ["platform", "admin", "brand-upload-status", e.brandId],
        });
        queryClient.invalidateQueries({ queryKey: ["platform", "admin", "jobs"] });
        if (e.status === "done") {
          toast.success(`اكتمل رفع ${e.type} — ${e.parsedRows} صف${e.failedRows ? ` · ${e.failedRows} خطأ` : ""}`);
        }
      });
      companyChannel.listen(".permissions.matrix.updated", () =>
        queryClient.invalidateQueries({ queryKey: ["platform", "admin", "permissions"] }),
      );
    }

    // Brand channels — for head/accountant scoped to specific brands.
    const brandIds = user.brandIds ?? [];
    brandIds.forEach((brandId) => {
      const brandChannel = echo.private(`operations.brand.${brandId}`);
      brandChannel.listen(".operation.status_changed", invalidateAllOps);
      brandChannel.listen(".erp.batch.completed", () => {
        queryClient.invalidateQueries({ queryKey: ["erp"] });
        queryClient.invalidateQueries({ queryKey: ["platform", "erp"] });
        invalidateAllOps();
      });
      brandChannel.listen(".asset_draft.created", () =>
        queryClient.invalidateQueries({ queryKey: ["asset-drafts"] }),
      );
      brandChannel.listen(".shift.opened", () =>
        queryClient.invalidateQueries({ queryKey: ["shifts"] }),
      );
      brandChannel.listen(".shift.closed", () =>
        queryClient.invalidateQueries({ queryKey: ["shifts"] }),
      );
      brandChannel.listen(".shift.late", () =>
        queryClient.invalidateQueries({ queryKey: ["shifts"] }),
      );
      brandChannel.listen(".shift.reopened", () =>
        queryClient.invalidateQueries({ queryKey: ["shifts"] }),
      );
      // Section 4 — daily inventory variance allocation broadcast.
      brandChannel.listen(".inventory.variance_allocated", () =>
        queryClient.invalidateQueries({ queryKey: ["accountant", "inventory"] }),
      );
    });

    // Branch channels — for branch managers and their specific branches.
    const branchIds = user.branchIds ?? [];
    branchIds.forEach((branchId) => {
      const branchChannel = echo.private(`reminders.branch.${branchId}`);
      branchChannel.listen(".asset_draft.confirmed", () =>
        queryClient.invalidateQueries({ queryKey: ["asset-drafts"] }),
      );
      branchChannel.listen(".asset.confirmation_needed", () => {
        queryClient.invalidateQueries({ queryKey: ["assets"] });
        toast("أصل ثابت يحتاج تأكيد من الفرع");
      });
      branchChannel.listen(".inventory.flag_sent", () => {
        queryClient.invalidateQueries({ queryKey: ["inventory"] });
        toast("تم تمييز عناصر مخزون");
      });
      branchChannel.listen(".shift.opened", () =>
        queryClient.invalidateQueries({ queryKey: ["shifts"] }),
      );
      branchChannel.listen(".shift.closed", () =>
        queryClient.invalidateQueries({ queryKey: ["shifts"] }),
      );
      branchChannel.listen(".shift.late", () =>
        queryClient.invalidateQueries({ queryKey: ["shifts"] }),
      );
      branchChannel.listen(".shift.reopened", () =>
        queryClient.invalidateQueries({ queryKey: ["shifts"] }),
      );
      branchChannel.listen(".reminder.responded", () =>
        queryClient.invalidateQueries({ queryKey: ["accountant", "reminders"] }),
      );
      // T09 §B — a txn dropped a custody to low/critical.
      branchChannel.listen(".custody.low_balance", () =>
        queryClient.invalidateQueries({ queryKey: ["cash-custody"] }),
      );
    });

    return () => {
      echo.leave(`notifications.user.${user.id}`);
      if (user.companyId) {
        echo.leave(`operations.company.${user.companyId}`);
      }
      brandIds.forEach((b) => echo.leave(`operations.brand.${b}`));
      branchIds.forEach((b) => echo.leave(`reminders.branch.${b}`));
    };
  }, [user, queryClient]);

  const login = useCallback(
    async (
      email: string,
      password: string,
      opts?: { code?: string; rememberMe?: boolean },
    ) => {
      if (logoutPending.current) await logoutPending.current;
      invalidateSessionRequests();
      const operationEpoch = sessionEpoch.current;
      const isCurrent = () => sessionEpoch.current === operationEpoch;
      setLoggingIn(true);
      setInitializing(false);
      flushSync(() => setFinancialTransition(true));
      try {
        const res = await apiLogin(email, password, opts);
        // 2FA enabled and no/invalid code yet → return the challenge; no session.
        if (isTwoFactorChallenge(res)) {
          return res;
        }
        // Hydrate the full me-record (with permissions) immediately.
        const me = await fetchMe();
        if (!isCurrent()) return res;
        if (!await applyFreshUser(me, isCurrent, true) || !isCurrent()) return res;
        setDefaultPage(res.defaultPage || null);
        return res;
      } finally {
        if (isCurrent()) {
          setLoggingIn(false);
          setFinancialTransition(false);
        }
      }
    },
    [applyFreshUser, invalidateSessionRequests],
  );

  const loginWith2fa = useCallback(
    async (twoFactorToken: string, code: string) => {
      if (logoutPending.current) await logoutPending.current;
      invalidateSessionRequests();
      const operationEpoch = sessionEpoch.current;
      const isCurrent = () => sessionEpoch.current === operationEpoch;
      setLoggingIn(true);
      setInitializing(false);
      flushSync(() => setFinancialTransition(true));
      try {
        const res = await apiLoginWithTwoFactor(twoFactorToken, code);
        const me = await fetchMe();
        if (!isCurrent() || !await applyFreshUser(me, isCurrent, true) || !isCurrent()) return res;
        setDefaultPage(res.defaultPage || null);
        return res;
      } finally {
        if (isCurrent()) {
          setLoggingIn(false);
          setFinancialTransition(false);
        }
      }
    },
    [applyFreshUser, invalidateSessionRequests],
  );

  const logout = useCallback(async () => {
    invalidateSessionRequests();
    const operationEpoch = sessionEpoch.current;
    userRef.current = null;
    setUser(null);
    setDefaultPage(null);
    setInitializing(false);
    setLoggingIn(false);
    setFinancialTransition(false);
    const previous = queryClientRef.current;
    const cleanup = clearRetiredQueryClient(previous);
    const fresh = createQueryClient();
    queryClientRef.current = fresh;
    setQueryClient(fresh);
    setQueryClientEpoch(epoch => epoch + 1);
    const request = apiLogout();
    logoutPending.current = request;
    try {
      await request;
    } finally {
      await cleanup;
      if (logoutPending.current === request) logoutPending.current = null;
      if (sessionEpoch.current === operationEpoch) {
        userRef.current = null;
        setUser(null);
        setDefaultPage(null);
        clearTokens();
        // Always drop the pre-login pick — otherwise App's redirect effect would
        // immediately re-route the (now logged-out) browser back into a dashboard.
        clearEntrySelection();
        disconnectEcho();
      }
    }
  }, [invalidateSessionRequests]);

  const refreshMe = useCallback(async () => {
    const requestId = ++refreshRequest.current;
    const operationEpoch = sessionEpoch.current;
    const isCurrent = () => requestId === refreshRequest.current && operationEpoch === sessionEpoch.current;
    try {
      const me = await fetchMe();
      if (!isCurrent()) return;
      await applyFreshUser(me, isCurrent);
    } catch (error) {
      if (isCurrent()) throw error;
    } finally {
      if (isCurrent()) setFinancialTransition(false);
    }
  }, [applyFreshUser]);

  const hasPermission = useCallback(
    (key: string) => Boolean(user?.permissions?.[key]),
    [user],
  );

  const isRole = useCallback(
    (...roles: RoleKey[]) => hasRoleGrant(user, ...roles),
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      financialTransition,
      initializing,
      loggingIn,
      defaultPage,
      login,
      loginWith2fa,
      logout,
      refreshMe,
      hasPermission,
      isRole,
    }),
    [user, financialTransition, initializing, loggingIn, defaultPage, login, loginWith2fa, logout, refreshMe, hasPermission, isRole],
  );

  return <AuthContext.Provider value={value}>
    <QueryClientProvider key={queryClientEpoch} client={queryClient}>
      {children}
    </QueryClientProvider>
  </AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
