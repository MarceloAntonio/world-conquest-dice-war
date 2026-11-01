import {challenges,regionCatalog} from '../core/ModeCatalog.js';
export const achievementCatalog=[
  {id:'prediction',name:'Primeiro palpite',description:'Acerte uma previsão.',xp:20},
  {id:'streak',name:'Três seguidas',description:'Acerte três previsões consecutivas.',xp:35},
  {id:'underdog',name:'Vitória improvável',description:'Acerte a vitória de uma facção pelo menos dez pontos mais fraca.',xp:50},
  {id:'rebel',name:'Independência de novo',description:'Acompanhe uma rebelião.',xp:20},
  {id:'hill',name:'A colina caiu',description:'Acompanhe a eliminação do rei da colina.',xp:30},
  {id:'world',name:'Um mundo conquistado',description:'Conclua uma conquista mundial.',xp:50},
  {id:'island',name:'Bandeira no horizonte',description:'Seu favorito insular vence a campanha.',xp:50},
  {id:'alliance',name:'Vitória em bloco',description:'Conclua uma vitória por aliança.',xp:35},
  {id:'comeback',name:'De volta ao mapa',description:'Seu favorito vence depois de cair a um território após controlar pelo menos três.',xp:75},
  {id:'veteran',name:'Território por território',description:'Acompanhe 25 batalhas em conquista gradual.',xp:35},
  {id:'challenge',name:'Desafio concluído',description:'Conclua um desafio de seed com a meta de previsões.',xp:50},
  {id:'campaigns',name:'Colecionador de campanhas',description:'Conclua cinco campanhas.',xp:40}
];
export const cosmeticCatalog=[
  {category:'dice',id:'blue',name:'Dados azuis',level:1}, {category:'dice',id:'jade',name:'Dados de jade',level:2}, {category:'frame',id:'simple',name:'Moldura simples',level:1},
  {category:'frame',id:'double',name:'Moldura dupla',level:3}, {category:'confetti',id:'pixel',name:'Confetes quadrados',level:1}, {category:'confetti',id:'stars',name:'Confetes de estrelas',level:4},
  {category:'interface',id:'blue',name:'Interface azul',level:1}, {category:'interface',id:'midnight',name:'Interface noturna',level:5}, {category:'dice',id:'frost',name:'Dados de gelo',level:6}
];
const fresh=()=>({version:1,xp:0,correct:0,predictions:0,streak:0,bestStreak:0,battles:0,campaigns:0,achievements:{},album:{},rivalries:{},challenges:{},trophies:[],customModes:[],credited:{},cosmetics:{dice:'blue',frame:'simple',confetti:'pixel',interface:'blue'}});
export class ProfileStore {
  constructor(storage=globalThis.localStorage){this.storage=storage;this.session=null;this.failed=false;try{const p=JSON.parse(storage?.getItem('dice-war.profile.v1')??'null');this.data=p?.version===1?{...fresh(),...p}:fresh();}catch{this.data=fresh();}}
  get level(){return Math.floor(this.data.xp/100)+1;}
  save(){try{this.storage?.setItem('dice-war.profile.v1',JSON.stringify(this.data));this.failed=false;}catch{this.failed=true;}return !this.failed;}
  award(id){if(this.data.achievements[id])return;const a=achievementCatalog.find(a=>a.id===id);if(a){this.data.achievements[id]=Date.now();this.data.xp+=a.xp;this.session?.earned.push(a.name);}}
  discover(id){if(!id)return;this.data.album[id]??={seen:0,correct:0,championships:0,bestCount:1};this.data.album[id].seen++;}
  begin(engine,resume=null){
    const numeric=['round','favoriteStart','favoriteDefenses','favoriteWins','favoritePeak','predictions','correct','bestStreak','streak','xp'];
    if(resume&&/^[\w-]{1,100}$/.test(resume.id)&&resume.seed===engine.options.seed&&resume.round===engine.round&&(resume.favoriteId??null)===(engine.options.favoriteId??null)&&typeof resume.finished==='boolean'&&numeric.every(key=>Number.isFinite(resume[key])&&resume[key]>=0)&&['earned','missions','notifications'].every(key=>Array.isArray(resume[key])&&resume[key].every(x=>typeof x==='string'))){this.session=structuredClone(resume);this.session.predictionLog=Array.isArray(resume.predictionLog)?resume.predictionLog.filter(p=>p&&engine.factions[p.choice]&&Number.isInteger(p.round)&&p.round>0&&p.round<=engine.round&&typeof p.correct==='boolean'&&Number.isFinite(p.xp)&&p.xp>=0&&p.xp<=1e6).map(p=>({round:p.round,choice:p.choice,correct:p.correct,xp:p.xp})):[];return;}
    this.session={id:globalThis.crypto?.randomUUID?.()??`${Date.now()}-${Math.random()}`,seed:engine.options.seed,round:engine.round,startedAt:Date.now(),favoriteId:engine.options.favoriteId??null,favoriteStart:engine.initialFavoriteCount??1,favoriteDefenses:0,favoriteWins:0,favoritePeak:engine.factions[engine.options.favoriteId]?.count??0,comeback:false,predictions:0,correct:0,bestStreak:0,streak:0,xp:0,earned:[],missions:[],predictionLog:[],finished:false,notifications:[],challengeId:engine.options.challengeId??null};
    this.discover(this.session.favoriteId);this.save();
  }
  missions(engine){
    const s=this.session;if(!s)return [];
    const total=engine.countries.length,target=Math.min(10,total-1),favorite=engine.factions[s.favoriteId];
    return [
      {id:'watch',name:`Acompanhar ${target} batalhas`,value:s.round,goal:target,xp:20},
      {id:'predict',name:'Acertar três previsões',value:s.correct,goal:3,xp:35},
      {id:'sequence',name:'Acertar três seguidas',value:s.bestStreak,goal:3,xp:35},
      ...(favorite?[{id:'survive',name:`Favorito sobreviver a ${target} ataques`,value:s.favoriteDefenses,goal:target,xp:40},{id:'expand',name:`Favorito conquistar ${Math.min(5,total-1)} territórios além do início`,value:Math.max(0,(favorite.count??0)-s.favoriteStart),goal:Math.min(5,total-1),xp:40},{id:'leader',name:'Favorito vencer o líder',value:s.favoriteLeaderWin?1:0,goal:1,xp:50}]:[])
    ].map(m=>({...m,done:s.missions.includes(m.id)}));
  }
  record(engine,b,prediction=null){
    if(!b)return;const s=this.session;if(!s||s.finished)return;
    s.round=engine.round;if((this.data.credited[s.id]??0)>=b.round)return;this.data.credited[s.id]=b.round;
    const oldKeys=Object.keys(this.data.credited);for(const key of oldKeys.slice(0,-100))delete this.data.credited[key];
    const before=this.data.xp;this.data.battles++;s.round=engine.round;
    this.discover(b.attacker);this.discover(b.defender);
    for(const id of [b.attacker,b.defender])this.data.album[id].bestCount=Math.max(this.data.album[id].bestCount,engine.factions[id]?.count??0);
    if(prediction&&[b.attacker,b.defender].includes(prediction)){
      this.data.predictions++;s.predictions++;
      if(prediction===b.winner){
        const gap=prediction===b.attacker?b.scoreD-b.scoreA:b.scoreA-b.scoreD;
        const points=10+Math.max(0,gap)*3+Math.min(s.streak,5)*2;
        this.data.correct++;s.correct++;this.data.streak++;s.streak++;this.data.bestStreak=Math.max(this.data.bestStreak,this.data.streak);s.bestStreak=Math.max(s.bestStreak,s.streak);
        this.data.xp+=points;this.data.album[prediction].correct++;this.award('prediction');if(s.streak>=3)this.award('streak');if(gap>=10)this.award('underdog');
      }else{this.data.streak=0;s.streak=0;}
    }
    if(b.rebellions?.length)this.award('rebel');if(engine.hillId===b.loser&&!engine.factions[b.loser].count)this.award('hill');if(engine.options.rules?.gradual&&engine.round>=25)this.award('veteran');
    const favorite=engine.factions[s.favoriteId];
    if(favorite){
      s.favoritePeak=Math.max(s.favoritePeak,favorite.count);if(favorite.count===1&&s.favoritePeak>=3)s.comeback=true;
      if(b.defender===favorite.id&&favorite.count>0)s.favoriteDefenses++;
      if(b.winner===favorite.id){s.favoriteWins++;if(b.loser===b.previousLeader)s.favoriteLeaderWin=true;}
      if([b.attacker,b.defender].includes(favorite.id)){
        const opponent=b.attacker===favorite.id?b.defender:b.attacker;this.data.rivalries[favorite.id]??={};const rivals=this.data.rivalries[favorite.id];rivals[opponent]??={encounters:0,eliminations:0,wins:0};
        rivals[opponent].encounters++;if(b.winner===favorite.id)rivals[opponent].wins++;
        if(!favorite.count&&b.loser===favorite.id)rivals[opponent].eliminations++;
      }
    }
    for(const m of this.missions(engine))if(!m.done&&m.value>=m.goal){s.missions.push(m.id);this.data.xp+=m.xp;s.earned.push(m.name);}
    s.xp+=this.data.xp-before;if(prediction&&[b.attacker,b.defender].includes(prediction))s.predictionLog.push({round:b.round,choice:prediction,correct:prediction===b.winner,xp:this.data.xp-before});this.save();
  }
  finish(engine){
    const s=this.session;if(!s||s.finished)return null;
    const existing=this.data.trophies.find(t=>t.id===s.id);if(existing){s.finished=true;return null;}
    s.finished=true;const before=this.data.xp,outcome=engine.outcome?.type??(engine.phase==='stalemate'?'stalemate':'conquered');
    const winners=outcome==='alliance'?engine.active.map(f=>f.id):outcome==='conquered'?[engine.ranking[0].id]:[];
    this.data.campaigns++;if(this.data.campaigns>=5)this.award('campaigns');
    if(outcome==='alliance')this.award('alliance');if(outcome==='conquered'&&engine.countries.length===195)this.award('world');
    const favoriteWins=winners.includes(s.favoriteId);
    if(favoriteWins&&regionCatalog.find(r=>r.id==='islands').ids.includes(s.favoriteId))this.award('island');if(favoriteWins&&s.comeback)this.award('comeback');
    const challenge=challenges.find(c=>c.id===s.challengeId);
    if(challenge&&winners.length&&s.correct>=challenge.goal){const old=this.data.challenges[challenge.id];this.data.challenges[challenge.id]={completions:(old?.completions??0)+1,bestCorrect:Math.max(old?.bestCorrect??0,s.correct),bestAccuracy:Math.max(old?.bestAccuracy??0,s.correct/Math.max(1,s.predictions)),seed:engine.options.seed};if(!old)this.data.xp+=75;this.award('challenge');}
    for(const id of winners){this.discover(id);this.data.album[id].championships++;}
    s.xp+=this.data.xp-before;
    const summary={id:s.id,seed:s.seed,region:engine.scopeName??'Mundo inteiro',participants:engine.countries.length,rounds:engine.round,outcome,winners,favoriteId:s.favoriteId,favoriteWon:favoriteWins,correct:s.correct,predictions:s.predictions,missions:s.missions.length,xp:s.xp,earned:[...s.earned],duration:engine.elapsedMs,date:Date.now(),challengeId:s.challengeId,archive:false};
    this.data.trophies.unshift(summary);this.data.trophies=this.data.trophies.slice(0,40);this.save();return summary;
  }
  equip(category,id){const item=cosmeticCatalog.find(c=>c.category===category&&c.id===id);if(!item||item.level>this.level)return false;this.data.cosmetics[category]=id;this.save();return true;}
  saveCustomMode(name,config){if(!name.trim())throw Error('Dê um nome ao modo');this.data.customModes=this.data.customModes.filter(m=>m.name!==name.trim());this.data.customModes.unshift({name:name.trim().slice(0,60),config:structuredClone(config)});this.data.customModes=this.data.customModes.slice(0,12);this.save();}
  accuracy(){return this.data.predictions?Math.round(this.data.correct/this.data.predictions*100):0;}
}
