import { httpError } from "./http.js";

export function cleanText(value, { field = "Campo", max = 120 } = {}) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  if (!text) throw httpError(400, `${field} é obrigatório.`);
  if (text.length > max) throw httpError(400, `${field} excede ${max} caracteres.`);
  return text;
}

export function emailOf(value) {
  const email = String(value ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) {
    throw httpError(400, "Informe um e-mail válido.");
  }
  return email;
}

export function phoneOf(value) {
  let phone = String(value ?? "").replace(/\D/g, "");
  if (phone.length >= 10 && phone.length <= 11) phone = "55" + phone;
  if (phone.length < 12 || phone.length > 15) throw httpError(400, "Informe um WhatsApp válido com DDD.");
  return phone;
}

export function priceOf(value) {
  const price = Number(value);
  if (!Number.isFinite(price) || price <= 0 || price > 99999999.99) throw httpError(400, "Informe um preço válido.");
  return Math.round(price * 100) / 100;
}

export function productKey(name, category) {
  const norm = s => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
  return `${norm(name)}|${norm(category)}`;
}

export function imageUrlOf(value) {
  if (value === null || value === undefined || value === "") return null;
  const url = String(value).trim();
  if (url.length > 2000 || !/^https:\/\//i.test(url)) throw httpError(400, "URL de imagem inválida.");
  return url;
}
