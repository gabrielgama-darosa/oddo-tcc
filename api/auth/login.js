import { db } from "../../lib/db.js";
import { createSession, verifyPassword } from "../../lib/auth.js";
import { bodyOf, json, methodNotAllowed, publicError, httpError } from "../../lib/http.js";
import { emailOf } from "../../lib/validation.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
  try {
    const body = bodyOf(req);
    const email = emailOf(body.email);
    const sql = db();
    const rows = await sql`SELECT id, password_hash, password_salt FROM partners WHERE email = ${email} LIMIT 1`;
    const partner = rows[0];
    if (!partner || !verifyPassword(body.senha, partner.password_salt, partner.password_hash)) {
      throw httpError(401, "E-mail ou senha incorretos.");
    }
    await createSession(res, partner.id);
    return json(res, 200, { ok: true });
  } catch (err) { return publicError(res, err, "Não foi possível entrar."); }
}
