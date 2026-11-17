import { FIELD, HERO, WAVES, ENEMY, PICKUP } from './config.js';
import { spawnBandit, spawnSpearman, spawnBoss, updateEnemy } from './enemies.js';

export const EVENT_HIT = 1;
export const EVENT_KILL = 2;
export const EVENT_WAVE_CLEAR = 4;
export const EVENT_WIN = 8;
export const EVENT_LOSE = 16;
export const EVENT_PLAYER_HURT = 32;
export const EVENT_BOSS = 64;
export const EVENT_ULTIMATE = 128;

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
    slashTimer: 0, dashTimer: 0, lungeTimer: 0,
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
    pickups: [],
    score: 0,
    combo: 0,
    comboTimer: 0,
    hitCount: 0,
    wave: 0,
    waveClearTimer: 0,
    pendingWave: false,
    time: 0,
    hitStop: 0,
    shake: 0,
    won: false,
    lost: false,
    bossSpawned: false,
    slowMo: 0,
    slowFactor: 1,
    ultimateFlash: 0,
    ultimateWave: null,
    bossDeathSlow: 0,
    redVignette: 0,
    goldFlash: 0,
    victoryTimer: 0,
  };

  function addParticle(x, y, vx, vy, life, size, color, type='dot') {
    state.particles.push({ x,y,vx,vy,life,max:life,size,color,type,grav: type==='petal' ? 40 : 220 });
  }
  function inkBurst(x, y, color, n=14, speed=220) {
    for (let i=0;i<n;i++) {
      const a = (Math.PI*2) * (random());
      const s = speed*(0.35+random()*0.75);
      addParticle(x,y,Math.cos(a)*s,Math.sin(a)*s-50,0.45+random()*0.45,3+random()*6,color, random()<0.45?'splat':'dot');
    }
  }
  function addFloat(x,y,text,color,size=24,life=0.9) { state.floats.push({x,y,text,color,life,max:life,vy:-46,size}); }

  function maybeDropPickup(x, y) {
    if (random() >= PICKUP.dropChance) return;
    const type = random() < 0.5 ? 'qi' : 'health';
    state.pickups.push({ x, y: FIELD.groundY - 18, type, life: PICKUP.life, bob: random()*Math.PI*2, active: true });
  }

  function spawnWave(index) {
    const w = WAVES[index];
    if (!w) return;
    state.wave = index + 1;
    const side = (i) => i % 2 === 0 ? -60 - i*30 : FIELD.width + 60 + i*30;
    let i = 0;
    for (let n=0;n<(w.bandit||0);n++,i++) state.enemies.push(spawnBandit(side(i), side(i)<0?1:-1));
    for (let n=0;n<(w.spearman||0);n++,i++) state.enemies.push(spawnSpearman(side(i), side(i)<0?1:-1));
    if (w.boss) { state.enemies.push(spawnBoss(FIELD.width - 160, -1)); state.bossSpawned = true; }
  }

  function reset() {
    Object.assign(state, {
      hero: makeHero(), enemies: [], projectiles: [], particles: [], floats: [], afterimages: [], pickups: [],
      score: 0, combo: 0, comboTimer: 0, hitCount: 0, wave: 0, waveClearTimer: 0, pendingWave: false,
      time: 0, hitStop: 0, shake: 0, won: false, lost: false, bossSpawned: false,
      slowMo: 0, slowFactor: 1, ultimateFlash: 0, ultimateWave: null, bossDeathSlow: 0, redVignette: 0, goldFlash: 0, victoryTimer: 0,
    });
    spawnWave(0);
  }

  function damageEnemy(e, dmg, sourceX, opts={}) {
    if (!e.active) return 0;
    e.health -= dmg;
    e.hitFlash = 0.16;
    e.hitWhite = opts.heavy ? 0.1 : 0.06;
    const knock = sourceX < e.x + e.width/2 ? 1 : -1;
    e.x += knock * (opts.heavy ? 26 : 18);
    if (e.type === 'boss' && (opts.heavy || dmg >= 18)) { e.rearBack = 0.22; e.rearDir = -knock; }
    const burstColor = e.type==='boss' ? '#8f2e22' : '#1a1814';
    inkBurst(e.x + e.width/2, e.y + e.height*0.4, burstColor, opts.bigBurst ? 22 : 14, opts.bigBurst ? 260 : 220);
    const crit = !!opts.crit;
    addFloat(e.x + e.width/2, e.y - 6, String(dmg), crit ? '#f7d774' : '#d4a017', crit ? 34 : 26);
    if (e.health <= 0) {
      e.active = false; e.state = 'dead';
      if (e.type === 'boss') {
        state.bossDeathSlow = 0.6;
        state.slowMo = Math.max(state.slowMo, 0.6);
        state.slowFactor = 0.25;
        state.shake = Math.max(state.shake, 18);
        inkBurst(e.x + e.width/2, e.y + e.height*0.4, '#d4a017', 36, 320);
        state.goldFlash = 0.4;
      } else {
        maybeDropPickup(e.x + e.width/2, e.y + e.height*0.6);
      }
      return e.score || 50;
    }
    // boss summon at half health once
    if (e.type === 'boss' && !e.summonedMinions && e.health <= e.maxHealth * 0.5) {
      e.summonedMinions = true;
      const left = Math.max(40, e.x - 140);
      const right = Math.min(FIELD.width - 60, e.x + e.width + 100);
      state.enemies.push(spawnBandit(left, 1));
      state.enemies.push(spawnBandit(right, -1));
      inkBurst(e.x + e.width/2, e.y + 20, '#c44536', 24, 200);
      addFloat(e.x + e.width/2, e.y - 20, '援兵!', '#c44536', 30);
      state.shake = Math.max(state.shake, 8);
    }
    return 0;
  }

  function heroAttackHitbox() {
    const h = state.hero;
    const reach = HERO.slashRange;
    return h.facing === 1
      ? { x: h.x + h.width*0.6, y: h.y - 10, w: reach, h: h.height + 20 }
      : { x: h.x + h.width*0.4 - reach, y: h.y - 10, w: reach, h: h.height + 20 };
  }

  function rectHit(ax,ay,aw,ah, bx,by,bw,bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function performSlash(events) {
    const h = state.hero;
    h.slashCd = HERO.slashCooldown;
    h.slashTimer = 0.14;
    h.lungeTimer = 0.12;
    const hb = heroAttackHitbox();
    let hitAny = false;
    let killAny = false;
    for (const e of state.enemies) {
      if (!e.active) continue;
      if (rectHit(hb.x,hb.y,hb.w,hb.h, e.x,e.y,e.width,e.height)) {
        state.hitCount = (state.hitCount || 0) + 1;
        const crit = state.hitCount % 5 === 0;
        const dmg = crit ? Math.round(HERO.slashDamage * 1.5) : HERO.slashDamage;
        const score = damageEnemy(e, dmg, h.x + h.width/2, { crit, bigBurst: true, heavy: true });
        if (score) { state.score += score * (1 + Math.min(state.combo, 9)*0.1); events |= EVENT_KILL; killAny = true; }
        else state.score += 5;
        state.combo += 1; state.comboTimer = 2.2;
        h.qi = Math.min(HERO.qiMax, h.qi + HERO.qiPerHit);
        hitAny = true;
        events |= EVENT_HIT;
      }
    }
    if (hitAny) { state.hitStop = killAny ? 0.06 : 0.045; state.shake = Math.max(state.shake, 6); }
    inkBurst(h.x + h.width/2 + h.facing*50, h.y + h.height*0.45, '#1a1814', 8, 150);
    return events;
  }

  function performDash(h) {
    h.dashCd = HERO.dashCooldown;
    h.dashTimer = HERO.dashTime;
    h.invuln = Math.max(h.invuln, HERO.dashInvuln);
    state.afterimages.push({ x:h.x, y:h.y, facing:h.facing, life:0.22 });
  }

  function performWave(events) {
    const h = state.hero;
    if (h.qi < 30) return events;
    // Ultimate when full: 剑啸九天
    if (h.qi >= HERO.qiMax) {
      h.qi = 0;
      state.ultimateFlash = 0.22;
      state.ultimateWave = { t: 0, life: 0.55, x: h.x + h.width/2 };
      state.slowMo = Math.max(state.slowMo, HERO.ultimateSlowMo);
      state.slowFactor = 0.2;
      state.shake = Math.max(state.shake, 22);
      let any = false;
      for (const e of state.enemies) {
        if (!e.active) continue;
        const score = damageEnemy(e, HERO.ultimateDamage, h.x + h.width/2, { bigBurst: true, heavy: true, crit: true });
        if (score) { state.score += score; events |= EVENT_KILL; any = true; }
        else state.score += 10;
        state.combo += 1; state.comboTimer = 2.2;
        events |= EVENT_HIT;
      }
      for (let i=0;i<40;i++) {
        const a = random()*Math.PI*2, s = 120 + random()*380;
        addParticle(h.x+h.width/2, h.y+h.height*0.4, Math.cos(a)*s, Math.sin(a)*s-80, 0.7+random()*0.5, 3+random()*5, i%2?'#f4d35e':'#fff6cc', random()<0.3?'splat':'dot');
      }
      addFloat(h.x + h.width/2, h.y - 30, '剑啸九天!', '#f4d35e', 44, 1.2);
      events |= EVENT_ULTIMATE;
      return events;
    }
    // normal wave
    h.qi = Math.max(0, h.qi - 30);
    state.projectiles.push({ x: h.x + h.width/2, y: h.y + h.height*0.45, vx: h.facing*HERO.waveSpeed, life: 1.2, w: 46, h: 18, facing: h.facing });
    inkBurst(h.x + h.width/2, h.y + h.height*0.45, '#2f7a5e', 14, 170);
    return events;
  }

  function applyPlayerHit(damage, fromX, events) {
    const h = state.hero;
    if (h.invuln > 0 || h.dead || state.won || state.lost) return events;
    h.health -= damage;
    h.invuln = HERO.hurtInvuln;
    h.vx = (h.x + h.width/2 < fromX ? -240 : 240);
    h.vy = -240;
    h.onGround = false;
    state.combo = 0;
    const big = damage >= 16;
    state.hitStop = big ? 0.08 : 0.06; state.shake = big ? 14 : 10;
    state.redVignette = big ? 0.35 : 0.18;
    inkBurst(h.x + h.width/2, h.y + h.height*0.4, '#c44536', 20, 220);
    addFloat(h.x + h.width/2, h.y, `-${damage}`, '#c44536', 28);
    events |= EVENT_PLAYER_HURT;
    if (h.health <= 0) { h.health = 0; h.dead = true; state.lost = true; events |= EVENT_LOSE; }
    return events;
  }

  function step(dt, input, harmless=false) {
    let events = 0;
    // update slow-mo timer on real time scale
    if (state.slowMo > 0) {
      state.slowMo -= dt;
      if (state.slowMo <= 0) { state.slowMo = 0; state.slowFactor = 1; }
    }
    const simDt = harmless ? dt : dt * (state.slowFactor || 1);

    if (state.hitStop > 0) { state.hitStop -= simDt; return events; }
    state.time += simDt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - simDt * 30);
    if (state.comboTimer > 0) { state.comboTimer -= simDt; if (state.comboTimer <= 0) state.combo = 0; }
    if (state.ultimateFlash > 0) state.ultimateFlash = Math.max(0, state.ultimateFlash - dt);
    if (state.redVignette > 0) state.redVignette = Math.max(0, state.redVignette - dt);
    if (state.goldFlash > 0) state.goldFlash = Math.max(0, state.goldFlash - dt);
    if (state.ultimateWave) { state.ultimateWave.t += dt; if (state.ultimateWave.t > state.ultimateWave.life) state.ultimateWave = null; }

    const h = state.hero;
    if (h.slashCd > 0) h.slashCd -= simDt;
    if (h.dashCd > 0) h.dashCd -= simDt;
    if (h.slashTimer > 0) h.slashTimer -= simDt;
    if (h.dashTimer > 0) h.dashTimer -= simDt;
    if (h.lungeTimer > 0) h.lungeTimer -= simDt;
    if (h.invuln > 0) h.invuln -= simDt;

    if (!harmless && !state.won && !state.lost) {
      const dir = input.dir ? input.dir() : 0;
      const acts = input.takeActions ? input.takeActions() : 0;
      if (h.dashTimer > 0) {
        h.vx = h.facing * HERO.dashSpeed;
        if (random() < 0.85) state.afterimages.push({ x:h.x, y:h.y, facing:h.facing, life:0.22 });
      } else {
        h.vx = dir * HERO.speed;
        if (h.lungeTimer > 0) h.vx += h.facing * 120;
        if (dir !== 0) h.facing = dir;
      }
      if (acts & 32) { if (h.onGround) { h.vy = -HERO.jump; h.onGround = false; } }
      if ((acts & 4) && h.slashCd <= 0) { events = performSlash(events); }
      if ((acts & 8) && h.dashCd <= 0) { performDash(h); }
      if (acts & 16) { events = performWave(events); }

      h.vy += HERO.gravity * simDt;
      h.x += h.vx * simDt;
      h.y += h.vy * simDt;
      if (h.y + h.height >= FIELD.groundY) { h.y = FIELD.groundY - h.height; h.vy = 0; h.onGround = true; }
      h.x = Math.max(0, Math.min(FIELD.width - h.width, h.x));

      for (const p of state.projectiles) {
        p.x += p.vx * simDt; p.life -= simDt;
        if (random() < 0.5) addParticle(p.x, p.y, -p.facing*20, (random()-0.5)*30, 0.2, 2, '#2f7a5e', 'dot');
        for (const e of state.enemies) {
          if (!e.active || p.life <= 0) continue;
          if (p.x > e.x && p.x < e.x + e.width && p.y > e.y && p.y < e.y + e.height) {
            const score = damageEnemy(e, HERO.waveDamage, p.x, { bigBurst: true, heavy: true });
            if (score) { state.score += score; events |= EVENT_KILL; }
            state.combo += 1; state.comboTimer = 2.2;
            p.life = 0;
            state.hitStop = score ? 0.06 : 0.04;
            state.shake = Math.max(state.shake, 6);
            events |= EVENT_HIT;
          }
        }
      }
      state.projectiles = state.projectiles.filter(p => p.life > 0 && p.x > -60 && p.x < FIELD.width+60);

      const out = { enemyHit: null, bossSlamImpact: null };
      for (const e of state.enemies) {
        if (!e.active) continue;
        out.enemyHit = null; out.bossSlamImpact = null;
        updateEnemy(e, simDt, h, out);
        if (out.enemyHit) events = applyPlayerHit(out.enemyHit.damage, out.enemyHit.fromX, events);
        if (out.bossSlamImpact) {
          state.shake = Math.max(state.shake, 16);
          inkBurst(out.bossSlamImpact.x, FIELD.groundY - 10, '#8f2e22', 20, 260);
          addFloat(out.bossSlamImpact.x, FIELD.groundY - 60, '碎!', '#c44536', 30);
        }
      }
      state.enemies = state.enemies.filter(e => e.active || e.hitFlash > 0 || (e.hitWhite||0) > 0 || (e.rearBack||0) > 0);

      for (const p of state.pickups) {
        if (!p.active) continue;
        p.life -= simDt; p.bob += simDt * 3;
        if (p.life <= 0) { p.active = false; continue; }
        const px = p.x, py = p.y + Math.sin(p.bob)*4;
        const hx = h.x + h.width/2, hy = h.y + h.height/2;
        const dx = hx - px, dy = hy - py;
        if (dx*dx + dy*dy < (PICKUP.radius + 26)*(PICKUP.radius + 26)) {
          p.active = false;
          if (p.type === 'qi') {
            const before = h.qi; h.qi = Math.min(HERO.qiMax, h.qi + PICKUP.qiRestore);
            addFloat(px, py - 8, `+${Math.round(h.qi-before)} Qi`, '#2f7a5e', 24);
            inkBurst(px, py, '#2f7a5e', 12, 120);
          } else {
            const before = h.health; h.health = Math.min(HERO.maxHealth, h.health + PICKUP.healthRestore);
            addFloat(px, py - 8, `+${Math.round(h.health-before)}`, '#c44536', 24);
            inkBurst(px, py, '#c44536', 12, 120);
          }
        }
      }
      state.pickups = state.pickups.filter(p => p.active);

      const alive = state.enemies.some(e => e.active);
      if (!alive && !state.pendingWave && !state.won) {
        if (state.wave >= WAVES.length) {
          state.won = true; events |= EVENT_WIN;
          state.goldFlash = Math.max(state.goldFlash, 0.6);
          // victory petals
          for (let i=0;i<50;i++) addParticle(random()*FIELD.width, -20-random()*120, (random()-0.5)*40, 40+random()*80, 3+random()*2, 4+random()*4, i%3===0?'#f4d35e':(i%3===1?'#c44536':'#d97b6c'), 'petal');
        } else {
          state.pendingWave = true; state.waveClearTimer = 1.2; events |= EVENT_WAVE_CLEAR;
        }
      }
      if (state.pendingWave) {
        state.waveClearTimer -= simDt;
        if (state.waveClearTimer <= 0) {
          state.pendingWave = false; spawnWave(state.wave);
          if (state.enemies.some(e=>e.active && e.type==='boss')) events |= EVENT_BOSS;
        }
      }
    }

    for (const p of state.particles) { p.life -= simDt; p.x += p.vx*simDt; p.y += p.vy*simDt; p.vy += (p.grav||220)*simDt; p.vx *= 0.985; }
    state.particles = state.particles.filter(p => p.life > 0);
    for (const f of state.floats) { f.life -= simDt; f.y += f.vy*simDt; }
    state.floats = state.floats.filter(f => f.life > 0);
    for (const a of state.afterimages) { a.life -= simDt; }
    state.afterimages = state.afterimages.filter(a => a.life > 0);

    // victory petals keep spawning a bit
    if (state.won) {
      state.victoryTimer += simDt;
      if (state.victoryTimer < 2.5 && random() < 0.4) addParticle(random()*FIELD.width, -10, (random()-0.5)*30, 30+random()*60, 3+random()*2, 4+random()*4, random()<0.4?'#f4d35e':'#c44536', 'petal');
    }

    return events;
  }

  function activeBoss() {
    return state.enemies.find(e => e.active && e.type === 'boss') || null;
  }

  reset();
  return { state, reset, step, activeBoss };
}
