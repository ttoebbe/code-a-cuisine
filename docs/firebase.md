# Firebase — Rezept-Bibliothek

Die Bibliothek (Cookbook) liegt in Firestore. Dieses Dokument beschreibt Einrichtung, Regeln,
Indexe und die Testdaten. Das Datenmodell selbst steht in
[`src/app/models/firebase-schema.md`](../src/app/models/firebase-schema.md).

## Was du eintragen musst

Aus der Firebase-Console: **Projekt-Einstellungen → Deine Apps → Web-App → SDK-Konfiguration →
Config**. Die sechs Werte in **beide** Environment-Dateien eintragen, dort stehen aktuell
`TODO-…`-Platzhalter:

| Wert                | Datei                                                                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `apiKey`            | [`src/environments/environment.ts`](../src/environments/environment.ts) → `firebase`                                                |
| `authDomain`        | dito                                                                                                                                |
| `projectId`         | dito                                                                                                                                |
| `storageBucket`     | dito                                                                                                                                |
| `messagingSenderId` | dito                                                                                                                                |
| `appId`             | dito                                                                                                                                |
| alle sechs erneut   | [`src/environments/environment.prod.ts`](../src/environments/environment.prod.ts) (bis ein Prod-Projekt existiert: dieselben Werte) |

Diese Keys sind **kein Geheimnis** — sie identifizieren nur das Projekt. Den Zugriff regeln
ausschließlich die Security-Rules, deshalb dürfen sie im Repository stehen.

## Einrichtung in der Console

1. Projekt anlegen (Google Analytics kann aus bleiben).
2. **Build → Firestore Database → Datenbank erstellen**, Modus „Produktion", Region z. B.
   `eur3` oder `europe-west3`.
3. **Web-App hinzufügen** (`</>`-Symbol), Config kopieren, siehe Tabelle oben.
4. **Rules**: Den Inhalt von [`firestore.rules`](../firestore.rules) in den Reiter „Regeln"
   einfügen und veröffentlichen. Alternativ mit der Firebase-CLI:
   `firebase deploy --only firestore:rules` (die [`firebase.json`](../firebase.json) liegt bereit).
5. **Composite-Index anlegen** (siehe nächster Abschnitt).

### Composite-Index

Der Kategoriefilter kombiniert `where('cuisine', '==', …)` mit `orderBy('createdAt', 'desc')` und
braucht dafür einen zusammengesetzten Index:

| Collection | Feld        | Reihenfolge |
| ---------- | ----------- | ----------- |
| `recipes`  | `cuisine`   | Aufsteigend |
| `recipes`  | `createdAt` | Absteigend  |

Anlegen unter **Firestore → Indexe → Zusammengesetzt → Index erstellen**. Ohne ihn liefert der
gefilterte Aufruf einen Fehler, dessen Meldung in der Browser-Konsole einen Direktlink zum
Anlegen enthält. Die Definition ist in [`firestore.indexes.json`](../firestore.indexes.json)
versioniert (`firebase deploy --only firestore:indexes`).

Die Single-Field-Indexe für `createdAt` und `likeCount` legt Firestore automatisch an.

## Security-Rules — was erlaubt ist

Die App hat keine Anmeldung, deshalb tragen die Rules die gesamte Absicherung:

- **read**: für alle offen — die Bibliothek ist öffentlich.
- **create**: nur mit exakt den Feldern des `Recipe`-Interfaces, gültigen Wertebereichen
  (Portionen 1–12, Köche 1–3, max. 3 Zusatzzutaten …), `createdAt == request.time` und
  `likeCount == 0`.
- **update**: ausschließlich `likeCount + 1`. Jede andere Änderung wird abgelehnt.
- **delete**: nie.

Damit kann ein manipulierter Client weder fremde Rezepte verändern noch Likes zurücksetzen.

## Testdaten (Dummy-Bibliothek)

Der Projektplan sieht vor, die Bibliothek unabhängig von n8n zu testen. Dafür gibt es ein
Seed-Skript, das über denselben Weg schreibt wie die App (also auch die Rules prüft):

```bash
npm run seed              # 30 Rezepte, 5 pro Küche
npm run seed -- --count 8 # nur 8 Rezepte
npm run seed -- --dry-run # zeigt nur, was geschrieben würde
```

- Voraussetzung: Die Firebase-Config ist eingetragen (sonst bricht das Skript mit einem Hinweis ab).
- Das Skript liest die Config aus `environment.ts`; alternativ kann sie als JSON in der
  Umgebungsvariablen `FIREBASE_CONFIG` stehen.
- Likes werden wie in der App einzeln hochgezählt (0–8 pro Rezept), damit die „Most liked
  recipes"-Zeile gefüllt ist.

### Was sich damit testen lässt

| Zustand                | So erreichbar                                                      |
| ---------------------- | ------------------------------------------------------------------ |
| Leere Bibliothek       | `/library` vor dem ersten Seed-Lauf                                |
| Gefüllte Liste         | nach `npm run seed`                                                |
| Paginierung (20/Seite) | 30 Rezepte → „Load more recipes" lädt die restlichen 10            |
| Kategoriefilter        | `/library?cuisine=italian` bzw. Klick auf eine Kachel              |
| Detailansicht          | „View" auf einer Karte → `/library/<id>`                           |
| Unbekannte ID          | `/library/does-not-exist` → „Recipe not available"                 |
| Like-Persistenz        | Herz in der Detailansicht, danach Reload — der Zähler bleibt       |
| Fehlerzustand          | Netzwerk in den DevTools offline schalten und `/library` neu laden |

Zum Aufräumen die Collection `recipes` in der Console löschen — die Rules verbieten `delete`
aus dem Client bewusst.
