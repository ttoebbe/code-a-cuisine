# Installation

Der komplette Weg von `git clone` bis zur laufenden App.

Voraussetzungen: Node `^20.19` / `^22.12` / `>=24` (Angular 21), npm, Docker (nur für die echte
Rezept-Generierung), ein Firebase-Projekt.

## 1. Abhängigkeiten installieren

```bash
git clone <repository-url>
cd code-a-cuisine
npm install
```

## 2. Firebase-Config anlegen

Die Web-Config ist nicht versioniert und muss auf jedem Rechner lokal angelegt werden — ohne sie
kompiliert die App nicht:

```bash
cp src/environments/firebase.config.example.ts src/environments/firebase.config.ts
```

Danach die sechs Werte aus der Firebase-Console eintragen (**Projekt-Einstellungen → Deine Apps →
Web-App → SDK-Konfiguration → Config**) und die `TODO-…`-Platzhalter ersetzen. Solange die
Platzhalter drinstehen, läuft die App, nur das Cookbook zeigt seinen Fehlerzustand.

## 3. Firestore einrichten

In der Firebase-Console eine Firestore-Datenbank anlegen (Modus „Produktion", Region z. B. `eur3`),
dann:

- **Rules veröffentlichen** — Inhalt von [`firestore.rules`](../firestore.rules) in den Reiter
  „Regeln" einfügen, oder `firebase deploy --only firestore:rules`.
- **Composite-Index anlegen** — Collection `recipes`, `cuisine` aufsteigend + `createdAt` absteigend.
  Ohne ihn schlägt der Kategoriefilter fehl. Definition in
  [`firestore.indexes.json`](../firestore.indexes.json), Deploy mit
  `firebase deploy --only firestore:indexes`.

Details in [docs/firebase.md](firebase.md).

## 4. Testdaten (optional)

```bash
npm run seed        # schreibt 30 Beispielrezepte nach Firestore
```

Das füllt das Cookbook, damit Liste, Filter, Paginierung und die „Most liked"-Zeile ohne echte
Generierung testbar sind.

## 5. n8n aufsetzen

Ohne n8n läuft die App, nur die Rezept-Generierung schlägt mit `internal_error` fehl.

```bash
cd ~/n8n && docker compose up -d     # danach: http://localhost:5678
```

Dann in n8n:

1. **Credentials anlegen** — Gemini-Header-Auth (`x-goog-api-key`) und Gmail-SMTP für die
   Fehlermails. Muss **vor** dem Import passieren.
2. **Beide Workflows importieren** aus [`n8n/`](../n8n/) — per CLI oder über Import from File.
3. **Haupt-Workflow aktivieren**, danach `docker restart n8n`, damit die Produktions-Webhook-URL
   registriert wird.

Jeder Schritt im Detail: [n8n/README.md](../n8n/README.md).

Der Webhook hört danach auf `http://localhost:5678/webhook/generate-recipe`; das Frontend bezieht die
URL ausschließlich aus `environment.recipeWebhookUrl`.

## 6. App starten

```bash
npm start           # http://localhost:4200
```

---

## Vor einem Deployment

- `environment.prod.ts`: Platzhalter-URL durch die öffentliche n8n-Webhook-URL ersetzen.
- n8n-Webhook-Node: Prod-Origin in `allowedOrigins` ergänzen und in beiden Respond-Nodes bei den
  CORS-Headern hinterlegen — direkt in n8n, danach neu exportieren.
- Google-Cloud-Console: HTTP-Referrer-Beschränkung für den Firebase-Browser-Key setzen.
