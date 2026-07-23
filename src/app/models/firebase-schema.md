# Firestore-Schema — Code à Cuisine

Dieses Dokument beschreibt die Firestore-Struktur für die Rezept-Bibliothek. Es ist die Vertragsbasis für den Firebase-Service in Phase 3.

## Collection: `recipes`

- **Document-ID**: Firestore-auto-generated (via `addDoc()`).
- **Dokument-Shape**: exakt das `Recipe`-Interface aus [`recipe.interface.ts`](./recipe.interface.ts).
- **Datenherkunft**: Aus der n8n-Antwort (Typ `GeneratedRecipe`) werden beim Schreiben in Firestore die Felder `id` (auto), `createdAt` (serverseitig via `serverTimestamp()`, als ISO-String persistiert) und `likeCount = 0` ergänzt.

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

Firestore erstellt Single-Field-Indexe automatisch; der Composite-Index muss beim ersten Query-Aufruf über die Firebase-Console angelegt werden (Fehler-Link folgen).

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

## Security-Rules (Skizze — keine Auth, User Story 12)

```
match /recipes/{recipeId} {
  allow read: if true;
  allow create: if isValidRecipe(request.resource.data);
  allow update: if request.resource.data.diff(resource.data)
                       .affectedKeys().hasOnly(['likeCount'])
                && request.resource.data.likeCount == resource.data.likeCount + 1;
  allow delete: if false;
}
```

Die konkrete `isValidRecipe`-Funktion sowie die endgültigen Regeln werden in Phase 3 (Firebase-Setup) implementiert und in `firestore.rules` versioniert.
