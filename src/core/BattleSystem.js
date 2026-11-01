export function rollThree(rng){return Array.from({length:3},()=>rng.int(6)+1);}
export function battleBonuses(scoreA,scoreD,cap=12){return {bonusA:Math.min(cap,Math.max(0,scoreA-scoreD)),bonusD:Math.min(cap,Math.max(0,scoreD-scoreA))};}
export function resolveBattle({attacker,defender,population,rng,bonusCap=12,strength}){
  const scoreA=strength?.a??population.score(attacker.population),scoreD=strength?.d??population.score(defender.population);
  const {bonusA,bonusD}=battleBonuses(scoreA,scoreD,bonusCap);
  const rolls=[];
  let a,d;
  do {
    const diceA=rollThree(rng),diceD=rollThree(rng);
    a=diceA.reduce((s,x)=>s+x,0)+bonusA;d=diceD.reduce((s,x)=>s+x,0)+bonusD;
    rolls.push({diceA,diceD,bonusA,bonusD,totalA:a,totalD:d});
  }while(a===d);
  const result={attacker:attacker.id,defender:defender.id,scoreA,scoreD,rolls,winner:a>d?attacker.id:defender.id,loser:a>d?defender.id:attacker.id};
  if(strength){result.powerMode=strength.powerMode;result.components=strength.components;result.militaryA=strength.militaryA;result.militaryD=strength.militaryD;}
  return result;
}
