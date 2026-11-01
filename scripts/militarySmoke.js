import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import {setPowerOptions,manualBattles,continueBattles} from './browserHelpers.js';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const assert=(c,m)=>{if(!c)throw Error(m);};
try{
  await fs.mkdir('test-results',{recursive:true});await page.goto(process.env.GAME_URL||'http://127.0.0.1:5174');
  await page.waitForFunction(()=>window.__game?.map.ready,{timeout:60000});
  assert(await page.locator('#batch option[value="500"]').count()===0,'Redundant 500-battle option removed');
  assert(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--bg').trim())==='#002042','Requested palette');
  await setPowerOptions(page,'combined');await page.screenshot({path:'test-results/blue-menu-desktop.png'});
  for(const mode of ['combined','military','population']){
    await page.locator('[data-action="settings"]').first().click();
    await setPowerOptions(page,mode,'settings');await page.locator('[name="animations"]').uncheck();
    await page.locator('[name="seed"]').fill('MILITARY-QA');await page.getByRole('button',{name:'Salvar configurações'}).click();
    // Settings are next-game rules; creating a new simulation applies them.
    await page.locator('.controlbar [data-action="new"]').click();
    await page.locator('#speed').selectOption('max');await manualBattles(page,10);
    await page.waitForFunction(()=>window.__game.engine.round===10&&!window.__game.engine.running);
    assert(await page.evaluate(()=>window.__game.engine.options.powerMode)===mode,`Active rules: ${mode}`);
    const history=await page.evaluate(()=>JSON.stringify(window.__game.engine.history));
    if(mode!=='population'){
      await page.locator('[data-action="battle-detail"]').click();
      assert(await page.locator('.battle-components').count()===1,'Military battle audit');
      await page.getByRole('button',{name:'Fechar',exact:true}).click();
      await page.screenshot({path:`test-results/blue-${mode}-desktop.png`});
    }
    await page.reload();await page.waitForFunction(()=>window.__game?.map.ready);await page.locator('#continue-menu').click();
    assert(await page.evaluate(()=>JSON.stringify(window.__game.engine.history))===history,`Saved ${mode} history`);
    await page.getByRole('button',{name:'Reiniciar com a mesma seed'}).click();
    await manualBattles(page,10);
    await page.waitForFunction(()=>window.__game.engine.round===10&&!window.__game.engine.running);
    assert(await page.evaluate(()=>JSON.stringify(window.__game.engine.history))===history,`Repeat ${mode}`);
    await continueBattles(page);
    await page.waitForSelector('.victory',{timeout:60000});
    assert(await page.evaluate(()=>window.__game.engine.round)===194,`Full ${mode} match`);
    await page.getByRole('button',{name:'Fechar',exact:true}).click();
  }
  await page.locator('#country-search').fill('Brasil');await page.locator('#country-search').dispatchEvent('change');
  await page.locator('.military-records summary').click();
  assert(await page.locator('.military-records').innerText().then(t=>t.includes('376.000')&&t.includes('Global Firepower')&&t.includes('2026')),'Brazil inventory source and year');
  await page.screenshot({path:'test-results/blue-military-sources.png'});await page.getByRole('button',{name:'Fechar',exact:true}).click();
  await page.setViewportSize({width:390,height:844});await page.locator('.controlbar [data-action="new"]').evaluate(el=>el.click());
  await page.locator('[data-action="menu"]').last().click();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile no overflow');
  await page.screenshot({path:'test-results/blue-menu-mobile.png'});
  await setPowerOptions(page,'military');await manualBattles(page,10);
  await page.waitForFunction(()=>window.__game.engine.round===10&&!window.__game.engine.running);
  await page.screenshot({path:'test-results/blue-military-mobile.png'});
  assert(!errors.length,errors.join('; '));console.log(JSON.stringify({modes:3,completedMatches:3,seedReplay:true,saveRestore:true,inventorySources:true,palette:true,mobile:true,errors},null,2));
}catch(error){console.error('Browser errors:',errors);await page.screenshot({path:'test-results/military-failure.png'}).catch(()=>{});throw error;}
finally{await browser.close();}
