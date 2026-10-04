/* ═══════════════════════════════════════════════════════════════════════════
   Módulo «Del saliente al poniente»: el sol cruza los ocho arcos con el scroll
   y el cielo pasa del amanecer al atardecer.
   Escritorio: la escena se ancla y el recorrido es el del scroll (scrub).
   Móvil: sin anclar, el recorrido es el paso de la escena por la pantalla.
   Sin GSAP o con movimiento reducido: quieta, en el atardecer (el contenido es
   el mismo: el sol del poniente y la frase).
   Si falta este archivo, la escena se ve quieta con el cielo del amanecer.
   Si falta la sección, este archivo no hace nada. Se quita con node scripts/quitar-sol.mjs.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var seccion = document.getElementById('sol');
  if (!seccion) return;
  var html = document.documentElement;
  var escena = document.getElementById('sol-escena'), astro = document.getElementById('sol-astro');
  var gsap = window.gsap, ST = window.ScrollTrigger;
  var movimiento = html.classList.contains('con-movimiento') && !!(gsap && ST);

  /* amanecer → mediodía → atardecer */
  var ARRIBA = [[231, 183, 158], [143, 188, 217], [91, 68, 112]];
  var ABAJO = [[245, 220, 186], [216, 232, 238], [240, 154, 85]];
  var ASTRO = [[255, 178, 122], [255, 241, 194], [242, 106, 46]];
  function mezcla(tabla, p) {
    var t = p * 2, i = t < 1 ? 0 : 1, f = t < 1 ? t : t - 1;
    var a = tabla[i], b = tabla[i + 1];
    return 'rgb(' + a.map(function (v, k) { return Math.round(v + (b[k] - v) * f); }).join(',') + ')';
  }
  function pintar(p) {
    p = Math.max(0, Math.min(1, p));
    escena.style.setProperty('--cielo-arriba', mezcla(ARRIBA, p));
    escena.style.setProperty('--cielo-abajo', mezcla(ABAJO, p));
    escena.style.setProperty('--astro', mezcla(ASTRO, p));
    astro.setAttribute('cx', (60 + 1480 * p).toFixed(1));
    astro.setAttribute('cy', (650 - 380 * Math.sin(Math.PI * p)).toFixed(1));
    seccion.dataset.progreso = p.toFixed(3);
  }
  window.Aspas = window.Aspas || {};
  window.Aspas.sol = { pintar: pintar, progreso: function () { return parseFloat(seccion.dataset.progreso); } };

  if (!movimiento) { pintar(0.88); return; }
  pintar(0);
  var disparador = null;
  function montar() {
    if (disparador) { disparador.kill(true); disparador = null; }
    if (html.classList.contains('densidad-sobria')) return;          /* en la sobria el módulo no está */
    var movil = window.matchMedia('(max-width: 860px)').matches;
    disparador = movil
      ? ST.create({ trigger: escena, start: 'top 85%', end: 'bottom 15%', scrub: 0.4, refreshPriority: 5, onUpdate: function (s) { pintar(s.progress); } })
      : ST.create({ trigger: escena, start: 'top top', end: '+=140%', pin: true, scrub: 0.5, refreshPriority: 5, onUpdate: function (s) { pintar(s.progress); } });
    pintar(disparador.progress || 0);
  }
  montar();
  var ancho = window.innerWidth;
  window.addEventListener('resize', function () {
    if (Math.abs(window.innerWidth - ancho) < 2) return;
    ancho = window.innerWidth;
    clearTimeout(montar.t);
    montar.t = setTimeout(function () { montar(); ST.refresh(); }, 220);
  });
  document.addEventListener('densidad-cambiada', function () { montar(); ST.refresh(); });
})();
