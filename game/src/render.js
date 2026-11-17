import { FIELD, PALETTE, UI, HERO, WAVES } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  let t = 0;
  const leaves = Array.from({length: 18}, (_,i)=>({x:(i*137)%FIELD.width,y:(i*83)%FIELD.height,s:12+((i*29)%18),v:12+((i*17)%20),w:20+((i*13)%30)}));

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    view.scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    view.x = (canvas.width - FIELD.width * view.scale) / 2;
    view.y = (canvas.height - FIELD.height * view.scale) / 2;
  }
  window.addEventListener('resize', resize);
  resize();

  function font(size, bold=false) { ctx.font = `${bold?'700 ':''}${size}px "Noto Serif SC","Source Han Serif SC","Songti SC",serif`; }

  function drawBackground(state, dt) {
    t += dt;
    // paper
    const g = ctx.createLinearGradient(0,0,0,FIELD.height);
    g.addColorStop(0, PALETTE.paper);
    g.addColorStop(1, PALETTE.paperDark);
    ctx.fillStyle = g; ctx.fillRect(0,0,FIELD.width,FIELD.height);
    // misty mountains
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#6b7a6a';
    mountain(80, 360, 420, 220);
    ctx.globalAlpha = 0.12; ctx.fillStyle = '#4f5a56';
    mountain(420, 340, 520, 260);
    mountain(900, 370, 460, 210);
    ctx.restore();
    // mist bands
    ctx.fillStyle = PALETTE.mist;
    for (let i=0;i<3;i++) {
      const y = 360 + i*60 + Math.sin(t*0.3+i)*8;
      ctx.fillRect(0,y,FIELD.width,40);
    }
    // bamboo
    for (let i=0;i<6;i++) drawBamboo(80 + i*210 + (i%2)*30, FIELD.groundY, 180 + (i%3)*30, i);
    // lanterns
    drawLantern(180, 180, 1); drawLantern(1080, 160, 0.9);
    // ground ink wash
    const gg = ctx.createLinearGradient(0, FIELD.groundY-40, 0, FIELD.height);
    gg.addColorStop(0,'rgba(26,24,20,0.05)'); gg.addColorStop(1,'rgba(26,24,20,0.35)');
    ctx.fillStyle = gg; ctx.fillRect(0, FIELD.groundY-40, FIELD.width, FIELD.height - FIELD.groundY + 40);
    ctx.strokeStyle = 'rgba(26,24,20,0.5)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, FIELD.groundY); ctx.lineTo(FIELD.width, FIELD.groundY); ctx.stroke();
    // falling leaves
    ctx.fillStyle = PALETTE.vermilion;
    for (const l of leaves) {
      l.y += l.v*dt; l.x += Math.sin(t*0.8 + l.w)*18*dt;
      if (l.y > FIELD.height+20) { l.y = -20; l.x = (l.x + 200) % FIELD.width; }
      ctx.save(); ctx.translate(l.x,l.y); ctx.rotate(Math.sin(t+l.w)*0.8);
      ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.ellipse(0,0,l.s*0.35,l.s*0.18,0,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
  function mountain(x, y, w, h) {
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x+w*0.3, y-h, x+w*0.55, y-h*0.45);
    ctx.quadraticCurveTo(x+w*0.8, y-h*0.8, x+w, y);
    ctx.closePath(); ctx.fill();
  }
  function drawBamboo(x, baseY, h, i) {
    ctx.save(); ctx.strokeStyle = 'rgba(47,122,94,0.35)'; ctx.lineWidth = 6; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(x, baseY); ctx.quadraticCurveTo(x+Math.sin(t*0.4+i)*6, baseY-h/2, x+Math.sin(t*0.4+i)*10, baseY-h); ctx.stroke();
    ctx.strokeStyle='rgba(31,86,66,0.25)'; ctx.lineWidth=2;
    for(let j=1;j<4;j++){ const yy=baseY - h*j/4; ctx.beginPath(); ctx.moveTo(x-6,yy); ctx.lineTo(x+6,yy); ctx.stroke(); }
    ctx.restore();
  }
  function drawLantern(x,y,s) {
    ctx.save(); ctx.translate(x,y); ctx.scale(s,s);
    ctx.strokeStyle='rgba(26,24,20,0.5)'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(0,-40); ctx.lineTo(0,0); ctx.stroke();
    ctx.fillStyle=PALETTE.vermilion; ctx.beginPath(); ctx.ellipse(0,25,22,28,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=PALETTE.gold; ctx.fillRect(-12,0,24,6); ctx.fillRect(-10,48,20,5);
    ctx.globalAlpha=0.25; ctx.fillStyle='#fff'; ctx.beginPath(); ctx.ellipse(-6,18,6,14,0,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function drawHero(h) {
    // afterimages
    for (const a of h._afterimages||[]) {
      ctx.save(); ctx.globalAlpha = Math.max(0, a.life/0.18)*0.25; ctx.fillStyle = '#1a1814';
      ctx.translate(a.x + HERO.width/2, a.y + HERO.height/2); ctx.scale(a.facing,1);
      bodyShape(-HERO.width/2,-HERO.height/2,HERO.width,HERO.height,true);
      ctx.restore();
    }
    ctx.save();
    ctx.globalAlpha = h.invuln>0 && Math.floor(h.invuln*12)%2===0 ? 0.35 : 1;
    ctx.translate(h.x + h.width/2, h.y + h.height/2);
    ctx.scale(h.facing, 1);
    // shadow
    ctx.fillStyle='rgba(26,24,20,0.2)'; ctx.beginPath(); ctx.ellipse(0, h.height/2+2, 26,6,0,0,Math.PI*2); ctx.fill();
    bodyShape(-h.width/2, -h.height/2, h.width, h.height, false);
    // sword
    ctx.strokeStyle = '#8f9aa3'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(10,-8); ctx.lineTo(48,-28 - (h.slashTimer>0?10:0)); ctx.stroke();
    ctx.strokeStyle = PALETTE.gold; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(8,-6); ctx.lineTo(14,-10); ctx.stroke();
    // slash arc
    if (h.slashTimer > 0) {
      ctx.strokeStyle='rgba(26,24,20,0.85)'; ctx.lineWidth=5; ctx.lineCap='round';
      ctx.beginPath(); ctx.arc(18, -10, 52, -0.9, 0.8); ctx.stroke();
      ctx.strokeStyle='rgba(244,239,225,0.7)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(18,-10,46,-0.8,0.7); ctx.stroke();
    }
    ctx.restore();
  }
  function bodyShape(x,y,w,h,ghost){
    // robe
    ctx.fillStyle = ghost ? '#1a1814' : '#24313a';
    ctx.beginPath(); ctx.moveTo(x+8,y+h*0.25); ctx.lineTo(x+w-6,y+h*0.22); ctx.lineTo(x+w+2,y+h); ctx.lineTo(x-2,y+h); ctx.closePath(); ctx.fill();
    if(!ghost){ ctx.fillStyle = PALETTE.vermilion; ctx.fillRect(x+10,y+h*0.55,w-18,5); }
    // head
    ctx.fillStyle = ghost ? '#1a1814' : '#e8d7bf';
    ctx.beginPath(); ctx.arc(x+w*0.45, y+h*0.12, 11, 0, Math.PI*2); ctx.fill();
    if(!ghost){ ctx.fillStyle='#1a1814'; ctx.fillRect(x+w*0.28,y+h*0.05,w*0.35,8); }
  }

  function drawEnemy(e) {
    const x=e.x, y=e.y, w=e.width, h=e.height;
    ctx.save();
    ctx.translate(x+w/2, y+h/2); ctx.scale(e.facing||1,1);
    const tele = e.state==='telegraph' || e.state==='dashTele' || e.state==='sweepTele';
    const flash = e.hitFlash>0 ? 0.7 : 0;
    // shadow
    ctx.fillStyle='rgba(26,24,20,0.18)'; ctx.beginPath(); ctx.ellipse(0,h/2, 22,5,0,0,Math.PI*2); ctx.fill();
    if (e.type==='boss') {
      ctx.fillStyle = flash ? '#d35' : '#2b2420';
      ctx.fillRect(-w/2,-h/2+10,w,h-10);
      ctx.fillStyle = PALETTE.vermilionDark; ctx.fillRect(-w/2,-h/2+28,w,8);
      ctx.fillStyle='#111'; ctx.beginPath(); ctx.arc(-2,-h/2+18,13,0,Math.PI*2); ctx.fill();
      ctx.fillStyle=PALETTE.gold; ctx.fillRect(-8,-h/2+16,16,3);
      // sword
      ctx.strokeStyle='#9aa'; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(10,-5); ctx.lineTo(60,-30); ctx.stroke();
      if (e.state==='sweep' || e.state==='sweepTele') { ctx.strokeStyle='rgba(196,69,54,0.6)'; ctx.lineWidth=6; ctx.beginPath(); ctx.arc(10,-5,70,-0.2,1.2); ctx.stroke(); }
    } else if (e.type==='spearman') {
      ctx.fillStyle = flash?'#d88':'#3b342c'; ctx.fillRect(-w/2,-h/2+10,w,h-10);
      ctx.fillStyle='#111'; ctx.beginPath(); ctx.arc(0,-h/2+16,11,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#6b4b2a'; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(e.range*0.85,-10); ctx.stroke();
      ctx.fillStyle='#bcc'; ctx.beginPath(); ctx.moveTo(e.range*0.85,-10); ctx.lineTo(e.range*0.85+16,-14); ctx.lineTo(e.range*0.85+16,-6); ctx.closePath(); ctx.fill();
    } else {
      ctx.fillStyle = flash?'#d88':'#3a3a3a'; ctx.fillRect(-w/2,-h/2+10,w,h-10);
      ctx.fillStyle='#111'; ctx.beginPath(); ctx.arc(0,-h/2+16,11,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#9aa'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(6,-2); ctx.lineTo(36,-18); ctx.stroke();
    }
    if (tele) {
      ctx.globalAlpha = 0.5 + 0.5*Math.sin(t*30);
      ctx.fillStyle = e.type==='boss'? PALETTE.vermilion : PALETTE.gold;
      ctx.beginPath(); ctx.arc(0, -h/2 - 18, 6, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function drawEffects(state) {
    // projectiles
    for (const p of state.projectiles) {
      ctx.save(); ctx.translate(p.x,p.y); ctx.scale(p.facing,1);
      ctx.strokeStyle=PALETTE.jade; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(0,0,18,-0.7,0.7); ctx.stroke();
      ctx.strokeStyle='rgba(247,243,232,0.8)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(-4,0,14,-0.6,0.6); ctx.stroke();
      ctx.restore();
    }
    // particles
    for (const p of state.particles) {
      ctx.globalAlpha = Math.max(0, p.life/p.max);
      ctx.fillStyle = p.color;
      if (p.type==='splat') { ctx.beginPath(); ctx.ellipse(p.x,p.y,p.size*1.4,p.size,0.3,0,Math.PI*2); ctx.fill(); }
      else { ctx.fillRect(p.x,p.y,p.size,p.size); }
    }
    ctx.globalAlpha = 1;
    // floats
    font(22,true); ctx.textAlign='center'; ctx.textBaseline='middle';
    for (const f of state.floats) { ctx.globalAlpha=Math.max(0,f.life/0.9); ctx.fillStyle=f.color; ctx.fillText(f.text,f.x,f.y); }
    ctx.globalAlpha = 1;
  }

  function drawHUD(state, best) {
    const h = state.hero;
    ctx.save();
    ctx.fillStyle = PALETTE.hudBg; roundRect(20,16,500,92,10); ctx.fill();
    // health
    bar(100,30,300,16, h.health/HERO.maxHealth, PALETTE.vermilion, `${UI.health}`);
    // qi
    bar(100,56,300,14, h.qi/HERO.qiMax, PALETTE.jade, `${UI.qi}`);
    font(16,true); ctx.fillStyle=PALETTE.white; ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillText(`${UI.score}: ${Math.floor(state.score)}`, 30, 86);
    ctx.fillText(`${UI.combo} x${state.combo}`, 210, 86);
    ctx.textAlign='right'; ctx.fillText(`${UI.wave}: ${state.wave}/${WAVES.length}`, 490, 86);
    // boss bar
    const boss = state._boss;
    if (boss) {
      ctx.fillStyle=PALETTE.hudBg; roundRect(340, FIELD.height-54, 600, 34, 8); ctx.fill();
      font(18,true); ctx.fillStyle=PALETTE.white; ctx.textAlign='center';
      ctx.fillText(UI.boss, 640, FIELD.height-37);
      bar(380, FIELD.height-30, 520, 10, boss.health/boss.maxHealth, PALETTE.vermilionDark, null);
    }
    ctx.restore();
  }
  function bar(x,y,w,h,ratio,color,label){
    ctx.fillStyle='rgba(247,243,232,0.25)'; roundRect(x,y,w,h,4); ctx.fill();
    ctx.fillStyle=color; roundRect(x,y,w*Math.max(0,Math.min(1,ratio)),h,4); ctx.fill();
    if(label){ font(16,true); ctx.fillStyle=PALETTE.white; ctx.textAlign='right'; ctx.textBaseline='middle'; ctx.fillText(label, x-8, y+h/2); }
  }
  function roundRect(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }

  function overlayPanel(lines, title, prompt) {
    ctx.fillStyle='rgba(243,236,216,0.88)';
    roundRect(290,120,700,480,16); ctx.fill();
    ctx.strokeStyle='rgba(26,24,20,0.5)'; ctx.lineWidth=3; ctx.stroke();
    ctx.textAlign='center'; ctx.textBaseline='middle';
    font(54,true); ctx.fillStyle=PALETTE.ink; ctx.fillText(title, 640, 190);
    font(24,false); ctx.fillStyle=PALETTE.inkSoft;
    let y = 260;
    for (const line of lines) { ctx.fillText(line, 640, y); y += 38; }
    if (prompt) { font(28,true); ctx.fillStyle=PALETTE.vermilion; ctx.fillText(prompt, 640, 545); }
  }

  function draw(state, screen, best, dt=1/60, muted=false) {
    ctx.save();
    ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle = '#1a1814';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    const sx = (Math.random()*2-1) * (state.shake||0);
    const sy = (Math.random()*2-1) * (state.shake||0);
    ctx.setTransform(view.scale,0,0,view.scale, view.x + sx, view.y + sy);
    drawBackground(state, dt);
    // attach afterimages for hero draw
    state.hero._afterimages = state.afterimages;
    drawHero(state.hero);
    for (const e of state.enemies) if (e.active) drawEnemy(e);
    drawEffects(state);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED || screen === SCREEN_OVER) drawHUD(state, best);
    if (screen === SCREEN_TITLE) {
      overlayPanel(UI.how, `${UI.title}  ${UI.subtitle}`, UI.start);
    } else if (screen === SCREEN_PAUSED) {
      ctx.fillStyle='rgba(26,24,20,0.35)'; ctx.fillRect(0,0,FIELD.width,FIELD.height);
      overlayPanel(['P/Esc 继续 Resume', 'M 静音切换 Mute ' + (muted?'On':'Off')], UI.paused, '');
    } else if (screen === SCREEN_OVER) {
      ctx.fillStyle='rgba(26,24,20,0.35)'; ctx.fillRect(0,0,FIELD.width,FIELD.height);
      const title = state.won ? UI.win : UI.lose;
      overlayPanel([
        `${UI.score}: ${Math.floor(state.score)}`,
        `最佳 Best: ${Math.floor(Math.max(best, state.score))}`,
      ], title, UI.fightAgain);
    }
    ctx.restore();
  }

  return { draw, resize };
}
