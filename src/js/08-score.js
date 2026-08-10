/* ═════════════════════════════════════════════════════════════════════
   8. ОЧКИ И ПУЧКИ
   ═════════════════════════════════════════════════════════════════════ */
function addScore(n){ G.score += n; }

function loseBundle(reason){
  G.bundles = Math.max(0, G.bundles-1);
  checkLowStock();
  if(G.bundles===0) checkOutOfStock();
}

// Предупреждение о тающем запасе. Срабатывает один раз на пересечение порога,
// иначе продавец начинает причитать над каждым проданным пучком.
// В концовке молчит: докупиться уже нельзя, предупреждать не о чем.
function checkLowStock(){
  if(G.mode!=='play' || G.lastCall) return;
  if(G.bundles>0 && G.bundles<=3 && !G.lowWarned){
    G.lowWarned = true;
    shout('low');
  }else if(G.bundles>=5){
    G.lowWarned = false;
  }
}

function checkOutOfStock(){
  if(G.bundles>0 || G.mode!=='play') return;
  shout(null, {name:'stock_out'});
  if(G.lastCall){
    // Концовка уже идёт — докупаться поздно. Победу отнимает не сам факт нуля,
    // а люди, которым после этого нечего продать: если пучок ушёл на последнем
    // покупателе и сцена пуста, смена всё равно считается отработанной.
    if(G.lastCall==='time' && lastCallPending()) G.outcomePlanned='lose';
    return;
  }
  if(G.score >= G.diff.price){
    openShop('Товар кончился! Закупись, иначе смена сорвана.');
  }else{
    beginLastCall('stock');
  }
}

/* ─────────────────────────────────────────────────────────────────────
   Стадия «работа до последнего покупателя/вора».
   Начинается, когда смена по сути закончилась: истёк таймер либо кончилась
   трава и купить новую не на что. Новых людей не появляется, уже пришедшие
   доигрывают своё и расходятся — и только потом идёт концовка. Так игрок
   видит, чем всё закончилось, а не обрывается на полудвижении.
   ───────────────────────────────────────────────────────────────────── */
function beginLastCall(reason){
  if(G.lastCall || G.mode!=='play') return;
  G.lastCall = reason;                    // 'time' | 'stock'
  G.lastCallTail = 0;
  // Таймер добил до нуля — смена отработана; трава кончилась — отыграться нельзя.
  G.outcomePlanned = reason==='time' ? 'win' : 'lose';
  el('btnShop').disabled = true;          // лавка закрыта: исход уже определён
  if(reason==='time') shout(null, {voice:false, name:'last_call'});
}

// Есть ли ещё люди, которым нужен товар: покупатель до ухода, вор до бегства.
// Отрубленные, огрызающиеся и уходящие сюда не входят — своё они уже получили.
function lastCallPending(){
  return G.people.some(p=> !p.dead && (p.kind==='customer'
    ? (p.state==='approach' || p.state==='ask' || p.state==='reach')
    : (p.state==='run' || p.state==='grab' || p.state==='flee')));
}

function updateLastCall(dt){
  // Сцена ещё живая — ждём. Нож в полёте тоже считается: он может вернуть пучок.
  if(G.people.length || G.knives.length){ G.lastCallTail = 0; return; }
  G.lastCallTail += dt;
  // Дать договорить последнюю реплику, но не ждать её бесконечно.
  const shoutLeft = (G.shout && G.shout.age < G.shout.life) ? G.shout.life - G.shout.age : 0;
  const hold = Math.min(2.5, Math.max(0.5, shoutLeft));
  if(G.lastCallTail < hold) return;
  if(Sound.busy() && G.lastCallTail < 2.5) return;
  endGame(G.outcomePlanned);
}

