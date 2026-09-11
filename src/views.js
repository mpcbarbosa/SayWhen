import { t, L, LANGS } from "./i18n.js";
import {
  esc, fmtDay, fmtLong, endTime, sortSlots, tallies, bestIndex, fmtDateTime,
  TIMEZONES, DEFAULT_TZ, tzLabel, slotStart
} from "./util.js";

// Horas em passos de 15 minutos, das 07:00 às 21:00.
export const TIMES = (() => {
  const out = [];
  for (let h = 7; h <= 21; h++) {
    for (const m of [0, 15, 30, 45]) {
      if (h === 21 && m > 0) break;
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return out;
})();
const timeOpts = (sel) =>
  TIMES.map(v => `<option value="${v}"${v === sel ? " selected" : ""}>${v}</option>`).join("");

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
select.lang{width:auto;min-width:110px;padding:6px 8px}
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
.p-slot .when span.localtime{color:var(--accent-ink);font-weight:500}
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
.savebar{position:sticky;bottom:0;z-index:30;background:var(--surface);
  border:1px solid var(--line);border-radius:var(--radius);box-shadow:0 -2px 12px rgba(32,33,36,.10)}
.savebar-in{padding:14px 18px;display:flex;gap:14px;align-items:center;flex-wrap:wrap}
.savebar-in p{flex:1;min-width:180px;margin:0}
.savebar.dirty{border-color:var(--accent);background:var(--accent-soft)}
.savebar.dirty p{color:var(--accent-ink);font-weight:500}
.savebar.saved{border-color:var(--yes);background:var(--yes-soft)}
.savebar.saved p{color:var(--yes);font-weight:500}
.picker{border:1px solid var(--line);border-radius:var(--radius);background:var(--surface)}
.picker-head{display:flex;gap:10px;align-items:center;padding:10px 12px;border-bottom:1px solid var(--line)}
.picker-head input{flex:1;min-width:120px}
.picker-head .cnt{color:var(--muted);font-size:12.5px;white-space:nowrap}
.chips{display:flex;gap:8px;flex-wrap:wrap;padding:10px 12px;border-bottom:1px solid var(--line)}
.chip{border:1px solid var(--line);background:var(--surface);color:var(--accent);border-radius:999px;
  padding:5px 12px;font-size:12.5px;font-weight:500;cursor:pointer;line-height:1.3}
.chip:hover{background:var(--accent-soft)}
.chip[aria-pressed=true]{background:var(--accent-soft);border-color:var(--accent);color:var(--accent-ink)}
.pick-list{max-height:236px;overflow-y:auto}
.pick-item{display:flex;gap:10px;align-items:baseline;padding:7px 12px;cursor:pointer;
  border-bottom:1px solid var(--surface-2)}
.pick-item:last-child{border-bottom:none}
.pick-item:hover{background:var(--surface-2)}
.pick-item input{width:auto;flex:none;align-self:center}
.pick-item b{font-weight:500}
.pick-item span{color:var(--muted);font-size:12.5px}
.pick-none{padding:14px 12px;color:var(--muted);font-size:12.5px}
.tags{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.tag{display:inline-flex;align-items:center;gap:4px;border:1px solid var(--line);border-radius:999px;
  padding:2px 4px 2px 10px;font-size:11.5px;color:var(--muted);background:var(--surface)}
.tag button{border:none;background:transparent;color:var(--muted);cursor:pointer;
  width:18px;height:18px;border-radius:50%;line-height:1;padding:0}
.tag button:hover{background:var(--no-soft);color:var(--no)}
.contact-row{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;padding:14px 0;
  border-bottom:1px solid var(--line)}
.contact-row:last-of-type{border-bottom:none}
details.members{border:1px solid var(--line);border-radius:var(--radius)}
details.members summary{padding:9px 12px;cursor:pointer;font-size:13px;color:var(--accent)}
details.members .pick-list{border-top:1px solid var(--line)}
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

/* ------------------------------------------------- seletor de pessoas */
// A lista guardada, para marcar em vez de escrever. O campo de texto continua
// a mandar: o que está marcado aqui é só o reflexo do que lá está escrito.
export function picker(lang, contacts, groups, boxId) {
  if (!contacts.length) {
    return `<div class="picker" id="${boxId}"><p class="pick-none">${esc(t(lang, "pickEmpty"))}</p></div>`;
  }
  const byId = new Map(contacts.map(c => [c.id, c]));
  const chips = groups
    .filter(g => g.members.some(m => byId.has(m)))
    .map(g => `<button type="button" class="chip" aria-pressed="false"
        data-emails="${esc(g.members.filter(m => byId.has(m)).map(m => byId.get(m).email).join(","))}"
      >${esc(g.name)}</button>`).join("");

  const items = contacts.map(c => `
    <label class="pick-item" data-find="${esc((c.name + " " + c.emails.join(" ")).toLowerCase())}">
      <input type="checkbox" data-email="${esc(c.email)}"
             data-line="${esc(`${c.name} ${c.email}${c.lang ? " " + c.lang : ""}`)}">
      <b>${esc(c.name)}</b> <span>${esc(c.email)}</span>
    </label>`).join("");

  return `
  <div class="picker" id="${boxId}">
    <div class="picker-head">
      <input type="search" class="pick-search" placeholder="${esc(t(lang, "pickSearch"))}" autocomplete="off">
      <span class="cnt">0</span>
    </div>
    ${chips ? `<div class="chips">${chips}</div>` : ""}
    <div class="pick-list">${items}</div>
  </div>`;
}

// Liga o seletor ao campo de texto. Nos dois sentidos: marcar acrescenta a
// linha, desmarcar tira-a, e escrever à mão volta a acertar as caixas.
const PICKER_SCRIPT = (boxId, textareaSel, lang) => `
(function(){
  var box=document.getElementById(${JSON.stringify(boxId)});
  var ta=document.querySelector(${JSON.stringify(textareaSel)});
  var cnt=box&&box.querySelector('.cnt');
  var search=box&&box.querySelector('.pick-search');
  // Agenda vazia: o seletor é só uma frase, não há nada a ligar.
  if(!box||!ta||!cnt||!search) return;
  var boxes=[].slice.call(box.querySelectorAll('.pick-item input'));
  var chips=[].slice.call(box.querySelectorAll('.chip'));
  var mailRe=/([^\\s<,;]+@[^\\s>,;]+)/;

  function emailsIn(){
    var out=[];
    ta.value.split(/[\\n;]+/).forEach(function(l){
      var m=l.match(mailRe);
      if(m) out.push(m[1].toLowerCase().replace(/[.,;>]+$/,''));
    });
    return out;
  }
  function lines(){ return ta.value.split('\\n'); }
  function addLine(line,email){
    if(emailsIn().indexOf(email)>=0) return;
    var v=ta.value.replace(/\\s+$/,'');
    ta.value=(v?v+'\\n':'')+line;
  }
  function dropLine(email){
    ta.value=lines().filter(function(l){
      var m=l.match(mailRe);
      return !(m && m[1].toLowerCase().replace(/[.,;>]+$/,'')===email);
    }).join('\\n');
  }
  function refresh(){
    var have=emailsIn(), n=0;
    boxes.forEach(function(b){
      b.checked = have.indexOf(b.dataset.email)>=0;
      if(b.checked) n++;
    });
    chips.forEach(function(ch){
      var ids=ch.dataset.emails.split(',').filter(Boolean);
      var all=ids.length>0 && ids.every(function(e){ return have.indexOf(e)>=0; });
      ch.setAttribute('aria-pressed', all?'true':'false');
    });
    cnt.textContent=${JSON.stringify(t(lang, "pickCount"))}.replace('{n}',n).replace('{t}',boxes.length);
  }
  boxes.forEach(function(b){
    b.addEventListener('change',function(){
      if(b.checked) addLine(b.dataset.line,b.dataset.email); else dropLine(b.dataset.email);
      ta.dispatchEvent(new Event('input',{bubbles:true}));
    });
  });
  chips.forEach(function(ch){
    ch.addEventListener('click',function(){
      var on=ch.getAttribute('aria-pressed')==='true';
      var wanted=ch.dataset.emails.split(',').filter(Boolean);
      boxes.forEach(function(b){
        if(wanted.indexOf(b.dataset.email)<0) return;
        if(on) dropLine(b.dataset.email); else addLine(b.dataset.line,b.dataset.email);
      });
      refresh();
    });
  });
  ta.addEventListener('input',refresh);
  search.addEventListener('input',function(){
    var q=search.value.trim().toLowerCase();
    box.querySelectorAll('.pick-item').forEach(function(it){
      it.hidden = q!=='' && it.dataset.find.indexOf(q)<0;
    });
  });
  refresh();
})();`;

/* -------------------------------------------------------- admin home */
/* ---------------------------------------------- formulário partilhado */
// Usado para criar uma sondagem nova e para editar um rascunho.
function pollForm(lang, { action, poll, people, formId, primary, draft, showDraft = true, contacts = [], groups = [] }) {
  const today = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const timeOptions = timeOpts;

  const slotRow = (d, h) => `
    <div class="slot-row">
      <input type="date" name="date" value="${esc(d)}">
      <select name="time">${timeOptions(h)}</select>
      <span class="hint"></span>
      <button type="button" class="del" aria-label="x">&times;</button>
    </div>`;

  const slots = (poll && poll.slots && poll.slots.length)
    ? poll.slots.map(s => slotRow(s.d, s.h)).join("")
    : slotRow(today, "10:00") + slotRow(today, "15:00") + slotRow(today, "16:30");

  const v = (x, fallback = "") => esc(poll && poll[x] != null && poll[x] !== "" ? poll[x] : fallback);
  const dur = poll ? String(poll.duration) : "60";
  const plang = poll && poll.lang ? poll.lang : lang;
  const ptz = poll && poll.tz ? poll.tz : DEFAULT_TZ;
  const peopleText = (people || []).map(i => `${i.name} ${i.email}${i.lang ? " " + i.lang : ""}`).join("\n");

  return `
      <form class="card-body" method="post" action="${action}" id="${formId}">
        <div class="row">
          <label class="field" style="flex:2;min-width:240px">${esc(t(lang, "fTitle"))}
            <input type="text" name="title" value="${v("title")}" ${draft ? "" : "required"}>
          </label>
          <label class="field" style="flex:1;min-width:130px">${esc(t(lang, "fDur"))}
            <select name="duration">
              ${[[30, "30 min"], [45, "45 min"], [60, "1 h"], [90, "1 h 30"], [120, "2 h"]]
                .map(([val, lbl]) => `<option value="${val}"${String(val) === dur ? " selected" : ""}>${lbl}</option>`).join("")}
            </select>
          </label>
          <label class="field" style="flex:1;min-width:130px">${esc(t(lang, "fLang"))}
            <select name="lang">
              ${LANGS.map(l => `<option value="${l}"${l === plang ? " selected" : ""}>${esc(L(l).name)}</option>`).join("")}
            </select>
          </label>
        </div>
        <div class="row">
          <label class="field" style="flex:1;min-width:260px">${esc(t(lang, "fTz"))}
            <select name="tz">
              ${TIMEZONES.map(([id, label]) =>
                `<option value="${id}"${id === ptz ? " selected" : ""}>${esc(label)}</option>`).join("")}
            </select>
          </label>
        </div>
        <div class="row">
          <label class="field" style="flex:1;min-width:170px">${esc(t(lang, "fOrg"))}
            <input type="text" name="organizerName" value="${v("organizerName")}" ${draft ? "" : "required"}>
          </label>
          <label class="field" style="flex:1;min-width:200px">${esc(t(lang, "fMail"))}
            <input type="email" name="organizerEmail" value="${v("organizerEmail")}" ${draft ? "" : "required"}>
          </label>
          <label class="field" style="flex:1;min-width:170px">${esc(t(lang, "fPlace"))}
            <input type="text" name="place" value="${v("place")}">
          </label>
        </div>
        <div>
          <h3 style="margin-bottom:8px">${esc(t(lang, "fSlots"))}</h3>
          <div class="stack" id="slots" style="gap:8px">${slots}</div>
          <div style="margin-top:10px"><button class="btn btn-sm" type="button" id="addSlot">+ ${esc(t(lang, "addSlot"))}</button></div>
        </div>
        <div class="stack" style="gap:8px">
          <h3>${esc(t(lang, "fPeople"))}</h3>
          ${picker(lang, contacts, groups, `pick-${formId}`)}
          <label class="field">${esc(t(lang, "fPeopleText"))}
            <textarea name="people" rows="5" ${draft ? "" : "required"}
              placeholder="Ana Ribeiro ana@cliente.pt&#10;Bruno Cardoso bruno@empresa.com">${esc(peopleText)}</textarea>
          </label>
          <p class="hint">${esc(t(lang, "fPeopleHint"))}</p>
        </div>
        <label class="row" style="gap:8px;font-size:13px;cursor:pointer">
          <input type="checkbox" name="selfJoin" value="1" checked style="width:auto">
          ${esc(t(lang, "selfJoin"))}
        </label>
        <div class="row">
          <button class="btn btn-primary" type="submit" name="action" value="publish" id="createBtn">${esc(primary)}</button>
          ${showDraft ? `<button class="btn" type="submit" name="action" value="draft" formnovalidate>${esc(t(lang, "saveDraft"))}</button>` : ""}
        </div>
      </form>`;
}

const FORM_SCRIPT = (lang, formId) => `
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
  document.getElementById('${formId}').addEventListener('submit',function(e){
    if (e.submitter && e.submitter.value === 'draft') return;
    var b=document.getElementById('createBtn');
    // Desativar já retirava o botão dos dados enviados — só depois da serialização.
    setTimeout(function(){ b.disabled=true; b.textContent=${JSON.stringify(t(lang, "creating"))}; }, 0);
  });
  ${PICKER_SCRIPT(`pick-${formId}`, `#${formId} textarea[name=people]`, lang)}`;

// Topo das páginas do organizador.
const adminNav = (lang) => `
  <a class="btn btn-text btn-sm" href="/admin/contacts">${esc(t(lang, "contactsTitle"))}</a>
  <a class="btn btn-text btn-sm" href="/admin/logout">${esc(t(lang, "logout"))}</a>`;

/* -------------------------------------------------------- admin home */
export function adminHome(lang, polls, flash, contacts = [], groups = []) {
  const list = polls.length
    ? `<div class="list">${polls.map(p => `
      <div class="list-item">
        <div class="grow">
          <a href="/admin/polls/${esc(p.id)}"><b>${esc(p.title) || esc(t(lang, "untitled"))}</b></a>
          ${p.status === "draft" ? `<span class="pill">${esc(t(lang, "draftTag"))}</span>` : ""}
          ${p.closed ? `<span class="pill done">${esc(t(lang, "closed"))}</span>` : ""}
          <div class="hint">${p.status === "draft"
            ? esc(t(lang, "draftHint"))
            : esc(t(lang, "answeredOf", { a: p.answered, t: p.total }))} ·
            ${esc(t(lang, "createdAt", { d: fmtDateTime(lang, p.createdAt) }))}</div>
        </div>
        <a class="btn btn-sm" href="/admin/polls/${esc(p.id)}">${esc(t(lang, p.status === "draft" ? "editDraft" : "openPoll"))}</a>
      </div>`).join("")}</div>`
    : `<p class="hint">${esc(t(lang, "noPolls"))}</p>`;

  const body = `
  ${flash ? `<div class="notice ok" style="margin-bottom:16px">${esc(flash)}</div>` : ""}
  <div class="stack">
    <section class="card">
      <div class="card-head"><h2>${esc(t(lang, "newPoll"))}</h2></div>
      ${pollForm(lang, { action: "/admin/polls", poll: null, people: [], formId: "newPoll",
        primary: t(lang, "createBtn"), draft: false, contacts, groups })}
    </section>

    <section class="card">
      <div class="card-head"><h2>${esc(t(lang, "adminTitle"))}</h2></div>
      <div class="card-body">${list}</div>
    </section>
  </div>`;

  const right = adminNav(lang);
  return layout(lang, t(lang, "adminTitle"), body, { script: FORM_SCRIPT(lang, "newPoll"), rightSlot: right });
}

/* ------------------------------------------------------- admin draft */
export function adminDraft(lang, poll, people, flash, contacts = [], groups = []) {
  const body = `
  ${flash ? `<div class="notice ok" style="margin-bottom:16px">${esc(flash)}</div>` : ""}
  <div class="stack">
    <div class="row">
      <a class="btn btn-text btn-sm" href="/admin">&larr; ${esc(t(lang, "back"))}</a>
    </div>
    <div class="notice info">${esc(t(lang, "draftNotice"))}</div>
    <section class="card">
      <div class="card-head">
        <h2>${esc(poll.title) || esc(t(lang, "untitled"))}</h2>
        <span class="sub">${esc(t(lang, "draftTag"))}</span>
      </div>
      ${pollForm(lang, {
        action: `/admin/polls/${esc(poll.id)}/update`, poll, people,
        formId: "draftForm", primary: t(lang, "publishDraft"), draft: true, contacts, groups
      })}
    </section>
    <form method="post" action="/admin/polls/${esc(poll.id)}/delete"
          onsubmit="return confirm(${esc(JSON.stringify(t(lang, "confirmDelete")))})">
      <button class="btn btn-text btn-sm btn-danger" type="submit">${esc(t(lang, "deletePoll"))}</button>
    </form>
  </div>`;

  const right = adminNav(lang);
  return layout(lang, poll.title || t(lang, "untitled"), body, { script: FORM_SCRIPT(lang, "draftForm"), rightSlot: right });
}

/* -------------------------------------------------------- admin edit */
export function adminEdit(lang, poll, people, flash, contacts = [], groups = []) {
  const body = `
  ${flash ? `<div class="notice ok" style="margin-bottom:16px">${esc(flash)}</div>` : ""}
  <div class="stack">
    <div class="row">
      <a class="btn btn-text btn-sm" href="/admin/polls/${esc(poll.id)}">&larr; ${esc(t(lang, "back"))}</a>
    </div>
    <div class="notice info">${esc(t(lang, "editNotice"))}</div>
    <section class="card">
      <div class="card-head"><h2>${esc(t(lang, "editPoll"))}</h2></div>
      ${pollForm(lang, {
        action: `/admin/polls/${esc(poll.id)}/update`, poll, people,
        formId: "editForm", primary: t(lang, "saveChanges"), draft: false, showDraft: false, contacts, groups
      })}
    </section>
  </div>`;

  const right = adminNav(lang);
  return layout(lang, poll.title || t(lang, "untitled"), body, { script: FORM_SCRIPT(lang, "editForm"), rightSlot: right });
}

/* -------------------------------------------------------- admin poll */
export function adminPoll(lang, poll, invitees, baseUrl, flash, mailOn = true, contacts = [], groups = []) {
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
        <div class="who-meta">${(inv.note || "").trim() ? "✎ " : ""}${esc(inv.email)} —
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

  const orgEmail = (poll.organizerEmail || "").toLowerCase();
  const isSelf = (inv) => orgEmail && inv.email.toLowerCase() === orgEmail;
  const selfIn = invitees.some(isSelf);

  const people = invitees.map(inv => `
    <div class="list-item">
      <div class="grow">
        <b>${esc(inv.name)}</b>
        ${isSelf(inv) ? `<span class="pill">${esc(t(lang, "meTag"))}</span>` : ""}
        <span class="pill ${inv.answeredAt ? "done" : ""}">${inv.answeredAt ? esc(t(lang, "answered")) : esc(t(lang, "pending"))}</span>
        <div class="hint">${esc(inv.email)}</div>
      </div>
      ${isSelf(inv)
        ? `<a class="btn btn-sm btn-primary" href="/v/${esc(inv.token)}">${esc(t(lang, "answerBtn"))}</a>`
        : `<a class="btn btn-sm btn-primary" href="${esc(inviteMailto(inv))}" target="_blank" rel="noopener">
             ${esc(t(lang, "inviteByMail"))}</a>`}
      <button class="btn btn-sm" type="button"
        onclick="copyText('${baseUrl}/v/${esc(inv.token)}', ${JSON.stringify(t(lang, "copied"))})">
        ${esc(t(lang, "copyLink"))}</button>
    </div>`).join("");

  const allLinks = invitees.map(inv => `${inv.name} <${inv.email}>\n${baseUrl}/v/${inv.token}`).join("\n\n");

  const withNotes = invitees.filter(i => (i.note || "").trim());

  // Sugestões agrupadas por horário, com quem as propôs, tirando as que já existem.
  const existing = new Set(poll.slots.map(s => `${s.d} ${s.h}`));
  const sugMap = new Map();
  for (const inv of invitees) {
    for (const sg of inv.suggestions || []) {
      const k = `${sg.d} ${sg.h}`;
      if (existing.has(k)) continue;
      if (!sugMap.has(k)) sugMap.set(k, { d: sg.d, h: sg.h, by: [] });
      sugMap.get(k).by.push(inv.name);
    }
  }
  const suggestions = [...sugMap.values()].sort((a, b) => (a.d + a.h < b.d + b.h ? -1 : 1));

  const body = `
  ${flash ? `<div class="notice ok" style="margin-bottom:16px">${esc(flash)}</div>` : ""}
  <div class="stack">
    <div class="row">
      <a class="btn btn-text btn-sm" href="/admin">&larr; ${esc(t(lang, "back"))}</a>
      <a class="btn btn-sm" href="/admin/polls/${esc(poll.id)}/edit">${esc(t(lang, "editPoll"))}</a>
      <div class="spacer"></div>
      <span class="hint">${esc(t(lang, "answeredOf", { a: answered, t: invitees.length }))}</span>
    </div>

    <section class="card">
      <div class="card-head">
        <h2>${esc(poll.title)}</h2>
        <span class="sub">${poll.duration} min${poll.place ? " · " + esc(poll.place) : ""} · ${esc(t(lang, "tzAdmin", { tz: tzLabel(poll.tz || DEFAULT_TZ) }))}${poll.closed ? " · " + esc(t(lang, "closed")) : ""}</span>
        <a class="btn btn-sm" href="/admin/polls/${esc(poll.id)}" id="refreshBtn">&#8635; ${esc(t(lang, "refresh"))}</a>
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
          ${best >= 0 ? `<i>${esc(t(lang, "icsHint"))}</i>` : ""}
        </div>
        <div class="row">
          ${best >= 0 ? `<a class="btn ${poll.closed ? "btn-primary" : ""}"
             href="/admin/polls/${esc(poll.id)}/ics">${esc(t(lang, "icsBtn"))}</a>` : ""}
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
            onsubmit="return confirm(${esc(JSON.stringify(t(lang, "confirmDelete")))})">
            <button class="btn btn-text btn-sm btn-danger" type="submit">${esc(t(lang, "deletePoll"))}</button>
          </form>
        </div>
      </div>
    </section>

    <section class="card">
      <div class="card-head"><h2>${esc(t(lang, "sugsTitle"))}</h2></div>
      <div class="card-body">
        ${suggestions.length ? `<div class="list">${suggestions.map(sg => `
          <div class="list-item">
            <div class="grow">
              <b>${esc(fmtLong(pl, { d: sg.d, h: sg.h }, poll.duration))}</b>
              <div class="hint">${esc(t(lang, "sugBy", { n: sg.by.join(", ") }))}</div>
            </div>
            <form method="post" action="/admin/polls/${esc(poll.id)}/adopt">
              <input type="hidden" name="d" value="${esc(sg.d)}">
              <input type="hidden" name="h" value="${esc(sg.h)}">
              <button class="btn btn-sm btn-primary" type="submit">${esc(t(lang, "adoptBtn"))}</button>
            </form>
          </div>`).join("")}</div>`
        : `<p class="hint">${esc(t(lang, "noSugs"))}</p>`}
      </div>
    </section>

    <section class="card">
      <div class="card-head"><h2>${esc(t(lang, "notesTitle"))}</h2></div>
      <div class="card-body">
        ${withNotes.length ? `<div class="list">${withNotes.map(inv => `
          <div class="list-item">
            <div class="grow">
              <b>${esc(inv.name)}</b>
              <div style="white-space:pre-wrap;margin-top:2px">${esc(inv.note)}</div>
            </div>
          </div>`).join("")}</div>`
        : `<p class="hint">${esc(t(lang, "noNotes"))}</p>`}
      </div>
    </section>

    <section class="card">
      <div class="card-head">
        <h2>${esc(t(lang, "fPeople"))}</h2>
        <span class="sub"><button class="btn btn-sm" type="button" id="allBtn">${esc(t(lang, "copyAll"))}</button></span>
      </div>
      <div class="card-body">
        ${mailOn ? "" : `<div class="notice"><b>${esc(t(lang, "mailOffTitle"))}</b><br>${esc(t(lang, "mailOffBody"))}</div>`}
        ${selfIn || !orgEmail ? "" : `
        <form method="post" action="/admin/polls/${esc(poll.id)}/join">
          <button class="btn" type="submit">${esc(t(lang, "joinBtn"))}</button>
        </form>`}
        <div class="list">${people}</div>
        <form method="post" action="/admin/polls/${esc(poll.id)}/people" class="stack" id="addForm"
              style="border-top:1px solid var(--line);padding-top:16px;gap:10px">
          <h3>${esc(t(lang, "addPeople"))}</h3>
          ${picker(lang, contacts, groups, "pick-addForm")}
          <label class="field">${esc(t(lang, "fPeopleText"))}
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
  ${PICKER_SCRIPT("pick-addForm", "#addForm textarea[name=people]", lang)}
  // A recarga automática não pode apagar o que já está escrito à mão.
  setTimeout(function(){
    var ta=document.querySelector('#addForm textarea[name=people]');
    if(!ta || !ta.value.trim()) location.reload();
  }, 60000);`;

  const right = adminNav(lang);
  return layout(lang, poll.title, body, { script, rightSlot: right });
}

/* ---------------------------------------------------- admin contacts */
export function adminContacts(lang, contacts, groups, pairs, flash) {
  const langOpts = (sel) =>
    `<option value="">${esc(t(lang, "langAuto"))}</option>` +
    LANGS.map(l => `<option value="${l}"${l === sel ? " selected" : ""}>${esc(L(l).name)}</option>`).join("");

  const memberList = (gid, members) => `
    <div class="pick-list">${contacts.map(c => `
      <label class="pick-item">
        <input type="checkbox" name="member" value="${esc(c.id)}"${members.includes(c.id) ? " checked" : ""}>
        <b>${esc(c.name)}</b> <span>${esc(c.email)}</span>
      </label>`).join("")}</div>`;

  const dupCard = pairs.length ? `
    <section class="card">
      <div class="card-head"><h2>${esc(t(lang, "dupTitle"))}</h2></div>
      <div class="card-body">
        <p class="hint">${esc(t(lang, "dupHint"))}</p>
        <div class="list">${pairs.map(({ a, b }) => `
          <div class="list-item">
            <div class="grow">
              <b>${esc(a.name)}</b> <span class="hint">${esc(a.emails.join(", "))}</span><br>
              <b>${esc(b.name)}</b> <span class="hint">${esc(b.emails.join(", "))}</span>
            </div>
            <form method="post" action="/admin/contacts/merge" class="row" style="gap:8px">
              <input type="hidden" name="a" value="${esc(a.id)}">
              <input type="hidden" name="b" value="${esc(b.id)}">
              <button class="btn btn-sm" type="submit" name="into" value="${esc(a.id)}"
                >${esc(t(lang, "mergeInto", { e: a.email }))}</button>
              <button class="btn btn-sm" type="submit" name="into" value="${esc(b.id)}"
                >${esc(t(lang, "mergeInto", { e: b.email }))}</button>
              <button class="btn btn-sm btn-text" type="submit"
                      formaction="/admin/contacts/distinct">${esc(t(lang, "notDup"))}</button>
            </form>
          </div>`).join("")}</div>
      </div>
    </section>` : "";

  const rows = contacts.length ? contacts.map(c => {
    const others = c.emails.filter(e => e !== c.email.toLowerCase());
    return `
    <form method="post" action="/admin/contacts/${esc(c.id)}" class="contact-row"
          data-find="${esc((c.name + " " + c.emails.join(" ")).toLowerCase())}">
      <label class="field" style="flex:2;min-width:180px">${esc(t(lang, "cName"))}
        <input type="text" name="name" value="${esc(c.name)}" required>
      </label>
      <label class="field" style="flex:2;min-width:210px">${esc(t(lang, "cMain"))}
        <select name="email">
          ${c.emails.map(e => `<option value="${esc(e)}"${e === c.email.toLowerCase() ? " selected" : ""}>${esc(e)}</option>`).join("")}
        </select>
      </label>
      <label class="field" style="flex:1;min-width:120px">${esc(t(lang, "cLang"))}
        <select name="lang">${langOpts(c.lang || "")}</select>
      </label>
      <label class="field" style="flex:2;min-width:190px">${esc(t(lang, "cAddEmail"))}
        <input type="email" name="addEmail" placeholder="nome@outrodominio.com">
      </label>
      <div class="row" style="gap:6px">
        <button class="btn btn-sm" type="submit">${esc(t(lang, "cSave"))}</button>
        <button class="btn btn-sm btn-text btn-danger" type="submit"
                formaction="/admin/contacts/${esc(c.id)}/delete" formnovalidate
                onclick="return confirm(${esc(JSON.stringify(t(lang, "cConfirmDelete")))})"
          >${esc(t(lang, "cDelete"))}</button>
      </div>
      ${others.length ? `<div class="tags" style="flex-basis:100%">
        <span class="hint">${esc(t(lang, "cOther"))}</span>
        ${others.map(e => `<span class="tag">${esc(e)}
          <button type="submit" name="drop" value="${esc(e)}" formnovalidate
                  formaction="/admin/contacts/${esc(c.id)}/email"
                  aria-label="${esc(t(lang, "cDropEmail"))}" title="${esc(t(lang, "cDropEmail"))}">&times;</button>
        </span>`).join("")}
      </div>` : ""}
    </form>`;
  }).join("") : `<p class="hint">${esc(t(lang, "cEmpty"))}</p>`;

  const body = `
  ${flash ? `<div class="notice ok" style="margin-bottom:16px">${esc(flash)}</div>` : ""}
  <div class="stack">
    <div class="row"><a class="btn btn-text btn-sm" href="/admin">&larr; ${esc(t(lang, "back"))}</a></div>
    ${dupCard}

    <section class="card">
      <div class="card-head">
        <h2>${esc(t(lang, "contactsTitle"))}</h2>
        <span class="sub">${esc(t(lang, "cCount", { n: contacts.length }))}</span>
      </div>
      <div class="card-body">
        <p class="hint">${esc(t(lang, "cHint"))}</p>
        <input type="search" id="cSearch" placeholder="${esc(t(lang, "pickSearch"))}" autocomplete="off">
        <div id="cList">${rows}</div>
      </div>
    </section>

    <section class="card">
      <div class="card-head"><h2>${esc(t(lang, "cNew"))}</h2></div>
      <form class="card-body" method="post" action="/admin/contacts">
        <div class="row">
          <label class="field" style="flex:2;min-width:180px">${esc(t(lang, "cName"))}
            <input type="text" name="name" required>
          </label>
          <label class="field" style="flex:2;min-width:210px">${esc(t(lang, "cMain"))}
            <input type="email" name="email" required>
          </label>
          <label class="field" style="flex:1;min-width:120px">${esc(t(lang, "cLang"))}
            <select name="lang">${langOpts("")}</select>
          </label>
        </div>
        <div><button class="btn btn-primary" type="submit">${esc(t(lang, "cAdd"))}</button></div>
      </form>
    </section>

    <section class="card">
      <div class="card-head"><h2>${esc(t(lang, "groupsTitle"))}</h2></div>
      <div class="card-body">
        <p class="hint">${esc(t(lang, "gHint"))}</p>
        ${groups.map(g => `
        <form method="post" action="/admin/groups/${esc(g.id)}" class="stack" style="gap:10px">
          <div class="row">
            <label class="field" style="flex:1;min-width:200px">${esc(t(lang, "gName"))}
              <input type="text" name="name" value="${esc(g.name)}" required>
            </label>
            <div class="row" style="gap:6px">
              <button class="btn btn-sm" type="submit">${esc(t(lang, "cSave"))}</button>
              <button class="btn btn-sm btn-text btn-danger" type="submit" formnovalidate
                      formaction="/admin/groups/${esc(g.id)}/delete"
                      onclick="return confirm(${esc(JSON.stringify(t(lang, "gConfirmDelete")))})"
                >${esc(t(lang, "cDelete"))}</button>
            </div>
          </div>
          <details class="members">
            <summary>${esc(t(lang, "gMembers", { n: g.members.length }))}</summary>
            ${memberList(g.id, g.members)}
          </details>
        </form>`).join("") || `<p class="hint">${esc(t(lang, "gEmpty"))}</p>`}

        <form method="post" action="/admin/groups" class="stack"
              style="border-top:1px solid var(--line);padding-top:16px;gap:10px">
          <label class="field" style="max-width:320px">${esc(t(lang, "gNew"))}
            <input type="text" name="name" required placeholder="${esc(t(lang, "gPlaceholder"))}">
          </label>
          ${contacts.length ? `<details class="members">
            <summary>${esc(t(lang, "gPick"))}</summary>
            ${memberList("new", [])}
          </details>` : ""}
          <div><button class="btn btn-primary" type="submit">${esc(t(lang, "gAdd"))}</button></div>
        </form>
      </div>
    </section>
  </div>`;

  const script = `
  var cs=document.getElementById('cSearch');
  cs.addEventListener('input',function(){
    var q=cs.value.trim().toLowerCase();
    document.querySelectorAll('#cList .contact-row').forEach(function(r){
      r.hidden = q!=='' && r.dataset.find.indexOf(q)<0;
    });
  });
  document.querySelectorAll('details.members').forEach(function(d){
    var s=d.querySelector('summary'), boxes=d.querySelectorAll('input[name=member]');
    var base=s.textContent;
    function upd(){
      var n=0; boxes.forEach(function(b){ if(b.checked) n++; });
      s.textContent=base.replace(/\\d+/, n);
    }
    boxes.forEach(function(b){ b.addEventListener('change',upd); });
  });`;

  return layout(lang, t(lang, "contactsTitle"), body, { script, rightSlot: adminNav(lang) });
}

function sugRow(lang, d, h) {
  return `
    <div class="slot-row sug-row">
      <input type="date" name="sugDate" value="${esc(d)}">
      <select name="sugTime">${timeOpts(h || "10:00")}</select>
      <span class="hint"></span>
      <button type="button" class="del" aria-label="${esc(t(lang, "sugRemove"))}">&times;</button>
    </div>`;
}

/* ------------------------------------------------------- participant */
export function participantPage(lang, poll, invitee, { admin = false } = {}) {
  const ordered = sortSlots(poll.slots);
  const answers = invitee.answers || poll.slots.map(() => 0);
  const tz = poll.tz || DEFAULT_TZ;

  const slots = ordered.map(({ s, i }) => {
    const start = slotStart(s, tz);
    const end = new Date(start.getTime() + poll.duration * 60000);
    return `
    <div class="p-slot">
      <div class="when">
        <b>${esc(fmtDay(lang, s))} &middot; ${esc(s.h)}&ndash;${esc(endTime(s.h, poll.duration))}</b>
        <span>${esc(String(new Date(s.d).getFullYear()))} &middot; ${poll.duration} ${esc(t(lang, "min"))}</span>
        <span class="localtime" hidden
              data-start="${start.toISOString()}" data-end="${end.toISOString()}"></span>
      </div>
      <div class="seg">
        <button type="button" data-i="${i}" data-v="1" aria-pressed="${answers[i] === 1}">${esc(t(lang, "yes"))}</button>
        <button type="button" data-i="${i}" data-v="2" aria-pressed="${answers[i] === 2}">${esc(t(lang, "no"))}</button>
      </div>
    </div>`;
  }).join("");

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

    <div class="notice info" id="tzBanner" hidden></div>

    ${closed ? `<div class="notice info">${esc(t(lang, "closedNotice"))}
      ${poll.chosenSlot != null ? "<br>" + esc(t(lang, "chosenNotice", { s: fmtLong(lang, poll.slots[poll.chosenSlot], poll.duration) })) : ""}</div>` : ""}

    <div class="stack" id="slots" style="gap:8px">${slots}</div>

    ${closed ? "" : `
    <div class="row">
      <button class="btn btn-text btn-sm" type="button" id="allYes">${esc(t(lang, "allYes"))}</button>
      <button class="btn btn-text btn-sm" type="button" id="allNo">${esc(t(lang, "allNo"))}</button>
    </div>

    <div class="card"><div class="card-body">
      <h3>${esc(t(lang, "sugTitle"))}</h3>
      <p class="hint">${esc(t(lang, "sugHint"))}</p>
      <div class="stack" id="sugs" style="gap:8px">
        ${(invitee.suggestions || []).map(sg => sugRow(lang, sg.d, sg.h)).join("") || sugRow(lang, "", "10:00")}
      </div>
      <div><button class="btn btn-sm" type="button" id="addSug">+ ${esc(t(lang, "sugAdd"))}</button></div>
    </div></div>

    <label class="field">${esc(t(lang, "noteLabel"))}
      <textarea name="note" id="note" rows="3" maxlength="600"
        placeholder="${esc(t(lang, "notePh"))}">${esc(invitee.note || "")}</textarea>
    </label>

    <div id="okBox" class="notice ok" hidden></div>

    <div class="savebar" id="savebar">
      <div class="savebar-in">
        <p class="hint" id="status"></p>
        <button class="btn btn-primary" type="button" id="saveBtn">${esc(t(lang, "save"))}</button>
      </div>
    </div>`}

    ${invitee.answeredAt ? `<p class="hint">${esc(t(lang, "savedAt", { d: fmtDateTime(lang, invitee.answeredAt) }))}</p>` : ""}
  </div>`;

  // Mostra a hora no relógio de quem abre a página, quando é diferente da do
  // fuso da sondagem. Só o browser sabe onde a pessoa está.
  const tzScript = `
  (function(){
    var POLL_TZ = ${JSON.stringify(tz)};
    var TZLABEL = ${JSON.stringify(tzLabel(tz))};
    var vtz = "";
    try { vtz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch(e) { return; }
    if (!vtz || vtz === POLL_TZ) return;
    var loc = ${JSON.stringify(lang)};
    function fmt(tzid){
      return {
        d: new Intl.DateTimeFormat(loc, {weekday:"short", day:"numeric", month:"short", timeZone: tzid}),
        t: new Intl.DateTimeFormat(loc, {hour:"2-digit", minute:"2-digit", hour12:false, timeZone: tzid})
      };
    }
    var mine = fmt(vtz), theirs = fmt(POLL_TZ);
    var vname = vtz.split("/").pop().replace(/_/g, " ");
    var any = false;
    document.querySelectorAll(".localtime").forEach(function(el){
      var s = new Date(el.dataset.start), e = new Date(el.dataset.end);
      var mineTxt = mine.d.format(s) + " " + mine.t.format(s) + "\\u2013" + mine.t.format(e);
      var theirsTxt = theirs.d.format(s) + " " + theirs.t.format(s) + "\\u2013" + theirs.t.format(e);
      if (mineTxt === theirsTxt) return;
      el.textContent = ${JSON.stringify(L(lang).yourTime)}
        .split("{your}").join(vname).split("{v}").join(mineTxt);
      el.hidden = false;
      any = true;
    });
    if (any) {
      var b = document.getElementById("tzBanner");
      b.textContent = ${JSON.stringify(L(lang).tzBanner)}
        .split("{tz}").join(TZLABEL).split("{your}").join(vname);
      b.hidden = false;
    }
  })();
  `;

  const script = tzScript + (closed ? "" : `
  var answers = ${JSON.stringify(answers)};
  var dirty = false;
  var everSaved = ${invitee.answeredAt ? "true" : "false"};
  var STR = {
    missing: ${JSON.stringify(L(lang).missing)},
    allSet: ${JSON.stringify(t(lang, "allSet"))},
    saving: ${JSON.stringify(t(lang, "saving"))},
    save: ${JSON.stringify(t(lang, "save"))},
    saved: ${JSON.stringify(t(lang, "saved"))},
    unsaved: ${JSON.stringify(t(lang, "unsaved"))},
    savedShort: ${JSON.stringify(t(lang, "savedShort"))},
    err: ${JSON.stringify(t(lang, "saveError"))}
  };
  var bar = document.getElementById('savebar');
  var statusEl = document.getElementById('status');

  function paint(){
    document.querySelectorAll('#slots .seg button').forEach(function(b){
      var i=+b.dataset.i, v=+b.dataset.v;
      b.setAttribute('aria-pressed', answers[i]===v ? 'true':'false');
    });
    var done = answers.filter(function(v){return v>0}).length;
    bar.className = 'savebar' + (dirty ? ' dirty' : (everSaved ? ' saved' : ''));
    if (dirty) {
      statusEl.textContent = STR.unsaved;
    } else if (everSaved) {
      statusEl.textContent = STR.savedShort;
    } else {
      statusEl.textContent = done===answers.length
        ? STR.allSet
        : STR.missing.split('{n}').join(answers.length-done).split('{t}').join(answers.length);
    }
  }
  function mark(){ dirty = true; paint(); }

  document.querySelectorAll('#slots .seg button').forEach(function(b){
    b.addEventListener('click', function(){
      var i=+b.dataset.i, v=+b.dataset.v;
      answers[i] = answers[i]===v ? 0 : v;
      mark();
    });
  });
  document.getElementById('allYes').addEventListener('click',function(){ answers=answers.map(function(){return 1}); mark(); });
  document.getElementById('allNo').addEventListener('click',function(){ answers=answers.map(function(){return 2}); mark(); });
  document.getElementById('note').addEventListener('input', mark);

  function bindSug(row){
    row.querySelector('.del').addEventListener('click', function(){
      if (document.querySelectorAll('#sugs .sug-row').length > 1) row.remove();
      else { row.querySelector('input[name=sugDate]').value = ''; }
      mark();
    });
    row.querySelectorAll('input,select').forEach(function(el){ el.addEventListener('change', mark); });
  }
  document.querySelectorAll('#sugs .sug-row').forEach(bindSug);
  document.getElementById('addSug').addEventListener('click', function(){
    var box = document.getElementById('sugs');
    if (box.children.length >= 3) return;
    var row = box.lastElementChild.cloneNode(true);
    row.querySelector('input[name=sugDate]').value = '';
    box.appendChild(row); bindSug(row);
  });
  function collectSugs(){
    var out = [];
    document.querySelectorAll('#sugs .sug-row').forEach(function(r){
      var d = r.querySelector('input[name=sugDate]').value;
      var h = r.querySelector('select[name=sugTime]').value;
      if (d) out.push({ d: d, h: h });
    });
    return out.slice(0, 3);
  }

  window.addEventListener('beforeunload', function(e){
    if (!dirty) return;
    e.preventDefault(); e.returnValue = '';
  });

  document.getElementById('saveBtn').addEventListener('click', function(){
    var btn=this; btn.disabled=true; btn.textContent=STR.saving;
    fetch(location.pathname, {method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        answers: answers,
        note: document.getElementById('note').value,
        suggestions: collectSugs()
      })})
      .then(function(r){ if(!r.ok) throw new Error('bad'); return r.json(); })
      .then(function(){
        var ok=document.getElementById('okBox');
        ok.textContent=STR.saved; ok.hidden=false;
        btn.textContent=STR.save; btn.disabled=false;
        dirty=false; everSaved=true; paint();
        ok.scrollIntoView({behavior:'smooth', block:'center'});
      })
      .catch(function(){ toast(STR.err); btn.textContent=STR.save; btn.disabled=false; });
  });
  paint();`);

  const langPicker = `
    <select class="lang" aria-label="Idioma" onchange="location.search='?lang='+this.value">
      ${LANGS.map(l => `<option value="${l}"${l === lang ? " selected" : ""}>${esc(L(l).name)}</option>`).join("")}
    </select>`;
  const right = (admin
    ? `<a class="btn btn-text btn-sm" href="/admin/polls/${esc(poll.id)}">&larr; ${esc(t(lang, "backToAdmin"))}</a>`
    : "") + langPicker;
  return layout(lang, poll.title, body, { script, rightSlot: right });
}

/* ------------------------------------------------------------ simple */
export function simplePage(lang, message, kind = "bad") {
  return layout(lang, t(lang, "appName"),
    `<div class="notice ${kind}" style="margin-top:40px">${esc(message)}</div>`);
}
