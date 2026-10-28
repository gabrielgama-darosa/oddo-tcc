import { requirePartner } from "../../lib/auth.js";
import { db } from "../../lib/db.js";
import { json, methodNotAllowed, publicError } from "../../lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  try {
    const partner = await requirePartner(req);
    const sql = db();
    const [products, catalog] = await Promise.all([
      sql`SELECT l.id, cp.name AS nome, cp.category AS cat, l.price AS preco, l.image_url AS imagem
          FROM listings l JOIN catalog_products cp ON cp.id = l.product_id
          WHERE l.partner_id = ${partner.id} ORDER BY cp.name ASC`,
      sql`SELECT id, name AS nome, category AS cat FROM catalog_products ORDER BY name ASC LIMIT 500`
    ]);
    return json(res, 200, {
      parceiro: { ...partner, id: String(partner.id) },
      produtos: products.map(p => ({ ...p, id: String(p.id), preco: Number(p.preco) })),
      catalogo: catalog.map(p => ({ ...p, id: String(p.id) }))
    });
  } catch (err) { return publicError(res, err, "Não foi possível carregar sua área."); }
}
