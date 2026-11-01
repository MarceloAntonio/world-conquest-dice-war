import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('./raw/',import.meta.url);
await fs.mkdir(root,{recursive:true});
const sources=[
  ['natural-earth.raw.geojson','https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson'],
  ['worldbank.raw.json','https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json&date=2020:2025&per_page=20000']
];
const manifest=[];
for(const [name,url] of sources){
  const response=await fetch(url);if(!response.ok)throw Error(`${name}: HTTP ${response.status}`);
  const body=await response.text();const parsed=JSON.parse(body);
  if(name.endsWith('geojson')&&!parsed.features?.length)throw Error('Missing Natural Earth features');
  if(name.startsWith('worldbank')&&(!Array.isArray(parsed[1])||parsed[0].pages!==1))throw Error('Incomplete World Bank response');
  await fs.writeFile(new URL(name,root),body);manifest.push({name,url,downloadedAt:new Date().toISOString(),sha256:createHash('sha256').update(body).digest('hex')});
  console.log(`Downloaded ${name}`);
}
await fs.writeFile(new URL('manifest.json',root),JSON.stringify(manifest,null,2));
console.log('Run npm run data:prepare and npm run check to validate new data before publishing.');
