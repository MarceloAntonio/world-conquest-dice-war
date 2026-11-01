import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import {GameEngine} from '../src/core/GameEngine.js';
const countries=JSON.parse(await fs.readFile(new URL('../public/data/countries.json',import.meta.url))),borders=JSON.parse(await fs.readFile(new URL('../public/data/borders.json',import.meta.url)));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1365,height:960}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const assert=(c,m)=>{if(!c)throw Error(m);};
try{
  await page.goto(process.env.GAME_URL||'http://127.0.0.1:5180');await page.waitForFunction(()=>window.__game?.map.ready,{timeout:60000});
  await page.locator('.modes-nav').click();await page.locator('[data-id="south-predictions"][data-action="choose-challenge"]').click();
  await page.locator('#speed').selectOption('max');
  for(let i=0;i<5;i++){
    const snapshot=await page.evaluate(()=>window.__game.engine.snapshot());const copy=GameEngine.restore(countries,borders,snapshot),winner=copy.step().winner;
    await page.locator('#next-button').click();await page.waitForSelector('[data-presentation="prediction"]');
    await page.locator(`[data-action="predict"][data-id="${winner}"]`).click();await page.waitForFunction(()=>!window.__game.busy);
  }
  assert(await page.evaluate(()=>window.__game.profile.data.correct)===5,'Five correct predictions');
  assert(await page.evaluate(()=>window.__game.profile.level)>=2,'Experience levels');
  await page.locator('.profile-nav').click();await page.locator('[data-action="profile-tab"][data-tab="cosmetics"]').click();
  await page.locator('[data-action="equip-cosmetic"][data-id="jade"]').click();
  assert(await page.evaluate(()=>document.body.dataset.cosmeticDice)==='jade','Cosmetic applied');
  await page.getByRole('button',{name:'Torcida',exact:true}).last().click();await page.locator('#profile-predictions').uncheck();await page.getByRole('button',{name:'Fechar',exact:true}).click();
  await page.locator('#follow-button').click();await page.waitForSelector('.victory',{timeout:60000});
  assert(await page.evaluate(()=>!!window.__game.profile.data.challenges['south-predictions']),'Challenge personal record');
  await page.getByRole('button',{name:'Fechar',exact:true}).click();
  // Force only full LocalStorage snapshots to fail, so the actual IndexedDB
  // fallback and its small pointer are exercised without changing game data.
  await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='dice-war.save.v1'&&value.length>50)throw new DOMException('quota','QuotaExceededError');return original.call(this,key,value);};});
  await page.locator('.profile-nav').click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('dice-war.save.v1')).indexedDB===true);
  const round=await page.evaluate(()=>window.__game.engine.round);
  await page.reload();await page.waitForFunction(()=>window.__game?.map.ready);await page.locator('#continue-menu').click();
  assert(await page.evaluate(()=>window.__game.engine.round)===round,'Full IndexedDB save restored');
  assert(await page.evaluate(()=>document.body.dataset.cosmeticDice)==='jade','Cosmetics persisted across reload');
  const count=await page.evaluate(()=>window.__game.profile.data.campaigns);assert(count===1,'Finished restore does not duplicate campaign rewards');
  await page.getByRole('button',{name:'Sala de troféus',exact:true}).click();await page.screenshot({path:'test-results/gamification-trophy.png'});
  assert(!errors.length,errors.join('; '));console.log(JSON.stringify({predictions:5,levelProgress:true,cosmetics:true,challengeRecord:true,indexedDBFallback:true,reload:true,noDuplicateRewards:true,errors},null,2));
}catch(error){console.error(errors);await page.screenshot({path:'test-results/gamification-failure.png'}).catch(()=>{});throw error;}
finally{await browser.close();}
