// Compare the actual a358aaa baseline served separately with the unpublished revision.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/Users/robinstethem/Programs/great_circle/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const executablePath=process.env.CHROMIUM_PATH||'/Users/robinstethem/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const baseline=process.env.BASELINE_URL||'http://127.0.0.1:4185',revision=process.env.BASE_URL||'http://127.0.0.1:4175';
const state=length=>({currentLevel:length,currentWordLength:length,currentLives:17,targetWord:length===5?'sheep':'chocolate',cumulativeGameHistory:[{guess:length===5?'seats':'chocolate',feedback:length===5?['correct','present','absent','absent','absent']:Array(9).fill('correct'),wordLength:length}],gameOver:false,gameWon:false,duplicateTargetLetters:length===5?['e']:['c','o'],requiredStartingLetter:'s',absentLetters:['A','T'],showThesaurus:false,guessedWords:['seats']});
(async()=>{const browser=await chromium.launch({headless:true,executablePath});try{
 const reports=[];
 async function pageFor(base,width,length=5){const context=await browser.newContext({viewport:{width,height:900},colorScheme:'light'});await context.route('https://api.**',r=>r.abort());const page=await context.newPage();await page.addInitScript(s=>{localStorage.setItem('progressiveWordleState_v12',JSON.stringify(s));localStorage.setItem('verbosele.theme.v1','light');localStorage.setItem('verbosele.palette.v1','standard')},state(length));await page.goto(base);await page.locator('#guess-input:enabled').waitFor();await page.locator('#guess-input').fill('t');await page.locator('#guess-input').evaluate(el=>el.blur());await page.waitForTimeout(350);return page}
 async function geometry(page){return page.evaluate(()=>{const selectors=['h1','#status-controls-container','#game-status','#reset-button','#game-options','.checkbox-label','#show-thesaurus-toggle','#game-area','#grid-container','.grid-row','.tile','#input-area','#segmented-input-container','#visual-input-squares','.input-square','#submit-guess','#message-area'];return Object.fromEntries(selectors.map(selector=>{const e=document.querySelector(selector),r=e.getBoundingClientRect(),s=getComputedStyle(e);return[selector,{x:r.x,y:r.y,width:r.width,height:r.height,fontFamily:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight,lineHeight:s.lineHeight,padding:s.padding,margin:s.margin,borderWidth:s.borderWidth}]}))})}
 async function assertToolbar(page){const rectangles=await page.evaluate(()=>{const h=document.querySelector('h1').getBoundingClientRect();return [...document.querySelectorAll('.icon-button')].map(e=>{const r=e.getBoundingClientRect();return{width:r.width,height:r.height,left:r.left,right:r.right,overlap:r.left<h.right&&r.right>h.left&&r.top<h.bottom&&r.bottom>h.top}})});for(const r of rectangles){assert.ok(!r.overlap,'toolbar must not overlap heading');assert.ok(r.width>=44&&r.height>=44);assert.ok(r.left>=0&&r.right<=await page.evaluate(()=>innerWidth))}}
 for(const width of [1280,390,320]){
  const original=await pageFor(baseline,width),final=await pageFor(revision,width);
  const old=await geometry(original),light=await geometry(final);assert.deepEqual(light,old,`light Standard geometry ${width}px`);
  assert.deepEqual(await final.locator('.tile').allInnerTexts(),['S','E','A','T','S']);
  assert.equal(await final.locator('.feedback-symbol:visible').count(),0);assert.equal(await final.locator('.feedback-legend:visible').count(),0);assert.equal(await final.locator('.input-square').first().evaluate(e=>getComputedStyle(e).textDecorationLine),'none');
  if(width===390){
   await original.locator('#guess-input').focus();await final.locator('#guess-input').focus();
   const focusStyle=page=>page.locator('#segmented-input-container').evaluate(e=>{const s=getComputedStyle(e);return[s.outlineStyle,s.outlineWidth,s.outlineOffset]});
   assert.deepEqual(await focusStyle(final),await focusStyle(original),'Standard focused input appearance matches baseline');
   assert.deepEqual(await geometry(final),await geometry(original),'Standard focused input geometry matches baseline');
   await original.screenshot({path:path.join(__dirname,'../review/comparison/baseline-focused-390.png'),fullPage:true});await final.screenshot({path:path.join(__dirname,'../review/comparison/revised-light-focused-390.png'),fullPage:true});
   await original.locator('#guess-input').evaluate(e=>e.blur());await final.locator('#guess-input').evaluate(e=>e.blur());
  }
  const colors=await final.locator('.tile.glow-duplicate').evaluate(e=>{const s=getComputedStyle(e);return[s.outlineStyle,s.outlineWidth,s.outlineColor]});assert.deepEqual(colors,['solid','2px','rgb(255, 208, 0)']);
  await assertToolbar(final);
  if(width===390){
   const conflicts=await original.evaluate(()=>{
    const lum=c=>{const v=c.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4});return .2126*v[0]+.7152*v[1]+.0722*v[2]};const ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
    const text=['.tile.correct','.tile.present','.tile.absent','#reset-button','#submit-guess'].map(selector=>{const s=getComputedStyle(document.querySelector(selector)),required=selector.startsWith('.tile')?3:4.5;return{selector,foreground:s.color,background:s.backgroundColor,ratio:ratio(s.color,s.backgroundColor),required,passes:ratio(s.color,s.backgroundColor)>=required}});
    const input=getComputedStyle(document.querySelectorAll('.input-square')[1]),page=getComputedStyle(document.body),duplicate=getComputedStyle(document.querySelector('.glow-duplicate'));
    return{baseline:'a358aaa',reason:'Original light Standard colors preserved by explicit user request',text,boundaries:[{selector:'.input-square',adjacent:'white surface',ratio:ratio(input.borderTopColor,input.backgroundColor),required:3},{selector:'.input-square',adjacent:'page',ratio:ratio(input.borderTopColor,page.backgroundColor),required:3},{selector:'.glow-duplicate',adjacent:'page',ratio:ratio(duplicate.outlineColor,page.backgroundColor),required:3}]};
   });fs.writeFileSync(path.join(__dirname,'../review/comparison/original-light-contrast.json'),JSON.stringify(conflicts,null,2));
  }
  await original.screenshot({path:path.join(__dirname,`../review/comparison/baseline-${width}.png`),fullPage:true});await final.screenshot({path:path.join(__dirname,`../review/comparison/revised-light-${width}.png`),fullPage:true});
  // Full original color comparison, excluding the newly added controls.
  const colorSnapshot=page=>page.evaluate(()=>Object.fromEntries(['body','#game-status','.checkbox-label','#reset-button','#submit-guess','.tile.correct','.tile.present','.tile.absent','.input-square.used-letter','#message-area'].map(sel=>{const s=getComputedStyle(document.querySelector(sel));return[sel,[s.color,s.backgroundColor,s.borderColor]]})));
  assert.deepEqual(await colorSnapshot(final),await colorSnapshot(original),'original light palette exactly restored');
  await final.getByRole('button',{name:'Dark mode',exact:true}).click();await final.locator('#guess-input').evaluate(e=>e.blur());await final.getByRole('button',{name:'Dark mode',exact:true}).evaluate(e=>e.blur());
  const dark=await geometry(final);assert.deepEqual(dark,old,`dark Standard geometry ${width}px`);assert.deepEqual(await final.locator('.tile').allInnerTexts(),['S','E','A','T','S']);await assertToolbar(final);await final.screenshot({path:path.join(__dirname,`../review/comparison/revised-dark-${width}.png`),fullPage:true});
  if(width===390){
   await final.locator('#guess-input').focus();assert.equal(await final.locator('#segmented-input-container').evaluate(e=>getComputedStyle(e).outlineStyle),'none');await final.screenshot({path:path.join(__dirname,'../review/comparison/revised-dark-focused-390.png'),fullPage:true});await final.locator('#guess-input').evaluate(e=>e.blur());
   const outlines=[];
   for(const theme of ['light','dark'])for(const palette of ['standard','red-green','blue-yellow','high-contrast']){
    if(await final.locator('html').getAttribute('data-theme')!==theme)await final.getByRole('button',{name:'Dark mode',exact:true}).click();await final.getByRole('button',{name:'Accessibility',exact:true}).click();await final.locator(`input[value="${palette}"]`).check();await final.getByRole('button',{name:'Close',exact:true}).click();
    const measured=await final.locator('.glow-duplicate').evaluate(e=>{const lum=c=>{const v=c.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4});return .2126*v[0]+.7152*v[1]+.0722*v[2]};const s=getComputedStyle(e),bg=getComputedStyle(document.body).backgroundColor;return{color:s.outlineColor,background:bg,ratio:(Math.max(lum(s.outlineColor),lum(bg))+.05)/(Math.min(lum(s.outlineColor),lum(bg))+.05)}});
    if(!(theme==='light'&&palette==='standard'))assert.ok(measured.ratio>=3,`${theme}/${palette} duplicate outline contrast`);outlines.push({theme,palette,...measured});
   }
   fs.writeFileSync(path.join(__dirname,'../review/comparison/duplicate-outline-contrast.json'),JSON.stringify(outlines,null,2));
  }
  reports.push({width,baseline:old,light,dark});
  if(width===320){await final.evaluate(()=>document.documentElement.style.fontSize='200%');await final.waitForFunction(()=>document.documentElement.dataset.toolbarPlacement==='bottom');await assertToolbar(final);await final.getByRole('button',{name:'Accessibility',exact:true}).click();assert.ok(await final.locator('dialog').evaluate(e=>e.scrollWidth<=e.clientWidth&&e.getBoundingClientRect().right<=innerWidth));await final.keyboard.press('Escape');await final.screenshot({path:path.join(__dirname,'../review/comparison/revised-dark-320-text200.png'),fullPage:true})}
  await original.context().close();await final.context().close();
 }
 // Preserve and document the original narrow-screen nine-letter overflow.
 const original9=await pageFor(baseline,390,9),final9=await pageFor(revision,390,9);const old9=await geometry(original9);assert.deepEqual(await geometry(final9),old9);for(const [name,p]of[['baseline-nine-390',original9],['revised-light-nine-390',final9]])await p.screenshot({path:path.join(__dirname,`../review/comparison/${name}.png`),fullPage:true});await final9.getByRole('button',{name:'Dark mode',exact:true}).click();assert.deepEqual(await geometry(final9),old9);await final9.screenshot({path:path.join(__dirname,'../review/comparison/revised-dark-nine-390.png'),fullPage:true});
 const overflow=await original9.evaluate(()=>({viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth}));assert.ok(overflow.scrollWidth>overflow.viewport);reports.push({nineLetter390:overflow,geometry:old9});
 fs.writeFileSync(path.join(__dirname,'../review/comparison/geometry-report.json'),JSON.stringify(reports,null,2));
 console.log('PASS: exact original light colors and app geometry at1280/390/320; dark Standard same geometry/glyphs; solid gold duplicate outline; no Standard symbols/legend/strike; toolbar fits and text200 fallback; original nine-letter overflow documented.');
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
