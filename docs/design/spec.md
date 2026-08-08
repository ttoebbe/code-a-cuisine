# Design specification — Code à Cuisine

Extracted from the Figma source file on 2026-08-07.
Source: `INBMbCpFbNuEhqzkAxmBhu` — pages **Design** and **Components**.

This file is the reference for design conformance. Values here come from Figma
only. Nothing is estimated and nothing is derived from the existing SCSS. Where
Figma does not define something, it says so explicitly.

---

## 1. Foundations

### 1.1 Colour styles — group `Rezepten`

The project palette. Note that the style **named** `#1E5515` does not carry that
value — the name is misleading, and `Middle green` is the style that actually
holds `1E5515`.

| Style name     | Actual value |
| -------------- | ------------ |
| `#1E5515`      | `#008000`    |
| `Green dark`   | `#103108`    |
| `cremy`        | `#FAF0E6`    |
| `Middle green` | `#1E5515`    |
| `olive green`  | `#396039`    |

Additional literal colours observed on frames and components, not bound to a
style:

| Value                                      | Where it appears                                              |
| ------------------------------------------ | ------------------------------------------------------------- |
| `#FAE0C6`                                  | primary button creme hover, secondary button creme hover fill |
| `#055E05`                                  | primary button green hover fill                               |
| `#C4D0C4`                                  | edit / delete / plus buttons, pagination                      |
| `#DBE0DB`                                  | recipe card (by results) default fill                         |
| `#D7DFD7`                                  | recipe card (by results) hover fill, check button             |
| `#E7ECE7`                                  | heart and minus button fills                                  |
| `#F5F5DC`, `#10310B`, `#FFFFFF`, `#000000` | various                                                       |

The second colour group in the file, `Quizzy` (blues and gradients), belongs to
a different project and is not used here. Ignore it.

`#8A38F5` appears as a 1px inner stroke on many elements — that is Figma's
component-set wrapper, not a design value.

### 1.2 Figma variables

Effectively absent — the file defines a single variable (`Blue`, `#030B2A`)
which is unused. All values live in classic styles and on nodes.

### 1.3 Type styles

Font family observed on components: **Quicksand**.
Line height is written as `size/lineHeight`; `Auto` means Figma's automatic
line height.

**Group `recipe generator` — the desktop scale:**

_Weight and resolved line height added 2026-08-08, read off every text node that
references the style (usage count in the last column). No style has a single
override anywhere in the file, so these values are exact, not representative._

| Style            | Size / line height | Weight | Resolved LH | Uses |
| ---------------- | ------------------ | ------ | ----------- | ---- |
| H1               | 104 / Auto         | 700    | 119.5       | 3    |
| H2               | 54 / 65            | 600    | 65          | 5    |
| H3               | 48 / Auto          | 600    | 60          | 3    |
| H4               | 40 / 104           | 700    | 41.6        | 8    |
| Card headlines   | 28 / Auto          | 600    | 35          | 31   |
| H5 SemiBold      | 24 / Auto          | 600    | 30          | 7    |
| H5               | 24 / Auto          | 500    | 30          | 67   |
| Button Text      | 24 / Auto          | 600    | 30          | 15   |
| small H + Labels | 20 / 20            | 500    | 20          | many |
| H6               | 18 / Auto          | 500    | 22.5        | 137  |
| p 18             | 18 / Auto          | 500    | 22.5        | 281  |
| p 16             | 16 / 20            | 500    | 20          | 157  |
| small text       | 14 / 10            | 500    | 10          | many |

Two things the resolved values settle:

- **The `104` of H4 is a percentage, not a pixel value.** Figma stores that style
  with `lineHeightUnit: FONT_SIZE_%`, so 40px × 104 % = 41.6px. The apparent
  260 % line height was a misreading of the export — C7 of the Befund report is
  void, and there is no source error here.
- **`H6` and `p 18` are the same values** — Quicksand 500, 18 / 22.5. The two
  styles differ in name only.

Every `Auto` in the family resolves to **125 %** except H1 (114.9 %).

**Group `mobile`:**

| Style | Size / line height |
| ----- | ------------------ |
| h1    | 32 / Auto          |
| h2    | 20 / Auto          |
| h3    | 18 / Auto          |

**Ungrouped `Mob.` styles** — same readout as above:

| Style            | Size / line height | Weight | Resolved LH | Uses |
| ---------------- | ------------------ | ------ | ----------- | ---- |
| Mob. H1          | 64 / 72            | 700    | 72          | 1    |
| Mob. H2          | 32 / Auto          | 600    | 40          | 3    |
| Mob. H3          | 24 / Auto          | 600    | 30          | 25   |
| Mob. H4          | 18 / Auto          | 600    | 22.5        | 49   |
| Mob. Button text | 16 / Auto          | 600    | 20          | 25   |

`Mob. H3` carries exactly the values of `H5 SemiBold`, and `Mob. H4` differs from
`H6` in weight only (600 against 500). Every mobile button label in the file —
`Get started`, `View`, `Generate recipe`, `Cookbook` — is `Mob. Button text`;
the 24px `Button Text` style appears on desktop only.

**Group `old styles`** — H1 40, H2 24, H3 20, Body 16, button 16, Button Text 24,
Label - Box content 14, Board Card 14, Paragraph 14/20, Answers 18/20. This group
appears to be legacy and is not referenced by the current screens. Treat as
non-authoritative.

### 1.4 Layout guide style `Grid 1400px+`

| Property     | Value            |
| ------------ | ---------------- |
| Type         | Columns, centred |
| Count        | 12               |
| Column width | 80               |
| Gutter       | 32               |
| Offset       | 0                |
| Colour       | `#FF0000` at 10% |

Resulting content width: 12 × 80 + 11 × 32 = **1312 px**.

Caveat: the style exists in the file but is not applied to the screen frames
that were inspected (e.g. `Cookbook` has an empty layout guide section). It
describes the intended grid rather than a grid actually laid over the mockups.

---

## 2. Breakpoints and responsive behaviour

The source file contains an explicit instruction frame, `How to Widescreen`,
on the Design page. Translated:

> To keep the design consistent on larger screens we provide a widescreen
> layout solution. Please introduce a **breakpoint at 1440px**.
>
> **Design guidelines:**
>
> - The content area keeps the same width as in the desktop layout.
> - The background expands to the full screen width.
>
> **Home page:**
>
> - From 1440px, use the plates that live in "Components".

This is the only place in the file where responsive behaviour is specified.

### Artboard widths

| Tier       | Width                                                    |
| ---------- | -------------------------------------------------------- |
| Mobile     | **375**                                                  |
| Desktop    | **1440**                                                 |
| Widescreen | 3400 / 3440 (illustrative canvas, not a target viewport) |

**Not defined in Figma:** any behaviour between 375 and 1440. There are no
tablet or intermediate artboards. Every layout decision in that range is an
implementation decision, not a design deviation — but it must not cause content
to be clipped.

---

## 3. Frames

### 3.1 Desktop (width 1440 throughout)

| Frame                             | Height | Layout                      |
| --------------------------------- | ------ | --------------------------- |
| hero (1)                          | 1433   | no auto-layout              |
| hero (2)                          | 1024   | no auto-layout              |
| Step 1 Generate recipe            | 1024   | vertical, gap 64            |
| Step 1 Generate recipe +list (×2) | 1024   | vertical, gap 64            |
| Step 2 Preferences                | 1024   | vertical, gap 64, padding 0 |
| Loading                           | 1024   | no auto-layout              |
| Rresults                          | 1958   | vertical, gap 64            |
| One recipe view – one cook        | 1958   | vertical, gap 64            |
| Cookbook                          | 1696   | no auto-layout              |
| IT recipes                        | 1765   | vertical, gap 40            |

Section spacing on desktop is **64**, except the cuisine list page (`IT recipes`)
which uses **40**.

Most generator screens are 1024 tall — i.e. designed to fit a 1440 × 1024
viewport without scrolling.

### 3.2 Mobile (width 375 throughout)

| Frame                         | Height                   |
| ----------------------------- | ------------------------ |
| Home                          | 812                      |
| Generate recipe               | 812                      |
| Generate recipe_filled in     | 960                      |
| Preferences                   | 1026                     |
| Loading                       | 812                      |
| Results                       | 1498                     |
| Recipe                        | 2154                     |
| Cookbook                      | 2590                     |
| List recipes of one categorie | 1831 (padding-bottom 40) |

All mobile frames use vertical auto-layout with gap **40**.

### 3.3 Widescreen

| Frame             | Size        |
| ----------------- | ----------- |
| Widescreen-Design | 3400 × 1440 |
| Widescreen        | 3440 × 1440 |

### 3.4 Overlays

| Element        | Size      | Details                                                |
| -------------- | --------- | ------------------------------------------------------ |
| Pop-up desktop | 567 × 345 | gap 0                                                  |
| Pop-up mobile  | 340 × 314 | padding 24 / 16 / 24 / 24, radius 30, fill olive green |

---

## 4. Components

All measured on the `Components Desktop` frame. Widths marked _hug_ size to
content; _fill_ stretches to the parent. Padding is written
`horizontal / vertical` unless all four sides are listed.

### 4.1 Menu bar (header)

| Property | Value                               |
| -------- | ----------------------------------- |
| Size     | 1440 × 136                          |
| Layout   | vertical, gap 32                    |
| Padding  | left 68, top 40, right 40, bottom 0 |
| Radius   | 0                                   |
| Variants | `Default`, `creamy colour`          |

The left and right padding are **asymmetric** (68 vs 40). Both variants share
identical geometry; only the fill palette differs (`Default` uses Green dark /
cremy / Middle green, `creamy colour` uses cremy / `#FAF0E6` / `#396039`).

### 4.2 Primary button — green

|         | Default                 | Hover          |
| ------- | ----------------------- | -------------- |
| Size    | 183 _hug_ × 60          | 186 _hug_ × 60 |
| Padding | 26 / 16                 | 26 / 16        |
| Gap     | 10                      | 10             |
| Radius  | **0**                   | **0**          |
| Fill    | `olive green` `#396039` | `#055E05`      |
| Text    | `cremy`                 | `#FFFFFF`      |

### 4.3 Primary button — creme

|         | Default                  | Hover          |
| ------- | ------------------------ | -------------- |
| Size    | 183 _hug_ × 60           | 186 _hug_ × 60 |
| Padding | 26 / 16                  | 26 / 16        |
| Gap     | 10                       | 10             |
| Radius  | **0**                    | **0**          |
| Fill    | `cremy` `#FAF0E6`        | `#FAE0C6`      |
| Text    | `Middle green` `#1E5515` | `Middle green` |

### 4.4 Secondary button — creme

|         | Default            | hover                        |
| ------- | ------------------ | ---------------------------- |
| Size    | 236 _hug_ × 52     | 236 _hug_ × 52               |
| Padding | 26 / 16            | 26 / 16                      |
| Gap     | 10                 | 10                           |
| Radius  | **5**              | **0**                        |
| Fill    | none (transparent) | `#FAE0C6` at 20%             |
| Stroke  | none               | `#FAF0E6` at 50%, 2px inside |
| Text    | `cremy`            | —                            |

The radius differs between the two states (5 → 0). This is an inconsistency in
the source, not a deliberate transition.

### 4.5 Secondary button — green

Same component geometry as 4.4 (236 × 52, padding 26 / 16, gap 10). Variants
`Default` and `hover`. Green palette instead of creme.

### 4.6 Input field

| Property | Value                                     |
| -------- | ----------------------------------------- |
| Size     | 300 × 36 _hug_                            |
| Layout   | vertical, gap 10, no padding              |
| Radius   | 0                                         |
| Fill     | `#FAF0E6` at 80%                          |
| Variants | `default`, `on type` — identical geometry |

`on type` adds `#10310B` at 0% and 40% to the selection colours; the visible
difference is the caret/text, not the box.

### 4.7 Drop down button

|         | default        | hover                     | on click                     |
| ------- | -------------- | ------------------------- | ---------------------------- |
| Size    | 104 _hug_ × 34 | 104 _hug_ × 34            | 114 _hug_ × 34               |
| Padding | 16 / 8         | 16 / 8                    | 16 / 8                       |
| Gap     | 8              | 8                         | 8                            |
| Radius  | **16**         | **16**                    | **16**                       |
| Fill    | `#FFFFFF`      | `#FFFFFF`                 | `#FAF0E6` at 60%             |
| Stroke  | none           | `olive green`, 1px inside | `#396039` at 50%, 1px inside |

### 4.8 Tags / chips

|         | default        | active           |
| ------- | -------------- | ---------------- |
| Size    | 77 _hug_ × 32  | 77 _hug_ × 32    |
| Padding | 12 / 6         | 12 / 6           |
| Gap     | 10             | 10               |
| Radius  | **30**         | **30**           |
| Fill    | `cremy`        | `#396039` at 20% |
| Text    | `Middle green` | `Green dark`     |

A third variant, `hover`, uses fill `#FAE0C6` at 100% with `Middle green` text,
same geometry.

### 4.9 Imput ingredient (the add-ingredient form)

|         | default                    | Autocomplete       |
| ------- | -------------------------- | ------------------ |
| Size    | 577 _hug_ × 176            | 577 _hug_ × 209    |
| Layout  | horizontal, gap 32         | horizontal, gap 32 |
| Padding | 0 horizontal / 25 vertical | 0 / 25             |
| Radius  | **20**                     | **20**             |
| Fill    | `#396039` at 30%           | `#396039` at 30%   |

The autocomplete variant is 33px taller — the suggestion list expands the box
rather than overlaying it.

**Correction — the `0 horizontal` is not the card's inner spacing.** The value
was read off the outermost auto-layout frame of the Figma component, and that
frame really does carry 0. In the component itself the side spacing sits on the
children, which were not measured one by one when this spec was written. Taken
literally, `0` puts the label and the input field flush against the card edge.
Only the vertical 25 is a usable number here; anything horizontal has to be
re-measured on the child frames in Figma. The implementation therefore keeps its
own side padding — see the "Nacharbeiten" section of
[fixes-2026-08-07.md](fixes-2026-08-07.md).

### 4.10 Ingredients list

|         | empty            | Filled in              |
| ------- | ---------------- | ---------------------- |
| Size    | 478 _fill_ × 209 | 478 _fill_ × 230 _hug_ |
| Layout  | vertical, gap 24 | vertical, gap 24       |
| Padding | 24 all round     | 24 all round           |
| Radius  | **20**           | **20**                 |
| Fill    | `#396039` at 30% | `#396039` at 30%       |

### 4.11 Ingredient in the list (a single row)

| Property     | Value            |
| ------------ | ---------------- |
| Size         | 470 _fill_ × 184 |
| Layout       | vertical, gap 24 |
| Padding      | 20 all round     |
| Radius       | **8**            |
| Fill         | none             |
| Clip content | yes              |

### 4.12 Row action buttons

| Component     | Size                 | Padding | Gap | Radius | Fill                    |
| ------------- | -------------------- | ------- | --- | ------ | ----------------------- |
| edit          | 101 _hug_ × 46       | 14 / 14 | 8   | 5      | `#C4D0C4`               |
| delete        | 101 _hug_ × 47 _hug_ | 14 / 14 | 8   | 5      | `#C4D0C4`               |
| button Add to | 152 _hug_ × 64 _hug_ | 14 / 14 | 8   | 5      | none, text `#1E5515`    |
| check         | 99 _hug_ × 47 _hug_  | 14 / 14 | 7   | 5      | none, text `Green dark` |

### 4.13 Icon buttons

| Component                                     | Size                | Padding            | Gap | Radius | Fill      |
| --------------------------------------------- | ------------------- | ------------------ | --- | ------ | --------- |
| Heart (3 variants: default / hover / clicked) | 52 × 48             | 0 (clicked: 6 / 7) | 10  | 5      | `#E7ECE7` |
| Minus (default / hover / on press)            | 28 _hug_ × 28 _hug_ | 4 / 4              | 10  | 4      | `#E7ECE7` |
| Plus (default / hover / on press)             | 28 _hug_ × 28 _hug_ | 4 / 4              | 10  | 4      | `#C4D0C4` |

Note: Minus and Plus are **28 × 28** — well below the 44px touch-target
guideline the project follows. Figma does not account for touch targets.

### 4.14 Recipe card (by results)

|         | Default               | hover                 |
| ------- | --------------------- | --------------------- |
| Size    | 411 _hug_ × 338 _hug_ | 411 _hug_ × 338 _hug_ |
| Layout  | vertical, gap 48      | vertical, gap 48      |
| Padding | 24 / 32               | 24 / 32               |
| Radius  | **20**                | **20**                |
| Fill    | `#DBE0DB` at 100%     | `#D7DFD7` at 90%      |

The component set holds three variants and places two cards side by side with a
gap of **31** (wrapper 893 × 379).

The cloche in front of the recipe number is **40 × 28**, on the mobile card as
well — all ten places that use it in the file agree. It is a raster fill, not a
vector: a 1024 × 1024 source cropped to x 576–956, y 58–321, so it cannot be
exported as SVG the way the other icons are.

### 4.15 Recipe card (in cook book)

|         | default               | hover                    |
| ------- | --------------------- | ------------------------ |
| Size    | 400 _hug_ × 443 _hug_ | 400 _hug_ × 446.25 _hug_ |
| Layout  | vertical, gap 8       | vertical, gap 8          |
| Padding | 0                     | 0                        |
| Radius  | **0**                 | **0**                    |
| Fill    | none                  | none                     |

Cookbook cards are image-led and carry no container fill or radius — unlike the
result cards (4.14).

### 4.16 Most liked recipes (row card)

|         | Default               | hover                 |
| ------- | --------------------- | --------------------- |
| Size    | 370 _hug_ × 124 _hug_ | 370 _hug_ × 124 _hug_ |
| Layout  | horizontal, gap 24    | horizontal, gap 24    |
| Padding | 12 / 16               | 12 / 16               |
| Radius  | **16**                | **16**                |
| Fill    | `#DBE0DB` at 70%      | `#DBE0DB` at 100%     |

Wrapper: 828 × 164, gap 40, padding 24 / 20 — i.e. two cards per row.

### 4.17 Pagination

|         | default                   | hover         | active        |
| ------- | ------------------------- | ------------- | ------------- |
| Size    | 33 _hug_ × 27             | 33 _hug_ × 27 | 33 _hug_ × 27 |
| Layout  | vertical, gap 10          | same          | same          |
| Padding | 8 horizontal / 0 vertical | same          | same          |
| Radius  | **2**                     | **2**         | **2**         |
| Fill    | `#C4D0C4` (hidden)        | `#C4D0C4`     | `#C4D0C4`     |
| Text    | `Green dark`              | `Green dark`  | `Green dark`  |

Wrapper: 163 × 59, gap 12, padding 20 / 16. The default state's fill is toggled
off — only hover and active show a background.

Same touch-target caveat as 4.13: 33 × 27 is below 44px.

### 4.18 Hero for single recipe view

Two sub-components, `Ingredients` and `Directions`, each:

| Property               | Value          |
| ---------------------- | -------------- |
| Size                   | 1152 × 147     |
| Position inside parent | x 20, y 20     |
| Radius                 | 0              |
| Text colour            | `Middle green` |

Parent: 400 _hug_ × 446.25 _hug_, vertical, gap 8.

The two variants are not the same height: `Ingredients` measures 1152 × 147,
`Directions` 1152 × 133. Their background rectangles are named the other way
round in the file (`Hero Directions` sits in the `Ingredients` variant) — the
variant name and the heading text are the reliable signal, the layer names are
not.

**Heading typography.** The desktop headings reference **no** text style; they
carry loose values. The mobile headings use `Mob. H3`.

| Where   | Family    | Size | Weight | Line height | Letter spacing | Text style |
| ------- | --------- | ---- | ------ | ----------- | -------------- | ---------- |
| Desktop | Quicksand | 32   | 600    | 40 (= 1.25) | 0              | _none_     |
| Mobile  | Quicksand | 24   | 600    | 30 (= 1.25) | 0              | `Mob. H3`  |

### 4.19 Hero for cuisine page (the six cuisine rows)

Six variants: `Italian`, `German`, `Gourmet`, `Japanese`, `Fusion`, `Indian`.
Each row:

| Property    | Value             |
| ----------- | ----------------- |
| Size        | 1143 _fill_ × 144 |
| Radius      | 0                 |
| Text colour | `Green dark`      |

The 144 is the `Italian` height. The variants differ: Italian 144, German 151,
Japanese 156, Gourmet 165, Fusion 132, Indian 132. Width is 1143 throughout.

**Heading typography.** Unlike the recipe view banners (4.18), these headings do
reference a shared text style, and they are a step larger.

| Where   | Family    | Size | Weight | Line height   | Letter spacing | Text style            |
| ------- | --------- | ---- | ------ | ------------- | -------------- | --------------------- |
| Desktop | Quicksand | 40   | 700    | 41.6 (= 1.04) | 0              | `recipe generator/H4` |
| Mobile  | Quicksand | 18   | 600    | 22.5 (= 1.25) | 0              | `Mob. H4`             |

All six desktop variants carry the same style with no overrides, as do all six
mobile variants.

### 4.20 Radius summary

Radius is not uniform across the design:

| Value | Used by                                                                                      |
| ----- | -------------------------------------------------------------------------------------------- |
| 0     | primary buttons (both), input field, menu bar, cookbook recipe card, cuisine rows, hero rows |
| 2     | pagination                                                                                   |
| 4     | plus / minus buttons                                                                         |
| 5     | secondary button (default only), edit / delete / add / check, heart                          |
| 8     | ingredient row                                                                               |
| 16    | drop down button, most-liked card                                                            |
| 20    | ingredient input, ingredients list, result recipe card                                       |
| 30    | tags / chips, mobile pop-up                                                                  |

There is no single button radius in this design. Any project-wide
`--radius-button` token will contradict at least one component.

### 4.21 Components Mobile

Frame 2061 × 2665. It mirrors the desktop set with the same component names.
Individual mobile component measurements were not taken separately — where a
mobile value is needed, measure it on this frame rather than scaling the desktop
value.

---

## 5. Notes from the source file

These are instructions the design team left in the file. They describe behaviour,
not appearance.

**Note 01 — Add ingredient button.** The plus icon adds the selected ingredient
to the list on the right. The most recently added ingredient appears at the top
of the list.

**Note 02 — Error pop-up.** Shown when the user has not entered enough
ingredients, when quantities are insufficient for the requested number of
portions (e.g. 5 servings), or in any other case where the input fails
validation.

**Note 03 — Loader.** A loading animation is shown during recipe generation, or
whenever there is a delay before the next view appears. The text stays in place
while the dots disappear one by one and then reappear the same way. In Figma the
animation is only visible in prototype mode.

**Note 04 — Back button.** Returns to the recipe results if the user reached the
page through the generator; returns to the cookbook if the recipe was opened
from there.

**Note on the loading animation (Components page).** The graphic elements needed
to build the animation are provided in the file, for those who want to customise
it themselves. Building it from scratch is not required, and a finished,
ready-to-use version is included in the same folder.

_Clarified 2026-08-08:_ "the file" and "the same folder" are not this Figma file
— the note carries a hyperlink to a Google Drive folder, and the parts live
there. What Figma holds is the assembled loader on the `Design` page: frames
`Loading` (1440 × 1024 and 375 × 812) → `Frame 1039` → `Loader` 253 × 309 →
`Code_Cuisine_Loading_Spinner 1` (253 × 291 desktop, 243 × 280 mobile), plus a
`Generating ...` heading in **Ubuntu** 48/700 (mobile 36/700) that references no
text style. The spinner fill carries a `gifRef` next to its `imageRef`: the
animation is an animated GIF, 436 × 613 at 329 frames, which is why it only
plays in prototype mode. That GIF is byte for byte the one already in the repo
at `docs/design/loading-original.gif`. The fill also crops it, `imageTransform`
cutting the top 18.3 %, so the loader shows at 0.869 rather than its native
0.711.

**Note on the hero component (Components page).** The size of this component
stays the same no matter how large the screen is. It is centred and does not
spread out. It only changes on smaller devices.

---

## 6. Open questions and conflicts

1. **Intermediate viewports are undefined.** No artboard exists between 375 and 1440. Behaviour in that range cannot be checked against Figma — only against
   the rule that content must not be clipped.

2. **Mobile artboard is 375, not 390.** Testing and development so far assumed 390. The narrower width is the design target.

3. **Type sizes below the course requirement.** The course checklist requires
   body text of at least 16px and fine print of at least 14px. Figma's
   `small text` is 14 with a line height of **10** — smaller than the glyph
   size, almost certainly a mistake in the source. `p 16` at 16/20 is the
   smallest usable body size. Where a Figma style would put body text below
   16px, the checklist takes precedence; flag rather than silently apply.

4. **Colour style `#1E5515` holds `#008000`.** The name and the value disagree.
   Use the value, and prefer `Middle green` when `#1E5515` is intended.

5. **Radius is inconsistent** — eight different values across the component set
   (see 4.20), including two different radii for the two states of the same
   secondary button.

6. **The `Grid 1400px+` style is not applied** to the screen frames. Its 1312px
   content width does not match the header's implied content width of
   1440 − 68 − 40 = 1332px, nor the 1152px of the hero rows (4.18) or the 1143px
   of the cuisine rows (4.19). These four numbers cannot all be right.

7. **Touch targets below 44px.** Plus and minus are 28 × 28, pagination items
   33 × 27. The design does not account for the project's touch-target rule;
   the implementation must enlarge the hit area without changing the visual.

8. **`old styles` group** overlaps in name with the current scale (H1, H2, H3,
   Button Text) but with different values. Confirm it is legacy before using any
   value from it.

9. **Widescreen artboards are 3400 and 3440 wide** — two different values for
   what should be the same tier. The 1440px breakpoint rule is authoritative;
   the artboard widths are illustrative.

10. **Card treatment differs by context.** Result cards (4.14) have fill and a
    20px radius; cookbook cards (4.15) have neither. If the implementation uses
    one card component for both, that is a deviation.
