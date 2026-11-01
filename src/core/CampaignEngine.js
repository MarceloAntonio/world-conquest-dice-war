import {ClassicEngine} from './ClassicEngine.js';
import {RandomGenerator} from './RandomGenerator.js';
import {resolveBattle,battleBonuses} from './BattleSystem.js';
import {buildScenario} from './ModeCatalog.js';

export class CampaignEngine extends ClassicEngine {
  constructor(countries,borders,options={}){
    const scenario=buildScenario(countries,borders,options),o=scenario.options;
    super(scenario.countries,scenario.borders,{...o,powerMode:o.rules.allEqual?'population':o.powerMode??'population'});
    this.allCountries=countries;this.allBorders=borders;this.options={...this.options,...o,powerMode:o.rules.allEqual?'equal':o.powerMode??'population'};
    this.scopeName=scenario.name;this.integrity=Object.fromEntries(this.countries.map(c=>[c.id,1]));this.teams={};this.outcome=null;
    const shuffled=this.countries.map(c=>c.id);
    if(o.rules.alliances)for(let i=shuffled.length-1;i>0;i--){const j=this.rng.int(i+1);[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
    const teamSize=Math.min(3,Math.ceil(shuffled.length/2));
    shuffled.forEach((id,i)=>this.teams[id]=o.rules.alliances?Math.floor(i/teamSize):id);
    this.hillId=o.rules.king?(o.hillId??this.ranking[0].id):null;
    if(this.hillId){
      const target=Math.min(this.countries.length-1,Math.max(2,Math.ceil(this.countries.length*.2)));
      while(this.factions[this.hillId].count<target){const enemy=this.territory.enemies(this.hillId,o.mode).find(id=>this.teams[id]!==this.teams[this.hillId]);if(!enemy)break;this.territory.absorb(this.hillId,enemy);this.recount();}
    }
    this.initialOwners={...this.territory.owners};this.initialActive=this.active.length;
    this.initialFavoriteCount=this.factions[o.favoriteId]?.count??0;
    this.militaryCache.clear();
  }
  recount(){
    for(const f of Object.values(this.factions)){f.count=0;f.population=0;}
    for(const c of this.countries){const f=this.factions[this.territory.owners[c.id]];f.count++;f.population+=c.population;}
    this.militaryCache.clear();this.coalitionCache?.clear();
  }
  get rules(){return this.options.rules;}
  teamMembers(id){return this.rules.alliances?this.active.filter(f=>this.teams[f.id]===this.teams[id]).map(f=>f.id):[id];}
  militaryFor(id){if(!this.militaryCache.has(id))this.militaryCache.set(id,this.military.aggregate(this.territory.territories(id),{integrity:this.integrity}));return this.militaryCache.get(id);}
  coalition(id){this.coalitionCache??=new Map();const key=this.rules.alliances?this.teams[id]:id;if(!this.coalitionCache.has(key)){const members=this.teamMembers(id),territories=members.flatMap(id=>this.territory.territories(id));this.coalitionCache.set(key,{members,population:members.reduce((s,id)=>s+this.factions[id].population,0),military:this.military.aggregate(territories,{integrity:this.integrity})});}return this.coalitionCache.get(key);}
  strength(f){
    if(this.rules.allEqual)return 1;
    if(this.rules.alliances){const c=this.coalition(f.id),p=this.population.score(c.population);return this.options.powerMode==='population'?p:this.options.powerMode==='military'?c.military.score:Math.round((p+(c.military.score??1))/2);}
    return super.strength(f);
  }
  comparison(a,d){
    if(this.rules.allEqual)return {a:1,d:1,powerMode:'equal',components:{equal:true,populationA:1,populationD:1,militaryA:null,militaryD:null,usedMilitary:false,coalitionPopulationA:this.teamMembers(a).reduce((s,id)=>s+this.factions[id].population,0),coalitionPopulationD:this.teamMembers(d).reduce((s,id)=>s+this.factions[id].population,0)}};
    const ca=this.coalition(a),cd=this.coalition(d),pa=this.population.score(ca.population),pd=this.population.score(cd.population);
    const ma=ca.military,md=cd.military,usedMilitary=ma.score!==null&&md.score!==null,sa=usedMilitary?ma.score:1,sd=usedMilitary?md.score:1;
    const score=(p,m)=>this.options.powerMode==='population'?p:this.options.powerMode==='military'?m:Math.round((p+m)/2);
    return {a:score(pa,sa),d:score(pd,sd),powerMode:this.options.powerMode,components:{populationA:pa,populationD:pd,militaryA:ma.score,militaryD:md.score,usedMilitary,coalitionPopulationA:ca.population,coalitionPopulationD:cd.population},militaryA:ma,militaryD:md};
  }
  eligible(){return this.active.map(f=>({id:f.id,enemies:this.territory.enemies(f.id,this.options.mode).filter(id=>!this.rules.alliances||this.teams[id]!==this.teams[f.id])})).filter(f=>f.enemies.length);}
  select(rng){
    const eligible=this.eligible();if(!eligible.length)return null;
    const a=rng.pick(eligible),leader=this.ranking[0].id;
    const pool=this.rules.huntLeader?a.enemies.flatMap(id=>Array(id===leader?4:1).fill(id)):a.enemies;
    return {a,d:rng.pick(pool),eligible,leader};
  }
  previewBattle(){
    if(this.ended)return null;
    const rng=new RandomGenerator(this.options.seed);rng.state=this.rng.state;const p=this.select(rng);if(!p)return null;
    const c=this.comparison(p.a.id,p.d);
    return {attacker:p.a.id,defender:p.d,candidates:p.eligible.map(f=>f.id),enemies:p.a.enemies,scoreA:c.a,scoreD:c.d,...battleBonuses(c.a,c.d,this.options.bonusCap),bonusCap:this.options.bonusCap,powerMode:this.options.powerMode,round:this.round+1,route:this.territory.route(p.a.id,p.d,this.options.mode),alliesA:this.teamMembers(p.a.id),alliesD:this.teamMembers(p.d)};
  }
  finish(type){this.outcome={type,leader:this.ranking[0]?.id,teamId:this.active[0]?this.teams[this.active[0].id]:null,survivors:this.active.map(f=>f.id)};this.running=false;this.setPhase(type==='stalemate'?'stalemate':'finished');this.emit('end',type);}
  step(){
    if(this.ended)return null;
    const p=this.select(this.rng);if(!p){this.finish(this.active.length===1?'conquered':this.rules.alliances&&new Set(this.active.map(f=>this.teams[f.id])).size===1?'alliance':'stalemate');return null;}
    this.setPhase('battle');const c=this.comparison(p.a.id,p.d);
    const b=resolveBattle({attacker:this.factions[p.a.id],defender:this.factions[p.d],population:this.population,rng:this.rng,bonusCap:this.options.bonusCap,strength:c});
    Object.assign(b,{round:this.round+1,route:this.territory.route(p.a.id,p.d,this.options.mode),populationA:this.factions[p.a.id].population,populationD:this.factions[p.d].population,previousLeader:p.leader,alliesA:this.teamMembers(p.a.id),alliesD:this.teamMembers(p.d),rebellions:[]});
    this.emit('battle',b);this.setPhase('conquest');
    if(this.rules.attrition){for(const id of this.territory.territories(b.winner))this.integrity[id]*=.97;for(const id of this.territory.territories(b.loser))this.integrity[id]*=.90;}
    const winner=this.factions[b.winner],loser=this.factions[b.loser];
    if(this.rules.gradual){
      const targets=new Set();const edges=this.options.mode==='land'?this.borders.land:[...this.borders.land,...this.borders.sea];
      for(const {a:x,b:y} of edges){const oa=this.territory.owners[x],ob=this.territory.owners[y];if(oa===b.winner&&ob===b.loser)targets.add(y);if(ob===b.winner&&oa===b.loser)targets.add(x);}
      const id=this.rng.pick([...targets].sort());this.territory.owners[id]=b.winner;b.conquered=[id];
    }else b.conquered=this.territory.absorb(b.winner,b.loser);
    winner.wins++;winner.streak++;winner.maxStreak=Math.max(winner.maxStreak,winner.streak);winner.firstConquest??=b.conquered[0];loser.losses++;loser.streak=0;
    this.recount();b.eliminated=loser.count===0;if(b.eliminated)loser.eliminatedAt=b.round;
    if(this.rules.rebellions&&this.rng.next()<.03){
      const candidates=this.countries.map(c=>c.id).filter(id=>this.factions[id].count===0&&this.territory.owners[id]!==id);
      if(candidates.length){const id=this.rng.pick(candidates),from=this.territory.owners[id];this.territory.owners[id]=id;this.recount();this.factions[id].eliminatedAt=null;this.factions[id].streak=0;if(!this.factions[from].count)this.factions[from].eliminatedAt=b.round;b.rebellions.push({id,from});this.emit('rebellion',{id,from});}
    }
    b.activeCount=this.active.length;this.history.push(b);this.emit('conquest',b);this.emit('change',b);
    if(this.active.length===1)this.finish('conquered');
    else if(this.rules.alliances&&new Set(this.active.map(f=>this.teams[f.id])).size===1)this.finish('alliance');
    else if(this.round>=this.options.maxRounds)this.finish('limit');
    else this.setPhase(this.running?'running':'paused');
    return b;
  }
  ownersAt(round){const owners={...this.initialOwners};for(const b of this.history.slice(0,round)){for(const id of b.conquered)owners[id]=b.winner;for(const r of b.rebellions)owners[r.id]=r.id;}return owners;}
  snapshot(){return {...super.snapshot(),version:2,integrity:this.integrity,teams:this.teams,initialOwners:this.initialOwners,outcome:this.outcome};}
  static restore(countries,borders,saved){
    if(saved?.version!==2||!Array.isArray(saved.history)||saved.history.length>10000||!Number.isFinite(saved.elapsedMs)||saved.elapsedMs<0)throw Error('Campanha inválida');
    const e=new CampaignEngine(countries,borders,saved.options);e.run(saved.history.length);
    for(const [key,value] of Object.entries({history:e.history,owners:e.territory.owners,factions:e.factions,rngState:e.rng.state,integrity:e.integrity,teams:e.teams,initialOwners:e.initialOwners,outcome:e.outcome}))if(JSON.stringify(value)!==JSON.stringify(saved[key]))throw Error('Campanha incompatível com a seed ou com os dados');
    e.elapsedMs=saved.elapsedMs;if(!e.ended)e.pause();return e;
  }
}
