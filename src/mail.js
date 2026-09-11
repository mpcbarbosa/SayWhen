// Email through Resend's HTTP API. With no API key the app still works:
// messages are written to the log so you can see exactly what would go out.
//
// Cada mensagem vai em texto simples e em HTML. Não é só estética: uma
// mensagem só com texto e um link nu pontua pior nos filtros de spam,
// sobretudo vinda de um domínio sem histórico de envio.
const API = "https://api.resend.com/emails";

const KEY = () => process.env.RESEND_API_KEY || "";
const FROM = () => process.env.MAIL_FROM || "SayWhen <onboarding@resend.dev>";

export function mailEnabled() {
  return Boolean(KEY());
}

const esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

const linkify = (line) =>
  line.replace(/(https?:\/\/[^\s<>"]+)/g,
    '<a href="$1" style="color:#1a73e8">$1</a>');

/**
 * Versão HTML da mensagem, a partir do mesmo texto — uma só fonte de verdade.
 * Se vier um `cta`, a linha que contém esse endereço é substituída por um botão.
 */
function toHtml(text, cta) {
  const body = String(text).split("\n").map(raw => {
    const line = raw.trimEnd();
    if (cta && line.trim() === cta.url) {
      return `<p style="margin:22px 0">
        <a href="${esc(cta.url)}" style="background:#1a73e8;color:#fff;text-decoration:none;
           padding:11px 20px;border-radius:4px;display:inline-block;font-weight:500">${esc(cta.label)}</a>
      </p>`;
    }
    if (!line.trim()) return "<div style=\"height:10px\"></div>";
    // Linhas de opções começam por "  ·" — recuo ligeiro.
    const indented = /^\s{2}·/.test(raw);
    return `<div style="${indented ? "padding-left:14px;" : ""}">${linkify(esc(line))}</div>`;
  }).join("\n");

  return `<div style="font-family:Roboto,Arial,Helvetica,sans-serif;font-size:15px;
    line-height:1.55;color:#202124;max-width:560px">
${body}
</div>`;
}

export async function sendMail({ to, subject, text, replyTo, cta }) {
  if (!KEY()) {
    console.log(`[mail:disabled] to=${to} subject=${subject}\n${text}\n---`);
    return { ok: false, skipped: true };
  }
  try {
    const res = await fetch(API, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${KEY()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: FROM(),
        to: [to],
        subject,
        text,
        html: toHtml(text, cta),
        ...(replyTo ? { reply_to: replyTo } : {})
      })
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`[mail:error] ${res.status} to=${to} ${body}`);
      return { ok: false, error: `${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    console.error(`[mail:error] to=${to}`, e.message);
    return { ok: false, error: e.message };
  }
}

export const __testing = { toHtml };
