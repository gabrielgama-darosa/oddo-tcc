import { db } from "../../lib/db.js";
import { createSession, hashPassword } from "../../lib/auth.js";
import { bodyOf, json, methodNotAllowed, publicError, httpError } from "../../lib/http.js";
import { cleanText, emailOf, phoneOf } from "../../lib/validation.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
  try {
    const body = bodyOf(req);
    const nome = cleanText(body.nome, { field: "Nome da ferragem", max: 100 });
    const bairro = cleanText(body.bairro, { field: "Bairro", max: 100 });
    const tel = phoneOf(body.tel);
    const email = emailOf(body.email);
    const { salt, hash } = hashPassword(body.senha);
    const sql = db();
    const existe = await sql`SELECT 1 FROM partners WHERE email = ${email} LIMIT 1`;
    if (existe.length) throw httpError(409, "Já existe um parceiro cadastrado com este e-mail.");

    const rows = await sql`
      INSERT INTO partners (name, neighborhood, whatsapp, email, password_hash, password_salt)
      VALUES (${nome}, ${bairro}, ${tel}, ${email}, ${hash}, ${salt})
      RETURNING id, name AS nome, neighborhood AS bairro, whatsapp AS tel, email,
                delivery AS entrega, pickup AS retirada`;
    const partner = rows[0];
    await createSession(res, partner.id);
    return json(res, 201, { parceiro: { ...partner, id: String(partner.id) } });
  } catch (err) {
    if (err?.code === "23505") err = httpError(409, "Já existe um parceiro cadastrado com este e-mail.");
    return publicError(res, err, "Não foi possível cadastrar a ferragem.");
  }
}
