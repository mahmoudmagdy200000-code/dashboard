import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {caseKey,sha256} from './evidence-integrity.mjs';
const base='docs/audit/evidence/mobile-tablet-full-depth-20261102/';
const full='artifacts/responsive-evidence/full-depth-114-reconciliation/full_114_coverage_metrics.json';
const master=JSON.parse(fs.readFileSync(full));
const delta=JSON.parse(fs.readFileSync(base+'delta_remediation_metrics.json'));
const smoke=JSON.parse(fs.readFileSync(base+'smoke_closure_metrics.json'));
const inventory=JSON.parse(fs.readFileSync(base+'paths_114.json'));
assert.equal(inventory.length,114);assert.equal(master.coverage.length,684);
const keys=new Set(master.coverage.map(caseKey));assert.equal(keys.size,684);
const measured=new Map([...delta.results,...smoke.results].map(r=>[caseKey(r),r]));
assert.equal(delta.totalCases,28);assert.equal(smoke.totalCases,656);assert.equal(measured.size,684);
const old=JSON.parse(execFileSync('git',['show','8ec147c9:./'+full],{encoding:'utf8',maxBuffer:2000000}));
const oldMap=new Map(old.coverage.map(r=>[caseKey(r),r]));
let screenshots=0;
for(const r of master.coverage){
  const actual=measured.get(caseKey(r));assert.ok(actual);assert.equal(actual.status,'PASS');
  assert.equal(r.status,'PASS (MOCK)');assert.equal(r.verification.hasErrorBoundary,false);assert.equal(r.verification.consoleErrors,0);assert.equal(r.verification.passesDistinctIdentity,true);
  assert.ok(fs.existsSync(r.verification.source));assert.equal(sha256(r.verification.source),r.verification.sha256);
  if(r.provenance==='VERIFIED_DELTA'){
    assert.equal(actual.branchClipped,false);assert.equal(actual.mainOverflow,false);
    const s=actual.scrollMeasurement;
    assert.equal(s.actualScrollOffsets.top,0);assert.equal(s.actualScrollOffsets.mid,s.middleScroll);assert.equal(s.actualScrollOffsets.bottom,s.maxScroll);
    for(const f of Object.values(actual.screenshots)){const p='artifacts/responsive-evidence/full-depth-114-reconciliation/delta_remediation/'+f;assert.ok(fs.statSync(p).size>100);screenshots++;}
    if(s.maxScroll>1){assert.notEqual(actual.screenshots.top,actual.screenshots.bottom);}
  }else{
    assert.equal(r.provenance,'VERIFIED_SMOKE');
    for(const field of ['docOverflow','mainOverflow','branchClipped','chatCoveringBottom'])assert.equal(r[field],oldMap.get(caseKey(r))[field],`Historical measurement mutated: ${caseKey(r)} ${field}`);
  }
}
assert.equal(screenshots,84);
const proofRoot='artifacts/responsive-evidence/full-depth-114-reconciliation/';
const horizontal=JSON.parse(fs.readFileSync(proofRoot+'horizontal_scroll_proofs.json'));
assert.equal(horizontal.proofs.length,3);assert.ok(horizontal.proofs.every(r=>r.passed));
for(const f of ['proof1_acc_purchases_before_click.png','proof1_acc_purchases_after_click.png','proof2_admin_companies_before_click.png','proof2_admin_companies_after_click.png','proof3_acc_assets.png'])assert.ok(fs.statSync(proofRoot+'horizontal_proofs/'+f).size>100);
const initial=JSON.parse(fs.readFileSync(base+'smoke_initial_metrics.json'));
assert.equal(initial.totalCases,656);assert.equal(initial.failCount,6);
assert.equal(smoke.failCount,0);
for(const r of smoke.results){const first=initial.results.find(x=>caseKey(x)===caseKey(r));assert.ok(first);if(first.status==='PASS')assert.equal(JSON.stringify(first),JSON.stringify(r),'Previously passing smoke record must be preserved');}

for(const role of ['admin','company-admin','head','accountant','branch','procurement','supplier'])assert.ok(master.coverage.some(r=>r.role===role));
for(const c of inventory)for(const width of [390,820,1280])for(const lang of ['ar','en'])assert.ok(keys.has(caseKey({...c,width,lang})));
const neg=JSON.parse(fs.readFileSync(base+'tooling_integrity_evidence.json'));assert.equal(neg.testResults.length,6);assert.equal(neg.allDefectsCaught,true);
const md=fs.readFileSync(base+'MASTER_COVERAGE_MATRIX_114.md','utf8');assert.equal(md.split('\n').filter(s=>s.startsWith('| ASABPrototype')||s.startsWith('| CompanyDashboard')).length,684);
const sourceDiff=execFileSync('git',['diff','8ec147c9','--','artifacts/mockup-sandbox/src'],{encoding:'utf8'});assert.equal(sourceDiff,'','Application source outside evidence closure scope changed');
const tested=JSON.parse(fs.readFileSync(base+'tested-files.json'));
for(const file of tested.files)assert.equal(sha256(file.path),file.sha256,'Tested file digest mismatch: '+file.path);
assert.equal(sha256('docs/audit/ASSAB_DASHBOARD_MASTER_FINDINGS.md'),tested.masterRegisterSha256);
const gates=['typecheck.txt','build.txt','unit-tests.txt','tooling-tests.txt','delta.txt','smoke-retry.txt','reconciliation.txt'];
for(const log of gates){const text=fs.readFileSync(base+'closure-logs/'+log,'utf8');assert.ok(/EXIT_CODE=0\s*$/.test(text),log+' gate failed');}
const summary={qualityLogsChecked:gates.length,applicationSourceTree:execFileSync('git',['rev-parse','HEAD:artifacts/mockup-sandbox/src'],{encoding:'utf8'}).trim(),timestamp:new Date().toISOString(),inventory:114,uniqueCombinations:684,delta:28,smoke:656,screenshots:84,negativeTests:6,historicalLayoutPreserved:true,applicationSourceUnchanged:true,rule13Scope:'28 targeted full-depth cases, 656 identity/error smoke cases; historical remaining layout is partial',passed:true};
fs.writeFileSync(base+'self_audit.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
