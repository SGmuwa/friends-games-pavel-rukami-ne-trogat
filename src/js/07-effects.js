/* ═════════════════════════════════════════════════════════════════════
   7. ЭФФЕКТЫ
   ═════════════════════════════════════════════════════════════════════ */
/* Брызги. В мягком режиме из точки удара летит не кровь, а обрывки газеты:
   их меньше, они легче (своя гравитация) и пятен на прилавке не оставляют. */
function bloodBurst(x,y,scale,amount,dir){
  const soft = OPT.gentle;
  const n = soft ? Math.max(3, Math.round(amount*0.35)) : amount;
  for(let i=0;i<n;i++){
    const a = dir!==undefined ? dir + rnd(-0.9,0.9) : rnd(0,Math.PI*2);
    const sp = rnd(60,420)*Math.max(0.45,scale)*(soft?0.55:1);
    G.blood.push({
      x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp - rnd(30,160)*scale,
      r: rnd(2,7)*Math.max(0.5,scale), life:rnd(0.5,1.4), age:0,
      paper: soft, grav: soft ? 260 : 900,
    });
  }
}
function addSplat(x,y,r){
  if(OPT.gentle) return;              // пятен крови в мягком режиме не бывает
  G.splats.push({x,y,r,age:0,life:14, seed:Math.random()*99});
  if(G.splats.length>70) G.splats.shift();
}
function pop(x,y,text,color){
  G.pops.push({x,y,text,color,age:0,life:1.2});
}

/* Крик продавца. Бабла у него быть не может — продавец это сам игрок, его на сцене
   нет. Поэтому реплика идёт плашкой над прилавком, как субтитр собственного голоса. */
function shout(pool, {voice=true, name=null}={}){
  const n = name || pickLine(pool);
  if(voice) Sound.say(n, {vol:1.0});
  G.shout = {text: TEXT[n] || '', age:0, life:1.6};
  return n;
}

