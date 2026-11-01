import {flag,number,compact,esc,percent} from './helpers.js';
import {leaderboard} from './Leaderboard.js';
export function statisticsScreen(engine,byId){
  const all=Object.values(engine.factions),wins=[...all].sort((a,b)=>b.wins-a.wins)[0],streak=[...all].sort((a,b)=>b.maxStreak-a.maxStreak)[0];
  const area=engine.ranking.map(f=>({...f,area:engine.territory.territories(f.id).reduce((s,id)=>s+byId[id].areaKm2,0)})).sort((a,b)=>b.area-a.area)[0];
  const counts=Object.fromEntries(engine.countries.map(c=>[c.id,1]));let expansion={id:engine.countries[0].id,count:1};
  for(const b of engine.history){counts[b.winner]+=counts[b.loser];counts[b.loser]=0;if(counts[b.winner]>expansion.count)expansion={id:b.winner,count:counts[b.winner]};}
  return `<div class="stats-cards"><div><span>Batalhas realizadas</span><strong>${engine.round}</strong></div><div><span>Mais vitórias</span><strong>${esc(byId[wins.id].name)}</strong><small>${wins.wins} vitórias</small></div><div><span>Maior sequência</span><strong>${streak.maxStreak}</strong><small>${esc(byId[streak.id].name)}</small></div><div><span>Maior área atual</span><strong>${compact(area.area)} km²</strong><small>${esc(byId[area.id].name)}</small></div><div><span>Maior expansão histórica</span><strong>${expansion.count} Estados</strong><small>${esc(byId[expansion.id].name)}</small></div><div><span>População total da base</span><strong>${compact(engine.population.world)}</strong><small>${engine.active.length} facções sobreviventes</small></div></div>
    <div class="chart-title"><h3>Um mundo, cada vez menos fronteiras</h3><span>ESTADOS INDEPENDENTES</span></div>${lineChart([{name:'Estados independentes',color:'#81e9b4',values:Array.from({length:engine.round+1},(_,i)=>195-i)}],195)}
    <div class="chart-title"><h3>Crescimento populacional</h3><select id="growth-country" aria-label="País no gráfico"><option value="top5">Top 5 atuais</option>${engine.countries.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div><div id="growth-chart">${growthChart(engine,'top5',byId)}</div>
    <div class="stats-actions"><button class="button primary" data-action="replay-map">Explorar mapa por rodada</button><button class="button" data-action="export">Exportar partida JSON</button></div><h3>Primeiros Estados eliminados</h3><div class="elimination-list">${engine.history.slice(0,8).map(b=>`<button data-battle="${b.round}"><span>#${b.round}</span>${flag(byId[b.loser])}${esc(byId[b.loser].name)}<small>por ${esc(byId[b.winner].name)}</small></button>`).join('')||'<p>Aguardando a primeira batalha.</p>'}</div>
    <h3>Ranking populacional atual</h3><div class="statistics-ranking">${leaderboard(engine,byId)}</div><p class="source-line">População e área são medidas distintas. A classificação de área usa a geometria Natural Earth; o ranking principal usa a população da base.</p>`;
}
export function growthChart(engine,id,byId){
  const colors=['#8eecb8','#f7bd79','#84b8ec','#d6a0e3','#e88d9f'];
  const ids=id==='top5'?engine.ranking.slice(0,5).map(f=>f.id):[id];
  const series=ids.map((id,i)=>({id,name:byId[id].name,color:colors[i],values:[]}));
  for(let r=0;r<=engine.round;r++){const owners=engine.ownersAt(r);for(const s of series)s.values.push(engine.countries.reduce((sum,c)=>sum+(owners[c.id]===s.id?c.population:0),0));}
  const max=Math.max(...series.flatMap(s=>s.values),1);
  return lineChart(series,max,true)+`<div class="chart-legend">${series.map(s=>`<span style="--series:${s.color}">${esc(s.name)}</span>`).join('')}</div>`;
}
function lineChart(series,max,population=false){
  const w=760,h=180,left=65,bottom=148,top=16,right=738;
  const n=Math.max(series[0].values.length-1,1),x=i=>left+i/n*(right-left),y=v=>bottom-(v/max)*(bottom-top);
  return `<svg class="stats-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(series[0].name)} ao longo das rodadas">${[0,0.5,1].map(t=>`<line x1="${left}" y1="${y(max*t)}" x2="${right}" y2="${y(max*t)}" stroke="#253541" stroke-dasharray="3 6"/><text x="${left-10}" y="${y(max*t)+4}" text-anchor="end">${population?compact(max*t):Math.round(max*t)}</text>`).join('')}${series.map(s=>`<path d="${s.values.map((v,i)=>`${i?'L':'M'}${x(i)},${y(v)}`).join(' ')}" fill="none" stroke="${s.color}" stroke-width="2.5"/>${s.values.map((v,i)=>`<circle cx="${x(i)}" cy="${y(v)}" r="4" fill="${s.color}" opacity="0.08"><title>Rodada ${i} · ${esc(s.name)}: ${number(v)}</title></circle>`).join('')}`).join('')}<text x="${left}" y="174">RODADA 0</text><text x="${right}" y="174" text-anchor="end">RODADA ${series[0].values.length-1}</text></svg>`;
}
