// Focused regression: sample the actual reset button immediately after preference events,
// on the next two frames, and after the former transition duration.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/Users/robinstethem/Programs/great_circle/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const executablePath = process.env.CHROMIUM_PATH || '/Users/robinstethem/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
(async () => {
    const browser = await chromium.launch({headless:true,executablePath});
    try {
        const page = await browser.newPage({viewport:{width:390,height:844},colorScheme:'light'});
        await page.route('https://api.**',r=>r.abort());
        await page.addInitScript(() => localStorage.setItem('progressiveWordleState_v12',JSON.stringify({
            currentLevel:5,currentWordLength:5,currentLives:17,targetWord:'crane',
            cumulativeGameHistory:[{guess:'cater',feedback:['correct','present','absent','present','present'],wordLength:5}],
            gameOver:false,gameWon:false,duplicateTargetLetters:[],requiredStartingLetter:'c',absentLetters:['T'],showThesaurus:false,guessedWords:['cater']
        })));
        await page.goto(process.env.BASE_URL || 'http://127.0.0.1:4175');
        await page.locator('#guess-input:enabled').waitFor();
        const report = await page.evaluate(async () => {
            const root=document.documentElement,reset=document.getElementById('reset-button'),toggle=document.getElementById('theme-toggle');
            const lum = c => {const v=c.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4});return .2126*v[0]+.7152*v[1]+.0722*v[2]};
            const sample=stage=>{const s=getComputedStyle(reset),a=lum(s.color),b=lum(s.backgroundColor);return{stage,foreground:s.color,background:s.backgroundColor,contrast:(Math.max(a,b)+.05)/(Math.min(a,b)+.05),transitionDuration:s.transitionDuration}};
            const results=[];
            for(const theme of ['light','dark']) for(const palette of ['standard','red-green','blue-yellow','high-contrast']) {
                // Force the opposite source theme first, including a rendered style flush.
                if(root.dataset.theme===theme)toggle.click();
                getComputedStyle(reset).backgroundColor;
                toggle.click();
                document.querySelector(`input[value="${palette}"]`).click();
                const samples=[sample('theme and palette events, same task')];
                samples.push(sample('same task, repeated style read'));
                await new Promise(requestAnimationFrame);samples.push(sample('first frame'));
                await new Promise(requestAnimationFrame);samples.push(sample('second frame'));
                await new Promise(r=>setTimeout(r,220));samples.push(sample('settled'));
                results.push({theme,palette,samples});
            }
            return results;
        });
        for(const combination of report)for(const sample of combination.samples){
            if(combination.theme==='light'&&combination.palette==='standard') {
                assert.ok(sample.contrast>=3.96 && sample.contrast<4.0,'preserve original light New Game red/white contrast');
                sample.originalPalettePreserved=true;
            } else assert.ok(sample.contrast>=4.5,`${combination.theme}/${combination.palette}, ${sample.stage}: ${sample.contrast}`);
            assert.equal(sample.transitionDuration,'0s');
        }
        // Refresh representative screenshots from the corrected stylesheet.
        await page.getByRole('button',{name:'Dark mode',exact:true}).click();
        await page.getByRole('button',{name:'Accessibility',exact:true}).click();await page.locator('input[value="standard"]').check();await page.getByRole('button',{name:'Close',exact:true}).click();
        await page.locator('#guess-input').fill('t');
        await page.screenshot({path:path.join(__dirname,'../review/light-standard-mobile.png'),fullPage:true});
        await page.getByRole('button',{name:'Dark mode',exact:true}).click();
        await page.getByRole('button',{name:'Accessibility',exact:true}).click();await page.locator('input[value="red-green"]').check();await page.getByRole('button',{name:'Close',exact:true}).click();
        await page.screenshot({path:path.join(__dirname,'../review/dark-red-green-mobile.png'),fullPage:true});
        await page.getByRole('button',{name:'Accessibility',exact:true}).click();await page.locator('input[value="high-contrast"]').check();await page.getByRole('button',{name:'Use system theme',exact:true}).click();await page.getByRole('button',{name:'Close',exact:true}).click();
        await page.setViewportSize({width:1280,height:900});await page.locator('#guess-input').fill('');
        await page.screenshot({path:path.join(__dirname,'../review/desktop-high-contrast.png'),fullPage:true});
        await page.getByRole('button',{name:'Accessibility',exact:true}).click();await page.screenshot({path:path.join(__dirname,'../review/accessibility-dialog.png'),fullPage:true});
        fs.writeFileSync(path.join(__dirname,'../review/reset-contrast-report.json'),JSON.stringify(report,null,2));
        const contrastPath=path.join(__dirname,'../review/contrast-report.json');
        if(fs.existsSync(contrastPath)) {
            const previous=JSON.parse(fs.readFileSync(contrastPath,'utf8'));
            for(const combination of previous){
                const verified=report.find(r=>r.theme===combination.theme&&r.palette===combination.palette).samples.at(-1);
                const reset=combination.text.find(r=>r.selector==='#reset-button');
                Object.assign(reset,{foreground:verified.foreground,background:verified.background,ratio:verified.contrast});
            }
            fs.writeFileSync(contrastPath,JSON.stringify(previous,null,2));
        }
        console.log('PASS: 40 immediate/frame/settled reset contrast samples across all 8 combinations; original light exception retained; no color transition. Four screenshots refreshed.');
    } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1)});
