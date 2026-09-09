// Gera um ficheiro .ics (convite de reunião) a partir de uma sondagem fechada.
// Os horários são guardados na hora local do fuso da sondagem; convertemos para
// UTC com a regra horária certa para aquela data, para que Outlook, Google e
// Apple mostrem a hora correta a cada convidado, esteja ele onde estiver.
import { slotStart, DEFAULT_TZ, tzLabel } from "./util.js";

const stamp = (dt) => dt.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

// Escapa vírgulas, pontos e vírgulas, barras e quebras de linha (RFC 5545).
const esc = (s) => String(s ?? "")
  .replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,")
  .replace(/\r?\n/g, "\\n");

// Dobra linhas a 74 octetos, como manda a norma.
function fold(line) {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 74) return line;
  const out = [];
  let cur = Buffer.alloc(0);
  for (const ch of line) {
    const b = Buffer.from(ch, "utf8");
    if (cur.length + b.length > (out.length ? 73 : 74)) {
      out.push(cur.toString("utf8"));
      cur = Buffer.alloc(0);
    }
    cur = Buffer.concat([cur, b]);
  }
  if (cur.length) out.push(cur.toString("utf8"));
  return out.join("\r\n ");
}

/**
 * @param poll      sondagem
 * @param slotIndex índice do horário escolhido
 * @param invitees  convidados (todos)
 * @param link      endereço da sondagem, para o corpo do convite
 */
export function buildIcs(poll, slotIndex, invitees, link) {
  const tz = poll.tz || DEFAULT_TZ;
  const slot = poll.slots[slotIndex];
  const start = slotStart(slot, tz);
  const end = new Date(start.getTime() + poll.duration * 60000);

  const yes = [], others = [];
  for (const inv of invitees) {
    const v = inv.answers ? inv.answers[slotIndex] || 0 : 0;
    (v === 1 ? yes : others).push(inv);
  }

  const attendee = (inv, role) =>
    `ATTENDEE;ROLE=${role};PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=${esc(inv.name)}:mailto:${inv.email}`;

  const desc = [
    poll.place ? `Local: ${poll.place}` : "",
    `Horário definido em hora de ${tzLabel(tz)}`,
    `Disponibilidade recolhida em ${link}`,
    yes.length ? `Confirmaram poder: ${yes.map(i => i.name).join(", ")}` : "",
    others.length ? `Sem confirmação: ${others.map(i => i.name).join(", ")}` : ""
  ].filter(Boolean).join("\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SayWhen//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${poll.id}-${slotIndex}@saywhen`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(poll.title)}`,
    poll.place ? `LOCATION:${esc(poll.place)}` : "",
    `DESCRIPTION:${esc(desc)}`,
    poll.organizerEmail
      ? `ORGANIZER;CN=${esc(poll.organizerName || poll.organizerEmail)}:mailto:${poll.organizerEmail}`
      : "",
    ...yes.map(i => attendee(i, "REQ-PARTICIPANT")),
    ...others.map(i => attendee(i, "OPT-PARTICIPANT")),
    "SEQUENCE:0",
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR"
  ].filter(Boolean);

  return lines.map(fold).join("\r\n") + "\r\n";
}
