/* ═══════════════════════════════════════════════════════════════════════════
   A.R. Molino de Viento · «Aspas»
   El viento que mueve las aspas es el hilo. En la cortina el molino se traza
   (torre y luego aspas), arranca, y una ráfaga barre la capa oscura en
   diagonal. Después todas las aspas comparten un mismo motor: giran despacio
   en reposo, aceleran con la velocidad del scroll de Lenis y frenan poco a poco
   al parar. Las ráfagas cruzan entre secciones y los ocho arcos se trazan al
   entrar.

   Banderas separadas a propósito:
     gsapReady  → hay motor de animación (GSAP + ScrollTrigger cargados)
     movimiento → además el usuario NO ha pedido reducir el movimiento
   Con movimiento reducido el CONTENIDO sigue (cifras, galería, formulario);
   lo que se apaga es el viaje: las aspas se quedan quietas.

   El rotor de cada molino gira con GSAP sobre (0, 0) de SU plano, con
   svgOrigin; ninguna regla CSS le pone transform (lo clavaría). Los trazos
   con pathLength="1" llevan autoRound:false.
   Los módulos «Sol» y «Alrededores» viven en js/sol.js y js/alrededores.js:
   este archivo no depende de ellos.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var html = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var esTactil = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  var gsapReady = !!(window.gsap && window.ScrollTrigger);
  var movimiento = gsapReady && !reduce;
  var gsap = window.gsap;
  var ST = window.ScrollTrigger;

  if (gsapReady) gsap.registerPlugin(ST);
  html.classList.add(movimiento ? 'con-movimiento' : 'sin-movimiento');

  /* lo mismo que data/config.json, por si el JSON no llega (abierto con doble clic) */
  var CONFIG = {
    telefono: '676 516 272', telefonoEnlace: '+34676516272',
    fijo: '924 406 375', fijoEnlace: '+34924406375',
    email: 'info@ar-molinodeviento.com', whatsapp: null,
    precio: { importe: 33, texto: 'por persona y noche', minimo: 'Mínimo, dos noches.' }
  };
  var PANELES = {
    porche: ['El porche', 'Ocho arcos de ladrillo sobre columnas de granito, mirando al saliente y al poniente.'],
    salon: ['El salón', 'Amplio, con chimenea, techo de vigas y la mesa del comedor.'],
    cocina: ['La cocina', 'Vajilla, cristalería, vitrocerámica, microondas, lavavajillas, frigorífico, tostador, cafetera, exprimidor y batidora.'],
    dormitorios: ['Los dormitorios', 'Cuatro dobles: dos con camas separadas y dos de matrimonio.'],
    barbacoa: ['La barbacoa', 'Bajo una encina, con su mesa de piedra.'],
    escalinata: ['La escalinata', 'Peldaños de piedra entre las rocas, hasta la casa.'],
    portada: ['La portada', 'El arco de piedra por el que se entra a la finca.'],
    charca: ['La charca', 'Dentro de la finca, entre encinas.']
  };
  var GRUPOS = { casa: 'La casa', finca: 'La finca', primavera: 'La primavera' };

  function $(s, r) { return (r || document).querySelector(s); }
  function todos(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function densidad() { return html.classList.contains('densidad-sobria') ? 'sobria' : 'aspas'; }
  function esMovil() { return window.matchMedia('(max-width: 860px)').matches; }
  function alturaCabecera() { var c = $('#cabecera'); return c ? c.offsetHeight : 76; }
  function refrescar() { if (ST) ST.refresh(); }
  function limitar(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function esperar(fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }
  function cuandoVisible(nodos, umbral, alEntrar, margen) {
    if (!('IntersectionObserver' in window)) { nodos.forEach(alEntrar); return; }
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (!en.isIntersecting) return;
        obs.unobserve(en.target);
        alEntrar(en.target);
      });
    }, { threshold: umbral, rootMargin: margen || '0px' });
    nodos.forEach(function (n) { obs.observe(n); });
  }

  var Aspas = window.Aspas = window.Aspas || {};
  Aspas.densidad = densidad;
  Aspas.movimiento = movimiento;

  /* ───────────────────── fotos: datos incrustados por construir.mjs ───────────────────── */
  var FOTOS = [];
  try { FOTOS = JSON.parse($('#datos-fotos').textContent); } catch (e) { FOTOS = []; }
  function picture(f, sizes, carga) {
    var set = function (ext) { return f.anchos.map(function (a) { return 'assets/fotos/' + f.id + '-' + a + '.' + ext + ' ' + a + 'w'; }).join(', '); };
    var mayor = f.anchos[f.anchos.length - 1];
    var p = document.createElement('picture');
    ['avif', 'webp'].forEach(function (ext) {
      var s = document.createElement('source');
      s.type = 'image/' + ext; s.srcset = set(ext); s.sizes = sizes; p.appendChild(s);
    });
    var img = document.createElement('img');
    img.src = 'assets/fotos/' + f.id + '-' + mayor + '.jpg';
    img.srcset = set('jpg'); img.sizes = sizes;
    img.width = mayor; img.height = Math.round(f.h * mayor / f.w);
    img.alt = f.alt; img.decoding = 'async';
    if (carga !== 'eager') img.loading = 'lazy';
    p.appendChild(img);
    return p;
  }

  if (window.fetch && location.protocol !== 'file:') {
    fetch('data/config.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (c) {
      if (!c) return;
      Object.keys(CONFIG).forEach(function (k) { if (k in c) CONFIG[k] = c[k]; });
      document.dispatchEvent(new CustomEvent('config-cargada'));
    }).catch(function () {});
  }

  /* ───────────────────────── Lenis ───────────────────────── */
  var lenis = null;
  if (movimiento && window.Lenis) {
    /* lerp algo alto: los ocho arcos se mueven en horizontal con el scroll */
    lenis = new window.Lenis({ lerp: 0.14, smoothWheel: true });
    lenis.on('scroll', ST.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
  }
  Aspas.lenis = lenis;

  function irA(destino) {
    var desfase = -alturaCabecera() + 1;
    if (destino === 0) { if (lenis) lenis.scrollTo(0, { duration: 1.4 }); else window.scrollTo(0, 0); return; }
    if (lenis) { lenis.scrollTo(destino, { offset: desfase, duration: 1.5 }); return; }
    var el = typeof destino === 'string' ? document.querySelector(destino) : destino;
    if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.pageYOffset + desfase);
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id === '#' || id === '#contenido' || !document.querySelector(id)) return;
    e.preventDefault();
    cerrarMenu();
    irA(id === '#inicio' ? 0 : id);
  });

  /* ═══════════════ el motor de las aspas ═══════════════
     Un solo ángulo para todos los molinos: así el de la cortina y el del hero
     coinciden al pasar de uno a otro. La velocidad persigue a un objetivo
     (reposo + velocidad del scroll + impulso de la cortina) con inercia
     asimétrica: acelera rápido y frena despacio. */
  var Molino = (function () {
    var lista = [];
    var angulo = 0, vel = 0;
    var REPOSO = 26;                       /* grados por segundo, en calma */
    var motor = { potencia: 1, impulso: 0 };
    function registrar(svg, nombre) {
      var rotor = svg.querySelector('.molino__rotor:not(.molino__rotor--mascara)');
      if (!rotor) return;
      var e = { svg: svg, nombre: nombre, rotor: rotor, mascara: svg.querySelector('.molino__rotor--mascara'), visible: true, quieto: false };
      lista.push(e);
      /* el de la cortina gira siempre: el clip-path de la capa engaña al IntersectionObserver */
      if (nombre !== 'cortina' && 'IntersectionObserver' in window) {
        new IntersectionObserver(function (en) { e.visible = en[0].isIntersecting; }, { rootMargin: '120px' }).observe(svg);
      }
      return e;
    }
    /* en la sobria solo giran el de la cortina y el del hero */
    function gira(e) { return movimiento && (densidad() === 'aspas' || e.nombre === 'hero' || e.nombre === 'cortina'); }
    function poner(e, a) {
      gsap.set(e.rotor, { rotation: a, svgOrigin: '0 0' });
      if (e.mascara) e.mascara.setAttribute('transform', e.rotor.getAttribute('transform'));
    }
    function paso(tiempo, deltaMs) {
      var dt = deltaMs / 1000;
      if (dt > 0.1) dt = 1 / 30;           /* el reloj se traga los atascos: un tirón no salta media vuelta */
      var scroll = lenis ? Math.min(Math.abs(lenis.velocity || 0), 70) : 0;
      var objetivo = (REPOSO + scroll * 11) * motor.potencia + motor.impulso;
      var tau = objetivo > vel ? 0.35 : 1.9;
      vel += (objetivo - vel) * (1 - Math.exp(-dt / tau));
      angulo = (angulo + vel * dt) % 360;
      for (var i = 0; i < lista.length; i++) {
        var e = lista[i];
        if (gira(e)) { e.quieto = false; if (e.visible) poner(e, angulo); }
        else if (!e.quieto) { e.quieto = true; poner(e, 0); }
      }
    }
    if (movimiento) {
      todos('svg.molino[data-molino]').forEach(function (s) { registrar(s, s.getAttribute('data-molino')); });
      gsap.ticker.add(paso);
    }
    return {
      registrar: registrar, motor: motor,
      angulo: function () { return angulo; }, velocidad: function () { return vel; },
      lista: function () { return lista; }
    };
  })();
  Aspas.molino = Molino;

  /* ───────────────────── titulares partidos (char-reveal) ───────────────────── */
  function partir(el) {
    var modo = el.dataset.revelar;
    var texto = el.textContent.replace(/\s+/g, ' ').trim();
    el.setAttribute('aria-label', texto);
    var piezas = [];
    function trocear(cadena, destino) {
      cadena.split(/(\s+)/).forEach(function (trozo) {
        if (!trozo) return;
        if (/^\s+$/.test(trozo)) { destino.appendChild(document.createTextNode(' ')); return; }
        var caja = document.createElement('span');
        caja.className = 'palabra';
        caja.setAttribute('aria-hidden', 'true');
        if (modo === 'letras') {
          Array.from(trozo).forEach(function (c) {
            var s = document.createElement('span');
            s.className = 'letra'; s.textContent = c;
            caja.appendChild(s); piezas.push(s);
          });
        } else {
          var s = document.createElement('span');
          s.className = 'palabra-int'; s.textContent = trozo;
          caja.appendChild(s); piezas.push(s);
        }
        destino.appendChild(caja);
      });
    }
    var hijos = Array.prototype.slice.call(el.childNodes);
    el.textContent = '';
    hijos.forEach(function (n) {
      if (n.nodeType === 3) { trocear(n.textContent, el); return; }
      if (n.nodeType === 1) {
        var envoltura = n.cloneNode(false);
        envoltura.setAttribute('aria-hidden', 'true');
        el.appendChild(envoltura);
        trocear(n.textContent, envoltura);
      }
    });
    return piezas;
  }
  function revelar(el, piezas, retardo) {
    var letras = el.dataset.revelar === 'letras';
    gsap.to(piezas, {
      y: 0, yPercent: 0, duration: 1.15, ease: 'expo.out', delay: retardo || 0,
      stagger: letras ? Math.min(0.026, 1.1 / piezas.length) : 0.07
    });
  }

  /* ─────────────────── la cortina: avisar del momento de apertura ─────────────────── */
  var cortinaAbierta = false;
  function avisarApertura() {
    if (cortinaAbierta) return;
    cortinaAbierta = true;
    document.dispatchEvent(new CustomEvent('cortina-abre'));
  }
  function alAbrirse(fn) { if (cortinaAbierta) fn(); else document.addEventListener('cortina-abre', fn, { once: true }); }
  Aspas.alAbrirse = alAbrirse;

  todos('[data-revelar]').forEach(function (el) {
    var piezas = partir(el);
    if (!movimiento) return;
    if (el.closest('.hero')) { alAbrirse(function () { revelar(el, piezas, 0.35); }); return; }
    /* una sola vez: IntersectionObserver (ScrollTrigger once:true no dispara si ya está en pantalla) */
    cuandoVisible([el], 0.3, function () { revelar(el, piezas); });
  });

  /* ═══════════════ cortina «Arranca el molino» ═══════════════
     1 · sobre la capa oscura el molino se traza en lima: la torre y luego las aspas
     2 · las aspas arrancan y aceleran
     3 · una ráfaga de líneas cruza en diagonal y la capa se retira detrás de ella
     El molino de la cortina es un clon del del hero, colocado encima al píxel. */
  (function cortina() {
    var c = $('#cortina');
    if (!c) return;
    var retirada = false;
    function retirar() {
      if (retirada) return;
      retirada = true;
      c.classList.add('fuera');
      c.setAttribute('hidden', '');
      avisarApertura();
      Molino.motor.potencia = 1;
      if (movimiento) gsap.to(Molino.motor, { impulso: 0, duration: 2.8, ease: 'power2.out', overwrite: true });
      /* durante la cortina GSAP se traga los atascos (lagSmoothing por defecto); después, Lenis manda */
      if (lenis) { lenis.start(); gsap.ticker.lagSmoothing(0); }
    }
    Aspas.retirarCortina = retirar;
    if (!movimiento) { retirar(); return; }

    var capa = $('#cortina-capa'), lienzo = $('#cortina-molino'), heroM = $('#hero-molino');
    lienzo.setAttribute('viewBox', heroM.getAttribute('viewBox'));
    lienzo.innerHTML = heroM.innerHTML.replace(/molino-m-hero/g, 'molino-m-cortina');
    lienzo.setAttribute('data-molino', 'cortina');
    Molino.registrar(lienzo, 'cortina');
    var torre = $('.molino__torre', lienzo);
    var trazosTorre = todos('path', torre);
    var trazosRotor = todos('.molino__rotor:not(.molino__rotor--mascara) > *', lienzo);
    var rafagas = todos('#cortina-rafaga path');
    var mascara = torre.getAttribute('mask');
    torre.removeAttribute('mask');         /* sin aspas dibujadas, no deben tapar nada */
    gsap.set(trazosTorre.concat(trazosRotor), { strokeDasharray: 1, strokeDashoffset: 1 });
    gsap.set(trazosRotor, { fillOpacity: 0 });
    Molino.motor.potencia = 0;              /* quieto hasta el paso 2 */

    /* la página arranca arriba: el molino de la cortina tiene que caer encima del del hero */
    if (!location.hash) {
      if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
      window.scrollTo(0, 0);
    }
    if (lenis) lenis.stop();

    function colocar() {
      var r = heroM.getBoundingClientRect();
      if (r.width && r.top >= 0 && r.bottom <= window.innerHeight + 1) {
        lienzo.classList.add('es-colocado');
        lienzo.style.left = r.left + 'px';
        lienzo.style.top = r.top + 'px';
        lienzo.style.width = r.width + 'px';
        lienzo.style.height = r.height + 'px';
      } else {
        lienzo.classList.remove('es-colocado');
        lienzo.style.left = lienzo.style.top = lienzo.style.width = lienzo.style.height = '';
      }
    }
    Aspas.colocarCortina = colocar;
    var fuentes = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    var tope = new Promise(function (ok) { setTimeout(ok, 1500); });
    Promise.race([fuentes, tope]).then(function () {
      colocar();
      /* las letras pueden llegar durante la cortina y mover el hero: se vuelve a medir en cada fotograma */
      gsap.ticker.add(colocar);
      var barrido = { p: 0 };
      var tl = gsap.timeline({ onComplete: function () { gsap.ticker.remove(colocar); retirar(); } });
      /* 1 · la torre, trazo a trazo, y después las aspas */
      tl.to(trazosTorre, { strokeDashoffset: 0, duration: 0.45, stagger: 0.04, ease: 'power2.inOut', autoRound: false });
      tl.to(trazosRotor, { strokeDashoffset: 0, duration: 0.45, stagger: 0.06, ease: 'power2.inOut', autoRound: false }, '-=0.15');
      tl.to(trazosRotor, { fillOpacity: 1, duration: 0.25 }, '-=0.1');
      tl.call(function () { torre.setAttribute('mask', mascara); }, null, '<');
      /* 2 · arrancan y aceleran */
      tl.to(Molino.motor, { potencia: 1, impulso: 560, duration: 0.75, ease: 'power2.in' }, '-=0.05');
      /* 3 · la ráfaga cruza y la capa se retira detrás, en diagonal */
      tl.add('rafaga', '-=0.2');
      tl.to(rafagas, { strokeDashoffset: -1.05, duration: 1.05, stagger: 0.06, ease: 'power2.inOut', autoRound: false }, 'rafaga');
      tl.add(avisarApertura, 'rafaga+=0.2');
      tl.to(barrido, {
        p: 1, duration: 1.0, ease: 'expo.inOut',
        onUpdate: function () {
          var W = window.innerWidth, H = window.innerHeight, k = H * 0.5, s = barrido.p * (W + k + 4) - 2;
          capa.style.clipPath = 'polygon(' + s.toFixed(1) + 'px 0, ' + (W + 4) + 'px 0, ' + (W + 4) + 'px ' + (H + 4) + 'px, ' + (s - k).toFixed(1) + 'px ' + (H + 4) + 'px)';
        }
      }, 'rafaga+=0.15');
      Aspas.cortinaTl = tl;
    });
  })();

  /* ───────────────── cifras que cuentan al entrar ───────────────── */
  function formatear(v, dec) { return dec ? v.toFixed(dec).replace('.', ',') : String(Math.round(v)); }
  function contar(el) {
    var fin = parseFloat(el.dataset.contar), dec = parseInt(el.dataset.decimales || '0', 10);
    if (!movimiento) { el.textContent = formatear(fin, dec); return; }
    var o = { v: 0 };
    el.textContent = formatear(0, dec);
    gsap.to(o, { v: fin, duration: fin > 100 ? 1.6 : 1.2, ease: 'power3.out', onUpdate: function () { el.textContent = formatear(o.v, dec); } });
  }
  cuandoVisible(todos('[data-contar]'), 0.6, contar);

  /* ───────────────── la foto del porche se destapa en forma de arco ─────────────────
     Se anima un número y se escribe el clip-path entero (GSAP normaliza inset() y lo descoloca). */
  (function arcoQueSube() {
    var marco = $('#casa-marco');
    if (!marco || !movimiento) return;
    function pintar(p) {
      var w = marco.offsetWidth, h = marco.offsetHeight, r = w / 2;
      marco.style.clipPath = p >= 1 ? '' : 'inset(' + ((1 - p) * h).toFixed(1) + 'px 0 0 0 round ' + r + 'px ' + r + 'px 0 0)';
    }
    pintar(0);
    cuandoVisible([$('#casa-foto')], 0.25, function () {
      var o = { p: 0 };
      gsap.to(o, { p: 1, duration: 1.7, ease: 'expo.inOut', onUpdate: function () { pintar(o.p); } });
    });
    Aspas.arcoPorche = function () { return marco.style.clipPath; };
  })();

  /* ═══════════════ 3 · ocho arcos: galería anclada en horizontal ═══════════════ */
  (function arcos() {
    var marco = $('#arcos-marco'), carril = $('#arcos-carril');
    if (!marco || !carril) return;
    var paneles = todos('.arco', carril);
    var anclaje = null;
    function trazar() {
      var ancho = window.innerWidth, alto = window.innerHeight;
      paneles.forEach(function (p) {
        if (p.classList.contains('es-trazado')) return;
        var r = p.getBoundingClientRect();
        if (r.left < ancho * 0.92 && r.right > 0 && r.top < alto * 0.9 && r.bottom > 0) p.classList.add('es-trazado');
      });
    }
    window.addEventListener('scroll', trazar, { passive: true });
    carril.addEventListener('scroll', trazar, { passive: true });
    /* el carril solo es una parada de tabulación cuando de verdad desborda */
    function foco() {
      var desborda = !marco.classList.contains('es-anclado') && carril.scrollWidth > carril.clientWidth + 2;
      if (desborda) carril.setAttribute('tabindex', '0'); else carril.removeAttribute('tabindex');
    }
    function montar() {
      if (anclaje) { anclaje.kill(true); anclaje = null; }
      if (gsapReady) gsap.set(carril, { clearProps: 'transform' });
      marco.classList.remove('es-anclado');
      /* anclar solo si la pantalla tiene altura suficiente para que quepan el título + los arcos */
      var altoMin = 580;
      var anclar = movimiento && densidad() === 'aspas' && !esMovil() && window.innerHeight >= altoMin;
      if (!anclar) { foco(); trazar(); return; }
      marco.classList.add('es-anclado');
      /* resetear x antes de crear el ST para evitar el arrastre de un ciclo anterior */
      gsap.set(carril, { x: 0 });
      var distancia = function () { return Math.max(0, carril.scrollWidth - window.innerWidth); };
      anclaje = ST.create({
        trigger: '#arcos', start: 'top top', end: function () { return '+=' + distancia(); },
        pin: true, scrub: 0.6, invalidateOnRefresh: true, refreshPriority: 10,
        animation: gsap.fromTo(carril, { x: 0 }, { x: function () { return -distancia(); }, ease: 'none', immediateRender: false }),
        onUpdate: trazar
      });
      foco(); trazar();
    }
    montar();
    var anchoPrevio = window.innerWidth, altoPrevio = window.innerHeight;
    window.addEventListener('resize', esperar(function () {
      var cambioAncho = Math.abs(window.innerWidth - anchoPrevio) >= 2;
      var cambioAlto  = Math.abs(window.innerHeight - altoPrevio) >= 2;
      if (!cambioAncho && !cambioAlto) return;
      anchoPrevio = window.innerWidth; altoPrevio = window.innerHeight;
      montar(); refrescar();
    }, 200));
    document.addEventListener('densidad-cambiada', function () { montar(); refrescar(); });
    Aspas.arcos = { anclado: function () { return marco.classList.contains('es-anclado'); } };
  })();

  /* ═══════════════ fotos de un arco (dialog) ═══════════════ */
  var galeria = (function () {
    var dlg = $('#galeria');
    if (!dlg || !dlg.showModal) return null;
    var lista = [], i = 0, origen = null;
    var foto = $('#galeria-foto'), cuenta = $('#galeria-cuenta');
    function pintar() {
      var f = lista[i];
      foto.textContent = '';
      var p = picture(f, 'min(1100px, 100vw)', 'eager');
      /* las fotos pequeñas de su web (600 y 460 px) no se amplían */
      p.querySelector('img').style.maxWidth = f.w + 'px';
      foto.appendChild(p);
      var cap = document.createElement('figcaption');
      cap.textContent = f.alt;
      foto.appendChild(cap);
      cuenta.textContent = (i + 1) + ' de ' + lista.length;
    }
    function abrir(clave, idFoto, desde, porGrupo) {
      lista = FOTOS.filter(function (f) { return porGrupo ? (clave === 'todas' || f.grupo === clave) : f.panel === clave; });
      if (!lista.length) return;
      i = Math.max(0, lista.findIndex(function (f) { return f.id === idFoto; }));
      var t = porGrupo ? [GRUPOS[clave] || 'Todas las fotos', ''] : (PANELES[clave] || [clave, '']);
      $('#galeria-titulo').textContent = t[0];
      $('#galeria-texto').textContent = t[1];
      origen = desde || null;
      pintar();
      dlg.showModal();
      if (lenis) lenis.stop();
    }
    function mover(d) { i = (i + d + lista.length) % lista.length; pintar(); }
    $('#galeria-antes').addEventListener('click', function () { mover(-1); });
    $('#galeria-despues').addEventListener('click', function () { mover(1); });
    $('#galeria-cerrar').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); mover(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); mover(1); }
    });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', function () { if (lenis) lenis.start(); if (origen) origen.focus(); });
    todos('.arco').forEach(function (b) {
      b.addEventListener('click', function () { abrir(b.dataset.panel, null, b); });
    });
    return { abrir: abrir };
  })();
  Aspas.galeria = galeria;

  /* ═══════════════ 5 · la finca: pila sticky ═══════════════
     Receta del checklist: el <li> es el sticky; TODAS las tarjetas con el alto
     de la más alta (medido, nunca una altura de pantalla) y el mismo margen
     inferior, la última incluida; el ::after da el reposo. Si no caben, se
     desapila. La de debajo encoge mientras llega la siguiente. */
  (function pila() {
    var lista = $('#pila');
    if (!lista) return;
    var items = todos('.pila__item', lista);
    var tarjetas = items.map(function (li) { return $('.tarjeta', li); });
    var escalas = [];
    function medir() {
      escalas.forEach(function (s) { s.kill(true); });
      escalas = [];
      lista.style.removeProperty('--alto-tarjeta');
      lista.classList.remove('es-plana');
      if (gsapReady) gsap.set(tarjetas, { clearProps: 'transform' });
      var max = 0;
      tarjetas.forEach(function (t) { t.style.height = 'auto'; max = Math.max(max, t.offsetHeight); t.style.height = ''; });
      var tope = parseFloat(getComputedStyle(items[0]).top) || 0;
      if (max > window.innerHeight - tope - 16) { lista.classList.add('es-plana'); return; }
      lista.style.setProperty('--alto-tarjeta', Math.ceil(max) + 'px');
      if (!movimiento) return;
      for (var i = 0; i < items.length - 1; i++) {
        escalas.push(ST.create({
          trigger: items[i + 1], start: 'top bottom', end: 'top ' + tope + 'px', scrub: true,
          animation: gsap.fromTo(tarjetas[i], { scale: 1 }, { scale: 0.93, ease: 'none', immediateRender: false })
        }));
      }
    }
    medir();
    var anchoPrevio = window.innerWidth, altoPrevio = window.innerHeight;
    window.addEventListener('resize', esperar(function () {
      if (Math.abs(window.innerWidth - anchoPrevio) < 2 && Math.abs(window.innerHeight - altoPrevio) < 80) return;
      anchoPrevio = window.innerWidth; altoPrevio = window.innerHeight;
      medir(); refrescar();
    }, 200));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { medir(); refrescar(); });
    Aspas.pila = { plana: function () { return lista.classList.contains('es-plana'); }, medir: medir };
  })();

  /* ───────────────── ráfagas entre secciones: solo soplan a la vista ───────────────── */
  (function rafagas() {
    var r = todos('.rafaga');
    if (!r.length || !('IntersectionObserver' in window)) return;
    var obs = new IntersectionObserver(function (en) {
      en.forEach(function (e) { e.target.classList.toggle('es-visible', e.isIntersecting); });
    });
    r.forEach(function (n) { obs.observe(n); });
  })();

  /* ───────────────── cinta de opiniones: velocidad ligada al scroll ───────────────── */
  (function cinta() {
    var pista = $('#citas-pista');
    if (!pista || !movimiento) return;
    /* pocas citas: se repiten hasta llenar dos anchos de pantalla */
    var originales = todos('li', pista);
    for (var k = 0; k < 3; k++) {
      originales.forEach(function (li) {
        var c = li.cloneNode(true);
        c.setAttribute('aria-hidden', 'true');
        pista.appendChild(c);
      });
    }
    var x = 0, mitad = 0, visible = false;
    function medir() { mitad = pista.scrollWidth / 2; }
    medir();
    window.addEventListener('resize', esperar(medir, 200));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(medir);
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(pista);
    gsap.ticker.add(function () {
      if (densidad() !== 'aspas') { if (x) { x = 0; pista.style.transform = ''; } return; }
      if (!visible || !mitad) return;
      var vel = lenis ? Math.abs(lenis.velocity || 0) : 0;
      x -= 0.45 + Math.min(vel, 40) * 0.12;
      if (-x >= mitad) x += mitad;
      pista.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
    });
  })();

  /* ───────────────── botones magnéticos ───────────────── */
  (function imanes() {
    if (!movimiento || esTactil) return;
    todos('.iman').forEach(function (el) {
      var aX = gsap.quickTo(el, 'x', { duration: 0.55, ease: 'power3.out' });
      var aY = gsap.quickTo(el, 'y', { duration: 0.55, ease: 'power3.out' });
      el.addEventListener('pointermove', function (e) {
        var c = el.getBoundingClientRect();
        aX((e.clientX - (c.left + c.width / 2)) * 0.3);
        aY((e.clientY - (c.top + c.height / 2)) * 0.4);
      });
      el.addEventListener('pointerleave', function () { aX(0); aY(0); });
    });
  })();

  /* ───────────────── cursor propio: punto de encina + aro de lima ───────────────── */
  (function cursor() {
    if (!movimiento || esTactil) return;
    var aro = document.createElement('div');
    var pt = document.createElement('div');
    aro.className = 'cursor';
    pt.className = 'cursor-punto';
    [aro, pt].forEach(function (n) { n.setAttribute('aria-hidden', 'true'); document.body.appendChild(n); });
    var aX = gsap.quickTo(aro, 'x', { duration: 0.28, ease: 'power3.out' });
    var aY = gsap.quickTo(aro, 'y', { duration: 0.28, ease: 'power3.out' });
    var ultimo = null;
    function mostrar(si) { aro.classList.toggle('cursor--vivo', si); pt.classList.toggle('cursor--vivo', si); }
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      if (!aro.classList.contains('cursor--vivo')) { gsap.set(aro, { x: e.clientX, y: e.clientY }); mostrar(true); }
      /* el del sistema se oculta solo cuando el propio ya se ve */
      if (!html.classList.contains('con-cursor')) html.classList.add('con-cursor');
      gsap.set(pt, { x: e.clientX, y: e.clientY });
      aX(e.clientX); aY(e.clientY);
      if (e.target !== ultimo) {
        ultimo = e.target;
        var t = e.target.closest ? e.target : null;
        var sobre = !!(t && t.closest('a, button, label, input, select, textarea, summary, [role="button"]'));
        var oscuro = !!(t && t.closest('.hero, .cabecera, .fechas, .pie, .tarjeta--molino, .cookies, .mando, .galeria__foto'));
        aro.classList.toggle('cursor--activo', sobre);
        aro.classList.toggle('cursor--oscuro', oscuro);
        pt.classList.toggle('cursor-punto--activo', sobre);
      }
    });
    html.addEventListener('mouseleave', function () { mostrar(false); });
    html.addEventListener('mouseenter', function () { if (html.classList.contains('con-cursor')) mostrar(true); });
  })();

  /* ───────────────── cabecera fija y menú móvil ───────────────── */
  var cabecera = $('#cabecera');
  var boton = $('#hamburguesa');
  (function cabeceraFija() {
    if (!cabecera) return;
    function actualizar() { cabecera.classList.toggle('cabecera--fija', window.pageYOffset > 40); }
    window.addEventListener('scroll', actualizar, { passive: true });
    actualizar();
  })();
  function cerrarMenu() {
    if (!cabecera || !boton || !cabecera.classList.contains('menu-abierto')) return;
    cabecera.classList.remove('menu-abierto');
    boton.setAttribute('aria-expanded', 'false');
    boton.querySelector('.visualmente-oculto').textContent = 'Abrir menú';
    if (lenis) lenis.start();
  }
  if (boton) {
    boton.addEventListener('click', function () {
      var abierto = cabecera.classList.toggle('menu-abierto');
      boton.setAttribute('aria-expanded', abierto ? 'true' : 'false');
      boton.querySelector('.visualmente-oculto').textContent = abierto ? 'Cerrar menú' : 'Abrir menú';
      if (lenis) { if (abierto) lenis.stop(); else lenis.start(); }
    });
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrarMenu(); });

  /* ───────────────── mapa: Google solo bajo clic ───────────────── */
  (function mapa() {
    var btn = $('#mapa-boton'), caja = $('#mapa-consentimiento');
    if (!btn || !caja) return;
    btn.addEventListener('click', function () {
      var marco = document.createElement('iframe');
      marco.src = 'https://www.google.com/maps?q=' + encodeURIComponent('39.1101425,-6.6737914 (A.R. Molino de Viento)') + '&z=15&output=embed';
      marco.loading = 'lazy';
      marco.title = 'Mapa: A.R. Molino de Viento, C. Vasco Núñez de Balboa 2, La Roca de la Sierra';
      marco.allowFullscreen = true;
      marco.referrerPolicy = 'no-referrer-when-downgrade';
      caja.parentNode.replaceChild(marco, caja);
      setTimeout(refrescar, 60);
    });
  })();

  /* ───────────────── tarifa: sale de data/config.json (null = no se enseña) ───────────────── */
  function pintarPrecio() {
    var caja = $('#precio');
    if (!caja) return;
    var p = CONFIG.precio;
    if (!p || p.importe == null) { caja.hidden = true; return; }
    $('#precio-importe').textContent = String(p.importe).replace('.', ',') + ' €';
    $('#precio-texto').textContent = p.texto || '';
    $('#precio-minimo').textContent = p.minimo || '';
    caja.hidden = false;
  }
  pintarPrecio();
  document.addEventListener('config-cargada', function () { pintarPrecio(); refrescar(); });

  /* ───────────────── consultar fechas: el mensaje para la casa ───────────────── */
  function copiar(texto) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(texto).then(function () { return true; }, function () { return copiarViejo(texto); });
    }
    return Promise.resolve(copiarViejo(texto));
  }
  function copiarViejo(texto) {
    var t = document.createElement('textarea');
    t.value = texto; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.appendChild(t); t.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(t);
    return ok;
  }
  /* sms:+34…?&body=… lo entienden iOS y Android */
  function sms(texto) { return 'sms:' + CONFIG.telefonoEnlace + '?&body=' + encodeURIComponent(texto); }
  function correo(texto, asunto) { return 'mailto:' + CONFIG.email + '?subject=' + encodeURIComponent(asunto) + '&body=' + encodeURIComponent(texto); }
  Aspas.sms = sms;

  (function reserva() {
    var form = $('#reserva');
    if (!form) return;
    var llegada = $('#llegada'), salida = $('#salida');
    var errFechas = $('#fechas-error'), err = $('#reserva-error'), aviso = $('#plazas-aviso');
    var listo = $('#reserva-listo'), salidaTxt = $('#reserva-texto'), enlaceSms = $('#reserva-sms'), enlaceCorreo = $('#reserva-email');
    var estado = $('#reserva-estado'), wa = $('#reserva-whatsapp'), waNota = $('#whatsapp-nota');
    var texto = '';
    var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    function aFecha(v) { var p = v.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
    function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
    function largo(d, conAnio) { return DIAS[d.getDay()] + ' ' + d.getDate() + ' de ' + MESES[d.getMonth()] + (conAnio ? ' de ' + d.getFullYear() : ''); }
    var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    llegada.min = iso(hoy);

    function comprobarFechas(final) {
      llegada.removeAttribute('aria-invalid'); salida.removeAttribute('aria-invalid');
      if (!llegada.value || !salida.value) {
        errFechas.textContent = final ? 'Elegid la fecha de llegada y la de salida.' : '';
        if (final) (llegada.value ? salida : llegada).setAttribute('aria-invalid', 'true');
        return false;
      }
      var noches = Math.round((aFecha(salida.value) - aFecha(llegada.value)) / 864e5);
      if (noches <= 0) {
        errFechas.textContent = 'La salida tiene que ser posterior a la llegada.';
        salida.setAttribute('aria-invalid', 'true');
        return false;
      }
      if (noches < 2) {
        errFechas.textContent = 'La estancia mínima es de dos noches.';
        salida.setAttribute('aria-invalid', 'true');
        return false;
      }
      errFechas.textContent = '';
      return true;
    }
    llegada.addEventListener('change', function () {
      if (llegada.value) { var a = aFecha(llegada.value); a.setDate(a.getDate() + 2); salida.min = iso(a); }
      if (salida.value) comprobarFechas(false);
    });
    salida.addEventListener('change', function () { comprobarFechas(false); });
    function plazas() {
      var n = parseInt(form.elements.personas.value, 10) || 0;
      aviso.textContent = n > 8 ? 'La casa es para ocho personas. Si sois más, contadlo en el mensaje.' : '';
    }
    form.elements.personas.addEventListener('input', plazas);

    function pintarCanales() {
      var activo = !!CONFIG.whatsapp;
      wa.disabled = !activo;
      wa.classList.toggle('es-apagado', !activo);
      waNota.hidden = activo;
    }
    pintarCanales();
    document.addEventListener('config-cargada', pintarCanales);
    wa.addEventListener('click', function () {
      if (!CONFIG.whatsapp || !texto) return;
      window.open('https://wa.me/' + CONFIG.whatsapp + '?text=' + encodeURIComponent(texto), '_blank', 'noopener');
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var okFechas = comprobarFechas(true);
      var nombre = form.elements.nombre.value.trim();
      form.elements.nombre.toggleAttribute('aria-invalid', !nombre);
      err.textContent = nombre ? '' : 'Falta vuestro nombre, para saber quién pregunta.';
      if (!okFechas || !nombre) { listo.hidden = true; return; }
      var a = aFecha(llegada.value), b = aFecha(salida.value);
      var noches = Math.round((b - a) / 864e5);
      var n = Math.max(1, parseInt(form.elements.personas.value, 10) || 1);
      var mismoAnio = a.getFullYear() === b.getFullYear();
      var lineas = [
        'Hola, somos ' + n + (n === 1 ? ' persona' : ' personas') + ' y queremos alquilar la casa del ' + largo(a, !mismoAnio) + ' al ' + largo(b, true) +
          ' (' + noches + ' noches).'
      ];
      var msg = form.elements.mensaje.value.trim();
      if (msg) lineas.push('', msg);
      lineas.push('', '¿Está libre esas fechas?', '', 'Un saludo,', nombre);
      var tel = form.elements.telefono.value.trim();
      if (tel) lineas.push('Tel. ' + tel);
      texto = lineas.join('\n');
      salidaTxt.textContent = texto;
      enlaceSms.href = sms(texto);
      enlaceCorreo.href = correo(texto, 'Fechas para A.R. Molino de Viento');
      estado.textContent = '';
      listo.hidden = false;
      setTimeout(refrescar, 30);
      if (listo.scrollIntoView) listo.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
    });
    $('#reserva-copiar').addEventListener('click', function () {
      copiar(texto).then(function (ok) {
        estado.textContent = ok ? 'Mensaje copiado. Pegadlo donde queráis.' : 'No se ha podido copiar: seleccionad el texto y copiadlo a mano.';
      });
    });
  })();

  /* ───────────────── aviso de cookies ───────────────── */
  (function cookies() {
    var caja = $('#cookies'), ok = $('#cookies-aceptar'), reabrir = $('#cookies-reabrir');
    if (!caja || !ok) return;
    function ver(si) {
      caja.hidden = !si;                      /* el CSS pone display solo si NO hay [hidden] */
      document.body.classList.toggle('cookies-visibles', si);
    }
    var guardado = null;
    try { guardado = localStorage.getItem('molino-cookies'); } catch (e) {}
    if (guardado !== 'ok') ver(true);
    ok.addEventListener('click', function () {
      ver(false);
      try { localStorage.setItem('molino-cookies', 'ok'); } catch (e) {}
    });
    if (reabrir) reabrir.addEventListener('click', function () { ver(true); ok.focus(); });
  })();

  var anio = $('#anio');
  if (anio) anio.textContent = new Date().getFullYear();

  if (gsapReady && document.fonts && document.fonts.ready) document.fonts.ready.then(refrescar);
  /* contenido que cambia de alto (mensaje, mapa, precio): el fin de página de ScrollTrigger se queda viejo */
  if (gsapReady && 'ResizeObserver' in window) {
    var altoPrevio = 0;
    var refrescarTarde = esperar(refrescar, 150);
    new ResizeObserver(function () {
      var a = document.body.offsetHeight;
      if (Math.abs(a - altoPrevio) < 40) return;
      altoPrevio = a;
      refrescarTarde();
    }).observe(document.body);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     [MANDO DE MAQUETA] — SOLO REVISIÓN INTERNA. NO PUBLICAR.
     Borrar este bloque entero, el bloque CSS marcado igual en estilos.css,
     el <div class="mando">, la galería completa y la tabla de puntuaciones
     del HTML, y la parte de densidad del script bloqueante del <head>.
     Receta en el README (o node scripts/quitar-mando.mjs).
     ═══════════════════════════════════════════════════════════════════════ */
  (function mandoMaqueta() {
    var mando = $('#mando');
    if (!mando) return;
    /* solo con ?revision: el enlace que recibe el cliente sale limpio */
    if (!/[?&]revision\b/.test(window.location.search)) return;
    mando.hidden = false;                       /* sin JS no haría nada: lo enseña el JS */
    html.classList.add('en-revision');          /* marca lo que solo sale en TusCasasRurales */
    var botones = todos('[data-densidad]', mando);

    /* galería completa filtrable: solo se construye cuando hace falta (sobria) */
    var hecha = false;
    function galeriaCompleta() {
      if (hecha) return;
      hecha = true;
      var filtros = $('#completa-filtros'), rejilla = $('#completa-rejilla');
      ['todas'].concat(Object.keys(GRUPOS)).forEach(function (k, n) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = k === 'todas' ? 'Todas' : GRUPOS[k];
        b.setAttribute('aria-pressed', n === 0 ? 'true' : 'false');
        b.addEventListener('click', function () {
          todos('button', filtros).forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
          todos('li', rejilla).forEach(function (li) { li.hidden = k !== 'todas' && li.dataset.grupo !== k; });
          setTimeout(refrescar, 60);
        });
        filtros.appendChild(b);
      });
      FOTOS.forEach(function (f) {
        var li = document.createElement('li');
        li.dataset.grupo = f.grupo;
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', 'Ampliar: ' + f.alt);
        b.appendChild(picture(f, '(max-width: 640px) 50vw, 240px', 'lazy'));
        b.addEventListener('click', function () {
          var activo = $('button[aria-pressed="true"]', filtros);
          var k = activo && activo.textContent !== 'Todas' ? Object.keys(GRUPOS).find(function (g) { return GRUPOS[g] === activo.textContent; }) : 'todas';
          if (galeria) galeria.abrir(k, f.id, b, true);
        });
        li.appendChild(b);
        rejilla.appendChild(li);
      });
    }
    function aplicar(d) {
      html.classList.remove('densidad-aspas', 'densidad-sobria');
      html.classList.add('densidad-' + d);
      botones.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-densidad') === d ? 'true' : 'false'); });
      try { localStorage.setItem('molino-densidad', d); } catch (e) {}
      if (d === 'sobria') galeriaCompleta();
      document.dispatchEvent(new CustomEvent('densidad-cambiada', { detail: d }));
      setTimeout(refrescar, 90);
    }
    var actual = densidad();
    if (actual === 'sobria') galeriaCompleta();
    botones.forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-densidad') === actual ? 'true' : 'false');
      b.addEventListener('click', function () { aplicar(b.getAttribute('data-densidad')); });
    });
  })();
  /* ═══════════ fin del bloque [MANDO DE MAQUETA] ═══════════ */
})();
