# CLAUDE.md — Wĩrute Gĩkũyũ

Static language-learning web app for Kikuyu (Gĩkũyũ). No backend, no build
step, no dependencies. Live at https://ezpl.github.io/wirute-gikuyu/ via
GitHub Pages (push to `main` → `.github/workflows/deploy.yml` uploads the
repo root as-is).

## Architecture

- `index.html` — shell; static strings carry `data-i18n` / `data-i18n-html` /
  `data-i18n-ph` attributes (keys with `ui.` prefix).
- `js/i18n.js` — `I18N`: locale loading, `t(key, params)` (accepts keys with
  or without the `ui.` prefix; `{placeholder}` substitution), `apply()`,
  `set(code)` which fires a `langchange` event. Language stored in
  localStorage `wirute_lang`; default from `navigator.language`.
- `js/app.js` — Leitner SRS (5 boxes, intervals 0/1/3/7/16 days), quiz,
  grammar/sentences/dictionary rendering. Progress in localStorage
  `wirute_gikuyu_v2` as `{cards:{"<deckId>::<index>":{box,due}}}`. On
  `langchange` every language-dependent surface is rebuilt.
- `data/` — language-neutral content: `dict.json` (2,178 Gĩkũyũ–English
  entries `{k,e}`), `decks.json` (`{deckId:[{k,e}]}`), `sentences.json`
  (`[{id, items:[{id,k}]}]`).
- `locales/no|en|de|fr.json` — one COMPLETE pack per language: `meta`, `ui`
  (77 keys), `decks`, `groups`, `sentences` (translations keyed by sentence
  id), `grammar` (array of `{id,t,h}`; `h` is HTML with SINGLE-quoted
  attributes, classes `ky`/`gloss`/`note`).

## Hard rules

- **Locale parity is absolute:** all four files must have identical key sets,
  identical grammar ids in identical order, identical `{placeholders}`, no
  empty values. Gĩkũyũ text inside `<span class='ky'>…</span>` must be
  byte-identical across files. Validate after any locale change (PowerShell
  ConvertFrom-Json + compare key lists / ids).
- **English is the gloss language by design** — the dictionary and quiz teach
  Gĩkũyũ↔English; other locales still refer to English there (e.g. German UI
  says "Ins Englische übersetzen").
- English copy is **British English**; German uses „…" and proper grammar
  terminology; French uses « … », tutoiement in instructions, infinitive on
  buttons.
- Never invent Gĩkũyũ forms; cross-check tilde vowels (ĩ/ũ) against
  `data/dict.json`. Tones are unmarked (sources are inconsistent) — don't add.
- Keep it dependency-free and relative-path based (the app must work under
  `/wirute-gikuyu/` on Pages).

## Run locally

Needs an HTTP server (fetch of JSON fails from file://):
`dotnet serve -d . -p 8123` or any static server, then open localhost:8123.

## Context

- Business/strategy notes and raw OCR source material live PRIVATELY in
  `..\wirute-gikuyu-notes\` (never commit those here — the raw OCR is a full
  copy of an in-copyright 1953 book; only distilled, reformulated grammar
  facts belong in `locales/*.json`).
- A future multi-user version (accounts, server-side progress) is deliberately
  postponed; see README roadmap.
