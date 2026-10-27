import { expect, type Page, type Locator } from '@playwright/test';
import type { AdminSession } from '../api/auth';
import { startUiTrace } from '../fixtures';

/**
 * Page objects for the routed CompanyDashboard (dashboard @ ce078df).
 * Selectors are derived from the real source: there are no data-testid
 * attributes, so we use accessible names / titles / visible text and force the
 * site language to English (localStorage `asab_lang`), with Arabic fallbacks.
 */

const TOKENS_KEY = 'asab.tokens'; // src/api/tokens.ts
const ENTRY_KEY = 'asab_entry_selection'; // src/auth/entrySelection.ts
const LANG_KEY = 'asab_lang'; // src/auth/siteLang.ts

export type DashboardRole = 'accountant' | 'head' | 'branch' | 'company-admin';

/**
 * Resumes a dashboard session from tokens obtained via the real /auth/login.
 * The app then validates them with GET /auth/me (AuthContext bootstrap).
 * Typing the password into the form is covered once, with tracing disabled,
 * in tests/preflight/ui-login.spec.ts so credentials never land in a trace.
 */
export async function openAs(page: Page, frontendUrl: string, session: AdminSession, role: DashboardRole): Promise<void> {
  await page.addInitScript(
    ([tk, ek, lk, tokens, entry]) => {
      try {
        window.sessionStorage.setItem(tk, tokens);
        window.localStorage.setItem(tk, tokens);
        window.localStorage.setItem(ek, entry);
        window.localStorage.setItem(lk, 'en');
      } catch {
        /* storage unavailable */
      }
    },
    [TOKENS_KEY, ENTRY_KEY, LANG_KEY,
      JSON.stringify({ accessToken: session.accessToken, refreshToken: session.refreshToken }),
      JSON.stringify({ slug: 'asab/CompanyDashboard', role })] as const,
  );
  // Start the browser-context trace only now, so the injected tokens (init-script
  // arguments) are not recorded. See src/fixtures.ts for retention on failure.
  await startUiTrace(page);
  await page.goto(frontendUrl + '/');
}

export class CompanyShell {
  constructor(readonly page: Page) {}

  /** Sidebar entries come from the role NAV map; English labels from EN_C_NAV_LABELS. */
  nav(labelEn: string, labelAr: string): Locator {
    return this.page.getByRole('button', { name: new RegExp(`^\\s*(${labelEn}|${labelAr})(\\s+\\d+)?\\s*$`) /* optional badge count */ }).first();
  }

  async go(labelEn: string, labelAr: string): Promise<void> {
    const item = this.nav(labelEn, labelAr);
    await expect(item, `sidebar entry ${labelEn}`).toBeVisible({ timeout: 30_000 });
    await item.click();
  }

  /** OpRow container identified by the operation's public id (refNum) text. */
  opRow(publicId: string): Locator {
    // OpRow root: <div class="border-b ..."> containing <p dir="ltr">{op.refNum}</p>; refNum = API publicId
    // (operationMapping.ts). Ancestors precede descendants in DOM order, so .last() is the row root.
    const ref = this.page.locator('p[dir="ltr"]', { hasText: new RegExp(`^${escapeRe(publicId)}$`) });
    return this.page.locator('div.border-b').filter({ has: ref }).last();
  }

  shiftDetails(): Locator {
    return this.page.getByRole('region', { name: /Cashier shift details|تفاصيل وردية الكاشير/ });
  }
}

/** Accountant «Shift Management» → «Shift review» tab (CompanyDashboard: tab key "close", label "Shift review"). */
export class AccountantShiftReview extends CompanyShell {
  async open(): Promise<void> {
    await this.go('Shift Management', 'إدارة الشفتات');
    await this.page.getByRole('button', { name: /Shift review|مراجعة الورديات/ }).click();
  }

  async expand(publicId: string): Promise<Locator> {
    const row = this.opRow(publicId);
    await expect(row, `SHF row ${publicId} in accountant review queue`).toBeVisible({ timeout: 30_000 });
    await row.locator('p[dir="ltr"]').first().click(); // row header toggles expansion (onToggle)
    const details = this.shiftDetails();
    await expect(details).toBeVisible({ timeout: 30_000 });
    return details;
  }

  approveButton(publicId: string): Locator {
    return this.opRow(publicId).getByTitle(/^(Approve|موافقة)$/);
  }
}

/** Accountant «Sales» page — the daily PKG-6 report is a `sales` operation. */
export class AccountantSales extends CompanyShell {
  async open(): Promise<void> {
    await this.go('Sales', 'المبيعات');
  }

  approveButton(publicId: string): Locator {
    return this.opRow(publicId).getByTitle(/^(Approve|موافقة)$/);
  }
}

/** Head of Accounts module pages (head-shifts / head-sales) → HeadModulePage with final approve. */
export class HeadModule extends CompanyShell {
  async openShifts(): Promise<void> {
    await this.go('Shifts', 'الشفتات');
  }

  async openSales(): Promise<void> {
    await this.go('Sales', 'المبيعات');
  }

  finalApproveButton(publicId: string): Locator {
    return this.opRow(publicId).getByTitle(/^(Final Approve|اعتماد نهائي)$/);
  }
}

/** Number as the panel renders it for language "en": en-US grouping, 2 decimals (formatShiftHalalas). */
export function enMoney(halalas: number): string {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(halalas / 100);
}

/** Assert one "label … value" line inside the SHF details panel. */
export async function expectPanelLine(panel: Locator, labelEn: string, value: string): Promise<void> {
  // ShiftOpPanel line(): <div class="flex justify-between ..."><span>{label}</span><bdi>{value}</bdi></div>
  const label = panel.page().locator('span', { hasText: new RegExp(`^${escapeRe(labelEn)}$`) });
  const line = panel.locator('div.justify-between').filter({ has: label }).first();
  await expect(line.locator('bdi'), `panel line "${labelEn}"`).toHaveText(value);
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
