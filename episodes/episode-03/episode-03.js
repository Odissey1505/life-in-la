/* =========================================================================
   LIFE IN LA — Season 1 · Episode 3: "NEW HOME" 🏡  ·  A Place to Belong
   -------------------------------------------------------------------------
   Day 2. The morning after Episode 2: checking out of the Palm Court Hotel
   (and one forgotten charger), the ride with David, the Miller house, Buddy
   and a stolen glove, a tour of the house, a mysterious box in the guest
   room — and who REALLY sent that message at 11:17 PM. Dinner at six, a text
   from Emily, and one more from Jake.

   Runs on the shared player (episodes/engine/lila-engine.js), which must be
   loaded first, after episode-01.js and episode-02.js.

   Continuity read from Episode 2's save (DATA.episodes.ep2.flags), only when
   it exists: meal, mysteryChoice (reply / ignore / mia), mentionedJake,
   rachelReplyStyle. Without an Episode 2 save, neutral lines are used —
   nothing about the student's earlier choices is made up.

   Saved per student in DATA.episodes.ep3: scene/node, choices, answers and
   flags — morningFeeling, hotelHelp, davidTopic, buddyReact, rooms,
   rulesDone, boxChoice, cableOut, apology, alexRevealed, emilyIntro,
   emilyReply, finalMissionCompleted. See the README.
   ========================================================================= */
(function(){
'use strict';
const E = window.LilaEngine;
if(!E){ console.error('Life in LA: episodes/engine/lila-engine.js must load before episode-03.js'); return; }
const { esc, isReduced, wait, fmtTime, SET, Sound, Voice, canRecord, makeRecorder, wordCount, st, peekSt, save, flushSave, taskDone,
        ensureAch, unlockAch, addPhrase, hasPhrase, giveItem, meet, thread, pushChat, EP, dlg, hideDlg, primary, head, lineHTML, toast,
        pop, closePop, vocabCard, showLine, next, valOf, showGame, hideGame, confirmBox, close, restartEpisode, talkBox, speakBox,
        hintLadder, keepImage, setBg, setCam, renderHotspots, hotspotsVisible, PHRASES: ALL_PHRASES } = E.api;
const { rng, svg, lin, rad, FONT, skyline, lights, palm, figure, nextArtId } = E.api.art;
const RENDER = {};
const EP_ID = 'ep3';
const BASE = 'episodes/episode-03/';
/* close-up photos shown when you tap a hotspot (photos/closeups/) */
const CLOSE = n => BASE + 'photos/closeups/' + n + '.webp';

/* =========================================================================
   LEARNING CONTENT
   The 10 target expressions of the episode (two of them were met earlier:
   “I'm looking forward to…” in Episode 2 and “Nice to meet you” in
   Episode 1 — reviewed, not added twice), plus the useful extras from the
   scenes. Each: simple English, Ukrainian, an example, a tag.
   `match` = what gets underlined (tap for meaning) in a dialogue line.
   ========================================================================= */
const PHRASES = {
  'make-yourself-home': { en:"Make yourself at home.", match:"make yourself at home", ua:"Почувайся як удома.",
                          simple:"A warm way to tell a guest: relax, this is your home now.", ex:"“Come on in — make yourself at home!”", tag:"friendly",
                          ctx:"Rachel says it when she shows you your room." },
  'help-yourself':      { en:"Help yourself to…", match:"help yourself to", ua:"Пригощайся… / Бери, не соромся…",
                          simple:"You can take it — you don't need to ask every time.", ex:"“Help yourself to snacks — the fridge is all yours!”", tag:"friendly",
                          ctx:"Rachel, in the kitchen." },
  'is-it-okay':         { en:"Is it okay if I…?", match:"is it okay if (?:I|we)", ua:"Нічого, якщо я…? / Можна я…?",
                          simple:"A friendly, polite way to ask for permission.", ex:"“Is it okay if I make myself a snack?”", tag:"polite",
                          ctx:"Asking to make a snack, and about the box on your desk." },
  'do-you-mind':        { en:"Do you mind if I…?", match:"do you mind if I", ua:"Ви не проти, якщо я…?",
                          simple:"A very polite way to ask for permission. Careful: “No, not at all!” means YES, go ahead.", ex:"“Do you mind if I watch TV here?” “Not at all!”", tag:"polite",
                          ctx:"Asking David about the TV in the living room." },
  'getting-used':       { en:"I'm still getting used to it.", match:"(?:still )?getting used to", ua:"Я ще звикаю до цього.",
                          simple:"Something is new for you, and you need a little time.", ex:"“How's LA?” “Great! I'm still getting used to the time difference.”", tag:"neutral",
                          ctx:"Alex says it about the changes at home." },
  'didnt-mean':         { en:"I didn't mean to…", match:"I didn't mean to", ua:"Я не хотів(-ла)… / Я не мав(-ла) на меті…",
                          simple:"You did something by accident, and you're sorry.", ex:"“Sorry — I didn't mean to scare you!”", tag:"neutral",
                          ctx:"Alex, about his strange text." },
  'thats-on-me':        { en:"That's on me.", match:"that's on me", ua:"Це моя провина.",
                          simple:"A casual way to say “It's my fault.”", ex:"“The room was a mess? Yeah… that's on me.”", tag:"informal",
                          ctx:"Alex, about the box on your desk." },
  'i-get-that':         { en:"I get that.", match:"I get (?:that|it)", ua:"Я розумію.",
                          simple:"A casual way to say “I understand how you feel.”", ex:"“Moving is hard.” “Yeah, I get that.”", tag:"informal",
                          ctx:"What you say when Alex explains why he sent the text." },
  'thanks-having-me':   { en:"Thanks for having me.", match:"(?:thanks|thank you) for having me", ua:"Дякую, що прийняли мене.",
                          simple:"What a guest says to thank the people they're staying with.", ex:"“Welcome to our home!” “Thanks for having me!”", tag:"polite",
                          ctx:"Introducing yourself to Rachel." },
  'could-you-check':    { en:"Could you check if…?", match:"could you check if", ua:"Не могли б ви перевірити, чи…?",
                          simple:"Use this when you want someone to look for information or check something for you.", ex:"“Could you check if someone found my charger?”", tag:"polite",
                          ctx:"At the hotel desk, about your charger." },
  'i-noticed':          { en:"I noticed…", match:"I noticed", ua:"Я помітив(-ла)…",
                          simple:"A soft, polite way to start talking about something you saw.", ex:"“I noticed there's a box on my desk.”", tag:"neutral",
                          ctx:"Explaining the box — without sounding rude." },
  'to-be-honest':       { en:"To be honest…", match:"to be honest", ua:"Чесно кажучи…",
                          simple:"You're about to say what you really think or feel.", ex:"“To be honest, I was a little nervous.”", tag:"neutral",
                          ctx:"One way to answer Alex's apology." },
  'no-worries':         { en:"No worries.", match:"no worries", ua:"Без проблем / нічого страшного.",
                          simple:"A relaxed way to say “It's okay” after someone says sorry or thank you.", ex:"“Sorry I'm late!” “No worries.”", tag:"informal",
                          ctx:"Talking to Alex about his box." }
};
/* the 10 target expressions (in teaching order) */
const EP3_TARGET = ['make-yourself-home','help-yourself','is-it-okay','do-you-mind','getting-used','didnt-mean','thats-on-me','i-get-that','thanks-having-me','looking-forward'];
/* everything this episode puts in the Backpack when it's finished (no duplicates — addPhrase checks) */
const EP3_PHRASES = EP3_TARGET.concat(['could-you-check','i-noticed','to-be-honest','nice-to-meet']);
const OWN_PHRASES = Object.keys(PHRASES);
const P = id => PHRASES[id] || ALL_PHRASES[id] || null;

/* =========================================================================
   INVENTORY
   ========================================================================= */
const ITEMS = {
  'Phone charger':     { icon:'🔌', desc:"Your phone charger. You left it plugged in next to the bed in Room 308 — housekeeping found it. Phew." },
  'Miller House key':  { icon:'🗝️', desc:"Your own key to the Millers' red front door. Rachel gave it to you on Day 2. (Dinner's at six!)" },
  'Your glove':        { icon:'🧤', desc:"Rescued from Buddy. It has a few new tooth marks — a souvenir from your first five minutes at the Millers'." }
};
const EP3_ITEMS = ['Phone charger', 'Miller House key', 'Your glove'];
const KEY_CARD = 'Room 308 key card';

/* Characters who speak in this episode. `voice` tunes browser text-to-speech.
   Buddy's “face” is a small drawn golden retriever, not an emoji. */
const BUDDY_FACE = `<svg viewBox="0 0 40 40" width="26" height="26" aria-hidden="true"><path d="M9 14c-4 2-5 10-2 14 2 3 5 1 6-2l1-8z" fill="#a8681f"/><circle cx="21" cy="19" r="11" fill="#e0a64a"/><path d="M27 15c5 1 7 9 4 13-2 3-5 1-5-2v-8z" fill="#a8681f"/><ellipse cx="21" cy="25" rx="6" ry="4.5" fill="#f3cf86"/><ellipse cx="21" cy="22.3" rx="2.4" ry="1.7" fill="#2a1a10"/><circle cx="17" cy="17" r="1.4" fill="#2a1a10"/><circle cx="25" cy="17" r="1.4" fill="#2a1a10"/></svg>`;
const SPEAKERS = {
  david:  { name:'David Miller', role:'Host dad', color:'#3E7C8C', voice:{ g:'m', pitch:0.9, rate:0.95, idx:0 } },
  rachel: { name:'Rachel Miller', role:'Host mom', color:'#F3E5C8', dark:true, voice:{ g:'f', pitch:1.0, rate:0.95, idx:1 } },
  alex:   { name:'Alex', role:'The Millers’ son · 15', color:'#55657f', voice:{ g:'m', pitch:1.12, rate:1.03, idx:3 } },
  buddy:  { name:'Buddy', role:'Golden retriever', color:'#FFD23F', dark:true, icon:BUDDY_FACE, voice:{ g:'any', pitch:1.3, rate:1 } },
  emily:  { name:'Emily', role:'Lives nearby', color:'#FF8A3D', voice:{ g:'f', pitch:1.18, rate:1.06, idx:2 } }
};

/* ---------- continuity helpers (Episode 2's save, if there is one) ---------- */
const ep2 = () => peekSt('ep2');
const ep2Done = () => !!(ep2() && ep2().completed);
const ep2f = () => (ep2() && ep2().flags) || {};
const MEALS = { burger:'a cheeseburger', sandwich:'a chicken sandwich', salad:'a Caesar salad' };
function playerName(){
  try { const n = typeof window.lilaPlayerName === 'function' ? window.lilaPlayerName() : null; return n && /^[A-Za-zÀ-ÿ'’-]{2,20}$/.test(n) ? n : null; } catch(e){ return null; }
}
const flags = () => st().flags;
const roomsDone = f => (f.rooms || []);

/* =========================================================================
   STORY — 8 scenes (the Final Mission closes Scene 8).
   A node continues to the next key unless it says `next`. Short branches
   always come back together (reconverge), so later episodes stay simple.
   ========================================================================= */
const say   = (who, text, ua, more) => Object.assign({ type:'say', who, text, ua }, more || {});
const think = (text, ua, more) => Object.assign({ type:'think', text, ua }, more || {});
const narr  = (text, ua, more) => Object.assign({ type:'narr', text, ua }, more || {});

/* “How was your first night?” — an example answer built from what really happened in Episode 2 */
function modelNight(){
  if(!ep2Done()) return "It was great, thanks! A little crazy, but really fun. I'm excited to be here!";
  const meal = MEALS[ep2f().meal];
  return `It was great! There was a problem with my hotel room, but they fixed it. Then I went to a diner${meal ? `, had ${meal},` : ''} and met someone named Jake.`;
}

const SCENES = [

/* ---------------------------------------------------------------- SCENE 1 */
{ id:'s1', n:1, title:'A New Morning', emoji:'☀️', objective:'Get ready to go',
  bg:'roomAm', ambience:'morning', clock:'10:42 AM', cast:[],
  hotspots:[
    { id:'s1-num', x:82, y:70, ph:[84, 71], img:CLOSE('room-308'), icon:'🚪', label:'Look at the room number', bgs:['roomAm'],
      text:"Room 308. Your very first room in LA — for one more hour.", ua:"Кімната 308. Твоя найперша кімната в Лос-Анджелесі — ще на одну годину." },
    { id:'s1-window', x:66, y:34, ph:[72, 30], icon:'🌴', label:'Look out of the window', bgs:['roomAm'],
      text:"Blue sky, palm trees, and the city waking up. Last night it was all neon. Today it looks like a postcard.", ua:"Блакитне небо, пальми, місто прокидається. Учора все світилося неоном. Сьогодні — як листівка." },
    { id:'s1-case', x:28, y:70, ph:[31, 64], img:CLOSE('honey'), icon:'🧳', label:'Check your suitcase', bgs:['roomAm'],
      text:"Clothes, a hoodie, your passport, a jar of honey from home for the Millers… Almost everything is packed. Almost.", ua:"Одяг, худі, паспорт, баночка меду з дому для Міллерів… Майже все спаковано. Майже." },
    { id:'s1-night', x:12, y:58, ph:[15, 69], img:CLOSE('nightstand'), icon:'🔌', label:'Look at the nightstand', bgs:['roomAm'],
      text:"Your phone charger is still plugged in next to the bed. Don't forget it! …You will absolutely forget it.", ua:"Зарядка досі в розетці біля ліжка. Не забудь її! …Ти точно її забудеш." }
  ],
  nodes:{
    open:  { type:'cards', cards:['LOS ANGELES · 10:42 AM','PALM COURT HOTEL · ROOM 308','DAY 2 · MORNING'],
             title:{ eyebrow:'SEASON 1 · EPISODE 3', big:'NEW HOME', sub:'A Place to Belong' } },
    day:   { type:'act', run:'startDay2' },
    n1:    narr("Today is the day. You're finally moving into your new home. You should feel excited… so why are you still thinking about that strange message?",
                "Сьогодні той самий день. Ти нарешті переїжджаєш у новий дім. Ти мав(-ла) б радіти… то чому досі думаєш про те дивне повідомлення?", { cam:'drift' }),
    t1:    think(() => ep2Done() ? "10:42?! So much for the 9:30 alarm. Okay — David is here at eleven. Eighteen minutes." : "10:42! David is picking me up at eleven. Eighteen minutes.",
                 () => ep2Done() ? "10:42?! Ну й будильник на 9:30… Гаразд — Девід буде об одинадцятій. Вісімнадцять хвилин." : "10:42! Девід забирає мене об одинадцятій. Вісімнадцять хвилин."),
    buzz:  { type:'wake', key:'s1_phone' },
    feel:  { type:'choice', prompt:"How do you feel this morning?", ua:"Як ти почуваєшся цього ранку?", key:'morningFeeling', options:[
             { text:"I'm excited! I can't wait to meet them.", ua:"Я в захваті! Не можу дочекатися зустрічі з ними.", emoji:'🤩', value:'excited', next:'fe' },
             { text:"I'm a little nervous, to be honest.", ua:"Чесно кажучи, я трохи хвилююся.", emoji:'😬', value:'nervous', next:'fn', vocab:['to-be-honest','little-nervous'] },
             { text:"I'm curious about that strange message.", ua:"Мені цікаво, що це за дивне повідомлення.", emoji:'🕵️', value:'curious', next:'fc' } ] },
    fe:    think("A fresh start. New people. New adventures. This could be amazing.", "Новий початок. Нові люди. Нові пригоди. Це може бути неймовірно.", { next:'sp1' }),
    fn:    think("What if they don't like me? What if I say something awkward?", "А раптом я їм не сподобаюся? А якщо я скажу щось незграбне?", { next:'sp1' }),
    fc:    think(() => ep2f().mysteryChoice === 'reply' ? "Who sent that text? I asked them last night — and they still haven't answered. What exactly did they mean?" : "Who sent that text? And what exactly did they mean?",
                 () => ep2f().mysteryChoice === 'reply' ? "Хто надіслав те повідомлення? Я ж учора спитав(-ла) — а відповіді досі нема. Що саме вони мали на увазі?" : "Хто надіслав те повідомлення? І що саме вони мали на увазі?", { next:'sp1' }),
    sp1:   { type:'speakup', key:'s1_feel', label:'Speaking moment — how are you feeling?',
             prompt:"What are you most excited or nervous about today? Tell us how you're feeling. Try to say at least two sentences.",
             ua:"Що тебе сьогодні найбільше радує чи хвилює? Розкажи, як почуваєшся. Спробуй сказати хоча б два речення.",
             hints:["Start with: “I'm excited to…” or “I'm a little nervous about…”", "Add a second sentence with “but” or “because”: “…but I'm also…”"],
             starters:["I'm excited to…","I'm a little nervous about…","…but I'm also…","because…"],
             model:"I'm excited to see my new home, but I'm a little nervous about meeting everyone.", vocab:['little-nervous','looking-forward'], minWords:8 },
    pack:  think("Okay. Suitcase: closed. Backpack: on. Time to check out.", "Так. Валіза: зачинена. Рюкзак: на плечах. Час виселятися."),
    end:   { type:'end', next:'s2' }
  } },

/* ---------------------------------------------------------------- SCENE 2 */
{ id:'s2', n:2, title:'One Last Problem', emoji:'🧳', objective:'Check out of the hotel',
  bg:'lobby', ambience:'lobby', clock:'10:53 AM', cast:[],
  hotspots:[
    { id:'s2-sign', x:16, y:56, ph:[16, 62], icon:'🪧', label:'Read the little sign', bgs:['lobby'],
      text:"“A warm welcome to Palm Court.” Last night it felt like a joke. This morning it's actually true.", ua:"«Тепло вітаємо в Palm Court». Учора це звучало як жарт. А сьогодні вранці — це правда." },
    { id:'s2-bell', x:70, y:62, ph:[70, 64], icon:'🛎️', label:'Look at the bell', bgs:['lobby'],
      text:"The little bell. You don't need it today — Daniel already saw you. 😄", ua:"Маленький дзвіночок. Сьогодні він не потрібен — Деніел уже тебе побачив. 😄" }
  ],
  nodes:{
    in:    narr("The lobby looks different in daylight. Same palm, same desk — and the same receptionist, at the end of a very long night shift.",
                "Удень фоє виглядає інакше. Та сама пальма, та сама стійка — і той самий адміністратор наприкінці дуже довгої нічної зміни.", { cam:'drift' }),
    d1:    say('daniel', "Good morning! Checking out?", "Доброго ранку! Виселяєтеся?", { meet:'daniel' }),
    y1:    { type:'choice', speak:true, prompt:"Answer Daniel:", ua:"Відповідай Деніелу:", options:[
             { text:"Yes, please. I was staying in Room 308.", ua:"Так, будь ласка. Я жив(-ла) у номері 308." },
             { text:"Good morning! Yes, please — Room 308.", ua:"Доброго ранку! Так, будь ласка — номер 308." } ] },
    d2:    say('daniel', "Great! How was your stay?", "Чудово! Як вам у нас?"),
    y2:    { type:'choice', speak:true, prompt:"Tell him:", ua:"Скажи йому:", options: () => [
             { text:"It was really nice, thank you.", ua:"Було дуже приємно, дякую." },
             ep2Done() ? { text:"Really nice, thanks — after the key card adventure! 😄", ua:"Дуже приємно, дякую — після пригоди з карткою! 😄" }
                       : { text:"It was great, thanks. The bed was so comfortable!", ua:"Чудово, дякую. Ліжко було таке зручне!" } ] },
    d3:    say('daniel', "Glad to hear it! Could I have your key card, please?", "Радий чути! Можна вашу картку-ключ, будь ласка?"),
    key:   { type:'inventory', who:'daniel', want:KEY_CARD, key:'s2_key', trayTitle:'Hand back your key card',
             only:['Passport', KEY_CARD, 'Exchange program folder'],
             prompt:"Give Daniel your key card.", ua:"Віддай Деніелу картку-ключ.",
             wrong:{ 'Passport':["Ha — you can keep your passport! Just the key card, please.", "Ха — паспорт залиште собі! Тільки картку-ключ, будь ласка."],
                     'Exchange program folder':["That's a lot of paperwork! 😄 I only need the room key.", "Скільки паперів! 😄 Мені потрібен лише ключ від номера."] } },
    keyok: { type:'act', run:'returnKey' },
    d4:    say('daniel', "Thanks! Is there anything else I can help you with?", "Дякую! Можу ще чимось допомогти?"),
    oops:  narr("Wait. Your charger! You left it upstairs.", "Стоп. Зарядка! Ти залишив(-ла) її нагорі.", { cam:'shake', sfx:'soft' }),
    t2:    think("It's not in my backpack… I left it plugged in next to the bed!", "У рюкзаку її нема… Я залишив(-ла) її в розетці біля ліжка!"),
    ask:   { type:'choice', prompt:"Mission 2 · Explain the problem — politely. What do you say?", ua:"Місія 2 · Поясни проблему — ввічливо. Що скажеш?", key:'hotelHelp', options:[
             { text:"I think I left my charger in my room.", ua:"Здається, я залишив(-ла) зарядку в номері.", value:'left', say:true, next:'r_left' },
             { text:"Could you check if someone found my charger?", ua:"Не могли б ви перевірити, чи хтось знайшов мою зарядку?", value:'check', say:true, vocab:['could-you-check'], next:'r_check' },
             { text:"Is it possible to get something I forgot upstairs?", ua:"Чи можна забрати річ, яку я забув(-ла) нагорі?", value:'forgot', say:true, next:'r_forgot' },
             { text:"Say it my own way (out loud)", ua:"Сказати по-своєму (вголос)", emoji:'🗣️', value:'own', next:'own' } ] },
    own:   { type:'speakup', key:'s2_own', label:'Free speaking — explain the problem',
             prompt:"Tell Daniel what happened and ask for help — in your own words.", ua:"Розкажи Деніелу, що сталося, і попроси допомоги — своїми словами.",
             hints:["Start with “Sorry — I think I left…”", "Then ask politely: “Could you check if…?”"],
             model:"Sorry, I think I left my phone charger in Room 308. Could you check if someone found it?", vocab:['could-you-check','could-you-help'], next:'r_own' },
    r_left:  say('daniel', "Oh no! Don't worry — housekeeping cleaned 308 this morning.", "Ой! Не хвилюйтеся — прибиральники були в 308-му зранку.", { next:'found' }),
    r_check: say('daniel', "Sure! Let me check the lost and found.", "Звісно! Зараз перевірю бюро знахідок.", { next:'tip' }),
    tip:     think("“Could you check if…?” — polite, clear, and he knew exactly what to do. Nice.", "«Could you check if…?» — ввічливо, зрозуміло, і він одразу знав, що робити. Клас.", { vocab:['could-you-check'], next:'found' }),
    r_forgot:say('daniel', "Of course. But let me check first — housekeeping might have it already.", "Звісно. Але спершу я перевірю — може, прибиральники вже його знайшли.", { next:'found' }),
    r_own:   say('daniel', "Got it. Let me check for you.", "Зрозумів. Зараз перевірю.", { next:'found' }),
    found: say('daniel', "Of course! Let me check… Oh, here it is! Housekeeping found it this morning.", "Звісно! Дайте погляну… О, ось він! Прибиральники знайшли його зранку.", { sfx:'ding' }),
    thx:   { type:'choice', speak:true, prompt:"Thank him:", ua:"Подякуй йому:", options:[
             { text:"Thank you so much!", ua:"Щиро дякую!" }, { text:"Oh, thank you so much! You saved me.", ua:"Ой, щиро дякую! Ви мене врятували." } ] },
    d5:    say('daniel', () => ep2Done() ? "No problem. And hey — no more problems today, okay? 😄 Enjoy your time in LA!" : "No problem. Enjoy your time in LA!",
                         () => ep2Done() ? "Нема за що. І слухайте — сьогодні без проблем, домовились? 😄 Гарного вам часу в Лос-Анджелесі!" : "Нема за що. Гарного вам часу в Лос-Анджелесі!"),
    lc:    { type:'listen', who:'daniel', key:'s2_listen',
             audio:"Oh, here it is! Housekeeping found it this morning.", ua:"О, ось він! Прибиральники знайшли його зранку.",
             question:"Who found the charger?", qua:"Хто знайшов зарядку?",
             options:[ { text:'Housekeeping', correct:true }, { text:'David' }, { text:'Another guest' } ],
             hints:[ "Listen to the last part: “… found it this morning.”", "Housekeeping = the people who clean the hotel rooms. 🧹", "Зарядку знайшли прибиральники (housekeeping)." ] },
    use:   { type:'useful', title:'Useful English', ids:['could-you-check'] },
    win:   { type:'reward', banner:'CHECKED OUT! 🧳', sub:'You explained a problem and got help — politely.', item:'Phone charger', phrases:['could-you-check'] },
    end:   { type:'end', next:'s3' }
  } },

/* ---------------------------------------------------------------- SCENE 3 */
{ id:'s3', n:3, title:'The Ride Home', emoji:'🚗', objective:'Get to know David',
  bg:'hotelOut', ambience:'outside', clock:'11:00 AM', cast:['david@car'],
  hotspots:[
    { id:'s3-hotel', x:46, y:28, ph:[52, 22], img:CLOSE('palm-court-hotel'), icon:'🏨', label:'Look back at the hotel', bgs:['hotelOut'],
      text:"The Palm Court Hotel. Only one night here — and it already feels like a whole adventure.", ua:"Готель «Палм Корт». Лише одна ніч тут — а вже ніби ціла пригода." },
    { id:'s3-palm', x:20, y:24, ph:[18, 18], icon:'🌴', label:'Look up', bgs:['hotelOut'],
      text:"In daylight the palm trees look even taller. And the sky is SO blue.", ua:"Удень пальми здаються ще вищими. А небо ТАКЕ синє." },
    { id:'s3-car', x:60, y:66, ph:[72, 76], img:CLOSE('car'), icon:'🚗', label:'Look at the car', bgs:['hotelOut'],
      text:"A silver family car with a dog-hair situation on the back seat. Golden dog hair. Interesting…", ua:"Срібляста сімейна машина, а на задньому сидінні — собача шерсть. Золотиста. Цікаво…" }
  ],
  nodes:{
    in:    narr("Eleven o'clock on the dot. A silver car pulls up outside the hotel. A man in a green sweater is waiting next to it, smiling.",
                "Рівно об одинадцятій. Біля готелю зупиняється срібляста машина. Біля неї усміхається чоловік у зеленому светрі.", { cam:'push', sfx:'door' }),
    suv:   think("A silver car? Rachel said a dark blue SUV…", "Срібляста машина? Рейчел казала — темно-синій позашляховик…", { when: () => ep2f().rachelReplyStyle === 'question' }),
    d1:    say('david', "Hey! You must be our new guest! I'm David Miller.", "Привіт! Ти, мабуть, наш новий гість! Я Девід Міллер.", { meet:'david' }),
    y1:    { type:'choice', speak:true, prompt:"Answer David:", ua:"Відповідай Девіду:", options:[
             { text:"Hi! Nice to meet you!", ua:"Привіт! Приємно познайомитися!", vocab:['nice-to-meet'] },
             { text:"Hi David! Nice to meet you!", ua:"Привіт, Девіде! Приємно познайомитися!", vocab:['nice-to-meet'] } ] },
    suv2:  say('david', "Rachel told you a blue SUV, right? It's at the mechanic — so today you get the family car. 😄", "Рейчел казала про синій позашляховик, так? Він у ремонті — тож сьогодні їдемо сімейною машиною. 😄", { when: () => ep2f().rachelReplyStyle === 'question' }),
    d2:    say('david', "Nice to meet you too. How was your first night in LA?", "Мені теж приємно. Як минула твоя перша ніч у Лос-Анджелесі?"),
    sp2:   { type:'speakup', key:'s3_night', label:'Speaking moment — your first night',
             prompt:"Answer David: how was your first night in LA? Tell him one or two things that happened.",
             ua:"Відповідай Девіду: як минула твоя перша ніч у Лос-Анджелесі? Розкажи одну-дві речі, що сталися.",
             hints: () => ep2Done() ? ["Past simple: “I went…”, “I met…”, “I had…”", "Ideas: the hotel mix-up, the diner, meeting Jake…"] : ["Past simple: “I went…”, “I met…”, “It was…”", "Start with: “It was great!” or “It was a little crazy, but…”"],
             model: () => modelNight(), vocab:['nice-to-meet'],
             after:{ who:'david', text:"Sounds like you've already had an adventure! Let me help you with that suitcase.", ua:"Схоже, у тебе вже була пригода! Давай допоможу з валізою." } },
    y2:    say('you', "Thanks! I really appreciate it.", "Дякую! Я дуже ціную це."),
    drive: narr("The car pulls away. Palm trees, shops and houses pass by the window.", "Машина рушає. За вікном пропливають пальми, крамниці й будинки.", { bg:'carRide', amb:'car', cast:[], cam:'wide' }),
    d3:    say('david', "Rachel's preparing lunch. She's been excited to meet you.", "Рейчел готує обід. Вона так чекала на зустріч із тобою."),
    y3:    say('you', "That's really nice!", "Це так мило!"),
    d4:    say('david', "Oh, and just so you know, we have a dog. His name's Buddy.", "А, і щоб ти знав(-ла): у нас є собака. Його звуть Бадді."),
    y4:    say('you', "What kind of dog is he?", "А яка це порода?"),
    d5:    say('david', "A golden retriever. Super friendly. Maybe a little too friendly.", "Золотистий ретривер. Дуже дружній. Можливо, навіть занадто."),
    d6:    say('david', "And our son Alex is about your age. He's probably upstairs working on one of his projects.", "А наш син Алекс — приблизно твого віку. Мабуть, сидить нагорі над якимось своїм проєктом."),
    t3:    think("Alex? Wait… was that the name Jake almost mentioned?", "Алекс? Стоп… це те ім'я, яке ледь не сказав Джейк?", { cam:'push' }),
    topic: { type:'choice', prompt:"Ask David something. What do you want to know?", ua:"Запитай Девіда. Що хочеш дізнатися?", key:'davidTopic', options:[
             { text:"Ask about the family", ua:"Запитати про родину", emoji:'👨‍👩‍👦', value:'family', next:'fa1' },
             { text:"Ask about Buddy", ua:"Запитати про Бадді", emoji:'🐕', value:'buddy', next:'bu1' },
             { text:"Ask about the neighborhood", ua:"Запитати про район", emoji:'🌴', value:'hood', next:'ne1' },
             { text:"Ask my own question (out loud)", ua:"Поставити власне запитання (вголос)", emoji:'🗣️', value:'own', next:'ow1' } ] },
    /* the family */
    fa1:   { type:'choice', speak:true, prompt:"Ask:", ua:"Запитай:", options:[
             { text:"What does Alex like doing?", ua:"Що любить робити Алекс?" }, { text:"Tell me about Alex — what's he into?", ua:"Розкажіть про Алекса — чим він захоплюється?" } ] },
    fa2:   say('david', "Computers, mostly. He builds things — robots, gaming PCs, you name it. Our garage looks like a science lab.", "Здебільшого комп'ютерами. Він усе щось збирає — роботів, ігрові комп'ютери, що завгодно. Наш гараж схожий на наукову лабораторію."),
    fa3:   say('david', "He's a good kid. A little quiet with new people at first… give him time.", "Він хороший хлопець. Спершу трохи тихий з новими людьми… дай йому час."),
    fa4:   { type:'choice', speak:true, prompt:"Ask one more:", ua:"Запитай ще:", options:[
             { text:"And what's Rachel like?", ua:"А яка Рейчел?" }, { text:"Does Rachel like cooking?", ua:"Рейчел любить готувати?" } ] },
    fa5:   say('david', "Warm, super organized, and the best cook in California. She's been planning your welcome lunch for a week. 😄", "Тепла, дуже організована — і найкращий кухар у Каліфорнії. Вона тиждень планувала твій вітальний обід. 😄", { next:'lq' }),
    /* Buddy */
    bu1:   { type:'choice', speak:true, prompt:"Ask:", ua:"Запитай:", options:[
             { text:"How long have you had Buddy?", ua:"Як довго у вас Бадді?" }, { text:"How old is Buddy?", ua:"Скільки Бадді років?" } ] },
    bu2:   say('david', "Four years. When we got him, he fit in one hand. Now he's seventy pounds of pure chaos.", "Чотири роки. Коли ми його взяли, він вміщався на долоні. Тепер це тридцять кілограмів чистого хаосу."),
    bu3:   say('david', "One warning: hide your socks. And your gloves. Basically anything soft.", "Одне попередження: ховай шкарпетки. І рукавички. Взагалі все м'яке."),
    bu4:   { type:'choice', speak:true, prompt:"React:", ua:"Відреагуй:", options:[
             { text:"Ha! Okay, I'll be careful.", ua:"Ха! Гаразд, буду обережним(-ою)." }, { text:"Noted! Does he steal food too?", ua:"Зрозумів(-ла)! А їжу він теж краде?" } ] },
    bu5:   say('david', "Only if you look away for one second. 😂", "Лише якщо відвернешся на секунду. 😂", { next:'lq' }),
    /* the neighborhood */
    ne1:   { type:'choice', speak:true, prompt:"Ask:", ua:"Запитай:", options:[
             { text:"What's the neighborhood like?", ua:"Який у вас район?" }, { text:"Are there any cool places nearby?", ua:"Тут поблизу є якісь круті місця?" } ] },
    ne2:   say('david', "Quiet and friendly. Lots of families, lots of dogs. There's a park two blocks away, and a great little coffee shop on the corner.", "Тихий і дружній. Багато сімей, багато собак. За два квартали — парк, а на розі — чудова маленька кав'ярня."),
    ne3:   say('david', "And the library's close too, if you ever need a quiet place to study.", "А ще поруч бібліотека — якщо треба буде тихе місце для навчання."),
    ne4:   { type:'choice', speak:true, prompt:"React:", ua:"Відреагуй:", options:[
             { text:"That sounds great!", ua:"Звучить чудово!", vocab:['sounds-great'] }, { text:"Cool — I love coffee shops.", ua:"Клас — я люблю кав'ярні." } ] },
    ne5:   say('david', "Then you'll fit right in. Half the kids on our street basically live in that coffee shop.", "Тоді ти швидко освоїшся. Половина дітей з нашої вулиці практично живе в тій кав'ярні.", { next:'lq' }),
    /* your own question — David can't hear it, so his answer is honest and general */
    ow1:   { type:'speakup', key:'s3_own', label:'Your own question — say it out loud',
             prompt:"Ask David your own question — about the family, Buddy, the house or LA.", ua:"Постав Девіду власне запитання — про родину, Бадді, дім чи Лос-Анджелес.",
             hints:["Start with “What…?”, “How long…?”, “Is there…?” or “Do you…?”", "For example: “What's your favorite place in LA?”"],
             model:"What's your favorite thing about living in LA?", minWords:3,
             after:{ who:'david', text:"Ha — good question! Let me think about that one… I'll tell you over lunch. Deal?", ua:"Ха — гарне запитання! Дай подумати… Розповім за обідом. Домовились?" } },
    ow2:   say('david', "Oh — and one warning about Buddy: hide your socks. And your gloves. 😂", "А, і одне попередження про Бадді: ховай шкарпетки. І рукавички. 😂", { next:'lq' }),
    /* listening check */
    lq:    think("Okay. Let me get this straight before we arrive…", "Так. Розкладу все по поличках, поки ми не приїхали…"),
    q1:    { type:'listen', who:'david', key:'s3_l1', audio:"Rachel's preparing lunch. She's been excited to meet you.", ua:"Рейчел готує обід. Вона так чекала на зустріч із тобою.",
             question:"What is Rachel doing right now?", qua:"Що зараз робить Рейчел?",
             options:[ { text:'Preparing lunch', correct:true }, { text:'Walking Buddy' }, { text:'Shopping for groceries' } ],
             hints:[ "Listen to the first part: “Rachel's preparing…”", "Lunch = the meal in the middle of the day. 🍝", "Рейчел готує обід." ] },
    q2:    { type:'listen', who:'david', key:'s3_l2', audio:"We have a dog. His name's Buddy. He's a golden retriever — super friendly. Maybe a little too friendly.", ua:"У нас є собака. Його звуть Бадді. Він золотистий ретривер — дуже дружній. Можливо, навіть занадто.",
             question:"What kind of dog is Buddy?", qua:"Якої породи Бадді?",
             options:[ { text:'A golden retriever', correct:true }, { text:'A German shepherd' }, { text:'A poodle' } ],
             hints:[ "Listen for the color word: golden…", "A big, friendly dog with golden fur. 🐕", "Бадді — золотистий ретривер." ] },
    q3:    { type:'listen', who:'david', key:'s3_l3', audio:"Our son Alex is about your age. He's probably upstairs working on one of his projects.", ua:"Наш син Алекс — приблизно твого віку. Мабуть, сидить нагорі над якимось своїм проєктом.",
             question:"Where is Alex probably right now?", qua:"Де, імовірно, зараз Алекс?",
             options:[ { text:'Upstairs, working on a project', correct:true }, { text:'At school' }, { text:'At the park with friends' } ],
             hints:[ "Listen to the end: “He's probably upstairs…”", "Upstairs = on the top floor of the house. ⬆️", "Алекс, мабуть, нагорі — працює над проєктом." ] },
    arr:   narr("The car turns into a quiet street lined with palm trees and stops in front of a house with a red front door.",
                "Машина звертає на тиху вулицю з пальмами й зупиняється біля будинку з червоними вхідними дверима.", { bg:'houseFront', amb:'yard', cast:['david@left'], cam:'push' }),
    end:   { type:'end', next:'s4' }
  } },

/* ---------------------------------------------------------------- SCENE 4 */
{ id:'s4', n:4, title:'Welcome to the Millers', emoji:'🏡', objective:'Meet your host family',
  bg:'houseFront', ambience:'yard', clock:'11:27 AM', cast:['rachel@door','david@left'],
  hotspots:[
    { id:'s4-mail', x:14, y:62, ph:[14, 66], img:CLOSE('millers-sign'), icon:'📫', label:'Read the mailbox', bgs:['houseFront'],
      text:"A blue sign: “MILLERS”, with a bright yellow sun. And on the mailbox, someone has added a sticker of a golden paw. 🐾", ua:"Синя табличка: «MILLERS» і яскраве жовте сонечко. А на поштовій скриньці хтось доклеїв наліпку із золотистою лапкою. 🐾" },
    { id:'s4-lemon', x:84, y:52, ph:[86, 44], img:CLOSE('lemon-tree'), icon:'🍋', label:'Look at the tree', bgs:['houseFront'],
      text:"A lemon tree. In the front yard. With real lemons. You're going to like it here.", ua:"Лимонне дерево. Просто перед будинком. Зі справжніми лимонами. Тобі тут сподобається." }
  ],
  nodes:{
    in:    narr("A warm, sunny house with a little garden. Somewhere inside, a dog is very, very excited.", "Теплий сонячний будинок із невеличким садом. Десь усередині дуже-дуже радіє пес.", { sfx:'bark' }),
    place: { type:'act', run:'arriveHouse' },
    r1:    say('rachel', "Welcome! You made it!", "Ласкаво просимо! Ти доїхав(-ла)!", { meet:'rachel' }),
    y1:    { type:'choice', speak:true, prompt:"Greet Rachel:", ua:"Привітайся з Рейчел:", options:[
             { text:"Hi! It's so nice to finally meet you!", ua:"Привіт! Так приємно нарешті познайомитися!", vocab:['nice-to-meet'] },
             { text:"Hi Rachel! It's so nice to finally meet you!", ua:"Привіт, Рейчел! Так приємно нарешті познайомитися!", vocab:['nice-to-meet'] } ] },
    r2:    say('rachel', "We're really happy you're here. Come on in!", "Ми дуже раді, що ти тут. Заходь!"),
    dash:  narr("Suddenly, a golden blur shoots out of the house, runs straight at you — and grabs the glove hanging from your backpack!",
                "Раптом із дому вилітає золотиста пляма, мчить просто на тебе — і хапає рукавичку, що висіла на рюкзаку!", { cast:['rachel@door','david@left','buddy@run'], meet:'buddy', sfx:'bark' }),
    y2:    say('you', "Wait! My glove!", "Стій! Моя рукавичка!", { cam:'shake', cast:['rachel@door','david@left','buddy@glove'] }),
    dv:    say('david', "Buddy! Drop it!", "Бадді! Віддай!"),
    r3:    say('rachel', "Oh no, not again! I'm so sorry!", "Ой ні, знову! Мені так прикро!"),
    tb:    think("“Hide your socks. And your gloves.” David warned me. I just didn't think it would take five seconds.", "«Ховай шкарпетки. І рукавички». Девід попереджав. Я просто не думав(-ла), що це станеться за п'ять секунд.", { when: f => f.davidTopic === 'buddy' || f.davidTopic === 'own' }),
    react: { type:'choice', prompt:"React to Buddy:", ua:"Відреагуй на Бадді:", key:'buddyReact', options:[
             { text:"It's okay! He's adorable!", ua:"Нічого страшного! Він чарівний!", emoji:'🥰', value:'friendly', say:true, next:'bf1' },
             { text:"Well, I guess he likes my glove!", ua:"Ну, схоже, йому сподобалася моя рукавичка!", emoji:'😂', value:'funny', say:true, next:'bj1' },
             { text:"Could you help me get it back?", ua:"Можете допомогти її повернути?", emoji:'🙏', value:'help', say:true, next:'bh1', vocab:['could-you-help'] } ] },
    bf1:   say('rachel', "Adorable — and a thief. 😄 Buddy, come here, sweetie. Give it back.", "Чарівний — і злодюжка. 😄 Бадді, ходи сюди, сонечко. Віддай."),
    bf2:   say('david', "See? He's already decided you're family.", "Бачиш? Він уже вирішив, що ти — член родини.", { next:'drop' }),
    bj1:   say('david', "Ha! He likes everything you own. Socks, gloves, sandwiches…", "Ха! Йому подобається все твоє. Шкарпетки, рукавички, бутерброди…"),
    bj2:   say('rachel', "At least he has good taste! 😂", "Принаймні в нього гарний смак! 😂", { next:'drop' }),
    bh1:   say('david', "Of course! Buddy… sit. Sit… Good boy. Now — drop it.", "Звісно! Бадді… сидіти. Сидіти… Молодець. А тепер — віддай."),
    bh2:   say('rachel', "Nicely asked! He usually listens to David… usually.", "Чудово попросив(-ла)! Зазвичай він слухається Девіда… зазвичай.", { next:'drop' }),
    drop:  { type:'drop', key:'s4_drop' },
    r4:    say('rachel', "Well… you've officially met Buddy. He likes making a big first impression!", "Ну що ж… тепер ти офіційно знайомий(-а) з Бадді. Він любить справляти яскраве перше враження!"),
    y3:    say('you', "I can see that!", "Я помітив(-ла)!"),
    sp3:   { type:'speakup', key:'s4_intro', label:'Speaking moment — introduce yourself',
             prompt:"Introduce yourself to Rachel and tell her one thing you're looking forward to.",
             ua:"Познайомся з Рейчел і скажи їй, чого ти з нетерпінням чекаєш.",
             hints:["Start with “Thanks for having me!” — then say your name.", "Then: “I'm looking forward to…” + a thing or an -ing verb: exploring LA, meeting everyone, the school year…"],
             starters:["Thanks for having me!","My name is…","I'm looking forward to…"],
             model: () => playerName() ? `Thank you for having me! I'm ${playerName()}. I'm really looking forward to exploring Los Angeles and getting to know everyone.` : "Thank you for having me! I'm really looking forward to exploring Los Angeles and getting to know everyone.",
             vocab:['thanks-having-me','looking-forward'], minWords:6,
             after:{ who:'rachel', text:"Aww. We're so glad you're here. Now come on in — lunch is almost ready!", ua:"Ох. Ми такі раді, що ти тут. Заходь — обід майже готовий!" } },
    use:   { type:'useful', title:'Useful English · First meetings', ids:['nice-to-meet','thanks-having-me','looking-forward','no-worries'] },
    win:   { type:'reward', banner:'WELCOME TO THE MILLERS! 🏡', sub:'You met your host family — and survived Buddy.', item:'Your glove', phrases:['thanks-having-me'] },
    end:   { type:'end', next:'s5' }
  } },

/* ---------------------------------------------------------------- SCENE 5 */
{ id:'s5', n:5, title:'Make Yourself at Home', emoji:'🔑', objective:'Explore the house',
  bg:'entry', ambience:'home', clock:'11:35 AM', cast:['rachel@right'],
  hotspots:[
    { id:'s5-table', x:14, y:62, ph:[13, 72], img:CLOSE('console'), icon:'🍋', label:'Look at the little table', bgs:['entry'],
      text:"A wooden table with a bowl of lemons — from the tree outside, of course — and a small palm. Everything here smells like summer.", ua:"Дерев'яний столик із мискою лимонів — з дерева надворі, звісно — і маленька пальма. Тут усе пахне літом." },
    { id:'s5-oven', x:44, y:80, ph:[44, 82], img:CLOSE('oven'), icon:'🔥', label:'Peek into the oven', bgs:['kitchen'],
      text:"The oven light is on, but it's still empty. Rachel laughs: “Not yet! Dinner's at six.”", ua:"Світло в духовці горить, але всередині ще порожньо. Рейчел сміється: «Ще ні! Вечеря о шостій.»" },
    { id:'s5-lamp', x:62, y:30, ph:[61, 28], img:CLOSE('floor-lamp'), icon:'💡', label:'Look at the lamp', bgs:['living'],
      text:"A tall floor lamp with a soft, warm light. David: “That's the Movie Night lamp. Very important. Very official.”", ua:"Високий торшер із м'яким теплим світлом. Девід: «Це лампа для кіновечора. Дуже важлива. Дуже офіційна.»" },
    { id:'s5-patio', x:40, y:34, ph:[40, 30], img:CLOSE('umbrella'), icon:'⛱️', label:'Sit under the umbrella', bgs:['yard'],
      text:"Shade, a cool breeze, and the perfect view of Buddy going crazy over a tennis ball.", ua:"Тінь, прохолодний вітерець і ідеальний вид на Бадді, який шаленіє через тенісний м'ячик." },
    { id:'s5-photos', x:24, y:38, ph:[16, 40], img:CLOSE('hawks-photo'), icon:'🖼️', label:'Look at the pictures', bgs:['entry'],
      text:"Pictures of LA: the beach, downtown, Hollywood. And between them, a small old poster: two boys in blue Hawks jerseys and a gold trophy. Hawks… Wait. Where have you seen that before?", ua:"Картини з Лос-Анджелесом: пляж, центр міста, Голлівуд. А між ними — маленький старий постер: двоє хлопців у синіх формах «Hawks» і золотий кубок. «Hawks»… Стоп. Де ти вже це бачив(-ла)?" },
    { id:'s5-fridge', x:20, y:44, ph:[9, 46], img:CLOSE('fridge'), icon:'🧲', label:'Read the fridge', bgs:['kitchen'],
      text:"Colorful magnets and a note in Rachel's handwriting: “DINNER @ 6”. Underlined. Rachel is serious about dinner.", ua:"Кольорові магніти й записка почерком Рейчел: «ВЕЧЕРЯ О 6». Підкреслено. Рейчел дуже серйозно ставиться до вечері." },
    { id:'s5-lemons', x:62, y:62, ph:[59, 57], icon:'🍋', label:'Look at the fruit bowl', bgs:['kitchen'],
      text:"Lemons from the tree outside. Rachel catches you looking: “Help yourself!”", ua:"Лимони з дерева надворі. Рейчел помічає твій погляд: «Пригощайся!»" },
    { id:'s5-games', x:80, y:40, ph:[86, 28], img:CLOSE('bookshelf'), icon:'🎲', label:'Look at the shelves', bgs:['living'],
      text:"Physics, Biology, History, Art, a World Atlas and a giant Encyclopedia. This family likes to know things.", ua:"Фізика, біологія, історія, мистецтво, атлас світу й величезна енциклопедія. Ця родина любить знати все." },
    { id:'s5-tv', x:66, y:50, ph:[66, 50], img:CLOSE('tv'), icon:'📺', label:'Look at the TV', bgs:['living'],
      text:"A big TV — and a sticky note on the screen: “FRIDAY = MOVIE NIGHT!” David: “No phones on Movie Night. Yes, Alex, that means you too.”", ua:"Великий телевізор — і стікер на екрані: «П'ЯТНИЦЯ = КІНОВЕЧІР!» Девід: «На кіновечорі — без телефонів. Так, Алексе, тебе це теж стосується.»" },
    { id:'s5-sofa', x:10, y:66, ph:[8, 66], img:CLOSE('sofa'), icon:'🛋️', label:'Try the sofa', bgs:['living'],
      text:"So soft you could sleep here. David: “The orange cushion is mine. Buddy thinks the green one is his.”", ua:"Такий м'який, що можна тут заснути. Девід: «Помаранчева подушка — моя. Бадді думає, що зелена — його.»" },
    { id:'s5-ball', x:70, y:76, ph:[44, 84], img:CLOSE('tennis-ball'), icon:'🎾', label:'Pick up the tennis ball', bgs:['yard'],
      text:"A very wet tennis ball. Buddy stares at it. Then at you. Then at the ball again. You know what he wants.", ua:"Дуже мокрий тенісний м'ячик. Бадді дивиться на нього. Потім на тебе. Потім знову на м'ячик. Ти знаєш, чого він хоче." },
    { id:'s5-wardrobe', x:18, y:42, ph:[11, 45], img:CLOSE('wardrobe'), icon:'🚪', label:'Open the wardrobe', bgs:['bedroom'],
      text:"Empty hangers, and a spare blanket that smells like lavender. All yours.", ua:"Порожні вішаки і запасна ковдра з запахом лаванди. Усе твоє." }
  ],
  nodes:{
    in:    narr("Inside, the house smells like garlic and fresh bread. There are family photos all along the hallway.", "Усередині пахне часником і свіжим хлібом. Уздовж коридору — родинні фото.", { cam:'drift' }),
    r1:    say('rachel', "Let me show you around! Kitchen, living room, backyard — and then the best part: your room.", "Давай я все тобі покажу! Кухня, вітальня, задній двір — а потім найкраще: твоя кімната."),
    r2:    say('rachel', "Oh — and this is for you. Your own key. Make yourself at home!", "А — і це тобі. Твій власний ключ. Почувайся як удома!", { vocab:['make-yourself-home'] }),
    gotkey:{ type:'act', run:'giveKey' },
    hub:   { type:'house', key:'s5_house' },
    /* kitchen */
    k1:    narr("A big sunny kitchen: lemons in a bowl, a fridge covered in magnets, and the oven already warming up for dinner.", "Велика сонячна кухня: лимони в мисці, холодильник у магнітах і духовка, що вже гріється для вечері.", { bg:'kitchen', cast:['rachel@right'] }),
    k2:    say('rachel', "Help yourself to snacks! Just let us know if you need anything.", "Пригощайся, бери що хочеш перекусити! Тільки кажи, якщо щось буде потрібно.", { vocab:['help-yourself'] }),
    k3:    { type:'speakup', key:'s5_kitchen', label:'Polite request — permission',
             prompt:"How would you politely ask to make yourself a snack?", ua:"Як ввічливо попросити дозволу зробити собі перекус?",
             hints:["Ask for permission: “Is it okay if I…?”", "…make myself a snack? / …have an apple? / …get some water?"],
             model:"Is it okay if I make myself a snack later?", vocab:['is-it-okay','help-yourself'], minWords:5,
             after:{ who:'rachel', text:"Of course! Second drawer on the left. The cookies are hidden behind the crackers. 😉", ua:"Звісно! Друга шухляда ліворуч. Печиво сховане за крекерами. 😉" } },
    k4:    { type:'room', room:'kitchen', next:'hub' },
    /* living room */
    l1:    narr("A cozy living room: a big gray sofa, a TV, and shelves full of books and board games.", "Затишна вітальня: великий сірий диван, телевізор і полиці з книжками та настільними іграми.", { bg:'living', cast:['david@right'] }),
    l2:    say('david', "This is where we usually hang out. We watch movies here on Fridays.", "Тут ми зазвичай проводимо час разом. По п'ятницях дивимося тут фільми."),
    l3:    { type:'speakup', key:'s5_living', label:'Polite request — permission',
             prompt:"Ask David whether you can watch TV here.", ua:"Запитай Девіда, чи можна тут дивитися телевізор.",
             hints:["Very polite: “Do you mind if I…?”", "…watch TV here sometimes?"],
             model:"Do you mind if I watch TV here sometimes?", vocab:['do-you-mind'], minWords:5,
             after:{ who:'david', text:"Not at all! Just don't touch the remote on Fridays — that's Movie Night, and Rachel picks the movie.", ua:"Анітрохи! Тільки по п'ятницях пульт не чіпай — це кіновечір, і фільм обирає Рейчел." } },
    l4:    think("“Not at all” — so that's a YES. With “Do you mind if…?”, “No” means “Go ahead!”", "«Not at all» — отже, це ТАК. На «Do you mind if…?» відповідь «No» означає «Будь ласка!»", { vocab:['do-you-mind'] }),
    l5:    { type:'room', room:'living', next:'hub' },
    /* backyard */
    y1:    narr("The backyard: green grass, a patio with an orange umbrella — and a golden blur running in circles.", "Задній двір: зелена трава, патіо з помаранчевою парасолею — і золотиста пляма, що бігає колами.", { bg:'yard', cast:['rachel@left','buddy@yard'], sfx:'bark', amb:'yard' }),
    y2:    say('rachel', "Buddy spends most of his time out here. He loves playing fetch.", "Бадді майже весь час проводить тут. Він обожнює гратися в «апорт»."),
    y3:    { type:'speakup', key:'s5_yard', label:'Polite request — permission',
             prompt:"Ask Rachel if you can play with Buddy outside.", ua:"Запитай Рейчел, чи можна погратися з Бадді надворі.",
             hints:["Simple and friendly: “Can I…?”", "…play with Buddy outside? / …throw the ball for him?"],
             model:"Can I play with Buddy outside later?", vocab:['is-it-okay'], minWords:4,
             after:{ who:'rachel', text:"Please do! He'll love you forever. Well — he already does.", ua:"Звісно! Він любитиме тебе вічно. Ну — він уже любить." } },
    y4:    { type:'fetch', key:'s5_fetch' },
    y5:    { type:'room', room:'yard', next:'hub' },
    /* house rules (after the first three rooms) */
    ru0:   narr("On the way upstairs, Rachel stops at the bottom of the stairs.", "Дорогою нагору Рейчел зупиняється біля сходів.", { bg:'entry', cast:['rachel@right'], amb:'home' }),
    ru1:   say('rachel', "Just a few things you should know.", "Лише кілька речей, які тобі варто знати."),
    rules: { type:'listen3', who:'rachel', key:'s5_rules',
             audio:"Just a few things you should know. We usually have dinner at six. If you're going out, please let us know where you're going. And remember to knock before entering someone's bedroom.",
             ua:"Лише кілька речей, які тобі варто знати. Ми зазвичай вечеряємо о шостій. Якщо кудись ідеш — будь ласка, кажи нам, куди. І не забувай стукати, перш ніж заходити до чиєїсь спальні.",
             qs:[ { q:"What time is dinner usually?", qua:"О котрій зазвичай вечеря?", options:[ { text:'At five o\'clock' }, { text:'At six o\'clock', correct:true }, { text:'At seven o\'clock' } ],
                    hint:"Listen for the number after “dinner at…”" },
                  { q:"What should you do before going out?", qua:"Що треба зробити, перш ніж кудись іти?", options:[ { text:'Take Buddy with you' }, { text:'Let the family know where you\'re going', correct:true }, { text:'Lock all the windows' } ],
                    hint:"“If you're going out, please let us know…”" },
                  { q:"What should you do before entering someone's bedroom?", qua:"Що треба зробити, перш ніж зайти до чиєїсь спальні?", options:[ { text:'Knock', correct:true }, { text:'Call them' }, { text:'Take off your shoes' } ],
                    hint:"Knock, knock! 🚪✊" } ] },
    ru2:   say('rachel', "That's it, really. No big deal — we just like to know everyone's okay.", "Ось і все. Нічого складного — нам просто важливо знати, що з усіма все гаразд."),
    gram:  { type:'polite', key:'s5_polite' },
    ru3:   say('rachel', "Okay — now the best part. Your room!", "Ну що — а тепер найкраще. Твоя кімната!", { set:{ rulesDone:true }, next:'hub' }),
    /* your room (always last) */
    b1:    narr("Upstairs, at the end of the hallway, Rachel opens a door.", "Нагорі, в кінці коридору, Рейчел відчиняє двері.", { bg:'bedroom', cast:['rachel@doorR'] }),
    b2:    say('rachel', "And this is your room. Make yourself at home! I'll leave you to unpack.", "А це твоя кімната. Почувайся як удома! Не заважатиму — розпаковуйся.", { vocab:['make-yourself-home'] }),
    b3:    { type:'speakup', key:'s5_bedroom', label:'Polite question',
             prompt:"Before she goes, ask Rachel where you can put your things.", ua:"Поки вона не пішла, запитай Рейчел, куди можна покласти речі.",
             hints:["Use “Where can I…?”", "…put my things? / …hang my clothes?"],
             model:"Thank you! Where can I put my things?", minWords:4,
             after:{ who:'rachel', text:"The wardrobe and the shelves are all yours. Lunch in half an hour!", ua:"Шафа й полиці — усе твоє. Обід за пів години!" } },
    b4:    { type:'room', room:'bedroom', next:'won' },
    won:   { type:'reward', banner:'HOUSE TOUR COMPLETE! 🔑', sub:'You asked for permission — politely — in every room.', item:'Miller House key',
             phrases:['make-yourself-home','help-yourself','is-it-okay','do-you-mind'] },
    end:   { type:'end', next:'s6' }
  } },

/* ---------------------------------------------------------------- SCENE 6 */
{ id:'s6', n:6, title:'The Unexpected Room', emoji:'📦', objective:'Decide what to do about the box',
  bg:'bedroom', ambience:'home', clock:'11:48 AM', cast:[],
  hotspots:[
    { id:'s6-bed', x:24, y:78, ph:[24, 80], img:CLOSE('bed'), icon:'🛏️', label:'Sit on the bed', bgs:['bedroom','bedroomMoved'],
      text:"Soft, clean, and it smells like lavender. Your own bed — no hotel, no alarm clock. Finally.", ua:"М'яке, чисте й пахне лавандою. Твоє власне ліжко — без готелю й без будильника. Нарешті." },
    { id:'s6-note', x:66, y:52, ph:[78, 58], icon:'📝', label:'Read the note', bgs:['bedroom','bedroomMoved'],
      text:"“PLEASE DON'T TOUCH. — A.” In big black letters. Underlined. Twice.", ua:"«БУДЬ ЛАСКА, НЕ ЧІПАЙ. — А.» Великими чорними літерами. Підкреслено. Двічі." },
    { id:'s6-window', x:84, y:30, ph:[73, 25], icon:'🌿', label:'Look out of the window', bgs:['bedroom','bedroomMoved'],
      text:"The garden. Buddy is digging a hole under the lemon tree. Of course he is.", ua:"Сад. Бадді копає яму під лимонним деревом. Ну звісно." },
    { id:'s6-case', x:30, y:76, ph:[47, 70], icon:'🧳', label:'Unpack a little more', bgs:['bedroom','bedroomMoved'],
      text:"T-shirts in the wardrobe. Your photo of Mia on the shelf. The jar of honey for Rachel — you'll give it to her at dinner.", ua:"Футболки — у шафу. Фото з Мією — на полицю. Баночка меду для Рейчел — віддаси за вечерею." }
  ],
  nodes:{
    in:    narr("You're alone in your new room. You open your suitcase and start unpacking.", "Ти сам(-а) у своїй новій кімнаті. Відкриваєш валізу й починаєш розпаковуватися.", { cam:'drift' }),
    n2:    narr("It's actually a pretty nice room. A comfortable bed, a desk, a window overlooking the garden…", "Насправді кімната дуже гарна. Зручне ліжко, письмовий стіл, вікно в сад…"),
    pan:   think("Wait. What's that on the desk?", "Стоп. Що це на столі?", { cam:'push' }),
    box:   { type:'note', key:'s6_note' },
    n3:    narr("Whose box is this? Why is it in your room? And why does that message feel so unfriendly?", "Чия це коробка? Чому вона в твоїй кімнаті? І чому ця записка звучить так недружньо?"),
    ta:    think("“A.”… Alex? David said he builds robots.", "«А.»… Алекс? Девід казав, що він збирає роботів.", { when: f => f.davidTopic === 'family' }),
    pick:  { type:'choice', prompt:"What do you do?", ua:"Що робитимеш?", key:'boxChoice', options:[
             { text:"Ask Rachel about the box.", ua:"Запитати Рейчел про коробку.", emoji:'🙋', value:'ask', next:'a1' },
             { text:"Leave it alone and ask Alex later.", ua:"Не чіпати й запитати Алекса пізніше.", emoji:'⏳', value:'leave', next:'l1' },
             { text:"Carefully move it to make space.", ua:"Обережно пересунути, щоб звільнити місце.", emoji:'📦', value:'move', next:'m1' } ] },
    /* A — ask Rachel */
    a1:    narr("You go downstairs. Rachel is in the kitchen, tasting the sauce.", "Ти спускаєшся вниз. Рейчел на кухні куштує соус.", { bg:'kitchen', cast:['rachel@right'] }),
    a2:    { type:'speakup', key:'s6_explain', label:'Speaking moment — explain it politely',
             prompt:"Explain the situation to Rachel — politely, without sounding rude.", ua:"Поясни Рейчел ситуацію — ввічливо, щоб не прозвучало грубо.",
             hints:["Start softly: “Sorry, Rachel — I noticed…”", "Then: “I wasn't sure…” or ask: “Is it okay if…?”"],
             starters:["Sorry, Rachel —","I noticed…","I wasn't sure what to do with it.","Is it okay if…?"],
             model:"Sorry, Rachel — I noticed there's a box on my desk. I wasn't sure what to do with it. Is it okay if we move it somewhere else?",
             vocab:['i-noticed','is-it-okay'], minWords:8,
             after:{ who:'rachel', text:"Oh, that's Alex's! That room used to be his project room. He promised he'd move everything yesterday…", ua:"О, це Алексове! Ця кімната раніше була його майстернею. Він обіцяв усе забрати ще вчора…" } },
    a3:    say('rachel', "I'm sorry about that. Let's move his things together after lunch — and I'll have a word with him. Gently. 😄", "Вибач за це. Давай після обіду разом перенесемо його речі — і я з ним поговорю. М'яко. 😄"),
    a4:    narr("Back upstairs, you leave the box exactly where it is.", "Повернувшись нагору, ти залишаєш коробку там, де вона стоїть.", { bg:'bedroom', cast:[], next:'use' }),
    /* B — leave it, ask Alex later */
    l1:    think("Not my box, not my decision. I'll ask Alex.", "Не моя коробка — не мені й вирішувати. Запитаю в Алекса."),
    l2:    { type:'speakup', key:'s6_explain', label:'Speaking moment — practise first',
             prompt:"Practise what you'll say to Alex — politely, without sounding rude.", ua:"Потренуйся, що скажеш Алексові — ввічливо, щоб не прозвучало грубо.",
             hints:["Start softly: “Hi! I noticed…”", "Then: “I wasn't sure…” or ask: “Is it okay if…?”"],
             starters:["Hi!","I noticed…","I wasn't sure what to do with it.","Is it okay if…?"],
             model:"Hi! I noticed there's a box on my desk. I wasn't sure what to do with it. Is it okay if we move it somewhere else?",
             vocab:['i-noticed','is-it-okay'], minWords:8 },
    l3:    think("Okay. That sounds friendly — not like a complaint.", "Добре. Звучить дружньо — а не як скарга.", { next:'use' }),
    /* C — move it carefully */
    m1:    { type:'move', key:'s6_move' },
    m2:    think("Oh no. Nothing's broken… I think. But a cable came out.", "Ой. Нічого не зламалося… здається. Але випав якийсь кабель."),
    m3:    { type:'speakup', key:'s6_explain', label:'Speaking moment — explain it politely',
             prompt:"When Alex comes, how will you explain what happened? Be polite and honest.", ua:"Коли прийде Алекс, як ти поясниш, що сталося? Будь ввічливим(-ою) і чесним(-ою).",
             hints:["Start with what you did: “I noticed your box… so I moved it.”", "Then say sorry: “I didn't mean to…”"],
             model:"Hi! I noticed your box was on my desk, so I moved it — but a cable came out. I'm really sorry. I didn't mean to touch your stuff.",
             vocab:['i-noticed','didnt-mean'], minWords:8 },
    use:   { type:'useful', title:'Useful English · Saying it nicely', ids:['i-noticed','is-it-okay'],
             extra:[ { en:"I wasn't sure…", ua:"Я не був(-ла) впевнений(-а)…", simple:"A soft way to explain why you're asking.", ex:"“I wasn't sure what to do with it.”" } ] },
    steps: narr("Footsteps. Someone is coming up the stairs…", "Кроки. Хтось підіймається сходами…", { sfx:'steps', cam:'push' }),
    end:   { type:'end', next:'s7' }
  } },

/* ---------------------------------------------------------------- SCENE 7 */
{ id:'s7', n:7, title:'The Mystery Text', emoji:'📱', objective:'Meet Alex',
  bg:'door', ambience:'home', clock:'12:05 PM', cast:['alex@door'],
  hotspots:[],
  nodes:{
    in:    narr("A boy in a dark gray hoodie and a black visor stops at the door. He's holding a laptop — and he looks a little uncomfortable.", "У дверях зупиняється хлопець у темно-сірому худі й чорному козирку. Він тримає ноутбук — і виглядає трохи ніяково.", { cam:'push' }),
    a1:    say('alex', "Oh. Hey. You must be the exchange student.", "О. Привіт. Ти, мабуть, учень (учениця) з програми обміну.", { hideHotspots:true }),
    y1:    { type:'choice', speak:true, prompt:"Answer:", ua:"Відповідай:", options:[
             { text:"Yeah! Nice to meet you.", ua:"Ага! Приємно познайомитися.", vocab:['nice-to-meet'] },
             { text:"Yeah, hi! Nice to meet you.", ua:"Так, привіт! Приємно познайомитися.", vocab:['nice-to-meet'] } ] },
    a2:    say('alex', "I'm Alex. Sorry, I was working on something.", "Я Алекс. Вибач, я тут дещо робив.", { meet:'alex' }),
    br:    { type:'branch', fn: f => ({ move:'m1', ask:'k1' })[f.boxChoice] || 'l1' },
    /* you moved the box */
    m1:    say('alex', "Oh — you moved my box.", "О — ти пересунув(-ла) мою коробку."),
    m2:    { type:'choice', speak:true, prompt:"Tell him what happened:", ua:"Розкажи, що сталося:", options:[
             { text:"Yeah, sorry — a cable came out. I didn't mean to break anything!", ua:"Так, вибач — випав кабель. Я не хотів(-ла) нічого зламати!", vocab:['didnt-mean'] },
             { text:"Sorry! I tried to be careful, but a cable slipped out.", ua:"Вибач! Я намагався(-лася) обережно, але кабель вислизнув." } ] },
    m3:    say('alex', "It's fine — it just unplugs. I'll check it later. Honestly, I was supposed to move it yesterday.", "Нічого — він просто від'єднується. Я пізніше перевірю. Чесно кажучи, я мав забрати її ще вчора."),
    m4:    say('alex', "Yeah… that's on me.", "Так… це моя провина.", { vocab:['thats-on-me'], next:'phone' }),
    /* you asked Rachel */
    k1:    say('alex', "Mom said you found my box. I was supposed to move it yesterday.", "Мама сказала, що ти знайшов(-ла) мою коробку. Я мав забрати її ще вчора."),
    k2:    say('you', "No worries. I just wasn't sure what to do with it.", "Нічого страшного. Я просто не знав(-ла), що з нею робити.", { vocab:['no-worries'] }),
    k3:    say('alex', "Yeah… that's on me. She already gave me The Look. 😅", "Так… це моя провина. Вона вже кинула на мене Той Самий Погляд. 😅", { vocab:['thats-on-me'], next:'phone' }),
    /* you left it alone */
    l1:    say('alex', "Oh, that's mine. I was supposed to move it yesterday.", "О, це моє. Я мав забрати її ще вчора."),
    l2:    { type:'choice', speak:true, prompt:"Answer — the way you practised:", ua:"Відповідай — так, як тренувався(-лася):", options:[
             { text:"No worries. I just wasn't sure what to do with it.", ua:"Нічого страшного. Я просто не знав(-ла), що з нею робити.", vocab:['no-worries'] },
             { text:"I noticed it on my desk — I wasn't sure what to do with it.", ua:"Я помітив(-ла) її на столі — не знав(-ла), що з нею робити.", vocab:['i-noticed'] } ] },
    l3:    say('alex', "Thanks for not touching it. Yeah… that's on me.", "Дякую, що не чіпав(-ла). Так… це моя провина.", { vocab:['thats-on-me'] }),
    /* the reveal */
    phone: say('alex', "Mom said I should give you my number. You know — in case you need help with anything.", "Мама сказала дати тобі мій номер. Ну, раптом тобі знадобиться допомога."),
    tap:   narr("He types something on his phone. A second later, your phone buzzes.", "Він щось набирає в телефоні. За секунду твій телефон вібрує."),
    ping:  { type:'notify', thread:'unknown', text:"hey it's alex 👋" },
    match: { type:'match', key:'s7_match' },
    y2:    say('you', "Wait… did you text me last night?", "Стоп… це ти написав мені вчора ввечері?", { cam:'push' }),
    a5:    narr("Alex looks embarrassed.", "Алекс ніяковіє."),
    a6:    say('alex', "Yeah. That was me.", "Так. Це був я."),
    y3:    say('you', "Seriously? Why didn't you just say who you were?", "Серйозно? Чому ти просто не сказав, хто ти?"),
    a7:    say('alex', "I know. That was weird. I didn't mean to freak you out.", "Знаю. Це було дивно. Я не хотів тебе налякати.", { vocab:['didnt-mean'] }),
    a8:    say('alex', "This used to be my project room, and I hadn't moved all my stuff. I wanted to warn you that things might be messy.", "Раніше тут була моя майстерня, а я не встиг забрати всі речі. Хотів попередити, що тут може бути безлад."),
    a9:    say('alex', "And, well… I guess I'm not great with change.", "І, ну… здається, я не дуже добре сприймаю зміни."),
    y4:    say('you', "I get that. This is all pretty new for me too.", "Я розумію. Для мене це все теж нове.", { vocab:['i-get-that'] }),
    a10:   say('alex', f => (ep2f().mysteryChoice === 'reply' ? "Yeah. Sorry about the text — and sorry I didn't answer you last night. I didn't know what to say. " : "Yeah. Sorry about the text. ") + "I should've explained.",
                       f => (ep2f().mysteryChoice === 'reply' ? "Так. Вибач за те повідомлення — і що не відповів тобі вчора. Не знав, що сказати. " : "Так. Вибач за те повідомлення. ") + "Треба було пояснити."),
    apo:   { type:'choice', prompt:"Alex is apologizing. How do you respond?", ua:"Алекс просить вибачення. Що відповіси?", key:'apology', options:[
             { text:"It's okay. I get it. Moving is a big change for everyone.", ua:"Усе гаразд. Я розумію. Переїзд — велика зміна для всіх.", emoji:'🤝', value:'understanding', say:true, vocab:['i-get-that'], next:'pu1' },
             { text:"To be honest, your message made me pretty nervous.", ua:"Чесно кажучи, твоє повідомлення мене добряче знервувало.", emoji:'💬', value:'honest', say:true, vocab:['to-be-honest'], next:'ph1' },
             { text:"No worries. Maybe we can sort out the room together?", ua:"Нічого страшного. Може, разом розберемося з кімнатою?", emoji:'📦', value:'friendly', say:true, vocab:['no-worries'], next:'pf1' } ] },
    pu1:   say('alex', "Thanks. Seriously. My parents have been talking about you for weeks — I think I just needed it to be real.", "Дякую. Серйозно. Батьки говорили про тебе тижнями — мабуть, мені просто треба було, щоб це стало реальним."),
    pu2:   say('alex', "I guess I'm still getting used to it.", "Мабуть, я ще звикаю до цього.", { vocab:['getting-used'], next:'use' }),
    ph1:   say('alex', "Yeah. That's fair. I'd be nervous too. I really didn't mean it like that.", "Так. Справедливо. Я б теж знервувався. Я справді не мав цього на увазі.", { vocab:['didnt-mean'] }),
    ph2:   say('alex', "I'm still getting used to having someone new in the house. But that's my problem, not yours.", "Я ще звикаю, що в домі хтось новий. Але це моя проблема, а не твоя.", { vocab:['getting-used'], next:'use' }),
    pf1:   say('alex', "Yeah? That'd be great, actually. I'll move the rest of my stuff today — and you can help me carry the heavy box.", "Так? Насправді це було б класно. Я сьогодні заберу решту речей — а ти допоможеш мені донести важку коробку.", { set:{ helpedAlex:true } }),
    pf2:   say('alex', "Sorry. I'm still getting used to all this.", "Вибач. Я ще звикаю до всього цього.", { vocab:['getting-used'] }),
    use:   { type:'useful', title:'Useful English · Apologies', ids:['didnt-mean','thats-on-me','i-get-that','to-be-honest','no-worries','getting-used'] },
    jake:  narr("Then you remember last night — and the way Jake stopped in the middle of his sentence.", "І тут ти згадуєш учорашній вечір — і як Джейк замовк на півслові."),
    y5:    say('you', "By the way, I met someone named Jake yesterday. Do you know him?", "До речі, я вчора познайомився(-лася) з хлопцем на ім'я Джейк. Ти його знаєш?"),
    a11:   say('alex', "Jake Carter?", "Джейка Картера?"),
    y6:    say('you', "Yeah!", "Ага!"),
    a12:   say('alex', "We used to hang out a lot.", "Ми раніше багато тусувалися разом."),
    y7:    say('you', "Used to?", "Раніше?"),
    a13:   say('alex', "It's… kind of a long story.", "Це… довга історія.", { cam:'push' }),
    quiet: narr("Alex looks down at his laptop. He doesn't say anything else.", "Алекс опускає погляд на ноутбук. Більше він нічого не каже."),
    gentle:{ type:'quiz', noLine:true, noEcho:false, who:'alex', key:'s7_gentle',
             prompt:"It looks personal. How can you ask about it — gently?", ua:"Схоже, це щось особисте. Як запитати про це делікатно?",
             options:[
               { text:"Why? What did you do to him?", react:["Hmm… that sounds like you're blaming him. He might close up completely.", "Хм… звучить, ніби ти його звинувачуєш. Він може зовсім закритися."], who:'think',
                 tip:"Some questions are very personal. Start softly — “Sorry if it's personal, but…”" },
               { text:"Sorry if it's personal, but… are you two still friends?", correct:true, ua:"Вибач, якщо це особисте, але… ви ще друзі?" },
               { text:"Come on, tell me everything!", react:["That's a lot of pressure. He just said it's a long story.", "Це забагато тиску. Він щойно сказав, що це довга історія."], who:'think',
                 tip:"It's okay if someone isn't ready to answer. A gentle question gives them space." } ],
             hints:["Look for the question that starts softly.", "“Sorry if it's personal, but…” gives Alex a way to say no.", "Обери запитання, яке починається з вибачення й залишає Алексові вибір."] },
    a14:   say('alex', "Honestly? I don't know. Maybe some other time, okay?", "Чесно? Не знаю. Може, якось іншим разом, гаразд?"),
    y8:    { type:'choice', speak:true, prompt:"Answer:", ua:"Відповідай:", options:[
             { text:"Sure. No worries.", ua:"Звісно. Без проблем.", vocab:['no-worries'] },
             { text:"Of course. Whenever you're ready.", ua:"Звісно. Коли будеш готовий." } ] },
    tip:   think("Some questions are personal — and it's okay if someone isn't ready to answer. I can wait.", "Деякі запитання — особисті, і це нормально, якщо людина не готова відповідати. Я можу почекати."),
    a15:   say('alex', f => f.boxChoice === 'move' ? "Anyway — let me help you with your suitcase. And I'll get this box out of your way." : "Anyway, let me help you with your suitcase.",
                       f => f.boxChoice === 'move' ? "Гаразд — давай допоможу з валізою. І заберу цю коробку з дороги." : "Гаразд, давай допоможу тобі з валізою."),
    rename:{ type:'act', run:'revealAlex' },
    win:   { type:'reward', banner:'MYSTERY SOLVED! 📱', sub:'You handled an apology — kindly and honestly.', phrases:['didnt-mean','thats-on-me','i-get-that','getting-used','to-be-honest'] },
    mia:   { type:'notify', thread:'mia', text:"SO??? Are they nice?? Did you find out who sent the message?? 👀" },
    miac:  { type:'phone', thread:'mia', steps:[
      { in:"SO??? Are they nice?? Did you find out who sent the message?? 👀", id:'e3s7m1' },
      { reply:{ id:'e3s7r1', options:[ { text:"They're SO nice! And the mystery texter was… their son, Alex 😂" }, { text:"Mystery solved! It was Alex, their son. He's actually nice!" } ] } },
      { in:"NO WAY 😂 A mystery AND a host brother?! Okay, I need a full report tonight 💙", id:'e3s7m2' },
      { end:'Go down for lunch' } ] },
    end:   { type:'end', next:'s8' }
  } },

/* ---------------------------------------------------------------- SCENE 8 */
{ id:'s8', n:8, title:'The First Evening', emoji:'🌅', objective:'Have dinner with the family',
  bg:'dining', ambience:'dinner', clock:'6:00 PM', cast:[],
  hotspots:[
    { id:'s8-buddy', x:76, y:76, icon:'🐾', label:'Look under the table', bgs:['dining'],
      text:"Buddy is sitting VERY politely. Too politely. He's waiting for someone to drop a meatball.", ua:"Бадді сидить ДУЖЕ чемно. Аж занадто. Він чекає, поки хтось упустить фрикадельку." },
    { id:'s8-food', x:46, y:64, img:[CLOSE('tomato-soup'), CLOSE('spaghetti'), CLOSE('garlic-bread')], icon:'🍝', label:'Look at dinner', bgs:['dining'],
      text:"Tomato soup to start. Then spaghetti and meatballs, garlic bread, a huge salad — and your jar of honey from home in the middle of the table. Rachel loved it.", ua:"Спершу томатний суп. Потім спагеті з фрикадельками, часниковий хліб, величезний салат — і твоя баночка меду з дому посеред столу. Рейчел у захваті." },
    { id:'s8-window', x:16, y:30, icon:'🌅', label:'Look out of the window', bgs:['dining'],
      text:"The sky is turning orange and pink over the palm trees. Your second sunset in LA. This one feels different — calmer.", ua:"Небо над пальмами стає помаранчево-рожевим. Твій другий захід сонця в Лос-Анджелесі. Цей — інакший, спокійніший." }
  ],
  nodes:{
    in:    narr("Six o'clock. Golden light, a big bowl of spaghetti, and the whole family around the table. Buddy sits next to your chair, hoping for a miracle.",
                "Шоста вечора. Золоте світло, велика миска спагеті — і вся родина за столом. Бадді сидить біля твого стільця й чекає на диво.", { cam:'drift' }),
    r1:    say('rachel', "So, how was your first day with us?", "Ну, як тобі перший день у нас?"),
    y1:    { type:'choice', speak:true, prompt:"Answer Rachel:", ua:"Відповідай Рейчел:", options:[
             { text:"It was great! A little overwhelming, but in a good way.", ua:"Чудово! Трохи забагато всього, але в хорошому сенсі." },
             { text:"Honestly? Amazing. A little overwhelming, but in a good way.", ua:"Чесно? Неймовірно. Трохи забагато всього, але в хорошому сенсі." } ] },
    d1:    say('david', "That's normal. There's a lot to get used to.", "Це нормально. Тут багато до чого треба звикнути.", { vocab:['getting-used'] }),
    r2:    say('rachel', "Just remember, you can always ask us if you need anything.", "Тільки пам'ятай: ти завжди можеш звернутися до нас, якщо щось потрібно."),
    a1:    say('alex', "And if you need help with the Wi-Fi or your laptop, I'm your guy.", "А якщо треба допомогти з Wi-Fi чи ноутбуком — звертайся до мене."),
    y2:    say('you', "Thanks, Alex!", "Дякую, Алексе!"),
    cons:  say('alex', f => f.apology === 'honest' ? "And… I still feel bad about that text. I promise I'm not usually that weird."
                          : f.helpedAlex ? "Hey, thanks for helping me move my stuff earlier. Really appreciate it."
                          : "Thanks for being so cool about everything today.",
                      f => f.apology === 'honest' ? "І… мені досі ніяково через те повідомлення. Обіцяю, зазвичай я не такий дивний."
                          : f.helpedAlex ? "Слухай, дякую, що допоміг(-ла) перенести мої речі. Я справді ціную."
                          : "Дякую, що так спокійно до всього поставився(-лася) сьогодні."),
    cable: say('alex', "Oh — and that cable? Totally fine. It just unplugged. No harm done.", "А — і той кабель? Усе гаразд. Він просто від'єднався. Нічого не зламано.", { when: f => !!f.cableOut }),
    jk1:   say('rachel', "Oh — and you met Jake Carter last night! He used to be here all the time, you know.", "А — ти ж учора познайомився(-лася) з Джейком Картером! Знаєш, він раніше тут постійно бував.", { when: () => !!ep2f().mentionedJake }),
    jk2:   narr("Alex suddenly finds his spaghetti very, very interesting.", "Алекс раптом дуже-дуже зацікавлюється своїми спагеті.", { when: () => !!ep2f().mentionedJake }),
    jk3:   say('david', "Anyway! Who wants more garlic bread?", "Ну що ж! Хто хоче ще часникового хліба?", { when: () => !!ep2f().mentionedJake }),
    sp:    { type:'speakup', key:'s8_like', label:'Speaking moment — at the table',
             prompt:"Rachel asks: “What's one thing you already like about your new home?”", ua:"Рейчел питає: «Що тобі вже подобається у твоєму новому домі?»",
             hints:["Start with “I really like…” or “My favorite thing is…”", "Ideas: your room, the backyard, the kitchen, Buddy, the family dinners…"],
             starters:["I really like…","My favorite thing is…","…because…"],
             model:"I really like my room — the window looks over the garden. And Buddy, of course!", minWords:5,
             after:{ who:'david', text:"That's great to hear. Buddy says thank you.", ua:"Дуже приємно це чути. Бадді каже «дякую»." } },
    em1:   say('rachel', f => f.davidTopic === 'hood' ? "Oh! I almost forgot. Emily lives nearby. She's around your age, and she'd love to show you around. And David says you like coffee shops — she practically lives in them!"
                                                     : "Oh! I almost forgot. Emily lives nearby. She's around your age, and she'd love to show you around.",
                         f => f.davidTopic === 'hood' ? "Ой! Мало не забула. Тут поруч живе Емілі. Вона твого віку, і вона із задоволенням покаже тобі околиці. А Девід каже, що ти любиш кав'ярні, — вона в них практично живе!"
                                                     : "Ой! Мало не забула. Тут поруч живе Емілі. Вона твого віку, і вона із задоволенням покаже тобі околиці."),
    em2:   { type:'choice', prompt:"What do you say?", ua:"Що скажеш?", key:'emilyIntro', options:[
             { text:"That sounds great!", ua:"Звучить чудово!", emoji:'😊', value:'yes', say:true, vocab:['sounds-great'], next:'em4' },
             { text:"Really? What's she like?", ua:"Справді? А яка вона?", emoji:'🤔', value:'ask', say:true, next:'em3' } ] },
    em3:   say('rachel', "Super friendly. She loves photography and exploring the city — she knows all the best spots.", "Дуже привітна. Вона обожнює фотографію й досліджувати місто — знає всі найкращі місця."),
    em4:   say('rachel', "I can introduce you two if you'd like. I'll send her your number.", "Можу вас познайомити, якщо хочеш. Я дам їй твій номер."),
    later: narr("Twenty minutes later, while you're helping with the dishes, your phone buzzes.", "Хвилин за двадцять, поки ти допомагаєш мити посуд, твій телефон вібрує.", { cam:'wide' }),
    ping:  { type:'notify', thread:'emily', text:"Hey!! I'm Emily! 👋 Rachel told me you just got here!", meet:'emily' },
    emc:   { type:'phone', thread:'emily', steps:[
      { in:"Hey!! I'm Emily! 👋 Rachel told me you just got here! Wanna grab coffee tomorrow? ☕🌴", id:'e3s8e1' },
      { reply:{ id:'e3s8r1', key:'emilyReply', options:[
        { text:"Hey! I'd love to! 😊", value:'love' },
        { text:"Sounds great! What time were you thinking?", value:'time' },
        { text:"Hey! Nice to meet you! Where should we go?", value:'where' } ] } },
      { id:'e3s8e2', inFn: f => ({ love:"Yay!! 🎉 Okay, I'll text you in the morning and we'll figure it out!",
                                   time:"Hmm, maybe late morning? I'll text you tomorrow and we'll figure it out! ☀️",
                                   where:"I know a few cute places nearby! Let's decide tomorrow — I'll text you ☕" })[f.emilyReply] || "Yay! I'll text you tomorrow! 😊" },
      { end:'Put the phone down' } ] },
    jkp:   { type:'notify', thread:'jake', text:"Wait… you're meeting Emily tomorrow? 😂" },
    jkc:   { type:'phone', thread:'jake', steps:[
      { in:"Wait… you're meeting Emily tomorrow? 😂", id:'e3s8j1' },
      { end:'…How does he even know that?' } ] },
    cliff: narr("Why does Jake know everyone? And what exactly happened between him and Alex?", "Звідки Джейк знає всіх? І що ж насправді сталося між ним і Алексом?", { sfx:'mystery', cam:'push' }),
    /* the Final Mission */
    knock: narr("Later that evening, there's a soft knock at your door.", "Пізніше ввечері хтось тихенько стукає у твої двері.", { bg:'bedroomEve', cast:['rachel@doorR'], amb:'home', sfx:'knock', cam:'wide' }),
    r9:    say('rachel', "Can I come in? I just wanted to check on you.", "Можна? Я просто хотіла дізнатися, як ти."),
    final: { type:'final', key:'final' },
    rf:    say('rachel', "That means a lot. We're really happy you're here. Good night — and welcome home.", "Це так приємно чути. Ми справді раді, що ти тут. На добраніч — і ласкаво просимо додому."),
    refl:  { type:'reflect', key:'s8_reflect' },
    done:  { type:'complete' }
  } }
];

/* =========================================================================
   SCENE ART
   -------------------------------------------------------------------------
   Drawn (SVG) scenes for every location, in one consistent look: the same
   cream-and-terracotta Miller house with the red front door, sage-green
   kitchen, warm wood floors. Scene 2 uses the real Palm Court lobby photo
   from Episode 2 (same hotel, same receptionist).

   ▶ Real photos: put a 16:9 .webp (1672×941) in episodes/episode-03/photos/
     with the name from photos/ASSET-PROMPTS.md, then add its key to
     READY_PHOTOS below. Until then the drawing is shown — nothing breaks,
     and no image path is requested that doesn't exist. The photos have no
     people in them: the Millers and Buddy are cut-outs on top (PH_CAST).
   ========================================================================= */
const PHOTO_BASE = BASE + 'photos/';
const PHOTO_SLOTS = {
  roomAm:'s1-room-308-morning.webp', hotelOut:'s3-hotel-outside-day.webp', carRide:'s3-car-ride.webp',
  houseFront:'s4-miller-house.webp', entry:'s5-hallway.webp', kitchen:'s5-kitchen.webp', living:'s5-living-room.webp',
  yard:'s5-backyard.webp', bedroom:'s6-bedroom-box.webp', bedroomMoved:'s6-bedroom-box-floor.webp',
  door:'s7-alex-doorway.webp', dining:'s8-dining-evening.webp', bedroomEve:'s8-bedroom-evening.webp'
};
/* keys of PHOTO_SLOTS whose file has been added to photos/ (empty = drawn scenes everywhere) */
const READY_PHOTOS = ['roomAm', 'hotelOut', 'carRide', 'houseFront', 'entry', 'kitchen', 'living', 'yard', 'bedroom', 'door', 'bedroomEve'];
const PHOTOS = Object.assign(
  { lobby:'../../episode-02/photos/s1-hotel-lobby.webp' },          // Episode 2's lobby photo — the same hotel
  Object.fromEntries(READY_PHOTOS.filter(k => PHOTO_SLOTS[k]).map(k => [k, PHOTO_SLOTS[k]]))
);

const VIG = (u, o = .5) => `<radialGradient id="${u}vig" cx="50%" cy="50%" r="75%"><stop offset="55%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="${o}"/></radialGradient>`;
const vigRect = u => `<rect width="1600" height="900" fill="url(#${u}vig)"/>`;
/* sunbeams through a window */
const beams = (pts, op = .16) => `<g class="ep3-beam">${pts.map(p => `<polygon points="${p}" fill="#fff4d2" opacity="${op}"/>`).join('')}</g>`;
const cloud = (x, y, s, o = .9) => `<g opacity="${o}"><ellipse cx="${x}" cy="${y}" rx="${70*s}" ry="${22*s}" fill="#fff"/><ellipse cx="${x - 40*s}" cy="${y + 6*s}" rx="${44*s}" ry="${18*s}" fill="#fff"/><ellipse cx="${x + 30*s}" cy="${y - 12*s}" rx="${42*s}" ry="${24*s}" fill="#fff"/></g>`;
const bush = (x, y, r, c = '#4f8a4f') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/><circle cx="${x - r*.8}" cy="${y + r*.25}" r="${r*.75}" fill="${c}"/><circle cx="${x + r*.8}" cy="${y + r*.25}" r="${r*.7}" fill="${c}"/><circle cx="${x - r*.2}" cy="${y - r*.35}" r="${r*.55}" fill="#68a364" opacity=".6"/>`;
const flowers = (r, x0, x1, y, n) => { let s = ''; for(let i = 0; i < n; i++){ const x = x0 + r() * (x1 - x0), yy = y + r() * 30; s += `<circle cx="${x.toFixed(0)}" cy="${yy.toFixed(0)}" r="${(5 + r() * 5).toFixed(1)}" fill="${['#ff8fb1','#FF8A3D','#ffd23f','#fff','#c9b8ff'][i % 5]}"/>`; } return s; };
function lemonTree(x, base, h){
  const r = rng(x + h);
  let fruit = '';
  for(let i = 0; i < 16; i++){ const a = r() * Math.PI * 2, d = r() * h * 0.32; fruit += `<ellipse cx="${(x + Math.cos(a) * d).toFixed(0)}" cy="${(base - h * 0.72 + Math.sin(a) * d * 0.7).toFixed(0)}" rx="9" ry="7" fill="#ffd84a"/>`; }
  return `<path d="M${x} ${base} q-6 ${-h * 0.3} 4 ${-h * 0.5}" stroke="#6b4a2e" stroke-width="${h * 0.06}" fill="none" stroke-linecap="round"/>
    <circle cx="${x}" cy="${base - h * 0.72}" r="${h * 0.36}" fill="#3f7a40"/><circle cx="${x - h * 0.2}" cy="${base - h * 0.62}" r="${h * 0.24}" fill="#4f8f4c"/><circle cx="${x + h * 0.2}" cy="${base - h * 0.8}" r="${h * 0.22}" fill="#5aa056"/>${fruit}`;
}
/* the Miller house photo wall frame */
const frame = (x, y, w, h, inner) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#3b2a20"/><rect x="${x + 7}" y="${y + 7}" width="${w - 14}" height="${h - 14}" fill="#f6efe2"/>${inner || ''}`;

/* ---------- Buddy, the golden retriever (drawn the same way everywhere) ---------- */
function dog(x, base, s, o = {}){
  const f = o.left ? -1 : 1;                      // facing right by default
  const X = v => x + v * s * f, Y = v => base - v * s;
  const g = (o.id || 'bud') + nextArtId('d');
  const legs = o.sit
    ? `<rect x="${Math.min(X(40), X(62))}" y="${Y(110)}" width="${20*s}" height="${110*s}" rx="${9*s}" fill="url(#${g}f)"/><rect x="${Math.min(X(70), X(92))}" y="${Y(110)}" width="${20*s}" height="${110*s}" rx="${9*s}" fill="url(#${g}f)"/>
       <ellipse cx="${X(-30)}" cy="${Y(40)}" rx="${70*s}" ry="${42*s}" fill="url(#${g}f)"/><ellipse cx="${X(-10)}" cy="${Y(6)}" rx="${40*s}" ry="${12*s}" fill="#b3762a"/>`
    : [-82, -52, 52, 84].map((lx, i) => `<rect x="${Math.min(X(lx), X(lx + 22))}" y="${Y(78)}" width="${22*s}" height="${78*s}" rx="${10*s}" fill="url(#${g}f)" ${i % 2 ? 'opacity=".85"' : ''}/>`).join('');
  const body = o.sit
    ? `<path d="M${X(-70)} ${Y(40)} C${X(-80)} ${Y(140)} ${X(20)} ${Y(210)} ${X(80)} ${Y(190)} C${X(110)} ${Y(150)} ${X(100)} ${Y(80)} ${X(60)} ${Y(40)} Z" fill="url(#${g}f)"/>
       <path d="M${X(40)} ${Y(180)} C${X(70)} ${Y(150)} ${X(80)} ${Y(100)} ${X(70)} ${Y(70)}" stroke="#f3cf86" stroke-width="${26*s}" fill="none" stroke-linecap="round" opacity=".8"/>`
    : `<ellipse cx="${X(0)}" cy="${Y(118)}" rx="${118*s}" ry="${50*s}" fill="url(#${g}f)"/>
       <path d="M${X(60)} ${Y(150)} C${X(100)} ${Y(140)} ${X(112)} ${Y(100)} ${X(96)} ${Y(80)}" stroke="#f3cf86" stroke-width="${22*s}" fill="none" stroke-linecap="round" opacity=".75"/>`;
  const hx = o.sit ? 100 : 128, hy = o.sit ? 250 : 178;
  const tail = o.sit
    ? `<path d="M${X(-80)} ${Y(30)} C${X(-150)} ${Y(30)} ${X(-170)} ${Y(70)} ${X(-150)} ${Y(96)}" stroke="#c8892f" stroke-width="${16*s}" fill="none" stroke-linecap="round"/>`
    : `<path class="ep3-tail" d="M${X(-110)} ${Y(130)} C${X(-160)} ${Y(150)} ${X(-180)} ${Y(200)} ${X(-170)} ${Y(232)}" stroke="#c8892f" stroke-width="${18*s}" fill="none" stroke-linecap="round"/>
       <path d="M${X(-120)} ${Y(140)} C${X(-150)} ${Y(170)} ${X(-170)} ${Y(190)} ${X(-180)} ${Y(222)}" stroke="#e7b75e" stroke-width="${8*s}" fill="none" stroke-linecap="round" opacity=".7"/>`;
  const glove = o.glove ? `<path d="M${X(hx + 40)} ${Y(hy - 30)} l${18*s*f} ${-6*s} l${6*s*f} ${-26*s} l${10*s*f} ${4*s} l${-2*s*f} ${24*s} l${14*s*f} ${-18*s} l${8*s*f} ${8*s} l${-14*s*f} ${30*s} l${-30*s*f} ${16*s} Z" fill="#c2453a" stroke="#7a2520" stroke-width="${2*s}"/>` : '';
  const ball = o.ball ? `<circle cx="${X(hx + 52)}" cy="${Y(hy - 34)}" r="${16*s}" fill="#cde84a"/><path d="M${X(hx + 38)} ${Y(hy - 40)} q${14*s*f} ${10*s} ${28*s*f} ${0}" stroke="#fff" stroke-width="${3*s}" fill="none"/>` : '';
  return `<g class="ep3-dog${o.cls ? ' ' + o.cls : ''}" aria-hidden="true">
    <defs><linearGradient id="${g}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e5ac4f"/><stop offset="1" stop-color="#b9792a"/></linearGradient></defs>
    <ellipse cx="${X(10)}" cy="${base}" rx="${150*s}" ry="${12*s}" fill="#000" opacity=".18"/>
    ${tail}${legs}${body}
    <path d="M${X(hx - 50)} ${Y(hy - 40)} C${X(hx - 40)} ${Y(hy - 80)} ${X(hx - 10)} ${Y(hy - 60)} ${X(hx)} ${Y(hy - 20)}" fill="url(#${g}f)"/>
    <circle cx="${X(hx)}" cy="${Y(hy)}" r="${44*s}" fill="url(#${g}f)"/>
    <ellipse cx="${X(hx + 42)}" cy="${Y(hy - 14)}" rx="${32*s}" ry="${21*s}" fill="#e9bd6c"/>
    <ellipse cx="${X(hx + 70)}" cy="${Y(hy - 6)}" rx="${9*s}" ry="${7*s}" fill="#2a1a10"/>
    <circle cx="${X(hx + 16)}" cy="${Y(hy + 12)}" r="${5*s}" fill="#2a1a10"/><circle cx="${X(hx + 18)}" cy="${Y(hy + 14)}" r="${1.6*s}" fill="#fff"/>
    <path d="M${X(hx - 20)} ${Y(hy + 30)} C${X(hx - 56)} ${Y(hy + 20)} ${X(hx - 58)} ${Y(hy - 34)} ${X(hx - 34)} ${Y(hy - 46)} C${X(hx - 20)} ${Y(hy - 20)} ${X(hx - 14)} ${Y(hy + 10)} ${X(hx - 20)} ${Y(hy + 30)} Z" fill="#a8681f"/>
    ${o.tongue ? `<path d="M${X(hx + 44)} ${Y(hy - 30)} q${6*s*f} ${-22*s} ${16*s*f} ${0}" fill="#e86a7a"/>` : ''}${glove}${ball}</g>`;
}

/* ---------- the Millers (back-lit, faceless figures until real photos are added) ---------- */
const PEOPLE_ART = {
  david(x, base, s){ return figure(x, base, s, { shirt:'#3E7C8C', rim:'#bfe3ea', hair:'#5a4030', collar:'#e8f3f5' }); },
  rachel(x, base, s){
    const h = base - 300 * s;
    return `<path d="M${x - 58*s} ${h - 6*s} C${x - 74*s} ${h + 70*s} ${x - 56*s} ${h + 104*s} ${x - 30*s} ${h + 92*s} L${x + 30*s} ${h + 92*s} C${x + 56*s} ${h + 104*s} ${x + 74*s} ${h + 70*s} ${x + 58*s} ${h - 6*s} Z" fill="#8a3b22"/>` +
      figure(x, base, s, { shirt:'#d98b5f', rim:'#ffd2b8', hair:'#8a3b22' }) +
      `<path d="M${x - 20*s} ${base - 236*s} L${x - 6*s} ${base} M${x + 20*s} ${base - 236*s} L${x + 6*s} ${base}" stroke="#f6e7d8" stroke-width="${16*s}" opacity=".9"/>`;
  },
  alex(x, base, s, laptop){
    const h = base - 300 * s;
    return figure(x, base, s, { shirt:'#4a5263', rim:'#b8c6e0' }) +
      `<path d="M${x - 64*s} ${h + 46*s} C${x - 74*s} ${h - 64*s} ${x + 74*s} ${h - 64*s} ${x + 64*s} ${h + 46*s} C${x + 40*s} ${h - 6*s} ${x - 40*s} ${h - 6*s} ${x - 64*s} ${h + 46*s}Z" fill="#3c4352"/>` +
      `<path d="M${x - 46*s} ${h - 24*s} C${x - 50*s} ${h - 70*s} ${x + 10*s} ${h - 82*s} ${x + 48*s} ${h - 40*s} C${x + 30*s} ${h - 52*s} ${x + 12*s} ${h - 44*s} ${x + 4*s} ${h - 56*s} C${x - 8*s} ${h - 40*s} ${x - 30*s} ${h - 46*s} ${x - 46*s} ${h - 24*s}Z" fill="#3a2618"/>` +
      `<path d="M${x - 12*s} ${base - 232*s} l${-3*s} ${54*s} M${x + 12*s} ${base - 232*s} l${3*s} ${54*s}" stroke="#d8dee8" stroke-width="${4*s}"/>` +
      (laptop ? `<g transform="rotate(-6 ${x} ${base - 150*s})"><rect x="${x - 92*s}" y="${base - 166*s}" width="${184*s}" height="${22*s}" rx="${6*s}" fill="#c8ced8"/><rect x="${x - 92*s}" y="${base - 148*s}" width="${184*s}" height="${8*s}" rx="${4*s}" fill="#8a93a3"/><circle cx="${x}" cy="${base - 155*s}" r="${5*s}" fill="#fff" opacity=".8"/>` +
        `<path d="M${x - 70*s} ${base - 150*s} q${-20*s} ${30*s} ${-6*s} ${44*s} M${x + 70*s} ${base - 150*s} q${20*s} ${30*s} ${6*s} ${44*s}" stroke="#4a5263" stroke-width="${22*s}" fill="none" stroke-linecap="round"/></g>` : '');
  }
};

/* ---------- the cast layer: people on top of a scene, positioned in the same 1600×900 frame ---------- */
const POS = {
  car:   { x:640, base:770, s:.92 },
  left:  { x:400, base:880, s:1.24 },
  right: { x:1180, base:880, s:1.24 },
  door:  { x:800, base:664, s:.56 },
  doorL: { x:330, base:880, s:1.2 },
  alexDoor: { x:800, base:880, s:1.36 },
  yard:  { x:1000, base:770, s:.9 },
  run:   { x:1000, base:780, s:.85 },
  front: { x:1060, base:780, s:.85 }
};
function castSVG(list, align){
  const parts = list.map(c => {
    const [who, at] = c.split('@'); const p = POS[at] || POS.right;
    if(who === 'buddy'){
      if(at === 'run') return dog(p.x, p.base, p.s, { glove:true, cls:'ep3-run' });
      if(at === 'glove') return dog(POS.front.x, POS.front.base, POS.front.s, { glove:true, left:true, cls:'ep3-wag' });
      if(at === 'sit') return dog(POS.front.x, POS.front.base, POS.front.s, { sit:true, left:true, tongue:true });
      if(at === 'fetch') return dog(p.x, p.base, p.s, { ball:true, cls:'ep3-fetch', tongue:true });
      return dog(p.x, p.base, p.s, { tongue:true, cls:'ep3-wag' });
    }
    if(who === 'alex') return PEOPLE_ART.alex(p.x, p.base, p.s, at === 'alexDoor' || at === 'door');
    if(at === 'door') return PEOPLE_ART[who](p.x, p.base, p.s);
    return PEOPLE_ART[who] ? PEOPLE_ART[who](p.x, p.base, p.s) : '';
  }).join('');
  return `<svg class="ep1-art" viewBox="0 0 1600 900" preserveAspectRatio="${align || 'xMidYMid'} slice" aria-hidden="true" focusable="false">${parts}</svg>`;
}
/* ---------- the photo cast: the real Millers, cut out, standing in front of the photos ----------
   Used when the scene's background is a photo (the drawn people above are used with the drawings).
   They sit in a box with the photo's own 16:9 shape, so they stay in the same place in the photo
   on every screen. x = centre (% of the photo's width); people: h = height (% of the photo's height),
   cut off at the bottom edge like a film shot; Buddy: w = width (%), b = gap under his paws (%). */
const CAST_BASE = PHOTO_BASE + 'cast/';
const CAST_PICS = {                     // file (in photos/cast/) and its width ÷ height
  david:['david', .7384], rachel:['rachel', .6919], alex:['alex', .7128], alexLaptop:['alex-laptop', .7128],
  buddy:['buddy-stand', 1.5222], buddySit:['buddy-sit', 1.0345], buddyBall:['buddy-ball', 1.5254], buddyGlove:['buddy-glove', 1.5965]
};
const PH_CAST = {
  hotelOut:   { 'david@car':null },                                   // David is in the photo
  carRide:    { 'david@car':null },                                   // David is already driving in the photo
  /* the house photo already has David, Rachel and Buddy (sitting); while Buddy has your glove,
     the 'glove' version of the same photo is laid on top */
  houseFront: { 'david@left':null, 'rachel@door':null, 'buddy@sit':null,
                'buddy@run':{ plate:'s4-miller-house-glove', cls:'ep3-ph-dash' },
                'buddy@glove':{ plate:'s4-miller-house-glove' } },
  entry:      { 'rachel@right':null },                                // Rachel is in the photo
  kitchen:    { 'rachel@right':{ x:77, h:74 } },
  living:     { 'david@right':{ x:30, h:74 } },
  yard:       { 'rachel@left':{ x:21, h:74 },
                'buddy@yard':{ pic:'buddy', x:64, w:27, b:7, cls:'ep3-ph-wag' },
                'buddy@fetch':{ pic:'buddyBall', x:64, w:27, b:7, cls:'ep3-ph-fetch' } },
  bedroom:    { 'rachel@doorR':{ x:29, h:76 } },
  bedroomEve: { 'rachel@doorR':{ x:26, h:76 } },
  door:       { 'alex@door':{ pic:'alexLaptop', x:50, h:86 } }
};
const PH_ASPECT = 941 / 1672;
function castPhoto(list, bg){
  const spots = PH_CAST[bg] || {};
  return list.map((c, i) => {
    const sp = spots[c]; if(!sp) return '';
    if(sp.plate) return `<img class="ep3-ph-plate${sp.cls ? ' ' + sp.cls : ''}" src="${PHOTO_BASE + sp.plate}.webp" alt="" draggable="false" decoding="async" onerror="this.remove()">`;
    const who = c.split('@')[0];
    const [file, ar] = CAST_PICS[sp.pic || who] || [];
    if(!file) return '';
    const w = sp.w || sp.h * PH_ASPECT * ar, h = sp.h || sp.w / PH_ASPECT / ar;
    const kind = who === 'buddy' ? 'ep3-ph-dog' : 'ep3-ph-person';
    return `<div class="ep3-ph-fig ${kind}${sp.cls ? ' ' + sp.cls : ''}" style="--x:${sp.x};--w:${w.toFixed(2)};--h:${h.toFixed(2)};bottom:${sp.b || 0}%;--d:${(i * .7).toFixed(1)}s">` +
      `<img src="${CAST_BASE + file}.webp" alt="" draggable="false" decoding="async" onerror="this.remove()"></div>`;
  }).join('');
}
/* fetched together with the photo they stand in (photoExtras), so nobody pops in late */
const PHOTO_EXTRAS = {};
Object.entries(PH_CAST).forEach(([bg, spots]) => {
  PHOTO_EXTRAS[bg] = [...new Set(Object.entries(spots).filter(([, v]) => v).map(([c, v]) => v.plate || 'cast/' + CAST_PICS[v.pic || c.split('@')[0]][0]))];
});
/* …and the hotspot close-ups of each photo scene */
SCENES.forEach(sc => (sc.hotspots || []).forEach(h => [].concat(h.img || []).forEach(src => (h.bgs || []).forEach(bg => {
  if(!PHOTOS[bg]) return;
  (PHOTO_EXTRAS[bg] = PHOTO_EXTRAS[bg] || []).push(src.replace(PHOTO_BASE, '').replace(/\.webp$/, ''));
}))));
/* the people's faces for the dialogue, the phone and the People cards */
const AVATAR = n => PHOTO_BASE + 'avatars/' + n + '.webp';
const AVATARS = { david:AVATAR('david'), rachel:AVATAR('rachel'), alex:AVATAR('alex'), buddy:AVATAR('buddy') };
/* the yard photo gets Buddy's (very wet) tennis ball on the grass */
const PHOTO_LAYERS = {
  yard: () => `<img class="ep1-pic" src="${PHOTO_BASE}s5-backyard.webp" alt="" draggable="false" decoding="async">` +
    `<img class="ep3-ph-ball" src="${PHOTO_BASE}closeups/tennis-ball.webp" alt="" draggable="false" decoding="async" onerror="this.remove()">`
};

/* which part of a drawing stays in view on a tall phone screen */
const ALIGN = { bedroom:'xMaxYMid', bedroomMoved:'xMaxYMid', carRide:'xMinYMid' };

const ART = {
  /* Scene 1: Room 308 in the morning — sun through the window, an open suitcase, the charger by the bed */
  roomAm(u){
    const r = rng(311);
    return svg(`
      <rect width="1600" height="900" fill="url(#${u}wall)"/>
      <rect x="760" y="90" width="760" height="520" fill="url(#${u}sky)"/>
      ${cloud(900, 170, 1.1)}${cloud(1330, 140, .8, .8)}
      <path d="${skyline(r, 760, 1520, 520, 30, 150, 18, 46, { x:1150, spread:200, h:120 })}" fill="#b6c7d6"/>
      <path d="${skyline(r, 760, 1520, 560, 20, 70, 30, 70)}" fill="#9fb3c4"/>
      <rect x="760" y="540" width="760" height="70" fill="#c9d5c2"/>
      ${palm(860, 610, 300, '#2f5a3a', 10)}${palm(1420, 612, 260, '#2f5a3a', -8)}
      <rect x="740" y="74" width="800" height="552" fill="none" stroke="#e9dcc8" stroke-width="30"/><rect x="1132" y="90" width="12" height="520" fill="#e9dcc8"/>
      <path d="M690 50 Q740 360 700 650 L780 650 Q800 360 760 50Z" fill="#efe2cc"/><path d="M1590 50 Q1550 360 1590 650 L1520 650 Q1500 360 1530 50Z" fill="#efe2cc"/>
      ${beams(['760,110 1140,110 640,900 140,900', '1150,110 1520,110 1320,900 760,900'], .12)}
      <rect x="120" y="560" width="210" height="150" rx="10" fill="#8a6a4e"/><rect x="132" y="574" width="186" height="40" rx="6" fill="#7a5c42"/>
      <path d="M180 470 L280 470 L262 540 L198 540Z" fill="#f5ead6"/><rect x="226" y="540" width="8" height="22" fill="#6b5340"/>
      <rect x="290" y="606" width="14" height="22" rx="3" fill="#f2f2f2"/><path d="M297 628 C297 680 250 690 240 610" stroke="#f2f2f2" stroke-width="4" fill="none"/><rect x="232" y="598" width="16" height="16" rx="3" fill="#2a2a2e"/>
      <path d="M0 700 Q330 640 740 680 L800 900 H0Z" fill="url(#${u}bed)"/>
      <g transform="translate(330 560) rotate(-4)"><rect x="0" y="40" width="300" height="130" rx="14" fill="#26272c"/><rect x="0" y="-60" width="300" height="104" rx="14" fill="#33343a"/><rect x="14" y="54" width="272" height="100" rx="8" fill="#3c3d44"/>
        <rect x="26" y="64" width="110" height="34" rx="6" fill="#5AB6F9" opacity=".85"/><rect x="146" y="62" width="120" height="40" rx="6" fill="#ffd23f" opacity=".85"/><rect x="34" y="104" width="230" height="36" rx="6" fill="#ff8fb1" opacity=".7"/>
        <rect x="190" y="104" width="50" height="40" rx="10" fill="#e9b04a"/><rect x="198" y="96" width="34" height="10" rx="3" fill="#c88a2a"/></g>
      <rect x="1180" y="660" width="380" height="24" rx="6" fill="#8a6a4e"/><rect x="1200" y="684" width="20" height="216" fill="#6b5340"/><rect x="1520" y="684" width="20" height="216" fill="#6b5340"/>
      <g transform="rotate(-8 1320 640)"><rect x="1270" y="606" width="96" height="56" rx="6" fill="#f3efe6"/><text x="1318" y="646" text-anchor="middle" ${FONT} font-size="20" font-weight="800" fill="#4a3426">308</text></g>
      ${vigRect(u)}`,
      lin(`${u}wall`, [[0,'#e2cdae'],[1,'#b39374']]) + lin(`${u}sky`, [[0,'#7fc0ee'],[.7,'#cfe8f7'],[1,'#f3ead6']]) + lin(`${u}bed`, [[0,'#fbf6ec'],[1,'#d8cbb5']]) + VIG(u, .35));
  },
  /* Scene 2 fallback (the photo from Episode 2 is used when it loads) */
  lobby(u){
    let panels = '';
    for(let i = 0; i < 9; i++) panels += `<rect x="${i * 180}" y="80" width="170" height="520" fill="${i % 2 ? '#6b4632' : '#62402d'}"/>`;
    return svg(`<rect width="1600" height="900" fill="#3a271c"/>${panels}
      <text x="800" y="230" text-anchor="middle" ${FONT} font-weight="800" font-size="60" letter-spacing="12" fill="#e8c98a">PALM COURT</text>
      ${figure(800, 650, .86, { shirt:'#2b3a55', rim:'#9fc6e4', vest:'#1b2536', collar:'#d8e2f0', badge:true, hair:'#2b1d14' })}
      <rect x="300" y="600" width="1000" height="300" fill="#4a3022"/><rect x="290" y="586" width="1020" height="22" rx="6" fill="#2a2a2e"/>
      <path d="M940 584 a26 26 0 0 1 52 0Z" fill="#d9b25b"/>
      ${palm(150, 760, 380, '#2f4a2b', 10)}<rect x="100" y="720" width="110" height="120" rx="14" fill="#7a4a30"/>
      ${beams(['1500,0 1600,0 1600,900 1100,900'], .1)}${vigRect(u)}`, VIG(u));
  },
  /* Scene 3: outside the hotel at 11 AM — the silver car */
  hotelOut(u){
    const r = rng(321);
    let wins = '';
    for(let row = 0; row < 4; row++) for(let c = 0; c < 8; c++) wins += `<rect x="${520 + c * 70}" y="${250 + row * 62}" width="44" height="46" rx="3" fill="${r() > .5 ? '#a9d4ee' : '#8cc0e2'}"/><rect x="${520 + c * 70}" y="${250 + row * 62}" width="44" height="8" fill="#fff" opacity=".35"/>`;
    return svg(`
      <rect width="1600" height="900" fill="url(#${u}sky)"/>${cloud(240, 120, 1.2)}${cloud(1340, 90, 1)}
      <path d="${skyline(r, 0, 1600, 600, 40, 180, 40, 100)}" fill="#d9c9b8"/>
      <rect x="470" y="150" width="660" height="480" fill="#f2c9a8"/><rect x="470" y="150" width="660" height="74" fill="#7a2f4f"/>${wins}
      <text x="800" y="203" text-anchor="middle" ${FONT} font-weight="800" font-size="46" letter-spacing="6" fill="#f3d9a8">PALM COURT HOTEL</text>
      <path d="M580 520 L1020 520 L1060 488 L540 488Z" fill="#7a2f4f"/><rect x="620" y="520" width="360" height="110" fill="#c6dbe6"/><rect x="796" y="520" width="8" height="110" fill="#8a6a5a"/>
      <rect y="630" width="1600" height="70" fill="#ddd6ca"/><rect y="700" width="1600" height="200" fill="#5d6066"/>${[0,1,2,3,4,5,6,7].map(i => `<rect x="${i * 220 + 30}" y="800" width="120" height="10" rx="4" fill="#f2efe6" opacity=".8"/>`).join('')}
      ${palm(330, 660, 520, '#2d5a35', 14)}${palm(1280, 664, 500, '#2d5a35', -12)}${palm(1450, 670, 380, '#335f3a', 8)}
      <g transform="translate(740 560)">
        <path d="M0 140 C10 90 60 74 150 70 L230 20 C260 4 400 4 450 22 L540 70 C600 76 640 96 650 140 L650 180 L0 180Z" fill="url(#${u}car)"/>
        <path d="M250 32 L240 72 L360 72 L360 30 C320 24 280 24 250 32Z M380 30 L380 72 L500 72 L450 36 C430 30 400 28 380 30Z" fill="#3a4656"/>
        <path d="M250 32 L262 36 L254 70 L240 72Z" fill="#fff" opacity=".25"/>
        <rect x="610" y="104" width="34" height="16" rx="6" fill="#ffe6a8"/><rect x="2" y="110" width="24" height="16" rx="5" fill="#e0533d"/>
        <line x1="370" y1="76" x2="370" y2="170" stroke="#9aa1aa" stroke-width="3"/><rect x="300" y="110" width="30" height="6" rx="3" fill="#8b929b"/>
        <circle cx="140" cy="182" r="48" fill="#1c1d21"/><circle cx="140" cy="182" r="22" fill="#9aa1aa"/><circle cx="520" cy="182" r="48" fill="#1c1d21"/><circle cx="520" cy="182" r="22" fill="#9aa1aa"/>
      </g>
      ${vigRect(u)}`,
      lin(`${u}sky`, [[0,'#4da8ec'],[.6,'#9bd1f2'],[1,'#e8f4fb']]) + lin(`${u}car`, [[0,'#e6e9ee'],[.5,'#c4c9d1'],[1,'#8f959e']]) + VIG(u, .3));
  },
  /* Scene 3: in the car — David drives, LA scrolls past the window */
  carRide(u){
    const strip = off => {
      const r = rng(331);
      let s = `<g transform="translate(${off} 0)">`;
      for(let i = 0; i < 8; i++){
        const x = i * 200 + r() * 30, w = 150 + r() * 40, h = 90 + r() * 110, c = ['#f2d6b3','#f4e4c9','#e9c7a8','#d9e4ea','#f1d0c5','#e4dbc6'][i % 6];
        s += `<rect x="${x}" y="${470 - h}" width="${w}" height="${h}" fill="${c}"/><rect x="${x}" y="${470 - h}" width="${w}" height="10" fill="#000" opacity=".08"/>`;
        s += `<rect x="${x + 20}" y="${490 - h}" width="40" height="40" fill="#9fcfe8"/><rect x="${x + w - 60}" y="${490 - h}" width="40" height="40" fill="#9fcfe8"/>`;
        if(i % 3 === 1) s += `<rect x="${x + 10}" y="${400}" width="${w - 20}" height="22" fill="${['#FF8A3D','#6DBB75','#5AB6F9'][i % 3]}"/>`;
      }
      for(let i = 0; i < 6; i++) s += palm(i * 270 + 80, 520, 330 + (i % 2) * 60, '#2d5a35', (i % 2 ? -8 : 8));
      return s + `</g>`;
    };
    return svg(`
      <rect width="1600" height="900" fill="#2a2d33"/>
      <defs><clipPath id="${u}win"><path d="M300 130 Q300 110 330 108 L1480 100 Q1530 100 1530 150 L1530 540 L300 560 Z"/></clipPath></defs>
      <g clip-path="url(#${u}win)">
        <rect x="280" y="90" width="1280" height="480" fill="url(#${u}sky)"/>${cloud(700, 170, 1)}${cloud(1250, 150, .9)}
        <g class="ep3-scroll">${strip(0)}${strip(1600)}</g>
        <rect x="280" y="500" width="1280" height="80" fill="#5d6066"/><g class="ep3-scroll fast">${[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map(i => `<rect x="${i * 200}" y="530" width="110" height="8" rx="3" fill="#f2efe6"/>`).join('')}</g>
      </g>
      <path d="M300 130 Q300 110 330 108 L1480 100 Q1530 100 1530 150 L1530 540 L300 560 Z" fill="none" stroke="#1b1d22" stroke-width="26"/>
      <path d="M0 0 H1600 V100 L1480 92 L330 98 Q284 100 280 140 L270 900 H0Z" fill="#33363d"/>
      <path d="M260 560 L1600 520 L1600 900 L0 900 L0 640Z" fill="url(#${u}dash)"/>
      <rect x="760" y="640" width="260" height="70" rx="14" fill="#1f2126"/><rect x="780" y="656" width="120" height="38" rx="6" fill="#5AB6F9" opacity=".55"/><text x="960" y="684" text-anchor="middle" ${FONT} font-size="20" font-weight="800" fill="#ffd23f">FM 98.7</text>
      ${figure(190, 980, 1.18, { shirt:'#3E7C8C', rim:'#bfe3ea', hair:'#5a4030', collar:'#e8f3f5' })}
      <circle cx="330" cy="760" r="150" fill="none" stroke="#141519" stroke-width="30"/><rect x="250" y="746" width="160" height="26" rx="10" fill="#141519"/>
      ${vigRect(u)}`,
      lin(`${u}sky`, [[0,'#5aaeea'],[1,'#d8eefa']]) + lin(`${u}dash`, [[0,'#3b3e46'],[1,'#1c1e23']]) + VIG(u, .35));
  },
  /* Scene 4: the Miller house — cream walls, terracotta roof, red front door, a lemon tree */
  houseFront(u){
    const r = rng(341);
    const win = (x, y, w, h) => `<rect x="${x - 10}" y="${y - 10}" width="${w + 20}" height="${h + 20}" fill="#fbf7f0"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${u}glass)"/><rect x="${x + w / 2 - 3}" y="${y}" width="6" height="${h}" fill="#fbf7f0"/><rect x="${x - 34}" y="${y - 8}" width="24" height="${h + 16}" fill="#7fa38a"/><rect x="${x + w + 10}" y="${y - 8}" width="24" height="${h + 16}" fill="#7fa38a"/>`;
    return svg(`
      <rect width="1600" height="900" fill="url(#${u}sky)"/>${cloud(300, 70, 1.1)}${cloud(1200, 50, .9)}
      <rect y="660" width="1600" height="240" fill="url(#${u}lawn)"/>
      <g transform="translate(0 -110)">
      ${palm(120, 640, 560, '#2d5a35', 16)}${palm(1480, 650, 600, '#2d5a35', -18)}
      <path d="M560 250 L800 120 L1040 250Z" fill="#b9573a"/><rect x="560" y="246" width="480" height="190" fill="#f3e2c7"/>
      ${[0,1,2,3,4].map(i => `<path d="M${590 + i * 92} 248 L${620 + i * 92} 200" stroke="#a24a30" stroke-width="3" opacity=".5"/>`).join('')}
      ${win(640, 300, 120, 90)}${win(860, 300, 120, 90)}
      <path d="M380 450 L800 360 L1220 450Z" fill="#c8643f"/><rect x="420" y="446" width="760" height="340" fill="url(#${u}wall)"/>
      ${win(500, 520, 150, 120)}${win(980, 520, 150, 120)}
      <path d="M700 590 L900 590 L920 570 L680 570Z" fill="#b9573a"/>
      <rect x="742" y="598" width="116" height="188" rx="4" fill="#fbf7f0"/><rect x="752" y="606" width="96" height="180" rx="3" fill="#b8322f"/><rect x="764" y="620" width="72" height="60" rx="3" fill="#a02a28"/><circle cx="834" cy="700" r="6" fill="#e6c36a"/>
      <rect x="720" y="786" width="160" height="16" fill="#d8cdbd"/><rect x="704" y="802" width="192" height="16" fill="#cbbfae"/>
      <path d="M0 790 L1600 790 L1600 900 L0 900Z" fill="url(#${u}lawn)"/><path d="M712 818 L888 818 L960 900 L640 900Z" fill="#d8cdbd"/>
      <path d="M0 800 L380 790 L240 900 L0 900Z" fill="#b8b3aa"/>
      ${bush(470, 780, 46)}${bush(640, 790, 34, '#5a9455')}${bush(960, 790, 34, '#5a9455')}${bush(1130, 780, 46)}
      ${flowers(r, 440, 700, 800, 18)}${flowers(r, 900, 1170, 800, 18)}
      ${lemonTree(1330, 820, 330)}
      <g transform="translate(200 690)"><rect x="26" y="40" width="12" height="90" fill="#6b4a2e"/><rect x="0" y="0" width="64" height="44" rx="20" fill="#2f4f6b"/><text x="32" y="28" text-anchor="middle" ${FONT} font-size="10" font-weight="800" fill="#fff">MILLERS</text><circle cx="52" cy="12" r="5" fill="#ffd23f"/></g>
      ${[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17].map(i => `<rect x="${i * 24 + 1180}" y="760" width="12" height="60" rx="5" fill="#fbf7f0"/>`).join('')}<rect x="1176" y="776" width="434" height="8" fill="#fbf7f0"/>
      </g>
      <path d="M602 708 L778 708 L900 900 L480 900Z" fill="#d8cdbd"/>
      ${vigRect(u)}`,
      lin(`${u}sky`, [[0,'#4da8ec'],[.65,'#a6d6f3'],[1,'#eef7fb']]) + lin(`${u}wall`, [[0,'#f6e6cc'],[1,'#e8d2b2']]) + lin(`${u}glass`, [[0,'#bfe3f5'],[1,'#7fb7d8']]) + lin(`${u}lawn`, [[0,'#6aa75c'],[1,'#4c8743']]) + VIG(u, .3));
  },
  /* Scene 5: the hallway — photos on the wall, the stairs */
  entry(u){
    return svg(`
      <rect width="1600" height="900" fill="url(#${u}wall)"/>
      <rect x="0" y="0" width="1600" height="60" fill="#e9dcc6"/>
      <circle cx="800" cy="70" r="180" fill="url(#${u}lamp)"/><rect x="770" y="46" width="60" height="20" rx="8" fill="#fff3d2"/>
      ${frame(140, 200, 150, 190, `<rect x="160" y="220" width="110" height="80" fill="#9fd0e8"/><circle cx="215" cy="330" r="22" fill="#ffb199"/>`)}
      ${frame(320, 220, 200, 140, `<rect x="334" y="234" width="172" height="112" fill="#f3d9a8"/><circle cx="384" cy="292" r="16" fill="#8a3b22"/><circle cx="452" cy="292" r="16" fill="#5a4030"/><rect x="334" y="316" width="172" height="30" fill="#5AB6F9"/>`)}
      ${frame(180, 420, 220, 160, `<rect x="194" y="434" width="192" height="132" fill="#c9d6e2"/><rect x="226" y="470" width="40" height="80" rx="10" fill="#244a7a"/><rect x="306" y="470" width="40" height="80" rx="10" fill="#244a7a"/><circle cx="246" cy="458" r="14" fill="#3a2618"/><circle cx="326" cy="458" r="14" fill="#2a1d14"/><path d="M276 520 l20 0 l-4 26 l-12 0z" fill="#e6c36a"/><text x="290" y="562" text-anchor="middle" ${FONT} font-size="12" font-weight="800" fill="#244a7a">HAWKS</text>`)}
      <rect x="560" y="330" width="230" height="300" fill="#6a8d74" opacity=".9"/><rect x="560" y="330" width="230" height="300" fill="none" stroke="#fbf7f0" stroke-width="14"/>
      <path d="M1000 900 L1000 300 L1600 60 L1600 900Z" fill="#e6d3b7"/>
      ${[0,1,2,3,4,5,6,7,8].map(i => `<path d="M${1040 + i * 64} ${860 - i * 74} h64 v74 h-64z" fill="${i % 2 ? '#a77b52' : '#b88a5c'}"/>`).join('')}
      <path d="M1010 600 L1600 120" stroke="#fbf7f0" stroke-width="14"/>${[0,1,2,3,4,5,6,7].map(i => `<rect x="${1040 + i * 72}" y="${560 - i * 58}" width="8" height="${110}" fill="#fbf7f0"/>`).join('')}
      <rect y="760" width="1600" height="140" fill="url(#${u}floor)"/><path d="M420 900 L560 770 L900 770 L1000 900Z" fill="#3f7f84" opacity=".85"/>
      <rect x="80" y="660" width="260" height="20" rx="4" fill="#8a6a4e"/><rect x="96" y="680" width="12" height="90" fill="#6b5340"/><rect x="312" y="680" width="12" height="90" fill="#6b5340"/>
      <ellipse cx="180" cy="652" rx="40" ry="12" fill="#e6c36a"/>${palm(300, 660, 150, '#3f7a40', 4)}<rect x="270" y="610" width="60" height="50" rx="8" fill="#c8643f"/>
      ${vigRect(u)}`,
      lin(`${u}wall`, [[0,'#f3e6d1'],[1,'#e2cfb2']]) + lin(`${u}floor`, [[0,'#b98a5c'],[1,'#8f6440']]) + rad(`${u}lamp`, [[0,'#fff3d2',.6],[1,'#fff3d2',0]]) + VIG(u, .35));
  },
  /* Scene 5/6: the kitchen — sage cabinets, lemons, a fridge full of magnets */
  kitchen(u){
    return svg(`
      <rect width="1600" height="900" fill="url(#${u}wall)"/>
      <rect x="600" y="140" width="420" height="300" fill="url(#${u}sky)"/>${lemonTree(810, 470, 260)}<rect x="600" y="140" width="420" height="300" fill="none" stroke="#fbf7f0" stroke-width="20"/><rect x="804" y="140" width="12" height="300" fill="#fbf7f0"/>
      ${beams(['600,150 1020,150 1180,720 500,720'], .14)}
      ${[0,1,2].map(i => `<rect x="${1060 + i * 170}" y="110" width="160" height="230" rx="6" fill="#8fb09a"/><rect x="${1080 + i * 170}" y="130" width="120" height="190" rx="4" fill="none" stroke="#7a9c86" stroke-width="4"/>`).join('')}
      ${[0,1].map(i => `<rect x="${260 + i * 170}" y="110" width="160" height="230" rx="6" fill="#8fb09a"/>`).join('')}
      <rect x="40" y="200" width="200" height="560" rx="16" fill="#e9eef1"/><rect x="40" y="430" width="200" height="6" fill="#c9d0d5"/><rect x="212" y="300" width="8" height="90" rx="4" fill="#b8c0c6"/>
      ${[[80,250,'#FF8A3D'],[150,280,'#5AB6F9'],[100,330,'#6DBB75'],[170,360,'#ffd23f'],[90,470,'#ff8fb1']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="10" fill="${c}"/>`).join('')}
      <rect x="110" y="380" width="96" height="70" fill="#fff8e0" transform="rotate(4 158 415)"/><text x="158" y="420" text-anchor="middle" font-family="'Caveat', cursive" font-size="26" fill="#c2453a" transform="rotate(4 158 415)">DINNER @ 6</text>
      <rect x="240" y="520" width="1360" height="30" fill="#f4efe6"/><rect x="240" y="550" width="1360" height="350" fill="#8fb09a"/>
      ${[0,1,2,3,4,5,6].map(i => `<rect x="${262 + i * 192}" y="575" width="172" height="300" rx="6" fill="none" stroke="#7a9c86" stroke-width="4"/><rect x="${330 + i * 192}" y="600" width="36" height="8" rx="4" fill="#d8dfe2"/>`).join('')}
      <rect x="1180" y="560" width="260" height="210" rx="8" fill="#2a2d33"/><rect x="1200" y="600" width="220" height="130" rx="8" fill="#ff9a4a" opacity=".55" class="ep3-oven"/>
      <ellipse cx="960" cy="500" rx="90" ry="26" fill="#fbf7f0"/>${[0,1,2,3,4].map(i => `<ellipse cx="${910 + i * 24}" cy="${490 - (i % 2) * 10}" rx="16" ry="12" fill="#ffd84a"/>`).join('')}
      <rect x="420" y="470" width="110" height="50" rx="8" fill="#e9d6b5"/><rect x="440" y="440" width="70" height="40" rx="8" fill="#c8643f"/>
      ${[740, 1000].map(x => `<line x1="${x}" y1="0" x2="${x}" y2="80" stroke="#3a3a3a" stroke-width="3"/><path d="M${x - 40} 80 h80 l-20 40 h-40z" fill="#3E7C8C"/><circle cx="${x}" cy="128" r="60" fill="url(#${u}lamp)"/>`).join('')}
      ${vigRect(u)}`,
      lin(`${u}wall`, [[0,'#f6ead6'],[1,'#ead8bd']]) + lin(`${u}sky`, [[0,'#7fc0ee'],[1,'#d8eefa']]) + rad(`${u}lamp`, [[0,'#fff1c9',.6],[1,'#fff1c9',0]]) + VIG(u, .3));
  },
  /* Scene 5: the living room — Movie Friday HQ */
  living(u){
    return svg(`
      <rect width="1600" height="900" fill="url(#${u}wall)"/>
      <rect x="140" y="120" width="420" height="420" fill="url(#${u}sky)"/>${palm(300, 560, 300, '#2d5a35', 6)}<rect x="140" y="120" width="420" height="420" fill="none" stroke="#fbf7f0" stroke-width="18"/>
      <path d="M100 100 Q150 330 120 600 L180 600 Q200 330 160 100Z" fill="#f4ead8" opacity=".9"/><path d="M600 100 Q550 330 580 600 L520 600 Q500 330 540 100Z" fill="#f4ead8" opacity=".9"/>
      ${beams(['150,130 560,130 760,860 120,860'], .12)}
      <rect x="1180" y="120" width="360" height="560" rx="6" fill="#8a6a4e"/>${[0,1,2,3].map(r => `<rect x="1196" y="${160 + r * 130}" width="328" height="10" fill="#6b5340"/>`).join('')}
      ${[[1210,'#FF8A3D',40,90],[1256,'#5AB6F9',30,100],[1292,'#6DBB75',44,80],[1342,'#ffd23f',28,100],[1376,'#c9b8ff',36,92],[1420,'#ff8fb1',40,86]].map(([x, c, w, h]) => `<rect x="${x}" y="${290 - h}" width="${w}" height="${h}" fill="${c}"/>`).join('')}
      ${[[1210,'#e9d6b5',140,30],[1210,'#3E7C8C',140,30],[1360,'#c2453a',150,34],[1360,'#f3e5c8',150,34]].map(([x, c, w, h], i) => `<rect x="${x}" y="${386 - (i % 2) * 32 - h}" width="${w}" height="${h}" fill="${c}"/>`).join('')}
      <rect x="760" y="360" width="340" height="200" rx="10" fill="#141519"/><rect x="772" y="372" width="316" height="176" rx="6" fill="#20232a"/><rect x="1040" y="380" width="44" height="40" fill="#ffe76a" transform="rotate(6 1062 400)"/>
      <rect x="720" y="560" width="420" height="120" rx="8" fill="#8a6a4e"/>
      <rect y="680" width="1600" height="220" fill="url(#${u}floor)"/><ellipse cx="620" cy="800" rx="520" ry="90" fill="#d98b5f" opacity=".55"/>
      <rect x="160" y="560" width="620" height="200" rx="40" fill="#8b929e"/><rect x="190" y="500" width="560" height="120" rx="40" fill="#9aa1ad"/><rect x="140" y="580" width="80" height="170" rx="30" fill="#7d8491"/><rect x="720" y="580" width="80" height="170" rx="30" fill="#7d8491"/>
      <rect x="250" y="540" width="120" height="80" rx="18" fill="#FF8A3D" opacity=".85"/><rect x="560" y="540" width="120" height="80" rx="18" fill="#6DBB75" opacity=".85"/>
      <rect x="960" y="250" width="12" height="320" fill="#3a3a3a"/><path d="M920 250 h92 l-16 -60 h-60z" fill="#f5ead6"/>
      ${vigRect(u)}`,
      lin(`${u}wall`, [[0,'#ece0cc'],[1,'#d9c6a8']]) + lin(`${u}sky`, [[0,'#7fc0ee'],[1,'#e3f2fb']]) + lin(`${u}floor`, [[0,'#b98a5c'],[1,'#8f6440']]) + VIG(u, .32));
  },
  /* Scene 5: the backyard — lawn, patio, an orange umbrella */
  yard(u){
    const r = rng(351);
    return svg(`
      <rect width="1600" height="900" fill="url(#${u}sky)"/>${cloud(500, 120, 1.2)}${cloud(1250, 160, .9)}
      ${palm(1380, 600, 560, '#2d5a35', -14)}${palm(1500, 610, 420, '#335f3a', 10)}
      <rect y="420" width="1600" height="200" fill="#d6c3a2"/>${[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19].map(i => `<rect x="${i * 80}" y="420" width="70" height="200" fill="#e2d1b2"/>`).join('')}
      ${bush(140, 600, 70)}${bush(400, 610, 54, '#5a9455')}${bush(1220, 600, 66)}
      ${lemonTree(980, 640, 300)}
      <path d="M0 600 L1600 600 L1600 900 L0 900Z" fill="url(#${u}lawn)"/>
      ${flowers(r, 40, 560, 610, 22)}
      <path d="M0 760 L520 700 L700 900 L0 900Z" fill="#cdbfa8"/>${[0,1,2,3,4].map(i => `<path d="M${i * 120} ${760 - i * 12} L${i * 120 + 40} ${900}" stroke="#b8aa92" stroke-width="3"/>`).join('')}
      <path d="M140 500 L420 470 L560 520 L280 560Z" fill="#FF8A3D"/><path d="M140 500 L280 560 L270 580 L130 512Z" fill="#e8742b"/><rect x="342" y="520" width="8" height="250" fill="#6b5340"/>
      <ellipse cx="346" cy="760" rx="150" ry="34" fill="#fbf7f0"/><rect x="226" y="760" width="12" height="90" fill="#9aa1aa"/><rect x="452" y="760" width="12" height="90" fill="#9aa1aa"/>
      <circle cx="1140" cy="830" r="16" fill="#cde84a"/>
      ${vigRect(u)}`,
      lin(`${u}sky`, [[0,'#4da8ec'],[1,'#e3f2fb']]) + lin(`${u}lawn`, [[0,'#72b062'],[1,'#4c8743']]) + VIG(u, .28));
  },
  /* Scenes 5–6: your room — the desk, the box, the note */
  bedroom(u, mode){
    const eve = mode === 'eve', moved = mode === 'moved';
    const boxArt = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})">
      <path d="M0 40 L240 40 L240 160 L0 160Z" fill="#c69a63"/><path d="M0 40 L-20 6 L220 6 L240 40Z" fill="#d8ad74"/><path d="M240 40 L262 10 L262 120 L240 160Z" fill="#a97f4e"/>
      <rect x="30" y="-6" width="80" height="50" rx="4" fill="#2f6b4a"/>${[0,1,2,3].map(i => `<rect x="${38 + i * 18}" y="2" width="10" height="10" fill="#d8c06a"/>`).join('')}
      <rect x="130" y="-30" width="20" height="70" fill="#9aa1aa"/><circle cx="140" cy="-34" r="14" fill="#5AB6F9"/><rect x="150" y="-24" width="50" height="10" fill="#9aa1aa"/>
      <path d="M20 10 C60 -40 100 -10 120 -40 M160 0 C190 -40 220 -20 230 -50" stroke="#e0533d" stroke-width="5" fill="none"/><path d="M60 10 C80 -20 120 0 140 -24" stroke="#5AB6F9" stroke-width="5" fill="none"/>
      <g transform="rotate(-5 120 100)"><rect x="70" y="62" width="110" height="80" fill="#ffe76a"/><text x="125" y="96" text-anchor="middle" font-family="'Caveat', cursive" font-weight="700" font-size="20" fill="#1f1f1f">PLEASE DON'T</text><text x="125" y="118" text-anchor="middle" font-family="'Caveat', cursive" font-weight="700" font-size="20" fill="#1f1f1f">TOUCH. — A.</text></g></g>`;
    return svg(`
      <rect width="1600" height="900" fill="url(#${u}wall)"/>
      <rect x="1040" y="110" width="440" height="380" fill="url(#${u}sky)"/>
      ${eve ? '' : lemonTree(1210, 500, 240)}${eve ? palm(1150, 500, 300, '#2a1f3a', 6) + palm(1420, 500, 240, '#2a1f3a', -6) : palm(1420, 500, 280, '#2d5a35', -6)}
      <rect x="1040" y="110" width="440" height="380" fill="none" stroke="#fbf7f0" stroke-width="18"/><rect x="1254" y="110" width="12" height="380" fill="#fbf7f0"/>
      ${eve ? '' : beams(['1040,120 1480,120 1300,900 720,900'], .12)}
      <rect x="80" y="130" width="240" height="560" rx="6" fill="#f2ebe0"/><rect x="198" y="130" width="4" height="560" fill="#d9cfc0"/><circle cx="186" cy="420" r="6" fill="#c9b99f"/><circle cx="214" cy="420" r="6" fill="#c9b99f"/>
      <rect x="400" y="230" width="300" height="12" fill="#8a6a4e"/>${eve ? `<rect x="420" y="170" width="40" height="60" fill="#f3e5c8"/><rect x="470" y="190" width="50" height="40" fill="#5AB6F9"/><rect x="540" y="176" width="70" height="54" fill="#fff"/><rect x="548" y="184" width="54" height="38" fill="#ffb199"/>` : `<rect x="430" y="186" width="30" height="44" fill="#6DBB75"/>`}
      <path d="M340 560 L860 560 L940 760 L260 760Z" fill="#fbf7f0"/><rect x="250" y="740" width="700" height="160" fill="#6a8fb3"/><path d="M300 560 L860 560 L860 600 L300 600Z" fill="#7aa0c4"/><rect x="360" y="510" width="200" height="70" rx="30" fill="#fff"/>
      <rect x="980" y="560" width="560" height="26" fill="#8a6a4e"/><rect x="1000" y="586" width="20" height="314" fill="#6b5340"/><rect x="1500" y="586" width="20" height="314" fill="#6b5340"/>
      ${eve ? `<path d="M1100 470 L1180 470 L1166 540 L1114 540Z" fill="#fff3d2"/><circle cx="1140" cy="500" r="200" fill="url(#${u}lamp)"/><rect x="1136" y="540" width="8" height="20" fill="#6b5340"/>` : ''}
      ${!eve && !moved ? boxArt(1110, 400, 1) : ''}
      ${moved ? boxArt(1060, 700, .9) + `<path class="ep3-cable" d="M1290 780 C1340 820 1300 860 1380 870" stroke="#e0533d" stroke-width="7" fill="none" stroke-linecap="round"/>` : ''}
      <rect y="860" width="1600" height="40" fill="#8f6440"/>
      ${eve ? '' : `<g transform="translate(620 700)"><rect x="0" y="0" width="220" height="120" rx="12" fill="#26272c"/><rect x="10" y="-60" width="200" height="66" rx="12" fill="#33343a"/><rect x="20" y="14" width="80" height="30" rx="5" fill="#ffd23f" opacity=".8"/><rect x="110" y="14" width="90" height="30" rx="5" fill="#ff8fb1" opacity=".7"/></g>`}
      ${eve ? `<rect width="1600" height="900" fill="#2a1a3a" opacity=".28"/>` : ''}
      ${vigRect(u)}`,
      lin(`${u}wall`, eve ? [[0,'#cdbba3'],[1,'#8f7a62']] : [[0,'#eee4d4'],[1,'#d8c8b0']]) +
      lin(`${u}sky`, eve ? [[0,'#3a2a55'],[.6,'#c86a7a'],[1,'#ffb37a']] : [[0,'#7fc0ee'],[1,'#e3f2fb']]) +
      rad(`${u}lamp`, [[0,'#ffd99a',.55],[1,'#ffd99a',0]]) + VIG(u, eve ? .5 : .32));
  },
  bedroomMoved(u){ return ART.bedroom(u, 'moved'); },
  bedroomEve(u){ return ART.bedroom(u, 'eve'); },
  /* Scene 7: the bedroom door — the hallway light behind Alex */
  door(u){
    return svg(`
      <rect width="1600" height="900" fill="url(#${u}wall)"/>
      <rect x="580" y="130" width="440" height="730" fill="#f6e6c8"/>
      <rect x="580" y="130" width="440" height="730" fill="url(#${u}hall)"/>
      <path d="M580 130 L700 230 L700 860 L580 860Z" fill="#e2cfaf"/><path d="M1020 130 L900 230 L900 860 L1020 860Z" fill="#d9c4a2"/><rect x="700" y="230" width="200" height="630" fill="#efdcbc"/>
      ${frame(728, 330, 70, 90)}${frame(812, 300, 60, 80)}
      <path d="M700 860 L900 860 L1020 900 L580 900Z" fill="#8f6440"/>
      <rect x="560" y="110" width="480" height="20" fill="#fbf7f0"/><rect x="560" y="110" width="20" height="790" fill="#fbf7f0"/><rect x="1020" y="110" width="20" height="790" fill="#fbf7f0"/>
      <path d="M1040 130 L1240 60 L1240 900 L1040 870Z" fill="#fbf7f0"/><circle cx="1076" cy="520" r="10" fill="#c9b99f"/>
      <path d="M0 640 L420 640 L520 900 L0 900Z" fill="#6a8fb3"/><path d="M0 600 L380 600 L420 640 L0 640Z" fill="#fbf7f0"/>
      <rect x="1300" y="560" width="300" height="26" fill="#8a6a4e"/><rect x="1320" y="586" width="20" height="314" fill="#6b5340"/>
      <circle cx="800" cy="200" r="260" fill="url(#${u}lamp)"/>
      ${vigRect(u)}`,
      lin(`${u}wall`, [[0,'#e6d8c2'],[1,'#c8b394']]) + lin(`${u}hall`, [[0,'#fff3d8'],[1,'#e9d2a8']]) + rad(`${u}lamp`, [[0,'#fff1c9',.5],[1,'#fff1c9',0]]) + VIG(u, .45));
  },
  /* Scene 8: dinner at six — golden light, spaghetti, everyone at the table */
  dining(u){
    const seat = (who, x, s) => PEOPLE_ART[who](x, 760, s);
    return svg(`
      <rect width="1600" height="900" fill="url(#${u}wall)"/>
      <rect x="60" y="110" width="440" height="430" fill="url(#${u}sky)"/>${palm(180, 540, 330, '#3a2440', 8)}${palm(420, 540, 260, '#3a2440', -6)}
      <rect x="60" y="110" width="440" height="430" fill="none" stroke="#fbf7f0" stroke-width="18"/><rect x="274" y="110" width="12" height="430" fill="#fbf7f0"/>
      ${beams(['60,120 500,120 1100,760 380,760'], .14)}
      ${frame(1120, 160, 260, 180, `<rect x="1134" y="174" width="232" height="152" fill="#9fd0e8"/><path d="M1134 300 L1200 240 L1260 290 L1310 250 L1366 300 L1366 326 L1134 326Z" fill="#6DBB75"/>`)}
      <line x1="840" y1="0" x2="840" y2="120" stroke="#3a3a3a" stroke-width="3"/><path d="M780 120 h120 l-26 60 h-68z" fill="#d98b5f"/><circle cx="840" cy="220" r="260" fill="url(#${u}lamp)"/>
      ${seat('rachel', 560, .9)}${seat('david', 960, .95)}${seat('alex', 1320, .86)}
      <path d="M200 640 L1500 640 L1600 900 L100 900Z" fill="url(#${u}cloth)"/><rect x="190" y="628" width="1320" height="22" rx="6" fill="#f7f1e6"/>
      ${[[420,700],[800,690],[1180,700]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="90" ry="26" fill="#fbf7f0"/><ellipse cx="${x}" cy="${y - 4}" rx="60" ry="14" fill="#e8a24a"/><ellipse cx="${x}" cy="${y - 8}" rx="30" ry="8" fill="#c2453a"/>`).join('')}
      <ellipse cx="800" cy="610" rx="130" ry="40" fill="#e9eef1"/><ellipse cx="800" cy="600" rx="100" ry="26" fill="#f0b45a"/>${[0,1,2,3,4].map(i => `<circle cx="${740 + i * 30}" cy="${596 - (i % 2) * 6}" r="11" fill="#9a3a2a"/>`).join('')}
      <ellipse cx="560" cy="612" rx="70" ry="22" fill="#6DBB75"/><rect x="1020" y="590" width="120" height="34" rx="14" fill="#d9a35a"/>
      <rect x="640" y="560" width="34" height="50" rx="8" fill="#ffd23f" opacity=".85"/><rect x="644" y="552" width="26" height="10" fill="#c88a2a"/>
      ${[330, 1060, 1390].map(x => `<rect x="${x}" y="580" width="22" height="50" rx="6" fill="#dff1fb" opacity=".7"/>`).join('')}
      ${dog(1430, 900, .62, { left:true, sit:true, tongue:true })}
      <rect width="1600" height="900" fill="#ff9a4a" opacity=".08"/>
      ${vigRect(u)}`,
      lin(`${u}wall`, [[0,'#f0d9b5'],[1,'#c9a37a']]) + lin(`${u}sky`, [[0,'#5a4a8a'],[.5,'#e87a6a'],[1,'#ffc06a']]) + lin(`${u}cloth`, [[0,'#f4eee3'],[1,'#d6cbb8']]) +
      rad(`${u}lamp`, [[0,'#ffd28a',.6],[1,'#ffd28a',0]]) + VIG(u, .42));
  }
};
function sceneArt(key){
  const out = (ART[key] || ART.entry)(nextArtId('ep3a'));
  return ALIGN[key] ? out.replace('xMidYMid slice', ALIGN[key] + ' slice') : out;
}

/* ---------- cast: which people are on screen at this point of the scene ---------- */
function castAt(sc, nodeId){
  let c = sc.cast || [];
  for(const k of sc.order){ const n = sc.nodes[k]; if(n.cast) c = n.cast; if(k === nodeId) break; }
  return c;
}
function ambAt(sc, nodeId){
  let a = sc.ambience;
  for(const k of sc.order){ const n = sc.nodes[k]; if(n.amb) a = n.amb; if(k === nodeId) break; }
  return a;
}
let castKey = null;
function setCast(list){
  const key = (list || []).join('|') + '#' + (EP.bgKey || '');
  let el = EP.bg && EP.bg.querySelector('.ep3-cast');
  if(el && castKey === key) return;
  castKey = key;
  if(!el){ el = document.createElement('div'); el.className = 'ep3-cast'; EP.bg.appendChild(el); }
  /* both versions are ready; CSS shows the photo cast when the background is a photo, the drawn one otherwise */
  el.innerHTML = list && list.length
    ? `<div class="ep3-cast-art">${castSVG(list, ALIGN[EP.bgKey])}</div><div class="ep3-ph-cast" data-ph="${esc(EP.bgKey || '')}" data-n="${list.filter(c => !c.startsWith('buddy')).length}">${castPhoto(list, EP.bgKey)}</div>` : '';
}

/* =========================================================================
   EPISODE 3 INTERACTIONS (custom node types)
   ========================================================================= */
const uaDiv = t => t ? `<div class="ep1-ua" ${SET.ua ? '' : 'hidden'}>${esc(t)}</div>` : '';
const uaBtn = () => `<button type="button" class="ep1-tool" data-act="ua" title="Ukrainian translation" aria-label="Show Ukrainian translation">UA</button>`;
const clockNow = () => (EP.scene ? EP.scene.clock : '');
const UNKNOWN_FIRST = "Hey! I heard you're coming to the Miller house tomorrow. Just a heads-up… things might be a little different from what you're expecting. 👀";
/* last night's mystery message — written by Episode 2; if that save isn't there (e.g. preview), it's added with the same id */
function ensureMysteryMsg(){
  const t = thread('unknown'); if(!t) return null;
  if(!t.chat.some(m => m.id === 'e2s8u1')) t.chat.unshift({ id:'e2s8u1', from:'them', text:UNKNOWN_FIRST, time:'Yesterday · 11:17 PM' });
  return t;
}
/* the unknown number becomes “Alex Miller” once the student finds out (same thread id — no duplicate contact) */
function syncAlexThread(){
  const t = DATA.messages.find(m => m.id === 'unknown'); if(!t) return;
  const s = peekSt(EP_ID);
  const playing = EP.open && E.current() && E.current().id === EP_ID;
  const known = !!(s && ((s.flags || {}).alexRevealed || (!playing && s.completed)));
  if(known){ t.name = 'Alex Miller'; t.color = '#55657f'; t.sub = 'Host brother · 15'; delete t.icon; t.knownAs = 'alex'; }
  else if(t.knownAs === 'alex'){ t.name = '+1 (323) 555-0147'; t.color = '#3a4150'; t.icon = '❔'; t.sub = 'Unknown number'; delete t.knownAs; }
}

/* ---------- Scene 1: the lock screen — three notifications to read ---------- */
RENDER.wake = function(node, id, tok){
  const f = flags(), e2 = ep2f();
  st().flags.phoneUnlocked = true;
  ensureMysteryMsg();
  const NOTES = [
    { th:'david', who:'David Miller', icon:'🏡', id:'e3s1d1', text:"Good morning! I'll be outside the hotel at 11. See you soon! 😊",
      ua:"Доброго ранку! Я буду біля готелю об 11. До зустрічі! 😊", time:'10:31 AM' },
    { th:'mia', who:'Mia 🇺🇦', icon:'💙', id:'e3s1m1', text:"Good morning from Ukraine! Sooo… are you ready to meet your new family? 👀" + (e2.mysteryChoice === 'mia' ? " And did you solve the mystery yet, detective? 🕵️‍♀️" : ''),
      ua:"Доброго ранку з України! Ну щооо… ти готовий(-а) познайомитися зі своєю новою родиною? 👀" + (e2.mysteryChoice === 'mia' ? " І ти вже розгадав(-ла) таємницю, детективе? 🕵️‍♀️" : ''), time:'10:38 AM' },
    { th:'unknown', who:'Unknown Number', icon:'❔', id:'e2s8u1', text:"Just a heads-up… things might be a little different from what you're expecting. 👀",
      ua:"Просто попереджаю… усе може бути трохи не так, як ти очікуєш. 👀", time:'Yesterday', old:true }
  ];
  /* the morning messages go into the real chats (ids make this safe to replay) */
  pushChat('david', { id:'e3s1d1', from:'them', text:NOTES[0].text, time:'10:31 AM' });
  pushChat('mia', { id:'e3s1m1', from:'them', text:NOTES[1].text, time:'10:38 AM' });
  thread('david').unread = 1; thread('mia').unread = 1;
  save(true);
  const read = new Set(f.wakeRead || []);
  const g = showGame('g-wake');
  function draw(open){
    const all = read.size >= NOTES.length;
    g.innerHTML = `<div class="ep3-lock" role="group" aria-label="Your phone">
      <div class="ep3-lock-top"><span>📶 🔋</span></div>
      <div class="ep3-lock-time">10:42</div><div class="ep3-lock-date">${esc(window.DATA && DATA.day ? DATA.day.dateLabel : 'Sunday, August 18')}</div>
      <div class="ep3-lock-list">${NOTES.map((n, i) => `
        <button type="button" class="ep3-note-card ${read.has(i) ? 'read' : ''} ${open === i ? 'open' : ''} ${n.old ? 'old' : ''}" data-n="${i}" aria-expanded="${open === i}">
          <span class="ep3-note-app" aria-hidden="true">${n.icon}</span>
          <span class="ep3-note-body"><span class="ep3-note-top"><b>${esc(n.who)}</b><small>${esc(n.time)}</small></span>
            <span class="ep3-note-text">${esc(open === i || n.text.length <= 50 ? n.text : n.text.slice(0, 50).replace(/[\s.,!?…]+\S*$/, '') + '…')}</span>
            ${open === i ? `<span class="ep1-ua ep3-note-ua" ${SET.ua ? '' : 'hidden'}>${esc(n.ua)}</span>` : ''}</span>
          ${read.has(i) ? '<span class="ep3-note-ok" aria-label="read">✓</span>' : '<span class="ep3-note-dot" aria-hidden="true"></span>'}
        </button>`).join('')}</div>
      <div class="ep3-lock-foot">${all ? `<span class="ep3-lock-hint">All read ✓</span>` : `<span class="ep3-lock-hint">Tap each message to read it (${read.size}/3)</span>`}</div>
    </div>`;
    thinkLine(all ? "Okay. David at eleven. Mia is excited. And the mystery number… still a mystery." : "Three new notifications. Tap each one to read it.",
              all ? "Так. Девід об одинадцятій. Мія в захваті. А таємничий номер… досі таємниця." : "Три нові сповіщення. Торкнись кожного, щоб прочитати.", all ? 'Continue ▸' : null);
    if(all) primary(() => { if(tok !== EP.token) return; hideGame(); next(node, id); });
  }
  g.onclick = e => {
    if(tok !== EP.token) return;
    const b = e.target.closest('[data-n]'); if(!b) return;
    const i = +b.dataset.n; read.add(i); f.wakeRead = Array.from(read);
    if(i === 2) Sound.sfx('mystery'); else Sound.sfx('soft');
    const n = NOTES[i]; const t = thread(n.th); if(t){ t.unread = 0; }
    taskDone('read:' + n.id); save(false);
    draw(i);
    const again = g.querySelector(`[data-n="${i}"]`); again && again.focus({ preventScroll:true });
  };
  Sound.sfx('notify'); try { navigator.vibrate && navigator.vibrate([90, 60, 90]); } catch(e){}
  EP.root.classList.remove('ep1-buzz'); void EP.root.offsetWidth; EP.root.classList.add('ep1-buzz');
  draw(null);
  requestAnimationFrame(() => { const b = g.querySelector('[data-n]'); b && b.focus({ preventScroll:true }); });
};
/* a thought in the dialogue panel while a mini-game is on screen */
function thinkLine(text, ua, withNext){
  dlg(`${head(null, 'think')}<div class="ep1-text think">${lineHTML(text)}</div>${uaDiv(ua)}
    <div class="ep1-row"><div class="ep1-tools">${ua ? uaBtn() : ''}</div>${withNext ? `<button type="button" class="ep1-next" data-primary>${withNext}</button>` : ''}</div>`, 'k-think');
  if(!withNext) requestAnimationFrame(() => requestAnimationFrame(() => {
    if(EP.game.hidden || !EP.dlg.contains(document.activeElement)) return;
    const t = EP.game.querySelector('button:not([disabled])'); if(t) try { t.focus({ preventScroll:true }); } catch(e){}
  }));
}

/* ---------- speaking moments: say it out loud (hints → example), record it, or type it ---------- */
RENDER.speakup = function(node, id, tok){
  const f = flags();
  const L = hintLadder(node, f);
  const starters = valOf(node.starters, f) || [];
  const minW = node.minWords || 3;
  let shown = 0, rec = null, typing = false;
  const prompt = valOf(node.prompt, f), ua = valOf(node.ua, f);
  dlg(`${head('🗣️ ' + (node.label || 'Speaking moment'), 'turn')}
    <div class="ep3-su">
      <div class="ep1-q">${esc(prompt)}</div>${uaDiv(ua)}
      <div class="ep3-su-starters"></div>
      <div class="ep1-fb ep3-su-hints"></div>
      <div class="ep3-su-type" hidden><textarea class="ep1-ta" rows="3" maxlength="900" placeholder="Type your answer in English…" aria-label="Your answer"></textarea><div class="ep1-count"></div></div>
      <div class="ep3-su-rec" hidden></div>
      <p class="ep1-mini ep3-su-note">Say it out loud — to yourself, to a classmate or to your teacher. Nothing here listens to or grades your voice.</p>
      <div class="ep1-row"><div class="ep1-tools ep3-su-tools"></div><button type="button" class="ep1-next" data-primary>I said it ✓</button></div>
    </div>`, 'k-answer k-speakup');
  const box = EP.dlg.querySelector('.ep3-su'), ta = box.querySelector('textarea'), done = box.querySelector('[data-primary]');
  const drawStarters = () => { box.querySelector('.ep3-su-starters').innerHTML = starters.length && (shown > 0 || typing) ? `<div class="ep1-starters">${starters.map(s => typing ? `<button type="button" class="ep1-chip" data-st="${esc(s)}">${esc(s)}</button>` : `<span class="ep1-chip ep1-chip-static">${esc(s)}</span>`).join('')}</div>` : ''; };
  const drawTools = () => {
    box.querySelector('.ep3-su-tools').innerHTML = `
      ${shown < L.steps.length ? `<button type="button" class="ep1-btn ep1-btn-ghost" data-su="hint">${L.steps[shown].label}</button>` : ''}
      ${ua ? uaBtn() : ''}
      ${canRecord() && !rec && !typing ? `<button type="button" class="ep1-btn ep1-btn-ghost" data-su="rec">🎙️ Record myself</button>` : ''}
      <button type="button" class="ep1-btn ep1-btn-ghost" data-su="type" aria-pressed="${typing}">${typing ? '🗣️ Say it instead' : '⌨️ Type instead'}</button>
      ${(node.vocab || []).filter(v => P(v)).map(v => `<button type="button" class="ep1-chip" data-vocab="${v}">💬 ${esc(P(v).en)}</button>`).join('')}`;
  };
  const upd = () => {
    const n = wordCount(ta.value);
    box.querySelector('.ep1-count').textContent = typing && n ? `${n} word${n === 1 ? '' : 's'}${n < minW ? ' · a little more, please' : ''}` : '';
    done.disabled = typing ? n < minW : false;
    done.textContent = typing ? 'Done ✓' : (rec && rec.ready ? 'Done ✓' : 'I said it ✓');
  };
  const sm = () => { const b = box.querySelector('[data-say-model]'); if(b && !b.dataset.w){ b.dataset.w = 1; b.addEventListener('click', () => Voice.speak('you', L.model)); } };
  box.addEventListener('click', e => {
    if(tok !== EP.token) return;
    const b = e.target.closest('[data-su]');
    if(b){
      const a = b.dataset.su;
      if(a === 'hint'){ shown++; Sound.sfx('soft'); box.querySelector('.ep3-su-hints').innerHTML = L.steps.slice(0, shown).map(s => s.html).join(''); sm(); drawStarters(); }
      if(a === 'rec'){ const host = box.querySelector('.ep3-su-rec'); host.hidden = false; rec = makeRecorder(host, { minSec:1, onChange: upd }); }
      if(a === 'type'){
        typing = !typing;
        box.querySelector('.ep3-su-type').hidden = !typing;
        box.querySelector('.ep3-su-note').hidden = typing;
        if(typing && rec){ rec.destroy(); rec = null; const host = box.querySelector('.ep3-su-rec'); host.hidden = true; host.innerHTML = ''; }
        drawStarters(); if(typing) ta.focus();
      }
      drawTools(); upd(); return;
    }
    const s = e.target.closest('[data-st]');
    if(s){ ta.value = (ta.value ? ta.value.trimEnd() + ' ' : '') + s.dataset.st.replace(/…$/, ' '); ta.focus(); upd(); }
  });
  ta.addEventListener('input', upd);
  drawTools(); drawStarters(); upd();
  const go = () => {
    if(tok !== EP.token) return;
    if(typing && wordCount(ta.value) < minW){ done.disabled = false; primary(go); return; }
    const s = st();
    const text = typing ? ta.value.trim().slice(0, 900) : '';
    s.answers[node.key] = typing ? { mode:'text', text } : rec && rec.ready ? { mode:'voice', seconds: Math.round(rec.seconds), hints: shown } : { mode:'spoken', hints: shown };
    if(rec){ rec.destroy(); rec = null; }
    taskDone(node.key); save(true);
    if(s.answers[node.key].mode === 'voice') toast('🎙️', 'Speaking practice saved', `${s.answers[node.key].seconds}s recorded on this device`);
    const after = valOf(node.after, f);
    const then = () => after ? showLine({ type:'say', who:after.who, text:valOf(after.text, f), ua:valOf(after.ua, f), vocab:after.vocab }, () => next(node, id)) : next(node, id);
    if(typing) showLine({ type:'say', who:'you', text }, then);
    else then();
  };
  primary(go);
};

/* ---------- “Useful English” cards (saved to the Backpack as they appear) ---------- */
RENDER.useful = function(node, id, tok){
  const items = (node.ids || []).map(k => P(k) ? Object.assign({ id:k }, P(k)) : null).filter(Boolean).concat(node.extra || []);
  const added = (node.ids || []).filter(addPhrase);
  (node.ids || []).forEach(k => taskDone('seen:' + k));
  if(added.length){ toast('🎒', `${added.length} phrase${added.length > 1 ? 's' : ''} saved to Backpack`, added.map(k => P(k).en).slice(0, 2).join(' · ')); save(true); }
  dlg(`${head('💬 ' + esc(node.title || 'Useful English'), 'turn')}
    <div class="ep3-useful ${items.length > 2 ? 'many' : ''}">${items.map(p => `
      <div class="ep3-uc">
        <div class="ep3-uc-en">${esc(p.en)} ${Voice.available() ? `<button type="button" class="ep1-tool" data-say-u="${esc(p.en)}" aria-label="Listen: ${esc(p.en)}">🔊</button>` : ''}</div>
        <div class="ep3-uc-simple">${esc(p.simple || '')}</div>
        <div class="ep3-uc-ex">${esc(p.ex || '')}</div>
        <div class="ep1-ua" ${SET.ua ? '' : 'hidden'}>🇺🇦 ${esc(p.ua || '')}</div>
      </div>`).join('')}</div>
    <div class="ep1-row"><div class="ep1-tools">${uaBtn()}<span class="ep1-mini">🎒 ${(node.ids || []).length ? 'In your Backpack' : ''}</span></div><button type="button" class="ep1-next" data-primary>Continue ▸</button></div>`, 'k-useful');
  EP.dlg.querySelectorAll('[data-say-u]').forEach(b => b.addEventListener('click', () => Voice.speak('you', b.dataset.sayU)));
  primary(() => next(node, id));
};

/* ---------- Scene 4: get the glove back ---------- */
const GLOVE_WAYS = [
  { k:'ball',  emoji:'🎾', text:"Offer Buddy his tennis ball", ok:true,
    line:"Buddy drops the glove — and grabs the ball instead. A fair trade!", ua:"Бадді кидає рукавичку — і хапає м'ячик. Чесний обмін!" },
  { k:'chase', emoji:'🏃', text:"Chase him around the yard", ok:false,
    line:"Buddy thinks this is the BEST game ever. He runs in circles. You're out of breath. He isn't. 😂", ua:"Бадді вирішує, що це НАЙКРАЩА гра у світі. Він бігає колами. Ти задихаєшся. Він — ні. 😂" },
  { k:'ask',   emoji:'✋', text:"Say: “Drop it, please, Buddy!”", ok:true,
    line:"Buddy looks at you… looks at David… and very slowly puts the glove down. Good boy!", ua:"Бадді дивиться на тебе… на Девіда… і дуже повільно кладе рукавичку. Молодець!" }
];
RENDER.drop = function(node, id, tok){
  const tried = new Set();
  function draw(fb){
    dlg(`${head('🧤 Your glove!', 'turn')}<div class="ep1-q">How do you get your glove back?</div>${uaDiv('Як повернути рукавичку?')}
      <div class="ep1-opts">${GLOVE_WAYS.map((w, i) => `<button type="button" class="ep1-opt ${tried.has(i) ? 'tried' : ''}" data-i="${i}" ${tried.has(i) ? 'disabled' : ''}><span class="ep1-k" aria-hidden="true">${i + 1}</span><span class="ep1-emo" aria-hidden="true">${w.emoji}</span><span class="ep1-opt-t">${esc(w.text)}</span></button>`).join('')}</div>
      <div class="ep1-fb" aria-live="polite">${fb || ''}</div><div class="ep1-row"><div class="ep1-tools">${uaBtn()}</div></div>`, 'k-choice');
    EP.dlg.querySelectorAll('.ep1-opt:not([disabled])').forEach(b => b.addEventListener('click', () => pick(+b.dataset.i), { once:true }));
  }
  function pick(i){
    if(tok !== EP.token) return;
    const w = GLOVE_WAYS[i];
    if(!w.ok){ tried.add(i); Sound.sfx('bark'); castKey = null; setCast(['rachel@door', 'david@left', 'buddy@run']); return draw(`<div class="ep1-react"><b>💭</b> ${esc(w.line)}${uaDiv(w.ua)}</div><div class="ep1-tip">Try something else! 🐾</div>`); }
    const f = flags(); f.gloveWay = w.k; taskDone(node.key); st().answers[node.key] = { way:w.k, tries:tried.size + 1 }; save(true);
    Sound.sfx('good');
    setCast(['rachel@door', 'david@left', 'buddy@sit']);
    showLine({ type:'narr', text:w.line, ua:w.ua }, () => next(node, id));
  }
  draw('');
};

/* ---------- Scene 5: the house — choose a room ---------- */
const ROOMS = [
  { k:'kitchen', icon:'🍎', name:'Kitchen', sub:'Snacks, lemons, a fridge full of magnets', go:'k1' },
  { k:'living',  icon:'🛋️', name:'Living Room', sub:'The sofa, the TV — Movie Friday HQ', go:'l1' },
  { k:'yard',    icon:'🌿', name:'Backyard', sub:'Grass, sunshine — and Buddy', go:'y1' },
  { k:'bedroom', icon:'🛏️', name:'Your Bedroom', sub:'Upstairs, at the end of the hall', go:'b1' }
];
RENDER.house = function(node, id, tok){
  const f = flags();
  const done = new Set(roomsDone(f));
  const three = ['kitchen','living','yard'].every(k => done.has(k));
  const g = showGame('g-house');
  const nextStep = !three ? null : !f.rulesDone ? { label:'Continue ▸', to:'ru0' } : { label:'Go to your room ▸', to:'b1' };
  g.innerHTML = `<div class="ep3-house">
    <div class="ep3-house-h"><span>🏡 The Miller house</span><span class="ep3-house-n">${Math.min(4, done.size)}/4 explored</span></div>
    <div class="ep3-house-grid">${ROOMS.map(r => {
      const locked = r.k === 'bedroom' && !f.rulesDone, seen = done.has(r.k);
      return `<button type="button" class="ep3-room ${seen ? 'done' : ''} ${locked ? 'locked' : ''} ${r.k === 'bedroom' && f.rulesDone && !seen ? 'hot' : ''}" data-room="${r.k}" ${locked ? 'aria-disabled="true"' : ''}>
        <span class="ep3-room-i" aria-hidden="true">${locked ? '🔒' : r.icon}</span><b>${esc(r.name)}</b><small>${esc(locked ? (three ? 'Rachel has something to tell you first' : 'Save the best for last!') : seen ? 'Explored ✓ · tap to visit again' : r.sub)}</small></button>`; }).join('')}</div>
  </div>`;
  thinkLine(nextStep ? (f.rulesDone ? "Rules: got it. Now — my room!" : "Kitchen, living room, backyard — done. Rachel is waiting by the stairs.")
                     : "Where to first? Pick a room.",
            nextStep ? (f.rulesDone ? "Правила: зрозуміло. А тепер — моя кімната!" : "Кухня, вітальня, двір — готово. Рейчел чекає біля сходів.") : "Куди спершу? Обери кімнату.",
            nextStep ? nextStep.label : null);
  if(nextStep) primary(() => { if(tok !== EP.token) return; hideGame(); next(node, id, nextStep.to); });
  g.onclick = e => {
    if(tok !== EP.token) return;
    const b = e.target.closest('[data-room]'); if(!b) return;
    const r = ROOMS.find(x => x.k === b.dataset.room);
    if(r.k === 'bedroom' && !f.rulesDone){ Sound.sfx('soft'); toast('🔒', three ? 'Rachel wants to tell you something first' : 'Your room comes last', three ? 'Tap Continue' : 'Explore the other rooms first'); return; }
    Sound.sfx('door'); hideGame(); next(node, id, r.go);
  };
};
RENDER.room = function(node, id){
  const f = flags(); const list = roomsDone(f).slice();
  if(!list.includes(node.room)){
    list.push(node.room); f.rooms = list;
    const r = ROOMS.find(x => x.k === node.room);
    toast(r ? r.icon : '🏡', `${r ? r.name : 'Room'} explored`, `${Math.min(4, list.length)}/4 rooms`);
  }
  taskDone('room:' + node.room); save(true);
  next(node, id);
};

/* ---------- Scene 5: one throw for Buddy ---------- */
RENDER.fetch = function(node, id, tok){
  let throws = 0;
  function draw(){
    dlg(`${head('🎾 Play with Buddy', 'turn')}<div class="ep1-q">${throws ? 'Buddy drops the ball on your shoe. Again? Again?! AGAIN?!' : 'Buddy is staring at the tennis ball. Throw it!'}</div>
      ${uaDiv(throws ? 'Бадді кладе м\'ячик тобі на кросівок. Ще? Ще?! ЩЕ?!' : 'Бадді не зводить очей з тенісного м\'ячика. Кидай!')}
      <div class="ep1-row"><div class="ep1-tools">${uaBtn()}<button type="button" class="ep1-btn ep1-btn-hot" data-throw>🎾 Throw the ball</button></div>
        ${throws ? `<button type="button" class="ep1-next" data-primary>Continue ▸</button>` : ''}</div>`, 'k-choice');
    EP.dlg.querySelector('[data-throw]').addEventListener('click', () => {
      if(tok !== EP.token) return;
      throws++; flags().fetches = (flags().fetches || 0) + 1; Sound.sfx('swoosh');
      castKey = null; setCast(['rachel@left', 'buddy@fetch']);
      setTimeout(() => { if(tok !== EP.token) return; Sound.sfx('bark'); draw(); }, isReduced() ? 200 : 1700);
    }, { once:true });
    if(throws) primary(() => { taskDone(node.key); save(true); setCast(['rachel@left', 'buddy@yard']); next(node, id); });
  }
  draw();
};

/* ---------- Scene 5: house rules — one listening, three questions ---------- */
RENDER.listen3 = function(node, id, tok){
  const got = new Set(), tried = node.qs.map(() => new Set());
  let showText = (SET.subs && !SET.challenge) || !Voice.available(), uaOpen = false, wrong = 0;
  EP.line = { who:node.who, text:node.audio };
  function play(slow){ const w = EP.dlg.querySelector('.ep1-wave'); w && w.classList.add('on'); Voice.speak(node.who, node.audio, { slow }).then(() => { const w2 = EP.dlg.querySelector('.ep1-wave'); w2 && w2.classList.remove('on'); }); }
  function draw(){
    const all = got.size === node.qs.length;
    dlg(`${head(node.who, 'say')}
      <div class="ep1-player">
        <button type="button" class="ep1-play" data-lp="play" aria-label="Play">▶</button>
        <button type="button" class="ep1-btn ep1-btn-ghost" data-lp="slow">🐢 Slower</button>
        <button type="button" class="ep1-btn ep1-btn-ghost" data-lp="tr">${showText ? 'Hide text' : '📝 Show text'}</button>
        <button type="button" class="ep1-btn ep1-btn-ghost" data-lp="ua">UA</button>
        <span class="ep1-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>
      </div>
      ${!Voice.available() ? `<div class="ep1-tip">🔇 Audio isn't available in this browser — read the house rules instead.</div>` : ''}
      <div class="ep1-text say ep1-transcript" ${showText ? '' : 'hidden'}>${lineHTML(node.audio)}</div>
      <div class="ep1-ua" ${showText && uaOpen ? '' : 'hidden'}>${esc(node.ua)}</div>
      <div class="ep3-l3">${node.qs.map((q, qi) => `
        <div class="ep3-l3-q ${got.has(qi) ? 'ok' : ''}"><div class="ep1-q">🎧 ${qi + 1}. ${esc(q.q)}</div>${uaDiv(q.qua)}
          <div class="ep1-opts ep3-l3-opts">${q.options.map((o, oi) => `<button type="button" class="ep1-opt ${tried[qi].has(oi) ? 'tried' : ''} ${got.has(qi) && o.correct ? 'picked' : ''}" data-q="${qi}" data-o="${oi}" ${got.has(qi) || tried[qi].has(oi) ? 'disabled' : ''}><span class="ep1-opt-t">${esc(o.text)}</span></button>`).join('')}</div>
          ${tried[qi].size && !got.has(qi) ? `<div class="ep1-hint">🔎 ${esc(q.hint)}</div>` : ''}${got.has(qi) ? '<div class="ep1-good">✓</div>' : ''}</div>`).join('')}</div>
      ${all ? `<div class="ep1-row"><div class="ep1-good">✓ All three — great listening!</div><button type="button" class="ep1-next" data-primary>Continue ▸</button></div>` : ''}`, 'k-listen k-listen3');
    EP.dlg.querySelectorAll('[data-lp]').forEach(b => b.addEventListener('click', () => {
      const a = b.dataset.lp;
      if(a === 'play') play(false); if(a === 'slow') play(true);
      if(a === 'tr'){ showText = !showText; draw(); }
      if(a === 'ua'){ uaOpen = !uaOpen; if(uaOpen) showText = true; draw(); }
    }));
    EP.dlg.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => {
      if(tok !== EP.token) return;
      const qi = +b.dataset.q, oi = +b.dataset.o, o = node.qs[qi].options[oi];
      if(o.correct){ got.add(qi); Sound.sfx('good'); }
      else { tried[qi].add(oi); wrong++; Sound.sfx('soft'); if(wrong >= 2) showText = true; }
      draw();
      if(got.size === node.qs.length){ taskDone(node.key); st().answers[node.key] = { tries: wrong + node.qs.length }; save(true); }
      const nb = EP.dlg.querySelector(`[data-q="${qi}"]:not([disabled])`) || EP.dlg.querySelector('[data-primary]'); nb && nb.focus({ preventScroll:true });
    }));
    if(all) primary(() => next(node, id));
  }
  draw();
  setTimeout(() => { if(tok === EP.token && SET.sound) play(false); }, 450);
};

/* ---------- Scene 5: grammar discovery — which one is more polite? ---------- */
const POLITE_ROUNDS = [
  { a:"Give me a snack.", b:"Could I have a snack, please?", good:'b',
    why:"“Give me…” sounds like an order. “Could I…, please?” is a polite request.", ua:"«Give me…» звучить як наказ. «Could I…, please?» — ввічливе прохання." },
  { a:"Do you mind if I watch TV?", b:"I'm watching TV now.", good:'a',
    why:"Asking first is polite. “Do you mind if I…?” is very polite.", ua:"Спершу запитати — це ввічливо. «Do you mind if I…?» — дуже ввічливо." },
  { a:"Wi-Fi password.", b:"Is it okay if I use the Wi-Fi?", good:'b',
    why:"Two words sound rude. “Is it okay if I…?” is friendly and polite.", ua:"Два слова звучать грубо. «Is it okay if I…?» — дружньо й ввічливо." }
];
RENDER.polite = function(node, id, tok){
  let round = 0, wrong = 0, fb = '';
  function draw(){
    if(round >= POLITE_ROUNDS.length) return ladder();
    const R = POLITE_ROUNDS[round];
    dlg(`${head('💡 Grammar discovery', 'turn')}
      <div class="ep1-q">Round ${round + 1} of ${POLITE_ROUNDS.length} · Which one is more polite?</div>${uaDiv('Що звучить ввічливіше?')}
      <div class="ep3-pol">${['a','b'].map((k, i) => `<button type="button" class="ep1-opt ep3-pol-o" data-k="${k}"><span class="ep1-k" aria-hidden="true">${i + 1}</span><span class="ep1-opt-t">“${esc(R[k])}”</span></button>`).join('')}</div>
      <div class="ep1-fb" aria-live="polite">${fb}</div><div class="ep1-row"><div class="ep1-tools">${uaBtn()}</div></div>`, 'k-choice');
    EP.dlg.querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', () => {
      if(tok !== EP.token) return;
      if(b.dataset.k === R.good){ Sound.sfx('good'); fb = ''; round++;
        showMini(`<div class="ep1-good">✓ Yes!</div><div class="ep1-tip">💡 ${esc(R.why)}</div>${uaDiv(R.ua)}`, draw); }
      else { wrong++; Sound.sfx('soft'); b.disabled = true; b.classList.add('tried'); EP.dlg.querySelector('.ep1-fb').innerHTML = `<div class="ep1-tip">Hmm — imagine saying it to Rachel. 😬 Which one sounds kinder?</div>`; }
    }));
  }
  function showMini(html, then){
    dlg(`${head('💡 Grammar discovery', 'turn')}${html}<div class="ep1-row"><div class="ep1-tools">${uaBtn()}</div><button type="button" class="ep1-next" data-primary>Next ▸</button></div>`, 'k-choice');
    primary(then);
  }
  function ladder(){
    taskDone(node.key); st().answers[node.key] = { tries: POLITE_ROUNDS.length + wrong }; save(true);
    dlg(`${head('💡 Asking for permission', 'turn')}
      <div class="ep3-ladder">
        <div class="ep3-lad"><b>Can I…?</b><span>friendly, everyday — family and friends</span></div>
        <div class="ep3-lad"><b>Could I…?</b><span>a bit more polite</span></div>
        <div class="ep3-lad"><b>Is it okay if I…?</b><span>polite and friendly</span></div>
        <div class="ep3-lad top"><b>Do you mind if I…?</b><span>very polite · answer “No, not at all!” = YES 🙂</span></div>
      </div>
      ${uaDiv("Чим нижче — тим ввічливіше. Увага: на «Do you mind if I…?» відповідь «No, not at all!» означає «Так, будь ласка!»")}
      <div class="ep1-row"><div class="ep1-tools">${uaBtn()}${['is-it-okay','do-you-mind'].map(v => `<button type="button" class="ep1-chip" data-vocab="${v}">💬 ${esc(P(v).en)}</button>`).join('')}</div><button type="button" class="ep1-next" data-primary>Got it ✓</button></div>`, 'k-useful');
    primary(() => next(node, id));
  }
  draw();
};

/* ---------- Scene 6: the box and the note (close-up) ---------- */
RENDER.note = function(node, id, tok){
  const g = showGame('g-note');
  g.innerHTML = `<div class="ep3-box" role="img" aria-label="A cardboard box full of wires and circuit boards, with a yellow note: PLEASE DON'T TOUCH. — A.">
    <img class="ep3-box-photo" src="${CLOSE('box-note')}" alt="" draggable="false" onerror="this.parentNode.classList.add('no-photo'); this.remove()">
    <svg viewBox="0 0 520 360" aria-hidden="true">
      <path d="M40 120 L440 120 L440 340 L40 340Z" fill="#c69a63"/><path d="M40 120 L10 70 L410 70 L440 120Z" fill="#d8ad74"/><path d="M440 120 L490 76 L490 296 L440 340Z" fill="#a97f4e"/>
      <rect x="80" y="40" width="130" height="80" rx="6" fill="#2f6b4a"/>${[0,1,2,3,4,5].map(i => `<rect x="${92 + i * 19}" y="54" width="12" height="12" fill="#d8c06a"/><rect x="${92 + i * 19}" y="80" width="12" height="6" fill="#9fd0a0"/>`).join('')}
      <rect x="250" y="-10" width="26" height="110" fill="#9aa1aa"/><circle cx="263" cy="-10" r="20" fill="#5AB6F9"/><rect x="276" y="0" width="80" height="16" fill="#9aa1aa"/><rect x="350" y="-6" width="20" height="40" fill="#7a818a"/>
      <path d="M60 110 C120 20 170 80 220 10 M290 90 C330 20 380 60 420 0" stroke="#e0533d" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M120 110 C160 50 220 90 250 40" stroke="#5AB6F9" stroke-width="7" fill="none" stroke-linecap="round"/>
    </svg>
    <div class="ep3-sticky"><span>PLEASE DON'T</span><span>TOUCH. — A.</span></div>
  </div>`;
  Sound.sfx('soft');
  thinkLine("A box full of wires, circuit boards… a little robot arm? And a note.", "Коробка, повна дротів, плат… маленька рука робота? І записка.", 'Continue ▸');
  primary(() => { if(tok !== EP.token) return; taskDone(node.key); hideGame(); next(node, id); });
};

/* ---------- Scene 6: move the box (carefully…) ---------- */
RENDER.move = function(node, id, tok){
  const g = showGame('g-move');
  let step = 0;
  const STEPS = [
    { btn:"🤲 Lift it carefully", say:"Okay. Slowly. It's heavier than it looks…", ua:"Так. Повільно. Вона важча, ніж здається…" },
    { btn:"⬇️ Put it on the floor", say:"Almost there… gently…", ua:"Майже… обережно…" }
  ];
  function draw(){
    g.innerHTML = `<div class="ep3-move s${step}" aria-live="polite">
      <div class="ep3-move-desk"></div>
      <div class="ep3-move-box" data-photo style="background-image:url('${CLOSE('box-cut')}')"><span class="ep3-sticky sm"><span>PLEASE DON'T</span><span>TOUCH. — A.</span></span></div>
      <svg class="ep3-move-cable" viewBox="0 0 200 80" aria-hidden="true"><path d="M10 10 C60 70 120 0 190 60" stroke="#e0533d" stroke-width="8" fill="none" stroke-linecap="round"/></svg>
      ${step < 2 ? `<button type="button" class="ep1-btn ep1-btn-hot ep3-move-btn" data-mv>${STEPS[step].btn}</button>` : ''}
    </div>`;
  }
  draw();
  thinkLine("Carefully… it's not my box.", "Обережно… це не моя коробка.");
  g.onclick = e => {
    if(tok !== EP.token || !e.target.closest('[data-mv]')) return;
    const s = STEPS[step]; step++; Sound.sfx('soft'); draw();
    if(step < 2){ thinkLine(s.say, s.ua); return; }
    setTimeout(() => {
      if(tok !== EP.token) return;
      Sound.sfx('clank'); const box = g.querySelector('.ep3-move'); box && box.classList.add('slip');
      const f = flags(); f.cableOut = true; taskDone(node.key); save(true);
      setBg('bedroomMoved');
      thinkLine("…and something slips out. A cable! 😬", "…і щось вислизає. Кабель! 😬", 'Continue ▸');
      primary(() => { if(tok !== EP.token) return; hideGame(); next(node, id); });
    }, isReduced() ? 100 : 700);
  };
};

/* ---------- Scene 7: the number matches ---------- */
RENDER.match = function(node, id, tok){
  ensureMysteryMsg();
  pushChat('unknown', { id:'e3s7u1', from:'them', text:"hey it's alex 👋", time: clockNow() });
  E.api.openPhone('unknown', true);
  EP.phone.classList.add('ep3-match');
  const foot = E.api.phoneFoot(`<div class="ep1-ph-q">👀 Look at the top of the chat.</div>
    <p class="ep3-match-p">Alex's message landed in the <b>same chat</b> as last night's mystery text — from the same number: <b>+1 (323) 555-0147</b>.</p>
    <button type="button" class="ep1-next ep1-ph-end" data-primary-ph>Wait… it's the same number! ▸</button>`);
  const b = foot.querySelector('[data-primary-ph]'); b.focus({ preventScroll:true });
  Sound.sfx('mystery');
  b.addEventListener('click', () => {
    if(tok !== EP.token) return;
    EP.phone.classList.remove('ep3-match'); E.api.closePhone(); taskDone(node.key); save(true); next(node, id);
  }, { once:true });
};

/* ---------- small story actions ---------- */
const ACTIONS = {
  startDay2(){
    if(typeof window.setStoryDay === 'function' && (!DATA.day || DATA.day.number < 2)) window.setStoryDay(2);
    if(typeof window.renderTopbar === 'function') try { window.renderTopbar(); } catch(e){}
    save(true);
  },
  returnKey(){
    const i = DATA.items.indexOf(KEY_CARD);
    if(i >= 0){ DATA.items.splice(i, 1); flags().returnedKey = true; toast('🔑', 'Key card returned', 'Room 308 — goodbye!'); }
    save(true);
  },
  arriveHouse(){
    const l = DATA.locations.find(x => x.id === 'house');
    if(l && (l.status !== 'unlocked' || !l.visited)){
      l.status = 'unlocked'; l.visited = true; l.note = 'Your new home · since Day 2. Dinner is at six!';
      toast('📍', 'New place on your Map', 'Miller House');
      const exp = DATA.achievements.find(a => a.id === 'explorer'); if(exp && !exp.done) exp.progress = Math.max(exp.progress || 0, DATA.locations.filter(x => x.visited).length);
    }
    save(true);
  },
  giveKey(){ if(giveItem('Miller House key')) toast('🗝️', 'New item', 'Miller House key'); save(true); },
  revealAlex(){
    const f = flags();
    if(!f.alexRevealed){ f.alexRevealed = true; toast('📱', 'Contact updated', 'Unknown number → Alex Miller'); }
    syncAlexThread(); save(true);
  }
};
RENDER.act = function(node, id){
  try { ACTIONS[node.run] && ACTIONS[node.run](flags()); } catch(e){ console.warn('Life in LA: action failed', node.run, e); }
  next(node, id);
};

/* =========================================================================
   FINAL MISSION — “Welcome Home!” 🎤
   Rachel checks how you're settling in. Four goals, 45–75 seconds of
   speaking (a guideline, not a rule). Say it (optional timer and optional
   recording on this device) — or type it. The checklist is ticked by the
   student (or the teacher): nothing here pretends to understand or grade
   pronunciation, grammar or fluency.
   ========================================================================= */
const GOALS = [
  { k:'thank',   label:'Thank Rachel and David for welcoming you', ua:'Подякуй Рейчел і Девіду за теплий прийом' },
  { k:'feel',    label:'Describe how you feel in your new home', ua:'Розкажи, як ти почуваєшся в новому домі' },
  { k:'ask',     label:'Ask one polite question about the house', ua:'Постав одне ввічливе запитання про дім' },
  { k:'suggest', label:'Suggest something to do with the family', ua:'Запропонуй щось зробити разом із родиною' }
];
const FINAL_MODEL = "Thank you so much for welcoming me! I'm really happy to be here. I was a little nervous this morning, but everyone has been so friendly. Could I ask what time you usually have breakfast? Also, I'd love to watch a movie together sometime. I'm really looking forward to getting to know everyone!";
const FINAL_STARTERS = ["Thank you so much for…","I feel… because…","Is it okay if I…?","Could I ask…?","I'd love to… together sometime.","I'm really looking forward to…"];
const FINAL_VOCAB = ['thanks-having-me','getting-used','is-it-okay','do-you-mind','looking-forward','make-yourself-home'];
const RACHEL_Q = "We're really happy you're here! How are you feeling? And is there anything you need?";
RENDER.final = function(node, id, tok){
  hideDlg(); hideGame();
  const s = st(), f = flags();
  let mode = 'say', widget = null;
  const ticked = new Set();
  EP.sheet.hidden = false;
  EP.sheet.innerHTML = `<div class="ep1-final ep3-final" role="dialog" aria-label="Final mission: Welcome Home!">
    <div class="ep1-final-head"><div class="ep1-eyebrow">🎤 Final mission</div><h2>Welcome Home!</h2>
      <div class="ep3-fq"><span class="ep3-fq-who">Rachel:</span> “${esc(RACHEL_Q)}”
        ${Voice.available() ? `<button type="button" class="ep1-tool" data-fm="listen" aria-label="Listen to Rachel">🔊</button>` : ''}<button type="button" class="ep1-tool" data-fm="ua" aria-label="Ukrainian translation">UA</button></div>
      <p class="ep1-ua ep3-fua" ${SET.ua ? '' : 'hidden'}>Рейчел: «Ми справді раді, що ти тут! Як ти почуваєшся? І чи тобі щось потрібно?» — Дай відповідь, у якій ти виконаєш чотири цілі нижче.</p>
      <p class="ep3-fgoal">Answer Rachel naturally. Try to cover all <b>four goals</b> and talk for about <b>45–75 seconds</b> — that's a guide, not a rule.</p>
      <p class="ep1-ua" ${SET.ua ? '' : 'hidden'}>Цілі: ${GOALS.map(g => esc(g.ua)).join(' · ')}</p>
      <div class="ep1-modes" role="tablist" aria-label="How do you want to answer?">
        <button type="button" role="tab" class="ep1-seg on" aria-selected="true" data-mode="say">🗣️ Say it</button>
        <button type="button" role="tab" class="ep1-seg" aria-selected="false" data-mode="type">⌨️ Type it</button>
      </div></div>
    <div class="ep3-final-host"></div></div>`;
  const host = EP.sheet.querySelector('.ep3-final-host');
  function mount(){
    if(widget){ try { widget.destroy(); } catch(e){} widget = null; }
    host.innerHTML = '';
    EP.sheet.querySelectorAll('[data-mode]').forEach(b => { const on = b.dataset.mode === mode; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    if(mode === 'say'){
      const h = document.createElement('div'); host.appendChild(h);
      widget = talkBox(h, {
        opening:"Thank you so much for…", topics: GOALS.map(g => ({ k:g.k, label:g.label })), topicsTitle:'Your 4 goals — tick what you said', ticked: Array.from(ticked),
        seconds:60, minSec:20, starters: FINAL_STARTERS, vocab: FINAL_VOCAB, model: FINAL_MODEL, doneLabel:"I'm done ✓"
      }, r => finish({ mode:r.mode, seconds:r.seconds, ticked:r.ticked }));
    } else {
      host.innerHTML = `<div class="ep3-ftype"><div class="ep3-ftick"><div class="ep1-eyebrow">Your 4 goals — tick what you wrote</div>
        <ul class="ep1-check ep1-check-tap">${GOALS.map(g => `<li><button type="button" class="ep1-tick ${ticked.has(g.k) ? 'ok' : ''}" data-tick="${g.k}" aria-pressed="${ticked.has(g.k)}"><span aria-hidden="true">${ticked.has(g.k) ? '✓' : '○'}</span> ${esc(g.label)}</button></li>`).join('')}</ul></div>
        <div class="ep3-fbox"></div></div>`;
      const box = host.querySelector('.ep3-fbox');
      widget = speakBox(box, { forceText:true, icon:'✍️', prompt:'Type your answer to Rachel (about 50–90 words).', rows:6, minWords:30,
        starters: FINAL_STARTERS, model: FINAL_MODEL, doneLabel:'Done ✓', draft: f.finalDraft || '' },
        r => finish({ mode:'text', text:(r.text || '').slice(0, 1500), words: wordCount(r.text) }));
      box.addEventListener('input', e => { if(e.target.matches('textarea')){ f.finalDraft = e.target.value.slice(0, 1500); } });
    }
  }
  EP.sheet.onclick = e => {
    if(tok !== EP.token) return;
    const m = e.target.closest('[data-mode]'); if(m && m.dataset.mode !== mode){ mode = m.dataset.mode; mount(); return; }
    const fm = e.target.closest('[data-fm]');
    if(fm){ if(fm.dataset.fm === 'listen') Voice.speak('rachel', RACHEL_Q); if(fm.dataset.fm === 'ua') EP.sheet.querySelectorAll('.ep3-final-head .ep1-ua').forEach(x => x.hidden = !x.hidden); return; }
    const t = e.target.closest('.ep3-ftick [data-tick]');
    if(t){ const k = t.dataset.tick; ticked.has(k) ? ticked.delete(k) : ticked.add(k); Sound.sfx('soft');
      t.classList.toggle('ok', ticked.has(k)); t.setAttribute('aria-pressed', ticked.has(k)); t.querySelector('span').textContent = ticked.has(k) ? '✓' : '○'; }
  };
  function finish(r){
    if(tok !== EP.token) return;
    const tickedNow = r.ticked || Array.from(ticked);
    s.final = { mode:r.mode, seconds:r.seconds, words:r.words, text:r.text, ticked:tickedNow, at:Date.now() };
    f.finalMissionCompleted = true; delete f.finalDraft;
    taskDone('final'); save(true); Sound.sfx('reward');
    results(s.final);
  }
  function results(R){
    widget = null;
    const n = R.ticked.length;
    const how = R.mode === 'teacher' ? '👩‍🏫 Done in class with your teacher'
      : R.mode === 'text' ? `⌨️ Typed answer · ${R.words || 0} words`
      : R.mode === 'voice' ? `🎙️ Recorded on this device · ${fmtTime(R.seconds || 0)}`
      : `🗣️ Spoken · timer ${fmtTime(R.seconds || 0)}${R.seconds >= 45 && R.seconds <= 75 ? ' — right in the 45–75 s zone!' : R.seconds > 75 ? ' — lots to say! 😄' : ''}`;
    host.innerHTML = `<div class="ep3-fres">
      <div class="ep1-eyebrow">Mission checklist</div>
      <ul class="ep3-fres-list">${GOALS.map(g => `<li class="${R.ticked.includes(g.k) ? 'ok' : ''}"><span aria-hidden="true">${R.ticked.includes(g.k) ? '✓' : '○'}</span> ${esc(g.label)}</li>`).join('')}</ul>
      <p class="ep3-fres-how">${esc(how)}</p>
      ${R.mode === 'text' && R.text ? `<blockquote class="ep3-fres-text">${esc(R.text)}</blockquote>` : ''}
      <p class="ep1-mini">✋ You (or your teacher) ticked these goals. The app doesn't listen to or grade your English — perfect English isn't the point. Talking is.</p>
      ${n < GOALS.length ? `<p class="ep3-fres-more">You ticked ${n} of ${GOALS.length}. Want another go to cover the rest? You can also carry on.</p>` : `<p class="ep3-fres-more ok">All four goals — that's a real conversation. 🎉</p>`}
      <div class="ep1-row"><button type="button" class="ep1-btn ep1-btn-ghost" data-fm-again>↺ Try again</button><button type="button" class="ep1-next" data-fm-go>Continue ▸</button></div></div>`;
    EP.sheet.querySelectorAll('.ep1-modes').forEach(x => x.hidden = true);
    host.querySelector('[data-fm-again]').addEventListener('click', () => { if(tok !== EP.token) return; R.ticked.forEach(k => ticked.add(k)); EP.sheet.querySelectorAll('.ep1-modes').forEach(x => x.hidden = false); mount(); });
    const go = host.querySelector('[data-fm-go]');
    go.addEventListener('click', () => { if(tok !== EP.token) return; EP.sheet.hidden = true; EP.sheet.innerHTML = ''; EP.sheet.onclick = null; next(node, id); }, { once:true });
    go.focus({ preventScroll:true });
  }
  mount();
  setTimeout(() => { if(tok === EP.token && SET.voice && SET.sound) Voice.speak('rachel', RACHEL_Q); }, 500);
};

/* ---------- optional journal reflection (a new entry — never overwrites old ones) ---------- */
RENDER.reflect = function(node, id, tok){
  hideDlg(); hideGame();
  const f = flags();
  EP.sheet.hidden = false;
  EP.sheet.innerHTML = `<div class="ep1-final ep3-reflect" role="dialog" aria-label="Journal reflection">
    <div class="ep1-final-head"><div class="ep1-eyebrow">📔 Your journal · optional</div><h2>One last thought</h2>
      <p>Your first day in a new home is over. What surprised you the most?</p>
      <p class="ep1-ua" ${SET.ua ? '' : 'hidden'}>Твій перший день у новому домі закінчився. Що тебе здивувало найбільше?</p></div>
    <textarea class="ep1-ta ep3-reflect-ta" rows="5" maxlength="1200" placeholder="The thing that surprised me the most was…" aria-label="Your journal entry">${esc(f.reflectDraft || '')}</textarea>
    <div class="ep1-row"><div class="ep1-tools"><button type="button" class="ep1-tool" data-r="ua">UA</button><button type="button" class="ep1-btn ep1-btn-ghost" data-r="skip">Skip</button></div>
      <button type="button" class="ep1-next" data-r="save" disabled>📔 Save to my journal</button></div></div>`;
  const ta = EP.sheet.querySelector('textarea'), sv = EP.sheet.querySelector('[data-r="save"]');
  const upd = () => { sv.disabled = !ta.value.trim(); f.reflectDraft = ta.value.slice(0, 1200); };
  ta.addEventListener('input', upd); upd();
  let doneOnce = false;
  const leave = () => { EP.sheet.hidden = true; EP.sheet.innerHTML = ''; EP.sheet.onclick = null; next(node, id); };
  EP.sheet.onclick = e => {
    if(tok !== EP.token || doneOnce) return;
    const b = e.target.closest('[data-r]'); if(!b) return;
    if(b.dataset.r === 'ua'){ EP.sheet.querySelectorAll('.ep1-final-head .ep1-ua').forEach(x => x.hidden = !x.hidden); return; }
    if(b.dataset.r === 'skip'){ doneOnce = true; delete f.reflectDraft; save(true); return leave(); }
    if(b.dataset.r === 'save' && ta.value.trim()){
      doneOnce = true;
      DATA.journal.unshift({ id:'ep3-reflect-' + Date.now(), date:`Day 2 · ${DATA.day.dateLabel} · evening`, text: ta.value.trim().slice(0, 1200) });
      delete f.reflectDraft; taskDone(node.key); save(true);
      toast('📔', 'Saved to your journal', 'Day 2 · evening'); Sound.sfx('good');
      setTimeout(leave, isReduced() ? 100 : 500);
    }
  };
  requestAnimationFrame(() => ta.focus({ preventScroll:true }));
};

/* =========================================================================
   JOURNAL — the episode's own automatic entry, built from real choices
   ========================================================================= */
const JOURNAL_ID = 'ep3-new-home';
function journalText(){
  const f = (peekSt(EP_ID) || { flags:{} }).flags;
  const buddy = { ball:"I traded him a tennis ball for it", chase:"I chased him around the yard", ask:"I asked him nicely and he gave it back" }[f.gloveWay] || "I got it back";
  const box = { ask:"I asked Rachel about it", leave:"I left it alone and waited for Alex", move:"I moved it — and a cable fell out 😬" }[f.boxChoice] || "I wasn't sure what to do";
  const emily = f.emilyReply ? " Then a girl called Emily texted me — we're meeting for coffee tomorrow!" : '';
  return `Day 2 — New Home. I checked out of the Palm Court Hotel (and almost forgot my charger!). David picked me up at 11, and Buddy stole my glove in the first five minutes — ${buddy}. Rachel showed me the whole house and gave me my own key. In my room there was a box with a note: “PLEASE DON'T TOUCH. — A.” ${box}. Then I met Alex — and found out HE sent the mysterious message! He said sorry. He knows Jake, but it's “a long story”. Dinner was at six with the whole family.${emily}`;
}
function upsertJournal(text){
  const j = DATA.journal.find(x => x.id === JOURNAL_ID);
  if(j){ j.text = text; return; }
  DATA.journal.unshift({ id:JOURNAL_ID, auto:true, date:'Day 2 · ' + DATA.day.dateLabel, text });
}

/* =========================================================================
   COMPLETION — every world update is idempotent (safe on replay)
   ========================================================================= */
const EP3_PEOPLE = ['david', 'rachel', 'buddy', 'alex', 'emily'];
const NEW_THREADS = ['david', 'emily'];
function applyCompletionWorld(){
  const s = st();
  unlockAch('home-sweet-home');
  EP3_PHRASES.forEach(addPhrase);
  EP3_ITEMS.forEach(giveItem);
  EP3_PEOPLE.forEach(meet);
  const m = DATA.memories.find(x => x.id === 'm3'); if(m) m.unlocked = true;
  const house = DATA.locations.find(l => l.id === 'house'); if(house){ house.status = 'unlocked'; house.visited = true; house.note = 'Your new home · since Day 2. Dinner is at six!'; }
  const exp = DATA.achievements.find(a => a.id === 'explorer'); if(exp && !exp.done) exp.progress = Math.max(exp.progress || 0, DATA.locations.filter(l => l.visited).length);
  const nh = DATA.story.find(x => x.id === 'new-home'); if(nh) nh.status = 'done';
  const me = DATA.story.find(x => x.id === 'meet-emily'); if(me && me.status === 'locked') me.status = 'current';
  if(typeof window.setStoryDay === 'function' && DATA.day.number < 2) window.setStoryDay(2);
  upsertJournal(journalText());
  s.completedScenes = SCENES.map(x => x.id);
  syncAlexThread();
  /* things Episode 4 will want to know (also kept in flags) */
  s.forEp4 = { alexSentTheText:true, jakeAlexBackstory:'not revealed', emilyReply: s.flags.emilyReply || null, apology: s.flags.apology || null,
               boxChoice: s.flags.boxChoice || null, davidTopic: s.flags.davidTopic || null };
}

RENDER.complete = function(node, id, tok){
  hideDlg(); hideGame();
  const s = st();
  const firstTime = !s.completed;
  s.completed = true; s.completedAt = s.completedAt || Date.now(); s.plays = (s.plays || 0) + (EP.countedPlay ? 0 : 1); EP.countedPlay = true;
  applyCompletionWorld();
  s.sceneId = null; s.nodeId = null;
  save(true); flushSave();
  Sound.sfx('mystery');
  EP.fade.classList.add('on');
  setTimeout(() => {
    EP.fade.classList.remove('on');
    EP.cine.hidden = false; EP.cine.className = 'ep1-cine ep1-cine-end';
    EP.cine.innerHTML = `<div class="ep1-end-lines" aria-live="polite"></div><button type="button" class="ep1-skip" data-primary>Skip ▸</button>`;
    const box = EP.cine.querySelector('.ep1-end-lines');
    let skip = false;
    EP.cine.querySelector('[data-primary]').addEventListener('click', () => { skip = true; summary(firstTime); }, { once:true });
    (async () => {
      const R = isReduced();
      box.innerHTML = `<div class="ep1-end-big ep3-tbc">TO BE CONTINUED…</div>`;
      await wait(R ? 1200 : 3000); if(skip || tok !== EP.token) return;
      box.innerHTML = `<div class="ep1-end-big ep3-next-t">NEXT UP — EPISODE 4: MEET EMILY ☕</div><div class="ep1-end-sub">Your first real hangout in LA is coming up.<br>But why does Jake seem to know everyone?</div>`;
      await wait(R ? 1600 : 4400); if(skip || tok !== EP.token) return;
      skip = true; summary(firstTime);
    })();
  }, isReduced() ? 200 : 900);
};

const MEMORY_IMG = BASE + 'img/memory-new-home.webp';
const MEMORY_CAP = "My first day with the Miller family. A new home, new people, and a whole new adventure.";
function summary(firstTime){
  const s = st(), f = s.flags;
  const learned = EP3_TARGET.filter(k => DATA.phrases.some(p => p.id === k || (P(k) && (p.en || '').toLowerCase() === P(k).en.toLowerCase())));
  const spoke = Object.values(s.answers || {}).filter(a => a && ['spoken','voice','text','timer','teacher'].includes(a.mode)).length;
  const ach = ensureAch('home-sweet-home');
  const people = EP3_PEOPLE.map(k => DATA.people.find(p => p.id === k)).filter(Boolean);
  const ep4 = E.has('ep4');
  const fin = s.final;
  EP.cine.hidden = false; EP.cine.className = 'ep1-cine ep1-cine-summary ep3-summary';
  EP.cine.innerHTML = `<div class="ep1-sum" role="dialog" aria-label="Episode summary">
    <div class="ep1-eyebrow">Season 1 · Episode 3 · ✓ Completed</div>
    <h2>EPISODE 3 COMPLETE! 🏡✨</h2><p class="ep1-sum-sub">You're not just visiting LA anymore. You're starting to belong.</p>
    <div class="ep1-sum-grid ep3-sum-grid">
      <div class="ep1-stat"><b>8/8</b><span>scenes</span></div>
      <div class="ep1-stat"><b>${Math.min(4, roomsDone(f).length)}/4</b><span>rooms explored</span></div>
      <div class="ep1-stat"><b>${learned.length}/10</b><span>key phrases in your Backpack</span></div>
      <div class="ep1-stat"><b>${spoke + (fin ? 1 : 0)}</b><span>speaking moments</span></div>
    </div>
    <div class="ep3-sum-rewards">
      <div class="ep2-rw"><div class="ep1-eyebrow">👥 New people</div><b>${people.map(p => esc(p.name.split(' ')[0])).join(', ')}</b><small>See them in People</small></div>
      <div class="ep2-rw"><div class="ep1-eyebrow">🎤 Final mission</div><b>${fin ? 'Welcome Home! ✓' : '—'}</b><small>${fin ? `${(fin.ticked || []).length}/4 goals · ${fin.mode === 'text' ? `${fin.words || 0} words typed` : fin.mode === 'teacher' ? 'done in class' : fmtTime(fin.seconds || 0) + ' of speaking'}` : ''}</small></div>
      <div class="ep2-rw"><div class="ep1-eyebrow">📍 New place</div><b>Miller House 🏡</b><small>Your new home is on the Map</small></div>
    </div>
    <div class="ep3-sum-phr"><div class="ep1-eyebrow">💬 Phrases you learned</div><div class="ep3-sum-chips">${EP3_TARGET.map(k => P(k) ? `<span class="ep3-chip">${esc(P(k).en)}</span>` : '').join('')}</div></div>
    <div class="ep1-sum-row">
      <div class="ep1-sum-ach">${ach ? `<div class="ep1-ach ${ach.done ? 'on' : ''}"><span aria-hidden="true">${ach.icon}</span><div>${esc(ach.name)}<small class="ep3-ach-d">Complete your first day with the Miller family.</small></div></div>` : ''}</div>
      <div class="ep1-sum-mem"><div class="ep1-polaroid"><div class="ep1-polaroid-img ep3-mem-img" style="background-image:url('${MEMORY_IMG}')"></div><div class="ep1-polaroid-cap">New Home 🏡</div></div><small>New memory unlocked</small></div>
      <div class="ep1-sum-next"><div class="ep1-eyebrow">${ep4 ? '🔓 Unlocked' : '🎬 Coming soon'}</div><b>NEXT UP — Episode 4: Meet Emily ☕</b><small>Your first real hangout in LA is coming up. But why does Jake seem to know everyone?</small></div>
    </div>
    <div class="ep1-sum-btns">
      <button type="button" class="ep1-btn ep1-btn-ghost" data-sum="phrases">💬 Review Useful English</button>
      <button type="button" class="ep1-btn ep1-btn-ghost" data-sum="memories">📸 Open Memories</button>
      <button type="button" class="ep1-btn ep1-btn-ghost" data-sum="replay">↺ Replay Episode</button>
      <button type="button" class="ep1-btn" data-sum="ep4" ${ep4 ? '' : 'disabled aria-disabled="true" title="Episode 4 is coming soon"'}>${ep4 ? '☕ Continue to Episode 4' : '🔒 Episode 4 — coming soon'}</button>
      <button type="button" class="ep1-next" data-sum="room" data-primary>Return Home ▸</button>
    </div></div>`;
  EP.cine.onclick = e => {
    const b = e.target.closest('[data-sum]'); if(!b || b.disabled) return;
    const a = b.dataset.sum;
    if(a === 'room') close();
    if(a === 'memories') close({ then: () => window.openModal && window.openModal('memories') });
    if(a === 'phrases') close({ then: () => { if(window.openModal){ window.openModal('backpack'); if(typeof window.renderBackpack === 'function'){ const mc = document.getElementById('modalContent'); mc.innerHTML = window.renderBackpack('phrases', 'ep3'); window.wireModalContent && window.wireModalContent('backpack'); } } } });
    if(a === 'replay') confirmBox('Replay Episode 3?', 'Your rewards, phrases, journal and messages stay. You start again from Scene 1.', () => { EP.cine.onclick = null; restartEpisode(); });
    if(a === 'ep4' && ep4){ EP.cine.onclick = null; E.open('ep4'); }
  };
  EP.cine.querySelector('[data-sum="room"]').focus({ preventScroll:true });
  if(firstTime) setTimeout(() => toast('🏡', 'Achievement unlocked', 'Home Sweet Home'), 500);
}

/* =========================================================================
   RESET — what "Reset Episode 3" removes from a saved progress snapshot.
   Removed: Episode 3's state, its own phrases, items, the Home Sweet Home
   achievement, the New Home memory, the Miller House pin, the Millers and
   Emily in People, the David and Emily chats, Episode 3's messages in the
   other chats (ids start with "e3"). The Room 308 key card comes back if
   Episode 2 is finished. Kept: the journal, everything from Episodes 1–2.
   ========================================================================= */
function clearEp3(snap){
  snap = snap || {};
  const story = (snap.story && typeof snap.story === 'object') ? snap.story : { v:1, episodes:{}, world:{} };
  story.episodes = Object.assign({}, story.episodes); delete story.episodes.ep3;
  const ep2Fin = !!(story.episodes.ep2 && story.episodes.ep2.completed);
  const w = story.world = Object.assign({}, story.world);
  if(Array.isArray(w.phrases)) w.phrases = w.phrases.filter(k => !OWN_PHRASES.includes(k));
  if(Array.isArray(w.items)){
    w.items = w.items.filter(n => !EP3_ITEMS.includes(n));
    if(ep2Fin && !w.items.includes(KEY_CARD)) w.items.push(KEY_CARD);
  }
  if(w.ach){ w.ach = Object.assign({}, w.ach); delete w.ach['home-sweet-home']; }
  if(Array.isArray(w.memories)) w.memories = w.memories.filter(x => x !== 'm3');
  if(w.locations){ w.locations = Object.assign({}, w.locations); delete w.locations.house; }
  if(Array.isArray(w.people)) w.people = w.people.filter(x => !EP3_PEOPLE.includes(x));
  if(w.story){ w.story = Object.assign({}, w.story); delete w.story['meet-emily']; if(ep2Fin) w.story['new-home'] = 'current'; else delete w.story['new-home']; }
  if(Array.isArray(w.threads)) w.threads = w.threads.filter(x => !NEW_THREADS.includes(x));
  snap.chat = Object.assign({}, snap.chat);
  NEW_THREADS.forEach(k => delete snap.chat[k]);
  Object.keys(snap.chat).forEach(k => { if(Array.isArray(snap.chat[k])) snap.chat[k] = snap.chat[k].filter(m => !(m && typeof m.id === 'string' && m.id.indexOf('e3') === 0)); });
  snap.day = 1;
  snap.story = story;
  return snap;
}

/* =========================================================================
   REGISTER
   ========================================================================= */
E.register({
  id:EP_ID, n:3, title:'New Home', icon:'🏡', label:'Season 1 · Episode 3', storyId:'new-home', memoryId:'m3', dayLabel:'Day 2',
  tagline:"A new home isn't just a place. It's about the people you share it with.",
  card(){ return { eyebrow:'New · Episode 3', title:'New Home', desc:"Meet the Millers — and find out who sent that message.", cta:'Start', icon:'🏡' }; },
  teaser:{ storyId:'meet-emily', title:'Meet Emily', icon:'☕', short:'Episode 4 is on its way…',
           html:`<div class="ep1-ep2"><div class="ep1-eyebrow">🎬 Coming soon · Episode 4</div><h2>☕ Meet Emily</h2>
             <p>Your first real hangout in LA is coming up. Emily is going to text you in the morning… But why does Jake seem to know everyone?</p>
             <p class="ep1-mini">Episode 4 is being filmed right now. 🎬 It will appear here as soon as it's ready.</p></div>` },
  scenes: SCENES, phrases: PHRASES, items: ITEMS, speakers: SPEAKERS,
  achievements: { 'home-sweet-home': { icon:'🏡', name:'Home Sweet Home', total:1, desc:'Complete your first day with the Miller family.' } },
  people: {
    david:  { id:'david', name:'David Miller', role:'Host dad', color:'#3E7C8C',
              bio:"Calm, friendly, always fixing something around the house — and he makes people feel comfortable right away. You met him outside the Palm Court Hotel on Day 2, at 11 AM sharp.", catch:"“Need a hand?”" },
    rachel: { id:'rachel', name:'Rachel Miller', role:'Host mom', color:'#F3E5C8', dark:true,
              bio:"Warm and attentive. Loves cooking and welcoming guests, and explains the house rules kindly. You met her on the front steps of the Miller house — she gave you your own key.", catch:"“Make yourself at home!” · “Dinner's at six!”" },
    buddy:  { id:'buddy', name:'Buddy', role:'The Millers’ golden retriever', color:'#FFD23F', dark:true,
              bio:"Four years old, super friendly, full of energy — and a professional sock-and-glove thief. You met him about five seconds after you arrived. He stole your glove.", catch:"🐾 Loves fetch. Hide your socks." },
    alex:   { id:'alex', name:'Alex Miller', role:'Host brother · 15', color:'#55657f',
              bio:"Rachel and David's son. Into computers, gaming and building things — your room used to be his project room. A little quiet with new people. He sent the mysterious text (and said sorry). He knows Jake Carter… but that's a long story.", catch:"“That's on me.” · “I'm your guy.”" },
    emily:  { id:'emily', name:'Emily', role:'Lives nearby · around your age', color:'#FF8A3D',
              bio:"The Millers' neighbor. Rachel says she'd love to show you around. She texted you on your second evening in LA — you're meeting for coffee tomorrow.", catch:"“Wanna grab coffee tomorrow? ☕”" }
  },
  threads: {
    david: { id:'david', name:'David Miller', color:'#3E7C8C', sub:'Host dad 🏡' },
    emily: { id:'emily', name:'Emily', color:'#FF8A3D', sub:'online', online:true }
  },
  photoBase: PHOTO_BASE, photos: PHOTOS, photoExtras: PHOTO_EXTRAS, photoLayers: PHOTO_LAYERS, avatars: AVATARS, art: sceneArt,
  hideHotspots:['wake','house','listen3','polite','note','move','match','final','reflect'],
  soundDesc:'Morning street, birdsong, a family home, Buddy, phone sounds',
  render: RENDER,
  onOpen(){ syncAlexThread(); },
  onRestart(){ castKey = null; syncAlexThread(); },
  onScene(sc){ castKey = null; },
  onNode(sc, nodeId, node){
    /* after the engine has set this node's background (same task), update the people on screen and the ambience */
    Promise.resolve().then(() => {
      if(!EP.open || EP.scene !== sc) return;
      setCast(castAt(sc, nodeId));
      Sound.ambience(ambAt(sc, nodeId));
    });
  },
  onApply(){ syncAlexThread(); },
  onRegister(){
    if(typeof ASSETS === 'object') ASSETS.ep3NewHome = MEMORY_IMG;
    const m = DATA.memories.find(x => x.id === 'm3');
    if(m){ m.imgKey = 'ep3NewHome'; m.cap = 'New Home'; m.desc = MEMORY_CAP; }
    const nh = DATA.story.find(x => x.id === 'new-home'); if(nh){ nh.label = 'New Home'; nh.img = BASE + 'img/cover.webp'; }
    keepImage(Object.assign(new Image(), { src: BASE + 'img/cover.webp' }));
  },
  clearOwn: clearEp3
});
/* the drawings, for exporting stills (cover / memory images): LilaArt.ep3.scene('houseFront') */
window.LilaArt = Object.assign(window.LilaArt || {}, { ep3: { scene: sceneArt, cast: castSVG, keys: Object.keys(ART) } });

})();
