# Episode 4 — Meet Emily · photos

Every scene has a drawn (SVG) version, so the episode works without any photos.
A photo replaces a drawing when its file is here **and** its key is added in `episode-04.js`
(section "SCENE ART"): backgrounds → `READY_PHOTOS`, cut-outs → `READY_CAST`, Emily's face → `READY_AVATARS`,
Emily's three photos → `READY_GALLERY`. A missing file never shows as a broken image.

**Format:** backgrounds 16:9 WebP, 1672 × 941, ~100–300 KB. Keep the important part in the middle third (phones crop the sides).
**No people in the backgrounds** — Emily, the barista and the neighbor are separate transparent cut-outs, so they stay the same in every scene.
No text in the images (signs can be blank or blurred).

## Status (21 Nov 2026, after part 2)

**In the episode now:**
- Backgrounds — all 7. `s4-cafe-window-table` is the new one with the drinks and the camera on the table.
- Whole-frame scenes with Emily already in them (16:9, same shape as the backgrounds): `cast/emily-seated.webp` (Scenes 4 and 8, at the table)
  and `cast/emily-outside.webp` (Scene 7, waving outside Corner Cup).
- Cut-outs: `emily` (Scene 6), `emily-camera` (Scene 5 — she sits behind the table), `emily-wave` (Scene 3), `barista`, `buddy`.
- Avatars `emily`, `barista`; gallery `beach`, `hills`, `hidden`.
- Props: `cup` (the cup game and Scene 6), `menu` (order game, clickable rows — `MENU_ROWS` in `d-render.js`),
  `route-map` (Scene 2 route game — the routes are traced over it, `ROUTE_PH`), `pin-card` (the map card in Emily's chat),
  `table-cup` and `table-phone` (close-ups for “Look at your cup” / “Look at your phone”).
- The printed “Kevin” was removed from the two table close-ups: the game writes the student's own misheard name
  on every cup sleeve (`nameTag`, positions in `PH_CAST` … `tag:[x, y, width, tilt]` and `CLOSEUP_TAGS`).
- Cover and both memories (`../img/`) are made from `emily-seated` and `emily-outside`.

**Still missing:** `cast/neighbor.webp` (Scene 2, the woman with the dog). Until it exists, nobody stands on the street photo — the dialogue still works.

To add a picture later: put the file in place and add its name to the matching `READY_…` list in `episode-04.js` (section "SCENE ART").
Positions on each photo: `PH_CAST` (x = centre, h = height, b = bottom, all in % of the photo).

## Emily — keep her the same everywhere
> Emily, a 17-year-old American girl, natural light-brown slightly wavy hair past the shoulders, friendly expressive face, light freckles,
> cream knit top, light-blue jeans, white sneakers, an old silver-and-black film camera on a brown leather strap across her body.
> Realistic proportions, natural hands, warm Californian daylight, photorealistic, shot on a 35mm lens.

Use the same description (and, if your tool allows it, the first Emily image as a reference) for every Emily picture.

## Backgrounds (`photos/`)

| key | file | prompt |
|---|---|---|
| `bedroomAm` | `s1-bedroom-morning.webp` | The **same guest room as `episode-03/photos/s8-bedroom-evening.webp`** (white double door on the left, wooden shelf with a trailing plant and a small sunset photo, bed with a navy headboard and a blue knitted throw, desk under a large window with palm trees) — but at 8:45 AM: bright morning sun, soft beams on the floor, blue sky. A smartphone lies on the desk with its screen lit. A golden retriever sleeps curled on the rug at the foot of the bed. No box, no suitcase. |
| `street` | `s2-neighborhood-street.webp` | A quiet residential street in Los Angeles at 10:45 AM, eye level from the sidewalk: tall palm trees, stucco houses with red tile roofs, parked cars, a crosswalk and a traffic light ahead. At the far corner: a small café with an orange-and-cream striped awning next to a tiny flower shop; across the street from it, a navy-blue independent bookstore with a crescent-moon sign and an orange cat sleeping in the window. Clear sky, warm light. No readable text. |
| `cafe` | `s3-cafe-counter.webp` | Interior of a cozy independent Los Angeles coffee shop, view of the counter: chrome espresso machine, a blank chalk menu board, wooden shelves with colorful mugs, a glass pastry case with croissants, banana bread and a big cinnamon roll, pendant lights, plants, warm cream walls and wood. A large window on the left with daylight and a palm tree. Empty space behind the counter (the barista is a cut-out). |
| `window` | `s4-cafe-window-table.webp` | The same café, a small wooden table by the big front window, seen from your chair. Through the window: the street, a palm tree and the navy bookstore across the road with the cat in the window. Warm late-morning light on the table. The chair across the table is empty (Emily is a cut-out). |
| `windowQuiet` | `s6-cafe-window-quiet.webp` | Exactly the same view as `s4-cafe-window-table`, a little later: softer, slightly dimmer light, fewer people outside, the café quieter. |
| `outside` | `s7-cafe-outside.webp` | Outside the café at noon: cream stucco front, orange-and-cream striped awning, big window with a warm interior, a wooden door, a chalkboard A-frame sign (blank), potted plants, palm trees, a sidewalk. On the right, across the street, the navy bookstore with the orange cat. Bright sun, a yellow car passing. |
| `bedroomPm` | `s9-bedroom-afternoon.webp` | The same guest room as `s1-bedroom-morning`, at 4:30 PM: warm, low golden sunlight from the window, long soft shadows, calm. The phone lies on the bed. The golden retriever asleep on the rug. |

## Cut-outs (`photos/cast/`, transparent WebP, ~900 px tall)

| file | prompt |
|---|---|
| `emily.webp` | Emily (see above), waist-up, sitting at a café table, leaning forward a little, smiling and talking, hands relaxed. Transparent background. |
| `emily-camera.webp` | Emily, waist-up, sitting, holding her film camera and showing the screen/viewfinder to the viewer, laughing. Transparent background. |
| `emily-full.webp` | Emily, full body, standing on a sidewalk, waving goodbye with one hand, camera on the strap. Transparent background. |
| `barista.webp` | A friendly young American barista (Marcus), dark green T-shirt, brown canvas apron, short dark hair, a cap, smiling, waist-up behind a counter. Transparent background. |
| `neighbor.webp` | A woman in her 50s in a light-blue shirt and a straw sun hat, holding the leash of a small fluffy white dog, waist-up. Transparent background. |

## Emily's face (`photos/avatars/emily.webp`, 256 × 256)
Emily's head and shoulders, smiling, soft background — the same Emily as the cut-outs.

## Emily's three photos (`photos/gallery/`, 4:3, ~1000 × 750)

| key | file | prompt |
|---|---|---|
| `beach` | `gallery/beach.webp` | Sunset over the Pacific seen from the sand near a pier with a Ferris wheel, film-photo look. No people close up. |
| `hills` | `gallery/hills.webp` | Los Angeles from the hills at blue hour: the whole city starting to glow, a palm tree silhouette. No signs or text. |
| `hidden` | `gallery/hidden.webp` | The upstairs reading nook of a small independent bookstore: tall shelves, a warm lamp, an old armchair with an orange cat asleep on it. |

## Cover and memories (`../img/`, made from the photos)
`cover.webp` (480 × 360), `memory-first-coffee.webp` and `memory-first-friend.webp` (960 × 675).
Replace them with photos of the same name and size if you like — no code change needed.
To export new stills of the drawings: open the course with `?preview=1` and run `LilaArt.ep4.scene('window')` / `LilaArt.ep4.cast(['emily@table','tableFg'])` in the console.
