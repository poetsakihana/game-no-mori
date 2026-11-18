const { chromium } = require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:390,height:844}});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const url=process.env.TEST_URL||'http://localhost:8749/zatuplay/games/puchitto-break-150/';
 await page.goto(url);await page.locator('#featured').click();
 for(let i=0;i<35;i++)await page.getByRole('button',{name:'ひとつ押す',exact:true}).click();
 assert.match(await page.locator('#progress').innerText(),/1 \/ 150/);
 await page.locator('#favorite').click();await page.reload();await page.waitForFunction(()=>typeof save!=='undefined');
 assert.equal(await page.locator('#favorite').getAttribute('aria-pressed'),'true');
 assert.match(await page.locator('#progress').innerText(),/1 \/ 150/);
 // Download real backup; cancel then restore same file.
 const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#backup').click()]);
 const path=await download.path();
 page.once('dialog',d=>d.dismiss());await page.locator('#restore').setInputFiles(path);await page.waitForTimeout(100);
 await page.locator('#favorite').click();
 page.once('dialog',d=>d.accept());await page.locator('#restore').setInputFiles(path);await page.waitForTimeout(300);await page.waitForFunction(()=>typeof save!=='undefined');
 assert.equal(await page.locator('#favorite').getAttribute('aria-pressed'),'true');
 const second=await context.newPage();await second.goto(url);await second.locator('#storage-stop').waitFor();assert.match(await second.locator('#storage-stop').innerText(),/別のタブ/);await second.close();
 await page.locator('#back').click();await page.locator('#lobby').waitFor({state:'visible'});
 await page.locator('#search').fill('見つからない言葉XYZ');assert.match(await page.locator('#count').innerText(),/0 種類/);
 await page.locator('#search').fill('');
 // All 150 scenes initialize via normal URL hash transitions, not completion simulation.
 for(let id=1;id<=150;id++) {await page.evaluate(id=>location.hash='play-'+id,id);await page.waitForFunction(id=>typeof current!=='undefined'&&current?.id===id,id);await page.waitForTimeout(15)}
 assert.equal(errors.length,0,errors.join('\n'));
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.screenshot({path:'/tmp/puchitto-mobile.png',fullPage:true});
 await context.close();
 // Fail closed on corrupted record, preserve bytes.
 const corrupt=await browser.newContext();const cp=await corrupt.newPage();await cp.goto(url);await cp.waitForFunction(()=>typeof save!=='undefined');
 await cp.evaluate(()=>localStorage.setItem('puchitto-break-150-v1','{broken'));await cp.reload();await cp.locator('#storage-stop').waitFor();
 assert.equal(await cp.evaluate(()=>localStorage.getItem('puchitto-break-150-v1')),'{broken');
 assert.equal(await cp.evaluate(()=>typeof save),'undefined');await corrupt.close();
 await browser.close();console.log('PASS: first game clear, favorite/reload, real backup restore/cancel/reselect, 2-tab guard, search, all 150 scenes mount, 390px no overflow, corrupted data unchanged; zero page errors.');
})().catch(e=>{console.error(e);process.exit(1)});
