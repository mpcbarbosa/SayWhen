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
      chosen_slot integer
    );
    create table if not exists invitees (
      token text primary key,
      poll_id text not null references polls(id) on delete cascade,
      name text not null,
      email text not null,
      answers jsonb,
      answered_at timestamptz,
      invited_at timestamptz
    );
    create index if not exists invitees_poll_idx on invitees(poll_id);
    alter table polls add column if not exists tz text not null default 'Europe/Lisbon';
  `);

  const rowToPoll = (r) => ({
    id: r.id, title: r.title, duration: r.duration, place: r.place, lang: r.lang, tz: r.tz,
    organizerName: r.organizer_name, organizerEmail: r.organizer_email,
    slots: r.slots, createdAt: r.created_at, closed: r.closed, chosenSlot: r.chosen_slot
  });
  const rowToInvitee = (r) => ({
    token: r.token, pollId: r.poll_id, name: r.name, email: r.email,
    answers: r.answers, answeredAt: r.answered_at, invitedAt: r.invited_at
  });

  return {
    kind: "postgres",
    async createPoll(poll, invitees) {
      const c = await pool.connect();
      try {
        await c.query("begin");
        await c.query(
          `insert into polls (id,title,duration,place,lang,tz,organizer_name,organizer_email,slots)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [poll.id, poll.title, poll.duration, poll.place, poll.lang, poll.tz,
           poll.organizerName, poll.organizerEmail, JSON.stringify(poll.slots)]
        );
        for (const i of invitees) {
          await c.query(
            `insert into invitees (token,poll_id,name,email) values ($1,$2,$3,$4)`,
            [i.token, poll.id, i.name, i.email]
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
          `insert into invitees (token,poll_id,name,email) values ($1,$2,$3,$4)
           on conflict (token) do nothing`,
          [i.token, pollId, i.name, i.email]
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
    async saveAnswers(token, answers) {
      await pool.query(
        "update invitees set answers=$2, answered_at=now() where token=$1",
        [token, JSON.stringify(answers)]);
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
    }
  };
}

/* ---------------------------------------------------------------- file */
async function fileDriver() {
  const file = path.join(DATA_DIR, "db.json");
  await fs.mkdir(DATA_DIR, { recursive: true });

  let db = { polls: {}, invitees: {} };
  try {
    db = JSON.parse(await fs.readFile(file, "utf8"));
    db.polls ||= {}; db.invitees ||= {};
  } catch { /* first run */ }

  let queue = Promise.resolve();
  const flush = () => {
    queue = queue.then(() => fs.writeFile(file, JSON.stringify(db, null, 2), "utf8"));
    return queue;
  };

  return {
    kind: "file",
    async createPoll(poll, invitees) {
      db.polls[poll.id] = { ...poll, createdAt: new Date().toISOString(), closed: false, chosenSlot: null };
      for (const i of invitees) {
        db.invitees[i.token] = {
          token: i.token, pollId: poll.id, name: i.name, email: i.email,
          answers: null, answeredAt: null, invitedAt: null
        };
      }
      await flush();
    },
    async addInvitees(pollId, invitees) {
      for (const i of invitees) {
        db.invitees[i.token] = {
          token: i.token, pollId, name: i.name, email: i.email,
          answers: null, answeredAt: null, invitedAt: null
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
    async getPoll(id) { return db.polls[id] || null; },
    async getInvitees(pollId) {
      return Object.values(db.invitees)
        .filter(i => i.pollId === pollId)
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    async getInviteeByToken(token) { return db.invitees[token] || null; },
    async saveAnswers(token, answers) {
      const i = db.invitees[token];
      if (!i) return;
      i.answers = answers;
      i.answeredAt = new Date().toISOString();
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
    }
  };
}

export async function getStore() {
  if (driver) return driver;
  driver = DATABASE_URL ? await pgDriver() : await fileDriver();
  console.log(`[store] driver: ${driver.kind}`);
  return driver;
}
