import { destroySession } from "../../lib/auth.js";
import { json, methodNotAllowed, publicError } from "../../lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
  try {
    await destroySession(req, res);
    return json(res, 200, { ok: true });
  } catch (err) { return publicError(res, err, "Não foi possível encerrar a sessão."); }
}
