/* ═════════════════════════════════════════════════════════════════════
   11. КЛИК / ТАП
   ═════════════════════════════════════════════════════════════════════ */
function onPoint(px, py){
  if(G.mode!=='play') return;

  // 1) рука тянущегося покупателя
  let best=null, bestD=1e9;
  for(const p of G.people){
    if(p.kind!=='customer' || p.state!=='reach' || p.handHit) continue;
    const hp = handPos(p);
    const r = Math.max(20, hp.g.h*0.13);
    const d = Math.hypot(px-hp.x, py-hp.y);
    if(d<r && d<bestD){ bestD=d; best={p, hp, r}; }
  }
  if(best){ strikeHand(best.p, best.hp); return; }

  // 2) спина убегающего вора (нож или бумажный ком — смотря какой режим)
  let bt=null, btD=1e9;
  for(const p of G.people){
    if(p.kind!=='thief' || p.state!=='flee' || p.stabbed) continue;
    const g = personGeom(p);
    const cx = g.x, cy = (g.shoulderY+g.hipY)/2;
    const r = Math.max(18, g.bodyW*0.95);
    const d = Math.hypot(px-cx, py-cy);
    if(d<r*1.25 && d<btD){ btD=d; bt={p,g,cx,cy}; }
  }
  if(bt){ throwProjectile(bt.p, bt.cx, bt.cy); return; }

  // 3) промах — просто росчерк (в мягком режиме — полоса газеты), без штрафа
  G.slashes.push({x:px, y:py, a:rnd(-0.5,0.5), age:0, life:0.22,
                  len:Math.max(60,H*0.1), paper:OPT.gentle});
  Sound.swish();
}

/* Удар по тянущейся кисти. Правила у обоих режимов одни, разнится только
   картинка: мачете отрубает руку, свёрнутая газета оставляет синяк. */
function strikeHand(p, hp){
  const soft = OPT.gentle;
  p.handHit = true; p.bruised = soft;
  p.state='hit'; p.t=0; p.stumpBlood = soft ? 0 : 1.4;
  p.bubble=null;

  Sound.swish();
  setTimeout(()=> soft ? Sound.slap() : Sound.chop(), 60);
  shout('chop');
  Sound.cash();

  // Свёрнутая газета короче замаха мачете — иначе полоса выходит с доску.
  G.slashes.push({x:hp.x, y:hp.y, a:rnd(-0.7,0.7), age:0, life: soft?0.30:0.26,
                  len: soft ? Math.max(70,hp.g.h*0.50) : Math.max(90,hp.g.h*0.7),
                  paper:soft});
  bloodBurst(hp.x, hp.y, hp.g.sc, 34);
  addSplat(hp.x, counterY()+rnd(0, H*0.05), hp.g.h*0.09);

  if(!soft){
    G.debris.push({
      type:'hand', x:hp.x, y:hp.y,
      vx: rnd(-160,160), vy: rnd(-420,-220),
      rot: rnd(0,6.28), spin: rnd(-9,9),
      size: hp.g.h*0.11, skin:p.look.skin, age:0, life:2.6,
    });
  }

  addScore(G.diff.sell);
  pop(hp.x, hp.y-H*0.04, `+${G.diff.sell}`, '#8ff08a');
  G.stats.maimed++; G.stats.sold++;
  loseBundle();
}

/* Бросок в спину вора. Снаряд летит те же 0.17 с и бьёт так же больно по
   очкам — но в мягком режиме это скомканная газета, а не нож. */
function throwProjectile(p, tx, ty){
  const soft = OPT.gentle;
  p.stabbed = true;
  if(soft) Sound.swish(); else Sound.whistle();
  const from = {x:W*0.5, y:H*1.02};
  G.knives.push({
    x0:from.x, y0:from.y, x1:tx, y1:ty, paper:soft,
    age:0, life:0.17, landed:false,
    onHit:()=>{
      const g = personGeom(p);
      if(soft) Sound.paperHit(); else Sound.thud();
      bloodBurst(tx, ty, g.sc, 30, -Math.PI/2);
      addSplat(tx, ty+g.h*0.1, g.h*0.08);
      p.state='down'; p.fallT=0; p.knifeIn=!soft;
      // Ком отскакивает и падает под ноги — нож остаётся торчать в спине.
      if(soft){
        G.debris.push({
          type:'paper', x:tx, y:ty,
          vx: rnd(-190,190), vy: rnd(-360,-190),
          rot: rnd(0,6.28), spin: rnd(-7,7),
          size: g.h*0.10, age:0, life:2.2,
        });
      }
      addScore(G.diff.thiefPts);
      pop(tx, ty-H*0.04, `+${G.diff.thiefPts}`, '#8ff08a');
      shout('stab');
      G.stats.thievesPunished++;
      if(p.carrying){ G.bundles++; p.carrying=false; }   // пучок вернулся на прилавок
    },
  });
}

