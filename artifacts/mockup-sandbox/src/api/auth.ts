import { api } from "./client";
import type { AxiosRequestConfig } from "axios";
import {
  clearSessionTokensIfCurrent,
  confirmSessionTokens,
  getTokenState,
  setProvisionalTokens,
} from "./tokens";
import type { LoginResponse, MeResponse } from "./types";

// 2FA step-up response — when 2FA is enabled, login returns this instead of tokens.
export interface TwoFactorChallenge {
  requires2fa: true;
  twoFactorToken: string;
}

export type LoginOrChallenge = LoginResponse | TwoFactorChallenge;

export function isTwoFactorChallenge(
  res: LoginOrChallenge,
): res is TwoFactorChallenge {
  return Boolean((res as TwoFactorChallenge).requires2fa);
}

export async function login(
  email: string,
  password: string,
  opts?: { code?: string; rememberMe?: boolean },
): Promise<LoginOrChallenge> {
  const res = await api.post<LoginOrChallenge>("/auth/login", {
    email,
    password,
    ...(opts?.code ? { code: opts.code } : {}),
    ...(opts?.rememberMe ? { rememberMe: true } : {}),
  });
  return res.data;
}

// Step 2 of 2FA login — call after receiving { requires2fa, twoFactorToken }.
export async function loginWithTwoFactor(
  twoFactorToken: string,
  code: string,
): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>("/auth/login", {
    twoFactorToken,
    code,
  });
  return res.data;
}

/** Commit a successful login only while its initiating session generation is active. */
export async function establishLoginSession(
  response: LoginResponse,
  isCurrent: () => boolean,
): Promise<MeResponse | null> {
  if (!isCurrent()) return null;
  const committedSession = setProvisionalTokens({
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
  });
  if (!isCurrent()) {
    clearSessionTokensIfCurrent(committedSession);
    return null;
  }
  let me: MeResponse;
  try {
    me = await fetchMe();
  } catch (err) {
    clearSessionTokensIfCurrent(committedSession);
    throw err;
  }
  if (!isCurrent()) {
    clearSessionTokensIfCurrent(committedSession);
    return null;
  }
  if (me.id !== response.user.id) {
    clearSessionTokensIfCurrent(committedSession);
    throw new Error("Login identity does not match /auth/me");
  }
  confirmSessionTokens(committedSession);
  return me;
}

export async function logout(): Promise<void> {
  const session = getTokenState();
  try {
    await api.post("/auth/logout", undefined, {
      __authSessionId: session.sessionId,
    } as AxiosRequestConfig & { __authSessionId: number });
  } catch {
    // best effort — server logout failure shouldn't block the client clearing state.
  }
  clearSessionTokensIfCurrent(session.sessionId);
}

export async function fetchMe(): Promise<MeResponse> {
  const res = await api.get<MeResponse>("/auth/me");
  return res.data;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await api.post("/auth/change-password", { currentPassword, newPassword });
}

export async function forgotPassword(email: string): Promise<void> {
  await api.post("/auth/forgot-password", { email });
}

export interface ResendForgotPasswordResponse {
  ok: boolean;
  nextResendAvailableAt: string;
}

export async function resendForgotPassword(
  email: string,
): Promise<ResendForgotPasswordResponse> {
  const res = await api.post<ResendForgotPasswordResponse>(
    "/auth/forgot-password/resend",
    { email },
  );
  return res.data;
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<void> {
  await api.post("/auth/reset-password", { token, newPassword });
}
