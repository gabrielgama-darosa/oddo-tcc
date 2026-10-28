import { requirePartner } from "../../lib/auth.js";
import { db } from "../../lib/db.js";
import { bodyOf, json, methodNotAllowed, publicError } from "../../lib/http.js";
import { cleanText, imageUrlOf, priceOf, productKey } from "../../lib/validation.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
  try {
    const partner = await requirePartner(req);
    const body = bodyOf(req);
    const nome = cleanText(body.nome, { field: "Produto", max: 120 });
    const cat = cleanText(body.cat, { field: "Categoria", max: 80 });
    const preco = priceOf(body.preco);
    const imagem = imageUrlOf(body.imagem);
    const key = productKey(nome, cat);
    const sql = db();

    const cp = await sql`
      INSERT INTO catalog_products (normalized_key, name, category)
      VALUES (${key}, ${nome}, ${cat})
      ON CONFLICT (normalized_key) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category
      RETURNING id, name, category`;

    const rows = await sql`
      INSERT INTO listings (partner_id, product_id, price, image_url)
      VALUES (${partner.id}, ${cp[0].id}, ${preco}, ${imagem})
      ON CONFLICT (partner_id, product_id)
      DO UPDATE SET price = EXCLUDED.price,
                    image_url = COALESCE(EXCLUDED.image_url, listings.image_url),
                    updated_at = NOW()
      RETURNING id, price, image_url`;

    return json(res, 201, { produto: { id: String(rows[0].id), nome: cp[0].name, cat: cp[0].category, preco: Number(rows[0].price), imagem: rows[0].image_url } });
  } catch (err) { return publicError(res, err, "Não foi possível salvar o produto."); }
}
