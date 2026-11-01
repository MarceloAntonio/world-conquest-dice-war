import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { topology } from 'topojson-server';
import { neighbors } from 'topojson-client';
import { simplify, area } from '@turf/turf';
import {geoArea} from 'd3-geo';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = async p => JSON.parse(await fs.readFile(path.join(root, p), 'utf8'));
const write = async (p, v) => fs.writeFile(path.join(root, p), JSON.stringify(v));
// Explicit roster: 193 UN members + Holy See + Palestine. Never infer membership
// from Natural Earth's sovereignty field (e.g. Palestine's SOV_A3 is IS1).
export const roster = `AD AE AF AG AL AM AO AR AT AU AZ BA BB BD BE BF BG BH BI BJ BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FM FR GA GB GD GE GH GM GN GQ GR GT GW GY HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KI KM KN KP KR KW KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NR NZ OM PA PE PG PH PK PL PS PT PW PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD TG TH TJ TL TM TN TO TR TT TV TZ UA UG US UY UZ VA VC VE VN VU WS YE ZA ZM ZW`.split(' ');
const rosterSet = new Set(roster);
if (rosterSet.size !== 195) throw Error(`Roster has ${rosterSet.size} countries`);
const raw = await read('scripts/raw/natural-earth.raw.geojson');
const wb = await read('scripts/raw/worldbank.raw.json');
const sovereign = { GB1: 'GB', FR1: 'FR', NL1: 'NL', CH1: 'CN', DN1: 'DK', US1: 'US', AU1: 'AU', NZ1: 'NZ', FI1: 'FI', CU1: 'CU' };
// Explicit game/cartographic assignments, not a statement of recognition.
const disputes = { SOL:'SO', KOS:'RS', SAH:'MA', CYN:'CY', CNM:'CY', TWN:'CN', KAS:'IN', SPI:'AR', BRT:'EG', PGA:'PH', BJN:'CO', SER:'CO', SCR:'CN', USG:'CU' };
const owner = p => disputes[p.ADM0_A3] ?? (rosterSet.has(p.ISO_A2_EH) ? p.ISO_A2_EH : sovereign[p.SOV_A3]);
const mapped = raw.features.filter(f => owner(f.properties)).map(f => ({ ...f, properties:{ ...f.properties, owner:owner(f.properties) }}));
const topo = topology({world:{type:'FeatureCollection',features:mapped}});
// Each shared topological arc is assigned its adjacent sovereign owners. This
// lets the renderer remove internal political borders after a conquest.
const arcOwners=new Map();
topo.objects.world.geometries.forEach((g,i)=>{
  const walk=value=>{if(typeof value==='number'){const key=value<0?~value:value;if(!arcOwners.has(key))arcOwners.set(key,new Set());arcOwners.get(key).add(mapped[i].properties.owner);}else value.forEach(walk);};
  walk(g.arcs);
});
const boundaryGroups=new Map();
for(const [index,owners] of arcOwners){
  const ids=[...owners].sort();const key=ids.join(':');
  if(!boundaryGroups.has(key))boundaryGroups.set(key,{a:ids[0],b:ids[1]??null,lines:[]});
  const coordinates=topo.arcs[index];
  const line=simplify({type:'Feature',properties:{},geometry:{type:'LineString',coordinates}},{tolerance:0.025,highQuality:true});
  boundaryGroups.get(key).lines.push(line.geometry.coordinates);
}
const boundaries={type:'FeatureCollection',features:[...boundaryGroups.values()].map(({a,b,lines})=>({type:'Feature',properties:{a,b},geometry:{type:'MultiLineString',coordinates:lines}}))};
const adj = neighbors(topo.objects.world.geometries);
const land = Object.fromEntries(roster.map(id=>[id,new Set()]));
adj.forEach((ns,i)=>ns.forEach(j=>{ const a=mapped[i].properties.owner,b=mapped[j].properties.owner; if(a!==b)land[a].add(b); }));
// Enclaves and point-border not always captured by shared arcs at this scale.
for (const [a,b] of [['VA','IT'],['SM','IT'],['MC','FR'],['AD','FR'],['AD','ES'],['LI','AT'],['LI','CH'],['BW','ZM']]) { land[a].add(b);land[b].add(a); }
const grouped = new Map(roster.map(id=>[id,[]]));
mapped.forEach(f=>grouped.get(f.properties.owner).push(f));
const display = new Intl.DisplayNames(['pt-BR'],{type:'region'});
const names = {VA:'Santa Sé (Vaticano)',PS:'Palestina',CD:'República Democrática do Congo',CG:'República do Congo',CI:'Costa do Marfim',SZ:'Essuatíni'};
const countries = roster.map(id=>{
  const parts = grouped.get(id);
  const base = parts.find(f=>f.properties.ISO_A2_EH===id && f.properties.ADM0_A3===f.properties.ISO_A3_EH) ?? parts.find(f=>f.properties.ISO_A2_EH===id);
  if(!base)throw Error(`Missing base geometry ${id}`);
  const iso3 = base.properties.ISO_A3_EH;
  const records = wb[1].filter(r=>r.countryiso3code===iso3 && r.value>0).sort((a,b)=>Number(b.date)-Number(a.date));
  const pop = records[0];
  if(!pop && id!=='VA')throw Error(`Missing population ${id} ${iso3}`);
  return {id,iso3,name:names[id]??display.of(id),population:id==='VA'?882:pop.value,populationYear:id==='VA'?2024:Number(pop.date),populationSource:id==='VA'?'vatican-2024':'worldbank',populationSourceUrl:id==='VA'?'https://www.vaticanstate.va/en/state-and-government/general-informations/population.html':`https://api.worldbank.org/v2/country/${iso3}/indicator/SP.POP.TOTL?format=json`, flag:`assets/flags/${id.toLowerCase()}.svg`,label:[base.properties.LABEL_X,base.properties.LABEL_Y],neighbors:[...land[id]].sort(),areaKm2:Math.round(parts.reduce((s,f)=>s+area(f)/1e6,0))};
});
const world = {type:'FeatureCollection',features:roster.map(id=>{
  const coordinates = grouped.get(id).flatMap(f=>f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates);
  const f = {type:'Feature',properties:{id},geometry:{type:'MultiPolygon',coordinates}};
  // Preserves tiny islands and enclaves; round coordinates only after topology.
  const result=simplify(f,{tolerance:0.025,highQuality:true});
  const rounded=JSON.parse(JSON.stringify(result,(k,v)=>typeof v==='number'?Math.round(v*1e5)/1e5:v));
  // Simplifying very small rings can reverse their spherical winding. D3
  // requires clockwise exteriors; otherwise it projects the whole sphere.
  rounded.geometry.coordinates=rounded.geometry.coordinates.map(polygon=>polygon.filter(ring=>new Set(ring.map(p=>p.join(','))).size>=3).map((ring,i)=>{
    const sphericalArea=geoArea({type:'Polygon',coordinates:[ring]});
    if((i===0&&sphericalArea>2*Math.PI)||(i>0&&sphericalArea<2*Math.PI))ring.reverse();
    return ring;
  })).filter(polygon=>polygon.length);
  return rounded;
})};
// Reviewed short ocean crossings. Chains connect nearby coastal regions and
// archipelagos; no random overseas edges are added at runtime.
const chains = [
 'CA IS GB IE','GB FR','ES MA','IT MT TN','GR CY TR','SA BH QA','IR AE','IN LK MV','MY SG ID AU NZ','ID PH TW',
 'CN JP KR','JP RU','AU PG SB VU FJ TO WS TV KI NR FM PW PH','FM MH KI','FJ NZ','PG ID','US BS CU HT','CU JM HT','US MX',
 'MX BZ HN','HN CU','VE TT GD VC LC BB','LC DM AG KN','KN DO','BR CV SN','PT CV','DK NO','SE FI','YE DJ','YE SO',
 'MZ MG MU SC','MZ KM MG','GA ST GQ','CA DK','NZ TO','KI MH','US RU'
];
const sea = [];
for(const chain of chains){const ids=chain.split(' ').map(id=>id==='TW'?'CN':id);for(let i=1;i<ids.length;i++){const a=ids[i-1],b=ids[i];if(a!==b&&!land[a].has(b)&&!sea.some(e=>e.a===a&&e.b===b||e.a===b&&e.b===a))sea.push({a,b,type:'sea',note:'Passagem marítima regional predefinida'});}}
const borders = {land:roster.flatMap(a=>[...land[a]].filter(b=>a<b).map(b=>({a,b,type:'land'}))),sea};
const sources = {preparedAt:new Date().toISOString(),roster:'193 membros da ONU + Santa Sé + Estado da Palestina',population:{name:'World Bank — SP.POP.TOTL',url:'https://data.worldbank.org/indicator/SP.POP.TOTL',license:'CC BY 4.0',lastUpdated:wb[0].lastupdated,years:[...new Set(countries.map(c=>c.populationYear))],exceptions:countries.filter(c=>c.populationSource!=='worldbank').map(c=>({id:c.id,population:c.population,year:c.populationYear,url:c.populationSourceUrl}))},geometry:{name:'Natural Earth, Admin 0 Countries, 1:10m',url:'https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-countries/',license:'Public domain',simplificationDegrees:0.025},flags:{name:'flag-icons',url:'https://github.com/lipis/flag-icons',license:'MIT',note:'Bandeiras nacionais SVG locais, rasterizadas em baixa resolução no mapa.'},assignments:disputes,excluded:['Antarctica'],populationScope:'Soma dos 195 registros nacionais. Mantém a cobertura demográfica de cada fonte; não adiciona separadamente Taiwan, Kosovo ou dependências, evitando dupla contagem. O total da base não é o agregado mundial publicado pela ONU.',maritimePolicy:'Rotas regionais fixas e conexão US–RU pelo estreito de Bering. Sem novas arestas aleatórias durante a simulação.'};
await write('public/data/countries.json',countries);
await write('public/data/world.geojson',world);
await write('public/data/borders.json',borders);
await write('public/data/boundaries.json',boundaries);
await write('public/data/sources.json',sources);
for(const c of countries)await fs.copyFile(path.join(root,`node_modules/flag-icons/flags/4x3/${c.id.toLowerCase()}.svg`),path.join(root,`public/${c.flag}`));
await fs.copyFile(path.join(root,'node_modules/flag-icons/LICENSE'),path.join(root,'public/assets/flags/LICENSE.txt'));
console.log(`Prepared ${countries.length} states, ${borders.land.length} land borders, ${sea.length} sea routes; ${sources.population.years.join('/')} population.`);
await import('./validateData.js');
