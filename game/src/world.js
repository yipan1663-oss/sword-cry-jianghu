import { FIELD, HERO, WAVES, ENEMY } from './config.js';
import { spawnBandit, spawnSpearman, spawnBoss, updateEnemy } from './enemies.js';

export const EVENT_HIT = 1;
export const EVENT_KILL = 2;
export const EVENT_WAVE_CLEAR = 4;
export const EVENT_WIN = 8;
export const EVENT_LOSE = 16;
export const EVENT_PLAYER_HURT = 32;
export const EVENT_BOSS = 64;

function makeHero() {
  return {
    x: FIELD.width * 0.5 - HERO.width / 2,
    y: FIELD.groundY - HERO.height,
    vx: 0, vy: 0,
    width: HERO.width, height: HERO.height,
    facing: 1,
    health: HERO.maxHealth,
    qi: 0,
    onGround: true,
    slashCd: 0, dashCd: 0,
    slashTimer: 0, dashTimer: 0,
    invuln: 0,
    dead: false,
  };
}

export function createWorld(random = Math.random) {
  const state = {
    hero: makeHero(),
    enemies: [],
    projectiles: [],
    particles: [],
    floats: [],
    afterimages: [],
    score: 0,
    combo: 0,
    comboTimer: 0,
    wave: 0,
    waveClearTimer: 0,
    pendingWave: false,
    time: 0,
    hitStop: 0,
    shake: 0,
    won: false,
    lost: false,
    bossSpawned: false,
  };

  function addParticle(x, y, vx, vy, life, size, color, type='dot') {
    state.particles.push({ x,y,vx,vy,life,max:life,size,color,type });
  }
  function inkBurst(x, y, color, n=10, speed=180) {
    for (let i=0;i<n;i++) {
      const a = (Math.PI*2) * (random());
      const s = speed*(0.3+random()*0.7);
      addParticle(x,y,Math.cos(a)*s,Math.sin(a)*s-40,0.4+random()*0.4,2+random()*4,color, random()<0.4?'splat':'dot');
    }
  }
  function addFloat(x,y,text,color) { state.floats.push({x,y,text,color,life:0.9,vy:-40}); }

  function spawnWave(index) {
    const w = WAVES[index];
    if (!w) return;
    state.wave = index + 1;
    state.bossSpawned = false;
    const side = (i) => i % 2 === 0 ? -60 - i*30 : FIELD.width + 60 + i*30;
    let i = 0;
    for (let n=0;n<(w.bandit||0);n++,i++) state.enemies.push(spawnBandit(side(i), side(i)<0?1:-1));
    for (let n=0;n<(w.spearman||0);n++,i++) state.enemies.push(spawnSpearman(side(i), side(i)<0?1:-1));
    if (w.boss) { state.enemies.push(spawnBoss(FIELD.width - 140, -1)); state.bossSpawned = true; }
  }

  function reset() {
    Object.assign(state, {
      hero: makeHero(), enemies: [], projectiles: [], particles: [], floats: [], afterimages: [],
      score: 0, combo: 0, comboTimer: 0, wave: 0, waveClearTimer: 0, pendingWave: false,
      time: 0, hitStop: 0, shake: 0, won: false, lost: false, bossSpawned: false,
    });
    spawnWave(0);
  }

  function damageEnemy(e, dmg, sourceX) {
    if (!e.active) return 0;
    e.health -= dmg;
    e.hitFlash = 0.12;
    const knock = sourceX < e.x + e.width/2 ? 1 : -1;
    e.x += knock * 18;
    inkBurst(e.x + e.width/2, e.y + e.height*0.4, e.type==='boss' ? '#8f2e22' : '#1a1814', 8, 140);
    addFloat(e.x + e.width/2, e.y, String(dmg), '#d4a017');
    if (e.health <= 0) { e.active = false; e.state = 'dead'; return e.score || 50; }
    return 0;
  }

  function heroAttackHitbox() {
    const h = state.hero;
    const reach = HERO.slashRange;
    return h.facing === 1
      ? { x: h.x + h.width*0.6, y: h.y - 10, w: reach, h: h.height + 20 }
      : { x: h.x + h.width*0.4 - reach, y: h.y - 10, w: reach, h: h.height + 20 };
  }

  function rectHit(a,b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function performSlash(events) {
    const h = state.hero;
    h.slashCd = HERO.slashCooldown;
    h.slashTimer = 0.12;
    const hb = heroAttackHitbox();
    let hitAny = false;
    for (const e of state.enemies) {
      if (!e.active) continue;
      const eb = { x: e.x, y: e.y, w: e.width, h: e.height };
      if (rectHit({x:hb.x,y:hb.y,w:hb.w,h:hb.h}, eb)) {
        const score = damageEnemy(e, HERO.slashDamage, h.x + h.width/2);
        if (score) { state.score += score * (1 + Math.min(state.combo, 9)*0.1); events |= EVENT_KILL; }
        else state.score += 5;
        state.combo += 1; state.comboTimer = 2.2;
        h.qi = Math.min(HERO.qiMax, h.qi + HERO.qiPerHit);
        hitAny = true;
        events |= EVENT_HIT;
      }
    }
    if (hitAny) { state.hitStop = 0.045; state.shake = 6; }
    inkBurst(h.x + h.width/2 + h.facing*50, h.y + h.height*0.45, '#1a1814', 6, 120);
  }

  function performDash(h) {
    h.dashCd = HERO.dashCooldown;
    h.dashTimer = HERO.dashTime;
    h.invuln = Math.max(h.invuln, HERO.dashInvuln);
  }

  function performWave(events) {
    const h = state.hero;
    if (h.qi < HERO.qiMax) return;
    h.qi = 0;
    state.projectiles.push({ x: h.x + h.width/2, y: h.y + h.height*0.45, vx: h.facing*HERO.waveSpeed, life: 1.2, w: 46, h: 18, facing: h.facing });
    inkBurst(h.x + h.width/2, h.y + h.height*0.45, '#2f7a5e', 12, 160);
  }

  function applyPlayerHit(damage, fromX, events) {
    const h = state.hero;
    if (h.invuln > 0 || h.dead || state.won || state.lost) return;
    h.health -= damage;
    h.invuln = HERO.hurtInvuln;
    h.vx = (h.x + h.width/2 < fromX ? -220 : 220);
    h.vy = -220;
    h.onGround = false;
    state.combo = 0;
    state.hitStop = 0.06; state.shake = 10;
    inkBurst(h.x + h.width/2, h.y + h.height*0.4, '#c44536', 14, 180);
    addFloat(h.x + h.width/2, h.y, `-${damage}`, '#c44536');
    events |= EVENT_PLAYER_HURT;
    if (h.health <= 0) { h.health = 0; h.dead = true; state.lost = true; events |= EVENT_LOSE; }
  }

  function step(dt, input, harmless=false) {
    let events = 0;
    if (state.hitStop > 0) { state.hitStop -= dt; return events; }
    state.time += dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 30);
    if (state.comboTimer > 0) { state.comboTimer -= dt; if (state.comboTimer <= 0) state.combo = 0; }

    const h = state.hero;
    // timers
    if (h.slashCd > 0) h.slashCd -= dt;
    if (h.dashCd > 0) h.dashCd -= dt;
    if (h.slashTimer > 0) h.slashTimer -= dt;
    if (h.dashTimer > 0) h.dashTimer -= dt;
    if (h.invuln > 0) h.invuln -= dt;

    if (!harmless && !state.won && !state.lost) {
      const dir = input.dir ? input.dir() : 0;
      const acts = input.takeActions ? input.takeActions() : 0;
      // move
      if (h.dashTimer > 0) {
        h.vx = h.facing * HERO.dashSpeed;
        if (Math.random() < 0.6) state.afterimages.push({ x:h.x, y:h.y, facing:h.facing, life:0.18 });
      } else {
        h.vx = dir * HERO.speed;
        if (dir !== 0) h.facing = dir;
      }
      if (acts & 32) { // jump
        if (h.onGround) { h.vy = -HERO.jump; h.onGround = false; }
      }
      if ((acts & 4) && h.slashCd <= 0) { performSlash(events); }
      if ((acts & 8) && h.dashCd <= 0) { performDash(h); }
      if (acts & 16) { performWave(events); }

      // physics
      h.vy += HERO.gravity * dt;
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      if (h.y + h.height >= FIELD.groundY) { h.y = FIELD.groundY - h.height; h.vy = 0; h.onGround = true; }
      h.x = Math.max(0, Math.min(FIELD.width - h.width, h.x));

      // projectiles
      for (const p of state.projectiles) {
        p.x += p.vx * dt; p.life -= dt;
        inkBurst(p.x, p.y, '#2f7a5e', 1, 40);
        for (const e of state.enemies) {
          if (!e.active) continue;
          if (p.life <= 0) break;
          if (p.x > e.x && p.x < e.x + e.width && p.y > e.y && p.y < e.y + e.height) {
            const score = damageEnemy(e, HERO.waveDamage, p.x);
            if (score) { state.score += score; events |= EVENT_KILL; }
            state.combo += 1; state.comboTimer = 2.2;
            p.life = 0; state.hitStop = 0.04; state.shake = 5; events |= EVENT_HIT;
          }
        }
      }
      state.projectiles = state.projectiles.filter(p => p.life > 0 && p.x > -60 && p.x < FIELD.width+60);

      // enemies
      const out = { enemyHit: null };
      for (const e of state.enemies) {
        if (!e.active) continue;
        out.enemyHit = null;
        updateEnemy(e, dt, h, out);
        if (out.enemyHit) applyPlayerHit(out.enemyHit.damage, out.enemyHit.fromX, events);
      }
      state.enemies = state.enemies.filter(e => e.active || e.hitFlash > 0);

      // wave progression
      const alive = state.enemies.some(e => e.active);
      if (!alive && !state.pendingWave && !state.won) {
        if (state.wave >= WAVES.length) {
          state.won = true; events |= EVENT_WIN;
        } else {
          state.pendingWave = true; state.waveClearTimer = 1.2; events |= EVENT_WAVE_CLEAR;
        }
      }
      if (state.pendingWave) {
        state.waveClearTimer -= dt;
        if (state.waveClearTimer <= 0) { state.pendingWave = false; spawnWave(state.wave); if (state.bossSpawned) events |= EVENT_BOSS; }
      }
    } else if (harmless) {
      // idle backdrop motion: gentle particles only
    }

    // particles / floats / afterimages update
    for (const p of state.particles) { p.life -= dt; p.x += p.vx*dt; p.y += p.vy*dt; p.vy += 220*dt; p.vx *= 0.98; }
    state.particles = state.particles.filter(p => p.life > 0);
    for (const f of state.floats) { f.life -= dt; f.y += f.vy*dt; }
    state.floats = state.floats.filter(f => f.life > 0);
    for (const a of state.afterimages) { a.life -= dt; }
    state.afterimages = state.afterimages.filter(a => a.life > 0);

    return events;
  }

  function activeBoss() {
    return state.enemies.find(e => e.active && e.type === 'boss') || null;
  }

  reset();
  return { state, reset, step, activeBoss };
}
