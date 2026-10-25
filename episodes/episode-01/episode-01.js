/* =========================================================================
   LIFE IN LA — Season 1 · Episode 1: "ARRIVAL"
   -------------------------------------------------------------------------
   Story engine, episode content, mini-games and the final mission.

   Loaded by index.html right after its main <script>, so it can use that
   script's globals: DATA, ASSETS, saveProgress(), render*(), openModal(),
   closeModal(), speak(), faceSVG(), FLAGS.

   Architecture:  Episode → Scene → Story node → player action → state
   update → next node. Every scene and node has a stable id ("s3", "pass")
   so progress can be saved and resumed exactly.

   Exposes window.LilaStory, which index.html calls to save/load progress,
   draw the mission note and open the episode.
   ========================================================================= */
(function(){
'use strict';

/* ---------- small helpers ---------- */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
const wordCount = s => (String(s || '').trim().match(/[A-Za-zÀ-ɏЀ-ӿ0-9'’-]+/g) || []).length;
const isReduced = () => document.body.classList.contains('reduced-motion') ||
  (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const wait = ms => new Promise(r => setTimeout(r, ms));
const fmtTime = sec => `${Math.floor(sec/60)}:${String(Math.floor(sec%60)).padStart(2,'0')}`;

/* ---------- player settings (per device) ---------- */
const SET_KEY = 'lifeInLA:episode-settings';
const SET = Object.assign(
  { subs:true, challenge:false, voice:true, sound:true, volume:0.55, slow:false, ua:false },
  (() => { try { return JSON.parse(localStorage.getItem(SET_KEY) || '{}'); } catch(e){ return {}; } })()
);
function saveSettings(){ try { localStorage.setItem(SET_KEY, JSON.stringify(SET)); } catch(e){} }

/* =========================================================================
   LEARNING CONTENT — phrases and items
   ========================================================================= */
const PHRASES = {
  'here-you-go':     { en:"Here you go.", match:"Here you go", ua:"Ось, тримайте.",
                       simple:"What you say when you hand something to someone.",
                       ex:"“May I see your passport, please?” “Of course. Here you go.”", tag:"polite" },
  'take-your-time':  { en:"Take your time.", match:"Take your time", ua:"Не поспішайте.",
                       simple:"A kind way to say: you don't need to hurry.",
                       ex:"“Sorry, one second…” “No problem. Take your time.”", tag:"polite" },
  'exchange':        { en:"I'm here on a student exchange program.", match:"student exchange program", ua:"Я тут за програмою обміну.",
                       simple:"How you explain why you came: you're an exchange student.",
                       ex:"“What's the purpose of your visit?” “I'm here on a student exchange program.”", tag:"formal" },
  'host-family':     { en:"I'm staying with a host family.", match:"staying with a host family", ua:"Я житиму в приймаючій сім'ї.",
                       simple:"You will live with a local family while you study.",
                       ex:"“Where will you be staying?” “I'm staying with a host family.”", tag:"neutral" },
  'little-nervous':  { en:"I'm a little nervous.", match:"a little nervous", ua:"Я трохи нервую.",
                       simple:"You feel a bit worried before something new.",
                       ex:"“Are you okay?” “Yeah, I'm just a little nervous.”", tag:"neutral" },
  'could-you-help':  { en:"Could you help me, please?", match:"could you help me", ua:"Чи могли б ви мені допомогти?",
                       simple:"A polite way to ask someone for help.",
                       ex:"“Excuse me, could you help me find my suitcase?”", tag:"polite" },
  'cant-find':       { en:"I can't find my suitcase.", match:"I can't find my suitcase", ua:"Я не можу знайти свою валізу.",
                       simple:"You are looking for your suitcase, but it isn't there.",
                       ex:"“Hi! I can't find my suitcase. Can you help me?”", tag:"neutral" },
  'around-corner':   { en:"It's just around the corner.", match:"just around the corner", ua:"Це зовсім поруч, за рогом.",
                       simple:"It's very close — you just turn once and you're there.",
                       ex:"“Where's Carousel 6?” “It's just around the corner.”", tag:"informal" },
  'how-was-flight':  { en:"How was your flight?", match:"How was (?:your|the) flight", ua:"Як пройшов твій переліт?",
                       simple:"A friendly question people ask when you arrive.",
                       ex:"“Welcome! How was your flight?” “Long, but okay!”", tag:"informal" },
  'change-of-plans': { en:"There's been a change of plans.", match:"change of plans", ua:"Плани трохи змінилися.",
                       simple:"Something that was planned is now different.",
                       ex:"“Oh, by the way… there's been a small change of plans.”", tag:"neutral" },
  'one-second':      { en:"One second, please.", match:"One second, please", ua:"Секундочку, будь ласка.",
                       simple:"Asking someone to wait a moment.",
                       ex:"“Do you have their address?” “Yes. One second, please.”", tag:"polite" },
  'directions':      { en:"Could you tell me how to get to…?", match:"could you tell me how to get to", ua:"Не підкажете, як дістатися до…?",
                       simple:"A polite way to ask for directions.",
                       ex:"“Excuse me, could you tell me how to get to Door 5?”", tag:"polite" },
  'go-straight':     { en:"Go straight, then turn right.", match:"Go straight", ua:"Ідіть прямо, потім поверніть праворуч.",
                       simple:"Simple directions: first straight ahead, then to the right.",
                       ex:"“Go straight, turn right, and follow the signs.”", tag:"directions" },
  'follow-signs':    { en:"Follow the signs.", match:"follow the signs", ua:"Ідіть за вказівниками.",
                       simple:"Walk the way the signs show you.",
                       ex:"“Follow the signs for Ground Transportation.”", tag:"directions" },
  'nice-to-meet':    { en:"Nice to meet you!", match:"Nice to meet you", ua:"Приємно познайомитися!",
                       simple:"What you say when you meet someone for the first time.",
                       ex:"“I'm Chris.” “Hi! Nice to meet you!”", tag:"neutral" },
  'didnt-expect':    { en:"I didn't expect that.", match:"I didn't expect that", ua:"Цього я не чекав(-ла).",
                       simple:"You're surprised — this wasn't in your plan.",
                       ex:"“You're staying at a hotel tonight.” “Oh! I didn't expect that.”", tag:"neutral" }
};
const REQUIRED_PHRASES = ['here-you-go','take-your-time','exchange','host-family','little-nervous',
  'could-you-help','cant-find','around-corner','how-was-flight','change-of-plans'];

/* Inventory catalogue. DATA.items holds the names (strings) — kept that way
   so the homepage backpack stays compatible; this adds icons + descriptions. */
const ITEMS = {
  'Passport':                  { icon:'🛂', desc:"Your Ukrainian passport with your student visa inside. Keep it close!" },
  'LAX boarding pass':         { icon:'🎫', desc:"Flight EU 207 → Los Angeles (LAX). Seat 23A — window, of course." },
  'Exchange program folder':   { icon:'📁', desc:"Program papers: welcome letter, emergency number, and your host family — Rachel & David Miller." },
  'Miller House address card': { icon:'🏡', desc:"The Millers · 1428 Jacaranda Lane, Los Angeles, CA. Your future home." },
  'Suitcase':                  { icon:'🧳', desc:"Medium-sized, black, with a bright orange ribbon on the handle. Found at Carousel 6!" }
};
const START_ITEMS = ['LAX boarding pass','Passport','Exchange program folder','Miller House address card'];

/* Characters who speak in this episode. `voice` tunes browser text-to-speech. */
const SPEAKERS = {
  pilot:       { name:'Pilot', role:'On-board announcement', color:'#5AB6F9', icon:'📢', voice:{ g:'m', pitch:0.85, rate:0.92, idx:0 } },
  airport:     { name:'LAX announcement', role:'Terminal speakers', color:'#5AB6F9', icon:'📢', voice:{ g:'f', pitch:1.0, rate:0.92, idx:1 } },
  you:         { name:'You', color:'#FF8A3D', icon:'🙂', voice:{ g:'any', pitch:1.05, rate:0.95, idx:2 } },
  officer:     { name:'Officer', role:'Passport control', color:'#3E7C8C', voice:{ g:'f', pitch:0.95, rate:0.9, idx:3 } },
  staff:       { name:'Baggage agent', role:'Baggage Service', color:'#6DBB75', voice:{ g:'f', pitch:1.1, rate:0.95, idx:0 } },
  guide:       { name:'Airport employee', role:'Terminal staff', color:'#9B8ECF', voice:{ g:'m', pitch:1.0, rate:0.95, idx:2 } },
  chris:       { name:'Chris', role:'Program driver', color:'#FFB199', dark:true, voice:{ g:'m', pitch:0.95, rate:0.98, idx:0 } },
  mia:         { name:'Mia', role:'Best friend · Ukraine', color:'#5AB6F9', voice:{ g:'f', pitch:1.22, rate:1.05, idx:1 } },
  coordinator: { name:'Exchange Program', role:'Program coordinator', color:'#6DBB75', voice:{ g:'f', pitch:1.0, rate:0.95, idx:2 } }
};

/* Suitcases for the two baggage mini-games. */
const DECOYS = [
  { size:'L', color:'black', feature:null,      img:'suitcase-c4-1', label:'Large black suitcase',
    why:"It's black — but it's large, and there's no ribbon." },
  { size:'M', color:'blue',  feature:null,      img:'suitcase-c4-2', label:'Medium blue suitcase',
    why:"Right size… but it's blue." },
  { size:'M', color:'red',   feature:'tag',     fcolor:'#ffd23f', img:'suitcase-c4-3', label:'Red suitcase with a yellow tag',
    why:"Red, with a yellow tag. Not yours." },
  { size:'S', color:'black', feature:'sticker', fcolor:'#FF8A3D', img:'suitcase-c4-4', label:'Small black suitcase with an orange sticker',
    why:"Black and orange… but it's small, and that's a sticker, not a ribbon." },
  { size:'M', color:'grey',  feature:'ribbon',  fcolor:'#FF8A3D', img:'suitcase-c4-5', label:'Grey suitcase with an orange ribbon',
    why:"An orange ribbon! But the suitcase is grey." }
];
const CAROUSEL6 = [
  { size:'M', color:'black', feature:'tag',    fcolor:'#FF8A3D', img:'suitcase-c6-1', label:'Medium black suitcase with an orange tag',
    why:"Black, medium… but that's an orange tag, not a ribbon." },
  { size:'L', color:'black', feature:'ribbon', fcolor:'#FF8A3D', img:'suitcase-c6-2', label:'Large black suitcase with an orange ribbon',
    why:"Black, orange ribbon… but it's large. Yours is medium-sized." },
  { size:'M', color:'black', feature:'ribbon', fcolor:'#FF8A3D', img:'suitcase-mine', label:'Medium black suitcase with an orange ribbon', mine:true },
  { size:'M', color:'grey',  feature:'ribbon', fcolor:'#FF8A3D', img:'suitcase-c6-4', label:'Medium grey suitcase with an orange ribbon',
    why:"Medium, orange ribbon… but it's grey." },
  { size:'M', color:'black', feature:null,     img:'suitcase-c6-5', label:'Medium black suitcase',
    why:"Black and medium — but no ribbon on the handle." }
];
const MY_SUITCASE = { size:'M', color:'black', feature:'ribbon', fcolor:'#FF8A3D', img:'suitcase-mine' };

/* =========================================================================
   STORY — 8 scenes. Node types are rendered by the engine (part B/C).
   A node continues to the next key in the object unless it says `next`.
   ========================================================================= */
const say   = (who, text, ua, more) => Object.assign({ type:'say', who, text, ua }, more || {});
const think = (text, ua, more) => Object.assign({ type:'think', text, ua }, more || {});
const narr  = (text, ua, more) => Object.assign({ type:'narr', text, ua }, more || {});

const SCENES = [

/* ---------------------------------------------------------------- SCENE 1 */
{ id:'s1', n:1, title:'Welcome to Los Angeles', emoji:'✈️', objective:'Land in Los Angeles',
  bg:'cabin', ambience:'cabin', clock:'5:40 PM',
  hotspots:[
    { id:'s1-window', x:30, y:42, ph:[34, 30], icon:'🪟', label:'Look out of the window', bgs:['window'],
      text:"Palm trees… from up here they look like tiny green stars.", ua:"Пальми… звідси вони схожі на крихітні зелені зірочки." },
    { id:'s1-pass', x:74, y:62, ph:[71, 63], icon:'🎫', label:'Check your boarding pass', item:'LAX boarding pass', bgs:['cabin'] }
  ],
  nodes:{
    open:  { type:'cards', cards:['LOS ANGELES, CALIFORNIA','5:40 PM','DAY 1'],
             title:{ eyebrow:'SEASON 1 · EPISODE 1', big:'ARRIVAL', sub:'Your new life starts here.' } },
    chime: { type:'fx', sfx:'chime', wait:700 },
    pilot: say('pilot', "Ladies and gentlemen, welcome to Los Angeles! The local time is 5:40 PM. We hope you enjoyed your flight.",
               "Пані та панове, ласкаво просимо до Лос-Анджелеса! Місцевий час — 17:40. Сподіваємося, вам сподобався політ."),
    t1:    think("Okay… I'm really here.", "Окей… я справді тут.", { bg:'window', cam:'push' }),
    t2:    think("A new city.", "Нове місто."),
    t3:    think("A new family.", "Нова родина."),
    t4:    think("A completely new life.", "Цілком нове життя."),
    feel:  { type:'choice', prompt:"How are you feeling right now?", ua:"Як ти почуваєшся просто зараз?", key:'arrivalFeeling',
             options:[
               { text:"I'm so excited!", ua:"Я в захваті!", emoji:'🤩', value:'excited', next:'r_ex' },
               { text:"I'm a little nervous.", ua:"Я трохи нервую.", emoji:'😬', value:'nervous', next:'r_nv', vocab:'little-nervous' },
               { text:"I'm excited and nervous at the same time.", ua:"Я водночас у захваті й нервую.", emoji:'🥹', value:'mixed', next:'r_mx' } ] },
    r_ex:  think("This is going to be amazing. I can't wait to explore LA!", "Це буде неймовірно. Не можу дочекатися, щоб досліджувати Лос-Анджелес!", { next:'speak' }),
    r_nv:  think("What if I don't understand someone? Okay… I've got this.", "А раптом я когось не зрозумію? Так… я впораюся.", { next:'speak' }),
    r_mx:  think("I'm happy to be here, but I already miss home a little.", "Я радію, що я тут, але вже трохи сумую за домом.", { next:'speak' }),
    speak: { type:'speak', key:'s1_newlife', optional:true, skipLabel:'Skip for now',
             prompt:"Look outside. What do you think about your new life? Say one or two sentences.",
             ua:"Подивись у вікно. Що ти думаєш про своє нове життя? Скажи одне-два речення.",
             starters:["I feel…","I can't wait to…","I'm worried about…","I hope…"],
             model:"I feel excited, but I'm a little nervous. I can't wait to see the ocean and meet my host family." },
    belt:  think("The seatbelt sign goes off. Everyone stands up at once.", "Табло «Пристебніть паски» гасне. Усі одночасно підводяться.", { bg:'cabin', cam:'wide' }),
    go:    think("Okay. Passport, phone, backpack. Let's go.", "Так. Паспорт, телефон, рюкзак. Вперед."),
    end:   { type:'end', next:'s2' }
  } },

/* ---------------------------------------------------------------- SCENE 2 */
{ id:'s2', n:2, title:'A Message from Home', emoji:'📱', objective:'Answer Mia',
  bg:'corridor', ambience:'terminal', clock:'5:52 PM',
  hotspots:[
    { id:'s2-sign', x:62, y:30, icon:'🪧', label:'Read the sign',
      text:"“Arrivals → Passport Control.” Okay — just follow the signs.", ua:"«Прибуття → Паспортний контроль». Гаразд — просто йду за вказівниками." }
  ],
  nodes:{
    walk:  think("The terminal is huge. Glass walls, palm trees outside, a hundred languages at once.",
                 "Термінал величезний. Скляні стіни, пальми надворі, сотня мов одночасно.", { cam:'drift' }),
    ann:   say('airport', "Welcome to Los Angeles International Airport. All arriving passengers, please follow the signs to Passport Control.",
               "Ласкаво просимо до Міжнародного аеропорту Лос-Анджелеса. Усіх пасажирів, які прибули, просимо йти за вказівниками до паспортного контролю.",
               { sfx:'chime' }),
    buzz:  { type:'notify', thread:'mia', text:"OMG!!! DID YOU LAND?! 😭✈️" },
    chat:  { type:'phone', thread:'mia', steps:[
      { in:"OMG!!! DID YOU LAND?! 😭✈️", id:'e1s2m1' },
      { in:"I can't believe you're actually in LA!", id:'e1s2m2' },
      { in:"How was the flight?", id:'e1s2m3', vocab:'how-was-flight' },
      { reply:{ id:'e1s2r1', options:[
          { text:"Just landed! It was really long, but I'm okay! 😅" },
          { text:"Just landed!! 12 hours… but I survived 😂" } ] } },
      { in:"Are you nervous? Be honest 😂", id:'e1s2m4' },
      { reply:{ id:'e1s2r2', key:'nervousAnswer', own:true, orderBy:'arrivalFeeling', options:[
          { text:"A little, yeah!", value:'nervous' },
          { text:"Not really, I'm just excited!", value:'excited' },
          { text:"Honestly? Both!", value:'mixed' } ] } },
      { id:'e1s2m5', inFn: f => ({
          nervous:"Aww 🥺 Totally normal. Your English is SO good, you'll be fine!",
          excited:"THAT'S my bestie 😎🌴",
          mixed:"Same energy as me before every exam 😂 You've got this!",
          own:"Haha okay okay, I love that 😄" })[f.nervousAnswer || 'own'] },
      { voice:{ id:'e1s2v1', dur:'0:09',
          text:"Okay, listen. Promise me you'll tell me EVERYTHING. Your first American conversation, your new house, your new friends… EVERYTHING!",
          ua:"Окей, слухай. Пообіцяй, що розкажеш мені ВСЕ. Свою першу розмову з американцем, свій новий дім, нових друзів… ВСЕ!" },
        question:{ key:'s2_voice', q:"What does Mia want you to do?", qua:"Чого Мія хоче від тебе?",
          options:[ { text:"Tell her about your experiences.", correct:true }, { text:"Book another flight." }, { text:"Call her parents." } ],
          hints:[ "Listen again — which word does Mia say twice, really loudly?",
                  "She says “tell me EVERYTHING” — your first conversation, your new house, your new friends.",
                  "Підказка: Мія хоче, щоб ти розповідав(-ла) їй про все, що з тобою відбувається." ] } },
      { write:{ id:'e1s2w1', key:'s2_message', minWords:6,
          prompt:"Send Mia a short message about your flight and your feelings.",
          ua:"Надішли Мії коротке повідомлення про переліт і свої почуття (2–3 речення).",
          starters:["The flight was…","I'm tired / excited / a little nervous…","I can't believe…"],
          model:"The flight was really long, but it was okay. I'm tired and a little nervous. I can't believe I'm in LA!" } },
      { id:'e1s2m6', inFn: f => f.nervousAnswer === 'nervous'
          ? "Real talk: you sound way more confident than you think 💙"
          : "AHHH I'm so happy for you 😭💙" },
      { in:"Go get that passport stamp! Text me after!!", id:'e1s2m7' },
      { end:'Back to the airport' } ] },
    after: think("Passport control. Here we go.", "Паспортний контроль. Поїхали."),
    end:   { type:'end', next:'s3' }
  } },

/* ---------------------------------------------------------------- SCENE 3 */
{ id:'s3', n:3, title:'Passport Control', emoji:'🛂', objective:'Pass passport control',
  bg:'passport', ambience:'hall', clock:'6:05 PM',
  hotspots:[
    { id:'s3-sign', x:90, y:22, ph:[73.5, 40], icon:'🪧', label:'Read the booth sign',
      text:"“Please have your passport ready.” Ready-ish.", ua:"«Будь ласка, підготуйте паспорт». Ну… майже готово." }
  ],
  nodes:{
    o1:      say('officer', "Good evening. Welcome to Los Angeles! May I see your passport, please?",
                 "Доброго вечора. Ласкаво просимо до Лос-Анджелеса! Можна ваш паспорт, будь ласка?", { cam:'push' }),
    dig:     think("Passport, passport… where did I put it?", "Паспорт, паспорт… куди ж я його поклав(-ла)?"),
    tyt:     say('officer', "No problem. Take your time.", "Без проблем. Не поспішайте.", { vocab:['take-your-time'] }),
    pass:    { type:'inventory', who:'officer', want:'Passport', key:'s3_passport',
               prompt:"Find your passport in your backpack.", ua:"Знайди паспорт у рюкзаку й передай офіцеру.",
               wrong:{ 'LAX boarding pass':["That's your boarding pass. I'll need your passport, please.","Це ваш посадковий талон. Мені потрібен ваш паспорт, будь ласка."],
                       'Exchange program folder':["Thank you — but I'll need your passport first, please.","Дякую — але спершу мені потрібен паспорт, будь ласка."],
                       'Miller House address card':["I'll need your passport, please.","Мені потрібен ваш паспорт, будь ласка."] } },
    here:    say('you', "Of course. Here you go.", "Звісно. Ось, тримайте.", { vocab:['here-you-go'] }),
    purpose: { type:'quiz', who:'officer', key:'s3_purpose',
               line:"Thank you. What's the purpose of your visit?", lineUa:"Дякую. Яка мета вашого візиту?",
               prompt:"Answer the officer.", ua:"Відповідай офіцеру.",
               options:[
                 { text:"I'm here on a student exchange program.", ua:"Я тут за програмою студентського обміну.", correct:true, vocab:'exchange' },
                 { text:"My suitcase is black.", react:["Your suitcase? I'm asking why you're visiting the United States.","Ваша валіза? Я питаю, навіщо ви приїхали до Сполучених Штатів."],
                   tip:"“Purpose” = the reason. The officer asks WHY you came — not about your things." },
                 { text:"I'm feeling a little tired.", react:["I understand — it's a long flight. But what's the reason for your trip?","Розумію — довгий переліт. Але яка причина вашої поїздки?"],
                   tip:"The officer wants the reason for your trip, not how you feel." } ],
               hints:[ "Think: WHY did you come to the U.S.?", "You came to study — as an exchange student.",
                       "Правильна відповідь пояснює, що ти учасник(-ця) програми обміну." ] },
    where:   { type:'listen', who:'officer', key:'s3_where',
               audio:"Great. Where will you be staying?", ua:"Чудово. Де ви зупинитеся?",
               question:"What does the officer want to know?", qua:"Що хоче знати офіцер?",
               options:[ { text:"Where you will live in the U.S.", correct:true }, { text:"How long your flight was." }, { text:"What you will study." } ],
               hints:[ "Listen for the word “staying”.", "“Where will you be staying?” = Where will you live while you're here?",
                       "Офіцер питає, де ти житимеш у США." ] },
    stay:    { type:'choice', prompt:"Answer the officer:", ua:"Відповідай офіцеру:", speak:true, options:[
               { text:"I'm staying with a host family. The Millers.", ua:"Я житиму в приймаючій сім'ї. У Міллерів.", vocab:'host-family' },
               { text:"With a host family — the Millers.", ua:"У приймаючій сім'ї — у Міллерів." } ] },
    addr_q:  say('officer', "Do you have their address?", "У вас є їхня адреса?"),
    one:     say('you', "Yes. One second, please.", "Так. Секундочку, будь ласка.", { vocab:['one-second'] }),
    addr:    { type:'inventory', who:'officer', want:'Miller House address card', key:'s3_address',
               prompt:"Show the officer the Millers' address.", ua:"Покажи офіцеру адресу Міллерів.",
               wrong:{ 'LAX boarding pass':["That's your boarding pass. Do you have the family's address?","Це ваш посадковий талон. У вас є адреса родини?"],
                       'Passport':["I already have your passport. I need the address, please.","Ваш паспорт у мене вже є. Мені потрібна адреса, будь ласка."],
                       'Exchange program folder':["Is there an address card in there? That would be quicker.","А там є картка з адресою? Так буде швидше."] } },
    hereis:  say('you', "Here it is.", "Ось вона."),
    why_q:   say('officer', "Thank you. One last question — in your own words: why are you visiting the United States?",
                 "Дякую. Останнє запитання — своїми словами: чому ви відвідуєте Сполучені Штати?"),
    why:     { type:'speak', key:'s3_why', optional:true, skipLabel:'Use the model answer', skipSaysModel:true,
               prompt:"Why are you visiting the United States? Answer the officer.",
               ua:"Чому ти приїхав(-ла) до США? Відповідай офіцеру своїми словами.",
               starters:["I'm here for…","I'll study…","I'll stay with…"],
               model:"I'm here for a student exchange program. I'll study in Los Angeles and stay with an American host family.",
               after:{ who:'officer', text:"Thank you.", ua:"Дякую." } },
    stamp:   say('officer', "Everything looks good. Enjoy your stay!", "Усе гаразд. Гарного перебування!", { sfx:'stamp' }),
    bye:     { type:'choice', prompt:"Say goodbye:", ua:"Попрощайся:", speak:true, options:[
               { text:"Thank you! Have a nice day!", ua:"Дякую! Гарного дня!" },
               { text:"Thanks so much! Have a good evening!", ua:"Щиро дякую! Гарного вечора!" } ] },
    win:     { type:'reward', banner:'FIRST REAL CONVERSATION COMPLETED', sub:'You just passed passport control — in English.',
               achievement:'first-talk', phrases:['here-you-go','take-your-time','exchange','host-family','one-second'] },
    end:     { type:'end', next:'s4' }
  } },

/* ---------------------------------------------------------------- SCENE 4 */
{ id:'s4', n:4, title:'The Missing Suitcase', emoji:'🧳', objective:'Find your suitcase',
  bg:'baggage', ambience:'carousel', clock:'6:24 PM',
  hotspots:[
    { id:'s4-sign', x:66, y:20, ph:[80, 29], icon:'🪧', label:'Read the carousel sign',
      text:"“Baggage Claim 4 · Flight EU 207 from Warsaw.” That's my flight.", ua:"«Видача багажу 4 · Рейс EU 207 з Варшави». Це мій рейс." }
  ],
  nodes:{
    wait:    think("Okay, just grab your bag and find the driver.", "Так, просто забираю валізу й шукаю водія."),
    belt:    { type:'carousel' },
    where:   think("Wait… where's my suitcase?", "Стоп… а де моя валіза?", { cam:'push' }),
    noway:   think("No way. Don't tell me I lost it already.", "Та ні. Тільки не кажіть, що я її вже загубив(-ла)."),
    decide:  { type:'choice', prompt:"What should you do?", ua:"Що робити?", key:'baggageRoute', options:[
               { text:"Wait a little longer.", ua:"Почекати ще трохи.", emoji:'⏳', value:'waited', next:'waited' },
               { text:"Check the baggage information screen.", ua:"Перевірити інформаційне табло багажу.", emoji:'🖥️', value:'screen', next:'screen' },
               { text:"Ask an airport employee for help.", ua:"Попросити працівника аеропорту про допомогу.", emoji:'🙋', value:'asked', next:'asked' } ] },
    waited:  think("Ten minutes later, the belt stops. Empty. Okay… Plan B: the Baggage Service desk.",
                   "Через десять хвилин стрічка зупиняється. Порожньо. Гаразд… план Б: стійка багажної служби.", { next:'mia_n' }),
    screen:  { type:'board', next:'screen_t' },
    screen_t:think("Some bags went to Carousel 6? I'd better ask at the desk to be sure.",
                   "Частину багажу перенесли на шосту стрічку? Краще перепитаю на стійці, щоб знати напевно.", { next:'mia_n' }),
    asked:   think("A worker points me to a desk with a big sign: BAGGAGE SERVICE. Okay — no time to waste.",
                   "Працівник показує на стійку з великою вивіскою: BAGGAGE SERVICE. Гаразд — не гаймо часу.", { next:'mia_n' }),
    mia_n:   { type:'notify', thread:'mia', text:"Status report?? 👀" },
    mia_c:   { type:'phone', thread:'mia', steps:[
      { in:"Status report?? 👀", id:'e1s4m0' },
      { in:"Don't tell me you've already lost something 😂", id:'e1s4m1' },
      { reply:{ id:'e1s4r1', key:'miaSuitcase', options:[
          { text:"My suitcase is literally missing 😭", value:'missing' },
          { text:"Not funny, Mia 😂", value:'notfunny' },
          { text:"I'm handling it. I think.", value:'handling' } ] } },
      { id:'e1s4m2', inFn: f => ({
          missing:"NOOO 😭 Okay okay, go find someone at the desk. Use your polite English!",
          notfunny:"It's a LITTLE funny 😂 Go ask for help, you've got this 💪",
          handling:"“I think” 😂 Okay, go handle it. I believe in you!" })[f.miaSuitcase] || "Go ask for help, you've got this 💪" },
      { end:'Go to Baggage Service' } ] },
    end:     { type:'end', next:'s5' }
  } },

/* ---------------------------------------------------------------- SCENE 5 */
{ id:'s5', n:5, title:'Can You Help Me?', emoji:'🙋', objective:'Get help at Baggage Service',
  bg:'desk', ambience:'hall', clock:'6:38 PM',
  hotspots:[
    { id:'s5-sign', x:72, y:14, ph:[76, 21], icon:'🪧', label:'Read the desk sign',
      text:"“Baggage Service — lost & delayed bags.” Exactly what I need.", ua:"«Багажна служба — загублений і затриманий багаж». Саме те, що треба." }
  ],
  nodes:{
    prep:    think("Okay. Breathe. What am I going to say?", "Так. Видих. Що я скажу?"),
    rehearse:{ type:'speak', key:'s5_rehearse', levels:true, optional:true, skipLabel:"I'm ready — let's go",
               prompt:"Your suitcase is missing. Explain the problem and ask for help.",
               ua:"Твоя валіза зникла. Поясни проблему й попроси про допомогу. (Це репетиція — тебе ніхто не чує 😉)",
               starters:["Excuse me…","I can't find…","Could you help me, please?","It's black and medium-sized."],
               model:"Excuse me, could you help me, please? I can't find my suitcase. It's black and medium-sized, with an orange ribbon on the handle." },
    greet:   say('staff', f => f.baggageRoute === 'asked' ? "Hi there! Good call coming straight to the desk. Can I help you?" : "Hi there! Can I help you?",
                 f => f.baggageRoute === 'asked' ? "Привіт! Правильно, що одразу прийшли до стійки. Чим можу допомогти?" : "Привіт! Чим можу допомогти?"),
    open:    { type:'quiz', key:'s5_opening', noLine:true, polite:true,
               prompt:"How do you start?", ua:"З чого почнеш?",
               options:[
                 { text:"Excuse me, could you help me, please?", ua:"Перепрошую, чи не могли б ви мені допомогти?", correct:true, value:'polite', next:'polite', vocab:'could-you-help' },
                 { text:"Hi! I can't find my suitcase.", ua:"Привіт! Я не можу знайти свою валізу.", correct:true, value:'neutral', next:'sorry', vocab:'cant-find' },
                 { text:"Give me my suitcase!", ua:"Дайте мені мою валізу!", who:'staff',
                   react:["Um… I'll do my best — but I don't know which suitcase is yours yet.","Ем… я постараюся, але я ще не знаю, яка валіза ваша."],
                   tip:'politeness' } ] },
    polite:  say('staff', "Of course! What's the problem?", "Звісно! Що сталося?"),
    polite2: say('you', "I can't find my suitcase.", "Я не можу знайти свою валізу.", { vocab:['cant-find'] }),
    sorry:   say('staff', "Oh, I'm sorry to hear that. Which flight were you on?", "Ой, мені шкода це чути. Яким рейсом ви летіли?"),
    flight:  { type:'choice', prompt:"Answer:", ua:"Відповідай:", key:'flightAnswer', options:[
               { text:"I just arrived from Europe.", ua:"Я щойно прилетів(-ла) з Європи.", value:'said', say:true, next:'scr' },
               { text:"Show your boarding pass", ua:"Показати посадковий талон", emoji:'🎫', value:'pass', next:'bp' } ] },
    bp:      say('you', "Here's my boarding pass — flight EU 207.", "Ось мій посадковий талон — рейс EU 207."),
    bp_ok:   say('staff', "Perfect, that helps a lot.", "Чудово, це дуже допомагає.", { next:'scr' }),
    scr:     { type:'branch', fn: f => f.baggageRoute === 'screen' ? 'scr_y' : 'desc_q' },
    scr_y:   say('you', "The screen said something about Carousel 6?", "На табло було щось про шосту стрічку?"),
    scr_y2:  say('staff', "Good eye! Let's make sure it's yours.", "Уважно! Давайте переконаємося, що це ваша."),
    desc_q:  say('staff', "Okay. Can you describe your suitcase?", "Добре. Можете описати вашу валізу?"),
    desc:    { type:'describe', key:'s5_describe' },
    desc_say:say('you', "It's a medium-sized black suitcase with an orange ribbon on the handle.",
                 "Це чорна валіза середнього розміру з помаранчевою стрічкою на ручці."),
    check:   say('staff', "Let me check…", "Зараз перевірю…", { sfx:'typing' }),
    c6:      { type:'listen', who:'staff', key:'s5_c6', visual:'carousels',
               audio:"Ah! Some bags from your flight are at Carousel 6.", ua:"О! Частина багажу з вашого рейсу — на шостій багажній стрічці.",
               question:"Where should you go?", qua:"Куди тобі йти?",
               options:[ { text:'Carousel 4' }, { text:'Carousel 5' }, { text:'Carousel 6', correct:true } ],
               hints:[ "Listen for the number at the end.", "It's the number after five. 😉",
                       "Працівниця сказала: Carousel 6 — шоста багажна стрічка." ] },
    really:  say('you', "Oh, really? Thank you so much!", "Справді? Щиро дякую!"),
    corner:  say('staff', "No problem! It's just around the corner.", "Нема за що! Це зовсім поруч, за рогом.", { vocab:['around-corner'] }),
    thanks:  say('you', "Thanks! Have a good evening!", "Дякую! Гарного вечора!"),
    go6:     think("Just around the corner… Carousel 6. Please, please, please.", "Зовсім поруч, за рогом… шоста стрічка. Ну будь ласка, будь ласка.", { bg:'carousel6' }),
    pick:    { type:'pick', key:'s5_pick' },
    mine:    think("That's mine! Black, medium-sized, orange ribbon. Hello, old friend. 😅", "Це моя! Чорна, середня, з помаранчевою стрічкою. Привіт, стара подруго. 😅"),
    win:     { type:'reward', banner:'PROBLEM SOLVED!', sub:'You found your suitcase — by asking for help in English.',
               achievement:'problem-solver', item:'Suitcase', phrases:['could-you-help','cant-find','around-corner'] },
    end:     { type:'end', next:'s6' }
  } },

/* ---------------------------------------------------------------- SCENE 6 */
{ id:'s6', n:6, title:'Where Is My Ride?', emoji:'🚘', objective:'Find Door 5',
  bg:'pickup', ambience:'outside', clock:'7:02 PM',
  hotspots:[
    { id:'s6-sign', x:68, y:24, ph:{ pickup:[81, 30], van:[73, 27] }, icon:'🪧', label:'Read the big sign',
      text:"“Ground Transportation · Doors 3–6.” Door 5 must be close.", ua:"«Наземний транспорт · виходи 3–6». Вихід 5 десь поруч." }
  ],
  nodes:{
    out:     think("Suitcase ✓. Passport ✓. Now… where's my ride?", "Валіза ✓. Паспорт ✓. А тепер… де мій водій?"),
    c_n:     { type:'notify', thread:'coordinator', text:"Your driver is waiting at the designated pickup area. Follow the signs for Ground Transportation. Look for Door 5." },
    c_chat:  { type:'phone', thread:'coordinator', steps:[
      { in:"Hi! This is your exchange program coordinator. Welcome to LA! 🌴", id:'e1s6c1' },
      { in:"Your driver is waiting at the designated pickup area. Follow the signs for Ground Transportation. Look for Door 5.", id:'e1s6c2', vocab:'follow-signs' },
      { reply:{ id:'e1s6r1', options:[ { text:"Thank you! I'm on my way." }, { text:"Thanks! Door 5 — got it." } ] } },
      { end:'Find Door 5' } ] },
    how:     { type:'choice', prompt:"How will you find Door 5?", ua:"Як ти знайдеш вихід 5?", key:'doorRoute', options:[
               { text:"Follow the signs myself.", ua:"Сам(-а) піду за вказівниками.", emoji:'🪧', value:'signs', next:'map' },
               { text:"Ask an airport employee.", ua:"Запитаю працівника аеропорту.", emoji:'🙋', value:'ask', next:'ask' } ] },
    ask:     { type:'speak', key:'s6_ask', optional:true, skipLabel:'Use the model question', skipSaysModel:true,
               prompt:"Ask someone how to get to Door 5.", ua:"Запитай когось, як дістатися до виходу 5 (Door 5).",
               starters:["Excuse me, could you tell me…","How do I get to…?"],
               model:"Excuse me, could you tell me how to get to Door 5?" },
    dir:     { type:'listen', who:'guide', key:'s6_dir', set:{ gotDirections:true },
               audio:"Sure! Go straight, turn right, and follow the signs for Ground Transportation. Door 5 is next to the coffee stand.",
               ua:"Звісно! Ідіть прямо, поверніть праворуч і йдіть за вказівниками «Ground Transportation». Вихід 5 — поруч із кавовим кіоском.",
               question:"What's the FIRST thing you should do?", qua:"Що треба зробити СПЕРШУ?",
               options:[ { text:'Go straight', correct:true }, { text:'Turn left' }, { text:'Turn right' } ],
               hints:[ "Listen to the very first words after “Sure!”.", "First: go straight. Then: turn right.",
                       "Спершу — прямо (go straight), потім — праворуч (turn right)." ] },
    thx:     say('you', "Thank you so much!", "Щиро дякую!"),
    map:     { type:'navmap', key:'s6_map' },
    explain: { type:'speak', key:'s6_explain', optional:true, skipLabel:'Skip for now',
               prompt:"Another student from your flight looks lost. Explain how to get from Baggage Claim to Door 5.",
               ua:"Інший учень з твого рейсу заблукав. Поясни, як дістатися від видачі багажу до виходу 5.",
               starters:["Go straight…","Turn right at…","Follow the signs for…","It's next to…"],
               model:"Go straight, turn right, and follow the signs for Ground Transportation. Door 5 is next to the coffee stand." },
    door5:   think("Door 5. The coffee stand. And a man holding a sign: LA EXCHANGE — WELCOME.",
                   "Вихід 5. Кавовий кіоск. І чоловік із табличкою: LA EXCHANGE — WELCOME.", { bg:'van' }),
    v_n:     { type:'notify', thread:'coordinator', text:"Your driver today is Chris 🙂 Silver minivan, plate ending in 7KQ. He has a sign: LA EXCHANGE — WELCOME." },
    v_chat:  { type:'phone', thread:'coordinator', steps:[
      { in:"Your driver today is Chris 🙂 Silver minivan, plate ending in 7KQ. He has a sign: LA EXCHANGE — WELCOME.", id:'e1s6c3' },
      { reply:{ id:'e1s6r2', options:[ { text:"I see him! Thank you!" }, { text:"Found him. Thanks so much!" } ] } },
      { end:'Go say hi' } ] },
    match:   think("Silver minivan ✓. Plate ends in 7KQ ✓. The sign ✓. It's him.", "Срібний мінівен ✓. Номер закінчується на 7KQ ✓. Табличка ✓. Це він."),
    chris1:  say('chris', "Hey! You must be our new exchange student. I'm Chris. Welcome to LA!",
                 "Привіт! Ти, мабуть, наш новий учасник програми обміну. Я Кріс. Ласкаво просимо до Лос-Анджелеса!", { meet:'chris' }),
    nice:    { type:'choice', prompt:"Say hello:", ua:"Привітайся:", speak:true, options:[
               { text:"Hi! Nice to meet you!", ua:"Привіт! Приємно познайомитися!", vocab:'nice-to-meet' },
               { text:"Hi, Chris! Nice to meet you!", ua:"Привіт, Крісе! Приємно познайомитися!", vocab:'nice-to-meet' } ] },
    bag:     say('chris', "Let me grab that suitcase for you. Hop in!", "Давай я візьму валізу. Сідай!"),
    end:     { type:'end', next:'s7' }
  } },

/* ---------------------------------------------------------------- SCENE 7 */
{ id:'s7', n:7, title:'A Change of Plans', emoji:'🌆', objective:'Ride with Chris',
  bg:'drive', ambience:'car', clock:'7:18 PM',
  hotspots:[
    { id:'s7-window', x:58, y:40, ph:[60, 26], icon:'🌴', label:'Look out of the window',
      text:"Palm trees, a giant billboard, a taco truck with a line around the block… This is LA.", ua:"Пальми, величезний білборд, фуд-трак із тако й чергою на весь квартал… Це Лос-Анджелес." }
  ],
  nodes:{
    drive:   think("The van pulls away from the curb. Palm trees. Billboards. Golden light everywhere.",
                   "Мінівен рушає від тротуару. Пальми. Білборди. Усюди золоте світло."),
    long:    say('chris', "Long flight?", "Довгий переліт?"),
    tired:   { type:'choice', prompt:"Answer Chris:", ua:"Відповідай Крісу:", speak:true, options:[
               { text:"Yeah, pretty long. I'm a little tired.", ua:"Так, досить довгий. Я трохи втомився(-лась)." },
               { text:"Yeah! Twelve hours. I'm a little tired, but happy.", ua:"Ага! Дванадцять годин. Трохи втомився(-лась), але щасливий(-а)." } ] },
    bet:     say('chris', "I bet! So, first impressions? What do you think of California?", "Ще б пак! Ну що, перші враження? Як тобі Каліфорнія?"),
    imp:     { type:'speak', key:'s7_impressions', optional:true, skipLabel:'Use the model answer', skipSaysModel:true,
               prompt:"What are your first impressions of LA?", ua:"Які твої перші враження від Лос-Анджелеса?",
               starters:["It's…","The airport was…","I love the…","Everything feels…"],
               model:"It's amazing! The airport was huge, and I love the palm trees. Everything feels different from home.",
               after:{ who:'chris', text:"Ha — I love hearing first impressions. Hold on to that feeling.", ua:"Ха — обожнюю слухати перші враження. Тримайся за це відчуття." } },
    twist:   say('chris', "Oh, by the way… there's been a small change of plans.", "До речі… плани трохи змінилися.", { vocab:['change-of-plans'], cam:'push' }),
    react:   { type:'choice', prompt:"React:", ua:"Відреагуй:", speak:true, options:[
               { text:"Wait, what happened?", ua:"Чекай, а що сталося?" },
               { text:"Is everything okay?", ua:"Усе гаразд?" },
               { text:"A change of plans? What do you mean?", ua:"Плани змінилися? Що ти маєш на увазі?" } ] },
    hotel:   say('chris', "Your exchange coordinator has arranged a hotel for tonight. They'll meet you there. Rachel and David Miller will come to get you tomorrow morning.",
                 "Твій координатор програми забронював готель на сьогоднішню ніч. Він зустріне тебе там. Рейчел і Девід Міллер заберуть тебе завтра вранці."),
    checkq:  { type:'quiz', key:'s7_check', noLine:true, noEcho:true,
               prompt:"So… where are you sleeping tonight?", ua:"Тож… де ти ночуєш сьогодні?",
               options:[
                 { text:"At a hotel.", correct:true },
                 { text:"At the Millers' house.", who:'think', react:["Not tonight — Chris said the Millers will come tomorrow morning.","Не сьогодні — Кріс сказав, що Міллери приїдуть завтра вранці."] },
                 { text:"At the airport.", who:'think', react:["Phew — no! Chris said “a hotel for tonight”.","Фух — ні! Кріс сказав «готель на сьогоднішню ніч»."] } ],
               hints:[ "Chris said: “…has arranged a hotel for tonight.”", "Tonight = hotel. Tomorrow = the Millers.", "Сьогодні — готель, завтра — родина Міллерів." ] },
    didnt:   say('you', "Oh! Okay… I didn't expect that.", "О! Добре… цього я не чекав(-ла).", { vocab:['didnt-expect'] }),
    worry:   say('chris', "Don't worry. Everything's taken care of. And hey, you'll get to see a little more of LA tonight!",
                 "Не хвилюйся. Усе вже владнано. І зате сьогодні ввечері побачиш трохи більше Лос-Анджелеса!"),
    c_n:     { type:'notify', thread:'coordinator', text:"Hi again! Sorry about the late change — the Millers had a small delay, nothing serious 🙂 Your room is booked at the Palm Court Hotel. I'll meet you in the lobby!" },
    c_chat:  { type:'phone', thread:'coordinator', steps:[
      { in:"Hi again! Sorry about the late change — the Millers had a small delay, nothing serious 🙂 Your room is booked at the Palm Court Hotel. I'll meet you in the lobby!", id:'e1s7c1' },
      { reply:{ id:'e1s7r1', options:[ { text:"Thank you! See you soon." }, { text:"Okay, thanks for letting me know!" } ] } },
      { end:'Back to the ride' } ] },
    lights:  think("The sun drops behind the hills. One by one, the city lights switch on.",
                   "Сонце ховається за пагорбами. Один за одним спалахують вогні міста.", { fx:'nightfall', cam:'push' }),
    more:    say('chris', "Actually… there's one more thing you should know about tomorrow.", "Взагалі-то… є ще дещо, що тобі варто знати про завтра."),
    what:    { type:'choice', prompt:"Ask Chris:", ua:"Запитай Кріса:", speak:true, options:[
               { text:"What is it?", ua:"Що саме?" },
               { text:"Okay… now I'm curious. What is it?", ua:"Так… тепер мені цікаво. Що саме?" } ] },
    smile:   narr("Chris just smiles.", "Кріс лише усміхається."),
    secret:  say('chris', "Let's just say your first day here might be more interesting than you expect.",
                 "Скажімо так: твій перший день тут може виявитися цікавішим, ніж ти очікуєш."),
    hmm:     think("…What does THAT mean?", "…І що це має означати?"),
    end:     { type:'end', next:'s8' }
  } },

/* ---------------------------------------------------------------- SCENE 8 */
{ id:'s8', n:8, title:'My First LA Story', emoji:'🎙️', objective:'Tell Mia your story',
  bg:'hotel', ambience:'hotel', clock:'8:46 PM',
  hotspots:[
    { id:'s8-window', x:62, y:36, ph:[76, 30], icon:'🌃', label:'Look at the city',
      text:"Somewhere out there is my new home.", ua:"Десь там — мій новий дім." },
    { id:'s8-case', x:80, y:76, ph:[31, 66], icon:'🧳', label:'Check your suitcase',
      text:"Still here. Still mine. 😅", ua:"Досі тут. Досі моя. 😅" }
  ],
  nodes:{
    room:    think("Room 412. A real bed. A window full of city lights.", "Номер 412. Справжнє ліжко. Вікно, повне вогнів міста.", { cam:'drift' }),
    lobby:   think("The coordinator met me in the lobby. Breakfast at eight. The Millers at nine.", "Координатор зустрів мене у фоє. Сніданок о восьмій. Міллери — о дев'ятій."),
    ping:    { type:'notify', thread:'mia', text:"HEY!!! You can't just disappear!" },
    mia:     { type:'phone', thread:'mia', steps:[
      { in:"HEY!!! You can't just disappear!", id:'e1s8m1' },
      { in:"Tell me what happened!", id:'e1s8m2' },
      { in:"Was LA amazing?", id:'e1s8m3' },
      { in:"Was the airport crazy?", id:'e1s8m4' },
      { in:"I NEED DETAILS! 😂", id:'e1s8m5' },
      { end:'Write my LA story' } ] },
    final:   { type:'final' },
    react:   { type:'phone', thread:'mia', steps:[
      { in:"Okay, FIRST OF ALL, I'm so proud of you 😭💙", id:'e1s8m6' },
      { in:"Second, HOW DID YOU ALREADY HAVE AN AIRPORT ADVENTURE?! 😂", id:'e1s8m7' },
      { in:"Get some rest. Tomorrow is going to be HUGE!", id:'e1s8m8' },
      { end:'Good night, LA 🌙' } ] },
    done:    { type:'complete' }
  } }
];

const SCENE_BY_ID = {};
SCENES.forEach((s, i) => { s.index = i; s.order = Object.keys(s.nodes); SCENE_BY_ID[s.id] = s; });

/* =========================================================================
   SCENE ART
   -------------------------------------------------------------------------
   Each background is a real photo from episodes/episode-01/photos/, built
   from layers so the old animations still play on top of it:
     · the plane window — the city zooms in behind a cut-out window frame
     · people (officer, baggage agent, Chris) — cut out and gently breathing
     · the drive — the street sways behind the car-window frame, light
       streaks race along the road, street lamps sweep past, and the sunset
       photo fades into the night photo at "nightfall"
     · the hotel — the bedside lamp glows, city lights twinkle
   If a photo is missing or fails to load, the hand-drawn SVG version below
   is shown instead, so the episode always works.
   ========================================================================= */
const PHOTO_BASE = 'episodes/episode-01/photos/';
const PHOTOS = {
  cabin:'s1-cabin.webp', window:'s1-window.webp', corridor:'s2-terminal.webp', passport:'s3-passport-control.webp',
  baggage:'s4-baggage-claim.webp', desk:'s5-baggage-service.webp', carousel6:'s5-carousel-6.webp',
  pickup:'s6-pickup-zone.webp', van:'s6-chris-van.webp', drive:'s7-drive.webp', hotel:'s8-hotel-room.webp'
};
/* extra layers per scene (preloaded together with the main photo) */
const PHOTO_EXTRAS = {
  window:['s1-window-frame'], passport:['s3-officer'], desk:['s5-agent'], van:['s6-chris'],
  drive:['s7-drive-night', 's7-drive-frame', 's7-drive-night-frame']
};
const photoState = {};   // key -> 'ok' | 'missing' | Promise
const preloaded = [];
function probePhoto(key){
  if(photoState[key] === 'ok' || photoState[key] === 'missing') return Promise.resolve(photoState[key]);
  if(photoState[key]) return photoState[key];
  const file = PHOTOS[key];
  if(!file){ photoState[key] = 'missing'; return Promise.resolve('missing'); }
  photoState[key] = new Promise(res => {
    const img = new Image();
    const done = v => { if(typeof photoState[key] === 'string') return; photoState[key] = v; res(v); };
    img.onload = () => done('ok');
    img.onerror = () => done('missing');
    setTimeout(() => done('missing'), 12000);
    img.src = PHOTO_BASE + file;
    (PHOTO_EXTRAS[key] || []).forEach(n => { const x = new Image(); x.src = PHOTO_BASE + n + '.webp'; preloaded.push(x); });
  });
  return photoState[key];
}

/* ---- photo layers ---- */
const PH_IMG = (n, cls = '', style = '') =>
  `<img class="ep1-pic${cls ? ' ' + cls : ''}"${style ? ` style="${style}"` : ''} src="${PHOTO_BASE + n}.webp" alt="" draggable="false" decoding="async" onerror="this.remove()">`;
/* origin = bottom-centre of the person in the photo, in % (from tools/build_photos.py) */
const PH_FIG = (n, ox, oy, delay = 0) => PH_IMG(n, 'ep1-pic-fig', `transform-origin:${ox}% ${oy}%;animation-delay:${delay}s`);
const HOTEL_TWINKLES = [[60.8,55.9],[80.4,56.4],[44.4,55.7],[53.0,55.5],[52.1,47.0],[60.8,46.7],[52.9,59.2],[59.0,59.2],[75.5,36.0],[43.8,38.7],[68.2,52.6],[86.9,49.8]];
const PHOTO_LAYERS = {
  window: () => `<div class="ep1-pic-zoom">${PH_IMG('s1-window')}</div>${PH_IMG('s1-window-frame')}`,
  passport: () => PH_IMG('s3-passport-control') + PH_FIG('s3-officer', 50.15, 56.32),
  desk: () => PH_IMG('s5-baggage-service') + PH_FIG('s5-agent', 49.22, 66.31, -1.7),
  van: () => PH_IMG('s6-chris-van') + PH_FIG('s6-chris', 50.54, 100, -0.8),
  drive: () => `<div class="ep1-pic-street"><div class="ep1-pic-pan">${PH_IMG('s7-drive')}${PH_IMG('s7-drive-night', 'ep1-pic-night')}</div>
      <div class="ep1-pic-streaks" aria-hidden="true"><i></i><i></i><i></i><i></i></div></div>
    ${PH_IMG('s7-drive-frame')}${PH_IMG('s7-drive-night-frame', 'ep1-pic-night')}<div class="ep1-pic-sweep"></div>`,
  hotel: () => PH_IMG('s8-hotel-room') + `<div class="ep1-pic-lamp"></div>` +
    HOTEL_TWINKLES.map((p, i) => `<i class="ep1-pic-tw" style="left:${p[0]}%;top:${p[1]}%;--d:${(2.6 + (i * 0.37) % 1.8).toFixed(2)}s;--o:${(-(i * 0.71) % 3).toFixed(2)}s"></i>`).join('')
};
function photoLayers(key){
  const build = PHOTO_LAYERS[key];
  const main = PHOTOS[key].replace(/\.webp$/, '');
  /* a soft, blurred copy behind the photo fills any edge the framing leaves open */
  return `<div class="ep1-pic-backdrop" style="background-image:url('${PHOTO_BASE + PHOTOS[key]}')"></div>` +
    `<div class="ep1-pic-box" data-ph="${key}">${build ? build() : PH_IMG(main)}</div>`;
}

let artSeq = 0;
function rng(seed){
  return function(){ seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const svg = (inner, defs) => `<svg class="ep1-art" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><defs>${defs || ''}</defs>${inner}</svg>`;
const lin = (id, stops, vertical = true) => `<linearGradient id="${id}" x1="0" y1="0" x2="${vertical ? 0 : 1}" y2="${vertical ? 1 : 0}">${stops.map(([o,c,a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ''}/>`).join('')}</linearGradient>`;
const rad = (id, stops) => `<radialGradient id="${id}">${stops.map(([o,c,a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ''}/>`).join('')}</radialGradient>`;
const FONT = `font-family="'Baloo 2', 'Nunito', sans-serif"`;

function skyline(r, x0, x1, base, hMin, hMax, wMin, wMax, peak){
  let d = '', x = x0;
  while(x < x1){
    const w = wMin + r() * (wMax - wMin);
    const boost = peak ? Math.max(0, 1 - Math.abs((x - peak.x) / peak.spread)) * peak.h * (0.4 + r() * 0.6) : 0;
    const h = hMin + r() * (hMax - hMin) + boost;
    d += `M${x.toFixed(1)} ${base}V${(base - h).toFixed(1)}H${(x + w).toFixed(1)}V${base}Z`;
    x += w + r() * 4;
  }
  return d;
}
function lights(r, n, x0, x1, y0, y1, colors, sMin = 1.5, sMax = 3.5, cls = ''){
  let out = '';
  for(let i = 0; i < n; i++){
    const x = x0 + r() * (x1 - x0), y = y0 + Math.pow(r(), 0.8) * (y1 - y0), s = sMin + r() * (sMax - sMin);
    out += `<rect${cls ? ` class="${cls}"` : ''} x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${s.toFixed(1)}" height="${s.toFixed(1)}" fill="${colors[i % colors.length]}" opacity="${(0.35 + r() * 0.65).toFixed(2)}"/>`;
  }
  return out;
}
function palm(x, base, h, color, lean = 0){
  const tx = x + lean, ty = base - h, w = Math.max(3, h * 0.035);
  let s = `<path d="M${x} ${base} Q${x + lean * 0.2} ${base - h * 0.5} ${tx} ${ty}" stroke="${color}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
  const L = h * 0.32;
  [-160,-130,-100,-70,-40,-15,15,45].forEach((a, i) => {
    const rd = a * Math.PI / 180, ex = tx + Math.cos(rd) * L * (i % 2 ? 1 : 0.85), ey = ty + Math.sin(rd) * L * 0.35 + L * 0.42;
    const cx = tx + Math.cos(rd) * L * 0.55, cy = ty + Math.sin(rd) * L * 0.5 - L * 0.12;
    s += `<path d="M${tx} ${ty} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}" stroke="${color}" stroke-width="${(w * 0.9).toFixed(1)}" fill="none" stroke-linecap="round"/>`;
  });
  return s;
}
/* Back-lit, faceless silhouettes for characters (until real photos exist). */
function figure(x, base, s, o){
  const sh = o.shirt || '#1b2230', rim = o.rim || '#FFB199';
  const torso = `M${x - 128*s} ${base} C${x - 130*s} ${base - 150*s} ${x - 108*s} ${base - 222*s} ${x - 40*s} ${base - 238*s} L${x + 40*s} ${base - 238*s} C${x + 108*s} ${base - 222*s} ${x + 130*s} ${base - 150*s} ${x + 128*s} ${base} Z`;
  let g = `<g class="ep1-fig">`;
  g += `<path d="${torso}" fill="${sh}" stroke="${rim}" stroke-opacity=".45" stroke-width="${3*s}"/>`;
  g += `<rect x="${x - 20*s}" y="${base - 262*s}" width="${40*s}" height="${34*s}" rx="${10*s}" fill="#141821"/>`;
  g += `<ellipse cx="${x}" cy="${base - 300*s}" rx="${46*s}" ry="${54*s}" fill="#141821" stroke="${rim}" stroke-opacity=".5" stroke-width="${3*s}"/>`;
  if(o.hair) g += `<path d="M${x - 48*s} ${base - 300*s} C${x - 50*s} ${base - 368*s} ${x + 50*s} ${base - 368*s} ${x + 48*s} ${base - 300*s} C${x + 30*s} ${base - 335*s} ${x - 30*s} ${base - 335*s} ${x - 48*s} ${base - 300*s}Z" fill="${o.hair}"/>`;
  if(o.cap) g += `<path d="M${x - 50*s} ${base - 322*s} C${x - 40*s} ${base - 372*s} ${x + 40*s} ${base - 372*s} ${x + 50*s} ${base - 322*s} L${x + 74*s} ${base - 316*s} L${x - 50*s} ${base - 316*s}Z" fill="${o.cap}"/>`;
  if(o.collar) g += `<path d="M${x - 40*s} ${base - 236*s} L${x} ${base - 196*s} L${x + 40*s} ${base - 236*s}" stroke="${o.collar}" stroke-width="${6*s}" fill="none"/>`;
  if(o.badge) g += `<path d="M${x + 52*s} ${base - 178*s} l${10*s} ${-14*s} l${10*s} ${14*s} l${-10*s} ${14*s}Z" fill="#e6c36a"/>`;
  if(o.patch) g += `<rect x="${x - 112*s}" y="${base - 196*s}" width="${26*s}" height="${30*s}" rx="${5*s}" fill="${o.patch}" opacity=".8"/>`;
  if(o.vest) g += `<path d="M${x - 98*s} ${base} L${x - 70*s} ${base - 214*s} L${x - 30*s} ${base - 232*s} L${x - 12*s} ${base} Z M${x + 98*s} ${base} L${x + 70*s} ${base - 214*s} L${x + 30*s} ${base - 232*s} L${x + 12*s} ${base} Z" fill="${o.vest}" opacity=".9"/>`;
  if(o.lanyard) g += `<path d="M${x - 30*s} ${base - 234*s} L${x} ${base - 150*s} L${x + 30*s} ${base - 234*s}" stroke="${o.lanyard}" stroke-width="${5*s}" fill="none"/><rect x="${x - 16*s}" y="${base - 150*s}" width="${32*s}" height="${42*s}" rx="${4*s}" fill="#f4f1ea"/>`;
  if(o.sign){
    g += `<rect x="${x - 150*s}" y="${base - 190*s}" width="${300*s}" height="${110*s}" rx="${8*s}" fill="#fbf7f0" stroke="#d8cfc0" stroke-width="${3*s}"/>`;
    g += `<text x="${x}" y="${base - 145*s}" text-anchor="middle" ${FONT} font-weight="800" font-size="${32*s}" fill="#243447">${o.sign[0]}</text>`;
    g += `<text x="${x}" y="${base - 104*s}" text-anchor="middle" ${FONT} font-weight="700" font-size="${26*s}" fill="#FF8A3D">${o.sign[1]}</text>`;
  }
  return g + `</g>`;
}

const ART = {
  /* Scene 1: inside the cabin, golden light through the windows */
  cabin(u){
    const r = rng(11);
    let rows = '';
    const R = [{y:640,h:280,w:440,g:160},{y:560,h:160,w:300,g:112},{y:512,h:98,w:212,g:80},{y:482,h:62,w:150,g:58},{y:462,h:40,w:106,g:42}];
    R.slice().reverse().forEach((q, i) => {
      [800 - q.g - q.w, 800 + q.g].forEach((x, k) => {
        rows += `<rect x="${x}" y="${q.y}" width="${q.w}" height="${q.h}" rx="${q.h*0.16}" fill="url(#${u}st)"/>`;
        rows += `<rect x="${x + q.w*0.12}" y="${q.y + q.h*0.05}" width="${q.w*0.76}" height="${q.h*0.2}" rx="${q.h*0.06}" fill="#e9e1d4" opacity=".28"/>`;
        if(r() > 0.35) rows += `<ellipse cx="${x + q.w*(0.3 + r()*0.4)}" cy="${q.y - q.h*0.12}" rx="${q.h*0.17}" ry="${q.h*0.2}" fill="#1a1512" opacity=".85"/>`;
      });
    });
    let wins = '';
    [[150,330,46,68],[300,375,34,50],[410,405,25,37],[490,425,18,27],[548,438,12,19]].forEach(([x,y,rx,ry]) => {
      wins += `<ellipse cx="${x}" cy="${y}" rx="${rx*1.6}" ry="${ry*1.6}" fill="url(#${u}glow)"/><ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#${u}win)" stroke="#e8dfd2" stroke-width="5"/>`;
    });
    return svg(`
      <rect width="1600" height="900" fill="url(#${u}bg)"/>
      <polygon points="0,0 1600,0 1010,330 590,330" fill="#4a3f37"/>
      <polygon points="770,0 830,0 812,330 788,330" fill="#fff1d6" opacity=".22"/>
      <polygon points="0,40 600,330 600,392 0,250" fill="#d9d1c5"/><polygon points="1600,40 1000,330 1000,392 1600,250" fill="#d2c9bc"/>
      <polygon points="0,250 600,392 600,560 0,900" fill="#cbbfb0"/><polygon points="1600,250 1000,392 1000,560 1600,900" fill="#bfb2a2"/>
      <polygon points="600,392 1000,392 1000,470 600,470" fill="#3a302a"/>
      <polygon points="560,900 1040,900 860,450 740,450" fill="#2a221d"/>
      ${wins}
      <polygon points="150,330 300,375 900,900 0,900" fill="#FFB36B" opacity=".08"/>
      ${rows}
      <rect width="1600" height="900" fill="url(#${u}vig)"/>`,
      lin(`${u}bg`, [[0,'#4b3d33'],[1,'#1c1612']]) + lin(`${u}st`, [[0,'#55657e'],[1,'#2a3343']]) +
      lin(`${u}win`, [[0,'#ffb46b'],[0.6,'#ff8a3d'],[1,'#ffd9a0']]) + rad(`${u}glow`, [[0,'#ffb46b',0.55],[1,'#ffb46b',0]]) +
      `<radialGradient id="${u}vig" cx="50%" cy="45%" r="75%"><stop offset="55%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".6"/></radialGradient>`);
  },
  /* Scene 1: POV window — LA in golden hour, the plane descending */
  window(u){
    const r = rng(7);
    const city = lights(r, 950, 0, 1600, 520, 900, ['#ffd27a','#ffe9c0','#ffb35c','#fff3dc'], 1.6, 3.8);
    const towers = skyline(r, 620, 1200, 545, 30, 90, 16, 38, { x:900, spread:240, h:200 });
    return svg(`
      <g class="ep1-approach">
        <rect width="1600" height="900" fill="url(#${u}sky)"/>
        <circle cx="1080" cy="452" r="300" fill="url(#${u}sun)"/>
        <circle cx="1080" cy="452" r="56" fill="#fff0cf"/>
        <ellipse cx="560" cy="250" rx="260" ry="20" fill="#ffc7a8" opacity=".35"/><ellipse cx="1150" cy="205" rx="200" ry="14" fill="#ffd7b5" opacity=".3"/>
        <path d="M0 500 Q180 420 360 465 T760 440 T1160 458 T1600 425 V560 H0Z" fill="#8c5a74" opacity=".6"/>
        <rect y="520" width="1600" height="380" fill="#2c1d33"/>
        <path d="M0 640 C400 600 900 700 1600 610" stroke="#ffcf7a" stroke-opacity=".35" stroke-width="5" fill="none"/>
        <path d="M0 760 C500 700 1000 800 1600 720" stroke="#ffcf7a" stroke-opacity=".25" stroke-width="4" fill="none"/>
        <path d="${towers}" fill="#3d2840"/>
        ${city}
        ${palm(240, 680, 200, '#140d18', 14)}${palm(350, 705, 160, '#140d18', -10)}${palm(1340, 690, 190, '#140d18', 8)}${palm(1450, 715, 150, '#140d18', -6)}
        <path d="M1180 760 L1600 640 L1600 710 L1240 800Z" fill="url(#${u}wing)"/>
      </g>
      <rect width="1600" height="900" fill="url(#${u}wall)" mask="url(#${u}m)"/>
      <rect x="370" y="84" width="860" height="640" rx="176" fill="none" stroke="#c4bcb0" stroke-width="30"/>
      <rect x="392" y="106" width="816" height="596" rx="160" fill="none" stroke="#000" stroke-opacity=".18" stroke-width="10"/>
      <polygon points="392,300 0,900 700,900 760,720" fill="#ffc07a" opacity=".07"/>`,
      lin(`${u}sky`, [[0,'#241f45'],[0.32,'#6b4c7a'],[0.55,'#ff8a3d'],[0.68,'#ffcf94']]) +
      rad(`${u}sun`, [[0,'#ffe6b5',0.9],[0.4,'#ffb46b',0.35],[1,'#ff8a3d',0]]) +
      lin(`${u}wall`, [[0,'#e7e1d8'],[1,'#b9b0a3']], false) +
      lin(`${u}wing`, [[0,'#d9dde3'],[1,'#8f97a3']]) +
      `<mask id="${u}m"><rect width="1600" height="900" fill="#fff"/><rect x="384" y="98" width="832" height="612" rx="168" fill="#000"/></mask>`);
  },
  /* Scene 3: passport control hall */
  passport(u){
    let booths = '';
    [120, 420, 720, 1020, 1320].forEach((x, i) => {
      booths += `<rect x="${x}" y="430" width="200" height="210" rx="8" fill="#2e3c4f"/><rect x="${x+10}" y="440" width="180" height="90" rx="6" fill="#9fc6e4" opacity=".22"/>`;
      booths += `<rect x="${x+70}" y="400" width="60" height="26" rx="5" fill="${i === 2 ? '#6DBB75' : '#3d4b5e'}"/><text x="${x+100}" y="419" text-anchor="middle" ${FONT} font-size="18" font-weight="800" fill="#fff">${i + 1}</text>`;
    });
    let posts = '';
    for(let i = 0; i < 7; i++){ const x = 120 + i * 230; posts += `<rect x="${x}" y="690" width="12" height="130" fill="#b9c0c8"/><circle cx="${x+6}" cy="690" r="10" fill="#d7dde3"/>`; if(i < 6) posts += `<path d="M${x+6} 700 Q${x+121} 735 ${x+236} 700" stroke="#3b5bb5" stroke-width="9" fill="none"/>`; }
    let strips = '';
    for(let i = 0; i < 9; i++){ const t = i / 8; strips += `<line x1="${800 + (t - 0.5) * 2400}" y1="0" x2="${800 + (t - 0.5) * 900}" y2="300" stroke="#eaf4ff" stroke-opacity=".35" stroke-width="6"/>`; }
    return svg(`
      <rect width="1600" height="900" fill="url(#${u}bg)"/>
      <rect width="1600" height="300" fill="#1c2633"/>${strips}
      <rect x="0" y="300" width="1600" height="350" fill="#263345"/>
      <rect x="430" y="180" width="740" height="120" rx="14" fill="#0f1620" stroke="#5AB6F9" stroke-opacity=".45" stroke-width="3"/>
      <text x="800" y="242" text-anchor="middle" ${FONT} font-size="54" font-weight="800" fill="#f4f8fc" letter-spacing="6">PASSPORT CONTROL</text>
      <text x="800" y="282" text-anchor="middle" ${FONT} font-size="24" font-weight="600" fill="#9fc6e4" letter-spacing="3">VISITORS · ALL PASSPORTS →</text>
      ${booths}
      <rect y="640" width="1600" height="260" fill="url(#${u}floor)"/>
      ${figure(820, 640, 0.9, { shirt:'#1d2a3d', rim:'#9fc6e4', badge:true, patch:'#3E7C8C', collar:'#2a3b52' })}
      <rect x="560" y="600" width="520" height="70" rx="6" fill="#1a2433"/><rect x="560" y="600" width="520" height="10" fill="#5AB6F9" opacity=".35"/>
      ${posts}
      <rect width="1600" height="900" fill="url(#${u}vig)"/>`,
      lin(`${u}bg`, [[0,'#1b2633'],[1,'#0e131b']]) + lin(`${u}floor`, [[0,'#3a4656'],[1,'#151b24']]) +
      `<radialGradient id="${u}vig" cx="50%" cy="50%" r="75%"><stop offset="55%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".55"/></radialGradient>`);
  },
  /* Scene 4/5: baggage claim hall with a carousel */
  baggage(u, num = 4){
    let slats = '';
    for(let i = 0; i < 34; i++){ const x = 120 + i * 40; slats += `<line x1="${x}" y1="612" x2="${x - 14}" y2="684" stroke="#1a1c20" stroke-width="3" opacity=".7"/>`; }
    let ceil = '';
    for(let i = 0; i < 7; i++) ceil += `<rect x="${110 + i * 210}" y="104" width="150" height="10" rx="5" fill="#fff6e3" opacity=".35"/>`;
    return svg(`
      <rect width="1600" height="900" fill="url(#${u}bg)"/>
      ${ceil}
      <rect y="120" width="1600" height="420" fill="#2c3440"/>
      <rect x="560" y="150" width="480" height="150" rx="14" fill="#11161d" stroke="#FFB199" stroke-opacity=".4" stroke-width="3"/>
      <text x="800" y="205" text-anchor="middle" ${FONT} font-size="34" font-weight="800" fill="#f4f1ea" letter-spacing="5">BAGGAGE CLAIM</text>
      <text x="800" y="282" text-anchor="middle" ${FONT} font-size="78" font-weight="800" fill="#FF8A3D">${num}</text>
      <rect x="1120" y="190" width="300" height="110" rx="10" fill="#151b23"/><text x="1270" y="236" text-anchor="middle" ${FONT} font-size="22" font-weight="700" fill="#9fc6e4">EU 207 · WARSAW</text><text x="1270" y="272" text-anchor="middle" ${FONT} font-size="20" fill="#cfd8e2">${num === 4 ? 'Bags on belt' : 'Rerouted bags'}</text>
      <rect y="540" width="1600" height="360" fill="url(#${u}floor)"/>
      <path d="M60 600 Q800 560 1540 600 L1560 700 Q800 750 40 700Z" fill="#5d6570"/>
      <path d="M90 612 Q800 576 1510 612 L1520 684 Q800 726 80 684Z" fill="#2c2f35"/>
      ${slats}
      <path d="M40 700 Q800 750 1560 700 L1560 740 Q800 795 40 740Z" fill="#3e444d"/>
      <rect x="1420" y="430" width="160" height="190" rx="10" fill="#4a525d"/><rect x="1432" y="560" width="136" height="50" fill="#1b1e23"/>
      <rect width="1600" height="900" fill="url(#${u}vig)"/>`,
      lin(`${u}bg`, [[0,'#222a35'],[1,'#141920']]) + lin(`${u}floor`, [[0,'#4a5361'],[1,'#1c2129']]) +
      `<radialGradient id="${u}vig" cx="50%" cy="50%" r="75%"><stop offset="55%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".5"/></radialGradient>`);
  },
  carousel6(u){ return ART.baggage(u, 6); },
  /* Scene 5: Baggage Service desk */
  desk(u){
    const r = rng(5); let shelf = '';
    const cols = ['#2b2d33','#3d79c9','#c8443d','#9aa0a8','#6DBB75','#6B4C7A','#d98b3a'];
    for(let row = 0; row < 3; row++) for(let i = 0; i < 9; i++){
      const w = 70 + r() * 50, h = 60 + r() * 30, x = 140 + i * 150 + r() * 20, y = 250 + row * 110 + (90 - h);
      shelf += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="9" fill="${cols[(row * 9 + i) % cols.length]}" opacity=".75"/>`;
    }
    return svg(`
      <rect width="1600" height="900" fill="url(#${u}bg)"/>
      <rect x="520" y="70" width="560" height="110" rx="14" fill="#11161d" stroke="#6DBB75" stroke-opacity=".5" stroke-width="3"/>
      <text x="800" y="128" text-anchor="middle" ${FONT} font-size="44" font-weight="800" fill="#f4f1ea" letter-spacing="5">BAGGAGE SERVICE</text>
      <text x="800" y="164" text-anchor="middle" ${FONT} font-size="22" fill="#a9e6ae" letter-spacing="2">LOST &amp; DELAYED BAGS</text>
      ${[0,1,2].map(i => `<rect x="120" y="${338 + i*110}" width="1360" height="10" fill="#59616d"/>`).join('')}
      ${shelf}
      ${figure(800, 690, 0.95, { shirt:'#1e2b2a', rim:'#a9e6ae', vest:'#3f7d55', lanyard:'#6DBB75', hair:'#120f0e' })}
      <rect x="180" y="640" width="1240" height="260" fill="url(#${u}desk)"/>
      <rect x="180" y="630" width="1240" height="22" rx="6" fill="#d9cdb8"/>
      <rect x="1080" y="540" width="180" height="110" rx="8" fill="#1a1f27" stroke="#3b4451" stroke-width="4"/><rect x="1094" y="552" width="152" height="84" rx="4" fill="#5AB6F9" opacity=".35"/>
      <rect width="1600" height="900" fill="url(#${u}vig)"/>`,
      lin(`${u}bg`, [[0,'#2a2f38'],[1,'#191d24']]) + lin(`${u}desk`, [[0,'#8a7a64'],[1,'#3d342a']]) +
      `<radialGradient id="${u}vig" cx="50%" cy="45%" r="75%"><stop offset="55%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".5"/></radialGradient>`);
  },
  /* Scene 6: outside, ground transportation at dusk */
  pickup(u, withVan = false){
    const r = rng(23);
    let cars = '';
    [[120,770,'#c8443d'],[560,790,'#e7e3dc'],[980,775,'#2b2d33'],[1380,792,'#5AB6F9']].forEach(([x,y,c]) => {
      cars += `<rect x="${x}" y="${y-60}" width="230" height="70" rx="22" fill="${c}" opacity=".85"/><rect x="${x+40}" y="${y-100}" width="140" height="50" rx="18" fill="${c}" opacity=".75"/>`;
      cars += `<circle cx="${x+10}" cy="${y-28}" r="16" fill="#ff4d3d" opacity=".9"/><circle cx="${x+10}" cy="${y-28}" r="46" fill="url(#${u}tail)"/>`;
    });
    const van = withVan ? `
      <g><rect x="980" y="590" width="440" height="170" rx="40" fill="url(#${u}van)"/><rect x="1010" y="610" width="330" height="70" rx="18" fill="#2a3442" opacity=".85"/>
      <circle cx="1060" cy="765" r="36" fill="#15181d"/><circle cx="1340" cy="765" r="36" fill="#15181d"/>
      <rect x="1260" y="705" width="100" height="30" rx="5" fill="#f4f1ea"/><text x="1310" y="727" text-anchor="middle" ${FONT} font-size="20" font-weight="800" fill="#243447">··7KQ</text></g>
      ${figure(760, 820, 0.95, { shirt:'#2d2620', rim:'#FFB199', hair:'#2a1d16', sign:['LA EXCHANGE','— WELCOME —'] })}` : '';
    return svg(`
      <rect width="1600" height="900" fill="url(#${u}sky)"/>
      <circle cx="1240" cy="520" r="260" fill="url(#${u}sun)"/>
      ${palm(160, 700, 380, '#1b1426', 18)}${palm(380, 700, 330, '#1b1426', -12)}${palm(1450, 700, 400, '#1b1426', -14)}${palm(1250, 700, 300, '#1b1426', 10)}
      <rect y="0" width="1600" height="130" fill="#1d2430"/>${Array.from({length:8}, (_, i) => `<rect x="${60 + i * 195}" y="112" width="110" height="7" rx="3" fill="#fff3d6" opacity=".8"/><ellipse cx="${115 + i * 195}" cy="140" rx="90" ry="22" fill="#fff3d6" opacity=".08"/>`).join('')}
      <rect x="520" y="150" width="560" height="120" rx="12" fill="#1f5a3c" stroke="#a9e6ae" stroke-opacity=".5" stroke-width="3"/>
      <text x="800" y="205" text-anchor="middle" ${FONT} font-size="36" font-weight="800" fill="#f4f8f2" letter-spacing="3">GROUND TRANSPORTATION</text>
      <text x="800" y="248" text-anchor="middle" ${FONT} font-size="26" font-weight="700" fill="#d8f3da">DOORS 3–6 →   ☕ DOOR 5</text>
      <rect y="700" width="1600" height="200" fill="url(#${u}road)"/>
      <rect y="690" width="1600" height="16" fill="#9aa0a8"/>
      ${cars}${van}
      <rect width="1600" height="900" fill="url(#${u}vig)"/>`,
      lin(`${u}sky`, [[0,'#243447'],[0.45,'#6B4C7A'],[0.8,'#FF8A3D'],[1,'#ffc58a']]) +
      rad(`${u}sun`, [[0,'#ffd9a0',0.8],[1,'#ff8a3d',0]]) + rad(`${u}tail`, [[0,'#ff4d3d',0.45],[1,'#ff4d3d',0]]) +
      lin(`${u}road`, [[0,'#3a3f48'],[1,'#15181d']]) + lin(`${u}van`, [[0,'#dfe3e8'],[1,'#8e96a2']]) +
      `<radialGradient id="${u}vig" cx="50%" cy="50%" r="75%"><stop offset="60%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".45"/></radialGradient>`);
  },
  van(u){ return ART.pickup(u, true); },
  /* Scene 7: passenger window, the city scrolling by (CSS animates the layers) */
  drive(u){
    const r = rng(31);
    const far = skyline(r, 0, 1600, 560, 30, 110, 22, 50, { x:800, spread:300, h:170 });
    const tile = (inner) => `<g>${inner}</g><g transform="translate(1600 0)">${inner}</g>`;
    let mid = '';
    for(let i = 0; i < 6; i++) mid += palm(120 + i * 270 + r() * 60, 700, 320 + r() * 120, '#120d1a', -10 + r() * 20);
    let lamps = '';
    for(let i = 0; i < 5; i++){ const x = 200 + i * 320; lamps += `<rect x="${x}" y="420" width="8" height="300" fill="#0d0a12"/><rect x="${x - 40}" y="416" width="48" height="8" fill="#0d0a12"/><circle class="ep1-lamp" cx="${x - 36}" cy="430" r="40" fill="url(#${u}lamp)"/>`; }
    const winLights = lights(r, 260, 0, 1600, 420, 560, ['#ffd27a','#fff1c9'], 2, 4, 'ep1-citylight');
    return svg(`
      <rect width="1600" height="900" fill="url(#${u}sky)"/>
      <rect class="ep1-nightsky" width="1600" height="900" fill="#0e1430"/>
      <g class="ep1-par-far">${tile(`<path d="${far}" fill="#3a2a45" opacity=".9"/>${winLights}`)}</g>
      <rect y="640" width="1600" height="260" fill="#1a1420"/>
      <g class="ep1-par-mid">${tile(mid + lamps)}</g>
      <rect y="700" width="1600" height="40" fill="#2c2733"/>
      <g class="ep1-streaks"><rect x="-200" y="742" width="420" height="5" rx="3" fill="#ffd27a" opacity=".5"/><rect x="600" y="756" width="300" height="4" rx="2" fill="#ff6a5a" opacity=".45"/></g>
      <rect width="1600" height="900" fill="url(#${u}refl)" opacity=".5"/>
      <path d="M0 0 H1600 V900 H0Z M190 150 Q200 100 270 96 H1360 Q1430 102 1440 170 L1470 620 Q1466 676 1400 680 H230 Q160 676 156 620Z" fill="#0b0d12" fill-rule="evenodd"/>
      <path d="M190 150 Q200 100 270 96 H1360 Q1430 102 1440 170 L1470 620 Q1466 676 1400 680 H230 Q160 676 156 620Z" fill="none" stroke="#2c303a" stroke-width="10"/>
      <path d="M0 720 H1600 V900 H0Z" fill="#14161c"/><rect x="0" y="712" width="1600" height="10" fill="#2a2e36"/>
      <path d="M1180 712 q60 -46 150 -40 l40 40Z" fill="#1d2027"/>`,
      lin(`${u}sky`, [[0,'#2b2a55'],[0.5,'#8b4f74'],[0.85,'#ff9a52']]) +
      rad(`${u}lamp`, [[0,'#ffe6ad',0.9],[1,'#ffd27a',0]]) +
      lin(`${u}refl`, [[0,'#ffffff',0.08],[0.5,'#ffffff',0],[1,'#ffffff',0.05]], false));
  },
  /* Scene 8: hotel room at night, city lights in the window */
  hotel(u){
    const r = rng(41);
    const towers = skyline(r, 640, 1500, 560, 40, 140, 20, 46, { x:1050, spread:260, h:150 });
    return svg(`
      <rect width="1600" height="900" fill="url(#${u}wall)"/>
      <rect x="620" y="110" width="900" height="560" fill="url(#${u}night)"/>
      <path d="${towers}" fill="#1a1d3a"/>
      ${lights(r, 420, 640, 1500, 380, 660, ['#ffd27a','#fff1c9','#ffb35c'], 2, 4, 'ep1-twinkle')}
      <rect x="620" y="560" width="900" height="110" fill="#141633"/>${lights(r, 200, 640, 1500, 580, 668, ['#ffd27a','#ff8a3d','#fff1c9'], 2, 3)}
      <rect x="600" y="96" width="940" height="588" fill="none" stroke="#2a1f1a" stroke-width="28"/><rect x="1060" y="110" width="12" height="560" fill="#2a1f1a"/>
      <path d="M540 70 Q600 380 560 720 L640 720 Q660 380 620 70Z" fill="#5a3a2c"/><path d="M1580 70 Q1530 380 1570 720 L1500 720 Q1480 380 1520 70Z" fill="#5a3a2c"/>
      <circle cx="260" cy="420" r="300" fill="url(#${u}lamp)"/>
      <path d="M200 330 L320 330 L290 420 L230 420Z" fill="#f3d9b1"/><rect x="255" y="420" width="10" height="200" fill="#3a2a20"/>
      <rect x="120" y="600" width="300" height="140" rx="10" fill="#3a2a20"/>
      <path d="M0 720 Q300 650 720 690 L780 900 H0Z" fill="url(#${u}bed)"/><path d="M60 700 Q220 650 420 676 L440 740 Q220 720 70 760Z" fill="#fbf4ea" opacity=".9"/>
      <rect width="1600" height="900" fill="url(#${u}vig)"/>`,
      lin(`${u}wall`, [[0,'#3a2a22'],[1,'#1c1410']]) + lin(`${u}night`, [[0,'#0b1028'],[0.7,'#2b2550'],[1,'#4a2f55']]) +
      rad(`${u}lamp`, [[0,'#ffcf8a',0.55],[1,'#ffcf8a',0]]) + lin(`${u}bed`, [[0,'#efe4d4'],[1,'#a8977f']]) +
      `<radialGradient id="${u}vig" cx="50%" cy="50%" r="75%"><stop offset="55%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".55"/></radialGradient>`);
  }
};
function sceneArt(key){
  const u = 'ep1a' + (++artSeq);
  if(key === 'corridor'){
    return `<div class="ep1-photo ep1-photo-soft" style="background-image:url('${ASSETS.arrival}')"></div>`;
  }
  return (ART[key] || ART.cabin)(u);
}

/* Suitcases: photos (photos/suitcase-*.webp, trimmed, transparent) scaled by
   size so S / M / L read clearly; the drawn SVG below is the fallback. */
const SC_PHOTO = {};   // img name -> 'wait' | 'ok' | 'missing'
function probeSuitcases(){
  [MY_SUITCASE, ...DECOYS, ...CAROUSEL6, { img:'s6-map' }].forEach(c => {
    if(!c.img || SC_PHOTO[c.img]) return;
    SC_PHOTO[c.img] = 'wait';
    const im = new Image();
    im.onload = () => { SC_PHOTO[c.img] = 'ok'; };
    im.onerror = () => { SC_PHOTO[c.img] = 'missing'; };
    im.src = PHOTO_BASE + c.img + '.webp';
    preloaded.push(im);
  });
}
const SC_HEIGHT = { S:56, M:70, L:85 };   // % of the 140×230 suitcase box (same box as the SVG)
function suitcasePhoto(c){
  return `<span class="ep1-sc-svg ep1-sc-photo" aria-hidden="true"><img src="${PHOTO_BASE + c.img}.webp" alt="" draggable="false" style="height:${SC_HEIGHT[c.size] || 70}%"></span>`;
}

/* Suitcases, drawn so the mini-games can show exact sizes/colours/details. */
const SC_COL = { black:['#363940','#17181c'], blue:['#4a86d4','#244f8c'], red:['#d24c44','#8f2621'], grey:['#a9aeb5','#6c727a'] };
function suitcaseSVG(c){
  if(c.img && SC_PHOTO[c.img] === 'ok') return suitcasePhoto(c);
  const u = 'ep1s' + (++artSeq);
  const s = { S:0.72, M:0.9, L:1.1 }[c.size] || 0.9;
  const w = 104 * s, h = 132 * s, x = 70 - w / 2, y = 186 - h - 10;
  const [c1, c2] = SC_COL[c.color] || SC_COL.black;
  let ridges = '';
  for(let i = 1; i < 5; i++) ridges += `<line x1="${x + (w * i) / 5}" y1="${y + 10}" x2="${x + (w * i) / 5}" y2="${y + h - 10}" stroke="#fff" stroke-opacity=".12" stroke-width="2"/>`;
  const gy = y - 34 * s;
  let feat = '';
  if(c.feature === 'ribbon'){
    feat = `<path d="M70 ${gy+2} q-26 -18 -30 2 q4 14 30 0Z M70 ${gy+2} q26 -18 30 2 q-4 14 -30 0Z" fill="${c.fcolor}"/><path d="M70 ${gy+4} l-12 26 M70 ${gy+4} l10 28" stroke="${c.fcolor}" stroke-width="6" stroke-linecap="round"/><circle cx="70" cy="${gy+3}" r="5" fill="${c.fcolor}"/>`;
  } else if(c.feature === 'tag'){
    feat = `<path d="M84 ${gy+2} q8 10 2 22" stroke="#ddd" stroke-width="2" fill="none"/><rect x="74" y="${gy+22}" width="26" height="34" rx="4" fill="${c.fcolor}" transform="rotate(12 87 ${gy+39})"/>`;
  } else if(c.feature === 'sticker'){
    feat = `<circle cx="${x + w * 0.68}" cy="${y + h * 0.42}" r="${13 * s}" fill="${c.fcolor}"/><circle cx="${x + w * 0.68}" cy="${y + h * 0.42}" r="${6 * s}" fill="#fff" opacity=".5"/>`;
  }
  return `<svg viewBox="0 -30 140 230" class="ep1-sc-svg" aria-hidden="true" focusable="false"><defs>${lin(`${u}b`, [[0,c1],[1,c2]], false)}</defs>
    <rect x="${70 - 24*s}" y="${gy}" width="${6*s}" height="${36*s}" fill="#9aa0a8"/><rect x="${70 + 18*s}" y="${gy}" width="${6*s}" height="${36*s}" fill="#9aa0a8"/>
    <rect x="${70 - 28*s}" y="${gy - 8}" width="${56*s}" height="${12}" rx="6" fill="#4a4f57"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${14*s}" fill="url(#${u}b)"/>${ridges}
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${14*s}" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="2"/>
    <circle cx="${x + 14}" cy="${y + h + 6}" r="7" fill="#1b1d21"/><circle cx="${x + w - 14}" cy="${y + h + 6}" r="7" fill="#1b1d21"/>
    ${feat}</svg>`;
}

/* =========================================================================
   SOUND — ambience and effects synthesised with Web Audio (no audio files,
   nothing to license). Starts only after a click (autoplay rules).
   ========================================================================= */
const Sound = (function(){
  let ctx = null, master = null, cur = null, layer = null, noiseBuf = null;
  function ready(){
    if(ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return false;
    try { ctx = new AC(); master = ctx.createGain(); master.connect(ctx.destination); applyVolume(); }
    catch(e){ ctx = null; return false; }
    return true;
  }
  function applyVolume(){ if(master) master.gain.setTargetAtTime(SET.sound ? SET.volume : 0, ctx.currentTime, 0.1); }
  function noise(){
    if(noiseBuf) return noiseBuf;
    const len = ctx.sampleRate * 4, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for(let i = 0; i < len; i++){ const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    return noiseBuf = b;
  }
  function src(){ const s = ctx.createBufferSource(); s.buffer = noise(); s.loop = true; return s; }
  function stopLayer(l, t = 1.2){
    if(!l) return;
    try { l.gain.gain.setTargetAtTime(0, ctx.currentTime, t / 3); } catch(e){}
    l.timers.forEach(clearInterval);
    setTimeout(() => { l.nodes.forEach(n => { try { n.stop && n.stop(); } catch(e){} try { n.disconnect(); } catch(e){} }); }, t * 1000 + 200);
  }
  function ambience(kind){
    if(!kind || kind === cur) return;
    if(!ready()) return;
    if(ctx.state === 'suspended') ctx.resume().catch(() => {});
    stopLayer(layer); cur = kind;
    const g = ctx.createGain(); g.gain.value = 0; g.connect(master);
    const L = { gain:g, nodes:[g], timers:[] };
    const filt = (type, f, q = 0.7) => { const n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; L.nodes.push(n); return n; };
    const bed = (type, f, vol) => { const s = src(), fl = filt(type, f), gg = ctx.createGain(); gg.gain.value = vol; s.connect(fl).connect(gg).connect(g); s.start(); L.nodes.push(s, gg); };
    const tone = (f, vol, type = 'sine') => { const o = ctx.createOscillator(), gg = ctx.createGain(); o.type = type; o.frequency.value = f; gg.gain.value = vol; o.connect(gg).connect(g); o.start(); L.nodes.push(o, gg); return o; };
    const every = (ms, fn) => L.timers.push(setInterval(() => { if(ctx.state === 'running') fn(); }, ms));
    switch(kind){
      case 'cabin':    bed('lowpass', 340, 0.9); tone(118, 0.012); break;
      case 'terminal': bed('bandpass', 520, 0.35); bed('lowpass', 200, 0.3); break;
      case 'hall':     bed('bandpass', 420, 0.28); bed('lowpass', 160, 0.25); break;
      case 'carousel': bed('lowpass', 420, 0.45); every(1150, () => blip('clank')); break;
      case 'outside':  bed('lowpass', 800, 0.4); every(3800, () => { if(Math.random() < 0.7) blip('swoosh'); }); break;
      case 'car':      bed('lowpass', 170, 1.0); tone(52, 0.02, 'triangle'); break;
      case 'hotel':    bed('lowpass', 260, 0.12);
        [220, 277.2, 329.6, 415.3].forEach((f, i) => { const o = tone(f, 0.008); const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.07 + i * 0.03; lg.gain.value = 0.006; lfo.connect(lg).connect(o.frequency); lfo.start(); L.nodes.push(lfo, lg); });
        break;
    }
    g.gain.setTargetAtTime(kind === 'hotel' ? 0.8 : 0.55, ctx.currentTime, 0.6);
    layer = L;
  }
  function env(o, g, t0, a, d, peak){ g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(peak, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d); o.start(t0); o.stop(t0 + a + d + 0.05); }
  function note(f, t, dur, vol, type = 'sine'){ const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f; o.connect(g).connect(master); env(o, g, ctx.currentTime + t, 0.01, dur, vol); }
  function burst(t, dur, vol, type, f, sweep){
    const s = ctx.createBufferSource(); s.buffer = noise(); const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; const g = ctx.createGain();
    if(sweep) fl.frequency.exponentialRampToValueAtTime(sweep, ctx.currentTime + t + dur);
    s.connect(fl).connect(g).connect(master); env(s, g, ctx.currentTime + t, 0.02, dur, vol);
  }
  function blip(name){
    if(!ready() || !SET.sound) return;
    if(ctx.state === 'suspended') ctx.resume().catch(() => {});
    switch(name){
      case 'chime':  note(660, 0, 1.2, 0.18); note(523.3, 0.42, 1.4, 0.16); break;
      case 'notify': note(1046, 0, 0.18, 0.12); note(1318, 0.12, 0.25, 0.1); break;
      case 'stamp':  burst(0, 0.12, 0.7, 'lowpass', 600); note(80, 0, 0.2, 0.35, 'triangle'); break;
      case 'reward': [523.3, 659.3, 784, 1046.5].forEach((f, i) => note(f, i * 0.11, 0.6, 0.12, 'triangle')); break;
      case 'good':   note(784, 0, 0.18, 0.1, 'triangle'); note(1046.5, 0.09, 0.3, 0.1, 'triangle'); break;
      case 'soft':   note(330, 0, 0.25, 0.08, 'triangle'); break;
      case 'clank':  burst(0, 0.08, 0.25, 'bandpass', 900); break;
      case 'swoosh': burst(0, 1.2, 0.35, 'bandpass', 300, 1400); break;
      case 'whoosh': burst(0, 0.6, 0.3, 'bandpass', 1600, 200); break;
      case 'typing': for(let i = 0; i < 6; i++) burst(i * 0.09 + Math.random() * 0.03, 0.03, 0.25, 'highpass', 2500); break;
    }
  }
  return {
    ambience, sfx: blip, applyVolume: () => ctx && applyVolume(),
    suspend(){ if(ctx && ctx.state === 'running') ctx.suspend().catch(() => {}); },
    resume(){ if(ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); },
    stop(){ stopLayer(layer, 0.6); layer = null; cur = null; },
    unlock(){ ready(); if(ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); }
  };
})();

/* =========================================================================
   VOICE — browser text-to-speech with a different voice/pitch per character.
   (This is synthetic speech, not recorded voice acting.)
   ========================================================================= */
const Voice = (function(){
  const ok = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  let voices = [];
  const FEM = /(female|samantha|victoria|karen|zira|aria|jenny|ava|allison|susan|joanna|salli|kimberly|michelle|emma|google us english)/i;
  const MAL = /(male|alex|daniel|fred|david|guy|mark|tom|aaron|matthew|joey|justin|eric|roger|christopher|andrew|brian)/i;
  function load(){
    if(!ok) return;
    const all = window.speechSynthesis.getVoices() || [];
    voices = all.filter(v => /^en[-_]US/i.test(v.lang));
    if(!voices.length) voices = all.filter(v => /^en/i.test(v.lang));
  }
  if(ok){ load(); try { window.speechSynthesis.addEventListener('voiceschanged', load); } catch(e){ window.speechSynthesis.onvoiceschanged = load; } }
  function pick(cfg){
    if(!voices.length) return null;
    const pool = cfg.g === 'f' ? voices.filter(v => FEM.test(v.name) && !/male/i.test(v.name.replace(/female/i, '')))
               : cfg.g === 'm' ? voices.filter(v => MAL.test(v.name) && !FEM.test(v.name)) : voices;
    const list = pool.length ? pool : voices;
    return list[(cfg.idx || 0) % list.length];
  }
  let current = null;
  function speakAs(who, text, opts = {}){
    return new Promise(res => {
      if(!ok || !text){ res(false); return; }
      try {
        window.speechSynthesis.cancel();
        const cfg = (SPEAKERS[who] && SPEAKERS[who].voice) || { g:'any', pitch:1, rate:0.95 };
        const u = new SpeechSynthesisUtterance(String(text).replace(/[\u{1F300}-\u{1FAFF}☀-➿]/gu, ''));
        const v = pick(cfg); if(v) u.voice = v;
        u.lang = (v && v.lang) || 'en-US';
        u.pitch = cfg.pitch || 1;
        u.rate = (cfg.rate || 0.95) * ((opts.slow || SET.slow) ? 0.72 : 1);
        let done = false; const fin = r => { if(!done){ done = true; current = null; res(r); } };
        u.onend = () => fin(true); u.onerror = () => fin(false);
        setTimeout(() => fin(true), 1500 + String(text).length * 110);
        current = u;
        window.speechSynthesis.speak(u);
      } catch(e){ res(false); }
    });
  }
  return { available: () => ok, speak: speakAs, stop(){ if(ok){ try { window.speechSynthesis.cancel(); } catch(e){} } } };
})();

/* =========================================================================
   RECORDER — microphone answers via MediaRecorder. Recordings stay on this
   device (a blob URL in memory); nothing is uploaded. Only "you recorded
   N seconds" is saved to progress.
   ========================================================================= */
const RECORDERS = new Set();
function canRecord(){ return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder); }
function makeRecorder(host, { minSec = 2, onChange } = {}){
  let stream = null, rec = null, chunks = [], url = null, startAt = 0, tick = null, seconds = 0, state = 'idle', error = '';
  const api = { get seconds(){ return seconds; }, get ready(){ return state === 'done' && seconds >= minSec; }, destroy, get state(){ return state; } };
  RECORDERS.add(api);
  function stopTracks(){ if(stream){ stream.getTracks().forEach(t => t.stop()); stream = null; } }
  function draw(){
    let h = '';
    if(state === 'idle') h = `<button type="button" class="ep1-btn ep1-rec-go" data-r="start">🎙️ Start recording</button><span class="ep1-rec-note">${canRecord() ? 'Your browser will ask for microphone access.' : 'Recording isn’t supported in this browser — please type instead.'}</span>`;
    if(state === 'asking') h = `<span class="ep1-rec-note">Waiting for microphone permission…</span>`;
    if(state === 'rec') h = `<span class="ep1-rec-dot" aria-hidden="true"></span><span class="ep1-rec-time" aria-live="off">REC ${fmtTime(seconds)}</span><button type="button" class="ep1-btn ep1-btn-hot" data-r="stop">■ Stop</button>`;
    if(state === 'done') h = `<span class="ep1-rec-ok">✓ Recorded ${fmtTime(seconds)}</span>
        <button type="button" class="ep1-btn" data-r="play">▶ Listen</button>
        <button type="button" class="ep1-btn ep1-btn-ghost" data-r="again">↺ Record again</button>
        <button type="button" class="ep1-btn ep1-btn-ghost" data-r="del" aria-label="Delete recording">🗑</button>
        ${seconds < minSec ? `<span class="ep1-rec-note">A little longer, please (at least ${minSec} seconds).</span>` : ''}`;
    if(state === 'error') h = `<span class="ep1-rec-note ep1-warn">${esc(error)}</span><button type="button" class="ep1-btn ep1-btn-ghost" data-r="retry">Try again</button>`;
    host.innerHTML = `<div class="ep1-rec">${h}</div><audio class="ep1-rec-audio" ${url ? `src="${url}"` : ''} preload="auto" hidden></audio>
      <p class="ep1-rec-privacy">🔒 Your recording stays on this device and isn't uploaded. Only the fact that you recorded is saved — the audio itself can't be recovered later.</p>`;
    onChange && onChange(api);
  }
  async function start(){
    if(!canRecord()){ state = 'error'; error = "Recording isn't available in this browser. You can type your answer instead."; draw(); return; }
    state = 'asking'; draw();
    try { stream = await navigator.mediaDevices.getUserMedia({ audio:true }); }
    catch(e){ state = 'error'; error = "Microphone access was blocked or isn't available. No problem — type your answer instead."; draw(); return; }
    chunks = []; seconds = 0;
    try { rec = new MediaRecorder(stream); } catch(e){ stopTracks(); state = 'error'; error = "Recording couldn't start here. Please type your answer instead."; draw(); return; }
    rec.ondataavailable = e => { if(e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      stopTracks(); clearInterval(tick);
      if(url) URL.revokeObjectURL(url);
      url = chunks.length ? URL.createObjectURL(new Blob(chunks, { type: rec.mimeType || 'audio/webm' })) : null;
      state = url ? 'done' : 'error'; if(!url) error = 'Nothing was recorded. Please try again.';
      draw();
    };
    rec.start(); startAt = Date.now(); state = 'rec'; draw();
    tick = setInterval(() => { seconds = (Date.now() - startAt) / 1000; const t = host.querySelector('.ep1-rec-time'); if(t) t.textContent = 'REC ' + fmtTime(seconds); if(seconds > 180) stop(); }, 250);
  }
  function stop(){ if(rec && rec.state === 'recording'){ seconds = (Date.now() - startAt) / 1000; rec.stop(); } }
  function reset(){ if(url) URL.revokeObjectURL(url); url = null; seconds = 0; state = 'idle'; draw(); }
  host.addEventListener('click', e => {
    const b = e.target.closest('[data-r]'); if(!b) return;
    const a = b.dataset.r;
    if(a === 'start' || a === 'retry') start();
    if(a === 'stop') stop();
    if(a === 'play'){ const au = host.querySelector('audio'); if(au){ au.currentTime = 0; au.play().catch(() => {}); } }
    if(a === 'again'){ reset(); start(); }
    if(a === 'del') reset();
  });
  function destroy(){ try { if(rec && rec.state === 'recording') rec.stop(); } catch(e){} stopTracks(); clearInterval(tick); if(url) URL.revokeObjectURL(url); url = null; RECORDERS.delete(api); }
  draw();
  return api;
}
function destroyRecorders(){ Array.from(RECORDERS).forEach(r => r.destroy()); }

/* =========================================================================
   STATE — episode progress + persistent world changes
   ========================================================================= */
function freshState(){
  return { sceneId:null, nodeId:null, completedScenes:[], flags:{}, choices:{}, tasks:[], answers:{},
           explored:[], final:null, completed:false, completedAt:null, startedAt:null, plays:0 };
}
function st(){
  if(!DATA.episodes) DATA.episodes = {};
  if(!DATA.episodes.ep1) DATA.episodes.ep1 = freshState();
  const s = DATA.episodes.ep1;
  ['completedScenes','tasks','explored'].forEach(k => { if(!Array.isArray(s[k])) s[k] = []; });
  ['flags','choices','answers'].forEach(k => { if(!s[k] || typeof s[k] !== 'object') s[k] = {}; });
  return s;
}
function save(important){
  if(typeof window.saveProgress !== 'function') return;
  try { window.saveProgress({ delay: important ? 600 : 4000 }); } catch(e){ console.warn('Life in LA: save failed', e); }
}
function taskDone(key){ const s = st(); if(key && !s.tasks.includes(key)) s.tasks.push(key); }

const ACH_DEFS = {
  'first-talk':     { icon:'💬', name:'First Conversation', total:1 },
  'problem-solver': { icon:'🧳', name:'Problem Solver', total:1 },
  'la-newcomer':    { icon:'🌴', name:'LA Newcomer', total:1 }
};
function ensureAch(id){
  let a = DATA.achievements.find(x => x.id === id);
  if(!a && ACH_DEFS[id]){ a = Object.assign({ id, progress:0 }, ACH_DEFS[id]); DATA.achievements.splice(2, 0, a); }
  return a;
}
function unlockAch(id){
  const a = ensureAch(id); if(!a || a.done) return null;
  a.progress = a.total; a.done = true; a.locked = false;
  return a;
}
function addPhrase(id){
  const p = PHRASES[id]; if(!p) return false;
  if(DATA.phrases.some(x => x.id === id || (x.en || '').toLowerCase() === p.en.toLowerCase())) return false;
  DATA.phrases.unshift({ id, en:p.en, ua:p.ua, ex:p.ex, tag:p.tag, ep1:true });
  return true;
}
function hasPhrase(id){ const p = PHRASES[id]; return !!p && DATA.phrases.some(x => x.id === id || (x.en || '').toLowerCase() === p.en.toLowerCase()); }
function giveItem(name){ if(!DATA.items.includes(name)){ DATA.items.push(name); return true; } return false; }

const CHRIS = { id:'chris', name:'Chris', role:'Exchange program driver', color:'#FFB199', dark:true, revealed:true,
  bio:"Your exchange program's driver. Calm, friendly — the first person to welcome you to LA. He knows something about tomorrow…",
  catch:"“Long flight?” · “Let's just say…”" };
function meet(id){
  if(id === 'chris' && !DATA.people.some(p => p.id === 'chris')){ DATA.people.splice(1, 0, Object.assign({}, CHRIS)); return true; }
  return false;
}

/* ---------- phone threads ---------- */
const COORD_THREAD = { id:'coordinator', name:'Exchange Program', color:'#6DBB75', snippet:'', time:'', unread:0, online:false, official:true, chat:[] };
function thread(id){
  let t = DATA.messages.find(m => m.id === id);
  if(!t && id === 'coordinator'){ t = JSON.parse(JSON.stringify(COORD_THREAD)); DATA.messages.push(t); }
  if(t && !Array.isArray(t.chat)) t.chat = [];
  return t;
}
function refreshMeta(t){
  const last = t.chat[t.chat.length - 1]; if(!last) return;
  t.snippet = last.kind === 'voice' ? '🎤 Voice message' : (last.from === 'me' ? 'You: ' : '') + last.text;
  t.time = last.time || 'Just now';
}
function pushChat(tid, msg){
  const t = thread(tid);
  if(msg.id){
    const ex = t.chat.find(m => m.id === msg.id);
    if(ex){ if(msg.from === 'me') Object.assign(ex, msg); refreshMeta(t); return ex; }
  }
  t.chat.push(msg); refreshMeta(t);
  return msg;
}
function hasMsg(tid, id){ const t = thread(tid); return !!t.chat.find(m => m.id === id); }

/* =========================================================================
   SHELL — the full-screen episode view
   ========================================================================= */
const EP = { root:null, open:false, scene:null, nodeId:null, token:0, bgKey:null, onPrimary:null, line:null,
             phoneScripted:false, phoneThread:null, pushedHistory:false, paused:false, hot:true };

function build(){
  if(EP.root) return;
  const root = document.createElement('div');
  root.id = 'ep1'; root.className = 'ep1'; root.hidden = true;
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Episode 1: Arrival');
  root.innerHTML = `
    <div class="ep1-stage" id="ep1Stage">
      <div class="ep1-bg" id="ep1Bg"></div>
      <div class="ep1-grade" aria-hidden="true"></div>
      <div class="ep1-hot" id="ep1Hot"></div>
      <div class="ep1-game" id="ep1Game" hidden></div>
    </div>
    <header class="ep1-top">
      <div class="ep1-top-l">
        <button class="ep1-ib" id="ep1Back" aria-label="Back to my room" title="Back to my room">‹</button>
        <div class="ep1-meta"><div class="ep1-eyebrow">Season 1 · Episode 1 · <span id="ep1Clock"></span></div><div class="ep1-scene-name" id="ep1SceneName"></div></div>
      </div>
      <div class="ep1-top-c">
        <div class="ep1-prog" role="progressbar" aria-label="Episode progress" aria-valuemin="0" aria-valuemax="100" id="ep1Prog"><span id="ep1ProgFill"></span></div>
        <div class="ep1-obj" id="ep1Obj"></div>
      </div>
      <div class="ep1-top-r">
        <button class="ep1-ib" data-top="bag" aria-label="Backpack" title="Backpack">🎒</button>
        <button class="ep1-ib" data-top="phone" aria-label="Phone" title="Phone" id="ep1PhoneBtn">📱<span class="ep1-dot" hidden></span></button>
        <button class="ep1-ib ep1-cc" data-top="cc" aria-label="Subtitles" title="Subtitles">CC</button>
        <button class="ep1-ib" data-top="sound" aria-label="Sound on/off" title="Sound"></button>
        <button class="ep1-ib" data-top="settings" aria-label="Settings" title="Settings">⚙️</button>
        <button class="ep1-ib" data-top="pause" aria-label="Pause" title="Pause">⏸</button>
      </div>
    </header>
    <div class="ep1-tray" id="ep1Tray" hidden></div>
    <section class="ep1-dialog" id="ep1Dialog" aria-live="polite" hidden></section>
    <div class="ep1-pop" id="ep1Pop" role="dialog" aria-label="Details" hidden></div>
    <div class="ep1-phone" id="ep1Phone" hidden></div>
    <div class="ep1-sheet" id="ep1Sheet" hidden></div>
    <div class="ep1-notif" id="ep1Notif" hidden></div>
    <div class="ep1-toasts" id="ep1Toasts" aria-live="polite"></div>
    <div class="ep1-cine" id="ep1Cine" hidden></div>
    <div class="ep1-modal" id="ep1Modal" hidden></div>
    <div class="ep1-fade" id="ep1Fade" aria-hidden="true"></div>`;
  document.body.appendChild(root);
  EP.root = root;
  ['stage','bg','hot','game','tray','dialog','pop','phone','sheet','notif','toasts','cine','modal','fade'].forEach(k => {
    EP[k] = root.querySelector('#ep1' + k.charAt(0).toUpperCase() + k.slice(1));
  });
  EP.dlg = EP.dialog;

  root.querySelector('#ep1Back').addEventListener('click', () => close());
  root.querySelector('.ep1-top-r').addEventListener('click', e => {
    const b = e.target.closest('[data-top]'); if(!b) return;
    const a = b.dataset.top;
    if(a === 'bag') openBackpack();
    if(a === 'phone') browsePhone();
    if(a === 'cc'){ SET.subs = !SET.subs; saveSettings(); syncTop(); if(EP.line && EP.dlg.querySelector('.ep1-text.say')) rerenderSubs(); }
    if(a === 'sound'){ SET.sound = !SET.sound; if(!SET.sound) Voice.stop(); saveSettings(); Sound.applyVolume(); syncTop(); }
    if(a === 'settings') openSettings();
    if(a === 'pause') pause();
  });
  /* one delegated handler for everything inside the dialogue panel */
  EP.dlg.addEventListener('click', e => {
    const v = e.target.closest('[data-vocab]'); if(v){ vocabCard(v.dataset.vocab); return; }
    const a = e.target.closest('[data-act]');
    if(a){
      const act = a.dataset.act;
      if(act === 'replay' && EP.line) Voice.speak(EP.line.who, EP.line.text);
      if(act === 'slow' && EP.line) Voice.speak(EP.line.who, EP.line.text, { slow:true });
      if(act === 'ua'){ const show = $$('.ep1-ua, .ep1-oua', EP.dlg).some(x => x.hidden); $$('.ep1-ua, .ep1-oua', EP.dlg).forEach(x => x.hidden = !show); a.setAttribute('aria-pressed', show); }
      if(act === 'showsubs') rerenderSubs(true);
      return;
    }
    const p = e.target.closest('[data-primary]');
    if(p && EP.onPrimary){ const fn = EP.onPrimary; EP.onPrimary = null; p.disabled = true; fn(); }
  });
  EP.hot.addEventListener('click', e => { const b = e.target.closest('[data-hot]'); if(b) openHotspot(b.dataset.hot); });
  EP.pop.addEventListener('click', e => {
    if(e.target.closest('[data-pop-close]')) closePop();
    const s = e.target.closest('[data-save-vocab]');
    if(s){ if(addPhrase(s.dataset.saveVocab)){ toast('🎒', 'Saved to Backpack', PHRASES[s.dataset.saveVocab].en); save(true); } s.outerHTML = '<span class="ep1-saved">✓ In your Backpack</span>'; }
    const sp = e.target.closest('[data-say]'); if(sp) Voice.speak('you', sp.dataset.say, { slow: sp.dataset.slow === '1' });
  });
  root.tabIndex = -1;
  document.addEventListener('keydown', onKey, true);
  /* keep keyboard focus inside the episode while it's open */
  document.addEventListener('focusin', e => { if(EP.open && !root.contains(e.target)){ const f = root.querySelector('[data-primary]:not([disabled]), .ep1-opt:not([disabled]), button:not([disabled])'); (f || root).focus({ preventScroll:true }); } });
  /* the episode view must never scroll as a whole (focus/scrollIntoView can nudge it) */
  [root, root.querySelector('#ep1Stage')].forEach(el => el.addEventListener('scroll', () => { if(el.scrollTop || el.scrollLeft){ el.scrollTop = 0; el.scrollLeft = 0; } }));
  /* keep mini-games clear of the dialogue panel, whatever its height */
  const setDlgH = () => root.style.setProperty('--dlgH', (EP.dlg.hidden ? 0 : EP.dlg.offsetHeight) + 'px');
  if(window.ResizeObserver) new ResizeObserver(setDlgH).observe(EP.dlg);
  let hsTimer = 0; window.addEventListener('resize', () => { clearTimeout(hsTimer); hsTimer = setTimeout(() => { if(EP.open) renderHotspots(); }, 150); });
  new MutationObserver(setDlgH).observe(EP.dlg, { attributes:true, attributeFilter:['hidden'] });
  window.addEventListener('popstate', () => { if(EP.open){ EP.pushedHistory = false; close({ fromPop:true }); } });
  window.addEventListener('pagehide', () => { if(EP.open) flushSave(); });
  document.addEventListener('visibilitychange', () => { if(document.hidden && EP.open) flushSave(); });
}
function flushSave(){ try { window.saveProgress && window.saveProgress({ immediate:true }); } catch(e){} }

function syncTop(){
  if(!EP.root) return;
  const cc = EP.root.querySelector('[data-top="cc"]'); cc.classList.toggle('off', !SET.subs); cc.setAttribute('aria-pressed', SET.subs);
  const snd = EP.root.querySelector('[data-top="sound"]'); snd.textContent = SET.sound ? '🔊' : '🔇'; snd.setAttribute('aria-pressed', SET.sound);
  const ph = EP.root.querySelector('#ep1PhoneBtn'); ph.disabled = !st().flags.phoneUnlocked;
  const unread = DATA.messages.reduce((n, m) => n + (m.unread || 0), 0);
  ph.querySelector('.ep1-dot').hidden = !unread;
}
function updateProgress(){
  const sc = EP.scene; if(!sc) return;
  const i = Math.max(0, sc.order.indexOf(EP.nodeId));
  const pct = Math.round(((sc.index + i / sc.order.length) / SCENES.length) * 100);
  EP.root.querySelector('#ep1ProgFill').style.width = pct + '%';
  EP.root.querySelector('#ep1Prog').setAttribute('aria-valuenow', pct);
  EP.root.querySelector('#ep1SceneName').textContent = `${sc.emoji} ${sc.title}`;
  EP.root.querySelector('#ep1Obj').textContent = 'Objective: ' + sc.objective;
  EP.root.querySelector('#ep1Clock').textContent = sc.clock;
}

/* ---------- keyboard ---------- */
function onKey(e){
  if(!EP.open) return;
  if(!EP.root.contains(e.target)){ e.preventDefault(); e.stopPropagation(); EP.root.focus({ preventScroll:true }); }
  const tag = (e.target.tagName || '').toLowerCase();
  const typing = tag === 'textarea' || (tag === 'input' && e.target.type !== 'checkbox' && e.target.type !== 'range');
  if(e.key === 'Escape'){
    e.stopPropagation();
    if(!EP.pop.hidden){ closePop(); return; }
    if(!EP.modal.hidden){ closeModalEp(); return; }
    pause(); return;
  }
  if(typing || !EP.modal.hidden) return;
  if((e.key === 'Enter' || e.key === ' ') && !e.target.closest('button, a, [role="button"]')){
    const p = $('[data-primary]:not([disabled])', EP.cine.hidden ? EP.root : EP.cine);
    if(p){ e.preventDefault(); p.click(); }
  }
  if(/^[1-4]$/.test(e.key)){
    const area = !EP.phone.hidden ? EP.phone : EP.dlg;
    const opts = $$('.ep1-opt:not([disabled])', area);
    const b = opts[+e.key - 1]; if(b){ e.preventDefault(); b.click(); }
  }
}

/* ---------- small UI pieces ---------- */
function faceMini(dark){ return typeof window.faceSVG === 'function' ? window.faceSVG(dark) : '🙂'; }
function head(who, kind){
  if(kind === 'think') return `<div class="ep1-head"><span class="ep1-who ep1-thought-label">💭 Your thoughts</span></div>`;
  if(kind === 'narr')  return `<div class="ep1-head"><span class="ep1-who ep1-thought-label">🎬 Scene</span></div>`;
  if(kind === 'turn')  return `<div class="ep1-head"><span class="ep1-who ep1-turn">${who}</span></div>`;
  const sp = SPEAKERS[who] || { name:who, color:'#999' };
  return `<div class="ep1-head"><span class="ep1-ava" style="--c:${sp.color}${sp.dark ? ';color:#2a1a0a' : ''}" aria-hidden="true">${sp.icon || faceMini(sp.dark)}</span>
    <span class="ep1-who">${esc(sp.name)}</span>${sp.role ? `<span class="ep1-role">${esc(sp.role)}</span>` : ''}</div>`;
}
function lineHTML(text, vocab){
  let segs = [{ t:String(text) }];
  (vocab || []).forEach(id => {
    const p = PHRASES[id]; if(!p) return;
    const re = new RegExp(p.match, 'i');
    segs = segs.flatMap(sg => {
      if(sg.v) return [sg];
      const m = sg.t.match(re); if(!m) return [sg];
      return [{ t:sg.t.slice(0, m.index) }, { t:m[0], v:id }, { t:sg.t.slice(m.index + m[0].length) }];
    });
  });
  let n = 0;
  return segs.map(sg => sg.v
    ? `<button type="button" class="ep1-vocab w" style="--d:${(n++) * 32}ms" data-vocab="${sg.v}" title="Tap for meaning">${esc(sg.t)}</button>`
    : sg.t.split(/(\s+)/).map(w => w.trim() ? `<span class="w" style="--d:${(n++) * 32}ms">${esc(w)}</span>` : w).join('')
  ).join('');
}
function tools({ audio = true, ua, vocab } = {}){
  return `<div class="ep1-tools">
    ${audio && Voice.available() ? `<button type="button" class="ep1-tool" data-act="replay" aria-label="Replay audio" title="Replay">🔊</button><button type="button" class="ep1-tool" data-act="slow" aria-label="Play slowly" title="Slower">🐢</button>` : ''}
    ${ua ? `<button type="button" class="ep1-tool" data-act="ua" aria-pressed="${SET.ua}" title="Ukrainian translation">UA</button>` : ''}
    ${(vocab || []).filter(id => PHRASES[id]).map(id => `<button type="button" class="ep1-chip" data-vocab="${id}">💬 ${esc(PHRASES[id].en)}</button>`).join('')}
  </div>`;
}
function dlg(html, cls){
  EP.dlg.hidden = false;
  EP.dlg.className = 'ep1-dialog' + (cls ? ' ' + cls : '') + (isReduced() ? '' : ' ep1-anim');
  EP.dlg.innerHTML = html;
  EP.dlg.scrollTop = 0;
  requestAnimationFrame(() => {
    const f = EP.dlg.querySelector('[data-primary]:not([disabled])') || EP.dlg.querySelector('.ep1-opt:not([disabled]), textarea, button:not([disabled])');
    if(f) try { f.focus({ preventScroll:true }); } catch(e){}
  });
}
function hideDlg(){ EP.dlg.hidden = true; EP.dlg.innerHTML = ''; EP.onPrimary = null; }
function primary(fn){ EP.onPrimary = fn; }
function rerenderSubs(force){
  const t = EP.dlg.querySelector('.ep1-text.say'); if(!t || !EP.line) return;
  t.innerHTML = (SET.subs || force) ? lineHTML(EP.line.text, EP.line.vocab) : subsOffHTML();
}
const subsOffHTML = () => `<span class="ep1-nosubs">🔈 Subtitles are off. <button type="button" class="ep1-link" data-act="showsubs">Show text</button></span>`;
const valOf = (v, f) => typeof v === 'function' ? v(f) : v;

function toast(icon, title, sub){
  const t = document.createElement('div');
  t.className = 'ep1-toast';
  t.innerHTML = `<span class="ep1-toast-i" aria-hidden="true">${icon}</span><div><b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;
  EP.toasts.appendChild(t);
  setTimeout(() => t.classList.add('out'), 3400);
  setTimeout(() => t.remove(), 3900);
}
function pop(html){
  EP.pop.hidden = false;
  EP.pop.innerHTML = `<button type="button" class="ep1-pop-x" data-pop-close aria-label="Close">✕</button>${html}`;
  requestAnimationFrame(() => { const b = EP.pop.querySelector('button:not(.ep1-pop-x)') || EP.pop.querySelector('.ep1-pop-x'); b && b.focus({ preventScroll:true }); });
}
function closePop(){ EP.pop.hidden = true; EP.pop.innerHTML = ''; }
function vocabCard(id){
  const p = PHRASES[id]; if(!p) return;
  pop(`<div class="ep1-vcard">
    <div class="ep1-vcard-en">${esc(p.en)}</div>
    <div class="ep1-vcard-ua">🇺🇦 ${esc(p.ua)}</div>
    <div class="ep1-vcard-simple">${esc(p.simple)}</div>
    <div class="ep1-vcard-ex">${esc(p.ex)}</div>
    <div class="ep1-row">
      ${Voice.available() ? `<button type="button" class="ep1-btn" data-say="${esc(p.en)}">🔊 Listen</button><button type="button" class="ep1-btn ep1-btn-ghost" data-say="${esc(p.en)}" data-slow="1">🐢 Slow</button>` : ''}
      ${hasPhrase(id) ? '<span class="ep1-saved">✓ In your Backpack</span>' : `<button type="button" class="ep1-btn ep1-btn-hot" data-save-vocab="${id}">🎒 Save to Backpack</button>`}
    </div></div>`);
}

/* ---------- backgrounds, camera, hotspots ---------- */
function setBg(key){
  if(!key || EP.bgKey === key) return;
  EP.bgKey = key; EP.stage.dataset.bg = key;
  const show = html => {
    const layer = document.createElement('div');
    layer.className = 'ep1-bglayer'; layer.innerHTML = html;
    EP.bg.appendChild(layer);
    requestAnimationFrame(() => requestAnimationFrame(() => layer.classList.add('on')));
    const old = $$('.ep1-bglayer', EP.bg).filter(l => l !== layer);
    setTimeout(() => old.forEach(l => l.remove()), 1100);
  };
  const showPhoto = () => { show(photoLayers(key)); EP.stage.classList.add('has-photo'); requestAnimationFrame(renderHotspots); };
  if(photoState[key] === 'ok'){ showPhoto(); return; }
  if(photoState[key] === 'missing'){ show(sceneArt(key)); EP.stage.classList.remove('has-photo'); return; }
  /* still loading: wait a moment for the photo before falling back to the drawing */
  let shown = false;
  const fallback = setTimeout(() => { if(EP.bgKey === key && !shown){ shown = 'art'; show(sceneArt(key)); EP.stage.classList.remove('has-photo'); } }, 700);
  probePhoto(key).then(r => {
    clearTimeout(fallback);
    if(EP.bgKey !== key) return;
    if(r === 'ok'){ shown = true; showPhoto(); }
    else if(!shown){ shown = 'art'; show(sceneArt(key)); EP.stage.classList.remove('has-photo'); }
  });
}
function setCam(cam){ EP.bg.classList.remove('cam-wide','cam-push','cam-drift','cam-shake'); void EP.bg.offsetWidth; if(cam) EP.bg.classList.add('cam-' + cam); }
function bgAt(scene, nodeId){
  let bg = scene.bg, cam = null, night = false;
  for(const k of scene.order){ const n = scene.nodes[k]; if(k === nodeId) break; if(n.bg) bg = n.bg; if(n.cam) cam = n.cam; if(n.fx === 'nightfall') night = true; }
  const n = scene.nodes[nodeId]; if(n && n.bg) bg = n.bg;
  return { bg, cam, night };
}
/* Hotspots sit at x/y % of the stage. With a photo on screen, `ph` gives the
   spot in photo coordinates instead (per background key when it differs), so
   it stays on the right object whatever the screen shape. */
function hotPos(h){
  const ph = h.ph && (Array.isArray(h.ph) ? h.ph : h.ph[EP.bgKey]);
  const layers = ph && EP.stage.classList.contains('has-photo') ? $$('.ep1-bglayer', EP.bg) : [];
  const box = layers.length && layers[layers.length - 1].querySelector('.ep1-pic-box');
  if(!box) return [h.x, h.y];
  const b = box.getBoundingClientRect(), r = EP.hot.getBoundingClientRect();
  if(!b.width || !r.width) return [h.x, h.y];
  const x = (b.left + b.width * ph[0] / 100 - r.left) / r.width * 100;
  const y = (b.top + b.height * ph[1] / 100 - r.top) / r.height * 100;
  return [Math.min(95, Math.max(5, x)).toFixed(1), Math.min(86, Math.max(11, y)).toFixed(1)];
}
function renderHotspots(){
  const sc = EP.scene; if(!sc){ EP.hot.innerHTML = ''; return; }
  EP.hot.innerHTML = (sc.hotspots || []).filter(h => !h.bgs || h.bgs.includes(EP.bgKey)).map(h => { const [hx, hy] = hotPos(h); return `
    <button type="button" class="ep1-hs ${st().explored.includes(h.id) ? 'seen' : ''}" style="left:${hx}%;top:${hy}%" data-hot="${h.id}" aria-label="${esc(h.label)}">
      <span class="ep1-hs-dot" aria-hidden="true">${h.icon}</span><span class="ep1-hs-label">${esc(h.label)}</span></button>`; }).join('');
}
function openHotspot(hid){
  const h = (EP.scene.hotspots || []).find(x => x.id === hid); if(!h) return;
  const s = st(); if(!s.explored.includes(hid)){ s.explored.push(hid); save(); }
  if(h.item){ const it = ITEMS[h.item] || { icon:'🎒', desc:'' };
    pop(`<div class="ep1-item-big">${it.icon}</div><div class="ep1-vcard-en">${esc(h.item)}</div><div class="ep1-vcard-simple">${esc(it.desc)}</div>`); }
  else pop(`<div class="ep1-head"><span class="ep1-who ep1-thought-label">💭 ${esc(h.label)}</span></div>
    <div class="ep1-text think">${esc(h.text)}</div>${h.ua ? `<div class="ep1-ua" ${SET.ua ? '' : 'hidden'}>${esc(h.ua)}</div><button type="button" class="ep1-tool" onclick="this.previousElementSibling.hidden=!this.previousElementSibling.hidden">UA</button>` : ''}`);
  renderHotspots();
}
function hotspotsVisible(on){ EP.hot.classList.toggle('off', !on); }

/* =========================================================================
   ENGINE
   ========================================================================= */
function gotoScene(sceneId, nodeId, opts = {}){
  const sc = SCENE_BY_ID[sceneId]; if(!sc){ console.warn('Unknown scene', sceneId); return; }
  EP.scene = sc;
  const startNode = nodeId && sc.nodes[nodeId] ? nodeId : sc.order[0];
  const look = bgAt(sc, startNode);
  EP.bgKey = null; setBg(look.bg); setCam(look.cam); EP.stage.classList.toggle('ep1-night', look.night);
  Sound.ambience(sc.ambience);
  closePop(); hideGame(); closePhone(); EP.tray.hidden = true; EP.notif.hidden = true;
  renderHotspots();
  const s = st(); s.sceneId = sc.id;
  if(sc.id === 's2' || sc.index > 1) s.flags.phoneUnlocked = true;
  syncTop();
  if(startNode === sc.order[0] && !opts.noCard && sc.id !== 's1') sceneCard(sc, () => runNode(startNode));
  else runNode(startNode);
}
function sceneCard(sc, then){
  hideDlg(); hotspotsVisible(false);
  const tok = ++EP.token;
  EP.cine.hidden = false; EP.cine.className = 'ep1-cine ep1-cine-scene';
  EP.cine.innerHTML = `<div class="ep1-sc-card"><div class="ep1-sc-n">SCENE ${sc.n} OF 8</div><div class="ep1-sc-t">${sc.emoji} ${esc(sc.title)}</div><div class="ep1-sc-clock">${sc.clock} · Day 1</div></div>
    <button type="button" class="ep1-skip" data-primary>Skip ▸</button>`;
  let done = false;
  const fin = () => { if(done || tok !== EP.token) return; done = true; EP.cine.hidden = true; EP.cine.innerHTML = ''; then(); };
  EP.cine.querySelector('[data-primary]').addEventListener('click', fin);
  setTimeout(fin, isReduced() ? 900 : 2300);
}

function runNode(id){
  if(!EP.open || !EP.scene) return;
  const sc = EP.scene, node = sc.nodes[id];
  if(!node){ console.warn('Missing node', sc.id, id); return endScene(sc.nodes.end ? sc.nodes.end.next : null); }
  const tok = ++EP.token;
  EP.nodeId = id;
  const s = st(); s.sceneId = sc.id; s.nodeId = id; if(!s.startedAt) s.startedAt = Date.now();
  save(false);
  updateProgress();
  if(node.bg){ setBg(node.bg); renderHotspots(); }
  if(node.cam) setCam(node.cam);
  if(node.fx === 'nightfall') EP.stage.classList.add('ep1-night');
  if(node.sfx && node.type !== 'say') Sound.sfx(node.sfx);
  if(node.set) Object.assign(s.flags, node.set);
  if(node.meet && meet(node.meet)){ toast('👥', 'New person in People', SPEAKERS[node.meet] ? SPEAKERS[node.meet].name : node.meet); save(true); }
  closePop(); EP.tray.hidden = true;
  hotspotsVisible(!['notify','phone','carousel','pick','describe','navmap','board','final','complete','cards','reward'].includes(node.type));
  try {
    const R = RENDER[node.type];
    if(!R) throw new Error('No renderer for ' + node.type);
    R(node, id, tok);
  } catch(err){
    console.error('Life in LA: node failed', sc.id, id, err);
    dlg(`<div class="ep1-text narr">Oops — something didn't load here. You can keep going.</div><div class="ep1-row"><button class="ep1-next" data-primary>Continue ▸</button></div>`);
    primary(() => next(node, id));
  }
}
function next(node, id, override){
  const f = st().flags;
  let target = override || valOf(node.next, f);
  if(!target){ const i = EP.scene.order.indexOf(id); target = EP.scene.order[i + 1]; }
  if(!target) return endScene(null);
  if(EP.scene.nodes[target]) runNode(target); else transitionTo(target);
}
function endScene(nextScene){
  const s = st();
  if(!s.completedScenes.includes(EP.scene.id)) s.completedScenes.push(EP.scene.id);
  save(true);
  if(nextScene) transitionTo(nextScene);
}
function transitionTo(sceneId){
  const tok = ++EP.token;
  hideDlg(); closePhone(); hideGame();
  Sound.sfx('whoosh');
  EP.fade.classList.add('on');
  setTimeout(() => { if(tok !== EP.token && !EP.open) return; gotoScene(sceneId); setTimeout(() => EP.fade.classList.remove('on'), 120); }, isReduced() ? 150 : 650);
}

/* ---------- renderers ---------- */
const RENDER = {};

RENDER.say = RENDER.think = RENDER.narr = function(node, id, tok){
  showLine(node, () => next(node, id));
  if(node.type === 'say' && node.sfx) Sound.sfx(node.sfx);
};
function showLine(node, onNext){
  const f = st().flags, kind = node.type;
  const text = valOf(node.text, f), ua = valOf(node.ua, f);
  const who = kind === 'say' ? node.who : null;
  const spoken = kind === 'say' && who !== 'you';
  EP.line = { who: who || 'you', text, vocab: node.vocab };
  (node.vocab || []).forEach(v => { if(PHRASES[v]) taskDone('seen:' + v); });
  dlg(`${head(who, kind)}
    <div class="ep1-text ${kind}">${spoken && !SET.subs ? subsOffHTML() : lineHTML(text, node.vocab)}</div>
    ${ua ? `<div class="ep1-ua" ${SET.ua ? '' : 'hidden'}>${esc(ua)}</div>` : ''}
    <div class="ep1-row">${tools({ audio: kind === 'say', ua, vocab: node.vocab })}
      <button type="button" class="ep1-next" data-primary>Continue <span aria-hidden="true">▸</span></button></div>`, 'k-' + kind + (who ? ' w-' + who : ''));
  primary(() => { Voice.stop(); onNext(); });
  if(spoken && SET.voice && SET.sound){
    if(who === 'pilot' || who === 'airport') setTimeout(() => Voice.speak(who, text), 650); else Voice.speak(who, text);
  }
}

RENDER.fx = function(node, id, tok){
  hideDlg();
  setTimeout(() => { if(tok === EP.token) next(node, id); }, node.wait || 600);
};
RENDER.branch = function(node, id){ next(node, id, node.fn(st().flags)); };
RENDER.end = function(node){ endScene(node.next); };

/* Opening titles: city / time / day → ARRIVAL. Skippable. */
RENDER.cards = function(node, id, tok){
  hideDlg();
  EP.cine.hidden = false; EP.cine.className = 'ep1-cine ep1-cine-open';
  setCam('push'); EP.bg.classList.add('cam-land');
  EP.cine.innerHTML = `<div class="ep1-cards" aria-live="polite"></div><button type="button" class="ep1-skip" data-primary>Skip intro ▸</button>`;
  const box = EP.cine.querySelector('.ep1-cards');
  let done = false;
  const finish = () => { if(done) return; done = true; EP.cine.hidden = true; EP.cine.innerHTML = ''; if(tok === EP.token) next(node, id); };
  EP.cine.querySelector('[data-primary]').addEventListener('click', finish);
  const R = isReduced();
  (async () => {
    for(const c of node.cards){
      if(done || tok !== EP.token) return;
      box.innerHTML = `<div class="ep1-card-line">${esc(c)}</div>`;
      await wait(R ? 700 : 1500);
    }
    if(done || tok !== EP.token) return;
    const t = node.title;
    box.innerHTML = `<div class="ep1-title"><div class="ep1-title-eb">${esc(t.eyebrow)}</div><div class="ep1-title-big">${esc(t.big)}</div><div class="ep1-title-sub">${esc(t.sub)}</div></div>`;
    EP.cine.querySelector('[data-primary]').innerHTML = 'Begin ▸';
    await wait(R ? 1200 : 3600);
    finish();
  })();
};

/* Choices — no wrong answers, but they're remembered. */
RENDER.choice = function(node, id){
  const f = st().flags;
  const opts = node.options;
  dlg(`${head(node.speak ? '🗣️ Your turn' : '🤔 Your choice', 'turn')}
    <div class="ep1-q">${esc(node.prompt)}</div>${node.ua ? `<div class="ep1-ua" ${SET.ua ? '' : 'hidden'}>${esc(node.ua)}</div>` : ''}
    <div class="ep1-opts">${opts.map((o, i) => `<button type="button" class="ep1-opt" data-i="${i}">
      <span class="ep1-k" aria-hidden="true">${i + 1}</span>${o.emoji ? `<span class="ep1-emo" aria-hidden="true">${o.emoji}</span>` : ''}
      <span class="ep1-opt-t">${esc(o.text)}${o.ua ? `<small class="ep1-oua" ${SET.ua ? '' : 'hidden'}>${esc(o.ua)}</small>` : ''}</span></button>`).join('')}</div>
    <div class="ep1-row">${tools({ audio:false, ua: node.ua || opts.some(o => o.ua) })}</div>`, 'k-choice');
  $$('.ep1-opt', EP.dlg).forEach(b => b.addEventListener('click', () => {
    $$('.ep1-opt', EP.dlg).forEach(x => x.disabled = true); b.classList.add('picked');
    const o = opts[+b.dataset.i];
    const s = st(); s.choices[EP.scene.id + ':' + id] = o.text;
    if(node.key) f[node.key] = o.value != null ? o.value : o.text;
    if(o.set) Object.assign(f, o.set);
    if(o.vocab) taskDone('seen:' + o.vocab);
    Sound.sfx('soft'); save(true);
    if(node.speak || o.say) setTimeout(() => showLine({ type:'say', who:'you', text:o.text, ua:o.ua, vocab:o.vocab ? [o.vocab] : [] }, () => next(node, id, o.next)), 220);
    else setTimeout(() => next(node, id, o.next), 260);
  }, { once:true }));
};

const POLITENESS = `<div class="ep1-polite">
  <div class="ep1-polite-t">💡 Politeness check</div>
  <div class="ep1-polite-row bad"><b>Help me!</b><span>Sounds like an emergency or an order. 😬</span></div>
  <div class="ep1-polite-row ok"><b>Can you help me?</b><span>Okay — friendly and normal.</span></div>
  <div class="ep1-polite-row good"><b>Could you help me, please?</b><span>Polite — perfect for strangers and staff. ✨</span></div>
  <div class="ep1-polite-ua">«Give me…» звучить як наказ. З незнайомими людьми краще «Could you…, please?»</div></div>`;

/* Quiz — wrong answers get a natural reaction, then clues. Never a dead end. */
RENDER.quiz = function(node, id, tok){
  let wrong = 0; const tried = new Set();
  const f = st().flags;
  const correctIdx = node.options.findIndex(o => o.correct);
  const lineText = node.line;
  if(lineText) EP.line = { who: node.who, text: lineText };
  function draw(fb){
    dlg(`${node.noLine ? head('🤔 Your turn', 'turn') : head(node.who, 'say') + `<div class="ep1-text say">${SET.subs ? lineHTML(lineText) : subsOffHTML()}</div>${node.lineUa ? `<div class="ep1-ua" ${SET.ua ? '' : 'hidden'}>${esc(node.lineUa)}</div>` : ''}`}
      <div class="ep1-q">${esc(node.prompt)}</div>${node.ua ? `<div class="ep1-ua" ${SET.ua ? '' : 'hidden'}>${esc(node.ua)}</div>` : ''}
      <div class="ep1-opts">${node.options.map((o, i) => `<button type="button" class="ep1-opt ${tried.has(i) ? 'tried' : ''} ${wrong >= 3 && i === correctIdx ? 'hint-pulse' : ''}" data-i="${i}" ${tried.has(i) ? 'disabled' : ''}>
        <span class="ep1-k" aria-hidden="true">${i + 1}</span><span class="ep1-opt-t">${esc(o.text)}${o.ua ? `<small class="ep1-oua" ${SET.ua ? '' : 'hidden'}>${esc(o.ua)}</small>` : ''}</span></button>`).join('')}</div>
      <div class="ep1-fb" aria-live="polite">${fb || ''}</div>
      <div class="ep1-row">${tools({ audio: !node.noLine, ua:true })}</div>`, 'k-quiz');
    $$('.ep1-opt:not([disabled])', EP.dlg).forEach(b => b.addEventListener('click', () => pick(+b.dataset.i), { once:true }));
  }
  function pick(i){
    if(tok !== EP.token) return;
    const o = node.options[i];
    if(o.correct){
      $$('.ep1-opt', EP.dlg).forEach(x => x.disabled = true);
      Sound.sfx('good'); taskDone(node.key);
      const s = st(); s.choices[EP.scene.id + ':' + id] = o.text; s.answers[node.key] = { tries: wrong + 1 };
      if(o.value && node.key === 's5_opening') f.opening = o.value;
      save(true);
      if(node.noEcho) return setTimeout(() => next(node, id, o.next), 300);
      return setTimeout(() => showLine({ type:'say', who:'you', text:o.text, ua:o.ua, vocab:o.vocab ? [o.vocab] : [] }, () => next(node, id, o.next)), 250);
    }
    wrong++; tried.add(i); Sound.sfx('soft');
    if(node.polite) f.wasRude = true;
    let fb = '';
    if(o.react){
      const rw = o.who || node.who;
      fb += `<div class="ep1-react">${rw === 'think' ? '<b>💭</b>' : `<b>${esc((SPEAKERS[rw] || {}).name || '')}:</b>`} ${esc(o.react[0])}${o.react[1] ? `<div class="ep1-ua" ${SET.ua ? '' : 'hidden'}>${esc(o.react[1])}</div>` : ''}</div>`;
      if(rw !== 'think' && SET.voice && SET.sound) Voice.speak(rw, o.react[0]);
    }
    if(o.tip === 'politeness') fb += POLITENESS;
    else if(o.tip) fb += `<div class="ep1-tip">💡 ${esc(o.tip)}</div>`;
    const h = node.hints || [];
    if(wrong === 2 && h[0]) fb += `<div class="ep1-hint">🔎 ${esc(h[0])}</div>`;
    if(wrong >= 3){ if(h[1]) fb += `<div class="ep1-hint">🔎 ${esc(h[1])}</div>`; if(h[2]) fb += `<div class="ep1-hint ua">🇺🇦 ${esc(h[2])}</div>`; }
    if(node.polite && tried.size) fb += `<div class="ep1-tip">Try again — choose a better way to start. 🙂</div>`;
    draw(fb);
  }
  draw('');
  if(!node.noLine && SET.voice && SET.sound) Voice.speak(node.who, lineText);
};

/* Listening — listen first, answer, with replay / slow / transcript / UA. */
RENDER.listen = function(node, id, tok){
  let wrong = 0, revealed = (SET.subs && !SET.challenge) || !Voice.available(), done = false, uaOpen = false;
  const tried = new Set(); const correctIdx = node.options.findIndex(o => o.correct);
  EP.line = { who:node.who, text:node.audio };
  function draw(fb){
    const tiles = node.visual === 'carousels';
    dlg(`${head(node.who, 'say')}
      <div class="ep1-player">
        <button type="button" class="ep1-play" data-lp="play" aria-label="Play">▶</button>
        <button type="button" class="ep1-btn ep1-btn-ghost" data-lp="slow">🐢 Slower</button>
        <button type="button" class="ep1-btn ep1-btn-ghost" data-lp="tr">${revealed ? 'Hide text' : '📝 Show text'}</button>
        ${node.ua ? `<button type="button" class="ep1-btn ep1-btn-ghost" data-lp="ua">UA</button>` : ''}
        <span class="ep1-wave ${EP.playing ? 'on' : ''}" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>
      </div>
      ${!Voice.available() ? `<div class="ep1-tip">🔇 Audio isn't available in this browser — read the line instead.</div>` : ''}
      <div class="ep1-text say ep1-transcript" ${revealed ? '' : 'hidden'}>${lineHTML(node.audio)}</div>
      <div class="ep1-ua" ${revealed && uaOpen ? '' : 'hidden'}>${esc(node.ua || '')}</div>
      <div class="ep1-q">🎧 ${esc(node.question)}</div>${node.qua ? `<div class="ep1-ua" ${SET.ua ? '' : 'hidden'}>${esc(node.qua)}</div>` : ''}
      <div class="ep1-opts ${tiles ? 'ep1-tiles' : ''}">${node.options.map((o, i) => `<button type="button" class="ep1-opt ${tried.has(i) ? 'tried' : ''} ${done && i === correctIdx ? 'picked' : ''} ${wrong >= 3 && i === correctIdx && !done ? 'hint-pulse' : ''}" data-i="${i}" ${tried.has(i) || done ? 'disabled' : ''}>
        ${tiles ? `<span class="ep1-tile-icon" aria-hidden="true">🛄</span><span class="ep1-tile-n">${esc(o.text.replace(/\D/g, ''))}</span><span class="ep1-tile-t">${esc(o.text)}</span>` : `<span class="ep1-k" aria-hidden="true">${i + 1}</span><span class="ep1-opt-t">${esc(o.text)}</span>`}</button>`).join('')}</div>
      <div class="ep1-fb" aria-live="polite">${fb || ''}</div>
      ${done ? `<div class="ep1-row"><span></span><button type="button" class="ep1-next" data-primary>Continue ▸</button></div>` : ''}`, 'k-listen');
    $$('.ep1-opt:not([disabled])', EP.dlg).forEach(b => b.addEventListener('click', () => pick(+b.dataset.i), { once:true }));
    EP.dlg.querySelectorAll('[data-lp]').forEach(b => b.addEventListener('click', () => {
      const a = b.dataset.lp;
      if(a === 'play') play(false); if(a === 'slow') play(true);
      if(a === 'tr'){ revealed = !revealed; draw(lastFb); }
      if(a === 'ua'){ uaOpen = !uaOpen; if(uaOpen) revealed = true; draw(lastFb); }
    }));
    if(done) primary(() => next(node, id));
  }
  let lastFb = '';
  function play(slow){
    const w = EP.dlg.querySelector('.ep1-wave'); w && w.classList.add('on');
    Voice.speak(node.who, node.audio, { slow }).then(() => { const w2 = EP.dlg.querySelector('.ep1-wave'); w2 && w2.classList.remove('on'); });
  }
  function pick(i){
    if(tok !== EP.token || done) return;
    const o = node.options[i];
    if(o.correct){
      done = true; revealed = true; Sound.sfx('good'); taskDone(node.key);
      st().answers[node.key] = { tries: wrong + 1 }; save(true);
      lastFb = `<div class="ep1-good">✓ ${wrong ? 'Got it!' : 'Great listening!'}</div>`; draw(lastFb); return;
    }
    wrong++; tried.add(i); Sound.sfx('soft');
    const h = node.hints || [];
    lastFb = `<div class="ep1-tip">Not quite — listen once more. 🎧</div>`;
    if(wrong >= 1 && h[0]) lastFb += `<div class="ep1-hint">🔎 ${esc(h[0])}</div>`;
    if(wrong >= 2){ revealed = true; if(h[1]) lastFb += `<div class="ep1-hint">🔎 ${esc(h[1])}</div>`; }
    if(wrong >= 3){ uaOpen = true; if(h[2]) lastFb += `<div class="ep1-hint ua">🇺🇦 ${esc(h[2])}</div>`; }
    draw(lastFb);
  }
  draw('');
  setTimeout(() => { if(tok === EP.token && SET.sound) play(false); }, 450);
};

/* ---------- speaking / writing box (used by speak nodes, the phone, the final) ---------- */
function speakBox(host, cfg, onDone){
  let mode = cfg.forceText || !canRecord() ? 'text' : (cfg.defaultMode || 'voice');
  let level = cfg.levels ? 1 : -1, rec = null, modelOpen = false;
  const minWords = cfg.minWords || 3;
  function draw(){
    const showStarters = level === -1 || level >= 1, showModel = level === 2 || modelOpen;
    host.innerHTML = `
      <div class="ep1-speak">
        <div class="ep1-q">${cfg.icon || '🎙️'} ${esc(cfg.prompt)}</div>
        ${cfg.ua ? `<div class="ep1-ua" ${SET.ua ? '' : 'hidden'}>${esc(cfg.ua)}</div>` : ''}
        ${cfg.levels ? `<div class="ep1-levels" role="radiogroup" aria-label="How much help?">
            <span>Help:</span>${['No hints','Sentence starters','Full model'].map((t, i) => `<button type="button" role="radio" aria-checked="${level === i}" class="ep1-seg ${level === i ? 'on' : ''}" data-lv="${i}">${t}</button>`).join('')}</div>` : ''}
        ${showStarters && cfg.starters && cfg.starters.length ? `<div class="ep1-starters">${cfg.starters.map(s => `<button type="button" class="ep1-chip" data-st="${esc(s)}">${esc(s)}</button>`).join('')}</div>` : ''}
        ${showModel ? `<div class="ep1-model"><span>💡 Example:</span> “${esc(cfg.model)}” ${Voice.available() ? `<button type="button" class="ep1-tool" data-sp="model" aria-label="Listen to the example">🔊</button>` : ''}</div>` : ''}
        <div class="ep1-modes" role="tablist">
          <button type="button" role="tab" class="ep1-seg ${mode === 'voice' ? 'on' : ''}" aria-selected="${mode === 'voice'}" data-mode="voice" ${canRecord() ? '' : 'disabled title="Recording is not available in this browser"'}>🎙️ Say it</button>
          <button type="button" role="tab" class="ep1-seg ${mode === 'text' ? 'on' : ''}" aria-selected="${mode === 'text'}" data-mode="text">⌨️ Type it</button>
        </div>
        <div class="ep1-mode-voice" ${mode === 'voice' ? '' : 'hidden'}></div>
        <div class="ep1-mode-text" ${mode === 'text' ? '' : 'hidden'}>
          <textarea class="ep1-ta" rows="${cfg.rows || 3}" maxlength="900" placeholder="Type your answer in English…" aria-label="Your answer">${esc(cfg.draft || '')}</textarea>
          <div class="ep1-count"></div>
        </div>
        <div class="ep1-row">
          <div class="ep1-tools">
            ${level === -1 && cfg.model ? `<button type="button" class="ep1-btn ep1-btn-ghost" data-model>${modelOpen ? 'Hide example' : '💡 Show example'}</button>` : ''}
            ${cfg.optional ? `<button type="button" class="ep1-btn ep1-btn-ghost" data-skip>${esc(cfg.skipLabel || 'Skip for now')}</button>` : ''}
          </div>
          <button type="button" class="ep1-next" data-done disabled>${esc(cfg.doneLabel || 'Done ✓')}</button>
        </div>
      </div>`;
    const ta = host.querySelector('.ep1-ta'), doneBtn = host.querySelector('[data-done]');
    const upd = () => {
      const n = wordCount(ta.value); cfg.draft = ta.value;
      host.querySelector('.ep1-count').textContent = n ? `${n} word${n === 1 ? '' : 's'}${n < minWords ? ` · a little more, please` : ''}` : '';
      doneBtn.disabled = mode === 'text' ? n < minWords : !(rec && rec.ready);
    };
    ta.addEventListener('input', upd);
    if(mode === 'voice'){ if(rec) rec.destroy(); rec = makeRecorder(host.querySelector('.ep1-mode-voice'), { minSec: cfg.minSec || 2, onChange: upd }); }
    upd();
  }
  host.addEventListener('click', e => {
    const t = e.target;
    const st_ = t.closest('[data-st]'); if(st_){ const ta = host.querySelector('.ep1-ta'); if(mode !== 'text'){ mode = 'text'; draw(); } const ta2 = host.querySelector('.ep1-ta'); ta2.value = (ta2.value ? ta2.value.trimEnd() + ' ' : '') + st_.dataset.st.replace(/…$/, ' '); ta2.focus(); ta2.dispatchEvent(new Event('input')); return; }
    const lv = t.closest('[data-lv]'); if(lv){ level = +lv.dataset.lv; draw(); return; }
    const md = t.closest('[data-mode]'); if(md && !md.disabled){ mode = md.dataset.mode; draw(); if(mode === 'text') host.querySelector('.ep1-ta').focus(); return; }
    if(t.closest('[data-model]')){ modelOpen = !modelOpen; draw(); return; }
    if(t.closest('[data-sp]')){ Voice.speak('you', cfg.model); return; }
    if(t.closest('[data-skip]')){ finish({ mode: cfg.skipSaysModel ? 'model' : 'skip' }); return; }
    if(t.closest('[data-done]')){
      if(mode === 'text') finish({ mode:'text', text: host.querySelector('.ep1-ta').value.trim() });
      else if(rec && rec.ready) finish({ mode:'voice', seconds: Math.round(rec.seconds) });
    }
  });
  let fin = false;
  function finish(r){ if(fin) return; fin = true; if(rec){ rec.destroy(); rec = null; } onDone(r); }
  draw();
  return { destroy(){ if(rec) rec.destroy(); } };
}

/* Speaking moments in the story. Free answers are acknowledged neutrally —
   nothing here pretends to understand or grade what the student said. */
RENDER.speak = function(node, id, tok){
  dlg(`${head('🗣️ Speaking moment', 'turn')}<div class="ep1-speak-host"></div>`, 'k-speak');
  speakBox(EP.dlg.querySelector('.ep1-speak-host'), node, r => {
    if(tok !== EP.token) return;
    const s = st();
    s.answers[node.key] = r.mode === 'text' ? { mode:'text', text:r.text.slice(0, 900) } : r.mode === 'voice' ? { mode:'voice', seconds:r.seconds } : { mode:r.mode };
    if(r.mode === 'text' || r.mode === 'voice'){ taskDone(node.key); toast('🎙️', r.mode === 'voice' ? 'Speaking practice saved' : 'Answer saved', r.mode === 'voice' ? `${r.seconds}s recorded on this device` : ''); }
    save(true);
    const after = () => node.after ? showLine({ type:'say', who:node.after.who, text:node.after.text, ua:node.after.ua }, () => next(node, id)) : next(node, id);
    if(r.mode === 'text') showLine({ type:'say', who:'you', text:r.text }, after);
    else if(r.mode === 'voice') showLine({ type:'narr', text:'(You answer out loud.)', ua:'(Ти відповідаєш уголос.)' }, after);
    else if(r.mode === 'model') showLine({ type:'say', who:'you', text:node.model }, after);
    else next(node, id);
  });
};

/* Inventory — the story asks for something; pick it from your backpack. */
RENDER.inventory = function(node, id, tok){
  let wrong = 0;
  dlg(`${head('🎒 Your backpack', 'turn')}<div class="ep1-q">${esc(node.prompt)}</div>${node.ua ? `<div class="ep1-ua" ${SET.ua ? '' : 'hidden'}>${esc(node.ua)}</div>` : ''}
      <div class="ep1-fb" aria-live="polite"></div><div class="ep1-row">${tools({ audio:false, ua:!!node.ua })}</div>`, 'k-inv');
  function drawTray(sel){
    EP.tray.hidden = false;
    EP.tray.innerHTML = `<div class="ep1-tray-items" role="list">${DATA.items.map(n => { const it = ITEMS[n] || { icon:'🎒', desc:'' };
      return `<button type="button" role="listitem" class="ep1-item ${wrong >= 2 && n === node.want ? 'hint-pulse' : ''} ${sel === n ? 'sel' : ''}" data-item="${esc(n)}"><span class="ep1-item-i" aria-hidden="true">${it.icon}</span><span class="ep1-item-n">${esc(n)}</span></button>`; }).join('')}</div>
      ${sel ? `<div class="ep1-inspect"><div class="ep1-item-big" aria-hidden="true">${(ITEMS[sel] || {}).icon || '🎒'}</div><div><b>${esc(sel)}</b><p>${esc((ITEMS[sel] || {}).desc || '')}</p>
        <div class="ep1-row"><button type="button" class="ep1-btn ep1-btn-hot" data-give>🤲 Hand it over</button><button type="button" class="ep1-btn ep1-btn-ghost" data-unsel>Back</button></div></div></div>` : ''}`;
    $$('[data-item]', EP.tray).forEach(b => b.addEventListener('click', () => drawTray(b.dataset.item)));
    const g = EP.tray.querySelector('[data-give]'); if(g){ g.addEventListener('click', () => give(sel)); g.focus({ preventScroll:true }); }
    const u = EP.tray.querySelector('[data-unsel]'); if(u) u.addEventListener('click', () => drawTray(null));
  }
  function give(name){
    if(tok !== EP.token) return;
    if(name === node.want){
      EP.tray.hidden = true; Sound.sfx('good'); taskDone(node.key); st().answers[node.key] = { tries: wrong + 1 }; save(true);
      return next(node, id);
    }
    wrong++; Sound.sfx('soft');
    const w = (node.wrong && node.wrong[name]) || ["Hmm, that's not it.", "Хм, це не те."];
    EP.dlg.querySelector('.ep1-fb').innerHTML = `<div class="ep1-react"><b>${esc(SPEAKERS[node.who].name)}:</b> ${esc(w[0])}<div class="ep1-ua" ${SET.ua ? '' : 'hidden'}>${esc(w[1] || '')}</div></div>
      ${wrong >= 2 ? `<div class="ep1-hint">🔎 Look for: <b>${esc(node.want)}</b> ${(ITEMS[node.want] || {}).icon || ''}</div>` : ''}`;
    if(SET.voice && SET.sound) Voice.speak(node.who, w[0]);
    drawTray(null);
  }
  drawTray(null);
};

/* Phone notification — the phone buzzes; tap to open. */
RENDER.notify = function(node, id, tok){
  hideDlg();
  const t = thread(node.thread);
  st().flags.phoneUnlocked = true;
  t.unread = (t.unread || 0) + 1;
  syncTop();
  Sound.sfx('notify');
  try { navigator.vibrate && navigator.vibrate([90, 60, 90]); } catch(e){}
  EP.root.classList.remove('ep1-buzz'); void EP.root.offsetWidth; EP.root.classList.add('ep1-buzz');
  const icon = t.id === 'coordinator' ? '🏫' : '💬';
  EP.notif.hidden = false;
  EP.notif.innerHTML = `<button type="button" class="ep1-notif-card" data-primary aria-label="New message from ${esc(t.name)}. Open phone.">
      <span class="ep1-notif-app" aria-hidden="true">${icon}</span>
      <span class="ep1-notif-body"><span class="ep1-notif-top"><b>${esc(t.name)}${t.id === 'mia' ? ' 💙' : ''}</b><small>now</small></span><span class="ep1-notif-text">${esc(node.text)}</span></span>
    </button><div class="ep1-notif-hint">Tap to open your phone</div>`;
  const b = EP.notif.querySelector('[data-primary]');
  b.focus({ preventScroll:true });
  b.addEventListener('click', () => { if(tok !== EP.token) return; EP.notif.hidden = true; next(node, id); }, { once:true });
};

/* ---------- the in-episode phone ---------- */
function bubbleHTML(m){
  const mine = m.from === 'me';
  let body;
  if(m.kind === 'voice'){
    body = `<div class="ep1-voice">${!mine && m.text ? `<button type="button" class="ep1-vplay" data-vplay="${esc(m.id || '')}" aria-label="Play voice message">▶</button>` : '<span class="ep1-vplay mic" aria-hidden="true">🎤</span>'}
      <span class="ep1-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span><span class="ep1-vdur">${esc(m.dur || '')}</span></div>
      ${!mine ? (m.revealed ? `<div class="ep1-vtr">“${esc(m.text)}”</div>${m.ua ? `<div class="ep1-vtr ua">${esc(m.ua)}</div>` : ''}` : `<div class="ep1-vtr hidden-tr">Transcript hidden — listen first 🎧</div>`) : `<div class="ep1-vtr">Voice message · recorded on your device</div>`}`;
  } else {
    body = esc(m.text);
    if(!mine && m.vocab && PHRASES[m.vocab]) body += `<button type="button" class="ep1-chip ep1-chip-mini" data-vocab="${m.vocab}">💬 ${esc(PHRASES[m.vocab].en)}</button>`;
  }
  return `<div class="ep1-bub ${mine ? 'me' : 'them'}">${body}${m.time ? `<span class="ep1-bub-t">${esc(m.time)}</span>` : ''}</div>`;
}
function openPhone(tid, scripted){
  const t = thread(tid);
  EP.phoneThread = tid; EP.phoneScripted = !!scripted;
  t.unread = 0; syncTop();
  EP.phone.hidden = false;
  hideDlg(); hotspotsVisible(false);
  EP.phone.innerHTML = `<div class="ep1-ph" role="dialog" aria-label="Phone — ${esc(t.name)}">
      <div class="ep1-ph-status"><span>${esc(EP.scene ? EP.scene.clock : '')}</span><span aria-hidden="true">●●● 📶 🔋</span></div>
      <div class="ep1-ph-head">
        ${scripted ? '' : `<button type="button" class="ep1-ph-ib" data-ph="list" aria-label="All chats">‹</button>`}
        <span class="ep1-ph-ava" style="--c:${t.color}" aria-hidden="true">${t.id === 'coordinator' ? '🏫' : faceMini(t.dark)}${t.online ? '<i class="ep1-online"></i>' : ''}</span>
        <div class="ep1-ph-who"><b>${esc(t.name)} ${t.flag && window.FLAGS ? window.FLAGS[t.flag] : ''}</b><small class="ep1-ph-sub">${t.id === 'coordinator' ? 'Official program contact ✓' : 'online'}</small></div>
        ${scripted ? '' : `<button type="button" class="ep1-ph-ib" data-ph="close" aria-label="Close phone">✕</button>`}
      </div>
      <div class="ep1-ph-body" aria-live="polite"></div>
      <div class="ep1-ph-foot"></div>
    </div>`;
  EP.phone.querySelector('.ep1-ph').addEventListener('click', e => {
    const v = e.target.closest('[data-vplay]');
    if(v){ const m = thread(EP.phoneThread).chat.find(x => x.id === v.dataset.vplay); if(m){ v.closest('.ep1-bub').classList.add('playing'); Voice.speak('mia', m.text, { slow: !!e.shiftKey }).then(() => { const b = v.closest('.ep1-bub'); b && b.classList.remove('playing'); EP.voiceHeard = true; if(EP.onVoice) EP.onVoice(); }); } return; }
    const voc = e.target.closest('[data-vocab]'); if(voc){ vocabCard(voc.dataset.vocab); return; }
    const p = e.target.closest('[data-ph]'); if(!p) return;
    if(p.dataset.ph === 'close') closePhone(true);
    if(p.dataset.ph === 'list') browsePhone();
  });
  renderThread();
}
function renderThread(typing){
  const t = thread(EP.phoneThread); const body = EP.phone.querySelector('.ep1-ph-body'); if(!body) return;
  body.innerHTML = t.chat.map(bubbleHTML).join('') + (typing ? `<div class="ep1-bub them ep1-typing" aria-label="${esc(t.name)} is typing"><i></i><i></i><i></i></div>` : '');
  const sub = EP.phone.querySelector('.ep1-ph-sub'); if(sub && t.id !== 'coordinator') sub.textContent = typing ? 'typing…' : 'online';
  body.scrollTop = body.scrollHeight;
}
function phoneFoot(html){ const f = EP.phone.querySelector('.ep1-ph-foot'); if(f){ f.innerHTML = html; } return f; }
function closePhone(fromUser){
  if(EP.phone.hidden) return;
  EP.phone.hidden = true; EP.phone.innerHTML = '';
  if(fromUser && !EP.phoneScripted) hotspotsVisible(true);
  if(typeof renderMessages === 'function') try { renderMessages(); } catch(e){}
}
function browsePhone(){
  if(EP.phoneScripted && !EP.phone.hidden) return;
  if(!st().flags.phoneUnlocked) return;
  EP.phoneScripted = false;
  EP.phone.hidden = false;
  EP.phone.innerHTML = `<div class="ep1-ph" role="dialog" aria-label="Phone">
    <div class="ep1-ph-status"><span>${esc(EP.scene ? EP.scene.clock : '')}</span><span aria-hidden="true">📶 🔋</span></div>
    <div class="ep1-ph-head"><div class="ep1-ph-who"><b>📱 Messages</b><small class="ep1-ph-sub">Your chats</small></div><button type="button" class="ep1-ph-ib" data-ph="close" aria-label="Close phone">✕</button></div>
    <div class="ep1-ph-body ep1-ph-list">${DATA.messages.map(m => `<button type="button" class="ep1-ph-thread" data-th="${esc(m.id)}">
      <span class="ep1-ph-ava" style="--c:${m.color}" aria-hidden="true">${m.id === 'coordinator' ? '🏫' : faceMini(m.dark)}</span>
      <span class="ep1-ph-ti"><b>${esc(m.name)}</b><small>${esc(m.snippet || '')}</small></span>${m.unread ? `<span class="ep1-ph-un">${m.unread}</span>` : ''}</button>`).join('')}</div>
    <div class="ep1-ph-foot"><button type="button" class="ep1-btn ep1-btn-ghost" data-ph="close">Back to the story</button></div></div>`;
  EP.phone.querySelector('.ep1-ph').addEventListener('click', e => {
    const th = e.target.closest('[data-th]'); if(th){ openPhone(th.dataset.th, false); phoneFoot(`<button type="button" class="ep1-btn ep1-btn-ghost" data-ph="close">Back to the story</button>`); return; }
    if(e.target.closest('[data-ph="close"]')) closePhone(true);
  });
}

/* Scripted phone conversations — deterministic; message ids make replays
   and resumes safe (nothing is ever duplicated in the chat history). */
RENDER.phone = function(node, id, tok){
  const tid = node.thread;
  openPhone(tid, true);
  (async () => {
    for(const step of node.steps){
      if(tok !== EP.token || EP.phone.hidden) return;
      await phoneStep(step, tid, tok);
    }
    if(tok !== EP.token) return;
    closePhone(); save(true);
    next(node, id);
  })().catch(err => { console.error(err); closePhone(); next(node, id); });
};
async function phoneStep(step, tid, tok){
  const s = st(), f = s.flags, clock = EP.scene.clock, t = thread(tid);
  const delay = text => isReduced() ? 250 : Math.min(1700, 550 + String(text).length * 14);
  if(step.in || step.inFn){
    const text = step.in || step.inFn(f);
    if(step.id && hasMsg(tid, step.id)) return;
    renderThread(true); await wait(delay(text)); if(tok !== EP.token) return;
    pushChat(tid, { id:step.id, from:'them', text, time:clock, vocab:step.vocab }); Sound.sfx('soft'); renderThread(); save(false);
    await wait(isReduced() ? 100 : 280);
    return;
  }
  if(step.reply){
    const r = step.reply;
    if(hasMsg(tid, r.id) && (!r.key || f[r.key])) return;
    let opts = r.options.slice();
    if(r.orderBy && f[r.orderBy]) opts.sort((a, b) => (b.value === f[r.orderBy]) - (a.value === f[r.orderBy]));
    const choice = await new Promise(res => {
      const foot = phoneFoot(`<div class="ep1-ph-q">Reply:</div><div class="ep1-opts ep1-ph-opts">${opts.map((o, i) => `<button type="button" class="ep1-opt" data-i="${i}"><span class="ep1-k" aria-hidden="true">${i + 1}</span><span class="ep1-opt-t">${esc(o.text)}</span></button>`).join('')}
        ${r.own ? `<button type="button" class="ep1-opt ep1-own" data-own><span class="ep1-k" aria-hidden="true">✏️</span><span class="ep1-opt-t">Write my own answer</span></button>` : ''}</div>`);
      const first = foot.querySelector('.ep1-opt'); first && first.focus({ preventScroll:true });
      foot.addEventListener('click', e => {
        const b = e.target.closest('[data-i]'); if(b){ res({ text: opts[+b.dataset.i].text, value: opts[+b.dataset.i].value }); return; }
        if(e.target.closest('[data-own]')){
          phoneFoot(`<div class="ep1-ph-compose"><textarea class="ep1-ta" rows="2" maxlength="240" placeholder="Type your reply…" aria-label="Your reply"></textarea><button type="button" class="ep1-send" aria-label="Send" disabled>➤</button></div>`);
          const ta = EP.phone.querySelector('.ep1-ph-foot .ep1-ta'), sb = EP.phone.querySelector('.ep1-send');
          ta.focus(); ta.addEventListener('input', () => sb.disabled = !ta.value.trim());
          ta.addEventListener('keydown', e2 => { if(e2.key === 'Enter' && !e2.shiftKey && ta.value.trim()){ e2.preventDefault(); res({ text: ta.value.trim(), value:'own' }); } });
          sb.addEventListener('click', () => { if(ta.value.trim()) res({ text: ta.value.trim(), value:'own' }); });
        }
      });
    });
    if(tok !== EP.token) return;
    phoneFoot('');
    pushChat(tid, { id:r.id, from:'me', text:choice.text.slice(0, 240), time:clock });
    if(r.key) f[r.key] = choice.value || 'own';
    s.choices[EP.scene.id + ':' + r.id] = choice.text.slice(0, 240);
    Sound.sfx('soft'); renderThread(); save(true);
    await wait(isReduced() ? 120 : 420);
    return;
  }
  if(step.voice){
    const v = step.voice, q = step.question;
    if(hasMsg(tid, v.id) && s.tasks.includes(q.key)) return;
    if(!hasMsg(tid, v.id)){ renderThread(true); await wait(isReduced() ? 250 : 1200); if(tok !== EP.token) return; }
    const msg = pushChat(tid, { id:v.id, from:'them', kind:'voice', text:v.text, ua:v.ua, dur:v.dur, time:clock, revealed:false });
    renderThread(); Sound.sfx('notify');
    EP.voiceHeard = !Voice.available();
    let wrong = 0; const tried = new Set();
    await new Promise(res => {
      const draw = fb => {
        const foot = phoneFoot(`<div class="ep1-ph-q">🎧 ${esc(q.q)}${q.qua ? `<small class="ep1-oua" ${SET.ua ? '' : 'hidden'}>${esc(q.qua)}</small>` : ''}</div>
          ${!EP.voiceHeard ? `<div class="ep1-tip">▶ Play Mia's voice message first.</div>` : ''}
          <div class="ep1-opts ep1-ph-opts">${q.options.map((o, i) => `<button type="button" class="ep1-opt ${tried.has(i) ? 'tried' : ''} ${wrong >= 3 && o.correct ? 'hint-pulse' : ''}" data-i="${i}" ${tried.has(i) || !EP.voiceHeard ? 'disabled' : ''}><span class="ep1-k" aria-hidden="true">${String.fromCharCode(65 + i)}</span><span class="ep1-opt-t">${esc(o.text)}</span></button>`).join('')}</div>
          <div class="ep1-fb">${fb || ''}</div>
          <div class="ep1-row ep1-row-tight">${Voice.available() ? `<button type="button" class="ep1-btn ep1-btn-ghost" data-replay>▶ Listen again</button><button type="button" class="ep1-btn ep1-btn-ghost" data-slow>🐢 Slower</button>` : ''}
            <button type="button" class="ep1-btn ep1-btn-ghost" data-tr>📝 Transcript</button></div>`);
        foot.onclick = e => {
          const b = e.target.closest('[data-i]');
          if(b){ const o = q.options[+b.dataset.i];
            if(o.correct){ msg.revealed = true; taskDone(q.key); s.answers[q.key] = { tries: wrong + 1 }; Sound.sfx('good'); renderThread(); save(true); EP.onVoice = null; phoneFoot(`<div class="ep1-good">✓ Exactly! Mia wants to hear about everything.</div>`); setTimeout(res, isReduced() ? 300 : 1100); return; }
            wrong++; tried.add(+b.dataset.i); Sound.sfx('soft');
            let h = `<div class="ep1-hint">🔎 ${esc(q.hints[0])}</div>`;
            if(wrong >= 2){ h = `<div class="ep1-hint">🔎 ${esc(q.hints[1])}</div>`; }
            if(wrong >= 3){ msg.revealed = true; renderThread(); h += `<div class="ep1-hint ua">🇺🇦 ${esc(q.hints[2])}</div>`; }
            draw(h); return; }
          if(e.target.closest('[data-replay]')) $('[data-vplay="' + v.id + '"]', EP.phone) && $('[data-vplay="' + v.id + '"]', EP.phone).click();
          if(e.target.closest('[data-slow]')) Voice.speak('mia', v.text, { slow:true }).then(() => { EP.voiceHeard = true; draw(''); });
          if(e.target.closest('[data-tr]')){ msg.revealed = true; EP.voiceHeard = true; renderThread(); draw(''); }
        };
      };
      EP.onVoice = () => { if(!s.tasks.includes(q.key)) draw(''); };
      draw('');
      const pb = $('[data-vplay="' + v.id + '"]', EP.phone); pb && pb.focus({ preventScroll:true });
    });
    return;
  }
  if(step.write){
    const w = step.write;
    if(hasMsg(tid, w.id)) return;
    const result = await new Promise(res => {
      const foot = phoneFoot(`<div class="ep1-ph-write"></div>`);
      speakBox(foot.querySelector('.ep1-ph-write'), Object.assign({ icon:'✍️', doneLabel:'Send ➤', defaultMode:'text', rows:3 }, w), res);
    });
    if(tok !== EP.token) return;
    phoneFoot('');
    if(result.mode === 'text'){ pushChat(tid, { id:w.id, from:'me', text:result.text.slice(0, 600), time:clock }); s.answers[w.key] = { mode:'text', text:result.text.slice(0, 600) }; }
    else if(result.mode === 'voice'){ pushChat(tid, { id:w.id, from:'me', kind:'voice', dur:fmtTime(result.seconds), time:clock }); s.answers[w.key] = { mode:'voice', seconds:result.seconds }; }
    taskDone(w.key); Sound.sfx('soft'); renderThread(); save(true);
    await wait(isReduced() ? 120 : 450);
    return;
  }
  if(step.end){
    await new Promise(res => {
      const foot = phoneFoot(`<button type="button" class="ep1-next ep1-ph-end" data-primary-ph>${esc(step.end)} ▸</button>`);
      const b = foot.querySelector('[data-primary-ph]'); b.focus({ preventScroll:true });
      b.addEventListener('click', res, { once:true });
    });
  }
}

/* =========================================================================
   MINI-GAMES
   ========================================================================= */
function showGame(cls){ EP.game.hidden = false; EP.game.className = 'ep1-game ' + (cls || ''); return EP.game; }
function hideGame(){ EP.game.hidden = true; EP.game.innerHTML = ''; EP.game.className = 'ep1-game'; EP.game.onclick = null; }

function compare(c){
  const rows = [
    ['Size', { S:'Small', M:'Medium', L:'Large' }[c.size], c.size === 'M'],
    ['Colour', c.color.charAt(0).toUpperCase() + c.color.slice(1), c.color === 'black'],
    ['Orange ribbon on the handle', c.feature === 'ribbon' ? 'Yes' : c.feature ? `No — ${c.feature === 'tag' ? 'a tag' : 'a sticker'}` : 'No', c.feature === 'ribbon']
  ];
  return `<table class="ep1-cmp"><caption class="ep1-sr">Compare with your suitcase</caption>${rows.map(([k, v, ok]) => `<tr><th scope="row">${k}</th><td>${esc(v)}</td><td class="${ok ? 'ok' : 'no'}">${ok ? '✓' : '✗'}</td></tr>`).join('')}</table>`;
}
function targetCard(){
  return `<div class="ep1-target"><div class="ep1-target-img">${suitcaseSVG(MY_SUITCASE)}</div>
    <div><div class="ep1-eyebrow">📷 Photo on your phone</div><b>Your suitcase</b><p>Medium-sized · black · a bright orange ribbon on the handle</p></div></div>`;
}

/* Scene 4: the carousel. None of these is yours — inspect them, then realise. */
RENDER.carousel = function(node, id, tok){
  const seen = new Set(); let waits = 0, finished = false;
  const g = showGame('g-belt');
  g.innerHTML = `${targetCard()}
    <div class="ep1-belt ${isReduced() ? 'static' : ''}" role="list" aria-label="Suitcases on the carousel">
      ${DECOYS.map((d, i) => `<button type="button" role="listitem" class="ep1-sc" style="--i:${i}" data-sc="${i}" aria-label="Inspect: ${esc(d.label)}">${suitcaseSVG(d)}<span class="ep1-sc-tick" aria-hidden="true">✓</span></button>`).join('')}
    </div>
    <div class="ep1-g-insp" hidden></div>`;
  const insp = g.querySelector('.ep1-g-insp'), belt = g.querySelector('.ep1-belt');
  function dialog(){
    dlg(`${head(null, 'think')}<div class="ep1-text think">${seen.size < DECOYS.length ? 'Is that mine? Tap a suitcase to check it.' : "None of them… That was the last one."}</div>
      <div class="ep1-ua" ${SET.ua ? '' : 'hidden'}>Це моя? Натисни на валізу, щоб перевірити.</div>
      <div class="ep1-row"><div class="ep1-tools"><span class="ep1-count-pill">Checked ${seen.size}/${DECOYS.length}</span><button type="button" class="ep1-tool" data-act="ua">UA</button></div>
      <button type="button" class="ep1-next ${seen.size >= DECOYS.length ? '' : 'ep1-ghost'}" data-primary>${seen.size >= DECOYS.length || waits >= 1 ? 'Continue ▸' : 'Keep waiting… ⏳'}</button></div>`, 'k-think');
    primary(() => {
      if(seen.size >= DECOYS.length || waits >= 1) return finish();
      waits++; dialog();
    });
  }
  function finish(){
    if(finished) return; finished = true;
    taskDone('s4_carousel'); st().answers.s4_carousel = { inspected: seen.size };
    belt.classList.add('empty'); insp.hidden = true; save(true);
    setTimeout(() => { if(tok !== EP.token) return; hideGame(); next(node, id); }, isReduced() ? 200 : 1100);
  }
  belt.addEventListener('click', e => {
    const b = e.target.closest('[data-sc]'); if(!b) return;
    const d = DECOYS[+b.dataset.sc];
    seen.add(+b.dataset.sc); b.classList.add('seen'); belt.classList.add('paused');
    insp.hidden = false;
    insp.innerHTML = `<div class="ep1-insp-img">${suitcaseSVG(d)}</div><div><b>${esc(d.label)}</b>${compare(d)}<p class="ep1-verdict">✗ ${esc(d.why)}</p>
      <button type="button" class="ep1-btn" data-close-insp>Keep looking</button></div>`;
    insp.querySelector('[data-close-insp]').focus({ preventScroll:true });
    Sound.sfx('soft'); dialog();
  });
  insp.addEventListener('click', e => { if(e.target.closest('[data-close-insp]')){ insp.hidden = true; belt.classList.remove('paused'); const nx = belt.querySelector('.ep1-sc:not(.seen)'); nx && nx.focus({ preventScroll:true }); } });
  dialog();
};

/* Scene 4: baggage information screen */
RENDER.board = function(node, id, tok){
  const g = showGame('g-board');
  g.innerHTML = `<div class="ep1-board" role="table" aria-label="Baggage information">
    <div class="ep1-board-h" role="row"><span role="columnheader">FLIGHT</span><span role="columnheader">FROM</span><span role="columnheader">CAROUSEL</span><span role="columnheader">STATUS</span></div>
    <div class="ep1-board-r" role="row"><span>AX 118</span><span>TOKYO</span><span>2</span><span class="ok">DELIVERED</span></div>
    <div class="ep1-board-r mine" role="row"><span>EU 207</span><span>WARSAW</span><span>4 → <b>6</b></span><span class="warn">SOME BAGS MOVED TO CAROUSEL 6</span></div>
    <div class="ep1-board-r" role="row"><span>PC 902</span><span>MEXICO CITY</span><span>5</span><span>ON BELT</span></div>
    <div class="ep1-board-r" role="row"><span>NZ 6</span><span>AUCKLAND</span><span>7</span><span>EXPECTED 7:10</span></div>
  </div>`;
  dlg(`${head(null, 'think')}<div class="ep1-text think">${lineHTML("EU 207 — that's my flight. “Some bags moved to Carousel 6.”")}</div>
    <div class="ep1-ua" ${SET.ua ? '' : 'hidden'}>EU 207 — це мій рейс. «Частину багажу перенесли на шосту стрічку».</div>
    <div class="ep1-row">${tools({ audio:false, ua:true })}<button type="button" class="ep1-next" data-primary>Continue ▸</button></div>`, 'k-think');
  taskDone('s4_board');
  primary(() => { hideGame(); next(node, id); });
};

/* Scene 5: build the description of your suitcase, then say/type it. */
RENDER.describe = function(node, id, tok){
  const SLOTS = [
    { k:'size',  label:'Size',            opts:['small','medium-sized','large'], ok:'medium-sized' },
    { k:'color', label:'Colour',          opts:['blue','black','grey'], ok:'black' },
    { k:'feat',  label:'Special feature', opts:['an orange sticker','an orange ribbon','a yellow tag'], ok:'an orange ribbon' },
    { k:'where', label:'Where?',          opts:['on the side','on the handle'], ok:'on the handle' }
  ];
  const pick = {}; let wrongs = 0, photo = false;
  const g = showGame('g-describe');
  function sentence(){
    const b = k => pick[k] ? `<b class="ep1-fill">${esc(pick[k])}</b>` : `<span class="ep1-gap">____</span>`;
    return `“It's a ${b('size')} ${b('color')} suitcase with ${b('feat')} ${b('where')}.”`;
  }
  function draw(msg){
    const complete = SLOTS.every(s => pick[s.k] === s.ok);
    g.innerHTML = `<div class="ep1-desc">
      <div class="ep1-desc-top"><div class="ep1-eyebrow">Describe your suitcase</div><div class="ep1-desc-sent" aria-live="polite">${sentence()}</div></div>
      ${SLOTS.map(s => `<div class="ep1-desc-row"><span class="ep1-desc-k">${s.label}</span><div class="ep1-desc-opts" role="radiogroup" aria-label="${s.label}">
        ${s.opts.map(o => `<button type="button" role="radio" aria-checked="${pick[s.k] === o}" class="ep1-seg ${pick[s.k] === o ? 'on' : ''}" data-k="${s.k}" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div></div>`).join('')}
      <div class="ep1-fb" aria-live="polite">${msg || ''}</div>
      <div class="ep1-row"><button type="button" class="ep1-btn ep1-btn-ghost" data-photo>📷 ${photo ? 'Hide' : 'Look at'} my suitcase photo</button>
        ${complete ? `<button type="button" class="ep1-btn" data-listen>🔊 Listen</button>` : ''}</div>
      ${photo ? `<div class="ep1-desc-photo">${suitcaseSVG(MY_SUITCASE)}</div>` : ''}
    </div>`;
    if(complete){
      dlg(`${head('🗣️ Say it', 'turn')}<div class="ep1-speak-host"></div>`, 'k-speak');
      speakBox(EP.dlg.querySelector('.ep1-speak-host'), {
        prompt:"Now say the whole sentence to the agent (or type it).", ua:"Тепер скажи все речення працівниці (або надрукуй).",
        model:"It's a medium-sized black suitcase with an orange ribbon on the handle.", optional:true, skipLabel:'Read it for me', skipSaysModel:true, minWords:6
      }, r => {
        if(tok !== EP.token) return;
        st().answers[node.key] = { mode:r.mode, wrongPicks:wrongs, text:r.text };
        taskDone(node.key); save(true); hideGame(); next(node, id);
      });
    } else {
      dlg(`${head(null, 'think')}<div class="ep1-text think">Build the description: choose one word in each row.</div>
        <div class="ep1-ua" ${SET.ua ? '' : 'hidden'}>Склади опис: обери по одному варіанту в кожному рядку.</div><div class="ep1-row">${tools({ audio:false, ua:true })}</div>`, 'k-think');
    }
  }
  g.onclick = e => {
    const b = e.target.closest('[data-k]');
    if(b){
      const s = SLOTS.find(x => x.k === b.dataset.k);
      if(b.dataset.v === s.ok){ pick[s.k] = s.ok; Sound.sfx('soft'); draw(); }
      else { wrongs++; Sound.sfx('soft'); if(wrongs >= 2) photo = true;
        draw(`<div class="ep1-tip">Hmm — is that right? ${wrongs >= 2 ? 'Check the photo of your suitcase. 📷' : 'Think about your bag.'}</div>`); }
      return;
    }
    if(e.target.closest('[data-photo]')){ photo = !photo; draw(); }
    if(e.target.closest('[data-listen]')) Voice.speak('you', "It's a medium-sized black suitcase with an orange ribbon on the handle.");
  };
  draw();
};

/* Scene 5: Carousel 6 — exactly one suitcase matches. */
RENDER.pick = function(node, id, tok){
  let wrong = 0, done = false;
  const order = [1, 3, 2, 0, 4];
  const g = showGame('g-belt g-pick');
  g.innerHTML = `${targetCard()}
    <div class="ep1-belt slow ${isReduced() ? 'static' : ''}" role="list" aria-label="Suitcases at Carousel 6">
      ${order.map((k, i) => { const d = CAROUSEL6[k]; return `<button type="button" role="listitem" class="ep1-sc" style="--i:${i}" data-k="${k}" aria-label="${esc(d.label)}">${suitcaseSVG(d)}</button>`; }).join('')}
    </div><div class="ep1-g-insp" hidden></div>`;
  const insp = g.querySelector('.ep1-g-insp'), belt = g.querySelector('.ep1-belt');
  dlg(`${head(null, 'think')}<div class="ep1-text think">Carousel 6. One of these must be mine… Which one?</div>
    <div class="ep1-ua" ${SET.ua ? '' : 'hidden'}>Шоста стрічка. Одна з них має бути моєю… Котра?</div><div class="ep1-row">${tools({ audio:false, ua:true })}</div>`, 'k-think');
  belt.addEventListener('click', e => {
    const b = e.target.closest('[data-k]'); if(!b || done) return;
    const d = CAROUSEL6[+b.dataset.k];
    belt.classList.add('paused');
    if(d.mine){
      done = true; b.classList.add('mine'); Sound.sfx('reward'); taskDone(node.key); st().answers[node.key] = { tries: wrong + 1 }; save(true);
      insp.hidden = false; insp.innerHTML = `<div class="ep1-insp-img">${suitcaseSVG(d)}</div><div><b>Medium · black · orange ribbon ✓</b>${compare(d)}<p class="ep1-verdict ok">✓ That's yours!</p></div>`;
      setTimeout(() => { if(tok !== EP.token) return; hideGame(); next(node, id); }, isReduced() ? 500 : 1700);
      return;
    }
    wrong++; b.classList.add('seen'); Sound.sfx('soft');
    insp.hidden = false;
    insp.innerHTML = `<div class="ep1-insp-img">${suitcaseSVG(d)}</div><div><b>${esc(d.label)}</b>${compare(d)}<p class="ep1-verdict">✗ ${esc(d.why)}</p>
      ${wrong >= 2 ? `<p class="ep1-hint">🔎 Look for ALL three: medium-sized, black, ribbon on the handle.</p>` : ''}
      <button type="button" class="ep1-btn" data-close-insp>Keep looking</button></div>`;
    if(wrong >= 3){ const m = belt.querySelector('[data-k="2"]'); m && m.classList.add('hint-pulse'); }
    insp.querySelector('[data-close-insp]').focus({ preventScroll:true });
  });
  insp.addEventListener('click', e => { if(e.target.closest('[data-close-insp]')){ insp.hidden = true; belt.classList.remove('paused'); } });
};

/* Scene 6: simplified terminal map — follow signs with direction phrases. */
RENDER.navmap = function(node, id, tok){
  const P = { A:[150,330], B:[150,170], C:[400,170], D5:[560,170], INFO:[40,330], WC:[270,330], D3:[150,60], GATES:[60,170], D4:[400,70], ESC:[400,270] };
  const J = {
    A: { signs:[['↑','Ground Transportation · Doors 3–6'],['←','Information Desk'],['→','Restrooms']],
         go:{ straight:{ to:'B', ok:true }, left:{ to:'INFO', msg:"The Information Desk. The sign behind it says: “Ground Transportation — straight ahead.”" },
              right:{ to:'WC', msg:"Restrooms. Useful… but not the way out! 😅" } } },
    B: { signs:[['→','Ground Transportation'],['↑','Door 3 · Taxis & Buses'],['←','Departures']],
         go:{ right:{ to:'C', ok:true }, straight:{ to:'D3', msg:"Door 3: taxis and shuttle buses. Your pickup is at Door 5." },
              left:{ to:'GATES', msg:"Departures? You just arrived! Wrong way." } } },
    C: { signs:[['↑','Door 5 · Program pickup ☕'],['←','Door 4 · Rideshare'],['→','Escalator to Departures']],
         go:{ straight:{ to:'D5', ok:true, end:true }, left:{ to:'D4', msg:"Door 4 — rideshare pickup. Door 5 is just a little further." },
              right:{ to:'ESC', msg:"An escalator up to Departures. Not this time." } } }
  };
  let at = 'A', path = ['A'], detours = 0, msg = '', done = false, busy = false;
  const f = st().flags;
  const g = showGame('g-map');
  const LABEL = { A:'Baggage Claim', B:'', C:'', D5:'Door 5 ☕', INFO:'Info Desk', WC:'Restrooms', D3:'Door 3', GATES:'Departures', D4:'Door 4', ESC:'Escalator' };
  function mapSVG(tokenAt){
    const [tx, ty] = P[tokenAt];
    const line = (a, b, cls = '') => `<line class="${cls}" x1="${P[a][0]}" y1="${P[a][1]}" x2="${P[b][0]}" y2="${P[b][1]}"/>`;
    return `<svg viewBox="0 0 600 380" class="ep1-map-svg" role="img" aria-label="Simplified map: you are at ${LABEL[tokenAt] || 'a corridor'}">
      <rect x="0" y="0" width="600" height="380" rx="18" fill="#1b2a3c"/>
      <g class="ep1-map-halls" stroke="#3c536e" stroke-width="26" stroke-linecap="round">${line('A','B')}${line('B','C')}${line('C','D5')}${line('A','INFO')}${line('A','WC')}${line('B','D3')}${line('B','GATES')}${line('C','D4')}${line('C','ESC')}</g>
      <g class="ep1-map-path" stroke="#FF8A3D" stroke-width="6" stroke-linecap="round" stroke-dasharray="2 10">${path.slice(1).map((p, i) => line(path[i], p)).join('')}</g>
      ${Object.keys(P).filter(k => LABEL[k]).map(k => `<g><circle cx="${P[k][0]}" cy="${P[k][1]}" r="${k === 'D5' ? 13 : 8}" fill="${k === 'D5' ? '#6DBB75' : '#9fb6cf'}"/><text x="${P[k][0]}" y="${P[k][1] + (k === 'D3' || k === 'D4' ? -18 : 30)}" text-anchor="middle" font-size="15" font-weight="700" fill="#e9f1fa" ${FONT}>${LABEL[k]}</text></g>`).join('')}
      <g class="ep1-map-you" style="transform:translate(${tx}px,${ty}px)"><circle r="16" fill="#FF8A3D" opacity=".3"/><circle r="9" fill="#FF8A3D" stroke="#fff" stroke-width="3"/></g>
      <text x="584" y="366" text-anchor="end" font-size="12" fill="#8aa1ba" ${FONT}>Simplified game map — not the real LAX layout</text>
    </svg>`;
  }
  /* Photo map (photos/s6-map.webp): the same graph, drawn as a lit-up terminal.
     PP = the node centres in the picture's own pixels. The token glides from
     the last spot to the new one; the walked route is a dotted orange line. */
  const PP = { A:[432,768], B:[432,395], C:[1094,395], D5:[1503,395], INFO:[115,768], WC:[762,768], D3:[432,127], GATES:[140,395], D4:[1094,158], ESC:[1094,628] };
  let shownAt = 'A';
  function mapPhoto(tokenAt){
    const [fx, fy] = PP[shownAt];
    const line = (a, b) => `<line x1="${PP[a][0]}" y1="${PP[a][1]}" x2="${PP[b][0]}" y2="${PP[b][1]}"/>`;
    return `<svg viewBox="0 0 1618 972" class="ep1-map-svg ep1-map-photo" role="img" aria-label="Simplified map: you are at ${LABEL[tokenAt] || 'a corridor'}">
      <defs><clipPath id="ep1MapClip"><rect width="1618" height="972" rx="44"/></clipPath></defs>
      <g clip-path="url(#ep1MapClip)">
        <rect width="1618" height="972" fill="#0f1a2e"/>
        <image href="${PHOTO_BASE}s6-map.webp" width="1618" height="972" preserveAspectRatio="xMidYMid slice"/>
        <g class="ep1-map-path" stroke="#FF8A3D" stroke-width="15" stroke-linecap="round" stroke-dasharray="3 28" fill="none">${path.slice(1).map((p, i) => line(path[i], p)).join('')}</g>
        <g class="ep1-map-you" style="transform:translate(${fx}px,${fy}px)" data-x="${PP[tokenAt][0]}" data-y="${PP[tokenAt][1]}">
          <circle class="ep1-map-pulse" r="34" fill="#FF8A3D"/>
          <circle r="27" fill="#FF8A3D" stroke="#fff" stroke-width="9"/>
          <text y="-46" text-anchor="middle" font-size="30" font-weight="800" fill="#fff" stroke="#0f1a2e" stroke-width="7" paint-order="stroke" ${FONT}>YOU</text>
        </g>
      </g>
    </svg>`;
  }
  function moveToken(tokenAt){
    const you = g.querySelector('.ep1-map-photo .ep1-map-you'); if(!you) return;
    requestAnimationFrame(() => requestAnimationFrame(() => { you.style.transform = `translate(${you.dataset.x}px,${you.dataset.y}px)`; }));
    shownAt = tokenAt;
  }
  const usePhotoMap = () => SC_PHOTO['s6-map'] === 'ok';
  function draw(){
    const j = J[at];
    const here = path[path.length - 1];
    g.innerHTML = `<div class="ep1-map">
      ${usePhotoMap() ? mapPhoto(here) : mapSVG(here)}
      <div class="ep1-map-side">
        ${f.gotDirections ? `<div class="ep1-note">📝 <b>Directions:</b> go straight → turn right → follow the signs. Door 5 is next to the coffee stand.</div>` : ''}
        ${!done ? `<div class="ep1-signs" aria-label="Signs you can see">${j.signs.map(([a, t]) => `<div class="ep1-sign"><span class="ep1-sign-a" aria-hidden="true">${a}</span>${esc(t)}</div>`).join('')}</div>` : ''}
        ${msg ? `<div class="ep1-tip">${esc(msg)}</div>` : ''}
        ${!done ? `<div class="ep1-dirs">${[['left','⬅ Turn left'],['straight','⬆ Go straight'],['right','Turn right ➡']].map(([k, t]) => `<button type="button" class="ep1-dir" data-dir="${k}"${busy ? ' disabled' : ''}>${t}</button>`).join('')}</div>` : `<div class="ep1-good">✓ Door 5 — next to the coffee stand!</div>`}
        <div class="ep1-phr">${['go-straight','follow-signs','around-corner'].map(v => `<button type="button" class="ep1-chip" data-vocab="${v}">💬 ${esc(PHRASES[v].en)}</button>`).join('')}
          <span class="ep1-mini">next to = поруч із · near = біля</span></div>
      </div></div>`;
    const firstDir = g.querySelector('[data-dir]'); firstDir && firstDir.focus({ preventScroll:true });
    moveToken(here);
  }
  g.onclick = e => {
    const v = e.target.closest('[data-vocab]'); if(v){ vocabCard(v.dataset.vocab); return; }
    const b = e.target.closest('[data-dir]'); if(!b || done || busy) return;
    const step = J[at].go[b.dataset.dir];
    Voice.speak('you', b.textContent.replace(/[⬅⬆➡]/g, '').trim());
    if(step.ok){
      path.push(step.to); at = step.to; msg = '';
      if(step.end){ done = true; Sound.sfx('good'); taskDone(node.key); st().answers[node.key] = { detours }; save(true); draw(); finishMap(); return; }
      Sound.sfx('soft'); draw(); return;
    }
    detours++; path.push(step.to); msg = step.msg + ' → Go back and try another way.'; busy = true; draw();
    setTimeout(() => { path.pop(); busy = false; draw(); }, isReduced() ? 50 : (usePhotoMap() ? 1800 : 700));
  };
  function finishMap(){
    dlg(`${head(null, 'think')}<div class="ep1-text think">${lineHTML("Door 5 — right next to the coffee stand. Made it!")}</div>
      <div class="ep1-ua" ${SET.ua ? '' : 'hidden'}>Вихід 5 — просто біля кавового кіоску. Дійшов(-ла)!</div>
      <div class="ep1-row">${tools({ audio:false, ua:true })}<button type="button" class="ep1-next" data-primary>Continue ▸</button></div>`, 'k-think');
    primary(() => { hideGame(); next(node, id); });
  }
  dlg(`${head(null, 'think')}<div class="ep1-text think">Read the signs and choose a direction at each corner.</div>
    <div class="ep1-ua" ${SET.ua ? '' : 'hidden'}>Читай вказівники й на кожному розі обирай напрямок.</div><div class="ep1-row">${tools({ audio:false, ua:true })}</div>`, 'k-think');
  draw();
};

/* Rewards — achievements, phrases and items, idempotent. */
RENDER.reward = function(node, id, tok){
  hideDlg();
  const newOnes = [];
  if(node.achievement){ const a = unlockAch(node.achievement); if(a) newOnes.push(a); }
  const added = (node.phrases || []).filter(addPhrase);
  const gotItem = node.item ? giveItem(node.item) : false;
  taskDone('reward:' + EP.scene.id);
  save(true);
  Sound.sfx('reward');
  EP.cine.hidden = false; EP.cine.className = 'ep1-cine ep1-cine-reward';
  EP.cine.innerHTML = `<div class="ep1-banner"><div class="ep1-banner-line" aria-hidden="true"></div><h2>${esc(node.banner)}</h2><p>${esc(node.sub || '')}</p>
    <div class="ep1-banner-gets">
      ${(node.achievement ? [ensureAch(node.achievement)] : []).map(a => `<span class="ep1-get">${a.icon} ${esc(a.name)}</span>`).join('')}
      ${node.item ? `<span class="ep1-get">${(ITEMS[node.item] || {}).icon || '🎒'} ${esc(node.item)} → Backpack</span>` : ''}
      ${(node.phrases || []).length ? `<span class="ep1-get">💬 ${(node.phrases || []).length} useful phrases → Backpack</span>` : ''}
    </div>
    <button type="button" class="ep1-next" data-primary>Continue ▸</button></div>`;
  newOnes.forEach(a => setTimeout(() => toast(a.icon, 'Achievement unlocked', a.name), 600));
  if(added.length) setTimeout(() => toast('🎒', `${added.length} phrase${added.length > 1 ? 's' : ''} saved to Backpack`, added.map(x => PHRASES[x].en).slice(0, 2).join(' · ')), 1100);
  if(gotItem) setTimeout(() => toast((ITEMS[node.item] || {}).icon || '🎒', 'New item', node.item), 1500);
  const b = EP.cine.querySelector('[data-primary]'); b.focus({ preventScroll:true });
  b.addEventListener('click', () => { if(tok !== EP.token) return; EP.cine.hidden = true; EP.cine.innerHTML = ''; next(node, id); }, { once:true });
};

/* =========================================================================
   FINAL MISSION — "My First LA Story"
   ========================================================================= */
const STORY_TOPICS = [
  { k:'feel',   label:'How you felt when you arrived',   re:/\b(feel|felt|nervous|excited|happy|scared|afraid|tired|worried|amazing|great|sad|miss)\b/i },
  { k:'airport',label:'What happened at the airport',    re:/\b(airport|officer|passport|lax|plane|flight|landed|control|stamp)\b/i },
  { k:'problem',label:'The problem you had',             re:/\b(suitcase|bag|luggage|lost|missing|couldn'?t find|can'?t find|problem)\b/i },
  { k:'solved', label:'How you solved it',               re:/\b(found|help|helped|carousel|desk|worker|agent|staff|solved|luckily|asked)\b/i },
  { k:'next',   label:'What happens next',               re:/\b(tomorrow|hotel|host family|millers?|next|will|going to|morning)\b/i }
];
const STORY_MODEL = "Hey Mia! I'm finally in Los Angeles! I was really nervous when I landed, but everything was okay. The airport was huge! I talked to an officer in English, and then I couldn't find my suitcase. Luckily, an airport worker helped me. Now I'm at a hotel, and I'll meet my host family tomorrow. I can't believe I'm actually here!";
const STORY_MIN_WORDS = 40, STORY_MIN_SEC = 15;

RENDER.final = function(node, id, tok){
  hideDlg(); hotspotsVisible(false);
  const s = st();
  let mode = 'text', rec = null, reviewed = false, submitting = false;
  let draft = (s.finalDraft || '');
  EP.sheet.hidden = false;
  function topicsHTML(text){
    return STORY_TOPICS.map(t => { const ok = t.re.test(text || ''); return `<li class="${ok ? 'ok' : ''}"><span aria-hidden="true">${ok ? '✓' : '○'}</span> ${esc(t.label)}</li>`; }).join('');
  }
  function draw(){
    EP.sheet.innerHTML = `<div class="ep1-final" role="dialog" aria-label="Final mission: My First LA Story">
      <div class="ep1-final-head"><div class="ep1-eyebrow">🎙️ Final mission</div><h2>My First LA Story</h2><p>Tell Mia about your first hours in Los Angeles!</p>
        <p class="ep1-ua" ${SET.ua ? '' : 'hidden'}>Розкажи Мії про свої перші години в Лос-Анджелесі! Можна записати голосом або написати.</p></div>
      <div class="ep1-final-grid">
        <div class="ep1-final-main">
          <div class="ep1-modes" role="tablist">
            <button type="button" role="tab" class="ep1-seg ${mode === 'text' ? 'on' : ''}" aria-selected="${mode === 'text'}" data-fm="text">✍️ Write it</button>
            <button type="button" role="tab" class="ep1-seg ${mode === 'voice' ? 'on' : ''}" aria-selected="${mode === 'voice'}" data-fm="voice" ${canRecord() ? '' : 'disabled title="Recording is not available in this browser"'}>🎙️ Record it</button>
          </div>
          <div ${mode === 'text' ? '' : 'hidden'}>
            <textarea class="ep1-ta ep1-final-ta" rows="8" maxlength="2000" placeholder="Hey Mia! I'm finally in Los Angeles…" aria-label="Your story">${esc(draft)}</textarea>
            <div class="ep1-count" id="ep1FinCount"></div>
          </div>
          <div class="ep1-final-voice" ${mode === 'voice' ? '' : 'hidden'}>
            <p class="ep1-mini">Talk for at least ${STORY_MIN_SEC} seconds. Use the checklist on the right as your plan.</p>
            <div class="ep1-rec-host"></div>
          </div>
          <div class="ep1-final-help" id="ep1FinHelp"></div>
        </div>
        <aside class="ep1-final-side">
          <div class="ep1-eyebrow">Your story should include</div>
          <ul class="ep1-check" id="ep1FinCheck">${topicsHTML(mode === 'text' ? draft : '')}</ul>
          <p class="ep1-mini">${mode === 'text' ? 'The ticks only look for topic words — they can’t check grammar or meaning. You decide if your story is ready!' : 'For recordings, use the list as a plan — nothing analyses your voice.'}</p>
          <div class="ep1-final-btns">
            <button type="button" class="ep1-btn ep1-btn-ghost" data-help="phrases">💬 Useful phrases</button>
            <button type="button" class="ep1-btn ep1-btn-ghost" data-help="starters">🧩 Sentence starters</button>
            ${Voice.available() ? `<button type="button" class="ep1-btn ep1-btn-ghost" data-help="model">🔊 Listen to a model answer</button>` : ''}
            ${mode === 'text' ? `<button type="button" class="ep1-btn ep1-btn-ghost" data-help="review">🔍 Review my story</button>` : ''}
          </div>
        </aside>
      </div>
      <div class="ep1-final-foot"><span class="ep1-mini" id="ep1FinReq"></span><button type="button" class="ep1-next" data-submit disabled>Send to Mia ➤</button></div>
    </div>`;
    const ta = EP.sheet.querySelector('.ep1-final-ta');
    ta.addEventListener('input', () => { draft = ta.value; s.finalDraft = draft.slice(0, 2000); upd(); });
    if(mode === 'voice'){ if(rec) rec.destroy(); rec = makeRecorder(EP.sheet.querySelector('.ep1-rec-host'), { minSec: STORY_MIN_SEC, onChange: upd }); }
    upd();
  }
  function upd(){
    const btn = EP.sheet.querySelector('[data-submit]'), req = EP.sheet.querySelector('#ep1FinReq');
    if(!btn) return;
    if(mode === 'text'){
      const n = wordCount(draft);
      EP.sheet.querySelector('#ep1FinCount').textContent = `${n} words · aim for 60–100`;
      EP.sheet.querySelector('#ep1FinCheck').innerHTML = topicsHTML(draft);
      btn.disabled = n < STORY_MIN_WORDS;
      req.textContent = n < STORY_MIN_WORDS ? `Write at least ${STORY_MIN_WORDS} words to send it (${STORY_MIN_WORDS - n} to go).` : 'Ready when you are — you can still edit.';
    } else {
      btn.disabled = !(rec && rec.ready);
      req.textContent = rec && rec.ready ? 'Recording saved on this device. Ready to send!' : `Record at least ${STORY_MIN_SEC} seconds.`;
    }
  }
  EP.sheet.onclick = e => {
    const fm = e.target.closest('[data-fm]'); if(fm && !fm.disabled){ mode = fm.dataset.fm; draw(); return; }
    const h = e.target.closest('[data-help]');
    if(h){
      const box = EP.sheet.querySelector('#ep1FinHelp'), k = h.dataset.help;
      if(k === 'phrases') box.innerHTML = `<div class="ep1-helpbox"><b>Useful phrases</b><div class="ep1-starters">${['I was a little nervous','The airport was huge','I talked to an officer','I couldn\'t find my suitcase','Luckily, …helped me','Now I\'m at a hotel','Tomorrow I\'ll meet my host family','I can\'t believe I\'m here'].map(p => `<button type="button" class="ep1-chip" data-ins="${esc(p)}">${esc(p)}</button>`).join('')}</div></div>`;
      if(k === 'starters') box.innerHTML = `<div class="ep1-helpbox"><b>Sentence starters</b><div class="ep1-starters">${['Hey Mia!','When I landed, I felt…','At the airport, …','Then I had a problem: …','Luckily, …','Now I\'m…','Tomorrow…'].map(p => `<button type="button" class="ep1-chip" data-ins="${esc(p)}">${esc(p)}</button>`).join('')}</div></div>`;
      if(k === 'model'){ box.innerHTML = `<div class="ep1-helpbox"><b>🔊 Model answer</b><p>Listen — then tell YOUR story in your own words.</p><button type="button" class="ep1-btn ep1-btn-ghost" data-show-model>Show the text</button></div>`; Voice.speak('mia', STORY_MODEL); }
      if(k === 'review'){
        reviewed = true;
        const n = wordCount(draft), miss = STORY_TOPICS.filter(t => !t.re.test(draft));
        box.innerHTML = `<div class="ep1-helpbox"><b>🔍 Story check</b>
          <p>${n} words ${n >= 60 ? '— great length! ✓' : n >= STORY_MIN_WORDS ? '— good. A few more details would make it even better.' : `— try to write at least ${STORY_MIN_WORDS}.`}</p>
          ${miss.length ? `<p>You might add: ${miss.map(t => `<b>${esc(t.label.toLowerCase())}</b>`).join(', ')}.</p>` : '<p>You covered every part of the story. ✓</p>'}
          <p class="ep1-mini">This check only looks for topic words. It doesn't grade grammar or spelling — read your story once more yourself!</p></div>`;
      }
      return;
    }
    if(e.target.closest('[data-show-model]')){ EP.sheet.querySelector('#ep1FinHelp').innerHTML = `<div class="ep1-helpbox"><b>Model answer</b><p class="ep1-model-text">“${esc(STORY_MODEL)}”</p><p class="ep1-mini">Use it for ideas — but tell it your way.</p></div>`; return; }
    const ins = e.target.closest('[data-ins]');
    if(ins){ if(mode !== 'text'){ mode = 'text'; draw(); } const ta = EP.sheet.querySelector('.ep1-final-ta'); ta.value = (ta.value ? ta.value.trimEnd() + ' ' : '') + ins.dataset.ins.replace(/…$/, ' ').replace(/ …/, ' '); draft = ta.value; s.finalDraft = draft; ta.focus(); upd(); return; }
    if(e.target.closest('[data-submit]')) submit();
  };
  function submit(){
    if(submitting) return;
    if(mode === 'text' && wordCount(draft) < STORY_MIN_WORDS) return;
    if(mode === 'voice' && !(rec && rec.ready)) return;
    submitting = true;
    const result = mode === 'text'
      ? { mode:'text', text: draft.trim().slice(0, 2000), words: wordCount(draft), topics: STORY_TOPICS.filter(t => t.re.test(draft)).map(t => t.k), at: Date.now() }
      : { mode:'voice', seconds: Math.round(rec.seconds), at: Date.now() };
    if(rec){ rec.destroy(); rec = null; }
    s.final = result; delete s.finalDraft;
    taskDone('final');
    pushChat('mia', result.mode === 'text'
      ? { id:'e1s8story', from:'me', text: result.text, time: EP.scene.clock }
      : { id:'e1s8story', from:'me', kind:'voice', dur: fmtTime(result.seconds), time: EP.scene.clock });
    save(true);
    EP.sheet.hidden = true; EP.sheet.innerHTML = ''; EP.sheet.onclick = null;
    Sound.sfx('good');
    next(node, id);
  }
  draw();
};

/* =========================================================================
   COMPLETION — all world updates are idempotent (safe to repeat)
   ========================================================================= */
function journalText(){
  const f = st().flags;
  const feel = { excited:'I was so excited', nervous:'I was a little nervous', mixed:'I was excited and nervous at the same time' }[f.arrivalFeeling] || 'I was excited';
  return `Day 1 — Arrival. Today I landed in Los Angeles. ${feel}. I talked to an airport officer in English, found my missing suitcase at Carousel 6, and made it to my hotel. Chris says tomorrow might be more interesting than I expect… Tomorrow I'll meet my host family.`;
}
function applyCompletionWorld(){
  const s = st();
  ['first-talk','problem-solver','la-newcomer'].forEach(unlockAch);
  REQUIRED_PHRASES.forEach(addPhrase);
  giveItem('Suitcase');
  meet('chris');
  const m = DATA.memories.find(x => x.id === 'm0'); if(m) m.unlocked = true;
  const lax = DATA.locations.find(l => l.id === 'lax'); if(lax){ lax.status = 'unlocked'; lax.visited = true; lax.note = 'Visited · Day 1 — where your story began.'; }
  const hotel = DATA.locations.find(l => l.id === 'hotel'); if(hotel){ hotel.status = 'unlocked'; hotel.visited = true; hotel.name = 'Palm Court Hotel'; hotel.note = 'Your first night in LA. Room 412.'; }
  const exp = DATA.achievements.find(a => a.id === 'explorer'); if(exp && !exp.done) exp.progress = Math.max(exp.progress || 0, DATA.locations.filter(l => l.visited).length);
  const arr = DATA.story.find(x => x.id === 'arrival'); if(arr) arr.status = 'done';
  const fn = DATA.story.find(x => x.id === 'first-night'); if(fn && fn.status === 'locked') fn.status = 'current';
  if(!DATA.journal.some(j => j.id === 'ep1-arrival')) DATA.journal.unshift({ id:'ep1-arrival', auto:true, date:'Day 1 · ' + DATA.day.dateLabel, text: journalText() });
  s.completedScenes = SCENES.map(x => x.id);   // the whole episode has been lived through
}
RENDER.complete = function(node, id, tok){
  hideDlg(); hotspotsVisible(false);
  const s = st();
  const firstTime = !s.completed;
  s.completed = true; s.completedAt = s.completedAt || Date.now(); s.plays = (s.plays || 0) + (EP.countedPlay ? 0 : 1); EP.countedPlay = true;
  applyCompletionWorld();
  s.sceneId = null; s.nodeId = null;
  save(true); flushSave();
  Sound.sfx('reward');
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
      box.innerHTML = `<div class="ep1-end-big">EPISODE 1 COMPLETE</div><div class="ep1-end-sub">YOU MADE IT TO LOS ANGELES! 🌴</div>`;
      await wait(R ? 1200 : 3000); if(skip || tok !== EP.token) return;
      box.innerHTML = `<div class="ep1-card-line">Every new beginning comes with a story.</div>`;
      await wait(R ? 1000 : 2400); if(skip || tok !== EP.token) return;
      box.innerHTML = `<div class="ep1-card-line">And yours has only just started.</div>`;
      await wait(R ? 1000 : 2600); if(skip || tok !== EP.token) return;
      skip = true; summary(firstTime);
    })();
  }, isReduced() ? 200 : 900);
};
function summary(firstTime){
  const s = st();
  const phrasesN = DATA.phrases.filter(p => p.ep1).length;
  const ach = ['first-talk','problem-solver','la-newcomer'].map(ensureAch).filter(Boolean);
  EP.cine.hidden = false; EP.cine.className = 'ep1-cine ep1-cine-summary';
  EP.cine.innerHTML = `<div class="ep1-sum" role="dialog" aria-label="Episode summary">
    <div class="ep1-eyebrow">Season 1 · Episode 1</div>
    <h2>EPISODE 1 COMPLETE! 🌴</h2><p class="ep1-sum-sub">You made it to Los Angeles!</p>
    <div class="ep1-sum-grid">
      <div class="ep1-stat"><b>${Math.min(8, s.completedScenes.length)}/8</b><span>scenes completed</span></div>
      <div class="ep1-stat"><b>${phrasesN}</b><span>new phrases in your Backpack</span></div>
      <div class="ep1-stat"><b>${ach.filter(a => a.done).length}</b><span>achievements unlocked</span></div>
    </div>
    <div class="ep1-sum-row">
      <div class="ep1-sum-ach">${ach.map(a => `<div class="ep1-ach ${a.done ? 'on' : ''}"><span aria-hidden="true">${a.icon}</span>${esc(a.name)}</div>`).join('')}</div>
      <div class="ep1-sum-mem"><div class="ep1-polaroid"><div class="ep1-polaroid-img" style="background-image:url('${ASSETS.arrival}')"></div><div class="ep1-polaroid-cap">First Steps in LA</div></div><small>New memory collected</small></div>
      <div class="ep1-sum-next"><div class="ep1-eyebrow">🔓 Unlocked</div><b>Episode 2 — First Night 🌙</b><small>Your first night alone in LA… and what did Chris mean?</small></div>
    </div>
    <div class="ep1-sum-btns">
      <button type="button" class="ep1-btn ep1-btn-ghost" data-sum="replay">↺ Replay Episode</button>
      <button type="button" class="ep1-btn" data-sum="ep2">🌙 Episode 2 — First Night</button>
      <button type="button" class="ep1-next" data-sum="room" data-primary>Back to My Room ▸</button>
    </div></div>`;
  EP.cine.onclick = e => {
    const b = e.target.closest('[data-sum]'); if(!b) return;
    if(b.dataset.sum === 'room') close();
    if(b.dataset.sum === 'replay') confirmBox('Replay Episode 1?', 'Your rewards, phrases and messages stay. You start again from Scene 1.', () => { EP.cine.onclick = null; restartEpisode(); });
    if(b.dataset.sum === 'ep2') ep2Preview(true);
  };
  EP.cine.querySelector('[data-sum="room"]').focus({ preventScroll:true });
  if(firstTime) setTimeout(() => toast('🌴', 'Achievement unlocked', 'LA Newcomer'), 500);
}
function ep2PreviewHTML(){
  return `<div class="ep1-ep2"><div class="ep1-eyebrow">🔓 Unlocked · Episode 2</div><h2>🌙 First Night</h2>
    <p>Your first night alone in a Los Angeles hotel. A city that never really sleeps, a message you didn't expect — and one big question: what did Chris mean about tomorrow?</p>
    <p class="ep1-mini">Episode 2 is being filmed right now. 🎬 It will appear here as soon as it's ready.</p></div>`;
}
function ep2Preview(inEpisode){
  if(inEpisode){
    openModalEp(`${ep2PreviewHTML()}<div class="ep1-row"><span></span><button type="button" class="ep1-next" data-mclose>Got it</button></div>`);
  }
}

/* =========================================================================
   MENUS — pause, settings, backpack, confirm, resume
   ========================================================================= */
function openModalEp(html, opts = {}){
  EP.modal.hidden = false;
  EP.modal.innerHTML = `<div class="ep1-mbox" role="dialog" aria-modal="true">${opts.noX ? '' : '<button type="button" class="ep1-pop-x" data-mclose aria-label="Close">✕</button>'}${html}</div>`;
  EP.modal.onclick = e => {
    if(e.target === EP.modal && !opts.noX) return closeModalEp();
    if(e.target.closest('[data-mclose]')) return closeModalEp();
    opts.onClick && opts.onClick(e);
  };
  requestAnimationFrame(() => { const b = EP.modal.querySelector('.ep1-mbox button:not(.ep1-pop-x), .ep1-mbox input'); b && b.focus({ preventScroll:true }); });
}
function closeModalEp(){ EP.modal.hidden = true; EP.modal.innerHTML = ''; if(EP.paused) resume(); }
function confirmBox(title, text, yes, no, opts = {}){
  const wasPaused = EP.paused;
  openModalEp(`<h3>${esc(title)}</h3><p>${esc(text)}</p>${opts.ua ? `<p class="ep1-mini">${esc(opts.ua)}</p>` : ''}<div class="ep1-row"><button type="button" class="ep1-btn ep1-btn-ghost" data-no>Cancel</button><button type="button" class="ep1-next ${opts.danger ? 'ep1-danger' : ''}" data-yes>${esc(opts.yes || 'Yes')}</button></div>`,
    { noX:true, onClick: e => {
      if(e.target.closest('[data-yes]')){ EP.paused = false; EP.modal.hidden = true; EP.modal.innerHTML = ''; resumeAudio(); yes(); }
      if(e.target.closest('[data-no]')){ if(no) no(); else closeModalEp(); }
    } });
  EP.paused = wasPaused;
}
function pause(){
  if(EP.paused) return;
  EP.paused = true; EP.root.classList.add('ep1-paused');
  Voice.stop(); Sound.suspend();
  const sc = EP.scene;
  openModalEp(`<div class="ep1-eyebrow">Paused</div><h3>${sc ? `${sc.emoji} Scene ${sc.n}: ${esc(sc.title)}` : 'Episode 1'}</h3>
    <div class="ep1-menu">
      <button type="button" class="ep1-next" data-pm="resume">▶ Continue</button>
      <button type="button" class="ep1-btn" data-pm="settings">⚙️ Settings</button>
      <button type="button" class="ep1-btn ep1-btn-ghost" data-pm="scene" ${sc ? '' : 'disabled'}>↺ Restart this scene</button>
      <button type="button" class="ep1-btn ep1-btn-ghost" data-pm="episode">⟲ Restart the episode</button>
      <button type="button" class="ep1-btn ep1-btn-ghost" data-pm="exit">🏠 Save &amp; go back to my room</button>
      ${typeof window.resetProgress === 'function' ? '<button type="button" class="ep1-btn ep1-btn-ghost ep1-btn-danger" data-pm="erase">🗑 Reset Episode 1 (erase progress)</button>' : ''}
    </div><p class="ep1-mini">Your progress is saved automatically.</p>`, { onClick: e => {
      const b = e.target.closest('[data-pm]'); if(!b) return;
      const a = b.dataset.pm;
      if(a === 'resume') closeModalEp();
      if(a === 'settings') openSettings();
      if(a === 'exit'){ EP.paused = false; EP.modal.hidden = true; close(); }
      const back = () => { EP.paused = false; pause(); };
      if(a === 'scene') confirmBox('Restart this scene?', 'You go back to the start of this scene. Your rewards and saved phrases stay.', () => { EP.root.classList.remove('ep1-paused'); gotoScene(sc.id, null, { noCard:false }); }, back);
      if(a === 'episode') confirmBox('Restart Episode 1?', 'You go back to Scene 1. Your rewards, phrases, journal and messages stay.', () => { EP.root.classList.remove('ep1-paused'); restartEpisode(); }, back);
      if(a === 'erase') confirmBox('Reset Episode 1 to the very beginning?',
        "Everything from this episode is erased: your place in the story, choices, answers, all its chats, phrases, items, achievements and memories. Your journal stays. This can't be undone.",
        () => { Voice.stop(); Sound.stop(); window.resetProgress('episode', 'ep1'); }, back,
        { ua:'Епізод почнеться з нуля, усі переписки скинуться. Щоденник залишиться.', yes:'Yes, reset it', danger:true });
    } });
}
function resumeAudio(){ EP.root.classList.remove('ep1-paused'); Sound.resume(); }
function resume(){ EP.paused = false; resumeAudio(); }
function openSettings(){
  const sync = STUDENT_SYNC();
  openModalEp(`<div class="ep1-eyebrow">Episode settings</div><h3>⚙️ Settings</h3>
    ${[['subs','Subtitles','Show the text of what people say'],
       ['challenge','Listening challenge','Hide subtitles in listening tasks until you answer'],
       ['ua','Ukrainian help','Show translations automatically'],
       ['voice','Character voices','Read lines aloud (browser text-to-speech)'],
       ['slow','Slower speech','Characters speak more slowly'],
       ['sound','Sound & ambience','Airport sounds, chimes, music']].map(([k, t, d]) =>
      `<label class="ep1-set"><span><b>${t}</b><small>${d}</small></span><input type="checkbox" data-set="${k}" ${SET[k] ? 'checked' : ''}></label>`).join('')}
    <label class="ep1-set"><span><b>Volume</b><small>Ambience and effects</small></span><input type="range" min="0" max="1" step="0.05" value="${SET.volume}" data-vol aria-label="Volume"></label>
    <label class="ep1-set"><span><b>Reduce motion</b><small>Fewer animations</small></span><input type="checkbox" data-motion ${document.body.classList.contains('reduced-motion') ? 'checked' : ''}></label>
    <p class="ep1-mini">💾 ${esc(sync)}</p>`, { onClick: () => {} });
  EP.modal.querySelectorAll('[data-set]').forEach(i => i.addEventListener('change', () => { SET[i.dataset.set] = i.checked; saveSettings(); if(i.dataset.set === 'sound') Sound.applyVolume(); if(!SET.voice || !SET.sound) Voice.stop(); syncTop(); }));
  const v = EP.modal.querySelector('[data-vol]'); v.addEventListener('input', () => { SET.volume = +v.value; saveSettings(); Sound.applyVolume(); });
  EP.modal.querySelector('[data-motion]').addEventListener('change', e => document.body.classList.toggle('reduced-motion', e.target.checked));
}
function STUDENT_SYNC(){
  const m = window.LILA_SYNC || 'device';
  if(m === 'preview') return 'Preview mode — progress is saved in this browser only.';
  if(m === 'cloud') return 'Progress is saved to your account.';
  if(m === 'no-story-column') return 'Progress is saved on this device. (Teacher: run the Episode 1 database update to save story progress to the account too.)';
  if(m === 'offline') return "You seem to be offline — progress is saved on this device and will sync later.";
  return 'Progress is saved on this device.';
}
function openBackpack(tab = 'phrases'){
  const learned = DATA.phrases.filter(p => p.ep1);
  openModalEp(`<div class="ep1-eyebrow">Your stuff</div><h3>🎒 Backpack</h3>
    <div class="ep1-modes"><button type="button" class="ep1-seg ${tab === 'phrases' ? 'on' : ''}" data-bt="phrases">Useful English</button><button type="button" class="ep1-seg ${tab === 'items' ? 'on' : ''}" data-bt="items">Items</button></div>
    <div class="ep1-bp">${tab === 'phrases'
      ? (learned.length ? learned.map(p => `<div class="ep1-bp-card"><div><b>${esc(p.en)}</b><small>${esc(p.ua)}</small></div>${Voice.available() ? `<button type="button" class="ep1-tool" data-say="${esc(p.en)}" aria-label="Listen">🔊</button>` : ''}</div>`).join('')
        : '<p class="ep1-mini">Phrases you save in this episode appear here. Tap a highlighted phrase in a dialogue to save it!</p>')
      : DATA.items.map(n => { const it = ITEMS[n] || { icon:'🎒', desc:'' }; return `<div class="ep1-bp-card"><span class="ep1-item-i" aria-hidden="true">${it.icon}</span><div><b>${esc(n)}</b><small>${esc(it.desc)}</small></div></div>`; }).join('')}</div>`,
    { onClick: e => { const t = e.target.closest('[data-bt]'); if(t) openBackpack(t.dataset.bt); const s = e.target.closest('[data-say]'); if(s) Voice.speak('you', s.dataset.say); } });
}

/* =========================================================================
   OPEN / CLOSE / RESUME
   ========================================================================= */
function prefetch(){ Object.keys(PHOTOS).forEach(k => probePhoto(k)); probeSuitcases(); }
function open(opts = {}){
  build();
  if(EP.open) return;
  if(document.activeElement && document.activeElement.blur) document.activeElement.blur();
  const s = st();
  EP.open = true; EP.paused = false; EP.countedPlay = false;
  EP.root.hidden = false; document.body.classList.add('ep1-open');
  EP.root.focus({ preventScroll:true });
  EP.root.classList.toggle('ep1-reduced', isReduced());
  try { history.pushState({ lilaEp1:true }, ''); EP.pushedHistory = true; } catch(e){}
  Sound.unlock(); prefetch(); syncTop();
  if(typeof closeModal === 'function') try { closeModal(); } catch(e){}
  EP.bgKey = null;
  if(opts.replay) return restartEpisode();
  if(s.sceneId && SCENE_BY_ID[s.sceneId]){
    const sc = SCENE_BY_ID[s.sceneId];
    EP.scene = sc; setBg(bgAt(sc, s.nodeId).bg); updateProgressFor(sc);
    return showResume(sc);
  }
  if(s.completed) return restartEpisode();
  ensureStartItems();
  gotoScene('s1');
}
function showResume(sc){
  const s = st();
  openModalEp(`<div class="ep1-eyebrow">Welcome back 👋</div><h3>Continue Episode 1</h3>
    <p>Scene ${sc.n} of 8 · <b>${sc.emoji} ${esc(sc.title)}</b></p>
    <div class="ep1-menu">
      <button type="button" class="ep1-next" data-rs="continue">▶ Continue where I left off</button>
      <button type="button" class="ep1-btn ep1-btn-ghost" data-rs="scene">↺ Restart this scene</button>
      <button type="button" class="ep1-btn ep1-btn-ghost" data-rs="episode">⟲ Restart the episode</button>
      <button type="button" class="ep1-btn ep1-btn-ghost" data-rs="room">🏠 Back to my room</button>
    </div>`, { noX:true, onClick: e => {
      const b = e.target.closest('[data-rs]'); if(!b) return;
      const a = b.dataset.rs;
      if(a === 'episode') return confirmBox('Restart Episode 1?', 'You go back to Scene 1. Your rewards, phrases, journal and messages stay.', restartEpisode, () => showResume(sc));
      EP.modal.hidden = true; EP.modal.innerHTML = '';
      if(a === 'continue') gotoScene(sc.id, s.nodeId, { noCard:true });
      if(a === 'scene') gotoScene(sc.id, null);
      if(a === 'room') close();
    } });
}
function updateProgressFor(sc){ EP.nodeId = sc.order[0]; updateProgress(); }
function ensureStartItems(){ START_ITEMS.forEach(i => { if(!DATA.items.includes(i)) DATA.items.push(i); }); }
function restartEpisode(){
  const s = st();
  s.sceneId = null; s.nodeId = null; s.completedScenes = s.completed ? s.completedScenes : []; s.flags = { phoneUnlocked:false };
  s.choices = {}; s.answers = s.answers || {};
  EP.countedPlay = false;
  ensureStartItems();
  closePop(); hideGame(); closePhone(); EP.sheet.hidden = true; EP.cine.hidden = true; EP.cine.onclick = null;
  EP.stage.classList.remove('ep1-night');
  save(true);
  gotoScene('s1');
}
function close(opts = {}){
  if(!EP.open) return;
  EP.open = false; EP.token++;
  Voice.stop(); Sound.stop(); destroyRecorders();
  closePop(); hideGame(); closePhone(); hideDlg();
  EP.cine.hidden = true; EP.cine.innerHTML = ''; EP.cine.onclick = null; EP.sheet.hidden = true; EP.sheet.innerHTML = '';
  EP.modal.hidden = true; EP.modal.innerHTML = ''; EP.notif.hidden = true; EP.tray.hidden = true;
  EP.root.hidden = true; EP.root.classList.remove('ep1-paused'); document.body.classList.remove('ep1-open');
  flushSave();
  if(EP.pushedHistory && !opts.fromPop){ EP.pushedHistory = false; try { history.back(); } catch(e){} }
  refreshHome();
}
function refreshHome(){
  ['renderTopbar','renderMission','renderMessages','renderShelf'].forEach(fn => { if(typeof window[fn] === 'function') try { window[fn](); } catch(e){ console.warn(fn, e); } });
}

/* =========================================================================
   SAVE / LOAD BRIDGE for index.html
   ========================================================================= */
const LEGACY_MIA = ["Did you land safely?! Miss you already 😭", "Just landed! LAX is HUGE.", "Tell me EVERYTHING the second you can!"];
const MIA_SEED = [
  { id:'pre1', from:'them', text:"Text me the SECOND you land!! ✈️" },
  { id:'pre2', from:'me',   text:"I promise! Boarding now 💙" },
  { id:'pre3', from:'them', text:"Safe flight!! Miss you already 😭" }
];
function migrateMiaChat(chat){
  if(!Array.isArray(chat)) return chat;
  if(chat.length >= 3 && LEGACY_MIA.every((t, i) => chat[i] && chat[i].text === t)){
    return MIA_SEED.map(m => Object.assign({}, m)).concat(chat.slice(3));
  }
  return chat;
}
const LilaStory = {
  collect(){
    return {
      v:1,
      episodes: DATA.episodes || {},
      world: {
        phrases: DATA.phrases.filter(p => p.ep1).map(p => p.id),
        items: DATA.items.slice(),
        ach: Object.fromEntries(DATA.achievements.map(a => [a.id, { progress:a.progress || 0, done:!!a.done, locked:!!a.locked }])),
        memories: DATA.memories.filter(m => m.unlocked).map(m => m.id),
        locations: Object.fromEntries(DATA.locations.map(l => [l.id, { status:l.status, visited:!!l.visited, note:l.note, name:l.name }])),
        people: DATA.people.filter(p => p.revealed).map(p => p.id),
        story: Object.fromEntries(DATA.story.map(x => [x.id, x.status])),
        threads: DATA.messages.map(m => m.id)
      }
    };
  },
  apply(story, chat){
    chat = chat || {};
    if(story && story.world && Array.isArray(story.world.threads) && story.world.threads.includes('coordinator')) thread('coordinator');
    if(chat.coordinator) thread('coordinator');
    DATA.messages.forEach(m => {
      if(!Array.isArray(chat[m.id])) return;   // nothing saved for this thread → keep its original look
      m.chat = m.id === 'mia' ? migrateMiaChat(chat[m.id]) : chat[m.id];
      if(m.chat.length) refreshMeta(m);
    });
    if(!story) return;
    if(story.episodes && typeof story.episodes === 'object') DATA.episodes = story.episodes;
    const w = story.world; if(!w) return;
    (w.phrases || []).slice().reverse().forEach(addPhrase);
    if(Array.isArray(w.items) && w.items.length) DATA.items = w.items.slice();
    if(w.ach) Object.entries(w.ach).forEach(([id, v]) => { const a = ensureAch(id) || DATA.achievements.find(x => x.id === id); if(a){ a.progress = v.progress; a.done = v.done; a.locked = v.locked; } });
    (w.memories || []).forEach(id => { const m = DATA.memories.find(x => x.id === id); if(m) m.unlocked = true; });
    if(w.locations) Object.entries(w.locations).forEach(([id, v]) => { const l = DATA.locations.find(x => x.id === id); if(l) Object.assign(l, v); });
    (w.people || []).forEach(id => { if(id === 'chris') meet('chris'); const p = DATA.people.find(x => x.id === id); if(p) p.revealed = true; });
    if(w.story) Object.entries(w.story).forEach(([id, status]) => { const x = DATA.story.find(y => y.id === id); if(x) x.status = status; });
  },
  missionCard(){
    const s = st();
    if(s.sceneId && SCENE_BY_ID[s.sceneId]){ const sc = SCENE_BY_ID[s.sceneId]; return { eyebrow:'Continue your story', title:'Arrival', desc:`Scene ${sc.n} of 8 · ${sc.title}`, cta:'Continue', icon:'✈️' }; }
    if(s.completed) return { eyebrow:'Next episode', title:'First Night', desc:'Unlocked! Your first night alone in LA…', cta:'Preview', icon:'🌙' };
    return { eyebrow:"Today's mission", title:'Arrival', desc:"You've just landed at LAX. Let's see what's waiting for you.", cta:'Start', icon:'✈️' };
  },
  onMissionClick(){
    const s = st();
    if(s.completed && !s.sceneId) return openModal('ep2preview');
    open();
  },
  onStoryStop(id){
    const s = st();
    if(id === 'arrival'){ if(s.completed && !s.sceneId) return openModal('memories'); return open(); }
    if(id === 'first-night') return openModal('ep2preview');
    openModal('memories');
  },
  renderModal(type){
    if(type === 'ep2preview') return `<div class="modal-eyebrow">Your story</div>${ep2PreviewHTML()}
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;"><button class="btn-solid" data-ep1-replay>↺ Replay “Arrival”</button></div>`;
    return null;
  },
  wireModal(type){
    if(type === 'ep2preview'){ const b = document.querySelector('[data-ep1-replay]'); if(b) b.addEventListener('click', () => open({ replay:true })); }
  },
  itemInfo: name => ITEMS[name] || null,
  /* read-only peek for testing/debugging */
  _peek(){ const n = EP.scene && EP.scene.nodes[EP.nodeId]; return { open:EP.open, scene:EP.scene && EP.scene.id, node:EP.nodeId, type:n && n.type, state:JSON.parse(JSON.stringify(st())) }; },
  open, close, PHRASES, SCENES
};
window.LilaStory = LilaStory;

/* =========================================================================
   RESET — what "Reset Episode 1" removes from a saved progress snapshot.
   index.html builds the snapshot, calls clear(), saves the result and reloads.
   Removed: episode state (scene, choices, answers, tasks, final mission),
   Mia's chat back to the pre-flight messages, the Exchange Program thread,
   and every world change this episode makes (phrases, Suitcase, Chris,
   achievements, the "First Steps" memory, LAX + hotel on the map, story
   timeline). Kept: the journal (incl. the auto entry), day, device settings.
   ========================================================================= */
const EP1_ACH = ['first-talk','problem-solver','la-newcomer','explorer'];
function clearEp1(snap){
  snap = snap || {};
  const story = (snap.story && typeof snap.story === 'object') ? snap.story : { v:1, episodes:{}, world:{} };
  story.episodes = Object.assign({}, story.episodes); delete story.episodes.ep1;
  const w = story.world = Object.assign({}, story.world);
  if(Array.isArray(w.phrases)) w.phrases = w.phrases.filter(id => !PHRASES[id]);
  if(Array.isArray(w.items)) w.items = w.items.filter(n => START_ITEMS.includes(n) || !ITEMS[n]);
  if(w.ach){ w.ach = Object.assign({}, w.ach); EP1_ACH.forEach(id => delete w.ach[id]); }
  if(Array.isArray(w.memories)) w.memories = w.memories.filter(id => id !== 'm0');
  if(w.locations){ w.locations = Object.assign({}, w.locations); delete w.locations.lax; delete w.locations.hotel; }
  if(Array.isArray(w.people)) w.people = w.people.filter(id => id !== 'chris');
  if(w.story){ w.story = Object.assign({}, w.story); delete w.story.arrival; delete w.story['first-night']; }
  if(Array.isArray(w.threads)) w.threads = w.threads.filter(id => id !== 'coordinator');
  snap.chat = Object.assign({}, snap.chat);
  delete snap.chat.coordinator;
  delete snap.chat.mia;            // no saved chat → the page shows Mia's original pre-flight messages
  snap.story = story;
  return snap;
}
window.LILA_EPISODES = window.LILA_EPISODES || [];
if(!window.LILA_EPISODES.some(e => e.id === 'ep1')) window.LILA_EPISODES.push({
  id:'ep1', n:1, title:'Arrival', icon:'✈️',
  status(){
    const s = DATA.episodes && DATA.episodes.ep1;
    if(!s) return 'Not started';
    if(s.sceneId && SCENE_BY_ID[s.sceneId]) return `In progress · Scene ${SCENE_BY_ID[s.sceneId].n} of 8`;
    if(s.completed) return 'Completed';
    return (s.completedScenes && s.completedScenes.length) ? `In progress · ${s.completedScenes.length} of 8 scenes` : 'Not started';
  },
  clear: clearEp1
});

})();
