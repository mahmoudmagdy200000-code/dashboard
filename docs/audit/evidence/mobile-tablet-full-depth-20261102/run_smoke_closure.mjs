import pw from '../../../../e2e/node_modules/@playwright/test/index.js';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { getMockUser, installMocks } from './verification-fixtures.mjs';
import { inspectDOM, expectedHeader, caseKey, sha256 } from './evidence-integrity.mjs';

const root = 'docs/audit/evidence/mobile-tablet-full-depth-20261102/';
const output = root + 'smoke_closure_metrics.json';
const master = JSON.parse(fs.readFileSync('artifacts/responsive-evidence/full-depth-114-reconciliation/full_114_coverage_metrics.json'));
const delta = JSON.parse(fs.readFileSync(root+'delta_remediation_metrics.json'));
const deltaKeys = new Set(delta.results.map(caseKey));
const required = master.coverage.filter(r => !deltaKeys.has(caseKey(r)));
if (required.length !== 656 || new Set(required.map(caseKey)).size !== 656) throw new Error('Expected exactly 656 historical keys');
const pilot = process.argv.includes('--pilot');
const retry = process.argv.includes('--retry');
const previous = retry && fs.existsSync(output) ? JSON.parse(fs.readFileSync(output)).results : [];
const previousMap = new Map(previous.map(r=>[caseKey(r),r]));
const jobs = required.filter(r => (!pilot || (r.width===390 && r.lang==='ar')) && (!retry || previousMap.get(caseKey(r))?.status!=='PASS'));
const browser = await pw.chromium.launch({headless:true,channel:'chrome'});
const results = [], started = new Date().toISOString();
const testedCommit = execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const fixtureDigest = sha256(root+'verification-fixtures.mjs');
let cursor=0;
async function worker() {
  while(cursor<jobs.length) {
    const c=jobs[cursor++], slug='asab/'+c.surface;
    const context=await browser.newContext({viewport:{width:c.width,height:c.width===1280?800:c.width===820?1024:844},locale:c.lang==='ar'?'ar-SA':'en-US'});
    const page=await context.newPage(), errors=[], requests=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.addInitScript(({slug,role,lang})=>{
      sessionStorage.setItem('asab.tokens',JSON.stringify({accessToken:'mock-token',refreshToken:'mock-token'}));
      localStorage.setItem('asab_entry_selection',JSON.stringify({slug,role}));
      localStorage.setItem('asab_site_lang',lang);localStorage.setItem('asab_lang',lang);
    },{slug,role:c.role,lang:c.lang});
    await installMocks(page,getMockUser(c.role),requests);
    let result;
    try {
      await page.goto(`http://127.0.0.1:4173/?page=${c.screen}#/preview/${slug}`,{waitUntil:'domcontentloaded',timeout:20000});
      await page.waitForSelector('main,[role="alert"]',{timeout:15000});
      await page.waitForTimeout(500);
      const dom=await page.evaluate(inspectDOM,{expectedHeader:expectedHeader(c),cash:c.screen==='acc-cash'});
      result={...c,status:dom.passed && !errors.length?'PASS':'FAIL',...dom,consoleErrors:errors.length,errors};
    } catch(e) {result={...c,status:'BLOCKED',hasErrorBoundary:false,passesDistinctIdentity:false,consoleErrors:errors.length,errors:[e.message,...errors]};}
    result.requests=[...new Set(requests)]; result.fixtureSha256=fixtureDigest; result.measuredAt=new Date().toISOString();
    results.push(result);
    console.log(JSON.stringify({key:caseKey(c),status:result.status,header:result.header,expected:result.expectedHeader,errors:result.errors,requests:result.status==='PASS'?undefined:result.requests}));
    await context.close();
  }
}
try {await Promise.all([worker(),worker(),worker()]);} finally {await browser.close();}
const merged=new Map(previous.map(r=>[caseKey(r),r]));for(const r of results)merged.set(caseKey(r),r);
const final=required.map(r=>merged.get(caseKey(r))).filter(Boolean);
const data={timestamp:started,testedCommit,fixtureSha256:fixtureDigest,scope:'Identity/error smoke only; no responsive remeasurement or financial mutations',totalCases:final.length,expectedCases:656,passCount:final.filter(r=>r.status==='PASS').length,failCount:final.filter(r=>r.status!=='PASS').length,results:final};
fs.writeFileSync(output,JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify({total:data.totalCases,pass:data.passCount,fail:data.failCount}));
process.exitCode=data.failCount?1:0;
