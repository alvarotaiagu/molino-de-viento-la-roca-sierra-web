/* Genera assets/og-molino.jpg (1200×630): el molino del logo en lima sobre la
   encina, el nombre, y la foto de la casa en la dehesa dentro de un arco.

   node scripts/generar-og.mjs
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const foto = pathToFileURL(path.join(raiz, 'assets/fotos/dehesa-casa-1200.jpg')).href;
const molino = pathToFileURL(path.join(raiz, 'assets/molino.svg')).href;

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Young+Serif&family=Figtree:wght@400;700&display=swap">
<style>
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;position:relative;background:#1F2A1E;color:#F4F1EA;font-family:Figtree,sans-serif;overflow:hidden}
.texto{position:absolute;left:64px;top:0;bottom:0;width:560px;display:flex;flex-direction:column;justify-content:center;gap:20px}
small{font:700 16px Figtree;letter-spacing:.2em;text-transform:uppercase;color:#9BCA23}
h1{font:400 74px/1.02 'Young Serif',serif}
p{font-size:24px;color:#C6CDBF;max-width:24ch;line-height:1.35}
.arco{position:absolute;right:56px;top:40px;width:420px;bottom:0;border-radius:999px 999px 0 0;overflow:hidden;background:url('${foto}') 58% 50%/cover}
.arco::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,rgba(31,42,30,.8),rgba(31,42,30,0) 60%)}
.linea{position:absolute;right:40px;top:24px;width:452px;bottom:0;border:2px solid rgba(155,202,35,.55);border-bottom:0;border-radius:999px 999px 0 0}
img{position:absolute;right:250px;bottom:14px;width:330px}
</style></head><body>
<div class="arco"></div><div class="linea"></div><img src="${molino}" alt="">
<div class="texto"><small>La Roca de la Sierra · Badajoz</small><h1>A.R. Molino<br>de Viento</h1><p>Una casa de piedra entre encinas y granito, para ocho personas.</p></div>
</body></html>`;

const tmp = path.join(raiz, 'scripts', '_og.html');
fs.writeFileSync(tmp, html);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(pathToFileURL(tmp).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: path.join(raiz, 'assets/og-molino.jpg'), type: 'jpeg', quality: 86 });
await browser.close();
fs.rmSync(tmp);
console.log('assets/og-molino.jpg');
