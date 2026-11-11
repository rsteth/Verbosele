/* Preview-only setup. Loaded before the unchanged production scripts. */
(() => {
 const query=new URLSearchParams(location.search);
 if(!query.has('fixture'))return;
 const id=query.get('fixture');
 const selected=query.get('workbenchTheme');
 const theme=selected?selected.split('-')[0]:(query.get('theme')||'light'),palette=selected?selected.slice(theme.length+1):(query.get('palette')||'standard');
 const memory=new Map();
 const storage={getItem:key=>memory.get(String(key))??null,setItem:(key,value)=>memory.set(String(key),String(value)),removeItem:key=>memory.delete(String(key)),clear:()=>memory.clear(),key:index=>[...memory.keys()][index]??null,get length(){return memory.size;}};
 // Each fixture starts with private, in-memory storage. Never read or write real game progress.
 Object.defineProperty(window,'localStorage',{value:storage,configurable:true});
 storage.setItem('verbosele.theme.v1',theme);storage.setItem('verbosele.palette.v1',palette);
 const length=id==='nine-letters'?9:5;
 const state={currentLevel:length,currentLives:18,targetWord:length===9?'chocolate':'crane',currentWordLength:length,cumulativeGameHistory:[],gameOver:false,gameWon:false,duplicateTargetLetters:length===9?['c','o']:[],requiredStartingLetter:'c',absentLetters:[],showThesaurus:false,guessedWords:[]};
 if(['feedback','game-over','thesaurus','accessibility'].includes(id)){
  state.currentLives=17;state.cumulativeGameHistory=[{guess:'cater',feedback:['correct','present','absent','present','present'],wordLength:5}];state.absentLetters=['t'];state.guessedWords=['cater'];
 }
 if(id==='game-over'){state.currentLives=0;state.gameOver=true;}
 if(id==='game-won'){state.currentLevel=9;state.currentWordLength=9;state.targetWord='chocolate';state.gameOver=true;state.gameWon=true;}
 storage.setItem('progressiveWordleState_v12',JSON.stringify(state));
 if(id==='storage-denied')Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Fixture storage denial','SecurityError');}});
 Math.random=()=>0;
 window.fetch=async input=>{
  const url=new URL(typeof input==='string'?input:input.url,location.href);
  if(url.origin==='https://api.dictionaryapi.dev')return new Response(JSON.stringify(url.pathname.endsWith('/zzzzz')?{}:[{}]),{status:url.pathname.endsWith('/zzzzz')?404:200});
  if(url.origin==='https://api.datamuse.com'){
   if(id==='network-error')return new Response('{}',{status:503});
   const pattern=url.searchParams.get('sp');
   const words={5:'crane',6:'castle',7:'charter',8:'crackers',9:'chocolate'};
   const data=pattern?[{word:words[pattern.length]||'crane',score:100,tags:['f:100']}]:[{word:'bird',score:100,defs:['n a feathered animal'],tags:['n']}];
   return new Response(JSON.stringify(data));
  }
  throw new Error('Fixture blocked request: '+url.origin);
 };
 document.addEventListener('DOMContentLoaded',()=>{
  setTimeout(()=>{
   if(id==='accessibility')document.getElementById('accessibility-button').click();
   if(id==='thesaurus')document.getElementById('show-thesaurus-toggle').click();
   if(id==='network-error')document.getElementById('reset-button').click();
   if(id==='input-filled'){const el=document.getElementById('guess-input');el.value='cater';el.dispatchEvent(new Event('input',{bubbles:true}));}
   document.documentElement.dataset.fixtureReady=id;
  },50);
 });
})();
