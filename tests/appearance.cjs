// Uses the existing Playwright installation; no new application dependency.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/Users/robinstethem/Programs/great_circle/node_modules/playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const executablePath = process.env.CHROMIUM_PATH || '/Users/robinstethem/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const base = process.env.BASE_URL || 'http://127.0.0.1:4175';
const state = (length = 5) => ({currentLevel: length, currentLives: 18, targetWord: length === 5 ? 'crane' : 'chocolate', currentWordLength: length, cumulativeGameHistory: [], gameOver: false, gameWon: false, duplicateTargetLetters: [], requiredStartingLetter: 'c', absentLetters: [], showThesaurus: false, guessedWords: []});
(async () => {
 const browser = await chromium.launch({headless: true, executablePath});
 const context = await browser.newContext({viewport: {width: 390,height: 844}, colorScheme: 'light'});
 await context.route('https://api.dictionaryapi.dev/**', r => r.fulfill({json: [{}]}));
 await context.route('https://api.datamuse.com/**', r => r.fulfill({json: new URL(r.request().url()).searchParams.has('sp') ? [{word:'castle',score:100,tags:['f:100']}] : [{word:'bird',defs:['n a feathered animal']}]}));
 const page = await context.newPage(); const errors=[];page.on('pageerror', e=>errors.push(e.message));
 await page.addInitScript(s => { if (!localStorage.getItem('progressiveWordleState_v12')) localStorage.setItem('progressiveWordleState_v12', JSON.stringify(s)); }, state());
 await page.goto(base); await page.locator('#guess-input:enabled').waitFor();
 assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
 await page.emulateMedia({colorScheme:'dark'});await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
 await page.getByRole('button',{name:'Dark mode',exact:true}).click();
 assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
 await page.emulateMedia({colorScheme:'light'});await page.emulateMedia({colorScheme:'dark'});
 assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
 // Native dialog opens with current option, traps Tab, dismisses and restores focus.
 await page.getByRole('button',{name:'Accessibility',exact:true}).focus();await page.keyboard.press('Enter');
 assert.equal(await page.locator('input[value="standard"]').evaluate(el=>el===document.activeElement),true);
 await page.keyboard.press('Shift+Tab');assert.equal(await page.locator('#close-accessibility').evaluate(el=>el===document.activeElement),true);
 await page.keyboard.press('Tab');assert.equal(await page.locator('input[value="standard"]').evaluate(el=>el===document.activeElement),true);
 await page.keyboard.press('ArrowDown');assert.equal(await page.locator('input[value="red-green"]').isChecked(),true);
 await page.keyboard.press('Escape');assert.equal(await page.locator('#accessibility-button').evaluate(el=>el===document.activeElement),true);
 // Valid guess: no feedback attached to later tiles before their reveal.
 await page.locator('#guess-input').fill('cater');await page.getByRole('button',{name:'Guess',exact:true}).click();
 await page.locator('.tile').last().waitFor();
 assert.equal(await page.locator('.tile').last().getAttribute('aria-label'),'R');
 assert.equal(await page.locator('.tile').last().locator('.feedback-symbol').count(),0);
 await page.locator('#guess-input').fill('t');assert.equal(await page.locator('.input-square').first().evaluate(el=>el.classList.contains('used-letter')),false);
 await page.waitForTimeout(200);
 assert.equal(await page.locator('.tile').first().locator('.feedback-symbol').count(),0);
 assert.equal(await page.locator('.tile').first().getAttribute('aria-label'),'C');
 await page.waitForTimeout(850);
 assert.equal(await page.locator('.input-square').first().evaluate(el=>el.classList.contains('used-letter')),true);
 assert.deepEqual(await page.locator('.tile .feedback-symbol').allTextContents(),['✓','◆','×','◆','◆']);
 assert.equal(await page.locator('#lives-display').innerText(),'Lives: 17');
 const saved = await page.evaluate(()=>localStorage.getItem('progressiveWordleState_v12'));
 // Guessed absent letters get the non-color strike-through only from revealed knowledge.
 await page.locator('#guess-input').fill('t');assert.equal(await page.locator('.input-square').first().evaluate(el=>getComputedStyle(el).textDecorationLine),'line-through');
 const reports=[];
 for (const theme of ['light','dark']) for (const palette of ['standard','red-green','blue-yellow','high-contrast']) {
   if(await page.locator('html').getAttribute('data-theme')!==theme) await page.getByRole('button',{name:'Dark mode',exact:true}).click();
   await page.getByRole('button',{name:'Accessibility',exact:true}).click();await page.locator(`input[value="${palette}"]`).check();
   const dialogContrast = await page.locator('dialog').evaluate(el => {
     const lum = c => { const v=c.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4});return .2126*v[0]+.7152*v[1]+.0722*v[2]};
     const bg=getComputedStyle(el).backgroundColor;
     return [...el.querySelectorAll('h2,p,legend,label,small,button')].map(e=>{const s=getComputedStyle(e),b=s.backgroundColor==='rgba(0, 0, 0, 0)'?bg:s.backgroundColor;return{selector:e.tagName,ratio:(Math.max(lum(s.color),lum(b))+.05)/(Math.min(lum(s.color),lum(b))+.05)}});
   });for(const r of dialogContrast)assert.ok(r.ratio>=4.5,`${theme}/${palette} dialog ${r.selector}: ${r.ratio}`);
   await page.getByRole('button',{name:'Close',exact:true}).click();
   assert.equal(await page.evaluate(()=>localStorage.getItem('progressiveWordleState_v12')),saved);
   const result=await page.evaluate(()=>{
     const lum=c=>{const m=c.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4});return .2126*m[0]+.7152*m[1]+.0722*m[2]};
     const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
     const selectors=['body','#game-status','.checkbox-label','#message-area','#reset-button','#submit-guess','.input-square','.tile.correct','.tile.present','.tile.absent','.feedback-legend','#message-area .word-type'];
     return selectors.map(selector=>{const el=document.querySelector(selector),s=getComputedStyle(el);let bg=s.backgroundColor,p=el;while(bg==='rgba(0, 0, 0, 0)'&&p.parentElement){p=p.parentElement;bg=getComputedStyle(p).backgroundColor}return {selector,foreground:s.color,background:bg,ratio:ratio(s.color,bg)}});
   });
   for(const r of result) assert.ok(r.ratio>=4.5,`${theme}/${palette} ${r.selector} contrast ${r.ratio}`);
   const graphics=await page.evaluate(()=>{
     const rgb=s=>s.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});const l=s=>{const [r,g,b]=rgb(s);return .2126*r+.7152*g+.0722*b};const ratio=(a,b)=>(Math.max(l(a),l(b))+.05)/(Math.min(l(a),l(b))+.05);
     const bg=getComputedStyle(document.body).backgroundColor;
     return ['.input-square:not(.used-letter)','.tile.correct','.tile.present','.tile.absent','#theme-toggle'].map(sel=>{const s=getComputedStyle(document.querySelector(sel));return{selector:sel,ratio:ratio(s.borderTopColor,bg)}});
   });for(const g of graphics) assert.ok(g.ratio>=3,`${theme}/${palette} ${g.selector} border ${g.ratio}`);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile overflow');
   reports.push({theme,palette,text:result,graphics,dialog:dialogContrast});
   if(theme==='light'&&palette==='standard'||theme==='dark'&&palette==='red-green') await page.screenshot({path:path.join(__dirname,`../review/${theme}-${palette}-mobile.png`),fullPage:true});
 }
 await page.locator('#guess-input').fill('cater');await page.getByRole('button',{name:'Guess',exact:true}).click();assert.equal(await page.locator('#lives-display').innerText(),'Lives: 17');
 // Persistence and system reset; reload must not reset game.
 await page.reload();await page.locator('#guess-input:enabled').waitFor();
 assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');assert.equal(await page.locator('html').getAttribute('data-palette'),'high-contrast');assert.equal(await page.locator('.tile').count(),5);
 await page.getByRole('button',{name:'Accessibility',exact:true}).click();await page.getByRole('button',{name:'Use system theme',exact:true}).click();await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.emulateMedia({colorScheme:'light'});await page.waitForFunction(()=>document.documentElement.dataset.theme==='light');
 await page.setViewportSize({width:1280,height:900});await page.screenshot({path:path.join(__dirname,'../review/desktop-high-contrast.png'),fullPage:true});
 await page.getByRole('button',{name:'Accessibility',exact:true}).click();await page.screenshot({path:path.join(__dirname,'../review/accessibility-dialog.png'),fullPage:true});await page.keyboard.press('Escape');
 // Correct guesses still advance levels using the existing API contract and shared lives.
 await page.locator('#guess-input').fill('crane');await page.locator('#guess-input').press('Enter');await page.locator('.input-square').nth(5).waitFor();
 assert.equal(await page.locator('#level-display').innerText(),'Level: 2 (6 Letters)');assert.equal(await page.locator('#lives-display').innerText(),'Lives: 16');assert.equal(await page.locator('html').getAttribute('data-palette'),'high-contrast');
 // 200% text scaling and all nine-letter rows still fit at mobile width.
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.documentElement.style.fontSize='200%');
 await page.getByRole('button',{name:'Accessibility',exact:true}).click();assert.ok(await page.locator('dialog').evaluate(el=>el.getBoundingClientRect().right<=innerWidth && el.scrollWidth<=el.clientWidth));await page.keyboard.press('Escape');
 const nine=await context.newPage();await nine.addInitScript(s=>localStorage.setItem('progressiveWordleState_v12',JSON.stringify(s)),state(9));await nine.goto(base);await nine.locator('.input-square').nth(8).waitFor();assert.ok(await nine.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 // Block storage at its API boundary; game and appearance controls must still work.
 const denied=await browser.newContext({colorScheme:'dark',reducedMotion:'reduce',viewport:{width:390,height:844}});
 await denied.route('https://api.dictionaryapi.dev/**',r=>r.fulfill({json:[{}]}));await denied.route('https://api.datamuse.com/**',r=>r.fulfill({json:[{word:'crane',score:100,tags:['f:100']}]}));
 const blocked=await denied.newPage();blocked.on('pageerror',e=>errors.push(e.message));
 await blocked.addInitScript(()=>{for(const method of ['getItem','setItem','removeItem']) Storage.prototype[method]=()=>{throw new DOMException('Denied','SecurityError')};});
 await blocked.goto(base);await blocked.locator('#guess-input:enabled').waitFor();await blocked.getByRole('button',{name:'Dark mode',exact:true}).click();await blocked.getByRole('button',{name:'Accessibility',exact:true}).click();await blocked.locator('input[value="blue-yellow"]').check();await blocked.keyboard.press('Escape');
 await blocked.getByRole('button',{name:'New Game',exact:true}).click();await blocked.locator('#guess-input:enabled').waitFor();assert.equal(await blocked.locator('html').getAttribute('data-palette'),'blue-yellow');
 await blocked.locator('#guess-input').fill('cater');await blocked.locator('#guess-input').press('Enter');await blocked.locator('.tile .feedback-symbol').nth(4).waitFor();assert.equal(await blocked.locator('.tile.reveal').count(),0);
 await blocked.emulateMedia({forcedColors:'active'});assert.equal(await blocked.locator('#theme-toggle').evaluate(el=>getComputedStyle(el).forcedColorAdjust),'auto');
 const invalid = await browser.newContext({colorScheme:'dark'});await invalid.route('https://api.**',r=>r.abort());const invalidPage=await invalid.newPage();
 await invalidPage.addInitScript(()=>{localStorage.setItem('verbosele.theme.v1','unknown');localStorage.setItem('verbosele.palette.v1','unknown')});await invalidPage.goto(base);
 assert.equal(await invalidPage.locator('html').getAttribute('data-theme'),'dark');assert.equal(await invalidPage.locator('html').getAttribute('data-palette'),'standard');
 assert.deepEqual(errors,[]);require('node:fs').writeFileSync(path.join(__dirname,'../review/contrast-report.json'),JSON.stringify(reports,null,2));
 console.log('PASS: 8 theme/palette combinations; text >=4.5:1, borders >=3:1; gameplay, reveal privacy, mobile 9-letter layout, text scaling, keyboard dialog, persistence, system fallback, denied storage, reduced motion and forced colors.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
