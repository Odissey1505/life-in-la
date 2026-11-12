# Life in LA · Episode 3 — New Home 🏡 · *A Place to Belong*

Season 1 · Day 2 · A2+–B1 · ~35–45 min · runs on the shared player (`episodes/engine/`).

## Files
```
index.html                         ← updated (loads Episode 3, Backpack filter by episode, story day/date, preview jump)
episodes/engine/lila-engine.js     ← updated (new ambiences & sounds, “Go to a scene…” in the pause menu,
                                      Replay/Memories card for finished episodes, “Continue Episode N” on the mission note)
episodes/episode-01/episode-01.js  ← one line: memoryId
episodes/episode-02/episode-02.js  ← memoryId + the Episode 3 title in its ending (“New Home”)
episodes/episode-03/episode-03.js  ← Episode 3: story, art, interactions, Final Mission, saving, reset
episodes/episode-03/episode-03.css
episodes/episode-03/img/           ← cover.webp (Your Story) + memory-new-home.webp (Memories)
episodes/episode-03/photos/        ← scene photos, cast/ (cut-out people + Buddy), avatars/ — see ASSET-PROMPTS.md
```
Script order in index.html: engine → episode-01 → episode-02 → episode-03.

## The episode
1. **A New Morning** (Room 308, 10:42) — lock screen with 3 messages, how do you feel, speaking moment.
2. **One Last Problem** (lobby, Daniel) — return the key card, the forgotten charger, “Could you check if…?”, listening.
3. **The Ride Home** (David, silver car) — your first night, choose a topic (family / Buddy / neighborhood / your own question), 3 listening checks.
4. **Welcome to the Millers** — Rachel, Buddy steals your glove, get it back, introduce yourself. *People: David, Rachel, Buddy.* *Map: Miller House.*
5. **Make Yourself at Home** — house tour (kitchen, living room, backyard, then your room), polite requests, house rules (listening × 3), grammar discovery *Can I / Could I / Is it okay if I / Do you mind if I*.
6. **The Unexpected Room** — the box and the note “PLEASE DON'T TOUCH. — A.”: ask Rachel / leave it / move it.
7. **The Mystery Text** — Alex. His text arrives in the same chat as last night's message → he sent it. Apology (3 responses), Jake: “kind of a long story”. *Unknown number → Alex Miller.*
8. **The First Evening** — dinner at six, Emily's text, Jake's text, cliffhanger → **Final Mission “Welcome Home!”** → optional journal reflection → TO BE CONTINUED → summary.

## Saving
Everything goes into the existing `story` jsonb of `life_in_la_progress` — **no Supabase migration needed**
(`supabase/01-episode-01-story.sql` already added the column and the RLS policies). Episode 3 lives in
`DATA.episodes.ep3`. Preview mode (`?preview=1`) keeps its own copy in the browser only.

Choices kept for Episode 4 (`DATA.episodes.ep3.flags`, plus `forEp4`): `morningFeeling`, `hotelHelp`,
`davidTopic`, `buddyReact`, `gloveWay`, `rooms`, `rulesDone`, `boxChoice` (ask / leave / move), `cableOut`,
`apology` (understanding / honest / friendly), `helpedAlex`, `alexRevealed`, `emilyIntro`, `emilyReply`
(love / time / where), `finalMissionCompleted`; `completed` = episode done. The Jake–Alex story is **not** revealed.

Read from Episode 2 (only if that save exists): `meal`, `mysteryChoice`, `mentionedJake`, `rachelReplyStyle`.

## Testing in preview
`index.html?preview=1&ep=3` opens Episode 3 directly (even if Episode 2 isn't finished);
`&scene=5` starts at a scene. Preview only — students without `?preview=1` always go through the normal locks.

## Reset
Settings → Start over → “Reset episode” for Episode 3 removes Episode 3 only (the Room 308 key card comes back,
the unknown number is a mystery again, Day 1). Resetting Episode 1 or 2 also resets Episode 3. The journal stays.

## Adding Episode 4
Create `episodes/episode-04/episode-04.js` and call `LilaEngine.register({ id:'ep4', n:4, storyId:'meet-emily', … })`.
Episode 3's summary button “Continue to Episode 4” and the homepage card switch on by themselves (`LilaEngine.has('ep4')`).
