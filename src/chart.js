const colors = { lag: '#7865DF', lsm: '#0B8F86', original: '#26385C', calculated: '#E0A250', custom: '#26385C' };
function nfmt(v, places=2) { return Number(v.toFixed(places)).toLocaleString('uk-UA'); }
function fmtTick(x){ if(Math.abs(x)>=1000) return nfmt(x,0); if(Math.abs(x)>=10) return nfmt(x,1); return nfmt(x,2); }
function niceBounds(values) {
  const finite = values.filter(Number.isFinite);
  if (!finite.length) return [-1, 1];
  let a = Math.min(...finite), b = Math.max(...finite);
  const delta = b - a || Math.max(1, Math.abs(a)*0.15);
  a -= delta * 0.12; b += delta * 0.12;
  return [a,b];
}
function path(sample, tx, ty) {
  let s = '', open=false;
  for (const p of sample) {
    if (!Number.isFinite(p.y)) { open=false; continue; }
    s += `${open ? 'L' : 'M'}${tx(p.x).toFixed(2)},${ty(p.y).toFixed(2)} `;
    open=true;
  }
  return s.trim();
}
export function drawChart(node, config) {
  const { points, lagSample=[], lsmSample=[], mode='both', small=false, activeIndex=-1, lsmProgress=1, residualProgress=1 } = config;
  const visiblePoints = config.visibleCount === undefined ? points : points.slice(0, config.visibleCount);
  const W=small ? 520 : 960, H=small ? 244 : 378;
  const margin={ top: small?17:28, right:small?17:28, bottom:small?34:45, left:small?50:67};
  const PW=W-margin.left-margin.right, PH=H-margin.top-margin.bottom;
  const drawLag = mode==='both'||mode==='lag';
  const drawLsm = mode==='both'||mode==='lsm';
  const minX=points[0].x, maxX=points[points.length-1].x;
  // Автоматично визначаємо Y за усіма видимими кривими та точками, включно з проміжними кадрами.
  const allY=[...visiblePoints.map(p=>p.y)];
  if(drawLag) allY.push(...lagSample.map(p=>p.y));
  const meanY = points.reduce((sum,p)=>sum+p.y,0)/points.length;
  const adjustedLsm = lsmSample.map(p=>({x:p.x,y:meanY+(p.y-meanY)*lsmProgress}));
  if(drawLsm) allY.push(...adjustedLsm.map(p=>p.y));
  const [ymin,ymax]=niceBounds(allY);
  const xwidth=maxX-minX;
  const tx=x=>margin.left+(x-minX)/xwidth*PW;
  const ty=y=>margin.top+(ymax-y)/(ymax-ymin)*PH;
  let markup='';
  for(let i=0;i<=5;i++){
    const y=margin.top+PH*i/5, val=ymax-(ymax-ymin)*i/5;
    markup+=`<line x1="${margin.left}" y1="${y}" x2="${W-margin.right}" y2="${y}" stroke="#E5EAF2" stroke-dasharray="3 5"/>`;
    markup+=`<text x="${margin.left-9}" y="${y+4}" text-anchor="end" class="chart-tick">${fmtTick(val)}</text>`;
  }
  for(let i=0;i<=5;i++){
    const x=margin.left+PW*i/5, val=minX+xwidth*i/5;
    markup+=`<line x1="${x}" y1="${margin.top}" x2="${x}" y2="${H-margin.bottom}" stroke="#E5EAF2" stroke-dasharray="3 5"/>`;
    markup+=`<text x="${x}" y="${H-margin.bottom+21}" text-anchor="middle" class="chart-tick">${fmtTick(val)}</text>`;
  }
  markup+=`<line x1="${margin.left}" y1="${H-margin.bottom}" x2="${W-margin.right}" y2="${H-margin.bottom}" stroke="#A2AEC2"/>`;
  markup+=`<line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${H-margin.bottom}" stroke="#A2AEC2"/>`;
  markup+=`<text x="${W-margin.right}" y="${H-5}" text-anchor="end" class="axis-name">X</text>`;
  markup+=`<text x="15" y="${margin.top+1}" class="axis-name">Y</text>`;
  if(drawLag && lagSample.length) markup+=`<path d="${path(lagSample,tx,ty)}" fill="none" stroke="${colors.lag}" stroke-width="${small?2.5:3.2}" stroke-linejoin="round" stroke-linecap="round"/>`;
  if(drawLsm && adjustedLsm.length) markup+=`<path d="${path(adjustedLsm,tx,ty)}" fill="none" stroke="${colors.lsm}" stroke-width="${small?2.5:3.2}" stroke-linejoin="round" stroke-linecap="round"/>`;
  if(drawLsm && residualProgress>0 && lsmSample.length && config.predict){
    const count=Math.ceil(points.length*residualProgress);
    for(const p of points.slice(0,count)) {
      const yy=meanY+(config.predict(p.x)-meanY)*lsmProgress;
      markup+=`<line x1="${tx(p.x)}" x2="${tx(p.x)}" y1="${ty(p.y)}" y2="${ty(yy)}" stroke="${colors.lsm}" stroke-width="1.7" opacity="0.6" stroke-dasharray="4 3"/>`;
    }
  }
  visiblePoints.forEach((p,i)=>{
    const r=i===activeIndex?(small?6:8):(small?3.5:5);
    const fill= i===activeIndex?colors.lag:colors[p.origin]||colors.original;
    const error=config.predict? p.y-config.predict(p.x):0;
    markup+=`<circle cx="${tx(p.x)}" cy="${ty(p.y)}" r="${r}" fill="${fill}" stroke="white" stroke-width="${small?1:2}" class="point-dot"><title>x = ${nfmt(p.x,3)}; y = ${nfmt(p.y,3)}; залишок МНК = ${nfmt(error,4)}${p.origin==='calculated'?'; додано розрахунком':''}</title></circle>`;
  });
  node.innerHTML=`<svg class="plot" viewBox="0 0 ${W} ${H}" role="img" aria-label="Графік інтерполяції та МНК" xmlns="http://www.w3.org/2000/svg">${markup}</svg>`;
}
export function drawResidual(node,points,predict){
  const W=960,H=220, m={top:20,bottom:34,left:67,right:28};
  const minX=points[0].x,maxX=points[points.length-1].x;
  const errs=points.map(p=>p.y-predict(p.x));
  const size=Math.max(...errs.map(Math.abs),0.01)*1.22;
  const tx=x=>m.left+(x-minX)/(maxX-minX)*(W-m.left-m.right);
  const ty=e=>m.top+(size-e)/(2*size)*(H-m.top-m.bottom);
  let s=`<line x1="${m.left}" y1="${ty(0)}" x2="${W-m.right}" y2="${ty(0)}" stroke="#8391a5" stroke-width="1.5"/><text x="${m.left-12}" y="${ty(0)+4}" text-anchor="end" class="chart-tick">0</text>`;
  for(let i=0;i<=4;i++) { const val=size-(2*size)*i/4; const y=ty(val); s+=`<line x1="${m.left}" y1="${y}" x2="${W-m.right}" y2="${y}" stroke="#E5EAF2" stroke-dasharray="3 5"/><text x="${m.left-12}" y="${y+4}" text-anchor="end" class="chart-tick">${fmtTick(val)}</text>`; }
  points.forEach((p,i)=> { const x=tx(p.x),y=ty(errs[i]);s+=`<line x1="${x}" x2="${x}" y1="${ty(0)}" y2="${y}" stroke="${colors.lsm}" stroke-width="3"/><circle cx="${x}" cy="${y}" r="4" fill="${colors.lsm}"><title>x=${nfmt(p.x,3)}, залишок=${nfmt(errs[i],4)}</title></circle>`; });
  s+=`<text x="${W-m.right}" y="${H-4}" text-anchor="end" class="axis-name">X</text>`;
  node.innerHTML=`<svg class="plot" viewBox="0 0 ${W} ${H}" role="img" aria-label="Діаграма залишків МНК" xmlns="http://www.w3.org/2000/svg">${s}</svg>`;
}
