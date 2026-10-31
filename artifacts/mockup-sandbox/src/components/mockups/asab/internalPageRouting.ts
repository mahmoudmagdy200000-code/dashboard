/**
 * Internal Page Routing Preservation (DB-R05)
 *
 * Preserves the active internal dashboard page identifier across browser refreshes (F5)
 * using URL query parameters without full reloads, while strictly maintaining:
 * 1. Role Guards (never allowing a user to load an unauthorized role's page).
 * 2. Privacy & Security (NEVER storing financial numbers, secrets, tokens in the URL).
 * 3. History Navigation (Back / Forward button restoration).
 */

const PAGE_SLUG_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

/**
 * Validates that candidate page identifier is a clean, safe slug without query injections,
 * scripts, secrets, or financial amounts.
 */
export function isValidPageSlug(candidate: unknown): boolean {
  if (typeof candidate !== "string") return false;
  const trimmed = candidate.trim();
  if (!trimmed || trimmed.length > 64) return false;
  return PAGE_SLUG_PATTERN.test(trimmed);
}

export type LocationLike = {
  search?: string;
  hash?: string;
  href?: string;
};

/**
 * Reads the preserved internal page from window location or provided LocationLike.
 * Checks URL search parameters first (?page=...), then hash query parameters (#/preview/...?page=...).
 */
export function readInternalPageRoute(loc?: LocationLike): string | null {
  try {
    let search = loc?.search;
    let hash = loc?.hash;

    if (loc === undefined && typeof window !== "undefined" && window.location) {
      search = window.location.search;
      hash = window.location.hash;
    }

    // 1. Check search query string
    if (search) {
      const sp = new URLSearchParams(search);
      const page = sp.get("page");
      if (isValidPageSlug(page)) {
        return page;
      }
    }

    // 2. Fallback: check query string inside hash (e.g. #/preview/asab/CompanyDashboard?page=...)
    if (hash) {
      const qIndex = hash.indexOf("?");
      if (qIndex !== -1) {
        const hp = new URLSearchParams(hash.slice(qIndex)).get("page");
        if (isValidPageSlug(hp)) {
          return hp;
        }
      }
    }
  } catch {
    /* ignore location reading errors */
  }

  return null;
}

/**
 * Resolves the active page by checking candidate against role guards.
 * If unauthorized or missing, falls back safely to defaultPage.
 */
export function resolveInternalPage<R extends string>(
  role: R | null,
  candidatePage: string | null | undefined,
  defaultPage: string,
  roleValidator?: (role: R, page: string, fallback: string) => string,
): string {
  if (!role) return "";
  if (!candidatePage || !isValidPageSlug(candidatePage)) return defaultPage;

  if (roleValidator) {
    const validated = roleValidator(role, candidatePage, "");
    if (validated === candidatePage) {
      return candidatePage;
    }
    return defaultPage;
  }

  return candidatePage;
}

/**
 * Builds an updated URL preserving existing origin, path, and hash route,
 * while setting the page query param and stripping any stale query from hash.
 */
export function buildInternalPageUrl(page: string, currentUrl?: string): string {
  const href = currentUrl ?? (typeof window !== "undefined" && window.location ? window.location.href : "http://localhost/");
  const url = new URL(href);

  // Clean any stale query string embedded in hash
  if (url.hash.includes("?")) {
    const qIndex = url.hash.indexOf("?");
    url.hash = url.hash.slice(0, qIndex);
  }

  url.searchParams.set("page", page);
  return url.toString();
}

/**
 * Updates window history state and URL query parameter to preserve internal page.
 */
export function writeInternalPageRoute(
  page: string,
  options?: { replace?: boolean; historyKey?: string },
): void {
  try {
    if (typeof window === "undefined" || !window.history || !window.location) return;
    if (!isValidPageSlug(page)) return;

    const key = options?.historyKey || "asabCoPage";
    const st = { ...(window.history.state || {}), [key]: page };
    const newUrl = buildInternalPageUrl(page);

    if (options?.replace) {
      window.history.replaceState(st, "", newUrl);
    } else {
      window.history.pushState(st, "", newUrl);
    }
  } catch {
    /* history / URL update unavailable */
  }
}
