import express from "express";
import { getStore } from "./store.js";
import { sendMail, mailEnabled } from "./mail.js";
import { t } from "./i18n.js";
import {
  token as makeToken, id as makeId, fmtLong, fmtDay, parsePeople, parseSlots,
  sortSlots, tallies, bestIndex
} from "./util.js";
import { loginPage, adminHome, adminPoll, participantPage, simplePage } from "./views.js";

const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || "";
const UI_LANG = process.env.UI_LANG || "pt";
const COOKIE = "qp_admin";

const app = express();
app.disable("x-powered-by");
app.use(express.urlencoded({ extended: false, limit: "256kb" }));
app.use(express.json({ limit: "256kb" }));

const store = await getStore();

/* ------------------------------------------------------------ helpers */
function baseUrl(req) {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/+$/, "");
  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  return `${proto}://${req.headers.host}`;
}

function cookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function isAdmin(req) {
  if (!ADMIN_KEY) return true; // no key configured: local development
  return cookies(req)[COOKIE] === ADMIN_KEY;
}

function requireAdmin(req, res, next) {
  if (isAdmin(req)) return next();
  res.status(401).send(loginPage(UI_LANG, false));
}

function slotLines(lang, poll) {
  return sortSlots(poll.slots).map(({ s }) => `  · ${fmtLong(lang, s, poll.duration)}`).join("\n");
}

async function sendInvites(poll, invitees, base) {
  const lang = poll.lang;
  const opts = slotLines(lang, poll);
  const place = poll.place ? `, ${poll.place}` : "";
  const sent = [];
  for (const inv of invitees) {
    const r = await sendMail({
      to: inv.email,
      replyTo: poll.organizerEmail,
      subject: t(lang, "inviteSubject", { t: poll.title }),
      text: t(lang, "inviteBody", {
        n: inv.name, t: poll.title, link: `${base}/v/${inv.token}`,
        d: poll.duration, p: place, opts, o: poll.organizerName || ""
      })
    });
    if (r.ok) sent.push(inv.token);
  }
  if (sent.length) await store.markInvited(sent);
  return sent.length;
}

async function notifyOrganizer(poll, invitee, invitees, base) {
  const lang = poll.lang;
  const answered = invitees.filter(i => i.answers).length;
  const best = bestIndex(poll, invitees);
  const lines = sortSlots(poll.slots).map(({ s, i }) => {
    const v = invitee.answers ? invitee.answers[i] || 0 : 0;
    return `  · ${fmtDay(lang, s)} ${s.h} — ${v === 1 ? t(lang, "ansYes") : v === 2 ? t(lang, "ansNo") : t(lang, "ansNone")}`;
  }).join("\n");

  const all = answered === invitees.length;
  await sendMail({
    to: poll.organizerEmail,
    subject: t(lang, all ? "allInSubject" : "notifySubject", { n: invitee.name, t: poll.title }),
    text: t(lang, "notifyBody", {
      n: invitee.name, e: invitee.email, t: poll.title, answers: lines,
      a: answered, total: invitees.length,
      best: best >= 0 ? fmtLong(lang, poll.slots[best], poll.duration) : "—",
      link: `${base}/admin/polls/${poll.id}`
    })
  });
}

/* -------------------------------------------------------------- admin */
app.get("/", (req, res) => res.redirect("/admin"));

app.get("/healthz", (req, res) => res.json({ ok: true, store: store.kind, mail: mailEnabled() }));

app.post("/admin/login", (req, res) => {
  if (ADMIN_KEY && req.body.key === ADMIN_KEY) {
    res.setHeader("Set-Cookie",
      `${COOKIE}=${encodeURIComponent(ADMIN_KEY)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
    return res.redirect("/admin");
  }
  res.status(401).send(loginPage(UI_LANG, true));
});

app.get("/admin/logout", (req, res) => {
  res.setHeader("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  res.redirect("/admin");
});

app.get("/admin", requireAdmin, async (req, res) => {
  const polls = await store.listPolls();
  res.send(adminHome(UI_LANG, polls, req.query.ok || ""));
});

app.post("/admin/polls", requireAdmin, async (req, res) => {
  const b = req.body;
  const slots = parseSlots(b.date, b.time);
  const people = parsePeople(b.people);
  if (!b.title || !slots.length || !people.length) {
    return res.status(400).send(simplePage(UI_LANG, "Faltam dados: assunto, horários ou convidados."));
  }
  const poll = {
    id: makeId(),
    title: String(b.title).slice(0, 200),
    duration: Number(b.duration) || 60,
    place: String(b.place || "").slice(0, 200),
    lang: ["pt", "es", "en"].includes(b.lang) ? b.lang : "pt",
    organizerName: String(b.organizerName || "").slice(0, 120),
    organizerEmail: String(b.organizerEmail || "").slice(0, 200),
    slots
  };
  const invitees = people.map(p => ({ ...p, token: makeToken() }));
  await store.createPoll(poll, invitees);
  const n = await sendInvites(poll, invitees, baseUrl(req));
  const msg = mailEnabled()
    ? `${n}/${invitees.length} convites enviados.`
    : `Sondagem criada. Envio de email desligado (falta RESEND_API_KEY) — copia os links pessoais na lista.`;
  res.redirect(`/admin/polls/${poll.id}?ok=${encodeURIComponent(msg)}`);
});

app.get("/admin/polls/:id", requireAdmin, async (req, res) => {
  const poll = await store.getPoll(req.params.id);
  if (!poll) return res.status(404).send(simplePage(UI_LANG, "Sondagem não encontrada."));
  const invitees = await store.getInvitees(poll.id);
  res.send(adminPoll(UI_LANG, poll, invitees, baseUrl(req), req.query.ok || ""));
});

app.post("/admin/polls/:id/remind", requireAdmin, async (req, res) => {
  const poll = await store.getPoll(req.params.id);
  if (!poll) return res.redirect("/admin");
  const invitees = await store.getInvitees(poll.id);
  const pending = invitees.filter(i => !i.answeredAt);
  const n = await sendInvites(poll, pending, baseUrl(req));
  res.redirect(`/admin/polls/${poll.id}?ok=${encodeURIComponent(t(UI_LANG, "reminded", { n }))}`);
});

app.post("/admin/polls/:id/close", requireAdmin, async (req, res) => {
  const poll = await store.getPoll(req.params.id);
  if (!poll) return res.redirect("/admin");
  const closed = req.body.closed === "1";
  const slot = closed ? Number(req.body.slot) : null;
  await store.setClosed(poll.id, closed, Number.isInteger(slot) && slot >= 0 ? slot : null);
  res.redirect(`/admin/polls/${poll.id}`);
});

app.post("/admin/polls/:id/delete", requireAdmin, async (req, res) => {
  await store.deletePoll(req.params.id);
  res.redirect("/admin");
});

/* -------------------------------------------------------- participant */
app.get("/v/:token", async (req, res) => {
  const inv = await store.getInviteeByToken(req.params.token);
  if (!inv) return res.status(404).send(simplePage(UI_LANG, t(UI_LANG, "badToken")));
  const poll = await store.getPoll(inv.pollId);
  if (!poll) return res.status(404).send(simplePage(UI_LANG, t(UI_LANG, "badToken")));
  res.send(participantPage(poll.lang, poll, inv));
});

app.post("/v/:token", async (req, res) => {
  const inv = await store.getInviteeByToken(req.params.token);
  if (!inv) return res.status(404).json({ error: "unknown token" });
  const poll = await store.getPoll(inv.pollId);
  if (!poll) return res.status(404).json({ error: "unknown poll" });
  if (poll.closed) return res.status(409).json({ error: "closed" });

  const raw = Array.isArray(req.body.answers) ? req.body.answers : [];
  const answers = poll.slots.map((_, i) => {
    const v = Number(raw[i]);
    return v === 1 || v === 2 ? v : 0;
  });

  await store.saveAnswers(inv.token, answers);
  const invitees = await store.getInvitees(poll.id);
  const fresh = invitees.find(i => i.token === inv.token) || { ...inv, answers };
  notifyOrganizer(poll, fresh, invitees, baseUrl(req)).catch(e => console.error("[notify]", e.message));
  res.json({ ok: true });
});

app.use((req, res) => res.status(404).send(simplePage(UI_LANG, "404")));

app.listen(PORT, () => {
  console.log(`[quando-podemos] http://localhost:${PORT}  store=${store.kind}  mail=${mailEnabled() ? "on" : "off"}`);
  if (!ADMIN_KEY) console.warn("[warn] ADMIN_KEY não definido — a área do organizador está aberta a qualquer pessoa.");
});
