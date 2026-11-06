/* WORD VAULT · extensions
   1 solo vs the machine · 2 pick which content to play · 3 vocab topics from vocab.json
   4 podium shows student name, result and topics worked.
   Load it with ONE line before </body>:  <script src="wv-extensions.js"></script> */
(() => {
const W = { mode: "teams", first: "", last: "", cls: "knight", lvl: "normal", off: new Set(), playing: false, topics: new Map(), bk: null, timer: null };
try { W.off = new Set(JSON.parse(localStorage.getItem("wv_off") || "[]")); W.mode = localStorage.getItem("wv_mode") || "teams"; } catch (e) {}
const persist = () => { try { localStorage.setItem("wv_off", JSON.stringify([...W.off])); localStorage.setItem("wv_mode", W.mode); localStorage.setItem("wv_cm", JSON.stringify({ cm: W.chmode, max: W.max })); } catch (e) {} };
W.chmode = "topic"; W.max = 5;
try { const c = JSON.parse(localStorage.getItem("wv_cm") || "null"); if (c) { W.chmode = c.cm === "skill" ? "skill" : "topic"; W.max = Math.min(8, Math.max(2, +c.max || 5)); } } catch (e) {}
const BASE = { verb: "Irregular verbs", tense: "Present tenses", order: "Word order", habit: "Habits (used to)" };

/* ---------- where does a question come from? ---------- */
function srcOf(q) {
  if (q.src) {
    if (/^Topic: /.test(q.src)) return { key: q.src, label: q.src.slice(7), g: "voc" };
    if (q.src === "Our own words") return { key: q.src, label: q.src, g: "voc" };
    return { key: q.src, label: q.src, g: "app" };
  }
  if (q.r === "vocab") { const l = (q.sub || "Vocabulary").replace(/ · B2$/, ""); return { key: "v:" + l, label: l, g: "voc" }; }
  return { key: "b:" + q.r, label: BASE[q.r] || q.r, g: "gram" };
}
window.poolFor = function (roomId, level) {
  const dyn = /^src:/.test(roomId), key = roomId.slice(4);
  const ok = dyn ? q => srcOf(q).key === key : q => q.r === roomId && !W.off.has(srcOf(q).key);
  let p = BANK.filter(q => ok(q) && q.lv[0] <= level && level <= q.lv[1]);
  if (p.length < 12) p = BANK.filter(q => ok(q) && q.lv[0] - 1 <= level && level <= q.lv[1] + 1);
  return p;
};
const _merge = mergeItems;
window.mergeItems = (list, label) => { const b = EXTRA_ITEMS.length; const n = _merge(list, label); EXTRA_ITEMS.slice(b).forEach(i => i.src = label); return n; };
const _custom = parseCustomWords;
window.parseCustomWords = () => { _custom(); CUSTOM_ITEMS.forEach(i => i.src = "Our own words"); renderSetup(); };

/* ---------- vocab topics: vocab.json (GitHub) + the teacher's editor (this browser) ---------- */
const GH_EDIT = "https://github.com/nuriacalvo-teacher/escape-room/edit/main/vocab.json";
W.fileTopics = []; W.localTopics = [];
try { W.localTopics = JSON.parse(localStorage.getItem("wv_topics") || "[]"); } catch (e) {}
const saveLocal = () => { try { localStorage.setItem("wv_topics", JSON.stringify(W.localTopics)); } catch (e) {} };
const allTopics = () => { const m = new Map(); W.fileTopics.forEach(t => m.set(t.name, t)); W.localTopics.forEach(t => m.set(t.name, t)); return [...m.values()].filter(t => !t.deleted); };
const parseWord = x => typeof x === "string"
  ? (p => ({ w: p[0].trim(), clue: (p[1] || "").trim(), hard: x.trim()[0] === "*" }))(x.replace(/^\s*\*/, "").split("|"))
  : { w: String(x.w || x.word || "").trim(), clue: String(x.clue || x.meaning || "").trim(), hard: !!x.hard };
function rebuildTopics() {
  for (let i = EXTRA_ITEMS.length - 1; i >= 0; i--) if (/^Topic: /.test(EXTRA_ITEMS[i].src || "")) EXTRA_ITEMS.splice(i, 1);
  for (let i = EXTRA_SOURCES.length - 1; i >= 0; i--) if (/^Topic: /.test(EXTRA_SOURCES[i])) EXTRA_SOURCES.splice(i, 1);
  rebuildBank();
  const topics = allTopics();
  const all = topics.flatMap(t => (t.words || []).map(parseWord)).filter(x => x.w);
  topics.forEach(t => {
    const ws = (t.words || []).map(parseWord).filter(x => x.w), lv = t.level || [1, 6];
    const pool = ws.length >= 4 ? ws : all;
    const items = ws.map(x => {
      const wrong = shuffle(pool.filter(y => y.w !== x.w)).slice(0, 3).map(y => y.w);
      if (wrong.length < 3) return null;
      return { r: "vocab", t: "mcq", w: x.w, o: [x.w, ...wrong], em: t.emoji || "📖", sub: t.name,
        q: x.clue ? `Which word means “${x.clue}”?` : `Topic “${t.name}”: which word starts with “${x.w[0]}” and has ${x.w.length} letters?`,
        tip: x.w + (x.clue ? " — " + x.clue : ""), lv: x.hard ? [Math.max(4, lv[0]), 6] : lv };
    }).filter(Boolean);
    if (items.length) mergeItems(items, "Topic: " + t.name);
  });
  if ($("wvEditor")) fillEditor();
  renderSetup();
}
async function loadTopics() {
  try { const r = await fetch("vocab.json?v=" + Date.now()); if (r.ok) W.fileTopics = (await r.json()).topics || []; } catch (e) {}
  rebuildTopics();
}
/* ----- the editor (teacher) ----- */
const wordsText = t => (t.words || []).map(w => typeof w === "string" ? w : (w.hard ? "*" : "") + (w.w || w.word) + ((w.clue || w.meaning) ? " | " + (w.clue || w.meaning) : "")).join("\n");
const exportJson = () => JSON.stringify({ name: "Vocabulary topics",
  _howto: "Each topic is one block inside topics[]. Words are written as: word | clue. Put * before a harder (B2) word. Minimum 4 words per topic.",
  topics: allTopics() }, null, 2);
function fillEditor(pick) {
  const sel = $("edSel"), keep = pick != null ? pick : sel.value;
  const local = new Set(W.localTopics.filter(t => !t.deleted).map(t => t.name));
  sel.innerHTML = `<option value="">➕ New topic</option>` + allTopics().map(t => `<option value="${esc(t.name)}">${local.has(t.name) ? "✏️ " : ""}${esc(t.name)}</option>`).join("");
  sel.value = keep; if (sel.value !== keep) sel.value = "";
  const t = allTopics().find(x => x.name === sel.value);
  $("edName").value = t ? t.name : ""; $("edEmoji").value = t ? (t.emoji || "") : "";
  $("edMin").value = t && t.level ? t.level[0] : 1; $("edMax").value = t && t.level ? t.level[1] : 6;
  $("edWords").value = t ? wordsText(t) : "";
}
function editor(before) {
  if ($("wvEditor")) return;
  const c = "bg-slate-900 border-2 border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 font-bold text-white outline-none";
  const b = (id, t, k) => `<button id="${id}" class="${k} font-black px-4 py-2 rounded-xl transition text-sm">${t}</button>`;
  const d = el("details", "bg-slate-900/70 backdrop-blur border border-slate-700 rounded-3xl p-5 md:p-7"); d.id = "wvEditor";
  d.innerHTML = `<summary class="cursor-pointer text-xl md:text-2xl font-black text-white">🧑‍🏫 Teacher: vocabulary editor</summary>
    <div class="space-y-3 mt-4">
    <p class="text-sm text-slate-400 font-bold">Write your topics here and play them straight away. When you are happy, press “Publish on GitHub” so every student gets them.</p>
    <div class="grid sm:grid-cols-4 gap-2">
      <select id="edSel" class="${c} sm:col-span-2"></select>
      <input id="edName" placeholder="Topic name" maxlength="30" class="${c} sm:col-span-2">
      <input id="edEmoji" placeholder="Emoji" maxlength="4" class="${c}">
      <select id="edMin" class="${c}">${LEVELS.map((l, i) => `<option value="${i + 1}">from ${l}</option>`).join("")}</select>
      <select id="edMax" class="${c} sm:col-span-2">${LEVELS.map((l, i) => `<option value="${i + 1}" ${i === 5 ? "selected" : ""}>to ${l}</option>`).join("")}</select>
    </div>
    <textarea id="edWords" rows="9" spellcheck="false" class="w-full bg-slate-950 border-2 border-slate-700 focus:border-amber-400 rounded-2xl px-4 py-3 font-bold text-slate-200 outline-none text-sm" placeholder="one word per line:  word | clue in English&#10;*hard word | clue  (the * marks a B2 word)&#10;At least 4 words."></textarea>
    <div class="flex flex-wrap gap-2">
      ${b("edSave", "💾 Save topic", "bg-emerald-500 hover:bg-emerald-400 text-slate-950")}
      ${b("edDel", "🗑️ Delete topic", "bg-slate-800 hover:bg-slate-700 text-rose-300")}
      ${b("edCopy", "📋 Copy vocab.json", "bg-slate-800 hover:bg-slate-700 text-sky-300")}
      ${b("edDl", "⬇️ Download", "bg-slate-800 hover:bg-slate-700 text-sky-300")}
      ${b("edGh", "🚀 Publish on GitHub", "bg-amber-500 hover:bg-amber-400 text-slate-950")}
    </div>
    <p id="edMsg" class="text-sm md:text-base font-bold text-emerald-300"></p></div>`;
  before.parentNode.insertBefore(d, before);
  const msg = (t, bad) => { const m = $("edMsg"); m.textContent = t; m.className = "text-sm md:text-base font-bold " + (bad ? "text-rose-300" : "text-emerald-300"); };
  const copy = async () => { try { await navigator.clipboard.writeText(exportJson()); return true; } catch (e) { return false; } };
  fillEditor();
  $("edSel").onchange = () => fillEditor();
  $("edSave").onclick = () => {
    const name = $("edName").value.trim(), words = $("edWords").value.split("\n").map(x => x.trim()).filter(Boolean);
    let lo = +$("edMin").value, hi = +$("edMax").value; if (lo > hi) [lo, hi] = [hi, lo];
    if (!name) return msg("Write a topic name first.", 1);
    if (words.filter(x => parseWord(x).w).length < 4) return msg("A topic needs at least 4 words.", 1);
    W.localTopics = W.localTopics.filter(t => t.name !== name);
    W.localTopics.push({ name, emoji: $("edEmoji").value.trim() || "📖", level: [lo, hi], words });
    saveLocal(); rebuildTopics(); fillEditor(name);
    msg("✅ Saved and ready to play. To publish it for everybody, press “Publish on GitHub”.");
  };
  $("edDel").onclick = () => {
    const name = $("edSel").value; if (!name) return msg("Choose a topic to delete.", 1);
    if (!confirm("Delete the topic “" + name + "”? It disappears for everybody once you publish.")) return;
    W.localTopics = W.localTopics.filter(t => t.name !== name); W.localTopics.push({ name, deleted: true });
    saveLocal(); rebuildTopics(); fillEditor(""); msg("Topic deleted. Press “Publish on GitHub” to make it final.");
  };
  $("edCopy").onclick = async () => msg((await copy()) ? "📋 vocab.json copied." : "Could not copy — use Download.", 0);
  $("edDl").onclick = () => {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([exportJson()], { type: "application/json" }));
    a.download = "vocab.json"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    msg("⬇️ vocab.json downloaded.");
  };
  $("edGh").onclick = async () => {
    const ok = await copy();
    window.open(GH_EDIT, "_blank");
    msg(ok ? "📋 Copied! On the GitHub page: click inside the text, press Ctrl+A then Ctrl+V (Cmd on Mac), then press “Commit changes”."
           : "GitHub opened, but the copy failed: press “Download” and upload that file instead.", !ok);
  };
}

/* ---------- setup screen ---------- */
function card(id, before, html) {
  let n = $(id);
  if (!n) { n = el("div", "bg-slate-900/70 backdrop-blur border border-slate-700 rounded-3xl p-5 md:p-7 space-y-4"); n.id = id; before.parentNode.insertBefore(n, before); }
  n.innerHTML = html; return n;
}
const chip = (on, html, attr) => `<button ${attr} class="px-3 py-2 rounded-xl border-2 text-sm font-black transition ${on ? "bg-slate-950 border-emerald-400/70 text-white" : "bg-slate-950/40 border-slate-800 text-slate-500 line-through"}">${html}</button>`;
function paint() {
  const teamsCard = $("teamCountPicker").closest(".rounded-3xl"), roomsCard = $("roomPicker").closest(".rounded-3xl");
  teamsCard.style.display = W.mode === "solo" ? "none" : "";
  /* mode */
  const mb = (m, t) => `<button data-m="${m}" class="py-4 rounded-2xl border-2 font-black text-lg transition ${W.mode === m ? "bg-amber-500 text-slate-950 border-amber-300" : "bg-slate-950 text-slate-300 border-slate-700 hover:border-amber-400"}">${t}</button>`;
  const inp = (id, ph, v) => `<input id="${id}" value="${esc(v)}" placeholder="${ph}" maxlength="24" class="min-w-0 bg-slate-900 border-2 border-slate-700 focus:border-amber-400 rounded-xl px-4 py-3 font-black text-white outline-none">`;
  const sel = (id, opts, cur) => `<select id="${id}" class="bg-slate-900 border-2 border-slate-700 rounded-xl px-3 py-3 font-bold text-slate-200 outline-none">${opts.map(o => `<option value="${o[0]}" ${String(o[0]) === String(cur) ? "selected" : ""}>${o[1]}</option>`).join("")}</select>`;
  const mc = card("wvMode", teamsCard,
    `<h3 class="text-xl md:text-2xl font-black text-white">0 · Game mode</h3>
     <div class="grid grid-cols-2 gap-3">${mb("teams", "👥 Teams (whole class)")}${mb("solo", "🧑‍🎓 Solo vs the machine")}</div>` +
    (W.mode === "solo" ? `<div class="grid sm:grid-cols-2 gap-3">${inp("wvFirst", "Name", W.first)}${inp("wvLast", "Surname", W.last)}
       ${sel("wvCls", CLASSES.map(c => [c.id, c.emoji + " " + c.name + " · " + c.power]), W.cls)}
       ${sel("wvLvl", [["easy", "🐢 Machine: easy (slower, fewer points)"], ["normal", "🤖 Machine: normal"], ["hard", "🐇 Machine: hard (fast, more points)"]], W.lvl)}</div>
       <p class="text-sm font-bold text-slate-400">Your name and surname will appear on the final podium.</p>` : ""));
  mc.querySelectorAll("[data-m]").forEach(b => b.onclick = () => { W.mode = b.dataset.m; persist(); renderSetup(); sfx.tick(); });
  if (W.mode === "solo") {
    $("wvFirst").oninput = e => W.first = e.target.value; $("wvLast").oninput = e => W.last = e.target.value;
    $("wvCls").onchange = e => W.cls = e.target.value; $("wvLvl").onchange = e => W.lvl = e.target.value;
  }
  /* content picker */
  const m = new Map();
  BANK.forEach(q => { const s = srcOf(q), e = m.get(s.key) || Object.assign({ n: 0 }, s); if (q.lv[0] <= S.level && S.level <= q.lv[1]) e.n++; m.set(s.key, e); });
  const srcs = [...m.values()];
  const G = { gram: "📘 Grammar · built in", voc: "📚 Vocabulary topics", app: "🧩 Apps on the portal and extra files" };
  const total = srcs.filter(s => !W.off.has(s.key)).reduce((n, s) => n + s.n, 0);
  const html = `<h3 class="text-xl md:text-2xl font-black text-white">4 · What do you want to practise?</h3>
    <div class="flex flex-wrap gap-2">${[["all", "Everything"], ["voc", "Only vocabulary"], ["gram", "Only grammar"]].map(p => `<button data-p="${p[0]}" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-black text-sm">${p[1]}</button>`).join("")}</div>` +
    Object.keys(G).map(g => { const L = srcs.filter(s => s.g === g); if (!L.length) return "";
      return `<div class="space-y-2"><p class="text-sm font-black uppercase tracking-widest text-slate-400">${G[g]}
        <button data-g="${g}:1" class="ml-3 underline text-emerald-300 normal-case">all</button><button data-g="${g}:0" class="ml-2 underline text-rose-300 normal-case">none</button></p>
        <div class="flex flex-wrap gap-2">${L.map(s => chip(!W.off.has(s.key), esc(s.label) + ` <span class="opacity-60">${s.n}</span>`, `data-i="${srcs.indexOf(s)}"`)).join("")}</div></div>`; }).join("") +
    `<div class="flex flex-wrap items-center gap-2 pt-1"><span class="text-sm font-black uppercase tracking-widest text-slate-400 mr-1">Chambers</span>` +
    [["topic", "🧩 One per topic"], ["skill", "📦 By skill (classic 5)"]].map(([k, t]) => `<button data-cm="${k}" class="px-4 py-2 rounded-xl border-2 text-sm font-black ${W.chmode === k ? "bg-amber-500 text-slate-950 border-amber-300" : "bg-slate-950 text-slate-300 border-slate-700 hover:border-amber-400"}">${t}</button>`).join("") +
    (W.chmode === "topic" ? `<select id="wvMax" class="bg-slate-900 border-2 border-slate-700 rounded-xl px-3 py-2 font-bold text-slate-200 outline-none">${[2, 3, 4, 5, 6, 7, 8].map(n => `<option value="${n}" ${n === W.max ? "selected" : ""}>up to ${n} chambers</option>`).join("")}</select>` : "") + `</div>` +
    `<p class="text-sm font-bold text-emerald-300">${total} questions selected at this level · ${possibleCount()} topics ready to become chambers (4+ questions each). In “one per topic” mode every game picks up to ${W.max} of them at random.</p>`;
  const cc = card("wvContent", roomsCard, html);
  const set = f => { srcs.forEach(s => f(s) ? W.off.delete(s.key) : W.off.add(s.key)); persist(); renderSetup(); sfx.tick(); };
  cc.querySelectorAll("[data-i]").forEach(b => b.onclick = () => { const k = srcs[+b.dataset.i].key; W.off.has(k) ? W.off.delete(k) : W.off.add(k); persist(); renderSetup(); sfx.tick(); });
  cc.querySelectorAll("[data-g]").forEach(b => b.onclick = () => { const [g, v] = b.dataset.g.split(":"); srcs.filter(s => s.g === g).forEach(s => v === "1" ? W.off.delete(s.key) : W.off.add(s.key)); persist(); renderSetup(); });
  cc.querySelectorAll("[data-p]").forEach(b => b.onclick = () => { const p = b.dataset.p; set(s => p === "all" || (p === "voc" ? s.g === "voc" : s.g !== "voc")); });
  cc.querySelectorAll("[data-cm]").forEach(b => b.onclick = () => { W.chmode = b.dataset.cm; persist(); renderSetup(); sfx.tick(); });
  const mx = cc.querySelector("#wvMax"); if (mx) mx.onchange = e => { W.max = +e.target.value; persist(); renderSetup(); };
  roomsCard.style.display = W.chmode === "topic" ? "none" : "";
  $("roomInfo").textContent = "The keystone words change every game: you need them to build the master code.";
  if (W.chmode === "topic") {
    const pc = possibleCount(), n = Math.min(pc, W.max), teams = W.mode === "solo" ? 2 : S.teamCount, L = LENGTHS.find(x => x.id === S.length);
    $("lengthInfo").textContent = (L.per * teams) + " questions per chamber · " + n + " chambers · escape clock " + L.clock + " min.";
    $("setupStatus").innerHTML = "<span class='text-white font-black'>" + (W.mode === "solo" ? "Solo" : teams + " teams") + "</span> · " + LEVELS[S.level - 1] + " · <span class='text-amber-300'>" + n + " chambers from " + pc + " topics</span>";
  }
  editor(roomsCard);
  /* optional player names per team */
  if (W.mode === "teams") Array.from($("teamList").children).forEach((row, i) => {
    if (!S.teams[i]) return;
    const f = el("input", "w-full bg-slate-900 border-2 border-slate-700 focus:border-amber-400 rounded-xl px-4 py-2 font-bold text-sm text-slate-200 outline-none");
    f.placeholder = "Players: names and surnames (optional)"; f.value = S.teams[i].players || "";
    f.oninput = e => S.teams[i].players = e.target.value; row.appendChild(f);
  });
}
const _rs = renderSetup;
window.renderSetup = function () { _rs(); try { paint(); } catch (e) { console.error(e); } };
const _ss = saveSetup;
window.saveSetup = function () { if (!W.playing) _ss(); };

/* ---------- chambers: one per topic + random keystones ---------- */
const KB = {
  tense: [["OFTEN", "an adverb of frequency: it sits between usually and sometimes"], ["ALWAYS", "adverb: one hundred per cent of the time"], ["NEVER", "adverb: not at any time"], ["USUALLY", "adverb: most of the time"], ["ALREADY", "used with the present perfect for something done sooner than expected"], ["SINCE", "present perfect: it goes with a point in time, like Monday or 2019"], ["JUST", "a very short time ago, used with the present perfect"], ["YET", "used in negatives and questions with the present perfect"]],
  order: [["DOES", "the auxiliary for a present simple question with he, she or it"], ["HAVE", "the auxiliary for a present perfect question with you or they"], ["SUBJECT", "who or what does the action: it goes before the verb"], ["WHERE", "the question word for a place"], ["WHEN", "the question word for a time"], ["WHICH", "the question word to choose between options"]],
  habit: [["SELDOM", "a formal adverb that means almost never"], ["USUALLY", "a habit in the present: most of the time"], ["RARELY", "adverb: not very often"], ["NORMALLY", "adverb: in the usual way, most days"], ["USED", "the first word of a past habit that no longer happens: ___ to"]],
  generic: [["VERB", "a word that shows an action"], ["NOUN", "a word for a person, place or thing"], ["PAST", "the time before now"], ["FUTURE", "the time that has not happened yet"], ["MODAL", "a verb like can, must or should"], ["TENSE", "the form of a verb that shows time"], ["CLAUSE", "a group of words with a subject and a verb"]]
};
const clearDyn = () => { for (let i = ROOMS.length - 1; i >= 0; i--) if (ROOMS[i].dyn) ROOMS.splice(i, 1); };
const mostCommon = a => { const c = {}; a.forEach(x => c[x] = (c[x] || 0) + 1); return Object.keys(c).sort((x, y) => c[y] - c[x])[0]; };
const okWord = w => /^[a-z]{4,9}$/i.test(w || "");
const clueFor = it => { const m = / — (.+)$/.exec(it.tip || ""); return esc(m ? m[1] : (it.q || "").replace(/_{2,}/g, "…")); };
function pickKey(items, used) {
  const r = mostCommon(items.map(i => i.r)); let c = [];
  if (r === "verb") c = BANK.filter(x => x.r === "verb" && x.t === "forms" && x.a && okWord(x.a[0][0]) && x.lv[0] <= S.level && S.level <= x.lv[1] + 1).map(x => ({ w: x.a[0][0], clue: "It is the past simple of <em>" + esc(x.q) + "</em>." }));
  else if (r === "vocab") c = items.filter(x => okWord(x.w)).map(x => ({ w: x.w, clue: clueFor(x) }));
  else c = (KB[r] || KB.generic).map(x => ({ w: x[0], clue: x[1] }));
  c = c.filter(x => !used.has(x.w.toUpperCase()));
  if (!c.length) c = KB.generic.map(x => ({ w: x[0], clue: x[1] })).filter(x => !used.has(x.w));
  if (!c.length) c = [{ w: "VAULT", clue: "the room where the treasure is kept" }];
  const k = c[Math.floor(Math.random() * c.length)]; used.add(k.w.toUpperCase()); return k;
}
const setKey = (room, k) => { room.keystone = k.w.toUpperCase(); room.riddle = k.w.length + " runes. The Guardian hid one word in this chamber — read the clue."; room.clue = k.clue; };
const possibleCount = () => { const seen = new Set(); BANK.forEach(q => { const s = srcOf(q); if (!W.off.has(s.key)) seen.add(s.key); }); return [...seen].filter(k => poolFor("src:" + k, S.level).length >= 4).length; };
function buildClassicRooms() {
  clearDyn(); const used = new Set();
  const rooms = W.chmode === "topic" ? buildTopicRooms() : buildClassicRooms();
  rooms.forEach(id => setKey(ROOMS.find(r => r.id === id), pickKey(poolFor(id, S.level), used)));
  return rooms;
}
function buildTopicRooms() {
  clearDyn();
  const m = new Map();
  BANK.forEach(q => { const s = srcOf(q); if (W.off.has(s.key)) return; const e = m.get(s.key) || Object.assign({ items: [] }, s); e.items.push(q); m.set(s.key, e); });
  const list = shuffle([...m.values()].filter(e => poolFor("src:" + e.key, S.level).length >= 4)).slice(0, W.max);
  const used = new Set(), CE = { verb: "⚡", tense: "⏳", order: "🧱", habit: "🔁" };
  return list.map((e, i) => {
    const first = e.items.find(x => x.src && x.em);
    const room = { id: "src:" + e.key, dyn: 1, color: PALETTE[i % PALETTE.length], skill: e.label,
      name: e.g === "voc" ? "The " + e.label + " Vault" : "The " + e.label + " Chamber",
      emoji: e.g === "voc" ? (first ? first.em : "📚") : e.g === "gram" ? (CE[e.items[0].r] || "📘") : "🧩",
      story: "Everything about “" + e.label + "”. Answer well and the keystone appears rune by rune." };
    setKey(room, pickKey(poolFor(room.id, S.level), used));
    ROOMS.push(room); return room.id;
  });
}
const _bq = buildQueue;
window.buildQueue = function (roomId, n) {
  const q = _bq(roomId, n);
  if (!/^src:/.test(roomId)) return q;
  return q.map((it, i) => it.r === "vocab" && it.t === "mcq" && it.w && i % 3 === 1 ? asWordPuzzle(it, ["scramble", "vowels", "listen"][Math.floor(i / 3) % 3]) : it);
};

/* ---------- starting and leaving ---------- */
const _sg = startGame;
window.startGame = function () {
  if (!W.playing) W.bk = { teams: S.teams, count: S.teamCount, rooms: S.rooms.slice() };
  if (W.mode === "solo" && (!W.first.trim() || !W.last.trim())) { toast("⚠️ Write your name and surname first"); ($(W.first.trim() ? "wvLast" : "wvFirst") || {}).focus?.(); return; }
  const rooms = W.bk.rooms.filter(id => poolFor(id, S.level).length >= 4);
  if (!rooms.length) { toast("⚠️ No questions with this selection — pick some content"); return; }
  S.rooms = rooms;
  if (W.mode === "solo") {
    S.teamCount = 2;
    S.teams = [{ name: W.first.trim() + " " + W.last.trim(), color: PALETTE[0], emoji: "🧑‍🎓", cls: W.cls, solo: true },
               { name: "The Machine", color: "#94a3b8", emoji: "🤖", cls: "knight", bot: true }];
  }
  W.playing = true; W.topics = new Map(); clearTimeout(W.timer);
  _sg();
};
const _qs = quitToSetup;
window.quitToSetup = function () {
  clearTimeout(W.timer);
  if (W.playing && W.bk) { S.teams = W.bk.teams; S.teamCount = W.bk.count; S.rooms = W.bk.rooms; }
  W.playing = false; clearDyn(); _qs();
};
const _nt = nextTurn;
window.nextTurn = function () {
  _nt();
  if (W.mode === "solo" && W.playing && S.teams.length === 2) {
    const p = $("turnCard").lastElementChild;
    if (p) p.textContent = activeTeam().bot ? "🤖 The machine is about to answer…" : "Your turn! 🎯";
  }
};

/* ---------- the machine ---------- */
const _aq = askQuestion;
window.askQuestion = function (item) {
  const t = activeTeam(); if (t.bot) t.powerLeft = 0;
  _aq(item);
  const q = S.current;
  if (q) { const s = srcOf(q), kind = q.r === "vocab" ? "voc" : "gram"; W.topics.set(kind + "|" + s.label, { label: s.label, kind }); }
  if (t.bot) botPlay(t, q);
};
function botPlay(t, q) {
  document.querySelectorAll("#qArea button, #qArea input, #powerRow button").forEach(e => e.disabled = true);
  $("powerRow").innerHTML = "<span class='text-lg font-black text-slate-400 animate-pulse'>🤖 The machine is thinking…</span>";
  /* the machine never fails: its level is its SPEED. The sooner it answers, the more points it earns. */
  const R = { easy: [.4, .6], normal: [.2, .35], hard: [.05, .18] }[W.lvl] || [.2, .35];
  const f = R[0] + Math.random() * (R[1] - R[0]);          /* share of the time already used */
  const noLimit = !S.qTime, T = noLimit ? 20 : S.qTime;
  W.timer = setTimeout(() => {
    if (S.answered || S.current !== q || activeTeam() !== t || !W.playing || S.mode === "end") return;
    const given = q.t === "mcq" ? q.o[0] : correctAnswerText(q);
    if (noLimit) { S.qTime = 1; S.qTotal = 100; S.qLeft = Math.round((1 - f) * 100); }   /* gives the speed bonus even with no time limit */
    try { judge(true, given, q, $("qArea")); } finally { if (noLimit) S.qTime = 0; }
  }, Math.max(1200, f * T * 1000));
}

/* ---------- podium: name, result and topics ---------- */
const _eg = endGame;
window.endGame = function (reason) {
  clearTimeout(W.timer); _eg(reason);
  try {
    const ranked = S.teams.slice().sort((a, b) => b.points - a.points || b.correct - a.correct);
    const idx = [1, 0, 2].filter(i => ranked[i]);
    Array.from($("podium").children).forEach((box, k) => {
      const t = ranked[idx[k]], bot = S.teams.find(x => x.bot); let line = "";
      if (t.bot) line = "🤖 Computer opponent";
      else if (t.solo) line = t.points > bot.points ? "🏆 Beat the machine" : t.points < bot.points ? "The machine won this time" : "Draw with the machine";
      else if (t.players) line = "👥 " + esc(t.players);
      if (line) box.insertAdjacentHTML("beforeend", "<p class='text-sm md:text-base font-bold text-slate-200 mt-2'>" + line + "</p>");
    });
    const arr = [...W.topics.values()], list = k => arr.filter(x => x.kind === k).map(x => esc(x.label)).join(" · ") || "—";
    const solo = S.teams.find(t => t.solo);
    const old = $("wvTopics"); if (old) old.remove();
    $("podium").insertAdjacentHTML("afterend",
      "<div id='wvTopics' class='print-area rounded-3xl bg-slate-900/70 border border-slate-700 px-5 py-4 space-y-1 text-base md:text-xl font-bold text-slate-200'>" +
      (solo ? "<p>🧑‍🎓 Student: <strong class='text-white'>" + esc(solo.name) + "</strong></p>" : "") +
      "<p>📘 Grammar worked: <strong class='text-amber-300'>" + list("gram") + "</strong></p>" +
      "<p>📚 Vocabulary worked: <strong class='text-emerald-300'>" + list("voc") + "</strong></p></div>");
  } catch (e) { console.error(e); }
};

/* ---------- fix 1: a chamber could be unlocked twice (Enter + click, or Enter twice) ----------
   That pushed duplicates into solvedRooms ("Chamber 8 of 5"), so the game never
   believed all chambers were done and the Guardian / podium never appeared. */
const _sl = submitLock;
window.submitLock = function () {
  if (W.lockBusy) return;
  const n = S.solvedRooms.length, esc0 = S.escaped;
  _sl();
  if (S.solvedRooms.length > n || (S.escaped && !esc0)) W.lockBusy = true;
};
["openChamberLock", "openMasterLock"].forEach(name => {
  const f = window[name];
  window[name] = function () { W.lockBusy = false; return f.apply(this, arguments); };
});
["renderMap", "continueFromMap"].forEach(name => {
  const f = window[name];
  window[name] = function () { S.solvedRooms = [...new Set(S.solvedRooms)]; return f.apply(this, arguments); };
});

/* ---------- fix 2: two options that mean the same ("I'll be" / "I will be") ---------- */
const eq = s => expand(s).replace(/\bwon't\b/g, "will not").replace(/\bshan't\b/g, "shall not");
const _mcq = renderMCQ;
window.renderMCQ = function (host, q) {
  if (!q._clean) {
    q._clean = 1;
    const c = q.o[0], seen = new Set([eq(c)]), rest = [];
    q.o.slice(1).forEach(o => { const k = eq(o); if (!seen.has(k)) { seen.add(k); rest.push(o); } });
    if (rest.length >= 1) q.o = [c, ...rest];
  }
  return _mcq(host, q);
};

/* ---------- go ---------- */
CUSTOM_ITEMS.forEach(i => i.src = "Our own words");
renderSetup();
loadTopics();
})();
