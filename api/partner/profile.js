import { requirePartner } from "../../lib/auth.js";
import { db } from "../../lib/db.js";
import { bodyOf, json, methodNotAllowed, publicError } from "../../lib/http.js";
import { phoneOf } from "../../lib/validation.js";

export default async function handler(req, res) {
  if (req.method !== "PATCH") return methodNotAllowed(res, ["PATCH"]);
  try {
    const partner = await requirePartner(req);
    const body = bodyOf(req);
    const tel = phoneOf(body.tel);
    const entrega = !!body.entrega;
    const retirada = !!body.retirada;
    const sql = db();
    const rows = await sql`
      UPDATE partners SET whatsapp = ${tel}, delivery = ${entrega}, pickup = ${retirada}
      WHERE id = ${partner.id}
      RETURNING id, name AS nome, neighborhood AS bairro, whatsapp AS tel, email,
                delivery AS entrega, pickup AS retirada`;
    return json(res, 200, { parceiro: { ...rows[0], id: String(rows[0].id) } });
  } catch (err) { return publicError(res, err, "Não foi possível atualizar os dados."); }
}
