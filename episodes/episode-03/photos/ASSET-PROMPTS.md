# Episode 3 — New Home · photos

Episode 3 has a drawn (SVG) version of every scene. A photo replaces the drawing when its key is in
`READY_PHOTOS` (section "SCENE ART" of `episode-03.js`); a missing file never shows as a broken image.
Scene 2 uses the real Palm Court lobby photo from Episode 2 (the one with Daniel at the desk).

## How it works now

- **Most backgrounds are photos without people.** The Millers and Buddy are separate cut-outs
  (`cast/*.webp`, transparent) placed on top of the photo. Three photos already have the people in them:
  the hotel (David), the house (David, Rachel, Buddy sitting; `s4-miller-house-glove.webp` = Buddy with
  your glove, laid on top while he has it) and the hallway (Rachel) — see `PH_CAST` in `episode-03.js`
  (x = centre in % of the photo width, h = height in %, Buddy: w = width, b = gap under his paws).
- On phones (tall screens) the cut-out people move closer to the middle and a little smaller; the photos with
  people pan to them (see `data-ph` rules in `episode-03.css`).
- `avatars/*.webp` (256 × 256) are the faces in the dialogue, on the phone and in People.

## Add a photo

1. Save it here with the exact file name below (16:9 WebP, 1672 × 941, ~100–300 KB).
2. Add its key to `READY_PHOTOS`. Keep the important part in the middle third — phones crop the sides
   (the bedroom keeps its right side, with the desk, in view).

## Slots

| key | file | status |
|---|---|---|
| `roomAm` | `s1-room-308-morning.webp` | ✅ |
| `hotelOut` | `s3-hotel-outside-day.webp` | ✅ (David and the car are in the photo) |
| `carRide` | `s3-car-ride.webp` | ✅ (David is driving in the photo) |
| `houseFront` | `s4-miller-house.webp` + `s4-miller-house-glove.webp` | ✅ (David, Rachel and Buddy are in the photo) |
| `entry` | `s5-hallway.webp` | ✅ (Rachel and the Hawks poster are in the photo) |
| `kitchen` | `s5-kitchen.webp` | ✅ |
| `living` | `s5-living-room.webp` | ✅ |
| `yard` | `s5-backyard.webp` | ✅ (+ the tennis ball photo on the grass) |
| `bedroom` | `s6-bedroom-box.webp` | ✅ |
| `door` | `s7-alex-doorway.webp` | ✅ (Alex is a cut-out in the doorway) |
| `bedroomMoved` | `s6-bedroom-box-floor.webp` | ⏳ drawing — same room and angle as `s6-bedroom-box`, box on the floor next to the desk, a red cable hanging out |
| `dining` | `s8-dining-evening.webp` | ⏳ drawing — 6 PM, golden light, a table with spaghetti and meatballs, garlic bread, salad, a small jar of honey; window with sunset and palms. Empty chairs (the family is added as cut-outs) |
| `bedroomEve` | `s8-bedroom-evening.webp` | ✅ (Rachel is a cut-out at the door) |

## Close-ups (`closeups/`)

Shown on top of the text when the student taps a hotspot (`img:CLOSE('name')` in `episode-03.js`;
two pictures side by side: `img:[CLOSE('a'), CLOSE('b')]`). If a file is missing, only the text shows.

| file | hotspot |
|---|---|
| `car` | Scene 3 · Look at the car |
| `room-308` | Scene 1 · Look at the room number |
| `nightstand` | Scene 1 · Look at the nightstand (the charger) |
| `honey` | Scene 1 · Check your suitcase (the jar of honey) |
| `palm-court-hotel` | Scene 3 · Look back at the hotel |
| `millers-sign` | Scene 4 · Read the mailbox |
| `lemon-tree` | Scene 4 · Look at the tree |
| `hawks-photo` | Scene 5 · Look at the pictures (hallway) |
| `console` | Scene 5 · Look at the little table (hallway) |
| `fridge` | Scene 5 · Read the fridge |
| `oven` | Scene 5 · Peek into the oven |
| `bookshelf` | Scene 5 · Look at the shelves |
| `tv` | Scene 5 · Look at the TV (the note “FRIDAY = MOVIE NIGHT!” is written onto the photo) |
| `sofa` | Scene 5 · Try the sofa |
| `tennis-ball` | Scene 5 · Pick up the tennis ball (also lies on the grass in the yard photo) |
| `wardrobe` | Scene 5 · Open the wardrobe |
| `floor-lamp` | Scene 5 · Look at the lamp (living room) |
| `umbrella` | Scene 5 · Sit under the umbrella (backyard) |
| `bed` | Scene 6 · Sit on the bed |
| `tomato-soup` + `spaghetti` + `garlic-bread` | Scene 8 · Look at dinner |
| `box-note` | Scene 6 · the box close-up with the note |
| `box-cut` | Scene 6 · the box you move (cut-out) |

## Cut-outs (`cast/`) and faces (`avatars/`)

David (green V-neck sweater), Rachel (terracotta cardigan), Alex (charcoal hoodie, black visor; with
and without the laptop), Buddy (standing, sitting, with the tennis ball, with your red glove).

## Cover and memory

`../img/cover.webp` (Your Story tile, 480 × 360) — the Miller house photo — and `../img/memory-new-home.webp`
(Memories, 960 × 675) — the whole family with Buddy in front of the house.
