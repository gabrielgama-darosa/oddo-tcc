const $ = s => document.querySelector(s);
const R = v => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let sessao = null;

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !(options.body instanceof Blob) && typeof options.body !== "string") {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(options.body);
  }
  const res = await fetch(path, { credentials: "same-origin", ...options, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "Não foi possível concluir a operação.");
  return body;
}

function telefone(t) {
  const n = String(t || "").replace(/\D/g, "");
  return n.startsWith("55") && n.length > 11 ? n : "55" + n;
}

function limparProduto() {
  $("#f-preco").reset();
  $("#p-id").value = "";
  $("#p-imagem-url").value = "";
  $("#imagem-atual").hidden = true;
  $("#imagem-atual").innerHTML = "";
}

function renderPainel() {
  const logado = !!sessao?.parceiro;
  $("#entrada").hidden = logado;
  $("#painel").hidden = !logado;
  if (!logado) return;

  const l = sessao.parceiro;
  $("#titulo").textContent = l.nome;
  $("#entrega").checked = !!l.entrega;
  $("#retirada").checked = !!l.retirada;
  $("#tel").value = l.tel || "";
  $("#nomes").innerHTML = (sessao.catalogo || []).map(p => `<option value="${esc(p.nome)}">`).join("");
  $("#cats").innerHTML = [...new Set((sessao.catalogo || []).map(p => p.cat))].sort().map(c => `<option value="${esc(c)}">`).join("");
  $("#meus").innerHTML = (sessao.produtos || []).map(p => {
    const img = p.imagem ? `<img src="${esc(p.imagem)}" alt="" loading="lazy">` : '<span aria-hidden="true"></span>';
    return `<li class="item item-prod">${img}<span>${esc(p.nome)}<br><small>${esc(p.cat)}</small></span>
      <strong class="preco-prod">${R(p.preco)}</strong>
      <span class="acoes-prod"><button class="icon-btn" type="button" aria-label="Editar ${esc(p.nome)}" title="Editar" data-ed="${esc(p.id)}"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 16.5V20h3.5L18.1 9.4l-3.5-3.5L4 16.5Zm16.7-9.8a1 1 0 0 0 0-1.4l-2-2a1 1 0 0 0-1.4 0l-1.6 1.6 3.5 3.5 1.5-1.7Z"/></svg></button>
      <button class="icon-btn danger" type="button" aria-label="Remover ${esc(p.nome)}" title="Remover" data-del="${esc(p.id)}"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M7 7l10 10M17 7 7 17"/></svg></button></span></li>`;
  }).join("") || '<li class="vazio">Você ainda não cadastrou produtos. Use o formulário ao lado.</li>';
}

async function carregarSessao() {
  try {
    sessao = await api("/api/auth/me");
  } catch {
    sessao = null;
  }
  renderPainel();
}

$("#f-entrar").addEventListener("submit", async e => {
  e.preventDefault();
  $("#erro").textContent = "";
  const btn = e.submitter; btn.disabled = true;
  try {
    await api("/api/auth/login", { method: "POST", body: { email: $("#email").value.trim(), senha: $("#senha").value } });
    e.target.reset();
    await carregarSessao();
  } catch (err) { $("#erro").textContent = err.message; }
  finally { btn.disabled = false; }
});

$("#f-cad").addEventListener("submit", async e => {
  e.preventDefault();
  $("#cad-msg").textContent = "";
  const btn = e.submitter; btn.disabled = true;
  try {
    await api("/api/auth/register", { method: "POST", body: {
      nome: $("#c-nome").value.trim(), bairro: $("#c-bairro").value.trim(), tel: telefone($("#c-tel").value),
      email: $("#c-email").value.trim(), senha: $("#c-senha").value
    }});
    e.target.reset();
    await carregarSessao();
  } catch (err) { $("#cad-msg").className = "erro"; $("#cad-msg").textContent = err.message; }
  finally { btn.disabled = false; }
});

async function enviarImagem(file) {
  if (!file) return null;
  if (file.size > 4 * 1024 * 1024) throw new Error("A imagem deve ter no máximo 4 MB.");
  const tipos = ["image/jpeg", "image/png", "image/webp"];
  if (!tipos.includes(file.type)) throw new Error("Use uma imagem JPG, PNG ou WEBP.");
  const res = await fetch("/api/upload", {
    method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/octet-stream", "X-Content-Type": file.type, "X-Filename": encodeURIComponent(file.name) }, body: file
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "Falha ao enviar a imagem.");
  return body.url;
}

$("#f-preco").addEventListener("submit", async e => {
  e.preventDefault();
  const btn = e.submitter; btn.disabled = true;
  $("#msg").className = ""; $("#msg").textContent = "Salvando...";
  try {
    const file = $("#p-imagem").files[0];
    const novaImagem = await enviarImagem(file);
    const payload = {
      nome: $("#p-nome").value.trim(), cat: $("#p-cat").value.trim(), preco: Number($("#p-preco").value),
      imagem: novaImagem || $("#p-imagem-url").value || null
    };
    const id = $("#p-id").value;
    await api(id ? `/api/products/${encodeURIComponent(id)}` : "/api/products", { method: id ? "PATCH" : "POST", body: payload });
    limparProduto();
    await carregarSessao();
    $("#msg").className = "msg-ok"; $("#msg").textContent = "Produto salvo e publicado na vitrine.";
  } catch (err) { $("#msg").className = "erro"; $("#msg").textContent = err.message; }
  finally { btn.disabled = false; }
});

$("#meus").addEventListener("click", async e => {
  const d = (e.target.closest("button") || {}).dataset;
  if (!d) return;
  const p = (sessao?.produtos || []).find(x => String(x.id) === String(d.ed || d.del));
  if (!p) return;
  if (d.ed) {
    $("#p-id").value = p.id;
    $("#p-nome").value = p.nome;
    $("#p-cat").value = p.cat;
    $("#p-preco").value = Number(p.preco).toFixed(2);
    $("#p-imagem-url").value = p.imagem || "";
    if (p.imagem) {
      $("#imagem-atual").hidden = false;
      $("#imagem-atual").innerHTML = `Imagem atual:<img src="${esc(p.imagem)}" alt="Imagem atual de ${esc(p.nome)}">`;
    } else {
      $("#imagem-atual").hidden = true;
      $("#imagem-atual").innerHTML = "";
    }
    $("#p-nome").focus();
    return;
  }
  const botao = e.target.closest("button"); botao.disabled = true;
  try {
    await api(`/api/products/${encodeURIComponent(p.id)}`, { method: "DELETE" });
    await carregarSessao();
    $("#msg").className = "msg-ok"; $("#msg").textContent = "Produto removido da vitrine.";
  } catch (err) { $("#msg").className = "erro"; $("#msg").textContent = err.message; botao.disabled = false; }
});

let perfilTimer;
["entrega", "retirada", "tel"].forEach(id => $("#" + id).addEventListener("change", () => {
  clearTimeout(perfilTimer);
  perfilTimer = setTimeout(async () => {
    $("#perfil-msg").textContent = "Salvando...";
    try {
      const r = await api("/api/partner/profile", { method: "PATCH", body: {
        entrega: $("#entrega").checked, retirada: $("#retirada").checked, tel: telefone($("#tel").value)
      }});
      sessao.parceiro = r.parceiro;
      $("#perfil-msg").textContent = "Dados atualizados.";
    } catch (err) { $("#perfil-msg").className = "erro"; $("#perfil-msg").textContent = err.message; }
  }, 250);
}));

$("#sair").addEventListener("click", async () => {
  try { await api("/api/auth/logout", { method: "POST" }); } catch {}
  sessao = null; limparProduto(); renderPainel();
});

carregarSessao();
