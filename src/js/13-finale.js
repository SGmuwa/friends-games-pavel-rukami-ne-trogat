/* ═════════════════════════════════════════════════════════════════════
   13. ФИНАЛЬНЫЕ ЭКРАНЫ
   ═════════════════════════════════════════════════════════════════════ */
function updateFinale(dt){
  G.finaleT += dt;
  if(G.shout && G.shout.age<G.shout.life) G.shout.age += dt;
  const held = G.finaleT < (G.finaleHold||0);   // продавец ещё говорит

  if(G.outcome==='win'){
    if(!held && !G.musicStarted){
      G.musicStarted = true;
      Sound.playMusic('fireworks');
      for(let i=0;i<4;i++) setTimeout(launchFirework, i*220);
    }
    if(!held && Math.random() < dt*3.2) launchFirework();
    for(const f of G.fireworks){
      f.age+=dt;
      for(const s of f.sparks){
        s.x+=s.vx*dt; s.y+=s.vy*dt; s.vy+=150*dt; s.vx*=0.985; s.vy*=0.985;
      }
    }
    G.fireworks = G.fireworks.filter(f=>f.age<f.life);
  }else{
    for(const c of G.crows){
      c.t+=dt;
      c.y = c.baseY + Math.sin(c.t*1.6+c.ph)*H*0.004;
    }
    // Каркают две минуты, каждый раз случайная запись из пула — но только
    // после того, как продавец договорит «Я разорён». Игрок волен уйти на
    // статистику сразу, а волен и досидеть до конца.
    const t = G.finaleT - (G.finaleHold||0);
    if(t>0.2 && t>=G.crowNext && t<CROW_CAW_SECONDS){
      const k = clamp(t/CROW_CAW_SECONDS, 0, 1);   // 0 в начале → 1 к концу
      cawOnce(lerp(CROW_VOL[0], CROW_VOL[1], k));
      G.crowNext = t + lerp(CROW_GAP[0], CROW_GAP[1], k)*rnd(0.85, 1.15);
    }
  }
}

// Карканье: crow0 — настоящая серая ворона (Wikimedia, public domain),
// crow1/crow2 — записи заказчика. Тянем случайную, подряд не повторяем.
// Записи по 7–9 секунд, так что карканья местами накладываются — это и даёт
// ощущение стаи. Ручки храним, чтобы оборвать хор, когда игрок уйдёт с экрана.
const cawVoices = [];
function cawOnce(vol){
  const h = Sound.play(pickLine('crow'), {vol, rate:rnd(0.93,1.07)});
  if(!h) return;
  cawVoices.push(h);
  h.src.onended = ()=>{ const i=cawVoices.indexOf(h); if(i>=0) cawVoices.splice(i,1); };
}
// Гасим не резко: обрыв буфера на полуслове щёлкает в колонках.
function stopCaws(){
  while(cawVoices.length){
    const h = cawVoices.pop();
    try{
      const t = Sound.ctx.currentTime;
      h.gain.gain.cancelScheduledValues(t);
      h.gain.gain.setValueAtTime(h.gain.gain.value, t);
      h.gain.gain.linearRampToValueAtTime(0.0001, t+0.25);
      h.src.stop(t+0.3);
    }catch(e){ try{ h.src.stop(); }catch(e2){} }
  }
}

function launchFirework(){
  const x=rnd(W*0.12,W*0.88), y=rnd(H*0.08,H*0.42);
  const hue=rint(0,360), n=rint(26,44);
  const sparks=[];
  for(let i=0;i<n;i++){
    const a=(i/n)*6.2832+rnd(-0.1,0.1), sp=rnd(70,260);
    sparks.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,
      c:`hsl(${(hue+rint(-25,25))%360} 95% ${rint(55,75)}%)`});
  }
  G.fireworks.push({sparks,age:0,life:rnd(1.6,2.6)});
  Sound.boom();
}

function drawFinale(){
  if(G.outcome==='win') drawWinScene(); else drawLoseScene();
  drawShout(H*0.30);   // произнесённую фразу надо и прочитать
}

function drawWinScene(){
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#0d1030'); g.addColorStop(0.55,'#241a3a'); g.addColorStop(1,'#2c2118');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);

  for(const f of G.fireworks){
    const k=1-f.age/f.life;
    ctx.save(); ctx.globalAlpha=clamp(k*1.4,0,1);
    for(const s of f.sparks){
      ctx.fillStyle=s.c;
      ctx.beginPath(); ctx.arc(s.x,s.y,Math.max(1.5,H*0.005*k+1),0,6.2832); ctx.fill();
    }
    ctx.restore();
  }

  // Продавец спиной, прыгает, по пучку в каждой руке.
  // Рисуется ДО прилавка — иначе ноги оказываются перед ним.
  const jump = Math.abs(Math.sin(G.finaleT*3.4));
  const feet = H*0.99 - jump*H*0.07;
  const h    = H*0.52;
  const x    = W*0.5;
  const bodyW= h*0.25;
  const shY  = feet-h*0.79, hipY=feet-h*0.44, headY=feet-h*0.90, headR=h*0.088;

  ctx.save();
  ctx.lineJoin='round'; ctx.lineCap='round';
  ctx.strokeStyle='#231a12'; ctx.lineWidth=Math.max(2,h*0.018);

  ctx.fillStyle='#3f4f66';
  for(const s of [-1,1]){
    ctx.beginPath();
    ctx.roundRect(x+s*bodyW*0.30-bodyW*0.17, hipY, bodyW*0.34, feet-hipY, bodyW*0.15);
    ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle='#7a5a34';
  ctx.beginPath();
  ctx.roundRect(x-bodyW, shY, bodyW*2, hipY-shY+h*0.06, bodyW*0.35);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle='#5d4426';
  ctx.fillRect(x-bodyW, hipY-h*0.03, bodyW*2, h*0.035);

  // поднятые руки
  ctx.strokeStyle='#7a5a34'; ctx.lineWidth=bodyW*0.42;
  const handY = shY - h*0.30 - jump*h*0.05;
  for(const s of [-1,1]){
    const hx = x+s*bodyW*1.5;
    ctx.beginPath();
    ctx.moveTo(x+s*bodyW*0.75, shY+h*0.05);
    ctx.quadraticCurveTo(x+s*bodyW*1.5, shY-h*0.05, hx, handY);
    ctx.stroke();
    ctx.fillStyle='#e0b189';
    ctx.beginPath(); ctx.arc(hx, handY, bodyW*0.28, 0, 6.2832); ctx.fill();
    drawBundle(hx, handY-h*0.02, h*0.16, false);
  }

  ctx.fillStyle='#d9a878';
  ctx.beginPath(); ctx.arc(x, headY, headR, 0, 6.2832); ctx.fill();
  ctx.strokeStyle='#231a12'; ctx.lineWidth=Math.max(2,h*0.018); ctx.stroke();
  ctx.fillStyle='#3a2a1c';
  ctx.beginPath();
  ctx.ellipse(x, headY-headR*0.1, headR*1.08, headR*0.98, 0, Math.PI, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(x-headR*1.0, headY-headR*0.3, headR*2.0, headR*1.1, headR*0.4);
  ctx.fill();
  ctx.restore();

  drawCounter();

  ctx.save();
  ctx.textAlign='center';
  const fs=Math.max(24,H*0.075);
  ctx.font=`800 ${fs}px "PT Sans",Verdana,sans-serif`;
  ctx.lineWidth=Math.max(4,fs*0.14); ctx.strokeStyle='#1a120c';
  ctx.strokeText('СМЕНА ОТРАБОТАНА!', W*0.5, H*0.16);
  ctx.fillStyle='#ffd257';
  ctx.fillText('СМЕНА ОТРАБОТАНА!', W*0.5, H*0.16);
  ctx.restore();
}

function drawLoseScene(){
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#161310'); g.addColorStop(0.5,'#2a241c'); g.addColorStop(1,'#1d1812');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);

  // пустая верёвка
  ctx.strokeStyle='#6b5a3f'; ctx.lineWidth=Math.max(2,H*0.005);
  ctx.beginPath();
  ctx.moveTo(0,ropeY()); ctx.quadraticCurveTo(W*0.5, ropeY()+H*0.03, W, ropeY());
  ctx.stroke();

  // Продавец спиной, руки висят. Тоже до прилавка — ноги за ним.
  const feet=H*0.99, h=H*0.50, x=W*0.5, bodyW=h*0.25;
  const shY=feet-h*0.79, hipY=feet-h*0.44, headY=feet-h*0.90, headR=h*0.088;
  ctx.save();
  ctx.lineJoin='round'; ctx.lineCap='round';
  ctx.strokeStyle='#1b1510'; ctx.lineWidth=Math.max(2,h*0.018);
  ctx.fillStyle='#31404f';
  for(const s of [-1,1]){
    ctx.beginPath();
    ctx.roundRect(x+s*bodyW*0.30-bodyW*0.17, hipY, bodyW*0.34, feet-hipY, bodyW*0.15);
    ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle='#5e4527';
  ctx.beginPath();
  ctx.roundRect(x-bodyW, shY, bodyW*2, hipY-shY+h*0.06, bodyW*0.35);
  ctx.fill(); ctx.stroke();
  // Руки висят плетьми, но кисти держим над кромкой прилавка — иначе безрукий силуэт.
  const handY = Math.min(hipY + h*0.10, counterY() - h*0.05);
  ctx.strokeStyle='#5e4527'; ctx.lineWidth=bodyW*0.42;
  for(const s of [-1,1]){
    ctx.beginPath();
    ctx.moveTo(x+s*bodyW*0.75, shY+h*0.05);
    ctx.quadraticCurveTo(x+s*bodyW*1.25, hipY-h*0.02, x+s*bodyW*1.15, handY);
    ctx.stroke();
    ctx.fillStyle='#b48a68';
    ctx.beginPath(); ctx.arc(x+s*bodyW*1.15, handY, bodyW*0.27, 0, 6.2832); ctx.fill();
  }
  ctx.fillStyle='#b48a68';
  ctx.beginPath(); ctx.arc(x, headY, headR, 0, 6.2832); ctx.fill();
  ctx.strokeStyle='#1b1510'; ctx.lineWidth=Math.max(2,h*0.018); ctx.stroke();
  ctx.fillStyle='#2e2116';
  ctx.beginPath();
  ctx.ellipse(x, headY-headR*0.1, headR*1.08, headR*0.98, 0, Math.PI, 0); ctx.fill();
  ctx.beginPath();
  ctx.roundRect(x-headR*1.0, headY-headR*0.3, headR*2.0, headR*1.1, headR*0.4); ctx.fill();
  ctx.restore();

  drawCounter();
  for(const c of G.crows) drawCrow(c);

  ctx.save();
  ctx.textAlign='center';
  const fs=Math.max(22,H*0.068);
  ctx.font=`800 ${fs}px "PT Sans",Verdana,sans-serif`;
  ctx.lineWidth=Math.max(4,fs*0.14); ctx.strokeStyle='#0d0a07';
  ctx.strokeText('ТОВАР КОНЧИЛСЯ', W*0.5, H*0.17);
  ctx.fillStyle='#c9403f';
  ctx.fillText('ТОВАР КОНЧИЛСЯ', W*0.5, H*0.17);
  ctx.font=`600 ${fs*0.42}px "PT Sans",Verdana,sans-serif`;
  ctx.fillStyle='#9c8d72';
  ctx.fillText('Торговать нечем. Смена сорвана.', W*0.5, H*0.24);
  ctx.restore();
}

function drawCrow(c){
  const s=c.size;
  ctx.save(); ctx.translate(c.x,c.y);
  ctx.fillStyle='#15100c';
  ctx.beginPath(); ctx.ellipse(0,0,s*0.9,s*0.55,0.12,0,6.2832); ctx.fill();
  ctx.beginPath(); ctx.arc(-s*0.85,-s*0.5,s*0.36,0,6.2832); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-s*1.15,-s*0.52); ctx.lineTo(-s*1.9,-s*0.4); ctx.lineTo(-s*1.15,-s*0.28);
  ctx.closePath(); ctx.fillStyle='#3b3128'; ctx.fill();
  ctx.fillStyle='#15100c';
  ctx.beginPath();
  ctx.moveTo(s*0.5,-s*0.1); ctx.lineTo(s*1.6,s*0.3); ctx.lineTo(s*0.4,s*0.3);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle='#c9b184';
  ctx.beginPath(); ctx.arc(-s*0.95,-s*0.58,s*0.07,0,6.2832); ctx.fill();
  ctx.restore();
}

