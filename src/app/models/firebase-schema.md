# Firestore-Schema — Code à Cuisine

Dieses Dokument beschreibt die Firestore-Struktur für die Rezept-Bibliothek — die Vertragsbasis für [`RecipeLibraryService`](../services/recipe-library.service.ts). Einrichtung, Rules-Deployment und Testdaten stehen in [`docs/firebase.md`](../../../docs/firebase.md).

## Collection: `recipes`

- **Document-ID**: Firestore-auto-generated (via `addDoc()`).
- **Dokument-Shape**: das `Recipe`-Interface aus [`recipe.interface.ts`](./recipe.interface.ts) ohne `id` — die Document-ID _ist_ die `id` — und mit `createdAt` als Firestore-`Timestamp`.
- **Datenherkunft**: Aus der n8n-Antwort (Typ `GeneratedRecipe`) werden beim Schreiben die Felder `createdAt` (serverseitig via `serverTimestamp()`) und `likeCount = 0` ergänzt.
- **Schreibzeitpunkt**: `RecipeGenerationService.applyResponse()` legt **alle drei** Vorschläge einer Generierung automatisch an, sobald die Workflow-Antwort eintrifft — genau einmal pro Lauf, ohne Bestätigungs-Button. n8n schreibt nie selbst nach Firestore.
- **Mapping**: [`recipe-document.ts`](../services/recipe-document.ts) übersetzt zwischen Dokument und Modell: beim Lesen wird die Document-ID als `id` und der `Timestamp` als ISO-String (`Recipe.createdAt`) gesetzt.

> `serverTimestamp()` schreibt zwangsläufig einen `Timestamp`, keinen ISO-String — ein einzelner Write kann nicht beides. Der Timestamp gewinnt, weil er die Serveruhr nutzt: die Sortierung und der Paginierungs-Cursor hängen damit nicht an der Uhr des Clients, und die Security-Rule kann `createdAt == request.time` erzwingen.

## Query-Felder

| Feld        | Zweck                                                   |
| ----------- | ------------------------------------------------------- |
| `cuisine`   | Kategorie-Filter (User Story 13)                        |
| `createdAt` | Chronologische Sortierung + Cursor-Paginierung          |
| `likeCount` | Sortierung "Most liked recipes" (Figma Cookbook-Header) |

## Erforderliche Indexe

- **Composite**: `cuisine ASC, createdAt DESC` — Kategorie-Listen sortiert nach Alter.
- **Single**: `createdAt DESC` — Gesamt-Bibliothek.
- **Single**: `likeCount DESC` — Most-liked-Row.

Firestore erstellt Single-Field-Indexe automatisch; der Composite-Index muss über die Firebase-Console angelegt werden (siehe [`docs/firebase.md`](../../../docs/firebase.md)). Die Definition ist in [`firestore.indexes.json`](../../../firestore.indexes.json) versioniert.

## Query-Beispiele

### Bibliotheks-Seite, paginiert (20/Seite — User Story 12)

```ts
query(
  collection(db, 'recipes'),
  orderBy('createdAt', 'desc'),
  limit(20),
  startAfter(lastVisibleSnapshot),
);
```

### Kategorie-Seite (User Story 13)

```ts
query(
  collection(db, 'recipes'),
  where('cuisine', '==', 'italian'),
  orderBy('createdAt', 'desc'),
  limit(20),
);
```

### Most-liked-Row (Cookbook-Header)

```ts
query(collection(db, 'recipes'), orderBy('likeCount', 'desc'), limit(10));
```

## Security-Rules (keine Auth, User Story 12)

```
match /recipes/{recipeId} {
  allow read: if true;
  allow create: if isValidRecipe(request.resource.data);
  allow update: if isLikeIncrement(resource.data, request.resource.data);
  allow delete: if false;
}
```

Umgesetzt in [`firestore.rules`](../../../firestore.rules): `isValidRecipe` prüft die exakte Feldliste, Wertebereiche laut Lastenheft, `createdAt == request.time` und `likeCount == 0`; `isLikeIncrement` lässt ausschließlich `likeCount + 1` durch.

## Zugriff aus dem Frontend

Alle Reads und Writes laufen über [`RecipeLibraryService`](../services/recipe-library.service.ts) (`providedIn: 'root'`) — keine Firestore-Aufrufe aus Components:

| Methode                           | Query / Write                                      |
| --------------------------------- | -------------------------------------------------- |
| `saveRecipe(GeneratedRecipe)`     | `addDoc()`, liefert die Document-ID                |
| `getRecipeById(id)`               | `getDoc()`, `null` wenn es das Dokument nicht gibt |
| `listRecipes({cuisine?, cursor})` | paginierte Liste, 20/Seite                         |
| `listMostLiked(count)`            | Most-liked-Row                                     |
| `incrementLike(id)`               | `updateDoc()` mit `increment(1)`                   |
