import test from 'node:test';
import assert from 'node:assert/strict';
import {initialSets,originalSets,computedTen} from '../src/data.js';
import {checkPoints,createLagrange,fitLeastSquares,getMetrics,parsePoints,solveLeastSquaresQR,buildSample} from '../src/math.js';
const close=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<tol,`Очікувалося ${b}; фактично ${a}`);
for (const n of [5,10,20]) {
  test(`Лагранж: поліном точно проходить через усі ${n} вузлів`,()=>{
    const points=initialSets()[n], f=createLagrange(points);
    for(const p of points) close(f(p.x),p.y,1e-12);
  });
  test(`МНК: QR дає скінченні коефіцієнти та метрики для ${n} точок`,()=>{
    const points=initialSets()[n], fit=fitLeastSquares(points,2);
    assert.equal(fit.matrix.length,n);assert.equal(fit.matrix[0].length,3);
    for(const a of fit.coefficients)assert.ok(Number.isFinite(a));
    for(const key of ['rmse','mae','sse','maxError','r2'])assert.ok(Number.isFinite(getMetrics(points,fit.predict)[key]));
  });
  test(`Графіки ${n} точок: всі обчислені координати скінченні`,()=>{
    const points=initialSets()[n],lag=createLagrange(points),lsm=fitLeastSquares(points,2);
    const curves=[buildSample(points,lag),buildSample(points,lsm.predict)];
    for (const curve of curves) for(const p of curve) assert.ok(Number.isFinite(p.y));
  });
}
test('Набір на 10 точок містить рівно 8 оригінальних та 2 позначені розрахункові',()=>{
  assert.equal(originalSets[10].length,8);
  assert.equal(computedTen.length,2);
  assert.equal(initialSets()[10].filter(p=>p.origin==='calculated').length,2);
});
test('МНК точно відтворює квадратичний поліном',()=>{
  const points=Array.from({length:20},(_,i)=>({x:i/2,y:1+2*(i/2)-3*(i/2)**2}));
  const fit=fitLeastSquares(points,2);for(const p of points)close(fit.predict(p.x),p.y,1e-9);
  close(getMetrics(points,fit.predict).rmse,0);
});
test('МНК лінійного тренду стабільний за великих x завдяки нормалізації',()=>{
  const points=Array.from({length:20},(_,i)=>({x:100000+i*100,y:10+0.3*(100000+i*100)}));
  const fit=fitLeastSquares(points,1);for(const p of points)close(fit.predict(p.x),p.y,1e-8);
});
test('QR розв’язує просту визначену систему',()=>{
  const result=solveLeastSquaresQR([[1,1],[1,2],[1,3]],[3,5,7]);close(result[0],1);close(result[1],2);
});
test('Перевірка забороняє повторювані абсциси',()=>assert.throws(()=>checkPoints([{x:1,y:2},{x:1,y:3}]),/різними/));
test('Перевірка забороняє некоректний розмір вибірки',()=>assert.throws(()=>parsePoints('1,2\n2,3',5),/рівно 5/));
test('Перевірка забороняє некоректні числа',()=>assert.throws(()=>parsePoints('1,abc\n2,3',2),/скінченними/));
test('Перевірка забороняє ступінь полінома n або більше',()=>assert.throws(()=>fitLeastSquares(initialSets()[5],5),/Ступінь/));
