export function rollThree(rng){return Array.from({length:3},()=>rng.int(6)+1);}
export function resolveBattle({attacker,defender,population,rng,bonusCap=12}){
  const scoreA=population.score(attacker.population),scoreD=population.score(defender.population);
  const bonusA=Math.min(bonusCap,Math.max(0,scoreA-scoreD));
  const bonusD=Math.min(bonusCap,Math.max(0,scoreD-scoreA));
  const rolls=[];
  let a,d;
  do {
    const diceA=rollThree(rng),diceD=rollThree(rng);
    a=diceA.reduce((s,x)=>s+x,0)+bonusA;d=diceD.reduce((s,x)=>s+x,0)+bonusD;
    rolls.push({diceA,diceD,bonusA,bonusD,totalA:a,totalD:d});
  }while(a===d);
  return {attacker:attacker.id,defender:defender.id,scoreA,scoreD,rolls,winner:a>d?attacker.id:defender.id,loser:a>d?defender.id:attacker.id};
}
