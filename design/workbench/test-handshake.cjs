const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/Users/robinstethem/Programs/great_circle/node_modules/playwright');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const collection=JSON.parse(await fs.readFile(path.join(__dirname,'../collection.json')));
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/Users/robinstethem/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const fixture=collection.fixtures.find(x=>x.section==='screens');
  const base=process.env.STUDIO_URL||'http://127.0.0.1:4387/apps/studio/';
  await page.goto(base+`?collection=${collection.id}&section=screens&fixture=${fixture.id}`);
  const results=[];
  for(let cycle=0;cycle<2;cycle++)for(const theme of collection.themes){
   await page.getByLabel('Theme',{exact:true}).selectOption(theme);
   await page.getByText(`Theme adapter confirmed: ${theme}.`,{exact:true}).waitFor();
   const element=await page.locator('iframe').first().elementHandle(),frame=await element.contentFrame();
   if(collection.id==='verbosele'){
    assert.equal(await frame.locator('html').getAttribute('data-theme'),theme.split('-')[0]);
    assert.equal(await frame.locator('html').getAttribute('data-palette'),theme.slice(theme.split('-')[0].length+1));
   }
   results.push({cycle,theme,status:'Theme adapter confirmed'});
  }
  for(const screen of collection.fixtures.filter(x=>x.section==='screens')){
   await page.getByLabel('Fixture',{exact:true}).selectOption(screen.id);
   await page.getByText(`Theme adapter confirmed: ${collection.themes.at(-1)}.`,{exact:true}).waitFor();
  }
  await page.getByLabel('Fixture',{exact:true}).selectOption(fixture.id);
  await page.getByText(`Theme adapter confirmed: ${collection.themes.at(-1)}.`,{exact:true}).waitFor();
  await page.evaluate(()=>{window.__adapterAcks=[];window.addEventListener('message',e=>{if(e.data?.type==='workbench:theme-applied')window.__adapterAcks.push(e.data);});});
  const theme=collection.themes.at(-1);
  await page.evaluate(theme=>{const child=document.querySelector('iframe').contentWindow;child.postMessage({type:'workbench:set-theme',theme:'unsupported',requestId:'bad-mode'},'*');child.postMessage({type:'workbench:set-theme',theme,requestId:42},'*');child.postMessage({type:'unrelated',theme,requestId:'bad-type'},'*');},theme);
  const iframe=await page.locator('iframe').first().elementHandle(),frame=await iframe.contentFrame();
  await frame.evaluate(theme=>window.dispatchEvent(new MessageEvent('message',{source:window,origin:'null',data:{type:'workbench:set-theme',theme,requestId:'wrong-source'}})),theme);
  await page.waitForTimeout(150);assert.deepEqual(await page.evaluate(()=>window.__adapterAcks),[]);
  await page.evaluate(theme=>document.querySelector('iframe').contentWindow.postMessage({type:'workbench:set-theme',theme,requestId:'valid-parent-probe'},'*'),theme);
  await page.waitForFunction(()=>window.__adapterAcks.some(x=>x.requestId==='valid-parent-probe'));
  assert.equal((await page.evaluate(()=>window.__adapterAcks)).length,1);
  // The shell ignores this valid adapter reply because it has a different nonce.
  assert.ok(await page.getByText(`Theme adapter confirmed: ${theme}.`,{exact:true}).isVisible());
  const variable=collection.id==='verbosele'?'--page':'--bg';
  await frame.evaluate(variable=>document.documentElement.style.setProperty(variable,'#123456'),variable);
  await page.evaluate(theme=>document.querySelector('iframe').contentWindow.postMessage({type:'workbench:set-theme',theme,requestId:'wrong-computed-palette'},'*'),theme);
  await page.waitForTimeout(150);assert.equal((await page.evaluate(()=>window.__adapterAcks)).length,1);
  await frame.evaluate(variable=>document.documentElement.style.removeProperty(variable),variable);
  await frame.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide')));
  await page.evaluate(theme=>document.querySelector('iframe').contentWindow.postMessage({type:'workbench:set-theme',theme,requestId:'after-disposal'},'*'),theme);
  await page.waitForTimeout(150);assert.equal((await page.evaluate(()=>window.__adapterAcks)).length,1);
  await page.reload();await page.getByText(/Theme adapter confirmed:/).waitFor();
  await page.screenshot({path:path.join(__dirname,'../evidence/central-handshake.png')});
  assert.deepEqual(errors,[]);
  const report={collection:collection.id,results,screenNavigation:collection.fixtures.filter(x=>x.section==='screens').map(x=>x.id),wrongModeTypeNonceAndSource:'ignored',validParentNonce:'echoed',computedPaletteMismatch:'not acknowledged',pagehideDisposal:'no further acknowledgement',reload:'confirmed',pageErrors:errors};
  await fs.writeFile(path.join(__dirname,'../evidence/handshake.json'),JSON.stringify(report,null,2)+'\n');
  console.log(`PASS central studio: ${results.length} confirmed theme selections, wrong messages rejected, nonce echoed, disposal and reload verified.`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
