# Code-a-Cuisine — Projekt-Anweisungen

Rezept-Generator als DA-Projekt: Nutzer gibt Zutaten/Präferenzen an, ein n8n-Workflow erzeugt daraus ein Rezept und liefert es als JSON an das Angular-Frontend zurück. Bestätigte Rezepte werden in einer Firebase-Bibliothek gespeichert und können später wieder aufgerufen werden.

## Stack

- **Frontend:** Angular 21 (Standalone Components, Signals), SCSS
- **Rezept-Bibliothek:** Firebase
- **Rezept-Generierung:** n8n-Workflow via HTTP-Webhook, lokal in Docker unter `http://localhost:5678`

## n8n-Webhook

- Webhook-URL **niemals hartcodieren**, sondern aus `environment.ts` beziehen
  - `environment.ts` (dev): `http://localhost:5678/webhook/...`
  - `environment.prod.ts`: Platzhalter, bis Prod-URL feststeht
- Aufrufe kapseln in einem dedizierten Service (`providedIn: 'root'`), keine `HttpClient`-Calls direkt aus Components

## JSON-Verträge Angular ↔ n8n

- **Einzige Quelle der Wahrheit** für Request-/Response-Shapes: TypeScript-Interfaces in `src/app/models/`
- Interfaces werden in Phase 2 definiert; bis dahin keine Ad-hoc-Typen in Services/Components
- Änderungen am n8n-Workflow und am Frontend-Interface immer synchron halten

## Quota-Regel

- Kostenairbag (Rate-Limit / Tages-Budget für LLM-Calls) läuft **ausschließlich serverseitig in n8n**
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
