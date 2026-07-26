# Code à Cuisine

Rezept-Generator als Projekt der Developer Akademie. Man gibt an, was noch im Kühlschrank liegt und
wie gekocht werden soll — ein n8n-Workflow lässt daraus von einem LLM drei Rezepte erzeugen und
liefert sie als JSON an das Angular-Frontend zurück. Rezepte, die gefallen, wandern in eine
gemeinsame Firestore-Bibliothek („Cookbook") und können dort wiedergefunden und geliked werden.

| Bereich            | Technik                                           | Läuft wo                       |
| ------------------ | ------------------------------------------------- | ------------------------------ |
| Frontend           | Angular 21 (Standalone Components, Signals), SCSS | lokal, `http://localhost:4200` |
| Rezept-Generierung | n8n-Workflow in Docker → Google Gemini API        | lokal, `http://localhost:5678` |
| Bibliothek         | Firebase Firestore (Collection `recipes`)         | extern                         |

Die beiden Pfade kreuzen sich nie im Backend: n8n schreibt **nicht** nach Firestore, das Frontend
spricht Firestore direkt an. Details in [docs/architektur.md](docs/architektur.md).

---

## Setup

Voraussetzungen: Node `^20.19` / `^22.12` / `>=24` (Angular 21), npm, Docker (nur für echte
Generierung).

```bash
npm install
npm start          # http://localhost:4200
```

### Firebase-Config

Die Web-Config liegt in `src/environments/firebase.config.ts` und ist **nicht** versioniert. Die
npm-Skripte `start`, `build`, `watch` und `lint` legen die Datei über den Pre-Hook
[`scripts/ensure-firebase-config.mjs`](scripts/ensure-firebase-config.mjs) automatisch aus der
Vorlage [`firebase.config.example.ts`](src/environments/firebase.config.example.ts) an. Ein frischer
Clone kompiliert damit sofort.

Solange die `TODO-…`-Platzhalter drinstehen, läuft die App normal — nur das Cookbook zeigt seinen
Fehlerzustand. Für eine funktionierende Bibliothek die sechs Werte aus der Firebase-Console
eintragen, siehe [docs/firebase.md](docs/firebase.md).

### n8n starten

Der Workflow liegt versioniert unter [`n8n/`](n8n/) und wird in einen lokalen n8n-Container
importiert. Der Container kommt aus der `docker-compose.yml` unter `~/n8n`:

```bash
cd ~/n8n && docker compose up -d     # danach: http://localhost:5678
```

Import, Workflow-Aktivierung und das Eintragen des Google-API-Keys sind Schritt für Schritt in
[`n8n/README.md`](n8n/README.md) beschrieben. Der Webhook hört danach auf
`http://localhost:5678/webhook/generate-recipe`; das Frontend bezieht die URL ausschließlich aus
`environment.recipeWebhookUrl`, nie hartcodiert.

Den JSON-Vertrag zwischen Frontend und Workflow beschreibt
[docs/n8n-webhook.md](docs/n8n-webhook.md); die TypeScript-Interfaces in
[`src/app/models/`](src/app/models/) sind dafür die einzige Quelle der Wahrheit.

### Mock-Schalter — ohne n8n arbeiten

Jede echte Generierung kostet API-Credits und zählt gegen die Quota. Zum Arbeiten an den
Ergebnis-Screens gibt es deshalb einen Schalter in `src/environments/environment.ts`:

```ts
useMockWebhook: true,   // liefert die Fixtures aus src/app/services/recipe-mock.data.ts
```

Der Mock antwortet mit vier Sekunden Verzögerung, damit der Ladezustand testbar bleibt. Im Repo
steht der Schalter immer auf `false` — nach dem Entwickeln zurückstellen.

### Testdaten für das Cookbook

```bash
npm run seed                    # schreibt 30 Rezepte nach Firestore
npm run seed -- --count 8       # nur 8 Rezepte
npm run seed -- --dry-run       # zeigt nur an, schreibt nichts
```

Das Skript braucht eine ausgefüllte `firebase.config.ts` und schreibt über dieselben
Security-Rules wie die App.

---

## npm-Skripte

| Befehl          | Zweck                                 |
| --------------- | ------------------------------------- |
| `npm start`     | Dev-Server auf Port 4200              |
| `npm run build` | Produktionsbuild nach `dist/`         |
| `npm run watch` | Build im Watch-Modus                  |
| `npm run lint`  | ESLint inkl. Angular-Template-Regeln  |
| `npm run seed`  | Firestore mit Beispielrezepten füllen |

---

## Projektstruktur

```
src/app/
  generator/     Wizard: Zutaten-Schritt, Präferenzen-Schritt, Ladezustand, Fehlerdialog
  results/       Ergebnisliste der drei Vorschläge
  recipe-view/   Rezeptansicht — für Vorschläge und für gespeicherte Rezepte
  library/       Cookbook: Kachel-Filter, Kartenliste, „Most liked"-Reihe
  models/        JSON-Verträge (Request, Response, Recipe) + Firestore-Schema
  services/      n8n-Webhook, Generierungs-Zustand, Firestore-Zugriff, Mock-Daten
n8n/             Workflow-JSONs, Code-Nodes und Build-Skript
docs/            Architektur, Webhook-Vertrag, Firebase, Design-Mockups
scripts/         Setup- und Seed-Skripte
```

---

## Quota

Das Kostenlimit (3 Rezepte pro IP und Tag, 12 systemweit) läuft **ausschließlich serverseitig im
n8n-Workflow**. Das Frontend zeigt den Zustand nur an und prüft nichts selbst — es gibt bewusst
keinen Client-Zähler, der sich umgehen ließe.

---

## Weiterführende Dokumentation

- [docs/architektur.md](docs/architektur.md) — Gesamtarchitektur, Workflow Node für Node, Happy Path
- [docs/n8n-webhook.md](docs/n8n-webhook.md) — JSON-Vertrag, Fehlercodes, CORS
- [docs/firebase.md](docs/firebase.md) — Firestore-Einrichtung, Security-Rules, Indexe
- [docs/loading-animation.md](docs/loading-animation.md) — Herkunft und Neuerzeugung der Ladeanimation
- [n8n/README.md](n8n/README.md) — Workflow importieren, aktivieren, API-Key eintragen
- [CLAUDE.md](CLAUDE.md) — Projekt-Anweisungen und Konventionen

## Offene Punkte vor einem Deployment

- `environment.prod.ts`: Platzhalter-URL durch die öffentliche n8n-Webhook-URL ersetzen
- n8n-Webhook-Node: Prod-Origin in `ALLOWED_ORIGINS` ergänzen (CORS)
- Google-Cloud-Console: HTTP-Referrer-Beschränkung für den Firebase-Browser-Key setzen
- `src/app/imprint/imprint.html`: Platzhalter im Impressum durch echte Angaben ersetzen
