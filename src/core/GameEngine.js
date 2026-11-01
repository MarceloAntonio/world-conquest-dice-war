import {RandomGenerator} from './RandomGenerator.js';
import {PopulationSystem} from './PopulationSystem.js';
import {TerritoryManager} from './TerritoryManager.js';
import {resolveBattle} from './BattleSystem.js';

export class GameEngine {
  constructor(countries,borders,{seed='world-195',mode='global',bonusCap=12}={}){
    if(!['global','land'].includes(mode)||!Number.isInteger(bonusCap)||bonusCap<0||bonusCap>19)throw Error('Configuração de batalha inválida');
    this.countries=countries;this.borders=borders;this.options={seed:String(seed),mode,bonusCap};
    this.rng=new RandomGenerator(seed);this.population=new PopulationSystem(countries);
    this.territory=new TerritoryManager(countries,borders);
    this.factions=Object.fromEntries(countries.map(c=>[c.id,{id:c.id,population:c.population,count:1,wins:0,losses:0,streak:0,maxStreak:0,firstConquest:null,eliminatedAt:null}]));
    this.history=[];this.phase='menu';this.running=false;this.elapsedMs=0;this.listeners=new Map();
  }
  on(event,fn){if(!this.listeners.has(event))this.listeners.set(event,new Set());this.listeners.get(event).add(fn);return ()=>this.listeners.get(event).delete(fn);}
  emit(event,data){this.listeners.get(event)?.forEach(fn=>fn(data));}
  setPhase(phase){this.phase=phase;this.emit('state',phase);}
  get active(){return Object.values(this.factions).filter(f=>f.count>0);}
  get round(){return this.history.length;}
  get ended(){return ['finished','stalemate'].includes(this.phase);}
  get ranking(){return this.active.sort((a,b)=>b.population-a.population||a.id.localeCompare(b.id));}
  pause(){this.running=false;if(!this.ended)this.setPhase('paused');}
  resume(){if(!this.ended){this.running=true;this.setPhase('running');}}
  eligible(){return this.active.map(f=>({id:f.id,enemies:this.territory.enemies(f.id,this.options.mode)})).filter(f=>f.enemies.length);}
  step(){
    if(this.ended)return null;
    const eligible=this.eligible();
    if(!eligible.length){this.running=false;this.setPhase(this.active.length===1?'finished':'stalemate');this.emit('end',this.phase);return null;}
    const a=this.rng.pick(eligible),d=this.rng.pick(a.enemies);
    this.setPhase('battle');
    const result=resolveBattle({attacker:this.factions[a.id],defender:this.factions[d],population:this.population,rng:this.rng,bonusCap:this.options.bonusCap});
    result.round=this.round+1;
    result.route=this.territory.route(a.id,d,this.options.mode);
    result.populationA=this.factions[a.id].population;result.populationD=this.factions[d].population;
    this.emit('battle',result);
    this.setPhase('conquest');
    const win=this.factions[result.winner],lose=this.factions[result.loser];
    result.conquered=this.territory.absorb(win.id,lose.id);
    win.population+=lose.population;win.count+=lose.count;win.wins++;win.streak++;win.maxStreak=Math.max(win.maxStreak,win.streak);
    win.firstConquest??=lose.id;
    lose.count=0;lose.population=0;lose.losses++;lose.streak=0;lose.eliminatedAt=result.round;
    this.history.push(result);this.emit('conquest',result);this.emit('change',result);
    if(this.active.length===1){this.running=false;this.setPhase('finished');this.emit('end','finished');}
    else this.setPhase(this.running?'running':'paused');
    return result;
  }
  run(count=Infinity){const results=[];while(results.length<count&&!this.ended){const result=this.step();if(result)results.push(result);}return results;}
  ownersAt(round){
    const owners=Object.fromEntries(this.countries.map(c=>[c.id,c.id]));
    for(const event of this.history.slice(0,round))for(const id of event.conquered)owners[id]=event.winner;
    return owners;
  }
  snapshot(){return {version:1,options:this.options,elapsedMs:this.elapsedMs,rngState:this.rng.state,history:this.history,owners:this.territory.owners,factions:this.factions};}
  static restore(countries,borders,saved){
    if(saved?.version!==1||!Array.isArray(saved.history)||saved.history.length>countries.length-1||!Number.isFinite(saved.elapsedMs)||saved.elapsedMs<0)throw Error('Arquivo de salvamento inválido');
    const engine=new GameEngine(countries,borders,saved.options);
    engine.run(saved.history.length);
    // Re-run the deterministic log. Reject outdated data or tampered snapshots.
    for(const [key,value] of Object.entries({history:engine.history,owners:engine.territory.owners,factions:engine.factions,rngState:engine.rng.state}))if(JSON.stringify(value)!==JSON.stringify(saved[key]))throw Error('Salvamento incompatível com os dados ou com a seed');
    engine.elapsedMs=saved.elapsedMs;
    if(!engine.ended)engine.pause();
    return engine;
  }
}
