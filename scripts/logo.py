"""logo.py: el molino del logo (PNG a línea, sin vector) en dos grupos que se animan.

  python scripts/logo.py   ->  data/molino.json, assets/molino.svg, assets/favicon.svg
                               y scripts/fuentes/_logo-comparacion.png (para revisar a ojo)
  después: node scripts/construir.mjs (mete el dibujo en cada <svg data-molino>)

No hay vector original (el README lo pide). Receta de la memoria «Vectorizar logo
con línea fina» y la tubería de pluma de Cervantes (penlib):

  TORRE con la hierba: línea central del PNG (Zhang-Suen, recorrido por giro mínimo,
    media móvil para quitar los escalones y RDP). Trazo de grosor fijo, con el temblor
    de la mano del original. Lo que en el logo queda TAPADO por las aspas (la pared
    derecha entre la cornisa y la pala de abajo, y el final del tejado junto al eje)
    no existe en el PNG: se completa con dos rectas, porque al girar las aspas se ve.
  ASPAS con su eje: NO se calcan. Cuatro palas y el cubo se dibujan de frente, en su
    propio plano, y ese plano se proyecta sobre el dibujo con una afinidad ajustada por
    mínimos cuadrados a las cuatro puntas del logo. Así, al girar, las palas barren la
    elipse del molino visto de lado en vez de girar como una pegatina; en reposo (0º)
    caen sobre las del logo. El giro es del grupo interior, en coordenadas del plano:
    centro (0, 0) = el eje.
"""
import json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
sys.path.insert(0, os.path.join(RAIZ, '..', 'asesoria-cervantes-carballo-web', 'scripts'))
from penlib import adelgazar, trazos_de, rdp, a_bezier  # noqa: E402

PNG = os.path.join(RAIZ, '..', 'molino-de-viento-la-roca-sierra', 'fotos', 'web', 'logocr-736x759.png')
LIMA = '#9BCA23'
SUAVIZAR_INCLINACION = 0.5   # 1 = la elipse del logo tal cual; 0 = de frente
GROSOR = 9.0          # px del PNG: la mediana del trazo del original es 8, con picos de 12

# puntas de las cuatro palas en el PNG (punto medio del extremo de cada pala), leídas del esqueleto
PUNTAS = {'arriba-izq': (375, 61), 'arriba-der': (642, 110), 'abajo-der': (651, 505), 'abajo-izq': (428, 551)}
# las mismas, de frente: diagonales de un cuadrado (y hacia abajo, como en SVG)
FRENTE = {'arriba-izq': (-1, -1), 'arriba-der': (1, -1), 'abajo-der': (1, 1), 'abajo-izq': (-1, 1)}


def suavizar(t, r):
    if r < 1 or len(t) < 2 * r + 1:
        return t
    xs = np.array(t, float)
    cerrado = math.hypot(*(xs[0] - xs[-1])) < 3
    if cerrado:
        pad = np.vstack([xs[-r:], xs, xs[:r]])
    else:
        pad = np.vstack([np.repeat(xs[:1], r, 0), xs, np.repeat(xs[-1:], r, 0)])
    k = np.ones(2 * r + 1) / (2 * r + 1)
    out = np.column_stack([np.convolve(pad[:, i], k, 'valid') for i in (0, 1)])
    if not cerrado:
        out[0], out[-1] = xs[0], xs[-1]
    return [tuple(v) for v in out]


def d_de(pts, cerrar=False):
    pts = [tuple(p) for p in pts]
    if cerrar:
        pts = pts + [pts[0]]
    d = a_bezier(pts, dec=1)
    return d + ('Z' if cerrar else '')


def torre(m):
    esq = adelgazar(m).astype(bool)
    crudos = trazos_de(esq, podar_umbral=6, min_pts=6)
    trazos = [[(p[1], p[0]) for p in t] for t in crudos]   # (x, y)

    def caja(t):
        a = np.array(t); return a[:, 0].min(), a[:, 1].min(), a[:, 0].max(), a[:, 1].max()

    # zona del rotor en el PNG: todo lo que cae aquí son palas o el eje (se redibujan)
    def en_rotor(x, y):
        if math.hypot(x - 524, y - 307) < 48:   # el cubo y el eje
            return True
        if y < 300 and x > 470:                 # palas de arriba y el eje
            return True
        if x > 505 and y < 600:                 # pala de abajo a la derecha y cubo
            return True
        # pala de abajo a la izquierda: franja diagonal de (505,330) a (430,575)
        if 395 < x < 560 and 320 < y < 590:
            # distancia a la recta del eje de la pala
            ax, ay, bx, by = 520, 340, 428, 560
            t = ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)
            px, py = ax + t * (bx - ax), ay + t * (by - ay)
            return math.hypot(x - px, y - py) < 40 and -0.2 < t < 1.15
        return False

    piezas = []
    for t in trazos:
        x0, y0, x1, y1 = caja(t)
        if len(t) < 8 and (x1 - x0) < 12 and (y1 - y0) < 12:
            continue
        if y0 < 150:                            # la pala de arriba a la izquierda (el tejado empieza en 184)
            continue
        # la línea de la base: se corta donde sube por la pared derecha hacia la pala
        if x0 < 160 and x1 > 480 and y1 > 640:
            corte = next(i for i, (x, y) in enumerate(t) if x > 492 and y < 515)
            piezas.append(('base', t[:corte]))
            continue
        cerrado0 = math.hypot(t[0][0] - t[-1][0], t[0][1] - t[-1][1]) < 4 and (x1 - x0) < 80 and (y1 - y0) < 80
        fuera = [False] * len(t) if cerrado0 else [en_rotor(x, y) for x, y in t]   # las ventanas, enteras
        if all(fuera):
            continue
        if any(fuera):
            # quedarse con el tramo largo fuera del rotor
            tramos, act = [], []
            for p, f in zip(t, fuera):
                if f:
                    if act: tramos.append(act); act = []
                else:
                    act.append(p)
            if act: tramos.append(act)
            t = max(tramos, key=len)
            if len(t) < 15:
                continue
        piezas.append(('pieza', t))

    out = []
    for tipo, t in piezas:
        x0, y0, x1, y1 = caja(t)
        cerrado = math.hypot(t[0][0] - t[-1][0], t[0][1] - t[-1][1]) < 4 and len(t) > 30
        pequeno = (x1 - x0) < 80 and (y1 - y0) < 80
        if cerrado:
            # ventanas y puerta: casi rectángulos dibujados a mano
            s = suavizar(t[:-1], 2)
            out.append(dict(tipo='hueco', pts=rdp(s, 0.7), cerrar=True, y=y0, x=x0))
        else:
            s = suavizar(t, 1 if pequeno else 4)
            out.append(dict(tipo='hierba' if (y0 > 610 and tipo != 'base' and (x1 - x0) < 200) else ('base' if tipo == 'base' else 'linea'),
                            pts=rdp(s, 0.6), cerrar=False, y=y0, x=x0))

    # lo que tapan las aspas: la pared derecha (de donde se corta la base hasta la cornisa)
    # y el final del tejado hasta el eje
    base = next(p for p in out if p['tipo'] == 'base')
    pie = base['pts'][-1]
    cornisa = (507.0, 331.0)
    base['pts'] = list(base['pts']) + [((pie[0] * 2 + cornisa[0]) / 3 + 0.6, (pie[1] * 2 + cornisa[1]) / 3),
                                        ((pie[0] + cornisa[0] * 2) / 3 + 1.0, (pie[1] + cornisa[1] * 2) / 3), cornisa]
    tejado = max((p for p in out if p['tipo'] == 'linea'), key=lambda p: -abs(p['pts'][0][0] - 481) - abs(p['pts'][0][1] - 274))
    a = tejado['pts']
    if math.hypot(a[0][0] - 481, a[0][1] - 274) > math.hypot(a[-1][0] - 481, a[-1][1] - 274):
        a = a[::-1]
    tejado['pts'] = [(503.0, 292.0)] + list(a)

    # orden de dibujo: base, paredes y tejado, huecos de arriba abajo, hierba
    rango = {'base': 0, 'linea': 1, 'hueco': 2, 'hierba': 3}
    out.sort(key=lambda p: (rango[p['tipo']], p['y'] if p['tipo'] == 'hueco' else p['x']))
    return out


def rotor():
    C = np.mean([PUNTAS[k] for k in PUNTAS], axis=0)
    U = np.array([np.array(FRENTE[k]) / math.sqrt(2) for k in PUNTAS])        # 4×2
    T = np.array([np.array(PUNTAS[k]) - C for k in PUNTAS])                  # 4×2
    Mt, *_ = np.linalg.lstsq(U, T, rcond=None)                               # T ≈ U·Mt
    M = Mt.T                                                                 # columna = imagen de cada eje
    # el logo es casi un molino de lado (elipse 1,8:1): girando así, las palas se estiran y encogen
    # demasiado. Se suaviza la inclinación del plano (valores singulares hacia su media geométrica)
    # sin tocar su orientación; en reposo las palas siguen cayendo cerca de las del logo.
    U_, S_, Vt_ = np.linalg.svd(M)
    g = float(np.sqrt(S_[0] * S_[1]))
    M = U_ @ np.diag(g * (S_ / g) ** SUAVIZAR_INCLINACION) @ Vt_
    R = float(np.sqrt(abs(np.linalg.det(M))))                                # radio medio de las puntas
    Mn = M / R                                                               # el plano se dibuja en px «medios»
    res = [float(np.linalg.norm(U[i] @ Mt - T[i])) for i in range(4)]
    # pala de frente, apuntando a +x: estrecha junto al cubo, ancha en la punta (como en el logo)
    pala = [(0.085, -0.03), (0.26, -0.065), (1.04, -0.17), (1.04, 0.155), (0.26, 0.06), (0.085, 0.028)]
    palas = []
    for k in PUNTAS:
        ang = math.atan2(FRENTE[k][1], FRENTE[k][0])
        c, s = math.cos(ang), math.sin(ang)
        pts = [(R * (x * c - y * s), R * (x * s + y * c)) for x, y in pala]
        palas.append('M' + 'L'.join('%.1f %.1f' % p for p in pts) + 'Z')
    cubo = 0.085 * R
    return dict(centro=[round(float(C[0]), 2), round(float(C[1]), 2)], R=round(R, 2),
                matriz=[round(float(v), 5) for v in (Mn[0, 0], Mn[1, 0], Mn[0, 1], Mn[1, 1])],
                palas=palas, cubo=round(cubo, 1), residuos_px=[round(r, 1) for r in res])


def barrido(rot):
    """Caja de la elipse que barren las puntas al girar (en coordenadas del dibujo)."""
    a, b, c, d = rot['matriz']; cx, cy = rot['centro']; R = rot['R'] * 1.02
    pts = []
    for i in range(360):
        t = math.radians(i)
        for rr in (R, ):
            # punta de pala (y el canto ancho: 0,15 R a un lado)
            for off in (-0.15, 0.15):
                x, y = rr * math.cos(t) - off * rr * math.sin(t), rr * math.sin(t) + off * rr * math.cos(t)
                pts.append((cx + a * x + c * y, cy + b * x + d * y))
    p = np.array(pts)
    return p[:, 0].min(), p[:, 1].min(), p[:, 0].max(), p[:, 1].max()


def main():
    im = Image.open(PNG)
    m = np.asarray(im)[..., 3] > 110
    piezas = torre(m)
    rot = rotor()
    ys, xs = np.where(m)
    bx0, by0, bx1, by1 = barrido(rot)
    x0 = math.floor(min(xs.min(), bx0) - GROSOR); y0 = math.floor(min(ys.min(), by0) - GROSOR)
    x1 = math.ceil(max(xs.max(), bx1) + GROSOR); y1 = math.ceil(max(ys.max(), by1) + GROSOR)
    caja = [x0, y0, x1 - x0, y1 - y0]
    datos = dict(
        nota='Generado por scripts/logo.py desde logocr-736x759.png (no hay vector original). Coordenadas del PNG.',
        viewBox=caja, grosor=GROSOR,
        torre=[dict(tipo=p['tipo'], d=d_de(p['pts'], p['cerrar'])) for p in piezas],
        rotor=rot)
    json.dump(datos, open(os.path.join(RAIZ, 'data', 'molino.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    print('torre: %d trazos · rotor: centro %s, R %.0f, residuos %s px · viewBox %s' % (len(piezas), rot['centro'], rot['R'], rot['residuos_px'], caja))

    # SVG suelto (para el README, la og y el favicon): todo en lima, palas en reposo
    a, b, c, d = rot['matriz']; cx, cy = rot['centro']
    mat = 'matrix(%s %s %s %s %s %s)' % (a, b, c, d, cx, cy)
    torre_svg = ''.join('<path d="%s"/>' % p['d'] for p in datos['torre'])
    palas_svg = ''.join('<path d="%s"/>' % p for p in rot['palas']) + '<circle r="%s"/>' % rot['cubo']
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="%d %d %d %d">'
           '<g fill="none" stroke="%s" stroke-width="%s" stroke-linecap="round" stroke-linejoin="round">'
           '<mask id="m" maskUnits="userSpaceOnUse" x="%d" y="%d" width="%d" height="%d"><rect x="%d" y="%d" width="%d" height="%d" fill="#fff"/>'
           '<g transform="%s" fill="#000" stroke="#000">%s</g></mask>'
           '<g mask="url(#m)">%s</g><g transform="%s">%s</g></g></svg>') % (
        *caja, LIMA, GROSOR, *caja, *caja, mat, palas_svg, torre_svg, mat, palas_svg)
    open(os.path.join(RAIZ, 'assets', 'molino.svg'), 'w', encoding='utf-8').write(svg)
    fav = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="%d %d %d %d">'
           '<rect x="%d" y="%d" width="%d" height="%d" rx="%d" fill="#1F2A1E"/>'
           '<g fill="none" stroke="%s" stroke-width="%s" stroke-linecap="round" stroke-linejoin="round">'
           '<mask id="m" maskUnits="userSpaceOnUse" x="%d" y="%d" width="%d" height="%d"><rect x="%d" y="%d" width="%d" height="%d" fill="#fff"/>'
           '<g transform="%s" fill="#000" stroke="#000">%s</g></mask>'
           '<g mask="url(#m)">%s</g><g transform="%s" fill="#1F2A1E">%s</g></g></svg>') % (
        *caja, *caja, caja[2] // 6, LIMA, GROSOR * 2.6, *caja, *caja, mat, palas_svg, torre_svg, mat, palas_svg)
    open(os.path.join(RAIZ, 'assets', 'favicon.svg'), 'w', encoding='utf-8').write(fav)
    import xml.etree.ElementTree as ET
    ET.parse(os.path.join(RAIZ, 'assets', 'molino.svg')); ET.parse(os.path.join(RAIZ, 'assets', 'favicon.svg'))

    # comparación: el PNG en gris debajo y el vector encima, a ×2
    E = 2
    fondo = Image.fromarray((255 - m * 70).astype(np.uint8)).convert('RGB').resize((im.width * E, im.height * E))
    dib = ImageDraw.Draw(fondo)
    from svgpathtools import parse_path  # noqa
    for p in datos['torre']:
        tr = parse_path(p['d'])
        pts = [tr.point(t / 200) for t in range(201)]
        dib.line([(z.real * E, z.imag * E) for z in pts], fill=(200, 30, 30), width=3)
    for pd in rot['palas']:
        tr = parse_path(pd)
        pts = [tr.point(t / 80) for t in range(81)]
        dib.line([((cx + a * z.real + c * z.imag) * E, (cy + b * z.real + d * z.imag) * E) for z in pts], fill=(30, 30, 220), width=3)
    fondo.save(os.path.join(AQUI, 'fuentes', '_logo-comparacion.png'))


if __name__ == '__main__':
    main()
