# Firebase — Rezept-Bibliothek

Die Bibliothek (Cookbook) liegt in Firestore. Dieses Dokument beschreibt Einrichtung, Regeln,
Indexe und die Testdaten. Das Datenmodell selbst steht in
[`src/app/models/firebase-schema.md`](../src/app/models/firebase-schema.md).

## Config eintragen (einmal pro Arbeitsplatz)

Die Web-Config liegt in **`src/environments/firebase.config.ts`**. Diese Datei ist per
`.gitignore` von der Versionierung ausgenommen und muss auf jedem Rechner lokal angelegt werden:

1. `npm start` (oder `npm run build`) einmal ausführen — der `prestart`-Schritt legt die Datei aus
   [`firebase.config.example.ts`](../src/environments/firebase.config.example.ts) an. Alternativ
   von Hand kopieren.
2. In der Firebase-Console: **Projekt-Einstellungen → Deine Apps → Web-App → SDK-Konfiguration →
   Config**.
3. Die sechs Werte (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`,
   `appId`) anstelle der `TODO-…`-Platzhalter eintragen.

`environment.ts` und `environment.prod.ts` importieren die Config nur — dort steht kein Key.
Solange die Platzhalter drinstehen, läuft die App normal, nur die Bibliothek zeigt ihren
Fehlerzustand.

> Die Web-Config ist technisch kein Geheimnis — sie landet bei jedem Deployment im JS-Bundle.
> Wir halten sie trotzdem aus dem öffentlichen Repository heraus. Der wirksame Schutz sind die
> Security-Rules unten plus eine **HTTP-Referrer-Beschränkung** des API-Keys in der
> Google-Cloud-Console (APIs & Dienste → Anmeldedaten → Browser-Key).
>
> Was **niemals** ins Repository darf, ist ein Service-Account-Key
> (`firebase-adminsdk-….json`) — der umgeht sämtliche Rules. Das Seed-Skript braucht keinen.

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

Alle Writes kommen aus dem Browser — n8n schreibt nie nach Firestore, und nach jeder Generierung
legt das Frontend automatisch alle drei Vorschläge an. Die App hat keine Anmeldung, deshalb tragen
die Rules die gesamte Absicherung:

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
- Das Skript liest die Config aus `src/environments/firebase.config.ts`; alternativ kann sie als
  JSON in der Umgebungsvariablen `FIREBASE_CONFIG` stehen (z. B. für CI).
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
