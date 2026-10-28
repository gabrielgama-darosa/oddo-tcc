import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { requirePartner } from "../lib/auth.js";
import { json, methodNotAllowed, publicError, httpError } from "../lib/http.js";

const MAX = 4 * 1024 * 1024;
const TYPES = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"]]);

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX) throw httpError(413, "A imagem deve ter no máximo 4 MB.");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
  try {
    const partner = await requirePartner(req);
    const type = String(req.headers["x-content-type"] || "").split(";")[0].trim().toLowerCase();
    const ext = TYPES.get(type);
    if (!ext) throw httpError(415, "Use uma imagem JPG, PNG ou WEBP.");
    const declared = Number(req.headers["content-length"] || 0);
    if (declared > MAX) throw httpError(413, "A imagem deve ter no máximo 4 MB.");
    const data = Buffer.isBuffer(req.body) ? req.body : await readBody(req);
    if (!data.length) throw httpError(400, "Selecione uma imagem válida.");

    const blob = await put(`produtos/${partner.id}/${randomUUID()}.${ext}`, data, {
      access: "public",
      contentType: type,
      addRandomSuffix: false
    });
    return json(res, 201, { url: blob.url });
  } catch (err) { return publicError(res, err, "Não foi possível enviar a imagem."); }
}
