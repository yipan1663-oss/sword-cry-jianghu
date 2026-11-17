// Boot, loop, and screen state machine for 剑鸣江湖 / Sword Cry in the Jianghu.
import { STEP, BEST_KEY } from './config.js';
import { createInput, ACT_CONFIRM, ACT_PAUSE, ACT_MUTE } from './input.js';
import { createAudio } from './audio.js';
import { createWorld, EVENT_HIT, EVENT_KILL, EVENT_WAVE_CLEAR, EVENT_WIN, EVENT_LOSE, EVENT_PLAYER_HURT, EVENT_BOSS } from './world.js';
import { createRenderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_OVER } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random()*4294967296);

function makeRng(s) { let a=s|0; return function(){ a=(a+0x6d2b79f5)|0; let t=Math.imul(a^(a>>>15),1|a); t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; }; }

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const rng = makeRng(seed);
const world = createWorld(rng);
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest(){ try { return Number.parseInt(localStorage.getItem(BEST_KEY)||'0',10)||0; } catch { return 0; } }
function saveBest(v){ try { localStorage.setItem(BEST_KEY, String(v)); } catch {} }

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    world.state._boss = world.activeBoss ? world.activeBoss() : null;
    renderer.draw(world.state, scene.screen, scene.best, 1/60, audio.isMuted());
    painted++;
    if (painted < 2) requestAnimationFrame(paint); else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let muted = false;

  function announce(msg){ status.textContent = msg; }
  function start() {
    audio.unlock();
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.menu();
    announce('开始战斗 Fight');
  }
  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) { best = Math.floor(world.state.score); saveBest(best); }
    if (world.state.won) { audio.win(); announce('胜利 Victory'); } else { audio.lose(); announce('失败 Defeat'); }
  }

  function handleActions() {
    const a = input.takeActions();
    if (a & ACT_MUTE) { muted = audio.toggleMute(); }
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      if (a & (ACT_CONFIRM)) start();
    } else if (screen === SCREEN_PLAY) {
      if (a & ACT_PAUSE) { screen = SCREEN_PAUSED; announce('暂停 Paused'); }
    } else if (screen === SCREEN_PAUSED) {
      if (a & (ACT_PAUSE | ACT_CONFIRM)) { screen = SCREEN_PLAY; announce('继续 Resume'); }
    }
  }

  function stepOnce() {
    if (screen === SCREEN_TITLE) { world.step(STEP, {dir:()=>0,takeActions:()=>0}, true); return; }
    if (screen !== SCREEN_PLAY) return;
    const ev = world.step(STEP, input, false);
    if (ev & EVENT_HIT) audio.hit();
    if (ev & EVENT_KILL) audio.pluck(Math.floor(world.state.combo) % 7);
    if (ev & EVENT_PLAYER_HURT) audio.hurt();
    if (ev & EVENT_WAVE_CLEAR) { audio.waveClear(); announce(`波次 ${world.state.wave} 完成`); }
    if (ev & EVENT_BOSS) { audio.bossDrum(); announce('首领出现 Boss'); }
    if (ev & EVENT_WIN || ev & EVENT_LOSE) endGame();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last)/1000, MAX_FRAME);
    last = now;
    accumulator += dt;
    handleActions();
    // any user interaction already unlocks; confirm handler calls unlock
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP) { stepOnce(); accumulator -= STEP; if (screen !== SCREEN_PLAY && screen !== SCREEN_TITLE) break; }
    } else {
      accumulator = 0;
    }
    world.state._boss = world.activeBoss ? world.activeBoss() : null;
    renderer.draw(world.state, screen, best, STEP, muted);
  }

  document.addEventListener('visibilitychange', () => { if (document.hidden && screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('暂停 Paused'); } });
  announce('剑鸣江湖 Sword Cry in the Jianghu');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot); else runGame();
