import {flag,compact,percent,esc,icon} from './helpers.js';
export function leaderboard(engine,byId){
  return engine.ranking.slice(0,10).map((f,i)=>`<button class="rank-row ${i===0?'first':''}" data-country="${f.id}" title="${esc(byId[f.id].name)}: ${f.count} Estados, ${f.wins} vitórias, ${percent(f.population/engine.population.world*100)} da população da base; força ${engine.strength(f)??'não disponível'}/20">
    <span class="rank-number">${String(i+1).padStart(2,'0')}</span>${flag(byId[f.id])}<span class="rank-country"><strong>${esc(byId[f.id].name)}</strong><small>${f.count} ${f.count===1?'Estado':'Estados'} <span>·</span> ${f.wins} vitórias</small><i style="--progress:${f.population/engine.population.world*100}%"></i></span><span class="rank-pop">${engine.options.powerMode==='population'?compact(f.population):(engine.strength(f)??'N/D')+'/20'}<small>${engine.options.powerMode==='population'?percent(f.population/engine.population.world*100):compact(f.population)+' hab.'}</small></span>
  </button>`).join('');
}
export function historyRows(history,byId,limit=8){
  if(!history.length)return `<div class="empty-history"><p>Nenhuma batalha realizada.</p></div>`;
  return [...history].reverse().slice(0,limit).map(b=>`<button class="history-row" data-battle="${b.round}"><span class="history-round">${String(b.round).padStart(3,'0')}</span>${flag(byId[b.winner])}<span><strong>${esc(byId[b.winner].name)}</strong><small>${b.eliminated===false?'tomou um território de':'conquistou'} ${esc(byId[b.loser].name)}</small></span><span class="history-arrow">${icon('chevron',14)}</span></button>`).join('');
}
