import {flag,number,compact,percent,esc} from './helpers.js';
import {militaryPanel} from './MilitaryPanel.js';
export function countryPanel(id,engine,byId){
  const original=byId[id],owner=engine.territory.owners[id],c=byId[owner],f=engine.factions[owner];
  const enemies=engine.territory.enemies(owner,engine.options.mode);
  return `<div class="country-heading">${flag(c)}<div><span class="eyebrow">${owner===id?'ESTADO INDEPENDENTE':'TERRITÓRIO CONQUISTADO'}</span><h2>${esc(c.name)}</h2></div></div>${owner!==id?`<p class="notice">Território de origem: ${esc(original.name)}. Controlado por ${esc(c.name)}.</p>`:''}
    <div class="country-stats"><div><span>População controlada</span><strong>${number(f.population)}</strong><small>${percent(f.population/engine.population.world*100)} da base mundial</small></div><div><span>Força populacional</span><strong>${engine.population.score(f.population)}<em> / 20</em></strong><small>escala logarítmica</small></div><div><span>Estados controlados</span><strong>${f.count}</strong><small>${f.count-1} conquistados</small></div><div><span>Vitórias / derrotas</span><strong>${f.wins} <em>/ ${f.losses}</em></strong><small>Melhor sequência: ${f.maxStreak}</small></div></div>
    ${militaryPanel(id,owner,engine,byId)}
    <p class="eyebrow section-label">DADOS DO TERRITÓRIO ORIGINAL</p><p class="source-line">${esc(original.name)} · ${number(original.population)} habitantes · ${original.populationYear}<br><a href="${original.populationSourceUrl}" target="_blank" rel="noopener">${original.populationSource==='worldbank'?'Banco Mundial · SP.POP.TOTL':'Estado da Cidade do Vaticano'}</a> · Área: ${number(original.areaKm2)} km²</p>
    <p class="eyebrow section-label">FACÇÕES INIMIGAS CONECTADAS · ${enemies.length}</p><div class="enemy-list">${enemies.map(id=>`<button data-country="${id}">${flag(byId[id])}<span>${esc(byId[id].name)}</span></button>`).join('')||'<p>Nenhuma conexão inimiga elegível.</p>'}</div>
    <p class="eyebrow section-label">TERRITÓRIOS SOB CONTROLE</p><div class="territory-list">${engine.territory.territories(owner).map(id=>`<button data-country="${id}">${flag(byId[id])}${esc(byId[id].name)}</button>`).join('')}</div>`;
}
