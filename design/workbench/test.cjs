const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/Users/robinstethem/Programs/great_circle/node_modules/playwright');
const assert=require('node:assert/strict');const fs=require('node:fs/promises');const path=require('node:path');
const base=process.env.BASE_URL||'http://127.0.0.1:8783';
(async()=>{
 const executablePath=process.env.CHROMIUM_PATH||'/Users/robinstethem/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
 const browser=await chromium.launch({headless:true,executablePath});const results=[],errors=[],external=[];
 try{
 const tokens=JSON.parse(await fs.readFile(path.join(__dirname,'../tokens.json')));
 const setup=await fs.readFile(path.join(__dirname,'fixtures.js'),'utf8');
 const collection=JSON.parse(await fs.readFile(path.join(__dirname,'../collection.json')));
 for(const viewport of [{width:1280,height:900},{width:390,height:844}]){
  const context=await browser.newContext({viewport,reducedMotion:'reduce'});
  await context.route('**/*',route=>{if(new URL(route.request().url()).origin!==base){external.push(route.request().url());return route.abort();}return route.continue();});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  for(const fixture of collection.fixtures){
   const u=new URL(fixture.url);await page.goto(base+u.pathname+u.search);
   await page.waitForFunction(()=>document.documentElement.dataset.fixtureReady);
   await page.waitForTimeout(100);
   assert.equal(await page.locator('h1').textContent(),'Verbosele');
   assert.equal(await page.locator('html').getAttribute('data-theme'),u.searchParams.get('theme'));
   assert.equal(await page.locator('html').getAttribute('data-palette'),u.searchParams.get('palette'));
   const id=u.searchParams.get('fixture');
   if(id==='accessibility')assert.equal(await page.locator('dialog').evaluate(x=>x.open),true);
   if(id==='feedback'){
    assert.equal(await page.locator('.tile').count(),5);
    const mode=tokens.modes.find(m=>m.id===u.searchParams.get('theme')+'-'+u.searchParams.get('palette'));
    const names={'color.background':'page','color.surface':'surface','color.text':'text','color.text.muted':'muted','color.accent':'guess','color.border':'border','color.feedback.correct':'correct','color.feedback.present':'present','color.feedback.absent':'absent','color.feedback.text':'feedback-text','color.feedback.duplicate':'duplicate','color.focus':'focus'};
    const actual=await page.evaluate(names=>Object.fromEntries(Object.entries(names).map(([key,name])=>[key,getComputedStyle(document.documentElement).getPropertyValue('--'+name).trim()])),names);
    for(const [key,token]of Object.entries(mode.tokens))assert.equal(actual[key],token.value,mode.id+' '+key);
   }
   if(id==='nine-letters')assert.equal(await page.locator('.input-square').count(),9);
   if(['feedback-dark-red-green','accessibility','nine-letters','new-game'].includes(fixture.id)){
    const raw=await context.newPage();await raw.addInitScript(setup.replace('new URLSearchParams(location.search)',`new URLSearchParams(${JSON.stringify(u.search)})`));
    await raw.goto(base+'/');await raw.waitForFunction(()=>document.documentElement.dataset.fixtureReady);await raw.waitForTimeout(100);
    assert.deepEqual(await raw.screenshot({fullPage:true}),await page.screenshot({fullPage:true}),'Production/fixture pixel comparison '+fixture.id);
    await raw.close();
   }
   results.push({fixture:fixture.id,width:viewport.width,status:'passed'});
   if(['feedback-dark-red-green','accessibility','nine-letters','new-game'].includes(fixture.id))await page.screenshot({path:path.join(__dirname,`../evidence/${fixture.id}-${viewport.width}.png`),fullPage:true});
  }
  await page.goto(base+'/?fixture=feedback&workbenchTheme=dark-high-contrast');await page.waitForFunction(()=>document.documentElement.dataset.fixtureReady);assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');assert.equal(await page.locator('html').getAttribute('data-palette'),'high-contrast');
  await page.goto(base+'/?fixture=new-game');await page.locator('#guess-input:enabled').waitFor();
  await page.getByRole('button',{name:'Accessibility',exact:true}).focus();await page.keyboard.press('Enter');
  await page.locator('input[value="red-green"]').check();await page.keyboard.press('Escape');
  assert.equal(await page.locator('#accessibility-button').evaluate(x=>x===document.activeElement),true);
  await page.getByRole('button',{name:'Dark mode',exact:true}).click();
  assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
  await page.locator('#guess-input').fill('cater');await page.getByRole('button',{name:'Guess',exact:true}).click();
  await page.waitForTimeout(1100);assert.equal(await page.locator('.tile').count(),5);assert.equal(await page.locator('#lives-display').textContent(),'Lives: 17');
  for(let i=0;i<3;i++){await page.getByRole('button',{name:'New Game',exact:true}).click();await page.locator('#guess-input:enabled').waitFor();assert.equal(await page.locator('#lives-display').textContent(),'Lives: 18');assert.equal(await page.locator('.tile').count(),0);}
  await page.locator('#show-thesaurus-toggle').check();await page.waitForTimeout(100);assert.equal(await page.locator('#thesaurus-area').isVisible(),true);await page.locator('#show-thesaurus-toggle').uncheck();
  await context.close();
 }
 const request=await browser.newContext();for(const target of ['/README.md','/.git/config','/design/baseline.json','/../README.md','/?fixture=unknown','/?fixture=new-game&theme=bogus']){const r=await request.request.get(base+target);assert.ok([400,404].includes(r.status()),target);}
 assert.equal((await request.request.post(base+'/')).status(),405);await request.close();
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 await fs.writeFile(path.join(__dirname,'../evidence/browser.json'),JSON.stringify({results,pixelComparisons:8,tokenModesVerified:8,interactions:'Central workbench theme selection, keyboard modal, palette/theme, real guess, three resets, hints at both widths',externalRequests:external,pageErrors:errors,limits:'No physical device, screen reader or alternate engine testing.'},null,2)+'\n');
 console.log(`PASS ${results.length} actual production fixture views; keyboard/game/reset flows at both widths; strict server deny checks; no remote requests.`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
