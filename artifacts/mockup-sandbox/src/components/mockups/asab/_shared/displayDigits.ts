export type DisplayLanguage = "ar" | "en";

/** Rendered copy only. Keep IDs, input values, API payloads and exports untouched. */
export function displayDigits(value: string | number, language: DisplayLanguage): string {
  const text = String(value);
  if (language === "ar") {
    return text.replace(/[0-9]/g, digit => String.fromCharCode(0x0660 + Number(digit)));
  }
  return text.replace(/[٠-٩۰-۹]/g, digit => {
    const code = digit.charCodeAt(0);
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  });
}
