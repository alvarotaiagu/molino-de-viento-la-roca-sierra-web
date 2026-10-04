# A.R. Molino de Viento · web «Aspas»

Web de **A.R. Molino de Viento**, C. Vasco Núñez de Balboa 2, 06190 La Roca de la Sierra (Badajoz). Registro turístico **AT-BA-00023**.

Es una **maqueta en local, sin publicar**, con `noindex` en todas las páginas. Lleva un mando de revisión (`?revision`) que **no puede llegar al cliente**: ver «Entrega».

> **Es un alojamiento rural, no una casa rural.** Su registro empieza por AT. En Extremadura, «casa rural» es una categoría regulada que este alojamiento no tiene, aunque Google y su web vieja la usen. En toda la web se dice «alojamiento rural», «la casa» o «A.R. Molino de Viento». `verificar.mjs` revisa que «casa rural» no aparezca en el texto, el `<title>`, el JSON-LD, los `alt` ni `data/fotos.json`.

## El concepto: «Aspas»

El logo es un molino dibujado a línea, en verde lima. **El viento que mueve sus aspas es el hilo de toda la página**:

- **Cortina «Arranca el molino»** (unos 3,4 s, encadenada).
  1. Sobre la capa oscura, el molino se traza en lima: primero la torre y luego las aspas.
  2. Las aspas arrancan y aceleran.
  3. Una ráfaga de líneas cruza en diagonal y la capa se retira detrás de ella con `expo.inOut`.

  El molino de la cortina es un clon del del hero. Cae sobre él a 0 px, medido con piezas internas del dibujo en escritorio, iPhone 13 y Pixel 5.
- **Las aspas tienen un solo motor para todos los molinos** (cabecera, hero, la tarjeta del molino y el pie).
  - En reposo giran despacio.
  - Aceleran con la velocidad del scroll de Lenis.
  - Al parar frenan poco a poco: la inercia es asimétrica, rápida al subir (0,35 s) y lenta al bajar (1,9 s).

  El rotor gira con GSAP sobre (0, 0) de su plano, con `svgOrigin`, y ninguna regla CSS le pone `transform`.
- **Ráfagas** de líneas finas entre secciones. Usan trazos con `pathLength=1` y solo se animan cuando están en pantalla.
- **Ocho arcos.** El porche tiene ocho arcos de ladrillo. Por eso la galería se enmarca en ocho arcos que se trazan en teja, y el módulo del sol cruza esos mismos ocho arcos.

Con **movimiento reducido** todo queda quieto, pero el contenido sigue ahí: las cifras, el sol en el poniente, las galerías y el formulario. **Sin GSAP** (CDN caído) la página se ve entera y la cortina se retira.

### Paleta (contrastes medidos)

| Pareja | Contraste |
|---|---|
| encina `#1F2A1E` sobre cal `#F4F1EA` | 13,2 |
| lima-texto `#4A6610` sobre cal | 5,8 |
| teja `#A8492A` sobre cal | 5,1 |
| teja sobre piedra `#E9E4D8` (números de los arcos) | 4,5 |
| granito `#5E5A53` sobre cal | 6,1 |
| claro-apagado `#C6CDBF` sobre encina | 9,2 |
| encina sobre lima `#9BCA23` (botón principal) | 7,7 |
| lima sobre encina (líneas, el molino) | 7,7 |
| **lima sobre cal** | **1,7 → nunca como texto** |

El lima solo aparece en líneas sobre fondo oscuro y en el botón principal. Las fuentes son Young Serif (titulares) y Figtree (texto), que no usa ninguna web hermana de alojamiento.

## Secciones

1. **Hero** (fondo oscuro).
   - El molino grande, con las aspas girando, delante de la foto de la casa en la dehesa.
   - La foto va en un marco de arco de medio punto y nunca pasa de 1200 px.
   - Tres datos: 4 dormitorios, 8 personas y 8 ha.
   - Botones: «Consultar fechas» (con imán) y «Llamar».
2. **La casa.** 150 m² de piedra, con char-reveal. Cifras que cuentan: 150 m², 4, 2 y 8. La foto del porche se destapa con un `clip-path` en arco (se anima un número).
3. **Ocho arcos.** Galería anclada en horizontal (pin + scrub) con ocho `<button>`, cada uno con un arco de ladrillo SVG que se traza al entrar. Cada botón abre un `<dialog>` con sus fotos. En móvil y en la sobria no se ancla: es un carril con `overflow-x:auto` y snap.
4. **Del saliente al poniente** (módulo `sol`). El porche visto desde dentro: el sol cruza los arcos con el scroll y el cielo pasa del amanecer al atardecer. Termina en la foto `p20` y en su frase.
5. **La finca, Huerta la Holguerina.** Pila sticky de siete tarjetas (encinas y granito, charca, chozo, pilas, primavera, fauna y el molino). Sigue la receta del checklist: alto medido por JS y el mismo margen en todas.
6. **Lo que hay.** El inventario de su web. La calefacción, la tele y los juegos solo salen en TusCasasRurales; el mando los marca con «solo TCR».
7. **Alrededores** (módulo `alrededores`).
   - El pueblo, los planes de su web y los dólmenes «según la comarca».
   - Una rosa de los vientos con Badajoz, Mérida, Cáceres y Montijo, a la distancia medida.
8. **Opiniones.**
   - Google: 4,5 ★ con 20 reseñas.
   - TusCasasRurales: «10 · Excepcional», **sin decir cuántas opiniones**.
   - Una cinta de citas cuya velocidad depende del scroll.
9. **Tarifas y condiciones.**
   - El precio sale de `data/config.json`.
   - Las normas del PDF, contadas con tacto.
   - Enlace al PDF (`assets/condiciones-de-uso.pdf`).
10. **Consultar fechas.**
    - Un formulario sin servidor que compone el mensaje: comprueba que haya dos noches como mínimo y avisa si sois más de 8.
    - Se envía por llamada, SMS, correo o copiándolo. WhatsApp sale apagado mientras `config` lo tenga a `null`.
    - Botón al paseo virtual de Google y enlace a la ficha de TusCasasRurales.
11. **Cómo llegar.** Las dos rutas de su web, los teléfonos y el mapa de Google, que solo se carga al hacer clic.
12. **Pie.** El registro AT-BA-00023, los textos legales, el aviso de cookies y las aspas pequeñas girando. No lleva el Facebook de su web.

También hay `aviso-legal.html`, `privacidad.html` y `404.html` («El viento se ha llevado esta página»).

## Datos

| Archivo | Qué guarda |
|---|---|
| `data/config.json` | Teléfonos, correo, WhatsApp (`null`) y **precio**. Con `"precio": null` la tarifa desaparece de la web (lo comprueba `verificar.mjs`). `main.js` lleva una copia por si se abre con doble clic. |
| `data/fotos.json` | Id, origen, grupo (casa / finca / primavera), arco al que pertenece y `alt` de cada foto. Lo escriben `fotos.py` y `fotos.mjs`. |
| `data/molino.json` | El dibujo del molino. Lo escribe `logo.py`. |
| `ref/distancias.json` | Distancias medidas con OSRM sobre OpenStreetMap el 2026-10-04, desde el nodo OSM 4702404137 (39.1101425, -6.6737914). |

Distancias medidas:

| Destino | Distancia | Tiempo |
|---|---|---|
| Badajoz | 41 km | 43 min |
| Mérida | 50 km | 57 min |
| Cáceres | 54 km | 52 min |
| Montijo | 26 km | 32 min |

Las de su web (40 / 53 / 52) y las de TusCasasRurales (38 / 48) no casan entre sí; no se usan. «A 700 m del pueblo» es suyo y se usa tal cual: el centro del pueblo queda a 1,5 km por carretera.

## El logo

No hay vector original. **Hay que pedírselo al dueño.** Mientras tanto, `scripts/logo.py` lo saca del PNG:

- **La torre con la hierba** es la línea central del PNG: esqueleto con la tubería de Cervantes, media móvil y trazo de grosor fijo. Lo que en el logo tapan las aspas (la pared derecha y el final del tejado) no existe en el PNG y se completa con rectas, porque al girar se ve.
- **Las aspas con su eje** se dibujan de frente, en su plano, y ese plano se proyecta sobre el dibujo con una afinidad ajustada a las cuatro puntas del logo.
  - Así, al girar, barren la elipse de un molino visto de lado.
  - La inclinación del logo (1,8:1) se ha suavizado (`SUAVIZAR_INCLINACION = 0.5`) porque las palas se estiraban demasiado al girar. En reposo caen cerca de las del logo, no encima.

`assets/molino.svg` es el molino suelto. `scripts/fuentes/_logo-comparacion.png` lo superpone al original.

## Fotos

Son solo las suyas: 22 de TusCasasRurales a 1200 px y, de su web, las que solo están allí. La hoja de contactos está en `scripts/fuentes/_hoja.jpg` y `_hoja-web.jpg`.

- **Fuera:**
  - `xl_11202_10` y `5-460x308`, por la tele de tubo.
  - `xl_11202_12`, porque es la misma foto que `fondo-2000x1339`, que se usa reducida a 1200 px.
  - `p24`, la huerta labrada: el huerto no está confirmado.
  - Las copias repetidas.
- **`scripts/fotos.py`:**
  - Corrige las verticales de las fotos de interior (receta de la Judería). Solo el salón tenía caída (−1,2°); el resto estaba a plomo o sin verticales fiables, y no se ha tocado.
  - Da un color común, porque las fotos son de varios años: parche blanco suave, brillo medio, curva en S, azul del cielo contenido, sombras hacia la encina y luces cálidas.
  - Revisión a ojo en `scripts/fuentes/hoja-antes-despues.jpg`.
- **Nada se amplía por encima del original.** `fotos.mjs` saca 480, 960 y 1200 px; las de 600 y 460 px se quedan en su tamaño, también dentro del `<dialog>`.

## Orden de trabajo

```
python scripts/logo.py        # si cambia el logo
python scripts/fotos.py       # si cambian las fotos (después: node scripts/fotos.mjs)
node scripts/construir.mjs    # rellena <picture data-foto> y <svg data-molino>
node scripts/versionar.mjs    # ?v= en CSS y JS (caché de Pages)
node scripts/verificar.mjs --capturas
node scripts/servir.mjs       # http://127.0.0.1:4271
```

`verificar.mjs` levanta sus propios servidores, en los puertos 4281 a 4284.

## Módulos que se pueden quitar

| Módulo | Comando | Qué quita |
|---|---|---|
| Del saliente al poniente | `node scripts/quitar-sol.mjs <copia>` | La sección, `css/sol.css` y `js/sol.js` |
| Alrededores | `node scripts/quitar-alrededores.mjs <copia>` | La sección, el enlace del menú, `css/alrededores.css` y `js/alrededores.js` |

Con `--aqui`, el script trabaja sobre esta misma carpeta, sin vuelta atrás. `verificar.mjs` prueba los dos sobre copias.

## Entrega: quitar el mando de maqueta

El mando (abajo a la izquierda, solo con `?revision`) cambia entre dos densidades:

- **«Aspas»** (la versión cargada): ráfagas entre secciones, ocho arcos anclados, el sol, aspas ligadas al scroll en todos los molinos y la cinta de citas.
- **«Sobria»:**
  - Las aspas solo giran en la cortina y en el hero.
  - Filetes rectos en lugar de ráfagas.
  - Arcos sin anclar, sin el módulo del sol y citas en una rejilla quieta.
  - A cambio, **añade** la galería completa filtrable (casa / finca / primavera) y la tabla de puntuaciones de TusCasasRurales.

El mando también avisa de las plazas y del precio por confirmar, lista las 10 dudas de la ficha y marca lo que solo sale en TusCasasRurales.

**Caso A: se entrega «Aspas».**
```
node scripts/quitar-mando.mjs ../molino-entrega
node scripts/comprobar-borrado.mjs ../molino-entrega   # tiene que decir «Sin rastros»
```

**Caso B: el dueño elige la sobria.**
1. Antes de quitar el mando, cambiar en `index.html` la clase inicial `densidad-aspas` por `densidad-sobria`.
2. Sacar del bloque `[MANDO DE MAQUETA]` de `estilos.css` las reglas `.densidad-sobria …` que se quieran conservar.
3. Ejecutar el caso A.

## Pendientes para el dueño

1. **Plazas:** ¿8 (TusCasasRurales, cuadra con 4 dobles) u 8-10 (su web)? Ahora dice 8.
2. **Animales:** TusCasasRurales dice que se admiten y su PDF dice que no. La web no dice nada (`verificar.mjs` lo vigila).
3. **Dirección:** ¿«C. Vasco Núñez de Balboa, 2» (Google) o «c/ Prolongación Vasco Núñez, 2» (su web)? Se usa la de Google.
4. **Distancias:** aquí van las medidas; confirmar que el acceso en coche es el de OpenStreetMap.
5. **Precio:** ¿sigue vigente 33 € por persona y noche, igual todo el año? Si no, cambiar o poner `null` en `data/config.json`.
6. **El molino:** ¿la torre de piedra de la foto de la fachada es el molino? ¿Se puede visitar o subir? La web no lo promete. ¿Hay foto suya?
7. **Pastelería «La Era»:** ¿tienen relación? La web no la menciona. Una cita de TusCasasRurales habla de «sus pasteles»; se ha recortado con […].
8. **Facebook:** el de su web parece personal y no se ha usado. ¿Hay uno del alojamiento?
9. **Solo en TusCasasRurales:** huerto ecológico, juegos de mesa, televisión, calefacción y aparcamiento. Huerto y aparcamiento no salen en la web; los otros salen marcados en el mando.
10. **Fotos actuales:** las que hay son de hace años (en una se ve una tele de tubo). Faltan fotos de los baños y del molino.
11. **Logo:** pedir el vector original.
12. **WhatsApp:** ¿tienen? Ahora está apagado (`"whatsapp": null`).
13. **Aviso legal:** faltan el titular y el NIF.
14. **Opiniones:** permiso para citar las de TusCasasRurales y Google (textuales y firmadas sin nombre). La de Google que dice «casa rural» no se usa.
15. **Nombres:** la web no nombra a nadie (en TusCasasRurales sale el propietario). ¿Quieren que salga?

## Decisiones tomadas

- No se promete nada de lo que no consta: piscina, wifi, desayuno (aunque Google la llame Bed & Breakfast), pesca, visitar o subir al molino, ni que la torre de las fotos sea el molino.
- El molino siempre lleva la reserva «se cree que del siglo XV». Su frase va entre comillas, como texto suyo.
- Las normas del PDF se cuentan sin el tono de reglamento. El PDF entero está enlazado.
- La ubicación es la del nodo de OpenStreetMap. Las coordenadas del panorama solo sirvieron de pista, y coinciden.
