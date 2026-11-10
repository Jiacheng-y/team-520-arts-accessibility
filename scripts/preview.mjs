// Serve the actual static export, including GitHub Pages' repository prefix.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve('out');
const base = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '');
const portIndex = process.argv.indexOf('--port');
const port = Number(portIndex >= 0 ? process.argv[portIndex + 1] : 4173);
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.txt':'text/plain; charset=utf-8','.woff2':'font/woff2','.ico':'image/x-icon'};
const server = createServer(async (req,res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const path = decodeURIComponent(url.pathname);
    if (base && path !== base && !path.startsWith(base + '/')) {res.writeHead(404).end('Not found');return;}
    let file = resolve(root, '.' + (path.slice(base.length) || '/'));
    if (file !== root && !file.startsWith(root + sep)) {res.writeHead(403).end('Forbidden');return;}
    if ((await stat(file)).isDirectory()) file = resolve(file,'index.html');
    const body = await readFile(file);
    res.writeHead(200,{'Content-Type':types[extname(file)] || 'application/octet-stream'}).end(body);
  } catch {res.writeHead(404).end('Not found');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Static preview: http://127.0.0.1:${port}${base}/`));
