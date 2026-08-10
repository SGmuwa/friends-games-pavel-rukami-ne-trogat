/* ═════════════════════════════════════════════════════════════════════
   5. ГЕОМЕТРИЯ СЦЕНЫ (псевдо-3D через масштаб)
   ═════════════════════════════════════════════════════════════════════ */
const horizonY   = ()=> H*0.44;
const counterY   = ()=> H*0.72;      // верхняя кромка прилавка
const ropeY      = ()=> H*0.075;     // верёвка с пучками

// z: 0 — далеко у горизонта, 1 — вплотную к прилавку
const scaleAt = z => 0.17 + 0.83*Math.pow(z, 1.55);
const feetAt  = z => horizonY() + (H*0.98 - horizonY())*Math.pow(z, 1.7);
const heightAt= z => H*0.55*scaleAt(z);

function bundleSlots(){
  const n = Math.min(G.bundles, MAX_HANGING);
  const out=[];
  if(n<=0) return out;
  const left=W*0.09, right=W*0.91;
  for(let i=0;i<n;i++){
    const t = n===1 ? 0.5 : i/(n-1);
    out.push({x: lerp(left,right,t), y: ropeY() + H*0.015 + (i%2)*H*0.018});
  }
  return out;
}

