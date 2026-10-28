import { requirePartner } from "../../lib/auth.js";
import { db } from "../../lib/db.js";
import { bodyOf, json, methodNotAllowed, publicError, httpError } from "../../lib/http.js";
import { cleanText, imageUrlOf, priceOf, productKey } from "../../lib/validation.js";

export default async function handler(req, res) {
  if (!["PATCH", "DELETE"].includes(req.method)) return methodNotAllowed(res, ["PATCH", "DELETE"]);
  try {
    const partner = await requirePartner(req);
    const id = String(req.query?.id ?? "");
    if (!/^\d+$/.test(id)) throw httpError(400, "Produto inválido.");
    const sql = db();
    const atual = await sql`
      SELECT l.id, l.product_id, l.image_url
      FROM listings l WHERE l.id = ${id} AND l.partner_id = ${partner.id} LIMIT 1`;
    if (!atual.length) throw httpError(404, "Produto não encontrado.");

    if (req.method === "DELETE") {
      await sql`DELETE FROM listings WHERE id = ${id} AND partner_id = ${partner.id}`;
      await sql`DELETE FROM catalog_products cp WHERE cp.id = ${atual[0].product_id}
                AND NOT EXISTS (SELECT 1 FROM listings l WHERE l.product_id = cp.id)`;
      return json(res, 200, { ok: true });
    }

    const body = bodyOf(req);
    const nome = cleanText(body.nome, { field: "Produto", max: 120 });
    const cat = cleanText(body.cat, { field: "Categoria", max: 80 });
    const preco = priceOf(body.preco);
    const imagem = imageUrlOf(body.imagem) || atual[0].image_url || null;
    const key = productKey(nome, cat);
    const cp = await sql`
      INSERT INTO catalog_products (normalized_key, name, category)
      VALUES (${key}, ${nome}, ${cat})
      ON CONFLICT (normalized_key) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category
      RETURNING id, name, category`;

    let listing;
    if (String(cp[0].id) === String(atual[0].product_id)) {
      const rows = await sql`
        UPDATE listings SET price = ${preco}, image_url = ${imagem}, updated_at = NOW()
        WHERE id = ${id} AND partner_id = ${partner.id}
        RETURNING id, price, image_url`;
      listing = rows[0];
    } else {
      const rows = await sql`
        INSERT INTO listings (partner_id, product_id, price, image_url)
        VALUES (${partner.id}, ${cp[0].id}, ${preco}, ${imagem})
        ON CONFLICT (partner_id, product_id)
        DO UPDATE SET price = EXCLUDED.price, image_url = EXCLUDED.image_url, updated_at = NOW()
        RETURNING id, price, image_url`;
      listing = rows[0];
      await sql`DELETE FROM listings WHERE id = ${id} AND partner_id = ${partner.id}`;
      await sql`DELETE FROM catalog_products old_cp WHERE old_cp.id = ${atual[0].product_id}
                AND NOT EXISTS (SELECT 1 FROM listings l WHERE l.product_id = old_cp.id)`;
    }

    return json(res, 200, { produto: { id: String(listing.id), nome: cp[0].name, cat: cp[0].category, preco: Number(listing.price), imagem: listing.image_url } });
  } catch (err) { return publicError(res, err, "Não foi possível alterar o produto."); }
}
