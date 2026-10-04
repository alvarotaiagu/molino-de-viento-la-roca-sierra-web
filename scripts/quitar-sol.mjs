/* Quita el módulo «Del saliente al poniente» (el sol que cruza los arcos) de una carpeta de la web.

   node scripts/quitar-sol.mjs ../copia-de-la-web     (sobre una copia)
   node scripts/quitar-sol.mjs --aqui                 (en esta misma carpeta, sin vuelta atrás)

   Lo que hace es exactamente la receta del README:
     1. index.html: borra la sección entre sus marcas «[MÓDULO SOL]»
        y las dos líneas con data-modulo="sol": el <link> de su hoja y el
        <script>. No tiene enlace en el menú.
     2. Borra css/sol.css y js/sol.js.
     3. Vuelve a versionar CSS y JS (?v=).
   No toca nada más: main.js y estilos.css no dependen del módulo (la regla .densidad-sobria .sol
   se queda sin nada a lo que aplicarse).
   verificar.mjs lo ejecuta sobre una copia temporal y comprueba que la web
   sigue sin errores.
*/
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const aqui = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = process.argv[2];
if (!arg) { console.error('Uso: node scripts/quitar-sol.mjs <carpeta> | --aqui'); process.exit(1); }
const raiz = arg === '--aqui' ? aqui : path.resolve(arg);

const ruta = path.join(raiz, 'index.html');
const antes = fs.readFileSync(ruta, 'utf8');
let t = antes;

const seccion = /[ \t]*<!-- \[MÓDULO SOL\][^\n]*\n[\s\S]*?<!-- fin del \[MÓDULO SOL\] -->\r?\n/;
if (!seccion.test(t)) { console.error('No encuentro las marcas [MÓDULO SOL] en ' + ruta + ' (¿ya estaba quitado?)'); process.exit(1); }
t = t.replace(seccion, '');
/* las líneas sueltas del módulo: enlace del menú, hoja y script (una por línea, nada de comodines) */
const lineas = t.split('\n');
const quedan = lineas.filter(l => !/data-modulo="sol"/.test(l));
const quitadas = lineas.length - quedan.length;
if (quitadas !== 2) { console.error('Esperaba 2 líneas con data-modulo="sol" y hay ' + quitadas + '. No toco nada.'); process.exit(1); }
t = quedan.join('\n');

if (t.length < antes.length * 0.8) { console.error('Me niego: index.html perdería demasiado.'); process.exit(1); }
fs.writeFileSync(ruta, t);
for (const f of ['css/sol.css', 'js/sol.js']) fs.rmSync(path.join(raiz, f), { force: true });
execFileSync(process.execPath, [path.join(aqui, 'scripts/versionar.mjs'), raiz], { stdio: 'ignore' });
console.log('Módulo «Del saliente al poniente» quitado de ' + raiz + ' (−' + (antes.length - t.length) + ' caracteres en index.html)');
