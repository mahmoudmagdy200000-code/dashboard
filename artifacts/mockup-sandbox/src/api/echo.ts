import Echo from "laravel-echo";
import Pusher from "pusher-js";
import { APP_BASE_URL } from "./client";
import { getTokens } from "./tokens";

let echoInstance: Echo<"pusher"> | null = null;

const PUSHER_KEY = import.meta.env?.VITE_PUSHER_APP_KEY ?? "";
const PUSHER_CLUSTER = import.meta.env?.VITE_PUSHER_APP_CLUSTER ?? "mt1";

/**
 * Returns the singleton Echo instance, or null if Pusher credentials are not
 * configured. Callers should always null-check — realtime is best-effort UX.
 */
export function getEcho(): Echo<"pusher"> | null {
  if (!PUSHER_KEY) return null;
  if (echoInstance) return echoInstance;

  // Required by laravel-echo
  (window as unknown as { Pusher: typeof Pusher }).Pusher = Pusher;

  echoInstance = new Echo({
    broadcaster: "pusher",
    key: PUSHER_KEY,
    cluster: PUSHER_CLUSTER,
    forceTLS: true,
    authEndpoint: `${APP_BASE_URL}/broadcasting/auth`,
    auth: {
      headers: {
        Authorization: `Bearer ${getTokens()?.accessToken ?? ""}`,
        Accept: "application/json",
      },
    },
  });

  return echoInstance;
}

/** Tears down the Echo connection (call on logout). */
export function disconnectEcho(): void {
  if (echoInstance) {
    echoInstance.disconnect();
    echoInstance = null;
  }
}

/** True only if Pusher credentials are set; check before relying on realtime UX. */
export function isRealtimeEnabled(): boolean {
  return Boolean(PUSHER_KEY);
}
