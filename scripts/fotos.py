"""Fotos de A.R. Molino de Viento: verticales de interior corregidas + color común.

Entrada: molino-de-viento-la-roca-sierra/fotos/ (originales; no se tocan)
  tuscasasrurales/xl_11202*.jpg  1200 px, las mejores
  web/fondo-2000x1339.jpg        la escalinata a 2000 px (se reduce a 1200)
  web/p*.jpg, 3-460x308.jpg      las que solo están en su web (600 y 460 px)
Salida: scripts/fuentes/masters/<id>.jpg (máster, q 93, NUNCA más de 1200 px de ancho)
        scripts/fuentes/hoja-antes-despues.jpg (para revisar a ojo)
        data/fotos.json (id, origen, grupo, panel, alt; fotos.mjs añade w, h y anchos)
Después: node scripts/fotos.mjs

Fuera a propósito: xl_11202_10 y 5-460x308 (tele de tubo), xl_11202_12 (es la
misma que fondo-2000x1339, peor), p24 (huerta labrada: el huerto no está
confirmado) y las copias repetidas de 1063 y 460 px.

1 · VERTICALES solo en las de interior (salón, cocina, dormitorios y el porche
    por dentro). Receta de la memoria «Enderezar verticales» (verticales.py).
2 · COLOR: las fotos son de varios años y cámaras. Parche blanco suave (solo si
    hay neutros de verdad), brillo medio común, curva en S suave, el azul del
    cielo contenido (la cámara vieja lo satura), sombras hacia la encina de la
    paleta y luces un pelo cálidas: todas tiene que parecer de la misma tarde.

  python scripts/fotos.py               (todas)
  python scripts/fotos.py salon cocina  (algunas, para probar)
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
sys.path.insert(0, AQUI)
from verticales import corregir_verticales  # noqa: E402

ORIGEN = os.path.normpath(os.path.join(RAIZ, '..', 'molino-de-viento-la-roca-sierra', 'fotos'))
DESTINO = os.path.join(AQUI, 'fuentes', 'masters')
os.makedirs(DESTINO, exist_ok=True)

CAL = np.array([244, 241, 234]) / 255.0
ENCINA = np.array([31, 42, 30]) / 255.0
MAX_ANCHO = 1200

T = 'tuscasasrurales/'
W = 'web/'
# id, archivo, grupo (galería completa: casa / finca / primavera), panel de «Ocho arcos» o None, ¿verticales?, alt
FOTOS = [
    ('dehesa-casa',   T + 'xl_11202_6.jpg',  'finca', None, False, 'La casa de piedra en la dehesa, con la luz baja de la tarde'),
    ('fachada',       T + 'xl_11202.jpg',    'casa', 'porche', False, 'La casa de piedra con su porche de arcos, entre rocas de granito'),
    ('porche',        T + 'xl_11202_1.jpg',  'casa', 'porche', True, 'El porche por dentro: columnas de granito, arcos de ladrillo y barandilla de celosía'),
    ('porche-arcos',  T + 'xl_11202_7.jpg',  'casa', 'porche', True, 'La dehesa vista desde el porche, entre dos arcos'),
    ('porche-mesa',   W + '3-460x308.jpg',   'casa', 'porche', False, 'El porche con la mesa puesta'),
    ('atardecer',     W + 'p20-600x402.jpg', 'casa', 'porche', False, 'El porche al atardecer'),
    ('salon',         T + 'xl_11202_2.jpg',  'casa', 'salon', True, 'Salón comedor con chimenea, techo de vigas y un arco de ladrillo'),
    ('cocina',        T + 'xl_11202_5.jpg',  'casa', 'cocina', True, 'Cocina comedor bajo un arco de ladrillo, con la mesa puesta'),
    ('dormitorio',    T + 'xl_11202_3.jpg',  'casa', 'dormitorios', True, 'Dormitorio de matrimonio con cama de forja'),
    ('dormitorio-2',  T + 'xl_11202_4.jpg',  'casa', 'dormitorios', True, 'Dormitorio con dos camas de forja'),
    ('barbacoa',      T + 'xl_11202_8.jpg',  'casa', 'barbacoa', False, 'La barbacoa de piedra bajo una encina, con su mesa'),
    ('escalinata',    W + 'fondo-2000x1339.jpg', 'casa', 'escalinata', False, 'Escalinata de piedra entre las rocas, subiendo hasta la casa'),
    ('portada',       T + 'xl_11202_11.jpg', 'casa', 'portada', False, 'Portada de piedra con arco y verja; en el muro, la placa de alojamiento turístico'),
    ('camino',        W + 'p17-600x402.jpg', 'finca', 'portada', False, 'El camino de tierra hacia la casa'),
    ('charca',        T + 'xl_11202_17.jpg', 'finca', 'charca', False, 'La charca de la finca, rodeada de encinas'),
    ('charca-flores', T + 'xl_11202_18.jpg', 'primavera', 'charca', False, 'La charca con flores moradas en primer plano'),
    ('charca-jaras',  W + 'p16-600x402.jpg', 'finca', 'charca', False, 'La charca vista entre la vegetación'),
    ('chozo',         T + 'xl_11202_13.jpg', 'finca', None, False, 'Chozo redondo de piedra con techo de paja'),
    ('granito',       T + 'xl_11202_15.jpg', 'finca', None, False, 'Dehesa de encinas con bolos de granito'),
    ('dehesa-lejos',  T + 'xl_11202_16.jpg', 'finca', None, False, 'La dehesa con la casa a lo lejos'),
    ('rocas',         T + 'xl_11202_19.jpg', 'finca', None, False, 'Rocas de granito sobre la pradera'),
    ('ovejas',        T + 'xl_11202_14.jpg', 'finca', None, False, 'Ovejas sobre las rocas, a la sombra de una encina'),
    ('apero',         T + 'xl_11202_9.jpg',  'finca', None, False, 'Un apero antiguo sobre la roca'),
    ('encinas',       W + 'p13-600x402.jpg', 'finca', None, False, 'Encinas sobre la pradera verde'),
    ('pilas',         W + 'p14-600x402.jpg', 'finca', None, False, 'Pilas naturales en el granito, con agua de lluvia'),
    ('senda',         W + 'p21-600x402.jpg', 'finca', None, False, 'Senda entre muros de piedra'),
    ('primavera',     T + 'xl_11202_20.jpg', 'primavera', None, False, 'Encinas en primavera, con la hierba alta'),
    ('pradera',       T + 'xl_11202_21.jpg', 'primavera', None, False, 'Pradera con flores amarillas y lirios morados'),
    ('margarita',     W + 'p12-600x402.jpg', 'primavera', None, False, 'Una margarita amarilla en la pradera'),
    ('lirios',        W + 'p22-600x402.jpg', 'primavera', None, False, 'Lirios junto a una roca de granito'),
]


def a_lineal(c): return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def a_srgb(c): return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(np.clip(c, 0, None), 1 / 2.4) - 0.055)
def luma(x): return 0.299 * x[..., 0] + 0.587 * x[..., 1] + 0.114 * x[..., 2]


def gradar(x):
    """x: float 0..1 RGB."""
    lin = a_lineal(x)
    lum = 0.2126 * lin[..., 0] + 0.7152 * lin[..., 1] + 0.0722 * lin[..., 2]
    mx, mn = x.max(-1), x.min(-1)
    sat = (mx - mn) / np.maximum(mx, 1e-6)
    # 1 · parche blanco suave: solo si hay neutros claros (paredes, sábanas, nubes)
    p80, p995 = np.percentile(lum, 80), np.percentile(lum, 99.5)
    neutros = (lum > p80) & (lum < p995) & (sat < 0.16)
    cuota = neutros.mean()
    if cuota > 0.01:
        medio = lin[neutros].mean(0)
        objetivo = a_lineal(CAL) * (medio.mean() / a_lineal(CAL).mean())
        ganancia = objetivo / np.maximum(medio, 1e-4)
        fuerza = float(np.clip(cuota / 0.06, 0.2, 0.6))
        lin = lin * np.clip(1 + (ganancia - 1) * fuerza, 0.9, 1.12)
    x = np.clip(a_srgb(np.clip(lin, 0, 1)), 0, 1)
    # 2 · brillo medio común
    g = np.clip(np.log(0.5) / np.log(max(float(np.median(luma(x))), 1e-3)), 0.88, 1.12)
    x = np.power(x, g)
    # 3 · curva en S suave
    L = luma(x)
    s = L + 0.07 * np.sin(np.pi * (L - 0.5)) * (1 - np.abs(2 * L - 1)) * 1.6
    x = x * (np.clip(s, 0, 1) / np.maximum(L, 1e-4))[..., None]
    x = np.clip(x, 0, 1)
    # 4 · el azul del cielo contenido: la cámara vieja lo pone eléctrico
    r, gg, b = x[..., 0], x[..., 1], x[..., 2]
    azul = np.clip((b - np.maximum(r, gg)) / 0.35, 0, 1)
    L = luma(x)[..., None]
    x = L + (x - L) * (1 - 0.28 * azul[..., None])
    # 5 · sombras hacia la encina y luces un pelo cálidas
    L = np.clip(luma(x), 0, 1)
    sombra = np.clip(1 - L / 0.4, 0, 1) ** 1.6
    x = x * (1 - sombra[..., None] * 0.35) + ENCINA * sombra[..., None] * 0.35
    luz = np.clip((L - 0.55) / 0.45, 0, 1)[..., None]
    x = x * (1 + luz * np.array([0.025, 0.008, -0.03]))
    # 6 · saturación algo contenida, más en lo muy vivo
    L = luma(x)[..., None]
    mx, mn = x.max(-1, keepdims=True), x.min(-1, keepdims=True)
    sat = (mx - mn) / np.maximum(mx, 1e-6)
    x = L + (x - L) * (0.95 - 0.12 * np.clip((sat - 0.5) / 0.4, 0, 1))
    return np.clip(x, 0, 1)


def procesar(f):
    fid, archivo, grupo, panel, vert, alt = f
    im = Image.open(os.path.join(ORIGEN, archivo)).convert('RGB')
    if im.width > MAX_ANCHO:
        im = im.resize((MAX_ANCHO, round(im.height * MAX_ANCHO / im.width)), Image.LANCZOS)
    rgb = np.asarray(im)
    info = None
    if vert:
        rgb, info = corregir_verticales(rgb, fid)
    x = gradar(rgb.astype(np.float64) / 255.0)
    out = Image.fromarray((x * 255 + 0.5).astype(np.uint8))
    out.save(os.path.join(DESTINO, fid + '.jpg'), quality=93, subsampling=0)
    return dict(id=fid, origen=archivo, w=out.width, h=out.height, verticales=info)


def hoja(ids):
    letra = ImageFont.truetype('arial.ttf', 15)
    por = {f[0]: f for f in FOTOS}
    filas = []
    for i in ids:
        a = Image.open(os.path.join(ORIGEN, por[i][1])).convert('RGB')
        b = Image.open(os.path.join(DESTINO, i + '.jpg'))
        h = 260
        a = a.resize((round(a.width * h / a.height), h)); b = b.resize((round(b.width * h / b.height), h))
        c = Image.new('RGB', (a.width + b.width + 16, h + 22), 'white')
        c.paste(a, (0, 22)); c.paste(b, (a.width + 16, 22))
        ImageDraw.Draw(c).text((4, 3), i + '  (antes · después)', fill='black', font=letra)
        filas.append(c)
    por_fila = 2
    W_ = max(sum(f.width + 16 for f in filas[k:k + por_fila]) for k in range(0, len(filas), por_fila))
    H_ = sum(max(f.height for f in filas[k:k + por_fila]) + 12 for k in range(0, len(filas), por_fila))
    lienzo = Image.new('RGB', (W_, H_), (225, 225, 225))
    y = 0
    for k in range(0, len(filas), por_fila):
        x = 0
        for f in filas[k:k + por_fila]:
            lienzo.paste(f, (x, y)); x += f.width + 16
        y += max(f.height for f in filas[k:k + por_fila]) + 12
    ruta = os.path.join(AQUI, 'fuentes', 'hoja-antes-despues.jpg')
    lienzo.save(ruta, quality=82)
    return ruta


if __name__ == '__main__':
    pedidas = sys.argv[1:]
    lista = [f for f in FOTOS if not pedidas or f[0] in pedidas]
    informe = [procesar(f) for f in lista]
    for r in informe:
        print(r['id'], r['w'], 'x', r['h'], r['verticales'] or '')
    # data/fotos.json: conserva w/h/anchos que ya hubiera puesto fotos.mjs
    ruta = os.path.join(RAIZ, 'data', 'fotos.json')
    previo = {}
    if os.path.exists(ruta):
        previo = {f['id']: f for f in json.load(open(ruta, encoding='utf-8'))['fotos']}
    datos = []
    for fid, archivo, grupo, panel, vert, alt in FOTOS:
        d = dict(id=fid, origen=archivo, grupo=grupo, panel=panel, alt=alt)
        for k in ('w', 'h', 'anchos'):
            if k in previo.get(fid, {}): d[k] = previo[fid][k]
        datos.append(d)
    json.dump({'fotos': datos}, open(ruta, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    print('hoja:', hoja([r['id'] for r in informe]))
