export const pipFaces=['','⚀','⚁','⚂','⚃','⚄','⚅'];
export const diceHTML=(dice,rolling=false)=>dice.map((n,i)=>`<span class="die ${rolling?'rolling':''}" style="--delay:${i*70}ms" aria-label="Dado ${n}"><span class="die-face">${pipFaces[n]}</span></span>`).join('');
export class BattleAnimation {
  constructor(panel,audio){this.panel=panel;this.audio=audio;this.cancel=null;this.effects=[];}
  async wait(ms){if(this.skipped)return;await new Promise(resolve=>{const timer=setTimeout(resolve,ms);this.cancel=()=>{clearTimeout(timer);resolve();};});this.cancel=null;}
  clash(duration){
    if(this.skipped)return;
    const target=this.panel.querySelector('.bonus-collision').getBoundingClientRect();
    this.effects=[...this.panel.querySelectorAll('.bonus-origin')].map(element=>{
      const rect=element.getBoundingClientRect();
      const x=target.x+target.width/2-rect.x-rect.width/2,y=target.y+target.height/2-rect.y-rect.height/2;
      return element.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${x}px,${y}px) scale(0.85)`,opacity:1,offset:0.82},{transform:`translate(${x}px,${y}px) scale(0.4)`,opacity:0}],{duration,easing:'cubic-bezier(.6,0,.35,1)',fill:'forwards'});
    });
  }
  clearEffects(){this.effects.forEach(effect=>effect.cancel());this.effects=[];}
  skip(){this.skipped=true;this.clearEffects();this.cancel?.();}
}
