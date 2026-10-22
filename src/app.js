import {initialSets} from './data.js';
import {checkPoints,createLagrange,fitLeastSquares,getMetrics,buildSample,parsePoints} from './math.js';
import {drawChart,drawResidual} from './chart.js';
const $ = selector => document.querySelector(selector);
let sets=initialSets(), selected=5,degree=2,mode='both',token=0;
const format=(x,p=4) => Number(x.toFixed(p)).toLocaleString('uk-UA',{minimumFractionDigits:p,maximumFractionDigits:p});
const model = size => {
  const points=checkPoints(sets[size]);
  const lag=createLagrange(points), lsm=fitLeastSquares(points,degree);
  return {points,lag,lsm,lagCurve:buildSample(points,lag),lsmCurve:buildSample(points,lsm.predict),metrics:getMetrics(points,lsm.predict)};
};
function updateEditor(){
  $('#points-input').value=sets[selected].map(p=>`${p.x}, ${p.y}`).join('\n');
  $('#input-error').textContent='';
}
function updateMini() {
  $('#six-charts').innerHTML='';
  for (const count of [5,10,20]) {
    const m=model(count);
    for (const kind of ['lag','lsm']) {
      const card=document.createElement('article');
      card.className='mini-card';
      card.innerHTML=`<div class="mini-header"><strong>${kind==='lag'?'Лагранж':'МНК'} · ${count} точок</strong><span>${kind==='lag'?'Інтерполяція':`Поліном ${degree}-го ступеня`}</span></div><div class="chart-holder"></div>`;
      $('#six-charts').appendChild(card);
      drawChart(card.querySelector('.chart-holder'),{
        points:m.points, lagSample:kind==='lag'?m.lagCurve:[], lsmSample:kind==='lsm'?m.lsmCurve:[],
        mode:kind,small:true, predict:m.lsm.predict, residualProgress:0
      });
    }
  }
}
function updateMetrics(){
  const rows=[];
  for(const count of [5,10,20]){
    const m=model(count);
    rows.push(`<tr class="${count===selected?'selected':''}"><td>${count}</td><td>${format(m.metrics.rmse)}</td><td>${format(m.metrics.mae)}</td><td>${format(m.metrics.r2)}</td></tr>`);
  }
  $('#metrics-body').innerHTML=rows.join('');
}
function updateMain(){
  const m=model(selected);
  $('#chart-size').textContent=selected;
  $('#stat-count').textContent=selected;
  const extra=m.points.filter(p=>p.origin==='calculated').length;
  $('#stat-type').textContent=extra ? `${selected-extra} первинних + ${extra} розрахункові` : m.points.some(p=>p.origin==='custom')?'Власні дані':'Первинні дані';
  $('#stat-rmse').textContent=format(m.metrics.rmse);
  $('#stat-r2').textContent=format(m.metrics.r2);
  $('#stat-max').textContent=format(m.metrics.maxError);
  const cs=m.lsm.coefficients.map((c,i)=>`${i===0?'':c>=0?'+ ':'− '}${format(Math.abs(c),4)}${i?`·t${i===1?'':`^${i}`}`:''}`).join(' ');
  $('#model-formula').textContent=`ŷ = ${cs};  t = (x − ${format(m.lsm.center,2)}) / ${format(m.lsm.scale,2)}`;
  drawChart($('#main-chart'),{...m,lagSample:m.lagCurve,lsmSample:m.lsmCurve,mode,predict:m.lsm.predict,residualProgress:1});
  drawResidual($('#residual-chart'),m.points,m.lsm.predict);
  $('#animation-status').textContent='Готово до дослідження';
}
function stop(){token++;$('#animation-status').textContent='Готово до дослідження';}
function redraw(){stop();updateMain();updateMini();updateMetrics();}
$('.segmented').addEventListener('click',event=>{
  const btn=event.target.closest('button[data-size]');if(!btn)return;
  selected=Number(btn.dataset.size);
  document.querySelectorAll('.seg').forEach(b=>{b.classList.toggle('active',b===btn);b.setAttribute('aria-pressed',String(b===btn));});
  updateEditor();redraw();
});
$('#degree').addEventListener('change',e=>{degree=Number(e.target.value);redraw();});
$('#method').addEventListener('change',e=>{mode=e.target.value;redraw();});
$('#apply-points').addEventListener('click',()=>{
  try{const pts=parsePoints($('#points-input').value,selected);sets[selected]=pts;redraw();updateEditor();}
  catch(e){$('#input-error').textContent=e.message;}
});
$('#reset-data').addEventListener('click',()=>{sets[selected]=initialSets()[selected];updateEditor();redraw();});
$('#stop-animation').addEventListener('click',()=>{redraw();});
function startAnimation(kind){
  stop(); const myToken=token;
  const {points,lsm,lagCurve,lsmCurve}=model(selected),start=performance.now();
  const D=kind==='lag'?points.length*490+450:3300;
  mode=kind;$('#method').value=kind;
  function frame(now){
    if(myToken!==token)return;
    const elapsed=Math.max(0,now-start),progress=Math.min(1,elapsed/D);
    if(kind==='lag'){
      const advance=Math.min(points.length,Math.max(1,1+Math.floor(elapsed/490)));
      const phase=Math.min(1,(elapsed%490)/490);
      const alpha=phase*phase*(3-2*phase); // плавна функція переходу
      const current=points.slice(0,advance);
      const previous=points.slice(0,Math.max(1,advance-1));
      const from=previous.length===1 ? ()=>previous[0].y : createLagrange(previous);
      const to=current.length===1 ? ()=>current[0].y : createLagrange(current);
      const curve=lagCurve.map(p=>({x:p.x,y:from(p.x)*(1-alpha)+to(p.x)*alpha}));
      drawChart($('#main-chart'),{points,visibleCount:advance,lagSample:curve,lsmSample:[],mode:'lag',predict:lsm.predict,activeIndex:advance-1,residualProgress:0});
      $('#animation-status').textContent=`Покрокова інтерполяція: ${advance} / ${points.length} вузлів`;
    } else {
      const eased=1-Math.pow(1-progress,3);
      drawChart($('#main-chart'),{points,lagSample:[],lsmSample:lsmCurve,mode:'lsm',predict:lsm.predict,lsmProgress:eased,residualProgress:Math.max(0,(progress-.28)/.72)});
      $('#animation-status').textContent=`Побудова МНК: ${Math.round(100*progress)} %`;
    }
    if(progress<1)requestAnimationFrame(frame);
    else $('#animation-status').textContent=kind==='lag'?'Інтерполяція завершена':'МНК: побудову завершено';
  }
  requestAnimationFrame(frame);
}
$('#animate-lag').addEventListener('click',()=>startAnimation('lag'));
$('#animate-lsm').addEventListener('click',()=>startAnimation('lsm'));
$('#download-metrics').addEventListener('click',()=>{
  const header='Набір;RMSE;MAE;R²;SSE;Макс. відхилення';
  const lines=[header];
  for(const count of [5,10,20]){const x=model(count).metrics;lines.push([count,x.rmse,x.mae,x.r2,x.sse,x.maxError].join(';'));}
  const blob=new Blob(['\uFEFF'+lines.join('\n')],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='lr1_metrics_variant1.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
});
updateEditor();redraw();
