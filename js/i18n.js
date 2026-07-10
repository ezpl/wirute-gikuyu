/* ============================================================
   i18n — språkkjerne for Wĩrute Gĩkũyũ
   Én komplett språkfil per språk (locales/<code>.json) med
   ui-strenger, kortstokk-/gruppeetiketter, setningsoversettelser
   og grammatikkinnhold. Valgt språk lagres i localStorage;
   standard utledes fra nettleserspråket.
   ============================================================ */
(function () {
  const SUPPORTED = ["no", "en", "de", "fr"];
  const LS_LANG = "wirute_lang";

  function detect() {
    const saved = localStorage.getItem(LS_LANG);
    if (SUPPORTED.includes(saved)) return saved;
    const b = (navigator.language || "").toLowerCase();
    if (b.startsWith("nb") || b.startsWith("nn") || b.startsWith("no")) return "no";
    if (b.startsWith("de")) return "de";
    if (b.startsWith("fr")) return "fr";
    return "en";
  }

  const I18N = {
    lang: detect(),
    L: null, // aktiv språkpakke (innholdet i locales/<lang>.json)

    /* Hent en ui-streng og fyll inn {plassholdere}.
       Godtar nøkler både med og uten "ui."-prefiks (markup bruker prefiks). */
    t(key, params) {
      const k = key.startsWith("ui.") ? key.slice(3) : key;
      let s = (this.L && this.L.ui[k]) || key;
      if (params) for (const p in params) s = s.replaceAll("{" + p + "}", params[p]);
      return s;
    },

    async load(code) {
      const res = await fetch("locales/" + code + ".json");
      if (!res.ok) throw new Error("locale " + code + ": HTTP " + res.status);
      this.L = await res.json();
      this.lang = code;
      document.documentElement.lang = code;
    },

    /* Oversett alle statisk merkede elementer i DOM-en. */
    apply() {
      document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = this.t(el.dataset.i18n); });
      document.querySelectorAll("[data-i18n-html]").forEach(el => { el.innerHTML = this.t(el.dataset.i18nHtml); });
      document.querySelectorAll("[data-i18n-ph]").forEach(el => { el.placeholder = this.t(el.dataset.i18nPh); });
      document.title = "Wĩrute Gĩkũyũ";
      const sel = document.getElementById("lang-select");
      if (sel) sel.value = this.lang;
    },

    async set(code) {
      if (!SUPPORTED.includes(code) || code === this.lang) return;
      await this.load(code);
      localStorage.setItem(LS_LANG, code);
      this.apply();
      window.dispatchEvent(new CustomEvent("langchange"));
    },
  };

  window.I18N = I18N;
  /* Løftet appen venter på før første render. */
  window.i18nReady = I18N.load(I18N.lang).then(() => I18N.apply());

  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("lang-select").addEventListener("change", e => I18N.set(e.target.value));
  });
})();
