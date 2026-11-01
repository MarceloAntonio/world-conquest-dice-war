import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GameEngine} from '../src/core/GameEngine.js';
import {RandomGenerator} from '../src/core/RandomGenerator.js';
import {PopulationSystem} from '../src/core/PopulationSystem.js';
import {rollThree,resolveBattle} from '../src/core/BattleSystem.js';
import {validateData} from '../scripts/validateData.js';

const read=name=>JSON.parse(fs.readFileSync(new URL('../public/data/'+name,import.meta.url),'utf8'));
const countries=read('countries.json'),borders=read('borders.json'),world=read('world.geojson');
const mockCountries=[{id:'A',population:1000},{id:'B',population:10000},{id:'C',population:100000}];
const mockBorders={land:[{a:'A',b:'B'},{a:'B',b:'C'}],sea:[]};

test('Exactly 195 unique states, flags, positive populations and connected global graph',()=>{
  assert.equal(validateData(countries,world,borders).countries,195);
  for(const id of ['PS','VA','SS'])assert(countries.some(c=>c.id===id));
  for(const id of ['TW','XK','EH','GL'])assert(!countries.some(c=>c.id===id));
  assert.throws(()=>validateData(countries.slice(1),world,borders));
});
test('Three independent six-sided dice with every face reachable',()=>{
  const rng=new RandomGenerator('dice'),faces=new Set();
  for(let i=0;i<1000;i++){const dice=rollThree(rng);assert.equal(dice.length,3);for(const n of dice){assert(Number.isInteger(n)&&n>=1&&n<=6);faces.add(n);}}
  assert.equal(faces.size,6);
});
test('Log scale is monotonic, 1..20, fixed after conquests, capped at 20',()=>{
  const p=new PopulationSystem(mockCountries);assert.equal(p.score(1000),1);assert.equal(p.score(100000),20);assert.equal(p.score(1e10),20);
  assert.equal(p.bonus(100000,1000),12);assert.equal(p.bonus(1000,100000),0);assert.equal(p.bonus(100000,1000,5),5);
});
test('Only stronger side receives capped population bonus',()=>{
  const p=new PopulationSystem(mockCountries);const result=resolveBattle({attacker:mockCountries[0],defender:mockCountries[2],population:p,rng:new RandomGenerator('bonus')});
  assert.equal(result.rolls[0].bonusA,0);assert.equal(result.rolls[0].bonusD,12);
});
test('Tie re-rolls exactly three dice per side, preserving population bonuses',()=>{
  let count=0;const values=[0,0,0,0,0,0,5,5,5,0,0,0];
  const rng={int:()=>values[count++]};const p=new PopulationSystem(mockCountries);
  const result=resolveBattle({attacker:mockCountries[0],defender:{...mockCountries[0],id:'B'},population:p,rng});
  assert.equal(count,12);assert.equal(result.rolls.length,2);assert.equal(result.winner,'A');
  assert.equal(result.rolls[0].totalA,result.rolls[0].totalD);
  assert.deepEqual(result.rolls.map(r=>[r.bonusA,r.bonusD]),[[0,0],[0,0]]);
});
test('Both attacker and defender can win and absorb all losing territories',()=>{
  let attackWins=0,defendWins=0;
  for(let i=0;i<25;i++){
    const e=new GameEngine(mockCountries,mockBorders,{seed:String(i),bonusCap:0});
    while(!e.ended){const b=e.step();if(!b)break;const win=e.factions[b.winner],lose=e.factions[b.loser];
      assert.equal(lose.count,0);assert.equal(lose.population,0);assert.equal(lose.losses,1);assert.equal(lose.eliminatedAt,b.round);
      for(const id of b.conquered)assert.equal(e.territory.owners[id],b.winner);
      assert.equal(win.count,e.territory.territories(win.id).length);
      if(b.winner===b.attacker)attackWins++;else defendWins++;
    }
    assert.equal(e.active[0].population,111000);assert.equal(e.active[0].count,3);
  }
  assert(attackWins>0&&defendWins>0);
});
test('Enemy borders follow the union after absorbing an intermediate state',()=>{
  const e=new GameEngine(mockCountries,mockBorders);e.territory.absorb('A','B');
  assert.deepEqual(e.territory.enemies('A'),['C']);assert.deepEqual(e.territory.enemies('C'),['A']);assert.deepEqual(e.territory.enemies('B'),[]);
});
test('All selected attackers and defenders share a valid enemy connection',()=>{
  const e=new GameEngine(countries,borders,{seed:'valid-neighbors'});
  e.on('battle',b=>{assert(e.territory.enemies(b.attacker).includes(b.defender));assert(e.territory.route(b.attacker,b.defender));assert.notEqual(b.attacker,b.defender);});
  e.run();assert.equal(e.round,194);
});
test('Population never duplicates or disappears at any round; one elimination per battle',()=>{
  const e=new GameEngine(countries,borders,{seed:'conservation'}),total=e.population.world;
  while(!e.ended){e.step();assert.equal(e.active.reduce((s,c)=>s+c.population,0),total);assert.equal(e.active.reduce((s,c)=>s+c.count,0),195);assert.equal(e.active.length,195-e.round);}
  assert.equal(e.phase,'finished');assert.equal(e.active.length,1);assert.equal(e.step(),null);
});
test('Global mode always reaches one winner for 30 different seeds',()=>{
  for(let i=0;i<30;i++){const e=new GameEngine(countries,borders,{seed:`global-${i}`});e.run(500);assert.equal(e.phase,'finished');assert.equal(e.round,194);}
});
test('Land-only mode leaves Australia/Japan isolated and ends in geographic stalemate',()=>{
  const e=new GameEngine(countries,borders,{seed:'islands',mode:'land'});
  assert.deepEqual(e.territory.enemies('AU','land'),[]);assert.deepEqual(e.territory.enemies('JP','land'),[]);
  assert(e.territory.enemies('AU','global').length>0);assert(e.territory.enemies('JP','global').length>0);
  e.run();assert.equal(e.phase,'stalemate');assert(e.active.length>1);assert(e.active.some(f=>f.id==='AU'));assert(e.active.some(f=>f.id==='JP'));
});
test('Same seed and rules give identical results for individual and batched execution',()=>{
  const a=new GameEngine(countries,borders,{seed:'repeat'}),b=new GameEngine(countries,borders,{seed:'repeat'});
  a.run();while(!b.ended)b.step();assert.deepEqual(a.snapshot(),b.snapshot());
  const c=new GameEngine(countries,borders,{seed:'different'});c.run();assert.notDeepEqual(a.history,c.history);
});
test('Saving and restoring preserves full RNG state and future battle results',()=>{
  const a=new GameEngine(countries,borders,{seed:'save'});a.run(70);a.elapsedMs=12345;
  const b=GameEngine.restore(countries,borders,JSON.parse(JSON.stringify(a.snapshot())));assert.equal(b.elapsedMs,12345);assert.equal(b.running,false);
  a.run();b.run();assert.deepEqual(a.snapshot(),b.snapshot());
  const tampered=structuredClone(a.snapshot());tampered.history[0].winner='NOT_A_COUNTRY';assert.throws(()=>GameEngine.restore(countries,borders,tampered));
});
test('Event log reconstructs the exact original and final maps',()=>{
  const e=new GameEngine(countries,borders,{seed:'rewind'});e.run(80);const expected=structuredClone(e.territory.owners);e.run();
  assert.deepEqual(e.ownersAt(80),expected);assert.equal(new Set(Object.values(e.ownersAt(0))).size,195);assert.equal(new Set(Object.values(e.ownersAt(194))).size,1);
});
test('Phase and battle events follow the state machine',()=>{
  const e=new GameEngine(mockCountries,mockBorders);const phases=[],events=[];e.on('state',p=>phases.push(p));e.on('battle',()=>events.push('battle'));e.on('conquest',()=>events.push('conquest'));e.resume();e.step();e.pause();
  assert.deepEqual(phases,['running','battle','conquest','running','paused']);assert.deepEqual(events,['battle','conquest']);
});
test('Attacker sampling is uniform over eligible factions rather than population-weighted',()=>{
  const counts={A:0,B:0,C:0};
  for(let i=0;i<1500;i++){const e=new GameEngine(mockCountries,mockBorders,{seed:`uniform-${i}`});counts[e.step().attacker]++;}
  for(const n of Object.values(counts))assert(n>400&&n<600,JSON.stringify(counts));
});
