import http from 'node:http';
import {readFile,realpath} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname,sep} from 'node:path';
const root=await realpath(fileURLToPath(new URL('../../',import.meta.url)));
const collection=JSON.parse(await readFile(resolve(root,'design/collection.json'),'utf8'));
const fixtureIds=new Set(collection.fixtures.map(x=>new URL(x.url).searchParams.get('fixture')));
const allowed=new Set(['index.html','style.css','script.js','appearance.js','favicon.js','favicon.png','design/workbench/fixtures.js','design/workbench/theme.mjs','design/workbench/vendor/theme-adapter.mjs','design/collection.json','design/tokens.json','design/inventory.json']);
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.png':'image/png'};
export function createServer(){return http.createServer(async(req,res)=>{
 try{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  const port=server.address()?.port;
  if(req.headers.host!==`127.0.0.1:${port}`&&req.headers.host!==`localhost:${port}`){res.writeHead(403);res.end();return;}
  const url=new URL(req.url,'http://127.0.0.1');
  if(url.pathname==='/design/'){
   const links=collection.fixtures.map(x=>`<li><a href="${new URL(x.url).pathname+new URL(x.url).search}">${x.section}: ${x.title}</a></li>`).join('');
   res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; base-uri 'none'; form-action 'none'"});res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Verbosele source catalog</title><h1>Verbosele source catalog</h1><p>Real production pages; synthetic game state and offline APIs. No real saved progress is accessed. See DESIGN.md for limits.</p><ul>${links}</ul></html>`);return;
  }
  let name=decodeURIComponent(url.pathname).slice(1)||'index.html';
  if(!allowed.has(name)){res.writeHead(404);res.end();return;}
  const path=await realpath(resolve(root,name));if(!path.startsWith(root+sep)){res.writeHead(403);res.end();return;}
  let bytes=await readFile(path);
  if(name==='index.html'&&url.searchParams.has('fixture')){
   if((url.searchParams.has('workbenchTheme')&&!collection.themes.includes(url.searchParams.get('workbenchTheme')))||!fixtureIds.has(url.searchParams.get('fixture'))||!['light','dark'].includes(url.searchParams.get('theme')||'light')||!['standard','red-green','blue-yellow','high-contrast'].includes(url.searchParams.get('palette')||'standard')){res.writeHead(400);res.end();return;}
   bytes=Buffer.from(bytes.toString().replace('<head>','<head><script src="/design/workbench/fixtures.js"></script><script type="module" src="/design/workbench/theme.mjs"></script>'));
  }
  res.writeHead(200,{'Content-Type':types[extname(name)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Access-Control-Allow-Origin':'*','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self' http://127.0.0.1:* http://localhost:*"});res.end(req.method==='HEAD'?undefined:bytes);
 }catch{res.writeHead(404);res.end();}
});}
const server=createServer();
server.on('error',error=>{console.error(error.message);process.exitCode=1;});
server.listen(Number(process.env.PORT||8783),'127.0.0.1',()=>console.log(`Verbosele catalog: http://127.0.0.1:${server.address().port}/design/`));
