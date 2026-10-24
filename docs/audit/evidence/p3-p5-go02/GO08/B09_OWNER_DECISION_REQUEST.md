# B09 / R3-F14 — Owner Decision Request

**Current source:** `HeadPending.tsx` shows `fmtAmt(totalAmt)` in the exact summary and a rounded `(totalAmt / 1000).toFixed(0) + "K"` KPI.
**Current status:** `BLOCKED_DECISION`; no code or financial calculation changed.

On mobile the exact summary and abbreviated KPI may appear inconsistent. Please choose:

- **Recommended — label approximation:** preserve both displayed numeric values and the existing currency/unit, adding an AR/EN “approximate” label to the rounded KPI. This explains rounding without changing the underlying amount or unit.
- **Use exact formatted amount in the KPI:** preserve the exact amount and existing currency/unit in both places, accepting the visible precision/layout change.
- **Keep current behavior:** confirm that the exact summary plus rounded KPI is intentional.

Please approve the option and exact Arabic/English wording. No implementation should proceed before this decision. After approval, acceptance requires testing at 320/360/390/430/768 px in AR/RTL and EN/LTR, confirming the underlying amount and unit are unchanged and the label is understandable.
