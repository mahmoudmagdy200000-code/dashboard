// Reproduce only the two previously false-PASS fixtures from the frozen parent.
// Does not run the archived suite, save screenshots, or write application files.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
const src=execFileSync('git',['show','8ec147c9:./docs/audit/evidence/mobile-tablet-full-depth-20261102/run_full_114_verification.mjs'],{encoding:'utf8'});
let prefix=src.slice(0,src.indexOf('async function main()'))
  .replace('"../../../../e2e/node_modules/@playwright/test/index.js"',JSON.stringify(pathToFileURL(path.resolve('e2e/node_modules/@playwright/test/index.js')).href))
  .replace('fs.mkdirSync(outDir, { recursive: true });','');
const mocks=src.slice(src.indexOf('await page.route("**/api/v1/**"'),src.indexOf('// Loop over screens in this role/surface'));
const code=`
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{for(const screen of ['acc-sales','acc-expenses']){
 const role='accountant',slug='asab/ASABPrototype',user=getMockUser(role);
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
 await page.addInitScript(({slug,role})=>{sessionStorage.setItem('asab.tokens',JSON.stringify({accessToken:'mock-token',refreshToken:'mock-token'}));localStorage.setItem('asab_entry_selection',JSON.stringify({slug,role}));localStorage.setItem('asab_site_lang','ar');localStorage.setItem('asab_lang','ar');},{slug,role});
 ${mocks}
 await page.goto('http://127.0.0.1:4173/?page='+screen+'#/preview/'+slug,{waitUntil:'domcontentloaded'});
 await page.waitForSelector('[role=alert]',{timeout:15000});
 const error=await page.locator('[role=alert]').innerText();
 if(!error.includes(screen==='acc-sales' ? "reading 'length'" : "reading 'matched'"))throw new Error('Unexpected reproduction: '+error);
 console.log(JSON.stringify({screen,legacyOutcome:'REPRODUCED_ERROR',error}));await context.close();
}}finally{await browser.close();}`;
await import('data:text/javascript;base64,'+Buffer.from(prefix+code).toString('base64'));
