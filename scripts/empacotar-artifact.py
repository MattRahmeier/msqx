# Monta em build/artifact/ uma cópia do site para publicar como Artifact privado no claude.ai (acesso
# pelo celular e pelo notebook com a conta do Claude). O Artifact aceita no máximo 511 arquivos e
# 16 MB por arquivo, então as capas viram miniaturas de 260 px empacotadas em 8 JSON (data
# URIs), que o js/dados.js da cópia transforma em blob URLs ao carregar os álbuns. O index.html perde
# doctype/html/head/body (o Artifact põe o seu esqueleto). O site original não muda.
# Uso: python scripts/empacotar-artifact.py   (precisa do Pillow)

import base64, io, json, re, shutil
from pathlib import Path
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "build" / "artifact"
LADO, QUALIDADE, PACOTES = 260, 72, 8
# Arquivos de data/ que o site não lê (só os scripts).
FORA = {"correcoes.json", "notas-rym.json", "musicmap-mapa.json", "_modelo.json", ".gitkeep"}

if SAIDA.exists():
    shutil.rmtree(SAIDA)
SAIDA.mkdir(parents=True)

for pasta in ("css", "js", "data", "assets/img/autores", "assets/icones"):
    for arq in (RAIZ / pasta).rglob("*"):
        if arq.is_file() and arq.name not in FORA:
            destino = SAIDA / arq.relative_to(RAIZ)
            destino.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(arq, destino)

# index.html sem o esqueleto: o que estava no <head> (menos charset e viewport) seguido do <body>.
html = (RAIZ / "index.html").read_text(encoding="utf8")
cabeca = re.search(r"<head>(.*?)</head>", html, re.S).group(1)
cabeca = re.sub(r'\s*<meta (charset|name="viewport")[^>]*>', "", cabeca)
corpo = re.search(r"<body[^>]*>(.*?)</body>", html, re.S).group(1)
(SAIDA / "index.html").write_text(cabeca.strip() + "\n" + corpo, encoding="utf8")

# Capas: miniaturas em pacotes { "assets/img/capas/x.jpg": "data:image/jpeg;base64,…" }.
capas = sorted((RAIZ / "assets" / "img" / "capas").glob("*.jpg"))
pacotes = [{} for _ in range(PACOTES)]
for i, arq in enumerate(capas):
    im = Image.open(arq).convert("RGB")
    im.thumbnail((LADO, LADO))
    b = io.BytesIO()
    im.save(b, "JPEG", quality=QUALIDADE, optimize=True, progressive=True)
    pacotes[i % PACOTES][f"assets/img/capas/{arq.name}"] = "data:image/jpeg;base64," + base64.b64encode(b.getvalue()).decode()
(SAIDA / "capas").mkdir()
for n, p in enumerate(pacotes, 1):
    (SAIDA / "capas" / f"capas-{n}.json").write_text(json.dumps(p, separators=(",", ":")), encoding="utf8")

# js/dados.js da cópia: troca o caminho da capa pela miniatura do pacote.
dados = SAIDA / "js" / "dados.js"
js = dados.read_text(encoding="utf8")
antes = '  const lista = await carregar("data/albuns/albuns.json");\n  return { lista,'
assert antes in js, "albuns() mudou em js/dados.js; ajuste empacotar-artifact.py"
js = js.replace(antes, '  const lista = await carregar("data/albuns/albuns.json");\n  await aplicarCapas(lista);\n  return { lista,')
js += f'''
// Só na cópia do Artifact (scripts/empacotar-artifact.py): capas empacotadas em JSON viram blob URLs.
let capasProntas;
function aplicarCapas(lista) {{
  capasProntas ??= Promise.all(Array.from({{ length: {PACOTES} }}, (_, i) => carregar(`capas/capas-${{i + 1}}.json`)))
    .then((pacotes) => {{
      const urls = new Map();
      for (const p of pacotes) for (const [caminho, uri] of Object.entries(p)) {{
        const bin = atob(uri.slice(uri.indexOf(",") + 1));
        const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
        urls.set(caminho, URL.createObjectURL(new Blob([bytes], {{ type: "image/jpeg" }})));
      }}
      for (const f of lista) if (f.capa) f.capa = urls.get(f.capa) || null;
    }});
  return capasProntas;
}}
'''
dados.write_text(js, encoding="utf8")

arquivos = [a for a in SAIDA.rglob("*") if a.is_file()]
tamanho = sum(a.stat().st_size for a in arquivos)
maior = max(arquivos, key=lambda a: a.stat().st_size)
print(f"{len(arquivos)} arquivos, {tamanho / 1e6:.1f} MB (maior: {maior.relative_to(SAIDA)}, {maior.stat().st_size / 1e6:.1f} MB)")
