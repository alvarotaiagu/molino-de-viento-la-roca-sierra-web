/* Rellena cada <picture data-foto="ID" …></picture> del HTML con sus fuentes
   AVIF/WebP/JPG, a partir de data/fotos.json (alt, ancho, alto y versiones).
   Así, cambiar una foto es cambiar el ID en el HTML y volver a ejecutar esto.

   Atributos que lee del <picture>:
     data-foto   id de data/fotos.json (obligatorio)
     data-sizes  atributo sizes (por defecto 100vw)
     data-carga  eager | lazy (por defecto lazy); eager añade fetchpriority="high"
     data-alt    sustituye al alt de fotos.json ("" = decorativa)

   También rellena cada <svg data-molino="NOMBRE" …></svg> con el dibujo del
   molino de data/molino.json (lo genera scripts/logo.py): la torre con su
   máscara (las palas tapan lo que hay detrás) y el rotor, que gira en su plano.
   Cada copia lleva sus propios ids (molino-m-NOMBRE) y su propio rotor: un
   <use> compartiría la animación.

   node scripts/construir.mjs [páginas.html]   (idempotente: la segunda pasada no cambia nada)
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fotos = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(raiz, 'data/fotos.json'), 'utf8')).fotos.map(f => [f.id, f]));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const attr = (t, n) => { const m = t.match(new RegExp('\\s' + n + '="([^"]*)"')); return m ? m[1] : null; };

export function picture(id, { sizes = '100vw', carga = 'lazy', alt = null, sangria = '' } = {}) {
  const f = fotos[id];
  if (!f) throw new Error('No está en data/fotos.json: ' + id);
  const set = ext => f.anchos.map(a => `assets/fotos/${id}-${a}.${ext} ${a}w`).join(', ');
  const mayor = f.anchos[f.anchos.length - 1];
  const alto = Math.round(f.h * mayor / f.w);
  const extra = carga === 'eager' ? ' fetchpriority="high"' : ' loading="lazy"';
  return [
    `<source type="image/avif" srcset="${set('avif')}" sizes="${sizes}">`,
    `<source type="image/webp" srcset="${set('webp')}" sizes="${sizes}">`,
    `<img src="assets/fotos/${id}-${mayor}.jpg" srcset="${set('jpg')}" sizes="${sizes}" width="${mayor}" height="${alto}" alt="${esc(alt ?? f.alt)}" decoding="async"${extra}>`
  ].map(l => sangria + l).join('\n');
}

const molino = JSON.parse(fs.readFileSync(path.join(raiz, 'data/molino.json'), 'utf8'));
export function dibujoMolino(nombre) {
  const [x, y, w, h] = molino.viewBox;
  const r = molino.rotor;
  const mat = `matrix(${r.matriz.join(' ')} ${r.centro.join(' ')})`;
  const palas = (clase, conLargo) => r.palas.map(d => `<path class="${clase}"${conLargo ? ' pathLength="1"' : ''} d="${d}"/>`).join('') +
    `<circle class="${clase === 'molino__pala' ? 'molino__cubo' : clase}"${conLargo ? ' pathLength="1"' : ''} r="${r.cubo}"/>`;
  return `<defs><mask id="molino-m-${nombre}" maskUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}">` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff"/>` +
    `<g transform="${mat}"><g class="molino__rotor molino__rotor--mascara">${palas('molino__hueco', false)}</g></g></mask></defs>` +
    `<g class="molino__torre" mask="url(#molino-m-${nombre})">` +
    molino.torre.map(p => `<path pathLength="1" data-tipo="${p.tipo}" d="${p.d}"/>`).join('') + `</g>` +
    `<g transform="${mat}"><g class="molino__rotor">${palas('molino__pala', true)}</g></g>`;
}

const paginas = process.argv.slice(2).filter(a => a.endsWith('.html'));
for (const pagina of paginas.length ? paginas : ['index.html', 'aviso-legal.html', 'privacidad.html', '404.html']) {
  const ruta = path.join(raiz, pagina);
  const antes = fs.readFileSync(ruta, 'utf8');
  let n = 0;
  let despues = antes.replace(/([ \t]*)<picture([^>]*\sdata-foto="([\w-]+)"[^>]*)>[\s\S]*?<\/picture>/g, (todo, sangria, atributos, id) => {
    n++;
    const dentro = picture(id, {
      sizes: attr(atributos, 'data-sizes') || '100vw',
      carga: attr(atributos, 'data-carga') || 'lazy',
      alt: attr(atributos, 'data-alt'),
      sangria: sangria + '  '
    });
    return `${sangria}<picture${atributos}>\n${dentro}\n${sangria}</picture>`;
  });
  let m = 0;
  despues = despues.replace(/(<svg[^>]*\sdata-molino="([\w-]+)"[^>]*>)[\s\S]*?(<\/svg>)/g, (todo, abre, nombre, cierra) => { m++; return abre.replace(/\sviewBox="[^"]*"/, ' viewBox="' + molino.viewBox.join(' ') + '"') + dibujoMolino(nombre) + cierra; });
  /* los datos de las fotos van incrustados: la galería funciona también con file:// */
  const datos = JSON.stringify(Object.values(fotos).map(f => ({ id: f.id, grupo: f.grupo, panel: f.panel, alt: f.alt, w: f.w, h: f.h, anchos: f.anchos })));
  despues = despues.replace(/(<script type="application\/json" id="datos-fotos">)[^<]*(<\/script>)/, (t, a, b) => a + datos.replace(/</g, '\\u003c') + b);
  if (despues.length < antes.length * 0.8) throw new Error('Me niego: ' + pagina + ' perdería demasiado');
  if (despues !== antes) fs.writeFileSync(ruta, despues);
  console.log((despues !== antes ? 'actualizado ' : 'sin cambios ') + pagina + ' · ' + n + ' fotos · ' + m + ' molinos');
}
