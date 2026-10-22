export const fmtAmt = (n: number | null | undefined): string => {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
