import { db } from "../lib/db.js";
import { json, methodNotAllowed, publicError } from "../lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  try {
    const sql = db();
    const [partners, rows] = await Promise.all([
      sql`SELECT id, name AS nome, neighborhood AS bairro, whatsapp AS tel,
                 delivery AS entrega, pickup AS retirada
          FROM partners ORDER BY name ASC`,
      sql`SELECT cp.id AS product_id, cp.name AS nome, cp.category AS cat,
                 l.price AS preco, l.image_url AS imagem,
                 p.id AS partner_id, p.name AS partner_nome
          FROM catalog_products cp
          JOIN listings l ON l.product_id = cp.id
          JOIN partners p ON p.id = l.partner_id
          ORDER BY cp.name ASC, l.price ASC`
    ]);

    const mapa = new Map();
    for (const row of rows) {
      const id = String(row.product_id);
      if (!mapa.has(id)) mapa.set(id, { id, nome: row.nome, cat: row.cat, imagem: row.imagem || null, ofertas: {} });
      const item = mapa.get(id);
      item.ofertas[String(row.partner_id)] = Number(row.preco);
      if (!item.imagem && row.imagem) item.imagem = row.imagem;
    }

    return json(res, 200, { lojas: partners.map(p => ({ ...p, id: String(p.id) })), produtos: [...mapa.values()] });
  } catch (err) { return publicError(res, err, "Não foi possível carregar a vitrine."); }
}
