# Code-a-Cuisine — Projekt-Anweisungen

Rezept-Generator als DA-Projekt: Nutzer gibt Zutaten/Präferenzen an, ein n8n-Workflow lässt daraus von einem LLM drei Rezepte erzeugen und liefert sie als JSON an das Angular-Frontend zurück. Alle drei Vorschläge landen automatisch in einer Firebase-Bibliothek und können später wieder aufgerufen und geliked werden.

## Stack

- **Frontend:** Angular 21 (Standalone Components, Signals), SCSS
- **Rezept-Bibliothek:** Firebase Firestore (Collection `recipes`)
- **Rezept-Generierung:** n8n-Workflow via HTTP-Webhook, lokal in Docker unter `http://localhost:5678`
- **LLM:** Google Gemini (`gemini-3.5-flash`), ausschließlich aus n8n gerufen

## n8n-Webhook

- Webhook-URL **niemals hartcodieren**, sondern aus `environment.ts` beziehen
  - `environment.ts` (dev): `http://localhost:5678/webhook/...`
  - `environment.prod.ts`: Platzhalter, bis Prod-URL feststeht
- Aufrufe kapseln in einem dedizierten Service (`providedIn: 'root'`), keine `HttpClient`-Calls direkt aus Components

## JSON-Verträge Angular ↔ n8n

- **Einzige Quelle der Wahrheit** für Request-/Response-Shapes: TypeScript-Interfaces in `src/app/models/`
- Keine Ad-hoc-Typen in Services/Components — immer die Interfaces verwenden
- Änderungen am n8n-Workflow und am Frontend-Interface immer synchron halten
- Vertrag im Detail: [docs/n8n-webhook.md](docs/n8n-webhook.md)

## Firestore-Regel

- n8n schreibt **nicht** nach Firestore; der Write liegt im Frontend und geht durch `firestore.rules`
- Nach jeder erfolgreichen Generierung speichert `RecipeGenerationService.applyResponse()` **alle drei** Vorschläge über `RecipeLibraryService.saveRecipe()` — genau einmal pro Lauf, ohne Bestätigungs-Button
- Schlägt ein Write fehl, bleiben die Ergebnisse sichtbar; nur das Like-Herz bleibt deaktiviert

## Quota-Regel

- Kostenairbag (3 Rezepte pro IP und Tag, 12 systemweit) läuft **ausschließlich serverseitig in n8n**
- Frontend **zeigt** Quota-Status nur an (z. B. „Kontingent aufgebraucht"), **prüft** nichts selbst
- Keine Client-seitige Umgehung, keine LocalStorage-Zähler als Ersatz

## Anforderungen aus dem Lastenheft

- **JSDoc** für alle Funktionen (Englisch, siehe globale Regeln)
- **Schriftgrößen:** Fließtext min. 16px, Kleingedrucktes (Footer, Meta) 14px
- **Semantisches HTML:** `<header>`, `<main>`, `<nav>`, `<section>`, `<article>`, `<footer>` statt Div-Suppe

## Komponenten-Schnitt

- Formulare (z. B. Rezept-Wunsch-Formular) in kleine Sub-Components aufteilen
- Damit die globalen Limits eingehalten werden: **14 Zeilen pro Funktion**, **100 Zeilen pro Template**
- Ein Formular = ein Container-Component + fachlich getrennte Feld-Gruppen als Sub-Components

## Wo was steht

Mehrschritt-Anleitungen gehören in `docs/`, nicht hierher:

- [README.md](README.md) — Setup, npm-Skripte, Projektstruktur
- [docs/architektur.md](docs/architektur.md) — Gesamtarchitektur, Workflow Node für Node, Happy Path
- [docs/n8n-webhook.md](docs/n8n-webhook.md) — JSON-Vertrag, Fehlercodes, CORS
- [docs/firebase.md](docs/firebase.md) — Firestore einrichten, Rules, Indexe, Seed-Daten
- [n8n/README.md](n8n/README.md) — Workflows bauen und importieren, Credentials, Entscheidungen
