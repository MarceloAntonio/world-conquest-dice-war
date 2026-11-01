// Visual roulette only. Final participant comes from the deterministic engine.
export function selectionFrames(candidates,selected,{steps=15,random=Math.random}={}){
  if(!candidates.includes(selected))throw Error('Selected faction is outside eligible candidates');
  const frames=[];let previous=null;
  for(let i=0;i<steps;i++){
    const options=candidates.filter(id=>id!==previous);
    const pool=options.length?options:candidates;
    const id=i===steps-1?selected:pool[Math.floor(random()*pool.length)];
    frames.push({id,delay:35+Math.round(190*(i/(steps-1))**2)});previous=id;
  }
  return frames;
}
export async function animateSelection({candidates,selected,onFrame,wait,valid,speed=1}){
  const frames=selectionFrames(candidates,selected);
  for(const [index,frame] of frames.entries()){
    if(!valid())return false;
    onFrame(frame.id,index===frames.length-1);
    await wait(frame.delay/speed);
  }
  return valid();
}
