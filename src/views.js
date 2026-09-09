import { t, L, LANGS } from "./i18n.js";
import { esc, fmtDay, fmtLong, endTime, sortSlots, tallies, bestIndex, fmtDateTime } from "./util.js";

export const CSS = `
:root{
  color-scheme:light;
  --bg:#ffffff; --surface:#ffffff; --surface-2:#f1f3f4;
  --ink:#202124; --muted:#5f6368; --line:#dadce0;
  --accent:#1a73e8; --accent-ink:#174ea6; --accent-soft:#e8f0fe;
  --yes:#188038; --yes-soft:#e6f4ea; --no:#d93025; --no-soft:#fce8e6;
  --on-accent:#ffffff; --radius:8px;
}
*{box-sizing:border-box}
[hidden]{display:none!important}
body{margin:0;background:var(--bg);color:var(--ink);
  font-family:Roboto,Arial,system-ui,sans-serif;font-size:14px;line-height:1.5;
  -webkit-font-smoothing:antialiased}
h1,h2,h3{font-weight:500;margin:0;text-wrap:balance}
h1{font-size:22px} h2{font-size:16px} h3{font-size:14px}
p{margin:0}
a{color:var(--accent)}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}
.wrap{max-width:960px;margin:0 auto;padding:24px 20px 80px}
.topbar{background:var(--surface);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:20}
.topbar-in{max-width:960px;margin:0 auto;padding:10px 20px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.mark{width:28px;height:28px;border-radius:50%;flex:none;background:var(--accent);color:var(--on-accent);
  display:grid;place-items:center;font-size:15px;font-weight:500}
.brand{font-size:17px}
.brand small{display:block;font-size:12px;color:var(--muted)}
.spacer{flex:1}
button,select,input,textarea{font:inherit}
.btn{border:1px solid var(--line);background:var(--surface);color:var(--accent);
  padding:8px 16px;border-radius:4px;font-weight:500;cursor:pointer;
  display:inline-block;text-decoration:none;line-height:1.3}
.btn:hover{background:var(--accent-soft)}
.btn:disabled{opacity:.55;cursor:default}
.btn-primary{background:var(--accent);border-color:var(--accent);color:var(--on-accent)}
.btn-primary:hover{background:var(--accent-ink)}
.btn-text{border-color:transparent;background:transparent;padding:8px 10px}
.btn-text:hover{background:var(--surface-2)}
.btn-sm{padding:5px 10px;font-size:13px}
.btn-danger{color:var(--no)}
.btn-danger:hover{background:var(--no-soft)}
label.field{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--muted)}
input[type=text],input[type=email],input[type=date],input[type=time],input[type=password],select,textarea{
  color:var(--ink);background:var(--surface);border:1px solid var(--line);
  border-radius:4px;padding:9px 10px;width:100%}
input:focus,select:focus,textarea:focus{border-color:var(--accent);outline:none}
textarea{resize:vertical}
::placeholder{color:var(--muted);opacity:.8}
.hint{font-size:12.5px;color:var(--muted)}
.mono{font-family:"Roboto Mono",ui-monospace,monospace;font-size:12.5px}
.stack{display:flex;flex-direction:column;gap:16px}
.row{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
.card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius)}
.card-head{padding:14px 20px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.card-head .sub{color:var(--muted);font-size:12.5px;margin-left:auto}
.card-body{padding:20px;display:flex;flex-direction:column;gap:16px}
.slot-row{display:grid;grid-template-columns:minmax(140px,1.1fr) minmax(96px,.7fr) auto 34px;gap:8px;align-items:center}
.slot-row .del{border:none;background:transparent;color:var(--muted);width:34px;height:34px;
  border-radius:50%;font-size:18px;cursor:pointer;line-height:1}
.slot-row .del:hover{background:var(--surface-2);color:var(--no)}
.p-slot{display:flex;gap:14px;align-items:center;flex-wrap:wrap;padding:10px 14px;
  border:1px solid var(--line);border-radius:var(--radius);background:var(--surface)}
.p-slot .when{flex:1;min-width:180px}
.p-slot .when b{font-weight:500;font-variant-numeric:tabular-nums}
.p-slot .when span{display:block;font-size:12.5px;color:var(--muted)}
.seg{display:inline-flex;border:1px solid var(--line);border-radius:4px;overflow:hidden}
.seg button{border:none;background:var(--surface);color:var(--muted);padding:8px 22px;
  font-weight:500;border-right:1px solid var(--line);cursor:pointer}
.seg button:last-child{border-right:none}
.seg button:hover{background:var(--surface-2)}
.seg button[aria-pressed=true][data-v="1"]{background:var(--yes-soft);color:var(--yes)}
.seg button[aria-pressed=true][data-v="2"]{background:var(--no-soft);color:var(--no)}
.scroller{overflow-x:auto;border:1px solid var(--line);border-radius:var(--radius);background:var(--surface)}
table.grid{border-collapse:separate;border-spacing:0;width:100%;font-size:13px}
table.grid th,table.grid td{padding:0;text-align:center}
table.grid thead th{padding:10px 8px;min-width:100px;font-weight:500;border-bottom:1px solid var(--line)}
table.grid thead th .dow{display:block;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
table.grid thead th .hrs{display:block;font-size:14px;font-variant-numeric:tabular-nums}
table.grid thead th.best{background:var(--accent-soft);color:var(--accent-ink)}
table.grid th.who,table.grid td.who{position:sticky;left:0;z-index:2;background:var(--surface);text-align:left;
  padding:8px 12px;min-width:190px;border-right:1px solid var(--line)}
tbody td{border-bottom:1px solid var(--line)}
tbody tr:last-child td{border-bottom:none}
td.cell{padding:4px}
td.cell.best{background:var(--accent-soft)}
.mark-cell{display:block;min-height:30px;line-height:30px;border-radius:4px;background:var(--surface-2);color:var(--muted)}
.mark-cell[data-v="1"]{background:var(--yes-soft);color:var(--yes)}
.mark-cell[data-v="2"]{background:var(--no-soft);color:var(--no)}
tr.tally td{background:var(--surface-2);font-variant-numeric:tabular-nums;padding:8px 4px}
tr.tally td.who{background:var(--surface-2)}
tr.tally b{font-weight:500;margin:0 5px}
.s-yes{color:var(--yes)} .s-no{color:var(--no)}
.who-meta{font-size:11px;color:var(--muted)}
.verdict{border:1px solid var(--accent);background:var(--accent-soft);border-radius:var(--radius);padding:14px 18px}
.verdict .lbl{font-size:12px;color:var(--accent-ink);text-transform:uppercase;letter-spacing:.05em}
.verdict .big{font-size:18px;font-weight:500}
.verdict .sub{font-size:13px;color:var(--muted)}
.legend{display:flex;gap:16px;flex-wrap:wrap;font-size:12.5px;color:var(--muted)}
.legend i{font-style:normal;display:inline-flex;align-items:center;gap:6px}
.swatch{width:12px;height:12px;border-radius:3px;display:inline-block}
.notice{border:1px solid var(--line);background:var(--surface-2);border-radius:var(--radius);padding:12px 16px;font-size:13px}
.notice.ok{border-color:var(--yes);background:var(--yes-soft);color:var(--yes)}
.notice.bad{border-color:var(--no);background:var(--no-soft);color:var(--no)}
.notice.info{border-color:var(--accent);background:var(--accent-soft);color:var(--accent-ink)}
.pill{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11.5px;border:1px solid var(--line);color:var(--muted)}
.pill.done{border-color:var(--yes);color:var(--yes);background:var(--yes-soft)}
.list{display:flex;flex-direction:column;gap:0}
.list-item{display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:14px 0;border-bottom:1px solid var(--line)}
.list-item:last-child{border-bottom:none}
.list-item .grow{flex:1;min-width:200px}
.toast{position:fixed;left:20px;bottom:20px;background:#3c4043;color:#fff;padding:12px 18px;
  border-radius:4px;font-size:13.5px;max-width:min(420px,calc(100% - 40px));opacity:0;
  pointer-events:none;transition:opacity .18s ease;z-index:60}
.toast.on{opacity:1}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
@media (max-width:640px){
  .slot-row{grid-template-columns:1fr 1fr;grid-template-areas:"d d" "h x"}
  .slot-row>:nth-child(1){grid-area:d}
  .slot-row>:nth-child(2){grid-area:h}
  .slot-row>:nth-child(3){display:none}
  .slot-row>:nth-child(4){grid-area:x;justify-self:end}
  .card-head .sub{margin-left:0;width:100%}
}
`;

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500&family=Roboto:wght@400;500&display=swap">`;

function layout(lang, title, body, { script = "", rightSlot = "" } = {}) {
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
${FONTS}
<style>${CSS}</style>
</head>
<body>
<header class="topbar"><div class="topbar-in">
  <div class="mark">?</div>
  <div class="brand">${esc(t(lang, "appName"))}<small>${esc(t(lang, "tagline"))}</small></div>
  <div class="spacer"></div>
  ${rightSlot}
</div></header>
<div class="wrap">${body}</div>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<script>
function toast(m){var el=document.getElementById('toast');el.textContent=m;el.classList.add('on');
clearTimeout(window.__tt);window.__tt=setTimeout(function(){el.classList.remove('on')},2600);}
function copyText(s,m){var ta=document.createElement('textarea');ta.value=s;ta.style.position='fixed';
ta.style.opacity='0';document.body.appendChild(ta);ta.select();
try{document.execCommand('copy');toast(m)}catch(e){toast('...')}document.body.removeChild(ta);}
${script}
</script>
</body>
</html>`;
}

/* ------------------------------------------------------------- login */
export function loginPage(lang, error) {
  const body = `
  <div class="card" style="max-width:420px;margin:40px auto">
    <div class="card-body">
      <h2>${esc(t(lang, "login"))}</h2>
      ${error ? `<div class="notice bad">${esc(t(lang, "loginBad"))}</div>` : ""}
      <form method="post" action="/admin/login" class="stack">
        <label class="field">${esc(t(lang, "loginLabel"))}
          <input type="password" name="key" autofocus autocomplete="current-password">
        </label>
        <div><button class="btn btn-primary" type="submit">${esc(t(lang, "login"))}</button></div>
      </form>
    </div>
  </div>`;
  return layout(lang, t(lang, "appName"), body);
}

/* -------------------------------------------------------- admin home */
export function adminHome(lang, polls, flash) {
  const today = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  // Horas em passos de 15 minutos — nada de :01, :06, :08.
  const TIMES = [];
  for (let h = 7; h <= 21; h++) {
    for (const m of [0, 15, 30, 45]) {
      if (h === 21 && m > 0) break;
      TIMES.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  const timeOptions = (sel) =>
    TIMES.map(v => `<option value="${v}"${v === sel ? " selected" : ""}>${v}</option>`).join("");

  const slotRow = (i) => `
    <div class="slot-row">
      <input type="date" name="date" value="${i === 0 ? today : ""}">
      <select name="time">${timeOptions(["10:00", "15:00", "16:30"][i] || "10:00")}</select>
      <span class="hint"></span>
      <button type="button" class="del" aria-label="x">&times;</button>
    </div>`;

  const list = polls.length
    ? `<div class="list">${polls.map(p => `
      <div class="list-item">
        <div class="grow">
          <a href="/admin/polls/${esc(p.id)}"><b>${esc(p.title)}</b></a>
          ${p.closed ? `<span class="pill done">${esc(t(lang, "closed"))}</span>` : ""}
          <div class="hint">${esc(t(lang, "answeredOf", { a: p.answered, t: p.total }))} ·
            ${esc(t(lang, "createdAt", { d: fmtDateTime(lang, p.createdAt) }))}</div>
        </div>
        <a class="btn btn-sm" href="/admin/polls/${esc(p.id)}">${esc(t(lang, "openPoll"))}</a>
      </div>`).join("")}</div>`
    : `<p class="hint">${esc(t(lang, "noPolls"))}</p>`;

  const body = `
  ${flash ? `<div class="notice ok" style="margin-bottom:16px">${esc(flash)}</div>` : ""}
  <div class="stack">
    <section class="card">
      <div class="card-head"><h2>${esc(t(lang, "newPoll"))}</h2></div>
      <form class="card-body" method="post" action="/admin/polls" id="newPoll">
        <div class="row">
          <label class="field" style="flex:2;min-width:240px">${esc(t(lang, "fTitle"))}
            <input type="text" name="title" required>
          </label>
          <label class="field" style="flex:1;min-width:130px">${esc(t(lang, "fDur"))}
            <select name="duration">
              <option value="30">30 min</option><option value="45">45 min</option>
              <option value="60" selected>1 h</option><option value="90">1 h 30</option>
              <option value="120">2 h</option>
            </select>
          </label>
          <label class="field" style="flex:1;min-width:130px">${esc(t(lang, "fLang"))}
            <select name="lang">
              ${LANGS.map(l => `<option value="${l}"${l === lang ? " selected" : ""}>${esc(L(l).name)}</option>`).join("")}
            </select>
          </label>
        </div>
        <div class="row">
          <label class="field" style="flex:1;min-width:170px">${esc(t(lang, "fOrg"))}
            <input type="text" name="organizerName" required>
          </label>
          <label class="field" style="flex:1;min-width:200px">${esc(t(lang, "fMail"))}
            <input type="email" name="organizerEmail" required>
          </label>
          <label class="field" style="flex:1;min-width:170px">${esc(t(lang, "fPlace"))}
            <input type="text" name="place">
          </label>
        </div>
        <div>
          <h3 style="margin-bottom:8px">${esc(t(lang, "fSlots"))}</h3>
          <div class="stack" id="slots" style="gap:8px">${slotRow(0)}${slotRow(1)}${slotRow(2)}</div>
          <div style="margin-top:10px"><button class="btn btn-sm" type="button" id="addSlot">+ ${esc(t(lang, "addSlot"))}</button></div>
        </div>
        <label class="field">${esc(t(lang, "fPeople"))}
          <textarea name="people" rows="5" required placeholder="Ana Ribeiro ana@cliente.pt&#10;Bruno Cardoso bruno@empresa.com"></textarea>
        </label>
        <p class="hint">${esc(t(lang, "fPeopleHint"))}</p>
        <div><button class="btn btn-primary" type="submit" id="createBtn">${esc(t(lang, "createBtn"))}</button></div>
      </form>
    </section>

    <section class="card">
      <div class="card-head"><h2>${esc(t(lang, "adminTitle"))}</h2></div>
      <div class="card-body">${list}</div>
    </section>
  </div>`;

  const script = `
  document.getElementById('addSlot').addEventListener('click',function(){
    var box=document.getElementById('slots');
    var last=box.lastElementChild;
    var row=last.cloneNode(true);
    row.querySelectorAll('input').forEach(function(i){ i.value = i.type==='date' ? (last.querySelector('input[type=date]').value||'') : ''; });
    var prev=last.querySelector('select[name=time]'), next=row.querySelector('select[name=time]');
    if (prev && next) next.selectedIndex = Math.min(prev.selectedIndex + 4, next.options.length - 1);
    box.appendChild(row); bindDel(row);
  });
  function bindDel(row){ row.querySelector('.del').addEventListener('click',function(){
    if(document.querySelectorAll('#slots .slot-row').length>1) row.remove(); }); }
  document.querySelectorAll('#slots .slot-row').forEach(bindDel);
  document.getElementById('newPoll').addEventListener('submit',function(){
    var b=document.getElementById('createBtn'); b.disabled=true; b.textContent=${JSON.stringify(t(lang, "creating"))};
  });`;

  const right = `<a class="btn btn-text btn-sm" href="/admin/logout">${esc(t(lang, "logout"))}</a>`;
  return layout(lang, t(lang, "adminTitle"), body, { script, rightSlot: right });
}

/* -------------------------------------------------------- admin poll */
export function adminPoll(lang, poll, invitees, baseUrl, flash, mailOn = true) {
  const pl = poll.lang || lang;
  const ordered = sortSlots(poll.slots);
  const tal = tallies(poll, invitees);
  const best = poll.chosenSlot != null ? poll.chosenSlot : bestIndex(poll, invitees);
  const answered = invitees.filter(i => i.answers).length;

  const head = ordered.map(({ s, i }) => `
    <th class="${i === best ? "best" : ""}">
      <span class="dow">${esc(fmtDay(pl, s))}</span>
      <span class="hrs">${esc(s.h)}</span>
    </th>`).join("");

  const tallyRow = ordered.map(({ i }) => `
    <td class="cell ${i === best ? "best" : ""}">
      <b class="s-yes">&#10003; ${tal[i].yes}</b><b class="s-no">&#10007; ${tal[i].no}</b>
    </td>`).join("");

  const rows = invitees.map(inv => `
    <tr>
      <td class="who">
        <div>${esc(inv.name)}</div>
        <div class="who-meta">${esc(inv.email)} —
          ${inv.answeredAt
            ? esc(t(lang, "answered")) + " " + esc(fmtDateTime(lang, inv.answeredAt))
            : esc(t(lang, "pending"))}
        </div>
      </td>
      ${ordered.map(({ i }) => {
        const v = inv.answers ? inv.answers[i] || 0 : 0;
        return `<td class="cell ${i === best ? "best" : ""}">
          <span class="mark-cell" data-v="${v}">${v === 1 ? "&#10003;" : v === 2 ? "&#10007;" : "&middot;"}</span>
        </td>`;
      }).join("")}
    </tr>`).join("");

  const verdict = best >= 0 ? `
    <div class="verdict">
      <div class="lbl">${esc(t(lang, poll.closed ? "chosenNotice" : "best", { s: "" })).replace(/:\s*$/, "")}</div>
      <div class="big">${esc(fmtLong(pl, poll.slots[best], poll.duration))}</div>
      <div class="sub">${esc(t(lang, "canN", { n: tal[best].yes }))} ·
        ${esc(t(lang, "cannotN", { n: tal[best].no }))}${tal[best].none ? " · " + esc(t(lang, "noReplyN", { n: tal[best].none })) : ""}</div>
    </div>` : `<div class="notice">${esc(t(lang, "noAnswersYet"))}</div>`;

  const optsText = ordered.map(({ s }) => `  · ${fmtLong(pl, s, poll.duration)}`).join("\n");
  const placeText = poll.place ? `, ${poll.place}` : "";
  const inviteText = (inv) => t(pl, "inviteBody", {
    n: inv.name, t: poll.title, link: `${baseUrl}/v/${inv.token}`,
    d: poll.duration, p: placeText, opts: optsText, o: poll.organizerName || ""
  });
  const inviteMailto = (inv) =>
    `mailto:${encodeURIComponent(inv.email)}` +
    `?subject=${encodeURIComponent(t(pl, "inviteSubject", { t: poll.title }))}` +
    `&body=${encodeURIComponent(inviteText(inv))}`;

  const people = invitees.map(inv => `
    <div class="list-item">
      <div class="grow">
        <b>${esc(inv.name)}</b>
        <span class="pill ${inv.answeredAt ? "done" : ""}">${inv.answeredAt ? esc(t(lang, "answered")) : esc(t(lang, "pending"))}</span>
        <div class="hint">${esc(inv.email)}</div>
      </div>
      <a class="btn btn-sm btn-primary" href="${esc(inviteMailto(inv))}" target="_blank" rel="noopener">
        ${esc(t(lang, "inviteByMail"))}</a>
      <button class="btn btn-sm" type="button"
        onclick="copyText('${baseUrl}/v/${esc(inv.token)}', ${JSON.stringify(t(lang, "copied"))})">
        ${esc(t(lang, "copyLink"))}</button>
    </div>`).join("");

  const allLinks = invitees.map(inv => `${inv.name} <${inv.email}>\n${baseUrl}/v/${inv.token}`).join("\n\n");

  const body = `
  ${flash ? `<div class="notice ok" style="margin-bottom:16px">${esc(flash)}</div>` : ""}
  <div class="stack">
    <div class="row">
      <a class="btn btn-text btn-sm" href="/admin">&larr; ${esc(t(lang, "back"))}</a>
      <div class="spacer"></div>
      <span class="hint">${esc(t(lang, "answeredOf", { a: answered, t: invitees.length }))}</span>
    </div>

    <section class="card">
      <div class="card-head">
        <h2>${esc(poll.title)}</h2>
        <span class="sub">${poll.duration} min${poll.place ? " · " + esc(poll.place) : ""}${poll.closed ? " · " + esc(t(lang, "closed")) : ""}</span>
      </div>
      <div class="card-body">
        ${verdict}
        <div class="scroller"><table class="grid">
          <thead><tr><th class="who">${esc(t(lang, "who"))}</th>${head}</tr></thead>
          <tbody>
            <tr class="tally"><td class="who">${esc(t(lang, "answeredOf", { a: answered, t: invitees.length }))}</td>${tallyRow}</tr>
            ${rows}
          </tbody>
        </table></div>
        <div class="legend">
          <i><span class="swatch" style="background:var(--yes-soft);border:1px solid var(--yes)"></span>${esc(t(lang, "legendYes"))}</i>
          <i><span class="swatch" style="background:var(--no-soft);border:1px solid var(--no)"></span>${esc(t(lang, "legendNo"))}</i>
          <i><span class="swatch" style="background:var(--surface-2);border:1px solid var(--line)"></span>${esc(t(lang, "legendNone"))}</i>
        </div>
        <div class="row">
          <button class="btn" type="button" id="sumBtn">${esc(t(lang, "copySummary"))}</button>
          <form method="post" action="/admin/polls/${esc(poll.id)}/remind" style="display:inline">
            <button class="btn" type="submit">${esc(t(lang, "remind"))}</button>
          </form>
          <form method="post" action="/admin/polls/${esc(poll.id)}/close" style="display:inline">
            <input type="hidden" name="slot" value="${best}">
            <input type="hidden" name="closed" value="${poll.closed ? "0" : "1"}">
            <button class="btn ${poll.closed ? "" : "btn-primary"}" type="submit" ${best < 0 && !poll.closed ? "disabled" : ""}>
              ${esc(t(lang, poll.closed ? "reopen" : "closePoll"))}</button>
          </form>
          <div class="spacer"></div>
          <form method="post" action="/admin/polls/${esc(poll.id)}/delete" style="display:inline"
            onsubmit="return confirm(${JSON.stringify(t(lang, "confirmDelete"))})">
            <button class="btn btn-text btn-sm btn-danger" type="submit">${esc(t(lang, "deletePoll"))}</button>
          </form>
        </div>
      </div>
    </section>

    <section class="card">
      <div class="card-head">
        <h2>${esc(t(lang, "fPeople"))}</h2>
        <span class="sub"><button class="btn btn-sm" type="button" id="allBtn">${esc(t(lang, "copyAll"))}</button></span>
      </div>
      <div class="card-body">
        ${mailOn ? "" : `<div class="notice"><b>${esc(t(lang, "mailOffTitle"))}</b><br>${esc(t(lang, "mailOffBody"))}</div>`}
        <div class="list">${people}</div>
        <form method="post" action="/admin/polls/${esc(poll.id)}/people" class="stack"
              style="border-top:1px solid var(--line);padding-top:16px;gap:10px">
          <label class="field">${esc(t(lang, "addPeople"))}
            <textarea name="people" rows="3" required
              placeholder="Sofia Neves sofia@cliente.pt"></textarea>
          </label>
          <p class="hint">${esc(t(lang, "addPeopleHint"))}</p>
          <div><button class="btn btn-primary" type="submit">${esc(t(lang, "addPeopleBtn"))}</button></div>
        </form>
      </div>
    </section>
  </div>`;

  const summary = [
    `${poll.title}`,
    best >= 0 ? fmtLong(pl, poll.slots[best], poll.duration) : "",
    poll.place || "",
    "",
    ...invitees.map(inv => {
      const v = best >= 0 && inv.answers ? inv.answers[best] || 0 : 0;
      return `  - ${inv.name}: ${v === 1 ? t(lang, "ansYes") : v === 2 ? t(lang, "ansNo") : t(lang, "ansNone")}`;
    })
  ].join("\n");

  const script = `
  document.getElementById('sumBtn').addEventListener('click',function(){
    copyText(${JSON.stringify(summary)}, ${JSON.stringify(t(lang, "summaryCopied"))});
  });
  document.getElementById('allBtn').addEventListener('click',function(){
    copyText(${JSON.stringify(allLinks)}, ${JSON.stringify(t(lang, "allCopied"))});
  });
  setTimeout(function(){ location.reload(); }, 60000);`;

  const right = `<a class="btn btn-text btn-sm" href="/admin/logout">${esc(t(lang, "logout"))}</a>`;
  return layout(lang, poll.title, body, { script, rightSlot: right });
}

/* ------------------------------------------------------- participant */
export function participantPage(lang, poll, invitee) {
  const ordered = sortSlots(poll.slots);
  const answers = invitee.answers || poll.slots.map(() => 0);

  const slots = ordered.map(({ s, i }) => `
    <div class="p-slot">
      <div class="when">
        <b>${esc(fmtDay(lang, s))} &middot; ${esc(s.h)}&ndash;${esc(endTime(s.h, poll.duration))}</b>
        <span>${esc(String(new Date(s.d).getFullYear()))} &middot; ${poll.duration} ${esc(t(lang, "min"))}</span>
      </div>
      <div class="seg">
        <button type="button" data-i="${i}" data-v="1" aria-pressed="${answers[i] === 1}">${esc(t(lang, "yes"))}</button>
        <button type="button" data-i="${i}" data-v="2" aria-pressed="${answers[i] === 2}">${esc(t(lang, "no"))}</button>
      </div>
    </div>`).join("");

  const closed = poll.closed;
  const body = `
  <div class="stack">
    <div class="card"><div class="card-body">
      <span class="hint">${esc(t(lang, "pEyebrow"))}</span>
      <h1>${esc(poll.title)}</h1>
      <p>${esc(t(lang, "pHello", { n: invitee.name }))}</p>
      <div class="row" style="gap:24px;margin-top:6px">
        <div><div class="hint">${esc(t(lang, "mOrg"))}</div>${esc(poll.organizerName || "—")}</div>
        <div><div class="hint">${esc(t(lang, "mDur"))}</div>${poll.duration} ${esc(t(lang, "min"))}</div>
        <div><div class="hint">${esc(t(lang, "mWhere"))}</div>${esc(poll.place || t(lang, "tbd"))}</div>
      </div>
    </div></div>

    ${closed ? `<div class="notice info">${esc(t(lang, "closedNotice"))}
      ${poll.chosenSlot != null ? "<br>" + esc(t(lang, "chosenNotice", { s: fmtLong(lang, poll.slots[poll.chosenSlot], poll.duration) })) : ""}</div>` : ""}

    <div class="stack" id="slots" style="gap:8px">${slots}</div>

    ${closed ? "" : `
    <div class="row">
      <button class="btn btn-text btn-sm" type="button" id="allYes">${esc(t(lang, "allYes"))}</button>
      <button class="btn btn-text btn-sm" type="button" id="allNo">${esc(t(lang, "allNo"))}</button>
    </div>

    <div class="card"><div class="card-body">
      <p class="hint" id="status"></p>
      <div><button class="btn btn-primary" type="button" id="saveBtn">${esc(t(lang, "save"))}</button></div>
      <div id="okBox" class="notice ok" hidden></div>
    </div></div>`}

    ${invitee.answeredAt ? `<p class="hint">${esc(t(lang, "savedAt", { d: fmtDateTime(lang, invitee.answeredAt) }))}</p>` : ""}
  </div>`;

  const script = closed ? "" : `
  var answers = ${JSON.stringify(answers)};
  var STR = {
    missing: ${JSON.stringify(L(lang).missing)},
    allSet: ${JSON.stringify(t(lang, "allSet"))},
    saving: ${JSON.stringify(t(lang, "saving"))},
    save: ${JSON.stringify(t(lang, "save"))},
    saved: ${JSON.stringify(t(lang, "saved"))},
    err: ${JSON.stringify(t(lang, "saveError"))}
  };
  function paint(){
    document.querySelectorAll('#slots .seg button').forEach(function(b){
      var i=+b.dataset.i, v=+b.dataset.v;
      b.setAttribute('aria-pressed', answers[i]===v ? 'true':'false');
    });
    var done = answers.filter(function(v){return v>0}).length;
    document.getElementById('status').textContent = done===answers.length
      ? STR.allSet
      : STR.missing.split('{n}').join(answers.length-done).split('{t}').join(answers.length);
  }
  document.querySelectorAll('#slots .seg button').forEach(function(b){
    b.addEventListener('click', function(){
      var i=+b.dataset.i, v=+b.dataset.v;
      answers[i] = answers[i]===v ? 0 : v;
      paint();
    });
  });
  document.getElementById('allYes').addEventListener('click',function(){ answers=answers.map(function(){return 1}); paint(); });
  document.getElementById('allNo').addEventListener('click',function(){ answers=answers.map(function(){return 2}); paint(); });
  document.getElementById('saveBtn').addEventListener('click', function(){
    var btn=this; btn.disabled=true; btn.textContent=STR.saving;
    fetch(location.pathname, {method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({answers: answers})})
      .then(function(r){ if(!r.ok) throw new Error('bad'); return r.json(); })
      .then(function(){
        var ok=document.getElementById('okBox');
        ok.textContent=STR.saved; ok.hidden=false;
        btn.textContent=STR.save; btn.disabled=false;
      })
      .catch(function(){ toast(STR.err); btn.textContent=STR.save; btn.disabled=false; });
  });
  paint();`;

  return layout(lang, poll.title, body, { script });
}

/* ------------------------------------------------------------ simple */
export function simplePage(lang, message, kind = "bad") {
  return layout(lang, t(lang, "appName"),
    `<div class="notice ${kind}" style="margin-top:40px">${esc(message)}</div>`);
}
