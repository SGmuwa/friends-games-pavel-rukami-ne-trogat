/* ═════════════════════════════════════════════════════════════════════
   14. ЭКРАНЫ И УПРАВЛЕНИЕ ИГРОЙ
   ═════════════════════════════════════════════════════════════════════ */
const el = id=>document.getElementById(id);
const show = (id,on)=> el(id).classList.toggle('hidden', !on);

function startGame(diffKey){
  G.diff = DIFFICULTY[diffKey];
  G.mode='play';
  G.score=0;
  G.bundles=G.diff.startBundles;
  G.timeLeft=SHIFT_SECONDS;
  G.people.length=0; G.blood.length=0; G.splats.length=0; G.debris.length=0;
  G.pops.length=0; G.knives.length=0; G.slashes.length=0;
  G.fireworks.length=0; G.crows.length=0;
  G.spawnTimer=0.8; G.customersSpawned=0; G.sinceThief=0;
  G.lastCall=null; G.lastCallTail=0; G.outcomePlanned=null;
  G.outcome=null; G.finaleT=0; G.finaleHold=0; G.musicStarted=false;
  G.shout=null; G.lowWarned=false;
  G.crowNext=0; stopCaws();
  G.stats=freshStats();

  show('scrMenu',false); show('scrShop',false);
  show('scrFinale',false); show('scrStats',false);
  el('hud').classList.remove('hidden');
  el('btnShop').disabled = false;
  fitHud();                     // измерять можно только когда HUD показан
  Sound.stopMusic();
}

function openShop(reason){
  // В концовке лавка закрыта: исход смены уже определён, закупкой его не поменять.
  if(G.mode!=='play' || G.lastCall) return;
  G.mode='shop';
  el('shopReason').textContent = reason || 'Игра на паузе. Таймер смены стоит.';
  refreshShop();
  show('scrShop',true);
}
function refreshShop(){
  const price=G.diff.price;
  const canBuy = Math.max(0, Math.floor(G.score/price));
  el('shopInfo').innerHTML =
    `Пучок травы — <b>${price}</b> очков.<br>` +
    `У тебя <b>${G.score}</b> очков и <b>${G.bundles}</b> пучков.<br>` +
    (canBuy>0
      ? `Хватит на <b>${canBuy}</b> ${plural(canBuy,'пучок','пучка','пучков')}.`
      : `<span class="low">Очков на закупку не хватает.</span>`);
  el('buy1').disabled  = G.score<price;
  el('buy5').disabled  = G.score<price*5;
  el('buyMax').disabled= canBuy<1;
  el('btnResume').disabled = (G.bundles===0);
  el('btnResume').textContent = G.bundles===0 ? 'Без товара за прилавок нельзя' : 'За прилавок!';
}
function buy(n){
  const price=G.diff.price;
  const k=Math.min(n, Math.floor(G.score/price));
  if(k<=0) return;
  G.score -= k*price;
  G.bundles += k;
  G.stats.bought += k; G.stats.spent += k*price;
  Sound.cash();
  refreshShop(); syncHud();
}
function closeShop(){
  G.mode='play';
  show('scrShop',false);
  // Товара нет и купить не смог — смена доигрывается до последнего покупателя,
  // а потом закрывается поражением.
  if(G.bundles===0) beginLastCall('stock');
}

function endGame(outcome){
  G.outcome=outcome;
  G.mode='finale';
  G.finaleT=0;
  el('hud').classList.add('hidden');
  show('scrShop',false);
  show('scrFinale',true);

  // Сперва фраза продавца, и только когда он договорит — салют или вороны.
  // Иначе музыка и карканье забивают реплику ровно в момент её произнесения.
  const finalLine = outcome==='win' ? 'win_line' : 'lose_line';
  Sound.say(finalLine, {vol:1.0});
  G.shout = {text: TEXT[finalLine], age:0, life:3.4};
  G.finaleHold = Sound.dur(finalLine) + 0.25;

  if(outcome==='win'){
    Sound.stopMusic();
  }else{
    Sound.stopMusic();
    G.crows.length=0;
    G.crowNext=0;
    const n=rint(3,4);
    for(let i=0;i<n;i++){
      const baseY = counterY() - H*0.012 - (i%2)*H*0.006;
      G.crows.push({x: W*(0.14+i*0.24)+rnd(-W*0.03,W*0.03), y:baseY, baseY,
                    size:H*0.030+rnd(0,H*0.008), t:0, ph:rnd(0,6.28)});
    }
  }
  saveBest();
}

function saveBest(){
  try{
    const key='ruki_best_'+G.diff.key;
    const prev = parseInt(localStorage.getItem(key)||'-999999',10);
    if(G.score>prev) localStorage.setItem(key, String(G.score));
  }catch(e){}
}
function bestOf(k){
  try{
    const v=localStorage.getItem('ruki_best_'+k);
    return v===null?null:parseInt(v,10);
  }catch(e){ return null; }
}
/* Правила в меню написаны про мачете и нож. В мягком режиме оружие другое,
   и текст обязан совпадать с тем, что игрок увидит на экране. */
const MODE_TEXT = {
  howWeapon: ['руби мачете',       'бей свёрнутой газетой'],
  howThief:  ['метай нож в спину', 'метай в спину бумажный ком'],
  howHit:    ['Отрубил руку',      'Отшлёпал по рукам'],
};
function syncModeTexts(){
  const i = OPT.gentle ? 1 : 0;
  for(const id in MODE_TEXT) el(id).textContent = MODE_TEXT[id][i];
}

function refreshBestLine(){
  const parts=[];
  for(const k of ['easy','normal','hard']){
    const b=bestOf(k);
    if(b!==null) parts.push(`${DIFFICULTY[k].name}: <b>${b}</b>`);
  }
  el('bestLine').innerHTML = parts.length ? 'Твои рекорды — '+parts.join(' · ') : '';
}

function showStats(){
  show('scrFinale',false);
  Sound.stopMusic();
  stopCaws();                 // ушёл со сцены — стая замолкает
  G.mode='stats';
  const s=G.stats, win=G.outcome==='win';
  el('statsTitle').textContent = win ? '🌿 Смена отработана' : '💀 Смена сорвана';
  el('statsSub').textContent = win
    ? `Уровень «${G.diff.name}». Прилавок выстоял всю смену.`
    : `Уровень «${G.diff.name}». Товар кончился, торговать нечем.`;
  const rows=[
    [OPT.gentle ? 'Отшлёпано по рукам' : 'Покалечено покупателей', s.maimed],
    ['Успели убрать руку', s.withdrew],
    ['Наказано воров', s.thievesPunished],
    ['Сбежало воров', s.thievesEscaped],
    ['Продано пучков', s.sold],
    ['Испорчено пучков', s.spoiled],
    ['Украдено пучков', s.stolen],
    ['Закуплено пучков', `${s.bought} (−${s.spent})`],
    ['Осталось пучков', G.bundles],
  ];
  const best=bestOf(G.diff.key);
  let html = rows.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('');
  html += `<tr class="total"><td>Заработано очков</td><td>${G.score}</td></tr>`;
  if(best!==null) html += `<tr><td>Личный рекорд</td><td>${best}</td></tr>`;
  el('statsTable').innerHTML = html;
  show('scrStats',true);
}

function toMenu(){
  G.mode='menu';
  Sound.stopMusic();
  stopCaws();
  show('scrStats',false); show('scrFinale',false); show('scrShop',false);
  el('hud').classList.add('hidden');
  refreshBestLine();
  show('scrMenu',true);
}

function plural(n,one,few,many){
  const n10=n%10, n100=n%100;
  if(n10===1 && n100!==11) return one;
  if(n10>=2 && n10<=4 && (n100<10||n100>=20)) return few;
  return many;
}

function syncHud(){
  el('hudScore').textContent = G.score;
  const b=el('hudBundles');
  b.textContent = G.bundles;
  b.parentElement.classList.toggle('low', G.bundles<=3);
  // Время уходит в минус: смена кончилась, но игрок доигрывает последних.
  // Красное число со знаком — единственный сигнал, что идёт уже концовка.
  const over = G.timeLeft < 0;
  const t = Math.ceil(Math.abs(G.timeLeft));
  el('hudTime').textContent =
    `${over?'-':''}${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`;
  el('hudTime').parentElement.classList.toggle('low', over);
}

