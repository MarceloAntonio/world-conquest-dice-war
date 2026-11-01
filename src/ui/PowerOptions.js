import {checksFromPowerMode,powerModeFromChecks} from '../core/PowerOptions.js';
export function powerOptions(mode,scope){
  const checks=checksFromPowerMode(mode);
  return `<fieldset class="power-options ${scope==='settings'?'full-width':''}" data-power-options="${scope}"><legend>Força nas batalhas</legend><div class="power-checks"><label><input type="checkbox" name="usePopulation" data-power="population" ${checks.population?'checked':''}> População</label><label><input type="checkbox" name="useMilitary" data-power="military" ${checks.military?'checked':''}> Forças armadas</label></div><small class="power-explanation">Marque as duas para combinar os índices em partes iguais.</small><p class="power-error ${mode?'hidden':''}" data-power-error role="status">Selecione pelo menos uma opção para começar.</p></fieldset>`;
}
export function readPowerOptions(root){return powerModeFromChecks(root.querySelector('[data-power="population"]').checked,root.querySelector('[data-power="military"]').checked);}
export function syncPowerOptions(root,mode){
  const checks=checksFromPowerMode(mode);
  root.querySelectorAll('[data-power]').forEach(input=>input.checked=checks[input.dataset.power]);
  root.querySelector('[data-power-error]').classList.toggle('hidden',!!mode);
}
