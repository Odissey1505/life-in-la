/* =========================================================================
   LIFE IN LA — Season 1 · Episode 1: "ARRIVAL"
   -------------------------------------------------------------------------
   Episode content: phrases, items, the 8 scenes, scene art and photos, the
   airport mini-games (carousel, baggage board, describe, Carousel 6,
   terminal map), the final mission and the completion screen.

   The player itself (dialogue, phone, speaking, menus, saving) lives in
   episodes/engine/lila-engine.js, which must be loaded first. This file
   registers the episode with LilaEngine.register(...) at the bottom.
   ========================================================================= */
(function(){
'use strict';
const E = window.LilaEngine;
if(!E){ console.error('Life in LA: episodes/engine/lila-engine.js must load before episode-01.js'); return; }
const { esc, $, wordCount, isReduced, wait, fmtTime, SET, Sound, Voice, canRecord, makeRecorder, speakBox, st, save, flushSave,
        taskDone, ensureAch, unlockAch, addPhrase, giveItem, meet, thread, pushChat, EP, dlg, hideDlg, primary, head, lineHTML,
        tools, toast, vocabCard, next, hotspotsVisible, showGame, hideGame, openModalEp, confirmBox, close, restartEpisode, keepImage } = E.api;
const { rng, svg, lin, rad, FONT, skyline, lights, palm, figure, nextArtId } = E.api.art;
const RENDER = {};      // Episode 1's own node types (mini-games, final, complete)


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
                  "Підказка: Мія хоче, щоб ти розповідав(-ла) їй про все, що з тобою відбувається." ], good:'Exactly! Mia wants to hear about everything.' } },
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
    open:    { type:'quiz', key:'s5_opening', valueKey:'opening', noLine:true, polite:true,
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
  const u = nextArtId('ep1a');
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
    keepImage(im);
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
  const u = nextArtId('ep1s');
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
      <div class="ep1-sum-next"><div class="ep1-eyebrow">🔓 Unlocked</div><b>Episode 2 — First Night in LA 🌙</b><small>Your first night alone in LA… and what did Chris mean?</small></div>
    </div>
    <div class="ep1-sum-btns">
      <button type="button" class="ep1-btn ep1-btn-ghost" data-sum="replay">↺ Replay Episode</button>
      <button type="button" class="ep1-btn" data-sum="ep2">🌙 Play Episode 2 — First Night in LA</button>
      <button type="button" class="ep1-next" data-sum="room" data-primary>Back to My Room ▸</button>
    </div></div>`;
  EP.cine.onclick = e => {
    const b = e.target.closest('[data-sum]'); if(!b) return;
    if(b.dataset.sum === 'room') close();
    if(b.dataset.sum === 'replay') confirmBox('Replay Episode 1?', 'Your rewards, phrases and messages stay. You start again from Scene 1.', () => { EP.cine.onclick = null; restartEpisode(); });
    if(b.dataset.sum === 'ep2'){ EP.cine.onclick = null; if(LilaEngine.has('ep2')) LilaEngine.open('ep2'); else ep2Preview(true); }
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
   RESET — what "Reset Episode 1" removes from a saved progress snapshot.
   index.html builds the snapshot, calls clear(), saves the result and reloads.
   Removed: episode state (scene, choices, answers, tasks, final mission),
   Mia's chat back to the pre-flight messages, the Exchange Program thread,
   and every world change this episode makes (phrases, Suitcase, Chris,
   achievements, the "First Steps" memory, LAX + hotel on the map, story
   timeline). Kept: the journal (incl. the auto entry), day, device settings.
   (Later episodes are cleared first by the engine — they build on this one.)
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

/* =========================================================================
   REGISTER
   ========================================================================= */
E.register({
  id:'ep1', n:1, title:'Arrival', icon:'✈️', label:'Season 1 · Episode 1', storyId:'arrival', dayLabel:'Day 1',
  tagline:"You've just landed at LAX. Let's see what's waiting for you.",
  card(){ return { eyebrow:"Today's mission", title:'Arrival', desc:"You've just landed at LAX. Let's see what's waiting for you.", cta:'Start', icon:'✈️' }; },
  scenes: SCENES, phrases: PHRASES, items: ITEMS, speakers: SPEAKERS, startItems: START_ITEMS,
  achievements: {
    'first-talk':     { icon:'💬', name:'First Conversation', total:1 },
    'problem-solver': { icon:'🧳', name:'Problem Solver', total:1 },
    'la-newcomer':    { icon:'🌴', name:'LA Newcomer', total:1 }
  },
  people: { chris: { id:'chris', name:'Chris', role:'Exchange program driver', color:'#FFB199', dark:true, at:1,
    bio:"Your exchange program's driver. Calm, friendly — the first person to welcome you to LA. He knows something about tomorrow…",
    catch:"“Long flight?” · “Let's just say…”" } },
  threads: { coordinator: { id:'coordinator', name:'Exchange Program', color:'#6DBB75', official:true, icon:'🏫', sub:'Official program contact ✓' } },
  photoBase: PHOTO_BASE, photos: PHOTOS, photoExtras: PHOTO_EXTRAS, photoLayers: PHOTO_LAYERS,
  art: sceneArt, prefetch: probeSuitcases,
  phoneUnlocked: sc => sc.id === 's2' || sc.index > 1,
  hideHotspots: ['carousel','pick','describe','navmap','board'],
  soundDesc: 'Airport sounds, chimes, music',
  render: RENDER,
  clearOwn: clearEp1
});

})();
