# Life in LA · Episode 4 — Meet Emily ☕ · *One coffee. A new friendship. And a little unexpected drama.*

Season 1 · Day 3 (Monday, August 19) · A2+–B1 · ~40–50 min · runs on the shared player (`episodes/engine/`).

## Files
```
index.html                         ← updated: loads episode-04.css and episode-04.js (after Episode 3)
episodes/engine/lila-engine.js     ← small addition: 'cafe' ambience + 'steam' and 'snap' sounds
episodes/episode-04/episode-04.js  ← Episode 4: story, art, interactions, teacher mode, final mission, saving, reset
episodes/episode-04/episode-04.css
episodes/episode-04/img/           ← cover.webp (Your Story) + memory-first-coffee.webp + memory-first-friend.webp
episodes/episode-04/photos/        ← photos, cut-outs, props (status: photos/ASSET-PROMPTS.md)
```
Script order in index.html: engine → episode-01 → episode-02 → episode-03 → episode-04.

## The episode
**Act I — The Meetup**
1. **One New Message** (your room, 8:45) — Emily's text (follows up on your Day 2 reply), a reading check inside the phone, your reply (3 options), speaking moment “Have you tried any good coffee in LA yet?”, Emily shares the location.
2. **Finding the Coffee Shop** (10:45) — ask a neighbor for directions, a simple route map (3 routes, one matches), speaking challenge “Explain how to get there”, the door opens.
3. **Can I Get a Latte?** (10:58) — the menu (drink → size → milk; iced tea has no milk), the order sentence (“I'd like…” / “Can I get…?”), five speaking turns with the barista, the wrong name on the cup, 3 replies. *Map: Coffee Shop.* *Coffee Lover 1/5.*

**Act II — Getting to Know Emily**

4. **The First Five Minutes** — Emily comments on your drink, 1 + 3 speaking questions (one at a time; the teacher picks how Emily reacts), then you ask Emily at least 2 questions.
5. **More Than Small Talk** — Emily's three photos, choose a place, Emily answers, “Convince Emily” (30–45 s, optional timer).
6. **The Jake Situation** — who have you met, “You know Jake?”, 3 reactions, what Emily does (and doesn't) know, Jake's text, react out loud, ask / joke / change the subject.

**Act III — A New Friendship**

7. **An Unexpected Invitation** — the beach this weekend, 3 answers, ask at least 2 questions about the plan (nothing is confirmed — Episode 5 will say).
8. **Your First Real Hangout** — Final mission: 4 speaking turns with Emily, optional teacher feedback (1–5), confirm → ending at the Miller house (4:30 PM), Emily's and Jake's texts, TO BE CONTINUED → NEXT EPISODE: THE BEACH 🏖️ → completion screen.

## Speaking & teacher mode
- **Speaking turns** show one question at a time with three hint levels, opened one by one: 🔑 keywords → 🧩 sentence starters → 💡 example. Then “✓ I said it”. Optional: timer, recording on this device, typing (homework).
- **Nothing listens to or grades speech.** Emily's reactions to free answers are neutral or picked by the teacher/student (“How does Emily react?”).
- **👩‍🏫 Teacher mode** (button in the top bar, remembered on this device): ◀ Back / Next ▶ step, 💡 Hint, 🙈 Hide, 🔁 Repeat, ✓ Spoken, 📖 Vocabulary review. Keys: ← → and H.
- **Final mission** has its own controls: previous / next line, show / hide hint, repeat the question, mark turn completed. Assessment: Communication, Interaction, Fluency, Vocabulary — 1–5 or skip, plus a note. A separate “Confirm: mission complete” button (with a confirmation) prevents accidental completion.

## Saving
Everything goes into the existing `story` jsonb of `life_in_la_progress` — **no Supabase migration needed**
(`supabase/01-episode-01-story.sql` already added the column and the RLS policies: each student reads and writes only their own row).
Preview mode (`?preview=1`) keeps its own copy in this browser only and never touches the database.

Episode 4 lives in `DATA.episodes.ep4`. Flags kept for Episode 5 (also in `forEp5`):
`emilyFirstReply` (yes / need / name), `coffeeOrder` {drink, size, milk, price, sentence}, `cupReply` (newname / notclose / laname),
`preferredLAPlace` (beach / hills / hidden), `jakeSituationReaction` {reaction: curious / direct / careful, followUp: ask / joke / change},
`beachInvitationResponse` (enthusiastic / curious / careful), `finalMissionCompleted`, `rel` (friendship moments), `emilyFacts`.
`final` = turns, questions asked, teacher rubric + note. The Jake–Alex story is **not** revealed; the beach plan is **not** confirmed.

Read from earlier episodes (only if those saves exist): Episode 3 `emilyReply`; Episode 2 `completed` (for the “diner” line).

## Completion (idempotent — safe on replay)
Episode 4 → done, Story: The Beach → current (Episode 5 isn't installed yet → “coming soon”), Day 3.
Map: Coffee Shop visited (+ a teaser note on Santa Monica Beach). People: Emily's card gets her relationship and what you found out.
Memories: First Coffee + First Friend. Achievements: New Friend, Confident Speaker, Coffee Lover 1/5.
Backpack: 12 key phrases (two reviewed from Episode 2; “Count me in.” was already on the starter list) + 3 ordering phrases + the coffee cup sleeve.
Journal: “My First Coffee in LA” (auto) + an optional reflection (always a new entry).

## Testing in preview
`index.html?preview=1&ep=4` opens Episode 4 directly; `&scene=6` starts at a scene.

## Reset
Settings → Start over → “Reset Episode 4” removes Episode 4 only (Day 2 again, its phrases, memories, achievements, map visit, messages with ids `e4…`). Resetting Episodes 1–3 also resets Episode 4. The journal stays.

## Adding Episode 5
Create `episodes/episode-05/episode-05.js` and call `LilaEngine.register({ id:'ep5', n:5, storyId:'beach', … })`.
The “Next Episode” button in Episode 4's summary switches on by itself (`LilaEngine.has('ep5')`).
