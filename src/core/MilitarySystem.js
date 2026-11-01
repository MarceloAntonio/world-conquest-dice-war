export const militaryWeights={personnel:0.35,spending:0.25,tanks:0.15,aircraft:0.15,naval:0.10};
export const militaryLabels={personnel:'Efetivo ativo + paramilitar',spending:'Gasto / orçamento (US$)',tanks:'Tanques',aircraft:'Aeronaves',naval:'Embarcações',activePersonnel:'Militares ativos',reserves:'Reservistas',paramilitary:'Paramilitares',vehicles:'Veículos militares',artillery:'Peças de artilharia',submarines:'Submarinos'};
export const powerLabels={population:'População',military:'Forças armadas',combined:'População + forças armadas'};
export class MilitarySystem {
  constructor(countries){
    this.byId=Object.fromEntries(countries.map(c=>[c.id,c]));
    this.max=Object.fromEntries(Object.keys(militaryWeights).map(key=>[key,Math.max(1,...countries.map(c=>c.military?.metrics?.[key]?.value??0))]));
  }
  aggregate(ids){
    const keys=Object.keys(militaryLabels),metrics={};
    for(const key of keys){
      const observations=ids.map(id=>this.byId[id]?.military?.metrics?.[key]).filter(Boolean);
      metrics[key]={value:observations.length?observations.reduce((s,m)=>s+m.value,0):null,known:observations.length,total:ids.length,years:[...new Set(observations.map(m=>m.year))].sort()};
    }
    const available=Object.keys(militaryWeights).filter(key=>metrics[key].value!==null);
    // Fixed weights: unknown components contribute no measured capacity. Never
    // renormalize remaining weights, which would reward missing observations.
    const capacity=available.reduce((sum,key)=>sum+militaryWeights[key]*Math.min(1,Math.log1p(metrics[key].value)/Math.log1p(this.max[key])),0);
    return {metrics,score:available.length?Math.round(1+19*capacity):null,partial:Object.keys(militaryWeights).some(key=>metrics[key].known<ids.length),available};
  }
}
