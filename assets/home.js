const $ = s => document.querySelector(s);
const R = v => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let LOJAS = {};
let PRODUTOS = [];
let lista = {}; // { idDoProduto: quantidade }
let carregandoInicial = true;

const prod = id => PRODUTOS.find(p => String(p.id) === String(id));
const menor = p => {
  const valores = Object.values(p?.ofertas || {}).map(Number).filter(Number.isFinite);
  return valores.length ? Math.min(...valores) : Infinity;
};
const orcamento = () => { const v = parseFloat($("#max").value); return v > 0 ? v : 0; };

async function api(path, options = {}) {
  const res = await fetch(path, { credentials: "same-origin", ...options });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "Não foi possível carregar os dados.");
  return body;
}

function renderCategorias() {
  const atual = $("#cat").value;
  const cats = [...new Set(PRODUTOS.map(p => p.cat).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  $("#cat").innerHTML = '<option value="">Todas</option>' + cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join("");
  if (cats.includes(atual)) $("#cat").value = atual;
}

function renderProdutos() {
  const q = $("#q").value.trim().toLowerCase();
  const cat = $("#cat").value;
  const max = orcamento();
  const res = PRODUTOS
    .filter(p => p.nome.toLowerCase().includes(q) && (!cat || p.cat === cat) && (!max || menor(p) <= max))
    .sort($("#ord").value === "nome" ? (a, b) => a.nome.localeCompare(b.nome, "pt-BR") : (a, b) => menor(a) - menor(b));

  $("#qtd").textContent = res.length + (res.length === 1 ? " produto encontrado" : " produtos encontrados") + (max ? ` com preço até ${R(max)}` : "");
  $("#produtos-lista").innerHTML = res.map(p => {
    const linhas = Object.entries(p.ofertas || {}).sort((x, y) => Number(x[1]) - Number(y[1])).map(([l, v], i) =>
      `<li class="${i ? "" : "min"}"><span>${esc(LOJAS[l]?.nome || "Ferragem")}${i ? "" : '<span class="tag">menor preço</span>'}</span><span>${R(v)}</span></li>`).join("");
    const imagem = p.imagem ? `<img class="prod-img" src="${esc(p.imagem)}" alt="${esc(p.nome)}" loading="lazy">` : "";
    return `<article class="card">${imagem}<span class="cat">${esc(p.cat)}</span><h3>${esc(p.nome)}</h3>
      <ul class="ofertas">${linhas}</ul><button class="btn" data-add="${esc(p.id)}">Adicionar ao orçamento</button></article>`;
  }).join("") || '<p class="estado">Nenhum produto encontrado. Tente outro nome ou aumente o orçamento.</p>';
}

function renderLojas() {
  const lojas = Object.values(LOJAS);
  $("#lojas-lista").innerHTML = lojas.map(l => `
    <article class="card"><h3>${esc(l.nome)}</h3><p class="info">${esc(l.bairro)}</p>
      <p>${l.entrega ? '<span class="chip">Entrega</span>' : ""}${l.retirada ? '<span class="chip">Retirada na loja</span>' : ""}</p>
      <a class="btn" href="https://wa.me/${esc(l.tel)}" target="_blank" rel="noopener">Falar com a loja</a></article>`).join("") || '<p class="estado">Ainda não há ferragens parceiras cadastradas.</p>';
}

function renderOrcamento() {
  Object.keys(lista).forEach(id => { if (!prod(id)) delete lista[id]; });
  const ids = Object.keys(lista);
  const max = orcamento();
  $("#itens").innerHTML = ids.map(id => {
    const p = prod(id), q = lista[id], preco = menor(p);
    return `<li class="item"><span>${esc(p.nome)}<br><small>${R(preco)} cada</small></span>
      <span class="qtd"><button aria-label="Diminuir ${esc(p.nome)}" data-menos="${esc(id)}">−</button> ${q} <button aria-label="Aumentar ${esc(p.nome)}" data-mais="${esc(id)}">+</button></span>
      <strong>${R(preco * q)}</strong><button class="rem" aria-label="Remover ${esc(p.nome)}" data-rem="${esc(id)}">✕</button></li>`;
  }).join("") || '<li class="vazio">Sua lista está vazia. Adicione produtos para simular o orçamento.</li>';

  const total = ids.reduce((s, id) => s + menor(prod(id)) * lista[id], 0);
  $("#total").textContent = R(total);
  $("#barra").style.width = max ? Math.min(100, total / max * 100) + "%" : "0";
  $("#barra").parentElement.classList.toggle("estourou", !!(max && total > max));
  const st = $("#status");
  if (!max) { st.className = ""; st.textContent = "Informe seu orçamento no topo da página para comparar."; }
  else if (total <= max) { st.className = "ok"; st.textContent = `Dentro do orçamento: sobram ${R(max - total)}.`; }
  else { st.className = "erro"; st.textContent = `Acima do orçamento em ${R(total - max)}.`; }

  const porLoja = Object.keys(LOJAS)
    .filter(l => ids.length && ids.every(id => prod(id)?.ofertas?.[l] !== undefined))
    .map(l => [l, ids.reduce((s, id) => s + Number(prod(id).ofertas[l]) * lista[id], 0)])
    .sort((x, y) => x[1] - y[1]);
  $("#porloja").innerHTML = porLoja.length
    ? "<h3>Total por ferragem</h3><ul>" + porLoja.map(([l, v], i) =>
        `<li><span>${esc(LOJAS[l].nome)}${i ? "" : '<span class="tag">menor total</span>'}</span><strong>${R(v)}</strong></li>`).join("") + "</ul>"
    : ids.length ? '<p class="info">Nenhuma ferragem tem todos os itens da lista; o total usa o menor preço de cada um.</p>' : "";
}

async function carregarCatalogo({ silencioso = false } = {}) {
  try {
    const dados = await api("/api/catalog");
    const novasLojas = {};
    (dados.lojas || []).forEach(l => { novasLojas[l.id] = l; });
    LOJAS = novasLojas;
    PRODUTOS = dados.produtos || [];
    renderCategorias();
    renderProdutos();
    renderLojas();
    renderOrcamento();
    carregandoInicial = false;
  } catch (err) {
    if (!silencioso || carregandoInicial) {
      $("#qtd").textContent = "Não foi possível carregar os produtos.";
      $("#produtos-lista").innerHTML = `<p class="erro estado">${esc(err.message)}</p>`;
      $("#lojas-lista").innerHTML = '<p class="erro estado">Não foi possível carregar as ferragens.</p>';
    }
  }
}

$("#busca").addEventListener("input", () => { renderProdutos(); renderOrcamento(); });
$("#busca").addEventListener("submit", e => e.preventDefault());
document.addEventListener("click", e => {
  const d = (e.target.closest("button") || {}).dataset;
  if (!d) return;
  if (d.add) lista[d.add] = (lista[d.add] || 0) + 1;
  else if (d.mais) lista[d.mais]++;
  else if (d.menos) { if (--lista[d.menos] < 1) delete lista[d.menos]; }
  else if (d.rem) delete lista[d.rem];
  else return;
  renderOrcamento();
});

carregarCatalogo();
// Mantém a vitrine sincronizada sem recarregar a página. O foco/visibilidade força atualização imediata.
setInterval(() => carregarCatalogo({ silencioso: true }), 4000);
window.addEventListener("focus", () => carregarCatalogo({ silencioso: true }));
document.addEventListener("visibilitychange", () => { if (!document.hidden) carregarCatalogo({ silencioso: true }); });
