import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GameEngine} from '../src/core/GameEngine.js';
import {regionCatalog,buildScenario,participantIds,challenges} from '../src/core/ModeCatalog.js';
const c=JSON.parse(fs.readFileSync(new URL('../public/data/countries.json',import.meta.url))),b=JSON.parse(fs.readFileSync(new URL('../public/data/borders.json',import.meta.url)));
test('Continental lists partition exactly 195 states and preserve explicit transcontinental assignments',()=>{
  const ids=['northAmerica','centralAmerica','caribbean','southAmerica','europe','africa','oceania','asia'].flatMap(id=>regionCatalog.find(r=>r.id===id).ids);
  assert.equal(ids.length,195);assert.equal(new Set(ids).size,195);assert(regionCatalog.find(r=>r.id==='europe').ids.includes('CY'));assert(regionCatalog.find(r=>r.id==='asia').ids.includes('TR'));
  assert.throws(()=>buildScenario(c,b,{region:'custom',customIds:['BR']}));assert.throws(()=>buildScenario(c,b,{region:'custom',customIds:['BR','ZZ']}));
});
test('Every preset global region finishes with its own selected population and states',()=>{
  for(const r of regionCatalog.filter(r=>r.id!=='custom'&&r.id!=='world')){
    const e=new GameEngine(c,b,{region:r.id,seed:'preset'});
    const total=e.population.world;e.run();assert.equal(e.phase,'finished',r.id);assert.equal(e.active.length,1,r.id);assert.equal(e.active[0].population,total);assert.equal(e.active[0].count,e.countries.length);
  }
});
test('Custom subsets connect through explicit regional corridors, while land mode may stalemate',()=>{
  const e=new GameEngine(c,b,{region:'custom',customIds:['BR','JP','VA']});assert(e.borders.sea.some(e=>e.regional&&e.via.length));e.run();assert.equal(e.active.length,1);
  const land=new GameEngine(c,b,{region:'custom',customIds:['BR','JP','VA'],mode:'land'});land.run();assert.equal(land.phase,'stalemate');assert.equal(land.active.length,3);
});
test('King initialization is seeded, connected and conserves population before round zero',()=>{
  const e=new GameEngine(c,b,{region:'southAmerica',rules:{king:true},hillId:'BR'});assert.equal(e.round,0);assert(e.factions.BR.count>=2);assert.equal(e.ownersAt(0).BR,'BR');assert.equal(e.active.reduce((s,f)=>s+f.population,0),e.population.world);assert.deepEqual(e.ownersAt(0),e.territory.owners);
});
test('Gradual conquest moves only one frontier territory and permits surviving defeats',()=>{
  const e=new GameEngine(c,b,{region:'southAmerica',rules:{king:true,gradual:true},hillId:'BR',seed:'gradual'});let survived=false;
  for(let i=0;i<100&&!e.ended;i++){const before={...e.territory.owners},event=e.step();if(!event)break;assert.equal(event.conquered.length,1);assert.equal(Object.keys(before).filter(id=>before[id]!==e.territory.owners[id]).length,1);if(!event.eliminated){survived=true;assert(e.factions[event.loser].count>0);}}
  assert(survived);assert.equal(e.active.reduce((s,f)=>s+f.population,0),e.population.world);
});
test('Attrition reduces simulated equipment but never mutates published data or population',()=>{
  const original=JSON.stringify(c),e=new GameEngine(c,b,{region:'southAmerica',rules:{attrition:true},powerMode:'military',seed:'wear'});
  const before=e.military.aggregate(e.countries.map(c=>c.id));const event=e.step();
  assert(Object.values(e.integrity).some(x=>x<1));assert.equal(JSON.stringify(c),original);assert.equal(e.active.reduce((s,f)=>s+f.population,0),e.population.world);
  const after=e.military.aggregate(e.countries.map(c=>c.id),{integrity:e.integrity});assert(after.metrics.personnel.value<before.metrics.personnel.value);assert.equal(after.metrics.spending.value,before.metrics.spending.value);assert(event.militaryA);
});
test('Rebellions restore original states without creating population and replay accurately',()=>{
  let observed=false;
  for(let seed=0;seed<20&&!observed;seed++){
    const e=new GameEngine(c,b,{region:'europe',rules:{rebellions:true,gradual:true},seed:`rebels-${seed}`,maxRounds:150});
    while(!e.ended){const event=e.step();if(!event)break;assert.equal(e.active.reduce((s,f)=>s+f.population,0),e.population.world);if(event.rebellions.length){observed=true;for(const r of event.rebellions)assert.equal(e.territory.owners[r.id],r.id);}}
    assert.deepEqual(e.ownersAt(e.round),e.territory.owners);
  }assert(observed);
});
test('Alliances never fight each other, share strength and finish with a surviving bloc',()=>{
  const e=new GameEngine(c,b,{region:'southAmerica',rules:{alliances:true},seed:'allies'});const team=e.teamMembers('BR');assert(team.length<=3);assert.equal(e.coalition('BR').population,team.reduce((s,id)=>s+e.factions[id].population,0));
  while(!e.ended){const p=e.previewBattle();if(!p){e.step();break;}assert.notEqual(e.teams[p.attacker],e.teams[p.defender]);const event=e.step();assert.equal(event.attacker,p.attacker);assert.equal(event.defender,p.defender);}
  assert.equal(e.outcome.type,'alliance');assert.equal(new Set(e.active.map(f=>e.teams[f.id])).size,1);
});
test('All equal uses 3D6 with zero bonus even with military and population differences',()=>{
  const e=new GameEngine(c,b,{region:'southAmerica',rules:{allEqual:true},powerMode:'combined'});e.run();for(const event of e.history){assert.equal(event.scoreA,1);assert.equal(event.scoreD,1);for(const r of event.rolls){assert.equal(r.bonusA,0);assert.equal(r.bonusD,0);assert.equal(r.diceA.length,3);}}
});
test('Leader hunting and combined rules keep preview, replay and full saves deterministic',()=>{
  const options={region:'southAmerica',favoriteId:'BR',seed:'combined-campaign',rules:{huntLeader:true,king:true,rebellions:true,alliances:true,gradual:true,attrition:true},maxRounds:90,powerMode:'combined'};
  const a=new GameEngine(c,b,options);for(let i=0;i<12&&!a.ended;i++){const p=a.previewBattle(),event=a.step();if(event){assert.equal(p.attacker,event.attacker);assert.equal(p.defender,event.defender);}}
  const restored=GameEngine.restore(c,b,JSON.parse(JSON.stringify(a.snapshot())));a.run();restored.run();assert.deepEqual(a.snapshot(),restored.snapshot());assert.equal(a.active.reduce((s,f)=>s+f.population,0),a.population.world);
  const corrupt=structuredClone(a.snapshot());corrupt.integrity.BR=0;assert.throws(()=>GameEngine.restore(c,b,corrupt));
});
test('Campaign limit has a separate outcome and challenges override editable seed and rules',()=>{
  let limited=false;for(let seed=0;seed<10&&!limited;seed++){const e=new GameEngine(c,b,{region:'europe',rules:{gradual:true},maxRounds:10,seed:String(seed)});e.run();if(e.outcome.type==='limit'){limited=true;assert(e.active.length>1);assert.equal(e.round,10);}}assert(limited);
  for(const challenge of challenges){const e=new GameEngine(c,b,{challengeId:challenge.id,seed:'tampered',region:'world',rules:{}});assert.equal(e.options.seed,challenge.config.seed);assert.equal(e.options.region,challenge.config.region);}
});
