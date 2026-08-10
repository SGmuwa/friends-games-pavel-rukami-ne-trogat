/* ═════════════════════════════════════════════════════════════════════
   9. ОБНОВЛЕНИЕ
   ═════════════════════════════════════════════════════════════════════ */
function update(dt){
  if(G.mode==='finale'){ updateFinale(dt); return; }
  if(G.mode!=='play') return;

  // Таймер уходит в минус и остаётся на виду: это сигнал игроку, что смена уже
  // кончилась и он доигрывает последних, а не то, что часы сломались.
  G.timeLeft -= dt;
  if(G.timeLeft<=0) beginLastCall('time');

  const prog = shiftProgress();                              // 0 → 1 за смену
  const maxActive = crowdCap(prog);                          // 1 → MAX_ON_SCREEN
  const d = G.diff;

  // ---- спавн (в концовке новых людей не появляется)
  G.spawnTimer -= dt;
  if(G.spawnTimer<=0 && !G.lastCall){
    const live = G.people.filter(p=>p.kind==='customer' && !p.dead && p.state!=='leave').length;
    if(live < maxActive){
      if(G.sinceThief >= d.thiefEvery && G.bundles>0) spawnThief();
      else spawnCustomer();
    }
    G.spawnTimer = lerp(d.spawn[0], d.spawn[1], prog) * rnd(0.75,1.25);
  }

  // ---- люди
  for(const p of G.people){
    p.t += dt;
    if(p.bubbleT>0) p.bubbleT -= dt;
    if(p.stumpBlood>0) p.stumpBlood -= dt;

    if(p.kind==='customer') updateCustomer(p, dt);
    else updateThief(p, dt);
  }
  G.people = G.people.filter(p=>!p.dead);

  // ---- частицы
  for(const b of G.blood){
    b.age+=dt; b.vy += (b.grav||900)*dt; b.x += b.vx*dt; b.y += b.vy*dt;
    if(!b.paper && b.y > counterY() && b.vy>0 && Math.random()<0.35){
      addSplat(b.x, counterY()+rnd(0,H*0.06), b.r*rnd(1.2,2.4));
      b.age = b.life;
    }
  }
  G.blood = G.blood.filter(b=>b.age<b.life);
  for(const s of G.splats) s.age+=dt;
  G.splats = G.splats.filter(s=>s.age<s.life);

  for(const d2 of G.debris){
    d2.age+=dt; d2.vy+=1200*dt; d2.x+=d2.vx*dt; d2.y+=d2.vy*dt; d2.rot+=d2.spin*dt;
    if(d2.y>H*1.1) d2.age=d2.life;
  }
  G.debris = G.debris.filter(x=>x.age<x.life);

  for(const p of G.pops){ p.age+=dt; p.y -= 46*dt; }
  G.pops = G.pops.filter(p=>p.age<p.life);

  if(G.shout && G.shout.age < G.shout.life) G.shout.age += dt;

  for(const s of G.slashes) s.age+=dt;
  G.slashes = G.slashes.filter(s=>s.age<s.life);

  for(const k of G.knives){
    k.age += dt;
    if(k.age>=k.life && !k.landed){
      k.landed = true;
      if(k.onHit) k.onHit();
    }
  }
  G.knives = G.knives.filter(k=>k.age < k.life + 0.05);

  // ---- концовка: когда последний человек ушёл, включаем финальный экран
  if(G.lastCall) updateLastCall(dt);
}

function updateCustomer(p, dt){
  switch(p.state){
    case 'approach':
      p.z = clamp(p.t/p.approach, 0, 1);
      if(p.z>=1){
        p.state='ask'; p.t=0;
        const line = pickLine(p.look.female ? 'ask_f' : 'ask_m');
        p.bubble = TEXT[line]; p.bubbleT = 1.2;
        // Голоса накладываются в кашу, если говорить всем сразу: пропускаем
        // реплику, когда канал занят. Баблы по умолчанию выключены, поэтому
        // порог мягкий — иначе о подходе покупателя нечем сообщить.
        if(Sound.busy() < 3) Sound.say(line, {vol:0.9, rate:rnd(0.94,1.07)});
      }
      break;

    case 'ask':
      if(p.t>=p.ask){
        const slots = bundleSlots();
        if(slots.length){
          p.state='reach'; p.t=0;
          p.targetSlot = slots.reduce((a,b)=> Math.abs(b.x-p.laneX)<Math.abs(a.x-p.laneX)?b:a);
        }else{
          // Верёвка пуста — тянуться не к чему. Постоит и уйдёт ни с чем:
          // ни продажи, ни промаха, ни штрафа за то, чего на прилавке нет.
          p.state='empty'; p.t=0; p.bubble=null; p.bubbleT=0;
        }
      }
      break;

    case 'empty':
      if(p.t>1.0){ p.state='leave'; p.t=0; }
      break;

    case 'reach':
      if(p.t >= p.grab){          // не успел — рука дошла до травы
        p.state='withdraw'; p.t=0;
        const line = pickLine(p.look.female ? 'miss_f' : 'miss_m');
        p.bubble = TEXT[line]; p.bubbleT = 1.5;
        Sound.say(line, {vol:0.95, rate:rnd(0.95,1.06)});
        Sound.buzz();
        addScore(G.diff.missPts);
        pop(p.laneX, counterY()-H*0.16, `${G.diff.missPts}`, '#ff6b6b');
        G.stats.withdrew++; G.stats.spoiled++;
        loseBundle();
      }
      break;

    case 'withdraw':
      if(p.t>0.55){ p.state='leave'; p.t=0; }
      break;

    case 'hit':
      // Место у прилавка держится ровно столько, чтобы разглядеть культю
      // (в мягком режиме — синяк): дольше — и очередь упирается не в игрока,
      // а в анимацию.
      if(p.t>1.0){ p.state='leave'; p.t=0; }
      break;

    case 'leave':
      p.z -= dt/1.1;
      if(p.z<=0) p.dead=true;
      break;
  }
}

function updateThief(p, dt){
  switch(p.state){
    case 'run':
      p.z = clamp(p.t/p.approach, 0, 1);
      if(p.z>=1){
        p.t=0;
        if(G.bundles>0){
          G.bundles--;                 // пучок в руках вора; вернётся, если попадём
          p.carrying = true;
          p.state='grab';
          shout('grab');
        }else{
          // Красть нечего — вор потопчется у пустого прилавка и уйдёт.
          // Ни ножа в спину, ни штрафа за побег: он ничего не унёс.
          p.state='empty';
        }
      }
      break;

    case 'grab':
      if(p.t>0.28){ p.state='flee'; p.t=0; }
      break;

    case 'empty':
      if(p.t>1.0){ p.state='giveup'; p.t=0; }
      break;

    case 'giveup':
      p.z -= dt/1.1;
      if(p.z<=0) p.dead=true;
      break;

    case 'flee':
      // Нож уже в полёте — вор замирает, иначе он успевал бы «уйти» за 0.17 с
      // полёта и игрок получал бы и награду, и штраф за одного вора.
      if(p.stabbed) break;
      p.z = clamp(1 - p.t/p.flee, 0, 1);
      if(p.z<=0){                       // ушёл
        p.dead = true;
        addScore(G.diff.thiefEscPts);
        pop(personGeom(p).x, feetAt(0)-H*0.06, `${G.diff.thiefEscPts}`, '#ff6b6b');
        Sound.buzz();
        shout('esc');
        G.stats.thievesEscaped++; G.stats.stolen++;
        if(G.bundles===0) checkOutOfStock();
      }
      break;

    case 'down':
      p.fallT += dt;
      if(p.fallT>2.2) p.dead=true;
      break;
  }
}

