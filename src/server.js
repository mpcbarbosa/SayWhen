import express from "express";
import { getStore } from "./store.js";
import { sendMail, mailEnabled } from "./mail.js";
import { t } from "./i18n.js";
import {
  token as makeToken, id as makeId, fmtLong, fmtDay, parsePeople, parseSlots,
  sortSlots, tallies, bestIndex, TIMEZONES, DEFAULT_TZ, tzLabel, snap15, pickLang
} from "./util.js";
import { loginPage, adminHome, adminDraft, adminEdit, adminPoll, participantPage, simplePage } from "./views.js";
import { buildIcs } from "./ics.js";

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
  const place = poll.place ? `, ${poll.place}` : "";
  const sent = [];
  for (const inv of invitees) {
    // O email vai na língua da sondagem; a página abre na língua do browser.
    const lang = inv.lang || poll.lang;
    const opts = slotLines(lang, poll) +
      `\n\n${t(lang, "tzNote", { tz: tzLabel(poll.tz || DEFAULT_TZ) })}`;
    const link = `${base}/v/${inv.token}`;
    const r = await sendMail({
      to: inv.email,
      replyTo: poll.organizerEmail,
      cta: { url: link, label: t(lang, "ctaLabel") },
      subject: t(lang, "inviteSubject", { t: poll.title }),
      text: t(lang, "inviteBody", {
        n: inv.name, t: poll.title, link,
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

  const extraLines = [];
  if ((invitee.note || "").trim()) extraLines.push(`\nNota: ${invitee.note.trim()}`);
  if ((invitee.suggestions || []).length) {
    extraLines.push("\nSugeriu: " + invitee.suggestions
      .map(sg => fmtLong(lang, sg, poll.duration)).join("; "));
  }

  const all = answered === invitees.length;
  await sendMail({
    to: poll.organizerEmail,
    subject: t(lang, all ? "allInSubject" : "notifySubject", { n: invitee.name, t: poll.title }),
    text: t(lang, "notifyBody", {
      n: invitee.name, e: invitee.email, t: poll.title, answers: lines,
      a: answered, total: invitees.length, extra: extraLines.join("\n"),
      best: best >= 0 ? fmtLong(lang, poll.slots[best], poll.duration) : "—",
      link: `${base}/admin/polls/${poll.id}`
    })
  });
}


// Lê o formulário de sondagem (criação e edição de rascunho).
function readPollForm(b) {
  return {
    title: String(b.title || "").slice(0, 200),
    duration: Number(b.duration) || 60,
    place: String(b.place || "").slice(0, 200),
    lang: ["pt", "es", "en"].includes(b.lang) ? b.lang : "pt",
    tz: TIMEZONES.some(([id]) => id === b.tz) ? b.tz : DEFAULT_TZ,
    organizerName: String(b.organizerName || "").slice(0, 120),
    organizerEmail: String(b.organizerEmail || "").slice(0, 200),
    slots: parseSlots(b.date, b.time)
  };
}

// Junta o organizador à lista, se ele quiser participar.
function withOrganizer(people, poll, selfJoin) {
  const email = (poll.organizerEmail || "").toLowerCase();
  if (!selfJoin || !email || people.some(p => p.email === email)) return people;
  return [{ name: poll.organizerName || email, email }, ...people];
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
  const draft = b.action === "draft";
  const fields = readPollForm(b);
  if (!draft && (!fields.title || !fields.slots.length || !parsePeople(b.people).length)) {
    return res.status(400).send(simplePage(UI_LANG, t(UI_LANG, "draftIncomplete")));
  }
  const poll = { id: makeId(), ...fields, status: draft ? "draft" : "open" };
  const people = withOrganizer(parsePeople(b.people), poll, Boolean(b.selfJoin));
  const invitees = people.map(p => ({ ...p, token: makeToken() }));
  await store.createPoll(poll, invitees);

  if (draft) {
    return res.redirect(`/admin/polls/${poll.id}?ok=${encodeURIComponent(t(UI_LANG, "draftSaved"))}`);
  }
  const n = await sendInvites(poll, invitees, baseUrl(req));
  const msg = mailEnabled()
    ? `${n}/${invitees.length} convites enviados.`
    : `Sondagem criada. Envio de email desligado — usa "Convidar pelo meu email" na lista.`;
  res.redirect(`/admin/polls/${poll.id}?ok=${encodeURIComponent(msg)}`);
});

app.get("/admin/polls/:id/edit", requireAdmin, async (req, res) => {
  const poll = await store.getPoll(req.params.id);
  if (!poll) return res.redirect("/admin");
  const invitees = await store.getInvitees(poll.id);
  if (poll.status === "draft") return res.redirect(`/admin/polls/${poll.id}`);
  res.send(adminEdit(UI_LANG, poll, invitees, req.query.ok || ""));
});

// Guardar ou publicar um rascunho, ou editar uma sondagem já publicada.
app.post("/admin/polls/:id/update", requireAdmin, async (req, res) => {
  const poll = await store.getPoll(req.params.id);
  if (!poll) return res.redirect("/admin");

  const b = req.body;
  const publish = b.action === "publish";
  const fields = readPollForm(b);
  const people = withOrganizer(parsePeople(b.people), fields, Boolean(b.selfJoin));

  if (publish && (!fields.title || !fields.slots.length || !people.length)) {
    return res.status(400).send(simplePage(UI_LANG, t(UI_LANG, "draftIncomplete")));
  }

  /* ---- rascunho: nada a preservar, escreve-se por cima ---- */
  if (poll.status === "draft") {
    await store.updatePoll(poll.id, { ...fields, status: publish ? "open" : "draft" });
    const invitees = people.map(p => ({ ...p, token: makeToken() }));
    await store.replaceInvitees(poll.id, invitees);
    if (!publish) {
      return res.redirect(`/admin/polls/${poll.id}?ok=${encodeURIComponent(t(UI_LANG, "draftSaved"))}`);
    }
    const full = { ...poll, ...fields, status: "open" };
    const n = await sendInvites(full, invitees, baseUrl(req));
    const msg = mailEnabled()
      ? `${n}/${invitees.length} convites enviados.`
      : `Sondagem publicada. Envio de email desligado — usa "Convidar pelo meu email" na lista.`;
    return res.redirect(`/admin/polls/${poll.id}?ok=${encodeURIComponent(msg)}`);
  }

  /* ---- sondagem publicada: preservar respostas ---- */
  const existing = await store.getInvitees(poll.id);
  const key = (s) => `${s.d} ${s.h}`;
  const oldKeys = poll.slots.map(key);
  const newKeys = fields.slots.map(key);
  // Para cada horário novo, onde estava antes (ou -1 se é novo).
  const map = newKeys.map(k => oldKeys.indexOf(k));
  const slotsChanged = oldKeys.join("|") !== newKeys.join("|");

  await store.updatePoll(poll.id, { ...fields, status: "open" });

  // Pessoas: manter quem fica (com respostas e link), acrescentar novas, remover as que saíram.
  const wanted = new Map(people.map(p => [p.email, p]));
  const removed = existing.filter(i => !wanted.has(i.email.toLowerCase()));
  const kept = existing.filter(i => wanted.has(i.email.toLowerCase()));
  const fresh = people.filter(p => !existing.some(i => i.email.toLowerCase() === p.email));

  if (removed.length) await store.removeInvitees(removed.map(i => i.token));
  const added = fresh.map(p => ({ ...p, token: makeToken() }));
  if (added.length) await store.addInvitees(poll.id, added);

  // Remapear as respostas de quem fica.
  let affected = 0;
  if (slotsChanged) {
    for (const inv of kept) {
      if (!inv.answers) continue;
      const next = map.map(oldIdx => (oldIdx >= 0 ? (inv.answers[oldIdx] || 0) : 0));
      const lost = inv.answers.some((v, i) => v > 0 && !map.includes(i));
      const gained = next.some((v, i) => v === 0 && map[i] < 0);
      if (lost || gained) affected++;
      await store.setAnswers(inv.token, next);
    }
  }

  // O horário escolhido pode ter desaparecido.
  let chosenGone = false;
  if (poll.chosenSlot != null) {
    const newIdx = map.indexOf(poll.chosenSlot);
    if (newIdx < 0) { chosenGone = true; await store.setClosed(poll.id, false, null); }
    else if (newIdx !== poll.chosenSlot) await store.setClosed(poll.id, poll.closed, newIdx);
  }

  const parts = [t(UI_LANG, "editSaved")];
  if (added.length) parts.push(t(UI_LANG, "addedN", { n: added.length }));
  if (removed.length) parts.push(t(UI_LANG, "editRemoved", { n: removed.length }));
  if (affected) parts.push(t(UI_LANG, "editAffected", { n: affected }));
  if (chosenGone) parts.push(t(UI_LANG, "editChosenGone"));
  if (added.length && mailEnabled()) {
    const full = { ...poll, ...fields };
    await sendInvites(full, added, baseUrl(req));
  }
  res.redirect(`/admin/polls/${poll.id}?ok=${encodeURIComponent(parts.join(" "))}`);
});

app.get("/admin/polls/:id", requireAdmin, async (req, res) => {
  const poll = await store.getPoll(req.params.id);
  if (!poll) return res.status(404).send(simplePage(UI_LANG, "Sondagem não encontrada."));
  const invitees = await store.getInvitees(poll.id);
  if (poll.status === "draft") {
    return res.send(adminDraft(UI_LANG, poll, invitees, req.query.ok || ""));
  }
  res.send(adminPoll(UI_LANG, poll, invitees, baseUrl(req), req.query.ok || "", mailEnabled()));
});

app.post("/admin/polls/:id/remind", requireAdmin, async (req, res) => {
  const poll = await store.getPoll(req.params.id);
  if (!poll) return res.redirect("/admin");
  const invitees = await store.getInvitees(poll.id);
  const pending = invitees.filter(i => !i.answeredAt);
  const n = await sendInvites(poll, pending, baseUrl(req));
  res.redirect(`/admin/polls/${poll.id}?ok=${encodeURIComponent(t(UI_LANG, "reminded", { n }))}`);
});

app.post("/admin/polls/:id/people", requireAdmin, async (req, res) => {
  const poll = await store.getPoll(req.params.id);
  if (!poll) return res.redirect("/admin");
  const existing = await store.getInvitees(poll.id);
  const known = new Set(existing.map(i => i.email.toLowerCase()));
  const fresh = parsePeople(req.body.people).filter(p => !known.has(p.email));
  if (!fresh.length) {
    return res.redirect(`/admin/polls/${poll.id}?ok=${encodeURIComponent(t(UI_LANG, "addedNone"))}`);
  }
  const invitees = fresh.map(p => ({ ...p, token: makeToken() }));
  await store.addInvitees(poll.id, invitees);
  let msg = t(UI_LANG, "addedN", { n: invitees.length });
  if (mailEnabled()) {
    const n = await sendInvites(poll, invitees, baseUrl(req));
    msg += ` ${n}/${invitees.length} convites enviados.`;
  }
  res.redirect(`/admin/polls/${poll.id}?ok=${encodeURIComponent(msg)}`);
});

app.post("/admin/polls/:id/join", requireAdmin, async (req, res) => {
  const poll = await store.getPoll(req.params.id);
  if (!poll || !poll.organizerEmail) return res.redirect("/admin");
  const email = poll.organizerEmail.toLowerCase();
  const existing = await store.getInvitees(poll.id);
  if (!existing.some(i => i.email.toLowerCase() === email)) {
    await store.addInvitees(poll.id, [{
      name: poll.organizerName || email, email, token: makeToken()
    }]);
  }
  res.redirect(`/admin/polls/${poll.id}?ok=${encodeURIComponent(t(UI_LANG, "joined"))}`);
});

app.post("/admin/polls/:id/adopt", requireAdmin, async (req, res) => {
  const poll = await store.getPoll(req.params.id);
  if (!poll) return res.redirect("/admin");
  const d = String(req.body.d || ""), h = String(req.body.h || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !/^\d{2}:\d{2}$/.test(h)) {
    return res.redirect(`/admin/polls/${poll.id}`);
  }
  const slot = { d, h: snap15(h) };
  const key = (x) => `${x.d} ${x.h}`;
  if (poll.slots.some(x => key(x) === key(slot))) {
    return res.redirect(`/admin/polls/${poll.id}?ok=${encodeURIComponent(t(UI_LANG, "adoptDup"))}`);
  }

  const invitees = await store.getInvitees(poll.id);
  const oldKeys = poll.slots.map(key);
  const nextSlots = [...poll.slots, slot].sort((a, b) => (a.d + a.h < b.d + b.h ? -1 : 1));
  const newKeys = nextSlots.map(key);
  const map = newKeys.map(k => oldKeys.indexOf(k));

  await store.updatePoll(poll.id, {
    title: poll.title, duration: poll.duration, place: poll.place, lang: poll.lang,
    tz: poll.tz, organizerName: poll.organizerName, organizerEmail: poll.organizerEmail,
    slots: nextSlots, status: poll.status
  });

  const newIdx = newKeys.indexOf(key(slot));
  for (const inv of invitees) {
    const suggested = (inv.suggestions || []).some(sg => key(sg) === key(slot));
    if (!inv.answers && !suggested) continue;
    const base = inv.answers || poll.slots.map(() => 0);
    const next = map.map(oldIdx => (oldIdx >= 0 ? (base[oldIdx] || 0) : 0));
    // Quem sugeriu o horário fica logo com Sim — foi ele que o propôs.
    if (suggested) next[newIdx] = 1;
    await store.setAnswers(inv.token, next);
    if (suggested) await store.clearSuggestion(inv.token, slot);
  }

  if (poll.chosenSlot != null) {
    const moved = map.indexOf(poll.chosenSlot);
    if (moved >= 0 && moved !== poll.chosenSlot) await store.setClosed(poll.id, poll.closed, moved);
  }

  const msg = t(UI_LANG, "adopted", { s: fmtLong(poll.lang, slot, poll.duration) });
  res.redirect(`/admin/polls/${poll.id}?ok=${encodeURIComponent(msg)}`);
});

app.post("/admin/polls/:id/close", requireAdmin, async (req, res) => {
  const poll = await store.getPoll(req.params.id);
  if (!poll) return res.redirect("/admin");
  const closed = req.body.closed === "1";
  const slot = closed ? Number(req.body.slot) : null;
  await store.setClosed(poll.id, closed, Number.isInteger(slot) && slot >= 0 ? slot : null);
  res.redirect(`/admin/polls/${poll.id}`);
});

app.get("/admin/polls/:id/ics", requireAdmin, async (req, res) => {
  const poll = await store.getPoll(req.params.id);
  if (!poll) return res.status(404).send(simplePage(UI_LANG, "Sondagem não encontrada."));
  const invitees = await store.getInvitees(poll.id);
  const slot = poll.chosenSlot != null ? poll.chosenSlot : bestIndex(poll, invitees);
  if (slot == null || slot < 0 || !poll.slots[slot]) {
    return res.status(400).send(simplePage(UI_LANG, t(UI_LANG, "tNotEnough") || "Sem horário escolhido."));
  }
  const ics = buildIcs(poll, slot, invitees, `${baseUrl(req)}/admin/polls/${poll.id}`);
  const name = (poll.title || "reuniao").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "reuniao";
  res.setHeader("Content-Type", "text/calendar; charset=utf-8; method=REQUEST");
  res.setHeader("Content-Disposition", `attachment; filename="${name}.ics"`);
  res.send(ics);
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
  // Escolha na própria página > língua do browser > língua da sondagem.
  const lang = ["pt", "es", "en"].includes(req.query.lang)
    ? req.query.lang
    : (inv.lang || pickLang(req.headers["accept-language"], poll.lang));
  if (poll.status === "draft") {
    return res.status(404).send(simplePage(lang, t(lang, "notOpenYet"), "info"));
  }
  res.send(participantPage(lang, poll, inv, { admin: isAdmin(req) }));
});

app.post("/v/:token", async (req, res) => {
  const inv = await store.getInviteeByToken(req.params.token);
  if (!inv) return res.status(404).json({ error: "unknown token" });
  const poll = await store.getPoll(inv.pollId);
  if (!poll) return res.status(404).json({ error: "unknown poll" });
  if (poll.closed || poll.status === "draft") return res.status(409).json({ error: "closed" });

  const raw = Array.isArray(req.body.answers) ? req.body.answers : [];
  const answers = poll.slots.map((_, i) => {
    const v = Number(raw[i]);
    return v === 1 || v === 2 ? v : 0;
  });
  const note = String(req.body.note || "").slice(0, 600).trim();
  const suggestions = (Array.isArray(req.body.suggestions) ? req.body.suggestions : [])
    .filter(x => x && /^\d{4}-\d{2}-\d{2}$/.test(x.d) && /^\d{2}:\d{2}$/.test(x.h))
    .map(x => ({ d: x.d, h: snap15(x.h) }))
    .filter((x, i, arr) => arr.findIndex(y => y.d === x.d && y.h === x.h) === i)
    .slice(0, 3);

  await store.saveAnswers(inv.token, answers, note, suggestions);
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
