/* ═════════════════════════════════════════════════════════════════════
   3. МЕЛОЧИ
   ═════════════════════════════════════════════════════════════════════ */
const rnd  = (a,b)=> a + Math.random()*(b-a);
const rint = (a,b)=> Math.floor(rnd(a,b+1));
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
const clamp= (v,a,b)=> v<a?a:(v>b?b:v);
const lerp = (a,b,t)=> a+(b-a)*t;
const easeOut = t=> 1-Math.pow(1-t,2);

const SKIN   = ['#e8b98f','#d9a074','#c98a5e','#a9683f','#8a5330','#f0c9a4'];
const HAIR   = ['#2b2118','#4a3524','#6b4a2a','#8d6a3a','#b9975b','#8d8d8d','#d8d2c4','#a33c1c'];
const CLOTH  = ['#7a3b3b','#4c5f7a','#5c6b3f','#7a5c33','#6a4a6b','#3f6b64','#8a6a3a','#59493f',
                '#8c4a2f','#436b45','#5a4a7a','#7d7a52'];
const ACCENT = ['#c9b184','#3f3128','#a8563f','#4d6b7a','#6b6b4d','#8f7a5c'];

