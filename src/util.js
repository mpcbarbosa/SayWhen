import { L } from "./i18n.js";
import crypto from "node:crypto";

export const token = (n = 18) => crypto.randomBytes(n).toString("base64url");
export const id = () => crypto.randomBytes(6).toString("hex");

const pad = (n) => (n < 10 ? "0" + n : "" + n);

export function endTime(h, mins) {
  const [hh, mm] = h.split(":").map(Number);
  const t = hh * 60 + mm + Number(mins);
  return `${pad(Math.floor(t / 60) % 24)}:${pad(t % 60)}`;
}

export function slotDate(s) {
  const [y, m, d] = s.d.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function fmtDay(lang, s) {
  const dt = slotDate(s);
  return `${L(lang).dow[dt.getDay()]} ${dt.getDate()} ${L(lang).mon[dt.getMonth()]}`;
}

export function fmtLong(lang, s, duration) {
  const dt = slotDate(s);
  return L(lang).long(
    dt.getDate(), L(lang).mon[dt.getMonth()], dt.getFullYear(),
    s.h, endTime(s.h, duration), L(lang).dow[dt.getDay()]
  );
}

export function fmtDateTime(lang, iso) {
  if (!iso) return "";
  const dt = new Date(iso);
  return `${L(lang).dow[dt.getDay()]} ${dt.getDate()} ${L(lang).mon[dt.getMonth()]} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

export function sortSlots(slots) {
  return slots
    .map((s, i) => ({ s, i }))
    .sort((a, b) => (a.s.d + a.s.h < b.s.d + b.s.h ? -1 : 1));
}

export function tallies(poll, invitees) {
  return poll.slots.map((_, i) => {
    let yes = 0, no = 0, none = 0;
    for (const inv of invitees) {
      const v = inv.answers ? inv.answers[i] || 0 : 0;
      if (v === 1) yes++;
      else if (v === 2) no++;
      else none++;
    }
    return { i, yes, no, none };
  });
}

export function bestIndex(poll, invitees) {
  const answered = invitees.filter(i => i.answers);
  if (!answered.length) return -1;
  const t = [...tallies(poll, invitees)].sort((a, b) => {
    if (b.yes !== a.yes) return b.yes - a.yes;
    if (a.no !== b.no) return a.no - b.no;
    return a.i - b.i;
  });
  return t[0].yes > 0 ? t[0].i : -1;
}

export function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function parsePeople(raw) {
  const out = [];
  const seen = new Set();
  for (const line of String(raw || "").split(/[\n;]+/)) {
    const s = line.trim();
    if (!s) continue;
    const m = s.match(/([^\s<,;]+@[^\s>,;]+)/);
    if (!m) continue;
    const email = m[1].toLowerCase().replace(/[.,;>]+$/, "");
    if (seen.has(email)) continue;
    seen.add(email);
    let name = s.replace(m[0], "").replace(/[<>,;"]/g, "").trim();
    if (!name) name = email.split("@")[0].replace(/[._-]+/g, " ");
    out.push({ name, email });
  }
  return out;
}

// Arredonda para o quarto de hora mais próximo: 10:07 -> 10:00, 10:08 -> 10:15.
export function snap15(h) {
  const [hh, mm] = h.split(":").map(Number);
  let total = Math.round((hh * 60 + mm) / 15) * 15;
  if (total > 23 * 60 + 45) total = 23 * 60 + 45;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

export function parseSlots(rawDates, rawTimes) {
  const ds = [].concat(rawDates || []);
  const ts = [].concat(rawTimes || []);
  const out = [];
  for (let i = 0; i < ds.length; i++) {
    const d = String(ds[i] || "").trim();
    const h = String(ts[i] || "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(d) && /^\d{2}:\d{2}$/.test(h)) out.push({ d, h: snap15(h) });
  }
  return out.sort((a, b) => (a.d + a.h < b.d + b.h ? -1 : 1));
}
