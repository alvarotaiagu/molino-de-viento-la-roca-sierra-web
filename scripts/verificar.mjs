/* Verificación de la web con Playwright. Una comprobación por cada punto del
   checklist de web desde cero y de la entrega del prompt «Aspas».

   node scripts/verificar.mjs              → comprobaciones
   node scripts/verificar.mjs --capturas   → además, capturas en screenshots/

   Levanta sus propios servidores (4281 la web; 4282-4284 las copias de
   entrega y sin módulos), así que no depende de servir.mjs ni choca con otra
   sesión. Se baja por la página con mouse.wheel: con Lenis, scrollTo no
   dispara los ScrollTrigger.
*/
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CAPTURAS = process.argv.includes('--capturas');
const dirCap = path.join(raiz, 'screenshots');
if (CAPTURAS) fs.mkdirSync(dirCap, { recursive: true });

const tipos = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
  '.json': 'application/json', '.pdf': 'application/pdf'
};
function servidor(base, puerto) {
  return new Promise(ok => {
    const s = http.createServer((req, res) => {
      const limpia = decodeURIComponent(req.url.split('?')[0]);
      const destino = path.join(base, limpia === '/' ? 'index.html' : limpia);
      if (!destino.startsWith(base) || !fs.existsSync(destino) || fs.statSync(destino).isDirectory()) {
        res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
        res.end(fs.existsSync(path.join(base, '404.html')) ? fs.readFileSync(path.join(base, '404.html')) : 'no');
        return;
      }
      res.writeHead(200, { 'content-type': tipos[path.extname(destino)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(fs.readFileSync(destino));
    }).listen(puerto, '127.0.0.1', () => ok(s));
  });
}

const resultados = [];
function ok(nombre, cond, detalle = '') {
  resultados.push({ nombre, cond: !!cond, detalle });
  console.log((cond ? '  ok   ' : '  FALLA') + '  ' + nombre + (detalle && !cond ? '  → ' + detalle : (detalle ? '  (' + detalle + ')' : '')));
}

const srv = await servidor(raiz, 4281);
const URL = 'http://127.0.0.1:4281/';
const browser = await chromium.launch();

async function abrir(vp, opciones = {}) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, ...(opciones.ctx || {}) });
  if (opciones.cookiesAceptadas) await ctx.addInitScript(() => { try { localStorage.setItem('molino-cookies', 'ok'); } catch (e) {} });
  if (opciones.sinCdn) await ctx.route(/cdn\.jsdelivr\.net/, r => r.abort());
  if (opciones.config) await ctx.route(/data\/config\.json/, r => r.fulfill({ contentType: 'application/json', body: JSON.stringify(opciones.config) }));
  if (opciones.init) await ctx.addInitScript(opciones.init);
  const page = await ctx.newPage();
  const errores = [], fallos = [];
  page.on('pageerror', e => errores.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/net::ERR_FAILED|Failed to load resource/.test(m.text())) errores.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400 && !/no-existe/.test(r.url())) fallos.push(r.status() + ' ' + r.url()); });
  page.on('requestfailed', r => { if (!opciones.sinCdn || !/jsdelivr/.test(r.url())) fallos.push('fallida ' + r.url()); });
  await page.goto((opciones.url || URL) + (opciones.query || ''), { waitUntil: opciones.waitUntil || 'load' });
  return { ctx, page, errores, fallos };
}
async function trasCortina(page) {
  await page.waitForFunction(() => { const c = document.getElementById('cortina'); return !!c && getComputedStyle(c).display === 'none'; }, null, { timeout: 10000 });
  await page.waitForTimeout(400);
}
async function bajar(page, px, paso = 100, pausa = 35) {
  for (let y = 0; y < Math.abs(px); y += paso) { await page.mouse.wheel(0, Math.sign(px) * paso); await page.waitForTimeout(pausa); }
  await page.waitForTimeout(700);
}
async function bajarHasta(page, selector, margen = 120) {
  for (let i = 0; i < 90; i++) {
    const top = await page.evaluate(s => document.querySelector(s).getBoundingClientRect().top, selector);
    if (top <= margen && top > margen - 90) break;
    await page.mouse.wheel(0, top > 0 ? Math.min(400, top - margen + 10) : Math.max(-400, top - margen));
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(900);
}
async function cap(page, nombre) { if (CAPTURAS) await page.screenshot({ path: path.join(dirCap, nombre + '.png') }); }
const sinMando = t => t.replace(/<!-- ═+ \[MANDO DE MAQUETA\][\s\S]*?fin del bloque \[MANDO DE MAQUETA\] ═+ -->/g, ' ');
const visibleDe = t => sinMando(t).replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');

/* ═══════════════ 0 · archivos y textos ═══════════════ */
console.log('\n0 · Archivos y textos');
const paginas = ['index.html', 'aviso-legal.html', 'privacidad.html', '404.html'];
for (const p of paginas) {
  const t = fs.readFileSync(path.join(raiz, p), 'utf8');
  const head = t.slice(t.indexOf('<head>'), t.indexOf('</head>'));
  ok(p + ': noindex justo detrás del charset', /<head>\s*<meta charset="utf-8">\s*<meta name="robots" content="noindex, nofollow">/.test(head));
}
for (const f of ['.nojekyll', 'manifest.json', 'assets/favicon.svg', 'assets/molino.svg', 'assets/og-molino.jpg', 'assets/condiciones-de-uso.pdf', 'README.md', 'ref/distancias.json', 'data/config.json', 'data/molino.json'])
  ok('existe ' + f, fs.existsSync(path.join(raiz, f)));
{
  const crudo = paginas.map(p => fs.readFileSync(path.join(raiz, p), 'utf8')).join('\n');
  const sinComentarios = sinMando(crudo).replace(/<!--[\s\S]*?-->/g, ' ');
  const visible = paginas.map(p => visibleDe(fs.readFileSync(path.join(raiz, p), 'utf8'))).join('\n');
  const datos = fs.readFileSync(path.join(raiz, 'data/fotos.json'), 'utf8');
  /* «casa rural»: tampoco en <title>, JSON-LD, alt ni en los datos de las fotos */
  ok('sin «casa rural» (texto, title, JSON-LD, alt y fotos.json)', !/casas? rurale?s?\b/i.test(sinComentarios.replace(/TusCasasRurales|tuscasasrurales/g, '')) && !/casa rural/i.test(datos));
  ok('el <title> dice «alojamiento rural»', /<title>[^<]*[Aa]lojamiento rural[^<]*<\/title>/.test(fs.readFileSync(path.join(raiz, 'index.html'), 'utf8')));
  const prohibidos = [/mascota/i, /admite[ns]? animales/i, /animales/i, /para[ií]so/i, /inolvidable/i, /desconexi[oó]n total/i, /con encanto/i, /id[ií]lic/i, /sin permanencia/i,
    /\bJulio\b/, /La Era/, /facebook/i, /piscina/i, /wi-?fi/i, /desayuno/i, /\bpesca\b/i, /\[PENDIENTE\]|\bTODO\b|[Ll]orem ipsum/,
    /\b(1|una)( sola| única)? reseña/i, /\d+\s*(opiniones|valoraciones)/i, /clientes satisfechos|cientos de/i, /subir al molino|visitar el molino/i, /\bhuerto\b/i, /aparcamiento|parking/i];
  for (const r of prohibidos) ok('sin texto prohibido ' + r, !r.test(visible), (visible.match(r) || [''])[0]);
  const siglos = [...visible.matchAll(/siglo XV/g)].map(m => visible.slice(Math.max(0, m.index - 20), m.index));
  ok('«siglo XV» siempre con «se cree»', siglos.length > 0 && siglos.every(s => /se cree que del\s*$/.test(s)), siglos.join(' | '));
  ok('la frase del molino, entre comillas', /«Los más viejos del lugar dicen que ni sus abuelos lo vieron funcionar\.»/.test(visible));
  ok('TusCasasRurales sin recuento de opiniones', !/\d+\s*(opiniones|reseñas|valoraciones)\s+(en|de)\s+TusCasasRurales/i.test(visible) && !/TusCasasRurales[^.«]{0,30}\d+\s*(opiniones|reseñas|valoraciones)/i.test(visible) && /«Excepcional» en TusCasasRurales/.test(visible));
  ok('Google: 4,5 y 20 reseñas', /4,5/.test(visible) && /20 reseñas/.test(visible));
  ok('el precio no va escrito en el HTML (sale de config)', !/33\s*€/.test(visible));
  ok('registro AT-BA-00023 en el pie', /<footer class="pie">[\s\S]*AT-BA-00023[\s\S]*<\/footer>/.test(fs.readFileSync(path.join(raiz, 'index.html'), 'utf8')));
  ok('sin el Facebook de su web', !/fori\.villaresparral/.test(crudo));
  const dist = JSON.parse(fs.readFileSync(path.join(raiz, 'ref/distancias.json'), 'utf8'));
  ok('distancias del HTML = las medidas (ref/distancias.json)', dist.destinos.slice(0, 3).every(d => visible.includes(Math.round(d.km) + ' km · ' + d.min + ' min')));
  /* fotos: nada de la tele de tubo ni más de 1200 px */
  const fotos = JSON.parse(datos).fotos;
  ok('sin las fotos de la tele de tubo', !fotos.some(f => /xl_11202_10|5-460x308/.test(f.origen)));
  ok('ninguna foto pasa de 1200 px', fotos.every(f => f.w <= 1200 && Math.max(...f.anchos) <= 1200), fotos.filter(f => f.w > 1200).map(f => f.id).join(','));
  const usadas = [...fs.readFileSync(path.join(raiz, 'index.html'), 'utf8').matchAll(/assets\/fotos\/([\w-]+)-(\d+)\.(jpg|webp|avif)/g)];
  ok('todas las fotos referenciadas existen', usadas.every(m => fs.existsSync(path.join(raiz, 'assets/fotos', `${m[1]}-${m[2]}.${m[3]}`))));
}

/* ═══════════════ 1 · cortina ═══════════════ */
console.log('\n1 · Cortina');
/* enganche: en cuanto main.js crea la línea de tiempo, se muestrea cada fotograma (memoria de Playwright y cortinas) */
const enganche = (pausaEn) => {
  window.__m = [];
  const A = {};
  let tl = null;
  Object.defineProperty(A, 'cortinaTl', {
    configurable: true, get() { return tl; },
    set(v) {
      tl = v;
      if (pausaEn != null) v.call(() => { v.pause(); window.__pausada = true; }, null, pausaEn);
      const tomar = () => {
        try {
          const c = document.getElementById('cortina');
          const cm = document.getElementById('cortina-molino'), hm = document.getElementById('hero-molino');
          const pieza = s => { const a = hm.querySelector(s).getBoundingClientRect(), b = cm.querySelector(s).getBoundingClientRect(); return Math.max(Math.abs(a.left - b.left), Math.abs(a.top - b.top), Math.abs(a.width - b.width), Math.abs(a.height - b.height)); };
          const visible = getComputedStyle(c).display !== 'none';
          window.__m.push({
            t: performance.now(), disp: visible,
            torre: parseFloat(getComputedStyle(cm.querySelectorAll('.molino__torre path')[8]).strokeDashoffset),
            pala: parseFloat(getComputedStyle(cm.querySelector('.molino__pala')).strokeDashoffset),
            vel: window.Aspas.molino.velocidad(),
            clip: document.getElementById('cortina-capa').style.clipPath,
            /* piezas internas del dibujo, no la caja del <svg>: la base de la torre y el cubo del eje */
            dif: visible && cm.classList.contains('es-colocado') ? Math.max(pieza('.molino__torre path[data-tipo="base"]'), pieza('.molino__cubo')) : null
          });
        } catch (e) {}
        if (window.__m.length < 2000 && !(window.__m.length && !window.__m[window.__m.length - 1].disp)) requestAnimationFrame(tomar);
      };
      requestAnimationFrame(tomar);
    }
  });
  window.Aspas = A;
};
async function pruebaCortina(nombre, vp, ctxExtra = {}) {
  const { ctx, page, errores, fallos } = await abrir(vp, { init: enganche, initArg: null, ctx: ctxExtra, waitUntil: 'commit' });
  await trasCortina(page);
  const m = await page.evaluate(() => window.__m);
  const torres = m.map(x => x.torre).filter(x => x != null && !isNaN(x));
  const inter = torres.filter(d => d > 0.05 && d < 0.95).length;
  const difs = m.map(x => x.dif).filter(x => x != null);
  const maxDif = difs.length ? Math.max(...difs) : NaN;
  const vels = m.map(x => x.vel);
  const t0 = m[0] ? m[0].t : 0, dur = m.length ? (m[m.length - 1].t - t0) / 1000 : 0;
  return { ctx, page, errores, fallos, m, inter, maxDif, difs, vels, dur };
}
{
  const r = await pruebaCortina('1440', { width: 1440, height: 900 });
  ok('cortina: la torre se traza poco a poco (autoRound:false)', r.inter >= 5, r.inter + ' muestras intermedias');
  ok('cortina: las aspas se trazan después de la torre', (() => { const i = r.m.findIndex(x => x.pala < 0.95); const j = r.m.findIndex(x => x.torre < 0.95); return i > j && j >= 0; })());
  ok('cortina: las aspas arrancan y aceleran', (() => { const v = r.vels; const max = Math.max(...v); return v[0] < 1 && max > 250; })(), 'vel. máx ' + Math.max(...r.vels).toFixed(0) + ' °/s');
  ok('cortina: barre en diagonal (clip-path polygon)', r.m.some(x => /polygon/.test(x.clip)));
  ok('cortina: el molino cae sobre el del hero (0 px)', r.difs.length > 20 && r.maxDif <= 0.5, 'máx ' + (isNaN(r.maxDif) ? '—' : r.maxDif.toFixed(2)) + ' px en ' + r.difs.length + ' fotogramas');
  ok('cortina: dura unos 3 s', r.dur > 2.6 && r.dur < 3.9, r.dur.toFixed(2) + ' s');
  ok('cortina: acaba en display:none', await r.page.evaluate(() => getComputedStyle(document.getElementById('cortina')).display === 'none'));
  ok('cortina: color distinto del fondo que destapa', await r.page.evaluate(() => getComputedStyle(document.getElementById('cortina-capa')).backgroundColor !== getComputedStyle(document.querySelector('.hero')).backgroundColor));
  ok('carga: consola limpia', !r.errores.length, r.errores.join(' | '));
  ok('carga: sin 404 ni peticiones fallidas', !r.fallos.length, r.fallos.join(' | '));
  await r.ctx.close();
}
for (const [nombre, disp] of [['iPhone 13', devices['iPhone 13']], ['Pixel 5', devices['Pixel 5']]]) {
  const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } = disp;
  const ctx = await browser.newContext({ viewport, userAgent, deviceScaleFactor, isMobile, hasTouch });
  await ctx.addInitScript(enganche);
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'commit' });
  await trasCortina(page);
  const m = await page.evaluate(() => window.__m);
  const difs = m.map(x => x.dif).filter(x => x != null);
  ok(`cortina en ${nombre}: el molino cae sobre el del hero (0 px)`, difs.length > 20 && Math.max(...difs) <= 0.5, 'máx ' + (difs.length ? Math.max(...difs).toFixed(2) : '—') + ' px');
  await ctx.close();
}
/* fotogramas a medias: la propia línea de tiempo se para (página nueva por fotograma) */
for (const [t, que] of [[0.7, 'el trazado'], [2.9, 'la ráfaga']]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(enganche, t);
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'commit' });
  await page.waitForFunction(() => window.__pausada === true, null, { timeout: 9000 });
  await page.waitForTimeout(120);
  const f = await page.evaluate(() => {
    const cm = document.getElementById('cortina-molino');
    const clip = document.getElementById('cortina-capa').style.clipPath;
    const xs = (clip.match(/([\d.-]+)px/g) || []).map(parseFloat);
    return { torre: parseFloat(getComputedStyle(cm.querySelectorAll('.molino__torre path')[10]).strokeDashoffset), s: xs[0], disp: getComputedStyle(document.getElementById('cortina')).display };
  });
  await page.screenshot({ path: path.join(CAPTURAS ? dirCap : os.tmpdir(), `cortina-${t}.png`) });
  if (t < 1) ok('cortina: fotograma a medias del trazado', f.disp !== 'none' && f.torre > 0.02 && f.torre < 0.98, 'dashoffset ' + f.torre.toFixed(2));
  else ok('cortina: fotograma a medias de la ráfaga', f.disp !== 'none' && f.s > 150 && f.s < 1300, 'borde a ' + (f.s || 0).toFixed(0) + ' px');
  await page.evaluate(() => { window.Aspas.cortinaTl.play(); });
  await ctx.close();
}
{
  const { ctx, page, errores } = await abrir({ width: 1440, height: 900 }, { sinCdn: true });
  await page.waitForTimeout(600);
  ok('sin GSAP: la cortina se retira', await page.evaluate(() => getComputedStyle(document.getElementById('cortina')).display === 'none'));
  ok('sin GSAP: html.sin-movimiento (sin estados vacíos)', await page.evaluate(() => document.documentElement.classList.contains('sin-movimiento')));
  ok('sin GSAP: el titular se lee entero', await page.evaluate(() => { const l = document.querySelector('.hero__titulo .letra'); return !l || getComputedStyle(l).transform === 'none'; }));
  ok('sin GSAP: sin errores de JS', !errores.length, errores.join(' | '));
  await cap(page, 'sin-gsap-1440');
  await ctx.close();
}
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load' });
  ok('sin JS: la cortina no tapa nada', await page.evaluate(() => getComputedStyle(document.getElementById('cortina')).display === 'none'));
  await ctx.close();
}
{
  /* main.js no llega: la red de seguridad del <head> la quita a los 7 s */
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route(/js\/main\.js/, r => r.abort());
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load' });
  const antes = await page.evaluate(() => getComputedStyle(document.getElementById('cortina')).display);
  await page.waitForTimeout(7300);
  ok('sin main.js: el setTimeout en línea retira la cortina', antes !== 'none' && await page.evaluate(() => getComputedStyle(document.getElementById('cortina')).display === 'none'));
  await ctx.close();
}
{
  const { ctx, page } = await abrir({ width: 1440, height: 900 }, { ctx: { reducedMotion: 'reduce' }, waitUntil: 'domcontentloaded' });
  ok('movimiento reducido: la cortina no llega a pintarse', await page.evaluate(() => getComputedStyle(document.getElementById('cortina')).display === 'none'));
  ok('movimiento reducido: html.sin-movimiento', await page.evaluate(() => document.documentElement.classList.contains('sin-movimiento')));
  await page.waitForTimeout(1500);
  ok('movimiento reducido: las aspas se quedan quietas', await page.evaluate(() => [...document.querySelectorAll('.molino__rotor')].every(r => !r.getAttribute('transform') || /rotate\(0/.test(r.getAttribute('transform')))));
  ok('movimiento reducido: las cifras están puestas', await page.evaluate(() => [...document.querySelectorAll('.cifras [data-contar]')].map(b => b.textContent).join(',') === '150,4,2,8'));
  ok('movimiento reducido: el sol, quieto en el poniente', await page.evaluate(() => window.Aspas.sol && window.Aspas.sol.progreso() > 0.8));
  await cap(page, 'reducido-1440');
  await ctx.close();
}

/* ═══════════════ 2 · escritorio, versión «Aspas» ═══════════════ */
console.log('\n2 · Escritorio');
const anguloDe = (page, sel) => page.evaluate(s => { const r = document.querySelector(s + ' .molino__rotor:not(.molino__rotor--mascara)'); const t = r.getAttribute('transform') || ''; const m = new DOMMatrix(t ? getComputedStyle(r).transform : 'none'); return Math.atan2(m.b, m.a) * 180 / Math.PI; }, sel);
{
  const { ctx, page, errores } = await abrir({ width: 1440, height: 900 });
  await trasCortina(page);
  await page.waitForTimeout(3500);                 /* que se apague el impulso de la cortina */
  await cap(page, '1440-01-hero');
  /* cookies (checklist 4) */
  ok('cookies: el aviso sale la primera vez', await page.evaluate(() => getComputedStyle(document.getElementById('cookies')).display === 'flex'));
  await page.click('#cookies-aceptar');
  ok('cookies: «Entendido» lo cierra de verdad', await page.evaluate(() => getComputedStyle(document.getElementById('cookies')).display === 'none'));
  ok('mando: sin ?revision no aparece', await page.evaluate(() => { const m = document.getElementById('mando'); return m.hidden && getComputedStyle(m).display === 'none'; }));
  /* aspas: giran de verdad, sobre su eje, y aceleran con el scroll */
  await page.mouse.move(700, 450);
  const muestras = await page.evaluate(async () => {
    const hub = () => { const r = document.querySelector('#hero-molino .molino__cubo').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
    const out = [];
    for (let i = 0; i < 30; i++) { out.push({ t: performance.now(), a: window.Aspas.molino.angulo(), v: window.Aspas.molino.velocidad(), h: hub(), igual: document.querySelector('#hero-molino .molino__rotor--mascara').getAttribute('transform') === document.querySelector('#hero-molino .molino__rotor:not(.molino__rotor--mascara)').getAttribute('transform') }); await new Promise(r => setTimeout(r, 50)); }
    return out;
  });
  const giro = ((muestras[29].a - muestras[0].a) + 360) % 360;
  const reposo = muestras[29].v;
  ok('aspas: giran en reposo', giro > 10, giro.toFixed(1) + '° en 1,5 s');
  const a0 = await anguloDe(page, '#hero-molino'); await page.waitForTimeout(400); const a1 = await anguloDe(page, '#hero-molino');
  ok('aspas: el rotor del hero cambia de ángulo en el DOM', Math.abs(a1 - a0) > 2, a0.toFixed(1) + '° → ' + a1.toFixed(1) + '°');
  const hx = muestras.map(m => m.h[0]), hy = muestras.map(m => m.h[1]);
  ok('aspas: giran sobre el eje (el cubo no se mueve)', Math.max(...hx) - Math.min(...hx) < 1 && Math.max(...hy) - Math.min(...hy) < 1);
  ok('aspas: la máscara gira con el rotor', muestras.every(m => m.igual));
  ok('aspas: el logo de la cabecera también gira', await (async () => { const b0 = await anguloDe(page, '.cabecera'); await page.waitForTimeout(300); return Math.abs(await anguloDe(page, '.cabecera') - b0) > 1; })());
  let maxVel = 0;
  for (let i = 0; i < 14; i++) { await page.mouse.wheel(0, 140); await page.waitForTimeout(40); maxVel = Math.max(maxVel, await page.evaluate(() => window.Aspas.molino.velocidad())); }
  ok('aspas: aceleran con la velocidad del scroll', maxVel > reposo * 2.5, 'reposo ' + reposo.toFixed(0) + ' °/s → ' + maxVel.toFixed(0) + ' °/s');
  await page.waitForTimeout(500);
  const trasMedio = await page.evaluate(() => window.Aspas.molino.velocidad());
  await page.waitForTimeout(4500);
  const trasCinco = await page.evaluate(() => window.Aspas.molino.velocidad());
  ok('aspas: al parar frenan poco a poco (inercia)', trasMedio > reposo * 1.5 && trasCinco < reposo * 1.3 && trasMedio > trasCinco, maxVel.toFixed(0) + ' → ' + trasMedio.toFixed(0) + ' (0,5 s) → ' + trasCinco.toFixed(0) + ' (5 s)');
  await bajar(page, -2400, 300, 30);
  /* cursor (checklist 1) */
  await page.mouse.move(300, 300); await page.mouse.move(320, 310);
  await page.waitForTimeout(300);
  ok('cursor: el del sistema se oculta', await page.evaluate(() => getComputedStyle(document.body).cursor === 'none' && document.documentElement.classList.contains('con-cursor')));
  const b = await page.evaluate(() => { const r = document.querySelector('.hero__acciones .boton--lima').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
  await page.mouse.move(b[0], b[1]); await page.mouse.move(b[0] + 2, b[1] + 1);
  await page.waitForTimeout(500);
  const alfa = await page.evaluate(() => { const c = getComputedStyle(document.querySelector('.cursor')).backgroundColor; const m = c.match(/rgba?\(([^)]+)\)/); const p = m ? m[1].split(',').map(Number) : []; return p.length === 4 ? p[3] : (p.length === 3 ? 1 : 0); });
  ok('cursor: relleno activo ≥ .35 sobre un botón', alfa >= 0.35, 'alfa ' + alfa);
  ok('cursor: un solo aro y un solo punto', await page.evaluate(() => document.querySelectorAll('.cursor').length === 1 && document.querySelectorAll('.cursor-punto').length === 1));
  /* la casa: la foto del porche se destapa en arco */
  await bajarHasta(page, '#casa-foto', 140);
  await page.waitForTimeout(2200);
  ok('la casa: la foto del porche termina destapada', await page.evaluate(() => window.Aspas.arcoPorche() === ''));
  ok('la casa: las cifras cuentan hasta 150 m², 4, 2 y 8', await page.evaluate(() => [...document.querySelectorAll('.cifras [data-contar]')].map(b => b.textContent).join(',') === '150,4,2,8'));
  /* ocho arcos anclados */
  ok('arcos: anclados en escritorio', await page.evaluate(() => window.Aspas.arcos.anclado() && !!document.querySelector('.pin-spacer #arcos, .pin-spacer > #arcos')));
  ok('arcos: los 8 paneles son botones', await page.evaluate(() => [...document.querySelectorAll('#arcos-carril .arco')].filter(b => b.tagName === 'BUTTON' && b.offsetWidth > 0).length === 8));
  await bajarHasta(page, '#arcos', 5);
  const x0 = await page.evaluate(() => new DOMMatrix(getComputedStyle(document.getElementById('arcos-carril')).transform).m41);
  await cap(page, '1440-02-arcos');
  await bajar(page, 700);
  const est = await page.evaluate(() => ({ x: new DOMMatrix(getComputedStyle(document.getElementById('arcos-carril')).transform).m41, top: document.getElementById('arcos').getBoundingClientRect().top, trazados: document.querySelectorAll('.arco.es-trazado').length }));
  ok('arcos: el carril avanza en horizontal con el scroll', est.x < x0 - 300, x0.toFixed(0) + ' → ' + est.x.toFixed(0));
  ok('arcos: la sección se queda anclada arriba', Math.abs(est.top) < 4, 'top ' + est.top.toFixed(1));
  ok('arcos: los arcos de ladrillo se trazan al entrar', est.trazados >= 5, est.trazados + ' trazados');
  await cap(page, '1440-03-arcos-mitad');
  /* dialog */
  await page.evaluate(() => document.querySelector('.arco[data-panel="porche"]').click());
  await page.waitForTimeout(300);
  ok('dialog: se abre con las fotos del porche', await page.evaluate(() => document.getElementById('galeria').open && document.getElementById('galeria-titulo').textContent === 'El porche' && /^1 de [3-9]$/.test(document.getElementById('galeria-cuenta').textContent)));
  await cap(page, '1440-04-dialog');
  await page.keyboard.press('ArrowRight');
  ok('dialog: la flecha pasa de foto', await page.evaluate(() => /^2 de/.test(document.getElementById('galeria-cuenta').textContent)));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  ok('dialog: Escape lo cierra y el foco vuelve al arco', await page.evaluate(() => !document.getElementById('galeria').open && document.activeElement && document.activeElement.dataset.panel === 'porche'));
  /* sol */
  await bajarHasta(page, '#sol-escena', 5);
  const p0 = await page.evaluate(() => window.Aspas.sol.progreso());
  await cap(page, '1440-05-sol-amanecer');
  await bajar(page, 800);
  const p1 = await page.evaluate(() => ({ p: window.Aspas.sol.progreso(), top: document.getElementById('sol-escena').getBoundingClientRect().top }));
  ok('sol: anclado, el sol cruza los arcos con el scroll', p1.p > p0 + 0.4 && Math.abs(p1.top) < 4, p0.toFixed(2) + ' → ' + p1.p.toFixed(2));
  await cap(page, '1440-06-sol-poniente');
  /* ráfagas */
  await bajar(page, 900);
  await bajarHasta(page, '#finca', 420);
  const raf = await page.evaluate(() => { const r = [...document.querySelectorAll('.rafaga')].filter(n => { const b = n.getBoundingClientRect(); return b.bottom > 0 && b.top < innerHeight; }); return r.map(n => n.classList.contains('es-visible') && getComputedStyle(n.querySelector('path')).animationName); });
  ok('ráfagas: soplan cuando se ven', raf.length > 0 && raf.every(a => a === 'sopla'), JSON.stringify(raf));
  ok('ráfagas: quietas fuera de pantalla', await page.evaluate(() => [...document.querySelectorAll('.rafaga')].filter(n => { const b = n.getBoundingClientRect(); return b.bottom < -200 || b.top > innerHeight + 200; }).every(n => !n.classList.contains('es-visible'))));
  /* opiniones */
  await bajarHasta(page, '#opiniones', 150);
  const c1 = await page.evaluate(() => new DOMMatrix(getComputedStyle(document.getElementById('citas-pista')).transform).m41);
  await page.waitForTimeout(600);
  const c2 = await page.evaluate(() => new DOMMatrix(getComputedStyle(document.getElementById('citas-pista')).transform).m41);
  ok('opiniones: la cinta corre', c2 < c1, c1.toFixed(1) + ' → ' + c2.toFixed(1));
  ok('opiniones: citas firmadas sin nombres', await page.evaluate(() => [...document.querySelectorAll('.citas__pista li span')].every(s => /^(Opinión en TusCasasRurales|En Google)$/.test(s.textContent))));
  await cap(page, '1440-08-opiniones');
  /* precio */
  ok('tarifas: el precio sale de config', await page.evaluate(() => !document.getElementById('precio').hidden && /^33 €$/.test(document.getElementById('precio-importe').textContent) && /persona y noche/.test(document.getElementById('precio-texto').textContent)));
  /* mapa bajo clic */
  ok('mapa: no hay iframe antes del clic', await page.evaluate(() => !document.querySelector('iframe')));
  await page.evaluate(() => document.getElementById('mapa-boton').click());
  await page.waitForTimeout(200);
  ok('mapa: el clic carga el de Google', await page.evaluate(() => { const f = document.querySelector('.llegar iframe'); return !!f && /google\.com\/maps\?q=.*output=embed/.test(f.src); }));
  /* formulario */
  await page.evaluate(() => document.getElementById('reserva').requestSubmit());
  ok('formulario: sin datos avisa de fechas y nombre', await page.evaluate(() => !!document.getElementById('fechas-error').textContent && !!document.getElementById('reserva-error').textContent && document.getElementById('reserva-listo').hidden));
  await page.fill('#llegada', '2026-11-20'); await page.fill('#salida', '2026-11-18');
  await page.dispatchEvent('#salida', 'change');
  ok('formulario: la salida tiene que ir después de la llegada', await page.evaluate(() => /posterior/.test(document.getElementById('fechas-error').textContent)));
  await page.fill('#salida', '2026-11-21'); await page.dispatchEvent('#salida', 'change');
  ok('formulario: mínimo dos noches', await page.evaluate(() => /dos noches/.test(document.getElementById('fechas-error').textContent)));
  await page.fill('#salida', '2026-11-22'); await page.dispatchEvent('#salida', 'change');
  await page.fill('#personas', '10');
  ok('formulario: avisa si pasan de ocho plazas', await page.evaluate(() => /ocho/.test(document.getElementById('plazas-aviso').textContent)));
  await page.fill('#personas', '6');
  await page.fill('#nombre', 'Prueba');
  await page.evaluate(() => document.getElementById('reserva').requestSubmit());
  await page.waitForTimeout(200);
  const f = await page.evaluate(() => ({ txt: document.getElementById('reserva-texto').textContent, sms: document.getElementById('reserva-sms').getAttribute('href'), mail: document.getElementById('reserva-email').getAttribute('href'), visto: !document.getElementById('reserva-listo').hidden, wa: document.getElementById('reserva-whatsapp').disabled }));
  ok('formulario: compone el mensaje con fechas y plazas', f.visto && /^Hola, somos 6 personas y queremos alquilar la casa del viernes 20 de noviembre al domingo 22 de noviembre de 2026 \(2 noches\)\./.test(f.txt), f.txt.slice(0, 120));
  ok('formulario: el SMS lleva el mensaje bien codificado', f.sms.startsWith('sms:+34676516272?&body=') && decodeURIComponent(f.sms.split('body=')[1]) === f.txt);
  ok('formulario: el correo va a info@ar-molinodeviento.com con el mensaje', f.mail.startsWith('mailto:info@ar-molinodeviento.com?subject=') && decodeURIComponent(f.mail.split('body=')[1]) === f.txt);
  ok('formulario: WhatsApp apagado mientras config lo tenga a null', f.wa);
  ok('formulario: paseo virtual al panorama de Google', await page.evaluate(() => !!document.querySelector('a[href="https://maps.app.goo.gl/6bmRTehoVCNKgMgTA"]')));
  await cap(page, '1440-09-fechas');
  await bajar(page, 3000);
  await cap(page, '1440-10-pie');
  ok('pie: las aspas pequeñas giran', await (async () => { const b0 = await anguloDe(page, '.pie'); await page.waitForTimeout(300); return Math.abs(await anguloDe(page, '.pie') - b0) > 1; })());
  ok('escritorio: consola limpia tras recorrerla', !errores.length, errores.join(' | '));
  await ctx.close();
}
{
  /* precio a null en config: no se enseña */
  const cfg = JSON.parse(fs.readFileSync(path.join(raiz, 'data/config.json'), 'utf8')); cfg.precio = null;
  const { ctx, page } = await abrir({ width: 1440, height: 900 }, { cookiesAceptadas: true, config: cfg });
  await page.waitForTimeout(800);
  ok('tarifas: con precio null en config no sale', await page.evaluate(() => document.getElementById('precio').hidden && getComputedStyle(document.getElementById('precio')).display === 'none'));
  await ctx.close();
}

/* ═══════════════ 3 · la pila sticky de la finca (checklist 2) ═══════════════ */
console.log('\n3 · Pila de la finca');
{
  const { ctx, page } = await abrir({ width: 1440, height: 900 }, { cookiesAceptadas: true });
  await trasCortina(page);
  ok('pila: apilada en 1440×900 con alturas iguales', await page.evaluate(() => { const t = [...document.querySelectorAll('.tarjeta')].map(x => x.offsetHeight); return !window.Aspas.pila.plana() && t.every(h => Math.abs(h - t[0]) < 1); }));
  ok('pila: mismo margen inferior en todas, la última incluida', await page.evaluate(() => { const m = [...document.querySelectorAll('.pila__item')].map(li => getComputedStyle(li).marginBottom); return m.every(x => x === m[0] && parseFloat(x) > 0); }));
  await bajarHasta(page, '#finca', 300);
  const pasos = [];
  for (let i = 0; i < 70; i++) {
    pasos.push(await page.evaluate(() => { const li = [...document.querySelectorAll('.pila__item')]; const tope = parseFloat(getComputedStyle(li[0]).top); return { tope, tops: li.map(l => l.getBoundingClientRect().top), bottoms: li.map(l => l.querySelector('.tarjeta').getBoundingClientRect().bottom) }; }));
    await page.mouse.wheel(0, 90); await page.waitForTimeout(45);
  }
  const n = pasos[0].tops.length, tope = pasos[0].tope;
  const posada = pasos.findIndex(p => Math.abs(p.tops[n - 1] - tope) < 2);
  ok('pila: la última llega a posarse', posada > 0);
  const antes = pasos.slice(0, Math.max(0, posada));
  ok('pila: ninguna se suelta antes de que se pose la última', antes.every(p => p.tops.slice(0, n - 1).every(t => t > tope - 2)));
  ok('pila: nada asoma por debajo de la última', posada > 0 && pasos[posada].bottoms.slice(0, n - 1).every(b => b <= pasos[posada].bottoms[n - 1] + 1));
  const salida = pasos.slice(posada).find(p => p.tops[n - 1] < tope - 60);
  ok('pila: al acabarse salen todas juntas', !!salida && salida.tops.every(t => t < tope - 40), salida ? salida.tops.map(t => t.toFixed(0)).join(',') : 'no salió');
  await ctx.close();
}

/* ═══════════════ 4 · mando de densidades (?revision) ═══════════════ */
console.log('\n4 · Mando');
{
  const { ctx, page, errores } = await abrir({ width: 1440, height: 900 }, { query: '?revision' });
  await trasCortina(page);
  ok('mando: se aparta mientras está el aviso de cookies', await page.evaluate(() => getComputedStyle(document.getElementById('mando')).visibility === 'hidden'));
  await page.click('#cookies-aceptar');
  await page.waitForTimeout(450);
  ok('mando: aparece al cerrar el aviso', await page.evaluate(() => getComputedStyle(document.getElementById('mando')).visibility === 'visible'));
  ok('mando: avisa de las plazas y del precio por confirmar', await page.evaluate(() => /8 en TusCasasRurales, 8-10 en su web/.test(document.getElementById('mando').textContent) && /Precio por confirmar/.test(document.getElementById('mando').textContent)));
  ok('mando: las 10 dudas de la ficha', await page.evaluate(() => document.querySelectorAll('.mando__dudas li').length === 10));
  ok('mando: marca lo que solo sale en TusCasasRurales', await page.evaluate(() => [...document.querySelectorAll('[data-fuente="tcr"]')].every(li => /solo TCR/.test(getComputedStyle(li, '::after').content))));
  await page.click('[data-densidad="sobria"]');
  await page.waitForTimeout(500);
  const s = await page.evaluate(async () => {
    const ang = sel => { const r = document.querySelector(sel + ' .molino__rotor:not(.molino__rotor--mascara)'); return new DOMMatrix(getComputedStyle(r).transform); };
    const c0 = ang('.cabecera'), h0 = ang('#hero-molino');
    await new Promise(r => setTimeout(r, 400));
    const c1 = ang('.cabecera'), h1 = ang('#hero-molino');
    return {
      clase: document.documentElement.classList.contains('densidad-sobria'),
      rafagas: [...document.querySelectorAll('.rafaga svg')].every(o => getComputedStyle(o).display === 'none') && [...document.querySelectorAll('.rafaga')].every(r => r.offsetHeight === 1),
      sol: getComputedStyle(document.getElementById('sol')).display === 'none',
      arcos: !window.Aspas.arcos.anclado(),
      completa: getComputedStyle(document.getElementById('galeria-completa')).display === 'block' && document.querySelectorAll('#completa-rejilla li').length,
      tabla: getComputedStyle(document.getElementById('puntuaciones')).display === 'table',
      cabeceraQuieta: c0.a === c1.a && c0.b === c1.b && Math.abs(c1.b) < 1e-6,
      heroGira: h0.b !== h1.b,
      ancho: document.documentElement.scrollWidth <= innerWidth,
      guardada: localStorage.getItem('molino-densidad')
    };
  });
  ok('sobria: cambia la clase y se guarda', s.clase && s.guardada === 'sobria');
  ok('sobria: filetes rectos en lugar de ráfagas', s.rafagas);
  ok('sobria: sin el módulo del sol', s.sol);
  ok('sobria: arcos sin anclar', s.arcos);
  ok('sobria: las aspas solo giran en el hero (cabecera quieta)', s.cabeceraQuieta && s.heroGira);
  ok('sobria: añade la galería completa (30 fotos)', s.completa === 30, String(s.completa));
  ok('sobria: añade la tabla de puntuaciones', s.tabla);
  ok('sobria: sin desborde horizontal', s.ancho);
  await page.evaluate(() => [...document.querySelectorAll('#completa-filtros button')].find(b => b.textContent === 'La primavera').click());
  ok('sobria: el filtro deja solo la primavera', await page.evaluate(() => { const v = [...document.querySelectorAll('#completa-rejilla li')].filter(l => !l.hidden); return v.length > 0 && v.length < 10 && v.every(l => l.dataset.grupo === 'primavera'); }));
  await page.evaluate(() => document.querySelector('#completa-filtros button').click());
  await bajarHasta(page, '#opiniones', 80);
  ok('sobria: citas en una rejilla quieta', await page.evaluate(() => getComputedStyle(document.getElementById('citas-pista')).display === 'grid' && getComputedStyle(document.getElementById('citas-pista')).transform === 'none'));
  await cap(page, '1440-sobria-opiniones');
  await bajarHasta(page, '#galeria-completa', 80);
  await cap(page, '1440-sobria-galeria');
  await page.reload();
  await page.waitForTimeout(150);
  ok('sobria: al recargar se aplica sin parpadeo', await page.evaluate(() => document.documentElement.classList.contains('densidad-sobria')));
  await trasCortina(page);
  await page.click('[data-densidad="aspas"]');
  await page.waitForTimeout(500);
  ok('mando: se puede volver a «Aspas»', await page.evaluate(() => document.documentElement.classList.contains('densidad-aspas') && window.Aspas.arcos.anclado()));
  ok('mando: consola limpia', !errores.length, errores.join(' | '));
  await ctx.close();
}
{
  const { ctx, page } = await abrir({ width: 1440, height: 900 }, { init: () => { try { localStorage.setItem('molino-densidad', 'sobria'); } catch (e) {} } });
  ok('mando: sin ?revision ignora la densidad guardada', await page.evaluate(() => document.documentElement.classList.contains('densidad-aspas') && !document.documentElement.classList.contains('en-revision')));
  await ctx.close();
}

/* ═══════════════ 5 · móvil y anchos (checklist 3 y 6) ═══════════════ */
console.log('\n5 · Móvil y anchos');
for (const vp of [{ width: 360, height: 640 }, { width: 375, height: 667 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
  const movil = vp.width < 800;
  const { ctx, page } = await abrir(vp, { cookiesAceptadas: true, ctx: movil ? { hasTouch: true, isMobile: true } : {} });
  await trasCortina(page);
  const r = await page.evaluate(() => {
    const m = document.getElementById('hero-molino').getBoundingClientRect(), tit = document.querySelector('.hero__titulo').getBoundingClientRect(), nom = document.querySelector('.hero__nombre').getBoundingClientRect();
    const cab = document.getElementById('cabecera').getBoundingClientRect();
    const torre = document.querySelector('#hero-molino .molino__torre').getBoundingClientRect();
    const solapa = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
    return { solapa: solapa(torre, tit) || solapa(torre, nom), bajoCabecera: torre.top >= cab.bottom - 1, dentro: m.bottom <= innerHeight + 1, ancho: document.documentElement.scrollWidth, vw: innerWidth };
  });
  ok(`${vp.width}×${vp.height}: el molino del hero no pisa el texto ni la cabecera y se ve entero`, !r.solapa && r.bajoCabecera && r.dentro, JSON.stringify(r));
  ok(`${vp.width}×${vp.height}: sin desborde horizontal arriba`, r.ancho <= r.vw, r.ancho + ' > ' + r.vw);
  await cap(page, `${vp.width}-01-hero`);
  /* recorrerla entera: ningún desborde en ninguna sección */
  let peor = 0;
  for (let i = 0; i < 160; i++) {
    peor = Math.max(peor, await page.evaluate(() => document.documentElement.scrollWidth - innerWidth));
    const fin = await page.evaluate(() => innerHeight + scrollY >= document.documentElement.scrollHeight - 4);
    if (fin) break;
    await page.mouse.wheel(0, vp.height * 0.8); await page.waitForTimeout(50);
  }
  ok(`${vp.width}×${vp.height}: sin desborde horizontal en toda la página`, peor <= 0, peor + ' px');
  if (vp.width === 390) {
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300);
    ok('móvil: los arcos sin anclar, carril con scroll y snap', await page.evaluate(() => { const c = document.getElementById('arcos-carril'); return !window.Aspas.arcos.anclado() && c.scrollWidth > c.clientWidth && getComputedStyle(c).scrollSnapType.startsWith('x') && c.getAttribute('tabindex') === '0'; }));
    ok('móvil: los 8 arcos se alcanzan en el carril', await page.evaluate(() => { const c = document.getElementById('arcos-carril'); const max = c.scrollWidth - c.clientWidth; const ult = c.lastElementChild; return ult.offsetLeft + ult.offsetWidth - max <= c.clientWidth + 1; }));
    await bajar(page, 900);
    ok('móvil: la cabecera ya va fija', await page.evaluate(() => document.getElementById('cabecera').classList.contains('cabecera--fija') && getComputedStyle(document.getElementById('cabecera')).position === 'fixed'));
    await page.click('#hamburguesa');
    await page.waitForTimeout(700);
    const menu = await page.evaluate(() => { const n = document.getElementById('menu').getBoundingClientRect(); return { alto: n.height, top: n.top, vh: innerHeight, exp: document.getElementById('hamburguesa').getAttribute('aria-expanded'), vis: getComputedStyle(document.getElementById('menu')).visibility }; });
    ok('menú móvil: abre a pantalla entera con la cabecera fija', menu.exp === 'true' && menu.vis === 'visible' && Math.abs(menu.alto - menu.vh) < 2 && Math.abs(menu.top) < 2, JSON.stringify(menu));
    await cap(page, '390-menu');
    await page.click('#hamburguesa');
    await page.waitForTimeout(700);
    ok('menú móvil: el mismo botón lo cierra', await page.evaluate(() => document.getElementById('hamburguesa').getAttribute('aria-expanded') === 'false' && getComputedStyle(document.getElementById('menu')).visibility === 'hidden'));
    if (CAPTURAS) {
      for (const sel of ['#la-casa', '#arcos', '#sol', '#finca', '#lo-que-hay', '#alrededores', '#opiniones', '#tarifas', '#fechas', '#llegar']) {
        await bajarHasta(page, sel, 70);
        await page.waitForTimeout(800);
        await cap(page, '390-' + sel.slice(1));
      }
    }
  }
  await ctx.close();
}

/* ═══════════════ 6 · contraste (texto real sobre su fondo real) ═══════════════ */
console.log('\n6 · Contraste');
{
  const { ctx, page } = await abrir({ width: 1440, height: 900 }, { cookiesAceptadas: true, ctx: { reducedMotion: 'reduce' } });
  /* la cabecera es transparente solo sobre el hero (oscuro); en el resto va fija y oscura: se mide ya fija */
  await page.evaluate(() => window.scrollTo(0, 300)); await page.waitForTimeout(600);
  const medidas = await page.evaluate(() => {
    const rgb = c => { const m = c.match(/rgba?\(([^)]+)\)/); return m ? m[1].split(',').map(Number) : [0, 0, 0, 0]; };
    const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const fondo = el => { for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c.length === 3 || c[3] >= 0.88) return c; } return [244, 241, 234]; };
    const sel = ['.hero__nombre', '.hero__nombre span', '.hero__titulo', '.hero__datos dt', '.boton--lima', '.antetitulo', '.casa__cuerpo', '.casa__entera strong', '.cifras li > span', '.arco__num', '.arco__pie > span:last-child',
      '.tarjeta p', '.tarjeta__num', '.tarjeta--molino p', '.inventario li', '.alrededores__texto > p', '.alrededores__planes a', '.nota-grande span', '.citas__pista span', '.normas dt', '.precio__minimo', '.enlace',
      '.fechas__cabeza > p', '.fechas .antetitulo', '.campo label', '.llegar address a', '.rutas span', '.pie', '.pie nav a', '.cabecera__nav a', 'figcaption', '.sol__cita footer'];
    return sel.map(s => { const el = document.querySelector(s); if (!el) return [s, null]; const a = lum(rgb(getComputedStyle(el).color)), b = lum(fondo(el)); return [s, (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)]; });
  });
  for (const [s, c] of medidas) ok('contraste AA ' + s, c != null && c >= 4.5, c == null ? 'no está' : c.toFixed(2));
  await ctx.close();
}

/* ═══════════════ 7 · páginas legales y 404 ═══════════════ */
console.log('\n7 · Legales y 404');
for (const p of ['aviso-legal.html', 'privacidad.html']) {
  const { ctx, page, errores, fallos } = await abrir({ width: 1440, height: 900 }, { url: URL + p });
  ok(p + ': carga sin errores', !errores.length && !fallos.length, errores.concat(fallos).join(' | '));
  await ctx.close();
}
{
  const r = await fetch(URL + 'no-existe');
  ok('404: responde 404 con su página', r.status === 404 && /El viento se ha llevado/.test(await r.text()));
}

/* ═══════════════ 8 · entrega: quitar el mando y los módulos ═══════════════ */
console.log('\n8 · Entrega');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'molino-'));
{
  const destino = path.join(tmp, 'entrega');
  execFileSync(process.execPath, [path.join(raiz, 'scripts/quitar-mando.mjs'), destino], { stdio: 'ignore' });
  let limpio = true;
  try { execFileSync(process.execPath, [path.join(raiz, 'scripts/comprobar-borrado.mjs'), destino], { stdio: 'ignore' }); } catch (e) { limpio = false; }
  ok('entrega: comprobar-borrado no encuentra rastros del mando', limpio);
  const s2 = await servidor(destino, 4282);
  const { ctx, page, errores, fallos } = await abrir({ width: 1440, height: 900 }, { url: 'http://127.0.0.1:4282/', query: '?revision' });
  await trasCortina(page);
  ok('entrega: carga sin errores ni 404', !errores.length && !fallos.length, errores.concat(fallos).join(' | '));
  ok('entrega: sin mando aunque lleve ?revision', await page.evaluate(() => !document.getElementById('mando') && !document.getElementById('galeria-completa') && !document.getElementById('puntuaciones')));
  ok('entrega: sigue siendo «Aspas» (arcos anclados)', await page.evaluate(() => window.Aspas.arcos.anclado()));
  await ctx.close(); s2.close();
}
for (const [modulo, script, puerto, marca] of [['sol', 'quitar-sol.mjs', 4283, /[Ss]aliente al poniente|id="sol"|sol\.(css|js)/], ['alrededores', 'quitar-alrededores.mjs', 4284, /alrededores/i]]) {
  const copia = path.join(tmp, 'sin-' + modulo);
  fs.cpSync(raiz, copia, { recursive: true, filter: f => !/[\\/](screenshots|node_modules|\.git|fuentes)([\\/]|$)/.test(f) });
  execFileSync(process.execPath, [path.join(raiz, 'scripts', script), copia], { stdio: 'ignore' });
  const t = fs.readFileSync(path.join(copia, 'index.html'), 'utf8');
  ok(`${modulo}: el script quita sección, enlaces, hoja y script`, !marca.test(t.replace(/<!--[\s\S]*?-->/g, '')) && !fs.existsSync(path.join(copia, `css/${modulo}.css`)) && !fs.existsSync(path.join(copia, `js/${modulo}.js`)));
  const s3 = await servidor(copia, puerto);
  const { ctx, page, errores, fallos } = await abrir({ width: 1440, height: 900 }, { url: `http://127.0.0.1:${puerto}/`, cookiesAceptadas: true });
  await trasCortina(page);
  await bajar(page, 9000, 250, 25);
  ok(`${modulo}: sin el módulo la web va sin errores ni 404`, !errores.length && !fallos.length, errores.concat(fallos).join(' | '));
  ok(`${modulo}: y la pila de la finca sigue bien medida`, await page.evaluate(() => { const t = [...document.querySelectorAll('.tarjeta')].map(x => x.offsetHeight); return t.every(h => Math.abs(h - t[0]) < 1); }));
  await ctx.close(); s3.close();
}
fs.rmSync(tmp, { recursive: true, force: true });

await browser.close();
srv.close();
const fallan = resultados.filter(r => !r.cond);
console.log('\n' + (resultados.length - fallan.length) + '/' + resultados.length + ' comprobaciones bien.');
if (fallan.length) { console.log('Fallan:\n' + fallan.map(f => '  · ' + f.nombre + (f.detalle ? ' → ' + f.detalle : '')).join('\n')); process.exitCode = 1; }
