export class PopulationSystem {
  constructor(countries){
    this.min=Math.min(...countries.map(c=>c.population));
    this.max=Math.max(...countries.map(c=>c.population));
    this.world=countries.reduce((s,c)=>s+c.population,0);
  }
  score(population){
    if(this.min===this.max)return 1;
    return Math.max(1,Math.min(20,Math.round(1+19*(Math.log(population)-Math.log(this.min))/(Math.log(this.max)-Math.log(this.min)))));
  }
  bonus(a,b,cap=12){return Math.min(cap,Math.max(0,this.score(a)-this.score(b)));}
}
