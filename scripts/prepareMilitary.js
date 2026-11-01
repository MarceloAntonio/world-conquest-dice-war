import fs from 'node:fs/promises';
const raw=new URL('./raw/military/',import.meta.url),pub=new URL('../public/data/',import.meta.url);
const read=async(base,name)=>JSON.parse(await fs.readFile(new URL(name,base),'utf8'));
const countries=await read(pub,'countries.json'),manifest=await read(raw,'manifest.json');
const wbPersonnel=await read(raw,'personnel.json'),wbSpending=await read(raw,'spending.json');
const byId=Object.fromEntries(countries.map(c=>[c.id,c]));
const definitions={personnel:'Efetivo ativo mais paramilitares; reservas excluídas.',activePersonnel:'Militares em serviço ativo.',reserves:'Pessoal da reserva. Exibido, mas não entra na pontuação.',paramilitary:'Pessoal paramilitar.',spending:'Orçamento de defesa estimado, em dólares correntes.',tanks:'Estoque de carros de combate, incluindo tanques leves.',aircraft:'Estoque total de aeronaves, incluindo helicópteros; drones excluídos.',naval:'Total de embarcações, incluindo auxiliares e patrulha.',vehicles:'Veículos militares; pode incluir apoio, logística e engenharia.',artillery:'Artilharia autopropulsada e rebocada; lançadores de foguetes excluídos.',submarines:'Submarinos no inventário publicado.'};
for(const c of countries)c.military={metrics:{},powerIndex:null,notes:[]};
let cached;
try{cached=await read(raw,'gfp-inventories.json');}catch{cached=null;}
if(cached?.retrievedAt===manifest.retrievedAt){
  for(const [id,military] of Object.entries(cached.countries))byId[id].military=military;
}else{
for(const record of manifest.countries){
  const c=byId[record.id];if(!c)throw Error('GFP country outside roster');
  const html=await fs.readFile(new URL(record.file,raw),'utf8');
  const text=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g,' ');
  const get=pattern=>{const match=text.match(pattern);return match?Number(match[1].replaceAll(',','')):null;};
  const activePersonnel=get(/Active Personnel\s+([\d,]+)/),paramilitary=get(/Paramilitary\s+([\d,]+)/);
  const values={activePersonnel,paramilitary,reserves:get(/Reserve Personnel\s+([\d,]+)/),spending:get(/Defense Budget:\s*\$([\d,]+)/),tanks:get(/\bTanks:\s*Stock:\s*([\d,]+)/),aircraft:get(/Aircraft Total:\s*Stock:\s*([\d,]+)/),naval:get(/Total Assets:\s*([\d,]+)/),vehicles:get(/\bVehicles:\s*Stock:\s*([\d,]+)/),submarines:get(/Submarines:\s*([\d,]+)/)};
  const sp=get(/Self-Propelled Artillery:\s*Stock:\s*([\d,]+)/),towed=get(/Towed Artillery:\s*Stock:\s*([\d,]+)/);
  values.artillery=sp!==null&&towed!==null?sp+towed:null;
  values.personnel=activePersonnel!==null&&paramilitary!==null?activePersonnel+paramilitary:null;
  if(values.personnel===null||values.tanks===null||values.aircraft===null)throw Error(`Incomplete GFP parse for ${c.id}`);
  for(const [key,value] of Object.entries(values))if(value!==null)c.military.metrics[key]={value,year:manifest.edition,source:'Global Firepower',url:record.url,estimated:true,definition:definitions[key]};
  const index=get(/PwrIndx.{0,50}?score of\s*([\d.]+)/);
  if(index!==null)c.military.powerIndex={value:index,year:manifest.edition,source:'Global Firepower',url:record.url};
  c.military.reviewedAt=text.match(/last reviewed on ([\d/]+)/)?.[1]??null;
  c.military.notes.push('Valores publicados pelo GFP; a fonte utiliza estimativas quando não há números oficiais. Ano é o da edição, não necessariamente o da coleta de cada inventário.');
}
await fs.writeFile(new URL('gfp-inventories.json',raw),JSON.stringify({retrievedAt:manifest.retrievedAt,countries:Object.fromEntries(manifest.countries.map(record=>[record.id,byId[record.id].military]))}));
}
for(const [key,wb,indicator,definition] of [
  ['personnel',wbPersonnel,'MS.MIL.TOTL.P1','Pessoal militar ativo, incluindo paramilitares quando classificados pela fonte; reservas excluídas.'],
  ['spending',wbSpending,'MS.MIL.XPND.CD','Gasto militar anual, em dólares correntes (SIPRI via Banco Mundial). Não equivale ao orçamento aprovado.']
]){
  if(wb[0].pages!==1)throw Error('Incomplete World Bank military data');
  for(const c of countries){
    if(c.military.metrics[key])continue;
    const r=wb[1].find(r=>r.countryiso3code===c.iso3&&r.value!==null);
    if(r)c.military.metrics[key]={value:r.value,year:Number(r.date),source:`Banco Mundial · ${indicator}`,url:`https://api.worldbank.org/v2/country/${c.iso3}/indicator/${indicator}?format=json`,estimated:true,definition};
  }
}
const scoring=['personnel','spending','tanks','aircraft','naval'];
const coverage=Object.fromEntries(scoring.map(key=>[key,countries.filter(c=>c.military.metrics[key]).length]));
const missing=countries.filter(c=>!scoring.some(key=>c.military.metrics[key])).map(c=>c.id);
const sources=await read(pub,'sources.json');
sources.military={retrievedAt:manifest.retrievedAt,edition:manifest.edition,gfpCountries:manifest.countries.length,coverage,missing,urls:['https://www.globalfirepower.com/countries-listing.php','https://data.worldbank.org/indicator/MS.MIL.TOTL.P1','https://data.worldbank.org/indicator/MS.MIL.XPND.CD'],policy:'Ausência é null, nunca zero inventado. Totais agregam apenas medidas publicadas e sinalizam cobertura parcial. Inventários de Taiwan e Kosovo não são adicionados a outros países. GFP PowerIndex é exibido para o Estado original, não somado nem usado como previsão de combate.'};
await fs.writeFile(new URL('countries.json',pub),JSON.stringify(countries));
await fs.writeFile(new URL('military.json',pub),JSON.stringify({sources:sources.military,countries:Object.fromEntries(countries.map(c=>[c.id,c.military]))}));
await fs.writeFile(new URL('sources.json',pub),JSON.stringify(sources));
console.log({gfp:manifest.countries.length,coverage,withoutMilitaryData:missing});
