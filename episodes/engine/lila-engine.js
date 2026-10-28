/* =========================================================================
   LIFE IN LA — EPISODE PLAYER (shared by every episode)
   -------------------------------------------------------------------------
   The cinematic full-screen player: backgrounds and camera, dialogue,
   choices, quizzes, listening, speaking/recording, the in-story phone,
   rewards, pause/settings/backpack menus, resume, and the save/load bridge
   that index.html talks to (window.LilaStory).

   Episodes are content files that call LilaEngine.register({...}) with
   their scenes, phrases, items, characters, art and any extra node types
   (mini-games). Loaded by index.html BEFORE the episode files; uses the
   homepage globals DATA, ASSETS, saveProgress(), openModal(), closeModal(),
   faceSVG(), FLAGS, render*().

   The CSS classes keep their historical "ep1-" prefix — it now simply means
   "episode player" and is shared by all episodes (see lila-engine.css).
   Architecture: Episode → Scene → Story node → player action → state
   update → next node. Every scene / node / message has a stable id so
   progress can be saved, resumed and replayed without duplicates.
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
   REGISTRY — everything episodes bring with them
   ========================================================================= */
const EPISODES = [];          // registered episodes, ordered by n
const BY_ID = {};
const PHRASES = {};           // all story phrases by stable id (ids are unique across the course)
const ITEMS = {};             // inventory catalogue: name → { icon, desc } (desc may be a function)
const PEOPLE_DEFS = {};       // People cards an episode can reveal or add
const THREAD_DEFS = {};       // phone threads an episode can create
const ACH_DEFS = {};          // achievements an episode can unlock
const COMMON_SPEAKERS = {
  you: { name:'You', color:'#FF8A3D', icon:'🙂', voice:{ g:'any', pitch:1.05, rate:0.95, idx:2 } },
  mia: { name:'Mia', role:'Best friend · Ukraine', color:'#5AB6F9', voice:{ g:'f', pitch:1.22, rate:1.05, idx:1 } }
};
const HIDE_HOTSPOTS = ['notify','phone','final','complete','cards','reward'];
let D = null;                 // the episode that is open (or was opened last)
function spk(who){
  if(D && D.speakers && D.speakers[who]) return D.speakers[who];
  if(COMMON_SPEAKERS[who]) return COMMON_SPEAKERS[who];
  for(const e of EPISODES) if(e.speakers && e.speakers[who]) return e.speakers[who];
  return null;
}
function itemInfo(name){
  const it = ITEMS[name]; if(!it) return null;
  let desc = it.desc;
  if(typeof desc === 'function'){ try { desc = desc(); } catch(e){ desc = ''; } }
  return { icon: it.icon, desc: desc || '' };
}

let artSeq = 0;
const nextArtId = p => (p || 'lla') + (++artSeq);
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

/* =========================================================================
   PHOTO BACKGROUNDS — each episode can ship real photos in its own folder
   (def.photoBase + def.photos[key]). If a photo is missing or slow, the
   episode's drawn art (def.art(key)) is shown instead, so it always works.
   ========================================================================= */
const photoState = {};   // 'ep:key' -> 'ok' | 'missing' | Promise
const preloaded = [];
function keepImage(im){ preloaded.push(im); return im; }
function probePhoto(key, def){
  def = def || D;
  const id = def.id + ':' + key;
  if(photoState[id] === 'ok' || photoState[id] === 'missing') return Promise.resolve(photoState[id]);
  if(photoState[id]) return photoState[id];
  const file = def.photos && def.photos[key];
  if(!file){ photoState[id] = 'missing'; return Promise.resolve('missing'); }
  photoState[id] = new Promise(res => {
    const img = new Image();
    const done = v => { if(typeof photoState[id] === 'string') return; photoState[id] = v; res(v); };
    img.onload = () => done('ok');
    img.onerror = () => done('missing');
    setTimeout(() => done('missing'), 12000);
    img.src = def.photoBase + file;
    ((def.photoExtras || {})[key] || []).forEach(n => { const x = new Image(); x.src = def.photoBase + n + '.webp'; preloaded.push(x); });
  });
  return photoState[id];
}
const ENGINE_PH_IMG = n => `<img class="ep1-pic" src="${D.photoBase + n}.webp" alt="" draggable="false" decoding="async" onerror="this.remove()">`;
function photoLayers(key){
  const build = D.photoLayers && D.photoLayers[key];
  const main = D.photos[key].replace(/\.webp$/, '');
  /* a soft, blurred copy behind the photo fills any edge the framing leaves open */
  return `<div class="ep1-pic-backdrop" style="background-image:url('${D.photoBase + D.photos[key]}')"></div>` +
    `<div class="ep1-pic-box" data-ph="${key}">${build ? build() : ENGINE_PH_IMG(main)}</div>`;
}
function sceneArt(key){
  try { return D.art ? D.art(key) : ''; } catch(e){ console.warn('Life in LA: art failed', key, e); return ''; }
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
      case 'lobby':    bed('lowpass', 300, 0.22); bed('bandpass', 900, 0.05); every(9000, () => { if(Math.random() < 0.5) blip('ding'); }); break;
      case 'room':     bed('lowpass', 180, 0.3); tone(60, 0.006); break;
      case 'street':   bed('lowpass', 650, 0.42); bed('bandpass', 1400, 0.04); every(4200, () => { if(Math.random() < 0.75) blip('swoosh'); }); break;
      case 'diner':    bed('bandpass', 700, 0.28); bed('lowpass', 220, 0.2); every(2600, () => { if(Math.random() < 0.45) blip('clink'); }); break;
      case 'night':    bed('lowpass', 140, 0.14); tone(196, 0.004); break;
      case 'hotel':    bed('lowpass', 260, 0.12);
        [220, 277.2, 329.6, 415.3].forEach((f, i) => { const o = tone(f, 0.008); const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.07 + i * 0.03; lg.gain.value = 0.006; lfo.connect(lg).connect(o.frequency); lfo.start(); L.nodes.push(lfo, lg); });
        break;
    }
    g.gain.setTargetAtTime(kind === 'hotel' || kind === 'night' ? 0.8 : 0.55, ctx.currentTime, 0.6);
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
      case 'ding':     note(1318.5, 0, 0.9, 0.06); note(1046.5, 0.18, 1.1, 0.05); break;
      case 'clink':    note(2637 + Math.random() * 300, 0, 0.25, 0.03, 'triangle'); break;
      case 'bell':     note(1568, 0, 1.4, 0.12, 'triangle'); note(2093, 0, 1.0, 0.05); break;
      case 'card-bad': note(220, 0, 0.16, 0.18, 'square'); note(196, 0.2, 0.22, 0.18, 'square'); break;
      case 'card-ok':  note(988, 0, 0.12, 0.12, 'square'); note(1319, 0.12, 0.18, 0.1, 'square'); break;
      case 'wifi':     [659.3, 880, 1174.7].forEach((f, i) => note(f, i * 0.09, 0.4, 0.09, 'triangle')); break;
      case 'ring':     for(let r = 0; r < 2; r++){ [0, 0.18].forEach(t => { note(784, r * 1.1 + t, 0.15, 0.1); note(988, r * 1.1 + t + 0.08, 0.15, 0.08); }); } break;
      case 'sent':     burst(0, 0.25, 0.12, 'bandpass', 2400, 900); break;
      case 'mystery':  note(392, 0, 1.6, 0.07); note(466.2, 0.5, 1.6, 0.06); note(554.4, 1.0, 2.2, 0.05); break;
      case 'stomach': {
        const o = ctx.createOscillator(), g = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain(), fl = ctx.createBiquadFilter();
        o.type = 'sawtooth'; o.frequency.value = 70; l.frequency.value = 7; lg.gain.value = 25; l.connect(lg).connect(o.frequency);
        fl.type = 'lowpass'; fl.frequency.value = 260; o.connect(fl).connect(g).connect(master);
        const t0 = ctx.currentTime;
        g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.28, t0 + 0.15); g.gain.linearRampToValueAtTime(0.12, t0 + 0.6);
        g.gain.linearRampToValueAtTime(0.3, t0 + 0.9); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.6);
        o.start(t0); l.start(t0); o.stop(t0 + 1.7); l.stop(t0 + 1.7);
        break; }
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
        const cfg = (spk(who) && spk(who).voice) || { g:'any', pitch:1, rate:0.95 };
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
   STATE — per-episode progress (DATA.episodes[id]) + persistent world
   ========================================================================= */
function freshState(){
  return { sceneId:null, nodeId:null, completedScenes:[], flags:{}, choices:{}, tasks:[], answers:{},
           explored:[], final:null, completed:false, completedAt:null, startedAt:null, plays:0 };
}
function peekSt(id){ return (DATA.episodes && DATA.episodes[id]) || null; }
function stOf(id){
  if(!DATA.episodes) DATA.episodes = {};
  if(!DATA.episodes[id]) DATA.episodes[id] = freshState();
  const s = DATA.episodes[id];
  ['completedScenes','tasks','explored'].forEach(k => { if(!Array.isArray(s[k])) s[k] = []; });
  ['flags','choices','answers'].forEach(k => { if(!s[k] || typeof s[k] !== 'object') s[k] = {}; });
  return s;
}
function st(){ return stOf(D.id); }
function save(important){
  if(typeof window.saveProgress !== 'function') return;
  try { window.saveProgress({ delay: important ? 600 : 4000 }); } catch(e){ console.warn('Life in LA: save failed', e); }
}
function taskDone(key){ const s = st(); if(key && !s.tasks.includes(key)) s.tasks.push(key); }

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
  const row = { id, en:p.en, ua:p.ua, ex:p.ex, tag:p.tag, ep:p.owner };
  if(p.owner === 'ep1') row.ep1 = true;      // kept for saved data written before Episode 2
  DATA.phrases.unshift(row);
  return true;
}
function hasPhrase(id){ const p = PHRASES[id]; return !!p && DATA.phrases.some(x => x.id === id || (x.en || '').toLowerCase() === p.en.toLowerCase()); }
function giveItem(name){ if(!DATA.items.includes(name)){ DATA.items.push(name); return true; } return false; }

/* People: reveal a placeholder card already on the homepage (filling in its
   bio), or add a new card (def.after = id of the card it goes behind). */
function meet(id){
  const def = PEOPLE_DEFS[id];
  let p = DATA.people.find(x => x.id === id);
  if(p){
    if(p.revealed && (!def || p._met)) return false;
    const was = p.revealed;
    if(def) Object.assign(p, def);
    p.revealed = true; p._met = true; delete p.locked;
    return !was;
  }
  if(!def) return false;
  let i = def.after ? DATA.people.findIndex(x => x.id === def.after) + 1 : (def.at != null ? def.at : 1);
  if(i <= 0) i = 1;
  DATA.people.splice(i, 0, Object.assign({}, def, { revealed:true, _met:true }));
  return true;
}

/* ---------- phone threads ---------- */
function thread(id){
  let t = DATA.messages.find(m => m.id === id);
  if(!t && THREAD_DEFS[id]){
    t = JSON.parse(JSON.stringify(Object.assign({ snippet:'', time:'', unread:0, online:false, chat:[] }, THREAD_DEFS[id])));
    DATA.messages.push(t);
  }
  if(t && !Array.isArray(t.chat)) t.chat = [];
  return t;
}
function refreshMeta(t){
  const last = t.chat[t.chat.length - 1]; if(!last) return;
  t.snippet = last.kind === 'voice' ? '🎤 Voice message' : last.kind === 'call' ? '📹 ' + (last.text || 'Video call') : (last.from === 'me' ? 'You: ' : '') + last.text;
  t.time = last.time || 'Just now';
}
function pushChat(tid, msg){
  const t = thread(tid);
  if(msg.id){
    const ex = t.chat.find(m => m.id === msg.id);
    if(ex){ if(msg.from === 'me' || msg.kind === 'call') Object.assign(ex, msg); refreshMeta(t); return ex; }
  }
  t.chat.push(msg); refreshMeta(t);
  return msg;
}
function hasMsg(tid, id){ const t = thread(tid); return !!t.chat.find(m => m.id === id); }

/* =========================================================================
   SHELL — the full-screen episode view
   ========================================================================= */
const EP = { root:null, open:false, scene:null, nodeId:null, token:0, bgKey:null, onPrimary:null, line:null,
             phoneScripted:false, phoneThread:null, pushedHistory:false, paused:false, hot:true, log:[] };

function build(){
  if(EP.root) return;
  const root = document.createElement('div');
  root.id = 'ep1'; root.className = 'ep1'; root.hidden = true;
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Episode');
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
        <div class="ep1-meta"><div class="ep1-eyebrow"><span id="ep1EpLabel"></span> · <span id="ep1Clock"></span></div><div class="ep1-scene-name" id="ep1SceneName"></div></div>
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
  const ph = EP.root.querySelector('#ep1PhoneBtn'); ph.disabled = !(D && st().flags.phoneUnlocked);
  const unread = DATA.messages.reduce((n, m) => n + (m.unread || 0), 0);
  ph.querySelector('.ep1-dot').hidden = !unread;
}
function updateProgress(){
  const sc = EP.scene; if(!sc) return;
  const i = Math.max(0, sc.order.indexOf(EP.nodeId));
  const pct = Math.round(((sc.index + i / sc.order.length) / D.scenes.length) * 100);
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
  const sp = spk(who) || { name:who, color:'#999' };
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
  const ps = photoState[D.id + ':' + key];
  if(ps === 'ok'){ showPhoto(); return; }
  if(ps === 'missing'){ show(sceneArt(key)); EP.stage.classList.remove('has-photo'); return; }
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
  EP.hot.innerHTML = (sc.hotspots || []).filter(h => (!h.bgs || h.bgs.includes(EP.bgKey)) && (!h.when || h.when(st().flags))).map(h => { const [hx, hy] = hotPos(h); return `
    <button type="button" class="ep1-hs ${st().explored.includes(h.id) ? 'seen' : ''} ${h.pulse && h.pulse(st().flags) ? 'hs-hot' : ''}" style="left:${hx}%;top:${hy}%" data-hot="${h.id}" aria-label="${esc(h.label)}">
      <span class="ep1-hs-dot" aria-hidden="true">${h.icon}</span><span class="ep1-hs-label">${esc(h.label)}</span></button>`; }).join('');
}
function openHotspot(hid){
  const h = (EP.scene.hotspots || []).find(x => x.id === hid); if(!h) return;
  const s = st(); if(!s.explored.includes(hid)){ s.explored.push(hid); save(); }
  if(h.onOpen && h.onOpen(h) === false){ renderHotspots(); return; }
  if(h.item){ const it = itemInfo(h.item) || { icon:'🎒', desc:'' };
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
  const sc = D.sceneById[sceneId]; if(!sc){ console.warn('Unknown scene', sceneId); return; }
  EP.scene = sc;
  const startNode = nodeId && sc.nodes[nodeId] ? nodeId : sc.order[0];
  const look = bgAt(sc, startNode);
  EP.bgKey = null; setBg(look.bg); setCam(look.cam); EP.stage.classList.toggle('ep1-night', look.night);
  Sound.ambience(sc.ambience);
  closePop(); hideGame(); closePhone(); EP.tray.hidden = true; EP.notif.hidden = true;
  renderHotspots();
  const s = st(); s.sceneId = sc.id;
  if(D.phoneUnlocked ? D.phoneUnlocked(sc) : true) s.flags.phoneUnlocked = true;
  if(D.onScene) try { D.onScene(sc) } catch(e){ console.warn(e); }
  syncTop();
  if(startNode === sc.order[0] && !opts.noCard && sc.index !== 0) sceneCard(sc, () => runNode(startNode));
  else runNode(startNode);
}
function sceneCard(sc, then){
  hideDlg(); hotspotsVisible(false);
  const tok = ++EP.token;
  EP.cine.hidden = false; EP.cine.className = 'ep1-cine ep1-cine-scene';
  EP.cine.innerHTML = `<div class="ep1-sc-card"><div class="ep1-sc-n">SCENE ${sc.n} OF ${D.scenes.length}</div><div class="ep1-sc-t">${sc.emoji} ${esc(sc.title)}</div><div class="ep1-sc-clock">${sc.clock} · ${esc(D.dayLabel || 'Day 1')}</div></div>
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
  if(node.when && !node.when(st().flags)) return next(node, id, node.otherwise);
  const tok = ++EP.token;
  EP.nodeId = id;
  const s = st(); s.sceneId = sc.id; s.nodeId = id; if(!s.startedAt) s.startedAt = Date.now();
  save(false);
  updateProgress();
  if(D.onNode) try { D.onNode(sc, id, node); } catch(e){ console.warn(e); }
  if(node.bg){ setBg(node.bg); renderHotspots(); }
  if(node.cam) setCam(node.cam);
  if(node.fx === 'nightfall') EP.stage.classList.add('ep1-night');
  if(node.sfx && node.type !== 'say') Sound.sfx(node.sfx);
  if(node.set) Object.assign(s.flags, node.set);
  if(node.meet && meet(node.meet)){ toast('👥', 'New person in People', (PEOPLE_DEFS[node.meet] || spk(node.meet) || {}).name || node.meet); save(true); }
  closePop(); EP.tray.hidden = true;
  hotspotsVisible(!node.hideHotspots && !HIDE_HOTSPOTS.concat(D.hideHotspots || []).includes(node.type));
  try {
    const R = (D.render && D.render[node.type]) || RENDER[node.type];
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
/* the last lines of the story, for “📜 Dialogue so far” in the pause menu */
function logLine(kind, who, text, ua){
  if(!text) return;
  const last = EP.log[EP.log.length - 1];
  if(last && last.text === text && last.who === who) return;
  EP.log.push({ kind, who, text, ua, scene: EP.scene ? EP.scene.id : null });
  if(EP.log.length > 40) EP.log.shift();
}
function showLine(node, onNext){
  const f = st().flags, kind = node.type;
  const text = valOf(node.text, f), ua = valOf(node.ua, f);
  const who = kind === 'say' ? node.who : null;
  const spoken = kind === 'say' && who !== 'you';
  EP.line = { who: who || 'you', text, vocab: node.vocab };
  logLine(kind, who, text, ua);
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
  const opts = (typeof node.options === 'function' ? node.options(f) : node.options).filter(o => !o.when || o.when(f)).map(o => Object.assign({}, o, { text: valOf(o.text, f), ua: valOf(o.ua, f) }));
  dlg(`${head(node.speak ? '🗣️ Your turn' : '🤔 Your choice', 'turn')}
    <div class="ep1-q">${esc(valOf(node.prompt, f))}</div>${node.ua ? `<div class="ep1-ua" ${SET.ua ? '' : 'hidden'}>${esc(node.ua)}</div>` : ''}
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
    [].concat(o.vocab || []).forEach(v => taskDone('seen:' + v));
    Sound.sfx('soft'); save(true);
    if(node.speak || o.say) setTimeout(() => showLine({ type:'say', who:'you', text:o.text, ua:o.ua, vocab:o.vocab ? [].concat(o.vocab) : [] }, () => next(node, id, o.next)), 220);
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
      if(o.value != null && node.valueKey) f[node.valueKey] = o.value;
      if(o.set) Object.assign(f, o.set);
      save(true);
      if(node.noEcho) return setTimeout(() => next(node, id, o.next), 300);
      return setTimeout(() => showLine({ type:'say', who:'you', text:o.text, ua:o.ua, vocab:o.vocab ? [].concat(o.vocab) : [] }, () => next(node, id, o.next)), 250);
    }
    wrong++; tried.add(i); Sound.sfx('soft');
    if(node.polite) f.wasRude = true;
    let fb = '';
    if(o.react){
      const rw = o.who || node.who;
      fb += `<div class="ep1-react">${rw === 'think' ? '<b>💭</b>' : `<b>${esc((spk(rw) || {}).name || '')}:</b>`} ${esc(o.react[0])}${o.react[1] ? `<div class="ep1-ua" ${SET.ua ? '' : 'hidden'}>${esc(o.react[1])}</div>` : ''}</div>`;
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
  const f0 = st().flags;
  const cfg = Object.assign({}, node, { prompt: valOf(node.prompt, f0), ua: valOf(node.ua, f0), model: valOf(node.model, f0), starters: valOf(node.starters, f0) });
  speakBox(EP.dlg.querySelector('.ep1-speak-host'), cfg, r => {
    if(tok !== EP.token) return;
    const s = st();
    s.answers[node.key] = r.mode === 'text' ? { mode:'text', text:r.text.slice(0, 900) } : r.mode === 'voice' ? { mode:'voice', seconds:r.seconds } : { mode:r.mode };
    if(r.mode === 'text' || r.mode === 'voice'){ taskDone(node.key); toast('🎙️', r.mode === 'voice' ? 'Speaking practice saved' : 'Answer saved', r.mode === 'voice' ? `${r.seconds}s recorded on this device` : ''); }
    save(true);
    const after = () => node.after ? showLine({ type:'say', who:node.after.who, text:node.after.text, ua:node.after.ua }, () => next(node, id)) : next(node, id);
    if(r.mode === 'text') showLine({ type:'say', who:'you', text:r.text }, after);
    else if(r.mode === 'voice') showLine({ type:'narr', text:'(You answer out loud.)', ua:'(Ти відповідаєш уголос.)' }, after);
    else if(r.mode === 'model') showLine({ type:'say', who:'you', text:cfg.model }, after);
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
    EP.tray.innerHTML = `${node.trayTitle ? `<div class="ep1-eyebrow ep1-tray-t">${esc(node.trayTitle)}</div>` : ''}<div class="ep1-tray-items" role="list">${(node.only || DATA.items).filter(n => !node.only || DATA.items.includes(n) || node.only.includes(n)).map(n => { const it = itemInfo(n) || { icon:'🎒', desc:'' };
      return `<button type="button" role="listitem" class="ep1-item ${wrong >= 2 && n === node.want ? 'hint-pulse' : ''} ${sel === n ? 'sel' : ''}" data-item="${esc(n)}"><span class="ep1-item-i" aria-hidden="true">${it.icon}</span><span class="ep1-item-n">${esc(n)}</span></button>`; }).join('')}</div>
      ${sel ? `<div class="ep1-inspect"><div class="ep1-item-big" aria-hidden="true">${(itemInfo(sel) || {}).icon || '🎒'}</div><div><b>${esc(sel)}</b><p>${esc((itemInfo(sel) || {}).desc || '')}</p>
        <div class="ep1-row"><button type="button" class="ep1-btn ep1-btn-hot" data-give>🤲 Hand it over</button><button type="button" class="ep1-btn ep1-btn-ghost" data-unsel>Back</button></div></div></div>` : ''}`;
    $$('[data-item]', EP.tray).forEach(b => b.addEventListener('click', () => drawTray(b.dataset.item)));
    const g = EP.tray.querySelector('[data-give]'); if(g){ g.addEventListener('click', () => give(sel)); g.focus({ preventScroll:true }); }
    const u = EP.tray.querySelector('[data-unsel]'); if(u) u.addEventListener('click', () => drawTray(null));
    /* keyboard: start on the items, not on the dialog's UA button */
    if(!sel) requestAnimationFrame(() => requestAnimationFrame(() => { const b = EP.tray.querySelector('[data-item]'); if(b && !EP.tray.hidden) b.focus({ preventScroll:true }); }));
  }
  function give(name){
    if(tok !== EP.token) return;
    if(name === node.want){
      EP.tray.hidden = true; Sound.sfx('good'); taskDone(node.key); st().answers[node.key] = { tries: wrong + 1 }; save(true);
      return next(node, id);
    }
    wrong++; Sound.sfx('soft');
    const w = (node.wrong && node.wrong[name]) || ["Hmm, that's not it.", "Хм, це не те."];
    EP.dlg.querySelector('.ep1-fb').innerHTML = `<div class="ep1-react"><b>${esc(spk(node.who).name)}:</b> ${esc(w[0])}<div class="ep1-ua" ${SET.ua ? '' : 'hidden'}>${esc(w[1] || '')}</div></div>
      ${wrong >= 2 ? `<div class="ep1-hint">🔎 Look for: <b>${esc(node.want)}</b> ${(itemInfo(node.want) || {}).icon || ''}</div>` : ''}`;
    if(SET.voice && SET.sound) Voice.speak(node.who, w[0]);
    drawTray(null);
  }
  drawTray(null);
};

/* =========================================================================
   SPEAK-FIRST TOOLS (used from Episode 2 on)
   -------------------------------------------------------------------------
   answer   — the student answers OUT LOUD. Hints open step by step
              (hint 1 → hint 2 → example). Nothing is typed, nothing is
              graded: the student says "I said it" and the story goes on.
   talkBox  — a longer speaking turn with an optional timer, a checklist the
              student ticks themselves, optional recording on the device and
              a "done in class" button for teacher-led lessons.
   ========================================================================= */
function hintLadder(cfg, f){
  const hints = valOf(cfg.hints, f) || [];
  const model = valOf(cfg.model, f);
  const steps = hints.map((h, i) => ({ k:'h' + i, label: i === 0 ? '💡 Hint' : '💡 Another hint', html:`<div class="ep1-hint">💡 ${esc(h)}</div>` }));
  if(model) steps.push({ k:'model', label:'👀 Show an example', html:`<div class="ep1-model"><span>Example:</span> “${esc(model)}” ${Voice.available() ? `<button type="button" class="ep1-tool" data-say-model aria-label="Listen to the example">🔊</button>` : ''}</div>` });
  return { steps, model };
}
RENDER.answer = function(node, id, tok){
  const f = st().flags;
  const L = hintLadder(node, f);
  let shown = 0, rec = null, recOpen = false;
  const starters = valOf(node.starters, f) || [];
  function draw(){
    dlg(`${head('🗣️ ' + (node.label || 'Your turn — say it out loud'), 'turn')}
      <div class="ep1-q">${esc(valOf(node.prompt, f))}</div>${node.ua ? `<div class="ep1-ua" ${SET.ua ? '' : 'hidden'}>${esc(valOf(node.ua, f))}</div>` : ''}
      ${starters.length && shown > 0 ? `<div class="ep1-starters">${starters.map(s => `<span class="ep1-chip ep1-chip-static">${esc(s)}</span>`).join('')}</div>` : ''}
      <div class="ep1-fb">${L.steps.slice(0, shown).map(s => s.html).join('')}</div>
      ${recOpen ? '<div class="ep1-ans-rec"></div>' : ''}
      <div class="ep1-row"><div class="ep1-tools">
        ${shown < L.steps.length ? `<button type="button" class="ep1-btn ep1-btn-ghost" data-ans="hint">${L.steps[shown].label}</button>` : ''}
        ${node.ua ? `<button type="button" class="ep1-tool" data-act="ua" title="Ukrainian translation">UA</button>` : ''}
        ${canRecord() && !recOpen ? `<button type="button" class="ep1-btn ep1-btn-ghost" data-ans="rec">🎙️ Record myself</button>` : ''}
        ${(node.vocab || []).filter(v => PHRASES[v]).map(v => `<button type="button" class="ep1-chip" data-vocab="${v}">💬 ${esc(PHRASES[v].en)}</button>`).join('')}
      </div><button type="button" class="ep1-next" data-primary>${esc(node.doneLabel || 'I said it ✓')}</button></div>`, 'k-answer');
    if(recOpen){ if(rec) rec.destroy(); rec = makeRecorder(EP.dlg.querySelector('.ep1-ans-rec'), { minSec:1 }); }
    EP.dlg.querySelectorAll('[data-ans]').forEach(b => b.addEventListener('click', () => {
      if(b.dataset.ans === 'hint'){ shown++; Sound.sfx('soft'); }
      if(b.dataset.ans === 'rec') recOpen = true;
      draw();
    }));
    const sm = EP.dlg.querySelector('[data-say-model]'); if(sm) sm.addEventListener('click', () => Voice.speak('you', L.model));
    primary(() => {
      if(tok !== EP.token) return;
      const s = st();
      s.answers[node.key] = { mode: rec && rec.ready ? 'voice' : 'spoken', hints: shown, seconds: rec && rec.ready ? Math.round(rec.seconds) : undefined };
      if(rec){ rec.destroy(); rec = null; }
      taskDone(node.key); save(true);
      const after = valOf(node.after, f);
      const then = () => after ? showLine({ type:'say', who:after.who, text:valOf(after.text, f), ua:valOf(after.ua, f), vocab:after.vocab }, () => next(node, id)) : next(node, id);
      if(node.echo) showLine({ type:'narr', text:'(You say it out loud.)', ua:'(Ти кажеш це вголос.)' }, then);
      else then();
    });
  }
  draw();
};

/* talkBox(host, cfg, onDone) — cfg: { title, prompt, ua, topics:[{k,label}],
   seconds (timer target), minSec (needed before "Done" unlocks without a
   recording), starters, vocab:[ids], model, opening, doneLabel, teacher } */
const TALKERS = new Set();
function talkBox(host, cfg, onDone){
  let elapsed = 0, running = false, tick = null, rec = null, recOpen = false, help = '', finished = false;
  const ticked = new Set(cfg.ticked || []);
  const target = cfg.seconds || 30, minSec = cfg.minSec != null ? cfg.minSec : Math.min(15, target);
  const api = { destroy };
  TALKERS.add(api);
  function ring(){
    const pct = Math.min(1, elapsed / target);
    const C = 2 * Math.PI * 44;
    return `<svg class="ep1-timer-ring" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="44" class="bg"/><circle cx="50" cy="50" r="44" class="fg" style="stroke-dasharray:${C.toFixed(1)};stroke-dashoffset:${(C * (1 - pct)).toFixed(1)}"/></svg>`;
  }
  function timerHTML(){
    return `<div class="ep1-timer ${running ? 'on' : ''} ${elapsed >= target ? 'full' : ''}">${ring()}<div class="ep1-timer-t" aria-live="off">${fmtTime(elapsed)}<small>/ ${fmtTime(target)}</small></div></div>`;
  }
  const canDone = () => elapsed >= minSec || (rec && rec.ready) || cfg.noMin;
  function draw(){
    host.innerHTML = `<div class="ep1-talk">
      <div class="ep1-talk-main">
        ${cfg.opening ? `<div class="ep1-talk-open">💬 ${esc(cfg.opening)}</div>` : ''}
        <div class="ep1-talk-timer">
          ${timerHTML()}
          <div class="ep1-talk-ctl">
            <button type="button" class="ep1-btn ${running ? '' : 'ep1-btn-hot'}" data-tk="${running ? 'pause' : 'start'}">${running ? '⏸ Pause timer' : elapsed ? '▶ Continue timer' : '⏱ Start the timer'}</button>
            ${elapsed && !running ? `<button type="button" class="ep1-btn ep1-btn-ghost" data-tk="reset">↺ Reset</button>` : ''}
            <span class="ep1-mini">The timer is optional — it just helps you keep talking.</span>
          </div>
        </div>
        ${recOpen ? '<div class="ep1-talk-rec"></div>' : (canRecord() ? `<button type="button" class="ep1-btn ep1-btn-ghost ep1-talk-recbtn" data-tk="rec">🎙️ Record myself (optional)</button>` : '')}
        <div class="ep1-talk-help">${help}</div>
      </div>
      <aside class="ep1-talk-side">
        ${(cfg.topics || []).length ? `<div class="ep1-eyebrow">${esc(cfg.topicsTitle || 'Try to talk about')}</div>
        <ul class="ep1-check ep1-check-tap">${cfg.topics.map(t => `<li><button type="button" class="ep1-tick ${ticked.has(t.k) ? 'ok' : ''}" data-tick="${t.k}" aria-pressed="${ticked.has(t.k)}"><span aria-hidden="true">${ticked.has(t.k) ? '✓' : '○'}</span> ${esc(t.label)}</button></li>`).join('')}</ul>
        <p class="ep1-mini">Tick what you talked about — only you know! Nothing here listens to or grades your voice.</p>` : ''}
        <div class="ep1-final-btns">
          ${(cfg.starters || []).length ? `<button type="button" class="ep1-btn ep1-btn-ghost" data-help="starters">🧩 Sentence starters</button>` : ''}
          ${(cfg.vocab || []).length ? `<button type="button" class="ep1-btn ep1-btn-ghost" data-help="vocab">💬 Useful phrases</button>` : ''}
          ${cfg.model ? `<button type="button" class="ep1-btn ep1-btn-ghost" data-help="model">👀 Show an example</button>` : ''}
        </div>
      </aside>
      <div class="ep1-talk-foot">
        <span class="ep1-mini">${canDone() ? 'Ready when you are.' : `Talk for a little while first — start the timer (${minSec}s) or record yourself.`}</span>
        <div class="ep1-tools">
          ${cfg.teacher !== false ? `<button type="button" class="ep1-btn ep1-btn-ghost" data-tk="teacher" title="For lessons where you speak to your teacher or class">👩‍🏫 Done in class</button>` : ''}
          <button type="button" class="ep1-next" data-tk="done" ${canDone() ? '' : 'disabled'}>${esc(cfg.doneLabel || 'I\'m done ✓')}</button>
        </div>
      </div>
    </div>`;
    if(recOpen){ if(rec) rec.destroy(); rec = makeRecorder(host.querySelector('.ep1-talk-rec'), { minSec: Math.min(5, minSec || 5), onChange: () => updFoot() }); }
  }
  function updFoot(){
    const b = host.querySelector('[data-tk="done"]'); if(b) b.disabled = !canDone();
    const m = host.querySelector('.ep1-talk-foot .ep1-mini'); if(m) m.textContent = canDone() ? 'Ready when you are.' : `Talk for a little while first — start the timer (${minSec}s) or record yourself.`;
  }
  function start(){
    if(running) return; running = true;
    let last = Date.now();
    tick = setInterval(() => {
      const now = Date.now();
      if(!EP.paused) elapsed += (now - last) / 1000;
      last = now;
      const t = host.querySelector('.ep1-timer'); if(t){ t.outerHTML = timerHTML(); }
      if(elapsed >= target && !host.dataset.chimed){ host.dataset.chimed = '1'; Sound.sfx('good'); }
      updFoot();
    }, 250);
  }
  function stop(){ running = false; clearInterval(tick); }
  host.addEventListener('click', e => {
    const tk = e.target.closest('[data-tk]');
    if(tk){
      const a = tk.dataset.tk;
      if(a === 'start'){ start(); draw(); }
      if(a === 'pause'){ stop(); draw(); }
      if(a === 'reset'){ stop(); elapsed = 0; delete host.dataset.chimed; draw(); }
      if(a === 'rec'){ recOpen = true; draw(); }
      if(a === 'done' && canDone()) finish(rec && rec.ready ? 'voice' : 'timer');
      if(a === 'teacher') finish('teacher');
      return;
    }
    const t = e.target.closest('[data-tick]');
    if(t){ const k = t.dataset.tick; ticked.has(k) ? ticked.delete(k) : ticked.add(k); Sound.sfx('soft'); draw(); return; }
    const h = e.target.closest('[data-help]');
    if(h){
      const k = h.dataset.help;
      if(k === 'starters') help = `<div class="ep1-helpbox"><b>🧩 Sentence starters</b><div class="ep1-starters">${cfg.starters.map(s => `<span class="ep1-chip ep1-chip-static">${esc(s)}</span>`).join('')}</div></div>`;
      if(k === 'vocab') help = `<div class="ep1-helpbox"><b>💬 Useful phrases</b><div class="ep1-starters">${cfg.vocab.filter(v => PHRASES[v]).map(v => `<button type="button" class="ep1-chip" data-vocab="${v}">${esc(PHRASES[v].en)}</button>`).join('')}</div></div>`;
      if(k === 'model') help = `<div class="ep1-helpbox"><b>👀 Example</b><p class="ep1-model-text">“${esc(cfg.model)}”</p>${Voice.available() ? `<button type="button" class="ep1-btn ep1-btn-ghost" data-help="listen">🔊 Listen</button>` : ''}<p class="ep1-mini">Use it for ideas — then say it YOUR way.</p></div>`;
      if(k === 'listen'){ Voice.speak('you', cfg.model); return; }
      draw(); return;
    }
    const v = e.target.closest('[data-vocab]'); if(v){ vocabCard(v.dataset.vocab); return; }
  });
  function finish(mode){
    if(finished) return; finished = true;
    const r = { mode, seconds: mode === 'voice' ? Math.round(rec.seconds) : Math.round(elapsed), ticked: Array.from(ticked) };
    destroy(); onDone(r);
  }
  function destroy(){ stop(); if(rec){ rec.destroy(); rec = null; } TALKERS.delete(api); }
  draw();
  return api;
}
function destroyTalkers(){ Array.from(TALKERS).forEach(t => t.destroy()); }

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
  const icon = t.icon || (t.id === 'unknown' ? '❔' : '💬');
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
  if(m.kind === 'call') return `<div class="ep1-bub ep1-bub-call">📹 ${esc(m.text || 'Video call')}${m.time ? `<span class="ep1-bub-t">${esc(m.time)}</span>` : ''}</div>`;
  return `<div class="ep1-bub ${mine ? 'me' : 'them'}">${body}${m.time ? `<span class="ep1-bub-t">${esc(m.time)}</span>` : ''}${mine && m.status ? `<span class="ep1-bub-st">${esc(m.status)}</span>` : ''}</div>`;
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
        <span class="ep1-ph-ava" style="--c:${t.color}" aria-hidden="true">${t.icon || faceMini(t.dark)}${t.online ? '<i class="ep1-online"></i>' : ''}</span>
        <div class="ep1-ph-who"><b>${esc(t.name)} ${t.flag && window.FLAGS ? window.FLAGS[t.flag] : ''}</b><small class="ep1-ph-sub">${esc(t.sub || 'online')}</small></div>
        ${scripted ? '' : `<button type="button" class="ep1-ph-ib" data-ph="close" aria-label="Close phone">✕</button>`}
      </div>
      <div class="ep1-ph-body" aria-live="polite"></div>
      <div class="ep1-ph-foot"></div>
    </div>`;
  EP.phone.querySelector('.ep1-ph').addEventListener('click', e => {
    const v = e.target.closest('[data-vplay]');
    if(v){ const m = thread(EP.phoneThread).chat.find(x => x.id === v.dataset.vplay); if(m){ v.closest('.ep1-bub').classList.add('playing'); Voice.speak(thread(EP.phoneThread).voiceWho || EP.phoneThread, m.text, { slow: !!e.shiftKey }).then(() => { const b = v.closest('.ep1-bub'); b && b.classList.remove('playing'); EP.voiceHeard = true; if(EP.onVoice) EP.onVoice(); }); } return; }
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
  const sub = EP.phone.querySelector('.ep1-ph-sub'); if(sub && !t.sub) sub.textContent = typing ? 'typing…' : 'online';
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
      <span class="ep1-ph-ava" style="--c:${m.color}" aria-hidden="true">${m.icon || faceMini(m.dark)}</span>
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
  if(step.when && !step.when(f)) return;
  if(step.custom) return step.custom({ tid, tok, s, f, clock, thread: t, foot: phoneFoot, renderThread, pushChat, hasMsg, wait, save });
  const delay = text => isReduced() ? 250 : Math.min(1700, 550 + String(text).length * 14);
  if(step.in || step.inFn){
    const text = step.in || step.inFn(f);
    if(step.id && hasMsg(tid, step.id)) return;
    renderThread(true); await wait(delay(text)); if(tok !== EP.token) return;
    pushChat(tid, { id:step.id, from:'them', text, time:clock, vocab:step.vocab, kind:step.kind }); Sound.sfx('soft'); renderThread(); save(false);
    await wait(isReduced() ? 100 : 280);
    return;
  }
  if(step.reply){
    const r = step.reply;
    if(hasMsg(tid, r.id) && (!r.key || f[r.key])) return;
    let opts = (typeof r.options === 'function' ? r.options(f) : r.options).filter(o => !o.when || o.when(f)).map(o => Object.assign({}, o, { text: valOf(o.text, f) }));
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
    pushChat(tid, { id:r.id, from:'me', text:choice.text.slice(0, 240), time:clock, status:r.status });
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
          ${!EP.voiceHeard ? `<div class="ep1-tip">▶ Play ${esc(t.name)}'s voice message first.</div>` : ''}
          <div class="ep1-opts ep1-ph-opts">${q.options.map((o, i) => `<button type="button" class="ep1-opt ${tried.has(i) ? 'tried' : ''} ${wrong >= 3 && o.correct ? 'hint-pulse' : ''}" data-i="${i}" ${tried.has(i) || !EP.voiceHeard ? 'disabled' : ''}><span class="ep1-k" aria-hidden="true">${String.fromCharCode(65 + i)}</span><span class="ep1-opt-t">${esc(o.text)}</span></button>`).join('')}</div>
          <div class="ep1-fb">${fb || ''}</div>
          <div class="ep1-row ep1-row-tight">${Voice.available() ? `<button type="button" class="ep1-btn ep1-btn-ghost" data-replay>▶ Listen again</button><button type="button" class="ep1-btn ep1-btn-ghost" data-slow>🐢 Slower</button>` : ''}
            <button type="button" class="ep1-btn ep1-btn-ghost" data-tr>📝 Transcript</button></div>`);
        foot.onclick = e => {
          const b = e.target.closest('[data-i]');
          if(b){ const o = q.options[+b.dataset.i];
            if(o.correct){ msg.revealed = true; taskDone(q.key); s.answers[q.key] = { tries: wrong + 1 }; Sound.sfx('good'); renderThread(); save(true); EP.onVoice = null; phoneFoot(`<div class="ep1-good">✓ ${esc(q.good || 'Exactly!')}</div>`); setTimeout(res, isReduced() ? 300 : 1100); return; }
            wrong++; tried.add(+b.dataset.i); Sound.sfx('soft');
            let h = `<div class="ep1-hint">🔎 ${esc(q.hints[0])}</div>`;
            if(wrong >= 2){ h = `<div class="ep1-hint">🔎 ${esc(q.hints[1])}</div>`; }
            if(wrong >= 3){ msg.revealed = true; renderThread(); h += `<div class="ep1-hint ua">🇺🇦 ${esc(q.hints[2])}</div>`; }
            draw(h); return; }
          if(e.target.closest('[data-replay]')) $('[data-vplay="' + v.id + '"]', EP.phone) && $('[data-vplay="' + v.id + '"]', EP.phone).click();
          if(e.target.closest('[data-slow]')) Voice.speak(t.voiceWho || tid, v.text, { slow:true }).then(() => { EP.voiceHeard = true; draw(''); });
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
function hideGame(){ EP.game.hidden = true; EP.game.innerHTML = ''; EP.game.className = 'ep1-game'; EP.game.onclick = null; EP.game.onkeydown = null; }

/* Rewards — achievements, phrases and items, idempotent. */
RENDER.reward = function(node, id, tok){
  hideDlg();
  const newOnes = [];
  [].concat(node.achievement || []).forEach(id => { const a = unlockAch(id); if(a) newOnes.push(a); });
  const added = (node.phrases || []).filter(addPhrase);
  (node.phrases || []).forEach(id => taskDone('seen:' + id));
  const gotItems = [].concat(node.item || []).filter(giveItem);
  taskDone('reward:' + EP.scene.id);
  save(true);
  Sound.sfx('reward');
  EP.cine.hidden = false; EP.cine.className = 'ep1-cine ep1-cine-reward';
  EP.cine.innerHTML = `<div class="ep1-banner"><div class="ep1-banner-line" aria-hidden="true"></div><h2>${esc(node.banner)}</h2><p>${esc(valOf(node.sub, st().flags) || '')}</p>
    <div class="ep1-banner-gets">
      ${[].concat(node.achievement || []).map(ensureAch).filter(Boolean).map(a => `<span class="ep1-get">${a.icon} ${esc(a.name)}</span>`).join('')}
      ${[].concat(node.item || []).map(it => `<span class="ep1-get">${(itemInfo(it) || {}).icon || '🎒'} ${esc(it)} → Backpack</span>`).join('')}
      ${(node.phrases || []).length ? `<span class="ep1-get">💬 ${(node.phrases || []).length} useful phrases → Backpack</span>` : ''}
    </div>
    <button type="button" class="ep1-next" data-primary>Continue ▸</button></div>`;
  newOnes.forEach(a => setTimeout(() => toast(a.icon, 'Achievement unlocked', a.name), 600));
  if(added.length) setTimeout(() => toast('🎒', `${added.length} phrase${added.length > 1 ? 's' : ''} saved to Backpack`, added.map(x => PHRASES[x].en).slice(0, 2).join(' · ')), 1100);
  gotItems.forEach((it, i) => setTimeout(() => toast((itemInfo(it) || {}).icon || '🎒', 'New item', it), 1500 + i * 400));
  if(node.onReward) try { node.onReward(st().flags); } catch(e){ console.warn(e); }
  const b = EP.cine.querySelector('[data-primary]'); b.focus({ preventScroll:true });
  b.addEventListener('click', () => { if(tok !== EP.token) return; EP.cine.hidden = true; EP.cine.innerHTML = ''; next(node, id); }, { once:true });
};

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
  openModalEp(`<div class="ep1-eyebrow">Paused · Episode ${D.n}</div><h3>${sc ? `${sc.emoji} Scene ${sc.n}: ${esc(sc.title)}` : esc(D.title)}</h3>
    <div class="ep1-menu">
      <button type="button" class="ep1-next" data-pm="resume">▶ Continue</button>
      <button type="button" class="ep1-btn" data-pm="log" ${EP.log.length ? '' : 'disabled'}>📜 Dialogue so far</button>
      <button type="button" class="ep1-btn" data-pm="settings">⚙️ Settings</button>
      <button type="button" class="ep1-btn ep1-btn-ghost" data-pm="scene" ${sc ? '' : 'disabled'}>↺ Restart this scene</button>
      <button type="button" class="ep1-btn ep1-btn-ghost" data-pm="episode">⟲ Restart the episode</button>
      <button type="button" class="ep1-btn ep1-btn-ghost" data-pm="exit">🏠 Save &amp; go back to my room</button>
      ${typeof window.resetProgress === 'function' ? `<button type="button" class="ep1-btn ep1-btn-ghost ep1-btn-danger" data-pm="erase">🗑 Reset Episode ${D.n} (erase progress)</button>` : ''}
    </div><p class="ep1-mini">Your progress is saved automatically.</p>`, { onClick: e => {
      const b = e.target.closest('[data-pm]'); if(!b) return;
      const a = b.dataset.pm;
      if(a === 'resume') closeModalEp();
      if(a === 'settings') openSettings();
      if(a === 'log') openLog();
      if(a === 'exit'){ EP.paused = false; EP.modal.hidden = true; close(); }
      const back = () => { EP.paused = false; pause(); };
      if(a === 'scene') confirmBox('Restart this scene?', 'You go back to the start of this scene. Your rewards and saved phrases stay.', () => { EP.root.classList.remove('ep1-paused'); gotoScene(sc.id, null, { noCard:false }); }, back);
      if(a === 'episode') confirmBox(`Restart Episode ${D.n}?`, 'You go back to Scene 1. Your rewards, phrases, journal and messages stay.', () => { EP.root.classList.remove('ep1-paused'); restartEpisode(); }, back);
      if(a === 'erase') confirmBox(`Reset Episode ${D.n} to the very beginning?`,
        "Everything from this episode is erased: your place in the story, choices, answers, all its chats, phrases, items, achievements and memories." + (laterWithProgress(D).length ? ` Episode ${laterWithProgress(D).map(e => e.n).join(', ')} builds on it, so it is reset too.` : '') + " Your journal stays. This can't be undone.",
        () => { Voice.stop(); Sound.stop(); window.resetProgress('episode', D.id); }, back,
        { ua:'Епізод почнеться з нуля, усі переписки скинуться. Щоденник залишиться.', yes:'Yes, reset it', danger:true });
    } });
}
function openLog(){
  const who = l => l.kind === 'think' ? '💭 You (thinking)' : l.kind === 'narr' ? '🎬' : (spk(l.who) || { name:l.who }).name;
  openModalEp(`<div class="ep1-eyebrow">Review</div><h3>📜 Dialogue so far</h3>
    <div class="ep1-log">${EP.log.slice(-25).map(l => `<div class="ep1-log-l k-${l.kind}${l.who === 'you' ? ' me' : ''}"><b>${esc(who(l))}</b> ${esc(l.text)}${l.ua ? `<small class="ep1-ua" ${SET.ua ? '' : 'hidden'}>${esc(l.ua)}</small>` : ''}</div>`).join('')}</div>
    <div class="ep1-row"><button type="button" class="ep1-tool" data-act-ua>UA</button><button type="button" class="ep1-next" data-mclose>Back</button></div>`,
    { onClick: e => { if(e.target.closest('[data-act-ua]')){ EP.modal.querySelectorAll('.ep1-log .ep1-ua').forEach(x => x.hidden = !x.hidden); } } });
  requestAnimationFrame(() => { const l = EP.modal.querySelector('.ep1-log'); if(l) l.scrollTop = l.scrollHeight; });
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
       ['sound','Sound & ambience', D.soundDesc || 'Ambience, chimes, music']].map(([k, t, d]) =>
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
  if(m === 'no-story-column') return 'Progress is saved on this device. (Teacher: run the database update in supabase/ to save story progress to the account too.)';
  if(m === 'offline') return "You seem to be offline — progress is saved on this device and will sync later.";
  return 'Progress is saved on this device.';
}
function openBackpack(tab = 'phrases'){
  const learned = DATA.phrases.filter(p => p.ep1 || p.ep);
  openModalEp(`<div class="ep1-eyebrow">Your stuff</div><h3>🎒 Backpack</h3>
    <div class="ep1-modes"><button type="button" class="ep1-seg ${tab === 'phrases' ? 'on' : ''}" data-bt="phrases">Useful English</button><button type="button" class="ep1-seg ${tab === 'items' ? 'on' : ''}" data-bt="items">Items</button></div>
    <div class="ep1-bp">${tab === 'phrases'
      ? (learned.length ? learned.map(p => `<div class="ep1-bp-card"><div><b>${esc(p.en)}</b><small>${esc(p.ua)}</small></div>${Voice.available() ? `<button type="button" class="ep1-tool" data-say="${esc(p.en)}" aria-label="Listen">🔊</button>` : ''}</div>`).join('')
        : '<p class="ep1-mini">Phrases you save in this episode appear here. Tap a highlighted phrase in a dialogue to save it!</p>')
      : DATA.items.map(n => { const it = itemInfo(n) || { icon:'🎒', desc:'' }; return `<div class="ep1-bp-card"><span class="ep1-item-i" aria-hidden="true">${it.icon}</span><div><b>${esc(n)}</b><small>${esc(it.desc)}</small></div></div>`; }).join('')}</div>`,
    { onClick: e => { const t = e.target.closest('[data-bt]'); if(t) openBackpack(t.dataset.bt); const s = e.target.closest('[data-say]'); if(s) Voice.speak('you', s.dataset.say); } });
}

/* =========================================================================
   OPEN / CLOSE / RESUME
   ========================================================================= */
function prefetch(){
  if(D.prefetch) try { D.prefetch(); } catch(e){ console.warn(e); }
  Object.keys(D.photos || {}).forEach(k => probePhoto(k));
}
/* open(id) starts / resumes an episode. If another episode is already on
   screen (e.g. "Play Episode 2" on the Episode 1 summary), it switches in
   place without touching the browser history. */
function open(id, opts = {}){
  if(id && typeof id === 'object'){ opts = id; id = null; }
  const def = BY_ID[id] || D || EPISODES[0]; if(!def) return;
  build();
  if(EP.open){
    if(D === def && !opts.replay) return;
    teardown(); destroyTalkers();
    EP.bg.innerHTML = ''; EP.stage.classList.remove('ep1-night', 'has-photo'); EP.scene = null;
  } else {
    if(document.activeElement && document.activeElement.blur) document.activeElement.blur();
    EP.open = true;
    EP.root.hidden = false; document.body.classList.add('ep1-open');
    try { history.pushState({ lilaEp:true }, ''); EP.pushedHistory = true; } catch(e){}
    if(typeof closeModal === 'function') try { closeModal(); } catch(e){}
  }
  if(D !== def) EP.log = [];
  D = def;
  const s = st();
  EP.paused = false; EP.countedPlay = false;
  EP.root.dataset.ep = D.id;
  EP.root.setAttribute('aria-label', `Episode ${D.n}: ${D.title}`);
  EP.root.querySelector('#ep1EpLabel').textContent = D.label || `Season 1 · Episode ${D.n}`;
  EP.root.focus({ preventScroll:true });
  EP.root.classList.toggle('ep1-reduced', isReduced());
  Sound.unlock(); prefetch(); syncTop();
  EP.bgKey = null;
  if(D.onOpen) try { D.onOpen(s); } catch(e){ console.warn(e); }
  if(opts.replay) return restartEpisode();
  if(s.sceneId && D.sceneById[s.sceneId]){
    const sc = D.sceneById[s.sceneId];
    EP.scene = sc; setBg(bgAt(sc, s.nodeId).bg); updateProgressFor(sc);
    return showResume(sc);
  }
  if(s.completed) return restartEpisode();
  ensureStartItems();
  gotoScene(D.scenes[0].id);
}
function showResume(sc){
  const s = st();
  openModalEp(`<div class="ep1-eyebrow">Welcome back 👋</div><h3>Continue Episode ${D.n}</h3>
    <p>Scene ${sc.n} of ${D.scenes.length} · <b>${sc.emoji} ${esc(sc.title)}</b></p>
    <div class="ep1-menu">
      <button type="button" class="ep1-next" data-rs="continue">▶ Continue where I left off</button>
      <button type="button" class="ep1-btn ep1-btn-ghost" data-rs="scene">↺ Restart this scene</button>
      <button type="button" class="ep1-btn ep1-btn-ghost" data-rs="episode">⟲ Restart the episode</button>
      <button type="button" class="ep1-btn ep1-btn-ghost" data-rs="room">🏠 Back to my room</button>
    </div>`, { noX:true, onClick: e => {
      const b = e.target.closest('[data-rs]'); if(!b) return;
      const a = b.dataset.rs;
      if(a === 'episode') return confirmBox(`Restart Episode ${D.n}?`, 'You go back to Scene 1. Your rewards, phrases, journal and messages stay.', restartEpisode, () => showResume(sc));
      EP.modal.hidden = true; EP.modal.innerHTML = '';
      if(a === 'continue') gotoScene(sc.id, s.nodeId, { noCard:true });
      if(a === 'scene') gotoScene(sc.id, null);
      if(a === 'room') close();
    } });
}
function updateProgressFor(sc){ EP.nodeId = sc.order[0]; updateProgress(); }
function ensureStartItems(){ (D.startItems || []).forEach(i => { if(!DATA.items.includes(i)) DATA.items.push(i); }); }
function restartEpisode(){
  const s = st();
  s.sceneId = null; s.nodeId = null; s.completedScenes = s.completed ? s.completedScenes : []; s.flags = { phoneUnlocked:false };
  s.choices = {}; s.answers = s.answers || {};
  EP.countedPlay = false;
  ensureStartItems();
  closePop(); hideGame(); closePhone(); EP.sheet.hidden = true; EP.cine.hidden = true; EP.cine.onclick = null;
  EP.stage.classList.remove('ep1-night');
  if(D.onRestart) try { D.onRestart(s); } catch(e){ console.warn(e); }
  save(true);
  gotoScene(D.scenes[0].id);
}
function teardown(){
  EP.token++;
  Voice.stop(); Sound.stop(); destroyRecorders();
  closePop(); hideGame(); closePhone(); hideDlg();
  EP.cine.hidden = true; EP.cine.innerHTML = ''; EP.cine.onclick = null; EP.sheet.hidden = true; EP.sheet.innerHTML = ''; EP.sheet.onclick = null;
  EP.modal.hidden = true; EP.modal.innerHTML = ''; EP.notif.hidden = true; EP.tray.hidden = true;
  EP.root.classList.remove('ep1-paused'); EP.paused = false;
  destroyTalkers();
}
function close(opts = {}){
  if(!EP.open) return;
  EP.open = false; teardown();
  EP.root.hidden = true; document.body.classList.remove('ep1-open');
  flushSave();
  if(EP.pushedHistory && !opts.fromPop){ EP.pushedHistory = false; try { history.back(); } catch(e){} }
  refreshHome();
  if(opts.then) setTimeout(opts.then, 60);
}
function refreshHome(){
  ['renderTopbar','renderMission','renderMessages','renderShelf'].forEach(fn => { if(typeof window[fn] === 'function') try { window[fn](); } catch(e){ console.warn(fn, e); } });
}

/* =========================================================================
   SAVE / LOAD BRIDGE for index.html (window.LilaStory)
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
const isDone = e => !!(peekSt(e.id) && peekSt(e.id).completed);
function inProgress(e){ const s = peekSt(e.id); return !!(s && s.sceneId && e.sceneById[s.sceneId]); }
function isUnlocked(e){
  if(e.n === 1 || inProgress(e) || isDone(e)) return true;
  const prev = EPISODES.filter(x => x.n < e.n);
  return prev.length > 0 && prev.every(isDone);
}
function laterWithProgress(e){
  return EPISODES.filter(x => x.n > e.n).filter(x => { const s = peekSt(x.id); return s && (s.sceneId || s.completed || (s.completedScenes || []).length || s.startedAt); });
}
/* the episode the homepage should offer: one in progress, else the next unlocked one */
function targetEpisode(){
  const prog = EPISODES.filter(inProgress);
  if(prog.length) return prog[prog.length - 1];
  const nextEp = EPISODES.find(e => !isDone(e));
  return nextEp && isUnlocked(nextEp) ? nextEp : null;
}
function teaser(){ for(let i = EPISODES.length - 1; i >= 0; i--) if(EPISODES[i].teaser) return EPISODES[i].teaser; return null; }
function previewHTML(){
  const tz = teaser();
  const done = EPISODES.filter(isDone);
  return `<div class="modal-eyebrow">Your story</div>
    ${tz ? tz.html : '<p>More episodes are coming soon.</p>'}
    ${done.length ? `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;">${done.map(e => `<button class="btn-solid" data-lila-replay="${e.id}">↺ Replay “${esc(e.title)}”</button>`).join('')}</div>` : ''}`;
}
const LilaStory = {
  collect(){
    return {
      v:1,
      episodes: DATA.episodes || {},
      world: {
        phrases: DATA.phrases.filter(p => p.ep1 || p.ep).map(p => p.id),
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
    const w0 = story && story.world;
    if(w0 && Array.isArray(w0.threads)) w0.threads.forEach(id => { if(THREAD_DEFS[id]) thread(id); });
    Object.keys(chat).forEach(id => { if(THREAD_DEFS[id]) thread(id); });
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
    (w.people || []).forEach(id => { if(PEOPLE_DEFS[id]) meet(id); else { const p = DATA.people.find(x => x.id === id); if(p) p.revealed = true; } });
    if(w.story) Object.entries(w.story).forEach(([id, status]) => { const x = DATA.story.find(y => y.id === id); if(x) x.status = status; });
    EPISODES.forEach(e => { if(e.onApply) try { e.onApply(peekSt(e.id)); } catch(err){ console.warn(err); } });
  },
  missionCard(){
    const t = targetEpisode();
    if(t){
      if(inProgress(t)){ const sc = t.sceneById[peekSt(t.id).sceneId]; return { eyebrow:'Continue your story', title:t.title, desc:`Scene ${sc.n} of ${t.scenes.length} · ${sc.title}`, cta:'Continue', icon:t.icon }; }
      if(t.card) return t.card();
      return { eyebrow: t.n === 1 ? "Today's mission" : `New · Episode ${t.n}`, title:t.title, desc:t.tagline || '', cta:'Start', icon:t.icon };
    }
    const tz = teaser();
    return tz ? { eyebrow:'Coming soon', title:tz.title, desc:tz.short, cta:'Preview', icon:tz.icon }
              : { eyebrow:'Your story', title:'More soon', desc:'New episodes are on their way.', cta:'Preview', icon:'🎬' };
  },
  onMissionClick(){
    const t = targetEpisode();
    if(t) return open(t.id);
    openModal('epPreview');
  },
  onStoryStop(id){
    const e = EPISODES.find(x => x.storyId === id);
    if(e){
      const s = peekSt(e.id);
      if(s && s.completed && !s.sceneId) return openModal('memories');
      if(isUnlocked(e)) return open(e.id);
    }
    const tz = teaser();
    if(tz && tz.storyId === id) return openModal('epPreview');
    openModal('memories');
  },
  renderModal(type){
    if(type === 'epPreview' || type === 'ep2preview') return previewHTML();
    return null;
  },
  wireModal(type){
    if(type === 'epPreview' || type === 'ep2preview') document.querySelectorAll('[data-lila-replay]').forEach(b => b.addEventListener('click', () => open(b.dataset.lilaReplay, { replay:true })));
  },
  itemInfo,
  /* read-only peek for testing/debugging */
  _peek(){ const n = EP.scene && EP.scene.nodes[EP.nodeId]; return { ep:D && D.id, open:EP.open, scene:EP.scene && EP.scene.id, node:EP.nodeId, type:n && n.type, nodeData:n, state: D ? JSON.parse(JSON.stringify(st())) : null }; },
  open, close,
  get PHRASES(){ return PHRASES; },
  get SCENES(){ return D ? D.scenes : (EPISODES[0] && EPISODES[0].scenes); }
};
window.LilaStory = LilaStory;

/* =========================================================================
   REGISTER — called once by each episode file
   ========================================================================= */
window.LILA_EPISODES = window.LILA_EPISODES || [];
function register(def){
  if(BY_ID[def.id]) return BY_ID[def.id];
  def.sceneById = {};
  def.scenes.forEach((s, i) => { s.index = i; s.order = Object.keys(s.nodes); def.sceneById[s.id] = s; });
  Object.entries(def.phrases || {}).forEach(([id, p]) => { if(!PHRASES[id]){ p.owner = p.owner || def.id; PHRASES[id] = p; } });
  Object.assign(ITEMS, def.items || {});
  Object.assign(PEOPLE_DEFS, def.people || {});
  Object.assign(THREAD_DEFS, def.threads || {});
  Object.assign(ACH_DEFS, def.achievements || {});
  (def.locations || []).forEach(l => { if(!DATA.locations.some(x => x.id === l.id)) DATA.locations.push(Object.assign({}, l)); });
  if(def.onRegister) try { def.onRegister(); } catch(e){ console.warn(e); }
  EPISODES.push(def); EPISODES.sort((a, b) => a.n - b.n);
  BY_ID[def.id] = def;
  if(!window.LILA_EPISODES.some(e => e.id === def.id)) window.LILA_EPISODES.push({
    id:def.id, n:def.n, title:def.title, icon:def.icon,
    status(){
      if(def.status) return def.status();
      const s = peekSt(def.id);
      if(!isUnlocked(def)) return `Locked until Episode ${def.n - 1} is finished`;
      if(!s) return 'Not started';
      if(s.sceneId && def.sceneById[s.sceneId]) return `In progress · Scene ${def.sceneById[s.sceneId].n} of ${def.scenes.length}`;
      if(s.completed) return 'Completed';
      return (s.completedScenes && s.completedScenes.length) ? `In progress · ${s.completedScenes.length} of ${def.scenes.length} scenes` : 'Not started';
    },
    later(){ return laterWithProgress(def).map(e => `Episode ${e.n} — ${e.title}`); },
    /* an episode reset also resets the episodes that build on it (newest first) */
    clear(snap){
      EPISODES.filter(e => e.n >= def.n).sort((a, b) => b.n - a.n).forEach(e => { if(e.clearOwn) snap = e.clearOwn(snap) || snap; });
      return snap;
    }
  });
  window.LILA_EPISODES.sort((a, b) => a.n - b.n);
  return def;
}

window.LilaEngine = {
  register, open, close, has: id => !!BY_ID[id], current: () => D, episodes: () => EPISODES.slice(), isUnlocked, isDone,
  api: {
    esc, $, $$, wordCount, isReduced, wait, fmtTime, SET, saveSettings, Sound, Voice, canRecord, makeRecorder, destroyRecorders,
    speakBox, talkBox, hintLadder, st, stOf, peekSt, save, flushSave, taskDone, ensureAch, unlockAch, addPhrase, hasPhrase, giveItem, itemInfo,
    meet, thread, pushChat, hasMsg, refreshMeta, EP, RENDER, dlg, hideDlg, primary, head, lineHTML, tools, toast, pop, closePop, vocabCard,
    showLine, next, endScene, transitionTo, gotoScene, runNode, setBg, setCam, renderHotspots, hotspotsVisible, valOf, subsOffHTML,
    showGame, hideGame, openPhone, closePhone, renderThread, phoneFoot, openModalEp, closeModalEp, confirmBox, pause, close, open,
    restartEpisode, refreshHome, syncTop, updateProgress, keepImage, spk, PHRASES, ITEMS, isDone, isUnlocked,
    art: { rng, svg, lin, rad, FONT, skyline, lights, palm, figure, nextArtId }
  }
};


})();
