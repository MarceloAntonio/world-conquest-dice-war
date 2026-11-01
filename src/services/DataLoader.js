export async function loadData(){
  const [countries,world,borders,sources,boundaries]=await Promise.all(['countries.json','world.geojson','borders.json','sources.json','boundaries.json'].map(async name=>{
    const response=await fetch(`${import.meta.env.BASE_URL}data/${name}`);
    if(!response.ok)throw Error(`Não foi possível carregar ${name} (${response.status})`);
    return response.json();
  }));
  const ids=new Set(countries.map(c=>c.id));
  if(ids.size!==195||countries.length!==195||world.features.length!==195||world.features.some(f=>!ids.has(f.properties.id))||countries.some(c=>!(c.population>0)))throw Error('A base local dos 195 Estados está incompleta.');
  return {countries,world,borders,sources,boundaries};
}
