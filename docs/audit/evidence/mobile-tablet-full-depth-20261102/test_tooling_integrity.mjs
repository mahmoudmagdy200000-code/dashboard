import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import pw from '../../../../e2e/node_modules/@playwright/test/index.js';
import { inspectDOM, reconcile } from './evidence-integrity.mjs';

const browser = await pw.chromium.launch({headless:true,channel:'chrome'});
const results=[];
const good='<header>Sales</header><main><h2>Sales records</h2><p>Populated operation data and actions</p></main>';
async function measure(html, options={}) {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  try {await page.setContent(html);return await page.evaluate(inspectDOM,{expectedHeader:'Sales',checkLayout:true,...options});}
  finally {await page.close();}
}
async function rejected(id,html,options={}) {
  const actual=await measure(html,options);
  assert.equal(actual.passed,false,id+' must reject injected DOM defect');
  results.push({id,passed:true,measured:actual});
}
test('positive control accepts mounted correct content',async()=>assert.equal((await measure(good)).passed,true));
test('TOOL-NEG-01 rejects a different mounted screen',async()=>rejected('TOOL-NEG-01',good.replace('<header>Sales','<header>Subscriptions')));
test('TOOL-NEG-02 rejects the real application ErrorBoundary role',async()=>rejected('TOOL-NEG-02',good+'<div role="alert">Failed to render preview</div>'));
test('TOOL-NEG-03 rejects missing KPI even when unrelated text contains 2',async()=>rejected('TOOL-NEG-03',good+'<p>Order 2, year 2026</p>',{cash:true}));
test('TOOL-NEG-04 measures injected horizontal overflow in DOM',async()=>rejected('TOOL-NEG-04',good+'<div style="width:2000px">Overflow</div>'));
test('TOOL-NEG-05 rejects login fallback with otherwise valid heading',async()=>rejected('TOOL-NEG-05',good+'<input type="password">'));
test('TOOL-NEG-06 invokes real reconciler and rejects unknown key',()=>{
  const master=JSON.parse(fs.readFileSync('artifacts/responsive-evidence/full-depth-114-reconciliation/full_114_coverage_metrics.json'));
  const before=JSON.stringify(master);
  assert.throws(()=>reconcile(master,[{kind:'SMOKE',data:{totalCases:1,results:[{surface:'CompanyDashboard',role:'admin',screen:'admin-companies',lang:'ar',width:390,status:'PASS'}]}}]),/Unmatched delta key/);
  assert.throws(()=>reconcile(master,[]),/Missing measured identity evidence/);
  const partial=reconcile(master,[],{requireComplete:false});
  assert.equal(partial.notVerifiedCount,684);assert.equal(partial.passCount,0);
  const row={...master.coverage[0],status:'PASS',hasErrorBoundary:true,passesDistinctIdentity:true,consoleErrors:0};
  assert.throws(()=>reconcile(master,[{kind:'VERIFIED_SMOKE',data:{totalCases:1,results:[row]}}]),/Unsupported PASS/);
  assert.equal(JSON.stringify(master),before,'rejection must not mutate source');
  results.push({id:'TOOL-NEG-06',passed:true,measured:'Real reconciler threw Unmatched delta key; original dataset unchanged'});
});
after(async()=>{
  await browser.close();
  fs.writeFileSync('docs/audit/evidence/mobile-tablet-full-depth-20261102/tooling_integrity_evidence.json',JSON.stringify({executedAt:new Date().toISOString(),totalNegativeTests:6,allDefectsCaught:results.length===6&&results.every(r=>r.passed),testResults:results},null,2)+'\n');
});
