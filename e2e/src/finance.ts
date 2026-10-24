/**
 * Business-rule reference arithmetic for ASSERTIONS ONLY (Business Rules v3.4
 * §4 SAL-01..04, CASH-01..03, DIFF-01..05). The suite never sends these values
 * as server-derived fields; it compares them with what the backend computed.
 *
 * All arithmetic is done in integer halalas (1 SAR = 100 halalas).
 */

export function sarToHalalas(sar: string): number {
  if (!/^\d+(\.\d{1,2})?$/.test(sar)) throw new Error(`Not a non-negative SAR amount with <= 2 decimals: ${sar}`);
  const [whole, frac = ''] = sar.split('.');
  return Number(whole) * 100 + Number((frac + '00').slice(0, 2));
}

export function halalasToSar(h: number): string {
  if (!Number.isSafeInteger(h)) throw new Error(`Not an integer halalas value: ${h}`);
  const sign = h < 0 ? '-' : '';
  const abs = Math.abs(h);
  return `${sign}${Math.trunc(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

export interface ShiftFigures {
  grossSar: string; // VAT-inclusive (SAL-01)
  cardSar: string; // SAL-03
  appsSar: string; // delivery apps at customer price, before commission (SAL-02/03)
  confirmedOpeningSar: string; // CASH-01..03: only confirmed receipts
  countedSar: string; // CASH-08: independent physical count
}

export interface ExpectedResults {
  grossH: number;
  netH: number;
  vatH: number;
  cashSalesH: number;
  expectedCashH: number;
  varianceH: number;
  shortageH: number;
  surplusH: number;
}

/**
 * net = gross / 1.15 (rounded half-up to the halala); VAT = gross − net;
 * expected cash = gross − cards − apps + confirmed opening; variance = counted − expected.
 * The rounding rule is only exercised by the approved example where it is exact.
 */
export function expectedResults(f: ShiftFigures): ExpectedResults {
  const grossH = sarToHalalas(f.grossSar);
  const cardH = sarToHalalas(f.cardSar);
  const appsH = sarToHalalas(f.appsSar);
  const openingH = sarToHalalas(f.confirmedOpeningSar);
  const countedH = sarToHalalas(f.countedSar);
  const netH = Math.round((grossH * 100) / 115);
  const vatH = grossH - netH;
  const cashSalesH = grossH - cardH - appsH;
  if (cashSalesH < 0) throw new Error('cards + apps exceed gross sales');
  const expectedCashH = cashSalesH + openingH;
  const varianceH = countedH - expectedCashH;
  return {
    grossH, netH, vatH, cashSalesH, expectedCashH, varianceH,
    shortageH: varianceH < 0 ? -varianceH : 0,
    surplusH: varianceH > 0 ? varianceH : 0,
  };
}

/** The two variants named in the task, both from BR v3.4 §4 "مثال حساب معتمد". */
export const SCENARIOS = {
  zeroOpening: { grossSar: '115.00', cardSar: '50.00', appsSar: '25.00', confirmedOpeningSar: '0.00', countedSar: '20.00' },
  confirmedOpening10: { grossSar: '115.00', cardSar: '50.00', appsSar: '25.00', confirmedOpeningSar: '10.00', countedSar: '30.00' },
} as const satisfies Record<string, ShiftFigures>;
