// Email through Resend's HTTP API. With no API key the app still works:
// messages are written to the log so you can see exactly what would go out.
const API = "https://api.resend.com/emails";

const KEY = () => process.env.RESEND_API_KEY || "";
const FROM = () => process.env.MAIL_FROM || "SayWhen <onboarding@resend.dev>";

export function mailEnabled() {
  return Boolean(KEY());
}

export async function sendMail({ to, subject, text, replyTo }) {
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
