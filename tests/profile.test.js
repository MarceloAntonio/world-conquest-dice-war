import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GameEngine} from '../src/core/GameEngine.js';
import {ProfileStore} from '../src/services/ProfileStore.js';
const countries=JSON.parse(fs.readFileSync(new URL('../public/data/countries.json',import.meta.url))),borders=JSON.parse(fs.readFileSync(new URL('../public/data/borders.json',import.meta.url)));
function storage(){const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};}
test('Predictions, streaks, missions and album advance from real committed events',()=>{
  const p=new ProfileStore(storage()),e=new GameEngine(countries,borders,{region:'southAmerica',seed:'profile'});p.begin(e);
  for(let i=0;i<5;i++){const b=e.step();p.record(e,b,b.winner);}
  assert.equal(p.data.correct,5);assert.equal(p.data.predictions,5);assert.equal(p.data.bestStreak,5);assert(p.data.xp>50);assert(p.data.achievements.prediction);assert(p.data.achievements.streak);assert(p.session.missions.includes('predict'));assert(Object.keys(p.data.album).length>=2);
  assert.equal(p.session.predictionLog.length,5);assert(p.session.predictionLog.every(p=>p.correct&&p.xp>0));
  const wrong=e.step();p.record(e,wrong,wrong.loser);assert.equal(p.session.streak,0);assert.equal(p.data.correct,5);assert.equal(p.session.predictionLog.at(-1).correct,false);
});
test('Skipping predictions awards no prediction points and does not change battle results',()=>{
  const p=new ProfileStore(storage()),e=new GameEngine(countries,borders,{region:'southAmerica',seed:'skip'});p.begin(e);const b=e.step();p.record(e,b,null);assert.equal(p.data.predictions,0);assert.equal(p.session.correct,0);assert.equal(p.data.xp,0);
});
test('Progress is idempotent for the same session event, including restored older saves',()=>{
  const store=storage(),p=new ProfileStore(store),e=new GameEngine(countries,borders,{region:'southAmerica'});p.begin(e);const before=structuredClone(p.session),b=e.step();p.record(e,b,b.winner);const xp=p.data.xp;p.record(e,b,b.winner);assert.equal(p.data.xp,xp);
  const restored=new ProfileStore(store);restored.begin(new GameEngine(countries,borders,{region:'southAmerica'}),before);restored.record(e,b,b.winner);assert.equal(restored.data.xp,xp);
});
test('Campaign summaries, unique medals and cosmetic unlocks persist without changing engine snapshots',()=>{
  const store=storage(),p=new ProfileStore(store),e=new GameEngine(countries,borders,{region:'southAmerica',seed:'trophies'});p.begin(e);assert.equal(p.equip('dice','jade'),false);
  while(!e.ended){const b=e.step();if(b)p.record(e,b,b.winner);}const before=structuredClone(e.snapshot());const summary=p.finish(e);assert.equal(summary.rounds,e.round);assert.equal(summary.winners[0],e.active[0].id);assert.equal(p.data.campaigns,1);
  const xp=p.data.xp;assert.equal(p.finish(e),null);assert.equal(p.data.xp,xp);assert.equal(p.equip('dice','jade'),true);assert.equal(p.data.cosmetics.dice,'jade');assert.deepEqual(e.snapshot(),before);
  const loaded=new ProfileStore(store);assert.equal(loaded.data.trophies.length,1);assert.equal(loaded.data.cosmetics.dice,'jade');
});
test('Favorite eliminations create rivals and campaign challenges record personal bests',()=>{
  let eliminated=false;
  for(let i=0;i<8&&!eliminated;i++){
    const p=new ProfileStore(storage()),e=new GameEngine(countries,borders,{region:'southAmerica',favoriteId:'UY',seed:String(i)});p.begin(e);
    while(!e.ended){const b=e.step();if(b){p.record(e,b,null);if(b.loser==='UY'&&!e.factions.UY.count){assert(p.data.rivalries.UY[b.winner].eliminations>=1);eliminated=true;}}}
  }assert(eliminated);
  const p=new ProfileStore(storage()),e=new GameEngine(countries,borders,{challengeId:'south-predictions'});p.begin(e);while(!e.ended){const b=e.step();if(b)p.record(e,b,b.winner);}p.finish(e);assert(p.data.challenges['south-predictions']);assert(p.data.achievements.challenge);
});
test('Custom modes retain their configuration and invalid resume metadata cannot enter the profile',()=>{
  const p=new ProfileStore(storage());p.saveCustomMode('Ilhas',{region:'oceania',rules:{alliances:true}});assert.equal(p.data.customModes[0].config.region,'oceania');assert.throws(()=>p.saveCustomMode('  ',{}));
  const e=new GameEngine(countries,borders);p.begin(e,{id:'bad"id',round:0,seed:e.options.seed});assert.notEqual(p.session.id,'bad"id');
});
