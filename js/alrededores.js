/* ═══════════════════════════════════════════════════════════════════════════
   Módulo «Alrededores»: las líneas de la rosa se trazan una a una al entrar.
   Si falta este archivo, la rosa se ve igual, quieta. Si falta la sección,
   este archivo no hace nada. Se quita con node scripts/quitar-alrededores.mjs.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var seccion = document.getElementById('alrededores');
  if (!seccion) return;
  var html = document.documentElement;
  if (!html.classList.contains('con-movimiento') || !('IntersectionObserver' in window)) return;
  var rutas = Array.prototype.slice.call(seccion.querySelectorAll('.rosa__rutas path'));
  rutas.forEach(function (r) { r.style.setProperty('--largo', Math.ceil(r.getTotalLength()) + 'px'); });
  seccion.classList.add('es-esperando');
  var obs = new IntersectionObserver(function (e) {
    if (!e[0].isIntersecting) return;
    obs.disconnect();
    rutas.forEach(function (r, i) {
      setTimeout(function () { r.classList.add('es-trazada'); }, 200 + i * 240);
    });
    /* al acabar, fuera los guiones de medir: el trazo queda continuo, sin salto */
    setTimeout(function () { seccion.classList.remove('es-esperando'); }, 200 + rutas.length * 240 + 1300);
  }, { threshold: 0.3 });
  obs.observe(seccion.querySelector('.rosa'));
})();
