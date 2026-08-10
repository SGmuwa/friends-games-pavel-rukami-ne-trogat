/* ═════════════════════════════════════════════════════════════════════
   12. ОТРИСОВКА
   ═════════════════════════════════════════════════════════════════════ */
function draw(){
  ctx.clearRect(0,0,W,H);
  drawBackground();

  if(G.mode==='finale'){ drawFinale(); return; }

  // Дальние — первыми, ближние — поверх
  const sorted = [...G.people].sort((a,b)=>a.z-b.z);
  const behind = sorted.filter(p=> p.kind==='thief' && p.state==='down' ? false : true);

  for(const p of behind) drawPerson(p);

  drawCounter();
  drawHangingBundles();

  // упавшие воры рисуются поверх прилавка, чтобы кровь была видна
  for(const p of sorted) if(p.kind==='thief' && p.state==='down') drawPerson(p);

  drawSplats();
  for(const d of G.debris) drawDebris(d);
  drawBlood();
  drawKnives();
  drawSlashes();
  // Баблы — настройка, по умолчанию выключены. Даже включённых на экране не
  // больше трёх: впятером они перекрывают друг друга и не читается ни один.
  // Показываем самые свежие — они и есть новости.
  if(OPT.bubbles){
    sorted.filter(p=>p.bubble && p.bubbleT>0)
          .sort((a,b)=>b.bubbleT-a.bubbleT)
          .slice(0,3)
          .forEach(drawBubble);
  }
  drawPops();
  drawShout();
}

// Крик продавца — плашка над прилавком. Своей фигуры у игрока на сцене нет,
// вешать бабл не на кого, поэтому его голос идёт субтитром.
function drawShout(yOverride){
  const s = G.shout;
  if(!s || s.age >= s.life || !s.text) return;
  const k = 1 - s.age/s.life;
  ctx.save();
  ctx.globalAlpha = clamp(k*2.2, 0, 1);
  const fs = Math.max(15, Math.min(H*0.052, W*0.045));
  ctx.font = `800 ${fs}px "PT Sans",Verdana,sans-serif`;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  const y = (yOverride !== undefined) ? yOverride
                                    : counterY() + H*0.028 + (1-k)*H*0.012;
  ctx.lineWidth = Math.max(4, fs*0.22); ctx.strokeStyle='#160f0a';
  ctx.lineJoin='round';
  ctx.strokeText(s.text, W*0.5, y);
  ctx.fillStyle='#ffe08a';
  ctx.fillText(s.text, W*0.5, y);
  ctx.restore();
}

function drawBackground(){
  // небо/стена рынка
  const g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#2a2118');
  g.addColorStop(0.36,'#4a3d2c');
  g.addColorStop(0.62,'#5c4c36');
  g.addColorStop(1,'#332a1e');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);

  // дальние палатки
  const hy = horizonY();
  ctx.save();
  ctx.globalAlpha=0.42;
  for(let i=0;i<7;i++){
    const x = W*(0.02+i*0.145), w = W*0.115, h = H*(0.10+((i*37)%5)*0.012);
    ctx.fillStyle = i%2 ? '#463a29' : '#3a3226';
    ctx.fillRect(x, hy-h, w, h);
    ctx.fillStyle = i%2 ? '#6a4a3a' : '#5a4a34';
    ctx.beginPath();
    ctx.moveTo(x-W*0.012, hy-h);
    ctx.lineTo(x+w/2, hy-h-H*0.035);
    ctx.lineTo(x+w+W*0.012, hy-h);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  // пол
  ctx.fillStyle='#3b3022';
  ctx.fillRect(0,hy,W,H-hy);
  ctx.save(); ctx.globalAlpha=0.18; ctx.strokeStyle='#000'; ctx.lineWidth=2;
  for(let i=0;i<=12;i++){
    const t=i/12;
    ctx.beginPath();
    ctx.moveTo(W*0.5, hy);
    ctx.lineTo(lerp(-W*0.6, W*1.6, t), H);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCounter(){
  const cy = counterY();
  // столешница
  ctx.fillStyle='#7a6144';
  ctx.beginPath();
  ctx.moveTo(-W*0.02, cy);
  ctx.lineTo(W*1.02, cy);
  ctx.lineTo(W*1.02, cy+H*0.055);
  ctx.lineTo(-W*0.02, cy+H*0.055);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle='#3d3022'; ctx.lineWidth=Math.max(2,H*0.005); ctx.stroke();

  // передняя стенка с досками
  ctx.fillStyle='#5b4732';
  ctx.fillRect(-W*0.02, cy+H*0.055, W*1.04, H);
  ctx.strokeStyle='#463522'; ctx.lineWidth=Math.max(1.5,H*0.003);
  const planks = 11;
  for(let i=1;i<planks;i++){
    const x = W*(i/planks);
    ctx.beginPath(); ctx.moveTo(x, cy+H*0.055); ctx.lineTo(x, H); ctx.stroke();
  }
  // блик
  ctx.save(); ctx.globalAlpha=0.16; ctx.fillStyle='#fff5d0';
  ctx.fillRect(-W*0.02, cy, W*1.04, H*0.012);
  ctx.restore();
}

function drawHangingBundles(){
  const slots = bundleSlots();
  const ry = ropeY();
  // верёвка
  ctx.strokeStyle='#8a7350'; ctx.lineWidth=Math.max(2,H*0.005);
  ctx.beginPath();
  ctx.moveTo(0, ry);
  ctx.quadraticCurveTo(W*0.5, ry+H*0.022, W, ry);
  ctx.stroke();

  // на узком экране пучки жмутся друг к другу — уменьшаем, чтобы не слипались
  const bs = Math.min(H*0.075, W*0.075);
  for(const s of slots) drawBundle(s.x, s.y, bs, true);

  if(G.bundles>MAX_HANGING){
    ctx.fillStyle='#f2e6c8'; ctx.font=`700 ${Math.max(14,H*0.028)}px sans-serif`;
    ctx.textAlign='center';
    ctx.fillText(`+${G.bundles-MAX_HANGING}`, W*0.5, ry+H*0.115);
  }
}

// Пучок лекарственной травы — зелёный, перевязанный
function drawBundle(x, y, size, hanging){
  ctx.save();
  ctx.translate(x,y);
  if(hanging){
    ctx.strokeStyle='#8a7350'; ctx.lineWidth=Math.max(1.2,size*0.045);
    ctx.beginPath(); ctx.moveTo(0,-size*0.55); ctx.lineTo(0,-size*0.05); ctx.stroke();
  }
  // стебли-листья веером
  const leaves = 9;
  for(let i=0;i<leaves;i++){
    const a = lerp(-0.85, 0.85, i/(leaves-1));
    const len = size*rnd(0.85,1.0);
    ctx.strokeStyle = i%3===0 ? '#2f7a2c' : (i%3===1 ? '#46a03f' : '#3a8c36');
    ctx.lineWidth = Math.max(1.6, size*0.075);
    ctx.lineCap='round';
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.quadraticCurveTo(Math.sin(a)*len*0.55, len*0.5, Math.sin(a)*len, len*0.95);
    ctx.stroke();
  }
  // перевязка
  ctx.fillStyle='#b8452e';
  ctx.fillRect(-size*0.16, -size*0.06, size*0.32, size*0.14);
  ctx.restore();
}

function drawPerson(p){
  const g = personGeom(p);
  const L = p.look;
  const back = (p.kind==='thief' &&
    (p.state==='flee' || p.state==='down' || p.state==='grab' || p.state==='giveup'));
  const down = (p.state==='down');

  ctx.save();
  if(down){
    ctx.translate(g.x, g.feet);
    ctx.rotate(clamp(p.fallT/0.5,0,1)*0.95);
    ctx.translate(-g.x, -g.feet);
    ctx.globalAlpha = clamp(1-(p.fallT-1.4)/0.8, 0, 1);
  }
  if(p.state==='leave' || p.state==='giveup') ctx.globalAlpha = clamp(p.z*1.6, 0, 1);

  const lw = Math.max(1.5, g.h*0.018);
  ctx.lineJoin='round'; ctx.lineCap='round';
  ctx.strokeStyle='#231a12'; ctx.lineWidth=lw;

  // ноги
  ctx.fillStyle=L.pants;
  const legW=g.bodyW*0.34;
  for(const s of [-1,1]){
    ctx.beginPath();
    ctx.roundRect(g.x + s*g.bodyW*0.30 - legW/2, g.hipY, legW, g.feet-g.hipY, legW*0.4);
    ctx.fill(); ctx.stroke();
  }

  // торс (пальто)
  ctx.fillStyle=L.coat;
  ctx.beginPath();
  ctx.roundRect(g.x-g.bodyW, g.shoulderY, g.bodyW*2, g.hipY-g.shoulderY+g.h*0.06, g.bodyW*0.35);
  ctx.fill(); ctx.stroke();
  // акцент — воротник/пояс
  ctx.fillStyle=L.accent;
  ctx.fillRect(g.x-g.bodyW, g.hipY-g.h*0.03, g.bodyW*2, g.h*0.035);
  if(!back){
    ctx.beginPath();
    ctx.moveTo(g.x-g.bodyW*0.32, g.shoulderY);
    ctx.lineTo(g.x, g.shoulderY+g.h*0.07);
    ctx.lineTo(g.x+g.bodyW*0.32, g.shoulderY);
    ctx.fill();
  }

  // руки, кроме тянущейся — та рисуется поверх всего в конце
  drawIdleArms(p, g, back);

  // волосы ЗА головой (иначе перекрывают лицо)
  if(L.longHair){
    ctx.fillStyle=L.hair;
    ctx.beginPath();
    ctx.roundRect(g.x-g.headR*1.12, g.headY-g.headR*1.1, g.headR*2.24, g.headR*2.6, g.headR*0.7);
    ctx.fill();
  }

  // голова
  ctx.fillStyle=L.skin;
  ctx.beginPath(); ctx.arc(g.x, g.headY, g.headR, 0, 6.2832); ctx.fill(); ctx.stroke();

  // Причёска поверх макушки. Низкая чёлка закрывала бы глаза (они на headY-0.12R),
  // поэтому нижняя кромка волос держится выше уровня глаз.
  ctx.fillStyle=L.hair;
  ctx.beginPath();
  ctx.ellipse(g.x, g.headY-g.headR*0.38,
              g.headR*(L.longHair?1.08:1.04), g.headR*0.64, 0, Math.PI, 0);
  ctx.fill();

  // лицо только спереди
  if(!back){
    if(L.beard){
      ctx.fillStyle=L.hair;
      ctx.beginPath();
      ctx.ellipse(g.x, g.headY+g.headR*0.55, g.headR*0.8, g.headR*0.62, 0, 0, Math.PI);
      ctx.fill();
    }
    const eyeY = g.headY - g.headR*0.12, eyeDx = g.headR*0.36;
    ctx.fillStyle='#1a120c';
    for(const s of [-1,1]){
      ctx.beginPath();
      ctx.arc(g.x+s*eyeDx, eyeY, Math.max(1.1, g.headR*0.13), 0, 6.2832);
      ctx.fill();
    }
    if(L.glasses){
      ctx.strokeStyle='#2a2018'; ctx.lineWidth=Math.max(1, g.headR*0.09);
      for(const s of [-1,1]){
        ctx.beginPath();
        ctx.arc(g.x+s*eyeDx, eyeY, g.headR*0.28, 0, 6.2832); ctx.stroke();
      }
      ctx.strokeStyle='#231a12'; ctx.lineWidth=lw;
    }
    // рот — орёт, когда тянется или когда отрубили
    const mouthY = g.headY + g.headR*0.40;
    ctx.fillStyle='#5a1414';
    const open = (p.state==='reach'||p.state==='ask'||p.state==='hit'||p.state==='withdraw');
    ctx.beginPath();
    if(open) ctx.ellipse(g.x, mouthY, g.headR*0.24, g.headR*0.27, 0, 0, 6.2832);
    else     ctx.ellipse(g.x, mouthY, g.headR*0.26, g.headR*0.08, 0, 0, 6.2832);
    ctx.fill();
  }

  // головной убор
  if(L.hat!=='none') drawHat(g, L, back);

  // вор несёт пучок
  if(p.kind==='thief' && p.carrying){
    drawBundle(g.x - g.bodyW*1.15, g.shoulderY + g.h*0.14, g.h*0.13, false);
  }
  // нож в спине
  if(p.knifeIn){
    drawKnifeStuck(g.x, (g.shoulderY+g.hipY)/2, g.h*0.22);
  }

  // Тянущаяся рука — поверх головы и туловища: это цель игрока,
  // она обязана быть видна, даже когда проходит перед лицом.
  if(p.kind==='customer' && p.state==='reach') drawReachArm(p, g);

  ctx.restore();
}

function drawHat(g, L, back){
  const hy = g.headY - g.headR*0.75;
  ctx.strokeStyle='#231a12'; ctx.lineWidth=Math.max(1.5,g.h*0.018);
  if(L.hat==='kerchief'){
    // нижняя кромка платка держится выше глаз (они на headY-0.12R)
    ctx.fillStyle=L.accent;
    ctx.beginPath();
    ctx.moveTo(g.x-g.headR*1.10, g.headY-g.headR*0.18);
    ctx.quadraticCurveTo(g.x, g.headY-g.headR*1.65, g.x+g.headR*1.10, g.headY-g.headR*0.18);
    ctx.quadraticCurveTo(g.x, g.headY+g.headR*0.20, g.x-g.headR*1.10, g.headY-g.headR*0.18);
    ctx.fill(); ctx.stroke();
    if(!back){
      ctx.beginPath();
      ctx.moveTo(g.x+g.headR*0.95, g.headY-g.headR*0.10);
      ctx.lineTo(g.x+g.headR*1.60, g.headY+g.headR*0.60);
      ctx.lineTo(g.x+g.headR*0.80, g.headY+g.headR*0.30);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }else if(L.hat==='cap'){
    ctx.fillStyle=L.accent;
    ctx.beginPath();
    ctx.ellipse(g.x, g.headY-g.headR*0.30, g.headR*1.05, g.headR*0.78, 0, Math.PI, 0);
    ctx.fill(); ctx.stroke();
    // козырёк торчит вбок от края тульи, а не поперёк лица
    ctx.beginPath();
    ctx.ellipse(g.x+(back?-1:1)*g.headR*1.15, g.headY-g.headR*0.52,
                g.headR*0.75, g.headR*0.14, 0, 0, 6.2832);
    ctx.fill(); ctx.stroke();
  }else if(L.hat==='ushanka'){
    ctx.fillStyle=L.accent;
    ctx.beginPath();   // тулья кончается выше глаз
    ctx.roundRect(g.x-g.headR*1.15, hy-g.headR*0.50, g.headR*2.3, g.headR*1.0, g.headR*0.4);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle=L.hair;
    for(const s of [-1,1]){   // уши свисают по бокам, лицо не задевают
      ctx.beginPath();
      ctx.roundRect(g.x+s*g.headR*1.15-g.headR*0.3, hy+g.headR*0.30, g.headR*0.6, g.headR*1.1, g.headR*0.25);
      ctx.fill(); ctx.stroke();
    }
  }else{ // hat — поля выше линии глаз, иначе шляпа «съедает» лицо
    ctx.fillStyle=L.accent;
    ctx.beginPath();
    ctx.ellipse(g.x, hy+g.headR*0.10, g.headR*1.5, g.headR*0.22, 0, 0, 6.2832);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(g.x-g.headR*0.75, hy-g.headR*1.05, g.headR*1.5, g.headR*1.15, g.headR*0.2);
    ctx.fill(); ctx.stroke();
  }
}

// Общий рисовальщик конечности: рукав дугой + кисть
function limb(g, L, sx, sy, ex, ey, skinHand){
  const mx=(sx+ex)/2 + (ex-sx)*0.05, my=(sy+ey)/2 + g.h*0.05;
  ctx.strokeStyle=L.coat;
  ctx.lineWidth=g.bodyW*0.42;
  ctx.lineCap='round';
  ctx.beginPath();
  ctx.moveTo(sx,sy);
  ctx.quadraticCurveTo(mx,my,ex,ey);
  ctx.stroke();
  if(skinHand){
    ctx.fillStyle=L.skin;
    ctx.beginPath(); ctx.arc(ex,ey,g.bodyW*0.30,0,6.2832); ctx.fill();
    ctx.strokeStyle='#231a12'; ctx.lineWidth=Math.max(1,g.h*0.014);
    ctx.stroke();
  }
}

// Тянущаяся рука: рисуется последней, поверх фигуры, с пульсирующей меткой цели
function drawReachArm(p, g){
  const L=p.look, hp=handPos(p);
  const shY = g.shoulderY + g.h*0.05;
  limb(g, L, g.x + g.bodyW*0.75*p.arm, shY, hp.x, hp.y, false);

  const r = Math.max(20, g.h*0.13);
  ctx.save();
  ctx.globalAlpha = 0.45+0.3*Math.sin(performance.now()/90);
  ctx.strokeStyle='#ffd257'; ctx.lineWidth=Math.max(2.5,g.h*0.022);
  ctx.beginPath(); ctx.arc(hp.x,hp.y,r,0,6.2832); ctx.stroke();
  ctx.restore();

  // растопыренная пятерня — цель для мачете
  ctx.fillStyle=L.skin; ctx.strokeStyle='#231a12';
  ctx.lineWidth=Math.max(1.2,g.h*0.014);
  const hs=g.bodyW*0.34;
  ctx.beginPath(); ctx.arc(hp.x,hp.y,hs,0,6.2832); ctx.fill(); ctx.stroke();
  for(let i=0;i<4;i++){
    const a=-Math.PI/2 + (i-1.5)*0.42;
    ctx.beginPath();
    ctx.lineWidth=hs*0.42; ctx.strokeStyle=L.skin; ctx.lineCap='round';
    ctx.moveTo(hp.x+Math.cos(a)*hs*0.5, hp.y+Math.sin(a)*hs*0.5);
    ctx.lineTo(hp.x+Math.cos(a)*hs*1.5, hp.y+Math.sin(a)*hs*1.5);
    ctx.stroke();
  }
}

function drawIdleArms(p, g, back){
  const L=p.look;
  const shY = g.shoulderY + g.h*0.05;
  // Кисти не должны уходить под прилавок — иначе вблизи фигура выглядит безрукой.
  // Для дальних людей hipY и так выше кромки, и min() ничего не меняет.
  const restY = Math.min(g.hipY + g.h*0.02, counterY() - g.h*0.05);
  const drawLimb=(sx,sy,ex,ey,skinHand)=>limb(g,L,sx,sy,ex,ey,skinHand);

  if(p.kind==='customer' && p.state==='reach'){
    // свободная рука вдоль тела; тянущуюся рисуем позже, поверх всего
    drawLimb(g.x - g.bodyW*0.75*p.arm, shY,
             g.x - g.bodyW*1.15*p.arm, restY, true);
    return;
  }

  if(p.kind==='customer' && p.handHit){
    // Рука отдёрнута и висит на весу: с культёй, из которой хлещет, —
    // или с целой кистью, на которой наливается синяк.
    const sx=g.x + g.bodyW*0.75*p.arm;
    const ex=g.x + g.bodyW*1.75*p.arm;
    const ey=g.shoulderY + g.h*0.14;
    drawLimb(sx,shY,ex,ey,false);
    if(p.bruised){
      drawBruisedHand(g, L, ex, ey);
    }else{
      ctx.fillStyle='#8e1418'; ctx.strokeStyle='#3d0a0c';
      ctx.lineWidth=Math.max(1.2,g.h*0.012);
      ctx.beginPath(); ctx.arc(ex,ey,g.bodyW*0.24,0,6.2832); ctx.fill(); ctx.stroke();
      if(p.stumpBlood>0 && Math.random()<0.8) bloodBurst(ex,ey,g.sc,2,Math.PI/2);
    }
    drawLimb(g.x - g.bodyW*0.75*p.arm, shY,
             g.x - g.bodyW*1.15*p.arm, restY, true);
    return;
  }

  // обычные руки (в т.ч. вор со спины)
  for(const s of [-1,1]){
    let ex=g.x + s*g.bodyW*1.15, ey=restY;
    if(p.kind==='thief' && (p.state==='flee'||p.state==='run'||p.state==='giveup')){
      const swing=Math.sin(p.t*22 + (s>0?0:Math.PI))*g.h*0.09;
      ey += swing; ex += s*g.h*0.02;
    }
    drawLimb(g.x + s*g.bodyW*0.75, shY, ex, ey, true);
  }
}

/* Кисть после газеты: цела, но припухла и сине-лиловая с краю. Синяк рисуем
   двумя пятнами поверх кожи — одно тёмное, одно расплывшееся, — иначе на
   мелкой фигуре он читается как грязь, а не как след удара. */
function drawBruisedHand(g, L, x, y){
  const r = g.bodyW*0.32;                     // чуть больше обычной кисти: распухла
  ctx.fillStyle=L.skin; ctx.strokeStyle='#231a12';
  ctx.lineWidth=Math.max(1,g.h*0.014);
  ctx.beginPath(); ctx.arc(x,y,r,0,6.2832); ctx.fill(); ctx.stroke();
  ctx.save();
  ctx.globalAlpha=0.72; ctx.fillStyle='#5b3f86';
  ctx.beginPath(); ctx.ellipse(x-r*0.18, y-r*0.12, r*0.50, r*0.38, 0.5, 0, 6.2832); ctx.fill();
  ctx.globalAlpha=0.45; ctx.fillStyle='#8a4f7d';
  ctx.beginPath(); ctx.ellipse(x+r*0.30, y+r*0.20, r*0.32, r*0.24, -0.3, 0, 6.2832); ctx.fill();
  ctx.restore();
}

function drawBubble(p){
  if(!p.bubble || p.bubbleT<=0) return;
  const g = personGeom(p);
  const fs = Math.max(12, Math.min(H*0.032, g.h*0.11));
  ctx.save();
  ctx.font=`700 ${fs}px "PT Sans",Verdana,sans-serif`;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  const tw = ctx.measureText(p.bubble).width;
  const pad = fs*0.55;
  const bw = tw+pad*2, bh = fs*1.85;
  let bx = clamp(g.x, bw/2+6, W-bw/2-6);
  const by = g.headY - g.headR - bh*0.85;
  ctx.globalAlpha = clamp(p.bubbleT*2.2, 0, 1);
  ctx.fillStyle='#f4ead0'; ctx.strokeStyle='#231a12';
  ctx.lineWidth=Math.max(2,fs*0.12);
  ctx.beginPath(); ctx.roundRect(bx-bw/2, by-bh/2, bw, bh, bh*0.35);
  ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(g.x-fs*0.3, by+bh*0.45);
  ctx.lineTo(g.x, by+bh*0.95);
  ctx.lineTo(g.x+fs*0.3, by+bh*0.45);
  ctx.closePath(); ctx.fillStyle='#f4ead0'; ctx.fill();
  ctx.fillStyle='#231a12';
  ctx.fillText(p.bubble, bx, by);
  ctx.restore();
}

function drawBlood(){
  ctx.save();
  for(const b of G.blood){
    const k = 1-b.age/b.life;
    ctx.globalAlpha = clamp(k*1.3, 0, 1);
    ctx.fillStyle = b.paper ? (k>0.6 ? '#f2ecdc' : '#c9c0a9')
                            : (k>0.6 ? '#e01c22' : '#a30f14');
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r*(0.5+k*0.5), 0, 6.2832); ctx.fill();
  }
  ctx.restore();
}

function drawSplats(){
  ctx.save();
  for(const s of G.splats){
    ctx.globalAlpha = clamp(1-s.age/s.life, 0, 1)*0.85;
    ctx.fillStyle='#8c1216';
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, s.r*1.5, s.r*0.55, 0, 0, 6.2832); ctx.fill();
    for(let i=0;i<4;i++){
      const a=(s.seed+i*1.7)%6.283;
      ctx.beginPath();
      ctx.arc(s.x+Math.cos(a)*s.r*2.1, s.y+Math.sin(a)*s.r*0.8, s.r*0.35, 0, 6.2832);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawDebris(d){
  ctx.save();
  ctx.globalAlpha = clamp(1-(d.age/d.life-0.6)/0.4, 0, 1);
  ctx.translate(d.x,d.y); ctx.rotate(d.rot);
  if(d.type==='hand'){
    ctx.fillStyle=d.skin; ctx.strokeStyle='#231a12'; ctx.lineWidth=Math.max(1,d.size*0.12);
    ctx.beginPath(); ctx.roundRect(-d.size*0.4,-d.size*0.5,d.size*0.8,d.size, d.size*0.35);
    ctx.fill(); ctx.stroke();
    for(let i=0;i<4;i++){
      ctx.beginPath();
      ctx.roundRect(-d.size*0.36+i*d.size*0.22, -d.size*0.92, d.size*0.17, d.size*0.5, d.size*0.09);
      ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle='#a3121a';
    ctx.beginPath(); ctx.ellipse(0, d.size*0.5, d.size*0.4, d.size*0.14, 0, 0, 6.2832); ctx.fill();
  }else if(d.type==='paper'){
    drawPaperBall(d.size);
  }
  ctx.restore();
}

function drawKnives(){
  for(const k of G.knives){
    if(k.landed) continue;
    const t = clamp(k.age/k.life, 0, 1);
    const x = lerp(k.x0,k.x1,t), y = lerp(k.y0,k.y1,t);
    const a = Math.atan2(k.y1-k.y0, k.x1-k.x0);
    const size = lerp(H*0.13, H*0.055, t);
    ctx.save(); ctx.translate(x,y);
    if(k.paper){
      // Ком не летит остриём вперёд — он кувыркается. Угол берём от времени
      // полёта, а не от Math.random(), иначе он дрожал бы каждый кадр.
      ctx.rotate(a + t*9);
      drawPaperBall(size*0.46);
    }else{
      ctx.rotate(a);
      drawKnifeShape(size);
    }
    ctx.restore();
  }
}

/* Скомканная газета: неровный многоугольник со складками. Форма считается по
   индексу вершины, а не случайно, — иначе ком «кипел» бы в полёте. */
function drawPaperBall(size){
  ctx.fillStyle='#efe9d8'; ctx.strokeStyle='#8d8574';
  ctx.lineWidth=Math.max(1,size*0.07);
  ctx.beginPath();
  const n=9;
  for(let i=0;i<n;i++){
    const a=i/n*6.2832;
    const r=size*(i%2 ? 0.40 : 0.52);
    const x=Math.cos(a)*r, y=Math.sin(a)*r;
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle='#b6ad96'; ctx.lineWidth=Math.max(1,size*0.06);
  ctx.beginPath();
  ctx.moveTo(-size*0.30,-size*0.12);
  ctx.lineTo( size*0.04, size*0.10);
  ctx.lineTo( size*0.32,-size*0.16);
  ctx.stroke();
}
function drawKnifeShape(size){
  ctx.fillStyle='#3a2a1c';
  ctx.fillRect(-size*0.5,-size*0.09,size*0.42,size*0.18);
  ctx.fillStyle='#d9dde2'; ctx.strokeStyle='#20262c';
  ctx.lineWidth=Math.max(1,size*0.05);
  ctx.beginPath();
  ctx.moveTo(-size*0.08,-size*0.11);
  ctx.lineTo(size*0.5,0);
  ctx.lineTo(-size*0.08,size*0.11);
  ctx.closePath(); ctx.fill(); ctx.stroke();
}
function drawKnifeStuck(x,y,size){
  ctx.save(); ctx.translate(x,y); ctx.rotate(-0.35);
  ctx.fillStyle='#3a2a1c';
  ctx.fillRect(-size*0.05,-size*0.1,size*0.55,size*0.2);
  ctx.restore();
}

/* След удара. Мачете оставляет тонкий росчерк, свёрнутая газета — широкую
   полосу: её и видно как газету, и промахнуться взглядом по ней труднее. */
function drawSlashes(){
  ctx.save();
  for(const s of G.slashes){
    const k = 1-s.age/s.life;
    ctx.globalAlpha=k;
    if(s.paper){
      // Полоса должна читаться как газета, а не как серая плашка: держим её
      // светлой почти до конца жизни и не даём разрастаться в доску.
      const th = clamp(s.len*0.20, 11, 34);
      ctx.save();
      ctx.globalAlpha = clamp(k*1.8, 0, 1);
      ctx.translate(s.x, s.y); ctx.rotate(s.a);
      ctx.fillStyle='#f2ecd8'; ctx.strokeStyle='#7d7566';
      ctx.lineWidth=Math.max(1.5, th*0.10);
      ctx.beginPath(); ctx.roundRect(-s.len/2, -th/2, s.len, th, th*0.42);
      ctx.fill(); ctx.stroke();
      // строки набора — газета, а не просто светлая плашка
      ctx.strokeStyle='#a9a08a'; ctx.lineWidth=Math.max(1, th*0.06);
      for(let i=1;i<=3;i++){
        const y = -th/2 + th*i/4;
        ctx.beginPath();
        ctx.moveTo(-s.len*0.42, y); ctx.lineTo(s.len*0.42, y); ctx.stroke();
      }
      ctx.restore();
    }else{
      ctx.strokeStyle='#fff6d8'; ctx.lineWidth=Math.max(3,H*0.009*k+2);
      ctx.lineCap='round';
      ctx.beginPath();
      ctx.moveTo(s.x-Math.cos(s.a)*s.len/2, s.y-Math.sin(s.a)*s.len/2);
      ctx.lineTo(s.x+Math.cos(s.a)*s.len/2, s.y+Math.sin(s.a)*s.len/2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawPops(){
  ctx.save();
  ctx.textAlign='center'; ctx.textBaseline='middle';
  for(const p of G.pops){
    const k=1-p.age/p.life;
    ctx.globalAlpha=clamp(k*1.5,0,1);
    const fs=Math.max(18,H*0.045);
    ctx.font=`800 ${fs}px "PT Sans",Verdana,sans-serif`;
    ctx.lineWidth=Math.max(3,fs*0.16); ctx.strokeStyle='#1a120c';
    ctx.strokeText(p.text,p.x,p.y);
    ctx.fillStyle=p.color; ctx.fillText(p.text,p.x,p.y);
  }
  ctx.restore();
}

