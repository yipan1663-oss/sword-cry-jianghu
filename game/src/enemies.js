import { ENEMY, FIELD } from './config.js';

function base(stats, x, facing) {
  return {
    ...stats,
    maxHealth: stats.health,
    x, y: FIELD.groundY - stats.height,
    vx: 0, vy: 0,
    facing,
    state: 'approach', // approach, telegraph, attack, recover, dash, dead, slamTele, slam
    timer: 0,
    hitFlash: 0,
    hitWhite: 0,
    rearBack: 0,
    rearDir: 0,
    active: true,
    attackDidHit: false,
    summonedMinions: false,
    slamX: 0,
  };
}

export function spawnBandit(x, facing = -1) { return base(ENEMY.bandit, x, facing); }
export function spawnSpearman(x, facing = -1) { return base(ENEMY.spearman, x, facing); }
export function spawnBoss(x, facing = -1) { return base(ENEMY.boss, x, facing); }

function distToHero(e, hero) {
  const ex = e.x + e.width / 2, hx = hero.x + hero.width / 2;
  return hx - ex; // signed
}

export function updateEnemy(e, dt, hero, out) {
  if (!e.active) return;
  if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt);
  if (e.hitWhite > 0) e.hitWhite = Math.max(0, e.hitWhite - dt);
  if (e.rearBack > 0) e.rearBack = Math.max(0, e.rearBack - dt);
  const dx = distToHero(e, hero);
  const adx = Math.abs(dx);
  e.facing = dx < 0 ? -1 : 1;
  e.y = FIELD.groundY - e.height;
  const inRange = adx < e.range + hero.width * 0.3;

  if (e.type === 'boss') return updateBoss(e, dt, hero, out, dx, adx, inRange);

  const walk = e.state === 'approach' || e.state === 'recover';
  e.anim = (e.anim || 0) + dt * (walk ? 10 : 4);

  if (e.state === 'approach') {
    if (inRange) {
      e.state = 'telegraph'; e.timer = e.telegraph; e.attackDidHit = false;
    } else {
      e.x += Math.sign(dx) * e.speed * dt;
    }
  } else if (e.state === 'telegraph') {
    e.timer -= dt;
    if (e.timer <= 0) { e.state = 'attack'; e.timer = e.attackTime; }
  } else if (e.state === 'attack') {
    e.timer -= dt;
    if (!e.attackDidHit) {
      const range = e.range;
      const hx = hero.x + hero.width / 2, ex = e.x + e.width / 2;
      const facingOk = (e.facing === 1 ? hx >= ex : hx <= ex);
      if (facingOk && Math.abs(hx - ex) < range + hero.width * 0.4 && Math.abs((hero.y+hero.height/2)-(e.y+e.height/2)) < 60) {
        out.enemyHit = { damage: e.damage, fromX: ex };
        e.attackDidHit = true;
      }
    }
    if (e.timer <= 0) { e.state = 'recover'; e.timer = e.recover; }
  } else if (e.state === 'recover') {
    e.timer -= dt;
    if (e.timer <= 0) e.state = 'approach';
  }
  e.x = Math.max(10, Math.min(FIELD.width - e.width - 10, e.x));
}

function updateBoss(e, dt, hero, out, dx, adx, inRange) {
  const ex = e.x + e.width / 2;
  e.anim = (e.anim || 0) + dt * (e.state === 'approach' ? 8 : 4);

  if (e.state === 'approach') {
    if (adx < 150 && Math.random() < 0.012) {
      e.state = 'slamTele'; e.timer = e.slamTelegraph; e.attackDidHit = false; e.slamX = hero.x + hero.width/2;
    } else if (adx > 260 && Math.random() < 0.01) {
      e.state = 'dashTele'; e.timer = 0.35; e.attackDidHit = false;
    } else if (inRange) {
      if (adx < 70 && Math.random() < 0.45) { e.state = 'sweepTele'; e.timer = e.sweepTelegraph; }
      else { e.state = 'telegraph'; e.timer = e.telegraph; }
      e.attackDidHit = false;
    } else {
      e.x += Math.sign(dx) * e.speed * dt;
    }
  } else if (e.state === 'dashTele') {
    e.timer -= dt;
    if (e.timer <= 0) { e.state = 'dash'; e.timer = e.dashTime; }
  } else if (e.state === 'dash') {
    e.timer -= dt;
    e.x += e.facing * e.dashSpeed * dt;
    if (!e.attackDidHit) {
      const hx = hero.x + hero.width/2;
      if (Math.abs(hx - (e.x+e.width/2)) < 60 && Math.abs(hero.y - e.y) < 70) {
        out.enemyHit = { damage: e.damage + 4, fromX: e.x + e.width/2 };
        e.attackDidHit = true;
      }
    }
    if (e.timer <= 0) { e.state = 'recover'; e.timer = e.recover + 0.1; }
  } else if (e.state === 'sweepTele') {
    e.timer -= dt;
    if (e.timer <= 0) { e.state = 'sweep'; e.timer = e.sweepTime; e.attackDidHit = false; }
  } else if (e.state === 'sweep') {
    e.timer -= dt;
    if (!e.attackDidHit) {
      const hx = hero.x + hero.width/2;
      if (Math.abs(hx - ex) < e.range + 40 && Math.abs(hero.y - e.y) < 80) {
        out.enemyHit = { damage: e.damage + 2, fromX: ex };
        e.attackDidHit = true;
      }
    }
    if (e.timer <= 0) { e.state = 'recover'; e.timer = e.recover + 0.15; }
  } else if (e.state === 'slamTele') {
    e.timer -= dt;
    e.slamX = hero.x + hero.width/2; // track for warning marker
    if (e.timer <= 0) { e.state = 'slam'; e.timer = e.slamTime; e.attackDidHit = false; out.bossSlamImpact = { x: e.slamX }; }
  } else if (e.state === 'slam') {
    e.timer -= dt;
    if (!e.attackDidHit) {
      const hx = hero.x + hero.width/2;
      if (Math.abs(hx - e.slamX) < 110 && hero.y + hero.height >= FIELD.groundY - 20) {
        out.enemyHit = { damage: e.slamDamage, fromX: e.slamX };
        e.attackDidHit = true;
      }
    }
    if (e.timer <= 0) { e.state = 'recover'; e.timer = e.recover + 0.2; }
  } else if (e.state === 'telegraph') {
    e.timer -= dt;
    if (e.timer <= 0) { e.state = 'attack'; e.timer = e.attackTime; }
  } else if (e.state === 'attack') {
    e.timer -= dt;
    if (!e.attackDidHit) {
      const hx = hero.x + hero.width / 2;
      const facingOk = (e.facing === 1 ? hx >= ex : hx <= ex);
      if (facingOk && Math.abs(hx - ex) < e.range + hero.width * 0.4) {
        out.enemyHit = { damage: e.damage, fromX: ex };
        e.attackDidHit = true;
      }
    }
    if (e.timer <= 0) { e.state = 'recover'; e.timer = e.recover; }
  } else if (e.state === 'recover') {
    e.timer -= dt;
    if (e.timer <= 0) e.state = 'approach';
  }
  e.x = Math.max(10, Math.min(FIELD.width - e.width - 10, e.x));
}
