/* ============================================================
   Wĩrute Gĩkũyũ — applogikk
   Kort (Leitner-SRS), quiz, grammatikk, setninger og ordbok.
   Innhold lastes fra data/ (språknøytralt: Gĩkũyũ + engelsk gloss);
   all UI-tekst kommer fra I18N (js/i18n.js). Fremgang lagres i
   localStorage. Ingen avhengigheter, ingen backend.
   ============================================================ */
(function () {
  "use strict";

  /* ====== DATA ====== */
  let DICT = [];      // [{k, e}]           — ordbok, Gĩkũyũ → engelsk
  let DECKS = {};     // {deckId: [[k,e]]}  — kortstokker
  let SENT = [];      // [{id, items:[{id,k}]}] — setningsgrupper

  const t = (k, p) => I18N.t(k, p);

  /* ====== TILSTAND (Leitner) ====== */
  const LS_KEY = "wirute_gikuyu_v2";
  const BOX_DAYS = [0, 1, 3, 7, 16];
  let state = load();
  function load() { try { return JSON.parse(localStorage.getItem(LS_KEY)) || { cards: {} }; } catch { return { cards: {} }; } }
  function save() { localStorage.setItem(LS_KEY, JSON.stringify(state)); }
  const cardKey = (d, i) => d + "::" + i;
  const cardState = k => state.cards[k] || { box: 0, due: 0 };
  const isDue = k => { const c = state.cards[k]; return c ? c.due <= Date.now() : true; };
  function allCardKeys() { const a = []; for (const d in DECKS) DECKS[d].forEach((_, i) => a.push(cardKey(d, i))); return a; }

  /* ====== SVG-illustrasjoner (per gruppe-id) ====== */
  const ICONS = {
    copula: "<svg viewBox='0 0 48 48' fill='none' stroke='#2f7d5b' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'><circle cx='24' cy='15' r='7'/><path d='M11 39c0-8 6-13 13-13s13 5 13 13'/><path d='M20 15h8' stroke='#c8622a'/></svg>",
    questions: "<svg viewBox='0 0 48 48' fill='none' stroke='#2f7d5b' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'><path d='M17 18a7 7 0 1 1 10 6c-2 1.5-3 3-3 6'/><circle cx='24' cy='37' r='1.6' fill='#c8622a' stroke='#c8622a'/></svg>",
    action_past: "<svg viewBox='0 0 48 48' fill='none' stroke='#2f7d5b' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'><circle cx='27' cy='11' r='4'/><path d='M27 16l-5 8 6 5 2 8'/><path d='M22 24l-8 3'/><path d='M28 22l7 4' stroke='#c8622a'/></svg>",
    negation: "<svg viewBox='0 0 48 48' fill='none' stroke='#b5462f' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'><circle cx='24' cy='24' r='14'/><path d='M14 14l20 20'/></svg>",
  };

  function quizBanner() {
    return "<svg class='quiz-banner' viewBox='0 0 600 120' xmlns='http://www.w3.org/2000/svg'>" +
      "<rect width='600' height='120' rx='14' fill='#e6f2ec'/>" +
      "<g fill='none' stroke='#2f7d5b' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'>" +
      "<circle cx='70' cy='60' r='26'/><path d='M56 52a14 14 0 1 1 20 12c-4 3-6 5-6 9'/><circle cx='70' cy='86' r='2.6' fill='#2f7d5b'/>" +
      "<rect x='140' y='34' width='180' height='20' rx='6' fill='#ffffff'/>" +
      "<rect x='140' y='66' width='120' height='20' rx='6' fill='#ffffff'/></g>" +
      "<g fill='#c8622a'><circle cx='470' cy='45' r='8'/><circle cx='510' cy='70' r='6'/><circle cx='540' cy='40' r='5'/></g>" +
      "<text x='360' y='48' font-family='sans-serif' font-size='16' fill='#245f46' font-weight='700'>Menya?</text>" +
      "<text x='360' y='80' font-family='sans-serif' font-size='13' fill='#6b7770'>" + esc(t("quiz.bannerSub")) + "</text></svg>";
  }

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  /* ====== NAVIGASJON ====== */
  window.go = function (v) {
    document.querySelectorAll(".view").forEach(s => s.classList.toggle("active", s.id === v));
    document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.v === v));
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (v === "cards") startDeck();
    if (v === "quiz") startQuiz();
    if (v === "home") refreshHome();
  };

  /* ====== OVERSIKT ====== */
  function refreshHome() {
    const keys = allCardKeys();
    const learned = keys.filter(k => state.cards[k]).length;
    const mastered = keys.filter(k => state.cards[k] && state.cards[k].box >= 4).length;
    setText("s-due", keys.filter(isDue).length);
    setText("s-learned", learned);
    setText("s-mastered", mastered);
    setText("s-total", keys.length);
    const pct = keys.length ? Math.round(100 * mastered / keys.length) : 0;
    document.getElementById("home-prog").style.width = pct + "%";
    setText("home-prog-l", t("home.masteredPct", { pct }));
  }
  function setText(id, v) { document.getElementById(id).textContent = v; }

  window.rollWord = function () {
    const e = DICT[Math.floor(Math.random() * DICT.length)];
    setText("wod-ky", e.k);
    setText("wod-en", e.e);
  };

  /* ====== KORT ====== */
  let curDeck = "__all", queue = [], curCard = null, flipped = false;

  function buildDeckSelect() {
    const el = document.getElementById("deck-select");
    el.innerHTML = "";
    const all = document.createElement("button");
    all.className = "chip"; all.textContent = t("cards.allDecks"); all.dataset.deck = "__all";
    el.appendChild(all);
    for (const d in DECKS) {
      const b = document.createElement("button");
      b.className = "chip"; b.textContent = I18N.L.decks[d] || d; b.dataset.deck = d;
      el.appendChild(b);
    }
  }
  document.getElementById("deck-select").addEventListener("click", e => {
    if (!e.target.dataset.deck) return;
    curDeck = e.target.dataset.deck; startDeck();
  });

  const deckKeys = d => d === "__all" ? allCardKeys() : DECKS[d].map((_, i) => cardKey(d, i));

  window.startDeck = function () {
    document.querySelectorAll("#deck-select .chip").forEach(c => c.classList.toggle("on", c.dataset.deck === curDeck));
    let keys = deckKeys(curDeck);
    queue = keys.filter(isDue);
    if (queue.length === 0) queue = keys.slice();
    queue.sort((a, b) => cardState(a).box - cardState(b).box);
    document.getElementById("fc-done").style.display = "none";
    document.getElementById("fc-area").style.display = "block";
    nextCard();
  };

  function nextCard() {
    flipped = false;
    document.getElementById("flashcard").classList.remove("flip");
    if (queue.length === 0) {
      document.getElementById("fc-area").style.display = "none";
      document.getElementById("fc-done").style.display = "block";
      refreshHome();
      return;
    }
    curCard = queue[0];
    const [deck, iStr] = curCard.split("::");
    const [ky, en] = DECKS[deck][+iStr];
    const deckLabel = I18N.L.decks[deck] || deck;
    const box = cardState(curCard).box + 1;
    const enFirst = document.getElementById("dir-toggle").checked;
    setText("fc-front-t", enFirst ? en : ky);
    setText("fc-front-s", enFirst ? "" : deckLabel);
    setText("fc-back-t", enFirst ? ky : en);
    setText("fc-back-s", enFirst ? deckLabel : "");
    setText("fc-box", t("cards.box") + " " + box + "/5");
    setText("fc-box2", t("cards.box") + " " + box + "/5");
    const total = deckKeys(curDeck).length, done = total - queue.length;
    document.getElementById("deck-prog").style.width = Math.round(100 * done / total) + "%";
    setText("deck-status", t("cards.left", { n: queue.length }));
  }

  window.flipCard = function () {
    flipped = !flipped;
    document.getElementById("flashcard").classList.toggle("flip", flipped);
  };

  window.gradeCard = function (good) {
    let box = cardState(curCard).box;
    box = good ? Math.min(4, box + 1) : 0;
    state.cards[curCard] = { box, due: Date.now() + BOX_DAYS[box] * 864e5 };
    save();
    queue.shift();
    if (!good) queue.push(curCard);
    nextCard();
  };

  document.getElementById("dir-toggle").addEventListener("change", () => { if (curCard) nextCard(); });

  /* ====== QUIZ ====== */
  let quizMode = "ky2en", qPool = [], qList = [], qi = 0, qScore = 0, qAnswered = false;

  document.getElementById("quiz-mode").addEventListener("click", e => {
    if (!e.target.closest(".chip")) return;
    const chip = e.target.closest(".chip");
    quizMode = chip.dataset.m;
    document.querySelectorAll("#quiz-mode .chip").forEach(c => c.classList.toggle("on", c.dataset.m === quizMode));
    startQuiz();
  });

  function flatPool() {
    const seen = {}, a = [];
    for (const d in DECKS) DECKS[d].forEach(it => { if (!seen[it[0]]) { seen[it[0]] = 1; a.push({ ky: it[0], en: it[1] }); } });
    return a;
  }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  window.startQuiz = function () {
    qPool = flatPool();
    qList = shuffle(qPool.slice()).slice(0, 10);
    qi = 0; qScore = 0;
    document.getElementById("quiz-result").style.display = "none";
    document.getElementById("quiz-card").style.display = "block";
    setText("q-score", "0");
    renderQ();
  };

  function renderQ() {
    qAnswered = false;
    const item = qList[qi];
    setText("q-count", t("quiz.qCount", { a: qi + 1, b: qList.length }));
    document.getElementById("q-prog").style.width = Math.round(100 * qi / qList.length) + "%";
    setText("q-feedback", "");
    document.getElementById("q-next").style.display = "none";
    const body = document.getElementById("q-body");
    body.innerHTML = "";
    if (quizMode === "type") {
      setText("q-prompt", t("quiz.translateTo", { word: item.ky }));
      const inp = document.createElement("input");
      inp.className = "txt"; inp.id = "q-input"; inp.placeholder = t("quiz.typePh");
      inp.addEventListener("keydown", e => { if (e.key === "Enter") checkType(); });
      body.appendChild(inp);
      const btn = document.createElement("button");
      btn.className = "btn primary"; btn.style.marginTop = "12px";
      btn.textContent = t("quiz.check"); btn.onclick = checkType;
      body.appendChild(btn);
      setTimeout(() => inp.focus(), 50);
    } else {
      const askKy = quizMode === "ky2en";
      setText("q-prompt", askKy ? item.ky : item.en);
      const correct = askKy ? item.en : item.ky;
      const opts = [correct];
      const others = shuffle(qPool.filter(x => (askKy ? x.en : x.ky) !== correct));
      for (let k = 0; k < 3 && k < others.length; k++) opts.push(askKy ? others[k].en : others[k].ky);
      shuffle(opts).forEach(o => {
        const b = document.createElement("button");
        b.className = "opt"; b.textContent = o;
        b.onclick = () => pickMC(b, o, correct);
        body.appendChild(b);
      });
    }
  }

  function pickMC(btn, chosen, correct) {
    if (qAnswered) return;
    qAnswered = true;
    document.querySelectorAll("#q-body .opt").forEach(o => {
      if (o.textContent === correct) o.classList.add("correct");
      else if (o === btn) o.classList.add("wrong");
      else o.classList.add("dim");
    });
    const fb = document.getElementById("q-feedback");
    if (chosen === correct) { qScore++; fb.className = "feedback ok"; fb.textContent = t("quiz.correct"); }
    else { fb.className = "feedback no"; fb.textContent = t("quiz.wrongAns", { ans: correct }); }
    setText("q-score", qScore);
    document.getElementById("q-next").style.display = "inline-block";
  }

  const norm = s => s.toLowerCase().replace(/[.,!?/]/g, "").replace(/\s+/g, " ").trim();

  function checkType() {
    if (qAnswered) return;
    qAnswered = true;
    const item = qList[qi];
    const val = document.getElementById("q-input").value;
    const ok = norm(val) === norm(item.en) || (norm(item.en).includes(norm(val)) && norm(val).length > 3);
    const fb = document.getElementById("q-feedback");
    if (ok) { qScore++; fb.className = "feedback ok"; fb.textContent = t("quiz.correct"); }
    else { fb.className = "feedback no"; fb.textContent = t("quiz.answer", { ans: item.en }); }
    setText("q-score", qScore);
    document.getElementById("q-next").style.display = "inline-block";
  }

  window.nextQ = function () {
    qi++;
    if (qi >= qList.length) {
      document.getElementById("quiz-card").style.display = "none";
      document.getElementById("quiz-result").style.display = "block";
      const pct = Math.round(100 * qScore / qList.length);
      setText("qr-emoji", pct >= 80 ? "🏆" : pct >= 50 ? "👍" : "📚");
      setText("qr-title", t("quiz.resultTitle", { n: qScore, m: qList.length }));
      setText("qr-sub", pct >= 80 ? t("quiz.resGood") : pct >= 50 ? t("quiz.resMid") : t("quiz.resLow"));
    } else renderQ();
  };

  /* ====== GRAMMATIKK ====== */
  function buildGrammar() {
    const el = document.getElementById("grammar-body");
    el.innerHTML = "";
    I18N.L.grammar.forEach((g, i) => {
      const d = document.createElement("details");
      d.className = "gram";
      if (i === 0) d.open = true;
      d.innerHTML = "<summary>" + g.t + "</summary><div class='body'>" + g.h + "</div>";
      el.appendChild(d);
    });
  }

  /* ====== SETNINGER ====== */
  function buildSentences() {
    const el = document.getElementById("sent-body");
    el.innerHTML = "";
    SENT.forEach(grp => {
      const c = document.createElement("div");
      c.className = "card";
      const head = document.createElement("div");
      head.className = "grp-head";
      head.innerHTML = "<div class='grp-title'>" + (ICONS[grp.id] || "") + "<strong>" + esc(I18N.L.groups[grp.id] || grp.id) + "</strong></div>";
      const btn = document.createElement("button");
      btn.className = "btn ghost";
      btn.textContent = t("sentences.show");
      btn.onclick = () => {
        const on = c.classList.toggle("all-shown");
        c.querySelectorAll(".bubble").forEach(b => b.classList.toggle("show", on));
        btn.textContent = on ? t("sentences.hide") : t("sentences.show");
      };
      head.appendChild(btn);
      c.appendChild(head);
      grp.items.forEach(s => {
        const turn = document.createElement("div");
        turn.className = "turn";
        const b = document.createElement("div");
        b.className = "bubble";
        b.innerHTML = "<div class='ky'>" + esc(s.k) + "</div><div class='tr'>" + esc(I18N.L.sentences[s.id] || "") + "</div>";
        b.onclick = () => b.classList.toggle("show");
        turn.appendChild(b);
        c.appendChild(turn);
      });
      el.appendChild(c);
    });
  }

  /* ====== ORDBOK ====== */
  function buildDict() {
    setText("dict-count", t("dict.entries", { n: DICT.length }));
    renderDict(document.getElementById("dict-search").value || "");
  }
  function renderDict(q) {
    q = q.toLowerCase().trim();
    const rows = q ? DICT.filter(v => v.k.toLowerCase().includes(q) || v.e.toLowerCase().includes(q)) : DICT;
    const cap = 250, shown = rows.slice(0, cap);
    setText("dict-status", t("dict.hits", { n: rows.length }) + (rows.length > cap ? t("dict.showingFirst", { n: cap }) : ""));
    document.getElementById("dict-body").innerHTML =
      "<div class='card' style='padding:6px 0'><table><tr><th style='padding-left:16px'>" + esc(t("dict.colKy")) + "</th><th>" + esc(t("dict.colTr")) + "</th></tr>" +
      shown.map(v => "<tr><td style='padding-left:16px'><span class='ky'>" + esc(v.k) + "</span></td><td class='gloss'>" + esc(v.e) + "</td></tr>").join("") +
      "</table></div>";
  }
  document.getElementById("dict-search").addEventListener("input", e => renderDict(e.target.value));

  /* ====== NULLSTILL ====== */
  document.getElementById("reset-link").addEventListener("click", e => {
    e.preventDefault();
    if (confirm(t("foot.resetConfirm"))) {
      state = { cards: {} };
      save();
      refreshHome();
      alert(t("foot.resetDone"));
    }
  });

  /* ====== SPRÅKBYTTE — bygg språkavhengige flater på nytt ====== */
  window.addEventListener("langchange", () => {
    buildDeckSelect();
    document.querySelectorAll("#deck-select .chip").forEach(c => c.classList.toggle("on", c.dataset.deck === curDeck));
    buildGrammar();
    buildSentences();
    buildDict();
    document.getElementById("quiz-illu").innerHTML = quizBanner();
    refreshHome();
    if (curCard) nextCard();
    if (document.getElementById("quiz-card").style.display !== "none" && qList.length) renderQ();
  });

  /* ====== OPPSTART ====== */
  async function init() {
    const [dict, decks, sent] = await Promise.all([
      fetch("data/dict.json").then(r => r.json()),
      fetch("data/decks.json").then(r => r.json()),
      fetch("data/sentences.json").then(r => r.json()),
      window.i18nReady,
    ]);
    DICT = dict;
    SENT = sent;
    DECKS = {};
    for (const id in decks) DECKS[id] = decks[id].map(o => [o.k, o.e]);

    document.getElementById("tabs").addEventListener("click", e => { if (e.target.dataset.v) go(e.target.dataset.v); });
    document.getElementById("quiz-illu").innerHTML = quizBanner();
    buildDeckSelect();
    document.querySelector("#deck-select .chip").classList.add("on");
    buildGrammar();
    buildSentences();
    buildDict();
    rollWord();
    refreshHome();
  }

  init().catch(err => {
    console.error(err);
    document.body.insertAdjacentHTML("beforeend",
      "<div style='position:fixed;bottom:12px;left:12px;right:12px;background:#fbeee5;color:#b5462f;padding:12px 16px;border-radius:10px;font-size:14px'>Could not load app data — please reload. (" + esc(err.message) + ")</div>");
  });
})();
