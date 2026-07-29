# Firebase — Rezept-Bibliothek

Die Bibliothek („Cookbook") liegt in Firestore. Dieses Dokument beschreibt Config, Datenmodell,
Security-Rules, Indexe und die Testdaten.

## Config eintragen (einmal pro Arbeitsplatz)

Die Web-Config liegt in **`src/environments/firebase.config.ts`** und ist per `.gitignore` von der
Versionierung ausgenommen — ohne sie kompiliert die App nicht.

1. [`firebase.config.example.ts`](../src/environments/firebase.config.example.ts) im selben Ordner
   nach `firebase.config.ts` kopieren.
2. In der Firebase-Console: **Projekt-Einstellungen → Deine Apps → Web-App → SDK-Konfiguration →
   Config**.
3. Die sechs Werte (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`,
   `appId`) anstelle der `TODO-…`-Platzhalter eintragen.

`environment.ts` und `environment.prod.ts` importieren die Config nur — dort steht kein Key. Solange
die Platzhalter drinstehen, läuft die App normal, nur die Bibliothek zeigt ihren Fehlerzustand.

> Die Web-Config ist technisch kein Geheimnis — sie landet bei jedem Deployment im JS-Bundle. Wir
> halten sie trotzdem aus dem öffentlichen Repository heraus. Der wirksame Schutz sind die
> Security-Rules unten plus eine **HTTP-Referrer-Beschränkung** des API-Keys in der
> Google-Cloud-Console (APIs & Dienste → Anmeldedaten → Browser-Key).
>
> Was **niemals** ins Repository darf, ist ein Service-Account-Key (`firebase-adminsdk-….json`) —
> der umgeht sämtliche Rules. Die App braucht keinen: alle Writes laufen als normaler Client durch
> die Rules.

## Einrichtung in der Console

1. Projekt anlegen (Google Analytics kann aus bleiben).
2. **Build → Firestore Database → Datenbank erstellen**, Modus „Produktion", Region z. B. `eur3`
   oder `europe-west3`.
3. **Web-App hinzufügen** (`</>`-Symbol), Config kopieren, siehe oben.
4. **Rules**: Den Inhalt von [`firestore.rules`](../firestore.rules) in den Reiter „Regeln" einfügen
   und veröffentlichen. Alternativ `firebase deploy --only firestore:rules` (die
   [`firebase.json`](../firebase.json) liegt bereit).
5. **Composite-Index anlegen**, siehe unten.

## Datenmodell — Collection `recipes`

- **Document-ID**: von Firestore vergeben (`addDoc()`) — sie _ist_ die `id` des Rezepts.
- **Dokument-Shape**: das `Recipe`-Interface aus
  [`recipe.interface.ts`](../src/app/models/recipe.interface.ts) ohne `id`, mit `createdAt` als
  Firestore-`Timestamp`.
- **Herkunft**: Aus der n8n-Antwort (Typ `GeneratedRecipe`) ergänzt der Write die Felder `createdAt`
  (serverseitig über `serverTimestamp()`) und `likeCount = 0`.
- **Schreibzeitpunkt**: `RecipeGenerationService.applyResponse()` legt **alle drei** Vorschläge einer
  Generierung automatisch an, sobald die Antwort eintrifft — genau einmal pro Lauf, ohne
  Bestätigungs-Button. n8n schreibt nie selbst nach Firestore.
- **Mapping**: [`recipe-document.ts`](../src/app/services/recipe-document.ts) übersetzt zwischen
  Dokument und Modell; beim Lesen wird die Document-ID als `id` und der `Timestamp` als ISO-String
  gesetzt.

> `serverTimestamp()` schreibt zwangsläufig einen `Timestamp`, keinen ISO-String — ein einzelner
> Write kann nicht beides. Der Timestamp gewinnt, weil er die Serveruhr nutzt: Sortierung und
> Paginierungs-Cursor hängen damit nicht an der Uhr des Clients, und die Security-Rule kann
> `createdAt == request.time` erzwingen.

### Zugriff aus dem Frontend

Alle Reads und Writes laufen über
[`RecipeLibraryService`](../src/app/services/recipe-library.service.ts) (`providedIn: 'root'`) —
keine Firestore-Aufrufe aus Components:

| Methode                           | Query / Write                                      |
| --------------------------------- | -------------------------------------------------- |
| `saveRecipe(GeneratedRecipe)`     | `addDoc()`, liefert die Document-ID                |
| `getRecipeById(id)`               | `getDoc()`, `null` wenn es das Dokument nicht gibt |
| `listRecipes({cuisine?, cursor})` | paginierte Liste, 20/Seite                         |
| `listMostLiked(count)`            | Most-liked-Row                                     |
| `incrementLike(id)`               | `updateDoc()` mit `increment(1)`                   |

## Security-Rules — was erlaubt ist

Alle Writes kommen aus dem Browser, und die App hat keine Anmeldung — deshalb tragen die Rules die
gesamte Absicherung:

- **read**: für alle offen — die Bibliothek ist öffentlich.
- **create**: nur mit exakt den Feldern des `Recipe`-Interfaces, gültigen Wertebereichen (Portionen
  1–12, Köche 1–3, max. 3 Zusatzzutaten …), `createdAt == request.time` und `likeCount == 0`.
- **update**: ausschließlich `likeCount + 1`. Jede andere Änderung wird abgelehnt.
- **delete**: nie.

Damit kann ein manipulierter Client weder fremde Rezepte verändern noch Likes zurücksetzen.

## Composite-Index

Der Kategoriefilter kombiniert `where('cuisine', '==', …)` mit `orderBy('createdAt', 'desc')` und
braucht dafür einen zusammengesetzten Index:

| Collection | Feld        | Reihenfolge |
| ---------- | ----------- | ----------- |
| `recipes`  | `cuisine`   | Aufsteigend |
| `recipes`  | `createdAt` | Absteigend  |

Anlegen unter **Firestore → Indexe → Zusammengesetzt → Index erstellen**. Ohne ihn liefert der
gefilterte Aufruf einen Fehler, dessen Meldung in der Browser-Konsole einen Direktlink zum Anlegen
enthält. Die Definition ist in [`firestore.indexes.json`](../firestore.indexes.json) versioniert
(`firebase deploy --only firestore:indexes`).

Die Single-Field-Indexe für `createdAt` (Gesamt-Bibliothek) und `likeCount` (Most-liked-Row) legt
Firestore automatisch an.

## Testdaten

Die Bibliothek füllt sich aus der App selbst: Jede Generierung legt automatisch **drei** Rezepte an.
Voraussetzung ist die ausgefüllte `firebase.config.ts`. Likes entstehen über das Herz in der
Detailansicht — ein paar davon, damit die „Most liked recipes"-Zeile gefüllt ist.

### Was sich damit testen lässt

| Zustand                | So erreichbar                                                      |
| ---------------------- | ------------------------------------------------------------------ |
| Leere Bibliothek       | `/library` vor der ersten Generierung                              |
| Gefüllte Liste         | nach ein paar Generierungsläufen (je Lauf 3 Rezepte)               |
| Paginierung (20/Seite) | ab 21 Rezepten → „Load more recipes" lädt den Rest                 |
| Kategoriefilter        | `/library?cuisine=italian` bzw. Klick auf eine Kachel              |
| Detailansicht          | „View" auf einer Karte → `/library/<id>`                           |
| Unbekannte ID          | `/library/does-not-exist` → „Recipe not available"                 |
| Like-Persistenz        | Herz in der Detailansicht, danach Reload — der Zähler bleibt       |
| Fehlerzustand          | Netzwerk in den DevTools offline schalten und `/library` neu laden |

Zum Aufräumen die Collection `recipes` in der Console löschen — die Rules verbieten `delete` aus dem
Client bewusst.
