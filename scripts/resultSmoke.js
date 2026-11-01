import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import {GameEngine} from '../src/core/GameEngine.js';
const countries=JSON.parse(await fs.readFile(new URL('../public/data/countries.json',import.meta.url)));
const borders=JSON.parse(await fs.readFile(new URL('../public/data/borders.json',import.meta.url)));
const cases={};
for(let i=0;Object.keys(cases).length<2&&i<100;i++){
  const seed=`RESULT-${i}`,b=new GameEngine(countries,borders,{seed}).step();
  const side=b.winner===b.attacker?'attacker':'defender';cases[side]??={seed,b};
}
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const assert=(c,m)=>{if(!c)throw Error(m);};
try{
  await fs.mkdir('test-results',{recursive:true});await page.goto(process.env.GAME_URL||'http://127.0.0.1:5177');
  await page.waitForFunction(()=>window.__game?.map.ready,{timeout:60000});
  for(const [side,{seed,b}] of Object.entries(cases)){
    await page.locator('[data-action="settings"]').first().click();
    await page.locator('[name="seed"]').fill(seed);await page.locator('[name="selectionAnimation"]').uncheck();
    await page.getByRole('button',{name:'Salvar configurações'}).click();
    await page.locator('.controlbar [data-action="new"]').click();
    // Restore the selected seed through Reset rather than the random-new action.
    await page.locator('[data-action="settings"]').first().click();await page.locator('[name="seed"]').fill(seed);await page.getByRole('button',{name:'Salvar configurações'}).click();
    await page.locator('#speed').selectOption('0.5');await page.locator('#next-button').click();
    await page.waitForSelector('.combatant.is-revealing.winner');
    assert(await page.locator('.combatant.winner').getAttribute('data-combatant')===b.winner,`${side} winner`);
    assert(await page.locator('.combatant.loser').getAttribute('data-combatant')===b.loser,`${side} loser`);
    const green=await page.locator('.winner .combatant-name strong').evaluate(el=>getComputedStyle(el).color);
    const red=await page.locator('.loser .combatant-name strong').evaluate(el=>getComputedStyle(el).color);
    assert(green==='rgb(138, 239, 172)'&&red==='rgb(255, 133, 133)','Winner green and loser red');
    assert(await page.locator('.winner .name-confetti-piece').count()===24,'Confetti at winner name');
    assert(await page.locator('.winner-label').count()===0,'Old winner badge removed');
    assert(await page.locator('.loser .combatant-name').evaluate(el=>el.getAnimations().some(a=>a.animationName==='loser-hanging')),'Hanging motion attached to loser');
    await page.screenshot({path:`test-results/result-${side}-wins.png`});
    await page.waitForFunction(()=>!window.__game.busy);
  }
  await page.setViewportSize({width:390,height:844});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile no overflow');
  await page.screenshot({path:'test-results/result-mobile.png'});
  await page.locator('[data-action="settings"]').first().click();await page.locator('[name="animations"]').uncheck();await page.getByRole('button',{name:'Salvar configurações'}).click();
  await page.locator('#speed').selectOption('max');await page.locator('#next-button').click();
  await page.waitForFunction(()=>!window.__game.busy);
  assert(await page.locator('.winner .name-confetti-piece').count()===0,'Animations off omit confetti');
  assert(await page.locator('.winner .combatant-name strong').evaluate(el=>getComputedStyle(el).color)==='rgb(138, 239, 172)','Color feedback remains without animation');
  assert(!errors.length,errors.join('; '));console.log(JSON.stringify({winnerOnEitherSide:true,greenAndRedNames:true,confetti:24,hangingMotion:true,mobile:true,animationsToggle:true,errors},null,2));
}catch(error){console.error(errors);await page.screenshot({path:'test-results/result-failure.png'}).catch(()=>{});throw error;}
finally{await browser.close();}
