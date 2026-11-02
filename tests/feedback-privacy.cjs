// Focused regression: typed-letter cues must not reveal newly absent letters early.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/Users/robinstethem/Programs/great_circle/node_modules/playwright');
const assert = require('node:assert/strict');
const executablePath = process.env.CHROMIUM_PATH || '/Users/robinstethem/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath});
 try {
  for(const reducedMotion of ['no-preference','reduce']){
   const context=await browser.newContext({reducedMotion});
   await context.route('https://api.dictionaryapi.dev/**',r=>r.fulfill({json:[{}]}));
   await context.route('https://api.datamuse.com/**',r=>r.fulfill({json:[]}));
   const page=await context.newPage();
   await page.addInitScript(()=>{if(!localStorage.getItem('progressiveWordleState_v12'))localStorage.setItem('progressiveWordleState_v12',JSON.stringify({currentLevel:5,currentWordLength:5,currentLives:18,targetWord:'crane',cumulativeGameHistory:[],gameOver:false,gameWon:false,duplicateTargetLetters:[],requiredStartingLetter:'c',absentLetters:['Z'],showThesaurus:false,guessedWords:[]}));});
   await page.goto(process.env.BASE_URL||'http://127.0.0.1:4175');await page.locator('#guess-input:enabled').waitFor();
   await page.locator('#guess-input').fill('z');assert.equal(await page.locator('.input-square.used-letter').count(),1,'already revealed absences remain available');
   await page.locator('#guess-input').fill('cater');await page.locator('#guess-input').press('Enter');await page.locator('.tile').nth(4).waitFor();
   await page.locator('#guess-input').fill('t');
   if(reducedMotion==='no-preference'){
    assert.equal(await page.locator('.input-square.used-letter').count(),0,'newly absent T is hidden initially');
    await page.waitForTimeout(150);
    assert.equal(await page.locator('.input-square.used-letter').count(),0,'newly absent T remains hidden during first 200ms');
    assert.equal(await page.locator('.tile').nth(2).locator('.feedback-symbol').count(),0);
    await page.locator('.tile').nth(2).locator('.feedback-symbol').waitFor();
   }
   assert.equal(await page.locator('.input-square.used-letter').count(),1,'T gains absence cue only after its tile reveals');
   assert.equal(await page.locator('.input-square').first().evaluate(el=>getComputedStyle(el).textDecorationLine),'line-through');
   if(reducedMotion==='reduce')assert.equal(await page.locator('.tile.reveal').count(),0);
   assert.equal(await page.locator('#lives-display').innerText(),'Lives: 17');
   const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('progressiveWordleState_v12')));assert.ok(saved.absentLetters.includes('T'));assert.ok(saved.absentLetters.includes('Z'));
   await page.reload();await page.locator('#guess-input:enabled').waitFor();await page.locator('#guess-input').fill('t');assert.equal(await page.locator('.input-square.used-letter').count(),1,'reload restores known feedback immediately');
   await context.close();
  }
  console.log('PASS: newly absent input cues wait for visible tile feedback; prior knowledge, reduced motion, saved state, lives and reload preserved.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
