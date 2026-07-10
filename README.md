# Wĩrute Gĩkũyũ

**Learn the Kikuyu language** — flashcards with spaced repetition, quizzes,
grammar, glossed example sentences and a searchable dictionary of 2,178
entries. A fully static web app: no backend, no build step, no tracking.
Progress is stored locally in the browser.

The interface is available in **Norwegian, English (British), German and
French**. The learning material itself is Gĩkũyũ with English glosses, as in
the source dictionary.

## Structure

```
index.html          the app shell (markup with data-i18n keys)
css/app.css         theme (earthy green/terracotta, as designed)
js/i18n.js          language core: t(), locale loading, persistence
js/app.js           app logic: Leitner SRS, quiz, grammar, sentences, dictionary
data/
  dict.json         Gĩkũyũ–English dictionary (2,178 entries)
  decks.json        flashcard decks, keyed by stable ids
  sentences.json    glossed example sentences (Gĩkũyũ side + ids)
locales/
  no.json en.json de.json fr.json
                    one complete language pack per language:
                    UI strings, deck/group labels, sentence
                    translations and the full grammar content
```

## Language files

Every locale file has the same shape and the exact same keys:

```json
{
  "meta": { "code": "…", "name": "…" },
  "ui": { "tab.home": "…", "quiz.qCount": "Question {a} / {b}", … },
  "decks": { "verbs": "…", … },
  "groups": { "copula": "…", … },
  "sentences": { "copula1": "…", … },
  "grammar": [ { "id": "sources", "t": "…", "h": "<p>…</p>" }, … ]
}
```

To add a language: copy `locales/en.json`, translate every value (never the
Gĩkũyũ text in `<span class='ky'>…</span>`), keep the `{placeholders}`, and
add an `<option>` to the language selector in `index.html`.

The default language follows the browser (`navigator.language`); the user's
choice is stored in `localStorage` under `wirute_lang`.

## Running locally

The app loads its data with `fetch`, so it needs an HTTP server (opening
`index.html` directly from disk will not work):

```bash
dotnet serve -d . -p 8123        # or any static file server
```

## Deploying

Pushing to `main` triggers `.github/workflows/deploy.yml`, which publishes the
repository as-is to GitHub Pages. Everything is relative-path based, so the app
works both at `https://<user>.github.io/<repo>/` and behind any other path.

## Sources

- **Gĩkũyũ–English Dictionary** — Wambũi M / Gĩkũyũ and Mũmbi Women (2022)
- **A Basic Sketch Grammar of Gĩkũyũ** — Englebretson et al., Rice University
- **A Short Kikuyu Grammar** — Gecaga & Kirkaldy-Willis (1953)

Tones are not marked (the sources mark them inconsistently), and weekday names
vary regionally. Some dictionary glosses retain OCR artefacts from the source
and are proofread over time.

## Roadmap

- Extended grammar and exercises from the full OCR of Gecaga & Kirkaldy-Willis
- Optional multi-user backend (per-user progress) — deliberately out of scope
  for this static version
