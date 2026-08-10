/* ═════════════════════════════════════════════════════════════════════
   4. СОСТОЯНИЕ ИГРЫ
   ═════════════════════════════════════════════════════════════════════ */
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
let W=0, H=0, DPR=1;

const G = {
  mode:'menu',            // menu | play | shop | finale | stats
  diff:DIFFICULTY.normal,
  score:0, bundles:10,
  timeLeft:SHIFT_SECONDS,
  people:[],              // покупатели и воры
  blood:[],               // частицы крови
  splats:[],              // пятна на прилавке
  debris:[],              // отрубленные руки, выпавшие пучки
  pops:[],                // всплывающие очки
  knives:[],              // летящие ножи
  slashes:[],             // росчерки мачете
  fireworks:[],
  crows:[],
  spawnTimer:1.0,
  customersSpawned:0,
  sinceThief:0,
  lastCall:null,          // null | 'time' | 'stock' — стадия «до последнего покупателя»
  lastCallTail:0,         // сколько уже держим пустую сцену перед концовкой
  outcomePlanned:null,    // каким будет финал, когда стадия доиграет
  outcome:null,           // 'win' | 'lose'
  finaleT:0,
  crowNext:0,             // когда каркнуть в следующий раз (сек от конца реплики)
  stats:null,
};

function freshStats(){
  return {maimed:0, withdrew:0, thievesPunished:0, thievesEscaped:0,
          sold:0, spoiled:0, stolen:0, bought:0, spent:0};
}

