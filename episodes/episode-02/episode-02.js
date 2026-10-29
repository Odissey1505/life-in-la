/* =========================================================================
   LIFE IN LA — Season 1 · Episode 2: "FIRST NIGHT IN LA" 🌙
   -------------------------------------------------------------------------
   One evening, eight scenes: a key card that stops working and a booking
   with a typo (Palm Court Hotel, Room 412 → 308), the Wi-Fi, a video call
   with Mia, finding a diner, ordering food, meeting Jake, a message from
   Rachel Miller, and one mysterious text at 11:17 PM.

   Runs on the shared player (episodes/engine/lila-engine.js), which must be
   loaded first. Story continuity with Episode 1: the student is already
   staying at the Palm Court Hotel (Ep1, scene 8) — the coordinator's booking
   had a typo in the name, so Room 412 was given away.

   Saved per student in DATA.episodes.ep2 (scene/node, choices, answers,
   flags such as hotelChoice, meal, drink, fries, jakeQuestions,
   rachelReplyStyle, mentionedJake, mysteryChoice) — see the README.
   ========================================================================= */
(function(){
'use strict';
const E = window.LilaEngine;
if(!E){ console.error('Life in LA: episodes/engine/lila-engine.js must load before episode-02.js'); return; }
const { esc, isReduced, wait, fmtTime, SET, Sound, Voice, st, peekSt, save, flushSave, taskDone, ensureAch, unlockAch,
        addPhrase, giveItem, meet, pushChat, EP, dlg, hideDlg, primary, head, lineHTML, toast, pop, vocabCard, showLine,
        next, valOf, showGame, hideGame, confirmBox, close, restartEpisode, talkBox, hintLadder, keepImage } = E.api;
const { rng, svg, lin, rad, FONT, skyline, lights, palm, figure, nextArtId } = E.api.art;
const RENDER = {};
const EP_ID = 'ep2';
const BASE = 'episodes/episode-02/';

/* =========================================================================
   LEARNING CONTENT — 14 new phrases + 2 reviewed from Episode 1
   (could-you-help, around-corner). Each: simple English, Ukrainian,
   an example, a tag. `match` = what gets underlined in a dialogue line.
   ========================================================================= */
const PHRASES = {
  'check-in':         { en:"I'd like to check in.", match:"I'd like to check in", ua:"Я хотів(-ла) б заселитися.",
                        simple:"What you say at a hotel desk when you arrive.", ex:"“Good evening! I'd like to check in, please.”", tag:"polite" },
  'have-reservation': { en:"I have a reservation.", match:"I have a reservation", ua:"У мене є бронювання.",
                        simple:"You booked a room (or a table) before you came.", ex:"“Hi! I have a reservation for tonight.”", tag:"neutral" },
  'theres-problem':   { en:"There's a problem with…", match:"There's a problem with", ua:"Є проблема з…",
                        simple:"A calm, polite way to start explaining a problem.", ex:"“There's a problem with my key card.”", tag:"neutral" },
  'doesnt-work':      { en:"It doesn't seem to work.", match:"doesn't seem to work", ua:"Здається, воно не працює.",
                        simple:"Softer than “It's broken” — you're not 100% sure why.", ex:"“Sorry, the Wi-Fi doesn't seem to work.”", tag:"polite" },
  'would-you-mind':   { en:"Would you mind…?", match:"Would you mind", ua:"Чи не могли б ви…? / Вам не важко…?",
                        simple:"A very polite request. Use the -ing form after it: “Would you mind telling me…?”", ex:"“Would you mind telling me the Wi-Fi password?”", tag:"polite" },
  'place-nearby':     { en:"Is there a place nearby?", match:"place nearby", ua:"Тут є якесь місце поблизу?",
                        simple:"Asking if something useful is close to where you are.", ex:"“Is there a place nearby where I can get some food?”", tag:"neutral" },
  'how-get-there':    { en:"How do I get there?", match:"How do I get there", ua:"Як мені туди дістатися?",
                        simple:"Asking for directions to a place.", ex:"“A diner? Great! How do I get there?”", tag:"neutral" },
  'could-i-get':      { en:"Could I get…?", match:"Could I get", ua:"Можна мені…?",
                        simple:"The most natural way to order food or drinks in the US.", ex:"“Could I get a cheeseburger and a lemonade, please?”", tag:"polite" },
  'here-or-to-go':    { en:"For here or to go?", match:"for here or to go", ua:"Тут чи з собою?",
                        simple:"Staff ask if you'll eat inside or take the food away.", ex:"“For here or to go?” “For here, please.”", tag:"informal" },
  'sounds-great':     { en:"That sounds great!", match:"sounds great", ua:"Звучить чудово!",
                        simple:"A happy way to say yes to an idea or a plan.", ex:"“Want to play basketball on Saturday?” “That sounds great!”", tag:"informal" },
  'new-around-here':  { en:"I'm new around here.", match:"new around here", ua:"Я тут новенький(-а).",
                        simple:"You just arrived and don't know the area yet.", ex:"“Sorry, I don't know this street — I'm new around here.”", tag:"neutral" },
  'looking-forward':  { en:"I'm looking forward to it.", match:"looking forward to", ua:"Я з нетерпінням чекаю цього.",
                        simple:"You're happy and excited about something in the future.", ex:"“See you tomorrow at 11!” “Great — I'm looking forward to it!”", tag:"neutral" },
  'cant-miss':        { en:"You can't miss it.", match:"can't miss", ua:"Ви його точно не пропустите.",
                        simple:"It's very easy to see — you'll find it for sure.", ex:"“It's the big pink neon sign. You can't miss it.”", tag:"informal" },
  'small-world':      { en:"What a small world!", match:"small world", ua:"Який тісний світ!",
                        simple:"What you say when you find a surprising connection.", ex:"“You know my cousin? What a small world!”", tag:"informal" }
};
/* the 15 expressions of the episode (+ “Would you mind…?”). The two from Episode 1 are reviewed, not re-added. */
const EP2_PHRASES = ['check-in','have-reservation','could-you-help','theres-problem','doesnt-work','would-you-mind','place-nearby',
  'how-get-there','could-i-get','here-or-to-go','sounds-great','new-around-here','looking-forward','around-corner','cant-miss','small-world'];
const OWN_PHRASES = Object.keys(PHRASES);

/* ---------- the diner menu (fictional gameplay prices, before tax and tip) ---------- */
const MENU = {
  mains:  [ { id:'burger',   name:'Cheeseburger',     price:12, icon:'🍔', a:'a cheeseburger',     desc:'Our famous Moonlight burger' },
            { id:'sandwich', name:'Chicken sandwich', price:11, icon:'🥪', a:'a chicken sandwich', desc:'Crispy chicken, pickles, mayo' },
            { id:'salad',    name:'Caesar salad',     price:10, icon:'🥗', a:'a Caesar salad',     desc:'Romaine, parmesan, croutons · vegetarian' } ],
  drinks: [ { id:'lemonade', name:'Lemonade', price:4, icon:'🍋', a:'a lemonade' },
            { id:'cola',     name:'Cola',     price:3, icon:'🥤', a:'a cola' },
            { id:'water',    name:'Water',    price:2, icon:'💧', a:'a bottle of water' } ],
  extra:  { id:'fries', name:'Fries', price:4, icon:'🍟', a:'some fries' }
};
const mainOf  = f => MENU.mains.find(m => m.id === f.meal) || null;
const drinkOf = f => MENU.drinks.find(d => d.id === f.drink) || null;
const subtotal = f => (mainOf(f) ? mainOf(f).price : 0) + (drinkOf(f) ? drinkOf(f).price : 0) + (f.fries ? MENU.extra.price : 0);
function orderList(f){
  const parts = [mainOf(f) && mainOf(f).a, f.fries && MENU.extra.a, drinkOf(f) && drinkOf(f).a].filter(Boolean);
  if(parts.length <= 1) return parts.join('');
  return parts.slice(0, -1).join(', ') + ', and ' + parts[parts.length - 1];
}
const orderSentence = f => `Could I get ${orderList(f) || 'a cheeseburger, some fries, and a lemonade'}, please?`;
const hasOnions = f => f.meal === 'burger' || f.meal === 'sandwich';

/* ---------- the student's first name (from the course platform, if it has one) ---------- */
function playerName(){
  try { const n = typeof window.lilaPlayerName === 'function' ? window.lilaPlayerName() : null; return n && /^[A-Za-zÀ-ÿ'’-]{2,20}$/.test(n) ? n : null; } catch(e){ return null; }
}
function typo(name){
  if(!name || name.length < 3) return null;
  const i = Math.max(1, name.length - 3), a = name.split('');
  if(a[i] !== a[i + 1]){ [a[i], a[i + 1]] = [a[i + 1], a[i]]; return a.join(''); }
  return name.slice(0, i) + a[i] + name.slice(i);
}

/* =========================================================================
   INVENTORY — DATA.items keeps names; descriptions can depend on choices
   ========================================================================= */
const ITEMS = {
  'Booking confirmation':  { icon:'📧', desc:"Email from the LA Exchange Program: Palm Court Hotel · 1 night · Saturday, August 17 · Confirmation #PC-48213." },
  'Room 308 key card':     { icon:'🔑', desc:"Room 308 — Palm Court Hotel. Your first room in Los Angeles. (The Wi-Fi password is printed inside the sleeve.)" },
  'Moonlight Diner receipt': { icon:'🧾', desc: () => {
      const f = (peekSt(EP_ID) || { flags:{} }).flags;
      const lines = [mainOf(f), f.fries && MENU.extra, drinkOf(f)].filter(Boolean).map(x => `${x.name} $${x.price}`);
      return lines.length ? `Moonlight Diner · ${lines.join(' · ')} — Subtotal $${subtotal(f)} (before tax & tip)` : 'Moonlight Diner — your first dinner in LA.';
    } },
  "Jake's contact":        { icon:'📇', desc:"A new friend from LA. He seems to know something about the Millers." }
};
const EP2_ITEMS = ['Room 308 key card', 'Moonlight Diner receipt', "Jake's contact"];

/* Characters who speak in this episode. `voice` tunes browser text-to-speech. */
const SPEAKERS = {
  daniel: { name:'Daniel', role:'Reception · Palm Court Hotel', color:'#5AB6F9', voice:{ g:'m', pitch:1.02, rate:1.0, idx:1 } },
  sophie: { name:'Sophie', role:'Moonlight Diner', color:'#ff8fb1', voice:{ g:'f', pitch:1.12, rate:1.05, idx:0 } },
  jake:   { name:'Jake', role:'Local teen', color:'#6DBB75', voice:{ g:'m', pitch:1.14, rate:1.06, idx:2 } },
  local:  { name:'Local', role:'Out walking his dog', color:'#9B8ECF', voice:{ g:'m', pitch:0.9, rate:0.94, idx:0 } },
  rachel: { name:'Rachel Miller', role:'Host family', color:'#F3E5C8', dark:true, voice:{ g:'f', pitch:1.0, rate:0.95, idx:1 } }
};

/* =========================================================================
   STORY — 8 scenes. A node continues to the next key unless it says `next`.
   ========================================================================= */
const say   = (who, text, ua, more) => Object.assign({ type:'say', who, text, ua }, more || {});
const think = (text, ua, more) => Object.assign({ type:'think', text, ua }, more || {});
const narr  = (text, ua, more) => Object.assign({ type:'narr', text, ua }, more || {});

const SCENES = [

/* ---------------------------------------------------------------- SCENE 1 */
{ id:'s1', n:1, title:'The Check-In Problem', emoji:'🏨', objective:'Save your reservation',
  bg:'exterior', ambience:'lobby', clock:'9:15 PM',
  hotspots:[
    { id:'s1-door', x:52, y:46, ph:[80.7, 22], icon:'🚪', label:'Read the door sign', bgs:['hall'],
      text:"412. The light on the lock blinks red. It was green an hour ago!", ua:"412. Лампочка на замку блимає червоним. А годину тому була зелена!" },
    { id:'s1-bell', x:62, y:58, ph:[70, 64], icon:'🛎️', label:'Ring the bell', bgs:['lobby'],
      text:"Ding! Daniel looks up and smiles. Okay — maybe don't ring it twice. 😅", ua:"Дзинь! Деніел підводить очі й усміхається. Добре — мабуть, двічі не варто. 😅" },
    { id:'s1-rack', x:16, y:52, ph:[16, 59], icon:'🪧', label:'Read the little sign', bgs:['lobby'],
      text:"“A warm welcome to Palm Court.” Next to it, a pile of brochures: Santa Monica Pier, Griffith Observatory, the Hollywood Walk of Fame… So much to see.", ua:"«Тепло вітаємо в Palm Court». Поруч — купка буклетів: пірс Санта-Моніки, обсерваторія Гріффіта, Голлівудська алея слави… Стільки всього!" }
  ],
  nodes:{
    open:  { type:'cards', cards:['LOS ANGELES · 9:15 PM','PALM COURT HOTEL','DAY 1 · NIGHT'],
             title:{ eyebrow:'SEASON 1 · EPISODE 2', big:'FIRST NIGHT IN LA', sub:'One city. One night. A thousand possibilities.' } },
    arrive:narr("You've finally reached your hotel. You're tired, hungry, and ready to sleep.",
                "Ти нарешті в готелі. Ти втомлений(-а), голодний(-а) й готовий(-а) спати.", { cam:'push' }),
    water: think("I only went downstairs for a bottle of water. Two minutes. That's all.",
                 "Я ж тільки спустився(-лася) по пляшку води. Дві хвилини. Усе.", { bg:'hall', cam:'drift' }),
    lock:  { type:'lock', key:'s1_lock' },
    srsly: think("Seriously? It worked an hour ago!", "Серйозно? Годину тому все працювало!"),
    what:  { type:'choice', prompt:"What do you do?", ua:"Що робитимеш?", key:'cardMove', options:[
             { text:"Go down to reception and ask for help.", ua:"Спуститися на рецепцію й попросити допомоги.", emoji:'🛎️', value:'reception', next:'lobby' },
             { text:"Try the card one more time.", ua:"Спробувати картку ще раз.", emoji:'💳', value:'again', next:'again' } ] },
    again: think("Beep. Red light. Again. Okay… reception it is.", "Біп. Червоне світло. Знову. Гаразд… на рецепцію.", { sfx:'card-bad', next:'lobby' }),
    lobby: narr("The lobby is quiet: soft music, a big palm in a pot, and one receptionist behind the desk.",
                "У фоє тихо: м'яка музика, велика пальма в горщику й один адміністратор за стійкою.", { bg:'lobby', cam:'drift' }),
    d1:    say('daniel', "Good evening! Welcome to the Palm Court Hotel. How can I help you?",
               "Доброго вечора! Ласкаво просимо до готелю «Палм Корт». Чим можу допомогти?", { meet:'daniel' }),
    expl:  { type:'choice', speak:true, prompt:"Explain the problem:", ua:"Поясни, що сталося:", options:[
             { text:"Hi! There's a problem with my key card. It doesn't seem to work.", ua:"Привіт! Є проблема з моєю карткою-ключем. Здається, вона не працює.", vocab:['theres-problem','doesnt-work'] },
             { text:"Hi! Sorry — my key card doesn't seem to work.", ua:"Привіт! Перепрошую — здається, моя картка-ключ не працює.", vocab:['doesnt-work'] } ] },
    d2:    say('daniel', "Oh, no. Let me take a look. What's your room number?", "Ой. Дайте погляну. Який у вас номер кімнати?"),
    d3:    say('you', "Room 412.", "Номер 412."),
    d4:    say('daniel', "Hmm… That's strange. Room 412 is empty in the system. I can't find your reservation.",
               "Хм… Дивно. У системі номер 412 вільний. Я не можу знайти ваше бронювання.", { sfx:'typing' }),
    empty: think("Empty?! My suitcase is up there!", "Вільний?! Там же моя валіза!"),
    d5:    say('daniel', "Don't worry. You're not the first person to have a problem on their first night in LA.",
               "Не хвилюйтеся. Ви не перша людина, в якої перша ніч у Лос-Анджелесі починається з проблеми."),
    d6:    say('daniel', "Let's start again. Do you have a reservation?", "Почнімо спочатку. У вас є бронювання?"),
    res:   { type:'choice', speak:true, prompt:"Answer Daniel:", ua:"Відповідай Деніелу:", options: f => [
             playerName()
               ? { text:`Yes, I do. I have a reservation. It's under ${playerName()}.`, ua:`Так. У мене є бронювання. На ім'я ${playerName()}.`, vocab:['have-reservation'] }
               : { text:"Yes, I do. I have a reservation. It's under my name.", ua:"Так. У мене є бронювання. На моє ім'я.", vocab:['have-reservation'] },
             { text:"Yes — I have a reservation. My exchange program booked it.", ua:"Так — у мене є бронювання. Його зробила моя програма обміну.", vocab:['have-reservation'] } ] },
    d7:    say('daniel', "Could you show me your booking confirmation?", "Можете показати підтвердження бронювання?"),
    docs:  { type:'inventory', who:'daniel', want:'Booking confirmation', key:'s1_docs', trayTitle:'Mission 1 · Save your reservation',
             only:['Passport', 'Booking confirmation', 'Exchange program folder'],
             prompt:"Which document does Daniel need? Show it to him.", ua:"Який документ потрібен Деніелу? Покажи йому.",
             wrong:{ 'Passport':["Thanks — I'll need that in a second. But first, the booking confirmation, please. Probably an email from your program?",
                                 "Дякую — паспорт знадобиться за хвилинку. Але спершу — підтвердження бронювання. Мабуть, лист від вашої програми?"],
                     'Exchange program folder':["Wow, that's a lot of papers! 😄 The booking confirmation is usually an email.",
                                 "Ого, скільки паперів! 😄 Підтвердження бронювання — це зазвичай електронний лист."] } },
    here:  say('you', "Here's the confirmation email.", "Ось лист із підтвердженням."),
    tell:  { type:'answer', key:'s1_explain', label:'Speaking challenge — explain it in your own words',
             prompt:"Explain the situation to Daniel. What happened, and what do you want him to do?",
             ua:"Поясни Деніелу ситуацію своїми словами: що сталося і що ти просиш зробити?",
             hints:["Start with what happened: “The exchange program booked…” or “I booked…”",
                    "Then ask politely: “Could you check again, please?”"],
             model:"The exchange program booked a room for me. Here's my confirmation email. Could you check again, please?",
             vocab:['have-reservation','could-you-help'],
             after:{ who:'daniel', text:"Of course. Let me check again…", ua:"Звісно. Зараз перевірю ще раз…" } },
    d8:    say('daniel', () => playerName()
                 ? `Found it! Someone typed “${typo(playerName())}” instead of “${playerName()}”. Just a tiny spelling mistake. Sorry about that.`
                 : "Found it! Someone typed your name with two letters the wrong way round. Just a tiny spelling mistake. Sorry about that.",
               () => playerName()
                 ? `Знайшов! Хтось надрукував «${typo(playerName())}» замість «${playerName()}». Просто крихітна помилка в написанні. Перепрошую.`
                 : "Знайшов! Хтось переплутав дві літери у вашому імені. Просто крихітна помилка в написанні. Перепрошую.", { sfx:'typing' }),
    d9:    say('daniel', "Because of the mistake, the system gave 412 to another guest. But I have a nicer room for you.",
               "Через цю помилку система віддала 412 іншому гостю. Але в мене є для вас кращий номер."),
    d10:   say('daniel', "Okay — let's do this properly. Shall we start over?", "Отже — зробімо все як слід. Почнімо спочатку?"),
    ci:    { type:'choice', speak:true, prompt:"Start over — the right way:", ua:"Почни спочатку — як слід:", options:[
             { text:"Sure! Good evening. I'd like to check in, please.", ua:"Звісно! Доброго вечора. Я хотів(-ла) б заселитися.", vocab:['check-in'] },
             { text:"Ha, okay! Hi — I'd like to check in, please.", ua:"Ха, гаразд! Привіт — я хотів(-ла) б заселитися.", vocab:['check-in'] } ] },
    d11:   say('daniel', "Welcome to the Palm Court Hotel! 😄 You're in Room 308. And don't worry — I'll have your suitcase sent up right away.",
               "Ласкаво просимо до «Палм Корт»! 😄 Ваш номер — 308. І не хвилюйтеся — вашу валізу зараз же піднімуть нагору."),
    room:  { type:'listen', who:'daniel', key:'s1_room',
             audio:"So: Room 308, on the third floor. The elevator is just around the corner.", ua:"Отже: номер 308, на третьому поверсі. Ліфт — одразу за рогом.",
             question:"What's your new room?", qua:"Який у тебе тепер номер?",
             options:[ { text:'Room 308', correct:true }, { text:'Room 412' }, { text:'Room 318' } ],
             hints:[ "Listen to the number at the very start.", "Three… zero… eight. And it's on the third floor.", "Новий номер — 308, третій поверх." ] },
    thx:   { type:'choice', speak:true, prompt:"Thank Daniel:", ua:"Подякуй Деніелу:", options:[
             { text:"Thank you so much, Daniel!", ua:"Щиро дякую, Деніеле!" },
             { text:"Great. Thanks for your help!", ua:"Чудово. Дякую за допомогу!" } ] },
    card:  say('daniel', "Anytime. Here's your key card.", "Нема за що. Ось ваша картка-ключ.", { sfx:'card-ok' }),
    win:   { type:'reward', banner:'RESERVATION SAVED! 🔑', sub:'You explained a problem — and checked in — in English.',
             item:'Room 308 key card', phrases:['theres-problem','doesnt-work','have-reservation','check-in'] },
    end:   { type:'end', next:'s2' }
  } },

/* ---------------------------------------------------------------- SCENE 2 */
{ id:'s2', n:2, title:'Room 308', emoji:'🔑', objective:'Get online',
  bg:'room', ambience:'room', clock:'9:32 PM',
  hotspots:[
    { id:'s2-window', x:66, y:36, ph:[69, 36], icon:'🌆', label:'Look out of the window', bgs:['room'],
      text:"Palm trees, red tail lights, and a sky that's still a little pink. LA, you're showing off.", ua:"Пальми, червоні вогні машин і ще трохи рожеве небо. Лос-Анджелесе, ти хизуєшся." },
    { id:'s2-case', x:24, y:74, ph:[28, 62], icon:'🧳', label:'Check your suitcase', bgs:['room'],
      text:"Black, medium-sized, orange ribbon. Still mine. Thank you, Daniel. 😅", ua:"Чорна, середня, помаранчева стрічка. Досі моя. Дякую, Деніеле. 😅" },
    { id:'s2-sleeve', x:82, y:66, ph:[87.5, 67], icon:'💳', label:'Look at the key card sleeve', bgs:['room'],
      when: f => !f.wifiOn,
      text:"A little paper sleeve for your key card: “Palm Court Hotel · Room 308 · Welcome!” There's more printed inside.", ua:"Маленький паперовий конвертик для картки: «Палм Корт · номер 308 · Ласкаво просимо!» Усередині ще щось надруковано." }
  ],
  nodes:{
    in:    think("Room 308. Third floor. And look — my suitcase is already here!", "Номер 308. Третій поверх. І дивись — моя валіза вже тут!", { cam:'drift' }),
    look:  narr("The room looks perfect. The bed is comfortable, the view is amazing… but there's one little problem.",
                "Номер ідеальний. Ліжко зручне, краєвид неймовірний… але є одна маленька проблема."),
    wifi:  { type:'wifi', key:'s2_wifi' },
    ugh:   think("No Wi-Fi. No Mia. No maps. Great.", "Ні Wi-Fi. Ні Мії. Ні карт. Чудово."),
    fix:   { type:'choice', prompt:"Mission 2 · Fix the problem. What do you do?", ua:"Місія 2 · Розв'яжи проблему. Що робитимеш?", key:'hotelChoice', options:[
             { text:"Call the reception.", ua:"Зателефонувати на рецепцію.", emoji:'📞', value:'call', next:'c_prep' },
             { text:"Go downstairs and ask for help.", ua:"Спуститися вниз і попросити допомоги.", emoji:'🚶', value:'ask', next:'a_prep' },
             { text:"Try to fix it yourself.", ua:"Спробувати розібратися самому(-ій).", emoji:'🔧', value:'self', next:'s_try' } ] },
    /* A — the room phone */
    c_prep:{ type:'answer', key:'s2_request', label:'Speaking challenge — a polite request',
             prompt:"Before you call: how will you ask Daniel for help? Make a polite request.",
             ua:"Перш ніж телефонувати: як ти ввічливо попросиш Деніела про допомогу?",
             hints:["Start with “There's a problem with…”, then ask with “Could you…?”", "Very polite: “Would you mind telling me the password?”"],
             model:"Hi, I'm calling from Room 308. There's a problem with the Wi-Fi. Could you help me connect, please?",
             vocab:['theres-problem','could-you-help','would-you-mind'], next:'c_ring' },
    c_ring:narr("You pick up the room phone and press 0. Ring… ring…", "Ти береш телефон у номері й натискаєш 0. Гудок… гудок…", { sfx:'ring' }),
    c1:    say('daniel', "Front desk. Daniel speaking.", "Рецепція. Деніел слухає."),
    c2:    { type:'choice', speak:true, prompt:"Say why you're calling:", ua:"Скажи, чому телефонуєш:", options:[
             { text:"Hi, I'm calling from Room 308. The Wi-Fi isn't working.", ua:"Привіт, я телефоную з номера 308. Не працює Wi-Fi." },
             { text:"Hi Daniel, it's Room 308. There's a problem with the Wi-Fi.", ua:"Привіт, Деніеле, це номер 308. Є проблема з Wi-Fi.", vocab:['theres-problem'] } ] },
    c3:    say('daniel', "I'm sorry about that. Have you tried connecting to PalmCourt_Guest?", "Перепрошую за це. Ви пробували підключитися до PalmCourt_Guest?"),
    c4:    say('you', "Yes, but it keeps asking for a password.", "Так, але воно весь час просить пароль."),
    c5:    say('daniel', "Oh! My mistake. The password is on your key card holder.", "О! Моя помилка. Пароль надруковано на конвертику для картки."),
    c6:    say('you', "Got it! Thanks for your help.", "Зрозумів(-ла)! Дякую за допомогу."),
    c7:    say('daniel', "Anytime. Enjoy your first night in LA!", "Завжди будь ласка. Гарної першої ночі в Лос-Анджелесі!", { next:'holder' }),
    /* B — down to the lobby again */
    a_prep:{ type:'answer', key:'s2_request', label:'Speaking challenge — a polite request',
             prompt:"On your way downstairs: plan a polite request for Daniel.",
             ua:"Дорогою вниз: придумай ввічливе прохання до Деніела.",
             hints:["Start with “Sorry — there's a problem with…”", "Very polite: “Would you mind telling me the password?”"],
             model:"Hi again! Sorry — there's a problem with the Wi-Fi in my room. Would you mind telling me the password?",
             vocab:['theres-problem','could-you-help','would-you-mind'], next:'a1' },
    a1:    narr("Back to the lobby. Third time tonight.", "Знову у фоє. Утретє за вечір.", { bg:'lobby' }),
    a2:    say('daniel', "Back so soon? 😄 What can I do for you?", "Так швидко повернулися? 😄 Чим можу допомогти?"),
    a3:    { type:'choice', speak:true, prompt:"Ask Daniel:", ua:"Попроси Деніела:", options:[
             { text:"Sorry! There's a problem with the Wi-Fi. Would you mind telling me the password?", ua:"Перепрошую! Є проблема з Wi-Fi. Чи не могли б ви сказати мені пароль?", vocab:['theres-problem','would-you-mind'] },
             { text:"Hi again! Could you help me with the Wi-Fi, please?", ua:"Знову привіт! Чи не могли б ви допомогти мені з Wi-Fi?", vocab:['could-you-help'] } ] },
    a4:    say('daniel', "Ah, the Wi-Fi! My bad — I forgot to tell you. The password is on your key card holder.", "А, Wi-Fi! Моя провина — забув сказати. Пароль на конвертику для картки."),
    a5:    say('you', "Oh! Okay — thanks!", "О! Гаразд — дякую!"),
    a6:    say('daniel', "Anytime. And hey — no more problems tonight, okay? 😄", "Завжди радий. І слухайте — більше жодних проблем сьогодні, домовились? 😄"),
    a7:    think("Deal.", "Домовились.", { bg:'room', next:'holder' }),
    /* C — do it yourself */
    s_try: { type:'selffix', key:'s2_self' },
    s_found:think("The key card holder! There's something printed inside…", "Конвертик від картки! Там усередині щось надруковано…", { next:'holder' }),
    /* everyone ends up here */
    holder:{ type:'keycard', key:'s2_holder' },
    s_prac:{ type:'answer', key:'s2_request', when: f => f.hotelChoice === 'self', label:'Speaking challenge — a polite request',
             prompt:"You fixed it yourself! But practise anyway: how could you ask the front desk for the password — politely?",
             ua:"Ти впорався(-лася) сам(-а)! Але потренуйся: як ввічливо попросити пароль на рецепції?",
             hints:["Try “Could you…?” or “Would you mind…?”", "Remember: after “Would you mind…” use -ing: “telling”, “helping”."],
             model:"Hi! Would you mind telling me the Wi-Fi password, please?", vocab:['would-you-mind','could-you-help'] },
    online:think("Connected! Forty-seven notifications… and one of them is Mia.", "Підключено! Сорок сім сповіщень… і одне з них від Мії."),
    ping:  { type:'notify', thread:'mia', text:"I SEE YOU ONLINE!!! 👀 Pick up!!" },
    end:   { type:'end', next:'s3' }
  } },

/* ---------------------------------------------------------------- SCENE 3 */
{ id:'s3', n:3, title:'Mia Is Calling', emoji:'📱', objective:'Talk to Mia',
  bg:'room', ambience:'room', clock:'9:41 PM',
  hotspots:[],
  nodes:{
    ring:  { type:'callstart', key:'s3_call' },
    m1:    say('mia', "FINALLY! Wi-Fi! I can actually SEE you! 😂", "НАРЕШТІ! Wi-Fi! Я тебе нарешті БАЧУ! 😂", { hideHotspots:true }),
    m2:    say('mia', "Texting is NOT the same. So, tell me EVERYTHING. How was the flight? Did you get lost? Have you met any celebrities yet?",
               "Переписка — це НЕ те. Тож розповідай УСЕ. Як переліт? Ти загубився(-лася)? Уже зустрів(-ла) якусь знаменитість?", { hideHotspots:true }),
    upd:   { type:'talk', key:'s3_update', title:'Mission 3 · The 30-second update',
             prompt:"Tell Mia about your first day — out loud. Try to keep talking for about 30 seconds.",
             ua:"Розкажи Мії про свій перший день — уголос. Спробуй говорити приблизно 30 секунд.",
             seconds:30, minSec:10,
             topics:[ { k:'flight', label:'The flight' }, { k:'airport', label:'The airport' }, { k:'hotel', label:'Getting to the hotel' },
                      { k:'la', label:'Your first impressions of LA' }, { k:'feel', label:'How you feel right now' } ],
             starters:["The flight was…","At the airport, I…","Then a driver called Chris…","LA is…","Right now I feel…"],
             vocab:['how-was-flight','little-nervous','didnt-expect','could-you-help'],
             model: () => {
               const e1 = (peekSt('ep1') || { flags:{} }).flags;
               const feel = { nervous:"a little nervous", excited:"so excited", mixed:"excited and nervous at the same time" }[e1.arrivalFeeling] || "excited";
               return `The flight was really long, but it was okay. When I landed, I felt ${feel}. At the airport, I couldn't find my suitcase — but an agent helped me, and I found it at Carousel 6! Then a driver called Chris took me to the hotel. LA is huge, and the palm trees are amazing. Right now I'm tired, but really happy.`;
             },
             after:{ who:'mia', text:"Okay, I'm SO jealous right now. 😭", ua:"Так, я ЗАРАЗ просто шалено заздрю. 😭" } },
    q1:    say('mia', "What was the most surprising thing about LA?", "Що тебе найбільше здивувало в Лос-Анджелесі?", { hideHotspots:true }),
    a1:    { type:'answer', key:'s3_surprise', prompt:"Answer Mia: what surprised you most?", ua:"Відповідай Мії: що тебе найбільше здивувало?",
             hints:["Start with: “The most surprising thing was…”", "Ideas: the size of the airport, the palm trees, the huge roads, the weather…"],
             model:"The most surprising thing was how big everything is! The airport was huge, and the roads have so many lanes.",
             after:{ who:'mia', text:"Okay, that's actually so cool.", ua:"Окей, це справді круто." }, hideHotspots:true },
    q2:    say('mia', "What's the first thing you're going to do tomorrow?", "Що ти зробиш завтра найперше?", { hideHotspots:true }),
    a2:    { type:'answer', key:'s3_tomorrow', prompt:"Answer Mia — use “I'm going to…” for your plans.", ua:"Відповідай Мії — для планів використовуй «I'm going to…».",
             hints:["Plans → “I'm going to…”", "For example: have breakfast, call my mom, meet the Millers…"],
             model:"I'm going to have a big breakfast, and then I'm going to meet my host family!",
             after:{ who:'mia', text:"Good plan. VERY good plan.", ua:"Гарний план. ДУЖЕ гарний план." }, hideHotspots:true },
    q3:    say('mia', "And are you excited or nervous about meeting the Millers?", "А ти радієш чи хвилюєшся перед зустріччю з Міллерами?", { hideHotspots:true }),
    a3:    { type:'answer', key:'s3_millers', prompt:"Tell Mia how you feel — and why.", ua:"Скажи Мії, що відчуваєш — і чому.",
             hints:["“I'm excited because…” / “I'm a little nervous because…”", "You can say both: “I'm excited, but I'm also a little nervous.”"],
             model:"I'm excited, but I'm also a little nervous. What if they don't understand my English?", vocab:['little-nervous','looking-forward'],
             after:{ who:'mia', text:"Aww. They're going to LOVE you. 💙", ua:"Ой. Вони тебе ОБОЖНЮВАТИМУТЬ. 💙" }, hideHotspots:true },
    sand:  say('mia', "Wait. Please tell me you're not planning to survive on airport sandwiches.", "Стоп. Тільки не кажи, що збираєшся жити на сендвічах з аеропорту.", { hideHotspots:true }),
    growl: narr("GRRRRRWL. Your stomach answers for you. Loudly.", "Г-Р-Р-Р-Р. Твій шлунок відповідає за тебе. Голосно.", { sfx:'stomach', cam:'shake', hideHotspots:true }),
    m3:    say('mia', "Was that your STOMACH?! 😂 GO GET SOME FOOD!", "Це був твій ШЛУНОК?! 😂 ЙДИ ПОЇЖ!", { hideHotspots:true }),
    go:    { type:'choice', speak:true, prompt:"Answer Mia:", ua:"Відповідай Мії:", options:[
             { text:"Okay, okay! I'm going!", ua:"Добре, добре! Уже йду!" },
             { text:"Ha! You're right. I'm starving.", ua:"Ха! Ти права. Я страшенно голодний(-а)." } ] },
    m4:    say('mia', "Text me what you eat. Photos or it didn't happen! 📸", "Напиши, що їстимеш. Без фото не рахується! 📸", { hideHotspots:true }),
    bye:   { type:'callend' },
    n:     narr("She's right. You haven't had a proper meal all day.", "Вона права. Ти за весь день нормально не поїв(-ла)."),
    hmm:   think("Is there a place nearby? Let's find out.", "Чи є тут якесь місце поблизу? Зараз дізнаємося.", { vocab:['place-nearby'] }),
    end:   { type:'end', next:'s4' }
  } },

/* ---------------------------------------------------------------- SCENE 4 */
{ id:'s4', n:4, title:'Into the City', emoji:'🌴', objective:'Find the diner',
  bg:'street', ambience:'street', clock:'9:58 PM',
  hotspots:[
    { id:'s4-truck', x:16, y:37, ph:[13, 17], icon:'🌮', label:'Look at the taco place', bgs:['street'],
      text:"A neon taco the size of a car — and the place is still busy at 10 PM. Noted for tomorrow.", ua:"Неоновий тако завбільшки з машину — і о десятій вечора там досі повно людей. Записую на завтра." },
    { id:'s4-palm', x:22, y:19, ph:[40, 12], icon:'🌴', label:'Look up', bgs:['street'],
      text:"The palm trees are SO tall. They look like they're touching the stars.", ua:"Пальми ТАКІ високі. Здається, вони торкаються зірок." }
  ],
  nodes:{
    open:  narr("Los Angeles looks completely different at night. The streets are glowing, music is playing somewhere nearby, and you're ready to explore.",
                "Уночі Лос-Анджелес зовсім інший. Вулиці сяють, десь поруч грає музика — і ти готовий(-а) досліджувати.", { cam:'drift' }),
    which: think("Okay. Food. But which way?", "Так. Їжа. Але куди йти?"),
    ask:   { type:'choice', speak:true, prompt:"A man is walking his dog. Ask him!", ua:"Чоловік вигулює собаку. Запитай його!", options:[
             { text:"Excuse me, is there a diner around here?", ua:"Перепрошую, тут поблизу є закусочна?" },
             { text:"Excuse me — is there a place nearby where I can get some food?", ua:"Перепрошую — тут є якесь місце поблизу, де можна поїсти?", vocab:['place-nearby'] } ] },
    l1:    say('local', "Yeah! There's a great one just around the corner.", "Так! Тут за рогом є чудова.", { vocab:['around-corner'] }),
    how:   { type:'choice', speak:true, prompt:"Ask for directions:", ua:"Запитай дорогу:", options:[
             { text:"How do I get there?", ua:"Як мені туди дістатися?", vocab:['how-get-there'] },
             { text:"Great! How do I get there?", ua:"Чудово! Як мені туди дістатися?", vocab:['how-get-there'] } ] },
    dir:   { type:'listen', who:'local', key:'s4_dir', set:{ gotDirections:true },
             audio:"Go straight, turn left at the traffic lights, and you'll see it next to a bookstore.",
             ua:"Ідіть прямо, на світлофорі поверніть ліворуч — і побачите її поруч із книгарнею.",
             question:"Where do you turn left?", qua:"Де треба повернути ліворуч?",
             options:[ { text:'At the traffic lights', correct:true }, { text:'At the bookstore' }, { text:'At the hotel' } ],
             hints:[ "Listen to the middle of his sentence: “turn left at the…”", "Traffic lights = red, yellow, green. 🚦", "Ліворуч треба повернути на світлофорі." ] },
    far:   { type:'choice', speak:true, prompt:"One more question:", ua:"Ще одне запитання:", options:[
             { text:"Thanks! Is it far?", ua:"Дякую! Це далеко?" },
             { text:"Thank you! Is it far from here?", ua:"Дякую! Це далеко звідси?" } ] },
    l2:    say('local', "Not at all. About five minutes. You can't miss the neon sign.", "Зовсім ні. Хвилин п'ять. Неонову вивіску ви точно не пропустите.", { vocab:['cant-miss'] }),
    dog:   narr("His dog sniffs your shoes, decides you're okay, and off they go.", "Його пес обнюхує твої кросівки, вирішує, що ти нормальний(-а), — і вони йдуть далі."),
    map:   { type:'hood', key:'s4_map' },
    neon:  think("A pink-and-blue neon sign: MOONLIGHT DINER. He was right — you can't miss it.", "Рожево-блакитна неонова вивіска: MOONLIGHT DINER. Він мав рацію — не пропустиш.", { bg:'dinerOut', vocab:['cant-miss'] }),
    pin:   { type:'act', run:'unlockDiner' },
    end:   { type:'end', next:'s5' }
  } },

/* ---------------------------------------------------------------- SCENE 5 */
{ id:'s5', n:5, title:'The Late-Night Order', emoji:'🍔', objective:'Order your dinner',
  bg:'diner', ambience:'diner', clock:'10:10 PM',
  hotspots:[
    { id:'s5-juke', x:12, y:50, ph:[8, 50], icon:'🎵', label:'Check out the jukebox', bgs:['diner'],
      text:"A real jukebox! The songs are older than your parents. You love it.", ua:"Справжній музичний автомат! Пісні старші за твоїх батьків. Тобі подобається." },
    { id:'s5-pie', x:72, y:44, ph:[24, 45], icon:'🥧', label:'Look at the pies', bgs:['diner'],
      text:"A pie under a glass dome. The board says apple and blueberry — and the shakes are five dollars. Respect.", ua:"Пиріг під скляним ковпаком. На дошці — яблучний і чорничний, а молочні коктейлі по п'ять доларів. Повага." },
    { id:'s5-wall', x:88, y:28, ph:[6, 15], icon:'📷', label:'Look at the photo wall', bgs:['diner'],
      text:"Photos of happy customers. One says: “Westside Hawks — basketball champs!” A tall kid in the middle is holding a trophy.", ua:"Фото задоволених відвідувачів. На одному напис: «Westside Hawks — чемпіони з баскетболу!» Високий хлопець посередині тримає кубок." }
  ],
  nodes:{
    in:    narr("Warm light, red leather booths, a long counter, and the smell of fries. A little bell rings above the door.",
                "Тепле світло, червоні шкіряні диванчики, довга барна стійка й запах картоплі фрі. Над дверима дзеленчить дзвіночок.", { sfx:'bell', cam:'drift' }),
    s1:    say('sophie', "Hey there! Welcome to Moonlight Diner! Table for one?", "Привіт! Ласкаво просимо до «Мунлайт Дайнер»! Столик на одного?", { meet:'sophie-m' }),
    yes:   { type:'choice', speak:true, prompt:"Answer Sophie:", ua:"Відповідай Софі:", options:[
             { text:"Yes, please.", ua:"Так, будь ласка." }, { text:"Yes, just me, please.", ua:"Так, тільки я, будь ласка." } ] },
    s2:    say('sophie', "You look like you've had a long day.", "Схоже, у вас був довгий день."),
    arr:   { type:'choice', speak:true, prompt:"Tell her:", ua:"Розкажи їй:", options:[
             { text:"I just arrived in LA today.", ua:"Я сьогодні тільки прилетів(-ла) до Лос-Анджелеса." },
             { text:"I'm new around here — I just arrived today.", ua:"Я тут новенький(-а) — тільки сьогодні прилетів(-ла).", vocab:['new-around-here'] } ] },
    s3:    say('sophie', "Oh, a newcomer! First night in LA? Then you definitely need something good to eat.", "О, новенький(-а)! Перша ніч у Лос-Анджелесі? Тоді вам точно треба смачно поїсти."),
    s4:    say('sophie', "Our famous burger is right there on the menu. Take your time, hon.", "Наш знаменитий бургер — ось тут, у меню. Не поспішайте, сонечко.", { vocab:['take-your-time'] }),
    menu:  { type:'menu', key:'s5_menu' },
    order: { type:'answer', key:'s5_order', label:'Mission 5 · Order out loud',
             prompt:"Sophie is ready. Order your food — out loud.", ua:"Софі готова. Замов їжу — вголос.",
             hints:["Start with “Could I get…?”", "List your food, then finish with “please”. 🙂"],
             model: f => orderSentence(f), vocab:['could-i-get'] },
    oq:    say('sophie', f => hasOnions(f) ? "Sure thing! Wait — did you say with or without onions?" : "Sure thing! Wait — do you want the dressing on the side?",
               f => hasOnions(f) ? "Звісно! Стоп — ви сказали з цибулею чи без?" : "Звісно! Стоп — заправку подати окремо?"),
    clar:  { type:'choice', speak:true, key:'clarify', prompt:"Clarify your order:", ua:"Уточни замовлення:", options: f => (hasOnions(f) ? [
               { text:"Without onions, please.", ua:"Без цибулі, будь ласка.", value:'no-onions' },
               { text:"With onions, please.", ua:"З цибулею, будь ласка.", value:'onions' },
               { text:"Sorry, I meant without onions!", ua:"Перепрошую, я мав(-ла) на увазі без цибулі!", value:'no-onions' }
             ] : [
               { text:"On the side, please.", ua:"Окремо, будь ласка.", value:'side' },
               { text:"On the salad is fine, thanks.", ua:"Можна просто на салат, дякую.", value:'on' }
             ]).concat(f.changedOrder ? [] : [ { text:"Actually, could I change my order?", ua:"Взагалі-то, можна змінити замовлення?", value:'change', next:'change', set:{ changedOrder:true } } ]) },
    s5:    say('sophie', "Got it.", "Зрозуміла.", { next:'togo' }),
    change:say('sophie', "Of course! No problem at all.", "Звісно! Жодних проблем.", { next:'menu2' }),
    menu2: { type:'menu', key:'s5_menu2' },
    order2:{ type:'answer', key:'s5_order2', label:'Order again — out loud', prompt:"Tell Sophie your new order.", ua:"Скажи Софі нове замовлення.",
             hints:["“Could I get… instead?”", "Or: “Actually, I'd like…”"], model: f => orderSentence(f).replace(/, please\?$/, ' instead, please?'), vocab:['could-i-get'], next:'oq' },
    togo:  say('sophie', "And is that for here or to go?", "І це тут чи з собою?", { vocab:['here-or-to-go'] }),
    place: { type:'choice', speak:true, key:'orderMode', prompt:"Answer:", ua:"Відповідай:", options:[
             { text:"For here, please.", ua:"Тут, будь ласка.", value:'here' },
             { text:"To go, please.", ua:"З собою, будь ласка.", value:'togo' } ] },
    s6:    say('sophie', f => f.orderMode === 'togo' ? "To go — you got it. It'll be about ten minutes. Grab that booth while you wait!" : "Perfect. Coming right up!",
               f => f.orderMode === 'togo' ? "З собою — зрозуміла. Хвилин десять. Сідайте поки що за той столик!" : "Чудово. Зараз буде!"),
    more:  { type:'choice', prompt:"While you wait…", ua:"Поки чекаєш…", key:'waitAsk', options:[
             { text:"Ask Sophie: “How much is it?”", ua:"Запитати Софі: «Скільки це коштує?»", emoji:'💵', value:'price', next:'price' },
             { text:"Just relax and wait.", ua:"Просто відпочити й почекати.", emoji:'😌', value:'wait', next:'wait' } ] },
    price: say('sophie', f => `That comes to $${subtotal(f)} — before tax and tip.`, f => `Разом $${subtotal(f)} — без податку й чайових.`),
    tip:   think("Before tax AND tip? Okay, in the US the price on the menu isn't the final price. Good to know.", "Без податку І чайових? Ага, у США ціна в меню — ще не остаточна. Буду знати."),
    wait:  narr("Ten minutes later…", "Через десять хвилин…", { sfx:'bell' }),
    food:  { type:'meal' },
    yum:   think(f => `Oh wow. ${mainOf(f) ? 'This ' + mainOf(f).name.toLowerCase() : 'This'} is amazing.`, "Ого. Це неймовірно смачно."),
    win:   { type:'reward', banner:'ORDER UP! 🍔', sub:'You ordered a whole meal — in English.', achievement:'first-order',
             item:'Moonlight Diner receipt', phrases:['could-i-get','here-or-to-go','new-around-here'] },
    end:   { type:'end', next:'s6' }
  } },

/* ---------------------------------------------------------------- SCENE 6 */
{ id:'s6', n:6, title:'The Unexpected Connection', emoji:'👀', objective:'Get to know Jake',
  bg:'jake', ambience:'diner', clock:'10:28 PM',
  hotspots:[
    { id:'s6-wall', x:88, y:28, ph:[8, 14], icon:'📷', label:'Look at the photo wall', bgs:['jake'],
      text:"“Westside Hawks — basketball champs!” Wait… is that Jake in the back row?", ua:"«Westside Hawks — чемпіони з баскетболу!» Стоп… це Джейк у задньому ряду?" }
  ],
  nodes:{
    in:    narr("You're halfway through your meal when a guy in a hoodie at the next booth leans over.",
                "Ти доїв(-ла) до половини, коли хлопець у худі з сусіднього столика нахиляється до тебе.", { cam:'push' }),
    j1:    say('jake', "Sorry, I didn't mean to listen, but… did you say you're an exchange student?", "Вибач, я не хотів підслуховувати, але… ти сказав(-ла), що ти по обміну?"),
    y1:    { type:'choice', speak:true, prompt:"Answer:", ua:"Відповідай:", options:[
             { text:"Yeah, I just arrived today.", ua:"Ага, я сьогодні тільки прилетів(-ла)." }, { text:"Yes! I just arrived today.", ua:"Так! Я сьогодні тільки прилетів(-ла)." } ] },
    j2:    say('jake', "That's cool! Where are you from?", "Круто! А звідки ти?"),
    y2:    { type:'choice', speak:true, prompt:"Tell him:", ua:"Скажи йому:", options:[
             { text:"I'm from Ukraine.", ua:"Я з України." }, { text:"I'm from Ukraine — I'm here for the school year.", ua:"Я з України — я тут на навчальний рік." } ] },
    j3:    say('jake', "No way! Welcome to LA! I'm Jake.", "Нічого собі! Ласкаво просимо до Лос-Анджелеса! Я Джейк.", { meet:'jake' }),
    y3:    { type:'choice', speak:true, prompt:"Introduce yourself:", ua:"Познайомся:", options:[
             { text:"Nice to meet you, Jake.", ua:"Приємно познайомитися, Джейку.", vocab:['nice-to-meet'] },
             { text:"Hi Jake! Nice to meet you.", ua:"Привіт, Джейку! Приємно познайомитися.", vocab:['nice-to-meet'] } ] },
    j4:    say('jake', "So, where are you staying?", "То де ти зупинився(-лася)?"),
    y4:    { type:'choice', speak:true, prompt:"Answer:", ua:"Відповідай:", options:[
             { text:"At a hotel tonight. I'm moving in with my host family tomorrow.", ua:"Сьогодні в готелі. Завтра переїжджаю до приймаючої родини." },
             { text:"Just at a hotel tonight — tomorrow I'm moving in with my host family.", ua:"Сьогодні просто в готелі — а завтра переїжджаю до приймаючої родини." } ] },
    j5:    say('jake', "Oh, nice! What's their last name?", "О, класно! Яке в них прізвище?"),
    y5:    say('you', "Miller.", "Міллер."),
    j6:    say('jake', "Wait… the Millers? Do they have a son named—", "Стоп… Міллери? У них є син на ім'я—", { cam:'push' }),
    stop:  narr("Jake suddenly stops. Then he grins.", "Джейк раптом замовкає. А потім усміхається."),
    j7:    say('jake', "Actually, never mind. You'll find out tomorrow.", "Хоча, забудь. Завтра сам(-а) дізнаєшся."),
    y6:    { type:'choice', speak:true, prompt:"React:", ua:"Відреагуй:", options:[
             { text:"What? You can't just say that!", ua:"Що? Не можна просто так це сказати й замовкнути!" },
             { text:"Wait — you know them? What a small world! …So, who is it?", ua:"Стоп — ти їх знаєш? Який тісний світ! …То хто це?", vocab:['small-world'] } ] },
    j8:    say('jake', "Welcome to LA, my friend. Things are never boring here.", "Ласкаво просимо до Лос-Анджелеса, друже. Тут ніколи не буває нудно."),
    t:     think("First Chris, now Jake. Does EVERYONE in LA know something I don't?", "Спершу Кріс, тепер Джейк. Невже ВСІ в Лос-Анджелесі знають щось, чого не знаю я?"),
    ask:   { type:'jakeq', key:'s6_questions' },
    j9:    say('jake', "Okay, I gotta go — my mom thinks I'm “just getting fries”. 😂 Give me your number? If you want to shoot some hoops sometime, or see the city…",
               "Так, мені треба йти — мама думає, що я «просто по картоплю». 😂 Даси свій номер? Якщо захочеш покидати м'яч чи подивитися місто…"),
    y7:    { type:'choice', speak:true, prompt:"Answer Jake:", ua:"Відповідай Джейку:", options:[
             { text:"That sounds great!", ua:"Звучить чудово!", vocab:['sounds-great'] },
             { text:"Sure! That sounds great.", ua:"Звісно! Звучить чудово.", vocab:['sounds-great'] } ] },
    swap:  { type:'act', run:'swapNumbers' },
    jt:    { type:'notify', thread:'jake', text:"Yo, it's Jake 🏀" },
    jc:    { type:'phone', thread:'jake', steps:[
      { in:"Yo, it's Jake 🏀 Welcome to LA!", id:'e2s6j1' },
      { id:'e2s6j2', inFn: f => (f.jakeQuestions || []).includes('basketball') ? "Pan Pacific Park, Saturday? Bring your A-game 😎" : "If you ever need a tour guide — I know all the best places 😎" },
      { reply:{ id:'e2s6r1', options:[ { text:"Thanks! Nice to meet you 😊" }, { text:"Hey Jake! That sounds great 👍" } ] } },
      { in:"See you around! And good luck tomorrow… you'll need it 😂 (jk!)", id:'e2s6j3' },
      { end:'Finish your dinner' } ] },
    bye:   say('sophie', "Bye, hon! Come back soon — and good luck tomorrow!", "Бувайте, сонечко! Заходьте ще — і щасти завтра!", { bg:'diner' }),
    win:   { type:'reward', banner:'NEW FRIEND! 🤝', sub:'You made small talk — and asked great questions.', achievement:'friend',
             item:"Jake's contact", phrases:['small-world','sounds-great'] },
    end:   { type:'end', next:'s7' }
  } },

/* ---------------------------------------------------------------- SCENE 7 */
{ id:'s7', n:7, title:'A Message from the Millers', emoji:'🏡', objective:'Reply to Rachel',
  bg:'roomNight', ambience:'room', clock:'10:45 PM',
  hotspots:[
    { id:'s7-window', x:66, y:36, ph:[72, 35], icon:'🌃', label:'Look at the city', bgs:['roomNight'],
      text:"Somewhere out there is a house with a family that's waiting for me. Wild.", ua:"Десь там є будинок, де на мене чекає родина. Неймовірно." }
  ],
  nodes:{
    in:    narr("Back in Room 308. Full, happy — and very, very tired.", "Знову в номері 308. Ситий(-а), щасливий(-а) — і дуже-дуже втомлений(-а).", { cam:'drift' }),
    ping:  { type:'notify', thread:'rachel', text:"Hi! It's Rachel Miller. I hope you've had a lovely first evening in LA! 🏡" },
    chat:  { type:'phone', thread:'rachel', steps:[
      { in:"Hi! It's Rachel Miller. I hope you've had a lovely first evening in LA! 🏡", id:'e2s7m1' },
      { in:"We're looking forward to meeting you tomorrow. We know the plan was 9 o'clock, but David has a quick work call in the morning. Would 11 AM work for you? David can pick you up at your hotel.", id:'e2s7m2', vocab:'looking-forward' },
      { custom: ctx => replyToRachel(ctx) },
      { id:'e2s7m3', inFn: f => ({ friendly:"Yay! 😊 We're all so excited too!",
                                   professional:"Thank you — that's very kind of you. 😊",
                                   question:"Yes — just wait in the lobby. David drives a dark blue SUV, and he'll text you when he's there.",
                                   own:"Thank you so much for your message! 😊" })[f.rachelReplyStyle] || "Thank you! 😊" },
      { when: f => !!f.mentionedJake, in:"Oh, you met Jake? What a small world! I'll tell you more tomorrow. 😉", id:'e2s7m4' },
      { in:"Perfect! David will see you at 11. Sleep well! And don't worry — everyone here is very excited to meet you.", id:'e2s7m5' },
      { reply:{ id:'e2s7r2', options:[ { text:"Thank you! Good night! 😊" }, { text:"Good night, Rachel! See you tomorrow!" } ] } },
      { end:'Close the chat' } ] },
    plan:  { type:'act', run:'journalPlan' },
    t:     think("11 AM. David. The Millers. Tomorrow everything starts for real.", "Об 11:00. Девід. Міллери. Завтра все почнеться по-справжньому."),
    end:   { type:'end', next:'s8' }
  } },

/* ---------------------------------------------------------------- SCENE 8 */
{ id:'s8', n:8, title:'One Last Notification', emoji:'🌙', objective:'Decide what to do',
  bg:'night', ambience:'night', clock:'11:17 PM',
  hotspots:[],
  nodes:{
    in:    narr("The room is dark. Outside, the city is still awake — millions of tiny lights.", "У номері темно. А місто надворі ще не спить — мільйони крихітних вогників.", { cam:'drift' }),
    t1:    think("Teeth: brushed. Alarm: 9:30. Okay. Sleep.", "Зуби почищено. Будильник — на 9:30. Усе. Спати."),
    buzz:  { type:'notify', thread:'unknown', text:"Hey! I heard you're coming to the Miller house tomorrow…", sfx:'mystery' },
    msg:   { type:'phone', thread:'unknown', steps:[
      { in:"Hey! I heard you're coming to the Miller house tomorrow. Just a heads-up… things might be a little different from what you're expecting. 👀", id:'e2s8u1' },
      { end:'Put the phone down' } ] },
    who:   think("Who… is this?", "Хто… це?", { cam:'push' }),
    pick:  { type:'choice', prompt:"What would you do?", ua:"Що б ти зробив(-ла)?", key:'mysteryChoice', options:[
             { text:"Reply: “Who is this? What do you mean?”", ua:"Відповісти: «Хто це? Що ви маєте на увазі?»", emoji:'💬', value:'reply', next:'ra' },
             { text:"Ignore the message and go to sleep.", ua:"Не відповідати й лягти спати.", emoji:'😴', value:'ignore', next:'ib' },
             { text:"Tell Mia about the strange message.", ua:"Розповісти Мії про дивне повідомлення.", emoji:'📲', value:'mia', next:'mc' } ] },
    ra:    { type:'phone', thread:'unknown', steps:[
      { reply:{ id:'e2s8r1', status:'Delivered', options:[ { text:"Who is this? What do you mean?" } ] } },
      { custom: async ctx => { await ctx.wait(isReduced() ? 300 : 2200); } },
      { end:'Wait for an answer…' } ] },
    ra2:   think("Delivered. No answer. Of course.", "Доставлено. Відповіді немає. Ну звісно.", { next:'final_in' }),
    ib:    think("Not tonight, mystery person. Phone face down. Sleep.", "Не сьогодні, таємнича особо. Телефон екраном донизу. Спати."),
    ib2:   think("…Okay. I'm definitely not sleeping now.", "…Так. Тепер я точно не засну.", { next:'final_in' }),
    mc:    { type:'phone', thread:'mia', steps:[
      { reply:{ id:'e2s8m0', options:[ { text:"Okay this is weird. Someone just texted me about the Millers?? 👀" },
                                      { text:"MIA. A random number just sent me a mystery message about the Millers!!" } ] } },
      { in:"WHAT?! You've been in LA for five minutes and you're already in a mystery movie? 😂", id:'e2s8m1' },
      { in:"Okay, detective. Screenshot it. We'll solve it tomorrow 🕵️‍♀️💙", id:'e2s8m2' },
      { end:'Back' } ] },
    final_in: narr("Before you fall asleep, you open your chat with Mia one last time.", "Перш ніж заснути, ти востаннє відкриваєш чат із Мією."),
    final: { type:'voicenote' },
    mia_r: { type:'phone', thread:'mia', steps:[
      { in:"A hotel mix-up, a diner, a mystery boy AND a mystery message?! 😂 Best. First. Night. EVER.", id:'e2s8m3' },
      { in:"Sleep well, superstar. Tomorrow = THE MILLERS 💙", id:'e2s8m4' },
      { end:'Good night, LA 🌙' } ] },
    done:  { type:'complete' }
  } }
];
/* =========================================================================
   SCENE ART
   -------------------------------------------------------------------------
   The scenes use the photos in episodes/episode-02/photos/ (16:9 webp,
   1672×941 like Episode 1 — see photos/ASSET-PROMPTS.md). If a photo is
   missing or slow, the drawn SVG scene below is shown instead, so the
   episode always works. Sophie is a separate see-through layer on top of
   the diner photo (like the people in Episode 1). The lock, the key card,
   Mia's video call and the neighbourhood map have photos too, each with
   the drawn version as its fallback.

   ▶ Set USE_PHOTOS to false to play with the drawn scenes only.
   ========================================================================= */
const USE_PHOTOS = true;
const PHOTO_BASE = BASE + 'photos/';
const PHOTOS = {
  exterior:'s1-hotel-exterior.webp', hall:'s1-hotel-corridor.webp', lobby:'s1-hotel-lobby.webp',
  room:'s2-room-308.webp', roomNight:'s7-room-308-night.webp', street:'s4-street-night.webp',
  dinerOut:'s4-diner-exterior.webp', diner:'s5-diner-interior.webp', jake:'s6-diner-jake.webp', night:'s8-room-dark.webp'
};
/* photos used inside the mini-games (fetched together with the scene they belong to) */
const PIC = { lock:'s1-lock-412', card:'s2-key-card-308', call:'s3-mia-video-call', map:'s4-map-neighbourhood', sophie:'s5-sophie' };
const PIC_URL = k => PHOTO_BASE + PIC[k] + '.webp';
const PHOTO_EXTRAS = { hall:[PIC.lock], room:[PIC.card, PIC.call], street:[PIC.map], diner:[PIC.sophie] };
const PH_IMG = (n, cls = '', style = '') =>
  `<img class="ep1-pic${cls ? ' ' + cls : ''}"${style ? ` style="${style}"` : ''} src="${PHOTO_BASE + n}.webp" alt="" draggable="false" decoding="async" onerror="this.remove()">`;
/* origin = bottom-centre of the person in the frame, in % */
const PH_FIG = (n, ox, oy, delay = 0) => PH_IMG(n, 'ep1-pic-fig', `transform-origin:${ox}% ${oy}%;animation-delay:${delay}s`);
const PHOTO_LAYERS = {
  diner: () => PH_IMG('s5-diner-interior') + PH_FIG(PIC.sophie, 77.15, 100)
};
/* faces for the dialogue, the phone and the People cards */
const AVATAR = n => PHOTO_BASE + 'avatars/' + n + '.webp';
const AVATARS = USE_PHOTOS ? { mia:AVATAR('mia'), jake:AVATAR('jake'), sophie:AVATAR('sophie'), 'sophie-m':AVATAR('sophie'), daniel:AVATAR('daniel') } : {};

const STARS = (r, n, y1) => { let s = ''; for(let i = 0; i < n; i++) s += `<circle class="${i % 3 ? '' : 'ep2-star'}" cx="${(r() * 1600).toFixed(0)}" cy="${(r() * y1).toFixed(0)}" r="${(0.6 + r() * 1.4).toFixed(1)}" fill="#fff" opacity="${(0.3 + r() * 0.6).toFixed(2)}" style="--d:${(2 + r() * 3).toFixed(1)}s"/>`; return s; };
const VIG = u => `<radialGradient id="${u}vig" cx="50%" cy="50%" r="75%"><stop offset="55%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".55"/></radialGradient>`;
const neon = (x, y, text, size, color, cls = '') => `<text class="ep2-neon ${cls}" x="${x}" y="${y}" text-anchor="middle" ${FONT} font-weight="800" font-size="${size}" fill="${color}" style="--glow:${color}" filter="url(#ep2glow)">${text}</text>`;
const GLOW = `<filter id="ep2glow" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
function streaks(y0, y1){
  return `<g class="ep2-streaks">${[0, 1, 2, 3, 4].map(i => `<rect class="ep2-streak ${i % 2 ? 'red' : ''}" x="-300" y="${y0 + (i * (y1 - y0)) / 5}" width="${160 + i * 40}" height="${4 + (i % 3)}" rx="3" style="--d:${(2.4 + i * 0.7).toFixed(1)}s;--o:${(-i * 0.9).toFixed(1)}s"/>`).join('')}</g>`;
}
/* the people of Episode 2 — always drawn the same way */
const PEOPLE_ART = {
  daniel(x, base, s){ return figure(x, base, s, { shirt:'#2b3a55', rim:'#9fc6e4', vest:'#1b2536', collar:'#d8e2f0', badge:true, hair:'#2b1d14' }); },
  sophie(x, base, s){
    const head = base - 300 * s;
    return `<path d="M${x + 30*s} ${head - 30*s} q${70*s} ${10*s} ${50*s} ${110*s} q${-20*s} ${-50*s} ${-60*s} ${-70*s}Z" fill="#5a2f22"/>` +
      figure(x, base, s, { shirt:'#c9506a', rim:'#ffb1c4', hair:'#5a2f22', collar:'#fff' }) +
      `<path d="M${x - 70*s} ${base - 150*s} L${x + 70*s} ${base - 150*s} L${x + 86*s} ${base} L${x - 86*s} ${base}Z" fill="#f6efe6" opacity=".95"/>` +
      `<rect x="${x - 34*s}" y="${base - 120*s}" width="${68*s}" height="${36*s}" rx="${5*s}" fill="#e6dccd"/>`;
  },
  jake(x, base, s){
    const head = base - 300 * s;
    return figure(x, base, s, { shirt:'#3f6f4f', rim:'#a9e6ae' }) +
      `<path d="M${x - 62*s} ${head + 40*s} C${x - 70*s} ${head - 70*s} ${x + 70*s} ${head - 70*s} ${x + 62*s} ${head + 40*s} C${x + 40*s} ${head - 20*s} ${x - 40*s} ${head - 20*s} ${x - 62*s} ${head + 40*s}Z" fill="#335c41"/>` +
      `<path d="M${x - 50*s} ${head - 22*s} C${x - 40*s} ${head - 74*s} ${x + 40*s} ${head - 74*s} ${x + 50*s} ${head - 22*s} L${x + 78*s} ${head - 16*s} L${x - 50*s} ${head - 16*s}Z" fill="#1f2b44"/>` +
      `<path d="M${x - 14*s} ${base - 230*s} l${-4*s} ${60*s} M${x + 14*s} ${base - 230*s} l${4*s} ${60*s}" stroke="#e8f3ea" stroke-width="${4*s}"/>`;
  },
  local(x, base, s){
    return figure(x, base, s, { shirt:'#4b4470', rim:'#c9b8ff', hair:'#2a2420' }) +
      `<g class="ep2-dog"><ellipse cx="${x + 150*s}" cy="${base - 46*s}" rx="${62*s}" ry="${30*s}" fill="#1a1720"/><circle cx="${x + 206*s}" cy="${base - 76*s}" r="${24*s}" fill="#1a1720"/><path d="M${x + 196*s} ${base - 98*s} l${10*s} ${-22*s} l${8*s} ${20*s}Z" fill="#1a1720"/><rect x="${x + 104*s}" y="${base - 30*s}" width="${10*s}" height="${30*s}" fill="#1a1720"/><rect x="${x + 186*s}" y="${base - 30*s}" width="${10*s}" height="${30*s}" fill="#1a1720"/><path d="M${x + 88*s} ${base - 60*s} q${-24*s} ${-30*s} ${-6*s} ${-50*s}" stroke="#1a1720" stroke-width="${8*s}" fill="none"/><path d="M${x + 60*s} ${base - 170*s} Q${x + 130*s} ${base - 140*s} ${x + 186*s} ${base - 82*s}" stroke="#ffb199" stroke-width="${3*s}" fill="none"/></g>`;
  }
};

function cityWindow(u, r, x, y, w, h, sky, opts = {}){
  const tw = skyline(r, x, x + w, y + h * 0.82, h * 0.08, h * 0.34, w * 0.025, w * 0.06, { x: x + w * 0.55, spread: w * 0.25, h: h * 0.22 });
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${u}${sky})"/>
    ${opts.stars ? `<g>${STARS(r, 40, y + h * 0.45).replace(/cx="(\d+)"/g, (m, v) => `cx="${x + (v / 1600) * w}"`).replace(/cy="(\d+(\.\d+)?)"/g, (m, v) => `cy="${y + +v}"`)}</g>` : ''}
    <path d="${tw}" fill="${opts.towers || '#1d1838'}"/>
    ${lights(r, opts.n || 260, x, x + w, y + h * 0.5, y + h * 0.84, ['#ffd27a','#fff1c9','#ffb35c','#ff9de0'], 2, 4, 'ep1-twinkle')}
    <rect x="${x}" y="${y + h * 0.82}" width="${w}" height="${h * 0.18}" fill="${opts.ground || '#120f26'}"/>
    ${lights(r, 120, x, x + w, y + h * 0.84, y + h * 0.98, ['#ffd27a','#ff8a3d','#fff1c9'], 2, 3)}
    ${palm(x + w * 0.12, y + h * 0.9, h * 0.42, '#0b0a16', 8)}${palm(x + w * 0.86, y + h * 0.92, h * 0.36, '#0b0a16', -6)}`;
}

const ART = {
  /* Scene 1: Palm Court Hotel at night */
  exterior(u){
    const r = rng(201);
    let wins = '';
    for(let row = 0; row < 6; row++) for(let c = 0; c < 9; c++){
      const lit = r() > 0.42;
      wins += `<rect x="${505 + c * 66}" y="${180 + row * 62}" width="40" height="38" rx="3" fill="${lit ? (r() > 0.5 ? '#ffd38a' : '#ffe9c4') : '#1c2238'}" opacity="${lit ? (0.6 + r() * 0.4).toFixed(2) : 1}"/>`;
    }
    return svg(`
      <rect width="1600" height="900" fill="url(#${u}sky)"/>${STARS(r, 70, 380)}
      <path d="${skyline(r, 0, 1600, 640, 60, 220, 30, 90, { x:1250, spread:260, h:180 })}" fill="#1a1530"/>
      ${lights(r, 260, 0, 1600, 440, 640, ['#ffd27a','#fff1c9','#ffb35c'], 2, 3.5, 'ep1-twinkle')}
      <rect x="470" y="120" width="660" height="560" fill="#2a2440"/><rect x="470" y="120" width="660" height="18" fill="#3a3358"/>
      ${wins}
      ${neon(800, 104, 'PALM COURT HOTEL', 64, '#ff7ab8')}
      <rect x="640" y="560" width="320" height="120" fill="#ffcf8a" opacity=".9"/><rect x="660" y="580" width="130" height="100" fill="#f7b36b"/><rect x="810" y="580" width="130" height="100" fill="#f7b36b"/>
      <path d="M600 560 L1000 560 L1040 530 L560 530Z" fill="#7a2f4f"/><rect x="560" y="520" width="480" height="12" fill="#ff7ab8" opacity=".55"/>
      <ellipse cx="800" cy="700" rx="420" ry="40" fill="#ffcf8a" opacity=".18"/>
      <rect y="680" width="1600" height="220" fill="#15131f"/><rect y="760" width="1600" height="6" fill="#2b2740"/>
      ${streaks(790, 880)}
      ${palm(330, 700, 470, '#0c0a14', 14)}${palm(420, 712, 360, '#0c0a14', -10)}${palm(1250, 704, 440, '#0c0a14', -12)}${palm(1360, 716, 330, '#0c0a14', 8)}
      <rect width="1600" height="900" fill="url(#${u}vig)"/>`,
      GLOW + lin(`${u}sky`, [[0,'#0a0d24'],[0.55,'#3a2550'],[0.8,'#8a3f6a'],[1,'#d06a6a']]) + VIG(u));
  },
  /* Scene 1: third-floor corridor, Room 412, the lock blinks red */
  hall(u){
    let doors = '', lamps = '';
    [[210, 330, 1], [400, 380, 0.7], [520, 410, 0.5]].forEach(([x, y, s], i) => { doors += `<rect x="${x}" y="${y}" width="${120 * s}" height="${330 * s}" fill="#4a2e22" stroke="#2a1a12" stroke-width="4"/>`; });
    for(let i = 0; i < 4; i++){ const t = i / 4; lamps += `<ellipse cx="800" cy="${70 + t * 230}" rx="${120 - t * 80}" ry="${14 - t * 8}" fill="#ffe6b5" opacity="${0.75 - t * 0.12}"/>`; }
    return svg(`
      <rect width="1600" height="900" fill="#2c211c"/>
      <polygon points="0,0 1600,0 960,330 640,330" fill="#3a2c24"/>${lamps}
      <polygon points="0,0 640,330 640,560 0,900" fill="#6b4a3a"/><polygon points="1600,0 960,330 960,560 1600,900" fill="#5c3f32"/>
      <polygon points="640,330 960,330 960,560 640,560" fill="#20160f"/><rect x="760" y="380" width="80" height="180" fill="#3b2a20"/>
      <polygon points="0,900 640,560 960,560 1600,900" fill="url(#${u}carpet)"/>
      ${doors}
      <polygon points="1060,180 1360,60 1360,840 1060,690" fill="#5a3526" stroke="#2a1a12" stroke-width="6"/>
      <rect x="1180" y="200" width="70" height="44" rx="6" fill="#d9b77a" transform="skewY(-14)"/><text x="1215" y="530" text-anchor="middle" ${FONT} font-weight="800" font-size="34" fill="#3a2414" transform="skewY(-14)">412</text>
      <rect x="1100" y="420" width="44" height="86" rx="8" fill="#1a1a1e" transform="skewY(-14)"/>
      <circle class="ep2-led" cx="1122" cy="720" r="8" fill="#ff3b3b" transform="skewY(-14)"/>
      <rect width="1600" height="900" fill="url(#${u}vig)"/>`,
      `<linearGradient id="${u}carpet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5c2433"/><stop offset="1" stop-color="#2a0f18"/></linearGradient>` + VIG(u));
  },
  /* Scene 1/2: the lobby — Daniel at the desk */
  lobby(u){
    let panels = '', keys = '';
    for(let i = 0; i < 9; i++) panels += `<rect x="${i * 180}" y="80" width="170" height="520" fill="${i % 2 ? '#5b3b2a' : '#553626'}"/>`;
    for(let row = 0; row < 3; row++) for(let c = 0; c < 6; c++) keys += `<rect x="${640 + c * 54}" y="${250 + row * 54}" width="40" height="40" rx="4" fill="#3b261b" stroke="#c9a46a" stroke-opacity=".5"/>`;
    return svg(`
      <rect width="1600" height="900" fill="#2a1c15"/>${panels}
      <rect y="0" width="1600" height="90" fill="#1f140f"/>
      ${[260, 800, 1340].map(x => `<circle cx="${x}" cy="60" r="120" fill="url(#${u}lamp)"/><rect x="${x - 40}" y="40" width="80" height="22" rx="10" fill="#ffe2a8"/>`).join('')}
      <text x="800" y="200" text-anchor="middle" ${FONT} font-weight="800" font-size="56" letter-spacing="10" fill="#e8c98a">PALM COURT</text>
      ${keys}
      ${PEOPLE_ART.daniel(800, 650, 0.86)}
      <rect x="300" y="600" width="1000" height="300" fill="url(#${u}desk)"/><rect x="290" y="586" width="1020" height="22" rx="6" fill="#e2c48e"/>
      <path d="M940 584 a26 26 0 0 1 52 0Z" fill="#d9b25b"/><rect x="938" y="582" width="56" height="6" rx="2" fill="#b8913f"/><circle cx="966" cy="552" r="5" fill="#d9b25b"/>
      <rect x="1080" y="520" width="70" height="66" rx="6" fill="#1d2230"/><rect x="1088" y="528" width="54" height="40" fill="#6fb3e6" opacity=".55"/>
      <g>${palm(150, 760, 380, '#2f4a2b', 10)}<rect x="100" y="720" width="110" height="120" rx="14" fill="#7a4a30"/></g>
      <rect x="200" y="470" width="110" height="200" rx="6" fill="#3a2a20"/>${[0, 1, 2].map(i => `<rect x="${212 + i * 32}" y="490" width="26" height="70" rx="3" fill="${['#ff8a3d','#5AB6F9','#6DBB75'][i]}" opacity=".8"/><rect x="${212 + i * 32}" y="580" width="26" height="70" rx="3" fill="${['#ffd23f','#ff7ab8','#9B8ECF'][i]}" opacity=".8"/>`).join('')}
      <rect width="1600" height="900" fill="url(#${u}vig)"/>`,
      lin(`${u}desk`, [[0,'#6b4630'],[1,'#3a2418']]) + rad(`${u}lamp`, [[0,'#ffd99a',0.55],[1,'#ffd99a',0]]) + VIG(u));
  },
  /* Scene 2: Room 308 at dusk (and roomNight in Scene 7) */
  room(u, night){
    const r = rng(night ? 233 : 231);
    return svg(`
      <rect width="1600" height="900" fill="url(#${u}wall)"/>
      ${cityWindow(u, r, 760, 90, 760, 520, night ? 'nsky' : 'dsky', { stars: night, n: night ? 320 : 220 })}
      <rect x="740" y="74" width="800" height="552" fill="none" stroke="#2c211b" stroke-width="30"/><rect x="1132" y="90" width="12" height="520" fill="#2c211b"/>
      <path d="M690 50 Q740 360 700 650 L780 650 Q800 360 760 50Z" fill="#7a5640"/><path d="M1590 50 Q1550 360 1590 650 L1520 650 Q1500 360 1530 50Z" fill="#7a5640"/>
      <circle class="ep2-lamp" cx="250" cy="430" r="${night ? 340 : 260}" fill="url(#${u}lamp)"/>
      <path d="M190 340 L310 340 L284 430 L216 430Z" fill="#f3d9b1"/><rect x="245" y="430" width="10" height="160" fill="#3a2a20"/>
      <rect x="140" y="590" width="240" height="120" rx="10" fill="#3a2a20"/>
      <path d="M0 700 Q330 640 740 680 L800 900 H0Z" fill="url(#${u}bed)"/><path d="M50 690 Q230 640 440 668 L460 734 Q230 716 60 754Z" fill="#fbf4ea" opacity=".9"/>
      <g transform="translate(250 600)"><rect x="0" y="0" width="140" height="170" rx="16" fill="#26272c"/><rect x="0" y="0" width="140" height="170" rx="16" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="3"/>${[1,2,3,4].map(i => `<line x1="${i * 28}" y1="12" x2="${i * 28}" y2="158" stroke="#fff" stroke-opacity=".1" stroke-width="2"/>`).join('')}<path d="M70 -22 q-24 -16 -28 2 q4 12 28 0Z M70 -22 q24 -16 28 2 q-4 12 -28 0Z" fill="#FF8A3D"/><rect x="44" y="-30" width="52" height="10" rx="5" fill="#4a4f57"/></g>
      <rect x="1180" y="660" width="380" height="24" rx="6" fill="#4a3426"/><rect x="1200" y="684" width="20" height="216" fill="#3a2a20"/><rect x="1520" y="684" width="20" height="216" fill="#3a2a20"/>
      <g transform="rotate(-8 1320 640)"><rect x="1270" y="606" width="96" height="56" rx="6" fill="#f3efe6"/><rect x="1276" y="612" width="84" height="14" fill="#ff7ab8" opacity=".75"/><text x="1318" y="648" text-anchor="middle" ${FONT} font-size="15" font-weight="800" fill="#4a3426">308</text></g>
      <rect width="1600" height="900" fill="url(#${u}vig)"/>`,
      lin(`${u}wall`, night ? [[0,'#1e1714'],[1,'#120d0b']] : [[0,'#3a2a22'],[1,'#1c1410']]) +
      lin(`${u}dsky`, [[0,'#2a2a5c'],[0.5,'#8a4f86'],[0.85,'#ff9a7a'],[1,'#ffc58a']]) + lin(`${u}nsky`, [[0,'#05071a'],[0.7,'#1c1a44'],[1,'#3a2a55']]) +
      rad(`${u}lamp`, [[0,'#ffcf8a',night ? 0.62 : 0.5],[1,'#ffcf8a',0]]) + lin(`${u}bed`, [[0,'#efe4d4'],[1,'#a8977f']]) + VIG(u));
  },
  roomNight(u){ return ART.room(u, true); },
  /* Scene 4: the street at night — palms, neon, cars, the man with his dog */
  street(u){
    const r = rng(241);
    const bldL = `<polygon points="0,90 520,250 520,700 0,860" fill="#221a33"/>`, bldR = `<polygon points="1600,60 1080,240 1080,700 1600,880" fill="#1e1830"/>`;
    let winsL = '', winsR = '';
    for(let i = 0; i < 26; i++){ const t = r(), y = 200 + r() * 420; winsL += `<rect x="${40 + t * 440}" y="${y + t * 40}" width="${30 - t * 14}" height="${26 - t * 10}" fill="#ffd38a" opacity="${(0.3 + r() * 0.6).toFixed(2)}"/>`; }
    for(let i = 0; i < 26; i++){ const t = r(), y = 200 + r() * 420; winsR += `<rect x="${1120 + t * 440}" y="${y + (1 - t) * 30}" width="${16 + t * 14}" height="${16 + t * 10}" fill="#ffe9c4" opacity="${(0.3 + r() * 0.6).toFixed(2)}"/>`; }
    return svg(`
      <rect width="1600" height="900" fill="url(#${u}sky)"/>${STARS(r, 60, 300)}
      <path d="${skyline(r, 380, 1220, 520, 40, 160, 20, 50, { x:800, spread:200, h:90 })}" fill="#2a2244"/>
      ${lights(r, 160, 380, 1220, 380, 520, ['#ffd27a','#fff1c9','#ff9de0'], 2, 3, 'ep1-twinkle')}
      ${bldL}${winsL}${bldR}${winsR}
<g class="ep2-land">${[[260, 330, 5, 54], [1340, 300, 9, 46], [300, 450, 7, 34], [1300, 430, 11, 34]].map(([x, y, n, sz]) => { const w = n * sz * 0.66 + 36; return `<rect x="${x - w / 2}" y="${y - sz * 0.95}" width="${w}" height="${sz * 1.25}" rx="10" fill="#120d1c" opacity=".92"/>`; }).join('')}
      ${neon(260, 330, 'TACOS', 54, '#ffcf4a', 'slow')}${neon(1340, 300, 'OPEN 24/7', 46, '#5ad7ff')}${neon(300, 450, 'LAUNDRY', 34, '#ff7ab8', 'slow')}${neon(1300, 430, '☕ NIGHT OWL', 34, '#ffb199')}</g>
      <g class="ep2-port"><rect x="700" y="262" width="200" height="50" rx="10" fill="#120d1c" opacity=".92"/>${neon(800, 300, 'OPEN 24/7', 34, '#5ad7ff')}
        <rect x="650" y="372" width="300" height="46" rx="10" fill="#120d1c" opacity=".92"/>${neon(800, 406, '☕ NIGHT OWL', 30, '#ffb199', 'slow')}</g>
      <polygon points="520,700 1080,700 1600,900 0,900" fill="#16141e"/>
      <polygon points="780,700 820,700 900,900 700,900" fill="#e8d9a8" opacity=".25"/>
      ${streaks(740, 860)}
      ${[[120, 300], [470, 210], [1150, 200], [1480, 320]].map(([x, h], i) => palm(x, 720 + (i % 2) * 20, h * 2, '#0b0a14', i % 2 ? -10 : 12)).join('')}
      ${[600, 1000].map(x => `<rect x="${x}" y="470" width="8" height="240" fill="#2b2a33"/><circle cx="${x + 4}" cy="470" r="14" fill="#ffe2a8"/><circle cx="${x + 4}" cy="470" r="60" fill="url(#${u}lamp)"/>`).join('')}
      <g transform="translate(1180 560)"><rect x="0" y="0" width="300" height="140" rx="16" fill="#e2e4ea"/><rect x="20" y="20" width="150" height="60" rx="8" fill="#ffcf8a"/><text x="230" y="64" text-anchor="middle" ${FONT} font-size="28" font-weight="800" fill="#c94a3a">TACOS</text><circle cx="60" cy="146" r="22" fill="#1a1a1e"/><circle cx="240" cy="146" r="22" fill="#1a1a1e"/></g>
      ${PEOPLE_ART.local(690, 760, 0.62)}
      <rect width="1600" height="900" fill="url(#${u}vig)"/>`,
      GLOW + lin(`${u}sky`, [[0,'#060818'],[0.6,'#241a44'],[1,'#5a2d5c']]) + rad(`${u}lamp`, [[0,'#ffe2a8',0.5],[1,'#ffe2a8',0]]) + VIG(u));
  },
  /* Scene 4: Moonlight Diner from the outside, next to a bookstore */
  dinerOut(u){
    const r = rng(251);
    return svg(`
      <rect width="1600" height="900" fill="url(#${u}sky)"/>${STARS(r, 80, 360)}
      <circle cx="1320" cy="140" r="54" fill="#fff6dc" opacity=".9"/><circle cx="1342" cy="128" r="50" fill="#0a0c22"/>
      <rect x="260" y="300" width="900" height="420" rx="40" fill="#e9e4dc"/><rect x="260" y="300" width="900" height="70" rx="30" fill="#c9c2b8"/>
      <rect x="300" y="420" width="820" height="210" rx="16" fill="url(#${u}glass)"/>
      ${[0, 1, 2, 3].map(i => `<rect x="${330 + i * 200}" y="520" width="140" height="70" rx="20" fill="#c43c4a" opacity=".85"/>`).join('')}
      <g class="ep2-land">${neon(710, 270, 'MOONLIGHT DINER', 84, '#ff7ab8')}${neon(1165, 262, '☾', 80, '#5ad7ff', 'slow')}</g>
      <g class="ep2-port">${neon(800, 140, '☾', 56, '#5ad7ff', 'slow')}${neon(800, 216, 'MOONLIGHT', 50, '#ff7ab8')}${neon(800, 282, 'DINER', 56, '#ff7ab8')}</g>
      <rect x="1180" y="360" width="340" height="360" fill="#2a2440"/><rect x="1210" y="450" width="280" height="190" fill="#1a1626"/>
      ${[0, 1, 2, 3, 4, 5].map(i => `<rect x="${1226 + i * 44}" y="${470 + (i % 2) * 6}" width="30" height="${110 - (i % 3) * 12}" fill="${['#7a5aa0','#c97a3a','#3a7a8a','#a03a4a','#6a8a3a','#3a4a8a'][i]}" opacity=".7"/>`).join('')}
      <text x="1350" y="408" text-anchor="middle" ${FONT} font-weight="800" font-size="40" letter-spacing="6" fill="#e8d8b0">BOOKS</text><text x="1350" y="438" text-anchor="middle" ${FONT} font-size="18" fill="#9fb6cf">CLOSED · Opens 9 AM</text>
      <rect y="720" width="1600" height="180" fill="#17151f"/><ellipse cx="710" cy="740" rx="520" ry="34" fill="#ff7ab8" opacity=".15"/>
      ${palm(150, 740, 420, '#0b0a14', 10)}
      <rect width="1600" height="900" fill="url(#${u}vig)"/>`,
      GLOW + lin(`${u}sky`, [[0,'#05071a'],[0.7,'#1c1a44'],[1,'#3a2a55']]) + lin(`${u}glass`, [[0,'#ffd99a'],[1,'#f7a95c']]) + VIG(u));
  },
  /* Scenes 5–6: inside the diner (Sophie / Jake) */
  diner(u, who){
    let floor = '';
    for(let row = 0; row < 6; row++) for(let c = 0; c < 20; c++) if((row + c) % 2) floor += `<rect x="${c * 80 + (row % 2) * 0}" y="${700 + row * 34}" width="80" height="34" fill="#e8e2d8" opacity=".85"/>`;
    return svg(`
      <rect width="1600" height="900" fill="#3a1f24"/>
      <rect y="0" width="1600" height="440" fill="url(#${u}wall)"/><rect y="430" width="1600" height="20" fill="#b9b2a6"/>
      ${neon(400, 150, 'OPEN', 70, '#ff5a6e')}${neon(1000, 150, 'PIE · SHAKES · FRIES', 40, '#5ad7ff', 'slow')}
      ${[0, 1, 2, 3, 4, 5].map(i => `<rect x="${1300 + (i % 3) * 90}" y="${70 + Math.floor(i / 3) * 90}" width="78" height="62" fill="#f3efe6"/><rect x="${1306 + (i % 3) * 90}" y="${76 + Math.floor(i / 3) * 90}" width="66" height="44" fill="${['#9fc6e4','#ffd38a','#a9e6ae','#ffb199','#c9b8ff','#9fc6e4'][i]}"/>`).join('')}
      <rect y="440" width="1600" height="260" fill="#5b2a2f"/>
      <rect x="1020" y="300" width="300" height="170" rx="18" fill="#f3efe6" opacity=".85"/><rect x="1040" y="320" width="260" height="130" rx="10" fill="#ffe9c4"/>
      ${[0, 1, 2].map(i => `<path d="M${1060 + i * 80} 420 a34 34 0 0 1 68 0Z" fill="${['#b5303f','#d7a14a','#5a2f22'][i]}"/>`).join('')}
      <g><rect x="60" y="400" width="150" height="260" rx="70" fill="#c9506a"/><rect x="80" y="440" width="110" height="80" rx="20" fill="#ffd38a" opacity=".8"/>${[0,1,2,3].map(i => `<rect x="${90 + i * 24}" y="540" width="16" height="70" rx="6" fill="#ffd38a" opacity="${.4 + (i % 2) * .4}"/>`).join('')}</g>
      ${[260, 640].map(x => `<rect x="${x}" y="470" width="300" height="240" rx="26" fill="#a8222f"/><rect x="${x + 20}" y="490" width="260" height="120" rx="20" fill="#c43c4a"/>`).join('')}
      ${who === 'jake' ? PEOPLE_ART.jake(700, 720, 0.72) : PEOPLE_ART.sophie(1180, 760, 0.82)}
      <rect x="${who === 'jake' ? 560 : 300}" y="640" width="380" height="20" rx="8" fill="#e8e2d8"/>
      ${who === 'jake' ? `<rect x="640" y="600" width="70" height="40" rx="6" fill="#d03a2f"/>${[0,1,2,3,4].map(i => `<rect x="${648 + i * 11}" y="${584 - (i % 2) * 6}" width="7" height="30" rx="2" fill="#ffd23f"/>`).join('')}<rect x="760" y="580" width="40" height="60" rx="6" fill="#ffe9c4" opacity=".85"/>` : ''}
      <rect y="700" width="1600" height="200" fill="#2a2a30"/>${floor}
      <rect width="1600" height="900" fill="url(#${u}vig)"/>`,
      GLOW + lin(`${u}wall`, [[0,'#2a3a4a'],[1,'#4a5a6a']]) + VIG(u));
  },
  jake(u){ return ART.diner(u, 'jake'); },
  /* Scene 8: the dark room, the city outside, the phone lights up */
  night(u){
    const r = rng(281);
    return svg(`
      <rect width="1600" height="900" fill="#07060a"/>
      ${cityWindow(u, r, 560, 80, 980, 560, 'sky', { stars:true, n:380, towers:'#0f0d22', ground:'#0b0a18' })}
      <rect x="540" y="64" width="1020" height="592" fill="none" stroke="#15100d" stroke-width="30"/><rect x="1040" y="80" width="12" height="560" fill="#15100d"/>
      <path d="M0 700 Q330 640 740 680 L800 900 H0Z" fill="#2a2520"/><path d="M50 690 Q230 640 440 668 L460 734 Q230 716 60 754Z" fill="#4a443c" opacity=".9"/>
      <g class="ep2-phoneglow"><ellipse cx="560" cy="760" rx="170" ry="60" fill="#8fd0ff" opacity=".22"/><rect x="520" y="730" width="80" height="44" rx="8" fill="#cfe8ff" transform="rotate(-12 560 752)"/></g>
      <rect width="1600" height="900" fill="url(#${u}vig)"/>`,
      lin(`${u}sky`, [[0,'#03040f'],[0.7,'#141233'],[1,'#2a1f44']]) + VIG(u));
  }
};
function sceneArt(key){ return (ART[key] || ART.room)(nextArtId('ep2a')); }

/* =========================================================================
   EPISODE 2 INTERACTIONS (custom node types)
   ========================================================================= */
const flags = () => st().flags;
const say1 = (who, text, ua, then) => showLine({ type:'say', who, text, ua }, then);
const uaDiv = t => t ? `<div class="ep1-ua" ${SET.ua ? '' : 'hidden'}>${esc(t)}</div>` : '';
const uaBtn = () => `<button type="button" class="ep1-tool" data-act="ua" title="Ukrainian translation">UA</button>`;
function thinkDlg(text, ua, withNext){
  const prev = document.activeElement;
  dlg(`${head(null, 'think')}<div class="ep1-text think">${lineHTML(text)}</div>${uaDiv(ua)}
    <div class="ep1-row"><div class="ep1-tools">${uaBtn()}</div>${withNext ? `<button type="button" class="ep1-next" data-primary>${withNext}</button>` : ''}</div>`, 'k-think');
  /* keyboard users: an instruction line has no button of its own, so focus goes back to the mini-game */
  if(!withNext) requestAnimationFrame(() => requestAnimationFrame(() => {
    if(EP.game.hidden || !EP.dlg.contains(document.activeElement)) return;
    const keep = prev && EP.game.contains(prev) && !prev.disabled ? prev : null;
    const t = keep || EP.game.querySelector('input:not([disabled]), [data-primary]:not([disabled]), button:not([disabled])');
    if(t) try { t.focus({ preventScroll:true }); } catch(e){}
  }));
}

/* ---------- Scene 1: the key card lock on Room 412 ---------- */
RENDER.lock = function(node, id, tok){
  let taps = 0;
  const g = showGame('g-lock');
  g.innerHTML = `<div class="ep2-lock" aria-live="polite">
      <div class="ep2-lock-plate${USE_PHOTOS ? ' has-img' : ''}">${USE_PHOTOS ? `<img class="ep2-lock-img" src="${PIC_URL('lock')}" alt="Room 412 key card lock" draggable="false" onerror="this.parentNode.classList.remove('has-img');this.remove()">` : ''}<div class="ep2-lock-num">412</div><div class="ep2-lock-reader"><span class="ep2-lock-led"></span><span class="ep2-lock-slot"></span></div></div>
      <button type="button" class="ep1-btn ep1-btn-hot ep2-lock-tap" data-tap>💳 Tap your key card</button>
      <div class="ep2-lock-msg"></div></div>`;
  const led = g.querySelector('.ep2-lock-led'), msg = g.querySelector('.ep2-lock-msg');
  thinkDlg("Back at Room 412. Tap your key card on the lock.", "Знову біля номера 412. Приклади картку-ключ до замка.");
  g.querySelector('[data-tap]').addEventListener('click', () => {
    if(tok !== EP.token) return;
    taps++; Sound.sfx('card-bad');
    led.classList.remove('bad'); void led.offsetWidth; led.classList.add('bad');
    msg.innerHTML = `<b>Beep!</b> ✗ Red light.${taps > 1 ? ' Again.' : ''}`;
    if(taps === 1) thinkDlg("Beep. Red light. Huh?", "Біп. Червоне світло. Що?", 'Try again ▸');
    else thinkDlg("Beep. Red light. AGAIN.", "Біп. Червоне світло. ЗНОВУ.", 'Continue ▸');
    if(taps === 1) primary(() => { const b = g.querySelector('[data-tap]'); b && b.click(); });
    else { primary(() => { st().answers[node.key] = { taps }; taskDone(node.key); save(true); hideGame(); next(node, id); }); g.querySelector('[data-tap]').disabled = true; }
  });
};

/* ---------- Scene 2: the Wi-Fi screen ---------- */
const NETWORKS = [
  { id:'guest', name:'PalmCourt_Guest', bars:4 },
  { id:'staff', name:'PalmCourt_Staff', bars:3, msg:["This network is for hotel staff only. 🙅", "Ця мережа — тільки для персоналу готелю. 🙅"] },
  { id:'tv',    name:'DIRECTV-5G-Room307', bars:1, msg:["Not this one — that's somebody's TV next door. 😅", "Не ця — це чийсь телевізор у сусідньому номері. 😅"] }
];
const barsIcon = n => `<span class="ep2-bars" aria-hidden="true">${[1,2,3,4].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
RENDER.wifi = function(node, id, tok){
  let sel = null, failed = false;
  const g = showGame('g-wifi');
  function draw(note){
    g.innerHTML = `<div class="ep2-phone" role="dialog" aria-label="Phone Wi-Fi settings">
      <div class="ep2-phone-status"><span>9:33</span><span>${failed ? '✗' : '…'} 🔋</span></div>
      <div class="ep2-phone-h">‹ Settings <b>Wi-Fi</b></div>
      <div class="ep2-wifi-row on"><span>Wi-Fi</span><span class="ep2-switch on" aria-hidden="true"></span></div>
      <div class="ep2-wifi-cap">CHOOSE A NETWORK…</div>
      ${NETWORKS.map(n => `<button type="button" class="ep2-wifi-row ep2-net ${sel === n.id ? 'sel' : ''}" data-net="${n.id}"><span>${esc(n.name)}</span><span>🔒 ${barsIcon(n.bars)}</span></button>`).join('')}
      ${sel === 'guest' ? `<div class="ep2-wifi-pass"><label>Enter the password for “PalmCourt_Guest”<input type="password" class="ep2-input" placeholder="Password" aria-label="Wi-Fi password" maxlength="40"></label>
        <button type="button" class="ep1-btn ep1-btn-hot" data-join>Join</button></div>` : ''}
      ${note ? `<div class="ep2-wifi-note ${failed ? 'bad' : ''}">${note}</div>` : ''}
    </div>`;
  }
  draw();
  thinkDlg("Okay, let's get online. Tap the hotel's network.", "Так, підключімося до інтернету. Обери мережу готелю.");
  g.onkeydown = e => { if(e.key === 'Enter' && e.target.classList.contains('ep2-input')){ e.preventDefault(); const j = g.querySelector('[data-join]'); j && j.click(); } };
  g.onclick = e => {
    if(tok !== EP.token) return;
    const n = e.target.closest('[data-net]');
    if(n){
      const net = NETWORKS.find(x => x.id === n.dataset.net);
      sel = net.id; Sound.sfx('soft');
      if(net.msg){ draw(esc(net.msg[0])); thinkDlg(net.msg[0], net.msg[1]); return; }
      draw(); const inp = g.querySelector('.ep2-input'); inp && inp.focus({ preventScroll:true });
      thinkDlg("A password? I don't have a password…", "Пароль? У мене немає жодного пароля…");
      return;
    }
    if(e.target.closest('[data-join]')){
      failed = true; Sound.sfx('card-bad');
      draw('<b>Connection failed.</b> Incorrect password.');
      st().answers[node.key] = { tried:true }; taskDone(node.key); save(true);
      thinkDlg("“Connection failed.” Of course.", "«Не вдалося підключитися». Ну звісно.", 'Continue ▸');
      primary(() => { hideGame(); next(node, id); });
    }
  };
};

/* ---------- Scene 2 (option C): try to fix it yourself ---------- */
const SELF_TRIES = [
  { k:'restart', label:"🔄 Restart the phone", t:["Phone off… phone on… still no Wi-Fi.", "Телефон вимкнути… увімкнути… Wi-Fi досі немає."] },
  { k:'plane',   label:"✈️ Turn airplane mode on and off", t:["Airplane mode: on. Off. Nothing. (Very relaxing, though.)", "Режим польоту: увімк. Вимк. Нічого. (Хоча заспокоює.)"] },
  { k:'again',   label:"📡 Choose the network again", t:["“Enter password.” AGAIN. I don't KNOW the password!", "«Введіть пароль». ЗНОВУ. Я ж НЕ ЗНАЮ пароля!"] },
  { k:'look',    label:"🔍 Look around the room", found:true }
];
RENDER.selffix = function(node, id, tok){
  const tried = new Set();
  function draw(fb){
    dlg(`${head('🔧 Fix it yourself', 'turn')}<div class="ep1-q">What do you try?</div>${uaDiv('Що спробуєш?')}
      <div class="ep1-opts">${SELF_TRIES.map((o, i) => `<button type="button" class="ep1-opt ${tried.has(o.k) ? 'tried' : ''} ${o.found && tried.size >= 2 ? 'hint-pulse' : ''}" data-i="${i}" ${tried.has(o.k) ? 'disabled' : ''}><span class="ep1-k" aria-hidden="true">${i + 1}</span><span class="ep1-opt-t">${esc(o.label)}</span></button>`).join('')}</div>
      <div class="ep1-fb" aria-live="polite">${fb || ''}</div><div class="ep1-row"><div class="ep1-tools">${uaBtn()}</div></div>`, 'k-choice');
    EP.dlg.querySelectorAll('.ep1-opt:not([disabled])').forEach(b => b.addEventListener('click', () => {
      if(tok !== EP.token) return;
      const o = SELF_TRIES[+b.dataset.i];
      if(o.found){ st().answers[node.key] = { tries: tried.size + 1 }; taskDone(node.key); save(true); Sound.sfx('good'); return next(node, id); }
      tried.add(o.k); Sound.sfx('soft');
      draw(`<div class="ep1-react"><b>💭</b> ${esc(o.t[0])}${uaDiv(o.t[1])}</div>${tried.size >= 2 ? `<div class="ep1-hint">🔎 Maybe the answer is somewhere in the room…</div>` : ''}`);
    }, { once:true }));
  }
  draw('');
};

/* ---------- Scene 2: the key card sleeve — the password is inside ---------- */
RENDER.keycard = function(node, id, tok){
  let open = false, online = false;
  const g = showGame('g-card');
  function draw(){
    g.innerHTML = `<div class="ep2-sleeve-wrap">
      <div class="ep2-sleeve ${open ? 'open' : ''}" aria-live="polite">
        <div class="ep2-sleeve-front${USE_PHOTOS ? ' has-img' : ''}">${USE_PHOTOS ? `<img class="ep2-sleeve-img" src="${PIC_URL('card')}" alt="Palm Court Hotel key card, Room 308" draggable="false" onerror="this.parentNode.classList.remove('has-img');this.remove()">` : ''}<div class="ep2-sleeve-logo">🌴 PALM COURT HOTEL</div><div class="ep2-sleeve-room">Room <b>308</b></div><div class="ep2-sleeve-w">Welcome to Los Angeles!</div></div>
        <div class="ep2-sleeve-in">
          <div class="ep2-sleeve-row"><span>📶 Wi-Fi network</span><b>PalmCourt_Guest</b></div>
          <div class="ep2-sleeve-row"><span>🔑 Password</span><b class="ep2-pass">palmtree308</b></div>
          <div class="ep2-sleeve-row"><span>☎️ Front desk</span><b>dial 0</b></div>
          <div class="ep2-sleeve-row"><span>🍳 Breakfast</span><b>7–10 AM</b></div>
        </div>
      </div>
      <div class="ep2-sleeve-side">
        ${!open ? `<button type="button" class="ep1-btn ep1-btn-hot" data-open>📖 Open the sleeve</button>`
          : !online ? `<button type="button" class="ep1-btn ep1-btn-hot" data-connect>📶 Connect to PalmCourt_Guest</button>`
          : `<div class="ep2-connected">✓ Connected to PalmCourt_Guest</div>`}
      </div></div>`;
  }
  draw();
  thinkDlg("The key card sleeve. Let's look inside.", "Конвертик для картки. Подивимося, що всередині.");
  g.onclick = e => {
    if(tok !== EP.token) return;
    if(e.target.closest('[data-open]')){
      open = true; Sound.sfx('soft'); draw();
      thinkDlg("“Password: palmtree308.” It was here the whole time!", "«Пароль: palmtree308». Він увесь час був тут!");
      const b = g.querySelector('[data-connect]'); b && b.focus({ preventScroll:true });
      return;
    }
    if(e.target.closest('[data-connect]')){
      online = true; Sound.sfx('wifi'); draw();
      const f = flags(); f.wifiOn = true; st().answers[node.key] = { done:true }; taskDone(node.key); save(true);
      toast('📶', 'Wi-Fi connected', 'PalmCourt_Guest');
      thinkDlg("Yes! Connected!", "Так! Є підключення!", 'Continue ▸');
      primary(() => { hideGame(); next(node, id); });
    }
  };
};

/* ---------- Scene 3: video call with Mia ---------- */
const MIA_PHOTO = () => USE_PHOTOS ? `<img class="ep2-mia-img" src="${PIC_URL('call')}" alt="" draggable="false" onerror="this.parentNode.classList.remove('has-img');this.remove()">` : '';
const MIA_FACE = () => USE_PHOTOS ? `<img class="ep2-mia-img" src="${AVATARS.mia}" alt="" draggable="false" onerror="this.parentNode.classList.remove('has-img');this.remove()">` : '';
const MIA_TILE = () => `<svg viewBox="0 0 400 300" class="ep2-mia-svg" aria-hidden="true">
  <defs><linearGradient id="ep2miaBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3f6a"/><stop offset="1" stop-color="#1d2038"/></linearGradient>
  <radialGradient id="ep2miaLamp"><stop offset="0" stop-color="#ffd99a" stop-opacity=".7"/><stop offset="1" stop-color="#ffd99a" stop-opacity="0"/></radialGradient></defs>
  <rect width="400" height="300" fill="url(#ep2miaBg)"/><circle cx="330" cy="70" r="120" fill="url(#ep2miaLamp)"/>
  <rect x="30" y="40" width="90" height="120" rx="6" fill="#0057B7" opacity=".85"/><rect x="30" y="100" width="90" height="60" fill="#FFD700" opacity=".85"/>
  <rect x="250" y="150" width="120" height="8" fill="#5a3a2a"/>${[0,1,2,3].map(i => `<rect x="${256 + i * 26}" y="${110 + (i % 2) * 6}" width="18" height="${40 - (i % 2) * 6}" fill="${['#c97a3a','#5AB6F9','#6DBB75','#ff8fb1'][i]}"/>`).join('')}
  <g class="ep2-mia-fig">${figure(200, 330, 0.62, { shirt:'#5AB6F9', rim:'#cfe8ff', hair:'#7a4a2a' })}<path d="M${200 - 32} ${330 - 186 - 30} q-14 60 -6 110 l16 0 q-6 -60 6 -100Z M${200 + 32} ${330 - 186 - 30} q14 60 6 110 l-16 0 q6 -60 -6 -100Z" fill="#7a4a2a"/></g>
</svg>`;
function callView(incoming){
  const g = showGame('g-call');
  g.innerHTML = incoming
    ? `<div class="ep2-call incoming" role="dialog" aria-label="Incoming video call from Mia">
        <div class="ep2-call-ava${USE_PHOTOS ? ' has-img' : ''}">${MIA_TILE()}${MIA_FACE()}</div><div class="ep2-call-name">Mia 💙</div><div class="ep2-call-sub">FaceTime video…</div>
        <div class="ep2-call-btns"><button type="button" class="ep2-cbtn no" data-call="decline" aria-label="Decline">✕<small>Decline</small></button>
        <button type="button" class="ep2-cbtn yes" data-call="accept" aria-label="Accept">📹<small>Accept</small></button></div></div>`
    : `<div class="ep2-call live" aria-label="Video call with Mia">
        <div class="ep2-call-video${USE_PHOTOS ? ' has-img' : ''}">${MIA_TILE()}${MIA_PHOTO()}<div class="ep2-call-tag">Mia 💙 <span class="ep2-call-time">00:00</span></div><div class="ep2-call-self" aria-hidden="true"><span>You</span></div></div></div>`;
  return g;
}
let callTimer = null, ringTimer = null;
function startCallClock(){
  clearInterval(callTimer);
  const t0 = Date.now() - ((flags().callSecs || 0) * 1000);
  callTimer = setInterval(() => {
    const el = EP.game.querySelector('.ep2-call-time'); if(!el || EP.game.hidden){ clearInterval(callTimer); return; }
    if(EP.paused) return;
    const s = Math.floor((Date.now() - t0) / 1000); flags().callSecs = s; el.textContent = fmtTime(s).padStart(5, '0');
  }, 500);
}
function ensureCall(){
  if(!flags().inCall) return;
  if(!EP.game.hidden && EP.game.classList.contains('g-call')) return;
  callView(false); startCallClock();
}
RENDER.callstart = function(node, id, tok){
  hideDlg();
  let declined = 0;
  const g = callView(true);
  const ring = () => { if(tok === EP.token && !EP.paused) Sound.sfx('ring'); };
  ring(); clearInterval(ringTimer); ringTimer = setInterval(() => { if(tok !== EP.token || !EP.game.classList.contains('g-call') || !g.querySelector('.incoming')){ clearInterval(ringTimer); return; } ring(); }, 2600);
  try { navigator.vibrate && navigator.vibrate([200, 120, 200]); } catch(e){}
  const a = g.querySelector('[data-call="accept"]'); a && a.focus({ preventScroll:true });
  g.onclick = e => {
    const b = e.target.closest('[data-call]'); if(!b || tok !== EP.token) return;
    if(b.dataset.call === 'decline'){
      declined++;
      g.querySelector('.ep2-call-sub').textContent = declined > 1 ? 'Calling again… and again… 😂' : 'Calling again…';
      thinkDlg(declined > 1 ? "She is NOT going to stop. 😂" : "A text arrives: “Don't you DARE decline me 😂”", declined > 1 ? "Вона НЕ зупиниться. 😂" : "Приходить повідомлення: «Тільки посмій відхилити 😂»");
      return;
    }
    clearInterval(ringTimer);
    const f = flags(); f.inCall = true; f.callSecs = 0; f.callDeclined = declined;
    taskDone(node.key); save(true); Sound.sfx('good');
    g.onclick = null; callView(false); startCallClock();
    next(node, id);
  };
};
RENDER.callend = function(node, id, tok){
  ensureCall();
  dlg(`${head('📹 Video call', 'turn')}<div class="ep1-q">Say goodbye to Mia and end the call.</div>${uaDiv('Попрощайся з Мією й заверши дзвінок.')}
    <div class="ep1-row"><div class="ep1-tools">${uaBtn()}</div><button type="button" class="ep1-next ep2-endcall" data-primary>📞 Bye, Mia! — End call</button></div>`, 'k-choice');
  primary(() => {
    if(tok !== EP.token) return;
    clearInterval(callTimer);
    const f = flags(), mins = Math.max(1, Math.round((f.callSecs || 240) / 60));
    f.inCall = false;
    pushChat('mia', { id:'e2s3call', from:'me', kind:'call', text:`Video call · ${mins} min`, time: EP.scene.clock });
    save(true); Sound.sfx('soft');
    EP.game.classList.add('ep2-hangup');
    setTimeout(() => { if(tok !== EP.token) return; hideGame(); next(node, id); }, isReduced() ? 50 : 500);
  });
};

/* ---------- longer speaking turn (timer, checklist, optional recording) ---------- */
RENDER.talk = function(node, id, tok){
  const f = flags();
  dlg(`${head('🗣️ ' + (node.title || 'Speaking time'), 'turn')}
    <div class="ep1-q">${esc(valOf(node.prompt, f))}</div>${uaDiv(valOf(node.ua, f))}<div class="ep2-talk-host"></div>
    <div class="ep1-row"><div class="ep1-tools">${uaBtn()}</div></div>`, 'k-talk');
  talkBox(EP.dlg.querySelector('.ep2-talk-host'), Object.assign({}, node, { model: valOf(node.model, f) }), r => {
    if(tok !== EP.token) return;
    st().answers[node.key] = r; taskDone(node.key); save(true);
    toast('🎙️', 'Speaking practice done', r.mode === 'teacher' ? 'Done in class' : r.seconds ? `${r.seconds}s of talking` : '');
    const after = node.after;
    if(after) showLine({ type:'say', who:after.who, text:after.text, ua:after.ua }, () => next(node, id)); else next(node, id);
  });
};

/* ---------- Scene 4: the neighbourhood map ---------- */
/* Fictional businesses on real LA streets: the hotel is on Melrose Avenue;
   the diner is just north of the Melrose & Fairfax traffic lights. */
const HOOD = {
  P: { H:[110,300], J1:[300,300], J2:[520,300], D:[520,128], GN:[300,120], GS:[300,470], COF:[720,300], MART:[520,470] },
  J: {
    H:  { at:"Outside the Palm Court Hotel, on Melrose Avenue.", ua:"Біля готелю «Палм Корт» на Мелроуз-авеню.",
          go:{ straight:{ to:'J1', ok:true }, left:{ msg:["That's the hotel wall. 😅", "Це стіна готелю. 😅"] }, right:{ msg:["That's the road — cars! Not a good idea.", "Це дорога — машини! Погана ідея."] } } },
    J1: { at:"A small corner: Melrose & Genesee. No traffic lights here.", ua:"Невелике перехрестя: Мелроуз і Дженезі. Світлофора тут немає.",
          go:{ straight:{ to:'J2', ok:true }, left:{ to:'GN', msg:["A quiet street with houses. No traffic lights, no diner. Back to Melrose!", "Тиха вулиця з будинками. Ні світлофора, ні закусочної. Назад на Мелроуз!"] },
               right:{ to:'GS', msg:["Houses, a sleeping cat, no diner. Back you go!", "Будинки, сплячий кіт, жодної закусочної. Назад!"] } } },
    J2: { at:"Melrose & Fairfax — the traffic lights! 🚦", ua:"Мелроуз і Ферфакс — світлофор! 🚦",
          go:{ left:{ to:'D', ok:true, end:true }, straight:{ to:'COF', msg:["Night Owl Coffee — it's closing. A barista is stacking chairs. No burgers here.", "«Нічна сова» — кав'ярня зачиняється. Бариста складає стільці. Бургерів тут немає."] },
               right:{ to:'MART', msg:["A 24/7 Mart: phone chargers, snacks, and a cat asleep on the newspapers. Not a diner!", "Цілодобовий магазинчик: зарядки, снеки й кіт, що спить на газетах. Це не закусочна!"] } } }
  },
  peek: {
    coffee: ["☕ Night Owl Coffee", "Closes at 10 PM. The menu says: “Lavender oat latte — $6.50.” Six fifty?! For coffee?!", "Зачиняється о 22:00. У меню: «Лавандове лате на вівсяному — $6.50». Шість п'ятдесят?! За каву?!"],
    mart:   ["🏪 24/7 Mart", "Open all night. Chargers, snacks, sunscreen, flip-flops… and a very relaxed cat.", "Працює всю ніч. Зарядки, снеки, сонцезахисний крем, шльопанці… і дуже спокійний кіт."]
  }
};
/* the aerial photo map is used once it has loaded; until then (or if it is missing) the drawn map */
let MAP_PHOTO = USE_PHOTOS ? null : false;
function ensureMapPhoto(then){
  if(MAP_PHOTO !== null) return;
  const im = new Image();
  im.onload = () => { MAP_PHOTO = true; then(); };
  im.onerror = () => { MAP_PHOTO = false; };
  im.src = PIC_URL('map'); keepImage(im);
  if(im.complete && im.naturalWidth) MAP_PHOTO = true;
}
function hoodSVG(path, at){
  const P = HOOD.P, [tx, ty] = P[at];
  const L = (a, b) => `<line x1="${P[a][0]}" y1="${P[a][1]}" x2="${P[b][0]}" y2="${P[b][1]}"/>`;
  const route = path.slice(1).map((p, i) => L(path[i], p)).join('');
  if(MAP_PHOTO === true) return `<svg viewBox="0 0 800 560" class="ep2-hood-svg is-photo" role="img" aria-label="Neighbourhood map: Hotel, Diner, Books, Coffee and a 24/7 shop on Melrose, Genesee and Fairfax Avenue">
    <defs><clipPath id="ep2hoodClip"><rect width="800" height="560" rx="22"/></clipPath></defs>
    <image href="${PIC_URL('map')}" width="800" height="560" preserveAspectRatio="xMidYMid slice" clip-path="url(#ep2hoodClip)"/>
    <g stroke="#0b0e1a" stroke-opacity=".55" stroke-width="12" stroke-linecap="round" fill="none">${route}</g>
    <g class="ep2-hood-path" stroke="#FF8A3D" stroke-width="6" stroke-linecap="round" stroke-dasharray="2 12" fill="none">${route}</g>
    <g><rect x="30" y="528" width="350" height="22" rx="11" fill="#0b0e1a" opacity=".6"/><text x="44" y="543" ${FONT} font-size="12" fill="#c9d6ea">Game map — fictional businesses on real LA streets</text></g>
    <g class="ep2-hood-you" style="transform:translate(${tx}px,${ty}px)"><circle r="22" fill="#FF8A3D" opacity=".35"/><circle r="12" fill="#FF8A3D" stroke="#fff" stroke-width="3"/></g>
  </svg>`;
  return `<svg viewBox="0 0 800 560" class="ep2-hood-svg" role="img" aria-label="Neighbourhood map">
    <rect width="800" height="560" rx="22" fill="#141a2c"/>
    ${[[40,40,220,220],[340,40,140,220],[560,40,220,40],[40,340,220,180],[340,340,140,180],[560,340,220,180]].map(([x,y,w,h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="#1d2540"/>`).join('')}
    <g stroke="#3a4a6e" stroke-width="34" stroke-linecap="round"><line x1="30" y1="300" x2="780" y2="300"/><line x1="300" y1="40" x2="300" y2="530"/><line x1="520" y1="40" x2="520" y2="530"/></g>
    <g stroke="#56678f" stroke-width="2" stroke-dasharray="10 12"><line x1="30" y1="300" x2="780" y2="300"/><line x1="520" y1="40" x2="520" y2="530"/></g>
    <g ${FONT} font-weight="700" font-size="15" fill="#9fb6cf"><text x="680" y="290" text-anchor="middle">Melrose Ave</text><text x="290" y="520" transform="rotate(-90 290 520)">Genesee Ave</text><text x="536" y="520" transform="rotate(-90 536 520)">Fairfax Ave</text></g>
    <g class="ep2-hood-path" stroke="#FF8A3D" stroke-width="6" stroke-linecap="round" stroke-dasharray="2 12" fill="none">${route}</g>
    <g><rect x="60" y="230" width="100" height="44" rx="8" fill="#7a2f4f"/><text x="110" y="258" text-anchor="middle" ${FONT} font-size="15" font-weight="800" fill="#ffd0e4">🏨 Hotel</text></g>
    <g><rect x="430" y="70" width="80" height="40" rx="8" fill="#a8222f"/><text x="470" y="96" text-anchor="middle" ${FONT} font-size="13" font-weight="800" fill="#ffe0e6">🍔 Diner</text>
       <rect x="530" y="70" width="80" height="40" rx="8" fill="#3a4a8a"/><text x="570" y="96" text-anchor="middle" ${FONT} font-size="13" font-weight="800" fill="#dfe6ff">📚 Books</text></g>
    <g><rect x="660" y="230" width="104" height="40" rx="8" fill="#5a3a2a"/><text x="712" y="256" text-anchor="middle" ${FONT} font-size="13" font-weight="800" fill="#ffe2c8">☕ Coffee</text></g>
    <g><rect x="560" y="440" width="100" height="40" rx="8" fill="#2f5a3c"/><text x="610" y="466" text-anchor="middle" ${FONT} font-size="13" font-weight="800" fill="#d4f2d7">🏪 24/7</text></g>
    <g transform="translate(548 262)"><rect x="0" y="0" width="22" height="50" rx="6" fill="#0c0f18"/><circle cx="11" cy="11" r="6" fill="#ff4d4d"/><circle cx="11" cy="25" r="6" fill="#4a3a10"/><circle cx="11" cy="39" r="6" fill="#2a4a2a"/></g>
    <g transform="translate(740 70)"><circle r="20" fill="#0c0f18"/><path d="M0 -14 L6 4 L0 0 L-6 4Z" fill="#FF8A3D"/><text y="-24" text-anchor="middle" ${FONT} font-size="12" fill="#9fb6cf">N</text></g>
    <text x="40" y="545" ${FONT} font-size="12" fill="#6f84a8">Game map — fictional businesses on real LA streets</text>
    <g class="ep2-hood-you" style="transform:translate(${tx}px,${ty}px)"><circle r="20" fill="#FF8A3D" opacity=".3"/><circle r="11" fill="#FF8A3D" stroke="#fff" stroke-width="3"/></g>
  </svg>`;
}
RENDER.hood = function(node, id, tok){
  let at = 'H', path = ['H'], detours = 0, msg = null, done = false, busy = false;
  const g = showGame('g-hood');
  function draw(){
    const j = HOOD.J[at], here = path[path.length - 1];
    g.innerHTML = `<div class="ep2-hood">
      ${hoodSVG(path, here)}
      <div class="ep2-hood-side">
        <div class="ep1-note">📝 <b>Directions:</b> go straight → turn left at the traffic lights 🚦 → it's next to a bookstore.</div>
        ${!done ? `<div class="ep2-hood-at"><b>📍 ${esc(j.at)}</b>${uaDiv(j.ua)}</div>` : ''}
        ${msg ? `<div class="ep1-tip">${esc(msg[0])}${uaDiv(msg[1])}</div>` : ''}
        ${!done ? `<div class="ep1-dirs">${[['left','⬅ Turn left'],['straight','⬆ Go straight'],['right','Turn right ➡']].map(([k, t]) => `<button type="button" class="ep1-dir" data-dir="${k}"${busy ? ' disabled' : ''}>${t}</button>`).join('')}</div>`
                : `<div class="ep1-good">✓ Moonlight Diner — right next to the bookstore!</div>`}
        <div class="ep2-hood-peek"><span class="ep1-mini">Optional — take a look:</span>
          <button type="button" class="ep1-btn ep1-btn-ghost" data-peek="coffee">☕ Night Owl Coffee</button><button type="button" class="ep1-btn ep1-btn-ghost" data-peek="mart">🏪 24/7 Mart</button></div>
        <div class="ep1-phr">${['how-get-there','around-corner','cant-miss'].map(v => `<button type="button" class="ep1-chip" data-vocab="${v}">💬 ${esc(E.api.PHRASES[v].en)}</button>`).join('')}</div>
      </div></div>`;
    requestAnimationFrame(() => { const you = g.querySelector('.ep2-hood-you'); if(you){ const [x, y] = HOOD.P[here]; you.style.transform = `translate(${x}px,${y}px)`; } });
    const first = g.querySelector('[data-dir]:not([disabled])'); first && first.focus({ preventScroll:true });
  }
  ensureMapPhoto(() => { if(tok === EP.token && !EP.game.hidden && g.querySelector('.ep2-hood-svg')) draw(); });
  g.onclick = e => {
    if(tok !== EP.token) return;
    const v = e.target.closest('[data-vocab]'); if(v){ vocabCard(v.dataset.vocab); return; }
    const pk = e.target.closest('[data-peek]');
    if(pk){ const p = HOOD.peek[pk.dataset.peek]; const s = st(); if(!s.explored.includes('s4-' + pk.dataset.peek)) s.explored.push('s4-' + pk.dataset.peek);
      pop(`<div class="ep1-vcard"><div class="ep1-vcard-en">${esc(p[0])}</div><div class="ep1-vcard-simple">${esc(p[1])}</div>${uaDiv(p[2])}<div class="ep1-row"><span></span>${uaBtn().replace('data-act="ua"', 'onclick="this.closest(\'.ep1-vcard\').querySelector(\'.ep1-ua\').hidden=!this.closest(\'.ep1-vcard\').querySelector(\'.ep1-ua\').hidden"')}</div></div>`); return; }
    const b = e.target.closest('[data-dir]'); if(!b || done || busy) return;
    const step = HOOD.J[at].go[b.dataset.dir];
    if(step.ok){
      path.push(step.to); at = step.to; msg = null; Sound.sfx('soft');
      if(step.end){ done = true; Sound.sfx('good'); taskDone(node.key); st().answers[node.key] = { detours }; save(true); draw(); finish(); return; }
      draw(); return;
    }
    detours++; msg = step.msg; Sound.sfx('soft');
    if(step.to){ path.push(step.to); busy = true; draw(); setTimeout(() => { if(tok !== EP.token) return; path.pop(); busy = false; draw(); }, isReduced() ? 60 : 1500); }
    else draw();
  };
  function finish(){
    thinkDlg("There it is — next to the bookstore!", "Ось вона — поруч із книгарнею!", 'Continue ▸');
    primary(() => { hideGame(); next(node, id); });
  }
  thinkDlg("Follow the directions on the map. Choose a direction at each corner.", "Іди за підказками на мапі. На кожному розі обирай напрямок.");
  draw();
};

/* ---------- Scene 5: the menu ---------- */
const SOPHIE_ANSWERS = {
  popular:    { q:"What's popular here?", a: () => ["The cheeseburger, hands down. People drive here from Santa Monica for it! 🍔", "Чизбургер, без сумніву. Люди їдуть сюди за ним аж із Санта-Моніки! 🍔"] },
  vegetarian: { q:"Do you have anything vegetarian?", a: () => ["Sure! The Caesar salad is vegetarian, and so are the fries.", "Звісно! Салат «Цезар» вегетаріанський, і картопля фрі теж."] },
  togo:       { q:"Can I get this to go?", a: () => ["Of course! Anything on the menu can be to go.", "Звісно! Усе з меню можна взяти з собою."], vocab:'here-or-to-go' },
  price:      { q:"How much is it?", a: f => subtotal(f) ? [`Right now that's $${subtotal(f)} — before tax and tip.`, `Зараз це $${subtotal(f)} — без податку й чайових.`] : ["Depends what you get! The burger is $12.", "Залежить від того, що візьмете! Бургер — $12."] }
};
RENDER.menu = function(node, id, tok){
  const f = flags();
  const asked = new Set(f.askedSophie || []);
  let reply = null;
  const g = showGame('g-menu');
  function item(it, group, on){
    return `<button type="button" class="ep2-mi ${on ? 'on' : ''}" data-pick="${group}:${it.id}" aria-pressed="${on}">
      <span class="ep2-mi-i" aria-hidden="true">${it.icon}</span><span class="ep2-mi-n">${esc(it.name)}${it.desc ? `<small>${esc(it.desc)}</small>` : ''}</span><span class="ep2-mi-p">$${it.price}</span></button>`;
  }
  function draw(){
    const ready = !!(f.meal && f.drink);
    g.innerHTML = `<div class="ep2-menu">
      <div class="ep2-menu-card">
        <div class="ep2-menu-top">☾ MOONLIGHT DINER<small>Open late · since 1962</small></div>
        <div class="ep2-menu-h">Main dishes <small>choose one</small></div>${MENU.mains.map(m => item(m, 'meal', f.meal === m.id)).join('')}
        <div class="ep2-menu-h">Drinks <small>choose one</small></div>${MENU.drinks.map(d => item(d, 'drink', f.drink === d.id)).join('')}
        <div class="ep2-menu-h">Extra <small>optional</small></div>${item(MENU.extra, 'fries', !!f.fries)}
        <div class="ep2-menu-sub" aria-live="polite">Subtotal <b>$${subtotal(f)}</b><small>before tax and tip · fictional prices</small></div>
      </div>
      <div class="ep2-menu-side">
        <div class="ep1-eyebrow">Ask Sophie (say it out loud!)</div>
        <div class="ep2-ask">${Object.entries(SOPHIE_ANSWERS).map(([k, x]) => `<button type="button" class="ep1-chip ${asked.has(k) ? 'done' : ''}" data-ask="${k}">🗣️ ${esc(x.q)}</button>`).join('')}</div>
        ${reply ? `<div class="ep2-bubbles"><div class="ep2-bub me">${esc(reply.q)}</div><div class="ep2-bub them"><b>Sophie:</b> ${esc(reply.a[0])}${uaDiv(reply.a[1])}</div></div>` : ''}
        <div class="ep2-menu-order">${f.meal ? `<b>Your order:</b> ${esc(orderList(f))}` : '<span class="ep1-mini">Choose a main dish and a drink. Fries are optional.</span>'}</div>
        <button type="button" class="ep1-next" data-ready ${ready ? '' : 'disabled'}>✓ I'm ready to order</button>
      </div></div>`;
  }
  g.onclick = e => {
    if(tok !== EP.token) return;
    const p = e.target.closest('[data-pick]');
    if(p){
      const [grp, val] = p.dataset.pick.split(':');
      if(grp === 'meal') f.meal = val; if(grp === 'drink') f.drink = val; if(grp === 'fries') f.fries = !f.fries;
      Sound.sfx('soft'); save(); draw(); return;
    }
    const a = e.target.closest('[data-ask]');
    if(a){
      const k = a.dataset.ask, x = SOPHIE_ANSWERS[k];
      asked.add(k); f.askedSophie = Array.from(asked);
      reply = { q:x.q, a:x.a(f) };
      draw(); if(SET.voice && SET.sound) Voice.speak('sophie', reply.a[0]);
      save(); return;
    }
    if(e.target.closest('[data-ready]') && f.meal && f.drink){
      st().answers[node.key] = { meal:f.meal, drink:f.drink, fries:!!f.fries, asked:Array.from(asked) };
      taskDone(node.key); save(true); Sound.sfx('good'); hideGame(); next(node, id);
    }
  };
  dlg(`${head('sophie', 'say')}<div class="ep1-text say">${lineHTML(id === 'menu2' ? "No problem! Here's the menu again." : "Take your time, hon. Just tell me when you're ready.")}</div>
    ${uaDiv("Не поспішайте, сонечко. Скажіть, коли будете готові.")}
    <div class="ep1-row"><div class="ep1-tools">${uaBtn()}<span class="ep1-mini">Mission 5 · Build your order — a main dish, a drink, and fries if you like.</span></div></div>`, 'k-say');
  draw();
};

/* ---------- Scene 5: the food arrives ---------- */
function plateSVG(f){
  const togo = f.orderMode === 'togo';
  const main = { burger:`<g transform="translate(150 130)"><path d="M-80 0 a80 46 0 0 1 160 0Z" fill="#d89a4a"/><rect x="-86" y="0" width="172" height="12" rx="6" fill="#6ab04c"/><rect x="-82" y="12" width="164" height="22" rx="8" fill="#5a2f22"/><rect x="-88" y="30" width="176" height="10" rx="4" fill="#ffd23f"/><path d="M-80 40 h160 a10 10 0 0 1 -10 22 h-140 a10 10 0 0 1 -10 -22Z" fill="#c98a3e"/>${[-40,0,40].map(x => `<ellipse cx="${x}" cy="-24" rx="5" ry="3" fill="#fff4d6"/>`).join('')}</g>`,
    sandwich:`<g transform="translate(150 140)"><path d="M-90 30 L0 -50 L90 30Z" fill="#e8c27a"/><path d="M-86 30 L0 -42 L86 30" fill="none" stroke="#6ab04c" stroke-width="10"/><path d="M-80 34 L0 -30 L80 34Z" fill="#c98a3e"/><rect x="-90" y="30" width="180" height="16" rx="6" fill="#d89a4a"/></g>`,
    salad:`<g transform="translate(150 140)"><ellipse cx="0" cy="20" rx="96" ry="40" fill="#e8e4dc"/><ellipse cx="0" cy="8" rx="82" ry="30" fill="#6ab04c"/>${[[-40,-6],[10,-14],[44,0],[-10,6],[30,14]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="16" ry="9" fill="#8bd06a"/>`).join('')}${[[-24,0],[20,4],[50,-8]].map(([x, y]) => `<rect x="${x}" y="${y}" width="12" height="12" rx="2" fill="#e8c27a"/>`).join('')}</g>` }[f.meal] || '';
  const fries = f.fries ? `<g transform="translate(300 150)"><path d="M-34 -10 L34 -10 L26 50 L-26 50Z" fill="#d03a2f"/>${[-24,-12,0,12,24].map((x, i) => `<rect x="${x - 4}" y="${-50 + (i % 2) * 10}" width="8" height="46" rx="2" fill="#ffd23f"/>`).join('')}<text y="28" text-anchor="middle" ${FONT} font-size="14" font-weight="800" fill="#fff">☾</text></g>` : '';
  const dcol = { lemonade:'#fff176', cola:'#5a2a1a', water:'#cfe8ff' }[f.drink] || '#cfe8ff';
  const drink = `<g transform="translate(410 120)"><path d="M-28 -50 L28 -50 L22 60 L-22 60Z" fill="#ffffff" opacity=".25" stroke="#fff" stroke-opacity=".5"/><path d="M-25 -30 L25 -30 L21 56 L-21 56Z" fill="${dcol}" opacity=".9"/>${togo ? '<rect x="-30" y="-58" width="60" height="12" rx="4" fill="#e8e4dc"/><rect x="6" y="-90" width="5" height="40" fill="#ff8fb1"/>' : `<rect x="8" y="-86" width="5" height="70" fill="#ff8fb1" transform="rotate(12)"/>${f.drink === 'lemonade' ? '<circle cx="-26" cy="-34" r="14" fill="#ffd23f" stroke="#fff6a8" stroke-width="3"/>' : ''}`}</g>`;
  return `<svg viewBox="0 0 500 260" class="ep2-plate" role="img" aria-label="Your food: ${esc(orderList(f))}">
    ${togo ? `<g transform="translate(150 150)"><path d="M-110 -70 L110 -70 L96 90 L-96 90Z" fill="#c9a06a"/><path d="M-110 -70 L110 -70 L100 -40 L-100 -40Z" fill="#b38a55"/><text y="20" text-anchor="middle" ${FONT} font-size="26" font-weight="800" fill="#5a3a1a">☾ MOONLIGHT</text></g>`
           : `<ellipse cx="200" cy="200" rx="190" ry="48" fill="#f6f2ea"/><ellipse cx="200" cy="196" rx="150" ry="34" fill="#ffffff"/>${main}`}
    ${togo ? '' : fries}${drink}</svg>`;
}
RENDER.meal = function(node, id, tok){
  const f = flags();
  const g = showGame('g-meal');
  const lines = [mainOf(f), f.fries && MENU.extra, drinkOf(f)].filter(Boolean);
  g.innerHTML = `<div class="ep2-meal">${plateSVG(f)}
    <div class="ep2-receipt"><div class="ep2-receipt-h">☾ Moonlight Diner</div>${lines.map(x => `<div><span>${esc(x.name)}</span><span>$${x.price}</span></div>`).join('')}
      <div class="ep2-receipt-t"><span>Subtotal</span><span>$${subtotal(f)}</span></div><small>+ tax and tip</small></div></div>`;
  Sound.sfx('bell');
  say1('sophie', f.orderMode === 'togo' ? "Here you go — to go! But stay as long as you like. Enjoy your first LA dinner!" : "Here you go! Enjoy your first LA dinner!",
       f.orderMode === 'togo' ? "Ось — з собою! Але сидіть скільки завгодно. Смачної першої вечері в Лос-Анджелесі!" : "Прошу! Смачної першої вечері в Лос-Анджелесі!",
       () => { hideGame(); next(node, id); });
};

/* ---------- Scene 6: get to know Jake ---------- */
const JAKE_Q = [
  { k:'school', icon:'🎒', label:'School', q:"What school do you go to?", a:["I go to Fairview High. It's huge — like, two thousand students.", "You'll probably see it soon… just saying. 😏"] },
  { k:'hobbies', icon:'🎧', label:'Hobbies', q:"What do you do for fun?", a:["Honestly? Basketball, music, and eating fries at ten PM. 😄"] },
  { k:'basketball', icon:'🏀', label:'Basketball', q:"Do you play any sports?", a:["Basketball! I play almost every day at Pan Pacific Park — it's like ten minutes from here.", "Best courts in the city. You play?"] },
  { k:'music', icon:'🎵', label:'Music', q:"What kind of music do you like?", a:["Everything, honestly. There's this place, The Echo Room, with open mic nights on Thursdays.", "Some of it's terrible. Some of it's amazing. You never know! 🎸"] },
  { k:'places', icon:'🌴', label:'Favorite places in LA', q:"What's your favorite place in LA?", a:["Griffith Observatory at sunset. Trust me.", "The whole city looks like a map made of lights."] },
  { k:'millers', icon:'🏡', label:'The Miller family', q:"So… how do you know the Millers?", a:["The Millers? Oh, they're great.", "Let's just say… LA is smaller than you think. 😏"] }
];
const JAKE_OWN = ["Ha — nobody's ever asked me that! Let me think about it…", "Ask me again next time. Deal? 😄"];
RENDER.jakeq = function(node, id, tok){
  const f = flags();
  const asked = new Set(f.jakeQuestions || []);
  let cur = null, showQ = false;
  const g = showGame('g-jake');
  const NEED = 3;
  function grid(){
    g.innerHTML = `<div class="ep2-jq">
      <div class="ep2-jq-h"><b>Mission 6 · Get to know Jake</b><span class="ep2-jq-n">Questions asked: ${asked.size}/${NEED}${asked.size > NEED ? ' ✓' : ''}</span></div>
      <div class="ep2-jq-grid">${JAKE_Q.map(t => `<button type="button" class="ep2-jq-t ${asked.has(t.k) ? 'done' : ''}" data-t="${t.k}"><span aria-hidden="true">${t.icon}</span>${esc(t.label)}${asked.has(t.k) ? '<i>✓</i>' : ''}</button>`).join('')}
        <button type="button" class="ep2-jq-t own ${asked.has('own') ? 'done' : ''}" data-t="own"><span aria-hidden="true">✏️</span>My own question${asked.has('own') ? '<i>✓</i>' : ''}</button></div></div>`;
    dlg(`${head('🗣️ Your turn', 'turn')}<div class="ep1-q">Ask Jake at least ${NEED} questions. Pick a topic, then ask it out loud.</div>${uaDiv(`Постав Джейку щонайменше ${NEED} запитання. Обери тему — і запитай уголос.`)}
      <div class="ep1-row"><div class="ep1-tools">${uaBtn()}<span class="ep1-count-pill">${Math.min(asked.size, NEED)}/${NEED}</span></div>
      <button type="button" class="ep1-next" data-primary ${asked.size >= NEED ? '' : 'disabled'}>${asked.size >= NEED ? "I'm done asking ▸" : `Ask ${NEED - asked.size} more`}</button></div>`, 'k-choice');
    primary(() => { if(asked.size < NEED) return; st().answers[node.key] = { asked: Array.from(asked) }; taskDone(node.key); save(true); hideGame(); next(node, id); });
  }
  function askView(){
    const t = cur === 'own' ? null : JAKE_Q.find(x => x.k === cur);
    g.innerHTML = `<div class="ep2-jq"><div class="ep2-jq-ask">
      <div class="ep1-eyebrow">${t ? `${t.icon} ${esc(t.label)}` : '✏️ Your own question'}</div>
      <div class="ep1-q">${t ? 'Ask Jake about this — out loud.' : 'Ask Jake anything you want to know — out loud.'}</div>
      ${t ? (showQ ? `<div class="ep1-model"><span>Example:</span> “${esc(t.q)}” ${Voice.available() ? `<button type="button" class="ep1-tool" data-sayq aria-label="Listen">🔊</button>` : ''}</div>` : `<button type="button" class="ep1-btn ep1-btn-ghost" data-showq>💡 Show an example question</button>`) : `<div class="ep1-mini">Ideas: his family, his favourite food, the best place for pizza…</div>`}
      <div class="ep1-row"><button type="button" class="ep1-btn ep1-btn-ghost" data-back>‹ Back</button><button type="button" class="ep1-next" data-asked>I asked ✓</button></div>
    </div></div>`;
    hideDlg();
    const b = g.querySelector('[data-asked]'); b && b.focus({ preventScroll:true });
  }
  function answer(lines, i){
    if(tok !== EP.token) return;
    if(i >= lines.length){ grid(); return; }
    say1('jake', lines[i], null, () => answer(lines, i + 1));
  }
  g.onclick = e => {
    if(tok !== EP.token) return;
    const t = e.target.closest('[data-t]'); if(t){ cur = t.dataset.t; showQ = false; Sound.sfx('soft'); askView(); return; }
    if(e.target.closest('[data-showq]')){ showQ = true; askView(); return; }
    if(e.target.closest('[data-sayq]')){ const x = JAKE_Q.find(q => q.k === cur); x && Voice.speak('you', x.q); return; }
    if(e.target.closest('[data-back]')){ cur = null; grid(); return; }
    if(e.target.closest('[data-asked]')){
      asked.add(cur); f.jakeQuestions = Array.from(asked); save(true);
      const x = JAKE_Q.find(q => q.k === cur);
      g.innerHTML = `<div class="ep2-jq"><div class="ep2-jq-ask"><div class="ep1-eyebrow">${x ? `${x.icon} ${esc(x.label)}` : '✏️ Your own question'}</div><div class="ep1-mini">🗣️ You asked. Jake answers…</div></div></div>`;
      answer(x ? x.a : JAKE_OWN, 0);
    }
  };
  grid();
};

/* ---------- small story actions ---------- */
const ACTIONS = {
  unlockDiner(){
    const l = DATA.locations.find(x => x.id === 'diner');
    if(l && l.status !== 'unlocked'){ l.status = 'unlocked'; l.visited = true; l.note = 'Visited · Day 1, 10 PM — your first LA dinner.'; toast('📍', 'New place on your Map', 'Moonlight Diner'); }
    save(true);
  },
  swapNumbers(){
    const f = flags(); f.jakeConnection = 'knows-the-millers-son';   // for Episode 3: Jake is friends with the Millers' son
    if(giveItem("Jake's contact")) toast('📇', 'New item', "Jake's contact");
    save(true);
  },
  journalPlan(){
    upsertJournal(planText());
    toast('📔', 'Journal updated', "Tomorrow's plan");
    save(true);
  }
};
RENDER.act = function(node, id){
  try { ACTIONS[node.run] && ACTIONS[node.run](flags()); } catch(e){ console.warn('Life in LA: action failed', node.run, e); }
  next(node, id);
};

/* ---------- Scene 7: reply to Rachel (custom phone step) ---------- */
const RACHEL_STYLES = [
  { k:'friendly', label:'😊 Friendly and enthusiastic', text:"Hi Rachel! Thank you so much! 11 AM sounds perfect. I'm really excited to meet everyone tomorrow! 😊" },
  { k:'professional', label:'🤝 Polite and professional', text:"Good evening, Rachel! Thank you for your message. 11 AM works perfectly for me. I look forward to meeting your family." },
  { k:'question', label:'❓ Friendly, with a question', text:"Hi Rachel! 11 AM works great! Thanks for arranging everything. Should I wait for David in the hotel lobby?" }
];
const JAKE_PS = " P.S. I met a guy called Jake at a diner tonight — he says he knows your family! 😄";
async function replyToRachel(ctx){
  const { tid, tok, f } = ctx;
  if(ctx.hasMsg(tid, 'e2s7r1') && f.rachelReplyStyle) return;
  let shown = 0;
  const L = hintLadder({ hints:["Thank Rachel, then answer her question: does 11 AM work for you?", "Useful: “11 AM sounds perfect.” · “I'm looking forward to it!”"],
                         model:"Hi Rachel! Thank you! 11 AM is perfect. I'm looking forward to it!" }, f);
  await new Promise(res => {
    const draw = () => {
      const foot = ctx.foot(`<div class="ep1-ph-q">🗣️ Mission 7 · Reply to Rachel<small class="ep1-oua" ${SET.ua ? '' : 'hidden'}>Спершу скажи відповідь уголос — як голосове повідомлення.</small></div>
        <p class="ep2-ph-p">First, say your reply <b>out loud</b> — like you're dictating a message. Then choose how to write it.</p>
        ${L.steps.slice(0, shown).map(s => s.html).join('')}
        <div class="ep1-row ep1-row-tight">${shown < L.steps.length ? `<button type="button" class="ep1-btn ep1-btn-ghost" data-h>${L.steps[shown].label}</button>` : ''}
          <button type="button" class="ep1-next" data-said>I said it ✓ — show me the options</button></div>`);
      foot.onclick = e => {
        if(tok !== EP.token) return;
        if(e.target.closest('[data-h]')){ shown++; draw(); return; }
        if(e.target.closest('[data-say-model]')){ Voice.speak('you', L.model); return; }
        if(e.target.closest('[data-said]')){ foot.onclick = null; res(); }
      };
      const b = foot.querySelector('[data-said]'); b && b.focus({ preventScroll:true });
    };
    draw();
  });
  if(tok !== EP.token) return;
  const choice = await new Promise(res => {
    let ps = false;
    const draw = () => {
      const foot = ctx.foot(`<div class="ep1-ph-q">How do you want to write it?<small class="ep1-oua" ${SET.ua ? '' : 'hidden'}>Як ти хочеш це написати?</small></div>
        <label class="ep2-ps"><input type="checkbox" data-ps ${ps ? 'checked' : ''}> Add a P.S. about meeting Jake 🏀</label>
        <div class="ep2-styles">${RACHEL_STYLES.map((s, i) => `<button type="button" class="ep1-opt ep2-style" data-st="${i}"><span class="ep2-style-l">${esc(s.label)}</span><span class="ep2-style-t">${esc(s.text + (ps ? JAKE_PS : ''))}</span></button>`).join('')}
          <button type="button" class="ep1-opt ep1-own" data-own><span class="ep1-k" aria-hidden="true">✏️</span><span class="ep1-opt-t">Write my own reply</span></button></div>`);
      foot.onclick = e => {
        if(tok !== EP.token) return;
        const s = e.target.closest('[data-st]');
        if(s){ const st_ = RACHEL_STYLES[+s.dataset.st]; foot.onclick = null; res({ text: st_.text + (ps ? JAKE_PS : ''), style: st_.k, jake: ps }); return; }
        if(e.target.closest('[data-own]')){
          foot.onclick = null;
          const f2 = ctx.foot(`<div class="ep1-ph-compose"><textarea class="ep1-ta" rows="3" maxlength="300" placeholder="Hi Rachel! …" aria-label="Your reply"></textarea><button type="button" class="ep1-send" aria-label="Send" disabled>➤</button></div>`);
          const ta = f2.querySelector('.ep1-ta'), sb = f2.querySelector('.ep1-send');
          ta.focus(); ta.addEventListener('input', () => sb.disabled = !ta.value.trim());
          const go = () => { const v = ta.value.trim(); if(v) res({ text:v, style:'own', jake: /jake/i.test(v) }); };
          sb.addEventListener('click', go); ta.addEventListener('keydown', e2 => { if(e2.key === 'Enter' && !e2.shiftKey){ e2.preventDefault(); go(); } });
        }
      };
      const cb = foot.querySelector('[data-ps]'); cb && cb.addEventListener('change', () => { ps = cb.checked; draw(); });
      const first = foot.querySelector('[data-st]'); first && first.focus({ preventScroll:true });
    };
    draw();
  });
  if(tok !== EP.token) return;
  ctx.foot('');
  /* replaying: Rachel's answers to the old reply go, so she reacts to the new one */
  if(ctx.thread && ctx.thread.chat) ctx.thread.chat = ctx.thread.chat.filter(m => !['e2s7m3', 'e2s7m4', 'e2s7m5', 'e2s7r2'].includes(m.id));
  ctx.pushChat(tid, { id:'e2s7r1', from:'me', text: choice.text.slice(0, 300), time: ctx.clock });
  f.rachelReplyStyle = choice.style; f.mentionedJake = !!choice.jake;
  ctx.s.choices['s7:e2s7r1'] = choice.text.slice(0, 300);
  taskDone('s7_reply'); Sound.sfx('sent'); ctx.renderThread(); ctx.save(true);
  await ctx.wait(isReduced() ? 120 : 500);
}

/* =========================================================================
   FINAL SPEAKING MISSION — “A Voice Note to Mia” 🎙️
   Speaking only: an optional timer, a checklist the student ticks, optional
   recording on the device, hints and a sample answer built from the
   student's own choices. Nothing claims to understand or grade the voice.
   ========================================================================= */
const VOICE_TOPICS = [
  { k:'hotel', label:'Your hotel' }, { k:'problem', label:'The problem you had' }, { k:'food', label:'What you ate' },
  { k:'met', label:'Someone interesting you met' }, { k:'plans', label:'Your plans for tomorrow' }, { k:'mystery', label:'The mysterious message' }
];
function sampleVoiceNote(f){
  const fix = { call:"I called the front desk", ask:"I went downstairs and asked Daniel", self:"I found the password myself" }[f.hotelChoice] || "I fixed it";
  return `Hey Mia! You won't believe what happened tonight. First of all, my key card stopped working, and the hotel couldn't find my reservation — it was just a spelling mistake! Now I'm in Room 308. Then the Wi-Fi didn't work, but ${fix}. Later, I walked to a diner and I ordered ${orderList(f) || 'a cheeseburger'}. I met a guy called Jake — he knows the Millers! Tomorrow David is going to pick me up at 11. Oh, and I got a really strange message from an unknown number…`;
}
RENDER.voicenote = function(node, id, tok){
  hideDlg(); hideGame();
  const f = flags();
  EP.sheet.hidden = false;
  EP.sheet.innerHTML = `<div class="ep1-final ep2-vn" role="dialog" aria-label="Final mission: A Voice Note to Mia">
    <div class="ep1-final-head"><div class="ep1-eyebrow">🎙️ Final mission</div><h2>A Voice Note to Mia</h2>
      <p>Before you go to sleep, send Mia one final update about your first night in LA. Say it out loud!</p>
      <p class="ep1-ua" ${SET.ua ? '' : 'hidden'}>Перед сном надішли Мії останню новину про свою першу ніч у Лос-Анджелесі. Розкажи вголос!</p></div>
    <div class="ep2-vn-host"></div></div>`;
  talkBox(EP.sheet.querySelector('.ep2-vn-host'), {
    opening:"Hey Mia! You won't believe what happened tonight. First of all…",
    topics: VOICE_TOPICS, topicsTitle:'Talk about', seconds:60, minSec:20,
    starters:["First of all, …","Then…","Later, I…","I met…","Tomorrow I'm going to…","And then I got…"],
    vocab:['theres-problem','doesnt-work','could-i-get','small-world','looking-forward','cant-miss'],
    model: sampleVoiceNote(f), doneLabel:'Send voice note ➤'
  }, r => {
    if(tok !== EP.token) return;
    const s = st();
    s.final = { mode:r.mode, seconds:r.seconds, ticked:r.ticked, at:Date.now() };
    f.finalMissionCompleted = true;
    taskDone('final');
    pushChat('mia', r.mode === 'teacher'
      ? { id:'e2s8vn', from:'me', text:"🎙️ (I told you everything in class 😄)", time: EP.scene.clock }
      : { id:'e2s8vn', from:'me', kind:'voice', dur: fmtTime(Math.max(1, r.seconds)), time: EP.scene.clock });
    save(true);
    EP.sheet.hidden = true; EP.sheet.innerHTML = ''; EP.sheet.onclick = null;
    Sound.sfx('sent');
    next(node, id);
  });
};

/* =========================================================================
   JOURNAL — built from the student's real choices
   ========================================================================= */
const JOURNAL_ID = 'ep2-first-night';
function planText(){
  return "Day 1 — First Night in LA. Plan for tomorrow: David Miller is going to pick me up at the hotel at 11 AM. Then I'm finally going to meet the Millers! 🏡";
}
function journalText(){
  const f = (peekSt(EP_ID) || { flags:{} }).flags;
  const wifi = { call:"The Wi-Fi didn't work either, so I called the front desk.", ask:"The Wi-Fi didn't work either, so I went downstairs and asked Daniel for help.",
                 self:"The Wi-Fi didn't work either, but I fixed it myself — the password was on the key card holder!" }[f.hotelChoice] || "The Wi-Fi didn't work at first, but I fixed it.";
  const food = orderList(f) ? `I ordered ${orderList(f)}` : 'I had a great dinner';
  const jake = f.mentionedJake ? " I told Rachel about him, and she said, “What a small world!”" : '';
  const mystery = { reply:"At 11:17 PM I got a strange message from an unknown number. I replied, but nobody answered…",
                    ignore:"At 11:17 PM I got a strange message from an unknown number. I ignored it… but I keep thinking about it.",
                    mia:"At 11:17 PM I got a strange message from an unknown number. I told Mia — she thinks I'm in a mystery movie. 😂" }[f.mysteryChoice] || "And then I got a strange message from an unknown number…";
  return `Day 1 — First Night in LA. Tonight my key card stopped working, and the hotel couldn't find my reservation — it was just a spelling mistake! Now I'm in Room 308. ${wifi} Later, I walked to Moonlight Diner, and ${food}. I met a local teenager named Jake, who seems to know the Millers.${jake} Tomorrow David is going to pick me up at 11 AM, and I'm going to meet my host family. ${mystery}`;
}
function upsertJournal(text){
  const j = DATA.journal.find(x => x.id === JOURNAL_ID);
  if(j){ j.text = text; return; }
  DATA.journal.unshift({ id:JOURNAL_ID, auto:true, date:'Day 1 · ' + DATA.day.dateLabel + ' · night', text });
}

/* =========================================================================
   COMPLETION — every world update is idempotent (safe to repeat)
   ========================================================================= */
const EP2_ACH = ['first-order', 'friend', 'night-owl'];
const EP2_PEOPLE = ['daniel', 'sophie-m', 'jake'];
const HOTEL_EP2_NOTE = 'Visited · Day 1. Room 412 was a mix-up — your room is 308.';
const HOTEL_EP1_NOTE = 'Your first night in LA. Room 412.';
function applyCompletionWorld(){
  const s = st();
  EP2_ACH.forEach(unlockAch);
  EP2_PHRASES.forEach(addPhrase);
  EP2_ITEMS.forEach(giveItem);
  EP2_PEOPLE.forEach(meet);
  const m = DATA.memories.find(x => x.id === 'm1'); if(m) m.unlocked = true;
  const diner = DATA.locations.find(l => l.id === 'diner'); if(diner){ diner.status = 'unlocked'; diner.visited = true; diner.note = 'Visited · Day 1, 10 PM — your first LA dinner.'; }
  const hotel = DATA.locations.find(l => l.id === 'hotel'); if(hotel){ hotel.status = 'unlocked'; hotel.visited = true; hotel.note = HOTEL_EP2_NOTE; }
  const exp = DATA.achievements.find(a => a.id === 'explorer'); if(exp && !exp.done) exp.progress = Math.max(exp.progress || 0, DATA.locations.filter(l => l.visited).length);
  const fn = DATA.story.find(x => x.id === 'first-night'); if(fn) fn.status = 'done';
  const nh = DATA.story.find(x => x.id === 'new-home'); if(nh && nh.status === 'locked') nh.status = 'current';   // shows the “coming soon” preview
  upsertJournal(journalText());
  s.completedScenes = SCENES.map(x => x.id);
  /* things Episode 3 will want to know (also kept in flags) */
  s.forEp3 = { jakeKnowsMillersSon:true, mysteryChoice:s.flags.mysteryChoice || null, mentionedJake:!!s.flags.mentionedJake,
               rachelReplyStyle:s.flags.rachelReplyStyle || null, pickup:'11 AM, David, hotel lobby' };
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
      box.innerHTML = `<div class="ep1-end-big ep2-tbc">TO BE CONTINUED…</div>`;
      await wait(R ? 1200 : 3000); if(skip || tok !== EP.token) return;
      box.innerHTML = `<div class="ep1-end-big ep2-next-t">Episode 3: A New Home 🏡</div><div class="ep1-end-sub">Tomorrow, you'll finally meet the Millers.<br>But who sent that message?</div>`;
      await wait(R ? 1600 : 4200); if(skip || tok !== EP.token) return;
      skip = true; summary(firstTime);
    })();
  }, isReduced() ? 200 : 900);
};

function summary(firstTime){
  const s = st(), f = s.flags;
  const learned = OWN_PHRASES.filter(id => DATA.phrases.some(p => p.id === id)).length;
  const reviewed = EP2_PHRASES.filter(id => !OWN_PHRASES.includes(id)).length;
  const spoke = Object.values(s.answers || {}).filter(a => a && ['spoken','voice','text','timer','teacher'].includes(a.mode)).length + (s.final ? 1 : 0);
  const ach = EP2_ACH.map(ensureAch).filter(Boolean);
  const people = EP2_PEOPLE.map(id => DATA.people.find(p => p.id === id)).filter(Boolean);
  const ep3 = E.has('ep3');
  EP.cine.hidden = false; EP.cine.className = 'ep1-cine ep1-cine-summary ep2-summary';
  EP.cine.innerHTML = `<div class="ep1-sum" role="dialog" aria-label="Episode summary">
    <div class="ep1-eyebrow">Season 1 · Episode 2</div>
    <h2>Episode 2 Complete! 🌙</h2><p class="ep1-sum-sub">You survived your first night in Los Angeles!</p>
    <div class="ep1-sum-grid ep2-sum-grid">
      <div class="ep1-stat"><b>${Math.min(8, s.completedScenes.length)}/8</b><span>scenes</span></div>
      <div class="ep1-stat"><b>${learned}</b><span>new phrases in your Backpack${reviewed ? ` (+${reviewed} reviewed)` : ''}</span></div>
      <div class="ep1-stat"><b>${spoke}</b><span>speaking moments</span></div>
      <div class="ep1-stat"><b>${(f.jakeQuestions || []).length}</b><span>questions for Jake</span></div>
    </div>
    <div class="ep2-sum-rewards">
      <div class="ep2-rw"><div class="ep1-eyebrow">📍 New places</div><b>Moonlight Diner</b><small>Palm Court Hotel · Room 308</small></div>
      <div class="ep2-rw"><div class="ep1-eyebrow">👥 New people</div><b>${people.map(p => esc(p.name.split(' ')[0])).join(', ')}</b><small>See them in People</small></div>
      <div class="ep2-rw"><div class="ep1-eyebrow">🎒 Backpack</div><b>${EP2_ITEMS.map(n => (E.api.itemInfo(n) || {}).icon || '🎒').join(' ')}</b><small>${EP2_ITEMS.map(esc).join(' · ')}</small></div>
    </div>
    <div class="ep1-sum-row">
      <div class="ep1-sum-ach">${ach.map(a => `<div class="ep1-ach ${a.done ? 'on' : ''}"><span aria-hidden="true">${a.icon}</span>${esc(a.name)}</div>`).join('')}</div>
      <div class="ep1-sum-mem"><div class="ep1-polaroid"><div class="ep1-polaroid-img ep2-mem-img" style="background-image:url('${MEMORY_IMG}')"></div><div class="ep1-polaroid-cap">First Night in LA 🌙</div></div><small>New memory in Your Story</small></div>
      <div class="ep1-sum-next"><div class="ep1-eyebrow">${ep3 ? '🔓 Unlocked' : '🎬 Coming soon'}</div><b>Episode 3 — A New Home 🏡</b><small>Tomorrow, you'll finally meet the Millers. But who sent that message?</small></div>
    </div>
    <div class="ep1-sum-btns">
      <button type="button" class="ep1-btn ep1-btn-ghost" data-sum="replay">↺ Replay Episode</button>
      <button type="button" class="ep1-btn ep1-btn-ghost" data-sum="story">📸 View Your Story</button>
      <button type="button" class="ep1-btn ep1-btn-ghost" data-sum="map">🗺️ Open Map</button>
      <button type="button" class="ep1-btn" data-sum="ep3" ${ep3 ? '' : 'disabled aria-disabled="true" title="Episode 3 is coming soon"'}>${ep3 ? '🏡 Continue to Episode 3' : '🔒 Episode 3 — coming soon'}</button>
      <button type="button" class="ep1-next" data-sum="room" data-primary>Back to Course ▸</button>
    </div></div>`;
  EP.cine.onclick = e => {
    const b = e.target.closest('[data-sum]'); if(!b || b.disabled) return;
    const a = b.dataset.sum;
    if(a === 'room') close();
    if(a === 'story') close({ then: () => window.openModal && window.openModal('memories') });
    if(a === 'map') close({ then: () => window.openModal && window.openModal('map') });
    if(a === 'replay') confirmBox('Replay Episode 2?', 'Your rewards, phrases and messages stay. You start again from Scene 1.', () => { EP.cine.onclick = null; restartEpisode(); });
    if(a === 'ep3' && ep3){ EP.cine.onclick = null; E.open('ep3'); }
  };
  EP.cine.querySelector('[data-sum="room"]').focus({ preventScroll:true });
  if(firstTime) setTimeout(() => toast('🌙', 'Achievement unlocked', 'Night Owl'), 500);
}

/* =========================================================================
   RESET — what "Reset Episode 2" removes from a saved progress snapshot.
   Removed: Episode 2 state, its phrases, items, achievements, the “First
   Night in LA” memory, the diner on the map, Daniel / Sophie / Jake, the
   Rachel, Jake and unknown-number chats, and Episode 2's messages in Mia's
   chat. Kept: the journal, everything from Episode 1.
   ========================================================================= */
function clearEp2(snap){
  snap = snap || {};
  const story = (snap.story && typeof snap.story === 'object') ? snap.story : { v:1, episodes:{}, world:{} };
  story.episodes = Object.assign({}, story.episodes); delete story.episodes.ep2;
  const ep1Done = !!(story.episodes.ep1 && story.episodes.ep1.completed);
  const w = story.world = Object.assign({}, story.world);
  if(Array.isArray(w.phrases)) w.phrases = w.phrases.filter(id => !OWN_PHRASES.includes(id));
  if(Array.isArray(w.items)) w.items = w.items.filter(n => !EP2_ITEMS.includes(n) && n !== 'Booking confirmation');
  if(w.ach){ w.ach = Object.assign({}, w.ach); ['first-order', 'night-owl', 'friend'].forEach(k => delete w.ach[k]); }
  if(Array.isArray(w.memories)) w.memories = w.memories.filter(x => x !== 'm1');
  if(w.locations){
    w.locations = Object.assign({}, w.locations); delete w.locations.diner;
    if(w.locations.hotel && w.locations.hotel.note === HOTEL_EP2_NOTE) w.locations.hotel = Object.assign({}, w.locations.hotel, { note: HOTEL_EP1_NOTE });
  }
  if(Array.isArray(w.people)) w.people = w.people.filter(x => !EP2_PEOPLE.includes(x));
  if(w.story){ w.story = Object.assign({}, w.story); delete w.story['new-home']; if(ep1Done) w.story['first-night'] = 'current'; else delete w.story['first-night']; }
  if(Array.isArray(w.threads)) w.threads = w.threads.filter(x => !['rachel', 'unknown', 'jake'].includes(x));
  snap.chat = Object.assign({}, snap.chat);
  ['rachel', 'unknown', 'jake'].forEach(k => delete snap.chat[k]);
  if(Array.isArray(snap.chat.mia)) snap.chat.mia = snap.chat.mia.filter(m => !(m && typeof m.id === 'string' && m.id.indexOf('e2') === 0));
  snap.story = story;
  return snap;
}

/* =========================================================================
   REGISTER
   ========================================================================= */
const MEMORY_IMG = BASE + 'img/memory-first-night.webp';
E.register({
  id:EP_ID, n:2, title:'First Night in LA', icon:'🌙', label:'Season 1 · Episode 2', storyId:'first-night', dayLabel:'Day 1 · Night',
  tagline:'One city. One night. A thousand possibilities.',
  card(){ return { eyebrow:'New · Episode 2', title:'First Night in LA', desc:'One city. One night. A thousand possibilities.', cta:'Start', icon:'🌙' }; },
  teaser:{ storyId:'new-home', title:'A New Home', icon:'🏡', short:'Episode 3 is on its way…',
           html:`<div class="ep1-ep2"><div class="ep1-eyebrow">🎬 Coming soon · Episode 3</div><h2>🏡 A New Home</h2>
             <p>Tomorrow at 11 AM, David Miller picks you up at the hotel. You'll finally meet the Millers… and maybe find out who sent that message at 11:17 PM.</p>
             <p class="ep1-mini">Episode 3 is being filmed right now. 🎬 It will appear here as soon as it's ready.</p></div>` },
  scenes: SCENES, phrases: PHRASES, items: ITEMS, speakers: SPEAKERS, startItems:['Booking confirmation'],
  achievements: {
    'first-order': { icon:'🍔', name:'First Order', total:1 },
    'night-owl':   { icon:'🌙', name:'Night Owl', total:1 },
    'friend':      { icon:'🤝', name:'New Friend', total:1 }
  },
  people: {
    daniel:     { id:'daniel', name:'Daniel Brooks', role:'Receptionist · Palm Court Hotel', color:'#5AB6F9', after:'chris',
                  bio:"24. Friendly, helpful, a little sarcastic. Fixed your booking, your room and your Wi-Fi — all in one night.", catch:"“You're not the first person to have a problem on their first night in LA.”" },
    'sophie-m': { id:'sophie-m', name:'Sophie Martinez', role:'Waitress · Moonlight Diner', color:'#ff8fb1', after:'daniel',
                  bio:"32. Energetic, funny, talks to everyone like an old friend. Knows exactly what a tired newcomer needs.", catch:"“Take your time, hon.”" },
    jake:       { id:'jake', name:'Jake Carter', role:'Local teen · basketball & music', color:'#6DBB75',
                  bio:"16. Funny, curious, confident — and he seems to know something about the Millers. Plays basketball at Pan Pacific Park.", catch:"“Let's just say LA is smaller than you think.”" }
  },
  threads: {
    rachel:  { id:'rachel', name:'Rachel Miller', color:'#F3E5C8', dark:true, sub:'Host family 🏡', icon:'🏡' },
    jake:    { id:'jake', name:'Jake', color:'#6DBB75', sub:'online', online:true },
    unknown: { id:'unknown', name:'+1 (323) 555-0147', color:'#3a4150', icon:'❔', sub:'Unknown number' }
  },
  /* x / y in % of the Map of LA picture — just around the corner from the hotel pin */
  locations: [ { id:'diner', name:'Moonlight Diner', icon:'🍔', x:49.6, y:47.2, drawn:false, status:'locked', note:'Locked — keep the story going.' } ],
  photoBase: PHOTO_BASE, photos: USE_PHOTOS ? PHOTOS : {}, photoExtras: USE_PHOTOS ? PHOTO_EXTRAS : {}, photoLayers: PHOTO_LAYERS,
  avatars: AVATARS, art: sceneArt,
  hideHotspots:['lock','wifi','keycard','callstart','callend','talk','hood','menu','meal','jakeq','voicenote','selffix'],
  soundDesc:'Hotel, street and diner ambience, phone sounds',
  render: RENDER,
  onNode(sc, nodeId, node){ if(sc.id === 's3' && !['callstart', 'callend'].includes(node.type)) ensureCall(); },
  onRegister(){
    if(typeof ASSETS === 'object') ASSETS.ep2FirstNight = MEMORY_IMG;
    const m = DATA.memories.find(x => x.id === 'm1');
    if(m){ m.imgKey = 'ep2FirstNight'; m.cap = 'First Night in LA'; m.desc = "Your first evening in LA was full of surprises — a hotel mix-up, a late-night dinner, a new friend, and one very strange message."; }
    const fn = DATA.story.find(x => x.id === 'first-night'); if(fn){ fn.label = 'First Night'; fn.img = BASE + 'img/cover.webp'; }
    keepImage(Object.assign(new Image(), { src: BASE + 'img/cover.webp' }));
  },
  clearOwn: clearEp2
});

})();
