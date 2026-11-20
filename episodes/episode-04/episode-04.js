/* =========================================================================
   LIFE IN LA — Season 1 · Episode 4: "MEET EMILY" ☕
   One coffee. A new friendship. And a little unexpected drama.
   -------------------------------------------------------------------------
   Day 3. Emily's morning text, a walk through the neighborhood (and one
   pair of directions), ordering a drink in a real LA coffee shop — with a
   name on the cup that is definitely not yours — the first five minutes of
   a new friendship, Emily's photos, the Jake situation, an invitation to the
   beach, and a final speaking mission: your first real hangout.

   Runs on the shared player (episodes/engine/lila-engine.js). Load order in
   index.html: engine → episode-01 → episode-02 → episode-03 → episode-04.

   Continuity read from earlier saves, only when they exist:
     Episode 3 (DATA.episodes.ep3.flags): emilyReply, davidTopic, apology
     Episode 2 (DATA.episodes.ep2.flags): mentionedJake, jakeQuestions
   Without them, neutral lines are used — nothing is made up.

   Saved per student in DATA.episodes.ep4 (→ the `story` jsonb column of
   life_in_la_progress, no migration needed): scene/node, choices, answers
   and the flags emilyFirstReply, coffeeOrder {drink,size,milk,price,
   sentence}, cupReply, preferredLAPlace, jakeSituationReaction {reaction,
   followUp}, beachInvitationResponse, finalMissionCompleted, rel
   (friendship milestones), emilyFacts. See the README.

   Speaking: nothing here listens to, transcribes or grades speech. The
   student speaks out loud (to the teacher, a classmate or themselves);
   the student or the teacher marks the turn as done. Emily's reactions to
   free answers are either neutral or picked by the teacher/student.
   ========================================================================= */
(function(){
'use strict';
const E = window.LilaEngine;
if(!E){ console.error('Life in LA: episodes/engine/lila-engine.js must load before episode-04.js'); return; }
const { esc, isReduced, wait, fmtTime, SET, Sound, Voice, canRecord, makeRecorder, destroyRecorders, wordCount, st, peekSt, save, flushSave,
        taskDone, ensureAch, unlockAch, addPhrase, hasPhrase, giveItem, meet, thread, pushChat, hasMsg, EP, dlg, hideDlg, primary, head,
        lineHTML, toast, pop, closePop, vocabCard, showLine, next, valOf, showGame, hideGame, openModalEp, closeModalEp, confirmBox, close,
        restartEpisode, runNode, gotoScene, closePhone, keepImage, setBg, setCam, renderHotspots, hotspotsVisible, syncTop,
        PHRASES: ALL_PHRASES } = E.api;
const { rng, svg, lin, rad, FONT, palm, figure, nextArtId } = E.api.art;
const RENDER = {};
const EP_ID = 'ep4';
const BASE = 'episodes/episode-04/';
const PHOTO_BASE = BASE + 'photos/';

/* =========================================================================
   LEARNING CONTENT
   The 12 target expressions, introduced in context (never as a list up
   front). Two were met in Episode 2 — “You can't miss it.” and “What a
   small world!” — they are reviewed here, not added twice. “Count me in.”
   is also on the starter list, so the Backpack keeps a single copy.
   Plus the ordering phrases of Scene 3. Each: simple English, Ukrainian,
   an example, a tag. `match` = what gets underlined in a line.
   ========================================================================= */
const PHRASES = {
  'be-up-for':      { en:"Be up for something", match:"up for", ua:"Бути не проти чогось / мати бажання",
                      simple:"You want to do something, or you're ready for it.", ex:"“Are you up for a movie tonight?” “Totally!”", tag:"informal",
                      ctx:"Emily's first text: “Still up for coffee today?”" },
  'grab-coffee':    { en:"Grab a coffee", match:"grab (?:a )?(?:coffee|something)", ua:"Випити кави (разом) / швиденько взяти щось",
                      simple:"A casual way to say: have a coffee (together) or get something quickly.", ex:"“Want to grab a coffee after school?”", tag:"informal",
                      ctx:"Emily: “Go grab something. I'll be right here.”" },
  'can-i-get':      { en:"Can I get…?", match:"can I get", ua:"Можна мені…?",
                      simple:"The usual, polite way to order in an American café.", ex:"“Can I get a medium cappuccino, please?”", tag:"polite",
                      ctx:"Ordering at the counter." },
  'lot-to-take-in': { en:"That's a lot to take in.", match:"(?:that's )?a lot to take in", ua:"Це багато всього одразу.",
                      simple:"There's so much new information that it's hard to understand it all at once.", ex:"“New school, new city, new friends? That's a lot to take in.”", tag:"neutral",
                      ctx:"Emily, about moving to a new country." },
  'really-into':    { en:"I'm really into…", match:"really into", ua:"Я дуже захоплююся… / Мені дуже подобається…",
                      simple:"You really like something and do it a lot.", ex:"“I'm really into photography right now.”", tag:"informal",
                      ctx:"Telling Emily what you enjoy." },
  'what-about-you': { en:"What about you?", match:"what about you", ua:"А ти? / А як щодо тебе?",
                      simple:"Turn the question back to the other person — it keeps a conversation going.", ex:"“I love the beach. What about you?”", tag:"neutral",
                      ctx:"Keeping the conversation going." },
  'always-wanted':  { en:"I've always wanted to…", match:"I've always wanted to", ua:"Я завжди хотів(-ла)…",
                      simple:"You have wanted this for a long time.", ex:"“I've always wanted to see the ocean at sunset.”", tag:"neutral",
                      ctx:"Convincing Emily — and the final mission." },
  'thats-awkward':  { en:"That's awkward.", match:"(?:that's )?awkward", ua:"Якось незручно.",
                      simple:"A situation feels uncomfortable or a little embarrassing.", ex:"“He texted me right when we were talking about him. That's awkward!”", tag:"informal",
                      ctx:"When Jake texts at exactly the wrong moment." },
  'count-me-in':    { en:"Count me in.", match:"count me in", ua:"Я з вами! / Рахуйте на мене.",
                      simple:"Yes — I want to join your plan.", ex:"“We're going to the beach on Saturday.” “Count me in!”", tag:"very informal",
                      ctx:"Saying yes to the beach." },
  'keep-me-posted': { en:"Keep me posted.", match:"keep (?:me|you) posted", ua:"Тримай мене в курсі.",
                      simple:"Tell me when you know more.", ex:"“I'm not sure about Saturday yet.” “No problem — keep me posted!”", tag:"informal",
                      ctx:"Talking about the weekend plan." },
  /* the ordering phrases of Scene 3 */
  'id-like':        { en:"I'd like…, please.", match:"I'd like", ua:"Я б хотів(-ла)…, будь ласка.",
                      simple:"A polite way to say what you want.", ex:"“I'd like a small hot chocolate, please.”", tag:"polite",
                      ctx:"Ordering at the counter." },
  'anything-else':  { en:"Anything else?", match:"anything else", ua:"Щось іще?",
                      simple:"What staff ask to check if your order is complete.", ex:"“Anything else for you today?” “No, that's all.”", tag:"neutral",
                      ctx:"The barista, after your drink." },
  'thats-all':      { en:"That's all, thanks.", match:"that's all", ua:"Це все, дякую.",
                      simple:"Your order is complete.", ex:"“Anything else?” “That's all, thanks!”", tag:"polite",
                      ctx:"Finishing your order." }
};
/* the 12 target expressions, in story order ('cant-miss' and 'small-world' come from Episode 2) */
const EP4_TARGET = ['be-up-for','grab-coffee','cant-miss','can-i-get','lot-to-take-in','really-into','what-about-you','always-wanted','small-world','thats-awkward','count-me-in','keep-me-posted'];
const EP4_EXTRA = ['id-like','anything-else','thats-all'];
const EP4_PHRASES = EP4_TARGET.concat(EP4_EXTRA);
const OWN_PHRASES = Object.keys(PHRASES);
const P = id => PHRASES[id] || ALL_PHRASES[id] || null;

/* =========================================================================
   PEOPLE IN THIS EPISODE
   ========================================================================= */
const SPEAKERS = {
  emily:   { name:'Emily', role:'Lives nearby · around your age', color:'#FF8A3D', voice:{ g:'f', pitch:1.18, rate:1.06, idx:2 } },
  barista: { name:'Marcus', role:'Barista · Corner Cup', color:'#6b4a35', voice:{ g:'m', pitch:1.0, rate:1.02, idx:1 } },
  local4:  { name:'Neighbor', role:'Walking her dog', color:'#7aa7c7', voice:{ g:'f', pitch:0.98, rate:0.94, idx:0 } },
  jake:    { name:'Jake', role:'Local teen', color:'#6DBB75', voice:{ g:'m', pitch:1.14, rate:1.06, idx:2 } }
};
const CAFE = 'Corner Cup';
const BOOKSTORE = 'Paper Moon Books';

/* ---------- continuity helpers (earlier saves, only if they exist) ---------- */
const ep3 = () => peekSt('ep3');
const ep3Done = () => !!(ep3() && ep3().completed);
const ep3f = () => (ep3() && ep3().flags) || {};
const ep2 = () => peekSt('ep2');
const ep2Done = () => !!(ep2() && ep2().completed);
const ep2f = () => (ep2() && ep2().flags) || {};
const flags = () => st().flags;
function playerName(){
  try { const n = typeof window.lilaPlayerName === 'function' ? window.lilaPlayerName() : null; return n && /^[A-Za-zÀ-ÿ'’-]{2,20}$/.test(n) ? n : null; } catch(e){ return null; }
}

/* ---------- the coffee menu (fictional prices for a fictional café — the same for every size) ---------- */
const MENU = [
  { id:'icedLatte',  name:'Iced Latte',    icon:'🧋', price:'5.50', milk:true,  a:'an', word:'iced latte',    desc:'Espresso + cold milk, over ice' },
  { id:'cappuccino', name:'Cappuccino',    icon:'☕', price:'4.75', milk:true,  a:'a',  word:'cappuccino',    desc:'Espresso + lots of milk foam' },
  { id:'icedTea',    name:'Iced Tea',      icon:'🍹', price:'3.75', milk:false, a:'an', word:'iced tea',      desc:'Black tea, cold, with ice — no milk' },
  { id:'hotChoc',    name:'Hot Chocolate', icon:'🍫', price:'4.25', milk:true,  a:'a',  word:'hot chocolate', desc:'Made with steamed milk' }
];
const SIZES = ['small', 'medium', 'large'];
const MILKS = { regular:'regular milk', oat:'oat milk' };
const drinkOf = o => MENU.find(m => m.id === (o && o.drink)) || null;
const cap1 = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
const coffee = f => (f && f.coffeeOrder) || {};
const milkApplies = f => { const d = drinkOf(coffee(f)); return !!(d && d.milk); };
/* “I'd like a medium iced latte with oat milk, please.” — regular milk is the default, so it isn't said */
function orderSentence(o, style){
  const d = drinkOf(o); if(!d) return '';
  const size = o.size || 'medium';
  const art = /^[aeiou]/i.test(size) ? 'an' : 'a';
  const milk = d.milk && o.milk === 'oat' ? ' with oat milk' : '';
  const core = `${art} ${size} ${d.word}${milk}`;
  return style === 'can' ? `Can I get ${core}, please?` : `I'd like ${core}, please.`;
}
const shortOrder = o => { const d = drinkOf(o); if(!d) return ''; return `${o.size || 'medium'} ${d.word}${d.milk && o.milk === 'oat' ? ' with oat milk' : ''}`; };

/* ---------- the name on the cup: misheard, never mean ---------- */
const CUP_NAMES = {
  oksana:'Roxanna', taras:'Tarzan', dmytro:'Demetrius', andrii:'Audrey', andriy:'Audrey', sofiia:'Sophie-Ya', sofia:'Sophie-Ya', yaroslav:'Yara Slav',
  maksym:'Max Sim', maxim:'Max Sim', anastasiia:'Anna Stacy', anastasia:'Anna Stacy', daryna:'Darlene', kateryna:'Katrina', viktoriia:'Victory',
  viktoria:'Victory', bohdan:'Bodhi', bogdan:'Bodhi', olena:'Elaina', iryna:'Irene', mykola:'Nicola', oleksandr:'Alexander the Great',
  yuliia:'Julio', khrystyna:'Kristen', artem:'Autumn', denys:'Dennis', nazar:'Bazaar', ivan:'Evan', bohdana:'Bandana', polina:'Pauline',
  kyrylo:'Carol', mariia:'Mario', maria:'Mario', danylo:'Daniel-O', olha:'Olive', marta:'Martha Stewart', roman:'Ramen', vlad:'Flad',
  vladyslav:'Flat Slav', ostap:'Oh Stop', serhii:'Sergio', yevhen:'Evan', zakhar:'Sugar', solomiia:'Solomon', ustym:'Justin', lev:'Leaf',
  svitlana:'Svetlana', tymofii:'Timothy', matvii:'Matthew', eva:'Ava', emilia:'Amelia', mark:'Marco'
};
const CUP_BY_LETTER = { a:'Ashley', b:'Brandon', c:'Chad', d:'Derek', e:'Eugene', f:'Fernando', g:'Gary', h:'Hunter', i:'Ingrid', j:'Jordan',
  k:'Kevin', l:'Lance', m:'Megan', n:'Norman', o:'Oscar', p:'Patty', r:'Randy', s:'Steve', t:'Tiffany', u:'Ursula', v:'Vince', y:'Yolanda', z:'Zack' };
function cupName(){
  const n = playerName();
  if(!n) return 'Kevin';
  const k = n.toLowerCase();
  if(CUP_NAMES[k]) return CUP_NAMES[k];
  const alt = CUP_BY_LETTER[k.charAt(0)] || 'Kevin';
  return alt.toLowerCase() === k ? 'Kevin' : alt;
}

/* ---------- friendship with Emily: five story moments (never a score) ---------- */
const MILESTONES = [
  { k:'hello',    icon:'👋', label:'First hello',          ua:'Перше «привіт»' },
  { k:'joke',     icon:'😂', label:'A shared joke',        ua:'Спільний жарт' },
  { k:'personal', icon:'💬', label:'A real conversation',  ua:'Справжня розмова' },
  { k:'common',   icon:'🌴', label:'Something in common',  ua:'Щось спільне' },
  { k:'plans',    icon:'🌊', label:'Weekend plans',        ua:'Плани на вихідні' }
];
const relList = s => Array.from(new Set(((s && s.flags && s.flags.rel) || []).concat((s && s.relEver) || []))).filter(k => MILESTONES.some(m => m.k === k));
function relStatus(s){
  const n = relList(s).length;
  if(s && s.completed) return { name:'New Friend', stage:'Early friendship' };
  if(n >= 3) return { name:'New Friend', stage:'Getting to know each other' };
  if(n >= 1) return { name:'Just met', stage:'First conversation' };
  return { name:'Not met yet', stage:'' };
}

/* What Emily tells you when you ask her (and what goes on her People card). */
const EMILY_ANSWERS = {
  weekends: { q:"What do you usually do on weekends?", icon:'📷',
              a:"Honestly? Photography walks. I grab my camera, pick a neighborhood and just… get lost. And coffee. Always coffee.",
              ua:"Чесно? Фотопрогулянки. Беру камеру, обираю район і просто… гуляю. І кава. Завжди кава.",
              fact:"Spends weekends on photography walks" },
  always:   { q:"Have you always lived in LA?", icon:'🏙️',
              a:"Not always! We moved here from Seattle when I was six. So, like, ninety percent LA.",
              ua:"Не завжди! Ми переїхали сюди із Сіетла, коли мені було шість. Тож я десь на дев'яносто відсотків з Лос-Анджелеса.",
              fact:"Moved to LA from Seattle when she was six" },
  favorite: { q:"What's your favorite place in the city?", icon:'🌅',
              a:"Ooh, hard one. The beach at sunset. Or that tiny bookstore across the street. Don't tell anyone.",
              ua:"О, складне питання. Пляж на заході сонця. Або та крихітна книгарня через дорогу. Тільки нікому не кажи.",
              fact:"Favorite places: the beach at sunset and Paper Moon Books" },
  jake:     { q:"How do you know Jake?", icon:'🏀',
              a:"Jake? Everyone knows Jake. We go to the same school — Fairview. He's… a lot. In a funny way. Mostly.",
              ua:"Джейка? Джейка знають усі. Ми ходимо в одну школу — Fairview. Він… той ще персонаж. У смішному сенсі. Здебільшого.",
              fact:"Goes to Fairview High, like Jake" },
  music:    { q:"What kind of music do you like?", icon:'🎧',
              a:"Indie stuff, mostly. And anything I can listen to on a long walk with my camera.",
              ua:"Здебільшого інді. І все, що можна слухати на довгій прогулянці з камерою.",
              fact:"Likes indie music" },
  photos:   { q:"How did you get into photography?", icon:'🎞️',
              a:"My grandpa gave me his old film camera when I was twelve. I was hooked. Now I take, like, a thousand photos a week.",
              ua:"Дідусь подарував мені свою стару плівкову камеру, коли мені було дванадцять. І все — я пропала. Тепер роблю десь тисячу фото на тиждень.",
              fact:"Got her grandpa's old film camera at twelve" }
};
const EMILY_OWN = { a:"Ooh, good question. Honestly? I need a second to think about that one. 😄 Ask me another!",
                    ua:"О, гарне питання. Чесно? Мені треба секунду подумати. 😄 Спитай ще щось!" };
const BASE_FACTS = ["Loves photography — especially sunsets", "Knows every coffee shop in the neighborhood"];

/* ---------- small UI helpers ---------- */
const uaDiv = t => t ? `<div class="ep1-ua" ${SET.ua ? '' : 'hidden'}>${esc(t)}</div>` : '';
const uaBtn = () => `<button type="button" class="ep1-tool" data-act="ua" title="Ukrainian translation" aria-label="Show Ukrainian translation">UA</button>`;
/* a thought in the dialogue panel while a mini-game is on screen */
function thinkLine(text, ua, withNext){
  dlg(`${head(null, 'think')}<div class="ep1-text think">${lineHTML(text)}</div>${uaDiv(ua)}
    <div class="ep1-row"><div class="ep1-tools">${ua ? uaBtn() : ''}</div>${withNext ? `<button type="button" class="ep1-next" data-primary>${withNext}</button>` : ''}</div>`, 'k-think');
}
/* a character line in the dialogue panel while a mini-game is on screen (with voice) */
function sayLine(who, text, ua, withNext, vocab){
  E.api.EP.line = { who, text, vocab };
  dlg(`${head(who, 'say')}<div class="ep1-text say">${SET.subs ? lineHTML(text, vocab) : E.api.subsOffHTML()}</div>${uaDiv(ua)}
    <div class="ep1-row">${E.api.tools({ audio:true, ua, vocab })}${withNext ? `<button type="button" class="ep1-next" data-primary>${withNext}</button>` : ''}</div>`, 'k-say w-' + who);
  if(SET.voice && SET.sound) Voice.speak(who, text);
}

/* =========================================================================
   STORY — 8 scenes in three acts (the Final Mission and the ending close
   Scene 8). A node continues to the next key unless it says `next`.
   Branches are short and always come back together.
     ACT I   — The Meetup:          1 One New Message · 2 Finding the Coffee Shop · 3 Can I Get a Latte?
     ACT II  — Getting to Know Emily: 4 The First Five Minutes · 5 More Than Small Talk · 6 The Jake Situation
     ACT III — A New Friendship:    7 An Unexpected Invitation · 8 Your First Real Hangout
   ========================================================================= */
const say   = (who, text, ua, more) => Object.assign({ type:'say', who, text, ua }, more || {});
const think = (text, ua, more) => Object.assign({ type:'think', text, ua }, more || {});
const narr  = (text, ua, more) => Object.assign({ type:'narr', text, ua }, more || {});
const act   = (run, arg, more) => Object.assign({ type:'act', run, arg }, more || {});

/* Emily's first text — it follows up on how you answered her on Day 2 (Episode 3), if you did */
function firstText(){
  const r = ep3f().emilyReply;
  if(r === 'time')  return "Hey! ☀️ You asked what time — how about 11? Still up for coffee today? There's a cute little place near your house.";
  if(r === 'where') return "Hey! ☀️ Still up for coffee today? You asked where — there's a cute little place near your house. How about 11?";
  return "Hey! ☀️ Still up for coffee today? There's a cute little place near your house. How about 11?";
}
const FIRST_UA = "Привіт! ☀️ Ну що, досі не проти випити кави сьогодні? Тут біля твого дому є одне миле місце. Як щодо 11-ї?";

/* what Emily says about your drink (Scene 4) */
function orderComment(f){
  const o = coffee(f), oat = o.milk === 'oat';
  switch(o.drink){
    case 'icedLatte':  return oat ? ["An iced latte with oat milk? Okay, you're basically a local now. 😂", "Айс-лате на вівсяному молоці? Окей, ти вже практично місцевий(-а). 😂"]
                                  : ["An iced latte. Classic LA choice. Honestly? You're fitting in already.", "Айс-лате. Класичний вибір для Лос-Анджелеса. Чесно? Ти вже вписуєшся."];
    case 'cappuccino': return oat ? ["An oat milk cappuccino? Very fancy. I approve.", "Капучино на вівсяному? Дуже вишукано. Схвалюю."]
                                  : ["A cappuccino? Respect. Very European of you.", "Капучино? Повага. Дуже по-європейськи."];
    case 'icedTea':    return ["Iced tea — smart. It's going to be really hot later.", "Холодний чай — розумно. Пізніше буде дуже спекотно."];
    case 'hotChoc':    return ["Hot chocolate. In August. In LA. Honestly? I love that. No rules.", "Гарячий шоколад. У серпні. У Лос-Анджелесі. Чесно? Обожнюю. Жодних правил."];
  }
  return ["Good choice. Honestly, everything here is good.", "Гарний вибір. Чесно, тут усе смачне."];
}
const PLACE = { beach:'Santa Monica Beach', hills:'the Hollywood Hills', hidden:'a hidden local spot' };

const SCENES = [

/* ================================================================ ACT I */
/* ---------------------------------------------------------------- SCENE 1 */
{ id:'s1', n:1, act:1, title:'One New Message', emoji:'📱', objective:'Answer Emily', location:'Miller House',
  bg:'bedroomAm', ambience:'morning', clock:'8:45 AM', cast:['buddy@sleep'],
  hotspots:[
    { id:'s1-buddy', x:30, y:80, ph:[31, 66], icon:'🐾', label:'Look at Buddy', bgs:['bedroomAm'],
      text:"Buddy is snoring softly on the rug. One ear twitches every time a bird sings outside.", ua:"Бадді тихенько хропе на килимку. Одне вухо смикається щоразу, коли надворі співає пташка." },
    { id:'s1-window', x:80, y:30, ph:[80, 32], icon:'🌴', label:'Look out of the window', bgs:['bedroomAm'],
      text:"Palm trees, blue sky, and somebody's sprinkler going tick-tick-tick. Day three. It already feels a little more normal.", ua:"Пальми, блакитне небо і чиясь поливалка: тік-тік-тік. День третій. Уже трохи звичніше." },
    { id:'s1-door', x:12, y:44, ph:[12, 46], icon:'🚪', label:'Listen at the door', bgs:['bedroomAm'],
      text:"Downstairs, Rachel is singing along to the radio. Somewhere down the hall, Alex's keyboard is clicking. Fast.", ua:"Унизу Рейчел підспівує радіо. Десь у кінці коридору клацає клавіатура Алекса. Швидко." }
  ],
  nodes:{
    open:  { type:'cards', cards:['LOS ANGELES · 8:45 AM','THE MILLER HOUSE','DAY 3 · MORNING'],
             title:{ eyebrow:'SEASON 1 · EPISODE 4', big:'MEET EMILY ☕', sub:'One coffee. A new friendship. And a little unexpected drama.' } },
    day:   act('startDay3'),
    n1:    narr("It's your third day in Los Angeles. Sunlight fills your room. Buddy is sleeping near your bed. Then your phone suddenly lights up.",
                "Твій третій день у Лос-Анджелесі. Кімнату заливає сонце. Бадді спить біля твого ліжка. Раптом засвічується телефон.", { cam:'drift' }),
    buzz:  { type:'notify', thread:'emily', text:"Hey! ☀️ Still up for coffee today?" },
    read:  { type:'phone', thread:'emily', steps:[
      { inFn: () => firstText(), id:'e4s1e1', vocab:'be-up-for' },
      { custom: phoneQuiz({ key:'s1_quiz', q:"What does Emily want?", qua:"Чого хоче Емілі?", options:[
          { text:"Meet for coffee at 11.", correct:true },
          { text:"Come to the Miller House.", hint:"Read it again: “a cute little place NEAR your house” — not AT your house. 🙂" },
          { text:"Meet tonight.", hint:"Look for the time in her message: “How about 11?” Does that sound like tonight?" } ],
        ua:"Вона пропонує зустрітися на каву об 11-й ранку в кав'ярні біля твого дому.", good:"Exactly — coffee at eleven!" }) },
      { reply:{ id:'e4s1r1', key:'emilyFirstReply', options:[
        { text:"Hey! Yeah, sounds great! See you at 11 😊", value:'yes' },
        { text:"Coffee sounds like exactly what I need 😂 See you!", value:'need' },
        { text:"Sure! What's the place called?", value:'name' } ] } },
      { id:'e4s1e2', inFn: f => ({ yes:"Yay!! 🎉 Okay — 11 it is. Get ready for the best iced latte of your life.",
                                   need:"Haha same 😂 I've been awake since 7. Coffee is basically my personality.",
                                   name:"It's called Corner Cup! ☕ Super cozy. Everyone around here goes there." })[f.emilyFirstReply] || "Yay! See you at 11! ☕" },
      { in:"Btw — have you tried any good coffee in LA yet? 👀", id:'e4s1e3' },
      { end:'Answer her out loud' } ] },
    sp1:   { type:'speak4', key:'s1_coffee', label:'Speaking moment', who:'emily',
             prompt:"Have you tried any good coffee in LA yet?", ua:"Ти вже куштував(-ла) якусь смачну каву в Лос-Анджелесі?",
             ctx:"Emily's question. Answer out loud — like a voice message.", ctxUa:"Запитання Емілі. Дай відповідь уголос — ніби записуєш голосове.",
             keywords:['not yet','I usually drink…','tea','iced coffee','hot chocolate'],
             starters:["Not yet, but I'd love to try…","Actually, I usually drink…","I'm more of a tea person."],
             model:"Not yet, but I'd love to try a real LA iced latte! Back home I usually drink tea.", secs:'10–20 seconds' },
    ph2:   { type:'phone', thread:'emily', steps:[
      { in:"Okay, noted! 📝 We'll fix that today.", id:'e4s1e4' },
      { custom: phonePin },
      { in:"Can't wait to finally grab a coffee! ☕", id:'e4s1e6', vocab:'grab-coffee' },
      { end:'See you at 11!' } ] },
    t2:    think("Eleven o'clock. Coffee. With someone my age. Okay… what do I wear?", "Одинадцята. Кава. З кимось мого віку. Так… що мені вдягти?"),
    use:   { type:'useful', title:'Useful English from Emily\'s texts', ids:['be-up-for','grab-coffee'] },
    end:   { type:'end', next:'s2' }
  } },

/* ---------------------------------------------------------------- SCENE 2 */
{ id:'s2', n:2, act:1, title:'Finding the Coffee Shop', emoji:'📍', objective:'Find Corner Cup', location:'Your street',
  bg:'street', ambience:'street', clock:'10:45 AM', cast:[],
  hotspots:[
    { id:'s2-books', x:74, y:48, ph:[62, 47], icon:'📚', label:'Look at the bookstore', bgs:['street'],
      text:"“Paper Moon Books”. A golden moon over the door, and shelves full of books behind the big window.", ua:"«Paper Moon Books». Золотий місяць над дверима і повні книжок полиці за великою вітриною." },
    { id:'s2-palm', x:22, y:20, ph:[24, 14], icon:'🌴', label:'Look up', bgs:['street'],
      text:"The palm trees here are SO tall. Their leaves rustle every time the wind blows. It sounds like the ocean.", ua:"Пальми тут ТАКІ високі. Їхнє листя шелестить від кожного подуву вітру. Звучить, як океан." },
    { id:'s2-lights', x:56, y:44, ph:[55, 36], icon:'🚦', label:'Look at the traffic lights', bgs:['street'],
      text:"The walk sign shows a little white person. In LA you cross only when it's on. Rachel told you that twice.", ua:"На світлофорі для пішоходів — білий чоловічок. У Лос-Анджелесі переходять тільки на нього. Рейчел казала це двічі." }
  ],
  nodes:{
    in:    narr("You leave the house a little early. The neighborhood looks different in the morning. People are walking their dogs, cars are passing by, and the air smells like fresh coffee.",
                "Ти виходиш з дому трохи раніше. Уранці район виглядає інакше. Люди вигулюють собак, проїжджають машини, у повітрі пахне свіжою кавою.", { cam:'drift' }),
    msg:   { type:'notify', thread:'emily', text:"It's on the corner, right across from a small bookstore. You can't miss it!" },
    mph:   { type:'phone', thread:'emily', steps:[
      { in:"It's on the corner, right across from a small bookstore. You can't miss it!", id:'e4s2e1', vocab:'cant-miss' },
      { end:'Look around' } ] },
    t1:    think("On the corner, across from a bookstore… Okay. But which corner? There are, like, four.", "На розі, навпроти книгарні… Гаразд. Але на якому розі? Їх тут, здається, чотири."),
    l0:    narr("A woman with a very fluffy dog is waiting at the crosswalk.", "На пішохідному переході чекає жінка з дуже пухнастим собакою.", { cast:['local@street'] }),
    ask:   { type:'choice', speak:true, prompt:"Ask her for directions:", ua:"Запитай у неї дорогу:", options:[
             { text:"Excuse me, do you know where the coffee shop is?", ua:"Перепрошую, ви не знаєте, де тут кав'ярня?" },
             { text:"Excuse me — is there a coffee shop near here? It's called Corner Cup.", ua:"Перепрошую, тут поблизу є кав'ярня? Вона називається Corner Cup." } ] },
    l1:    say('local4', "Corner Cup? Sure! Go straight, turn left at the traffic lights, and it's on the corner — right across from the bookstore. It's next to a little flower shop.",
                         "Corner Cup? Звісно! Ідіть прямо, на світлофорі поверніть ліворуч — і вона на розі, якраз навпроти книгарні. Поруч із маленькою квітковою крамничкою."),
    l2:    { type:'choice', speak:true, prompt:"Thank her:", ua:"Подякуй їй:", options:[
             { text:"Thank you so much!", ua:"Щиро дякую!" },
             { text:"Great — thanks for your help!", ua:"Чудово — дякую за допомогу!" } ] },
    l3:    say('local4', "No problem! Enjoy your coffee.", "Нема за що! Смачної кави.", { cast:[] }),
    route: { type:'route', key:'s2_route' },
    sp:    { type:'speak4', key:'s2_explain', label:'Speaking challenge', keepGame:true,
             prompt:"Explain how to get to the coffee shop.", ua:"Поясни, як дійти до кав'ярні.",
             ctx:"Imagine a friend is looking for Corner Cup. Use the map to explain the way.", ctxUa:"Уяви, що друг шукає Corner Cup. Поясни дорогу за мапою.",
             keywords:['go straight','turn left','at the traffic lights','on the corner','across from','next to'],
             starters:["First, go straight…","Then turn left at…","It's on the corner, across from…","It's next to…"],
             model:"Go straight to the traffic lights and turn left. The coffee shop is on the corner, across from the bookstore. It's next to a little flower shop — you can't miss it!",
             vocab:['cant-miss'], secs:'20–30 seconds' },
    msg2:  { type:'notify', thread:'emily', text:"I'm already here. No pressure, but I'm judging your coffee order 😂" },
    mph2:  { type:'phone', thread:'emily', steps:[
      { in:"I'm already here. No pressure, but I'm judging your coffee order 😂", id:'e4s2e2' },
      { reply:{ id:'e4s2r1', options:[ { text:"On my way! 🏃" }, { text:"Oh no. Now I'm nervous 😂" } ] } },
      { in:"Kidding!! …Mostly. 😇", id:'e4s2e3' },
      { end:'Go in' } ] },
    door:  { type:'door' },
    end:   { type:'end', next:'s3' }
  } },

/* ---------------------------------------------------------------- SCENE 3 */
{ id:'s3', n:3, act:1, title:'Can I Get a Latte?', emoji:'☕', objective:'Order your drink', location:'Corner Cup',
  bg:'cafe', ambience:'cafe', clock:'10:58 AM', cast:['emily@window'],
  hotspots:[
    { id:'s3-pastry', x:72, y:66, ph:[78, 61], icon:'🥐', label:'Look at the pastries', bgs:['cafe'],
      text:"Croissants, banana bread and one VERY big cinnamon roll. Later. Maybe.", ua:"Круасани, банановий хліб і одна ДУЖЕ велика булочка з корицею. Потім. Можливо." },
    { id:'s3-machine', x:40, y:52, ph:[26, 55], icon:'♨️', label:'Look at the espresso machine', bgs:['cafe'],
      text:"It hisses like a small dragon. The barista doesn't even flinch.", ua:"Вона шипить, як маленький дракон. Бариста навіть не здригається." },
    { id:'s3-board', x:56, y:20, ph:[66, 26], img: PHOTO_BASE + 'props/menu.webp', icon:'📋', label:'Read the menu board', bgs:['cafe'],
      text:"A handwritten chalk menu — with a tiny drawing next to every drink.", ua:"Меню, написане крейдою, — і біля кожного напою маленький малюнок." }
  ],
  nodes:{
    in:    narr("The coffee shop is warm and busy. You hear people talking, cups clinking and coffee machines working. Emily spots you from a table near the window.",
                "У кав'ярні тепло й людно. Чути розмови, дзенькіт чашок і кавомашини. Емілі помічає тебе від столика біля вікна.", { cam:'drift' }),
    e1:    say('emily', "Hey! You made it! Go grab something. I'll be right here.", "Привіт! Ти дійшов(-ла)! Іди візьми собі щось. Я буду тут.", { vocab:['grab-coffee'] }),
    y1:    { type:'choice', speak:true, prompt:"Say hi to Emily:", ua:"Привітайся з Емілі:", options:[
             { text:"Hey! It's so nice to finally meet you!", ua:"Привіт! Так приємно нарешті познайомитися!" },
             { text:"Hi! Okay — be right back!", ua:"Привіт! Окей — я зараз!" } ] },
    rel1:  act('rel', 'hello'),
    b0:    narr("You walk up to the counter. The barista looks up and smiles.", "Ти підходиш до прилавка. Бариста піднімає очі й усміхається.", { cast:['emily@window','barista@counter'], cam:'push' }),
    b1:    say('barista', "Hey there! What can I get started for you?", "Привіт! Що вам приготувати?"),
    menu:  { type:'order', key:'s3_menu' },
    t1:    think(f => `Okay. A ${shortOrder(coffee(f))}. I know what I want. Now I just have to SAY it.`, f => "Так. Я знаю, що хочу. Тепер треба це СКАЗАТИ."),
    o1:    { type:'speak4', key:'s3_o1', label:'Your turn — order your drink', who:'barista',
             prompt:"“What can I get started for you?”", ua:"«Що вам приготувати?»",
             ctx:"Tell the barista which drink you want. Size and milk come next.", ctxUa:"Скажи баристі, який напій хочеш. Розмір і молоко — далі.",
             keywords: f => [ (drinkOf(coffee(f)) || {}).word || 'iced latte', 'please' ],
             starters:["Can I get…?","I'd like…, please."],
             model: f => { const d = drinkOf(coffee(f)) || MENU[0]; return `Can I get ${d.a} ${d.word}, please?`; },
             vocab:['can-i-get','id-like'] },
    b2:    say('barista', "Sure thing! What size would you like?", "Звісно! Який розмір?"),
    o2:    { type:'speak4', key:'s3_o2', label:'Your turn', who:'barista', prompt:"“What size would you like?”", ua:"«Який розмір бажаєте?»",
             keywords:['small','medium','large'], starters:["Medium, please.","Can I get a large one?"],
             model: f => `${cap1(coffee(f).size || 'medium')}, please.` },
    b3:    say('barista', "And what kind of milk would you like? We have regular or oat.", "А яке молоко? У нас є звичайне або вівсяне.", { when: milkApplies }),
    o3:    { type:'speak4', key:'s3_o3', label:'Your turn', who:'barista', when: milkApplies, prompt:"“Regular or oat?”", ua:"«Звичайне чи вівсяне?»",
             keywords:['regular','oat'], starters:["Oat milk, please.","Regular is fine, thanks."],
             model: f => coffee(f).milk === 'oat' ? "Oat milk, please." : "Regular milk is fine, thanks." },
    b3t:   say('barista', "An iced tea — easy. No milk, right?", "Холодний чай — легко. Без молока, так?", { when: f => !milkApplies(f) }),
    o3t:   { type:'choice', speak:true, when: f => !milkApplies(f), prompt:"Answer the barista:", ua:"Дай відповідь баристі:", options:[
             { text:"Right — no milk, thanks.", ua:"Так — без молока, дякую." },
             { text:"Yes, just the tea, please.", ua:"Так, просто чай, будь ласка." } ] },
    b4:    say('barista', "Perfect. Anything else for you today?", "Чудово. Щось іще для вас сьогодні?", { vocab:['anything-else'] }),
    o4:    { type:'speak4', key:'s3_o4', label:'Your turn', who:'barista', prompt:"“Anything else for you today?”", ua:"«Щось іще для вас сьогодні?»",
             keywords:["that's all","thanks"], starters:["That's all, thanks.","No, that's it. Thank you!"], model:"That's all, thanks!", vocab:['thats-all'] },
    b5:    say('barista', "Can I get a name for the order?", "На яке ім'я записати замовлення?"),
    o5:    { type:'speak4', key:'s3_o5', label:'Your turn', who:'barista', prompt:"“Can I get a name for the order?”", ua:"«На яке ім'я записати замовлення?»",
             ctx:"New names are hard to hear in a busy café. Spelling it helps!", ctxUa:"У гамірній кав'ярні нове ім'я важко розчути. Допоможе, якщо назвеш його по літерах!",
             keywords:["It's…","spell it","O-K-S-A-N-A"], starters:["It's…","It's… — that's spelled…"],
             model: () => { const n = playerName(); return n ? `It's ${n}. That's ${n.toUpperCase().split('').join('-')}.` : "It's Oksana. That's O-K-S-A-N-A. (Say YOUR name!)"; } },
    b6:    say('barista', f => `Awesome. That'll be $${(drinkOf(coffee(f)) || MENU[0]).price}. You can tap your card right there.`,
                          f => `Чудово. З вас $${(drinkOf(coffee(f)) || MENU[0]).price}. Можете прикласти картку ось тут.`),
    pay:   narr("You tap your card. Beep. Done! You step to the side and wait for your drink.", "Ти прикладаєш картку. Біп. Готово! Ти відходиш убік і чекаєш на напій."),
    paid:  act('coffeePaid'),
    use:   { type:'useful', title:'Ordering like a local', ids:['can-i-get','id-like','anything-else','thats-all'], sentence:true },
    call:  say('barista', f => `One ${shortOrder(coffee(f))} for… ${cupName()}!`, () => `Напій для… ${cupName()}!`, { sfx:'ding' }),
    cup:   { type:'cup' },
    e2:    say('emily', "Wait… is that supposed to be your name? 😂", "Стоп… це мало бути твоє ім'я? 😂", { cast:['emily@near','barista@counter'] }),
    cr:    { type:'choice', key:'cupReply', prompt:"What do you say?", ua:"Що скажеш?", options:[
             { text:"Apparently, I have a new name now.", ua:"Схоже, тепер у мене нове ім'я.", emoji:'🤷', value:'newname', say:true, next:'cr1' },
             { text:"Not even close!", ua:"Навіть близько ні!", emoji:'😂', value:'notclose', say:true, next:'cr2' },
             { text:"Well, I guess that's my LA name.", ua:"Ну, мабуть, це моє лос-анджелеське ім'я.", emoji:'🌴', value:'laname', say:true, next:'cr3' } ] },
    cr1:   say('emily', () => `Ha! New city, new name. Nice to meet you, ${cupName()}. 😂`, () => `Ха! Нове місто — нове ім'я. Приємно познайомитися, ${cupName()}. 😂`, { next:'cr4' }),
    cr2:   say('emily', "Not even close? Okay, now I REALLY need to know how they got that.", "Навіть близько ні? Окей, тепер мені ДУЖЕ цікаво, як вони таке почули.", { next:'cr4' }),
    cr3:   say('emily', "Your LA name! Okay, that's going on my camera roll.", "Твоє лос-анджелеське ім'я! Окей, це я точно сфотографую.", { next:'cr4', sfx:'snap' }),
    cr4:   act('rel', 'joke'),
    sleeve:act('sleeve'),
    cr5:   say('emily', "Come on — the window table has the best light.", "Ходімо — за столиком біля вікна найкраще світло."),
    end:   { type:'end', next:'s4' }
  } },

/* ================================================================ ACT II */
/* ---------------------------------------------------------------- SCENE 4 */
{ id:'s4', n:4, act:2, title:'The First Five Minutes', emoji:'👋', objective:'Get to know Emily', location:'Corner Cup',
  bg:'window', ambience:'cafe', clock:'11:05 AM', cast:['emily@table','tableFg'],
  hotspots:[
    { id:'s4-camera', x:56, y:72, ph:[50, 86], icon:'📷', label:'Look at the camera', bgs:['window'],
      text:"Emily's old film camera — silver and black, on a worn leather strap. It looks older than both of you.", ua:"Стара плівкова камера Емілі — срібно-чорна, на потертому шкіряному ремінці. Здається, вона старша за вас обох." },
    { id:'s4-street', x:20, y:30, ph:[72, 32], icon:'🪟', label:'Look out of the window', bgs:['window'],
      text:"Across the street: Paper Moon Books and its golden moon. A little blue car rolls slowly past.", ua:"Через дорогу — Paper Moon Books із золотим місяцем. Повз повільно проїжджає маленька блакитна машинка." },
    { id:'s4-cup', x:28, y:66, ph:[21, 66], icon:'🥤', label:'Look at your cup', bgs:['window'],
      text:'', onOpen(h){ h.text = `Your drink. Your cup. And on it, in big black letters: “${cupName()}”. You're going to keep this cup forever.`; if(READY_PROPS.includes('table-cup')) return hotPop(h, 'table-cup'); }, ua:"Твій напій. Твоя чашка. А на ній великими чорними літерами — чуже ім'я. Ти зберігатимеш цю чашку вічно." }
  ],
  nodes:{
    in:    narr("You sit down across from Emily. Warm light falls on the table. Two drinks, one camera — and one very wrong name on your cup.",
                "Ти сідаєш навпроти Емілі. На стіл падає тепле світло. Два напої, одна камера — і одне дуже неправильне ім'я на твоїй чашці.", { cam:'drift' }),
    cm:    say('emily', f => orderComment(f)[0], f => orderComment(f)[1]),
    e1:    say('emily', "Okay, first of all — welcome to LA! How are your first few days going?", "Отже, по-перше — ласкаво просимо до Лос-Анджелеса! Як минають твої перші дні?"),
    s1:    { type:'speak4', key:'s4_days', label:'Your turn', who:'emily', prompt:"How are your first few days going?", ua:"Як минають твої перші дні?",
             keywords:['amazing','tiring','jet lag','so new','a little crazy'], starters:["It's been…","Honestly, it's…","The best part was…"],
             model:"Honestly, it's been amazing — but a little crazy. Everything is so new!", secs:'15–20 seconds' },
    e2:    say('emily', "That's a lot to take in. I mean, moving to a completely different country? That's huge.", "Це багато всього одразу. Тобто переїхати в зовсім іншу країну? Це ж величезна справа.", { vocab:['lot-to-take-in'] }),
    e3:    say('emily', "So, tell me something about yourself that I wouldn't guess.", "Тож розкажи мені про себе щось, чого я б не вгадала."),
    q1:    { type:'speak4', key:'s4_q1', speakPrompt:true, label:'Question 1 of 3', who:'emily', prompt:"What's something you really enjoy doing?", ua:"Що тобі дуже подобається робити?",
             keywords:['music','sports','drawing','gaming','reading','dancing'], starters:["I'm really into…","I spend a lot of time…"],
             model:"I'm really into music. I spend a lot of time playing guitar after school.", vocab:['really-into'], secs:'15–20 seconds',
             reactions:[
               { icon:'🎵', label:'Music', text:"No way! What kind of music? I need new songs for my photo walks.", ua:"Та ну! Яку музику? Мені потрібні нові пісні для фотопрогулянок." },
               { icon:'⚽', label:'Sports', text:"Okay, sporty! I'm the opposite. I get tired walking to the fridge. 😂", ua:"Окей, спортсмен(-ка)! А я навпаки. Втомлююся, поки дійду до холодильника. 😂" },
               { icon:'🎨', label:'Something creative', text:"That's actually really cool. You have to show me sometime.", ua:"Це справді круто. Ти маєш колись мені показати." },
               { icon:'🎮', label:'Games', text:"Ha! Alex would love you. Or… maybe he already does?", ua:"Ха! Алекс тебе полюбить. Або… може, вже?" },
               { icon:'💬', label:'Something else', text:"Wait, seriously? Okay, now I'm curious.", ua:"Стоп, серйозно? Окей, тепер мені цікаво." } ] },
    q2:    { type:'speak4', key:'s4_q2', speakPrompt:true, label:'Question 2 of 3', who:'emily', prompt:"What surprised you most about LA?", ua:"Що тебе найбільше здивувало в Лос-Анджелесі?",
             keywords:['huge','traffic','palm trees','friendly people','sunny','the food'], starters:["I didn't expect…","I was surprised by…"],
             model:"I was surprised by how huge everything is. I didn't expect so many palm trees!", secs:'15–20 seconds',
             reactions:[
               { icon:'🏙️', label:'How big it is / traffic', text:"Right?! Everything is like forty minutes away. Minimum.", ua:"Правда?! До всього хвилин сорок. Мінімум." },
               { icon:'🌴', label:'Weather / palm trees', text:"Honestly, I still love the palm trees too. And I've been here forever.", ua:"Чесно, я теж досі обожнюю пальми. А я тут уже цілу вічність." },
               { icon:'🙂', label:'The people', text:"Aw. LA gets a bad reputation, but people are actually pretty nice.", ua:"О-о. Про Лос-Анджелес кажуть усяке, але люди тут насправді досить милі." },
               { icon:'🌮', label:'The food', text:"Okay, the food here is a whole thing. I'm making you a list.", ua:"Окей, їжа тут — то окрема історія. Я складу тобі список." },
               { icon:'💬', label:'Something else', text:"Wait, seriously? I never thought about that.", ua:"Стоп, серйозно? Я ніколи про це не думала." } ] },
    q3:    { type:'speak4', key:'s4_q3', speakPrompt:true, label:'Question 3 of 3', who:'emily', prompt:"What's something you miss about home?", ua:"За чим ти сумуєш з дому?",
             keywords:['my family','my friends','the food','my room','my city'], starters:["I really miss…","I wish I could…"],
             model:"I really miss my family and my best friend, Mia. I wish I could eat my grandma's varenyky right now!", secs:'15–20 seconds',
             reactions:[
               { icon:'👨‍👩‍👧', label:'Family / friends', text:"That makes sense. Honestly, that must be the hardest part.", ua:"Розумію. Чесно, це, мабуть, найважче." },
               { icon:'🥟', label:'The food', text:"Okay, you HAVE to tell me about the food. I'm writing it down.", ua:"Окей, ти МУСИШ розповісти мені про їжу. Я записую." },
               { icon:'🏘️', label:'A place', text:"I'd love to see photos of it sometime.", ua:"Я б із радістю колись побачила фото." },
               { icon:'💬', label:'Something else', text:"I get that. That's a big thing to miss.", ua:"Розумію. За таким справді сумуєш." } ] },
    relp:  act('rel', 'personal'),
    tw:    say('emily', "Okay, enough about you. Just kidding! Now you have to ask me something.", "Окей, досить про тебе. Жартую! Тепер ти маєш мене про щось запитати.", { vocab:['what-about-you'] }),
    ask:   { type:'askq', key:'s4_ask', min:2, bank:['weekends','always','favorite','jake'], title:'Ask Emily — at least 2 questions' },
    jk:    say('emily', "Why? Did he say something about me? …Actually, don't answer that. 😂", "А що? Він щось про мене казав? …Хоча ні, не відповідай. 😂", { when: f => !!f.askedJake }),
    end:   { type:'end', next:'s5' }
  } },

/* ---------------------------------------------------------------- SCENE 5 */
{ id:'s5', n:5, act:2, title:'More Than Small Talk', emoji:'🌴', objective:'Choose a place in LA', location:'Corner Cup',
  bg:'window', ambience:'cafe', clock:'11:20 AM', cast:['emily@camera','tableFg'],
  hotspots:[],
  nodes:{
    in:    narr("Emily takes out her camera and starts scrolling through her photos.", "Емілі дістає камеру й гортає свої фотографії.", { cam:'push' }),
    e0:    say('emily', "Okay, don't judge. Actually — judge. I need opinions.", "Окей, не суди строго. Хоча ні — суди. Мені потрібні думки."),
    e1:    say('emily', "So here's my theory. You haven't really experienced LA until you've seen it from three completely different places.", "Отже, у мене є теорія. Ти по-справжньому не побачиш Лос-Анджелес, доки не подивишся на нього з трьох зовсім різних місць."),
    y1:    say('you', "Which places?", "Яких місць?"),
    e2:    say('emily', "The beach, the hills, and somewhere totally random.", "Пляж, пагорби — і якесь зовсім випадкове місце."),
    gal:   { type:'gallery', key:'s5_place' },
    br:    { type:'branch', fn: f => ({ beach:'rb', hills:'rh', hidden:'rx' })[f.preferredLAPlace] || 'rb' },
    rb:    say('emily', "Good choice! The sunset there is amazing. I could literally spend hours just walking around.", "Гарний вибір! Захід сонця там неймовірний. Я можу годинами просто гуляти.", { next:'relc' }),
    rh:    say('emily', "Okay, now we're talking! The views are incredible, especially in the evening.", "О, оце розмова! Краєвиди неймовірні, особливо ввечері.", { next:'relc' }),
    rx:    say('emily', "Oh, I like that answer. Most people always pick the beach. I know a few secret spots!", "О, мені подобається ця відповідь. Більшість завжди обирає пляж. Я знаю кілька секретних місць!", { next:'relc' }),
    relc:  act('rel', 'common'),
    sp:    { type:'speak4', key:'s5_convince', label:'Speaking challenge', who:'emily', timer:45,
             prompt:"Convince Emily that your choice is the best!", ua:"Переконай Емілі, що твій вибір — найкращий!",
             ctx: f => `You picked ${PLACE[f.preferredLAPlace] || PLACE.beach}. Give Emily at least two reasons.`, ctxUa:"Наведи Емілі щонайменше дві причини.",
             keywords: f => ({ beach:['the ocean','sunset','relax','the pier','swim'], hills:['the view','the whole city','hike','at night','lights'],
                               hidden:['unusual','quiet','no tourists','local','a secret'] })[f.preferredLAPlace] || ['the ocean','sunset'],
             starters:["I'd rather visit… because…","I've always wanted to…","It seems like a great place to…","What about you?"],
             model: f => ({ beach:"I'd rather visit the beach because I love the ocean. I've always wanted to watch a sunset over the Pacific. It seems like a great place to relax. What about you?",
                            hills:"I'd rather visit the hills because you can see the whole city. I've always wanted to see LA at night with all the lights. What about you?",
                            hidden:"I'd rather visit a hidden spot because it's quiet and there are no tourists. It seems like a great place to see the real LA. What about you?" })[f.preferredLAPlace] || "I've always wanted to see the ocean. What about you?",
             vocab:['always-wanted','what-about-you'], secs:'30–45 seconds',
             reactions:[
               { icon:'😄', label:'Emily is convinced', text:"Okay, okay — you win. I'm convinced!", ua:"Окей, окей — ти переміг(-ла). Я переконана!" },
               { icon:'🤔', label:'Emily isn\'t sure yet', text:"Hmm… good points. I'm not saying you're right. But I'm not saying you're wrong. 😄", ua:"Хм… слушні аргументи. Я не кажу, що ти правий(-а). Але й не кажу, що ні. 😄" },
               { icon:'❓', label:'You asked “What about you?”', text:"Me? Honestly — the beach. Every single time. But I'm open to being convinced.", ua:"Я? Чесно — пляж. Щоразу. Але мене можна переконати." } ] },
    e4:    say('emily', f => ({ beach:"Deal. Beach first.", hills:"Deal — hills first. Bring good shoes.", hidden:"Deal. Secret spots first. I'll make a list." })[f.preferredLAPlace] || "Deal.",
                        f => ({ beach:"Домовились. Спершу пляж.", hills:"Домовились — спершу пагорби. Взувай зручне.", hidden:"Домовились. Спершу секретні місця. Я складу список." })[f.preferredLAPlace] || "Домовились."),
    end:   { type:'end', next:'s6' }
  } },

/* ---------------------------------------------------------------- SCENE 6 */
{ id:'s6', n:6, act:2, title:'The Jake Situation', emoji:'🤔', objective:'React naturally', location:'Corner Cup',
  bg:'windowQuiet', ambience:'cafe', clock:'11:35 AM', cast:['emily@table','tableFgPhone'],
  hotspots:[
    { id:'s6-phone', x:56, y:72, ph:[26, 80], icon:'📱', label:'Look at your phone', bgs:['windowQuiet'],
      text:"Face up, next to the cups. The screen is dark. For now.", ua:"Екраном догори, біля чашок. Екран темний. Поки що.",
      onOpen(h){ if(READY_PROPS.includes('table-phone')) return hotPop(h, 'table-phone'); } }
  ],
  nodes:{
    in:    narr("The coffee shop gets a little quieter. The lunch rush hasn't started yet. Your phone is lying next to the cups.", "У кав'ярні стає трохи тихіше. Обідній наплив ще не почався. Твій телефон лежить біля чашок.", { cam:'drift' }),
    e1:    say('emily', "So, have you met many people here yet?", "То що, ти вже з багатьма тут познайомився(-лася)?"),
    sp1:   { type:'speak4', key:'s6_people', label:'Your turn', who:'emily', prompt:"Have you met many people here yet?", ua:"Ти вже з багатьма тут познайомився(-лася)?",
             ctx:"Tell Emily about the Millers — and the other people you've met.", ctxUa:"Розкажи Емілі про Міллерів — і про інших людей, з якими ти познайомився(-лася).",
             keywords:['the Millers','Rachel and David','Alex','Buddy','Jake'], starters:["I'm staying with…","Their son is…","I also met a guy called…"],
             model:"I'm staying with the Millers — Rachel, David and their son, Alex. And Buddy, the dog! Oh, and I met a guy called Jake on my first night.", secs:'20–30 seconds' },
    e2:    say('emily', f => f.askedJake ? "Wait — so THAT's why you asked about Jake! You know him?" : "Wait. You know Jake?",
                        f => f.askedJake ? "Стоп — то ОСЬ чому ти питав(-ла) про Джейка! Ти його знаєш?" : "Стоп. Ти знаєш Джейка?"),
    y2:    { type:'choice', speak:true, prompt:"Answer Emily:", ua:"Відповідай Емілі:", options:[
             { text:"Yeah! We met at a diner on my first night.", ua:"Так! Ми познайомилися в дайнері першого ж вечора.", when: () => ep2Done() },
             { text:"Yeah, we met on my first night here.", ua:"Так, ми познайомилися першого ж вечора.", when: () => !ep2Done() },
             { text:"Kind of. He texted me last night — he knew we were meeting today. 😂", ua:"Типу того. Він написав мені вчора — знав, що ми сьогодні зустрічаємося. 😂", when: () => ep3Done() },
             { text:"Kind of. He's… very friendly. 😂", ua:"Типу того. Він… дуже товариський. 😂", when: () => !ep3Done() } ] },
    e3:    say('emily', "Oh, this is getting interesting.", "О, стає цікаво."),
    y3:    say('you', "What do you mean?", "Що ти маєш на увазі?"),
    e4:    say('emily', "Let's just say Jake has a talent for making things complicated.", "Скажімо так: у Джейка талант усе ускладнювати."),
    e5:    say('emily', "And you're staying with Alex Miller? Wow. Small world.", "А ти живеш в Алекса Міллера? Ого. Тісний світ.", { vocab:['small-world'] }),
    rx:    { type:'choice', key:'jakeReaction', prompt:"How do you react?", ua:"Як ти реагуєш?", options:[
             { text:"Wait, do you know Alex too?", ua:"Стоп, ти й Алекса знаєш?", emoji:'🤔', value:'curious', say:true, next:'rc' },
             { text:"What happened between Jake and Alex?", ua:"Що сталося між Джейком і Алексом?", emoji:'🎯', value:'direct', say:true, next:'rd' },
             { text:"Sounds like there's a story there.", ua:"Схоже, тут є якась історія.", emoji:'🫣', value:'careful', say:true, next:'rk' } ] },
    rc:    say('emily', "Kind of. We had a couple of classes together. He's quiet, but he's actually really smart.", "Типу того. У нас було кілька спільних уроків. Він тихий, але насправді дуже розумний.", { next:'c1' }),
    rd:    say('emily', "Whoa — straight to the point! Okay…", "Ого — одразу до суті! Гаразд…", { next:'c1' }),
    rk:    say('emily', "Yeah. There kind of is.", "Ага. Щось таке є.", { next:'c1' }),
    c1:    say('emily', "They used to be really close. Like, best-friend close. Then something happened last year. I wasn't there when it started, so I don't know the whole story.",
                        "Вони були дуже близькі. Ну, прямо найкращі друзі. А торік щось сталося. Мене там не було, коли все почалося, тож я не знаю всієї історії."),
    c2:    say('emily', "Anyway, that's their story to tell. You'll figure it out.", "Хай там як, це їхня історія — їм і розповідати. Ти розберешся."),
    buzz:  { type:'notify', thread:'jake', text:"Soooo… how's coffee with Emily going? 👀" },
    jph:   { type:'phone', thread:'jake', steps:[
      { in:"Soooo… how's coffee with Emily going? 👀", id:'e4s6j1' },
      { end:'Put the phone down' } ] },
    e6:    say('emily', "Of course he texts you right now.", "Ну звісно, він пише тобі саме зараз.", { cam:'push' }),
    sp2:   { type:'speak4', key:'s6_react', label:'React out loud!', who:'emily',
             prompt:"Jake just texted — in the middle of THIS conversation. React!", ua:"Джейк написав якраз посеред ЦІЄЇ розмови. Відреагуй!",
             ctx:"Say what you really think. Short is fine!", ctxUa:"Скажи, що думаєш насправді. Можна коротко!",
             keywords:["Seriously?","That's awkward.","I had no idea.","Now I'm curious."],
             starters:["Seriously? He…","That's awkward, because…","I had no idea that…","Now I'm curious about…"],
             model:"Seriously? That's so awkward! I had no idea they used to be best friends. Now I'm curious.", vocab:['thats-awkward'], secs:'10–20 seconds' },
    fu:    { type:'choice', key:'jakeFollowUp', prompt:"What do you do next?", ua:"Що робиш далі?", options:[
             { text:"Ask another question", ua:"Поставити ще одне запитання", emoji:'🙋', value:'ask', next:'fa1' },
             { text:"Make a joke", ua:"Пожартувати", emoji:'😄', value:'joke', next:'fj1' },
             { text:"Change the subject", ua:"Змінити тему", emoji:'🔄', value:'change', next:'fc1' } ] },
    fa1:   say('you', "Can I ask one more thing? Is Jake… a good guy?", "Можна ще одне питання? Джейк… він нормальний?"),
    fa2:   say('emily', "Honestly? Yeah. He's funny and loyal. He just doesn't always think before he talks. Like right now.", "Чесно? Так. Він смішний і вірний. Просто не завжди думає, перш ніж говорить. Як от зараз.", { next:'fz' }),
    fj1:   say('you', "Should I tell him you said hi? 😂", "Може, передати йому від тебе привіт? 😂"),
    fj2:   say('emily', "Don't you dare. 😂 Okay — tell him the coffee is amazing. That'll annoy him.", "Тільки спробуй. 😂 Окей — скажи йому, що кава неймовірна. Його це роздратує.", { next:'fz' }),
    fc1:   say('you', "Anyway… can I see more of your photos?", "Хай там як… можна ще подивитися твої фото?"),
    fc2:   say('emily', "Smooth. I like it. 😂 Here — this one's from last weekend.", "Елегантно. Мені подобається. 😂 Ось — це з минулих вихідних.", { next:'fz' }),
    fz:    act('jakeSave'),
    use:   { type:'useful', title:'Useful English', ids:['small-world','thats-awkward'] },
    end:   { type:'end', next:'s7' }
  } },

/* ================================================================ ACT III */
/* ---------------------------------------------------------------- SCENE 7 */
{ id:'s7', n:7, act:3, title:'An Unexpected Invitation', emoji:'🌊', objective:'Answer the invitation', location:'Outside the café',
  bg:'outside', ambience:'street', clock:'11:55 AM', cast:['emily@out'],
  hotspots:[
    { id:'s7-cat', x:84, y:46, ph:[85.5, 48], icon:'🐈', label:'Look at the bookstore window', bgs:['outside'],
      text:"An orange cat in the bookstore window — oh wait, it's a sticker. It still looks like it's judging you.", ua:"Рудий кіт у вітрині книгарні — а, ні, це наліпка. Але все одно дивиться так, ніби тебе оцінює." },
    { id:'s7-sun', x:50, y:12, ph:[88, 9], icon:'☀️', label:'Look at the sky', bgs:['outside'],
      text:"Not one cloud. It's almost noon, and the sidewalk is already warm under your shoes.", ua:"Жодної хмаринки. Майже полудень, і тротуар під ногами вже теплий." }
  ],
  nodes:{
    in:    narr("Outside, the sun is bright. Palm trees, a little yellow car — and an orange cat on the bookstore window.", "Надворі яскраво світить сонце. Пальми, маленька жовта машинка — і рудий кіт на вітрині книгарні.", { cam:'drift' }),
    e1:    say('emily', "Okay, I have to go soon. But honestly? This was fun.", "Окей, мені скоро треба йти. Але чесно? Було класно."),
    y1:    { type:'choice', speak:true, prompt:"Answer Emily:", ua:"Відповідай Емілі:", options:[
             { text:"Me too! Thanks for showing me this place.", ua:"Мені теж! Дякую, що показала це місце." },
             { text:"Same! Best first coffee in LA.", ua:"Аналогічно! Найкраща перша кава в Лос-Анджелесі." } ] },
    e2:    say('emily', "You know what? We should do something this weekend.", "Знаєш що? Нам треба кудись вибратися на цих вихідних."),
    y2:    { type:'choice', speak:true, prompt:"Answer Emily:", ua:"Відповідай Емілі:", options:[
             { text:"Yeah? Like what?", ua:"Так? Наприклад?" },
             { text:"I'd love that! What did you have in mind?", ua:"Із задоволенням! Що ти маєш на думці?" } ] },
    e3:    say('emily', "A few friends might be going to Santa Monica. Nothing fancy. Just the beach, some food, maybe the pier.", "Кілька друзів, можливо, поїдуть у Санта-Моніку. Нічого особливого. Просто пляж, щось поїсти, може, пірс."),
    e3b:   say('emily', f => ({ beach:"And you said you love the ocean — so, perfect timing.", hills:"I know, I know — you picked the hills. Beach first, hills next time. Deal?",
                                hidden:"And there's a secret spot near the pier I'll show you. Promise." })[f.preferredLAPlace] || "Perfect timing, right?",
                        f => ({ beach:"А ти ж казав(-ла), що любиш океан, — тож якраз вчасно.", hills:"Знаю, знаю — ти обрав(-ла) пагорби. Спершу пляж, пагорби наступного разу. Домовились?",
                                hidden:"А біля пірса є секретне місце — я тобі покажу. Обіцяю." })[f.preferredLAPlace] || "Якраз вчасно, правда?"),
    e4:    say('emily', "You should come!", "Тобі варто поїхати з нами!"),
    inv:   { type:'choice', key:'beachInvitationResponse', prompt:"What do you say?", ua:"Що скажеш?", options:[
             { text:"That sounds amazing! Count me in!", ua:"Звучить неймовірно! Я з вами!", emoji:'🤩', value:'enthusiastic', say:true, vocab:['count-me-in'], next:'ia' },
             { text:"Sounds fun! Who else is coming?", ua:"Звучить весело! А хто ще буде?", emoji:'🤔', value:'curious', say:true, next:'ib' },
             { text:"I'd love to, but I need to check my plans first.", ua:"Я б із радістю, але спершу треба перевірити мої плани.", emoji:'📅', value:'careful', say:true, next:'ic' } ] },
    ia:    say('emily', "Yes! Okay, this is going to be so fun. I'll keep you posted!", "Так! Окей, буде дуже весело. Я триматиму тебе в курсі!", { vocab:['keep-me-posted'], next:'iz' }),
    ib:    say('emily', "Well, me, probably Jake, a couple of other people… and maybe Alex, if he actually leaves his room for once.", "Ну, я, мабуть, Джейк, ще кілька людей… і, може, Алекс, якщо він хоч раз вийде зі своєї кімнати."),
    ib2:   narr("Emily pauses.", "Емілі на мить замовкає."),
    ib3:   say('emily', "Actually… that could get interesting. I'll keep you posted!", "Хоча… це може бути цікаво. Я триматиму тебе в курсі!", { vocab:['keep-me-posted'], next:'iz' }),
    ic:    say('emily', "Totally. Ask Rachel and David — and keep me posted!", "Звісно. Запитай у Рейчел і Девіда — і тримай мене в курсі!", { vocab:['keep-me-posted'] }),
    iz:    act('rel', 'plans'),
    q:     { type:'askq', key:'s7_ask', min:2, plan:true, bank:['time','where','bring','how'], title:'Ask about the plan — at least 2 questions' },
    note:  think("So: the beach, maybe the pier, maybe Jake… maybe Alex. Nothing is decided yet. Emily will text the details.", "Отже: пляж, може, пірс, може, Джейк… може, Алекс. Нічого ще не вирішено. Емілі напише подробиці."),
    e5:    say('emily', "Ugh — my mom just texted. She's running ten minutes late.", "Ох — мама щойно написала. Вона спізнюється на десять хвилин."),
    e6:    say('emily', "Wanna go back inside? It's way too hot out here.", "Повернемося всередину? Тут надто спекотно."),
    end:   { type:'end', next:'s8' }
  } },

/* ---------------------------------------------------------------- SCENE 8 */
{ id:'s8', n:8, act:3, title:'Your First Real Hangout', emoji:'🎙️', objective:'Final speaking mission', location:'Corner Cup',
  bg:'window', ambience:'cafe', clock:'12:05 PM', cast:['emily@table','tableFg'],
  hotspots:[],
  nodes:{
    in:    narr("Back at the window table. The ice in your drink is melting, and Emily has her “one more question” face on.", "Знову за столиком біля вікна. Лід у напої тане, а в Емілі на обличчі вираз «ще одне питання».", { cam:'push' }),
    final: { type:'final4', key:'final' },
    rw:    { type:'reward', banner:'YOUR FIRST REAL HANGOUT! 🎙️', sub:'You had a real conversation in English — and made a friend.', achievement:['confidence','friend'] },
    bye:   say('emily', "Okay, NOW I really have to go. Bye! Say hi to Buddy for me!", "Окей, ТЕПЕР мені справді треба йти. Бувай! Передавай привіт Бадді!"),
    /* the cliffhanger — back at the Miller house */
    home:  narr("For the first time since arriving in Los Angeles, the city feels a little less unfamiliar.", "Уперше відтоді, як ти приїхав(-ла) до Лос-Анджелеса, місто здається трохи менш чужим.",
                { bg:'bedroomPm', clock:'4:30 PM', where:'Miller House', cast:['buddy@sleep'], amb:'home', cam:'wide' }),
    home2: narr("You have a new friend. A possible weekend adventure. And a few unanswered questions.", "У тебе є нова подруга. Можлива пригода на вихідних. І кілька запитань без відповіді."),
    n1:    { type:'notify', thread:'emily', text:"Had fun today! ☕🌴 I'll send you the details for the beach." },
    p1:    { type:'phone', thread:'emily', steps:[
      { in:"Had fun today! ☕🌴 I'll send you the details for the beach. Also… don't believe everything Jake tells you 😂", id:'e4s9e1' },
      { reply:{ id:'e4s9r1', options:[ { text:"Had so much fun too! See you soon 😊" }, { text:"Haha noted 😂 Thanks for today!" } ] } },
      { end:'Put the phone down' } ] },
    pause: { type:'fx', wait:1500, sfx:'soft' },
    n2:    { type:'notify', thread:'jake', text:"Emily invited you to the beach, didn't she?" },
    p2:    { type:'phone', thread:'jake', steps:[
      { in:"Emily invited you to the beach, didn't she? Just a heads-up… Alex might be there.", id:'e4s9j1' },
      { end:'…' } ] },
    cliff: narr("Jake. Alex. The beach. What happened between them last year?", "Джейк. Алекс. Пляж. Що ж сталося між ними торік?", { sfx:'mystery', cam:'push' }),
    done:  { type:'complete' }
  } }
];

/* =========================================================================
   SCENE ART
   -------------------------------------------------------------------------
   A drawn (SVG) version of every place, in one consistent look: the same
   guest room as the Episode 3 photos (white double door, shelf with a plant,
   bed with a blue throw, desk under the window), the same café across from
   Paper Moon Books, warm California light. People are back-lit figures,
   like in the earlier drawn scenes — Emily always has the same long wavy
   brown hair, cream top, light jeans and her film camera.

   ▶ Real photos: save a 16:9 .webp (1672×941) in episodes/episode-04/photos/
     with the name from photos/ASSET-PROMPTS.md and add its key to
     READY_PHOTOS. Until then the drawing is shown — nothing breaks, and no
     image path is requested that doesn't exist. Photos have no people in
     them: Emily, the barista and the neighbor are cut-outs on top
     (photos/cast/, see PH_CAST), also only once they are in READY_CAST.
   ========================================================================= */
const PHOTO_SLOTS = {
  bedroomAm:'s1-bedroom-morning.webp', street:'s2-neighborhood-street.webp', cafe:'s3-cafe-counter.webp',
  window:'s4-cafe-window-table.webp', windowQuiet:'s6-cafe-window-quiet.webp', outside:'s7-cafe-outside.webp',
  bedroomPm:'s9-bedroom-afternoon.webp'
};
/* keys of PHOTO_SLOTS whose file has been added to photos/ (empty = drawn scenes everywhere) */
const READY_PHOTOS = ['bedroomAm', 'street', 'cafe', 'window', 'windowQuiet', 'outside', 'bedroomPm'];
const PHOTOS = Object.fromEntries(READY_PHOTOS.filter(k => PHOTO_SLOTS[k]).map(k => [k, PHOTO_SLOTS[k]]));
/* cut-outs in photos/cast/ that exist (transparent .webp): emily, emily-camera, emily-full, barista, neighbor */
const READY_CAST = ['emily', 'emily-camera', 'emily-wave', 'barista', 'buddy', 'emily-seated', 'emily-outside'];
/* Emily's face for the dialogue, the phone and People (photos/avatars/emily.webp, 256×256) — add 'emily' when it exists */
const READY_AVATARS = ['emily', 'barista'];
/* the three photos in Emily's camera (photos/gallery/*.webp, 4:3) — add the keys that exist */
const READY_GALLERY = ['beach', 'hills', 'hidden'];
/* props in photos/props/: the cup (transparent, the name is written on it by the game) and the menu board */
const READY_PROPS = ['cup', 'menu', 'table-cup', 'table-phone', 'route-map', 'pin-card'];

const VIG = (u, o = .5) => `<radialGradient id="${u}vig" cx="50%" cy="50%" r="75%"><stop offset="55%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="${o}"/></radialGradient>`;
const vigRect = u => `<rect width="1600" height="900" fill="url(#${u}vig)"/>`;
const beams = (pts, op = .16, c = '#fff4d2') => `<g class="ep4-beam">${pts.map(p => `<polygon points="${p}" fill="${c}" opacity="${op}"/>`).join('')}</g>`;
const cloud = (x, y, s, o = .9) => `<g opacity="${o}"><ellipse cx="${x}" cy="${y}" rx="${70*s}" ry="${22*s}" fill="#fff"/><ellipse cx="${x - 40*s}" cy="${y + 6*s}" rx="${44*s}" ry="${18*s}" fill="#fff"/><ellipse cx="${x + 30*s}" cy="${y - 12*s}" rx="${42*s}" ry="${24*s}" fill="#fff"/></g>`;
const leafy = (x, y, r, c = '#4f8a4f', hi = '#6aa864') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/><circle cx="${x - r*.8}" cy="${y + r*.25}" r="${r*.72}" fill="${c}"/><circle cx="${x + r*.8}" cy="${y + r*.25}" r="${r*.7}" fill="${c}"/><circle cx="${x - r*.2}" cy="${y - r*.35}" r="${r*.55}" fill="${hi}" opacity=".6"/>`;
function car(x, y, s, c){
  return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-120 0 L-110 -38 Q-96 -54 -60 -58 L-34 -92 Q-24 -102 10 -102 L58 -102 Q80 -100 92 -84 L112 -58 Q132 -54 136 -36 L138 0Z" fill="${c}"/>
    <path d="M-26 -88 L4 -88 L4 -60 L-50 -60Z M14 -88 L56 -88 Q70 -86 80 -72 L88 -60 L14 -60Z" fill="#cfe3f0" opacity=".85"/>
    <rect x="-128" y="-16" width="272" height="10" rx="5" fill="#2a2a2e" opacity=".5"/>
    <circle cx="-70" cy="0" r="26" fill="#1f2025"/><circle cx="-70" cy="0" r="11" fill="#9aa3ad"/><circle cx="84" cy="0" r="26" fill="#1f2025"/><circle cx="84" cy="0" r="11" fill="#9aa3ad"/></g>`;
}
function plant(x, base, s){
  return `<g transform="translate(${x} ${base}) scale(${s})"><path d="M-40 0 L-32 -70 L32 -70 L40 0Z" fill="#c9784a"/><rect x="-36" y="-80" width="72" height="14" rx="4" fill="#b2653c"/>
    ${[[-50,-170,-20],[0,-210,0],[46,-180,25],[-70,-120,-40],[70,-130,40]].map(([lx, ly, r]) => `<path d="M0 -76 Q${lx * .4} ${ly * .55} ${lx} ${ly}" stroke="#3f7a40" stroke-width="5" fill="none"/><ellipse cx="${lx}" cy="${ly}" rx="38" ry="20" transform="rotate(${r - 30} ${lx} ${ly})" fill="#4f8f4c"/>`).join('')}</g>`;
}

/* ---------- the guest room at the Millers' (same layout as the Episode 3 photos) ---------- */
function room(u, mode){
  const pm = mode === 'pm';
  const skyTop = pm ? '#79b6e2' : '#8ccbf0', skyBot = pm ? '#fde3bb' : '#e8f5fb';
  return svg(`
    <rect width="1600" height="900" fill="url(#${u}wall)"/>
    <rect x="0" y="790" width="1600" height="110" fill="url(#${u}floor)"/>
    ${[0,1,2,3,4,5,6,7].map(i => `<line x1="${i * 230}" y1="790" x2="${i * 230 - 60}" y2="900" stroke="#6e4528" stroke-width="2" opacity=".35"/>`).join('')}
    <rect x="0" y="776" width="1600" height="16" fill="#efe8dc"/>
    <!-- double door -->
    <rect x="52" y="140" width="318" height="642" fill="#e9e1d4"/><rect x="62" y="150" width="298" height="632" fill="#f8f4ed"/>
    <line x1="211" y1="150" x2="211" y2="782" stroke="#d9cfc0" stroke-width="3"/>
    ${[[80,180],[228,180]].map(([dx, dy]) => `<rect x="${dx}" y="${dy}" width="114" height="250" rx="4" fill="none" stroke="#e2d8c8" stroke-width="3"/><rect x="${dx}" y="${dy + 290}" width="114" height="270" rx="4" fill="none" stroke="#e2d8c8" stroke-width="3"/>`).join('')}
    <circle cx="198" cy="460" r="7" fill="#c9a24a"/><circle cx="224" cy="460" r="7" fill="#c9a24a"/>
    <!-- shelf, plant, little sunset photo -->
    <rect x="372" y="226" width="410" height="16" rx="3" fill="#7f5232"/>
    <rect x="410" y="176" width="44" height="50" rx="6" fill="#f2efe8"/>
    ${[[426,250],[414,300],[432,350],[404,404],[440,440]].map(([lx, ly], i) => `<ellipse cx="${lx}" cy="${ly}" rx="16" ry="10" transform="rotate(${i % 2 ? 30 : -30} ${lx} ${ly})" fill="#4f8f4c"/>`).join('')}
    <path d="M430 190 Q400 300 420 450" stroke="#3f7a40" stroke-width="3" fill="none"/>
    ${[[400,170],[454,168],[384,196]].map(([lx, ly]) => `<ellipse cx="${lx}" cy="${ly}" rx="18" ry="11" fill="#5aa056"/>`).join('')}
    <rect x="560" y="168" width="84" height="58" fill="#f2efe8" stroke="#8a6a4e" stroke-width="5"/><rect x="568" y="176" width="68" height="42" fill="url(#${u}mini)"/>
    <rect x="680" y="190" width="28" height="36" rx="4" fill="#3f5f86"/>
    <!-- window -->
    <rect x="1010" y="88" width="540" height="420" fill="url(#${u}sky)"/>
    ${cloud(1150, 170, .8, .8)}
    <path d="M1010 470 Q1150 440 1300 462 T1550 452 L1550 508 L1010 508Z" fill="#6a8f60"/>
    ${palm(1180, 520, 330, pm ? '#3a5a3a' : '#2f5a3a', 14)}${palm(1450, 520, 250, pm ? '#3a5a3a' : '#2f5a3a', -10)}
    <rect x="996" y="76" width="568" height="444" fill="none" stroke="#f6f2ea" stroke-width="26"/><rect x="1272" y="88" width="14" height="420" fill="#f6f2ea"/>
    ${pm ? beams(['1010,120 1270,120 820,790 380,790', '1290,120 1550,120 1180,790 840,790'], .13, '#ffe0a8')
         : beams(['1010,100 1270,100 1100,790 640,790', '1290,100 1550,100 1520,790 1140,790'], .12)}
    <!-- desk + phone -->
    <rect x="990" y="560" width="580" height="20" rx="4" fill="#7f5232"/>
    <rect x="1010" y="580" width="18" height="200" fill="#6b4529"/><rect x="1532" y="580" width="18" height="200" fill="#6b4529"/>
    <rect x="1440" y="508" width="34" height="52" rx="4" fill="#efe8dc"/>${[0,1,2].map(i => `<line x1="${1448 + i * 9}" y1="508" x2="${1446 + i * 10}" y2="486" stroke="#3a2a20" stroke-width="3"/>`).join('')}
    ${pm ? '' : `<g class="ep4-glow"><rect x="1190" y="532" width="64" height="26" rx="5" fill="#1d2230"/><rect x="1196" y="536" width="52" height="18" rx="3" fill="#bfe3ff"/><ellipse cx="1222" cy="545" rx="70" ry="24" fill="#bfe3ff" opacity=".22"/></g>`}
    <rect x="1290" y="520" width="90" height="40" rx="4" fill="#d9c7a6"/><rect x="1296" y="512" width="78" height="10" rx="3" fill="#b88a5a"/>
    <!-- bed -->
    <rect x="340" y="520" width="540" height="140" rx="22" fill="#3e5d7d"/>
    <rect x="270" y="612" width="680" height="300" rx="20" fill="url(#${u}sheet)"/>
    <rect x="390" y="560" width="210" height="80" rx="26" fill="#f4efe6"/><rect x="620" y="560" width="210" height="80" rx="26" fill="#9fb3c8"/>
    <path d="M250 760 Q520 700 800 720 Q900 728 960 700 L980 900 L240 900Z" fill="#3f5f86"/>
    <path d="M250 760 Q520 700 800 720 Q900 728 960 700" stroke="#5b7aa1" stroke-width="10" fill="none"/>
    ${pm ? `<g transform="translate(560 690) rotate(-10)"><rect width="56" height="26" rx="5" fill="#1d2230"/><rect x="5" y="4" width="46" height="18" rx="3" fill="#2a3346"/></g>` : ''}
    <!-- rug -->
    <path d="M60 900 L180 830 L1140 830 L1240 900Z" fill="#cdb895" opacity=".9"/>
    ${vigRect(u)}`,
    lin(`${u}wall`, pm ? [[0,'#f1dcc0'],[1,'#d7b993']] : [[0,'#eee3d2'],[1,'#d6c3a6']]) + lin(`${u}floor`, [[0,'#8a5a3a'],[1,'#6a4128']]) +
    lin(`${u}sky`, [[0,skyTop],[1,skyBot]]) + lin(`${u}mini`, [[0,'#5a4a8a'],[.6,'#ff9b6a'],[1,'#ffd27a']]) + lin(`${u}sheet`, [[0,'#fbf7ef'],[1,'#e2d6c2']]) + VIG(u, pm ? .4 : .32));
}

/* ---------- the neighborhood: the corner with Corner Cup (left) and Paper Moon Books (right) ---------- */
function street(u){
  const r = rng(404);
  let lamps = '';
  return svg(`
    <rect width="1600" height="900" fill="url(#${u}sky)"/>
    ${cloud(300, 120, 1)}${cloud(1240, 90, .8, .8)}
    <path d="M0 420 Q300 330 620 380 T1200 360 T1600 390 L1600 470 L0 470Z" fill="#b9c8a8"/>
    <path d="M0 450 Q400 410 800 430 T1600 430 L1600 480 L0 480Z" fill="#a3b693"/>
    <!-- the far corner: Corner Cup + the flower shop (left), the bookstore (right) -->
    <rect x="560" y="380" width="140" height="96" fill="#f3e3c8"/><rect x="560" y="372" width="140" height="12" fill="#e2cfae"/>
    <path d="M556 404 L704 404 L696 424 L564 424Z" fill="#ff8a3d"/>${[0,1,2,3,4,5].map(i => `<rect x="${566 + i * 22}" y="404" width="11" height="20" fill="#fff4e4" opacity=".7"/>`).join('')}
    <rect x="574" y="430" width="70" height="40" fill="#ffd9a0" opacity=".85"/><rect x="652" y="430" width="34" height="46" fill="#6b4630"/>
    <circle cx="630" cy="392" r="8" fill="#6b4630"/>
    <rect x="490" y="396" width="70" height="80" fill="#f6e6ea"/><path d="M486 410 L564 410 L558 426 L492 426Z" fill="#ff8fb1"/>
    ${[0,1,2,3].map(i => `<circle cx="${502 + i * 15}" cy="466" r="6" fill="${['#ff8fb1','#ffd23f','#fff','#c9b8ff'][i]}"/>`).join('')}
    <rect x="900" y="372" width="170" height="104" fill="#2f3f63"/><rect x="900" y="364" width="170" height="12" fill="#26344f"/>
    <circle cx="985" cy="392" r="12" fill="#ffe7a8"/><circle cx="991" cy="388" r="11" fill="#2f3f63"/>
    <rect x="914" y="414" width="96" height="54" fill="#ffd9a0" opacity=".8"/>${[0,1,2,3,4,5].map(i => `<rect x="${920 + i * 14}" y="${440 - (i % 3) * 6}" width="10" height="${24 + (i % 3) * 6}" fill="${['#c94f3d','#3e7c8c','#e2b04a','#6b4c7a','#6dbb75','#ff8a3d'][i]}"/>`).join('')}
    <ellipse cx="972" cy="438" rx="12" ry="7" fill="#e98b32"/><rect x="1024" y="420" width="34" height="56" fill="#1f2a40"/>
    <!-- the road -->
    <path d="M0 900 L0 620 L700 478 L900 478 L1600 640 L1600 900Z" fill="#d8cdbb"/>
    <path d="M150 900 L730 480 L870 480 L1450 900Z" fill="#5a5d63"/>
    <path d="M800 482 L800 520 M800 560 L800 620 M800 680 L800 770 M800 820 L800 900" stroke="#f3d36a" stroke-width="7"/>
    ${[0,1,2,3,4,5,6,7].map(i => `<rect x="${420 + i * 96}" y="690" width="58" height="22" fill="#f4f1ea" opacity=".9" transform="skewX(${(i - 3.5) * -6})"/>`).join('')}
    <path d="M700 478 L0 620 L0 640 L700 482Z M900 478 L1600 640 L1600 660 L900 482Z" fill="#b8ab96"/>
    <!-- traffic lights -->
    <rect x="886" y="300" width="8" height="190" fill="#3a3d44"/><rect x="872" y="286" width="36" height="78" rx="8" fill="#2a2d33"/>
    <circle cx="890" cy="300" r="8" fill="#5a2a2a"/><circle cx="890" cy="324" r="8" fill="#5a4a22"/><circle cx="890" cy="348" r="8" fill="#5be37a"/><circle cx="890" cy="348" r="16" fill="#5be37a" opacity=".25"/>
    <!-- houses and palms on this side -->
    <rect x="40" y="430" width="300" height="210" fill="#f2e2c6"/><path d="M20 440 L190 360 L360 440Z" fill="#c45d3c"/>
    <rect x="80" y="490" width="70" height="60" fill="#9fc6e4"/><rect x="230" y="500" width="60" height="140" fill="#7a4a30"/>
    ${leafy(120, 640, 50)}${leafy(310, 650, 40, '#467f46')}
    ${palm(380, 650, 520, '#2f4a2b', 16)}${palm(1250, 690, 560, '#2f4a2b', -14)}${palm(1470, 700, 600, '#2a4426', -6)}${palm(620, 480, 240, '#4a6a48', 6)}${palm(1120, 486, 220, '#4a6a48', -4)}
    ${car(1180, 720, .9, '#c0392b')}${car(1430, 820, 1.15, '#e8e4dc')}
    <rect x="0" y="880" width="1600" height="20" fill="#cfc2ad"/>
    ${vigRect(u)}`,
    lin(`${u}sky`, [[0,'#7fc0ee'],[.75,'#d6ecf8'],[1,'#f3ead6']]) + VIG(u, .35));
}

/* ---------- Corner Cup: the counter ---------- */
function cafeArt(u){
  const mugs = [0,1,2,3,4,5,6,7,8,9].map(i => `<rect x="${120 + i * 46}" y="${226 - (i % 2) * 4}" width="32" height="34" rx="6" fill="${['#ff8a3d','#f3e5c8','#6dbb75','#5ab6f9','#ffb199','#243447'][i % 6]}"/>`).join('');
  return svg(`
    <rect width="1600" height="900" fill="url(#${u}wall)"/>
    <rect x="0" y="420" width="1600" height="200" fill="#8a5a3a"/>${[0,1,2,3,4,5,6,7,8,9,10,11].map(i => `<rect x="${i * 140}" y="420" width="4" height="200" fill="#6e4528" opacity=".6"/>`).join('')}
    <!-- the window on the left -->
    <rect x="0" y="120" width="250" height="420" fill="url(#${u}out)"/>${palm(120, 540, 300, '#3c6a44', 8)}
    <rect x="0" y="110" width="262" height="440" fill="none" stroke="#3a2a20" stroke-width="18"/>
    <!-- shelves with mugs -->
    <rect x="100" y="260" width="500" height="12" fill="#5a3a24"/>${mugs}
    <rect x="100" y="350" width="500" height="12" fill="#5a3a24"/>${[0,1,2,3,4,5].map(i => `<rect x="${130 + i * 76}" y="296" width="40" height="54" rx="6" fill="${['#d9b88a','#7a5236','#c9a06a'][i % 3]}"/>`).join('')}
    <!-- the chalk menu board + sign -->
    <text x="980" y="96" text-anchor="middle" ${FONT} font-weight="800" font-size="54" letter-spacing="10" fill="#6b4630">CORNER CUP</text>
    <rect x="720" y="120" width="520" height="270" rx="10" fill="#2b2f2c" stroke="#7a5236" stroke-width="14"/>
    ${[0,1,2,3,4].map(i => `<line x1="760" y1="${170 + i * 44}" x2="${1010 + (i % 2) * 40}" y2="${170 + i * 44}" stroke="#f3efe6" stroke-width="5" opacity=".75" stroke-linecap="round" stroke-dasharray="${18 + i * 3} 9"/><line x1="1120" y1="${170 + i * 44}" x2="1190" y2="${170 + i * 44}" stroke="#ffd38a" stroke-width="5" opacity=".8" stroke-linecap="round"/>`).join('')}
    <path d="M1046 168 v-24 m0 10 h-10 v-8 m10 14 h10 v-12" stroke="#6dbb75" stroke-width="5" fill="none" stroke-linecap="round"/>
    <!-- pendant lights -->
    ${[420, 980, 1380].map(x => `<line x1="${x}" y1="0" x2="${x}" y2="90" stroke="#2a2a2e" stroke-width="3"/><path d="M${x - 34} 120 Q${x} 76 ${x + 34} 120Z" fill="#2a2a2e"/><circle cx="${x}" cy="124" r="12" fill="#ffe2a0"/><circle cx="${x}" cy="150" r="120" fill="url(#${u}glow)"/>`).join('')}
    <!-- people at the back -->
    <g opacity=".75">${figure(1460, 470, .42, { shirt:'#4a5263', rim:'#ffd9a8', hair:'#2b1d14' })}${figure(1540, 476, .4, { shirt:'#9b6b4a', rim:'#ffd9a8', hair:'#c79a5a' })}</g>
    ${plant(60, 620, 1.1)}
    <!-- the counter (the barista stands behind its top edge) -->
    <rect x="0" y="600" width="1600" height="300" fill="url(#${u}counter)"/>${[0,1,2,3,4,5,6,7,8].map(i => `<rect x="${i * 200}" y="618" width="6" height="282" fill="#4a2f1e" opacity=".5"/>`).join('')}
    <rect x="0" y="588" width="1600" height="22" fill="#e3d1b2"/>
    <!-- espresso machine -->
    <rect x="460" y="430" width="260" height="160" rx="14" fill="url(#${u}chrome)"/><rect x="474" y="444" width="232" height="34" rx="8" fill="#b9c1c9"/>
    ${[520, 600, 680].map(x => `<rect x="${x - 14}" y="500" width="28" height="30" rx="6" fill="#3a3d44"/><rect x="${x - 18}" y="560" width="36" height="22" rx="4" fill="#f4efe6"/>`).join('')}
    <g class="ep4-steam">${[540, 620].map(x => `<path d="M${x} 420 q-14 -30 0 -60 q14 -30 0 -60" stroke="#fff" stroke-width="7" fill="none" opacity=".35" stroke-linecap="round"/>`).join('')}</g>
    <!-- register + the pastry case -->
    <rect x="800" y="520" width="120" height="70" rx="8" fill="#2a2d33"/><rect x="814" y="530" width="92" height="36" rx="4" fill="#9fd6b4"/>
    <rect x="1000" y="470" width="420" height="120" rx="10" fill="#e8f2f6" opacity=".35" stroke="#fff" stroke-opacity=".6" stroke-width="4"/>
    ${[1040, 1110, 1180].map(x => `<path d="M${x - 30} 546 Q${x} 506 ${x + 30} 546 Q${x} 560 ${x - 30} 546Z" fill="#d89a4a"/>`).join('')}
    <circle cx="1300" cy="540" r="34" fill="#c98a3e"/><path d="M1300 540 m-22 0 a22 22 0 1 1 22 22 a14 14 0 1 1 -14 -14" stroke="#f3dcae" stroke-width="5" fill="none"/>
    <rect x="1356" y="526" width="48" height="36" rx="4" fill="#a5683a"/>
    ${beams(['0,120 250,120 600,900 0,900'], .1)}
    ${vigRect(u)}`,
    lin(`${u}wall`, [[0,'#f3e6cf'],[1,'#e2cdac']]) + lin(`${u}out`, [[0,'#8fcaf0'],[1,'#f4ead6']]) + lin(`${u}counter`, [[0,'#7a4f33'],[1,'#4f311f']]) +
    lin(`${u}chrome`, [[0,'#e4e9ee'],[.5,'#9aa4ae'],[1,'#d6dce2']], false) + rad(`${u}glow`, [[0,'#ffd28a',.42],[1,'#ffd28a',0]]) + VIG(u, .45));
}

/* ---------- Corner Cup: the window table (Scenes 4, 5, 6, 8) ---------- */
function windowArt(u, quiet){
  return svg(`
    <rect width="1600" height="900" fill="url(#${u}wall)"/>
    <!-- the big window: the street and Paper Moon Books across the road -->
    <rect x="80" y="60" width="1440" height="560" fill="url(#${u}sky)"/>
    ${cloud(360, 140, .9, .8)}
    <rect x="80" y="430" width="1440" height="80" fill="#d8cdbb"/><rect x="80" y="500" width="1440" height="120" fill="#62656b"/>
    <path d="M80 556 H1520" stroke="#f3d36a" stroke-width="5" stroke-dasharray="40 30"/>
    <rect x="860" y="190" width="520" height="250" fill="#2f3f63"/><rect x="860" y="176" width="520" height="20" fill="#26344f"/>
    <circle cx="1120" cy="236" r="26" fill="#ffe7a8"/><circle cx="1134" cy="228" r="24" fill="#2f3f63"/>
    <rect x="900" y="290" width="300" height="140" fill="#ffd9a0" opacity=".85"/>
    ${[0,1,2,3,4,5,6,7,8,9].map(i => `<rect x="${910 + i * 28}" y="${370 - (i % 3) * 14}" width="22" height="${60 + (i % 3) * 14}" fill="${['#c94f3d','#3e7c8c','#e2b04a','#6b4c7a','#6dbb75','#ff8a3d'][i % 6]}"/>`).join('')}
    <ellipse cx="1060" cy="352" rx="30" ry="16" fill="#e98b32"/><circle cx="1084" cy="342" r="13" fill="#e98b32"/>
    <rect x="1240" y="290" width="100" height="150" fill="#1f2a40"/>
    ${palm(300, 510, 420, '#2f5a3a', 12)}${palm(1450, 510, 380, '#2f5a3a', -10)}
    ${quiet ? '' : car(620, 580, .8, '#5ab6f9')}
    <rect x="70" y="50" width="1460" height="580" fill="none" stroke="#3a2a20" stroke-width="22"/>
    <rect x="788" y="60" width="24" height="560" fill="#3a2a20"/>
    <rect x="80" y="60" width="1440" height="560" fill="#fff" opacity=".06"/>
    <!-- inside: the bench and a plant -->
    <rect x="0" y="640" width="1600" height="260" fill="#8a5a3a"/>
    ${plant(1530, 700, .9)}
    ${quiet ? '' : beams(['80,60 790,60 1100,900 300,900'], .1)}
    ${quiet ? '<rect width="1600" height="900" fill="#1a1410" opacity=".14"/>' : ''}
    ${vigRect(u)}`,
    lin(`${u}wall`, [[0,'#efdfc4'],[1,'#d9bf98']]) + lin(`${u}sky`, quiet ? [[0,'#8fc0e0'],[1,'#efe6d4']] : [[0,'#86c6ef'],[1,'#f6ecd8']]) + VIG(u, quiet ? .55 : .42));
}

/* ---------- outside Corner Cup ---------- */
function outsideArt(u){
  return svg(`
    <rect width="1600" height="900" fill="url(#${u}sky)"/>
    ${cloud(1320, 110, .7, .7)}
    <!-- across the street (far right): Paper Moon Books, with the cat in the window -->
    <rect x="1290" y="300" width="310" height="280" fill="#2f3f63"/><rect x="1310" y="380" width="220" height="150" fill="#ffd9a0" opacity=".85"/>
    <ellipse cx="1420" cy="500" rx="28" ry="15" fill="#e98b32"/><circle cx="1442" cy="490" r="12" fill="#e98b32"/><path d="M1436 480 l4 -10 l6 10Z M1448 482 l5 -9 l4 11Z" fill="#e98b32"/>
    <circle cx="1450" cy="336" r="20" fill="#ffe7a8"/><circle cx="1461" cy="330" r="19" fill="#2f3f63"/>
    <!-- the café front -->
    <rect x="80" y="170" width="1120" height="560" fill="#f3e3c8"/><rect x="80" y="150" width="1120" height="30" fill="#e2cfae"/>
    <text x="640" y="250" text-anchor="middle" ${FONT} font-weight="800" font-size="70" letter-spacing="12" fill="#6b4630">CORNER CUP</text>
    <circle cx="300" cy="228" r="22" fill="#6b4630"/><path d="M290 216 q6 -10 0 -18 M306 216 q6 -10 0 -18" stroke="#6b4630" stroke-width="4" fill="none"/>
    <path d="M60 300 L1220 300 L1180 370 L100 370Z" fill="#ff8a3d"/>${Array.from({ length:23 }, (_, i) => `<path d="M${84 + i * 48} 300 L${108 + i * 48} 300 L${106 + i * 46} 370 L${86 + i * 46} 370Z" fill="#fff4e4" opacity=".75"/>`).join('')}
    <rect x="130" y="390" width="620" height="300" fill="url(#${u}glass)"/>
    ${[0,1,2].map(i => `<circle cx="${250 + i * 180}" cy="440" r="14" fill="#ffe2a0"/><circle cx="${250 + i * 180}" cy="450" r="60" fill="#ffd28a" opacity=".18"/>`).join('')}
    <g opacity=".55">${figure(330, 690, .5, { shirt:'#9b6b4a', rim:'#ffd9a8', hair:'#2b1d14' })}${figure(560, 690, .46, { shirt:'#4a5263', rim:'#ffd9a8' })}</g>
    <rect x="130" y="390" width="620" height="300" fill="none" stroke="#3a2a20" stroke-width="14"/>
    <rect x="820" y="390" width="200" height="340" fill="#6b4630"/><rect x="842" y="414" width="156" height="200" fill="url(#${u}glass)"/><circle cx="986" cy="640" r="8" fill="#e2b04a"/>
    <path d="M1060 730 L1090 600 L1150 600 L1180 730Z" fill="#2b2f2c"/><circle cx="1135" cy="660" r="16" fill="none" stroke="#f3efe6" stroke-width="4"/>
    ${plant(780, 740, .8)}${plant(1240, 740, .9)}
    <!-- sidewalk, the street, palms -->
    <rect x="0" y="730" width="1600" height="170" fill="#d8cdbb"/>${[0,1,2,3,4,5,6,7].map(i => `<line x1="${i * 220}" y1="730" x2="${i * 220 - 80}" y2="900" stroke="#bfb29c" stroke-width="3"/>`).join('')}
    <rect x="1220" y="580" width="380" height="150" fill="#62656b"/>
    ${car(1420, 720, .9, '#ffd23f')}
    ${palm(40, 780, 640, '#2f4a2b', 18)}${palm(1250, 760, 560, '#2a4426', -12)}
    ${beams(['1600,0 1600,300 600,900 300,900'], .08)}
    ${vigRect(u)}`,
    lin(`${u}sky`, [[0,'#6db6ec'],[.8,'#d5ecf8'],[1,'#f3ead6']]) + lin(`${u}glass`, [[0,'#5a4232'],[1,'#2f2219']]) + VIG(u, .32));
}

const ART = {
  bedroomAm: u => room(u, 'am'),
  bedroomPm: u => room(u, 'pm'),
  street, cafe: cafeArt,
  window: u => windowArt(u, false),
  windowQuiet: u => windowArt(u, true),
  outside: outsideArt
};
/* which part of a drawing stays in view on a tall phone screen */
const ALIGN = { bedroomAm:'xMidYMid', bedroomPm:'xMidYMid', street:'xMidYMid' };
function sceneArt(key){
  const out = (ART[key] || ART.window)(nextArtId('ep4a'));
  return ALIGN[key] ? out.replace('xMidYMid slice', ALIGN[key] + ' slice') : out;
}

/* =========================================================================
   THE CAST — drawn people (and the table in front of them)
   ========================================================================= */
const EMILY = { shirt:'#efe1c8', rim:'#ffd9a8', hair:'#6b4226', jeans:'#7d9cc4', shoe:'#f4f1ea' };
/* Emily: long wavy brown hair, cream top, the film camera on its strap */
function emilyFig(x, base, s, o = {}){
  const hip = o.full ? base - 290 * s : base;
  const h = hip - 300 * s;                               // head centre
  let g = `<g class="ep4-emily">`;
  if(o.full){
    g += `<ellipse cx="${x}" cy="${base}" rx="${110*s}" ry="${12*s}" fill="#000" opacity=".2"/>`;
    g += `<path d="M${x - 70*s} ${hip - 10*s} L${x - 58*s} ${base - 26*s} L${x - 18*s} ${base - 26*s} L${x - 6*s} ${hip + 20*s} Z M${x + 70*s} ${hip - 10*s} L${x + 58*s} ${base - 26*s} L${x + 18*s} ${base - 26*s} L${x + 6*s} ${hip + 20*s} Z" fill="${EMILY.jeans}"/>`;
    g += `<rect x="${x - 66*s}" y="${base - 30*s}" width="${54*s}" height="${30*s}" rx="${12*s}" fill="${EMILY.shoe}"/><rect x="${x + 12*s}" y="${base - 30*s}" width="${54*s}" height="${30*s}" rx="${12*s}" fill="${EMILY.shoe}"/>`;
  }
  /* hair behind the shoulders */
  g += `<path d="M${x - 62*s} ${h - 20*s} C${x - 92*s} ${h + 60*s} ${x - 70*s} ${h + 120*s} ${x - 86*s} ${h + 168*s} C${x - 50*s} ${h + 176*s} ${x - 30*s} ${h + 150*s} ${x - 24*s} ${h + 100*s} L${x + 24*s} ${h + 100*s} C${x + 30*s} ${h + 150*s} ${x + 50*s} ${h + 176*s} ${x + 86*s} ${h + 168*s} C${x + 70*s} ${h + 120*s} ${x + 92*s} ${h + 60*s} ${x + 62*s} ${h - 20*s} Z" fill="${EMILY.hair}"/>`;
  g += figure(x, hip, s, { shirt:EMILY.shirt, rim:EMILY.rim });
  /* wavy hair on top */
  g += `<path d="M${x - 54*s} ${h + 10*s} C${x - 64*s} ${h - 62*s} ${x + 64*s} ${h - 70*s} ${x + 56*s} ${h + 8*s} C${x + 44*s} ${h - 30*s} ${x + 14*s} ${h - 36*s} ${x - 4*s} ${h - 26*s} C${x - 22*s} ${h - 34*s} ${x - 44*s} ${h - 24*s} ${x - 54*s} ${h + 10*s} Z" fill="${EMILY.hair}"/>`;
  g += `<path d="M${x - 50*s} ${h + 6*s} q${-10*s} ${30*s} ${2*s} ${54*s} M${x + 50*s} ${h + 6*s} q${10*s} ${30*s} ${-2*s} ${54*s}" stroke="#8a5a34" stroke-width="${5*s}" fill="none" opacity=".7"/>`;
  /* the camera strap — and the camera */
  g += `<path d="M${x - 46*s} ${hip - 232*s} L${x + 54*s} ${hip - 96*s}" stroke="#3a2a20" stroke-width="${7*s}" stroke-linecap="round"/>`;
  const cx = o.camera ? x - 40*s : x + 58*s, cy = o.camera ? hip - 190*s : hip - 108*s, cs = o.camera ? 1.5 : 1;
  g += `<g transform="translate(${cx} ${cy}) scale(${s * cs})"><rect x="-34" y="-22" width="68" height="44" rx="8" fill="#26272c"/><rect x="-34" y="-22" width="68" height="12" rx="6" fill="#c8ced8"/><circle cx="4" cy="4" r="15" fill="#3a3d44" stroke="#9aa3ad" stroke-width="4"/><circle cx="4" cy="4" r="6" fill="#5ab6f9" opacity=".7"/></g>`;
  if(o.wave) g += `<path class="ep4-wave" d="M${x + 110*s} ${hip - 150*s} q${30*s} ${-60*s} ${20*s} ${-130*s}" stroke="${EMILY.shirt}" stroke-width="${30*s}" fill="none" stroke-linecap="round"/><circle cx="${x + 130*s}" cy="${hip - 290*s}" r="${18*s}" fill="#141821" stroke="${EMILY.rim}" stroke-opacity=".5" stroke-width="${3*s}"/>`;
  return g + `</g>`;
}
function baristaFig(x, base, s){
  return figure(x, base, s, { shirt:'#3b4a3f', rim:'#d6e8c8', hair:'#2a1d14', cap:'#3b4a3f' }) +
    `<path d="M${x - 70*s} ${base} L${x - 62*s} ${base - 170*s} L${x + 62*s} ${base - 170*s} L${x + 70*s} ${base} Z" fill="#7a5236"/><path d="M${x - 50*s} ${base - 170*s} L${x - 30*s} ${base - 236*s} M${x + 50*s} ${base - 170*s} L${x + 30*s} ${base - 236*s}" stroke="#7a5236" stroke-width="${8*s}"/>` +
    `<rect x="${x + 20*s}" y="${base - 150*s}" width="${30*s}" height="${36*s}" rx="${4*s}" fill="#f4f1ea"/>`;
}
function neighborFig(x, base, s){
  return figure(x, base, s, { shirt:'#7aa7c7', rim:'#ffe2b8', hair:'#8a5a34' }) +
    `<ellipse cx="${x}" cy="${base - 336*s}" rx="${92*s}" ry="${18*s}" fill="#e8d5a8"/><path d="M${x - 48*s} ${base - 340*s} Q${x} ${base - 420*s} ${x + 48*s} ${base - 340*s}Z" fill="#e8d5a8"/><rect x="${x - 50*s}" y="${base - 350*s}" width="${100*s}" height="${10*s}" fill="#c45d3c"/>`;
}
function fluffyDog(x, base, s){
  return `<g class="ep4-fluff">${[[-40,-40,34],[0,-52,38],[40,-40,32],[-10,-20,40],[30,-18,34],[64,-74,26],[82,-90,22]].map(([dx, dy, r]) => `<circle cx="${x + dx*s}" cy="${base + dy*s}" r="${r*s}" fill="#f6f1e6"/>`).join('')}
    <circle cx="${x + 90*s}" cy="${base - 92*s}" r="${4*s}" fill="#2a1a10"/><ellipse cx="${x + 104*s}" cy="${base - 82*s}" rx="${6*s}" ry="${5*s}" fill="#2a1a10"/>
    <path d="M${x - 70*s} ${base - 60*s} q${-30*s} ${-30*s} ${-16*s} ${-56*s}" stroke="#f6f1e6" stroke-width="${16*s}" fill="none" stroke-linecap="round" class="ep4-fluff-tail"/></g>`;
}
/* Buddy, asleep on the rug */
function buddySleep(x, base, s){
  return `<g class="ep4-sleep"><ellipse cx="${x}" cy="${base}" rx="${150*s}" ry="${14*s}" fill="#000" opacity=".18"/>
    <ellipse cx="${x}" cy="${base - 46*s}" rx="${130*s}" ry="${52*s}" fill="url(#ep4bud)"/>
    <path d="M${x - 120*s} ${base - 40*s} C${x - 170*s} ${base - 30*s} ${x - 160*s} ${base + 4*s} ${x - 100*s} ${base - 4*s}" stroke="#c8892f" stroke-width="${18*s}" fill="none" stroke-linecap="round"/>
    <ellipse cx="${x + 120*s}" cy="${base - 30*s}" rx="${56*s}" ry="${40*s}" fill="url(#ep4bud)"/>
    <ellipse cx="${x + 160*s}" cy="${base - 18*s}" rx="${30*s}" ry="${18*s}" fill="#e9bd6c"/><ellipse cx="${x + 186*s}" cy="${base - 18*s}" rx="${8*s}" ry="${6*s}" fill="#2a1a10"/>
    <path d="M${x + 100*s} ${base - 60*s} C${x + 70*s} ${base - 70*s} ${x + 66*s} ${base - 20*s} ${x + 92*s} ${base - 4*s}" fill="#a8681f"/>
    <path d="M${x + 124*s} ${base - 36*s} q${8*s} ${6*s} ${16*s} 0" stroke="#2a1a10" stroke-width="${3*s}" fill="none"/>
    <rect x="${x + 60*s}" y="${base - 14*s}" width="${90*s}" height="${16*s}" rx="${8*s}" fill="#e5ac4f"/>
    <g class="ep4-zzz" font-family="'Caveat', cursive" font-weight="700" fill="#fff" opacity=".85"><text x="${x + 180*s}" y="${base - 90*s}" font-size="${34*s}">z</text><text x="${x + 206*s}" y="${base - 124*s}" font-size="${44*s}">z</text></g></g>`;
}
/* the table in front of Emily: your cup (with the name), her cup, her camera (or your phone) */
function tableFg(kind){
  const name = esc(cupName());
  const phone = kind === 'phone';
  return `<path d="M-40 900 L150 610 Q800 584 1450 610 L1640 900Z" fill="url(#ep4table)"/><path d="M150 610 Q800 584 1450 610" stroke="#c99a6a" stroke-width="6" fill="none"/>
    <g transform="translate(440 650) scale(.82)"><path d="M-62 -150 L62 -150 L50 60 L-50 60Z" fill="#fbf8f2"/><path d="M-60 -116 L60 -116 L54 -20 L-54 -20Z" fill="#c9a06a"/>
      <text x="0" y="-60" text-anchor="middle" font-family="'Caveat', cursive" font-weight="700" font-size="38" fill="#1d1d1f" transform="rotate(-4)">${name}</text>
      <rect x="-68" y="-166" width="136" height="20" rx="6" fill="#efe8dc"/><rect x="18" y="-226" width="10" height="70" rx="4" fill="#ff8fb1" transform="rotate(10 23 -190)"/></g>
    <g transform="translate(1150 640) scale(.82)"><path d="M-50 -110 L50 -110 L42 50 L-42 50Z" fill="#fbf8f2"/><path d="M-48 -84 L48 -84 L44 -14 L-44 -14Z" fill="#ff8a3d" opacity=".85"/><rect x="-56" y="-124" width="112" height="18" rx="6" fill="#efe8dc"/></g>
    ${phone ? `<g transform="translate(800 690) rotate(-8) scale(.8)" class="ep4-tphone"><rect x="-44" y="-80" width="88" height="160" rx="16" fill="#1d2230"/><rect x="-36" y="-70" width="72" height="140" rx="10" fill="#2a3346"/></g>`
            : `<g transform="translate(800 690) scale(.8)"><rect x="-80" y="-48" width="160" height="96" rx="14" fill="#26272c"/><rect x="-80" y="-48" width="160" height="26" rx="12" fill="#c8ced8"/><circle cx="10" cy="10" r="32" fill="#3a3d44" stroke="#9aa3ad" stroke-width="7"/><circle cx="10" cy="10" r="13" fill="#5ab6f9" opacity=".7"/><rect x="-62" y="-62" width="32" height="16" rx="4" fill="#26272c"/></g>`}`;
}
const CAST_DEFS = `<defs><linearGradient id="ep4bud" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e5ac4f"/><stop offset="1" stop-color="#b9792a"/></linearGradient>
  <linearGradient id="ep4table" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9875a"/><stop offset="1" stop-color="#6f4528"/></linearGradient></defs>`;
const POS = {
  window:  { x:250, base:575, s:.34 },
  near:    { x:1300, base:900, s:1.05 },
  counter: { x:760, base:600, s:.92 },
  table:   { x:800, base:712, s:1.2 },
  camera:  { x:800, base:712, s:1.2 },
  out:     { x:960, base:890, s:1.02 },
  street:  { x:1180, base:900, s:1.05 },
  sleep:   { x:250, base:870, s:1.05 }
};
function castSVG(list, align){
  const parts = list.map(c => {
    const [who, at] = c.split('@'); const p = POS[at] || POS.table;
    if(who === 'emily') return emilyFig(p.x, p.base, p.s, { full: at === 'out', camera: at === 'camera', wave: at === 'window' || at === 'out' });
    if(who === 'barista') return baristaFig(p.x, p.base, p.s);
    if(who === 'local') return neighborFig(p.x, p.base, p.s) + fluffyDog(p.x - 230, 900, .9);
    if(who === 'buddy') return buddySleep(p.x, p.base, p.s);
    if(who === 'tableFg') return tableFg('camera');
    if(who === 'tableFgPhone') return tableFg('phone');
    return '';
  }).join('');
  return `<svg class="ep1-art" viewBox="0 0 1600 900" preserveAspectRatio="${align || 'xMidYMid'} slice" aria-hidden="true" focusable="false">${CAST_DEFS}${parts}</svg>`;
}
/* the photo cast: real cut-outs over the real photos (only when both exist — see READY_CAST).
   x = centre (% of the photo's width), h = height (% of the photo's height). */
/* pic → [file in photos/ (no extension), width ÷ height of the cut-out] */
const CAST_PICS = { emily:['cast/emily', .735], emilyCamera:['cast/emily-camera', .735], emilyWave:['cast/emily-wave', .904], emilyFull:['cast/emily-full', .372],
                    barista:['cast/barista', .717], buddy:['cast/buddy', 2.427], local:['cast/neighbor', .6], cup:['props/cup', .658],
                    /* whole-frame photos with the person already in the scene (same 16:9 shape as the backgrounds) */
                    emilySeated:['cast/emily-seated', 1672 / 941], emilyOutside:['cast/emily-outside', 1672 / 941] };
const picReady = f => !!f && (READY_CAST.includes(f.replace('cast/', '')) || READY_PROPS.includes(f.replace('props/', '')));
/* where each person / thing stands on each photo: x = centre, h = height, b = bottom (all in % of the photo) */
const PH_CAST = {
  bedroomAm:   { 'buddy@sleep':{ pic:'buddy', x:31, h:14, b:24 } },
  bedroomPm:   { 'buddy@sleep':{ pic:'buddy', x:33, h:14, b:24 } },
  street:      { 'local@street':{ pic:'local', x:78, h:80 } },
  cafe:        { 'emily@window':{ pic:'emilyWave', x:9, h:30, b:30 }, 'barista@counter':{ pic:'barista', x:38, h:46, b:29 }, 'emily@near':{ pic:'emilyWave', x:80, h:80 } },
  /* the window table: Emily sitting there is one whole photo; with the camera she sits behind the table (cut-out, waist up);
     the cup on the table is part of the photo — only the name is written on its sleeve (tag: x, y, width in %, tilt) */
  window:      { 'emily@table':{ pic:'emilySeated', full:true, tag:[19.6, 73.6, 9.6, -2] }, 'emily@camera':{ pic:'emilyCamera', x:50, h:64, b:23 }, 'tableFg':{ tag:[22.3, 74.2, 8.6, -2] } },
  windowQuiet: { 'emily@table':{ pic:'emily', x:50, h:86 }, 'tableFgPhone':{ pic:'cup', x:15, h:22, b:16, name:true } },
  outside:     { 'emily@out':{ pic:'emilyOutside', full:true } }
};
const PH_ASPECT = 941 / 1672;
/* the misheard name, written on a cup sleeve that is part of a photo: [x, y, width, tilt] in % of the picture */
function nameTag(t){
  const n = cupName(), fs = t[2] * Math.min(.36, 2 / Math.max(n.length, 1));
  return `<span class="ep4-cupname ep4-tag" style="left:${t[0]}%;top:${t[1]}%;width:${t[2]}%;--r:${t[3] || 0}deg;--fs:${fs.toFixed(2)}">${esc(n)}</span>`;
}
/* a close-up photo with the name on the cup, for a hotspot (same layout as the engine's own hotspot card) */
const CLOSEUP_TAGS = { 'table-cup':[26.6, 42, 19, -4], 'table-phone':[20.8, 39, 16.4, -3] };
function hotPop(h, file){
  pop(`<div class="ep1-hs-pics" aria-hidden="true"><div class="ep4-namepic"><img src="${PHOTO_BASE}props/${file}.webp" alt="" draggable="false" decoding="async">${nameTag(CLOSEUP_TAGS[file])}</div></div>
    <div class="ep1-head"><span class="ep1-who ep1-thought-label">💭 ${esc(h.label)}</span></div>
    <div class="ep1-text think">${esc(h.text)}</div>${h.ua ? `<div class="ep1-ua" ${SET.ua ? '' : 'hidden'}>${esc(h.ua)}</div><button type="button" class="ep1-tool" onclick="this.previousElementSibling.hidden=!this.previousElementSibling.hidden">UA</button>` : ''}`);
  renderHotspots();
  return false;
}
function castPhoto(list, bg){
  const spots = PH_CAST[bg] || {};
  const full = list.some(c => spots[c] && spots[c].full && picReady((CAST_PICS[spots[c].pic] || [])[0]));
  return list.map((c, i) => {
    const sp = spots[c]; if(!sp) return '';
    if(!sp.pic){ return sp.tag && !full ? `<div class="ep4-ph-tagbox">${nameTag(sp.tag)}</div>` : ''; }
    const [file, ar] = CAST_PICS[sp.pic] || [];
    if(!picReady(file)) return '';
    if(sp.full) return `<div class="ep4-ph-full"><img src="${PHOTO_BASE + file}.webp" alt="" draggable="false" decoding="async" onerror="this.parentNode.remove()">${sp.tag ? nameTag(sp.tag) : ''}</div>`;
    const w = sp.h * PH_ASPECT * ar;
    return `<div class="ep4-ph-fig ${sp.name ? 'ep4-ph-cup' : ''}" style="--x:${sp.x};--w:${w.toFixed(2)};--h:${sp.h};--b:${sp.b || 0};--d:${(i * .7).toFixed(1)}s"><img src="${PHOTO_BASE + file}.webp" alt="" draggable="false" decoding="async" onerror="this.remove()">${sp.name ? `<span class="ep4-cupname">${esc(cupName())}</span>` : ''}</div>`;
  }).join('');
}
/* on a photo only photo cut-outs are shown (never a drawing on top of a photo) */
let castKey = null;
function setCast(list){
  const key = (list || []).join('|') + '#' + (EP.bgKey || '');
  let el = EP.bg && EP.bg.querySelector('.ep4-cast');
  if(el && castKey === key) return;
  castKey = key;
  if(!el){ el = document.createElement('div'); el.className = 'ep4-cast'; EP.bg.appendChild(el); }
  const photo = !!PHOTOS[EP.bgKey];
  el.innerHTML = !(list && list.length) ? '' : photo ? `<div class="ep4-ph-cast">${castPhoto(list, EP.bgKey)}</div>` : `<div class="ep4-cast-art">${castSVG(list, ALIGN[EP.bgKey])}</div>`;
}

/* ---------- small pictures: Emily's three photos, the cup ---------- */
const GALLERY = {
  beach: { title:'Santa Monica Beach', quote:'I love the ocean.', quoteUa:'Я люблю океан.', emoji:'🌊',
           cap:'Sunset by the pier. I take this photo every month — it\'s never the same.', capUa:'Захід сонця біля пірса. Я фотографую це щомісяця — і щоразу інакше.',
           svg:() => `<svg viewBox="0 0 400 300" class="ep4-gal-svg" aria-hidden="true"><defs><linearGradient id="g4b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a4a8a"/><stop offset=".55" stop-color="#ff8f6a"/><stop offset="1" stop-color="#ffd27a"/></linearGradient></defs>
             <rect width="400" height="300" fill="url(#g4b)"/><circle cx="250" cy="176" r="34" fill="#ffe9a8"/><rect y="186" width="400" height="114" fill="#3a5a8a"/><path d="M0 200 H400" stroke="#ffd9a0" stroke-width="3" opacity=".7"/>
             ${[0,1,2,3,4].map(i => `<rect x="${200 + i * 18}" y="196" width="40" height="3" fill="#ffe9a8" opacity="${.6 - i * .1}"/>`).join('')}
             <rect x="0" y="168" width="180" height="10" fill="#2a2030"/>${[0,1,2,3,4,5,6,7].map(i => `<rect x="${8 + i * 22}" y="178" width="4" height="30" fill="#2a2030"/>`).join('')}
             <circle cx="70" cy="122" r="44" fill="none" stroke="#2a2030" stroke-width="5"/>${[0,1,2,3,4,5,6,7].map(i => `<line x1="70" y1="122" x2="${70 + Math.cos(i * .785) * 44}" y2="${122 + Math.sin(i * .785) * 44}" stroke="#2a2030" stroke-width="2"/>`).join('')}
             <path d="M54 168 L70 122 L86 168" stroke="#2a2030" stroke-width="5" fill="none"/>${palm(360, 200, 120, '#2a2030', -6)}<rect y="250" width="400" height="50" fill="#e8c890"/></svg>` },
  hills: { title:'The Hollywood Hills', quote:'I want to see the whole city.', quoteUa:'Хочу побачити все місто.', emoji:'⛰️',
           cap:'From the hills, at blue hour. The whole city starts to glow.', capUa:'З пагорбів, у сутінках. Усе місто починає світитися.',
           svg:() => { const r = rng(77); return `<svg viewBox="0 0 400 300" class="ep4-gal-svg" aria-hidden="true"><defs><linearGradient id="g4h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#26345e"/><stop offset=".6" stop-color="#7a6a9a"/><stop offset="1" stop-color="#ffb28a"/></linearGradient></defs>
             <rect width="400" height="300" fill="url(#g4h)"/><path d="M0 150 Q100 110 200 140 T400 130 L400 210 L0 210Z" fill="#3a3a5a"/><rect y="200" width="400" height="100" fill="#1d2238"/>
             ${Array.from({ length:140 }, () => `<rect x="${(r() * 400).toFixed(0)}" y="${(205 + Math.pow(r(), .7) * 90).toFixed(0)}" width="2.4" height="2.4" fill="${r() < .6 ? '#ffd27a' : '#fff4d6'}" opacity="${(.4 + r() * .6).toFixed(2)}"/>`).join('')}
             <path d="M0 300 L0 230 Q80 200 150 236 L240 300Z" fill="#141826"/><path d="M260 300 Q330 220 400 240 L400 300Z" fill="#141826"/>${palm(60, 240, 90, '#0e111c', 6)}</svg>`; } },
  hidden:{ title:'A hidden local spot', quote:'I prefer unusual places.', quoteUa:'Мені більше подобаються незвичайні місця.', emoji:'🗝️',
           cap:'Paper Moon Books, upstairs. A reading nook, a lamp, and Biscuit the cat.', capUa:'Paper Moon Books, другий поверх. Куточок для читання, лампа і кіт Бісквіт.',
           svg:() => `<svg viewBox="0 0 400 300" class="ep4-gal-svg" aria-hidden="true"><rect width="400" height="300" fill="#3a2a22"/>
             ${[0,1,2,3].map(row => Array.from({ length:16 }, (_, i) => `<rect x="${8 + i * 24}" y="${20 + row * 62 + (i % 3) * 4}" width="${16 + (i % 2) * 4}" height="${50 - (i % 3) * 4}" fill="${['#c94f3d','#3e7c8c','#e2b04a','#6b4c7a','#6dbb75','#ff8a3d','#e9dcc8'][(i + row) % 7]}"/>`).join('') + `<rect x="0" y="${72 + row * 62}" width="400" height="8" fill="#6b4630"/>`).join('')}
             <circle cx="300" cy="200" r="90" fill="#ffd28a" opacity=".25"/><rect x="292" y="150" width="16" height="110" fill="#2a1f1a"/><path d="M268 150 L332 150 L318 118 L282 118Z" fill="#ffd9a0"/>
             <rect x="40" y="220" width="200" height="80" rx="20" fill="#7a4a30"/><ellipse cx="140" cy="222" rx="44" ry="20" fill="#e98b32"/><circle cx="176" cy="210" r="16" fill="#e98b32"/><path d="M170 198 l4 -12 l6 12Z M182 198 l6 -11 l4 13Z" fill="#e98b32"/></svg>` }
};
function cupSVG(name){
  return `<svg viewBox="0 0 320 380" class="ep4-cup-svg" role="img" aria-label="Your cup. The name on it says: ${esc(name)}">
    <ellipse cx="160" cy="360" rx="110" ry="14" fill="#000" opacity=".25"/>
    <path d="M58 70 L262 70 L238 352 L82 352Z" fill="#fbf8f2"/><path d="M58 70 L262 70 L256 120 L64 120Z" fill="#efe8dc"/>
    <path d="M66 140 L254 140 L242 272 L78 272Z" fill="#c9a06a"/><path d="M66 140 L254 140" stroke="#a87e4a" stroke-width="4"/>
    <text x="160" y="222" text-anchor="middle" font-family="'Caveat', cursive" font-weight="700" font-size="${name.length > 12 ? 34 : 50}" fill="#1d1d1f" transform="rotate(-5 160 210)" class="ep4-cup-name">${esc(name)}</text>
    <path d="M110 244 q50 24 100 0" stroke="#1d1d1f" stroke-width="4" fill="none" transform="rotate(-5 160 210)"/><circle cx="214" cy="194" r="4" fill="#1d1d1f"/>
    <rect x="44" y="48" width="232" height="30" rx="10" fill="#e3dccd"/><rect x="186" y="-10" width="16" height="80" rx="6" fill="#ff8fb1" transform="rotate(12 194 30)"/></svg>`;
}

/* =========================================================================
   EPISODE 4 INTERACTIONS (custom node types)
   ========================================================================= */
let CUR = null;          // the speaking turn on screen — used by teacher mode (hint / hide / repeat / done)
function setCur(api){ if(CUR && CUR !== api && CUR.destroy) try { CUR.destroy(); } catch(e){} CUR = api; Teacher.sync(); }

/* ---------- small story actions ---------- */
const SLEEVE = 'Coffee cup sleeve';
const ITEMS = {
  [SLEEVE]: { icon:'🥤', desc: () => `From Corner Cup, Day 3. It says “${cupName()}” in big black marker. That's you now, apparently.` }
};
function addMilestone(k){
  const s = st(), f = s.flags;
  const m = MILESTONES.find(x => x.k === k); if(!m) return;
  f.rel = relList(s);
  if(!f.rel.includes(k)){
    f.rel.push(k);
    s.relEver = Array.from(new Set((s.relEver || []).concat(k)));
    toast('💛', `Emily · ${m.label}`, `Friendship ${f.rel.length}/${MILESTONES.length} · ${relStatus(s).name}`);
    Sound.sfx('good');
  }
  syncEmilyCard(); save(true);
}
function visitCafe(){
  const l = DATA.locations.find(x => x.id === 'coffee');
  if(l && (l.status !== 'unlocked' || !l.visited)){
    l.status = 'unlocked'; l.visited = true; l.note = 'Corner Cup · where you met Emily on Day 3. Across from Paper Moon Books.';
    toast('📍', 'New place on your Map', 'Coffee Shop · Corner Cup');
    const exp = DATA.achievements.find(a => a.id === 'explorer'); if(exp && !exp.done) exp.progress = Math.max(exp.progress || 0, DATA.locations.filter(x => x.visited).length);
  }
  save(true);
}
const ACTIONS = {
  startDay3(){
    if(typeof window.setStoryDay === 'function' && (!DATA.day || DATA.day.number < 3)) window.setStoryDay(3);
    if(typeof window.renderTopbar === 'function') try { window.renderTopbar(); } catch(e){}
    save(true);
  },
  rel(f, k){ addMilestone(k); },
  coffeePaid(){
    const a = ensureAch('coffee');
    if(a && !a.done && (a.progress || 0) < 1){ a.progress = 1; a.locked = false; setTimeout(() => toast('☕', 'Coffee Lover · 1/5', 'Your first coffee in LA'), 400); }
    save(true);
  },
  sleeve(){ if(giveItem(SLEEVE)) toast('🥤', 'New item in your Backpack', SLEEVE); save(true); },
  jakeSave(f){ f.jakeSituationReaction = { reaction: f.jakeReaction || null, followUp: f.jakeFollowUp || null }; save(true); }
};
RENDER.act = function(node, id){
  try { ACTIONS[node.run] && ACTIONS[node.run](flags(), node.arg); } catch(e){ console.warn('Life in LA: action failed', node.run, e); }
  next(node, id);
};

/* ---------- “Useful English” cards (saved to the Backpack as they appear) ---------- */
RENDER.useful = function(node, id, tok){
  hideGame();
  const f = flags();
  const items = (node.ids || []).map(k => P(k) ? Object.assign({ id:k }, P(k)) : null).filter(Boolean);
  if(node.sentence && coffee(f).drink) items.push({ en: orderSentence(coffee(f), 'like'), simple:"Next time, say your whole order in one sentence.", ex:"Size → drink → milk → please.", ua:"Наступного разу скажи все замовлення одним реченням.", whole:true });
  const added = (node.ids || []).filter(addPhrase);
  (node.ids || []).forEach(k => taskDone('seen:' + k));
  if(added.length){ toast('🎒', `${added.length} phrase${added.length > 1 ? 's' : ''} saved to Backpack`, added.map(k => P(k).en).slice(0, 2).join(' · ')); save(true); }
  dlg(`${head('💬 ' + esc(node.title || 'Useful English'), 'turn')}
    <div class="ep4-useful ${items.length > 2 ? 'many' : ''}">${items.map(p => `
      <div class="ep4-uc ${p.whole ? 'whole' : ''}">
        <div class="ep4-uc-en">${esc(p.en)} ${Voice.available() ? `<button type="button" class="ep1-tool" data-say-u="${esc(p.en)}" aria-label="Listen: ${esc(p.en)}">🔊</button>` : ''}</div>
        <div class="ep4-uc-simple">${esc(p.simple || '')}</div>
        <div class="ep4-uc-ex">${esc(p.ex || '')}</div>
        <div class="ep1-ua" ${SET.ua ? '' : 'hidden'}>🇺🇦 ${esc(p.ua || '')}</div>
      </div>`).join('')}</div>
    <div class="ep1-row"><div class="ep1-tools">${uaBtn()}<span class="ep1-mini">🎒 In your Backpack</span></div><button type="button" class="ep1-next" data-primary>Continue ▸</button></div>`, 'k-useful');
  EP.dlg.querySelectorAll('[data-say-u]').forEach(b => b.addEventListener('click', () => Voice.speak('you', b.dataset.sayU)));
  primary(() => next(node, id));
};

/* =========================================================================
   SPEAKING TURNS — say it out loud. Help comes in three levels, one at a
   time: 1 keywords → 2 sentence starters → 3 an example answer. The student
   or the teacher marks the turn as done; nothing listens or grades.
   Optional: a timer, recording on this device, or typing (for homework).
   With `reactions`, the teacher/student picks how Emily reacts to what was
   actually said — the app never pretends to have understood the answer.
   ========================================================================= */
const HINT_NAMES = { kw:'🔑 Keywords', st:'🧩 Sentence starters', ex:'💡 Example answer' };
RENDER.speak4 = function(node, id, tok){
  const f = flags();
  if(!node.keepGame) hideGame();
  const prompt = valOf(node.prompt, f), ua = valOf(node.ua, f), ctx = valOf(node.ctx, f), ctxUa = valOf(node.ctxUa, f);
  const kw = valOf(node.keywords, f) || [], starters = valOf(node.starters, f) || [], model = valOf(node.model, f);
  const levels = [kw.length ? 'kw' : null, starters.length ? 'st' : null, model ? 'ex' : null].filter(Boolean);
  const asker = node.who && E.api.spk(node.who);
  let shown = 0, maxShown = 0, rec = null, typing = false, phase = 'speak', tick = null, secs = 0, running = false, finished = false;
  const minW = node.minWords || 3;

  function hintsHTML(){
    return levels.slice(0, shown).map(l => {
      if(l === 'kw') return `<div class="ep4-hl"><span class="ep4-hl-t">${HINT_NAMES.kw}</span><div class="ep4-chips">${kw.map(k => `<span class="ep4-kw">${esc(k)}</span>`).join('')}</div></div>`;
      if(l === 'st') return `<div class="ep4-hl"><span class="ep4-hl-t">${HINT_NAMES.st}</span><div class="ep4-chips">${starters.map(s => typing ? `<button type="button" class="ep1-chip" data-st="${esc(s)}">${esc(s)}</button>` : `<span class="ep1-chip ep1-chip-static">${esc(s)}</span>`).join('')}</div></div>`;
      return `<div class="ep4-hl ep4-hl-ex"><span class="ep4-hl-t">${HINT_NAMES.ex}</span><div class="ep1-model">“${esc(model)}” ${Voice.available() ? `<button type="button" class="ep1-tool" data-sp4="model" aria-label="Listen to the example">🔊</button>` : ''}</div><small class="ep1-mini">Use it for ideas — then say it YOUR way.</small></div>`;
    }).join('');
  }
  function timerHTML(){
    if(!node.timer) return '';
    const t = node.timer, full = secs >= t;
    return `<button type="button" class="ep4-timer ${running ? 'on' : ''} ${full ? 'full' : ''}" data-sp4="timer" aria-label="${running ? 'Pause timer' : 'Start timer'}">⏱ <b>${fmtTime(secs)}</b><small>/ ${fmtTime(t)}</small> ${running ? '⏸' : '▶'}</button>`;
  }
  function draw(){
    if(phase === 'react') return drawReact();
    dlg(`${head('🗣️ ' + (node.label || 'Your turn — say it out loud'), 'turn')}
      <div class="ep4-sp">
        ${ctx ? `<div class="ep4-sp-ctx">${esc(ctx)}</div>${uaDiv(ctxUa)}` : ''}
        <div class="ep4-sp-q">${asker ? `<span class="ep4-sp-who" style="--c:${asker.color}">${esc(asker.name)}</span>` : ''}<span class="ep4-sp-qt">${esc(prompt)}</span>
          ${node.who && Voice.available() ? `<button type="button" class="ep1-tool" data-sp4="repeat" aria-label="Repeat the question" title="Repeat the question">🔁</button>` : ''}</div>
        ${uaDiv(ua)}
        <div class="ep4-sp-meta"><span>🗣️ Say it out loud${node.secs ? ` · about ${esc(node.secs)}` : ''}</span>${timerHTML()}</div>
        <div class="ep4-sp-hints" aria-live="polite">${hintsHTML()}</div>
        <div class="ep4-sp-type" ${typing ? '' : 'hidden'}><textarea class="ep1-ta" rows="2" maxlength="900" placeholder="Type your answer in English…" aria-label="Your answer">${esc(f['draft_' + node.key] || '')}</textarea><div class="ep1-count"></div></div>
        <div class="ep4-sp-rec" hidden></div>
        <div class="ep1-row"><div class="ep1-tools">
          ${shown < levels.length ? `<button type="button" class="ep1-btn ep1-btn-ghost" data-sp4="hint">💡 Hint ${shown + 1}/${levels.length}: ${HINT_NAMES[levels[shown]].replace(/^\S+ /, '')}</button>` : ''}
          ${shown ? `<button type="button" class="ep1-btn ep1-btn-ghost" data-sp4="hide">🙈 Hide hints</button>` : ''}
          ${ua ? uaBtn() : ''}
          ${canRecord() && !typing ? `<button type="button" class="ep1-btn ep1-btn-ghost" data-sp4="rec" ${rec ? 'hidden' : ''}>🎙️ Record myself</button>` : ''}
          <button type="button" class="ep1-btn ep1-btn-ghost" data-sp4="type" aria-pressed="${typing}">${typing ? '🗣️ Say it instead' : '⌨️ Type instead'}</button>
          ${(node.vocab || []).filter(v => P(v)).map(v => `<button type="button" class="ep1-chip" data-vocab="${v}">💬 ${esc(P(v).en)}</button>`).join('')}
        </div><button type="button" class="ep1-next" data-primary>${typing ? 'Done ✓' : '✓ I said it'}</button></div>
      </div>`, 'k-answer k-sp4');
    const box = EP.dlg.querySelector('.ep4-sp');
    const ta = box.querySelector('textarea');
    ta.addEventListener('input', () => { f['draft_' + node.key] = ta.value.slice(0, 900); upd(); });
    upd();
    primary(done);
  }
  function upd(){
    const ta = EP.dlg.querySelector('.ep4-sp textarea'), btn = EP.dlg.querySelector('.ep4-sp [data-primary]'); if(!ta || !btn) return;
    const n = wordCount(ta.value);
    const c = EP.dlg.querySelector('.ep4-sp .ep1-count'); if(c) c.textContent = typing && n ? `${n} word${n === 1 ? '' : 's'}${n < minW ? ' · a little more, please' : ''}` : '';
    btn.disabled = typing ? n < minW : false;
  }
  function onClick(e){
    if(tok !== EP.token) return;
    const b = e.target.closest('[data-sp4]');
    if(b){
      const a = b.dataset.sp4;
      if(a === 'hint') api.hint();
      if(a === 'hide') api.hide();
      if(a === 'repeat') api.repeat();
      if(a === 'model') Voice.speak('you', model);
      if(a === 'timer'){ running ? stopTimer() : startTimer(); const t = EP.dlg.querySelector('.ep4-timer'); if(t) t.outerHTML = timerHTML(); }
      if(a === 'rec'){ const host = EP.dlg.querySelector('.ep4-sp-rec'); host.hidden = false; b.hidden = true; rec = makeRecorder(host, { minSec:1 }); }
      if(a === 'type'){ typing = !typing; if(typing && rec){ rec.destroy(); rec = null; } draw(); if(typing){ const ta = EP.dlg.querySelector('.ep4-sp textarea'); ta && ta.focus(); } }
      return;
    }
    const s = e.target.closest('[data-st]');
    if(s){ const ta = EP.dlg.querySelector('.ep4-sp textarea'); ta.value = (ta.value ? ta.value.trimEnd() + ' ' : '') + s.dataset.st.replace(/…$/, ' '); ta.focus(); ta.dispatchEvent(new Event('input')); return; }
    const r = e.target.closest('[data-react]');
    if(r){ pickReaction(r.dataset.react === 'skip' ? null : +r.dataset.react); }
  }
  EP.dlg.addEventListener('click', onClick);
  function startTimer(){ if(running) return; running = true; let last = Date.now();
    tick = setInterval(() => { const now = Date.now(); if(!EP.paused) secs += (now - last) / 1000; last = now;
      const t = EP.dlg.querySelector('.ep4-timer b'); if(t) t.textContent = fmtTime(secs);
      if(node.timer && secs >= node.timer && !api.chimed){ api.chimed = true; Sound.sfx('good'); const tb = EP.dlg.querySelector('.ep4-timer'); tb && tb.classList.add('full'); } }, 250); }
  function stopTimer(){ running = false; clearInterval(tick); }
  function done(){
    if(tok !== EP.token || finished) return;
    const ta = EP.dlg.querySelector('.ep4-sp textarea');
    if(typing && wordCount(ta.value) < minW){ primary(done); const btn = EP.dlg.querySelector('[data-primary]'); if(btn) btn.disabled = false; return; }
    stopTimer();
    const s = st();
    const text = typing ? ta.value.trim().slice(0, 900) : '';
    s.answers[node.key] = typing ? { mode:'text', text, hints:maxShown } : rec && rec.ready ? { mode:'voice', seconds:Math.round(rec.seconds), hints:maxShown } : { mode:'spoken', hints:maxShown, seconds: secs ? Math.round(secs) : undefined };
    if(rec){ if(rec.ready) toast('🎙️', 'Speaking practice saved', `${Math.round(rec.seconds)}s recorded on this device`); rec.destroy(); rec = null; }
    delete f['draft_' + node.key];
    taskDone(node.key); save(true); Sound.sfx('soft');
    if(node.reactions && node.reactions.length){ phase = 'react'; if(typing) return showLine({ type:'say', who:'you', text }, () => drawReact()); return drawReact(); }
    finished = true; finish(null, text);
  }
  function drawReact(){
    phase = 'react';
    dlg(`${head('💬 How does Emily react?', 'turn')}
      <div class="ep4-react-q">Pick what fits what you said. <small>(Teacher: choose the closest one.)</small></div>${uaDiv('Обери варіант, який підходить до твоєї відповіді.')}
      <div class="ep4-react">${node.reactions.map((r, i) => `<button type="button" class="ep1-opt ep4-react-b" data-react="${i}"><span class="ep1-emo" aria-hidden="true">${r.icon}</span><span class="ep1-opt-t">${esc(r.label)}</span></button>`).join('')}</div>
      <div class="ep1-row"><div class="ep1-tools">${uaBtn()}</div><button type="button" class="ep1-btn ep1-btn-ghost" data-react="skip">Skip ▸</button></div>`, 'k-choice');
  }
  function pickReaction(i){
    if(finished) return; finished = true;
    const s = st(); if(s.answers[node.key]) s.answers[node.key].reaction = i;
    save(true);
    finish(i == null ? null : node.reactions[i]);
  }
  function finish(r, text){
    EP.dlg.removeEventListener('click', onClick);
    CUR = null; Teacher.sync();
    const after = r ? { who:node.who || 'emily', text:r.text, ua:r.ua } : valOf(node.after, f);
    const then = () => after ? showLine({ type:'say', who:after.who, text:valOf(after.text, f), ua:valOf(after.ua, f), vocab:after.vocab }, () => next(node, id)) : next(node, id);
    if(text && !(node.reactions && node.reactions.length)) showLine({ type:'say', who:'you', text }, then); else then();
  }
  const api = {
    kind:'speak', chimed:false,
    get level(){ return shown; }, get levels(){ return levels.length; },
    hint(){ if(phase !== 'speak' || shown >= levels.length) return; shown++; maxShown = Math.max(maxShown, shown); Sound.sfx('soft'); draw(); },
    hide(){ if(phase !== 'speak' || !shown) return; shown = 0; draw(); },
    repeat(){ if(node.who) Voice.speak(node.who, prompt.replace(/[“”"]/g, '')); },
    done(){ if(phase === 'speak') done(); else pickReaction(null); },
    destroy(){ stopTimer(); if(rec){ rec.destroy(); rec = null; } EP.dlg.removeEventListener('click', onClick); }
  };
  setCur(api);
  draw();
  if(node.who && node.speakPrompt && SET.voice && SET.sound) setTimeout(() => { if(tok === EP.token && phase === 'speak') api.repeat(); }, 350);
};

/* ---------- a quiz inside the phone (Scene 1: what does Emily want?) ---------- */
function phoneQuiz(cfg){
  return function(ctx){
    if(ctx.s.tasks.includes(cfg.key)) return Promise.resolve();
    return new Promise(res => {
      let wrong = 0; const tried = new Set();
      const draw = fb => {
        const foot = ctx.foot(`<div class="ep1-ph-q">🤔 ${esc(cfg.q)}<small class="ep1-oua" ${SET.ua ? '' : 'hidden'}>${esc(cfg.qua)}</small></div>
          <div class="ep1-opts ep1-ph-opts">${cfg.options.map((o, i) => `<button type="button" class="ep1-opt ${tried.has(i) ? 'tried' : ''} ${wrong >= 2 && o.correct ? 'hint-pulse' : ''}" data-i="${i}" ${tried.has(i) ? 'disabled' : ''}><span class="ep1-k" aria-hidden="true">${String.fromCharCode(65 + i)}</span><span class="ep1-opt-t">${esc(o.text)}</span></button>`).join('')}</div>
          <div class="ep1-fb" aria-live="polite">${fb || ''}</div>`);
        foot.onclick = e => {
          const b = e.target.closest('[data-i]'); if(!b || b.disabled || ctx.tok !== EP.token) return;
          const o = cfg.options[+b.dataset.i];
          if(o.correct){
            foot.onclick = null; taskDone(cfg.key); ctx.s.answers[cfg.key] = { tries: wrong + 1 }; Sound.sfx('good'); save(true);
            ctx.foot(`<div class="ep1-good">✓ ${esc(cfg.good)}</div>`); setTimeout(res, isReduced() ? 300 : 1000); return;
          }
          wrong++; tried.add(+b.dataset.i); Sound.sfx('soft');
          draw(`<div class="ep1-hint">💡 ${esc(o.hint || 'Read the message again.')}</div>${wrong >= 2 ? `<div class="ep1-hint ua">🇺🇦 ${esc(cfg.ua)}</div>` : ''}`);
        };
        const first = foot.querySelector('.ep1-opt:not([disabled])'); first && first.focus({ preventScroll:true });
      };
      draw('');
    });
  };
}
/* ---------- Emily shares the location: a little route on the phone ---------- */
function phonePin(ctx){
  if(ctx.hasMsg(ctx.tid, 'e4s1e5')) return Promise.resolve();
  ctx.pushChat(ctx.tid, { id:'e4s1e5', from:'them', text:'📍 Shared a location: Corner Cup Coffee · 8 min walk from you', time:ctx.clock });
  ctx.renderThread(); Sound.sfx('notify'); save(true);
  return new Promise(res => {
    const foot = ctx.foot(`${READY_PROPS.includes('pin-card') ? `<div class="ep4-pin ep4-pin-ph"><img src="${PHOTO_BASE}props/pin-card.webp" alt="Corner Cup Coffee — 8 minutes on foot: straight, then left at the traffic lights." draggable="false"></div>` : `<div class="ep4-pin">
      <svg viewBox="0 0 300 150" class="ep4-pin-svg" role="img" aria-label="A walking route from the Miller house to Corner Cup: straight, then left at the traffic lights.">
        <rect width="300" height="150" rx="14" fill="#eef2e6"/><path d="M150 140 V18 M20 60 H280" stroke="#fff" stroke-width="18"/><path d="M150 140 V18 M20 60 H280" stroke="#d9dccf" stroke-width="2" stroke-dasharray="6 6"/>
        <path class="ep4-pin-route" d="M150 132 V60 H60" stroke="#FF8A3D" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="6 9"/>
        <circle cx="150" cy="132" r="9" fill="#5ab6f9" stroke="#fff" stroke-width="3"/><text x="164" y="137" font-size="12" font-weight="700" fill="#243447" ${FONT}>You</text>
        <circle cx="158" cy="60" r="6" fill="#5be37a"/><path d="M60 60 m0 -24 a14 14 0 0 1 14 14 c0 10 -14 22 -14 22 s-14 -12 -14 -22 a14 14 0 0 1 14 -14Z" fill="#FF8A3D"/><text x="52" y="30" font-size="12" font-weight="800" fill="#243447" ${FONT}>Corner Cup ☕</text>
      </svg><div class="ep4-pin-t"><b>Corner Cup Coffee</b><small>🚶 8 min · straight, then left at the lights</small></div></div>`}
      <button type="button" class="ep1-next ep1-ph-end" data-pin>Got it ▸</button>`);
    const b = foot.querySelector('[data-pin]'); b.focus({ preventScroll:true });
    b.addEventListener('click', () => res(), { once:true });
  });
}

/* =========================================================================
   SCENE 2 — the route mini-map. A simple teaching map, not a real map.
   ========================================================================= */
const ROUTES = [
  { k:'r1', name:'Route 1', color:'#5ab6f9', d:'M300 372 V282 H96', end:[96, 282],
    why:"Route 1 turns left too early — at Elm Street, BEFORE the traffic lights. She said: “turn left AT the traffic lights.”",
    ua:"Маршрут 1 повертає ліворуч зарано — на Елм-стріт, ще ДО світлофора." },
  { k:'r2', name:'Route 2', color:'#FF8A3D', d:'M300 372 V172 H150', end:[150, 172], ok:true },
  { k:'r3', name:'Route 3', color:'#6dbb75', d:'M300 372 V172 H478', end:[478, 172],
    why:"Route 3 turns RIGHT at the traffic lights. Listen again: “turn LEFT at the traffic lights.”",
    ua:"Маршрут 3 на світлофорі повертає ПРАВОРУЧ, а треба ЛІВОРУЧ." }
];
const DIRECTIONS = "Go straight, turn left at the traffic lights, and it's on the corner — right across from the bookstore. It's next to a little flower shop.";
/* the same three routes on the photographed map (photos/props/route-map.webp, 1536 × 1024) */
const ROUTE_PH = { r1:{ d:'M768 905 V700 H252', end:[252, 697] }, r2:{ d:'M768 905 V398 H365', end:[365, 392] }, r3:{ d:'M768 905 V398 H1175', end:[1175, 390] } };
function routeMapPhoto(sel, walked){
  return `<svg viewBox="0 0 1536 1024" class="ep4-route-svg ep4-route-ph" role="img" aria-label="A simple game map with three routes from your house. Route 2 goes straight to the traffic lights and turns left to Corner Cup, across from the bookstore.">
    <image href="${PHOTO_BASE}props/route-map.webp" width="1536" height="1024"/>
    ${sel && !walked ? `<rect width="1536" height="1024" fill="#0b1420" opacity=".22"/>` : ''}
    ${ROUTES.map(r => { const p = ROUTE_PH[r.k], on = sel === r.k; return `
      ${on ? `<path d="${p.d}" stroke="#fff" stroke-width="38" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".95"/>
      <path class="ep4-rt sel ${walked && r.ok ? 'walked' : ''}" d="${p.d}" stroke="${r.color}" stroke-width="22" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <circle class="ep4-rt-end" cx="${p.end[0]}" cy="${p.end[1]}" r="34" fill="${r.color}" stroke="#fff" stroke-width="8"/>
      <text x="${p.end[0]}" y="${p.end[1] + 14}" text-anchor="middle" font-size="40" font-weight="800" fill="#fff" ${FONT}>${r.name.replace('Route ', '')}</text>` : ''}
      <path d="${p.d}" stroke="transparent" stroke-width="70" fill="none" data-rt="${r.k}" class="ep4-rt-hit"/>
      <circle cx="${p.end[0]}" cy="${p.end[1]}" r="46" fill="transparent" data-rt="${r.k}" class="ep4-rt-hit"/>`; }).join('')}
    ${walked ? `<circle r="24" fill="#FF8A3D" stroke="#fff" stroke-width="8" class="ep4-walker"><animateMotion dur="${isReduced() ? '0.01s' : '2.2s'}" fill="freeze" path="${ROUTE_PH.r2.d}"/></circle>` : ''}
  </svg>`;
}
function routeMap(sel, walked){
  if(READY_PROPS.includes('route-map')) return routeMapPhoto(sel, walked);
  const lbl = (x, y, t, a = 'middle', c = '#5d6b7d') => `<text x="${x}" y="${y}" text-anchor="${a}" font-size="12.5" font-weight="700" fill="${c}" ${FONT}>${t}</text>`;
  return `<svg viewBox="0 0 600 400" class="ep4-route-svg" role="img" aria-label="A simple map with three routes from your house. Route 2 goes straight to the traffic lights and turns left to the corner by the bookstore.">
    <rect width="600" height="400" rx="20" fill="#eef2e6"/>
    ${[[40,40,200,90],[360,40,200,90],[40,200,200,60],[360,200,200,140],[40,300,200,70]].map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="#dfe6d2"/>`).join('')}
    <g stroke="#fff" stroke-width="30" stroke-linecap="round"><path d="M300 392 V20"/><path d="M30 172 H570"/><path d="M60 282 H300"/></g>
    <g stroke="#d4d9cb" stroke-width="2" stroke-dasharray="8 8" fill="none"><path d="M300 392 V20"/><path d="M30 172 H570"/><path d="M60 282 H300"/></g>
    ${lbl(318, 330, 'Maple Ave', 'start')}${lbl(560, 162, 'Rose St', 'end')}${lbl(70, 272, 'Elm St', 'start')}
    <g transform="translate(300 172)"><rect x="-12" y="-28" width="24" height="56" rx="7" fill="#2a2d33"/><circle cy="-16" r="6" fill="#e05a4a"/><circle cy="0" r="6" fill="#e2b04a"/><circle cy="16" r="6" fill="#5be37a"/></g>
    ${lbl(340, 214, '🚦 traffic lights', 'start', '#243447')}
    <g><rect x="96" y="92" width="96" height="62" rx="8" fill="#fff4e4" stroke="#FF8A3D" stroke-width="3"/><text x="144" y="120" text-anchor="middle" font-size="22">☕</text>${lbl(144, 144, 'Corner Cup', 'middle', '#7a4a2a')}</g>
    <g><rect x="196" y="98" width="64" height="56" rx="8" fill="#fde9ef"/><text x="228" y="126" text-anchor="middle" font-size="20">🌸</text>${lbl(228, 146, 'Flowers', 'middle', '#a0506a')}</g>
    <g><rect x="96" y="192" width="110" height="60" rx="8" fill="#e3e8f5" stroke="#2f3f63" stroke-width="2"/><text x="151" y="218" text-anchor="middle" font-size="20">📚</text>${lbl(151, 240, 'Bookstore', 'middle', '#2f3f63')}</g>
    <g><rect x="420" y="96" width="100" height="58" rx="8" fill="#eef0f2"/><text x="470" y="122" text-anchor="middle" font-size="20">🧺</text>${lbl(470, 144, 'Laundromat')}</g>
    <g><rect x="60" y="300" width="80" height="54" rx="8" fill="#d6ecd0"/><text x="100" y="326" text-anchor="middle" font-size="20">🌳</text>${lbl(100, 346, 'Park')}</g>
    ${ROUTES.map(r => `<path class="ep4-rt ${sel === r.k ? 'sel' : ''} ${walked && r.ok ? 'walked' : ''}" data-rt="${r.k}" d="${r.d}" stroke="${r.color}" stroke-width="${sel === r.k ? 9 : 6}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="${!sel || sel === r.k ? 1 : .35}"/>
      <circle cx="${r.end[0]}" cy="${r.end[1]}" r="9" fill="${r.color}" stroke="#fff" stroke-width="3" opacity="${!sel || sel === r.k ? 1 : .35}"/>
      <text x="${r.end[0]}" y="${r.end[1] + (r.k === 'r1' ? 26 : -16)}" text-anchor="middle" font-size="13" font-weight="800" fill="${r.color}" stroke="#fff" stroke-width="4" paint-order="stroke" ${FONT}>${r.name.replace('Route ', '')}</text>
      <path d="${r.d}" stroke="transparent" stroke-width="28" fill="none" data-rt="${r.k}" class="ep4-rt-hit"/>`).join('')}
    <g transform="translate(300 372)"><circle r="14" fill="#5ab6f9" stroke="#fff" stroke-width="4"/><text y="5" text-anchor="middle" font-size="13">🏡</text></g>
    ${lbl(318, 392, 'You · Miller House', 'start', '#243447')}
    ${walked ? `<circle r="10" fill="#FF8A3D" stroke="#fff" stroke-width="4" class="ep4-walker"><animateMotion dur="${isReduced() ? '0.01s' : '2.2s'}" fill="freeze" path="M300 372 V172 H150"/></circle>` : ''}
    ${lbl(590, 22, 'Simple game map — not a real map of LA', 'end', '#8a96a6')}
  </svg>`;
}
RENDER.route = function(node, id, tok){
  const f = flags();
  let sel = null, wrong = 0, done = false, showText = SET.subs && !SET.challenge;
  const tried = new Set();
  const g = showGame('g-route');
  function draw(fb){
    g.innerHTML = `<div class="ep4-route">
      <div class="ep4-route-map">${routeMap(sel, done)}</div>
      <div class="ep4-route-side">
        <div class="ep4-dir"><div class="ep1-eyebrow">🗣️ What the neighbor said</div>
          <div class="ep4-dir-row">${Voice.available() ? `<button type="button" class="ep1-btn" data-rt-a="play">🔊 Listen</button><button type="button" class="ep1-btn ep1-btn-ghost" data-rt-a="slow">🐢 Slower</button>` : ''}
            <button type="button" class="ep1-btn ep1-btn-ghost" data-rt-a="text">${showText ? 'Hide text' : '📝 Show text'}</button></div>
          ${showText || !Voice.available() ? `<p class="ep4-dir-t">“${esc(DIRECTIONS)}”</p>` : ''}</div>
        <div class="ep1-eyebrow">Which route matches her directions?</div>
        <div class="ep4-rt-btns">${ROUTES.map(r => `<button type="button" class="ep4-rt-b ${sel === r.k ? 'on' : ''} ${tried.has(r.k) ? 'tried' : ''}" data-rt="${r.k}" style="--c:${r.color}" ${done || tried.has(r.k) ? 'disabled' : ''}><i aria-hidden="true"></i>${esc(r.name)}</button>`).join('')}</div>
        <div class="ep1-fb" aria-live="polite">${fb || ''}</div>
        ${done ? '' : `<button type="button" class="ep1-next" data-rt-a="go" ${sel ? '' : 'disabled'}>🚶 Take this route</button>`}
      </div></div>`;
  }
  let lastFb = '';
  g.onclick = e => {
    if(tok !== EP.token || done) return;
    const a = e.target.closest('[data-rt-a]');
    if(a){
      const k = a.dataset.rtA;
      if(k === 'play') Voice.speak('local4', DIRECTIONS);
      if(k === 'slow') Voice.speak('local4', DIRECTIONS, { slow:true });
      if(k === 'text'){ showText = !showText; draw(lastFb); }
      if(k === 'go' && sel) check();
      return;
    }
    const r = e.target.closest('[data-rt]');
    if(r && !tried.has(r.dataset.rt)){ sel = r.dataset.rt; Sound.sfx('soft'); draw(lastFb); }
  };
  function check(){
    const r = ROUTES.find(x => x.k === sel);
    if(r.ok){
      done = true; Sound.sfx('good'); taskDone(node.key);
      st().answers[node.key] = { tries: wrong + 1 }; f.routeTries = wrong + 1; save(true);
      lastFb = `<div class="ep1-good">✓ Straight → left at the lights → on the corner, across from the bookstore. That's it!</div>`;
      draw(lastFb);
      setTimeout(() => {
        if(tok !== EP.token) return;
        thinkLine("There it is — Corner Cup. Orange awning, right across from the bookstore. And next to the flower shop.", "Ось вона — Corner Cup. Помаранчевий тент, якраз навпроти книгарні. І поруч із квітковою крамничкою.", 'Continue ▸');
        primary(() => next(node, id));
      }, isReduced() ? 100 : 2300);
      return;
    }
    wrong++; tried.add(sel); sel = null; Sound.sfx('soft');
    lastFb = `<div class="ep1-hint">💡 ${esc(r.why)}</div>${uaDiv(r.ua)}${wrong >= 2 ? `<div class="ep1-hint ua">🇺🇦 Прямо → на світлофорі ліворуч → кав'ярня на розі, навпроти книгарні.</div>` : ''}`;
    if(wrong >= 1) showText = true;
    draw(lastFb);
  }
  thinkLine("Which route matches her directions? Tap a route on the map — or listen again.", "Який маршрут відповідає її поясненню? Торкнись маршруту на мапі — або послухай ще раз.");
  draw('');
};

/* =========================================================================
   SCENE 2 → 3 — through the door
   ========================================================================= */
RENDER.door = function(node, id, tok){
  hideDlg(); hideGame();
  visitCafe();
  EP.cine.hidden = false; EP.cine.className = 'ep1-cine ep4-door-cine';
  EP.cine.innerHTML = `<div class="ep4-door" aria-hidden="true"><div class="ep4-door-in"></div><div class="ep4-door-l"><span class="ep4-door-sign">OPEN</span></div><div class="ep4-door-r"></div></div>
    <button type="button" class="ep1-skip" data-primary>Skip ▸</button>`;
  Sound.sfx('door'); setTimeout(() => { if(tok === EP.token) Sound.sfx('bell'); }, 420);
  requestAnimationFrame(() => requestAnimationFrame(() => { const d = EP.cine.querySelector('.ep4-door'); d && d.classList.add('open'); }));
  let gone = false;
  const go = () => { if(gone || tok !== EP.token) return; gone = true; EP.cine.hidden = true; EP.cine.innerHTML = ''; EP.cine.className = 'ep1-cine'; next(node, id); };
  EP.cine.querySelector('[data-primary]').addEventListener('click', go, { once:true });
  setTimeout(go, isReduced() ? 500 : 1900);
};

/* =========================================================================
   SCENE 3 — the menu: drink, size, milk → a natural order sentence
   ========================================================================= */
/* the rows of the photographed menu board (photos/props/menu.webp): top and height in % */
const MENU_ROWS = [[22.5, 12.5], [36.5, 12.5], [50.5, 13], [65, 12.5]];
RENDER.order = function(node, id, tok){
  const f = flags();
  const o = f.orderDraft = Object.assign({ drink:null, size:null, milk:null, style:'like' }, f.orderDraft || {}, coffee(f).drink ? { drink:coffee(f).drink, size:coffee(f).size, milk:coffee(f).milk } : {});
  const g = showGame('g-order');
  const ready = () => { const d = drinkOf(o); return !!(d && o.size && (!d.milk || o.milk)); };
  function draw(){
    const d = drinkOf(o);
    const sentence = ready() ? orderSentence(o, o.style) : '';
    g.innerHTML = `<div class="ep4-menu">
      ${READY_PROPS.includes('menu') ? `<div class="ep4-menu-ph"><img src="${PHOTO_BASE}props/menu.webp" alt="" draggable="false">
        ${MENU.map((m, i) => `<button type="button" class="ep4-mrow ${o.drink === m.id ? 'on' : ''}" data-drink="${m.id}" aria-pressed="${o.drink === m.id}" aria-label="${esc(m.name)}, $${m.price}" style="--t:${MENU_ROWS[i][0]};--hh:${MENU_ROWS[i][1]}"></button>`).join('')}</div>` : `
      <div class="ep4-menu-card">
        <div class="ep4-menu-top">☕ CORNER CUP<small>coffee · tea · good company</small></div>
        ${MENU.map(m => `<button type="button" class="ep4-mi ${o.drink === m.id ? 'on' : ''}" data-drink="${m.id}" aria-pressed="${o.drink === m.id}">
          <span class="ep4-mi-i" aria-hidden="true">${m.icon}</span><span class="ep4-mi-n">${esc(m.name)}<small>${esc(m.desc)}</small></span><span class="ep4-mi-p">$${m.price}</span></button>`).join('')}
        <div class="ep4-menu-note">Fictional menu · prices are the same for every size</div>
      </div>`}
      <div class="ep4-menu-side">
        <div class="ep1-eyebrow">Size</div>
        <div class="ep4-seg" role="group" aria-label="Size">${SIZES.map((z, i) => `<button type="button" class="ep4-seg-b ${o.size === z ? 'on' : ''}" data-size="${z}" aria-pressed="${o.size === z}" ${d ? '' : 'disabled'}><span class="ep4-cupi" style="--k:${.7 + i * .2}" aria-hidden="true">🥤</span>${cap1(z)}</button>`).join('')}</div>
        <div class="ep1-eyebrow">Milk</div>
        ${!d ? `<p class="ep1-mini">Choose a drink first.</p>`
          : d.milk ? `<div class="ep4-seg" role="group" aria-label="Milk">${Object.entries(MILKS).map(([k, v]) => `<button type="button" class="ep4-seg-b ${o.milk === k ? 'on' : ''}" data-milk="${k}" aria-pressed="${o.milk === k}">${k === 'oat' ? '🌾' : '🥛'} ${cap1(v)}</button>`).join('')}</div>`
          : `<p class="ep4-nomilk">🍋 Iced tea doesn't come with milk — nothing to choose here.</p>`}
        <div class="ep4-sent ${ready() ? 'ok' : ''}" aria-live="polite">
          <div class="ep4-sent-top"><span class="ep1-eyebrow">Your order in English</span>
            <span class="ep4-seg ep4-seg-sm" role="group" aria-label="Sentence style"><button type="button" class="ep4-seg-b ${o.style === 'like' ? 'on' : ''}" data-style="like">I'd like…</button><button type="button" class="ep4-seg-b ${o.style === 'can' ? 'on' : ''}" data-style="can">Can I get…?</button></span></div>
          ${ready() ? `<p class="ep4-sent-t">“${esc(sentence)}”</p>` : `<p class="ep1-mini">${!d ? 'Pick a drink from the menu.' : !o.size ? 'Now choose a size.' : 'Regular or oat milk?'}</p>`}
          ${ready() && Voice.available() ? `<button type="button" class="ep1-btn ep1-btn-ghost" data-ord="listen">🔊 Listen</button>` : ''}
          ${d ? `<div class="ep4-sent-p">Total: <b>$${d.price}</b></div>` : ''}
        </div>
        <button type="button" class="ep1-next" data-ord="ok" ${ready() ? '' : 'disabled'}>✓ That's my order</button>
      </div></div>`;
  }
  g.onclick = e => {
    if(tok !== EP.token) return;
    const t = e.target.closest('button'); if(!t || t.disabled) return;
    if(t.dataset.drink){ o.drink = t.dataset.drink; if(!drinkOf(o).milk) o.milk = null; Sound.sfx('soft'); }
    else if(t.dataset.size){ o.size = t.dataset.size; Sound.sfx('soft'); }
    else if(t.dataset.milk){ o.milk = t.dataset.milk; Sound.sfx('soft'); }
    else if(t.dataset.style){ o.style = t.dataset.style; }
    else if(t.dataset.ord === 'listen'){ Voice.speak('you', orderSentence(o, o.style)); return; }
    else if(t.dataset.ord === 'ok' && ready()){
      const d = drinkOf(o);
      f.coffeeOrder = { drink:o.drink, size:o.size, milk: d.milk ? o.milk : null, price:d.price, sentence: orderSentence(o, 'like') };
      delete f.orderDraft;
      st().answers[node.key] = Object.assign({}, f.coffeeOrder); taskDone(node.key); save(true); Sound.sfx('good');
      hideGame(); return next(node, id);
    } else return;
    save(); draw();
  };
  thinkLine("The menu! Pick a drink, a size and the milk. You'll see how to say it.", "Меню! Обери напій, розмір і молоко. Ти побачиш, як це сказати.");
  draw();
};

/* ---------- Scene 3: the name on the cup ---------- */
RENDER.cup = function(node, id, tok){
  const g = showGame('g-cup');
  g.innerHTML = READY_PROPS.includes('cup')
    ? `<div class="ep4-cup ep4-cup-ph" role="img" aria-label="Your cup. The name on it says: ${esc(cupName())}"><img src="${PHOTO_BASE}props/cup.webp" alt="" draggable="false"><span class="ep4-cupname">${esc(cupName())}</span></div>`
    : `<div class="ep4-cup">${cupSVG(cupName())}</div>`;
  Sound.sfx('soft');
  thinkLine(`…Wait. That's my drink. But “${cupName()}” is NOT my name.`, "…Стоп. Це мій напій. Але це точно НЕ моє ім'я.", 'Continue ▸');
  primary(() => { if(tok !== EP.token) return; hideGame(); next(node, id); });
};

/* =========================================================================
   QUESTIONS FOR EMILY (Scene 4: about her · Scene 7: about the plan)
   The student asks OUT LOUD, then taps the question they asked — Emily
   answers. Her plan answers never invent times or transport: nothing is
   decided yet (Episode 5 will say).
   ========================================================================= */
const PLAN_ANSWERS = {
  time:  { q:"What time are we meeting?", icon:'🕐', a:"Not sure yet! Probably sometime in the afternoon? I'll text you once everyone decides.", ua:"Ще не знаю! Мабуть, десь по обіді? Напишу, щойно всі вирішать." },
  where: { q:"Where should we meet?", icon:'📍', a:"Good question. Maybe at the pier? Or I could walk over to the Millers' first. I'll let you know.", ua:"Гарне питання. Може, біля пірса? Або я можу спершу зайти до Міллерів. Я дам знати." },
  bring: { q:"What should I bring?", icon:'🎒', a:"Sunscreen. Seriously. And maybe a hoodie — it gets cold by the water in the evening.", ua:"Сонцезахисний крем. Серйозно. І, може, худі — увечері біля води холодно." },
  how:   { q:"How are we getting there?", icon:'🚌', a:"No idea yet! Someone's mom might drive us… or we take the bus. I'll keep you posted!", ua:"Поки не знаю! Може, чиясь мама підвезе… або поїдемо автобусом. Я триматиму тебе в курсі!", vocab:'keep-me-posted' }
};
const PLAN_OWN = { a:"Ooh, good question. I don't know yet — I'll find out and text you!", ua:"О, гарне питання. Поки не знаю — дізнаюся й напишу!" };
RENDER.askq = function(node, id, tok){
  const f = flags();
  const BANK = node.plan ? PLAN_ANSWERS : EMILY_ANSWERS;
  const keyList = 'asked_' + node.key;
  const asked = new Set(f[keyList] || []);
  let cur = null, helpOpen = false;
  const g = showGame('g-askq');
  const min = node.min || 2;
  function draw(){
    const n = asked.size;
    g.innerHTML = `<div class="ep4-ask">
      <div class="ep4-ask-h"><span>🙋 ${esc(node.title || 'Ask Emily')}</span><span class="ep4-ask-n ${n >= min ? 'ok' : ''}">${Math.min(n, 9)}/${min}</span></div>
      <p class="ep4-ask-how">Say a question <b>out loud</b> — then tap it to hear Emily's answer.</p>
      <div class="ep4-ask-grid">${node.bank.map(k => { const x = BANK[k]; return `<button type="button" class="ep4-aq ${asked.has(k) ? 'done' : ''} ${cur === k ? 'cur' : ''}" data-q="${k}"><span class="ep4-aq-i" aria-hidden="true">${x.icon}</span><span>${esc(x.q)}</span>${asked.has(k) ? '<b class="ep4-aq-ok" aria-label="asked">✓</b>' : ''}</button>`; }).join('')}
        <button type="button" class="ep4-aq own ${asked.has('own') ? 'done' : ''} ${cur === 'own' ? 'cur' : ''}" data-q="own"><span class="ep4-aq-i" aria-hidden="true">🗣️</span><span>My own question (out loud)</span>${asked.has('own') ? '<b class="ep4-aq-ok">✓</b>' : ''}</button></div>
      ${cur ? `<div class="ep4-ask-a"><b>Emily:</b> ${esc(cur === 'own' ? (node.plan ? PLAN_OWN : EMILY_OWN).a : BANK[cur].a)}${uaDiv(cur === 'own' ? (node.plan ? PLAN_OWN : EMILY_OWN).ua : BANK[cur].ua)}
        ${cur === 'own' ? `<small class="ep1-mini">👩‍🏫 Teacher: you can answer as Emily, too!</small>` : ''}</div>` : ''}
      <div class="ep4-ask-foot"><button type="button" class="ep1-btn ep1-btn-ghost" data-ask-help>${helpOpen ? 'Hide' : '💡 Question starters'}</button>
        ${helpOpen ? `<div class="ep4-chips">${["What do you…?","Have you ever…?","What's your favorite…?","How did you…?","Do you like…?"].map(s => `<span class="ep1-chip ep1-chip-static">${esc(s)}</span>`).join('')}</div>` : ''}</div>
    </div>`;
  }
  g.onclick = e => {
    if(tok !== EP.token) return;
    if(e.target.closest('[data-ask-help]')){ helpOpen = !helpOpen; draw(); return; }
    const b = e.target.closest('[data-q]'); if(!b) return;
    const k = b.dataset.q; cur = k; asked.add(k); f[keyList] = Array.from(asked);
    const x = k === 'own' ? (node.plan ? PLAN_OWN : EMILY_OWN) : BANK[k];
    if(!node.plan && k !== 'own'){ f.emilyFacts = Array.from(new Set((f.emilyFacts || []).concat(k))); syncEmilyCard(); }
    if(k === 'jake' && !f.askedJake){ f.askedJake = true; setTimeout(() => toast('🔎', 'Clue', 'Emily and Jake go to the same school.'), 900); }
    if(x.vocab) addPhrase(x.vocab);
    Sound.sfx('soft'); save(); draw();
    if(SET.voice && SET.sound) Voice.speak('emily', x.a);
    foot();
  };
  function foot(){
    const n = asked.size;
    thinkLine(n >= min ? "Nice — that's a real conversation. Ask more if you like, or continue." : `Ask Emily at least ${min} questions. Say each one out loud first!`,
              n >= min ? "Чудово — це справжня розмова. Можеш спитати ще або продовжити." : `Постав Емілі щонайменше ${min} запитання. Спершу скажи кожне вголос!`, n >= min ? 'Continue ▸' : null);
    if(n >= min) primary(() => { if(tok !== EP.token) return; st().answers[node.key] = { asked: Array.from(asked) }; taskDone(node.key); save(true); hideGame(); next(node, id); });
  }
  setCur({ kind:'ask', hint(){ helpOpen = true; draw(); }, hide(){ helpOpen = false; draw(); }, repeat(){ if(cur) Voice.speak('emily', cur === 'own' ? (node.plan ? PLAN_OWN : EMILY_OWN).a : BANK[cur].a); }, done(){ const b = EP.dlg.querySelector('[data-primary]'); if(b) b.click(); else toast('🙋', `Ask at least ${min} questions first`, ''); } });
  draw(); foot();
};

/* =========================================================================
   SCENE 5 — Emily's photos: choose where to go first
   ========================================================================= */
RENDER.gallery = function(node, id, tok){
  const f = flags();
  let sel = f.preferredLAPlace || null;
  const g = showGame('g-gallery');
  const pic = k => READY_GALLERY.includes(k) ? `<img class="ep4-gal-img" src="${PHOTO_BASE}gallery/${k}.webp" alt="" decoding="async" onerror="this.remove()">` : GALLERY[k].svg();
  function draw(){
    g.innerHTML = `<div class="ep4-gal">${Object.keys(GALLERY).map((k, i) => { const x = GALLERY[k]; return `
      <button type="button" class="ep4-pol ${sel === k ? 'on' : ''}" data-pl="${k}" aria-pressed="${sel === k}" style="--r:${[-3, 1.5, -1][i]}deg">
        <div class="ep4-pol-ph">${pic(k)}</div>
        <div class="ep4-pol-cap">${x.emoji} ${esc(x.title)}</div>
        <div class="ep4-pol-q">“${esc(x.quote)}”</div>
      </button>`; }).join('')}</div>
      ${sel ? `<div class="ep4-gal-cap"><b>📷 Emily:</b> ${esc(GALLERY[sel].cap)}${uaDiv(GALLERY[sel].capUa)}</div>` : ''}`;
  }
  function panel(){
    dlg(`${head('🤔 Your choice', 'turn')}<div class="ep1-q">Where would you like to go first?</div>${uaDiv('Куди ти хочеш піти спершу?')}
      <p class="ep1-mini">Tap a photo. Then say your answer out loud!</p>
      <div class="ep1-row"><div class="ep1-tools">${uaBtn()}</div><button type="button" class="ep1-next" data-primary ${sel ? '' : 'disabled'}>✓ This one first!</button></div>`, 'k-choice');
    if(sel) primary(pick);
  }
  function pick(){
    if(tok !== EP.token || !sel) return;
    const x = GALLERY[sel];
    f.preferredLAPlace = sel; st().choices[EP.scene.id + ':' + id] = x.title; st().answers[node.key] = { place:sel };
    taskDone(node.key); save(true); Sound.sfx('soft');
    hideGame();
    showLine({ type:'say', who:'you', text:`${x.title}! ${x.quote}`, ua:x.quoteUa }, () => next(node, id));
  }
  g.onclick = e => {
    if(tok !== EP.token) return;
    const b = e.target.closest('[data-pl]'); if(!b) return;
    sel = b.dataset.pl; Sound.sfx('soft'); draw(); panel();
    const focusBack = g.querySelector(`[data-pl="${sel}"]`); focusBack && focusBack.focus({ preventScroll:true });
  };
  draw(); panel();
};

/* =========================================================================
   TEACHER MODE — a small control bar for lessons on Zoom (👩‍🏫 in the top
   bar). Back / Next step, hints (show / hide), repeat the question, mark a
   speaking turn as done, review vocabulary. Kept on this device only.
   Keyboard (when it's on): ← back, → next, H hint.
   ========================================================================= */
const TEACH_KEY = 'lifeInLA:ep4-teacher';
const HIST = [];                       // the steps the class has seen in this episode: { scene, node }
let goingBack = false;
const NO_BACK = ['act','fx','branch','end','notify','reward','cards','door','complete','useful'];
const Teacher = {
  on: (() => { try { return localStorage.getItem(TEACH_KEY) === '1'; } catch(e){ return false; } })(),
  el: null,
  mount(){
    if(!EP.root) return;
    const top = EP.root.querySelector('.ep1-top-r');
    if(top && !top.querySelector('.ep4-tbtn')){
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'ep1-ib ep4-tbtn'; b.title = 'Teacher mode'; b.setAttribute('aria-label', 'Teacher mode'); b.textContent = '👩‍🏫';
      b.addEventListener('click', () => Teacher.toggle());
      top.insertBefore(b, top.firstChild);
    }
    if(!this.el){
      this.el = document.createElement('div');
      this.el.className = 'ep4-teacher'; this.el.setAttribute('role', 'toolbar'); this.el.setAttribute('aria-label', 'Teacher controls');
      EP.root.appendChild(this.el);
      this.el.addEventListener('click', e => { const b = e.target.closest('[data-tc]'); if(b && !b.disabled) Teacher.act(b.dataset.tc); });
      document.addEventListener('keydown', e => {
        if(!Teacher.on || !EP.open || !E.current() || E.current().id !== EP_ID || EP.paused || !EP.modal.hidden) return;
        const tag = (e.target.tagName || '').toLowerCase(); if(tag === 'textarea' || tag === 'input') return;
        if(e.key === 'ArrowRight'){ e.preventDefault(); Teacher.act('next'); }
        if(e.key === 'ArrowLeft'){ e.preventDefault(); Teacher.act('back'); }
        if(e.key === 'h' || e.key === 'H'){ Teacher.act('hint'); }
      });
    }
    this.sync();
  },
  toggle(){ this.on = !this.on; try { localStorage.setItem(TEACH_KEY, this.on ? '1' : '0'); } catch(e){} this.sync(); toast('👩‍🏫', this.on ? 'Teacher mode on' : 'Teacher mode off', this.on ? '← back · → next · H hint' : ''); },
  sync(){
    if(!this.el) return;
    const mine = EP.open && E.current() && E.current().id === EP_ID;
    const b = EP.root && EP.root.querySelector('.ep4-tbtn'); if(b){ b.classList.toggle('on', this.on); b.setAttribute('aria-pressed', this.on); }
    this.el.hidden = !(this.on && mine);
    if(this.el.hidden) return;
    const sc = EP.scene, i = sc ? Math.max(0, sc.order.indexOf(EP.nodeId)) + 1 : 0;
    const sp = CUR && (CUR.kind === 'speak' || CUR.kind === 'final');
    this.el.innerHTML = `<span class="ep4-tc-where">👩‍🏫 ${sc ? `Scene ${sc.n}/8 · step ${i}/${sc.order.length}` : ''}</span>
      <button type="button" data-tc="back" title="Previous step (←)">◀ Back</button>
      <button type="button" data-tc="next" title="Next step (→)">Next ▶</button>
      <span class="ep4-tc-sep" aria-hidden="true"></span>
      <button type="button" data-tc="hint" ${CUR ? '' : 'disabled'} title="Show the next hint (H)">💡 Hint${sp && CUR.levels ? ` ${CUR.level}/${CUR.levels}` : ''}</button>
      <button type="button" data-tc="hide" ${CUR ? '' : 'disabled'}>🙈 Hide</button>
      <button type="button" data-tc="repeat" ${CUR ? '' : 'disabled'} title="Repeat the question">🔁 Repeat</button>
      <button type="button" data-tc="done" ${CUR ? '' : 'disabled'} title="Mark this speaking turn as done">✓ Spoken</button>
      <span class="ep4-tc-sep" aria-hidden="true"></span>
      <button type="button" data-tc="vocab" title="Review the episode's vocabulary">📖 Vocabulary</button>
      <button type="button" data-tc="off" aria-label="Hide teacher controls" title="Hide teacher controls">✕</button>`;
  },
  act(a){
    if(a === 'off') return this.toggle();
    if(a === 'vocab') return openVocabReview();
    if(a === 'back') return goBack();
    if(a === 'next') return goNext();
    if(!CUR) return;
    if(a === 'hint') CUR.hint(); if(a === 'hide') CUR.hide(); if(a === 'repeat') CUR.repeat(); if(a === 'done') CUR.done();
    this.sync();
  }
};
function goNext(){
  const areas = [EP.cine, EP.notif, EP.sheet, EP.dlg, EP.phone, EP.game].filter(el => el && !el.hidden);
  for(const el of areas){
    const b = el.querySelector('[data-primary]:not([disabled]), [data-primary-ph]:not([disabled]), [data-pin]');
    if(b){ b.click(); return; }
  }
  if(CUR && CUR.kind === 'final' && CUR.nextTurn) return CUR.nextTurn();
  toast('👆', 'Choose an answer first', 'This step needs a choice.');
}
function cleanForJump(){
  hideGame(); closePhone(); closePop(); destroyRecorders();
  if(CUR && CUR.destroy) try { CUR.destroy(); } catch(e){} CUR = null;
  EP.sheet.hidden = true; EP.sheet.innerHTML = ''; EP.sheet.onclick = null;
  EP.cine.hidden = true; EP.cine.innerHTML = ''; EP.cine.onclick = null; EP.notif.hidden = true; EP.tray.hidden = true;
}
function lookAt(sc, nodeId){
  let bg = sc.bg;
  for(const k of sc.order){ const n = sc.nodes[k]; if(n.bg) bg = n.bg; if(k === nodeId) break; }
  return bg;
}
function goBack(){
  const sc = EP.scene; if(!sc) return;
  let i = HIST.length - 2;
  while(i >= 0){ const h = HIST[i], s2 = E.current().sceneById[h.scene], n = s2 && s2.nodes[h.node]; if(n && !NO_BACK.includes(n.type) && (!n.when || n.when(flags()))) break; i--; }
  if(i < 0){ toast('◀', 'This is the first step', ''); return; }
  const t = HIST[i]; HIST.length = i;
  cleanForJump();
  goingBack = true;
  if(t.scene !== sc.id) gotoScene(t.scene, t.node, { noCard:true });
  else { setBg(lookAt(sc, t.node)); renderHotspots(); runNode(t.node); }
  goingBack = false;
}

/* ---------- vocabulary review (from the teacher bar and the episode summary) ---------- */
function openVocabReview(){
  const list = EP4_TARGET.map(k => Object.assign({ id:k }, P(k) || {})).filter(p => p.en);
  let practice = null;
  const draw = () => openModalEp(`<div class="ep1-eyebrow">Episode 4 · Meet Emily</div><h3>📖 Vocabulary review</h3>
    <p class="ep1-mini">Tap a card to flip it. Then try the practice: make your own sentence — out loud!</p>
    <div class="ep4-vr">${list.map(p => `<button type="button" class="ep4-vc" data-vc="${p.id}" aria-pressed="false">
      <span class="ep4-vc-f"><b>${esc(p.en)}</b>${hasPhrase(p.id) ? '<small>🎒 in your Backpack</small>' : '<small>tap to flip</small>'}</span>
      <span class="ep4-vc-b"><span>${esc(p.simple || '')}</span><i>🇺🇦 ${esc(p.ua || '')}</i><em>${esc(p.ex || '')}</em></span></button>`).join('')}</div>
    <div class="ep4-vr-prac">${practice ? `<div class="ep4-vr-q">🎲 Make your own sentence with <b>“${esc(practice.en)}”</b></div><p class="ep1-mini">For example: ${esc(practice.ex)}</p>` : ''}
      <div class="ep1-row"><button type="button" class="ep1-btn" data-vr="rand">🎲 ${practice ? 'Another phrase' : 'Practice: random phrase'}</button>${practice && Voice.available() ? `<button type="button" class="ep1-btn ep1-btn-ghost" data-vr="say">🔊 Listen</button>` : ''}<button type="button" class="ep1-next" data-mclose>Done</button></div></div>`,
    { onClick: e => {
      const c = e.target.closest('[data-vc]'); if(c){ const on = c.classList.toggle('flip'); c.setAttribute('aria-pressed', on); if(on) Voice.speak('you', (P(c.dataset.vc) || {}).en || ''); return; }
      const v = e.target.closest('[data-vr]'); if(!v) return;
      if(v.dataset.vr === 'rand'){ const pool = list.filter(p => p !== practice); practice = pool[Math.floor(Math.random() * pool.length)]; Sound.sfx('soft'); draw(); }
      if(v.dataset.vr === 'say' && practice) Voice.speak('you', practice.en);
    } });
  draw();
  taskDone('vocab-review'); save();
}

/* =========================================================================
   FINAL MISSION — “Your First Real Hangout” 🎤 (Scene 8)
   A focused conversation with Emily, one line at a time. Four speaking
   turns; the student answers out loud. Teacher controls: previous / next
   line, show / hide hint (keywords → starters → example), repeat the
   question, mark the turn completed. Then an optional, friendly teacher
   assessment (1–5 or skip) and a dedicated button to confirm completion.
   Nothing here listens to, transcribes or grades speech.
   ========================================================================= */
const TURNS = [
  { k:'share', obj:'Share something interesting about yourself', objUa:'Розкажи щось цікаве про себе',
    q:"Before you go, I have one last question. What's one thing you really want to experience while you're here?",
    qua:"Перш ніж ти підеш, у мене останнє запитання. Що ти дуже хочеш спробувати чи побачити, поки ти тут?",
    keywords:['learn to surf','a concert','road trip','real tacos','a basketball game','make friends'],
    starters:["I've always wanted to…","I'd really love to…","One thing I want to try is…"],
    model:"I've always wanted to learn to surf! And I'd really love to see a concert here — maybe at a stadium." },
  { k:'impress', obj:'Describe your first impressions of LA', objUa:'Опиши свої перші враження від Лос-Анджелеса',
    q:"I love that! And what's been the biggest surprise so far?", qua:"Клас! А що тебе поки що найбільше здивувало?",
    keywords:['huge','traffic','friendly','sunny','palm trees','the food'],
    starters:["The biggest surprise was…","I didn't expect…","Everything here is…"],
    model:"The biggest surprise was how friendly people are. I didn't expect strangers to say hi to me! And everything is SO big." },
  { k:'ask', obj:'Ask Emily at least two questions', objUa:'Постав Емілі щонайменше два запитання',
    q:"Okay, your turn. Ask me anything.", qua:"Окей, твоя черга. Питай мене про що завгодно.",
    keywords:['favorite','ever','usually','why','how'],
    starters:["What's your favorite…?","Have you ever…?","What do you usually…?","How did you…?"],
    model:"What's your favorite photo you've ever taken? And have you ever been to Europe?" },
  { k:'invite', obj:'Answer her weekend invitation', objUa:'Дай відповідь на її запрошення на вихідні',
    q: f => f.beachInvitationResponse === 'careful' ? "So… did you check your plans? Are we doing the beach this weekend or what?" : "So… are we doing the beach this weekend or what?",
    qua: f => f.beachInvitationResponse === 'careful' ? "То що… ти перевірив(-ла) свої плани? Їдемо на пляж цими вихідними чи як?" : "То що… їдемо на пляж цими вихідними чи як?",
    keywords:['count me in','can\'t wait','keep me posted','I\'ll ask Rachel and David'],
    starters:["Count me in!","I can't wait!","I'll ask Rachel and David, but…","Keep me posted!"],
    model:"Count me in! I can't wait. Keep me posted about the time, okay?" }
];
const CLOSING = ["Okay, it's official! I'll text you the details. Keep your phone on! 📱", "Окей, це офіційно! Я напишу тобі подробиці. Не вимикай телефон! 📱"];
const RUBRIC = [
  { k:'communication', label:'Communication', q:'Can the student communicate their ideas?', ua:'Чи вдається донести свої думки?' },
  { k:'interaction',   label:'Interaction',   q:'Can they ask questions and react naturally?', ua:'Чи ставить запитання й природно реагує?' },
  { k:'fluency',       label:'Fluency',       q:'Can they keep speaking with reasonable continuity?', ua:'Чи може говорити без довгих пауз?' },
  { k:'vocabulary',    label:'Vocabulary',    q:'Can they use appropriate conversational phrases?', ua:'Чи вживає доречні розмовні фрази?' }
];
const SCALE = ['Just starting', 'Getting there', 'Good', 'Very good', 'Excellent'];
const FINAL_BANK = ['weekends','always','favorite','music','photos','jake'];
function emilyPortrait(){
  if(READY_AVATARS.includes('emily')) return `<img src="${PHOTO_BASE}avatars/emily.webp" alt="" onerror="this.remove()">`;
  return `<svg viewBox="0 0 200 200" aria-hidden="true"><defs><radialGradient id="ep4pbg"><stop offset="0" stop-color="#ffd9a8"/><stop offset="1" stop-color="#ff8a3d"/></radialGradient></defs>
    <circle cx="100" cy="100" r="100" fill="url(#ep4pbg)"/>${emilyFig(100, 215, .5, {})}</svg>`;
}
RENDER.final4 = function(node, id, tok){
  hideDlg(); hideGame();
  const s = st(), f = flags();
  const fs = f.final4 = Object.assign({ turn:0, done:{}, asked:[], own:0 }, f.final4 || {});
  let level = 0, phase = 'talk', lastAnswer = null, closing = false, note = (s.final && s.final.note) || '';
  const rubric = Object.assign({}, (s.final && s.final.rubric) || {});
  const askedN = () => fs.asked.length + (fs.own || 0);
  const allDone = () => TURNS.every(t => fs.done[t.k]);
  EP.sheet.hidden = false;
  function hintsHTML(T){
    const out = [];
    if(level >= 1) out.push(`<div class="ep4-hl"><span class="ep4-hl-t">${HINT_NAMES.kw}</span><div class="ep4-chips">${T.keywords.map(k => `<span class="ep4-kw">${esc(k)}</span>`).join('')}</div></div>`);
    if(level >= 2) out.push(`<div class="ep4-hl"><span class="ep4-hl-t">${HINT_NAMES.st}</span><div class="ep4-chips">${T.starters.map(k => `<span class="ep1-chip ep1-chip-static">${esc(k)}</span>`).join('')}</div></div>`);
    if(level >= 3) out.push(`<div class="ep4-hl ep4-hl-ex"><span class="ep4-hl-t">${HINT_NAMES.ex}</span><div class="ep1-model">“${esc(T.model)}” ${Voice.available() ? `<button type="button" class="ep1-tool" data-fm="model" aria-label="Listen to the example">🔊</button>` : ''}</div></div>`);
    return out.join('');
  }
  function askHTML(){
    return `<div class="ep4-fm-ask"><div class="ep4-fm-askn ${askedN() >= 2 ? 'ok' : ''}">Questions asked: <b>${askedN()}</b>/2</div>
      <p class="ep1-mini">Ask out loud, then tap the question you asked (or “My own question”):</p>
      <div class="ep4-chips">${FINAL_BANK.map(k => `<button type="button" class="ep1-chip ${fs.asked.includes(k) ? 'done' : ''}" data-fq="${k}">${EMILY_ANSWERS[k].icon} ${esc(EMILY_ANSWERS[k].q)}</button>`).join('')}
        <button type="button" class="ep1-chip" data-fq="own">🗣️ My own question ${fs.own ? `(${fs.own})` : ''}</button></div>
      ${lastAnswer ? `<div class="ep4-ask-a"><b>Emily:</b> ${esc(lastAnswer.a)}${uaDiv(lastAnswer.ua)}</div>` : ''}</div>`;
  }
  function draw(){
    if(phase === 'rubric') return drawRubric();
    const T = TURNS[fs.turn];
    const q = closing ? CLOSING[0] : valOf(T.q, f), qua = closing ? CLOSING[1] : valOf(T.qua, f);
    EP.sheet.innerHTML = `<div class="ep1-final ep4-final" role="dialog" aria-label="Final mission: Your First Real Hangout">
      <div class="ep4-fm-head"><div><div class="ep1-eyebrow">🎤 Final speaking mission</div><h2>Your First Real Hangout</h2></div>
        <ol class="ep4-fm-steps">${TURNS.map((t, i) => `<li class="${fs.done[t.k] ? 'ok' : ''} ${i === fs.turn && !closing ? 'cur' : ''}"><button type="button" data-fm-go="${i}" aria-label="Turn ${i + 1}: ${esc(t.obj)}">${fs.done[t.k] ? '✓' : i + 1}</button><span>${esc(t.obj)}</span></li>`).join('')}</ol></div>
      <div class="ep4-fm-main">
        <div class="ep4-fm-emily"><div class="ep4-fm-ava">${emilyPortrait()}</div><b>Emily</b><small>${esc(relStatus(s).name)}</small></div>
        <div class="ep4-fm-talk">
          <div class="ep4-fm-bub"><span>“${esc(q)}”</span>
            <span class="ep4-fm-bt">${Voice.available() ? `<button type="button" class="ep1-tool" data-fm="repeat" aria-label="Repeat the question">🔁</button>` : ''}<button type="button" class="ep1-tool" data-fm="ua" aria-label="Ukrainian translation">UA</button></span></div>
          <div class="ep1-ua ep4-fm-ua" ${SET.ua ? '' : 'hidden'}>${esc(qua)}</div>
          ${closing ? `<p class="ep4-fm-done">🎉 All four turns done. That was a real conversation!</p>` : `
          <div class="ep4-fm-turn"><div class="ep1-eyebrow">🗣️ Your turn · ${esc(T.obj)} ${fs.done[T.k] ? '<span class="ep4-ok">✓ done</span>' : ''}</div>${uaDiv(T.objUa)}
            ${T.k === 'ask' ? askHTML() : ''}
            <div class="ep4-fm-hints" aria-live="polite">${hintsHTML(T)}</div></div>`}
        </div>
      </div>
      <div class="ep4-fm-ctrl" role="toolbar" aria-label="Conversation controls">
        <button type="button" data-fm="prev" ${fs.turn === 0 && !closing ? 'disabled' : ''}>◀ Previous line</button>
        <button type="button" data-fm="hint" ${closing || level >= 3 ? 'disabled' : ''}>💡 Show hint ${closing ? '' : `${level}/3`}</button>
        <button type="button" data-fm="hide" ${closing || !level ? 'disabled' : ''}>🙈 Hide hint</button>
        <button type="button" data-fm="repeat">🔁 Repeat question</button>
        <button type="button" data-fm="mark" class="hot" ${closing || fs.done[T.k] ? 'disabled' : ''}>✓ Mark turn completed</button>
        <button type="button" data-fm="next" ${closing ? 'disabled' : ''}>Next line ▶</button>
      </div>
      <div class="ep4-fm-foot"><small>Speak to your teacher, a classmate — or to Emily. The app doesn't listen to or grade your voice; perfect English isn't the point. Talking is. 🙂</small>
        ${allDone() ? `<button type="button" class="ep1-next" data-fm="finish">Finish the conversation ▸</button>` : `<span class="ep1-mini">${TURNS.filter(t => fs.done[t.k]).length}/4 turns done</span>`}</div>
    </div>`;
    Teacher.sync();
  }
  function speakLine(){
    if(!(SET.voice && SET.sound)) return;
    const T = TURNS[fs.turn];
    Voice.speak('emily', closing ? CLOSING[0] : valOf(T.q, f));
  }
  function goTurn(i){ closing = false; fs.turn = Math.max(0, Math.min(TURNS.length - 1, i)); level = 0; lastAnswer = null; save(); draw(); speakLine(); }
  function mark(){
    const T = TURNS[fs.turn]; if(closing || fs.done[T.k]) return;
    if(T.k === 'ask' && askedN() < 2){ toast('🙋', 'Ask at least 2 questions', 'Tap each question after you ask it.'); return; }
    fs.done[T.k] = true; taskDone('final:' + T.k); Sound.sfx('good'); save(true);
    if(allDone()){ closing = true; level = 0; draw(); speakLine(); return; }
    const nextI = TURNS.findIndex((t, i) => i > fs.turn && !fs.done[t.k]);
    goTurn(nextI >= 0 ? nextI : TURNS.findIndex(t => !fs.done[t.k]));
  }
  function drawRubric(){
    EP.sheet.innerHTML = `<div class="ep1-final ep4-final ep4-rubric" role="dialog" aria-label="Final mission: assessment">
      <div class="ep1-eyebrow">🎤 Final mission · teacher feedback (optional)</div><h2>How did the conversation go?</h2>
      <p class="ep4-rub-sum">✓ ${TURNS.filter(t => fs.done[t.k]).length}/4 speaking turns · 🙋 ${askedN()} question${askedN() === 1 ? '' : 's'} for Emily</p>
      <div class="ep4-rub">${RUBRIC.map(c => `<div class="ep4-rub-row"><div class="ep4-rub-l"><b>${esc(c.label)}</b><small>${esc(c.q)}</small>${uaDiv(c.ua)}</div>
        <div class="ep4-rub-scale" role="radiogroup" aria-label="${esc(c.label)}">${SCALE.map((d, i) => `<button type="button" role="radio" aria-checked="${rubric[c.k] === i + 1}" class="ep4-rub-b ${rubric[c.k] === i + 1 ? 'on' : ''}" data-rub="${c.k}:${i + 1}" title="${esc(d)}"><b>${i + 1}</b><small>${esc(d)}</small></button>`).join('')}</div></div>`).join('')}</div>
      <label class="ep4-rub-note"><span>💬 Feedback note <small>(optional — for the student)</small></span><textarea class="ep1-ta" rows="2" maxlength="600" placeholder="e.g. Great questions! Next time, try a longer answer about LA.">${esc(note)}</textarea></label>
      <p class="ep1-mini">Friendly feedback, not a test: accents and small grammar mistakes are fine — this is about communication.</p>
      <div class="ep1-row ep4-rub-btns"><button type="button" class="ep1-btn ep1-btn-ghost" data-fm="back">◀ Back to the conversation</button>
        <span><button type="button" class="ep1-btn ep1-btn-ghost" data-fm="skiprub">Skip feedback</button>
        <button type="button" class="ep1-next" data-fm="confirm">✓ Confirm: mission complete</button></span></div>
    </div>`;
    const ta = EP.sheet.querySelector('textarea'); ta.addEventListener('input', () => { note = ta.value.slice(0, 600); });
  }
  function complete(skipRubric){
    const missing = TURNS.filter(t => !fs.done[t.k]).length;
    confirmBox('Complete the final mission?',
      (missing ? `${missing} speaking turn${missing > 1 ? 's are' : ' is'} not marked yet. ` : '') + 'This marks Episode 4 as finished and opens the ending. You can replay any scene later.',
      () => finish(skipRubric), () => { phase = 'rubric'; draw(); },
      { yes:'Yes, complete it', ua:'Це завершить Епізод 4 і відкриє фінал. Будь-яку сцену можна буде переглянути пізніше.' });
  }
  function finish(skipRubric){
    if(tok !== EP.token) return;
    s.final = { turns:Object.assign({}, fs.done), asked:askedN(), questions:fs.asked.slice(), rubric: skipRubric ? null : Object.assign({}, rubric), note: skipRubric ? '' : note.trim().slice(0, 600), at:Date.now() };
    f.finalMissionCompleted = true; delete f.final4;
    taskDone('final'); markCompleted(); save(true); flushSave(); Sound.sfx('reward');
    CUR = null;
    EP.sheet.hidden = true; EP.sheet.innerHTML = ''; EP.sheet.onclick = null;
    next(node, id);
  }
  EP.sheet.onclick = e => {
    if(tok !== EP.token) return;
    const g = e.target.closest('[data-fm-go]'); if(g){ goTurn(+g.dataset.fmGo); return; }
    const q = e.target.closest('[data-fq]');
    if(q){
      const k = q.dataset.fq;
      if(k === 'own'){ fs.own = (fs.own || 0) + 1; lastAnswer = EMILY_OWN; }
      else { if(!fs.asked.includes(k)) fs.asked.push(k); lastAnswer = EMILY_ANSWERS[k]; f.emilyFacts = Array.from(new Set((f.emilyFacts || []).concat(k))); syncEmilyCard(); }
      Sound.sfx('soft'); save(); draw(); if(SET.voice && SET.sound) Voice.speak('emily', lastAnswer.a);
      return;
    }
    const r = e.target.closest('[data-rub]');
    if(r){ const [k, v] = r.dataset.rub.split(':'); rubric[k] = rubric[k] === +v ? undefined : +v; if(rubric[k] === undefined) delete rubric[k]; Sound.sfx('soft'); drawRubric(); return; }
    const b = e.target.closest('[data-fm]'); if(!b || b.disabled) return;
    const a = b.dataset.fm;
    if(a === 'repeat') speakLine();
    if(a === 'ua') EP.sheet.querySelectorAll('.ep4-fm-talk .ep1-ua').forEach(x => x.hidden = !x.hidden);
    if(a === 'model') Voice.speak('you', TURNS[fs.turn].model);
    if(a === 'hint' && level < 3){ level++; Sound.sfx('soft'); draw(); }
    if(a === 'hide'){ level = 0; draw(); }
    if(a === 'mark') mark();
    if(a === 'prev'){ if(closing){ closing = false; draw(); speakLine(); } else goTurn(fs.turn - 1); }
    if(a === 'next'){ if(fs.turn < TURNS.length - 1) goTurn(fs.turn + 1); else if(allDone()){ closing = true; draw(); speakLine(); } }
    if(a === 'finish'){ phase = 'rubric'; drawRubric(); }
    if(a === 'back'){ phase = 'talk'; draw(); }
    if(a === 'skiprub') complete(true);
    if(a === 'confirm') complete(false);
  };
  setCur({ kind:'final', get level(){ return level; }, levels:3,
    hint(){ if(phase === 'talk' && !closing && level < 3){ level++; draw(); } },
    hide(){ if(phase === 'talk'){ level = 0; draw(); } },
    repeat: speakLine, done: mark,
    nextTurn(){ if(phase !== 'talk') return; if(closing || allDone()){ phase = 'rubric'; drawRubric(); } else if(fs.turn < TURNS.length - 1) goTurn(fs.turn + 1); },
    destroy(){} });
  draw();
  setTimeout(() => { if(tok === EP.token && phase === 'talk') speakLine(); }, 500);
};

/* =========================================================================
   JOURNAL — the episode's own entry (built from real choices) + an optional
   reflection written by the student. Reflections are always NEW entries.
   ========================================================================= */
const JOURNAL_ID = 'ep4-first-coffee';
function journalText(){
  const s = peekSt(EP_ID) || { flags:{} }, f = s.flags || {};
  const order = coffee(f).drink ? `a ${shortOrder(coffee(f))}` : 'a coffee';
  const place = { beach:'Santa Monica Beach', hills:'the Hollywood Hills', hidden:'a hidden local spot' }[f.preferredLAPlace];
  const beach = { enthusiastic:"I said: “Count me in!”", curious:"I asked who else is coming… maybe Alex?!", careful:"I need to ask Rachel and David first." }[f.beachInvitationResponse] || '';
  return `My First Coffee in LA ☕ — Day 3. Emily texted me in the morning, and we met at Corner Cup, right across from Paper Moon Books. I ordered ${order} — and the barista wrote “${cupName()}” on my cup! 😂 ` +
    `We talked about LA and about home${place ? `, Emily showed me her photos, and I picked ${place} as the first place to explore` : ''}. ` +
    `Then I found out that Jake and Alex used to be best friends… Emily doesn't know what happened. She invited me to the beach this weekend. ${beach} ` +
    `And then Jake texted: “Alex might be there.” 👀`;
}
function upsertJournal(){
  const text = journalText();
  const j = DATA.journal.find(x => x.id === JOURNAL_ID);
  if(j){ j.text = text; return; }
  DATA.journal.unshift({ id:JOURNAL_ID, auto:true, date:'Day 3 · ' + DATA.day.dateLabel, text });
}
function openJournalModal(){
  upsertJournal();
  const auto = DATA.journal.find(j => j.id === JOURNAL_ID);
  let saved = false;
  openModalEp(`<div class="ep1-eyebrow">📔 Your journal</div><h3>My First Coffee in LA</h3>
    <div class="ep4-jr-auto">${esc(auto ? auto.text : '')}</div>
    <label class="ep4-jr-q" for="ep4jr">What was your favorite part of meeting Emily? <small>(optional)</small></label>
    <div class="ep1-ua" ${SET.ua ? '' : 'hidden'}>Що тобі найбільше сподобалося в знайомстві з Емілі?</div>
    <textarea id="ep4jr" class="ep1-ta" rows="4" maxlength="1200" placeholder="My favorite part was…"></textarea>
    <div class="ep1-row"><button type="button" class="ep1-btn ep1-btn-ghost" data-jr="all">📔 See all my entries</button><button type="button" class="ep1-next" data-jr="save" disabled>Save to my journal</button></div>`,
    { onClick: e => {
      const b = e.target.closest('[data-jr]'); if(!b || b.disabled) return;
      if(b.dataset.jr === 'all') return close({ then: () => window.openModal && window.openModal('journal') });
      if(b.dataset.jr === 'save' && !saved){
        const ta = EP.modal.querySelector('textarea'); const text = ta.value.trim(); if(!text) return;
        saved = true;
        DATA.journal.unshift({ id:'ep4-reflect-' + Date.now(), date:`Day 3 · ${DATA.day.dateLabel} · after coffee`, text: text.slice(0, 1200) });
        taskDone('journal'); save(true); Sound.sfx('good'); toast('📔', 'Saved to your journal', 'Day 3');
        b.textContent = '✓ Saved'; b.disabled = true; ta.disabled = true;
      }
    } });
  const ta = EP.modal.querySelector('textarea'), sv = EP.modal.querySelector('[data-jr="save"]');
  ta.addEventListener('input', () => { if(!saved) sv.disabled = !ta.value.trim(); });
}

/* =========================================================================
   EMILY'S PEOPLE CARD — personality, interests, the friendship and what
   the student has really found out. Rebuilt from saved progress on every
   load, so nothing extra is stored in the world state.
   ========================================================================= */
function syncEmilyCard(){
  const p = DATA.people.find(x => x.id === 'emily'); if(!p) return;
  const s = peekSt(EP_ID);
  const rel = relList(s);
  if(!s || (!rel.length && !s.completed)) return;          // Episode 4 not started yet → Episode 3's card stays
  const f = s.flags || {};
  const status = relStatus(s);
  const known = Array.from(new Set((f.emilyFacts || []).concat((s.forEp5 && s.forEp5.emilyFacts) || [])));
  const facts = BASE_FACTS.concat(known.map(k => EMILY_ANSWERS[k] && EMILY_ANSWERS[k].fact).filter(Boolean));
  if(f.preferredLAPlace) facts.push({ beach:'Wants to show you Santa Monica at sunset', hills:'Promised you the hills (bring good shoes!)', hidden:'Knows a few secret spots in the city' }[f.preferredLAPlace]);
  if(f.jakeReaction || (s.completedScenes || []).includes('s6')) facts.push("Says Jake and Alex used to be best friends — but doesn't know what happened");
  if(f.beachInvitationResponse) facts.push('Invited you to the beach this weekend');
  if(!p.revealed) meet('emily');
  p.revealed = true; p._met = true; delete p.locked;
  p.role = `${status.name} · lives nearby`;
  p.bio = `<b>Personality:</b> friendly, energetic and funny — a little sarcastic.<br><b>Interests:</b> photography, coffee shops, bookstores, music, the beach and sunsets.` +
    `<br><b>💛 Friendship:</b> ${esc(status.name)}${status.stage ? ' · ' + esc(status.stage) : ''} <span class="ep4-rel">${MILESTONES.map(m => `<span class="${rel.includes(m.k) ? 'on' : ''}" title="${esc(m.label)}">${m.icon}</span>`).join('')}</span>` +
    `<br><b>📌 What you know:</b> ${facts.filter(Boolean).map(esc).join(' · ')}`;
  p.catch = '“Honestly…” · “No way!” · “Okay, now I\'m curious.”';
}

/* =========================================================================
   COMPLETION — every world update is idempotent (safe on replay)
   ========================================================================= */
function markCompleted(){
  const s = st();
  s.completed = true; s.completedAt = s.completedAt || Date.now();
  applyCompletionWorld();
}
function applyCompletionWorld(){
  const s = st();
  EP4_PHRASES.forEach(addPhrase);
  giveItem(SLEEVE);
  s.flags.rel = Array.from(new Set(relList(s).concat(MILESTONES.map(m => m.k)))); s.relEver = s.flags.rel.slice();
  const cof = ensureAch('coffee'); if(cof && !cof.done){ cof.progress = Math.max(cof.progress || 0, 1); cof.locked = false; }
  unlockAch('friend');
  if(s.flags.finalMissionCompleted) unlockAch('confidence');
  ['m2', 'm4'].forEach(id => { const m = DATA.memories.find(x => x.id === id); if(m) m.unlocked = true; });
  const cafe = DATA.locations.find(l => l.id === 'coffee');
  if(cafe){ cafe.status = 'unlocked'; cafe.visited = true; cafe.note = 'Corner Cup · where you met Emily on Day 3. Across from Paper Moon Books.'; }
  const beach = DATA.locations.find(l => l.id === 'beach');
  if(beach && beach.status !== 'unlocked') beach.note = 'Locked — maybe this weekend? 🌊 Emily and her friends might be going.';
  const exp = DATA.achievements.find(a => a.id === 'explorer'); if(exp && !exp.done) exp.progress = Math.max(exp.progress || 0, DATA.locations.filter(l => l.visited).length);
  const me = DATA.story.find(x => x.id === 'meet-emily'); if(me) me.status = 'done';
  const nx = DATA.story.find(x => x.id === 'beach'); if(nx && nx.status === 'locked') nx.status = 'current';
  if(typeof window.setStoryDay === 'function' && DATA.day.number < 3) window.setStoryDay(3);
  upsertJournal();
  s.completedScenes = SCENES.map(x => x.id);
  syncEmilyCard();
  /* things Episode 5 will want to know (also kept in flags) */
  const f = s.flags;
  s.forEp5 = { coffeeOrder: f.coffeeOrder || null, cupName: cupName(), preferredLAPlace: f.preferredLAPlace || null,
               jakeSituationReaction: f.jakeSituationReaction || null, beachInvitationResponse: f.beachInvitationResponse || null,
               emilyFacts: (f.emilyFacts || []).slice(), friendship:'New Friend', beachPlan:'not confirmed — details come in Episode 5', jakeAlexBackstory:'not revealed' };
}

RENDER.complete = function(node, id, tok){
  hideDlg(); hideGame();
  const s = st();
  const firstTime = !s.plays;
  s.completed = true; s.completedAt = s.completedAt || Date.now(); s.plays = (s.plays || 0) + (EP.countedPlay ? 0 : 1); EP.countedPlay = true;
  applyCompletionWorld();
  s.sceneId = null; s.nodeId = null;
  save(true); flushSave();
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
      box.innerHTML = `<div class="ep1-end-big ep4-tbc">TO BE CONTINUED…</div>`;
      await wait(R ? 1200 : 3000); if(skip || tok !== EP.token) return;
      box.innerHTML = `<div class="ep1-end-big ep4-next-t">NEXT EPISODE: THE BEACH 🏖️</div><div class="ep1-end-sub">Sun, sand, the pier — and Alex might be there.</div>`;
      await wait(R ? 1600 : 4200); if(skip || tok !== EP.token) return;
      skip = true; summary(firstTime);
    })();
  }, isReduced() ? 200 : 900);
};

const MEMORY_COFFEE = BASE + 'img/memory-first-coffee.webp';
const MEMORY_FRIEND = BASE + 'img/memory-first-friend.webp';
const COVER = BASE + 'img/cover.webp';
function summary(firstTime){
  const s = st(), f = s.flags;
  const learned = EP4_TARGET.filter(k => hasPhrase(k));
  const fin = s.final || {};
  const ep5 = E.has('ep5');
  const rub = fin.rubric && Object.keys(fin.rubric).length ? RUBRIC.filter(c => fin.rubric[c.k]).map(c => `<span class="ep4-rub-chip">${esc(c.label)} <b>${'●'.repeat(fin.rubric[c.k])}${'○'.repeat(5 - fin.rubric[c.k])}</b> ${esc(SCALE[fin.rubric[c.k] - 1])}</span>`).join('') : '';
  const story = [
    coffee(f).drink ? ['☕ Your order', `“${orderSentence(coffee(f), 'like')}”`] : null,
    ['🥤 Name on the cup', `“${cupName()}” ${({ newname:'— your new name', notclose:'— not even close', laname:'— your LA name' })[f.cupReply] || ''}`],
    f.preferredLAPlace ? ['🌴 First place to explore', GALLERY[f.preferredLAPlace].title] : null,
    f.jakeReaction ? ['🤔 The Jake situation', ({ curious:'You asked about Alex', direct:'You asked what happened', careful:'You noticed there\'s a story' })[f.jakeReaction] + (f.jakeFollowUp ? ' · ' + ({ ask:'then asked one more question', joke:'then made a joke', change:'then changed the subject' })[f.jakeFollowUp] : '')] : null,
    f.beachInvitationResponse ? ['🌊 The beach', ({ enthusiastic:'“Count me in!”', curious:'“Who else is coming?” (…maybe Alex)', careful:'You\'ll check with Rachel and David' })[f.beachInvitationResponse]] : null
  ].filter(Boolean);
  EP.cine.hidden = false; EP.cine.className = 'ep1-cine ep1-cine-summary ep4-summary';
  EP.cine.innerHTML = `<div class="ep1-sum ep4-sum" role="dialog" aria-label="Episode summary">
    <div class="ep1-eyebrow">Season 1 · Episode 4 · ✓ Completed</div>
    <h2>EPISODE 4 COMPLETE! ☕</h2><p class="ep4-sum-sub"><b>You've made your first friend in LA!</b> You ordered your first coffee, explored the neighborhood, got to know Emily, and made plans for another adventure.</p>
    <div class="ep1-sum-grid ep4-sum-grid">
      <div class="ep1-stat"><b>8/8</b><span>scenes · episode completed</span></div>
      <div class="ep1-stat"><b>💛</b><span>new friend: Emily</span></div>
      <div class="ep1-stat"><b>${learned.length}/12</b><span>new phrases in your Backpack</span></div>
      <div class="ep1-stat"><b>${fin.turns ? Object.keys(fin.turns).length : 0}/4</b><span>final mission turns · ${fin.asked || 0} questions</span></div>
    </div>
    <div class="ep4-sum-two">
      <div class="ep4-sum-l">
        <div class="ep4-sum-story"><div class="ep1-eyebrow">📖 Your story</div>${story.map(([k, v]) => `<div class="ep4-ss"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>
        ${rub || fin.note ? `<div class="ep4-sum-fb"><div class="ep1-eyebrow">👩‍🏫 Teacher feedback</div><div class="ep4-chips">${rub}</div>${fin.note ? `<p>“${esc(fin.note)}”</p>` : ''}</div>` : ''}
      </div>
      <div class="ep4-sum-r">
        <div class="ep4-sum-mems">
          <div class="ep1-polaroid"><div class="ep1-polaroid-img ep4-mem-img" style="background-image:url('${MEMORY_COFFEE}')"></div><div class="ep1-polaroid-cap">First Coffee ☕</div></div>
          <div class="ep1-polaroid ep4-pol2"><div class="ep1-polaroid-img ep4-mem-img" style="background-image:url('${MEMORY_FRIEND}')"></div><div class="ep1-polaroid-cap">First Friend 👋</div></div>
        </div>
        <small class="ep4-sum-memt">📸 2 new memories</small>
        <div class="ep1-sum-next"><div class="ep1-eyebrow">${ep5 ? '🔓 Unlocked' : '🔓 Next in your story · coming soon'}</div><b>NEXT EPISODE: THE BEACH 🏖️</b><small>Sun, sand, the pier — and Alex might be there.</small></div>
      </div>
    </div>
    <div class="ep1-sum-btns">
      <button type="button" class="ep1-btn ep1-btn-ghost" data-sum="vocab">📖 Review Vocabulary</button>
      <button type="button" class="ep1-btn ep1-btn-ghost" data-sum="journal">📔 Open Journal</button>
      <button type="button" class="ep1-btn ep1-btn-ghost" data-sum="replay">↺ Replay</button>
      <button type="button" class="ep1-btn" data-sum="ep5" ${ep5 ? '' : 'disabled aria-disabled="true" title="Episode 5 is coming soon"'}>${ep5 ? '🏖️ Next Episode' : '🔒 Next Episode — coming soon'}</button>
      <button type="button" class="ep1-next" data-sum="room" data-primary>🏠 Back to Home ▸</button>
    </div></div>`;
  EP.cine.onclick = e => {
    const b = e.target.closest('[data-sum]'); if(!b || b.disabled) return;
    const a = b.dataset.sum;
    if(a === 'room') close();
    if(a === 'vocab') openVocabReview();
    if(a === 'journal') openJournalModal();
    if(a === 'replay') confirmBox('Replay Episode 4?', 'Your rewards, phrases, journal and messages stay. You start again from Scene 1.', () => { EP.cine.onclick = null; restartEpisode(); });
    if(a === 'ep5' && ep5){ EP.cine.onclick = null; E.open('ep5'); }
  };
  EP.cine.querySelector('[data-sum="room"]').focus({ preventScroll:true });
  if(firstTime){ setTimeout(() => toast('🤝', 'Achievement unlocked', 'New Friend'), 500); setTimeout(() => toast('🌟', 'Achievement unlocked', 'Confident Speaker'), 1300); }
}

/* =========================================================================
   RESET — what "Reset Episode 4" removes from a saved progress snapshot.
   Removed: Episode 4's state, its own phrases, the cup sleeve, the Coffee
   Lover / New Friend / Confident Speaker progress, the First Coffee and
   First Friend memories, the Coffee Shop visit and the beach teaser on the
   Map, Episode 4's messages (ids start with "e4"), the story steps.
   Kept: the journal, Emily's card from Episode 3, Episodes 1–3.
   ========================================================================= */
function clearEp4(snap){
  snap = snap || {};
  const story = (snap.story && typeof snap.story === 'object') ? snap.story : { v:1, episodes:{}, world:{} };
  story.episodes = Object.assign({}, story.episodes); delete story.episodes.ep4;
  const ep3Fin = !!(story.episodes.ep3 && story.episodes.ep3.completed);
  const w = story.world = Object.assign({}, story.world);
  if(Array.isArray(w.phrases)) w.phrases = w.phrases.filter(k => !OWN_PHRASES.includes(k));
  if(Array.isArray(w.items)) w.items = w.items.filter(n => n !== SLEEVE);
  if(w.ach){ w.ach = Object.assign({}, w.ach); ['coffee', 'friend', 'confidence'].forEach(k => delete w.ach[k]); }
  if(Array.isArray(w.memories)) w.memories = w.memories.filter(x => x !== 'm2' && x !== 'm4');
  if(w.locations){ w.locations = Object.assign({}, w.locations); delete w.locations.coffee; if(w.locations.beach && w.locations.beach.status !== 'unlocked') delete w.locations.beach; }
  if(w.story){ w.story = Object.assign({}, w.story); delete w.story.beach; if(ep3Fin) w.story['meet-emily'] = 'current'; else delete w.story['meet-emily']; }
  snap.chat = Object.assign({}, snap.chat);
  Object.keys(snap.chat).forEach(k => { if(Array.isArray(snap.chat[k])) snap.chat[k] = snap.chat[k].filter(m => !(m && typeof m.id === 'string' && m.id.indexOf('e4') === 0)); });
  snap.day = ep3Fin ? 2 : Math.min(snap.day || 1, 2);
  snap.story = story;
  return snap;
}

/* =========================================================================
   TOP BAR — act, place and time follow the story
   ========================================================================= */
const ACTS = { 1:'The Meetup', 2:'Getting to Know Emily', 3:'A New Friendship' };
function valAt(sc, nodeId, key, base){ let v = base; for(const k of sc.order){ const n = sc.nodes[k]; if(n[key] != null) v = n[key]; if(k === nodeId) break; } return v; }
function castAt(sc, nodeId){ return valAt(sc, nodeId, 'cast', sc.cast || []); }
function ambAt(sc, nodeId){ return valAt(sc, nodeId, 'amb', sc.ambience); }
function syncTopBar(sc, nodeId){
  if(!EP.root || !sc) return;
  const lab = EP.root.querySelector('#ep1EpLabel'); if(lab) lab.textContent = `Ep. 4 · Act ${['I','II','III'][sc.act - 1]}`;
  const clk = EP.root.querySelector('#ep1Clock'); if(clk) clk.textContent = ACTS[sc.act];
  const obj = EP.root.querySelector('#ep1Obj'); if(obj) obj.textContent = `📍 ${valAt(sc, nodeId, 'where', sc.location)} · ${valAt(sc, nodeId, 'clock', sc.clock)} · Objective: ${sc.objective}`;
}

/* =========================================================================
   REGISTER
   ========================================================================= */
const AVATARS = Object.fromEntries(READY_AVATARS.map(k => [k, PHOTO_BASE + 'avatars/' + k + '.webp']));
const PHOTO_EXTRAS = {};
Object.entries(PH_CAST).forEach(([bg, spots]) => {
  const files = Object.values(spots).map(v => (CAST_PICS[v.pic] || [])[0]).filter(picReady);
  if(files.length) PHOTO_EXTRAS[bg] = Array.from(new Set(files));
});
['beach', 'hills', 'hidden'].filter(k => READY_GALLERY.includes(k)).forEach(k => { (PHOTO_EXTRAS.window = PHOTO_EXTRAS.window || []).push('gallery/' + k); });
if(READY_PROPS.includes('menu')) (PHOTO_EXTRAS.cafe = PHOTO_EXTRAS.cafe || []).push('props/menu');
[['window', 'table-cup'], ['windowQuiet', 'table-phone'], ['street', 'route-map'], ['bedroomAm', 'pin-card']].forEach(([bg, f]) => { if(READY_PROPS.includes(f)) (PHOTO_EXTRAS[bg] = PHOTO_EXTRAS[bg] || []).push('props/' + f); });
E.register({
  id:EP_ID, n:4, title:'Meet Emily', icon:'☕', label:'Season 1 · Episode 4', storyId:'meet-emily', memoryId:'m2', dayLabel:'Day 3',
  tagline:'One coffee. A new friendship. And a little unexpected drama.',
  card(){ return { eyebrow:'New · Episode 4', title:'Meet Emily', desc:'One coffee. A new friendship. And a little unexpected drama.', cta:'Start', icon:'☕' }; },
  teaser:{ storyId:'beach', title:'The Beach', icon:'🏖️', short:'Episode 5 is on its way…',
           html:`<div class="ep1-ep2"><div class="ep1-eyebrow">🎬 Coming soon · Episode 5</div><h2>🏖️ The Beach</h2>
             <p>Sun, sand, Santa Monica Pier — and a group of new friends. Emily will text you the details… and Jake says Alex might be there.</p>
             <p class="ep1-mini">Episode 5 is being filmed right now. 🎬 It will appear here as soon as it's ready.</p></div>` },
  scenes: SCENES, phrases: PHRASES, items: ITEMS, speakers: SPEAKERS,
  threads: {
    emily: { id:'emily', name:'Emily', color:'#FF8A3D', sub:'online', online:true },
    jake:  { id:'jake', name:'Jake', color:'#6DBB75', sub:'online', online:true }
  },
  photoBase: PHOTO_BASE, photos: PHOTOS, photoExtras: PHOTO_EXTRAS, avatars: AVATARS, art: sceneArt,
  hideHotspots:['order','route','cup','gallery','askq','final4','door'],
  soundDesc:'Morning birds, the street, a busy coffee shop, phone sounds',
  render: RENDER,
  onOpen(){ Teacher.mount(); HIST.length = 0; syncEmilyCard(); },
  onRestart(){ castKey = null; HIST.length = 0; CUR = null; },
  onScene(sc){ castKey = null; syncTopBar(sc, sc.order[0]); },
  onNode(sc, nodeId, node){
    const last = HIST[HIST.length - 1];
    if(!last || last.scene !== sc.id || last.node !== nodeId) HIST.push({ scene:sc.id, node:nodeId });
    if(HIST.length > 200) HIST.splice(0, HIST.length - 200);
    if(CUR){ try { CUR.destroy && CUR.destroy(); } catch(e){} CUR = null; }
    /* after the engine has set this node's background: the people on screen, the sound, the top bar */
    Promise.resolve().then(() => {
      if(!EP.open || EP.scene !== sc) return;
      setCast(castAt(sc, nodeId));
      Sound.ambience(ambAt(sc, nodeId));
      syncTopBar(sc, nodeId);
      Teacher.sync();
    });
  },
  onApply(){ syncEmilyCard(); },
  onRegister(){
    if(typeof ASSETS === 'object'){ ASSETS.ep4FirstCoffee = MEMORY_COFFEE; ASSETS.ep4FirstFriend = MEMORY_FRIEND; }
    const m2 = DATA.memories.find(x => x.id === 'm2');
    if(m2){ m2.imgKey = 'ep4FirstCoffee'; m2.cap = 'First Coffee'; m2.desc = "My first coffee in LA — at Corner Cup, across from the bookstore. The barista got my name totally wrong."; }
    const m4 = DATA.memories.find(x => x.id === 'm4');
    if(m4){ m4.imgKey = 'ep4FirstFriend'; m4.cap = 'First Friend'; m4.desc = "Emily, outside Corner Cup. One coffee turned into a new friendship — and an invitation to the beach."; }
    const me = DATA.story.find(x => x.id === 'meet-emily'); if(me){ me.label = 'Meet Emily'; me.img = COVER; }
    keepImage(Object.assign(new Image(), { src: COVER }));
  },
  clearOwn: clearEp4
});
/* the drawings, for exporting stills (cover / memory images): LilaArt.ep4.scene('window'), LilaArt.ep4.cast(['emily@table','tableFg']) */
window.LilaArt = Object.assign(window.LilaArt || {}, { ep4: { scene: sceneArt, cast: castSVG, keys: Object.keys(ART), gallery: k => GALLERY[k].svg(), cup: cupSVG,
  /* read-only helpers for testing */
  _orderSentence: orderSentence, _cupName: cupName } });

})();
