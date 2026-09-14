// Two interchangeable drivers, chosen by the environment:
//   DATABASE_URL set  -> PostgreSQL (Render Postgres, Neon, Supabase, ...)
//   otherwise         -> a JSON file under DATA_DIR (good for local dev; on a
//                        host without a persistent disk it resets on redeploy)
import fs from "node:fs/promises";
import path from "node:path";

const DATABASE_URL = process.env.DATABASE_URL || "";
const DATA_DIR = process.env.DATA_DIR || "./data";

let driver = null;

/* ------------------------------------------------------------------ pg */
async function pgDriver() {
  const { default: pg } = await import("pg");
  const needsSsl = !/localhost|127\.0\.0\.1/.test(DATABASE_URL);
  const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: needsSsl ? { rejectUnauthorized: false } : false,
    max: 5
  });

  await pool.query(`
    create table if not exists polls (
      id text primary key,
      title text not null,
      duration integer not null,
      place text,
      lang text not null default 'pt',
      tz text not null default 'Europe/Lisbon',
      organizer_name text,
      organizer_email text,
      slots jsonb not null,
      created_at timestamptz not null default now(),
      closed boolean not null default false,
      chosen_slot integer,
      status text not null default 'open'
    );
    create table if not exists invitees (
      token text primary key,
      poll_id text not null references polls(id) on delete cascade,
      name text not null,
      email text not null,
      lang text,
      answers jsonb,
      note text,
      suggestions jsonb,
      answered_at timestamptz,
      invited_at timestamptz
    );
    create index if not exists invitees_poll_idx on invitees(poll_id);
    alter table polls add column if not exists tz text not null default 'Europe/Lisbon';
    alter table polls add column if not exists status text not null default 'open';
    alter table invitees add column if not exists note text;
    alter table invitees add column if not exists suggestions jsonb;
    alter table invitees add column if not exists lang text;

    create table if not exists contacts (
      id text primary key,
      name text not null,
      email text not null,
      lang text,
      created_at timestamptz not null default now()
    );
    create unique index if not exists contacts_email_idx on contacts(lower(email));
    -- Uma pessoa pode ter vários endereços (mbarbosa@seidor.es e .com).
    create table if not exists contact_emails (
      email text primary key,
      contact_id text not null references contacts(id) on delete cascade
    );
    create index if not exists contact_emails_contact_idx on contact_emails(contact_id);

    create table if not exists contact_groups (
      id text primary key,
      name text not null,
      created_at timestamptz not null default now()
    );
    -- Pares que o organizador já disse não serem a mesma pessoa.
    create table if not exists contact_distinct (
      a text not null,
      b text not null,
      primary key (a, b)
    );
    create table if not exists contact_group_members (
      group_id text not null references contact_groups(id) on delete cascade,
      contact_id text not null references contacts(id) on delete cascade,
      primary key (group_id, contact_id)
    );
  `);

  const rowToPoll = (r) => ({
    id: r.id, title: r.title, duration: r.duration, place: r.place, lang: r.lang, tz: r.tz,
    organizerName: r.organizer_name, organizerEmail: r.organizer_email,
    slots: r.slots, createdAt: r.created_at, closed: r.closed, chosenSlot: r.chosen_slot,
    status: r.status || "open"
  });
  const rowToInvitee = (r) => ({
    token: r.token, pollId: r.poll_id, name: r.name, email: r.email, lang: r.lang || null,
    answers: r.answers, note: r.note || "", suggestions: r.suggestions || [],
    answeredAt: r.answered_at, invitedAt: r.invited_at
  });

  return {
    kind: "postgres",
    async createPoll(poll, invitees) {
      const c = await pool.connect();
      try {
        await c.query("begin");
        await c.query(
          `insert into polls (id,title,duration,place,lang,tz,organizer_name,organizer_email,slots,status)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [poll.id, poll.title, poll.duration, poll.place, poll.lang, poll.tz,
           poll.organizerName, poll.organizerEmail, JSON.stringify(poll.slots), poll.status || "open"]
        );
        for (const i of invitees) {
          await c.query(
            `insert into invitees (token,poll_id,name,email,lang) values ($1,$2,$3,$4,$5)`,
            [i.token, poll.id, i.name, i.email, i.lang || null]
          );
        }
        await c.query("commit");
      } catch (e) {
        await c.query("rollback");
        throw e;
      } finally {
        c.release();
      }
    },
    async addInvitees(pollId, invitees) {
      for (const i of invitees) {
        await pool.query(
          `insert into invitees (token,poll_id,name,email,lang) values ($1,$2,$3,$4,$5)
           on conflict (token) do nothing`,
          [i.token, pollId, i.name, i.email, i.lang || null]
        );
      }
    },
    async updatePoll(pollId, f) {
      await pool.query(
        `update polls set title=$2, duration=$3, place=$4, lang=$5, tz=$6,
         organizer_name=$7, organizer_email=$8, slots=$9, status=$10 where id=$1`,
        [pollId, f.title, f.duration, f.place, f.lang, f.tz,
         f.organizerName, f.organizerEmail, JSON.stringify(f.slots), f.status]
      );
    },
    // Só usado em rascunhos, onde ainda não há respostas a preservar.
    async replaceInvitees(pollId, invitees) {
      await pool.query("delete from invitees where poll_id=$1", [pollId]);
      for (const i of invitees) {
        await pool.query(
          `insert into invitees (token,poll_id,name,email,lang) values ($1,$2,$3,$4,$5)`,
          [i.token, pollId, i.name, i.email, i.lang || null]
        );
      }
    },
    async listPolls() {
      const { rows } = await pool.query(`
        select p.*, count(i.token) filter (where i.answered_at is not null) as answered,
               count(i.token) as total
        from polls p left join invitees i on i.poll_id = p.id
        group by p.id order by p.created_at desc`);
      return rows.map(r => ({ ...rowToPoll(r), answered: Number(r.answered), total: Number(r.total) }));
    },
    async getPoll(id) {
      const { rows } = await pool.query("select * from polls where id=$1", [id]);
      return rows[0] ? rowToPoll(rows[0]) : null;
    },
    async getInvitees(pollId) {
      const { rows } = await pool.query(
        "select * from invitees where poll_id=$1 order by name asc", [pollId]);
      return rows.map(rowToInvitee);
    },
    async getInviteeByToken(token) {
      const { rows } = await pool.query("select * from invitees where token=$1", [token]);
      return rows[0] ? rowToInvitee(rows[0]) : null;
    },
    async saveAnswers(token, answers, note = "", suggestions = []) {
      await pool.query(
        `update invitees set answers=$2, note=$3, suggestions=$4, answered_at=now()
         where token=$1`,
        [token, JSON.stringify(answers), note, JSON.stringify(suggestions)]);
    },
    async clearSuggestion(token, slot) {
      const { rows } = await pool.query("select suggestions from invitees where token=$1", [token]);
      const left = (rows[0]?.suggestions || []).filter(s => !(s.d === slot.d && s.h === slot.h));
      await pool.query("update invitees set suggestions=$2 where token=$1",
        [token, JSON.stringify(left)]);
    },
    // Reescreve respostas sem mexer na data em que foram dadas.
    async setAnswers(token, answers) {
      await pool.query("update invitees set answers=$2 where token=$1",
        [token, JSON.stringify(answers)]);
    },
    async removeInvitees(tokens) {
      if (!tokens.length) return;
      await pool.query("delete from invitees where token = any($1)", [tokens]);
    },
    async markInvited(tokens) {
      if (!tokens.length) return;
      await pool.query("update invitees set invited_at=now() where token = any($1)", [tokens]);
    },
    async setClosed(pollId, closed, chosenSlot) {
      await pool.query("update polls set closed=$2, chosen_slot=$3 where id=$1",
        [pollId, closed, chosenSlot]);
    },
    async deletePoll(pollId) {
      await pool.query("delete from invitees where poll_id=$1", [pollId]);
      await pool.query("delete from polls where id=$1", [pollId]);
    },

    /* ------------------------------------------------------ contactos */
    async listContacts() {
      const { rows } = await pool.query(`
        select c.*, coalesce(array_agg(e.email) filter (where e.email is not null), '{}') as emails
        from contacts c left join contact_emails e on e.contact_id = c.id
        group by c.id order by c.name asc`);
      return rows.map(r => ({
        id: r.id, name: r.name, email: r.email, lang: r.lang || null,
        emails: [...new Set([r.email.toLowerCase(), ...(r.emails || [])])]
      }));
    },
    async addContact(c) {
      await pool.query(
        `insert into contacts (id,name,email,lang) values ($1,$2,$3,$4)
         on conflict do nothing`,
        [c.id, c.name, c.email, c.lang || null]);
      await pool.query(
        `insert into contact_emails (email,contact_id) values ($1,$2)
         on conflict (email) do nothing`, [c.email, c.id]);
    },
    async updateContact(id, f) {
      await pool.query("update contacts set name=$2, email=$3, lang=$4 where id=$1",
        [id, f.name, f.email, f.lang || null]);
      await pool.query(
        `insert into contact_emails (email,contact_id) values ($1,$2)
         on conflict (email) do update set contact_id=excluded.contact_id`, [f.email, id]);
    },
    async addContactEmail(contactId, email) {
      await pool.query(
        `insert into contact_emails (email,contact_id) values ($1,$2)
         on conflict (email) do update set contact_id=excluded.contact_id`, [email, contactId]);
    },
    async removeContactEmail(email) {
      await pool.query("delete from contact_emails where email=$1", [email]);
    },
    async deleteContact(id) {
      await pool.query("delete from contacts where id=$1", [id]);
    },
    async listGroups() {
      const { rows } = await pool.query(`
        select g.*, coalesce(array_agg(m.contact_id) filter (where m.contact_id is not null), '{}') as members
        from contact_groups g left join contact_group_members m on m.group_id = g.id
        group by g.id order by g.name asc`);
      return rows.map(r => ({ id: r.id, name: r.name, members: r.members || [] }));
    },
    async saveGroup(g) {
      await pool.query(
        `insert into contact_groups (id,name) values ($1,$2)
         on conflict (id) do update set name=excluded.name`, [g.id, g.name]);
    },
    // Quem pertence a quê decide-se na ficha da pessoa, não na do grupo.
    async setContactGroups(contactId, groupIds) {
      await pool.query("delete from contact_group_members where contact_id=$1", [contactId]);
      for (const gid of groupIds) {
        await pool.query(
          `insert into contact_group_members (group_id,contact_id) values ($1,$2)
           on conflict do nothing`, [gid, contactId]);
      }
    },
    async deleteGroup(id) {
      await pool.query("delete from contact_groups where id=$1", [id]);
    },
    async listDistinct() {
      const { rows } = await pool.query("select a,b from contact_distinct");
      return rows.map(r => `${r.a}|${r.b}`);
    },
    async addDistinct(a, b) {
      const [x, y] = [a, b].sort();
      await pool.query(
        "insert into contact_distinct (a,b) values ($1,$2) on conflict do nothing", [x, y]);
    }
  };
}

/* ---------------------------------------------------------------- file */
async function fileDriver() {
  const file = path.join(DATA_DIR, "db.json");
  await fs.mkdir(DATA_DIR, { recursive: true });

  let db = { polls: {}, invitees: {}, contacts: {}, contactEmails: {}, groups: {}, distinct: {} };
  try {
    db = JSON.parse(await fs.readFile(file, "utf8"));
    db.polls ||= {}; db.invitees ||= {};
    db.contacts ||= {}; db.contactEmails ||= {}; db.groups ||= {}; db.distinct ||= {};
  } catch { /* first run */ }

  let queue = Promise.resolve();
  const flush = () => {
    queue = queue.then(() => fs.writeFile(file, JSON.stringify(db, null, 2), "utf8"));
    return queue;
  };

  return {
    kind: "file",
    async createPoll(poll, invitees) {
      db.polls[poll.id] = { ...poll, status: poll.status || "open",
        createdAt: new Date().toISOString(), closed: false, chosenSlot: null };
      for (const i of invitees) {
        db.invitees[i.token] = {
          token: i.token, pollId: poll.id, name: i.name, email: i.email, lang: i.lang || null,
          answers: null, note: "", suggestions: [], answeredAt: null, invitedAt: null
        };
      }
      await flush();
    },
    async addInvitees(pollId, invitees) {
      for (const i of invitees) {
        db.invitees[i.token] = {
          token: i.token, pollId, name: i.name, email: i.email, lang: i.lang || null,
          answers: null, note: "", suggestions: [], answeredAt: null, invitedAt: null
        };
      }
      await flush();
    },
    async updatePoll(pollId, f) {
      const p = db.polls[pollId];
      if (!p) return;
      Object.assign(p, f);
      await flush();
    },
    async replaceInvitees(pollId, invitees) {
      for (const [tk, i] of Object.entries(db.invitees)) if (i.pollId === pollId) delete db.invitees[tk];
      for (const i of invitees) {
        db.invitees[i.token] = {
          token: i.token, pollId, name: i.name, email: i.email, lang: i.lang || null,
          answers: null, note: "", suggestions: [], answeredAt: null, invitedAt: null
        };
      }
      await flush();
    },
    async listPolls() {
      return Object.values(db.polls)
        .map(p => {
          const inv = Object.values(db.invitees).filter(i => i.pollId === p.id);
          return { ...p, total: inv.length, answered: inv.filter(i => i.answeredAt).length };
        })
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    },
    async getPoll(id) {
      const p = db.polls[id];
      return p ? { status: "open", ...p } : null;
    },
    async getInvitees(pollId) {
      return Object.values(db.invitees)
        .filter(i => i.pollId === pollId)
        .map(i => ({ note: "", suggestions: [], lang: null, ...i }))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    async getInviteeByToken(token) {
      const i = db.invitees[token];
      return i ? { note: "", suggestions: [], lang: null, ...i } : null;
    },
    async saveAnswers(token, answers, note = "", suggestions = []) {
      const i = db.invitees[token];
      if (!i) return;
      i.answers = answers;
      i.note = note;
      i.suggestions = suggestions;
      i.answeredAt = new Date().toISOString();
      await flush();
    },
    async clearSuggestion(token, slot) {
      const i = db.invitees[token];
      if (!i) return;
      i.suggestions = (i.suggestions || []).filter(s => !(s.d === slot.d && s.h === slot.h));
      await flush();
    },
    async setAnswers(token, answers) {
      const i = db.invitees[token];
      if (!i) return;
      i.answers = answers;
      await flush();
    },
    async removeInvitees(tokens) {
      for (const tk of tokens) delete db.invitees[tk];
      await flush();
    },
    async markInvited(tokens) {
      for (const tk of tokens) if (db.invitees[tk]) db.invitees[tk].invitedAt = new Date().toISOString();
      await flush();
    },
    async setClosed(pollId, closed, chosenSlot) {
      const p = db.polls[pollId];
      if (!p) return;
      p.closed = closed; p.chosenSlot = chosenSlot;
      await flush();
    },
    async deletePoll(pollId) {
      delete db.polls[pollId];
      for (const [tk, i] of Object.entries(db.invitees)) if (i.pollId === pollId) delete db.invitees[tk];
      await flush();
    },

    /* ------------------------------------------------------ contactos */
    async listContacts() {
      return Object.values(db.contacts)
        .map(c => ({
          ...c,
          emails: [...new Set([
            c.email.toLowerCase(),
            ...Object.entries(db.contactEmails).filter(([, id]) => id === c.id).map(([e]) => e)
          ])]
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    async addContact(c) {
      db.contacts[c.id] = { id: c.id, name: c.name, email: c.email, lang: c.lang || null };
      db.contactEmails[c.email] = c.id;
      await flush();
    },
    async updateContact(id, f) {
      const c = db.contacts[id];
      if (!c) return;
      c.name = f.name; c.email = f.email; c.lang = f.lang || null;
      db.contactEmails[f.email] = id;
      await flush();
    },
    async addContactEmail(contactId, email) {
      db.contactEmails[email] = contactId;
      await flush();
    },
    async removeContactEmail(email) {
      delete db.contactEmails[email];
      await flush();
    },
    async deleteContact(id) {
      delete db.contacts[id];
      for (const [e, cid] of Object.entries(db.contactEmails)) if (cid === id) delete db.contactEmails[e];
      for (const g of Object.values(db.groups)) g.members = (g.members || []).filter(m => m !== id);
      await flush();
    },
    async listGroups() {
      return Object.values(db.groups)
        .map(g => ({ id: g.id, name: g.name, members: g.members || [] }))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    async saveGroup(g) {
      const antes = db.groups[g.id];
      db.groups[g.id] = { id: g.id, name: g.name, members: antes ? antes.members : [] };
      await flush();
    },
    // Quem pertence a quê decide-se na ficha da pessoa, não na do grupo.
    async setContactGroups(contactId, groupIds) {
      for (const g of Object.values(db.groups)) {
        const dentro = groupIds.includes(g.id);
        const tinha = (g.members || []).includes(contactId);
        if (dentro && !tinha) g.members = [...(g.members || []), contactId];
        else if (!dentro && tinha) g.members = g.members.filter(m => m !== contactId);
      }
      await flush();
    },
    async deleteGroup(id) {
      delete db.groups[id];
      await flush();
    },
    async listDistinct() {
      return Object.keys(db.distinct);
    },
    async addDistinct(a, b) {
      db.distinct[[a, b].sort().join("|")] = true;
      await flush();
    }
  };
}

export async function getStore() {
  if (driver) return driver;
  driver = DATABASE_URL ? await pgDriver() : await fileDriver();
  console.log(`[store] driver: ${driver.kind}`);
  return driver;
}
