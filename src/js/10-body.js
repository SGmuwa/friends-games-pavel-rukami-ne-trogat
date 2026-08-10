/* ═════════════════════════════════════════════════════════════════════
   10. ПОЗИЦИИ ЧАСТЕЙ ТЕЛА
   ═════════════════════════════════════════════════════════════════════ */
function personGeom(p){
  const z = p.z;
  const sc = scaleAt(z);
  const hFull = heightAt(z)*p.look.tall;
  const h  = hFull*(p.sizeK||1);
  const x  = lerp(p.fromX, p.laneX, easeOut(z));
  // Мелкий масштаб толпы отсчитываем от ЛИНИИ ГОЛОВЫ, а не от ног: иначе фигура
  // уменьшается вниз и тонет за прилавком, оставляя на виду одну макушку.
  const feet = feetAt(z) - (hFull - h)*0.90;
  return {
    x, feet, h, sc,
    shoulderY: feet - h*0.79,
    hipY:      feet - h*0.44,
    headY:     feet - h*0.90,
    headR:     h*0.095,
    bodyW:     h*0.185*p.look.build,
  };
}

// Точка кисти тянущейся руки
function handPos(p){
  const g = personGeom(p);
  const sx = g.x + g.bodyW*0.55*p.arm;
  const sy = g.shoulderY + g.h*0.04;
  if(p.state!=='reach' || !p.targetSlot) return {x:sx, y:sy, g};
  const t = easeOut(clamp(p.t/p.grab, 0, 1));
  return {
    x: lerp(sx, p.targetSlot.x, t),
    y: lerp(sy, p.targetSlot.y + H*0.03, t),
    g,
  };
}

