export class TerritoryManager {
  constructor(countries,borders){
    this.countries=countries;this.borders=borders;
    this.owners=Object.fromEntries(countries.map(c=>[c.id,c.id]));
  }
  enemies(id,mode='global'){
    const enemies=new Set();
    const edges=mode==='land'?this.borders.land:[...this.borders.land,...this.borders.sea];
    for(const {a,b} of edges){const oa=this.owners[a],ob=this.owners[b];if(oa===id&&ob!==id)enemies.add(ob);if(ob===id&&oa!==id)enemies.add(oa);}
    return [...enemies].sort();
  }
  absorb(winner,loser){
    const conquered=[];
    for(const id of Object.keys(this.owners))if(this.owners[id]===loser){this.owners[id]=winner;conquered.push(id);}
    return conquered;
  }
  territories(id){return this.countries.filter(c=>this.owners[c.id]===id).map(c=>c.id);}
  route(a,b,mode='global'){
    const matches=e=>this.owners[e.a]===a&&this.owners[e.b]===b||this.owners[e.b]===a&&this.owners[e.a]===b;
    if(this.borders.land.some(matches))return 'land';
    const link=mode==='global'?this.borders.sea.find(matches):null;
    return link?(link.regional?'regional':'sea'):null;
  }
}
