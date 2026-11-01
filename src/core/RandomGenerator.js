export class RandomGenerator {
  constructor(seed='world-195') {
    this.seed=String(seed);
    let h=2166136261;
    for(const c of this.seed)h=Math.imul(h^c.charCodeAt(0),16777619);
    this.state=h>>>0;
  }
  next(){
    this.state=(this.state+0x6D2B79F5)>>>0;
    let t=this.state;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);
    return ((t^t>>>14)>>>0)/4294967296;
  }
  int(max){if(!Number.isInteger(max)||max<1)throw Error('Invalid random range');return Math.floor(this.next()*max);}
  pick(items){return items[this.int(items.length)];}
}
