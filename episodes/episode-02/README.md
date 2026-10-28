# Life in LA · Episode 2 — First Night in LA 🌙

## Files
```
index.html                         ← updated (loads the engine + both episodes, reset menu, player name)
episodes/engine/lila-engine.js     ← NEW shared player (dialogue, phone, mini-game tools, saving, map/people/backpack bridge)
episodes/engine/lila-engine.css    ← NEW shared player styles
episodes/episode-01/episode-01.js  ← Episode 1 content only (now runs on the shared engine)
episodes/episode-01/episode-01.css ← Episode 1 scene styles
episodes/episode-02/episode-02.js  ← Episode 2 content, art, mini-games, final mission
episodes/episode-02/episode-02.css
episodes/episode-02/img/           ← cover.webp (Your Story) + memory-first-night.webp (Memories)
episodes/episode-02/photos/        ← optional photo slots (see ASSET-PROMPTS.md)
```
Script order in index.html: engine → episode-01 → episode-02. Episode 1 photos stay where they are
(`episodes/episode-01/photos/`).

## Saving
Everything goes into the existing `story` jsonb of `life_in_la_progress` — **no Supabase migration needed**.
Episode 2 lives in `DATA.episodes.ep2`. Old Episode 1 saves load unchanged.

Choices kept for Episode 3 (`DATA.episodes.ep2.flags`, plus `forEp3`):
`hotelChoice` (call / ask / self), `meal`, `drink`, `fries`, `orderMode` (here / togo), `changedOrder`,
`jakeQuestions`, `jakeConnection: "knows-the-millers-son"`, `rachelReplyStyle` (friendly / professional / question / own),
`mentionedJake`, `mysteryChoice` (reply / ignore / mia), `finalMissionCompleted`; `completed` = episode done.
The Millers' son is never named or revealed — Jake only hints.

## Reset
Settings → Start over: "Reset episode" for Episode 1 also resets Episode 2 (it builds on Episode 1).
Resetting Episode 2 keeps Episode 1. The journal is kept in both cases.

## Adding Episode 3
Create `episodes/episode-03/episode-03.js` and call `LilaEngine.register({ id:'ep3', n:3, … })`
like Episode 2 does; the "Continue to Episode 3" button and the homepage card switch on by themselves
(`LilaEngine.has('ep3')`).
