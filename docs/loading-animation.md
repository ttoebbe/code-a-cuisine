# Loading-Animation

Assets für den Ladezustand des Rezept-Generators.

| Datei                     | Format          | Maße    | fps  | Laufzeit | Größe  |
| ------------------------- | --------------- | ------- | ---- | -------- | ------ |
| `public/img/loading.webp` | animiertes WebP | 171×240 | 12,5 | 13,20 s  | 135 KB |
| `public/img/loading.gif`  | animiertes GIF  | 171×240 | 12,5 | 13,20 s  | 401 KB |

Quelle: `docs/design/loading-original.gif` (436×613, 25 fps, 13,16 s) — nicht ausliefern.

## Einsatz im Markup

**`loading.webp` ist die bevorzugte Quelle.** Das GIF bleibt ausschließlich als Fallback im Repo
und darf nicht gelöscht werden.

Sobald der Ladezustand im Generator gebaut wird, wird die Animation über ein `<picture>`-Element
eingebunden — WebP zuerst, GIF als Fallback:

```html
<picture>
  <source srcset="img/loading.webp" type="image/webp" />
  <img src="img/loading.gif" alt="" width="171" height="240" />
</picture>
```

Das Bild ist dekorativ (der Ladezustand wird per Text bzw. Live-Region angesagt), daher `alt=""`.
`width`/`height` immer setzen, damit kein Layout Shift entsteht.

## Neu erzeugen

Beide Dateien stammen aus derselben Quelle und müssen bei Änderungen zusammen neu erzeugt werden,
damit Maße, Framerate und Laufzeit identisch bleiben.

Schritt 1 — Zwischen-GIF (skaliert, Transparenz erhalten, temporäre Datei):

```bash
ffmpeg -y -i docs/design/loading-original.gif \
  -filter_complex "fps=12.5,scale=-1:240:flags=lanczos,split[a][b];[a]palettegen=max_colors=255:reserve_transparent=1[p];[b][p]paletteuse=alpha_threshold=128:dither=sierra2_4a" \
  -loop 0 tmp/loading-scaled.gif
```

Schritt 2 — WebP daraus (`gif2webp` aus libwebp ≥ 1.6):

```bash
gif2webp -lossy -q 75 -m 6 -min_size -metadata none tmp/loading-scaled.gif -o public/img/loading.webp
```

Das ausgelieferte `public/img/loading.gif` entsteht aus derselben Quelle, aber mit einer auf
32 Farben reduzierten Palette (401 KB). Es dient ausschließlich als Fallback; das WebP nutzt
die feinere 255-Farben-Zwischenstufe.

Hinweise:

- `-min_size` fasst identische Frames zusammen und macht echtes Frame-Differencing — ohne diese
  Option liegt das WebP bei über 200 KB.
- Der ffmpeg-Encoder `libwebp_anim` ist **keine** Alternative: seine Option `cr_threshold`
  (Conditional Replenishment) zerstört den Alpha-Kanal und hinterlässt deckende Blöcke.
- Zielbudget für das WebP: unter 150 KB.
