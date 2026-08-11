# Schriftgrößen-Abgleich gegen Figma — 2026-08-11

Vollständiger, maschineller Abgleich der App gegen die Figma-Datei
`INBMbCpFbNuEhqzkAxmBhu`, ausgelöst durch den Prüfer-Befund „die Schriftgrößen
weichen wesentlich von Figma ab, sie sollen pixelgenau übernommen werden".

**Dieser Bericht misst nur.** Außer dieser Datei wurde nichts geändert. Die
Skripte des Messlaufs liegen außerhalb des Repos und sind nicht eingecheckt.

**Stand:** `8435096`, Arbeitsverzeichnis sauber, `origin/main` identisch.

---

## Methode

**Soll** kommt ausschließlich aus `.figma-cache/file.json` (Snapshot vom
2026-08-07, Dateiversion `2385005008554014874`). Aus 22 Artboards — dem
1440er-Satz (12 Frames) und dem 375er-Satz (10 Frames) — wurden alle
**498 TEXT-Knoten** extrahiert: `fontSize`, `fontWeight`, `fontFamily`,
`lineHeight` in Pixeln, Stil-ID und Stilname, Füllfarbe, Position.

`lineHeightUnit` wird vorher aufgelöst: bei `FONT_SIZE_%` ist der Wert ein
Prozentsatz der Schriftgröße (H4: 104 % × 40px = 41,6px), bei `PIXELS` ein
Pixelwert, bei `INTRINSIC_%` liefert die API den ausgerechneten Pixelwert mit.

**Ist** kommt aus dem Browser, nicht aus dem Quelltext. Chromium über
Playwright, der Produktions-Build wird statisch mit SPA-Fallback ausgeliefert.
Der Webhook antwortet aus einer Fixture in der Response-Shape aus
`src/app/models/`; jeder fremde Host ist per Route-Abort dicht.

Zu Firestore wieder in **zwei Durchgängen**, damit kein Write stattfinden kann:

- **Durchgang A** (`/`, `/library`, `/library/cuisine/italian`, Generator
  Schritt 1 mit und ohne Liste, Schritt 2, `/library/:id`) liest echte Daten.
  Der Generator wird hier nicht abgeschickt, es gibt also keinen Write-Pfad;
  das Like-Herz wird nie geklickt.
- **Durchgang B** (`/results`, `/results/0`, Ladezustand, Fehlerdialog) läuft
  durch den Generator und hat Firestore komplett per Route-Abort dicht — der
  Write aus `applyResponse()` kann die Box nicht verlassen.

Je Ansicht wird **jedes Element mit eigenem Textinhalt** gegriffen und per
`getComputedStyle` gemessen. Die verantwortliche CSS-Regel wird aus den
laufenden Stylesheets gelesen, damit `var(--token)` als Token sichtbar bleibt
statt zum Pixelwert aufgelöst zu werden.

**Join** über den normalisierten Textinhalt (trimmen, Whitespace kollabieren,
Kleinschreibung, typografische Apostrophe vereinheitlicht), **ansichtsgenau**.
Ein ansichtsübergreifender Fallback wurde bewusst verworfen: er hatte den
Rezepttitel der Rezeptansicht (Figma H2 54px) an den gleichlautenden Kartentitel
des Kochbuchs (H5 24px) gehängt und damit einen Fund erfunden, den es nicht
gibt. Was nicht joint — dynamische Inhalte aus Firestore und Texte, die in Figma
anders geschrieben sind — wird über Selektor plus nächstgelegenen statischen
Nachbarn von Hand zugeordnet; diese Restliste steht unten vollständig.

### Was dabei nicht vorausgesetzt wurde

1. **Figma-Stilnamen sind nicht vertrauenswürdig.** Gemessen wurde immer der
   Wert am Knoten, nie der Name. Der bekannte Fall bestätigt sich erneut: der
   Stil `Rezepten/#1E5515` trägt `#008000`, während `Rezepten/Middle green` das
   `#1E5515` hält.
2. **`docs/design/spec.md` ist nicht vertrauenswürdig.** Sie wurde als Quelle
   nicht benutzt. Aufgabe 4 zeigt, warum — siehe dort.
3. **Verwender und Token getrennt geprüft.** Ergebnis unten: die Tokenwerte
   stimmen, die Verwender nicht.

---

## Deckungsgrad

Ohne diese Zahlen ist der Bericht nicht bewertbar, deshalb stehen sie vorn.

### Browser-Seite

| Größe                                                                  | Anzahl   |
| ---------------------------------------------------------------------- | -------- |
| gemessene Elemente mit eigenem Text (11 Ansichten × 2 Viewports)       | **1065** |
| davon über den Text gejoint                                            | 413      |
| davon von Hand zugeordnet (dynamische Inhalte, abweichende Schreibung) | 512      |
| davon ohne Figma-Gegenstück (app-only)                                 | 140      |
| **nicht zugeordnet**                                                   | **0**    |

Die 140 app-only-Elemente sind kein Messverlust, sondern Bauteile, die das
Design nicht zeichnet: Skip-Link, Footer (Figma hat auf keinem Frame einen
Footer), Schließen-Kreuz des Dialogs, Like-Zähler am Herz, der
Per-Portion/Gesamt-Umschalter der Nährwerttabelle (Lastenheft US10), deren
Kopfzeile, der Hinweis „Recipe not available" und der Hinweis, dass ein Rezept
nicht im Kochbuch liegt. Alle 82 Gruppen sind einzeln als solche vermerkt.

Zusätzlich lief ein **Ergänzungsdurchgang** für Zustände, die der Hauptlauf
nicht erreicht: Formularfelder (deren Wert kein Textknoten ist), die geöffnete
Autocomplete-Liste und der Zustand „Rezept existiert nicht". Ohne ihn wären
fünf der 33 Literalstellen ungemessen geblieben.

### Figma-Seite

| Größe                                              | Anzahl  |
| -------------------------------------------------- | ------- |
| TEXT-Knoten auf den 22 relevanten Artboards        | **498** |
| direkt von einer Fundstelle referenziert           | 247     |
| Wiederholung einer bereits abgedeckten Deklaration | 191     |
| nicht erreicht                                     | **60**  |

Die 191 Wiederholungen sind dieselbe Deklaration an weiteren Instanzen — Figma
zeichnet 20 Rezeptzeilen einzeln aus, der Code hat dafür eine Regel.

Die 60 nicht erreichten Knoten zerfallen in vier Gruppen, keine davon ist eine
Messlücke im Code:

| Gruppe                                                                | Anzahl | Warum nicht erreicht                                                                                                                                                            |
| --------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `old styles/button` (Mulish 16/20,08), die Like-Zähler „66"/„32"/„42" | 26     | dieselbe Code-Regel wie die Tags daneben (`.recipe-row__chip`, `.summary__chip`); als Soll ist dort der Tag-Knoten geführt, der Zähler ist im Fließtext der Fundstelle vermerkt |
| Frame `Step 1 Generate recipe +list` (`4312:3366`)                    | 24     | zweite, inhaltsgleiche Desktop-Kopie von Schritt 1; der Zwilling `4068:710` ist vollständig abgedeckt                                                                           |
| Frame `hero` (`14435:2373`)                                           | 5      | zweite, inhaltsgleiche Desktop-Kopie der Startseite; der Zwilling `4009:399` ist vollständig abgedeckt                                                                          |
| Platzhalter „100" und Cursor „\|" im Mengenfeld                       | 5      | im Ergänzungsdurchgang gemessen, siehe Aufgabe 2, Zeile 28                                                                                                                      |

---

## Diff-Tabelle

Sortiert nach |Delta| absteigend. Zeilen, die sich nur in der Ansicht
unterscheiden, sind zu einer zusammengefasst; die Spalte „Ansicht" nennt alle.
`w` im Delta ist die Abweichung im `font-weight`, `lh` die reine
Zeilenhöhen-Abweichung.

Einstufung wie in [befunde-2026-08-07.md](befunde-2026-08-07.md):

| Kürzel             | Bedeutung                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| **[KLAR]**         | Soll und Ist stehen fest und weichen ab                                                                            |
| **[ENTSCHEIDUNG]** | Figma-Soll kollidiert mit der DA-Checkliste, mit einem bewusst abgelegten Altstil oder ist in sich widersprüchlich |
| **[OK]**           | stimmt bereits                                                                                                     |

### Abweichend (75 Deklarationen × Viewport)

| Kat.               | Delta                | Ansicht                                | VP   | Selektor                        | Text                       | Ist (w size/lh)       | Soll (Figma)          | Figma-Stil                        | Deklaration                                    | Quelle                                                                                                                                                  |
| ------------------ | -------------------- | -------------------------------------- | ---- | ------------------------------- | -------------------------- | --------------------- | --------------------- | --------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[KLAR]**         | +26px                | error-dialog, generator-step2, loading | 1440 | `.generator__title`             | Choose your preferences    | 600 54/65 Quicksand   | 600 28/35 Quicksand   | recipe generator/Card headlines   | `--font-h2`                                    | [generator/generator.scss:79](../../src/app/generator/generator.scss#L79)                                                                               |
| **[KLAR]**         | -8px, +100w, Familie | home                                   | 1440 | `.hero__cross-sell-title`       | Hungry for inspiration?    | 600 24/30 Quicksand   | 500 32/33.28 Ubuntu   | —                                 | `--font-h5-semi`                               | [home/home.scss:119](../../src/app/home/home.scss#L119)                                                                                                 |
| **[KLAR]**         | +8px                 | error-dialog, generator-step2, loading | 375  | `.generator__title`             | Choose your preferences    | 600 32/35.2 Quicksand | 600 24/30 Quicksand   | Mob. H3                           | `600 32px/1.1 var(--font-family-bo…` (Literal) | [generator/generator.scss:74](../../src/app/generator/generator.scss#L74)                                                                               |
| **[KLAR]**         | -6px, -100w          | recipe-view, recipe-view-library       | 1440 | `.nutrition__table`             | Protein                    | 600 16/20 Quicksand   | 700 22/27.5 Quicksand | —                                 | `--font-body-16`                               | [recipe-view/nutrition-table/nutrition-table.scss:43](../../src/app/recipe-view/nutrition-table/nutrition-table.scss#L43)                               |
| **[KLAR]**         | -6px                 | recipe-view                            | 1440 | `.nutrition__table`             | 24g                        | 500 16/20 Quicksand   | 500 22/20 Quicksand   | —                                 | `--font-body-16`                               | [recipe-view/nutrition-table/nutrition-table.scss:43](../../src/app/recipe-view/nutrition-table/nutrition-table.scss#L43)                               |
| **[KLAR]**         | -4px, -100w          | error-dialog, generator-step2, loading | 375  | `.chip-group__legend`           | Diet preferences           | 500 20/20 Quicksand   | 600 24/30 Quicksand   | Mob. H3                           | `--font-small-label`                           | [generator/preferences-step/chip-group/chip-group.scss:18](../../src/app/generator/preferences-step/chip-group/chip-group.scss#L18)                     |
| **[ENTSCHEIDUNG]** | -4px, -100w, Familie | recipe-view, recipe-view-library       | 1440 | `.like__question`               | Just finished this meal?   | 600 16/22.4 Quicksand | 700 20/25.1 Mulish    | old styles/H3                     | `600 16px/1.4 var(--font-family-bo…` (Literal) | [recipe-view/recipe-like/recipe-like.scss:38](../../src/app/recipe-view/recipe-like/recipe-like.scss#L38)                                               |
| **[KLAR]**         | -4px, +100w          | library                                | 1440 | `.most-liked__name`             | Pasta with spinach and ch… | 600 20/26 Quicksand   | 500 24/30 Quicksand   | recipe generator/H5               | `600 20px/1.3 var(--font-family-bo…` (Literal) | [library/most-liked-row/most-liked-row.scss:113](../../src/app/library/most-liked-row/most-liked-row.scss#L113)                                         |
| **[KLAR]**         | -4px, +100w          | cuisine-recipes                        | 1440 | `.recipe-row__position`         | 1.                         | 600 14/14 Quicksand   | 500 18/22.5 Quicksand | recipe generator/p 18             | `600 14px/1 var(--font-family-body)` (Literal) | [library/recipe-row/recipe-row.scss:45](../../src/app/library/recipe-row/recipe-row.scss#L45)                                                           |
| **[KLAR]**         | -4px, +100w          | cuisine-recipes                        | 375  | `.recipe-row__position`         | 1.                         | 600 14/14 Quicksand   | 500 18/22.5 Quicksand | recipe generator/p 18             | `600 14px/1 var(--font-family-body)` (Literal) | [library/recipe-row/recipe-row.scss:45](../../src/app/library/recipe-row/recipe-row.scss#L45)                                                           |
| **[KLAR]**         | -4px, -100w          | recipe-view, recipe-view-library       | 375  | `.step__order`                  | 1.                         | 500 14/14 Quicksand   | 600 18/22.5 Quicksand | Mob. H4                           | `--font-small-text`                            | [recipe-view/recipe-step/recipe-step.scss:37](../../src/app/recipe-view/recipe-step/recipe-step.scss#L37)                                               |
| **[KLAR]**         | -4px                 | error-dialog, generator-step2, loading | 1440 | `.chip-group__label`            | Quick                      | 500 16/19.2 Quicksand | 500 20/20 Quicksand   | recipe generator/small H + Labels | `500 16px/1.2 var(--font-family-bo…` (Literal) | [generator/preferences-step/chip-group/chip-group.scss:80](../../src/app/generator/preferences-step/chip-group/chip-group.scss#L80)                     |
| **[KLAR]**         | -4px                 | error-dialog, generator-step2, loading | 375  | `.chip-group__label`            | Quick                      | 500 16/19.2 Quicksand | 500 20/20 Quicksand   | recipe generator/small H + Labels | `500 16px/1.2 var(--font-family-bo…` (Literal) | [generator/preferences-step/chip-group/chip-group.scss:80](../../src/app/generator/preferences-step/chip-group/chip-group.scss#L80)                     |
| **[KLAR]**         | -4px                 | error-dialog, generator-step2, loading | 1440 | `.chip-group__legend`           | Cooking time:              | 500 20/20 Quicksand   | 500 24/30 Quicksand   | recipe generator/H5               | `--font-small-label`                           | [generator/preferences-step/chip-group/chip-group.scss:18](../../src/app/generator/preferences-step/chip-group/chip-group.scss#L18)                     |
| **[KLAR]**         | -4px                 | library                                | 1440 | `.cookbook__generate`           | Generate new recipe        | 500 16/20 Quicksand   | 500 20/20 Quicksand   | recipe generator/small H + Labels | `--font-body-16`                               | [library/library.scss:125](../../src/app/library/library.scss#L125)                                                                                     |
| **[KLAR]**         | -4px                 | error-dialog                           | 1440 | `.error-dialog__action`         | Go back to ingredients     | 500 16/20 Quicksand   | 500 20/20 Quicksand   | recipe generator/small H + Labels | `--font-body-16`                               | [generator/generation-error-dialog/generation-error-dialog.scss:75](../../src/app/generator/generation-error-dialog/generation-error-dialog.scss#L75)   |
| **[KLAR]**         | -4px                 | home                                   | 1440 | `.hero__cross-sell-link`        | Go to cookbook             | 500 16/20 Quicksand   | 500 20/20 Quicksand   | recipe generator/small H + Labels | `--font-body-16`                               | [home/home.scss:128](../../src/app/home/home.scss#L128)                                                                                                 |
| **[KLAR]**         | +4px                 | generator-step1-list                   | 375  | `.ingredient-form__label`       | Serving size               | 500 20/20 Quicksand   | 500 16/20 Quicksand   | recipe generator/p 16             | `--font-small-label`                           | [generator/ingredient-step/ingredient-form/ingredient-form.scss:46](../../src/app/generator/ingredient-step/ingredient-form/ingredient-form.scss#L46)   |
| **[KLAR]**         | -4px                 | recipe-view, recipe-view-library       | 1440 | `.nutrition__energy`            | Energy: 540 kcal           | 500 16/20 Quicksand   | 500 20/20 Quicksand   | recipe generator/small H + Labels | `--font-body-16`                               | [recipe-view/nutrition-table/nutrition-table.scss:33](../../src/app/recipe-view/nutrition-table/nutrition-table.scss#L33)                               |
| **[KLAR]**         | -4px                 | recipe-view, recipe-view-library       | 1440 | `.nutrition__table`             | Macronutrients — Per port… | 500 16/20 Quicksand   | 500 20/20 Quicksand   | recipe generator/small H + Labels | `--font-body-16`                               | [recipe-view/nutrition-table/nutrition-table.scss:43](../../src/app/recipe-view/nutrition-table/nutrition-table.scss#L43)                               |
| **[KLAR]**         | -4px                 | results                                | 1440 | `.recipe-card__time`            | Cooking time: 20min        | 500 16/20 Quicksand   | 500 20/20 Quicksand   | recipe generator/small H + Labels | `--font-body-16`                               | [results/recipe-card/recipe-card.scss:59](../../src/app/results/recipe-card/recipe-card.scss#L59)                                                       |
| **[KLAR]**         | -4px                 | cuisine-recipes                        | 1440 | `.recipe-row__chip`             | Vegetarian                 | 500 14/19.6 Quicksand | 500 18/22.5 Quicksand | recipe generator/p 18             | `500 14px/1.4 var(--font-family-bo…` (Literal) | [library/recipe-row/recipe-row.scss:112](../../src/app/library/recipe-row/recipe-row.scss#L112)                                                         |
| **[KLAR]**         | -4px                 | cuisine-recipes                        | 375  | `.recipe-row__chip`             | Vegetarian                 | 500 14/19.6 Quicksand | 500 18/22.5 Quicksand | recipe generator/p 18             | `500 14px/1.4 var(--font-family-bo…` (Literal) | [library/recipe-row/recipe-row.scss:112](../../src/app/library/recipe-row/recipe-row.scss#L112)                                                         |
| **[KLAR]**         | -4px                 | recipe-view, recipe-view-library       | 1440 | `.recipe-view__regenerate-link` | Generate new recipe        | 500 16/20 Quicksand   | 500 20/20 Quicksand   | recipe generator/small H + Labels | `--font-body-16`                               | [recipe-view/recipe-view.scss:147](../../src/app/recipe-view/recipe-view.scss#L147)                                                                     |
| **[KLAR]**         | -4px                 | results                                | 1440 | `.results__regenerate`          | Generate new recipe        | 500 16/20 Quicksand   | 500 20/20 Quicksand   | recipe generator/small H + Labels | `--font-body-16`                               | [results/results.scss:155](../../src/app/results/results.scss#L155)                                                                                     |
| **[KLAR]**         | -4px                 | recipe-view, recipe-view-library       | 1440 | `.step__order`                  | 1.                         | 500 14/14 Quicksand   | 500 18/22.5 Quicksand | recipe generator/p 18             | `--font-small-text`                            | [recipe-view/recipe-step/recipe-step.scss:37](../../src/app/recipe-view/recipe-step/recipe-step.scss#L37)                                               |
| **[KLAR]**         | -4px                 | recipe-view, recipe-view-library       | 1440 | `.step__title`                  | Boil the pasta             | 500 20/26 Quicksand   | 500 24/30 Quicksand   | recipe generator/H5               | `500 20px/1.3 var(--font-family-bo…` (Literal) | [recipe-view/recipe-step/recipe-step.scss:23](../../src/app/recipe-view/recipe-step/recipe-step.scss#L23)                                               |
| **[KLAR]**         | +4px                 | error-dialog, generator-step2, loading | 375  | `.stepper-field__legend`        | How many portions you nee… | 500 20/20 Quicksand   | 500 16/20 Quicksand   | recipe generator/p 16             | `--font-small-label`                           | [generator/preferences-step/stepper-field/stepper-field.scss:15](../../src/app/generator/preferences-step/stepper-field/stepper-field.scss#L15)         |
| **[KLAR]**         | -4px                 | recipe-view, recipe-view-library       | 375  | `.summary__cooks-label`         | Cooking persons: 2         | 500 16/20 Quicksand   | 500 20/20 Quicksand   | recipe generator/small H + Labels | `--font-body-16`                               | [recipe-view/recipe-summary/recipe-summary.scss:64](../../src/app/recipe-view/recipe-summary/recipe-summary.scss#L64)                                   |
| **[KLAR]**         | -2px, -100w          | error-dialog                           | 1440 | `.error-dialog__message`        | It looks like some ingred… | 500 16/20 Quicksand   | 600 18/26 Quicksand   | —                                 | `--font-body-16`                               | [generator/generation-error-dialog/generation-error-dialog.scss:58](../../src/app/generator/generation-error-dialog/generation-error-dialog.scss#L58)   |
| **[ENTSCHEIDUNG]** | -2px, +100w, Familie | recipe-view-library                    | 1440 | `.like__hint`                   | Give it a heart, so that … | 500 14/19.6 Quicksand | 400 16/20.08 Mulish   | old styles/Body                   | `--font-small-text`                            | [recipe-view/recipe-like/recipe-like.scss:42](../../src/app/recipe-view/recipe-like/recipe-like.scss#L42)                                               |
| **[KLAR]**         | +2px, +100w          | library                                | 375  | `.most-liked__name`             | Pasta with spinach and ch… | 600 20/26 Quicksand   | 500 18/22.5 Quicksand | recipe generator/H6               | `600 20px/1.3 var(--font-family-bo…` (Literal) | [library/most-liked-row/most-liked-row.scss:113](../../src/app/library/most-liked-row/most-liked-row.scss#L113)                                         |
| **[KLAR]**         | -2px, -100w          | recipe-view, recipe-view-library       | 375  | `.nutrition__energy`            | Energy: 540 kcal           | 500 16/20 Quicksand   | 600 18/22.5 Quicksand | Mob. H4                           | `--font-body-16`                               | [recipe-view/nutrition-table/nutrition-table.scss:33](../../src/app/recipe-view/nutrition-table/nutrition-table.scss#L33)                               |
| **[KLAR]**         | -2px, -100w          | recipe-view, recipe-view-library       | 375  | `.nutrition__table`             | 24g                        | 500 16/20 Quicksand   | 600 18/22.5 Quicksand | Mob. H4                           | `--font-body-16`                               | [recipe-view/nutrition-table/nutrition-table.scss:43](../../src/app/recipe-view/nutrition-table/nutrition-table.scss#L43)                               |
| **[KLAR]**         | -2px, +100w          | cuisine-recipes                        | 1440 | `.pagination__button`           | 1                          | 600 16/20 Quicksand   | 500 18/22.5 Quicksand | recipe generator/H6               | `--font-body-16`                               | [shared/pagination/pagination.scss:32](../../src/app/shared/pagination/pagination.scss#L32)                                                             |
| **[KLAR]**         | -2px, +100w          | cuisine-recipes                        | 375  | `.pagination__button`           | 1                          | 600 16/20 Quicksand   | 500 18/22.5 Quicksand | recipe generator/H6               | `--font-body-16`                               | [shared/pagination/pagination.scss:32](../../src/app/shared/pagination/pagination.scss#L32)                                                             |
| **[KLAR]**         | -2px                 | recipe-view, recipe-view-library       | 1440 | `.chef-badge`                   | Chef 1                     | 500 16/22.4 Quicksand | 500 18/22.5 Quicksand | recipe generator/H6               | `500 16px/1.4 var(--font-family-bo…` (Literal) | [recipe-view/chef-badge/chef-badge.scss:14](../../src/app/recipe-view/chef-badge/chef-badge.scss#L14)                                                   |
| **[KLAR]**         | -2px                 | recipe-view, recipe-view-library       | 375  | `.chef-badge`                   | Chef 1                     | 500 16/22.4 Quicksand | 500 18/22.5 Quicksand | recipe generator/H6               | `500 16px/1.4 var(--font-family-bo…` (Literal) | [recipe-view/chef-badge/chef-badge.scss:14](../../src/app/recipe-view/chef-badge/chef-badge.scss#L14)                                                   |
| **[ENTSCHEIDUNG]** | +2px                 | library                                | 1440 | `.cookbook__back`               | Back                       | 500 16/19.2 Quicksand | 500 14/10 Quicksand   | recipe generator/small text       | `500 16px/1.2 var(--font-family-bo…` (Literal) | [library/library.scss:27](../../src/app/library/library.scss#L27)                                                                                       |
| **[ENTSCHEIDUNG]** | +2px                 | library                                | 375  | `.cookbook__back`               | Back                       | 500 16/19.2 Quicksand | 500 14/10 Quicksand   | recipe generator/small text       | `500 16px/1.2 var(--font-family-bo…` (Literal) | [library/library.scss:27](../../src/app/library/library.scss#L27)                                                                                       |
| **[KLAR]**         | -2px                 | library                                | 375  | `.cookbook__generate`           | Generate new recipe        | 500 16/20 Quicksand   | 500 18/22.5 Quicksand | recipe generator/H6               | `--font-body-16`                               | [library/library.scss:125](../../src/app/library/library.scss#L125)                                                                                     |
| **[ENTSCHEIDUNG]** | +2px                 | cuisine-recipes                        | 1440 | `.cuisine-page__back`           | Cookbook                   | 500 16/19.2 Quicksand | 500 14/10 Quicksand   | recipe generator/small text       | `500 16px/1.2 var(--font-family-bo…` (Literal) | [library/cuisine-recipes/cuisine-recipes.scss:30](../../src/app/library/cuisine-recipes/cuisine-recipes.scss#L30)                                       |
| **[ENTSCHEIDUNG]** | +2px                 | cuisine-recipes                        | 375  | `.cuisine-page__back`           | Cookbook                   | 500 16/19.2 Quicksand | 500 14/10 Quicksand   | recipe generator/small text       | `500 16px/1.2 var(--font-family-bo…` (Literal) | [library/cuisine-recipes/cuisine-recipes.scss:30](../../src/app/library/cuisine-recipes/cuisine-recipes.scss#L30)                                       |
| **[KLAR]**         | -2px                 | error-dialog                           | 375  | `.error-dialog__action`         | Go back to ingredients     | 500 16/20 Quicksand   | 500 18/22.5 Quicksand | recipe generator/H6               | `--font-body-16`                               | [generator/generation-error-dialog/generation-error-dialog.scss:75](../../src/app/generator/generation-error-dialog/generation-error-dialog.scss#L75)   |
| **[ENTSCHEIDUNG]** | +2px                 | error-dialog, generator-step2, loading | 1440 | `.generator__back`              | Ingredients                | 500 16/19.2 Quicksand | 500 14/10 Quicksand   | recipe generator/small text       | `500 16px/1.2 var(--font-family-bo…` (Literal) | [generator/generator.scss:43](../../src/app/generator/generator.scss#L43)                                                                               |
| **[KLAR]**         | -2px                 | home                                   | 375  | `.hero__cross-sell-link`        | Go to cookbook             | 500 16/20 Quicksand   | 500 18/22.5 Quicksand | recipe generator/H6               | `--font-body-16`                               | [home/home.scss:128](../../src/app/home/home.scss#L128)                                                                                                 |
| **[KLAR]**         | +2px                 | generator-step1, generator-step1-list  | 375  | `.ingredient-form__label`       | Ingredient                 | 500 20/20 Quicksand   | 500 18/22.5 Quicksand | recipe generator/H6               | `--font-small-label`                           | [generator/ingredient-step/ingredient-form/ingredient-form.scss:46](../../src/app/generator/ingredient-step/ingredient-form/ingredient-form.scss#L46)   |
| **[KLAR]**         | +2px                 | generator-step1, generator-step1-list  | 375  | `.ingredient-list__title`       | List of your Ingredients   | 500 20/20 Quicksand   | 500 18/22.5 Quicksand | recipe generator/H6               | `--font-small-label`                           | [generator/ingredient-step/ingredient-list/ingredient-list.scss:23](../../src/app/generator/ingredient-step/ingredient-list/ingredient-list.scss#L23)   |
| **[KLAR]**         | -2px                 | recipe-view-library                    | 375  | `.like__hint`                   | Give it a heart, so that … | 500 14/19.6 Quicksand | 500 16/20 Quicksand   | recipe generator/p 16             | `--font-small-text`                            | [recipe-view/recipe-like/recipe-like.scss:42](../../src/app/recipe-view/recipe-like/recipe-like.scss#L42)                                               |
| **[KLAR]**         | -2px                 | recipe-view, recipe-view-library       | 375  | `.like__question`               | Just finished this meal?   | 600 16/22.4 Quicksand | 600 18/22.5 Quicksand | Mob. H4                           | `600 16px/1.4 var(--font-family-bo…` (Literal) | [recipe-view/recipe-like/recipe-like.scss:38](../../src/app/recipe-view/recipe-like/recipe-like.scss#L38)                                               |
| **[KLAR]**         | -2px                 | recipe-view, recipe-view-library       | 375  | `.nutrition__table`             | Protein                    | 600 16/20 Quicksand   | 600 18/22.5 Quicksand | Mob. H4                           | `--font-body-16`                               | [recipe-view/nutrition-table/nutrition-table.scss:43](../../src/app/recipe-view/nutrition-table/nutrition-table.scss#L43)                               |
| **[KLAR]**         | -2px                 | cuisine-recipes                        | 1440 | `.pagination__button`           | <                          | 500 16/20 Quicksand   | 500 18/22.5 Quicksand | recipe generator/H6               | `--font-body-16`                               | [shared/pagination/pagination.scss:32](../../src/app/shared/pagination/pagination.scss#L32)                                                             |
| **[KLAR]**         | -2px                 | cuisine-recipes                        | 375  | `.pagination__button`           | <                          | 500 16/20 Quicksand   | 500 18/22.5 Quicksand | recipe generator/H6               | `--font-body-16`                               | [shared/pagination/pagination.scss:32](../../src/app/shared/pagination/pagination.scss#L32)                                                             |
| **[KLAR]**         | -2px                 | results                                | 375  | `.recipe-card__time`            | Cooking time: 20min        | 500 16/20 Quicksand   | 500 18/22.5 Quicksand | recipe generator/p 18             | `--font-body-16`                               | [results/recipe-card/recipe-card.scss:59](../../src/app/results/recipe-card/recipe-card.scss#L59)                                                       |
| **[KLAR]**         | -2px                 | cuisine-recipes                        | 1440 | `.recipe-row__time`             | Cooking time: 20min        | 500 14/19.6 Quicksand | 500 16/20 Quicksand   | recipe generator/p 16             | `500 14px/1.4 var(--font-family-bo…` (Literal) | [library/recipe-row/recipe-row.scss:61](../../src/app/library/recipe-row/recipe-row.scss#L61)                                                           |
| **[KLAR]**         | -2px                 | cuisine-recipes                        | 375  | `.recipe-row__time`             | Cooking time: 20min        | 500 14/19.6 Quicksand | 500 16/20 Quicksand   | recipe generator/p 16             | `500 14px/1.4 var(--font-family-bo…` (Literal) | [library/recipe-row/recipe-row.scss:61](../../src/app/library/recipe-row/recipe-row.scss#L61)                                                           |
| **[KLAR]**         | +2px                 | cuisine-recipes                        | 375  | `.recipe-row__title`            | Quick Pasta al Pomodoro    | 600 20/26 Quicksand   | 600 18/22.5 Quicksand | Mob. H4                           | `600 20px/1.3 var(--font-family-bo…` (Literal) | [library/recipe-row/recipe-row.scss:68](../../src/app/library/recipe-row/recipe-row.scss#L68)                                                           |
| **[ENTSCHEIDUNG]** | +2px                 | recipe-view, recipe-view-library       | 1440 | `.recipe-view__back`            | Recipe results             | 500 16/19.2 Quicksand | 500 14/10 Quicksand   | recipe generator/small text       | `500 16px/1.2 var(--font-family-bo…` (Literal) | [recipe-view/recipe-view.scss:29](../../src/app/recipe-view/recipe-view.scss#L29)                                                                       |
| **[KLAR]**         | -2px                 | recipe-view, recipe-view-library       | 375  | `.recipe-view__regenerate-link` | Generate new recipe        | 500 16/20 Quicksand   | 500 18/22.5 Quicksand | recipe generator/H6               | `--font-body-16`                               | [recipe-view/recipe-view.scss:147](../../src/app/recipe-view/recipe-view.scss#L147)                                                                     |
| **[KLAR]**         | -2px                 | results                                | 1440 | `.results__filter`              | Quick                      | 500 16/20 Quicksand   | 500 18/22.5 Quicksand | recipe generator/p 18             | `--font-body-16`                               | [results/results.scss:102](../../src/app/results/results.scss#L102)                                                                                     |
| **[KLAR]**         | -2px                 | results                                | 375  | `.results__filter`              | Quick                      | 500 16/20 Quicksand   | 500 18/22.5 Quicksand | recipe generator/p 18             | `--font-body-16`                               | [results/results.scss:102](../../src/app/results/results.scss#L102)                                                                                     |
| **[KLAR]**         | -2px                 | results                                | 375  | `.results__regenerate`          | Generate new recipe        | 500 16/20 Quicksand   | 500 18/22.5 Quicksand | recipe generator/H6               | `--font-body-16`                               | [results/results.scss:155](../../src/app/results/results.scss#L155)                                                                                     |
| **[KLAR]**         | -2px                 | recipe-view, recipe-view-library       | 1440 | `.step__description`            | Bring salted water to a b… | 500 16/24 Quicksand   | 500 18/22.5 Quicksand | recipe generator/p 18             | `500 16px/1.5 var(--font-family-bo…` (Literal) | [recipe-view/recipe-step/recipe-step.scss:42](../../src/app/recipe-view/recipe-step/recipe-step.scss#L42)                                               |
| **[KLAR]**         | -2px                 | error-dialog, generator-step2, loading | 1440 | `.stepper-field__unit`          | Portions                   | 500 18/22.5 Quicksand | 500 20/20 Quicksand   | recipe generator/small H + Labels | `--font-h6`                                    | [generator/preferences-step/stepper-field/stepper-field.scss:108](../../src/app/generator/preferences-step/stepper-field/stepper-field.scss#L108)       |
| **[KLAR]**         | -2px                 | recipe-view, recipe-view-library       | 1440 | `.summary__chip`                | Vegetarian                 | 500 16/20 Quicksand   | 500 18/22.5 Quicksand | recipe generator/p 18             | `--font-body-16`                               | [recipe-view/recipe-summary/recipe-summary.scss:119](../../src/app/recipe-view/recipe-summary/recipe-summary.scss#L119)                                 |
| **[KLAR]**         | -2px                 | recipe-view, recipe-view-library       | 375  | `.summary__chip`                | Vegetarian                 | 500 16/20 Quicksand   | 500 18/22.5 Quicksand | recipe generator/p 18             | `--font-body-16`                               | [recipe-view/recipe-summary/recipe-summary.scss:119](../../src/app/recipe-view/recipe-summary/recipe-summary.scss#L119)                                 |
| **[ENTSCHEIDUNG]** | +100w, Familie       | error-dialog                           | 375  | `.error-dialog__message`        | It looks like some ingred… | 500 16/20 Quicksand   | 400 16/20.08 Mulish   | old styles/Body                   | `--font-body-16`                               | [generator/generation-error-dialog/generation-error-dialog.scss:58](../../src/app/generator/generation-error-dialog/generation-error-dialog.scss#L58)   |
| **[KLAR]**         | -100w                | error-dialog                           | 1440 | `.error-dialog__title`          | Ups!                       | 500 28/33.6 Quicksand | 600 28/35 Quicksand   | recipe generator/Card headlines   | `500 28px/1.2 var(--font-family-bo…` (Literal) | [generator/generation-error-dialog/generation-error-dialog.scss:50](../../src/app/generator/generation-error-dialog/generation-error-dialog.scss#L50)   |
| **[KLAR]**         | -100w                | error-dialog                           | 375  | `.error-dialog__title`          | Ups!                       | 500 28/33.6 Quicksand | 600 28/35 Quicksand   | recipe generator/Card headlines   | `500 28px/1.2 var(--font-family-bo…` (Literal) | [generator/generation-error-dialog/generation-error-dialog.scss:50](../../src/app/generator/generation-error-dialog/generation-error-dialog.scss#L50)   |
| **[KLAR]**         | +100w, Familie       | home                                   | 375  | `.hero__cross-sell-title`       | Hungry for inspiration?    | 600 24/30 Quicksand   | 500 24/28.8 Ubuntu    | —                                 | `--font-h5-semi`                               | [home/home.scss:119](../../src/app/home/home.scss#L119)                                                                                                 |
| **[KLAR]**         | -100w                | generator-step1, generator-step1-list  | 1440 | `.ingredient-form__unit-select` | gram                       | 400 16/44 Quicksand   | 500 16/20 Quicksand   | recipe generator/p 16             | `500 16px/44px var(--font-family-b…` (Literal) | [generator/ingredient-step/ingredient-form/ingredient-form.scss:143](../../src/app/generator/ingredient-step/ingredient-form/ingredient-form.scss#L143) |
| **[KLAR]**         | -100w                | generator-step1, generator-step1-list  | 375  | `.ingredient-form__unit-select` | gram                       | 400 16/44 Quicksand   | 500 16/20 Quicksand   | recipe generator/p 16             | `500 16px/44px var(--font-family-b…` (Literal) | [generator/ingredient-step/ingredient-form/ingredient-form.scss:143](../../src/app/generator/ingredient-step/ingredient-form/ingredient-form.scss#L143) |
| **[KLAR]**         | +100w                | cuisine-recipes                        | 1440 | `.recipe-row__title`            | Quick Pasta al Pomodoro    | 600 24/30 Quicksand   | 500 24/30 Quicksand   | recipe generator/H5               | `--font-h5-semi`                               | [library/recipe-row/recipe-row.scss:71](../../src/app/library/recipe-row/recipe-row.scss#L71)                                                           |
| **[KLAR]**         | -100w                | recipe-view, recipe-view-library       | 375  | `.step__title`                  | Boil the pasta             | 500 18/23.4 Quicksand | 600 18/22.5 Quicksand | Mob. H4                           | `500 18px/1.3 var(--font-family-bo…` (Literal) | [recipe-view/recipe-step/recipe-step.scss:20](../../src/app/recipe-view/recipe-step/recipe-step.scss#L20)                                               |
| **[ENTSCHEIDUNG]** | Familie              | library                                | 1440 | `.most-liked__likes`            | 18                         | 500 16/20 Quicksand   | 500 16/20.08 Mulish   | old styles/button                 | `--font-body-16`                               | [library/most-liked-row/most-liked-row.scss:101](../../src/app/library/most-liked-row/most-liked-row.scss#L101)                                         |

### Bereits passend (73 Deklarationen × Viewport)

Vollständig aufgeführt, damit die Trefferquote nachvollziehbar ist.

| Kat.     | Delta   | Ansicht                                | VP   | Selektor                        | Text                       | Ist (w size/lh)       | Soll (Figma)          | Figma-Stil                        | Deklaration                                    | Quelle                                                                                                                                                |
| -------- | ------- | -------------------------------------- | ---- | ------------------------------- | -------------------------- | --------------------- | --------------------- | --------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[OK]** | +4 lh   | error-dialog, generator-step2, loading | 1440 | `.chip-group__hint`             | up to 20 min               | 500 14/14 Quicksand   | 500 14/10 Quicksand   | recipe generator/small text       | `--font-small-text`                            | [generator/preferences-step/chip-group/chip-group.scss:84](../../src/app/generator/preferences-step/chip-group/chip-group.scss#L84)                   |
| **[OK]** | +4 lh   | error-dialog, generator-step2, loading | 375  | `.chip-group__hint`             | up to 20 min               | 500 14/14 Quicksand   | 500 14/10 Quicksand   | recipe generator/small text       | `--font-small-text`                            | [generator/preferences-step/chip-group/chip-group.scss:84](../../src/app/generator/preferences-step/chip-group/chip-group.scss#L84)                   |
| **[OK]** | ±0      | library                                | 1440 | `.cookbook__text`               | From quick bites to gourm… | 500 24/30 Quicksand   | 500 24/30 Quicksand   | recipe generator/H5               | `--font-h5`                                    | [library/library.scss:101](../../src/app/library/library.scss#L101)                                                                                   |
| **[OK]** | ±0      | library                                | 375  | `.cookbook__text`               | From quick bites to gourm… | 500 18/22.5 Quicksand | 500 18/22.5 Quicksand | recipe generator/p 18             | `--font-body-18`                               | [library/library.scss:97](../../src/app/library/library.scss#L97)                                                                                     |
| **[OK]** | ±0      | library                                | 1440 | `.cookbook__title`              | Cookbook                   | 700 64/65 Quicksand   | 700 64/65 Quicksand   | —                                 | `700 64px/65px var(--font-family-b…` (Literal) | [library/library.scss:89](../../src/app/library/library.scss#L89)                                                                                     |
| **[OK]** | ±0      | library                                | 375  | `.cookbook__title`              | Cookbook                   | 700 40/50 Quicksand   | 700 40/50 Quicksand   | —                                 | `700 40px/1.25 var(--font-family-b…` (Literal) | [library/library.scss:86](../../src/app/library/library.scss#L86)                                                                                     |
| **[OK]** | ±0      | library                                | 1440 | `.cuisine-filter__label`        | Italian cuisine            | 600 28/35 Quicksand   | 600 28/35 Quicksand   | recipe generator/Card headlines   | `--font-card-headline`                         | [library/cuisine-filter/cuisine-filter.scss:44](../../src/app/library/cuisine-filter/cuisine-filter.scss#L44)                                         |
| **[OK]** | ±0      | library                                | 375  | `.cuisine-filter__label`        | Italian cuisine            | 600 28/35 Quicksand   | 600 28/35 Quicksand   | recipe generator/Card headlines   | `--font-card-headline`                         | [library/cuisine-filter/cuisine-filter.scss:44](../../src/app/library/cuisine-filter/cuisine-filter.scss#L44)                                         |
| **[OK]** | ±0      | cuisine-recipes                        | 1440 | `.cuisine-page__generate`       | Generate a recipe          | 600 24/30 Quicksand   | 600 24/30 Quicksand   | recipe generator/Button Text      | `--font-button`                                | [library/cuisine-recipes/cuisine-recipes.scss:164](../../src/app/library/cuisine-recipes/cuisine-recipes.scss#L164)                                   |
| **[OK]** | ±0      | cuisine-recipes                        | 375  | `.cuisine-page__generate`       | Generate a recipe          | 600 16/20 Quicksand   | 600 16/20 Quicksand   | Mob. Button text                  | `--font-mobile-button`                         | [library/cuisine-recipes/cuisine-recipes.scss:159](../../src/app/library/cuisine-recipes/cuisine-recipes.scss#L159)                                   |
| **[OK]** | ±0      | cuisine-recipes                        | 1440 | `.cuisine-page__title`          | Italian cuisine            | 700 40/41.6 Quicksand | 700 40/41.6 Quicksand | recipe generator/H4               | `--font-h4`                                    | [library/cuisine-recipes/cuisine-recipes.scss:80](../../src/app/library/cuisine-recipes/cuisine-recipes.scss#L80)                                     |
| **[OK]** | ±0      | cuisine-recipes                        | 375  | `.cuisine-page__title`          | Italian cuisine            | 600 18/22.5 Quicksand | 600 18/22.5 Quicksand | Mob. H4                           | `--font-mobile-h4`                             | [library/cuisine-recipes/cuisine-recipes.scss:77](../../src/app/library/cuisine-recipes/cuisine-recipes.scss#L77)                                     |
| **[OK]** | ±0      | recipe-view, recipe-view-library       | 1440 | `.directions__title`            | Directions                 | 600 32/40 Quicksand   | 600 32/40 Quicksand   | —                                 | `600 32px/1.25 var(--font-family-b…` (Literal) | [recipe-view/recipe-directions/recipe-directions.scss:31](../../src/app/recipe-view/recipe-directions/recipe-directions.scss#L31)                     |
| **[OK]** | ±0      | recipe-view, recipe-view-library       | 375  | `.directions__title`            | Directions                 | 600 24/30 Quicksand   | 600 24/30 Quicksand   | Mob. H3                           | `--font-h5-semi`                               | [recipe-view/recipe-directions/recipe-directions.scss:28](../../src/app/recipe-view/recipe-directions/recipe-directions.scss#L28)                     |
| **[OK]** | ±0      | recipe-view, recipe-view-library       | 375  | `.directions__toggle`           | Hide directions            | 500 16/20 Quicksand   | 500 16/20 Quicksand   | recipe generator/p 16             | `--font-body-16`                               | [recipe-view/recipe-directions/recipe-directions.scss:78](../../src/app/recipe-view/recipe-directions/recipe-directions.scss#L78)                     |
| **[OK]** | ±0      | generator-step1, generator-step1-list  | 1440 | `.generator__lead`              | Got random stuff in your … | 500 24/30 Quicksand   | 500 24/30 Quicksand   | recipe generator/H5               | `--font-h5`                                    | [generator/generator.scss:99](../../src/app/generator/generator.scss#L99)                                                                             |
| **[OK]** | ±0      | generator-step1, generator-step1-list  | 375  | `.generator__lead`              | Got random stuff in your … | 600 18/22.5 Quicksand | 600 18/22.5 Quicksand | Mob. H4                           | `--font-mobile-h4`                             | [generator/generator.scss:95](../../src/app/generator/generator.scss#L95)                                                                             |
| **[OK]** | ±0      | generator-step1, generator-step1-list  | 1440 | `.generator__title`             | Generate recipe            | 600 54/65 Quicksand   | 600 54/65 Quicksand   | recipe generator/H2               | `--font-h2`                                    | [generator/generator.scss:79](../../src/app/generator/generator.scss#L79)                                                                             |
| **[OK]** | -4.8 lh | generator-step1, generator-step1-list  | 375  | `.generator__title`             | Generate recipe            | 600 32/35.2 Quicksand | 600 32/40 Quicksand   | Mob. H2                           | `600 32px/1.1 var(--font-family-bo…` (Literal) | [generator/generator.scss:74](../../src/app/generator/generator.scss#L74)                                                                             |
| **[OK]** | ±0      | home                                   | 1440 | `.hero__cta`                    | Get started                | 600 24/30 Quicksand   | 600 24/30 Quicksand   | recipe generator/Button Text      | `--font-button`                                | [home/home.scss:96](../../src/app/home/home.scss#L96)                                                                                                 |
| **[OK]** | ±0      | home                                   | 375  | `.hero__cta`                    | Get started                | 600 16/20 Quicksand   | 600 16/20 Quicksand   | Mob. Button text                  | `--font-mobile-button`                         | [home/home.scss:91](../../src/app/home/home.scss#L91)                                                                                                 |
| **[OK]** | ±0      | home                                   | 1440 | `.hero__eyebrow`                | AI-Powered recipe generat… | 600 48/60 Quicksand   | 600 48/60 Quicksand   | recipe generator/H3               | `--font-h3`                                    | [home/home.scss:69](../../src/app/home/home.scss#L69)                                                                                                 |
| **[OK]** | ±0      | home                                   | 375  | `.hero__eyebrow`                | AI-Powered recipe generat… | 600 24/30 Quicksand   | 600 24/30 Quicksand   | Mob. H3                           | `--font-h5-semi`                               | [home/home.scss:65](../../src/app/home/home.scss#L65)                                                                                                 |
| **[OK]** | ±0      | home                                   | 1440 | `.hero__title`                  | Code à Cuisine             | 700 104/119.5 Ubuntu  | 700 104/119.5 Ubuntu  | recipe generator/H1               | `--font-h1`                                    | [home/home.scss:78](../../src/app/home/home.scss#L78)                                                                                                 |
| **[OK]** | ±0      | home                                   | 375  | `.hero__title`                  | Code à Cuisine             | 700 64/72 Ubuntu      | 700 64/72 Ubuntu      | Mob. H1                           | `--font-mobile-h1`                             | [home/home.scss:74](../../src/app/home/home.scss#L74)                                                                                                 |
| **[OK]** | ±0      | generator-step1, generator-step1-list  | 1440 | `.ingredient-form__label`       | Ingredient                 | 500 20/20 Quicksand   | 500 20/20 Quicksand   | recipe generator/small H + Labels | `--font-small-label`                           | [generator/ingredient-step/ingredient-form/ingredient-form.scss:46](../../src/app/generator/ingredient-step/ingredient-form/ingredient-form.scss#L46) |
| **[OK]** | ±0      | generator-step1-list                   | 1440 | `.ingredient-list__item`        | 200g                       | 500 18/22.5 Quicksand | 500 18/22.5 Quicksand | recipe generator/H6               | `--font-body-18`                               | [generator/ingredient-step/ingredient-list/ingredient-list.scss:48](../../src/app/generator/ingredient-step/ingredient-list/ingredient-list.scss#L48) |
| **[OK]** | +2.4 lh | generator-step1-list                   | 375  | `.ingredient-list__item`        | 200g                       | 500 16/22.4 Quicksand | 500 16/20 Quicksand   | recipe generator/p 16             | `500 16px/1.4 var(--font-family-bo…` (Literal) | [generator/ingredient-step/ingredient-list/ingredient-list.scss:43](../../src/app/generator/ingredient-step/ingredient-list/ingredient-list.scss#L43) |
| **[OK]** | ±0      | generator-step1, generator-step1-list  | 1440 | `.ingredient-list__title`       | List of your Ingredients   | 500 20/20 Quicksand   | 500 20/20 Quicksand   | recipe generator/small H + Labels | `--font-small-label`                           | [generator/ingredient-step/ingredient-list/ingredient-list.scss:23](../../src/app/generator/ingredient-step/ingredient-list/ingredient-list.scss#L23) |
| **[OK]** | ±0      | generator-step1-list                   | 1440 | `.ingredient-step__next`        | Next step                  | 600 24/30 Quicksand   | 600 24/30 Quicksand   | recipe generator/Button Text      | `--font-button`                                | [generator/ingredient-step/ingredient-step.scss:52](../../src/app/generator/ingredient-step/ingredient-step.scss#L52)                                 |
| **[OK]** | ±0      | generator-step1-list                   | 375  | `.ingredient-step__next`        | Next step                  | 600 16/20 Quicksand   | 600 16/20 Quicksand   | Mob. Button text                  | `--font-mobile-button`                         | [generator/ingredient-step/ingredient-step.scss:42](../../src/app/generator/ingredient-step/ingredient-step.scss#L42)                                 |
| **[OK]** | ±0      | recipe-view, recipe-view-library       | 1440 | `.ingredients__item`            | 200g                       | 500 24/30 Quicksand   | 500 24/30 Quicksand   | recipe generator/H5               | `--font-h5`                                    | [recipe-view/recipe-ingredients/recipe-ingredients.scss:92](../../src/app/recipe-view/recipe-ingredients/recipe-ingredients.scss#L92)                 |
| **[OK]** | ±0      | recipe-view, recipe-view-library       | 375  | `.ingredients__item`            | 200g                       | 500 16/20 Quicksand   | 500 16/20 Quicksand   | recipe generator/p 16             | `--font-body-16`                               | [recipe-view/recipe-ingredients/recipe-ingredients.scss:86](../../src/app/recipe-view/recipe-ingredients/recipe-ingredients.scss#L86)                 |
| **[OK]** | ±0      | recipe-view, recipe-view-library       | 1440 | `.ingredients__subtitle`        | Your ingredients           | 600 24/30 Quicksand   | 600 24/30 Quicksand   | —                                 | `--font-h5-semi`                               | [recipe-view/recipe-ingredients/recipe-ingredients.scss:69](../../src/app/recipe-view/recipe-ingredients/recipe-ingredients.scss#L69)                 |
| **[OK]** | ±0      | recipe-view, recipe-view-library       | 375  | `.ingredients__subtitle`        | Your ingredients           | 600 18/22.5 Quicksand | 600 18/22.5 Quicksand | Mob. H4                           | `--font-mobile-h4`                             | [recipe-view/recipe-ingredients/recipe-ingredients.scss:66](../../src/app/recipe-view/recipe-ingredients/recipe-ingredients.scss#L66)                 |
| **[OK]** | ±0      | recipe-view, recipe-view-library       | 1440 | `.ingredients__title`           | Ingredients                | 600 32/40 Quicksand   | 600 32/40 Quicksand   | —                                 | `600 32px/1.25 var(--font-family-b…` (Literal) | [recipe-view/recipe-ingredients/recipe-ingredients.scss:34](../../src/app/recipe-view/recipe-ingredients/recipe-ingredients.scss#L34)                 |
| **[OK]** | ±0      | recipe-view, recipe-view-library       | 375  | `.ingredients__title`           | Ingredients                | 600 24/30 Quicksand   | 600 24/30 Quicksand   | Mob. H3                           | `--font-h5-semi`                               | [recipe-view/recipe-ingredients/recipe-ingredients.scss:31](../../src/app/recipe-view/recipe-ingredients/recipe-ingredients.scss#L31)                 |
| **[OK]** | ±0      | recipe-view, recipe-view-library       | 375  | `.ingredients__toggle`          | Hide ingredients           | 500 16/20 Quicksand   | 500 16/20 Quicksand   | recipe generator/p 16             | `--font-body-16`                               | [recipe-view/recipe-ingredients/recipe-ingredients.scss:127](../../src/app/recipe-view/recipe-ingredients/recipe-ingredients.scss#L127)               |
| **[OK]** | ±0      | loading                                | 1440 | `.loading__text`                | Generating                 | 700 48/55.152 Ubuntu  | 700 48/55.15 Ubuntu   | —                                 | `700 48px/1.149 var(--font-family-…` (Literal) | [generator/generation-loading/generation-loading.scss:79](../../src/app/generator/generation-loading/generation-loading.scss#L79)                     |
| **[OK]** | ±0      | loading                                | 375  | `.loading__text`                | Generating                 | 700 36/41.364 Ubuntu  | 700 36/41.36 Ubuntu   | —                                 | `700 36px/1.149 var(--font-family-…` (Literal) | [generator/generation-loading/generation-loading.scss:75](../../src/app/generator/generation-loading/generation-loading.scss#L75)                     |
| **[OK]** | ±0      | library                                | 375  | `.most-liked__likes`            | 18                         | 500 16/20 Quicksand   | 500 16/20 Quicksand   | recipe generator/p 16             | `--font-body-16`                               | [library/most-liked-row/most-liked-row.scss:101](../../src/app/library/most-liked-row/most-liked-row.scss#L101)                                       |
| **[OK]** | ±0      | library                                | 1440 | `.most-liked__time`             | Cooking time: 20min        | 500 16/20 Quicksand   | 500 16/20 Quicksand   | recipe generator/p 16             | `--font-body-16`                               | [library/most-liked-row/most-liked-row.scss:91](../../src/app/library/most-liked-row/most-liked-row.scss#L91)                                         |
| **[OK]** | ±0      | library                                | 375  | `.most-liked__time`             | Cooking time: 20min        | 500 16/20 Quicksand   | 500 16/20 Quicksand   | recipe generator/p 16             | `--font-body-16`                               | [library/most-liked-row/most-liked-row.scss:91](../../src/app/library/most-liked-row/most-liked-row.scss#L91)                                         |
| **[OK]** | ±0      | library                                | 1440 | `.most-liked__title`            | Most liked recipes         | 600 24/30 Quicksand   | 600 24/30 Quicksand   | recipe generator/H5 SemiBold      | `--font-h5-semi`                               | [library/most-liked-row/most-liked-row.scss:26](../../src/app/library/most-liked-row/most-liked-row.scss#L26)                                         |
| **[OK]** | -1.2 lh | library                                | 375  | `.most-liked__title`            | Most liked recipes         | 600 24/28.8 Quicksand | 600 24/30 Quicksand   | Mob. H3                           | `600 24px/1.2 var(--font-family-bo…` (Literal) | [library/most-liked-row/most-liked-row.scss:23](../../src/app/library/most-liked-row/most-liked-row.scss#L23)                                         |
| **[OK]** | ±0      | recipe-view, recipe-view-library       | 1440 | `.nutrition__title`             | Nutritional information    | 500 18/22.5 Quicksand | 500 18/22.5 Quicksand | recipe generator/H6               | `--font-body-18`                               | [recipe-view/nutrition-table/nutrition-table.scss:17](../../src/app/recipe-view/nutrition-table/nutrition-table.scss#L17)                             |
| **[OK]** | ±0      | recipe-view, recipe-view-library       | 375  | `.nutrition__title`             | Nutritional information    | 500 18/22.5 Quicksand | 500 18/22.5 Quicksand | recipe generator/p 18             | `--font-body-18`                               | [recipe-view/nutrition-table/nutrition-table.scss:17](../../src/app/recipe-view/nutrition-table/nutrition-table.scss#L17)                             |
| **[OK]** | ±0      | error-dialog, generator-step2, loading | 1440 | `.preferences-step__submit`     | Generate a recipe          | 600 24/30 Quicksand   | 600 24/30 Quicksand   | recipe generator/Button Text      | `--font-button`                                | [generator/preferences-step/preferences-step.scss:69](../../src/app/generator/preferences-step/preferences-step.scss#L69)                             |
| **[OK]** | ±0      | error-dialog, generator-step2, loading | 375  | `.preferences-step__submit`     | Generate a recipe          | 600 16/20 Quicksand   | 600 16/20 Quicksand   | Mob. Button text                  | `--font-mobile-button`                         | [generator/preferences-step/preferences-step.scss:60](../../src/app/generator/preferences-step/preferences-step.scss#L60)                             |
| **[OK]** | ±0      | results                                | 1440 | `.recipe-card__caption`         | Recipe 1                   | 600 24/30 Quicksand   | 600 24/30 Quicksand   | —                                 | `--font-h5-semi`                               | [results/recipe-card/recipe-card.scss:33](../../src/app/results/recipe-card/recipe-card.scss#L33)                                                     |
| **[OK]** | ±0      | results                                | 375  | `.recipe-card__caption`         | Recipe 1                   | 600 24/30 Quicksand   | 600 24/30 Quicksand   | Mob. H3                           | `--font-h5-semi`                               | [results/recipe-card/recipe-card.scss:33](../../src/app/results/recipe-card/recipe-card.scss#L33)                                                     |
| **[OK]** | ±0      | results                                | 1440 | `.recipe-card__link`            | View                       | 600 24/30 Quicksand   | 600 24/30 Quicksand   | recipe generator/Button Text      | `--font-button`                                | [results/recipe-card/recipe-card.scss:82](../../src/app/results/recipe-card/recipe-card.scss#L82)                                                     |
| **[OK]** | ±0      | results                                | 375  | `.recipe-card__link`            | View                       | 600 16/20 Quicksand   | 600 16/20 Quicksand   | Mob. Button text                  | `--font-mobile-button`                         | [results/recipe-card/recipe-card.scss:75](../../src/app/results/recipe-card/recipe-card.scss#L75)                                                     |
| **[OK]** | ±0      | results                                | 1440 | `.recipe-card__title`           | Pasta with spinach and ch… | 600 32/40 Quicksand   | 600 32/40 Quicksand   | —                                 | `600 32px/40px var(--font-family-b…` (Literal) | [results/recipe-card/recipe-card.scss:51](../../src/app/results/recipe-card/recipe-card.scss#L51)                                                     |
| **[OK]** | ±0      | results                                | 375  | `.recipe-card__title`           | Pasta with spinach and ch… | 600 24/30 Quicksand   | 600 24/30 Quicksand   | Mob. H3                           | `--font-h5-semi`                               | [results/recipe-card/recipe-card.scss:48](../../src/app/results/recipe-card/recipe-card.scss#L48)                                                     |
| **[OK]** | ±0      | recipe-view, recipe-view-library       | 1440 | `.recipe-view__cross-sell-link` | Cookbook                   | 600 24/30 Quicksand   | 600 24/30 Quicksand   | —                                 | `--font-button`                                | [recipe-view/recipe-view.scss:121](../../src/app/recipe-view/recipe-view.scss#L121)                                                                   |
| **[OK]** | ±0      | recipe-view, recipe-view-library       | 375  | `.recipe-view__cross-sell-link` | Cookbook                   | 600 16/20 Quicksand   | 600 16/20 Quicksand   | Mob. Button text                  | `--font-mobile-button`                         | [recipe-view/recipe-view.scss:115](../../src/app/recipe-view/recipe-view.scss#L115)                                                                   |
| **[OK]** | ±0      | recipe-view, recipe-view-library       | 1440 | `.recipe-view__cross-sell-text` | Find inspiration for your… | 600 24/30 Quicksand   | 600 24/30 Quicksand   | —                                 | `--font-h5-semi`                               | [recipe-view/recipe-view.scss:102](../../src/app/recipe-view/recipe-view.scss#L102)                                                                   |
| **[OK]** | ±0      | recipe-view, recipe-view-library       | 375  | `.recipe-view__cross-sell-text` | Find inspiration for your… | 500 16/20 Quicksand   | 500 16/20 Quicksand   | recipe generator/p 16             | `--font-body-16`                               | [recipe-view/recipe-view.scss:98](../../src/app/recipe-view/recipe-view.scss#L98)                                                                     |
| **[OK]** | ±0      | results                                | 1440 | `.results__lead`                | We took what you have and… | 500 24/30 Quicksand   | 500 24/30 Quicksand   | recipe generator/H5               | `--font-h5`                                    | [results/results.scss:83](../../src/app/results/results.scss#L83)                                                                                     |
| **[OK]** | ±0      | results                                | 375  | `.results__lead`                | We took what you have and… | 500 18/22.5 Quicksand | 500 18/22.5 Quicksand | recipe generator/H6               | `--font-body-18`                               | [results/results.scss:79](../../src/app/results/results.scss#L79)                                                                                     |
| **[OK]** | ±0      | results                                | 1440 | `.results__title`               | The recipe results         | 600 54/65 Quicksand   | 600 54/65 Quicksand   | recipe generator/H2               | `--font-h2`                                    | [results/results.scss:55](../../src/app/results/results.scss#L55)                                                                                     |
| **[OK]** | -4.8 lh | results                                | 375  | `.results__title`               | The recipe results         | 600 32/35.2 Quicksand | 600 32/40 Quicksand   | Mob. H2                           | `600 32px/1.1 var(--font-family-bo…` (Literal) | [results/results.scss:51](../../src/app/results/results.scss#L51)                                                                                     |
| **[OK]** | +4 lh   | recipe-view, recipe-view-library       | 375  | `.step__description`            | Bring salted water to a b… | 500 16/24 Quicksand   | 500 16/20 Quicksand   | recipe generator/p 16             | `500 16px/1.5 var(--font-family-bo…` (Literal) | [recipe-view/recipe-step/recipe-step.scss:42](../../src/app/recipe-view/recipe-step/recipe-step.scss#L42)                                             |
| **[OK]** | ±0      | error-dialog, generator-step2, loading | 1440 | `.stepper-field__legend`        | How many portions you nee… | 500 20/20 Quicksand   | 500 20/20 Quicksand   | recipe generator/small H + Labels | `--font-small-label`                           | [generator/preferences-step/stepper-field/stepper-field.scss:15](../../src/app/generator/preferences-step/stepper-field/stepper-field.scss#L15)       |
| **[OK]** | ±0      | error-dialog, generator-step2, loading | 375  | `.stepper-field__unit`          | Portions                   | 500 18/22.5 Quicksand | 500 18/22.5 Quicksand | recipe generator/H6               | `--font-h6`                                    | [generator/preferences-step/stepper-field/stepper-field.scss:108](../../src/app/generator/preferences-step/stepper-field/stepper-field.scss#L108)     |
| **[OK]** | ±0      | error-dialog, generator-step2, loading | 1440 | `.stepper-field__value`         | 2                          | 500 20/20 Quicksand   | 500 20/20 Quicksand   | recipe generator/small H + Labels | `--font-small-label`                           | [generator/preferences-step/stepper-field/stepper-field.scss:102](../../src/app/generator/preferences-step/stepper-field/stepper-field.scss#L102)     |
| **[OK]** | ±0      | error-dialog, generator-step2, loading | 375  | `.stepper-field__value`         | 2                          | 500 20/20 Quicksand   | 500 20/20 Quicksand   | recipe generator/small H + Labels | `--font-small-label`                           | [generator/preferences-step/stepper-field/stepper-field.scss:102](../../src/app/generator/preferences-step/stepper-field/stepper-field.scss#L102)     |
| **[OK]** | ±0      | recipe-view, recipe-view-library       | 1440 | `.summary__cooks-label`         | Cooking persons: 2         | 500 20/20 Quicksand   | 500 20/20 Quicksand   | recipe generator/small H + Labels | `--font-small-label`                           | [recipe-view/recipe-summary/recipe-summary.scss:67](../../src/app/recipe-view/recipe-summary/recipe-summary.scss#L67)                                 |
| **[OK]** | ±0      | recipe-view, recipe-view-library       | 1440 | `.summary__time`                | Cooking time: 20min        | 500 20/20 Quicksand   | 500 20/20 Quicksand   | recipe generator/small H + Labels | `--font-small-label`                           | [recipe-view/recipe-summary/recipe-summary.scss:39](../../src/app/recipe-view/recipe-summary/recipe-summary.scss#L39)                                 |
| **[OK]** | ±0      | recipe-view, recipe-view-library       | 375  | `.summary__time`                | Cooking time: 20min        | 500 18/22.5 Quicksand | 500 18/22.5 Quicksand | recipe generator/p 18             | `--font-body-18`                               | [recipe-view/recipe-summary/recipe-summary.scss:36](../../src/app/recipe-view/recipe-summary/recipe-summary.scss#L36)                                 |
| **[OK]** | ±0      | recipe-view, recipe-view-library       | 1440 | `.summary__title`               | Pasta with spinach and ch… | 600 54/65 Quicksand   | 600 54/65 Quicksand   | recipe generator/H2               | `--font-h2`                                    | [recipe-view/recipe-summary/recipe-summary.scss:51](../../src/app/recipe-view/recipe-summary/recipe-summary.scss#L51)                                 |
| **[OK]** | ±0      | recipe-view, recipe-view-library       | 375  | `.summary__title`               | Pasta with spinach and ch… | 600 24/30 Quicksand   | 600 24/30 Quicksand   | Mob. H3                           | `--font-h5-semi`                               | [recipe-view/recipe-summary/recipe-summary.scss:48](../../src/app/recipe-view/recipe-summary/recipe-summary.scss#L48)                                 |

---

## Aufgabe 2 — die 33 Literalstellen

Alle 33 Zeilennummern aus der Arbeitsliste wurden gegen `8435096` verifiziert
und stimmen. Der Index findet in `src/app/` **genau 33** Deklarationen, die eine
Schriftgröße als Literal setzen — die Liste ist also vollständig, es gibt keine 34. Stelle. (`font: inherit` in `footer.scss` und `_reset.scss` zählt nicht mit,
das setzt keine Größe.)

**Ergebnis: 18 der 33 Stellen weichen ab, 10 stimmen, 5 haben in Figma kein
Gegenstück.**

| #   | Stelle                                                                                                                           | Regel                                      | Ist (Literal)                             | VP   | Gemessen              | Soll (Figma)          | Figma-Stil                        | Gleich?    |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------- | ---- | --------------------- | --------------------- | --------------------------------- | ---------- |
| 1   | [recipe-row.scss:45](../../src/app/library/recipe-row/recipe-row.scss#L45)                                                       | `.recipe-row__position`                    | `600 14px/1 var(--font-family-body)`      | 1440 | 600 14/14 Quicksand   | 500 18/22.5 Quicksand | recipe generator/p 18             | **nein**   |
|     |                                                                                                                                  |                                            |                                           | 375  | 600 14/14 Quicksand   | 500 18/22.5 Quicksand | recipe generator/p 18             | **nein**   |
| 2   | [recipe-row.scss:61](../../src/app/library/recipe-row/recipe-row.scss#L61)                                                       | `.recipe-row__time`                        | `500 14px/1.4 var(--font-family-body)`    | 1440 | 500 14/19.6 Quicksand | 500 16/20 Quicksand   | recipe generator/p 16             | **nein**   |
|     |                                                                                                                                  |                                            |                                           | 375  | 500 14/19.6 Quicksand | 500 16/20 Quicksand   | recipe generator/p 16             | **nein**   |
| 3   | [recipe-row.scss:68](../../src/app/library/recipe-row/recipe-row.scss#L68)                                                       | `.recipe-row__title`                       | `600 20px/1.3 var(--font-family-body)`    | 375  | 600 20/26 Quicksand   | 600 18/22.5 Quicksand | Mob. H4                           | **nein**   |
| 4   | [recipe-row.scss:112](../../src/app/library/recipe-row/recipe-row.scss#L112)                                                     | `.recipe-row__chip`                        | `500 14px/1.4 var(--font-family-body)`    | 1440 | 500 14/19.6 Quicksand | 500 18/22.5 Quicksand | recipe generator/p 18             | **nein**   |
|     |                                                                                                                                  |                                            |                                           | 375  | 500 14/19.6 Quicksand | 500 18/22.5 Quicksand | recipe generator/p 18             | **nein**   |
| 5   | [library.scss:27](../../src/app/library/library.scss#L27)                                                                        | `.cookbook__back`                          | `500 16px/1.2 var(--font-family-body)`    | 1440 | 500 16/19.2 Quicksand | 500 14/10 Quicksand   | recipe generator/small text       | **nein**   |
|     |                                                                                                                                  |                                            |                                           | 375  | 500 16/19.2 Quicksand | 500 14/10 Quicksand   | recipe generator/small text       | **nein**   |
| 6   | [library.scss:86](../../src/app/library/library.scss#L86)                                                                        | `.cookbook__title`                         | `700 40px/1.25 var(--font-family-body)`   | 375  | 700 40/50 Quicksand   | 700 40/50 Quicksand   | —                                 | ja         |
| 7   | [library.scss:89](../../src/app/library/library.scss#L89)                                                                        | `.cookbook__title`                         | `700 64px/65px var(--font-family-body)`   | 1440 | 700 64/65 Quicksand   | 700 64/65 Quicksand   | —                                 | ja         |
| 8   | [most-liked-row.scss:23](../../src/app/library/most-liked-row/most-liked-row.scss#L23)                                           | `.most-liked__title`                       | `600 24px/1.2 var(--font-family-body)`    | 375  | 600 24/28.8 Quicksand | 600 24/30 Quicksand   | Mob. H3                           | ja         |
| 9   | [most-liked-row.scss:113](../../src/app/library/most-liked-row/most-liked-row.scss#L113)                                         | `.most-liked__name`                        | `600 20px/1.3 var(--font-family-body)`    | 1440 | 600 20/26 Quicksand   | 500 24/30 Quicksand   | recipe generator/H5               | **nein**   |
|     |                                                                                                                                  |                                            |                                           | 375  | 600 20/26 Quicksand   | 500 18/22.5 Quicksand | recipe generator/H6               | **nein**   |
| 10  | [cuisine-recipes.scss:30](../../src/app/library/cuisine-recipes/cuisine-recipes.scss#L30)                                        | `.cuisine-page__back`                      | `500 16px/1.2 var(--font-family-body)`    | 1440 | 500 16/19.2 Quicksand | 500 14/10 Quicksand   | recipe generator/small text       | **nein**   |
|     |                                                                                                                                  |                                            |                                           | 375  | 500 16/19.2 Quicksand | 500 14/10 Quicksand   | recipe generator/small text       | **nein**   |
| 11  | [recipe-like.scss:38](../../src/app/recipe-view/recipe-like/recipe-like.scss#L38)                                                | `.like__question`                          | `600 16px/1.4 var(--font-family-body)`    | 1440 | 600 16/22.4 Quicksand | 700 20/25.1 Mulish    | old styles/H3                     | **nein**   |
|     |                                                                                                                                  |                                            |                                           | 375  | 600 16/22.4 Quicksand | 600 18/22.5 Quicksand | Mob. H4                           | **nein**   |
| 12  | [recipe-like.scss:82](../../src/app/recipe-view/recipe-like/recipe-like.scss#L82)                                                | `.like__count`                             | `600 20px/1 var(--font-family-body)`      | —    | siehe Text            | siehe Text            | —                                 | siehe Text |
| 13  | [recipe-ingredients.scss:34](../../src/app/recipe-view/recipe-ingredients/recipe-ingredients.scss#L34)                           | `.ingredients__title`                      | `600 32px/1.25 var(--font-family-body)`   | 1440 | 600 32/40 Quicksand   | 600 32/40 Quicksand   | —                                 | ja         |
| 14  | [chef-badge.scss:14](../../src/app/recipe-view/chef-badge/chef-badge.scss#L14)                                                   | `.chef-badge`                              | `500 16px/1.4 var(--font-family-body)`    | 1440 | 500 16/22.4 Quicksand | 500 18/22.5 Quicksand | recipe generator/H6               | **nein**   |
|     |                                                                                                                                  |                                            |                                           | 375  | 500 16/22.4 Quicksand | 500 18/22.5 Quicksand | recipe generator/H6               | **nein**   |
| 15  | [recipe-view.scss:29](../../src/app/recipe-view/recipe-view.scss#L29)                                                            | `.recipe-view__back`                       | `500 16px/1.2 var(--font-family-body)`    | 1440 | 500 16/19.2 Quicksand | 500 14/10 Quicksand   | recipe generator/small text       | **nein**   |
| 16  | [recipe-view.scss:177](../../src/app/recipe-view/recipe-view.scss#L177)                                                          | `.recipe-view__missing-title`              | `600 28px/1.2 var(--font-family-body)`    | —    | siehe Text            | siehe Text            | —                                 | siehe Text |
| 17  | [recipe-directions.scss:31](../../src/app/recipe-view/recipe-directions/recipe-directions.scss#L31)                              | `.directions__title`                       | `600 32px/1.25 var(--font-family-body)`   | 1440 | 600 32/40 Quicksand   | 600 32/40 Quicksand   | —                                 | ja         |
| 18  | [recipe-step.scss:20](../../src/app/recipe-view/recipe-step/recipe-step.scss#L20)                                                | `.step__title`                             | `500 18px/1.3 var(--font-family-body)`    | 375  | 500 18/23.4 Quicksand | 600 18/22.5 Quicksand | Mob. H4                           | **nein**   |
| 19  | [recipe-step.scss:23](../../src/app/recipe-view/recipe-step/recipe-step.scss#L23)                                                | `.step__title`                             | `500 20px/1.3 var(--font-family-body)`    | 1440 | 500 20/26 Quicksand   | 500 24/30 Quicksand   | recipe generator/H5               | **nein**   |
| 20  | [recipe-step.scss:42](../../src/app/recipe-view/recipe-step/recipe-step.scss#L42)                                                | `.step__description`                       | `500 16px/1.5 var(--font-family-body)`    | 1440 | 500 16/24 Quicksand   | 500 18/22.5 Quicksand | recipe generator/p 18             | **nein**   |
|     |                                                                                                                                  |                                            |                                           | 375  | 500 16/24 Quicksand   | 500 16/20 Quicksand   | recipe generator/p 16             | ja         |
| 21  | [generation-loading.scss:75](../../src/app/generator/generation-loading/generation-loading.scss#L75)                             | `.loading__text`                           | `700 36px/1.149 var(--font-family-brand)` | 375  | 700 36/41.364 Ubuntu  | 700 36/41.36 Ubuntu   | —                                 | ja         |
| 22  | [generation-loading.scss:79](../../src/app/generator/generation-loading/generation-loading.scss#L79)                             | `.loading__text`                           | `700 48px/1.149 var(--font-family-brand)` | 1440 | 700 48/55.152 Ubuntu  | 700 48/55.15 Ubuntu   | —                                 | ja         |
| 23  | [generation-error-dialog.scss:37](../../src/app/generator/generation-error-dialog/generation-error-dialog.scss#L37)              | `.error-dialog__close`                     | `500 24px/1 var(--font-family-body)`      | —    | siehe Text            | siehe Text            | —                                 | siehe Text |
| 24  | [generation-error-dialog.scss:50](../../src/app/generator/generation-error-dialog/generation-error-dialog.scss#L50)              | `.error-dialog__title`                     | `500 28px/1.2 var(--font-family-body)`    | 1440 | 500 28/33.6 Quicksand | 600 28/35 Quicksand   | recipe generator/Card headlines   | **nein**   |
|     |                                                                                                                                  |                                            |                                           | 375  | 500 28/33.6 Quicksand | 600 28/35 Quicksand   | recipe generator/Card headlines   | **nein**   |
| 25  | [generator.scss:43](../../src/app/generator/generator.scss#L43)                                                                  | `.generator__back`                         | `500 16px/1.2 var(--font-family-body)`    | 1440 | 500 16/19.2 Quicksand | 500 14/10 Quicksand   | recipe generator/small text       | **nein**   |
| 26  | [generator.scss:74](../../src/app/generator/generator.scss#L74)                                                                  | `.generator__title`                        | `600 32px/1.1 var(--font-family-body)`    | 375  | 600 32/35.2 Quicksand | 600 24/30 Quicksand   | Mob. H3                           | **nein**   |
| 27  | [chip-group.scss:80](../../src/app/generator/preferences-step/chip-group/chip-group.scss#L80)                                    | `background 0.2s ease, .chip-group__label` | `500 16px/1.2 var(--font-family-body)`    | 1440 | 500 16/19.2 Quicksand | 500 20/20 Quicksand   | recipe generator/small H + Labels | **nein**   |
|     |                                                                                                                                  |                                            |                                           | 375  | 500 16/19.2 Quicksand | 500 20/20 Quicksand   | recipe generator/small H + Labels | **nein**   |
| 28  | [ingredient-form.scss:67](../../src/app/generator/ingredient-step/ingredient-form/ingredient-form.scss#L67)                      | `.ingredient-form__input`                  | `500 18px/44px var(--font-family-body)`   | —    | siehe Text            | siehe Text            | —                                 | siehe Text |
| 29  | [ingredient-form.scss:143](../../src/app/generator/ingredient-step/ingredient-form/ingredient-form.scss#L143)                    | `.ingredient-form__unit-select`            | `500 16px/44px var(--font-family-body)`   | 1440 | 400 16/44 Quicksand   | 500 16/20 Quicksand   | recipe generator/p 16             | **nein**   |
|     |                                                                                                                                  |                                            |                                           | 375  | 400 16/44 Quicksand   | 500 16/20 Quicksand   | recipe generator/p 16             | **nein**   |
| 30  | [ingredient-list.scss:43](../../src/app/generator/ingredient-step/ingredient-list/ingredient-list.scss#L43)                      | `.ingredient-list__item`                   | `500 16px/1.4 var(--font-family-body)`    | 375  | 500 16/22.4 Quicksand | 500 16/20 Quicksand   | recipe generator/p 16             | ja         |
| 31  | [ingredient-suggestions.scss:23](../../src/app/generator/ingredient-step/ingredient-suggestions/ingredient-suggestions.scss#L23) | `.suggestions__option`                     | `500 18px/28px var(--font-family-body)`   | —    | siehe Text            | siehe Text            | —                                 | siehe Text |
| 32  | [results.scss:51](../../src/app/results/results.scss#L51)                                                                        | `.results__title`                          | `600 32px/1.1 var(--font-family-body)`    | 375  | 600 32/35.2 Quicksand | 600 32/40 Quicksand   | Mob. H2                           | ja         |
| 33  | [recipe-card.scss:51](../../src/app/results/recipe-card/recipe-card.scss#L51)                                                    | `.recipe-card__title`                      | `600 32px/40px var(--font-family-body)`   | 1440 | 600 32/40 Quicksand   | 600 32/40 Quicksand   | —                                 | ja         |

### Die fünf Stellen ohne Zeile in der Tabelle

Der Hauptlauf erreicht sie nicht — Formularfelder tragen ihren Wert nicht als
Textknoten, die Vorschlagsliste war zu, der Fehlzustand trat nicht ein. Der
Ergänzungsdurchgang misst sie:

| #   | Stelle                                                                                                                           | Regel                         | Ist (Literal)   | Gemessen                 | Soll (Figma)                                                   | Gleich?                   |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | --------------- | ------------------------ | -------------------------------------------------------------- | ------------------------- |
| 12  | [recipe-like.scss:82](../../src/app/recipe-view/recipe-like/recipe-like.scss#L82)                                                | `.like__count`                | `600 20px/1`    | 600 20/20                | — kein Knoten; die Herz-CTA in Figma trägt keine Zahl          | app-only                  |
| 16  | [recipe-view.scss:177](../../src/app/recipe-view/recipe-view.scss#L177)                                                          | `.recipe-view__missing-title` | `600 28px/1.2`  | 600 28/33,6              | — Figma zeichnet keinen Fehlzustand                            | app-only                  |
| 23  | [generation-error-dialog.scss:37](../../src/app/generator/generation-error-dialog/generation-error-dialog.scss#L37)              | `.error-dialog__close`        | `500 24px/1`    | 500 24/24                | — Figma zeichnet kein Schließen-Kreuz                          | app-only                  |
| 28  | [ingredient-form.scss:67](../../src/app/generator/ingredient-step/ingredient-form/ingredient-form.scss#L67)                      | `.ingredient-form__input`     | `500 18px/44px` | 500 18/44 (beide Felder) | Namensfeld `p 16` = 500 16/20, Mengenfeld `p 18` = 500 18/22,5 | **nein**, Namensfeld +2px |
| 31  | [ingredient-suggestions.scss:23](../../src/app/generator/ingredient-step/ingredient-suggestions/ingredient-suggestions.scss#L23) | `.suggestions__option`        | `500 18px/28px` | 500 18/28                | `p 16` = 500 16/20 (`drop down options`)                       | **nein**, +2px            |

Stelle 28 ist doppelt belegt: eine Regel bedient Namens- und Mengenfeld, Figma
gibt den beiden verschiedene Größen. Das lässt sich nicht mit einem Wert lösen —
die Modifier `--name` und `--amount` brauchen eigene Größen.

### Wohin die 18 falschen Literale gehören

Literale sind nicht per se falsch — Zutatenliste, Zubereitungsschritte und der
Rezeptkartentitel tragen in Figma tatsächlich lose Werte ohne Stil. Entscheidend
ist, ob hinter dem gemessenen Soll ein Stil steht:

| Soll trägt einen Stil → bestehendes Token nutzen | Stellen                                                                                                                   |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `p 18` → `--font-body-18`                        | `.recipe-row__position`, `.recipe-row__chip`, `.step__description` (Desktop)                                              |
| `p 16` → `--font-body-16`                        | `.recipe-row__time`, `.ingredient-form__unit-select`, `.suggestions__option`                                              |
| `H5` → `--font-h5`                               | `.most-liked__name` (Desktop), `.step__title` (Desktop)                                                                   |
| `H6` → `--font-h6`                               | `.chef-badge`, `.most-liked__name` (Mobil)                                                                                |
| `Mob. H4` → `--font-mobile-h4`                   | `.recipe-row__title` (Mobil), `.step__title` (Mobil), `.like__question` (Mobil)                                           |
| `Mob. H3` (= `--font-h5-semi`)                   | `.generator__title` Schritt 2 (Mobil)                                                                                     |
| `small H + Labels` → `--font-small-label`        | `.chip-group__label`                                                                                                      |
| `Card headlines` → `--font-card-headline`        | `.error-dialog__title` (nur Gewicht: 500 → 600)                                                                           |
| `small text` → `--font-small-text`               | `.cookbook__back`, `.cuisine-page__back`, `.recipe-view__back`, `.generator__back` — **aber [ENTSCHEIDUNG]**, siehe unten |

| Soll trägt keinen Stil → Literal bleibt bewusst lose | Stellen                                          |
| ---------------------------------------------------- | ------------------------------------------------ |
| Nährwert-Beschriftungen 700 22/27,5                  | `.nutrition__table` (Desktop)                    |
| `old styles/H3` Mulish 700 20/25,1                   | `.like__question` (Desktop) — **[ENTSCHEIDUNG]** |

**Ein neues Token brauchen** nur die Nährwert-Beschriftungen (700 22px/27,5px);
sie kommen viermal auf einem Frame vor und haben in Figma keinen Stil. Alles
andere passt in den bestehenden Satz.

---

## Aufgabe 3 — die 97 Token-Verwender

Getrennt geprüft, wie verlangt. Das Ergebnis ist eindeutig und wiederholt das
Muster der letzten beiden Runden.

### 3a — Tokenwerte: 15 von 16 exakt richtig

Jeder Typo-Token wurde gegen den Figma-Stil gemessen, auf den er sich in
[_tokens.scss](../../src/styles/_tokens.scss) beruft:

| Token                  | Wert im Code        | ergibt        | Figma-Stil                          | gemessen                | Urteil                  |
| ---------------------- | ------------------- | ------------- | ----------------------------------- | ----------------------- | ----------------------- |
| `--font-h1`            | `700 104px/119.5px` | 700 104/119,5 | `recipe generator/H1`               | 700 104/119,5 Ubuntu    | **OK**                  |
| `--font-h2`            | `600 54px/65px`     | 600 54/65     | `recipe generator/H2`               | 600 54/65 Quicksand     | **OK**                  |
| `--font-h3`            | `600 48px/60px`     | 600 48/60     | `recipe generator/H3`               | 600 48/60 Quicksand     | **OK**                  |
| `--font-h4`            | `700 40px/1.04`     | 700 40/41,6   | `recipe generator/H4`               | 700 40/41,6 Quicksand   | **OK**                  |
| `--font-card-headline` | `600 28px/35px`     | 600 28/35     | `recipe generator/Card headlines`   | 600 28/35 Quicksand     | **OK**                  |
| `--font-h5`            | `500 24px/30px`     | 500 24/30     | `recipe generator/H5`               | 500 24/30 Quicksand     | **OK**                  |
| `--font-h5-semi`       | `600 24px/30px`     | 600 24/30     | `recipe generator/H5 SemiBold`      | 600 24/30 Quicksand     | **OK**                  |
| `--font-button`        | `600 24px/30px`     | 600 24/30     | `recipe generator/Button Text`      | 600 24/30 Quicksand     | **OK**                  |
| `--font-small-label`   | `500 20px/20px`     | 500 20/20     | `recipe generator/small H + Labels` | 500 20/20 Quicksand     | **OK**                  |
| `--font-h6`            | `500 18px/22.5px`   | 500 18/22,5   | `recipe generator/H6`               | 500 18/22,5 Quicksand   | **OK**                  |
| `--font-body-18`       | `500 18px/22.5px`   | 500 18/22,5   | `recipe generator/p 18`             | 500 18/22,5 Quicksand   | **OK**                  |
| `--font-body-16`       | `500 16px/20px`     | 500 16/20     | `recipe generator/p 16`             | 500 16/20 Quicksand     | **OK**                  |
| `--font-small-text`    | `500 14px/1`        | 500 14/14     | `recipe generator/small text`       | 500 14/**10** Quicksand | abweichend, **bewusst** |
| `--font-mobile-h1`     | `700 64px/72px`     | 700 64/72     | `Mob. H1`                           | 700 64/72 Ubuntu        | **OK**                  |
| `--font-mobile-h4`     | `600 18px/22.5px`   | 600 18/22,5   | `Mob. H4`                           | 600 18/22,5 Quicksand   | **OK**                  |
| `--font-mobile-button` | `600 16px/20px`     | 600 16/20     | `Mob. Button text`                  | 600 16/20 Quicksand     | **OK**                  |

Die eine Abweichung ist die bereits im Token dokumentierte: Figmas Zeilenhöhe
von 10px ist kleiner als die Glyphe und mit hoher Wahrscheinlichkeit ein
Quellfehler; der Code hält 1. **Kein Tokenwert ist zu ändern.**

### 3b — Token-Verwender: 24 von 97 falsch

```
97 Verwender eines --font-*-Tokens in src/
24 davon greifen zum falschen Token   (24,7 %)
73 davon greifen zum richtigen
```

| Token                | falsch / gesamt | falsche Verwender                                                                                                                                                                                                                                                                                                                        |
| -------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--font-body-16`     | **14 / 32**     | `.cookbook__generate`, `.error-dialog__action`, `.error-dialog__message`, `.hero__cross-sell-link`, `.most-liked__likes`, `.nutrition__energy`, `.nutrition__table`, `.pagination__button`, `.recipe-card__time`, `.recipe-view__regenerate-link`, `.results__filter`, `.results__regenerate`, `.summary__chip`, `.summary__cooks-label` |
| `--font-small-label` | **4 / 7**       | `.chip-group__legend`, `.ingredient-form__label`, `.ingredient-list__title`, `.stepper-field__legend`                                                                                                                                                                                                                                    |
| `--font-h5-semi`     | **2 / 13**      | `.hero__cross-sell-title`, `.recipe-row__title`                                                                                                                                                                                                                                                                                          |
| `--font-small-text`  | **2 / 6**       | `.like__hint`, `.step__order`                                                                                                                                                                                                                                                                                                            |
| `--font-h2`          | **1 / 3**       | `.generator__title`                                                                                                                                                                                                                                                                                                                      |
| `--font-h6`          | **1 / 1**       | `.stepper-field__unit`                                                                                                                                                                                                                                                                                                                   |

Die **38 übrigen Verwender dieser sechs Tokens stehen richtig** und dürfen beim
Fixen nicht mitgezogen werden. Zwei Regeln stehen in beiden Listen, weil sie
je Breakpoint ein anderes Token setzen: `.summary__cooks-label` ist mobil
falsch (`--font-body-16`) und auf Desktop richtig (`--font-small-label`),
`.recipe-row__title` mobil als Literal falsch und auf Desktop im Gewicht falsch.

- `--font-body-16` richtig bei: `body`, `.skip-link`, `.results__save-note`,
  `.recipe-view__cross-sell-text`, `.recipe-view__missing-text`, `.like__error`,
  `.ingredients__item`, `.ingredients__toggle`, `.directions__toggle`,
  `.nutrition__scope`, `.privacy__text`, `.most-liked__time`,
  `.most-liked__note`, `.cuisine-page__note`, `.imprint__text`,
  `.imprint__note`, `.ingredient-form__error`, `.error-dialog__hint`
- `--font-small-label` richtig bei: `.summary__time` (Desktop),
  `.summary__cooks-label` (Desktop), `.stepper-field__value`
- `--font-h5-semi` richtig bei elf weiteren Stellen, u. a.
  `.most-liked__title`, `.ingredients__subtitle`, `.directions__title`,
  `.hero__eyebrow`
- `--font-small-text` richtig bei: `.pagination__gap`, `.chip-group__hint`,
  `.footer`, `.nutrition__table thead th`
- `--font-h2` richtig bei zwei weiteren Stellen
  (`.results__title`, `.summary__title`, jeweils Desktop)

### Fazit zu Aufgabe 3

**Kein einziger Tokenwert ist falsch. 24 Verwender sind es.** Das ist exakt das
Muster aus der Abschlussrunde (12 von 14 Verwendern falsch, kein Token) und aus
der Mini-Runde (dreimal Verwender, kein Token). Der Fixlauf darf
`_tokens.scss` bis auf **eine Ergänzung** (Nährwert-Beschriftungen, siehe
Aufgabe 2) nicht anfassen.

---

## Aufgabe 4 — Radius der Eingabefelder

**Thomas' Erinnerung stimmt. Die Felder sind in Figma rund.**

### Der Messweg

In `.figma-cache/` wurde der Knoten gesucht, der die Füllung `#FAF0E6` bei 80 %
trägt — genau die Beschreibung aus dem Auftrag. Es gibt ihn genau einmal:

```
Frame  "Frame 730"   300 × 36   fill #FAF0E6 @ 0.80   cornerRadius 20
Pfad:  Generate recipe / Imput ingredient component / Ingredient / Imput field / Frame 730
```

Sein Elternknoten `Imput field` (die COMPONENT-Variante) hat **keinen** Radius,
ebenso wenig der Rahmen `Ingredient` darüber, der Label und Feld stapelt.

**Damit ist spec.md 4.6 derselbe Fehler wie 4.9:** gelesen wurde die äußere
Auto-Layout-Ebene, nicht das sichtbare Element. Die Formulierung „Layout
vertical, gap 10, no padding" beschreibt genau diesen Wrapper.

Ein methodischer Hinweis für künftige Messungen: **die Figma-REST-API schreibt
`cornerRadius` nur, wenn er ungleich 0 ist.** In der ganzen Datei gibt es
712 Knoten mit `cornerRadius > 0` und **keinen einzigen** mit `cornerRadius: 0`;
die übrigen 4067 Knoten haben die Eigenschaft gar nicht. Fehlt sie, ist der
Radius 0 — nicht „unbekannt".

Zweiter Hinweis: **46 der 47 COMPONENT_SET-Rahmen tragen `cornerRadius: 5`.**
Das ist der gestrichelte Container um die Variantenmatrix, kein Designwert.
Wer ihn statt der Variante darin liest, misst an fast jeder Komponente der
Bibliothek 5px — auch an denen, die in Wahrheit eckig sind. Gemessen wurde
deshalb durchgehend die COMPONENT-Variante, nicht das Set.

### Alle zwölf Stellen aus 905a419, einzeln gemessen

| #   | Codestelle                                                                                                  | Element                           | Figma-Knoten                                           | Figma-Radius | Code | Urteil      |
| --- | ----------------------------------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------ | ------------ | ---- | ----------- |
| 1   | [ingredient-form.scss:63](../../src/app/generator/ingredient-step/ingredient-form/ingredient-form.scss#L63) | `.ingredient-form__input` (Name)  | `Imput field / Frame 730`                              | **20**       | 0    | **falsch**  |
| 1b  | dieselbe Regel                                                                                              | `.ingredient-form__input` (Menge) | `Serving size / quantity / number`                     | **48**       | 0    | **falsch**  |
| 2   | [ingredient-step.scss:39](../../src/app/generator/ingredient-step/ingredient-step.scss#L39)                 | `.ingredient-step__next`          | `Primary botton green` / `Mob. Primary botton green`   | 0            | 0    | **richtig** |
| 3   | [preferences-step.scss:57](../../src/app/generator/preferences-step/preferences-step.scss#L57)              | `.preferences-step__submit`       | `Primary botton green`                                 | 0            | 0    | **richtig** |
| 4   | [home.scss:88](../../src/app/home/home.scss#L88)                                                            | `.hero__cta`                      | `Primary Button creme` / `Mobile primary button creme` | 0            | 0    | **richtig** |
| 5   | [cuisine-filter.scss:29](../../src/app/library/cuisine-filter/cuisine-filter.scss#L29)                      | `.cuisine-filter__tile`           | `Recipe card (in cook book)`, Variante                 | 0            | 0    | **richtig** |
| 6   | [cuisine-filter.scss:57](../../src/app/library/cuisine-filter/cuisine-filter.scss#L57)                      | `.cuisine-filter__image`          | `Recipe card (in cook book) / card`                    | 0            | 0    | **richtig** |
| 7   | [cuisine-recipes.scss:116](../../src/app/library/cuisine-recipes/cuisine-recipes.scss#L116)                 | `.cuisine-page__button`           | `Primary botton green`                                 | 0            | 0    | **richtig** |
| 8   | [cuisine-recipes.scss:156](../../src/app/library/cuisine-recipes/cuisine-recipes.scss#L156)                 | `.cuisine-page__generate`         | `Primary botton green`                                 | 0            | 0    | **richtig** |
| 9   | [most-liked-row.scss:141](../../src/app/library/most-liked-row/most-liked-row.scss#L141)                    | `.most-liked__button`             | `Primary botton green`                                 | 0            | 0    | **richtig** |
| 10  | [recipe-row.scss:16](../../src/app/library/recipe-row/recipe-row.scss#L16)                                  | `.recipe-row`                     | `Recipe in cook book` / `Recipe in Cookbook Mob.`      | **16**       | 0    | **falsch**  |
| 11  | [recipe-view.scss:112](../../src/app/recipe-view/recipe-view.scss#L112)                                     | `.recipe-view__cross-sell-link`   | `Primary botton green`                                 | 0            | 0    | **richtig** |
| 12  | [recipe-card.scss:72](../../src/app/results/recipe-card/recipe-card.scss#L72)                               | `.recipe-card__link`              | `Primary Button creme`                                 | 0            | 0    | **richtig** |

**Ergebnis: 9 von 12 Stellen sind richtig, 3 sind falsch.** Commit 905a419 war
also überwiegend korrekt — die Primärbuttons und die Küchenkacheln sind in
Figma wirklich eckig. Nur das Eingabefeld und die Rezeptzeile hat er
mitgerissen.

### Reichen die bestehenden Radius-Tokens?

| Gebrauchter Wert                 | Token vorhanden?                                                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 20 (Namensfeld)                  | ja — `--radius-20`                                                                                            |
| 48 (Mengenfeld, Einheitenwähler) | **nein** — 48 > Höhe 36, das ist eine Pille; `--radius-full` (999px) bildet dasselbe ab und existiert bereits |
| 16 (Rezeptzeile)                 | ja — `--radius-16`                                                                                            |

**Kein neues Radius-Token nötig.** Für das Mengenfeld ist `--radius-full`
sachlich richtiger als ein neues `--radius-48`, weil der Wert die Höhe
übersteigt und Figma damit nichts anderes meint als „ganz rund".

Nebenbefund am Rand: der Einheitenwähler steht im Code auf `--radius-16`
([ingredient-form.scss:138](../../src/app/generator/ingredient-step/ingredient-form/ingredient-form.scss#L138)),
Figma zeichnet ihn als Pille (48). Er gehört in denselben Fix.

---

## Aufgabe 5 — Linkfarbe

**Bestätigt. `#396039` ist richtig, Label und Pfeil stimmen überein.**

### Messung

| Knoten                      | Frame                                                                        | Füllung                 |
| --------------------------- | ---------------------------------------------------------------------------- | ----------------------- |
| Text „Generate new recipie" | `Cookbook / Whole content / Secondary button green` (Desktop)                | **#396039**             |
| `Arrow 18` daneben          | derselbe Button                                                              | Kontur **#396039**, 2px |
| Text „Generate new recipie" | `One recipe view - one cook / Frame 1034 / Secondary button green` (Desktop) | **#396039**             |
| `Arrow 18` daneben          | derselbe Button                                                              | Kontur **#396039**, 2px |
| Text „Generate new recipe"  | `Cookbook / Secondary Button green Mob.` (Mobil)                             | **#396039**             |
| `Arrow 18` daneben          | derselbe Button                                                              | Kontur **#396039**, 2px |

Label und Pfeil tragen dieselbe Farbe — der Umbau auf `currentcolor` aus
`b3a290c` zieht den Pfeil also korrekt mit, ohne dass am Pfeil etwas zu tun ist.

Im Code stehen beide Regeln auf `var(--color-green-dark)` = `#103108`:
[library.scss:124](../../src/app/library/library.scss#L124) und
[recipe-view.scss:146](../../src/app/recipe-view/recipe-view.scss#L146).

### Gibt es weitere Links mit demselben Muster?

**Nein.** Alle übrigen Cross-Sell-Links wurden mitgemessen und stimmen bereits:

| Link                                                                                  | Code                           | Figma   |     |
| ------------------------------------------------------------------------------------- | ------------------------------ | ------- | --- |
| `.hero__cross-sell-link`                                                              | `--color-cream` #FAF0E6        | #FAF0E6 | OK  |
| `.recipe-view__cross-sell-link`                                                       | `--color-cream` #FAF0E6        | #FAF0E6 | OK  |
| `.results__regenerate`                                                                | geerbt #FAF0E6                 | #FAF0E6 | OK  |
| `.cuisine-page__generate`                                                             | `--color-cream` #FAF0E6        | #FAF0E6 | OK  |
| `.cookbook__back` / `.cuisine-page__back` / `.recipe-view__back` / `.generator__back` | `--color-green-middle` #1E5515 | #1E5515 | OK  |

Der Unterschied ist systematisch: die creme-Variante des Secondary Button steht
auf grünem Grund, die grüne Variante auf hellem. Betroffen sind ausschließlich
die beiden grünen — also genau die zwei genannten Regeln.

### Kontrast

Die Vorabrechnung stimmt exakt:

| Kombination               | Kontrast  | AA (4,5) | AAA (7)  |
| ------------------------- | --------- | -------- | -------- |
| #103108 auf Creme #FAF0E6 | 12,75 : 1 | ja       | ja       |
| #396039 auf Creme #FAF0E6 | 6,42 : 1  | ja       | **nein** |
| #396039 auf Weiß #FFFFFF  | 7,23 : 1  | ja       | ja       |
| #103108 auf Weiß #FFFFFF  | 14,34 : 1 | ja       | ja       |

**Der tatsächliche Hintergrund ist aber Weiß, nicht Creme.** Nachgemessen im
Browser an beiden Stellen und in beiden Viewports: der nächste Vorfahre mit
Füllung ist `rgb(255, 255, 255)` — die Kochbuchseite und die Rezeptansicht
liegen auf `--color-surface`, nicht auf dem Cremeton.

Damit landet der Fix bei **7,23 : 1** und besteht auch AAA. Die Sorge aus dem
Auftrag („AAA verfehlt #396039 auf Creme knapp") trifft hier nicht zu.

### Der Fix

Tausch von `var(--color-green-dark)` auf `var(--color-olive-green)` an genau
zwei Stellen. **Der Tokenwert wird nicht angefasst** — `--color-green-dark` ist
die globale Textfarbe mit 56 Verwendungen in `src/`, `--color-olive-green`
existiert bereits mit 25.

---

## Nebenbefund — `--color-green-dark` ist um zwei Ziffern verdreht

Beim Farbabgleich aufgefallen, nicht Teil der Aufgabenstellung, aber es gehört
in den Bericht:

```
Figma-Stil  "Rezepten/Green dark"  →  rgb(0.062745102, 0.192156866, 0.043137256)
                                   →  #10310B          (880 Knoten tragen ihn)
Code        --color-green-dark     →  #103108
```

Die letzten beiden Ziffern sind vertauscht: `0B` (11) gegen `08` (8). Der
Unterschied ist mit bloßem Auge nicht zu sehen (Kontrast 12,73 statt 12,75 auf
Creme) und **hat keine Priorität** — aber wenn „pixelgenau aus Figma" das
Kriterium ist, ist der Wert falsch. Eine Zeile in `_tokens.scss`, 56
Verwendungen, von denen keine angefasst werden muss.

Die übrigen vier Farb-Token wurden gegengemessen und stimmen exakt:
`--color-olive-green` #396039, `--color-green-middle` #1E5515, `--color-cream`
#FAF0E6, sowie die bekannte Namensfalle `Rezepten/#1E5515` → #008000.

---

## Priorisierte Fixliste

**42 Deklarationen in 20 Dateien.** Vorschlag für die Aufteilung in Commits, so
geschnitten, dass jeder Commit für sich prüfbar ist und keiner zwei Themen
mischt.

### Commit 1 — `fix: put the input fields back on their Figma radius`

Der einzige Fund mit sichtbarer Regression seit `905a419`. Zuerst, weil er
unabhängig von der Typografie ist.

| Datei                                                                                                         | Änderung                                                                              |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [ingredient-form.scss:63](../../src/app/generator/ingredient-step/ingredient-form/ingredient-form.scss#L63)   | Regel je Modifier trennen: `--name` auf `--radius-20`, `--amount` auf `--radius-full` |
| [ingredient-form.scss:138](../../src/app/generator/ingredient-step/ingredient-form/ingredient-form.scss#L138) | `.ingredient-form__unit-select` von `--radius-16` auf `--radius-full`                 |
| [recipe-row.scss:16](../../src/app/library/recipe-row/recipe-row.scss#L16)                                    | `--radius-0` → `--radius-16`                                                          |

Die neun übrigen `--radius-0`-Stellen bleiben unangetastet — sie sind belegt
richtig.

### Commit 2 — `fix: swap the two green links to olive`

| Datei                                                                   | Änderung                                     |
| ----------------------------------------------------------------------- | -------------------------------------------- |
| [library.scss:124](../../src/app/library/library.scss#L124)             | `--color-green-dark` → `--color-olive-green` |
| [recipe-view.scss:146](../../src/app/recipe-view/recipe-view.scss#L146) | `--color-green-dark` → `--color-olive-green` |

Braucht Thomas' Bestätigung (siehe unten), ist aber gemessen und belegt.

### Commit 3 — `fix: size the generator step 2 heading like Figma`

Größter Einzelfund der ganzen Runde: **+26px auf Desktop, +8px auf Mobil.**

| Datei                                                                                                               | Änderung                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| [generator.scss:74](../../src/app/generator/generator.scss#L74) / [:79](../../src/app/generator/generator.scss#L79) | Schritt 1 behält H2 / Mob. H2; Schritt 2 bekommt über `.generator__title--solo` `--font-card-headline` (Desktop) und `--font-h5-semi` (Mobil) |

Der Modifier für Schritt 2 existiert bereits, er setzt bisher nur den Abstand.

### Commit 4 — `fix: put the 20px labels back on their token`

Neun Regeln, alle derselbe Fehler: `--font-body-16` statt `--font-small-label`
auf Desktop; Figma sagt `small H + Labels` = 20px.

`.cookbook__generate`, `.recipe-view__regenerate-link`, `.results__regenerate`,
`.error-dialog__action`, `.hero__cross-sell-link`, `.recipe-card__time`,
`.summary__cooks-label`, `.nutrition__energy`, `.nutrition__table`

Achtung: mobil gilt für dieselben Regeln `H6`/`Mob. H4` (18px), nicht 20px —
die Regeln brauchen also einen Desktop-Zweig, keinen einzelnen Tausch.

### Commit 5 — `fix: size the cookbook list like Figma`

Die Rezeptzeile der Küchenseite, fünf Literale in einer Datei:

`.recipe-row__position` (14 → 18, Gewicht 600 → 500), `.recipe-row__time`
(14 → 16), `.recipe-row__chip` (14 → 18), `.recipe-row__title` (mobil 20 → 18;
Desktop Gewicht 600 → 500), dazu `.most-liked__name` (Desktop 20 → 24 mit
Gewicht 500, mobil 20 → 18) und `.pagination__button` (16 → 18).

### Commit 6 — `fix: size the recipe view like Figma`

`.step__order`, `.step__title`, `.step__description`, `.chef-badge`,
`.summary__chip`, `.like__question`, `.like__hint`, `.nutrition__table`
(Beschriftungen, neues Token 700 22px/27,5px).

`.like__hint` ist zusätzlich ein Lastenheft-Verstoß: „Give it a heart, so that
the others know this is delicious." ist Fließtext und steht auf 14px.

### Commit 7 — `fix: size the generator form like Figma`

`.chip-group__label`, `.chip-group__legend`, `.stepper-field__legend`,
`.stepper-field__unit`, `.ingredient-form__label`, `.ingredient-list__title`,
`.ingredient-form__input` (Namensfeld 18 → 16), `.suggestions__option`
(18 → 16), `.ingredient-form__unit-select` (Gewicht).

### Commit 8 — `fix: size the hero cross-sell and the error dialog like Figma`

`.hero__cross-sell-title` (Quicksand 600 24 → Ubuntu 500 32 auf Desktop,
Ubuntu 500 24 auf Mobil — Familienwechsel, deshalb getrennt),
`.error-dialog__title` (Gewicht 500 → 600), `.error-dialog__message`
(16 → 18, Gewicht 600, Zeilenhöhe 26).

### Commit 9 (optional) — `fix: correct the dark green token`

Eine Zeile: `--color-green-dark: #103108` → `#10310B`.

---

## Was eine Entscheidung von Thomas braucht

### E1 — Die vier Back-Links: 16px behalten oder auf Figmas 14px?

`.cookbook__back`, `.cuisine-page__back`, `.recipe-view__back`,
`.generator__back` stehen auf `500 16px/1.2`. Figma sagt `small text` =
**500 14px/10px**.

Zwei Gründe, es nicht blind zu übernehmen:

1. Die Zeilenhöhe 10px ist kleiner als die Glyphe — derselbe Quellfehler, der
   schon bei `--font-small-text` bewusst auf 1 korrigiert wurde.
2. 14px ist nach der Projektregel nur für Kleingedrucktes (Footer, Meta)
   erlaubt. Ein Back-Link ist Navigation; ob er als Meta durchgeht, ist eine
   Auslegungsfrage.

**Vorschlag:** auf `--font-small-text` (14px, Zeilenhöhe 1) umstellen und die
Größe damit an Figma angleichen, die kaputte Zeilenhöhe aber weiter ignorieren.
**Alternative:** bei 16px bleiben und im Bericht als bewusste Abweichung führen.

### E2 — Die Mulish-Altstile

Vier Fundstellen berufen sich auf Stile aus der Gruppe `old styles`, die in
Mulish gesetzt sind — einer Schrift, die die App gar nicht lädt:

| Stelle                                                                        | Figma                                   | Code                             |
| ----------------------------------------------------------------------------- | --------------------------------------- | -------------------------------- |
| `.like__question` (Desktop)                                                   | `old styles/H3` Mulish 700 20/25,1      | Quicksand 600 16/22,4            |
| `.like__hint` (Desktop)                                                       | `old styles/Body` Mulish 400 16/20,08   | Quicksand 500 14/19,6            |
| `.most-liked__likes`, `.recipe-row__chip` (Zähler), `.summary__chip` (Zähler) | `old styles/button` Mulish 500 16/20,08 | Quicksand 500 16/20 bzw. 14/19,6 |
| `.error-dialog__message` (Mobil)                                              | `old styles/Body` Mulish 400 16/20,08   | Quicksand 500 16/20              |

Auf den Mobil-Frames tragen dieselben Elemente reguläre Stile (`Mob. H4`,
`p 16`). Die `old styles`-Gruppe ist also mit hoher Wahrscheinlichkeit ein
Überbleibsel aus einem Vorgängerprojekt („Quizzy"-Stile liegen ebenfalls in der
Datei).

**Vorschlag:** Familie bleibt Quicksand, nur die Größe wird übernommen
(`.like__question` → 20px, `.like__hint` → 16px, Zähler → 16px). **Alternative:**
die Desktop-Werte dieser drei Elemente als „Figma veraltet" unangetastet lassen.

### E3 — Neues Token für die Nährwert-Beschriftungen?

Figma setzt „Energie / Protein / Fat / Carbs" auf Desktop mit **700 22px/27,5px**
ohne Stil. Der Code hat dafür kein Token und nutzt `--font-body-16`.

**Vorschlag:** `--font-nutrition-label: 700 22px/27.5px` anlegen — vier
Verwender auf einem Frame rechtfertigen ein Token. **Alternative:** als Literal
in `nutrition-table.scss` lassen, wie es Figma auch tut.

Direkt daneben ein Widerspruch **in Figma selbst**: die vier Wertzellen sind
dreimal `small H + Labels` (500 20/20), aber einmal — ausgerechnet „24g" bei
Fat — **500 22/20** ohne Stil. Das ist im Design inkonsistent. **Vorschlag:**
alle vier auf `--font-small-label` (20px), den Ausreißer als Designfehler
behandeln.

### E4 — Reihenfolge und Umfang des Fixlaufs

Neun Commits sind viel für eine Runde. **Vorschlag:** Commits 1–3 zuerst
(Regression, bestätigter Farbfehler, größter Einzelfund), dann 4–8 als
Typo-Block, Commit 9 nur wenn „pixelgenau" wörtlich gemeint ist.

---

## Zahlen zum Schluss

| Kategorie          | Deklarationen × Viewport |
| ------------------ | ------------------------ |
| **[KLAR]**         | 65                       |
| **[ENTSCHEIDUNG]** | 10                       |
| **[OK]**           | 73                       |
| **Summe**          | **148**                  |

Dahinter stehen 925 einzelne Messungen. Im Quelltext betroffen: **42
Deklarationen weichen ab**, 59 stimmen an jeder Stelle, an der sie gemessen
wurden.

Aufgeschlüsselt nach Ursache:

| Ursache                  | Anzahl                   |
| ------------------------ | ------------------------ |
| falscher Literalwert     | 18 von 33 Literalstellen |
| falscher Token-Verwender | 24 von 97 Verwendern     |
| falscher Tokenwert       | **0 von 16 Tokens**      |
