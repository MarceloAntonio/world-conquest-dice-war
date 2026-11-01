import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import {geoArea} from 'd3-geo';
const dir = fileURLToPath(new URL('../public/',import.meta.url));
export function validateData(countries,world,borders){
  const ids = new Set(countries.map(c=>c.id));
  if(countries.length!==195||ids.size!==195)throw Error('Expected exactly 195 unique states');
  const geo = new Set(world.features.map(f=>f.properties.id));
  if(geo.size!==195||world.features.length!==195)throw Error('Expected 195 unique geometries');
  for(const c of countries){
    if(!geo.has(c.id)||!Number.isSafeInteger(c.population)||c.population<=0||!c.populationYear||!c.populationSourceUrl||!c.name||!c.iso3)throw Error(`Invalid country ${c.id}`);
    if(!fs.existsSync(dir+c.flag))throw Error(`Missing flag ${c.id}`);
    if(!world.features.find(f=>f.properties.id===c.id)?.geometry.coordinates.length)throw Error(`Empty geometry ${c.id}`);
    if(geoArea(world.features.find(f=>f.properties.id===c.id))>2*Math.PI)throw Error(`Inverted spherical geometry ${c.id}`);
    if(!c.military?.metrics)throw Error(`Missing military record (including explicit unknowns) ${c.id}`);
    for(const m of Object.values(c.military.metrics))if(!Number.isFinite(m.value)||m.value<0||!m.year||!m.url?.startsWith('https://')||!m.definition)throw Error(`Invalid military observation ${c.id}`);
    for(const n of c.neighbors)if(!ids.has(n)||!countries.find(x=>x.id===n).neighbors.includes(c.id))throw Error(`Asymmetric border ${c.id}/${n}`);
  }
  const graph=Object.fromEntries([...ids].map(id=>[id,[]]));
  for(const e of [...borders.land,...borders.sea]){if(!ids.has(e.a)||!ids.has(e.b)||e.a===e.b)throw Error('Invalid connection');graph[e.a].push(e.b);graph[e.b].push(e.a);}
  const seen=new Set();const visit=id=>{if(seen.has(id))return;seen.add(id);graph[id].forEach(visit);};visit(countries[0].id);
  if(seen.size!==195)throw Error(`Disconnected global graph: ${[...ids].filter(id=>!seen.has(id))}`);
  return {countries:195,population:countries.reduce((s,c)=>s+c.population,0),globalConnected:true};
}
const read=p=>JSON.parse(fs.readFileSync(dir+'data/'+p,'utf8'));
console.log(validateData(read('countries.json'),read('world.geojson'),read('borders.json')));
