/* ═════════════════════════════════════════════════════════════════════
   15. ЦИКЛ И СОБЫТИЯ
   ═════════════════════════════════════════════════════════════════════ */
function resize(){
  DPR = Math.min(window.devicePixelRatio||1, 2);
  W = cv.clientWidth; H = cv.clientHeight;
  cv.width = Math.round(W*DPR); cv.height = Math.round(H*DPR);
  ctx.setTransform(DPR,0,0,DPR,0,0);
  fitHud();
}

/* HUD подгоняется по фактической ширине холста, а не по медиазапросам:
   на узком телефоне кнопка «Лавка» иначе уезжает за правый край. Сначала
   уменьшаем кегль, и только если этого мало — прячем слова, оставив значки. */
function fitHud(){
  const hud = el('hud');
  const base = clamp(W*0.036, 11, 17);
  const fits = ()=> hud.scrollWidth <= hud.clientWidth + 1;
  const set  = fs => hud.style.fontSize = fs.toFixed(1)+'px';

  hud.classList.remove('compact');
  set(base);
  if(fits()) return;

  hud.classList.add('compact');   // сначала прячем слова — это дешевле, чем мельчить
  set(base);
  let fs = base, guard = 0;
  while(!fits() && fs > 9 && guard++ < 30){ fs -= 0.5; set(fs); }
}
window.addEventListener('resize', resize);

/* Цикл кадров умеет останавливаться: в энергосбережении считать салют
   и перерисовывать канву незачем. frameId=0 значит «цикл стоит», и
   loopFrames() не заводит второй параллельный цикл при пробуждении. */
let last = performance.now();
let frameId = 0;
function frame(now){
  frameId = 0;
  if(Power.asleep) return;
  const dt = Math.min(0.05, (now-last)/1000);
  last = now;
  update(dt);
  draw();
  if(G.mode==='play') syncHud();
  loopFrames();
}
function loopFrames(){
  if(!frameId) frameId = requestAnimationFrame(frame);
}

/* ---- полный экран и запрет протяжки страницы ----
   На Android страницу можно утянуть пальцем прямо во время игры: палец
   промахивается мимо руки и вместо удара скроллит экран. Гасим протяжку
   везде, кроме прокручиваемых оверлеев (меню и итоги бывают выше экрана). */
document.addEventListener('touchmove', e=>{
  if(!(e.target instanceof Element) || !e.target.closest('.overlay')) e.preventDefault();
}, {passive:false});
document.addEventListener('gesturestart', e=>e.preventDefault());

function isFullscreen(){
  return !!(document.fullscreenElement || document.webkitFullscreenElement);
}
function goFullscreen(){
  if(isFullscreen()) return;
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if(!req) return;                       // iOS Safari не умеет — там спасает position:fixed
  try{ const r = req.call(el, {navigationUI:'hide'}); if(r && r.catch) r.catch(()=>{}); }
  catch(e){ try{ req.call(el); }catch(_){} }
}
function exitFullscreen(){
  const ex = document.exitFullscreen || document.webkitExitFullscreen;
  if(ex){ try{ const r = ex.call(document); if(r && r.catch) r.catch(()=>{}); }catch(e){} }
}
function syncFullBtn(){ el('btnFull').textContent = isFullscreen() ? '⤡' : '⛶'; }
document.addEventListener('fullscreenchange', ()=>{ syncFullBtn(); resize(); });
document.addEventListener('webkitfullscreenchange', ()=>{ syncFullBtn(); resize(); });

/* ---- энергосбережение ----
   Планшет с игрой забывают на столе включённым: в хорошей концовке салют
   сыплется бесконечно, в остальных экранах всё равно крутится цикл кадров —
   за час устройство успевает нагреться на ровном месте. Поэтому на всех
   экранах, кроме самой смены (меню, лавка-пауза, обе концовки, итоги),
   считаем время без касаний. Через IDLE_SLEEP_SECONDS:
     • останавливаем цикл кадров и глушим звук — греть больше нечем;
     • закрываем экран чёрным полем;
     • ВЫХОДИМ ИЗ ПОЛНОЭКРАННОГО РЕЖИМА — погасить подсветку из браузера
       нельзя, но вне полного экрана система гасит её сама по своему
       таймеру бездействия.
   Будит любое касание, клавиша или колесо; первое событие уходит только на
   пробуждение и до игры не доходит, иначе тычок «проснись» улетел бы ножом
   в спину покупателю или нажал кнопку, случайно оказавшуюся под пальцем.
   В смене не засыпаем никогда: там идёт таймер, и бездействие — часть игры. */
const IDLE_SLEEP_SECONDS = 120;
const IDLE_TICK_MS = 2000;

const Power = {
  asleep:false, since:performance.now(), mode:null, timer:null, guardUntil:0,

  bump(){ this.since = performance.now(); },

  start(){ if(!this.timer) this.timer = setInterval(()=>this.tick(), IDLE_TICK_MS); },
  stop(){ if(this.timer){ clearInterval(this.timer); this.timer = null; } },

  tick(){
    if(this.asleep) return;
    // Смена экрана считается за действие: концовка приходит по таймеру смены,
    // без единого касания, и иначе засыпала бы сразу после появления.
    if(G.mode !== this.mode){ this.mode = G.mode; this.bump(); return; }
    if(G.mode === 'play'){ this.bump(); return; }
    if(performance.now() - this.since >= IDLE_SLEEP_SECONDS*1000) this.sleep();
  },

  sleep(){
    if(this.asleep) return;
    this.asleep = true;
    // Выход из полного экрана перекладывает страницу, а браузер на такую
    // перекладку умеет прислать pointermove под неподвижной мышью — без
    // этой паузы игра просыпалась бы в тот же миг, когда заснула.
    this.guardUntil = performance.now() + 900;
    this.stop();
    if(frameId){ cancelAnimationFrame(frameId); frameId = 0; }
    Sound.stopMusic();
    // Контекст не закрываем: в нём лежат декодированные буферы всех реплик.
    // suspend() останавливает аудиопоток и снимается мгновенно.
    if(Sound.ctx && Sound.ctx.state === 'running'){
      try{ const r = Sound.ctx.suspend(); if(r && r.catch) r.catch(()=>{}); }catch(e){}
    }
    exitFullscreen();
    show('scrSleep', true);
  },

  wake(){
    if(!this.asleep) return;
    this.asleep = false;
    show('scrSleep', false);
    if(Sound.ctx && Sound.ctx.state === 'suspended'){
      try{ const r = Sound.ctx.resume(); if(r && r.catch) r.catch(()=>{}); }catch(e){}
    }
    // Полный экран обратно не просим: в него возвращает кнопка ⛶ или старт
    // следующей смены. Пока игрок думает, пусть система снова вольна гасить экран.
    last = performance.now();   // иначе первым dt пришёл бы весь сон целиком
    this.bump();
    this.start();
    loopFrames();
  },
};

for(const ev of ['pointerdown','pointerup','pointermove','touchstart','keydown','wheel']){
  window.addEventListener(ev, e=>{
    if(Power.asleep){
      if(ev==='pointermove' && performance.now() < Power.guardUntil) return;
      e.preventDefault();
      e.stopPropagation();
      Power.wake();
      return;
    }
    Power.bump();
  }, {capture:true, passive:false});
}
// Возврат на вкладку не будит сам по себе (игрок мог переключиться мимоходом),
// но отсчёт бездействия начинается заново.
document.addEventListener('visibilitychange', ()=>{
  if(document.visibilityState === 'visible') Power.bump();
});

cv.addEventListener('pointerdown', e=>{
  e.preventDefault();
  const r = cv.getBoundingClientRect();
  onPoint(e.clientX-r.left, e.clientY-r.top);
});
cv.addEventListener('contextmenu', e=>e.preventDefault());

document.querySelectorAll('.diffbtn').forEach(b=>{
  b.addEventListener('click', async ()=>{
    goFullscreen();                      // только из жеста пользователя, иначе браузер откажет
    await Sound.init();
    startGame(b.dataset.diff);
  });
});
el('btnFull').addEventListener('click', ()=> isFullscreen() ? exitFullscreen() : goFullscreen());
el('btnShop').addEventListener('click', ()=>openShop());
el('btnResume').addEventListener('click', closeShop);
el('buy1').addEventListener('click', ()=>buy(1));
el('buy5').addEventListener('click', ()=>buy(5));
el('buyMax').addEventListener('click', ()=>buy(999));
el('btnStats').addEventListener('click', showStats);
el('btnAgain').addEventListener('click', ()=>{ goFullscreen(); startGame(G.diff.key); });
el('btnMenu').addEventListener('click', toMenu);
/* Переключатели стоят на двух экранах — в меню и в «Лавке», потому что мешать
   баблы начинают уже посреди смены, а смена ставится на паузу только там.
   Мягкий режим переключается там же и вступает в силу сразу: следующий удар
   уже газетный, ранее пролитая кровь просто досыхает на прилавке. */
function syncOptBtns(){
  document.querySelectorAll('[data-opt]').forEach(b=>{
    const k = b.dataset.opt;
    b.textContent = OPT_LABEL[k] + ': ' + (OPT[k] ? 'вкл' : 'выкл');
    b.classList.toggle('off', !OPT[k]);
  });
}
document.querySelectorAll('[data-opt]').forEach(b=>{
  b.addEventListener('click', ()=>{
    const k = b.dataset.opt;
    OPT[k] = !OPT[k];
    saveOpts();
    syncOptBtns();
    syncModeTexts();
  });
});
el('btnSound').addEventListener('click', ()=>{
  Sound.on = !Sound.on;
  el('btnSound').textContent = Sound.on ? '🔊' : '🔇';
  if(!Sound.on){ Sound.stopMusic(); stopCaws(); }
});
window.addEventListener('keydown', e=>{
  if(e.key==='p'||e.key==='P'||e.key==='з'||e.key==='З'){
    if(G.mode==='play') openShop(); else if(G.mode==='shop') closeShop();
  }
});

/* Отладочный хук. Игре не нужен, но позволяет гонять её из консоли:
   GAME.startGame('normal');  GAME.step(1/60);  GAME.G.bundles = 1;  ...
   step() двигает время принудительно — работает и в фоновой вкладке,
   где requestAnimationFrame заморожен браузером. */
window.GAME = {
  get G(){ return G; },
  DIFFICULTY, Sound,
  step(dt){ update(dt); draw(); if(G.mode==='play') syncHud(); },
  tick(dt){ update(dt); },   // без отрисовки — для быстрых прогонов баланса
  run(seconds, dt=1/60){ for(let i=0;i<Math.round(seconds/dt);i++) this.step(dt); },
  startGame, endGame, onPoint, openShop, closeShop, showStats, beginLastCall,
  handPos, personGeom, OPT,
  Power,   // GAME.Power.sleep() / .wake() — проверять засыпание, не ожидая двух минут
};

resize();
syncFullBtn();
loadOpts();
syncOptBtns();
syncModeTexts();
refreshBestLine();
// Адресная строка Android меняет высоту вьюпорта на лету — пересчитываем канву.
if(window.visualViewport) window.visualViewport.addEventListener('resize', resize);
window.addEventListener('orientationchange', ()=>setTimeout(resize, 250));
Power.start();
loopFrames();
