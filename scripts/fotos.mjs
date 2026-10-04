/* Versiones responsive de las fotos graduadas: AVIF + WebP + JPG a 480, 960 y
   1200 px de ancho, NUNCA por encima del original (las de su web son de 600 y
   460 px y se quedan en su tamaño). Lee los másteres que deja scripts/fotos.py
   en scripts/fuentes/masters/ y escribe:

     assets/fotos/<id>-<ancho>.avif|webp|jpg
     data/fotos.json  ← le añade w, h y anchos a cada foto (conserva alt y categoría)

   node scripts/fotos.mjs
   Usa sharp del node_modules de alvarotaiagu.github.io (no hay npm en este repo).
*/
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire('C:/Users/alvar/Desktop/WEBS NEGOCIOS/alvarotaiagu.github.io/package.json');
const sharp = require('sharp');

const origen = path.join(raiz, 'scripts', 'fuentes', 'masters');
const destino = path.join(raiz, 'assets', 'fotos');
fs.mkdirSync(destino, { recursive: true });
const ANCHOS = [480, 960, 1200];
const datos = JSON.parse(fs.readFileSync(path.join(raiz, 'data', 'fotos.json'), 'utf8'));

let bytes = 0;
for (const f of datos.fotos) {
  const src = path.join(origen, f.id + '.jpg');
  const meta = await sharp(src).metadata();
  f.w = meta.width; f.h = meta.height;
  const anchos = ANCHOS.filter(a => a < meta.width - 40);
  if (!anchos.length || meta.width - anchos[anchos.length - 1] > 120) anchos.push(Math.min(meta.width, 1200));
  f.anchos = [...new Set(anchos)].sort((a, b) => a - b);
  for (const a of f.anchos) {
    const base = sharp(src).resize({ width: a, withoutEnlargement: true });
    const salidas = [
      [base.clone().avif({ quality: 50, effort: 5 }), 'avif'],
      [base.clone().webp({ quality: 72 }), 'webp'],
      [base.clone().jpeg({ quality: 76, mozjpeg: true, progressive: true }), 'jpg']
    ];
    for (const [s, ext] of salidas) {
      const out = path.join(destino, `${f.id}-${a}.${ext}`);
      await s.toFile(out);
      bytes += fs.statSync(out).size;
    }
  }
}
fs.writeFileSync(path.join(raiz, 'data', 'fotos.json'), JSON.stringify(datos, null, 1) + '\n');
console.log(datos.fotos.length, 'fotos ·', (bytes / 1048576).toFixed(1), 'MB en assets/fotos');
