import fs from 'node:fs';
import { reconcile, sha256 } from './evidence-integrity.mjs';
const base='docs/audit/evidence/mobile-tablet-full-depth-20261102/';
const full='artifacts/responsive-evidence/full-depth-114-reconciliation/full_114_coverage_metrics.json';
const datasets=[['delta_remediation_metrics.json','VERIFIED_DELTA'],['smoke_closure_metrics.json','VERIFIED_SMOKE']].map(([name,kind])=>{
  const evidencePath=base+name;
  return {data:JSON.parse(fs.readFileSync(evidencePath)),kind,evidencePath,digest:sha256(evidencePath)};
});
const merged=reconcile(JSON.parse(fs.readFileSync(full)),datasets);
const inventory=JSON.parse(fs.readFileSync(base+'paths_114.json'));
const expected=new Set(inventory.flatMap(r=>[390,820,1280].flatMap(width=>['ar','en'].map(lang=>[r.surface,r.role,r.screen,lang,width].join('|')))));
if(expected.size!==684||merged.coverage.some(r=>!expected.has([r.surface,r.role,r.screen,r.lang,r.width].join('|'))))throw new Error('Inventory dimensions mismatch');
merged.lastUpdated=new Date().toISOString();
fs.writeFileSync(full,JSON.stringify(merged,null,2)+'\n');
console.log(JSON.stringify({total:merged.coverage.length,pass:merged.passCount,fail:merged.failCount,blocked:merged.blockedCount,notVerified:merged.notVerifiedCount,delta:datasets[0].data.totalCases,smoke:datasets[1].data.totalCases}));
if(merged.failCount||merged.blockedCount||merged.notVerifiedCount)process.exitCode=1;
