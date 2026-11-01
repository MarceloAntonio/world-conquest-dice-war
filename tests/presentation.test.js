import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GameEngine} from '../src/core/GameEngine.js';
import {battleBonuses} from '../src/core/BattleSystem.js';
import {powerModeFromChecks,checksFromPowerMode} from '../src/core/PowerOptions.js';
import {selectionFrames} from '../src/graphics/SelectionAnimation.js';
const countries=JSON.parse(fs.readFileSync(new URL('../public/data/countries.json',import.meta.url)));
const borders=JSON.parse(fs.readFileSync(new URL('../public/data/borders.json',import.meta.url)));
test('Force checkboxes support all combinations and explicitly reject no selection',()=>{
  assert.equal(powerModeFromChecks(false,false),null);
  assert.equal(powerModeFromChecks(true,false),'population');assert.equal(powerModeFromChecks(false,true),'military');assert.equal(powerModeFromChecks(true,true),'combined');
  for(const mode of ['population','military','combined']){const c=checksFromPowerMode(mode);assert.equal(powerModeFromChecks(c.population,c.military),mode);}
});
test('The selection preview preserves RNG, ownership, stats and history until the duel',()=>{
  for(const powerMode of ['population','military','combined']){
    const e=new GameEngine(countries,borders,{seed:'preview',powerMode}),before=structuredClone(e.snapshot());
    const a=e.previewBattle(),b=e.previewBattle();assert.deepEqual(a,b);assert.deepEqual(e.snapshot(),before);
    assert.equal(a.rolls,undefined);assert(a.candidates.includes(a.attacker));assert(a.enemies.includes(a.defender));
  }
});
test('Animated participants and bonus always match the actual next battle after conquests',()=>{
  for(const powerMode of ['population','military','combined']){
    const e=new GameEngine(countries,borders,{seed:'selection',powerMode,bonusCap:5});
    for(let i=0;i<30;i++){
      const p=e.previewBattle(),b=e.step();assert.equal(p.attacker,b.attacker);assert.equal(p.defender,b.defender);
      assert.equal(p.scoreA,b.scoreA);assert.equal(p.scoreD,b.scoreD);assert.equal(p.bonusA,b.rolls[0].bonusA);assert.equal(p.bonusD,b.rolls[0].bonusD);
      assert(p.enemies.includes(b.defender));
    }
  }
});
test('Visual roulette slows down, visits eligible candidates, and stops on the seeded choice',()=>{
  const frames=selectionFrames(['A','B','C'],'B',{random:()=>0.3});assert.equal(frames.at(-1).id,'B');
  assert(frames.every(f=>['A','B','C'].includes(f.id)));assert(frames.every((f,i)=>i===0||f.delay>=frames[i-1].delay));
  assert(frames.at(-1).delay>frames[0].delay*4);
  assert(selectionFrames(['A'],'A').every(f=>f.id==='A'));assert.throws(()=>selectionFrames(['A'],'B'));
});
test('Bonus presentation uses exact subtraction, equal scores and cap for both sides',()=>{
  assert.deepEqual(battleBonuses(20,1,12),{bonusA:12,bonusD:0});
  assert.deepEqual(battleBonuses(1,20,4),{bonusA:0,bonusD:4});assert.deepEqual(battleBonuses(7,7),{bonusA:0,bonusD:0});assert.deepEqual(battleBonuses(12,3,0),{bonusA:0,bonusD:0});
});
test('Watching or cancelling selection cannot change the seeded full match',()=>{
  const a=new GameEngine(countries,borders,{seed:'unchanged',powerMode:'combined'}),b=new GameEngine(countries,borders,{seed:'unchanged',powerMode:'combined'});
  while(!a.ended){a.previewBattle();a.previewBattle();a.step();}b.run();assert.deepEqual(a.snapshot(),b.snapshot());assert.equal(a.previewBattle(),null);
});
