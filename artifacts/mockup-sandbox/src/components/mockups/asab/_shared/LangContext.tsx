import { createContext, useContext } from "react";

export type Lang = "ar" | "en";

export interface LangCtxType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: <T>(ar: T, en: T) => T;
  dir: "rtl" | "ltr";
}

export const LangContext = createContext<LangCtxType>({
  lang: "ar",
  setLang: () => { },
  t: <T,>(ar: T, _en: T): T => ar,
  dir: "rtl",
});

export const useLang = () => useContext(LangContext);
