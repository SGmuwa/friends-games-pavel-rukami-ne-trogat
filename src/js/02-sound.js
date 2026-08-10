/* ═════════════════════════════════════════════════════════════════════
   2. ЗВУК
   ═════════════════════════════════════════════════════════════════════ */
const AUDIO_B64 = /*__AUDIO__*/{};

/* Пулы реплик. Из пула тянется случайная, подряд одна и та же не повторяется.
   Реплики покупателя выбираются по полу — мужские и женские записаны отдельно. */
const LINES = {
  chop:  ['chop1','chop2','chop3','chop4','chop5'],   // продавец рубит руку
  ask_f: ['ask_f1','ask_f2'],                          // покупательница подошла
  ask_m: ['ask_m1','ask_m2'],                          // покупатель подошёл
  miss_f:['miss_f1','miss_f2'],                        // она успела убрать руку
  miss_m:['miss_m1','miss_m2'],                        // он успел убрать руку
  grab:  ['grab1','grab2','grab3'],                    // вор схватил пучок
  stab:  ['stab1','stab2'],                            // нож вошёл вору в спину
  esc:   ['esc1','esc2'],                              // вор ушёл с пучком
  low:   ['low1','low2'],                              // пучки заканчиваются
  crow:  ['crow0','crow1','crow2'],                    // карканье на поражении
};

/* Текст реплик — дублируется баблами и плашкой, чтобы игра читалась без звука. */
const TEXT = {
  chop1:'Руками не трогать!', chop2:'Соблюдай порядок!', chop3:'А ну не лапай!',
  chop4:'Куда лезешь?',       chop5:'Грабли убери!',
  ask_f1:'А сколько стоит?',  ask_f2:'Продайте это',
  ask_m1:'Почём?',            ask_m2:'Дайте понюхать!',
  miss_m1:'Ну ты чё, аккуратнее?', miss_m2:'Осторожнее!',
  miss_f1:'Размахался!',           miss_f2:'Ай! Ну ты чё?',
  grab1:'Держи его!',   grab2:'Куда?!',        grab3:'Стой!',
  stab1:'Не воруй!',    stab2:'Беги, лечись!',
  esc1:'Шарапова на тебя нет!', esc2:'Эх! Ты убёг!',
  low1:'Пучки заканчиваются',   low2:'Кончаются пучёчки',
  stock_out:'Ну как так-то?',
  last_call:'Смена окончена! Дообслужу последних.',
  win_line:'Смена отработана! Всех обслужил!',
  lose_line:'Я разорён',
};

const lastLine = {};
function pickLine(pool){
  const arr = LINES[pool];
  let i = rint(0, arr.length-1);
  if(arr.length>1 && i===lastLine[pool]) i = (i+1)%arr.length;
  lastLine[pool] = i;
  return arr[i];
}

const Sound = {
  ctx:null, buf:{}, on:true, ready:false, voices:[], music:null, musicGain:null,

  async init(){
    if(this.ctx) { if(this.ctx.state==='suspended') await this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return;
    this.ctx = new AC();
    if(this.ctx.state==='suspended') await this.ctx.resume();
    const jobs = Object.entries(AUDIO_B64).map(async ([name, b64])=>{
      try{
        const bin = atob(b64);
        const arr = new Uint8Array(bin.length);
        for(let i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i);
        this.buf[name] = await this.ctx.decodeAudioData(arr.buffer);
      }catch(e){ console.warn('не декодировался звук', name, e); }
    });
    await Promise.all(jobs);
    this.ready = true;
  },

  play(name, {vol=1, rate=1}={}){
    if(!this.on || !this.ctx || !this.buf[name]) return null;
    const s = this.ctx.createBufferSource();
    s.buffer = this.buf[name];
    s.playbackRate.value = rate;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    s.connect(g).connect(this.ctx.destination);
    s.start();
    return {src:s, gain:g};
  },

  // Реплики: держим максимум 3 одновременно, чтобы толпа не превращалась в кашу.
  say(name, opts){
    const h = this.play(name, opts);
    if(!h) return;
    this.voices.push(h);
    h.src.onended = ()=>{ const i=this.voices.indexOf(h); if(i>=0) this.voices.splice(i,1); };
    while(this.voices.length>3){
      const old = this.voices.shift();
      try{ old.src.stop(); }catch(e){}
    }
  },
  busy(){ return this.voices.length; },
  dur(name){ return (this.buf[name] && this.buf[name].duration) || 0; },

  playMusic(name){
    this.stopMusic();
    const h = this.play(name, {vol:0.85});
    if(h) this.music = h;
  },
  stopMusic(){
    if(this.music){ try{ this.music.src.stop(); }catch(e){} this.music=null; }
  },

  /* ---- синтезированные эффекты, файлов не требуют ---- */
  noiseBuf(dur){
    const n = Math.floor(this.ctx.sampleRate*dur);
    const b = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = b.getChannelData(0);
    for(let i=0;i<n;i++) d[i] = Math.random()*2-1;
    return b;
  },
  // «Вжух» — взмах мачете
  swish(){
    if(!this.on||!this.ctx) return;
    const t=this.ctx.currentTime, s=this.ctx.createBufferSource();
    s.buffer=this.noiseBuf(0.22);
    const f=this.ctx.createBiquadFilter(); f.type='bandpass'; f.Q.value=1.6;
    f.frequency.setValueAtTime(700,t); f.frequency.exponentialRampToValueAtTime(3800,t+0.13);
    const g=this.ctx.createGain();
    g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(0.5,t+0.03);
    g.gain.exponentialRampToValueAtTime(0.0001,t+0.22);
    s.connect(f).connect(g).connect(this.ctx.destination); s.start(t); s.stop(t+0.24);
  },
  // «Фьючь» — свист летящего ножа
  whistle(){
    if(!this.on||!this.ctx) return;
    const t=this.ctx.currentTime, o=this.ctx.createOscillator();
    o.type='triangle';
    o.frequency.setValueAtTime(2100,t);
    o.frequency.exponentialRampToValueAtTime(420,t+0.26);
    const g=this.ctx.createGain();
    g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(0.22,t+0.03);
    g.gain.exponentialRampToValueAtTime(0.0001,t+0.28);
    o.connect(g).connect(this.ctx.destination); o.start(t); o.stop(t+0.3);
  },
  // «Чвак» — мачете вошло
  chop(){
    if(!this.on||!this.ctx) return;
    const t=this.ctx.currentTime, s=this.ctx.createBufferSource();
    s.buffer=this.noiseBuf(0.18);
    const f=this.ctx.createBiquadFilter(); f.type='lowpass';
    f.frequency.setValueAtTime(1600,t); f.frequency.exponentialRampToValueAtTime(180,t+0.16);
    const g=this.ctx.createGain();
    g.gain.setValueAtTime(0.6,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.18);
    s.connect(f).connect(g).connect(this.ctx.destination); s.start(t); s.stop(t+0.2);
    const o=this.ctx.createOscillator(); o.type='sine';
    o.frequency.setValueAtTime(120,t); o.frequency.exponentialRampToValueAtTime(45,t+0.15);
    const g2=this.ctx.createGain();
    g2.gain.setValueAtTime(0.4,t); g2.gain.exponentialRampToValueAtTime(0.0001,t+0.2);
    o.connect(g2).connect(this.ctx.destination); o.start(t); o.stop(t+0.22);
  },
  // «Шлёп» — свёрнутая газета по рукам. Короткий и без низа: газета шлёпает,
  // а не рубит, поэтому от «чвака» остаётся только верх спектра.
  slap(){
    if(!this.on||!this.ctx) return;
    const t=this.ctx.currentTime, s=this.ctx.createBufferSource();
    s.buffer=this.noiseBuf(0.13);
    const f=this.ctx.createBiquadFilter(); f.type='bandpass'; f.Q.value=0.8;
    f.frequency.setValueAtTime(2400,t); f.frequency.exponentialRampToValueAtTime(800,t+0.10);
    const g=this.ctx.createGain();
    g.gain.setValueAtTime(0.5,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.13);
    s.connect(f).connect(g).connect(this.ctx.destination); s.start(t); s.stop(t+0.15);
  },
  // «Пух» — бумажный ком в спину: тише и выше, чем глухой удар ножа
  paperHit(){
    if(!this.on||!this.ctx) return;
    const t=this.ctx.currentTime, s=this.ctx.createBufferSource();
    s.buffer=this.noiseBuf(0.17);
    const f=this.ctx.createBiquadFilter(); f.type='lowpass';
    f.frequency.setValueAtTime(1300,t); f.frequency.exponentialRampToValueAtTime(320,t+0.14);
    const g=this.ctx.createGain();
    g.gain.setValueAtTime(0.34,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.17);
    s.connect(f).connect(g).connect(this.ctx.destination); s.start(t); s.stop(t+0.19);
  },
  // «Дзинь» — касса, пучок продан
  cash(){
    if(!this.on||!this.ctx) return;
    const t=this.ctx.currentTime;
    [1318,1976].forEach((fr,i)=>{
      const o=this.ctx.createOscillator(); o.type='sine'; o.frequency.value=fr;
      const g=this.ctx.createGain();
      g.gain.setValueAtTime(0.0001,t+i*0.05);
      g.gain.exponentialRampToValueAtTime(0.2,t+i*0.05+0.01);
      g.gain.exponentialRampToValueAtTime(0.0001,t+i*0.05+0.35);
      o.connect(g).connect(this.ctx.destination); o.start(t+i*0.05); o.stop(t+i*0.05+0.4);
    });
  },
  // Глухой удар — нож вошёл в спину
  thud(){
    if(!this.on||!this.ctx) return;
    const t=this.ctx.currentTime, o=this.ctx.createOscillator(); o.type='sine';
    o.frequency.setValueAtTime(180,t); o.frequency.exponentialRampToValueAtTime(55,t+0.18);
    const g=this.ctx.createGain();
    g.gain.setValueAtTime(0.5,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.24);
    o.connect(g).connect(this.ctx.destination); o.start(t); o.stop(t+0.26);
  },
  // Штрафной зуммер
  buzz(){
    if(!this.on||!this.ctx) return;
    const t=this.ctx.currentTime, o=this.ctx.createOscillator(); o.type='square';
    o.frequency.setValueAtTime(180,t); o.frequency.linearRampToValueAtTime(120,t+0.22);
    const g=this.ctx.createGain();
    g.gain.setValueAtTime(0.14,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.26);
    o.connect(g).connect(this.ctx.destination); o.start(t); o.stop(t+0.28);
  },
  // Разрыв фейерверка
  boom(){
    if(!this.on||!this.ctx) return;
    const t=this.ctx.currentTime, s=this.ctx.createBufferSource();
    s.buffer=this.noiseBuf(0.5);
    const f=this.ctx.createBiquadFilter(); f.type='lowpass';
    f.frequency.setValueAtTime(2400,t); f.frequency.exponentialRampToValueAtTime(160,t+0.45);
    const g=this.ctx.createGain();
    g.gain.setValueAtTime(0.35,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.5);
    s.connect(f).connect(g).connect(this.ctx.destination); s.start(t); s.stop(t+0.52);
  },
};

