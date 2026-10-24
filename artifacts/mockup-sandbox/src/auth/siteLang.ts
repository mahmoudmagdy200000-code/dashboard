import { useCallback, useEffect, useState } from "react";

// Site-wide language preference (Arabic / English), shared across the entry
// screens and both dashboards via localStorage + a custom event so every mounted
// consumer updates the moment the toggle flips.
export type SiteLang = "ar" | "en";

const KEY = "asab_lang";
const EVT = "asab:lang";

export function getSiteLang(): SiteLang {
  try {
    return localStorage.getItem(KEY) === "en" ? "en" : "ar";
  } catch {
    return "ar";
  }
}

export function setSiteLang(lang: SiteLang): void {
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    /* ignore storage failures */
  }
  try {
    window.dispatchEvent(new CustomEvent(EVT, { detail: lang }));
  } catch {
    /* ignore */
  }
}

/** Keep screen-reader language metadata aligned with the active site locale. */
export function useDocumentLang(lang: SiteLang): void {
  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, [lang]);
}

/** Reactive site-language hook. Returns [lang, setLang, t] where t(ar,en) picks by lang. */
export function useSiteLang(): [SiteLang, (l: SiteLang) => void, <T>(ar: T, en: T) => T] {
  const [lang, setLangState] = useState<SiteLang>(getSiteLang);
  useDocumentLang(lang);
  useEffect(() => {
    const sync = () => setLangState(getSiteLang());
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const setLang = useCallback((l: SiteLang) => {
    setSiteLang(l);
    setLangState(l);
  }, []);
  const t = useCallback(
    <T,>(ar: T, en: T): T => (lang === "ar" ? ar : en),
    [lang],
  );
  return [lang, setLang, t];
}
