from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

here = Path(__file__).resolve().parent
out = here.parent
font = TTFont(here / "SchibstedGrotesk-800.ttf")
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()
upm = font["head"].unitsPerEm
cap = font["OS/2"].sCapHeight
hmtx = font["hmtx"]

LEFT = "M12.5 6H23.5Q20.6 21 16.4 33H12.8Q12 20 12.5 6Z"
RIGHT = "M26.5 13H37.5Q34.6 28 30.4 40H26.8Q26 27 26.5 13Z"
INK = {"light": ("#0f0e0d", "#a3271e"), "dark": ("#f7f6f4", "#ffac2e")}


def word_path(text: str, size: float) -> tuple[str, float]:
    pen = SVGPathPen(glyphs)
    scale = size / upm
    x = 0.0
    for ch in text:
        name = cmap[ord(ch)]
        glyphs[name].draw(TransformPen(pen, (scale, 0, 0, -scale, x, 0)))
        x += hmtx[name][0] * scale
    return pen.getCommands(), x


def wordmark(theme: str) -> str:
    fg, acc = INK[theme]
    size = 100
    d, width = word_path("duppel", size)
    cap_px = cap * size / upm
    s = cap_px * 0.64 / 27
    gap = cap_px * 0.2
    tx = width + gap - 12 * s
    ty = -cap_px - 6 * s
    asc = font["hhea"].ascent * size / upm
    desc = -font["OS/2"].sTypoDescender * size / upm
    w = width + gap + 26 * s
    top = -asc * 0.98
    h = asc * 0.98 + desc * 0.95
    mark = f'<g transform="translate({tx:.2f} {ty:.2f}) scale({s:.4f})"><path class="mark-base" fill="{fg}" d="{LEFT}"/><path class="mark-accent" fill="{acc}" d="{RIGHT}"/></g>'
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 {top:.1f} {w + 4:.1f} {h:.1f}" role="img" aria-label="duppel"><path fill="{fg}" d="{d}"/>{mark}</svg>\n'


SYMBOL = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="1.75 0 46 46" role="img" aria-label="duppel">'
    f'<path class="mark-base" d="{LEFT}"/><path class="mark-accent" d="{RIGHT}"/></svg>\n'
)

for theme in INK:
    (out / f"wordmark-{theme}.svg").write_text(wordmark(theme), encoding="utf-8", newline="\n")
(out / "symbol.svg").write_text(SYMBOL, encoding="utf-8", newline="\n")
print("ok")
