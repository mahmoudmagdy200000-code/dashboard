import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const caseKey = r => [r.surface, r.role, r.screen, r.lang, r.width].join('|');
export const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

// Executed in the browser by both verification runners and the negative tests.
export function inspectDOM({ expectedHeader, cash = false, checkLayout = false }) {
  const normalize = s => (s || '').replace(/\s+/g, ' ').trim();
  const numberText = s => normalize(s).replace(/[٠-٩]/g, c => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[٬,]/g, '').replace(/٫/g, '.');
  const main = document.querySelector('main');
  const header = normalize(document.querySelector('header')?.innerText);
  const text = normalize(main?.innerText);
  const hasErrorBoundary = !!document.querySelector('[role="alert"], .asab-error-boundary, .error-boundary')
    || /Failed to (render|load) preview|فشل تحميل المعاينة/.test(document.body.innerText);
  const isLoginScreen = !!document.querySelector('input[type="password"]');
  const passesDistinctIdentity = !!main && !!expectedHeader && header.includes(normalize(expectedHeader)) && text.length > 5;
  const kpiChecks = [];
  if (cash && main) {
    for (const [labels, value] of [
      [['عدد العهود النشطة', 'Active Custodies'], '2'],
      [['طلبات صرف معلقة', 'Pending Requests'], '1'],
      [['عهود قريبة من النفاد', 'Near Depletion'], '1'],
    ]) {
      const label = [...main.querySelectorAll('p,span')].find(e => labels.includes(normalize(e.textContent)));
      const card = label?.closest('.bg-white');
      const rendered = card?.querySelector('[class*="text-2xl"]')?.textContent;
      kpiChecks.push({ labels, expected: value, actual: normalize(rendered), passed: numberText(rendered) === value });
    }
  }
  const cashAmounts = cash ? ['3200.00', '500.00'].map(value => ({ expected: value, passed: numberText(text).includes(value) })) : [];
  const hasValidKpis = !cash || (kpiChecks.length === 3 && kpiChecks.every(x => x.passed) && cashAmounts.every(x => x.passed));
  const root = document.documentElement;
  const docScrollWidth = root.scrollWidth, docClientWidth = root.clientWidth;
  const mainScrollWidth = main?.scrollWidth ?? 0, mainClientWidth = main?.clientWidth ?? 0;
  const visible = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const branchEls = [...(main?.querySelectorAll('span,p,div') || [])].filter(e => !e.children.length && visible(e) && e.textContent.includes('assab-ui-qa-20261018'));
  const isBranchClipped = branchEls.some(e => e.scrollWidth > e.clientWidth + 5);
  const totalScrollHeight = main?.scrollHeight ?? 0, clientHeight = main?.clientHeight ?? 0;
  const maxScroll = Math.max(0, totalScrollHeight - clientHeight);
  const hasDocOverflow = docScrollWidth > docClientWidth + 2, hasMainOverflow = mainScrollWidth > mainClientWidth + 2;
  const passed = passesDistinctIdentity && !hasErrorBoundary && !isLoginScreen && hasValidKpis
    && (!checkLayout || (!hasDocOverflow && !hasMainOverflow && !isBranchClipped));
  return { passed, expectedHeader, header, headings: [...(main?.querySelectorAll('h1,h2,h3') || [])].map(e => normalize(e.textContent)),
    hasErrorBoundary, isLoginScreen, passesDistinctIdentity, hasValidKpis, kpiChecks, cashAmounts,
    hasDocOverflow, hasMainOverflow, docScrollWidth, docClientWidth, mainScrollWidth, mainClientWidth,
    docDiff: docScrollWidth-docClientWidth, mainDiff: mainScrollWidth-mainClientWidth, isBranchClipped,
    totalScrollHeight, clientHeight, maxScroll, middleScroll: Math.floor(maxScroll/2), isScrollable: maxScroll>0 };
}

export function expectedHeader(c, repo = process.cwd()) {
  const inventory = JSON.parse(fs.readFileSync(path.join(repo, 'docs/audit/evidence/mobile-tablet-full-depth-20261102/paths_114.json')));
  const row = inventory.find(r => r.surface === c.surface && r.role === c.role && r.screen === c.screen);
  if (!row) throw new Error('Unknown screen identity: ' + caseKey(c));
  if (c.lang === 'ar') return row.label;
  // Internal routes have explicit header labels in ASABPrototype.pageLabel, outside EN_NAV_LABELS.
  const internal={'acc-sales-detail':'Sales Operation Details','acc-inventory-items':'Select Daily Inventory Items'};
  if(c.surface==='ASABPrototype' && internal[c.screen])return internal[c.screen];
  const file = c.surface === 'ASABPrototype' ? 'ASABPrototype' : 'CompanyDashboard';
  const variable = c.surface === 'ASABPrototype' ? 'EN_NAV_LABELS' : 'EN_C_NAV_LABELS';
  const source = fs.readFileSync(path.join(repo, `artifacts/mockup-sandbox/src/components/mockups/asab/${file}.tsx`), 'utf8');
  const block = source.match(new RegExp(`const ${variable}[^=]*=\\s*(\\{[\\s\\S]*?\\n\\});`));
  if (!block) throw new Error('Missing source navigation labels');
  const labels = Function('return (' + block[1] + ')')();
  return labels[c.screen] || row.label;
}

export function reconcile(master, datasets, { requireComplete = true } = {}) {
  const result = structuredClone(master);
  const approved = new Map(result.coverage.map(r => [caseKey(r), r]));
  if (approved.size !== 684 || result.coverage.length !== 684) throw new Error('Master must have 684 unique combinations');
  const proven = new Set();
  for (const { data, evidencePath, digest, kind } of datasets) {
    const rows = data.results;
    if (!Array.isArray(rows) || rows.length !== data.totalCases) throw new Error('Inconsistent raw result count');
    const unique = new Set();
    for (const r of rows) {
      const key = caseKey(r);
      if (!approved.has(key)) throw new Error('Unmatched delta key: ' + key);
      if (unique.has(key) || proven.has(key)) throw new Error('Duplicate evidence: ' + key);
      unique.add(key); proven.add(key);
      if (!['PASS', 'FAIL', 'BLOCKED'].includes(r.status)) throw new Error('Invalid measured status');
      if (r.status === 'PASS' && (r.hasErrorBoundary !== false || r.passesDistinctIdentity !== true || r.consoleErrors !== 0 || (r.screen==='acc-cash' && r.hasValidKpis!==true) || (kind==='VERIFIED_DELTA' && (r.branchClipped || r.docOverflow || r.mainOverflow || r.chatOverlap)))) throw new Error('Unsupported PASS: ' + key);
      const item = approved.get(key);
      item.status = r.status === 'PASS' ? 'PASS (MOCK)' : r.status;
      item.provenance = kind;
      item.verification = { kind, source: evidencePath, sha256: digest, testedCommit: data.testedCommit, measuredAt: data.timestamp,
        hasErrorBoundary: r.hasErrorBoundary, passesDistinctIdentity: r.passesDistinctIdentity, consoleErrors: r.consoleErrors };
      if (kind === 'VERIFIED_DELTA') {
        Object.assign(item, { docOverflow:r.docOverflow, mainOverflow:r.mainOverflow, branchClipped:r.branchClipped,
          chatCoveringBottom:r.chatOverlap, scrollMeasurement:r.scrollMeasurement, screenshots:r.screenshots });
        item.scrollCoverage = 'TOP/MIDDLE/BOTTOM';
        item.layoutEvidence = 'MEASURED_DELTA';
      } else {
        item.scrollCoverage = 'HISTORICAL — NOT REVERIFIED';
        item.layoutEvidence = 'REUSED_HISTORICAL_MEASUREMENTS — PARTIAL';
      }
      item.interactionCoverage = ['acc-purchases','admin-companies','acc-assets'].includes(r.screen) && kind === 'VERIFIED_DELTA' ? 'TARGETED_SEPARATE_PROOF' : 'NOT REVERIFIED';
    }
  }
  const missing = [...approved.keys()].filter(k => !proven.has(k));
  for (const key of missing) { approved.get(key).status = 'NOT VERIFIED'; approved.get(key).provenance = 'UNVERIFIED'; }
  if (requireComplete && missing.length) throw new Error('Missing measured identity evidence: ' + missing.length);
  result.passCount = result.coverage.filter(r=>r.status==='PASS (MOCK)').length;
  result.failCount = result.coverage.filter(r=>r.status==='FAIL').length;
  result.blockedCount = result.coverage.filter(r=>r.status==='BLOCKED').length;
  result.notVerifiedCount = missing.length;
  result.scope = 'Local mock screen identity/error closure; 28 targeted full-depth results; historical layout measurements retained separately. No full-depth claim for all 114 paths.';
  return result;
}
