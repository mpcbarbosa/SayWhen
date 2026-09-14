// A lista de pessoas a quem o Miguel costuma enviar sondagens.
//
// Cresce sozinha: sempre que uma sondagem é criada ou editada, os convidados
// passam por aqui. O objetivo é não haver duas fichas para a mesma pessoa —
// mbarbosa@seidor.es e mbarbosa@seidor.com são o mesmo Miguel, e devem ficar
// como dois endereços de um só contacto.
import { id as makeId, emailKey, localKey, isSharedBox, normName } from "./util.js";

// O nome que o parsePeople inventa a partir do endereço quando não vem nenhum.
const derivedName = (email) => emailKey(email).split("@")[0].replace(/[._-]+/g, " ");

// Um nome "fraco" é o que saiu do endereço; qualquer nome a sério substitui-o.
const weakName = (name, email) => normName(name) === normName(derivedName(email));

/**
 * A quem pertence este endereço?
 *   1. endereço conhecido            -> é essa pessoa, de certeza
 *   2. mesmo prefixo E mesmo nome    -> é a mesma pessoa noutro domínio
 *   3. nada disso                    -> pessoa nova
 * Caixas partilhadas (geral@, info@) nunca entram na regra 2: o prefixo igual
 * em empresas diferentes não quer dizer nada.
 */
export function matchContact(contacts, person) {
  const email = emailKey(person.email);
  const exact = contacts.find(c => c.emails.includes(email));
  if (exact) return { contact: exact, how: "email" };
  if (isSharedBox(email)) return { contact: null, how: "new" };

  const name = normName(person.name);
  if (!name) return { contact: null, how: "new" };
  const twin = contacts.find(c =>
    normName(c.name) === name &&
    !weakName(c.name, c.email) &&
    c.emails.some(e => localKey(e) === localKey(email)));
  return twin ? { contact: twin, how: "alias" } : { contact: null, how: "new" };
}

/**
 * Guarda (ou atualiza) os convidados na lista de contactos.
 * Devolve quantos ficaram novos e quantos endereços foram juntos a alguém.
 */
export async function rememberPeople(store, people) {
  const out = { added: 0, aliased: 0 };
  if (!people || !people.length) return out;
  const contacts = await store.listContacts();

  for (const p of people) {
    const email = emailKey(p.email);
    if (!email || !email.includes("@")) continue;
    const { contact, how } = matchContact(contacts, p);

    if (how === "email") {
      // Só melhoramos o que estava vazio ou tinha sido adivinhado do endereço.
      const upgrade = p.name && !weakName(p.name, email) && weakName(contact.name, contact.email);
      const lang = contact.lang || p.lang || null;
      if (upgrade || lang !== contact.lang) {
        contact.name = upgrade ? p.name : contact.name;
        contact.lang = lang;
        await store.updateContact(contact.id, {
          name: contact.name, email: contact.email, lang: contact.lang
        });
      }
      continue;
    }

    if (how === "alias") {
      await store.addContactEmail(contact.id, email);
      contact.emails.push(email);
      out.aliased++;
      continue;
    }

    const fresh = {
      id: makeId(),
      name: p.name || derivedName(email),
      email,
      lang: p.lang || null
    };
    await store.addContact(fresh);
    contacts.push({ ...fresh, emails: [email] });
    out.added++;
  }
  return out;
}

/**
 * Pares que parecem ser a mesma pessoa mas ficaram separados — para o Miguel
 * confirmar. Ou partilham o prefixo do endereço, ou têm o mesmo nome.
 * Nunca junta sozinho: um engano aqui mandava um convite para a pessoa errada.
 */
export function dupPairs(contacts, distinct = []) {
  const said = new Set(distinct);
  const pairs = [];
  for (let a = 0; a < contacts.length; a++) {
    for (let b = a + 1; b < contacts.length; b++) {
      const x = contacts[a], y = contacts[b];
      const sameName = normName(x.name) && normName(x.name) === normName(y.name);
      const sameLocal = x.emails.some(e1 =>
        !isSharedBox(e1) && y.emails.some(e2 => localKey(e1) === localKey(e2)));
      if (!sameName && !sameLocal) continue;
      if (said.has([x.id, y.id].sort().join("|"))) continue;
      pairs.push({ a: x, b: y, sameName, sameLocal });
    }
  }
  return pairs;
}

/** Junta dois contactos: `from` desaparece e os endereços dele passam para `into`. */
export async function mergeContacts(store, intoId, fromId) {
  if (intoId === fromId) return false;
  const contacts = await store.listContacts();
  const into = contacts.find(c => c.id === intoId);
  const from = contacts.find(c => c.id === fromId);
  if (!into || !from) return false;

  // Os endereços mudam de dono primeiro, para não caírem com o contacto antigo.
  for (const e of from.emails) await store.addContactEmail(into.id, e);
  // Cada pessoa tem um grupo: fica o do contacto que sobrevive, ou o do outro.
  const groups = await store.listGroups();
  const fica = groups.find(g => g.members.includes(into.id)) ||
               groups.find(g => g.members.includes(from.id));
  if (fica) await store.setContactGroups(into.id, [fica.id]);
  await store.deleteContact(from.id);
  if (!into.lang && from.lang) {
    await store.updateContact(into.id, { name: into.name, email: into.email, lang: from.lang });
  }
  return true;
}

/** Linhas prontas para o campo "quem vai ser convidado". */
export const contactLine = (c) => `${c.name} ${c.email}${c.lang ? " " + c.lang : ""}`;
