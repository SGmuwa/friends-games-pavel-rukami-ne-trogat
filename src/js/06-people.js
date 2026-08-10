/* ═════════════════════════════════════════════════════════════════════
   6. ЛЮДИ
   ═════════════════════════════════════════════════════════════════════ */
function makeAppearance(){
  const female = Math.random()<0.5;
  return {
    female,
    skin:  pick(SKIN),
    hair:  pick(HAIR),
    coat:  pick(CLOTH),
    accent:pick(ACCENT),
    pants: pick(CLOTH),
    build: rnd(0.85,1.25),
    tall:  rnd(0.9,1.1),
    hat:   Math.random()< (female?0.45:0.4)
             ? (female? pick(['kerchief','kerchief','hat']) : pick(['cap','hat','ushanka']))
             : 'none',
    longHair: female ? Math.random()<0.8 : Math.random()<0.12,
    beard: !female && Math.random()<0.4,
    glasses: Math.random()<0.18,
    bagHand: Math.random()<0.35,
  };
}

// Несколько человек разом — если ставить их в случайные точки, они слипаются
// в одну кучу и кисти становятся неразличимы. Берём самое свободное место.
function freeLane(lo, hi){
  const busy = G.people.filter(p=>!p.dead).map(p=>p.laneX);
  const n = MAX_ON_SCREEN;                 // мест ровно столько, сколько людей влезает
  const start = rint(0, n-1);              // случайный обход: иначе пустая сцена
  let best = lo, bestGap = -1;             // всегда заполняется слева направо
  for(let k=0;k<n;k++){
    const i = (start+k)%n;
    const x = lo + (hi-lo)*(n===1 ? 0.5 : i/(n-1));
    const gap = busy.length ? Math.min(...busy.map(b=>Math.abs(b-x))) : Infinity;
    if(gap>bestGap){ bestGap=gap; best=x; }
  }
  return best + rnd(-(hi-lo)*0.025, (hi-lo)*0.025);
}

// Сколько покупателей вправе стоять у прилавка прямо сейчас: строго один в начале
// смены, до MAX_ON_SCREEN к концу. Кривизна набора — уровневая: главный источник
// сложности не окно реакции, а поток. Окно ограничено снизу 0.35 с, а вот
// сколько рук тянется одновременно — упирается только в скорость игрока.
function crowdCap(prog){
  const c = (G.diff && G.diff.crowd) || 1;
  return 1 + Math.floor(Math.pow(clamp(prog,0,1), c)*(MAX_ON_SCREEN-0.001));
}

// Чем плотнее толпа, тем мельче фигуры — иначе впятером они не помещаются
// по ширине и перекрывают друг другу кисти. Множитель фиксируется при появлении
// и с человеком не меняется, иначе фигура прыгала бы в размере на глазах.
function crowdScale(prog){
  return lerp(1.0, 0.80, (crowdCap(prog)-1)/(MAX_ON_SCREEN-1));
}

function spawnCustomer(){
  const d = G.diff;
  const prog = shiftProgress();
  const grab = rampWindow(d.grab, prog);
  // Походка выдаёт хватку: к концу смены народ и подходит, и хватает быстрее.
  const approach = lerp(2.40, 0.70, prog);

  const laneX = freeLane(W*0.09, W*0.91);
  const fromX = lerp(W*0.5, laneX, 0.25) + rnd(-W*0.06, W*0.06);
  const sizeK = crowdScale(prog);

  G.people.push({
    kind:'customer', state:'approach', t:0,
    approach, grab, ask:ASK_TIME,
    z:0, laneX, fromX, sizeK,
    look: makeAppearance(),
    arm: Math.random()<0.5 ? -1 : 1,   // какой рукой тянется
    targetSlot:null,
    bubble:null, bubbleT:0,
    dead:false, leave:0,
    handHit:false, bruised:false, stumpBlood:0,
  });
  G.customersSpawned++;
  G.sinceThief++;
}

function spawnThief(){
  const d = G.diff;
  const prog = shiftProgress();
  // Сетка мест у вора та же, что у покупателей: две разные сетки давали пары
  // фигур в 30 пикселях друг от друга, и кисти сливались.
  const laneX = freeLane(W*0.09, W*0.91);
  G.people.push({
    kind:'thief', state:'run', t:0, sizeK: crowdScale(prog),
    approach: lerp(0.95, 0.60, prog),
    flee: rampWindow(d.flee, prog),
    z:0, laneX, fromX: lerp(W*0.5, laneX, 0.3),
    look: makeAppearance(),
    bubble:null, bubbleT:0,
    stabbed:false, dead:false, leave:0, fallT:0,
  });
  G.sinceThief = 0;
}

