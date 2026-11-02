import fs from "fs";
import path from "path";

const deltaMetricsPath = path.resolve("docs/audit/evidence/mobile-tablet-full-depth-20261102/delta_remediation_metrics.json");
const fullMetricsPath = path.resolve("artifacts/responsive-evidence/full-depth-114-reconciliation/full_114_coverage_metrics.json");

if (!fs.existsSync(deltaMetricsPath)) {
  console.error("Delta metrics file not found:", deltaMetricsPath);
  process.exit(1);
}

if (!fs.existsSync(fullMetricsPath)) {
  console.error("Full 114 metrics file not found:", fullMetricsPath);
  process.exit(1);
}

const deltaData = JSON.parse(fs.readFileSync(deltaMetricsPath, "utf8"));
const fullData = JSON.parse(fs.readFileSync(fullMetricsPath, "utf8"));

// Build map of measured delta results
const deltaMap = new Map();
for (const r of deltaData.results) {
  const key = `${r.surface}|${r.role}|${r.screen}|${r.lang}|${r.width}`;
  deltaMap.set(key, r);
}

let updatedCount = 0;
for (const item of fullData.coverage) {
  const key = `${item.surface}|${item.role}|${item.screen}|${item.lang}|${item.width}`;
  if (deltaMap.has(key)) {
    const measured = deltaMap.get(key);
    item.status = measured.status;
    item.docOverflow = measured.docOverflow;
    item.mainOverflow = measured.mainOverflow;
    item.branchClipped = measured.branchClipped;
    item.chatCoveringBottom = measured.chatOverlap;
    item.isBlocked = false;
    item.blockReason = null;
    updatedCount++;
  }
}

fullData.passCount = fullData.coverage.filter(c => c.status === "PASS").length;
fullData.failCount = fullData.coverage.filter(c => c.status === "FAIL").length;
fullData.blockedCount = fullData.coverage.filter(c => c.status === "BLOCKED").length;

fs.writeFileSync(fullMetricsPath, JSON.stringify(fullData, null, 2), "utf8");

console.log(`Updated ${updatedCount} records in full 114 coverage metrics using measured delta execution:`);
console.log({
  totalPaths: fullData.totalPaths,
  totalExecutions: fullData.totalExecutions,
  passCount: fullData.passCount,
  failCount: fullData.failCount,
  blockedCount: fullData.blockedCount,
});
