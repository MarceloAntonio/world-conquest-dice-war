export class AudioManager {
  constructor(settings){this.settings=settings;this.context=null;this.musicTimer=null;}
  unlock(){this.context??=new (window.AudioContext||window.webkitAudioContext)();this.context.resume();}
  tone(frequency,duration=0.09,type='square',gain=1){
    if(!this.context||this.context.state!=='running'||!this.settings.volume)return;
    const ctx=this.context,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=frequency;
    g.gain.setValueAtTime(this.settings.volume*0.08*gain,ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+duration);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+duration);
  }
  roll(){[180,230,160].forEach((n,i)=>setTimeout(()=>this.tone(n,0.05,'triangle'),i*70));}
  win(){[523,659,784,1046].forEach((n,i)=>setTimeout(()=>this.tone(n,0.14,'square',0.55),i*95));}
  music(){clearInterval(this.musicTimer);if(!this.settings.music)return;let i=0;const notes=[130.81,164.81,196,164.81,146.83,174.61,220,174.61];this.musicTimer=setInterval(()=>this.tone(notes[i++%notes.length],1.2,'sine',0.25),650);}
}
