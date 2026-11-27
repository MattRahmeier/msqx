# Planilha dos discos com menos de 5 descritores (data/albuns/albuns.json), para o usuário
# procurar em outros sites e preencher à mão. Saída: fontes/descritores-pendentes.xlsx (fora do git).
#   Aba "Álbuns": um disco por linha, dos com menos descritores para os com mais, com links de
#   busca (RYM, Last.fm, Discogs) e colunas amarelas para preencher.
#   Aba "Vocabulário": os termos aceitos (data/descritores/descritores.json).
#   Aba "Como usar": legenda.
# Uso: python -I scripts/planilha-descritores.py
import json
from pathlib import Path
from urllib.parse import quote, quote_plus
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.comments import Comment

RAIZ = Path(__file__).resolve().parent.parent
META = 5
fichas = json.loads((RAIZ / "data/albuns/albuns.json").read_text(encoding="utf8"))
vocab = json.loads((RAIZ / "data/descritores/descritores.json").read_text(encoding="utf8"))
generos = {g["id"]: g["nome"] for g in json.loads((RAIZ / "data/generos/generos.json").read_text(encoding="utf8"))}
nome_desc = {d["id"]: d["nome"] for d in vocab}

FONTE = "Arial"
f_normal = Font(name=FONTE, size=10)
f_cabeca = Font(name=FONTE, size=10, bold=True, color="FFFFFF")
f_link = Font(name=FONTE, size=10, color="0563C1", underline="single")
f_exemplo = Font(name=FONTE, size=10, italic=True, color="808080")
fundo_cabeca = PatternFill("solid", fgColor="1F1F1F")
fundo_preencher = PatternFill("solid", fgColor="FFFF00")
quebra = Alignment(wrap_text=True, vertical="top")

pendentes = [f for f in fichas if len(f.get("descritores") or []) < META]
pendentes.sort(key=lambda f: (len(f.get("descritores") or []), f["artista"].lower(), f["titulo"].lower()))

wb = Workbook()
ws = wb.active
ws.title = "Álbuns"
colunas = [
    ("Artista", 28), ("Álbum", 34), ("Ano", 7), ("Gêneros no site", 30), ("Descritores atuais", 32),
    ("Faltam para 5", 9), ("Descritores encontrados", 40), ("Onde encontrou", 22),
    ("RYM", 9), ("Last.fm", 9), ("Discogs", 9), ("id", 36),
]
for c, (titulo, largura) in enumerate(colunas, 1):
    cel = ws.cell(row=1, column=c, value=titulo)
    cel.font, cel.fill, cel.alignment = f_cabeca, fundo_cabeca, Alignment(wrap_text=True, vertical="center")
    ws.column_dimensions[cel.column_letter].width = largura
ws.row_dimensions[1].height = 30
ws.freeze_panes = "C2"
ws["G1"].comment = Comment("Preencha com termos da aba Vocabulário (em português ou o termo em inglês), separados por vírgula.", "MsqX")
ws["H1"].comment = Comment("Site onde achou os descritores (ex.: RateYourMusic, Last.fm, AllMusic).", "MsqX")


def links(f, linha):
    termo = f"{f['artista']} {f['titulo']}"
    rym = f"https://rateyourmusic.com/search?searchterm={quote_plus(termo)}&searchtype=l"
    artista = f["artista"].split(",")[0].split(" & ")[0].strip()
    lastfm = f"https://www.last.fm/music/{quote(artista.replace(' ', '+'), safe='+')}/{quote(f['titulo'].replace(' ', '+'), safe='+')}"
    discogs = f.get("discogs") or f"https://www.discogs.com/search/?q={quote_plus(termo)}&type=all"
    for col, url in ((9, rym), (10, lastfm), (11, discogs)):
        cel = ws.cell(row=linha, column=col, value="abrir")
        cel.hyperlink, cel.font = url, f_link


def linha_disco(linha, f, exemplo=False):
    atuais = ", ".join(nome_desc.get(d, d) for d in f.get("descritores") or [])
    gens = ", ".join(dict.fromkeys(generos[g] for g in (f.get("generos") or []) + (f.get("estilos") or []) if g in generos))
    valores = [f["artista"], f["titulo"], (f.get("lancamento") or "")[:4], gens, atuais]
    for c, v in enumerate(valores, 1):
        ws.cell(row=linha, column=c, value=v).font = f_exemplo if exemplo else f_normal
    # Quantos descritores faltam: conta os itens separados por vírgula na coluna E.
    ws.cell(row=linha, column=6, value=f'=MAX(0,{META}-IF(LEN(TRIM(E{linha}))=0,0,LEN(E{linha})-LEN(SUBSTITUTE(E{linha},",",""))+1))').font = f_exemplo if exemplo else f_normal
    for c in (7, 8):
        ws.cell(row=linha, column=c).fill = fundo_preencher
    links(f, linha)
    ws.cell(row=linha, column=12, value=f["id"]).font = Font(name=FONTE, size=8, color="808080")
    for c in range(1, 13):
        ws.cell(row=linha, column=c).alignment = quebra


# Linha de exemplo: um disco que já tem descritores, com as colunas amarelas preenchidas.
exemplo = next(f for f in fichas if f["id"] == "lifelover-konkurs")
linha_disco(2, exemplo, exemplo=True)
ws.cell(row=2, column=7, value="melancólico, frio, solitário").font = f_exemplo
ws.cell(row=2, column=8, value="EXEMPLO — RateYourMusic").font = f_exemplo
for i, f in enumerate(pendentes, 3):
    linha_disco(i, f)
ws.auto_filter.ref = f"A1:L{len(pendentes) + 2}"

voc = wb.create_sheet("Vocabulário")
for c, (titulo, largura) in enumerate((("Descritor (português)", 26), ("Termo (inglês, como no RYM)", 28), ("Categoria", 12)), 1):
    cel = voc.cell(row=1, column=c, value=titulo)
    cel.font, cel.fill = f_cabeca, fundo_cabeca
    voc.column_dimensions[cel.column_letter].width = largura
for i, d in enumerate(sorted(vocab, key=lambda d: (d["categoria"], d["nome"])), 2):
    for c, v in enumerate((d["nome"], d["id"].replace("-", " "), "vibe" if d["categoria"] == "clima" else d["categoria"]), 1):
        voc.cell(row=i, column=c, value=v).font = f_normal
voc.freeze_panes = "A2"

guia = wb.create_sheet("Como usar")
guia.column_dimensions["A"].width = 100
textos = [
    ("Discos com menos de 5 descritores", True),
    (f"{len(pendentes)} discos, dos que têm menos descritores para os que têm mais.", False),
    ("", False),
    ("1. Na aba Álbuns, use os links (RYM, Last.fm, Discogs) para ver como as pessoas descrevem o disco.", False),
    ("2. Preencha só as colunas amarelas: \"Descritores encontrados\" (termos da aba Vocabulário, separados por vírgula) e \"Onde encontrou\".", False),
    ("3. Os termos podem ir em português (melancólico) ou no inglês do RYM (melancholic). Termos fora do vocabulário ficam de fora ao importar.", False),
    ("4. A linha 2, em cinza, é só um exemplo.", False),
    ("5. Não mude a coluna id: é ela que liga a linha à ficha do disco no site.", False),
    ("", False),
    ("A coluna \"Faltam para 5\" é calculada a partir de \"Descritores atuais\".", False),
]
for i, (t, negrito) in enumerate(textos, 1):
    guia.cell(row=i, column=1, value=t).font = Font(name=FONTE, size=12 if negrito else 10, bold=negrito)

# Sem valores calculados no arquivo (openpyxl): o Excel calcula as fórmulas ao abrir.
wb.calculation.fullCalcOnLoad = True
saida = RAIZ / "fontes" / "descritores-pendentes.xlsx"
saida.parent.mkdir(exist_ok=True)
wb.save(saida)
print(f"{len(pendentes)} discos → {saida}")
