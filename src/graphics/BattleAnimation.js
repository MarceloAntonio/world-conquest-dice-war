export const pipFaces=['','⚀','⚁','⚂','⚃','⚄','⚅'];
export const diceHTML=(dice,rolling=false)=>dice.map((n,i)=>`<span class="die ${rolling?'rolling':''}" style="--delay:${i*70}ms" aria-label="Dado ${n}"><span class="die-face">${pipFaces[n]}</span></span>`).join('');
export class BattleAnimation {
  constructor(panel,audio){this.panel=panel;this.audio=audio;this.cancel=null;}
  async wait(ms){if(this.skipped)return;await new Promise(resolve=>{const timer=setTimeout(resolve,ms);this.cancel=()=>{clearTimeout(timer);resolve();};});this.cancel=null;}
  skip(){this.skipped=true;this.cancel?.();}
}
