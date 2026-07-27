# Architektur — Code a Cuisine

Diese Doku bildet die **tatsächliche** Struktur des Projekts ab, so wie sie im Code und im
n8n-Workflow steht — nichts Erfundenes. Sie ist zum vollständigen Nachvollziehen gedacht: erst das
große Bild, dann der Workflow Node für Node, dann der Ablauf des Happy Path als Sequenz.

Verwandte Dokumente: [docs/n8n-webhook.md](n8n-webhook.md) (JSON-Vertrag),
[docs/firebase.md](firebase.md) (Bibliothek), [n8n/README.md](../n8n/README.md) (Import und
Entscheidungen), [CLAUDE.md](../CLAUDE.md) (Projekt-Anweisungen).

Kurzfassung des Stacks:

- **Frontend:** Angular 21 im Browser (Standalone Components, Signals) — läuft **lokal** auf
  `http://localhost:4200` bzw. `4300`.
- **Rezept-Generierung:** n8n-Workflow in Docker — läuft **lokal** auf `http://localhost:5678`.
- **LLM:** Google Gemini API (`gemini-3.5-flash`) — **extern**, wird nur von n8n aufgerufen.
- **Bibliothek:** Firebase Firestore — **extern**, wird nur vom Frontend angesprochen.

---

## 1. Gesamtarchitektur

Zwei getrennte Pfade laufen sternförmig vom Browser aus. Der **Generierungspfad** geht über n8n zur
Gemini-API und zurück. Der **Bibliothekspfad** geht direkt vom Browser nach Firestore. Die beiden
kreuzen sich nie im Backend — insbesondere schreibt n8n **nicht** nach Firestore (siehe unten).

```mermaid
flowchart TB
  subgraph browser["Browser — Angular-App · LOKAL"]
    ui["Generator-Wizard und Rezeptansicht"]
    apiSvc["RecipeApiService · kapselt den Webhook-Call"]
    libSvc["RecipeLibraryService · kapselt Firestore"]
  end

  subgraph n8nbox["n8n in Docker · localhost:5678 · LOKAL"]
    hook["Webhook · POST /webhook/generate-recipe"]
  end

  subgraph google["Google Gemini · EXTERN"]
    gemini["generateContent · Modell gemini-3.5-flash"]
  end

  subgraph firebase["Firebase Firestore · EXTERN"]
    store["Collection recipes · abgesichert durch Security-Rules"]
  end

  ui --> apiSvc
  ui --> libSvc

  apiSvc -- "POST RecipeRequest als JSON" --> hook
  hook -- "HTTPS mit x-goog-api-key" --> gemini
  gemini -- "JSON-Text nach responseSchema" --> hook
  hook -- "HTTP 200 mit Antwort-Envelope" --> apiSvc

  libSvc -- "addDoc · automatisch fuer alle 3 Vorschlaege" --> store
  libSvc -- "getDocs / getDoc · Bibliothek lesen" --> store
  libSvc -- "updateDoc · Like plus 1" --> store
```

### Bausteine

- **Generator-Wizard und Rezeptansicht (`ui`)** — die sichtbare App. Kein Component ruft je direkt
  HTTP oder Firestore auf; alles läuft über die beiden Services darunter (Vorgabe aus
  [CLAUDE.md](../CLAUDE.md): keine `HttpClient`-Calls aus Components, dedizierter Service
  `providedIn: 'root'`).
- **RecipeApiService** ([src/app/services/recipe-api.service.ts](../src/app/services/recipe-api.service.ts)) —
  einziger Einstieg zum Workflow. Nimmt die Webhook-URL aus `environment` (nie hartcodiert), setzt
  einen Timeout von 90 s und normalisiert **jeden** Fehler auf die `RecipeErrorResponse`-Envelope, die
  die UI schon versteht. Kann per `environment.useMockWebhook` auf lokale Fixtures umschalten.
- **RecipeLibraryService** ([src/app/services/recipe-library.service.ts](../src/app/services/recipe-library.service.ts)) —
  einziger Einstieg zu Firestore (Collection `recipes`). Kapselt Speichern (`addDoc`), Lesen
  (`getDoc`/`getDocs` mit Paginierung und Kategoriefilter) und Like (`updateDoc` mit `increment(1)`).
- **Webhook-Node in n8n** — nimmt den POST entgegen und beantwortet den CORS-Preflight für die zwei
  Dev-Origins. Alles Weitere passiert in den nachgelagerten Nodes (Abschnitt 2).
- **Google Gemini API** — der einzige externe LLM-Aufruf, ausgelöst **nur** von n8n. Der
  API-Key liegt als n8n-Credential (`x-goog-api-key`), nie im Repo, nie im Browser.
- **Firestore-Collection `recipes`** — die öffentliche Bibliothek. Da die App keine Anmeldung hat,
  tragen die **Security-Rules** ([firestore.rules](../firestore.rules)) die gesamte Absicherung.

### Was lokal und was extern läuft

| Baustein             | Ort                      | Erreichbar über               |
| -------------------- | ------------------------ | ----------------------------- |
| Angular-App          | **lokal**, Browser       | `localhost:4200` / `4300`     |
| n8n-Workflow         | **lokal**, Docker        | `localhost:5678`              |
| Google Gemini        | **extern**, Google-Cloud | HTTPS, nur aus n8n            |
| Firestore-Bibliothek | **extern**, Google Cloud | Firebase-SDK, nur aus Browser |

### Warum n8n NICHT nach Firestore schreibt

Bewusste Entscheidung (siehe [n8n/README.md](../n8n/README.md), Aufgabe 6). Der Firestore-Write gehört
ins Frontend: [RecipeGenerationService](../src/app/services/recipe-generation.service.ts) legt alle
drei Vorschläge über `RecipeLibraryService.saveRecipe()` an, sobald die Antwort eintrifft. Gründe:

- n8n bekommt damit **keine** Firebase-Credentials. Es existiert nirgends ein Service-Account-Key
  (der würde sämtliche Rules umgehen). Die **Security-Rules bleiben die alleinige Absicherung** — der
  Client-Write muss durch sie hindurch.
- Der Kostenairbag (Quota) bleibt rein in n8n und wird davon nicht berührt.
- Der Schreibzeitpunkt bleibt dort, wo auch der Zustand liegt: Das Frontend weiß, welcher Lauf zu
  welchen Vorschlägen gehört, und kann die zurückgegebenen Dokument-Ids sofort weiterverwenden
  (Like-Herz).

### Automatischer Save statt Bestätigen-Button (Phase 7)

Bis Phase 6 wurde **nur das eine vom Nutzer bestätigte** Rezept gespeichert — über einen
„Save to cookbook"-Button in der Rezeptansicht. Die Schul-Checkliste verlangt jedoch, dass **alle**
generierten Rezepte in Firebase landen (User Story 12). Die Phase-4-Entscheidung ist damit
**revidiert**:

- Der Button ist **entfallen**. `applyResponse()` im `RecipeGenerationService` schreibt die drei
  Rezepte parallel, **genau einmal pro Generierung** — beim Eintreffen der Antwort, nicht beim
  Rendern. Ein erneutes Navigieren auf `/results` löst deshalb keinen zweiten Write aus.
- Der Save wird **nicht abgewartet**: Navigation und Ergebnisliste laufen sofort. Scheitert ein
  Write, wird er nur geloggt, das Ergebnis bleibt sichtbar, und `/results` zeigt einen dezenten
  Hinweis. Eine gescheiterte Bibliotheks-Ablage blockiert die Generierung nie.
- Die Dokument-Ids landen in `savedIdList`; die Rezeptansicht liest sie über `savedIdAt(index)`.
  Damit ist das **Like-Herz sofort aktiv** — früher war es gesperrt, solange das Rezept nur im
  Speicher lag. Nur wenn der Write scheiterte, bleibt es deaktiviert.
- **Unverändert:** `firestore.rules`, der n8n-Workflow und der JSON-Vertrag. Es ist weiterhin ein
  reiner Client-Write durch dieselben Rules.

Preis dieser Entscheidung: Die Bibliothek enthält auch Rezepte, die niemand nachgekocht hat. Sie
sortiert nach `createdAt` bzw. `likeCount`, sodass Ungenutztes nach hinten rutscht.

---

## 2. Der n8n-Workflow „Code a Cuisine — Generate Recipe"

Quelle: [n8n/generate-recipe.workflow.json](../n8n/generate-recipe.workflow.json). Der Workflow ist eine
lineare Kette mit zwei Weichen (`IF`-Nodes). Jeder Ausgang mündet in genau **einen** der beiden
Antwort-Nodes.

```mermaid
flowchart TB
  recv["Receive recipe request · Webhook POST"]
  guard["Validate & rate limit · Code-Node guard.js"]
  ifGuard{"Passed the guard? · route gleich ok"}
  gemini["Generate recipes Gemini · HTTP Google · neverError"]
  mapai["Map AI answer to recipes · Code-Node map-ai.js"]
  ifUsable{"Recipes usable? · route gleich ok"}
  respOk["Respond: recipes · Envelope status ok"]
  respErr["Respond: error · Envelope status error"]

  recv --> guard --> ifGuard
  ifGuard -- "ok" --> gemini
  ifGuard -- "error" --> respErr
  gemini --> mapai --> ifUsable
  ifUsable -- "ok" --> respOk
  ifUsable -- "error" --> respErr
```

### Node für Node

**Receive recipe request** — Webhook-Node, `POST /webhook/generate-recipe`, `responseMode:
responseNode` (die Antwort liefert später ein eigener Respond-Node). Über `allowedOrigins`
(`http://localhost:4200,http://localhost:4300`) beantwortet er den **CORS-Preflight** (`OPTIONS`) für
die zwei Dev-Origins. TODO für Prod: deployte Origin ergänzen.

**Validate & rate limit** — Code-Node ([n8n/src/guard.js](../n8n/src/guard.js)). Läuft einmal für alle
Items und tut drei Dinge, in dieser Reihenfolge:

1. **Server-seitige Validierung** des Request-Bodys (`collectValidationErrors`): mindestens eine
   Zutat mit `name`/`amount`/`unit`, `portions` 1–12, `cooks` 1–3, gültige `timeCategory`, `cuisine`
   und `diet`. Schlägt sie an, entsteht sofort ein `validation_failed`-Envelope und der LLM wird nie
   gerufen.
2. **Quota reservieren** (`reserveQuota`, der Kostenairbag) — Details unten.
3. **Gemini-Request bauen** (`buildGeminiBody`) — Details unten.

Der Node emittiert entweder ein `route: ok`-Item (mit sauberem Request, CORS-Origin und fertigem
Gemini-Body) oder ein `route: error`-Item (mit `__error`-Envelope).

**Passed the guard?** — `IF`-Node auf `route == ok`. `ok` → weiter zum Modell; `error` → direkt zu
**Respond: error**. Damit erreichen abgelehnte oder überzählige Anfragen den LLM nie.

**Generate recipes (Gemini)** — HTTP-Request-Node an
`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent`. Das
Modell steht bei Gemini in der **URL**, nicht im Body. Auth über die Header-Credential
`x-goog-api-key`; weitere feste Header braucht der Node nicht. Body ist der in guard.js gebaute
`geminiBody`. Wichtig: **`neverError: true`** — eine 4xx/5xx-Antwort von Google (inklusive einer
Gemini-Quota-429) bricht die Ausführung **nicht** ab, sondern fließt als Body weiter (damit der
bereits reservierte Quota-Slot persistiert und der Map-Node sauber einen `ai_failed`-Envelope bauen
kann). Timeout 80 s.

**Map AI answer to recipes** — Code-Node ([n8n/src/map-ai.js](../n8n/src/map-ai.js)). Packt die Rezepte
aus `candidates[0].content.parts[].text` aus, säubert jedes Feld auf die `GeneratedRecipe`-Form und
prüft es. Bei jeder unbrauchbaren Antwort entsteht ein `ai_failed`-Envelope. Details unten.

**Recipes usable?** — `IF`-Node auf `route == ok`. `ok` → **Respond: recipes**; `error` →
**Respond: error**.

**Respond: recipes** — Respond-Node, `responseCode: 200`, Body `{ status: 'ok', recipes }`. Setzt den
CORS-Antwort-Header (siehe unten).

**Respond: error** — Respond-Node, `responseCode: 200`, Body ist die `__error`-Envelope. Gleiche
CORS-Header. Erreicht wird er aus drei Richtungen: Guard-Fehler (`validation_failed`,
`quota_*_exceeded`) und Map-Fehler (`ai_failed`).

### Der zweite Workflow: Error-Handler

Quelle: [n8n/error-handler.workflow.json](../n8n/error-handler.workflow.json). Ein eigener Workflow, den
der Haupt-Workflow über `settings.errorWorkflow: codeacuisine-error-handler` referenziert.

```mermaid
flowchart LR
  err["On workflow error · Error Trigger"]
  log["Log the failure · Code-Node log-error.js"]
  err --> log
```

- **On workflow error** — Error-Trigger, feuert nur bei einem **unerwarteten** Abbruch des
  Haupt-Workflows.
- **Log the failure** — schreibt eine lesbare Zeile (`workflow`, `node`, `error`, `url`) per
  `console.error` ins n8n-Log ([n8n/src/log-error.js](../n8n/src/log-error.js)). Bewusst **ohne**
  Mailversand; der Node lässt sich später durch einen E-Mail-/Slack-Node ersetzen.

Wichtig zur Abgrenzung: Die **erwarteten** Fehler (Validierung, Quota, KI) laufen **nicht** über den
Error-Handler. Sie kommen als regulärer Envelope über **Respond: error** zurück. Der Error-Handler
fängt nur echte Abstürze (z. B. ein Node wirft eine unbehandelte Exception).

### Warum die Validierung serverseitig doppelt zum Frontend liegt

Das Frontend klemmt Werte bereits (Portionen 1–12, Köche 1–3) — trotzdem prüft guard.js dieselben
Regeln erneut. Grund: Der Webhook ist ein **offener HTTP-Endpunkt**. Ein Aufruf per `curl` oder ein
manipulierter Client umgeht jede Frontend-Prüfung. Die Server-Validierung ist die einzige, auf die
man sich verlassen kann; die Frontend-Prüfung ist nur Komfort (schnelles Feedback, keine unnötigen
Calls). Die Antwort ist deterministisch: bei ungültigem Payload ein `validation_failed`-Envelope,
noch bevor Quota oder LLM angefasst werden.

### IP-Quota / Kostenairbag (3 pro IP, 12 systemweit, dateibasiert)

Der Kostenairbag begrenzt die LLM-Kosten hart und läuft **ausschließlich serverseitig** in guard.js
(`reserveQuota`). Regeln:

- **3 Rezepte pro IP und Tag**, **12 systemweit pro Tag**. Reset um **Mitternacht UTC**;
  `retryAfter` in der Fehler-Envelope ist die nächste UTC-Mitternacht.
- Zähler stehen in einer **JSON-Datei** auf dem n8n-Datenvolume:
  `/home/node/.n8n/quota-state.json` (Form `{ day, system, perIp }`). Bewusst dateibasiert: n8n
  Static Data persistiert bei Webhook-Läufen nicht zuverlässig, ein harter Kostendeckel darf davon
  nicht abhängen. Erfordert `NODE_FUNCTION_ALLOW_BUILTIN` inkl. `fs`.
- **IP-Normalisierung** (`resolveIpKey`): Quelle ist `x-forwarded-for` (erster Eintrag), sonst
  `x-real-ip`. IPv4-mapped IPv6 (`::ffff:a.b.c.d`) → IPv4; IPv6 auf das `/64`-Präfix (erste vier
  Hextets); Zone-ID entfernt. Ohne erkennbare IP landet alles im Bucket `unknown`.
- **Reservierung vor dem LLM-Aufruf**: Der Slot wird gezählt, **bevor** Gemini gerufen wird. So
  können wiederholte Fehlversuche das Budget nicht aushöhlen. Zusammen mit `neverError` am HTTP-Node
  bleibt der Zähler auch bei einer Google-Fehlerantwort verbucht.
- Bei Überlauf: `quota_ip_exceeded` bzw. `quota_system_exceeded` mit passender `message` und
  `retryAfter`.

> Test-Hinweis: Ohne vorgelagerten Proxy setzt der Browser kein `x-forwarded-for`; auf `localhost`
> landet daher alles im Bucket `unknown`. Das systemweite Limit (12/Tag) greift trotzdem und ist der
> harte Deckel.

Das Frontend **zeigt** den Quota-Status nur an — es **prüft** nichts selbst und führt keine
Client-Zähler (Vorgabe aus [CLAUDE.md](../CLAUDE.md), Quota-Regel).

### Gemini-Aufruf mit responseSchema (erzwungene JSON-Struktur)

`buildGeminiBody` baut einen `generateContent`-Request, der die Struktur **erzwingt** statt zu hoffen:

- `systemInstruction` mit den harten Projektregeln (Diät strikt, gewünschte Küche/Portionen/Köche,
  `timeCategory` passend zur Kochzeit, ≥ 70 % der Nutzerzutaten wiederverwenden, max. 3
  Zusatzzutaten, Arbeitsaufteilung bei `cooks > 1`, Nährwerte für `perPortion` **und** `total`, alles
  auf Englisch), dazu der konkrete Request als `contents`-User-Turn.
- **`generationConfig.responseMimeType: "application/json"`** — das Modell antwortet garantiert mit
  JSON statt Freitext.
- **`generationConfig.responseSchema`** — exakt `GeneratedRecipe[]` mit `minItems: 3, maxItems: 3`,
  verschachtelt Zutaten, Schritte und Nährwerte. Zusammen sind die beiden Felder der Ersatz für den
  früheren Tool-Use-Zwang (`emit_recipes`).
- `maxOutputTokens: 32000` — großzügig bemessen, weil drei vollständige Rezepte plus das interne
  Denken des Modells sonst in `finishReason: MAX_TOKENS` laufen können.

Zum **Schema-Dialekt**: Gemini erwartet eine OpenAPI-3.0-Teilmenge, nicht JSON Schema. Gegenüber dem
früheren `input_schema` sind daher drei Dinge anders — **Felder und Wertebereiche bleiben identisch**:

| Anthropic `input_schema`      | Gemini `responseSchema`            |
| ----------------------------- | ---------------------------------- |
| `type: 'string'` (klein)      | `type: 'STRING'` (Enum-Name, groß) |
| `type: ['integer', 'null']`   | `type: 'INTEGER', nullable: true`  |
| `additionalProperties: false` | entfällt (nicht unterstützt)       |
| Wrapper `{ recipes: [...] }`  | direkt `ARRAY` auf oberster Ebene  |

### coerceRecipes in map-ai.js — warum das Auspacken nötig ist

Trotz erzwungenem Schema ist die Modellantwort in der Praxis nicht immer sauber die reine Liste.
`isRefused` sortiert zuerst unbrauchbare Antworten aus (siehe unten), `readAnswerText` verkettet dann
die Text-Parts von `candidates[0].content.parts` (reine Denk-Parts mit `thought: true` werden
übersprungen). `coerceRecipes` wickelt diesen Text rekursiv aus — die Funktion stammt unverändert aus
der Claude-Zeit, weil der Wert dort unterschiedlich verpackt ankam:

- schon die **Liste** selbst, oder
- ein **`{ recipes: [...] }`**-Objekt, oder
- ein **JSON-String** von einem der beiden, oder sogar
- **doppelt verpackt** als `{ recipes: "<json-string>" }`.

`coerceRecipes` parst Strings, steigt durch `{ recipes }`-Ebenen ab (max. Tiefe 6) und gibt die erste
gefundene Array-Ebene zurück, sonst `null`. Danach wird jedes Rezept mit `cleanRecipe` neu aufgebaut
(Zahlen runden/klemmen, `assignedChef` in `1..cooks` klemmen, `extraIngredients` auf 3 kappen, Einheiten
auf `g`/`ml`/`piece` normalisieren) und mit `isValidRecipe` geprüft. Nur wenn **genau drei** gültige
Rezepte übrig bleiben, entsteht `route: ok`; sonst `ai_failed`. Dieses Säubern stellt sicher, dass die
Ausgabe später auch die **Firestore-Rules** passiert.

### Fehlerpfade der Gemini-Antwort (alle → `ai_failed`)

`isRefused` in map-ai.js fängt vor dem Auspacken alle Formen ab, in denen Google keine verwertbare
Antwort liefert. Der Vertrag zum Frontend kennt dafür genau **einen** Code, `ai_failed` (mit Retry-
Angebot) — es kommen also keine neuen Fehlercodes hinzu:

| Antwort von Google                            | Erkannt an                          |
| --------------------------------------------- | ----------------------------------- |
| HTTP-Fehler 4xx/5xx, inkl. Gemini-Quota (429) | `error` im Body (dank `neverError`) |
| Prompt sicherheitsgeblockt                    | `promptFeedback.blockReason`        |
| Keine Kandidaten geliefert                    | `candidates` leer oder fehlt        |
| Abbruch (SAFETY, MAX_TOKENS, RECITATION)      | `finishReason !== 'STOP'`           |
| Kandidat ohne nutzbaren Text                  | `readAnswerText` liefert `null`     |

Wichtig zur Abgrenzung: Die **Gemini-Quota** (Googles eigenes Rate-Limit) ist etwas anderes als der
Kostenairbag des Projekts. Läuft Googles Limit über, sieht der Nutzer `ai_failed`; läuft der
Projekt-Deckel über, sieht er `quota_ip_exceeded` bzw. `quota_system_exceeded` — und der LLM wird gar
nicht erst gerufen.

### Antwort-Envelope: immer HTTP 200, Feld `status` ok/error

Beide Respond-Nodes antworten mit **`responseCode: 200`** — auch im Fehlerfall. Diskriminator ist das
Feld `status` in der Envelope (`ok` vs. `error`), siehe [docs/n8n-webhook.md](n8n-webhook.md).
Warum bewusst 200:

- Der `RecipeApiService` liest **Erfolg wie Fehler aus demselben 200er-Body** — ein einziger,
  einfacher Lesepfad im Frontend.
- Der HTTP-Status trägt keine fachliche Bedeutung; die fünf Fehlercodes (`validation_failed`,
  `quota_ip_exceeded`, `quota_system_exceeded`, `ai_failed`, `internal_error`) stehen im Envelope und
  steuern den passenden Dialog.
- Erst wenn **gar kein** brauchbarer Body ankommt (z. B. Transport-/CORS-Fehler, Timeout), fällt das
  Frontend selbst auf `internal_error` zurück (`buildTransportError` in
  [recipe-api.service.ts](../src/app/services/recipe-api.service.ts)). `internal_error` kommt also **nie**
  aus n8n, sondern immer aus dem Client.

### CORS am Webhook

Zwei Stufen, beide im Workflow:

- **Preflight (`OPTIONS`)**: beantwortet der Webhook-Node über `allowedOrigins`
  (`localhost:4200,4300`).
- **Antwort auf den POST**: beide Respond-Nodes setzen `Access-Control-Allow-Origin` **reflektierend**
  — sie spiegeln `headers.origin` zurück, wenn er in der Allow-Liste steht, sonst `localhost:4200` —
  plus `Vary: Origin`. Ohne diese Header blockiert Chrome den Aufruf, und das Frontend zeigt den
  generischen `internal_error`-Dialog.

---

## 3. Sequenzdiagramm — Happy Path

Vom Wizard bis zum Like, ohne Fehlerabzweige. Man sieht, dass **n8n und Firestore nie direkt
miteinander reden** — der Browser ist der einzige gemeinsame Punkt.

```mermaid
sequenceDiagram
  actor User as Nutzer
  participant NG as Angular-App
  participant N8N as n8n Webhook · lokal
  participant AI as Google Gemini · extern
  participant FS as Firestore · extern

  User->>NG: Wizard ausfuellen und generieren
  NG->>N8N: POST RecipeRequest als JSON
  N8N->>N8N: Validierung und Quota-Slot reservieren
  N8N->>AI: generateContent · responseSchema erzwungen
  AI-->>N8N: JSON-Text mit 3 Rezepten
  N8N->>N8N: Map AI · auspacken und sanitisieren
  N8N-->>NG: HTTP 200 · status ok mit 3 Rezepten
  NG-->>User: Ergebnisliste und Rezeptansicht

  Note over User,FS: Zweiter Pfad · automatisch, parallel zur Anzeige
  NG->>FS: addDoc x3 · createdAt Servertime · likeCount 0
  FS-->>NG: drei Dokument-Ids
  User->>NG: Klick auf das Herz
  NG->>FS: updateDoc · likeCount plus 1
  FS-->>NG: ok
```

### Ablauf im Detail

1. **Nutzer → Angular:** Der Generator-Wizard sammelt Zutaten und Präferenzen; `generate()` in
   [RecipeGenerationService](../src/app/services/recipe-generation.service.ts) baut den `RecipeRequest`,
   setzt den Status auf `loading` (Ladeanimation) und ruft den `RecipeApiService`.
2. **Angular → n8n:** `RecipeApiService.generateRecipes()` schickt den POST an
   `environment.recipeWebhookUrl` mit 90-s-Timeout.
3. **n8n intern:** Guard validiert und reserviert einen Quota-Slot (siehe Abschnitt 2).
4. **n8n → Google:** HTTP-Node ruft `generateContent` mit `responseMimeType: application/json` und
   dem `responseSchema` für `GeneratedRecipe[]`.
5. **Google → n8n:** Gemini liefert den JSON-Text mit drei Rezepten in
   `candidates[0].content.parts[].text`.
6. **n8n intern:** Der Map-Node prüft auf Refusal (`isRefused`), liest den Text (`readAnswerText`),
   packt aus (`coerceRecipes`), säubert und prüft; drei gültige Rezepte → `route: ok`.
7. **n8n → Angular:** **Respond: recipes** antwortet HTTP 200 mit `{ status: 'ok', recipes }`.
8. **Angular → Nutzer:** `applyResponse` legt die Rezepte in den Signals ab und navigiert auf
   `/results`. Die Liste im Speicher ist an den Lauf gebunden — ein Reload schickt bewusst zurück in
   den Wizard; die Rezepte selbst sind über den Cookbook danach weiterhin erreichbar.
9. **Automatischer Save:** Direkt nach der Navigation schreibt `storeRecipes()` alle drei Rezepte
   parallel über `RecipeLibraryService.saveRecipe()`. `buildRecipeDocument` ergänzt
   `createdAt: serverTimestamp()` und `likeCount: 0`, `addDoc` schreibt durch die
   **Security-Rules** (Feld-Whitelist, Wertebereiche, `createdAt == request.time`, `likeCount == 0`).
   Zurück kommen die Dokument-Ids, die der Lauf unter `savedIdAt(index)` bereithält. Der Schritt läuft
   **neben** der Anzeige; ein Fehler wird geloggt und dezent gemeldet, blockiert aber nichts.
10. **Like:** Weil das Rezept schon in der Bibliothek liegt, ist der Like-Button sofort aktiv
    ([RecipeLike](../src/app/recipe-view/recipe-like/recipe-like.ts)). Der Klick ruft `incrementLike()`
    → `updateDoc(..., { likeCount: increment(1) })`. Die Rules erlauben als einzige Änderung genau
    `likeCount + 1`; der Zähler lebt auf dem Server, sodass parallele Likes sich addieren statt sich
    zu überschreiben. Ein Delete ist nie erlaubt.

---

## Quellen

Alles oben ist aus diesen Dateien abgeleitet:

- [n8n/generate-recipe.workflow.json](../n8n/generate-recipe.workflow.json),
  [n8n/error-handler.workflow.json](../n8n/error-handler.workflow.json)
- [n8n/src/map-ai.js](../n8n/src/map-ai.js), [n8n/src/log-error.js](../n8n/src/log-error.js),
  [n8n/README.md](../n8n/README.md)
- [docs/n8n-webhook.md](n8n-webhook.md), [docs/firebase.md](firebase.md)
- [src/app/services/recipe-api.service.ts](../src/app/services/recipe-api.service.ts),
  [src/app/services/recipe-generation.service.ts](../src/app/services/recipe-generation.service.ts),
  [src/app/services/recipe-library.service.ts](../src/app/services/recipe-library.service.ts),
  [src/app/services/recipe-document.ts](../src/app/services/recipe-document.ts)
- [src/app/recipe-view/recipe-like/recipe-like.ts](../src/app/recipe-view/recipe-like/recipe-like.ts),
  [src/app/recipe-view/recipe-view.ts](../src/app/recipe-view/recipe-view.ts)
- [src/environments/environment.ts](../src/environments/environment.ts),
  [firestore.rules](../firestore.rules), [CLAUDE.md](../CLAUDE.md)
