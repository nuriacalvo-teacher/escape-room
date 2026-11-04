/* WORD VAULT · extensions
   1 solo vs the machine · 2 pick which content to play · 3 vocab topics from vocab.json
   4 podium shows student name, result and topics worked.
   Load it with ONE line before </body>:  <script src="wv-extensions.js"></script> */
(() => {
const W = { mode: "teams", first: "", last: "", cls: "knight", lvl: .7, off: new Set(), playing: false, topics: new Map(), bk: null, timer: null };
try { W.off = new Set(JSON.parse(localStorage.getItem("wv_off") || "[]")); W.mode = localStorage.getItem("wv_mode") || "teams"; } catch (e) {}
const persist = () => { try { localStorage.setItem("wv_off", JSON.stringify([...W.off])); localStorage.setItem("wv_mode", W.mode); } catch (e) {} };
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
  const ok = q => !W.off.has(srcOf(q).key);
  let p = BANK.filter(q => q.r === roomId && ok(q) && q.lv[0] <= level && level <= q.lv[1]);
  if (p.length < 12) p = BANK.filter(q => q.r === roomId && ok(q) && q.lv[0] - 1 <= level && level <= q.lv[1] + 1);
  return p;
};
const _merge = mergeItems;
window.mergeItems = (list, label) => { const b = EXTRA_ITEMS.length; const n = _merge(list, label); EXTRA_ITEMS.slice(b).forEach(i => i.src = label); return n; };
const _custom = parseCustomWords;
window.parseCustomWords = () => { _custom(); CUSTOM_ITEMS.forEach(i => i.src = "Our own words"); renderSetup(); };

/* ---------- vocab.json: topics written by the teacher ---------- */
const parseWord = x => typeof x === "string"
  ? (p => ({ w: p[0].trim(), clue: (p[1] || "").trim(), hard: x.trim()[0] === "*" }))(x.replace(/^\s*\*/, "").split("|"))
  : { w: String(x.w || x.word || "").trim(), clue: String(x.clue || x.meaning || "").trim(), hard: !!x.hard };
async function loadTopics() {
  try {
    const r = await fetch("vocab.json?v=" + Date.now()); if (!r.ok) return;
    const d = await r.json(), topics = d.topics || [];
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
  } catch (e) { /* no vocab.json yet */ }
  renderSetup();
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
       ${sel("wvLvl", [[.5, "🤖 Machine: easy"], [.7, "🤖 Machine: normal"], [.88, "🤖 Machine: hard"]], W.lvl)}</div>
       <p class="text-sm font-bold text-slate-400">Your name and surname will appear on the final podium.</p>` : ""));
  mc.querySelectorAll("[data-m]").forEach(b => b.onclick = () => { W.mode = b.dataset.m; persist(); renderSetup(); sfx.tick(); });
  if (W.mode === "solo") {
    $("wvFirst").oninput = e => W.first = e.target.value; $("wvLast").oninput = e => W.last = e.target.value;
    $("wvCls").onchange = e => W.cls = e.target.value; $("wvLvl").onchange = e => W.lvl = +e.target.value;
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
    `<p class="text-sm font-bold text-emerald-300">${total} questions selected at this level. Chambers with fewer than 4 questions are skipped.</p>`;
  const cc = card("wvContent", roomsCard, html);
  const set = f => { srcs.forEach(s => f(s) ? W.off.delete(s.key) : W.off.add(s.key)); persist(); renderSetup(); sfx.tick(); };
  cc.querySelectorAll("[data-i]").forEach(b => b.onclick = () => { const k = srcs[+b.dataset.i].key; W.off.has(k) ? W.off.delete(k) : W.off.add(k); persist(); renderSetup(); sfx.tick(); });
  cc.querySelectorAll("[data-g]").forEach(b => b.onclick = () => { const [g, v] = b.dataset.g.split(":"); srcs.filter(s => s.g === g).forEach(s => v === "1" ? W.off.delete(s.key) : W.off.add(s.key)); persist(); renderSetup(); });
  cc.querySelectorAll("[data-p]").forEach(b => b.onclick = () => { const p = b.dataset.p; set(s => p === "all" || (p === "voc" ? s.g === "voc" : s.g !== "voc")); });
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
  W.playing = false; _qs();
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
  const max = S.qTime ? S.qTime * 600 : 5000;
  W.timer = setTimeout(() => {
    if (S.answered || S.current !== q || activeTeam() !== t || !W.playing || S.mode === "end") return;
    const ok = Math.random() < W.lvl;
    const given = q.t === "mcq" ? (ok ? q.o[0] : q.o[1 + Math.floor(Math.random() * (q.o.length - 1))]) : (ok ? correctAnswerText(q) : "…");
    judge(ok, given, q, $("qArea"));
  }, Math.min(max, 1800 + Math.random() * 2600));
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
