# Hoja de contactos de todas las fotos de origen, con el nombre debajo.
#   python scripts/hoja.py  ->  scripts/fuentes/_hoja.jpg (y _hoja-web.jpg)
import glob, os
from PIL import Image, ImageDraw, ImageFont

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGEN = os.path.join(os.path.dirname(RAIZ), 'molino-de-viento-la-roca-sierra', 'fotos')
SALIDA = os.path.join(RAIZ, 'scripts', 'fuentes')
os.makedirs(SALIDA, exist_ok=True)

def hoja(archivos, nombre, cols=6, ancho=300):
    alto = int(ancho * 0.67)
    pie = 22
    filas = (len(archivos) + cols - 1) // cols
    lienzo = Image.new('RGB', (cols * (ancho + 8) + 8, filas * (alto + pie + 8) + 8), (30, 30, 30))
    d = ImageDraw.Draw(lienzo)
    try:
        letra = ImageFont.truetype('arial.ttf', 14)
    except OSError:
        letra = ImageFont.load_default()
    for i, f in enumerate(archivos):
        im = Image.open(f).convert('RGB')
        im.thumbnail((ancho, alto))
        x = 8 + (i % cols) * (ancho + 8)
        y = 8 + (i // cols) * (alto + pie + 8)
        lienzo.paste(im, (x, y))
        etiqueta = os.path.splitext(os.path.basename(f))[0] + '  ' + 'x'.join(map(str, Image.open(f).size))
        d.text((x + 2, y + alto + 3), etiqueta, fill=(235, 235, 235), font=letra)
    lienzo.save(os.path.join(SALIDA, nombre), quality=85)
    print(nombre, len(archivos))

orden = lambda f: (len(f), f)
tcr = sorted(glob.glob(os.path.join(ORIGEN, 'tuscasasrurales', '*.jpg')), key=orden)
web = sorted([f for f in glob.glob(os.path.join(ORIGEN, 'web', '*.jpg'))], key=orden)
hoja(tcr, '_hoja.jpg')
hoja(web, '_hoja-web.jpg', cols=7, ancho=260)
