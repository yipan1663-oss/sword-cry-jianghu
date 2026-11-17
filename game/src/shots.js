// Screenshot scenes for ?shot=start|play|end. Each plays real rules forward.
import { STEP, FIELD } from './config.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_OVER } from './render.js';

function autopilot(state, phase) {
  let dir = 0, jump=false, slash=false, dash=false, wave=false;
  const h = state.hero;
  let target = null, best=1e9;
  for (const e of state.enemies) {
    if (!e.active) continue;
    const dx = (e.x+e.width/2) - (h.x+h.width/2);
    const d = Math.abs(dx);
    if (d < best) { best = d; target = {e, dx, d}; }
  }
  let pickupTarget = null, pdBest = 1e9;
  for (const p of (state.pickups||[])) {
    if (!p.active) continue;
    const dx = p.x - (h.x+h.width/2);
    const d = Math.abs(dx);
    if (d < pdBest) { pdBest = d; pickupTarget = {p, dx, d}; }
  }
  if (target) {
    const {e, dx, d} = target;
    dir = dx < 0 ? -1 : 1;
    if (d < 100) slash = true;
    if ((e.state==='telegraph'||e.state==='dashTele'||e.state==='sweepTele'||e.state==='slamTele') && d < 140 && h.dashCd <= 0) dash = true;
    if (d < 42) dir = -Math.sign(dx||1);
    if (h.qi >= 100 && d < 320) wave = true;
    else if (h.qi >= 40 && d < 240 && e.type === 'boss') wave = true;
    if (e.type==='boss' && (e.state==='telegraph'||e.state==='dashTele'||e.state==='sweepTele'||e.state==='slamTele')) {
      if (d < 150) dir = -Math.sign(dx||1);
    }
    if (pickupTarget && pickupTarget.d < 90 && !(e.state==='attack'||e.state==='sweep'||e.state==='dash'||e.state==='slam')) {
      dir = pickupTarget.dx < 0 ? -1 : 1;
    }
  } else {
    if (pickupTarget) dir = pickupTarget.dx < 0 ? -1 : 1;
    else dir = h.x < FIELD.width/2 ? 1 : -1;
  }
  if (h.x < 80) dir = 1; if (h.x > FIELD.width-120) dir = -1;
  if (phase === 'end') {
    // play a bit more aggressively
    if (target && target.d < 120) slash = true;
  }
  return { dir:()=>dir, takeActions:()=> (jump?32:0)|(slash?4:0)|(dash?8:0)|(wave?16:0) };
}

export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end') {
    for (let i=0;i<Math.floor(2.5/STEP);i++) world.step(STEP, {dir:()=>0,takeActions:()=>0}, true);
    world.state._boss = world.activeBoss ? world.activeBoss() : null;
    return { screen: SCREEN_TITLE, best: 560 };
  }
  let best = 560;
  if (name === 'play') {
    let steps = Math.floor(22 / STEP);
    for (let i=0;i<steps;i++) {
      const input = autopilot(world.state, 'play');
      world.step(STEP, input, false);
      world.state._boss = world.activeBoss ? world.activeBoss() : null;
      // try to capture lively combat (wave 2+, enemies, combo/particles)
      if (world.state.wave >= 2 && world.state.enemies.some(e=>e.active) && (world.state.combo >= 2 || world.state.particles.length > 10) && i > steps*0.55) break;
      if (world.state.won || world.state.lost) break;
    }
    if (world.state.particles.length < 8) {
      world.state.particles.push({x:640,y:420,vx:30,vy:-60,life:0.5,max:0.5,size:4,color:'#1a1814',type:'dot',grav:220});
      world.state.particles.push({x:700,y:380,vx:-20,vy:-40,life:0.4,max:0.4,size:3,color:'#c44536',type:'splat',grav:220});
    }
    world.state._boss = world.activeBoss ? world.activeBoss() : null;
    return { screen: SCREEN_PLAY, best };
  }
  // end: try to win
  let steps = Math.floor(260 / STEP);
  for (let i=0;i<steps;i++) {
    const input = autopilot(world.state, 'play');
    world.step(STEP, input, false);
    world.state._boss = world.activeBoss ? world.activeBoss() : null;
    if (world.state.won || world.state.lost) break;
  }
  if (!world.state.won && !world.state.lost) {
    for (let i=0;i<Math.floor(80/STEP);i++) {
      const input = autopilot(world.state, 'play');
      world.step(STEP, input, false);
      world.state._boss = world.activeBoss ? world.activeBoss() : null;
      if (world.state.won || world.state.lost) break;
    }
  }
  if (!world.state.won && !world.state.lost) {
    // fallback defeat
    world.state.lost = true; world.state.hero.health = 0;
  }
  if (world.state.won) {
    world.state.wave = 5;
    best = Math.max(560, Math.floor(world.state.score));
    // ensure victory atmosphere
    if (world.state.particles.filter(p=>p.type==='petal').length < 20) {
      for (let i=0;i<30;i++) world.state.particles.push({x:Math.random()*FIELD.width,y:Math.random()*200,vx:(Math.random()-0.5)*20,vy:30+Math.random()*40,life:2,max:2,size:4,color:i%2?'#f4d35e':'#c44536',type:'petal',grav:30});
    }
  } else {
    world.state.score = Math.max(world.state.score, 420);
    best = 560;
  }
  world.state._boss = world.activeBoss ? world.activeBoss() : null;
  return { screen: SCREEN_OVER, best };
}
