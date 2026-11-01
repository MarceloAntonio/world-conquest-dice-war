const ids=s=>s.split(' ');
const continents={
  northAmerica:ids('CA US MX'),centralAmerica:ids('BZ CR GT HN NI PA SV'),caribbean:ids('AG BB BS CU DM DO GD HT JM KN LC TT VC'),
  southAmerica:ids('AR BO BR CL CO EC GY PE PY SR UY VE'),
  europe:ids('AD AL AT BA BE BG BY CH CY CZ DE DK EE ES FI FR GB GR HR HU IE IS IT LI LT LU LV MC MD ME MK MT NL NO PL PT RO RS RU SE SI SK SM UA VA'),
  africa:ids('AO BF BI BJ BW CD CF CG CI CM CV DJ DZ EG ER ET GA GH GM GN GQ GW KE KM LR LS LY MA MG ML MR MU MW MZ NA NE NG RW SC SD SL SN SO SS ST SZ TD TG TN TZ UG ZA ZM ZW'),
  oceania:ids('AU FJ FM KI MH NR NZ PG PW SB TO TV VU WS'),
  asia:ids('AE AF AM AZ BD BH BN BT CN GE ID IL IN IQ IR JO JP KG KH KP KR KW KZ LA LB LK MM MN MV MY NP OM PH PK PS QA SA SG SY TH TJ TL TM TR UZ VN YE')
};
const islands=ids('AG BB BH BS CU CY DM DO FJ FM GB GD HT ID IE IS JM JP KI KM KN LC LK MG MH MT MU MV NR NZ PG PH PW SB SC SG ST TL TO TT TV VC VU WS CV');
export const regionCatalog=[
  {id:'world',name:'Mundo inteiro',group:'Continentes',ids:null},
  {id:'americas',name:'Américas',group:'Continentes',ids:[...continents.northAmerica,...continents.centralAmerica,...continents.caribbean,...continents.southAmerica]},
  ...Object.entries(continents).map(([id,list])=>({id,name:({northAmerica:'América do Norte',centralAmerica:'América Central',caribbean:'Caribe',southAmerica:'América do Sul',europe:'Europa',africa:'África',oceania:'Oceania',asia:'Ásia'})[id],group:'Continentes',ids:list})),
  {id:'eurasia',name:'Eurásia',group:'Combinações',ids:[...continents.europe,...continents.asia]},
  {id:'afroEurasia',name:'Afro-Eurásia',group:'Combinações',ids:[...continents.europe,...continents.asia,...continents.africa]},
  {id:'mediterranean',name:'Mediterrâneo',group:'Regiões',ids:ids('AL BA CY DZ EG ES FR GR HR IL IT LB LY MA MC ME MT PS SI SY TN TR')},
  {id:'middleEast',name:'Oriente Médio',group:'Regiões',ids:ids('AE BH CY EG IL IQ IR JO KW LB OM PS QA SA SY TR YE')},
  {id:'southeastAsia',name:'Sudeste Asiático',group:'Regiões',ids:ids('BN ID KH LA MM MY PH SG TH TL VN')},
  {id:'subSaharan',name:'África Subsaariana',group:'Regiões',ids:continents.africa.filter(id=>!ids('DZ EG LY MA SD TN').includes(id))},
  {id:'atlantic',name:'Atlântico',group:'Regiões',ids:ids('AG AO AR BB BE BJ BR BS BZ CA CD CG CI CM CO CR CU CV DE DK DM DO ES FR GA GB GD GH GM GN GQ GT GW GY HN HT IE IS JM KN LC LR MA MR MX NA NG NI NL NO PA PT SE SN SR ST TG TT US UY VC VE ZA')},
  {id:'pacific',name:'Pacífico',group:'Regiões',ids:ids('AU BN CA CL CN CO CR EC FJ FM GT HN ID JP KH KI KP KR MH MX MY NI NR NZ PA PE PG PH PW RU SB SG SV TH TL TO TV US VN VU WS')},
  {id:'islands',name:'Nações insulares',group:'Regiões',ids:islands},
  {id:'custom',name:'Personalizado',group:'Personalizado',ids:[]}
];
export const ruleCatalog=[
  {id:'king',name:'Rei da colina',description:'Uma facção começa com cerca de 20% dos Estados. O restante tenta derrubá-la.'},
  {id:'attrition',name:'Guerra de desgaste',description:'Após cada duelo, recursos militares simulados caem 3% para o vencedor e 10% para o perdedor; orçamento não se desgasta.'},
  {id:'rebellions',name:'Rebeliões',description:'Após cada batalha há 3% de chance de um Estado eliminado recuperar seu território original.'},
  {id:'allEqual',name:'Todos iguais',description:'Somente 3D6 por lado, sem bônus de população ou forças armadas.'},
  {id:'alliances',name:'Alianças',description:'Grupos fixos de até três países compartilham força e não se atacam. Vence o último bloco sobrevivente.'},
  {id:'huntLeader',name:'Caça ao líder',description:'Quando o líder é um inimigo conectado, recebe quatro vezes o peso na escolha do defensor.'},
  {id:'gradual',name:'Conquista gradual',description:'Cada vitória transfere um único território de fronteira. Perder um duelo não elimina necessariamente a facção.'}
];
export const challenges=[
  {id:'south-predictions',name:'Bolão sul-americano',description:'Acerte quatro previsões e conclua a campanha.',goal:4,config:{region:'southAmerica',seed:'DESAFIO-SUL-01',rules:{allEqual:true},powerMode:'population'}},
  {id:'europe-supporter',name:'Torcida europeia',description:'Acompanhe Portugal e acerte quatro previsões na campanha.',goal:4,config:{region:'europe',seed:'DESAFIO-EUROPA-01',favoriteId:'PT',rules:{huntLeader:true},powerMode:'combined'}},
  {id:'ocean-coalitions',name:'Alianças do Pacífico',description:'Acerte três previsões e conclua uma campanha por alianças na Oceania.',goal:3,config:{region:'oceania',seed:'DESAFIO-OCEANIA-01',rules:{alliances:true},powerMode:'population'}}
];
export function normalizeScenarioOptions(options={}){
  const challenge=challenges.find(c=>c.id===options.challengeId);
  const raw=challenge?{...options,mode:'global',bonusCap:12,maxRounds:2000,favoriteId:null,hillId:null,customIds:[],...challenge.config,rules:{...challenge.config.rules}}:options;
  const rules=Object.fromEntries(ruleCatalog.map(r=>[r.id,!!raw.rules?.[r.id]]));
  const region=raw.region??'world';if(!regionCatalog.some(r=>r.id===region))throw Error('Região desconhecida');
  const maxRounds=Number(raw.maxRounds??2000);if(!Number.isInteger(maxRounds)||maxRounds<10||maxRounds>10000)throw Error('Limite de campanha deve ficar entre 10 e 10000 batalhas');
  return {...raw,region,rules,maxRounds,favoriteId:raw.favoriteId||null,hillId:raw.hillId||null,customIds:[...new Set(raw.customIds??[])].sort(),challengeId:challenge?.id??null};
}
export function participantIds(countries,options={}){
  const o=normalizeScenarioOptions(options),region=regionCatalog.find(r=>r.id===o.region);
  const selected=region.id==='world'?countries.map(c=>c.id):region.id==='custom'?o.customIds:region.ids;
  const known=new Set(countries.map(c=>c.id));if(selected.some(id=>!known.has(id)))throw Error('Estado desconhecido na seleção');
  return [...new Set(selected)].sort();
}
function components(ids,edges){
  const groups=[];const seen=new Set();const adj=Object.fromEntries(ids.map(id=>[id,[]]));
  for(const {a,b} of edges){adj[a]?.push(b);adj[b]?.push(a);}
  for(const id of ids){if(seen.has(id))continue;const g=[],queue=[id];seen.add(id);for(let i=0;i<queue.length;i++){const a=queue[i];g.push(a);for(const b of adj[a])if(!seen.has(b)){seen.add(b);queue.push(b);}}groups.push(g);}
  return groups;
}
export function buildScenario(countries,borders,options={}){
  const o=normalizeScenarioOptions(options),selected=participantIds(countries,o),included=new Set(selected);
  if(selected.length<2)throw Error('Selecione pelo menos dois Estados');
  if(o.favoriteId&&!included.has(o.favoriteId))throw Error('O favorito precisa participar da região selecionada');
  if(o.hillId&&!included.has(o.hillId))throw Error('O rei da colina precisa participar da região selecionada');
  const edges={land:borders.land.filter(e=>included.has(e.a)&&included.has(e.b)),sea:borders.sea.filter(e=>included.has(e.a)&&included.has(e.b))};
  // Regional corridors follow shortest paths in the original fixed network.
  // Neutral/excluded states can be traversed, but never become competitors.
  if(o.mode!=='land'&&selected.length<countries.length){
    const adj=Object.fromEntries(countries.map(c=>[c.id,[]]));for(const e of [...borders.land,...borders.sea]){adj[e.a].push(e.b);adj[e.b].push(e.a);}Object.values(adj).forEach(a=>a.sort());
    let groups=components(selected,[...edges.land,...edges.sea]);
    while(groups.length>1){
      const source=new Set(groups[0]),queue=groups[0].map(id=>[id]),seen=new Set(source);let path=null;
      for(let i=0;i<queue.length&&!path;i++){const p=queue[i],a=p.at(-1);for(const b of adj[a]){if(seen.has(b))continue;seen.add(b);const next=[...p,b];if(included.has(b)&&!source.has(b)){path=next;break;}queue.push(next);}}
      if(!path)break;
      edges.sea.push({a:path[0],b:path.at(-1),type:'sea',regional:true,via:path.slice(1,-1),note:'Corredor de cenário pela rede geográfica original'});
      groups=components(selected,[...edges.land,...edges.sea]);
    }
  }
  return {countries:countries.filter(c=>included.has(c.id)),borders:edges,options:o,name:regionCatalog.find(r=>r.id===o.region).name};
}
