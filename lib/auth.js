import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { db } from "./db.js";
import { httpError } from "./http.js";

const COOKIE = "oddo_session";
const SESSION_DAYS = 7;

function parseCookies(req) {
  const raw = req.headers.cookie || "";
  return Object.fromEntries(raw.split(";").map(x => x.trim()).filter(Boolean).map(pair => {
    const i = pair.indexOf("=");
    return i < 0 ? [pair, ""] : [pair.slice(0, i), decodeURIComponent(pair.slice(i + 1))];
  }));
}

function tokenHash(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  const senha = String(password ?? "");
  if (senha.length < 8 || senha.length > 128) throw httpError(400, "A senha deve ter entre 8 e 128 caracteres.");
  const hash = scryptSync(senha, salt, 64).toString("hex");
  return { salt, hash };
}

export function verifyPassword(password, salt, expectedHex) {
  try {
    const actual = scryptSync(String(password ?? ""), salt, 64);
    const expected = Buffer.from(expectedHex, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch { return false; }
}

export async function createSession(res, partnerId) {
  const sql = db();
  const token = randomBytes(32).toString("base64url");
  const hash = tokenHash(token);
  await sql`INSERT INTO sessions (token_hash, partner_id, expires_at)
            VALUES (${hash}, ${partnerId}, NOW() + INTERVAL '7 days')`;
  const secure = process.env.VERCEL ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure}`);
}

export async function destroySession(req, res) {
  const token = parseCookies(req)[COOKIE];
  if (token) {
    const sql = db();
    await sql`DELETE FROM sessions WHERE token_hash = ${tokenHash(token)}`;
  }
  const secure = process.env.VERCEL ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
}

export async function optionalPartner(req) {
  const token = parseCookies(req)[COOKIE];
  if (!token) return null;
  const sql = db();
  const rows = await sql`
    SELECT p.id, p.name AS nome, p.neighborhood AS bairro, p.whatsapp AS tel,
           p.email, p.delivery AS entrega, p.pickup AS retirada
    FROM sessions s
    JOIN partners p ON p.id = s.partner_id
    WHERE s.token_hash = ${tokenHash(token)} AND s.expires_at > NOW()
    LIMIT 1`;
  return rows[0] || null;
}

export async function requirePartner(req) {
  const partner = await optionalPartner(req);
  if (!partner) throw httpError(401, "Sua sessão expirou. Entre novamente.");
  return partner;
}
