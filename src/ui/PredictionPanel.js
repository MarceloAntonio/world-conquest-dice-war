import {flag,esc} from './helpers.js';
export function predictionPanel(p,byId){
  return `<section class="prediction-panel" data-presentation="prediction"><span class="eyebrow">SUA PREVISÃO · #${p.round}</span><h3>Quem vence este duelo?</h3><div>${[[p.attacker,p.scoreA],[p.defender,p.scoreD]].map(([id,score])=>`<button data-action="predict" data-id="${id}">${flag(byId[id])}<strong>${esc(byId[id].name)}</strong><small>Força ${score}/20</small></button>`).join('')}</div><p>Os dados ainda não foram rolados. Acertar o azarão rende mais pontos.</p><button class="text-button" data-action="skip-prediction">Pular esta previsão</button></section>`;
}
