import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GameEngine} from '../src/core/GameEngine.js';
import {MilitarySystem,militaryWeights} from '../src/core/MilitarySystem.js';
const countries=JSON.parse(fs.readFileSync(new URL('../public/data/countries.json',import.meta.url)));
const borders=JSON.parse(fs.readFileSync(new URL('../public/data/borders.json',import.meta.url)));
const byId=Object.fromEntries(countries.map(c=>[c.id,c]));
test('Military source records cover the same 195 states and distinguish missing from zero',()=>{
  assert.equal(countries.filter(c=>c.military).length,195);
  assert.equal(countries.filter(c=>c.military.metrics.tanks).length,143);
  assert.equal(byId.BR.military.metrics.activePersonnel.value,376000);
  assert.equal(byId.BR.military.metrics.tanks.value,294);
  assert.equal(byId.BR.military.powerIndex.value,0.2374);
  assert.equal(byId.IS.military.metrics.tanks.value,0);assert.equal(byId.VA.military.metrics.tanks,undefined);
  for(const c of countries)for(const m of Object.values(c.military.metrics)){assert(m.value>=0&&Number.isFinite(m.value));assert(m.year<=2026&&m.year>=1960);assert(m.url.startsWith('https://'));assert(m.definition&&m.source);}
});
test('Military totals sum known values; missing records keep explicit coverage',()=>{
  const m=new MilitarySystem(countries),a=m.aggregate(['BR','VA']);
  assert.equal(a.metrics.tanks.value,294);assert.equal(a.metrics.tanks.known,1);assert.equal(a.metrics.tanks.total,2);assert(a.partial);
  const unknown=m.aggregate(['VA']);assert.equal(unknown.metrics.tanks.value,null);assert.equal(unknown.score,null);
});
test('Fixed military weights sum to one; zero-valued observations are measured capacity',()=>{
  assert.equal(Object.values(militaryWeights).reduce((s,w)=>s+w,0),1);
  const c=[{id:'A',military:{metrics:Object.fromEntries(Object.keys(militaryWeights).map(k=>[k,{value:0,year:2026}]))}}];
  const a=new MilitarySystem(c).aggregate(['A']);assert.equal(a.score,1);assert.equal(a.partial,false);
});
test('Population-only results are unchanged when military observations are removed',()=>{
  const a=new GameEngine(countries,borders,{seed:'off'}),b=new GameEngine(countries.map(({military,...c})=>c),borders,{seed:'off'});
  a.run(20);b.run(20);assert.deepEqual(a.history,b.history);assert.equal(a.history[0].components,undefined);
});
test('Military-only strength does not change when population changes',()=>{
  const altered=countries.map(c=>({...c,population:c.id==='BR'?1e11:1000}));
  const a=new GameEngine(countries,borders,{powerMode:'military'}),b=new GameEngine(altered,borders,{powerMode:'military'});
  const ca=a.comparison('BR','US'),cb=b.comparison('BR','US');assert.equal(ca.a,cb.a);assert.equal(ca.d,cb.d);
});
test('Combined mode rounds the 50/50 average of population and military scores',()=>{
  const e=new GameEngine(countries,borders,{powerMode:'combined'}),c=e.comparison('BR','US');
  assert.equal(c.a,Math.round((c.components.populationA+c.components.militaryA)/2));
  assert.equal(c.d,Math.round((c.components.populationD+c.components.militaryD)/2));
});
test('Missing military information gives no military advantage to either side',()=>{
  const e=new GameEngine(countries,borders,{powerMode:'military'}),c=e.comparison('VA','US');
  assert.equal(c.components.usedMilitary,false);assert.equal(c.components.militaryA,null);assert.equal(c.a,c.d);
  const combined=new GameEngine(countries,borders,{powerMode:'combined'}),v=combined.comparison('VA','US');
  assert.equal(v.a,Math.round((v.components.populationA+1)/2));assert.equal(v.d,Math.round((v.components.populationD+1)/2));
});
test('Conquests conserve all military quantities without double counting',()=>{
  for(const powerMode of ['military','combined']){
    const e=new GameEngine(countries,borders,{seed:'inventory',powerMode}),total=e.military.aggregate(countries.map(c=>c.id));
    for(let i=0;i<40;i++){
      e.step();for(const key of Object.keys(militaryWeights))assert(Math.abs(e.active.reduce((sum,f)=>sum+(e.militaryFor(f.id).metrics[key].value??0),0)-total.metrics[key].value)<0.02);
    }
    e.run();const winner=e.active[0];assert.equal(winner.count,195);
    for(const key of Object.keys(militaryWeights))assert(Math.abs(e.militaryFor(winner.id).metrics[key].value-total.metrics[key].value)<0.02);
  }
});
test('Both new modes preserve three dice, capped bonuses and deterministic save/restore',()=>{
  for(const powerMode of ['military','combined']){
    const a=new GameEngine(countries,borders,{seed:'replay',powerMode,bonusCap:7});a.run(24);
    for(const b of a.history){assert.equal(b.powerMode,powerMode);for(const r of b.rolls){assert.equal(r.diceA.length,3);assert.equal(r.diceD.length,3);assert(r.bonusA<=7&&r.bonusD<=7);assert(r.bonusA===0||r.bonusD===0);}}
    const b=GameEngine.restore(countries,borders,JSON.parse(JSON.stringify(a.snapshot())));a.run(10);b.run(10);assert.deepEqual(a.snapshot(),b.snapshot());
  }
});
test('Population saves created before military modes still load',()=>{
  const old=new GameEngine(countries,borders,{seed:'legacy'});old.run(8);const saved=old.snapshot();delete saved.options.powerMode;
  const e=GameEngine.restore(countries,borders,saved);assert.equal(e.options.powerMode,'population');assert.deepEqual(e.history,saved.history);
});
