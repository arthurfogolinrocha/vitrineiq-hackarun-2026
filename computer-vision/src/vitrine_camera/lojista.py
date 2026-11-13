"""Relatório de uma página para o lojista, gerado do vitrine_eventos.json.

Só usa o que a câmera mede. Vendas, motivo de perda e valor em reais vêm do Modo Balcão,
então aparecem como "conectar ao Balcão" em vez de números inventados.
"""

import html
import webbrowser
from collections import Counter
from datetime import datetime
from pathlib import Path

from .armazenamento import carregar_eventos
from .config import LOJA_ID, ZONAS

SAIDA = Path("relatorio_lojista.html")
PRESSA_S = 3.0  # atravessar a imagem em menos que isso = corredor de passagem rápida; calibre com a câmera real


def br(n):
    return f"{n:,}".replace(",", ".")


def pct(a, b):
    return round(100 * a / b) if b else 0


def decimal_br(n):
    return str(n).replace(".", ",")


def hora_pico(s):
    """Hora com mais passantes, ou None sem dados."""
    return max(s["por_hora"].items(), key=lambda kv: kv[1])[0] if s["por_hora"] else None


def resumo(regs):
    """Soma os registros de 10 s num resumo do período inteiro."""
    zonas, fluxo, por_hora, pico_hora = Counter(), Counter(), Counter(), Counter()
    for r in regs:
        zonas.update(r.get("olhares_por_zona", {}))  # registros antigos não têm zona, fluxo nem pico
        fluxo.update(r.get("fluxo", {}))
        h = datetime.fromisoformat(r["inicio"]).hour
        por_hora[h] += r["passantes"]
        pico_hora[h] = max(pico_hora[h], r.get("pico_simultaneo", 0))
    com_tempo = [r for r in regs if r.get("atencao_media_s")]
    olhares_com_tempo = sum(r["olharam"] for r in com_tempo)
    andando = lambda r: r.get("fluxo", {}).get("esq_para_dir", 0) + r.get("fluxo", {}).get("dir_para_esq", 0)
    com_trav = [r for r in regs if r.get("travessia_media_s")]
    n_trav = sum(andando(r) for r in com_trav)
    soma = lambda chave: sum(r.get(chave, 0) for r in regs)  # registros antigos não têm os sinais novos
    grupo = lambda chave: sum((Counter(r.get(chave, {})) for r in regs), Counter())
    return {
        "travessia_s": round(sum(r["travessia_media_s"] * andando(r) for r in com_trav) / n_trav, 1) if n_trav else 0,
        "perto": soma("chegaram_perto"),
        "apontaram": soma("apontaram"),
        "celular": soma("no_celular"),
        "parou_celular": soma("pararam_no_celular"),
        "voltaram": soma("voltaram_a_olhar"),
        "sozinhos": grupo("sozinhos"),
        "em_grupo": grupo("em_grupo"),
        "inicio": min(r["inicio"] for r in regs),
        "fim": max(r.get("fim", r["inicio"]) for r in regs),
        "passantes": sum(r["passantes"] for r in regs),
        "olharam": sum(r["olharam"] for r in regs),
        "sem_olhar": sum(r.get("pararam_sem_olhar", 0) for r in regs),
        "atencao_s": round(sum(r["atencao_media_s"] * r["olharam"] for r in com_tempo) / olhares_com_tempo, 1)
        if olhares_com_tempo else 0,
        "zonas": {z: zonas[z] for z in ZONAS},
        "fluxo": fluxo,
        "por_hora": dict(sorted(por_hora.items())),
        "pico_hora": pico_hora,
    }


def acoes(s):
    """No máximo 3 ações, cada uma apoiada num número do próprio resumo."""
    lista = []
    taxa = pct(s["olharam"], s["passantes"])
    if s["passantes"] and taxa < 20:
        lista.append(f"Só {taxa}% de quem passa olha a vitrine. Troque a vitrine e compare a taxa na semana seguinte.")
    elif s["passantes"]:
        lista.append(f"{taxa}% de quem passa olha a vitrine. Mantenha o que está funcionando e teste uma mudança por vez.")
    total_z = sum(s["zonas"].values())
    if total_z:
        z, n = max(s["zonas"].items(), key=lambda kv: kv[1])
        lista.append(f"A parte da {z} recebe {pct(n, total_z)}% dos olhares. Coloque ali o produto que você mais quer vender.")
    if (h := hora_pico(s)) is not None:
        n = s["por_hora"][h]
        lista.append(f"O maior movimento é das {h}h às {h + 1}h ({br(n)} passantes). "
                     "Tenha um vendedor perto da porta e dispare campanhas relâmpago um pouco antes.")
    if s["sem_olhar"] > s["olharam"] > 0 or (s["sem_olhar"] and not s["olharam"]):
        lista.append(f"{br(s['sem_olhar'])} pessoas pararam na frente sem olhar a vitrine. "
                     "É um ponto de espera: um cartaz ou QR na altura dos olhos aproveita esse tempo.")
    return lista[:3]


def barras(itens, rotulo):
    maior = max(itens.values(), default=0) or 1
    return "".join(
        f'<div class="barra"><span class="rot">{html.escape(rotulo(k))}</span>'
        f'<span class="trilho"><span class="valor" style="width:{pct(v, maior)}%"></span></span>'
        f'<span class="num">{br(v)}</span></div>'
        for k, v in itens.items()
    )


CSS = """
:root { --fundo:#f6f5f1; --papel:#fff; --tinta:#1d1d1b; --suave:#6b6a64; --linha:#e3e1d9; --forte:#0f6e56; --forte-claro:#d7ede6; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --fundo:#161614; --papel:#20201d; --tinta:#eceae3; --suave:#a3a199; --linha:#34332e; --forte:#4cc59f; --forte-claro:#1d3a31; } }
* { box-sizing: border-box; }
body { margin:0; background:var(--fundo); color:var(--tinta); font:15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
main { max-width:760px; margin:0 auto; padding:32px 16px; }
header h1 { margin:0; font-size:28px; letter-spacing:-0.01em; }
header p { margin:4px 0 0; color:var(--suave); }
.kpis { display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px; margin:24px 0; }
.kpi { background:var(--papel); border:1px solid var(--linha); border-radius:10px; padding:16px; }
.kpi b { display:block; font-size:30px; font-variant-numeric:tabular-nums; line-height:1.1; }
.kpi span { color:var(--suave); font-size:13px; }
section { background:var(--papel); border:1px solid var(--linha); border-radius:10px; padding:16px 20px; margin-bottom:12px; }
section h2 { margin:0 0 12px; font-size:15px; }
.acoes { background:var(--forte-claro); border-color:transparent; }
.acoes ol { margin:0; padding-left:20px; }
.acoes li { margin:6px 0; }
.barra { display:grid; grid-template-columns:96px 1fr 56px; align-items:center; gap:8px; margin:4px 0; font-variant-numeric:tabular-nums; }
.rot { color:var(--suave); font-size:13px; }
.trilho { background:var(--linha); border-radius:4px; height:12px; overflow:hidden; }
.valor { display:block; height:100%; background:var(--forte); border-radius:4px; }
.num { text-align:right; font-size:13px; }
dl { display:grid; grid-template-columns:1fr auto; gap:6px 16px; margin:0; }
dt { color:var(--suave); } dd { margin:0; text-align:right; font-variant-numeric:tabular-nums; }
.pendente { color:var(--suave); }
footer { color:var(--suave); font-size:12px; margin-top:16px; }
@media print { body { background:#fff; } main { padding:0; } section, .kpi { break-inside:avoid; } }
"""


def gerar(regs, loja_id=LOJA_ID):
    s = resumo(regs)
    ini, fim = datetime.fromisoformat(s["inicio"]), datetime.fromisoformat(s["fim"])
    periodo = f"{ini:%d/%m/%Y %H:%M} a {fim:%d/%m/%Y %H:%M}"
    pico_h = hora_pico(s)
    pico_txt = f"{pico_h}h–{pico_h + 1}h" if pico_h is not None else "—"
    lista_acoes = "".join(f"<li>{html.escape(a)}</li>" for a in acoes(s)) or "<li>Sem dados suficientes ainda.</li>"
    f, so, gr = s["fluxo"], s["sozinhos"], s["em_grupo"]
    t = s["travessia_s"]
    ritmo = "—" if not t else (f"{'passagem rápida' if t < PRESSA_S else 'passeio'} "
                               f"(atravessam em {decimal_br(t)} s)")
    return f"""<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Relatório da Vitrine</title><style>{CSS}</style></head>
<body><main>
<header><h1>Sua vitrine</h1><p>Loja {html.escape(str(loja_id))} · {periodo}</p></header>

<div class="kpis">
  <div class="kpi"><b>{br(s['passantes'])}</b><span>pessoas passaram na frente</span></div>
  <div class="kpi"><b>{pct(s['olharam'], s['passantes'])}%</b><span>olharam a vitrine ({br(s['olharam'])} pessoas)</span></div>
  <div class="kpi"><b>{pico_txt}</b><span>horário de maior movimento</span></div>
</div>

<section class="acoes"><h2>O que fazer</h2><ol>{lista_acoes}</ol></section>

<section><h2>Movimento por hora</h2>{barras(s['por_hora'], lambda h: f"{h}h")}</section>

<section><h2>Onde olham na vitrine <span class="rot">(vista da calçada)</span></h2>{barras(s['zonas'], str.capitalize)}</section>

<section><h2>Detalhes</h2><dl>
  <dt>Tempo médio olhando a vitrine</dt><dd>{decimal_br(s['atencao_s'])} s</dd>
  <dt>Pararam na frente sem olhar</dt><dd>{br(s['sem_olhar'])}</dd>
  <dt>Chegaram pela esquerda / pela direita</dt><dd>{br(f['esq_para_dir'])} / {br(f['dir_para_esq'])}</dd>
  <dt>Máximo de pessoas juntas na frente</dt><dd>{br(max(s['pico_hora'].values(), default=0))}</dd>
  <dt>Chegaram perto do vidro</dt><dd>{br(s['perto'])} ({pct(s['perto'], s['passantes'])}%)</dd>
  <dt>Apontaram para a vitrine</dt><dd>{br(s['apontaram'])}</dd>
  <dt>Voltaram a olhar (ficaram em dúvida)</dt><dd>{br(s['voltaram'])}</dd>
  <dt>Ritmo da calçada</dt><dd>{ritmo}</dd>
  <dt>Pararam: sozinhos / em grupo</dt><dd>{pct(so['pararam'], so['pessoas'])}% / {pct(gr['pararam'], gr['pessoas'])}% ({br(gr['grupos'])} grupos)</dd>
  <dt>Pararam sem olhar porque estavam no celular</dt><dd>{br(s['parou_celular'])} de {br(s['sem_olhar'])}</dd>
  <dt>Entraram, compraram e motivo de perda</dt><dd class="pendente">conectar ao Modo Balcão</dd>
  <dt>Vendas recuperáveis em R$</dt><dd class="pendente">conectar ao Modo Balcão</dd>
</dl></section>

<footer>Contagem automática por câmera, sem gravar imagens e sem identificar pessoas: só números agregados.
Os valores são estimativas; a precisão ainda não foi validada com contagem manual.</footer>
</main></body></html>
"""


def main():
    SAIDA.write_text(gerar(carregar_eventos()), encoding="utf-8")
    print(f"Relatório salvo em {SAIDA.resolve()}")
    webbrowser.open(SAIDA.resolve().as_uri())
