import { FIELD, PALETTE, UI, HERO, WAVES } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  let t = 0;
  const petals = Array.from({length: 40}, (_,i)=>({x:(i*97)%FIELD.width,y:(i*71)%FIELD.height,s:8+((i*29)%14),v:14+((i*17)%20),w:20+((i*13)%30),c:i%3,drift:(i%5)*0.7}));
  const dust = Array.from({length: 36}, (_,i)=>({x:(i*131)%FIELD.width,y:(i*53)%FIELD.height,s:1+((i*7)%3),v:4+((i*11)%8),a:0.15+((i%5)*0.05)}));
  const birds = Array.from({length: 5}, (_,i)=>({x:(i*260)%FIELD.width,y:90+(i%3)*35,s:18+((i*7)%10),spd:18+((i*9)%12),ph:i*1.3}));
  const decor = {
    tufts: Array.from({length: 18}, (_,i)=>({x: 30 + ((i*73)%1220), w: 10+((i*7)%10), h: 6+((i*5)%7)})),
    rocks: Array.from({length: 9}, (_,i)=>({x: 70 + ((i*149)%1140), w: 14+((i*11)%22), h: 7+((i*7)%10)})),
  };

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

  function font(size, bold=false) { ctx.font = `${bold?'700 ':''}${size}px "Noto Serif SC","STKaiti","KaiTi","Source Han Serif SC","Songti SC",serif`; }
  function roundRect(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }

  function drawBackground(state, dt, screen) {
    t += dt;
    const cam = state.cameraX || 0;
    const sunX = FIELD.width * 0.78;
    const sunY = 170;

    // sky gradient
    const sky = ctx.createLinearGradient(0,0,0,FIELD.height);
    sky.addColorStop(0, PALETTE.skyTop); sky.addColorStop(0.45, PALETTE.skyMid); sky.addColorStop(1, PALETTE.skyLow);
    ctx.fillStyle = sky; ctx.fillRect(0,0,FIELD.width,FIELD.height);

    // sun + bloom
    ctx.save();
    const sunR = 64;
    const bloom = ctx.createRadialGradient(sunX,sunY,10,sunX,sunY,180);
    bloom.addColorStop(0,'rgba(255,245,200,0.85)'); bloom.addColorStop(0.35,'rgba(255,210,120,0.35)'); bloom.addColorStop(1,'rgba(255,210,120,0)');
    ctx.fillStyle = bloom; ctx.fillRect(0,0,FIELD.width,FIELD.height);
    const sunG = ctx.createRadialGradient(sunX-12,sunY-12,8,sunX,sunY,sunR);
    sunG.addColorStop(0,'#fff6d8'); sunG.addColorStop(1, PALETTE.sun);
    ctx.fillStyle = sunG; ctx.beginPath(); ctx.arc(sunX,sunY,sunR,0,Math.PI*2); ctx.fill();
    ctx.restore();

    // god rays (subtle)
    ctx.save(); ctx.globalAlpha = 0.12; ctx.translate(sunX,sunY);
    for(let i=0;i<8;i++){
      const a = -Math.PI*0.2 + i*0.09 + Math.sin(t*0.2)*0.01;
      ctx.rotate(0.02);
      ctx.fillStyle = 'rgba(255,245,210,0.5)';
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*520, Math.sin(a)*520); ctx.lineTo(Math.cos(a+0.03)*520, Math.sin(a+0.03)*520); ctx.closePath(); ctx.fill();
    }
    ctx.restore();

    // birds
    for (const b of birds) {
      b.x += b.spd*dt; if (b.x > FIELD.width + 60) b.x = -60;
      const by = b.y + Math.sin(t*0.8 + b.ph)*6;
      ctx.strokeStyle = 'rgba(40,30,20,0.45)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(b.x-b.s*0.5, by); ctx.quadraticCurveTo(b.x-b.s*0.2, by-5, b.x, by);
      ctx.quadraticCurveTo(b.x+b.s*0.2, by-5, b.x+b.s*0.5, by); ctx.stroke();
    }

    // far mountains parallax
    drawMountainLayer(0.04, cam, 420, 170, '#5f6a63', 0.28);
    drawMountainLayer(0.08, cam, 360, 220, '#4a5550', 0.22);
    drawMountainLayer(0.14, cam, 300, 260, '#3f4a44', 0.18);

    // mist bands
    for (let i=0;i<5;i++) {
      const y = 280 + i*58 + Math.sin(t*0.25 + i*1.3)*10;
      const drift = Math.sin(t*0.12 + i)*40 - cam*0.12;
      ctx.fillStyle = i%2 ? 'rgba(245,238,220,0.18)' : 'rgba(245,238,220,0.12)';
      ctx.beginPath();
      ctx.ellipse(240 + i*180 + drift, y, 300, 24, 0, 0, Math.PI*2);
      ctx.ellipse(820 + i*50 - drift*0.5, y+12, 340, 20, 0, 0, Math.PI*2);
      ctx.fill();
    }

    // clouds
    for (let i=0;i<3;i++) {
      const baseY = 200 + i*70;
      const speed = 10 + i*4;
      const span = FIELD.width + 500;
      const off = (((t*speed - cam*0.2) % span) + span) % span - 250;
      ctx.save(); ctx.globalAlpha = 0.14 - i*0.02; ctx.fillStyle = '#fff6e8';
      for (let k=-1;k<=2;k++) {
        const cx = off + k*460;
        ctx.beginPath(); ctx.ellipse(cx, baseY, 190, 26, 0, 0, Math.PI*2);
        ctx.ellipse(cx+100, baseY-8, 150, 22, 0, 0, Math.PI*2);
        ctx.ellipse(cx-90, baseY+5, 130, 18, 0, 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }

    // bamboo forest layers
    drawBambooLayer(0.22, cam, 0.18, 140, 8);
    drawBambooLayer(0.35, cam, 0.28, 190, 7);
    drawBambooLayer(0.5, cam, 0.38, 240, 6);

    // bridge/path ground
    drawBridge(cam);

    // foreground grass / rocks (closer parallax feel via slight offset)
    const fgOff = -cam*0.6;
    for (const r of decor.rocks) {
      const x = r.x + fgOff;
      ctx.fillStyle = 'rgba(90,84,74,0.38)';
      ctx.beginPath(); ctx.ellipse(x, FIELD.groundY+3, r.w/2, r.h/2, 0, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = 'rgba(58,51,43,0.25)'; ctx.stroke();
      ctx.fillStyle = 'rgba(58,51,43,0.2)'; ctx.beginPath(); ctx.ellipse(x-3, FIELD.groundY, r.w*0.2, r.h*0.2, 0, 0, Math.PI*2); ctx.fill();
    }
    for (const gft of decor.tufts) {
      const x = gft.x + fgOff;
      ctx.strokeStyle = 'rgba(47,122,94,0.4)'; ctx.lineWidth = 2;
      for (let k=-1;k<=1;k++){
        ctx.beginPath(); ctx.moveTo(x + k*4, FIELD.groundY);
        ctx.quadraticCurveTo(x + k*6 + Math.sin(t + x*0.01)*1.5, FIELD.groundY - gft.h, x + k*2, FIELD.groundY - gft.h - 4);
        ctx.stroke();
      }
    }

    // floating dust motes
    for (const d of dust) {
      d.x += d.v*dt*0.3 + Math.sin(t*0.5 + d.y)*2*dt; d.y += Math.sin(t*0.3 + d.x*0.01)*2*dt;
      if (d.x > FIELD.width) d.x = 0; if (d.x < 0) d.x = FIELD.width;
      if (d.y < 120) d.y = FIELD.height-120; if (d.y > FIELD.height-80) d.y = 140;
      ctx.globalAlpha = d.a; ctx.fillStyle = '#fff4d8';
      ctx.beginPath(); ctx.arc(d.x, d.y, d.s, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // falling petals/leaves
    for (const l of petals) {
      l.y += l.v*dt; l.x += Math.sin(t*0.8 + l.w)*18*dt + 8*dt;
      if (l.y > FIELD.height+20) { l.y = -20; l.x = (l.x + 220) % FIELD.width; }
      ctx.save(); ctx.translate(l.x,l.y); ctx.rotate(Math.sin(t*1.2+l.w)*0.9);
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = l.c===0 ? PALETTE.vermilion : (l.c===1 ? '#d97b6c' : PALETTE.goldBright);
      ctx.beginPath(); ctx.ellipse(0,0,l.s*0.35,l.s*0.18,0,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }

    // vignette
    const vg = ctx.createRadialGradient(FIELD.width/2, FIELD.height*0.45, FIELD.height*0.2, FIELD.width/2, FIELD.height*0.5, FIELD.width*0.7);
    vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(20,12,8,0.28)');
    ctx.fillStyle = vg; ctx.fillRect(0,0,FIELD.width,FIELD.height);
    ctx.globalAlpha = 1;
  }

  function drawMountainLayer(speed, cam, baseY, h, color, alpha) {
    const off = -cam*speed;
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color;
    for (let k=-1;k<=2;k++) {
      const baseX = k*520 + (off % 520);
      ctx.beginPath(); ctx.moveTo(baseX, baseY+80);
      ctx.quadraticCurveTo(baseX+140, baseY-h, baseX+260, baseY-h*0.45);
      ctx.quadraticCurveTo(baseX+380, baseY-h*0.85, baseX+520, baseY+80);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  function drawBambooLayer(speed, cam, alpha, h, count) {
    const off = -cam*speed;
    for (let i=0;i<count;i++) {
      const x = ((i*180 + (i%2)*40 + off) % (FIELD.width+200)) - 100;
      if (x < -60 || x > FIELD.width+60) continue;
      ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = 'rgba(47,122,94,1)'; ctx.lineWidth = 5; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(x, FIELD.groundY); ctx.quadraticCurveTo(x+Math.sin(t*0.4+i)*5, FIELD.groundY-h/2, x+Math.sin(t*0.4+i)*8, FIELD.groundY-h); ctx.stroke();
      ctx.strokeStyle='rgba(31,86,66,0.8)'; ctx.lineWidth=2;
      for(let j=1;j<4;j++){ const yy=FIELD.groundY - h*j/4; ctx.beginPath(); ctx.moveTo(x-5,yy); ctx.lineTo(x+5,yy); ctx.stroke(); }
      // leaves
      ctx.strokeStyle='rgba(47,122,94,0.9)'; ctx.lineWidth=1.5;
      for(let l=0;l<3;l++){ const ly=FIELD.groundY-h+20+l*18; ctx.beginPath(); ctx.moveTo(x,ly); ctx.quadraticCurveTo(x+14,ly-6,x+24,ly-2); ctx.stroke(); }
      ctx.restore();
    }
  }
  function drawBridge(cam) {
    const y = FIELD.groundY;
    // stone path
    ctx.save();
    const stone = ctx.createLinearGradient(0,y-10,0,FIELD.height);
    stone.addColorStop(0,'#9a9486'); stone.addColorStop(1,'#6f685a');
    ctx.fillStyle = stone; ctx.fillRect(0,y,FIELD.width,FIELD.height-y);
    // stones
    ctx.strokeStyle = 'rgba(50,45,38,0.35)'; ctx.lineWidth = 2;
    for (let row=0; row<4; row++) {
      for (let col=-1; col<22; col++) {
        const ox = (row%2)*30 - (cam*0.7 % 60);
        const sx = col*60 + ox, sy = y + 4 + row*22, sw = 56, sh = 18;
        ctx.fillStyle = `rgba(${120+((col+row)%3)*8},${112+((col+row)%2)*6},${98},0.55)`;
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(sx,sy,sw,sh,4) : roundRect(sx,sy,sw,sh,4); ctx.fill();
        ctx.strokeRect(sx,sy,sw,sh);
      }
    }
    // moss patches
    for (let i=0;i<10;i++){ const mx = (i*137 - cam*0.7) % FIELD.width; ctx.fillStyle='rgba(60,90,60,0.18)'; ctx.beginPath(); ctx.ellipse((mx+FIELD.width)%FIELD.width, y+18+(i%3)*20, 18,6,0,0,Math.PI*2); ctx.fill(); }
    // wooden railings
    ctx.strokeStyle = '#5a3f28'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(0,y-2); ctx.lineTo(FIELD.width,y-2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,y-22); ctx.lineTo(FIELD.width,y-22); ctx.stroke();
    for (let i=-1;i<22;i++){
      const px = i*70 - (cam*0.7 % 70);
      ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(px,y); ctx.lineTo(px,y-26); ctx.stroke();
    }
    ctx.restore();
  }

  function drawHero(h, isTitle) {
    for (const a of h._afterimages||[]) {
      const maxLife = 0.22;
      ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, a.life/maxLife))*0.28;
      ctx.translate(a.x + h.width/2, a.y + h.height/2); ctx.scale(a.facing,1);
      heroFigure(h, true, 0);
      ctx.restore();
    }
    ctx.save();
    ctx.globalAlpha = h.invuln>0 && Math.floor(h.invuln*12)%2===0 ? 0.35 : 1;
    const lunge = h.lungeTimer>0 ? (h.lungeTimer/0.12) : 0;
    const walk = (h.onGround && Math.abs(h.vx)>10);
    const idle = (!walk && h.onGround && h.slashTimer<=0 && h.dashTimer<=0) ? Math.sin(t*2.4)*2.5 : 0;
    ctx.translate(h.x + h.width/2 + lunge*10, h.y + h.height/2 + idle*0.2);
    ctx.scale(h.facing, 1);
    ctx.rotate(lunge * 0.18);
    ctx.fillStyle='rgba(26,24,20,0.22)'; ctx.beginPath(); ctx.ellipse(-lunge*6, h.height/2+2 - idle*0.2, 26,6,0,0,Math.PI*2); ctx.fill();
    heroFigure(h, false, t, walk);
    // slash arc crescent
    if (h.slashTimer > 0) {
      const p = h.slashTimer/0.14;
      ctx.save(); ctx.globalAlpha = 0.6 + p*0.4;
      ctx.strokeStyle='rgba(255,250,230,0.95)'; ctx.lineWidth=7; ctx.lineCap='round';
      ctx.beginPath(); ctx.arc(20, -8, 62, -1.0 + (1-p)*0.3, 0.9); ctx.stroke();
      ctx.strokeStyle='rgba(26,24,20,0.75)'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(20,-8,56,-0.9+(1-p)*0.3,0.8); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
  function heroFigure(h, ghost, time, walk=false){
    const hh=h.height;
    const robe = ghost ? '#1a1814' : '#243a5a';
    const sash = ghost ? '#1a1814' : PALETTE.vermilion;
    const skin = ghost ? '#1a1814' : '#e8d7bf';
    const ink = ghost ? '#1a1814' : PALETTE.ink;
    const step = walk ? Math.sin(time*18)*6 : 0;
    const armSwing = walk ? Math.sin(time*18)*4 : 0;
    const sway = (!walk && !ghost) ? Math.sin(time*2.4)*1.8 : 0;
    const hurt = (h.invuln>0 && h.vy<0 && !ghost) ? -0.15 : 0;
    ctx.rotate(hurt);
    // robe
    ctx.fillStyle = robe;
    ctx.beginPath();
    ctx.moveTo(-11 + sway, -hh*0.12);
    ctx.lineTo(11 + sway, -hh*0.14);
    ctx.lineTo(17, hh*0.2);
    ctx.lineTo(13 + step*0.25, hh*0.5);
    ctx.lineTo(-13 - step*0.25, hh*0.5);
    ctx.lineTo(-15, hh*0.2);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-13 - step*0.25, hh*0.4);
    ctx.quadraticCurveTo(0, hh*0.54 + Math.abs(step)*0.2, 13 + step*0.25, hh*0.4);
    ctx.lineTo(15, hh*0.5); ctx.lineTo(-15, hh*0.5); ctx.closePath(); ctx.fill();
    if (!ghost) {
      ctx.strokeStyle = sash; ctx.lineWidth = 4; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(-8, hh*0.04); ctx.quadraticCurveTo(0, hh*0.11, 10, hh*0.07); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(2, hh*0.09); ctx.lineTo(5+Math.sin(time*2)*1, hh*0.3); ctx.stroke();
    }
    // legs alternating
    ctx.strokeStyle = robe; ctx.lineWidth = 5; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(-4, hh*0.2); ctx.lineTo(-9 - step, hh*0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5, hh*0.2); ctx.lineTo(11 + step, hh*0.5); ctx.stroke();
    // arms
    ctx.strokeStyle = skin; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-8, -hh*0.05); ctx.lineTo(-16 + armSwing*0.3, hh*0.12 - armSwing*0.2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, -hh*0.04); ctx.lineTo(16 - armSwing*0.2, hh*0.02 - (h.slashTimer>0?6:0)); ctx.stroke();
    // head
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(sway*0.5, -hh*0.24, 9.5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = ink; ctx.fillRect(-10, -hh*0.31, 20, 5);
    ctx.beginPath(); ctx.moveTo(-13, -hh*0.29); ctx.lineTo(13, -hh*0.29); ctx.lineTo(0, -hh*0.43); ctx.closePath(); ctx.fill();
    if (!ghost) { ctx.fillStyle = sash; ctx.fillRect(-2, -hh*0.32, 4, 3); }
    // sword
    const lift = h.slashTimer>0 ? 12 : 0;
    ctx.strokeStyle = ghost ? ink : '#c8d0d8'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(12, -hh*0.02); ctx.lineTo(48, -hh*0.32 - lift); ctx.stroke();
    ctx.strokeStyle = ghost ? ink : PALETTE.goldBright; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(16, -hh*0.06); ctx.stroke();
  }

  function drawEnemy(e) {
    const w=e.width, h=e.height;
    ctx.save();
    const lunge = (e.state==='attack' || e.state==='sweep' || e.state==='dash' || e.state==='slam') ? 8 : 0;
    const walk = e.active && e.state==='approach';
    const idle = (e.active && (e.state==='recover' || e.state==='telegraph' || e.state==='slamTele' || e.state==='sweepTele' || e.state==='dashTele')) ? Math.sin(t*2.2 + e.x*0.01)*1.5 : 0;
    const rear = e.rearBack>0 ? (e.rearBack/0.22) : 0;
    const rearShift = rear * (e.rearDir||-1) * 10;
    ctx.translate(e.x+w/2 + lunge*(e.facing||1) + rearShift + idle*0.3, e.y+h/2 + idle*0.2);
    ctx.scale(e.facing||1,1);
    ctx.rotate(rear * -0.18 + lunge*0.04);
    const tele = e.state==='telegraph' || e.state==='dashTele' || e.state==='sweepTele' || e.state==='slamTele';
    const flash = e.hitFlash>0 ? 1 : 0;
    ctx.fillStyle='rgba(26,24,20,0.18)'; ctx.beginPath(); ctx.ellipse(-rearShift*0.5, h/2 - idle*0.2, e.type==='boss'?26:20,5,0,0,Math.PI*2); ctx.fill();
    if (e.type==='boss') {
      drawBossFigure(w,h,flash,tele,e,walk);
      if (e.state==='sweep' || e.state==='sweepTele') { ctx.strokeStyle='rgba(196,69,54,0.6)'; ctx.lineWidth=6; ctx.beginPath(); ctx.arc(10,-5,70,-0.2,1.2); ctx.stroke(); }
    } else if (e.type==='spearman') {
      drawSpearmanFigure(w,h,flash,e,walk);
    } else {
      drawBanditFigure(w,h,flash,e,walk);
    }
    // slam warning marker drawn in world space in drawEffects, but keep tele flash
    if (e.hitWhite > 0) {
      ctx.save(); ctx.globalAlpha = Math.min(0.85, e.hitWhite/0.08); ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(0, -4, w*0.7, h*0.55, 0, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
    if (tele) {
      ctx.globalAlpha = 0.5 + 0.5*Math.sin(t*30);
      ctx.fillStyle = e.type==='boss'? PALETTE.vermilion : PALETTE.goldBright;
      ctx.beginPath(); ctx.arc(0, -h/2 - 18, 6, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function drawBanditFigure(w,h,flash,e,walk){
    const robe = flash ? '#c44536' : '#3a3a3a';
    const skin = '#d8c3a5';
    const ink = PALETTE.ink;
    const step = walk ? Math.sin(t*14 + e.x*0.02)*4 : 0;
    const atk = e.state==='attack' ? (1 - Math.max(0,e.timer)/(e.attackTime||0.18)) : 0;
    ctx.fillStyle = robe;
    ctx.beginPath(); ctx.moveTo(-10,-h*0.08); ctx.lineTo(10,-h*0.08); ctx.lineTo(13,h*0.5); ctx.lineTo(-13,h*0.5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = robe; ctx.lineWidth=4; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(-4,h*0.22); ctx.lineTo(-7-step,h*0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4,h*0.22); ctx.lineTo(7+step,h*0.5); ctx.stroke();
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(0,-h*0.22,9,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = ink; ctx.beginPath(); ctx.moveTo(-10,-h*0.26); ctx.quadraticCurveTo(0,-h*0.38,10,-h*0.26); ctx.quadraticCurveTo(0,-h*0.18, -10,-h*0.26); ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(8,-h*0.27); ctx.lineTo(14,-h*0.18); ctx.stroke();
    // blade
    const reach = e.range*0.85 + atk*12;
    ctx.strokeStyle = '#6b4b2a'; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(6,2); ctx.lineTo(reach-10,-4-atk*4); ctx.stroke();
    ctx.strokeStyle = '#cfd6db'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(reach-16,-5-atk*4); ctx.lineTo(reach,-8-atk*5); ctx.stroke();
    if (e.state==='dead') { ctx.globalAlpha=0.4; }
  }
  function drawSpearmanFigure(w,h,flash,e,walk){
    const robe = flash ? '#c44536' : '#46505a';
    const skin = '#d8c3a5';
    const step = walk ? Math.sin(t*12 + e.x*0.02)*4 : 0;
    const atk = e.state==='attack' ? (1 - Math.max(0,e.timer)/(e.attackTime||0.22)) : 0;
    ctx.fillStyle = robe;
    ctx.beginPath(); ctx.moveTo(-11,-h*0.1); ctx.lineTo(11,-h*0.1); ctx.lineTo(14,h*0.5); ctx.lineTo(-14,h*0.5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = robe; ctx.lineWidth=4; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(-4,h*0.22); ctx.lineTo(-8-step,h*0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4,h*0.22); ctx.lineTo(8+step,h*0.5); ctx.stroke();
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(0,-h*0.24,9,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = PALETTE.inkSoft; ctx.fillRect(-10,-h*0.31,20,6);
    const reach = e.range*0.9 + atk*18;
    ctx.strokeStyle = '#6b4b2a'; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(4,0); ctx.lineTo(reach-18,-6-atk*2); ctx.stroke();
    ctx.fillStyle = '#d7dee3'; ctx.beginPath(); ctx.moveTo(reach-18,-6-atk*2); ctx.lineTo(reach,-10-atk*2); ctx.lineTo(reach-18, -2-atk*2); ctx.closePath(); ctx.fill();
  }
  function drawBossFigure(w,h,flash,tele,e,walk){
    const robe = flash ? '#d84a3d' : '#2b2420';
    const skin = '#d8c3a5';
    const step = walk ? Math.sin(t*10 + e.x*0.02)*5 : 0;
    const slamWind = e.state==='slam' ? 1 : 0;
    ctx.fillStyle = robe;
    ctx.beginPath(); ctx.moveTo(-17,-h*0.04); ctx.lineTo(17,-h*0.04); ctx.lineTo(22,h*0.5); ctx.lineTo(-22,h*0.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = PALETTE.vermilion; ctx.fillRect(-20, h*0.0, 40, 8);
    ctx.strokeStyle = PALETTE.vermilionDark; ctx.lineWidth=3; ctx.strokeRect(-17,-h*0.04,34,h*0.54);
    ctx.strokeStyle = robe; ctx.lineWidth=6; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(-6,h*0.25); ctx.lineTo(-11-step,h*0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(6,h*0.25); ctx.lineTo(11+step,h*0.5); ctx.stroke();
    ctx.strokeStyle = skin; ctx.lineWidth=5;
    ctx.beginPath(); ctx.moveTo(-12,-h*0.02); ctx.lineTo(-22,h*0.18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(12,-h*0.02); ctx.lineTo(24,h*0.06 + slamWind*10); ctx.stroke();
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(0,-h*0.22,13,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = PALETTE.ink; ctx.fillRect(-14,-h*0.27,28,8);
    ctx.fillStyle = PALETTE.goldBright; ctx.fillRect(-6,-h*0.25,12,4);
    // heavy weapon (guan dao-ish)
    ctx.save(); ctx.rotate(slamWind*0.8 - (e.state==='slamTele'?0.4:0));
    ctx.strokeStyle = '#7a5a2a'; ctx.lineWidth=6; ctx.beginPath(); ctx.moveTo(10,0); ctx.lineTo(34,-12); ctx.stroke();
    ctx.fillStyle = '#c3ccd2';
    ctx.beginPath(); ctx.moveTo(32,-14); ctx.lineTo(74,-36); ctx.lineTo(82,-22); ctx.lineTo(40,-4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = PALETTE.vermilionDark; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(38,-10); ctx.lineTo(74,-30); ctx.stroke();
    ctx.restore();
  }

  function drawEffects(state) {
    // slam warning for boss
    const boss = state._boss;
    if (boss && boss.state === 'slamTele') {
      const x = boss.slamX || (boss.x + boss.width/2);
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.35*Math.sin(t*30);
      const rg = ctx.createRadialGradient(x, FIELD.groundY, 10, x, FIELD.groundY, 120);
      rg.addColorStop(0,'rgba(255,80,40,0.7)'); rg.addColorStop(1,'rgba(255,80,40,0)');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.ellipse(x, FIELD.groundY-4, 120, 26, 0, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = 'rgba(196,69,54,0.9)'; ctx.lineWidth = 4; ctx.setLineDash([12,8]);
      ctx.beginPath(); ctx.ellipse(x, FIELD.groundY-4, 110, 22, 0, 0, Math.PI*2); ctx.stroke();
      ctx.restore();
    }

    // projectiles
    for (const p of state.projectiles) {
      ctx.save(); ctx.translate(p.x,p.y); ctx.scale(p.facing,1);
      ctx.strokeStyle=PALETTE.jade; ctx.lineWidth=5; ctx.beginPath(); ctx.arc(0,0,20,-0.7,0.7); ctx.stroke();
      ctx.strokeStyle='rgba(247,243,232,0.85)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(-4,0,15,-0.6,0.6); ctx.stroke();
      ctx.restore();
    }
    // particles
    for (const p of state.particles) {
      ctx.globalAlpha = Math.max(0, p.life/p.max);
      ctx.fillStyle = p.color;
      if (p.type==='splat') { ctx.beginPath(); ctx.ellipse(p.x,p.y,p.size*1.5,p.size*1.05,0.3,0,Math.PI*2); ctx.fill(); }
      else if (p.type==='petal') { ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.life*3); ctx.beginPath(); ctx.ellipse(0,0,p.size*0.6,p.size*0.25,0,0,Math.PI*2); ctx.fill(); ctx.restore(); }
      else { ctx.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size); }
    }
    ctx.globalAlpha = 1;
    // pickups
    for (const p of state.pickups||[]) {
      if (!p.active) continue;
      const y = p.y + Math.sin(p.bob || 0)*4;
      const fade = p.life < 1.5 ? Math.max(0.2, p.life/1.5) : 1;
      ctx.save(); ctx.globalAlpha = 0.95 * fade; ctx.translate(p.x, y);
      if (p.type === 'qi') {
        const rg = ctx.createRadialGradient(-3,-4,2,0,0,18); rg.addColorStop(0,'#9ef0c8'); rg.addColorStop(1, PALETTE.jade);
        ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0,0,14,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='rgba(247,243,232,0.8)'; ctx.lineWidth=2; ctx.stroke();
        ctx.fillStyle='rgba(247,243,232,0.95)'; font(12,true); ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('气',0,1);
      } else {
        const rg = ctx.createRadialGradient(-3,-4,2,0,0,18); rg.addColorStop(0,'#f2b0a8'); rg.addColorStop(1, PALETTE.vermilion);
        ctx.fillStyle = rg; ctx.beginPath(); ctx.ellipse(0,0,14,11,0,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='rgba(247,243,232,0.8)'; ctx.lineWidth=2; ctx.stroke();
        ctx.fillStyle='rgba(247,243,232,0.95)'; font(14,true); ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('+',0,1);
      }
      ctx.restore();
    }
    // floats
    ctx.textAlign='center'; ctx.textBaseline='middle';
    for (const f of state.floats) {
      const a = Math.max(0, f.life/(f.max||0.9));
      ctx.globalAlpha = a;
      const sz = f.size || 24;
      font(sz, true);
      ctx.lineWidth = Math.max(2, sz/8);
      ctx.strokeStyle = 'rgba(243,236,216,0.7)';
      ctx.strokeText(f.text,f.x,f.y);
      ctx.fillStyle=f.color; ctx.fillText(f.text,f.x,f.y);
    }
    ctx.globalAlpha = 1;

    // ultimate effect overlay in world space
    if (state.ultimateWave) {
      const p = state.ultimateWave.t / state.ultimateWave.life;
      const x = state.ultimateWave.x + p*120;
      ctx.save(); ctx.globalAlpha = (1-p)*0.8;
      const grad = ctx.createLinearGradient(0,0,FIELD.width,0);
      grad.addColorStop(0,'rgba(255,245,200,0)'); grad.addColorStop(0.4,'rgba(255,240,180,0.45)'); grad.addColorStop(0.5,'rgba(255,255,255,0.9)'); grad.addColorStop(0.6,'rgba(255,240,180,0.45)'); grad.addColorStop(1,'rgba(255,245,200,0)');
      ctx.fillStyle = grad; ctx.fillRect(0,0,FIELD.width,FIELD.height);
      ctx.strokeStyle = 'rgba(255,250,220,0.95)'; ctx.lineWidth = 18*(1-p)+4;
      ctx.beginPath(); ctx.arc(x, FIELD.groundY-120, 120 + p*420, -0.6, 0.6); ctx.stroke();
      ctx.strokeStyle = 'rgba(212,160,23,0.8)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(x, FIELD.groundY-120, 90 + p*420, -0.55, 0.55); ctx.stroke();
      ctx.restore();
    }
  }

  function bar(x,y,w,h,ratio,color,label){
    ctx.fillStyle='rgba(247,243,232,0.25)'; roundRect(x,y,w,h,4); ctx.fill();
    ctx.fillStyle=color; roundRect(x,y,w*Math.max(0,Math.min(1,ratio)),h,4); ctx.fill();
    if(label){ font(16,true); ctx.fillStyle=PALETTE.white; ctx.textAlign='right'; ctx.textBaseline='middle'; ctx.fillText(label, x-8, y+h/2); }
  }

  function drawHUD(state, best) {
    const h = state.hero;
    ctx.save();
    ctx.fillStyle = PALETTE.hudBg; roundRect(20,16,520,96,10); ctx.fill();
    bar(110,30,300,16, h.health/HERO.maxHealth, PALETTE.vermilion, `${UI.health}`);
    bar(110,56,300,14, h.qi/HERO.qiMax, PALETTE.jade, `${UI.qi}`);
    if (h.qi >= HERO.qiMax) {
      ctx.fillStyle = 'rgba(244,211,94,0.9)'; font(14,true); ctx.textAlign='left'; ctx.fillText('L: 剑啸九天', 420, 63);
    } else {
      ctx.fillStyle = 'rgba(247,243,232,0.75)'; font(14,false); ctx.textAlign='left'; ctx.fillText('L: 剑气', 420, 63);
    }
    font(16,true); ctx.fillStyle=PALETTE.white; ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillText(`${UI.score}: ${Math.floor(state.score)}`, 30, 88);
    ctx.fillText(`${UI.combo} x${state.combo}`, 220, 88);
    ctx.textAlign='right'; ctx.fillText(`${UI.wave}: ${state.wave}/${WAVES.length}`, 510, 88);
    const boss = state._boss;
    if (boss) {
      ctx.fillStyle=PALETTE.hudBg; roundRect(320, FIELD.height-58, 640, 38, 8); ctx.fill();
      font(18,true); ctx.fillStyle=PALETTE.goldBright; ctx.textAlign='center';
      ctx.fillText(`${UI.boss} · 蒙面剑客`, 640, FIELD.height-39);
      bar(360, FIELD.height-30, 560, 12, boss.health/boss.maxHealth, PALETTE.vermilionDark, null);
    }
    ctx.restore();
  }

  function drawSeal(x,y,scale=1) {
    ctx.save(); ctx.translate(x,y); ctx.scale(scale,scale); ctx.rotate(-0.12);
    ctx.fillStyle = 'rgba(196,69,54,0.9)';
    ctx.beginPath(); ctx.moveTo(-22,-18); ctx.lineTo(20,-22); ctx.lineTo(24,20); ctx.lineTo(-18,22); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(120,30,20,0.8)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(247,243,232,0.9)'; font(18,true); ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('剑', -4, -2); ctx.fillText('啸', 8, 6);
    ctx.restore();
  }

  function drawTitleScreen(state, best) {
    // cinematic hero on bridge
    const hero = state.hero;
    hero.x = FIELD.width*0.34; hero.y = FIELD.groundY - hero.height; hero.facing = 1; hero.vx = 0; hero.onGround = true; hero.slashTimer = 0; hero.dashTimer = 0; hero._afterimages = [];
    drawHero(hero, true);
    // mist overlay foreground
    ctx.save(); ctx.fillStyle='rgba(245,238,220,0.12)';
    ctx.beginPath(); ctx.ellipse(260, FIELD.groundY-20, 260, 40, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(980, FIELD.groundY-10, 320, 34, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    // title panel
    ctx.save();
    ctx.fillStyle = 'rgba(243,236,216,0.72)';
    roundRect(520, 70, 700, 520, 18); ctx.fill();
    ctx.strokeStyle = 'rgba(80,50,30,0.35)'; ctx.lineWidth = 2; ctx.stroke();

    // calligraphy title
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.save();
    ctx.shadowColor = 'rgba(20,10,5,0.35)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
    font(96,true); ctx.fillStyle = '#2b2118'; ctx.fillText(UI.title, 860, 170);
    ctx.restore();
    drawSeal(1045, 130, 1.3);
    font(30,false); ctx.fillStyle = PALETTE.inkSoft; ctx.fillText(UI.subtitle, 860, 235);
    font(24,false); ctx.fillStyle = PALETTE.vermilionDark; ctx.fillText(UI.story, 860, 280);

    // controls panel
    ctx.fillStyle = 'rgba(26,24,20,0.06)'; roundRect(610, 305, 500, 210, 12); ctx.fill();
    font(22,false); ctx.fillStyle = PALETTE.ink;
    let y = 338;
    for (const line of UI.how) { ctx.fillText(line, 860, y); y += 32; }

    // start prompt
    const pulse = 0.85 + 0.15*Math.sin(t*4);
    ctx.globalAlpha = pulse;
    font(34,true); ctx.fillStyle = PALETTE.vermilion; ctx.fillText(UI.start, 860, 555);
    ctx.globalAlpha = 1;
    font(18,false); ctx.fillStyle = PALETTE.inkSoft; ctx.fillText(`最佳 Best: ${Math.floor(best||0)}`, 860, 515);
    ctx.restore();
  }

  function drawOverlayScreen(state, screen, best, muted) {
    if (screen === SCREEN_PAUSED) {
      ctx.fillStyle='rgba(26,24,20,0.35)'; ctx.fillRect(0,0,FIELD.width,FIELD.height);
      ctx.fillStyle='rgba(243,236,216,0.9)'; roundRect(360,180,560,320,16); ctx.fill();
      ctx.textAlign='center'; ctx.textBaseline='middle';
      font(46,true); ctx.fillStyle=PALETTE.ink; ctx.fillText(UI.paused, 640, 250);
      font(24,false); ctx.fillStyle=PALETTE.inkSoft; ctx.fillText('P/Esc 继续 Resume', 640, 330);
      ctx.fillText('M 静音切换 Mute ' + (muted?'On':'Off'), 640, 370);
      return;
    }
    if (screen === SCREEN_OVER) {
      ctx.fillStyle = state.won ? 'rgba(30,20,10,0.28)' : 'rgba(26,24,20,0.4)';
      ctx.fillRect(0,0,FIELD.width,FIELD.height);
      const won = state.won;
      const title = won ? UI.win : UI.lose;
      ctx.save();
      ctx.fillStyle = won ? 'rgba(252,245,225,0.92)' : 'rgba(243,236,216,0.9)';
      roundRect(260,120,760,460,18); ctx.fill();
      ctx.strokeStyle = won ? 'rgba(212,160,23,0.9)' : 'rgba(26,24,20,0.5)';
      ctx.lineWidth = won ? 5 : 3; ctx.stroke();
      if (won) {
        ctx.strokeStyle = 'rgba(244,211,94,0.7)'; ctx.lineWidth = 2; roundRect(275,135,730,430,14); ctx.stroke();
      }
      ctx.textAlign='center'; ctx.textBaseline='middle';
      font(54,true); ctx.fillStyle = won ? '#7a4a00' : PALETTE.ink; ctx.fillText(title, 640, 200);
      const lines = won ? [
        `${UI.score}: ${Math.floor(state.score)}`,
        `最佳 Best: ${Math.floor(Math.max(best, state.score))}`,
        `${UI.wave}: 5/5`,
      ] : [
        `${UI.score}: ${Math.floor(state.score)}`,
        `最佳 Best: ${Math.floor(Math.max(best, state.score))}`,
      ];
      font(28,false); ctx.fillStyle = PALETTE.inkSoft;
      let y = 300;
      for (const line of lines) { ctx.fillText(line, 640, y); y += 46; }
      font(30,true); ctx.fillStyle = won ? PALETTE.goldBright : PALETTE.vermilion; ctx.fillText(UI.fightAgain, 640, 520);
      if (won) { drawSeal(930, 210, 1.1); }
      ctx.restore();
    }
  }

  function drawScreenFx(state) {
    if (state.ultimateFlash > 0) {
      ctx.save(); ctx.globalAlpha = Math.min(1, state.ultimateFlash*5) * 0.7;
      ctx.fillStyle = '#fffef8'; ctx.fillRect(0,0,FIELD.width,FIELD.height);
      ctx.restore();
    }
    if (state.redVignette > 0) {
      ctx.save(); ctx.globalAlpha = Math.min(0.7, state.redVignette*1.8);
      const rg = ctx.createRadialGradient(FIELD.width/2, FIELD.height/2, FIELD.height*0.2, FIELD.width/2, FIELD.height/2, FIELD.width*0.75);
      rg.addColorStop(0,'rgba(120,0,0,0)'); rg.addColorStop(1,'rgba(160,20,10,0.7)');
      ctx.fillStyle = rg; ctx.fillRect(0,0,FIELD.width,FIELD.height);
      ctx.restore();
    }
    if (state.goldFlash > 0) {
      ctx.save(); ctx.globalAlpha = Math.min(0.45, state.goldFlash*0.9);
      ctx.fillStyle = '#fff3c4'; ctx.fillRect(0,0,FIELD.width,FIELD.height);
      ctx.restore();
    }
  }

  function draw(state, screen, best, dt=1/60, muted=false) {
    ctx.save();
    ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle = '#1a1814';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    const sx = (Math.random()*2-1) * (state.shake||0);
    const sy = (Math.random()*2-1) * (state.shake||0);
    ctx.setTransform(view.scale,0,0,view.scale, view.x + sx, view.y + sy);
    drawBackground(state, dt, screen);

    state.hero._afterimages = state.afterimages || [];
    if (screen === SCREEN_TITLE) {
      drawTitleScreen(state, best);
    } else {
      drawHero(state.hero, false);
      for (const e of state.enemies) if (e.active || e.hitFlash>0 || (e.hitWhite||0)>0 || (e.rearBack||0)>0) drawEnemy(e);
      drawEffects(state);
      drawHUD(state, best);
      drawOverlayScreen(state, screen, best, muted);
    }
    drawScreenFx(state);
    ctx.restore();
  }

  return { draw, resize };
}
