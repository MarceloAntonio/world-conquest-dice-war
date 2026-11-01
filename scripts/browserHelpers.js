export async function setPowerOptions(page,mode,scope='menu'){
  const root=page.locator(`[data-power-options="${scope}"]`);
  await root.locator('[data-power="population"]').setChecked(mode==='population'||mode==='combined');
  await root.locator('[data-power="military"]').setChecked(mode==='military'||mode==='combined');
}
export async function manualBattles(page,count){
  for(let i=0;i<count;i++){
    const round=Number(await page.locator('#metric-round').innerText());
    await page.locator('[data-action="next"]').click();
    await page.waitForFunction(r=>Number(document.getElementById('metric-round').textContent)===r+1&&!document.getElementById('next-button').disabled,round);
  }
}
export async function continueBattles(page){
  if(await page.locator('#follow-button').getAttribute('aria-pressed')==='true')await page.locator('#play-button').click();
  else await page.locator('#follow-button').click();
}
