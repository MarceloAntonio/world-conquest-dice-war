import {flag,esc} from './helpers.js';
export function selectionPanel({stage,id,attacker,done},byId){
  return `<div class="selection-panel" data-presentation="${stage}"><div class="selection-heading"><span>${stage==='attacker'?'ESCOLHENDO ATACANTE':'ESCOLHENDO DEFENSOR'}</span><button data-action="skip">Pular animação ↗</button></div><div class="selection-country">${flag(byId[id])}<strong>${esc(byId[id].name)}</strong><span class="selection-tag">${done?'Selecionado':'Sorteando…'}</span></div><p>${stage==='attacker'?'Entre as facções com adversários conectados.':`Somente facções na fronteira de ${esc(byId[attacker].name)}, incluindo as rotas marítimas deste modo.`}</p></div>`;
}
